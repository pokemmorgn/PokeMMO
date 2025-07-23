// server/src/models/QuestData.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { QuestDefinition, QuestReward } from "../types/QuestTypes";

// ===== INTERFACES =====

export interface IQuestData extends Document {
  // === IDENTIFICATION ===
  questId: string;                  // ID unique de la quête
  name: string;                     // Nom de la quête
  description: string;              // Description de la quête
  category: 'main' | 'side' | 'daily' | 'repeatable';
  
  // === CONFIGURATION ===
  prerequisites?: string[];         // IDs des quêtes prérequises
  startNpcId?: number;             // NPC qui donne la quête
  endNpcId?: number;               // NPC qui reçoit la quête
  isRepeatable: boolean;           // Quête répétable
  cooldownHours?: number;          // Cooldown entre répétitions
  autoComplete: boolean;           // Completion automatique ou manuelle
  
  // === DIALOGUES ===
  dialogues?: {
    questOffer?: string[];         // Dialogues d'offre de quête
    questInProgress?: string[];    // Dialogues pendant la quête
    questComplete?: string[];      // Dialogues de completion
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
  
  // === MÉTADONNÉES ===
  isActive: boolean;               // Quête active ou désactivée
  version: string;                 // Version des données
  lastUpdated: Date;
  sourceFile?: string;             // Fichier source original (pour migration)
  tags?: string[];                 // Tags pour catégorisation
  
  // === MÉTHODES D'INSTANCE ===
  toQuestDefinition(): QuestDefinition;
  updateFromJson(jsonData: any): Promise<void>;
  isAvailableForPlayer(playerLevel: number, completedQuests: string[]): boolean;
}

// Interface pour les méthodes statiques
export interface IQuestDataModel extends Model<IQuestData> {
  findByCategory(category: string): Promise<IQuestData[]>;
  findByNpc(npcId: number, type: 'start' | 'end'): Promise<IQuestData[]>;
  findActiveQuests(): Promise<IQuestData[]>;
  findRepeatableQuests(): Promise<IQuestData[]>;
  bulkImportFromJson(questsData: any): Promise<{ success: number; errors: string[] }>;
  createFromJson(jsonQuest: any): Promise<IQuestData>;
}

// ===== SCHÉMAS =====

// Schéma pour les récompenses
const RewardSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: {
      values: ['gold', 'item', 'pokemon', 'experience'],
      message: 'Invalid reward type'
    }
  },
  itemId: { 
    type: String,
    trim: true
  },
  amount: { 
    type: Number,
    min: [0, 'Amount cannot be negative']
  },
  pokemonId: { 
    type: Number,
    min: [1, 'Pokemon ID must be positive']
  }
}, { _id: false });

// Schéma pour les objectifs
const ObjectiveSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    enum: {
      values: ['collect', 'defeat', 'talk', 'reach', 'deliver'],
      message: 'Invalid objective type'
    }
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [500, 'Description too long']
  },
  target: { 
    type: String,
    trim: true
  },
  targetName: { 
    type: String,
    trim: true,
    maxlength: [100, 'Target name too long']
  },
  itemId: { 
    type: String,
    trim: true
  },
  requiredAmount: { 
    type: Number, 
    required: true,
    min: [1, 'Required amount must be positive']
  },
  validationDialogue: [{ 
    type: String,
    trim: true
  }]
}, { _id: false });

// Schéma pour les étapes
const StepSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    trim: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [200, 'Step name too long']
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [1000, 'Step description too long']
  },
  objectives: [ObjectiveSchema],
  rewards: [RewardSchema]
}, { _id: false });

// Schéma pour les dialogues
const DialoguesSchema = new Schema({
  questOffer: [{ 
    type: String,
    trim: true
  }],
  questInProgress: [{ 
    type: String,
    trim: true
  }],
  questComplete: [{ 
    type: String,
    trim: true
  }]
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
    maxlength: [2000, 'Quest description too long']
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
  
  // === CONFIGURATION ===
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
    type: DialoguesSchema,
    default: undefined
  },
  
  // === ÉTAPES ===
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

// Index pour les quêtes par NPC
QuestDataSchema.index({ startNpcId: 1, isActive: 1 });
QuestDataSchema.index({ endNpcId: 1, isActive: 1 });

// Index pour les requêtes fréquentes
QuestDataSchema.index({ category: 1, isActive: 1 });
QuestDataSchema.index({ isRepeatable: 1, isActive: 1 });

// Index de recherche textuelle
QuestDataSchema.index({ 
  name: 'text', 
  description: 'text',
  tags: 'text'
});

// ===== VALIDATIONS PRE-SAVE =====

QuestDataSchema.pre('save', function(next) {
  // Validation des étapes
  if (this.steps && this.steps.length > 0) {
    for (const step of this.steps) {
      if (!step.objectives || step.objectives.length === 0) {
        return next(new Error(`Step "${step.name}" must have at least one objective`));
      }
    }
  }
  
  // Validation NPC
  if (this.startNpcId && this.endNpcId && this.startNpcId === this.endNpcId) {
    console.warn(`Quest ${this.questId}: Start and end NPC are the same`);
  }
  
  // Nettoyage des prerequisites
  if (this.prerequisites) {
    this.prerequisites = this.prerequisites.filter(p => p && p.trim().length > 0);
  }
  
  // Nettoyage des tags
  if (this.tags) {
    this.tags = [...new Set(this.tags.filter(t => t && t.trim().length > 0))];
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
  
  // Configuration
  if (jsonData.prerequisites) this.prerequisites = jsonData.prerequisites;
  if (jsonData.startNpcId) this.startNpcId = jsonData.startNpcId;
  if (jsonData.endNpcId) this.endNpcId = jsonData.endNpcId;
  if (typeof jsonData.isRepeatable === 'boolean') this.isRepeatable = jsonData.isRepeatable;
  if (jsonData.cooldownHours) this.cooldownHours = jsonData.cooldownHours;
  if (typeof jsonData.autoComplete === 'boolean') this.autoComplete = jsonData.autoComplete;
  
  // Dialogues
  if (jsonData.dialogues) this.dialogues = jsonData.dialogues;
  
  // Étapes
  if (jsonData.steps) this.steps = jsonData.steps;
  
  // Tags
  if (jsonData.tags) this.tags = jsonData.tags;
  
  await this.save();
};

/**
 * Vérifie si la quête est disponible pour un joueur
 */
QuestDataSchema.methods.isAvailableForPlayer = function(
  this: IQuestData,
  playerLevel: number,
  completedQuests: string[] = []
): boolean {
  if (!this.isActive) return false;
  
  // Vérifier les prérequis
  if (this.prerequisites && this.prerequisites.length > 0) {
    const hasAllPrerequisites = this.prerequisites.every(prereq => 
      completedQuests.includes(prereq)
    );
    if (!hasAllPrerequisites) return false;
  }
  
  // TODO: Ajouter d'autres vérifications (niveau, flags, etc.)
  
  return true;
};

// ===== MÉTHODES STATIQUES =====

/**
 * Trouve les quêtes par catégorie
 */
QuestDataSchema.statics.findByCategory = function(category: string): Promise<IQuestData[]> {
  return this.find({ category, isActive: true }).sort({ questId: 1 });
};

/**
 * Trouve les quêtes par NPC
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
 * Trouve toutes les quêtes actives
 */
QuestDataSchema.statics.findActiveQuests = function(): Promise<IQuestData[]> {
  return this.find({ isActive: true }).sort({ category: 1, questId: 1 });
};

/**
 * Trouve les quêtes répétables
 */
QuestDataSchema.statics.findRepeatableQuests = function(): Promise<IQuestData[]> {
  return this.find({ isRepeatable: true, isActive: true }).sort({ questId: 1 });
};

/**
 * Import en masse depuis JSON
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
 * Crée une quête depuis des données JSON
 */
QuestDataSchema.statics.createFromJson = async function(
  jsonQuest: any
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
    version: '1.0.0',
    sourceFile: 'quests.json'
  });
  
  await questData.save();
  return questData;
};

// ===== EXPORT =====
export const QuestData = mongoose.model<IQuestData, IQuestDataModel>('QuestData', QuestDataSchema);

// Types d'export
export type QuestDataDocument = IQuestData;
export type CreateQuestData = Partial<Pick<IQuestData, 
  'questId' | 'name' | 'description' | 'category' | 'steps'
>>;
