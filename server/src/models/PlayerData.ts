import mongoose, { Document } from "mongoose";

// ✅ INTERFACE pour les méthodes personnalisées
interface IPlayerData extends Document {
  // Propriétés virtuelles
  isAccountLocked: boolean;
  isBanActive: boolean;
  
  // Méthodes personnalisées existantes
  recordFailedLogin(): Promise<any>;
  resetFailedLogins(): Promise<any>;
  recordSuccessfulLogin(ip?: string): Promise<any>;
  
  // ✅ NOUVELLES méthodes pour gestion des objets
  canCollectObject(objectId: number, zone: string): boolean;
  recordObjectCollection(objectId: number, zone: string, cooldownHours?: number): Promise<any>;
  getObjectCooldownInfo(objectId: number, zone: string): {
    canCollect: boolean;
    cooldownRemaining: number;
    nextAvailableTime?: number;
    lastCollectedTime?: number;
  };
  cleanupExpiredCooldowns(): Promise<any>;
}

// ✅ NOUVEAU : Interface pour les états d'objets (cooldowns)
interface ObjectStateEntry {
  objectId: number;
  zone: string;
  lastCollectedTime: number;    // timestamp
  nextAvailableTime: number;    // timestamp
  cooldownDuration: number;     // durée en millisecondes
}

const PlayerDataSchema = new mongoose.Schema({
  // ✅ CHAMPS EXISTANTS (vos données de jeu) - INCHANGÉS
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

  // ✅ NOUVEAUX CHAMPS pour l'authentification sécurisée - INCHANGÉS
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
  // Sécurité et métadonnées - INCHANGÉS
  deviceFingerprint: { type: String },
  registrationIP: { type: String },
  lastLoginIP: { type: String },
  
  // Timestamps et statistiques - INCHANGÉS
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  banExpiresAt: { type: Date },
  
  // Données de jeu (gardez vos champs existants) - INCHANGÉS
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  totalPlaytime: { type: Number, default: 0 }, // en minutes
  currentSessionStart: { type: Date, default: null },
  // Préférences utilisateur - INCHANGÉS
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  preferredLanguage: { type: String, default: 'en' },
  
  // Statistiques de sécurité - INCHANGÉS
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: { type: Date },
  passwordChangedAt: { type: Date, default: Date.now },

  // ✅ NOUVEAU : États des objets collectés avec cooldowns
  objectStates: {
    type: [{
      objectId: { type: Number, required: true },
      zone: { type: String, required: true },
      lastCollectedTime: { type: Number, required: true }, // timestamp en ms
      nextAvailableTime: { type: Number, required: true }, // timestamp en ms
      cooldownDuration: { type: Number, required: true }   // durée en ms
    }],
    default: [] // ✅ IMPORTANT : Valeur par défaut pour compatibilité
  }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

// ✅ INDEX pour performance et sécurité - INCHANGÉS + NOUVEAUX
PlayerDataSchema.index({ username: 1 });
PlayerDataSchema.index({ email: 1 });
PlayerDataSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });
PlayerDataSchema.index({ deviceFingerprint: 1 });
PlayerDataSchema.index({ isActive: 1 });
PlayerDataSchema.index({ createdAt: 1 });

// ✅ NOUVEAU : Index pour les requêtes d'objets
PlayerDataSchema.index({ "objectStates.objectId": 1, "objectStates.zone": 1 });
PlayerDataSchema.index({ "objectStates.nextAvailableTime": 1 }); // Pour cleanup des cooldowns expirés

// ✅ MÉTHODES virtuelles pour sécurité - INCHANGÉES
PlayerDataSchema.virtual('isAccountLocked').get(function() {
  return this.failedLoginAttempts >= 5 && 
         this.lastFailedLogin && 
         (Date.now() - this.lastFailedLogin.getTime()) < 15 * 60 * 1000; // 15 minutes
});

PlayerDataSchema.virtual('isBanActive').get(function() {
  return this.isBanned && (!this.banExpiresAt || this.banExpiresAt > new Date());
});

// ✅ MÉTHODES pour gestion des tentatives de connexion - INCHANGÉES
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

// ✅ NOUVELLES MÉTHODES pour gestion des objets avec cooldown
PlayerDataSchema.methods.canCollectObject = function(objectId: number, zone: string): boolean {
  if (!this.objectStates || this.objectStates.length === 0) {
    return true; // Première fois ou pas d'états = peut collecter
  }
  
  const objectState = this.objectStates.find(
    (state: ObjectStateEntry) => state.objectId === objectId && state.zone === zone
  );
  
  if (!objectState) {
    return true; // Jamais collecté = peut collecter
  }
  
  // Vérifier si le cooldown est écoulé
  return Date.now() >= objectState.nextAvailableTime;
};

PlayerDataSchema.methods.recordObjectCollection = function(
  objectId: number, 
  zone: string, 
  cooldownHours: number = 24
): Promise<any> {
  // objectStates est automatiquement initialisé par Mongoose avec default: []
  
  const now = Date.now();
  const cooldownDuration = cooldownHours * 60 * 60 * 1000; // Heures → ms
  const nextAvailableTime = now + cooldownDuration;
  
  // Chercher un état existant
  const existingStateIndex = this.objectStates.findIndex(
    (state: ObjectStateEntry) => state.objectId === objectId && state.zone === zone
  );
  
  if (existingStateIndex >= 0) {
    // Mettre à jour l'état existant
    this.objectStates[existingStateIndex] = {
      objectId,
      zone,
      lastCollectedTime: now,
      nextAvailableTime,
      cooldownDuration
    };
  } else {
    // Ajouter un nouvel état
    this.objectStates.push({
      objectId,
      zone,
      lastCollectedTime: now,
      nextAvailableTime,
      cooldownDuration
    });
  }
  
  return this.save();
};

PlayerDataSchema.methods.getObjectCooldownInfo = function(objectId: number, zone: string) {
  if (!this.objectStates || this.objectStates.length === 0) {
    return { canCollect: true, cooldownRemaining: 0 };
  }
  
  const objectState = this.objectStates.find(
    (state: ObjectStateEntry) => state.objectId === objectId && state.zone === zone
  );
  
  if (!objectState) {
    return { canCollect: true, cooldownRemaining: 0 };
  }
  
  const now = Date.now();
  const canCollect = now >= objectState.nextAvailableTime;
  const cooldownRemaining = Math.max(0, objectState.nextAvailableTime - now);
  
  return {
    canCollect,
    cooldownRemaining, // en millisecondes
    nextAvailableTime: objectState.nextAvailableTime,
    lastCollectedTime: objectState.lastCollectedTime
  };
};

// ✅ MÉTHODE pour nettoyer les anciens cooldowns expirés (optionnel)
PlayerDataSchema.methods.cleanupExpiredCooldowns = function(): Promise<any> {
  if (!this.objectStates || this.objectStates.length === 0) {
    return Promise.resolve(this);
  }
  
  const now = Date.now();
  const activeStates = this.objectStates.filter(
    (state: ObjectStateEntry) => state.nextAvailableTime > now
  );
  
  // Seulement sauvegarder si des changements
  if (activeStates.length !== this.objectStates.length) {
    // Vider et repeupler le DocumentArray
    this.objectStates.splice(0, this.objectStates.length, ...activeStates);
    return this.save();
  }
  
  return Promise.resolve(this);
};

// ✅ MIDDLEWARE pre-save pour sécurité - ÉTENDU
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
    
    // ✅ NOUVEAU : objectStates est initialisé automatiquement par Mongoose avec default: []
  }
  
  next();
});

export const PlayerData = mongoose.model<IPlayerData>("PlayerData", PlayerDataSchema);

// ✅ EXPORT des types et interface pour TypeScript
export type { ObjectStateEntry };
export type { IPlayerData };
