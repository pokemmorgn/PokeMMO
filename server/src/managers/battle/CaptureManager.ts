// server/src/managers/battle/CaptureManager.ts
// Gestionnaire spécialisé pour les captures de Pokémon

import { BattlePokemon } from "../../schema/BattleState";
import { getPokemonById } from "../../data/PokemonData";

export interface CaptureAttempt {
  pokemonId: number;
  pokemonLevel: number;
  currentHp: number;
  maxHp: number;
  statusCondition: string;
  ballType: string;
  location: string;
}

export interface CaptureResult {
  success: boolean;
  criticalCapture: boolean;
  shakeCount: number;
  finalRate: number;
  captureRate: number;
  ballBonus: number;
  statusBonus: number;
  hpBonus: number;
}

export interface CaptureAnimation {
  phase: 'throw' | 'hit' | 'shake' | 'success' | 'break';
  shakeNumber?: number;
  totalShakes?: number;
  delay: number;
  message: string;
  sound?: string;
}

/**
 * GESTIONNAIRE DE CAPTURES POKÉMON
 * 
 * Responsabilités :
 * - Calcul des taux de capture
 * - Gestion des animations séquentielles
 * - Messages de capture immersifs
 * - Intégration avec l'équipe/PC du joueur
 */
export class CaptureManager {
  
  // Configuration des Pokéballs
  private static readonly BALL_DATA = {
    'pokeball': { 
      multiplier: 1.0, 
      name: 'Poké Ball',
      criticalRate: 0.0,
      specialCondition: null
    },
    'greatball': { 
      multiplier: 1.5, 
      name: 'Super Ball',
      criticalRate: 0.0,
      specialCondition: null
    },
    'ultraball': { 
      multiplier: 2.0, 
      name: 'Hyper Ball',
      criticalRate: 0.0,
      specialCondition: null
    },
    'masterball': { 
      multiplier: 255.0, 
      name: 'Master Ball',
      criticalRate: 0.0,
      specialCondition: 'always_capture'
    },
    'quickball': { 
      multiplier: 5.0, 
      name: 'Rapide Ball',
      criticalRate: 0.0,
      specialCondition: 'first_turn_only'
    },
    'timerball': { 
      multiplier: 1.0, 
      name: 'Chrono Ball',
      criticalRate: 0.0,
      specialCondition: 'turn_based'
    },
    'duskball': { 
      multiplier: 3.5, 
      name: 'Sombre Ball',
      criticalRate: 0.0,
      specialCondition: 'night_or_cave'
    },
    'healball': { 
      multiplier: 1.0, 
      name: 'Soin Ball',
      criticalRate: 0.0,
      specialCondition: 'heal_after_capture'
    },
    'luxuryball': { 
      multiplier: 1.0, 
      name: 'Luxe Ball',
      criticalRate: 0.0,
      specialCondition: 'friendship_bonus'
    },
    'premierball': { 
      multiplier: 1.0, 
      name: 'Honor Ball',
      criticalRate: 0.0,
      specialCondition: 'cosmetic_only'
    }
  };

  // Modificateurs de statut
  private static readonly STATUS_MODIFIERS = {
    'normal': 1.0,
    'sleep': 2.5,
    'freeze': 2.5,
    'paralysis': 1.5,
    'burn': 1.5,
    'poison': 1.5,
    'badly_poison': 1.5,
    'confusion': 1.0,
    'flinch': 1.0
  };

  // Messages de capture
  private static readonly CAPTURE_MESSAGES = {
    throw: (trainerName: string, ballName: string) => 
      `${trainerName} lance une ${ballName} !`,
    hit: "Boink !",
    shake: "*Tic*",
    shakeMultiple: (shakeNum: number, total: number) => 
      `*Tic* (${shakeNum}/${total})`,
    success: (pokemonName: string) => 
      `Gotcha ! ${pokemonName} a été capturé !`,
    criticalSuccess: (pokemonName: string) => 
      `Capture critique ! ${pokemonName} a été capturé !`,
    break: (pokemonName: string) => 
      `Oh non ! ${pokemonName} s'est échappé !`,
    almostHad: "Zut ! Il était presque capturé !",
    soClose: "Argh ! Presque !"
  };

  /**
   * ✅ MÉTHODE PRINCIPALE : Calcule le résultat d'une tentative de capture
   */
  static calculateCaptureResult(
    attempt: CaptureAttempt, 
    pokemonData: any,
    battleContext?: {
      turnNumber?: number;
      timeOfDay?: 'day' | 'night';
      location?: string;
      isFirstCapture?: boolean;
    }
  ): CaptureResult {
    console.log(`🎯 [CaptureManager] === CALCUL CAPTURE ===`);
    console.log(`🎯 Pokémon: ${pokemonData.name} Niv.${attempt.pokemonLevel}`);
    console.log(`🎯 Ball: ${attempt.ballType}`);
    console.log(`🎯 HP: ${attempt.currentHp}/${attempt.maxHp} (${((attempt.currentHp/attempt.maxHp)*100).toFixed(1)}%)`);
    console.log(`🎯 Statut: ${attempt.statusCondition}`);

    // 1. Obtenir les données de base
    const ballData = this.BALL_DATA[attempt.ballType as keyof typeof this.BALL_DATA] || this.BALL_DATA.pokeball;
    const baseCaptureRate = pokemonData.captureRate || 45; // Défaut si non spécifié
    
    // 2. Master Ball = capture garantie
    if (ballData.specialCondition === 'always_capture') {
      console.log(`🎯 [CaptureManager] Master Ball - Capture garantie !`);
      return {
        success: true,
        criticalCapture: false,
        shakeCount: 0,
        finalRate: 255,
        captureRate: baseCaptureRate,
        ballBonus: 255,
        statusBonus: 1,
        hpBonus: 1
      };
    }

    // 3. Calcul du modificateur de ball
    let ballBonus = ballData.multiplier;
    
    // Conditions spéciales des balls
    if (ballData.specialCondition && battleContext) {
      ballBonus = this.applySpecialBallConditions(ballData, ballBonus, battleContext);
    }

    // 4. Calcul du modificateur HP
    const hpRatio = attempt.currentHp / attempt.maxHp;
    const hpBonus = (3 * attempt.maxHp - 2 * attempt.currentHp) / (3 * attempt.maxHp);

    // 5. Calcul du modificateur de statut
    const statusBonus = this.STATUS_MODIFIERS[attempt.statusCondition as keyof typeof this.STATUS_MODIFIERS] || 1.0;

    // 6. Calcul final (formule Pokémon officielle simplifiée)
    let finalRate = ((3 * attempt.maxHp - 2 * attempt.currentHp) * baseCaptureRate * ballBonus * statusBonus) / (3 * attempt.maxHp);
    
    // Limiter entre 1 et 255
    finalRate = Math.max(1, Math.min(255, finalRate));

    // 7. Test de capture critique (très rare)
    const criticalCapture = Math.random() < 0.01; // 1% de chance

    // 8. Calcul du nombre de secousses
    let shakeCount = 0;
    let success = false;

    if (criticalCapture) {
      // Capture critique = un seul test
      success = Math.random() * 255 < finalRate;
      shakeCount = success ? 1 : 0;
    } else {
      // Capture normale = jusqu'à 4 secousses
      for (let i = 0; i < 4; i++) {
        if (Math.random() * 255 < finalRate) {
          shakeCount++;
        } else {
          break;
        }
      }
      success = shakeCount === 4;
    }

    const result: CaptureResult = {
      success,
      criticalCapture,
      shakeCount,
      finalRate,
      captureRate: baseCaptureRate,
      ballBonus,
      statusBonus,
      hpBonus
    };

    console.log(`🎯 [CaptureManager] Résultat:`, {
      success: result.success,
      criticalCapture: result.criticalCapture,
      shakeCount: result.shakeCount,
      finalRate: Math.round(result.finalRate),
      probability: `${((result.finalRate / 255) * 100).toFixed(1)}%`
    });

    return result;
  }

  /**
   * ✅ Applique les conditions spéciales des Pokéballs
   */
  private static applySpecialBallConditions(
    ballData: any,
    baseBonus: number,
    context: any
  ): number {
    switch (ballData.specialCondition) {
      case 'first_turn_only':
        // Quick Ball : 5x au premier tour, 1x après
        return (context.turnNumber || 1) === 1 ? 5.0 : 1.0;
        
      case 'turn_based':
        // Timer Ball : plus efficace avec le temps
        const turnBonus = Math.min(4, Math.floor((context.turnNumber || 1) / 10));
        return 1.0 + turnBonus;
        
      case 'night_or_cave':
        // Dusk Ball : 3.5x la nuit ou dans une grotte
        return (context.timeOfDay === 'night' || context.location?.includes('cave')) ? 3.5 : 1.0;
        
      default:
        return baseBonus;
    }
  }

  /**
   * ✅ MÉTHODE PRINCIPALE : Génère la séquence d'animations de capture
   */
  static generateCaptureAnimation(
    result: CaptureResult,
    pokemonName: string,
    trainerName: string,
    ballType: string
  ): CaptureAnimation[] {
    const animations: CaptureAnimation[] = [];
    const ballData = this.BALL_DATA[ballType as keyof typeof this.BALL_DATA] || this.BALL_DATA.pokeball;

    // 1. Lancer de ball
    animations.push({
      phase: 'throw',
      delay: 0,
      message: this.CAPTURE_MESSAGES.throw(trainerName, ballData.name),
      sound: 'ball_throw'
    });

    // 2. Ball touche le Pokémon
    animations.push({
      phase: 'hit',
      delay: 1000,
      message: this.CAPTURE_MESSAGES.hit,
      sound: 'ball_hit'
    });

    // 3. Secousses (si pas de capture critique)
    if (!result.criticalCapture) {
      for (let i = 0; i < Math.max(1, result.shakeCount); i++) {
        animations.push({
          phase: 'shake',
          shakeNumber: i + 1,
          totalShakes: Math.max(4, result.shakeCount),
          delay: 2000 + (i * 1200),
          message: result.shakeCount > 1 
            ? this.CAPTURE_MESSAGES.shakeMultiple(i + 1, Math.max(4, result.shakeCount))
            : this.CAPTURE_MESSAGES.shake,
          sound: 'ball_shake'
        });
      }
    }

    // 4. Résultat final
    if (result.success) {
      animations.push({
        phase: 'success',
        delay: result.criticalCapture ? 2500 : (2500 + result.shakeCount * 1200),
        message: result.criticalCapture 
          ? this.CAPTURE_MESSAGES.criticalSuccess(pokemonName)
          : this.CAPTURE_MESSAGES.success(pokemonName),
        sound: result.criticalCapture ? 'capture_critical' : 'capture_success'
      });
    } else {
      // Messages différents selon le nombre de secousses
      let breakMessage = this.CAPTURE_MESSAGES.break(pokemonName);
      if (result.shakeCount === 3) {
        breakMessage = this.CAPTURE_MESSAGES.almostHad;
      } else if (result.shakeCount === 2) {
        breakMessage = this.CAPTURE_MESSAGES.soClose;
      }

      animations.push({
        phase: 'break',
        delay: 2500 + result.shakeCount * 1200,
        message: breakMessage,
        sound: 'ball_break'
      });
    }

    console.log(`🎬 [CaptureManager] Animation générée: ${animations.length} phases`);
    return animations;
  }

  /**
   * ✅ Traite une tentative de capture complète
   */
  static async processCaptureAttempt(
    attempt: CaptureAttempt,
    pokemonName: string,
    trainerName: string,
    battleContext?: any,
    callbacks?: {
      onAnimationStep?: (animation: CaptureAnimation) => void;
      onCaptureSuccess?: (pokemonData: any) => void;
      onCaptureFailed?: () => void;
      onMessage?: (message: string) => void;
    }
  ): Promise<CaptureResult> {
    console.log(`🎯 [CaptureManager] === TRAITEMENT CAPTURE COMPLÈTE ===`);

    try {
      // 1. Obtenir les données du Pokémon
      const pokemonData = await getPokemonById(attempt.pokemonId);
      if (!pokemonData) {
        throw new Error(`Pokémon ${attempt.pokemonId} non trouvé`);
      }

      // 2. Calculer le résultat
      const result = this.calculateCaptureResult(attempt, pokemonData, battleContext);

      // 3. Générer et jouer l'animation
      const animations = this.generateCaptureAnimation(
        result, 
        pokemonName, 
        trainerName, 
        attempt.ballType
      );

      // 4. Exécuter l'animation séquentiellement
      for (const animation of animations) {
        if (callbacks?.onAnimationStep) {
          callbacks.onAnimationStep(animation);
        }
        
        if (callbacks?.onMessage) {
          callbacks.onMessage(animation.message);
        }

        // Attendre le délai de l'animation
        if (animation.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, animation.delay));
        }
      }

      // 5. Traiter le résultat
      if (result.success) {
        console.log(`✅ [CaptureManager] Capture réussie !`);
        
        if (callbacks?.onCaptureSuccess) {
          const capturedPokemon = this.createCapturedPokemonData(
            pokemonData, 
            attempt, 
            trainerName,
            attempt.ballType
          );
          callbacks.onCaptureSuccess(capturedPokemon);
        }
      } else {
        console.log(`❌ [CaptureManager] Capture échouée`);
        
        if (callbacks?.onCaptureFailed) {
          callbacks.onCaptureFailed();
        }
      }

      return result;

    } catch (error) {
      console.error(`💥 [CaptureManager] Erreur traitement capture:`, error);
      throw error;
    }
  }

  /**
   * ✅ Crée les données du Pokémon capturé
   */
  private static createCapturedPokemonData(
    pokemonData: any,
    attempt: CaptureAttempt,
    trainerName: string,
    ballType: string
  ): any {
    const now = new Date();

    return {
      pokemonId: attempt.pokemonId,
      species: pokemonData.name,
      nickname: null, // Le joueur pourra le renommer plus tard
      level: attempt.pokemonLevel,
      experience: this.calculateExpForLevel(attempt.pokemonLevel),
      nature: this.generateRandomNature(),
      ability: this.selectRandomAbility(pokemonData.abilities),
      gender: this.generateRandomGender(pokemonData.genderRatio),
      shiny: Math.random() < (1/4096), // Chance shiny normale
      
      // Stats individuelles (IV)
      ivs: {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        specialAttack: Math.floor(Math.random() * 32),
        specialDefense: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32)
      },
      
      // Moves actuels
      moves: this.generateMoveset(pokemonData, attempt.pokemonLevel),
      
      // HP actuels (selon le statut de capture)
      currentHp: attempt.currentHp,
      maxHp: attempt.maxHp,
      statusCondition: attempt.statusCondition === 'normal' ? null : attempt.statusCondition,
      
      // Métadonnées de capture
      captureInfo: {
        originalTrainer: trainerName,
        captureDate: now.toISOString(),
        captureLocation: attempt.location,
        captureMethod: 'wild_battle',
        ballType: ballType,
        captureLevel: attempt.pokemonLevel
      },
      
      // Bonheur et autres stats
      friendship: this.getBaseFriendship(pokemonData, ballType),
      markings: [],
      ribbons: [],
      
      // Statut dans l'équipe
      isInParty: false, // Sera déterminé par le gestionnaire d'équipe
      boxPosition: null,
      
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * ✅ UTILITAIRES DE GÉNÉRATION
   */

  private static calculateExpForLevel(level: number): number {
    // Formule simplifiée (croissance moyenne)
    return Math.floor(Math.pow(level, 3));
  }

  private static generateRandomNature(): string {
    const natures = [
      'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
      'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
      'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
      'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
      'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
    ];
    return natures[Math.floor(Math.random() * natures.length)];
  }

  private static selectRandomAbility(abilities: string[]): string {
    if (!abilities || abilities.length === 0) return 'None';
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  private static generateRandomGender(genderRatio: any): 'male' | 'female' | 'genderless' {
    if (!genderRatio) return 'genderless';
    if (genderRatio.genderless) return 'genderless';
    
    const maleRatio = genderRatio.male || 0.5;
    return Math.random() < maleRatio ? 'male' : 'female';
  }

  private static generateMoveset(pokemonData: any, level: number): any[] {
    if (!pokemonData.learnset) return [{ moveId: 'tackle', pp: 35 }];
    
    // Prendre les 4 derniers moves appris
    const learnableMoves = pokemonData.learnset
      .filter((learn: any) => learn.level <= level)
      .sort((a: any, b: any) => b.level - a.level)
      .slice(0, 4);
    
    return learnableMoves.map((learn: any) => ({
      moveId: learn.moveId,
      pp: 35, // TODO: Récupérer les PP réels du move
      maxPp: 35
    }));
  }

  private static getBaseFriendship(pokemonData: any, ballType: string): number {
    let baseFriendship = pokemonData.baseFriendship || 70;
    
    // Bonus pour certaines balls
    if (ballType === 'luxuryball') {
      baseFriendship += 30;
    } else if (ballType === 'friendball') {
      baseFriendship += 50;
    }
    
    return Math.min(255, baseFriendship);
  }

  /**
   * ✅ MÉTHODES DE VALIDATION
   */

  static canCapture(battleType: string, pokemonData: any): boolean {
    // Impossible de capturer dans certains types de combat
    if (battleType !== 'wild') {
      console.log(`❌ [CaptureManager] Impossible de capturer en combat ${battleType}`);
      return false;
    }

    // Certains Pokémon ne peuvent pas être capturés
    if (pokemonData.uncapturable) {
      console.log(`❌ [CaptureManager] ${pokemonData.name} ne peut pas être capturé`);
      return false;
    }

    return true;
  }

  static validateCaptureAttempt(attempt: CaptureAttempt): string | null {
    if (attempt.currentHp < 0 || attempt.maxHp <= 0) {
      return "HP invalides";
    }
    
    if (attempt.pokemonLevel < 1 || attempt.pokemonLevel > 100) {
      return "Niveau invalide";
    }
    
    if (!this.BALL_DATA[attempt.ballType as keyof typeof this.BALL_DATA]) {
      return "Type de ball invalide";
    }
    
    return null; // Pas d'erreur
  }

  /**
   * ✅ MÉTHODES DE DEBUG
   */

  static debugCaptureRate(
    pokemonId: number, 
    level: number, 
    hpPercent: number, 
    status: string, 
    ballType: string
  ): void {
    console.log(`🧪 [CaptureManager] === DEBUG CAPTURE RATE ===`);
    
    const attempt: CaptureAttempt = {
      pokemonId,
      pokemonLevel: level,
      currentHp: Math.floor(100 * hpPercent),
      maxHp: 100,
      statusCondition: status,
      ballType,
      location: 'test'
    };

    getPokemonById(pokemonId).then(pokemonData => {
      if (pokemonData) {
        const result = this.calculateCaptureResult(attempt, pokemonData);
        console.log(`🧪 Probabilité de capture: ${((result.finalRate / 255) * 100).toFixed(2)}%`);
      }
    });
  }

  static getBallTypesList(): string[] {
    return Object.keys(this.BALL_DATA);
  }

  static getBallInfo(ballType: string): any {
    return this.BALL_DATA[ballType as keyof typeof this.BALL_DATA] || null;
  }
}

export default CaptureManager;
