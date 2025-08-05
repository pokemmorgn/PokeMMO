// server/src/quest/services/RewardDistributor.ts
import { 
  QuestDefinition, 
  QuestReward,
  QuestRewardType,
  RewardRarity
} from "../core/types/QuestTypes";

import { 
  ExtendedQuestReward,
  RewardDistributionRequest,
  RewardDistributionResult,
  DistributedReward,
  RewardSource,
  RewardConditions
} from "../core/types/RewardTypes";

import { ServiceRegistry } from "../../services/ServiceRegistry";

export interface IRewardDistributor {
  distributeRewards(username: string, rewards: QuestReward[]): Promise<RewardDistributionResult>;
  distributeSingleReward(username: string, reward: QuestReward): Promise<boolean>;
  
  distributeExtendedRewards(request: RewardDistributionRequest): Promise<RewardDistributionResult>;
  
  calculateFinalQuestRewards(definition: QuestDefinition): QuestReward[];
  calculateStepRewards(definition: QuestDefinition, stepIndex: number): QuestReward[];
  
  validateRewardConditions(username: string, reward: ExtendedQuestReward): Promise<boolean>;
  canReceiveReward(username: string, reward: QuestReward): Promise<RewardValidationResult>;
  
  retryFailedDistribution(distributionId: string): Promise<RewardDistributionResult>;
  getFailedDistributions(username?: string): Promise<FailedRewardDistribution[]>;
  
  getDistributionStats(username?: string): Promise<RewardDistributionStats>;
}

export interface RewardValidationResult {
  valid: boolean;
  reason?: string;
  missingRequirements?: string[];
  alternativeRewards?: QuestReward[];
  canRetryLater?: boolean;
}

export interface FailedRewardDistribution {
  id: string;
  username: string;
  reward: QuestReward;
  error: string;
  failedAt: Date;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  nextRetryAt?: Date;
}

export interface RewardDistributionStats {
  totalDistributions: number;
  successfulDistributions: number;
  failedDistributions: number;
  retryDistributions: number;
  
  byType: Record<QuestRewardType, {
    count: number;
    totalValue: number;
    successRate: number;
  }>;
  
  byRarity: Record<RewardRarity, {
    count: number;
    successRate: number;
  }>;
  
  averageDistributionTime: number;
  slowestDistributions: Array<{
    reward: string;
    time: number;
    date: Date;
  }>;
  
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

export interface RewardDistributorConfig {
  enableBatchDistribution: boolean;
  maxBatchSize: number;
  distributionTimeout: number;
  
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  
  strictValidation: boolean;
  validateBeforeDistribution: boolean;
  enableConditionChecks: boolean;
  
  enableCaching: boolean;
  enableParallelDistribution: boolean;
  maxConcurrentDistributions: number;
  
  serviceRegistryTimeout: number;
  fallbackOnServiceFailure: boolean;
  
  enableDistributionLogging: boolean;
  logFailures: boolean;
  logPerformanceMetrics: boolean;
  
  enableInflationProtection: boolean;
  maxGoldPerDistribution: number;
  enableValueCaps: boolean;
  
  enableExperimentalTypes: boolean;
  enableTemporaryRewards: boolean;
}

class RewardDistributor implements IRewardDistributor {
  private config: RewardDistributorConfig;
  private serviceRegistry: ServiceRegistry;
  private failedDistributions: Map<string, FailedRewardDistribution>;
  private distributionStats: Map<string, RewardDistributionStats>;
  
  constructor(config?: Partial<RewardDistributorConfig>) {
    this.config = {
      enableBatchDistribution: true,
      maxBatchSize: 10,
      distributionTimeout: 10000,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      strictValidation: true,
      validateBeforeDistribution: true,
      enableConditionChecks: true,
      enableCaching: false,
      enableParallelDistribution: false,
      maxConcurrentDistributions: 5,
      serviceRegistryTimeout: 5000,
      fallbackOnServiceFailure: false,
      enableDistributionLogging: process.env.NODE_ENV === 'development',
      logFailures: true,
      logPerformanceMetrics: false,
      enableInflationProtection: true,
      maxGoldPerDistribution: 1000000,
      enableValueCaps: true,
      enableExperimentalTypes: false,
      enableTemporaryRewards: true,
      ...config
    };
    
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.failedDistributions = new Map();
    this.distributionStats = new Map();
    
    if (this.config.enableDistributionLogging) {
      console.log('[RewardDistributor] Service initialized');
    }
  }

  async distributeRewards(username: string, rewards: QuestReward[]): Promise<RewardDistributionResult> {
    const startTime = Date.now();
    const distributionId = this.generateDistributionId();

    const result: RewardDistributionResult = {
      success: true,
      requestId: distributionId,
      playerId: username,
      distributedRewards: [],
      failedRewards: [],
      totalRewards: rewards.length,
      totalValue: 0,
      distributionTime: 0,
      notifications: false
    };

    try {
      if (this.config.validateBeforeDistribution) {
        const validationResults = await this.validateAllRewards(username, rewards);
        const invalidRewards = validationResults.filter(v => !v.valid);
        
        if (invalidRewards.length > 0 && this.config.strictValidation) {
          result.success = false;
          result.errors = invalidRewards.map(v => `${v.reward.type}: ${v.reason}`);
          return result;
        }
      }

      if (this.config.enableBatchDistribution && rewards.length <= this.config.maxBatchSize) {
        await this.distributeBatch(username, rewards, result);
      } else {
        await this.distributeSequential(username, rewards, result);
      }

      result.totalValue = this.calculateTotalValue(result.distributedRewards);
      result.distributionTime = Date.now() - startTime;
      result.notifications = result.distributedRewards.length > 0;

      await this.recordDistributionStats(username, result);

      return result;

    } catch (error) {
      console.error('[RewardDistributor] Distribution error:', error);
      result.success = false;
      result.errors = [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`];
      result.distributionTime = Date.now() - startTime;
      return result;
    }
  }

  async distributeSingleReward(username: string, reward: QuestReward): Promise<boolean> {
    try {
      if (this.config.validateBeforeDistribution) {
        const validation = await this.canReceiveReward(username, reward);
        if (!validation.valid) {
          if (this.config.logFailures) {
            console.warn(`[RewardDistributor] Validation failed: ${validation.reason}`);
          }
          return false;
        }
      }

      const success = await this.distributeByType(username, reward);
      
      if (!success && this.config.logFailures) {
        console.warn(`[RewardDistributor] Distribution failed: ${reward.type} for ${username}`);
      }

      return success;

    } catch (error) {
      console.error('[RewardDistributor] Single reward distribution error:', error);
      return false;
    }
  }

  async distributeExtendedRewards(request: RewardDistributionRequest): Promise<RewardDistributionResult> {
    const simpleRewards: QuestReward[] = (request.rewards || []).map(this.convertToSimpleReward);
    const result = await this.distributeRewards(request.playerId, simpleRewards);

    if (request.notification && result.success) {
      const success = this.serviceRegistry.notifyPlayer(request.playerId, "rewardReceived", {
        rewards: result.distributedRewards,
        source: request.rewardSource.type,
        message: "New rewards received!"
      });
      
      result.notifications = success;
    }

    return result;
  }

  calculateFinalQuestRewards(definition: QuestDefinition): QuestReward[] {
    if (!definition.steps || definition.steps.length === 0) {
      return [];
    }

    const finalStep = definition.steps[definition.steps.length - 1];
    return finalStep.rewards || [];
  }

  calculateStepRewards(definition: QuestDefinition, stepIndex: number): QuestReward[] {
    if (!definition.steps || stepIndex >= definition.steps.length || stepIndex < 0) {
      return [];
    }

    const step = definition.steps[stepIndex];
    return step.rewards || [];
  }

  private async distributeByType(username: string, reward: QuestReward): Promise<boolean> {
    try {
      switch (reward.type) {
        case 'gold':
          return await this.distributeGold(username, reward.amount || 0);
        
        case 'item':
          return await this.distributeItem(username, reward.itemId || '', reward.amount || 1);
        
        case 'pokemon':
          return await this.distributePokemon(username, reward.pokemonId || 0);
        
        case 'experience':
          return await this.distributeExperience(username, reward.amount || 0);

        case 'badge':
          return await this.distributeBadge(username, reward.badgeId || '');
        
        case 'title':
          return await this.distributeTitle(username, reward.titleId || '');
        
        case 'access':
          return await this.distributeAccess(username, reward.accessId || '');
        
        case 'recipe':
          return await this.distributeRecipe(username, reward.recipeId || '');
        
        case 'move':
          return await this.distributeMove(username, reward.moveId || '');
        
        case 'unlock':
          return await this.distributeUnlock(username, reward.unlockId || '');
        
        case 'boost':
          return await this.distributeBoost(username, reward.boostId || '', reward.duration);
        
        case 'cosmetic':
          return await this.distributeCosmetic(username, reward.cosmeticId || '');

        default:
          console.warn(`[RewardDistributor] Unknown reward type: ${reward.type}`);
          return false;
      }
    } catch (error) {
      console.error(`[RewardDistributor] Distribution error for type ${reward.type}:`, error);
      return false;
    }
  }

  private async distributeGold(username: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;

    if (this.config.enableInflationProtection && amount > this.config.maxGoldPerDistribution) {
      amount = this.config.maxGoldPerDistribution;
    }

    try {
      return await this.serviceRegistry.distributeReward(username, { type: 'gold', amount });
    } catch (error) {
      console.error('[RewardDistributor] Gold distribution error:', error);
      return false;
    }
  }

  private async distributeItem(username: string, itemId: string, amount: number): Promise<boolean> {
    if (!itemId || amount <= 0) return false;

    try {
      return await this.serviceRegistry.distributeReward(username, { 
        type: 'item', 
        itemId, 
        amount 
      });
    } catch (error) {
      console.error('[RewardDistributor] Item distribution error:', error);
      return false;
    }
  }

  private async distributePokemon(username: string, pokemonId: number): Promise<boolean> {
    if (pokemonId <= 0) return false;

    try {
      return await this.serviceRegistry.distributeReward(username, { 
        type: 'pokemon', 
        pokemonId 
      });
    } catch (error) {
      console.error('[RewardDistributor] Pokemon distribution error:', error);
      return false;
    }
  }

  private async distributeExperience(username: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;

    try {
      return await this.serviceRegistry.distributeReward(username, { 
        type: 'experience', 
        amount 
      });
    } catch (error) {
      console.error('[RewardDistributor] Experience distribution error:', error);
      return false;
    }
  }

  private async distributeBadge(username: string, badgeId: string): Promise<boolean> {
    if (!badgeId) return false;
    // TODO: Implement badge system
    return true;
  }

  private async distributeTitle(username: string, titleId: string): Promise<boolean> {
    if (!titleId) return false;
    // TODO: Implement title system
    return true;
  }

  private async distributeAccess(username: string, accessId: string): Promise<boolean> {
    if (!accessId) return false;
    // TODO: Implement access system
    return true;
  }

  private async distributeRecipe(username: string, recipeId: string): Promise<boolean> {
    if (!recipeId) return false;
    // TODO: Implement recipe system
    return true;
  }

  private async distributeMove(username: string, moveId: string): Promise<boolean> {
    if (!moveId) return false;
    // TODO: Implement move system
    return true;
  }

  private async distributeUnlock(username: string, unlockId: string): Promise<boolean> {
    if (!unlockId) return false;
    // TODO: Implement unlock system
    return true;
  }

  private async distributeBoost(username: string, boostId: string, duration?: number): Promise<boolean> {
    if (!boostId) return false;
    // TODO: Implement boost system
    return true;
  }

  private async distributeCosmetic(username: string, cosmeticId: string): Promise<boolean> {
    if (!cosmeticId) return false;
    // TODO: Implement cosmetic system
    return true;
  }

  async validateRewardConditions(username: string, reward: ExtendedQuestReward): Promise<boolean> {
    if (!this.config.enableConditionChecks || !reward.conditions) {
      return true;
    }

    // TODO: Implement full condition validation
    return true;
  }

  async canReceiveReward(username: string, reward: QuestReward): Promise<RewardValidationResult> {
    const result: RewardValidationResult = {
      valid: true
    };

    if (!username || !reward) {
      result.valid = false;
      result.reason = 'Invalid parameters';
      return result;
    }

    switch (reward.type) {
      case 'gold':
        if (!reward.amount || reward.amount <= 0) {
          result.valid = false;
          result.reason = 'Invalid gold amount';
        }
        break;
        
      case 'item':
        if (!reward.itemId) {
          result.valid = false;
          result.reason = 'Missing item ID';
        }
        break;
        
      case 'pokemon':
        if (!reward.pokemonId || reward.pokemonId <= 0) {
          result.valid = false;
          result.reason = 'Invalid Pokemon ID';
        }
        break;
    }

    return result;
  }

  private async distributeBatch(
    username: string, 
    rewards: QuestReward[], 
    result: RewardDistributionResult
  ): Promise<void> {
    
    for (const reward of rewards) {
      try {
        const success = await this.distributeByType(username, reward);
        
        if (success) {
          result.distributedRewards.push(this.createDistributedReward(reward));
        } else {
          result.failedRewards.push({
            reward,
            reason: 'Distribution failed',
            canRetry: true
          });
          result.success = false;
        }
      } catch (error) {
        result.failedRewards.push({
          reward,
          reason: error instanceof Error ? error.message : 'Unknown error',
          canRetry: true
        });
        result.success = false;
      }
    }
  }

  private async distributeSequential(
    username: string, 
    rewards: QuestReward[], 
    result: RewardDistributionResult
  ): Promise<void> {
    
    for (const reward of rewards) {
      const success = await this.distributeSingleReward(username, reward);
      
      if (success) {
        result.distributedRewards.push(this.createDistributedReward(reward));
      } else {
        result.failedRewards.push({
          reward,
          reason: 'Distribution failed',
          canRetry: true
        });
        
        if (this.config.strictValidation) {
          result.success = false;
          break;
        }
      }
    }
  }

  private createDistributedReward(reward: QuestReward): DistributedReward {
    return {
      ...reward,
      distributedAt: new Date(),
      distributionId: this.generateDistributionId(),
      claimed: true,
      claimedAt: new Date(),
      validated: true,
      notificationSent: false
    };
  }

  private convertToSimpleReward(extended: ExtendedQuestReward): QuestReward {
    return {
      type: extended.type,
      itemId: extended.itemId,
      amount: extended.amount,
      pokemonId: extended.pokemonId,
      badgeId: extended.badgeId,
      titleId: extended.titleId,
      accessId: extended.accessId,
      recipeId: extended.recipeId,
      moveId: extended.moveId,
      unlockId: extended.unlockId,
      boostId: extended.boostId,
      cosmeticId: extended.cosmeticId,
      rarity: extended.rarity,
      temporary: extended.temporary,
      duration: extended.duration,
      description: extended.description,
      conditions: extended.conditions
    };
  }

  private async validateAllRewards(username: string, rewards: QuestReward[]): Promise<Array<{ reward: QuestReward; valid: boolean; reason?: string }>> {
    const results = [];
    
    for (const reward of rewards) {
      const validation = await this.canReceiveReward(username, reward);
      results.push({
        reward,
        valid: validation.valid,
        reason: validation.reason
      });
    }
    
    return results;
  }

  private calculateTotalValue(rewards: DistributedReward[]): number {
    return rewards.reduce((total, reward) => {
      if (reward.type === 'gold' && reward.amount) {
        return total + reward.amount;
      }
      return total;
    }, 0);
  }

  private generateDistributionId(): string {
    return `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async retryFailedDistribution(distributionId: string): Promise<RewardDistributionResult> {
    throw new Error('Not implemented');
  }

  async getFailedDistributions(username?: string): Promise<FailedRewardDistribution[]> {
    return [];
  }

  async getDistributionStats(username?: string): Promise<RewardDistributionStats> {
    return {
      totalDistributions: 0,
      successfulDistributions: 0,
      failedDistributions: 0,
      retryDistributions: 0,
      byType: {} as any,
      byRarity: {} as any,
      averageDistributionTime: 0,
      slowestDistributions: [],
      periodStart: new Date(),
      periodEnd: new Date(),
      lastUpdated: new Date()
    };
  }

  private async recordDistributionStats(username: string, result: RewardDistributionResult): Promise<void> {
    // TODO: Implement stats recording
  }

  getDebugInfo(): any {
    return {
      config: this.config,
      failedDistributionsCount: this.failedDistributions.size,
      version: '1.0.0',
      supportedTypes: [
        'gold', 'item', 'pokemon', 'experience',
        'badge', 'title', 'access', 'recipe', 'move', 'unlock', 'boost', 'cosmetic'
      ],
      features: {
        batchDistribution: this.config.enableBatchDistribution,
        retry: this.config.enableRetry,
        validation: this.config.validateBeforeDistribution,
        experimental: this.config.enableExperimentalTypes
      }
    };
  }

  updateConfig(newConfig: Partial<RewardDistributorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableDistributionLogging) {
      console.log('[RewardDistributor] Configuration updated');
    }
  }
}

export default RewardDistributor;
