// src/interactions/BaseInteractionManager.ts
// Gestionnaire de base pour toutes les interactions - VERSION SÉCURISÉE + TIMER CENTRALISÉ

import { Player } from "../schema/PokeWorldState";
import { 
  InteractionRequest as BaseInteractionRequest, 
  InteractionResult, 
  InteractionContext,
  InteractionConfig,
  ProximityValidation,
  ConditionValidation,
  CooldownInfo,
  InteractionError,
  INTERACTION_ERROR_CODES,
  InteractionType
} from "./types/BaseInteractionTypes";

// ✅ INTERFACE ÉTENDUE POUR SÉCURITÉ (LOCAL)
interface InteractionRequest extends BaseInteractionRequest {
  data?: BaseInteractionRequest['data'] & {
    // ✅ AJOUT : Zone client (pour validation sécuritaire)
    zone?: string;
    clientPosition?: { x: number; y: number };
  };
}
import { 
  IInteractionModule,
  IModuleRegistry,
  ModuleConfig,
  ModulesConfiguration,
  GlobalModuleStats
} from "./interfaces/InteractionModule";

// ✅ NOUVEAUX IMPORTS : Système d'IA
import { 
  getNPCIntelligenceConnector, 
  registerNPCsWithAI,
  NPCIntelligenceConnector 
} from "../Intelligence/NPCSystem/NPCIntelligenceConnector";

// ✅ CONFIGURATION IA ÉTENDUE
interface AIInteractionConfig {
  enabled: boolean;
  enabledNPCTypes: string[];
  enabledZones: string[];
  fallbackToBasic: boolean;
  analysisTimeout: number;
  debugMode: boolean;
}

// ✅ CONFIGURATION SÉCURITÉ AJOUTÉE
interface SecurityConfig {
  enabled: boolean;
  logSuspiciousActivity: boolean;
  maxDistanceFromServer: number; // Tolérance position client vs serveur
  rateLimitPerMinute: number;
  blockSuspiciousPlayers: boolean;
  auditLogPath?: string;
}

// 🔧 NOUVELLE : CONFIGURATION TIMER CENTRALISÉ
interface WorldUpdateTimerConfig {
  enabled: boolean;
  interval: number; // millisecondes
  includeQuestStatuses: boolean;
  includeGameObjects: boolean;
  includeNpcUpdates: boolean;
  includePlayerUpdates: boolean;
  debugMode: boolean;
  onUpdateCallback?: (updateData: any) => void;
}

interface ExtendedInteractionConfig extends InteractionConfig {
  // Configuration IA
  ai?: AIInteractionConfig;
  
  // ✅ NOUVELLE : Configuration sécurité
  security?: SecurityConfig;
  
  // 🔧 NOUVELLE : Configuration timer centralisé
  worldUpdateTimer?: WorldUpdateTimerConfig;
  
  // NPCs auto-registration
  autoRegisterNPCs?: boolean;
  npcDataSources?: {
    getNpcManager?: (zoneName: string) => any;
    npcManagers?: Map<string, any>;
  };
}

// ✅ TYPE ÉTENDU POUR CORRIGER L'ERREUR TYPESCRIPT
interface ExtendedGlobalModuleStats extends GlobalModuleStats {
  aiSystem: {
    initialized: boolean;
    enabled: boolean;
    autoRegistrationCompleted: boolean;
    config?: any;
  };
  security: {
    enabled: boolean;  
    suspiciousRequests: number;
    blockedRequests: number;
    lastSecurityCheck: Date;
    rateLimit?: number; // Optionnel
  };
  // 🔧 NOUVEAU : Stats timer
  worldUpdateTimer: {
    enabled: boolean;
    isActive: boolean;
    interval: number;
    intervalSeconds: number;
    updatesSent: number;
    lastUpdate: Date;
    averageUpdateTime: number;
  };
}

// ✅ CLASSE DE VALIDATION SÉCURITAIRE (INCHANGÉE)
class SecurityValidator {
  private suspiciousActivities: Map<string, number> = new Map();
  private blockedPlayers: Set<string> = new Set();
  private lastCleanup: number = Date.now();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  validateRequest(player: Player, request: InteractionRequest): { 
    valid: boolean; 
    reason?: string; 
    sanitizedRequest?: InteractionRequest;
    securityWarnings?: string[];
  } {
    const warnings: string[] = [];
    
    if (this.config.blockSuspiciousPlayers && this.blockedPlayers.has(player.name)) {
      return { 
        valid: false, 
        reason: 'Joueur temporairement bloqué pour activité suspecte' 
      };
    }

    if (!this.checkRateLimit(player.name)) {
      this.recordSuspiciousActivity(player.name, 'RATE_LIMIT');
      return { 
        valid: false, 
        reason: 'Trop de requêtes par minute' 
      };
    }

    const baseValidation = this.validateBasicData(player, request);
    if (!baseValidation.valid) {
      this.recordSuspiciousActivity(player.name, 'INVALID_DATA');
      return baseValidation;
    }

    if (request.position) {
      const positionCheck = this.validateClientPosition(player, request.position);
      if (!positionCheck.valid) {
        warnings.push(positionCheck.warning || 'Position client suspecte');
        
        if (positionCheck.severity === 'HIGH') {
          this.recordSuspiciousActivity(player.name, 'POSITION_HACK');
          return { 
            valid: false, 
            reason: 'Position client incohérente avec serveur' 
          };
        }
      }
    }

    if (request.data?.zone) {
      const zoneCheck = this.validateClientZone(player, request.data.zone);
      if (!zoneCheck.valid) {
        warnings.push(zoneCheck.warning || 'Zone client suspecte');
        
        if (zoneCheck.severity === 'HIGH') {
          this.recordSuspiciousActivity(player.name, 'ZONE_HACK');
          return { 
            valid: false, 
            reason: 'Zone client incohérente avec serveur' 
          };
        }
      }
    }

    const sanitizedRequest = this.sanitizeRequest(player, request);

    return { 
      valid: true, 
      sanitizedRequest,
      securityWarnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateClientPosition(
    player: Player, 
    clientPosition: { x: number; y: number }
  ): { valid: boolean; severity?: 'LOW' | 'MEDIUM' | 'HIGH'; warning?: string } {
    
    const serverPosition = { x: player.x, y: player.y };
    const distance = Math.sqrt(
      Math.pow(clientPosition.x - serverPosition.x, 2) + 
      Math.pow(clientPosition.y - serverPosition.y, 2)
    );

    if (distance > this.config.maxDistanceFromServer) {
      const warning = `Position client éloignée de ${Math.round(distance)}px du serveur`;
      
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (distance > this.config.maxDistanceFromServer * 3) {
        severity = 'HIGH';
      } else if (distance > this.config.maxDistanceFromServer * 1.5) {
        severity = 'MEDIUM';
      }

      if (this.config.logSuspiciousActivity) {
        console.warn('🚨 [SECURITY] Position suspecte', {
          player: player.name,
          clientPos: clientPosition,
          serverPos: serverPosition,
          distance: Math.round(distance),
          maxAllowed: this.config.maxDistanceFromServer,
          severity
        });
      }

      return { valid: false, severity, warning };
    }

    return { valid: true };
  }

  private validateClientZone(
    player: Player, 
    clientZone: string
  ): { valid: boolean; severity?: 'LOW' | 'MEDIUM' | 'HIGH'; warning?: string } {
    
    const serverZone = player.currentZone;
    
    if (clientZone !== serverZone) {
      const warning = `Zone client "${clientZone}" différente du serveur "${serverZone}"`;
      
      const severity: 'HIGH' = 'HIGH';

      if (this.config.logSuspiciousActivity) {
        console.warn('🚨 [SECURITY] Zone incohérente', {
          player: player.name,
          clientZone,
          serverZone,
          severity
        });
      }

      return { valid: false, severity, warning };
    }

    return { valid: true };
  }

  private sanitizeRequest(player: Player, request: InteractionRequest): InteractionRequest {
    const sanitized: InteractionRequest = {
      type: request.type,
      targetId: request.targetId,
      
      position: {
        x: player.x,
        y: player.y,
        mapId: player.currentZone
      },
      
      data: {
        npcId: request.data?.npcId,
        objectId: request.data?.objectId,
        objectType: request.data?.objectType,
        action: request.data?.action,
        playerLanguage: request.data?.playerLanguage || 'fr',
        itemId: request.data?.itemId,
        direction: request.data?.direction,
        
        metadata: {
          ...request.data?.metadata,
          sanitized: true,
          securityOverride: {
            originalClientZone: request.data?.zone,
            originalClientPosition: request.position,
            serverZone: player.currentZone,
            serverPosition: { x: player.x, y: player.y }
          }
        }
      },
      
      timestamp: Date.now()
    };

    return sanitized;
  }

  private validateBasicData(player: Player, request: InteractionRequest): { valid: boolean; reason?: string } {
    if (!player || !player.name) {
      return { valid: false, reason: 'Joueur non authentifié' };
    }
    
    if (!player.currentZone || player.currentZone.trim() === '') {
      return { valid: false, reason: 'Zone joueur invalide' };
    }
    
    if (typeof player.x !== 'number' || typeof player.y !== 'number') {
      return { valid: false, reason: 'Position joueur invalide' };
    }
    
    if (!request.type) {
      return { valid: false, reason: 'Type interaction manquant' };
    }

    return { valid: true };
  }

  private checkRateLimit(playerName: string): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${playerName}_${minute}`;
    
    const current = this.suspiciousActivities.get(key) || 0;
    if (current >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    this.suspiciousActivities.set(key, current + 1);
    
    if (now - this.lastCleanup > 60000) {
      this.cleanupOldEntries();
      this.lastCleanup = now;
    }
    
    return true;
  }

  private recordSuspiciousActivity(playerName: string, activityType: string) {
    const key = `${playerName}_suspicious`;
    const current = this.suspiciousActivities.get(key) || 0;
    this.suspiciousActivities.set(key, current + 1);
    
    if (this.config.logSuspiciousActivity) {
      console.warn('🚨 [SECURITY] Activité suspecte', {
        player: playerName,
        type: activityType,
        count: current + 1,
        timestamp: new Date().toISOString()
      });
    }
    
    if (this.config.blockSuspiciousPlayers && current >= 5) {
      this.blockedPlayers.add(playerName);
      console.warn('🚫 [SECURITY] Joueur bloqué temporairement', { player: playerName });
      
      setTimeout(() => {
        this.blockedPlayers.delete(playerName);
        console.info('✅ [SECURITY] Joueur débloqué', { player: playerName });
      }, 10 * 60 * 1000);
    }
  }

  private cleanupOldEntries() {
    const now = Date.now();
    const cutoff = Math.floor((now - 5 * 60000) / 60000);
    
    for (const [key] of this.suspiciousActivities.entries()) {
      if (key.includes('_') && !key.includes('suspicious')) {
        const minute = parseInt(key.split('_').pop() || '0');
        if (minute < cutoff) {
          this.suspiciousActivities.delete(key);
        }
      }
    }
  }

  getStats() {
    let suspiciousCount = 0;
    let blockedCount = this.blockedPlayers.size;
    
    for (const [key, count] of this.suspiciousActivities.entries()) {
      if (key.includes('suspicious')) {
        suspiciousCount += count;
      }
    }
    
    return {
      enabled: this.config.enabled,
      suspiciousRequests: suspiciousCount,
      blockedRequests: blockedCount,
      lastSecurityCheck: new Date(),
      rateLimit: this.config.rateLimitPerMinute
    };
  }
}

// 🔧 NOUVELLE CLASSE : GESTIONNAIRE TIMER CENTRALISÉ
class WorldUpdateTimer {
  private config: WorldUpdateTimerConfig;
  private timer: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private updatesSent: number = 0;
  private lastUpdate: Date = new Date();
  private updateTimes: number[] = [];
  
  // Références aux gestionnaires
  private questManager: any = null;
  private objectManager: any = null;
  private npcManagers: Map<string, any> = new Map();
  private room: any = null;

  constructor(config: WorldUpdateTimerConfig) {
    this.config = config;
    console.log(`⏰ [WorldUpdateTimer] Créé avec intervalle: ${config.interval/1000}s`);
  }

  /**
   * 🔧 Configurer les références aux gestionnaires
   */
  setManagers(managers: {
    questManager?: any;
    objectManager?: any;
    npcManagers?: Map<string, any>;
    room?: any;
  }): void {
    console.log('🔧 [WorldUpdateTimer] === DÉBUT setManagers ===');
    console.log('🔧 [WorldUpdateTimer] Gestionnaires reçus:', {
      questManager: !!managers.questManager,
      objectManager: !!managers.objectManager,
      npcManagers: managers.npcManagers?.size || 0,
      room: !!managers.room
    });
    
    if (managers.questManager) this.questManager = managers.questManager;
    if (managers.objectManager) this.objectManager = managers.objectManager;
    if (managers.npcManagers) this.npcManagers = managers.npcManagers;
    if (managers.room) this.room = managers.room;
    
    console.log(`✅ [WorldUpdateTimer] Gestionnaires configurés:`, {
      questManager: !!this.questManager,
      objectManager: !!this.objectManager,
      npcManagers: this.npcManagers.size,
      room: !!this.room
    });
    console.log('🔧 [WorldUpdateTimer] === FIN setManagers ===');
  }

  /**
   * 🚀 Démarrer le timer
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('⏰ [WorldUpdateTimer] Timer désactivé par configuration');
      return;
    }

    if (this.isActive) {
      console.log('⚠️ [WorldUpdateTimer] Timer déjà actif');
      return;
    }

    console.log(`⏰ [WorldUpdateTimer] Démarrage timer (${this.config.interval/1000}s)...`);
    
    this.timer = setInterval(() => {
      this.sendWorldUpdate();
    }, this.config.interval);
    
    this.isActive = true;
    
    // Premier update après 2 secondes
    setTimeout(() => {
      this.sendWorldUpdate();
    }, 2000);
    
    console.log('✅ [WorldUpdateTimer] Timer démarré');
  }

  /**
   * 🛑 Arrêter le timer
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isActive = false;
      console.log('🛑 [WorldUpdateTimer] Timer arrêté');
    }
  }

  /**
   * 🔄 Redémarrer le timer
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * 🌍 Envoyer la mise à jour du monde
   */
  private async sendWorldUpdate(): Promise<void> {
    if (!this.room) {
      if (this.config.debugMode) {
        console.log('⚠️ [WorldUpdateTimer] Pas de room configurée');
      }
      return;
    }

    const startTime = Date.now();
    
    try {
      const updateData: any = {
        timestamp: Date.now(),
        source: 'worldUpdateTimer'
      };

      // 🔧 COLLECTE DES DONNÉES SELON LA CONFIGURATION
      
      // 1. Quest Statuses
      if (this.config.includeQuestStatuses && this.questManager) {
        try {
          updateData.questStatuses = await this.collectQuestStatuses();
          if (this.config.debugMode) {
            console.log(`📋 [WorldUpdateTimer] Quest statuses collectés: ${Object.keys(updateData.questStatuses).length} NPCs`);
          }
        } catch (error) {
          console.warn('⚠️ [WorldUpdateTimer] Erreur collecte quest statuses:', error);
        }
      }

      // 2. Game Objects
      if (this.config.includeGameObjects && this.objectManager) {
        try {
          updateData.gameObjects = await this.collectGameObjects();
          if (this.config.debugMode) {
            console.log(`📦 [WorldUpdateTimer] Objets collectés: ${Object.keys(updateData.gameObjects).length} zones`);
          }
        } catch (error) {
          console.warn('⚠️ [WorldUpdateTimer] Erreur collecte objets:', error);
        }
      }

      // 3. NPC Updates
      if (this.config.includeNpcUpdates && this.npcManagers.size > 0) {
        try {
          updateData.npcUpdates = await this.collectNpcUpdates();
          if (this.config.debugMode) {
            console.log(`👥 [WorldUpdateTimer] NPCs collectés: ${Object.keys(updateData.npcUpdates).length} zones`);
          }
        } catch (error) {
          console.warn('⚠️ [WorldUpdateTimer] Erreur collecte NPCs:', error);
        }
      }

      // 4. Player Updates (si nécessaire)
      if (this.config.includePlayerUpdates) {
        try {
          updateData.playerUpdates = await this.collectPlayerUpdates();
        } catch (error) {
          console.warn('⚠️ [WorldUpdateTimer] Erreur collecte joueurs:', error);
        }
      }

      // 🚀 ENVOI DE LA MISE À JOUR
      if (Object.keys(updateData).length > 2) { // Plus que timestamp + source
        this.room.broadcast('worldUpdate', updateData);
        
        this.updatesSent++;
        this.lastUpdate = new Date();
        
        const updateTime = Date.now() - startTime;
        this.updateTimes.push(updateTime);
        if (this.updateTimes.length > 10) {
          this.updateTimes.shift(); // Garder seulement les 10 derniers
        }
        
        if (this.config.debugMode) {
          console.log(`🌍 [WorldUpdateTimer] Update #${this.updatesSent} envoyé en ${updateTime}ms`);
        }

        // Callback custom si défini
        if (this.config.onUpdateCallback) {
          try {
            this.config.onUpdateCallback(updateData);
          } catch (error) {
            console.warn('⚠️ [WorldUpdateTimer] Erreur callback:', error);
          }
        }
      }

    } catch (error) {
      console.error('❌ [WorldUpdateTimer] Erreur lors de la mise à jour:', error);
    }
  }

  /**
   * 📋 Collecter les statuts de quêtes
   */
  private async collectQuestStatuses(): Promise<any> {
    const questStatuses: any = {};
    
    try {
      // Collecter les statuts pour tous les NPCs de toutes les zones
      for (const [zoneName, npcManager] of this.npcManagers) {
        try {
          const npcs = npcManager.getAllNpcs();
          
          for (const npc of npcs) {
            if (npc.questsToGive || npc.questsToEnd) {
              try {
                // Ici on pourrait appeler le questManager pour obtenir le statut
                // Pour l'instant, on simule
                questStatuses[npc.id] = {
                  hasAvailableQuests: !!(npc.questsToGive && npc.questsToGive.length > 0),
                  hasQuestsToComplete: !!(npc.questsToEnd && npc.questsToEnd.length > 0),
                  questCount: (npc.questsToGive?.length || 0) + (npc.questsToEnd?.length || 0),
                  zone: zoneName,
                  npcId: npc.id
                };
              } catch (npcError) {
                if (this.config.debugMode) {
                  console.warn(`⚠️ [WorldUpdateTimer] Erreur NPC ${npc.id}:`, npcError);
                }
              }
            }
          }
        } catch (zoneError) {
          console.warn(`⚠️ [WorldUpdateTimer] Erreur zone ${zoneName}:`, zoneError);
        }
      }
    } catch (error) {
      console.error('❌ [WorldUpdateTimer] Erreur collecte quest statuses:', error);
    }
    
    return questStatuses;
  }

  /**
   * 📦 Collecter les objets du jeu
   */
  private async collectGameObjects(): Promise<any> {
    const gameObjects: any = {};
    
    try {
      // Si l'ObjectManager a une méthode pour obtenir tous les objets visibles
      if (this.objectManager && typeof this.objectManager.getVisibleObjectsInZone === 'function') {
        
        // Obtenir la liste des zones chargées
        const zones = ['villagelab', 'road1', 'lavandia']; // TODO: Obtenir dynamiquement
        
        for (const zoneName of zones) {
          try {
            const visibleObjects = this.objectManager.getVisibleObjectsInZone(zoneName);
            if (visibleObjects && visibleObjects.length > 0) {
              gameObjects[zoneName] = visibleObjects;
            }
          } catch (zoneError) {
            if (this.config.debugMode) {
              console.warn(`⚠️ [WorldUpdateTimer] Erreur objets zone ${zoneName}:`, zoneError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [WorldUpdateTimer] Erreur collecte objets:', error);
    }
    
    return gameObjects;
  }

  /**
   * 👥 Collecter les mises à jour NPCs
   */
  private async collectNpcUpdates(): Promise<any> {
    const npcUpdates: any = {};
    
    try {
      for (const [zoneName, npcManager] of this.npcManagers) {
        try {
          // Si le NpcManager a des informations de statut à envoyer
          if (typeof npcManager.getUpdateData === 'function') {
            const zoneUpdates = npcManager.getUpdateData();
            if (zoneUpdates && Object.keys(zoneUpdates).length > 0) {
              npcUpdates[zoneName] = zoneUpdates;
            }
          }
        } catch (zoneError) {
          if (this.config.debugMode) {
            console.warn(`⚠️ [WorldUpdateTimer] Erreur NPCs zone ${zoneName}:`, zoneError);
          }
        }
      }
    } catch (error) {
      console.error('❌ [WorldUpdateTimer] Erreur collecte NPCs:', error);
    }
    
    return npcUpdates;
  }

  /**
   * 🎮 Collecter les mises à jour joueurs
   */
  private async collectPlayerUpdates(): Promise<any> {
    // Pour l'instant, retourne un objet vide
    // Pourrait inclure des infos comme le nombre de joueurs connectés, etc.
    return {};
  }

  /**
   * 📊 Obtenir les statistiques du timer
   */
  getStats() {
    const averageUpdateTime = this.updateTimes.length > 0 
      ? this.updateTimes.reduce((sum, time) => sum + time, 0) / this.updateTimes.length 
      : 0;

    return {
      enabled: this.config.enabled,
      isActive: this.isActive,
      interval: this.config.interval,
      intervalSeconds: this.config.interval / 1000,
      updatesSent: this.updatesSent,
      lastUpdate: this.lastUpdate,
      averageUpdateTime: Math.round(averageUpdateTime),
      components: {
        questStatuses: this.config.includeQuestStatuses,
        gameObjects: this.config.includeGameObjects,
        npcUpdates: this.config.includeNpcUpdates,
        playerUpdates: this.config.includePlayerUpdates
      },
      managers: {
        questManager: !!this.questManager,
        objectManager: !!this.objectManager,
        npcManagers: this.npcManagers.size,
        room: !!this.room
      }
    };
  }

  /**
   * 🔧 Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<WorldUpdateTimerConfig>): void {
    const oldInterval = this.config.interval;
    this.config = { ...this.config, ...newConfig };
    
    console.log(`🔧 [WorldUpdateTimer] Configuration mise à jour:`, newConfig);
    
    // Si l'intervalle a changé, redémarrer le timer
    if (newConfig.interval && newConfig.interval !== oldInterval && this.isActive) {
      console.log(`⏰ [WorldUpdateTimer] Redémarrage avec nouvel intervalle: ${newConfig.interval/1000}s`);
      this.restart();
    }
  }
}

// ✅ REGISTRY AMÉLIORÉ AVEC IA ET SÉCURITÉ (INCHANGÉ)
class AIEnhancedModuleRegistry implements IModuleRegistry {
  private modules: Map<string, IInteractionModule> = new Map();
  private config: ModulesConfiguration = {};
  
  private intelligenceConnector: NPCIntelligenceConnector | null = null;

  register(module: IInteractionModule): void {
    console.log(`📦 [Registry] Enregistrement module: ${module.moduleName} v${module.version}`);
    this.modules.set(module.moduleName, module);
    
    if (this.intelligenceConnector && this.isAICompatibleModule(module)) {
      this.injectAIConnector(module);
    }
  }

  async initializeAI(config: AIInteractionConfig): Promise<void> {
    if (!config.enabled) {
      console.log('🤖 [Registry] IA désactivée');
      return;
    }

    try {
      console.log('🚀 [Registry] Initialisation IA...');
      
      this.intelligenceConnector = getNPCIntelligenceConnector();
      
      this.intelligenceConnector.updateConfig({
        enabledNPCTypes: config.enabledNPCTypes as any[],
        enabledZones: config.enabledZones,
        globallyEnabled: config.enabled,
        fallbackToBasic: config.fallbackToBasic,
        analysisTimeout: config.analysisTimeout,
        debugMode: config.debugMode
      });

      for (const module of this.modules.values()) {
        if (this.isAICompatibleModule(module)) {
          this.injectAIConnector(module);
        }
      }

      console.log('✅ [Registry] Système IA initialisé');
      
    } catch (error) {
      console.error('❌ [Registry] Erreur initialisation IA:', error);
      throw error;
    }
  }

  async registerNPCsWithAI(npcs: any[]): Promise<void> {
    if (!this.intelligenceConnector || npcs.length === 0) return;

    try {
      console.log(`🎭 [Registry] Enregistrement ${npcs.length} NPCs dans l'IA...`);
      
      const result = await this.intelligenceConnector.registerNPCsBulk(npcs);
      
      console.log(`✅ [Registry] NPCs IA: ${result.registered} enregistrés, ${result.skipped} ignorés, ${result.errors.length} erreurs`);
      
      if (result.errors.length > 0) {
        console.warn('⚠️ [Registry] Erreurs enregistrement NPCs:', result.errors.slice(0, 5));
      }
      
    } catch (error) {
      console.error('❌ [Registry] Erreur enregistrement NPCs IA:', error);
    }
  }

  private isAICompatibleModule(module: IInteractionModule): boolean {
    return module.moduleName === 'NpcInteractionModule' && 
           typeof (module as any).setIntelligenceConnector === 'function';
  }

  private injectAIConnector(module: IInteractionModule): void {
    try {
      (module as any).setIntelligenceConnector(this.intelligenceConnector);
      console.log(`🤖 [Registry] IA injectée dans ${module.moduleName}`);
    } catch (error) {
      console.warn(`⚠️ [Registry] Impossible d'injecter IA dans ${module.moduleName}:`, error);
    }
  }

  getIntelligenceConnector(): NPCIntelligenceConnector | null {
    return this.intelligenceConnector;
  }

  findModule(request: InteractionRequest): IInteractionModule | null {
    for (const module of this.modules.values()) {
      if (this.isModuleEnabled(module.moduleName) && module.canHandle(request)) {
        return module;
      }
    }
    return null;
  }

  getAllModules(): IInteractionModule[] {
    return Array.from(this.modules.values());
  }

  getModule(moduleName: string): IInteractionModule | null {
    return this.modules.get(moduleName) || null;
  }

  async initializeAll(): Promise<void> {
    console.log(`🚀 [Registry] Initialisation de ${this.modules.size} modules...`);
    
    for (const module of this.modules.values()) {
      if (this.isModuleEnabled(module.moduleName) && module.initialize) {
        try {
          await module.initialize();
        } catch (error) {
          console.error(`❌ [Registry] Erreur initialisation ${module.moduleName}:`, error);
        }
      }
    }
  }

  async cleanupAll(): Promise<void> {
    console.log(`🧹 [Registry] Nettoyage de ${this.modules.size} modules...`);
    
    for (const module of this.modules.values()) {
      if (module.cleanup) {
        try {
          await module.cleanup();
        } catch (error) {
          console.error(`❌ [Registry] Erreur nettoyage ${module.moduleName}:`, error);
        }
      }
    }
    
    if (this.intelligenceConnector) {
      try {
        this.intelligenceConnector.destroy();
        this.intelligenceConnector = null;
        console.log('🤖 [Registry] Système IA nettoyé');
      } catch (error) {
        console.error('❌ [Registry] Erreur nettoyage IA:', error);
      }
    }
  }

  getGlobalStats(): GlobalModuleStats {
    const moduleStats: Record<string, any> = {};
    let totalInteractions = 0;
    let healthyModules = 0;

    for (const module of this.modules.values()) {
      if (module.getStats) {
        const stats = module.getStats();
        moduleStats[module.moduleName] = stats;
        totalInteractions += stats.totalInteractions;
      }
      
      if (module.getHealth) {
        const health = module.getHealth();
        if (health.status === 'healthy') healthyModules++;
      }
    }

    if (this.intelligenceConnector) {
      moduleStats.AISystem = this.intelligenceConnector.getStats();
    }

    return {
      totalModules: this.modules.size,
      activeModules: healthyModules,
      totalInteractions,
      moduleStats,
      systemHealth: healthyModules === this.modules.size ? 'healthy' : 
                   healthyModules > this.modules.size * 0.7 ? 'warning' : 'critical'
    };
  }

  setConfiguration(config: ModulesConfiguration): void {
    this.config = config;
  }

  private isModuleEnabled(moduleName: string): boolean {
    return this.config[moduleName]?.enabled !== false;
  }
}

// ✅ GESTIONNAIRE DE BASE AMÉLIORÉ AVEC TIMER CENTRALISÉ
export class BaseInteractionManager {
  
  private registry: AIEnhancedModuleRegistry = new AIEnhancedModuleRegistry();
  private config: ExtendedInteractionConfig;
  private playerCooldowns: Map<string, Map<string, number>> = new Map();
  
  private aiInitialized: boolean = false;
  private npcAutoRegistrationCompleted: boolean = false;
  
  private securityValidator: SecurityValidator | null = null;
  
  // 🔧 NOUVEAU : Timer centralisé
  private worldUpdateTimer: WorldUpdateTimer | null = null;

  constructor(config?: Partial<ExtendedInteractionConfig>) {
    this.config = {
      maxDistance: 64,
      cooldowns: {
        npc: 500,
        object: 200,
        environment: 1000,
        player: 2000,
        puzzle: 0
      },
      requiredValidations: {
        npc: ['proximity', 'cooldown'],
        object: ['proximity', 'cooldown'],
        environment: ['proximity', 'cooldown'],
        player: ['proximity', 'cooldown'],
        puzzle: ['conditions']
      },
      debug: false,
      logLevel: 'info',
      
      ai: {
        enabled: process.env.NPC_AI_ENABLED !== 'false',
        enabledNPCTypes: ['dialogue', 'healer', 'quest_master', 'researcher'],
        enabledZones: [],
        fallbackToBasic: true,
        analysisTimeout: 5000,
        debugMode: process.env.NODE_ENV === 'development'
      },
      
      security: {
        enabled: process.env.SECURITY_ENABLED !== 'false',
        logSuspiciousActivity: process.env.NODE_ENV === 'development',
        maxDistanceFromServer: 100,
        rateLimitPerMinute: 30,
        blockSuspiciousPlayers: process.env.NODE_ENV === 'production',
        auditLogPath: './logs/security.log'
      },
      
      // 🔧 NOUVELLE : Configuration timer par défaut
      worldUpdateTimer: {
        enabled: process.env.WORLD_TIMER_ENABLED !== 'false',
        interval: parseInt(process.env.WORLD_TIMER_INTERVAL || '5000'), // 5 secondes
        includeQuestStatuses: true,
        includeGameObjects: true,
        includeNpcUpdates: true,
        includePlayerUpdates: false,
        debugMode: process.env.NODE_ENV === 'development'
      },
      
      autoRegisterNPCs: process.env.NPC_AUTO_REGISTER !== 'false',
      npcDataSources: {},
      
      ...config
    };

    if (this.config.security?.enabled) {
      this.securityValidator = new SecurityValidator(this.config.security);
    }

    // 🔧 NOUVEAU : Initialiser le timer centralisé
    if (this.config.worldUpdateTimer?.enabled) {
      this.worldUpdateTimer = new WorldUpdateTimer(this.config.worldUpdateTimer);
      console.log('⏰ [BaseInteractionManager] Timer centralisé initialisé (pas encore démarré)');
    } else {
      console.log('⚠️ [BaseInteractionManager] Timer centralisé désactivé par configuration');
    }

    console.log(`🎮 [BaseInteractionManager] Initialisé avec IA + Sécurité + Timer`, {
      aiEnabled: this.config.ai?.enabled,
      securityEnabled: this.config.security?.enabled,
      timerEnabled: this.config.worldUpdateTimer?.enabled,
      timerInterval: this.config.worldUpdateTimer?.interval,
      aiTypes: this.config.ai?.enabledNPCTypes?.length,
      autoRegister: this.config.autoRegisterNPCs
    });
  }

  // === 🔧 NOUVELLES MÉTHODES TIMER ===

  /**
   * 🔧 Configurer les gestionnaires pour le timer ET démarrer le timer
   */
  setTimerManagers(managers: {
    questManager?: any;
    objectManager?: any;
    npcManagers?: Map<string, any>;
    room?: any;
  }): void {
    console.log('🔧 [BaseInteractionManager] === DÉBUT setTimerManagers ===');
    console.log('🔧 [BaseInteractionManager] Gestionnaires reçus:', {
      questManager: !!managers.questManager,
      objectManager: !!managers.objectManager,
      npcManagers: managers.npcManagers?.size || 0,
      room: !!managers.room,
      worldUpdateTimer: !!this.worldUpdateTimer
    });
    
    if (!this.worldUpdateTimer) {
      console.warn('⚠️ [BaseInteractionManager] Timer non initialisé - vérifiez la configuration');
      return;
    }
    
    this.worldUpdateTimer.setManagers(managers);
    console.log('✅ [BaseInteractionManager] Gestionnaires timer configurés');
    
    // 🔧 NOUVEAU : Démarrer automatiquement le timer après configuration
    if (managers.room) {
      console.log('⏰ [BaseInteractionManager] Programmation démarrage timer dans 2 secondes...');
      
      setTimeout(() => {
        console.log('🚀 [BaseInteractionManager] Démarrage automatique du timer...');
        this.startWorldUpdateTimer();
        console.log('✅ [BaseInteractionManager] Timer démarré automatiquement après configuration');
      }, 2000); // 2 secondes pour laisser tout se stabiliser
    } else {
      console.warn('⚠️ [BaseInteractionManager] Room manquante - timer non démarré');
    }
    
    console.log('🔧 [BaseInteractionManager] === FIN setTimerManagers ===');
  }

  /**
   * 🚀 Démarrer le timer centralisé
   */
  startWorldUpdateTimer(): void {
    console.log('🚀 [BaseInteractionManager] === DÉBUT startWorldUpdateTimer ===');
    
    if (!this.worldUpdateTimer) {
      console.error('❌ [BaseInteractionManager] Timer non initialisé');
      return;
    }
    
    console.log('⏰ [BaseInteractionManager] Appel start() du timer...');
    this.worldUpdateTimer.start();
    console.log('✅ [BaseInteractionManager] Timer centralisé démarré');
    
    // 🔧 NOUVEAU : Vérifier l'état après démarrage
    const stats = this.worldUpdateTimer.getStats();
    console.log('📊 [BaseInteractionManager] État timer après démarrage:', {
      enabled: stats.enabled,
      isActive: stats.isActive,
      interval: stats.intervalSeconds + 's',
      managers: stats.managers
    });
    
    console.log('🚀 [BaseInteractionManager] === FIN startWorldUpdateTimer ===');
  }

  /**
   * 🛑 Arrêter le timer centralisé
   */
  stopWorldUpdateTimer(): void {
    if (this.worldUpdateTimer) {
      this.worldUpdateTimer.stop();
      console.log('🛑 [BaseInteractionManager] Timer centralisé arrêté');
    }
  }

  /**
   * 🔄 Redémarrer le timer centralisé
   */
  restartWorldUpdateTimer(): void {
    if (this.worldUpdateTimer) {
      this.worldUpdateTimer.restart();
      console.log('🔄 [BaseInteractionManager] Timer centralisé redémarré');
    }
  }

  /**
   * 🔧 Configurer le timer
   */
  configureWorldUpdateTimer(config: Partial<WorldUpdateTimerConfig>): void {
    if (this.worldUpdateTimer) {
      this.worldUpdateTimer.updateConfig(config);
      console.log(`🔧 [BaseInteractionManager] Timer reconfiguré:`, config);
    }
  }

  /**
   * 📊 Obtenir les stats du timer
   */
  getWorldUpdateTimerStats() {
    return this.worldUpdateTimer ? this.worldUpdateTimer.getStats() : null;
  }

  // === ✅ MÉTHODES PRINCIPALES INCHANGÉES ===

  async processInteraction(
    player: Player, 
    request: InteractionRequest
  ): Promise<InteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.debugLog('info', `🔒 [SÉCURITÉ] Validation requête interaction ${request.type}`, { 
        player: player.name, 
        targetId: request.targetId,
        clientZone: request.data?.zone,
        serverZone: player.currentZone,
        clientPos: request.position,
        serverPos: { x: player.x, y: player.y }
      });

      let finalRequest = request;
      let securityWarnings: string[] = [];
      
      if (this.securityValidator) {
        const securityCheck = this.securityValidator.validateRequest(player, request);
        
        if (!securityCheck.valid) {
          return this.createErrorResult(
            securityCheck.reason || 'Requête non sécurisée', 
            'SECURITY_VIOLATION'
          );
        }
        
        if (securityCheck.sanitizedRequest) {
          finalRequest = securityCheck.sanitizedRequest;
        }
        
        if (securityCheck.securityWarnings) {
          securityWarnings = securityCheck.securityWarnings;
        }
      }

      const requestValidation = this.validateRequest(finalRequest);
      if (!requestValidation.valid) {
        return this.createErrorResult(requestValidation.reason || 'Requête invalide', 'INVALID_REQUEST');
      }

      const module = this.registry.findModule(finalRequest);
      if (!module) {
        return this.createErrorResult(
          `Aucun module disponible pour le type: ${finalRequest.type}`, 
          'MODULE_NOT_FOUND'
        );
      }

      const context = await this.buildInteractionContext(player, finalRequest);
      const validationResult = await this.performValidations(context, module);
      
      if (!validationResult.valid) {
        return this.createErrorResult(validationResult.reason || 'Validation échouée', validationResult.code);
      }

      const result = await module.handle(context);

      if (result.success) {
        this.updateCooldown(player.name, finalRequest.type);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;
      result.moduleUsed = module.moduleName;
      result.timestamp = Date.now();

      if (securityWarnings.length > 0) {
        if (result.data) {
          result.data.metadata = {
            ...result.data.metadata,
            securityWarnings
          };
        }
      }

      this.debugLog('info', `✅ Interaction terminée en ${processingTime}ms`, { 
        success: result.success, 
        type: result.type,
        module: module.moduleName,
        aiUsed: !!(result as any).usedAI,
        securityWarnings: securityWarnings.length
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.debugLog('error', '❌ Erreur traitement interaction', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED',
        { processingTime, error: error instanceof Error ? error.stack : error }
      );
    }
  }

  // === ✅ MÉTHODES IA INCHANGÉES ===

  async initializeAI(): Promise<void> {
    if (!this.config.ai?.enabled) {
      console.log('🤖 [BaseInteractionManager] IA désactivée');
      return;
    }

    try {
      console.log('🚀 [BaseInteractionManager] Initialisation IA...');
      
      await this.registry.initializeAI(this.config.ai);
      this.aiInitialized = true;
      
      console.log('✅ [BaseInteractionManager] IA initialisée');
      
    } catch (error) {
      console.error('❌ [BaseInteractionManager] Erreur initialisation IA:', error);
      this.aiInitialized = false;
      
      if (!this.config.ai?.fallbackToBasic) {
        throw error;
      }
    }
  }

  async registerNPCsForAI(npcs: any[]): Promise<void> {
    if (!this.aiInitialized || !this.config.ai?.enabled) {
      this.debugLog('info', 'IA non disponible pour enregistrement NPCs');
      return;
    }

    try {
      await this.registry.registerNPCsWithAI(npcs);
      this.debugLog('info', `🎭 ${npcs.length} NPCs enregistrés dans l'IA`);
    } catch (error) {
      console.error('❌ [BaseInteractionManager] Erreur enregistrement NPCs IA:', error);
    }
  }

  async autoRegisterNPCs(): Promise<void> {
    if (!this.config.autoRegisterNPCs || this.npcAutoRegistrationCompleted) {
      return;
    }

    try {
      console.log('🔍 [BaseInteractionManager] Auto-enregistrement NPCs...');
      
      const allNpcs: any[] = [];
      
      if (this.config.npcDataSources?.getNpcManager) {
        const zones = ['pallet_town', 'route_1', 'viridian_city'];
        
        for (const zone of zones) {
          try {
            const npcManager = this.config.npcDataSources.getNpcManager(zone);
            if (npcManager) {
              const npcs = npcManager.getAllNpcs();
              allNpcs.push(...npcs);
              this.debugLog('info', `📦 Zone ${zone}: ${npcs.length} NPCs trouvés`);
            }
          } catch (error) {
            this.debugLog('warn', `⚠️ Erreur récupération NPCs zone ${zone}:`, error);
          }
        }
      }
      
      if (this.config.npcDataSources?.npcManagers) {
        for (const [zone, npcManager] of this.config.npcDataSources.npcManagers) {
          try {
            const npcs = npcManager.getAllNpcs();
            allNpcs.push(...npcs);
            this.debugLog('info', `📦 Zone ${zone}: ${npcs.length} NPCs trouvés`);
          } catch (error) {
            this.debugLog('warn', `⚠️ Erreur récupération NPCs zone ${zone}:`, error);
          }
        }
      }

      if (allNpcs.length > 0) {
        await this.registerNPCsForAI(allNpcs);
        console.log(`✅ [BaseInteractionManager] Auto-enregistrement: ${allNpcs.length} NPCs traités`);
      } else {
        console.log('⚠️ [BaseInteractionManager] Aucun NPC trouvé pour auto-enregistrement');
      }
      
      this.npcAutoRegistrationCompleted = true;
      
    } catch (error) {
      console.error('❌ [BaseInteractionManager] Erreur auto-enregistrement NPCs:', error);
    }
  }

  setNPCDataSources(sources: ExtendedInteractionConfig['npcDataSources']): void {
    this.config.npcDataSources = sources;
    this.npcAutoRegistrationCompleted = false;
    this.debugLog('info', '🔧 Sources de données NPCs configurées');
  }

  // === GESTION DES MODULES (améliorée) ===

  registerModule(module: IInteractionModule): void {
    this.registry.register(module);
  }

  async initialize(): Promise<void> {
    await this.registry.initializeAll();
    await this.initializeAI();
    await this.autoRegisterNPCs();
    
    // 🔧 FIXÉ : NE PAS démarrer le timer automatiquement
    // Il sera démarré manuellement après setTimerManagers()
    
    console.log(`✅ [BaseInteractionManager] Système d'interaction + IA + Sécurité + Timer initialisé`);
    console.log(`⚠️ [BaseInteractionManager] Appelez setTimerManagers() puis startWorldUpdateTimer() pour activer le timer`);
  }

  async cleanup(): Promise<void> {
    // 🔧 NOUVEAU : Arrêter le timer
    this.stopWorldUpdateTimer();
    
    await this.registry.cleanupAll();
    this.aiInitialized = false;
    this.npcAutoRegistrationCompleted = false;
    this.securityValidator = null;
    this.worldUpdateTimer = null;
    console.log(`🧹 [BaseInteractionManager] Système d'interaction + IA + Sécurité + Timer nettoyé`);
  }

  // === MÉTHODES EXISTANTES INCHANGÉES ===

  private validateRequest(request: InteractionRequest): { valid: boolean; reason?: string } {
    if (!request.type) {
      return { valid: false, reason: 'Type d\'interaction manquant' };
    }

    if (!request.position && ['npc', 'object', 'environment'].includes(request.type)) {
      return { valid: false, reason: 'Position requise pour ce type d\'interaction' };
    }

    return { valid: true };
  }

  validateProximity(player: Player, targetPosition: { x: number; y: number }): ProximityValidation {
    const serverX = player.x;
    const serverY = player.y;
    
    const dx = Math.abs(serverX - targetPosition.x);
    const dy = Math.abs(serverY - targetPosition.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.config.maxDistance) {
      return {
        valid: false,
        distance,
        maxDistance: this.config.maxDistance,
        reason: `Trop loin (${Math.round(distance)}px > ${this.config.maxDistance}px)`
      };
    }

    return {
      valid: true,
      distance,
      maxDistance: this.config.maxDistance
    };
  }

  validateCooldown(playerName: string, interactionType: InteractionType): CooldownInfo {
    const playerCooldowns = this.playerCooldowns.get(playerName);
    if (!playerCooldowns) {
      return { active: false };
    }

    const lastInteraction = playerCooldowns.get(interactionType);
    if (!lastInteraction) {
      return { active: false };
    }

    const cooldownDuration = this.config.cooldowns?.[interactionType] || 0;
    if (cooldownDuration === 0) {
      return { active: false };
    }

    const timeSinceLastInteraction = Date.now() - lastInteraction;
    if (timeSinceLastInteraction < cooldownDuration) {
      const remainingTime = cooldownDuration - timeSinceLastInteraction;
      return {
        active: true,
        remainingTime,
        nextAvailable: new Date(Date.now() + remainingTime),
        cooldownType: interactionType
      };
    }

    return { active: false };
  }

  private async buildInteractionContext(
    player: Player, 
    request: InteractionRequest
  ): Promise<InteractionContext> {
    
    const context: InteractionContext = {
      player,
      request,
      validations: {},
      metadata: {
        timestamp: Date.now(),
        sessionId: 'unknown',
        securityValidated: !!this.securityValidator,
        serverPosition: { x: player.x, y: player.y },
        serverZone: player.currentZone
      }
    };

    return context;
  }

  private async performValidations(
    context: InteractionContext, 
    module: IInteractionModule
  ): Promise<{ valid: boolean; reason?: string; code?: string }> {
    
    const requiredValidations = this.config.requiredValidations?.[context.request.type] || [];

    if (requiredValidations.includes('proximity') && context.request.position) {
      const proximityValidation = this.validateProximity(context.player, context.request.position);
      context.validations.proximity = proximityValidation;
      
      if (!proximityValidation.valid) {
        return { 
          valid: false, 
          reason: proximityValidation.reason, 
          code: 'TOO_FAR' 
        };
      }
    }

    if (requiredValidations.includes('cooldown')) {
      const cooldownValidation = this.validateCooldown(context.player.name, context.request.type);
      context.validations.cooldown = cooldownValidation;
      
      if (cooldownValidation.active) {
        return { 
          valid: false, 
          reason: `Cooldown actif (${Math.ceil((cooldownValidation.remainingTime || 0) / 1000)}s restantes)`, 
          code: 'COOLDOWN_ACTIVE' 
        };
      }
    }

    if (module.validateSpecific) {
      const specificValidation = await module.validateSpecific(context);
      context.validations.conditions = [specificValidation];
      
      if (!specificValidation.valid) {
        return { 
          valid: false, 
          reason: specificValidation.reason, 
          code: 'CONDITIONS_NOT_MET' 
        };
      }
    }

    return { valid: true };
  }

  private updateCooldown(playerName: string, interactionType: InteractionType): void {
    if (!this.playerCooldowns.has(playerName)) {
      this.playerCooldowns.set(playerName, new Map());
    }
    
    const playerCooldowns = this.playerCooldowns.get(playerName)!;
    playerCooldowns.set(interactionType, Date.now());
  }

  private createErrorResult(
    message: string, 
    code: string, 
    additionalData?: any
  ): InteractionResult {
    return {
      success: false,
      type: 'error',
      message,
      data: {
        metadata: {
          errorCode: code,
          timestamp: Date.now(),
          ...additionalData
        }
      }
    };
  }

  private debugLog(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debug && level === 'info') return;
    
    const prefix = `🎮 [BaseInteractionManager]`;
    
    switch (level) {
      case 'info':
        console.log(`ℹ️ ${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`, data || '');
        break;
    }
  }

  // === ✅ NOUVELLES MÉTHODES D'INFORMATION (CORRIGÉES AVEC TIMER) ===

  getStats(): ExtendedGlobalModuleStats {
    const stats = this.registry.getGlobalStats();
    
    return {
      ...stats,
      aiSystem: {
        initialized: this.aiInitialized,
        enabled: this.config.ai?.enabled || false,
        autoRegistrationCompleted: this.npcAutoRegistrationCompleted,
        config: this.config.ai
      },
      security: this.securityValidator ? this.securityValidator.getStats() : {
        enabled: false,
        suspiciousRequests: 0,
        blockedRequests: 0,
        lastSecurityCheck: new Date()
      },
      // 🔧 NOUVEAU : Stats timer
      worldUpdateTimer: this.worldUpdateTimer ? this.worldUpdateTimer.getStats() : {
        enabled: false,
        isActive: false,
        interval: 0,
        intervalSeconds: 0,
        updatesSent: 0,
        lastUpdate: new Date(),
        averageUpdateTime: 0
      }
    };
  }

  getSystemHealth(): any {
    const baseHealth = this.getStats();
    
    return {
      ...baseHealth,
      aiHealth: this.aiInitialized ? 'healthy' : 'disabled',
      securityHealth: this.securityValidator ? 'enabled' : 'disabled',
      timerHealth: this.worldUpdateTimer ? (this.worldUpdateTimer.getStats().isActive ? 'active' : 'inactive') : 'disabled',
      overallHealth: this.aiInitialized && baseHealth.systemHealth === 'healthy' ? 'healthy' : 'warning'
    };
  }

  getIntelligenceConnector(): NPCIntelligenceConnector | null {
    return this.registry.getIntelligenceConnector();
  }

  getSecurityValidator(): SecurityValidator | null {
    return this.securityValidator;
  }

  // 🔧 NOUVEAU : Accès au timer
  getWorldUpdateTimer(): WorldUpdateTimer | null {
    return this.worldUpdateTimer;
  }

  // Méthodes existantes inchangées
  getConfig(): ExtendedInteractionConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ExtendedInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.security && this.config.security?.enabled) {
      this.securityValidator = new SecurityValidator(this.config.security);
    }
    
    // 🔧 NOUVEAU : Reconfigurer le timer si nécessaire
    if (newConfig.worldUpdateTimer && this.worldUpdateTimer) {
      this.worldUpdateTimer.updateConfig(newConfig.worldUpdateTimer);
    }
    
    console.log(`🔧 [BaseInteractionManager] Configuration mise à jour`);
  }

  getModule(moduleName: string): IInteractionModule | null {
    return this.registry.getModule(moduleName);
  }

  listModules(): string[] {
    return this.registry.getAllModules().map(m => m.moduleName);
  }
}

// ✅ EXPORT PAR DÉFAUT POUR COMPATIBILITÉ
export default BaseInteractionManager;
