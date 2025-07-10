// server/src/managers/PokemonCreator.ts
// MODULE CENTRALISÉ DE CRÉATION DE POKÉMON AUTHENTIQUE

import { OwnedPokemon, IOwnedPokemon } from '../models/OwnedPokemon';
import { MoveManager } from './MoveManager';
import { getPokemonById } from '../data/PokemonData';
import naturesData from '../data/natures.json';

export interface PokemonCreationOptions {
  nickname?: string;
  shiny?: boolean;
  nature?: string;
  ivs?: {
    hp?: number;
    attack?: number;
    defense?: number;
    spAttack?: number;
    spDefense?: number;
    speed?: number;
  };
  customMoves?: string[];
  friendship?: number;
  pokeball?: string;
  heldItem?: string;
}

export interface WildPokemonData {
  pokemonId: number;
  level: number;
  currentHp: number;
  maxHp: number;
  nature?: string;
  shiny?: boolean;
  moves?: string[];
}

export class PokemonCreator {
  
  // Classe statique - pas de constructor
  private static initialized = false;
  
  /**
   * Initialise le PokemonCreator (appelé automatiquement)
   */
  private static async ensureInitialized() {
    if (!this.initialized) {
      await MoveManager.initialize();
      this.initialized = true;
      console.log('🏭 [PokemonCreator] Module initialisé globalement');
    }
  }

  /**
   * Crée un Pokémon sauvage avec stats aléatoires authentiques
   */
  static async createWild(
    pokemonId: number, 
    level: number, 
    trainerName: string,
    options?: PokemonCreationOptions
  ): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    console.log(`🌿 [PokemonCreator] Création Pokémon sauvage ID:${pokemonId} Niv:${level}`);
    
    const baseData = await getPokemonById(pokemonId);
    if (!baseData) {
      throw new Error(`Pokémon ID ${pokemonId} introuvable`);
    }

    // IVs aléatoires authentiques (0-31)
    const ivs = options?.ivs ? this.validateIVs(options.ivs) : this.generateRandomIVs();
    
    // Nature aléatoire ou spécifiée
    const nature = options?.nature || this.getRandomNature();
    
    // Gender selon les ratios authentiques
    const gender = this.generateGender(baseData.genderRatio);
    
    // Shiny rare (1/4096 authentique)
    const shiny = options?.shiny !== undefined ? options.shiny : this.rollShiny();
    
    // Moves selon niveau authentique
    const moves = await this.generateMovesForLevel(pokemonId, level, options?.customMoves);
    
    // Ability aléatoire parmi celles disponibles
    const ability = this.selectRandomAbility(baseData.abilities);

    const pokemonData = {
      owner: trainerName,
      pokemonId: pokemonId,
      level: level,
      experience: this.calculateExperienceForLevel(level),
      nature: nature,
      nickname: options?.nickname,
      shiny: shiny,
      gender: gender,
      ability: ability,
      
      ivs: ivs,
      evs: {
        hp: 0, attack: 0, defense: 0,
        spAttack: 0, spDefense: 0, speed: 0
      },
      
      moves: moves,
      
      // Stats seront calculées par le middleware
      calculatedStats: {
        attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0
      },
      currentHp: 1, // Sera recalculé
      maxHp: 1,     // Sera recalculé
      
      status: 'normal' as const,
      
      isInTeam: false,
      box: 0,
      friendship: options?.friendship || 70,
      pokeball: options?.pokeball || 'poke_ball',
      originalTrainer: trainerName,
      heldItem: options?.heldItem
    };

    console.log(`✅ [PokemonCreator] ${baseData.name} sauvage créé - Nature: ${nature}, IVs: ${JSON.stringify(ivs)}`);
    return new OwnedPokemon(pokemonData);
  }

  /**
   * Crée un starter avec stats bonus authentiques
   */
  static async createStarter(
    pokemonId: number,
    trainerName: string,
    nickname?: string
  ): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    console.log(`🌟 [PokemonCreator] Création starter ID:${pokemonId}`);
    
    const options: PokemonCreationOptions = {
      nickname: nickname,
      // Starters ont souvent de meilleurs IVs
      ivs: {
        hp: this.randomRange(20, 31),
        attack: this.randomRange(20, 31),
        defense: this.randomRange(20, 31),
        spAttack: this.randomRange(20, 31),
        spDefense: this.randomRange(20, 31),
        speed: this.randomRange(20, 31)
      },
      friendship: 70,
      pokeball: 'poke_ball'
    };

    return await this.createWild(pokemonId, 5, trainerName, options);
  }

  /**
   * Crée un Pokémon à partir d'une capture
   */
  static async createFromCapture(
    wildData: WildPokemonData,
    captureResult: any,
    trainerName: string,
    nickname?: string
  ): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    console.log(`🎯 [PokemonCreator] Création depuis capture ${wildData.pokemonId}`);
    
    const options: PokemonCreationOptions = {
      nickname: nickname,
      nature: wildData.nature,
      shiny: wildData.shiny,
      customMoves: wildData.moves,
      pokeball: captureResult.ballUsed,
      friendship: this.getInitialFriendship(captureResult.ballUsed)
    };

    const pokemon = await this.createWild(wildData.pokemonId, wildData.level, trainerName, options);
    
    // Ajuster HP selon le combat
    const hpPercent = wildData.currentHp / wildData.maxHp;
    pokemon.currentHp = Math.max(1, Math.floor(pokemon.maxHp * hpPercent));
    
    return pokemon;
  }

  /**
   * Crée un Pokémon custom pour les tests/debug/admin
   */
  static async createCustom(
    pokemonId: number,
    level: number,
    trainerName: string,
    customOptions: Partial<PokemonCreationOptions>
  ): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    console.log(`🔧 [PokemonCreator] Création custom ID:${pokemonId}`);
    return await this.createWild(pokemonId, level, trainerName, customOptions);
  }

  /**
   * Crée un Pokémon pour les rencontres aléatoires
   */
  static async createRandomEncounter(
    pokemonId: number,
    levelRange: [number, number],
    location: string
  ): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    
    const level = this.randomRange(levelRange[0], levelRange[1]);
    console.log(`🎲 [PokemonCreator] Rencontre aléatoire ${pokemonId} niveau ${level} à ${location}`);
    
    return await this.createWild(pokemonId, level, 'wild', {
      // Pokémon sauvages peuvent avoir des variations
      shiny: Math.random() < 0.001 // Légèrement plus fréquent en sauvage
    });
  }

  // === MÉTHODES PRIVÉES AUTHENTIQUES ===

  /**
   * Génère des IVs aléatoires authentiques (0-31)
   */
  private static generateRandomIVs() {
    return {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      spAttack: Math.floor(Math.random() * 32),
      spDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };
  }

  /**
   * Valide et complète des IVs partiels
   */
  private static validateIVs(partialIVs: any) {
    const defaultIVs = this.generateRandomIVs();
    return {
      hp: this.clamp(partialIVs.hp ?? defaultIVs.hp, 0, 31),
      attack: this.clamp(partialIVs.attack ?? defaultIVs.attack, 0, 31),
      defense: this.clamp(partialIVs.defense ?? defaultIVs.defense, 0, 31),
      spAttack: this.clamp(partialIVs.spAttack ?? defaultIVs.spAttack, 0, 31),
      spDefense: this.clamp(partialIVs.spDefense ?? defaultIVs.spDefense, 0, 31),
      speed: this.clamp(partialIVs.speed ?? defaultIVs.speed, 0, 31)
    };
  }

  /**
   * Sélectionne une nature aléatoire
   */
  private static getRandomNature(): string {
    const natures = Object.keys(naturesData);
    return natures[Math.floor(Math.random() * natures.length)];
  }

  /**
   * Génère le gender selon les ratios authentiques
   */
  private static generateGender(genderRatio: any): "Male" | "Female" | "Genderless" {
    if (!genderRatio || genderRatio.genderless) {
      return "Genderless";
    }
    
    const femaleChance = genderRatio.female || 50;
    return Math.random() * 100 < femaleChance ? "Female" : "Male";
  }

  /**
   * Roll shiny authentique (1/4096)
   */
  private static rollShiny(): boolean {
    return Math.random() < (1 / 4096);
  }

  /**
   * Génère les attaques selon le niveau (authentique)
   */
  private static async generateMovesForLevel(pokemonId: number, level: number, customMoves?: string[]) {
    await MoveManager.initialize();
    
    if (customMoves && customMoves.length > 0) {
      return await this.createMovesWithPP(customMoves.slice(0, 4));
    }
    
    // Récupérer les attaques apprises par niveau depuis PokemonData
    const baseData = await getPokemonById(pokemonId);
    if (!baseData?.learnset) {
      // Fallback : attaque de base
      return await this.createMovesWithPP(['tackle']);
    }
    
    // Filtrer les attaques apprises jusqu'au niveau actuel
    const availableMoves = Object.entries(baseData.learnset)
      .filter(([moveId, learnLevel]) => (learnLevel as number) <= level)
      .sort(([, a], [, b]) => (b as number) - (a as number)) // Plus récentes en premier
      .slice(0, 4) // Max 4 attaques
      .map(([moveId]) => moveId);
    
    if (availableMoves.length === 0) {
      return await this.createMovesWithPP(['tackle']);
    }
    
    return await this.createMovesWithPP(availableMoves);
  }

  /**
   * Crée les objets moves avec PP corrects depuis MoveManager
   */
  private static async createMovesWithPP(moveIds: string[]) {
    const moves = [];
    
    for (const moveId of moveIds) {
      const moveData = MoveManager.getMoveData(moveId);
      if (!moveData) {
        console.warn(`⚠️ [PokemonCreator] Attaque ${moveId} introuvable, utilisation tackle`);
        const tackleData = MoveManager.getMoveData('tackle');
        moves.push({
          moveId: 'tackle',
          currentPp: tackleData?.pp || 35,
          maxPp: tackleData?.pp || 35
        });
        continue;
      }
      
      moves.push({
        moveId: moveId,
        currentPp: moveData.pp,
        maxPp: moveData.pp
      });
    }
    
    console.log(`🎮 [PokemonCreator] ${moves.length} attaques créées avec PP corrects`);
    return moves;
  }

  /**
   * Sélectionne une ability aléatoire
   */
  private static selectRandomAbility(abilities: string[]): string {
    if (!abilities || abilities.length === 0) {
      return 'unknown';
    }
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  /**
   * Calcule l'expérience pour un niveau donné
   */
  private static calculateExperienceForLevel(level: number): number {
    // Formule Medium Fast (la plus commune)
    return Math.floor(Math.pow(level, 3));
  }

  /**
   * Détermine l'amitié initiale selon la ball
   */
  private static getInitialFriendship(ballType: string): number {
    const friendshipBalls: { [key: string]: number } = {
      'luxury_ball': 100,
      'friend_ball': 150,
      'heal_ball': 100,
      'premier_ball': 100
    };
    
    return friendshipBalls[ballType] || 70;
  }

  // === UTILITAIRES ===

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private static randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Méthode de test pour créer rapidement un Pokémon
   */
  static async createTestPokemon(pokemonId: number, trainerName: string): Promise<IOwnedPokemon> {
    await this.ensureInitialized();
    console.log(`🧪 [PokemonCreator] Création test Pokémon ${pokemonId}`);
    
    return await this.createWild(pokemonId, 15, trainerName, {
      ivs: { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
      nature: 'adamant',
      customMoves: ['tackle', 'growl']
    });
  }
}

export default PokemonCreator;
