// server/src/config/battleConfig.ts
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
