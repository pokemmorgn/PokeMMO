// server/src/models/PlayerQuest.ts

import mongoose, { Document } from "mongoose";

// Interfaces TypeScript d'abord
export interface IPlayerQuestProgress {
  questId: string;
  currentStepIndex: number;
  objectives: Map<string, {
    currentAmount: number;
    completed: boolean;
  }>;
  status: 'active' | 'completed' | 'failed';
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

// Schémas MongoDB
const QuestObjectiveProgressSchema = new mongoose.Schema({
  objectiveId: { type: String, required: true },
  currentAmount: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
});

const PlayerQuestProgressSchema = new mongoose.Schema({
  questId: { type: String, required: true },
  currentStepIndex: { type: Number, default: 0 },
  objectives: { type: Map, of: mongoose.Schema.Types.Mixed, default: new Map() },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'failed'], 
    default: 'active' 
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

const PlayerQuestSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  activeQuests: [PlayerQuestProgressSchema],
  completedQuests: [{ 
    questId: String, 
    completedAt: Date,
    stepCount: Number 
  }],
  lastQuestCompletions: [{ // Pour les quêtes répétables
    questId: String,
    lastCompletedAt: Date
  }]
});

// Index pour les requêtes fréquentes
PlayerQuestSchema.index({ username: 1 });
PlayerQuestSchema.index({ "activeQuests.questId": 1 });

// Export du modèle
export const PlayerQuest = mongoose.model<IPlayerQuest>("PlayerQuest", PlayerQuestSchema);
