// server/src/models/NpcData.ts - VERSION COMPLÈTE AVEC IDS GLOBAUX UNIQUES
import mongoose, { Schema, Document, Model } from "mongoose";
import { NpcType, Direction, AnyNpc } from "../types/NpcTypes";

// ===== SCHÉMA POUR LE COMPTEUR GLOBAL =====
const NpcCounterSchema = new Schema({
  _id: { type: String, required: true, default: 'npc_global_counter' },
  currentValue: { type: Number, default: 0 }
}, { collection: 'npc_counters' });

const NpcCounter = mongoose.model('NpcCounter', NpcCounterSchema);

// ===== INTERFACES ÉTENDUES (SHOPCONFIG RETIRÉ) =====

// Configuration de combat pour tous les NPCs (inchangée)
export interface BattleConfig {
  teamId?: string;                    // ID de l'équipe (optionnel)
  canBattle?: boolean;                // Peut se battre (défaut: !!teamId)
  battleType?: 'single' | 'double' | 'multi';
  allowItems?: boolean;               // Joueur peut utiliser objets
  allowSwitching?: boolean;           // Joueur peut changer Pokémon
  customRules?: string[];             // Règles spéciales
  
  // Récompenses
  rewards?: {
    money?: {
      base: number;
      perLevel?: number;              // Bonus par niveau du joueur
      multiplier?: number;            // Multiplicateur global
    };
    experience?: {
      enabled: boolean;
      multiplier?: number;
    };
    items?: Array<{
      itemId: string;
      quantity: number;
      chance: number;                 // 0-100
    }>;
  };
  
  // Conditions de combat
  battleConditions?: {
    minPlayerLevel?: number;
    maxPlayerLevel?: number;
    requiredBadges?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    cooldownMinutes?: number;         // Temps avant nouveau combat
  };
}

// Configuration de vision spécifique aux dresseurs (inchangée)
export interface TrainerVisionConfig {
  sightRange: number;                 // Distance de détection (pixels)
  sightAngle: number;                 // Angle de vision (degrés, 0-360)
  chaseRange: number;                 // Distance de poursuite
  returnToPosition?: boolean;         // Retour position initiale après combat
  blockMovement?: boolean;            // Bloque le joueur pendant poursuite
  canSeeHiddenPlayers?: boolean;      // Peut voir joueurs cachés
  detectionCooldown?: number;         // Secondes avant nouvelle détection
  pursuitSpeed?: number;              // Vitesse de poursuite (multiplier)
  
  // États de détection
  alertSound?: string;                // Son joué à la détection
  pursuitSound?: string;              // Son pendant la poursuite
  lostTargetSound?: string;           // Son quand perd le joueur
}

// États possibles d'un trainer (inchangé)
export type TrainerState = 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning';

// Métadonnées de runtime pour trainers (inchangée)
export interface TrainerRuntimeData {
  currentState: TrainerState;
  lastDetectionTime?: number;
  targetPlayerId?: string;
  originalPosition: { x: number; y: number };
  lastBattleTime?: number;
  defeatedBy?: string[];              // Liste des joueurs qui l'ont battu
}

// ===== INTERFACE PRINCIPALE NETTOYÉE =====

export interface INpcData extends Document {
  // === IDENTIFICATION (npcId maintenant GLOBAL UNIQUE) ===
  npcId: number;                      // ✅ ID GLOBAL UNIQUE (pas par zone)
  zone: string;
  name: string;
  type: NpcType;
  
  // === POSITIONNEMENT (inchangé) ===
  position: {
    x: number;
    y: number;
  };
  direction: Direction;
  sprite: string;
  
  // === COMPORTEMENT (inchangé) ===
  interactionRadius: number;
  canWalkAway: boolean;
  autoFacePlayer: boolean;
  repeatable: boolean;
  cooldownSeconds: number;
  
  // === CONDITIONS D'APPARITION (inchangé) ===
  spawnConditions?: {
    timeOfDay?: string[];
    weather?: string[];
    minPlayerLevel?: number;
    maxPlayerLevel?: number;
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  
  // === DONNÉES SPÉCIFIQUES PAR TYPE (inchangé) ===
  npcData?: any;
  
  // === SYSTÈME QUÊTES (inchangé) ===
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: any;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  // === SYSTÈME DE COMBAT (inchangé) ===
  battleConfig?: BattleConfig;
  
  // === VISION DRESSEURS (inchangé) ===
  visionConfig?: TrainerVisionConfig;

  // === COLLISION CONFIG ===
collisionConfig?: {
  enabled: boolean;
  type: 'rectangle';
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
};
  
  // === DONNÉES RUNTIME TRAINERS (inchangé) ===
  trainerRuntime?: TrainerRuntimeData;
  
  // === 🆕 SHOP SIMPLIFIÉ - JUSTE LA RÉFÉRENCE ===
  shopId?: string;                    // ✅ SIMPLE RÉFÉRENCE vers ShopData
  
  // === MÉTADONNÉES (inchangé) ===
  isActive: boolean;
  version: string;
  lastUpdated: Date;
  sourceFile?: string;
  
  // === MÉTHODES D'INSTANCE EXISTANTES (inchangées) ===
  toNpcFormat(): AnyNpc;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, playerFlags: string[]): boolean;
  
  // === MÉTHODES D'INSTANCE EXISTANTES (combat/trainer - inchangées) ===
  canBattlePlayer(playerLevel: number, playerFlags?: string[]): boolean;
  isTrainerType(): boolean;
  initializeTrainerRuntime(): void;
  updateTrainerState(newState: TrainerState): void;
  canDetectPlayer(playerPosition: { x: number; y: number }, playerLevel: number): boolean;
  isInSight(playerPosition: { x: number; y: number }): boolean;
  isInChaseRange(playerPosition: { x: number; y: number }): boolean;
  
  // === 🔄 MÉTHODES SHOP SIMPLIFIÉES ===
  isMerchantType(): boolean;          // ✅ Vérifie type='merchant' OU shopId
  hasShopId(): boolean;               // ✅ Vérifie si shopId existe
  getShopId(): string | null;         // ✅ Retourne shopId ou null
}

// Interface pour les méthodes statiques (avec nouvelles méthodes globales)
export interface INpcDataModel extends Model<INpcData> {
  // MÉTHODES EXISTANTES
  findByZone(zone: string): Promise<INpcData[]>;
  findByType(type: NpcType, zone?: string): Promise<INpcData[]>;
  findActiveNpcs(zone: string): Promise<INpcData[]>;
  bulkImportFromJson(zoneData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonNpc: any, zone: string): Promise<INpcData>;
  
  // MÉTHODES EXISTANTES (combat/trainer - inchangées)
  findTrainersInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithTeams(zone: string): Promise<INpcData[]>;
  findActiveTrainers(zone: string): Promise<INpcData[]>;
  
  // MÉTHODES EXISTANTES (shop simplifiées)
  findMerchantsInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithShops(zone: string): Promise<INpcData[]>;
  
  // ✅ NOUVELLES MÉTHODES POUR IDS GLOBAUX
  getNextGlobalNpcId(): Promise<number>;
  getCurrentGlobalNpcId(): Promise<number>;
  initializeGlobalCounter(): Promise<number>;
  isGlobalNpcIdAvailable(npcId: number): Promise<boolean>;
  repairGlobalIds(): Promise<{success: number, errors: string[]}>;
}

// ===== SCHÉMAS ÉTENDUS (SHOPCONFIG SCHEMA RETIRÉ) =====

// Schéma pour la configuration de combat (inchangé)
const BattleConfigSchema = new Schema({
  teamId: { type: String, trim: true },
  canBattle: { type: Boolean, default: true },
  battleType: { 
    type: String, 
    enum: ['single', 'double', 'multi'],
    default: 'single' 
  },
  allowItems: { type: Boolean, default: true },
  allowSwitching: { type: Boolean, default: true },
  customRules: [{ type: String }],
  
  rewards: {
    money: {
      base: { type: Number, min: 0, default: 0 },
      perLevel: { type: Number, min: 0, default: 0 },
      multiplier: { type: Number, min: 0, default: 1 }
    },
    experience: {
      enabled: { type: Boolean, default: true },
      multiplier: { type: Number, min: 0, default: 1 }
    },
    items: [{
      itemId: { type: String, required: true },
      quantity: { type: Number, min: 1, default: 1 },
      chance: { type: Number, min: 0, max: 100, default: 100 }
    }]
  },
  
  battleConditions: {
    minPlayerLevel: { type: Number, min: 1, max: 100 },
    maxPlayerLevel: { type: Number, min: 1, max: 100 },
    requiredBadges: [{ type: String }],
    requiredFlags: [{ type: String }],
    forbiddenFlags: [{ type: String }],
    cooldownMinutes: { type: Number, min: 0, default: 0 }
  }
}, { _id: false });

// Schéma pour la configuration de vision des trainers (inchangé)
const TrainerVisionConfigSchema = new Schema({
  sightRange: { 
    type: Number, 
    required: true, 
    min: [32, 'Sight range too small'],
    max: [512, 'Sight range too large'],
    default: 128 
  },
  sightAngle: { 
    type: Number, 
    required: true, 
    min: [30, 'Sight angle too narrow'],
    max: [360, 'Sight angle too wide'],
    default: 90 
  },
  chaseRange: { 
    type: Number, 
    required: true,
    min: [64, 'Chase range too small'],
    max: [768, 'Chase range too large'],
    default: 200 
  },
  returnToPosition: { type: Boolean, default: true },
  blockMovement: { type: Boolean, default: false },
  canSeeHiddenPlayers: { type: Boolean, default: false },
  detectionCooldown: { type: Number, min: 0, default: 5 },
  pursuitSpeed: { type: Number, min: 0.5, max: 3, default: 1.5 },
  
  alertSound: { type: String, maxlength: 50 },
  pursuitSound: { type: String, maxlength: 50 },
  lostTargetSound: { type: String, maxlength: 50 }
}, { _id: false });

// Schéma pour les données runtime des trainers (inchangé)
const TrainerRuntimeDataSchema = new Schema({
  currentState: { 
    type: String, 
    enum: ['idle', 'alerted', 'chasing', 'battling', 'defeated', 'returning'],
    default: 'idle' 
  },
  lastDetectionTime: { type: Number },
  targetPlayerId: { type: String },
  originalPosition: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  lastBattleTime: { type: Number },
  defeatedBy: [{ type: String }]
}, { _id: false });

// ===== SCHÉMA PRINCIPAL AVEC IDS GLOBAUX =====

const NpcDataSchema = new Schema<INpcData>({
  // === CHAMPS EXISTANTS (npcId maintenant GLOBAL UNIQUE) ===
  npcId: { 
    type: Number, 
    required: true,
    min: [1, 'NPC ID must be positive'],
    unique: true,                     // ✅ UNIQUE GLOBAL (pas par zone)
    index: true
  },
  zone: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [50, 'Zone name too long'],
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'NPC name too long']
  },
  type: { 
    type: String, 
    required: true,
    enum: {
      values: [
        'dialogue', 'merchant', 'trainer', 'healer', 'gym_leader',
        'transport', 'service', 'minigame', 'researcher', 'guild', 
        'event', 'quest_master'
      ],
      message: 'Invalid NPC type'
    },
    index: true
  },
  
  position: { 
    type: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    }, 
    required: true 
  },
  direction: { 
    type: String, 
    enum: {
      values: ['north', 'south', 'east', 'west'],
      message: 'Invalid direction'
    },
    default: 'south' 
  },
  sprite: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Sprite name too long']
  },
  
  interactionRadius: { 
    type: Number, 
    default: 32,
    min: [16, 'Interaction radius too small'],
    max: [128, 'Interaction radius too large']
  },
  canWalkAway: { type: Boolean, default: false },
  autoFacePlayer: { type: Boolean, default: true },
  repeatable: { type: Boolean, default: true },
  cooldownSeconds: { 
    type: Number, 
    default: 0,
    min: [0, 'Cooldown cannot be negative'],
    max: [86400, 'Cooldown too long']
  },
  
  spawnConditions: { 
    type: {
      timeOfDay: [{ type: String }],
      weather: [{ type: String }],
      minPlayerLevel: { type: Number, min: 1, max: 100 },
      maxPlayerLevel: { type: Number, min: 1, max: 100 },
      requiredFlags: [{ type: String }],
      forbiddenFlags: [{ type: String }],
      dateRange: {
        start: { type: String },
        end: { type: String }
      }
    },
    default: undefined
  },
  
  npcData: { 
    type: Schema.Types.Mixed, 
    default: {}
  },
  
  questsToGive: [{ 
    type: String,
    trim: true 
  }],
  questsToEnd: [{ 
    type: String,
    trim: true 
  }],
  questRequirements: { 
    type: Schema.Types.Mixed,
    default: undefined
  },
  questDialogueIds: { 
    type: {
      questOffer: [{ type: String }],
      questInProgress: [{ type: String }],
      questComplete: [{ type: String }]
    },
    default: undefined
  },
  
  // === CHAMPS EXISTANTS (combat/trainer - inchangés) ===
  battleConfig: { 
    type: BattleConfigSchema,
    default: undefined
  },
  
  visionConfig: { 
    type: TrainerVisionConfigSchema,
    default: undefined
  },

 collisionConfig: { 
  type: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['rectangle'], default: 'rectangle' },
    width: { type: Number, default: 16, min: 8, max: 64 },
    height: { type: Number, default: 16, min: 8, max: 64 },
    offsetX: { type: Number, default: 0, min: -32, max: 32 },
    offsetY: { type: Number, default: 0, min: -32, max: 32 }
  }
  // ← PAS DE LIGNE "default" ICI
},
  
  trainerRuntime: { 
    type: TrainerRuntimeDataSchema,
    default: undefined
  },
  
  // === 🔄 SHOP SIMPLIFIÉ - JUSTE LA RÉFÉRENCE ===
  shopId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Shop ID too long'],
    index: true
  },
  
  // === MÉTADONNÉES (inchangées) ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  version: { 
    type: String, 
    default: '3.0.0',                // ✅ Version incrémentée pour IDs globaux
    trim: true
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  sourceFile: { 
    type: String,
    trim: true,
    maxlength: [200, 'Source file path too long']
  }
}, {
  timestamps: true,
  collection: 'npc_data',
  minimize: false
});

// ===== INDEX COMPOSITES POUR IDS GLOBAUX =====

// ✅ INDEX PRINCIPAL: npcId unique GLOBAL
NpcDataSchema.index({ npcId: 1 }, { unique: true });

// ✅ INDEX PERFORMANCE: zone + npcId (non-unique, pour recherches)
NpcDataSchema.index({ zone: 1, npcId: 1 });

// Index existants (performance)
NpcDataSchema.index({ zone: 1, isActive: 1 });
NpcDataSchema.index({ zone: 1, type: 1 });
NpcDataSchema.index({ type: 1, isActive: 1 });

// Index existants (combat/vision - inchangés)
NpcDataSchema.index({ 'battleConfig.teamId': 1 });
NpcDataSchema.index({ zone: 1, type: 1, 'battleConfig.canBattle': 1 });
NpcDataSchema.index({ zone: 1, 'visionConfig.sightRange': 1 });
NpcDataSchema.index({ 'trainerRuntime.currentState': 1 });

// Index shop simplifiés
NpcDataSchema.index({ shopId: 1 });
NpcDataSchema.index({ zone: 1, shopId: 1 });
NpcDataSchema.index({ zone: 1, type: 1, shopId: 1 });

// ===== MÉTHODES STATIQUES POUR COMPTEUR GLOBAL =====

/**
 * ✅ NOUVELLE MÉTHODE: Obtenir et incrémenter le compteur global
 */
NpcDataSchema.statics.getNextGlobalNpcId = async function(): Promise<number> {
  const counter = await NpcCounter.findByIdAndUpdate(
    'npc_global_counter',
    { $inc: { currentValue: 1 } },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true 
    }
  );
  
  return counter.currentValue;
};

/**
 * ✅ NOUVELLE MÉTHODE: Obtenir la valeur actuelle du compteur (sans incrémenter)
 */
NpcDataSchema.statics.getCurrentGlobalNpcId = async function(): Promise<number> {
  const counter = await NpcCounter.findById('npc_global_counter');
  return counter?.currentValue || 0;
};

/**
 * ✅ NOUVELLE MÉTHODE: Initialiser le compteur à partir des NPCs existants
 */
NpcDataSchema.statics.initializeGlobalCounter = async function(): Promise<number> {
  const maxNpc = await this.findOne({})
    .sort({ npcId: -1 })
    .select('npcId')
    .lean();
  
  const maxId = maxNpc?.npcId || 0;
  
  const counter = await NpcCounter.findByIdAndUpdate(
    'npc_global_counter',
    { currentValue: maxId },
    { 
      new: true, 
      upsert: true 
    }
  );
  
  console.log(`🔢 Compteur global initialisé à ${maxId}`);
  return counter.currentValue;
};

/**
 * ✅ NOUVELLE MÉTHODE: Vérifier si un ID global est disponible
 */
NpcDataSchema.statics.isGlobalNpcIdAvailable = async function(npcId: number): Promise<boolean> {
  const existing = await this.findOne({ npcId }).lean();
  return !existing;
};

/**
 * ✅ NOUVELLE MÉTHODE: Réparer les doublons et réinitialiser le compteur
 */
NpcDataSchema.statics.repairGlobalIds = async function(): Promise<{success: number, errors: string[]}> {
  const result: {success: number, errors: string[]} = { success: 0, errors: [] };
  
  try {
    console.log('🔧 [Repair] Démarrage réparation IDs globaux...');
    
    // Trouver et corriger les doublons
    const duplicates = await this.aggregate([
      { $group: { _id: '$npcId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`🔍 [Repair] ${duplicates.length} doublons trouvés`);
    
    for (const duplicate of duplicates) {
      const docsToFix = duplicate.docs.slice(1); // Garder le premier
      
      for (const docId of docsToFix) {
        try {
          const newId = await (this as any).getNextGlobalNpcId();
          await this.updateOne({ _id: docId }, { npcId: newId });
          console.log(`✅ [Repair] Document ${docId} → nouvel ID ${newId}`);
          result.success++;
        } catch (error) {
          const errorMsg = `Document ${docId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(`❌ [Repair] ${errorMsg}`);
        }
      }
    }
    
    // Réinitialiser le compteur au maximum actuel
    await (this as any).initializeGlobalCounter();
    
    console.log(`✅ [Repair] Réparation terminée: ${result.success} corrections`);
    
  } catch (error) {
    result.errors.push(`Erreur générale: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
};

// ===== VALIDATIONS PRE-SAVE POUR IDS GLOBAUX =====

NpcDataSchema.pre('save', async function(next) {
  try {
    // ✅ CORRECTION: Attribution d'ID seulement si vraiment nécessaire
    if (this.isNew && !this.npcId) {
      // Ceci ne devrait plus arriver avec createFromJson corrigé, mais garde en sécurité
      this.npcId = await (this.constructor as any).getNextGlobalNpcId();
      console.log(`🆔 [PreSave] ID global de secours attribué: ${this.npcId} pour NPC "${this.name}" en zone ${this.zone}`);
    }
    
    // ✅ VALIDATION ID GLOBAL UNIQUE (seulement si ID modifié)
    if (this.isModified('npcId')) {
      const existingNpc = await (this.constructor as any).findOne({ 
        npcId: this.npcId,
        _id: { $ne: this._id }
      });
      
      if (existingNpc) {
        return next(new Error(`Un NPC avec l'ID global ${this.npcId} existe déjà (zone: ${existingNpc.zone})`));
      }
    }
    
    // ✅ VALIDATION: npcId doit être défini et positif
    if (!this.npcId || this.npcId < 1) {
      return next(new Error(`npcId invalide: ${this.npcId} (doit être un nombre positif)`));
    }
    
    // Validations existantes (inchangées)
    if (this.spawnConditions?.minPlayerLevel && this.spawnConditions?.maxPlayerLevel) {
      if (this.spawnConditions.minPlayerLevel > this.spawnConditions.maxPlayerLevel) {
        return next(new Error('Min player level cannot be greater than max player level'));
      }
    }
    
    // Validations trainer (inchangées)
    if (this.type === 'trainer' && !this.visionConfig) {
      this.visionConfig = {
        sightRange: 128,
        sightAngle: 90,
        chaseRange: 200,
        returnToPosition: true,
        detectionCooldown: 5,
        pursuitSpeed: 1.5
      } as TrainerVisionConfig;
    }
    
    if (this.visionConfig && !this.trainerRuntime) {
      this.trainerRuntime = {
        currentState: 'idle',
        originalPosition: { x: this.position.x, y: this.position.y },
        defeatedBy: []
      } as TrainerRuntimeData;
    }
    
    if (this.battleConfig?.teamId && this.battleConfig.canBattle === undefined) {
      this.battleConfig.canBattle = true;
    }
    
    if (this.visionConfig && this.visionConfig.chaseRange < this.visionConfig.sightRange) {
      return next(new Error('Chase range must be >= sight range'));
    }
    
    // Validation shop simplifiée
    if (this.type === 'merchant' && !this.shopId) {
      console.warn(`⚠️ NPC ${this.npcId} is type 'merchant' but has no shopId. Consider adding one.`);
    }
    
    if (this.shopId && !/^[a-zA-Z0-9_-]+$/.test(this.shopId)) {
      return next(new Error('ShopId must contain only letters, numbers, underscores and hyphens'));
    }
    
    this.lastUpdated = new Date();
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Unknown error'));
  }
});

// ===== MÉTHODES D'INSTANCE NETTOYÉES =====

// Méthodes existantes (toNpcFormat modifiée pour shopId)
NpcDataSchema.methods.toNpcFormat = function(this: INpcData): AnyNpc {
  const baseNpc = {
    id: this.npcId,
    name: this.name,
    type: this.type,
    position: this.position,
    direction: this.direction,
    sprite: this.sprite,
    interactionRadius: this.interactionRadius,
    canWalkAway: this.canWalkAway,
    autoFacePlayer: this.autoFacePlayer,
    repeatable: this.repeatable,
    cooldownSeconds: this.cooldownSeconds,
    spawnConditions: this.spawnConditions,
    questsToGive: this.questsToGive,
    questsToEnd: this.questsToEnd,
    questRequirements: this.questRequirements,
    questDialogueIds: this.questDialogueIds,
    
    // Données existantes (combat/trainer - inchangées)
    battleConfig: this.battleConfig,
    visionConfig: this.visionConfig,
    collisionConfig: this.collisionConfig,
    trainerRuntime: this.trainerRuntime,
    
    // Shop simplifié
    shopId: this.shopId,
    
    ...this.npcData
  } as AnyNpc;
  
  return baseNpc;
};

// updateFromJson modifiée pour shopId seulement
NpcDataSchema.methods.updateFromJson = async function(
  this: INpcData, 
  jsonData: any
): Promise<void> {
  // Logique existante (inchangée)
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.position) this.position = jsonData.position;
  if (jsonData.direction) this.direction = jsonData.direction;
  if (jsonData.sprite) this.sprite = jsonData.sprite;
  if (jsonData.interactionRadius) this.interactionRadius = jsonData.interactionRadius;
  
  if (typeof jsonData.canWalkAway === 'boolean') this.canWalkAway = jsonData.canWalkAway;
  if (typeof jsonData.autoFacePlayer === 'boolean') this.autoFacePlayer = jsonData.autoFacePlayer;
  if (typeof jsonData.repeatable === 'boolean') this.repeatable = jsonData.repeatable;
  if (jsonData.cooldownSeconds) this.cooldownSeconds = jsonData.cooldownSeconds;
  
  if (jsonData.spawnConditions) this.spawnConditions = jsonData.spawnConditions;
  if (jsonData.questsToGive) this.questsToGive = jsonData.questsToGive;
  if (jsonData.questsToEnd) this.questsToEnd = jsonData.questsToEnd;
  if (jsonData.questRequirements) this.questRequirements = jsonData.questRequirements;
  if (jsonData.questDialogueIds) this.questDialogueIds = jsonData.questDialogueIds;
  
  // Données existantes (combat/trainer - inchangées)
  if (jsonData.battleConfig) this.battleConfig = jsonData.battleConfig;
  if (jsonData.visionConfig) this.visionConfig = jsonData.visionConfig;
  if (jsonData.collisionConfig) this.collisionConfig = jsonData.collisionConfig;
  if (jsonData.trainerRuntime) this.trainerRuntime = jsonData.trainerRuntime;
  
  // Shop : seulement shopId
  if (jsonData.shopId) {
    this.shopId = jsonData.shopId;
  } else if (jsonData.shopConfig?.shopId) {
    // Migration depuis ancien format shopConfig
    this.shopId = jsonData.shopConfig.shopId;
    console.log(`📦 Migration: NPC ${this.npcId} shopConfig.shopId → shopId`);
  }
  
  // Données spécifiques (sans shopConfig)
  const baseFields = [
    'id', 'name', 'type', 'position', 'direction', 'sprite', 
    'interactionRadius', 'canWalkAway', 'autoFacePlayer', 
    'repeatable', 'cooldownSeconds', 'spawnConditions',
    'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
    'battleConfig', 'visionConfig', 'trainerRuntime', 
    'shopId', 'shopConfig' // Exclure shopConfig des données spécifiques
  ];
  
  const specificData: any = {};
  for (const [key, value] of Object.entries(jsonData)) {
    if (!baseFields.includes(key) && key !== 'id') {
      specificData[key] = value;
    }
  }
  this.npcData = specificData;
  
  await this.save();
};

// Méthodes existantes (inchangées)
NpcDataSchema.methods.isAvailableForPlayer = function(
  this: INpcData,
  playerLevel: number,
  playerFlags: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  const conditions = this.spawnConditions;
  if (!conditions) return true;
  
  if (conditions.minPlayerLevel && playerLevel < conditions.minPlayerLevel) return false;
  if (conditions.maxPlayerLevel && playerLevel > conditions.maxPlayerLevel) return false;
  
  if (conditions.requiredFlags?.length) {
    const hasAllRequired = conditions.requiredFlags.every(flag => 
      playerFlags.includes(flag)
    );
    if (!hasAllRequired) return false;
  }
  
  if (conditions.forbiddenFlags?.length) {
    const hasAnyForbidden = conditions.forbiddenFlags.some(flag => 
      playerFlags.includes(flag)
    );
    if (hasAnyForbidden) return false;
  }
  
  return true;
};

// MÉTHODES D'INSTANCE EXISTANTES (combat/trainer - toutes inchangées)
NpcDataSchema.methods.canBattlePlayer = function(
  this: INpcData,
  playerLevel: number,
  playerFlags: string[] = []
): boolean {
  if (!this.battleConfig || !this.battleConfig.canBattle || !this.battleConfig.teamId) {
    return false;
  }
  
  const conditions = this.battleConfig.battleConditions;
  if (!conditions) return true;
  
  if (conditions.minPlayerLevel && playerLevel < conditions.minPlayerLevel) return false;
  if (conditions.maxPlayerLevel && playerLevel > conditions.maxPlayerLevel) return false;
  
  if (conditions.requiredFlags?.length) {
    const hasAllRequired = conditions.requiredFlags.every(flag => 
      playerFlags.includes(flag)
    );
    if (!hasAllRequired) return false;
  }
  
  if (conditions.forbiddenFlags?.length) {
    const hasAnyForbidden = conditions.forbiddenFlags.some(flag => 
      playerFlags.includes(flag)
    );
    if (hasAnyForbidden) return false;
  }
  
  if (conditions.cooldownMinutes && this.trainerRuntime?.lastBattleTime) {
    const cooldownMs = conditions.cooldownMinutes * 60 * 1000;
    const timeSinceLastBattle = Date.now() - this.trainerRuntime.lastBattleTime;
    if (timeSinceLastBattle < cooldownMs) return false;
  }
  
  return true;
};

NpcDataSchema.methods.isTrainerType = function(this: INpcData): boolean {
  return this.type === 'trainer' || !!this.visionConfig;
};

NpcDataSchema.methods.initializeTrainerRuntime = function(this: INpcData): void {
  if (!this.trainerRuntime) {
    this.trainerRuntime = {
      currentState: 'idle',
      originalPosition: { x: this.position.x, y: this.position.y },
      defeatedBy: []
    } as TrainerRuntimeData;
  }
};

NpcDataSchema.methods.updateTrainerState = function(
  this: INpcData, 
  newState: TrainerState
): void {
  if (!this.trainerRuntime) {
    this.initializeTrainerRuntime();
  }
  this.trainerRuntime!.currentState = newState;
};

NpcDataSchema.methods.canDetectPlayer = function(
  this: INpcData,
  playerPosition: { x: number; y: number },
  playerLevel: number
): boolean {
  if (!this.visionConfig || !this.isTrainerType()) return false;
  
  if (this.visionConfig.detectionCooldown && this.trainerRuntime?.lastDetectionTime) {
    const cooldownMs = this.visionConfig.detectionCooldown * 1000;
    const timeSinceLastDetection = Date.now() - this.trainerRuntime.lastDetectionTime;
    if (timeSinceLastDetection < cooldownMs) return false;
  }
  
  return this.isInSight(playerPosition);
};

NpcDataSchema.methods.isInSight = function(
  this: INpcData,
  playerPosition: { x: number; y: number }
): boolean {
  if (!this.visionConfig) return false;
  
  const dx = playerPosition.x - this.position.x;
  const dy = playerPosition.y - this.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > this.visionConfig.sightRange) return false;
  
  const angleToPlayer = Math.atan2(dy, dx) * (180 / Math.PI);
  
  const directionAngles = {
    'north': -90,
    'east': 0,
    'south': 90,
    'west': 180
  };
  
  const npcDirection = directionAngles[this.direction];
  const halfSightAngle = this.visionConfig.sightAngle / 2;
  
  const normalizeAngle = (angle: number) => {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  };
  
  const angleDiff = Math.abs(normalizeAngle(angleToPlayer - npcDirection));
  
  return angleDiff <= halfSightAngle;
};

NpcDataSchema.methods.isInChaseRange = function(
  this: INpcData,
  playerPosition: { x: number; y: number }
): boolean {
  if (!this.visionConfig) return false;
  
  const dx = playerPosition.x - this.position.x;
  const dy = playerPosition.y - this.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= this.visionConfig.chaseRange;
};

// NOUVELLES MÉTHODES D'INSTANCE SHOP SIMPLIFIÉES

/**
 * ✅ Vérifie si c'est un merchant (type ou avec shopId)
 */
NpcDataSchema.methods.isMerchantType = function(this: INpcData): boolean {
  return this.type === 'merchant' || !!this.shopId;
};

/**
 * ✅ Vérifie si le NPC a un shopId valide
 */
NpcDataSchema.methods.hasShopId = function(this: INpcData): boolean {
  return !!(this.shopId && this.shopId.trim().length > 0);
};

/**
 * ✅ Retourne le shopId ou null
 */
NpcDataSchema.methods.getShopId = function(this: INpcData): string | null {
  return this.shopId || null;
};

// ===== MÉTHODES STATIQUES NETTOYÉES =====

// Méthodes existantes (inchangées)
NpcDataSchema.statics.findByZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ zone, isActive: true }).sort({ npcId: 1 });
};

NpcDataSchema.statics.findByType = function(
  type: NpcType, 
  zone?: string
): Promise<INpcData[]> {
  const query: any = { type, isActive: true };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ zone: 1, npcId: 1 });
};

NpcDataSchema.statics.findActiveNpcs = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true 
  }).sort({ npcId: 1 });
};

// Méthodes existantes (combat/trainer - inchangées)
NpcDataSchema.statics.findTrainersInZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    $or: [
      { type: 'trainer' },
      { visionConfig: { $exists: true } }
    ]
  }).sort({ npcId: 1 });
};

NpcDataSchema.statics.findNpcsWithTeams = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    'battleConfig.teamId': { $exists: true },
    'battleConfig.canBattle': true
  }).sort({ npcId: 1 });
};

NpcDataSchema.statics.findActiveTrainers = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    $or: [
      { type: 'trainer' },
      { visionConfig: { $exists: true } }
    ],
    $and: [
      {
        $or: [
          { 'trainerRuntime.currentState': { $in: ['idle', 'alerted'] } },
          { 'trainerRuntime.currentState': { $exists: false } }
        ]
      }
    ]
  }).sort({ npcId: 1 });
};

// MÉTHODES STATIQUES SHOP SIMPLIFIÉES

/**
 * ✅ Trouve tous les merchants d'une zone (type='merchant' OU shopId existe)
 */
NpcDataSchema.statics.findMerchantsInZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    $or: [
      { type: 'merchant' },
      { shopId: { $exists: true, $nin: [null, ''] } }
    ]
  }).sort({ npcId: 1 });
};

/**
 * ✅ Trouve tous les NPCs avec shopId (peuvent vendre)
 */
NpcDataSchema.statics.findNpcsWithShops = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    shopId: { $exists: true, $nin: [null, ''] }
  }).sort({ npcId: 1 });
};

/**
 * ✅ MÉTHODE STATIQUE AMÉLIORÉE: Création avec ID global automatique
 */
NpcDataSchema.statics.createFromJson = async function(
  jsonNpc: any, 
  zone: string
): Promise<INpcData> {
  
  let npcId = jsonNpc.id || jsonNpc.npcId;
  
  // ✅ CORRECTION: Si pas d'ID ou ID non disponible, attribuer MAINTENANT
  if (!npcId) {
    npcId = await (this as any).getNextGlobalNpcId();
    console.log(`🆔 [CreateFromJson] ID global automatique attribué: ${npcId} pour "${jsonNpc.name}" en zone ${zone}`);
  } else {
    // Si ID fourni, vérifier qu'il est libre GLOBALEMENT
    const isAvailable = await (this as any).isGlobalNpcIdAvailable(npcId);
    if (!isAvailable) {
      console.log(`⚠️ [CreateFromJson] ID ${npcId} déjà utilisé globalement, attribution automatique`);
      npcId = await (this as any).getNextGlobalNpcId();
      console.log(`🆔 [CreateFromJson] Nouvel ID global attribué: ${npcId}`);
    }
  }
  
  // ✅ IMPORTANT: S'assurer que npcId est défini AVANT la création
  const npcData: any = {
    npcId: npcId, // ✅ ID toujours défini maintenant
    zone: zone,
    name: jsonNpc.name || `NPC_${npcId}`,
    type: jsonNpc.type || 'dialogue',
    position: {
      x: Number(jsonNpc.position?.x) || 0,
      y: Number(jsonNpc.position?.y) || 0
    },
    direction: jsonNpc.direction || 'south',
    sprite: jsonNpc.sprite || 'npc_default',
    interactionRadius: jsonNpc.interactionRadius || 32,
    canWalkAway: jsonNpc.canWalkAway !== false,
    autoFacePlayer: jsonNpc.autoFacePlayer !== false,
    repeatable: jsonNpc.repeatable !== false,
    cooldownSeconds: jsonNpc.cooldownSeconds || 0,
    spawnConditions: jsonNpc.spawnConditions,
    questsToGive: jsonNpc.questsToGive || [],
    questsToEnd: jsonNpc.questsToEnd || [],
    questRequirements: jsonNpc.questRequirements,
    questDialogueIds: jsonNpc.questDialogueIds,
    battleConfig: jsonNpc.battleConfig,
    visionConfig: jsonNpc.visionConfig,
    trainerRuntime: jsonNpc.trainerRuntime,
    shopId: jsonNpc.shopId,
    isActive: jsonNpc.isActive !== false,
    version: '3.0.0',
    sourceFile: jsonNpc.sourceFile || 'api_import'
  };
  
  // Copier toutes les données spécifiques du type
  const baseFields = [
    'id', 'npcId', 'name', 'type', 'position', 'direction', 'sprite', 
    'interactionRadius', 'canWalkAway', 'autoFacePlayer', 
    'repeatable', 'cooldownSeconds', 'spawnConditions',
    'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
    'battleConfig', 'visionConfig', 'trainerRuntime', 
    'shopId', 'isActive', 'version', 'sourceFile'
  ];
  
  const specificData: any = {};
  for (const [key, value] of Object.entries(jsonNpc)) {
    if (!baseFields.includes(key)) {
      specificData[key] = value;
    }
  }
  
  if (Object.keys(specificData).length > 0) {
    (npcData as any).npcData = specificData;
  }
  
  console.log(`💾 [CreateFromJson] Création NPC avec ID ${npcId} pour zone ${zone}`);
  
  // Créer et sauvegarder (l'ID est maintenant garanti d'être défini)
  const newNpc = new this(npcData);
  await newNpc.save();
  
  return newNpc;
};

// ===== EXPORT =====
export const NpcData = mongoose.model<INpcData, INpcDataModel>('NpcData', NpcDataSchema);

export type NpcDataDocument = INpcData;
export type CreateNpcData = Partial<Pick<INpcData, 
  'npcId' | 'zone' | 'name' | 'type' | 'position' | 'sprite' | 'npcData' | 'battleConfig' | 'visionConfig' | 'shopId'
>>;

// ===== 📊 RÉSUMÉ DES CHANGEMENTS POUR IDS GLOBAUX =====

/**
 * 🔄 CHANGEMENTS POUR IDS GLOBAUX :
 * 
 * ✅ AJOUTÉ :
 * - Collection npc_counters pour compteur global
 * - Index unique sur npcId (global, pas par zone)
 * - Méthodes getNextGlobalNpcId(), getCurrentGlobalNpcId(), etc.
 * - Attribution automatique d'ID global dans pre-save
 * - Validation d'unicité globale
 * - Méthode de réparation repairGlobalIds()
 * 
 * ❌ MODIFIÉ :
 * - npcId maintenant unique GLOBALEMENT (pas par zone)
 * - Index principal : { npcId: 1 } unique
 * - Index secondaire : { zone: 1, npcId: 1 } non-unique
 * - Validation pre-save : vérification globale
 * - createFromJson : gestion des IDs globaux
 * 
 * 🎯 RÉSULTAT :
 * - IDs uniques pour TOUS les NPCs (toutes zones confondues)
 * - Attribution automatique et séquentielle
 * - Pas de conflit possible entre zones
 * - Compteur global auto-incrémenté
 * - Facilite les références inter-zones
 */
