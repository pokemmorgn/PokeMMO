// server/src/managers/QuestManager.ts

import fs from "fs";
import path from "path";
import { PlayerQuest } from "../models/PlayerQuest";
import { 
  QuestDefinition, 
  Quest, 
  QuestProgressEvent,
  QuestObjective,
  QuestReward 
} from "../types/QuestTypes";

export interface QuestUpdateResult {
  questId: string;
  stepCompleted?: boolean;
  questCompleted?: boolean;
  newObjectives?: QuestObjective[];
  rewards?: QuestReward[];
  message?: string;
}

export class QuestManager {
  private questDefinitions: Map<string, QuestDefinition> = new Map();

  constructor(questDataPath: string = "../data/quests/quests.json") {
    this.loadQuestDefinitions(questDataPath);
  }

  private loadQuestDefinitions(questDataPath: string): void {
    try {
      const resolvedPath = path.resolve(__dirname, questDataPath);
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`⚠️ Fichier de quêtes introuvable : ${resolvedPath}`);
        return;
      }

      const questData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      
      for (const quest of questData.quests) {
        this.questDefinitions.set(quest.id, quest);
      }

      console.log(`📜 ${this.questDefinitions.size} définitions de quêtes chargées`);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des quêtes:", error);
    }
  }

  async getAvailableQuests(username: string): Promise<QuestDefinition[]> {
    const playerQuests = await PlayerQuest.findOne({ username });
    const completedQuestIds = playerQuests?.completedQuests.map((q: any) => q.questId) || [];
    const activeQuestIds = playerQuests?.activeQuests.map((q: any) => q.questId) || [];

    const available: QuestDefinition[] = [];

    for (const [questId, definition] of this.questDefinitions) {
      if (this.canTakeQuest(definition, completedQuestIds, activeQuestIds, playerQuests)) {
        available.push(definition);
      }
    }

    return available;
  }

  private canTakeQuest(
    quest: QuestDefinition,
    completedQuestIds: string[],
    activeQuestIds: string[],
    playerQuests: any
  ): boolean {
    if (activeQuestIds.includes(quest.id)) return false;
    if (!quest.isRepeatable && completedQuestIds.includes(quest.id)) return false;

    if (quest.isRepeatable && quest.cooldownHours) {
      const lastCompletion = playerQuests?.lastQuestCompletions?.find(
        (c: any) => c.questId === quest.id
      );
      if (lastCompletion) {
        const cooldownMs = quest.cooldownHours * 60 * 60 * 1000;
        const timeSinceCompletion = Date.now() - new Date(lastCompletion.lastCompletedAt).getTime();
        if (timeSinceCompletion < cooldownMs) return false;
      }
    }

    if (quest.prerequisites) {
      for (const prereqId of quest.prerequisites) {
        if (!completedQuestIds.includes(prereqId)) return false;
      }
    }

    return true;
  }

  async startQuest(username: string, questId: string): Promise<Quest | null> {
    const definition = this.questDefinitions.get(questId);
    if (!definition) {
      console.error(`❌ Quête introuvable: ${questId}`);
      return null;
    }

    const availableQuests = await this.getAvailableQuests(username);
    if (!availableQuests.find(q => q.id === questId)) {
      console.error(`❌ ${username} ne peut pas prendre la quête ${questId}`);
      return null;
    }

    const objectivesMap = new Map();
    const firstStep = definition.steps[0];
    for (const objective of firstStep.objectives) {
      objectivesMap.set(objective.id, {
        currentAmount: 0,
        completed: false
      });
    }

    const questProgress = {
      questId,
      currentStepIndex: 0,
      objectives: objectivesMap,
      status: 'active' as const,
      startedAt: new Date()
    };

    let playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) {
      playerQuests = new PlayerQuest({ 
        username, 
        activeQuests: [questProgress],
        completedQuests: [],
        lastQuestCompletions: []
      });
    } else {
      playerQuests.activeQuests.push(questProgress as any);
    }

    await playerQuests.save();
    console.log(`✅ ${username} a commencé la quête: ${definition.name}`);
    
    return this.buildQuestFromProgress(definition, questProgress);
  }

  async updateQuestProgress(
    username: string, 
    event: QuestProgressEvent
  ): Promise<QuestUpdateResult[]> {
    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) return [];

    const results: QuestUpdateResult[] = [];

    for (const questProgress of playerQuests.activeQuests) {
      if (questProgress.status !== 'active') continue;

      const definition = this.questDefinitions.get(questProgress.questId);
      if (!definition) continue;

      const currentStep = definition.steps[questProgress.currentStepIndex];
      if (!currentStep) continue;

      let stepModified = false;

      for (const objective of currentStep.objectives) {
        const progressKey = objective.id;
        
        const objectivesMap = questProgress.objectives instanceof Map 
          ? questProgress.objectives 
          : new Map(Object.entries(questProgress.objectives || {}));
        
        const progressData = objectivesMap.get(progressKey) as { currentAmount: number; completed: boolean } | undefined;
        
        if (progressData?.completed) continue;

        if (this.checkObjectiveProgress(objective, event)) {
          const currentProgress = progressData || { currentAmount: 0, completed: false };
          currentProgress.currentAmount = Math.min(
            currentProgress.currentAmount + (event.amount || 1),
            objective.requiredAmount
          );

          if (currentProgress.currentAmount >= objective.requiredAmount) {
            currentProgress.completed = true;
          }
          
          objectivesMap.set(progressKey, currentProgress);
          questProgress.objectives = objectivesMap as any;
          stepModified = true;
        }
      }

      if (stepModified) {
        const objectivesMap = questProgress.objectives instanceof Map 
          ? questProgress.objectives 
          : new Map(Object.entries(questProgress.objectives || {}));

        const allObjectivesCompleted = currentStep.objectives.every(
          obj => {
            const progress = objectivesMap.get(obj.id) as { currentAmount: number; completed: boolean } | undefined;
            return progress?.completed;
          }
        );

        if (allObjectivesCompleted) {
          questProgress.currentStepIndex++;

          if (questProgress.currentStepIndex >= definition.steps.length) {
            await this.completeQuest(username, questProgress, playerQuests);
            results.push({
              questId: questProgress.questId,
              questCompleted: true,
              rewards: currentStep.rewards,
              message: `Quête "${definition.name}" terminée !`
            });
          } else {
            const nextStep = definition.steps[questProgress.currentStepIndex];
            for (const objective of nextStep.objectives) {
              objectivesMap.set(objective.id, {
                currentAmount: 0,
                completed: false
              });
            }
            questProgress.objectives = objectivesMap as any;

            results.push({
              questId: questProgress.questId,
              stepCompleted: true,
              newObjectives: nextStep.objectives.map(obj => ({
                ...obj,
                currentAmount: 0,
                completed: false
              })),
              rewards: currentStep.rewards,
              message: `Étape "${currentStep.name}" terminée !`
            });
          }
        } else {
          results.push({
            questId: questProgress.questId,
            message: `Progression de quête mise à jour`
          });
        }
      }
    }

    if (results.length > 0) {
      await playerQuests.save();
    }

    return results;
  }

  private checkObjectiveProgress(objective: any, event: QuestProgressEvent): boolean {
    switch (objective.type) {
      case 'collect':
        return event.type === 'collect' && event.targetId === objective.target;
      
      case 'defeat':
        return event.type === 'defeat' && 
               (objective.target === 'wild' || event.pokemonId?.toString() === objective.target);
      
      case 'talk':
        return event.type === 'talk' && event.npcId?.toString() === objective.target;
      
      case 'reach':
        return event.type === 'reach' && event.targetId === objective.target;
      
      case 'deliver':
        return event.type === 'deliver' && 
               event.npcId?.toString() === objective.target && 
               event.targetId === objective.itemId;
      
      default:
        return false;
    }
  }

  private async completeQuest(username: string, questProgress: any, playerQuests: any): Promise<void> {
    const definition = this.questDefinitions.get(questProgress.questId);
    if (!definition) return;

    questProgress.status = 'completed';
    questProgress.completedAt = new Date();

    playerQuests.completedQuests.push({
      questId: questProgress.questId,
      completedAt: questProgress.completedAt,
      stepCount: definition.steps.length
    });

    if (definition.isRepeatable) {
      const existingCompletion = playerQuests.lastQuestCompletions.find(
        (c: any) => c.questId === questProgress.questId
      );
      if (existingCompletion) {
        existingCompletion.lastCompletedAt = questProgress.completedAt;
      } else {
        playerQuests.lastQuestCompletions.push({
          questId: questProgress.questId,
          lastCompletedAt: questProgress.completedAt
        });
      }
    }

    playerQuests.activeQuests = playerQuests.activeQuests.filter(
      (q: any) => q.questId !== questProgress.questId
    );

    console.log(`🎉 ${username} a terminé la quête: ${definition.name}`);
  }

  async getActiveQuests(username: string): Promise<Quest[]> {
    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) return [];

    const activeQuests: Quest[] = [];
    
    for (const progress of playerQuests.activeQuests) {
      if (progress.status === 'active') {
        const definition = this.questDefinitions.get(progress.questId);
        if (definition) {
          activeQuests.push(this.buildQuestFromProgress(definition, progress));
        }
      }
    }

    return activeQuests;
  }

  private buildQuestFromProgress(definition: QuestDefinition, progress: any): Quest {
    const quest: Quest = {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      prerequisites: definition.prerequisites,
      steps: definition.steps.map((stepDef, index) => ({
        id: stepDef.id,
        name: stepDef.name,
        description: stepDef.description,
        objectives: stepDef.objectives.map(objDef => {
          const objectivesMap = progress.objectives instanceof Map 
            ? progress.objectives 
            : new Map(Object.entries(progress.objectives || {}));
          
          const objProgress = objectivesMap.get(objDef.id) as { currentAmount: number; completed: boolean } | undefined;
          
          return {
            id: objDef.id,
            type: objDef.type,
            description: objDef.description,
            target: objDef.target,
            targetName: objDef.targetName,
            currentAmount: objProgress?.currentAmount || 0,
            requiredAmount: objDef.requiredAmount,
            completed: objProgress?.completed || false
          };
        }),
        rewards: stepDef.rewards,
        completed: index < progress.currentStepIndex
      })),
      currentStepIndex: progress.currentStepIndex,
      status: progress.status as any,
      startNpcId: definition.startNpcId,
      endNpcId: definition.endNpcId,
      isRepeatable: definition.isRepeatable,
      cooldownHours: definition.cooldownHours
    };

    return quest;
  }

  getQuestDefinition(questId: string): QuestDefinition | undefined {
    return this.questDefinitions.get(questId);
  }

  getQuestsForNpc(npcId: number): QuestDefinition[] {
    return Array.from(this.questDefinitions.values()).filter(
      quest => quest.startNpcId === npcId || quest.endNpcId === npcId
    );
  }
}
