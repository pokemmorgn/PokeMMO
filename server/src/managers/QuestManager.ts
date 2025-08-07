import fs from "fs";
import path from "path";
import { PlayerQuest } from "../models/PlayerQuest";
import { QuestData } from "../models/QuestData";
import { 
  QuestDefinition, 
  Quest, 
  QuestProgressEvent,
  QuestObjective,
  QuestReward 
} from "../types/QuestTypes";

import { 
  QuestDefinition as ExtendedQuestDefinition,
  QuestReward as ExtendedQuestReward
} from "../quest/core/types/QuestTypes";
import { ServiceRegistry } from "../services/ServiceRegistry";

import QuestProgressTracker from "../quest/services/QuestProgressTracker";
import QuestValidator from "../quest/services/QuestValidator";
import RewardDistributor from "../quest/services/RewardDistributor";
import QuestClientHandler from "../quest/services/QuestClientHandler";

export enum QuestDataSource {
  JSON = 'json',
  MONGODB = 'mongodb',
  HYBRID = 'hybrid'
}

interface QuestManagerConfig {
  primaryDataSource: QuestDataSource;
  useMongoCache: boolean;
  cacheTTL: number;
  enableFallback: boolean;
  questDataPath: string;
  autoLoadJSON: boolean;
  strictValidation: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
}

export interface QuestUpdateResult {
  questId: string;
  questName?: string;
  objectiveCompleted?: boolean;
  objectiveName?: string;
  stepCompleted?: boolean;
  stepName?: string;
  questCompleted?: boolean;
  newStepIndex?: number;
  newObjectives?: QuestObjective[];
  stepRewards?: QuestReward[];
  questRewards?: QuestReward[];
  requiresNpcReturn?: boolean;
  autoCompleted?: boolean;
  message?: string;
}

export class QuestManager {
  private questDefinitions: Map<string, QuestDefinition> = new Map();
  
  // ✨ NOUVEAU : INDEX OPTIMISÉ POUR QUÊTES PAR NPC
  private npcQuestIndex: Map<number, QuestDefinition[]> = new Map();
  
  // ✅ NOUVEAU : Callback pour refresh automatique des NPCs
  private worldRoomCallback?: (playerId: string) => Promise<void>;
  
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  private mongoCache: Map<string, { data: QuestDefinition[]; timestamp: number }> = new Map();
  private questSourceMap: Map<string, 'json' | 'mongodb'> = new Map();
  private validationErrors: Map<string, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, questData?: any) => void> = [];
  
  private config: QuestManagerConfig = {
    primaryDataSource: QuestDataSource.MONGODB,
    useMongoCache: process.env.QUEST_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.QUEST_CACHE_TTL || '1800000'),
    enableFallback: process.env.QUEST_FALLBACK !== 'false',
    questDataPath: './build/data/quests/quests.json',
    autoLoadJSON: true,
    strictValidation: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    cacheEnabled: true
  };

  private progressTracker: QuestProgressTracker;
  private validator: QuestValidator;
  private rewardDistributor: RewardDistributor;
  private clientHandler: QuestClientHandler;

  constructor(questDataPath?: string, customConfig?: Partial<QuestManagerConfig>) {
    if (questDataPath) {
      this.config.questDataPath = questDataPath;
    }
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.initializeServices();
    this.setupInventoryIntegration();
    this.lastLoadTime = Date.now();
  }

  // ✅ NOUVEAU : Enregistrer le callback WorldRoom pour refresh automatique
  public setWorldRoomCallback(callback: (playerId: string) => Promise<void>): void {
    this.worldRoomCallback = callback;
    console.log(`✅ [QuestManager] Callback WorldRoom enregistré pour refresh automatique des NPCs`);
  }
  public async triggerWorldRoomCallback(playerId: string): Promise<void> {
    if (this.worldRoomCallback) {
      try {
        console.log(`🔄 [QuestManager] Déclenchement refresh automatique NPCs pour ${playerId}`);
        await this.worldRoomCallback(playerId);
        console.log(`✅ [QuestManager] Refresh NPCs terminé pour ${playerId}`);
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur callback WorldRoom:`, error);
      }
    } else {
      console.warn(`⚠️ [QuestManager] Callback WorldRoom non configuré`);
    }
  }
  // ✅ NOUVEAU : Méthode pour déclencher le refresh automatique des NPCs
  private async triggerNpcStatusRefresh(playerId: string): Promise<void> {
    if (this.worldRoomCallback) {
      try {
        console.log(`🔄 [QuestManager] Déclenchement refresh automatique NPCs pour ${playerId}`);
        
        // Petit délai pour s'assurer que la DB est à jour
        setTimeout(async () => {
          try {
            await this.worldRoomCallback!(playerId);
            console.log(`✅ [QuestManager] Refresh NPCs terminé pour ${playerId}`);
          } catch (error) {
            console.error(`❌ [QuestManager] Erreur refresh NPCs différé:`, error);
          }
        }, 100);
        
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur refresh NPCs:`, error);
      }
    } else {
      if (this.config.debugMode) {
        console.warn(`⚠️ [QuestManager] Pas de callback WorldRoom configuré pour refresh NPCs`);
      }
    }
  }

  private initializeServices(): void {
    this.progressTracker = new QuestProgressTracker({
      enableProgressLogging: this.config.debugMode,
      strictConditionValidation: this.config.strictValidation,
      enableAdvancedConditions: true
    });

    this.validator = new QuestValidator({
      enableCaching: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL / 1000,
      strictValidation: this.config.strictValidation,
      enableValidationLogging: this.config.debugMode
    });

    this.rewardDistributor = new RewardDistributor({
      enableDistributionLogging: this.config.debugMode,
      strictValidation: this.config.strictValidation,
      enableRetry: true,
      maxRetries: 3
    });

    this.clientHandler = new QuestClientHandler({
      enableNotifications: true,
      enableMessageLogging: this.config.debugMode,
      enablePersonalization: true,
      enableRateLimiting: true
    });
  }

  // ✨ NOUVEAU : Construction de l'index NPC-Quest
  private buildNpcQuestIndex(): void {
    this.npcQuestIndex.clear();
    
    for (const quest of this.questDefinitions.values()) {
      if (quest.startNpcId) {
        if (!this.npcQuestIndex.has(quest.startNpcId)) {
          this.npcQuestIndex.set(quest.startNpcId, []);
        }
        this.npcQuestIndex.get(quest.startNpcId)!.push(quest);
      }
      
      if (quest.endNpcId && quest.endNpcId !== quest.startNpcId) {
        if (!this.npcQuestIndex.has(quest.endNpcId)) {
          this.npcQuestIndex.set(quest.endNpcId, []);
        }
        this.npcQuestIndex.get(quest.endNpcId)!.push(quest);
      }
    }
    
    if (this.config.debugMode) {
      console.log(`🚀 [QuestManager] Index NPC construit: ${this.npcQuestIndex.size} NPCs indexés`);
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.isInitializing) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } catch (error) {
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }
  
  // ✅ CORRIGÉ : Intégration inventaire désactivée (maintenant dans InventoryManager)
  private setupInventoryIntegration(): void {
    console.log('🔗 [QuestManager] Intégration inventaire désactivée - utilise ServiceRegistry');
    // L'intégration se fait maintenant directement dans InventoryManager via ServiceRegistry
  }
  
  private async performInitialization(): Promise<void> {
    await this.loadQuestDefinitions();
  }

  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    if (!this.isInitialized && !this.isInitializing) {
      this.initialize().catch(() => {});
    }
    
    while ((!this.isInitialized || this.questDefinitions.size === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.questDefinitions.size > 0;
    
    if (loaded) {
      if (this.config.primaryDataSource === QuestDataSource.MONGODB && this.hotReloadEnabled) {
        this.startHotReload();
      }
    }
    
    return loaded;
  }

  private async loadQuestDefinitions(): Promise<void> {
    try {
      switch (this.config.primaryDataSource) {
        case QuestDataSource.MONGODB:
          await this.loadQuestDefinitionsFromMongoDB();
          break;
          
        case QuestDataSource.JSON:
          this.loadQuestDefinitionsFromJSON();
          break;
          
        case QuestDataSource.HYBRID:
          try {
            await this.loadQuestDefinitionsFromMongoDB();
          } catch (mongoError) {
            this.loadQuestDefinitionsFromJSON();
          }
          break;
      }
    } catch (error) {
      throw error;
    }
  }

  private async loadQuestDefinitionsFromMongoDB(): Promise<void> {
    try {
      if (this.config.useMongoCache) {
        const cached = this.getFromCache('all_quests');
        if (cached) {
          this.addQuestsToCollection(cached, QuestDataSource.MONGODB);
          return;
        }
      }
      
      await this.waitForMongoDBReady();
      
      const mongoQuests = await QuestData.findActiveQuests();
      const questDefinitions: QuestDefinition[] = mongoQuests.map(mongoDoc => 
        this.convertMongoDocToQuestDefinition(mongoDoc)
      );
      
      this.addQuestsToCollection(questDefinitions, QuestDataSource.MONGODB);
      
      if (this.config.useMongoCache) {
        this.setCache('all_quests', questDefinitions);
      }
      
    } catch (error) {
      if (this.config.enableFallback) {
        this.loadQuestDefinitionsFromJSON();
      } else {
        throw error;
      }
    }
  }

  private convertMongoDocToQuestDefinition(mongoDoc: any): QuestDefinition {
    try {
      let questDefinition: QuestDefinition;
      
      if (typeof mongoDoc.toQuestDefinition === 'function') {
        questDefinition = mongoDoc.toQuestDefinition();
      } else {
        questDefinition = {
          id: mongoDoc.questId,
          name: mongoDoc.name,
          description: mongoDoc.description,
          category: mongoDoc.category,
          prerequisites: mongoDoc.prerequisites,
          startNpcId: mongoDoc.startNpcId,
          endNpcId: mongoDoc.endNpcId,
          isRepeatable: mongoDoc.isRepeatable,
          cooldownHours: mongoDoc.cooldownHours,
          autoComplete: mongoDoc.autoComplete,
          dialogues: mongoDoc.dialogues,
          steps: mongoDoc.steps
        };
      }
      
      return questDefinition;
    } catch (error) {
      throw error;
    }
  }

  // ✨ MODIFIÉ : Ajouter construction de l'index
  private addQuestsToCollection(questDefinitions: QuestDefinition[], source: QuestDataSource): void {
    for (const quest of questDefinitions) {
      this.questDefinitions.set(quest.id, quest);
      this.questSourceMap.set(quest.id, source === QuestDataSource.MONGODB ? 'mongodb' : 'json');
    }
    
    // ✨ NOUVEAU : Construire l'index après ajout des quêtes
    this.buildNpcQuestIndex();
  }

  private loadQuestDefinitionsFromJSON(): void {
    try {
      const resolvedPath = path.resolve(__dirname, this.config.questDataPath);
      if (!fs.existsSync(resolvedPath)) return;

      const questData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      
      if (!questData.quests || !Array.isArray(questData.quests)) return;
      
      let jsonQuestCount = 0;
      let validationErrors = 0;

      for (const quest of questData.quests) {
        try {
          if (this.config.strictValidation) {
            const validation = this.validateQuestJson(quest);
            if (!validation.valid) {
              this.validationErrors.set(quest.id, validation.errors || []);
              validationErrors++;
              continue;
            }
          }

          this.questDefinitions.set(quest.id, quest);
          this.questSourceMap.set(quest.id, 'json');
          jsonQuestCount++;
          
        } catch (questError) {
          validationErrors++;
        }
      }
      
      // ✨ NOUVEAU : Construire l'index après chargement JSON
      this.buildNpcQuestIndex();
      
    } catch (error) {
      throw error;
    }
  }

  private async waitForMongoDBReady(maxRetries: number = 10): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Mongoose pas encore connecté');
        }
        
        await mongoose.connection.db.admin().ping();
        const testCount = await QuestData.countDocuments();
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  private startHotReload(): void {
    try {
      this.changeStream = QuestData.watch([], { 
        fullDocument: 'updateLookup'
      });
      
      this.changeStream.on('change', (change: any) => {
        this.handleMongoDBChange(change);
      });
      
      this.changeStream.on('error', (error: any) => {
        setTimeout(() => {
          this.startHotReload();
        }, 5000);
      });
      
    } catch (error) {
      // Silent fail
    }
  }

  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      switch (change.operationType) {
        case 'insert':
          await this.handleQuestInsert(change.fullDocument);
          break;
        case 'update':
          await this.handleQuestUpdate(change.fullDocument);
          break;
        case 'delete':
          await this.handleQuestDelete(change.documentKey._id);
          break;
        case 'replace':
          await this.handleQuestUpdate(change.fullDocument);
          break;
      }
    } catch (error) {
      // Silent fail
    }
  }

  // ✨ MODIFIÉ : Reconstruire l'index lors des changements
  private async handleQuestInsert(mongoDoc: any): Promise<void> {
    try {
      const questDefinition = this.convertMongoDocToQuestDefinition(mongoDoc);
      
      this.questDefinitions.set(questDefinition.id, questDefinition);
      this.questSourceMap.set(questDefinition.id, 'mongodb');
      this.mongoCache.delete('all_quests');
      
      // ✨ NOUVEAU : Reconstruire l'index
      this.buildNpcQuestIndex();
      
      this.notifyReloadCallbacks('insert', questDefinition);
    } catch (error) {
      // Silent fail
    }
  }

  // ✨ MODIFIÉ : Reconstruire l'index lors des changements
  private async handleQuestUpdate(mongoDoc: any): Promise<void> {
    try {
      const questDefinition = this.convertMongoDocToQuestDefinition(mongoDoc);
      
      this.questDefinitions.set(questDefinition.id, questDefinition);
      this.questSourceMap.set(questDefinition.id, 'mongodb');
      this.mongoCache.delete('all_quests');
      
      // ✨ NOUVEAU : Reconstruire l'index
      this.buildNpcQuestIndex();
      
      this.notifyReloadCallbacks('update', questDefinition);
    } catch (error) {
      // Silent fail
    }
  }

  // ✨ MODIFIÉ : Reconstruire l'index lors des changements
  private async handleQuestDelete(documentId: any): Promise<void> {
    try {
      const questToDelete = Array.from(this.questDefinitions.values()).find(quest => {
        return this.questSourceMap.get(quest.id) === 'mongodb';
      });
      
      if (questToDelete) {
        this.questDefinitions.delete(questToDelete.id);
        this.questSourceMap.delete(questToDelete.id);
        this.mongoCache.delete('all_quests');
        
        // ✨ NOUVEAU : Reconstruire l'index
        this.buildNpcQuestIndex();
        
        this.notifyReloadCallbacks('delete', questToDelete);
      }
    } catch (error) {
      // Silent fail
    }
  }

  private notifyReloadCallbacks(event: string, questData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, questData);
      } catch (error) {
        // Silent fail
      }
    });
  }

  public onQuestChange(callback: (event: string, questData?: any) => void): void {
    this.reloadCallbacks.push(callback);
  }

  public stopHotReload(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
    }
  }

  public getHotReloadStatus(): { enabled: boolean; active: boolean; callbackCount: number } {
    return {
      enabled: this.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  private getFromCache(key: string): QuestDefinition[] | null {
    const cached = this.mongoCache.get(key);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.mongoCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: QuestDefinition[]): void {
    this.mongoCache.set(key, {
      data: [...data],
      timestamp: Date.now()
    });
  }

  private validateQuestJson(questJson: any): { valid: boolean; errors?: string[]; warnings?: string[] } {
    const errors: string[] = [];

    if (!questJson.id || typeof questJson.id !== 'string') {
      errors.push(`ID manquant ou invalide: ${questJson.id}`);
    }
    
    if (!questJson.name || typeof questJson.name !== 'string') {
      errors.push(`Nom manquant ou invalide: ${questJson.name}`);
    }
    
    if (!questJson.steps || !Array.isArray(questJson.steps) || questJson.steps.length === 0) {
      errors.push(`Étapes manquantes ou invalides`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async reloadQuestsFromMongoDB(): Promise<boolean> {
    try {
      this.mongoCache.clear();
      this.questDefinitions.clear();
      this.questSourceMap.clear();
      this.npcQuestIndex.clear(); // ✨ NOUVEAU : Vider l'index
      
      await this.loadQuestDefinitionsFromMongoDB();
      return true;
    } catch (error) {
      return false;
    }
  }

  async syncQuestsToMongoDB(): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      const questsToSync = Array.from(this.questDefinitions.values()).filter(quest => 
        this.questSourceMap.get(quest.id) !== 'mongodb'
      );
      
      for (const quest of questsToSync) {
        try {
          const existingDoc = await QuestData.findOne({ questId: quest.id });
          
          if (existingDoc) {
            await existingDoc.updateFromJson(quest);
            results.success++;
          } else {
            const newDoc = await (QuestData as any).createFromJson(quest);
            results.success++;
          }
        } catch (error) {
          const errorMsg = `Quête ${quest.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          results.errors.push(errorMsg);
        }
      }
    } catch (error) {
      results.errors.push('Erreur de synchronisation globale');
    }
    
    return results;
  }

  async handlePlayerReconnection(username: string): Promise<{ resetOccurred: boolean; message?: string }> {
    try {
      const { getServerConfig } = require("../config/serverConfig");
      const serverConfig = getServerConfig();
      
      if (!serverConfig.autoresetQuest) {
        return { resetOccurred: false };
      }

      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) {
        return { resetOccurred: false };
      }

      const activeQuestsCount = playerQuests.activeQuests?.length || 0;
      
      if (activeQuestsCount === 0) {
        return { resetOccurred: false };
      }

      playerQuests.activeQuests = [];
      await playerQuests.save();
      
      await this.clientHandler.notifySystemMessage(
        username, 
        `Auto-reset effectué: ${activeQuestsCount} quête(s) supprimée(s)`,
        'info'
      );
      
      return { 
        resetOccurred: true, 
        message: `Auto-reset effectué: ${activeQuestsCount} quête(s) supprimée(s)` 
      };

    } catch (error) {
      return { resetOccurred: false, message: "Erreur lors de l'auto-reset" };
    }
  }
  
  async getAvailableQuests(username: string): Promise<QuestDefinition[]> {
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      
      const playerData = {
        username,
        level: 1,
        completedQuests: playerQuests?.completedQuests.map((q: any) => q.questId) || [],
        activeQuests: playerQuests?.activeQuests.map((q: any) => q.questId) || [],
        lastQuestCompletions: (playerQuests?.lastQuestCompletions || []).map((c: any) => ({
          questId: c.questId,
          lastCompletedAt: c.lastCompletedAt
        }))
      };

      const available: QuestDefinition[] = [];

      for (const [questId, definition] of this.questDefinitions) {
        const isAvailable = await this.validator.isAvailableForPlayer(definition, playerData);
        if (isAvailable) {
          available.push(definition);
        }
      }

      return available;
    } catch (error) {
      return [];
    }
  }

  // ✅ MODIFIÉ : startQuest avec refresh automatique NPCs
  async startQuest(username: string, questId: string): Promise<Quest | null> {
    try {
      const definition = this.questDefinitions.get(questId);
      if (!definition) return null;

      const availableQuests = await this.getAvailableQuests(username);
      if (!availableQuests.find(q => q.id === questId)) return null;

      const objectivesMap = new Map();
      const firstStep = definition.steps[0];
      
      // ✅ PHASE 1 : Initialisation classique des objectifs
      for (const objective of firstStep.objectives) {
        objectivesMap.set(objective.id, {
          currentAmount: 0,
          completed: false,
          startedAt: new Date(),
          attempts: 0
        });
      }

      const questProgress = {
        questId,
        currentStepIndex: 0,
        objectives: objectivesMap,
        status: 'active' as const,
        startedAt: new Date()
      };

      // ✅ PHASE 2 : SCAN INVENTAIRE AUTOMATIQUE (NOUVEAU)
      console.log(`🔍 [QuestManager] Scan inventaire au démarrage de "${definition.name}" pour ${username}`);
      
      try {
        // Utiliser la méthode de scan du progressTracker
        const scanResult = await this.progressTracker.scanStepObjectives(username, questProgress, firstStep.objectives);
        
        if (scanResult.autoCompleted > 0) {
          console.log(`🎯 [QuestManager] Scan initial: ${scanResult.autoCompleted} objectif(s) auto-complété(s) sur ${scanResult.scannedObjectives}`);
        }
      } catch (scanError) {
        console.warn(`⚠️ [QuestManager] Erreur scan inventaire initial:`, scanError);
        // Continue même en cas d'erreur de scan
      }

      // ✅ PHASE 3 : Sauvegarde et notifications
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

      const quest = this.buildQuestFromProgress(definition, questProgress);

      // ✅ PHASE 4 : Construire les objectifs pour notification (avec progression éventuelle du scan)
      const questObjectives = firstStep.objectives.map(obj => {
        const progress = objectivesMap.get(obj.id) || { currentAmount: 0, completed: false };
        return {
          id: obj.id,
          type: obj.type,
          description: obj.description,
          target: obj.target,
          targetName: obj.targetName,
          currentAmount: progress.currentAmount, // ✅ Prend en compte le scan
          requiredAmount: obj.requiredAmount,
          completed: progress.completed // ✅ Prend en compte le scan
        };
      });
      
      await this.clientHandler.notifyQuestStarted(username, quest, questObjectives);
      
      // ✅ PHASE 5 : Notifications additionnelles pour objectifs auto-complétés
      for (const questObjective of questObjectives) {
        if (questObjective.completed) {
          console.log(`✅ [QuestManager] Objectif auto-complété au démarrage: ${questObjective.description}`);
          await this.clientHandler.notifyObjectiveCompleted(username, quest, questObjective);
        }
      }
      
      // ✅ NOUVEAU : Déclencher refresh automatique des NPCs après démarrage
      await this.triggerNpcStatusRefresh(username);
      
      return quest;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur startQuest:`, error);
      return null;
    }
  }

  // ✅ MODIFIÉ : asPlayerQuestWith avec refresh automatique NPCs
  async asPlayerQuestWith(playerName: string, action: string, targetId: string): Promise<void> {
    try {
      console.log(`🎯 [QuestManager] asPlayerQuestWith: ${playerName} -> ${action}:${targetId}`);

      // 🔍 DEBUG : Afficher les quêtes actives pour diagnostic
      const playerQuests = await PlayerQuest.findOne({ username: playerName });
      if (playerQuests && playerQuests.activeQuests) {
        console.log(`📋 [QuestManager] ${playerQuests.activeQuests.length} quête(s) active(s):`);
        for (const quest of playerQuests.activeQuests) {
          const definition = this.questDefinitions.get(quest.questId);
          if (definition) {
            const currentStep = definition.steps[quest.currentStepIndex];
            console.log(`   - ${definition.name} (étape ${quest.currentStepIndex}: ${currentStep?.name})`);
            if (currentStep) {
              for (const obj of currentStep.objectives) {
                console.log(`     * ${obj.type}:${obj.target || obj.itemId} - ${obj.description}`);
              }
            }
          }
        }
      }

      // ✅ SOLUTION SIMPLE : Déléguer entièrement à updateQuestProgress
      const progressEvent: QuestProgressEvent = {
        type: action as any,
        targetId: targetId,
        amount: 1
      };

      console.log(`📤 [QuestManager] Envoi événement:`, progressEvent);

      // Utiliser la logique complète et robuste d'updateQuestProgress
      const results = await this.updateQuestProgress(playerName, progressEvent);
      
      console.log(`📥 [QuestManager] Résultat updateQuestProgress: ${results.length} progression(s)`);
      if (results.length > 0) {
        results.forEach(result => {
          console.log(`   ✅ ${result.questName}: ${result.message}`);
        });
        
        // ✅ NOUVEAU : Déclencher refresh automatique des NPCs après progression
        await this.triggerNpcStatusRefresh(playerName);
      } else {
        console.log(`   ❌ Aucune progression détectée - vérifier le matching`);
      }

    } catch (error) {
      console.error(`❌ [QuestManager] Erreur dans asPlayerQuestWith:`, error);
      // Méthode silencieuse - ne pas propager l'erreur
    }
  }

  async updateQuestProgress(username: string, event: QuestProgressEvent): Promise<QuestUpdateResult[]> {
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) return [];

      const results = await this.progressTracker.updateProgress(
        username,
        event,
        playerQuests.activeQuests,
        this.questDefinitions
      );

      for (const result of results) {
        const definition = this.questDefinitions.get(result.questId);
        if (!definition) continue;

        const quest = this.buildQuestFromProgress(definition, 
          playerQuests.activeQuests.find((q: any) => q.questId === result.questId)
        );

        if (result.objectiveCompleted && result.objectiveName) {
          const objective = this.findObjectiveByName(definition, result.objectiveName);
          if (objective) {
            await this.clientHandler.notifyObjectiveCompleted(username, quest, objective);
          }
        }

        if (result.stepCompleted && result.stepName) {
          const nextStepName = result.newStepIndex !== undefined && definition.steps[result.newStepIndex] 
            ? definition.steps[result.newStepIndex].name 
            : undefined;
          await this.clientHandler.notifyStepCompleted(username, quest, result.stepName, nextStepName);
        }

        if (result.questCompleted) {
          const allRewards = [...(result.stepRewards || []), ...(result.questRewards || [])];
          if (allRewards.length > 0) {
            await this.rewardDistributor.distributeRewards(username, allRewards);
          }

          const completionStats = {
            totalTime: Math.floor((Date.now() - new Date(playerQuests.activeQuests.find((q: any) => q.questId === result.questId)?.startedAt || Date.now()).getTime()) / (60 * 1000)),
            stepsCompleted: definition.steps.length,
            objectivesCompleted: definition.steps.reduce((sum, step) => sum + step.objectives.length, 0)
          };

          await this.clientHandler.notifyQuestCompleted(username, quest, allRewards, completionStats);

          if (result.autoCompleted) {
            await this.completeQuest(username, 
              playerQuests.activeQuests.find((q: any) => q.questId === result.questId), 
              definition, 
              playerQuests
            );
          } else {
            const questProgress = playerQuests.activeQuests.find((q: any) => q.questId === result.questId);
            if (questProgress) {
              questProgress.status = 'readyToComplete';
            }
          }
          
          if (result.questRewards) {
            result.questRewards = this.convertToLegacyRewards(result.questRewards);
          }
          if (result.stepRewards) {
            result.stepRewards = this.convertToLegacyRewards(result.stepRewards);
          }
        } else if (result.objectiveCompleted || result.stepCompleted) {
          const objective = this.findCurrentObjective(definition, 
            playerQuests.activeQuests.find((q: any) => q.questId === result.questId)
          );
          if (objective) {
            await this.clientHandler.notifyQuestProgress(username, quest, objective, 0);
          }
        }
      }

      if (results.length > 0) {
        await playerQuests.save();
      }

      return results;
    } catch (error) {
      return [];
    }
  }

  // ✅ MODIFIÉ : completeQuestManually avec refresh automatique NPCs
  async completeQuestManually(username: string, questId: string): Promise<QuestUpdateResult | null> {
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) return null;

      const questProgress = playerQuests.activeQuests.find((q: any) => 
        q.questId === questId && q.status === 'readyToComplete'
      );
      
      if (!questProgress) return null;

      const definition = this.questDefinitions.get(questId);
      if (!definition) return null;

      const questRewards = this.rewardDistributor.calculateFinalQuestRewards(definition);
      if (questRewards.length > 0) {
        await this.rewardDistributor.distributeRewards(username, questRewards);
      }

      await this.completeQuest(username, questProgress, definition, playerQuests);
      await playerQuests.save();

      const quest = this.buildQuestFromProgress(definition, questProgress);
      const completionStats = {
        totalTime: Math.floor((Date.now() - questProgress.startedAt.getTime()) / (60 * 1000)),
        stepsCompleted: definition.steps.length,
        objectivesCompleted: definition.steps.reduce((sum, step) => sum + step.objectives.length, 0)
      };
      
      await this.clientHandler.notifyQuestCompleted(username, quest, questRewards, completionStats);

      // ✅ NOUVEAU : Déclencher refresh automatique des NPCs après completion manuelle
      await this.triggerNpcStatusRefresh(username);

      return {
        questId: questId,
        questName: definition.name,
        questCompleted: true,
        autoCompleted: false,
        questRewards: this.convertToLegacyRewards(questRewards),
        message: `Félicitations ! Vous avez terminé "${definition.name}" !`
      };
    } catch (error) {
      return null;
    }
  }

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

  public async getRecentlyCompletedQuestByNpc(
    username: string, 
    npcId: number, 
    withinHours: number = 24
  ): Promise<{ questDefinition: any; completedAt: Date } | null> {
    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      
      if (!playerQuests || !playerQuests.completedQuests || playerQuests.completedQuests.length === 0) {
        return null;
      }
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - withinHours);
      
      const recentlyCompleted = playerQuests.completedQuests
        .filter(completedQuest => 
          completedQuest.completedAt && 
          new Date(completedQuest.completedAt) >= cutoffTime
        )
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      if (recentlyCompleted.length === 0) return null;
      
      for (const completedQuest of recentlyCompleted) {
        try {
          const questDefinition = this.getQuestDefinition(completedQuest.questId);
          
          if (!questDefinition) continue;
          
          const isRelatedNpc = questDefinition.startNpcId === npcId || questDefinition.endNpcId === npcId;
          
          if (isRelatedNpc && (questDefinition.dialogues as any)?.postQuestDialogue) {
            return {
              questDefinition,
              completedAt: new Date(completedQuest.completedAt)
            };
          }
        } catch (error) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
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

  // ✨ OPTIMISÉ : Lookup ultra-rapide via index
  getQuestsForNpc(npcId: number): QuestDefinition[] {
    return this.npcQuestIndex.get(npcId) || [];
  }

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

  // ✅ MODIFIÉ : giveQuest avec refresh automatique NPCs
  async giveQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      const status = await this.getQuestStatus(playerName, questId);
      if (status !== 'available') {
        const message = `Quête ${questId} non disponible (statut: ${status})`;
        return { success: false, message };
      }
      
      const quest = await this.startQuest(playerName, questId);
      
      if (quest) {
        return { 
          success: true, 
          message: `Quête "${quest.name}" donnée avec succès !`,
          quest: quest
        };
      } else {
        const message = `Impossible de démarrer la quête ${questId}`;
        return { success: false, message };
      }
    } catch (error) {
      return { success: false, message: "Erreur serveur lors de l'attribution de la quête" };
    }
  }

  // ✅ MODIFIÉ : progressQuest avec refresh automatique NPCs
  async progressQuest(playerName: string, event: any): Promise<{ success: boolean; results: any[] }> {
    try {
      const results = await this.updateQuestProgress(playerName, event);
      
      if (results && results.length > 0) {
        // ✅ NOUVEAU : Déclencher refresh automatique des NPCs après progression
        await this.triggerNpcStatusRefresh(playerName);
        return { success: true, results };
      } else {
        return { success: true, results: [] };
      }
    } catch (error) {
      return { success: false, results: [] };
    }
  }

  async checkQuestStatus(playerName: string, questId: string): Promise<string> {
    try {
      const status = await this.getQuestStatus(playerName, questId);
      return status;
    } catch (error) {
      return 'unavailable';
    }
  }

  async getPlayerActiveQuests(playerName: string): Promise<any[]> {
    try {
      const activeQuests = await this.getActiveQuests(playerName);
      return activeQuests;
    } catch (error) {
      return [];
    }
  }

  async getPlayerAvailableQuests(playerName: string): Promise<any[]> {
    try {
      const availableQuests = await this.getAvailableQuests(playerName);
      return availableQuests;
    } catch (error) {
      return [];
    }
  }

  // ✅ MODIFIÉ : completePlayerQuest avec refresh automatique NPCs
  async completePlayerQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; rewards?: any[] }> {
    try {
      const result = await this.completeQuestManually(playerName, questId);
      
      if (result) {
        return { 
          success: true, 
          message: result.message || "Quête complétée !",
          rewards: result.questRewards
        };
      } else {
        const message = `Quête ${questId} non prête à être complétée`;
        return { success: false, message };
      }
    } catch (error) {
      return { success: false, message: "Erreur lors de la completion de la quête" };
    }
  }

  private convertToLegacyRewards(rewards: any[]): QuestReward[] {
    return rewards.filter(reward => {
      const legacyTypes = ['gold', 'item', 'pokemon', 'experience'];
      return legacyTypes.includes(reward.type);
    }).map(reward => ({
      type: reward.type as 'gold' | 'item' | 'pokemon' | 'experience',
      itemId: reward.itemId,
      amount: reward.amount,
      pokemonId: reward.pokemonId
    }));
  }

  private findObjectiveByName(definition: QuestDefinition, objectiveName: string): QuestObjective | null {
    for (const step of definition.steps) {
      for (const objective of step.objectives) {
        if (objective.description === objectiveName) {
          return {
            id: objective.id,
            type: objective.type,
            description: objective.description,
            target: objective.target,
            targetName: objective.targetName,
            currentAmount: 0,
            requiredAmount: objective.requiredAmount,
            completed: false
          };
        }
      }
    }
    return null;
  }

  private findCurrentObjective(definition: QuestDefinition, questProgress: any): QuestObjective | null {
    const currentStep = definition.steps[questProgress?.currentStepIndex || 0];
    if (!currentStep || !currentStep.objectives[0]) return null;

    const firstObjective = currentStep.objectives[0];
    return {
      id: firstObjective.id,
      type: firstObjective.type,
      description: firstObjective.description,
      target: firstObjective.target,
      targetName: firstObjective.targetName,
      currentAmount: 0,
      requiredAmount: firstObjective.requiredAmount,
      completed: false
    };
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
  }

  getSystemStats() {
    const mongoCount = Array.from(this.questSourceMap.values()).filter(s => s === 'mongodb').length;
    const jsonCount = Array.from(this.questSourceMap.values()).filter(s => s === 'json').length;
    
    const questsByCategory: Record<string, number> = {};
    for (const quest of this.questDefinitions.values()) {
      questsByCategory[quest.category] = (questsByCategory[quest.category] || 0) + 1;
    }
    
    return {
      totalQuests: this.questDefinitions.size,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      sources: { json: jsonCount, mongodb: mongoCount },
      questsByCategory,
      validationErrors: this.validationErrors.size,
      lastLoadTime: this.lastLoadTime,
      config: this.config,
      cache: { size: this.mongoCache.size, ttl: this.config.cacheTTL },
      hotReload: this.getHotReloadStatus(),
      // ✨ NOUVEAU : Stats de l'index
      npcIndex: {
        npcsIndexed: this.npcQuestIndex.size,
        totalQuestMappings: Array.from(this.npcQuestIndex.values()).reduce((sum, quests) => sum + quests.length, 0)
      },
      services: {
        progressTracker: this.progressTracker.getDebugInfo(),
        validator: this.validator.getDebugInfo(),
        rewardDistributor: this.rewardDistributor.getDebugInfo(),
        clientHandler: this.clientHandler.getDebugInfo()
      },
      // ✅ NOUVEAU : Info sur le callback WorldRoom
      worldRoomIntegration: {
        callbackRegistered: !!this.worldRoomCallback,
        autoRefreshEnabled: !!this.worldRoomCallback
      }
    };
  }

  debugSystem(): void {
    const stats = this.getSystemStats();
    console.log(`🔍 [QuestManager] === DEBUG SYSTÈME OPTIMISÉ ===`);
    console.log(`📊 Total quêtes: ${stats.totalQuests}`);
    console.log(`🚀 NPCs indexés: ${stats.npcIndex.npcsIndexed}`);
    console.log(`🎯 Mappings quest-NPC: ${stats.npcIndex.totalQuestMappings}`);
    console.log(`🔄 Refresh auto NPCs: ${stats.worldRoomIntegration.autoRefreshEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    console.log(`✅ Optimisation: ${stats.npcIndex.npcsIndexed > 0 ? 'ACTIVE' : 'INACTIVE'}`);
  }

  public cleanup(): void {
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.questSourceMap.clear();
    this.validationErrors.clear();
    this.npcQuestIndex.clear(); // ✨ NOUVEAU : Nettoyer l'index
    
    // ✅ NOUVEAU : Nettoyer le callback
    this.worldRoomCallback = undefined;
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    if (this.clientHandler) {
      this.clientHandler.cleanup();
    }
  }
}
