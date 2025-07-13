// server/src/models/PokedexStats.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== INTERFACES =====

export interface IPokedexStats extends Document {
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
  typeStats: Map<string, {
    seen: number;
    caught: number;
    total: number;       // Nombre total de ce type dans le jeu
    percentage: number;  // % de complétion pour ce type
  }>;
  
  // === STATISTIQUES PAR RÉGION ===
  regionStats: Map<string, {
    seen: number;
    caught: number;
    total: number;       // Nombre total dans cette région
    percentage: number;  // % de complétion pour cette région
  }>;
  
  // === RECORDS & ACCOMPLISSEMENTS ===
  records: {
    // Shiny
    totalShinyFound: number;
    totalShinyCaught: number;
    firstShinyDate?: Date;
    lastShinyDate?: Date;
    rareShinyCount: number;    // Shinies rares/légendaires
    
    // Niveaux
    highestLevelSeen: number;
    highestLevelCaught: number;
    averageCatchLevel: number;
    
    // Temps et efficacité
    fastestCapture: number;    // Temps en secondes pour capturer (record)
    longestHunt: number;       // Plus longue chasse (rencontres avant capture)
    totalPlayTime: number;     // Temps total passé (en secondes)
    
    // Streaks
    currentSeenStreak: number;      // Jours consécutifs avec nouvelle découverte
    longestSeenStreak: number;      // Record de streak découverte
    currentCaughtStreak: number;    // Jours consécutifs avec capture
    longestCaughtStreak: number;    // Record de streak capture
    lastStreakUpdate: Date;         // Dernière mise à jour des streaks
    
    // Accomplissements spéciaux
    perfectCatches: number;         // Captures du premier coup
    evolutionsSeen: number;         // Évolutions observées
    tradePokemon: number;          // Pokémon obtenus par échange
  };
  
  // === STATISTIQUES TEMPORELLES ===
  activity: {
    lastDiscoveryDate?: Date;     // Dernière nouvelle découverte
    lastCaptureDate?: Date;       // Dernière capture
    mostActiveDay: string;        // Jour de la semaine le plus actif
    mostActiveHour: number;       // Heure la plus active (0-23)
    
    // Évolution dans le temps (limité aux 52 dernières semaines / 12 derniers mois)
    weeklyProgress: Array<{
      week: string;               // Format: "2024-W01"
      newSeen: number;
      newCaught: number;
      playtime: number;           // Temps joué cette semaine
    }>;
    
    monthlyProgress: Array<{
      month: string;              // Format: "2024-01"
      newSeen: number;
      newCaught: number;
      playtime: number;           // Temps joué ce mois
      milestones: string[];       // Milestones atteints ce mois
    }>;
    
    // Heatmap d'activité (jour de la semaine vs heure)
    activityHeatmap: Map<string, number>; // "0-14" = dimanche 14h
  };
  
  // === PRÉFÉRENCES ET MÉTADONNÉES ===
  preferences: {
    favoriteType?: string;        // Type préféré basé sur les captures
    favoriteRegion?: string;      // Région préférée
    huntingStyle: string;         // "casual", "completionist", "shiny_hunter"
    goals: Array<{               // Objectifs personnels
      type: string;              // "catch_all", "shiny_hunt", "type_master"
      target: number;
      current: number;
      deadline?: Date;
    }>;
  };
  
  // === CACHE ET PERFORMANCE ===
  cache: {
    lastCalculated: Date;         // Dernière mise à jour complète
    calculationVersion: number;   // Version du calcul (pour migrations)
    quickStatsHash: string;       // Hash pour détecter les changements
    needsRecalculation: boolean;  // Flag pour recalcul nécessaire
  };
  
  // === MÉTADONNÉES ===
  version: number;              // Version du document
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES D'INSTANCE ===
  recalculateStats(force?: boolean): Promise<void>;
  updateFromEntry(entry: any, isNewSeen?: boolean, isNewCaught?: boolean): Promise<void>;
  getCompletionSummary(): any;
  getProgressSince(date: Date): any;
  addWeeklyProgress(newSeen: number, newCaught: number, playtime?: number): void;
  addMonthlyProgress(newSeen: number, newCaught: number, playtime?: number, milestones?: string[]): void;
  updateStreaks(type: 'seen' | 'caught', timestamp?: Date): Promise<{ newRecord: boolean; notifications: string[] }>;
  getRecentActivity(days: number): any;
  calculateTypePreferences(): void;
  invalidateCache(): void;
  needsUpdate(): boolean;
  getWeekNumber(date: Date): number;
  determineRegionFromId(pokemonId: number): string;
  generateQuickStatsHash(): string;
}

// Interface pour les méthodes statiques
export interface IPokedexStatsModel extends Model<IPokedexStats> {
  findOrCreate(playerId: string): Promise<IPokedexStats>;
  getGlobalLeaderboard(type: 'caught' | 'seen' | 'shiny' | 'streak', limit?: number): Promise<any[]>;
}

// ===== SCHÉMA MONGOOSE =====

const PokedexStatsSchema = new Schema<IPokedexStats>({
  // === IDENTIFICATION ===
  playerId: { 
    type: String, 
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: (v: string) => v && v.trim().length > 0,
      message: 'Player ID is required'
    }
  },
  
  // === PROGRESSION GLOBALE ===
  totalSeen: { 
    type: Number, 
    default: 0,
    min: [0, 'Total seen cannot be negative'],
    max: [10000, 'Total seen too high'] // Future-proof
  },
  totalCaught: { 
    type: Number, 
    default: 0,
    min: [0, 'Total caught cannot be negative'],
    max: [10000, 'Total caught too high']
  },
  totalPokemon: { 
    type: Number, 
    default: 151, // Kanto par défaut
    min: [1, 'Total Pokemon must be positive'],
    max: [10000, 'Total Pokemon too high']
  },
  
  // === POURCENTAGES ===
  seenPercentage: { 
    type: Number, 
    default: 0,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  caughtPercentage: { 
    type: Number, 
    default: 0,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  
// === STATS PAR TYPE ===
typeStats: {
  type: Schema.Types.Mixed,
  default: () => new Map()
},

// === STATS PAR RÉGION ===
regionStats: {
  type: Schema.Types.Mixed,
  default: () => new Map()
},
  
  // === RECORDS ===
  records: {
    totalShinyFound: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    totalShinyCaught: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    firstShinyDate: { type: Date },
    lastShinyDate: { type: Date },
    rareShinyCount: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    
    highestLevelSeen: { type: Number, default: 1, min: [1, 'Level too low'], max: [100, 'Level too high'] },
    highestLevelCaught: { type: Number, default: 1, min: [1, 'Level too low'], max: [100, 'Level too high'] },
    averageCatchLevel: { type: Number, default: 1, min: [1, 'Level too low'], max: [100, 'Level too high'] },
    
    fastestCapture: { type: Number, default: Infinity, min: [0, 'Time cannot be negative'] },
    longestHunt: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    totalPlayTime: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    
    currentSeenStreak: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    longestSeenStreak: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    currentCaughtStreak: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    longestCaughtStreak: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    lastStreakUpdate: { type: Date, default: Date.now },
    
    perfectCatches: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    evolutionsSeen: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    tradePokemon: { type: Number, default: 0, min: [0, 'Cannot be negative'] }
  },
  
  // === ACTIVITÉ ===
  activity: {
    lastDiscoveryDate: { type: Date },
    lastCaptureDate: { type: Date },
    mostActiveDay: { 
      type: String,
      enum: {
        values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        message: 'Invalid day of week'
      },
      default: 'saturday'
    },
    mostActiveHour: { 
      type: Number, 
      min: [0, 'Hour too low'], 
      max: [23, 'Hour too high'], 
      default: 14 
    },
    
    weeklyProgress: {
      type: [{
        week: { 
          type: String, 
          required: true,
          match: [/^\d{4}-W\d{2}$/, 'Invalid week format']
        },
        newSeen: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        newCaught: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        playtime: { type: Number, default: 0, min: [0, 'Cannot be negative'] }
      }],
      default: [],
      validate: {
        validator: function(v: any[]) {
          return v.length <= 52; // Max 52 semaines
        },
        message: 'Too many weekly progress entries'
      }
    },
    
    monthlyProgress: {
      type: [{
        month: { 
          type: String, 
          required: true,
          match: [/^\d{4}-\d{2}$/, 'Invalid month format']
        },
        newSeen: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        newCaught: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        playtime: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        milestones: [{ type: String, maxlength: [100, 'Milestone name too long'] }]
      }],
      default: [],
      validate: {
        validator: function(v: any[]) {
          return v.length <= 24; // Max 24 mois
        },
        message: 'Too many monthly progress entries'
      }
    },
    
    activityHeatmap: {
      type: Schema.Types.Mixed,
      default: () => new Map()
    }
  },
  
  // === PRÉFÉRENCES ===
  preferences: {
    favoriteType: { 
      type: String, 
      maxlength: [20, 'Type name too long'],
      lowercase: true
    },
    favoriteRegion: { 
      type: String, 
      maxlength: [20, 'Region name too long'],
      lowercase: true
    },
    huntingStyle: {
      type: String,
      enum: {
        values: ['casual', 'completionist', 'shiny_hunter', 'speed_runner', 'collector'],
        message: 'Invalid hunting style'
      },
      default: 'casual'
    },
    goals: {
      type: [{
        type: { 
          type: String, 
          required: true,
          enum: ['catch_all', 'shiny_hunt', 'type_master', 'region_complete', 'level_master', 'speed_complete']
        },
        target: { type: Number, required: true, min: [1, 'Target too low'] },
        current: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
        deadline: { type: Date }
      }],
      default: [],
      validate: {
        validator: function(v: any[]) {
          return v.length <= 10; // Max 10 objectifs
        },
        message: 'Too many goals'
      }
    }
  },
  
  // === CACHE ===
  cache: {
    lastCalculated: { type: Date, default: Date.now },
    calculationVersion: { type: Number, default: 1, min: [1, 'Version too low'] },
    quickStatsHash: { type: String, default: '' },
    needsRecalculation: { type: Boolean, default: false }
  },
  
  // === MÉTADONNÉES ===
  version: { 
    type: Number, 
    default: 1,
    min: [1, 'Version must be positive']
  }
}, {
  timestamps: true,
  collection: 'pokedex_stats',
  minimize: false,
  versionKey: false
});

// ===== INDEX OPTIMISÉS =====

// Index principal unique
PokedexStatsSchema.index({ playerId: 1 }, { unique: true });

// Index pour classements globaux
PokedexStatsSchema.index({ totalCaught: -1 });
PokedexStatsSchema.index({ totalSeen: -1 });
PokedexStatsSchema.index({ caughtPercentage: -1 });
PokedexStatsSchema.index({ 'records.totalShinyCaught': -1 });
PokedexStatsSchema.index({ 'records.longestCaughtStreak': -1 });

// Index pour requêtes temporelles
PokedexStatsSchema.index({ 'activity.lastCaptureDate': -1 });
PokedexStatsSchema.index({ 'cache.lastCalculated': 1 });
PokedexStatsSchema.index({ 'cache.needsRecalculation': 1 });

// Index pour préférences
PokedexStatsSchema.index({ 'preferences.huntingStyle': 1 });
PokedexStatsSchema.index({ 'preferences.favoriteType': 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Calcul automatique des pourcentages et validations
PokedexStatsSchema.pre('save', function(next) {
  try {
    // Validation de cohérence
    if (this.totalCaught > this.totalSeen) {
      this.totalSeen = this.totalCaught; // Correction automatique
    }
    
    if (this.totalSeen > this.totalPokemon) {
      this.totalSeen = this.totalPokemon; // Plafonnement
    }
    
    if (this.totalCaught > this.totalPokemon) {
      this.totalCaught = this.totalPokemon; // Plafonnement
    }
    
    // Calcul des pourcentages
    if (this.totalPokemon > 0) {
      this.seenPercentage = Math.round((this.totalSeen / this.totalPokemon) * 10000) / 100; // 2 décimales
      this.caughtPercentage = Math.round((this.totalCaught / this.totalPokemon) * 10000) / 100;
    } else {
      this.seenPercentage = 0;
      this.caughtPercentage = 0;
    }
    
    // Calcul des pourcentages par type
    if (this.typeStats instanceof Map) {
      this.typeStats.forEach((stats, type) => {
        if (stats.total > 0) {
          stats.percentage = Math.round((stats.caught / stats.total) * 10000) / 100;
        } else {
          stats.percentage = 0;
        }
      });
    }
    
    // Calcul des pourcentages par région
    if (this.regionStats instanceof Map) {
      this.regionStats.forEach((stats, region) => {
        if (stats.total > 0) {
          stats.percentage = Math.round((stats.caught / stats.total) * 10000) / 100;
        } else {
          stats.percentage = 0;
        }
      });
    }
    
    // Validation des records
    if (this.records.fastestCapture === Infinity) {
      this.records.fastestCapture = 0; // Conversion pour MongoDB
    }
    
    // Nettoyage des listes (garder seulement les plus récentes)
    if (this.activity.weeklyProgress.length > 52) {
      this.activity.weeklyProgress = this.activity.weeklyProgress.slice(-52);
    }
    
    if (this.activity.monthlyProgress.length > 24) {
      this.activity.monthlyProgress = this.activity.monthlyProgress.slice(-24);
    }
    
    if (this.preferences.goals.length > 10) {
      this.preferences.goals = this.preferences.goals.slice(0, 10);
    }
    
    // Mise à jour du cache
    this.cache.lastCalculated = new Date();
    
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Unknown validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Recalcule toutes les statistiques depuis zéro
 */
PokedexStatsSchema.methods.recalculateStats = async function(
  this: IPokedexStats, 
  force: boolean = false
): Promise<void> {
  try {
    // Vérifier si recalcul nécessaire
    if (!force && !this.needsUpdate()) {
      console.log(`⏭️ [PokedexStats] Recalcul non nécessaire pour ${this.playerId}`);
      return;
    }
    
    console.log(`📊 [PokedexStats] Recalcul complet pour joueur ${this.playerId}`);
    
    // Import dynamique pour éviter circular dependency
    const { PokedexEntry } = await import('./PokedexEntry');
    const { getPokemonById } = await import('../data/PokemonData');
    
    // Récupérer toutes les entrées du joueur avec une seule requête optimisée
    const entries = await PokedexEntry.find({ 
      playerId: this.playerId 
    }).lean(); // Utiliser lean() pour les performances
    
    // Reset stats
    this.totalSeen = 0;
    this.totalCaught = 0;
    this.typeStats = new Map();
    this.regionStats = new Map();
    
    // Variables pour calculs
    let highestLevelSeen = 1;
    let highestLevelCaught = 1;
    let totalShinyFound = 0;
    let totalShinyCaught = 0;
    let firstShinyDate: Date | undefined;
    let lastShinyDate: Date | undefined;
    let totalLevels = 0;
    let caughtCount = 0;
    
    // Batch processing pour optimiser
    const BATCH_SIZE = 100;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (entry) => {
        if (entry.isSeen) {
          this.totalSeen++;
          
          // Récupérer données du Pokémon (avec cache)
          const pokemonData = await getPokemonById(entry.pokemonId);
          if (pokemonData) {
            // Stats par type
            for (const type of pokemonData.types || []) {
              const typeKey = type.toLowerCase();
              if (!this.typeStats.has(typeKey)) {
                this.typeStats.set(typeKey, { seen: 0, caught: 0, total: 0, percentage: 0 });
              }
              this.typeStats.get(typeKey)!.seen++;
            }
            
            // Stats par région (basé sur l'ID)
            const region = this.determineRegionFromId(entry.pokemonId);
            if (!this.regionStats.has(region)) {
              this.regionStats.set(region, { seen: 0, caught: 0, total: 0, percentage: 0 });
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
          caughtCount++;
          
          // Stats par type (caught)
          const pokemonData = await getPokemonById(entry.pokemonId);
          if (pokemonData) {
            for (const type of pokemonData.types || []) {
              const typeKey = type.toLowerCase();
              if (this.typeStats.has(typeKey)) {
                this.typeStats.get(typeKey)!.caught++;
              }
            }
            
            const region = this.determineRegionFromId(entry.pokemonId);
            if (this.regionStats.has(region)) {
              this.regionStats.get(region)!.caught++;
            }
          }
          
          // Niveau le plus élevé capturé et moyenne
          if (entry.bestSpecimen?.level) {
            if (entry.bestSpecimen.level > highestLevelCaught) {
              highestLevelCaught = entry.bestSpecimen.level;
            }
            totalLevels += entry.bestSpecimen.level;
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
      }));
    }
    
    // Mettre à jour les records
    this.records.highestLevelSeen = highestLevelSeen;
    this.records.highestLevelCaught = highestLevelCaught;
    this.records.averageCatchLevel = caughtCount > 0 ? Math.round(totalLevels / caughtCount) : 1;
    this.records.totalShinyCaught = totalShinyCaught;
    this.records.totalShinyFound = totalShinyFound;
    
    if (firstShinyDate) this.records.firstShinyDate = firstShinyDate;
    if (lastShinyDate) this.records.lastShinyDate = lastShinyDate;
    
    // Calculer les préférences
    this.calculateTypePreferences();
    
    // Marquer le cache comme à jour
    this.cache.needsRecalculation = false;
    this.cache.calculationVersion++;
    this.cache.quickStatsHash = this.generateQuickStatsHash();
    
    await this.save();
    console.log(`✅ [PokedexStats] Recalcul terminé: ${this.totalSeen} vus, ${this.totalCaught} capturés`);
    
  } catch (error) {
    console.error(`❌ [PokedexStats] Erreur lors du recalcul:`, error);
    throw error;
  }
};

/**
 * Met à jour les stats suite à une nouvelle entrée (méthode optimisée)
 */
PokedexStatsSchema.methods.updateFromEntry = async function(
  this: IPokedexStats,
  entry: any,
  isNewSeen: boolean = false,
  isNewCaught: boolean = false
): Promise<void> {
  try {
    let hasChanges = false;
    
    if (isNewSeen) {
      this.totalSeen++;
      this.activity.lastDiscoveryDate = new Date();
      hasChanges = true;
    }
    
    if (isNewCaught) {
      this.totalCaught++;
      this.activity.lastCaptureDate = new Date();
      hasChanges = true;
    }
    
    if (hasChanges) {
      // Invalidation partielle du cache
      this.cache.needsRecalculation = true;
      
      // Mise à jour des progrès hebdomadaires/mensuels
      this.addWeeklyProgress(isNewSeen ? 1 : 0, isNewCaught ? 1 : 0);
      this.addMonthlyProgress(isNewSeen ? 1 : 0, isNewCaught ? 1 : 0);
      
      await this.save();
    }
    
  } catch (error) {
    console.error(`❌ [PokedexStats] Erreur updateFromEntry:`, error);
    throw error;
  }
};

/**
 * Récupère un résumé de complétion optimisé
 */
PokedexStatsSchema.methods.getCompletionSummary = function(this: IPokedexStats) {
  return {
    seen: {
      count: this.totalSeen,
      percentage: this.seenPercentage,
      remaining: Math.max(0, this.totalPokemon - this.totalSeen)
    },
    caught: {
      count: this.totalCaught,
      percentage: this.caughtPercentage,
      remaining: Math.max(0, this.totalPokemon - this.totalCaught)
    },
    records: {
      shinies: this.records.totalShinyCaught,
      highestLevel: this.records.highestLevelCaught,
      longestStreak: this.records.longestCaughtStreak,
      perfectCatches: this.records.perfectCatches
    },
    activity: {
      lastDiscovery: this.activity.lastDiscoveryDate,
      lastCapture: this.activity.lastCaptureDate,
      mostActiveDay: this.activity.mostActiveDay,
      mostActiveHour: this.activity.mostActiveHour
    },
    preferences: {
      favoriteType: this.preferences.favoriteType,
      huntingStyle: this.preferences.huntingStyle,
      activeGoals: this.preferences.goals.filter(g => g.current < g.target).length
    }
  };
};

/**
 * Ajoute les progrès de la semaine avec optimisation
 */
PokedexStatsSchema.methods.addWeeklyProgress = function(
  this: IPokedexStats,
  newSeen: number,
  newCaught: number,
  playtime: number = 0
): void {
  const now = new Date();
  const year = now.getFullYear();
  const week = this.getWeekNumber(now);
  const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
  
  // Chercher la semaine courante
  let currentWeek = this.activity.weeklyProgress.find(w => w.week === weekKey);
  
  if (currentWeek) {
    currentWeek.newSeen += newSeen;
    currentWeek.newCaught += newCaught;
    currentWeek.playtime += playtime;
  } else {
    this.activity.weeklyProgress.push({
      week: weekKey,
      newSeen,
      newCaught,
      playtime
    });
    
    // Garder seulement les 52 dernières semaines
    if (this.activity.weeklyProgress.length > 52) {
      this.activity.weeklyProgress = this.activity.weeklyProgress
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-52);
    }
  }
};

/**
 * Ajoute les progrès du mois
 */
PokedexStatsSchema.methods.addMonthlyProgress = function(
  this: IPokedexStats,
  newSeen: number,
  newCaught: number,
  playtime: number = 0,
  milestones: string[] = []
): void {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  let currentMonth = this.activity.monthlyProgress.find(m => m.month === monthKey);
  
  if (currentMonth) {
    currentMonth.newSeen += newSeen;
    currentMonth.newCaught += newCaught;
    currentMonth.playtime += playtime;
    if (milestones.length > 0) {
      currentMonth.milestones.push(...milestones);
      currentMonth.milestones = [...new Set(currentMonth.milestones)]; // Dédupliquer
    }
  } else {
    this.activity.monthlyProgress.push({
      month: monthKey,
      newSeen,
      newCaught,
      playtime,
      milestones: [...milestones]
    });
    
    // Garder seulement les 24 derniers mois
    if (this.activity.monthlyProgress.length > 24) {
      this.activity.monthlyProgress = this.activity.monthlyProgress
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-24);
    }
  }
};

/**
 * Met à jour les streaks avec logique améliorée
 */
PokedexStatsSchema.methods.updateStreaks = async function(
  this: IPokedexStats,
  type: 'seen' | 'caught',
  timestamp: Date = new Date()
): Promise<{ newRecord: boolean; notifications: string[] }> {
  const notifications: string[] = [];
  let newRecord = false;
  
  const today = timestamp.toDateString();
  const yesterday = new Date(timestamp);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  const lastUpdate = this.records.lastStreakUpdate?.toDateString();
  
  if (type === 'seen') {
    const lastDiscovery = this.activity.lastDiscoveryDate?.toDateString();
    
    if (lastDiscovery !== today && lastUpdate !== today) {
      if (lastDiscovery === yesterdayStr) {
        // Continuation de streak
        this.records.currentSeenStreak++;
        if (this.records.currentSeenStreak > this.records.longestSeenStreak) {
          this.records.longestSeenStreak = this.records.currentSeenStreak;
          newRecord = true;
          notifications.push(`🔥 Nouveau record de découvertes : ${this.records.longestSeenStreak} jours !`);
        }
        
        // Notifications de milestone
        if (this.records.currentSeenStreak === 7) {
          notifications.push("🌟 Streak Découverte : 7 jours consécutifs !");
        } else if (this.records.currentSeenStreak === 30) {
          notifications.push("🏆 Streak Découverte Légendaire : 30 jours !");
        }
      } else {
        // Streak cassée ou nouvelle
        if (this.records.currentSeenStreak >= 3) {
          notifications.push(`💔 Streak de découverte interrompue après ${this.records.currentSeenStreak} jours`);
        }
        this.records.currentSeenStreak = 1;
      }
    }
  }
  
  if (type === 'caught') {
    const lastCapture = this.activity.lastCaptureDate?.toDateString();
    
    if (lastCapture !== today && lastUpdate !== today) {
      if (lastCapture === yesterdayStr) {
        // Continuation de streak
        this.records.currentCaughtStreak++;
        if (this.records.currentCaughtStreak > this.records.longestCaughtStreak) {
          this.records.longestCaughtStreak = this.records.currentCaughtStreak;
          newRecord = true;
          notifications.push(`🏆 Nouveau record de captures : ${this.records.longestCaughtStreak} jours !`);
        }
        
        // Notifications de milestone
        if (this.records.currentCaughtStreak === 5) {
          notifications.push("⚡ Streak Capture : 5 jours consécutifs !");
        } else if (this.records.currentCaughtStreak === 21) {
          notifications.push("🏅 Streak Capture Légendaire : 21 jours !");
        }
      } else {
        // Streak cassée ou nouvelle
        if (this.records.currentCaughtStreak >= 3) {
          notifications.push(`💥 Streak de capture interrompue après ${this.records.currentCaughtStreak} jours`);
        }
        this.records.currentCaughtStreak = 1;
      }
    }
  }
  
  this.records.lastStreakUpdate = timestamp;
  
  return { newRecord, notifications };
};

/**
 * Calcule les préférences de type basées sur les statistiques
 */
PokedexStatsSchema.methods.calculateTypePreferences = function(this: IPokedexStats): void {
  if (!this.typeStats || this.typeStats.size === 0) return;
  
  let maxCaught = 0;
  let favoriteType = '';
  
  this.typeStats.forEach((stats, type) => {
    if (stats.caught > maxCaught) {
      maxCaught = stats.caught;
      favoriteType = type;
    }
  });
  
  if (favoriteType && maxCaught >= 5) { // Minimum 5 captures pour être considéré
    this.preferences.favoriteType = favoriteType;
  }
  
  // Déterminer le style de chasse basé sur les statistiques
  const shinyRatio = this.totalCaught > 0 ? this.records.totalShinyCaught / this.totalCaught : 0;
  const completionRatio = this.caughtPercentage / 100;
  
  if (shinyRatio > 0.1) { // Plus de 10% de shinies
    this.preferences.huntingStyle = 'shiny_hunter';
  } else if (completionRatio > 0.8) { // Plus de 80% de complétion
    this.preferences.huntingStyle = 'completionist';
  } else if (this.records.fastestCapture < 30) { // Captures très rapides
    this.preferences.huntingStyle = 'speed_runner';
  } else {
    this.preferences.huntingStyle = 'casual';
  }
};

/**
 * Invalide le cache pour forcer un recalcul
 */
PokedexStatsSchema.methods.invalidateCache = function(this: IPokedexStats): void {
  this.cache.needsRecalculation = true;
  this.cache.quickStatsHash = '';
};

/**
 * Vérifie si une mise à jour est nécessaire
 */
PokedexStatsSchema.methods.needsUpdate = function(this: IPokedexStats): boolean {
  if (this.cache.needsRecalculation) return true;
  
  // Vérifier si le cache est trop ancien (24 heures)
  const cacheAge = Date.now() - this.cache.lastCalculated.getTime();
  if (cacheAge > 24 * 60 * 60 * 1000) return true;
  
  return false;
};

/**
 * Utilitaire pour calculer le numéro de semaine
 */
PokedexStatsSchema.methods.getWeekNumber = function(date: Date): number {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((today.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil(dayOfYear / 7);
};

/**
 * Détermine la région basée sur l'ID du Pokémon
 */
PokedexStatsSchema.methods.determineRegionFromId = function(pokemonId: number): string {
  if (pokemonId <= 151) return 'kanto';
  if (pokemonId <= 251) return 'johto';
  if (pokemonId <= 386) return 'hoenn';
  if (pokemonId <= 493) return 'sinnoh';
  if (pokemonId <= 649) return 'unova';
  if (pokemonId <= 721) return 'kalos';
  if (pokemonId <= 809) return 'alola';
  if (pokemonId <= 905) return 'galar';
  return 'other';
};

/**
 * Génère un hash rapide des stats principales
 */
PokedexStatsSchema.methods.generateQuickStatsHash = function(this: IPokedexStats): string {
  const data = `${this.totalSeen}-${this.totalCaught}-${this.records.totalShinyCaught}-${this.records.currentCaughtStreak}`;
  return Buffer.from(data).toString('base64');
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve ou crée les stats d'un joueur de manière atomique
 */
PokedexStatsSchema.statics.findOrCreate = async function(playerId: string): Promise<IPokedexStats> {
  if (!playerId || playerId.trim().length === 0) {
    throw new Error('Player ID is required');
  }
  
  const stats = await this.findOneAndUpdate(
    { playerId: playerId.trim() },
    {
      $setOnInsert: {
        playerId: playerId.trim(),
        totalSeen: 0,
        totalCaught: 0,
        totalPokemon: 151,
        seenPercentage: 0,
        caughtPercentage: 0,
        typeStats: new Map(),
        regionStats: new Map(),
        records: {
          totalShinyFound: 0,
          totalShinyCaught: 0,
          rareShinyCount: 0,
          highestLevelSeen: 1,
          highestLevelCaught: 1,
          averageCatchLevel: 1,
          fastestCapture: 0, // Utiliser 0 au lieu de Infinity pour MongoDB
          longestHunt: 0,
          totalPlayTime: 0,
          currentSeenStreak: 0,
          longestSeenStreak: 0,
          currentCaughtStreak: 0,
          longestCaughtStreak: 0,
          lastStreakUpdate: new Date(),
          perfectCatches: 0,
          evolutionsSeen: 0,
          tradePokemon: 0
        },
        activity: {
          mostActiveDay: 'saturday',
          mostActiveHour: 14,
          weeklyProgress: [],
          monthlyProgress: [],
          activityHeatmap: new Map()
        },
        preferences: {
          huntingStyle: 'casual',
          goals: []
        },
        cache: {
          lastCalculated: new Date(),
          calculationVersion: 1,
          quickStatsHash: '',
          needsRecalculation: false
        },
        version: 1
      }
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  
  return stats;
};

/**
 * Récupère le classement global
 */
PokedexStatsSchema.statics.getGlobalLeaderboard = async function(
  type: 'caught' | 'seen' | 'shiny' | 'streak',
  limit: number = 10
): Promise<any[]> {
  let sortField = 'totalCaught';
  
  switch (type) {
    case 'seen':
      sortField = 'totalSeen';
      break;
    case 'shiny':
      sortField = 'records.totalShinyCaught';
      break;
    case 'streak':
      sortField = 'records.longestCaughtStreak';
      break;
  }
  
  return await this.find({})
    .sort({ [sortField]: -1 })
    .limit(Math.min(limit, 100)) // Limite de sécurité
    .select(`playerId ${sortField} caughtPercentage`)
    .lean();
};

// ===== EXPORT =====
export const PokedexStats = mongoose.model<IPokedexStats, IPokedexStatsModel>('PokedexStats', PokedexStatsSchema);

// ===== TYPES D'EXPORT =====
export type PokedexStatsDocument = IPokedexStats;
