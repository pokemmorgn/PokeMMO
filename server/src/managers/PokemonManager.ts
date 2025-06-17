/**
 * PokemonManager - Gestionnaire des Pokémon
 * Charge dynamiquement les Pokémon par familles/groupes depuis des fichiers JSON séparés
 */

import fs from 'fs/promises';
import path from 'path';

// Types et interfaces
interface Pokemon {
  id: number;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  abilities: string[];
  hiddenAbility?: string;
  height: number;
  weight: number;
  sprite: string;
  description: string;
  category: string;
  genderRatio: {
    male: number;
    female: number;
  };
  eggGroups: string[];
  hatchTime: number;
  baseExperience: number;
  growthRate: string;
  captureRate: number;
  baseHappiness: number;
  learnset: Array<{
    moveId: string;
    level: number;
  }>;
  evolution: {
    canEvolve: boolean;
    evolvesInto?: number;
    evolvesFrom?: number;
    method?: string;
    requirement?: number | string;
  };
}

interface PokemonFamily {
  family: string;
  region: string;
  pokemon: Pokemon[];
}

interface PokemonGroup {
  group: string;
  description: string;
  pokemon: Pokemon[];
}

interface SearchCriteria {
  type?: string;
  minLevel?: number;
  maxLevel?: number;
  hasEvolution?: boolean;
  generation?: string;
  ability?: string;
}

interface PokemonSearchResult extends Pokemon {
  familyName?: string;
  groupName?: string;
}

interface CacheStats {
  loadedFamilies: string[];
  loadedGroups: string[];
  totalPokemon: number;
  indexLoaded: boolean;
  indexSize: number;
}

export class PokemonManager {
  private loadedFamilies: Map<string, PokemonFamily> = new Map();
  private loadedGroups: Map<string, PokemonGroup> = new Map();
  private pokemonIndex: Map<number, string> = new Map();
  private indexLoaded: boolean = false;
  private readonly basePath: string;

  private readonly enableCache: boolean;

  /**
   * Initialise le PokemonManager avec des options
   */
  constructor(options: {
    basePath?: string;
    enableCache?: boolean;
  } = {}) {
    this.basePath = options.basePath || './data/pokemon';
    this.enableCache = options.enableCache ?? true;
  }

  /**
   * Charge l'index des Pokémon
   */
  async loadPokemonIndex(): Promise<void> {
    if (this.indexLoaded) return;
    
    try {
      const indexPath = path.join(this.basePath, 'pokemon-index.json');
      const fileContent = await fs.readFile(indexPath, 'utf-8');
      const indexData: Record<string, string> = JSON.parse(fileContent);
      
      Object.entries(indexData).forEach(([pokemonId, filePath]) => {
        this.pokemonIndex.set(parseInt(pokemonId), filePath);
      });
      
      this.indexLoaded = true;
      console.log(`✅ Pokemon index chargé (${this.pokemonIndex.size} Pokémon)`);
    } catch (error) {
      console.warn('⚠️ Impossible de charger l\'index des Pokémon:', error);
      throw new Error('Index des Pokémon requis pour le fonctionnement');
    }
  }

  /**
   * Charge une famille de Pokémon
   */
  async loadPokemonFamily(familyName: string): Promise<PokemonFamily> {
    if (this.loadedFamilies.has(familyName)) {
      return this.loadedFamilies.get(familyName)!;
    }

    try {
      const filePath = path.join(this.basePath, 'families', `${familyName}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const familyData: PokemonFamily = JSON.parse(fileContent);
      
      // Validation basique du format
      this.validatePokemonData(familyData.pokemon, familyName);
      
      if (this.enableCache) {
        this.loadedFamilies.set(familyName, familyData);
      }
      
      console.log(`✅ Famille "${familyName}" chargée (${familyData.pokemon.length} Pokémon)`);
      
      return familyData;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de la famille ${familyName}:`, error);
      throw error;
    }
  }

  /**
   * Charge un groupe de Pokémon
   */
  async loadPokemonGroup(groupName: string): Promise<PokemonGroup> {
    if (this.loadedGroups.has(groupName)) {
      return this.loadedGroups.get(groupName)!;
    }

    try {
      const filePath = path.join(this.basePath, 'groups', `${groupName}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const groupData: PokemonGroup = JSON.parse(fileContent);
      
      // Validation basique du format
      this.validatePokemonData(groupData.pokemon, groupName);
      
      if (this.enableCache) {
        this.loadedGroups.set(groupName, groupData);
      }
      
      console.log(`✅ Groupe "${groupName}" chargé (${groupData.pokemon.length} Pokémon)`);
      
      return groupData;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement du groupe ${groupName}:`, error);
      throw error;
    }
  }

  /**
   * Valide le format des données de Pokémon chargées
   */
  private validatePokemonData(pokemon: Pokemon[], source: string): void {
    if (!pokemon || !Array.isArray(pokemon)) {
      throw new Error(`Format invalide pour ${source}: doit contenir un tableau de Pokémon`);
    }

    for (const poke of pokemon) {
      if (!poke.id || typeof poke.id !== 'number') {
        console.warn(`⚠️ Pokémon dans ${source}: ID manquant ou invalide`);
      }
      
      if (!poke.name || typeof poke.name !== 'string') {
        console.warn(`⚠️ Pokémon ${poke.id} dans ${source}: nom manquant ou invalide`);
      }
      
      if (!poke.types || !Array.isArray(poke.types) || poke.types.length === 0) {
        console.warn(`⚠️ Pokémon ${poke.id} dans ${source}: types manquants ou invalides`);
      }
    }
  }

  /**
   * Récupère un Pokémon spécifique par son ID
   */
  async getPokemon(pokemonId: number): Promise<Pokemon> {
    // Si pas d'index chargé, on le charge
    if (!this.indexLoaded) {
      await this.loadPokemonIndex();
    }
    
    const filePath = this.pokemonIndex.get(pokemonId);
    if (!filePath) {
      throw new Error(`Pokémon ID ${pokemonId} introuvable dans l'index`);
    }

    // Détermine si c'est une famille ou un groupe
    const [type, name] = filePath.split('/');
    
    let pokemonData: Pokemon[];
    if (type === 'families') {
      const family = await this.loadPokemonFamily(name);
      pokemonData = family.pokemon;
    } else if (type === 'groups') {
      const group = await this.loadPokemonGroup(name);
      pokemonData = group.pokemon;
    } else {
      throw new Error(`Type de fichier inconnu: ${type}`);
    }

    const pokemon = pokemonData.find(p => p.id === pokemonId);
    if (!pokemon) {
      throw new Error(`Pokémon ID ${pokemonId} introuvable dans ${filePath}`);
    }

    return pokemon;
  }

  /**
   * Récupère plusieurs Pokémon par leurs IDs
   */
  async getPokemonBatch(pokemonIds: number[]): Promise<Pokemon[]> {
    const pokemon: Pokemon[] = [];
    
    for (const id of pokemonIds) {
      try {
        const poke = await this.getPokemon(id);
        pokemon.push(poke);
      } catch (error) {
        console.warn(`Impossible de charger le Pokémon ID ${id}:`, error);
      }
    }
    
    return pokemon;
  }

  /**
   * Récupère toute une famille d'évolution
   */
  async getPokemonFamily(familyName: string): Promise<PokemonFamily> {
    return await this.loadPokemonFamily(familyName);
  }

  /**
   * Récupère un groupe de Pokémon
   */
  async getPokemonGroup(groupName: string): Promise<PokemonGroup> {
    return await this.loadPokemonGroup(groupName);
  }

  /**
   * Recherche des Pokémon par critères
   */
  async searchPokemon(criteria: SearchCriteria = {}): Promise<PokemonSearchResult[]> {
    const results: PokemonSearchResult[] = [];

    // Recherche dans toutes les familles chargées
    for (const [familyName, family] of this.loadedFamilies) {
      family.pokemon.forEach(pokemon => {
        if (this.matchesCriteria(pokemon, criteria)) {
          results.push({ ...pokemon, familyName });
        }
      });
    }

    // Recherche dans tous les groupes chargés
    for (const [groupName, group] of this.loadedGroups) {
      group.pokemon.forEach(pokemon => {
        if (this.matchesCriteria(pokemon, criteria)) {
          results.push({ ...pokemon, groupName });
        }
      });
    }

    return results;
  }

  /**
   * Vérifie si un Pokémon correspond aux critères
   */
  private matchesCriteria(pokemon: Pokemon, criteria: SearchCriteria): boolean {
    if (criteria.type && !pokemon.types.includes(criteria.type)) return false;
    if (criteria.hasEvolution !== undefined && pokemon.evolution.canEvolve !== criteria.hasEvolution) return false;
    if (criteria.ability && !pokemon.abilities.includes(criteria.ability)) return false;
    return true;
  }

  /**
   * Calcule les stats d'un Pokémon à un niveau donné
   */
  calculateStats(pokemon: Pokemon, level: number, nature?: string): {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  } {
    // Formule simplifiée des stats Pokémon
    const calculateStat = (baseStat: number, isHP: boolean = false): number => {
      if (isHP) {
        return Math.floor(((2 * baseStat + 31) * level) / 100) + level + 10;
      } else {
        return Math.floor(((2 * baseStat + 31) * level) / 100) + 5;
      }
    };

    return {
      hp: calculateStat(pokemon.baseStats.hp, true),
      attack: calculateStat(pokemon.baseStats.attack),
      defense: calculateStat(pokemon.baseStats.defense),
      specialAttack: calculateStat(pokemon.baseStats.specialAttack),
      specialDefense: calculateStat(pokemon.baseStats.specialDefense),
      speed: calculateStat(pokemon.baseStats.speed)
    };
  }

  /**
   * Récupère les attaques apprises par un Pokémon à un niveau donné
   */
  getLearnedMoves(pokemon: Pokemon, level: number): Array<{moveId: string, level: number}> {
    return pokemon.learnset.filter(move => move.level <= level);
  }

  /**
   * Vérifie si un Pokémon peut évoluer
   */
  canEvolve(pokemon: Pokemon, level?: number): boolean {
    if (!pokemon.evolution.canEvolve) return false;
    
    if (pokemon.evolution.method === 'level' && level) {
      return level >= (pokemon.evolution.requirement as number);
    }
    
    return pokemon.evolution.canEvolve;
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): CacheStats {
    const totalPokemon = Array.from(this.loadedFamilies.values())
      .reduce((total, family) => total + family.pokemon.length, 0) +
      Array.from(this.loadedGroups.values())
      .reduce((total, group) => total + group.pokemon.length, 0);

    return {
      loadedFamilies: Array.from(this.loadedFamilies.keys()),
      loadedGroups: Array.from(this.loadedGroups.keys()),
      totalPokemon,
      indexLoaded: this.indexLoaded,
      indexSize: this.pokemonIndex.size
    };
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.loadedFamilies.clear();
    this.loadedGroups.clear();
    this.pokemonIndex.clear();
    this.indexLoaded = false;
    console.log('🗑️ Cache Pokémon vidé');
  }
}

export default PokemonManager;
