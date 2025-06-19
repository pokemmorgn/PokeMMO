// server/src/models/PlayerQuest.ts

import mongoose from "mongoose";

const QuestObjectiveProgressSchema = new mongoose.Schema({
  objectiveId: { type: String, required: true },
  currentAmount: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
});

const PlayerQuestProgressSchema = new mongoose.Schema({
  questId: { type: String, required: true },
  currentStepIndex: { type: Number, default: 0 },
  objectives: [QuestObjectiveProgressSchema],
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

export const PlayerQuest = mongoose.model("PlayerQuest", PlayerQuestSchema);
