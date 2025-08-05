// server/src/quest/services/QuestProgressTracker.ts
// Service modulaire pour la progression des quêtes - Cœur de la logique métier
// ✅ VERSION MODIFIÉE : Intégration scan inventaire automatique + Support itemId

import { 
  QuestDefinition, 
  QuestProgressEvent, 
  QuestObjective,
  QuestObjectiveType,
  QuestObjectiveConditions,
  QuestEventMetadata,
  QuestEventContext
} from "../core/types/QuestTypes";

// ✅ NOUVEAU IMPORT : Intégration InventoryManager
import { InventoryManager } from "../../managers/InventoryManager";

// ===== INTERFACE LOCALE POUR RÉSULTATS =====

/**
 * 🎯 Résultat de mise à jour de quête (compatible avec QuestManager)
 */
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
  newObjectives?: any[]; // Type générique pour éviter conflits
  stepRewards?: any[];
  questRewards?: any[];
  
  // ✅ GESTION AUTO-COMPLETE
  requiresNpcReturn?: boolean;
  autoCompleted?: boolean;
  
  message?: string;
}

// ===== TYPES POUR OBJECTIFS =====

/**
 * 🎯 Objectif de définition (sans progression)
 */
export interface QuestObjectiveDefinition {
  id: string;
  type: QuestObjectiveType;
  description: string;
  target?: string;
  targetName?: string;
  itemId?: string;
  requiredAmount: number;
  validationDialogue?: string[];
  conditions?: QuestObjectiveConditions;
  metadata?: any;
}

/**
 * 🎯 Objectif avec progression (pour validation)
 */
export interface QuestObjectiveWithProgress extends QuestObjectiveDefinition {
  currentAmount: number;
  completed: boolean;
}

/**
 * 🎯 Interface principale du service de progression
 */
export interface IQuestProgressTracker {
  // Méthode principale - cœur de la logique métier
  updateProgress(
    username: string, 
    event: QuestProgressEvent,
    activeQuests: any[],
    questDefinitions: Map<string, QuestDefinition>
  ): Promise<QuestUpdateResult[]>;
  
  // Méthodes de support
  checkObjectiveProgress(objective: QuestObjectiveDefinition, event: QuestProgressEvent): boolean;
  validateAdvancedConditions(objective: QuestObjectiveDefinition, event: QuestProgressEvent): boolean;
  calculateProgressIncrement(objective: QuestObjectiveDefinition, event: QuestProgressEvent): number;
  
  // Méthodes de gestion d'étapes
  processStepProgress(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    currentStep: any,
    objectiveCompleted: boolean,
    completedObjectiveName: string
  ): Promise<QuestStepProgressResult>;
  
  // Validation et conditions
  validateObjectiveConditions(
    objective: QuestObjectiveDefinition, 
    event: QuestProgressEvent,
    context?: QuestEventContext
  ): QuestConditionValidationResult;
}

/**
 * 🎯 Résultat de progression d'étape
 */
export interface QuestStepProgressResult {
  stepCompleted: boolean;
  questCompleted: boolean;
  nextStepIndex?: number;
  newObjectives?: any[]; // Type générique pour compatibilité
  stepRewards?: any[];
  questRewards?: any[];
  requiresNpcReturn?: boolean;
  autoCompleted?: boolean;
  message: string;
}

/**
 * 🎯 Résultat de validation de conditions
 */
export interface QuestConditionValidationResult {
  valid: boolean;
  failedConditions: string[];
  warnings: string[];
  metadata?: {
    checkedConditions: string[];
    skipReasons: string[];
    contextUsed: boolean;
  };
}

/**
 * 🎯 Configuration du tracker
 */
export interface QuestProgressTrackerConfig {
  // Performance
  enableBatchProcessing: boolean;
  maxBatchSize: number;
  
  // Validation
  strictConditionValidation: boolean;
  enableAdvancedConditions: boolean;
  validateMetadata: boolean;
  
  // ✅ NOUVEAU : Scan inventaire
  enableInventoryScan: boolean;
  scanOnQuestStart: boolean;
  scanOnStepStart: boolean;
  
  // Logging
  enableProgressLogging: boolean;
  logFailedValidations: boolean;
  logInventoryScan: boolean;
  
  // Extensions futures
  enableExperimentalTypes: boolean;
  enableTimeBasedValidation: boolean;
}

// ===== IMPLÉMENTATION =====

/**
 * 🎯 Service de progression des quêtes
 * Extrait du QuestManager pour modularité
 * ✅ VERSION MODIFIÉE : Avec scan inventaire automatique + Support itemId
 */
class QuestProgressTracker implements IQuestProgressTracker {
  private config: QuestProgressTrackerConfig;

  // ✅ GETTER PUBLIC pour accès à la config
  public getConfig(): QuestProgressTrackerConfig {
    return this.config;
  }
  
  constructor(config?: Partial<QuestProgressTrackerConfig>) {
    this.config = {
      enableBatchProcessing: true,
      maxBatchSize: 50,
      strictConditionValidation: true,
      enableAdvancedConditions: true,
      validateMetadata: true,
      // ✅ NOUVEAUX : Configuration scan inventaire
      enableInventoryScan: true,
      scanOnQuestStart: true,
      scanOnStepStart: true,
      enableProgressLogging: process.env.NODE_ENV === 'development',
      logFailedValidations: true,
      logInventoryScan: process.env.NODE_ENV === 'development',
      enableExperimentalTypes: false,
      enableTimeBasedValidation: true,
      ...config
    };
    
    this.log('info', '🎯 QuestProgressTracker initialisé', { config: this.config });
  }

  // ===== MÉTHODE PRINCIPALE =====

  /**
   * 🎯 Méthode principale - Mise à jour de la progression des quêtes
   * Extraite de QuestManager.updateQuestProgress()
   */
  async updateProgress(
    username: string,
    event: QuestProgressEvent,
    activeQuests: any[],
    questDefinitions: Map<string, QuestDefinition>
  ): Promise<QuestUpdateResult[]> {
    
    this.log('info', '📈 === UPDATE QUEST PROGRESS (Tracker) ===', {
      username,
      eventType: event.type,
      eventTarget: event.targetId,
      activeQuestsCount: activeQuests.length
    });

    const results: QuestUpdateResult[] = [];

    // ✅ TRAITEMENT : Parcourir toutes les quêtes actives
    for (const questProgress of activeQuests) {
      if (questProgress.status !== 'active') {
        this.log('debug', `⏭️ Quête ${questProgress.questId} ignorée (statut: ${questProgress.status})`);
        continue;
      }

      const definition = questDefinitions.get(questProgress.questId);
      if (!definition) {
        this.log('warn', `⚠️ Définition manquante pour quête: ${questProgress.questId}`);
        continue;
      }

      this.log('debug', `🔍 Vérification quête: ${definition.name} (étape ${questProgress.currentStepIndex})`);

      const currentStep = definition.steps[questProgress.currentStepIndex];
      if (!currentStep) {
        this.log('warn', `⚠️ Étape courante introuvable pour ${definition.name}`);
        continue;
      }

      // ✅ VÉRIFIER CHAQUE OBJECTIF DE L'ÉTAPE COURANTE
      let objectiveCompleted = false;
      let stepModified = false;
      let completedObjectiveName = "";

      for (const objective of currentStep.objectives) {
        const progressKey = objective.id;
        
        // Gérer Map vs Object pour la compatibilité
        const objectivesMap = questProgress.objectives instanceof Map 
          ? questProgress.objectives 
          : new Map(Object.entries(questProgress.objectives || {}));
        
        const progressData = objectivesMap.get(progressKey) as { 
          currentAmount: number; 
          completed: boolean;
          startedAt?: Date;
          completedAt?: Date;
          attempts?: number;
        } | undefined;
        
        if (progressData?.completed) {
          this.log('debug', `✅ Objectif ${objective.id} déjà complété`);
          continue;
        }

        // ✅ VÉRIFIER SI L'ÉVÉNEMENT CORRESPOND À CET OBJECTIF
        if (this.checkObjectiveProgress(objective, event)) {
          this.log('info', `🎯 Objectif ${objective.id} progresse !`);
          
          const currentProgress = progressData || { 
            currentAmount: 0, 
            completed: false,
            startedAt: new Date(),
            attempts: 0
          };
          
          // Calculer l'incrément basé sur l'événement et conditions
          const increment = this.calculateProgressIncrement(objective, event);
          
          currentProgress.currentAmount = Math.min(
            currentProgress.currentAmount + increment,
            objective.requiredAmount
          );
          
          currentProgress.attempts = (currentProgress.attempts || 0) + 1;

          this.log('info', `📊 Progression: ${currentProgress.currentAmount}/${objective.requiredAmount} (+${increment})`);

          // ✅ PHASE 1 : OBJECTIF COMPLÉTÉ
          if (currentProgress.currentAmount >= objective.requiredAmount) {
            currentProgress.completed = true;
            currentProgress.completedAt = new Date();
            objectiveCompleted = true;
            completedObjectiveName = objective.description;
            
            this.log('info', `🎉 Objectif complété: ${objective.description}`);
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
        const stepResult = await this.processStepProgress(
          username, 
          questProgress, 
          definition, 
          currentStep,
          objectiveCompleted,
          completedObjectiveName
        );
        
        if (stepResult) {
          const result: QuestUpdateResult = {
            questId: questProgress.questId,
            questName: definition.name,
            objectiveCompleted: objectiveCompleted,
            objectiveName: completedObjectiveName,
            stepCompleted: stepResult.stepCompleted,
            stepName: currentStep.name,
            questCompleted: stepResult.questCompleted,
            newStepIndex: stepResult.nextStepIndex,
            newObjectives: stepResult.newObjectives,
            stepRewards: stepResult.stepRewards,
            questRewards: stepResult.questRewards,
            requiresNpcReturn: stepResult.requiresNpcReturn,
            autoCompleted: stepResult.autoCompleted,
            message: stepResult.message
          };
          
          results.push(result);
        }
      }
    }

    this.log('info', `💾 Progression terminée: ${results.length} mise(s) à jour pour ${username}`);
    return results;
  }

  // ===== NOUVELLES MÉTHODES : SCAN INVENTAIRE =====

  /**
   * ✅ NOUVELLE MÉTHODE : Vérifier inventaire existant pour un objectif
   * CORRIGÉ : Support à la fois target et itemId
   */
  private async checkExistingInventory(
    username: string, 
    objective: QuestObjectiveDefinition
  ): Promise<number> {
    
    if (!this.config.enableInventoryScan) {
      return 0;
    }
    
    if (objective.type !== 'collect') {
      return 0;
    }
    
    // ✅ CORRECTION : Supporter à la fois target et itemId
    const itemToCheck = objective.target || objective.itemId;
    if (!itemToCheck) {
      this.log('debug', `⚠️ Objectif collect sans target ni itemId: ${objective.id}`);
      return 0;
    }
    
    try {
      const existingCount = await InventoryManager.getItemCount(username, itemToCheck);
      
      if (this.config.logInventoryScan) {
        this.log('debug', `📦 Inventaire existant: ${itemToCheck} = ${existingCount} pour ${username}`);
      }
      
      return existingCount;
    } catch (error) {
      this.log('warn', `⚠️ Erreur vérification inventaire pour ${itemToCheck}:`, error);
      return 0;
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Application directe de progression (sans événement externe)
   */
  private async applyProgressDirectly(
    username: string,
    questProgress: any,
    objective: QuestObjectiveDefinition,
    amount: number,
    reason: string = 'Inventaire existant'
  ): Promise<void> {
    
    const objectivesMap = questProgress.objectives instanceof Map 
      ? questProgress.objectives 
      : new Map(Object.entries(questProgress.objectives || {}));
    
    const progressData = objectivesMap.get(objective.id) || {
      currentAmount: 0,
      completed: false,
      startedAt: new Date(),
      attempts: 0
    };
    
    const previousAmount = progressData.currentAmount;
    progressData.currentAmount = Math.min(
      progressData.currentAmount + amount,
      objective.requiredAmount
    );
    
    progressData.attempts = (progressData.attempts || 0) + 1;
    
    if (progressData.currentAmount >= objective.requiredAmount) {
      progressData.completed = true;
      progressData.completedAt = new Date();
      this.log('info', `✅ Objectif auto-complété par ${reason}: ${objective.description} (${previousAmount} → ${progressData.currentAmount}/${objective.requiredAmount})`);
    } else {
      this.log('info', `📈 Progression automatique par ${reason}: ${objective.description} (${previousAmount} → ${progressData.currentAmount}/${objective.requiredAmount})`);
    }
    
    objectivesMap.set(objective.id, progressData);
    questProgress.objectives = objectivesMap as any;
  }

  /**
   * ✅ MÉTHODE PUBLIQUE : Scan complet des objectifs d'une étape
   * AMÉLIORATION : Logs de debug étendus
   */
  public async scanStepObjectives(
    username: string,
    questProgress: any,
    stepObjectives: QuestObjectiveDefinition[]
  ): Promise<{ scannedObjectives: number; autoCompleted: number; totalProgress: number }> {
    
    if (!this.config.enableInventoryScan) {
      this.log('info', `❌ Scan inventaire désactivé`);
      return { scannedObjectives: 0, autoCompleted: 0, totalProgress: 0 };
    }

    let scannedObjectives = 0;
    let autoCompleted = 0;
    let totalProgress = 0;

    this.log('info', `🔍 Scan inventaire pour ${stepObjectives.length} objectif(s) - ${username}`);

    for (const objective of stepObjectives) {
      this.log('info', `🎯 Vérification objectif: ${objective.id}, type: ${objective.type}, target: ${objective.target}, itemId: ${objective.itemId}`);
      
      if (objective.type === 'collect') {
        scannedObjectives++;
        
        const existingCount = await this.checkExistingInventory(username, objective);
        this.log('info', `📦 Inventaire check résultat: ${existingCount} pour objectif ${objective.id}`);
        
        if (existingCount > 0) {
          const amountToApply = Math.min(existingCount, objective.requiredAmount);
          totalProgress += amountToApply;
          
          this.log('info', `✅ Application progression: ${amountToApply} pour ${objective.description}`);
          
          await this.applyProgressDirectly(
            username, 
            questProgress, 
            objective, 
            amountToApply,
            'Scan inventaire'
          );
          
          if (amountToApply >= objective.requiredAmount) {
            autoCompleted++;
          }
        } else {
          this.log('info', `❌ Aucun item trouvé en inventaire pour objectif ${objective.id}`);
        }
      } else {
        this.log('info', `⏭️ Objectif ${objective.id} ignoré (type: ${objective.type})`);
      }
    }

    if (scannedObjectives > 0) {
      this.log('info', `📊 Résultat scan: ${scannedObjectives} objectifs scannés, ${autoCompleted} auto-complétés, ${totalProgress} progression totale`);
    }

    return { scannedObjectives, autoCompleted, totalProgress };
  }

  // ===== VÉRIFICATION OBJECTIFS =====

  /**
   * 🎯 Vérification si un objectif progresse avec un événement
   * Version étendues avec nouveaux types + conditions avancées
   */
  checkObjectiveProgress(objective: QuestObjectiveDefinition, event: QuestProgressEvent): boolean {
    this.log('debug', `🔍 Vérification objectif: ${objective.type} vs event: ${event.type}`, {
      objectiveTarget: objective.target,
      objectiveItemId: objective.itemId,
      eventTargetId: event.targetId,
      hasConditions: !!objective.conditions
    });
    
    // ✅ ÉTAPE 1: Vérification du type de base
    const baseTypeMatch = this.checkBaseObjectiveType(objective, event);
    if (!baseTypeMatch) {
      return false;
    }
    
    // ✅ ÉTAPE 2: Vérification des conditions avancées (si présentes)
    if (objective.conditions && this.config.enableAdvancedConditions) {
      const conditionsValid = this.validateAdvancedConditions(objective, event);
      if (!conditionsValid) {
        this.log('debug', `❌ Conditions avancées échouées pour objectif ${objective.id}`);
        return false;
      }
    }
    
    this.log('debug', `✅ Objectif ${objective.id} correspond à l'événement`);
    return true;
  }

  /**
   * 🎯 Vérification des types de base (compatibilité + nouveaux)
   * CORRIGÉ : Support itemId pour collect
   */
  private checkBaseObjectiveType(objective: QuestObjectiveDefinition, event: QuestProgressEvent): boolean {
    switch (objective.type) {
      // ===== TYPES EXISTANTS (CONSERVÉS) =====
      case 'collect':
        // ✅ CORRECTION : Support target ET itemId
        const targetItem = objective.target || objective.itemId;
        return event.type === 'collect' && event.targetId === targetItem;
      
      case 'defeat':
        return event.type === 'defeat' && 
               (objective.target === 'wild' || 
                event.pokemonId?.toString() === objective.target ||
                event.targetId?.toString() === objective.target);
      
      case 'talk':
        return event.type === 'talk' && 
               (event.npcId?.toString() === objective.target || 
                event.targetId?.toString() === objective.target);
      
      case 'reach':
        return event.type === 'reach' && event.targetId === objective.target;
      
      case 'deliver':
        return event.type === 'deliver' && 
               event.npcId?.toString() === objective.target && 
               event.targetId === objective.itemId;
      
      // ===== NOUVEAUX TYPES ÉTENDUS =====
      case 'catch':
        return event.type === 'catch' && 
               (objective.target === 'any' || 
                event.pokemonId?.toString() === objective.target ||
                event.targetId?.toString() === objective.target);
      
      case 'encounter':
        return event.type === 'encounter' && 
               (objective.target === 'any' || 
                event.pokemonId?.toString() === objective.target ||
                event.targetId?.toString() === objective.target);
      
      case 'use':
        return event.type === 'use' && 
               (event.targetId === objective.target ||
                event.targetId === objective.itemId);
      
      case 'win':
        return event.type === 'win' && 
               (objective.target === 'any' || 
                event.targetId === objective.target);
      
      case 'explore':
        return event.type === 'explore' && 
               (event.targetId === objective.target ||
                event.location?.map === objective.target);
      
      // ===== TYPES AVANCÉS (FUTURS) =====
      case 'breeding':
        if (!this.config.enableExperimentalTypes) return false;
        return event.type === 'breeding' && event.targetId === objective.target;
      
      case 'temporal':
        if (!this.config.enableExperimentalTypes) return false;
        return event.type === 'temporal' && event.targetId === objective.target;
      
      case 'contest':
        if (!this.config.enableExperimentalTypes) return false;
        return event.type === 'contest' && event.targetId === objective.target;
      
      case 'ecosystem':
        if (!this.config.enableExperimentalTypes) return false;
        return event.type === 'ecosystem' && event.targetId === objective.target;
      
      case 'mystery':
        if (!this.config.enableExperimentalTypes) return false;
        return event.type === 'mystery' && event.targetId === objective.target;
      
      default:
        this.log('warn', `❓ Type d'objectif inconnu: ${objective.type}`);
        return false;
    }
  }

  /**
   * 🎯 Validation des conditions avancées
   */
  validateAdvancedConditions(objective: QuestObjectiveDefinition, event: QuestProgressEvent): boolean {
    if (!objective.conditions) return true;
    
    const conditions = objective.conditions;
    const metadata = event.metadata;
    const context = event.context;
    
    this.log('debug', `🔍 Validation conditions avancées`, {
      hasMetadata: !!metadata,
      hasContext: !!context,
      conditionsCount: Object.keys(conditions).length
    });
    
    // ===== CONDITIONS TEMPORELLES =====
    
    if (conditions.timeOfDay && metadata?.timeOfDay) {
      if (conditions.timeOfDay !== metadata.timeOfDay) {
        this.log('debug', `❌ Condition timeOfDay échouée: ${conditions.timeOfDay} != ${metadata.timeOfDay}`);
        return false;
      }
    }
    
    if (conditions.weather && metadata?.weather) {
      if (conditions.weather !== metadata.weather) {
        this.log('debug', `❌ Condition weather échouée: ${conditions.weather} != ${metadata.weather}`);
        return false;
      }
    }
    
    if (conditions.season && metadata?.season) {
      if (conditions.season !== metadata.season) {
        this.log('debug', `❌ Condition season échouée: ${conditions.season} != ${metadata.season}`);
        return false;
      }
    }
    
    // ===== CONDITIONS DE LIEU =====
    
    if (conditions.location && event.location) {
      const allowedLocations = Array.isArray(conditions.location) 
        ? conditions.location 
        : [conditions.location];
      
      const currentLocation = event.location.map || `${event.location.x},${event.location.y}`;
      
      if (!allowedLocations.includes(currentLocation)) {
        this.log('debug', `❌ Condition location échouée: ${currentLocation} not in ${allowedLocations}`);
        return false;
      }
    }
    
    if (conditions.mapId && event.location?.map) {
      const allowedMaps = Array.isArray(conditions.mapId) 
        ? conditions.mapId 
        : [conditions.mapId];
      
      if (!allowedMaps.includes(event.location.map)) {
        this.log('debug', `❌ Condition mapId échouée: ${event.location.map} not in ${allowedMaps}`);
        return false;
      }
    }
    
    // ===== CONDITIONS POKÉMON =====
    
    if (conditions.pokemonLevel && event.pokemonId && context?.pokemonUsed) {
      const pokemonLevel = context.pokemonUsed.level || 1;
      
      if (conditions.pokemonLevel.min && pokemonLevel < conditions.pokemonLevel.min) {
        this.log('debug', `❌ Condition pokemonLevel.min échouée: ${pokemonLevel} < ${conditions.pokemonLevel.min}`);
        return false;
      }
      
      if (conditions.pokemonLevel.max && pokemonLevel > conditions.pokemonLevel.max) {
        this.log('debug', `❌ Condition pokemonLevel.max échouée: ${pokemonLevel} > ${conditions.pokemonLevel.max}`);
        return false;
      }
    }
    
    if (conditions.isShiny !== undefined && context?.pokemonUsed) {
      const isShiny = context.pokemonUsed.isShiny || false;
      if (conditions.isShiny !== isShiny) {
        this.log('debug', `❌ Condition isShiny échouée: ${conditions.isShiny} != ${isShiny}`);
        return false;
      }
    }
    
    if (conditions.isWild !== undefined && context?.pokemonUsed) {
      const isWild = context.pokemonUsed.isWild !== false; // Par défaut true
      if (conditions.isWild !== isWild) {
        this.log('debug', `❌ Condition isWild échouée: ${conditions.isWild} != ${isWild}`);
        return false;
      }
    }
    
    // ===== CONDITIONS DE COMBAT =====
    
    if (conditions.battleType && context?.battleState) {
      const battleType = context.battleState.type;
      if (conditions.battleType !== battleType) {
        this.log('debug', `❌ Condition battleType échouée: ${conditions.battleType} != ${battleType}`);
        return false;
      }
    }
    
    if (conditions.perfectScore && metadata?.score) {
      const isPerfect = metadata.score >= 100 || metadata.quality === 'perfect';
      if (conditions.perfectScore && !isPerfect) {
        this.log('debug', `❌ Condition perfectScore échouée: score=${metadata.score}, quality=${metadata.quality}`);
        return false;
      }
    }
    
    if (conditions.noDamage && context?.battleState) {
      const damageTaken = context.battleState.damageTaken || 0;
      if (conditions.noDamage && damageTaken > 0) {
        this.log('debug', `❌ Condition noDamage échouée: damage=${damageTaken}`);
        return false;
      }
    }
    
    // ===== CONDITIONS DE JOUEUR =====
    
    if (conditions.playerLevel && context?.playerLevel) {
      if (conditions.playerLevel.min && context.playerLevel < conditions.playerLevel.min) {
        this.log('debug', `❌ Condition playerLevel.min échouée: ${context.playerLevel} < ${conditions.playerLevel.min}`);
        return false;
      }
      
      if (conditions.playerLevel.max && context.playerLevel > conditions.playerLevel.max) {
        this.log('debug', `❌ Condition playerLevel.max échouée: ${context.playerLevel} > ${conditions.playerLevel.max}`);
        return false;
      }
    }
    
    // ===== CONDITIONS SPÉCIALES =====
    
    if (conditions.firstTime && metadata?.bonus !== true) {
      this.log('debug', `❌ Condition firstTime échouée: pas de bonus firstTime`);
      return false;
    }
    
    if (conditions.consecutive && !metadata?.bonus) {
      this.log('debug', `❌ Condition consecutive échouée: pas de séquence`);
      return false;
    }
    
    this.log('debug', `✅ Toutes les conditions avancées validées`);
    return true;
  }

  /**
   * 🎯 Calcul de l'incrément de progression
   */
  calculateProgressIncrement(objective: QuestObjectiveDefinition, event: QuestProgressEvent): number {
    let baseIncrement = event.amount || 1;
    
    // Appliquer des bonus basés sur les conditions
    if (objective.conditions && event.metadata) {
      // Bonus qualité
      if (event.metadata.quality === 'perfect') {
        baseIncrement *= 2;
      } else if (event.metadata.quality === 'good') {
        baseIncrement *= 1.5;
      }
      
      // Bonus première fois
      if (objective.conditions.firstTime && event.metadata.bonus) {
        baseIncrement *= 1.5;
      }
      
      // Bonus conditions spéciales
      if (objective.conditions.perfectScore && event.metadata.score && event.metadata.score >= 100) {
        baseIncrement *= 2;
      }
    }
    
    return Math.floor(baseIncrement);
  }

  // ===== GESTION DES ÉTAPES =====

  /**
   * 🎯 Traitement de la progression d'étape
   * Extrait de QuestManager.processStepProgress()
   * ✅ VERSION MODIFIÉE : Avec scan inventaire automatique
   */
  async processStepProgress(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    currentStep: any,
    objectiveCompleted: boolean,
    completedObjectiveName: string
  ): Promise<QuestStepProgressResult> {
    
    const objectivesMap = questProgress.objectives instanceof Map 
      ? questProgress.objectives 
      : new Map(Object.entries(questProgress.objectives || {}));

    // ✅ VÉRIFIER LOGIQUE D'OBJECTIFS (AND/OR/SEQUENCE)
    const stepLogic = currentStep.objectiveLogic || 'AND';
    const minimumObjectives = currentStep.minimumObjectives || currentStep.objectives.length;
    
    let stepCompleted = false;
    
    switch (stepLogic) {
      case 'AND':
        // Tous les objectifs doivent être complétés
        stepCompleted = currentStep.objectives.every((obj: any) => {
          const progress = objectivesMap.get(obj.id) as { completed: boolean } | undefined;
          return progress?.completed;
        });
        break;
        
      case 'OR':
        // Au moins minimumObjectives doivent être complétés
        const completedCount = currentStep.objectives.filter((obj: any) => {
          const progress = objectivesMap.get(obj.id) as { completed: boolean } | undefined;
          return progress?.completed;
        }).length;
        stepCompleted = completedCount >= minimumObjectives;
        break;
        
      case 'SEQUENCE':
        // Objectifs doivent être complétés dans l'ordre
        stepCompleted = true;
        for (const obj of currentStep.objectives) {
          const progress = objectivesMap.get(obj.id) as { completed: boolean } | undefined;
          if (!progress?.completed) {
            stepCompleted = false;
            break;
          }
        }
        break;
    }

    // ✅ PHASE 2 : ÉTAPE COMPLÉTÉE
    if (stepCompleted) {
      this.log('info', `🎊 Étape complétée: ${currentStep.name}`);
      
      const stepRewards = currentStep.rewards || [];

      // Passer à l'étape suivante
      questProgress.currentStepIndex++;

      // ✅ PHASE 3 : VÉRIFIER SI QUÊTE COMPLÉTÉE
      if (questProgress.currentStepIndex >= definition.steps.length) {
        this.log('info', `🏆 QUÊTE COMPLÉTÉE: ${definition.name}`);
        
        return await this.handleQuestCompletion(
          username,
          questProgress,
          definition,
          stepRewards
        );
      } else {
        // ✅ PRÉPARER LA PROCHAINE ÉTAPE AVEC SCAN INVENTAIRE
        const nextStep = definition.steps[questProgress.currentStepIndex];
        this.log('info', `➡️ Passage à l'étape suivante: ${nextStep.name}`);
        
        // ✅ SCAN INVENTAIRE POUR LA NOUVELLE ÉTAPE
        if (this.config.scanOnStepStart) {
          const scanResult = await this.scanStepObjectives(username, questProgress, nextStep.objectives);
          if (scanResult.autoCompleted > 0) {
            this.log('info', `🎯 Scan automatique: ${scanResult.autoCompleted} objectif(s) auto-complété(s) sur ${scanResult.scannedObjectives}`);
          }
        }
        
        // Initialiser les objectifs de la prochaine étape (avec progression éventuelle du scan)
        for (const objective of nextStep.objectives) {
          // Vérifier si l'objectif a déjà été initialisé par le scan
          if (!objectivesMap.has(objective.id)) {
            objectivesMap.set(objective.id, {
              currentAmount: 0,
              completed: false,
              startedAt: new Date(),
              attempts: 0
            });
          }
        }
        questProgress.objectives = objectivesMap as any;

        return {
          stepCompleted: true,
          questCompleted: false,
          nextStepIndex: questProgress.currentStepIndex,
          newObjectives: nextStep.objectives.map((obj: any) => {
            const progress = objectivesMap.get(obj.id) || { currentAmount: 0, completed: false };
            return {
              id: obj.id,
              type: obj.type,
              description: obj.description,
              target: obj.target,
              targetName: obj.targetName,
              itemId: obj.itemId,
              requiredAmount: obj.requiredAmount,
              currentAmount: progress.currentAmount,
              completed: progress.completed,
              validationDialogue: obj.validationDialogue,
              conditions: obj.conditions,
              metadata: obj.metadata
            } as QuestObjectiveWithProgress;
          }),
          stepRewards: stepRewards,
          message: `Étape "${currentStep.name}" terminée ! Objectif suivant: ${nextStep.name}`
        };
      }
    } else {
      // ✅ OBJECTIF COMPLÉTÉ MAIS PAS TOUTE L'ÉTAPE
      if (objectiveCompleted) {
        return {
          stepCompleted: false,
          questCompleted: false,
          message: `Objectif complété: ${completedObjectiveName}`
        };
      } else {
        // Simple progression
        return {
          stepCompleted: false,
          questCompleted: false,
          message: `Progression de quête mise à jour`
        };
      }
    }
  }

  /**
   * 🎯 Gestion de la completion de quête
   */
  private async handleQuestCompletion(
    username: string,
    questProgress: any,
    definition: QuestDefinition,
    stepRewards: any[]
  ): Promise<QuestStepProgressResult> {
    
    this.log('info', `🏆 === COMPLETION QUÊTE ${definition.name} ===`);

    // Calculer toutes les récompenses de quête (étapes finales)
    const questRewards = this.calculateFinalQuestRewards(definition);
    
    // ✅ VÉRIFIER LE FLAG AUTO-COMPLETE
    const autoComplete = definition.autoComplete !== false; // Par défaut true si non défini
    
    if (autoComplete) {
      this.log('info', `🤖 Auto-completion activée pour ${definition.name}`);
      
      // Marquer comme terminée
      questProgress.status = 'completed';
      questProgress.completedAt = new Date();
      
      return {
        stepCompleted: true,
        questCompleted: true,
        autoCompleted: true,
        stepRewards: stepRewards,
        questRewards: questRewards,
        message: `Quête "${definition.name}" terminée automatiquement !`
      };
      
    } else {
      this.log('info', `👤 Completion manuelle requise pour ${definition.name}`);
      
      // Marquer comme "prête à rendre" mais ne pas distribuer les récompenses
      questProgress.status = 'readyToComplete';
      
      return {
        stepCompleted: true,
        questCompleted: true,
        autoCompleted: false,
        requiresNpcReturn: true,
        stepRewards: stepRewards,
        questRewards: questRewards, // Les récompenses seront données au NPC
        message: `Quête "${definition.name}" terminée ! Retournez voir le NPC pour récupérer vos récompenses.`
      };
    }
  }

  /**
   * 🎯 Calcul des récompenses finales
   */
  private calculateFinalQuestRewards(definition: QuestDefinition): any[] {
    const finalStep = definition.steps[definition.steps.length - 1];
    return finalStep?.rewards || [];
  }

  // ===== MÉTHODES DE VALIDATION =====

  /**
   * 🎯 Validation complète des conditions d'objectif
   */
  validateObjectiveConditions(
    objective: QuestObjectiveDefinition, 
    event: QuestProgressEvent,
    context?: QuestEventContext
  ): QuestConditionValidationResult {
    
    const result: QuestConditionValidationResult = {
      valid: true,
      failedConditions: [],
      warnings: [],
      metadata: {
        checkedConditions: [],
        skipReasons: [],
        contextUsed: !!context
      }
    };
    
    if (!objective.conditions) {
      return result;
    }
    
    const conditions = objective.conditions;
    
    // Valider chaque condition
    for (const [conditionKey, conditionValue] of Object.entries(conditions)) {
      result.metadata!.checkedConditions.push(conditionKey);
      
      let conditionMet = true;
      let skipReason = '';
      
      switch (conditionKey) {
        case 'timeOfDay':
          if (!event.metadata?.timeOfDay) {
            skipReason = 'No timeOfDay metadata';
          } else {
            conditionMet = event.metadata.timeOfDay === conditionValue;
          }
          break;
          
        case 'weather':
          if (!event.metadata?.weather) {
            skipReason = 'No weather metadata';
          } else {
            conditionMet = event.metadata.weather === conditionValue;
          }
          break;
          
        case 'pokemonLevel':
          if (!context?.pokemonUsed?.level) {
            skipReason = 'No pokemon level in context';
          } else {
            const level = context.pokemonUsed.level;
            const levelCondition = conditionValue as { min?: number; max?: number };
            conditionMet = (!levelCondition.min || level >= levelCondition.min) &&
                         (!levelCondition.max || level <= levelCondition.max);
          }
          break;
          
        // Ajouter d'autres conditions selon les besoins
        
        default:
          result.warnings.push(`Unknown condition: ${conditionKey}`);
      }
      
      if (skipReason) {
        result.metadata!.skipReasons.push(`${conditionKey}: ${skipReason}`);
      } else if (!conditionMet) {
        result.valid = false;
        result.failedConditions.push(conditionKey);
      }
    }
    
    return result;
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * 🎯 Logging intelligent
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableProgressLogging && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [QuestProgressTracker] ${message}`;
    
    switch (level) {
      case 'debug':
        if (this.config.enableProgressLogging) {
          console.log(logMessage, data || '');
        }
        break;
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  /**
   * 🎯 Informations de debugging
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      version: '2.1.0', // ✅ Version bumped avec support itemId
      supportedTypes: [
        'collect', 'defeat', 'talk', 'reach', 'deliver', // Types de base
        'catch', 'encounter', 'use', 'win', 'explore',   // Types étendus
        ...(this.config.enableExperimentalTypes ? [      // Types expérimentaux
          'breeding', 'temporal', 'contest', 'ecosystem', 'mystery'
        ] : [])
      ],
      features: {
        advancedConditions: this.config.enableAdvancedConditions,
        experimentalFeatures: this.config.enableExperimentalTypes,
        inventoryScan: this.config.enableInventoryScan,
        scanOnQuestStart: this.config.scanOnQuestStart,
        scanOnStepStart: this.config.scanOnStepStart,
        itemIdSupport: true // ✅ Nouveau feature flag
      }
    };
  }

  /**
   * 🎯 Mise à jour de la configuration
   */
  updateConfig(newConfig: Partial<QuestProgressTrackerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', '⚙️ Configuration mise à jour', { newConfig });
  }

  // ===== NOUVELLES MÉTHODES PUBLIQUES =====

  /**
   * ✅ NOUVELLE MÉTHODE PUBLIQUE : Scan manuel d'une quête active
   * Utile pour debugging ou réparation
   */
  async manualScanQuest(
    username: string,
    questProgress: any,
    definition: QuestDefinition
  ): Promise<{ 
    scanned: boolean; 
    results: { scannedObjectives: number; autoCompleted: number; totalProgress: number }; 
    message: string 
  }> {
    
    if (!this.config.enableInventoryScan) {
      return {
        scanned: false,
        results: { scannedObjectives: 0, autoCompleted: 0, totalProgress: 0 },
        message: 'Scan inventaire désactivé dans la configuration'
      };
    }

    const currentStep = definition.steps[questProgress.currentStepIndex];
    if (!currentStep) {
      return {
        scanned: false,
        results: { scannedObjectives: 0, autoCompleted: 0, totalProgress: 0 },
        message: 'Étape courante introuvable'
      };
    }

    this.log('info', `🔧 Scan manuel pour ${definition.name} - ${username}`);
    
    const results = await this.scanStepObjectives(username, questProgress, currentStep.objectives);
    
    return {
      scanned: true,
      results,
      message: `Scan manuel complété: ${results.scannedObjectives} objectif(s) scannés, ${results.autoCompleted} auto-complété(s)`
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE PUBLIQUE : Test de scan pour debugging
   */
  async debugScanInventory(username: string, itemId: string): Promise<{
    found: boolean;
    count: number;
    error?: string;
  }> {
    try {
      const count = await this.checkExistingInventory(username, {
        id: 'debug',
        type: 'collect',
        description: 'Debug scan',
        target: itemId,
        requiredAmount: 1
      });

      return {
        found: count > 0,
        count
      };
    } catch (error) {
      return {
        found: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// ===== EXPORT =====
export default QuestProgressTracker;
