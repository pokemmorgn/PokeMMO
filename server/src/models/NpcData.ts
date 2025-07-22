// server/src/models/NpcData.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { NpcType, Direction, AnyNpc } from "../types/NpcTypes";

// ===== INTERFACES =====

export interface INpcData extends Document {
  // === IDENTIFICATION ===
  npcId: number;                    // ID unique global du NPC
  zone: string;                     // Zone où se trouve le NPC
  name: string;                     // Nom du NPC
  type: NpcType;                    // Type du NPC
  
  // === POSITIONNEMENT ===
  position: {
    x: number;
    y: number;
  };
  direction: Direction;
  sprite: string;
  
  // === COMPORTEMENT ===
  interactionRadius: number;
  canWalkAway: boolean;
  autoFacePlayer: boolean;
  repeatable: boolean;
  cooldownSeconds: number;
  
  // === CONDITIONS D'APPARITION ===
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
  
  // === DONNÉES SPÉCIFIQUES PAR TYPE (Schema flexible) ===
  npcData: any; // Contient toutes les propriétés spécifiques selon le type
  
  // === SYSTÈME QUÊTES ===
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: any;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  // === MÉTADONNÉES ===
  isActive: boolean;                // NPC actif ou désactivé
  version: string;                  // Version des données
  lastUpdated: Date;
  sourceFile?: string;              // Fichier source original (pour migration)
  
  // === MÉTHODES D'INSTANCE ===
  toNpcFormat(): AnyNpc;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, playerFlags: string[]): boolean;
}

// Interface pour les méthodes statiques
export interface INpcDataModel extends Model<INpcData> {
  findByZone(zone: string): Promise<INpcData[]>;
  findByType(type: NpcType, zone?: string): Promise<INpcData[]>;
  findActiveNpcs(zone: string): Promise<INpcData[]>;
  bulkImportFromJson(zoneData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonNpc: any, zone: string): Promise<INpcData>;
}

// ===== SCHÉMAS =====

// Schéma pour la position
const PositionSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

// Schéma pour les conditions de spawn
const SpawnConditionsSchema = new Schema({
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
}, { _id: false });

// Schéma pour les dialogues de quêtes
const QuestDialogueSchema = new Schema({
  questOffer: [{ type: String }],
  questInProgress: [{ type: String }],
  questComplete: [{ type: String }]
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const NpcDataSchema = new Schema<INpcData>({
  // === IDENTIFICATION ===
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
  
  // === POSITIONNEMENT ===
  position: { 
    type: PositionSchema, 
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
  
  // === COMPORTEMENT ===
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
    max: [86400, 'Cooldown too long'] // Max 24h
  },
  
  // === CONDITIONS D'APPARITION ===
  spawnConditions: { 
    type: SpawnConditionsSchema,
    default: undefined
  },
  
  // === DONNÉES SPÉCIFIQUES (Schema flexible) ===
  npcData: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
  // === SYSTÈME QUÊTES ===
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
    type: QuestDialogueSchema,
    default: undefined
  },
  
  // === MÉTADONNÉES ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  version: { 
    type: String, 
    default: '1.0.0',
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
  minimize: false // Garder les objets vides
});

// ===== INDEX COMPOSITES =====

// Index principal unique par zone et ID
NpcDataSchema.index({ zone: 1, npcId: 1 }, { unique: true });

// Index pour les requêtes fréquentes
NpcDataSchema.index({ zone: 1, isActive: 1 });
NpcDataSchema.index({ zone: 1, type: 1 });
NpcDataSchema.index({ type: 1, isActive: 1 });

// Index pour les quêtes
NpcDataSchema.index({ questsToGive: 1 });
NpcDataSchema.index({ questsToEnd: 1 });

// Index géospatial pour la position (optionnel, pour futures fonctionnalités)
NpcDataSchema.index({ 'position.x': 1, 'position.y': 1 });

// ===== VALIDATIONS PRE-SAVE =====

NpcDataSchema.pre('save', function(next) {
  // Validation de cohérence
  if (this.spawnConditions?.minPlayerLevel && this.spawnConditions?.maxPlayerLevel) {
    if (this.spawnConditions.minPlayerLevel > this.spawnConditions.maxPlayerLevel) {
      return next(new Error('Min player level cannot be greater than max player level'));
    }
  }
  
  // Nettoyage des arrays
  if (this.questsToGive) {
    this.questsToGive = this.questsToGive.filter(q => q && q.trim().length > 0);
  }
  if (this.questsToEnd) {
    this.questsToEnd = this.questsToEnd.filter(q => q && q.trim().length > 0);
  }
  
  // Mise à jour timestamp
  this.lastUpdated = new Date();
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Convertit le document MongoDB au format NPC attendu par le système
 */
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
    
    // Fusionner les données spécifiques du type
    ...this.npcData
  } as AnyNpc;
  
  return baseNpc;
};

/**
 * Met à jour les données depuis un objet JSON
 */
NpcDataSchema.methods.updateFromJson = async function(
  this: INpcData, 
  jsonData: any
): Promise<void> {
  // Propriétés de base
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.position) this.position = jsonData.position;
  if (jsonData.direction) this.direction = jsonData.direction;
  if (jsonData.sprite) this.sprite = jsonData.sprite;
  if (jsonData.interactionRadius) this.interactionRadius = jsonData.interactionRadius;
  
  // Comportement
  if (typeof jsonData.canWalkAway === 'boolean') this.canWalkAway = jsonData.canWalkAway;
  if (typeof jsonData.autoFacePlayer === 'boolean') this.autoFacePlayer = jsonData.autoFacePlayer;
  if (typeof jsonData.repeatable === 'boolean') this.repeatable = jsonData.repeatable;
  if (jsonData.cooldownSeconds) this.cooldownSeconds = jsonData.cooldownSeconds;
  
  // Conditions et quêtes
  if (jsonData.spawnConditions) this.spawnConditions = jsonData.spawnConditions;
  if (jsonData.questsToGive) this.questsToGive = jsonData.questsToGive;
  if (jsonData.questsToEnd) this.questsToEnd = jsonData.questsToEnd;
  if (jsonData.questRequirements) this.questRequirements = jsonData.questRequirements;
  if (jsonData.questDialogueIds) this.questDialogueIds = jsonData.questDialogueIds;
  
  // Données spécifiques du type (tout le reste)
  const baseFields = [
    'id', 'name', 'type', 'position', 'direction', 'sprite', 
    'interactionRadius', 'canWalkAway', 'autoFacePlayer', 
    'repeatable', 'cooldownSeconds', 'spawnConditions',
    'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds'
  ];
  
  const specificData: any = {};
  for (const [key, value] of Object.entries(jsonData)) {
    if (!baseFields.includes(key) && key !== 'id') { // 'id' devient 'npcId'
      specificData[key] = value;
    }
  }
  this.npcData = specificData;
  
  await this.save();
};

/**
 * Vérifie si le NPC est disponible pour un joueur donné
 */
NpcDataSchema.methods.isAvailableForPlayer = function(
  this: INpcData,
  playerLevel: number,
  playerFlags: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  const conditions = this.spawnConditions;
  if (!conditions) return true;
  
  // Vérification niveau
  if (conditions.minPlayerLevel && playerLevel < conditions.minPlayerLevel) return false;
  if (conditions.maxPlayerLevel && playerLevel > conditions.maxPlayerLevel) return false;
  
  // Vérification flags requis
  if (conditions.requiredFlags?.length) {
    const hasAllRequired = conditions.requiredFlags.every(flag => 
      playerFlags.includes(flag)
    );
    if (!hasAllRequired) return false;
  }
  
  // Vérification flags interdits
  if (conditions.forbiddenFlags?.length) {
    const hasAnyForbidden = conditions.forbiddenFlags.some(flag => 
      playerFlags.includes(flag)
    );
    if (hasAnyForbidden) return false;
  }
  
  // TODO: Vérification date range et autres conditions
  
  return true;
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve tous les NPCs d'une zone
 */
NpcDataSchema.statics.findByZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ zone, isActive: true }).sort({ npcId: 1 });
};

/**
 * Trouve les NPCs par type
 */
NpcDataSchema.statics.findByType = function(
  type: NpcType, 
  zone?: string
): Promise<INpcData[]> {
  const query: any = { type, isActive: true };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ zone: 1, npcId: 1 });
};

/**
 * Trouve tous les NPCs actifs d'une zone
 */
NpcDataSchema.statics.findActiveNpcs = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true 
  }).sort({ npcId: 1 });
};

/**
 * Import en masse depuis JSON
 */
NpcDataSchema.statics.bulkImportFromJson = async function(
  zoneData: any
): Promise<{ success: number; errors: string[] }> {
  const results: { success: number; errors: string[] } = { success: 0, errors: [] };
  
  if (!zoneData.zone || !zoneData.npcs || !Array.isArray(zoneData.npcs)) {
    results.errors.push('Invalid zone data format');
    return results;
  }
  
  for (const jsonNpc of zoneData.npcs) {
    try {
      await (this as INpcDataModel).createFromJson(jsonNpc, zoneData.zone);
      results.success++;
    } catch (error) {
      results.errors.push(`NPC ${jsonNpc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

/**
 * Crée un NPC depuis des données JSON
 */
NpcDataSchema.statics.createFromJson = async function(
  jsonNpc: any, 
  zone: string
): Promise<INpcData> {
  // Validation de base
  if (!jsonNpc.id || !jsonNpc.name || !jsonNpc.type) {
    throw new Error('Missing required fields: id, name, type');
  }
  
  // Vérifier si existe déjà
  const existing = await this.findOne({ zone, npcId: jsonNpc.id });
  if (existing) {
    // Mettre à jour existant
    await existing.updateFromJson(jsonNpc);
    return existing;
  }
  
  // Créer nouveau
  const npcData = new this({
    npcId: jsonNpc.id,
    zone,
    name: jsonNpc.name,
    type: jsonNpc.type,
    position: jsonNpc.position || { x: 0, y: 0 },
    direction: jsonNpc.direction || 'south',
    sprite: jsonNpc.sprite || 'npc_default',
    interactionRadius: jsonNpc.interactionRadius || 32,
    canWalkAway: jsonNpc.canWalkAway || false,
    autoFacePlayer: jsonNpc.autoFacePlayer !== false,
    repeatable: jsonNpc.repeatable !== false,
    cooldownSeconds: jsonNpc.cooldownSeconds || 0,
    spawnConditions: jsonNpc.spawnConditions,
    questsToGive: jsonNpc.questsToGive || [],
    questsToEnd: jsonNpc.questsToEnd || [],
    questRequirements: jsonNpc.questRequirements,
    questDialogueIds: jsonNpc.questDialogueIds,
    version: '1.0.0',
    sourceFile: `${zone}.json`
  });
  
  // Ajouter données spécifiques
  await npcData.updateFromJson(jsonNpc);
  
  return npcData;
};

// ===== EXPORT =====
export const NpcData = mongoose.model<INpcData, INpcDataModel>('NpcData', NpcDataSchema);

// Types d'export
export type NpcDataDocument = INpcData;
export type CreateNpcData = Partial<Pick<INpcData, 
  'npcId' | 'zone' | 'name' | 'type' | 'position' | 'sprite' | 'npcData'
>>;
