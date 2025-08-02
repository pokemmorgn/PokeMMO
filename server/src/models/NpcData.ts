// server/src/models/NpcData.ts - VERSION REFACTORISÉE SANS SHOPCONFIG
import mongoose, { Schema, Document, Model } from "mongoose";
import { NpcType, Direction, AnyNpc } from "../types/NpcTypes";

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
  // === IDENTIFICATION (inchangé) ===
  npcId: number;
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
  npcData: any;
  
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

// Interface pour les méthodes statiques (shopConfig retiré)
export interface INpcDataModel extends Model<INpcData> {
  findByZone(zone: string): Promise<INpcData[]>;
  findByType(type: NpcType, zone?: string): Promise<INpcData[]>;
  findActiveNpcs(zone: string): Promise<INpcData[]>;
  bulkImportFromJson(zoneData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonNpc: any, zone: string): Promise<INpcData>;
  
  // MÉTHODES STATIQUES EXISTANTES (combat/trainer - inchangées)
  findTrainersInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithTeams(zone: string): Promise<INpcData[]>;
  findActiveTrainers(zone: string): Promise<INpcData[]>;
  
  // 🔄 MÉTHODES STATIQUES SHOP SIMPLIFIÉES
  findMerchantsInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithShops(zone: string): Promise<INpcData[]>;
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

// ===== SCHÉMA PRINCIPAL NETTOYÉ =====

const NpcDataSchema = new Schema<INpcData>({
  // === CHAMPS EXISTANTS (inchangés) ===
  npcId: { 
    type: Number, 
    required: true,
    min: [1, 'NPC ID must be positive']
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
  
  trainerRuntime: { 
    type: TrainerRuntimeDataSchema,
    default: undefined
  },
  
  // === 🔄 SHOP SIMPLIFIÉ - JUSTE LA RÉFÉRENCE ===
  shopId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Shop ID too long'],
    index: true                       // ✅ Index pour recherches rapides
  },
  
  // === MÉTADONNÉES (inchangées) ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  version: { 
    type: String, 
    default: '3.0.0',                // ✅ Version incrémentée pour refactoring
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

// ===== INDEX COMPOSITES NETTOYÉS =====

// Index existants (inchangés)
NpcDataSchema.index({ zone: 1, npcId: 1 }, { unique: true });
NpcDataSchema.index({ zone: 1, isActive: 1 });
NpcDataSchema.index({ zone: 1, type: 1 });
NpcDataSchema.index({ type: 1, isActive: 1 });

// Index existants (combat/vision - inchangés)
NpcDataSchema.index({ 'battleConfig.teamId': 1 });
NpcDataSchema.index({ zone: 1, type: 1, 'battleConfig.canBattle': 1 });
NpcDataSchema.index({ zone: 1, 'visionConfig.sightRange': 1 });
NpcDataSchema.index({ 'trainerRuntime.currentState': 1 });

// 🔄 Index shop simplifiés
NpcDataSchema.index({ shopId: 1 });                    // ✅ Simple index sur shopId
NpcDataSchema.index({ zone: 1, shopId: 1 });          // ✅ Zone + shopId
NpcDataSchema.index({ zone: 1, type: 1, shopId: 1 }); // ✅ Zone + type + shopId

// ===== VALIDATIONS PRE-SAVE NETTOYÉES =====

NpcDataSchema.pre('save', function(next) {
  // Validations existantes (inchangées)
  if (this.spawnConditions?.minPlayerLevel && this.spawnConditions?.maxPlayerLevel) {
    if (this.spawnConditions.minPlayerLevel > this.spawnConditions.maxPlayerLevel) {
      return next(new Error('Min player level cannot be greater than max player level'));
    }
  }
  
  // Validations existantes (trainer - inchangées)
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
  
  // 🔄 VALIDATION SHOP SIMPLIFIÉE
  // Si c'est un merchant, s'assurer qu'il a un shopId (optionnel mais recommandé)
  if (this.type === 'merchant' && !this.shopId) {
    console.warn(`⚠️ NPC ${this.npcId} is type 'merchant' but has no shopId. Consider adding one.`);
  }
  
  // Si shopId existe, valider le format
  if (this.shopId && !/^[a-zA-Z0-9_-]+$/.test(this.shopId)) {
    return next(new Error('ShopId must contain only letters, numbers, underscores and hyphens'));
  }
  
  this.lastUpdated = new Date();
  next();
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
    trainerRuntime: this.trainerRuntime,
    
    // 🔄 Shop simplifié
    shopId: this.shopId,              // ✅ Juste la référence
    
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
  if (jsonData.trainerRuntime) this.trainerRuntime = jsonData.trainerRuntime;
  
  // 🔄 Shop : seulement shopId
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
    'shopId', 'shopConfig' // ✅ Exclure shopConfig des données spécifiques
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

// 🔄 NOUVELLES MÉTHODES D'INSTANCE SHOP SIMPLIFIÉES

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

// 🔄 MÉTHODES STATIQUES SHOP SIMPLIFIÉES

/**
 * ✅ Trouve tous les merchants d'une zone (type='merchant' OU shopId existe)
 */
NpcDataSchema.statics.findMerchantsInZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    $or: [
      { type: 'merchant' },
      { shopId: { $exists: true, $ne: null, $ne: '' } }
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
    shopId: { $exists: true, $ne: null, $ne: '' }
  }).sort({ npcId: 1 });
};

// ===== EXPORT =====
export const NpcData = mongoose.model<INpcData, INpcDataModel>('NpcData', NpcDataSchema);

export type NpcDataDocument = INpcData;
export type CreateNpcData = Partial<Pick<INpcData, 
  'npcId' | 'zone' | 'name' | 'type' | 'position' | 'sprite' | 'npcData' | 'battleConfig' | 'visionConfig' | 'shopId'
>>;

// ===== 📊 RÉSUMÉ DES CHANGEMENTS =====

/**
 * 🔄 CHANGEMENTS APPORTÉS :
 * 
 * ❌ RETIRÉ :
 * - Interface ShopConfig complète
 * - Schéma ShopConfigSchema 
 * - Toute la logique métier shop dans NpcData
 * - Méthodes shop complexes (isShopOpen, canPlayerAccessShop, etc.)
 * - Index complexes sur shopConfig.*
 * 
 * ✅ AJOUTÉ :
 * - Champ simple shopId: string
 * - Index simples sur shopId
 * - Méthodes basiques : isMerchantType(), hasShopId(), getShopId()
 * - Validation format shopId
 * - Migration automatique shopConfig.shopId → shopId
 * 
 * 🎯 RÉSULTAT :
 * - NpcData devient une simple référence vers ShopData
 * - Séparation claire des responsabilités
 * - Plus de duplication de données shop
 * - ShopData devient la source unique de vérité pour tout ce qui concerne les shops
 */
