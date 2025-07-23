// server/src/quest/services/QuestProgressTracker.ts
// 📊 SERVICE MODULAIRE : Gestion de la progression des quêtes
// Extrait de la logique updateQuestProgress() du QuestManager monolithique

import { QuestDefinition, QuestProgressEvent, QuestObjective, QuestUpdateResult } from "../core/types/QuestTypes";
import { PlayerQuest } from "../../models/PlayerQuest";

/**
 * 🎯 Interface du service de progression
 */
export interface IQuestProgressTracker {
  // Méthode principale : progression des objectifs
  updateProgress(username: string, event: QuestProgressEvent): Promise<QuestUpdateResult[]>;
  
  // Méthodes utilitaires
  checkObjectiveProgress(objective: QuestObjective, event: QuestProgressEvent): boolean;
  processStepProgress(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    currentStep: any,
    objectiveCompleted: boolean,
    completedObjectiveName: string,
    playerQuests: any
  ): Promise<QuestUpdateResult | null>;
  
  // Méthodes d'état
  getObjectiveProgress(username: string, questId: string, objectiveId: string): Promise<{ currentAmount: number; completed: boolean } | null>;
  validateQuestProgress(username: string, questId: string): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * 📊 Implémentation du service de progression des quêtes
 */
export class QuestProgressTracker implements IQuestProgressTracker {
  private questDefinitions: Map<string, QuestDefinition>;
  
  // Références aux autres services (injectées)
  private rewardDistributor?: any;
  private questValidator?: any;
  private clientHandler?: any;
  
  constructor(questDefinitions: Map<string, QuestDefinition>) {
    this.questDefinitions = questDefinitions;
    console.log(`📊 [QuestProgressTracker] Service initialisé avec ${questDefinitions.size} quêtes`);
  }
  
  /**
   * 🔗 Injection des dépendances vers autres services
   */
  setDependencies(
    rewardDistributor?: any,
    questValidator?: any,
    clientHandler?: any
  ): void {
    this.rewardDistributor = rewardDistributor;
    this.questValidator = questValidator;
    this.clientHandler = clientHandler;
    console.log(`🔗 [QuestProgressTracker] Dépendances injectées`);
  }
  
  /**
   * 📈 MÉTHODE PRINCIPALE : Mise à jour de la progression des quêtes
   * ✅ EXTRAITE de QuestManager.updateQuestProgress()
   */
  async updateProgress(
    username: string, 
    event: QuestProgressEvent
  ): Promise<QuestUpdateResult[]> {
    console.log(`📈 === QUEST PROGRESS TRACKER ===`);
    console.log(`👤 Username: ${username}`);
    console.log(`🎯 Event:`, event);

    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) {
      console.log(`⚠️ [QuestProgressTracker] Aucune quête trouvée pour ${username}`);
      return [];
    }

    const results: QuestUpdateResult[] = [];

    for (const questProgress of playerQuests.activeQuests) {
      if (questProgress.status !== 'active') continue;

      const definition = this.questDefinitions.get(questProgress.questId);
      if (!definition) {
        console.log(`⚠️ [QuestProgressTracker] Définition de quête introuvable: ${questProgress.questId}`);
        continue;
      }

      console.log(`🔍 [QuestProgressTracker] Vérification quête: ${definition.name} (étape ${questProgress.currentStepIndex})`);

      const currentStep = definition.steps[questProgress.currentStepIndex];
      if (!currentStep) {
        console.log(`⚠️ [QuestProgressTracker] Étape courante introuvable pour ${definition.name}`);
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
          console.log(`✅ [QuestProgressTracker] Objectif ${objective.id} déjà complété`);
          continue;
        }

        // ✅ VÉRIFIER SI L'ÉVÉNEMENT CORRESPOND À CET OBJECTIF
        if (this.checkObjectiveProgress(objective, event)) {
          console.log(`🎯 [QuestProgressTracker] Objectif ${objective.id} progresse !`);
          
          const currentProgress = progressData || { currentAmount: 0, completed: false };
          const amountToAdd = event.amount || 1;
          
          currentProgress.currentAmount = Math.min(
            currentProgress.currentAmount + amountToAdd,
            objective.requiredAmount
          );

          console.log(`📊 [QuestProgressTracker] Progression: ${currentProgress.currentAmount}/${objective.requiredAmount}`);

          // ✅ PHASE 1 : OBJECTIF COMPLÉTÉ
          if (currentProgress.currentAmount >= objective.requiredAmount) {
            currentProgress.completed = true;
            objectiveCompleted = true;
            completedObjectiveName = objective.description;
            
            console.log(`🎉 [QuestProgressTracker] Objectif complété: ${objective.description}`);
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
      console.log(`💾 [QuestProgressTracker] Sauvegarde des progressions de quête pour ${username}`);
      
      // 🔔 NOTIFIER LE CLIENT si service disponible
      if (this.clientHandler) {
        try {
          await this.clientHandler.notifyProgressUpdates(username, results);
        } catch (error) {
          console.warn(`⚠️ [QuestProgressTracker] Erreur notification client:`, error);
        }
      }
    }

    return results;
  }

  /**
   * 🔍 VÉRIFICATION OBJECTIFS AMÉLIORÉE
   * ✅ EXTRAITE de QuestManager.checkObjectiveProgress()
   */
  checkObjectiveProgress(objective: any, event: QuestProgressEvent): boolean {
    console.log(`🔍 [QuestProgressTracker] Vérification objectif: ${objective.type} vs event: ${event.type}`);
    console.log(`🎯 [QuestProgressTracker] Objectif target: ${objective.target}, Event targetId: ${event.targetId}`);
    
    // ✅ GESTION DES CONDITIONS AVANCÉES (nouveaux types étendus)
    if (objective.conditions) {
      if (!this.validateObjectiveConditions(objective.conditions, event)) {
        console.log(`❌ [QuestProgressTracker] Conditions d'objectif non respectées`);
        return false;
      }
    }
    
    switch (objective.type) {
      case 'collect':
        const collectMatch = event.type === 'collect' && event.targetId === objective.target;
        console.log(`📦 [QuestProgressTracker] Collect match: ${collectMatch}`);
        return collectMatch;
      
      case 'defeat':
        const defeatMatch = event.type === 'defeat' && 
               (objective.target === 'wild' || event.pokemonId?.toString() === objective.target);
        console.log(`⚔️ [QuestProgressTracker] Defeat match: ${defeatMatch}`);
        return defeatMatch;
      
      case 'talk':
        const talkMatch = event.type === 'talk' && 
               (event.npcId?.toString() === objective.target || 
                event.targetId?.toString() === objective.target);
        console.log(`💬 [QuestProgressTracker] Talk match: ${talkMatch} (npcId: ${event.npcId}, target: ${objective.target})`);
        return talkMatch;
      
      case 'reach':
        const reachMatch = event.type === 'reach' && event.targetId === objective.target;
        console.log(`📍 [QuestProgressTracker] Reach match: ${reachMatch}`);
        return reachMatch;
      
      case 'deliver':
        const deliverMatch = event.type === 'deliver' && 
               event.npcId?.toString() === objective.target && 
               event.targetId === objective.itemId;
        console.log(`🚚 [QuestProgressTracker] Deliver match: ${deliverMatch}`);
        return deliverMatch;
      
      // 🆕 NOUVEAUX TYPES ÉTENDUS
      case 'catch':
        const catchMatch = event.type === 'catch' && 
               (objective.target === 'any' || event.pokemonId?.toString() === objective.target);
        console.log(`⚡ [QuestProgressTracker] Catch match: ${catchMatch}`);
        return catchMatch;
      
      case 'encounter':
        const encounterMatch = event.type === 'encounter' && 
               (objective.target === 'any' || event.pokemonId?.toString() === objective.target);
        console.log(`👁️ [QuestProgressTracker] Encounter match: ${encounterMatch}`);
        return encounterMatch;
      
      case 'use':
        const useMatch = event.type === 'use' && event.targetId === objective.target;
        console.log(`🎯 [QuestProgressTracker] Use match: ${useMatch}`);
        return useMatch;
      
      case 'win':
        const winMatch = event.type === 'win' && event.targetId === objective.target;
        console.log(`🏆 [QuestProgressTracker] Win match: ${winMatch}`);
        return winMatch;
      
      case 'explore':
        const exploreMatch = event.type === 'explore' && event.targetId === objective.target;
        console.log(`🗺️ [QuestProgressTracker] Explore match: ${exploreMatch}`);
        return exploreMatch;
      
      default:
        console.log(`❓ [QuestProgressTracker] Type d'objectif inconnu: ${objective.type}`);
        return false;
    }
  }

  /**
   * 🆕 VALIDATION DES CONDITIONS AVANCÉES
   */
  private validateObjectiveConditions(conditions: any, event: QuestProgressEvent): boolean {
    // TODO: Implémenter validation conditions avancées
    // - timeOfDay, weather, season
    // - pokemonLevel, pokemonType, isShiny
    // - location, mapId, zone
    // - battleType, consecutive, perfectScore
    // - etc.
    
    console.log(`🔍 [QuestProgressTracker] Validation conditions avancées (TODO):`, conditions);
    return true; // Temporaire : toujours valide
  }

  /**
   * 🎯 TRAITEMENT DES PHASES DE PROGRESSION
   * ✅ EXTRAITE de QuestManager.processStepProgress()
   */
  async processStepProgress(
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

    console.log(`📊 [QuestProgressTracker] Étape ${currentStep.name} - Tous objectifs complétés: ${allObjectivesCompleted}`);

    // ✅ PHASE 2 : ÉTAPE COMPLÉTÉE
    if (allObjectivesCompleted) {
      console.log(`🎊 [QuestProgressTracker] Étape complétée: ${currentStep.name}`);
      
      // Distribuer les récompenses d'étape via RewardDistributor
      const stepRewards = currentStep.rewards || [];
      if (stepRewards.length > 0 && this.rewardDistributor) {
        try {
          await this.rewardDistributor.distributeStepRewards(username, stepRewards);
        } catch (error) {
          console.warn(`⚠️ [QuestProgressTracker] Erreur distribution récompenses d'étape:`, error);
        }
      }

      // Passer à l'étape suivante
      questProgress.currentStepIndex++;

      // ✅ PHASE 3 : VÉRIFIER SI QUÊTE COMPLÉTÉE
      if (questProgress.currentStepIndex >= definition.steps.length) {
        console.log(`🏆 [QuestProgressTracker] QUÊTE COMPLÉTÉE: ${definition.name}`);
        
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
        console.log(`➡️ [QuestProgressTracker] Passage à l'étape suivante: ${nextStep.name}`);
        
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

  /**
   * 🏆 GESTION DE LA COMPLETION DE QUÊTE
   * ✅ EXTRAITE de QuestManager.handleQuestCompletion()
   */
  private async handleQuestCompletion(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    stepRewards: any[],
    playerQuests: any
  ): Promise<QuestUpdateResult> {
    
    console.log(`🏆 [QuestProgressTracker] === COMPLETION QUÊTE ${definition.name} ===`);

    // Calculer toutes les récompenses de quête (étapes finales)
    const questRewards = this.calculateFinalQuestRewards(definition);
    
    // ✅ VÉRIFIER LE FLAG AUTO-COMPLETE
    const autoComplete = definition.autoComplete !== false; // Par défaut true si non défini
    
    if (autoComplete) {
      console.log(`🤖 [QuestProgressTracker] Auto-completion activée pour ${definition.name}`);
      
      // Distribuer immédiatement toutes les récompenses via RewardDistributor
      const allRewards = [...stepRewards, ...questRewards];
      if (allRewards.length > 0 && this.rewardDistributor) {
        try {
          await this.rewardDistributor.distributeQuestRewards(username, allRewards);
        } catch (error) {
          console.warn(`⚠️ [QuestProgressTracker] Erreur distribution récompenses de quête:`, error);
        }
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
      console.log(`👤 [QuestProgressTracker] Completion manuelle requise pour ${definition.name}`);
      
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

  /**
   * 🔧 HELPERS EXTRAITS
   */
  
  private calculateFinalQuestRewards(definition: QuestDefinition): any[] {
    const finalStep = definition.steps[definition.steps.length - 1];
    return finalStep?.rewards || [];
  }

  private getNpcName(npcId?: number): string {
    if (!npcId) return "le PNJ approprié";
    
    // TODO: Récupérer le nom depuis NPCManager via ServiceRegistry
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

    console.log(`🎉 [QuestProgressTracker] ${username} a terminé la quête: ${definition.name}`);
  }

  /**
   * 🔍 MÉTHODES UTILITAIRES
   */
  
  async getObjectiveProgress(
    username: string, 
    questId: string, 
    objectiveId: string
  ): Promise<{ currentAmount: number; completed: boolean } | null> {
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) return null;

      const questProgress = playerQuests.activeQuests.find((q: any) => q.questId === questId);
      if (!questProgress) return null;

      const objectivesMap = questProgress.objectives instanceof Map 
        ? questProgress.objectives 
        : new Map(Object.entries(questProgress.objectives || {}));

      return objectivesMap.get(objectiveId) as { currentAmount: number; completed: boolean } || null;
    } catch (error) {
      console.error(`❌ [QuestProgressTracker] Erreur getObjectiveProgress:`, error);
      return null;
    }
  }

  async validateQuestProgress(
    username: string, 
    questId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const result = { valid: true, errors: [] as string[] };
    
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) {
        result.valid = false;
        result.errors.push("Aucune donnée de quête trouvée");
        return result;
      }

      const questProgress = playerQuests.activeQuests.find((q: any) => q.questId === questId);
      if (!questProgress) {
        result.valid = false;
        result.errors.push("Quête non active");
        return result;
      }

      const definition = this.questDefinitions.get(questId);
      if (!definition) {
        result.valid = false;
        result.errors.push("Définition de quête introuvable");
        return result;
      }

      // Validation des étapes et objectifs
      if (questProgress.currentStepIndex >= definition.steps.length) {
        result.valid = false;
        result.errors.push("Index d'étape invalide");
      }

      // TODO: Ajouter plus de validations
      
    } catch (error) {
      result.valid = false;
      result.errors.push(`Erreur de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    return result;
  }

  /**
   * 📊 STATISTIQUES ET DEBUG
   */
  
  getServiceStats() {
    return {
      serviceName: 'QuestProgressTracker',
      totalQuestDefinitions: this.questDefinitions.size,
      dependenciesLoaded: {
        rewardDistributor: !!this.rewardDistributor,
        questValidator: !!this.questValidator,
        clientHandler: !!this.clientHandler
      },
      supportedObjectiveTypes: [
        'collect', 'defeat', 'talk', 'reach', 'deliver',
        'catch', 'encounter', 'use', 'win', 'explore'
      ]
    };
  }

  debugService(): void {
    console.log(`🔍 [QuestProgressTracker] === DEBUG SERVICE ===`);
    console.log(`📊 Stats:`, JSON.stringify(this.getServiceStats(), null, 2));
  }
}
