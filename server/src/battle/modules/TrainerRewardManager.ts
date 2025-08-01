// server/src/battle/modules/TrainerRewardManager.ts
// 🎁 SYSTÈME DE RÉCOMPENSES POUR COMBATS DRESSEURS - SESSION 3

import { BattleGameState, BattleResult } from '../types/BattleTypes';
import { 
  TrainerData, 
  TrainerRewards, 
  CalculatedRewards,
  TRAINER_BATTLE_CONSTANTS 
} from '../types/TrainerBattleTypes';
import { InventoryManager } from '../../managers/InventoryManager';
import { PlayerData } from '../../models/PlayerData';
import { OwnedPokemon } from '../../models/OwnedPokemon';

// === INTERFACES SPÉCIFIQUES ===

export interface RewardCalculationData {
  playerName: string;
  playerLevel: number;
  trainerData: TrainerData;
  battleTurns: number;
  battleDuration: number;
  pokemonDefeated: number;
  playerPokemonUsed: number;
  wasFlawlessVictory: boolean; // Aucun Pokémon joueur KO
  wasCriticalVictory: boolean; // Victoire en moins de 10 tours
}

export interface RewardDistributionResult {
  success: boolean;
  rewardsGiven: CalculatedRewards;
  errors: string[];
  playerDataUpdated: boolean;
  pokemonExpUpdated: number;
  inventoryUpdated: boolean;
}

export interface ExpDistribution {
  pokemonId: string;
  pokemonName: string;
  ownedPokemonId: string;
  oldLevel: number;
  newLevel: number;
  expGained: number;
  totalExp: number;
  leveledUp: boolean;
}

export interface ItemReward {
  itemId: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  source: string; // 'guaranteed', 'probability', 'bonus'
  rollResult?: number; // Résultat du jet de probabilité
}

/**
 * TRAINER REWARD MANAGER
 * 
 * Responsabilités :
 * - Calculer récompenses selon dresseur vaincu et performance
 * - Distribuer argent, EXP et objets
 * - Gestion bonus de performance (victoire parfaite, rapidité)
 * - Intégration base de données (PlayerData, InventoryManager)
 * - Système extensible pour futures évolutions
 */
export class TrainerRewardManager {
  
  private gameState: BattleGameState | null = null;
  private isInitialized = false;
  
  // Configuration
  private readonly EXP_BASE_MULTIPLIER = 1.5; // Dresseurs donnent plus d'EXP que sauvages
  private readonly MONEY_BASE_MULTIPLIER = 2.0; // Plus d'argent que sauvages
  private readonly FLAWLESS_VICTORY_BONUS = 1.5; // +50% si aucun Pokémon joueur KO
  private readonly CRITICAL_VICTORY_BONUS = 1.25; // +25% si victoire rapide
  private readonly LEVEL_DIFFERENCE_MODIFIER = 0.1; // ±10% par niveau de différence
  
  constructor() {
    console.log('🎁 [TrainerRewardManager] Initialisé');
  }
  
  // === INITIALISATION ===
  
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    this.isInitialized = true;
    console.log('✅ [TrainerRewardManager] Configuré pour le combat');
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Calcule et distribue toutes les récompenses après victoire
   */
  async calculateAndGiveRewards(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number,
    battleDuration: number = 0
  ): Promise<CalculatedRewards> {
    
    console.log(`🎁 [TrainerRewardManager] Calcul récompenses: ${playerName} vs ${trainerData.name}`);
    
    try {
      // 1. Collecter données de calcul
      const calculationData = await this.gatherCalculationData(
        playerName,
        trainerData,
        battleTurns,
        battleDuration
      );
      
      // 2. Calculer toutes les récompenses
      const calculatedRewards = this.calculateAllRewards(calculationData);
      
      // 3. Distribuer les récompenses
      const distributionResult = await this.distributeRewards(playerName, calculatedRewards);
      
      if (distributionResult.success) {
        console.log(`✅ [TrainerRewardManager] Récompenses distribuées avec succès`);
        console.log(`    Argent: ${calculatedRewards.money} pièces`);
        console.log(`    EXP total: ${calculatedRewards.totalExpGained}`);
        console.log(`    Objets: ${calculatedRewards.items.length}`);
        
        return calculatedRewards;
      } else {
        console.error(`❌ [TrainerRewardManager] Erreurs distribution:`, distributionResult.errors);
        return calculatedRewards; // Retourner quand même les calculs
      }
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur calcul récompenses:`, error);
      
      // Récompenses minimales en cas d'erreur
      return {
        money: trainerData.rewards.baseMoney,
        experience: [],
        items: [],
        totalExpGained: 0,
        moneyMultiplier: 1.0
      };
    }
  }
  
  /**
   * Calcule uniquement les récompenses sans les distribuer
   */
  async calculateRewardsOnly(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number,
    battleDuration: number = 0
  ): Promise<CalculatedRewards> {
    
    try {
      const calculationData = await this.gatherCalculationData(
        playerName,
        trainerData,
        battleTurns,
        battleDuration
      );
      
      return this.calculateAllRewards(calculationData);
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur calcul only:`, error);
      
      return {
        money: trainerData.rewards.baseMoney,
        experience: [],
        items: [],
        totalExpGained: 0,
        moneyMultiplier: 1.0
      };
    }
  }
  
  // === COLLECTE DE DONNÉES ===
  
  private async gatherCalculationData(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number,
    battleDuration: number
  ): Promise<RewardCalculationData> {
    
    console.log(`📊 [TrainerRewardManager] Collecte données pour ${playerName}...`);
    
    try {
      // Récupérer données joueur
      const playerData = await PlayerData.findOne({ username: playerName });
      const playerLevel = playerData?.level || 1;
      
      // Analyser performance combat
      const pokemonDefeated = trainerData.pokemon.length; // Tous vaincus si victoire
      
      // Récupérer équipe joueur pour analyser utilisation
      const playerPokemon = await OwnedPokemon.find({ 
        owner: playerName, 
        isInTeam: true 
      });
      const playerPokemonUsed = playerPokemon.length;
      
      // Déterminer bonus de performance
      const wasFlawlessVictory = this.determineFlawlessVictory();
      const wasCriticalVictory = battleTurns <= 10; // Victoire en moins de 10 tours
      
      console.log(`    Analyse performance: Parfaite=${wasFlawlessVictory}, Rapide=${wasCriticalVictory}`);
      
      return {
        playerName,
        playerLevel,
        trainerData,
        battleTurns,
        battleDuration,
        pokemonDefeated,
        playerPokemonUsed,
        wasFlawlessVictory,
        wasCriticalVictory
      };
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur collecte données:`, error);
      
      // Données minimales en cas d'erreur
      return {
        playerName,
        playerLevel: 1,
        trainerData,
        battleTurns,
        battleDuration,
        pokemonDefeated: trainerData.pokemon.length,
        playerPokemonUsed: 1,
        wasFlawlessVictory: false,
        wasCriticalVictory: false
      };
    }
  }
  
  /**
   * Détermine si la victoire était parfaite (à améliorer avec vraies données)
   */
  private determineFlawlessVictory(): boolean {
    // TODO: Analyser l'état des Pokémon joueur pour déterminer si aucun n'a été KO
    // Pour l'instant, simulation basée sur probabilité selon type de dresseur
    
    if (!this.gameState) return false;
    
    // Simulation basique : plus le dresseur est fort, moins probable la victoire parfaite
    const difficultyFactors = {
      'youngster': 0.6,
      'trainer': 0.4,
      'gym_leader': 0.2,
      'elite_four': 0.1,
      'champion': 0.05
    };
    
    // TODO: Remplacer par vraie analyse équipe joueur
    return Math.random() < 0.3; // 30% chance temporaire
  }
  
  // === CALCULS DE RÉCOMPENSES ===
  
  private calculateAllRewards(data: RewardCalculationData): CalculatedRewards {
    console.log(`🧮 [TrainerRewardManager] Calcul récompenses pour ${data.trainerData.name}...`);
    
    // 1. Calcul argent
    const money = this.calculateMoney(data);
    
    // 2. Calcul expérience
    const experience = this.calculateExperience(data);
    const totalExpGained = experience.reduce((sum, exp) => sum + exp.exp, 0);
    
    // 3. Calcul objets
    const items = this.calculateItems(data);
    
    // 4. Multiplicateur final
    const moneyMultiplier = this.calculateFinalMoneyMultiplier(data);
    
    const finalMoney = Math.floor(money * moneyMultiplier);
    
    console.log(`    Résultats: ${finalMoney} pièces, ${totalExpGained} EXP, ${items.length} objets`);
    
    return {
      money: finalMoney,
      experience,
      items,
      totalExpGained,
      moneyMultiplier
    };
  }
  
  /**
   * Calcule l'argent gagné
   */
  private calculateMoney(data: RewardCalculationData): number {
    const baseReward = data.trainerData.rewards;
    let money = baseReward.baseMoney * this.MONEY_BASE_MULTIPLIER;
    
    // Multiplicateur selon classe de dresseur
    const classMultiplier = TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS[
      data.trainerData.trainerClass as keyof typeof TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS
    ] || 1.0;
    
    money *= classMultiplier;
    
    // Bonus de performance
    if (data.wasFlawlessVictory) {
      money *= this.FLAWLESS_VICTORY_BONUS;
      console.log(`    Bonus victoire parfaite: x${this.FLAWLESS_VICTORY_BONUS}`);
    }
    
    if (data.wasCriticalVictory) {
      money *= this.CRITICAL_VICTORY_BONUS;
      console.log(`    Bonus victoire rapide: x${this.CRITICAL_VICTORY_BONUS}`);
    }
    
    // Modificateur différence de niveau
    const levelDifference = data.trainerData.level - data.playerLevel;
    const levelModifier = 1 + (levelDifference * this.LEVEL_DIFFERENCE_MODIFIER);
    money *= Math.max(0.5, Math.min(2.0, levelModifier)); // Borné entre 50% et 200%
    
    if (levelDifference !== 0) {
      console.log(`    Modificateur niveau (${levelDifference}): x${levelModifier.toFixed(2)}`);
    }
    
    return Math.floor(money);
  }
  
  /**
   * Calcule l'expérience distribuée
   */
  private calculateExperience(data: RewardCalculationData): { pokemonId: string; exp: number }[] {
    const baseExp = data.trainerData.rewards.baseExp;
    const expPerPokemon = Math.floor(baseExp * this.EXP_BASE_MULTIPLIER);
    
    // TODO: Distribuer selon les Pokémon qui ont réellement participé
    // Pour l'instant, simulation avec distribution équitable
    
    const experience: { pokemonId: string; exp: number }[] = [];
    
    // Répartir entre les Pokémon utilisés (simulation)
    for (let i = 0; i < Math.min(data.playerPokemonUsed, 6); i++) {
      let pokemonExp = expPerPokemon;
      
      // Bonus de performance
      if (data.wasFlawlessVictory) {
        pokemonExp *= this.FLAWLESS_VICTORY_BONUS;
      }
      
      if (data.wasCriticalVictory) {
        pokemonExp *= this.CRITICAL_VICTORY_BONUS;
      }
      
      experience.push({
        pokemonId: `pokemon_${i + 1}`, // TODO: Vrais IDs
        exp: Math.floor(pokemonExp)
      });
    }
    
    console.log(`    EXP: ${expPerPokemon} de base, distribué à ${experience.length} Pokémon`);
    
    return experience;
  }
  
  /**
   * Calcule les objets obtenus
   */
  private calculateItems(data: RewardCalculationData): ItemReward[] {
    const items: ItemReward[] = [];
    const trainerRewards = data.trainerData.rewards;
    
    if (!trainerRewards.items) return items;
    
    console.log(`    Calcul ${trainerRewards.items.length} objets possibles...`);
    
    for (const rewardItem of trainerRewards.items) {
      const roll = Math.random();
      
      if (roll <= rewardItem.chance) {
        let quantity = rewardItem.quantity;
        
        // Bonus de performance pour objets
        if (data.wasFlawlessVictory && rewardItem.chance < 1.0) {
          quantity = Math.floor(quantity * 1.5); // +50% objets bonus si victoire parfaite
        }
        
        const itemReward: ItemReward = {
          itemId: rewardItem.itemId,
          quantity: Math.max(1, quantity),
          rarity: this.determineItemRarity(rewardItem.itemId),
          source: rewardItem.chance === 1.0 ? 'guaranteed' : 'probability',
          rollResult: roll
        };
        
        items.push(itemReward);
        console.log(`      ✅ ${itemReward.itemId} x${itemReward.quantity} (${(roll * 100).toFixed(1)}% ≤ ${(rewardItem.chance * 100).toFixed(1)}%)`);
      } else {
        console.log(`      ❌ ${rewardItem.itemId} raté (${(roll * 100).toFixed(1)}% > ${(rewardItem.chance * 100).toFixed(1)}%)`);
      }
    }
    
    // Objets bonus selon performance
    if (data.wasFlawlessVictory) {
      items.push(...this.getBonusItems('flawless_victory', data.trainerData.trainerClass));
    }
    
    if (data.wasCriticalVictory) {
      items.push(...this.getBonusItems('critical_victory', data.trainerData.trainerClass));
    }
    
    return items;
  }
  
  /**
   * Calcule le multiplicateur d'argent final
   */
  private calculateFinalMoneyMultiplier(data: RewardCalculationData): number {
    let multiplier = data.trainerData.rewards.moneyMultiplier;
    
    // Bonus selon nombre de Pokémon vaincus
    const pokemonBonus = data.pokemonDefeated * 0.1; // +10% par Pokémon vaincu
    multiplier += pokemonBonus;
    
    return multiplier;
  }
  
  // === DISTRIBUTION DES RÉCOMPENSES ===
  
  private async distributeRewards(
    playerName: string,
    rewards: CalculatedRewards
  ): Promise<RewardDistributionResult> {
    
    console.log(`🎁 [TrainerRewardManager] Distribution récompenses à ${playerName}...`);
    
    const errors: string[] = [];
    let playerDataUpdated = false;
    let pokemonExpUpdated = 0;
    let inventoryUpdated = false;
    
    try {
      // 1. Distribuer argent
      if (rewards.money > 0) {
        try {
          await this.giveMoney(playerName, rewards.money);
          playerDataUpdated = true;
          console.log(`    ✅ Argent: +${rewards.money} pièces`);
        } catch (error) {
          errors.push(`Erreur distribution argent: ${error instanceof Error ? error.message : 'Inconnue'}`);
        }
      }
      
      // 2. Distribuer expérience
      if (rewards.experience.length > 0) {
        try {
          const expResult = await this.giveExperience(playerName, rewards.experience);
          pokemonExpUpdated = expResult.pokemonUpdated;
          console.log(`    ✅ EXP: ${expResult.pokemonUpdated} Pokémon mis à jour`);
        } catch (error) {
          errors.push(`Erreur distribution EXP: ${error instanceof Error ? error.message : 'Inconnue'}`);
        }
      }
      
      // 3. Distribuer objets
      if (rewards.items.length > 0) {
        try {
          await this.giveItems(playerName, rewards.items);
          inventoryUpdated = true;
          console.log(`    ✅ Objets: ${rewards.items.length} objets ajoutés`);
        } catch (error) {
          errors.push(`Erreur distribution objets: ${error instanceof Error ? error.message : 'Inconnue'}`);
        }
      }
      
      const success = errors.length === 0;
      
      if (success) {
        console.log(`✅ [TrainerRewardManager] Distribution complète sans erreur`);
      } else {
        console.warn(`⚠️ [TrainerRewardManager] Distribution avec ${errors.length} erreurs`);
      }
      
      return {
        success,
        rewardsGiven: rewards,
        errors,
        playerDataUpdated,
        pokemonExpUpdated,
        inventoryUpdated
      };
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur distribution globale:`, error);
      
      return {
        success: false,
        rewardsGiven: rewards,
        errors: [`Erreur globale: ${error instanceof Error ? error.message : 'Inconnue'}`],
        playerDataUpdated,
        pokemonExpUpdated,
        inventoryUpdated
      };
    }
  }
  
  /**
   * Donne de l'argent au joueur
   */
  private async giveMoney(playerName: string, amount: number): Promise<void> {
    try {
      const playerData = await PlayerData.findOne({ username: playerName });
      
      if (!playerData) {
        throw new Error(`Données joueur ${playerName} introuvables`);
      }
      
      playerData.gold += amount;
      await playerData.save();
      
      console.log(`💰 [TrainerRewardManager] +${amount} pièces pour ${playerName} (total: ${playerData.gold})`);
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur ajout argent:`, error);
      throw error;
    }
  }
  
  /**
   * Donne de l'expérience aux Pokémon
   */
  private async giveExperience(
    playerName: string,
    expRewards: { pokemonId: string; exp: number }[]
  ): Promise<{ pokemonUpdated: number; distributions: ExpDistribution[] }> {
    
    try {
      // Récupérer Pokémon équipe du joueur
      const playerPokemon = await OwnedPokemon.find({ 
        owner: playerName, 
        isInTeam: true 
      });
      
      if (playerPokemon.length === 0) {
        throw new Error(`Aucun Pokémon en équipe pour ${playerName}`);
      }
      
      const distributions: ExpDistribution[] = [];
      let pokemonUpdated = 0;
      
      // Distribuer équitablement à tous les Pokémon de l'équipe
      const expPerPokemon = Math.floor(
        expRewards.reduce((sum, exp) => sum + exp.exp, 0) / playerPokemon.length
      );
      
      for (const pokemon of playerPokemon) {
        if (expPerPokemon <= 0) continue;
        
        const oldLevel = pokemon.level;
        const oldExp = pokemon.experience;
        
        pokemon.experience += expPerPokemon;
        
        // Calculer nouveau niveau (formule simplifiée)
        const newLevel = this.calculateLevelFromExp(pokemon.experience);
        const leveledUp = newLevel > oldLevel;
        
        if (leveledUp) {
          pokemon.level = newLevel;
          // TODO: Recalculer stats si niveau up
        }
        
        await pokemon.save();
        pokemonUpdated++;
        
        distributions.push({
          pokemonId: pokemon.pokemonId.toString(),
          pokemonName: pokemon.nickname || `Pokemon_${pokemon.pokemonId}`,
          ownedPokemonId: pokemon._id.toString(),
          oldLevel,
          newLevel,
          expGained: expPerPokemon,
          totalExp: pokemon.experience,
          leveledUp
        });
        
        console.log(`🌟 [TrainerRewardManager] ${pokemon.nickname || 'Pokemon'}: +${expPerPokemon} EXP${leveledUp ? ` (Niv. ${oldLevel} → ${newLevel})` : ''}`);
      }
      
      return { pokemonUpdated, distributions };
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur distribution EXP:`, error);
      throw error;
    }
  }
  
  /**
   * Donne des objets au joueur
   */
  private async giveItems(playerName: string, itemRewards: ItemReward[]): Promise<void> {
    try {
      const givePromises = itemRewards.map(item => 
        InventoryManager.addItem(playerName, item.itemId, item.quantity)
      );
      
      await Promise.all(givePromises);
      
      console.log(`🎒 [TrainerRewardManager] ${itemRewards.length} objets ajoutés à l'inventaire de ${playerName}`);
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur ajout objets:`, error);
      throw error;
    }
  }
  
  // === UTILITAIRES ===
  
  /**
   * Détermine la rareté d'un objet
   */
  private determineItemRarity(itemId: string): 'common' | 'uncommon' | 'rare' | 'legendary' {
    const rarityMap: Record<string, 'common' | 'uncommon' | 'rare' | 'legendary'> = {
      'poke_ball': 'common',
      'great_ball': 'common',
      'ultra_ball': 'uncommon',
      'master_ball': 'legendary',
      'potion': 'common',
      'super_potion': 'uncommon',
      'hyper_potion': 'rare',
      'revive': 'uncommon',
      'tm_special': 'rare',
      'rare_candy': 'rare',
      'pp_max': 'rare',
      'golden_berry': 'legendary'
    };
    
    return rarityMap[itemId] || 'common';
  }
  
  /**
   * Objets bonus selon performance
   */
  private getBonusItems(bonusType: 'flawless_victory' | 'critical_victory', trainerClass: string): ItemReward[] {
    const bonusItems: ItemReward[] = [];
    
    if (bonusType === 'flawless_victory') {
      // Bonus victoire parfaite
      bonusItems.push({
        itemId: 'super_potion',
        quantity: 2,
        rarity: 'uncommon',
        source: 'bonus'
      });
      
      if (['gym_leader', 'elite_four', 'champion'].includes(trainerClass)) {
        bonusItems.push({
          itemId: 'rare_candy',
          quantity: 1,
          rarity: 'rare',
          source: 'bonus'
        });
      }
    }
    
    if (bonusType === 'critical_victory') {
      // Bonus victoire rapide
      bonusItems.push({
        itemId: 'great_ball',
        quantity: 3,
        rarity: 'common',
        source: 'bonus'
      });
    }
    
    return bonusItems;
  }
  
  /**
   * Calcule le niveau depuis l'expérience
   */
  private calculateLevelFromExp(experience: number): number {
    // Formule simplifiée : niveau = racine cubique de l'expérience
    const level = Math.floor(Math.pow(experience, 1/3));
    return Math.max(1, Math.min(100, level));
  }
  
  // === API PUBLIQUE ÉTENDUE ===
  
  /**
   * Vérifie si le manager est prêt
   */
  isReady(): boolean {
    return this.isInitialized && this.gameState !== null;
  }
  
  /**
   * Aperçu des récompenses sans les donner
   */
  async previewRewards(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number
  ): Promise<CalculatedRewards> {
    
    return await this.calculateRewardsOnly(playerName, trainerData, battleTurns);
  }
  
  /**
   * Statistiques du gestionnaire
   */
  getStats(): any {
    return {
      version: 'trainer_reward_manager_v1',
      isReady: this.isReady(),
      configuration: {
        expBaseMultiplier: this.EXP_BASE_MULTIPLIER,
        moneyBaseMultiplier: this.MONEY_BASE_MULTIPLIER,
        flawlessBonus: this.FLAWLESS_VICTORY_BONUS,
        criticalBonus: this.CRITICAL_VICTORY_BONUS,
        levelModifier: this.LEVEL_DIFFERENCE_MODIFIER
      },
      features: [
        'money_calculation_with_bonuses',
        'experience_distribution',
        'item_probability_system',
        'performance_bonus_system',
        'level_difference_scaling',
        'database_integration',
        'inventory_manager_integration',
        'extensible_reward_system'
      ],
      supportedRewards: [
        'money_with_multipliers',
        'pokemon_experience',
        'item_drops_with_probability',
        'bonus_items_for_performance',
        'trainer_class_scaling'
      ]
    };
  }
  
  /**
   * Reset pour un nouveau combat
   */
  reset(): void {
    this.gameState = null;
    this.isInitialized = false;
    console.log('🔄 [TrainerRewardManager] Reset effectué');
  }
}

export default TrainerRewardManager;
