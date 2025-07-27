// server/src/models/DialogString.ts
// Modèle MongoDB pour la localisation modulaire des dialogues NPCs

import { Schema, model, Document, Types } from 'mongoose';

// ===================================================================
// 🌍 INTERFACES TYPESCRIPT
// ===================================================================

/**
 * Interface principale DialogString
 */
export interface IDialogString extends Document {
  // === CHAMPS PRINCIPAUX ===
  dialogId: string;           // ID unique: "professor_oak.greeting.welcome"
  
  // === LANGUES SUPPORTÉES ===
  eng: string;                // Anglais (obligatoire)
  fr: string;                 // Français (obligatoire) 
  es?: string;                // Espagnol (optionnel)
  de?: string;                // Allemand (optionnel)
  ja?: string;                // Japonais (optionnel)
  it?: string;                // Italien (optionnel)
  pt?: string;                // Portugais (optionnel)
  ko?: string;                // Coréen (optionnel)
  zh?: string;                // Chinois (optionnel)
  
  // === MÉTADONNÉES ===
  category: DialogCategory;   // Type de dialogue
  context?: string;           // Contexte spécifique
  npcId?: string;            // ID du NPC (extrait de dialogId)
  
  // === VARIABLES ET LOGIQUE ===
  variables: string[];        // Variables utilisées: ["playerName", "npcName"]
  conditions?: DialogCondition[]; // Conditions d'affichage
  priority: number;           // Priorité (1-10, 10 = max)
  
  // === MÉTADONNÉES TECHNIQUES ===
  isActive: boolean;          // Dialogue actif
  version: string;            // Version du dialogue
  tags: string[];             // Tags pour recherche
  
  // === TIMESTAMPS ===
  createdAt: Date;
  updatedAt: Date;
  
  // === MÉTHODES D'INSTANCE ===
  getLocalizedText(language: SupportedLanguage): string;
  hasTranslation(language: SupportedLanguage): boolean;
  replaceVariables(language: SupportedLanguage, variables: Record<string, string>): string;
  getNPCId(): string;
  getDialogueContext(): { category: string; context: string; variant: string };
}

/**
 * Types des catégories de dialogue
 */
export type DialogCategory = 
  | 'greeting'          // Salutations
  | 'ai'               // Réponses IA intelligentes
  | 'shop'             // Dialogues de boutique
  | 'quest'            // Dialogues de quête (si pas dans QuestManager)
  | 'battle'           // Dialogues de combat
  | 'help'             // Dialogues d'aide
  | 'social'           // Dialogues sociaux
  | 'system'           // Messages système
  | 'ui'               // Interface utilisateur
  | 'error';           // Messages d'erreur

/**
 * Langues supportées
 */
export type SupportedLanguage = 'eng' | 'fr' | 'es' | 'de' | 'ja' | 'it' | 'pt' | 'ko' | 'zh';

/**
 * Conditions d'affichage du dialogue
 */
export interface DialogCondition {
  type: 'relationship' | 'level' | 'time' | 'quest' | 'item' | 'custom';
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'has' | 'not_has';
  value: string | number | boolean;
  description?: string;
}

/**
 * Interface pour requêtes et filtres
 */
export interface DialogStringQuery {
  npcId?: string;
  category?: DialogCategory;
  context?: string;
  language?: SupportedLanguage;
  isActive?: boolean;
  tags?: string[];
  hasConditions?: boolean;
}

// ===================================================================
// 🗄️ SCHÉMA MONGODB
// ===================================================================

const DialogStringSchema = new Schema<IDialogString>({
  // === CHAMPS PRINCIPAUX ===
  dialogId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Format: npcId.category.context[.variant]
        return /^[a-z0-9_]+\.[a-z_]+\.[a-z0-9_]+(\.[a-z0-9_]+)?$/i.test(v);
      },
      message: 'DialogId doit suivre le format: npcId.category.context[.variant]'
    }
  },

  // === LANGUES (eng et fr obligatoires) ===
  eng: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  },
  fr: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  },
  es: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  de: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  ja: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  it: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  pt: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  ko: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  zh: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // === MÉTADONNÉES ===
  category: {
    type: String,
    required: true,
    enum: ['greeting', 'ai', 'shop', 'quest', 'battle', 'help', 'social', 'system', 'ui', 'error'],
    index: true
  },
  context: {
    type: String,
    trim: true,
    maxlength: 100
  },
  npcId: {
    type: String,
    index: true,
    trim: true
  },

  // === VARIABLES ET LOGIQUE ===
  variables: [{
    type: String,
    trim: true
  }],
  conditions: [{
    type: {
      type: String,
      enum: ['relationship', 'level', 'time', 'quest', 'item', 'custom'],
      required: true
    },
    operator: {
      type: String,
      enum: ['>', '<', '=', '>=', '<=', '!=', 'has', 'not_has'],
      required: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    description: String
  }],
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },

  // === MÉTADONNÉES TECHNIQUES ===
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
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]

}, {
  timestamps: true,
  collection: 'dialogstrings',
  
  // Options de performance
  autoIndex: process.env.NODE_ENV !== 'production',
  minimize: false,
  
  // Transformation JSON
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ===================================================================
// 🚀 INDEX COMPOSÉS POUR PERFORMANCE
// ===================================================================

// Index principal pour recherche modulaire
DialogStringSchema.index({ npcId: 1, category: 1, context: 1 });

// Index pour recherche par pattern
DialogStringSchema.index({ dialogId: 'text', eng: 'text', fr: 'text' });

// Index pour requêtes admin
DialogStringSchema.index({ category: 1, isActive: 1, updatedAt: -1 });

// Index pour recherche par tags
DialogStringSchema.index({ tags: 1, isActive: 1 });

// ===================================================================
// 🔧 MÉTHODES D'INSTANCE
// ===================================================================

/**
 * Récupère le texte dans la langue demandée avec fallback
 */
DialogStringSchema.methods.getLocalizedText = function(language: SupportedLanguage): string {
  const text = this[language];
  
  if (text) return text;
  
  // Fallback sur anglais si langue non disponible
  if (language !== 'eng' && this.eng) {
    return this.eng;
  }
  
  // Dernier recours
  return `[MISSING: ${this.dialogId}]`;
};

/**
 * Vérifie si une traduction existe
 */
DialogStringSchema.methods.hasTranslation = function(language: SupportedLanguage): boolean {
  return Boolean(this[language] && this[language].trim().length > 0);
};

/**
 * Remplace les variables dans le texte
 */
DialogStringSchema.methods.replaceVariables = function(
  language: SupportedLanguage, 
  variables: Record<string, string>
): string {
  let text = this.getLocalizedText(language);
  
  // Remplacer les variables au format {variableName}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    text = text.replace(regex, value);
  }
  
  return text;
};

/**
 * Extrait l'ID du NPC depuis le dialogId
 */
DialogStringSchema.methods.getNPCId = function(): string {
  if (this.npcId) return this.npcId;
  
  const parts = this.dialogId.split('.');
  return parts[0] || 'unknown';
};

/**
 * Parse le contexte du dialogue
 */
DialogStringSchema.methods.getDialogueContext = function(): { 
  category: string; 
  context: string; 
  variant: string 
} {
  const parts = this.dialogId.split('.');
  return {
    category: parts[1] || 'unknown',
    context: parts[2] || 'default',
    variant: parts[3] || 'default'
  };
};

// ===================================================================
// 🔍 MÉTHODES STATIQUES
// ===================================================================

/**
 * Recherche dialogues par NPC
 */
DialogStringSchema.statics.findByNPC = function(npcId: string, isActive: boolean = true) {
  return this.find({ 
    npcId: npcId,
    isActive: isActive
  }).sort({ category: 1, context: 1, priority: -1 });
};

/**
 * Recherche par pattern
 */
DialogStringSchema.statics.findByPattern = function(pattern: string, isActive: boolean = true) {
  return this.find({
    dialogId: { $regex: pattern, $options: 'i' },
    isActive: isActive
  }).sort({ dialogId: 1 });
};

/**
 * Recherche par catégorie et contexte
 */
DialogStringSchema.statics.findByCategoryContext = function(
  category: DialogCategory,
  context?: string,
  isActive: boolean = true
) {
  const query: any = { category, isActive };
  if (context) query.context = context;
  
  return this.find(query).sort({ npcId: 1, priority: -1 });
};

/**
 * Recherche textuelle multi-langue
 */
DialogStringSchema.statics.searchText = function(
  searchTerm: string,
  language: SupportedLanguage = 'fr',
  limit: number = 50
) {
  const textField = language;
  
  return this.find({
    [textField]: { $regex: searchTerm, $options: 'i' },
    isActive: true
  })
  .select(`dialogId ${textField} category npcId`)
  .limit(limit)
  .sort({ updatedAt: -1 });
};

/**
 * Statistiques par NPC
 */
DialogStringSchema.statics.getNPCStats = function(npcId: string) {
  return this.aggregate([
    { $match: { npcId: npcId, isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        contexts: { $addToSet: '$context' },
        hasConditions: { $sum: { $cond: [{ $gt: [{ $size: '$conditions' }, 0] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Traductions manquantes
 */
DialogStringSchema.statics.findMissingTranslations = function(language: SupportedLanguage) {
  const query: any = { isActive: true };
  query[language] = { $exists: false };
  
  return this.find(query)
    .select('dialogId npcId category')
    .sort({ npcId: 1, dialogId: 1 });
};

// ===================================================================
// 🔄 HOOKS ET MIDDLEWARE
// ===================================================================

/**
 * Pre-save: Auto-extraire npcId et valider
 */
DialogStringSchema.pre('save', function(next) {
  // Auto-extraire npcId si pas défini
  if (!this.npcId && this.dialogId) {
    this.npcId = this.dialogId.split('.')[0];
  }
  
  // Auto-extraire context si pas défini
  if (!this.context && this.dialogId) {
    const parts = this.dialogId.split('.');
    this.context = parts[2] || 'default';
  }
  
  // Valider que les variables mentionnées dans le texte sont listées
  this.validateVariables();
  
  next();
});

/**
 * Validation des variables
 */
DialogStringSchema.methods.validateVariables = function() {
  const languages: SupportedLanguage[] = ['eng', 'fr', 'es', 'de', 'ja', 'it', 'pt', 'ko', 'zh'];
  const foundVariables = new Set<string>();
  
  // Extraire variables de tous les textes
  for (const lang of languages) {
    const text = this[lang];
    if (text) {
      const matches = text.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const variable = match.slice(1, -1); // Enlever { }
          foundVariables.add(variable);
        });
      }
    }
  }
  
  // Mettre à jour la liste des variables
  this.variables = Array.from(foundVariables).sort();
};

/**
 * Post-save: Log des changements
 */
DialogStringSchema.post('save', function(doc) {
  console.log(`💾 DialogString sauvegardé: ${doc.dialogId} [${doc.npcId}]`);
});

// ===================================================================
// 🏭 EXPORT DU MODÈLE
// ===================================================================

export const DialogStringModel = model<IDialogString>('DialogString', DialogStringSchema);

// Export des types pour utilisation dans d'autres fichiers
export type { DialogCategory, SupportedLanguage, DialogCondition, DialogStringQuery };

// Export de constantes utiles
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['eng', 'fr', 'es', 'de', 'ja', 'it', 'pt', 'ko', 'zh'];
export const DIALOG_CATEGORIES: DialogCategory[] = ['greeting', 'ai', 'shop', 'quest', 'battle', 'help', 'social', 'system', 'ui', 'error'];

/**
 * Interface pour création simplifiée
 */
export interface CreateDialogStringData {
  dialogId: string;
  eng: string;
  fr: string;
  category: DialogCategory;
  context?: string;
  variables?: string[];
  conditions?: DialogCondition[];
  priority?: number;
  tags?: string[];
  [key: string]: any; // Pour langues optionnelles
}

/**
 * Factory function pour création facile
 */
export function createDialogString(data: CreateDialogStringData): Promise<IDialogString> {
  const dialogString = new DialogStringModel(data);
  return dialogString.save();
}

export default DialogStringModel;
