// server/src/rewards/EventReward.ts

import { PlayerData } from '../models/PlayerData';
import { ExperienceReward } from './ExperienceReward';
import { MoneyReward } from './MoneyReward';
import { ItemReward } from './ItemReward';
import { PokemonReward } from './PokemonReward';
import { 
  ProcessedReward, 
  RewardNotification,
  RewardResult,
  SpecialEvent 
} from './types/RewardTypes';

// === INTERFACES D'ÉVÉNEMENTS ===

interface EventDefinition {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special' | 'community';
  
  // Timing
  startDate: Date;
  endDate: Date;
  resetSchedule: 'daily' | 'weekly' | 'monthly' | 'never';
  
  // Conditions de participation
  requirements: {
    minLevel?: number;
    minPrestige?: number;
    requiredItems?: Array<{ itemId: string; quantity: number }>;
    requiredQuests?: string[];
    maxParticipations?: number;
  };
  
  // Récompenses
  rewards: {
    experience?: Array<{ pokemonId?: string; amount: number; multiplier?: number }>;
    money?: { amount: number; multiplier?: number };
    items?: Array<{ itemId: string; quantity: number; rarity?: string }>;
    pokemon?: Array<{ 
      pokemonId: number; 
      level: number; 
      shiny?: boolean; 
      ivs?: any;
      exclusive?: boolean; // Pokémon exclusif à l'événement
    }>;
    prestige?: number;
    special?: Array<{
      type: 'badge' | 'title' | 'cosmetic' | 'unlock';
      id: string;
      name: string;
    }>;
  };
  
  // Métadonnées
  isActive: boolean;
  participantCount?: number;
  maxParticipants?: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'legendary';
  category: 'login' | 'capture' | 'battle' | 'social' | 'exploration' | 'special';
}

interface PlayerEventProgress {
  eventId: string;
  participatedAt: Date;
  lastClaimAt?: Date;
  streak: number; // Pour les événements récurrents
  totalParticipations: number;
  rewardsReceived: string[];
}

export class EventReward {
  private experienceReward: ExperienceReward;
  private moneyReward: MoneyReward;
  private itemReward: ItemReward;
  private pokemonReward: PokemonReward;

  // Base de données des événements actifs
  private activeEvents: Map<string, EventDefinition> = new Map();
  
  // Cache des progressions des joueurs
  private playerProgressCache: Map<string, PlayerEventProgress[]> = new Map();

  constructor() {
    this.experienceReward = new ExperienceReward();
    this.moneyReward = new MoneyReward();
    this.itemReward = new ItemReward();
    this.pokemonReward = new PokemonReward();
    
    this.initializeEvents();
    this.startEventScheduler();
  }

  /**
   * 🎁 Traite la récompense quotidienne
   */
  async processDailyReward(playerId: string): Promise<RewardResult> {
    console.log(`🎁 [EventReward] Récompense quotidienne pour ${playerId}`);

    try {
      const today = new Date().toDateString();
      const lastClaim = await this.getLastDailyClaimDate(playerId);
      
      if (lastClaim === today) {
        return {
          success: false,
          error: 'Récompense quotidienne déjà réclamée aujourd\'hui',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      const streak = await this.calculateDailyStreak(playerId, lastClaim);
      const rewards = this.generateDailyRewards(streak);

      // Distribuer les récompenses
      const result = await this.distributeEventRewards(playerId, rewards, 'daily_login');

      // Sauvegarder la réclamation
      await this.saveDailyClaimDate(playerId, today, streak);

      // Ajouter notifications spéciales
      result.notifications.push({
        type: 'achievement',
        message: `📅 Récompense quotidienne réclamée ! (Série: ${streak} jours)`,
        priority: 'medium',
        animation: 'star',
        data: {
          streak,
          type: 'daily'
        }
      });

      // Bonus de série
      if (streak >= 7) {
        result.notifications.push({
          type: 'achievement',
          message: `🔥 Série de ${streak} jours ! Bonus spécial !`,
          priority: 'high',
          animation: 'explosion',
          data: {
            streak,
            bonus: true
          }
        });
      }

      console.log(`✅ [EventReward] Récompense quotidienne distribuée: série ${streak}`);
      return result;

    } catch (error) {
      console.error('❌ [EventReward] Erreur récompense quotidienne:', error);
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
   * 📅 Traite la récompense hebdomadaire
   */
  async processWeeklyReward(playerId: string): Promise<RewardResult> {
    console.log(`📅 [EventReward] Récompense hebdomadaire pour ${playerId}`);

    try {
      const thisWeek = this.getWeekIdentifier();
      const lastWeeklyClaim = await this.getLastWeeklyClaimWeek(playerId);
      
      if (lastWeeklyClaim === thisWeek) {
        return {
          success: false,
          error: 'Récompense hebdomadaire déjà réclamée cette semaine',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Vérifier les conditions (par exemple, 5 connexions dans la semaine)
      const weeklyActivity = await this.getWeeklyActivity(playerId);
      if (!weeklyActivity.qualifiesForReward) {
        return {
          success: false,
          error: `Activité insuffisante cette semaine (${weeklyActivity.daysActive}/5 requis)`,
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      const rewards = this.generateWeeklyRewards(weeklyActivity);
      const result = await this.distributeEventRewards(playerId, rewards, 'weekly_activity');

      // Sauvegarder la réclamation
      await this.saveWeeklyClaimWeek(playerId, thisWeek);

      result.notifications.push({
        type: 'achievement',
        message: `🗓️ Récompense hebdomadaire réclamée ! (${weeklyActivity.daysActive}/7 jours actifs)`,
        priority: 'high',
        animation: 'sparkle',
        data: {
          daysActive: weeklyActivity.daysActive,
          type: 'weekly'
        }
      });

      console.log(`✅ [EventReward] Récompense hebdomadaire distribuée: ${weeklyActivity.daysActive} jours actifs`);
      return result;

    } catch (error) {
      console.error('❌ [EventReward] Erreur récompense hebdomadaire:', error);
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
   * 🎊 Traite un événement saisonnier
   */
  async processSeasonalEvent(playerId: string, eventId: string): Promise<RewardResult> {
    console.log(`🎊 [EventReward] Événement saisonnier ${eventId} pour ${playerId}`);

    try {
      const eventDef = this.activeEvents.get(eventId);
      if (!eventDef || !eventDef.isActive) {
        return {
          success: false,
          error: 'Événement non disponible',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Vérifier les prérequis
      const meetsRequirements = await this.checkEventRequirements(playerId, eventDef);
      if (!meetsRequirements.eligible) {
        return {
          success: false,
          error: meetsRequirements.reason || 'Prérequis non remplis',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Vérifier si déjà participé
      const hasParticipated = await this.hasParticipatedInEvent(playerId, eventId);
      if (hasParticipated && eventDef.requirements.maxParticipations === 1) {
        return {
          success: false,
          error: 'Déjà participé à cet événement',
          processedRewards: [],
          totalExperience: 0,
          totalMoney: 0,
          totalFriendship: 0,
          itemsGiven: [],
          notifications: []
        };
      }

      // Distribuer les récompenses
      const result = await this.distributeEventRewards(playerId, eventDef.rewards, eventId);

      // Marquer la participation
      await this.markEventParticipation(playerId, eventId);

      // Notifications spéciales
      result.notifications.push({
        type: 'achievement',
        message: `🎊 Participation à l'événement "${eventDef.name}" !`,
        priority: 'high',
        animation: 'explosion',
        data: {
          eventId,
          eventName: eventDef.name,
          type: eventDef.type
        }
      });

      // Pokémon exclusifs
      const exclusivePokemon = eventDef.rewards.pokemon?.filter(p => p.exclusive);
      if (exclusivePokemon && exclusivePokemon.length > 0) {
        result.notifications.push({
          type: 'pokemon',
          message: `⭐ Pokémon exclusif d'événement obtenu !`,
          priority: 'high',
          animation: 'star',
          data: {
            exclusive: true,
            eventId
          }
        });
      }

      console.log(`✅ [EventReward] Événement ${eventId} complété pour ${playerId}`);
      return result;

    } catch (error) {
      console.error('❌ [EventReward] Erreur événement saisonnier:', error);
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
   * 🎁 Distribue les récompenses d'événement
   */
  private async distributeEventRewards(
    playerId: string,
    rewards: EventDefinition['rewards'],
    eventId: string
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
      // === EXPÉRIENCE ===
      if (rewards.experience) {
        for (const expReward of rewards.experience) {
          const processed = await this.experienceReward.giveExperience(playerId, {
            type: 'experience',
            pokemonId: expReward.pokemonId,
            baseAmount: expReward.amount,
            multipliers: {
              event: expReward.multiplier || 1.0
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
          amount: rewards.money.amount,
          multipliers: {
            event: rewards.money.multiplier || 1.0
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
            source: 'gift',
            rarity: itemReward.rarity as any
          });
          
          if (processed.success && processed.data) {
            result.itemsGiven.push({
              itemId: processed.data.itemId,
              quantity: processed.data.quantity,
              pocket: processed.data.pocket || 'items',
              rarity: itemReward.rarity
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
              ivs: pokemonReward.ivs,
              friendship: 120 // Pokémon d'événement commencent avec plus d'amitié
            }
          });
          
          if (processed.success) {
            result.processedRewards.push(processed);
          }
        }
      }

      // === RÉCOMPENSES SPÉCIALES ===
      if (rewards.special) {
        for (const specialReward of rewards.special) {
          await this.giveSpecialReward(playerId, specialReward, eventId);
          
          result.notifications.push({
            type: 'achievement',
            message: `🏆 Récompense spéciale obtenue : ${specialReward.name}`,
            priority: 'high',
            data: {
              specialReward,
              eventId
            }
          });
        }
      }

      return result;

    } catch (error) {
      console.error('❌ [EventReward] Erreur distribution récompenses événement:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Erreur inconnue';
      return result;
    }
  }

  /**
   * 🎯 Génère les récompenses quotidiennes selon la série
   */
  private generateDailyRewards(streak: number): EventDefinition['rewards'] {
    const baseRewards: EventDefinition['rewards'] = {
      experience: [{ amount: 100 * Math.min(streak, 7) }],
      money: { amount: 500 * Math.min(streak, 7) },
      items: [{ itemId: 'poke_ball', quantity: 3 }]
    };

    // Bonus de série
    if (streak >= 3) {
      baseRewards.items!.push({ itemId: 'potion', quantity: 2 });
    }
    if (streak >= 7) {
      baseRewards.items!.push({ itemId: 'great_ball', quantity: 5 });
      baseRewards.prestige = 25;
    }
    if (streak >= 14) {
      baseRewards.items!.push({ itemId: 'ultra_ball', quantity: 3 });
      baseRewards.prestige = 50;
    }
    if (streak >= 30) {
      baseRewards.items!.push({ itemId: 'master_ball', quantity: 1 });
      baseRewards.prestige = 100;
      baseRewards.special = [{
        type: 'title',
        id: 'daily_dedication',
        name: 'Dévouement Quotidien'
      }];
    }

    return baseRewards;
  }

  /**
   * 📅 Génère les récompenses hebdomadaires selon l'activité
   */
  private generateWeeklyRewards(activity: { daysActive: number; totalActions: number }): EventDefinition['rewards'] {
    const multiplier = Math.min(activity.daysActive / 7, 1);
    
    return {
      experience: [{ amount: Math.floor(1000 * multiplier) }],
      money: { amount: Math.floor(5000 * multiplier) },
      items: [
        { itemId: 'great_ball', quantity: Math.floor(10 * multiplier) },
        { itemId: 'super_potion', quantity: Math.floor(5 * multiplier) }
      ],
      prestige: Math.floor(100 * multiplier)
    };
  }

  /**
   * 🏆 Donne une récompense spéciale
   */
  private async giveSpecialReward(
    playerId: string,
    specialReward: EventDefinition['rewards']['special']![0],
    eventId: string
  ): Promise<void> {
    try {
      // TODO: Implémenter selon le type de récompense spéciale
      switch (specialReward.type) {
        case 'badge':
          // Ajouter un badge au profil du joueur
          break;
        case 'title':
          // Ajouter un titre au joueur
          break;
        case 'cosmetic':
          // Ajouter un cosmétique
          break;
        case 'unlock':
          // Débloquer une fonctionnalité
          break;
      }

      console.log(`🏆 [EventReward] Récompense spéciale ${specialReward.type} donnée: ${specialReward.name}`);

    } catch (error) {
      console.error('❌ [EventReward] Erreur récompense spéciale:', error);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * 📊 Calcule la série quotidienne
   */
  private async calculateDailyStreak(playerId: string, lastClaimDate: string | null): Promise<number> {
    try {
      if (!lastClaimDate) return 1; // Premier jour

      const lastClaim = new Date(lastClaimDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Si la dernière réclamation était hier, continuer la série
      if (lastClaim.toDateString() === yesterday.toDateString()) {
        // TODO: Récupérer la vraie série depuis la base de données
        return await this.getCurrentStreak(playerId) + 1;
      } else {
        // Série cassée, recommencer
        return 1;
      }

    } catch (error) {
      console.error('❌ [EventReward] Erreur calcul série:', error);
      return 1;
    }
  }

  /**
   * 📈 Obtient l'activité hebdomadaire
   */
  private async getWeeklyActivity(playerId: string): Promise<{
    daysActive: number;
    totalActions: number;
    qualifiesForReward: boolean;
  }> {
    try {
      // TODO: Implémenter le tracking d'activité réel
      // Pour l'instant, simuler
      const daysActive = Math.floor(Math.random() * 7) + 1;
      
      return {
        daysActive,
        totalActions: daysActive * 10,
        qualifiesForReward: daysActive >= 5 // 5 jours minimum
      };

    } catch (error) {
      console.error('❌ [EventReward] Erreur activité hebdomadaire:', error);
      return {
        daysActive: 0,
        totalActions: 0,
        qualifiesForReward: false
      };
    }
  }

  /**
   * ✅ Vérifie les prérequis d'un événement
   */
  private async checkEventRequirements(
    playerId: string,
    eventDef: EventDefinition
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const requirements = eventDef.requirements;

      // Vérifier le niveau minimum
      if (requirements.minLevel) {
        // TODO: Récupérer le niveau du joueur
        const playerLevel = 10; // Placeholder
        if (playerLevel < requirements.minLevel) {
          return {
            eligible: false,
            reason: `Niveau ${requirements.minLevel} requis`
          };
        }
      }

      // Vérifier les objets requis
      if (requirements.requiredItems) {
        for (const item of requirements.requiredItems) {
          const hasItem = await this.itemReward.hasItem(playerId, item.itemId, item.quantity);
          if (!hasItem) {
            return {
              eligible: false,
              reason: `${item.quantity}x ${item.itemId} requis`
            };
          }
        }
      }

      return { eligible: true };

    } catch (error) {
      console.error('❌ [EventReward] Erreur vérification prérequis:', error);
      return {
        eligible: false,
        reason: 'Erreur de vérification'
      };
    }
  }

  // === PERSISTANCE (MÉTHODES SIMPLIFIÉES) ===

  private async getLastDailyClaimDate(playerId: string): Promise<string | null> {
    // TODO: Récupérer depuis la base de données
    return null;
  }

  private async saveDailyClaimDate(playerId: string, date: string, streak: number): Promise<void> {
    // TODO: Sauvegarder en base de données
  }

  private async getCurrentStreak(playerId: string): Promise<number> {
    // TODO: Récupérer depuis la base de données
    return 1;
  }

  private getWeekIdentifier(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }

  private async getLastWeeklyClaimWeek(playerId: string): Promise<string | null> {
    // TODO: Récupérer depuis la base de données
    return null;
  }

  private async saveWeeklyClaimWeek(playerId: string, week: string): Promise<void> {
    // TODO: Sauvegarder en base de données
  }

  private async hasParticipatedInEvent(playerId: string, eventId: string): Promise<boolean> {
    // TODO: Vérifier en base de données
    return false;
  }

  private async markEventParticipation(playerId: string, eventId: string): Promise<void> {
    // TODO: Marquer en base de données
  }

  // === INITIALISATION ===

  /**
   * 🎪 Initialise les événements par défaut
   */
  private initializeEvents(): void {
    const events: EventDefinition[] = [
      {
        id: 'summer_festival',
        name: 'Festival d\'Été',
        description: 'Événement estival avec des Pokémon Feu rares',
        type: 'seasonal',
        startDate: new Date('2024-06-21'),
        endDate: new Date('2024-09-21'),
        resetSchedule: 'never',
        requirements: {
          minLevel: 10
        },
        rewards: {
          pokemon: [{
            pokemonId: 4, // Charmander
            level: 15,
            shiny: false,
            exclusive: true
          }],
          items: [
            { itemId: 'fire_stone', quantity: 3 },
            { itemId: 'ultra_ball', quantity: 10 }
          ],
          prestige: 200
        },
        isActive: true,
        difficulty: 'medium',
        category: 'special'
      },
      {
        id: 'community_day',
        name: 'Journée Communautaire',
        description: 'Événement mensuel avec bonus XP',
        type: 'community',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        resetSchedule: 'monthly',
        requirements: {},
        rewards: {
          experience: [{ amount: 2000, multiplier: 2.0 }],
          money: { amount: 10000, multiplier: 1.5 },
          items: [
            { itemId: 'lucky_egg', quantity: 1, rarity: 'epic' },
            { itemId: 'incense', quantity: 3, rarity: 'rare' }
          ]
        },
        isActive: true,
        difficulty: 'easy',
        category: 'social'
      }
    ];

    events.forEach(event => {
      this.activeEvents.set(event.id, event);
    });

    console.log(`🎪 [EventReward] ${events.length} événements initialisés`);
  }

  /**
   * ⏰ Démarre le planificateur d'événements
   */
  private startEventScheduler(): void {
    // Vérifier les événements toutes les heures
    setInterval(() => {
      this.updateEventStatus();
    }, 3600000); // 1 heure

    console.log('⏰ [EventReward] Planificateur d\'événements démarré');
  }

  /**
   * 🔄 Met à jour le statut des événements
   */
  private updateEventStatus(): void {
    const now = new Date();
    
    this.activeEvents.forEach((event, eventId) => {
      if (now > event.endDate && event.isActive) {
        event.isActive = false;
        console.log(`🔚 [EventReward] Événement ${eventId} terminé`);
      } else if (now >= event.startDate && now <= event.endDate && !event.isActive) {
        event.isActive = true;
        console.log(`🎉 [EventReward] Événement ${eventId} démarré`);
      }
    });
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * 📋 Obtient tous les événements actifs
   */
  getActiveEvents(): EventDefinition[] {
    return Array.from(this.activeEvents.values()).filter(event => event.isActive);
  }

  /**
   * 📅 Obtient les statuts des récompenses pour un joueur
   */
  async getRewardStatus(playerId: string): Promise<{
    daily: { available: boolean; streak: number; nextReset: Date };
    weekly: { available: boolean; daysActive: number; nextReset: Date };
    events: Array<{ eventId: string; name: string; available: boolean; participated: boolean }>;
  }> {
    try {
      const dailyAvailable = await this.getLastDailyClaimDate(playerId) !== new Date().toDateString();
      const weeklyAvailable = await this.getLastWeeklyClaimWeek(playerId) !== this.getWeekIdentifier();
      
      const events = [];
      for (const [eventId, event] of this.activeEvents.entries()) {
        if (event.isActive) {
          const participated = await this.hasParticipatedInEvent(playerId, eventId);
          events.push({
            eventId,
            name: event.name,
            available: !participated || (event.requirements.maxParticipations || 1) > 1,
            participated
          });
        }
      }

      return {
        daily: {
          available: dailyAvailable,
          streak: await this.getCurrentStreak(playerId),
          nextReset: this.getNextDailyReset()
        },
        weekly: {
          available: weeklyAvailable,
          daysActive: (await this.getWeeklyActivity(playerId)).daysActive,
          nextReset: this.getNextWeeklyReset()
        },
        events
      };

    } catch (error) {
      console.error('❌ [EventReward] Erreur statut récompenses:', error);
      return {
        daily: { available: false, streak: 0, nextReset: new Date() },
        weekly: { available: false, daysActive: 0, nextReset: new Date() },
        events: []
      };
    }
  }

  private getNextDailyReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private getNextWeeklyReset(): Date {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
  }
}
