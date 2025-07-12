// server/src/models/PokédexEntry.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== INTERFACES =====

export interface IPokédexEntry extends Document {
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
  };
  
  // === DONNÉES DE PREMIÈRE RENCONTRE ===
  firstEncounter?: {
    location: string;        // Lieu de première rencontre
    level: number;          // Niveau lors de première vue
    method: string;         // Méthode (wild, trainer, gift, etc.)
    weather?: string;       // Météo lors de la rencontre
    timeOfDay?: string;     // Moment de la journée
  };
  
  // === MÉTADONNÉES ===
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES D'INSTANCE ===
  markAsSeen(encounterData?: any): Promise<void>;
  markAsCaught(pokemonData: any): Promise<void>;
  updateBestSpecimen(pokemonData: any): Promise<boolean>;
  getCompletionStatus(): {
    seen: boolean;
    caught: boolean;
    firstSeenDaysAgo: number;
    firstCaughtDaysAgo?: number;
  };
}

// ===== SCHÉMA MONGOOSE =====

const PokédexEntrySchema = new Schema<IPokédexEntry>({
  // === IDENTIFICATION ===
  playerId: { 
    type: String, 
    required: true,
    index: true 
  },
  pokemonId: { 
    type: Number, 
    required: true,
    min: 1,
    max: 1000, // Pour futurs Pokémon
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
  firstSeenAt: { type: Date },
  firstCaughtAt: { type: Date },
  lastSeenAt: { type: Date },
  lastCaughtAt: { type: Date },
  
  // === STATISTIQUES ===
  timesEncountered: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  timesCaught: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  
  // === MEILLEUR SPÉCIMEN ===
  bestSpecimen: {
    level: { type: Number, min: 1, max: 100 },
    isShiny: { type: Boolean, default: false },
    caughtAt: { type: Date },
    ownedPokemonId: { type: String } // Référence faible vers OwnedPokemon
  },
  
  // === PREMIÈRE RENCONTRE ===
  firstEncounter: {
    location: { type: String, required: true },
    level: { type: Number, min: 1, max: 100 },
    method: { 
      type: String, 
      enum: ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special'],
      default: 'wild'
    },
    weather: { 
      type: String,
      enum: ['clear', 'rain', 'storm', 'snow', 'fog', 'sandstorm']
    },
    timeOfDay: {
      type: String,
      enum: ['day', 'night', 'dawn', 'dusk']
    }
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt/updatedAt
  collection: 'pokedex_entries'
});

// ===== INDEX COMPOSITES =====
PokédexEntrySchema.index({ playerId: 1, pokemonId: 1 }, { unique: true });
PokédexEntrySchema.index({ playerId: 1, isSeen: 1 });
PokédexEntrySchema.index({ playerId: 1, isCaught: 1 });
PokédexEntrySchema.index({ playerId: 1, 'bestSpecimen.isShiny': 1 });

// ===== VALIDATIONS =====

// Un Pokémon capturé doit être vu
PokédexEntrySchema.pre('save', function(next) {
  if (this.isCaught && !this.isSeen) {
    this.isSeen = true;
  }
  
  // Si capturé mais pas de date de première vue, utiliser date de capture
  if (this.isCaught && !this.firstSeenAt && this.firstCaughtAt) {
    this.firstSeenAt = this.firstCaughtAt;
  }
  
  next();
});

// Validation cohérence dates
PokédexEntrySchema.pre('save', function(next) {
  if (this.firstCaughtAt && this.firstSeenAt && 
      this.firstCaughtAt < this.firstSeenAt) {
    return next(new Error('Date de première capture ne peut être antérieure à première vue'));
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Marque un Pokémon comme vu
 */
PokédexEntrySchema.methods.markAsSeen = async function(
  this: IPokédexEntry, 
  encounterData?: {
    location?: string;
    level?: number;
    method?: string;
    weather?: string;
    timeOfDay?: string;
  }
) {
  const now = new Date();
  
  // Première fois qu'on voit ce Pokémon
  if (!this.isSeen) {
    this.isSeen = true;
    this.firstSeenAt = now;
    
    // Sauvegarder données de première rencontre
    if (encounterData) {
      this.firstEncounter = {
        location: encounterData.location || 'Inconnu',
        level: encounterData.level || 1,
        method: encounterData.method || 'wild',
        weather: encounterData.weather,
        timeOfDay: encounterData.timeOfDay
      };
    }
  }
  
  // Mise à jour statistiques
  this.lastSeenAt = now;
  this.timesEncountered += 1;
  
  await this.save();
};

/**
 * Marque un Pokémon comme capturé
 */
PokédexEntrySchema.methods.markAsCaught = async function(
  this: IPokédexEntry,
  pokemonData: {
    level: number;
    isShiny: boolean;
    ownedPokemonId: string;
    location?: string;
    method?: string;
  }
) {
  const now = new Date();
  
  // Première capture
  if (!this.isCaught) {
    this.isCaught = true;
    this.firstCaughtAt = now;
    
    // S'assurer qu'il est aussi marqué comme vu
    if (!this.isSeen) {
      this.isSeen = true;
      this.firstSeenAt = now;
    }
  }
  
  // Mise à jour statistiques
  this.lastCaughtAt = now;
  this.timesCaught += 1;
  
  // Vérifier si c'est un meilleur spécimen
  await this.updateBestSpecimen(pokemonData);
  
  await this.save();
};

/**
 * Met à jour le meilleur spécimen si nécessaire
 */
PokédexEntrySchema.methods.updateBestSpecimen = async function(
  this: IPokédexEntry,
  pokemonData: {
    level: number;
    isShiny: boolean;
    ownedPokemonId: string;
  }
): Promise<boolean> {
  let isNewBest = false;
  
  // Premier spécimen ou meilleur niveau
  if (!this.bestSpecimen || 
      pokemonData.level > this.bestSpecimen.level ||
      (pokemonData.isShiny && !this.bestSpecimen.isShiny)) {
    
    this.bestSpecimen = {
      level: pokemonData.level,
      isShiny: pokemonData.isShiny,
      caughtAt: new Date(),
      ownedPokemonId: pokemonData.ownedPokemonId
    };
    
    isNewBest = true;
  }
  
  return isNewBest;
};

/**
 * Récupère le statut de complétion
 */
PokédexEntrySchema.methods.getCompletionStatus = function(this: IPokédexEntry) {
  const now = new Date();
  
  return {
    seen: this.isSeen,
    caught: this.isCaught,
    firstSeenDaysAgo: this.firstSeenAt ? 
      Math.floor((now.getTime() - this.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)) : -1,
    firstCaughtDaysAgo: this.firstCaughtAt ? 
      Math.floor((now.getTime() - this.firstCaughtAt.getTime()) / (1000 * 60 * 60 * 24)) : undefined
  };
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve ou crée une entrée Pokédex
 */
PokédexEntrySchema.statics.findOrCreate = async function(
  playerId: string, 
  pokemonId: number
): Promise<IPokédexEntry> {
  let entry = await this.findOne({ playerId, pokemonId });
  
  if (!entry) {
    entry = new this({
      playerId,
      pokemonId,
      isSeen: false,
      isCaught: false,
      timesEncountered: 0,
      timesCaught: 0
    });
  }
  
  return entry;
};

/**
 * Récupère toutes les entrées d'un joueur
 */
PokédexEntrySchema.statics.getPlayerEntries = async function(
  playerId: string,
  options?: {
    seenOnly?: boolean;
    caughtOnly?: boolean;
    shinyOnly?: boolean;
  }
) {
  const query: any = { playerId };
  
  if (options?.seenOnly) query.isSeen = true;
  if (options?.caughtOnly) query.isCaught = true;
  if (options?.shinyOnly) query['bestSpecimen.isShiny'] = true;
  
  return await this.find(query).sort({ pokemonId: 1 });
};

// ===== EXPORT =====
export const PokédexEntry = mongoose.model<IPokédexEntry>('PokédexEntry', PokédexEntrySchema);

// ===== TYPES D'EXPORT =====
export type PokédexEntryDocument = IPokédexEntry;
export type CreatePokédexEntryData = Partial<Pick<IPokédexEntry, 
  'playerId' | 'pokemonId' | 'isSeen' | 'isCaught'
>>;
