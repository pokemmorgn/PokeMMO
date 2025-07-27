// src/interactions/BaseInteractionManager.ts
// Gestionnaire de base pour toutes les interactions - Orchestrateur principal + IA

import { Player } from "../schema/PokeWorldState";
import { 
  InteractionRequest, 
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

interface ExtendedInteractionConfig extends InteractionConfig {
  // Configuration IA
  ai?: AIInteractionConfig;
  
  // NPCs auto-registration
  autoRegisterNPCs?: boolean;
  npcDataSources?: {
    getNpcManager?: (zoneName: string) => any;
    npcManagers?: Map<string, any>;
  };
}

// ✅ REGISTRY AMÉLIORÉ AVEC IA
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
      console.log('🚀 [Registry] Initialisation système IA...');
      
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

    // ✅ NOUVEAU : Ajouter stats IA
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

// ✅ GESTIONNAIRE DE BASE AMÉLIORÉ AVEC IA
export class BaseInteractionManager {
  
  private registry: AIEnhancedModuleRegistry = new AIEnhancedModuleRegistry();
  private config: ExtendedInteractionConfig;
  private playerCooldowns: Map<string, Map<string, number>> = new Map();
  
  // ✅ NOUVEAU : État du système IA
  private aiInitialized: boolean = false;
  private npcAutoRegistrationCompleted: boolean = false;

  constructor(config?: Partial<ExtendedInteractionConfig>) {
    // Configuration par défaut + IA
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
      
      // ✅ NOUVEAU : Auto-enregistrement NPCs
      autoRegisterNPCs: process.env.NPC_AUTO_REGISTER !== 'false',
      npcDataSources: {},
      
      ...config
    };

    console.log(`🎮 [BaseInteractionManager] Initialisé avec IA`, {
      aiEnabled: this.config.ai?.enabled,
      aiTypes: this.config.ai?.enabledNPCTypes?.length,
      autoRegister: this.config.autoRegisterNPCs
    });
  }

  // === ✅ MÉTHODES PRINCIPALES AMÉLIORÉES ===

  /**
   * Traite une interaction avec support IA automatique
   */
  async processInteraction(
    player: Player, 
    request: InteractionRequest
  ): Promise<InteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.debugLog('info', `Traitement interaction ${request.type}`, { 
        player: player.name, 
        targetId: request.targetId,
        aiEnabled: this.aiInitialized
      });

      // 1. Valider la requête de base (inchangé)
      const requestValidation = this.validateRequest(request);
      if (!requestValidation.valid) {
        return this.createErrorResult(requestValidation.reason || 'Requête invalide', 'INVALID_REQUEST');
      }

      // 2. Trouver le module approprié (inchangé)
      const module = this.registry.findModule(request);
      if (!module) {
        return this.createErrorResult(
          `Aucun module disponible pour le type: ${request.type}`, 
          'MODULE_NOT_FOUND'
        );
      }

      // 3. Effectuer les validations requises (inchangé)
      const context = await this.buildInteractionContext(player, request);
      const validationResult = await this.performValidations(context, module);
      
      if (!validationResult.valid) {
        return this.createErrorResult(validationResult.reason || 'Validation échouée', validationResult.code);
      }

      // 4. Traiter l'interaction via le module (le module peut maintenant utiliser l'IA)
      const result = await module.handle(context);

      // 5. Post-traitement (inchangé)
      if (result.success) {
        this.updateCooldown(player.name, request.type);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;
      result.moduleUsed = module.moduleName;
      result.timestamp = Date.now();

      this.debugLog('info', `Interaction terminée en ${processingTime}ms`, { 
        success: result.success, 
        type: result.type,
        module: module.moduleName,
        aiUsed: !!(result as any).usedAI // Flag optionnel que les modules peuvent ajouter
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.debugLog('error', 'Erreur traitement interaction', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED',
        { processingTime, error: error instanceof Error ? error.stack : error }
      );
    }
  }

  // === ✅ NOUVELLES MÉTHODES IA ===

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
    
    console.log(`✅ [BaseInteractionManager] Système d'interaction + IA initialisé`);
  }

  /**
   * Nettoyer tous les modules + IA
   */
  async cleanup(): Promise<void> {
    await this.registry.cleanupAll();
    this.aiInitialized = false;
    this.npcAutoRegistrationCompleted = false;
    console.log(`🧹 [BaseInteractionManager] Système d'interaction + IA nettoyé`);
  }

  // === MÉTHODES EXISTANTES (inchangées) ===

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
    const dx = Math.abs(player.x - targetPosition.x);
    const dy = Math.abs(player.y - targetPosition.y);
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
        sessionId: 'unknown' // TODO: Récupérer depuis player si disponible
      }
    };

    return context;
  }

  private async performValidations(
    context: InteractionContext, 
    module: IInteractionModule
  ): Promise<{ valid: boolean; reason?: string; code?: string }> {
    
    const requiredValidations = this.config.requiredValidations?.[context.request.type] || [];

    // Validation proximité
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

  // === ✅ NOUVELLES MÉTHODES D'INFORMATION ===

  /**
   * Obtenir les statistiques globales + IA
   */
  getStats(): GlobalModuleStats {
    const stats = this.registry.getGlobalStats();
    
    // Ajouter informations IA
    return {
      ...stats,
      aiSystem: {
        initialized: this.aiInitialized,
        enabled: this.config.ai?.enabled || false,
        autoRegistrationCompleted: this.npcAutoRegistrationCompleted,
        config: this.config.ai
      }
    };
  }

  /**
   * État de santé du système incluant l'IA
   */
  getSystemHealth(): any {
    const baseHealth = this.getStats();
    
    return {
      ...baseHealth,
      aiHealth: this.aiInitialized ? 'healthy' : 'disabled',
      overallHealth: this.aiInitialized && baseHealth.systemHealth === 'healthy' ? 'healthy' : 'warning'
    };
  }

  /**
   * Accès au connecteur IA (pour debug/admin)
   */
  getIntelligenceConnector(): NPCIntelligenceConnector | null {
    return this.registry.getIntelligenceConnector();
  }

  // Méthodes existantes inchangées
  getConfig(): ExtendedInteractionConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ExtendedInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 [BaseInteractionManager] Configuration mise à jour`);
  }

  getModule(moduleName: string): IInteractionModule | null {
    return this.registry.getModule(moduleName);
  }

  listModules(): string[] {
    return this.registry.getAllModules().map(m => m.moduleName);
  }
}
