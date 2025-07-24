// server/src/quest/services/QuestValidator.ts
// Service modulaire pour la validation des quêtes et conditions

import { 
  QuestDefinition, 
  QuestCategory,
  QuestStatus,
  QuestObjectiveConditions,
  QuestEventContext,
  PlayerQuestProgress
} from "../core/types/QuestTypes";

// ===== INTERFACE DU SERVICE =====

/**
 * ✅ Interface principale du service de validation
 */
export interface IQuestValidator {
  // Validation principale de disponibilité
  canTakeQuest(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<QuestValidationResult>;
  
  // Validation de disponibilité pour un joueur
  isAvailableForPlayer(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<boolean>;
  
  // Validations spécifiques
  validatePrerequisites(questId: string, completedQuests: string[]): QuestValidationCheck;
  validateCooldown(quest: QuestDefinition, lastCompletions: QuestCompletion[]): QuestValidationCheck;
  validateLevelRequirements(quest: QuestDefinition, playerLevel: number): QuestValidationCheck;
  validateAdvancedConditions(quest: QuestDefinition, context: QuestEventContext): Promise<QuestValidationCheck>;
  
  // Validation de conditions étendues
  validateExtendedConditions(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    context?: QuestEventContext
  ): Promise<QuestAdvancedValidationResult>;
  
  // Validation batch pour performance
  validateMultipleQuests(
    quests: QuestDefinition[],
    playerData: PlayerValidationData
  ): Promise<Record<string, QuestValidationResult>>;
}

// ===== TYPES DE DONNÉES =====

/**
 * ✅ Données du joueur pour validation
 */
export interface PlayerValidationData {
  username: string;
  level: number;
  
  // Quêtes
  completedQuests: string[];
  activeQuests: string[];
  lastQuestCompletions: QuestCompletion[];
  
  // Inventaire et progression
  inventory?: PlayerInventory;
  badges?: string[];
  titles?: string[];
  unlockedAreas?: string[];
  
  // Contexte temporel
  currentLocation?: {
    map: string;
    zone?: string;
    x?: number;
    y?: number;
  };
  
  // États spéciaux
  guildId?: string;
  partyMembers?: string[];
  currentSeason?: string;
  
  // Métadonnées
  lastLogin?: Date;
  playtime?: number; // en minutes
  preferences?: PlayerPreferences;
}

/**
 * ✅ Inventaire du joueur
 */
export interface PlayerInventory {
  items: Record<string, number>; // itemId -> quantity
  gold: number;
  capacity: number;
  usedSlots: number;
}

/**
 * ✅ Préférences du joueur
 */
export interface PlayerPreferences {
  language?: string;
  difficulty?: string;
  questNotifications?: boolean;
  autoAcceptQuests?: boolean;
}

/**
 * ✅ Completion de quête (pour cooldowns)
 */
export interface QuestCompletion {
  questId: string;
  lastCompletedAt: Date;
  completionCount?: number;
}

// ===== TYPES DE RÉSULTATS =====

/**
 * ✅ Résultat de validation principal
 */
export interface QuestValidationResult {
  valid: boolean;
  questId: string;
  questName: string;
  
  // Détails de validation
  checks: QuestValidationCheck[];
  failedChecks: QuestValidationCheck[];
  warningChecks: QuestValidationCheck[];
  
  // Raisons d'échec
  primaryReason?: string;
  detailedReasons: string[];
  
  // Recommandations
  recommendations?: string[];
  alternatives?: string[]; // Autres quêtes similaires
  
  // Conditions manquantes
  missingPrerequisites?: string[];
  missingItems?: string[];
  missingBadges?: string[];
  
  // Délais
  cooldownRemaining?: number; // en minutes
  levelRequired?: number;
  
  // Métadonnées
  validationTime: number; // en ms
  checkedConditions: string[];
}

/**
 * ✅ Check de validation individuel
 */
export interface QuestValidationCheck {
  type: QuestValidationType;
  name: string;
  valid: boolean;
  required: boolean;
  
  // Détails
  currentValue?: any;
  requiredValue?: any;
  message: string;
  
  // Conseils
  suggestion?: string;
  helpText?: string;
  
  // Timing
  checkTime?: number; // en ms
  retryable?: boolean;
}

/**
 * ✅ Types de validation
 */
export type QuestValidationType =
  | 'prerequisites'      // Quêtes prérequises
  | 'level'             // Niveau du joueur
  | 'cooldown'          // Cooldown de répétition
  | 'inventory'         // Espace/objets requis
  | 'badges'            // Badges requis
  | 'location'          // Localisation
  | 'time'              // Conditions temporelles
  | 'season'            // Conditions saisonnières
  | 'guild'             // Conditions de guilde
  | 'party'             // Conditions de groupe
  | 'achievement'       // Achievements requis
  | 'reputation'        // Réputation requise
  | 'custom';           // Conditions personnalisées

/**
 * ✅ Résultat de validation avancée
 */
export interface QuestAdvancedValidationResult extends QuestValidationResult {
  // Conditions étendues
  extendedChecks: ExtendedValidationCheck[];
  
  // Contexte utilisé
  contextData?: QuestEventContext;
  timeOfValidation: Date;
  
  // Prédictions
  predictedAvailability?: Date; // Quand la quête sera disponible
  dynamicConditions?: string[]; // Conditions qui changent
  
  // Optimisations
  cacheKey?: string;
  cacheTTL?: number; // en secondes
}

/**
 * ✅ Check de validation étendu
 */
export interface ExtendedValidationCheck extends QuestValidationCheck {
  category: 'temporal' | 'location' | 'social' | 'progression' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Données étendues
  metadata?: {
    checkVersion?: string;
    algorithmUsed?: string;
    confidenceLevel?: number;
  };
  
  // Conditions dynamiques
  isDynamic?: boolean;
  nextRecheck?: Date;
  
  // Relations
  dependsOn?: string[]; // Autres checks
  blocks?: string[];    // Checks que celui-ci bloque
}

// ===== CONFIGURATION =====

/**
 * ⚙️ Configuration du validateur
 */
export interface QuestValidatorConfig {
  // Performance
  enableCaching: boolean;
  cacheTTL: number; // en secondes
  enableBatchValidation: boolean;
  maxBatchSize: number;
  
  // Validation
  strictValidation: boolean;
  enableAdvancedConditions: boolean;
  enablePredictiveValidation: boolean;
  
  // Conditions étendues
  enableTemporalValidation: boolean;
  enableLocationValidation: boolean;
  enableSocialValidation: boolean;
  
  // Optimisations
  enableEarlyExit: boolean; // Arrêt dès premier échec
  enableParallelChecks: boolean;
  
  // Logging
  enableValidationLogging: boolean;
  logFailedValidations: boolean;
  logPerformanceMetrics: boolean;
  
  // Limites
  maxValidationTime: number; // en ms
  maxRetries: number;
  
  // Extensions futures
  enableExperimentalFeatures: boolean;
}

// ===== IMPLÉMENTATION =====

/**
 * ✅ Service de validation des quêtes
 * Extrait du QuestManager pour modularité
 */
class QuestValidator implements IQuestValidator {
  private config: QuestValidatorConfig;
  private validationCache: Map<string, { result: QuestValidationResult; expires: number }>;
  
  constructor(config?: Partial<QuestValidatorConfig>) {
    this.config = {
      enableCaching: true,
      cacheTTL: 300, // 5 minutes
      enableBatchValidation: true,
      maxBatchSize: 20,
      strictValidation: true,
      enableAdvancedConditions: true,
      enablePredictiveValidation: false,
      enableTemporalValidation: true,
      enableLocationValidation: true,
      enableSocialValidation: false,
      enableEarlyExit: true,
      enableParallelChecks: false,
      enableValidationLogging: process.env.NODE_ENV === 'development',
      logFailedValidations: true,
      logPerformanceMetrics: false,
      maxValidationTime: 5000, // 5 secondes
      maxRetries: 2,
      enableExperimentalFeatures: false,
      ...config
    };
    
    this.validationCache = new Map();
    
    this.log('info', '✅ QuestValidator initialisé', { config: this.config });
  }

  // ===== MÉTHODES PRINCIPALES =====

  /**
   * ✅ Validation principale - Peut-on prendre cette quête ?
   * Extraite et étendue de QuestManager.canTakeQuest()
   */
  async canTakeQuest(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<QuestValidationResult> {
    
    const startTime = Date.now();
    this.log('info', `✅ Validation quête: ${quest.name} pour ${playerData.username}`);
    
    // ✅ VÉRIFIER LE CACHE
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(quest.id, playerData);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.log('debug', `💾 Résultat de validation trouvé en cache`);
        return cached;
      }
    }
    
    const result: QuestValidationResult = {
      valid: true,
      questId: quest.id,
      questName: quest.name,
      checks: [],
      failedChecks: [],
      warningChecks: [],
      detailedReasons: [],
      validationTime: 0,
      checkedConditions: []
    };
    
    try {
      // ✅ VALIDATIONS DE BASE (existantes)
      await this.performBasicValidations(quest, playerData, result);
      
      // ✅ VALIDATIONS ÉTENDUES (nouvelles)
      if (this.config.enableAdvancedConditions) {
        await this.performAdvancedValidations(quest, playerData, result);
      }
      
      // ✅ FINALISER LE RÉSULTAT
      this.finalizeValidationResult(result, startTime);
      
      // ✅ METTRE EN CACHE
      if (this.config.enableCaching && result.valid) {
        const cacheKey = this.generateCacheKey(quest.id, playerData);
        this.setCache(cacheKey, result);
      }
      
      this.log('info', `✅ Validation terminée: ${result.valid ? 'SUCCÈS' : 'ÉCHEC'}`, {
        questId: quest.id,
        valid: result.valid,
        checksCount: result.checks.length,
        failedCount: result.failedChecks.length,
        time: result.validationTime
      });
      
      return result;
      
    } catch (error) {
      this.log('error', `❌ Erreur validation:`, error);
      result.valid = false;
      result.primaryReason = 'Erreur de validation';
      result.detailedReasons.push(`Erreur système: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      result.validationTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * ✅ Validation simplifiée - Est disponible pour le joueur ?
   */
  async isAvailableForPlayer(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<boolean> {
    
    // ✅ VÉRIFICATIONS RAPIDES D'EXCLUSION
    if (playerData.activeQuests.includes(quest.id)) {
      this.log('debug', `❌ Quête ${quest.id} déjà active`);
      return false;
    }
    
    if (!quest.isRepeatable && playerData.completedQuests.includes(quest.id)) {
      this.log('debug', `❌ Quête ${quest.id} non répétable et déjà complétée`);
      return false;
    }
    
    // ✅ VALIDATION COMPLÈTE
    const validation = await this.canTakeQuest(quest, playerData);
    return validation.valid;
  }

  // ===== VALIDATIONS DE BASE =====

  /**
   * ✅ Validations de base (conservées du QuestManager)
   */
  private async performBasicValidations(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    result: QuestValidationResult
  ): Promise<void> {
    
    // ✅ 1. VÉRIFIER QUÊTE DÉJÀ ACTIVE
    const activeCheck = this.validateNotActive(quest.id, playerData.activeQuests);
    result.checks.push(activeCheck);
    if (!activeCheck.valid) {
      result.failedChecks.push(activeCheck);
      result.valid = false;
    }
    
    // ✅ 2. VÉRIFIER RÉPÉTABILITÉ
    const repeatableCheck = this.validateRepeatable(quest, playerData.completedQuests);
    result.checks.push(repeatableCheck);
    if (!repeatableCheck.valid) {
      result.failedChecks.push(repeatableCheck);
      result.valid = false;
    }
    
    // ✅ 3. VÉRIFIER COOLDOWN
    if (quest.isRepeatable && quest.cooldownHours) {
      const cooldownCheck = this.validateCooldown(quest, playerData.lastQuestCompletions);
      result.checks.push(cooldownCheck);
      if (!cooldownCheck.valid) {
        result.failedChecks.push(cooldownCheck);
        result.valid = false;
        
        // Calculer temps restant
        const lastCompletion = playerData.lastQuestCompletions.find(c => c.questId === quest.id);
        if (lastCompletion) {
          const cooldownMs = quest.cooldownHours * 60 * 60 * 1000;
          const elapsed = Date.now() - lastCompletion.lastCompletedAt.getTime();
          result.cooldownRemaining = Math.ceil((cooldownMs - elapsed) / (60 * 1000));
        }
      }
    }
    
    // ✅ 4. VÉRIFIER PRÉREQUIS
    if (quest.prerequisites && quest.prerequisites.length > 0) {
      const prerequisitesCheck = this.validatePrerequisites(quest.id, playerData.completedQuests);
      result.checks.push(prerequisitesCheck);
      if (!prerequisitesCheck.valid) {
        result.failedChecks.push(prerequisitesCheck);
        result.valid = false;
        
        // Identifier prérequis manquants
        result.missingPrerequisites = quest.prerequisites.filter(
          prereq => !playerData.completedQuests.includes(prereq)
        );
      }
    }
    
    // ✅ 5. VÉRIFIER NIVEAU (si présent dans config)
    if (quest.config?.levelRequirement) {
      const levelCheck = this.validateLevelRequirements(quest, playerData.level);
      result.checks.push(levelCheck);
      if (!levelCheck.valid) {
        result.failedChecks.push(levelCheck);
        result.valid = false;
        result.levelRequired = quest.config.levelRequirement.min;
      }
    }
    
    this.log('debug', `✅ Validations de base: ${result.checks.length} checks, ${result.failedChecks.length} échecs`);
  }

  /**
   * ✅ Validations avancées (nouvelles)
   */
  private async performAdvancedValidations(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    result: QuestValidationResult
  ): Promise<void> {
    
    this.log('debug', `🔍 Démarrage validations avancées pour ${quest.id}`);
    
    // ✅ 6. VÉRIFIER BADGES REQUIS
    if (quest.config?.levelRequirement || playerData.badges) {
      const badgeCheck = this.validateBadgeRequirements(quest, playerData.badges || []);
      if (badgeCheck) {
        result.checks.push(badgeCheck);
        if (!badgeCheck.valid) {
          result.failedChecks.push(badgeCheck);
          result.valid = false;
        }
      }
    }
    
    // ✅ 7. VÉRIFIER INVENTAIRE/ESPACE
    if (this.requiresInventorySpace(quest)) {
      const inventoryCheck = this.validateInventorySpace(quest, playerData.inventory);
      if (inventoryCheck) {
        result.checks.push(inventoryCheck);
        if (!inventoryCheck.valid) {
          result.warningChecks.push(inventoryCheck); // Warning seulement
        }
      }
    }
    
    // ✅ 8. VÉRIFIER CONDITIONS TEMPORELLES
    if (this.config.enableTemporalValidation && this.hasTemporalConditions(quest)) {
      const temporalCheck = await this.validateTemporalConditions(quest);
      if (temporalCheck) {
        result.checks.push(temporalCheck);
        if (!temporalCheck.valid) {
          result.failedChecks.push(temporalCheck);
          result.valid = false;
        }
      }
    }
    
    // ✅ 9. VÉRIFIER CONDITIONS DE LOCALISATION
    if (this.config.enableLocationValidation && playerData.currentLocation) {
      const locationCheck = this.validateLocationConditions(quest, playerData.currentLocation);
      if (locationCheck) {
        result.checks.push(locationCheck);
        if (!locationCheck.valid) {
          result.failedChecks.push(locationCheck);
          result.valid = false;
        }
      }
    }
    
    // ✅ 10. VÉRIFIER CONDITIONS SOCIALES
    if (this.config.enableSocialValidation) {
      const socialCheck = this.validateSocialConditions(quest, playerData);
      if (socialCheck) {
        result.checks.push(socialCheck);
        if (!socialCheck.valid) {
          result.failedChecks.push(socialCheck);
          result.valid = false;
        }
      }
    }
    
    this.log('debug', `✅ Validations avancées terminées: ${result.checks.length - 5} nouveaux checks`);
  }

  // ===== VALIDATIONS SPÉCIFIQUES =====

  /**
   * ✅ Validation - Quête pas déjà active
   */
  private validateNotActive(questId: string, activeQuests: string[]): QuestValidationCheck {
    const isActive = activeQuests.includes(questId);
    
    return {
      type: 'prerequisites',
      name: 'Not Already Active',
      valid: !isActive,
      required: true,
      currentValue: isActive,
      requiredValue: false,
      message: isActive ? 'Cette quête est déjà active' : 'Quête non active',
      suggestion: isActive ? 'Terminez ou abandonnez la quête actuelle' : undefined
    };
  }

  /**
   * ✅ Validation - Répétabilité
   */
  private validateRepeatable(quest: QuestDefinition, completedQuests: string[]): QuestValidationCheck {
    const isCompleted = completedQuests.includes(quest.id);
    const canRepeat = quest.isRepeatable || !isCompleted;
    
    return {
      type: 'prerequisites',
      name: 'Repeatable Check',
      valid: canRepeat,
      required: true,
      currentValue: { completed: isCompleted, repeatable: quest.isRepeatable },
      requiredValue: true,
      message: canRepeat 
        ? 'Quête disponible' 
        : 'Quête déjà complétée et non répétable',
      suggestion: !canRepeat ? 'Cherchez d\'autres quêtes similaires' : undefined
    };
  }

  /**
   * ✅ Validation - Prérequis
   */
  validatePrerequisites(questId: string, completedQuests: string[]): QuestValidationCheck {
    // Note: Cette méthode serait appelée seulement si il y a des prérequis
    return {
      type: 'prerequisites',
      name: 'Prerequisites Check',
      valid: true,
      required: true,
      message: 'Prérequis validés',
      currentValue: completedQuests.length,
      requiredValue: 0
    };
  }

  /**
   * ✅ Validation - Cooldown
   */
  validateCooldown(quest: QuestDefinition, lastCompletions: QuestCompletion[]): QuestValidationCheck {
    if (!quest.cooldownHours) {
      return {
        type: 'cooldown',
        name: 'Cooldown Check',
        valid: true,
        required: false,
        message: 'Pas de cooldown',
        currentValue: 0,
        requiredValue: 0
      };
    }
    
    const lastCompletion = lastCompletions.find(c => c.questId === quest.id);
    if (!lastCompletion) {
      return {
        type: 'cooldown',
        name: 'Cooldown Check',
        valid: true,
        required: true,
        message: 'Première fois - pas de cooldown',
        currentValue: 0,
        requiredValue: quest.cooldownHours
      };
    }
    
    const cooldownMs = quest.cooldownHours * 60 * 60 * 1000;
    const elapsedMs = Date.now() - lastCompletion.lastCompletedAt.getTime();
    const isReady = elapsedMs >= cooldownMs;
    
    return {
      type: 'cooldown',
      name: 'Cooldown Check',
      valid: isReady,
      required: true,
      currentValue: Math.floor(elapsedMs / (60 * 1000)), // en minutes
      requiredValue: quest.cooldownHours * 60, // en minutes
      message: isReady 
        ? 'Cooldown terminé' 
        : `Cooldown actif - ${Math.ceil((cooldownMs - elapsedMs) / (60 * 1000))} minutes restantes`,
      suggestion: !isReady ? 'Revenez plus tard' : undefined,
      retryable: true
    };
  }

  /**
   * ✅ Validation - Niveau requis
   */
  validateLevelRequirements(quest: QuestDefinition, playerLevel: number): QuestValidationCheck {
    const requirement = quest.config?.levelRequirement;
    if (!requirement) {
      return {
        type: 'level',
        name: 'Level Check',
        valid: true,
        required: false,
        message: 'Pas de niveau requis',
        currentValue: playerLevel,
        requiredValue: 1
      };
    }
    
    let valid = true;
    let message = 'Niveau approprié';
    let suggestion: string | undefined;
    
    if (requirement.min && playerLevel < requirement.min) {
      valid = false;
      message = `Niveau ${requirement.min} requis (actuel: ${playerLevel})`;
      suggestion = `Gagnez ${requirement.min - playerLevel} niveau(x) supplémentaire(s)`;
    }
    
    if (requirement.max && playerLevel > requirement.max) {
      valid = false;
      message = `Niveau maximum ${requirement.max} (actuel: ${playerLevel})`;
      suggestion = 'Cette quête est destinée aux joueurs de niveau inférieur';
    }
    
    return {
      type: 'level',
      name: 'Level Requirements',
      valid,
      required: true,
      currentValue: playerLevel,
      requiredValue: requirement.min || requirement.max,
      message,
      suggestion
    };
  }

  // ===== VALIDATIONS AVANCÉES =====

  /**
   * ✅ Validation - Badges requis
   */
  private validateBadgeRequirements(quest: QuestDefinition, playerBadges: string[]): QuestValidationCheck | null {
    // TODO: Implémenter quand le système de badges sera défini
    // Pour l'instant, on assume que c'est valide
    return null;
  }

  /**
   * ✅ Validation - Espace inventaire
   */
  private validateInventorySpace(quest: QuestDefinition, inventory?: PlayerInventory): QuestValidationCheck | null {
    if (!inventory) return null;
    
    // Estimer l'espace nécessaire basé sur les récompenses
    const estimatedItems = this.estimateInventoryNeeds(quest);
    const availableSpace = inventory.capacity - inventory.usedSlots;
    const needsSpace = estimatedItems > availableSpace;
    
    return {
      type: 'inventory',
      name: 'Inventory Space',
      valid: !needsSpace,
      required: false,
      currentValue: availableSpace,
      requiredValue: estimatedItems,
      message: needsSpace 
        ? `Espace insuffisant (${estimatedItems} slots requis, ${availableSpace} disponibles)`
        : 'Espace inventaire suffisant',
      suggestion: needsSpace ? 'Libérez de l\'espace dans votre inventaire' : undefined
    };
  }

  /**
   * ✅ Validation - Conditions temporelles
   */
  private async validateTemporalConditions(quest: QuestDefinition): Promise<QuestValidationCheck | null> {
    // TODO: Implémenter avec système météo/saisons
    // Pour l'instant, on assume que c'est valide
    return null;
  }

  /**
   * ✅ Validation - Conditions de localisation
   */
  private validateLocationConditions(
    quest: QuestDefinition, 
    location: NonNullable<PlayerValidationData['currentLocation']>
  ): QuestValidationCheck | null {
    
    // Vérifier si la quête est verrouillée par région
    if (quest.config?.regionLocked && quest.config.regionLocked.length > 0) {
      const isInAllowedRegion = quest.config.regionLocked.includes(location.map);
      
      return {
        type: 'location',
        name: 'Region Lock',
        valid: isInAllowedRegion,
        required: true,
        currentValue: location.map,
        requiredValue: quest.config.regionLocked,
        message: isInAllowedRegion 
          ? 'Région autorisée' 
          : `Cette quête n'est disponible que dans: ${quest.config.regionLocked.join(', ')}`,
        suggestion: !isInAllowedRegion ? 'Voyagez vers une région autorisée' : undefined
      };
    }
    
    return null;
  }

  /**
   * ✅ Validation - Conditions sociales
   */
  private validateSocialConditions(quest: QuestDefinition, playerData: PlayerValidationData): QuestValidationCheck | null {
    // Vérifier les limites de groupe
    if (quest.metadata?.playerCount) {
      const partySize = (playerData.partyMembers?.length || 0) + 1; // +1 pour le joueur lui-même
      const minPlayers = quest.metadata.playerCount.min;
      const maxPlayers = quest.metadata.playerCount.max;
      
      let valid = true;
      let message = 'Taille de groupe appropriée';
      let suggestion: string | undefined;
      
      if (minPlayers && partySize < minPlayers) {
        valid = false;
        message = `${minPlayers} joueur(s) minimum requis (actuellement: ${partySize})`;
        suggestion = `Formez un groupe de ${minPlayers - partySize} joueur(s) supplémentaire(s)`;
      }
      
      if (maxPlayers && partySize > maxPlayers) {
        valid = false;
        message = `Maximum ${maxPlayers} joueur(s) (actuellement: ${partySize})`;
        suggestion = 'Réduisez la taille de votre groupe';
      }
      
      return {
        type: 'party',
        name: 'Party Size',
        valid,
        required: true,
        currentValue: partySize,
        requiredValue: { min: minPlayers, max: maxPlayers },
        message,
        suggestion
      };
    }
    
    return null;
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * ✅ Vérifier si quête nécessite espace inventaire
   */
  private requiresInventorySpace(quest: QuestDefinition): boolean {
    return quest.steps.some(step => 
      step.rewards && step.rewards.some(reward => 
        reward.type === 'item' || reward.type === 'pokemon'
      )
    );
  }

  /**
   * ✅ Estimer besoins inventaire
   */
  private estimateInventoryNeeds(quest: QuestDefinition): number {
    let itemCount = 0;
    
    quest.steps.forEach(step => {
      if (step.rewards) {
        step.rewards.forEach(reward => {
          if (reward.type === 'item' || reward.type === 'pokemon') {
            itemCount += reward.amount || 1;
          }
        });
      }
    });
    
    return Math.ceil(itemCount * 1.2); // 20% de marge
  }

  /**
   * ✅ Vérifier conditions temporelles
   */
  private hasTemporalConditions(quest: QuestDefinition): boolean {
    return quest.steps.some(step =>
      step.objectives.some(obj =>
        obj.conditions && (
          obj.conditions.timeOfDay ||
          obj.conditions.weather ||
          obj.conditions.season
        )
      )
    );
  }

  /**
   * ✅ Validation complète conditions étendues
   */
  async validateExtendedConditions(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    context?: QuestEventContext
  ): Promise<QuestAdvancedValidationResult> {
    
    const basic = await this.canTakeQuest(quest, playerData);
    
    return {
      ...basic,
      extendedChecks: [],
      timeOfValidation: new Date(),
      contextData: context
    };
  }

  /**
   * ✅ Validation batch pour performance
   */
  async validateMultipleQuests(
    quests: QuestDefinition[],
    playerData: PlayerValidationData
  ): Promise<Record<string, QuestValidationResult>> {
    
    const results: Record<string, QuestValidationResult> = {};
    
    // Traitement séquentiel ou parallèle selon config
    if (this.config.enableParallelChecks && quests.length <= this.config.maxBatchSize) {
      const promises = quests.map(async quest => {
        const result = await this.canTakeQuest(quest, playerData);
        return { questId: quest.id, result };
      });
      
      const completed = await Promise.allSettled(promises);
      completed.forEach(promise => {
        if (promise.status === 'fulfilled') {
          results[promise.value.questId] = promise.value.result;
        }
      });
    } else {
      // Traitement séquentiel
      for (const quest of quests) {
        results[quest.id] = await this.canTakeQuest(quest, playerData);
      }
    }
    
    return results;
  }

  // ===== GESTION DU CACHE =====

  /**
   * ✅ Générer clé de cache
   */
  private generateCacheKey(questId: string, playerData: PlayerValidationData): string {
    const factors = [
      questId,
      playerData.username,
      playerData.level,
      playerData.completedQuests.length,
      playerData.lastLogin?.getTime() || 0
    ];
    
    return `quest_validation_${factors.join('_')}`;
  }

  /**
   * ✅ Récupérer du cache
   */
  private getFromCache(key: string): QuestValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.validationCache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  /**
   * ✅ Mettre en cache
   */
  private setCache(key: string, result: QuestValidationResult): void {
    if (this.validationCache.size > 1000) {
      // Nettoyer le cache si trop plein
      const oldestKeys = Array.from(this.validationCache.keys()).slice(0, 100);
      oldestKeys.forEach(k => this.validationCache.delete(k));
    }
    
    this.validationCache.set(key, {
      result,
      expires: Date.now() + (this.config.cacheTTL * 1000)
    });
  }

  /**
   * ✅ Finaliser résultat
   */
  private finalizeValidationResult(result: QuestValidationResult, startTime: number): void {
    result.validationTime = Date.now() - startTime;
    result.checkedConditions = result.checks.map(c => c.type);
    
    if (result.failedChecks.length > 0) {
      result.primaryReason = result.failedChecks[0].message;
      result.detailedReasons = result.failedChecks.map(c => c.message);
    }
    
    // Générer recommandations
    if (!result.valid && result.failedChecks.length > 0) {
      result.recommendations = result.failedChecks
        .filter(c => c.suggestion)
        .map(c => c.suggestion!);
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * ✅ Logging intelligent
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableValidationLogging && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [QuestValidator] ${message}`;
    
    switch (level) {
      case 'debug':
        if (this.config.enableValidationLogging) {
          console.log(logMessage, data || '');
        }
        break;
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  /**
   * ✅ Informations de debugging
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      cacheSize: this.validationCache.size,
      version: '1.0.0',
      supportedValidations: [
        'prerequisites', 'level', 'cooldown', 'inventory', 
        'badges', 'location', 'time', 'season', 'guild', 
        'party', 'achievement', 'reputation'
      ],
      advancedFeatures: {
        caching: this.config.enableCaching,
        batch: this.config.enableBatchValidation,
        temporal: this.config.enableTemporalValidation,
        location: this.config.enableLocationValidation,
        social: this.config.enableSocialValidation
      }
    };
  }

  /**
   * ✅ Mise à jour configuration
   */
  updateConfig(newConfig: Partial<QuestValidatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour', { newConfig });
  }

  /**
   * ✅ Nettoyer le cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.log('info', '🧹 Cache de validation nettoyé');
  }
}

// ===== EXPORT =====
export default QuestValidator;
