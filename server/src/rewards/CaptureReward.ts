// server/src/rewards/CaptureReward.ts

import { OwnedPokemon } from '../models/OwnedPokemon';
import { PokedexEntry } from '../models/PokedexEntry';
import { PokedexStats } from '../models/PokedexStats';
import { ItemReward } from './ItemReward';
import { FriendshipReward } from './FriendshipReward';
import { getPokemonById } from '../data/PokemonData';
import { 
  CaptureReward as CaptureRewardType, 
  ProcessedReward, 
  RewardNotification,
  CaptureCalculation,
  ItemReward as ItemRewardType,
  CAPTURE_BONUSES,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

export class CaptureReward {
  private itemReward: ItemReward;
  private friendshipReward: FriendshipReward;

  constructor() {
    this.itemReward = new ItemReward();
    this.friendshipReward = new FriendshipReward();
  }

  /**
   * 🎯 Traite les récompenses de capture complètes
   */
  async processCaptureRewards(playerId: string, reward: CaptureRewardType): Promise<ProcessedReward> {
    console.log(`🎯 [CaptureReward] Traitement capture pour ${playerId}: Pokémon #${reward.pokemonId}`);

    try {
      // Calculer tous les bonus de capture
      const calculation = await this.calculateCaptureRewards(playerId, reward);

      if (!calculation) {
        return {
          type: 'capture',
          success: false,
          error: 'Erreur de calcul des récompenses de capture'
        };
      }

      // Appliquer les récompenses
      await this.applyCaptureRewards(playerId, calculation);

      // Générer les notifications
      const notifications = this.generateCaptureNotifications(calculation);

      // Calculer le total des récompenses
      const totalValue = calculation.bonuses.experience + calculation.bonuses.money + 
                        calculation.bonuses.friendship + calculation.bonuses.prestige;

      console.log(`✅ [CaptureReward] Capture ${playerId}: ${totalValue} points de valeur total`);

      return {
        type: 'capture',
        success: true,
        finalAmount: totalValue,
        data: {
          calculation,
          notifications,
          criticalCapture: calculation.criticalCapture,
          bonusesApplied: Object.keys(calculation.bonuses).length
        }
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur traitement capture:', error);
      return {
        type: 'capture',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🧮 Calcule tous les bonus de capture
   */
  private async calculateCaptureRewards(
    playerId: string, 
    captureData: CaptureRewardType
  ): Promise<CaptureCalculation | null> {
    try {
      const { pokemonId, level, ballUsed, captureDetails } = captureData;

      // Vérifier si c'est une nouvelle espèce
      const isNewSpecies = await this.checkNewSpecies(playerId, pokemonId);
      
      // Obtenir les statistiques du Pokédex pour les bonus de progression
      const pokedexStats = await PokedexStats.findOrCreate(playerId);
      const completionRate = pokedexStats.caughtPercentage / 100;

      // === CALCUL DES BONUS ===
      const calculation: CaptureCalculation = {
        pokemonId,
        ballUsed,
        attempts: captureDetails.pokeBallsUsed,
        criticalCapture: captureDetails.isCriticalCapture,
        bonuses: {
          experience: 0,
          money: 0,
          friendship: 0,
          items: [],
          prestige: 0
        },
        notifications: []
      };

      // === BONUS D'EXPÉRIENCE DE BASE ===
      let baseExp = 50 + (level * 2); // Base + niveau
      calculation.bonuses.experience = baseExp;

      // === BONUS SELON LES CONDITIONS ===

      // 1. CAPTURE CRITIQUE (5% de chance de base)
      if (captureDetails.isCriticalCapture) {
        calculation.bonuses.experience *= CAPTURE_BONUSES.criticalCapture.expBonus;
        calculation.bonuses.money += CAPTURE_BONUSES.criticalCapture.moneyBonus;
        calculation.bonuses.friendship += CAPTURE_BONUSES.criticalCapture.friendshipBonus;
        
        console.log(`✨ [CaptureReward] Capture critique détectée !`);
      }

      // 2. NOUVELLE ESPÈCE
      if (isNewSpecies) {
        calculation.bonuses.experience *= CAPTURE_BONUSES.newSpecies.expBonus;
        calculation.bonuses.money += CAPTURE_BONUSES.newSpecies.moneyBonus;
        calculation.bonuses.friendship += CAPTURE_BONUSES.newSpecies.friendshipBonus;
        
        // Objets bonus pour nouvelle espèce
        for (const itemId of CAPTURE_BONUSES.newSpecies.itemRewards) {
          calculation.bonuses.items.push({
            type: 'item',
            itemId,
            quantity: 1
          });
        }

        console.log(`🆕 [CaptureReward] Nouvelle espèce capturée !`);
      }

      // 3. POKÉMON SHINY
      if (captureDetails.isShiny) {
        calculation.bonuses.experience *= CAPTURE_BONUSES.shinyCapture.expBonus;
        calculation.bonuses.money += CAPTURE_BONUSES.shinyCapture.moneyBonus;
        calculation.bonuses.friendship += CAPTURE_BONUSES.shinyCapture.friendshipBonus;
        calculation.bonuses.prestige += CAPTURE_BONUSES.shinyCapture.prestigeBonus;
        
        // Objets spéciaux pour shiny
        for (const itemId of CAPTURE_BONUSES.shinyCapture.itemRewards) {
          calculation.bonuses.items.push({
            type: 'item',
            itemId,
            quantity: 1
          });
        }

        console.log(`⭐ [CaptureReward] Pokémon shiny capturé !`);
      }

      // 4. CAPTURE EN UNE BALL
      if (captureDetails.pokeBallsUsed === 1) {
        calculation.bonuses.experience *= CAPTURE_BONUSES.quickCapture.expBonus;
        calculation.bonuses.money += CAPTURE_BONUSES.quickCapture.moneyBonus;
        calculation.bonuses.friendship += CAPTURE_BONUSES.quickCapture.friendshipBonus;

        console.log(`🎯 [CaptureReward] Capture du premier coup !`);
      }

      // 5. POKÉMON AFFAIBLI CORRECTEMENT
      if (captureDetails.weakenedProperly) {
        calculation.bonuses.experience *= CAPTURE_BONUSES.weakenedCapture.expBonus;
        calculation.bonuses.friendship += CAPTURE_BONUSES.weakenedCapture.friendshipBonus;
      }

      // 6. BONUS DE PROGRESSION DU POKÉDEX
      const progressBonus = this.calculateProgressionBonus(completionRate, level);
      calculation.bonuses.experience += progressBonus.experience;
      calculation.bonuses.money += progressBonus.money;

      // 7. BONUS DE STREAK DE CAPTURE
      const streakBonus = this.calculateStreakBonus(captureDetails.captureStreak);
      calculation.bonuses.experience *= streakBonus.experienceMultiplier;
      calculation.bonuses.money *= streakBonus.moneyMultiplier;

      // 8. BONUS SELON LA BALL UTILISÉE
      const ballBonus = this.calculateBallBonus(ballUsed, level);
      calculation.bonuses.experience += ballBonus.experience;
      calculation.bonuses.money += ballBonus.money;
      calculation.bonuses.friendship += ballBonus.friendship;

      // === ARRONDIR LES VALEURS ===
      calculation.bonuses.experience = Math.floor(calculation.bonuses.experience);
      calculation.bonuses.money = Math.floor(calculation.bonuses.money);
      calculation.bonuses.friendship = Math.floor(calculation.bonuses.friendship);
      calculation.bonuses.prestige = Math.floor(calculation.bonuses.prestige);

      return calculation;

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur calcul récompenses capture:', error);
      return null;
    }
  }

  /**
   * 💾 Applique les récompenses calculées
   */
  private async applyCaptureRewards(playerId: string, calculation: CaptureCalculation): Promise<void> {
    try {
      // 1. Distribuer les objets
      for (const item of calculation.bonuses.items) {
        await this.itemReward.giveItem(playerId, item);
      }

      // 2. Appliquer l'amitié (si on a l'ID du Pokémon capturé)
      // Note: Il faudrait passer l'ID du Pokémon nouvellement créé
      // Pour l'instant on skip cette partie car on n'a pas l'ID

      // 3. Mettre à jour les statistiques de prestige
      if (calculation.bonuses.prestige > 0) {
        await this.updatePrestigePoints(playerId, calculation.bonuses.prestige);
      }

      console.log(`✅ [CaptureReward] Récompenses appliquées pour ${playerId}`);

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur application récompenses:', error);
      throw error;
    }
  }

  /**
   * 🔔 Génère les notifications de capture
   */
  private generateCaptureNotifications(calculation: CaptureCalculation): RewardNotification[] {
    const notifications: RewardNotification[] = [];

    // Notification principale de capture
    if (calculation.bonuses.experience > 0) {
      notifications.push({
        type: 'capture',
        message: `Pokémon capturé ! +${calculation.bonuses.experience} XP de capture !`,
        priority: 'medium',
        animation: 'sparkle',
        data: {
          pokemonId: calculation.pokemonId,
          experienceGained: calculation.bonuses.experience
        }
      });
    }

    // Notification capture critique
    if (calculation.criticalCapture) {
      notifications.push({
        type: 'capture',
        message: `Capture critique ! Bonus exceptionnels obtenus !`,
        priority: 'high',
        animation: 'explosion',
        data: {
          criticalCapture: true,
          bonusMultiplier: CAPTURE_BONUSES.criticalCapture.expBonus
        }
      });
    }

    // Notification argent bonus
    if (calculation.bonuses.money > 0) {
      notifications.push({
        type: 'money',
        message: `Bonus de capture : +${calculation.bonuses.money} PokéDollars !`,
        priority: 'medium',
        data: {
          source: 'capture',
          amount: calculation.bonuses.money
        }
      });
    }

    // Notification objets bonus
    if (calculation.bonuses.items.length > 0) {
      notifications.push({
        type: 'item',
        message: `Objets bonus de capture obtenus !`,
        priority: 'medium',
        data: {
          itemCount: calculation.bonuses.items.length,
          items: calculation.bonuses.items
        }
      });
    }

    // Notification prestige
    if (calculation.bonuses.prestige > 0) {
      notifications.push({
        type: 'achievement',
        message: `Prestige de dresseur augmenté ! (+${calculation.bonuses.prestige} points)`,
        priority: 'medium',
        data: {
          prestigeGained: calculation.bonuses.prestige
        }
      });
    }

    return notifications;
  }

  // === MÉTHODES DE CALCUL SPÉCIALISÉES ===

  /**
   * 🆕 Vérifie si c'est une nouvelle espèce pour le joueur
   */
  private async checkNewSpecies(playerId: string, pokemonId: number): Promise<boolean> {
    try {
      const entry = await PokedexEntry.findOne({ playerId, pokemonId });
      return !entry || !entry.isCaught; // Nouvelle espèce si pas d'entrée ou pas encore capturée
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur vérification nouvelle espèce:', error);
      return false;
    }
  }

  /**
   * 📊 Calcule le bonus de progression du Pokédex
   */
  private calculateProgressionBonus(completionRate: number, pokemonLevel: number): {
    experience: number;
    money: number;
  } {
    let multiplier = 1.0;

    // Bonus selon le taux de complétion
    if (completionRate >= 0.9) {        // 90%+ : Expert
      multiplier = 1.5;
    } else if (completionRate >= 0.75) { // 75%+ : Avancé
      multiplier = 1.3;
    } else if (completionRate >= 0.5) {  // 50%+ : Intermédiaire
      multiplier = 1.2;
    } else if (completionRate >= 0.25) { // 25%+ : Débutant avancé
      multiplier = 1.1;
    }

    const baseBonus = pokemonLevel * 2;
    
    return {
      experience: Math.floor(baseBonus * multiplier),
      money: Math.floor(baseBonus * multiplier * 0.5)
    };
  }

  /**
   * 🔥 Calcule le bonus de streak de capture
   */
  private calculateStreakBonus(captureStreak: number): {
    experienceMultiplier: number;
    moneyMultiplier: number;
  } {
    let expMult = 1.0;
    let moneyMult = 1.0;

    if (captureStreak >= 50) {      // 50+ captures : Maître captureur
      expMult = 1.3;
      moneyMult = 1.4;
    } else if (captureStreak >= 25) { // 25+ captures : Expert
      expMult = 1.2;
      moneyMult = 1.3;
    } else if (captureStreak >= 10) { // 10+ captures : Expérimenté
      expMult = 1.15;
      moneyMult = 1.2;
    } else if (captureStreak >= 5) {  // 5+ captures : En forme
      expMult = 1.1;
      moneyMult = 1.1;
    }

    return {
      experienceMultiplier: expMult,
      moneyMultiplier: moneyMult
    };
  }

  /**
   * ⚾ Calcule le bonus selon la Ball utilisée
   */
  private calculateBallBonus(ballUsed: string, pokemonLevel: number): {
    experience: number;
    money: number;
    friendship: number;
  } {
    const baseBonusPerLevel = 2;

    const ballBonuses: Record<string, { exp: number; money: number; friendship: number }> = {
      'poke_ball': { exp: 1.0, money: 1.0, friendship: 0 },
      'great_ball': { exp: 1.1, money: 1.1, friendship: 2 },
      'ultra_ball': { exp: 1.2, money: 1.2, friendship: 5 },
      'master_ball': { exp: 2.0, money: 2.0, friendship: 20 }, // Bonus énorme pour Master Ball
      'luxury_ball': { exp: 1.1, money: 1.0, friendship: 10 }, // Spécialisé amitié
      'timer_ball': { exp: 1.0, money: 1.0, friendship: 0 },   // Variable selon le temps
      'net_ball': { exp: 1.1, money: 1.1, friendship: 3 },     // Bonus Bug/Water
      'dive_ball': { exp: 1.1, money: 1.1, friendship: 3 },    // Bonus sous l'eau
      'nest_ball': { exp: 1.2, money: 1.0, friendship: 5 },    // Bonus Pokémon faibles
      'repeat_ball': { exp: 1.1, money: 1.0, friendship: 0 },  // Bonus espèces déjà vues
      'safari_ball': { exp: 1.3, money: 1.5, friendship: 8 }   // Bonus Safari Zone
    };

    const bonusData = ballBonuses[ballUsed] || ballBonuses['poke_ball'];
    
    return {
      experience: Math.floor(baseBonusPerLevel * pokemonLevel * bonusData.exp),
      money: Math.floor(baseBonusPerLevel * pokemonLevel * bonusData.money * 0.5),
      friendship: bonusData.friendship
    };
  }

  /**
   * 🏆 Met à jour les points de prestige du joueur
   */
  private async updatePrestigePoints(playerId: string, points: number): Promise<void> {
    try {
      // TODO: Implémenter le système de prestige dans PlayerData ou créer un modèle séparé
      console.log(`🏆 [CaptureReward] ${playerId} gagne ${points} points de prestige`);
      
      // Pour l'instant on log seulement, à implémenter plus tard
      
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur mise à jour prestige:', error);
    }
  }

  // === MÉTHODES UTILITAIRES PUBLIQUES ===

  /**
   * 🎲 Détermine si une capture est critique
   */
  public rollCriticalCapture(ballUsed: string, pokemonLevel: number, playerPrestige: number = 0): boolean {
    let baseRate = REWARD_CONSTANTS.CRITICAL_CAPTURE_BASE_RATE;

    // Bonus selon la Ball
    const ballMultipliers: Record<string, number> = {
      'ultra_ball': 1.5,
      'master_ball': 0, // Master Ball ne peut pas être critique (capture garantie)
      'timer_ball': 1.2,
      'luxury_ball': 1.3
    };

    if (ballMultipliers[ballUsed]) {
      baseRate *= ballMultipliers[ballUsed];
    }

    // Bonus de prestige
    baseRate += (playerPrestige * 0.001); // +0.1% par point de prestige

    // Bonus niveau faible (plus facile sur Pokémon faibles)
    if (pokemonLevel <= 10) {
      baseRate *= 1.5;
    } else if (pokemonLevel <= 20) {
      baseRate *= 1.2;
    }

    return Math.random() < baseRate;
  }

  /**
   * 📊 Calcule la difficulté de capture pour les bonus
   */
  public calculateCaptureDifficulty(
    pokemonId: number, 
    level: number, 
    currentHp: number, 
    maxHp: number,
    status: string
  ): {
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    difficultyMultiplier: number;
  } {
    let difficulty = 0;

    // TODO: Récupérer le catch rate du Pokémon depuis PokemonData
    const baseCatchRate = 255; // Placeholder, à remplacer par vraie valeur

    // Facteurs de difficulté
    const catchRate = baseCatchRate;
    const hpRatio = currentHp / maxHp;
    const levelFactor = level / 100;
    const statusFactor = status !== 'normal' ? 0.5 : 1.0;

    // Calcul simplifié de difficulté
    difficulty = (1 - (catchRate / 255)) + levelFactor + (hpRatio * statusFactor);

    let difficultyLevel: 'easy' | 'medium' | 'hard' | 'extreme';
    let multiplier: number;

    if (difficulty <= 0.3) {
      difficultyLevel = 'easy';
      multiplier = 1.0;
    } else if (difficulty <= 0.6) {
      difficultyLevel = 'medium';
      multiplier = 1.2;
    } else if (difficulty <= 0.9) {
      difficultyLevel = 'hard';
      multiplier = 1.5;
    } else {
      difficultyLevel = 'extreme';
      multiplier = 2.0;
    }

    return {
      difficulty: difficultyLevel,
      difficultyMultiplier: multiplier
    };
  }

  /**
   * 🎁 Génère des objets bonus selon les conditions de capture
   */
  public generateBonusItems(
    pokemonId: number,
    captureConditions: {
      isCritical: boolean;
      isNewSpecies: boolean;
      isShiny: boolean;
      isQuickCapture: boolean;
      difficulty: string;
    }
  ): ItemRewardType[] {
    const bonusItems: ItemRewardType[] = [];

    // Objets de base selon la rareté du Pokémon
    if (this.isRarePokemon(pokemonId)) {
      bonusItems.push({
        type: 'item',
        itemId: 'ultra_ball',
        quantity: 1,
        rarity: 'rare'
      });
    }

    // Objets pour capture critique
    if (captureConditions.isCritical) {
      bonusItems.push({
        type: 'item',
        itemId: 'max_potion',
        quantity: 1,
        rarity: 'uncommon'
      });
    }

    // Objets pour nouvelle espèce
    if (captureConditions.isNewSpecies) {
      bonusItems.push({
        type: 'item',
        itemId: 'poke_ball',
        quantity: 3,
        rarity: 'common'
      });
    }

    // Objets pour Pokémon shiny
    if (captureConditions.isShiny) {
      bonusItems.push({
        type: 'item',
        itemId: 'full_restore',
        quantity: 1,
        rarity: 'epic'
      });
      bonusItems.push({
        type: 'item',
        itemId: 'luxury_ball',
        quantity: 1,
        rarity: 'rare'
      });
    }

    // Objets pour capture rapide
    if (captureConditions.isQuickCapture) {
      bonusItems.push({
        type: 'item',
        itemId: 'great_ball',
        quantity: 2,
        rarity: 'uncommon'
      });
    }

    // Objets selon la difficulté
    if (captureConditions.difficulty === 'extreme') {
      bonusItems.push({
        type: 'item',
        itemId: 'master_ball',
        quantity: 1,
        rarity: 'legendary'
      });
    } else if (captureConditions.difficulty === 'hard') {
      bonusItems.push({
        type: 'item',
        itemId: 'timer_ball',
        quantity: 2,
        rarity: 'rare'
      });
    }

    return bonusItems;
  }

  /**
   * 🔍 Détermine si un Pokémon est rare
   */
  private isRarePokemon(pokemonId: number): boolean {
    // Liste des Pokémon rares (légendaires, pseudo-légendaires, etc.)
    const rarePokemon = [
      144, 145, 146, 150, 151, // Oiseaux légendaires + Mew/Mewtwo
      243, 244, 245, 249, 250, 251, // Johto légendaires
      377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Hoenn légendaires
      // Ajouter d'autres selon les générations supportées
    ];

    const pseudoLegendaries = [
      149, // Dragonite line
      248, // Tyranitar line
      376, // Metagross line
      // etc.
    ];

    return rarePokemon.includes(pokemonId) || pseudoLegendaries.includes(pokemonId);
  }

  /**
   * 📈 Obtient les statistiques de capture d'un joueur
   */
  async getPlayerCaptureStats(playerId: string): Promise<{
    totalCaptures: number;
    criticalCaptures: number;
    newSpeciesCaptures: number;
    shinyCaptures: number;
    currentStreak: number;
    longestStreak: number;
    averageAttemptsPerCapture: number;
    captureSuccessRate: number;
    favoriteBall: string;
    totalAttempts: number;
    bestCaptureDay: string;
    rareCaptures: number;
  }> {
    try {
      // TODO: Implémenter avec une base de données de statistiques de capture
      // Pour l'instant, récupérer depuis OwnedPokemon et PokedexStats
      
      const playerPokemon = await OwnedPokemon.find({ owner: playerId });
      const pokedexStats = await PokedexStats.findOrCreate(playerId);
      
      // Compter les captures par type
      let criticalCaptures = 0;
      let shinyCaptures = 0;
      let rareCaptures = 0;
      const ballUsage: Record<string, number> = {};
      
      for (const pokemon of playerPokemon) {
        // Compter par pokeball
        ballUsage[pokemon.pokeball] = (ballUsage[pokemon.pokeball] || 0) + 1;
        
        // Compter les shinies
        if (pokemon.shiny) {
          shinyCaptures++;
        }
        
        // Compter les rares (estimation basée sur l'ID)
        if (this.isRarePokemon(pokemon.pokemonId)) {
          rareCaptures++;
        }
      }
      
      // Ball favorite
      const favoriteBall = Object.entries(ballUsage)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'poke_ball';
      
      return {
        totalCaptures: playerPokemon.length,
        criticalCaptures: criticalCaptures, // TODO: tracker vraiment
        newSpeciesCaptures: pokedexStats.totalCaught,
        shinyCaptures,
        currentStreak: 0, // TODO: implémenter le tracking de streaks
        longestStreak: 0, // TODO: implémenter le tracking de streaks
        averageAttemptsPerCapture: 2.5, // TODO: tracker vraiment
        captureSuccessRate: 0.75, // TODO: tracker vraiment
        favoriteBall,
        totalAttempts: Math.floor(playerPokemon.length * 2.5), // Estimation
        bestCaptureDay: 'saturday', // TODO: analyser les vraies données
        rareCaptures
      };
      
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur stats capture:', error);
      return {
        totalCaptures: 0,
        criticalCaptures: 0,
        newSpeciesCaptures: 0,
        shinyCaptures: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageAttemptsPerCapture: 0,
        captureSuccessRate: 0,
        favoriteBall: 'poke_ball',
        totalAttempts: 0,
        bestCaptureDay: 'saturday',
        rareCaptures: 0
      };
    }
  }

  /**
   * 🎊 Traite les récompenses post-capture (pour intégration avec CaptureManager)
   */
  async processPostCaptureRewards(
    playerId: string,
    capturedPokemon: {
      pokemonId: number;
      level: number;
      isShiny: boolean;
      isNewSpecies: boolean;
      ballUsed: string;
      attempts: number;
      wasCritical: boolean;
      wasWeakened: boolean;
    },
    ownedPokemonId?: string
  ): Promise<{
    success: boolean;
    totalExperience: number;
    totalMoney: number;
    itemsGiven: number;
    friendshipGained: number;
    prestigeGained: number;
    notifications: RewardNotification[];
    specialEvents: any[];
  }> {
    console.log(`🎊 [CaptureReward] Post-capture pour ${playerId}: Pokémon #${capturedPokemon.pokemonId}`);

    try {
      // Créer les données de capture détaillées
      const captureData: CaptureRewardType = {
        type: 'capture',
        pokemonId: capturedPokemon.pokemonId,
        level: capturedPokemon.level,
        ballUsed: capturedPokemon.ballUsed,
        captureDetails: {
          isCriticalCapture: capturedPokemon.wasCritical,
          isNewSpecies: capturedPokemon.isNewSpecies,
          isShiny: capturedPokemon.isShiny,
          captureStreak: 0, // TODO: récupérer la vraie streak
          pokeBallsUsed: capturedPokemon.attempts,
          weakenedProperly: capturedPokemon.wasWeakened
        },
        bonuses: {
          experienceBonus: 0,
          moneyBonus: 0,
          friendshipStart: 0,
          itemRewards: [],
          pokedexProgress: {
            newEntry: capturedPokemon.isNewSpecies,
            completionBonus: 0
          }
        }
      };

      // Traiter les récompenses de capture
      const captureResult = await this.processCaptureRewards(playerId, captureData);

      if (!captureResult.success) {
        return {
          success: false,
          totalExperience: 0,
          totalMoney: 0,
          itemsGiven: 0,
          friendshipGained: 0,
          prestigeGained: 0,
          notifications: [],
          specialEvents: []
        };
      }

      // Appliquer l'amitié au Pokémon capturé (si on a son ID)
      let friendshipGained = 0;
      if (ownedPokemonId && captureResult.data?.calculation) {
        const friendshipResult = await this.friendshipReward.giveFriendship(playerId, {
          type: 'friendship',
          pokemonId: ownedPokemonId,
          friendshipGain: captureResult.data.calculation.bonuses.friendship,
          reason: 'capture'
        });

        if (friendshipResult.success) {
          friendshipGained = friendshipResult.finalAmount || 0;
        }
      }

      const calculation = captureResult.data?.calculation;
      
      return {
        success: true,
        totalExperience: calculation?.bonuses.experience || 0,
        totalMoney: calculation?.bonuses.money || 0,
        itemsGiven: calculation?.bonuses.items.length || 0,
        friendshipGained,
        prestigeGained: calculation?.bonuses.prestige || 0,
        notifications: captureResult.data?.notifications || [],
        specialEvents: [] // TODO: événements spéciaux
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur post-capture:', error);
      return {
        success: false,
        totalExperience: 0,
        totalMoney: 0,
        itemsGiven: 0,
        friendshipGained: 0,
        prestigeGained: 0,
        notifications: [],
        specialEvents: []
      };
    }
  }

  /**
   * 🔮 Prévisualise les récompenses avant capture (pour l'UI)
   */
  async previewCaptureRewards(
    playerId: string,
    pokemonId: number,
    level: number,
    ballType: string,
    isShiny: boolean = false
  ): Promise<{
    estimatedExperience: number;
    estimatedMoney: number;
    possibleItems: string[];
    friendshipBonus: number;
    criticalChance: number;
    newSpeciesBonus: boolean;
  }> {
    try {
      // Vérifier si nouvelle espèce
      const isNewSpecies = await this.checkNewSpecies(playerId, pokemonId);
      
      // Calculer les bonus estimés
      let estimatedExp = 50 + (level * 2);
      let estimatedMoney = 0;
      let friendshipBonus = 10;
      const possibleItems: string[] = [];

      // Bonus nouvelle espèce
      if (isNewSpecies) {
        estimatedExp *= CAPTURE_BONUSES.newSpecies.expBonus;
        estimatedMoney += CAPTURE_BONUSES.newSpecies.moneyBonus;
        friendshipBonus += CAPTURE_BONUSES.newSpecies.friendshipBonus;
        possibleItems.push(...CAPTURE_BONUSES.newSpecies.itemRewards);
      }

      // Bonus shiny
      if (isShiny) {
        estimatedExp *= CAPTURE_BONUSES.shinyCapture.expBonus;
        estimatedMoney += CAPTURE_BONUSES.shinyCapture.moneyBonus;
        friendshipBonus += CAPTURE_BONUSES.shinyCapture.friendshipBonus;
        possibleItems.push(...CAPTURE_BONUSES.shinyCapture.itemRewards);
      }

      // Bonus de ball
      const ballBonus = this.calculateBallBonus(ballType, level);
      estimatedExp += ballBonus.experience;
      estimatedMoney += ballBonus.money;
      friendshipBonus += ballBonus.friendship;

      // Chance critique (estimation)
      const criticalChance = REWARD_CONSTANTS.CRITICAL_CAPTURE_BASE_RATE;

      return {
        estimatedExperience: Math.floor(estimatedExp),
        estimatedMoney: Math.floor(estimatedMoney),
        possibleItems: [...new Set(possibleItems)],
        friendshipBonus: Math.floor(friendshipBonus),
        criticalChance,
        newSpeciesBonus: isNewSpecies
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur preview:', error);
      return {
        estimatedExperience: 50,
        estimatedMoney: 0,
        possibleItems: [],
        friendshipBonus: 10,
        criticalChance: 0.05,
        newSpeciesBonus: false
      };
    }
  }

  /**
   * 🏆 Vérifie et déclenche les achievements de capture
   */
  async checkCaptureAchievements(
    playerId: string,
    captureData: {
      pokemonId: number;
      isShiny: boolean;
      isNewSpecies: boolean;
      wasCritical: boolean;
      ballUsed: string;
      totalCaptures: number;
    }
  ): Promise<{
    achievementsUnlocked: string[];
    bonusRewards: any[];
    notifications: RewardNotification[];
  }> {
    const achievements: string[] = [];
    const bonusRewards: any[] = [];
    const notifications: RewardNotification[] = [];

    try {
      // Achievement: Première capture
      if (captureData.totalCaptures === 1) {
        achievements.push('first_capture');
        notifications.push({
          type: 'achievement',
          message: 'Achievement débloqué : Première Capture !',
          priority: 'high',
          animation: 'star',
          data: { achievement: 'first_capture' }
        });
      }

      // Achievement: 10 captures
      if (captureData.totalCaptures === 10) {
        achievements.push('novice_trainer');
        bonusRewards.push({
          type: 'item',
          itemId: 'great_ball',
          quantity: 5
        });
      }

      // Achievement: Premier shiny
      if (captureData.isShiny && achievements.length === 0) {
        achievements.push('shiny_hunter');
        notifications.push({
          type: 'achievement',
          message: '⭐ Achievement débloqué : Chasseur de Chromatiques ! ⭐',
          priority: 'high',
          animation: 'explosion',
          data: { achievement: 'shiny_hunter', rare: true }
        });
      }

      // Achievement: Capture critique
      if (captureData.wasCritical) {
        achievements.push('critical_catcher');
      }

      // Achievement: Master Ball utilisée
      if (captureData.ballUsed === 'master_ball') {
        achievements.push('master_ball_user');
      }

      // Achievement: 100 espèces différentes
      if (captureData.isNewSpecies) {
        const stats = await this.getPlayerCaptureStats(playerId);
        if (stats.newSpeciesCaptures >= 100) {
          achievements.push('pokedex_master');
          bonusRewards.push({
            type: 'item',
            itemId: 'master_ball',
            quantity: 1
          });
        }
      }

      return {
        achievementsUnlocked: achievements,
        bonusRewards,
        notifications
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur achievements:', error);
      return {
        achievementsUnlocked: [],
        bonusRewards: [],
        notifications: []
      };
    }
  }

  /**
   * 📊 Obtient les bonus actifs pour un joueur
   */
  async getActiveCaptureBonus(playerId: string): Promise<{
    experienceMultiplier: number;
    moneyMultiplier: number;
    criticalChanceBonus: number;
    friendshipBonus: number;
    activeEffects: string[];
  }> {
    try {
      // TODO: Implémenter avec un système d'effets/buffs
      // Pour l'instant, valeurs par défaut
      
      return {
        experienceMultiplier: 1.0,
        moneyMultiplier: 1.0,
        criticalChanceBonus: 0,
        friendshipBonus: 0,
        activeEffects: []
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur bonus actifs:', error);
      return {
        experienceMultiplier: 1.0,
        moneyMultiplier: 1.0,
        criticalChanceBonus: 0,
        friendshipBonus: 0,
        activeEffects: []
      };
    }
  }

  /**
   * 🎯 Méthode principale pour CaptureManager - Interface simple
   */
  async handleCaptureSuccess(
    playerId: string,
    pokemonData: {
      pokemonId: number;
      level: number;
      isShiny: boolean;
      ballUsed: string;
      attempts: number;
      wasCritical: boolean;
      wasWeakened: boolean;
    },
    ownedPokemonId: string
  ): Promise<{
    success: boolean;
    rewards: {
      experience: number;
      money: number;
      items: number;
      friendship: number;
      prestige: number;
    };
    notifications: RewardNotification[];
    achievements: string[];
  }> {
    console.log(`🎯 [CaptureReward] Handle capture success pour ${playerId}`);

    try {
      // Vérifier si nouvelle espèce
      const isNewSpecies = await this.checkNewSpecies(playerId, pokemonData.pokemonId);

      // Traiter les récompenses post-capture
      const rewardsResult = await this.processPostCaptureRewards(
        playerId,
        {
          ...pokemonData,
          isNewSpecies
        },
        ownedPokemonId
      );

      // Vérifier les achievements
      const achievementsResult = await this.checkCaptureAchievements(playerId, {
        ...pokemonData,
        isNewSpecies,
        totalCaptures: 0 // TODO: récupérer la vraie valeur
      });

      return {
        success: rewardsResult.success,
        rewards: {
          experience: rewardsResult.totalExperience,
          money: rewardsResult.totalMoney,
          items: rewardsResult.itemsGiven,
          friendship: rewardsResult.friendshipGained,
          prestige: rewardsResult.prestigeGained
        },
        notifications: [
          ...rewardsResult.notifications,
          ...achievementsResult.notifications
        ],
        achievements: achievementsResult.achievementsUnlocked
      };

    } catch (error) {
      console.error('❌ [CaptureReward] Erreur handle capture success:', error);
      return {
        success: false,
        rewards: {
          experience: 0,
          money: 0,
          items: 0,
          friendship: 0,
          prestige: 0
        },
        notifications: [],
        achievements: []
      };
    }
  }
}
