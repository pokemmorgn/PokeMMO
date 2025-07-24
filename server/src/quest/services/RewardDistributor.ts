// server/src/quest/services/RewardDistributor.ts
// Service modulaire pour la distribution des récompenses - Interface ServiceRegistry

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

// ===== INTERFACE DU SERVICE =====

/**
 * 🎁 Interface principale du service de distribution
 */
export interface IRewardDistributor {
  // Distribution principale
  distributeRewards(username: string, rewards: QuestReward[]): Promise<RewardDistributionResult>;
  distributeSingleReward(username: string, reward: QuestReward): Promise<boolean>;
  
  // Distribution étendue avec métadonnées
  distributeExtendedRewards(request: RewardDistributionRequest): Promise<RewardDistributionResult>;
  
  // Calcul des récompenses
  calculateFinalQuestRewards(definition: QuestDefinition): QuestReward[];
  calculateStepRewards(definition: QuestDefinition, stepIndex: number): QuestReward[];
  
  // Validation des récompenses
  validateRewardConditions(username: string, reward: ExtendedQuestReward): Promise<boolean>;
  canReceiveReward(username: string, reward: QuestReward): Promise<RewardValidationResult>;
  
  // Gestion des erreurs
  retryFailedDistribution(distributionId: string): Promise<RewardDistributionResult>;
  getFailedDistributions(username?: string): Promise<FailedRewardDistribution[]>;
  
  // Statistiques
  getDistributionStats(username?: string): Promise<RewardDistributionStats>;
}

// ===== TYPES DE DONNÉES =====

/**
 * 🎁 Résultat de validation de récompense
 */
export interface RewardValidationResult {
  valid: boolean;
  reason?: string;
  missingRequirements?: string[];
  alternativeRewards?: QuestReward[];
  canRetryLater?: boolean;
}

/**
 * 🎁 Distribution échouée
 */
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

/**
 * 🎁 Statistiques de distribution
 */
export interface RewardDistributionStats {
  totalDistributions: number;
  successfulDistributions: number;
  failedDistributions: number;
  retryDistributions: number;
  
  // Par type
  byType: Record<QuestRewardType, {
    count: number;
    totalValue: number;
    successRate: number;
  }>;
  
  // Par rareté
  byRarity: Record<RewardRarity, {
    count: number;
    successRate: number;
  }>;
  
  // Performance
  averageDistributionTime: number;
  slowestDistributions: Array<{
    reward: string;
    time: number;
    date: Date;
  }>;
  
  // Période
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

// ===== CONFIGURATION =====

/**
 * ⚙️ Configuration du distributeur
 */
export interface RewardDistributorConfig {
  // Distribution
  enableBatchDistribution: boolean;
  maxBatchSize: number;
  distributionTimeout: number; // en ms
  
  // Retry logic
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number; // en ms
  exponentialBackoff: boolean;
  
  // Validation
  strictValidation: boolean;
  validateBeforeDistribution: boolean;
  enableConditionChecks: boolean;
  
  // Performance
  enableCaching: boolean;
  enableParallelDistribution: boolean;
  maxConcurrentDistributions: number;
  
  // ServiceRegistry
  serviceRegistryTimeout: number; // en ms
  fallbackOnServiceFailure: boolean;
  
  // Logging
  enableDistributionLogging: boolean;
  logFailures: boolean;
  logPerformanceMetrics: boolean;
  
  // Économie
  enableInflationProtection: boolean;
  maxGoldPerDistribution: number;
  enableValueCaps: boolean;
  
  // Extensions
  enableExperimentalTypes: boolean;
  enableTemporaryRewards: boolean;
}

// ===== IMPLÉMENTATION =====

/**
 * 🎁 Service de distribution des récompenses
 * Extrait du QuestManager pour modularité
 */
class RewardDistributor implements IRewardDistributor {
  private config: RewardDistributorConfig;
  private serviceRegistry: ServiceRegistry;
  private failedDistributions: Map<string, FailedRewardDistribution>;
  private distributionStats: Map<string, RewardDistributionStats>;
  
  constructor(config?: Partial<RewardDistributorConfig>) {
    this.config = {
      enableBatchDistribution: true,
      maxBatchSize: 10,
      distributionTimeout: 10000, // 10 secondes
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000, // 1 seconde
      exponentialBackoff: true,
      strictValidation: true,
      validateBeforeDistribution: true,
      enableConditionChecks: true,
      enableCaching: false,
      enableParallelDistribution: false,
      maxConcurrentDistributions: 5,
      serviceRegistryTimeout: 5000, // 5 secondes
      fallbackOnServiceFailure: false,
      enableDistributionLogging: process.env.NODE_ENV === 'development',
      logFailures: true,
      logPerformanceMetrics: false,
      enableInflationProtection: true,
      maxGoldPerDistribution: 1000000, // 1M gold max
      enableValueCaps: true,
      enableExperimentalTypes: false,
      enableTemporaryRewards: true,
      ...config
    };
    
    this.serviceRegistry = ServiceRegistry.getInstance();
    this.failedDistributions = new Map();
    this.distributionStats = new Map();
    
    this.log('info', '🎁 RewardDistributor initialisé', { config: this.config });
  }

  // ===== MÉTHODES PRINCIPALES =====

  /**
   * 🎁 Distribution principale des récompenses
   * Extraite de QuestManager.distributeRewards()
   */
  async distributeRewards(username: string, rewards: QuestReward[]): Promise<RewardDistributionResult> {
    const startTime = Date.now();
    const distributionId = this.generateDistributionId();
    
    this.log('info', `🎁 Distribution récompenses pour ${username}`, {
      distributionId,
      rewardsCount: rewards.length,
      rewards: rewards.map(r => ({ type: r.type, amount: r.amount, itemId: r.itemId }))
    });

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
      // ✅ VALIDATION PRÉALABLE
      if (this.config.validateBeforeDistribution) {
        const validationResults = await this.validateAllRewards(username, rewards);
        const invalidRewards = validationResults.filter(v => !v.valid);
        
        if (invalidRewards.length > 0 && this.config.strictValidation) {
          result.success = false;
          result.errors = invalidRewards.map(v => `${v.reward.type}: ${v.reason}`);
          return result;
        }
      }

      // ✅ DISTRIBUTION DES RÉCOMPENSES
      if (this.config.enableBatchDistribution && rewards.length <= this.config.maxBatchSize) {
        // Distribution en batch
        await this.distributeBatch(username, rewards, result);
      } else {
        // Distribution séquentielle
        await this.distributeSequential(username, rewards, result);
      }

      // ✅ CALCULER STATISTIQUES
      result.totalValue = this.calculateTotalValue(result.distributedRewards);
      result.distributionTime = Date.now() - startTime;
      result.notifications = result.distributedRewards.length > 0;

      // ✅ ENREGISTRER STATISTIQUES
      await this.recordDistributionStats(username, result);

      this.log('info', `✅ Distribution terminée: ${result.distributedRewards.length}/${result.totalRewards} succès`, {
        distributionId,
        success: result.success,
        time: result.distributionTime
      });

      return result;

    } catch (error) {
      this.log('error', `❌ Erreur distribution:`, error);
      result.success = false;
      result.errors = [`Erreur système: ${error instanceof Error ? error.message : 'Erreur inconnue'}`];
      result.distributionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 🎁 Distribution d'une seule récompense
   */
  async distributeSingleReward(username: string, reward: QuestReward): Promise<boolean> {
    try {
      this.log('debug', `🎁 Distribution récompense unique: ${reward.type}`, { username, reward });

      // ✅ VALIDATION PRÉALABLE
      if (this.config.validateBeforeDistribution) {
        const validation = await this.canReceiveReward(username, reward);
        if (!validation.valid) {
          this.log('warn', `⚠️ Validation échouée: ${validation.reason}`);
          return false;
        }
      }

      // ✅ DISTRIBUTION SELON LE TYPE
      const success = await this.distributeByType(username, reward);
      
      if (success) {
        this.log('info', `✅ Récompense distribuée: ${reward.type} pour ${username}`);
      } else {
        this.log('warn', `❌ Échec distribution: ${reward.type} pour ${username}`);
      }

      return success;

    } catch (error) {
      this.log('error', `❌ Erreur distribution unique:`, error);
      return false;
    }
  }

  /**
   * 🎁 Distribution étendue avec métadonnées
   */
  async distributeExtendedRewards(request: RewardDistributionRequest): Promise<RewardDistributionResult> {
    this.log('info', `🎁 Distribution étendue pour ${request.playerId}`, { request });

    // Convertir les récompenses étendues en récompenses simples pour compatibilité
    const simpleRewards: QuestReward[] = (request.rewards || []).map(this.convertToSimpleReward);

    const result = await this.distributeRewards(request.playerId, simpleRewards);

    // Ajouter métadonnées spécifiques à la requête
    if (request.immediate && result.success) {
      this.log('info', `⚡ Distribution immédiate effectuée`);
    }

    if (request.notification && result.success) {
      // Notifier le joueur via ServiceRegistry
      const success = this.serviceRegistry.notifyPlayer(request.playerId, "rewardReceived", {
        rewards: result.distributedRewards,
        source: request.rewardSource.type,
        message: "🎁 Nouvelles récompenses reçues !"
      });
      
      result.notifications = success;
    }

    return result;
  }

  // ===== CALCUL DES RÉCOMPENSES =====

  /**
   * 🎁 Calcul des récompenses finales de quête
   * Extraite de QuestManager.calculateFinalQuestRewards()
   */
  calculateFinalQuestRewards(definition: QuestDefinition): QuestReward[] {
    this.log('debug', `🧮 Calcul récompenses finales pour ${definition.id}`);

    if (!definition.steps || definition.steps.length === 0) {
      this.log('warn', `⚠️ Aucune étape trouvée pour ${definition.id}`);
      return [];
    }

    // Récompenses de la dernière étape
    const finalStep = definition.steps[definition.steps.length - 1];
    const rewards = finalStep.rewards || [];

    this.log('debug', `🎁 ${rewards.length} récompense(s) finale(s) calculée(s)`, { rewards });
    return rewards;
  }

  /**
   * 🎁 Calcul des récompenses d'étape
   */
  calculateStepRewards(definition: QuestDefinition, stepIndex: number): QuestReward[] {
    this.log('debug', `🧮 Calcul récompenses étape ${stepIndex} pour ${definition.id}`);

    if (!definition.steps || stepIndex >= definition.steps.length || stepIndex < 0) {
      this.log('warn', `⚠️ Index d'étape invalide: ${stepIndex}`);
      return [];
    }

    const step = definition.steps[stepIndex];
    const rewards = step.rewards || [];

    this.log('debug', `🎁 ${rewards.length} récompense(s) d'étape calculée(s)`, { rewards });
    return rewards;
  }

  // ===== DISTRIBUTION PAR TYPE =====

  /**
   * 🎁 Distribution selon le type de récompense
   */
  private async distributeByType(username: string, reward: QuestReward): Promise<boolean> {
    try {
      switch (reward.type) {
        // ===== TYPES EXISTANTS (CONSERVÉS) =====
        case 'gold':
          return await this.distributeGold(username, reward.amount || 0);
        
        case 'item':
          return await this.distributeItem(username, reward.itemId || '', reward.amount || 1);
        
        case 'pokemon':
          return await this.distributePokemon(username, reward.pokemonId || 0);
        
        case 'experience':
          return await this.distributeExperience(username, reward.amount || 0);

        // ===== NOUVEAUX TYPES ÉTENDUS =====
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
          this.log('warn', `⚠️ Type de récompense inconnu: ${reward.type}`);
          return false;
      }
    } catch (error) {
      this.log('error', `❌ Erreur distribution type ${reward.type}:`, error);
      return false;
    }
  }

  // ===== DISTRIBUTION TYPES EXISTANTS =====

  /**
   * 🏅 Distribution d'or
   */
  private async distributeGold(username: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;

    // Protection inflation
    if (this.config.enableInflationProtection && amount > this.config.maxGoldPerDistribution) {
      this.log('warn', `⚠️ Montant d'or plafonné: ${amount} -> ${this.config.maxGoldPerDistribution}`);
      amount = this.config.maxGoldPerDistribution;
    }

    try {
      const success = await this.serviceRegistry.distributeReward(username, { type: 'gold', amount });
      this.log('debug', `💰 Distribution or: ${amount} pour ${username} = ${success}`);
      return success;
    } catch (error) {
      this.log('error', `❌ Erreur distribution or:`, error);
      return false;
    }
  }

  /**
   * 📦 Distribution d'objet
   */
  private async distributeItem(username: string, itemId: string, amount: number): Promise<boolean> {
    if (!itemId || amount <= 0) return false;

    try {
      const success = await this.serviceRegistry.distributeReward(username, { 
        type: 'item', 
        itemId, 
        amount 
      });
      this.log('debug', `📦 Distribution item: ${amount}x ${itemId} pour ${username} = ${success}`);
      return success;
    } catch (error) {
      this.log('error', `❌ Erreur distribution item:`, error);
      return false;
    }
  }

  /**
   * ⚡ Distribution de Pokémon
   */
  private async distributePokemon(username: string, pokemonId: number): Promise<boolean> {
    if (pokemonId <= 0) return false;

    try {
      const success = await this.serviceRegistry.distributeReward(username, { 
        type: 'pokemon', 
        pokemonId 
      });
      this.log('debug', `⚡ Distribution pokemon: ${pokemonId} pour ${username} = ${success}`);
      return success;
    } catch (error) {
      this.log('error', `❌ Erreur distribution pokemon:`, error);
      return false;
    }
  }

  /**
   * ⭐ Distribution d'expérience
   */
  private async distributeExperience(username: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;

    try {
      const success = await this.serviceRegistry.distributeReward(username, { 
        type: 'experience', 
        amount 
      });
      this.log('debug', `⭐ Distribution XP: ${amount} pour ${username} = ${success}`);
      return success;
    } catch (error) {
      this.log('error', `❌ Erreur distribution XP:`, error);
      return false;
    }
  }

  // ===== DISTRIBUTION NOUVEAUX TYPES =====

  /**
   * 🏅 Distribution de badge
   */
  private async distributeBadge(username: string, badgeId: string): Promise<boolean> {
    if (!badgeId) return false;

    // TODO: Implémenter avec système de badges
    this.log('info', `🏅 Badge ${badgeId} donné à ${username} (placeholder)`);
    return true;
  }

  /**
   * 👑 Distribution de titre
   */
  private async distributeTitle(username: string, titleId: string): Promise<boolean> {
    if (!titleId) return false;

    // TODO: Implémenter avec système de titres
    this.log('info', `👑 Titre ${titleId} donné à ${username} (placeholder)`);
    return true;
  }

  /**
   * 🔑 Distribution d'accès
   */
  private async distributeAccess(username: string, accessId: string): Promise<boolean> {
    if (!accessId) return false;

    // TODO: Implémenter avec système d'accès
    this.log('info', `🔑 Accès ${accessId} donné à ${username} (placeholder)`);
    return true;
  }

  /**
   * 📜 Distribution de recette
   */
  private async distributeRecipe(username: string, recipeId: string): Promise<boolean> {
    if (!recipeId) return false;

    // TODO: Implémenter avec système de craft
    this.log('info', `📜 Recette ${recipeId} donnée à ${username} (placeholder)`);
    return true;
  }

  /**
   * 💢 Distribution d'attaque
   */
  private async distributeMove(username: string, moveId: string): Promise<boolean> {
    if (!moveId) return false;

    // TODO: Implémenter avec système d'attaques
    this.log('info', `💢 Attaque ${moveId} donnée à ${username} (placeholder)`);
    return true;
  }

  /**
   * 🔓 Distribution de déblocage
   */
  private async distributeUnlock(username: string, unlockId: string): Promise<boolean> {
    if (!unlockId) return false;

    // TODO: Implémenter avec système de déblocages
    this.log('info', `🔓 Déblocage ${unlockId} donné à ${username} (placeholder)`);
    return true;
  }

  /**
   * ⚡ Distribution de boost
   */
  private async distributeBoost(username: string, boostId: string, duration?: number): Promise<boolean> {
    if (!boostId) return false;

    // TODO: Implémenter avec système de boosts temporaires
    this.log('info', `⚡ Boost ${boostId} (${duration}min) donné à ${username} (placeholder)`);
    return true;
  }

  /**
   * ✨ Distribution de cosmétique
   */
  private async distributeCosmetic(username: string, cosmeticId: string): Promise<boolean> {
    if (!cosmeticId) return false;

    // TODO: Implémenter avec système de cosmétiques
    this.log('info', `✨ Cosmétique ${cosmeticId} donné à ${username} (placeholder)`);
    return true;
  }

  // ===== VALIDATION DES RÉCOMPENSES =====

  /**
   * ✅ Validation des conditions de récompense
   */
  async validateRewardConditions(username: string, reward: ExtendedQuestReward): Promise<boolean> {
    if (!this.config.enableConditionChecks || !reward.conditions) {
      return true;
    }

    this.log('debug', `✅ Validation conditions récompense pour ${username}`, { reward: reward.type });

    // TODO: Implémenter validation complète des conditions
    // Pour l'instant, on valide seulement les conditions de base
    
    return true;
  }

  /**
   * ✅ Vérifier si peut recevoir récompense
   */
  async canReceiveReward(username: string, reward: QuestReward): Promise<RewardValidationResult> {
    const result: RewardValidationResult = {
      valid: true
    };

    // Vérifications de base
    if (!username || !reward) {
      result.valid = false;
      result.reason = 'Paramètres invalides';
      return result;
    }

    // Vérifications par type
    switch (reward.type) {
      case 'gold':
        if (!reward.amount || reward.amount <= 0) {
          result.valid = false;
          result.reason = 'Montant d\'or invalide';
        }
        break;
        
      case 'item':
        if (!reward.itemId) {
          result.valid = false;
          result.reason = 'ID d\'objet manquant';
        }
        break;
        
      case 'pokemon':
        if (!reward.pokemonId || reward.pokemonId <= 0) {
          result.valid = false;
          result.reason = 'ID de Pokémon invalide';
        }
        break;
        
      // TODO: Ajouter validations pour nouveaux types
    }

    return result;
  }

  // ===== GESTION DES DISTRIBUTIONS =====

  /**
   * 🎁 Distribution en batch
   */
  private async distributeBatch(
    username: string, 
    rewards: QuestReward[], 
    result: RewardDistributionResult
  ): Promise<void> {
    
    this.log('debug', `📦 Distribution batch: ${rewards.length} récompenses`);

    for (const reward of rewards) {
      try {
        const success = await this.distributeByType(username, reward);
        
        if (success) {
          result.distributedRewards.push(this.createDistributedReward(reward));
        } else {
          result.failedRewards.push({
            reward,
            reason: 'Distribution échouée',
            canRetry: true
          });
          result.success = false;
        }
      } catch (error) {
        result.failedRewards.push({
          reward,
          reason: error instanceof Error ? error.message : 'Erreur inconnue',
          canRetry: true
        });
        result.success = false;
      }
    }
  }

  /**
   * 🎁 Distribution séquentielle
   */
  private async distributeSequential(
    username: string, 
    rewards: QuestReward[], 
    result: RewardDistributionResult
  ): Promise<void> {
    
    this.log('debug', `🔄 Distribution séquentielle: ${rewards.length} récompenses`);

    for (const reward of rewards) {
      const success = await this.distributeSingleReward(username, reward);
      
      if (success) {
        result.distributedRewards.push(this.createDistributedReward(reward));
      } else {
        result.failedRewards.push({
          reward,
          reason: 'Distribution échouée',
          canRetry: true
        });
        
        if (this.config.strictValidation) {
          result.success = false;
          break;
        }
      }
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * 🎁 Créer récompense distribuée
   */
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

  /**
   * 🎁 Convertir récompense étendue en simple
   */
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

  /**
   * 🎁 Validation de toutes les récompenses
   */
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

  /**
   * 🎁 Calculer valeur totale
   */
  private calculateTotalValue(rewards: DistributedReward[]): number {
    return rewards.reduce((total, reward) => {
      if (reward.type === 'gold' && reward.amount) {
        return total + reward.amount;
      }
      // TODO: Ajouter évaluation pour autres types
      return total;
    }, 0);
  }

  /**
   * 🎁 Générer ID de distribution
   */
  private generateDistributionId(): string {
    return `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== MÉTHODES NON IMPLÉMENTÉES (PLACEHOLDERS) =====

  async retryFailedDistribution(distributionId: string): Promise<RewardDistributionResult> {
    this.log('info', `🔄 Retry distribution: ${distributionId} (placeholder)`);
    throw new Error('Not implemented');
  }

  async getFailedDistributions(username?: string): Promise<FailedRewardDistribution[]> {
    this.log('info', `📋 Get failed distributions: ${username || 'all'} (placeholder)`);
    return [];
  }

  async getDistributionStats(username?: string): Promise<RewardDistributionStats> {
    this.log('info', `📊 Get distribution stats: ${username || 'all'} (placeholder)`);
    
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
    // TODO: Implémenter enregistrement des statistiques
    this.log('debug', `📊 Recording stats for ${username} (placeholder)`);
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * 🎁 Logging intelligent
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableDistributionLogging && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [RewardDistributor] ${message}`;
    
    switch (level) {
      case 'debug':
        if (this.config.enableDistributionLogging) {
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
   * 🎁 Informations de debugging
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      failedDistributionsCount: this.failedDistributions.size,
      version: '1.0.0',
      supportedTypes: [
        // Types existants
        'gold', 'item', 'pokemon', 'experience',
        // Types étendus
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

  /**
   * 🎁 Mise à jour configuration
   */
  updateConfig(newConfig: Partial<RewardDistributorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour', { newConfig });
  }
}

// ===== EXPORT =====
export default RewardDistributor;
