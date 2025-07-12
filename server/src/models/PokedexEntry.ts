// server/src/models/PokedexEntry.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== INTERFACES =====

export interface IPokedexEntry extends Document {
  // === IDENTIFICATION ===
  playerId: string;          // ID du joueur
  pokemonId: number;         // ID du Pokémon (1-151, etc.)
  
  // === STATUT DE DÉCOUVERTE ===
  isSeen: boolean;           // Pokémon vu (rencontré)
  isCaught: boolean;         // Pokémon capturé
  
  // === DATES DE DÉCOUVERTE ===
  firstSeenAt?: Date;        // Date de première vue
  firstCaughtAt?: Date;      // Date de première capture
  lastSeenAt?: Date;         // Dernière fois vu
  lastCaughtAt?: Date;       // Dernière fois capturé
  
  // === STATISTIQUES DÉTAILLÉES ===
  timesEncountered: number;  // Nombre de fois rencontré
  timesCaught: number;       // Nombre de fois capturé
  
  // === MEILLEURS SPÉCIMENS ===
  bestSpecimen?: {
    level: number;           // Meilleur niveau capturé
    isShiny: boolean;        // A déjà capturé un shiny
    caughtAt: Date;          // Date de cette capture
    ownedPokemonId?: string; // Référence au OwnedPokemon (si encore possédé)
    location: string;        // Lieu de capture du meilleur
    captureTime?: number;    // Temps pris pour capturer (en secondes)
  };
  
  // === DONNÉES DE PREMIÈRE RENCONTRE ===
  firstEncounter?: {
    location: string;        // Lieu de première rencontre
    level: number;          // Niveau lors de première vue
    method: string;         // Méthode (wild, trainer, gift, etc.)
    weather?: string;       // Météo lors de la rencontre
    timeOfDay?: string;     // Moment de la journée
    sessionId?: string;     // ID de session pour tracking
  };
  
  // === DONNÉES ADDITIONNELLES ===
  notes?: string;            // Notes personnelles du joueur
  favorited: boolean;        // Marqué comme favori
  tags: string[];           // Tags personnalisés
  
  // === MÉTADONNÉES ===
  version: number;          // Version pour migrations
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES D'INSTANCE ===
  markAsSeen(encounterData?: any): Promise<boolean>;
  markAsCaught(pokemonData: any): Promise<boolean>;
  updateBestSpecimen(pokemonData: any): Promise<boolean>;
  getCompletionStatus(): any;
  addNote(note: string): Promise<void>;
  toggleFavorite(): Promise<boolean>;
  addTag(tag: string): Promise<void>;
  removeTag(tag: string): Promise<void>;
}

// ===== SCHÉMA MONGOOSE =====

const PokedexEntrySchema = new Schema<IPokedexEntry>({
  // === IDENTIFICATION ===
  playerId: { 
    type: String, 
    required: true,
    index: true,
    validate: {
      validator: (v: string) => v && v.length > 0,
      message: 'Player ID is required'
    }
  },
  pokemonId: { 
    type: Number, 
    required: true,
    min: [1, 'Pokemon ID must be positive'],
    max: [2000, 'Pokemon ID too high'], // Future-proof
    index: true
  },
  
  // === STATUT ===
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
  
  // === DATES ===
  firstSeenAt: { 
    type: Date,
    index: true 
  },
  firstCaughtAt: { 
    type: Date,
    index: true 
  },
  lastSeenAt: { type: Date },
  lastCaughtAt: { type: Date },
  
  // === STATISTIQUES ===
  timesEncountered: { 
    type: Number, 
    default: 0,
    min: [0, 'Times encountered cannot be negative']
  },
  timesCaught: { 
    type: Number, 
    default: 0,
    min: [0, 'Times caught cannot be negative']
  },
  
  // === MEILLEUR SPÉCIMEN ===
  bestSpecimen: {
    level: { 
      type: Number, 
      min: [1, 'Level must be at least 1'], 
      max: [100, 'Level cannot exceed 100'] 
    },
    isShiny: { type: Boolean, default: false },
    caughtAt: { type: Date },
    ownedPokemonId: { 
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid owned Pokemon ID format'
      }
    },
    location: { 
      type: String, 
      maxlength: [100, 'Location name too long'],
      trim: true
    },
    captureTime: { 
      type: Number, 
      min: [0, 'Capture time cannot be negative'],
      max: [3600, 'Capture time too long'] // Max 1 hour
    }
  },
  
  // === PREMIÈRE RENCONTRE ===
  firstEncounter: {
    location: { 
      type: String, 
      required: true,
      maxlength: [100, 'Location name too long'],
      trim: true
    },
    level: { 
      type: Number, 
      min: [1, 'Level must be at least 1'], 
      max: [100, 'Level cannot exceed 100'] 
    },
    method: { 
      type: String, 
      enum: {
        values: ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special', 'raid', 'legendary'],
        message: 'Invalid encounter method'
      },
      default: 'wild'
    },
    weather: { 
      type: String,
      enum: {
        values: ['clear', 'rain', 'storm', 'snow', 'fog', 'sandstorm', 'sunny', 'cloudy'],
        message: 'Invalid weather type'
      }
    },
    timeOfDay: {
      type: String,
      enum: {
        values: ['day', 'night', 'dawn', 'dusk'],
        message: 'Invalid time of day'
      }
    },
    sessionId: { 
      type: String,
      maxlength: [50, 'Session ID too long']
    }
  },
  
  // === DONNÉES ADDITIONNELLES ===
  notes: { 
    type: String, 
    maxlength: [500, 'Notes too long'],
    trim: true
  },
  favorited: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  tags: [{ 
    type: String, 
    maxlength: [30, 'Tag too long'],
    trim: true 
  }],
  
  // === MÉTADONNÉES ===
  version: { 
    type: Number, 
    default: 1,
    min: [1, 'Version must be positive']
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt/updatedAt
  collection: 'pokedex_entries',
  // Optimizations
  minimize: false, // Keep empty objects
  versionKey: false // Remove __v field
});

// ===== INDEX COMPOSITES OPTIMISÉS =====

// Index principal unique
PokedexEntrySchema.index({ playerId: 1, pokemonId: 1 }, { unique: true });

// Index pour les requêtes fréquentes
PokedexEntrySchema.index({ playerId: 1, isSeen: 1 });
PokedexEntrySchema.index({ playerId: 1, isCaught: 1 });
PokedexEntrySchema.index({ playerId: 1, favorited: 1 });
PokedexEntrySchema.index({ playerId: 1, 'bestSpecimen.isShiny': 1 });

// Index pour le tri par dates
PokedexEntrySchema.index({ playerId: 1, firstSeenAt: -1 });
PokedexEntrySchema.index({ playerId: 1, firstCaughtAt: -1 });
PokedexEntrySchema.index({ playerId: 1, updatedAt: -1 });

// Index pour les requêtes par tags
PokedexEntrySchema.index({ playerId: 1, tags: 1 });

// Index TTL pour cleanup automatique des sessions anciennes (optionnel)
PokedexEntrySchema.index({ 'firstEncounter.sessionId': 1 }, { 
  expireAfterSeconds: 24 * 60 * 60, // 24 heures
  sparse: true // Seulement si sessionId existe
});

// ===== VALIDATIONS PRE-SAVE =====

// Validation de cohérence
PokedexEntrySchema.pre('save', function(next) {
  // Un Pokémon capturé doit être vu
  if (this.isCaught && !this.isSeen) {
    this.isSeen = true;
  }
  
  // Si capturé mais pas de date de première vue, utiliser date de capture
  if (this.isCaught && !this.firstSeenAt && this.firstCaughtAt) {
    this.firstSeenAt = this.firstCaughtAt;
  }
  
  // Validation des dates
  if (this.firstCaughtAt && this.firstSeenAt && 
      this.firstCaughtAt < this.firstSeenAt) {
    return next(new Error('First caught date cannot be before first seen date'));
  }
  
  // Nettoyage des tags
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.filter(tag => tag && tag.trim().length > 0))];
    if (this.tags.length > 20) { // Limite le nombre de tags
      this.tags = this.tags.slice(0, 20);
    }
  }
  
  // Validation du best specimen
  if (this.bestSpecimen && !this.isCaught) {
    return next(new Error('Cannot have best specimen without being caught'));
  }
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Marque un Pokémon comme vu de manière sécurisée
 */
PokedexEntrySchema.methods.markAsSeen = async function(
  this: IPokedexEntry, 
  encounterData?: {
    location?: string;
    level?: number;
    method?: string;
    weather?: string;
    timeOfDay?: string;
    sessionId?: string;
  }
): Promise<boolean> {
  try {
    const now = new Date();
    let isNewDiscovery = false;
    
    // Première fois qu'on voit ce Pokémon
    if (!this.isSeen) {
      this.isSeen = true;
      this.firstSeenAt = now;
      isNewDiscovery = true;
      
      // Sauvegarder données de première rencontre
      if (encounterData) {
        this.firstEncounter = {
          location: encounterData.location || 'Unknown',
          level: Math.max(1, Math.min(100, encounterData.level || 1)),
          method: encounterData.method || 'wild',
          weather: encounterData.weather,
          timeOfDay: encounterData.timeOfDay,
          sessionId: encounterData.sessionId
        };
      }
    }
    
    // Mise à jour statistiques
    this.lastSeenAt = now;
    this.timesEncountered = Math.min(this.timesEncountered + 1, 999999); // Limite pour éviter overflow
    
    await this.save();
    return isNewDiscovery;
    
  } catch (error) {
    console.error(`❌ [PokedexEntry] Error marking ${this.pokemonId} as seen:`, error);
    throw error;
  }
};

/**
 * Marque un Pokémon comme capturé de manière sécurisée
 */
PokedexEntrySchema.methods.markAsCaught = async function(
  this: IPokedexEntry,
  pokemonData: {
    level: number;
    isShiny: boolean;
    ownedPokemonId: string;
    location?: string;
    method?: string;
    captureTime?: number;
  }
): Promise<boolean> {
  try {
    const now = new Date();
    let isNewCapture = false;
    
    // Validation des données
    if (!pokemonData.ownedPokemonId) {
      throw new Error('Owned Pokemon ID is required');
    }
    
    // Première capture
    if (!this.isCaught) {
      this.isCaught = true;
      this.firstCaughtAt = now;
      isNewCapture = true;
      
      // S'assurer qu'il est aussi marqué comme vu
      if (!this.isSeen) {
        this.isSeen = true;
        this.firstSeenAt = now;
      }
    }
    
    // Mise à jour statistiques
    this.lastCaughtAt = now;
    this.timesCaught = Math.min(this.timesCaught + 1, 999999);
    
    // Mettre à jour le meilleur spécimen
    await this.updateBestSpecimen({
      ...pokemonData,
      location: pokemonData.location || 'Unknown'
    });
    
    await this.save();
    return isNewCapture;
    
  } catch (error) {
    console.error(`❌ [PokedexEntry] Error marking ${this.pokemonId} as caught:`, error);
    throw error;
  }
};

/**
 * Met à jour le meilleur spécimen si nécessaire
 */
PokedexEntrySchema.methods.updateBestSpecimen = async function(
  this: IPokedexEntry,
  pokemonData: {
    level: number;
    isShiny: boolean;
    ownedPokemonId: string;
    location: string;
    captureTime?: number;
  }
): Promise<boolean> {
  try {
    let isNewBest = false;
    
    // Validation
    const level = Math.max(1, Math.min(100, pokemonData.level));
    const captureTime = pokemonData.captureTime ? 
      Math.max(0, Math.min(3600, pokemonData.captureTime)) : undefined;
    
    // Premier spécimen ou critères d'amélioration
    const shouldUpdate = !this.bestSpecimen || 
                        pokemonData.isShiny && !this.bestSpecimen.isShiny || // Shiny prioritaire
                        level > this.bestSpecimen.level || // Meilleur niveau
                        (captureTime && (!this.bestSpecimen.captureTime || captureTime < this.bestSpecimen.captureTime)); // Capture plus rapide
    
    if (shouldUpdate) {
      this.bestSpecimen = {
        level,
        isShiny: pokemonData.isShiny,
        caughtAt: new Date(),
        ownedPokemonId: pokemonData.ownedPokemonId,
        location: pokemonData.location,
        captureTime
      };
      isNewBest = true;
    }
    
    return isNewBest;
    
  } catch (error) {
    console.error(`❌ [PokedexEntry] Error updating best specimen:`, error);
    throw error;
  }
};

/**
 * Récupère le statut de complétion avec calculs optimisés
 */
PokedexEntrySchema.methods.getCompletionStatus = function(this: IPokedexEntry) {
  const now = new Date();
  
  return {
    seen: this.isSeen,
    caught: this.isCaught,
    favorited: this.favorited,
    shiny: this.bestSpecimen?.isShiny || false,
    firstSeenDaysAgo: this.firstSeenAt ? 
      Math.floor((now.getTime() - this.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)) : -1,
    firstCaughtDaysAgo: this.firstCaughtAt ? 
      Math.floor((now.getTime() - this.firstCaughtAt.getTime()) / (1000 * 60 * 60 * 24)) : undefined,
    timesEncountered: this.timesEncountered,
    timesCaught: this.timesCaught,
    bestLevel: this.bestSpecimen?.level,
    lastActivity: this.lastCaughtAt || this.lastSeenAt || this.updatedAt
  };
};

/**
 * Ajoute une note personnelle
 */
PokedexEntrySchema.methods.addNote = async function(
  this: IPokedexEntry,
  note: string
): Promise<void> {
  if (!note || note.trim().length === 0) return;
  
  const cleanNote = note.trim().substring(0, 500); // Limite de sécurité
  this.notes = cleanNote;
  await this.save();
};

/**
 * Toggle le statut favori
 */
PokedexEntrySchema.methods.toggleFavorite = async function(this: IPokedexEntry): Promise<boolean> {
  this.favorited = !this.favorited;
  await this.save();
  return this.favorited;
};

/**
 * Ajoute un tag
 */
PokedexEntrySchema.methods.addTag = async function(
  this: IPokedexEntry,
  tag: string
): Promise<void> {
  if (!tag || tag.trim().length === 0) return;
  
  const cleanTag = tag.trim().toLowerCase().substring(0, 30);
  if (!this.tags.includes(cleanTag)) {
    this.tags.push(cleanTag);
    await this.save();
  }
};

/**
 * Supprime un tag
 */
PokedexEntrySchema.methods.removeTag = async function(
  this: IPokedexEntry,
  tag: string
): Promise<void> {
  const cleanTag = tag.trim().toLowerCase();
  this.tags = this.tags.filter(t => t !== cleanTag);
  await this.save();
};

// ===== MÉTHODES STATIQUES OPTIMISÉES =====

/**
 * Trouve ou crée une entrée Pokédex de manière atomique
 */
PokedexEntrySchema.statics.findOrCreate = async function(
  playerId: string, 
  pokemonId: number
): Promise<IPokedexEntry> {
  // Validation des paramètres
  if (!playerId || playerId.trim().length === 0) {
    throw new Error('Player ID is required');
  }
  if (!pokemonId || pokemonId < 1 || pokemonId > 2000) {
    throw new Error('Invalid Pokemon ID');
  }
  
  // Tentative de création avec upsert pour éviter les race conditions
  const entry = await this.findOneAndUpdate(
    { playerId: playerId.trim(), pokemonId },
    {
      $setOnInsert: {
        playerId: playerId.trim(),
        pokemonId,
        isSeen: false,
        isCaught: false,
        timesEncountered: 0,
        timesCaught: 0,
        favorited: false,
        tags: [],
        version: 1
      }
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  
  return entry;
};

/**
 * Récupère toutes les entrées d'un joueur avec optimisations
 */
PokedexEntrySchema.statics.getPlayerEntries = async function(
  playerId: string,
  options?: {
    seenOnly?: boolean;
    caughtOnly?: boolean;
    shinyOnly?: boolean;
    favoritedOnly?: boolean;
    tags?: string[];
    limit?: number;
    skip?: number;
    sort?: any;
  }
) {
  if (!playerId || playerId.trim().length === 0) {
    throw new Error('Player ID is required');
  }
  
  const query: any = { playerId: playerId.trim() };
  
  // Filtres
  if (options?.seenOnly) query.isSeen = true;
  if (options?.caughtOnly) query.isCaught = true;
  if (options?.shinyOnly) query['bestSpecimen.isShiny'] = true;
  if (options?.favoritedOnly) query.favorited = true;
  if (options?.tags?.length) query.tags = { $in: options.tags };
  
  // Construction de la requête avec optimisations
  let queryBuilder = this.find(query);
  
  // Tri
  if (options?.sort) {
    queryBuilder = queryBuilder.sort(options.sort);
  } else {
    queryBuilder = queryBuilder.sort({ pokemonId: 1 }); // Tri par défaut
  }
  
  // Pagination
  if (options?.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options?.limit) queryBuilder = queryBuilder.limit(Math.min(options.limit, 1000)); // Limite de sécurité
  
  // Projection pour optimiser (exclure les champs volumineux si pas nécessaire)
  queryBuilder = queryBuilder.lean(); // Pour de meilleures performances
  
  return await queryBuilder.exec();
};

/**
 * Compte les entrées avec cache
 */
PokedexEntrySchema.statics.getPlayerStats = async function(playerId: string) {
  if (!playerId || playerId.trim().length === 0) {
    throw new Error('Player ID is required');
  }
  
  const pipeline = [
    { $match: { playerId: playerId.trim() } },
    {
      $group: {
        _id: null,
        totalSeen: { $sum: { $cond: ['$isSeen', 1, 0] } },
        totalCaught: { $sum: { $cond: ['$isCaught', 1, 0] } },
        totalShiny: { $sum: { $cond: ['$bestSpecimen.isShiny', 1, 0] } },
        totalFavorited: { $sum: { $cond: ['$favorited', 1, 0] } },
        averageLevel: { $avg: '$bestSpecimen.level' },
        totalEncounters: { $sum: '$timesEncountered' },
        totalCaptures: { $sum: '$timesCaught' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSeen: 0,
    totalCaught: 0,
    totalShiny: 0,
    totalFavorited: 0,
    averageLevel: 0,
    totalEncounters: 0,
    totalCaptures: 0
  };
};

// ===== MIDDLEWARE POST =====

// Log des modifications importantes
PokedexEntrySchema.post('save', function(doc) {
  if (this.isNew) {
    console.log(`📝 [PokedexEntry] New entry created: Player ${doc.playerId}, Pokemon #${doc.pokemonId}`);
  }
});

// Nettoyage lors de la suppression
PokedexEntrySchema.pre('deleteOne', { document: true, query: false }, function() {
  console.log(`🗑️ [PokedexEntry] Deleting entry: Player ${this.playerId}, Pokemon #${this.pokemonId}`);
});

// ===== EXPORT =====
export const PokedexEntry = mongoose.model<IPokedexEntry>('PokedexEntry', PokedexEntrySchema);

// ===== TYPES D'EXPORT =====
export type PokedexEntryDocument = IPokedexEntry;
export type CreatePokedexEntryData = Partial<Pick<IPokedexEntry, 
  'playerId' | 'pokemonId' | 'isSeen' | 'isCaught' | 'notes' | 'favorited' | 'tags'
>>;

// ===== UTILITAIRES D'EXPORT =====
export const PokedexEntryUtils = {
  /**
   * Valide un ID de Pokémon
   */
  isValidPokemonId: (id: number): boolean => {
    return Number.isInteger(id) && id >= 1 && id <= 2000;
  },
  
  /**
   * Valide un ID de joueur
   */
  isValidPlayerId: (id: string): boolean => {
    return typeof id === 'string' && id.trim().length > 0 && id.length <= 100;
  },
  
  /**
   * Nettoie un tag
   */
  cleanTag: (tag: string): string => {
    return tag.trim().toLowerCase().substring(0, 30);
  },
  
  /**
   * Valide un niveau
   */
  isValidLevel: (level: number): boolean => {
    return Number.isInteger(level) && level >= 1 && level <= 100;
  }
};
