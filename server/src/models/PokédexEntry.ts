// server/src/models/PokédexEntry.ts
import mongoose, { Schema, Document } from "mongoose";

// ===== INTERFACE SIMPLIFIÉE =====

export interface IPokédexEntry extends Document {
  // === IDENTIFICATION ===
  playerId: string;          // ID du joueur
  pokemonId: number;         // ID du Pokémon (1-151, etc.)
  
  // === STATUT SIMPLE ===
  isSeen: boolean;           // Pokémon vu
  isCaught: boolean;         // Pokémon capturé
  
  // === DATES IMPORTANTES ===
  firstSeenAt?: Date;        // Première fois vu
  firstCaughtAt?: Date;      // Première fois capturé
  lastSeenAt?: Date;         // Dernière fois vu
  
  // === COMPTEURS ===
  timesEncountered: number;  // Nombre de rencontres
  timesCaught: number;       // Nombre de captures
  
  // === MEILLEUR SPÉCIMEN ===
  bestLevel: number;         // Meilleur niveau capturé
  hasShiny: boolean;         // A déjà eu un shiny
  bestSpecimenId?: string;   // ID du meilleur spécimen possédé
  
  // === PREMIÈRE RENCONTRE ===
  firstLocation?: string;    // Lieu de première rencontre
  firstLevel?: number;       // Niveau à la première vue
  firstMethod?: string;      // Méthode de première rencontre
  firstWeather?: string;     // Météo lors de première rencontre
  
  // === MÉTADONNÉES ===
  updatedAt: Date;
  createdAt: Date;
  
  // === MÉTHODES SIMPLES ===
  markSeen(data?: any): Promise<boolean>;
  markCaught(data: any): Promise<boolean>;
  isNewBestLevel(level: number): boolean;
}

// ===== SCHÉMA MONGOOSE SIMPLIFIÉ =====

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
    max: 1000,
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
  
  // === COMPTEURS ===
  timesEncountered: { 
    type: Number, 
    default: 0 
  },
  timesCaught: { 
    type: Number, 
    default: 0 
  },
  
  // === MEILLEUR SPÉCIMEN ===
  bestLevel: { 
    type: Number, 
    default: 1,
    min: 1, 
    max: 100 
  },
  hasShiny: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  bestSpecimenId: { type: String },
  
  // === PREMIÈRE RENCONTRE ===
  firstLocation: { type: String },
  firstLevel: { 
    type: Number, 
    min: 1, 
    max: 100 
  },
  firstMethod: { 
    type: String, 
    enum: ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special'],
    default: 'wild'
  },
  firstWeather: { 
    type: String,
    enum: ['clear', 'rain', 'storm', 'snow', 'fog', 'sandstorm']
  }
}, {
  timestamps: true,
  collection: 'pokedex_entries'
});

// ===== INDEX COMPOSITES =====
PokédexEntrySchema.index({ playerId: 1, pokemonId: 1 }, { unique: true });
PokédexEntrySchema.index({ playerId: 1, isSeen: 1 });
PokédexEntrySchema.index({ playerId: 1, isCaught: 1 });
PokédexEntrySchema.index({ playerId: 1, hasShiny: 1 });

// ===== MIDDLEWARE =====

// Auto-correction : capturé = forcément vu
PokédxEntrySchema.pre('save', function(next) {
  if (this.isCaught && !this.isSeen) {
    this.isSeen = true;
  }
  
  // Si capturé mais pas de date de vue, utiliser date de capture
  if (this.isCaught && !this.firstSeenAt && this.firstCaughtAt) {
    this.firstSeenAt = this.firstCaughtAt;
  }
  
  next();
});

// ===== MÉTHODES D'INSTANCE SIMPLIFIÉES =====

/**
 * 👁️ Marque comme vu - INTERFACE SIMPLE
 * Usage: entry.markSeen({ location: "Route 1", level: 5, weather: "clear" })
 */
PokédxEntrySchema.methods.markSeen = async function(
  this: IPokédexEntry,
  data?: {
    location?: string;
    level?: number;
    method?: string;
    weather?: string;
  }
): Promise<boolean> {
  const now = new Date();
  let isNewDiscovery = false;
  
  // Première fois qu'on voit ce Pokémon
  if (!this.isSeen) {
    this.isSeen = true;
    this.firstSeenAt = now;
    isNewDiscovery = true;
    
    // Sauvegarder les données de première rencontre
    if (data) {
      this.firstLocation = data.location || 'Zone Inconnue';
      this.firstLevel = data.level || 1;
      this.firstMethod = data.method || 'wild';
      this.firstWeather = data.weather;
    }
  }
  
  // Mise à jour à chaque rencontre
  this.lastSeenAt = now;
  this.timesEncountered += 1;
  
  await this.save();
  return isNewDiscovery;
};

/**
 * 🎯 Marque comme capturé - INTERFACE SIMPLE
 * Usage: entry.markCaught({ level: 15, isShiny: true, ownedPokemonId: "abc123", location: "Route 1" })
 */
PokédxEntrySchema.methods.markCaught = async function(
  this: IPokédexEntry,
  data: {
    level: number;
    isShiny?: boolean;
    ownedPokemonId: string;
    location?: string;
    method?: string;
  }
): Promise<boolean> {
  const now = new Date();
  let isNewCapture = false;
  
  // Première capture
  if (!this.isCaught) {
    this.isCaught = true;
    this.firstCaughtAt = now;
    isNewCapture = true;
    
    // S'assurer qu'il est marqué comme vu
    if (!this.isSeen) {
      this.isSeen = true;
      this.firstSeenAt = now;
      this.firstLocation = data.location || 'Zone Inconnue';
      this.firstLevel = data.level;
      this.firstMethod = data.method || 'wild';
    }
  }
  
  // Mise à jour compteurs
  this.timesCaught += 1;
  
  // Vérifier si c'est un meilleur spécimen
  if (this.isNewBestLevel(data.level) || (data.isShiny && !this.hasShiny)) {
    this.bestLevel = data.level;
    this.bestSpecimenId = data.ownedPokemonId;
    
    if (data.isShiny) {
      this.hasShiny = true;
    }
  }
  
  await this.save();
  return isNewCapture;
};

/**
 * 📊 Vérifie si c'est un nouveau record de niveau
 */
PokédxEntrySchema.methods.isNewBestLevel = function(
  this: IPokédexEntry,
  level: number
): boolean {
  return level > this.bestLevel;
};

// ===== MÉTHODES STATIQUES UTILES =====

/**
 * 🔍 Trouve ou crée une entrée - MÉTHODE SIMPLE
 * Usage: const entry = await PokédxEntry.findOrCreateEntry(playerId, pokemonId);
 */
PokédxEntrySchema.statics.findOrCreateEntry = async function(
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
      timesCaught: 0,
      bestLevel: 1,
      hasShiny: false
    });
  }
  
  return entry;
};

/**
 * 📈 Récupère les stats rapides d'un joueur
 * Usage: const stats = await PokédxEntry.getQuickStats(playerId);
 */
PokédxEntrySchema.statics.getQuickStats = async function(playerId: string) {
  const [seenCount, caughtCount, shinyCount] = await Promise.all([
    this.countDocuments({ playerId, isSeen: true }),
    this.countDocuments({ playerId, isCaught: true }),
    this.countDocuments({ playerId, hasShiny: true })
  ]);
  
  return {
    totalSeen: seenCount,
    totalCaught: caughtCount,
    totalShinies: shinyCount,
    seenPercentage: Math.round((seenCount / 151) * 100), // Kanto
    caughtPercentage: Math.round((caughtCount / 151) * 100)
  };
};

/**
 * 🕒 Récupère l'activité récente
 * Usage: const recent = await PokédxEntry.getRecentActivity(playerId, 10);
 */
PokédxEntrySchema.statics.getRecentActivity = async function(
  playerId: string, 
  limit: number = 10
) {
  return await this.find({
    playerId,
    $or: [
      { lastSeenAt: { $exists: true } },
      { firstCaughtAt: { $exists: true } }
    ]
  })
  .sort({ updatedAt: -1 })
  .limit(limit)
  .select('pokemonId isSeen isCaught hasShiny lastSeenAt firstCaughtAt bestLevel')
  .lean();
};

// ===== EXPORT =====
export const PokédxEntry = mongoose.model<IPokédxEntry>('PokédxEntry', PokédxEntrySchema);

// ===== TYPES D'EXPORT =====
export type PokédxEntryDocument = IPokédxEntry;

// ===== GUIDE D'UTILISATION SIMPLE =====
//
// 🎯 POUR MARQUER UN POKÉMON VU (depuis n'importe où) :
//
// const entry = await PokédxEntry.findOrCreateEntry(playerId, pokemonId);
// const isNew = await entry.markSeen({
//   location: "Route 1",
//   level: 5,
//   weather: "clear"
// });
// 
// if (isNew) {
//   console.log("Nouveau Pokémon découvert !");
// }
//
// 🎯 POUR MARQUER UN POKÉMON CAPTURÉ :
//
// const entry = await PokédxEntry.findOrCreateEntry(playerId, pokemonId);
// const isNewCapture = await entry.markCaught({
//   level: 15,
//   isShiny: false,
//   ownedPokemonId: "abc123",
//   location: "Route 1"
// });
//
// 🎯 POUR RÉCUPÉRER LES STATS RAPIDES :
//
// const stats = await PokédxEntry.getQuickStats(playerId);
// console.log(`${stats.totalCaught}/151 capturés (${stats.caughtPercentage}%)`);
//
