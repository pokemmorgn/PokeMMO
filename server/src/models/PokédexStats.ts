// server/src/models/PokédexStats.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== INTERFACES =====

export interface IPokédexStats extends Document {
  // === IDENTIFICATION ===
  playerId: string;          // ID du joueur (unique)
  
  // === PROGRESSION GLOBALE ===
  totalSeen: number;         // Nombre total de Pokémon vus
  totalCaught: number;       // Nombre total de Pokémon capturés
  totalPokemon: number;      // Nombre total de Pokémon dans le jeu (pour %)
  
  // === POURCENTAGES DE COMPLÉTION ===
  seenPercentage: number;    // % de Pokémon vus (calculé auto)
  caughtPercentage: number;  // % de Pokémon capturés (calculé auto)
  
  // === STATISTIQUES PAR TYPE ===
  typeStats: {
    [typeName: string]: {
      seen: number;
      caught: number;
      total: number;       // Nombre total de ce type dans le jeu
    };
  };
  
  // === STATISTIQUES PAR RÉGION ===
  regionStats: {
    [regionName: string]: {
      seen: number;
      caught: number;
      total: number;       // Nombre total dans cette région
    };
  };
  
  // === RECORDS & ACCOMPLISSEMENTS ===
  records: {
    // Shiny
    totalShinyFound: number;
    totalShinyCaught: number;
    firstShinyDate?: Date;
    lastShinyDate?: Date;
    
    // Niveaux
    highestLevelSeen: number;
    highestLevelCaught: number;
    
    // Temps
    fastestCapture: number;    // Temps en secondes pour capturer (record)
    longestHunt: number;       // Plus longue chasse (rencontres avant capture)
    
    // Streaks
    currentSeenStreak: number;      // Jours consécutifs avec nouvelle découverte
    longestSeenStreak: number;      // Record de streak
    currentCaughtStreak: number;    // Jours consécutifs avec capture
    longestCaughtStreak: number;    // Record de streak
  };
  
  // === STATISTIQUES TEMPORELLES ===
  activity: {
    lastDiscoveryDate?: Date;     // Dernière nouvelle découverte
    lastCaptureDate?: Date;       // Dernière capture
    mostActiveDay: string;        // Jour de la semaine le plus actif
    mostActiveHour: number;       // Heure la plus active (0-23)
    
    // Évolution dans le temps
    weeklyProgress: {
      week: string;               // Format: "2024-W01"
      newSeen: number;
      newCaught: number;
    }[];
    
    monthlyProgress: {
      month: string;              // Format: "2024-01"
      newSeen: number;
      newCaught: number;
    }[];
  };
  
  // === ACCOMPLISSEMENTS SPÉCIAUX ===
  achievements: {
    [achievementId: string]: {
      unlocked: boolean;
      unlockedAt?: Date;
      progress: number;           // 0-100 pour achievements progressifs
      data?: any;                 // Données spécifiques à l'achievement
    };
  };
  
  // === MÉTADONNÉES ===
  lastCalculated: Date;         // Dernière mise à jour des stats
  calculationVersion: number;   // Version du calcul (pour migrations)
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES D'INSTANCE ===
  recalculateStats(): Promise<void>;
  updateFromEntry(entry: any): Promise<void>;
  getCompletionSummary(): any;
  getProgressSince(date: Date): any;
  checkNewAchievements(): Promise<string[]>;
  addWeeklyProgress(newSeen: number, newCaught: number): void;
  getRecentActivity(days: number): any;
}

// ===== SCHÉMA MONGOOSE =====

const PokédexStatsSchema = new Schema<IPokédexStats>({
  // === IDENTIFICATION ===
  playerId: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  
  // === PROGRESSION GLOBALE ===
  totalSeen: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  totalCaught: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  totalPokemon: { 
    type: Number, 
    default: 151, // Kanto par défaut
    min: 1 
  },
  
  // === POURCENTAGES ===
  seenPercentage: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  caughtPercentage: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  
  // === STATS PAR TYPE ===
  typeStats: {
    type: Map,
    of: {
      seen: { type: Number, default: 0, min: 0 },
      caught: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 }
    },
    default: () => new Map()
  },
  
  // === STATS PAR RÉGION ===
  regionStats: {
    type: Map,
    of: {
      seen: { type: Number, default: 0, min: 0 },
      caught: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 }
    },
    default: () => new Map()
  },
  
  // === RECORDS ===
  records: {
    totalShinyFound: { type: Number, default: 0, min: 0 },
    totalShinyCaught: { type: Number, default: 0, min: 0 },
    firstShinyDate: { type: Date },
    lastShinyDate: { type: Date },
    
    highestLevelSeen: { type: Number, default: 1, min: 1, max: 100 },
    highestLevelCaught: { type: Number, default: 1, min: 1, max: 100 },
    
    fastestCapture: { type: Number, default: Infinity },
    longestHunt: { type: Number, default: 0, min: 0 },
    
    currentSeenStreak: { type: Number, default: 0, min: 0 },
    longestSeenStreak: { type: Number, default: 0, min: 0 },
    currentCaughtStreak: { type: Number, default: 0, min: 0 },
    longestCaughtStreak: { type: Number, default: 0, min: 0 }
  },
  
  // === ACTIVITÉ ===
  activity: {
    lastDiscoveryDate: { type: Date },
    lastCaptureDate: { type: Date },
    mostActiveDay: { 
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: 'saturday'
    },
    mostActiveHour: { type: Number, min: 0, max: 23, default: 14 },
    
    weeklyProgress: [{
      week: { type: String, required: true }, // "2024-W01"
      newSeen: { type: Number, default: 0, min: 0 },
      newCaught: { type: Number, default: 0, min: 0 }
    }],
    
    monthlyProgress: [{
      month: { type: String, required: true }, // "2024-01"
      newSeen: { type: Number, default: 0, min: 0 },
      newCaught: { type: Number, default: 0, min: 0 }
    }]
  },
  
  // === ACHIEVEMENTS ===
  achievements: {
    type: Map,
    of: {
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date },
      progress: { type: Number, default: 0, min: 0, max: 100 },
      data: { type: Schema.Types.Mixed }
    },
    default: () => new Map()
  },
  
  // === MÉTADONNÉES ===
  lastCalculated: { type: Date, default: Date.now },
  calculationVersion: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'pokedex_stats'
});

// ===== INDEX =====
PokédexStatsSchema.index({ playerId: 1 }, { unique: true });
PokédexStatsSchema.index({ totalCaught: -1 }); // Pour classements
PokédexStatsSchema.index({ totalSeen: -1 });
PokédexStatsSchema.index({ 'records.totalShinyCaught': -1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Calcul automatique des pourcentages
PokédexStatsSchema.pre('save', function(next) {
  if (this.totalPokemon > 0) {
    this.seenPercentage = Math.round((this.totalSeen / this.totalPokemon) * 100 * 100) / 100;
    this.caughtPercentage = Math.round((this.totalCaught / this.totalPokemon) * 100 * 100) / 100;
  }
  
  this.lastCalculated = new Date();
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Recalcule toutes les statistiques depuis zéro
 */
PokédexStatsSchema.methods.recalculateStats = async function(this: IPokédexStats) {
  console.log(`📊 [PokédexStats] Recalcul complet pour joueur ${this.playerId}`);
  
  // Import dynamique pour éviter circular dependency
  const { PokédexEntry } = await import('./PokédexEntry');
  const { getPokemonById } = await import('../data/PokemonData');
  
  // Récupérer toutes les entrées du joueur
  const entries = await PokédexEntry.find({ playerId: this.playerId });
  
  // Reset stats
  this.totalSeen = 0;
  this.totalCaught = 0;
  this.typeStats.clear();
  this.regionStats.clear();
  
  let highestLevelSeen = 1;
  let highestLevelCaught = 1;
  let totalShinyFound = 0;
  let totalShinyCaught = 0;
  let firstShinyDate: Date | undefined;
  let lastShinyDate: Date | undefined;
  
  // Parcourir chaque entrée
  for (const entry of entries) {
    if (entry.isSeen) {
      this.totalSeen++;
      
      // Récupérer données du Pokémon
      const pokemonData = await getPokemonById(entry.pokemonId);
      if (pokemonData) {
        // Stats par type
        for (const type of pokemonData.types) {
          const typeKey = type.toLowerCase();
          if (!this.typeStats.has(typeKey)) {
            this.typeStats.set(typeKey, { seen: 0, caught: 0, total: 0 });
          }
          this.typeStats.get(typeKey)!.seen++;
        }
        
        // Stats par région (basé sur l'ID pour Kanto = 1-151)
        const region = entry.pokemonId <= 151 ? 'kanto' : 'other';
        if (!this.regionStats.has(region)) {
          this.regionStats.set(region, { seen: 0, caught: 0, total: 0 });
        }
        this.regionStats.get(region)!.seen++;
      }
      
      // Niveau le plus élevé vu
      if (entry.firstEncounter?.level && entry.firstEncounter.level > highestLevelSeen) {
        highestLevelSeen = entry.firstEncounter.level;
      }
    }
    
    if (entry.isCaught) {
      this.totalCaught++;
      
      // Récupérer données du Pokémon pour les types
      const pokemonData = await getPokemonById(entry.pokemonId);
      if (pokemonData) {
        // Stats par type (caught)
        for (const type of pokemonData.types) {
          const typeKey = type.toLowerCase();
          if (this.typeStats.has(typeKey)) {
            this.typeStats.get(typeKey)!.caught++;
          }
        }
        
        // Stats par région (caught)
        const region = entry.pokemonId <= 151 ? 'kanto' : 'other';
        if (this.regionStats.has(region)) {
          this.regionStats.get(region)!.caught++;
        }
      }
      
      // Niveau le plus élevé capturé
      if (entry.bestSpecimen?.level && entry.bestSpecimen.level > highestLevelCaught) {
        highestLevelCaught = entry.bestSpecimen.level;
      }
      
      // Stats shiny
      if (entry.bestSpecimen?.isShiny) {
        totalShinyCaught++;
        if (!firstShinyDate || (entry.bestSpecimen.caughtAt && entry.bestSpecimen.caughtAt < firstShinyDate)) {
          firstShinyDate = entry.bestSpecimen.caughtAt;
        }
        if (!lastShinyDate || (entry.bestSpecimen.caughtAt && entry.bestSpecimen.caughtAt > lastShinyDate)) {
          lastShinyDate = entry.bestSpecimen.caughtAt;
        }
      }
    }
  }
  
  // Mettre à jour les records
  this.records.highestLevelSeen = highestLevelSeen;
  this.records.highestLevelCaught = highestLevelCaught;
  this.records.totalShinyCaught = totalShinyCaught;
  this.records.totalShinyFound = totalShinyFound; // Pour l'instant = caught
  
  if (firstShinyDate) this.records.firstShinyDate = firstShinyDate;
  if (lastShinyDate) this.records.lastShinyDate = lastShinyDate;
  
  await this.save();
  console.log(`✅ [PokédexStats] Recalcul terminé: ${this.totalSeen} vus, ${this.totalCaught} capturés`);
};

/**
 * Met à jour les stats suite à une nouvelle entrée
 */
PokédexStatsSchema.methods.updateFromEntry = async function(
  this: IPokédexStats,
  entry: any,
  isNewSeen: boolean = false,
  isNewCaught: boolean = false
) {
  if (isNewSeen) {
    this.totalSeen++;
    this.activity.lastDiscoveryDate = new Date();
  }
  
  if (isNewCaught) {
    this.totalCaught++;
    this.activity.lastCaptureDate = new Date();
  }
  
  await this.save();
};

/**
 * Récupère un résumé de complétion
 */
PokédexStatsSchema.methods.getCompletionSummary = function(this: IPokédexStats) {
  return {
    seen: {
      count: this.totalSeen,
      percentage: this.seenPercentage,
      remaining: this.totalPokemon - this.totalSeen
    },
    caught: {
      count: this.totalCaught,
      percentage: this.caughtPercentage,
      remaining: this.totalPokemon - this.totalCaught
    },
    records: {
      shinies: this.records.totalShinyCaught,
      highestLevel: this.records.highestLevelCaught,
      longestStreak: this.records.longestCaughtStreak
    },
    lastActivity: {
      discovery: this.activity.lastDiscoveryDate,
      capture: this.activity.lastCaptureDate
    }
  };
};

/**
 * Ajoute les progrès de la semaine
 */
PokédexStatsSchema.methods.addWeeklyProgress = function(
  this: IPokédexStats,
  newSeen: number,
  newCaught: number
) {
  const now = new Date();
  const year = now.getFullYear();
  const week = this.getWeekNumber(now);
  const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
  
  // Chercher la semaine courante
  let currentWeek = this.activity.weeklyProgress.find(w => w.week === weekKey);
  
  if (currentWeek) {
    currentWeek.newSeen += newSeen;
    currentWeek.newCaught += newCaught;
  } else {
    this.activity.weeklyProgress.push({
      week: weekKey,
      newSeen,
      newCaught
    });
    
    // Garder seulement les 12 dernières semaines
    if (this.activity.weeklyProgress.length > 12) {
      this.activity.weeklyProgress = this.activity.weeklyProgress.slice(-12);
    }
  }
};

/**
 * Utilitaire pour calculer le numéro de semaine
 */
PokédexStatsSchema.methods.getWeekNumber = function(date: Date): number {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((today.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil(dayOfYear / 7);
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve ou crée les stats d'un joueur
 */
PokédexStatsSchema.statics.findOrCreate = async function(playerId: string): Promise<IPokédexStats> {
  let stats = await this.findOne({ playerId });
  
  if (!stats) {
    stats = new this({
      playerId,
      totalSeen: 0,
      totalCaught: 0,
      totalPokemon: 151, // Kanto par défaut
      typeStats: new Map(),
      regionStats: new Map(),
      records: {
        totalShinyFound: 0,
        totalShinyCaught: 0,
        highestLevelSeen: 1,
        highestLevelCaught: 1,
        fastestCapture: Infinity,
        longestHunt: 0,
        currentSeenStreak: 0,
        longestSeenStreak: 0,
        currentCaughtStreak: 0,
        longestCaughtStreak: 0
      },
      activity: {
        mostActiveDay: 'saturday',
        mostActiveHour: 14,
        weeklyProgress: [],
        monthlyProgress: []
      },
      achievements: new Map()
    });
  }
  
  return stats;
};

// ===== EXPORT =====
export const PokédexStats = mongoose.model<IPokédexStats>('PokédexStats', PokédexStatsSchema);

// ===== TYPES D'EXPORT =====
export type PokédexStatsDocument = IPokédexStats;
