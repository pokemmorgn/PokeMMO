// server/src/rewards/CaptureReward.ts - Version connectée aux vraies données

import { OwnedPokemon } from '../models/OwnedPokemon';
import { PokedexEntry } from '../models/PokedexEntry';
import { PokedexStats } from '../models/PokedexStats';
import { ItemReward } from './ItemReward';
import { FriendshipReward } from './FriendshipReward';
import { PokemonManager } from '../managers/PokemonManager';
import fs from 'fs';
import path from 'path';
import { 
  CaptureReward as CaptureRewardType, 
  ProcessedReward, 
  RewardNotification,
  CaptureCalculation,
  ItemReward as ItemRewardType,
  CAPTURE_BONUSES,
  REWARD_CONSTANTS 
} from './types/RewardTypes';

// Interface pour les données de configuration de capture
interface CaptureConfigData {
  bonuses: typeof CAPTURE_BONUSES;
  streakThresholds: Array<{ min: number; expMultiplier: number; moneyMultiplier: number }>;
  masteryBonuses: Record<string, number>;
  rarityMultipliers: Record<string, { exp: number; money: number; prestige: number }>;
}

// Modèle pour les statistiques de capture persistantes
interface CaptureStats {
  playerId: string;
  currentStreak: number;
  longestStreak: number;
  totalCaptures: number;
  capturesByBall: Record<string, number>;
  criticalCaptures: number;
  shinyCaptures: number;
  lastCaptureDate: Date;
  streakBrokenDate?: Date;
  speciesChains: Record<number, number>; // pokemonId -> chain length
}

export class CaptureReward {
  private itemReward: ItemReward;
  private friendshipReward: FriendshipReward;
  private pokemonManager: PokemonManager;
  
  // Cache pour optimiser les accès fréquents
  private pokemonIndexCache: Map<number, string> = new Map();
  private pokemonDataCache: Map<number, any> = new Map();
  private configCache: CaptureConfigData | null = null;
  private statsCache: Map<string, CaptureStats> = new Map();

  constructor() {
    this.itemReward = new ItemReward();
    this.friendshipReward = new FriendshipReward();
    this.pokemonManager = new PokemonManager({
      basePath: path.join(process.cwd(), 'src/data/pokemon'),
      enableCache: true
    });
  }

  /**
   * 🎯 Initialise le système avec les vraies données
   */
  async initialize(): Promise<void> {
    try {
      await this.pokemonManager.loadPokemonIndex();
      await this.loadConfiguration();
      console.log('🎯 [CaptureReward] Initialisé avec données authentiques');
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur initialisation:', error);
      throw error;
    }
  }

  /**
   * 📋 Charge la configuration depuis fichier ou DB
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // Pour l'instant, config par défaut - peut être externalisée plus tard
      this.configCache = {
        bonuses: CAPTURE_BONUSES,
        streakThresholds: [
          { min: 5, expMultiplier: 1.1, moneyMultiplier: 1.1 },
          { min: 10, expMultiplier: 1.15, moneyMultiplier: 1.2 },
          { min: 25, expMultiplier: 1.2, moneyMultiplier: 1.3 },
          { min: 50, expMultiplier: 1.3, moneyMultiplier: 1.4 }
        ],
        masteryBonuses: {
          'poke_ball': 1.0,
          'great_ball': 1.05,
          'ultra_ball': 1.1,
          'master_ball': 1.2,
          'luxury_ball': 1.15
        },
        rarityMultipliers: {
          'legendaries': { exp: 3.0, money: 5.0, prestige: 200 },
          'unique': { exp: 2.0, money: 2.5, prestige: 100 },
          'fossil': { exp: 1.8, money: 2.0, prestige: 75 },
          'fighting': { exp: 1.3, money: 1.5, prestige: 25 },
          'families': { exp: 1.0, money: 1.0, prestige: 0 }
        }
      };
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur chargement config:', error);
    }
  }

  /**
   * 🎯 Traite les récompenses de capture complètes
   */
  async processCaptureRewards(playerId: string, reward: CaptureRewardType): Promise<ProcessedReward> {
    console.log(`🎯 [CaptureReward] Traitement capture pour ${playerId}: Pokémon #${reward.pokemonId}`);

    try {
      // S'assurer que le système est initialisé
      if (!this.configCache) {
        await this.initialize();
      }

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

      // Mettre à jour les statistiques de capture
      await this.updateCaptureStats(playerId, reward, calculation);

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
   * 🧮 Calcule tous les bonus de capture avec vraies données
   */
  private async calculateCaptureRewards(
    playerId: string, 
    captureData: CaptureRewardType
  ): Promise<CaptureCalculation | null> {
    try {
      const { pokemonId, level, ballUsed, captureDetails } = captureData;

      // Récupérer les données Pokémon authentiques
      const pokemonData = await this.getPokemonData(pokemonId);
      if (!pokemonData) {
        console.error(`❌ [CaptureReward] Pokémon ${pokemonId} introuvable`);
        return null;
      }

      // Vérifier si c'est une nouvelle espèce
      const isNewSpecies = await this.checkNewSpecies(playerId, pokemonId);
      
      // Obtenir les statistiques de capture
      const captureStats = await this.getCaptureStats(playerId);
      const completionRate = await this.getPokedexCompletionRate(playerId);

      // Déterminer la rareté depuis les vraies données
      const rarityInfo = await this.getPokemonRarityInfo(pokemonId);

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

      // === BONUS D'EXPÉRIENCE DE BASE (depuis vraies données) ===
      let baseExp = pokemonData.baseExperience || 50;
      baseExp = Math.floor(baseExp * (level / 50)); // Ajuster selon niveau
      calculation.bonuses.experience = baseExp;

      // === BONUS SELON LES CONDITIONS ===

      // 1. CAPTURE CRITIQUE
      if (captureDetails.isCriticalCapture) {
        const config = this.configCache!.bonuses.criticalCapture;
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * config.expBonus);
        calculation.bonuses.money += config.moneyBonus;
        calculation.bonuses.friendship += config.friendshipBonus;
        
        console.log(`✨ [CaptureReward] Capture critique détectée !`);
      }

      // 2. NOUVELLE ESPÈCE
      if (isNewSpecies) {
        const config = this.configCache!.bonuses.newSpecies;
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * config.expBonus);
        calculation.bonuses.money += config.moneyBonus;
        calculation.bonuses.friendship += config.friendshipBonus;
        
        // Objets bonus pour nouvelle espèce
        for (const itemId of config.itemRewards) {
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
        const config = this.configCache!.bonuses.shinyCapture;
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * config.expBonus);
        calculation.bonuses.money += config.moneyBonus;
        calculation.bonuses.friendship += config.friendshipBonus;
        calculation.bonuses.prestige += config.prestigeBonus;
        
        // Objets spéciaux pour shiny
        for (const itemId of config.itemRewards) {
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
        const config = this.configCache!.bonuses.quickCapture;
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * config.expBonus);
        calculation.bonuses.money += config.moneyBonus;
        calculation.bonuses.friendship += config.friendshipBonus;

        console.log(`🎯 [CaptureReward] Capture du premier coup !`);
      }

      // 5. POKÉMON AFFAIBLI CORRECTEMENT
      if (captureDetails.weakenedProperly) {
        const config = this.configCache!.bonuses.weakenedCapture;
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * config.expBonus);
        calculation.bonuses.friendship += config.friendshipBonus;
      }

      // 6. BONUS DE RARETÉ (depuis vraies données)
      if (rarityInfo.isRare) {
        const rarityMultiplier = this.configCache!.rarityMultipliers[rarityInfo.category];
        calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * rarityMultiplier.exp);
        calculation.bonuses.money = Math.floor(calculation.bonuses.money * rarityMultiplier.money);
        calculation.bonuses.prestige += rarityMultiplier.prestige;

        console.log(`💎 [CaptureReward] Bonus rareté ${rarityInfo.category}: x${rarityMultiplier.exp} XP`);
      }

      // 7. BONUS DE PROGRESSION DU POKÉDEX
      const progressBonus = this.calculateProgressionBonus(completionRate, level);
      calculation.bonuses.experience += progressBonus.experience;
      calculation.bonuses.money += progressBonus.money;

      // 8. BONUS DE STREAK DE CAPTURE
      const streakBonus = this.calculateStreakBonus(captureStats.currentStreak);
      calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * streakBonus.experienceMultiplier);
      calculation.bonuses.money = Math.floor(calculation.bonuses.money * streakBonus.moneyMultiplier);

      // 9. BONUS SELON LA BALL UTILISÉE (depuis vraies données)
      const ballBonus = await this.calculateBallBonus(pokemonId, ballUsed, level);
      calculation.bonuses.experience += ballBonus.experience;
      calculation.bonuses.money += ballBonus.money;
      calculation.bonuses.friendship += ballBonus.friendship;

      // 10. BONUS DE MAÎTRISE DE LA BALL
      const masteryBonus = this.calculateMasteryBonus(captureStats.capturesByBall[ballUsed] || 0);
      calculation.bonuses.experience = Math.floor(calculation.bonuses.experience * masteryBonus);

      // 11. AMITIÉ INITIALE SELON POKÉMON ET BALL
      const initialFriendship = await this.getInitialFriendship(pokemonId, ballUsed);
      calculation.bonuses.friendship = Math.max(calculation.bonuses.friendship, initialFriendship - 70); // Bonus au-dessus de la base

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
   * 🗃️ Récupère les données Pokémon avec cache
   */
  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonDataCache.has(pokemonId)) {
      return this.pokemonDataCache.get(pokemonId);
    }

    try {
      const pokemon = await this.pokemonManager.getPokemon(pokemonId);
      this.pokemonDataCache.set(pokemonId, pokemon);
      return pokemon;
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur récupération Pokémon ${pokemonId}:`, error);
      return null;
    }
  }

  /**
   * 💎 Détermine la rareté depuis les vraies données
   */
  private async getPokemonRarityInfo(pokemonId: number): Promise<{
    isRare: boolean;
    category: string;
    tier: string;
  }> {
    try {
      // Charger l'index des Pokémon
      const indexPath = path.join(process.cwd(), 'src/data/pokemon/pokemon-index.json');
      const indexData: Record<string, string> = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      
      const filePath = indexData[pokemonId.toString()];
      if (!filePath) {
        return { isRare: false, category: 'unknown', tier: 'common' };
      }

      // Analyser le chemin pour déterminer la rareté
      const [type, category] = filePath.split('/');
      
      if (type === 'groups') {
        const isRareGroup = ['legendaries', 'unique', 'fossil'].includes(category);
        return {
          isRare: isRareGroup,
          category: category,
          tier: this.mapCategoryToTier(category)
        };
      } else {
        // Famille normale
        return { isRare: false, category: 'families', tier: 'common' };
      }
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur analyse rareté ${pokemonId}:`, error);
      return { isRare: false, category: 'unknown', tier: 'common' };
    }
  }

  /**
   * 🏷️ Mappe les catégories aux tiers
   */
  private mapCategoryToTier(category: string): string {
    const tierMap: Record<string, string> = {
      'legendaries': 'legendary',
      'unique': 'rare',
      'fossil': 'rare',
      'fighting': 'uncommon',
      'families': 'common'
    };
    return tierMap[category] || 'common';
  }

  /**
   * ⚾ Calcule le bonus selon la Ball utilisée (avec vraies données)
   */
  private async calculateBallBonus(pokemonId: number, ballUsed: string, pokemonLevel: number): Promise<{
    experience: number;
    money: number;
    friendship: number;
  }> {
    try {
      const pokemonData = await this.getPokemonData(pokemonId);
      const baseBonusPerLevel = 2;
      
      // Récupérer l'effectiveness depuis les vraies données
      let ballEffectiveness = 1.0;
      if (pokemonData?.catchLocations?.[0]?.ball_effectiveness) {
        ballEffectiveness = pokemonData.catchLocations[0].ball_effectiveness[ballUsed] || 1.0;
      }

      // Bonus selon l'effectiveness (plus c'est efficace, plus de récompenses)
      const expMultiplier = Math.min(2.0, Math.max(1.0, ballEffectiveness / 2));
      const moneyMultiplier = Math.min(1.5, Math.max(0.8, ballEffectiveness / 3));

      // Bonus spéciaux selon le type de ball
      let friendshipBonus = 0;
      if (ballUsed === 'luxury_ball') friendshipBonus = 20;
      else if (ballUsed === 'friend_ball') friendshipBonus = 30;
      else if (['great_ball', 'ultra_ball'].includes(ballUsed)) friendshipBonus = 5;

      return {
        experience: Math.floor(baseBonusPerLevel * pokemonLevel * expMultiplier),
        money: Math.floor(baseBonusPerLevel * pokemonLevel * moneyMultiplier),
        friendship: friendshipBonus
      };
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur bonus ball ${ballUsed} pour ${pokemonId}:`, error);
      return { experience: 0, money: 0, friendship: 0 };
    }
  }

  /**
   * 💖 Détermine l'amitié initiale selon les vraies données
   */
  private async getInitialFriendship(pokemonId: number, ballType: string): Promise<number> {
    try {
      const pokemonData = await this.getPokemonData(pokemonId);
      let baseFriendship = pokemonData?.baseHappiness || 70;
      
      // Bonus selon la ball
      const ballBonuses: Record<string, number> = {
        'luxury_ball': 30,
        'friend_ball': 50,
        'heal_ball': 20,
        'premier_ball': 10
      };
      
      baseFriendship += ballBonuses[ballType] || 0;
      
      return Math.min(baseFriendship, 255);
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur amitié initiale ${pokemonId}:`, error);
      return 70;
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
    if (!this.configCache) {
      return { experienceMultiplier: 1.0, moneyMultiplier: 1.0 };
    }

    // Trouver le bon seuil de streak
    const thresholds = this.configCache.streakThresholds
      .sort((a, b) => b.min - a.min); // Trier par ordre décroissant

    for (const threshold of thresholds) {
      if (captureStreak >= threshold.min) {
        return {
          experienceMultiplier: threshold.expMultiplier,
          moneyMultiplier: threshold.moneyMultiplier
        };
      }
    }

    return { experienceMultiplier: 1.0, moneyMultiplier: 1.0 };
  }

  /**
   * 🎯 Calcule le bonus de maîtrise de ball
   */
  private calculateMasteryBonus(ballUses: number): number {
    const masteryLevel = Math.floor(ballUses / 50); // Niveau tous les 50 uses
    return 1 + (masteryLevel * 0.05); // +5% par niveau
  }

  /**
   * 📊 Récupère les statistiques de capture d'un joueur
   */
  private async getCaptureStats(playerId: string): Promise<CaptureStats> {
    if (this.statsCache.has(playerId)) {
      return this.statsCache.get(playerId)!;
    }

    try {
      // TODO: Remplacer par vraie persistance (MongoDB, etc.)
      // Pour l'instant, stats par défaut
      const stats: CaptureStats = {
        playerId,
        currentStreak: 0,
        longestStreak: 0,
        totalCaptures: 0,
        capturesByBall: {},
        criticalCaptures: 0,
        shinyCaptures: 0,
        lastCaptureDate: new Date(),
        speciesChains: {}
      };

      this.statsCache.set(playerId, stats);
      return stats;
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur stats capture ${playerId}:`, error);
      return {
        playerId,
        currentStreak: 0,
        longestStreak: 0,
        totalCaptures: 0,
        capturesByBall: {},
        criticalCaptures: 0,
        shinyCaptures: 0,
        lastCaptureDate: new Date(),
        speciesChains: {}
      };
    }
  }

  /**
   * 📈 Met à jour les statistiques de capture
   */
  private async updateCaptureStats(
    playerId: string, 
    captureData: CaptureRewardType,
    calculation: CaptureCalculation
  ): Promise<void> {
    try {
      const stats = await this.getCaptureStats(playerId);
      
      // Mettre à jour les stats
      stats.currentStreak++;
      stats.totalCaptures++;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastCaptureDate = new Date();
      
      // Stats par ball
      const ballUsed = captureData.ballUsed;
      stats.capturesByBall[ballUsed] = (stats.capturesByBall[ballUsed] || 0) + 1;
      
      // Stats spéciales
      if (calculation.criticalCapture) {
        stats.criticalCaptures++;
      }
      
      if (captureData.captureDetails.isShiny) {
        stats.shinyCaptures++;
      }
      
      // Chaîne d'espèce
      const pokemonId = captureData.pokemonId;
      stats.speciesChains[pokemonId] = (stats.speciesChains[pokemonId] || 0) + 1;
      
      // Sauvegarder en cache (et éventuellement en DB plus tard)
      this.statsCache.set(playerId, stats);
      
      console.log(`📊 [CaptureReward] Stats mises à jour: ${playerId} - Streak: ${stats.currentStreak}`);
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur mise à jour stats:', error);
    }
  }

  /**
   * 📋 Obtient le taux de complétion du Pokédex
   */
  private async getPokedexCompletionRate(playerId: string): Promise<number> {
    try {
      const pokedexStats = await PokedexStats.findOrCreate(playerId);
      return pokedexStats.caughtPercentage / 100;
    } catch (error) {
      console.error(`❌ [CaptureReward] Erreur complétion Pokédex ${playerId}:`, error);
      return 0;
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
          bonusMultiplier: this.configCache?.bonuses.criticalCapture.expBonus || 1.5
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

  // === MÉTHODES UTILITAIRES CONSERVÉES ===

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
  public async calculateCaptureDifficulty(
    pokemonId: number, 
    level: number, 
    currentHp: number, 
    maxHp: number,
    status: string
  ): Promise<{
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    difficultyMultiplier: number;
  }> {
    try {
      const pokemonData = await this.getPokemonData(pokemonId);
      const baseCatchRate = pokemonData?.captureRate || 45;

      // Facteurs de difficulté
      const catchRate = baseCatchRate;
      const hpRatio = currentHp / maxHp;
      const levelFactor = level / 100;
      const statusFactor = status !== 'normal' ? 0.5 : 1.0;

      // Calcul simplifié de difficulté
      const difficulty = (1 - (catchRate / 255)) + levelFactor + (hpRatio * statusFactor);

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
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur calcul difficulté:', error);
      return {
        difficulty: 'medium',
        difficultyMultiplier: 1.2
      };
    }
  }

  /**
   * 🎁 Génère des objets bonus selon les conditions de capture
   */
  public async generateBonusItems(
    pokemonId: number,
    captureConditions: {
      isCritical: boolean;
      isNewSpecies: boolean;
      isShiny: boolean;
      isQuickCapture: boolean;
      difficulty: string;
    }
  ): Promise<ItemRewardType[]> {
    const bonusItems: ItemRewardType[] = [];

    try {
      // Vérifier si c'est un Pokémon rare depuis les vraies données
      const rarityInfo = await this.getPokemonRarityInfo(pokemonId);

      // Objets de base selon la rareté du Pokémon
      if (rarityInfo.isRare) {
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
    } catch (error) {
      console.error('❌ [CaptureReward] Erreur génération objets bonus:', error);
      return [];
    }
  }

  /**
   * 📊 Obtient les statistiques de capture d'un joueur
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
      const stats = await this.getCaptureStats(playerId);
      const pokedexStats = await PokedexStats.findOrCreate(playerId);
      
      // Ball favorite
      const favoriteBall = Object.entries(stats.capturesByBall)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'poke_ball';
      
      // Compter les rares (estimation)
      let rareCaptures = 0;
      for (const [pokemonId, count] of Object.entries(stats.speciesChains)) {
        const rarityInfo = await this.getPokemonRarityInfo(parseInt(pokemonId));
        if (rarityInfo.isRare) {
          rareCaptures += count;
        }
      }
      
      return {
        totalCaptures: stats.totalCaptures,
        criticalCaptures: stats.criticalCaptures,
        newSpeciesCaptures: pokedexStats.totalCaught,
        shinyCaptures: stats.shinyCaptures,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        averageAttemptsPerCapture: 2.5, // TODO: tracker vraiment
        captureSuccessRate: 0.75, // TODO: tracker vraiment
        favoriteBall,
        totalAttempts: Math.floor(stats.totalCaptures * 2.5), // Estimation
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
          captureStreak: (await this.getCaptureStats(playerId)).currentStreak,
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
      // S'assurer que le système est initialisé
      if (!this.configCache) {
        await this.initialize();
      }

      // Vérifier si nouvelle espèce
      const isNewSpecies = await this.checkNewSpecies(playerId, pokemonId);
      
      // Récupérer les données Pokémon
      const pokemonData = await this.getPokemonData(pokemonId);
      
      // Calculer les bonus estimés
      let estimatedExp = pokemonData?.baseExperience || 50;
      estimatedExp = Math.floor(estimatedExp * (level / 50));
      
      let estimatedMoney = 0;
      let friendshipBonus = await this.getInitialFriendship(pokemonId, ballType);

      // Bonus nouvelle espèce
      if (isNewSpecies) {
        estimatedExp = Math.floor(estimatedExp * this.configCache!.bonuses.newSpecies.expBonus);
        estimatedMoney += this.configCache!.bonuses.newSpecies.moneyBonus;
        friendshipBonus += this.configCache!.bonuses.newSpecies.friendshipBonus;
      }

      // Bonus shiny
      if (isShiny) {
        estimatedExp = Math.floor(estimatedExp * this.configCache!.bonuses.shinyCapture.expBonus);
        estimatedMoney += this.configCache!.bonuses.shinyCapture.moneyBonus;
        friendshipBonus += this.configCache!.bonuses.shinyCapture.friendshipBonus;
      }

      // Bonus de rareté
      const rarityInfo = await this.getPokemonRarityInfo(pokemonId);
      if (rarityInfo.isRare) {
        const rarityMultiplier = this.configCache!.rarityMultipliers[rarityInfo.category];
        estimatedExp = Math.floor(estimatedExp * rarityMultiplier.exp);
        estimatedMoney = Math.floor(estimatedMoney * rarityMultiplier.money);
      }

      // Bonus de ball
      const ballBonus = await this.calculateBallBonus(pokemonId, ballType, level);
      estimatedExp += ballBonus.experience;
      estimatedMoney += ballBonus.money;
      friendshipBonus += ballBonus.friendship;

      // Chance critique (estimation)
      const criticalChance = REWARD_CONSTANTS.CRITICAL_CAPTURE_BASE_RATE;

      // Objets possibles
      const possibleItems: string[] = [];
      if (isNewSpecies) possibleItems.push(...this.configCache!.bonuses.newSpecies.itemRewards);
      if (isShiny) possibleItems.push(...this.configCache!.bonuses.shinyCapture.itemRewards);
      if (rarityInfo.isRare) possibleItems.push('ultra_ball');

      return {
        estimatedExperience: Math.floor(estimatedExp),
        estimatedMoney: Math.floor(estimatedMoney),
        possibleItems: [...new Set(possibleItems)],
        friendshipBonus: Math.floor(friendshipBonus - 70), // Bonus au-dessus de la base
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
      // S'assurer que le système est initialisé
      if (!this.configCache) {
        await this.initialize();
      }

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
        totalCaptures: (await this.getCaptureStats(playerId)).totalCaptures
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
