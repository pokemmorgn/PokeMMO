// server/src/managers/battle/BattleEndManager.ts
// Gestionnaire spécialisé pour les fins de combat et récompenses

import { BattlePokemon } from "../../schema/BattleState";
import { getPokemonById } from "../../data/PokemonData";

export type BattleEndReason = 
  | 'pokemon_fainted' 
  | 'pokemon_captured' 
  | 'player_fled' 
  | 'player_disconnected'
  | 'turn_limit_reached'
  | 'forfeit';

export type BattleResult = 'victory' | 'defeat' | 'draw' | 'fled' | 'interrupted';

export interface BattleEndCondition {
  reason: BattleEndReason;
  result: BattleResult;
  winner?: string;
  loser?: string;
  details?: any;
}

export interface BattleRewards {
  experience: {
    gained: number;
    pokemonId: number;
    newLevel?: number;
    movesLearned?: string[];
  }[];
  money: number;
  items: {
    itemId: string;
    quantity: number;
    name: string;
  }[];
  pokemonCaught?: {
    pokemonId: number;
    species: string;
    level: number;
    shiny: boolean;
  };
  badges?: string[];
  achievements?: string[];
  stats: {
    battlesWon: number;
    battlesLost: number;
    pokemonDefeated: number;
    totalDamageDealt: number;
    totalDamageReceived: number;
  };
}

export interface BattleParticipant {
  sessionId: string;
  name: string;
  isAI: boolean;
  activePokemon: BattlePokemon;
  team: BattlePokemon[];
  isConnected: boolean;
}

export interface BattleContext {
  battleId: string;
  battleType: 'wild' | 'trainer' | 'gym' | 'elite4' | 'pvp';
  turnNumber: number;
  startTime: Date;
  location: string;
  participants: BattleParticipant[];
  damageDealt: Map<string, number>;
  damageReceived: Map<string, number>;
  pokemonDefeated: Map<string, number>;
}

/**
 * GESTIONNAIRE DES FINS DE COMBAT
 * 
 * Responsabilités :
 * - Détection des conditions de fin
 * - Calcul des récompenses (XP, argent, objets)
 * - Sauvegarde des états Pokémon
 * - Mise à jour des statistiques joueur
 * - Gestion des montées de niveau
 * - Attribution des badges/achievements
 */
export class BattleEndManager {

  // Configuration des récompenses par type de combat
  private static readonly REWARD_CONFIG = {
    wild: {
      baseExpMultiplier: 1.0,
      baseMoneyMultiplier: 1.0,
      itemDropChance: 0.1,
      expFormulaType: 'wild'
    },
    trainer: {
      baseExpMultiplier: 1.5,
      baseMoneyMultiplier: 2.0,
      itemDropChance: 0.3,
      expFormulaType: 'trainer'
    },
    gym: {
      baseExpMultiplier: 2.0,
      baseMoneyMultiplier: 5.0,
      itemDropChance: 0.8,
      expFormulaType: 'trainer',
      badgeReward: true
    },
    elite4: {
      baseExpMultiplier: 3.0,
      baseMoneyMultiplier: 10.0,
      itemDropChance: 1.0,
      expFormulaType: 'trainer',
      specialRewards: true
    },
    pvp: {
      baseExpMultiplier: 1.2,
      baseMoneyMultiplier: 0.5,
      itemDropChance: 0.05,
      expFormulaType: 'pvp'
    }
  };

  // Tables de drop d'objets
  private static readonly ITEM_DROP_TABLES = {
    wild: [
      { itemId: 'potion', weight: 40, quantity: [1, 2] },
      { itemId: 'antidote', weight: 20, quantity: [1, 1] },
      { itemId: 'pokeball', weight: 15, quantity: [1, 3] },
      { itemId: 'greatball', weight: 10, quantity: [1, 1] },
      { itemId: 'super_potion', weight: 10, quantity: [1, 1] },
      { itemId: 'rare_candy', weight: 2, quantity: [1, 1] },
      { itemId: 'nugget', weight: 1, quantity: [1, 1] }
    ],
    trainer: [
      { itemId: 'super_potion', weight: 30, quantity: [1, 2] },
      { itemId: 'full_heal', weight: 20, quantity: [1, 1] },
      { itemId: 'greatball', weight: 20, quantity: [1, 2] },
      { itemId: 'ultraball', weight: 15, quantity: [1, 1] },
      { itemId: 'rare_candy', weight: 8, quantity: [1, 1] },
      { itemId: 'pp_up', weight: 5, quantity: [1, 1] },
      { itemId: 'tm_fragment', weight: 2, quantity: [1, 1] }
    ]
  };

  /**
   * ✅ MÉTHODE PRINCIPALE : Vérifie si le combat doit se terminer
   */
  static checkEndConditions(context: BattleContext): BattleEndCondition | null {
    console.log(`🏁 [BattleEndManager] Vérification conditions de fin...`);

    // 1. Vérifier les Pokémon K.O.
    const koCondition = this.checkPokemonKO(context);
    if (koCondition) return koCondition;

    // 2. Vérifier les déconnexions
    const disconnectCondition = this.checkDisconnections(context);
    if (disconnectCondition) return disconnectCondition;

    // 3. Vérifier la limite de tours
    const turnLimitCondition = this.checkTurnLimit(context);
    if (turnLimitCondition) return turnLimitCondition;

    // 4. Conditions spéciales selon le type de combat
    const specialCondition = this.checkSpecialConditions(context);
    if (specialCondition) return specialCondition;

    console.log(`🏁 [BattleEndManager] Aucune condition de fin détectée`);
    return null;
  }

  /**
   * ✅ MÉTHODE PRINCIPALE : Calcule les récompenses de fin de combat
   */
  static async calculateRewards(
    endCondition: BattleEndCondition,
    context: BattleContext
  ): Promise<BattleRewards> {
    console.log(`🎁 [BattleEndManager] === CALCUL DES RÉCOMPENSES ===`);
    console.log(`🎁 Résultat: ${endCondition.result}`);
    console.log(`🎁 Raison: ${endCondition.reason}`);

    const config = this.REWARD_CONFIG[context.battleType as keyof typeof this.REWARD_CONFIG] || this.REWARD_CONFIG.wild;
    const rewards: BattleRewards = {
      experience: [],
      money: 0,
      items: [],
      stats: {
        battlesWon: 0,
        battlesLost: 0,
        pokemonDefeated: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0
      }
    };

    // Seulement calculer les récompenses pour les victoires
    if (endCondition.result === 'victory') {
      // 1. Calculer l'expérience
      rewards.experience = await this.calculateExperience(context, config);

      // 2. Calculer l'argent
      rewards.money = this.calculateMoney(context, config);

      // 3. Générer les objets
      rewards.items = this.generateItemRewards(context, config);

      // 4. Badges et achievements spéciaux
      if ('badgeReward' in config && config.badgeReward) {
        rewards.badges = this.calculateBadgeRewards(context);
      }

      rewards.achievements = this.calculateAchievements(context, endCondition);
    }

    // 5. Statistiques (toujours calculées)
    rewards.stats = this.calculateStatistics(context, endCondition);

    console.log(`🎁 [BattleEndManager] Récompenses calculées:`, {
      exp: rewards.experience.reduce((sum, exp) => sum + exp.gained, 0),
      money: rewards.money,
      items: rewards.items.length,
      badges: rewards.badges?.length || 0
    });

    return rewards;
  }

  /**
   * ✅ MÉTHODE PRINCIPALE : Traite la fin complète du combat
   */
  static async processBattleEnd(
    endCondition: BattleEndCondition,
    context: BattleContext,
    callbacks?: {
      onExperienceGained?: (pokemonId: number, expGained: number, newLevel?: number) => void;
      onLevelUp?: (pokemonId: number, newLevel: number, movesLearned: string[]) => void;
      onMoneyGained?: (amount: number) => void;
      onItemReceived?: (itemId: string, quantity: number) => void;
      onBadgeEarned?: (badgeId: string) => void;
      onAchievementUnlocked?: (achievementId: string) => void;
      onPokemonStateUpdate?: (pokemonId: number, newState: any) => void;
      onPlayerStatsUpdate?: (playerId: string, stats: any) => void;
    }
  ): Promise<BattleRewards> {
    console.log(`🏆 [BattleEndManager] === TRAITEMENT FIN DE COMBAT ===`);

    try {
      // 1. Calculer les récompenses
      const rewards = await this.calculateRewards(endCondition, context);

      // 2. Sauvegarder l'état des Pokémon
      await this.savePokemonStates(context, callbacks);

      // 3. Appliquer l'expérience et gérer les montées de niveau
      for (const expReward of rewards.experience) {
        if (callbacks?.onExperienceGained) {
          callbacks.onExperienceGained(expReward.pokemonId, expReward.gained, expReward.newLevel);
        }

        if (expReward.newLevel && callbacks?.onLevelUp) {
          callbacks.onLevelUp(expReward.pokemonId, expReward.newLevel, expReward.movesLearned || []);
        }
      }

      // 4. Attribuer l'argent
      if (rewards.money > 0 && callbacks?.onMoneyGained) {
        callbacks.onMoneyGained(rewards.money);
      }

      // 5. Attribuer les objets
      for (const item of rewards.items) {
        if (callbacks?.onItemReceived) {
          callbacks.onItemReceived(item.itemId, item.quantity);
        }
      }

      // 6. Attribuer les badges
      if (rewards.badges) {
        for (const badge of rewards.badges) {
          if (callbacks?.onBadgeEarned) {
            callbacks.onBadgeEarned(badge);
          }
        }
      }

      // 7. Débloquer les achievements
      if (rewards.achievements) {
        for (const achievement of rewards.achievements) {
          if (callbacks?.onAchievementUnlocked) {
            callbacks.onAchievementUnlocked(achievement);
          }
        }
      }

      // 8. Mettre à jour les statistiques du joueur
      if (callbacks?.onPlayerStatsUpdate) {
        const humanParticipant = context.participants.find(p => !p.isAI);
        if (humanParticipant) {
          callbacks.onPlayerStatsUpdate(humanParticipant.sessionId, rewards.stats);
        }
      }

      console.log(`🏆 [BattleEndManager] Fin de combat traitée avec succès`);
      return rewards;

    } catch (error) {
      console.error(`💥 [BattleEndManager] Erreur traitement fin:`, error);
      throw error;
    }
  }

  // === VÉRIFICATION DES CONDITIONS DE FIN ===

  private static checkPokemonKO(context: BattleContext): BattleEndCondition | null {
    console.log(`🔍 [DEBUG K.O.] === VÉRIFICATION POKÉMON K.O. ===`);
    
    for (const participant of context.participants) {
      console.log(`🔍 [DEBUG K.O.] Participant: ${participant.name} (${participant.sessionId})`);
      console.log(`🔍 [DEBUG K.O.] Équipe: ${participant.team.length} Pokémon`);
      
      // Vérifier chaque Pokémon de l'équipe
      participant.team.forEach((pokemon, index) => {
        console.log(`🔍 [DEBUG K.O.] Pokémon ${index}: ${pokemon.name || 'Inconnu'} - HP: ${pokemon.currentHp}/${pokemon.maxHp}`);
      });
      
      // Vérifier si tous les Pokémon du participant sont K.O.
      const allFainted = participant.team.every(pokemon => {
        const isFainted = pokemon.currentHp <= 0;
        console.log(`🔍 [DEBUG K.O.] ${pokemon.name || 'Pokémon'}: HP=${pokemon.currentHp}, K.O.=${isFainted}`);
        return isFainted;
      });
      
      console.log(`🔍 [DEBUG K.O.] ${participant.name}: Tous K.O.? ${allFainted}`);
      
      if (allFainted) {
        console.log(`💀 [BattleEndManager] ✅ DÉTECTION K.O.: Tous les Pokémon de ${participant.name} sont K.O.`);
        
        const isPlayerDefeated = !participant.isAI;
        
        return {
          reason: 'pokemon_fainted',
          result: isPlayerDefeated ? 'defeat' : 'victory',
          winner: isPlayerDefeated ? context.participants.find(p => p.isAI)?.sessionId : participant.sessionId,
          loser: participant.sessionId,
          details: { faintedTeam: participant.team.length }
        };
      }
    }

    console.log(`🔍 [DEBUG K.O.] Aucun participant avec tous les Pokémon K.O.`);
    return null;
  }

  private static checkDisconnections(context: BattleContext): BattleEndCondition | null {
    for (const participant of context.participants) {
      if (!participant.isConnected && !participant.isAI) {
        console.log(`🔌 [BattleEndManager] ${participant.name} déconnecté`);
        
        return {
          reason: 'player_disconnected',
          result: 'interrupted',
          loser: participant.sessionId,
          details: { disconnectedPlayer: participant.name }
        };
      }
    }

    return null;
  }

  private static checkTurnLimit(context: BattleContext): BattleEndCondition | null {
    const maxTurns = context.battleType === 'pvp' ? 200 : 100;
    
    if (context.turnNumber >= maxTurns) {
      console.log(`⏰ [BattleEndManager] Limite de tours atteinte (${maxTurns})`);
      
      return {
        reason: 'turn_limit_reached',
        result: 'draw',
        details: { maxTurns, actualTurns: context.turnNumber }
      };
    }

    return null;
  }

  private static checkSpecialConditions(context: BattleContext): BattleEndCondition | null {
    // Conditions spéciales selon le type de combat
    switch (context.battleType) {
      case 'gym':
        // TODO: Conditions spéciales des arènes
        break;
      
      case 'elite4':
        // TODO: Conditions spéciales du Conseil 4
        break;
        
      case 'pvp':
        // TODO: Conditions spéciales PvP (surrender, etc.)
        break;
    }

    return null;
  }

  // === CALCUL DES RÉCOMPENSES ===

  private static async calculateExperience(
    context: BattleContext,
    config: any
  ): Promise<BattleRewards['experience']> {
    const expRewards: BattleRewards['experience'] = [];
    
    // Trouver le participant humain
    const humanParticipant = context.participants.find(p => !p.isAI);
    if (!humanParticipant) return expRewards;

    // Calculer l'exp pour chaque Pokémon qui a participé
    for (const pokemon of humanParticipant.team) {
      if (pokemon.currentHp <= 0) continue; // Pokémon K.O. ne gagne pas d'exp
      
      const baseExp = await this.calculateBaseExperience(pokemon, context, config);
      const finalExp = Math.floor(baseExp * config.baseExpMultiplier);
      
      // Vérifier si le Pokémon monte de niveau
      const currentExp = this.calculateExpForLevel(pokemon.level);
      const expToNextLevel = this.calculateExpForLevel(pokemon.level + 1);
      const newTotalExp = currentExp + finalExp;
      
      let newLevel = pokemon.level;
      let movesLearned: string[] = [];
      
      if (newTotalExp >= expToNextLevel && pokemon.level < 100) {
        newLevel = pokemon.level + 1;
        movesLearned = await this.getMovesLearnedAtLevel(pokemon.pokemonId, newLevel);
        console.log(`⬆️ [BattleEndManager] ${pokemon.name} monte au niveau ${newLevel} !`);
      }

      expRewards.push({
        gained: finalExp,
        pokemonId: pokemon.pokemonId,
        newLevel: newLevel > pokemon.level ? newLevel : undefined,
        movesLearned
      });
    }

    return expRewards;
  }

  private static calculateMoney(context: BattleContext, config: any): number {
    let baseMoney = 0;

    // Argent de base selon le type de combat
    switch (context.battleType) {
      case 'wild':
        baseMoney = Math.floor(Math.random() * 50) + 25;
        break;
      case 'trainer':
        baseMoney = Math.floor(Math.random() * 200) + 100;
        break;
      case 'gym':
        baseMoney = Math.floor(Math.random() * 1000) + 500;
        break;
      case 'elite4':
        baseMoney = Math.floor(Math.random() * 5000) + 2500;
        break;
      case 'pvp':
        baseMoney = Math.floor(Math.random() * 100) + 50;
        break;
    }

    // Bonus selon la performance
    const damageDealt = Array.from(context.damageDealt.values()).reduce((sum, dmg) => sum + dmg, 0);
    const performanceBonus = Math.floor(damageDealt / 100);

    const finalMoney = Math.floor((baseMoney + performanceBonus) * config.baseMoneyMultiplier);
    
    console.log(`💰 [BattleEndManager] Argent calculé: ${finalMoney} (base: ${baseMoney}, bonus: ${performanceBonus})`);
    return finalMoney;
  }

  private static generateItemRewards(context: BattleContext, config: any): BattleRewards['items'] {
    const items: BattleRewards['items'] = [];
    
    if (Math.random() > config.itemDropChance) {
      return items; // Pas de drop
    }

    const dropTable = this.ITEM_DROP_TABLES[context.battleType as keyof typeof this.ITEM_DROP_TABLES] || this.ITEM_DROP_TABLES.wild;
    
    // Calculer la probabilité de chaque objet
    const totalWeight = dropTable.reduce((sum, item) => sum + item.weight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const dropItem of dropTable) {
      currentWeight += dropItem.weight;
      if (randomValue <= currentWeight) {
        const quantity = Math.floor(Math.random() * (dropItem.quantity[1] - dropItem.quantity[0] + 1)) + dropItem.quantity[0];
        
        items.push({
          itemId: dropItem.itemId,
          quantity,
          name: this.getItemName(dropItem.itemId)
        });
        break;
      }
    }

    console.log(`📦 [BattleEndManager] Objets générés:`, items);
    return items;
  }

  private static calculateBadgeRewards(context: BattleContext): string[] {
    if (context.battleType !== 'gym') return [];
    
    // TODO: Déterminer quel badge attribuer selon le lieu du combat
    const gymBadges = ['boulder_badge', 'cascade_badge', 'thunder_badge', 'rainbow_badge'];
    const badgeId = `gym_${context.location}_badge`;
    
    console.log(`🏅 [BattleEndManager] Badge attribué: ${badgeId}`);
    return [badgeId];
  }

  private static calculateAchievements(context: BattleContext, endCondition: BattleEndCondition): string[] {
    const achievements: string[] = [];

    // Achievements basés sur la performance
    if (endCondition.result === 'victory') {
      // Premier combat gagné
      achievements.push('first_victory');
      
      // Combat parfait (aucun dégât reçu)
      const humanParticipant = context.participants.find(p => !p.isAI);
      if (humanParticipant) {
        const damageReceived = context.damageReceived.get(humanParticipant.sessionId) || 0;
        if (damageReceived === 0) {
          achievements.push('perfect_battle');
        }
      }
      
      // Combat rapide (moins de 5 tours)
      if (context.turnNumber <= 5) {
        achievements.push('quick_victory');
      }
    }

    return achievements;
  }

  private static calculateStatistics(context: BattleContext, endCondition: BattleEndCondition): BattleRewards['stats'] {
    const humanParticipant = context.participants.find(p => !p.isAI);
    
    return {
      battlesWon: endCondition.result === 'victory' ? 1 : 0,
      battlesLost: endCondition.result === 'defeat' ? 1 : 0,
      pokemonDefeated: context.pokemonDefeated.get(humanParticipant?.sessionId || '') || 0,
      totalDamageDealt: context.damageDealt.get(humanParticipant?.sessionId || '') || 0,
      totalDamageReceived: context.damageReceived.get(humanParticipant?.sessionId || '') || 0
    };
  }

  // === SAUVEGARDE ET UTILITAIRES ===

  private static async savePokemonStates(
    context: BattleContext,
    callbacks?: any
  ): Promise<void> {
    console.log(`💾 [BattleEndManager] Sauvegarde des états Pokémon...`);

    for (const participant of context.participants) {
      if (participant.isAI) continue; // Ne pas sauvegarder les Pokémon IA

      for (const pokemon of participant.team) {
        const newState = {
          currentHp: pokemon.currentHp,
          statusCondition: pokemon.statusCondition,
          experience: 0, // TODO: Calculer la nouvelle exp à partir du niveau
          level: pokemon.level
        };

        if (callbacks?.onPokemonStateUpdate) {
          callbacks.onPokemonStateUpdate(pokemon.pokemonId, newState);
        }

        console.log(`💾 [BattleEndManager] ${pokemon.name}: HP ${pokemon.currentHp}/${pokemon.maxHp}`);
      }
    }
  }

  private static async calculateBaseExperience(pokemon: BattlePokemon, context: BattleContext, config: any): Promise<number> {
    // Formule basique d'expérience
    const opponentLevel = context.participants.find(p => p.isAI)?.activePokemon?.level || 5;
    const baseExp = Math.floor((opponentLevel + pokemon.level) / 2 * 10);
    
    return baseExp;
  }

  private static calculateExpForLevel(level: number): number {
    // Formule simplifiée (croissance moyenne)
    return Math.floor(Math.pow(level, 3));
  }

  private static async getMovesLearnedAtLevel(pokemonId: number, level: number): Promise<string[]> {
    try {
      const pokemonData = await getPokemonById(pokemonId);
      if (!pokemonData?.learnset) return [];

      return pokemonData.learnset
        .filter((learn: any) => learn.level === level)
        .map((learn: any) => learn.moveId);
    } catch (error) {
      console.error(`❌ [BattleEndManager] Erreur récupération moves:`, error);
      return [];
    }
  }

  private static getItemName(itemId: string): string {
    const itemNames: { [key: string]: string } = {
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'antidote': 'Antidote',
      'pokeball': 'Poké Ball',
      'greatball': 'Super Ball',
      'ultraball': 'Hyper Ball',
      'rare_candy': 'Super Bonbon',
      'nugget': 'Pépite',
      'full_heal': 'Guérison',
      'pp_up': 'PP Plus',
      'tm_fragment': 'Fragment CT'
    };

    return itemNames[itemId] || itemId;
  }

  // === MÉTHODES DE DEBUG ET UTILITAIRES ===

  static simulateBattleEnd(
    battleType: 'wild' | 'trainer' | 'gym',
    result: BattleResult,
    turnNumber: number = 10
  ): BattleEndCondition {
    return {
      reason: result === 'victory' ? 'pokemon_fainted' : 'player_fled',
      result,
      winner: result === 'victory' ? 'player1' : 'ai',
      details: { simulation: true, turnNumber }
    };
  }

  static getRewardConfig(battleType: string): any {
    return this.REWARD_CONFIG[battleType as keyof typeof this.REWARD_CONFIG] || this.REWARD_CONFIG.wild;
  }

  static validateBattleContext(context: BattleContext): string | null {
    if (!context.battleId) return "ID de combat manquant";
    if (!context.participants || context.participants.length === 0) return "Aucun participant";
    if (!context.startTime) return "Heure de début manquante";
    
    return null; // Pas d'erreur
  }
}

export default BattleEndManager;
