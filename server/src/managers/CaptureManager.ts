// src/managers/CaptureManager.ts

export interface CaptureResult {
  success: boolean;
  captureRate: number;
  finalProbability: number;
  ballUsed: string;
  shakeCount: number; // 0-3 shakes before break/capture
  criticalCapture?: boolean;
}

export interface CaptureAttempt {
  pokemonId: number;
  pokemonLevel: number;
  currentHp: number;
  maxHp: number;
  statusCondition: string;
  ballType: string;
  location?: string;
}

export class CaptureManager {
  // Modificateurs des Poké Balls (authentiques)
  private static readonly BALL_MODIFIERS: { [key: string]: number } = {
    "poke_ball": 1.0,
    "great_ball": 1.5,
    "ultra_ball": 2.0,
    "master_ball": 255.0, // Capture garantie
    "safari_ball": 1.5,
    "net_ball": 3.0,      // Efficace contre Bug/Water
    "nest_ball": 1.0,     // Varie selon niveau (max 4.0 pour niveau 1)
    "repeat_ball": 1.0,   // 3.5x si déjà capturé
    "timer_ball": 1.0,    // Augmente avec les tours (max 4.0)
    "luxury_ball": 1.0,   // Même taux mais plus de bonheur
    "premier_ball": 1.0,  // Même que Poké Ball
    "dive_ball": 3.5,     // Efficace en surfant/pêchant
    "dusk_ball": 3.5,     // Efficace la nuit ou dans grottes
    "heal_ball": 1.0,     // Même taux mais soigne
    "quick_ball": 5.0,    // Premier tour seulement
    "fast_ball": 4.0,     // Pokémon avec Speed >= 100
    "level_ball": 1.0,    // Varie selon différence de niveau
    "lure_ball": 4.0,     // Pokémon pêchés
    "heavy_ball": 1.0,    // Varie selon poids
    "love_ball": 8.0,     // Sexe opposé de même espèce
    "friend_ball": 1.0,   // Même taux mais plus d'amitié
    "moon_ball": 4.0,     // Pokémon évoluant avec Pierre Lune
    "sport_ball": 1.5,    // Concours insectes
    "park_ball": 255.0,   // Capture garantie au Parc
    "dream_ball": 1.0,    // Spécial Dream World
    "beast_ball": 0.1     // Très faible sauf Ultra-Chimères
  };

  // Modificateurs de statut (authentiques)
  private static readonly STATUS_MODIFIERS: { [key: string]: number } = {
    "normal": 1.0,
    "sleep": 2.5,
    "freeze": 2.5,
    "paralysis": 1.5,
    "burn": 1.5,
    "poison": 1.5,
    "badly_poison": 1.5
  };

  /**
   * Calcule le taux de capture selon la formule authentique Pokémon
   * Formule: ((3 × HP_max - 2 × HP_current) × Capture_Rate × Ball_Rate × Status_Rate) / (3 × HP_max)
   * Puis divisé par 4 pour obtenir la probabilité finale
   */
  public static calculateCaptureRate(attempt: CaptureAttempt, pokemonData: any): CaptureResult {
    const { pokemonId, pokemonLevel, currentHp, maxHp, statusCondition, ballType, location } = attempt;
    
    // Récupération des données Pokémon
    const baseCaptureRate = pokemonData.captureRate;
    
    // Calcul du modificateur de HP
    const hpModifier = (3 * maxHp - 2 * currentHp) / (3 * maxHp);
    
    // Modificateur de ball
    let ballModifier = this.BALL_MODIFIERS[ballType] || 1.0;
    
    // Modificateurs spéciaux selon la ball et le contexte
    ballModifier = this.applySpecialBallModifiers(ballType, pokemonData, pokemonLevel, location);
    
    // Modificateur de statut
    const statusModifier = this.STATUS_MODIFIERS[statusCondition] || 1.0;
    
    // Calcul du taux de capture (formule Génération 3+)
    let captureRate = Math.floor(
      ((3 * maxHp - 2 * currentHp) * baseCaptureRate * ballModifier * statusModifier) / (3 * maxHp)
    );
    
    // Limite à 255 (sauf Master Ball qui garantit la capture)
    if (ballType !== "master_ball" && ballType !== "park_ball") {
      captureRate = Math.min(captureRate, 255);
    }
    
    // Calcul de la probabilité finale
    const finalProbability = ballType === "master_ball" || ballType === "park_ball" 
      ? 100 
      : (captureRate / 255) * 100;
    
    // Simulation de la capture
    const success = this.simulateCapture(captureRate, ballType);
    const shakeCount = this.calculateShakeCount(captureRate, success);
    const criticalCapture = this.checkCriticalCapture(pokemonData, pokemonLevel);
    
    return {
      success,
      captureRate,
      finalProbability,
      ballUsed: ballType,
      shakeCount,
      criticalCapture
    };
  }

  /**
   * Applique les modificateurs spéciaux selon le type de ball
   */
  private static applySpecialBallModifiers(
    ballType: string, 
    pokemonData: any, 
    pokemonLevel: number, 
    location?: string
  ): number {
    let modifier = this.BALL_MODIFIERS[ballType] || 1.0;
    
    switch (ballType) {
      case "nest_ball":
        // Plus efficace sur les Pokémon de bas niveau
        // Formule: (41 - Pokémon_Level) / 10, minimum 1.0
        modifier = Math.max(1.0, (41 - pokemonLevel) / 10);
        break;
        
      case "net_ball":
        // 3x plus efficace contre Bug et Water
        if (pokemonData.types.includes("Bug") || pokemonData.types.includes("Water")) {
          modifier = 3.0;
        }
        break;
        
      case "dive_ball":
        // 3.5x quand on surfe ou pêche
        if (location && (location.includes("Surf") || location.includes("Fish"))) {
          modifier = 3.5;
        }
        break;
        
      case "dusk_ball":
        // 3.5x la nuit ou dans les grottes
        if (location && (location.includes("Cave") || location.includes("Night"))) {
          modifier = 3.5;
        }
        break;
        
      case "fast_ball":
        // 4x pour Pokémon avec Speed >= 100
        if (pokemonData.baseStats.speed >= 100) {
          modifier = 4.0;
        }
        break;
        
      case "heavy_ball":
        // Varie selon le poids
        const weight = pokemonData.weight;
        if (weight >= 300) modifier = 30;
        else if (weight >= 200) modifier = 20;
        else if (weight >= 100) modifier = 10;
        else modifier = -20; // Malus pour les légers
        modifier = Math.max(1.0, modifier);
        break;
        
      case "level_ball":
        // Dépend de la différence de niveau (assumons niveau joueur = 50)
        const playerLevel = 50;
        if (playerLevel >= pokemonLevel * 4) modifier = 8.0;
        else if (playerLevel >= pokemonLevel * 2) modifier = 4.0;
        else if (playerLevel > pokemonLevel) modifier = 2.0;
        break;
        
      case "moon_ball":
        // 4x pour Pokémon évoluant avec Pierre Lune
        const moonStoneEvolutions = ["Nidorina", "Nidorino", "Clefairy", "Jigglypuff"];
        if (moonStoneEvolutions.includes(pokemonData.name)) {
          modifier = 4.0;
        }
        break;
    }
    
    return modifier;
  }

  /**
   * Simule la capture avec la probabilité calculée
   */
  private static simulateCapture(captureRate: number, ballType: string): boolean {
    if (ballType === "master_ball" || ballType === "park_ball") {
      return true;
    }
    
    // Génération d'un nombre aléatoire 0-255
    const randomValue = Math.floor(Math.random() * 256);
    return randomValue < captureRate;
  }

  /**
   * Calcule le nombre de secousses avant capture/échec
   */
  private static calculateShakeCount(captureRate: number, success: boolean): number {
    if (captureRate >= 255) return 3; // Capture garantie
    
    // Calcul du nombre de secousses selon la formule authentique
    const shakeCheck = Math.floor(65536 / Math.pow(255 / captureRate, 0.1875));
    
    let shakes = 0;
    for (let i = 0; i < 4; i++) {
      const randomValue = Math.floor(Math.random() * 65536);
      if (randomValue < shakeCheck) {
        shakes++;
      } else {
        break;
      }
    }
    
    return success ? 3 : shakes;
  }

  /**
   * Vérifie si c'est une capture critique (rare)
   */
  private static checkCriticalCapture(pokemonData: any, pokemonLevel: number): boolean {
    // Capture critique plus probable avec des Pokémon déjà capturés
    // Simplifié : 1% de chance
    return Math.random() < 0.01;
  }

  /**
   * Obtient les balls recommandées pour un Pokémon/location
   */
  public static getRecommendedBalls(pokemonData: any, location: string): string[] {
    const recommendations: string[] = ["poke_ball", "great_ball", "ultra_ball"];
    
    // Recommandations selon le type
    if (pokemonData.types.includes("Bug") || pokemonData.types.includes("Water")) {
      recommendations.push("net_ball");
    }
    
    // Recommandations selon la location
    if (location.includes("Cave") || location.includes("Night")) {
      recommendations.push("dusk_ball");
    }
    
    if (location.includes("Surf") || location.includes("Fish")) {
      recommendations.push("dive_ball");
    }
    
    // Recommandations selon les stats
    if (pokemonData.baseStats.speed >= 100) {
      recommendations.push("fast_ball");
    }
    
    if (pokemonData.weight >= 100) {
      recommendations.push("heavy_ball");
    }
    
    return recommendations;
  }
}

// Interface pour les données de capture dans le JSON
export interface CaptureLocationData {
  location: string;
  area?: string;
  rarity: "Very Common" | "Common" | "Uncommon" | "Rare" | "Very Rare" | "Guaranteed" | "N/A";
  method: "Wild Grass" | "Surfing" | "Fishing" | "Cave" | "Tree" | "Special" | "Starter Choice" | "Evolution";
  level_range: string;
  encounter_rate: string;
  time_of_day: "Morning" | "Day" | "Evening" | "Night" | "Any";
  season: "Spring" | "Summer" | "Fall" | "Winter" | "Any";
  ball_effectiveness: { [ballType: string]: number };
  status_modifiers: { [status: string]: number };
}
