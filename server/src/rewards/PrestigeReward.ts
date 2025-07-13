// server/src/rewards/PrestigeReward.ts

import { PlayerData } from '../models/PlayerData';
import { PokedexStats } from '../models/PokedexStats';
import { OwnedPokemon } from '../models/OwnedPokemon';
import { 
  ProcessedReward, 
  RewardNotification,
  SpecialEvent 
} from './types/RewardTypes';

// === INTERFACES DE PRESTIGE ===

export interface PrestigeRank {
  id: string;
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number;
  multipliers: {
    experience: number;
    money: number;
    captureRate: number;
    shinyOdds: number;
    friendshipGain: number;
  };
  privileges: string[];
  rewards: Array<{
    type: 'item' | 'money' | 'pokemon';
    itemId?: string;
    amount?: number;
    pokemonId?: number;
  }>;
  color: string;
  icon: string;
}

export interface PrestigeProgression {
  currentRank: PrestigeRank;
  currentPoints: number;
  nextRank?: PrestigeRank;
  pointsToNextRank: number;
  progressPercent: number;
  recentGains: Array<{
    source: string;
    points: number;
    timestamp: Date;
  }>;
}

export interface PrestigeUpdate {
  type: 'points_gained' | 'rank_up' | 'privilege_unlocked';
  playerId: string;
  oldPoints: number;
  newPoints: number;
  oldRank: string;
  newRank: string;
  pointsGained: number;
  newPrivileges: string[];
  notifications: RewardNotification[];
  specialEvents: SpecialEvent[];
}

export class PrestigeReward {
  
  // === RANGS DE PRESTIGE ===
  private readonly PRESTIGE_RANKS: PrestigeRank[] = [
    {
      id: 'novice',
      name: 'Novice',
      displayName: 'Dresseur Novice',
      minPoints: 0,
      maxPoints: 99,
      multipliers: {
        experience: 1.0,
        money: 1.0,
        captureRate: 1.0,
        shinyOdds: 1.0,
        friendshipGain: 1.0
      },
      privileges: ['basic_trading', 'basic_battles'],
      rewards: [],
      color: '#8B8B8B',
      icon: '🔰'
    },
    {
      id: 'trainer',
      name: 'Trainer',
      displayName: 'Dresseur',
      minPoints: 100,
      maxPoints: 499,
      multipliers: {
        experience: 1.05,
        money: 1.05,
        captureRate: 1.02,
        shinyOdds: 1.0,
        friendshipGain: 1.05
      },
      privileges: ['basic_trading', 'basic_battles', 'gym_challenges'],
      rewards: [
        { type: 'item', itemId: 'great_ball', amount: 10 },
        { type: 'money', amount: 1000 }
      ],
      color: '#4A90E2',
      icon: '⚡'
    },
    {
      id: 'ace_trainer',
      name: 'AceTrainer', 
      displayName: 'Dresseur As',
      minPoints: 500,
      maxPoints: 1499,
      multipliers: {
        experience: 1.1,
        money: 1.1,
        captureRate: 1.05,
        shinyOdds: 1.1,
        friendshipGain: 1.1
      },
      privileges: ['basic_trading', 'basic_battles', 'gym_challenges', 'elite_battles', 'breeding'],
      rewards: [
        { type: 'item', itemId: 'ultra_ball', amount: 5 },
        { type: 'item', itemId: 'exp_share', amount: 1 },
        { type: 'money', amount: 5000 }
      ],
      color: '#7B68EE',
      icon: '⭐'
    },
    {
      id: 'expert',
      name: 'Expert',
      displayName: 'Dresseur Expert',
      minPoints: 1500,
      maxPoints: 4999,
      multipliers: {
        experience: 1.15,
        money: 1.15,
        captureRate: 1.08,
        shinyOdds: 1.2,
        friendshipGain: 1.15
      },
      privileges: ['basic_trading', 'basic_battles', 'gym_challenges', 'elite_battles', 'breeding', 'tournaments', 'rare_spawns'],
      rewards: [
        { type: 'item', itemId: 'master_ball', amount: 1 },
        { type: 'item', itemId: 'luxury_ball', amount: 10 },
        { type: 'money', amount: 15000 }
      ],
      color: '#FF6B35',
      icon: '🏆'
    },
    {
      id: 'master',
      name: 'Master',
      displayName: 'Maître Dresseur',
      minPoints: 5000,
      maxPoints: 14999,
      multipliers: {
        experience: 1.2,
        money: 1.2,
        captureRate: 1.12,
        shinyOdds: 1.5,
        friendshipGain: 1.2
      },
      privileges: ['basic_trading', 'basic_battles', 'gym_challenges', 'elite_battles', 'breeding', 'tournaments', 'rare_spawns', 'legendary_quests', 'mentor_program'],
      rewards: [
        { type: 'item', itemId: 'master_ball', amount: 3 },
        { type: 'pokemon', pokemonId: 131 }, // Lapras
        { type: 'money', amount: 50000 }
      ],
      color: '#FFD700',
      icon: '👑'
    },
    {
      id: 'champion',
      name: 'Champion',
      displayName: 'Champion',
      minPoints: 15000,
      maxPoints: 99999999,
      multipliers: {
        experience: 1.25,
        money: 1.25,
        captureRate: 1.15,
        shinyOdds: 2.0,
        friendshipGain: 1.25
      },
      privileges: ['basic_trading', 'basic_battles', 'gym_challenges', 'elite_battles', 'breeding', 'tournaments', 'rare_spawns', 'legendary_quests', 'mentor_program', 'champion_battles', 'server_events'],
      rewards: [
        { type: 'item', itemId: 'master_ball', amount: 10 },
        { type: 'pokemon', pokemonId: 150 }, // Mewtwo
        { type: 'money', amount: 100000 }
      ],
      color: '#DC143C',
      icon: '🌟'
    }
  ];

  /**
   * 🏆 Met à jour le prestige d'un joueur
   */
  async updatePrestige(
    playerId: string, 
    pointsGained: number, 
    source: string
  ): Promise<ProcessedReward> {
    console.log(`🏆 [PrestigeReward] Mise à jour prestige ${playerId}: +${pointsGained} points (${source})`);

    try {
      // Récupérer les données actuelles
      const progression = await this.getPlayerPrestige(playerId);
      const oldRank = progression.currentRank;
      const oldPoints = progression.currentPoints;
      const newPoints = oldPoints + pointsGained;

      // Déterminer le nouveau rang
      const newRank = this.getRankByPoints(newPoints);
      const hasRankedUp = newRank.id !== oldRank.id;

      // Sauvegarder les nouveaux points
      await this.savePrestigePoints(playerId, newPoints, source);

      // Générer les notifications
      const notifications: RewardNotification[] = [];
      const specialEvents: SpecialEvent[] = [];

      // Notification de gain de points
      if (pointsGained > 0) {
        notifications.push({
          type: 'achievement',
          message: `+${pointsGained} points de prestige (${source})`,
          priority: 'low',
          data: {
            pointsGained,
            source,
            newTotal: newPoints
          }
        });
      }

      // Gestion de la montée de rang
      if (hasRankedUp) {
        const rankUpResult = await this.processRankUp(playerId, oldRank, newRank);
        notifications.push(...rankUpResult.notifications);
        specialEvents.push(...rankUpResult.specialEvents);
      }

      // Vérifications de milestones
      const milestoneEvents = this.checkPrestigeMilestones(newPoints, oldPoints);
      specialEvents.push(...milestoneEvents);

      const update: PrestigeUpdate = {
        type: hasRankedUp ? 'rank_up' : 'points_gained',
        playerId,
        oldPoints,
        newPoints,
        oldRank: oldRank.id,
        newRank: newRank.id,
        pointsGained,
        newPrivileges: hasRankedUp ? this.getNewPrivileges(oldRank, newRank) : [],
        notifications,
        specialEvents
      };

      console.log(`✅ [PrestigeReward] Prestige mis à jour: ${oldRank.name} -> ${newRank.name} (${newPoints} points)`);

      return {
        type: 'prestige',
        success: true,
        finalAmount: pointsGained,
        data: {
          update,
          hasRankedUp,
          newRank: newRank.displayName,
          multipliers: newRank.multipliers,
          notifications,
          specialEvents
        }
      };

    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur mise à jour prestige:', error);
      return {
        type: 'prestige',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🆙 Traite une montée de rang
   */
  private async processRankUp(
    playerId: string,
    oldRank: PrestigeRank,
    newRank: PrestigeRank
  ): Promise<{
    notifications: RewardNotification[];
    specialEvents: SpecialEvent[];
  }> {
    const notifications: RewardNotification[] = [];
    const specialEvents: SpecialEvent[] = [];

    // Notification principale de montée de rang
    notifications.push({
      type: 'achievement',
      message: `🎊 Félicitations ! Vous êtes maintenant ${newRank.displayName} !`,
      priority: 'high',
      animation: 'explosion',
      data: {
        oldRank: oldRank.id,
        newRank: newRank.id,
        rankUp: true
      }
    });

    // Événement spécial de montée de rang
    specialEvents.push({
      type: 'achievement',
      pokemonId: undefined,
      announcement: `Montée de rang : ${newRank.displayName} !`,
      animation: 'rank_up',
      rarity: this.getRankRarity(newRank.id),
      rewards: newRank.rewards
    });

    // Notifications des nouveaux privilèges
    const newPrivileges = this.getNewPrivileges(oldRank, newRank);
    if (newPrivileges.length > 0) {
      notifications.push({
        type: 'achievement',
        message: `Nouveaux privilèges débloqués : ${newPrivileges.join(', ')}`,
        priority: 'medium',
        data: {
          newPrivileges
        }
      });
    }

    // Notifications des multiplicateurs améliorés
    const multiplierImprovement = this.compareMultipliers(oldRank.multipliers, newRank.multipliers);
    if (multiplierImprovement.length > 0) {
      notifications.push({
        type: 'achievement',
        message: `Bonus améliorés : ${multiplierImprovement.join(', ')}`,
        priority: 'medium',
        data: {
          multipliers: newRank.multipliers
        }
      });
    }

    // Distribuer les récompenses de rang
    if (newRank.rewards.length > 0) {
      // TODO: Distribuer automatiquement les récompenses
      notifications.push({
        type: 'achievement',
        message: `Récompenses de rang reçues !`,
        priority: 'high',
        data: {
          rewards: newRank.rewards
        }
      });
    }

    return { notifications, specialEvents };
  }

  /**
   * 📊 Récupère la progression de prestige d'un joueur
   */
  async getPlayerPrestige(playerId: string): Promise<PrestigeProgression> {
    try {
      // TODO: Récupérer depuis une table dédiée au prestige
      // Pour l'instant, simuler avec des données par défaut
      const playerData = await PlayerData.findOne({ username: playerId });
      const currentPoints = (playerData as any)?.prestigePoints || 0;

      const currentRank = this.getRankByPoints(currentPoints);
      const nextRank = this.getNextRank(currentRank);
      const pointsToNextRank = nextRank ? nextRank.minPoints - currentPoints : 0;
      const progressPercent = nextRank ? 
        ((currentPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100 : 100;

      return {
        currentRank,
        currentPoints,
        nextRank,
        pointsToNextRank: Math.max(0, pointsToNextRank),
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        recentGains: [] // TODO: Récupérer l'historique récent
      };

    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur récupération prestige:', error);
      return {
        currentRank: this.PRESTIGE_RANKS[0],
        currentPoints: 0,
        pointsToNextRank: this.PRESTIGE_RANKS[1].minPoints,
        progressPercent: 0,
        recentGains: []
      };
    }
  }

  /**
   * 💾 Sauvegarde les points de prestige
   */
  private async savePrestigePoints(playerId: string, points: number, source: string): Promise<void> {
    try {
      // TODO: Sauvegarder dans une table dédiée
      // Pour l'instant, utiliser PlayerData
      await PlayerData.findOneAndUpdate(
        { username: playerId },
        { 
          $set: { prestigePoints: points },
          $push: { 
            prestigeHistory: {
              $each: [{ source, points, timestamp: new Date() }],
              $slice: -50 // Garder les 50 dernières entrées
            }
          }
        },
        { upsert: true }
      );

    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur sauvegarde prestige:', error);
      throw error;
    }
  }

  /**
   * 🏅 Obtient un rang par points
   */
  private getRankByPoints(points: number): PrestigeRank {
    for (let i = this.PRESTIGE_RANKS.length - 1; i >= 0; i--) {
      const rank = this.PRESTIGE_RANKS[i];
      if (points >= rank.minPoints) {
        return rank;
      }
    }
    return this.PRESTIGE_RANKS[0]; // Novice par défaut
  }

  /**
   * 📈 Obtient le rang suivant
   */
  private getNextRank(currentRank: PrestigeRank): PrestigeRank | undefined {
    const currentIndex = this.PRESTIGE_RANKS.findIndex(r => r.id === currentRank.id);
    return currentIndex < this.PRESTIGE_RANKS.length - 1 ? 
      this.PRESTIGE_RANKS[currentIndex + 1] : undefined;
  }

  /**
   * 🆕 Détermine les nouveaux privilèges
   */
  private getNewPrivileges(oldRank: PrestigeRank, newRank: PrestigeRank): string[] {
    return newRank.privileges.filter(privilege => !oldRank.privileges.includes(privilege));
  }

  /**
   * 📊 Compare les multiplicateurs
   */
  private compareMultipliers(oldMult: any, newMult: any): string[] {
    const improvements: string[] = [];
    
    Object.keys(newMult).forEach(key => {
      if (newMult[key] > oldMult[key]) {
        const improvement = ((newMult[key] - oldMult[key]) * 100).toFixed(1);
        improvements.push(`${key} +${improvement}%`);
      }
    });

    return improvements;
  }

  /**
   * 🎊 Vérifie les milestones de prestige
   */
  private checkPrestigeMilestones(newPoints: number, oldPoints: number): SpecialEvent[] {
    const events: SpecialEvent[] = [];
    const milestones = [1000, 2500, 5000, 10000, 25000, 50000];

    for (const milestone of milestones) {
      if (newPoints >= milestone && oldPoints < milestone) {
        events.push({
          type: 'achievement',
          announcement: `Milestone de prestige atteint : ${milestone} points !`,
          animation: 'milestone',
          rarity: milestone >= 10000 ? 'epic' : 'rare'
        });
      }
    }

    return events;
  }

  /**
   * 🎨 Détermine la rareté d'un rang
   */
  private getRankRarity(rankId: string): 'common' | 'rare' | 'epic' | 'legendary' {
    switch (rankId) {
      case 'novice':
      case 'trainer': return 'common';
      case 'ace_trainer': return 'rare';
      case 'expert': return 'epic';
      case 'master':
      case 'champion': return 'legendary';
      default: return 'common';
    }
  }

  // === MÉTHODES PUBLIQUES UTILITAIRES ===

  /**
   * 🎯 Calcule les points de prestige pour une action
   */
  calculatePrestigePoints(action: string, context: any = {}): number {
    const basePoints: Record<string, number> = {
      // Captures
      'pokemon_captured': 10,
      'new_species_captured': 25,
      'shiny_captured': 100,
      'legendary_captured': 500,
      
      // Combats
      'trainer_defeated': 5,
      'gym_leader_defeated': 50,
      'elite_four_defeated': 200,
      'champion_defeated': 1000,
      
      // Progression
      'pokemon_evolved': 15,
      'pokedex_completed': 2000,
      'level_100_reached': 100,
      
      // Social
      'trade_completed': 5,
      'battle_won_pvp': 10,
      'tournament_won': 500,
      
      // Achievements
      'achievement_unlocked': 25,
      'rare_achievement': 100,
      'legendary_achievement': 500
    };

    let points = basePoints[action] || 0;

    // Modificateurs contextuels
    if (context.difficulty === 'hard') points *= 1.5;
    if (context.difficulty === 'expert') points *= 2.0;
    if (context.isFirstTime) points *= 1.5;
    if (context.perfectExecution) points *= 1.2;

    return Math.floor(points);
  }

  /**
   * 🏆 Obtient les multiplicateurs de prestige actifs
   */
  async getPrestigeMultipliers(playerId: string): Promise<PrestigeRank['multipliers']> {
    try {
      const progression = await this.getPlayerPrestige(playerId);
      return progression.currentRank.multipliers;
    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur multiplicateurs:', error);
      return this.PRESTIGE_RANKS[0].multipliers;
    }
  }

  /**
   * 🔐 Vérifie si un joueur a un privilège
   */
  async hasPrivilege(playerId: string, privilege: string): Promise<boolean> {
    try {
      const progression = await this.getPlayerPrestige(playerId);
      return progression.currentRank.privileges.includes(privilege);
    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur vérification privilège:', error);
      return false;
    }
  }

  /**
   * 📋 Obtient tous les rangs disponibles
   */
  getAllRanks(): PrestigeRank[] {
    return [...this.PRESTIGE_RANKS];
  }

  /**
   * 🏅 Obtient les informations d'un rang spécifique
   */
  getRankInfo(rankId: string): PrestigeRank | undefined {
    return this.PRESTIGE_RANKS.find(rank => rank.id === rankId);
  }

  /**
   * 📊 Obtient le classement des joueurs par prestige
   */
  async getPrestigeLeaderboard(limit: number = 10): Promise<Array<{
    playerId: string;
    points: number;
    rank: string;
    displayName: string;
  }>> {
    try {
      // TODO: Implémenter avec une vraie requête de classement
      // Pour l'instant, retourner un tableau vide
      return [];
    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur classement:', error);
      return [];
    }
  }

  /**
   * 🎯 Suggère les prochains objectifs de prestige
   */
  async getPrestigeGoals(playerId: string): Promise<Array<{
    action: string;
    description: string;
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
  }>> {
    try {
      const progression = await this.getPlayerPrestige(playerId);
      const currentRank = progression.currentRank;

      // Suggérer des objectifs selon le rang actuel
      const goals = [];

      if (currentRank.id === 'novice') {
        goals.push(
          { action: 'capture_10_pokemon', description: 'Capturer 10 Pokémon', points: 100, difficulty: 'easy' as const, category: 'capture' },
          { action: 'defeat_gym_leader', description: 'Battre un Champion d\'Arène', points: 50, difficulty: 'medium' as const, category: 'battle' }
        );
      } else if (currentRank.id === 'trainer') {
        goals.push(
          { action: 'capture_shiny', description: 'Capturer un Pokémon chromatique', points: 100, difficulty: 'hard' as const, category: 'capture' },
          { action: 'evolve_5_pokemon', description: 'Faire évoluer 5 Pokémon', points: 75, difficulty: 'medium' as const, category: 'progression' }
        );
      }
      // ... etc pour les autres rangs

      return goals;

    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur objectifs:', error);
      return [];
    }
  }

  /**
   * 🔄 Réinitialise le prestige d'un joueur (admin)
   */
  async resetPrestige(playerId: string, newPoints: number = 0): Promise<boolean> {
    try {
      await this.savePrestigePoints(playerId, newPoints, 'admin_reset');
      console.log(`🔄 [PrestigeReward] Prestige réinitialisé pour ${playerId}: ${newPoints} points`);
      return true;
    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur réinitialisation:', error);
      return false;
    }
  }

  /**
   * 📈 Obtient l'historique récent de prestige
   */
  async getRecentPrestigeHistory(playerId: string, limit: number = 10): Promise<Array<{
    source: string;
    points: number;
    timestamp: Date;
    action: string;
  }>> {
    try {
      // TODO: Implémenter avec une vraie table d'historique
      return [];
    } catch (error) {
      console.error('❌ [PrestigeReward] Erreur historique:', error);
      return [];
    }
  }
}
