// server/src/battle/modules/BallManager.ts
// MODULE SÉPARÉ - Gestion des effets de Balls Gen 5

import { Pokemon } from '../types/BattleTypes';
import { OwnedPokemon } from '../../models/OwnedPokemon';

// === INTERFACES ===

export interface BallEffect {
  multiplier: number;
  description: string;
  condition: string;
  triggered: boolean;
}

export interface BallValidation {
  isValid: boolean;
  displayName: string;
  description?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface BattleContext {
  turnNumber?: number;
  timeOfDay?: 'day' | 'night';
  environment?: 'cave' | 'water' | 'grass' | 'building';
  playerTeam?: any[];
  playerPokedex?: number[];
}

/**
 * BALL MANAGER - Module spécialisé pour les effets de Balls
 * 
 * Responsabilités :
 * - Calcul des multiplicateurs selon Ball
 * - Validation des Balls disponibles
 * - Effets situationnels Gen 5
 * - Intégration avec données système
 */
export class BallManager {
  
  private battleContext: BattleContext = {};
  
  constructor() {
    console.log('🎾 [BallManager] Module initialisé');
  }
  
  // === CONFIGURATION ===
  
  /**
   * Configure le contexte de combat pour les effets situationnels
   */
  setBattleContext(context: BattleContext): void {
    this.battleContext = { ...this.battleContext, ...context };
    console.log('⚙️ [BallManager] Contexte mis à jour:', context);
  }
  
  /**
   * Met à jour le compteur de tours (pour Timer Ball)
   */
  updateTurnNumber(turnNumber: number): void {
    this.battleContext.turnNumber = turnNumber;
  }
  
  // === API PRINCIPALE ===
  
  /**
   * Calcule l'effet complet d'une Ball sur un Pokémon
   */
  calculateBallEffect(ballType: string, pokemon: Pokemon, playerName?: string): BallEffect {
    // Validation de base
    const validation = this.validateBall(ballType);
    if (!validation.isValid) {
      return {
        multiplier: 1.0,
        description: `Ball invalide: ${ballType}`,
        condition: 'Erreur',
        triggered: false
      };
    }
    
    // Calcul du multiplicateur selon le type
    const effect = this.calculateSpecificBallEffect(ballType, pokemon, playerName);
    
    console.log(`🎾 [BallManager] ${validation.displayName} vs ${pokemon.name}:`, {
      multiplier: effect.multiplier,
      condition: effect.condition,
      triggered: effect.triggered
    });
    
    return effect;
  }
  
  // === EFFETS SPÉCIFIQUES PAR BALL ===
  
  private calculateSpecificBallEffect(ballType: string, pokemon: Pokemon, playerName?: string): BallEffect {
    switch (ballType) {
      // === BALLS STANDARDS ===
      case 'poke_ball':
        return { multiplier: 1.0, description: 'Ball standard', condition: 'Toujours', triggered: true };
      
      case 'great_ball':
        return { multiplier: 1.5, description: 'Ball améliorée', condition: 'Toujours', triggered: true };
      
      case 'ultra_ball':
        return { multiplier: 2.0, description: 'Ball haute performance', condition: 'Toujours', triggered: true };
      
      case 'master_ball':
        return { multiplier: 255.0, description: 'Capture garantie', condition: 'Toujours', triggered: true };
      
      // === BALLS SITUATIONNELLES ===
      case 'timer_ball':
        return this.calculateTimerBallEffect();
      
      case 'quick_ball':
        return this.calculateQuickBallEffect(pokemon);
      
      case 'dusk_ball':
        return this.calculateDuskBallEffect(pokemon);
      
      case 'repeat_ball':
        return this.calculateRepeatBallEffect(pokemon, playerName);
      
      case 'net_ball':
        return this.calculateNetBallEffect(pokemon);
      
      case 'dive_ball':
        return this.calculateDiveBallEffect(pokemon);
      
      case 'nest_ball':
        return this.calculateNestBallEffect(pokemon);
      
      // === BALLS APRICORN ===
      case 'love_ball':
        return this.calculateLoveBallEffect(pokemon);
      
      case 'level_ball':
        return this.calculateLevelBallEffect(pokemon);
      
      case 'lure_ball':
        return this.calculateLureBallEffect(pokemon);
      
      case 'moon_ball':
        return this.calculateMoonBallEffect(pokemon);
      
      case 'fast_ball':
        return this.calculateFastBallEffect(pokemon);
      
      case 'heavy_ball':
        return this.calculateHeavyBallEffect(pokemon);
      
      case 'friend_ball':
        return { multiplier: 1.0, description: 'Augmente amitié', condition: 'Toujours', triggered: true };
      
      // === BALLS SPÉCIALES ===
      case 'heal_ball':
        return { multiplier: 1.0, description: 'Soigne après capture', condition: 'Toujours', triggered: true };
      
      case 'luxury_ball':
        return { multiplier: 1.0, description: 'Augmente amitié rapidement', condition: 'Toujours', triggered: true };
      
      case 'premier_ball':
        return { multiplier: 1.0, description: 'Ball commémorative', condition: 'Toujours', triggered: true };
      
      case 'safari_ball':
        return { multiplier: 1.5, description: 'Ball Safari', condition: 'Zone Safari', triggered: true };
      
      case 'sport_ball':
        return { multiplier: 1.5, description: 'Ball Concours', condition: 'Concours Capture', triggered: true };
      
      // === BALLS RARES ===
      case 'park_ball':
        return { multiplier: 255.0, description: 'Capture garantie Parc', condition: 'Parc National', triggered: true };
      
      case 'dream_ball':
        return { multiplier: 1.0, description: 'Monde des Rêves', condition: 'Pokémon endormi', triggered: pokemon.status === 'sleep' };
      
      // === DEFAULT ===
      default:
        return { multiplier: 1.0, description: 'Effet inconnu', condition: 'N/A', triggered: false };
    }
  }
  
  // === EFFETS COMPLEXES ===
  
  private calculateTimerBallEffect(): BallEffect {
    const turns = this.battleContext.turnNumber || 1;
    let multiplier = 1.0;
    let description = '';
    
    if (turns === 1) {
      multiplier = 1.0;
      description = 'Premier tour';
    } else if (turns <= 3) {
      multiplier = 1.5;
      description = `Tours 2-3 (actuellement: ${turns})`;
    } else if (turns <= 5) {
      multiplier = 2.0;
      description = `Tours 4-5 (actuellement: ${turns})`;
    } else if (turns <= 10) {
      multiplier = 3.0;
      description = `Tours 6-10 (actuellement: ${turns})`;
    } else {
      multiplier = 4.0;
      description = `Tours 11+ (actuellement: ${turns})`;
    }
    
    return {
      multiplier,
      description: `Efficacité progressive: ${description}`,
      condition: `Tour ${turns}`,
      triggered: turns > 1
    };
  }
  
  private calculateQuickBallEffect(pokemon: Pokemon): BallEffect {
    // Premier tour = HP max + pas de statut
    const isFirstTurn = (pokemon.currentHp === pokemon.maxHp && 
                        (!pokemon.status || pokemon.status === 'normal'));
    
    return {
      multiplier: isFirstTurn ? 5.0 : 1.0,
      description: isFirstTurn ? 'Bonus premier tour' : 'Pas premier tour',
      condition: 'Premier tour de combat',
      triggered: isFirstTurn
    };
  }
  
  private calculateDuskBallEffect(pokemon: Pokemon): BallEffect {
    // Environnement sombre = types associés aux grottes/nuit
    const darkTypes = ['dark', 'ghost', 'rock', 'ground'];
    const isDarkEnvironment = pokemon.types.some(type => darkTypes.includes(type)) ||
                             this.battleContext.timeOfDay === 'night' ||
                             this.battleContext.environment === 'cave';
    
    return {
      multiplier: isDarkEnvironment ? 3.0 : 1.0,
      description: isDarkEnvironment ? 'Environnement sombre détecté' : 'Environnement clair',
      condition: 'Nuit ou grotte',
      triggered: isDarkEnvironment
    };
  }
  
  private calculateRepeatBallEffect(pokemon: Pokemon, playerName?: string): BallEffect {
    // TODO: Vérifier vraie Pokédex quand disponible
    const pokemonId = pokemon.id;
    const alreadyCaught = this.battleContext.playerPokedex?.includes(pokemonId) ?? 
                         (Math.random() < 0.3); // Simulation 30%
    
    return {
      multiplier: alreadyCaught ? 3.0 : 1.0,
      description: alreadyCaught ? 'Espèce déjà capturée' : 'Nouvelle espèce',
      condition: 'Pokémon déjà en Pokédex',
      triggered: alreadyCaught
    };
  }
  
  private calculateNetBallEffect(pokemon: Pokemon): BallEffect {
    const targetTypes = ['bug', 'water'];
    const isEffective = pokemon.types.some(type => targetTypes.includes(type));
    
    return {
      multiplier: isEffective ? 3.0 : 1.0,
      description: isEffective ? `Type ${pokemon.types.join('/')} ciblé` : 'Type non ciblé',
      condition: 'Pokémon Bug ou Water',
      triggered: isEffective
    };
  }
  
  private calculateDiveBallEffect(pokemon: Pokemon): BallEffect {
    const isWaterType = pokemon.types.includes('water') ||
                       this.battleContext.environment === 'water';
    
    return {
      multiplier: isWaterType ? 3.5 : 1.0,
      description: isWaterType ? 'Pokémon aquatique' : 'Pokémon terrestre',
      condition: 'Sous l\'eau ou type Water',
      triggered: isWaterType
    };
  }
  
  private calculateNestBallEffect(pokemon: Pokemon): BallEffect {
    const level = pokemon.level;
    let multiplier = 1.0;
    
    if (level <= 29) {
      multiplier = Math.max(1.0, (41 - level) / 10);
    }
    
    return {
      multiplier,
      description: `Pokémon niveau ${level}`,
      condition: 'Niveau ≤ 29',
      triggered: level <= 29
    };
  }
  
  private calculateLoveBallEffect(pokemon: Pokemon): BallEffect {
    // TODO: Vérifier vraie équipe quand disponible
    const hasOppositeGender = this.battleContext.playerTeam?.some(teamMember => 
      teamMember.pokemonId === pokemon.id && 
      teamMember.gender !== pokemon.gender
    ) ?? (Math.random() < 0.15); // Simulation 15%
    
    return {
      multiplier: hasOppositeGender ? 8.0 : 1.0,
      description: hasOppositeGender ? 'Genre opposé dans équipe' : 'Pas de correspondance',
      condition: 'Même espèce genre opposé dans équipe',
      triggered: hasOppositeGender
    };
  }
  
  private calculateLevelBallEffect(pokemon: Pokemon): BallEffect {
    // TODO: Utiliser vrai niveau équipe quand disponible
    const playerLevel = this.battleContext.playerTeam?.[0]?.level || 25; // Simulation
    const levelDiff = playerLevel - pokemon.level;
    
    let multiplier = 1.0;
    let description = '';
    
    if (levelDiff >= 20) {
      multiplier = 8.0;
      description = '20+ niveaux d\'avance';
    } else if (levelDiff >= 10) {
      multiplier = 4.0;
      description = '10-19 niveaux d\'avance';
    } else if (levelDiff >= 5) {
      multiplier = 2.0;
      description = '5-9 niveaux d\'avance';
    } else {
      description = 'Pas assez d\'avance';
    }
    
    return {
      multiplier,
      description: `${description} (${playerLevel} vs ${pokemon.level})`,
      condition: 'Niveau joueur > niveau cible',
      triggered: multiplier > 1.0
    };
  }
  
  private calculateLureBallEffect(pokemon: Pokemon): BallEffect {
    const isFished = pokemon.types.includes('water') ||
                    this.battleContext.environment === 'water';
    
    return {
      multiplier: isFished ? 3.0 : 1.0,
      description: isFished ? 'Pokémon pêché' : 'Pokémon non pêché',
      condition: 'Pokémon obtenu par pêche',
      triggered: isFished
    };
  }
  
  private calculateMoonBallEffect(pokemon: Pokemon): BallEffect {
    // Pokémon évoluant avec Pierre Lune (simulé avec type Fairy)
    const moonStoneEvolution = pokemon.types.includes('fairy');
    
    return {
      multiplier: moonStoneEvolution ? 4.0 : 1.0,
      description: moonStoneEvolution ? 'Évolution Pierre Lune' : 'Autre évolution',
      condition: 'Pokémon évoluant avec Pierre Lune',
      triggered: moonStoneEvolution
    };
  }
  
  private calculateFastBallEffect(pokemon: Pokemon): BallEffect {
    const isVeryFast = pokemon.speed > 100;
    
    return {
      multiplier: isVeryFast ? 4.0 : 1.0,
      description: `Vitesse ${pokemon.speed} ${isVeryFast ? '(très rapide)' : '(normale)'}`,
      condition: 'Vitesse > 100',
      triggered: isVeryFast
    };
  }
  
  private calculateHeavyBallEffect(pokemon: Pokemon): BallEffect {
    // Simulation poids basée sur HP (Pokémon HP élevé = lourd)
    const estimatedWeight = pokemon.maxHp * 2;
    let multiplier = 1.0;
    let description = '';
    
    if (estimatedWeight >= 400) {
      multiplier = 1.3;
      description = 'très lourd';
    } else if (estimatedWeight >= 300) {
      multiplier = 1.2;
      description = 'lourd';
    } else if (estimatedWeight >= 200) {
      multiplier = 1.0;
      description = 'poids normal';
    } else if (estimatedWeight >= 100) {
      multiplier = 0.9;
      description = 'léger';
    } else {
      multiplier = 0.5;
      description = 'très léger';
    }
    
    return {
      multiplier,
      description: `Poids estimé ${estimatedWeight}kg (${description})`,
      condition: 'Efficace sur Pokémon lourds',
      triggered: multiplier >= 1.0
    };
  }
  
  // === VALIDATION ===
  
  /**
   * Valide une Ball et retourne ses informations
   */
  validateBall(ballType: string): BallValidation {
    const ballData = this.getBallData(ballType);
    
    return {
      isValid: ballData !== null,
      displayName: ballData?.displayName || ballType,
      description: ballData?.description,
      rarity: ballData?.rarity
    };
  }
  
  /**
   * Obtient les données complètes d'une Ball
   */
  private getBallData(ballType: string) {
    const ballDatabase: Record<string, any> = {
      // Standards
      'poke_ball': { displayName: 'Poké Ball', description: 'Ball de base', rarity: 'common' },
      'great_ball': { displayName: 'Super Ball', description: 'Ball améliorée', rarity: 'common' },
      'ultra_ball': { displayName: 'Hyper Ball', description: 'Ball haute performance', rarity: 'uncommon' },
      'master_ball': { displayName: 'Master Ball', description: 'Ball ultime', rarity: 'legendary' },
      
      // Situationnelles
      'timer_ball': { displayName: 'Chrono Ball', description: 'Plus efficace avec le temps', rarity: 'uncommon' },
      'quick_ball': { displayName: 'Rapide Ball', description: 'Très efficace au début', rarity: 'uncommon' },
      'dusk_ball': { displayName: 'Sombre Ball', description: 'Efficace la nuit/grottes', rarity: 'uncommon' },
      'repeat_ball': { displayName: 'Bis Ball', description: 'Efficace sur Pokémon connus', rarity: 'uncommon' },
      'net_ball': { displayName: 'Filet Ball', description: 'Efficace sur Bug/Water', rarity: 'uncommon' },
      'dive_ball': { displayName: 'Scaphandre Ball', description: 'Efficace sous l\'eau', rarity: 'uncommon' },
      'nest_ball': { displayName: 'Nid Ball', description: 'Efficace sur Pokémon faibles', rarity: 'uncommon' },
      
      // Apricorn
      'love_ball': { displayName: 'Love Ball', description: 'Efficace sur genre opposé', rarity: 'rare' },
      'level_ball': { displayName: 'Niveau Ball', description: 'Efficace si niveau supérieur', rarity: 'rare' },
      'lure_ball': { displayName: 'Appât Ball', description: 'Efficace sur Pokémon pêchés', rarity: 'rare' },
      'moon_ball': { displayName: 'Lune Ball', description: 'Efficace avec Pierre Lune', rarity: 'rare' },
      'fast_ball': { displayName: 'Speed Ball', description: 'Efficace sur Pokémon rapides', rarity: 'rare' },
      'heavy_ball': { displayName: 'Masse Ball', description: 'Efficace sur Pokémon lourds', rarity: 'rare' },
      'friend_ball': { displayName: 'Copain Ball', description: 'Augmente l\'amitié', rarity: 'rare' },
      
      // Spéciales
      'heal_ball': { displayName: 'Soin Ball', description: 'Soigne après capture', rarity: 'uncommon' },
      'luxury_ball': { displayName: 'Luxe Ball', description: 'Amitié rapide', rarity: 'uncommon' },
      'premier_ball': { displayName: 'Première Ball', description: 'Ball commémorative', rarity: 'uncommon' },
      'safari_ball': { displayName: 'Safari Ball', description: 'Ball spéciale Safari', rarity: 'rare' },
      'sport_ball': { displayName: 'Compét Ball', description: 'Ball de concours', rarity: 'rare' },
      'park_ball': { displayName: 'Parc Ball', description: 'Ball spéciale Parc', rarity: 'legendary' },
      'dream_ball': { displayName: 'Rêve Ball', description: 'Ball du Monde des Rêves', rarity: 'legendary' }
    };
    
    return ballDatabase[ballType] || null;
  }
  
  // === UTILITAIRES ===
  
  /**
   * Obtient la liste de toutes les Balls disponibles
   */
  getAllBalls(): string[] {
    return [
      'poke_ball', 'great_ball', 'ultra_ball', 'master_ball',
      'timer_ball', 'quick_ball', 'dusk_ball', 'repeat_ball',
      'net_ball', 'dive_ball', 'nest_ball',
      'love_ball', 'level_ball', 'lure_ball', 'moon_ball',
      'fast_ball', 'heavy_ball', 'friend_ball',
      'heal_ball', 'luxury_ball', 'premier_ball',
      'safari_ball', 'sport_ball', 'park_ball', 'dream_ball'
    ];
  }
  
  /**
   * Obtient les Balls par rareté
   */
  getBallsByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'legendary'): string[] {
    return this.getAllBalls().filter(ballType => {
      const data = this.getBallData(ballType);
      return data?.rarity === rarity;
    });
  }
  
  /**
   * Diagnostique des effets
   */
  getDiagnostics(): any {
    return {
      version: 'ball_manager_v1',
      totalBalls: this.getAllBalls().length,
      ballsByRarity: {
        common: this.getBallsByRarity('common').length,
        uncommon: this.getBallsByRarity('uncommon').length,
        rare: this.getBallsByRarity('rare').length,
        legendary: this.getBallsByRarity('legendary').length
      },
      battleContext: this.battleContext,
      features: [
        'situational_effects',
        'battle_context_integration', 
        'progressive_timer_ball',
        'first_turn_quick_ball',
        'environment_detection',
        'team_integration_ready',
        'pokedex_integration_ready'
      ]
    };
  }
  
  /**
   * Reset pour nouveau combat
   */
  reset(): void {
    this.battleContext = {};
    console.log('🔄 [BallManager] Reset effectué');
  }
}

export default BallManager;
