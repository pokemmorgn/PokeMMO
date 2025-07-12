// server/src/models/PokédexEntry.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ===== INTERFACES OPTIMISÉES =====

export interface IPokédexEntry extends Document {
  // === IDENTIFICATION (INDEXÉES) ===
  playerId: string;          // ID du joueur
  pokemonId: number;         // ID du Pokémon (1-1010+)
  
  // === STATUT DÉCOUVERTE ===
  isSeen: boolean;           // Pokémon vu
  isCaught: boolean;         // Pokémon capturé
  
  // === DATES IMPORTANTES (INDEXÉES) ===
  firstSeenAt?: Date;        // Première vue
  firstCaughtAt?: Date;      // Première capture
  lastSeenAt: Date;          // Dernière vue (pour tri)
  lastCaughtAt?: Date;       // Dernière capture
  
  // === COMPTEURS ===
  timesEncountered: number;  // Nombre de rencontres
  timesCaught: number;       // Nombre de captures
  
  // === MEILLEUR SPÉCIMEN (DÉNORMALISÉ POUR PERF) ===
  bestLevel: number;         // Meilleur niveau capturé
  hasShiny: boolean;         // A déjà trouvé un shiny
  bestShinyLevel?: number;   // Niveau du meilleur shiny
  bestSpecimenId?: string;   // ID du meilleur Pokémon possédé
  
  // === PREMIÈRE RENCONTRE (COMPACT) ===
  firstLocation: string;     // Lieu de première rencontre
  firstLevel: number;        // Niveau lors de première vue
  firstMethod: string;       // Méthode de rencontre
  
  // === MÉTADONNÉES ===
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES INSTANCE ===
  markSeen(data: SeenData): Promise<boolean>;
  markCaught(data: CaughtData): Promise<{ isNewCapture: boolean; isNewBest: boolean }>;
  updateBestSpecimen(data: SpecimenData): boolean;
  getProgress(): ProgressData;
}

// === TYPES DE DONNÉES ===
export interface SeenData {
  location: string;
  level: number;
  method: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
}

export interface CaughtData {
  level: number;
  location: string;
  method: string;
  isShiny: boolean;
  ownedPokemonId: string;
  captureTime?: number;
}

export interface SpecimenData {
  level: number;
  isShiny: boolean;
  ownedPokemonId: string;
}

export interface ProgressData {
  seen: boolean;
  caught: boolean;
  encounters: number;
  captures: number;
  firstSeenDaysAgo: number;
  firstCaughtDaysAgo?: number;
  bestLevel: number;
  hasShiny: boolean;
}

// ===== SCHÉMA MONGOOSE OPTIMISÉ =====

const PokédexEntrySchema = new Schema<IPokédexEntry>({
  // === IDENTIFICATION (COMPOUND INDEX) ===
  playerId: { 
    type: String, 
    required: true,
    index: true,
    validate: {
      validator: (v: string) => v && v.length > 0 && v.length <= 50,
      message: 'PlayerId invalide'
    }
  },
  
  pokemonId: { 
    type: Number, 
    required: true,
    min: [1, 'PokemonId doit être >= 1'],
    max: [2000, 'PokemonId doit être <= 2000'], // Futur-proof
    index: true
  },
  
  // === STATUT (INDEXÉS POUR REQUÊTES) ===
  isSeen: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  
  isCaught: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  
  // === DATES (INDEXÉES POUR TRIS) ===
  firstSeenAt: { 
    type: Date,
    index: -1 // Index descendant pour récents en premier
  },
  
  firstCaughtAt: { 
    type: Date,
    index: -1
  },
  
  lastSeenAt: { 
    type: Date, 
    required: true,
    default: Date.now,
    index: -1 // Pour "activité récente"
  },
  
  lastCaughtAt: { 
    type: Date,
    index: -1
  },
  
  // === COMPTEURS (OPTIMISATION LECTURE) ===
  timesEncountered: { 
    type: Number, 
    default: 0,
    min: [0, 'Encounters ne peut être négatif'],
    validate: {
      validator: Number.isInteger,
      message: 'Encounters doit être un entier'
    }
  },
  
  timesCaught: { 
    type: Number, 
    default: 0,
    min: [0, 'Captures ne peut être négatif'],
    validate: {
      validator: Number.isInteger,
      message: 'Captures doit être un entier'
    }
  },
  
  // === MEILLEUR SPÉCIMEN (DÉNORMALISÉ) ===
  bestLevel: { 
    type: Number, 
    default: 1,
    min: [1, 'Level minimum: 1'],
    max: [100, 'Level maximum: 100']
  },
  
  hasShiny: { 
    type: Boolean, 
    default: false,
    index: true // Pour requêtes shiny
  },
  
  bestShinyLevel: { 
    type: Number,
    min: [1, 'Shiny level minimum: 1'],
    max: [100, 'Shiny level maximum: 100']
  },
  
  bestSpecimenId: { 
    type: String,
    validate: {
      validator: (v: string) => !v || Types.ObjectId.isValid(v),
      message: 'bestSpecimenId doit être un ObjectId valide'
    }
  },
  
  // === PREMIÈRE RENCONTRE (COMPACT) ===
  firstLocation: { 
    type: String, 
    required: true,
    maxlength: [100, 'Location trop longue'],
    trim: true
  },
  
  firstLevel: { 
    type: Number, 
    required: true,
    min: [1, 'First level minimum: 1'],
    max: [100, 'First level maximum: 100']
  },
  
  firstMethod: { 
    type: String, 
    required: true,
    enum: {
      values: ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special'],
      message: 'Méthode invalide'
    },
    index: true // Pour analytics par méthode
  }
}, {
  timestamps: true,
  collection: 'pokedex_entries',
  // Optimisations MongoDB
  autoIndex: process.env.NODE_ENV !== 'production', // Pas d'auto-index en prod
  bufferCommands: false, // Pas de buffer pour les commandes
  bufferMaxEntries: 0
});

// ===== INDEX COMPOSITES OPTIMISÉS =====

// Index principal unique
PokédexEntrySchema.index(
  { playerId: 1, pokemonId: 1 }, 
  { 
    unique: true,
    name: 'player_pokemon_unique'
  }
);

// Index pour requêtes fréquentes
PokédexEntrySchema.index(
  { playerId: 1, isSeen: 1, isCaught: 1 },
  { name: 'player_status_query' }
);

// Index pour shinies
PokédexEntrySchema.index(
  { playerId: 1, hasShiny: 1 },
  { 
    name: 'player_shiny_query',
    partialFilterExpression: { hasShiny: true } // Sparse index
  }
);

// Index pour activité récente
PokédexEntrySchema.index(
  { playerId: 1, lastSeenAt: -1 },
  { name: 'player_recent_activity' }
);

// Index pour méthodes de capture (analytics)
PokédexEntrySchema.index(
  { playerId: 1, firstMethod: 1, isCaught: 1 },
  { name: 'player_method_analytics' }
);

// ===== VALIDATIONS AVANCÉES =====

// Validation: Pokémon capturé doit être vu
PokédexEntrySchema.pre('validate', function(next) {
  if (this.isCaught && !this.isSeen) {
    this.isSeen = true;
    console.warn(`Auto-correction: Pokémon ${this.pokemonId} marqué comme vu (était capturé)`);
  }
  next();
});

// Validation: Cohérence des dates
PokédexEntrySchema.pre('validate', function(next) {
  if (this.firstCaughtAt && this.firstSeenAt && 
      this.firstCaughtAt < this.firstSeenAt) {
    return next(new Error('firstCaughtAt ne peut être avant firstSeenAt'));
  }
  
  if (this.isSeen && !this.firstSeenAt) {
    this.firstSeenAt = this.lastSeenAt || new Date();
  }
  
  next();
});

// Validation: Cohérence des compteurs
PokédexEntrySchema.pre('validate', function(next) {
  if (this.timesCaught > this.timesEncountered) {
    return next(new Error('timesCaught ne peut dépasser timesEncountered'));
  }
  next();
});

// ===== MÉTHODES D'INSTANCE OPTIMISÉES =====

/**
 * Marque un Pokémon comme vu - OPTIMISÉ
 */
PokédexEntrySchema.methods.markSeen = async function(
  this: IPokédexEntry,
  data: SeenData
): Promise<boolean> {
  const now = new Date();
  let isNewDiscovery = false;
  
  // Première fois vu
  if (!this.isSeen) {
    this.isSeen = true;
    this.firstSeenAt = now;
    this.firstLocation = data.location;
    this.firstLevel = data.level;
    this.firstMethod = data.method;
    isNewDiscovery = true;
  }
  
  // Mise à jour systématique
  this.lastSeenAt = now;
  this.timesEncountered += 1;
  
  // Sauvegarder en une fois
  await this.save();
  
  return isNewDiscovery;
};

/**
 * Marque un Pokémon comme capturé - OPTIMISÉ
 */
PokédexEntrySchema.methods.markCaught = async function(
  this: IPokédexEntry,
  data: CaughtData
): Promise<{ isNewCapture: boolean; isNewBest: boolean }> {
  const now = new Date();
  let isNewCapture = false;
  let isNewBest = false;
  
  // Première capture
  if (!this.isCaught) {
    this.isCaught = true;
    this.firstCaughtAt = now;
    isNewCapture = true;
    
    // S'assurer qu'il est vu
    if (!this.isSeen) {
      this.isSeen = true;
      this.firstSeenAt = now;
      this.firstLocation = data.location;
      this.firstLevel = data.level;
      this.firstMethod = data.method;
    }
  }
  
  // Mise à jour compteurs
  this.lastCaughtAt = now;
  this.timesCaught += 1;
  
  // Vérifier meilleur spécimen
  isNewBest = this.updateBestSpecimen({
    level: data.level,
    isShiny: data.isShiny,
    ownedPokemonId: data.ownedPokemonId
  });
  
  await this.save();
  
  return { isNewCapture, isNewBest };
};

/**
 * Met à jour le meilleur spécimen - OPTIMISÉ
 */
PokédexEntrySchema.methods.updateBestSpecimen = function(
  this: IPokédexEntry,
  data: SpecimenData
): boolean {
  let isNewBest = false;
  
  // Premier spécimen ou nouveau record
  if (data.level > this.bestLevel) {
    this.bestLevel = data.level;
    this.bestSpecimenId = data.ownedPokemonId;
    isNewBest = true;
  }
  
  // Gestion shiny
  if (data.isShiny) {
    if (!this.hasShiny) {
      this.hasShiny = true;
      this.bestShinyLevel = data.level;
      isNewBest = true;
    } else if (!this.bestShinyLevel || data.level > this.bestShinyLevel) {
      this.bestShinyLevel = data.level;
      isNewBest = true;
    }
  }
  
  return isNewBest;
};

/**
 * Récupère les données de progression - OPTIMISÉ
 */
PokédexEntrySchema.methods.getProgress = function(this: IPokédexEntry): ProgressData {
  const now = new Date();
  
  return {
    seen: this.isSeen,
    caught: this.isCaught,
    encounters: this.timesEncountered,
    captures: this.timesCaught,
    firstSeenDaysAgo: this.firstSeenAt ? 
      Math.floor((now.getTime() - this.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)) : -1,
    firstCaughtDaysAgo: this.firstCaughtAt ? 
      Math.floor((now.getTime() - this.firstCaughtAt.getTime()) / (1000 * 60 * 60 * 24)) : undefined,
    bestLevel: this.bestLevel,
    hasShiny: this.hasShiny
  };
};

// ===== MÉTHODES STATIQUES OPTIMISÉES =====

/**
 * Trouve ou crée une entrée - AVEC UPSERT
 */
PokédxEntrySchema.statics.findOrCreate = async function(
  playerId: string, 
  pokemonId: number,
  initialData?: Partial<SeenData>
): Promise<IPokédexEntry> {
  // Validation des paramètres
  if (!playerId || pokemonId < 1) {
    throw new Error('Paramètres invalides pour findOrCreate');
  }
  
  // Upsert optimisé
  const result = await this.findOneAndUpdate(
    { playerId, pokemonId },
    {
      $setOnInsert: {
        playerId,
        pokemonId,
        isSeen: false,
        isCaught: false,
        timesEncountered: 0,
        timesCaught: 0,
        bestLevel: 1,
        hasShiny: false,
        firstLocation: initialData?.location || 'Inconnu',
        firstLevel: initialData?.level || 1,
        firstMethod: initialData?.method || 'wild',
        lastSeenAt: new Date()
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
 * Requête bulk optimisée pour les entrées d'un joueur
 */
PokédxEntrySchema.statics.getPlayerEntries = async function(
  playerId: string,
  options: {
    seenOnly?: boolean;
    caughtOnly?: boolean;
    shinyOnly?: boolean;
    limit?: number;
    skip?: number;
    sortBy?: 'pokemonId' | 'lastSeen' | 'firstSeen';
  } = {}
): Promise<IPokédexEntry[]> {
  // Construction requête optimisée
  const query: any = { playerId };
  
  if (options.seenOnly) query.isSeen = true;
  if (options.caughtOnly) query.isCaught = true;
  if (options.shinyOnly) query.hasShiny = true;
  
  // Sort optimisé
  let sort: any = { pokemonId: 1 };
  switch (options.sortBy) {
    case 'lastSeen':
      sort = { lastSeenAt: -1 };
      break;
    case 'firstSeen':
      sort = { firstSeenAt: -1 };
      break;
  }
  
  return this.find(query)
    .sort(sort)
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .lean() // Optimisation: pas d'hydration Mongoose
    .exec();
};

/**
 * Statistiques rapides par joueur - AGGREGATION OPTIMISÉE
 */
PokédxEntrySchema.statics.getPlayerStats = async function(playerId: string) {
  const [stats] = await this.aggregate([
    { $match: { playerId } },
    {
      $group: {
        _id: null,
        totalSeen: { $sum: { $cond: ['$isSeen', 1, 0] } },
        totalCaught: { $sum: { $cond: ['$isCaught', 1, 0] } },
        totalShinies: { $sum: { $cond: ['$hasShiny', 1, 0] } },
        totalEncounters: { $sum: '$timesEncountered' },
        totalCaptures: { $sum: '$timesCaught' },
        highestLevel: { $max: '$bestLevel' },
        recentActivity: { 
          $sum: { 
            $cond: [
              { $gte: ['$lastSeenAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1, 
              0
            ] 
          }
        }
      }
    }
  ]);
  
  return stats || {
    totalSeen: 0,
    totalCaught: 0,
    totalShinies: 0,
    totalEncounters: 0,
    totalCaptures: 0,
    highestLevel: 1,
    recentActivity: 0
  };
};

// ===== EXPORT =====
export const PokédexEntry = mongoose.model<IPokédexEntry>('PokédexEntry', PokédxEntrySchema);
export default PokédexEntry;

// Types pour export
export type PokédexEntryDocument = IPokédexEntry;
export type { SeenData, CaughtData, SpecimenData, ProgressData };
