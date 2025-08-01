// server/src/models/NpcData.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { NpcType, Direction, AnyNpc } from "../types/NpcTypes";

// ===== NOUVELLES INTERFACES ÉTENDUES =====

// Configuration de combat pour tous les NPCs
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

// Configuration de vision spécifique aux dresseurs
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

// ✅ NOUVEAU : Configuration Shop pour NPCs type 'merchant'
export interface ShopConfig {
  shopId: string;                     // ID de la boutique associée
  shopType?: 'general' | 'pokemart' | 'department' | 'specialty' | 'underground' | 'battle' | 'contest' | 'medicine' | 'berries' | 'tms';
  currency?: 'gold' | 'tokens' | 'bp' | 'coins';
  buyMultiplier?: number;             // Multiplicateur d'achat (défaut: 1.0)
  sellMultiplier?: number;            // Multiplicateur de vente (défaut: 0.5)
  taxRate?: number;                   // Taux de taxe (défaut: 0)
  
  // Horaires d'ouverture
  businessHours?: {
    enabled: boolean;
    openTime: string;                 // Format "HH:mm"
    closeTime: string;                // Format "HH:mm" 
    closedDays?: string[];            // Jours fermés ["monday", "sunday"]
    timezone?: string;                // Timezone (défaut: serveur)
  };
  
  // Restrictions d'accès
  accessRestrictions?: {
    minLevel?: number;
    maxLevel?: number;
    requiredBadges?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    membershipRequired?: boolean;
    vipOnly?: boolean;
  };
  
  // Configuration de restockage
  restockInfo?: {
    enabled: boolean;
    intervalHours: number;            // Heures entre les restocks
    lastRestock?: Date;
    nextRestock?: Date;
    notifyPlayers?: boolean;
  };
  
  // Items en vente (référence vers ShopData)
  items?: Array<{
    itemId: string;
    category: string;
    basePrice: number;
    stock?: number;                   // Stock disponible (-1 = illimité)
    unlockLevel?: number;
    requiredBadges?: string[];
    featured?: boolean;               // Mis en avant
    discount?: number;                // Réduction en %
  }>;
  
  // Dialogues spécifiques au shop
  shopDialogueIds?: {
    welcome?: string[];               // Dialogue d'accueil
    browse?: string[];                // Dialogue navigation
    purchase?: string[];              // Dialogue achat
    sell?: string[];                  // Dialogue vente
    insufficient?: string[];          // Pas assez d'argent
    inventory_full?: string[];        // Inventaire plein
    goodbye?: string[];               // Dialogue de fermeture
    closed?: string[];                // Boutique fermée
    restricted?: string[];            // Accès refusé
  };
  
  // Services additionnels
  additionalServices?: {
    buyback?: boolean;                // Rachat d'objets
    repair?: boolean;                 // Réparation d'objets
    appraisal?: boolean;              // Évaluation d'objets
    storage?: boolean;                // Stockage temporaire
    delivery?: boolean;               // Livraison
    customOrders?: boolean;           // Commandes spéciales
  };
}

// États possibles d'un trainer
export type TrainerState = 'idle' | 'alerted' | 'chasing' | 'battling' | 'defeated' | 'returning';

// Métadonnées de runtime pour trainers
export interface TrainerRuntimeData {
  currentState: TrainerState;
  lastDetectionTime?: number;
  targetPlayerId?: string;
  originalPosition: { x: number; y: number };
  lastBattleTime?: number;
  defeatedBy?: string[];              // Liste des joueurs qui l'ont battu
}

// ===== INTERFACE PRINCIPALE ÉTENDUE =====

export interface INpcData extends Document {
  // === IDENTIFICATION (existant) ===
  npcId: number;
  zone: string;
  name: string;
  type: NpcType;
  
  // === POSITIONNEMENT (existant) ===
  position: {
    x: number;
    y: number;
  };
  direction: Direction;
  sprite: string;
  
  // === COMPORTEMENT (existant) ===
  interactionRadius: number;
  canWalkAway: boolean;
  autoFacePlayer: boolean;
  repeatable: boolean;
  cooldownSeconds: number;
  
  // === CONDITIONS D'APPARITION (existant) ===
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
  
  // === DONNÉES SPÉCIFIQUES PAR TYPE (existant) ===
  npcData: any;
  
  // === SYSTÈME QUÊTES (existant) ===
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: any;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  // === SYSTÈME DE COMBAT (existant) ===
  battleConfig?: BattleConfig;
  
  // === VISION DRESSEURS (existant) ===
  visionConfig?: TrainerVisionConfig;
  
  // === DONNÉES RUNTIME TRAINERS (existant) ===
  trainerRuntime?: TrainerRuntimeData;
  
  // === 🆕 NOUVEAU : SYSTÈME SHOP POUR MERCHANTS ===
  shopConfig?: ShopConfig;
  
  // === MÉTADONNÉES (existant) ===
  isActive: boolean;
  version: string;
  lastUpdated: Date;
  sourceFile?: string;
  
  // === MÉTHODES D'INSTANCE EXISTANTES ===
  toNpcFormat(): AnyNpc;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, playerFlags: string[]): boolean;
  
  // === MÉTHODES D'INSTANCE EXISTANTES (combat/trainer) ===
  canBattlePlayer(playerLevel: number, playerFlags?: string[]): boolean;
  isTrainerType(): boolean;
  initializeTrainerRuntime(): void;
  updateTrainerState(newState: TrainerState): void;
  canDetectPlayer(playerPosition: { x: number; y: number }, playerLevel: number): boolean;
  isInSight(playerPosition: { x: number; y: number }): boolean;
  isInChaseRange(playerPosition: { x: number; y: number }): boolean;
  
  // === 🆕 NOUVELLES MÉTHODES D'INSTANCE SHOP ===
  isMerchantType(): boolean;
  hasShopConfig(): boolean;
  isShopOpen(): boolean;
  canPlayerAccessShop(playerLevel: number, playerFlags?: string[], badges?: string[]): boolean;
  getShopItems(): any[];
  updateShopStock(itemId: string, newStock: number): Promise<void>;
  triggerRestock(): Promise<void>;
}

// Interface pour les méthodes statiques étendues
export interface INpcDataModel extends Model<INpcData> {
  findByZone(zone: string): Promise<INpcData[]>;
  findByType(type: NpcType, zone?: string): Promise<INpcData[]>;
  findActiveNpcs(zone: string): Promise<INpcData[]>;
  bulkImportFromJson(zoneData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonNpc: any, zone: string): Promise<INpcData>;
  
  // MÉTHODES STATIQUES EXISTANTES (combat/trainer)
  findTrainersInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithTeams(zone: string): Promise<INpcData[]>;
  findActiveTrainers(zone: string): Promise<INpcData[]>;
  
  // 🆕 NOUVELLES MÉTHODES STATIQUES SHOP
  findMerchantsInZone(zone: string): Promise<INpcData[]>;
  findNpcsWithShops(zone: string): Promise<INpcData[]>;
  findOpenShops(zone: string): Promise<INpcData[]>;
  findShopsByType(shopType: string, zone?: string): Promise<INpcData[]>;
}

// ===== SCHÉMAS ÉTENDUS =====

// Schéma pour la configuration de combat (existant)
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

// Schéma pour la configuration de vision des trainers (existant)
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

// ✅ NOUVEAU : Schéma pour la configuration Shop
const ShopConfigSchema = new Schema({
  shopId: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Shop ID too long']
  },
  shopType: { 
    type: String, 
    enum: ['general', 'pokemart', 'department', 'specialty', 'underground', 'battle', 'contest', 'medicine', 'berries', 'tms'],
    default: 'general' 
  },
  currency: { 
    type: String, 
    enum: ['gold', 'tokens', 'bp', 'coins'],
    default: 'gold' 
  },
  buyMultiplier: { 
    type: Number, 
    min: [0.1, 'Buy multiplier too low'],
    max: [10, 'Buy multiplier too high'],
    default: 1.0 
  },
  sellMultiplier: { 
    type: Number, 
    min: [0.1, 'Sell multiplier too low'],
    max: [1, 'Sell multiplier too high'],
    default: 0.5 
  },
  taxRate: { 
    type: Number, 
    min: [0, 'Tax rate cannot be negative'],
    max: [0.5, 'Tax rate too high'],
    default: 0 
  },
  
  // Horaires d'ouverture
  businessHours: {
    enabled: { type: Boolean, default: false },
    openTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    closeTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    closedDays: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
    timezone: { type: String, default: 'UTC' }
  },
  
  // Restrictions d'accès
  accessRestrictions: {
    minLevel: { type: Number, min: 1, max: 100 },
    maxLevel: { type: Number, min: 1, max: 100 },
    requiredBadges: [{ type: String }],
    requiredFlags: [{ type: String }],
    forbiddenFlags: [{ type: String }],
    membershipRequired: { type: Boolean, default: false },
    vipOnly: { type: Boolean, default: false }
  },
  
  // Configuration de restockage
  restockInfo: {
    enabled: { type: Boolean, default: false },
    intervalHours: { type: Number, min: 1, max: 168, default: 24 },
    lastRestock: { type: Date },
    nextRestock: { type: Date },
    notifyPlayers: { type: Boolean, default: false }
  },
  
  // Items en vente
  items: [{
    itemId: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: -1 }, // -1 = illimité
    unlockLevel: { type: Number, min: 1, max: 100 },
    requiredBadges: [{ type: String }],
    featured: { type: Boolean, default: false },
    discount: { type: Number, min: 0, max: 100, default: 0 }
  }],
  
  // Dialogues spécifiques au shop
  shopDialogueIds: {
    welcome: [{ type: String }],
    browse: [{ type: String }],
    purchase: [{ type: String }],
    sell: [{ type: String }],
    insufficient: [{ type: String }],
    inventory_full: [{ type: String }],
    goodbye: [{ type: String }],
    closed: [{ type: String }],
    restricted: [{ type: String }]
  },
  
  // Services additionnels
  additionalServices: {
    buyback: { type: Boolean, default: true },
    repair: { type: Boolean, default: false },
    appraisal: { type: Boolean, default: false },
    storage: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    customOrders: { type: Boolean, default: false }
  }
}, { _id: false });

// Schéma pour les données runtime des trainers (existant)
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

// ===== SCHÉMA PRINCIPAL ÉTENDU =====

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
  
  // === CHAMPS EXISTANTS (combat/trainer) ===
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
  
  // === 🆕 NOUVEAU CHAMP SHOP ===
  shopConfig: { 
    type: ShopConfigSchema,
    default: undefined
  },
  
  // === MÉTADONNÉES (existantes) ===
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
  collection: 'npc_data',
  minimize: false
});

// ===== INDEX COMPOSITES ÉTENDUS =====

// Index existants
NpcDataSchema.index({ zone: 1, npcId: 1 }, { unique: true });
NpcDataSchema.index({ zone: 1, isActive: 1 });
NpcDataSchema.index({ zone: 1, type: 1 });
NpcDataSchema.index({ type: 1, isActive: 1 });

// Index existants (combat/vision)
NpcDataSchema.index({ 'battleConfig.teamId': 1 });
NpcDataSchema.index({ zone: 1, type: 1, 'battleConfig.canBattle': 1 });
NpcDataSchema.index({ zone: 1, 'visionConfig.sightRange': 1 });
NpcDataSchema.index({ 'trainerRuntime.currentState': 1 });

// 🆕 Nouveaux index pour shop
NpcDataSchema.index({ 'shopConfig.shopId': 1 });
NpcDataSchema.index({ zone: 1, type: 1, 'shopConfig.shopId': 1 });
NpcDataSchema.index({ zone: 1, 'shopConfig.shopType': 1 });
NpcDataSchema.index({ 'shopConfig.currency': 1 });

// ===== VALIDATIONS PRE-SAVE ÉTENDUES =====

NpcDataSchema.pre('save', function(next) {
  // Validations existantes
  if (this.spawnConditions?.minPlayerLevel && this.spawnConditions?.maxPlayerLevel) {
    if (this.spawnConditions.minPlayerLevel > this.spawnConditions.maxPlayerLevel) {
      return next(new Error('Min player level cannot be greater than max player level'));
    }
  }
  
  // Validations existantes (trainer)
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
  
  // 🆕 NOUVELLES VALIDATIONS SHOP
  // Si c'est un merchant, il doit avoir shopConfig
  if (this.type === 'merchant' && !this.shopConfig) {
    this.shopConfig = {
      shopId: `shop_${this.zone}_${this.npcId}`,
      shopType: 'general',
      currency: 'gold',
      buyMultiplier: 1.0,
      sellMultiplier: 0.5,
      items: []
    } as ShopConfig;
  }
  
  // Validation cohérence shop
  if (this.shopConfig) {
    // Valider les horaires d'ouverture
    if (this.shopConfig.businessHours?.enabled) {
      if (!this.shopConfig.businessHours.openTime || !this.shopConfig.businessHours.closeTime) {
        return next(new Error('Business hours enabled but open/close times not set'));
      }
    }
    
    // Valider les restrictions d'accès
    if (this.shopConfig.accessRestrictions?.minLevel && this.shopConfig.accessRestrictions?.maxLevel) {
      if (this.shopConfig.accessRestrictions.minLevel > this.shopConfig.accessRestrictions.maxLevel) {
        return next(new Error('Shop min access level cannot be greater than max access level'));
      }
    }
    
    // Calculer le prochain restock si nécessaire
    if (this.shopConfig.restockInfo?.enabled && !this.shopConfig.restockInfo.nextRestock) {
      this.shopConfig.restockInfo.nextRestock = new Date(Date.now() + (this.shopConfig.restockInfo.intervalHours * 60 * 60 * 1000));
    }
  }
  
  this.lastUpdated = new Date();
  next();
});

// ===== MÉTHODES D'INSTANCE ÉTENDUES =====

// Méthodes existantes (inchangées)
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
    
    // Données existantes (combat/trainer)
    battleConfig: this.battleConfig,
    visionConfig: this.visionConfig,
    trainerRuntime: this.trainerRuntime,
    
    // 🆕 Nouvelles données shop
    shopConfig: this.shopConfig,
    
    ...this.npcData
  } as AnyNpc;
  
  return baseNpc;
};

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
  
  // Données existantes (combat/trainer)
  if (jsonData.battleConfig) this.battleConfig = jsonData.battleConfig;
  if (jsonData.visionConfig) this.visionConfig = jsonData.visionConfig;
  if (jsonData.trainerRuntime) this.trainerRuntime = jsonData.trainerRuntime;
  
  // 🆕 Nouvelles données shop
  if (jsonData.shopConfig) this.shopConfig = jsonData.shopConfig;
  
  // Données spécifiques (existant + shop)
  const baseFields = [
    'id', 'name', 'type', 'position', 'direction', 'sprite', 
    'interactionRadius', 'canWalkAway', 'autoFacePlayer', 
    'repeatable', 'cooldownSeconds', 'spawnConditions',
    'questsToGive', 'questsToEnd', 'questRequirements', 'questDialogueIds',
    'battleConfig', 'visionConfig', 'trainerRuntime', 
    'shopConfig' // 🆕 Ajouté
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

// MÉTHODES D'INSTANCE EXISTANTES (combat/trainer) - inchangées
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

// 🆕 NOUVELLES MÉTHODES D'INSTANCE SHOP

/**
 * Vérifie si c'est un merchant (type ou avec shopConfig)
 */
NpcDataSchema.methods.isMerchantType = function(this: INpcData): boolean {
  return this.type === 'merchant' || !!this.shopConfig;
};

/**
 * Vérifie si le NPC a une configuration shop valide
 */
NpcDataSchema.methods.hasShopConfig = function(this: INpcData): boolean {
  return !!(this.shopConfig && this.shopConfig.shopId);
};

/**
 * Vérifie si la boutique est ouverte (horaires d'ouverture)
 */
NpcDataSchema.methods.isShopOpen = function(this: INpcData): boolean {
  if (!this.shopConfig || !this.shopConfig.businessHours?.enabled) return true;
  
  const now = new Date();
  const currentTime = now.toTimeString().substr(0, 5); // HH:mm
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  
  // Vérifier si fermé aujourd'hui
  if (this.shopConfig.businessHours.closedDays?.includes(currentDay)) {
    return false;
  }
  
  // Vérifier les heures d'ouverture
  const openTime = this.shopConfig.businessHours.openTime!;
  const closeTime = this.shopConfig.businessHours.closeTime!;
  
  if (openTime <= closeTime) {
    // Même jour (ex: 09:00 - 18:00)
    return currentTime >= openTime && currentTime <= closeTime;
  } else {
    // Nuit (ex: 22:00 - 06:00)
    return currentTime >= openTime || currentTime <= closeTime;
  }
};

/**
 * Vérifie si un joueur peut accéder à la boutique
 */
NpcDataSchema.methods.canPlayerAccessShop = function(
  this: INpcData,
  playerLevel: number,
  playerFlags: string[] = [],
  badges: string[] = []
): boolean {
  if (!this.hasShopConfig() || !this.isShopOpen()) return false;
  
  const restrictions = this.shopConfig!.accessRestrictions;
  if (!restrictions) return true;
  
  // Vérifier niveau
  if (restrictions.minLevel && playerLevel < restrictions.minLevel) return false;
  if (restrictions.maxLevel && playerLevel > restrictions.maxLevel) return false;
  
  // Vérifier badges
  if (restrictions.requiredBadges?.length) {
    const hasAllBadges = restrictions.requiredBadges.every(badge => 
      badges.includes(badge)
    );
    if (!hasAllBadges) return false;
  }
  
  // Vérifier flags
  if (restrictions.requiredFlags?.length) {
    const hasAllFlags = restrictions.requiredFlags.every(flag => 
      playerFlags.includes(flag)
    );
    if (!hasAllFlags) return false;
  }
  
  if (restrictions.forbiddenFlags?.length) {
    const hasAnyForbidden = restrictions.forbiddenFlags.some(flag => 
      playerFlags.includes(flag)
    );
    if (hasAnyForbidden) return false;
  }
  
  // TODO: Vérifier membership et VIP selon le système de jeu
  
  return true;
};

/**
 * Récupère les items de la boutique
 */
NpcDataSchema.methods.getShopItems = function(this: INpcData): any[] {
  if (!this.shopConfig) return [];
  return this.shopConfig.items || [];
};

/**
 * Met à jour le stock d'un item
 */
NpcDataSchema.methods.updateShopStock = async function(
  this: INpcData,
  itemId: string,
  newStock: number
): Promise<void> {
  if (!this.shopConfig || !this.shopConfig.items) return;
  
  const item = this.shopConfig.items.find(i => i.itemId === itemId);
  if (item) {
    item.stock = newStock;
    await this.save();
  }
};

/**
 * Déclenche un restock de la boutique
 */
NpcDataSchema.methods.triggerRestock = async function(this: INpcData): Promise<void> {
  if (!this.shopConfig || !this.shopConfig.restockInfo?.enabled) return;
  
  const now = new Date();
  this.shopConfig.restockInfo.lastRestock = now;
  this.shopConfig.restockInfo.nextRestock = new Date(
    now.getTime() + (this.shopConfig.restockInfo.intervalHours * 60 * 60 * 1000)
  );
  
  // Restaurer le stock de tous les items (logique simplifiée)
  if (this.shopConfig.items) {
    this.shopConfig.items.forEach(item => {
      if (item.stock !== -1) { // Si pas illimité
        item.stock = Math.max(item.stock || 0, 10); // Restaurer à 10 minimum
      }
    });
  }
  
  await this.save();
};

// ===== MÉTHODES STATIQUES ÉTENDUES =====

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

// Méthodes existantes (combat/trainer)
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

// 🆕 NOUVELLES MÉTHODES STATIQUES SHOP

/**
 * Trouve tous les merchants d'une zone
 */
NpcDataSchema.statics.findMerchantsInZone = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    $or: [
      { type: 'merchant' },
      { shopConfig: { $exists: true } }
    ]
  }).sort({ npcId: 1 });
};

/**
 * Trouve tous les NPCs avec boutiques (peuvent vendre)
 */
NpcDataSchema.statics.findNpcsWithShops = function(zone: string): Promise<INpcData[]> {
  return this.find({ 
    zone, 
    isActive: true,
    'shopConfig.shopId': { $exists: true }
  }).sort({ npcId: 1 });
};

/**
 * Trouve toutes les boutiques ouvertes d'une zone
 */
NpcDataSchema.statics.findOpenShops = function(zone: string): Promise<INpcData[]> {
  // Note: Cette méthode ne peut pas vérifier les horaires d'ouverture dynamiquement au niveau MongoDB
  // Il faudra filtrer côté application avec isShopOpen()
  return this.find({ 
    zone, 
    isActive: true,
    'shopConfig.shopId': { $exists: true }
  }).sort({ npcId: 1 });
};

/**
 * Trouve les boutiques par type
 */
NpcDataSchema.statics.findShopsByType = function(
  shopType: string, 
  zone?: string
): Promise<INpcData[]> {
  const query: any = { 
    isActive: true,
    'shopConfig.shopType': shopType
  };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ zone: 1, npcId: 1 });
};

// ===== EXPORT =====
export const NpcData = mongoose.model<INpcData, INpcDataModel>('NpcData', NpcDataSchema);

export type NpcDataDocument = INpcData;
export type CreateNpcData = Partial<Pick<INpcData, 
  'npcId' | 'zone' | 'name' | 'type' | 'position' | 'sprite' | 'npcData' | 'battleConfig' | 'visionConfig' | 'shopConfig'
>>;
