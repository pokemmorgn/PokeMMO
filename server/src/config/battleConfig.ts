// server/src/config/battleConfig.ts

// ================================================================================================
// TYPES ET INTERFACES
// ================================================================================================
type PokemonType = 'Normal' | 'Fighting' | 'Poison' | 'Ground' | 'Electric' | 'Psychic' | 
                   'Fire' | 'Water' | 'Grass' | 'Ice' | 'Flying' | 'Bug' | 'Rock' | 'Ghost' | 
                   'Dragon' | 'Dark' | 'Steel';

export const BATTLE_CONFIG = {
  // ================================================================================================
  // TEMPS ET LIMITES
  // ================================================================================================
  TURN_TIME_LIMIT: 30, // secondes par tour
  BATTLE_MAX_DURATION: 300, // 5 minutes max
  BATTLE_ROOM_CLEANUP_DELAY: 10000, // 10 secondes après la fin
  
  // ================================================================================================
  // TAUX DE RENCONTRES
  // ================================================================================================
  DEFAULT_ENCOUNTER_RATE: 0.1, // 10% par défaut
  ENCOUNTER_RATES: {
    grass: 0.1,           // Herbe haute
    long_grass: 0.15,     // Herbe très haute
    fishing: 0.3,         // Pêche
    surfing: 0.2,         // Surf
    cave: 0.12,           // Grottes
    water: 0.08,          // Eau peu profonde
    special: 0.05         // Zones spéciales
  },
  
  // Modificateurs de taux selon conditions
  ENCOUNTER_MODIFIERS: {
    timeOfDay: {
      day: 1.0,
      night: 1.2         // +20% la nuit
    },
    weather: {
      clear: 1.0,
      rain: 1.3,         // +30% sous la pluie
      storm: 1.5,        // +50% pendant l'orage
      snow: 0.8,         // -20% dans la neige
      fog: 1.1           // +10% dans le brouillard
    },
    repel: {
      none: 1.0,
      active: 0.0        // Aucune rencontre avec Repousse
    }
  },

  // ================================================================================================
  // SYSTÈME DE CAPTURE
  // ================================================================================================
  CAPTURE_RATES: {
    LOW_HP_BONUS: 2.0,         // Bonus si PV < 20%
    CRITICAL_HP_BONUS: 3.0,    // Bonus si PV < 5%
    STATUS_BONUS: 1.5,         // Bonus si statut anormal
    SLEEP_FREEZE_BONUS: 2.0,   // Bonus sommeil/gel
    CRITICAL_CAPTURE: 0.01,    // 1% de chance de capture critique
    
    // Modificateurs selon la Ball
    BALL_MODIFIERS: {
      poke_ball: 1.0,
      great_ball: 1.5,
      ultra_ball: 2.0,
      master_ball: 255.0,      // Toujours réussie
      safari_ball: 1.5,
      net_ball: 3.0,           // Bug/Water
      nest_ball: 4.0,          // Pokémon faible niveau
      repeat_ball: 3.5,        // Déjà capturé
      timer_ball: 4.0,         // Combat long
      quick_ball: 5.0,         // Premier tour
      dusk_ball: 3.5,          // Nuit/grotte
      heal_ball: 1.0,
      luxury_ball: 1.0,
      premier_ball: 1.0
    }
  },

  // ================================================================================================
  // SYSTÈME D'EXPÉRIENCE
  // ================================================================================================
  EXP_FORMULAS: {
    WILD_MULTIPLIER: 1.0,         // Multiplicateur pour Pokémon sauvages
    TRAINER_MULTIPLIER: 1.5,      // Multiplicateur pour dresseurs
    LEVEL_PENALTY_THRESHOLD: 10,  // Malus si différence > 10 niveaux
    LEVEL_PENALTY_RATE: 0.1,      // -10% par niveau de différence
    PARTICIPATION_BONUS: 1.2,     // Bonus si le Pokémon a participé
    TRADE_BONUS: 1.5,             // Bonus pour Pokémon échangés
    LUCKY_EGG_BONUS: 1.5,         // Bonus avec Œuf Chance
    
    // Formule de base: (base_exp * level_opponent) / 7
    BASE_EXP_VALUES: {
      1: 64,    // Bulbasaur, etc.
      2: 142,   // Évolutions intermédiaires
      3: 236,   // Évolutions finales
      4: 300    // Légendaires
    }
  },

  // ================================================================================================
  // SYSTÈME DE COMBAT
  // ================================================================================================
  BATTLE_MECHANICS: {
    STAT_STAGE_LIMITS: [-6, 6],       // Limites des modificateurs de stats
    MAX_MOVES_PER_POKEMON: 4,         // Maximum 4 attaques par Pokémon
    CRITICAL_HIT_CHANCE: 1/24,        // 1/24 chance normale
    HIGH_CRIT_CHANCE: 1/8,            // Attaques à haut taux critique
    
    // Multiplicateurs de dégâts
    DAMAGE_MULTIPLIERS: {
      CRITICAL: 1.5,
      STAB: 1.5,                      // Same Type Attack Bonus
      SUPER_EFFECTIVE: 2.0,
      NOT_VERY_EFFECTIVE: 0.5,
      NO_EFFECT: 0.0,
      BURN_REDUCTION: 0.5             // Réduction d'Attaque si brûlé
    },

    // Variation aléatoire des dégâts
    DAMAGE_VARIANCE: {
      MIN: 0.85,      // 85% minimum
      MAX: 1.0        // 100% maximum
    }
  },

  // ================================================================================================
  // ÉTATS DE STATUT
  // ================================================================================================
  STATUS_CONDITIONS: {
    POISON_DAMAGE: 1/8,               // 1/8 des PV max par tour
    BURN_DAMAGE: 1/16,                // 1/16 des PV max par tour
    SLEEP_WAKE_CHANCE: 0.33,          // 33% de chance de se réveiller
    PARALYSIS_FREEZE_CHANCE: 0.25,    // 25% de chance d'être immobilisé
    CONFUSION_SELF_HIT_CHANCE: 0.33,  // 33% de se blesser soi-même
    CONFUSION_DAMAGE: 40,             // Puissance de l'auto-attaque
    
    // Durées
    SLEEP_DURATION: [1, 3],           // 1-3 tours
    CONFUSION_DURATION: [2, 5],       // 2-5 tours
    TOXIC_INCREMENT: true,            // Poison violent s'aggrave
    
    // Chances d'infliger
    STANDARD_CHANCE: 0.1,             // 10% pour la plupart
    HIGH_CHANCE: 0.3,                 // 30% pour certaines attaques
    GUARANTEED: 1.0                   // 100% pour attaques de statut
  },

  // ================================================================================================
  // SYSTÈME DE PRIORITÉ
  // ================================================================================================
  PRIORITY_SYSTEM: {
    BRACKETS: {
      HIGHEST: 5,     // Helping Hand
      HIGH: 4,        // Protect, Detect
      MEDIUM_HIGH: 3, // Fake Out
      MEDIUM: 2,      // Extremespeed
      LOW: 1,         // Quick Attack, Aqua Jet
      NORMAL: 0,      // Attaques normales
      SLOW: -1,       // Vital Throw
      VERY_SLOW: -6   // Roar, Whirlwind
    },
    
    // En cas d'égalité de priorité, départager par vitesse
    SPEED_TIE_RANDOM: true
  },

  // ================================================================================================
  // MÉTÉO ET CONDITIONS DE TERRAIN
  // ================================================================================================
  WEATHER_EFFECTS: {
    RAIN: {
      water_boost: 1.5,
      fire_nerf: 0.5,
      thunder_accuracy: 100,    // Thunder ne rate jamais
      solar_beam_power: 0.5,    // Solar Beam affaibli
      synthesis_heal: 0.25      // Synthèse moins efficace
    },
    
    SUN: {
      fire_boost: 1.5,
      water_nerf: 0.5,
      solar_beam_instant: true, // Solar Beam en 1 tour
      synthesis_heal: 0.67,     // Synthèse très efficace
      growth_boost: 2           // Croissance +2 au lieu de +1
    },
    
    SANDSTORM: {
      rock_sp_def_boost: 1.5,   // +50% Déf. Spé. pour type Roche
      damage_per_turn: 1/16,    // Dégâts aux non-Roche/Sol/Acier
      weather_ball_power: 100   // Weather Ball puissante
    },
    
    HAIL: {
      damage_per_turn: 1/16,    // Dégâts aux non-Glace
      blizzard_accuracy: 100,   // Blizzard ne rate jamais
      synthesis_heal: 0.25      // Synthèse peu efficace
    }
  },

  // ================================================================================================
  // INTELLIGENCE ARTIFICIELLE
  // ================================================================================================
  AI_BEHAVIOR: {
    DIFFICULTY_LEVELS: {
      WILD: {
        strategy_chance: 0.1,   // 10% de stratégie
        type_knowledge: 0.5,    // 50% de connaissance des types
        switch_chance: 0.0,     // Ne change jamais
        item_use_chance: 0.0    // N'utilise pas d'objets
      },
      
      TRAINER_EASY: {
        strategy_chance: 0.3,
        type_knowledge: 0.7,
        switch_chance: 0.1,
        item_use_chance: 0.1
      },
      
      TRAINER_NORMAL: {
        strategy_chance: 0.6,
        type_knowledge: 0.9,
        switch_chance: 0.3,
        item_use_chance: 0.3
      },
      
      TRAINER_HARD: {
        strategy_chance: 0.9,
        type_knowledge: 1.0,
        switch_chance: 0.5,
        item_use_chance: 0.5
      }
    },
    
    // Logique de sélection d'attaque
    MOVE_SELECTION: {
      prefer_super_effective: 2.0,    // x2 probabilité
      avoid_not_very_effective: 0.3,  // x0.3 probabilité
      prefer_stab: 1.3,               // x1.3 probabilité
      avoid_no_pp: 0.0,               // Jamais si 0 PP
      prefer_status_on_full_hp: 1.5,  // Préfère statut si PV pleins
      prefer_healing_on_low_hp: 3.0   // Préfère soin si PV bas
    }
  },

  // ================================================================================================
  // TYPES ET EFFICACITÉS
  // ================================================================================================
  TYPE_EFFECTIVENESS: {
    // Types immunisés
    IMMUNITIES: {
      "Normal": ["Ghost"],
      "Fighting": ["Ghost"],
      "Poison": ["Steel"],
      "Ground": ["Flying"],
      "Electric": ["Ground"],
      "Psychic": ["Dark"]
    },
    
    // Types super efficaces (2x)
    SUPER_EFFECTIVE: {
      "Fire": ["Grass", "Ice", "Bug", "Steel"],
      "Water": ["Fire", "Ground", "Rock"],
      "Electric": ["Water", "Flying"],
      "Grass": ["Water", "Ground", "Rock"],
      "Ice": ["Grass", "Ground", "Flying", "Dragon"],
      "Fighting": ["Normal", "Ice", "Rock", "Dark", "Steel"],
      "Poison": ["Grass"],
      "Ground": ["Fire", "Electric", "Poison", "Rock", "Steel"],
      "Flying": ["Electric", "Fighting", "Bug", "Grass"],
      "Psychic": ["Fighting", "Poison"],
      "Bug": ["Grass", "Psychic", "Dark"],
      "Rock": ["Fire", "Ice", "Flying", "Bug"],
      "Ghost": ["Psychic", "Ghost"],
      "Dragon": ["Dragon"],
      "Dark": ["Psychic", "Ghost"],
      "Steel": ["Ice", "Rock"]
    },
    
    // Types peu efficaces (0.5x)
    NOT_VERY_EFFECTIVE: {
      "Fire": ["Fire", "Water", "Rock", "Dragon"],
      "Water": ["Water", "Grass", "Dragon"],
      "Electric": ["Electric", "Grass", "Dragon"],
      "Grass": ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"],
      "Ice": ["Fire", "Water", "Ice", "Steel"],
      "Fighting": ["Poison", "Flying", "Psychic", "Bug"],
      "Poison": ["Poison", "Ground", "Rock", "Ghost"],
      "Ground": ["Grass", "Bug"],
      "Flying": ["Electric", "Rock", "Steel"],
      "Psychic": ["Psychic", "Steel"],
      "Bug": ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel"],
      "Rock": ["Fighting", "Ground", "Steel"],
      "Ghost": ["Dark"],
      "Dragon": ["Steel"],
      "Dark": ["Fighting", "Dark"],
      "Steel": ["Fire", "Water", "Electric", "Steel"]
    }
  },

  // ================================================================================================
  // MESSAGES ET TEXTES
  // ================================================================================================
  BATTLE_MESSAGES: {
    EFFECTIVENESS: {
      SUPER: "C'est super efficace !",
      NOT_VERY: "Ce n'est pas très efficace...",
      NO_EFFECT: "Ça n'affecte pas {target} !",
      CRITICAL: "Coup critique !",
      MISS: "L'attaque a échoué !"
    },
    
    STATUS: {
      POISON: "{pokemon} est empoisonné !",
      BURN: "{pokemon} est brûlé !",
      PARALYSIS: "{pokemon} est paralysé !",
      SLEEP: "{pokemon} s'endort !",
      FREEZE: "{pokemon} est gelé !",
      CONFUSION: "{pokemon} est confus !"
    },
    
    BATTLE_FLOW: {
      WILD_APPEARS: "Un {pokemon} sauvage apparaît !",
      TRAINER_SENDS: "{trainer} envoie {pokemon} !",
      GO_POKEMON: "Allez {pokemon} !",
      POKEMON_FAINTED: "{pokemon} est K.O. !",
      GAINED_EXP: "{pokemon} gagne {exp} points d'expérience !",
      LEVEL_UP: "{pokemon} monte au niveau {level} !",
      CAUGHT: "Gotcha ! {pokemon} a été capturé !",
      BROKE_FREE: "Oh non ! {pokemon} s'est échappé !",
      RAN_AWAY: "{player} prend la fuite !",
      CANNOT_RUN: "Impossible de fuir !"
    }
  },

  // ================================================================================================
  // PERFORMANCE ET OPTIMISATION
  // ================================================================================================
  PERFORMANCE: {
    MAX_BATTLE_LOG_SIZE: 100,        // Nombre max de messages conservés
    STATE_UPDATE_INTERVAL: 50,       // ms entre les mises à jour
    DAMAGE_CALCULATION_PRECISION: 1, // Arrondi des dégâts
    STAT_CALCULATION_PRECISION: 1,   // Arrondi des stats
    
    // Cache des calculs
    CACHE_TYPE_EFFECTIVENESS: true,
    CACHE_STAT_CALCULATIONS: true,
    CACHE_MOVE_DATA: true
  },

  // ================================================================================================
  // DÉVELOPPEMENT ET DEBUG
  // ================================================================================================
  DEBUG: {
    LOG_DAMAGE_CALCULATIONS: process.env.NODE_ENV === 'development',
    LOG_AI_DECISIONS: process.env.NODE_ENV === 'development',
    LOG_TYPE_EFFECTIVENESS: process.env.NODE_ENV === 'development',
    ALLOW_FORCE_ENCOUNTERS: process.env.NODE_ENV === 'development',
    SHOW_HIDDEN_STATS: process.env.NODE_ENV === 'development',
    
    // Commandes de debug
    DEBUG_COMMANDS: {
      FORCE_CRITICAL: "force_crit",
      FORCE_MISS: "force_miss",
      FORCE_STATUS: "force_status",
      SET_HP: "set_hp",
      GIVE_EXP: "give_exp",
      FORCE_CAPTURE: "force_capture"
    }
  }
};

// ================================================================================================
// UTILITAIRES DE CONFIGURATION
// ================================================================================================

export class BattleConfigUtils {
  /**
   * Obtient le taux de rencontre pour une zone et des conditions données
   */
  static getEncounterRate(
    method: string, 
    timeOfDay: string, 
    weather: string, 
    hasRepel: boolean = false
  ): number {
    let baseRate = BATTLE_CONFIG.ENCOUNTER_RATES[method as keyof typeof BATTLE_CONFIG.ENCOUNTER_RATES] 
                   || BATTLE_CONFIG.DEFAULT_ENCOUNTER_RATE;
    
    // Modificateurs
    const timeModifier = BATTLE_CONFIG.ENCOUNTER_MODIFIERS.timeOfDay[timeOfDay as keyof typeof BATTLE_CONFIG.ENCOUNTER_MODIFIERS.timeOfDay] || 1.0;
    const weatherModifier = BATTLE_CONFIG.ENCOUNTER_MODIFIERS.weather[weather as keyof typeof BATTLE_CONFIG.ENCOUNTER_MODIFIERS.weather] || 1.0;
    const repelModifier = hasRepel ? BATTLE_CONFIG.ENCOUNTER_MODIFIERS.repel.active : BATTLE_CONFIG.ENCOUNTER_MODIFIERS.repel.none;
    
    return baseRate * timeModifier * weatherModifier * repelModifier;
  }

  /**
   * Calcule l'efficacité d'un type contre un autre
   */
  static getTypeEffectiveness(attackType: string, defendType: string): number {
    // Vérifier immunité
    const immunities = BATTLE_CONFIG.TYPE_EFFECTIVENESS.IMMUNITIES[attackType as keyof typeof BATTLE_CONFIG.TYPE_EFFECTIVENESS.IMMUNITIES];
    if (immunities && immunities.includes(defendType)) {
      return 0;
    }

    // Vérifier super efficace
    const superEffective = BATTLE_CONFIG.TYPE_EFFECTIVENESS.SUPER_EFFECTIVE[attackType as keyof typeof BATTLE_CONFIG.TYPE_EFFECTIVENESS.SUPER_EFFECTIVE];
    if (superEffective && superEffective.includes(defendType)) {
      return 2.0;
    }

    // Vérifier peu efficace
    const notVeryEffective = BATTLE_CONFIG.TYPE_EFFECTIVENESS.NOT_VERY_EFFECTIVE[attackType as keyof typeof BATTLE_CONFIG.TYPE_EFFECTIVENESS.NOT_VERY_EFFECTIVE];
    if (notVeryEffective && notVeryEffective.includes(defendType)) {
      return 0.5;
    }

    // Efficacité normale
    return 1.0;
  }

  /**
   * Calcule l'efficacité totale contre un Pokémon multi-type
   */
  static getTotalTypeEffectiveness(attackType: string, defendTypes: string[]): number {
    let totalEffectiveness = 1.0;
    
    for (const defendType of defendTypes) {
      totalEffectiveness *= this.getTypeEffectiveness(attackType, defendType);
    }
    
    return totalEffectiveness;
  }

  /**
   * Obtient le message d'efficacité approprié
   */
  static getEffectivenessMessage(effectiveness: number): string {
    if (effectiveness === 0) {
      return BATTLE_CONFIG.BATTLE_MESSAGES.EFFECTIVENESS.NO_EFFECT;
    } else if (effectiveness > 1) {
      return BATTLE_CONFIG.BATTLE_MESSAGES.EFFECTIVENESS.SUPER;
    } else if (effectiveness < 1) {
      return BATTLE_CONFIG.BATTLE_MESSAGES.EFFECTIVENESS.NOT_VERY;
    }
    return "";
  }

  /**
   * Formate un message avec des variables
   */
  static formatMessage(template: string, variables: { [key: string]: any }): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Vérifie si une rencontre doit avoir lieu selon les conditions
   */
  static shouldTriggerEncounter(
    method: string,
    timeOfDay: string,
    weather: string,
    hasRepel: boolean = false,
    customRate?: number
  ): boolean {
    const encounterRate = customRate || this.getEncounterRate(method, timeOfDay, weather, hasRepel);
    return Math.random() < encounterRate;
  }

  /**
   * Calcule les dégâts de base avec les formules authentiques
   */
  static calculateBaseDamage(
    attackerLevel: number,
    attackStat: number,
    defenseStat: number,
    movePower: number,
    isPhysical: boolean = true
  ): number {
    if (movePower === 0) return 0;

    // Formule Pokémon officielle
    const levelFactor = (2 * attackerLevel + 10) / 250;
    const damage = Math.floor(levelFactor * (attackStat / defenseStat) * movePower + 2);

    return Math.max(1, damage);
  }

  /**
   * Applique tous les modificateurs de dégâts
   */
  static applyDamageModifiers(
    baseDamage: number,
    options: {
      isCritical?: boolean;
      hasSTAB?: boolean;
      typeEffectiveness?: number;
      weather?: string;
      moveType?: string;
      randomize?: boolean;
    }
  ): number {
    let finalDamage = baseDamage;

    // STAB
    if (options.hasSTAB) {
      finalDamage *= BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_MULTIPLIERS.STAB;
    }

    // Efficacité des types
    if (options.typeEffectiveness !== undefined) {
      finalDamage *= options.typeEffectiveness;
    }

    // Coup critique
    if (options.isCritical) {
      finalDamage *= BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_MULTIPLIERS.CRITICAL;
    }

    // Variation aléatoire
    if (options.randomize !== false) {
      const variance = BATTLE_CONFIG.BATTLE_MECHANICS.DAMAGE_VARIANCE;
      const randomFactor = variance.MIN + Math.random() * (variance.MAX - variance.MIN);
      finalDamage *= randomFactor;
    }

    return Math.max(1, Math.floor(finalDamage));
  }

  /**
   * Détermine si un coup critique a lieu
   */
  static isCriticalHit(highCritRatio: boolean = false): boolean {
    const chance = highCritRatio 
      ? BATTLE_CONFIG.BATTLE_MECHANICS.HIGH_CRIT_CHANCE 
      : BATTLE_CONFIG.BATTLE_MECHANICS.CRITICAL_HIT_CHANCE;
    
    return Math.random() < chance;
  }

  /**
   * Calcule la chance de réussite de capture
   */
  static calculateCaptureChance(
    pokemonCaptureRate: number,
    currentHp: number,
    maxHp: number,
    statusCondition: string,
    ballType: string
  ): number {
    // Modificateur de PV
    const hpRatio = currentHp / maxHp;
    let hpModifier = 1.0;
    
    if (hpRatio <= 0.05) {
      hpModifier = BATTLE_CONFIG.CAPTURE_RATES.CRITICAL_HP_BONUS;
    } else if (hpRatio <= 0.2) {
      hpModifier = BATTLE_CONFIG.CAPTURE_RATES.LOW_HP_BONUS;
    }

    // Modificateur de statut
    let statusModifier = 1.0;
    if (statusCondition === "sleep" || statusCondition === "freeze") {
      statusModifier = BATTLE_CONFIG.CAPTURE_RATES.SLEEP_FREEZE_BONUS;
    } else if (statusCondition !== "normal") {
      statusModifier = BATTLE_CONFIG.CAPTURE_RATES.STATUS_BONUS;
    }

    // Modificateur de Ball
    const ballModifier = BATTLE_CONFIG.CAPTURE_RATES.BALL_MODIFIERS[ballType as keyof typeof BATTLE_CONFIG.CAPTURE_RATES.BALL_MODIFIERS] || 1.0;

    // Calcul final
    const captureChance = (pokemonCaptureRate * hpModifier * statusModifier * ballModifier) / 255;
    
    return Math.min(1.0, captureChance);
  }
}

// Export de la configuration par défaut
export default BATTLE_CONFIG;

console.log("✅ Configuration de combat chargée");
