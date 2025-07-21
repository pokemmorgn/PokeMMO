// src/interactions/BaseInteractionManager.ts
// Gestionnaire de base pour toutes les interactions - Orchestrateur principal

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

// ✅ REGISTRY SIMPLE DES MODULES
class ModuleRegistry implements IModuleRegistry {
  private modules: Map<string, IInteractionModule> = new Map();
  private config: ModulesConfiguration = {};

  register(module: IInteractionModule): void {
    console.log(`📦 [Registry] Enregistrement module: ${module.moduleName} v${module.version}`);
    this.modules.set(module.moduleName, module);
  }

  findModule(request: InteractionRequest): IInteractionModule | null {
    // Chercher le premier module qui peut gérer cette requête
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

// ✅ GESTIONNAIRE DE BASE PRINCIPAL
export class BaseInteractionManager {
  
  private registry: IModuleRegistry = new ModuleRegistry();
  private config: InteractionConfig;
  private playerCooldowns: Map<string, Map<string, number>> = new Map();

  constructor(config?: Partial<InteractionConfig>) {
    // Configuration par défaut
    this.config = {
      maxDistance: 64,
      cooldowns: {
        npc: 500,           // 500ms entre interactions NPCs
        object: 200,        // 200ms entre ramassages
        environment: 1000,  // 1s entre fouilles
        player: 2000,       // 2s entre interactions joueurs
        puzzle: 0           // Pas de cooldown puzzles
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
      ...config
    };

    console.log(`🎮 [BaseInteractionManager] Initialisé avec config:`, this.config);
  }

  // === MÉTHODES PRINCIPALES ===

  /**
   * Traite une interaction de manière complète
   */
  async processInteraction(
    player: Player, 
    request: InteractionRequest
  ): Promise<InteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.debugLog('info', `Traitement interaction ${request.type}`, { 
        player: player.name, 
        targetId: request.targetId 
      });

      // 1. Valider la requête de base
      const requestValidation = this.validateRequest(request);
      if (!requestValidation.valid) {
        return this.createErrorResult(requestValidation.reason || 'Requête invalide', 'INVALID_REQUEST');
      }

      // 2. Trouver le module approprié
      const module = this.registry.findModule(request);
      if (!module) {
        return this.createErrorResult(
          `Aucun module disponible pour le type: ${request.type}`, 
          'MODULE_NOT_FOUND'
        );
      }

      // 3. Effectuer les validations requises
      const context = await this.buildInteractionContext(player, request);
      const validationResult = await this.performValidations(context, module);
      
      if (!validationResult.valid) {
        return this.createErrorResult(validationResult.reason || 'Validation échouée', validationResult.code);
      }

      // 4. Traiter l'interaction via le module
      const result = await module.handle(context);

      // 5. Post-traitement
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
        module: module.moduleName
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

  // === GESTION DES MODULES ===

  /**
   * Enregistrer un module d'interaction
   */
  registerModule(module: IInteractionModule): void {
    this.registry.register(module);
  }

  /**
   * Initialiser tous les modules
   */
  async initialize(): Promise<void> {
    await this.registry.initializeAll();
    console.log(`✅ [BaseInteractionManager] Système d'interaction initialisé`);
  }

  /**
   * Nettoyer tous les modules
   */
  async cleanup(): Promise<void> {
    await this.registry.cleanupAll();
    console.log(`🧹 [BaseInteractionManager] Système d'interaction nettoyé`);
  }

  // === VALIDATIONS ===

  /**
   * Validation de base de la requête
   */
  private validateRequest(request: InteractionRequest): { valid: boolean; reason?: string } {
    if (!request.type) {
      return { valid: false, reason: 'Type d\'interaction manquant' };
    }

    if (!request.position && ['npc', 'object', 'environment'].includes(request.type)) {
      return { valid: false, reason: 'Position requise pour ce type d\'interaction' };
    }

    return { valid: true };
  }

  /**
   * Validation de proximité
   */
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

  /**
   * Validation de cooldown
   */
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

  // === MÉTHODES UTILITAIRES ===

  /**
   * Construit le contexte complet d'interaction
   */
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

  /**
   * Effectue toutes les validations requises
   */
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

  /**
   * Met à jour le cooldown du joueur
   */
  private updateCooldown(playerName: string, interactionType: InteractionType): void {
    if (!this.playerCooldowns.has(playerName)) {
      this.playerCooldowns.set(playerName, new Map());
    }
    
    const playerCooldowns = this.playerCooldowns.get(playerName)!;
    playerCooldowns.set(interactionType, Date.now());
  }

  /**
   * Crée un résultat d'erreur standardisé
   */
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

  /**
   * Logging avec niveau configurable
   */
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

  // === MÉTHODES D'INFORMATION ===

  /**
   * Obtenir les statistiques globales
   */
  getStats(): GlobalModuleStats {
    return this.registry.getGlobalStats();
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): InteractionConfig {
    return { ...this.config };
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 [BaseInteractionManager] Configuration mise à jour`);
  }

  /**
   * Obtenir un module par nom
   */
  getModule(moduleName: string): IInteractionModule | null {
    return this.registry.getModule(moduleName);
  }

  /**
   * Lister tous les modules enregistrés
   */
  listModules(): string[] {
    return this.registry.getAllModules().map(m => m.moduleName);
  }
}
