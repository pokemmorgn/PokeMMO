// server/src/models/ItemData.ts - MODÈLE MONGODB POUR LES ITEMS
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== TYPES ET ENUMS =====

export type ItemType = 
  | 'ball' 
  | 'medicine' 
  | 'item' 
  | 'key_item' 
  | 'tm' 
  | 'hm' 
  | 'berry' 
  | 'fossil' 
  | 'evolution' 
  | 'held_item' 
  | 'battle_item';

export type ItemPocket = 
  | 'balls' 
  | 'medicine' 
  | 'items' 
  | 'key_items' 
  | 'tms_hms' 
  | 'berries';

export type StatusEffect = 
  | 'poison' 
  | 'paralysis' 
  | 'sleep' 
  | 'burn' 
  | 'freeze' 
  | 'confusion' 
  | 'all';

export type ItemRarity = 
  | 'common' 
  | 'uncommon' 
  | 'rare' 
  | 'epic' 
  | 'legendary' 
  | 'mythic';

// ===== INTERFACES =====

export interface IItemData extends Document {
  // === IDENTIFICATION ===
  itemId: string;                    // ID unique de l'item (ex: "poke_ball")
  name: string;                      // Nom affiché de l'item
  description?: string;              // Description de l'item
  type: ItemType;                    // Type d'item
  pocket: ItemPocket;                // Poche du sac
  
  // === ÉCONOMIE ===
  price: number | null;              // Prix d'achat (null = non achetable)
  sellPrice: number | null;          // Prix de vente (null = non vendable)
  
  // === UTILISATION ===
  usableInBattle: boolean;           // Utilisable en combat
  usableInField: boolean;            // Utilisable sur le terrain
  stackable: boolean;                // Empilable dans l'inventaire
  consumable?: boolean;              // Se consomme à l'usage
  
  // === EFFETS SPÉCIFIQUES ===
  // Soins
  healAmount?: number | 'full';      // Quantité de soins (ou "full")
  reviveAmount?: number;             // Pourcentage de revival (0.5 = 50%)
  statusCure?: StatusEffect[];       // Statuts soignés
  
  // Repel/Protection
  effectSteps?: number;              // Nombre de pas d'effet (repel)
  
  // Combat
  battleEffect?: {
    type: 'stat_boost' | 'accuracy' | 'critical' | 'priority' | 'damage';
    target: 'self' | 'enemy' | 'all';
    value: number;
    duration?: number;               // Durées en tours
  };
  
  // === MÉTADONNÉES ===
  rarity?: ItemRarity;               // Rareté de l'item
  sprite?: string;                   // Nom du sprite/icône
  category?: string;                 // Catégorie libre
  tags?: string[];                   // Tags pour recherche
  
  // === OBTENTION ===
  obtainMethods?: Array<{
    method: 'shop' | 'find' | 'gift' | 'craft' | 'event' | 'battle';
    location?: string;
    chance?: number;                 // Pourcentage de chance
    conditions?: string[];           // Conditions spéciales
  }>;
  
  // === SYSTÈME ===
  isActive: boolean;                 // Item actif
  version: string;                   // Version des données
  lastUpdated: Date;
  sourceFile?: string;               // Fichier source original
  
  // === MÉTHODES D'INSTANCE ===
  canBeBought(): boolean;
  canBeSold(): boolean;
  isConsumable(): boolean;
  getEffectivePrice(shopModifier?: number): number | null;
  toItemFormat(): any;
  updateFromJson(jsonData: any): Promise<void>;
}

// Interface pour les méthodes statiques
export interface IItemDataModel extends Model<IItemData> {
  findByType(type: ItemType): Promise<IItemData[]>;
  findByPocket(pocket: ItemPocket): Promise<IItemData[]>;
  findBuyableItems(): Promise<IItemData[]>;
  findSellableItems(): Promise<IItemData[]>;
  findByRarity(rarity: ItemRarity): Promise<IItemData[]>;
  findActiveItems(): Promise<IItemData[]>;
  bulkImportFromJson(itemsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonItem: any): Promise<IItemData>;
  searchItems(query: string): Promise<IItemData[]>;
  validateDatabaseIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
}

// ===== CONSTANTES DE VALIDATION =====

const ITEM_TYPES = [
  'ball', 'medicine', 'item', 'key_item', 'tm', 'hm', 
  'berry', 'fossil', 'evolution', 'held_item', 'battle_item'
] as const;

const ITEM_POCKETS = [
  'balls', 'medicine', 'items', 'key_items', 'tms_hms', 'berries'
] as const;

const STATUS_EFFECTS = [
  'poison', 'paralysis', 'sleep', 'burn', 'freeze', 'confusion', 'all'
] as const;

const ITEM_RARITIES = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
] as const;

// ===== SCHÉMAS =====

// Schéma pour les effets de combat
const BattleEffectSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['stat_boost', 'accuracy', 'critical', 'priority', 'damage']
  },
  target: {
    type: String,
    required: true,
    enum: ['self', 'enemy', 'all']
  },
  value: {
    type: Number,
    required: true,
    min: [-10, 'Battle effect value too low'],
    max: [10, 'Battle effect value too high']
  },
  duration: {
    type: Number,
    min: [1, 'Duration must be positive'],
    max: [50, 'Duration too long']
  }
}, { _id: false });

// Schéma pour les méthodes d'obtention
const ObtainMethodSchema = new Schema({
  method: {
    type: String,
    required: true,
    enum: {
      values: ['shop', 'find', 'gift', 'craft', 'event', 'battle'],
      message: 'Invalid obtain method: {VALUE}'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location name too long']
  },
  chance: {
    type: Number,
    min: [0, 'Chance cannot be negative'],
    max: [100, 'Chance cannot exceed 100%']
  },
  conditions: [{
    type: String,
    trim: true,
    maxlength: [200, 'Condition too long']
  }]
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
    match: [/^[a-z0-9_]+$/, 'Item ID must contain only lowercase letters, numbers and underscores'],
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
    maxlength: [1000, 'Description too long']
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ITEM_TYPES,
      message: 'Invalid item type: {VALUE}. Allowed: ' + ITEM_TYPES.join(', ')
    },
    index: true
  },
  pocket: {
    type: String,
    required: true,
    enum: {
      values: ITEM_POCKETS,
      message: 'Invalid pocket: {VALUE}. Allowed: ' + ITEM_POCKETS.join(', ')
    },
    index: true
  },
  
  // === ÉCONOMIE ===
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    max: [999999999, 'Price too high'],
    index: true
  },
  sellPrice: {
    type: Number,
    min: [0, 'Sell price cannot be negative'],
    max: [999999999, 'Sell price too high'],
    index: true
  },
  
  // === UTILISATION ===
  usableInBattle: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  usableInField: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  stackable: {
    type: Boolean,
    required: true,
    default: true
  },
  consumable: {
    type: Boolean,
    default: true
  },
  
  // === EFFETS SPÉCIFIQUES ===
  healAmount: {
    type: Schema.Types.Mixed, // Number ou "full"
    validate: {
      validator: function(v: any) {
        return v === undefined || v === 'full' || (typeof v === 'number' && v > 0);
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
      values: STATUS_EFFECTS,
      message: 'Invalid status effect: {VALUE}'
    }
  }],
  effectSteps: {
    type: Number,
    min: [1, 'Effect steps must be positive'],
    max: [10000, 'Effect steps too high']
  },
  battleEffect: {
    type: BattleEffectSchema,
    default: undefined
  },
  
  // === MÉTADONNÉES ===
  rarity: {
    type: String,
    enum: {
      values: ITEM_RARITIES,
      message: 'Invalid rarity: {VALUE}'
    },
    default: 'common',
    index: true
  },
  sprite: {
    type: String,
    trim: true,
    maxlength: [100, 'Sprite name too long']
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
  
  // === OBTENTION ===
  obtainMethods: {
    type: [ObtainMethodSchema],
    default: []
  },
  
  // === SYSTÈME ===
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
    // Validation des prix
    if (this.price !== null && this.sellPrice !== null) {
      if (this.sellPrice > this.price) {
        console.warn(`Item ${this.itemId}: Sell price (${this.sellPrice}) > buy price (${this.price})`);
      }
    }
    
    // Validation type vs pocket
    const typeToPacketMap: { [key in ItemType]: ItemPocket[] } = {
      'ball': ['balls'],
      'medicine': ['medicine'],
      'item': ['items'],
      'key_item': ['key_items'],
      'tm': ['tms_hms'],
      'hm': ['tms_hms'],
      'berry': ['berries'],
      'fossil': ['key_items', 'items'],
      'evolution': ['items'],
      'held_item': ['items'],
      'battle_item': ['items']
    };
    
    const validPockets = typeToPacketMap[this.type];
    if (validPockets && !validPockets.includes(this.pocket)) {
      return next(new Error(`Item type "${this.type}" not compatible with pocket "${this.pocket}". Valid pockets: ${validPockets.join(', ')}`));
    }
    
    // Validation effets spécifiques
    if (this.healAmount && this.type !== 'medicine') {
      console.warn(`Item ${this.itemId}: healAmount set but type is not 'medicine'`);
    }
    
    if (this.effectSteps && !this.itemId.includes('repel')) {
      console.warn(`Item ${this.itemId}: effectSteps set but not a repel item`);
    }
    
    // Nettoyage des données
    if (this.tags) {
      this.tags = [...new Set(this.tags.filter(t => t && t.trim().length > 0))];
    }
    
    // Auto-set sprite basé sur itemId si pas défini
    if (!this.sprite) {
      this.sprite = this.itemId;
    }
    
    // Auto-set consumable basé sur le type
    if (this.consumable === undefined) {
      this.consumable = ['medicine', 'berry', 'battle_item'].includes(this.type);
    }
    
    this.lastUpdated = new Date();
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Vérifie si l'item peut être acheté
 */
ItemDataSchema.methods.canBeBought = function(this: IItemData): boolean {
  return this.price !== null && this.price > 0;
};

/**
 * Vérifie si l'item peut être vendu
 */
ItemDataSchema.methods.canBeSold = function(this: IItemData): boolean {
  return this.sellPrice !== null && this.sellPrice > 0;
};

/**
 * Vérifie si l'item est consommable
 */
ItemDataSchema.methods.isConsumable = function(this: IItemData): boolean {
  return this.consumable !== false && this.type !== 'key_item';
};

/**
 * Calcule le prix effectif avec modificateur de boutique
 */
ItemDataSchema.methods.getEffectivePrice = function(
  this: IItemData,
  shopModifier: number = 1
): number | null {
  if (!this.canBeBought()) return null;
  return Math.floor(this.price! * shopModifier);
};

/**
 * Convertit au format d'item standard
 */
ItemDataSchema.methods.toItemFormat = function(this: IItemData): any {
  return {
    id: this.itemId,
    name: this.name,
    description: this.description,
    type: this.type,
    pocket: this.pocket,
    price: this.price,
    sell_price: this.sellPrice, // Garde le format snake_case pour compatibilité
    usable_in_battle: this.usableInBattle,
    usable_in_field: this.usableInField,
    stackable: this.stackable,
    consumable: this.consumable,
    heal_amount: this.healAmount,
    revive_amount: this.reviveAmount,
    status_cure: this.statusCure,
    effect_steps: this.effectSteps,
    battle_effect: this.battleEffect,
    rarity: this.rarity,
    sprite: this.sprite,
    category: this.category,
    tags: this.tags,
    obtain_methods: this.obtainMethods
  };
};

/**
 * Met à jour les données depuis un objet JSON
 */
ItemDataSchema.methods.updateFromJson = async function(
  this: IItemData,
  jsonData: any
): Promise<void> {
  // Propriétés de base
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.description) this.description = jsonData.description;
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.pocket) this.pocket = jsonData.pocket;
  
  // Économie
  if (jsonData.price !== undefined) this.price = jsonData.price;
  if (jsonData.sell_price !== undefined) this.sellPrice = jsonData.sell_price;
  if (jsonData.sellPrice !== undefined) this.sellPrice = jsonData.sellPrice;
  
  // Utilisation
  if (typeof jsonData.stackable === 'boolean') this.stackable = jsonData.stackable;
  if (typeof jsonData.usable_in_battle === 'boolean') this.usableInBattle = jsonData.usable_in_battle;
  if (typeof jsonData.usableInBattle === 'boolean') this.usableInBattle = jsonData.usableInBattle;
  if (typeof jsonData.usable_in_field === 'boolean') this.usableInField = jsonData.usable_in_field;
  if (typeof jsonData.usableInField === 'boolean') this.usableInField = jsonData.usableInField;
  if (typeof jsonData.consumable === 'boolean') this.consumable = jsonData.consumable;
  
  // Effets spécifiques
  if (jsonData.heal_amount !== undefined) this.healAmount = jsonData.heal_amount;
  if (jsonData.healAmount !== undefined) this.healAmount = jsonData.healAmount;
  if (jsonData.revive_amount !== undefined) this.reviveAmount = jsonData.revive_amount;
  if (jsonData.reviveAmount !== undefined) this.reviveAmount = jsonData.reviveAmount;
  if (jsonData.status_cure) this.statusCure = jsonData.status_cure;
  if (jsonData.statusCure) this.statusCure = jsonData.statusCure;
  if (jsonData.effect_steps !== undefined) this.effectSteps = jsonData.effect_steps;
  if (jsonData.effectSteps !== undefined) this.effectSteps = jsonData.effectSteps;
  if (jsonData.battle_effect) this.battleEffect = jsonData.battle_effect;
  if (jsonData.battleEffect) this.battleEffect = jsonData.battleEffect;
  
  // Métadonnées
  if (jsonData.rarity) this.rarity = jsonData.rarity;
  if (jsonData.sprite) this.sprite = jsonData.sprite;
  if (jsonData.category) this.category = jsonData.category;
  if (jsonData.tags) this.tags = jsonData.tags;
  if (jsonData.obtain_methods) this.obtainMethods = jsonData.obtain_methods;
  if (jsonData.obtainMethods) this.obtainMethods = jsonData.obtainMethods;
  
  await this.save();
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve les items par type
 */
ItemDataSchema.statics.findByType = function(type: ItemType): Promise<IItemData[]> {
  return this.find({ type, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les items par poche
 */
ItemDataSchema.statics.findByPocket = function(pocket: ItemPocket): Promise<IItemData[]> {
  return this.find({ pocket, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les items achetables
 */
ItemDataSchema.statics.findBuyableItems = function(): Promise<IItemData[]> {
  return this.find({ 
    price: { $ne: null, $gt: 0 }, 
    isActive: true 
  }).sort({ price: 1, name: 1 });
};

/**
 * Trouve les items vendables
 */
ItemDataSchema.statics.findSellableItems = function(): Promise<IItemData[]> {
  return this.find({ 
    sellPrice: { $ne: null, $gt: 0 }, 
    isActive: true 
  }).sort({ sellPrice: -1, name: 1 });
};

/**
 * Trouve les items par rareté
 */
ItemDataSchema.statics.findByRarity = function(rarity: ItemRarity): Promise<IItemData[]> {
  return this.find({ rarity, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve tous les items actifs
 */
ItemDataSchema.statics.findActiveItems = function(): Promise<IItemData[]> {
  return this.find({ isActive: true }).sort({ type: 1, name: 1 });
};

/**
 * Recherche d'items par nom/description
 */
ItemDataSchema.statics.searchItems = function(query: string): Promise<IItemData[]> {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

/**
 * Import en masse depuis JSON
 */
ItemDataSchema.statics.bulkImportFromJson = async function(
  itemsData: any
): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  
  // Support pour différents formats
  const items = itemsData.items || itemsData || {};
  
  if (typeof items !== 'object') {
    results.errors.push('Invalid items data format');
    return results;
  }
  
  for (const [itemId, itemData] of Object.entries(items)) {
    try {
      await (this as IItemDataModel).createFromJson({ 
        id: itemId, 
        ...itemData as any 
      });
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
ItemDataSchema.statics.createFromJson = async function(
  jsonItem: any
): Promise<IItemData> {
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
    sellPrice: jsonItem.sell_price || jsonItem.sellPrice,
    usableInBattle: jsonItem.usable_in_battle ?? jsonItem.usableInBattle ?? false,
    usableInField: jsonItem.usable_in_field ?? jsonItem.usableInField ?? false,
    stackable: jsonItem.stackable ?? true,
    consumable: jsonItem.consumable,
    healAmount: jsonItem.heal_amount || jsonItem.healAmount,
    reviveAmount: jsonItem.revive_amount || jsonItem.reviveAmount,
    statusCure: jsonItem.status_cure || jsonItem.statusCure,
    effectSteps: jsonItem.effect_steps || jsonItem.effectSteps,
    battleEffect: jsonItem.battle_effect || jsonItem.battleEffect,
    rarity: jsonItem.rarity || 'common',
    sprite: jsonItem.sprite,
    category: jsonItem.category,
    tags: jsonItem.tags,
    obtainMethods: jsonItem.obtain_methods || jsonItem.obtainMethods || [],
    sourceFile: jsonItem.sourceFile || 'imported'
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
    // Vérifier les doublons
    const duplicates = await this.aggregate([
      { $group: { _id: '$itemId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    for (const dup of duplicates) {
      result.issues.push(`Duplicate item ID: ${dup._id}`);
      result.valid = false;
    }
    
    // Vérifier les prix incohérents
    const badPrices = await this.find({
      $and: [
        { price: { $ne: null } },
        { sellPrice: { $ne: null } },
        { $expr: { $gt: ['$sellPrice', '$price'] } }
      ]
    }).select('itemId price sellPrice');
    
    for (const item of badPrices) {
      result.issues.push(`Item ${item.itemId}: sell price (${item.sellPrice}) > buy price (${item.price})`);
    }
    
    // Vérifier les types invalides
    const invalidTypes = await this.find({
      type: { $nin: ITEM_TYPES }
    }).select('itemId type');
    
    for (const item of invalidTypes) {
      result.issues.push(`Item ${item.itemId}: invalid type "${item.type}"`);
      result.valid = false;
    }
    
  } catch (error) {
    result.issues.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

// ===== EXPORT =====
export const ItemData = mongoose.model<IItemData, IItemDataModel>('ItemData', ItemDataSchema);

export type ItemDataDocument = IItemData;
export type CreateItemData = Partial<Pick<IItemData, 
  'itemId' | 'name' | 'type' | 'pocket' | 'price' | 'sellPrice'
>>;

// Log de chargement
console.log(`📦 ItemData schema loaded:
- Item types: ${ITEM_TYPES.length} (${ITEM_TYPES.slice(0, 4).join(', ')}, ...)
- Pockets: ${ITEM_POCKETS.length} (${ITEM_POCKETS.join(', ')})  
- Rarities: ${ITEM_RARITIES.length} (${ITEM_RARITIES.join(', ')})
✅ Ready for item data migration from JSON`);
