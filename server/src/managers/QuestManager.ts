// server/src/managers/QuestManager.ts

import fs from "fs";
import path from "path";
import { PlayerQuest } from "../models/PlayerQuest";
import { 
  QuestDefinition, 
  Quest, 
  PlayerQuestProgress, 
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

  constructor(questDataPath: string = "../assets/data/quests.json") {
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

  // === GESTION DES QUÊTES DISPONIBLES ===

  async getAvailableQuests(username: string): Promise<QuestDefinition[]> {
    const playerQuests = await PlayerQuest.findOne({ username });
    const completedQuestIds = playerQuests?.completedQuests.map(q => q.questId) || [];
    const activeQuestIds = playerQuests?.activeQuests.map(q => q.questId) || [];

    const available: QuestDefinition[] = [];

    for (const [questId, definition] of this.questDefinitions) {
      // Vérifier si la quête peut être prise
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
    // Déjà active
    if (activeQuestIds.includes(quest.id)) return false;

    // Non répétable et déjà complétée
    if (!quest.isRepeatable && completedQuestIds.includes(quest.id)) return false;

    // Vérifier le cooldown pour les quêtes répétables
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

    // Vérifier les prérequis
    if (quest.prerequisites) {
      for (const prereqId of quest.prerequisites) {
        if (!completedQuestIds.includes(prereqId)) return false;
      }
    }

    return true;
  }

  // === DÉMARRAGE DES QUÊTES ===

  async startQuest(username: string, questId: string): Promise<Quest | null> {
    const definition = this.questDefinitions.get(questId);
    if (!definition) {
      console.error(`❌ Quête introuvable: ${questId}`);
      return null;
    }

    // Vérifier si le joueur peut prendre cette quête
    const availableQuests = await this.getAvailableQuests(username);
    if (!availableQuests.find(q => q.id === questId)) {
      console.error(`❌ ${username} ne peut pas prendre la quête ${questId}`);
      return null;
    }

    // Créer la progression de quête
    const questProgress: PlayerQuestProgress = {
      questId,
      currentStepIndex: 0,
      objectives: {},
      status: 'active',
      startedAt: new Date()
    };

    // Initialiser les objectifs de la première étape
    const firstStep = definition.steps[0];
    for (const objective of firstStep.objectives) {
      questProgress.objectives[objective.id] = {
        currentAmount: 0,
        completed: false
      };
    }

    // Sauvegarder en base
    let playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) {
      playerQuests = new PlayerQuest({ 
        username, 
        activeQuests: [questProgress],
        completedQuests: [],
        lastQuestCompletions: []
      });
    } else {
      playerQuests.activeQuests.push(questProgress);
    }

    await playerQuests.save();

    console.log(`✅ ${username} a commencé la quête: ${definition.name}`);
    
    return this.buildQuestFromProgress(definition, questProgress);
  }

  // === PROGRESSION DES QUÊTES ===

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
      let stepCompleted = false;

      // Vérifier chaque objectif de l'étape actuelle
      for (const objective of currentStep.objectives) {
        if (questProgress.objectives[objective.id]?.completed) continue;

        if (this.checkObjectiveProgress(objective, event)) {
          const progress = questProgress.objectives[objective.id];
          progress.currentAmount = Math.min(
            progress.currentAmount + (event.amount || 1),
            objective.requiredAmount
          );

          if (progress.currentAmount >= objective.requiredAmount) {
            progress.completed = true;
          }
          
          stepModified = true;
        }
      }

      // Vérifier si l'étape est complétée
      if (stepModified) {
        const allObjectivesCompleted = currentStep.objectives.every(
          obj => questProgress.objectives[obj.id]?.completed
        );

        if (allObjectivesCompleted) {
          stepCompleted = true;
          questProgress.currentStepIndex++;

          // Vérifier si la quête est terminée
          if (questProgress.currentStepIndex >= definition.steps.length) {
            await this.completeQuest(username, questProgress, playerQuests);
            results.push({
              questId: questProgress.questId,
              questCompleted: true,
              rewards: currentStep.rewards,
              message: `Quête "${definition.name}" terminée !`
            });
          } else {
            // Initialiser les objectifs de la prochaine étape
            const nextStep = definition.steps[questProgress.currentStepIndex];
            for (const objective of nextStep.objectives) {
              questProgress.objectives[objective.id] = {
                currentAmount: 0,
                completed: false
              };
            }

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
      
      default:
        return false;
    }
  }

  private async completeQuest(
    username: string, 
    questProgress: PlayerQuestProgress, 
    playerQuests: any
  ): Promise<void> {
    const definition = this.questDefinitions.get(questProgress.questId);
    if (!definition) return;

    // Marquer comme complétée
    questProgress.status = 'completed';
    questProgress.completedAt = new Date();

    // Ajouter aux quêtes complétées
    playerQuests.completedQuests.push({
      questId: questProgress.questId,
      completedAt: questProgress.completedAt,
      stepCount: definition.steps.length
    });

    // Pour les quêtes répétables, enregistrer la date de completion
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

    // Retirer des quêtes actives
    playerQuests.activeQuests = playerQuests.activeQuests.filter(
      (q: PlayerQuestProgress) => q.questId !== questProgress.questId
    );

    console.log(`🎉 ${username} a terminé la quête: ${definition.name}`);
  }

  // === UTILITAIRES ===

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

  private buildQuestFromProgress(definition: QuestDefinition, progress: PlayerQuestProgress): Quest {
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
          const objProgress = progress.objectives[objDef.id];
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

  // Pour les NPCs qui donnent des quêtes
  getQuestsForNpc(npcId: number): QuestDefinition[] {
    return Array.from(this.questDefinitions.values()).filter(
      quest => quest.startNpcId === npcId || quest.endNpcId === npcId
    );
  }
}
