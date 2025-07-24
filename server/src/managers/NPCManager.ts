// PokeMMO/server/src/managers/NPCManager.ts
// Version corrigée : Synchronisation waitForLoad() + autoLoadFromMongoDB() + Zone fixing

import fs from "fs";
import path from "path";
import { NpcData } from "../models/NpcData";
import { 
  AnyNpc, 
  NpcZoneData, 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

// ✅ ÉNUMÉRATION DES SOURCES DE DONNÉES
export enum NpcDataSource {
  JSON = 'json', 
  MONGODB = 'mongodb',
  HYBRID = 'hybrid'
}

// ✅ INTERFACE ÉTENDUE (corrigée avec zone)
export interface NpcData {
  // === PROPRIÉTÉS EXISTANTES ===
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties: Record<string, any>;
  
  // ✅ AJOUT CRITIQUE: Zone du NPC (pour MongoDB et JSON)
  zone?: string;
  
  // === PROPRIÉTÉS JSON ===
  type?: NpcType;
  position?: { x: number; y: number };
  direction?: Direction;
  interactionRadius?: number;
  canWalkAway?: boolean;
  autoFacePlayer?: boolean;
  repeatable?: boolean;
  cooldownSeconds?: number;
  
  // Système de traduction
  dialogueIds?: string[];
  dialogueId?: string;
  conditionalDialogueIds?: Record<string, string[]>;
  
  // Système quêtes
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: Record<string, any>;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  // Propriétés spécialisées selon type
  shopId?: string;
  shopType?: string;
  shopDialogueIds?: Record<string, string[]>;
  shopConfig?: Record<string, any>;
  
  trainerId?: string;
  trainerClass?: string;
  battleConfig?: Record<string, any>;
  battleDialogueIds?: Record<string, string[]>;
  
  healerConfig?: Record<string, any>;
  healerDialogueIds?: Record<string, string[]>;
  
  gymConfig?: Record<string, any>;
  gymDialogueIds?: Record<string, string[]>;
  
  transportConfig?: Record<string, any>;
  destinations?: any[];
  transportDialogueIds?: Record<string, string[]>;
  
  serviceConfig?: Record<string, any>;
  serviceDialogueIds?: Record<string, string[]>;
  
  minigameConfig?: Record<string, any>;
  contestDialogueIds?: Record<string, string[]>;
  
  researchConfig?: Record<string, any>;
  researchDialogueIds?: Record<string, string[]>;
  
  guildConfig?: Record<string, any>;
  guildDialogueIds?: Record<string, string[]>;
  
  eventConfig?: Record<string, any>;
  eventDialogueIds?: Record<string, string[]>;
  
  questMasterConfig?: Record<string, any>;
  questMasterDialogueIds?: Record<string, string[]>;
  
  // Conditions d'apparition
  spawnConditions?: {
    timeOfDay?: string[] | null;
    weather?: string[] | null;
    minPlayerLevel?: number | null;
    maxPlayerLevel?: number | null;
    requiredFlags?: string[];
    forbiddenFlags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  
  // Métadonnées source
  sourceType?: 'json' | 'mongodb';
  sourceFile?: string;
  lastLoaded?: number;
  
  // Support MongoDB
  isActive?: boolean;
  mongoDoc?: any;
}

// ✅ CONFIGURATION
interface NpcManagerConfig {
  primaryDataSource: NpcDataSource;
  useMongoCache: boolean;
  cacheTTL: number;
  enableFallback: boolean;
  
  npcDataPath: string;
  autoLoadJSON: boolean;
  strictValidation: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
}

export class NpcManager {
  npcs: NpcData[] = [];
  
  // ✅ NOUVEAUX FLAGS D'ÉTAT
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Propriétés existantes
  private loadedZones: Set<string> = new Set();
  private npcSourceMap: Map<number, 'json' | 'mongodb'> = new Map();
  private validationErrors: Map<number, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  // Propriétés MongoDB
  private mongoCache: Map<string, { data: NpcData[]; timestamp: number }> = new Map();
  private npcSourceMapExtended: Map<number, NpcDataSource> = new Map();
  
  // Hot Reload
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, npcData?: any) => void> = [];
  
  // Configuration
  private config: NpcManagerConfig = {
    primaryDataSource: NpcDataSource.MONGODB,
    useMongoCache: process.env.NPC_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.NPC_CACHE_TTL || '1800000'),
    enableFallback: process.env.NPC_FALLBACK !== 'false',
    
    npcDataPath: './build/data/npcs',
    autoLoadJSON: true,
    strictValidation: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    cacheEnabled: true
  };

  // ✅ CONSTRUCTEUR CORRIGÉ : Ne lance plus le chargement automatique
  constructor(zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [NpcManager] Construction`, {
      zoneName,
      primarySource: this.config.primaryDataSource,
      autoScan: !zoneName,
      config: this.config
    });

    // ✅ IMPORTANT : Ne plus lancer le chargement ici !
    // Le chargement sera lancé par initialize() ou waitForLoad()
    
    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [NpcManager] Construit (pas encore initialisé)`, {
      totalNpcs: this.npcs.length,
      needsInitialization: true
    });
  }

  // ✅ NOUVELLE MÉTHODE : Initialisation asynchrone
  async initialize(zoneName?: string): Promise<void> {
    // Éviter les initialisations multiples
    if (this.isInitialized) {
      this.log('info', `♻️ [NpcManager] Déjà initialisé`);
      return;
    }
    
    if (this.isInitializing) {
      this.log('info', `⏳ [NpcManager] Initialisation en cours, attente...`);
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    this.log('info', `🔄 [NpcManager] Démarrage initialisation asynchrone...`);
    
    // Créer la promesse d'initialisation
    this.initializationPromise = this.performInitialization(zoneName);
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.log('info', `✅ [NpcManager] Initialisation terminée avec succès`, {
        totalNpcs: this.npcs.length,
        zones: Array.from(this.loadedZones)
      });
    } catch (error) {
      this.log('error', `❌ [NpcManager] Erreur lors de l'initialisation:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // ✅ MÉTHODE PRIVÉE : Logique d'initialisation
  private async performInitialization(zoneName?: string): Promise<void> {
    try {
      if (zoneName) {
        // Mode spécifique
        this.log('info', `🎯 [NpcManager] Mode spécifique: ${zoneName}`);
        await this.loadNpcsForZone(zoneName);
      } else {
        // Mode auto-scan
        this.log('info', `🔍 [NpcManager] Mode auto-scan activé`);
        await this.autoLoadAllZonesSync(); // ✅ Version synchrone !
      }
    } catch (error) {
      this.log('error', `❌ [NpcManager] Erreur initialisation:`, error);
      throw error;
    }
  }

  // ✅ MÉTHODE CORRIGÉE : waitForLoad attend maintenant vraiment !
  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente du chargement des NPCs (timeout: ${timeoutMs}ms)...`);
    
    // ✅ ÉTAPE 1: S'assurer que l'initialisation est lancée
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [WaitForLoad] Lancement de l'initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    // ✅ ÉTAPE 2: Attendre que l'initialisation se termine
    while ((!this.isInitialized || this.npcs.length === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.npcs.length > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] NPCs chargés: ${this.npcs.length} NPCs en ${loadTime}ms`);
      this.log('info', `🗺️  [WaitForLoad] Zones chargées: ${Array.from(this.loadedZones).join(', ')}`);
      
      // ✅ DÉMARRER HOT RELOAD après chargement réussi
      if (this.config.primaryDataSource === NpcDataSource.MONGODB && this.hotReloadEnabled) {
        this.startHotReload();
      }
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms, initialisé: ${this.isInitialized}, NPCs: ${this.npcs.length}`);
    }
    
    return loaded;
  }

  // ✅ VERSION SYNCHRONE d'autoLoadAllZones
  private async autoLoadAllZonesSync(): Promise<void> {
    this.log('info', `📂 [NpcManager] Auto-scan synchrone avec source: ${this.config.primaryDataSource}...`);
    
    if (this.config.primaryDataSource === NpcDataSource.MONGODB || 
        this.config.primaryDataSource === NpcDataSource.HYBRID) {
      // ✅ MongoDB en mode synchrone (await)
      try {
        await this.autoLoadFromMongoDB();
      } catch (error) {
        this.log('error', 'Erreur auto-scan MongoDB:', error);
        if (this.config.enableFallback) {
          this.log('info', 'Fallback vers scan JSON');
          this.autoLoadFromFiles();
        } else {
          throw error;
        }
      }
    } else {
      // Scan des fichiers JSON
      this.autoLoadFromFiles();
    }
  }

  // ✅ MÉTHODE HOT RELOAD (inchangée)
  private startHotReload(): void {
    try {
      this.log('info', '🔥 [HotReload] Démarrage MongoDB Change Streams...');
      
      this.changeStream = NpcData.watch([], { 
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

  // ✅ MÉTHODES HOT RELOAD (corrigées avec zones)
  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      this.log('info', `🔥 [HotReload] Changement détecté: ${change.operationType}`);
      
      switch (change.operationType) {
        case 'insert':
          await this.handleNpcInsert(change.fullDocument);
          break;
          
        case 'update':
          await this.handleNpcUpdate(change.fullDocument);
          break;
          
        case 'delete':
          await this.handleNpcDelete(change.documentKey._id);
          break;
          
        case 'replace':
          await this.handleNpcUpdate(change.fullDocument);
          break;
          
        default:
          this.log('info', `ℹ️ [HotReload] Opération ignorée: ${change.operationType}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur traitement changement:', error);
    }
  }

  private async handleNpcInsert(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      
      this.npcs.push(npcData);
      this.npcSourceMap.set(npcData.id, 'mongodb');
      this.npcSourceMapExtended.set(npcData.id, NpcDataSource.MONGODB);
      this.loadedZones.add(zoneName);
      this.mongoCache.delete(zoneName);
      
      this.log('info', `➕ [HotReload] NPC ajouté: ${npcData.name} (ID: ${npcData.id}) dans ${zoneName}`);
      this.notifyReloadCallbacks('insert', npcData);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur ajout NPC:', error);
    }
  }

  private async handleNpcUpdate(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      
      const existingIndex = this.npcs.findIndex(npc => npc.id === npcData.id);
      if (existingIndex >= 0) {
        this.npcs[existingIndex] = npcData;
        this.log('info', `🔄 [HotReload] NPC mis à jour: ${npcData.name} (ID: ${npcData.id}) dans ${zoneName}`);
      } else {
        this.npcs.push(npcData);
        this.npcSourceMap.set(npcData.id, 'mongodb');
        this.npcSourceMapExtended.set(npcData.id, NpcDataSource.MONGODB);
        this.log('info', `➕ [HotReload] NPC ajouté (via update): ${npcData.name} (ID: ${npcData.id}) dans ${zoneName}`);
      }
      
      this.mongoCache.delete(zoneName);
      this.loadedZones.add(zoneName);
      this.notifyReloadCallbacks('update', npcData);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur modification NPC:', error);
    }
  }

  private async handleNpcDelete(documentId: any): Promise<void> {
    try {
      const npcIndex = this.npcs.findIndex(npc => npc.mongoDoc && npc.mongoDoc._id.equals(documentId));
      
      if (npcIndex >= 0) {
        const deletedNpc = this.npcs[npcIndex];
        const zoneName = this.extractZoneFromNpc(deletedNpc);
        
        this.npcs.splice(npcIndex, 1);
        this.npcSourceMap.delete(deletedNpc.id);
        this.npcSourceMapExtended.delete(deletedNpc.id);
        this.mongoCache.delete(zoneName);
        
        this.log('info', `➖ [HotReload] NPC supprimé: ${deletedNpc.name} (ID: ${deletedNpc.id}) de ${zoneName}`);
        this.notifyReloadCallbacks('delete', deletedNpc);
        
      } else {
        this.log('warn', `⚠️ [HotReload] NPC à supprimer non trouvé: ${documentId}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur suppression NPC:', error);
    }
  }

  private notifyReloadCallbacks(event: string, npcData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, npcData);
      } catch (error) {
        this.log('error', '❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  // ✅ MÉTHODES PUBLIQUES HOT RELOAD
  public onNpcChange(callback: (event: string, npcData?: any) => void): void {
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

  // ✅ MÉTHODES EXISTANTES (inchangées) - Chargement MongoDB
  private async loadNpcsForZone(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    this.log('info', `🎯 [Zone: ${zoneName}] Chargement selon stratégie: ${this.config.primaryDataSource}`);
    
    try {
      switch (this.config.primaryDataSource) {
        case NpcDataSource.MONGODB:
          await this.loadNpcsFromMongoDB(zoneName);
          break;
          
        case NpcDataSource.JSON:
          this.loadNpcsFromJSON(zoneName);
          break;
          
        case NpcDataSource.HYBRID:
          try {
            await this.loadNpcsFromMongoDB(zoneName);
          } catch (mongoError) {
            this.log('warn', `⚠️  [Hybrid] MongoDB échoué pour ${zoneName}, fallback JSON`);
            this.loadNpcsFromJSON(zoneName);
          }
          break;
      }
      
      const loadTime = Date.now() - startTime;
      this.log('info', `✅ [Zone: ${zoneName}] Chargé en ${loadTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [Zone: ${zoneName}] Erreur de chargement:`, error);
      throw error;
    }
  }

  private async loadNpcsFromMongoDB(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.config.useMongoCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.log('info', `💾 [MongoDB Cache] Zone ${zoneName} trouvée en cache`);
          this.addNpcsToCollection(cached, NpcDataSource.MONGODB);
          return;
        }
      }
      
      this.log('info', `🗄️  [MongoDB] Chargement zone ${zoneName}...`);
      
      const mongoNpcs = await NpcData.findByZone(zoneName);
      
      const npcsData: NpcData[] = mongoNpcs.map(mongoDoc => 
        this.convertMongoDocToNpcData(mongoDoc, zoneName)
      );
      
      this.addNpcsToCollection(npcsData, NpcDataSource.MONGODB);
      
      if (this.config.useMongoCache) {
        this.setCache(zoneName, npcsData);
      }
      
      this.loadedZones.add(zoneName);
      
      const queryTime = Date.now() - startTime;
      this.log('info', `✅ [MongoDB] Zone ${zoneName}: ${npcsData.length} NPCs chargés en ${queryTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur chargement zone ${zoneName}:`, error);
      
      if (this.config.enableFallback) {
        this.log('info', `🔄 [Fallback] Tentative chargement JSON pour ${zoneName}`);
        this.loadNpcsFromJSON(zoneName);
      } else {
        throw error;
      }
    }
  }

// ✅ MÉTHODE CORRIGÉE : convertMongoDocToNpcData avec zone fixée
private convertMongoDocToNpcData(mongoDoc: any, zoneName: string): NpcData {
  try {
    // ✅ GESTION : Objet Mongoose VS objet brut des Change Streams
    let npcFormat: any;
    
    if (typeof mongoDoc.toNpcFormat === 'function') {
      // Document Mongoose complet avec méthodes
      npcFormat = mongoDoc.toNpcFormat();
    } else {
      // ✅ NOUVEAU : Objet brut des Change Streams - conversion manuelle
      npcFormat = {
        id: mongoDoc.npcId,
        name: mongoDoc.name,
        type: mongoDoc.type,
        position: mongoDoc.position || { x: 0, y: 0 },
        direction: mongoDoc.direction || 'south',
        sprite: mongoDoc.sprite || 'npc_default',
        interactionRadius: mongoDoc.interactionRadius || 32,
        canWalkAway: mongoDoc.canWalkAway || false,
        autoFacePlayer: mongoDoc.autoFacePlayer !== false,
        repeatable: mongoDoc.repeatable !== false,
        cooldownSeconds: mongoDoc.cooldownSeconds || 0,
        spawnConditions: mongoDoc.spawnConditions,
        questsToGive: mongoDoc.questsToGive || [],
        questsToEnd: mongoDoc.questsToEnd || [],
        questRequirements: mongoDoc.questRequirements,
        questDialogueIds: mongoDoc.questDialogueIds,
        
        // Fusionner les données spécifiques du type
        ...mongoDoc.npcData
      };
    }
    
    return {
      // ✅ COMPATIBLE avec ton système existant
      id: npcFormat.id,
      name: npcFormat.name,
      sprite: npcFormat.sprite,
      x: npcFormat.position.x,
      y: npcFormat.position.y,
      properties: {}, // Vide pour MongoDB, tout est structuré
      
      // ✅ AJOUT CRITIQUE: Stockage explicite de la zone
      zone: zoneName,
      
      // Propriétés étendues
      type: npcFormat.type,
      position: npcFormat.position,
      direction: npcFormat.direction,
      interactionRadius: npcFormat.interactionRadius,
      canWalkAway: npcFormat.canWalkAway,
      autoFacePlayer: npcFormat.autoFacePlayer,
      repeatable: npcFormat.repeatable,
      cooldownSeconds: npcFormat.cooldownSeconds,
      spawnConditions: npcFormat.spawnConditions,
      questsToGive: npcFormat.questsToGive,
      questsToEnd: npcFormat.questsToEnd,
      questRequirements: npcFormat.questRequirements,
      questDialogueIds: npcFormat.questDialogueIds,
      
      // Données spécialisées (fusionnées depuis npcData)
      ...(mongoDoc.npcData || {}),
      
      // Métadonnées
      sourceType: 'mongodb',
      sourceFile: mongoDoc.sourceFile,
      lastLoaded: Date.now(),
      isActive: mongoDoc.isActive,
      mongoDoc: mongoDoc // Référence pour updates
    };
    
  } catch (error) {
    this.log('error', '❌ [convertMongoDocToNpcData] Erreur conversion:', error);
    this.log('info', '📄 [convertMongoDocToNpcData] mongoDoc:', {
      _id: mongoDoc._id,
      npcId: mongoDoc.npcId,
      name: mongoDoc.name,
      zone: mongoDoc.zone,
      hasToNpcFormat: typeof mongoDoc.toNpcFormat === 'function'
    });
    throw error;
  }
}

  private addNpcsToCollection(npcsData: NpcData[], source: NpcDataSource): void {
    for (const npc of npcsData) {
      const existingIndex = this.npcs.findIndex(existing => 
        existing.id === npc.id
      );
      
      if (existingIndex >= 0) {
        this.npcs[existingIndex] = npc;
      } else {
        this.npcs.push(npc);
      }
      
      this.npcSourceMap.set(npc.id, npc.sourceType as 'json' | 'mongodb');
      this.npcSourceMapExtended.set(npc.id, source);
    }
  }

  // ✅ PING MONGODB INTELLIGENT (inchangé)
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
        
        const rawCount = await mongoose.connection.db.collection('npc_data').countDocuments();
        this.log('info', `📊 [MongoDB Ping] NPCs collection brute: ${rawCount}`);
        
        const testCount = await NpcData.countDocuments();
        this.log('info', `📊 [MongoDB Ping] NPCs via modèle: ${testCount}`);
        
        if (rawCount !== testCount) {
          this.log('warn', `⚠️ [MongoDB Ping] Différence détectée ! Raw: ${rawCount}, Modèle: ${testCount}`);
          
          const rawSample = await mongoose.connection.db.collection('npc_data').findOne();
          this.log('info', `📄 [MongoDB Ping] Exemple brut:`, rawSample ? {
            _id: rawSample._id,
            npcId: rawSample.npcId,
            zone: rawSample.zone,
            name: rawSample.name
          } : 'Aucun');
        }
        
        this.log('info', `✅ [MongoDB Ping] Succès ! ${testCount} NPCs détectés via modèle`);
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

  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      this.log('info', '🗄️  [Auto-scan MongoDB] Vérification connectivité...');
      
      await this.waitForMongoDBReady();
      
      const zones = await NpcData.distinct('zone');
      
      this.log('info', `📋 [MongoDB] ${zones.length} zones trouvées: ${zones.join(', ')}`);
      
      for (const zoneName of zones) {
        try {
          await this.loadNpcsForZone(zoneName);
        } catch (error) {
          this.log('warn', `⚠️ Erreur zone MongoDB ${zoneName}:`, error);
        }
      }
      
      this.log('info', `🎉 [Auto-scan MongoDB] Terminé: ${this.npcs.length} NPCs chargés`);
      
    } catch (error) {
      this.log('error', '❌ [Auto-scan MongoDB] Erreur:', error);
      throw error;
    }
  }

  // ✅ MÉTHODES CACHE
  private getFromCache(zoneName: string): NpcData[] | null {
    const cached = this.mongoCache.get(zoneName);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.mongoCache.delete(zoneName);
      return null;
    }
    
    return cached.data;
  }

  private setCache(zoneName: string, data: NpcData[]): void {
    this.mongoCache.set(zoneName, {
      data: [...data],
      timestamp: Date.now()
    });
  }

  // ✅ MÉTHODES JSON (corrigées avec zone)
  loadNpcsFromJSON(zoneName: string): void {
    try {
      const jsonPath = path.resolve(this.config.npcDataPath, `${zoneName}.json`);
      
      this.log('info', `📄 [JSON] Chargement NPCs depuis: ${jsonPath}`);
      
      if (!fs.existsSync(jsonPath)) {
        this.log('warn', `📁 [JSON] Fichier introuvable: ${jsonPath}`);
        
        if (this.config.autoLoadJSON) {
          this.log('info', `📁 [JSON] Création dossier: ${path.dirname(jsonPath)}`);
          fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
        }
        return;
      }

      const jsonData: NpcZoneData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      this.log('info', `📖 [JSON] Données lues:`, {
        zone: jsonData.zone,
        version: jsonData.version,
        npcCount: jsonData.npcs?.length || 0
      });

      if (!jsonData.npcs || !Array.isArray(jsonData.npcs)) {
        this.log('warn', `⚠️ [JSON] Aucun NPC dans ${zoneName}.json`);
        return;
      }

      let jsonNpcCount = 0;
      let validationErrors = 0;

      for (const npcJson of jsonData.npcs) {
        try {
          if (this.config.strictValidation) {
            const validation = this.validateNpcJson(npcJson);
            if (!validation.valid) {
              this.validationErrors.set(npcJson.id, validation.errors || []);
              this.log('error', `❌ [JSON] NPC ${npcJson.id} invalide:`, validation.errors);
              validationErrors++;
              continue;
            }
          }

          const npcData = this.convertJsonToNpcData(npcJson, zoneName, jsonPath);
          
          const existingNpc = this.npcs.find(n => n.id === npcJson.id);
          if (existingNpc) {
            this.log('warn', `⚠️ [JSON] Conflit ID ${npcJson.id}: ${existingNpc.sourceType} vs JSON`);
            
            const index = this.npcs.findIndex(n => n.id === npcJson.id);
            this.npcs[index] = npcData;
            this.npcSourceMap.set(npcJson.id, 'json');
            this.npcSourceMapExtended.set(npcJson.id, NpcDataSource.JSON);
          } else {
            this.npcs.push(npcData);
            this.npcSourceMap.set(npcJson.id, 'json');
            this.npcSourceMapExtended.set(npcJson.id, NpcDataSource.JSON);
          }
          
          jsonNpcCount++;
          
        } catch (npcError) {
          this.log('error', `❌ [JSON] Erreur NPC ${npcJson.id}:`, npcError);
          validationErrors++;
        }
      }
      
      this.loadedZones.add(zoneName);
      
      this.log('info', `✅ [JSON] Zone ${zoneName} chargée:`, {
        npcsLoaded: jsonNpcCount,
        validationErrors,
        totalNpcs: this.npcs.length
      });
      
    } catch (error) {
      this.log('error', `❌ [JSON] Erreur chargement ${zoneName}.json:`, error);
      throw error;
    }
  }

  private autoLoadFromFiles(): void {
    const jsonZones = this.scanNpcJsonFiles();
    
    this.log('info', `🎯 [NpcManager] ${jsonZones.size} zones JSON détectées`);
    
    jsonZones.forEach(zoneName => {
      try {
        this.loadNpcsFromJSON(zoneName);
      } catch (error) {
        this.log('warn', `⚠️ Erreur zone JSON ${zoneName}:`, error);
      }
    });
  }

  private scanNpcJsonFiles(): Set<string> {
    try {
      const npcDir = path.resolve(this.config.npcDataPath);
      if (!fs.existsSync(npcDir)) {
        this.log('info', `📁 [NpcManager] Création dossier NPCs: ${npcDir}`);
        fs.mkdirSync(npcDir, { recursive: true });
        return new Set();
      }
      
      const jsonFiles = fs.readdirSync(npcDir)
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => file.replace('.json', ''));
      
      this.log('info', `📄 [NpcManager] ${jsonFiles.length} fichiers NPCs JSON trouvés`);
      return new Set(jsonFiles);
    } catch (error) {
      this.log('error', `❌ Erreur scan NPCs JSON:`, error);
      return new Set();
    }
  }

  // ✅ MÉTHODES PUBLIQUES (inchangées)
  getAllNpcs(): NpcData[] {
    return this.npcs;
  }

  getNpcById(id: number): NpcData | undefined {
    return this.npcs.find(npc => npc.id === id);
  }

  getNpcsByZone(zoneName: string): NpcData[] {
    return this.npcs.filter(npc => {
      if (npc.sourceType === 'json' && npc.sourceFile) {
        return npc.sourceFile.includes(`${zoneName}.json`);
      }
      if (npc.sourceType === 'mongodb') {
        return this.extractZoneFromNpc(npc) === zoneName;
      }
      return false;
    });
  }

  // ✅ MÉTHODES UTILITAIRES (corrigées avec zone)
  private convertJsonToNpcData(npcJson: AnyNpc, zoneName: string, sourceFile: string): NpcData {
    const npcData: NpcData = {
      id: npcJson.id,
      name: npcJson.name,
      sprite: npcJson.sprite,
      x: npcJson.position.x,
      y: npcJson.position.y,
      properties: {},
      
      // ✅ AJOUT CRITIQUE: Stockage de la zone pour JSON aussi
      zone: zoneName,
      
      type: npcJson.type,
      position: npcJson.position,
      direction: npcJson.direction,
      interactionRadius: npcJson.interactionRadius,
      canWalkAway: npcJson.canWalkAway,
      autoFacePlayer: npcJson.autoFacePlayer,
      repeatable: npcJson.repeatable,
      cooldownSeconds: npcJson.cooldownSeconds,
      
      spawnConditions: npcJson.spawnConditions,
      
      questsToGive: npcJson.questsToGive,
      questsToEnd: npcJson.questsToEnd,
      questRequirements: npcJson.questRequirements,
      questDialogueIds: npcJson.questDialogueIds,
      
      ...(npcJson.type === 'dialogue' && {
        dialogueIds: (npcJson as any).dialogueIds,
        dialogueId: (npcJson as any).dialogueId,
        conditionalDialogueIds: (npcJson as any).conditionalDialogueIds
      }),
      
      ...(npcJson.type === 'merchant' && {
        shopId: (npcJson as any).shopId,
        shopType: (npcJson as any).shopType,
        shopDialogueIds: (npcJson as any).shopDialogueIds,
        shopConfig: (npcJson as any).shopConfig
      }),
      
      ...(npcJson.type === 'trainer' && {
        trainerId: (npcJson as any).trainerId,
        trainerClass: (npcJson as any).trainerClass,
        battleConfig: (npcJson as any).battleConfig,
        battleDialogueIds: (npcJson as any).battleDialogueIds
      }),
      
      sourceType: 'json',
      sourceFile,
      lastLoaded: Date.now()
    };

    return npcData;
  }

  // ✅ MÉTHODE CORRIGÉE : extractZoneFromNpc avec priorité sur la propriété zone
  private extractZoneFromNpc(npc: NpcData): string {
    // ✅ PRIORITÉ 1: Zone explicitement stockée (MongoDB et JSON)
    if (npc.zone) {
      return npc.zone;
    }
    
    // ✅ PRIORITÉ 2: Extraction depuis mongoDoc si disponible
    if (npc.mongoDoc && npc.mongoDoc.zone) {
      return npc.mongoDoc.zone;
    }
    
    // ✅ PRIORITÉ 3: Extraction depuis sourceFile (JSON legacy)
    if (npc.sourceFile) {
      const match = npc.sourceFile.match(/([^\/\\]+)\.json$/);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  private validateNpcJson(npcJson: any): NpcValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!npcJson.id || typeof npcJson.id !== 'number') {
      errors.push(`ID manquant ou invalide: ${npcJson.id}`);
    }
    
    if (!npcJson.name || typeof npcJson.name !== 'string') {
      errors.push(`Nom manquant ou invalide: ${npcJson.name}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
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

  // ✅ NOUVELLES MÉTHODES PUBLIQUES MongoDB
  async reloadZoneFromMongoDB(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement zone ${zoneName} depuis MongoDB`);
      
      this.mongoCache.delete(zoneName);
      this.npcs = this.npcs.filter(npc => 
        !(npc.sourceType === 'mongodb' && this.extractZoneFromNpc(npc) === zoneName)
      );
      this.loadedZones.delete(zoneName);
      
      await this.loadNpcsFromMongoDB(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }

  async syncNpcsToMongoDB(zoneName?: string): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      const npcsToSync = zoneName 
        ? this.npcs.filter(npc => this.extractZoneFromNpc(npc) === zoneName)
        : this.npcs.filter(npc => npc.sourceType !== 'mongodb');
      
      this.log('info', `🔄 [Sync] Synchronisation ${npcsToSync.length} NPCs vers MongoDB...`);
      
      for (const npc of npcsToSync) {
        try {
          const zone = this.extractZoneFromNpc(npc);
          
          let mongoDoc = await NpcData.findOne({ 
            zone,
            npcId: npc.id 
          });
          
          if (mongoDoc) {
            await mongoDoc.updateFromJson(this.convertNpcDataToJson(npc));
            results.success++;
          } else {
            mongoDoc = await (NpcData as any).createFromJson(
              this.convertNpcDataToJson(npc), 
              zone
            );
            results.success++;
          }
          
        } catch (error) {
          const errorMsg = `NPC ${npc.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
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

  private convertNpcDataToJson(npc: NpcData): any {
    return {
      id: npc.id,
      name: npc.name,
      type: npc.type,
      position: npc.position || { x: npc.x, y: npc.y },
      direction: npc.direction,
      sprite: npc.sprite,
      interactionRadius: npc.interactionRadius,
      canWalkAway: npc.canWalkAway,
      autoFacePlayer: npc.autoFacePlayer,
      repeatable: npc.repeatable,
      cooldownSeconds: npc.cooldownSeconds,
      spawnConditions: npc.spawnConditions,
      questsToGive: npc.questsToGive,
      questsToEnd: npc.questsToEnd,
      questRequirements: npc.questRequirements,
      questDialogueIds: npc.questDialogueIds,
      
      ...(npc.shopId && { shopId: npc.shopId }),
      ...(npc.shopType && { shopType: npc.shopType }),
      ...(npc.shopDialogueIds && { shopDialogueIds: npc.shopDialogueIds }),
      ...(npc.trainerId && { trainerId: npc.trainerId }),
    };
  }

  public cleanup(): void {
    this.log('info', '🧹 [NpcManager] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.npcSourceMap.clear();
    this.npcSourceMapExtended.clear();
    this.validationErrors.clear();
    
    // Reset flags d'état
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [NpcManager] Nettoyage terminé');
  }

  // ✅ AUTRES MÉTHODES PUBLIQUES (inchangées)
  getNpcsByType(type: NpcType): NpcData[] {
    return this.npcs.filter(npc => npc.type === type);
  }
  
  getNpcsBySource(source: 'json' | 'mongodb'): NpcData[] {
    return this.npcs.filter(npc => npc.sourceType === source);
  }
  
  getNpcsInRadius(centerX: number, centerY: number, radius: number): NpcData[] {
    return this.npcs.filter(npc => {
      const distance = Math.sqrt(
        Math.pow(npc.x - centerX, 2) + 
        Math.pow(npc.y - centerY, 2)
      );
      return distance <= radius;
    });
  }
  
  getQuestGivers(): NpcData[] {
    return this.npcs.filter(npc => npc.questsToGive && npc.questsToGive.length > 0);
  }
  
  getQuestEnders(): NpcData[] {
    return this.npcs.filter(npc => npc.questsToEnd && npc.questsToEnd.length > 0);
  }
  
  isZoneLoaded(zoneName: string): boolean {
    return this.loadedZones.has(zoneName);
  }
  
  getLoadedZones(): string[] {
    return Array.from(this.loadedZones);
  }
  
  getSystemStats() {
    const mongoCount = Array.from(this.npcSourceMapExtended.values()).filter(s => s === NpcDataSource.MONGODB).length;
    const jsonCount = Array.from(this.npcSourceMap.values()).filter(s => s === 'json').length;
    
    const npcsByType: Record<string, number> = {};
    for (const npc of this.npcs) {
      if (npc.type) {
        npcsByType[npc.type] = (npcsByType[npc.type] || 0) + 1;
      }
    }
    
    return {
      totalNpcs: this.npcs.length,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      sources: {
        json: jsonCount,
        mongodb: mongoCount
      },
      zones: {
        loaded: Array.from(this.loadedZones),
        count: this.loadedZones.size
      },
      npcsByType,
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
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs AVEC HOT RELOAD ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs par ID (premiers 10):`);
    for (const npc of this.npcs.slice(0, 10)) {
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type || 'legacy'}) [${npc.sourceType}] - Zone: ${this.extractZoneFromNpc(npc)}`);
    }
    
    if (this.validationErrors.size > 0) {
      console.log(`\n❌ Erreurs de validation:`);
      for (const [npcId, errors] of this.validationErrors.entries()) {
        console.log(`  🚫 NPC ${npcId}: ${errors.join(', ')}`);
      }
    }

    console.log(`\n💾 État du cache MongoDB:`);
    console.log(`  - Taille: ${this.mongoCache.size}`);
    console.log(`  - TTL: ${this.config.cacheTTL / 1000}s`);
    
    console.log(`\n🔥 État Hot Reload:`);
    const hotReloadStatus = this.getHotReloadStatus();
    console.log(`  - Activé: ${hotReloadStatus.enabled}`);
    console.log(`  - Actif: ${hotReloadStatus.active}`);
    console.log(`  - Callbacks: ${hotReloadStatus.callbackCount}`);
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`  - Source primaire: ${this.config.primaryDataSource}`);
    console.log(`  - Fallback activé: ${this.config.enableFallback}`);
    console.log(`  - Cache MongoDB: ${this.config.useMongoCache}`);
    console.log(`  - Initialisé: ${this.isInitialized}`);
    console.log(`  - En cours d'initialisation: ${this.isInitializing}`);
  }
}
