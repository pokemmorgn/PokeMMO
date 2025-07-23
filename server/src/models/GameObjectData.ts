// server/src/models/GameObjectData.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== TYPES =====

export type GameObjectType = 'ground' | 'hidden' | 'pc' | 'vending_machine' | 'panel' | 'guild_board';

export interface IGameObjectData extends Document {
  // === IDENTIFICATION ===
  objectId: number;                 // ID unique global de l'objet
  zone: string;                     // Zone où se trouve l'objet
  name?: string;                    // Nom optionnel de l'objet
  type: GameObjectType;             // Type de l'objet
  
  // === POSITIONNEMENT ===
  position: {
    x: number;
    y: number;
  };
  
  // === CONTENU ET COMPORTEMENT ===
  itemId?: string;                  // ID de l'item dans ItemDB (pour objets donnant des items)
  sprite?: string;                  // Sprite à afficher
  quantity?: number;                // Quantité d'items donnés (défaut: 1)
  cooldownHours?: number;           // Cooldown en heures (défaut: 24)
  
  // === PROPRIÉTÉS SPÉCIFIQUES PAR TYPE ===
  // Pour objets cachés
  searchRadius?: number;            // Rayon de recherche pour objets cachés
  itemfinderRadius?: number;        // Rayon de détection avec Itemfinder
  findChance?: number;              // Pourcentage de chance de trouver (objets cachés)
  
  // === REQUIREMENTS ===
  requirements?: {
    minLevel?: number;
    badge?: string;
    item?: string;
    quest?: string;
    [key: string]: any;
  };
  
  // === PROPRIÉTÉS CUSTOM FLEXIBLES ===
  customProperties: any;            // Propriétés spécifiques selon le type
  
  // === MÉTADONNÉES ===
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;                // Objet actif ou désactivé
  version: string;                  // Version des données
  lastUpdated: Date;
  sourceFile?: string;              // Fichier source original (pour migration)
  
  // === MÉTHODES D'INSTANCE ===
  toObjectFormat(): any;
  updateFromJson(jsonData: any): Promise<void>;
  meetsRequirements(playerLevel: number, playerItems: string[], playerBadges: string[]): boolean;
}

// Interface pour les méthodes statiques
export interface IGameObjectDataModel extends Model<IGameObjectData> {
  findByZone(zone: string): Promise<IGameObjectData[]>;
  findByType(type: GameObjectType, zone?: string): Promise<IGameObjectData[]>;
  findActiveObjects(zone: string): Promise<IGameObjectData[]>;
  bulkImportFromJson(zoneData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonObject: any, zone: string): Promise<IGameObjectData>;
  findGroundItems(zone: string): Promise<IGameObjectData[]>;
  findHiddenItems(zone: string): Promise<IGameObjectData[]>;
}

// ===== SCHÉMAS =====

// Schéma pour la position
const PositionSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

// Schéma pour les requirements
const RequirementsSchema = new Schema({
  minLevel: { type: Number, min: 1, max: 100 },
  badge: { type: String, trim: true },
  item: { type: String, trim: true },
  quest: { type: String, trim: true }
}, { 
  _id: false,
  strict: false // Permet d'autres propriétés
});

// ===== SCHÉMA PRINCIPAL =====

const GameObjectDataSchema = new Schema<IGameObjectData>({
  // === IDENTIFICATION ===
  objectId: { 
    type: Number, 
    required: true,
    min: [1, 'Object ID must be positive']
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
    trim: true,
    maxlength: [100, 'Object name too long']
  },
  type: { 
    type: String, 
    required: true,
    enum: {
      values: ['ground', 'hidden', 'pc', 'vending_machine', 'panel', 'guild_board'],
      message: 'Invalid object type'
    },
    index: true
  },
  
  // === POSITIONNEMENT ===
  position: { 
    type: PositionSchema, 
    required: true 
  },
  
  // === CONTENU ET COMPORTEMENT ===
  itemId: { 
    type: String,
    trim: true,
    maxlength: [50, 'Item ID too long']
  },
  sprite: { 
    type: String,
    trim: true,
    maxlength: [100, 'Sprite name too long']
  },
  quantity: { 
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
    max: [999, 'Quantity too large']
  },
  cooldownHours: { 
    type: Number,
    default: 24,
    min: [0, 'Cooldown cannot be negative'],
    max: [168, 'Cooldown too long (max 1 week)']
  },
  
  // === PROPRIÉTÉS SPÉCIFIQUES ===
  searchRadius: { 
    type: Number,
    min: [8, 'Search radius too small'],
    max: [128, 'Search radius too large']
  },
  itemfinderRadius: { 
    type: Number,
    min: [16, 'Itemfinder radius too small'],
    max: [256, 'Itemfinder radius too large']
  },
  findChance: { 
    type: Number,
    min: [1, 'Find chance too low'],
    max: [95, 'Find chance too high']
  },
  
  // === REQUIREMENTS ===
  requirements: { 
    type: RequirementsSchema,
    default: undefined
  },
  
  // === PROPRIÉTÉS CUSTOM ===
  customProperties: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  
  // === MÉTADONNÉES ===
  rarity: { 
    type: String,
    enum: {
      values: ['common', 'rare', 'epic', 'legendary'],
      message: 'Invalid rarity'
    },
    default: 'common'
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  version: { 
    type: String, 
    default: '2.0.0',
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
  collection: 'game_objects',
  minimize: false // Garder les objets vides
});

// ===== INDEX COMPOSITES =====

// Index principal unique par zone et ID
GameObjectDataSchema.index({ zone: 1, objectId: 1 }, { unique: true });

// Index pour les requêtes fréquentes
GameObjectDataSchema.index({ zone: 1, isActive: 1 });
GameObjectDataSchema.index({ zone: 1, type: 1 });
GameObjectDataSchema.index({ type: 1, isActive: 1 });
GameObjectDataSchema.index({ zone: 1, type: 1, isActive: 1 });

// Index pour les items
GameObjectDataSchema.index({ itemId: 1 });
GameObjectDataSchema.index({ zone: 1, itemId: 1 });

// Index géospatial pour la position
GameObjectDataSchema.index({ 'position.x': 1, 'position.y': 1 });
GameObjectDataSchema.index({ zone: 1, 'position.x': 1, 'position.y': 1 });

// ===== VALIDATIONS PRE-SAVE =====

GameObjectDataSchema.pre('save', function(next) {
  // Validation de cohérence selon le type
  if (this.type === 'ground' || this.type === 'hidden') {
    if (!this.itemId) {
      return next(new Error(`Objects of type '${this.type}' require an itemId`));
    }
  }
  
  // Propriétés spécifiques aux objets cachés
  if (this.type === 'hidden') {
    if (!this.searchRadius) this.searchRadius = 16;
    if (!this.itemfinderRadius) this.itemfinderRadius = 64;
    if (!this.findChance) this.findChance = 60;
  }
  
  // Validation des requirements
  if (this.requirements) {
    if (this.requirements.minLevel && (this.requirements.minLevel < 1 || this.requirements.minLevel > 100)) {
      return next(new Error('Min level must be between 1 and 100'));
    }
  }
  
  // Mise à jour timestamp
  this.lastUpdated = new Date();
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Convertit le document MongoDB au format objet attendu par ObjectInteractionModule
 */
GameObjectDataSchema.methods.toObjectFormat = function(this: IGameObjectData): any {
  return {
    // Format compatible avec ObjectDefinition
    id: this.objectId,
    name: this.name || this.itemId || `Object_${this.objectId}`,
    x: this.position.x,
    y: this.position.y,
    zone: this.zone,
    
    // Type et contenu
    type: this.type === 'ground' ? 'ground_item' : 
          this.type === 'hidden' ? 'hidden_item' : 
          this.type,
    itemId: this.itemId,
    quantity: this.quantity || 1,
    respawnTime: 0, // Géré par cooldown système
    
    // Requirements
    requirements: this.requirements,
    
    // Propriétés custom avec données spécifiques
    customProperties: {
      // Données de base
      sprite: this.sprite,
      cooldownHours: this.cooldownHours,
      rarity: this.rarity,
      
      // Propriétés spécifiques objets cachés
      ...(this.type === 'hidden' && {
        searchRadius: this.searchRadius,
        itemfinderRadius: this.itemfinderRadius,
        findChance: this.findChance
      }),
      
      // Propriétés custom additionnelles
      ...this.customProperties,
      
      // Métadonnées MongoDB
      originalType: this.type,
      mongoId: this._id.toString(),
      version: this.version
    },
    
    // État runtime (sera géré par ObjectStateManager)
    state: {
      collected: false,
      collectedBy: []
    }
  };
};

/**
 * Met à jour les données depuis un objet JSON
 */
GameObjectDataSchema.methods.updateFromJson = async function(
  this: IGameObjectData, 
  jsonData: any
): Promise<void> {
  // Propriétés de base
  if (jsonData.position) this.position = jsonData.position;
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.itemId) this.itemId = jsonData.itemId;
  if (jsonData.sprite) this.sprite = jsonData.sprite;
  if (typeof jsonData.quantity === 'number') this.quantity = jsonData.quantity;
  if (typeof jsonData.cooldown === 'number') this.cooldownHours = jsonData.cooldown;
  
  // Propriétés spécifiques objets cachés
  if (typeof jsonData.searchRadius === 'number') this.searchRadius = jsonData.searchRadius;
  if (typeof jsonData.itemfinderRadius === 'number') this.itemfinderRadius = jsonData.itemfinderRadius;
  if (typeof jsonData.findChance === 'number') this.findChance = jsonData.findChance;
  
  // Requirements
  if (jsonData.requirements) this.requirements = jsonData.requirements;
  
  // Propriétés custom (tout le reste)
  const baseFields = [
    'id', 'position', 'type', 'itemId', 'sprite', 'quantity', 'cooldown',
    'searchRadius', 'itemfinderRadius', 'findChance', 'requirements'
  ];
  
  const customProps: any = { ...this.customProperties };
  for (const [key, value] of Object.entries(jsonData)) {
    if (!baseFields.includes(key)) {
      customProps[key] = value;
    }
  }
  this.customProperties = customProps;
  
  await this.save();
};

/**
 * Vérifie si l'objet satisfait les requirements pour un joueur
 */
GameObjectDataSchema.methods.meetsRequirements = function(
  this: IGameObjectData,
  playerLevel: number,
  playerItems: string[] = [],
  playerBadges: string[] = []
): boolean {
  if (!this.requirements) return true;
  
  // Vérification niveau
  if (this.requirements.minLevel && playerLevel < this.requirements.minLevel) {
    return false;
  }
  
  // Vérification badge
  if (this.requirements.badge && !playerBadges.includes(this.requirements.badge)) {
    return false;
  }
  
  // Vérification item
  if (this.requirements.item && !playerItems.includes(this.requirements.item)) {
    return false;
  }
  
  // TODO: Vérification quête si nécessaire
  
  return true;
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve tous les objets d'une zone
 */
GameObjectDataSchema.statics.findByZone = function(zone: string): Promise<IGameObjectData[]> {
  return this.find({ zone, isActive: true }).sort({ objectId: 1 });
};

/**
 * Trouve les objets par type
 */
GameObjectDataSchema.statics.findByType = function(
  type: GameObjectType, 
  zone?: string
): Promise<IGameObjectData[]> {
  const query: any = { type, isActive: true };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ zone: 1, objectId: 1 });
};

/**
 * Trouve tous les objets actifs d'une zone
 */
GameObjectDataSchema.statics.findActiveObjects = function(zone: string): Promise<IGameObjectData[]> {
  return this.find({ 
    zone, 
    isActive: true 
  }).sort({ objectId: 1 });
};

/**
 * Trouve les objets au sol (ground items)
 */
GameObjectDataSchema.statics.findGroundItems = function(zone: string): Promise<IGameObjectData[]> {
  return this.find({ 
    zone, 
    type: 'ground', 
    isActive: true 
  }).sort({ objectId: 1 });
};

/**
 * Trouve les objets cachés (hidden items)
 */
GameObjectDataSchema.statics.findHiddenItems = function(zone: string): Promise<IGameObjectData[]> {
  return this.find({ 
    zone, 
    type: 'hidden', 
    isActive: true 
  }).sort({ objectId: 1 });
};

/**
 * Import en masse depuis JSON
 */
GameObjectDataSchema.statics.bulkImportFromJson = async function(
  zoneData: any
): Promise<{ success: number; errors: string[] }> {
  const results: { success: number; errors: string[] } = { success: 0, errors: [] };
  
  if (!zoneData.zone || !zoneData.objects || !Array.isArray(zoneData.objects)) {
    results.errors.push('Invalid zone data format');
    return results;
  }
  
  for (const jsonObject of zoneData.objects) {
    try {
      await (this as IGameObjectDataModel).createFromJson(jsonObject, zoneData.zone);
      results.success++;
    } catch (error) {
      results.errors.push(`Object ${jsonObject.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

/**
 * Crée un objet depuis des données JSON
 */
GameObjectDataSchema.statics.createFromJson = async function(
  jsonObject: any, 
  zone: string
): Promise<IGameObjectData> {
  // Validation de base
  if (!jsonObject.id || !jsonObject.type || !jsonObject.position) {
    throw new Error('Missing required fields: id, type, position');
  }
  
  // Vérifier si existe déjà
  const existing = await this.findOne({ zone, objectId: jsonObject.id });
  if (existing) {
    // Mettre à jour existant
    await existing.updateFromJson(jsonObject);
    return existing;
  }
  
  // Déterminer la rareté automatiquement si itemId présent
  let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
  if (jsonObject.itemId) {
    try {
      const { getItemData } = require('../utils/ItemDB');
      const itemData = getItemData(jsonObject.itemId);
      if (itemData.price) {
        if (itemData.price <= 300) rarity = 'common';
        else if (itemData.price <= 1000) rarity = 'rare';
        else if (itemData.price <= 3000) rarity = 'epic';
        else rarity = 'legendary';
      }
    } catch (error) {
      // Ignore les erreurs ItemDB, garder rareté par défaut
    }
  }
  
  // Créer nouveau
  const objectData = new this({
    objectId: jsonObject.id,
    zone,
    name: jsonObject.name,
    type: jsonObject.type,
    position: jsonObject.position,
    itemId: jsonObject.itemId,
    sprite: jsonObject.sprite,
    quantity: jsonObject.quantity || 1,
    cooldownHours: jsonObject.cooldown || 24,
    searchRadius: jsonObject.searchRadius,
    itemfinderRadius: jsonObject.itemfinderRadius,
    findChance: jsonObject.findChance,
    requirements: jsonObject.requirements,
    rarity,
    version: '2.0.0',
    sourceFile: `${zone}.json`
  });
  
  // Ajouter propriétés custom
  await objectData.updateFromJson(jsonObject);
  
  return objectData;
};

// ===== EXPORT =====
export const GameObjectData = mongoose.model<IGameObjectData, IGameObjectDataModel>('GameObjectData', GameObjectDataSchema);

// Types d'export
export type GameObjectDataDocument = IGameObjectData;
export type CreateGameObjectData = Partial<Pick<IGameObjectData, 
  'objectId' | 'zone' | 'type' | 'position' | 'itemId' | 'customProperties'
>>;
