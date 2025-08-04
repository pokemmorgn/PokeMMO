// server/src/models/ItemData.ts - MODÈLE MONGODB COMPLET AVEC SYSTÈME D'EFFETS
import mongoose, { Schema, Document, Model } from "mongoose";
import { 
  ItemEffect, ItemAction, ItemCondition, ItemCategory, EffectTrigger, 
  ActionType, ConditionType
} from '../items/ItemEffectTypes';

// ===== TYPES ET ENUMS =====

export type ItemCategory = 
  | 'medicine' | 'pokeballs' | 'battle_items' | 'key_items' | 'berries' 
  | 'machines' | 'evolution_items' | 'held_items' | 'z_crystals' 
  | 'dynamax_crystals' | 'tera_shards' | 'poke_toys' | 'ingredients'
  | 'treasure' | 'fossil' | 'flutes' | 'mail' | 'exp_items';

export type ItemRarity = 
  | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type ObtainMethod = 
  | 'shop' | 'find' | 'gift' | 'craft' | 'event' | 'battle' | 'breeding' | 'trade';

// ===== INTERFACE PRINCIPALE =====

export interface IItemData extends Document {
  // === IDENTIFICATION ===
  itemId: string;                    // ID unique de l'item (ex: "poke_ball")
  name: string;                      // Nom affiché de l'item
  description: string;               // Description complète de l'item
  category: ItemCategory;            // Catégorie de l'item
  
  // === ÉCONOMIE ===
  price: number | null;              // Prix d'achat (null = non achetable)
  sellPrice: number | null;          // Prix de vente (null = non vendable)
  
  // === UTILISATION DE BASE ===
  stackable: boolean;                // Empilable dans l'inventaire
  consumable: boolean;               // Se consomme à l'usage
  
  // === SYSTÈME D'EFFETS COMPLET ===
  effects: ItemEffect[];             // Tous les effets de l'item
  
  // === MÉTADONNÉES ===
  sprite: string;                    // Nom du sprite/icône
  generation: number;                // Génération d'introduction (1-9)
  rarity: ItemRarity;                // Rareté de l'item
  tags: string[];                    // Tags pour recherche et catégorisation
  
  // === OBTENTION ET RESTRICTIONS ===
  obtainMethods: Array<{
    method: ObtainMethod;
    location?: string;               // Lieu d'obtention
    chance?: number;                 // Chance d'obtention (0-100)
    conditions?: string[];           // Conditions spéciales
    cost?: number;                   // Coût (argent, BP, etc.)
    currency?: 'money' | 'bp' | 'tokens' | 'other';
    npc?: string;                    // NPC associé
    event?: string;                  // Événement associé
  }>;
  
  usageRestrictions: {
    locations?: string[];            // Lieux d'utilisation autorisés
    battleOnly?: boolean;            // Utilisable uniquement en combat
    fieldOnly?: boolean;             // Utilisable uniquement hors combat
    targetTypes?: Array<'self' | 'ally' | 'opponent' | 'wild'>;
    generationLock?: number;         // Verrouillage de génération
    regionLock?: string[];           // Verrouillage régional
    levelRequirement?: number;       // Niveau minimum requis
    badgeRequirement?: string[];     // Badges requis
    storyFlags?: string[];           // Flags d'histoire requis
  };
  
  // === DONNÉES SPÉCIALISÉES (pour compatibilité et validation) ===
  legacyData?: {
    // Données héritées du JSON original
    type?: string;                   // Ancien type (ball, medicine, etc.)
    pocket?: string;                 // Ancienne poche
    usableInBattle?: boolean;        // Ancien flag
    usableInField?: boolean;         // Ancien flag
    healAmount?: number | 'full';    // Ancien système de soin
    reviveAmount?: number;           // Ancien système de revive
    statusCure?: string[];           // Ancien système de soins de statut
    effectSteps?: number;            // Ancien système repel
    // Conserver pour migration progressive
  };
  
  // === SYSTÈME ===
  isActive: boolean;                 // Item actif
  version: string;                   // Version du modèle de données
  lastUpdated: Date;
  sourceFile?: string;               // Fichier source original
  createdBy?: string;                // Créateur (admin)
  
  // === MÉTHODES D'INSTANCE ===
  hasEffect(trigger: EffectTrigger): boolean;
  getEffectsByTrigger(trigger: EffectTrigger): ItemEffect[];
  validateEffects(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  canBeUsedBy(context: any): boolean;
  canBeBought(): boolean;
  canBeSold(): boolean;
  isConsumable(): boolean;
  getEffectivePrice(shopModifier?: number): number | null;
  toItemFormat(): any;
  updateFromJson(jsonData: any): Promise<void>;
  migrateFromLegacy(): Promise<void>;
}

// Interface pour les méthodes statiques
export interface IItemDataModel extends Model<IItemData> {
  // Recherche par catégorie et propriétés
  findByCategory(category: ItemCategory): Promise<IItemData[]>;
  findByGeneration(generation: number): Promise<IItemData[]>;
  findByRarity(rarity: ItemRarity): Promise<IItemData[]>;
  findWithEffect(trigger: EffectTrigger): Promise<IItemData[]>;
  
  // Recherche par types spécialisés
  findEvolutionItems(): Promise<IItemData[]>;
  findHeldItems(): Promise<IItemData[]>;
  findBerries(): Promise<IItemData[]>;
  findTMs(): Promise<IItemData[]>;
  findHMs(): Promise<IItemData[]>;
  findZCrystals(): Promise<IItemData[]>;
  findMegaStones(): Promise<IItemData[]>;
  findKeyItems(): Promise<IItemData[]>;
  
  // Recherche économique
  findBuyableItems(): Promise<IItemData[]>;
  findSellableItems(): Promise<IItemData[]>;
  findByPriceRange(min: number, max: number): Promise<IItemData[]>;
  
  // Recherche avancée
  searchItems(query: string): Promise<IItemData[]>;
  findByObtainMethod(method: ObtainMethod): Promise<IItemData[]>;
  findByLocation(location: string): Promise<IItemData[]>;
  
  // Administration
  findActiveItems(): Promise<IItemData[]>;
  bulkImportFromJson(itemsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonItem: any): Promise<IItemData>;
  validateAllEffects(): Promise<{ items_checked: number; items_with_errors: number; errors: string[] }>;
  migrateAllFromLegacy(): Promise<{ migrated: number; errors: string[] }>;
}

// ===== CONSTANTES DE VALIDATION =====

const ITEM_CATEGORIES = [
  'medicine', 'pokeballs', 'battle_items', 'key_items', 'berries', 
  'machines', 'evolution_items', 'held_items', 'z_crystals', 
  'dynamax_crystals', 'tera_shards', 'poke_toys', 'ingredients',
  'treasure', 'fossil', 'flutes', 'mail', 'exp_items'
] as const;

const ITEM_RARITIES = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
] as const;

const OBTAIN_METHODS = [
  'shop', 'find', 'gift', 'craft', 'event', 'battle', 'breeding', 'trade'
] as const;

const EFFECT_TRIGGERS = [
  'on_use', 'on_use_in_battle', 'on_use_on_pokemon', 'on_use_in_field',
  'turn_start', 'turn_end', 'on_switch_in', 'on_switch_out',
  'before_move', 'after_move', 'on_hit', 'on_miss', 'on_critical',
  'on_ko', 'on_faint', 'when_hit', 'when_damaged',
  'on_status_inflict', 'on_status_cure', 'on_stat_change',
  'on_hp_low', 'on_hp_critical', 'on_full_hp',
  'on_move_select', 'on_move_fail', 'on_super_effective', 'on_not_very_effective',
  'on_weather_change', 'on_terrain_change', 'in_weather', 'in_terrain',
  'on_level_up', 'on_evolution', 'in_wild_encounter', 'during_breeding',
  'on_capture', 'continuous', 'passive', 'on_equip', 'on_unequip'
] as const;

// ===== SCHÉMAS INTÉGRÉS =====

// Schéma pour les conditions d'effet
const ItemConditionSchema = new Schema({
  id: { type: String, trim: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'pokemon_species', 'pokemon_type', 'pokemon_ability', 'pokemon_gender',
      'pokemon_level', 'pokemon_nature', 'pokemon_friendship', 'pokemon_form',
      'stat_value', 'stat_stage', 'hp_percentage', 'hp_value',
      'has_status', 'has_no_status', 'status_turns_remaining',
      'battle_type', 'opponent_type', 'move_type', 'move_category',
      'weather_active', 'terrain_active', 'time_of_day', 'location',
      'held_item', 'random_chance', 'first_use', 'consecutive_use'
    ]
  },
  operator: { 
    type: String,
    enum: ['equals', 'not_equals', 'greater', 'less', 'greater_equal', 'less_equal', 'in', 'not_in', 'contains', 'range'],
    default: 'equals'
  },
  value: { type: Schema.Types.Mixed },
  values: [{ type: Schema.Types.Mixed }],
  range: {
    min: { type: Number },
    max: { type: Number }
  },
  target: { 
    type: String,
    enum: ['self', 'opponent', 'ally', 'any', 'user'],
    default: 'self'
  },
  negate: { type: Boolean, default: false },
  probability: { 
    type: Number, 
    min: 0, 
    max: 1,
    default: 1
  }
}, { _id: false });

// Schéma pour les actions d'effet
const ItemActionSchema = new Schema({
  id: { type: String, trim: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'heal_hp_fixed', 'heal_hp_percentage', 'heal_hp_max', 'damage_hp',
      'cure_status', 'cure_all_status', 'inflict_status', 'prevent_status',
      'boost_stat', 'lower_stat', 'reset_stats', 'set_stat_stage',
      'teach_move', 'delete_move', 'restore_pp', 'increase_pp_max',
      'evolve_pokemon', 'prevent_evolution', 'trigger_evolution_check',
      'modify_catch_rate', 'guaranteed_catch', 'prevent_escape',
      'switch_pokemon', 'force_switch', 'prevent_switch', 'escape_battle',
      'change_weather', 'change_terrain', 'remove_weather', 'remove_terrain',
      'increase_move_power', 'change_move_type', 'guarantee_critical',
      'transform_pokemon', 'change_ability', 'change_type', 'change_form',
      'mega_evolve', 'z_move_unlock', 'dynamax', 'terastalize',
      'gain_exp', 'gain_ev', 'increase_friendship', 'show_message', 'consume_item'
    ]
  },
  target: { 
    type: String,
    enum: ['self', 'opponent', 'ally', 'user', 'party', 'field', 'all'],
    default: 'self'
  },
  value: { type: Schema.Types.Mixed },
  duration: { 
    type: Number,
    min: 0,
    max: 100
  },
  chance: { 
    type: Number, 
    min: 0, 
    max: 1,
    default: 1
  },
  priority: { 
    type: Number,
    min: -10,
    max: 10,
    default: 0
  },
  parameters: { 
    type: Schema.Types.Mixed,
    default: {}
  },
  success_message: { type: String, trim: true, maxlength: 500 },
  failure_message: { type: String, trim: true, maxlength: 500 },
  conditions: [ItemConditionSchema],
  chain_actions: [{ type: Schema.Types.Mixed }], // Référence circulaire simplifiée
  once_per_battle: { type: Boolean, default: false },
  once_per_turn: { type: Boolean, default: false },
  max_uses: { type: Number, min: 1 }
}, { _id: false });

// Schéma pour les effets d'item
const ItemEffectSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  name: { 
    type: String,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 1000
  },
  trigger: { 
    type: String, 
    required: true,
    enum: EFFECT_TRIGGERS
  },
  priority: { 
    type: Number,
    min: -100,
    max: 100,
    default: 0
  },
  conditions: [ItemConditionSchema],
  actions: {
    type: [ItemActionSchema],
    required: true,
    validate: {
      validator: function(actions: any[]) {
        return actions && actions.length > 0;
      },
      message: 'Effect must have at least one action'
    }
  },
  stackable: { type: Boolean, default: true },
  removable: { type: Boolean, default: true },
  temporary: { type: Boolean, default: false },
  duration: { type: Number, min: 0 },
  once_per_battle: { type: Boolean, default: false },
  once_per_turn: { type: Boolean, default: false },
  max_uses_per_battle: { type: Number, min: 1 },
  cooldown_turns: { type: Number, min: 0 },
  generation: { type: Number, min: 1, max: 9 },
  tags: [{ type: String, trim: true, maxlength: 50 }],
  hidden: { type: Boolean, default: false }
}, { _id: false });

// Schéma pour les méthodes d'obtention
const ObtainMethodSchema = new Schema({
  method: {
    type: String,
    required: true,
    enum: OBTAIN_METHODS
  },
  location: { type: String, trim: true, maxlength: 100 },
  chance: { type: Number, min: 0, max: 100 },
  conditions: [{ type: String, trim: true, maxlength: 200 }],
  cost: { type: Number, min: 0 },
  currency: { 
    type: String,
    enum: ['money', 'bp', 'tokens', 'other'],
    default: 'money'
  },
  npc: { type: String, trim: true, maxlength: 100 },
  event: { type: String, trim: true, maxlength: 100 }
}, { _id: false });

// Schéma pour les restrictions d'usage
const UsageRestrictionsSchema = new Schema({
  locations: [{ type: String, trim: true, maxlength: 100 }],
  battleOnly: { type: Boolean, default: false },
  fieldOnly: { type: Boolean, default: false },
  targetTypes: [{ 
    type: String,
    enum: ['self', 'ally', 'opponent', 'wild']
  }],
  generationLock: { type: Number, min: 1, max: 9 },
  regionLock: [{ type: String, trim: true, maxlength: 50 }],
  levelRequirement: { type: Number, min: 1, max: 100 },
  badgeRequirement: [{ type: String, trim: true, maxlength: 50 }],
  storyFlags: [{ type: String, trim: true, maxlength: 100 }]
}, { _id: false });

// Schéma pour données héritées (compatibilité)
const LegacyDataSchema = new Schema({
  type: { type: String, trim: true },
  pocket: { type: String, trim: true },
  usableInBattle: { type: Boolean },
  usableInField: { type: Boolean },
  healAmount: { type: Schema.Types.Mixed },
  reviveAmount: { type: Number, min: 0, max: 1 },
  statusCure: [{ type: String, trim: true }],
  effectSteps: { type: Number, min: 1 }
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
    match: [/^[a-z0-9_-]+$/, 'Item ID must contain only lowercase letters, numbers, underscores and hyphens'],
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
    required: true,
    trim: true,
    minlength: [10, 'Description too short'],
    maxlength: [2000, 'Description too long']
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ITEM_CATEGORIES,
      message: 'Invalid item category: {VALUE}. Allowed: ' + ITEM_CATEGORIES.join(', ')
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
  
  // === UTILISATION DE BASE ===
  stackable: {
    type: Boolean,
    required: true,
    default: true
  },
  consumable: {
    type: Boolean,
    required: true,
    default: true
  },
  
  // === SYSTÈME D'EFFETS ===
  effects: {
    type: [ItemEffectSchema],
    default: [],
    validate: {
      validator: function(effects: any[]) {
        // Vérifier que les IDs d'effets sont uniques
        const ids = effects.map(e => e.id);
        return ids.length === new Set(ids).size;
      },
      message: 'Effect IDs must be unique within an item'
    }
  },
  
  // === MÉTADONNÉES ===
  sprite: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Sprite name too long']
  },
  generation: {
    type: Number,
    required: true,
    min: [1, 'Generation must be at least 1'],
    max: [9, 'Generation cannot exceed 9'],
    index: true
  },
  rarity: {
    type: String,
    required: true,
    enum: {
      values: ITEM_RARITIES,
      message: 'Invalid rarity: {VALUE}'
    },
    default: 'common',
    index: true
  },
  tags: {
    type: [{ 
      type: String,
      trim: true,
      maxlength: [50, 'Tag too long']
    }],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length === new Set(tags).size; // Pas de doublons
      },
      message: 'Tags must be unique'
    }
  },
  
  // === OBTENTION ET RESTRICTIONS ===
  obtainMethods: {
    type: [ObtainMethodSchema],
    default: [],
    validate: {
      validator: function(methods: any[]) {
        return methods.length > 0; // Au moins une méthode d'obtention
      },
      message: 'Item must have at least one obtain method'
    }
  },
  
  usageRestrictions: {
    type: UsageRestrictionsSchema,
    default: {}
  },
  
  // === DONNÉES HÉRITÉES ===
  legacyData: {
    type: LegacyDataSchema,
    default: undefined
  },
  
  // === SYSTÈME ===
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  version: {
    type: String,
    default: '2.0.0', // Version avec système d'effets
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
  },
  createdBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Creator name too long']
  }
}, {
  timestamps: true,
  collection: 'item_data',
  minimize: false
});

// ===== INDEX COMPOSITES =====

ItemDataSchema.index({ category: 1, isActive: 1 });
ItemDataSchema.index({ generation: 1, isActive: 1 });
ItemDataSchema.index({ rarity: 1, isActive: 1 });
ItemDataSchema.index({ price: 1, isActive: 1 });
ItemDataSchema.index({ 'effects.trigger': 1 });
ItemDataSchema.index({ 'obtainMethods.method': 1 });
ItemDataSchema.index({ 'obtainMethods.location': 1 });
ItemDataSchema.index({ tags: 1 });

// Index de recherche textuelle étendu
ItemDataSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  'effects.name': 'text',
  'effects.description': 'text'
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
    
    // Auto-génération du sprite si non défini
    if (!this.sprite) {
      this.sprite = this.itemId;
    }
    
    // Nettoyage des tags
    if (this.tags) {
      this.tags = [...new Set(this.tags.filter(t => t && t.trim().length > 0))];
    }
    
    // Validation de cohérence category/effects
    this.validateCategoryEffectConsistency();
    
    // Validation des effets
    this.validateEffectConsistency();
    
    this.lastUpdated = new Date();
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Vérifie si l'item a un effet pour un trigger donné
 */
ItemDataSchema.methods.hasEffect = function(this: IItemData, trigger: EffectTrigger): boolean {
  return this.effects.some(effect => effect.trigger === trigger);
};

/**
 * Récupère tous les effets pour un trigger donné
 */
ItemDataSchema.methods.getEffectsByTrigger = function(this: IItemData, trigger: EffectTrigger): ItemEffect[] {
  return this.effects.filter(effect => effect.trigger === trigger);
};

/**
 * Valide tous les effets de l'item
 */
ItemDataSchema.methods.validateEffects = async function(this: IItemData): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const result = { valid: true, errors: [], warnings: [] } as { valid: boolean; errors: string[]; warnings: string[] };
  
  try {
    for (const effect of this.effects) {
      // Vérifier que chaque effet a au moins une action
      if (!effect.actions || effect.actions.length === 0) {
        result.errors.push(`Effect "${effect.id}" has no actions`);
        result.valid = false;
      }
      
      // Vérifier la cohérence des conditions
      if (effect.conditions) {
        for (const condition of effect.conditions) {
          if (!condition.type) {
            result.errors.push(`Effect "${effect.id}" has condition without type`);
            result.valid = false;
          }
        }
      }
      
      // Vérifier la cohérence des actions
      for (const action of effect.actions) {
        if (!action.type) {
          result.errors.push(`Effect "${effect.id}" has action without type`);
          result.valid = false;
        }
        
        // Vérifications spécifiques par type d'action
        if (action.type === 'evolve_pokemon' && !action.value) {
          result.errors.push(`Evolution action in effect "${effect.id}" missing target species`);
          result.valid = false;
        }
        
        if (action.type === 'teach_move' && !action.value) {
          result.errors.push(`Teach move action in effect "${effect.id}" missing move ID`);
          result.valid = false;
        }
      }
    }
  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

/**
 * Vérifie si l'item peut être utilisé dans un contexte donné
 */
ItemDataSchema.methods.canBeUsedBy = function(this: IItemData, context: any): boolean {
  const restrictions = this.usageRestrictions;
  
  // Vérifier les restrictions de lieu
  if (restrictions.locations && restrictions.locations.length > 0) {
    if (!context.location || !restrictions.locations.includes(context.location)) {
      return false;
    }
  }
  
  // Vérifier battle only / field only
  if (restrictions.battleOnly && !context.inBattle) {
    return false;
  }
  
  if (restrictions.fieldOnly && context.inBattle) {
    return false;
  }
  
  // Vérifier le niveau requis
  if (restrictions.levelRequirement && context.trainerLevel < restrictions.levelRequirement) {
    return false;
  }
  
  // Vérifier les badges requis
  if (restrictions.badgeRequirement && restrictions.badgeRequirement.length > 0) {
    if (!context.badges || !restrictions.badgeRequirement.every(badge => context.badges.includes(badge))) {
      return false;
    }
  }
  
  return true;
};

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
  return this.consumable && this.category !== 'key_items';
};

/**
 * Calcule le prix effectif avec modificateur de boutique
 */
ItemDataSchema.methods.getEffectivePrice = function(this: IItemData, shopModifier: number = 1): number | null {
  if (!this.canBeBought()) return null;
  return Math.floor(this.price! * shopModifier);
};

/**
 * Convertit au format d'item standard pour le jeu
 */
ItemDataSchema.methods.toItemFormat = function(this: IItemData): any {
  return {
    id: this.itemId,
    name: this.name,
    description: this.description,
    category: this.category,
    price: this.price,
    sell_price: this.sellPrice,
    stackable: this.stackable,
    consumable: this.consumable,
    effects: this.effects,
    sprite: this.sprite,
    generation: this.generation,
    rarity: this.rarity,
    tags: this.tags,
    obtain_methods: this.obtainMethods,
    usage_restrictions: this.usageRestrictions,
    // Compatibilité avec l'ancien format
    legacy_data: this.legacyData
  };
};

/**
 * Met à jour les données depuis un objet JSON
 */
ItemDataSchema.methods.updateFromJson = async function(this: IItemData, jsonData: any): Promise<void> {
  // Propriétés de base
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.description) this.description = jsonData.description;
  if (jsonData.category) this.category = jsonData.category;
  
  // Économie
  if (jsonData.price !== undefined) this.price = jsonData.price;
  if (jsonData.sell_price !== undefined) this.sellPrice = jsonData.sell_price;
  if (jsonData.sellPrice !== undefined) this.sellPrice = jsonData.sellPrice;
  
  // Utilisation
  if (typeof jsonData.stackable === 'boolean') this.stackable = jsonData.stackable;
  if (typeof jsonData.consumable === 'boolean') this.consumable = jsonData.consumable;
  
  // Effets
  if (jsonData.effects) this.effects = jsonData.effects;
  
  // Métadonnées
  if (jsonData.sprite) this.sprite = jsonData.sprite;
  if (jsonData.generation) this.generation = jsonData.generation;
  if (jsonData.rarity) this.rarity = jsonData.rarity;
  if (jsonData.tags) this.tags = jsonData.tags;
  
  // Obtention et restrictions
  if (jsonData.obtain_methods || jsonData.obtainMethods) {
    this.obtainMethods = jsonData.obtain_methods || jsonData.obtainMethods;
  }
  if (jsonData.usage_restrictions || jsonData.usageRestrictions) {
    this.usageRestrictions = jsonData.usage_restrictions || jsonData.usageRestrictions;
  }
  
  // Données héritées (pour migration)
  if (jsonData.legacy_data || this.needsLegacyMigration(jsonData)) {
    this.legacyData = this.extractLegacyData(jsonData);
  }
  
  await this.save();
};

/**
 * Migre depuis l'ancien format vers le nouveau système d'effets
 */
ItemDataSchema.methods.migrateFromLegacy = async function(this: IItemData): Promise<void> {
  if (!this.legacyData) return;
  
  console.log(`🔄 Migrating item ${this.itemId} from legacy format`);
  
  const newEffects: ItemEffect[] = [];
  
  // Migrer healAmount vers heal_hp_fixed/percentage
  if (this.legacyData.healAmount) {
    const healEffect: ItemEffect = {
      id: `heal_${this.itemId}`,
      name: 'Healing Effect',
      trigger: 'on_use',
      actions: []
    };
    
    if (this.legacyData.healAmount === 'full') {
      healEffect.actions.push({
        type: 'heal_hp_max',
        target: 'self',
        value: true,
        success_message: 'HP fully restored!'
      });
    } else {
      healEffect.actions.push({
        type: 'heal_hp_fixed',
        target: 'self',
        value: this.legacyData.healAmount,
        success_message: `Restored ${this.legacyData.healAmount} HP!`
      });
    }
    
    newEffects.push(healEffect);
  }
  
  // Migrer statusCure vers cure_status
  if (this.legacyData.statusCure && this.legacyData.statusCure.length > 0) {
    const cureEffect: ItemEffect = {
      id: `cure_${this.itemId}`,
      name: 'Status Cure Effect',
      trigger: 'on_use',
      actions: []
    };
    
    if (this.legacyData.statusCure.includes('all')) {
      cureEffect.actions.push({
        type: 'cure_all_status',
        target: 'self',
        value: true,
        success_message: 'All status conditions cured!'
      });
    } else {
      for (const status of this.legacyData.statusCure) {
        cureEffect.actions.push({
          type: 'cure_status',
          target: 'self',
          value: status,
          success_message: `${status} cured!`
        });
      }
    }
    
    newEffects.push(cureEffect);
  }
  
  // Migrer effectSteps vers repel effect
  if (this.legacyData.effectSteps) {
    const repelEffect: ItemEffect = {
      id: `repel_${this.itemId}`,
      name: 'Repel Effect',
      trigger: 'on_use_in_field',
      actions: [{
        type: 'prevent_wild_encounters',
        target: 'field',
        value: this.legacyData.effectSteps,
        duration: this.legacyData.effectSteps,
        success_message: `Wild Pokémon repelled for ${this.legacyData.effectSteps} steps!`
      }]
    } as ItemEffect;
    
    newEffects.push(repelEffect);
  }
  
  // Ajouter les nouveaux effets
  this.effects.push(...newEffects);
  
  // Nettoyer les données héritées
  this.legacyData = undefined;
  this.version = '2.0.0';
  
  await this.save();
  console.log(`✅ Item ${this.itemId} migrated successfully`);
};

// Méthodes utilitaires privées
ItemDataSchema.methods.needsLegacyMigration = function(jsonData: any): boolean {
  return !!(jsonData.heal_amount || jsonData.healAmount || 
           jsonData.status_cure || jsonData.statusCure ||
           jsonData.effect_steps || jsonData.effectSteps ||
           jsonData.type || jsonData.pocket);
};

ItemDataSchema.methods.extractLegacyData = function(jsonData: any): any {
  return {
    type: jsonData.type,
    pocket: jsonData.pocket,
    usableInBattle: jsonData.usable_in_battle || jsonData.usableInBattle,
    usableInField: jsonData.usable_in_field || jsonData.usableInField,
    healAmount: jsonData.heal_amount || jsonData.healAmount,
    reviveAmount: jsonData.revive_amount || jsonData.reviveAmount,
    statusCure: jsonData.status_cure || jsonData.statusCure,
    effectSteps: jsonData.effect_steps || jsonData.effectSteps
  };
};

ItemDataSchema.methods.validateCategoryEffectConsistency = function(this: IItemData): void {
  // Vérifications de cohérence entre catégorie et effets
  // Par exemple, les items de médecine devraient avoir des effets de soin
  
  if (this.category === 'medicine') {
    const hasHealingEffect = this.effects.some(effect => 
      effect.actions.some(action => 
        ['heal_hp_fixed', 'heal_hp_percentage', 'heal_hp_max', 'cure_status', 'cure_all_status'].includes(action.type)
      )
    );
    
    if (!hasHealingEffect) {
      console.warn(`Medicine item ${this.itemId} has no healing effects`);
    }
  }
  
  if (this.category === 'pokeballs') {
    const hasCatchEffect = this.effects.some(effect =>
      effect.actions.some(action =>
        ['modify_catch_rate', 'guaranteed_catch'].includes(action.type)
      )
    );
    
    if (!hasCatchEffect) {
      console.warn(`Pokeball item ${this.itemId} has no catch effects`);
    }
  }
};

ItemDataSchema.methods.validateEffectConsistency = function(this: IItemData): void {
  // Vérifier que les effets sont cohérents entre eux
  for (const effect of this.effects) {
    // Vérifier que les triggers sont appropriés pour les actions
    if (effect.trigger === 'on_use_in_battle') {
      const hasNonBattleAction = effect.actions.some(action =>
        ['evolve_pokemon', 'teach_move'].includes(action.type)
      );
      
      if (hasNonBattleAction) {
        console.warn(`Effect ${effect.id} has battle trigger but non-battle actions`);
      }
    }
  }
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve les items par catégorie
 */
ItemDataSchema.statics.findByCategory = function(category: ItemCategory): Promise<IItemData[]> {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les items par génération
 */
ItemDataSchema.statics.findByGeneration = function(generation: number): Promise<IItemData[]> {
  return this.find({ generation, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les items par rareté
 */
ItemDataSchema.statics.findByRarity = function(rarity: ItemRarity): Promise<IItemData[]> {
  return this.find({ rarity, isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les items avec un effet spécifique
 */
ItemDataSchema.statics.findWithEffect = function(trigger: EffectTrigger): Promise<IItemData[]> {
  return this.find({ 
    'effects.trigger': trigger, 
    isActive: true 
  }).sort({ name: 1 });
};

/**
 * Trouve les items d'évolution
 */
ItemDataSchema.statics.findEvolutionItems = function(): Promise<IItemData[]> {
  return this.find({
    $or: [
      { category: 'evolution_items' },
      { 'effects.actions.type': 'evolve_pokemon' }
    ],
    isActive: true
  }).sort({ name: 1 });
};

/**
 * Trouve les objets tenus
 */
ItemDataSchema.statics.findHeldItems = function(): Promise<IItemData[]> {
  return this.find({
    $or: [
      { category: 'held_items' },
      { 'effects.trigger': { $in: ['on_equip', 'passive', 'continuous'] } }
    ],
    isActive: true
  }).sort({ name: 1 });
};

/**
 * Trouve les baies
 */
ItemDataSchema.statics.findBerries = function(): Promise<IItemData[]> {
  return this.find({ category: 'berries', isActive: true }).sort({ name: 1 });
};

/**
 * Trouve les TMs
 */
ItemDataSchema.statics.findTMs = function(): Promise<IItemData[]> {
  return this.find({
    $or: [
      { category: 'machines' },
      { 'effects.actions.type': 'teach_move' }
    ],
    isActive: true
  }).sort({ name: 1 });
};

/**
 * Trouve les objets achetables
 */
ItemDataSchema.statics.findBuyableItems = function(): Promise<IItemData[]> {
  return this.find({ 
    price: { $ne: null, $gt: 0 }, 
    isActive: true 
  }).sort({ price: 1, name: 1 });
};

/**
 * Trouve tous les items actifs
 */
ItemDataSchema.statics.findActiveItems = function(): Promise<IItemData[]> {
  return this.find({ isActive: true }).sort({ category: 1, name: 1 });
};

/**
 * Recherche textuelle d'items
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
  
  // Créer nouveau avec valeurs par défaut appropriées
  const itemData = new this({
    itemId: jsonItem.id,
    name: jsonItem.name || jsonItem.id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    description: jsonItem.description || `A ${jsonItem.name || jsonItem.id.replace(/_/g, ' ')}.`,
    category: this.inferCategoryFromData(jsonItem),
    price: jsonItem.price,
    sellPrice: jsonItem.sell_price || jsonItem.sellPrice,
    stackable: jsonItem.stackable ?? true,
    consumable: jsonItem.consumable ?? true,
    effects: jsonItem.effects || [],
    sprite: jsonItem.sprite || jsonItem.id,
    generation: jsonItem.generation || 1,
    rarity: jsonItem.rarity || 'common',
    tags: jsonItem.tags || [],
    obtainMethods: jsonItem.obtain_methods || jsonItem.obtainMethods || [{ method: 'shop' }],
    usageRestrictions: jsonItem.usage_restrictions || jsonItem.usageRestrictions || {},
    sourceFile: jsonItem.sourceFile || 'imported'
  });
  
  // Si pas d'effets définis, essayer de les générer depuis les données héritées
  if (itemData.effects.length === 0 && this.hasLegacyEffectData(jsonItem)) {
    itemData.legacyData = itemData.extractLegacyData(jsonItem);
    await itemData.migrateFromLegacy();
  }
  
  await itemData.save();
  return itemData;
};

// Méthodes utilitaires statiques
ItemDataSchema.statics.inferCategoryFromData = function(jsonItem: any): ItemCategory {
  // Inférer la catégorie depuis les données héritées
  if (jsonItem.type) {
    const typeMap: { [key: string]: ItemCategory } = {
      'ball': 'pokeballs',
      'medicine': 'medicine',
      'item': 'battle_items',
      'key_item': 'key_items',
      'tm': 'machines',
      'hm': 'machines',
      'berry': 'berries'
    };
    return typeMap[jsonItem.type] || 'battle_items';
  }
  
  // Inférer depuis le nom
  const name = (jsonItem.name || jsonItem.id || '').toLowerCase();
  if (name.includes('ball')) return 'pokeballs';
  if (name.includes('potion') || name.includes('heal')) return 'medicine';
  if (name.includes('berry')) return 'berries';
  if (name.includes('stone') && name.includes('evolution')) return 'evolution_items';
  if (name.includes('tm') || name.includes('hm')) return 'machines';
  
  return 'battle_items'; // Défaut
};

ItemDataSchema.statics.hasLegacyEffectData = function(jsonItem: any): boolean {
  return !!(jsonItem.heal_amount || jsonItem.healAmount || 
           jsonItem.status_cure || jsonItem.statusCure ||
           jsonItem.effect_steps || jsonItem.effectSteps);
};

/**
 * Valide tous les effets de tous les items
 */
ItemDataSchema.statics.validateAllEffects = async function(): Promise<{ items_checked: number; items_with_errors: number; errors: string[] }> {
  const result = { items_checked: 0, items_with_errors: 0, errors: [] as string[] };
  
  const items = await this.find({ isActive: true });
  result.items_checked = items.length;
  
  for (const item of items) {
    const validation = await item.validateEffects();
    if (!validation.valid) {
      result.items_with_errors++;
      result.errors.push(`Item ${item.itemId}: ${validation.errors.join(', ')}`);
    }
  }
  
  return result;
};

/**
 * Migre tous les items depuis le format hérité
 */
ItemDataSchema.statics.migrateAllFromLegacy = async function(): Promise<{ migrated: number; errors: string[] }> {
  const result = { migrated: 0, errors: [] as string[] };
  
  const itemsWithLegacyData = await this.find({ 
    legacyData: { $exists: true, $ne: null },
    isActive: true 
  });
  
  for (const item of itemsWithLegacyData) {
    try {
      await item.migrateFromLegacy();
      result.migrated++;
    } catch (error) {
      result.errors.push(`Item ${item.itemId}: ${error instanceof Error ? error.message : 'Migration failed'}`);
    }
  }
  
  return result;
};

// ===== EXPORT =====
export const ItemData = mongoose.model<IItemData, IItemDataModel>('ItemData', ItemDataSchema);

export type ItemDataDocument = IItemData;
export type CreateItemData = Partial<Pick<IItemData, 
  'itemId' | 'name' | 'description' | 'category' | 'effects' | 'obtainMethods'
>>;

// Log de chargement
console.log(`📦 ItemData schema v2.0.0 loaded with effect system:
- Categories: ${ITEM_CATEGORIES.length} (${ITEM_CATEGORIES.slice(0, 4).join(', ')}, ...)
- Effect triggers: ${EFFECT_TRIGGERS.length} triggers supported
- Rarities: ${ITEM_RARITIES.length} (${ITEM_RARITIES.join(', ')})
- Full backward compatibility with legacy format
✅ Ready for advanced item management with configurable effects`);
