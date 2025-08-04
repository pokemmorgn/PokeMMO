// server/src/models/ItemData.ts - MODÈLE MONGOOSE POUR ITEMS
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== TYPES DE BASE =====

export type ItemType = 
  | 'ball' | 'medicine' | 'item' | 'key_item' 
  | 'tm' | 'hm' | 'berry' | 'fossil' | 'mail'
  | 'battle_item' | 'evolution_item' | 'held_item'
  | 'gem' | 'plate' | 'memory' | 'z_crystal';

export type ItemPocket = 
  | 'balls' | 'medicine' | 'items' | 'key_items' 
  | 'tms_hms' | 'berries' | 'battle_items' | 'mail';

export type ItemRarity = 
  | 'common' | 'uncommon' | 'rare' | 'epic' 
  | 'legendary' | 'mythic' | 'artifact';

export type StatusCondition = 
  | 'poison' | 'paralysis' | 'sleep' | 'burn' 
  | 'freeze' | 'confusion' | 'all';

// ===== INTERFACES ÉTENDUES =====

export interface IItemData extends Document {
  // === IDENTIFICATION ===
  itemId: string;                   // ID unique de l'item
  name: string;                     // Nom de l'item
  description?: string;             // Description de l'item
  type: ItemType;                   // Type d'item
  pocket: ItemPocket;               // Poche d'inventaire
  
  // === ÉCONOMIE ===
  price: number | null;             // Prix d'achat (null = non achetable)
  sellPrice: number | null;         // Prix de vente (null = non vendable)
  
  // === UTILISATION ===
  usableInBattle: boolean;          // Utilisable en combat
  usableInField: boolean;           // Utilisable hors combat
  stackable: boolean;               // Empilable dans l'inventaire
  consumable: boolean;              // Consommé à l'usage
  
  // === EFFETS SPÉCIFIQUES ===
  healAmount?: number | 'full';     // Quantité de soins (HP/PP)
  reviveAmount?: number;            // Quantité de résurrection (0.5 = 50%)
  statusCure?: StatusCondition[];   // Conditions guéries
  effectSteps?: number;             // Durée d'effet en pas (repel, etc.)
  
  // === MÉTADONNÉES ÉTENDUES ===
  rarity?: ItemRarity;              // Rareté de l'item
  category?: string;                // Catégorie spécifique
  tags?: string[];                  // Tags pour recherche/filtrage
  
  // === CONFIGURATION AVANCÉE ===
  metadata?: {
    icon?: string;                  // Icône dans l'inventaire
    sprite?: string;                // Sprite dans le monde
    color?: string;                 // Couleur thématique
    weight?: number;                // Poids (pour limite inventaire)
    tradeable?: boolean;            // Échangeable entre joueurs
    discardable?: boolean;          // Jetable par le joueur
    giftable?: boolean;             // Peut être offert
    questItem?: boolean;            // Item de quête
    unique?: boolean;               // Un seul exemplaire maximum
    expireTime?: number;            // Temps d'expiration (minutes)
    requiresLevel?: number;         // Niveau requis pour utiliser
    requiresBadges?: string[];      // Badges requis
    limitPerPlayer?: number;        // Limite par joueur
    obtainMethods?: string[];       // Méthodes d'obtention
  };
  
  // === EFFETS AVANCÉS ===
  effects?: {
    // Effets de combat
    battleBoosts?: {
      attack?: number;
      defense?: number;
      speed?: number;
      accuracy?: number;
      evasion?: number;
      criticalRate?: number;
    };
    
    // Effets temporaires
    temporaryEffects?: {
      duration?: number;            // Durée en minutes
      type?: 'xp_boost' | 'catch_boost' | 'money_boost' | 'shiny_boost';
      multiplier?: number;
    };
    
    // Effets spéciaux
    specialEffects?: {
      preventEvolution?: boolean;
      preventFainting?: boolean;
      doubleExperience?: boolean;
      increasedShinyRate?: boolean;
      unlockArea?: string;
      customScript?: string;
    };
  };
  
  // === CONDITIONS D'UTILISATION ===
  usageConditions?: {
    timeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
    weather?: ('sunny' | 'rain' | 'snow' | 'fog' | 'storm')[];
    location?: string | string[];
    pokemonType?: string | string[];
    pokemonLevel?: { min?: number; max?: number };
    playerLevel?: { min?: number; max?: number };
    inBattle?: boolean;
    onPokemon?: boolean;
    onWildPokemon?: boolean;
    customConditions?: Record<string, any>;
  };
  
  // === SYSTÈME DE CRAFT/RECETTES ===
  craftingData?: {
    craftable?: boolean;
    recipe?: Array<{
      itemId: string;
      quantity: number;
    }>;
    craftingLevel?: number;
    craftingStation?: string;
    craftTime?: number;             // Minutes
    successRate?: number;           // 0-100%
  };
  
  // === DONNÉES DE JEU ===
  gameData?: {
    generation?: number;            // Génération Pokémon
    moveId?: string;                // ID du mouvement (TM/HM)
    pokemonId?: number;             // ID Pokémon associé (fossile, etc.)
    evolutionData?: {
      fromPokemon: number;
      toPokemon: number;
      method: string;
    };
    berryData?: {
      flavor?: string;
      firmness?: string;
      growthTime?: number;
      yield?: { min: number; max: number };
      waterNeeds?: number;
    };
  };
  
  // === MÉTADONNÉES SYSTÈME ===
  isActive: boolean;                // Item actif/désactivé
  version: string;                  // Version des données
  lastUpdated: Date;
  sourceFile?: string;              // Fichier source (migration)
  
  // === MÉTHODES D'INSTANCE ===
  canUseInContext(context: 'battle' | 'field', conditions?: any): boolean;
  getEffectivePrice(type: 'buy' | 'sell'): number | null;
  isAvailableForPlayer(playerLevel: number, playerBadges: string[]): boolean;
  calculateWeight(): number;
  
  // NOUVELLES MÉTHODES
  validateItemData(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  migrateToLatestVersion(): Promise<void>;
  toItemFormat(): any;
  updateFromJson(jsonData: any): Promise<void>;
}

// Interface pour les méthodes statiques
export interface IItemDataModel extends Model<IItemData> {
  findByType(type: ItemType): Promise<IItemData[]>;
  findByPocket(pocket: ItemPocket): Promise<IItemData[]>;
  findByRarity(rarity: ItemRarity): Promise<IItemData[]>;
  findUsableItems(context: 'battle' | 'field'): Promise<IItemData[]>;
  findActiveItems(): Promise<IItemData[]>;
  findByPriceRange(minPrice?: number, maxPrice?: number): Promise<IItemData[]>;
  findCraftableItems(): Promise<IItemData[]>;
  
  // Méthodes d'import
  bulkImportFromJson(itemsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonItem: any): Promise<IItemData>;
  
  // Nouvelles méthodes
  validateDatabaseIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
  migrateAllToLatestVersion(): Promise<{ migrated: number; errors: string[] }>;
  findByCategory(category: string): Promise<IItemData[]>;
  findQuestItems(): Promise<IItemData[]>;
  findTradeableItems(): Promise<IItemData[]>;
}

// ===== CONSTANTES DE VALIDATION =====

const ITEM_TYPES: ItemType[] = [
  'ball', 'medicine', 'item', 'key_item', 'tm', 'hm', 'berry', 
  'fossil', 'mail', 'battle_item', 'evolution_item', 'held_item',
  'gem', 'plate', 'memory', 'z_crystal'
];

const ITEM_POCKETS: ItemPocket[] = [
  'balls', 'medicine', 'items', 'key_items', 
  'tms_hms', 'berries', 'battle_items', 'mail'
];

const ITEM_RARITIES: ItemRarity[] = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'artifact'
];

const STATUS_CONDITIONS: StatusCondition[] = [
  'poison', 'paralysis', 'sleep', 'burn', 'freeze', 'confusion', 'all'
];

// ===== SCHÉMAS ÉTENDUS =====

// Schéma pour les métadonnées
const ItemMetadataSchema = new Schema({
  icon: { 
    type: String,
    trim: true,
    maxlength: [100, 'Icon name too long']
  },
  sprite: { 
    type: String,
    trim: true,
    maxlength: [100, 'Sprite name too long']
  },
  color: { 
    type: String,
    trim: true,
    match: [/^#[0-9A-F]{6}$/i, 'Invalid color format']
  },
  weight: { 
    type: Number,
    min: [0, 'Weight cannot be negative'],
    max: [9999, 'Weight too high']
  },
  tradeable: { type: Boolean, default: true },
  discardable: { type: Boolean, default: true },
  giftable: { type: Boolean, default: true },
  questItem: { type: Boolean, default: false },
  unique: { type: Boolean, default: false },
  expireTime: { 
    type: Number,
    min: [0, 'Expire time cannot be negative']
  },
  requiresLevel: { 
    type: Number,
    min: [1, 'Required level must be positive'],
    max: [100, 'Required level too high']
  },
  requiresBadges: [{ 
    type: String,
    trim: true
  }],
  limitPerPlayer: { 
    type: Number,
    min: [1, 'Limit per player must be positive']
  },
  obtainMethods: [{ 
    type: String,
    trim: true
  }]
}, { _id: false });

// Schéma pour les effets
const ItemEffectsSchema = new Schema({
  battleBoosts: {
    attack: { type: Number, min: -6, max: 6 },
    defense: { type: Number, min: -6, max: 6 },
    speed: { type: Number, min: -6, max: 6 },
    accuracy: { type: Number, min: -6, max: 6 },
    evasion: { type: Number, min: -6, max: 6 },
    criticalRate: { type: Number, min: 0, max: 100 }
  },
  temporaryEffects: {
    duration: { type: Number, min: 1 },
    type: { 
      type: String,
      enum: ['xp_boost', 'catch_boost', 'money_boost', 'shiny_boost']
    },
    multiplier: { type: Number, min: 1, max: 10 }
  },
  specialEffects: {
    preventEvolution: { type: Boolean },
    preventFainting: { type: Boolean },
    doubleExperience: { type: Boolean },
    increasedShinyRate: { type: Boolean },
    unlockArea: { type: String, trim: true },
    customScript: { type: String, trim: true }
  }
}, { _id: false });

// Schéma pour les conditions d'utilisation
const UsageConditionsSchema = new Schema({
  timeOfDay: [{ 
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night']
  }],
  weather: [{ 
    type: String,
    enum: ['sunny', 'rain', 'snow', 'fog', 'storm']
  }],
  location: { type: Schema.Types.Mixed },
  pokemonType: { type: Schema.Types.Mixed },
  pokemonLevel: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  playerLevel: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  inBattle: { type: Boolean },
  onPokemon: { type: Boolean },
  onWildPokemon: { type: Boolean },
  customConditions: { type: Schema.Types.Mixed }
}, { _id: false });

// Schéma pour le crafting
const CraftingDataSchema = new Schema({
  craftable: { type: Boolean, default: false },
  recipe: [{
    itemId: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  craftingLevel: { type: Number, min: 1, max: 100 },
  craftingStation: { type: String, trim: true },
  craftTime: { type: Number, min: 0 },
  successRate: { type: Number, min: 0, max: 100, default: 100 }
}, { _id: false });

// Schéma pour les données de jeu
const GameDataSchema = new Schema({
  generation: { type: Number, min: 1, max: 9 },
  moveId: { type: String, trim: true },
  pokemonId: { type: Number, min: 1 },
  evolutionData: {
    fromPokemon: { type: Number, required: true, min: 1 },
    toPokemon: { type: Number, required: true, min: 1 },
    method: { type: String, required: true, trim: true }
  },
  berryData: {
    flavor: { type: String, trim: true },
    firmness: { type: String, trim: true },
    growthTime: { type: Number, min: 0 },
    yield: {
      min: { type: Number, min: 1 },
      max: { type: Number, min: 1 }
    },
    waterNeeds: { type: Number, min: 0, max: 10 }
  }
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const ItemDataSchema = new Schema<IItemData>({
  // === IDENTIFICATION ===
  itemId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Item ID too long'],
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Item name too long']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [2000, 'Description too long']
  },
  type: { 
    type: String, 
    required: true,
    enum: {
      values: ITEM_TYPES,
      message: 'Invalid item type: {VALUE}'
    },
    index: true
  },
  pocket: { 
    type: String, 
    required: true,
    enum: {
      values: ITEM_POCKETS,
      message: 'Invalid pocket type: {VALUE}'
    },
    index: true
  },
  
  // === ÉCONOMIE ===
  price: { 
    type: Number,
    min: [0, 'Price cannot be negative'],
    max: [999999999, 'Price too high'],
    default: null
  },
  sellPrice: { 
    type: Number,
    min: [0, 'Sell price cannot be negative'],
    max: [999999999, 'Sell price too high'],
    default: null
  },
  
  // === UTILISATION ===
  usableInBattle: { 
    type: Boolean, 
    default: false,
    index: true
  },
  usableInField: { 
    type: Boolean, 
    default: false,
    index: true
  },
  stackable: { 
    type: Boolean, 
    default: true
  },
  consumable: { 
    type: Boolean, 
    default: true
  },
  
  // === EFFETS SPÉCIFIQUES ===
  healAmount: { 
    type: Schema.Types.Mixed,
    validate: {
      validator: function(value: any) {
        return value === null || value === undefined || 
               value === 'full' || 
               (typeof value === 'number' && value > 0);
      },
      message: 'Heal amount must be positive number or "full"'
    }
  },
  reviveAmount: { 
    type: Number,
    min: [0, 'Revive amount cannot be negative'],
    max: [1, 'Revive amount cannot exceed 100%']
  },
  statusCure: [{ 
    type: String,
    enum: {
      values: STATUS_CONDITIONS,
      message: 'Invalid status condition: {VALUE}'
    }
  }],
  effectSteps: { 
    type: Number,
    min: [0, 'Effect steps cannot be negative'],
    max: [9999, 'Effect steps too high']
  },
  
  // === MÉTADONNÉES ÉTENDUES ===
  rarity: { 
    type: String,
    enum: {
      values: ITEM_RARITIES,
      message: 'Invalid rarity: {VALUE}'
    },
    default: 'common',
    index: true
  },
  category: { 
    type: String,
    trim: true,
    maxlength: [100, 'Category too long'],
    index: true
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: [50, 'Tag too long']
  }],
  
  // === CONFIGURATION AVANCÉE ===
  metadata: { 
    type: ItemMetadataSchema,
    default: undefined
  },
  
  // === EFFETS AVANCÉS ===
  effects: { 
    type: ItemEffectsSchema,
    default: undefined
  },
  
  // === CONDITIONS D'UTILISATION ===
  usageConditions: { 
    type: UsageConditionsSchema,
    default: undefined
  },
  
  // === SYSTÈME DE CRAFT ===
  craftingData: { 
    type: CraftingDataSchema,
    default: undefined
  },
  
  // === DONNÉES DE JEU ===
  gameData: { 
    type: GameDataSchema,
    default: undefined
  },
  
  // === MÉTADONNÉES SYSTÈME ===
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
    maxlength: [300, 'Source file path too long']
  }
}, {
  timestamps: true,
  collection: 'item_data',
  minimize: false
});

// ===== INDEX COMPOSITES =====

ItemDataSchema.index({ type: 1, isActive: 1 });
ItemDataSchema.index({ pocket: 1, isActive: 1 });
ItemDataSchema.index({ rarity: 1, isActive: 1 });
ItemDataSchema.index({ price: 1, isActive: 1 });
ItemDataSchema.index({ usableInBattle: 1, usableInField: 1 });
ItemDataSchema.index({ 'metadata.questItem': 1 });
ItemDataSchema.index({ 'metadata.tradeable': 1 });
ItemDataSchema.index({ 'craftingData.craftable': 1 });
ItemDataSchema.index({ category: 1, type: 1 });

// Index de recherche textuelle
ItemDataSchema.index({ 
  name: 'text', 
  description: 'text',
  tags: 'text'
});

// ===== VALIDATIONS PRE-SAVE =====

ItemDataSchema.pre('save', function(next) {
  try {
    // Validation cohérence prix
    if (this.price !== null && this.sellPrice !== null) {
      if (this.sellPrice > this.price) {
        console.warn(`Item ${this.itemId}: Sell price (${this.sellPrice}) > buy price (${this.price})`);
      }
    }
    
    // Auto-set sell price si non défini
    if (this.price !== null && this.sellPrice === null) {
      this.sellPrice = Math.floor(this.price / 2);
    }
    
    // Validation TM/HM
    if (['tm', 'hm'].includes(this.type) && !this.gameData?.moveId) {
      console.warn(`${this.type.toUpperCase()} ${this.itemId} should have moveId in gameData`);
    }
    
    // Validation fossile
    if (this.type === 'fossil' && !this.gameData?.pokemonId) {
      console.warn(`Fossil ${this.itemId} should have pokemonId in gameData`);
    }
    
    // Validation berry
    if (this.type === 'berry' && !this.gameData?.berryData) {
      console.warn(`Berry ${this.itemId} should have berryData`);
    }
    
    // Auto-pocket assignement
    if (!this.pocket) {
      const typeMapping: Record<string, ItemPocket> = {
        'ball': 'balls',
        'medicine': 'medicine',
        'key_item': 'key_items',
        'tm': 'tms_hms',
        'hm': 'tms_hms',
        'berry': 'berries',
        'battle_item': 'battle_items',
        'mail': 'mail'
      };
      this.pocket = typeMapping[this.type] || 'items';
    }
    
    // Validation crafting
    if (this.craftingData?.recipe) {
      for (const ingredient of this.craftingData.recipe) {
        if (ingredient.itemId === this.itemId) {
          return next(new Error(`Item ${this.itemId} cannot have itself as crafting ingredient`));
        }
      }
    }
    
    // Nettoyage tags
    if (this.tags) {
      this.tags = [...new Set(this.tags.filter(t => t && t.trim().length > 0))];
    }
    
    // Validation usage conditions
    if (this.usageConditions?.pokemonLevel) {
      const { min, max } = this.usageConditions.pokemonLevel;
      if (min && max && min > max) {
        return next(new Error(`Pokemon level min (${min}) cannot exceed max (${max})`));
      }
    }
    
    if (this.usageConditions?.playerLevel) {
      const { min, max } = this.usageConditions.playerLevel;
      if (min && max && min > max) {
        return next(new Error(`Player level min (${min}) cannot exceed max (${max})`));
      }
    }
    
    this.lastUpdated = new Date();
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Vérifie si l'item peut être utilisé dans un contexte donné
 */
ItemDataSchema.methods.canUseInContext = function(
  this: IItemData,
  context: 'battle' | 'field',
  conditions?: any
): boolean {
  if (!this.isActive) return false;
  
  const canUse = context === 'battle' ? this.usableInBattle : this.usableInField;
  if (!canUse) return false;
  
  // Vérifier conditions d'usage
  if (this.usageConditions && conditions) {
    // Vérifier niveau joueur
    if (this.usageConditions.playerLevel && conditions.playerLevel) {
      const { min, max } = this.usageConditions.playerLevel;
      if (min && conditions.playerLevel < min) return false;
      if (max && conditions.playerLevel > max) return false;
    }
    
    // Vérifier contexte bataille
    if (this.usageConditions.inBattle !== undefined) {
      if (this.usageConditions.inBattle !== (context === 'battle')) return false;
    }
    
    // Plus de validations selon les besoins...
  }
  
  return true;
};

/**
 * Retourne le prix effectif (achat/vente)
 */
ItemDataSchema.methods.getEffectivePrice = function(
  this: IItemData,
  type: 'buy' | 'sell'
): number | null {
  return type === 'buy' ? this.price : this.sellPrice;
};

/**
 * Vérifie si l'item est disponible pour un joueur
 */
ItemDataSchema.methods.isAvailableForPlayer = function(
  this: IItemData,
  playerLevel: number,
  playerBadges: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  if (this.metadata?.requiresLevel && playerLevel < this.metadata.requiresLevel) {
    return false;
  }
  
  if (this.metadata?.requiresBadges?.length) {
    const hasAllBadges = this.metadata.requiresBadges.every(badge => 
      playerBadges.includes(badge)
    );
    if (!hasAllBadges) return false;
  }
  
  return true;
};

/**
 * Calcule le poids de l'item
 */
ItemDataSchema.methods.calculateWeight = function(this: IItemData): number {
  if (this.metadata?.weight) return this.metadata.weight;
  
  // Poids par défaut selon le type
  const defaultWeights: Record<string, number> = {
    'ball': 1,
    'medicine': 0.5,
    'berry': 0.2,
    'key_item': 0,
    'tm': 0.3,
    'hm': 0.3
  };
  
  return defaultWeights[this.type] || 1;
};

/**
 * Convertit vers le format item standard
 */
ItemDataSchema.methods.toItemFormat = function(this: IItemData): any {
  return {
    id: this.itemId,
    type: this.type,
    pocket: this.pocket,
    price: this.price,
    sell_price: this.sellPrice,
    usable_in_battle: this.usableInBattle,
    usable_in_field: this.usableInField,
    stackable: this.stackable,
    heal_amount: this.healAmount,
    revive_amount: this.reviveAmount,
    status_cure: this.statusCure,
    effect_steps: this.effectSteps,
    
    // Données étendues
    name: this.name,
    description: this.description,
    rarity: this.rarity,
    category: this.category,
    consumable: this.consumable,
    metadata: this.metadata,
    effects: this.effects,
    usageConditions: this.usageConditions,
    craftingData: this.craftingData,
    gameData: this.gameData
  };
};

/**
 * Met à jour depuis des données JSON
 */
ItemDataSchema.methods.updateFromJson = async function(
  this: IItemData,
  jsonData: any
): Promise<void> {
  // Propriétés de base
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.pocket) this.pocket = jsonData.pocket;
  if (jsonData.price !== undefined) this.price = jsonData.price;
  if (jsonData.sell_price !== undefined) this.sellPrice = jsonData.sell_price;
  
  // Flags d'utilisation
  if (typeof jsonData.usable_in_battle === 'boolean') this.usableInBattle = jsonData.usable_in_battle;
  if (typeof jsonData.usable_in_field === 'boolean') this.usableInField = jsonData.usable_in_field;
  if (typeof jsonData.stackable === 'boolean') this.stackable = jsonData.stackable;
  
  // Effets
  if (jsonData.heal_amount !== undefined) this.healAmount = jsonData.heal_amount;
  if (jsonData.revive_amount !== undefined) this.reviveAmount = jsonData.revive_amount;
  if (jsonData.status_cure) this.statusCure = jsonData.status_cure;
  if (jsonData.effect_steps !== undefined) this.effectSteps = jsonData.effect_steps;
  
  // Données étendues
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.description) this.description = jsonData.description;
  if (jsonData.rarity) this.rarity = jsonData.rarity;
  if (jsonData.category) this.category = jsonData.category;
  if (typeof jsonData.consumable === 'boolean') this.consumable = jsonData.consumable;
  if (jsonData.tags) this.tags = jsonData.tags;
  
  // Objets complexes
  if (jsonData.metadata) this.metadata = { ...this.metadata, ...jsonData.metadata };
  if (jsonData.effects) this.effects = { ...this.effects, ...jsonData.effects };
  if (jsonData.usageConditions) this.usageConditions = { ...this.usageConditions, ...jsonData.usageConditions };
  if (jsonData.craftingData) this.craftingData = { ...this.craftingData, ...jsonData.craftingData };
  if (jsonData.gameData) this.gameData = { ...this.gameData, ...jsonData.gameData };
  
  await this.save();
};

/**
 * Valide les données de l'item
 */
ItemDataSchema.methods.validateItemData = async function(
  this: IItemData
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const result = { valid: true, errors: [] as string[], warnings: [] as string[] };
  
  try {
    // Validation logique métier
    if (this.type === 'key_item' && (this.price !== null || this.sellPrice !== null)) {
      result.warnings.push('Key items should not have prices');
    }
    
    if (this.consumable && !this.stackable) {
      result.warnings.push('Consumable items should typically be stackable');
    }
    
    if (this.healAmount && !this.usableInBattle && !this.usableInField) {
      result.errors.push('Healing items must be usable somewhere');
      result.valid = false;
    }
    
    // Validation crafting
    if (this.craftingData?.craftable && !this.craftingData.recipe?.length) {
      result.errors.push('Craftable items must have a recipe');
      result.valid = false;
    }
    
  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

/**
 * Migration vers la dernière version
 */
ItemDataSchema.methods.migrateToLatestVersion = async function(this: IItemData): Promise<void> {
  const currentVersion = this.version || '1.0.0';
  
  if (currentVersion === '1.0.0') {
    return; // Déjà à jour
  }
  
  console.log(`🔄 Migrating item ${this.itemId} to version 1.0.0`);
  
  // Futures migrations ici
  
  this.version = '1.0.0';
  await this.save();
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve les items par type
 */
ItemDataSchema.statics.findByType = function(type: ItemType): Promise<IItemData[]> {
  return this.find({ type, isActive: true }).sort({ itemId: 1 });
};

/**
 * Trouve les items par poche
 */
ItemDataSchema.statics.findByPocket = function(pocket: ItemPocket): Promise<IItemData[]> {
  return this.find({ pocket, isActive: true }).sort({ itemId: 1 });
};

/**
 * Trouve les items par rareté
 */
ItemDataSchema.statics.findByRarity = function(rarity: ItemRarity): Promise<IItemData[]> {
  return this.find({ rarity, isActive: true }).sort({ itemId: 1 });
};

/**
 * Trouve les items utilisables
 */
ItemDataSchema.statics.findUsableItems = function(context: 'battle' | 'field'): Promise<IItemData[]> {
  const query: any = { isActive: true };
  query[context === 'battle' ? 'usableInBattle' : 'usableInField'] = true;
  
  return this.find(query).sort({ pocket: 1, itemId: 1 });
};

/**
 * Trouve tous les items actifs
 */
ItemDataSchema.statics.findActiveItems = function(): Promise<IItemData[]> {
  return this.find({ isActive: true }).sort({ pocket: 1, itemId: 1 });
};

/**
 * Trouve les items par gamme de prix
 */
ItemDataSchema.statics.findByPriceRange = function(
  minPrice?: number,
  maxPrice?: number
): Promise<IItemData[]> {
  const query: any = { isActive: true, price: { $ne: null } };
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceQuery: any = {};
    if (minPrice !== undefined) priceQuery.$gte = minPrice;
    if (maxPrice !== undefined) priceQuery.$lte = maxPrice;
    query.price = { ...query.price, ...priceQuery };
  }
  
  return this.find(query).sort({ price: 1 });
};

/**
 * Trouve les items craftables
 */
ItemDataSchema.statics.findCraftableItems = function(): Promise<IItemData[]> {
  return this.find({ 
    'craftingData.craftable': true, 
    isActive: true 
  }).sort({ 'craftingData.craftingLevel': 1, itemId: 1 });
};

/**
 * Trouve par catégorie
 */
ItemDataSchema.statics.findByCategory = function(category: string): Promise<IItemData[]> {
  return this.find({ category, isActive: true }).sort({ itemId: 1 });
};

/**
 * Trouve les items de quête
 */
ItemDataSchema.statics.findQuestItems = function(): Promise<IItemData[]> {
  return this.find({ 
    'metadata.questItem': true, 
    isActive: true 
  }).sort({ itemId: 1 });
};

/**
 * Trouve les items échangeables
 */
ItemDataSchema.statics.findTradeableItems = function(): Promise<IItemData[]> {
  return this.find({ 
    'metadata.tradeable': true, 
    isActive: true 
  }).sort({ rarity: 1, itemId: 1 });
};

/**
 * Import en masse depuis JSON
 */
ItemDataSchema.statics.bulkImportFromJson = async function(
  itemsData: any
): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  
  if (typeof itemsData !== 'object') {
    results.errors.push('Invalid items data format');
    return results;
  }
  
  for (const [itemId, jsonItem] of Object.entries(itemsData)) {
    try {
      const itemData = { ...jsonItem as any, id: itemId };
      await (this as IItemDataModel).createFromJson(itemData);
      results.success++;
    } catch (error) {
      results.errors.push(`Item ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

/**
 * Crée un item depuis des données JSON
 */
ItemDataSchema.statics.createFromJson = async function(jsonItem: any): Promise<IItemData> {
  if (!jsonItem.id) {
    throw new Error('Missing required field: id');
  }
  
  // Vérifier si existe déjà
  const existing = await this.findOne({ itemId: jsonItem.id });
  if (existing) {
    await existing.updateFromJson(jsonItem);
    return existing;
  }
  
  // Créer nouveau
  const itemData = new this({
    itemId: jsonItem.id,
    name: jsonItem.name || jsonItem.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: jsonItem.description,
    type: jsonItem.type || 'item',
    pocket: jsonItem.pocket || 'items',
    price: jsonItem.price,
    sellPrice: jsonItem.sell_price,
    usableInBattle: jsonItem.usable_in_battle || false,
    usableInField: jsonItem.usable_in_field || false,
    stackable: jsonItem.stackable !== false,
    consumable: jsonItem.consumable !== false,
    healAmount: jsonItem.heal_amount,
    reviveAmount: jsonItem.revive_amount,
    statusCure: jsonItem.status_cure,
    effectSteps: jsonItem.effect_steps,
    rarity: jsonItem.rarity || 'common',
    category: jsonItem.category,
    tags: jsonItem.tags,
    metadata: jsonItem.metadata,
    effects: jsonItem.effects,
    usageConditions: jsonItem.usageConditions,
    craftingData: jsonItem.craftingData,
    gameData: jsonItem.gameData,
    sourceFile: 'items.json'
  });
  
  await itemData.save();
  return itemData;
};

/**
 * Valide l'intégrité de la base de données
 */
ItemDataSchema.statics.validateDatabaseIntegrity = async function(): Promise<{ valid: boolean; issues: string[] }> {
  const result = { valid: true, issues: [] as string[] };
  
  try {
    // Vérifier les références de crafting
    const craftableItems = await this.find({ 'craftingData.craftable': true });
    const allItemIds = new Set((await this.find({}).select('itemId')).map((i: any) => i.itemId));
    
    for (const item of craftableItems) {
      if (item.craftingData?.recipe) {
        for (const ingredient of item.craftingData.recipe) {
          if (!allItemIds.has(ingredient.itemId)) {
            result.issues.push(`Item ${item.itemId} has invalid crafting ingredient: ${ingredient.itemId}`);
            result.valid = false;
          }
        }
      }
    }
    
    // Vérifier les items sans prix avec sell_price
    const inconsistentPricing = await this.find({
      price: null,
      sellPrice: { $ne: null }
    });
    
    for (const item of inconsistentPricing) {
      result.issues.push(`Item ${item.itemId} has sell price but no buy price`);
    }
    
  } catch (error) {
    result.issues.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

/**
 * Migre tous les items vers la dernière version
 */
ItemDataSchema.statics.migrateAllToLatestVersion = async function(): Promise<{ migrated: number; errors: string[] }> {
  const result = { migrated: 0, errors: [] as string[] };
  
  try {
    const oldItems = await this.find({ version: { $ne: '1.0.0' } });
    
    console.log(`🔄 Starting migration of ${oldItems.length} items...`);
    
    for (const item of oldItems) {
      try {
        await item.migrateToLatestVersion();
        result.migrated++;
      } catch (error) {
        result.errors.push(`Item ${item.itemId}: ${error instanceof Error ? error.message : 'Migration failed'}`);
      }
    }
    
    console.log(`✅ Migration completed: ${result.migrated} items migrated`);
    
  } catch (error) {
    result.errors.push(`Global migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
};

// ===== EXPORT =====
export const ItemData = mongoose.model<IItemData, IItemDataModel>('ItemData', ItemDataSchema);

export type ItemDataDocument = IItemData;
export type CreateItemData = Partial<Pick<IItemData, 
  'itemId' | 'name' | 'type' | 'pocket' | 'price' | 'metadata'
>>;

// ===== UTILITAIRE DE MIGRATION =====

/**
 * Fonction utilitaire pour migrer les items depuis le JSON
 */
export async function migrateItemsFromJson(jsonFilePath?: string): Promise<void> {
  console.log('🚀 Starting items migration from JSON...');
  
  try {
    // Lire le fichier JSON (tu peux adapter selon ton setup)
    const itemsJson = jsonFilePath 
      ? require(jsonFilePath)
      : require('../data/items.json'); // Chemin par défaut
    
    console.log(`📁 Found ${Object.keys(itemsJson).length} items in JSON`);
    
    // Import en masse
    const results = await ItemData.bulkImportFromJson(itemsJson);
    
    console.log(`✅ Migration completed:`);
    console.log(`  - Successfully imported: ${results.success} items`);
    console.log(`  - Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.error('❌ Import errors:', results.errors);
    }
    
    // Validation finale
    const integrity = await ItemData.validateDatabaseIntegrity();
    if (!integrity.valid) {
      console.warn('⚠️ Database integrity issues found:', integrity.issues);
    }
    
    console.log('🎉 Items migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

console.log(`📦 ItemData schema loaded:
- Item types: ${ITEM_TYPES.length}
- Pockets: ${ITEM_POCKETS.length}  
- Rarities: ${ITEM_RARITIES.length}
✅ Ready for JSON migration`);
