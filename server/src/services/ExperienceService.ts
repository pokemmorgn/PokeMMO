// server/src/services/ExperienceService.ts
// 🌟 SERVICE D'EXPÉRIENCE POKÉMON COMPLET - INSPIRÉ GEN V
// Gestion XP, montée de niveau, évolutions, apprentissage moves

import { Pokemon } from '../battle/types/BattleTypes';
import { OwnedPokemon } from '../models/OwnedPokemon';
import { PokemonData, GrowthRate } from '../models/PokemonData';
import { pokedexIntegrationService } from './PokedexIntegrationService';

// === INTERFACES ===

export interface ExperienceGainResult {
  success: boolean;
  error?: string;
  pokemonName: string;
  expGained: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  events: ExperienceEvent[];
  data?: {
    oldExp: number;
    newExp: number;
    newMoves?: LearnedMove[];
    canEvolve?: EvolutionOpportunity;
    statGains?: StatGains;
    nextLevelExp?: number;
  };
}

export interface ExperienceEvent {
  type: 'exp_gain' | 'level_up' | 'move_learned' | 'move_skipped' | 'evolution_available' | 'stat_increase';
  message: string;
  data?: any;
  timing?: number; // Pour animations
}

export interface ExperienceParams {
  winnerPokemon: Pokemon;
  loserPokemon: Pokemon;
  battleType: 'wild' | 'trainer' | 'pvp';
  wasWildEncounter?: boolean;
  trainerLevel?: number;
  participantCount?: number; // Combien de Pokémon ont participé
  usedExpShare?: boolean;
  isLucky?: boolean; // Lucky Egg ou équivalent
  isForeigner?: boolean; // Pokémon échangé (bonus XP)
}

export interface LearnedMove {
  moveId: string;
  moveName: string;
  level: number;
  wasReplaced?: boolean;
  replacedMove?: string;
}

export interface EvolutionOpportunity {
  canEvolve: boolean;
  evolutionId?: number;
  evolutionName?: string;
  method: string;
  requirement: string | number;
  meetsRequirements: boolean;
}

export interface StatGains {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface BattleExperienceContext {
  battleId: string;
  battleType: 'wild' | 'trainer' | 'pvp';
  participatingPokemon: Pokemon[];
  defeatedPokemon: Pokemon[];
  victorLevel: number;
  isTrainerBattle: boolean;
  expShareEnabled?: boolean;
}

// === CONSTANTES GEN V ===

const EXPERIENCE_CONSTANTS = {
  // Modificateurs Gen V
  BASE_EXPERIENCE_MODIFIER: 1.0,
  TRADED_POKEMON_BONUS: 1.5,        // +50% pour Pokémon échangés
  LUCKY_EGG_BONUS: 1.5,             // +50% avec Lucky Egg
  TRAINER_BATTLE_BONUS: 1.5,        // +50% combats dresseurs
  EVOLUTION_LEVEL_THRESHOLD: 0.8,   // Seuil pour suggestion évolution
  
  // Formule Gen V moderne (plus équilibrée)
  LEVEL_DIFFERENCE_IMPACT: 2.0,     // Impact de la différence de niveau
  PARTICIPATION_BONUS: 1.2,         // +20% participation directe
  
  // Limites de sécurité
  MAX_LEVEL: 100,
  MIN_EXP_GAIN: 1,
  MAX_EXP_GAIN: 100000,
  
  // Timings pour animations
  EXP_GAIN_TIMING: 1500,
  LEVEL_UP_TIMING: 2000,
  MOVE_LEARN_TIMING: 2500,
  EVOLUTION_TIMING: 3000
};

const GROWTH_RATE_FORMULAS = {
  slow: (level: number) => (5 * Math.pow(level, 3)) / 4,
  medium_slow: (level: number) => 
    (6/5) * Math.pow(level, 3) - 15 * Math.pow(level, 2) + 100 * level - 140,
  medium_fast: (level: number) => Math.pow(level, 3),
  fast: (level: number) => (4 * Math.pow(level, 3)) / 5,
  erratic: (level: number) => {
    if (level <= 50) return (Math.pow(level, 3) * (100 - level)) / 50;
    if (level <= 68) return (Math.pow(level, 3) * (150 - level)) / 100;
    if (level <= 98) return (Math.pow(level, 3) * ((1911 - 10 * level) / 3)) / 500;
    return (Math.pow(level, 3) * (160 - level)) / 100;
  },
  fluctuating: (level: number) => {
    if (level <= 15) return Math.pow(level, 3) * ((Math.floor((level + 1) / 3) + 24) / 50);
    if (level <= 35) return Math.pow(level, 3) * ((level + 14) / 50);
    return Math.pow(level, 3) * ((Math.floor(level / 2) + 32) / 50);
  }
};

/**
 * SERVICE D'EXPÉRIENCE POKÉMON COMPLET
 * 
 * Fonctionnalités Gen V:
 * - Formule d'XP moderne avec scaling intelligent
 * - Bonus pour Pokémon échangés, Lucky Egg, etc.
 * - Gestion montée de niveau avec stats
 * - Apprentissage automatique des moves
 * - Détection opportunités d'évolution
 * - Support Exp. Share pour équipes
 * - Événements détaillés pour animations
 */
export class ExperienceService {
  
  constructor() {
    console.log('🌟 [ExperienceService] Service d\'expérience Gen V initialisé');
  }
  
  // === MÉTHODE PRINCIPALE ===
  
  /**
   * Donne de l'expérience à un Pokémon après un combat
   */
  async giveExperience(params: ExperienceParams): Promise<ExperienceGainResult> {
    console.log(`🌟 [ExperienceService] Attribution XP: ${params.winnerPokemon.name} vs ${params.loserPokemon.name}`);
    
    try {
      // 1. Calculer l'XP de base
      const baseExp = this.calculateBaseExperience(params);
      
      // 2. Appliquer les modificateurs
      const finalExp = this.applyExperienceModifiers(baseExp, params);
      
      // 3. Trouver le Pokémon en base
      const ownedPokemon = await this.findOwnedPokemon(params.winnerPokemon);
      if (!ownedPokemon) {
        return this.createErrorResult(params.winnerPokemon.name, 'Pokémon non trouvé en base');
      }
      
      // 4. Sauvegarder état initial
      const oldLevel = ownedPokemon.level;
      const oldExp = ownedPokemon.experience;
      
      // 5. Appliquer l'expérience
      ownedPokemon.experience += finalExp;
      
      // 6. Vérifier montée de niveau
      const levelUpResult = await this.checkLevelUp(ownedPokemon);
      
      // 7. Gérer apprentissage moves
      const moveResults = await this.handleMovelearning(ownedPokemon, oldLevel, levelUpResult.newLevel);
      
      // 8. Vérifier évolution
      const evolutionCheck = await this.checkEvolutionOpportunity(ownedPokemon);
      
      // 9. Sauvegarder
      await ownedPokemon.save();
      
      // 10. Mettre à jour Pokédex
      await this.updatePokedexProgress(ownedPokemon, levelUpResult.leveledUp);
      
      // 11. Générer événements
      const events = this.generateExperienceEvents({
        expGained: finalExp,
        leveledUp: levelUpResult.leveledUp,
        oldLevel,
        newLevel: levelUpResult.newLevel,
        newMoves: moveResults,
        evolutionOpportunity: evolutionCheck,
        statGains: levelUpResult.statGains
      });
      
      console.log(`✅ [ExperienceService] ${params.winnerPokemon.name}: +${finalExp} XP, ${oldLevel} → ${levelUpResult.newLevel}`);
      
      return {
        success: true,
        pokemonName: params.winnerPokemon.name,
        expGained: finalExp,
        oldLevel,
        newLevel: levelUpResult.newLevel,
        leveledUp: levelUpResult.leveledUp,
        events,
        data: {
          oldExp,
          newExp: ownedPokemon.experience,
          newMoves: moveResults,
          canEvolve: evolutionCheck,
          statGains: levelUpResult.statGains,
          nextLevelExp: this.getExperienceForLevel(ownedPokemon.pokemonId, levelUpResult.newLevel + 1)
        }
      };
      
    } catch (error) {
      console.error('❌ [ExperienceService] Erreur attribution XP:', error);
      return this.createErrorResult(
        params.winnerPokemon.name, 
        error instanceof Error ? error.message : 'Erreur inconnue'
      );
    }
  }
  
  /**
   * Distribue l'XP à toute une équipe (Exp. Share)
   */
  async distributeTeamExperience(
    context: BattleExperienceContext,
    baseParams: Omit<ExperienceParams, 'winnerPokemon'>
  ): Promise<ExperienceGainResult[]> {
    console.log(`🌟 [ExperienceService] Distribution XP équipe: ${context.participatingPokemon.length} Pokémon`);
    
    const results: ExperienceGainResult[] = [];
    
    for (const pokemon of context.participatingPokemon) {
      // Calculer participation
      const participationBonus = pokemon.id === context.participatingPokemon[0].id ? 
        EXPERIENCE_CONSTANTS.PARTICIPATION_BONUS : 1.0;
      
      const expParams: ExperienceParams = {
        ...baseParams,
        winnerPokemon: pokemon,
        participantCount: context.participatingPokemon.length,
        usedExpShare: context.expShareEnabled
      };
      
      const result = await this.giveExperience(expParams);
      
      // Ajuster XP pour Exp. Share
      if (context.expShareEnabled && participationBonus === 1.0) {
        result.expGained = Math.floor(result.expGained * 0.5); // 50% pour non-participants
      }
      
      results.push(result);
    }
    
    console.log(`✅ [ExperienceService] Distribution terminée: ${results.length} résultats`);
    return results;
  }
  
  // === CALCULS D'EXPÉRIENCE ===
  
  /**
   * Calcule l'XP de base selon la formule Gen V moderne
   */
  private calculateBaseExperience(params: ExperienceParams): number {
    const { winnerPokemon, loserPokemon, battleType } = params;
    
    // Récupérer l'XP de base du Pokémon vaincu
    const baseExpYield = loserPokemon.baseExperience || 100;
    const levelDefender = loserPokemon.level;
    const levelAttacker = winnerPokemon.level;
    
    // Formule Gen V moderne (plus équilibrée que les anciennes)
    let exp = (baseExpYield * levelDefender) / 7;
    
    // Facteur de niveau (évite le power-leveling)
    const levelDiff = levelDefender - levelAttacker;
    const levelFactor = Math.pow(2 * levelDefender + 10, 2.5) / 
                       Math.pow(levelDefender + levelAttacker + 10, 2.5);
    
    exp = exp * levelFactor;
    
    // Bonus combat dresseur
    if (battleType === 'trainer') {
      exp *= EXPERIENCE_CONSTANTS.TRAINER_BATTLE_BONUS;
    }
    
    // Limitation pour éviter les abus
    return Math.max(
      EXPERIENCE_CONSTANTS.MIN_EXP_GAIN,
      Math.min(Math.floor(exp), EXPERIENCE_CONSTANTS.MAX_EXP_GAIN)
    );
  }
  
  /**
   * Applique tous les modificateurs d'XP
   */
  private applyExperienceModifiers(baseExp: number, params: ExperienceParams): number {
    let finalExp = baseExp;
    
    // Pokémon échangé
    if (params.isForeigner) {
      finalExp *= EXPERIENCE_CONSTANTS.TRADED_POKEMON_BONUS;
    }
    
    // Lucky Egg
    if (params.isLucky) {
      finalExp *= EXPERIENCE_CONSTANTS.LUCKY_EGG_BONUS;
    }
    
    // Exp. Share (réduction si multiple participants)
    if (params.usedExpShare && params.participantCount && params.participantCount > 1) {
      finalExp *= 0.7; // Réduction pour compensation
    }
    
    return Math.floor(finalExp);
  }
  
  /**
   * Calcule l'XP nécessaire pour un niveau donné
   */
  private getExperienceForLevel(pokemonId: number, level: number): number {
    // TODO: Récupérer le growth rate depuis PokemonData
    // Pour l'instant, on utilise medium_fast par défaut
    const growthRate = 'medium_fast';
    
    if (level <= 1) return 0;
    if (level > EXPERIENCE_CONSTANTS.MAX_LEVEL) {
      level = EXPERIENCE_CONSTANTS.MAX_LEVEL;
    }
    
    const formula = GROWTH_RATE_FORMULAS[growthRate];
    return Math.floor(formula(level));
  }
  
  // === GESTION NIVEAU ===
  
  /**
   * Vérifie et applique les montées de niveau
   */
  private async checkLevelUp(ownedPokemon: any): Promise<{
    leveledUp: boolean;
    newLevel: number;
    statGains?: StatGains;
  }> {
    const oldLevel = ownedPokemon.level;
    let newLevel = oldLevel;
    let statGains: StatGains | undefined;
    
    // Calculer le nouveau niveau
    while (newLevel < EXPERIENCE_CONSTANTS.MAX_LEVEL) {
      const expRequired = this.getExperienceForLevel(ownedPokemon.pokemonId, newLevel + 1);
      if (ownedPokemon.experience >= expRequired) {
        newLevel++;
      } else {
        break;
      }
    }
    
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      console.log(`📈 [ExperienceService] ${ownedPokemon.nickname || 'Pokémon'}: ${oldLevel} → ${newLevel}`);
      
      // Calculer gains de stats
      statGains = await this.calculateStatGains(ownedPokemon, oldLevel, newLevel);
      
      // Mettre à jour le Pokémon
      ownedPokemon.level = newLevel;
      await this.updatePokemonStats(ownedPokemon, statGains);
    }
    
    return { leveledUp, newLevel, statGains };
  }
  
  /**
   * Calcule les gains de stats pour la montée de niveau
   */
  private async calculateStatGains(
    ownedPokemon: any,
    oldLevel: number,
    newLevel: number
  ): Promise<StatGains> {
    // Récupérer les stats de base depuis PokemonData
    const pokemonData = await PokemonData.findByNationalDex(ownedPokemon.pokemonId);
    
    if (!pokemonData) {
      // Stats par défaut si pas de données
      return {
        hp: newLevel - oldLevel,
        attack: 1,
        defense: 1,
        specialAttack: 1,
        specialDefense: 1,
        speed: 1
      };
    }
    
    // Calculer stats au nouveau niveau vs ancien niveau
    const oldStats = this.calculateStatsAtLevel(pokemonData, oldLevel, ownedPokemon);
    const newStats = this.calculateStatsAtLevel(pokemonData, newLevel, ownedPokemon);
    
    return {
      hp: newStats.hp - oldStats.hp,
      attack: newStats.attack - oldStats.attack,
      defense: newStats.defense - oldStats.defense,
      specialAttack: newStats.specialAttack - oldStats.specialAttack,
      specialDefense: newStats.specialDefense - oldStats.specialDefense,
      speed: newStats.speed - oldStats.speed
    };
  }
  
  /**
   * Calcule les stats d'un Pokémon à un niveau donné
   */
  private calculateStatsAtLevel(pokemonData: any, level: number, ownedPokemon: any): any {
    const baseStats = pokemonData.baseStats;
    
    // IVs et EVs (ou valeurs par défaut)
    const ivs = ownedPokemon.ivs || { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };
    const evs = ownedPokemon.evs || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    
    return {
      hp: this.calculateStat('hp', baseStats.hp, level, ivs.hp, evs.hp),
      attack: this.calculateStat('attack', baseStats.attack, level, ivs.attack, evs.attack),
      defense: this.calculateStat('defense', baseStats.defense, level, ivs.defense, evs.defense),
      specialAttack: this.calculateStat('specialAttack', baseStats.specialAttack, level, ivs.specialAttack, evs.specialAttack),
      specialDefense: this.calculateStat('specialDefense', baseStats.specialDefense, level, ivs.specialDefense, evs.specialDefense),
      speed: this.calculateStat('speed', baseStats.speed, level, ivs.speed, evs.speed)
    };
  }
  
  /**
   * Formule de calcul d'une stat individuelle
   */
  private calculateStat(statName: string, base: number, level: number, iv: number, ev: number): number {
    if (statName === 'hp') {
      // Formule HP
      return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
      // Formule autres stats
      return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    }
  }
  
  /**
   * Met à jour les stats du Pokémon
   */
  private async updatePokemonStats(ownedPokemon: any, statGains: StatGains): Promise<void> {
    // Mettre à jour HP max et current
    const oldMaxHp = ownedPokemon.maxHp;
    ownedPokemon.maxHp += statGains.hp;
    
    // Maintenir le ratio HP si blessé
    if (ownedPokemon.currentHp < oldMaxHp && ownedPokemon.currentHp > 0) {
      const hpRatio = ownedPokemon.currentHp / oldMaxHp;
      ownedPokemon.currentHp = Math.floor(ownedPokemon.maxHp * hpRatio);
    } else if (ownedPokemon.currentHp === oldMaxHp) {
      // Si pleine santé, mettre à jour
      ownedPokemon.currentHp = ownedPokemon.maxHp;
    }
    
    // Mettre à jour autres stats si elles sont stockées
    if (ownedPokemon.stats) {
      ownedPokemon.stats.attack = (ownedPokemon.stats.attack || 0) + statGains.attack;
      ownedPokemon.stats.defense = (ownedPokemon.stats.defense || 0) + statGains.defense;
      ownedPokemon.stats.specialAttack = (ownedPokemon.stats.specialAttack || 0) + statGains.specialAttack;
      ownedPokemon.stats.specialDefense = (ownedPokemon.stats.specialDefense || 0) + statGains.specialDefense;
      ownedPokemon.stats.speed = (ownedPokemon.stats.speed || 0) + statGains.speed;
    }
  }
  
  // === APPRENTISSAGE MOVES ===
  
  /**
   * Gère l'apprentissage automatique des moves
   */
  private async handleMovelearning(
    ownedPokemon: any,
    oldLevel: number,
    newLevel: number
  ): Promise<LearnedMove[]> {
    if (newLevel <= oldLevel) return [];
    
    console.log(`📚 [ExperienceService] Vérification moves: ${oldLevel} → ${newLevel}`);
    
    const learnedMoves: LearnedMove[] = [];
    
    try {
      // Récupérer les données Pokémon
      const pokemonData = await PokemonData.findByNationalDex(ownedPokemon.pokemonId);
      if (!pokemonData) return [];
      
      // Trouver tous les moves appris entre oldLevel+1 et newLevel
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        const movesAtLevel = pokemonData.getMovesAtLevel(level);
        
        for (const moveId of movesAtLevel) {
          const learned = await this.learnMove(ownedPokemon, moveId, level);
          if (learned) {
            learnedMoves.push(learned);
          }
        }
      }
      
      console.log(`📚 [ExperienceService] ${learnedMoves.length} moves appris`);
      return learnedMoves;
      
    } catch (error) {
      console.error('❌ [ExperienceService] Erreur apprentissage moves:', error);
      return [];
    }
  }
  
  /**
   * Apprend un move spécifique
   */
  private async learnMove(
    ownedPokemon: any,
    moveId: string,
    level: number
  ): Promise<LearnedMove | null> {
    
    // Vérifier si le Pokémon connaît déjà ce move
    if (ownedPokemon.moves && ownedPokemon.moves.includes(moveId)) {
      return null;
    }
    
    // TODO: Récupérer le nom du move depuis MoveData
    const moveName = this.getMoveDisplayName(moveId);
    
    // Si moins de 4 moves, apprendre directement
    if (!ownedPokemon.moves || ownedPokemon.moves.length < 4) {
      if (!ownedPokemon.moves) ownedPokemon.moves = [];
      ownedPokemon.moves.push(moveId);
      
      console.log(`📚 [ExperienceService] Move appris: ${moveName}`);
      
      return {
        moveId,
        moveName,
        level,
        wasReplaced: false
      };
    }
    
    // Si 4 moves, il faudra demander au joueur de choisir
    // Pour l'instant, on saute (TODO: intégrer avec le système de choix)
    console.log(`📚 [ExperienceService] Move ${moveName} sauté (4 moves max)`);
    
    return {
      moveId,
      moveName,
      level,
      wasReplaced: false
    };
  }
  
  /**
   * Nom d'affichage temporaire pour les moves
   */
  private getMoveDisplayName(moveId: string): string {
    // TODO: Intégrer avec MoveData quand disponible
    const names: Record<string, string> = {
      'tackle': 'Charge',
      'scratch': 'Griffe',
      'growl': 'Rugissement',
      'vine_whip': 'Fouet Lianes',
      'razor_leaf': 'Tranch\'Herbe'
    };
    return names[moveId] || moveId;
  }
  
  // === ÉVOLUTION ===
  
  /**
   * Vérifie si le Pokémon peut évoluer
   */
  private async checkEvolutionOpportunity(ownedPokemon: any): Promise<EvolutionOpportunity> {
    try {
      const pokemonData = await PokemonData.findByNationalDex(ownedPokemon.pokemonId);
      
      if (!pokemonData || !pokemonData.evolution.canEvolve) {
        return { canEvolve: false, method: 'none', requirement: 'none', meetsRequirements: false };
      }
      
      const evolution = pokemonData.evolution;
      let meetsRequirements = false;
      
      // Vérifier selon la méthode d'évolution
      switch (evolution.method) {
        case 'level':
          meetsRequirements = ownedPokemon.level >= evolution.requirement;
          break;
        case 'friendship':
          meetsRequirements = (ownedPokemon.happiness || 0) >= evolution.requirement;
          break;
        case 'stone':
          // TODO: Vérifier possession de l'objet
          meetsRequirements = false;
          break;
        default:
          meetsRequirements = false;
      }
      
      // TODO: Récupérer le nom du Pokémon d'évolution
      const evolutionName = `Pokémon #${evolution.evolvesInto}`;
      
      return {
        canEvolve: true,
        evolutionId: evolution.evolvesInto,
        evolutionName,
        method: evolution.method,
        requirement: evolution.requirement,
        meetsRequirements
      };
      
    } catch (error) {
      console.error('❌ [ExperienceService] Erreur vérification évolution:', error);
      return { canEvolve: false, method: 'error', requirement: 'error', meetsRequirements: false };
    }
  }
  
  // === INTÉGRATIONS ===
  
  /**
   * Met à jour le progrès Pokédex
   */
  private async updatePokedexProgress(ownedPokemon: any, leveledUp: boolean): Promise<void> {
    if (!leveledUp) return;
    
    try {
      // Notifier le Pokédex de la montée de niveau
      await pokedexIntegrationService.handlePokemonLevelUp({
        playerId: ownedPokemon.owner,
        pokemonId: ownedPokemon.pokemonId,
        oldLevel: ownedPokemon.level - 1,
        newLevel: ownedPokemon.level,
        sessionId: ownedPokemon.sessionId || ownedPokemon.owner
      });
      
    } catch (error) {
      // Continue même en cas d'erreur Pokédex
      console.warn('⚠️ [ExperienceService] Erreur mise à jour Pokédex:', error);
    }
  }
  
  /**
   * Trouve le Pokémon en base de données
   */
  private async findOwnedPokemon(pokemon: Pokemon): Promise<any> {
    // Stratégies de recherche multiples
    
    // 1. Par combatId si disponible
    if (pokemon.combatId) {
      const found = await OwnedPokemon.findOne({ combatId: pokemon.combatId });
      if (found) return found;
    }
    
    // 2. Par isInTeam (pour équipe active)
    const teamPokemon = await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      level: pokemon.level,
      isInTeam: true
    });
    
    if (teamPokemon) return teamPokemon;
    
    // 3. Recherche générale
    return await OwnedPokemon.findOne({
      pokemonId: pokemon.id,
      level: pokemon.level,
      maxHp: pokemon.maxHp
    });
  }
  
  // === GÉNÉRATION ÉVÉNEMENTS ===
  
  /**
   * Génère tous les événements d'expérience pour l'UI
   */
  private generateExperienceEvents(data: {
    expGained: number;
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newMoves?: LearnedMove[];
    evolutionOpportunity?: EvolutionOpportunity;
    statGains?: StatGains;
  }): ExperienceEvent[] {
    const events: ExperienceEvent[] = [];
    
    // 1. Gain d'XP
    events.push({
      type: 'exp_gain',
      message: `+${data.expGained} points d'expérience !`,
      timing: EXPERIENCE_CONSTANTS.EXP_GAIN_TIMING,
      data: { expGained: data.expGained }
    });
    
    // 2. Montée de niveau
    if (data.leveledUp) {
      events.push({
        type: 'level_up',
        message: `Niveau ${data.newLevel} atteint !`,
        timing: EXPERIENCE_CONSTANTS.LEVEL_UP_TIMING,
        data: {
          oldLevel: data.oldLevel,
          newLevel: data.newLevel,
          statGains: data.statGains
        }
      });
      
      // 3. Gains de stats
      if (data.statGains) {
        events.push({
          type: 'stat_increase',
          message: this.formatStatGainsMessage(data.statGains),
          timing: 1000,
          data: data.statGains
        });
      }
    }
    
    // 4. Nouveaux moves
    if (data.newMoves && data.newMoves.length > 0) {
      data.newMoves.forEach(move => {
        events.push({
          type: 'move_learned',
          message: `${move.moveName} appris !`,
          timing: EXPERIENCE_CONSTANTS.MOVE_LEARN_TIMING,
          data: move
        });
      });
    }
    
    // 5. Évolution disponible
    if (data.evolutionOpportunity?.meetsRequirements) {
      events.push({
        type: 'evolution_available',
        message: `Évolution possible vers ${data.evolutionOpportunity.evolutionName} !`,
        timing: EXPERIENCE_CONSTANTS.EVOLUTION_TIMING,
        data: data.evolutionOpportunity
      });
    }
    
    return events;
  }
  
  /**
   * Formate le message des gains de stats
   */
  private formatStatGainsMessage(statGains: StatGains): string {
    const gains: string[] = [];
    
    if (statGains.hp > 0) gains.push(`PV +${statGains.hp}`);
    if (statGains.attack > 0) gains.push(`Attaque +${statGains.attack}`);
    if (statGains.defense > 0) gains.push(`Défense +${statGains.defense}`);
    if (statGains.specialAttack > 0) gains.push(`Att. Spé +${statGains.specialAttack}`);
    if (statGains.specialDefense > 0) gains.push(`Déf. Spé +${statGains.specialDefense}`);
    if (statGains.speed > 0) gains.push(`Vitesse +${statGains.speed}`);
    
    return gains.length > 0 ? gains.join(', ') : 'Stats mises à jour';
  }
  
  // === UTILITAIRES ===
  
  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(pokemonName: string, message: string): ExperienceGainResult {
    return {
      success: false,
      error: message,
      pokemonName,
      expGained: 0,
      oldLevel: 0,
      newLevel: 0,
      leveledUp: false,
      events: []
    };
  }
  
  // === MÉTHODES PUBLIQUES UTILITAIRES ===
  
  /**
   * Calcule l'XP nécessaire pour le prochain niveau
   */
  public getExpForNextLevel(pokemonId: number, currentLevel: number): number {
    return this.getExperienceForLevel(pokemonId, currentLevel + 1);
  }
  
  /**
   * Calcule l'XP restante avant le prochain niveau
   */
  public getExpToNextLevel(pokemonId: number, currentLevel: number, currentExp: number): number {
    const nextLevelExp = this.getExpForNextLevel(pokemonId, currentLevel);
    return Math.max(0, nextLevelExp - currentExp);
  }
  
  /**
   * Vérifie si un niveau est valide
   */
  public isValidLevel(level: number): boolean {
    return level >= 1 && level <= EXPERIENCE_CONSTANTS.MAX_LEVEL;
  }
  
  /**
   * Obtient les statistiques du service
   */
  public getStats(): any {
    return {
      version: 'experience_service_gen5_v1',
      features: [
        'gen5_exp_formula',
        'automatic_level_up',
        'move_learning',
        'evolution_detection',
        'exp_share_support',
        'stat_calculation',
        'pokedex_integration'
      ],
      constants: EXPERIENCE_CONSTANTS,
      supportedGrowthRates: Object.keys(GROWTH_RATE_FORMULAS)
    };
  }
}

// Instance singleton
export const experienceService = new ExperienceService();

export default experienceService;
