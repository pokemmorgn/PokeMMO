// server/src/managers/QuestManager.ts - VERSION MONGODB AVEC HOT-RELOAD

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
import { ServiceRegistry } from "../services/ServiceRegistry";

// ===== ÉNUMÉRATION DES SOURCES DE DONNÉES =====
export enum QuestDataSource {
  JSON = 'json',
  MONGODB = 'mongodb',
  HYBRID = 'hybrid'
}

// ===== CONFIGURATION =====
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
  
  // ✅ NOUVEAUX FLAGS D'ÉTAT
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Propriétés MongoDB
  private mongoCache: Map<string, { data: QuestDefinition[]; timestamp: number }> = new Map();
  private questSourceMap: Map<string, 'json' | 'mongodb'> = new Map();
  private validationErrors: Map<string, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  // Hot Reload
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, questData?: any) => void> = [];
  
  // Configuration
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

  // ✅ CONSTRUCTEUR CORRIGÉ : Ne lance plus le chargement automatique
  constructor(questDataPath?: string, customConfig?: Partial<QuestManagerConfig>) {
    if (questDataPath) {
      this.config.questDataPath = questDataPath;
    }
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [QuestManager] Construction`, {
      primarySource: this.config.primaryDataSource,
      config: this.config
    });

    // ✅ IMPORTANT : Ne plus lancer le chargement ici !
    // Le chargement sera lancé par initialize() ou waitForLoad()
    
    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [QuestManager] Construit (pas encore initialisé)`, {
      totalQuests: this.questDefinitions.size,
      needsInitialization: true
    });
  }

  // ✅ NOUVELLE MÉTHODE : Initialisation asynchrone
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

  // ✅ MÉTHODE PRIVÉE : Logique d'initialisation
  private async performInitialization(): Promise<void> {
    try {
      this.log('info', `🔍 [QuestManager] Chargement selon stratégie: ${this.config.primaryDataSource}`);
      await this.loadQuestDefinitions();
    } catch (error) {
      this.log('error', `❌ [QuestManager] Erreur initialisation:`, error);
      throw error;
    }
  }

  // ✅ MÉTHODE CORRIGÉE : waitForLoad attend maintenant vraiment !
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

  // ✅ NOUVELLE MÉTHODE : Chargement des définitions depuis MongoDB
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

  // ✅ NOUVELLE MÉTHODE : Chargement MongoDB
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

  // ✅ MÉTHODE : Conversion MongoDB vers QuestDefinition
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

  // ✅ MÉTHODE : Ajout des quêtes à la collection
  private addQuestsToCollection(questDefinitions: QuestDefinition[], source: QuestDataSource): void {
    for (const quest of questDefinitions) {
      this.questDefinitions.set(quest.id, quest);
      this.questSourceMap.set(quest.id, source === QuestDataSource.MONGODB ? 'mongodb' : 'json');
    }
  }

  // ✅ MÉTHODE : Chargement JSON (version existante)
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

  // ✅ PING MONGODB INTELLIGENT
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

  // ✅ HOT RELOAD METHODS
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

  private notifyReloadCallbacks(event: string, questData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, questData);
      } catch (error) {
        this.log('error', '❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  // ✅ MÉTHODES PUBLIQUES HOT RELOAD
  public onQuestChange(callback: (event: string, questData?: any) => void): void {
    this.reloadCallbacks.push(callback);
    this.log('info', `📋 [HotReload] Callback enregistré (total: ${this.reloadCallbacks.length})`);
  }

  public stopHotReload(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      this.log('info', '🛑 [HotReload] Change Streams arrêté');
    }
  }

  public getHotReloadStatus(): { enabled: boolean; active: boolean; callbackCount: number } {
    return {
      enabled: this.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  // ✅ MÉTHODES CACHE
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

  // ✅ MÉTHODE DE VALIDATION
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

  // ✅ MÉTHODES PUBLIQUES MONGODB
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

  async syncQuestsToMongoDB(): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      const questsToSync = Array.from(this.questDefinitions.values()).filter(quest => 
        this.questSourceMap.get(quest.id) !== 'mongodb'
      );
      
      this.log('info', `🔄 [Sync] Synchronisation ${questsToSync.length} quêtes vers MongoDB...`);
      
      for (const quest of questsToSync) {
        try {
          let mongoDoc = await QuestData.findOne({ questId: quest.id });
          
          if (mongoDoc) {
            await mongoDoc.updateFromJson(quest);
            results.success++;
          } else {
            mongoDoc = await QuestData.createFromJson(quest);
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

  public cleanup(): void {
    this.log('info', '🧹 [QuestManager] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.questSourceMap.clear();
    this.validationErrors.clear();
    
    // Reset flags d'état
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [QuestManager] Nettoyage terminé');
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
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
    }
  }

  // ✅ === MÉTHODES EXISTANTES CONSERVÉES ===

  async handlePlayerReconnection(username: string): Promise<{ resetOccurred: boolean; message?: string }> {
  try {
    const { getServerConfig } = require("../config/serverConfig");
    const serverConfig = getServerConfig();
    
    console.log(`🔄 [QuestManager] Gestion reconnexion pour ${username}`);
    console.log(`⚙️ [QuestManager] autoresetQuest: ${serverConfig.autoresetQuest}`);
    
    if (!serverConfig.autoresetQuest) {
      console.log(`ℹ️ [QuestManager] Auto-reset désactivé, aucune action`);
      return { resetOccurred: false };
    }

    // Récupérer les quêtes du joueur
    const playerQuests = await PlayerQuest.findOne({ username });
    if (!playerQuests) {
      console.log(`ℹ️ [QuestManager] Aucune quête trouvée pour ${username}`);
      return { resetOccurred: false };
    }

    // Compter les quêtes actives avant reset
    const activeQuestsCount = playerQuests.activeQuests?.length || 0;
    
    if (activeQuestsCount === 0) {
      console.log(`ℹ️ [QuestManager] Aucune quête active à reset pour ${username}`);
      return { resetOccurred: false };
    }

    // ✅ SUPPRIMER TOUTES LES QUÊTES ACTIVES
    console.log(`🗑️ [QuestManager] Suppression de ${activeQuestsCount} quête(s) active(s) pour ${username}`);
    
    playerQuests.activeQuests = [];
    await playerQuests.save();
    
    console.log(`✅ [QuestManager] Auto-reset effectué pour ${username}: ${activeQuestsCount} quête(s) supprimée(s)`);
    
    return { 
      resetOccurred: true, 
      message: `Auto-reset effectué: ${activeQuestsCount} quête(s) supprimée(s)` 
    };

  } catch (error) {
    console.error(`❌ [QuestManager] Erreur lors de l'auto-reset pour ${username}:`, error);
    return { resetOccurred: false, message: "Erreur lors de l'auto-reset" };
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
    
    // ✅ CORRECTION: Créer les objectifs avec currentAmount = 0 et completed = false
    for (const objective of firstStep.objectives) {
      objectivesMap.set(objective.id, {
        currentAmount: 0,
        completed: false // ✅ IMPORTANT: Pas encore complété !
      });
      console.log(`📋 Objectif créé: ${objective.id} (${objective.type}) - Non complété`);
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
    console.log(`📋 Objectifs de la première étape créés et prêts à être validés`);
    
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
    const autoComplete = definition.autoComplete !== false; // Par défaut true si non défini
    
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
    
    const registry = ServiceRegistry.getInstance();
    
    for (const reward of rewards) {
      try {
        const success = await registry.distributeReward(username, reward);
        if (!success) {
          console.warn(`⚠️ [QuestManager] Échec distribution récompense ${reward.type} pour ${username}`);
        }
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur distribution récompense:`, error);
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

  // ✅ === NOUVELLES MÉTHODES PUBLIQUES POUR SERVICE REGISTRY ===

  /**
   * Donner une quête à un joueur (utilisable depuis n'importe où)
   */
  async giveQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    try {
      console.log(`🎯 [QuestManager] Attribution quête ${questId} à ${playerName}`);
      
      // Vérifier si la quête est disponible
      const status = await this.getQuestStatus(playerName, questId);
      if (status !== 'available') {
        const message = `Quête ${questId} non disponible (statut: ${status})`;
        console.log(`⚠️ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
      // Démarrer la quête
      const quest = await this.startQuest(playerName, questId);
      
      if (quest) {
        // Notifier le joueur via ServiceRegistry
        const registry = ServiceRegistry.getInstance();
        registry.notifyPlayer(playerName, "questGranted", {
          questId: questId,
          questName: quest.name,
          message: `🎁 Nouvelle quête : ${quest.name} !`
        });
        
        console.log(`✅ [QuestManager] Quête ${questId} donnée à ${playerName}: ${quest.name}`);
        return { 
          success: true, 
          message: `Quête "${quest.name}" donnée avec succès !`,
          quest: quest
        };
      } else {
        const message = `Impossible de démarrer la quête ${questId}`;
        console.log(`❌ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur giveQuest:`, error);
      return { success: false, message: "Erreur serveur lors de l'attribution de la quête" };
    }
  }

  /**
   * Faire progresser une quête (utilisable depuis n'importe où)
   */
  async progressQuest(playerName: string, event: any): Promise<{ success: boolean; results: any[] }> {
    try {
      console.log(`📈 [QuestManager] Progression quête pour ${playerName}:`, event);
      
      const results = await this.updateQuestProgress(playerName, event);
      
      if (results && results.length > 0) {
        // Notifier le joueur des progressions
        const registry = ServiceRegistry.getInstance();
        registry.notifyPlayer(playerName, "questProgressUpdate", results);
        
        console.log(`✅ [QuestManager] ${results.length} progression(s) de quête pour ${playerName}`);
        return { success: true, results };
      } else {
        console.log(`ℹ️ [QuestManager] Aucune progression pour ${playerName}`);
        return { success: true, results: [] };
      }
      
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur progressQuest:`, error);
      return { success: false, results: [] };
    }
  }

  /**
   * Vérifier le statut d'une quête (utilisable depuis n'importe où)
   */
  async checkQuestStatus(playerName: string, questId: string): Promise<string> {
    try {
      const status = await this.getQuestStatus(playerName, questId);
      console.log(`🔍 [QuestManager] Statut de ${questId} pour ${playerName}: ${status}`);
      return status;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur checkQuestStatus:`, error);
      return 'unavailable';
    }
  }

  /**
   * Récupérer toutes les quêtes actives d'un joueur (utilisable depuis n'importe où)
   */
  async getPlayerActiveQuests(playerName: string): Promise<any[]> {
    try {
      const activeQuests = await this.getActiveQuests(playerName);
      console.log(`📋 [QuestManager] ${activeQuests.length} quêtes actives pour ${playerName}`);
      return activeQuests;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur getPlayerActiveQuests:`, error);
      return [];
    }
  }

  /**
   * Récupérer toutes les quêtes disponibles d'un joueur (utilisable depuis n'importe où)
   */
  async getPlayerAvailableQuests(playerName: string): Promise<any[]> {
    try {
      const availableQuests = await this.getAvailableQuests(playerName);
      console.log(`📋 [QuestManager] ${availableQuests.length} quêtes disponibles pour ${playerName}`);
      return availableQuests;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur getPlayerAvailableQuests:`, error);
      return [];
    }
  }

  /**
   * Compléter manuellement une quête (utilisable depuis n'importe où)
   */
  async completePlayerQuest(playerName: string, questId: string): Promise<{ success: boolean; message: string; rewards?: any[] }> {
    try {
      console.log(`🏆 [QuestManager] Completion manuelle de ${questId} pour ${playerName}`);
      
      const result = await this.completeQuestManually(playerName, questId);
      
      if (result) {
        // Notifier le joueur
        const registry = ServiceRegistry.getInstance();
        registry.notifyPlayer(playerName, "questCompleted", {
          questId: questId,
          questName: result.questName,
          message: result.message,
          rewards: result.questRewards
        });
        
        console.log(`✅ [QuestManager] Quête ${questId} complétée pour ${playerName}`);
        return { 
          success: true, 
          message: result.message || "Quête complétée !",
          rewards: result.questRewards
        };
      } else {
        const message = `Quête ${questId} non prête à être complétée`;
        console.log(`⚠️ [QuestManager] ${message}`);
        return { success: false, message };
      }
      
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur completeQuest:`, error);
      return { success: false, message: "Erreur lors de la completion de la quête" };
    }
  }

  // ✅ === MÉTHODES D'ADMINISTRATION ===

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
      hotReload: this.getHotReloadStatus()
    };
  }

  debugSystem(): void {
    console.log(`🔍 [QuestManager] === DEBUG SYSTÈME QUÊTES AVEC HOT RELOAD ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 Quêtes par ID (premières 10):`);
    let count = 0;
    for (const [questId, quest] of this.questDefinitions) {
      if (count >= 10) break;
      console.log(`  📜 ${questId}: ${quest.name} (${quest.category}) [${this.questSourceMap.get(questId)}]`);
      count++;
    }
    
    if (this.validationErrors.size > 0) {
      console.log(`\n❌ Erreurs de validation:`);
      for (const [questId, errors] of this.validationErrors.entries()) {
        console.log(`  🚫 Quête ${questId}: ${errors.join(', ')}`);
      }
    }

    console.log(`\n🔥 État Hot Reload:`);
    const hotReloadStatus = this.getHotReloadStatus();
    console.log(`  - Activé: ${hotReloadStatus.enabled}`);
    console.log(`  - Actif: ${hotReloadStatus.active}`);
    console.log(`  - Callbacks: ${hotReloadStatus.callbackCount}`);
    
    console.log(`\n⚙️ Configuration:`);
    console.log(`  - Source primaire: ${this.config.primaryDataSource}`);
    console.log(`  - Fallback activé: ${this.config.enableFallback}`);
    console.log(`  - Cache MongoDB: ${this.config.useMongoCache}`);
    console.log(`  - Initialisé: ${this.isInitialized}`);
    console.log(`  - En cours d'initialisation: ${this.isInitializing}`);
  }
}
