// server/src/managers/QuestManager.ts - VERSION MODULAIRE AVEC 4 SERVICES
// ✅ CONSERVE 100% : MongoDB, Hot-reload, ServiceRegistry, Interface publique
// ✨ NOUVEAU : Architecture modulaire avec 4 services

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

// ✨ IMPORT DES TYPES ÉTENDUS AVEC ALIAS POUR ÉVITER CONFLITS
import { 
  QuestDefinition as ExtendedQuestDefinition,
  QuestReward as ExtendedQuestReward
} from "../quest/core/types/QuestTypes";
import { ServiceRegistry } from "../services/ServiceRegistry";

// ✨ IMPORT DES 4 SERVICES MODULAIRES
import QuestProgressTracker from "../quest/services/QuestProgressTracker";
import QuestValidator from "../quest/services/QuestValidator";
import RewardDistributor from "../quest/services/RewardDistributor";
import QuestClientHandler from "../quest/services/QuestClientHandler";

// ===== ÉNUMÉRATION DES SOURCES DE DONNÉES (CONSERVÉ) =====
export enum QuestDataSource {
  JSON = 'json',
  MONGODB = 'mongodb',
  HYBRID = 'hybrid'
}

// ===== CONFIGURATION (CONSERVÉE) =====
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

// ===== RÉSULTAT DE MISE À JOUR (CONSERVÉ) =====
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
  // ===== PROPRIÉTÉS EXISTANTES (100% CONSERVÉES) =====
  private questDefinitions: Map<string, QuestDefinition> = new Map();
  
  // ✅ FLAGS D'ÉTAT (conservés)
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // ✅ PROPRIÉTÉS MONGODB (conservées)
  private mongoCache: Map<string, { data: QuestDefinition[]; timestamp: number }> = new Map();
  private questSourceMap: Map<string, 'json' | 'mongodb'> = new Map();
  private validationErrors: Map<string, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  // ✅ HOT RELOAD (conservé)
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, questData?: any) => void> = [];
  
  // ✅ CONFIGURATION (conservée)
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

  // ✨ NOUVEAUX : 4 SERVICES MODULAIRES
  private progressTracker: QuestProgressTracker;
  private validator: QuestValidator;
  private rewardDistributor: RewardDistributor;
  private clientHandler: QuestClientHandler;

  // ===== CONSTRUCTEUR ÉTENDU =====
  constructor(questDataPath?: string, customConfig?: Partial<QuestManagerConfig>) {
    // ✅ CONFIGURATION EXISTANTE (conservée)
    if (questDataPath) {
      this.config.questDataPath = questDataPath;
    }
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [QuestManager] Construction avec architecture modulaire`, {
      primarySource: this.config.primaryDataSource,
      config: this.config
    });

    // ✨ INITIALISATION DES 4 SERVICES
    this.initializeServices();
    
    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [QuestManager] Construit avec 4 services modulaires (pas encore initialisé)`, {
      totalQuests: this.questDefinitions.size,
      needsInitialization: true,
      services: ['QuestProgressTracker', 'QuestValidator', 'RewardDistributor', 'QuestClientHandler']
    });
  }

  // ✨ INITIALISATION DES SERVICES MODULAIRES
  private initializeServices(): void {
    this.log('info', `🔧 [QuestManager] Initialisation des services modulaires...`);

    // Service 1: Progression des quêtes
    this.progressTracker = new QuestProgressTracker({
      enableProgressLogging: this.config.debugMode,
      strictConditionValidation: this.config.strictValidation,
      enableAdvancedConditions: true
    });

    // Service 2: Validation des quêtes  
    this.validator = new QuestValidator({
      enableCaching: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL / 1000, // Convertir ms en secondes
      strictValidation: this.config.strictValidation,
      enableValidationLogging: this.config.debugMode
    });

    // Service 3: Distribution des récompenses
    this.rewardDistributor = new RewardDistributor({
      enableDistributionLogging: this.config.debugMode,
      strictValidation: this.config.strictValidation,
      enableRetry: true,
      maxRetries: 3
    });

    // Service 4: Notifications client
    this.clientHandler = new QuestClientHandler({
      enableNotifications: true,
      enableMessageLogging: this.config.debugMode,
      enablePersonalization: true,
      enableRateLimiting: true
    });

    this.log('info', `✅ [QuestManager] 4 services modulaires initialisés`);
  }

  // ===== MÉTHODES D'INITIALISATION (100% CONSERVÉES) =====

  /**
   * ✅ CONSERVÉ : Initialisation asynchrone
   */
  async initialize(): Promise<void> {
    // Éviter les initialisations multiples
    if (this.isInitialized) {
      this.log('info', `♻️ [QuestManager] Déjà initialisé`);
      return;
    }
    
    if (this.isInitializing) {
      this.log('info', `⏳ [QuestManager] Initialisation en cours, attente...`);
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    this.log('info', `🔄 [QuestManager] Démarrage initialisation asynchrone...`);
    
    // Créer la promesse d'initialisation
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.log('info', `✅ [QuestManager] Initialisation terminée avec succès`, {
        totalQuests: this.questDefinitions.size
      });
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur lors de l'initialisation:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * ✅ CONSERVÉ : Logique d'initialisation
   */
  private async performInitialization(): Promise<void> {
    try {
      this.log('info', `🔍 [QuestManager] Chargement selon stratégie: ${this.config.primaryDataSource}`);
      await this.loadQuestDefinitions();
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur initialisation:`, error);
      throw error;
    }
  }

  /**
   * ✅ CONSERVÉ : waitForLoad
   */
  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente du chargement des quêtes (timeout: ${timeoutMs}ms)...`);
    
    // ✅ ÉTAPE 1: S'assurer que l'initialisation est lancée
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [WaitForLoad] Lancement de l'initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    // ✅ ÉTAPE 2: Attendre que l'initialisation se termine
    while ((!this.isInitialized || this.questDefinitions.size === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.questDefinitions.size > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] Quêtes chargées: ${this.questDefinitions.size} quêtes en ${loadTime}ms`);
      
      // ✅ DÉMARRER HOT RELOAD après chargement réussi
      if (this.config.primaryDataSource === QuestDataSource.MONGODB && this.hotReloadEnabled) {
        this.startHotReload();
      }
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms, initialisé: ${this.isInitialized}, Quêtes: ${this.questDefinitions.size}`);
    }
    
    return loaded;
  }

  // ===== MÉTHODES MONGODB (100% CONSERVÉES - COPIER-COLLER) =====

  /**
   * ✅ CONSERVÉ : Chargement des définitions
   */
  private async loadQuestDefinitions(): Promise<void> {
    const startTime = Date.now();
    
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
            this.log('warn', `⚠️ [Hybrid] MongoDB échoué, fallback JSON`);
            this.loadQuestDefinitionsFromJSON();
          }
          break;
      }
      
      const loadTime = Date.now() - startTime;
      this.log('info', `✅ Quêtes chargées en ${loadTime}ms`, {
        total: this.questDefinitions.size,
        source: this.config.primaryDataSource
      });
      
    } catch (error) {
      this.log('error', `❌ Erreur de chargement des quêtes:`, error);
      throw error;
    }
  }

  /**
   * ✅ CONSERVÉ : Chargement MongoDB
   */
  private async loadQuestDefinitionsFromMongoDB(): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.config.useMongoCache) {
        const cached = this.getFromCache('all_quests');
        if (cached) {
          this.log('info', `💾 [MongoDB Cache] Quêtes trouvées en cache`);
          this.addQuestsToCollection(cached, QuestDataSource.MONGODB);
          return;
        }
      }
      
      this.log('info', `🗄️ [MongoDB] Chargement des quêtes...`);
      
      await this.waitForMongoDBReady();
      
      const mongoQuests = await QuestData.findActiveQuests();
      
      const questDefinitions: QuestDefinition[] = mongoQuests.map(mongoDoc => 
        this.convertMongoDocToQuestDefinition(mongoDoc)
      );
      
      this.addQuestsToCollection(questDefinitions, QuestDataSource.MONGODB);
      
      if (this.config.useMongoCache) {
        this.setCache('all_quests', questDefinitions);
      }
      
      const queryTime = Date.now() - startTime;
      this.log('info', `✅ [MongoDB] ${questDefinitions.length} quêtes chargées en ${queryTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur chargement quêtes:`, error);
      
      if (this.config.enableFallback) {
        this.log('info', `🔄 [Fallback] Tentative chargement JSON`);
        this.loadQuestDefinitionsFromJSON();
      } else {
        throw error;
      }
    }
  }

  /**
   * ✅ CONSERVÉ : Conversion MongoDB vers QuestDefinition
   */
  private convertMongoDocToQuestDefinition(mongoDoc: any): QuestDefinition {
    try {
      // ✅ GESTION : Objet Mongoose VS objet brut des Change Streams
      let questDefinition: QuestDefinition;
      
      if (typeof mongoDoc.toQuestDefinition === 'function') {
        // Document Mongoose complet avec méthodes
        questDefinition = mongoDoc.toQuestDefinition();
      } else {
        // ✅ NOUVEAU : Objet brut des Change Streams - conversion manuelle
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
      this.log('error', '❌ [convertMongoDocToQuestDefinition] Erreur conversion:', error);
      this.log('info', '📄 [convertMongoDocToQuestDefinition] mongoDoc:', {
        _id: mongoDoc._id,
        questId: mongoDoc.questId,
        name: mongoDoc.name,
        hasToQuestDefinition: typeof mongoDoc.toQuestDefinition === 'function'
      });
      throw error;
    }
  }

  /**
   * ✅ CONSERVÉ : Ajout des quêtes à la collection
   */
  private addQuestsToCollection(questDefinitions: QuestDefinition[], source: QuestDataSource): void {
    for (const quest of questDefinitions) {
      this.questDefinitions.set(quest.id, quest);
      this.questSourceMap.set(quest.id, source === QuestDataSource.MONGODB ? 'mongodb' : 'json');
    }
  }

  /**
   * ✅ CONSERVÉ : Chargement JSON
   */
  private loadQuestDefinitionsFromJSON(): void {
    try {
      const resolvedPath = path.resolve(__dirname, this.config.questDataPath);
      if (!fs.existsSync(resolvedPath)) {
        this.log('warn', `⚠️ Fichier de quêtes JSON introuvable : ${resolvedPath}`);
        return;
      }

      const questData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      
      if (!questData.quests || !Array.isArray(questData.quests)) {
        this.log('warn', `⚠️ Format JSON invalid dans ${resolvedPath}`);
        return;
      }
      
      let jsonQuestCount = 0;
      let validationErrors = 0;

      for (const quest of questData.quests) {
        try {
          if (this.config.strictValidation) {
            const validation = this.validateQuestJson(quest);
            if (!validation.valid) {
              this.validationErrors.set(quest.id, validation.errors || []);
              this.log('error', `❌ [JSON] Quête ${quest.id} invalide:`, validation.errors);
              validationErrors++;
              continue;
            }
          }

          this.questDefinitions.set(quest.id, quest);
          this.questSourceMap.set(quest.id, 'json');
          jsonQuestCount++;
          
        } catch (questError) {
          this.log('error', `❌ [JSON] Erreur quête ${quest.id}:`, questError);
          validationErrors++;
        }
      }
      
      this.log('info', `✅ [JSON] Quêtes chargées:`, {
        questsLoaded: jsonQuestCount,
        validationErrors,
        totalQuests: this.questDefinitions.size
      });
      
    } catch (error) {
      this.log('error', `❌ [JSON] Erreur chargement quêtes.json:`, error);
      throw error;
    }
  }

  /**
   * ✅ CONSERVÉ : Ping MongoDB
   */
  private async waitForMongoDBReady(maxRetries: number = 10): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        this.log('info', `🏓 [MongoDB Ping] Tentative ${retries + 1}/${maxRetries}...`);
        
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Mongoose pas encore connecté');
        }
        
        await mongoose.connection.db.admin().ping();
        
        const dbName = mongoose.connection.db.databaseName;
        this.log('info', `🗄️ [MongoDB Ping] Base de données: ${dbName}`);
        
        const rawCount = await mongoose.connection.db.collection('quest_data').countDocuments();
        this.log('info', `📊 [MongoDB Ping] Quêtes collection brute: ${rawCount}`);
        
        const testCount = await QuestData.countDocuments();
        this.log('info', `📊 [MongoDB Ping] Quêtes via modèle: ${testCount}`);
        
        if (rawCount !== testCount) {
          this.log('warn', `⚠️ [MongoDB Ping] Différence détectée ! Raw: ${rawCount}, Modèle: ${testCount}`);
          
          const rawSample = await mongoose.connection.db.collection('quest_data').findOne();
          this.log('info', `📄 [MongoDB Ping] Exemple brut:`, rawSample ? {
            _id: rawSample._id,
            questId: rawSample.questId,
            name: rawSample.name
          } : 'Aucun');
        }
        
        this.log('info', `✅ [MongoDB Ping] Succès ! ${testCount} quêtes détectées via modèle`);
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        this.log('warn', `⚠️ [MongoDB Ping] Échec ${retries}/${maxRetries}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        this.log('info', `⏳ [MongoDB Ping] Attente ${waitTime}ms avant retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ===== HOT RELOAD (100% CONSERVÉ) =====

  /**
   * ✅ CONSERVÉ : Démarrage Hot Reload
   */
  private startHotReload(): void {
    try {
      this.log('info', '🔥 [HotReload] Démarrage MongoDB Change Streams...');
      
      this.changeStream = QuestData.watch([], { 
        fullDocument: 'updateLookup'
      });
      
      this.changeStream.on('change', (change: any) => {
        this.handleMongoDBChange(change);
      });
      
      this.changeStream.on('error', (error: any) => {
        this.log('error', '❌ [HotReload] Erreur Change Stream:', error);
        
        setTimeout(() => {
          this.log('info', '🔄 [HotReload] Redémarrage Change Stream...');
          this.startHotReload();
        }, 5000);
      });
      
      this.log('info', '✅ [HotReload] Change Streams actif !');
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Impossible de démarrer Change Streams:', error);
    }
  }

  /**
   * ✅ CONSERVÉ : Gestion changements MongoDB
   */
  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      this.log('info', `🔥 [HotReload] Changement détecté: ${change.operationType}`);
      
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
          
        default:
          this.log('info', `ℹ️ [HotReload] Opération ignorée: ${change.operationType}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur traitement changement:', error);
    }
  }

  /**
   * ✅ CONSERVÉ : Insertion de quête
   */
  private async handleQuestInsert(mongoDoc: any): Promise<void> {
    try {
      const questDefinition = this.convertMongoDocToQuestDefinition(mongoDoc);
      
      this.questDefinitions.set(questDefinition.id, questDefinition);
      this.questSourceMap.set(questDefinition.id, 'mongodb');
      this.mongoCache.delete('all_quests');
      
      this.log('info', `➕ [HotReload] Quête ajoutée: ${questDefinition.name} (ID: ${questDefinition.id})`);
      this.notifyReloadCallbacks('insert', questDefinition);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur ajout quête:', error);
    }
  }

  /**
   * ✅ CONSERVÉ : Mise à jour de quête
   */
  private async handleQuestUpdate(mongoDoc: any): Promise<void> {
    try {
      const questDefinition = this.convertMongoDocToQuestDefinition(mongoDoc);
      
      this.questDefinitions.set(questDefinition.id, questDefinition);
      this.questSourceMap.set(questDefinition.id, 'mongodb');
      this.mongoCache.delete('all_quests');
      
      this.log('info', `🔄 [HotReload] Quête mise à jour: ${questDefinition.name} (ID: ${questDefinition.id})`);
      this.notifyReloadCallbacks('update', questDefinition);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur modification quête:', error);
    }
  }

  /**
   * ✅ CONSERVÉ : Suppression de quête
   */
  private async handleQuestDelete(documentId: any): Promise<void> {
    try {
      const questToDelete = Array.from(this.questDefinitions.values()).find(quest => {
        // Trouver via la source MongoDB
        return this.questSourceMap.get(quest.id) === 'mongodb';
      });
      
      if (questToDelete) {
        this.questDefinitions.delete(questToDelete.id);
        this.questSourceMap.delete(questToDelete.id);
        this.mongoCache.delete('all_quests');
        
        this.log('info', `➖ [HotReload] Quête supprimée: ${questToDelete.name} (ID: ${questToDelete.id})`);
        this.notifyReloadCallbacks('delete', questToDelete);
        
      } else {
        this.log('warn', `⚠️ [HotReload] Quête à supprimer non trouvée: ${documentId}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur suppression quête:', error);
    }
  }

  /**
   * ✅ CONSERVÉ : Notifications callbacks
   */
  private notifyReloadCallbacks(event: string, questData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, questData);
      } catch (error) {
        this.log('error', '❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  // ===== MÉTHODES PUBLIQUES HOT RELOAD (CONSERVÉES) =====

  /**
   * ✅ CONSERVÉ : Enregistrer callback
   */
  public onQuestChange(callback: (event: string, questData?: any) => void): void {
    this.reloadCallbacks.push(callback);
    this.log('info', `📋 [HotReload] Callback enregistré (total: ${this.reloadCallbacks.length})`);
  }

  /**
   * ✅ CONSERVÉ : Arrêter Hot Reload
   */
  public stopHotReload(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      this.log('info', '🛑 [HotReload] Change Streams arrêté');
    }
  }

  /**
   * ✅ CONSERVÉ : Statut Hot Reload
   */
  public getHotReloadStatus(): { enabled: boolean; active: boolean; callbackCount: number } {
    return {
      enabled: this.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  // ===== MÉTHODES CACHE (CONSERVÉES) =====

  /**
   * ✅ CONSERVÉ : Récupérer du cache
   */
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

  /**
   * ✅ CONSERVÉ : Mettre en cache
   */
  private setCache(key: string, data: QuestDefinition[]): void {
    this.mongoCache.set(key, {
      data: [...data],
      timestamp: Date.now()
    });
  }

  /**
   * ✅ CONSERVÉ : Validation JSON
   */
  private validateQuestJson(questJson: any): { valid: boolean; errors?: string[]; warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

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
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // ===== MÉTHODES PUBLIQUES MONGODB (CONSERVÉES) =====

  /**
   * ✅ CONSERVÉ : Rechargement MongoDB
   */
  async reloadQuestsFromMongoDB(): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement quêtes depuis MongoDB`);
      
      this.mongoCache.clear();
      this.questDefinitions.clear();
      this.questSourceMap.clear();
      
      await this.loadQuestDefinitionsFromMongoDB();
      
      this.log('info', `✅ [Reload] Quêtes rechargées: ${this.questDefinitions.size}`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur rechargement:`, error);
      return false;
    }
  }

  /**
   * ✅ CONSERVÉ : Synchronisation MongoDB
   */
  async syncQuestsToMongoDB(): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      const questsToSync = Array.from(this.questDefinitions.values()).filter(quest => 
        this.questSourceMap.get(quest.id) !== 'mongodb'
      );
      
      this.log('info', `🔄 [Sync] Synchronisation ${questsToSync.length} quêtes vers MongoDB...`);
      
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
          this.log('error', `❌ [Sync] ${errorMsg}`);
        }
      }
      
      this.log('info', `✅ [Sync] Terminé: ${results.success} succès, ${results.errors.length} erreurs`);
      
    } catch (error) {
      this.log('error', '❌ [Sync] Erreur générale:', error);
      results.errors.push('Erreur de synchronisation globale');
    }
    
    return results;
  }

  // ===== API MÉTIER REFACTORISÉE (DÉLÉGATION VERS SERVICES) =====

  /**
   * ✨ REFACTORISÉ : Reconnexion joueur (utilise les services)
   */
  async handlePlayerReconnection(username: string): Promise<{ resetOccurred: boolean; message?: string }> {
    try {
      const { getServerConfig } = require("../config/serverConfig");
      const serverConfig = getServerConfig();
      
      this.log('info', `🔄 [QuestManager] Gestion reconnexion pour ${username}`);
      this.log('info', `⚙️ [QuestManager] autoresetQuest: ${serverConfig.autoresetQuest}`);
      
      if (!serverConfig.autoresetQuest) {
        this.log('info', `ℹ️ [QuestManager] Auto-reset désactivé, aucune action`);
        return { resetOccurred: false };
      }

      // Récupérer les quêtes du joueur
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) {
        this.log('info', `ℹ️ [QuestManager] Aucune quête trouvée pour ${username}`);
        return { resetOccurred: false };
      }

      // Compter les quêtes actives avant reset
      const activeQuestsCount = playerQuests.activeQuests?.length || 0;
      
      if (activeQuestsCount === 0) {
        this.log('info', `ℹ️ [QuestManager] Aucune quête active à reset pour ${username}`);
        return { resetOccurred: false };
      }

      // ✅ SUPPRIMER TOUTES LES QUÊTES ACTIVES
      this.log('info', `🗑️ [QuestManager] Suppression de ${activeQuestsCount} quête(s) active(s) pour ${username}`);
      
      playerQuests.activeQuests = [];
      await playerQuests.save();
      
      // ✨ NOUVEAU : Notifier via service client
      await this.clientHandler.notifySystemMessage(
        username, 
        `Auto-reset effectué: ${activeQuestsCount} quête(s) supprimée(s)`,
        'info'
      );
      
      this.log('info', `✅ [QuestManager] Auto-reset effectué pour ${username}: ${activeQuestsCount} quête(s) supprimée(s)`);
      
      return { 
        resetOccurred: true, 
        message: `Auto-reset effectué: ${activeQuestsCount} quête(s) supprimée(s)` 
      };

    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur lors de l'auto-reset pour ${username}:`, error);
      return { resetOccurred: false, message: "Erreur lors de l'auto-reset" };
    }
  }
  
  /**
   * ✨ REFACTORISÉ : Quêtes disponibles (utilise QuestValidator)
   */
  async getAvailableQuests(username: string): Promise<QuestDefinition[]> {
    try {
      this.log('debug', `📋 [QuestManager] Récupération quêtes disponibles pour ${username}`);

      const playerQuests = await PlayerQuest.findOne({ username });
      
      // Préparer données du joueur pour validation
      const playerData = {
        username,
        level: 1, // TODO: Récupérer niveau réel
        completedQuests: playerQuests?.completedQuests.map((q: any) => q.questId) || [],
        activeQuests: playerQuests?.activeQuests.map((q: any) => q.questId) || [],
        lastQuestCompletions: (playerQuests?.lastQuestCompletions || []).map((c: any) => ({
          questId: c.questId,
          lastCompletedAt: c.lastCompletedAt
        }))
      };

      const available: QuestDefinition[] = [];

      // ✨ UTILISER LE SERVICE VALIDATOR
      for (const [questId, definition] of this.questDefinitions) {
        const isAvailable = await this.validator.isAvailableForPlayer(definition, playerData);
        if (isAvailable) {
          available.push(definition);
        }
      }

      this.log('debug', `✅ [QuestManager] ${available.length} quêtes disponibles pour ${username}`);
      return available;

    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur getAvailableQuests:`, error);
      return [];
    }
  }

  /**
   * ✨ REFACTORISÉ : Démarrage de quête (avec notifications)
   */
  async startQuest(username: string, questId: string): Promise<Quest | null> {
    try {
      this.log('info', `🎯 [QuestManager] Démarrage quête ${questId} pour ${username}`);

      const definition = this.questDefinitions.get(questId);
      if (!definition) {
        this.log('error', `❌ Quête introuvable: ${questId}`);
        return null;
      }

      // ✨ VALIDER AVEC LE SERVICE
      const availableQuests = await this.getAvailableQuests(username);
      if (!availableQuests.find(q => q.id === questId)) {
        this.log('error', `❌ ${username} ne peut pas prendre la quête ${questId}`);
        return null;
      }

      const objectivesMap = new Map();
      const firstStep = definition.steps[0];
      
      // ✅ CRÉER LES OBJECTIFS avec currentAmount = 0 et completed = false
      for (const objective of firstStep.objectives) {
        objectivesMap.set(objective.id, {
          currentAmount: 0,
          completed: false,
          startedAt: new Date(),
          attempts: 0
        });
        this.log('debug', `📋 Objectif créé: ${objective.id} (${objective.type}) - Non complété`);
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

      const quest = this.buildQuestFromProgress(definition, questProgress);

      // ✨ NOUVEAU : Notifier via service client
      const questObjectives = firstStep.objectives.map(obj => ({
        id: obj.id,
        type: obj.type,
        description: obj.description,
        target: obj.target,
        targetName: obj.targetName,
        currentAmount: 0,
        requiredAmount: obj.requiredAmount,
        completed: false
      }));
      
      await this.clientHandler.notifyQuestStarted(username, quest, questObjectives);
      
      this.log('info', `✅ ${username} a commencé la quête: ${definition.name}`);
      return quest;

    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur startQuest:`, error);
      return null;
    }
  }

  /**
   * ✨ REFACTORISÉ : Progression de quête (délégation vers QuestProgressTracker)
   */
  async updateQuestProgress(
    username: string, 
    event: QuestProgressEvent
  ): Promise<QuestUpdateResult[]> {
    
    this.log('info', `📈 [QuestManager] === UPDATE QUEST PROGRESS (MODULAIRE) ===`);
    this.log('info', `👤 Username: ${username}`);
    this.log('info', `🎯 Event:`, event);

    try {
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) {
        this.log('warn', `⚠️ Aucune quête trouvée pour ${username}`);
        return [];
      }

      // ✨ DÉLÉGUER AU SERVICE PROGRESS TRACKER
      const results = await this.progressTracker.updateProgress(
        username,
        event,
        playerQuests.activeQuests,
        this.questDefinitions
      );

      // ✅ TRAITEMENT DES RÉSULTATS
      for (const result of results) {
        const definition = this.questDefinitions.get(result.questId);
        if (!definition) continue;

        const quest = this.buildQuestFromProgress(definition, 
          playerQuests.activeQuests.find((q: any) => q.questId === result.questId)
        );

        // ✨ NOTIFICATIONS AUTOMATIQUES
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
          // ✨ DISTRIBUTION DES RÉCOMPENSES
          const allRewards = [...(result.stepRewards || []), ...(result.questRewards || [])];
          if (allRewards.length > 0) {
            await this.rewardDistributor.distributeRewards(username, allRewards);
          }

          // Calculer stats de completion
          const completionStats = {
            totalTime: Math.floor((Date.now() - new Date(playerQuests.activeQuests.find((q: any) => q.questId === result.questId)?.startedAt || Date.now()).getTime()) / (60 * 1000)),
            stepsCompleted: definition.steps.length,
            objectivesCompleted: definition.steps.reduce((sum, step) => sum + step.objectives.length, 0)
          };

          await this.clientHandler.notifyQuestCompleted(username, quest, allRewards, completionStats);

          // ✨ COMPLÉTION DE QUÊTE
          if (result.autoCompleted) {
            await this.completeQuest(username, 
              playerQuests.activeQuests.find((q: any) => q.questId === result.questId), 
              definition, 
              playerQuests
            );
          } else {
            // Marquer comme prête à compléter
            const questProgress = playerQuests.activeQuests.find((q: any) => q.questId === result.questId);
            if (questProgress) {
              questProgress.status = 'readyToComplete';
            }
          }
          
          // ✨ CORRECTION : Mettre à jour le résultat avec récompenses converties
          if (result.questRewards) {
            result.questRewards = this.convertToLegacyRewards(result.questRewards);
          }
          if (result.stepRewards) {
            result.stepRewards = this.convertToLegacyRewards(result.stepRewards);
          }
        } else if (result.objectiveCompleted || result.stepCompleted) {
          // Notification de progression simple
          const objective = this.findCurrentObjective(definition, 
            playerQuests.activeQuests.find((q: any) => q.questId === result.questId)
          );
          if (objective) {
            await this.clientHandler.notifyQuestProgress(username, quest, objective, 0);
          }
        }
      }

      // ✅ SAUVEGARDER SI DES CHANGEMENTS
      if (results.length > 0) {
        await playerQuests.save();
        this.log('info', `💾 Sauvegarde des progressions de quête pour ${username}`);
      }

      return results;

    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur updateQuestProgress:`, error);
      return [];
    }
  }

  /**
   * ✨ REFACTORISÉ : Completion manuelle de quête
   */
  async completeQuestManually(username: string, questId: string): Promise<QuestUpdateResult | null> {
    try {
      this.log('info', `👤 [QuestManager] === COMPLETION MANUELLE QUÊTE ${questId} ===`);
      
      const playerQuests = await PlayerQuest.findOne({ username });
      if (!playerQuests) return null;

      const questProgress = playerQuests.activeQuests.find((q: any) => 
        q.questId === questId && q.status === 'readyToComplete'
      );
      
      if (!questProgress) {
        this.log('warn', `⚠️ Quête ${questId} non prête à compléter pour ${username}`);
        return null;
      }

      const definition = this.questDefinitions.get(questId);
      if (!definition) return null;

      // ✨ DISTRIBUER LES RÉCOMPENSES via service
      const questRewards = this.rewardDistributor.calculateFinalQuestRewards(definition);
      if (questRewards.length > 0) {
        await this.rewardDistributor.distributeRewards(username, questRewards);
      }

      // Marquer comme terminée
      await this.completeQuest(username, questProgress, definition, playerQuests);
      await playerQuests.save();

      // ✨ NOTIFICATION
      const quest = this.buildQuestFromProgress(definition, questProgress);
      const completionStats = {
        totalTime: Math.floor((Date.now() - questProgress.startedAt.getTime()) / (60 * 1000)),
        stepsCompleted: definition.steps.length,
        objectivesCompleted: definition.steps.reduce((sum, step) => sum + step.objectives.length, 0)
      };
      
      await this.clientHandler.notifyQuestCompleted(username, quest, questRewards, completionStats);

      return {
        questId: questId,
        questName: definition.name,
        questCompleted: true,
        autoCompleted: false,
        questRewards: this.convertToLegacyRewards(questRewards),
        message: `Félicitations ! Vous avez terminé "${definition.name}" !`
      };

    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur completeQuestManually:`, error);
      return null;
    }
  }

  // ===== MÉTHODES EXISTANTES CONSERVÉES =====

  /**
   * ✅ CONSERVÉ : Quêtes actives
   */
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

  /**
 * ✅ NOUVEAU : Récupère la quête la plus récemment terminée pour un NPC donné
 * @param username - Nom du joueur
 * @param npcId - ID du NPC (startNpcId ou endNpcId)
 * @param withinHours - Heures max depuis completion (défaut: 24h)
 * @returns La quête récemment terminée avec ses dialogues post-quête, ou null
 */
public async getRecentlyCompletedQuestByNpc(
  username: string, 
  npcId: number, 
  withinHours: number = 24
): Promise<{ questDefinition: any; completedAt: Date } | null> {
  try {
    this.log('debug', `🔍 Recherche quête récemment terminée pour NPC ${npcId} par ${username}`);
    
    // 1. Récupérer l'historique récent du joueur
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - withinHours);
    
    const playerQuests = await PlayerQuest.find({
      username,
      status: 'completed',
      completedAt: { $gte: cutoffTime }
    }).sort({ completedAt: -1 }); // Trier par plus récent d'abord
    
    if (playerQuests.length === 0) {
      this.log('debug', `❌ Aucune quête récemment terminée pour ${username}`);
      return null;
    }
    
    // 2. Chercher une quête terminée liée à ce NPC
    for (const playerQuest of playerQuests) {
      try {
        const questDefinition = this.getQuestDefinition(playerQuest.questId);
        
        if (!questDefinition) {
          this.log('warn', `⚠️ Définition manquante pour quête ${playerQuest.questId}`);
          continue;
        }
        
        // Vérifier si ce NPC est lié à cette quête (start ou end)
        const isRelatedNpc = questDefinition.startNpcId === npcId || questDefinition.endNpcId === npcId;
        
        if (isRelatedNpc && (questDefinition.dialogues as any)?.postQuestDialogue) {
          this.log('info', `✅ Quête post-dialogue trouvée: ${questDefinition.name} (terminée le ${playerQuest.completedAt})`);
          
          return {
            questDefinition,
            completedAt: playerQuest.completedAt
          };
        }
        
      } catch (error) {
        this.log('warn', `⚠️ Erreur vérification quête ${playerQuest.questId}:`, error);
        continue;
      }
    }
    
    this.log('debug', `❌ Aucune quête avec post-dialogue trouvée pour NPC ${npcId}`);
    return null;
    
  } catch (error) {
    this.log('error', `❌ Erreur recherche quête récente NPC ${npcId}:`, error);
    return null;
  }
}
  /**
   * ✅ CONSERVÉ : Construction quête depuis progression
   */
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

  /**
   * ✅ CONSERVÉ : Définition de quête
   */
  getQuestDefinition(questId: string): QuestDefinition | undefined {
    return this.questDefinitions.get(questId);
  }

  /**
   * ✅ CONSERVÉ : Quêtes par NPC
   */
  getQuestsForNpc(npcId: number): QuestDefinition[] {
    return Array.from(this.questDefinitions.values()).filter(
      quest => quest.startNpcId === npcId || quest.endNpcId === npcId
    );
  }

  /**
   * ✅ CONSERVÉ : Statut de quête
   */
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

  /**
   * ✅ CONSERVÉ : Quête prête à compléter
   */
  async isQuestReadyToComplete(username: string, questId: string): Promise<boolean> {
    const status = await this.getQuestStatus(username, questId);
    return status === 'readyToComplete';
  }

  // ===== NOUVELLES MÉTHODES SERVICE REGISTRY (CONSERVÉES) =====

  /**
   * ✅ CONSERVÉ : Donner une quête
   */
  async giveQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      this.log('info', `🎯 [QuestManager] Attribution quête ${questId} à ${playerName}`);
      
      const status = await this.getQuestStatus(playerName, questId);
      if (status !== 'available') {
        const message = `Quête ${questId} non disponible (statut: ${status})`;
        this.log('warn', `⚠️ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
      const quest = await this.startQuest(playerName, questId);
      
      if (quest) {
        // ✨ NOTIFICATION via service (déjà fait dans startQuest)
        this.log('info', `✅ [QuestManager] Quête ${questId} donnée à ${playerName}: ${quest.name}`);
        return { 
          success: true, 
          message: `Quête "${quest.name}" donnée avec succès !`,
          quest: quest
        };
      } else {
        const message = `Impossible de démarrer la quête ${questId}`;
        this.log('warn', `❌ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur giveQuest:`, error);
      return { success: false, message: "Erreur serveur lors de l'attribution de la quête" };
    }
  }

  /**
   * ✅ CONSERVÉ : Faire progresser une quête
   */
  async progressQuest(playerName: string, event: any): Promise<{ success: boolean; results: any[] }> {
    try {
      this.log('info', `📈 [QuestManager] Progression quête pour ${playerName}:`, event);
      
      const results = await this.updateQuestProgress(playerName, event);
      
      if (results && results.length > 0) {
        // ✨ NOTIFICATION via service (déjà fait dans updateQuestProgress)
        this.log('info', `✅ [QuestManager] ${results.length} progression(s) de quête pour ${playerName}`);
        return { success: true, results };
      } else {
        this.log('info', `ℹ️ [QuestManager] Aucune progression pour ${playerName}`);
        return { success: true, results: [] };
      }
      
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur progressQuest:`, error);
      return { success: false, results: [] };
    }
  }

  /**
   * ✅ CONSERVÉ : Vérifier le statut d'une quête
   */
  async checkQuestStatus(playerName: string, questId: string): Promise<string> {
    try {
      const status = await this.getQuestStatus(playerName, questId);
      this.log('debug', `🔍 [QuestManager] Statut de ${questId} pour ${playerName}: ${status}`);
      return status;
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur checkQuestStatus:`, error);
      return 'unavailable';
    }
  }

  /**
   * ✅ CONSERVÉ : Récupérer toutes les quêtes actives d'un joueur
   */
  async getPlayerActiveQuests(playerName: string): Promise<any[]> {
    try {
      const activeQuests = await this.getActiveQuests(playerName);
      this.log('debug', `📋 [QuestManager] ${activeQuests.length} quêtes actives pour ${playerName}`);
      return activeQuests;
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur getPlayerActiveQuests:`, error);
      return [];
    }
  }

  /**
   * ✅ CONSERVÉ : Récupérer toutes les quêtes disponibles d'un joueur
   */
  async getPlayerAvailableQuests(playerName: string): Promise<any[]> {
    try {
      const availableQuests = await this.getAvailableQuests(playerName);
      this.log('debug', `📋 [QuestManager] ${availableQuests.length} quêtes disponibles pour ${playerName}`);
      return availableQuests;
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur getPlayerAvailableQuests:`, error);
      return [];
    }
  }

  /**
   * ✅ CONSERVÉ : Compléter manuellement une quête
   */
  async completePlayerQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; rewards?: any[] }> {
    try {
      this.log('info', `🏆 [QuestManager] Completion manuelle de ${questId} pour ${playerName}`);
      
      const result = await this.completeQuestManually(playerName, questId);
      
      if (result) {
        // ✨ NOTIFICATION via service (déjà fait dans completeQuestManually)
        this.log('info', `✅ [QuestManager] Quête ${questId} complétée pour ${playerName}`);
        return { 
          success: true, 
          message: result.message || "Quête complétée !",
          rewards: result.questRewards
        };
      } else {
        const message = `Quête ${questId} non prête à être complétée`;
        this.log('warn', `⚠️ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur completeQuest:`, error);
      return { success: false, message: "Erreur lors de la completion de la quête" };
    }
  }

  // ===== MÉTHODES PRIVÉES HELPERS =====

  /**
   * ✨ NOUVEAU : Convertir récompenses étendues vers format legacy
   */
  private convertToLegacyRewards(rewards: any[]): QuestReward[] {
    return rewards.filter(reward => {
      // Ne garder que les types compatibles avec l'ancien système
      const legacyTypes = ['gold', 'item', 'pokemon', 'experience'];
      return legacyTypes.includes(reward.type);
    }).map(reward => ({
      type: reward.type as 'gold' | 'item' | 'pokemon' | 'experience',
      itemId: reward.itemId,
      amount: reward.amount,
      pokemonId: reward.pokemonId
    }));
  }

  /**
   * ✨ NOUVEAU : Trouver objectif par nom
   */
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

  /**
   * ✨ NOUVEAU : Trouver objectif actuel
   */
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

  /**
   * ✅ CONSERVÉ : Complétion de quête
   */
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

    this.log('info', `🎉 ${username} a terminé la quête: ${definition.name}`);
  }

  // ===== MÉTHODES D'ADMINISTRATION ÉTENDUES =====

  /**
   * ✨ ÉTENDU : Statistiques système avec services
   */
  getSystemStats() {
    const mongoCount = Array.from(this.questSourceMap.values()).filter(s => s === 'mongodb').length;
    const jsonCount = Array.from(this.questSourceMap.values()).filter(s => s === 'json').length;
    
    const questsByCategory: Record<string, number> = {};
    for (const quest of this.questDefinitions.values()) {
      questsByCategory[quest.category] = (questsByCategory[quest.category] || 0) + 1;
    }
    
    return {
      // ✅ STATS EXISTANTES
      totalQuests: this.questDefinitions.size,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      sources: {
        json: jsonCount,
        mongodb: mongoCount
      },
      questsByCategory,
      validationErrors: this.validationErrors.size,
      lastLoadTime: this.lastLoadTime,
      config: this.config,
      cache: {
        size: this.mongoCache.size,
        ttl: this.config.cacheTTL
      },
      hotReload: this.getHotReloadStatus(),
      
      // ✨ NOUVELLES STATS DES SERVICES
      services: {
        progressTracker: this.progressTracker.getDebugInfo(),
        validator: this.validator.getDebugInfo(),
        rewardDistributor: this.rewardDistributor.getDebugInfo(),
        clientHandler: this.clientHandler.getDebugInfo()
      }
    };
  }

  /**
   * ✨ ÉTENDU : Debug système avec services
   */
  debugSystem(): void {
    this.log('info', `🔍 [QuestManager] === DEBUG SYSTÈME MODULAIRE ===`);
    
    const stats = this.getSystemStats();
    this.log('info', `📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    this.log('info', `\n📦 Quêtes par ID (premières 10):`);
    let count = 0;
    for (const [questId, quest] of this.questDefinitions) {
      if (count >= 10) break;
      this.log('info', `  📜 ${questId}: ${quest.name} (${quest.category}) [${this.questSourceMap.get(questId)}]`);
      count++;
    }
    
    if (this.validationErrors.size > 0) {
      this.log('info', `\n❌ Erreurs de validation:`);
      for (const [questId, errors] of this.validationErrors.entries()) {
        this.log('info', `  🚫 Quête ${questId}: ${errors.join(', ')}`);
      }
    }

    this.log('info', `\n🔥 État Hot Reload:`);
    const hotReloadStatus = this.getHotReloadStatus();
    this.log('info', `  - Activé: ${hotReloadStatus.enabled}`);
    this.log('info', `  - Actif: ${hotReloadStatus.active}`);
    this.log('info', `  - Callbacks: ${hotReloadStatus.callbackCount}`);
    
    this.log('info', `\n⚙️ Configuration:`);
    this.log('info', `  - Source primaire: ${this.config.primaryDataSource}`);
    this.log('info', `  - Fallback activé: ${this.config.enableFallback}`);
    this.log('info', `  - Cache MongoDB: ${this.config.useMongoCache}`);
    this.log('info', `  - Initialisé: ${this.isInitialized}`);
    this.log('info', `  - En cours d'initialisation: ${this.isInitializing}`);
    
    this.log('info', `\n🔧 Services Modulaires:`);
    this.log('info', `  - QuestProgressTracker: ✅ Actif`);
    this.log('info', `  - QuestValidator: ✅ Actif`);
    this.log('info', `  - RewardDistributor: ✅ Actif`);
    this.log('info', `  - QuestClientHandler: ✅ Actif`);
  }

  /**
   * ✅ CONSERVÉ : Nettoyage
   */
  public cleanup(): void {
    this.log('info', '🧹 [QuestManager] Nettoyage...');
    
    // ✅ Nettoyage existant
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.questSourceMap.clear();
    this.validationErrors.clear();
    
    // Reset flags d'état
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    // ✨ NOUVEAU : Nettoyage des services
    if (this.clientHandler) {
      this.clientHandler.cleanup();
    }
    
    this.log('info', '✅ [QuestManager] Nettoyage terminé (services inclus)');
  }

  /**
   * ✅ CONSERVÉ : Logging
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'debug':
        if (this.config.debugMode) {
          console.log(logMessage, data || '');
        }
        break;
    }
  }
}
