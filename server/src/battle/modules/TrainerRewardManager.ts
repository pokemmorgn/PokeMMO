// server/src/battle/modules/TrainerRewardManager.ts
// 🎁 SESSION 3 - GESTIONNAIRE RÉCOMPENSES DRESSEURS AVEC INTÉGRATION DB

import { BattleGameState } from '../types/BattleTypes';
import { 
  TrainerData, 
  TrainerRewards, 
  CalculatedRewards,
  TRAINER_BATTLE_CONSTANTS 
} from '../types/TrainerBattleTypes';
import { InventoryManager } from '../../managers/InventoryManager';
import { PlayerData } from '../../models/PlayerData';
import { OwnedPokemon } from '../../models/OwnedPokemon';

// === INTERFACES RÉCOMPENSES ===

export interface RewardCalculationResult {
  success: boolean;
  money: number;
  experience: PokemonExpReward[];
  items: ProcessedItemReward[];
  totalExpGained: number;
  moneyMultiplier: number;
  error?: string;
}

export interface PokemonExpReward {
  pokemonId: string;
  pokemonName: string;
  baseExp: number;
  bonusExp: number;
  totalExp: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
}

export interface ProcessedItemReward {
  itemId: string;
  itemName: string;
  quantity: number;
  rarity: string;
  received: boolean;
  failureReason?: string;
}

export interface BattleAnalysis {
  playerLevel: number;
  trainerLevel: number;
  levelDifference: number;
  battleDuration: number;
  turnsPlayed: number;
  pokemonDefeated: number;
  perfectionBonus: number;
  difficultyMultiplier: number;
}

/**
 * TRAINER REWARD MANAGER - Gestionnaire récompenses complet
 * 
 * Responsabilités :
 * - Calcul récompenses selon profil dresseur
 * - Attribution argent avec multiplicateurs
 * - Distribution EXP aux Pokémon équipe
 * - Gestion objets avec probabilités
 * - Intégration base de données
 * - Système bonus et multiplicateurs
 */
export class TrainerRewardManager {
  
  private gameState: BattleGameState | null = null;
  private isInitialized = false;
  
  // Configuration récompenses
  private readonly BASE_MONEY_MULTIPLIER = 1.0;
  private readonly BASE_EXP_MULTIPLIER = 1.0;
  private readonly LEVEL_DIFFERENCE_BONUS_CAP = 2.0;
  private readonly PERFECTION_BONUS_CAP = 1.5;
  
  // Cache pour performance
  private rewardCache = new Map<string, RewardCalculationResult>();
  
  constructor() {
    console.log('🎁 [TrainerRewardManager] Gestionnaire récompenses initialisé');
  }
  
  // === INITIALISATION ===
  
  initialize(gameState: BattleGameState): void {
    this.gameState = gameState;
    this.isInitialized = true;
    this.rewardCache.clear();
    
    console.log(`✅ [TrainerRewardManager] Configuré pour combat ${gameState.battleId}`);
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Calcule et attribue toutes les récompenses d'un combat dresseur
   */
  async calculateAndGiveRewards(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number
  ): Promise<CalculatedRewards> {
    
    console.log(`🎁 [TrainerRewardManager] Calcul récompenses vs ${trainerData.name}...`);
    
    if (!this.isInitialized || !this.gameState) {
      throw new Error('TrainerRewardManager non initialisé');
    }
    
    try {
      // 1. Analyse du combat
      const battleAnalysis = await this.analyzeBattle(playerName, trainerData, battleTurns);
      console.log(`📊 [TrainerRewardManager] Analyse: niveau ${battleAnalysis.playerLevel} vs ${battleAnalysis.trainerLevel}`);
      
      // 2. Calcul récompenses
      const rewardResult = await this.calculateRewards(
        playerName,
        trainerData,
        battleAnalysis
      );
      
      if (!rewardResult.success) {
        throw new Error(rewardResult.error || 'Échec calcul récompenses');
      }
      
      console.log(`💰 [TrainerRewardManager] Récompenses calculées: ${rewardResult.money} pièces, ${rewardResult.totalExpGained} EXP`);
      
      // 3. Attribution effective
      await this.giveCalculatedRewards(playerName, rewardResult);
      
      // 4. Création résultat final
      const finalRewards: CalculatedRewards = {
        money: rewardResult.money,
        experience: rewardResult.experience.map(exp => ({
          pokemonId: exp.pokemonId,
          exp: exp.totalExp
        })),
        items: rewardResult.items.filter(item => item.received).map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        })),
        totalExpGained: rewardResult.totalExpGained,
        moneyMultiplier: rewardResult.moneyMultiplier
      };
      
      console.log(`✅ [TrainerRewardManager] Récompenses attribuées avec succès !`);
      
      return finalRewards;
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur attribution récompenses:`, error);
      
      // Récompenses minimales en cas d'erreur
      return {
        money: trainerData.rewards.baseMoney || 100,
        experience: [],
        items: [],
        totalExpGained: 0,
        moneyMultiplier: 1.0
      };
    }
  }
  
  // === CALCUL RÉCOMPENSES ===
  
  /**
   * Calcule toutes les récompenses sans les attribuer
   */
  private async calculateRewards(
    playerName: string,
    trainerData: TrainerData,
    battleAnalysis: BattleAnalysis
  ): Promise<RewardCalculationResult> {
    
    try {
      // Calcul argent
      const moneyReward = this.calculateMoneyReward(trainerData, battleAnalysis);
      console.log(`💰 [TrainerRewardManager] Argent: ${moneyReward.amount} (x${moneyReward.multiplier})`);
      
      // Calcul expérience
      const expRewards = await this.calculateExperienceRewards(
        playerName,
        trainerData,
        battleAnalysis
      );
      console.log(`⭐ [TrainerRewardManager] EXP: ${expRewards.length} Pokémon récompensés`);
      
      // Calcul objets
      const itemRewards = await this.calculateItemRewards(trainerData, battleAnalysis);
      console.log(`🎒 [TrainerRewardManager] Objets: ${itemRewards.length} types possibles`);
      
      const totalExpGained = expRewards.reduce((sum, exp) => sum + exp.totalExp, 0);
      
      return {
        success: true,
        money: moneyReward.amount,
        experience: expRewards,
        items: itemRewards,
        totalExpGained,
        moneyMultiplier: moneyReward.multiplier
      };
      
    } catch (error) {
      return {
        success: false,
        money: 0,
        experience: [],
        items: [],
        totalExpGained: 0,
        moneyMultiplier: 1.0,
        error: error instanceof Error ? error.message : 'Erreur calcul récompenses'
      };
    }
  }
  
  /**
   * Calcule les récompenses d'argent
   */
  private calculateMoneyReward(
    trainerData: TrainerData,
    battleAnalysis: BattleAnalysis
  ): { amount: number; multiplier: number } {
    
    const baseRewards = trainerData.rewards;
    let finalMultiplier = baseRewards.moneyMultiplier * this.BASE_MONEY_MULTIPLIER;
    
    // Bonus différence de niveau
    const levelBonus = Math.min(
      battleAnalysis.levelDifference * 0.1,
      this.LEVEL_DIFFERENCE_BONUS_CAP - 1.0
    );
    finalMultiplier += levelBonus;
    
    // Bonus performance
    finalMultiplier += battleAnalysis.perfectionBonus;
    
    // Multiplicateur difficulté
    finalMultiplier *= battleAnalysis.difficultyMultiplier;
    
    const finalAmount = Math.floor(baseRewards.baseMoney * finalMultiplier);
    
    return {
      amount: Math.max(finalAmount, 50), // Minimum 50 pièces
      multiplier: finalMultiplier
    };
  }
  
  /**
   * Calcule les récompenses d'expérience pour l'équipe
   */
  private async calculateExperienceRewards(
    playerName: string,
    trainerData: TrainerData,
    battleAnalysis: BattleAnalysis
  ): Promise<PokemonExpReward[]> {
    
    try {
      // Récupérer équipe du joueur
      const playerTeam = await OwnedPokemon.find({
        owner: playerName,
        isInTeam: true
      }).limit(6);
      
      if (playerTeam.length === 0) {
        console.warn(`⚠️ [TrainerRewardManager] Aucun Pokémon en équipe pour ${playerName}`);
        return [];
      }
      
      const expRewards: PokemonExpReward[] = [];
      const baseRewards = trainerData.rewards;
      
      // Base EXP par Pokémon
      let baseExpPerPokemon = Math.floor(baseRewards.baseExp / playerTeam.length);
      
      // Bonus multiplicateurs
      let expMultiplier = baseRewards.expMultiplier * this.BASE_EXP_MULTIPLIER;
      expMultiplier += battleAnalysis.perfectionBonus * 0.5; // Bonus performance réduit pour EXP
      expMultiplier *= battleAnalysis.difficultyMultiplier;
      
      for (const pokemon of playerTeam) {
        const levelBefore = pokemon.level;
        
        // Calcul EXP avec bonus selon niveau relatif
        let pokemonBaseExp = baseExpPerPokemon;
        
        // Bonus si Pokémon plus faible que dresseur
        const levelDiff = battleAnalysis.trainerLevel - pokemon.level;
        if (levelDiff > 0) {
          pokemonBaseExp += Math.floor(levelDiff * 10); // +10 EXP par niveau de différence
        }
        
        const bonusExp = Math.floor(pokemonBaseExp * (expMultiplier - 1.0));
        const totalExp = pokemonBaseExp + bonusExp;
        
        // Calcul nouveau niveau (simulation simple)
        const newTotalExp = pokemon.experience + totalExp;
        const levelAfter = this.calculateLevelFromExp(newTotalExp);
        const leveledUp = levelAfter > levelBefore;
        
        expRewards.push({
          pokemonId: pokemon._id.toString(),
          pokemonName: pokemon.nickname || `Pokémon #${pokemon.pokemonId}`,
          baseExp: pokemonBaseExp,
          bonusExp: bonusExp,
          totalExp: totalExp,
          levelBefore,
          levelAfter,
          leveledUp
        });
      }
      
      return expRewards;
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur calcul EXP:`, error);
      return [];
    }
  }
  
  /**
   * Calcule les récompenses d'objets avec probabilités
   */
  private async calculateItemRewards(
    trainerData: TrainerData,
    battleAnalysis: BattleAnalysis
  ): Promise<ProcessedItemReward[]> {
    
    const itemRewards: ProcessedItemReward[] = [];
    const rewardItems = trainerData.rewards.items || [];
    
    for (const rewardItem of rewardItems) {
      // Calcul probabilité avec bonus performance
      let finalChance = rewardItem.chance;
      finalChance += battleAnalysis.perfectionBonus * 0.1; // +10% max avec perfection
      finalChance = Math.min(finalChance, 1.0); // Cap à 100%
      
      const received = Math.random() < finalChance;
      
      itemRewards.push({
        itemId: rewardItem.itemId,
        itemName: this.getItemDisplayName(rewardItem.itemId),
        quantity: rewardItem.quantity,
        rarity: this.getItemRarity(rewardItem.itemId),
        received: received,
        failureReason: received ? undefined : `Probabilité ${(finalChance * 100).toFixed(1)}% non atteinte`
      });
    }
    
    return itemRewards;
  }
  
  // === ATTRIBUTION EFFECTIVE ===
  
  /**
   * Attribue effectivement toutes les récompenses calculées
   */
  private async giveCalculatedRewards(
    playerName: string,
    rewardResult: RewardCalculationResult
  ): Promise<void> {
    
    console.log(`🎁 [TrainerRewardManager] Attribution effective des récompenses...`);
    
    try {
      // 1. Donner l'argent
      if (rewardResult.money > 0) {
        await this.giveMoney(playerName, rewardResult.money);
        console.log(`💰 [TrainerRewardManager] ${rewardResult.money} pièces attribuées`);
      }
      
      // 2. Donner l'expérience
      if (rewardResult.experience.length > 0) {
        await this.giveExperience(playerName, rewardResult.experience);
        console.log(`⭐ [TrainerRewardManager] EXP attribuée à ${rewardResult.experience.length} Pokémon`);
      }
      
      // 3. Donner les objets reçus
      const receivedItems = rewardResult.items.filter(item => item.received);
      if (receivedItems.length > 0) {
        await this.giveProcessedItems(playerName, receivedItems);
        console.log(`🎒 [TrainerRewardManager] ${receivedItems.length} objets attribués`);
      }
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur attribution:`, error);
      throw error;
    }
  }
  
  /**
   * Attribue l'argent au joueur
   */
  private async giveMoney(playerName: string, amount: number): Promise<void> {
    try {
      let playerData = await PlayerData.findOne({ username: playerName });
      
      if (!playerData) {
        console.warn(`⚠️ [TrainerRewardManager] Joueur ${playerName} non trouvé, création...`);
        playerData = new PlayerData({
          username: playerName,
          gold: amount,
          level: 1
        });
      } else {
        playerData.gold = (playerData.gold || 0) + amount;
      }
      
      await playerData.save();
      
      console.log(`💰 [TrainerRewardManager] ${amount} pièces ajoutées (total: ${playerData.gold})`);
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur ajout argent:`, error);
      throw error;
    }
  }
  
  /**
   * Attribue l'expérience aux Pokémon
   */
  private async giveExperience(
    playerName: string,
    expRewards: PokemonExpReward[]
  ): Promise<void> {
    
    try {
      for (const expReward of expRewards) {
        const pokemon = await OwnedPokemon.findById(expReward.pokemonId);
        
        if (pokemon && pokemon.owner === playerName) {
          const oldExp = pokemon.experience;
          const oldLevel = pokemon.level;
          
          pokemon.experience += expReward.totalExp;
          
          // Recalcul niveau si nécessaire
          const newLevel = this.calculateLevelFromExp(pokemon.experience);
          if (newLevel > oldLevel) {
            pokemon.level = newLevel;
            
            // Recalcul des stats (simplifié)
            await this.recalculatePokemonStats(pokemon);
            
            console.log(`📈 [TrainerRewardManager] ${expReward.pokemonName}: ${oldLevel} → ${newLevel} !`);
          }
          
          await pokemon.save();
        }
      }
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur attribution EXP:`, error);
      throw error;
    }
  }
  
  /**
   * Attribue les objets au joueur
   */
  private async giveProcessedItems(
    playerName: string,
    items: ProcessedItemReward[]
  ): Promise<void> {
    
    try {
      for (const item of items) {
        // Utiliser InventoryManager pour compatibilité
        const success = await InventoryManager.addItem(
          playerName,
          item.itemId,
          item.quantity
        );
        
        if (success) {
          console.log(`🎒 [TrainerRewardManager] ${item.itemName} x${item.quantity} ajouté`);
        } else {
          console.warn(`⚠️ [TrainerRewardManager] Échec ajout ${item.itemName}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur attribution objets:`, error);
      throw error;
    }
  }
  
  // === ANALYSE COMBAT ===
  
  /**
   * Analyse les paramètres du combat pour calculer les bonus
   */
  private async analyzeBattle(
    playerName: string,
    trainerData: TrainerData,
    battleTurns: number
  ): Promise<BattleAnalysis> {
    
    try {
      // Récupérer niveau joueur (moyenne équipe)
      const playerTeam = await OwnedPokemon.find({
        owner: playerName,
        isInTeam: true
      }).limit(6);
      
      const playerLevel = playerTeam.length > 0 ? 
        Math.floor(playerTeam.reduce((sum, p) => sum + p.level, 0) / playerTeam.length) : 
        20; // Niveau par défaut
      
      const trainerLevel = trainerData.level;
      const levelDifference = Math.max(0, trainerLevel - playerLevel); // Bonus si dresseur plus fort
      
      // Calcul durée (estimation basée sur les tours)
      const estimatedBattleDuration = battleTurns * 30000; // 30s par tour en moyenne
      
      // Bonus perfection (moins de tours = mieux)
      const idealTurns = trainerData.pokemon.length * 2; // 2 tours par Pokémon adversaire idéal
      const perfectionRatio = Math.max(0, (idealTurns - battleTurns) / idealTurns);
      const perfectionBonus = perfectionRatio * 0.3; // Max +30%
      
      // Multiplicateur selon classe de dresseur
      const difficultyMultiplier = TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS[
        trainerData.trainerClass as keyof typeof TRAINER_BATTLE_CONSTANTS.REWARD_BASE_MULTIPLIERS
      ] || 1.0;
      
      return {
        playerLevel,
        trainerLevel,
        levelDifference,
        battleDuration: estimatedBattleDuration,
        turnsPlayed: battleTurns,
        pokemonDefeated: trainerData.pokemon.length,
        perfectionBonus: Math.min(perfectionBonus, 0.3),
        difficultyMultiplier
      };
      
    } catch (error) {
      console.error(`❌ [TrainerRewardManager] Erreur analyse combat:`, error);
      
      // Valeurs par défaut en cas d'erreur
      return {
        playerLevel: 20,
        trainerLevel: trainerData.level,
        levelDifference: 0,
        battleDuration: battleTurns * 30000,
        turnsPlayed: battleTurns,
        pokemonDefeated: trainerData.pokemon.length,
        perfectionBonus: 0,
        difficultyMultiplier: 1.0
      };
    }
  }
  
  // === UTILITAIRES ===
  
  /**
   * Calcule le niveau à partir de l'expérience (formule simple)
   */
  private calculateLevelFromExp(experience: number): number {
    // Formule cubique simplifiée : level = (exp / 1000) ^ (1/3)
    const level = Math.floor(Math.pow(experience / 1000, 1/3)) + 1;
    return Math.min(Math.max(level, 1), 100); // Entre 1 et 100
  }
  
  /**
   * Recalcule les stats d'un Pokémon après montée de niveau
   */
  private async recalculatePokemonStats(pokemon: any): Promise<void> {
    // Recalcul simplifié - dans un vrai jeu, utiliser les vraies formules
    const baseMultiplier = pokemon.level / 50; // Facteur de base
    
    pokemon.calculatedStats = {
      attack: Math.floor(pokemon.calculatedStats.attack * (1 + baseMultiplier * 0.1)),
      defense: Math.floor(pokemon.calculatedStats.defense * (1 + baseMultiplier * 0.1)),
      spAttack: Math.floor(pokemon.calculatedStats.spAttack * (1 + baseMultiplier * 0.1)),
      spDefense: Math.floor(pokemon.calculatedStats.spDefense * (1 + baseMultiplier * 0.1)),
      speed: Math.floor(pokemon.calculatedStats.speed * (1 + baseMultiplier * 0.1))
    };
    
    // Recalcul HP
    const hpRatio = pokemon.currentHp / pokemon.maxHp;
    pokemon.maxHp = Math.floor(pokemon.maxHp * (1 + baseMultiplier * 0.15)); // HP augmente plus
    pokemon.currentHp = Math.floor(pokemon.maxHp * hpRatio); // Garde le ratio HP
  }
  
  /**
   * Récupère le nom d'affichage d'un objet
   */
  private getItemDisplayName(itemId: string): string {
    const displayNames: Record<string, string> = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'max_potion': 'Potion Max',
      'revive': 'Rappel',
      'max_revive': 'Rappel Max',
      'rare_candy': 'Super Bonbon',
      'pp_up': 'PP Plus',
      'pp_max': 'PP Max',
      'tm_special': 'CT Spéciale',
      'golden_berry': 'Baie Dorée'
    };
    
    return displayNames[itemId] || itemId;
  }
  
  /**
   * Détermine la rareté d'un objet
   */
  private getItemRarity(itemId: string): string {
    const rarities: Record<string, string> = {
      'poke_ball': 'common',
      'great_ball': 'common',
      'potion': 'common',
      'super_potion': 'uncommon',
      'ultra_ball': 'uncommon',
      'hyper_potion': 'uncommon',
      'revive': 'uncommon',
      'rare_candy': 'rare',
      'pp_up': 'rare',
      'tm_special': 'rare',
      'master_ball': 'legendary',
      'pp_max': 'legendary',
      'golden_berry': 'legendary'
    };
    
    return rarities[itemId] || 'common';
  }
  
  // === DIAGNOSTICS ET ÉTAT ===
  
  /**
   * Vérifie si le manager est prêt
   */
  isReady(): boolean {
    return this.isInitialized && this.gameState !== null;
  }
  
  /**
   * Statistiques du gestionnaire
   */
  getStats(): any {
    return {
      version: 'trainer_reward_manager_v1',
      architecture: 'TrainerRewardManager + DB Integration',
      status: 'Production Ready',
      isInitialized: this.isInitialized,
      battleId: this.gameState?.battleId,
      cacheSize: this.rewardCache.size,
      features: [
        'dynamic_money_calculation',
        'team_exp_distribution',
        'probabilistic_item_rewards',
        'performance_bonus_system',
        'trainer_class_multipliers',
        'level_difference_scaling',
        'database_integration',
        'pokemon_stat_recalculation',
        'inventory_manager_compatibility'
      ],
      configuration: {
        baseMoneyMultiplier: this.BASE_MONEY_MULTIPLIER,
        baseExpMultiplier: this.BASE_EXP_MULTIPLIER,
        levelDifferenceCap: this.LEVEL_DIFFERENCE_BONUS_CAP,
        perfectionBonusCap: this.PERFECTION_BONUS_CAP
      }
    };
  }
  
  /**
   * Reset pour nouveau combat
   */
  reset(): void {
    this.gameState = null;
    this.isInitialized = false;
    this.rewardCache.clear();
    
    console.log('🔄 [TrainerRewardManager] Reset effectué');
  }
}

export default TrainerRewardManager;
