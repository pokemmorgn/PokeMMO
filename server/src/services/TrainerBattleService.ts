// server/src/services/TrainerBattleService.ts
// Service pour convertir les équipes de dresseurs en équipes de combat

import { TrainerTeam, ITrainerTeam } from "../models/TrainerTeam";
import { ITrainerPokemon } from "../models/TrainerPokemon";
import { OwnedPokemon, IOwnedPokemon } from "../models/OwnedPokemon";
import { getPokemonById } from "../data/PokemonData";
import { PokemonMoveService } from "./PokemonMoveService";
import naturesData from "../data/natures.json";
import { v4 as uuidv4 } from 'uuid';

// ===== INTERFACES =====

export interface BattleTeamConversionResult {
  success: boolean;
  battleTeam?: IOwnedPokemon[];
  errors?: string[];
  teamSummary?: {
    teamId: string;
    teamName: string;
    pokemonCount: number;
    averageLevel: number;
    conversionTime: number;
  };
}

export interface TrainerBattleContext {
  trainerId: string;
  trainerName: string;
  battleType: 'single' | 'double' | 'multi';
  allowItems?: boolean;
  allowSwitching?: boolean;
  customRules?: string[];
}

export interface TrainerBattleServiceConfig {
  debugMode: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  validateTeams: boolean;
  autoInitializePP: boolean;
  defaultOriginalTrainer: string;
}

// ===== SERVICE PRINCIPAL =====

export class TrainerBattleService {
  
  private config: TrainerBattleServiceConfig;
  private conversionCache: Map<string, { team: IOwnedPokemon[]; timestamp: number }> = new Map();
  
  constructor(config?: Partial<TrainerBattleServiceConfig>) {
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      cacheEnabled: process.env.TRAINER_CACHE !== 'false',
      cacheTTL: parseInt(process.env.TRAINER_CACHE_TTL || '300000'), // 5 minutes
      validateTeams: process.env.NODE_ENV === 'production',
      autoInitializePP: true,
      defaultOriginalTrainer: 'NPC Trainer',
      ...config
    };
    
    this.log('info', '🥊 TrainerBattleService initialisé', {
      cache: this.config.cacheEnabled,
      validation: this.config.validateTeams,
      ppInit: this.config.autoInitializePP
    });
  }

  // === MÉTHODE PRINCIPALE DE CONVERSION ===

  /**
   * Convertit une équipe de dresseur en équipe de combat
   */
  async convertTeamToBattle(
    teamId: string,
    context?: Partial<TrainerBattleContext>
  ): Promise<BattleTeamConversionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `🔄 [Conversion] Début conversion équipe: ${teamId}`, context);
      
      // 1. Vérifier le cache
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(teamId);
        if (cached) {
          this.log('info', `💾 [Cache] Équipe ${teamId} trouvée en cache`);
          return {
            success: true,
            battleTeam: cached,
            teamSummary: {
              teamId,
              teamName: 'Cached Team',
              pokemonCount: cached.length,
              averageLevel: this.calculateAverageLevel(cached),
              conversionTime: Date.now() - startTime
            }
          };
        }
      }
      
      // 2. Récupérer l'équipe depuis la base
      const trainerTeam = await TrainerTeam.findByTeamId(teamId);
      if (!trainerTeam) {
        return {
          success: false,
          errors: [`Équipe de dresseur "${teamId}" introuvable`]
        };
      }
      
      // 3. Valider l'équipe si requis
      if (this.config.validateTeams) {
        const validation = trainerTeam.validateTeam();
        if (!validation.valid) {
          return {
            success: false,
            errors: [`Équipe invalide: ${validation.errors.join(', ')}`]
          };
        }
      }
      
      // 4. Convertir chaque Pokémon
      const battleTeam: IOwnedPokemon[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < trainerTeam.pokemon.length; i++) {
        const trainerPokemon = trainerTeam.pokemon[i];
        
        try {
          const battlePokemon = await this.convertSinglePokemon(
            trainerPokemon,
            context?.trainerName || context?.trainerId || this.config.defaultOriginalTrainer,
            i
          );
          
          battleTeam.push(battlePokemon);
          
        } catch (error) {
          const errorMsg = `Pokémon ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          errors.push(errorMsg);
          this.log('error', `❌ [Conversion] ${errorMsg}`, { trainerPokemon });
        }
      }
      
      // 5. Vérifier qu'on a au moins un Pokémon valide
      if (battleTeam.length === 0) {
        return {
          success: false,
          errors: [`Aucun Pokémon convertible dans l'équipe "${teamId}"`, ...errors]
        };
      }
      
      // 6. Mettre en cache si activé
      if (this.config.cacheEnabled && errors.length === 0) {
        this.setCache(teamId, battleTeam);
      }
      
      const conversionTime = Date.now() - startTime;
      
      this.log('info', `✅ [Conversion] Équipe ${teamId} convertie`, {
        pokemonConverted: battleTeam.length,
        errors: errors.length,
        conversionTime: `${conversionTime}ms`
      });
      
      return {
        success: true,
        battleTeam,
        errors: errors.length > 0 ? errors : undefined,
        teamSummary: {
          teamId: trainerTeam.teamId,
          teamName: trainerTeam.teamName,
          pokemonCount: battleTeam.length,
          averageLevel: this.calculateAverageLevel(battleTeam),
          conversionTime
        }
      };
      
    } catch (error) {
      const conversionTime = Date.now() - startTime;
      this.log('error', `❌ [Conversion] Erreur équipe ${teamId}:`, error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue de conversion'],
        teamSummary: {
          teamId,
          teamName: 'Failed Conversion',
          pokemonCount: 0,
          averageLevel: 0,
          conversionTime
        }
      };
    }
  }

  // === CONVERSION POKÉMON INDIVIDUEL ===

  /**
   * Convertit un TrainerPokemon en OwnedPokemon pour combat
   */
  private async convertSinglePokemon(
    trainerPokemon: ITrainerPokemon,
    originalTrainer: string,
    slotIndex: number
  ): Promise<IOwnedPokemon> {
    
    // 1. Récupérer les données de base du Pokémon
    const basePokemonData = await getPokemonById(trainerPokemon.species);
    if (!basePokemonData) {
      throw new Error(`Pokémon species ${trainerPokemon.species} introuvable`);
    }
    
    // 2. Calculer les stats finales
    const calculatedStats = this.calculateFinalStats(trainerPokemon, basePokemonData.baseStats);
    
    // 3. Déterminer le genre si non spécifié
    const gender = trainerPokemon.gender || this.determineGender(basePokemonData.genderRatio);
    
    // 4. Générer ID unique pour ce Pokémon de combat
    const pokemonId = uuidv4();
    
    // 5. Préparer les attaques avec PP
    const moves = await this.prepareMoves(trainerPokemon.moves);
    
    // 6. Créer l'OwnedPokemon
    const battlePokemon = new OwnedPokemon({
      // Identification
      owner: originalTrainer,
      pokemonId: trainerPokemon.species,
      level: trainerPokemon.level,
      
      // Caractéristiques
      nature: trainerPokemon.nature,
      nickname: trainerPokemon.nickname,
      shiny: trainerPokemon.shiny || false,
      gender: gender,
      ability: trainerPokemon.ability,
      
      // Stats
      ivs: { ...trainerPokemon.ivs },
      evs: { ...trainerPokemon.evs },
      calculatedStats: {
        attack: calculatedStats.attack,
        defense: calculatedStats.defense,
        spAttack: calculatedStats.spAttack,
        spDefense: calculatedStats.spDefense,
        speed: calculatedStats.speed
      },
      
      // Combat
      moves: moves,
      currentHp: calculatedStats.hp,
      maxHp: calculatedStats.hp,
      status: 'normal',
      
      // Organisation (pour équipe de dresseur)
      isInTeam: true,
      slot: slotIndex,
      box: -1, // -1 indique "équipe active de dresseur"
      
      // Métadonnées
      friendship: 70, // Valeur par défaut
      pokeball: trainerPokemon.pokeball || 'poke_ball',
      originalTrainer: originalTrainer,
      heldItem: trainerPokemon.heldItem,
      
      // Expérience (calculée approximativement)
      experience: this.calculateExperienceForLevel(trainerPokemon.level)
    });
    
    // 7. Initialiser les PP si activé
    if (this.config.autoInitializePP) {
      try {
        await PokemonMoveService.initializePP(battlePokemon);
      } catch (error) {
        this.log('warn', `⚠️ [PP Init] Erreur initialisation PP pour ${trainerPokemon.species}:`, error);
      }
    }
    
    return battlePokemon;
  }

  // === MÉTHODES DE CALCUL ===

  /**
   * Calcule les stats finales d'un Pokémon de dresseur
   */
  private calculateFinalStats(trainerPokemon: ITrainerPokemon, baseStats: any): any {
    const nature = naturesData[trainerPokemon.nature as keyof typeof naturesData];
    
    const calculateStat = (statName: keyof any, baseStat: number, isHP: boolean = false): number => {
      const iv = trainerPokemon.ivs[statName as keyof typeof trainerPokemon.ivs] || 0;
      const ev = trainerPokemon.evs[statName as keyof typeof trainerPokemon.evs] || 0;
      
      if (isHP) {
        return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * trainerPokemon.level) / 100) + trainerPokemon.level + 10;
      } else {
        let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * trainerPokemon.level) / 100) + 5;
        
        // Application nature
        if (nature?.increased === statName) {
          stat = Math.floor(stat * 1.1);
        } else if (nature?.decreased === statName) {
          stat = Math.floor(stat * 0.9);
        }
        
        return stat;
      }
    };

    return {
      hp: calculateStat('hp', baseStats.hp, true),
      attack: calculateStat('attack', baseStats.attack),
      defense: calculateStat('defense', baseStats.defense),
      spAttack: calculateStat('spAttack', baseStats.specialAttack || baseStats.spAttack),
      spDefense: calculateStat('spDefense', baseStats.specialDefense || baseStats.spDefense),
      speed: calculateStat('speed', baseStats.speed)
    };
  }

  /**
   * Prépare les attaques avec PP
   */
  private async prepareMoves(moveIds: string[]): Promise<any[]> {
    const moves = [];
    
    for (const moveId of moveIds) {
      try {
        // Récupérer les données de l'attaque (adapter selon votre système)
        const moveData = await this.getMoveData(moveId);
        
        moves.push({
          moveId: moveId,
          currentPp: moveData?.pp || 10, // PP par défaut si données manquantes
          maxPp: moveData?.pp || 10
        });
        
      } catch (error) {
        this.log('warn', `⚠️ [Moves] Attaque ${moveId} introuvable, utilisation valeurs par défaut`);
        moves.push({
          moveId: moveId,
          currentPp: 10,
          maxPp: 10
        });
      }
    }
    
    return moves;
  }

  /**
   * Détermine le genre basé sur le ratio de genre (placeholder)
   */
  private determineGender(genderRatio?: any): "Male" | "Female" | "Genderless" {
    if (!genderRatio) {
      return Math.random() < 0.5 ? "Male" : "Female";
    }
    
    // TODO: Implémenter selon votre système de ratios de genre
    if (genderRatio.male === 0 && genderRatio.female === 0) {
      return "Genderless";
    }
    
    return Math.random() < (genderRatio.male / (genderRatio.male + genderRatio.female)) ? "Male" : "Female";
  }

  /**
   * Calcule l'expérience approximative pour un niveau donné
   */
  private calculateExperienceForLevel(level: number): number {
    // Formule approximative (croissance moyenne)
    // TODO: Adapter selon votre système d'expérience existant
    return Math.floor(Math.pow(level, 3));
  }

  /**
   * Récupère les données d'une attaque (placeholder)
   */
  private async getMoveData(moveId: string): Promise<{ pp: number } | null> {
    // TODO: Intégrer avec votre système d'attaques existant
    // Valeurs par défaut courantes
    const defaultPP: Record<string, number> = {
      'tackle': 35,
      'scratch': 35,
      'pound': 35,
      'thunderbolt': 15,
      'surf': 15,
      'earthquake': 10,
      'hyper_beam': 5
    };
    
    return { pp: defaultPP[moveId] || 10 };
  }

  // === GESTION DU CACHE ===

  private getFromCache(teamId: string): IOwnedPokemon[] | null {
    const cached = this.conversionCache.get(teamId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.conversionCache.delete(teamId);
      return null;
    }
    
    return cached.team;
  }

  private setCache(teamId: string, team: IOwnedPokemon[]): void {
    this.conversionCache.set(teamId, {
      team: [...team], // Clone pour éviter mutations
      timestamp: Date.now()
    });
  }

  // === MÉTHODES UTILITAIRES ===

  private calculateAverageLevel(team: IOwnedPokemon[]): number {
    if (team.length === 0) return 0;
    const totalLevel = team.reduce((sum, pokemon) => sum + pokemon.level, 0);
    return Math.round(totalLevel / team.length);
  }

  /**
   * Nettoie le cache expiré
   */
  public cleanCache(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [teamId, cached] of this.conversionCache.entries()) {
      if (now - cached.timestamp > this.config.cacheTTL) {
        this.conversionCache.delete(teamId);
        cleaned++;
      }
    }
    
    this.log('info', `🧹 [Cache] ${cleaned} entrées expirées nettoyées`);
    return cleaned;
  }

  /**
   * Statistiques du service
   */
  public getStats(): any {
    return {
      serviceType: 'trainer_battle',
      version: '1.0.0',
      config: this.config,
      cache: {
        size: this.conversionCache.size,
        ttl: this.config.cacheTTL,
        enabled: this.config.cacheEnabled
      },
      supportedFeatures: [
        'team_conversion',
        'pokemon_stats_calculation',
        'pp_initialization', 
        'nature_application',
        'cache_management',
        'validation'
      ]
    };
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
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
}

// ===== EXPORT SINGLETON =====
let trainerBattleServiceInstance: TrainerBattleService | null = null;

export function getTrainerBattleService(config?: Partial<TrainerBattleServiceConfig>): TrainerBattleService {
  if (!trainerBattleServiceInstance) {
    trainerBattleServiceInstance = new TrainerBattleService(config);
  }
  return trainerBattleServiceInstance;
}

export default TrainerBattleService;
