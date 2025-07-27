// server/src/models/PlayerAction.ts

import mongoose, { Document } from "mongoose";
import { ActionType } from "../intelligence/types/ActionTypes.js";

/**
 * 🎯 MODÈLE PLAYERACTION - Stockage dédié pour toutes les actions joueur
 * 
 * Séparé de PlayerData pour optimiser les performances et l'analyse.
 * Chaque action est enregistrée avec son contexte complet pour l'IA NPCs.
 */

// ===== INTERFACE TYPESCRIPT =====
export interface IPlayerAction extends Document {
  // Identifiants
  playerId: string;           // Référence au joueur (username)
  sessionId: string;          // Session de jeu
  actionType: string;         // Type d'action (enum ActionType)
  
  // Temporel
  timestamp: number;          // Date en millisecondes
  
  // Données de l'action (JSON flexible)
  data: any;                  // Données spécifiques selon actionType
  
  // Contexte environnemental (JSON)
  context: {
    timeOfDay: string;
    dayOfWeek: string;
    currentMap: string;
    zone?: string;
    nearbyPlayers: string[];
    nearbyNPCs: string[];
    isAlone: boolean;
    friendsOnline: number;
    currentGold: number;
    currentLevel: number;
    teamSize: number;
    inventoryFull: boolean;
    recentFailures: number;
    consecutiveActions: number;
    idleTime: number;
  };
  
  // Métadonnées pour l'analyse
  metadata: {
    processingTime?: number;
    analysisComplete: boolean;
    flagged: boolean;
    patterns: string[];
  };
  
  // Champs automatiques
  createdAt: Date;
  updatedAt: Date;
}

// ===== SCHÉMA MONGOOSE =====
const PlayerActionSchema = new mongoose.Schema({
  // 🆔 Identifiants
  playerId: { 
    type: String, 
    required: true,
    index: true // Index principal pour requêtes par joueur
  },
  
  sessionId: { 
    type: String, 
    required: true,
    index: true // Pour analyser les sessions
  },
  
  actionType: { 
    type: String, 
    required: true,
    enum: Object.values(ActionType), // Validation avec enum
    index: true // Pour filtrer par type d'action
  },
  
  // ⏰ Temporel
  timestamp: { 
    type: Number, 
    required: true,
    index: true // Crucial pour requêtes temporelles
  },
  
  // 📊 Données de l'action (JSON flexible)
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  
  // 🌍 Contexte environnemental
  context: {
    type: {
      timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'], default: 'afternoon' },
      dayOfWeek: { type: String, default: 'Monday' },
      currentMap: { type: String, index: true, default: 'unknown' }, // Pour analyses par map
      zone: { type: String },
      nearbyPlayers: [{ type: String }],
      nearbyNPCs: [{ type: String }],
      isAlone: { type: Boolean, index: true, default: true }, // Pour analyses sociales
      friendsOnline: { type: Number, default: 0 },
      currentGold: { type: Number, default: 0 },
      currentLevel: { type: Number, default: 1 },
      teamSize: { type: Number, default: 0 },
      inventoryFull: { type: Boolean, default: false },
      recentFailures: { type: Number, index: true, default: 0 }, // Pour détection frustration
      consecutiveActions: { type: Number, default: 1 },
      idleTime: { type: Number, default: 0 }
    },
    required: true,
    default: function() {
      return {
        timeOfDay: 'afternoon',
        dayOfWeek: 'Monday', 
        currentMap: 'unknown',
        nearbyPlayers: [],
        nearbyNPCs: [],
        isAlone: true,
        friendsOnline: 0,
        currentGold: 0,
        currentLevel: 1,
        teamSize: 0,
        inventoryFull: false,
        recentFailures: 0,
        consecutiveActions: 1,
        idleTime: 0
      };
    }
  },
  
  // 🔍 Métadonnées pour l'analyse
  metadata: {
    type: {
      processingTime: { type: Number },
      analysisComplete: { type: Boolean, default: false, index: true },
      flagged: { type: Boolean, default: false, index: true }, // Actions importantes
      patterns: [{ type: String }] // Patterns détectés
    },
    required: true,
    default: {
      analysisComplete: false,
      flagged: false,
      patterns: []
    }
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  
  // Options d'optimisation
  collection: 'player_actions', // Nom explicite de la collection
  
  // Index TTL pour supprimer automatiquement les anciennes actions (optionnel)
  // expireAfterSeconds: 60 * 60 * 24 * 90 // 90 jours
});

// ===== INDEX COMPOSÉS POUR PERFORMANCE =====

// Index principal : joueur + temps (requête la plus fréquente)
PlayerActionSchema.index({ playerId: 1, timestamp: -1 });

// Index pour analyses comportementales
PlayerActionSchema.index({ playerId: 1, actionType: 1, timestamp: -1 });

// Index pour analyse temps réel (actions récentes)
PlayerActionSchema.index({ timestamp: -1, 'metadata.flagged': 1 });

// Index pour analyses par session
PlayerActionSchema.index({ sessionId: 1, timestamp: 1 });

// Index pour analyses par map/zone
PlayerActionSchema.index({ 'context.currentMap': 1, timestamp: -1 });

// Index pour détection de frustration
PlayerActionSchema.index({ 
  playerId: 1, 
  'context.recentFailures': 1, 
  timestamp: -1 
});

// Index pour analyse sociale
PlayerActionSchema.index({ 
  'context.isAlone': 1, 
  'context.friendsOnline': 1,
  timestamp: -1 
});

// ===== MÉTHODES STATIQUES UTILES =====

/**
 * Récupérer les actions récentes d'un joueur
 */
PlayerActionSchema.statics.getRecentActions = function(playerId: string, limit: number = 20) {
  return this.find({ playerId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean(); // Plus rapide, retourne des objets JS simples
};

/**
 * Récupérer les actions d'une session
 */
PlayerActionSchema.statics.getSessionActions = function(sessionId: string) {
  return this.find({ sessionId })
    .sort({ timestamp: 1 })
    .lean();
};

/**
 * Compter les actions par type pour un joueur
 */
PlayerActionSchema.statics.getActionCounts = function(playerId: string, timeframe: number = 24 * 60 * 60 * 1000) {
  const since = Date.now() - timeframe;
  
  return this.aggregate([
    { 
      $match: { 
        playerId, 
        timestamp: { $gte: since } 
      } 
    },
    { 
      $group: { 
        _id: '$actionType', 
        count: { $sum: 1 } 
      } 
    },
    { 
      $sort: { count: -1 } 
    }
  ]);
};

/**
 * Détecter patterns de frustration récents
 */
PlayerActionSchema.statics.findFrustrationPatterns = function(playerId: string) {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  
  return this.find({
    playerId,
    timestamp: { $gte: tenMinutesAgo },
    $or: [
      { 'context.recentFailures': { $gte: 3 } },
      { 'metadata.flagged': true },
      { actionType: ActionType.FRUSTRATION_EVENT }
    ]
  }).sort({ timestamp: -1 });
};

/**
 * Statistiques de session
 */
PlayerActionSchema.statics.getSessionStats = function(sessionId: string) {
  return this.aggregate([
    { $match: { sessionId } },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        uniqueActionTypes: { $addToSet: '$actionType' },
        mapsVisited: { $addToSet: '$context.currentMap' },
        startTime: { $min: '$timestamp' },
        endTime: { $max: '$timestamp' },
        avgProcessingTime: { $avg: '$metadata.processingTime' }
      }
    },
    {
      $project: {
        _id: 0,
        totalActions: 1,
        uniqueActionTypes: { $size: '$uniqueActionTypes' },
        mapsVisited: 1,
        sessionDuration: { $subtract: ['$endTime', '$startTime'] },
        avgProcessingTime: 1
      }
    }
  ]);
};

// ===== MIDDLEWARE =====

// Validation avant sauvegarde
PlayerActionSchema.pre('save', function(next) {
  // Vérifier que timestamp est valide
  if (!this.timestamp || this.timestamp <= 0) {
    this.timestamp = Date.now();
  }
  
  // Assurer que data existe
  if (!this.data) this.data = {};
  
  // Assurer que context a la structure minimale requise
  if (!this.context) {
    this.context = {
      timeOfDay: 'afternoon',
      dayOfWeek: 'Monday',
      currentMap: 'unknown',
      nearbyPlayers: [],
      nearbyNPCs: [],
      isAlone: true,
      friendsOnline: 0,
      currentGold: 0,
      currentLevel: 1,
      teamSize: 0,
      inventoryFull: false,
      recentFailures: 0,
      consecutiveActions: 1,
      idleTime: 0
    };
  }
  
  // Assurer que metadata existe
  if (!this.metadata) {
    this.metadata = {
      analysisComplete: false,
      flagged: false,
      patterns: []
    };
  }
  
  next();
});

// ===== EXPORT =====
export const PlayerAction = mongoose.model<IPlayerAction>("PlayerAction", PlayerActionSchema);
