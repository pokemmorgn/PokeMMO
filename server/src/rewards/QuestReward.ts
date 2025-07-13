// server/src/rewards/QuestReward.ts

import { PlayerQuest } from '../models/PlayerQuest';
import { ExperienceReward } from './ExperienceReward';
import { MoneyReward } from './MoneyReward';
import { ItemReward } from './ItemReward';
import { PokemonReward } from './PokemonReward';
import { 
  ProcessedReward, 
  RewardNotification,
  Reward,
  RewardResult 
} from './types/RewardTypes';

// === INTERFACES DE QUÊTES ===

interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  category: 'main' | 'side' | 'daily' | 'weekly' | 'seasonal' | 'achievement';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'legendary';
  
  // Conditions d'activation
  requirements: {
    level?: number;
    badges?: string[];
    completedQuests?: string[];
    items?: Array<{ itemId: string; quantity: number }>;
    pokemon?: Array<{ pokemonId: number; level?: number }>;
  };
  
  // Objectifs à accomplir
  objectives: Array<{
    id: string;
    type: 'capture' | 'battle' | 'evolve' | 'trade' | 'walk' | 'item_use' | 'location_visit' | 'time_limit';
    description: string;
    target: number;
    data?: any; // Données spécifiques à l'objectif
  }>;
  
  // Récompenses
  rewards: {
    experience?: Array<{ pokemonId?: string; amount: number }>;
    money?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    pokemon?: Array<{ pokemonId: number; level: number; shiny?: boolean }>;
    prestige?: number;
    unlocks?: string[]; // Nouvelles zones, quêtes, etc.
  };
  
  // Métadonnées
  isRepeatable: boolean;
  cooldownHours?: number;
  timeLimit?: number; // En heures
  seasonalEvent?: string;
}

interface QuestProgress {
  questId: string;
  currentObjectives: Record<string, {
    current: number;
    target: number;
    completed: boolean;
  }>;
  status: 'active' | 'completed' | 'failed' | 'expired';
  startedAt: Date;
  completedAt?: Date;
  timeRemaining?: number;
}

export class QuestReward {
  private experienceReward: ExperienceReward;
  private moneyReward: MoneyReward;
  private itemReward: ItemReward;
  private pokemonReward: PokemonReward;

  // Base de données des quêtes (en dur pour l'instant)
  private questDefinitions: Map<string, QuestDefinition> = new Map();

  constructor() {
    this.experienceReward = new ExperienceReward();
    this.moneyReward = new MoneyReward();
    this.itemReward = new ItemReward();
    this.pokemonReward = new PokemonReward();
    
    this.initializeQuestDefinitions();
  }

  /**
   * 🎯 Traite la complétion d'une quête
   */
  async processQuestCompletion(playerId: string, questId: string): Promise<RewardResult> {
    console.log(`🎯 [QuestReward] Traitement complétion quête ${questId} pour ${playerId}`);

    try {
      // Vérifier que la quête existe
      const questDef = this.questDefinitions.get(questId);
      if (!questDef) {
        return {
          success: false,
          error: `Quête ${questId} introuvable`,
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Vérifier que la quête est complétée
      const questProgress = await this.getQuestProgress(playerId, questId);
      if (!questProgress || questProgress.status !== 'completed') {
        return {
          success: false,
          error: 'Quête non complétée',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Distribuer les récompenses
      const rewardResult = await this.distributeQuestRewards(playerId, questDef);

      // Marquer la quête comme réclamée
      await this.markQuestAsCompleted(playerId, questId);

      // Débloquer nouvelles quêtes/zones
      if (questDef.rewards.unlocks) {
        await this.processUnlocks(playerId, questDef.rewards.unlocks);
      }

      // Ajouter notifications spéciales
      rewardResult.notifications.push({
        type: 'achievement',
        message: `🎊 Quête "${questDef.name}" terminée !`,
        priority: 'high',
        animation: 'star',
        data: {
          questId,
          questName: questDef.name,
          difficulty: questDef.difficulty
        }
      });

      // Vérifier les achievements de quêtes
      const questAchievements = await this.checkQuestAchievements(playerId, questDef);
      if (questAchievements.length > 0) {
        rewardResult.notifications.push(...questAchievements);
      }

      console.log(`✅ [QuestReward] Quête ${questId} complétée: ${rewardResult.totalExperience} XP, ${rewardResult.totalMoney} PokéDollars`);

      return rewardResult;

    } catch (error) {
      console.error('❌ [QuestReward] Erreur complétion quête:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        processedRewards: [],
        totalExperience: 0,
        totalMoney: 0,
        totalFriendship: 0,
        itemsGiven: [],
        notifications: []
      };
    }
  }

  /**
   * 📈 Met à jour la progression d'une quête
   */
  async updateQuestProgress(
    playerId: string,
    action: string,
    data: any = {}
  ): Promise<{
    questsUpdated: string[];
    questsCompleted: string[];
    notifications: RewardNotification[];
  }> {
    console.log(`📈 [QuestReward] Mise à jour progression: ${action} pour ${playerId}`);

    try {
      const activeQuests = await this.getActiveQuests(playerId);
      const questsUpdated: string[] = [];
      const questsCompleted: string[] = [];
      const notifications: RewardNotification[] = [];

      for (const quest of activeQuests) {
        const questDef = this.questDefinitions.get(quest.questId);
        if (!questDef) continue;

        let hasUpdated = false;

        // Vérifier chaque objectif
        for (const objective of questDef.objectives) {
          if (this.actionMatchesObjective(action, objective, data)) {
            const progress = quest.currentObjectives[objective.id];
            if (!progress.completed) {
              const increment = this.calculateProgressIncrement(objective, data);
              progress.current = Math.min(progress.current + increment, progress.target);
              
              if (progress.current >= progress.target) {
                progress.completed = true;
                notifications.push({
                  type: 'achievement',
                  message: `Objectif complété: ${objective.description}`,
                  priority: 'medium',
                  data: {
                    questId: quest.questId,
                    objectiveId: objective.id
                  }
                });
              }
              
              hasUpdated = true;
            }
          }
        }

        if (hasUpdated) {
          questsUpdated.push(quest.questId);
          
          // Vérifier si toute la quête est complétée
          const allCompleted = Object.values(quest.currentObjectives).every(obj => obj.completed);
          if (allCompleted && quest.status === 'active') {
            quest.status = 'completed';
            questsCompleted.push(quest.questId);
            
            notifications.push({
              type: 'achievement',
              message: `🎊 Quête "${questDef.name}" prête à être réclamée !`,
              priority: 'high',
              animation: 'star',
              data: {
                questId: quest.questId,
                questName: questDef.name
              }
            });
          }
          
          // Sauvegarder la progression
          await this.saveQuestProgress(playerId, quest);
        }
      }

      return {
        questsUpdated,
        questsCompleted,
        notifications
      };

    } catch (error) {
      console.error('❌ [QuestReward] Erreur mise à jour progression:', error);
      return {
        questsUpdated: [],
        questsCompleted: [],
        notifications: []
      };
    }
  }

  /**
   * 🎁 Distribue les récompenses d'une quête
   */
  private async distributeQuestRewards(
    playerId: string,
    questDef: QuestDefinition
  ): Promise<RewardResult> {
    const result: RewardResult = {
      success: true,
      processedRewards: [],
      totalExperience: 0,
      totalMoney: 0,
      totalFriendship: 0,
      itemsGiven: [],
      notifications: []
    };

    try {
      const rewards = questDef.rewards;

      // === EXPÉRIENCE ===
      if (rewards.experience) {
        for (const expReward of rewards.experience) {
          const processed = await this.experienceReward.giveExperience(playerId, {
            type: 'experience',
            pokemonId: expReward.pokemonId,
            baseAmount: expReward.amount,
            multipliers: {
              event: this.getQuestExpMultiplier(questDef.difficulty)
            }
          });
          
          if (processed.success) {
            result.totalExperience += processed.finalAmount || 0;
            result.processedRewards.push(processed);
          }
        }
      }

      // === ARGENT ===
      if (rewards.money) {
        const processed = await this.moneyReward.giveMoney(playerId, {
          type: 'money',
          amount: rewards.money,
          multipliers: {
            event: this.getQuestMoneyMultiplier(questDef.difficulty)
          }
        });
        
        if (processed.success) {
          result.totalMoney += processed.finalAmount || 0;
          result.processedRewards.push(processed);
        }
      }

      // === OBJETS ===
      if (rewards.items) {
        for (const itemReward of rewards.items) {
          const processed = await this.itemReward.giveItem(playerId, {
            type: 'item',
            itemId: itemReward.itemId,
            quantity: itemReward.quantity,
            source: 'quest'
          });
          
          if (processed.success && processed.data) {
            result.itemsGiven.push({
              itemId: processed.data.itemId,
              quantity: processed.data.quantity,
              pocket: processed.data.pocket || 'items'
            });
            result.processedRewards.push(processed);
          }
        }
      }

      // === POKÉMON ===
      if (rewards.pokemon) {
        for (const pokemonReward of rewards.pokemon) {
          const processed = await this.pokemonReward.givePokemon(playerId, {
            type: 'pokemon',
            pokemonData: {
              pokemonId: pokemonReward.pokemonId,
              level: pokemonReward.level,
              shiny: pokemonReward.shiny || false,
              friendship: 100 // Pokémon de quête commencent avec plus d'amitié
            }
          });
          
          if (processed.success) {
            result.processedRewards.push(processed);
            
            result.notifications.push({
              type: 'pokemon',
              message: `Pokémon reçu en récompense de quête !`,
              priority: 'high',
              data: {
                pokemonId: pokemonReward.pokemonId,
                source: 'quest'
              }
            });
          }
        }
      }

      // === PRESTIGE ===
      if (rewards.prestige) {
        // TODO: Implémenter le système de prestige
        console.log(`🏆 [QuestReward] ${playerId} gagne ${rewards.prestige} points de prestige`);
      }

      return result;

    } catch (error) {
      console.error('❌ [QuestReward] Erreur distribution récompenses:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Erreur inconnue';
      return result;
    }
  }

  /**
   * 🔍 Vérifie si une action correspond à un objectif
   */
  private actionMatchesObjective(action: string, objective: any, data: any): boolean {
    switch (objective.type) {
      case 'capture':
        if (action === 'pokemon_captured') {
          if (objective.data?.pokemonId && data.pokemonId !== objective.data.pokemonId) {
            return false;
          }
          if (objective.data?.location && data.location !== objective.data.location) {
            return false;
          }
          if (objective.data?.shiny && !data.shiny) {
            return false;
          }
          return true;
        }
        break;

      case 'battle':
        if (action === 'battle_won') {
          if (objective.data?.trainerType && data.trainerType !== objective.data.trainerType) {
            return false;
          }
          if (objective.data?.location && data.location !== objective.data.location) {
            return false;
          }
          return true;
        }
        break;

      case 'evolve':
        if (action === 'pokemon_evolved') {
          if (objective.data?.pokemonId && data.fromPokemonId !== objective.data.pokemonId) {
            return false;
          }
          return true;
        }
        break;

      case 'trade':
        return action === 'trade_completed';

      case 'walk':
        return action === 'steps_walked';

      case 'item_use':
        if (action === 'item_used') {
          return !objective.data?.itemId || data.itemId === objective.data.itemId;
        }
        break;

      case 'location_visit':
        if (action === 'location_visited') {
          return data.location === objective.data?.location;
        }
        break;
    }

    return false;
  }

  /**
   * 🧮 Calcule l'incrément de progression
   */
  private calculateProgressIncrement(objective: any, data: any): number {
    switch (objective.type) {
      case 'walk':
        return data.steps || 1;
      case 'capture':
      case 'battle':
      case 'evolve':
      case 'trade':
      case 'item_use':
      case 'location_visit':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * 📊 Obtient la progression d'une quête
   */
  private async getQuestProgress(playerId: string, questId: string): Promise<QuestProgress | null> {
    try {
      const playerQuest = await PlayerQuest.findOne({ username: playerId });
      if (!playerQuest) return null;

      const activeQuest = playerQuest.activeQuests.find(q => q.questId === questId);
      if (!activeQuest) return null;

      return {
        questId,
        currentObjectives: Object.fromEntries(activeQuest.objectives),
        status: activeQuest.status as any,
        startedAt: activeQuest.startedAt,
        completedAt: activeQuest.completedAt,
        timeRemaining: this.calculateTimeRemaining(activeQuest, questId)
      };

    } catch (error) {
      console.error('❌ [QuestReward] Erreur récupération progression:', error);
      return null;
    }
  }

  /**
   * 📝 Sauvegarde la progression d'une quête
   */
  private async saveQuestProgress(playerId: string, quest: QuestProgress): Promise<void> {
    try {
      await PlayerQuest.findOneAndUpdate(
        { username: playerId, 'activeQuests.questId': quest.questId },
        {
          $set: {
            'activeQuests.$.status': quest.status,
            'activeQuests.$.objectives': new Map(Object.entries(quest.currentObjectives)),
            'activeQuests.$.completedAt': quest.completedAt
          }
        }
      );

    } catch (error) {
      console.error('❌ [QuestReward] Erreur sauvegarde progression:', error);
      throw error;
    }
  }

  /**
   * 📋 Obtient les quêtes actives d'un joueur
   */
  private async getActiveQuests(playerId: string): Promise<QuestProgress[]> {
    try {
      const playerQuest = await PlayerQuest.findOne({ username: playerId });
      if (!playerQuest) return [];

      return playerQuest.activeQuests
        .filter(q => q.status === 'active')
        .map(q => ({
          questId: q.questId,
          currentObjectives: Object.fromEntries(q.objectives),
          status: q.status as any,
          startedAt: q.startedAt,
          completedAt: q.completedAt,
          timeRemaining: this.calculateTimeRemaining(q, q.questId)
        }));

    } catch (error) {
      console.error('❌ [QuestReward] Erreur récupération quêtes actives:', error);
      return [];
    }
  }

  /**
   * ⏰ Calcule le temps restant pour une quête
   */
  private calculateTimeRemaining(quest: any, questId: string): number | undefined {
    const questDef = this.questDefinitions.get(questId);
    if (!questDef?.timeLimit) return undefined;

    const elapsed = Date.now() - quest.startedAt.getTime();
    const remaining = (questDef.timeLimit * 3600000) - elapsed; // timeLimit en heures -> ms
    return Math.max(0, remaining);
  }

  /**
   * ✅ Marque une quête comme complétée
   */
  private async markQuestAsCompleted(playerId: string, questId: string): Promise<void> {
    try {
      const questDef = this.questDefinitions.get(questId);
      if (!questDef) return;

      await PlayerQuest.findOneAndUpdate(
        { username: playerId },
        {
          $pull: { activeQuests: { questId } },
          $push: {
            completedQuests: {
              questId,
              completedAt: new Date(),
              stepCount: questDef.objectives.length
            }
          }
        }
      );

    } catch (error) {
      console.error('❌ [QuestReward] Erreur marquage complétion:', error);
      throw error;
    }
  }

  /**
   * 🔓 Traite les débloquages de quête
   */
  private async processUnlocks(playerId: string, unlocks: string[]): Promise<void> {
    try {
      for (const unlock of unlocks) {
        // TODO: Implémenter les débloquages (zones, quêtes, fonctionnalités)
        console.log(`🔓 [QuestReward] Débloquage pour ${playerId}: ${unlock}`);
      }
    } catch (error) {
      console.error('❌ [QuestReward] Erreur débloquages:', error);
    }
  }

  /**
   * 🏆 Vérifie les achievements de quêtes
   */
  private async checkQuestAchievements(
    playerId: string,
    questDef: QuestDefinition
  ): Promise<RewardNotification[]> {
    const notifications: RewardNotification[] = [];

    try {
      const playerQuest = await PlayerQuest.findOne({ username: playerId });
      if (!playerQuest) return notifications;

      const completedCount = playerQuest.completedQuests.length;

      // Achievements par nombre de quêtes
      const milestones = [1, 5, 10, 25, 50, 100];
      if (milestones.includes(completedCount)) {
        notifications.push({
          type: 'achievement',
          message: `🏆 Achievement: ${completedCount} quête(s) complétée(s) !`,
          priority: 'high',
          data: {
            achievement: `quests_completed_${completedCount}`,
            count: completedCount
          }
        });
      }

      // Achievement par difficulté
      if (questDef.difficulty === 'legendary') {
        notifications.push({
          type: 'achievement',
          message: `🌟 Achievement: Quête légendaire complétée !`,
          priority: 'high',
          data: {
            achievement: 'legendary_quest_completed',
            questId: questDef.id
          }
        });
      }

    } catch (error) {
      console.error('❌ [QuestReward] Erreur achievements:', error);
    }

    return notifications;
  }

  /**
   * 🎯 Obtient le multiplicateur d'XP selon la difficulté
   */
  private getQuestExpMultiplier(difficulty: string): number {
    const multipliers: Record<string, number> = {
      'easy': 1.0,
      'medium': 1.1,
      'hard': 1.25,
      'expert': 1.5,
      'legendary': 2.0
    };
    return multipliers[difficulty] || 1.0;
  }

  /**
   * 💰 Obtient le multiplicateur d'argent selon la difficulté
   */
  private getQuestMoneyMultiplier(difficulty: string): number {
    const multipliers: Record<string, number> = {
      'easy': 1.0,
      'medium': 1.2,
      'hard': 1.5,
      'expert': 2.0,
      'legendary': 3.0
    };
    return multipliers[difficulty] || 1.0;
  }

  /**
   * 📚 Initialise les définitions de quêtes
   */
  private initializeQuestDefinitions(): void {
    // Quêtes d'exemple
    const questDefs: QuestDefinition[] = [
      {
        id: 'first_capture',
        name: 'Premier Pokémon',
        description: 'Capturez votre premier Pokémon',
        category: 'main',
        difficulty: 'easy',
        requirements: {},
        objectives: [{
          id: 'capture_1',
          type: 'capture',
          description: 'Capturer 1 Pokémon',
          target: 1
        }],
        rewards: {
          experience: [{ amount: 100 }],
          money: 500,
          items: [{ itemId: 'poke_ball', quantity: 5 }],
          prestige: 10
        },
        isRepeatable: false
      },
      {
        id: 'catch_10_pokemon',
        name: 'Collectionneur Débutant',
        description: 'Capturez 10 Pokémon différents',
        category: 'side',
        difficulty: 'medium',
        requirements: {},
        objectives: [{
          id: 'capture_10',
          type: 'capture',
          description: 'Capturer 10 Pokémon',
          target: 10
        }],
        rewards: {
          experience: [{ amount: 500 }],
          money: 2000,
          items: [
            { itemId: 'great_ball', quantity: 10 },
            { itemId: 'potion', quantity: 5 }
          ],
          prestige: 50
        },
        isRepeatable: false
      },
      {
        id: 'daily_capture',
        name: 'Capture Quotidienne',
        description: 'Capturez 3 Pokémon aujourd\'hui',
        category: 'daily',
        difficulty: 'easy',
        requirements: {},
        objectives: [{
          id: 'daily_capture_3',
          type: 'capture',
          description: 'Capturer 3 Pokémon',
          target: 3
        }],
        rewards: {
          experience: [{ amount: 200 }],
          money: 1000,
          items: [{ itemId: 'poke_ball', quantity: 3 }],
          prestige: 5
        },
        isRepeatable: true,
        cooldownHours: 24
      },
      {
        id: 'shiny_hunter',
        name: 'Chasseur Chromatique',
        description: 'Capturez un Pokémon chromatique',
        category: 'achievement',
        difficulty: 'legendary',
        requirements: {},
        objectives: [{
          id: 'capture_shiny',
          type: 'capture',
          description: 'Capturer 1 Pokémon chromatique',
          target: 1,
          data: { shiny: true }
        }],
        rewards: {
          experience: [{ amount: 2000 }],
          money: 10000,
          items: [
            { itemId: 'master_ball', quantity: 1 },
            { itemId: 'luxury_ball', quantity: 5 }
          ],
          prestige: 500
        },
        isRepeatable: false
      }
    ];

    // Ajouter à la map
    questDefs.forEach(quest => {
      this.questDefinitions.set(quest.id, quest);
    });

    console.log(`📚 [QuestReward] ${questDefs.length} définitions de quêtes chargées`);
  }

  // === MÉTHODES PUBLIQUES UTILITAIRES ===

  /**
   * 📋 Obtient toutes les quêtes disponibles pour un joueur
   */
  async getAvailableQuests(playerId: string): Promise<QuestDefinition[]> {
    try {
      // TODO: Filtrer selon les prérequis du joueur
      return Array.from(this.questDefinitions.values());
    } catch (error) {
      console.error('❌ [QuestReward] Erreur quêtes disponibles:', error);
      return [];
    }
  }

  /**
   * 🎯 Démarre une quête pour un joueur
   */
  async startQuest(playerId: string, questId: string): Promise<boolean> {
    try {
      const questDef = this.questDefinitions.get(questId);
      if (!questDef) return false;

      // Créer les objectifs initiaux
      const objectives = new Map();
      questDef.objectives.forEach(obj => {
        objectives.set(obj.id, {
          currentAmount: 0,
          completed: false
        });
      });

      await PlayerQuest.findOneAndUpdate(
        { username: playerId },
        {
          $push: {
            activeQuests: {
              questId,
              currentStepIndex: 0,
              objectives,
              status: 'active',
              startedAt: new Date()
            }
          }
        },
        { upsert: true }
      );

      console.log(`🎯 [QuestReward] Quête ${questId} démarrée pour ${playerId}`);
      return true;

    } catch (error) {
      console.error('❌ [QuestReward] Erreur démarrage quête:', error);
      return false;
    }
  }

  /**
   * 📊 Obtient les statistiques de quêtes d'un joueur
   */
  async getQuestStats(playerId: string): Promise<{
    totalCompleted: number;
    activeQuests: number;
    completedToday: number;
    averageDifficulty: string;
    totalRewardsEarned: {
      experience: number;
      money: number;
      items: number;
    };
  }> {
    try {
      const playerQuest = await PlayerQuest.findOne({ username: playerId });
      if (!playerQuest) {
        return {
          totalCompleted: 0,
          activeQuests: 0,
          completedToday: 0,
          averageDifficulty: 'easy',
          totalRewardsEarned: { experience: 0, money: 0, items: 0 }
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = playerQuest.completedQuests.filter(
        q => q.completedAt && q.completedAt >= today
      ).length;

      // TODO: Calculer les vraies statistiques
      return {
        totalCompleted: playerQuest.completedQuests.length,
        activeQuests: playerQuest.activeQuests.length,
        completedToday,
        averageDifficulty: 'medium',
        totalRewardsEarned: {
          experience: 0, // TODO: Sommer depuis l'historique
          money: 0,
          items: 0
        }
      };

    } catch (error) {
      console.error('❌ [QuestReward] Erreur stats quêtes:', error);
      return {
        totalCompleted: 0,
        activeQuests: 0,
        completedToday: 0,
        averageDifficulty: 'easy',
        totalRewardsEarned: { experience: 0, money: 0, items: 0 }
      };
    }
  }
