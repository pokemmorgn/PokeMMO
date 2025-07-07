// server/src/managers/battle/TypeEffectiveness.ts
// Table complète des efficacités de types Pokémon (officielle)

import { EffectivenessMultiplier } from './types/BattleTypes';

export type PokemonType = 
  | "Normal" | "Fire" | "Water" | "Electric" | "Grass" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Dark" | "Steel" | "Fairy";

// === TABLE D'EFFICACITÉ OFFICIELLE POKÉMON ===
// 0 = Aucun effet, 0.5 = Peu efficace, 1 = Normal, 2 = Super efficace

const TYPE_CHART: { [attackType: string]: { [defenseType: string]: EffectivenessMultiplier } } = {
  "Normal": {
    "Rock": 0.5, "Ghost": 0, "Steel": 0.5
  },
  "Fire": {
    "Fire": 0.5, "Water": 0.5, "Grass": 2, "Ice": 2, "Bug": 2, "Rock": 0.5, "Dragon": 0.5, "Steel": 2
  },
  "Water": {
    "Fire": 2, "Water": 0.5, "Grass": 0.5, "Ground": 2, "Rock": 2, "Dragon": 0.5
  },
  "Electric": {
    "Water": 2, "Electric": 0.5, "Grass": 0.5, "Ground": 0, "Flying": 2, "Dragon": 0.5
  },
  "Grass": {
    "Fire": 0.5, "Water": 2, "Grass": 0.5, "Poison": 0.5, "Ground": 2, "Flying": 0.5, "Bug": 0.5, "Rock": 2, "Dragon": 0.5, "Steel": 0.5
  },
  "Ice": {
    "Fire": 0.5, "Water": 0.5, "Grass": 2, "Ice": 0.5, "Ground": 2, "Flying": 2, "Dragon": 2, "Steel": 0.5
  },
  "Fighting": {
    "Normal": 2, "Ice": 2, "Poison": 0.5, "Flying": 0.5, "Psychic": 0.5, "Bug": 0.5, "Rock": 2, "Ghost": 0, "Dark": 2, "Steel": 2, "Fairy": 0.5
  },
  "Poison": {
    "Grass": 2, "Poison": 0.5, "Ground": 0.5, "Rock": 0.5, "Ghost": 0.5, "Steel": 0, "Fairy": 2
  },
  "Ground": {
    "Fire": 2, "Electric": 2, "Grass": 0.5, "Poison": 2, "Flying": 0, "Bug": 0.5, "Rock": 2, "Steel": 2
  },
  "Flying": {
    "Electric": 0.5, "Grass": 2, "Fighting": 2, "Bug": 2, "Rock": 0.5, "Steel": 0.5
  },
  "Psychic": {
    "Fighting": 2, "Poison": 2, "Psychic": 0.5, "Dark": 0, "Steel": 0.5
  },
  "Bug": {
    "Fire": 0.5, "Grass": 2, "Fighting": 0.5, "Poison": 0.5, "Flying": 0.5, "Psychic": 2, "Ghost": 0.5, "Dark": 2, "Steel": 0.5, "Fairy": 0.5
  },
  "Rock": {
    "Fire": 2, "Ice": 2, "Fighting": 0.5, "Ground": 0.5, "Flying": 2, "Bug": 2, "Steel": 0.5
  },
  "Ghost": {
    "Normal": 0, "Psychic": 2, "Ghost": 2, "Dark": 0.5
  },
  "Dragon": {
    "Dragon": 2, "Steel": 0.5, "Fairy": 0
  },
  "Dark": {
    "Fighting": 0.5, "Psychic": 2, "Ghost": 2, "Dark": 0.5, "Fairy": 0.5
  },
  "Steel": {
    "Fire": 0.5, "Water": 0.5, "Electric": 0.5, "Ice": 2, "Rock": 2, "Steel": 0.5, "Fairy": 2
  },
  "Fairy": {
    "Fire": 0.5, "Fighting": 2, "Poison": 0.5, "Dragon": 2, "Dark": 2, "Steel": 0.5
  }
};

// === CLASSE PRINCIPALE ===

export class TypeEffectiveness {
  
  /**
   * Calcule l'efficacité d'un type d'attaque contre un type de défense
   */
  static getEffectiveness(attackType: string, defenseType: string): EffectivenessMultiplier {
    // Normaliser les noms de types (première lettre majuscule)
    const normalizedAttack = this.normalizeType(attackType);
    const normalizedDefense = this.normalizeType(defenseType);
    
    // Vérifier si les types sont valides
    if (!this.isValidType(normalizedAttack) || !this.isValidType(normalizedDefense)) {
      console.warn(`[TypeEffectiveness] Type invalide: ${attackType} vs ${defenseType}`);
      return 1; // Efficacité normale par défaut
    }
    
    const attackChart = TYPE_CHART[normalizedAttack];
    if (!attackChart) {
      return 1; // Efficacité normale si pas de données spécifiques
    }
    
    return attackChart[normalizedDefense] || 1; // 1 = efficacité normale par défaut
  }
  
  /**
   * Calcule l'efficacité totale contre un Pokémon double type
   */
  static getTotalEffectiveness(
    attackType: string, 
    defenseTypes: string[]
  ): EffectivenessMultiplier {
    let totalEffectiveness = 1;
    
    for (const defenseType of defenseTypes) {
      const effectiveness = this.getEffectiveness(attackType, defenseType);
      totalEffectiveness *= effectiveness;
    }
    
    // S'assurer que le résultat est un multiplicateur valide
    if (totalEffectiveness === 0) return 0;
    if (totalEffectiveness <= 0.25) return 0.25;
    if (totalEffectiveness <= 0.5) return 0.5;
    if (totalEffectiveness <= 1) return 1;
    if (totalEffectiveness <= 2) return 2;
    return 4; // Maximum possible avec double type
  }
  
  /**
   * Génère l'ID de message d'efficacité pour localisation côté client
   */
  static getEffectivenessMessageId(effectiveness: EffectivenessMultiplier): string {
    switch (effectiveness) {
      case 0:
        return "MSG_NO_EFFECT";
      case 0.25:
        return "MSG_BARELY_EFFECTIVE";
      case 0.5:
        return "MSG_NOT_VERY_EFFECTIVE";
      case 1:
        return ""; // Pas de message pour efficacité normale
      case 2:
        return "MSG_EFFECTIVE";
      case 4:
        return "MSG_SUPER_EFFECTIVE";
      default:
        return "";
    }
  }
  
  /**
   * Détermine la couleur d'affichage selon l'efficacité
   */
  static getEffectivenessColor(effectiveness: EffectivenessMultiplier): string {
    switch (effectiveness) {
      case 0:
      case 0.25:
      case 0.5:
        return "#666666"; // Gris pour peu/pas efficace
      case 1:
        return "#FFFFFF"; // Blanc pour normal
      case 2:
        return "#4CAF50"; // Vert pour efficace
      case 4:
        return "#FF5722"; // Rouge-orange pour super efficace
      default:
        return "#FFFFFF";
    }
  }
  
  /**
   * Vérifie si l'attaque est de type STAB (Same Type Attack Bonus)
   */
  static hasSTAB(moveType: string, pokemonTypes: string[]): boolean {
    const normalizedMoveType = this.normalizeType(moveType);
    return pokemonTypes.some(type => this.normalizeType(type) === normalizedMoveType);
  }
  
  /**
   * Calcule le bonus STAB (1.5x si même type)
   */
  static getSTABMultiplier(moveType: string, pokemonTypes: string[]): number {
    return this.hasSTAB(moveType, pokemonTypes) ? 1.5 : 1.0;
  }
  
  // === MÉTHODES UTILITAIRES ===
  
  /**
   * Normalise un nom de type (première lettre majuscule)
   */
  private static normalizeType(type: string): string {
    if (!type) return "Normal";
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
  
  /**
   * Vérifie si un type est valide
   */
  private static isValidType(type: string): boolean {
    const validTypes: PokemonType[] = [
      "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
      "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
      "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
    ];
    return validTypes.includes(type as PokemonType);
  }
  
  /**
   * Obtient tous les types valides
   */
  static getAllTypes(): PokemonType[] {
    return [
      "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
      "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
      "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
    ];
  }
  
  /**
   * Trouve les types les plus efficaces contre un Pokémon
   */
  static findBestCounterTypes(defenseTypes: string[]): Array<{type: PokemonType, effectiveness: EffectivenessMultiplier}> {
    const results: Array<{type: PokemonType, effectiveness: EffectivenessMultiplier}> = [];
    
    for (const attackType of this.getAllTypes()) {
      const effectiveness = this.getTotalEffectiveness(attackType, defenseTypes);
      if (effectiveness > 1) {
        results.push({ type: attackType, effectiveness });
      }
    }
    
    // Trier par efficacité décroissante
    return results.sort((a, b) => b.effectiveness - a.effectiveness);
  }
  
  /**
   * Trouve les types les moins efficaces contre un Pokémon
   */
  static findWorstAttackTypes(defenseTypes: string[]): Array<{type: PokemonType, effectiveness: EffectivenessMultiplier}> {
    const results: Array<{type: PokemonType, effectiveness: EffectivenessMultiplier}> = [];
    
    for (const attackType of this.getAllTypes()) {
      const effectiveness = this.getTotalEffectiveness(attackType, defenseTypes);
      if (effectiveness < 1) {
        results.push({ type: attackType, effectiveness });
      }
    }
    
    // Trier par efficacité croissante
    return results.sort((a, b) => a.effectiveness - b.effectiveness);
  }
  
  // === MÉTHODES DE DEBUG ET TEST ===
  
  /**
   * Test complet du système de types
   */
  static runTypeTests(): void {
    console.log("🧪 [TypeEffectiveness] === TESTS DU SYSTÈME DE TYPES ===");
    
    // Tests célèbres
    const tests = [
      { attack: "Water", defense: ["Fire"], expected: 2, name: "Eau vs Feu" },
      { attack: "Fire", defense: ["Grass"], expected: 2, name: "Feu vs Plante" },
      { attack: "Electric", defense: ["Ground"], expected: 0, name: "Électrik vs Sol" },
      { attack: "Fighting", defense: ["Ghost"], expected: 0, name: "Combat vs Spectre" },
      { attack: "Electric", defense: ["Water", "Flying"], expected: 4, name: "Électrik vs Eau/Vol" },
      { attack: "Rock", defense: ["Fire", "Flying"], expected: 4, name: "Roche vs Feu/Vol" },
      { attack: "Grass", defense: ["Water", "Ground"], expected: 4, name: "Plante vs Eau/Sol" }
    ];
    
    let passed = 0;
    for (const test of tests) {
      const result = this.getTotalEffectiveness(test.attack, test.defense);
      const success = result === test.expected;
      
      console.log(`${success ? '✅' : '❌'} ${test.name}: ${test.attack} → [${test.defense.join('/')}] = ${result}x (attendu: ${test.expected}x)`);
      
      if (success) passed++;
    }
    
    console.log(`🎯 [TypeEffectiveness] Tests: ${passed}/${tests.length} réussis`);
    
    if (passed === tests.length) {
      console.log("🎉 [TypeEffectiveness] Tous les tests sont passés !");
    } else {
      console.error("💥 [TypeEffectiveness] Certains tests ont échoué !");
    }
  }
  
  /**
   * Affiche l'efficacité d'un type contre tous les autres
   */
  static debugTypeChart(attackType: string): void {
    console.log(`🔍 [TypeEffectiveness] Efficacité de ${attackType}:`);
    
    const normalizedAttack = this.normalizeType(attackType);
    if (!this.isValidType(normalizedAttack)) {
      console.error(`❌ Type invalide: ${attackType}`);
      return;
    }
    
    for (const defenseType of this.getAllTypes()) {
      const effectiveness = this.getEffectiveness(normalizedAttack, defenseType);
      let symbol = "•";
      
      if (effectiveness === 0) symbol = "✖️";
      else if (effectiveness === 0.5) symbol = "🔽";
      else if (effectiveness === 2) symbol = "🔼";
      else if (effectiveness >= 4) symbol = "⬆️";
      
      console.log(`  ${symbol} vs ${defenseType}: ${effectiveness}x`);
    }
  }
  
  /**
   * Génère un rapport d'analyse pour un Pokémon
   */
  static analyzeTypeCoverage(pokemonTypes: string[]): void {
    console.log(`📊 [TypeEffectiveness] Analyse de ${pokemonTypes.join('/')}:`);
    
    const weaknesses = this.findBestCounterTypes(pokemonTypes);
    const resistances = this.findWorstAttackTypes(pokemonTypes);
    
    console.log("🔴 Faiblesses:");
    weaknesses.forEach(w => {
      const messageId = this.getEffectivenessMessageId(w.effectiveness);
      console.log(`  ${w.type}: ${w.effectiveness}x (${messageId})`);
    });
    
    console.log("🛡️ Résistances:");
    resistances.forEach(r => {
      const messageId = this.getEffectivenessMessageId(r.effectiveness);
      console.log(`  ${r.type}: ${r.effectiveness}x (${messageId})`);
    });
  }
}

// === FONCTIONS UTILITAIRES GLOBALES ===

/**
 * Fonction rapide pour calculer l'efficacité
 */
export function getTypeEffectiveness(attackType: string, defenseTypes: string[]): EffectivenessMultiplier {
  return TypeEffectiveness.getTotalEffectiveness(attackType, defenseTypes);
}

/**
 * Fonction rapide pour l'ID de message d'efficacité
 */
export function getEffectivenessMessageId(effectiveness: EffectivenessMultiplier): string {
  return TypeEffectiveness.getEffectivenessMessageId(effectiveness);
}

/**
 * Fonction rapide pour le bonus STAB
 */
export function getSTABBonus(moveType: string, pokemonTypes: string[]): number {
  return TypeEffectiveness.getSTABMultiplier(moveType, pokemonTypes);
}

// === TESTS AUTOMATIQUES AU CHARGEMENT (DEV) ===

if (process.env.NODE_ENV === 'development') {
  // Exécuter les tests au chargement en mode développement
  TypeEffectiveness.runTypeTests();
}

// === EXPORT PAR DÉFAUT ===

export default TypeEffectiveness;
