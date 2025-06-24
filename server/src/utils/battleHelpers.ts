// server/src/utils/battleHelpers.ts
import { BattleState, BattlePokemon } from '../schema/BattleState';
import BATTLE_CONFIG from '../config/battleConfig';

export class BattleHelpers {
  
  // ================================================================================================
  // UTILITAIRES DE CONVERSION
  // ================================================================================================
  
  /**
   * Convertir un nom de Pokémon en ID
   */
  static pokemonNameToId(name: string): number {
    const mapping: { [key: string]: number } = {
      // Génération 1
      "Bulbasaur": 1, "Ivysaur": 2, "Venusaur": 3,
      "Charmander": 4, "Charmeleon": 5, "Charizard": 6,
      "Squirtle": 7, "Wartortle": 8, "Blastoise": 9,
      "Caterpie": 10, "Metapod": 11, "Butterfree": 12,
      "Weedle": 13, "Kakuna": 14, "Beedrill": 15,
      "Pidgey": 16, "Pidgeotto": 17, "Pidgeot": 18,
      "Rattata": 19, "Raticate": 20,
      "Spearow": 21, "Fearow": 22,
      "Ekans": 23, "Arbok": 24,
      "Pikachu": 25, "Raichu": 26,
      "Sandshrew": 27, "Sandslash": 28,
      "Nidoran♀": 29, "Nidorina": 30, "Nidoqueen": 31,
      "Nidoran♂": 32, "Nidorino": 33, "Nidoking": 34,
      "Clefairy": 35, "Clefable": 36,
      "Vulpix": 37, "Ninetales": 38,
      "Jigglypuff": 39, "Wigglytuff": 40,
      "Zubat": 41, "Golbat": 42,
      "Oddish": 43, "Gloom": 44, "Vileplume": 45,
      "Paras": 46, "Parasect": 47,
      "Venonat": 48, "Venomoth": 49,
      "Diglett": 50, "Dugtrio": 51,
      "Meowth": 52, "Persian": 53,
      "Psyduck": 54, "Golduck": 55,
      "Mankey": 56, "Primeape": 57,
      "Growlithe": 58, "Arcanine": 59,
      "Poliwag": 60, "Poliwhirl": 61, "Poliwrath": 62,
      "Abra": 63, "Kadabra": 64, "Alakazam": 65,
      "Machop": 66, "Machoke": 67, "Machamp": 68,
      "Bellsprout": 69, "Weepinbell": 70, "Victreebel": 71,
      "Tentacool": 72, "Tentacruel": 73,
      "Geodude": 74, "Graveler": 75, "Golem": 76,
      "Ponyta": 77, "Rapidash": 78,
      "Slowpoke": 79, "Slowbro": 80,
      "Magnemite": 81, "Magneton": 82,
      "Farfetch'd": 83,
      "Doduo": 84, "Dodrio": 85,
      "Seel": 86, "Dewgong": 87,
      "Grimer": 88, "Muk": 89,
      "Shellder": 90, "Cloyster": 91,
      "Gastly": 92, "Haunter": 93, "Gengar": 94,
      "Onix": 95,
      "Drowzee": 96, "Hypno": 97,
      "Krabby": 98, "Kingler": 99,
      "Voltorb": 100, "Electrode": 101,
      "Exeggcute": 102, "Exeggutor": 103,
      "Cubone": 104, "Marowak": 105,
      "Hitmonlee": 106, "Hitmonchan": 107,
      "Lickitung": 108,
      "Koffing": 109, "Weezing": 110,
      "Rhyhorn": 111, "Rhydon": 112,
      "Chansey": 113,
      "Tangela": 114,
      "Kangaskhan": 115,
      "Horsea": 116, "Seadra": 117,
      "Goldeen": 118, "Seaking": 119,
      "Staryu": 120, "Starmie": 121,
      "Mr. Mime": 122,
      "Scyther": 123,
      "Jynx": 124,
      "Electabuzz": 125,
      "Magmar": 126,
      "Pinsir": 127,
      "Tauros": 128,
      "Magikarp": 129, "Gyarados": 130,
      "Lapras": 131,
      "Ditto": 132,
      "Eevee": 133, "Vaporeon": 134, "Jolteon": 135, "Flareon": 136,
      "Porygon": 137,
      "Omanyte": 138, "Omastar": 139,
      "Kabuto": 140, "Kabutops": 141,
      "Aerodactyl": 142,
      "Snorlax": 143,
      "Articuno": 144, "Zapdos": 145, "Moltres": 146,
      "Dratini": 147, "Dragonair": 148, "Dragonite": 149,
      "Mewtwo": 150,
      "Mew": 151,
      
      // Génération 2 (quelques exemples)
      "Chinchou": 170, "Lanturn": 171,
      "Wooper": 194, "Quagsire": 195,
      "Espeon": 196, "Umbreon": 197,
      "Delibird": 225,
      "Slugma": 218, "Magcargo": 219,
      "Raikou": 243, "Entei": 244, "Suicune": 245,
      "Leafeon": 470, "Glaceon": 471,
      "Litwick": 607, "Lampent": 608, "Chandelure": 609,
      
      // Noms alternatifs
      "Axoloto": 194, // Wooper
      "Loupio": 170,  // Chinchou
      "Poissirene": 116 // Horsea
    };
    
    return mapping[name] || 0;
  }

  /**
   * Convertir un ID de Pokémon en nom
   */
  static pokemonIdToName(id: number): string {
    const reverseMapping: { [key: number]: string } = {
      1: "Bulbasaur", 2: "Ivysaur", 3: "Venusaur",
      4: "Charmander", 5: "Charmeleon", 6: "Charizard",
      7: "Squirtle", 8: "Wartortle", 9: "Blastoise",
      10: "Caterpie", 11: "Metapod", 12: "Butterfree",
      13: "Weedle", 14: "Kakuna", 15: "Beedrill",
      16: "Pidgey", 17: "Pidgeotto", 18: "Pidgeot",
      19: "Rattata", 20: "Raticate",
      25: "Pikachu", 26: "Raichu",
      // ... ajouter plus selon tes besoins
      129: "Magikarp", 130: "Gyarados",
      170: "Chinchou", 171: "Lanturn",
      194: "Wooper", 195: "Quagsire"
    };
    
    return reverseMapping[id] || `Pokémon #${id}`;
  }

  // ================================================================================================
  // CALCULS DE COMBAT
  // ================================================================================================

  /**
   * Calculer l'efficacité d'un type contre un autre
   */
  static getTypeEffectiveness(attackType: string, defenseType: string): number {
    // Utiliser la configuration centralisée
    const config = BATTLE_CONFIG.TYPE_EFFECTIVENESS;
    
    // Vérifier immunité
const immunities = config.IMMUNITIES[attackType as PokemonType];
    if (immunities && immunities.includes(defenseType)) {
      return 0;
    }

    // Vérifier super efficace
const superEffective = config.SUPER_EFFECTIVE[attackType as PokemonType];
    if (superEffective && superEffective.includes(defenseType)) {
      return 2.0;
    }

    // Vérifier peu efficace
const notVeryEffective = config.NOT_VERY_EFFECTIVE[attackType as PokemonType];
    if (notVeryEffective && notVeryEffective.includes(defenseType)) {
      return 0.5;
    }

    return 1.0;
  }

  /**
   * Calculer l'efficacité totale contre un Pokémon multi-type
   */
  static getTotalTypeEffectiveness(attackType: string, defenseTypes: string[]): number {
    let totalEffectiveness = 1.0;
    
    for (const defenseType of defenseTypes) {
      totalEffectiveness *= this.getTypeEffectiveness(attackType, defenseType);
    }
    
    return totalEffectiveness;
  }

  /**
   * Calculer les stats d'un Pokémon avec nature
   */
  static applyNatureModifier(stat: number, nature: string, statName: string): number {
    const natures: { [key: string]: { increased?: string; decreased?: string } } = {
      "Hardy": {},
      "Lonely": { increased: "attack", decreased: "defense" },
      "Brave": { increased: "attack", decreased: "speed" },
      "Adamant": { increased: "attack", decreased: "specialAttack" },
      "Naughty": { increased: "attack", decreased: "specialDefense" },
      "Bold": { increased: "defense", decreased: "attack" },
      "Docile": {},
      "Relaxed": { increased: "defense", decreased: "speed" },
      "Impish": { increased: "defense", decreased: "specialAttack" },
      "Lax": { increased: "defense", decreased: "specialDefense" },
      "Timid": { increased: "speed", decreased: "attack" },
      "Hasty": { increased: "speed", decreased: "defense" },
      "Serious": {},
      "Jolly": { increased: "speed", decreased: "specialAttack" },
      "Naive": { increased: "speed", decreased: "specialDefense" },
      "Modest": { increased: "specialAttack", decreased: "attack" },
      "Mild": { increased: "specialAttack", decreased: "defense" },
      "Quiet": { increased: "specialAttack", decreased: "speed" },
      "Bashful": {},
      "Rash": { increased: "specialAttack", decreased: "specialDefense" },
      "Calm": { increased: "specialDefense", decreased: "attack" },
      "Gentle": { increased: "specialDefense", decreased: "defense" },
      "Sassy": { increased: "specialDefense", decreased: "speed" },
      "Careful": { increased: "specialDefense", decreased: "specialAttack" },
      "Quirky": {}
    };

    const natureData = natures[nature];
    if (!natureData) return stat;

    if (natureData.increased === statName) {
      return Math.floor(stat * 1.1);
    } else if (natureData.decreased === statName) {
      return Math.floor(stat * 0.9);
    }

    return stat;
  }

  /**
   * Calculer les dégâts de base d'une attaque
   */
  static calculateBaseDamage(
    attackerLevel: number,
    attackStat: number,
    defenseStat: number,
    movePower: number
  ): number {
    if (movePower === 0) return 0;

    // Formule Pokémon officielle simplifiée
    const damage = Math.floor(
      (((2 * attackerLevel + 10) / 250) * (attackStat / defenseStat) * movePower + 2)
    );

    return Math.max(1, damage);
  }

  /**
   * Appliquer tous les modificateurs de dégâts
   */
  static applyDamageModifiers(
    baseDamage: number,
    attackType: string,
    attackerTypes: string[],
    defenderTypes: string[],
    isCritical: boolean = false,
    weather: string = "none"
  ): number {
    let finalDamage = baseDamage;

    // STAB (Same Type Attack Bonus)
    if (attackerTypes.includes(attackType)) {
      finalDamage *= BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_MULTIPLIERS.STAB;
    }

    // Efficacité des types
    const effectiveness = this.getTotalTypeEffectiveness(attackType, defenderTypes);
    finalDamage *= effectiveness;

    // Coup critique
    if (isCritical) {
      finalDamage *= BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_MULTIPLIERS.CRITICAL;
    }

    // Modificateurs météo
    finalDamage = this.applyWeatherModifiers(finalDamage, attackType, weather);

    // Variation aléatoire
    const variance = BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_VARIANCE;
    const randomFactor = variance.MIN + Math.random() * (variance.MAX - variance.MIN);
    finalDamage *= randomFactor;

    return Math.max(1, Math.floor(finalDamage));
  }

  /**
   * Appliquer les modificateurs météo
   */
  static applyWeatherModifiers(damage: number, moveType: string, weather: string): number {
    const weatherEffects = BATTLE_CONFIG.WEATHER_EFFECTS;
    
    switch (weather) {
      case "rain":
        if (moveType === "Water") return damage * weatherEffects.RAIN.water_boost;
        if (moveType === "Fire") return damage * weatherEffects.RAIN.fire_nerf;
        break;
        
      case "sun":
        if (moveType === "Fire") return damage * weatherEffects.SUN.fire_boost;
        if (moveType === "Water") return damage * weatherEffects.SUN.water_nerf;
        break;
    }
    
    return damage;
  }

  // ================================================================================================
  // UTILITAIRES DE STATUT
  // ================================================================================================

  /**
   * Vérifier si un Pokémon peut agir (pas paralysé, endormi, etc.)
   */
  static canPokemonAct(pokemon: BattlePokemon): { canAct: boolean; reason?: string } {
    switch (pokemon.statusCondition) {
      case "sleep":
        // Chance de se réveiller
        if (Math.random() < BATTLE_CONFIG.STATUS_CONDITIONS.SLEEP_WAKE_CHANCE) {
          pokemon.statusCondition = "normal";
          return { canAct: true, reason: "woke_up" };
        }
        return { canAct: false, reason: "sleeping" };
        
      case "freeze":
        // Chance de dégeler
        if (Math.random() < BATTLE_CONFIG.STATUS_CONDITIONS.PARALYSIS_FREEZE_CHANCE) {
          pokemon.statusCondition = "normal";
          return { canAct: true, reason: "thawed" };
        }
        return { canAct: false, reason: "frozen" };
        
      case "paralysis":
        // Chance d'être paralysé
        if (Math.random() < BATTLE_CONFIG.STATUS_CONDITIONS.PARALYSIS_FREEZE_CHANCE) {
          return { canAct: false, reason: "paralyzed" };
        }
        return { canAct: true };
        
      case "confusion":
        // Chance de se blesser soi-même
        if (Math.random() < BATTLE_CONFIG.STATUS_CONDITIONS.CONFUSION_SELF_HIT_CHANCE) {
          return { canAct: false, reason: "confused_self_hit" };
        }
        return { canAct: true };
        
      default:
        return { canAct: true };
    }
  }

  /**
   * Appliquer les dégâts de statut en fin de tour
   */
  static applyStatusDamage(pokemon: BattlePokemon): number {
    let damage = 0;
    
    switch (pokemon.statusCondition) {
      case "poison":
        damage = Math.floor(pokemon.maxHp * BATTLE_CONFIG.STATUS_CONDITIONS.POISON_DAMAGE);
        break;
        
      case "burn":
        damage = Math.floor(pokemon.maxHp * BATTLE_CONFIG.STATUS_CONDITIONS.BURN_DAMAGE);
        break;
        
      case "badly_poison":
        // Toxic - dégâts qui augmentent
        damage = Math.floor(pokemon.maxHp * BATTLE_CONFIG.STATUS_CONDITIONS.POISON_DAMAGE);
        // Ici tu pourrais tracker le nombre de tours pour augmenter les dégâts
        break;
    }
    
    if (damage > 0) {
      pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
    }
    
    return damage;
  }

  // ================================================================================================
  // FORMATTAGE ET MESSAGES
  // ================================================================================================

  /**
   * Formater les messages de combat avec des variables
   */
  static formatBattleMessage(template: string, vars: { [key: string]: any }): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] || match;
    });
  }

  /**
   * Obtenir le message d'efficacité approprié
   */
  static getEffectivenessMessage(effectiveness: number, targetName: string): string {
    const messages = BATTLE_CONFIG.BATTLE_MESSAGES.EFFECTIVENESS;
    
    if (effectiveness === 0) {
      return this.formatBattleMessage(messages.NO_EFFECT, { target: targetName });
    } else if (effectiveness > 1) {
      return messages.SUPER;
    } else if (effectiveness < 1) {
      return messages.NOT_VERY;
    }
    
    return "";
  }

  /**
   * Générer un résumé de combat
   */
  static generateBattleSummary(state: BattleState): string {
    const duration = state.turnNumber;
    const winner = state.winner === state.player1Id ? state.player1Name : state.player2Name;
    const result = state.phase;
    
    let summary = `Combat terminé en ${duration} tours. `;
    
    switch (result) {
      case "victory":
        summary += `${winner} remporte la victoire !`;
        if (state.expGained > 0) {
          summary += ` ${state.expGained} XP gagnés.`;
        }
        break;
        
      case "defeat":
        summary += `${winner} a été battu.`;
        break;
        
      case "fled":
        summary += `${state.player1Name} a pris la fuite !`;
        break;
        
      case "capture":
        summary += `${state.player2Pokemon.name} a été capturé !`;
        break;
        
      default:
        summary += `Résultat: ${result}`;
    }
    
    return summary;
  }

  // ================================================================================================
  // VALIDATION ET VÉRIFICATIONS
  // ================================================================================================

  /**
   * Valider les données d'un Pokémon de combat
   */
  static validateBattlePokemon(pokemon: BattlePokemon): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!pokemon.name || pokemon.name.trim() === "") {
      errors.push("Nom du Pokémon manquant");
    }
    
    if (pokemon.level < 1 || pokemon.level > 100) {
      errors.push("Niveau invalide (doit être entre 1 et 100)");
    }
    
    if (pokemon.currentHp < 0 || pokemon.currentHp > pokemon.maxHp) {
      errors.push("PV actuels invalides");
    }
    
    if (pokemon.maxHp <= 0) {
      errors.push("PV maximum invalides");
    }
    
    if (pokemon.types.length === 0 || pokemon.types.length > 2) {
      errors.push("Nombre de types invalide (1 ou 2 requis)");
    }
    
    if (pokemon.moves.length === 0 || pokemon.moves.length > 4) {
      errors.push("Nombre d'attaques invalide (1 à 4 requis)");
    }
    
    // Vérifier les stats
    const stats = [pokemon.attack, pokemon.defense, pokemon.specialAttack, pokemon.specialDefense, pokemon.speed];
    if (stats.some(stat => stat <= 0 || stat > 999)) {
      errors.push("Statistiques invalides");
    }
    
    // Vérifier les modificateurs de stats
    const stages = [
      pokemon.attackStage, pokemon.defenseStage, pokemon.speedStage,
      pokemon.specialAttackStage, pokemon.specialDefenseStage,
      pokemon.accuracyStage, pokemon.evasionStage
    ];
    if (stages.some(stage => stage < -6 || stage > 6)) {
      errors.push("Modificateurs de stats hors limites (-6 à +6)");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifier si une attaque est valide
   */
  static isValidMove(moveId: string, pokemon: BattlePokemon): boolean {
    return pokemon.moves.includes(moveId);
  }

  /**
   * Calculer la précision finale d'une attaque
   */
  static calculateFinalAccuracy(
    baseAccuracy: number,
    attackerAccuracyStage: number,
    defenderEvasionStage: number
  ): number {
    const accuracyMod = Math.max(-6, Math.min(6, attackerAccuracyStage));
    const evasionMod = Math.max(-6, Math.min(6, defenderEvasionStage));
    
    const accuracyMultiplier = accuracyMod > 0 ? (3 + accuracyMod) / 3 : 3 / (3 - accuracyMod);
    const evasionMultiplier = evasionMod > 0 ? 3 / (3 + evasionMod) : (3 - evasionMod) / 3;
    
    return Math.min(100, baseAccuracy * accuracyMultiplier * evasionMultiplier);
  }

  // ================================================================================================
  // UTILITAIRES DE DEBUG
  // ================================================================================================

  /**
   * Créer un rapport détaillé d'un calcul de dégâts
   */
  static createDamageReport(
    attacker: BattlePokemon,
    defender: BattlePokemon,
    movePower: number,
    moveType: string,
    finalDamage: number
  ): string {
    if (!BATTLE_CONFIG.DEBUG.LOG_DAMAGE_CALCULATIONS) {
      return "";
    }
    
    const effectiveness = this.getTotalTypeEffectiveness(moveType, Array.from(defender.types));
    const hasSTAB = attacker.types.includes(moveType);
    
    return `
🎯 CALCUL DE DÉGÂTS:
├─ Attaquant: ${attacker.name} (Niv.${attacker.level})
├─ Défenseur: ${defender.name} (Niv.${defender.level})
├─ Attaque: Type ${moveType}, Puissance ${movePower}
├─ Efficacité: ${effectiveness}x
├─ STAB: ${hasSTAB ? 'Oui' : 'Non'}
└─ Dégâts finaux: ${finalDamage}
    `.trim();
  }

  /**
   * Logger les décisions de l'IA
   */
  static logAIDecision(decision: string, reasoning: string): void {
    if (BATTLE_CONFIG.DEBUG.LOG_AI_DECISIONS) {
      console.log(`🤖 IA: ${decision} | Raison: ${reasoning}`);
    }
  }
}

export default BattleHelpers;
