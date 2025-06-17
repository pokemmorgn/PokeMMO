/**
 * MoveManager - Gestionnaire des attaques Pokémon
 * Charge dynamiquement les moves par type depuis des fichiers JSON séparés
 */

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

  /**
   * Initialise le MoveManager avec des options
   */
  constructor(options: {
    basePath?: string;
    useDevFallback?: boolean;
    enableCache?: boolean;
  } = {}) {
    this.basePath = options.basePath || './data';
    this.useDevFallback = options.useDevFallback ?? (process.env.NODE_ENV === 'development');
    this.enableCache = options.enableCache ?? true;
  }

  private readonly basePath: string;
  private readonly useDevFallback: boolean;
  private readonly enableCache: boolean;

  private readonly availableTypes: PokemonType[] = [
    'normal', 'fire', 'water', 'electric', 'grass', 'poison',
    'fighting', 'ground', 'flying', 'psychic', 'bug', 'rock',
    'ghost', 'dragon', 'dark', 'steel', 'fairy', 'ice'
  ];

  /**
   * Charge l'index des moves (optionnel)
   * Permet de connaître le type d'un move sans deviner
   */
  async loadMoveIndex(): Promise<void> {
    if (this.indexLoaded) return;
    
    try {
      const response = await fetch(`${this.basePath}/moves-index.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const indexData: Record<string, string> = await response.json();
      
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
      const response = await fetch(`${this.basePath}/moves/${type}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const moveData: MoveData = await response.json();
      
      // Validation basique du format
      this.validateMoveData(moveData, type);
      
      if (this.enableCache) {
        this.loadedTypes.set(type, moveData);
      }
      
      console.log(`✅ Moves "${type}" chargés (${Object.keys(moveData).length} attaques)`);
      
      return moveData;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des moves ${type}:`, error);
      
      // Fallback: essaie de charger depuis les données de test
      if (this.useDevFallback) {
        console.log(`🔄 Tentative de fallback pour ${type}...`);
        return await this.loadFallbackMoveData(type);
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
   * Fallback pour le développement - charge des données de test
   */
  private async loadFallbackMoveData(type: PokemonType): Promise<MoveData> {
    console.log(`🚧 Mode développement: utilisation des données de test pour ${type}`);
    
    // Simule un délai réseau
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.getMockMoveData(type);
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
    
    return availableMoves.sort((a, b) => b.level - a.level); // Plus récent en premier
  }

  /**
   * Données de test pour simuler le chargement
   * Dans un vrai projet, ça serait un fetch() vers les fichiers JSON
   */
  private async getMockMoveData(type: PokemonType): Promise<MoveData> {
    // Simule un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 100));

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
        },
        'hyper_beam': {
          name: 'Hyper Beam',
          category: 'Special',
          power: 150,
          accuracy: 90,
          pp: 5,
          priority: 0,
          description: 'The target is attacked with a powerful beam. The user must rest on the next turn.',
          effects: ['must_recharge']
        },
        'growl': {
          name: 'Growl',
          category: 'Status',
          power: 0,
          accuracy: 100,
          pp: 40,
          priority: 0,
          description: 'The user growls in an endearing way, making opposing Pokémon less wary.',
          effects: ['lower_attack_1']
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
        },
        'fire_blast': {
          name: 'Fire Blast',
          category: 'Special',
          power: 110,
          accuracy: 85,
          pp: 5,
          priority: 0,
          description: 'The target is attacked with an intense blast of all-consuming fire.',
          effects: ['10% chance to burn']
        },
        'fire_punch': {
          name: 'Fire Punch',
          category: 'Physical',
          power: 75,
          accuracy: 100,
          pp: 15,
          priority: 0,
          description: 'The target is punched with a fiery fist.',
          effects: ['10% chance to burn']
        }
      },
      'water': {
        'water_gun': {
          name: 'Water Gun',
          category: 'Special',
          power: 40,
          accuracy: 100,
          pp: 25,
          priority: 0,
          description: 'The target is blasted with a forceful shot of water.'
        },
        'bubble': {
          name: 'Bubble',
          category: 'Special',
          power: 40,
          accuracy: 100,
          pp: 30,
          priority: 0,
          description: 'A spray of countless bubbles is jetted at the opposing team.',
          effects: ['10% chance to lower speed']
        },
        'surf': {
          name: 'Surf',
          category: 'Special',
          power: 90,
          accuracy: 100,
          pp: 15,
          priority: 0,
          description: 'It swamps the area around the user with a giant wave.'
        },
        'hydro_pump': {
          name: 'Hydro Pump',
          category: 'Special',
          power: 110,
          accuracy: 80,
          pp: 5,
          priority: 0,
          description: 'The target is blasted by a huge volume of water launched under great pressure.'
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
        },
        'thunder': {
          name: 'Thunder',
          category: 'Special',
          power: 110,
          accuracy: 70,
          pp: 10,
          priority: 0,
          description: 'A wicked thunderbolt is dropped on the target.',
          effects: ['30% chance to paralyze']
        },
        'thunder_wave': {
          name: 'Thunder Wave',
          category: 'Status',
          power: 0,
          accuracy: 90,
          pp: 20,
          priority: 0,
          description: 'A weak electric charge is launched at the target.',
          effects: ['paralyze']
        }
      },
      'grass': {
        'vine_whip': {
          name: 'Vine Whip',
          category: 'Physical',
          power: 45,
          accuracy: 100,
          pp: 25,
          priority: 0,
          description: 'The target is struck with slender, whiplike vines.'
        },
        'razor_leaf': {
          name: 'Razor Leaf',
          category: 'Physical',
          power: 55,
          accuracy: 95,
          pp: 25,
          priority: 0,
          description: 'Sharp-edged leaves are launched to slash at the opposing team.',
          effects: ['high critical hit ratio']
        },
        'solar_beam': {
          name: 'Solar Beam',
          category: 'Special',
          power: 120,
          accuracy: 100,
          pp: 10,
          priority: 0,
          description: 'A two-turn attack. The user gathers light, then blasts a bundled beam.',
          effects: ['charge_turn']
        },
        'sleep_powder': {
          name: 'Sleep Powder',
          category: 'Status',
          power: 0,
          accuracy: 75,
          pp: 15,
          priority: 0,
          description: 'The user scatters a big cloud of sleep-inducing dust.',
          effects: ['sleep']
        }
      },
      'poison': {
        'poison_sting': {
          name: 'Poison Sting',
          category: 'Physical',
          power: 15,
          accuracy: 100,
          pp: 35,
          priority: 0,
          description: 'The user stabs the target with a poisonous stinger.',
          effects: ['30% chance to poison']
        },
        'acid': {
          name: 'Acid',
          category: 'Special',
          power: 40,
          accuracy: 100,
          pp: 30,
          priority: 0,
          description: 'The opposing team is attacked with a spray of harsh acid.',
          effects: ['10% chance to lower special defense']
        },
        'sludge_bomb': {
          name: 'Sludge Bomb',
          category: 'Special',
          power: 90,
          accuracy: 100,
          pp: 10,
          priority: 0,
          description: 'Unsanitary sludge is hurled at the target.',
          effects: ['30% chance to poison']
        },
        'toxic': {
          name: 'Toxic',
          category: 'Status',
          power: 0,
          accuracy: 90,
          pp: 10,
          priority: 0,
          description: 'A move that leaves the target badly poisoned.',
          effects: ['badly_poison']
        }
      },
      // Types par défaut pour éviter les erreurs
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
   * Vide le cache (utile pour les tests ou la réinitialisation)
   */
  clearCache(): void {
    this.loadedTypes.clear();
    this.moveIndex.clear();
    this.indexLoaded = false;
    console.log('🗑️ Cache vidé');
  }
}

// Exemple d'utilisation
async function exempleUtilisation(): Promise<void> {
  // Configuration pour production
  const moveManager = new MoveManager({
    basePath: './data',
    useDevFallback: false,
    enableCache: true
  });

  // Configuration pour développement
  const devMoveManager = new MoveManager({
    basePath: './assets/data',
    useDevFallback: true,
    enableCache: true
  });
  
  try {
    // Précharger l'index (optionnel mais recommandé)
    await moveManager.loadMoveIndex();
    
    // Récupérer une attaque spécifique
    const tackle = await moveManager.getMove('tackle');
    console.log('Tackle:', tackle);
    
    // Récupérer plusieurs attaques
    const moves = await moveManager.getMoves(['thunderbolt', 'flamethrower', 'surf']);
    console.log('Moves chargés:', moves.length);
    
    // Précharger les types pour un combat
    await moveManager.preloadTypeMoves(['fire', 'water', 'electric']);
    
    // Rechercher des attaques puissantes
    const powerfulMoves = await moveManager.searchMoves({
      powerMin: 80,
      category: 'Special'
    });
    console.log('Attaques puissantes:', powerfulMoves);
    
    // Calculer des dégâts
    const flamethrower = await moveManager.getMove('flamethrower');
    const damage = moveManager.calculateDamage(flamethrower, 50, 100, 80, 1.5);
    console.log('Dégâts Flamethrower:', damage);
    
    // Statistiques
    console.log('Stats cache:', moveManager.getCacheStats());
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Export par défaut
export default MoveManager;

// Décommenter pour tester
// exempleUtilisation();
