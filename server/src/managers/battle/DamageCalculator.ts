// server/src/managers/battle/DamageCalculator.ts
// Calculateur de dégâts avec formule officielle Pokémon

import { 
  DamageCalculationInput, 
  DamageCalculationResult, 
  EffectivenessMultiplier,
  BattlePokemonData,
  ExistingMoveData,
  STAT_STAGE_MULTIPLIERS,
  NATURE_MULTIPLIERS,
  POKEMON_CONSTANTS
} from './types/BattleTypes';

import { TypeEffectiveness, getEffectivenessMessageId } from './TypeEffectiveness';

export class DamageCalculator {
  
  /**
   * FORMULE OFFICIELLE POKÉMON (Générations 3+)
   * Damage = ((((2 * Level + 10) / 250) * Attack / Defense * Power + 2) * Modifiers)
   */
  static calculateDamage(input: DamageCalculationInput): DamageCalculationResult {
    const {
      attacker,
      defender,
      move,
      moveType,
      weather = 'clear',
      terrain = 'normal',
      isCritical = false,
      randomFactor = this.generateRandomFactor()
    } = input;

    console.log(`💥 [DamageCalc] === CALCUL DÉGÂTS ===`);
    console.log(`⚔️ ${attacker.name} utilise ${move.name} sur ${defender.name}`);
    console.log(`🎯 Type: ${moveType}, Puissance: ${move.power || 0}`);

    // === VÉRIFICATIONS PRÉLIMINAIRES ===
    
    // Move de statut = 0 dégâts
    if (move.category === "Status" || !move.power || move.power === 0) {
      return this.createStatusMoveResult(attacker, defender, move, moveType);
    }

    // === CALCULS DES STATS EFFECTIVES ===
    
    const attackStat = this.getEffectiveAttackStat(attacker, move, isCritical);
    const defenseStat = this.getEffectiveDefenseStat(defender, move, isCritical);
    
    console.log(`📊 Stats effectives: ATK=${attackStat}, DEF=${defenseStat}`);

    // === FORMULE DE BASE ===
    
    // Étape 1: Base damage
    const level = attacker.level;
    const power = move.power;
    
    const baseDamage = Math.floor(
      ((((2 * level + 10) / 250) * (attackStat / defenseStat) * power) + 2)
    );
    
    console.log(`🔢 Dégâts de base: ${baseDamage}`);

    // === MODIFICATEURS ===
    
    const modifiers = this.calculateAllModifiers(
      attacker, defender, move, moveType, weather, terrain, isCritical
    );

    // === CALCUL FINAL ===
    
    let finalDamage = Math.floor(baseDamage * modifiers.total * randomFactor);
    
    // Minimum 1 dégât si l'attaque touche
    if (finalDamage < 1 && modifiers.effectiveness > 0) {
      finalDamage = 1;
    }

    console.log(`💥 Dégâts finaux: ${finalDamage}`);

    // === GÉNÉRATION DES MESSAGES ===
    
    const messages = this.generateDamageMessages(modifiers, isCritical);

    return {
      finalDamage,
      baseDamage,
      effectiveness: modifiers.effectiveness,
      stab: modifiers.stab > 1,
      critical: isCritical,
      weather: modifiers.weather,
      ability: modifiers.ability,
      item: modifiers.item,
      randomFactor,
      messages
    };
  }

  // === STATS EFFECTIVES ===

  /**
   * Calcule la stat d'attaque effective (avec stages et critical)
   */
  private static getEffectiveAttackStat(
    pokemon: BattlePokemonData, 
    move: ExistingMoveData, 
    isCritical: boolean
  ): number {
    // Choisir la bonne stat selon la catégorie du move
    const baseStat = move.category === "Physical" 
      ? pokemon.stats.attack 
      : pokemon.stats.specialAttack;

    // Stages (modifiés si critique)
    const stage = move.category === "Physical" 
      ? pokemon.statStages.attack 
      : pokemon.statStages.specialAttack;

    // Si critique, ignorer les baisses de stat
    const effectiveStage = (isCritical && stage < 0) ? 0 : stage;
    
    const stageMultiplier = STAT_STAGE_MULTIPLIERS[effectiveStage.toString() as keyof typeof STAT_STAGE_MULTIPLIERS];
    
    return Math.floor(baseStat * stageMultiplier);
  }

  /**
   * Calcule la stat de défense effective (avec stages et critical)
   */
  private static getEffectiveDefenseStat(
    pokemon: BattlePokemonData, 
    move: ExistingMoveData, 
    isCritical: boolean
  ): number {
    // Choisir la bonne stat selon la catégorie du move
    const baseStat = move.category === "Physical" 
      ? pokemon.stats.defense 
      : pokemon.stats.specialDefense;

    // Stages (modifiés si critique)
    const stage = move.category === "Physical" 
      ? pokemon.statStages.defense 
      : pokemon.statStages.specialDefense;

    // Si critique, ignorer les augmentations de stat
    const effectiveStage = (isCritical && stage > 0) ? 0 : stage;
    
    const stageMultiplier = STAT_STAGE_MULTIPLIERS[effectiveStage.toString() as keyof typeof STAT_STAGE_MULTIPLIERS];
    
    return Math.floor(baseStat * stageMultiplier);
  }

  // === MODIFICATEURS ===

  /**
   * Calcule tous les modificateurs de dégâts
   */
  private static calculateAllModifiers(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: ExistingMoveData,
    moveType: string,
    weather: string,
    terrain: string,
    isCritical: boolean
  ) {
    // STAB (Same Type Attack Bonus)
    const stab = TypeEffectiveness.getSTABMultiplier(moveType, attacker.types);
    
    // Efficacité des types
    const effectiveness = TypeEffectiveness.getTotalEffectiveness(moveType, defender.types);
    
    // Critique (1.5x en Gen 6+)
    const critical = isCritical ? 1.5 : 1.0;
    
    // Météo
    const weather_mod = this.getWeatherModifier(moveType, weather);
    
    // Capacité spéciale
    const ability = this.getAbilityModifier(attacker, defender, move, moveType);
    
    // Objet tenu
    const item = this.getItemModifier(attacker, move, moveType);
    
    // Terrain
    const terrain_mod = this.getTerrainModifier(moveType, terrain);
    
    // Autres modificateurs
    const other = this.getOtherModifiers(attacker, defender, move);
    
    const total = stab * effectiveness * critical * weather_mod * ability * item * terrain_mod * other;

    console.log(`🔢 Modificateurs: STAB=${stab}, EFF=${effectiveness}, CRIT=${critical}, WEATHER=${weather_mod}, ABILITY=${ability}`);

    return {
      stab,
      effectiveness,
      critical,
      weather: weather_mod,
      ability,
      item,
      terrain: terrain_mod,
      other,
      total
    };
  }

  /**
   * Modificateur météo
   */
  private static getWeatherModifier(moveType: string, weather: string): number {
    if (weather === 'rain') {
      if (moveType === 'Water') return 1.5;
      if (moveType === 'Fire') return 0.5;
    }
    
    if (weather === 'sunny') {
      if (moveType === 'Fire') return 1.5;
      if (moveType === 'Water') return 0.5;
    }
    
    if (weather === 'sandstorm') {
      // Tempête de sable boost la Def Spé des Rock
      // Géré ailleurs dans le calcul de stats
    }
    
    return 1.0;
  }

  /**
   * Modificateur capacité spéciale
   */
  private static getAbilityModifier(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: ExistingMoveData,
    moveType: string
  ): number {
    let modifier = 1.0;

    // Capacités de l'attaquant
    if (attacker.ability) {
      switch (attacker.ability) {
        case 'overgrow':
        case 'blaze':
        case 'torrent':
        case 'swarm':
          // Boost à 1/3 HP ou moins
          if (attacker.currentHp <= Math.floor(attacker.maxHp / 3)) {
            const abilityType = this.getAbilityTypeBoost(attacker.ability);
            if (moveType === abilityType) {
              modifier *= 1.5;
            }
          }
          break;
          
        case 'huge_power':
          if (move.category === 'Physical') {
            modifier *= 2.0;
          }
          break;
          
        case 'guts':
          if (move.category === 'Physical' && attacker.statusCondition !== 'normal') {
            modifier *= 1.5;
          }
          break;
      }
    }

    // Capacités du défenseur
    if (defender.ability) {
      switch (defender.ability) {
        case 'water_absorb':
          if (moveType === 'Water') return 0; // Absorbe les dégâts
          break;
          
        case 'volt_absorb':
          if (moveType === 'Electric') return 0; // Absorbe les dégâts
          break;
          
        case 'flash_fire':
          if (moveType === 'Fire') return 0; // Immunité
          break;
          
        case 'levitate':
          if (moveType === 'Ground') return 0; // Immunité
          break;
          
        case 'wonder_guard':
          // Seules les attaques super efficaces touchent
          const effectiveness = TypeEffectiveness.getTotalEffectiveness(moveType, defender.types);
          if (effectiveness <= 1) return 0;
          break;
      }
    }

    return modifier;
  }

  /**
   * Helper pour les capacités de type boost
   */
  private static getAbilityTypeBoost(ability: string): string {
    switch (ability) {
      case 'overgrow': return 'Grass';
      case 'blaze': return 'Fire';
      case 'torrent': return 'Water';
      case 'swarm': return 'Bug';
      default: return '';
    }
  }

  /**
   * Modificateur objet tenu
   */
  private static getItemModifier(
    attacker: BattlePokemonData,
    move: ExistingMoveData,
    moveType: string
  ): number {
    if (!attacker.heldItem) return 1.0;

    // Exemples d'objets type-boost
    const typeBoostItems: { [item: string]: string } = {
      'charcoal': 'Fire',
      'mystic_water': 'Water',
      'miracle_seed': 'Grass',
      'magnet': 'Electric',
      'soft_sand': 'Ground',
      'sharp_beak': 'Flying',
      'poison_barb': 'Poison',
      'never_melt_ice': 'Ice',
      'spell_tag': 'Ghost',
      'twisted_spoon': 'Psychic',
      'black_belt': 'Fighting',
      'black_glasses': 'Dark',
      'metal_coat': 'Steel',
      'hard_stone': 'Rock',
      'silver_powder': 'Bug',
      'dragon_fang': 'Dragon'
    };

    if (typeBoostItems[attacker.heldItem] === moveType) {
      return 1.2; // 20% boost pour les objets type-spécifiques
    }

    return 1.0;
  }

  /**
   * Modificateur terrain
   */
  private static getTerrainModifier(moveType: string, terrain: string): number {
    switch (terrain) {
      case 'electric':
        if (moveType === 'Electric') return 1.5;
        break;
      case 'grassy':
        if (moveType === 'Grass') return 1.5;
        break;
      case 'psychic':
        if (moveType === 'Psychic') return 1.5;
        break;
      case 'misty':
        if (moveType === 'Dragon') return 0.5;
        break;
    }
    
    return 1.0;
  }

  /**
   * Autres modificateurs
   */
  private static getOtherModifiers(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: ExistingMoveData
  ): number {
    let modifier = 1.0;

    // Statuts qui affectent l'attaque
    if (attacker.statusCondition === 'burn' && move.category === 'Physical') {
      modifier *= 0.5; // Brûlure réduit l'attaque physique
    }

    return modifier;
  }

  // === GÉNÉRATION DE MESSAGES ===

  /**
   * Génère les IDs de messages selon les modificateurs
   */
  private static generateDamageMessages(modifiers: any, isCritical: boolean): string[] {
    const messages: string[] = [];

    // Message de critique
    if (isCritical) {
      messages.push("MSG_CRITICAL_HIT");
    }

    // Message d'efficacité
    const effectivenessMsg = getEffectivenessMessageId(modifiers.effectiveness);
    if (effectivenessMsg) {
      messages.push(effectivenessMsg);
    }

    // Messages spéciaux selon l'efficacité
    if (modifiers.effectiveness === 0) {
      messages.push("MSG_ATTACK_MISSED"); // Techniquement pas raté mais pas d'effet
    }

    return messages;
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Génère le facteur aléatoire (85-100%)
   */
  private static generateRandomFactor(): number {
    return (Math.floor(Math.random() * 16) + 85) / 100; // 0.85 à 1.00
  }

  /**
   * Détermine si l'attaque est critique
   */
  static calculateCriticalHit(
    attacker: BattlePokemonData, 
    move: ExistingMoveData
  ): boolean {
    let criticalStage = 0;

    // Moves avec critique élevé
    if (move.name.includes('Slash') || move.name.includes('Cutter')) {
      criticalStage += 1;
    }

    // Objets qui augmentent le critique
    if (attacker.heldItem === 'scope_lens') {
      criticalStage += 1;
    }

    // Capacités qui augmentent le critique
    if (attacker.ability === 'super_luck') {
      criticalStage += 1;
    }

    // Taux de critique selon le stage
    const criticalRates = [1/24, 1/8, 1/2, 1/1]; // Stages 0, 1, 2, 3+
    const rate = criticalRates[Math.min(criticalStage, 3)];

    return Math.random() < rate;
  }

  /**
   * Résultat pour les moves de statut
   */
  private static createStatusMoveResult(
    attacker: BattlePokemonData,
    defender: BattlePokemonData,
    move: ExistingMoveData,
    moveType: string
  ): DamageCalculationResult {
    return {
      finalDamage: 0,
      baseDamage: 0,
      effectiveness: 1,
      stab: false,
      critical: false,
      weather: 1,
      ability: 1,
      item: 1,
      randomFactor: 1,
      messages: ["MSG_STATUS_MOVE_USED"]
    };
  }

  // === MÉTHODES DE TEST ===

  /**
   * Test de calcul de dégâts avec exemples connus
   */
  static runDamageTests(): void {
    console.log("🧪 [DamageCalculator] === TESTS DE CALCULS ===");

    // TODO: Implémenter des tests avec des Pokémon de référence
    // Une fois qu'on aura des données de test complètes

    console.log("✅ [DamageCalculator] Tests prêts à implémenter");
  }

  // === FONCTIONS D'ANALYSE ===

  /**
   * Calcule les dégâts moyens sur plusieurs essais
   */
  static calculateAverageDamage(
    input: DamageCalculationInput, 
    trials: number = 100
  ): number {
    let totalDamage = 0;

    for (let i = 0; i < trials; i++) {
      const result = this.calculateDamage({
        ...input,
        randomFactor: this.generateRandomFactor()
      });
      totalDamage += result.finalDamage;
    }

    return Math.round(totalDamage / trials);
  }

  /**
   * Calcule la plage de dégâts possible
   */
  static calculateDamageRange(input: DamageCalculationInput): { min: number, max: number } {
    const minResult = this.calculateDamage({
      ...input,
      randomFactor: 0.85
    });

    const maxResult = this.calculateDamage({
      ...input,
      randomFactor: 1.00
    });

    return {
      min: minResult.finalDamage,
      max: maxResult.finalDamage
    };
  }
}

// === FONCTIONS UTILITAIRES RAPIDES ===

/**
 * Fonction rapide pour calculer des dégâts
 */
export function calculatePokemonDamage(
  attacker: BattlePokemonData,
  defender: BattlePokemonData,
  move: ExistingMoveData,
  moveType: string,
  options: {
    weather?: string;
    terrain?: string;
    isCritical?: boolean;
  } = {}
): DamageCalculationResult {
  return DamageCalculator.calculateDamage({
    attacker,
    defender,
    move,
    moveType,
    ...options
  });
}

/**
 * Fonction rapide pour vérifier un critique
 */
export function rollCriticalHit(
  attacker: BattlePokemonData, 
  move: ExistingMoveData
): boolean {
  return DamageCalculator.calculateCriticalHit(attacker, move);
}

export default DamageCalculator;
