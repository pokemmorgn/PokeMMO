// server/src/models/ShopData.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ===== TYPES POUR L'UNIVERS POKÉMON =====
export type ShopType = 
  | 'pokemart'        // Poké Mart officiel
  | 'department'      // Grand magasin
  | 'specialist'      // Spécialisé (pêche, baies, etc.)
  | 'gym_shop'        // Boutique d'arène
  | 'contest_shop'    // Boutique de concours
  | 'game_corner'     // Casino/jeux
  | 'black_market'    // Marché noir
  | 'trainer_shop'    // Boutique de dresseur
  | 'temporary'       // Événementiel
  | 'vending_machine' // Distributeur automatique
  | 'online_shop';    // Boutique en ligne

export type ShopCategory = 
  | 'pokeballs' | 'medicine' | 'berries' | 'tms_hms' 
  | 'battle_items' | 'held_items' | 'key_items'
  | 'decorations' | 'clothes' | 'accessories'
  | 'contest_items' | 'rare_items';

export type Currency = 'gold' | 'battle_points' | 'contest_points' | 'game_tokens' | 'rare_candy';

// ===== INTERFACES =====

export interface IShopItem {
  itemId: string;
  category: ShopCategory;
  basePrice?: number;          // Prix de base (override le prix global de l'item)
  stock: number;               // -1 = illimité
  maxStock?: number;           // Stock maximum lors du restock
  
  // Conditions d'accès
  unlockLevel?: number;
  requiredBadges?: string[];   // Badges requis
  requiredQuests?: string[];   // Quêtes requises
  requiredFlags?: string[];    // Flags joueur requis
  
  // Pricing spécial
  discountPercent?: number;    // Réduction en %
  memberPrice?: number;        // Prix pour les membres VIP
  bulkDiscount?: {             // Réduction en gros
    minQuantity: number;
    discountPercent: number;
  };
  
  // Métadonnées
  featured?: boolean;          // Objet mis en avant
  limitedTime?: Date;          // Date d'expiration
  description?: string;        // Description spéciale
}

export interface IShopData extends Document {
  // === IDENTIFICATION ===
  shopId: string;              // ID unique du shop
  name: string;                // Nom affiché
  type: ShopType;              // Type de boutique
  region?: string;             // Région (Kanto, Johto, etc.)
  location: {                  // Localisation
    zone: string;              // Zone/carte
    city?: string;             // Ville
    building?: string;         // Bâtiment spécifique
  };
  
  // === CONFIGURATION COMMERCE ===
  currency: Currency;          // Devise acceptée
  buyMultiplier: number;       // Multiplicateur prix d'achat (défaut 1.0)
  sellMultiplier: number;      // Multiplicateur prix de vente (défaut 0.5)
  taxRate?: number;            // Taxe régionale (%)
  
  // === INVENTAIRE ===
  items: IShopItem[];          // Articles en vente
  categories: ShopCategory[];  // Catégories vendues
  
  // === SYSTÈME DE STOCK ===
  restockInfo?: {
    interval: number;          // Intervalles de restock (minutes)
    lastRestock: Date;         // Dernier restock
    autoRestock: boolean;      // Restock automatique
    stockVariation: number;    // Variation du stock (%)
  };
  
  // === CONDITIONS D'ACCÈS ===
  accessRequirements?: {
    minLevel?: number;         // Niveau minimum
    requiredBadges?: string[]; // Badges requis
    requiredQuests?: string[]; // Quêtes requises
    membershipRequired?: string; // Type de membership
    timeRestrictions?: {       // Horaires d'ouverture
      openHour: number;        // Heure d'ouverture (0-23)
      closeHour: number;       // Heure de fermeture (0-23)
      closedDays?: number[];   // Jours fermés (0=dimanche)
    };
  };
  
  // === EXPÉRIENCE BOUTIQUE ===
  shopKeeper?: {
    npcId?: number;            // ID du NPC marchand (optionnel)
    name: string;              // Nom du marchand
    personality: string;       // Personnalité (friendly, stern, etc.)
    specialization?: string;   // Spécialisation
  };
  
  dialogues?: {
    welcome: string[];         // Messages d'accueil
    purchase: string[];        // Messages d'achat
    sale: string[];           // Messages de vente
    notEnoughMoney: string[]; // Pas assez d'argent
    comeBackLater: string[];  // À bientôt
    closed: string[];         // Boutique fermée
    restricted: string[];     // Accès refusé
  };
  
  // === ÉVÉNEMENTS ET PROMOTIONS ===
  events?: {
    eventId: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    discountPercent?: number;
    specialItems?: IShopItem[];
    active: boolean;
  }[];
  
  // === SYSTÈME DE FIDÉLITÉ ===
  loyaltyProgram?: {
    enabled: boolean;
    pointsPerGold: number;     // Points par or dépensé
    membershipTiers: {
      name: string;
      requiredPoints: number;
      discountPercent: number;
      specialAccess?: string[];
    }[];
  };
  
  // === MÉTADONNÉES ===
  isActive: boolean;           // Boutique active
  isTemporary: boolean;        // Boutique temporaire
  version: string;             // Version des données
  lastUpdated: Date;
  
  // Données de migration
  sourceFile?: string;         // Fichier JSON source
  migratedFrom?: 'json' | 'legacy';
  
  // === MÉTHODES D'INSTANCE ===
  toShopFormat(): any;
  updateFromJson(jsonData: any): Promise<void>;
  isAccessibleToPlayer(playerLevel: number, playerBadges: string[], playerFlags: string[]): boolean;
  getItemPrice(itemId: string, playerMembership?: string): number;
  canPlayerBuy(itemId: string, quantity: number, playerLevel: number, playerBadges: string[]): boolean;
  restockShop(): Promise<void>;
}

// Interface pour les méthodes statiques
export interface IShopDataModel extends Model<IShopData> {
  findByZone(zone: string): Promise<IShopData[]>;
  findByType(type: ShopType): Promise<IShopData[]>;
  findByRegion(region: string): Promise<IShopData[]>;
  findActiveShops(): Promise<IShopData[]>;
  findShopsSellingItem(itemId: string): Promise<IShopData[]>;
  bulkImportFromJson(shopData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonShop: any): Promise<IShopData>;
}

// ===== SCHÉMAS =====

const ShopItemSchema = new Schema<IShopItem>({
  itemId: { 
    type: String, 
    required: true,
    trim: true,
    index: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'pokeballs', 'medicine', 'berries', 'tms_hms', 
      'battle_items', 'held_items', 'key_items',
      'decorations', 'clothes', 'accessories',
      'contest_items', 'rare_items'
    ]
  },
  basePrice: { 
    type: Number, 
    min: [0, 'Price cannot be negative']
  },
  stock: { 
    type: Number, 
    required: true,
    min: [-1, 'Stock cannot be less than -1'] 
  },
  maxStock: { 
    type: Number,
    min: [1, 'Max stock must be positive']
  },
  
  // Conditions d'accès
  unlockLevel: { 
    type: Number,
    min: [1, 'Level must be positive'],
    max: [100, 'Level too high']
  },
  requiredBadges: [{ type: String, trim: true }],
  requiredQuests: [{ type: String, trim: true }],
  requiredFlags: [{ type: String, trim: true }],
  
  // Pricing spécial
  discountPercent: { 
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  memberPrice: { 
    type: Number,
    min: [0, 'Member price cannot be negative']
  },
  bulkDiscount: {
    minQuantity: { type: Number, min: 1 },
    discountPercent: { type: Number, min: 0, max: 100 }
  },
  
  // Métadonnées
  featured: { type: Boolean, default: false },
  limitedTime: { type: Date },
  description: { type: String, trim: true, maxlength: 500 }
}, { _id: false });

const LocationSchema = new Schema({
  zone: { type: String, required: true, trim: true, index: true },
  city: { type: String, trim: true },
  building: { type: String, trim: true }
}, { _id: false });

const RestockInfoSchema = new Schema({
  interval: { type: Number, min: 0 },
  lastRestock: { type: Date, default: Date.now },
  autoRestock: { type: Boolean, default: true },
  stockVariation: { type: Number, min: 0, max: 100, default: 10 }
}, { _id: false });

const AccessRequirementsSchema = new Schema({
  minLevel: { type: Number, min: 1, max: 100 },
  requiredBadges: [{ type: String, trim: true }],
  requiredQuests: [{ type: String, trim: true }],
  membershipRequired: { type: String, trim: true },
  timeRestrictions: {
    openHour: { type: Number, min: 0, max: 23 },
    closeHour: { type: Number, min: 0, max: 23 },
    closedDays: [{ type: Number, min: 0, max: 6 }]
  }
}, { _id: false });

const ShopKeeperSchema = new Schema({
  npcId: { type: Number },
  name: { type: String, required: true, trim: true },
  personality: { 
    type: String, 
    enum: ['friendly', 'stern', 'cheerful', 'mysterious', 'grumpy', 'professional'],
    default: 'friendly'
  },
  specialization: { type: String, trim: true }
}, { _id: false });

const DialoguesSchema = new Schema({
  welcome: [{ type: String, trim: true }],
  purchase: [{ type: String, trim: true }],
  sale: [{ type: String, trim: true }],
  notEnoughMoney: [{ type: String, trim: true }],
  comeBackLater: [{ type: String, trim: true }],
  closed: [{ type: String, trim: true }],
  restricted: [{ type: String, trim: true }]
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const ShopDataSchema = new Schema<IShopData>({
  // === IDENTIFICATION ===
  shopId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Shop name too long']
  },
  type: { 
    type: String, 
    required: true,
    enum: [
      'pokemart', 'department', 'specialist', 'gym_shop', 
      'contest_shop', 'game_corner', 'black_market', 
      'trainer_shop', 'temporary', 'vending_machine', 'online_shop'
    ],
    index: true
  },
  region: { 
    type: String, 
    trim: true,
    index: true
  },
  location: { 
    type: LocationSchema, 
    required: true 
  },
  
  // === CONFIGURATION COMMERCE ===
  currency: { 
    type: String,
    enum: ['gold', 'battle_points', 'contest_points', 'game_tokens', 'rare_candy'],
    default: 'gold',
    index: true
  },
  buyMultiplier: { 
    type: Number, 
    default: 1.0,
    min: [0.1, 'Buy multiplier too low'],
    max: [10.0, 'Buy multiplier too high']
  },
  sellMultiplier: { 
    type: Number, 
    default: 0.5,
    min: [0.1, 'Sell multiplier too low'],
    max: [1.0, 'Sell multiplier too high']
  },
  taxRate: { 
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [50, 'Tax rate too high'],
    default: 0
  },
  
  // === INVENTAIRE ===
  items: { 
    type: [ShopItemSchema], 
    required: true,
    validate: {
      validator: function(items: IShopItem[]) {
        return items.length > 0;
      },
      message: 'Shop must have at least one item'
    }
  },
  categories: [{ 
    type: String,
    enum: [
      'pokeballs', 'medicine', 'berries', 'tms_hms', 
      'battle_items', 'held_items', 'key_items',
      'decorations', 'clothes', 'accessories',
      'contest_items', 'rare_items'
    ]
  }],
  
  // === SYSTÈME DE STOCK ===
  restockInfo: { 
    type: RestockInfoSchema 
  },
  
  // === CONDITIONS D'ACCÈS ===
  accessRequirements: { 
    type: AccessRequirementsSchema 
  },
  
  // === EXPÉRIENCE BOUTIQUE ===
  shopKeeper: { 
    type: ShopKeeperSchema 
  },
  dialogues: { 
    type: DialoguesSchema 
  },
  
  // === ÉVÉNEMENTS (Schema flexible pour futurs développements) ===
  events: [{ 
    type: Schema.Types.Mixed 
  }],
  
  // === SYSTÈME DE FIDÉLITÉ (Schema flexible) ===
  loyaltyProgram: { 
    type: Schema.Types.Mixed 
  },
  
  // === MÉTADONNÉES ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  isTemporary: { 
    type: Boolean, 
    default: false,
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
  
  // Données de migration
  sourceFile: { 
    type: String,
    trim: true
  },
  migratedFrom: {
    type: String,
    enum: ['json', 'legacy']
  }
}, {
  timestamps: true,
  collection: 'shop_data',
  minimize: false
});

// ===== INDEX COMPOSITES =====

// Index principaux
ShopDataSchema.index({ 'location.zone': 1, isActive: 1 });
ShopDataSchema.index({ type: 1, isActive: 1 });
ShopDataSchema.index({ region: 1, type: 1 });
ShopDataSchema.index({ currency: 1 });

// Index pour recherche d'items
ShopDataSchema.index({ 'items.itemId': 1, isActive: 1 });
ShopDataSchema.index({ categories: 1 });

// Index pour événements temporaires
ShopDataSchema.index({ isTemporary: 1, 'events.active': 1 });

// ===== VALIDATIONS PRE-SAVE =====

ShopDataSchema.pre('save', function(next) {
  // Auto-générer les catégories depuis les items
  const categoriesFromItems = [...new Set(this.items.map(item => item.category))];
  this.categories = categoriesFromItems;
  
  // Validation des horaires d'ouverture
  const timeRestrictions = this.accessRequirements?.timeRestrictions;
  if (timeRestrictions) {
    if (timeRestrictions.openHour >= timeRestrictions.closeHour) {
      return next(new Error('Opening hour must be before closing hour'));
    }
  }
  
  // Validation de cohérence des prix
  if (this.buyMultiplier <= this.sellMultiplier) {
    console.warn(`Warning: Buy multiplier (${this.buyMultiplier}) should be higher than sell multiplier (${this.sellMultiplier})`);
  }
  
  // Mise à jour timestamp
  this.lastUpdated = new Date();
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Convertit vers le format attendu par ShopManager
 */
ShopDataSchema.methods.toShopFormat = function(this: IShopData): any {
  return {
    id: this.shopId,
    name: this.name,
    type: this.type,
    description: `${this.shopKeeper?.name ? `Tenu par ${this.shopKeeper.name}. ` : ''}${this.location.city ? `Situé à ${this.location.city}. ` : ''}`,
    items: this.items.map(item => ({
      itemId: item.itemId,
      customPrice: item.basePrice,
      stock: item.stock,
      unlockLevel: item.unlockLevel,
      unlockQuest: item.requiredQuests?.[0]
    })),
    buyMultiplier: this.buyMultiplier,
    sellMultiplier: this.sellMultiplier,
    currency: this.currency,
    restockInterval: this.restockInfo?.interval || 0,
    lastRestock: this.restockInfo?.lastRestock?.getTime(),
    isTemporary: this.isTemporary
  };
};

/**
 * Met à jour depuis JSON legacy
 */
ShopDataSchema.methods.updateFromJson = async function(
  this: IShopData,
  jsonData: any
): Promise<void> {
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.type) this.type = jsonData.type;
  if (jsonData.buyMultiplier) this.buyMultiplier = jsonData.buyMultiplier;
  if (jsonData.sellMultiplier) this.sellMultiplier = jsonData.sellMultiplier;
  if (jsonData.currency) this.currency = jsonData.currency;
  
  // Conversion des items
  if (jsonData.items) {
    this.items = jsonData.items.map((item: any) => ({
      itemId: item.itemId,
      category: this.categorizeItem(item.itemId),
      basePrice: item.customPrice,
      stock: item.stock ?? -1,
      unlockLevel: item.unlockLevel,
      requiredQuests: item.unlockQuest ? [item.unlockQuest] : undefined
    }));
  }
  
  // Configuration restock
  if (jsonData.restockInterval) {
    this.restockInfo = {
      interval: jsonData.restockInterval,
      lastRestock: new Date(jsonData.lastRestock || Date.now()),
      autoRestock: true,
      stockVariation: 10
    };
  }
  
  this.migratedFrom = 'json';
  await this.save();
};

/**
 * Vérifier l'accès joueur
 */
ShopDataSchema.methods.isAccessibleToPlayer = function(
  this: IShopData,
  playerLevel: number,
  playerBadges: string[] = [],
  playerFlags: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  const req = this.accessRequirements;
  if (!req) return true;
  
  // Vérifications niveau et badges
  if (req.minLevel && playerLevel < req.minLevel) return false;
  if (req.requiredBadges?.length) {
    const hasAllBadges = req.requiredBadges.every(badge => playerBadges.includes(badge));
    if (!hasAllBadges) return false;
  }
  
  // TODO: Vérifications horaires, quêtes, etc.
  
  return true;
};

/**
 * Catégoriser automatiquement un item
 */
ShopDataSchema.methods.categorizeItem = function(itemId: string): ShopCategory {
  if (itemId.includes('ball')) return 'pokeballs';
  if (itemId.includes('potion') || itemId.includes('heal') || itemId.includes('revive')) return 'medicine';
  if (itemId.includes('berry')) return 'berries';
  if (itemId.includes('tm') || itemId.includes('hm')) return 'tms_hms';
  if (itemId.includes('x_') || itemId.includes('guard_spec')) return 'battle_items';
  return 'rare_items';
};

// ===== MÉTHODES STATIQUES =====

ShopDataSchema.statics.findByZone = function(zone: string): Promise<IShopData[]> {
  return this.find({ 'location.zone': zone, isActive: true }).sort({ shopId: 1 });
};

ShopDataSchema.statics.findByType = function(type: ShopType): Promise<IShopData[]> {
  return this.find({ type, isActive: true }).sort({ region: 1, 'location.zone': 1 });
};

ShopDataSchema.statics.findByRegion = function(region: string): Promise<IShopData[]> {
  return this.find({ region, isActive: true }).sort({ 'location.zone': 1 });
};

ShopDataSchema.statics.findActiveShops = function(): Promise<IShopData[]> {
  return this.find({ isActive: true }).sort({ region: 1, 'location.zone': 1 });
};

ShopDataSchema.statics.findShopsSellingItem = function(itemId: string): Promise<IShopData[]> {
  return this.find({ 
    'items.itemId': itemId, 
    isActive: true 
  }).sort({ 'location.zone': 1 });
};

ShopDataSchema.statics.createFromJson = async function(jsonShop: any): Promise<IShopData> {
  const shopData = new this({
    shopId: jsonShop.id,
    name: jsonShop.name,
    type: jsonShop.type || 'pokemart',
    location: {
      zone: 'unknown', // À déterminer lors de l'import
      city: jsonShop.location?.city,
      building: jsonShop.location?.building
    },
    currency: jsonShop.currency || 'gold',
    buyMultiplier: jsonShop.buyMultiplier || 1.0,
    sellMultiplier: jsonShop.sellMultiplier || 0.5,
    items: [],
    isTemporary: jsonShop.isTemporary || false,
    version: '1.0.0',
    sourceFile: jsonShop.sourceFile
  });
  
  await shopData.updateFromJson(jsonShop);
  return shopData;
};

// ===== EXPORT =====
export const ShopData = mongoose.model<IShopData, IShopDataModel>('ShopData', ShopDataSchema);

export type ShopDataDocument = IShopData;
export type CreateShopData = Partial<Pick<IShopData, 
  'shopId' | 'name' | 'type' | 'location' | 'items'
>>;
