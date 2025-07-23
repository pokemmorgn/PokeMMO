// server/src/models/QuestData.ts - VERSION ÉTENDUE AVEC MIGRATION PROGRESSIVE
import mongoose, { Schema, Document, Model } from "mongoose";
import { QuestDefinition, QuestReward, QuestObjectiveType, QuestRewardType, QuestCategory, RewardRarity } from "../types/QuestTypes";

// ===== INTERFACES ÉTENDUES =====

export interface IQuestData extends Document {
  // === IDENTIFICATION ===
  questId: string;                  // ID unique de la quête
  name: string;                     // Nom de la quête
  description: string;              // Description de la quête
  category: QuestCategory;          // ✅ ÉTENDU : Utilise le type complet
  
  // === CONFIGURATION ===
  prerequisites?: string[];         // IDs des quêtes prérequises
  startNpcId?: number;             // NPC qui donne la quête
  endNpcId?: number;               // NPC qui reçoit la quête
  isRepeatable: boolean;           // Quête répétable
  cooldownHours?: number;          // Cooldown entre répétitions
  autoComplete: boolean;           // Completion automatique ou manuelle
  
  // === DIALOGUES ÉTENDUS ===
  dialogues?: {
    questOffer?: string[];         // Dialogues d'offre de quête
    questInProgress?: string[];    // Dialogues pendant la quête
    questComplete?: string[];      // Dialogues de completion
    
    // 🆕 NOUVEAUX : Dialogues étendus
    questFailed?: string[];        // Dialogues d'échec
    questAbandoned?: string[];     // Dialogues d'abandon
    questUnavailable?: string[];   // Dialogues si indisponible
    stepComplete?: Record<string, string[]>; // Par étape
    objectiveComplete?: Record<string, string[]>; // Par objectif
  };
  
  // === ÉTAPES DE LA QUÊTE ÉTENDUES ===
  steps: Array<{
    id: string;
    name: string;
    description: string;
    objectives: Array<{
      id: string;
      type: QuestObjectiveType;     // ✅ ÉTENDU : Tous les nouveaux types
      description: string;
      target?: string;
      targetName?: string;
      itemId?: string;
      requiredAmount: number;
      validationDialogue?: string[];
      
      // 🆕 NOUVEAUX : Conditions avancées
      conditions?: {
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
        weather?: 'sunny' | 'rain' | 'snow' | 'fog' | 'storm';
        season?: 'spring' | 'summer' | 'autumn' | 'winter';
        location?: string | string[];
        mapId?: string | string[];
        zone?: string;
        pokemonLevel?: { min?: number; max?: number };
        pokemonType?: string | string[];
        isShiny?: boolean;
        isWild?: boolean;
        perfectIV?: boolean;
        battleType?: 'wild' | 'trainer' | 'gym' | 'elite4' | 'champion';
        consecutive?: boolean;
        perfectScore?: boolean;
        noDamage?: boolean;
        itemRarity?: RewardRarity;
        firstTime?: boolean;
        playerLevel?: { min?: number; max?: number };
        hasItem?: string | string[];
        hasBadge?: string | string[];
        completedQuest?: string | string[];
      };
      
      // 🆕 NOUVEAUX : Métadonnées
      metadata?: {
        icon?: string;
        color?: string;
        priority?: number;
        hidden?: boolean;
        autoValidate?: boolean;
        repeatable?: boolean;
        optional?: boolean;
        category?: string;
        difficulty?: number;
        estimatedTime?: number;
      };
    }>;
    rewards?: Array<{
      type: QuestRewardType;        // ✅ ÉTENDU : Tous les nouveaux types
      itemId?: string;
      amount?: number;
      pokemonId?: number;
      
      // 🆕 NOUVEAUX : Champs étendus pour nouveaux types
      badgeId?: string;
      titleId?: string;
      accessId?: string;
      recipeId?: string;
      moveId?: string;
      unlockId?: string;
      boostId?: string;
      cosmeticId?: string;
      
      // 🆕 NOUVEAUX : Métadonnées de récompense
      rarity?: RewardRarity;        // ✅ ÉTENDU : Toutes les raretés
      temporary?: boolean;
      duration?: number;
      description?: string;
      
      // 🆕 NOUVEAUX : Conditions d'attribution
      conditions?: {
        levelMin?: number;
        completedWithoutDeath?: boolean;
        perfectScore?: boolean;
        timeLimit?: number;
      };
    }>;
    
    // 🆕 NOUVEAUX : Métadonnées d'étape
    type?: 'normal' | 'tutorial' | 'boss' | 'puzzle' | 'choice' | 'timed' | 'stealth' | 'collection' | 'social' | 'finale';
    skippable?: boolean;
    timeLimit?: number;
    objectiveLogic?: 'AND' | 'OR' | 'SEQUENCE';
    minimumObjectives?: number;
  }>;
  
  // === MÉTADONNÉES ÉTENDUES ===
  isActive: boolean;               // Quête active ou désactivée
  version: string;                 // Version des données
  lastUpdated: Date;
  sourceFile?: string;             // Fichier source original (pour migration)
  tags?: string[];                 // Tags pour catégorisation
  
  // 🆕 NOUVEAUX : Métadonnées avancées
  metadata?: {
    icon?: string;
    color?: string;
    banner?: string;
    priority?: number;
    featured?: boolean;
    difficulty?: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    estimatedTime?: number;
    playerCount?: { min: number; max: number };
    chapter?: string;
    storyline?: string;
    characters?: string[];
    locations?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    keywords?: string[];
    completionRate?: number;
    averageTime?: number;
  };
  
  // 🆕 NOUVEAUX : Configuration avancée
  config?: {
    autoStart?: boolean;
    abandonable?: boolean;
    shareable?: boolean;
    timeLimit?: number;
    maxAttempts?: number;
    playerLimit?: number;
    levelRequirement?: { min?: number; max?: number };
    regionLocked?: string[];
    seasonLocked?: string[];
  };
  
  // === MÉTHODES D'INSTANCE ===
  toQuestDefinition(): QuestDefinition;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, completedQuests: string[]): boolean;
  
  // 🆕 NOUVELLES MÉTHODES
  validateExtendedData(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  migrateToLatestVersion(): Promise<void>;
}

// Interface pour les méthodes statiques
export interface IQuestDataModel extends Model<IQuestData> {
  findByCategory(category: string): Promise<IQuestData[]>;
  findByNpc(npcId: number, type: 'start' | 'end'): Promise<IQuestData[]>;
  findActiveQuests(): Promise<IQuestData[]>;
  findRepeatableQuests(): Promise<IQuestData[]>;
  bulkImportFromJson(questsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonQuest: any): Promise<IQuestData & Document>;
  
  // 🆕 NOUVELLES MÉTHODES STATIQUES
  findByDifficulty(difficulty: string): Promise<IQuestData[]>;
  findFeatured(): Promise<IQuestData[]>;
  findByEstimatedTime(minTime?: number, maxTime?: number): Promise<IQuestData[]>;
  validateDatabaseIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
  migrateAllToLatestVersion(): Promise<{ migrated: number; errors: string[] }>;
}

// ===== CONSTANTES POUR VALIDATION =====

// ✅ TYPES D'OBJECTIFS ÉTENDUS (compatible + nouveaux)
const OBJECTIVE_TYPES = [
  // Types existants (rétrocompatibilité)
  'collect', 'defeat', 'talk', 'reach', 'deliver',
  // Types étendus (nouveaux)
  'catch', 'encounter', 'use', 'win', 'explore',
  // Types avancés (futures fonctionnalités)
  'breeding', 'temporal', 'contest', 'ecosystem', 'mystery'
] as const;

// ✅ TYPES DE RÉCOMPENSES ÉTENDUS (compatible + nouveaux)
const REWARD_TYPES = [
  // Types existants (rétrocompatibilité)
  'gold', 'item', 'pokemon', 'experience',
  // Types étendus (nouveaux)
  'badge', 'title', 'access', 'recipe', 'move', 'unlock', 'boost', 'cosmetic'
] as const;

// ✅ CATÉGORIES DE QUÊTES ÉTENDUES (compatible + nouvelles)
const QUEST_CATEGORIES = [
  // Catégories existantes (rétrocompatibilité)
  'main', 'side', 'daily', 'repeatable',
  // Nouvelles catégories
  'tutorial', 'event', 'guild', 'pvp', 'exploration', 'collection', 'challenge', 'seasonal', 'achievement', 'hidden'
] as const;

// ✅ RARETÉS ÉTENDUES
const REWARD_RARITIES = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'artifact'
] as const;

// ===== SCHÉMAS ÉTENDUS =====

// Schéma pour les conditions d'objectif
const ObjectiveConditionsSchema = new Schema({
  timeOfDay: { 
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night']
  },
  weather: { 
    type: String,
    enum: ['sunny', 'rain', 'snow', 'fog', 'storm']
  },
  season: { 
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter']
  },
  location: { 
    type: Schema.Types.Mixed // String ou Array
  },
  mapId: { 
    type: Schema.Types.Mixed // String ou Array
  },
  zone: { 
    type: String,
    trim: true
  },
  pokemonLevel: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  pokemonType: { 
    type: Schema.Types.Mixed // String ou Array
  },
  isShiny: { type: Boolean },
  isWild: { type: Boolean },
  perfectIV: { type: Boolean },
  battleType: { 
    type: String,
    enum: ['wild', 'trainer', 'gym', 'elite4', 'champion']
  },
  consecutive: { type: Boolean },
  perfectScore: { type: Boolean },
  noDamage: { type: Boolean },
  itemRarity: { 
    type: String,
    enum: REWARD_RARITIES
  },
  firstTime: { type: Boolean },
  playerLevel: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  hasItem: { 
    type: Schema.Types.Mixed // String ou Array
  },
  hasBadge: { 
    type: Schema.Types.Mixed // String ou Array
  },
  completedQuest: { 
    type: Schema.Types.Mixed // String ou Array
  }
}, { _id: false });

// Schéma pour les métadonnées d'objectif
const ObjectiveMetadataSchema = new Schema({
  icon: { 
    type: String,
    trim: true,
    maxlength: [50, 'Icon name too long']
  },
  color: { 
    type: String,
    trim: true,
    match: [/^#[0-9A-F]{6}$/i, 'Invalid color format']
  },
  priority: { 
    type: Number,
    min: [0, 'Priority cannot be negative'],
    max: [10, 'Priority too high']
  },
  hidden: { type: Boolean, default: false },
  autoValidate: { type: Boolean, default: false },
  repeatable: { type: Boolean, default: false },
  optional: { type: Boolean, default: false },
  category: { 
    type: String,
    trim: true,
    maxlength: [50, 'Category too long']
  },
  difficulty: { 
    type: Number,
    min: [1, 'Difficulty too low'],
    max: [10, 'Difficulty too high']
  },
  estimatedTime: { 
    type: Number,
    min: [0, 'Estimated time cannot be negative']
  }
}, { _id: false });

// Schéma pour les conditions de récompense
const RewardConditionsSchema = new Schema({
  levelMin: { 
    type: Number,
    min: [1, 'Level minimum must be positive']
  },
  completedWithoutDeath: { type: Boolean },
  perfectScore: { type: Boolean },
  timeLimit: { 
    type: Number,
    min: [0, 'Time limit cannot be negative']
  }
}, { _id: false });

// Schéma pour les récompenses ÉTENDU
const RewardSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: {
      values: REWARD_TYPES,
      message: 'Invalid reward type: {VALUE}. Allowed: ' + REWARD_TYPES.join(', ')
    },
    index: true
  },
  
  // Champs existants
  itemId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Item ID too long']
  },
  amount: { 
    type: Number,
    min: [0, 'Amount cannot be negative'],
    max: [999999999, 'Amount too large']
  },
  pokemonId: { 
    type: Number,
    min: [1, 'Pokemon ID must be positive']
  },
  
  // 🆕 NOUVEAUX CHAMPS pour types étendus
  badgeId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Badge ID too long']
  },
  titleId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Title ID too long']
  },
  accessId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Access ID too long']
  },
  recipeId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Recipe ID too long']
  },
  moveId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Move ID too long']
  },
  unlockId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Unlock ID too long']
  },
  boostId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Boost ID too long']
  },
  cosmeticId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Cosmetic ID too long']
  },
  
  // 🆕 MÉTADONNÉES étendues
  rarity: { 
    type: String,
    enum: {
      values: REWARD_RARITIES,
      message: 'Invalid rarity: {VALUE}. Allowed: ' + REWARD_RARITIES.join(', ')
    },
    default: 'common',
    index: true
  },
  temporary: { 
    type: Boolean,
    default: false
  },
  duration: { 
    type: Number,
    min: [0, 'Duration cannot be negative'],
    max: [525600, 'Duration too long (max 1 year in minutes)']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [500, 'Reward description too long']
  },
  
  // 🆕 CONDITIONS d'attribution
  conditions: { 
    type: RewardConditionsSchema,
    default: undefined
  }
}, { _id: false });

// Schéma pour les objectifs ÉTENDU
const ObjectiveSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Objective ID too long']
  },
  type: { 
    type: String, 
    required: true,
    enum: {
      values: OBJECTIVE_TYPES,
      message: 'Invalid objective type: {VALUE}. Allowed: ' + OBJECTIVE_TYPES.join(', ')
    },
    index: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [1000, 'Description too long']
  },
  target: { 
    type: String,
    trim: true,
    maxlength: [200, 'Target too long']
  },
  targetName: { 
    type: String,
    trim: true,
    maxlength: [200, 'Target name too long']
  },
  itemId: { 
    type: String,
    trim: true,
    maxlength: [100, 'Item ID too long']
  },
  requiredAmount: { 
    type: Number, 
    required: true,
    min: [1, 'Required amount must be positive'],
    max: [999999, 'Required amount too large']
  },
  validationDialogue: [{ 
    type: String,
    trim: true,
    maxlength: [500, 'Validation dialogue too long']
  }],
  
  // 🆕 NOUVEAUX : Conditions avancées
  conditions: { 
    type: ObjectiveConditionsSchema,
    default: undefined
  },
  
  // 🆕 NOUVEAUX : Métadonnées
  metadata: { 
    type: ObjectiveMetadataSchema,
    default: undefined
  }
}, { _id: false });

// Schéma pour les étapes ÉTENDU
const StepSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Step ID too long']
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [300, 'Step name too long']
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [2000, 'Step description too long']
  },
  objectives: {
    type: [ObjectiveSchema],
    required: true,
    validate: {
      validator: function(objectives: any[]) {
        return objectives && objectives.length > 0;
      },
      message: 'Step must have at least one objective'
    }
  },
  rewards: [RewardSchema],
  
  // 🆕 NOUVEAUX : Métadonnées d'étape
  type: { 
    type: String,
    enum: ['normal', 'tutorial', 'boss', 'puzzle', 'choice', 'timed', 'stealth', 'collection', 'social', 'finale'],
    default: 'normal'
  },
  skippable: { 
    type: Boolean,
    default: false
  },
  timeLimit: { 
    type: Number,
    min: [0, 'Time limit cannot be negative']
  },
  objectiveLogic: { 
    type: String,
    enum: ['AND', 'OR', 'SEQUENCE'],
    default: 'AND'
  },
  minimumObjectives: { 
    type: Number,
    min: [1, 'Minimum objectives must be positive']
  }
}, { _id: false });

// Schéma pour les dialogues ÉTENDU
const DialoguesSchema = new Schema({
  questOffer: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest offer dialogue too long']
  }],
  questInProgress: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest in progress dialogue too long']
  }],
  questComplete: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest complete dialogue too long']
  }],
  
  // 🆕 NOUVEAUX : Dialogues étendus
  questFailed: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest failed dialogue too long']
  }],
  questAbandoned: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest abandoned dialogue too long']
  }],
  questUnavailable: [{ 
    type: String,
    trim: true,
    maxlength: [1000, 'Quest unavailable dialogue too long']
  }],
  stepComplete: { 
    type: Schema.Types.Mixed,
    default: undefined
  },
  objectiveComplete: { 
    type: Schema.Types.Mixed,
    default: undefined
  }
}, { _id: false });

// Schéma pour métadonnées avancées
const QuestMetadataSchema = new Schema({
  icon: { 
    type: String,
    trim: true,
    maxlength: [100, 'Icon too long']
  },
  color: { 
    type: String,
    trim: true,
    match: [/^#[0-9A-F]{6}$/i, 'Invalid color format']
  },
  banner: { 
    type: String,
    trim: true,
    maxlength: [200, 'Banner URL too long']
  },
  priority: { 
    type: Number,
    min: [0, 'Priority cannot be negative'],
    max: [100, 'Priority too high']
  },
  featured: { 
    type: Boolean,
    default: false,
    index: true
  },
  difficulty: { 
    type: String,
    enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard'],
    default: 'medium',
    index: true
  },
  estimatedTime: { 
    type: Number,
    min: [0, 'Estimated time cannot be negative']
  },
  playerCount: {
    min: { type: Number, min: 1, default: 1 },
    max: { type: Number, min: 1, default: 1 }
  },
  chapter: { 
    type: String,
    trim: true,
    maxlength: [100, 'Chapter name too long']
  },
  storyline: { 
    type: String,
    trim: true,
    maxlength: [100, 'Storyline name too long']
  },
  characters: [{ 
    type: String,
    trim: true,
    maxlength: [100, 'Character name too long']
  }],
  locations: [{ 
    type: String,
    trim: true,
    maxlength: [100, 'Location name too long']
  }],
  createdBy: { 
    type: String,
    trim: true,
    maxlength: [100, 'Creator name too long']
  },
  keywords: [{ 
    type: String,
    trim: true,
    maxlength: [50, 'Keyword too long']
  }],
  completionRate: { 
    type: Number,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100%']
  },
  averageTime: { 
    type: Number,
    min: [0, 'Average time cannot be negative']
  }
}, { _id: false });

// Schéma pour configuration avancée
const QuestConfigSchema = new Schema({
  autoStart: { 
    type: Boolean,
    default: false
  },
  abandonable: { 
    type: Boolean,
    default: true
  },
  shareable: { 
    type: Boolean,
    default: false
  },
  timeLimit: { 
    type: Number,
    min: [0, 'Time limit cannot be negative']
  },
  maxAttempts: { 
    type: Number,
    min: [1, 'Max attempts must be positive'],
    max: [100, 'Max attempts too high']
  },
  playerLimit: { 
    type: Number,
    min: [1, 'Player limit must be positive']
  },
  levelRequirement: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  regionLocked: [{ 
    type: String,
    trim: true
  }],
  seasonLocked: [{ 
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter']
  }]
}, { _id: false });

// ===== SCHÉMA PRINCIPAL ÉTENDU =====

const QuestDataSchema = new Schema<IQuestData>({
  // === IDENTIFICATION ===
  questId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    maxlength: [150, 'Quest ID too long'],
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [300, 'Quest name too long']
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [3000, 'Quest description too long']
  },
  category: { 
    type: String, 
    required: true,
    enum: {
      values: QUEST_CATEGORIES,
      message: 'Invalid quest category: {VALUE}. Allowed: ' + QUEST_CATEGORIES.join(', ')
    },
    index: true
  },
  
  // === CONFIGURATION ===
  prerequisites: [{ 
    type: String,
    trim: true,
    maxlength: [100, 'Prerequisite ID too long']
  }],
  startNpcId: { 
    type: Number,
    min: [1, 'Start NPC ID must be positive'],
    index: true
  },
  endNpcId: { 
    type: Number,
    min: [1, 'End NPC ID must be positive'],
    index: true
  },
  isRepeatable: { 
    type: Boolean, 
    default: false,
    index: true
  },
  cooldownHours: { 
    type: Number,
    min: [0, 'Cooldown cannot be negative'],
    max: [8760, 'Cooldown too long'] // Max 1 an
  },
  autoComplete: { 
    type: Boolean, 
    default: true
  },
  
  // === DIALOGUES ÉTENDUS ===
  dialogues: { 
    type: DialoguesSchema,
    default: undefined
  },
  
  // === ÉTAPES ÉTENDUES ===
  steps: { 
    type: [StepSchema], 
    required: true,
    validate: {
      validator: function(steps: any[]) {
        return steps && steps.length > 0;
      },
      message: 'Quest must have at least one step'
    }
  },
  
  // === MÉTADONNÉES EXISTANTES ===
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  version: { 
    type: String, 
    default: '2.0.0', // ✅ Version bumped pour migration
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
  tags: [{ 
    type: String,
    trim: true,
    maxlength: [100, 'Tag too long']
  }],
  
  // 🆕 NOUVEAUX : Métadonnées avancées
  metadata: { 
    type: QuestMetadataSchema,
    default: undefined
  },
  
  // 🆕 NOUVEAUX : Configuration avancée
  config: { 
    type: QuestConfigSchema,
    default: undefined
  }
}, {
  timestamps: true,
  collection: 'quest_data',
  minimize: false,
  versionKey: '__v'
});

// ===== INDEX COMPOSITES ÉTENDUS =====

// Index existants (conservés)
QuestDataSchema.index({ startNpcId: 1, isActive: 1 });
QuestDataSchema.index({ endNpcId: 1, isActive: 1 });
QuestDataSchema.index({ category: 1, isActive: 1 });
QuestDataSchema.index({ isRepeatable: 1, isActive: 1 });

// 🆕 NOUVEAUX INDEX pour fonctionnalités étendues
QuestDataSchema.index({ 'metadata.difficulty': 1, isActive: 1 });
QuestDataSchema.index({ 'metadata.featured': 1, isActive: 1 });
QuestDataSchema.index({ 'metadata.estimatedTime': 1, isActive: 1 });
QuestDataSchema.index({ 'metadata.priority': 1, isActive: 1 });
QuestDataSchema.index({ version: 1 });

// Index de recherche textuelle étendu
QuestDataSchema.index({ 
  name: 'text', 
  description: 'text',
  tags: 'text',
  'metadata.keywords': 'text'
});

// ===== VALIDATIONS PRE-SAVE ÉTENDUES =====

QuestDataSchema.pre('save', function(next) {
  try {
    // Validation existante (conservée)
    if (this.steps && this.steps.length > 0) {
      for (const step of this.steps) {
        if (!step.objectives || step.objectives.length === 0) {
          return next(new Error(`Step "${step.name}" must have at least one objective`));
        }
        
        // 🆕 NOUVELLE VALIDATION : Logic d'objectifs
        if (step.minimumObjectives && step.minimumObjectives > step.objectives.length) {
          return next(new Error(`Step "${step.name}": minimumObjectives (${step.minimumObjectives}) cannot exceed total objectives (${step.objectives.length})`));
        }
      }
    }
    
    // Validation NPC (conservée)
    if (this.startNpcId && this.endNpcId && this.startNpcId === this.endNpcId) {
      console.warn(`Quest ${this.questId}: Start and end NPC are the same`);
    }
    
    // 🆕 NOUVELLE VALIDATION : Configuration cohérente
    if (this.config?.levelRequirement?.min && this.config?.levelRequirement?.max) {
      if (this.config.levelRequirement.min > this.config.levelRequirement.max) {
        return next(new Error(`Quest ${this.questId}: Level requirement min cannot exceed max`));
      }
    }
    
    // 🆕 NOUVELLE VALIDATION : Métadonnées cohérentes
    if (this.metadata?.playerCount?.min && this.metadata?.playerCount?.max) {
      if (this.metadata.playerCount.min > this.metadata.playerCount.max) {
        return next(new Error(`Quest ${this.questId}: Player count min cannot exceed max`));
      }
    }
    
    // Nettoyage des données (conservé + étendu)
    if (this.prerequisites) {
      this.prerequisites = this.prerequisites.filter(p => p && p.trim().length > 0);
    }
    
    if (this.tags) {
      this.tags = [...new Set(this.tags.filter(t => t && t.trim().length > 0))];
    }
    
    // 🆕 NOUVEAU : Nettoyage keywords
    if (this.metadata?.keywords) {
      this.metadata.keywords = [...new Set(this.metadata.keywords.filter(k => k && k.trim().length > 0))];
    }
    
    // 🆕 NOUVEAU : Auto-set metadata timestamps
    if (this.metadata) {
      if (!this.metadata.createdAt && this.isNew) {
        this.metadata.createdAt = new Date();
      }
      this.metadata.updatedAt = new Date();
    }
    
    // Mise à jour timestamp (conservé)
    this.lastUpdated = new Date();
    
    next();
    
  } catch (error) {
    next(error instanceof Error ? error : new Error('Validation error'));
  }
});

// ===== MÉTHODES D'INSTANCE ÉTENDUES =====

/**
 * Convertit le document MongoDB au format QuestDefinition (ÉTENDU)
 */
QuestDataSchema.methods.toQuestDefinition = function(this: IQuestData): QuestDefinition {
  return {
    id: this.questId,
    name: this.name,
    description: this.description,
    category: this.category,
    prerequisites: this.prerequisites,
    startNpcId: this.startNpcId,
    endNpcId: this.endNpcId,
    isRepeatable: this.isRepeatable,
    cooldownHours: this.cooldownHours,
    autoComplete: this.autoComplete,
    dialogues: this.dialogues,
    steps: this.steps.map(step => ({
      id: step.id,
      name: step.name,
      description: step.description,
      objectives: step.objectives.map(obj => ({
        id: obj.id,
        type: obj.type,
        description: obj.description,
        target: obj.target,
        targetName: obj.targetName,
        itemId: obj.itemId,
        requiredAmount: obj.requiredAmount,
        validationDialogue: obj.validationDialogue,
        // 🆕 NOUVEAUX CHAMPS
        conditions: obj.conditions,
        metadata: obj.metadata
      })),
      rewards: step.rewards,
      // 🆕 NOUVEAUX CHAMPS D'ÉTAPE
      type: step.type,
      skippable: step.skippable,
      timeLimit: step.timeLimit,
      objectiveLogic: step.objectiveLogic,
      minimumObjectives: step.minimumObjectives
    })),
    // 🆕 NOUVEAUX CHAMPS DE QUÊTE
    metadata: this.metadata,
    config: this.config
  };
};

/**
 * Met à jour les données depuis un objet JSON (ÉTENDU)
 */
QuestDataSchema.methods.updateFromJson = async function(
  this: IQuestData,
  jsonData: any
): Promise<void> {
  // Propriétés de base (conservées)
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.description) this.description = jsonData.description;
  if (jsonData.category) this.category = jsonData.category;
  
  // Configuration (conservée)
  if (jsonData.prerequisites) this.prerequisites = jsonData.prerequisites;
  if (jsonData.startNpcId) this.startNpcId = jsonData.startNpcId;
  if (jsonData.endNpcId) this.endNpcId = jsonData.endNpcId;
  if (typeof jsonData.isRepeatable === 'boolean') this.isRepeatable = jsonData.isRepeatable;
  if (jsonData.cooldownHours) this.cooldownHours = jsonData.cooldownHours;
  if (typeof jsonData.autoComplete === 'boolean') this.autoComplete = jsonData.autoComplete;
  
  // Dialogues (conservé)
  if (jsonData.dialogues) this.dialogues = jsonData.dialogues;
  
  // Étapes (conservé)
  if (jsonData.steps) this.steps = jsonData.steps;
  
  // Tags (conservé)
  if (jsonData.tags) this.tags = jsonData.tags;
  
  // 🆕 NOUVEAUX : Métadonnées
  if (jsonData.metadata) {
    this.metadata = { ...this.metadata, ...jsonData.metadata };
  }
  
  // 🆕 NOUVEAUX : Configuration
  if (jsonData.config) {
    this.config = { ...this.config, ...jsonData.config };
  }
  
  await this.save();
};

/**
 * Vérifie si la quête est disponible pour un joueur (ÉTENDU)
 */
QuestDataSchema.methods.isAvailableForPlayer = function(
  this: IQuestData,
  playerLevel: number,
  completedQuests: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  // Vérifier les prérequis (conservé)
  if (this.prerequisites && this.prerequisites.length > 0) {
    const hasAllPrerequisites = this.prerequisites.every(prereq => 
      completedQuests.includes(prereq)
    );
    if (!hasAllPrerequisites) return false;
  }
  
  // 🆕 NOUVELLE VALIDATION : Niveau requis
  if (this.config?.levelRequirement) {
    if (this.config.levelRequirement.min && playerLevel < this.config.levelRequirement.min) {
      return false;
    }
    if (this.config.levelRequirement.max && playerLevel > this.config.levelRequirement.max) {
      return false;
    }
  }
  
  // TODO: 🆕 Ajouter d'autres vérifications (région, saison, etc.)
  
  return true;
};

/**
 * 🆕 NOUVELLE MÉTHODE : Valide les données étendues
 */
QuestDataSchema.methods.validateExtendedData = async function(
  this: IQuestData
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const result = { valid: true, errors: [] as string[], warnings: [] as string[] };
  
  try {
    // Validation des nouveaux types d'objectifs
    for (const step of this.steps) {
      for (const objective of step.objectives) {
        // Vérifier types d'objectifs avancés
        if (['breeding', 'temporal', 'contest', 'ecosystem', 'mystery'].includes(objective.type)) {
          if (!objective.conditions) {
            result.warnings.push(`Advanced objective type "${objective.type}" should have conditions defined`);
          }
        }
        
        // Vérifier cohérence des conditions
        if (objective.conditions?.pokemonLevel) {
          const { min, max } = objective.conditions.pokemonLevel;
          if (min && max && min > max) {
            result.errors.push(`Objective ${objective.id}: Pokemon level min (${min}) > max (${max})`);
            result.valid = false;
          }
        }
      }
      
      // Validation nouveaux types de récompenses
      if (step.rewards) {
        for (const reward of step.rewards) {
          // Vérifier nouveaux types
          if (['badge', 'title', 'access', 'recipe', 'move', 'unlock', 'boost', 'cosmetic'].includes(reward.type)) {
            const idField = `${reward.type}Id` as keyof typeof reward;
            if (!(reward as any)[idField]) {
              result.errors.push(`Reward type "${reward.type}" requires ${idField} field`);
              result.valid = false;
            }
          }
          
          // Vérifier récompenses temporaires
          if (reward.temporary && !reward.duration) {
            result.warnings.push(`Temporary reward "${reward.type}" should have duration specified`);
          }
        }
      }
    }
    
    // Validation métadonnées
    if (this.metadata?.completionRate && (this.metadata.completionRate < 0 || this.metadata.completionRate > 100)) {
      result.errors.push(`Completion rate must be between 0 and 100`);
      result.valid = false;
    }
    
  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

/**
 * 🆕 NOUVELLE MÉTHODE : Migration vers la dernière version
 */
QuestDataSchema.methods.migrateToLatestVersion = async function(this: IQuestData): Promise<void> {
  const currentVersion = this.version || '1.0.0';
  
  if (currentVersion === '2.0.0') {
    return; // Déjà à jour
  }
  
  console.log(`🔄 Migrating quest ${this.questId} from version ${currentVersion} to 2.0.0`);
  
  // Migration 1.0.0 → 2.0.0
  if (currentVersion === '1.0.0') {
    // Ajouter métadonnées par défaut
    if (!this.metadata) {
      this.metadata = {
        difficulty: 'medium',
        estimatedTime: 30, // 30 minutes par défaut
        createdAt: this.createdAt || new Date(),
        updatedAt: new Date()
      };
    }
    
    // Ajouter configuration par défaut
    if (!this.config) {
      this.config = {
        autoStart: false,
        abandonable: true,
        shareable: false
      };
    }
    
    // Migrer les étapes vers nouveaux formats
    for (const step of this.steps) {
      if (!step.type) {
        step.type = 'normal';
      }
      if (!step.objectiveLogic) {
        step.objectiveLogic = 'AND';
      }
    }
  }
  
  this.version = '2.0.0';
  await this.save();
  
  console.log(`✅ Quest ${this.questId} migrated successfully`);
};

// ===== MÉTHODES STATIQUES ÉTENDUES =====

/**
 * Trouve les quêtes par catégorie (conservé)
 */
QuestDataSchema.statics.findByCategory = function(category: string): Promise<IQuestData[]> {
  return this.find({ category, isActive: true }).sort({ questId: 1 });
};

/**
 * Trouve les quêtes par NPC (conservé)
 */
QuestDataSchema.statics.findByNpc = function(
  npcId: number,
  type: 'start' | 'end'
): Promise<IQuestData[]> {
  const query: any = { isActive: true };
  if (type === 'start') {
    query.startNpcId = npcId;
  } else {
    query.endNpcId = npcId;
  }
  
  return this.find(query).sort({ questId: 1 });
};

/**
 * Trouve toutes les quêtes actives (conservé)
 */
QuestDataSchema.statics.findActiveQuests = function(): Promise<IQuestData[]> {
  return this.find({ isActive: true }).sort({ category: 1, questId: 1 });
};

/**
 * Trouve les quêtes répétables (conservé)
 */
QuestDataSchema.statics.findRepeatableQuests = function(): Promise<IQuestData[]> {
  return this.find({ isRepeatable: true, isActive: true }).sort({ questId: 1 });
};

/**
 * 🆕 NOUVELLE MÉTHODE : Trouve par difficulté
 */
QuestDataSchema.statics.findByDifficulty = function(difficulty: string): Promise<IQuestData[]> {
  return this.find({ 'metadata.difficulty': difficulty, isActive: true }).sort({ questId: 1 });
};

/**
 * 🆕 NOUVELLE MÉTHODE : Trouve les quêtes en vedette
 */
QuestDataSchema.statics.findFeatured = function(): Promise<IQuestData[]> {
  return this.find({ 'metadata.featured': true, isActive: true }).sort({ 'metadata.priority': -1, questId: 1 });
};

/**
 * 🆕 NOUVELLE MÉTHODE : Trouve par temps estimé
 */
QuestDataSchema.statics.findByEstimatedTime = function(
  minTime?: number,
  maxTime?: number
): Promise<IQuestData[]> {
  const query: any = { isActive: true };
  
  if (minTime || maxTime) {
    query['metadata.estimatedTime'] = {};
    if (minTime) query['metadata.estimatedTime'].$gte = minTime;
    if (maxTime) query['metadata.estimatedTime'].$lte = maxTime;
  }
  
  return this.find(query).sort({ 'metadata.estimatedTime': 1, questId: 1 });
};

/**
 * Import en masse depuis JSON (ÉTENDU)
 */
QuestDataSchema.statics.bulkImportFromJson = async function(
  questsData: any
): Promise<{ success: number; errors: string[] }> {
  const results: { success: number; errors: string[] } = { success: 0, errors: [] };
  
  if (!questsData.quests || !Array.isArray(questsData.quests)) {
    results.errors.push('Invalid quests data format');
    return results;
  }
  
  for (const jsonQuest of questsData.quests) {
    try {
      await (this as IQuestDataModel).createFromJson(jsonQuest);
      results.success++;
    } catch (error) {
      results.errors.push(`Quest ${jsonQuest.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

/**
 * Crée une quête depuis des données JSON (ÉTENDU)
 */
QuestDataSchema.statics.createFromJson = async function(
  jsonQuest: any
): Promise<IQuestData & Document> {
  // Validation de base (conservée)
  if (!jsonQuest.id || !jsonQuest.name || !jsonQuest.steps) {
    throw new Error('Missing required fields: id, name, steps');
  }
  
  // Vérifier si existe déjà
  const existing = await this.findOne({ questId: jsonQuest.id });
  if (existing) {
    // Mettre à jour existant
    await existing.updateFromJson(jsonQuest);
    return existing;
  }
  
  // Créer nouveau (ÉTENDU)
  const questData = new this({
    questId: jsonQuest.id,
    name: jsonQuest.name,
    description: jsonQuest.description || '',
    category: jsonQuest.category || 'side',
    prerequisites: jsonQuest.prerequisites,
    startNpcId: jsonQuest.startNpcId,
    endNpcId: jsonQuest.endNpcId,
    isRepeatable: jsonQuest.isRepeatable || false,
    cooldownHours: jsonQuest.cooldownHours,
    autoComplete: jsonQuest.autoComplete !== false, // Par défaut true
    dialogues: jsonQuest.dialogues,
    steps: jsonQuest.steps,
    version: '2.0.0', // ✅ Nouvelle version
    sourceFile: jsonQuest.sourceFile || 'imported',
    tags: jsonQuest.tags,
    // 🆕 NOUVEAUX CHAMPS
    metadata: jsonQuest.metadata || {
      difficulty: 'medium',
      estimatedTime: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    config: jsonQuest.config || {
      autoStart: false,
      abandonable: true,
      shareable: false
    }
  });
  
  await questData.save();
  return questData as IQuestData & Document;
};

/**
 * 🆕 NOUVELLE MÉTHODE : Valide l'intégrité de la base de données
 */
QuestDataSchema.statics.validateDatabaseIntegrity = async function(): Promise<{ valid: boolean; issues: string[] }> {
  const result = { valid: true, issues: [] as string[] };
  
  try {
    // Vérifier les prérequis orphelins
    const allQuests = await this.find({}).select('questId prerequisites');
    const validQuestIds = new Set(allQuests.map(q => q.questId));
    
    for (const quest of allQuests) {
      if (quest.prerequisites) {
        for (const prereq of quest.prerequisites) {
          if (!validQuestIds.has(prereq)) {
            result.issues.push(`Quest ${quest.questId} has invalid prerequisite: ${prereq}`);
            result.valid = false;
          }
        }
      }
    }
    
    // Vérifier les versions obsolètes
    const oldVersions = await this.countDocuments({ version: { $ne: '2.0.0' } });
    if (oldVersions > 0) {
      result.issues.push(`${oldVersions} quests need migration to version 2.0.0`);
    }
    
    // Vérifier les données corrompues
    const invalidData = await this.find({
      $or: [
        { steps: { $size: 0 } },
        { name: { $in: ['', null] } },
        { category: { $nin: QUEST_CATEGORIES } }
      ]
    }).select('questId name category steps');
    
    for (const quest of invalidData) {
      result.issues.push(`Quest ${quest.questId} has invalid data`);
      result.valid = false;
    }
    
  } catch (error) {
    result.issues.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
};

/**
 * 🆕 NOUVELLE MÉTHODE : Migre toutes les quêtes vers la dernière version
 */
QuestDataSchema.statics.migrateAllToLatestVersion = async function(): Promise<{ migrated: number; errors: string[] }> {
  const result = { migrated: 0, errors: [] as string[] };
  
  try {
    const oldQuests = await this.find({ version: { $ne: '2.0.0' } });
    
    console.log(`🔄 Starting migration of ${oldQuests.length} quests...`);
    
    for (const quest of oldQuests) {
      try {
        await quest.migrateToLatestVersion();
        result.migrated++;
      } catch (error) {
        result.errors.push(`Quest ${quest.questId}: ${error instanceof Error ? error.message : 'Migration failed'}`);
      }
    }
    
    console.log(`✅ Migration completed: ${result.migrated} quests migrated, ${result.errors.length} errors`);
    
  } catch (error) {
    result.errors.push(`Global migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
};

// ===== EXPORT =====
export const QuestData = mongoose.model<IQuestData, IQuestDataModel>('QuestData', QuestDataSchema);

// Types d'export
export type QuestDataDocument = IQuestData;
export type CreateQuestData = Partial<Pick<IQuestData, 
  'questId' | 'name' | 'description' | 'category' | 'steps' | 'metadata' | 'config'
>>;

// ===== UTILITAIRES DE MIGRATION =====

/**
 * 🆕 Fonction utilitaire pour migration en une commande
 */
export async function migrateQuestDatabase(): Promise<void> {
  console.log('🚀 Starting quest database migration...');
  
  try {
    // 1. Valider l'intégrité
    const integrity = await QuestData.validateDatabaseIntegrity();
    if (!integrity.valid) {
      console.warn('⚠️ Database integrity issues found:', integrity.issues);
    }
    
    // 2. Migrer toutes les quêtes
    const migration = await QuestData.migrateAllToLatestVersion();
    console.log(`✅ Migration completed: ${migration.migrated} quests migrated`);
    
    if (migration.errors.length > 0) {
      console.error('❌ Migration errors:', migration.errors);
    }
    
    // 3. Vérification finale
    const finalCheck = await QuestData.countDocuments({ version: '2.0.0' });
    const totalQuests = await QuestData.countDocuments({});
    
    console.log(`📊 Migration summary: ${finalCheck}/${totalQuests} quests on version 2.0.0`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// ===== LOG DE MIGRATION =====
console.log(`📦 QuestData schema loaded with extended types:
- Objective types: ${OBJECTIVE_TYPES.length} (${OBJECTIVE_TYPES.slice(-5).join(', ')})
- Reward types: ${REWARD_TYPES.length} (${REWARD_TYPES.slice(-4).join(', ')})
- Quest categories: ${QUEST_CATEGORIES.length} (${QUEST_CATEGORIES.slice(-3).join(', ')})
- Reward rarities: ${REWARD_RARITIES.length} (${REWARD_RARITIES.slice(-3).join(', ')})
✅ Ready for progressive migration to version 2.0.0`);
