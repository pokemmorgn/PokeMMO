// server/src/managers/TeamManager.ts

import { PokemonManager } from './PokemonManager';
import { MoveManager } from './MoveManager';
import { PokemonTeam, IPokemonTeam, IPokemonInstance } from '../models/PokemonTeam';
import { PokeWorldState } from '../schema/PokeWorldState';
import { PlayerData } from '../models/PlayerData';
import { v4 as uuidv4 } from 'uuid';

// Interfaces pour les réponses
export interface TeamOperationResult {
  success: boolean;
  error?: string;
  pokemon?: any;
  team?: any;
}

export interface SerializedPokemon {
  id: string;
  pokemonId: number;
  name: string;
  nickname?: string;
  level: number;
  experience: number;
  currentHp: number;
  maxHp: number;
  nature: string;
  ability: string;
  gender: string;
  isShiny: boolean;
  status: string;
  stats: any;
  moves: Array<{
    moveId: string;
    name: string;
    currentPp: number;
    maxPp: number;
    power: number;
    category: string;
  }>;
  types: string[];
  sprite: string;
}

export interface SerializedTeam {
  pokemon: SerializedPokemon[];
  activePokemon: number;
  teamSize: number;
}

export class TeamManager {
  private state: PokeWorldState;
  private pokemonManager: PokemonManager;
  private moveManager: MoveManager;
  
  // Cache des équipes pour éviter les requêtes DB répétées
  private teamCache: Map<string, IPokemonTeam> = new Map();
  
  // Listes de données pour la génération
  private readonly natures = [
    'hardy', 'lonely', 'brave', 'adamant', 'naughty',
    'bold', 'docile', 'relaxed', 'impish', 'lax',
    'timid', 'hasty', 'serious', 'jolly', 'naive',
    'modest', 'mild', 'quiet', 'bashful', 'rash',
    'calm', 'gentle', 'sassy', 'careful', 'quirky'
  ];

  constructor(
    state: PokeWorldState,
    pokemonManager: PokemonManager,
    moveManager: MoveManager
  ) {
    this.state = state;
    this.pokemonManager = pokemonManager;
    this.moveManager = moveManager;
    
    console.log('✅ TeamManager initialisé');
  }

  /**
   * Initialise l'équipe d'un joueur (appelé à la connexion)
   */
  async initializePlayerTeam(sessionId: string, username: string): Promise<void> {
    // Récupère l'ID du joueur depuis PlayerData
    const playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      throw new Error(`Joueur ${username} non trouvé`);
    }

    // Vérifie si l'équipe existe déjà
    let team = await PokemonTeam.findOne({ userId: playerData._id });
    
    if (!team) {
      // Crée une équipe vide
      team = await PokemonTeam.create({
        userId: playerData._id,
        pokemon: [],
        activePokemon: -1
      });
      console.log(`🆕 Nouvelle équipe créée pour ${username}`);
    }

    // Met en cache
    this.teamCache.set(sessionId, team);
  }

  /**
   * Récupère l'équipe d'un joueur
   */
  async getPlayerTeam(sessionId: string): Promise<IPokemonTeam | null> {
    // Vérifie le cache
    if (this.teamCache.has(sessionId)) {
      return this.teamCache.get(sessionId)!;
    }

    // Sinon, charge depuis la DB
    const player = this.state.players.get(sessionId);
    if (!player) return null;

    const playerData = await PlayerData.findOne({ username: player.name });
    if (!playerData) return null;

    const team = await PokemonTeam.findOne({ userId: playerData._id });
    if (team) {
      this.teamCache.set(sessionId, team);
    }
    
    return team;
  }

  /**
   * Donne un Pokémon starter à un joueur
   */
  async giveStarterPokemon(sessionId: string, pokemonId: number): Promise<TeamOperationResult> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) {
        return { success: false, error: "Équipe non trouvée" };
      }

      // Vérifie si le joueur a déjà des Pokémon
      if (team.pokemon.length > 0) {
        return { success: false, error: "Vous avez déjà des Pokémon !" };
      }

      // Génère le Pokémon starter au niveau 5
      const pokemon = await this.generatePokemonInstance(pokemonId, 5, sessionId);
      
      // Ajoute à l'équipe
      await team.addPokemon(pokemon);
      
      // Met à jour le cache
      this.teamCache.set(sessionId, team);

      console.log(`🎁 Starter ${pokemon.id} donné au joueur ${sessionId}`);
      
      return { 
        success: true, 
        pokemon: await this.serializePokemon(pokemon)
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'attribution du starter:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajoute un Pokémon à l'équipe d'un joueur
   */
  async addPokemonToTeam(
    sessionId: string, 
    pokemonId: number, 
    level: number = 5,
    options: Partial<IPokemonInstance> = {}
  ): Promise<TeamOperationResult> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) {
        return { success: false, error: "Équipe non trouvée" };
      }

      if (team.pokemon.length >= 6) {
        return { success: false, error: "Équipe pleine (6 Pokémon maximum)" };
      }

      // Génère le Pokémon
      const pokemon = await this.generatePokemonInstance(pokemonId, level, sessionId, options);
      
      // Ajoute à l'équipe
      await team.addPokemon(pokemon);
      
      // Met à jour le cache
      this.teamCache.set(sessionId, team);

      return { 
        success: true, 
        pokemon: await this.serializePokemon(pokemon)
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout du Pokémon:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Change le Pokémon actif
   */
  async setActivePokemon(sessionId: string, index: number): Promise<TeamOperationResult> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) {
        return { success: false, error: "Équipe non trouvée" };
      }

      await team.setActivePokemon(index);
      this.teamCache.set(sessionId, team);

      return { success: true };
      
    } catch (error) {
      console.error('Erreur lors du changement de Pokémon actif:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Soigne tous les Pokémon de l'équipe
   */
  async healPlayerTeam(sessionId: string): Promise<TeamOperationResult> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) {
        return { success: false, error: "Équipe non trouvée" };
      }

      await team.healAllPokemon();
      this.teamCache.set(sessionId, team);

      return { success: true };
      
    } catch (error) {
      console.error('Erreur lors des soins:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Génère une instance unique de Pokémon avec toutes les vraies données
   */
  private async generatePokemonInstance(
    pokemonId: number,
    level: number,
    trainerId: string,
    options: Partial<IPokemonInstance> = {}
  ): Promise<IPokemonInstance> {
    // Récupère les données du Pokémon
    const pokemonData = await this.pokemonManager.getPokemon(pokemonId);
    
    // Génère des IVs aléatoires (0-31)
    const generateIVs = () => ({
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      specialAttack: Math.floor(Math.random() * 32),
      specialDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    });

    // Détermine le genre
    const determineGender = (): 'Male' | 'Female' | 'Genderless' => {
      const ratio = pokemonData.genderRatio;
      if (ratio.male === 0 && ratio.female === 0) {
        return 'Genderless';
      }
      const random = Math.random() * 100;
      return random < ratio.male ? 'Male' : 'Female';
    };

    // Choisit une capacité
    const abilities = [...pokemonData.abilities];
    if (pokemonData.hiddenAbility && Math.random() < 0.1) {
      abilities.push(pokemonData.hiddenAbility);
    }
    const ability = abilities[Math.floor(Math.random() * abilities.length)];

    // Nature aléatoire
    const nature = this.natures[Math.floor(Math.random() * this.natures.length)];

    // Génère les stats
    const ivs = generateIVs();
    const evs = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    const stats = this.calculateStatsWithIVsEVs(pokemonData.baseStats, level, ivs, evs, nature);

    // Génère les attaques
    const moves = await this.generateMoves(pokemonData, level);

    // Calcule l'expérience
    const experience = this.calculateExperienceForLevel(level, pokemonData.growthRate);

    const pokemonInstance: IPokemonInstance = {
      id: uuidv4(),
      pokemonId: pokemonData.id,
      nickname: options.nickname,
      level,
      experience,
      currentHp: stats.hp,
      maxHp: stats.hp,
      nature,
      ability,
      gender: determineGender(),
      isShiny: Math.random() < 0.001, // 1/1000 chance
      stats,
      moves,
      status: 'normal',
      originalTrainer: trainerId,
      catchDate: new Date(),
      pokeball: options.pokeball || 'poke_ball',
      happiness: pokemonData.baseHappiness || 70,
      ivs,
      evs,
      heldItem: options.heldItem,
      statusTurns: options.statusTurns
    };

    return pokemonInstance;
  }

  /**
   * Calcule les stats avec IVs, EVs et nature
   */
  private calculateStatsWithIVsEVs(baseStats: any, level: number, ivs: any, evs: any, nature: string): any {
    // Chargement des modificateurs de nature depuis le fichier JSON
    const natureModifiers: { [key: string]: { increased?: string, decreased?: string } } = {
      'lonely': { increased: 'attack', decreased: 'defense' },
      'brave': { increased: 'attack', decreased: 'speed' },
      'adamant': { increased: 'attack', decreased: 'specialAttack' },
      'naughty': { increased: 'attack', decreased: 'specialDefense' },
      'bold': { increased: 'defense', decreased: 'attack' },
      'relaxed': { increased: 'defense', decreased: 'speed' },
      'impish': { increased: 'defense', decreased: 'specialAttack' },
      'lax': { increased: 'defense', decreased: 'specialDefense' },
      'timid': { increased: 'speed', decreased: 'attack' },
      'hasty': { increased: 'speed', decreased: 'defense' },
      'jolly': { increased: 'speed', decreased: 'specialAttack' },
      'naive': { increased: 'speed', decreased: 'specialDefense' },
      'modest': { increased: 'specialAttack', decreased: 'attack' },
      'mild': { increased: 'specialAttack', decreased: 'defense' },
      'quiet': { increased: 'specialAttack', decreased: 'speed' },
      'rash': { increased: 'specialAttack', decreased: 'specialDefense' },
      'calm': { increased: 'specialDefense', decreased: 'attack' },
      'gentle': { increased: 'specialDefense', decreased: 'defense' },
      'sassy': { increased: 'specialDefense', decreased: 'speed' },
      'careful': { increased: 'specialDefense', decreased: 'specialAttack' }
    };

    const calculateStat = (statName: string, baseStat: number, isHP: boolean = false): number => {
      const iv = ivs[statName] || 0;
      const ev = evs[statName] || 0;
      
      if (isHP) {
        return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
      } else {
        let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
        
        // Applique le modificateur de nature
        const natureModifier = natureModifiers[nature];
        if (natureModifier) {
          if (natureModifier.increased === statName) stat = Math.floor(stat * 1.1);
          if (natureModifier.decreased === statName) stat = Math.floor(stat * 0.9);
        }
        
        return stat;
      }
    };

    return {
      hp: calculateStat('hp', baseStats.hp, true),
      attack: calculateStat('attack', baseStats.attack),
      defense: calculateStat('defense', baseStats.defense),
      specialAttack: calculateStat('specialAttack', baseStats.specialAttack),
      specialDefense: calculateStat('specialDefense', baseStats.specialDefense),
      speed: calculateStat('speed', baseStats.speed)
    };
  }

  /**
   * Génère les attaques d'un Pokémon selon son niveau
   */
  private async generateMoves(pokemonData: any, level: number): Promise<any[]> {
    const learnedMoves = pokemonData.learnset.filter((move: any) => move.level <= level);
    
    // Prend les 4 dernières attaques apprises
    const selectedMoves = learnedMoves.slice(-4);
    
    const moves: any[] = [];
    for (const moveData of selectedMoves) {
      try {
        const move = await this.moveManager.getMove(moveData.moveId);
        moves.push({
          moveId: moveData.moveId,
          currentPp: move.pp,
          maxPp: move.pp
        });
      } catch (error) {
        console.warn(`Impossible de charger l'attaque ${moveData.moveId}`);
      }
    }
    
    return moves;
  }

  /**
   * Calcule l'expérience nécessaire pour un niveau
   */
  private calculateExperienceForLevel(level: number, growthRate: string): number {
    switch (growthRate) {
      case 'Fast':
        return Math.floor(0.8 * Math.pow(level, 3));
      case 'Medium Fast':
        return Math.pow(level, 3);
      case 'Medium Slow':
        return Math.floor(1.2 * Math.pow(level, 3) - 15 * Math.pow(level, 2) + 100 * level - 140);
      case 'Slow':
        return Math.floor(1.25 * Math.pow(level, 3));
      default:
        return Math.pow(level, 3);
    }
  }

  /**
   * Sérialise un Pokémon pour l'envoyer au client
   */
  async serializePokemon(pokemon: IPokemonInstance): Promise<SerializedPokemon> {
    try {
      // Récupère les données du Pokémon
      const pokemonData = await this.pokemonManager.getPokemon(pokemon.pokemonId);
      
      // Sérialise les attaques avec leurs détails
      const serializedMoves = [];
      for (const move of pokemon.moves) {
        try {
          const moveData = await this.moveManager.getMove(move.moveId);
          serializedMoves.push({
            moveId: move.moveId,
            name: moveData.name,
            currentPp: move.currentPp,
            maxPp: move.maxPp,
            power: moveData.power,
            category: moveData.category
          });
        } catch (error) {
          console.warn(`Impossible de charger les détails de l'attaque ${move.moveId}`);
        }
      }

      return {
        id: pokemon.id,
        pokemonId: pokemon.pokemonId,
        name: pokemonData.name,
        nickname: pokemon.nickname,
        level: pokemon.level,
        experience: pokemon.experience,
        currentHp: pokemon.currentHp,
        maxHp: pokemon.maxHp,
        nature: pokemon.nature,
        ability: pokemon.ability,
        gender: pokemon.gender,
        isShiny: pokemon.isShiny,
        status: pokemon.status,
        stats: pokemon.stats,
        moves: serializedMoves,
        types: pokemonData.types,
        sprite: pokemonData.sprite
      };
    } catch (error) {
      console.error(`Erreur lors de la sérialisation du Pokémon ${pokemon.pokemonId}:`, error);
      throw error;
    }
  }

  /**
   * Sérialise une équipe complète pour l'envoyer au client
   */
  async serializeTeam(team: IPokemonTeam): Promise<SerializedTeam> {
    const serializedPokemon = [];
    
    for (const pokemon of team.pokemon) {
      try {
        const serialized = await this.serializePokemon(pokemon);
        serializedPokemon.push(serialized);
      } catch (error) {
        console.error(`Erreur lors de la sérialisation du Pokémon dans l'équipe:`, error);
      }
    }

    return {
      pokemon: serializedPokemon,
      activePokemon: team.activePokemon,
      teamSize: team.pokemon.length
    };
  }

  /**
   * Récupère le Pokémon actif d'un joueur
   */
  async getActivePokemon(sessionId: string): Promise<SerializedPokemon | null> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) return null;

      const activePokemon = team.getActivePokemon();
      if (!activePokemon) return null;

      return await this.serializePokemon(activePokemon);
    } catch (error) {
      console.error('Erreur lors de la récupération du Pokémon actif:', error);
      return null;
    }
  }

  /**
   * Retire un Pokémon de l'équipe
   */
  async removePokemonFromTeam(sessionId: string, pokemonId: string): Promise<TeamOperationResult> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) {
        return { success: false, error: "Équipe non trouvée" };
      }

      await team.removePokemon(pokemonId);
      this.teamCache.set(sessionId, team);

      return { success: true };
      
    } catch (error) {
      console.error('Erreur lors de la suppression du Pokémon:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie si un joueur peut capturer un nouveau Pokémon
   */
  async canCapturePokemon(sessionId: string): Promise<boolean> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      return team ? team.pokemon.length < 6 : false;
    } catch (error) {
      console.error('Erreur lors de la vérification de capture:', error);
      return false;
    }
  }

  /**
   * Ajoute un Pokémon capturé à l'équipe
   */
  async addCapturedPokemon(
    sessionId: string,
    pokemonId: number,
    level: number,
    pokeball: string = 'poke_ball'
  ): Promise<TeamOperationResult> {
    return await this.addPokemonToTeam(sessionId, pokemonId, level, { pokeball });
  }

  /**
   * Statistiques de l'équipe
   */
  async getTeamStats(sessionId: string): Promise<{
    totalLevel: number;
    averageLevel: number;
    teamSize: number;
    typeCoverage: string[];
  } | null> {
    try {
      const team = await this.getPlayerTeam(sessionId);
      if (!team) return null;

      let totalLevel = 0;
      const types = new Set<string>();

      for (const pokemon of team.pokemon) {
        totalLevel += pokemon.level;
        
        // Récupère les types du Pokémon
        try {
          const pokemonData = await this.pokemonManager.getPokemon(pokemon.pokemonId);
          pokemonData.types.forEach((type: string) => types.add(type));
        } catch (error) {
          console.warn(`Impossible de récupérer les types du Pokémon ${pokemon.pokemonId}`);
        }
      }

      return {
        totalLevel,
        averageLevel: team.pokemon.length > 0 ? Math.round(totalLevel / team.pokemon.length) : 0,
        teamSize: team.pokemon.length,
        typeCoverage: Array.from(types)
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques d\'équipe:', error);
      return null;
    }
  }

  /**
   * Nettoie le cache (appelé à la déconnexion)
   */
  clearPlayerCache(sessionId: string): void {
    this.teamCache.delete(sessionId);
  }

  /**
   * Vide tout le cache
   */
  clearAllCache(): void {
    this.teamCache.clear();
  }

  /**
   * Statistiques du gestionnaire
   */
  getManagerStats(): {
    cachedTeams: number;
    totalOperations: number;
  } {
    return {
      cachedTeams: this.teamCache.size,
      totalOperations: 0 // Pourrait être implémenté avec un compteur
    };
  }
}
