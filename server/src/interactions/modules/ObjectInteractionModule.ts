// src/interactions/modules/ObjectInteractionModule.ts
// Module principal d'interaction avec les objets - VERSION MONGODB HYBRIDE
//
// ✅ NOUVELLE APPROCHE : MongoDB primary avec fallback JSON + Hot Reload

import fs from 'fs';
import path from 'path';
import { Player } from "../../schema/PokeWorldState";
import { 
  InteractionRequest, 
  InteractionResult, 
  InteractionContext,
  InteractionType,
  INTERACTION_RESULT_TYPES,
  createInteractionResult
} from "../types/BaseInteractionTypes";
import { BaseInteractionModule } from "../interfaces/InteractionModule";
import { InventoryManager } from "../../managers/InventoryManager";
import { isValidItemId } from "../../utils/ItemDB";

// ✅ IMPORT DU MODÈLE MONGODB
import { GameObjectData, IGameObjectData, GameObjectType } from "../../models/GameObjectData";

// ✅ IMPORTS DU SYSTÈME MODULAIRE (INCHANGÉ)
import { 
  IObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult
} from "./object/core/IObjectSubModule";
import { SubModuleFactory } from "./object/core/SubModuleFactory";

// ✅ ÉNUMÉRATION DES SOURCES DE DONNÉES
export enum ObjectDataSource {
  JSON = 'json', 
  MONGODB = 'mongodb',
  HYBRID = 'hybrid'
}

// ✅ INTERFACE POUR JSON DE ZONE (RÉTROCOMPATIBILITÉ)
interface GameObjectZoneData {
  zone: string;
  version: string;
  lastUpdated: string;
  description?: string;
  defaultRequirements?: {
    ground?: Record<string, any>;
    hidden?: Record<string, any>;
  };
  requirementPresets?: Record<string, Record<string, any>>;
  objects: Array<{
    id: number;
    position: { x: number; y: number };
    type: 'ground' | 'hidden' | 'pc' | 'vending_machine' | 'panel' | 'guild_board';
    itemId?: string;
    sprite?: string;
    quantity?: number;
    cooldown?: number;
    searchRadius?: number;
    itemfinderRadius?: number;
    requirements?: Record<string, any>;
    requirementPreset?: string;
    [key: string]: any;
  }>;
}

// ✅ INTERFACE POUR ÉTAT PERSISTANT DES OBJETS (INCHANGÉ)
interface ObjectState {
  objectId: number;
  zone: string;
  collected: boolean;
  lastCollectedTime?: number;
  collectedBy: string[];
  customState?: Record<string, any>;
}

// ✅ GESTIONNAIRE D'ÉTAT PERSISTANT (INCHANGÉ)
class ObjectStateManager {
  private states: Map<string, ObjectState> = new Map();
  private stateFile: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  
  constructor(stateFile: string = './data/object_states.json') {
    this.stateFile = path.resolve(stateFile);
    this.loadStates();
    this.startAutoSave();
  }
  
  private getStateKey(zone: string, objectId: number): string {
    return `${zone}_${objectId}`;
  }
  
  getObjectState(zone: string, objectId: number): ObjectState {
    const key = this.getStateKey(zone, objectId);
    
    if (!this.states.has(key)) {
      const defaultState: ObjectState = {
        objectId,
        zone,
        collected: false,
        collectedBy: []
      };
      this.states.set(key, defaultState);
    }
    
    return this.states.get(key)!;
  }
  
  updateObjectState(zone: string, objectId: number, updates: Partial<ObjectState>): void {
    const state = this.getObjectState(zone, objectId);
    Object.assign(state, updates);
    this.states.set(this.getStateKey(zone, objectId), state);
  }
  
  markAsCollected(zone: string, objectId: number, playerName: string): void {
    const state = this.getObjectState(zone, objectId);
    state.collected = true;
    state.lastCollectedTime = Date.now();
    
    if (!state.collectedBy.includes(playerName)) {
      state.collectedBy.push(playerName);
    }
  }
  
  isCollectedBy(zone: string, objectId: number, playerName: string): boolean {
    const state = this.getObjectState(zone, objectId);
    return state.collectedBy.includes(playerName);
  }
  
  resetObject(zone: string, objectId: number): void {
    const state = this.getObjectState(zone, objectId);
    state.collected = false;
    state.lastCollectedTime = undefined;
    state.collectedBy = [];
  }
  
  private loadStates(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        
        for (const [key, state] of Object.entries(data)) {
          this.states.set(key, state as ObjectState);
        }
        
        console.log(`💾 [ObjectStateManager] ${this.states.size} états d'objets chargés`);
      }
    } catch (error) {
      console.error(`❌ [ObjectStateManager] Erreur chargement états:`, error);
    }
  }
  
  saveStates(): void {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = Object.fromEntries(this.states.entries());
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2));
      
      console.log(`💾 [ObjectStateManager] ${this.states.size} états sauvegardés`);
    } catch (error) {
      console.error(`❌ [ObjectStateManager] Erreur sauvegarde:`, error);
    }
  }
  
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.saveStates();
    }, 5 * 60 * 1000);
  }
  
  cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.saveStates();
  }
  
  getStats(): any {
    const totalStates = this.states.size;
    let collectedObjects = 0;
    let playersWithCollections = new Set<string>();
    
    for (const state of this.states.values()) {
      if (state.collected) collectedObjects++;
      state.collectedBy.forEach(player => playersWithCollections.add(player));
    }
    
    return {
      totalObjects: totalStates,
      collectedObjects,
      availableObjects: totalStates - collectedObjects,
      playersWithCollections: playersWithCollections.size
    };
  }
}

// ✅ CONFIGURATION HYBRIDE
interface ObjectManagerConfig {
  primaryDataSource: ObjectDataSource;
  useMongoCache: boolean;
  cacheTTL: number;
  enableFallback: boolean;
  
  submodulesPath: string;
  stateFile: string;
  gameObjectsPath: string;
  autoLoadMaps: boolean;
  securityEnabled: boolean;
  debugMode: boolean;
}

// ✅ MODULE PRINCIPAL - VERSION MONGODB HYBRIDE
export class ObjectInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "ObjectInteractionModule";
  readonly supportedTypes: InteractionType[] = ["object"];
  readonly version = "3.0.0"; // ✅ VERSION MONGODB HYBRIDE

  // ✅ NOUVEAUX FLAGS D'ÉTAT (comme NpcManager)
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  // ✅ COMPOSANTS DU SYSTÈME
  private subModuleFactory: SubModuleFactory;
  private stateManager: ObjectStateManager;
  private objectsByZone: Map<string, Map<number, ObjectDefinition>> = new Map();
  private loadedZones: Set<string> = new Set();
  
  // ✅ PROPRIÉTÉS MONGODB + HOT RELOAD
  private mongoCache: Map<string, { data: ObjectDefinition[]; timestamp: number }> = new Map();
  private objectSourceMap: Map<number, ObjectDataSource> = new Map();
  private changeStream: any = null;
  private hotReloadEnabled: boolean = true;
  private reloadCallbacks: Array<(event: string, objectData?: any) => void> = [];
  
  // ✅ CONFIGURATION HYBRIDE
  private config: ObjectManagerConfig = {
    primaryDataSource: ObjectDataSource.MONGODB,
    useMongoCache: process.env.OBJECT_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.OBJECT_CACHE_TTL || '1800000'),
    enableFallback: process.env.OBJECT_FALLBACK !== 'false',
    
    submodulesPath: path.resolve(__dirname, './object/submodules'),
    stateFile: './data/object_states.json',
    gameObjectsPath: './server/build/data/gameobjects',
    autoLoadMaps: true,
    securityEnabled: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development'
  };

  constructor(customConfig?: Partial<ObjectManagerConfig>) {
    super();
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🔄 [MONGODB-HYBRID] Initialisation`, {
      primarySource: this.config.primaryDataSource,
      autoLoadMaps: this.config.autoLoadMaps,
      securityEnabled: this.config.securityEnabled,
      version: this.version
    });
    
    this.stateManager = new ObjectStateManager(this.config.stateFile);
    
    this.subModuleFactory = new SubModuleFactory(
      this.config.submodulesPath,
      {
        enabled: this.config.securityEnabled,
        whitelist: this.config.securityEnabled ? [
          'GroundItem',
          'HiddenObject', 
          'PC',
          'VendingMachine',
          'Panel',
          'GuildBoard'
        ] : undefined,
        sandbox: this.config.securityEnabled,
        auditLog: this.config.securityEnabled,
        maxLoadTime: 5000
      }
    );
  }

  // ✅ NOUVELLE MÉTHODE : Initialisation asynchrone (comme NpcManager)
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('info', `♻️ [MONGODB-HYBRID] Déjà initialisé`);
      return;
    }
    
    if (this.isInitializing) {
      this.log('info', `⏳ [MONGODB-HYBRID] Initialisation en cours, attente...`);
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    this.log('info', `🔄 [MONGODB-HYBRID] Démarrage initialisation asynchrone...`);
    
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.log('info', `✅ [MONGODB-HYBRID] Initialisation terminée`, {
        totalObjects: Array.from(this.objectsByZone.values()).reduce((sum, zoneMap) => sum + zoneMap.size, 0),
        zones: Array.from(this.loadedZones)
      });
    } catch (error) {
      this.log('error', `❌ [MONGODB-HYBRID] Erreur lors de l'initialisation:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // ✅ MÉTHODE PRIVÉE : Logique d'initialisation
  private async performInitialization(): Promise<void> {
    try {
      await this.subModuleFactory.discoverAndLoadModules();
      
      if (this.config.autoLoadMaps) {
        await this.autoLoadAllZonesSync();
      }
    } catch (error) {
      this.log('error', `❌ [MONGODB-HYBRID] Erreur initialisation:`, error);
      throw error;
    }
  }

  // ✅ MÉTHODE CORRIGÉE : waitForLoad (comme NpcManager)
  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente du chargement des objets (timeout: ${timeoutMs}ms)...`);
    
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [WaitForLoad] Lancement de l'initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    const totalObjects = Array.from(this.objectsByZone.values()).reduce((sum, zoneMap) => sum + zoneMap.size, 0);
    
    while ((!this.isInitialized || totalObjects === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && totalObjects > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] Objets chargés: ${totalObjects} objets en ${loadTime}ms`);
      this.log('info', `🗺️  [WaitForLoad] Zones chargées: ${Array.from(this.loadedZones).join(', ')}`);
      
      if (this.config.primaryDataSource === ObjectDataSource.MONGODB && this.hotReloadEnabled) {
        this.startHotReload();
      }
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms, initialisé: ${this.isInitialized}, Objets: ${totalObjects}`);
    }
    
    return loaded;
  }

  // === MÉTHODES PRINCIPALES (INCHANGÉES) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'object';
  }

  async handle(context: InteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      
      this.log('info', `🎯 [MONGODB-HYBRID] Traitement interaction objet`, { 
        player: player.name, 
        data: request.data 
      });

      if (request.data?.action === 'search') {
        return await this.handleGeneralSearch(player, request);
      } else if (request.data?.objectId) {
        return await this.handleSpecificObject(player, request);
      } else {
        return this.createErrorResult("Données d'interaction manquantes", "INVALID_REQUEST");
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', '❌ [MONGODB-HYBRID] Erreur traitement objet', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        "PROCESSING_FAILED"
      );
    }
  }

  // === HANDLERS SPÉCIALISÉS (INCHANGÉS) ===

  private async handleSpecificObject(player: Player, request: InteractionRequest): Promise<InteractionResult> {
    const startTime = Date.now();
    const objectIdRaw = request.data?.objectId;
    const objectId = typeof objectIdRaw === 'string' ? parseInt(objectIdRaw, 10) : objectIdRaw;
    const zone = player.currentZone;
    
    if (!objectId || isNaN(objectId)) {
      return this.createErrorResult(`Object ID invalide: ${objectIdRaw}`, "INVALID_OBJECT_ID");
    }
    
    this.log('info', `🔍 [MONGODB-HYBRID] Recherche objet ${objectId} dans zone ${zone}`);
    
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) {
      this.log('warn', `❌ [MONGODB-HYBRID] Objet ${objectId} non trouvé dans ${zone}`);
      return this.createErrorResult(`Objet ${objectId} non trouvé dans ${zone}`, "OBJECT_NOT_FOUND");
    }

    this.log('info', `✅ [MONGODB-HYBRID] Objet trouvé: ${objectDef.name}`, {
      type: objectDef.type,
      itemId: objectDef.itemId,
      source: this.objectSourceMap.get(objectId)
    });

    const state = this.stateManager.getObjectState(zone, objectId);
    objectDef.state = state;

    if (objectDef.type === 'unknown' || !objectDef.type) {
      objectDef.type = 'ground_item';
      this.log('info', `🔧 [MONGODB-HYBRID] Auto-détection: type → ground_item`);
    }
    
    const subModule = this.subModuleFactory.findModuleForObject(objectDef);
    if (!subModule) {
      return this.createErrorResult(`Aucun gestionnaire pour le type: ${objectDef.type}`, "NO_HANDLER");
    }

    this.log('info', `🚀 [MONGODB-HYBRID] Délégation à ${subModule.typeName}`, { 
      objectId, 
      type: objectDef.type,
      itemId: objectDef.itemId
    });

    const result = await subModule.handle(player, objectDef, request.data);

    const processingTime = Date.now() - startTime;
    this.updateStats(result.success, processingTime);

    if (result.success && result.data?.objectData?.collected) {
      this.stateManager.markAsCollected(zone, objectId, player.name);
      
      if (result.data?.objectData) {
        result.data.objectData.objectId = objectId.toString();
      }
    }

    return result;
  }

  private async handleGeneralSearch(player: Player, request: InteractionRequest): Promise<InteractionResult> {
    const position = request.position;
    if (!position) {
      return this.createErrorResult("Position manquante pour la fouille", "INVALID_REQUEST");
    }

    const zone = player.currentZone;
    
    this.log('info', `🔍 [MONGODB-HYBRID] Fouille générale dans ${zone}`, {
      position: { x: position.x, y: position.y }
    });
    
    const nearbyHiddenObjects = this.findHiddenObjectsNear(zone, position.x, position.y, 32);
    
    this.log('info', `🔍 [MONGODB-HYBRID] ${nearbyHiddenObjects.length} objets cachés trouvés dans la zone`);

    if (nearbyHiddenObjects.length > 0) {
      const objectDef = nearbyHiddenObjects[0];
      const state = this.stateManager.getObjectState(zone, objectDef.id);
      objectDef.state = state;

      const subModule = this.subModuleFactory.findModuleForObject(objectDef);
      if (subModule) {
        this.log('info', `🚀 [MONGODB-HYBRID] Fouille délégué à ${subModule.typeName}`);
        
        const result = await subModule.handle(player, objectDef, { action: 'search' });
        
        if (result.success && result.data?.objectData?.collected) {
          this.stateManager.markAsCollected(zone, objectDef.id, player.name);
          
          if (result.data?.objectData) {
            result.data.objectData.objectId = objectDef.id.toString();
          }
        }
        
        return result;
      }
    }

    this.log('info', `❌ [MONGODB-HYBRID] Rien trouvé lors de la fouille`);
    return createInteractionResult.noItemFound(
      "0",
      "search",
      "Il n'y a rien ici.",
      1
    );
  }

  // ✅ CHARGEMENT SYNCHRONE HYBRIDE
  private async autoLoadAllZonesSync(): Promise<void> {
    this.log('info', `📂 [MONGODB-HYBRID] Auto-scan avec source: ${this.config.primaryDataSource}...`);
    
    if (this.config.primaryDataSource === ObjectDataSource.MONGODB || 
        this.config.primaryDataSource === ObjectDataSource.HYBRID) {
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
      this.autoLoadFromFiles();
    }
  }

  // ✅ CHARGEMENT MONGODB
  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      this.log('info', '🗄️  [Auto-scan MongoDB] Vérification connectivité...');
      
      await this.waitForMongoDBReady();
      
      const zones = await GameObjectData.distinct('zone');
      
      this.log('info', `📋 [MongoDB] ${zones.length} zones trouvées: ${zones.join(', ')}`);
      
      for (const zoneName of zones) {
        try {
          await this.loadObjectsForZone(zoneName);
        } catch (error) {
          this.log('warn', `⚠️ Erreur zone MongoDB ${zoneName}:`, error);
        }
      }
      
      this.log('info', `🎉 [Auto-scan MongoDB] Terminé: ${Array.from(this.objectsByZone.values()).reduce((sum, zoneMap) => sum + zoneMap.size, 0)} objets chargés`);
      
    } catch (error) {
      this.log('error', '❌ [Auto-scan MongoDB] Erreur:', error);
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
        
        const rawCount = await mongoose.connection.db.collection('game_objects').countDocuments();
        const testCount = await GameObjectData.countDocuments();
        
        this.log('info', `📊 [MongoDB Ping] Objets via modèle: ${testCount}`);
        
        if (rawCount !== testCount) {
          this.log('warn', `⚠️ [MongoDB Ping] Différence détectée ! Raw: ${rawCount}, Modèle: ${testCount}`);
        }
        
        this.log('info', `✅ [MongoDB Ping] Succès ! ${testCount} objets détectés`);
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        this.log('warn', `⚠️ [MongoDB Ping] Échec ${retries}/${maxRetries}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ✅ CHARGEMENT PAR ZONE HYBRIDE
  private async loadObjectsForZone(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    this.log('info', `🎯 [Zone: ${zoneName}] Chargement selon stratégie: ${this.config.primaryDataSource}`);
    
    try {
      switch (this.config.primaryDataSource) {
        case ObjectDataSource.MONGODB:
          await this.loadObjectsFromMongoDB(zoneName);
          break;
          
        case ObjectDataSource.JSON:
          await this.loadObjectsFromJSON(zoneName);
          break;
          
        case ObjectDataSource.HYBRID:
          try {
            await this.loadObjectsFromMongoDB(zoneName);
          } catch (mongoError) {
            this.log('warn', `⚠️  [Hybrid] MongoDB échoué pour ${zoneName}, fallback JSON`);
            await this.loadObjectsFromJSON(zoneName);
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

  // ✅ CHARGEMENT DEPUIS MONGODB
  private async loadObjectsFromMongoDB(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.config.useMongoCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.log('info', `💾 [MongoDB Cache] Zone ${zoneName} trouvée en cache`);
          this.addObjectsToCollection(cached, ObjectDataSource.MONGODB);
          return;
        }
      }
      
      this.log('info', `🗄️  [MongoDB] Chargement zone ${zoneName}...`);
      
      const mongoObjects = await GameObjectData.findByZone(zoneName);
      
      const objectsData: ObjectDefinition[] = mongoObjects.map(mongoDoc => 
        this.convertMongoDocToObjectDefinition(mongoDoc, zoneName)
      );
      
      this.addObjectsToCollection(objectsData, ObjectDataSource.MONGODB);
      
      if (this.config.useMongoCache) {
        this.setCache(zoneName, objectsData);
      }
      
      this.loadedZones.add(zoneName);
      
      const queryTime = Date.now() - startTime;
      this.log('info', `✅ [MongoDB] Zone ${zoneName}: ${objectsData.length} objets chargés en ${queryTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur chargement zone ${zoneName}:`, error);
      
      if (this.config.enableFallback) {
        this.log('info', `🔄 [Fallback] Tentative chargement JSON pour ${zoneName}`);
        await this.loadObjectsFromJSON(zoneName);
      } else {
        throw error;
      }
    }
  }

  // ✅ CONVERSION MONGODB → OBJECTDEFINITION
  private convertMongoDocToObjectDefinition(mongoDoc: IGameObjectData, zoneName: string): ObjectDefinition {
    try {
      // Utiliser la méthode toObjectFormat() du modèle
      const objectFormat = mongoDoc.toObjectFormat();
      
      // Enrichir avec métadonnées MongoDB
      objectFormat.customProperties = {
        ...objectFormat.customProperties,
        mongoId: mongoDoc._id.toString(),
        sourceType: 'mongodb',
        lastUpdated: mongoDoc.lastUpdated,
        version: mongoDoc.version
      };
      
      return objectFormat;
      
    } catch (error) {
      this.log('error', '❌ [convertMongoDocToObjectDefinition] Erreur conversion:', error);
      throw error;
    }
  }

  // ✅ AJOUT D'OBJETS À LA COLLECTION
  private addObjectsToCollection(objectsData: ObjectDefinition[], source: ObjectDataSource): void {
    for (const obj of objectsData) {
      const zoneName = obj.zone;
      
      if (!this.objectsByZone.has(zoneName)) {
        this.objectsByZone.set(zoneName, new Map());
      }
      
      const zoneObjects = this.objectsByZone.get(zoneName)!;
      
      const existingIndex = Array.from(zoneObjects.values()).findIndex(existing => 
        existing.id === obj.id
      );
      
      if (existingIndex >= 0) {
        zoneObjects.set(obj.id, obj);
      } else {
        zoneObjects.set(obj.id, obj);
      }
      
      this.objectSourceMap.set(obj.id, source);
    }
  }

  // ✅ MÉTHODES CACHE
  private getFromCache(zoneName: string): ObjectDefinition[] | null {
    const cached = this.mongoCache.get(zoneName);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.mongoCache.delete(zoneName);
      return null;
    }
    
    return cached.data;
  }

  private setCache(zoneName: string, data: ObjectDefinition[]): void {
    this.mongoCache.set(zoneName, {
      data: [...data],
      timestamp: Date.now()
    });
  }

  // ✅ CHARGEMENT JSON (RÉTROCOMPATIBILITÉ)
  async loadObjectsFromJSON(zoneName: string): Promise<void> {
    try {
      const jsonPath = path.resolve(this.config.gameObjectsPath, `${zoneName}.json`);
      
      this.log('info', `📄 [JSON] Chargement objets depuis: ${jsonPath}`);
      
      if (!fs.existsSync(jsonPath)) {
        this.log('warn', `📁 [JSON] Fichier introuvable: ${jsonPath}`);
        return;
      }

      const jsonData: GameObjectZoneData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      this.log('info', `📖 [JSON] Données lues:`, {
        zone: jsonData.zone,
        version: jsonData.version,
        objectCount: jsonData.objects?.length || 0
      });

      if (!jsonData.objects || !Array.isArray(jsonData.objects)) {
        this.log('warn', `⚠️ [JSON] Aucun objet dans ${zoneName}.json`);
        return;
      }

      const objects = new Map<number, ObjectDefinition>();

      for (const objData of jsonData.objects) {
        try {
          if (!objData.itemId) {
            this.log('error', `❌ [JSON] Objet ${objData.id}: itemId manquant`);
            continue;
          }

          if (!isValidItemId(objData.itemId)) {
            this.log('error', `❌ [JSON] Objet ${objData.id}: itemId "${objData.itemId}" invalide`);
            continue;
          }

          const resolvedRequirements = this.resolveRequirements(
            objData, 
            jsonData.defaultRequirements, 
            jsonData.requirementPresets
          );

          let finalType: string = objData.type;
          if (objData.type === 'ground') finalType = 'ground_item';
          if (objData.type === 'hidden') finalType = 'hidden_item';

          const objectDef: ObjectDefinition = {
            id: objData.id,
            name: objData.itemId,
            x: objData.position.x,
            y: objData.position.y,
            zone: zoneName,
            
            type: finalType,
            itemId: objData.itemId,
            quantity: objData.quantity || 1,
            respawnTime: 0,
            
            requirements: Object.keys(resolvedRequirements).length > 0 ? resolvedRequirements : undefined,
            
            customProperties: {
              sprite: objData.sprite,
              cooldownHours: objData.cooldown || 24,
              
              ...(objData.type === 'hidden' && {
                searchRadius: objData.searchRadius || 16,
                itemfinderRadius: objData.itemfinderRadius || 64
              }),
              
              originalType: objData.type,
              requirementPreset: objData.requirementPreset,
              sourceType: 'json'
            },
            
            state: {
              collected: false,
              collectedBy: []
            }
          };

          objects.set(objData.id, objectDef);
          this.objectSourceMap.set(objData.id, ObjectDataSource.JSON);

        } catch (objError) {
          this.log('error', `❌ [JSON] Erreur traitement objet ${objData.id}:`, objError);
        }
      }

      this.objectsByZone.set(zoneName, objects);
      this.loadedZones.add(zoneName);
      
      this.log('info', `🎉 [JSON] Zone ${zoneName} chargée: ${objects.size} objets`);

    } catch (error) {
      this.log('error', `❌ [JSON] Erreur chargement ${zoneName}.json:`, error);
      throw error;
    }
  }

  // ✅ SCAN DES FICHIERS JSON (RÉTROCOMPATIBILITÉ)
  private autoLoadFromFiles(): void {
    try {
      const gameObjectsDir = path.resolve(this.config.gameObjectsPath);
      
      if (!fs.existsSync(gameObjectsDir)) {
        this.log('info', `📁 [JSON] Création du dossier: ${gameObjectsDir}`);
        fs.mkdirSync(gameObjectsDir, { recursive: true });
        return;
      }

      const jsonFiles = fs.readdirSync(gameObjectsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      this.log('info', `📋 [JSON] ${jsonFiles.length} fichiers JSON trouvés:`, jsonFiles);

      for (const zoneName of jsonFiles) {
        this.log('info', `⏳ [JSON] Chargement zone: ${zoneName}...`);
        this.loadObjectsFromJSON(zoneName).catch(error => {
          this.log('error', `❌ [JSON] Erreur ${zoneName}:`, error);
        });
      }

    } catch (error) {
      this.log('error', `❌ [JSON] Erreur scan fichiers:`, error);
    }
  }

  // ✅ HOT RELOAD MONGODB
  private startHotReload(): void {
    try {
      this.log('info', '🔥 [HotReload] Démarrage MongoDB Change Streams...');
      
      this.changeStream = GameObjectData.watch([], { 
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
          await this.handleObjectInsert(change.fullDocument);
          break;
          
        case 'update':
          await this.handleObjectUpdate(change.fullDocument);
          break;
          
        case 'delete':
          await this.handleObjectDelete(change.documentKey._id);
          break;
          
        default:
          this.log('info', `ℹ️ [HotReload] Opération ignorée: ${change.operationType}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur traitement changement:', error);
    }
  }

  private async handleObjectInsert(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const objectDef = this.convertMongoDocToObjectDefinition(mongoDoc, zoneName);
      
      if (!this.objectsByZone.has(zoneName)) {
        this.objectsByZone.set(zoneName, new Map());
      }
      
      this.objectsByZone.get(zoneName)!.set(objectDef.id, objectDef);
      this.objectSourceMap.set(objectDef.id, ObjectDataSource.MONGODB);
      this.loadedZones.add(zoneName);
      this.mongoCache.delete(zoneName);
      
      this.log('info', `➕ [HotReload] Objet ajouté: ${objectDef.name} (ID: ${objectDef.id}) dans ${zoneName}`);
      this.notifyReloadCallbacks('insert', objectDef);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur ajout objet:', error);
    }
  }

  private async handleObjectUpdate(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const objectDef = this.convertMongoDocToObjectDefinition(mongoDoc, zoneName);
      
      if (!this.objectsByZone.has(zoneName)) {
        this.objectsByZone.set(zoneName, new Map());
      }
      
      this.objectsByZone.get(zoneName)!.set(objectDef.id, objectDef);
      this.objectSourceMap.set(objectDef.id, ObjectDataSource.MONGODB);
      this.mongoCache.delete(zoneName);
      this.loadedZones.add(zoneName);
      
      this.log('info', `🔄 [HotReload] Objet mis à jour: ${objectDef.name} (ID: ${objectDef.id})`);
      this.notifyReloadCallbacks('update', objectDef);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur modification objet:', error);
    }
  }

  private async handleObjectDelete(documentId: any): Promise<void> {
    try {
      let deletedObject: ObjectDefinition | null = null;
      let zoneName = '';
      
      for (const [zone, objects] of this.objectsByZone.entries()) {
        for (const [objectId, obj] of objects.entries()) {
          if (obj.customProperties?.mongoId === documentId.toString()) {
            deletedObject = obj;
            zoneName = zone;
            objects.delete(objectId);
            this.objectSourceMap.delete(objectId);
            break;
          }
        }
        if (deletedObject) break;
      }
      
      if (deletedObject) {
        this.mongoCache.delete(zoneName);
        this.log('info', `➖ [HotReload] Objet supprimé: ${deletedObject.name} (ID: ${deletedObject.id})`);
        this.notifyReloadCallbacks('delete', deletedObject);
      } else {
        this.log('warn', `⚠️ [HotReload] Objet à supprimer non trouvé: ${documentId}`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur suppression objet:', error);
    }
  }

  private notifyReloadCallbacks(event: string, objectData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, objectData);
      } catch (error) {
        this.log('error', '❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  // ✅ MÉTHODES PUBLIQUES HOT RELOAD
  public onObjectChange(callback: (event: string, objectData?: any) => void): void {
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

  // === MÉTHODES UTILITAIRES (INCHANGÉES) ===

  private resolveRequirements(
    objData: any,
    defaultRequirements?: GameObjectZoneData['defaultRequirements'],
    requirementPresets?: GameObjectZoneData['requirementPresets']
  ): Record<string, any> {
    let resolved: Record<string, any> = {};

    if (defaultRequirements && objData.type in defaultRequirements) {
      resolved = { ...resolved, ...defaultRequirements[objData.type as keyof typeof defaultRequirements] };
    }

    if (objData.requirementPreset && requirementPresets?.[objData.requirementPreset]) {
      resolved = { ...resolved, ...requirementPresets[objData.requirementPreset] };
    }

    if (objData.requirements) {
      resolved = { ...resolved, ...objData.requirements };
    }

    return resolved;
  }

  private getObject(zone: string, objectId: number): ObjectDefinition | undefined {
    const zoneObjects = this.objectsByZone.get(zone);
    return zoneObjects?.get(objectId);
  }

  private findHiddenObjectsNear(zone: string, x: number, y: number, radius: number): ObjectDefinition[] {
    const zoneObjects = this.objectsByZone.get(zone);
    if (!zoneObjects) return [];

    const nearbyObjects: ObjectDefinition[] = [];

    for (const objectDef of zoneObjects.values()) {
      if (objectDef.type === 'hidden_item') {
        const distance = Math.sqrt(
          Math.pow(objectDef.x - x, 2) + 
          Math.pow(objectDef.y - y, 2)
        );

        if (distance <= radius) {
          nearbyObjects.push(objectDef);
        }
      }
    }

    return nearbyObjects;
  }

  // === MÉTHODES PUBLIQUES POUR WORLDROOM ===

  getVisibleObjectsInZone(zone: string): any[] {
    const { getServerConfig } = require('../../config/serverConfig');
    const serverConfig = getServerConfig();
    
    const zoneObjects = this.objectsByZone.get(zone);
    if (!zoneObjects) return [];

    const visibleObjects: any[] = [];

    for (const objectDef of zoneObjects.values()) {
      if (objectDef.type !== 'hidden_item') {
        const state = this.stateManager.getObjectState(zone, objectDef.id);
        
        const isCollected = serverConfig.autoresetObjects ? false : state.collected;
        
        if (!isCollected) {
          visibleObjects.push({
            id: objectDef.id,
            type: objectDef.type,
            name: objectDef.name,
            x: objectDef.x,
            y: objectDef.y,
            itemId: objectDef.itemId,
            sprite: objectDef.customProperties?.sprite,
            collected: false,
            source: this.objectSourceMap.get(objectDef.id) || 'unknown'
          });
        }
      }
    }

    if (serverConfig.autoresetObjects && visibleObjects.length > 0) {
      this.log('info', `🔄 [MONGODB-HYBRID] Reset visuel: ${visibleObjects.length} objets visibles dans ${zone}`);
    }

    return visibleObjects;
  }

  addObject(zone: string, objectData: Partial<ObjectDefinition>): void {
    if (!this.objectsByZone.has(zone)) {
      this.objectsByZone.set(zone, new Map());
    }

    const zoneObjects = this.objectsByZone.get(zone)!;
    const objectId = objectData.id || Math.floor(Date.now() / 1000);

    const objectDef: ObjectDefinition = {
      id: objectId,
      name: objectData.name || objectData.itemId || `Object_${objectId}`,
      x: objectData.x || 0,
      y: objectData.y || 0,
      zone,
      type: objectData.type || 'unknown',
      itemId: objectData.itemId,
      quantity: objectData.quantity || 1,
      respawnTime: objectData.respawnTime || 0,
      requirements: objectData.requirements,
      customProperties: objectData.customProperties || {},
      state: {
        collected: false,
        collectedBy: []
      }
    };

    zoneObjects.set(objectId, objectDef);
    this.objectSourceMap.set(objectId, ObjectDataSource.JSON); // Par défaut
    this.log('info', `📦 [MONGODB-HYBRID] Objet ${objectId} ajouté dynamiquement à ${zone}`);
  }

  resetObject(zone: string, objectId: number): boolean {
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) return false;

    this.stateManager.resetObject(zone, objectId);
    this.log('info', `🔄 [MONGODB-HYBRID] Objet ${objectId} réinitialisé dans ${zone}`);
    return true;
  }

  // === MÉTHODES PUBLIQUES POUR L'INVENTAIRE (INCHANGÉ) ===

  async giveItemToPlayer(
    playerName: string,
    itemId: string,
    quantity: number = 1,
    source: string = 'object_interaction'
  ): Promise<{ success: boolean; message: string; newQuantity?: number }> {
    try {
      this.log('info', `🎁 [MONGODB-HYBRID] Donner item à ${playerName}`, { itemId, quantity, source });
      
      return {
        success: true,
        message: `${quantity}x ${itemId} ajouté à l'inventaire`,
        newQuantity: quantity
      };
      
    } catch (error) {
      this.log('error', '❌ [MONGODB-HYBRID] Erreur giveItemToPlayer', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // === NOUVELLES MÉTHODES PUBLIQUES MONGODB ===

  async reloadZoneFromMongoDB(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement zone ${zoneName} depuis MongoDB`);
      
      this.mongoCache.delete(zoneName);
      
      // Supprimer objets MongoDB de cette zone
      const zoneObjects = this.objectsByZone.get(zoneName);
      if (zoneObjects) {
        for (const [objectId, obj] of zoneObjects.entries()) {
          if (this.objectSourceMap.get(objectId) === ObjectDataSource.MONGODB) {
            zoneObjects.delete(objectId);
            this.objectSourceMap.delete(objectId);
          }
        }
      }
      
      await this.loadObjectsFromMongoDB(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }

  async syncObjectsToMongoDB(zoneName?: string): Promise<{ success: number; errors: string[] }> {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    try {
      let objectsToSync: ObjectDefinition[] = [];
      
      if (zoneName) {
        const zoneObjects = this.objectsByZone.get(zoneName);
        if (zoneObjects) {
          objectsToSync = Array.from(zoneObjects.values())
            .filter(obj => this.objectSourceMap.get(obj.id) !== ObjectDataSource.MONGODB);
        }
      } else {
        for (const [zone, objects] of this.objectsByZone.entries()) {
          for (const obj of objects.values()) {
            if (this.objectSourceMap.get(obj.id) !== ObjectDataSource.MONGODB) {
              objectsToSync.push(obj);
            }
          }
        }
      }
      
      this.log('info', `🔄 [Sync] Synchronisation ${objectsToSync.length} objets vers MongoDB...`);
      
      for (const obj of objectsToSync) {
        try {
          let mongoDoc = await GameObjectData.findOne({ 
            zone: obj.zone,
            objectId: obj.id 
          });
          
          const jsonObject = this.convertObjectDefinitionToJson(obj);
          
          if (mongoDoc) {
            await mongoDoc.updateFromJson(jsonObject);
            results.success++;
          } else {
            mongoDoc = await GameObjectData.createFromJson(jsonObject, obj.zone);
            results.success++;
          }
          
        } catch (error) {
          const errorMsg = `Objet ${obj.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
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

  private convertObjectDefinitionToJson(obj: ObjectDefinition): any {
    return {
      id: obj.id,
      name: obj.name,
      position: { x: obj.x, y: obj.y },
      type: obj.customProperties?.originalType || obj.type.replace('_item', ''),
      itemId: obj.itemId,
      sprite: obj.customProperties?.sprite,
      quantity: obj.quantity,
      cooldown: obj.customProperties?.cooldownHours,
      searchRadius: obj.customProperties?.searchRadius,
      itemfinderRadius: obj.customProperties?.itemfinderRadius,
      requirements: obj.requirements,
      
      // Propriétés custom additionnelles
      ...Object.fromEntries(
        Object.entries(obj.customProperties || {})
          .filter(([key]) => !['sprite', 'cooldownHours', 'searchRadius', 'itemfinderRadius', 'originalType', 'mongoId', 'sourceType'].includes(key))
      )
    };
  }

  // === CYCLE DE VIE ===

  async cleanup(): Promise<void> {
    this.log('info', '🧹 [MONGODB-HYBRID] Nettoyage du système d\'objets...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.objectSourceMap.clear();
    
    await this.subModuleFactory.cleanup();
    this.stateManager.cleanup();
    
    // Reset flags d'état
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    await super.cleanup();
  }

  // === MÉTHODES D'ADMINISTRATION ===

  async reloadSubModule(typeName: string): Promise<boolean> {
    return await this.subModuleFactory.reloadModule(typeName);
  }

  async reloadZone(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [MONGODB-HYBRID] Rechargement zone: ${zoneName}`);
      
      this.objectsByZone.delete(zoneName);
      this.loadedZones.delete(zoneName);
      this.mongoCache.delete(zoneName);
      
      await this.loadObjectsForZone(zoneName);
      
      const reloadedObjects = this.objectsByZone.get(zoneName)?.size || 0;
      this.log('info', `✅ [MONGODB-HYBRID] Zone ${zoneName} rechargée: ${reloadedObjects} objets`);
      
      return reloadedObjects > 0;
    } catch (error) {
      this.log('error', `❌ [MONGODB-HYBRID] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }

  getSystemStats(): any {
    const factoryStats = this.subModuleFactory.getStats();
    const stateStats = this.stateManager.getStats();
    const baseStats = this.getStats();

    const mongoCount = Array.from(this.objectSourceMap.values()).filter(s => s === ObjectDataSource.MONGODB).length;
    const jsonCount = Array.from(this.objectSourceMap.values()).filter(s => s === ObjectDataSource.JSON).length;

    return {
      module: baseStats,
      factory: factoryStats,
      states: stateStats,
      config: {
        primaryDataSource: this.config.primaryDataSource,
        useMongoCache: this.config.useMongoCache,
        enableFallback: this.config.enableFallback,
        gameObjectsPath: this.config.gameObjectsPath,
        autoLoadMaps: this.config.autoLoadMaps,
        version: this.version
      },
      zones: {
        total: this.objectsByZone.size,
        zones: Array.from(this.loadedZones),
        totalObjects: Array.from(this.objectsByZone.values())
          .reduce((sum, zoneMap) => sum + zoneMap.size, 0)
      },
      sources: {
        mongodb: mongoCount,
        json: jsonCount,
        hybrid: mongoCount > 0 && jsonCount > 0
      },
      cache: {
        size: this.mongoCache.size,
        ttl: this.config.cacheTTL
      },
      hotReload: {
        enabled: this.hotReloadEnabled,
        active: !!this.changeStream,
        callbackCount: this.reloadCallbacks.length
      },
      initialization: {
        initialized: this.isInitialized,
        initializing: this.isInitializing
      }
    };
  }

  debugSystem(): void {
    console.log(`🔍 [MONGODB-HYBRID] === DEBUG SYSTÈME OBJETS MONGODB ===`);
    
    console.log(`📦 Zones chargées: ${this.objectsByZone.size}`);
    for (const [zone, objects] of this.objectsByZone.entries()) {
      console.log(`  🌍 ${zone}: ${objects.size} objets`);
      
      const byType: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      
      for (const obj of objects.values()) {
        byType[obj.type] = (byType[obj.type] || 0) + 1;
        const source = this.objectSourceMap.get(obj.id) || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;
      }
      
      for (const [type, count] of Object.entries(byType)) {
        console.log(`    📋 ${type}: ${count}`);
      }
      for (const [source, count] of Object.entries(bySource)) {
        console.log(`    🗄️ ${source}: ${count}`);
      }
    }
    
    this.subModuleFactory.debug();
    
    const stateStats = this.stateManager.getStats();
    console.log(`💾 États: ${JSON.stringify(stateStats, null, 2)}`);
    
    console.log(`🔥 Hot Reload: ${this.hotReloadEnabled ? 'ON' : 'OFF'} (actif: ${!!this.changeStream})`);
    console.log(`📊 Cache MongoDB: ${this.mongoCache.size} zones en cache`);
    console.log(`⚙️ Config: ${JSON.stringify({
      primarySource: this.config.primaryDataSource,
      useCache: this.config.useMongoCache,
      fallback: this.config.enableFallback
    }, null, 2)}`);
  }

  // === MÉTHODES UTILITAIRES PROTÉGÉES ===

  protected createErrorResult(message: string, code?: string): InteractionResult {
    return createInteractionResult.error(message, code, {
      module: this.moduleName,
      timestamp: Date.now(),
      version: this.version
    });
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
}
