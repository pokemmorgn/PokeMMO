// server/src/models/PokédexStats.ts
import mongoose, { Schema, Document, Types } from "mongoose";

// ===== INTERFACES OPTIMISÉES =====

export interface IPokédexStats extends Document {
  // === IDENTIFICATION UNIQUE ===
  playerId: string;          // ID du joueur (unique)
  
  // === PROGRESSION GLOBALE (DÉNORMALISÉE) ===
  totalSeen: number;         // Pokémon vus
  totalCaught: number;       // Pokémon capturés
  totalShinies: number;      // Shinies trouvés
  totalEncounters: number;   // Rencontres totales
  totalCaptures: number;     // Captures totales
  
  // === RECORDS & ACHIEVEMENTS ===
  highestLevel: number;      // Plus haut niveau vu/capturé
  longestStreak: number;     // Plus longue série de jours
  currentStreak: number;     // Série actuelle
  lastActiveDate: Date;      // Dernière activité (pour streaks)
  
  // === PROGRESSION PAR TYPE (COMPACT) ===
  typeProgress: Map<string, {
    seen: number;
    caught: number;
  }>;
  
  // === ACTIVITÉ RÉCENTE (SLIDING WINDOW) ===
  weeklyStats: {
    week: string;            // Format: "2024-W01"
    newSeen: number;
    newCaught: number;
    newShinies: number;
  }[];
  
  // === DATES IMPORTANTES ===
  firstDiscovery?: Date;     // Première découverte
  firstCapture?: Date;       // Première capture
  firstShiny?: Date;         // Premier shiny
  lastCalculated: Date;      // Dernière maj des stats
  
  // === MÉTADONNÉES ===
  version: number;           // Version du calcul (migrations)
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES ===
  incrementSeen(pokemonData?: any): Promise<void>;
  incrementCaught(pokemonData?: any, isShiny?: boolean): Promise<void>;
  updateStreak(action: 'seen' | 'caught'): Promise<boolean>;
  recalculateFromEntries(): Promise<void>;
  getCompletionRate(): { seen: number; caught: number; shiny: number };
  addWeeklyActivity(seen: number, caught: number, shinies: number): void;
}

// ===== SCHÉMA MONGOOSE ULTRA-OPTIMISÉ =====

const PokédexStatsSchema = new Schema<IPokédexStats>({
  // === IDENTIFICATION (INDEX UNIQUE) ===
  playerId: { 
    type: String, 
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: (v: string) => v && v.length > 0 && v.length <= 50,
      message: 'PlayerId invalide'
    }
  },
  
  // === COMPTEURS GLOBAUX (INDEXÉS POUR CLASSEMENTS) ===
  totalSeen: { 
    type: Number, 
    default: 0,
    min: [0, 'totalSeen ne peut être négatif'],
    index: -1, // Index descendant pour leaderboards
    validate: {
      validator: Number.isInteger,
      message: 'totalSeen doit être un entier'
    }
  },
  
  totalCaught: { 
    type: Number, 
    default: 0,
    min: [0, 'totalCaught ne peut être négatif'],
    index: -1, // Pour classements
    validate: {
      validator: Number.isInteger,
      message: 'totalCaught doit être un entier'
    }
  },
  
  totalShinies: { 
    type: Number, 
    default: 0,
    min: [0, 'totalShinies ne peut être négatif'],
    index: -1, // Pour classements shinies
    validate: {
      validator: Number.isInteger,
      message: 'totalShinies doit être un entier'
    }
  },
  
  totalEncounters: { 
    type: Number, 
    default: 0,
    min: [0, 'totalEncounters ne peut être négatif'],
    validate: {
      validator: Number.isInteger,
      message: 'totalEncounters doit être un entier'
    }
  },
  
  totalCaptures: { 
    type: Number, 
    default: 0,
    min: [0, 'totalCaptures ne peut être négatif'],
    validate: {
      validator: Number.isInteger,
      message: 'totalCaptures doit être un entier'
    }
  },
  
  // === RECORDS ===
  highestLevel: { 
    type: Number, 
    default: 1,
    min: [1, 'highestLevel minimum: 1'],
    max: [100, 'highestLevel maximum: 100']
  },
  
  longestStreak: { 
    type: Number, 
    default: 0,
    min: [0, 'longestStreak ne peut être négatif'],
    index: -1 // Pour classements streaks
  },
  
  currentStreak: { 
    type: Number, 
    default: 0,
    min: [0, 'currentStreak ne peut être négatif']
  },
  
  lastActiveDate: { 
    type: Date,
    default: Date.now,
    index: -1 // Pour nettoyage des streaks inactives
  },
  
  // === PROGRESSION PAR TYPE (OPTIMISÉE) ===
  typeProgress: {
    type: Schema.Types.Mixed,
    default: () => new Map(),
    validate: {
      validator: function(v: any) {
        if (!(v instanceof Map)) return true; // Peut être objet après désérialisation
        for (const [type, stats] of v) {
          if (typeof type !== 'string' || 
              typeof stats?.seen !== 'number' || 
              typeof stats?.caught !== 'number') {
            return false;
          }
        }
        return true;
      },
      message: 'typeProgress format invalide'
    }
  },
  
  // === ACTIVITÉ HEBDOMADAIRE (LIMITÉE) ===
  weeklyStats: [{
    week: { 
      type: String, 
      required: true,
      match: [/^\d{4}-W\d{2}$/, 'Format semaine invalide (YYYY-WXX)']
    },
    newSeen: { 
      type: Number, 
      default: 0, 
      min: [0, 'newSeen ne peut être négatif'] 
    },
    newCaught: { 
      type: Number, 
      default: 0, 
      min: [0, 'newCaught ne peut être négatif'] 
    },
    newShinies: { 
      type: Number, 
      default: 0, 
      min: [0, 'newShinies ne peut être négatif'] 
    }
  }],
  
  // === DATES IMPORTANTES ===
  firstDiscovery: { 
    type: Date,
    index: -1 // Pour analytics globales
  },
  
  firstCapture: { 
    type: Date,
    index: -1
  },
  
  firstShiny: { 
    type: Date,
    index: -1
  },
  
  lastCalculated: { 
    type: Date, 
    default: Date.now,
    index: -1 // Pour maintenance
  },
  
  // === VERSIONING ===
  version: { 
    type: Number, 
    default: 1,
    min: [1, 'Version minimum: 1']
  }
}, {
  timestamps: true,
  collection: 'pokedex_stats',
  // Optimisations MongoDB
  autoIndex: process.env.NODE_ENV !== 'production',
  bufferCommands: false,
  bufferMaxEntries: 0,
  // Optimisation mémoire
  minimize: false // Garde les champs vides pour cohérence
});

// ===== INDEX OPTIMISÉS =====

// Index principal unique
PokédexStatsSchema.index(
  { playerId: 1 }, 
  { 
    unique: true,
    name: 'player_unique'
  }
);

// Index pour leaderboards globaux
PokédexStatsSchema.index(
  { totalCaught: -1, totalSeen: -1 },
  { name: 'global_leaderboard' }
);

// Index pour leaderboards shinies
PokédexStatsSchema.index(
  { totalShinies: -1, totalCaught: -1 },
  { 
    name: 'shiny_leaderboard',
    partialFilterExpression: { totalShinies: { $gt: 0 } }
  }
);

// Index pour streaks actives
PokédexStatsSchema.index(
  { currentStreak: -1, lastActiveDate: -1 },
  { 
    name: 'active_streaks',
    partialFilterExpression: { currentStreak: { $gt: 0 } }
  }
);

// Index pour maintenance
PokédexStatsSchema.index(
  { lastCalculated: 1 },
  { name: 'maintenance_cleanup' }
);

// ===== VALIDATIONS AVANCÉES =====

// Validation: Cohérence des compteurs
PokédexStatsSchema.pre('validate', function(next) {
  if (this.totalCaught > this.totalSeen) {
    return next(new Error('totalCaught ne peut dépasser totalSeen'));
  }
  
  if (this.totalCaptures < this.totalCaught) {
    return next(new Error('totalCaptures doit être >= totalCaught'));
  }
  
  if (this.totalEncounters < this.totalSeen) {
    return next(new Error('totalEncounters doit être >= totalSeen'));
  }
  
  next();
});

// Validation: Gestion des streaks
PokédexStatsSchema.pre('validate', function(next) {
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  next();
});

// Middleware: Nettoyage automatique weeklyStats
PokédexStatsSchema.pre('save', function(next) {
  // Garder seulement les 12 dernières semaines
  if (this.weeklyStats && this.weeklyStats.length > 12) {
    this.weeklyStats = this.weeklyStats
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12);
  }
  
  this.lastCalculated = new Date();
  next();
});

// ===== MÉTHODES D'INSTANCE OPTIMISÉES =====

/**
 * Incrémente les statistiques de découverte
 */
PokédexStatsSchema.methods.incrementSeen = async function(
  this: IPokédexStats,
  pokemonData?: { types?: string[]; level?: number }
): Promise<void> {
  const now = new Date();
  
  // Première découverte
  if (this.totalSeen === 0) {
    this.firstDiscovery = now;
  }
  
  // Incrémenter compteurs
  this.totalSeen += 1;
  this.totalEncounters += 1;
  
  // Mettre à jour niveau max
  if (pokemonData?.level && pokemonData.level > this.highestLevel) {
    this.highestLevel = pokemonData.level;
  }
  
  // Progression par type
  if (pokemonData?.types) {
    for (const type of pokemonData.types) {
      const typeKey = type.toLowerCase();
      const current = this.typeProgress.get(typeKey) || { seen: 0, caught: 0 };
      current.seen += 1;
      this.typeProgress.set(typeKey, current);
    }
  }
  
  // Streak de découverte
  await this.updateStreak('seen');
  
  // Activité hebdomadaire
  this.addWeeklyActivity(1, 0, 0);
  
  await this.save();
};

/**
 * Incrémente les statistiques de capture
 */
PokédexStatsSchema.methods.incrementCaught = async function(
  this: IPokédexStats,
  pokemonData?: { types?: string[]; level?: number },
  isShiny: boolean = false
): Promise<void> {
  const now = new Date();
  
  // Première capture
  if (this.totalCaught === 0) {
    this.firstCapture = now;
  }
  
  // Premier shiny
  if (isShiny && this.totalShinies === 0) {
    this.firstShiny = now;
  }
  
  // Incrémenter compteurs
  this.totalCaught += 1;
  this.totalCaptures += 1;
  
  if (isShiny) {
    this.totalShinies += 1;
  }
  
  // Progression par type
  if (pokemonData?.types) {
    for (const type of pokemonData.types) {
      const typeKey = type.toLowerCase();
      const current = this.typeProgress.get(typeKey) || { seen: 0, caught: 0 };
      current.caught += 1;
      this.typeProgress.set(typeKey, current);
    }
  }
  
  // Streak de capture
  await this.updateStreak('caught');
  
  // Activité hebdomadaire
  this.addWeeklyActivity(0, 1, isShiny ? 1 : 0);
  
  await this.save();
};

/**
 * Met à jour les streaks quotidiennes
 */
PokédexStatsSchema.methods.updateStreak = async function(
  this: IPokédexStats,
  action: 'seen' | 'caught'
): Promise<boolean> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  const lastActiveStr = this.lastActiveDate?.toDateString();
  let streakContinued = false;
  
  // Pas d'activité aujourd'hui encore
  if (lastActiveStr !== today) {
    if (lastActiveStr === yesterdayStr) {
      // Continuation de streak
      this.currentStreak += 1;
      streakContinued = true;
    } else {
      // Streak cassée ou nouvelle
      this.currentStreak = 1;
    }
    
    this.lastActiveDate = now;
    
    // Nouveau record
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
  }
  
  return streakContinued;
};

/**
 * Ajoute l'activité à la semaine courante
 */
PokédexStatsSchema.methods.addWeeklyActivity = function(
  this: IPokédexStats,
  seen: number,
  caught: number,
  shinies: number
): void {
  const now = new Date();
  const year = now.getFullYear();
  const week = this.getWeekNumber(now);
  const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
  
  // Chercher semaine courante
  let currentWeek = this.weeklyStats.find(w => w.week === weekKey);
  
  if (currentWeek) {
    currentWeek.newSeen += seen;
    currentWeek.newCaught += caught;
    currentWeek.newShinies += shinies;
  } else {
    // Nouvelle semaine
    this.weeklyStats.push({
      week: weekKey,
      newSeen: seen,
      newCaught: caught,
      newShinies: shinies
    });
    
    // Limiter à 12 semaines (sera nettoyé au save)
  }
};

/**
 * Calcule le taux de complétion
 */
PokédexStatsSchema.methods.getCompletionRate = function(this: IPokédxStats): {
  seen: number;
  caught: number;
  shiny: number;
} {
  const TOTAL_POKEMON = 151; // Kanto de base, configurable
  
  return {
    seen: this.totalSeen > 0 ? Math.round((this.totalSeen / TOTAL_POKEMON) * 100 * 100) / 100 : 0,
    caught: this.totalCaught > 0 ? Math.round((this.totalCaught / TOTAL_POKEMON) * 100 * 100) / 100 : 0,
    shiny: this.totalShinies > 0 ? Math.round((this.totalShinies / this.totalCaught) * 100 * 100) / 100 : 0
  };
};

/**
 * Recalcule depuis les entrées (maintenance)
 */
PokédxStatsSchema.methods.recalculateFromEntries = async function(this: IPokédxStats): Promise<void> {
  // Import dynamique pour éviter circular dependency
  const { PokédxEntry } = await import('./PokédxEntry');
  
  console.log(`🔄 [PokédxStats] Recalcul complet pour ${this.playerId}`);
  
  // Récupérer statistiques via agrégation
  const [stats] = await PokédxEntry.aggregate([
    { $match: { playerId: this.playerId } },
    {
      $group: {
        _id: null,
        totalSeen: { $sum: { $cond: ['$isSeen', 1, 0] } },
        totalCaught: { $sum: { $cond: ['$isCaught', 1, 0] } },
        totalShinies: { $sum: { $cond: ['$hasShiny', 1, 0] } },
        totalEncounters: { $sum: '$timesEncountered' },
        totalCaptures: { $sum: '$timesCaught' },
        highestLevel: { $max: '$bestLevel' },
        firstSeen: { $min: '$firstSeenAt' },
        firstCaught: { $min: '$firstCaughtAt' }
      }
    }
  ]);
  
  if (stats) {
    // Mise à jour des compteurs
    this.totalSeen = stats.totalSeen || 0;
    this.totalCaught = stats.totalCaught || 0;
    this.totalShinies = stats.totalShinies || 0;
    this.totalEncounters = stats.totalEncounters || 0;
    this.totalCaptures = stats.totalCaptures || 0;
    this.highestLevel = stats.highestLevel || 1;
    
    // Dates importantes
    if (stats.firstSeen) this.firstDiscovery = stats.firstSeen;
    if (stats.firstCaught) this.firstCapture = stats.firstCaught;
    
    this.version += 1;
    await this.save();
  }
  
  console.log(`✅ [PokédxStats] Recalcul terminé: ${this.totalSeen}/${this.totalCaught}`);
};

/**
 * Utilitaire: Calcul numéro de semaine
 */
PokédxStatsSchema.methods.getWeekNumber = function(date: Date): number {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((today.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil(dayOfYear / 7);
};

// ===== MÉTHODES STATIQUES OPTIMISÉES =====

/**
 * Trouve ou crée les stats d'un joueur
 */
PokédxStatsSchema.statics.findOrCreate = async function(playerId: string): Promise<IPokédxStats> {
  if (!playerId) {
    throw new Error('PlayerId requis pour findOrCreate');
  }
  
  const result = await this.findOneAndUpdate(
    { playerId },
    {
      $setOnInsert: {
        playerId,
        totalSeen: 0,
        totalCaught: 0,
        totalShinies: 0,
        totalEncounters: 0,
        totalCaptures: 0,
        highestLevel: 1,
        longestStreak: 0,
        currentStreak: 0,
        lastActiveDate: new Date(),
        typeProgress: new Map(),
        weeklyStats: [],
        version: 1
      }
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
  
  return result;
};

/**
 * Leaderboard global optimisé
 */
PokédxStatsSchema.statics.getLeaderboard = async function(
  type: 'caught' | 'seen' | 'shinies' | 'streaks' = 'caught',
  limit: number = 10
): Promise<any[]> {
  const sortField = {
    caught: 'totalCaught',
    seen: 'totalSeen',
    shinies: 'totalShinies',
    streaks: 'longestStreak'
  }[type];
  
  return this.find({
    [sortField]: { $gt: 0 }
  })
  .sort({ [sortField]: -1, totalCaught: -1 }) // Tie-breaker
  .limit(Math.min(limit, 100)) // Max 100
  .select(`playerId ${sortField} totalCaught totalSeen`)
  .lean()
  .exec();
};

/**
 * Nettoyage des streaks inactives (maintenance)
 */
PokédxStatsSchema.statics.cleanupInactiveStreaks = async function(daysInactive: number = 2): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);
  
  const result = await this.updateMany(
    {
      currentStreak: { $gt: 0 },
      lastActiveDate: { $lt: cutoff }
    },
    {
      $set: { currentStreak: 0 }
    }
  );
  
  console.log(`🧹 [PokédxStats] ${result.modifiedCount} streaks inactives nettoyées`);
  return result.modifiedCount;
};

// ===== EXPORT =====
export const PokédxStats = mongoose.model<IPokédxStats>('PokédxStats', PokédxStatsSchema);
export default PokédxStats;

// Types pour export
export type PokédxStatsDocument = IPokédxStats;
