// server/src/battle/utils/XpEventFormatter.ts
// 🌟 FORMATEUR ÉVÉNEMENTS XP POUR CLIENT

import { ExperienceResult, ExperienceGainContext } from '../../services/ExperienceService';

/**
 * Interface pour les données XP optimisées client
 */
export interface ClientXpEvent {
  eventType: 'pokemon_experience_gained';
  timestamp: number;
  
  // 📊 DONNÉES POKÉMON
  pokemon: {
    id: string;
    name: string;
    pokemonId?: number;
    combatId?: string;
  };
  
  // 🎯 DONNÉES XP PRINCIPALES  
  experience: {
    gained: number;
    before: number;
    after: number;
    source: string;
    context: string;
  };
  
  // 📈 DONNÉES PROGRESSION (pour animations)
  progression: {
    levelBefore: number;
    levelAfter: number;
    levelsGained: number;
    didLevelUp: boolean;
    
    // Détails par niveau pour animations fluides
    levelProgression: Array<{
      level: number;
      progressBefore: number; // 0.0 à 1.0
      progressAfter: number;  // 0.0 à 1.0
      expGainedThisLevel: number;
      duration: number; // ms pour animation
    }>;
    
    // État final pour barre de progression
    finalProgress: {
      level: number;
      currentExp: number;
      expToNext: number;
      progressPercent: number; // 0.0 à 1.0
    };
  };
  
  // 🌟 ÉVÉNEMENTS SPÉCIAUX
  specialEvents: {
    evolution: {
      triggered: boolean;
      fromPokemonId?: number;
      toPokemonId?: number;
      method?: string;
    };
    
    newMoves: Array<{
      moveId: string;
      moveName: string;
      learnedAtLevel: number;
      wasAutoLearned: boolean;
      replacedMove?: string;
    }>;
    
    statGains?: Record<string, number>;
    achievements: string[];
  };
  
  // 🎨 DONNÉES INTERFACE
  ui: {
    showExpBar: boolean;
    showLevelUpPopup: boolean;
    showStatGains: boolean;
    showNewMoves: boolean;
    
    // Durées d'animation suggérées
    animations: {
      expBarFill: number;
      levelUpFlash: number;
      statGainsPopup: number;
      movesLearned: number;
    };
    
    // Messages à afficher
    notifications: string[];
  };
  
  // 🔧 MÉTADONNÉES
  metadata: {
    battleId?: string;
    playerId?: string;
    processingTime: number;
    serverVersion: string;
  };
}

/**
 * XP EVENT FORMATTER - Convertit ExperienceResult en données client
 */
export class XpEventFormatter {
  
  private static readonly SERVER_VERSION = 'xp_v2.1';
  
  /**
   * 🎯 MÉTHODE PRINCIPALE : Formate les données XP pour le client
   */
  static formatExperienceGained(
    context: ExperienceGainContext,
    result: ExperienceResult,
    battleContext?: {
      battleId?: string;
      playerId?: string;
      combatId?: string;
    }
  ): ClientXpEvent {
    
    console.log('🎨 [XpEventFormatter] Formatage données XP pour client...');
    
    return {
      eventType: 'pokemon_experience_gained',
      timestamp: Date.now(),
      
      // 📊 DONNÉES POKÉMON
      pokemon: {
        id: result.pokemon.id,
        name: result.pokemon.name,
        pokemonId: this.extractPokemonId(result.pokemon.name),
        combatId: battleContext?.combatId
      },
      
      // 🎯 DONNÉES XP PRINCIPALES
      experience: {
        gained: result.pokemon.expGained,
        before: result.pokemon.beforeExp,
        after: result.pokemon.afterExp,
        source: context.source || 'unknown',
        context: this.generateContextMessage(context)
      },
      
      // 📈 DONNÉES PROGRESSION
      progression: this.calculateProgression(result),
      
      // 🌟 ÉVÉNEMENTS SPÉCIAUX
      specialEvents: {
        evolution: {
          triggered: result.hasEvolved || false,
          fromPokemonId: result.evolutionData?.fromPokemonId,
          toPokemonId: result.evolutionData?.toPokemonId,
          method: result.evolutionData?.evolutionMethod
        },
        
        newMoves: result.newMoves.map(move => ({
          moveId: move.moveId,
          moveName: move.moveName,
          learnedAtLevel: move.learnedAtLevel,
          wasAutoLearned: move.wasLearned,
          replacedMove: move.replacedMove
        })),
        
        statGains: result.statGains,
        achievements: result.achievements
      },
      
      // 🎨 DONNÉES INTERFACE
      ui: {
        showExpBar: result.pokemon.expGained > 0,
        showLevelUpPopup: result.leveledUp,
        showStatGains: result.leveledUp && !!result.statGains,
        showNewMoves: result.newMoves.length > 0,
        
        animations: this.calculateAnimationDurations(result),
        notifications: result.notifications
      },
      
      // 🔧 MÉTADONNÉES
      metadata: {
        battleId: battleContext?.battleId,
        playerId: battleContext?.playerId,
        processingTime: result.performance?.executionTime || 0,
        serverVersion: this.SERVER_VERSION
      }
    };
  }
  
  /**
   * 📈 Calcule la progression détaillée par niveau
   */
  private static calculateProgression(result: ExperienceResult): ClientXpEvent['progression'] {
    const { pokemon } = result;
    
    // Si pas de level up, progression simple
    if (!result.leveledUp) {
      const currentProgress = this.calculateLevelProgress(
        pokemon.afterLevel,
        pokemon.afterExp,
        pokemon.expToNextLevel
      );
      
      return {
        levelBefore: pokemon.beforeLevel,
        levelAfter: pokemon.afterLevel,
        levelsGained: 0,
        didLevelUp: false,
        levelProgression: [{
          level: pokemon.afterLevel,
          progressBefore: currentProgress.before,
          progressAfter: currentProgress.after,
          expGainedThisLevel: pokemon.expGained,
          duration: this.calculateExpBarDuration(pokemon.expGained)
        }],
        finalProgress: {
          level: pokemon.afterLevel,
          currentExp: pokemon.afterExp,
          expToNext: pokemon.expToNextLevel,
          progressPercent: currentProgress.after
        }
      };
    }
    
    // Si level up, calculer la progression par niveau
    const levelProgression = this.calculateMultiLevelProgression(pokemon);
    
    return {
      levelBefore: pokemon.beforeLevel,
      levelAfter: pokemon.afterLevel,
      levelsGained: result.levelsGained,
      didLevelUp: true,
      levelProgression,
      finalProgress: {
        level: pokemon.afterLevel,
        currentExp: pokemon.afterExp,
        expToNext: pokemon.expToNextLevel,
        progressPercent: this.calculateFinalProgress(pokemon.afterLevel, pokemon.afterExp, pokemon.expToNextLevel)
      }
    };
  }
  
  /**
   * 🔢 Calcule la progression multi-niveaux pour animations
   */
  private static calculateMultiLevelProgression(pokemon: any): Array<any> {
    const progression = [];
    let currentLevel = pokemon.beforeLevel;
    let remainingExp = pokemon.expGained;
    let currentExp = pokemon.beforeExp;
    
    while (currentLevel <= pokemon.afterLevel && remainingExp > 0) {
      const levelStartExp = this.expForLevel(currentLevel);
      const levelEndExp = this.expForLevel(currentLevel + 1);
      const levelExpNeeded = levelEndExp - levelStartExp;
      const levelCurrentProgress = currentExp - levelStartExp;
      
      const expToFillLevel = levelEndExp - currentExp;
      const expUsedThisLevel = Math.min(remainingExp, expToFillLevel);
      
      const progressBefore = Math.max(0, Math.min(1, levelCurrentProgress / levelExpNeeded));
      const progressAfter = Math.max(0, Math.min(1, (levelCurrentProgress + expUsedThisLevel) / levelExpNeeded));
      
      progression.push({
        level: currentLevel,
        progressBefore,
        progressAfter,
        expGainedThisLevel: expUsedThisLevel,
        duration: this.calculateExpBarDuration(expUsedThisLevel)
      });
      
      currentExp += expUsedThisLevel;
      remainingExp -= expUsedThisLevel;
      
      if (progressAfter >= 1.0) {
        currentLevel++;
      }
      
      if (currentLevel > pokemon.afterLevel) break;
    }
    
    return progression;
  }
  
  /**
   * 📊 Calcule la progression d'un niveau (avant/après)
   */
  private static calculateLevelProgress(level: number, currentExp: number, expToNext: number): {
    before: number;
    after: number;
  } {
    const levelStartExp = this.expForLevel(level);
    const levelEndExp = this.expForLevel(level + 1);
    const levelExpNeeded = levelEndExp - levelStartExp;
    const levelCurrentProgress = currentExp - levelStartExp;
    
    const progress = Math.max(0, Math.min(1, levelCurrentProgress / levelExpNeeded));
    
    // Pour le moment, before = after (pas de level up)
    return {
      before: progress,
      after: progress
    };
  }
  
  /**
   * 🧮 Formule d'expérience Medium Fast (comme Pokémon)
   */
  private static expForLevel(level: number): number {
    return Math.pow(level, 3);
  }
  
  /**
   * 🎬 Calcule les durées d'animation selon la complexité
   */
  private static calculateAnimationDurations(result: ExperienceResult): ClientXpEvent['ui']['animations'] {
    const baseExpBarDuration = this.calculateExpBarDuration(result.pokemon.expGained);
    
    return {
      expBarFill: baseExpBarDuration,
      levelUpFlash: result.leveledUp ? 800 : 0,
      statGainsPopup: result.leveledUp && result.statGains ? 2000 : 0,
      movesLearned: result.newMoves.length > 0 ? 1500 : 0
    };
  }
  
  /**
   * ⏱️ Calcule la durée de remplissage barre XP selon gain
   */
  private static calculateExpBarDuration(expGained: number): number {
    // Durée proportionnelle au gain d'XP (min 800ms, max 2000ms)
    const baseDuration = 800;
    const maxDuration = 2000;
    const expFactor = Math.min(1, expGained / 1000); // Normalise sur 1000 XP
    
    return Math.floor(baseDuration + (maxDuration - baseDuration) * expFactor);
  }
  
  /**
   * 📝 Génère le message de contexte selon la source
   */
  private static generateContextMessage(context: ExperienceGainContext): string {
    switch (context.source) {
      case 'wild_battle':
        if (context.defeatedPokemon) {
          return `Victoire contre Pokémon niveau ${context.defeatedPokemon.level}`;
        }
        return 'Victoire en combat sauvage';
      
      case 'trainer_battle':
        if (context.defeatedPokemon && context.defeatedPokemon.trainerLevel) {
          return `Victoire contre dresseur niveau ${context.defeatedPokemon.trainerLevel}`;
        }
        return 'Victoire en combat dresseur';
      
      case 'rare_candy':
        return 'Utilisation Bonbon Rare';
      
      case 'special_event':
        return 'Événement spécial';
      
      default:
        return 'Gain d\'expérience';
    }
  }
  
  /**
   * 🔍 Extrait l'ID Pokémon du nom (si possible)
   */
  private static extractPokemonId(pokemonName: string): number | undefined {
    // Essaie d'extraire l'ID du nom (ex: "Pokemon #25" → 25)
    const match = pokemonName.match(/#(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }
  
  /**
   * 📈 Calcule le pourcentage final de progression
   */
  private static calculateFinalProgress(level: number, currentExp: number, expToNext: number): number {
    const levelStartExp = this.expForLevel(level);
    const levelEndExp = this.expForLevel(level + 1);
    const levelExpNeeded = levelEndExp - levelStartExp;
    const levelCurrentProgress = currentExp - levelStartExp;
    
    return Math.max(0, Math.min(1, levelCurrentProgress / levelExpNeeded));
  }
  
  /**
   * 📊 Méthode utilitaire pour debug
   */
  static debugFormatResult(clientEvent: ClientXpEvent): void {
    console.log('🎯 [XpEventFormatter] ÉVÉNEMENT CLIENT FORMATÉ:');
    console.log(`  Pokemon: ${clientEvent.pokemon.name} (${clientEvent.pokemon.id})`);
    console.log(`  XP: +${clientEvent.experience.gained} (${clientEvent.experience.before} → ${clientEvent.experience.after})`);
    console.log(`  Niveaux: ${clientEvent.progression.levelBefore} → ${clientEvent.progression.levelAfter} (+${clientEvent.progression.levelsGained})`);
    console.log(`  Événements: Evolution=${clientEvent.specialEvents.evolution.triggered}, Sorts=${clientEvent.specialEvents.newMoves.length}`);
    console.log(`  UI: ExpBar=${clientEvent.ui.showExpBar}, LevelUp=${clientEvent.ui.showLevelUpPopup}`);
  }
}

export default XpEventFormatter;
