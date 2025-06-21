// server/src/models/PlayerQuest.ts - VERSION CORRIGÉE

import mongoose, { Document } from "mongoose";

// Interfaces TypeScript MISES À JOUR
export interface IPlayerQuestProgress {
  questId: string;
  currentStepIndex: number;
  objectives: Map<string, {
    currentAmount: number;
    completed: boolean;
  }>;
  status: 'active' | 'readyToComplete' | 'completed' | 'failed'; // ✅ AJOUT readyToComplete
  startedAt: Date;
  completedAt?: Date;
}

export interface IPlayerQuest extends Document {
  username: string;
  activeQuests: IPlayerQuestProgress[];
  completedQuests: {
    questId: string;
    completedAt: Date;
    stepCount: number;
  }[];
  lastQuestCompletions: {
    questId: string;
    lastCompletedAt: Date;
  }[];
}

// ✅ SCHÉMA MONGODB CORRIGÉ
const PlayerQuestSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  activeQuests: [{
    questId: { type: String, required: true },
    currentStepIndex: { type: Number, default: 0 },
    objectives: { type: Map, of: mongoose.Schema.Types.Mixed, default: new Map() },
    status: { 
      type: String, 
      enum: ['active', 'readyToComplete', 'completed', 'failed'], // ✅ AJOUT readyToComplete
      default: 'active' 
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  }],
  completedQuests: [{ 
    questId: String, 
    completedAt: Date,
    stepCount: Number 
  }],
  lastQuestCompletions: [{ 
    questId: String,
    lastCompletedAt: Date
  }]
});

// Index pour les requêtes fréquentes
PlayerQuestSchema.index({ username: 1 });
PlayerQuestSchema.index({ "activeQuests.questId": 1 });

// Export du modèle
export const PlayerQuest = mongoose.model<IPlayerQuest>("PlayerQuest", PlayerQuestSchema);
