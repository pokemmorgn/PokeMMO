// server/src/Intelligence/Core/DatabaseSchema.ts

/**
 * 🗄️ SCHÉMAS BASE DE DONNÉES POUR L'INTELLIGENCE IA
 * 
 * Définit tous les schémas MongoDB/GoDB pour stocker les actions des joueurs
 * et les données d'intelligence artificielle.
 * 
 * Structure optimisée pour performance et requêtes d'analyse.
 */

import mongoose, { Document, Schema } from 'mongoose';
import type { PlayerAction, ActionType, ActionCategory } from './ActionTypes';

// ===================================================================
// 🎮 SCHÉMA PRINCIPAL - ACTIONS JOUEURS
// ===================================================================

/**
 * Interface TypeScript pour les actions joueurs
 */
export interface IPlayerActionDocument extends Document {
  // Champs principaux
  playerId: string;
  actionType: ActionType;
  category: ActionCategory;
  timestamp: number;
  
  // Données de l'action (JSON flexible)
  data: {
    // Champs communs
    sessionId: string;
    playerName: string;
    location: {
      map: string;
      x: number;
      y: number;
    };
    context?: {
      friendsOnline?: string[];
      weather?: string;
      timeOfDay?: string;
      playerLevel?: number;
      sessionDuration?: number;
    };
    
    // Données spécifiques selon le type d'action
    [key: string]: any;
  };
  
  // Métadonnées
  metadata: {
    version: string;
    source: string;
    processed: boolean;
    tags: string[];
    analysisResults?: {
      patterns?: string[];
      sentiment?: number;
      importance?: number;
      predictions?: any[];
    };
  };
  
  // Champs calculés automatiquement
  createdAt: Date;
  updatedAt: Date;
  
  // Index de recherche textuelle
  searchText?: string;
}

/**
 * Schéma MongoDB pour les actions joueurs
 */
const PlayerActionSchema = new Schema({
  // === CHAMPS PRINCIPAUX ===
  playerId: { 
    type: String, 
    required: true,
    index: true
  },
  actionType: { 
    type: String, 
    required: true,
    index: true
  },
  category: { 
    type: String, 
    required: true,
    index: true
  },
  timestamp: { 
    type: Number, 
    required: true,
    index: true
  },
  
  // === DONNÉES FLEXIBLES ===
  data: {
    type: Schema.Types.Mixed, // JSON flexible pour tous types de données
    required: true
  },
  
  // === MÉTADONNÉES ===
  metadata: {
    version: { type: String, default: '1.0.0' },
    source: { type: String, default: 'server' },
    processed: { type: Boolean, default: false, index: true },
    tags: [{ type: String }],
    analysisResults: {
      patterns: [{ type: String }],
      sentiment: { type: Number, min: -1, max: 1 },
      importance: { type: Number, min: 0, max: 1 },
      predictions: [{ type: Schema.Types.Mixed }]
    }
  },
  
  // === CHAMP DE RECHERCHE ===
  searchText: { 
    type: String, 
    index: 'text' // Index de recherche textuelle
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  collection: 'player_actions'
});

// ===================================================================
// 📊 INDEX POUR PERFORMANCE
// ===================================================================

// Index composés pour requêtes fréquentes
PlayerActionSchema.index({ playerId: 1, timestamp: -1 }); // Actions d'un joueur par date
PlayerActionSchema.index({ playerId: 1, category: 1 }); // Actions d'un joueur par catégorie
PlayerActionSchema.index({ timestamp: -1, processed: 1 }); // Actions récentes non traitées
PlayerActionSchema.index({ category: 1, timestamp: -1 }); // Actions par catégorie et date
PlayerActionSchema.index({ actionType: 1, timestamp: -1 }); // Actions par type et date

// Index pour analyse comportementale
PlayerActionSchema.index({ 'data.sessionId': 1 }); // Actions par session
PlayerActionSchema.index({ 'data.location.map': 1 }); // Actions par carte
PlayerActionSchema.index({ 'metadata.processed': 1, timestamp: 1 }); // Queue de traitement IA

// Index TTL pour nettoyage automatique (optionnel)
// PlayerActionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 an

// ===================================================================
// 🧠 SCHÉMA MÉMOIRE NPCs
// ===================================================================

/**
 * Interface pour la mémoire des NPCs
 */
export interface INPCMemoryDocument extends Document {
  npcId: string;
  playerId: string;
  
  // Historique interactions
  interactions: {
    type: string;
    timestamp: number;
    data: any;
    location: {
      map: string;
      x: number;
      y: number;
    };
    playerMood?: string;
    npcResponse?: string;
  }[];
  
  // Relation avec le joueur
  relationship: {
    points: number; // -100 à +100
    level: string; // 'stranger', 'acquaintance', 'friend', 'best_friend', 'enemy'
    firstMet: number; // timestamp
    lastSeen: number; // timestamp
    totalInteractions: number;
  };
  
  // Connaissances sur le joueur
  knownFacts: {
    playerPreferences: {
      favoriteActivity?: string;
      playstyle?: string;
      skillLevel?: string;
      socialness?: string;
    };
    playerHistory: {
      achievements?: string[];
      failures?: string[];
      patterns?: string[];
    };
    personalInfo: {
      nickname?: string;
      notes?: string[];
      friendsList?: string[];
    };
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schéma pour la mémoire des NPCs
 */
const NPCMemorySchema = new Schema({
  npcId: { 
    type: String, 
    required: true,
    index: true
  },
  playerId: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Historique des interactions
  interactions: [{
    type: { type: String, required: true },
    timestamp: { type: Number, required: true },
    data: { type: Schema.Types.Mixed },
    location: {
      map: { type: String, required: true },
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    playerMood: { type: String },
    npcResponse: { type: String }
  }],
  
  // Données de relation
  relationship: {
    points: { type: Number, default: 0, min: -100, max: 100 },
    level: { 
      type: String, 
      enum: ['stranger', 'acquaintance', 'friend', 'best_friend', 'enemy'], 
      default: 'stranger' 
    },
    firstMet: { type: Number, required: true },
    lastSeen: { type: Number, required: true },
    totalInteractions: { type: Number, default: 0 }
  },
  
  // Connaissances accumulées
  knownFacts: {
    playerPreferences: {
      favoriteActivity: { type: String },
      playstyle: { type: String },
      skillLevel: { type: String },
      socialness: { type: String }
    },
    playerHistory: {
      achievements: [{ type: String }],
      failures: [{ type: String }],
      patterns: [{ type: String }]
    },
    personalInfo: {
      nickname: { type: String },
      notes: [{ type: String }],
      friendsList: [{ type: String }]
    }
  }
}, {
  timestamps: true,
  collection: 'npc_memory'
});

// Index unique pour éviter doublons NPC-Joueur
NPCMemorySchema.index({ npcId: 1, playerId: 1 }, { unique: true });
NPCMemorySchema.index({ playerId: 1 }); // Toute la mémoire d'un joueur
NPCMemorySchema.index({ 'relationship.lastSeen': -1 }); // Interactions récentes

// ===================================================================
// 📈 SCHÉMA PATTERNS COMPORTEMENTAUX
// ===================================================================

/**
 * Interface pour les patterns détectés
 */
export interface IBehaviorPatternDocument extends Document {
  playerId: string;
  patternType: string;
  
  // Données du pattern
  pattern: {
    name: string;
    description: string;
    confidence: number; // 0-1
    frequency: number; // Occurences par heure/jour
    
    // Conditions de déclenchement
    triggers: {
      timeOfDay?: string[];
      location?: string[];
      context?: string[];
      actions?: string[];
    };
    
    // Données statistiques
    stats: {
      firstObserved: number; // timestamp
      lastObserved: number; // timestamp
      totalOccurrences: number;
      averageDuration?: number;
      successRate?: number;
    };
  };
  
  // Actions associées au pattern
  relatedActions: string[]; // Array d'IDs d'actions
  
  // Prédictions basées sur ce pattern
  predictions: {
    nextAction?: string;
    nextActionConfidence?: number;
    nextActionTime?: number;
    behaviorChange?: string;
  };
  
  // Métadonnées
  isActive: boolean;
  lastAnalyzed: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schéma pour les patterns comportementaux
 */
const BehaviorPatternSchema = new Schema({
  playerId: { 
    type: String, 
    required: true,
    index: true
  },
  patternType: { 
    type: String, 
    required: true,
    index: true
  },
  
  pattern: {
    name: { type: String, required: true },
    description: { type: String },
    confidence: { type: Number, min: 0, max: 1, required: true },
    frequency: { type: Number, default: 0 },
    
    triggers: {
      timeOfDay: [{ type: String }],
      location: [{ type: String }],
      context: [{ type: String }],
      actions: [{ type: String }]
    },
    
    stats: {
      firstObserved: { type: Number, required: true },
      lastObserved: { type: Number, required: true },
      totalOccurrences: { type: Number, default: 1 },
      averageDuration: { type: Number },
      successRate: { type: Number, min: 0, max: 1 }
    }
  },
  
  relatedActions: [{ type: String }],
  
  predictions: {
    nextAction: { type: String },
    nextActionConfidence: { type: Number, min: 0, max: 1 },
    nextActionTime: { type: Number },
    behaviorChange: { type: String }
  },
  
  isActive: { type: Boolean, default: true },
  lastAnalyzed: { type: Number, required: true }
}, {
  timestamps: true,
  collection: 'behavior_patterns'
});

// Index pour recherche de patterns
BehaviorPatternSchema.index({ playerId: 1, patternType: 1 });
BehaviorPatternSchema.index({ isActive: 1, lastAnalyzed: -1 });
BehaviorPatternSchema.index({ 'pattern.confidence': -1 });

// ===================================================================
// 🎯 SCHÉMA SESSIONS DE JEU
// ===================================================================

/**
 * Interface pour les sessions de jeu
 */
export interface IGameSessionDocument extends Document {
  sessionId: string;
  playerId: string;
  playerName: string;
  
  // Données de session
  startTime: number;
  endTime?: number;
  duration?: number; // en millisecondes
  
  // Statistiques de session
  stats: {
    totalActions: number;
    actionsByCategory: { [category: string]: number };
    locationsVisited: string[];
    pokemonEncountered: number;
    battlesWon: number;
    battlesLost: number;
    questsCompleted: number;
    socialInteractions: number;
  };
  
  // Analyse de session
  analysis: {
    mood: string; // 'frustrated', 'happy', 'focused', 'casual'
    productivity: number; // 0-1
    socialness: number; // 0-1
    skillDisplay: number; // 0-1
    patterns: string[];
  };
  
  // Métadonnées
  deviceInfo?: string;
  ipAddress?: string;
  clientVersion?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schéma pour les sessions de jeu
 */
const GameSessionSchema = new Schema({
  sessionId: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  playerId: { 
    type: String, 
    required: true,
    index: true
  },
  playerName: { 
    type: String, 
    required: true
  },
  
  startTime: { type: Number, required: true },
  endTime: { type: Number },
  duration: { type: Number },
  
  stats: {
    totalActions: { type: Number, default: 0 },
    actionsByCategory: { type: Schema.Types.Mixed, default: {} },
    locationsVisited: [{ type: String }],
    pokemonEncountered: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    battlesLost: { type: Number, default: 0 },
    questsCompleted: { type: Number, default: 0 },
    socialInteractions: { type: Number, default: 0 }
  },
  
  analysis: {
    mood: { type: String },
    productivity: { type: Number, min: 0, max: 1 },
    socialness: { type: Number, min: 0, max: 1 },
    skillDisplay: { type: Number, min: 0, max: 1 },
    patterns: [{ type: String }]
  },
  
  deviceInfo: { type: String },
  ipAddress: { type: String },
  clientVersion: { type: String }
}, {
  timestamps: true,
  collection: 'game_sessions'
});

// Index pour analyse des sessions
GameSessionSchema.index({ playerId: 1, startTime: -1 });
GameSessionSchema.index({ duration: -1 }); // Sessions par durée
GameSessionSchema.index({ 'analysis.mood': 1 });

// ===================================================================
// 🚀 CRÉATION DES MODÈLES MONGOOSE
// ===================================================================

/**
 * Modèle pour les actions des joueurs
 */
export const PlayerActionModel = mongoose.model<IPlayerActionDocument>(
  'PlayerAction', 
  PlayerActionSchema
);

/**
 * Modèle pour la mémoire des NPCs
 */
export const NPCMemoryModel = mongoose.model<INPCMemoryDocument>(
  'NPCMemory', 
  NPCMemorySchema
);

/**
 * Modèle pour les patterns comportementaux
 */
export const BehaviorPatternModel = mongoose.model<IBehaviorPatternDocument>(
  'BehaviorPattern', 
  BehaviorPatternSchema
);

/**
 * Modèle pour les sessions de jeu
 */
export const GameSessionModel = mongoose.model<IGameSessionDocument>(
  'GameSession', 
  GameSessionSchema
);

// ===================================================================
// 🛠️ FONCTIONS UTILITAIRES
// ===================================================================

/**
 * Initialise tous les index de la base de données
 */
export async function initializeIndexes(): Promise<void> {
  try {
    console.log('📊 Création des index de base de données...');
    
    await PlayerActionModel.createIndexes();
    await NPCMemoryModel.createIndexes();
    await BehaviorPatternModel.createIndexes();
    await GameSessionModel.createIndexes();
    
    console.log('✅ Index créés avec succès');
  } catch (error) {
    console.error('❌ Erreur création index:', error);
    throw error;
  }
}

/**
 * Vérifie la connexion et l'état des collections
 */
export async function verifyDatabaseHealth(): Promise<{
  isConnected: boolean;
  collections: string[];
  stats: any;
}> {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    
    if (!isConnected) {
      return { isConnected: false, collections: [], stats: {} };
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Statistiques basiques
    const stats = {
      playerActions: await PlayerActionModel.countDocuments(),
      npcMemories: await NPCMemoryModel.countDocuments(),
      behaviorPatterns: await BehaviorPatternModel.countDocuments(),
      gameSessions: await GameSessionModel.countDocuments()
    };
    
    return {
      isConnected: true,
      collections: collectionNames,
      stats
    };
  } catch (error) {
    console.error('❌ Erreur vérification BDD:', error);
    return { isConnected: false, collections: [], stats: {} };
  }
}

/**
 * Nettoie les anciennes données (maintenance)
 */
export async function cleanupOldData(daysToKeep: number = 365): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffTimestamp = cutoffDate.getTime();
  
  try {
    console.log(`🧹 Nettoyage des données antérieures à ${cutoffDate.toISOString()}`);
    
    // Nettoyer les actions anciennes (garde les patterns et mémoires NPCs)
    const deletedActions = await PlayerActionModel.deleteMany({
      timestamp: { $lt: cutoffTimestamp }
    });
    
    // Nettoyer les sessions anciennes
    const deletedSessions = await GameSessionModel.deleteMany({
      startTime: { $lt: cutoffTimestamp }
    });
    
    console.log(`✅ Nettoyage terminé: ${deletedActions.deletedCount} actions, ${deletedSessions.deletedCount} sessions supprimées`);
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    throw error;
  }
}

/**
 * Export par défaut avec tous les modèles
 */
export default {
  PlayerActionModel,
  NPCMemoryModel,
  BehaviorPatternModel,
  GameSessionModel,
  initializeIndexes,
  verifyDatabaseHealth,
  cleanupOldData
};
