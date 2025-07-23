// server/src/models/QuestData.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { QuestDefinition, QuestObjective, QuestReward } from "../types/QuestTypes";

// ===== INTERFACES =====

export interface IQuestData extends Document {
  // === IDENTIFICATION ===
  questId: string;                    // ID unique de la quête
  zone?: string;                      // Zone associée (optionnel)
  name: string;                       // Nom de la quête
  description: string;                // Description
  category: 'main' | 'side' | 'daily' | 'repeatable';
  
  // === PRÉREQUIS ET NPCS ===
  prerequisites?: string[];           // Quêtes prérequises
  startNpcId?: number;               // NPC qui donne la quête
  endNpcId?: number;                 // NPC qui termine la quête
  
  // === RÉPÉTABILITÉ ===
  isRepeatable: boolean;
  cooldownHours?: number;
  autoComplete?: boolean;            // Completion automatique ou manuelle
  
  // === DIALOGUES ===
  dialogues?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  // === ÉTAPES DE LA QUÊTE ===
  steps: Array<{
    id: string;
    name: string;
    description: string;
    objectives: Array<{
      id: string;
      type: 'collect' | 'defeat' | 'talk' | 'reach' | 'deliver';
      description: string;
      target?: string;
      targetName?: string;
      itemId?: string;
      requiredAmount: number;
      validationDialogue?: string[];
    }>;
    rewards?: Array<{
      type: 'gold' | 'item' | 'pokemon' | 'experience';
      itemId?: string;
      amount?: number;
      pokemonId?: number;
    }>;
  }>;
  
  // === CONDITIONS DE DISPONIBILITÉ ===
  availabilityConditions?: {
    minPlayerLevel?: number;
    maxPlayerLevel?: number;
    requiredBadges?: string[];
    requiredItems?: string[];
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    timeRestrictions?: {
      enabled: boolean;
      allowedTimes?: string[];
    };
    weatherRestrictions?: {
      enabled: boolean;
      allowedWeather?: string[];
    };
  };
  
  // === MÉTADONNÉES ===
  isActive: boolean;                 // Quête active ou désactivée
  version: string;                   // Version des données
  lastUpdated: Date;
  sourceFile?: string;               // Fichier source original
  createdBy?: string;                // Créateur
  tags?: string[];                   // Tags pour classification
  
  // === MÉTHODES D'INSTANCE ===
  toQuestDefinition(): QuestDefinition;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, playerFlags: string[], playerBadges: string[]): boolean;
}

// Interface pour les méthodes statiques
export interface IQuestDataModel extends Model<IQuestData> {
  findByZone(zone: string): Promise<IQuestData[]>;
  findByCategory(category: string, zone?: string): Promise<IQuestData[]>;
  findActiveQuests(zone?: string): Promise<IQuestData[]>;
  findByNpc(npcId: number, type: 'start' | 'end' | 'both'): Promise<IQuestData[]>;
  bulkImportFromJson(questsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonQuest: any, zone?: string): Promise<IQuestData>;
}

// ===== SCHÉMAS =====

// Schéma pour les objectifs
const QuestObjectiveSchema = new Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['collect', 'defeat', 'talk', 'reach', 'deliver']
  },
  description: { type: String, required: true },
  target: { type: String },
  targetName: { type: String },
  itemId: { type: String },
  requiredAmount: { 
    type: Number, 
    required: true,
    min: [1, 'Required amount must be positive']
  },
  validationDialogue: [{ type: String }]
}, { _id: false });

// Schéma pour les récompenses
const QuestRewardSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['gold', 'item', 'pokemon', 'experience']
  },
  itemId: { type: String },
  amount: { 
    type: Number,
    min: [0, 'Amount cannot be negative']
  },
  pokemonId: { type: Number }
}, { _id: false });

// Schéma pour les étapes
const QuestStepSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  objectives: [QuestObjectiveSchema],
  rewards: [QuestRewardSchema]
}, { _id: false });

// Schéma pour les dialogues
const QuestDialoguesSchema = new Schema({
  questOffer: [{ type: String }],
  questInProgress: [{ type: String }],
  questComplete: [{ type: String }]
}, { _id: false });

// Schéma pour les conditions de disponibilité
const AvailabilityConditionsSchema = new Schema({
  minPlayerLevel: { type: Number, min: 1, max: 100 },
  maxPlayerLevel: { type: Number, min: 1, max: 100 },
  requiredBadges: [{ type: String }],
  requiredItems: [{ type: String }],
  requiredFlags: [{ type: String }],
  forbiddenFlags: [{ type: String }],
  timeRestrictions: {
    enabled: { type: Boolean, default: false },
    allowedTimes: [{ type: String }]
  },
  weatherRestrictions: {
    enabled: { type: Boolean, default: false },
    allowedWeather: [{ type: String }]
  }
}, { _id: false });

// ===== SCHÉMA PRINCIPAL =====

const QuestDataSchema = new Schema<IQuestData>({
  // === IDENTIFICATION ===
  questId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Quest ID too long'],
    index: true
  },
  zone: { 
    type: String,
    trim: true,
    maxlength: [50, 'Zone name too long'],
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Quest name too long']
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [1000, 'Quest description too long']
  },
  category: { 
    type: String, 
    required: true,
    enum: {
      values: ['main', 'side', 'daily', 'repeatable'],
      message: 'Invalid quest category'
    },
    index: true
  },
  
  // === PRÉREQUIS ET NPCS ===
  prerequisites: [{ 
    type: String,
    trim: true 
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
  
  // === RÉPÉTABILITÉ ===
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
  
  // === DIALOGUES ===
  dialogues: { 
    type: QuestDialoguesSchema,
    default: undefined
  },
  
  // === ÉTAPES ===
  steps: { 
    type: [QuestStepSchema], 
    required: true,
    validate: {
      validator: function(steps: any[]) {
        return steps && steps.length > 0;
      },
      message: 'Quest must have at least one step'
    }
  },
  
  // === CONDITIONS DE DISPONIBILITÉ ===
  availabilityConditions: { 
    type: AvailabilityConditionsSchema,
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
  },
  createdBy: { 
    type: String,
    trim: true,
    maxlength: [100, 'Creator name too long']
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: [50, 'Tag too long']
  }]
}, {
  timestamps: true,
  collection: 'quest_data',
  minimize: false
});

// ===== INDEX COMPOSITES =====

// Index principal
QuestDataSchema.index({ questId: 1 }, { unique: true });

// Index pour les requêtes fréquentes
QuestDataSchema.index({ zone: 1, isActive: 1 });
QuestDataSchema.index({ category: 1, isActive: 1 });
QuestDataSchema.index({ startNpcId: 1, isActive: 1 });
QuestDataSchema.index({ endNpcId: 1, isActive: 1 });
QuestDataSchema.index({ isRepeatable: 1, isActive: 1 });

// Index pour les tags
QuestDataSchema.index({ tags: 1 });

// Index pour les prérequis
QuestDataSchema.index({ prerequisites: 1 });

// ===== VALIDATIONS PRE-SAVE =====

QuestDataSchema.pre('save', function(next) {
  // Validation de cohérence des conditions
  if (this.availabilityConditions?.minPlayerLevel && this.availabilityConditions?.maxPlayerLevel) {
    if (this.availabilityConditions.minPlayerLevel > this.availabilityConditions.maxPlayerLevel) {
      return next(new Error('Min player level cannot be greater than max player level'));
    }
  }
  
  // Validation des étapes
  if (this.steps && this.steps.length > 0) {
    for (const step of this.steps) {
      if (!step.objectives || step.objectives.length === 0) {
        return next(new Error(`Step "${step.name}" must have at least one objective`));
      }
    }
  }
  
  // Nettoyage des arrays
  if (this.prerequisites) {
    this.prerequisites = this.prerequisites.filter(p => p && p.trim().length > 0);
  }
  if (this.tags) {
    this.tags = this.tags.filter(t => t && t.trim().length > 0);
  }
  
  // Mise à jour timestamp
  this.lastUpdated = new Date();
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

/**
 * Convertit le document MongoDB au format QuestDefinition
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
        validationDialogue: obj.validationDialogue
      })),
      rewards: step.rewards
    }))
  };
};

/**
 * Met à jour les données depuis un objet JSON
 */
QuestDataSchema.methods.updateFromJson = async function(
  this: IQuestData, 
  jsonData: any
): Promise<void> {
  // Propriétés de base
  if (jsonData.name) this.name = jsonData.name;
  if (jsonData.description) this.description = jsonData.description;
  if (jsonData.category) this.category = jsonData.category;
  
  // Prérequis et NPCs
  if (jsonData.prerequisites) this.prerequisites = jsonData.prerequisites;
  if (jsonData.startNpcId) this.startNpcId = jsonData.startNpcId;
  if (jsonData.endNpcId) this.endNpcId = jsonData.endNpcId;
  
  // Répétabilité
  if (typeof jsonData.isRepeatable === 'boolean') this.isRepeatable = jsonData.isRepeatable;
  if (jsonData.cooldownHours) this.cooldownHours = jsonData.cooldownHours;
  if (typeof jsonData.autoComplete === 'boolean') this.autoComplete = jsonData.autoComplete;
  
  // Dialogues et étapes
  if (jsonData.dialogues) this.dialogues = jsonData.dialogues;
  if (jsonData.steps) this.steps = jsonData.steps;
  
  // Conditions et métadonnées
  if (jsonData.availabilityConditions) this.availabilityConditions = jsonData.availabilityConditions;
  if (jsonData.tags) this.tags = jsonData.tags;
  
  await this.save();
};

/**
 * Vérifie si la quête est disponible pour un joueur donné
 */
QuestDataSchema.methods.isAvailableForPlayer = function(
  this: IQuestData,
  playerLevel: number,
  playerFlags: string[] = [],
  playerBadges: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  const conditions = this.availabilityConditions;
  if (!conditions) return true;
  
  // Vérification niveau
  if (conditions.minPlayerLevel && playerLevel < conditions.minPlayerLevel) return false;
  if (conditions.maxPlayerLevel && playerLevel > conditions.maxPlayerLevel) return false;
  
  // Vérification badges requis
  if (conditions.requiredBadges?.length) {
    const hasAllBadges = conditions.requiredBadges.every(badge => 
      playerBadges.includes(badge)
    );
    if (!hasAllBadges) return false;
  }
  
  // Vérification flags requis
  if (conditions.requiredFlags?.length) {
    const hasAllFlags = conditions.requiredFlags.every(flag => 
      playerFlags.includes(flag)
    );
    if (!hasAllFlags) return false;
  }
  
  // Vérification flags interdits
  if (conditions.forbiddenFlags?.length) {
    const hasAnyForbidden = conditions.forbiddenFlags.some(flag => 
      playerFlags.includes(flag)
    );
    if (hasAnyForbidden) return false;
  }
  
  // TODO: Vérification temps et météo
  
  return true;
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve toutes les quêtes d'une zone
 */
QuestDataSchema.statics.findByZone = function(zone: string): Promise<IQuestData[]> {
  return this.find({ zone, isActive: true }).sort({ questId: 1 });
};

/**
 * Trouve les quêtes par catégorie
 */
QuestDataSchema.statics.findByCategory = function(
  category: string, 
  zone?: string
): Promise<IQuestData[]> {
  const query: any = { category, isActive: true };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ questId: 1 });
};

/**
 * Trouve toutes les quêtes actives
 */
QuestDataSchema.statics.findActiveQuests = function(zone?: string): Promise<IQuestData[]> {
  const query: any = { isActive: true };
  if (zone) query.zone = zone;
  
  return this.find(query).sort({ category: 1, questId: 1 });
};

/**
 * Trouve les quêtes par NPC
 */
QuestDataSchema.statics.findByNpc = function(
  npcId: number, 
  type: 'start' | 'end' | 'both' = 'both'
): Promise<IQuestData[]> {
  let query: any = { isActive: true };
  
  switch (type) {
    case 'start':
      query.startNpcId = npcId;
      break;
    case 'end':
      query.endNpcId = npcId;
      break;
    case 'both':
      query.$or = [
        { startNpcId: npcId },
        { endNpcId: npcId }
      ];
      break;
  }
  
  return this.find(query).sort({ questId: 1 });
};

/**
 * Import en masse depuis JSON
 */
QuestDataSchema.statics.bulkImportFromJson = async function(
  questsData: any
): Promise<{ success: number; errors: string[] }> {
  const results: { success: number; errors: string[] } = { success: 0, errors: [] };
  
  if (!questsData.quests || !Array.isArray(questsData.quests)) {
    results.errors.push('Invalid quests data format - missing "quests" array');
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
 * Crée une quête depuis des données JSON
 */
QuestDataSchema.statics.createFromJson = async function(
  jsonQuest: any, 
  zone?: string
): Promise<IQuestData> {
  // Validation de base
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
  
  // Créer nouveau
  const questData = new this({
    questId: jsonQuest.id,
    zone,
    name: jsonQuest.name,
    description: jsonQuest.description || '',
    category: jsonQuest.category || 'side',
    prerequisites: jsonQuest.prerequisites,
    startNpcId: jsonQuest.startNpcId,
    endNpcId: jsonQuest.endNpcId,
    isRepeatable: jsonQuest.isRepeatable || false,
    cooldownHours: jsonQuest.cooldownHours,
    autoComplete: jsonQuest.autoComplete !== false, // true par défaut
    dialogues: jsonQuest.dialogues,
    steps: jsonQuest.steps,
    availabilityConditions: jsonQuest.availabilityConditions,
    version: '1.0.0',
    sourceFile: zone ? `${zone}_quests.json` : 'quests.json',
    tags: jsonQuest.tags || []
  });
  
  await questData.save();
  return questData;
};

// ===== EXPORT =====
export const QuestData = mongoose.model<IQuestData, IQuestDataModel>('QuestData', QuestDataSchema);

// Types d'export
export type QuestDataDocument = IQuestData;
export type CreateQuestData = Partial<Pick<IQuestData, 
  'questId' | 'zone' | 'name' | 'description' | 'category' | 'steps'
>>;
