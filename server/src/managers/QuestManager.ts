// server/src/managers/QuestManager.ts - VERSION REFACTORISÉE

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
  questName?: string;
  
  // ✅ PHASES DISTINCTES
  objectiveCompleted?: boolean;
  objectiveName?: string;
  stepCompleted?: boolean;
  stepName?: string;
  questCompleted?: boolean;
  
  // ✅ DONNÉES DE PROGRESSION
  newStepIndex?: number;
  newObjectives?: QuestObjective[];
  stepRewards?: QuestReward[];
  questRewards?: QuestReward[];
  
  // ✅ GESTION AUTO-COMPLETE
  requiresNpcReturn?: boolean;
  autoCompleted?: boolean;
  
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

  // ✅ === NOUVELLE LOGIQUE DE PROGRESSION AVEC PHASES ===
  async updateQuestProgress(
    username: string, 
    event: QuestProgressEvent
  ): Promise<QuestUpdateResult[]> {
    console.log(`📈 === UPDATE QUEST PROGRESS ===`);
    console.log(`👤 Username: ${username}`);
    console.log(`🎯 Event:`, event);

    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) {
      console.log(`⚠️ Aucune quête trouvée pour ${username}`);
      return [];
    }

    const results: QuestUpdateResult[] = [];

    for (const questProgress of playerQuests.activeQuests) {
      if (questProgress.status !== 'active') continue;

      const definition = this.questDefinitions.get(questProgress.questId);
      if (!definition) continue;

      console.log(`🔍 Vérification quête: ${definition.name} (étape ${questProgress.currentStepIndex})`);

      const currentStep = definition.steps[questProgress.currentStepIndex];
      if (!currentStep) {
        console.log(`⚠️ Étape courante introuvable pour ${definition.name}`);
        continue;
      }

      // ✅ VÉRIFIER CHAQUE OBJECTIF DE L'ÉTAPE COURANTE
      let objectiveCompleted = false;
      let stepModified = false;
      let completedObjectiveName = "";

      for (const objective of currentStep.objectives) {
        const progressKey = objective.id;
        
        const objectivesMap = questProgress.objectives instanceof Map 
          ? questProgress.objectives 
          : new Map(Object.entries(questProgress.objectives || {}));
        
        const progressData = objectivesMap.get(progressKey) as { currentAmount: number; completed: boolean } | undefined;
        
        if (progressData?.completed) {
          console.log(`✅ Objectif ${objective.id} déjà complété`);
          continue;
        }

        // ✅ VÉRIFIER SI L'ÉVÉNEMENT CORRESPOND À CET OBJECTIF
        if (this.checkObjectiveProgress(objective, event)) {
          console.log(`🎯 Objectif ${objective.id} progresse !`);
          
          const currentProgress = progressData || { currentAmount: 0, completed: false };
          const amountToAdd = event.amount || 1;
          
          currentProgress.currentAmount = Math.min(
            currentProgress.currentAmount + amountToAdd,
            objective.requiredAmount
          );

          console.log(`📊 Progression: ${currentProgress.currentAmount}/${objective.requiredAmount}`);

          // ✅ PHASE 1 : OBJECTIF COMPLÉTÉ
          if (currentProgress.currentAmount >= objective.requiredAmount) {
            currentProgress.completed = true;
            objectiveCompleted = true;
            completedObjectiveName = objective.description;
            
            console.log(`🎉 Objectif complété: ${objective.description}`);
          }
          
          objectivesMap.set(progressKey, currentProgress);
          questProgress.objectives = objectivesMap as any;
          stepModified = true;
          
          // Un seul objectif peut progresser par événement
          break;
        }
      }

      // ✅ TRAITEMENT DES RÉSULTATS SI MODIFICATION
      if (stepModified) {
        const result = await this.processStepProgress(
          username, 
          questProgress, 
          definition, 
          currentStep,
          objectiveCompleted,
          completedObjectiveName,
          playerQuests
        );
        
        if (result) {
          results.push(result);
        }
      }
    }

    // ✅ SAUVEGARDER SI DES CHANGEMENTS
    if (results.length > 0) {
      await playerQuests.save();
      console.log(`💾 Sauvegarde des progressions de quête pour ${username}`);
    }

    return results;
  }

  // ✅ === TRAITEMENT DES PHASES DE PROGRESSION ===
  private async processStepProgress(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    currentStep: any,
    objectiveCompleted: boolean,
    completedObjectiveName: string,
    playerQuests: any
  ): Promise<QuestUpdateResult | null> {
    
    const objectivesMap = questProgress.objectives instanceof Map 
      ? questProgress.objectives 
      : new Map(Object.entries(questProgress.objectives || {}));

    // ✅ VÉRIFIER SI TOUTE L'ÉTAPE EST COMPLÉTÉE
    const allObjectivesCompleted = currentStep.objectives.every(
      (obj: any) => {
        const progress = objectivesMap.get(obj.id) as { currentAmount: number; completed: boolean } | undefined;
        return progress?.completed;
      }
    );

    // ✅ PHASE 2 : ÉTAPE COMPLÉTÉE
    if (allObjectivesCompleted) {
      console.log(`🎊 Étape complétée: ${currentStep.name}`);
      
      // Distribuer les récompenses d'étape
      const stepRewards = currentStep.rewards || [];
      if (stepRewards.length > 0) {
        await this.distributeRewards(username, stepRewards);
      }

      // Passer à l'étape suivante
      questProgress.currentStepIndex++;

      // ✅ PHASE 3 : VÉRIFIER SI QUÊTE COMPLÉTÉE
      if (questProgress.currentStepIndex >= definition.steps.length) {
        console.log(`🏆 QUÊTE COMPLÉTÉE: ${definition.name}`);
        
        return await this.handleQuestCompletion(
          username,
          questProgress,
          definition,
          stepRewards,
          playerQuests
        );
      } else {
        // ✅ PRÉPARER LA PROCHAINE ÉTAPE
        const nextStep = definition.steps[questProgress.currentStepIndex];
        console.log(`➡️ Passage à l'étape suivante: ${nextStep.name}`);
        
        // Initialiser les objectifs de la prochaine étape
        for (const objective of nextStep.objectives) {
          objectivesMap.set(objective.id, {
            currentAmount: 0,
            completed: false
          });
        }
        questProgress.objectives = objectivesMap as any;

        return {
          questId: questProgress.questId,
          questName: definition.name,
          stepCompleted: true,
          stepName: currentStep.name,
          newStepIndex: questProgress.currentStepIndex,
          newObjectives: nextStep.objectives.map((obj: any) => ({
            ...obj,
            currentAmount: 0,
            completed: false
          })),
          stepRewards: stepRewards,
          message: `Étape "${currentStep.name}" terminée ! Objectif suivant: ${nextStep.name}`
        };
      }
    } else {
      // ✅ OBJECTIF COMPLÉTÉ MAIS PAS TOUTE L'ÉTAPE
      if (objectiveCompleted) {
        return {
          questId: questProgress.questId,
          questName: definition.name,
          objectiveCompleted: true,
          objectiveName: completedObjectiveName,
          message: `Objectif complété: ${completedObjectiveName}`
        };
      } else {
        // Simple progression
        return {
          questId: questProgress.questId,
          questName: definition.name,
          message: `Progression de quête mise à jour`
        };
      }
    }
  }

  // ✅ === GESTION DE LA COMPLETION DE QUÊTE ===
  private async handleQuestCompletion(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    stepRewards: QuestReward[],
    playerQuests: any
  ): Promise<QuestUpdateResult> {
    
    console.log(`🏆 === COMPLETION QUÊTE ${definition.name} ===`);

    // Calculer toutes les récompenses de quête (étapes finales)
    const questRewards = this.calculateFinalQuestRewards(definition);
    
    // ✅ VÉRIFIER LE FLAG AUTO-COMPLETE
    const autoComplete = definition.autoComplete !== false; // Par défaut true
    
    if (autoComplete) {
      console.log(`🤖 Auto-completion activée pour ${definition.name}`);
      
      // Distribuer immédiatement toutes les récompenses
      const allRewards = [...stepRewards, ...questRewards];
      if (allRewards.length > 0) {
        await this.distributeRewards(username, allRewards);
      }
      
      // Marquer comme terminée
      await this.completeQuest(username, questProgress, definition, playerQuests);
      
      return {
        questId: questProgress.questId,
        questName: definition.name,
        questCompleted: true,
        autoCompleted: true,
        stepRewards: stepRewards,
        questRewards: questRewards,
        message: `Quête "${definition.name}" terminée automatiquement !`
      };
      
    } else {
      console.log(`👤 Completion manuelle requise pour ${definition.name}`);
      
      // Marquer comme "prête à rendre" mais ne pas distribuer les récompenses
      questProgress.status = 'readyToComplete';
      
      return {
        questId: questProgress.questId,
        questName: definition.name,
        questCompleted: true,
        autoCompleted: false,
        requiresNpcReturn: true,
        stepRewards: stepRewards,
        questRewards: questRewards, // Les récompenses seront données au NPC
        message: `Quête "${definition.name}" terminée ! Retournez voir ${this.getNpcName(definition.endNpcId)} pour récupérer vos récompenses.`
      };
    }
  }

  // ✅ === COMPLETION MANUELLE VIA NPC ===
  async completeQuestManually(username: string, questId: string): Promise<QuestUpdateResult | null> {
    console.log(`👤 === COMPLETION MANUELLE QUÊTE ${questId} ===`);
    
    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) return null;

    const questProgress = playerQuests.activeQuests.find((q: any) => 
      q.questId === questId && q.status === 'readyToComplete'
    );
    
    if (!questProgress) {
      console.warn(`⚠️ Quête ${questId} non prête à compléter pour ${username}`);
      return null;
    }

    const definition = this.questDefinitions.get(questId);
    if (!definition) return null;

    // Distribuer les récompenses de quête
    const questRewards = this.calculateFinalQuestRewards(definition);
    if (questRewards.length > 0) {
      await this.distributeRewards(username, questRewards);
    }

    // Marquer comme terminée
    await this.completeQuest(username, questProgress, definition, playerQuests);
    await playerQuests.save();

    return {
      questId: questId,
      questName: definition.name,
      questCompleted: true,
      autoCompleted: false,
      questRewards: questRewards,
      message: `Félicitations ! Vous avez terminé "${definition.name}" !`
    };
  }

  // ✅ === VÉRIFICATION OBJECTIFS AMÉLIORÉE ===
  private checkObjectiveProgress(objective: any, event: QuestProgressEvent): boolean {
    console.log(`🔍 Vérification objectif: ${objective.type} vs event: ${event.type}`);
    console.log(`🎯 Objectif target: ${objective.target}, Event targetId: ${event.targetId}`);
    
    switch (objective.type) {
      case 'collect':
        const collectMatch = event.type === 'collect' && event.targetId === objective.target;
        console.log(`📦 Collect match: ${collectMatch}`);
        return collectMatch;
      
      case 'defeat':
        const defeatMatch = event.type === 'defeat' && 
               (objective.target === 'wild' || event.pokemonId?.toString() === objective.target);
        console.log(`⚔️ Defeat match: ${defeatMatch}`);
        return defeatMatch;
      
      case 'talk':
        // ✅ FIX CRITIQUE : Vérification talk améliorée
        const talkMatch = event.type === 'talk' && 
               (event.npcId?.toString() === objective.target || 
                event.targetId?.toString() === objective.target);
        console.log(`💬 Talk match: ${talkMatch} (npcId: ${event.npcId}, target: ${objective.target})`);
        return talkMatch;
      
      case 'reach':
        const reachMatch = event.type === 'reach' && event.targetId === objective.target;
        console.log(`📍 Reach match: ${reachMatch}`);
        return reachMatch;
      
      case 'deliver':
        const deliverMatch = event.type === 'deliver' && 
               event.npcId?.toString() === objective.target && 
               event.targetId === objective.itemId;
        console.log(`🚚 Deliver match: ${deliverMatch}`);
        return deliverMatch;
      
      default:
        console.log(`❓ Type d'objectif inconnu: ${objective.type}`);
        return false;
    }
  }

  // ✅ === DISTRIBUTION DES RÉCOMPENSES ===
  private async distributeRewards(username: string, rewards: QuestReward[]): Promise<void> {
    console.log(`🎁 Distribution récompenses pour ${username}:`, rewards);
    
    for (const reward of rewards) {
      try {
        switch (reward.type) {
          case 'gold':
            // TODO: Implémenter système de monnaie
            console.log(`💰 ${username} reçoit ${reward.amount} gold`);
            break;
            
          case 'item':
            // TODO: Intégrer avec InventoryManager
            console.log(`📦 ${username} reçoit ${reward.amount || 1}x ${reward.itemId}`);
            break;
            
          case 'experience':
            // TODO: Implémenter système d'XP
            console.log(`⭐ ${username} reçoit ${reward.amount} XP`);
            break;
            
          case 'pokemon':
            // TODO: Implémenter don de Pokémon
            console.log(`🎁 ${username} reçoit un Pokémon spécial`);
            break;
            
          default:
            console.warn(`⚠️ Type de récompense inconnu: ${reward.type}`);
        }
      } catch (error) {
        console.error(`❌ Erreur distribution récompense ${reward.type}:`, error);
      }
    }
  }

  // ✅ === HELPERS ===
  
  private calculateFinalQuestRewards(definition: QuestDefinition): QuestReward[] {
    const finalStep = definition.steps[definition.steps.length - 1];
    return finalStep?.rewards || [];
  }

  private getNpcName(npcId?: number): string {
    if (!npcId) return "le PNJ approprié";
    
    // TODO: Récupérer le nom depuis NPCManager
    const npcNames: { [key: number]: string } = {
      1: "Professeur Oak",
      82: "Bob le pêcheur",
      5: "Le collecteur de baies",
      10: "Le maître dresseur"
    };
    
    return npcNames[npcId] || `PNJ #${npcId}`;
  }

  private async completeQuest(username: string, questProgress: any, definition: QuestDefinition, playerQuests: any): Promise<void> {
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

  // ✅ === MÉTHODES EXISTANTES CONSERVÉES ===

  async getActiveQuests(username: string): Promise<Quest[]> {
    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) return [];

    const activeQuests: Quest[] = [];
    
    for (const progress of playerQuests.activeQuests) {
      if (progress.status === 'active' || progress.status === 'readyToComplete') {
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

  // ✅ === NOUVELLES MÉTHODES UTILITAIRES ===

  async getQuestStatus(username: string, questId: string): Promise<'available' | 'active' | 'readyToComplete' | 'completed' | 'unavailable'> {
    const availableQuests = await this.getAvailableQuests(username);
    if (availableQuests.find(q => q.id === questId)) {
      return 'available';
    }

    const activeQuests = await this.getActiveQuests(username);
    const activeQuest = activeQuests.find(q => q.id === questId);
    
    if (activeQuest) {
      if (activeQuest.status === 'readyToComplete') {
        return 'readyToComplete';
      }
      return 'active';
    }

    const playerQuests = await PlayerQuest.findOne({ username });
    const completedQuestIds = playerQuests?.completedQuests.map((q: any) => q.questId) || [];
    
    if (completedQuestIds.includes(questId)) {
      return 'completed';
    }

    return 'unavailable';
  }

  async isQuestReadyToComplete(username: string, questId: string): Promise<boolean> {
    const status = await this.getQuestStatus(username, questId);
    return status === 'readyToComplete';
  }
}
