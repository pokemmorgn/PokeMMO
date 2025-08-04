// src/interactions/BaseInteractionManager.ts
// Gestionnaire de base pour toutes les interactions - VERSION SÉCURISÉE COMPLÈTE

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

interface ExtendedInteractionConfig extends InteractionConfig {
  // Configuration IA
  ai?: AIInteractionConfig;
  
  // ✅ NOUVELLE : Configuration sécurité
  security?: SecurityConfig;
  
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
}

// ✅ CLASSE DE VALIDATION SÉCURITAIRE
class SecurityValidator {
  private suspiciousActivities: Map<string, number> = new Map();
  private blockedPlayers: Set<string> = new Set();
  private lastCleanup: number = Date.now();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * ✅ VALIDATION PRINCIPALE DE SÉCURITÉ
   */
  validateRequest(player: Player, request: InteractionRequest): { 
    valid: boolean; 
    reason?: string; 
    sanitizedRequest?: InteractionRequest;
    securityWarnings?: string[];
  } {
    const warnings: string[] = [];
    
    // 1. Vérifier joueur bloqué
    if (this.config.blockSuspiciousPlayers && this.blockedPlayers.has(player.name)) {
      return { 
        valid: false, 
        reason: 'Joueur temporairement bloqué pour activité suspecte' 
      };
    }

    // 2. Vérifier rate limiting
    if (!this.checkRateLimit(player.name)) {
      this.recordSuspiciousActivity(player.name, 'RATE_LIMIT');
      return { 
        valid: false, 
        reason: 'Trop de requêtes par minute' 
      };
    }

    // 3. Validation données de base
    const baseValidation = this.validateBasicData(player, request);
    if (!baseValidation.valid) {
      this.recordSuspiciousActivity(player.name, 'INVALID_DATA');
      return baseValidation;
    }

    // 4. ✅ VALIDATION CRITIQUE : Position client vs serveur
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

    // 5. ✅ VALIDATION CRITIQUE : Zone client vs serveur
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

    // 6. ✅ NETTOYAGE ET SANITISATION DE LA REQUÊTE
    const sanitizedRequest = this.sanitizeRequest(player, request);

    return { 
      valid: true, 
      sanitizedRequest,
      securityWarnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * ✅ VALIDATION POSITION CLIENT VS SERVEUR
   */
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
      
      // Déterminer la sévérité
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (distance > this.config.maxDistanceFromServer * 3) {
        severity = 'HIGH'; // Très suspect
      } else if (distance > this.config.maxDistanceFromServer * 1.5) {
        severity = 'MEDIUM'; // Modérément suspect
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

  /**
   * ✅ VALIDATION ZONE CLIENT VS SERVEUR
   */
  private validateClientZone(
    player: Player, 
    clientZone: string
  ): { valid: boolean; severity?: 'LOW' | 'MEDIUM' | 'HIGH'; warning?: string } {
    
    const serverZone = player.currentZone;
    
    if (clientZone !== serverZone) {
      const warning = `Zone client "${clientZone}" différente du serveur "${serverZone}"`;
      
      // Zone complètement différente = très suspect
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

  /**
   * ✅ NETTOYAGE SÉCURISÉ DE LA REQUÊTE
   */
  private sanitizeRequest(player: Player, request: InteractionRequest): InteractionRequest {
    const sanitized: InteractionRequest = {
      type: request.type,
      targetId: request.targetId,
      
      // ✅ REMPLACER PAR DONNÉES SERVEUR FIABLES
      position: {
        x: player.x,
        y: player.y,
        mapId: player.currentZone
      },
      
      data: {
        // ✅ GARDER SEULEMENT LES DONNÉES NÉCESSAIRES
        npcId: request.data?.npcId,
        objectId: request.data?.objectId,
        objectType: request.data?.objectType,
        action: request.data?.action,
        playerLanguage: request.data?.playerLanguage || 'fr',
        itemId: request.data?.itemId,
        direction: request.data?.direction,
        
        // ✅ MÉTADONNÉES DE SÉCURITÉ
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

  /**
   * Validation données de base
   */
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

  /**
   * Rate limiting par joueur
   */
  private checkRateLimit(playerName: string): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${playerName}_${minute}`;
    
    const current = this.suspiciousActivities.get(key) || 0;
    if (current >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    this.suspiciousActivities.set(key, current + 1);
    
    // Nettoyage périodique
    if (now - this.lastCleanup > 60000) {
      this.cleanupOldEntries();
      this.lastCleanup = now;
    }
    
    return true;
  }

  /**
   * Enregistrer activité suspecte
   */
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
    
    // Bloquer temporairement si trop d'activités suspectes
    if (this.config.blockSuspiciousPlayers && current >= 5) {
      this.blockedPlayers.add(playerName);
      console.warn('🚫 [SECURITY] Joueur bloqué temporairement', { player: playerName });
      
      // Débloquer après 10 minutes
      setTimeout(() => {
        this.blockedPlayers.delete(playerName);
        console.info('✅ [SECURITY] Joueur débloqué', { player: playerName });
      }, 10 * 60 * 1000);
    }
  }

  /**
   * Nettoyage des entrées anciennes
   */
  private cleanupOldEntries() {
    const now = Date.now();
    const cutoff = Math.floor((now - 5 * 60000) / 60000); // 5 minutes
    
    for (const [key] of this.suspiciousActivities.entries()) {
      if (key.includes('_') && !key.includes('suspicious')) {
        const minute = parseInt(key.split('_').pop() || '0');
        if (minute < cutoff) {
          this.suspiciousActivities.delete(key);
        }
      }
    }
  }

  /**
   * Statistiques de sécurité
   */
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

// ✅ REGISTRY AMÉLIORÉ AVEC IA ET SÉCURITÉ
class AIEnhancedModuleRegistry implements IModuleRegistry {
  private modules: Map<string, IInteractionModule> = new Map();
  private config: ModulesConfiguration = {};
  
  // ✅ NOUVEAU : Connecteur IA
  private intelligenceConnector: NPCIntelligenceConnector | null = null;

  register(module: IInteractionModule): void {
    console.log(`📦 [Registry] Enregistrement module: ${module.moduleName} v${module.version}`);
    this.modules.set(module.moduleName, module);
    
    // ✅ NOUVEAU : Injecter le connecteur IA dans les modules compatibles
    if (this.intelligenceConnector && this.isAICompatibleModule(module)) {
      this.injectAIConnector(module);
    }
  }

  // ✅ NOUVEAU : Initialisation du système IA
  async initializeAI(config: AIInteractionConfig): Promise<void> {
    if (!config.enabled) {
      console.log('🤖 [Registry] IA désactivée');
      return;
    }

    try {
      console.log('🚀 [Registry] Initialisation IA...');
      
      // Récupérer l'instance du connecteur
      this.intelligenceConnector = getNPCIntelligenceConnector();
      
      // Configurer le connecteur
      this.intelligenceConnector.updateConfig({
        enabledNPCTypes: config.enabledNPCTypes as any[],
        enabledZones: config.enabledZones,
        globallyEnabled: config.enabled,
        fallbackToBasic: config.fallbackToBasic,
        analysisTimeout: config.analysisTimeout,
        debugMode: config.debugMode
      });

      // Injecter dans les modules déjà enregistrés
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

  // ✅ NOUVEAU : Enregistrement NPCs dans l'IA
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

  // ✅ NOUVEAU : Vérification compatibilité IA
  private isAICompatibleModule(module: IInteractionModule): boolean {
    return module.moduleName === 'NpcInteractionModule' && 
           typeof (module as any).setIntelligenceConnector === 'function';
  }

  // ✅ NOUVEAU : Injection du connecteur IA
  private injectAIConnector(module: IInteractionModule): void {
    try {
      (module as any).setIntelligenceConnector(this.intelligenceConnector);
      console.log(`🤖 [Registry] IA injectée dans ${module.moduleName}`);
    } catch (error) {
      console.warn(`⚠️ [Registry] Impossible d'injecter IA dans ${module.moduleName}:`, error);
    }
  }

  // ✅ ACCESSEUR IA
  getIntelligenceConnector(): NPCIntelligenceConnector | null {
    return this.intelligenceConnector;
  }

  // === MÉTHODES EXISTANTES (inchangées) ===
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
    
    // Nettoyer les modules
    for (const module of this.modules.values()) {
      if (module.cleanup) {
        try {
          await module.cleanup();
        } catch (error) {
          console.error(`❌ [Registry] Erreur nettoyage ${module.moduleName}:`, error);
        }
      }
    }
    
    // ✅ NOUVEAU : Nettoyer l'IA
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

    // ✅ NOUVEAU : Ajouter stats IA dans moduleStats (pas directement dans le retour)
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

// ✅ GESTIONNAIRE DE BASE AMÉLIORÉ AVEC IA ET SÉCURITÉ
export class BaseInteractionManager {
  
  private registry: AIEnhancedModuleRegistry = new AIEnhancedModuleRegistry();
  private config: ExtendedInteractionConfig;
  private playerCooldowns: Map<string, Map<string, number>> = new Map();
  
  // ✅ NOUVEAU : État du système IA
  private aiInitialized: boolean = false;
  private npcAutoRegistrationCompleted: boolean = false;
  
  // ✅ NOUVEAU : Système de sécurité
  private securityValidator: SecurityValidator | null = null;

  constructor(config?: Partial<ExtendedInteractionConfig>) {
    // Configuration par défaut + IA + Sécurité
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
      
      // ✅ NOUVEAU : Configuration IA par défaut
      ai: {
        enabled: process.env.NPC_AI_ENABLED !== 'false',
        enabledNPCTypes: ['dialogue', 'healer', 'quest_master', 'researcher'],
        enabledZones: [], // Vide = toutes les zones
        fallbackToBasic: true,
        analysisTimeout: 5000,
        debugMode: process.env.NODE_ENV === 'development'
      },
      
      // ✅ NOUVEAU : Configuration sécurité par défaut
      security: {
        enabled: process.env.SECURITY_ENABLED !== 'false',
        logSuspiciousActivity: process.env.NODE_ENV === 'development',
        maxDistanceFromServer: 100, // 100px de tolérance
        rateLimitPerMinute: 30, // 30 requêtes/minute max
        blockSuspiciousPlayers: process.env.NODE_ENV === 'production',
        auditLogPath: './logs/security.log'
      },
      
      // ✅ NOUVEAU : Auto-enregistrement NPCs
      autoRegisterNPCs: process.env.NPC_AUTO_REGISTER !== 'false',
      npcDataSources: {},
      
      ...config
    };

    // ✅ INITIALISER LE VALIDATEUR DE SÉCURITÉ
    if (this.config.security?.enabled) {
      this.securityValidator = new SecurityValidator(this.config.security);
    }

    console.log(`🎮 [BaseInteractionManager] Initialisé avec IA + Sécurité`, {
      aiEnabled: this.config.ai?.enabled,
      securityEnabled: this.config.security?.enabled,
      aiTypes: this.config.ai?.enabledNPCTypes?.length,
      autoRegister: this.config.autoRegisterNPCs
    });
  }

  // === ✅ MÉTHODES PRINCIPALES AMÉLIORÉES AVEC SÉCURITÉ ===

  /**
   * ✅ Traite une interaction avec support IA automatique + SÉCURITÉ
   */
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

      // ✅ 1. VALIDATION SÉCURITAIRE EN PREMIER
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
        
        // Utiliser la requête nettoyée
        if (securityCheck.sanitizedRequest) {
          finalRequest = securityCheck.sanitizedRequest;
        }
        
        if (securityCheck.securityWarnings) {
          securityWarnings = securityCheck.securityWarnings;
        }
      }

      // ✅ 2. Valider la requête de base (avec requête nettoyée)
      const requestValidation = this.validateRequest(finalRequest);
      if (!requestValidation.valid) {
        return this.createErrorResult(requestValidation.reason || 'Requête invalide', 'INVALID_REQUEST');
      }

      // ✅ 3. Trouver le module approprié
      const module = this.registry.findModule(finalRequest);
      if (!module) {
        return this.createErrorResult(
          `Aucun module disponible pour le type: ${finalRequest.type}`, 
          'MODULE_NOT_FOUND'
        );
      }

      // ✅ 4. Effectuer les validations requises (avec données serveur)
      const context = await this.buildInteractionContext(player, finalRequest);
      const validationResult = await this.performValidations(context, module);
      
      if (!validationResult.valid) {
        return this.createErrorResult(validationResult.reason || 'Validation échouée', validationResult.code);
      }

      // ✅ 5. Traiter l'interaction via le module (le module peut maintenant utiliser l'IA)
      const result = await module.handle(context);

      // ✅ 6. Post-traitement
      if (result.success) {
        this.updateCooldown(player.name, finalRequest.type);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;
      result.moduleUsed = module.moduleName;
      result.timestamp = Date.now();

      // ✅ Ajouter avertissements sécurité dans les métadonnées
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

  // === ✅ NOUVELLES MÉTHODES IA (INCHANGÉES) ===

  /**
   * Initialise le système d'IA
   */
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

  /**
   * Enregistre des NPCs dans le système d'IA
   */
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

  /**
   * Auto-enregistrement des NPCs depuis les managers disponibles
   */
  async autoRegisterNPCs(): Promise<void> {
    if (!this.config.autoRegisterNPCs || this.npcAutoRegistrationCompleted) {
      return;
    }

    try {
      console.log('🔍 [BaseInteractionManager] Auto-enregistrement NPCs...');
      
      const allNpcs: any[] = [];
      
      // Méthode 1: getNpcManager fourni
      if (this.config.npcDataSources?.getNpcManager) {
        const zones = ['pallet_town', 'route_1', 'viridian_city']; // TODO: Récupérer dynamiquement
        
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
      
      // Méthode 2: npcManagers Map fournie
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

  /**
   * Configure les sources de données NPCs
   */
  setNPCDataSources(sources: ExtendedInteractionConfig['npcDataSources']): void {
    this.config.npcDataSources = sources;
    this.npcAutoRegistrationCompleted = false; // Reset pour permettre re-enregistrement
    this.debugLog('info', '🔧 Sources de données NPCs configurées');
  }

  // === GESTION DES MODULES (améliorée) ===

  /**
   * Enregistrer un module d'interaction
   */
  registerModule(module: IInteractionModule): void {
    this.registry.register(module);
  }

  /**
   * Initialiser tous les modules + IA
   */
  async initialize(): Promise<void> {
    // 1. Initialiser les modules classiques
    await this.registry.initializeAll();
    
    // 2. Initialiser l'IA
    await this.initializeAI();
    
    // 3. Auto-enregistrement NPCs
    await this.autoRegisterNPCs();
    
    console.log(`✅ [BaseInteractionManager] Système d'interaction + IA + Sécurité initialisé`);
  }

  /**
   * Nettoyer tous les modules + IA
   */
  async cleanup(): Promise<void> {
    await this.registry.cleanupAll();
    this.aiInitialized = false;
    this.npcAutoRegistrationCompleted = false;
    this.securityValidator = null;
    console.log(`🧹 [BaseInteractionManager] Système d'interaction + IA + Sécurité nettoyé`);
  }

  // === MÉTHODES EXISTANTES (inchangées mais utilisent les données serveur) ===

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
    // ✅ UTILISE TOUJOURS LES DONNÉES SERVEUR
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
    
    // ✅ UTILISE TOUJOURS LES DONNÉES SERVEUR
    const context: InteractionContext = {
      player,
      request,
      validations: {},
      metadata: {
        timestamp: Date.now(),
        sessionId: 'unknown', // TODO: Récupérer depuis player si disponible
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

    // Validation proximité (utilise TOUJOURS les données serveur)
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

    // Validation cooldown
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

    // Validation spécifique du module
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

  // === ✅ NOUVELLES MÉTHODES D'INFORMATION (CORRIGÉES AVEC SÉCURITÉ) ===

  /**
   * Obtenir les statistiques globales + IA + Sécurité
   */
  getStats(): ExtendedGlobalModuleStats {
    const stats = this.registry.getGlobalStats();
    
    // ✅ CORRECTION : Retourner le type étendu avec aiSystem + security
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
      }
    };
  }

  /**
   * État de santé du système incluant l'IA + Sécurité
   */
  getSystemHealth(): any {
    const baseHealth = this.getStats();
    
    return {
      ...baseHealth,
      aiHealth: this.aiInitialized ? 'healthy' : 'disabled',
      securityHealth: this.securityValidator ? 'enabled' : 'disabled',
      overallHealth: this.aiInitialized && baseHealth.systemHealth === 'healthy' ? 'healthy' : 'warning'
    };
  }

  /**
   * Accès au connecteur IA (pour debug/admin)
   */
  getIntelligenceConnector(): NPCIntelligenceConnector | null {
    return this.registry.getIntelligenceConnector();
  }

  /**
   * ✅ NOUVEAU : Accès au validateur de sécurité (pour admin)
   */
  getSecurityValidator(): SecurityValidator | null {
    return this.securityValidator;
  }

  // Méthodes existantes inchangées
  getConfig(): ExtendedInteractionConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ExtendedInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // ✅ Réinitialiser le validateur sécurité si config changée
    if (newConfig.security && this.config.security?.enabled) {
      this.securityValidator = new SecurityValidator(this.config.security);
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
