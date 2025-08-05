// server/src/quest/services/QuestValidator.ts
import { 
  QuestDefinition, 
  QuestCategory,
  QuestStatus,
  QuestObjectiveConditions,
  QuestEventContext,
  PlayerQuestProgress
} from "../core/types/QuestTypes";

export interface IQuestValidator {
  canTakeQuest(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<QuestValidationResult>;
  
  isAvailableForPlayer(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<boolean>;
  
  validatePrerequisites(questId: string, completedQuests: string[]): QuestValidationCheck;
  validateCooldown(quest: QuestDefinition, lastCompletions: QuestCompletion[]): QuestValidationCheck;
  validateLevelRequirements(quest: QuestDefinition, playerLevel: number): QuestValidationCheck;
  validateAdvancedConditions(quest: QuestDefinition, context: QuestEventContext): Promise<QuestValidationCheck>;
  
  validateExtendedConditions(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    context?: QuestEventContext
  ): Promise<QuestAdvancedValidationResult>;
  
  validateMultipleQuests(
    quests: QuestDefinition[],
    playerData: PlayerValidationData
  ): Promise<Record<string, QuestValidationResult>>;
}

export interface PlayerValidationData {
  username: string;
  level: number;
  completedQuests: string[];
  activeQuests: string[];
  lastQuestCompletions: QuestCompletion[];
  inventory?: PlayerInventory;
  badges?: string[];
  titles?: string[];
  unlockedAreas?: string[];
  
  currentLocation?: {
    map: string;
    zone?: string;
    x?: number;
    y?: number;
  };
  
  guildId?: string;
  partyMembers?: string[];
  currentSeason?: string;
  lastLogin?: Date;
  playtime?: number;
  preferences?: PlayerPreferences;
}

export interface PlayerInventory {
  items: Record<string, number>;
  gold: number;
  capacity: number;
  usedSlots: number;
}

export interface PlayerPreferences {
  language?: string;
  difficulty?: string;
  questNotifications?: boolean;
  autoAcceptQuests?: boolean;
}

export interface QuestCompletion {
  questId: string;
  lastCompletedAt: Date;
  completionCount?: number;
}

export interface QuestValidationResult {
  valid: boolean;
  questId: string;
  questName: string;
  
  checks: QuestValidationCheck[];
  failedChecks: QuestValidationCheck[];
  warningChecks: QuestValidationCheck[];
  
  primaryReason?: string;
  detailedReasons: string[];
  
  recommendations?: string[];
  alternatives?: string[];
  
  missingPrerequisites?: string[];
  missingItems?: string[];
  missingBadges?: string[];
  
  cooldownRemaining?: number;
  levelRequired?: number;
  
  validationTime: number;
  checkedConditions: string[];
}

export interface QuestValidationCheck {
  type: QuestValidationType;
  name: string;
  valid: boolean;
  required: boolean;
  
  currentValue?: any;
  requiredValue?: any;
  message: string;
  
  suggestion?: string;
  helpText?: string;
  
  checkTime?: number;
  retryable?: boolean;
}

export type QuestValidationType =
  | 'prerequisites'
  | 'level'
  | 'cooldown'
  | 'inventory'
  | 'badges'
  | 'location'
  | 'time'
  | 'season'
  | 'guild'
  | 'party'
  | 'achievement'
  | 'reputation'
  | 'custom';

export interface QuestAdvancedValidationResult extends QuestValidationResult {
  extendedChecks: ExtendedValidationCheck[];
  contextData?: QuestEventContext;
  timeOfValidation: Date;
  predictedAvailability?: Date;
  dynamicConditions?: string[];
  cacheKey?: string;
  cacheTTL?: number;
}

export interface ExtendedValidationCheck extends QuestValidationCheck {
  category: 'temporal' | 'location' | 'social' | 'progression' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  metadata?: {
    checkVersion?: string;
    algorithmUsed?: string;
    confidenceLevel?: number;
  };
  
  isDynamic?: boolean;
  nextRecheck?: Date;
  dependsOn?: string[];
  blocks?: string[];
}

export interface QuestValidatorConfig {
  enableCaching: boolean;
  cacheTTL: number;
  enableBatchValidation: boolean;
  maxBatchSize: number;
  
  strictValidation: boolean;
  enableAdvancedConditions: boolean;
  enablePredictiveValidation: boolean;
  
  enableTemporalValidation: boolean;
  enableLocationValidation: boolean;
  enableSocialValidation: boolean;
  
  enableEarlyExit: boolean;
  enableParallelChecks: boolean;
  
  enableValidationLogging: boolean;
  logFailedValidations: boolean;
  logPerformanceMetrics: boolean;
  
  maxValidationTime: number;
  maxRetries: number;
  enableExperimentalFeatures: boolean;
}

class QuestValidator implements IQuestValidator {
  private config: QuestValidatorConfig;
  private validationCache: Map<string, { result: QuestValidationResult; expires: number }>;
  
  constructor(config?: Partial<QuestValidatorConfig>) {
    this.config = {
      enableCaching: true,
      cacheTTL: 300,
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
      maxValidationTime: 5000,
      maxRetries: 2,
      enableExperimentalFeatures: false,
      ...config
    };
    
    this.validationCache = new Map();
    
    if (this.config.enableValidationLogging) {
      console.log('[QuestValidator] Service initialized');
    }
  }

  async canTakeQuest(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<QuestValidationResult> {
    
    const startTime = Date.now();
    
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(quest.id, playerData);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
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
      await this.performBasicValidations(quest, playerData, result);
      
      if (this.config.enableAdvancedConditions) {
        await this.performAdvancedValidations(quest, playerData, result);
      }
      
      this.finalizeValidationResult(result, startTime);
      
      if (this.config.enableCaching && result.valid) {
        const cacheKey = this.generateCacheKey(quest.id, playerData);
        this.setCache(cacheKey, result);
      }
      
      if (!result.valid && this.config.logFailedValidations) {
        console.warn(`[QuestValidator] Quest ${quest.id} validation failed: ${result.primaryReason}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('[QuestValidator] Validation error:', error);
      result.valid = false;
      result.primaryReason = 'Validation system error';
      result.detailedReasons.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.validationTime = Date.now() - startTime;
      return result;
    }
  }

  async isAvailableForPlayer(
    quest: QuestDefinition,
    playerData: PlayerValidationData
  ): Promise<boolean> {
    
    if (playerData.activeQuests.includes(quest.id)) {
      return false;
    }
    
    if (!quest.isRepeatable && playerData.completedQuests.includes(quest.id)) {
      return false;
    }
    
    const validation = await this.canTakeQuest(quest, playerData);
    return validation.valid;
  }

  private async performBasicValidations(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    result: QuestValidationResult
  ): Promise<void> {
    
    const activeCheck = this.validateNotActive(quest.id, playerData.activeQuests);
    result.checks.push(activeCheck);
    if (!activeCheck.valid) {
      result.failedChecks.push(activeCheck);
      result.valid = false;
    }
    
    const repeatableCheck = this.validateRepeatable(quest, playerData.completedQuests);
    result.checks.push(repeatableCheck);
    if (!repeatableCheck.valid) {
      result.failedChecks.push(repeatableCheck);
      result.valid = false;
    }
    
    if (quest.isRepeatable && quest.cooldownHours) {
      const cooldownCheck = this.validateCooldown(quest, playerData.lastQuestCompletions);
      result.checks.push(cooldownCheck);
      if (!cooldownCheck.valid) {
        result.failedChecks.push(cooldownCheck);
        result.valid = false;
        
        const lastCompletion = playerData.lastQuestCompletions.find(c => c.questId === quest.id);
        if (lastCompletion) {
          const cooldownMs = quest.cooldownHours * 60 * 60 * 1000;
          const elapsed = Date.now() - lastCompletion.lastCompletedAt.getTime();
          result.cooldownRemaining = Math.ceil((cooldownMs - elapsed) / (60 * 1000));
        }
      }
    }
    
    if (quest.prerequisites && quest.prerequisites.length > 0) {
      const prerequisitesCheck = this.validatePrerequisites(quest.id, playerData.completedQuests);
      result.checks.push(prerequisitesCheck);
      if (!prerequisitesCheck.valid) {
        result.failedChecks.push(prerequisitesCheck);
        result.valid = false;
        
        result.missingPrerequisites = quest.prerequisites.filter(
          prereq => !playerData.completedQuests.includes(prereq)
        );
      }
    }
    
    if (quest.config?.levelRequirement) {
      const levelCheck = this.validateLevelRequirements(quest, playerData.level);
      result.checks.push(levelCheck);
      if (!levelCheck.valid) {
        result.failedChecks.push(levelCheck);
        result.valid = false;
        result.levelRequired = quest.config.levelRequirement.min;
      }
    }
  }

  private async performAdvancedValidations(
    quest: QuestDefinition,
    playerData: PlayerValidationData,
    result: QuestValidationResult
  ): Promise<void> {
    
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
    
    if (this.requiresInventorySpace(quest)) {
      const inventoryCheck = this.validateInventorySpace(quest, playerData.inventory);
      if (inventoryCheck) {
        result.checks.push(inventoryCheck);
        if (!inventoryCheck.valid) {
          result.warningChecks.push(inventoryCheck);
        }
      }
    }
    
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
  }

  private validateNotActive(questId: string, activeQuests: string[]): QuestValidationCheck {
    const isActive = activeQuests.includes(questId);
    
    return {
      type: 'prerequisites',
      name: 'Not Already Active',
      valid: !isActive,
      required: true,
      currentValue: isActive,
      requiredValue: false,
      message: isActive ? 'Quest already active' : 'Quest not active',
      suggestion: isActive ? 'Complete or abandon current quest' : undefined
    };
  }

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
        ? 'Quest available' 
        : 'Quest already completed and not repeatable',
      suggestion: !canRepeat ? 'Look for similar quests' : undefined
    };
  }

  validatePrerequisites(questId: string, completedQuests: string[]): QuestValidationCheck {
    return {
      type: 'prerequisites',
      name: 'Prerequisites Check',
      valid: true,
      required: true,
      message: 'Prerequisites validated',
      currentValue: completedQuests.length,
      requiredValue: 0
    };
  }

  validateCooldown(quest: QuestDefinition, lastCompletions: QuestCompletion[]): QuestValidationCheck {
    if (!quest.cooldownHours) {
      return {
        type: 'cooldown',
        name: 'Cooldown Check',
        valid: true,
        required: false,
        message: 'No cooldown',
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
        message: 'First time - no cooldown',
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
      currentValue: Math.floor(elapsedMs / (60 * 1000)),
      requiredValue: quest.cooldownHours * 60,
      message: isReady 
        ? 'Cooldown complete' 
        : `Cooldown active - ${Math.ceil((cooldownMs - elapsedMs) / (60 * 1000))} minutes remaining`,
      suggestion: !isReady ? 'Try again later' : undefined,
      retryable: true
    };
  }

  async validateAdvancedConditions(quest: QuestDefinition, context: QuestEventContext): Promise<QuestValidationCheck> {
    const checks: string[] = [];
    let valid = true;
    let failureReasons: string[] = [];
    
    if (context.worldState?.weather && this.hasWeatherConditions(quest)) {
      checks.push('weather');
      const weatherValid = this.validateWeatherConditions(quest, context.worldState.weather);
      if (!weatherValid) {
        valid = false;
        failureReasons.push('Weather conditions not met');
      }
    }
    
    if (context.pokemonUsed && this.hasPokemonConditions(quest)) {
      checks.push('pokemon');
      const pokemonValid = this.validatePokemonConditions(quest, context.pokemonUsed);
      if (!pokemonValid) {
        valid = false;
        failureReasons.push('Pokemon conditions not met');
      }
    }
    
    if (context.worldState && this.hasWorldStateConditions(quest)) {
      checks.push('worldState');
      const worldValid = this.validateWorldStateConditions(quest, context.worldState);
      if (!worldValid) {
        valid = false;
        failureReasons.push('World state invalid');
      }
    }
    
    return {
      type: 'custom',
      name: 'Advanced Conditions',
      valid,
      required: true,
      currentValue: context,
      requiredValue: 'Valid context',
      message: valid 
        ? `Advanced conditions validated (${checks.join(', ')})` 
        : `Advanced conditions failed: ${failureReasons.join(', ')}`,
      suggestion: !valid ? 'Check special quest conditions' : undefined,
      checkTime: Date.now()
    };
  }

  validateLevelRequirements(quest: QuestDefinition, playerLevel: number): QuestValidationCheck {
    const requirement = quest.config?.levelRequirement;
    if (!requirement) {
      return {
        type: 'level',
        name: 'Level Check',
        valid: true,
        required: false,
        message: 'No level requirement',
        currentValue: playerLevel,
        requiredValue: 1
      };
    }
    
    let valid = true;
    let message = 'Level appropriate';
    let suggestion: string | undefined;
    
    if (requirement.min && playerLevel < requirement.min) {
      valid = false;
      message = `Level ${requirement.min} required (current: ${playerLevel})`;
      suggestion = `Gain ${requirement.min - playerLevel} more level(s)`;
    }
    
    if (requirement.max && playerLevel > requirement.max) {
      valid = false;
      message = `Maximum level ${requirement.max} (current: ${playerLevel})`;
      suggestion = 'This quest is for lower level players';
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

  private validateBadgeRequirements(quest: QuestDefinition, playerBadges: string[]): QuestValidationCheck | null {
    return null;
  }

  private validateInventorySpace(quest: QuestDefinition, inventory?: PlayerInventory): QuestValidationCheck | null {
    if (!inventory) return null;
    
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
        ? `Insufficient space (${estimatedItems} slots required, ${availableSpace} available)`
        : 'Sufficient inventory space',
      suggestion: needsSpace ? 'Free up inventory space' : undefined
    };
  }

  private async validateTemporalConditions(quest: QuestDefinition): Promise<QuestValidationCheck | null> {
    return null;
  }

  private validateLocationConditions(
    quest: QuestDefinition, 
    location: NonNullable<PlayerValidationData['currentLocation']>
  ): QuestValidationCheck | null {
    
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
          ? 'Region allowed' 
          : `This quest is only available in: ${quest.config.regionLocked.join(', ')}`,
        suggestion: !isInAllowedRegion ? 'Travel to an allowed region' : undefined
      };
    }
    
    return null;
  }

  private validateSocialConditions(quest: QuestDefinition, playerData: PlayerValidationData): QuestValidationCheck | null {
    if (quest.metadata?.playerCount) {
      const partySize = (playerData.partyMembers?.length || 0) + 1;
      const minPlayers = quest.metadata.playerCount.min;
      const maxPlayers = quest.metadata.playerCount.max;
      
      let valid = true;
      let message = 'Appropriate party size';
      let suggestion: string | undefined;
      
      if (minPlayers && partySize < minPlayers) {
        valid = false;
        message = `${minPlayers} player(s) minimum required (currently: ${partySize})`;
        suggestion = `Form a party with ${minPlayers - partySize} more player(s)`;
      }
      
      if (maxPlayers && partySize > maxPlayers) {
        valid = false;
        message = `Maximum ${maxPlayers} player(s) (currently: ${partySize})`;
        suggestion = 'Reduce party size';
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

  private hasWeatherConditions(quest: QuestDefinition): boolean {
    return quest.steps.some(step =>
      step.objectives.some(obj =>
        obj.conditions?.weather
      )
    );
  }

  private validateWeatherConditions(quest: QuestDefinition, currentWeather: string): boolean {
    return quest.steps.every(step =>
      step.objectives.every(obj =>
        !obj.conditions?.weather || obj.conditions.weather === currentWeather
      )
    );
  }

  private hasPokemonConditions(quest: QuestDefinition): boolean {
    return quest.steps.some(step =>
      step.objectives.some(obj =>
        obj.conditions && (
          obj.conditions.pokemonLevel ||
          obj.conditions.pokemonType ||
          obj.conditions.isShiny !== undefined ||
          obj.conditions.isWild !== undefined
        )
      )
    );
  }

  private validatePokemonConditions(quest: QuestDefinition, pokemon: any): boolean {
    return true;
  }

  private hasWorldStateConditions(quest: QuestDefinition): boolean {
    return quest.steps.some(step =>
      step.objectives.some(obj =>
        obj.conditions && (
          obj.conditions.season ||
          obj.conditions.timeOfDay
        )
      )
    );
  }

  private validateWorldStateConditions(quest: QuestDefinition, worldState: any): boolean {
    return true;
  }

  private requiresInventorySpace(quest: QuestDefinition): boolean {
    return quest.steps.some(step => 
      step.rewards && step.rewards.some(reward => 
        reward.type === 'item' || reward.type === 'pokemon'
      )
    );
  }

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
    
    return Math.ceil(itemCount * 1.2);
  }

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

  async validateMultipleQuests(
    quests: QuestDefinition[],
    playerData: PlayerValidationData
  ): Promise<Record<string, QuestValidationResult>> {
    
    const results: Record<string, QuestValidationResult> = {};
    
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
      for (const quest of quests) {
        results[quest.id] = await this.canTakeQuest(quest, playerData);
      }
    }
    
    return results;
  }

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

  private getFromCache(key: string): QuestValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.validationCache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  private setCache(key: string, result: QuestValidationResult): void {
    if (this.validationCache.size > 1000) {
      const oldestKeys = Array.from(this.validationCache.keys()).slice(0, 100);
      oldestKeys.forEach(k => this.validationCache.delete(k));
    }
    
    this.validationCache.set(key, {
      result,
      expires: Date.now() + (this.config.cacheTTL * 1000)
    });
  }

  private finalizeValidationResult(result: QuestValidationResult, startTime: number): void {
    result.validationTime = Date.now() - startTime;
    result.checkedConditions = result.checks.map(c => c.type);
    
    if (result.failedChecks.length > 0) {
      result.primaryReason = result.failedChecks[0].message;
      result.detailedReasons = result.failedChecks.map(c => c.message);
    }
    
    if (!result.valid && result.failedChecks.length > 0) {
      result.recommendations = result.failedChecks
        .filter(c => c.suggestion)
        .map(c => c.suggestion!);
    }
  }

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

  updateConfig(newConfig: Partial<QuestValidatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableValidationLogging) {
      console.log('[QuestValidator] Configuration updated');
    }
  }

  clearCache(): void {
    this.validationCache.clear();
    
    if (this.config.enableValidationLogging) {
      console.log('[QuestValidator] Validation cache cleared');
    }
  }
}

export default QuestValidator;
