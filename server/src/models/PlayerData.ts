import mongoose from "mongoose";

// ✅ INTERFACE pour les méthodes personnalisées - AVEC COOLDOWNS
interface IPlayerData extends mongoose.Document {
  // Propriétés virtuelles
  isAccountLocked: boolean;
  isBanActive: boolean;
  
  // Méthodes personnalisées existantes
  recordFailedLogin(): Promise<any>;
  resetFailedLogins(): Promise<any>;
  recordSuccessfulLogin(ip?: string): Promise<any>;
  
  // NOUVELLES MÉTHODES pour cooldowns d'objets
  canCollectObject(objectId: number, zone: string): boolean;
  recordObjectCollection(objectId: number, zone: string, cooldownDurationMs: number): Promise<any>;
  getObjectCooldownInfo(objectId: number, zone: string): {
    canCollect: boolean;
    timeLeft: number;
    lastCollected?: Date;
    nextAvailable?: Date;
  };
}

const PlayerDataSchema = new mongoose.Schema({
  // ✅ CHAMPS EXISTANTS (vos données de jeu)
  username: { type: String, required: true, unique: true },
  gold: { type: Number, default: 1000 },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: "OwnedPokemon" }],
  lastX: { type: Number, default: 360 },
  lastY: { type: Number, default: 120 },
  lastMap: { type: String, default: "beach" },
walletAddress: { 
  type: String, 
  required: false, 
  unique: true, 
  sparse: true 
},

  // ✅ NOUVEAUX CHAMPS pour l'authentification sécurisée
  email: { 
    type: String, 
    required: false, 
    unique: true, 
    sparse: true, // Permet les valeurs null sans conflit unique
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: false // Optionnel pour compatibilité avec système wallet existant
  },
    isDev: {
    type: Boolean,
    default: false
  },
  // Sécurité et métadonnées
  deviceFingerprint: { type: String },
  registrationIP: { type: String },
  lastLoginIP: { type: String },
  
  // Timestamps et statistiques
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  banExpiresAt: { type: Date },
  
  // Données de jeu (gardez vos champs existants)
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  totalPlaytime: { type: Number, default: 0 }, // en minutes
  currentSessionStart: { type: Date, default: null },
  
  // ✅ NOUVEAU : États des objets collectés avec cooldowns
  objectStates: [{
    objectId: { type: Number, required: true },
    zone: { type: String, required: true },
    lastCollectedTime: { type: Number, required: true }, // timestamp
    nextAvailableTime: { type: Number, required: true }, // timestamp
    cooldownDuration: { type: Number, required: true }   // en millisecondes
  }],
  
  // Préférences utilisateur
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  preferredLanguage: { type: String, default: 'en' },
  
  // Statistiques de sécurité
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: { type: Date },
  passwordChangedAt: { type: Date, default: Date.now }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

// ✅ INDEX pour performance et sécurité
PlayerDataSchema.index({ username: 1 });
PlayerDataSchema.index({ email: 1 });
PlayerDataSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });
PlayerDataSchema.index({ deviceFingerprint: 1 });
PlayerDataSchema.index({ isActive: 1 });
PlayerDataSchema.index({ createdAt: 1 });

// NOUVEAU INDEX pour les cooldowns d'objets
PlayerDataSchema.index({ 'objectStates.objectId': 1, 'objectStates.zone': 1 });

// ✅ MÉTHODES virtuelles pour sécurité
PlayerDataSchema.virtual('isAccountLocked').get(function() {
  return this.failedLoginAttempts >= 5 && 
         this.lastFailedLogin && 
         (Date.now() - this.lastFailedLogin.getTime()) < 15 * 60 * 1000; // 15 minutes
});

PlayerDataSchema.virtual('isBanActive').get(function() {
  return this.isBanned && (!this.banExpiresAt || this.banExpiresAt > new Date());
});

// ✅ MÉTHODES pour gestion des tentatives de connexion
PlayerDataSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  this.lastFailedLogin = new Date();
  return this.save();
};

PlayerDataSchema.methods.resetFailedLogins = function() {
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  return this.save();
};

PlayerDataSchema.methods.recordSuccessfulLogin = function(ip?: string) {
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  if (ip) this.lastLoginIP = ip;
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  return this.save();
};

// ✅ NOUVELLES MÉTHODES pour gestion des cooldowns d'objets
PlayerDataSchema.methods.canCollectObject = function(objectId: number, zone: string) {
  const objectState = this.objectStates.find(
    (state: any) => state.objectId === objectId && state.zone === zone
  );
  
  // Si jamais collecté = OK
  if (!objectState) return true;
  
  // Vérifier si cooldown écoulé
  return Date.now() >= objectState.nextAvailableTime;
};

PlayerDataSchema.methods.recordObjectCollection = function(
  objectId: number, 
  zone: string, 
  cooldownDurationMs: number
) {
  const now = Date.now();
  const nextAvailable = now + cooldownDurationMs;
  
  // Chercher état existant
  const existingIndex = this.objectStates.findIndex(
    (state: any) => state.objectId === objectId && state.zone === zone
  );
  
  if (existingIndex >= 0) {
    // Mettre à jour existant
    this.objectStates[existingIndex].lastCollectedTime = now;
    this.objectStates[existingIndex].nextAvailableTime = nextAvailable;
    this.objectStates[existingIndex].cooldownDuration = cooldownDurationMs;
  } else {
    // Créer nouveau
    this.objectStates.push({
      objectId,
      zone,
      lastCollectedTime: now,
      nextAvailableTime: nextAvailable,
      cooldownDuration: cooldownDurationMs
    });
  }
  
  return this.save();
};

PlayerDataSchema.methods.getObjectCooldownInfo = function(objectId: number, zone: string) {
  const objectState = this.objectStates.find(
    (state: any) => state.objectId === objectId && state.zone === zone
  );
  
  if (!objectState) {
    return { canCollect: true, timeLeft: 0 };
  }
  
  const now = Date.now();
  const timeLeft = Math.max(0, objectState.nextAvailableTime - now);
  
  return {
    canCollect: now >= objectState.nextAvailableTime,
    timeLeft,
    lastCollected: new Date(objectState.lastCollectedTime),
    nextAvailable: new Date(objectState.nextAvailableTime)
  };
};

// ✅ MIDDLEWARE pre-save pour sécurité
PlayerDataSchema.pre('save', function(next) {
  // Nettoyer l'email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Vérifier les valeurs par défaut
  if (this.isNew) {
    if (!this.lastMap) this.lastMap = 'beach';
    if (this.gold === undefined) this.gold = 1000;
    if (this.lastX === undefined) this.lastX = 360;
    if (this.lastY === undefined) this.lastY = 120;
  }
  
  next();
});

// ✅ EXPORT avec interface typée
export const PlayerData = mongoose.model<IPlayerData>("PlayerData", PlayerDataSchema);
