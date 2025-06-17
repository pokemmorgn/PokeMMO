/**
 * MoveManager - Gestionnaire des attaques Pokémon
 * Version serveur avec lecture de fichiers via fs
 */

import fs from 'fs/promises';
import path from 'path';

// Types et interfaces
interface Move {
  name: string;
  category: 'Physical' | 'Special' | 'Status';
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  description: string;
  effects?: string[];
}

interface MoveData {
  [moveId: string]: Move;
}

interface SearchCriteria {
  type?: string;
  category?: 'Physical' | 'Special' | 'Status';
  powerMin?: number;
  powerMax?: number;
  accuracy?: number;
}

interface MoveSearchResult extends Move {
  id: string;
  type?: string;
}

interface CacheStats {
  loadedTypes: string[];
  totalMoves: number;
  indexLoaded: boolean;
  indexSize: number;
}

type PokemonType = 
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'poison'
  | 'fighting' | 'ground' | 'flying' | 'psychic' | 'bug' | 'rock'
  | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy' | 'ice';

export class MoveManager {
  private loadedTypes: Map<string, MoveData> = new Map();
  private moveIndex: Map<string, string> = new Map();
  private indexLoaded: boolean = false;
  private readonly basePath: string;
  private readonly useDevFallback: boolean;
  private readonly enableCache: boolean;

  private readonly availableTypes: PokemonType[] = [
    'normal', 'fire', 'water', 'electric', 'grass', 'poison',
    'fighting', 'ground', 'flying', 'psychic', 'bug', 'rock',
    'ghost', 'dragon', 'dark', 'steel', 'fairy', 'ice'
  ];

  /**
   * Initialise le MoveManager avec des options
   */
  constructor(options: {
    basePath?: string;
    useDevFallback?: boolean;
    enableCache?: boolean;
  } = {}) {
    this.basePath = options.basePath || './data';
    this.useDevFallback = options.useDevFallback ?? true;
    this.enableCache = options.enableCache ?? true;
  }

  /**
   * Charge l'index des moves (optionnel)
   */
  async loadMoveIndex(): Promise<void> {
    if (this.indexLoaded) return;
    
    try {
      const indexPath = path.join(this.basePath, 'moves-index.json');
      const fileContent = await fs.readFile(indexPath, 'utf-8');
      const indexData: Record<string, string> = JSON.parse(fileContent);
      
      Object.entries(indexData).forEach(([moveId, type]) => {
        this.moveIndex.set(moveId, type);
      });
      
      this.indexLoaded = true;
      console.log(`✅ Move index chargé (${this.moveIndex.size} moves)`);
    } catch (error) {
      console.warn('⚠️ Impossible de charger l\'index des moves:', error);
      console.warn('💡 Fonctionnement sans index (type requis pour getMove)');
    }
  }

  /**
   * Charge les moves d'un type donné
   */
  async loadMovesByType(type: PokemonType): Promise<MoveData> {
    if (this.loadedTypes.has(type)) {
      return this.loadedTypes.get(type)!;
    }

    if (!this.availableTypes.includes(type)) {
      throw new Error(`Type "${type}" non supporté. Types disponibles: ${this.availableTypes.join(', ')}`);
    }

    try {
      const filePath = path.join(this.basePath, 'moves', `${type}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const moveData: MoveData = JSON.parse(fileContent);
      
      // Validation basique du format
      this.validateMoveData(moveData, type);
      
      if (this.enableCache) {
        this.loadedTypes.set(type, moveData);
      }
      
      console.log(`✅ Moves "${type}" chargés (${Object.keys(moveData).length} attaques)`);
      
      return moveData;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des moves ${type}:`, error);
      
      // Fallback: utilise les données de test
      if (this.useDevFallback) {
        console.log(`🔄 Utilisation des données de test pour ${type}...`);
        return await this.getMockMoveData(type);
      }
      
      throw error;
    }
  }

  /**
   * Valide le format des données de moves chargées
   */
  private validateMoveData(moveData: MoveData, type: string): void {
    if (!moveData || typeof moveData !== 'object') {
      throw new Error(`Format invalide pour ${type}.json: doit être un objet`);
    }

    for (const [moveId, move] of Object.entries(moveData)) {
      if (!move.name || typeof move.name !== 'string') {
        console.warn(`⚠️ Move ${moveId} dans ${type}.json: nom manquant ou invalide`);
      }
      
      if (!['Physical', 'Special', 'Status'].includes(move.category)) {
        console.warn(`⚠️ Move ${moveId} dans ${type}.json: catégorie invalide (${move.category})`);
      }
      
      if (typeof move.power !== 'number' || move.power < 0) {
        console.warn(`⚠️ Move ${moveId} dans ${type}.json: puissance invalide (${move.power})`);
      }
    }
  }

  /**
   * Récupère une attaque spécifique
   */
  async getMove(moveId: string, type?: PokemonType): Promise<Move> {
    // Si pas de type fourni, essaie de le trouver dans l'index
    if (!type) {
      if (!this.indexLoaded) {
        await this.loadMoveIndex();
      }
      
      const foundType = this.moveIndex.get(moveId);
      if (!foundType) {
        throw new Error(`Move "${moveId}" introuvable dans l'index`);
      }
      type = foundType as PokemonType;
    }

    // Charge le type si nécessaire
    const movesOfType = await this.loadMovesByType(type);
    
    const move = movesOfType[moveId];
    if (!move) {
      throw new Error(`Move "${moveId}" introuvable dans le type "${type}"`);
    }

    return move;
  }

  /**
   * Récupère plusieurs attaques par leurs IDs
   */
  async getMoves(moveIds: string[]): Promise<Move[]> {
    const moves: Move[] = [];
    
    for (const moveId of moveIds) {
      try {
        const move = await this.getMove(moveId);
        moves.push(move);
      } catch (error) {
        console.warn(`Impossible de charger le move "${moveId}":`, error);
      }
    }
    
    return moves;
  }

  /**
   * Précharge les types de moves pour des Pokémon donnés
   */
  async preloadTypeMoves(pokemonTypes: PokemonType[]): Promise<void> {
    const uniqueTypes = [...new Set(pokemonTypes)];
    const loadPromises = uniqueTypes
      .filter(type => !this.loadedTypes.has(type))
      .map(type => this.loadMovesByType(type));
    
    await Promise.all(loadPromises);
    console.log(`✅ Préchargement terminé pour les types: ${uniqueTypes.join(', ')}`);
  }

  /**
   * Récupère tous les moves d'un type
   */
  async getMovesByType(type: PokemonType): Promise<MoveData> {
    return await this.loadMovesByType(type);
  }

  /**
   * Recherche des moves par critères
   */
  async searchMoves(criteria: SearchCriteria = {}): Promise<MoveSearchResult[]> {
    const { type } = criteria;
    const results: MoveSearchResult[] = [];

    // Si un type spécifique est demandé
    if (type && this.availableTypes.includes(type as PokemonType)) {
      const moves = await this.loadMovesByType(type as PokemonType);
      Object.entries(moves).forEach(([id, move]) => {
        if (this.matchesCriteria(move, criteria)) {
          results.push({ id, ...move });
        }
      });
    } else {
      // Recherche dans tous les types chargés
      for (const [loadedType, moves] of this.loadedTypes) {
        Object.entries(moves).forEach(([id, move]) => {
          if (this.matchesCriteria(move, criteria)) {
            results.push({ id, type: loadedType, ...move });
          }
        });
      }
    }

    return results;
  }

  /**
   * Vérifie si un move correspond aux critères
   */
  private matchesCriteria(move: Move, criteria: SearchCriteria): boolean {
    if (criteria.category && move.category !== criteria.category) return false;
    if (criteria.powerMin && move.power < criteria.powerMin) return false;
    if (criteria.powerMax && move.power > criteria.powerMax) return false;
    if (criteria.accuracy && move.accuracy < criteria.accuracy) return false;
    return true;
  }

  /**
   * Calcule les dégâts d'une attaque (exemple basique)
   */
  calculateDamage(
    move: Move, 
    attackerLevel: number, 
    attackerStat: number, 
    defenderStat: number,
    typeEffectiveness: number = 1.0
  ): number {
    if (move.category === 'Status' || move.power === 0) {
      return 0;
    }

    // Formule simplifiée inspirée de Pokémon
    const baseDamage = ((2 * attackerLevel + 10) / 250) * 
                      (attackerStat / defenderStat) * 
                      move.power + 2;
    
    return Math.floor(baseDamage * typeEffectiveness);
  }

  /**
   * Vérifie si une attaque peut toucher (basé sur accuracy)
   */
  doesMoveHit(move: Move, accuracy: number = 100): boolean {
    const hitChance = (move.accuracy * accuracy) / 100;
    return Math.random() * 100 < hitChance;
  }

  /**
   * Récupère les moves disponibles pour un Pokémon à un niveau donné
   */
  async getAvailableMovesForPokemon(
    pokemonMoves: Array<{moveId: string, level: number}>, 
    currentLevel: number
  ): Promise<Array<{moveId: string, move: Move, level: number}>> {
    const availableMoves: Array<{moveId: string, move: Move, level: number}> = [];
    
    for (const moveData of pokemonMoves) {
      if (moveData.level <= currentLevel) {
        try {
          const move = await this.getMove(moveData.moveId);
          availableMoves.push({
            moveId: moveData.moveId,
            move,
            level: moveData.level
          });
        } catch (error) {
          console.warn(`Move ${moveData.moveId} non trouvé:`, error);
        }
      }
    }
    
    return availableMoves.sort((a, b) => b.level - a.level);
  }

  /**
   * Données de test (fallback quand pas de fichiers JSON)
   */
  private async getMockMoveData(type: PokemonType): Promise<MoveData> {
    const mockData: Record<PokemonType, MoveData> = {
      'normal': {
        'tackle': {
          name: 'Tackle',
          category: 'Physical',
          power: 40,
          accuracy: 100,
          pp: 35,
          priority: 0,
          description: 'A physical attack in which the user charges and slams into the target.'
        },
        'quick_attack': {
          name: 'Quick Attack',
          category: 'Physical',
          power: 40,
          accuracy: 100,
          pp: 30,
          priority: 1,
          description: 'The user lunges at the target at a speed that makes it almost invisible.'
        }
      },
      'fire': {
        'ember': {
          name: 'Ember',
          category: 'Special',
          power: 40,
          accuracy: 100,
          pp: 25,
          priority: 0,
          description: 'The target is attacked with small flames.',
          effects: ['10% chance to burn']
        },
        'flamethrower': {
          name: 'Flamethrower',
          category: 'Special',
          power: 90,
          accuracy: 100,
          pp: 15,
          priority: 0,
          description: 'The target is scorched with an intense blast of fire.',
          effects: ['10% chance to burn']
        }
      },
      'electric': {
        'thunder_shock': {
          name: 'Thunder Shock',
          category: 'Special',
          power: 40,
          accuracy: 100,
          pp: 30,
          priority: 0,
          description: 'A jolt of electricity is hurled at the target.',
          effects: ['10% chance to paralyze']
        },
        'thunderbolt': {
          name: 'Thunderbolt',
          category: 'Special',
          power: 90,
          accuracy: 100,
          pp: 15,
          priority: 0,
          description: 'A strong electric blast is loosed at the target.',
          effects: ['10% chance to paralyze']
        }
      },
      // Autres types avec données minimales
      'water': {},
      'grass': {},
      'poison': {},
      'fighting': {},
      'ground': {},
      'flying': {},
      'psychic': {},
      'bug': {},
      'rock': {},
      'ghost': {},
      'dragon': {},
      'dark': {},
      'steel': {},
      'fairy': {},
      'ice': {}
    };

    return mockData[type] || {};
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): CacheStats {
    return {
      loadedTypes: Array.from(this.loadedTypes.keys()),
      totalMoves: Array.from(this.loadedTypes.values())
        .reduce((total, moves) => total + Object.keys(moves).length, 0),
      indexLoaded: this.indexLoaded,
      indexSize: this.moveIndex.size
    };
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.loadedTypes.clear();
    this.moveIndex.clear();
    this.indexLoaded = false;
    console.log('🗑️ Cache vidé');
  }
}

export default MoveManager;
