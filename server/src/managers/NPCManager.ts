// server/src/managers/NPCManager.ts
import { NpcData } from "../models/NpcData";
import { 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

export interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  zone: string;
  
  type?: NpcType;
  position?: { x: number; y: number };
  direction?: Direction;
  interactionRadius?: number;
  canWalkAway?: boolean;
  autoFacePlayer?: boolean;
  repeatable?: boolean;
  cooldownSeconds?: number;
  
  dialogueIds?: string[];
  dialogueId?: string;
  conditionalDialogueIds?: Record<string, string[]>;
  
  questsToGive?: string[];
  questsToEnd?: string[];
  questRequirements?: Record<string, any>;
  questDialogueIds?: {
    questOffer?: string[];
    questInProgress?: string[];
    questComplete?: string[];
  };
  
  shopId?: string;
  
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
  
  isActive?: boolean;
  mongoDoc?: any;
  lastLoaded?: number;
}

interface NpcManagerConfig {
  useCache: boolean;
  cacheTTL: number;
  debugMode: boolean;
  strictValidation: boolean;
  hotReloadEnabled: boolean;
}

export class NpcManager {
  private npcsMap: Map<string, NpcData> = new Map();
  private npcsByZone: Map<string, NpcData[]> = new Map();
  
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  private loadedZones: Set<string> = new Set();
  private collisionManager: any = null;
  private validationErrors: Map<number, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  private mongoCache: Map<string, { data: NpcData[]; timestamp: number }> = new Map();
  
  private changeStream: any = null;
  private reloadCallbacks: Array<(event: string, npcData?: any) => void> = [];
  
  private config: NpcManagerConfig = {
    useCache: process.env.NPC_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.NPC_CACHE_TTL || '1800000'),
    debugMode: process.env.NODE_ENV === 'development',
    strictValidation: process.env.NODE_ENV === 'production',
    hotReloadEnabled: process.env.NPC_HOT_RELOAD !== 'false'
  };

  constructor(zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.lastLoadTime = Date.now();
  }

  get npcs(): NpcData[] {
    return Array.from(this.npcsMap.values());
  }

  async initialize(zoneName?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.isInitializing) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }
    
    this.isInitializing = true;
    
    this.initializationPromise = this.performInitialization(zoneName);
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } catch (error) {
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async performInitialization(zoneName?: string): Promise<void> {
    try {
      if (zoneName) {
        await this.loadNpcsForZone(zoneName);
      } else {
        await this.autoLoadFromMongoDB();
      }
    } catch (error) {
      throw error;
    }
  }

  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    if (!this.isInitialized && !this.isInitializing) {
      this.initialize().catch(error => {
        console.error(`❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    while ((!this.isInitialized || this.npcsMap.size === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.npcsMap.size > 0;
    
    if (loaded) {
      if (this.config.hotReloadEnabled) {
        this.startHotReload();
      }
    }
    
    return loaded;
  }

  private async loadNpcsForZone(zoneName: string): Promise<void> {
    try {
      await this.loadNpcsFromMongoDB(zoneName);
    } catch (error) {
      throw error;
    }
  }

  private async loadNpcsFromMongoDB(zoneName: string): Promise<void> {
    try {
      if (this.config.useCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.addNpcsToCollection(cached, zoneName);
          return;
        }
      }
      
      const mongoNpcs = await NpcData.findByZone(zoneName);
      
      if (mongoNpcs.length === 0) {
        const directCount = await NpcData.countDocuments({ zone: zoneName });
        this.loadedZones.add(zoneName);
        return;
      }
      
      const npcsData: NpcData[] = [];
      const conversionErrors: Array<{ index: number, doc: any, error: any }> = [];
      
      for (let i = 0; i < mongoNpcs.length; i++) {
        const mongoDoc = mongoNpcs[i];
        
        try {
          const converted = this.convertMongoDocToNpcData(mongoDoc, zoneName);
          npcsData.push(converted);
        } catch (error) {
          conversionErrors.push({
            index: i,
            doc: mongoDoc,
            error: error
          });
        }
      }
      
      if (npcsData.length > 0) {
        this.addNpcsToCollection(npcsData, zoneName);
        if (this.collisionManager) {
  this.addAllNpcsToCollision(npcsData);
}
      }
      
      if (this.config.useCache && npcsData.length > 0) {
        this.setCache(zoneName, npcsData);
      }
      
      this.loadedZones.add(zoneName);
      
    } catch (error) {
      this.loadedZones.add(zoneName);
      throw error;
    }
  }

  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      await this.waitForMongoDBReady();
      
      const zones = await NpcData.distinct('zone');
      
      for (const zoneName of zones) {
        try {
          await this.loadNpcsForZone(zoneName);
        } catch (error) {
          console.warn(`⚠️ Erreur zone ${zoneName}:`, error);
        }
      }
      
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
        
        const testCount = await NpcData.countDocuments();
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

  private convertMongoDocToNpcData(mongoDoc: any, zoneName: string): NpcData {
    try {
      let npcFormat: any;
      
      if (typeof mongoDoc.toNpcFormat === 'function') {
        npcFormat = mongoDoc.toNpcFormat();
      } else {
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
          shopId: mongoDoc.shopId,
          
          ...mongoDoc.npcData
        };
      }
      
      return {
        id: npcFormat.id,
        name: npcFormat.name,
        sprite: npcFormat.sprite,
        x: npcFormat.position.x,
        y: npcFormat.position.y,
        zone: zoneName,
        
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
        shopId: npcFormat.shopId,
        
        ...(mongoDoc.npcData || {}),
        
        lastLoaded: Date.now(),
        isActive: mongoDoc.isActive,
        mongoDoc: mongoDoc
      };
      
    } catch (error) {
      throw error;
    }
  }

  private addNpcsToCollection(npcsData: NpcData[], zoneName: string): void {
    for (const npc of npcsData) {
      const uniqueKey = `${zoneName}_${npc.id}`;
      this.npcsMap.set(uniqueKey, npc);
    }
    
    this.npcsByZone.set(zoneName, [...npcsData]);
  }

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

  private startHotReload(): void {
    try {
      this.changeStream = NpcData.watch([], { 
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
      console.error('❌ [HotReload] Impossible de démarrer:', error);
    }
  }

  private async handleMongoDBChange(change: any): Promise<void> {
    try {
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
      }
      
    } catch (error) {
      console.error('❌ [HotReload] Erreur traitement:', error);
    }
  }

  private async handleNpcInsert(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      const uniqueKey = `${zoneName}_${npcData.id}`;
      
      this.npcsMap.set(uniqueKey, npcData);
      
      const zoneNpcs = this.npcsByZone.get(zoneName) || [];
      zoneNpcs.push(npcData);
      this.npcsByZone.set(zoneName, zoneNpcs);
      
      this.loadedZones.add(zoneName);
      this.mongoCache.delete(zoneName);
      
      this.notifyReloadCallbacks('insert', npcData);
      this.addNpcToCollision(npcData);

    } catch (error) {
      console.error('❌ [HotReload] Erreur ajout:', error);
    }
  }

  private async handleNpcUpdate(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      const uniqueKey = `${zoneName}_${npcData.id}`;
      
      const existed = this.npcsMap.has(uniqueKey);
      this.npcsMap.set(uniqueKey, npcData);
      
      const zoneNpcs = this.npcsByZone.get(zoneName) || [];
      const existingIndex = zoneNpcs.findIndex(npc => npc.id === npcData.id);
      if (existingIndex >= 0) {
        zoneNpcs[existingIndex] = npcData;
      } else {
        zoneNpcs.push(npcData);
      }
      this.npcsByZone.set(zoneName, zoneNpcs);
      
      this.mongoCache.delete(zoneName);
      this.loadedZones.add(zoneName);
      
      this.notifyReloadCallbacks('update', npcData);
      this.addNpcToCollision(npcData);

    } catch (error) {
      console.error('❌ [HotReload] Erreur update:', error);
    }
  }

  private async handleNpcDelete(documentId: any): Promise<void> {
    try {
      let deletedNpc: NpcData | undefined;
      let keyToDelete: string | undefined;
      
      for (const [key, npc] of this.npcsMap) {
        if (npc.mongoDoc && npc.mongoDoc._id.equals(documentId)) {
          deletedNpc = npc;
          keyToDelete = key;
          break;
        }
      }
      
      if (deletedNpc && keyToDelete) {
        this.npcsMap.delete(keyToDelete);
        
        const zoneNpcs = this.npcsByZone.get(deletedNpc.zone) || [];
        const filteredZoneNpcs = zoneNpcs.filter(npc => npc.id !== deletedNpc!.id);
        this.npcsByZone.set(deletedNpc.zone, filteredZoneNpcs);
        
        this.mongoCache.delete(deletedNpc.zone);
        
        this.notifyReloadCallbacks('delete', deletedNpc);
        this.removeNpcFromCollision(deletedNpc.id);

      }
      
    } catch (error) {
      console.error('❌ [HotReload] Erreur suppression:', error);
    }
  }

  private notifyReloadCallbacks(event: string, npcData?: any): void {
    this.reloadCallbacks.forEach(callback => {
      try {
        callback(event, npcData);
      } catch (error) {
        console.error('❌ [HotReload] Erreur callback:', error);
      }
    });
  }

  public onNpcChange(callback: (event: string, npcData?: any) => void): void {
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
      enabled: this.config.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  getAllNpcs(): NpcData[] {
    return Array.from(this.npcsMap.values());
  }

getNpcById(id: number, serverZone?: string): NpcData | undefined {
  for (const npc of this.npcsMap.values()) {
    if (npc.id === id) {
      if (serverZone && npc.zone !== serverZone) {
        continue; // Skip si pas la bonne zone
      }
      return npc;
    }
  }
  return undefined;
}

  getNpcsByZone(zoneName: string): NpcData[] {
    return this.npcsByZone.get(zoneName) || [];
  }

  getNpcsByType(type: NpcType): NpcData[] {
    return Array.from(this.npcsMap.values()).filter(npc => npc.type === type);
  }
  
  getNpcsInRadius(centerX: number, centerY: number, radius: number): NpcData[] {
    return Array.from(this.npcsMap.values()).filter(npc => {
      const distance = Math.sqrt(
        Math.pow(npc.x - centerX, 2) + 
        Math.pow(npc.y - centerY, 2)
      );
      return distance <= radius;
    });
  }
  
  getQuestGivers(): NpcData[] {
    return Array.from(this.npcsMap.values()).filter(npc => npc.questsToGive && npc.questsToGive.length > 0);
  }
  
  getQuestEnders(): NpcData[] {
    return Array.from(this.npcsMap.values()).filter(npc => npc.questsToEnd && npc.questsToEnd.length > 0);
  }

  getMerchants(): NpcData[] {
    return Array.from(this.npcsMap.values()).filter(npc => npc.type === 'merchant' || npc.shopId);
  }
  
  isZoneLoaded(zoneName: string): boolean {
    return this.loadedZones.has(zoneName);
  }
  
  getLoadedZones(): string[] {
    return Array.from(this.loadedZones);
  }

  async reloadZoneFromMongoDB(zoneName: string): Promise<boolean> {
    try {
      const npcsToRemove: string[] = [];
      for (const [key, npc] of this.npcsMap) {
        if (npc.zone === zoneName) {
          npcsToRemove.push(key);
        }
      }
      
      npcsToRemove.forEach(key => this.npcsMap.delete(key));
      this.npcsByZone.delete(zoneName);
      this.mongoCache.delete(zoneName);
      this.loadedZones.delete(zoneName);
      
      await this.loadNpcsFromMongoDB(zoneName);
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  getSystemStats() {
    const npcsByType: Record<string, number> = {};
    const npcsByZone: Record<string, number> = {};
    
    for (const npc of this.npcsMap.values()) {
      if (npc.type) {
        npcsByType[npc.type] = (npcsByType[npc.type] || 0) + 1;
      }
      npcsByZone[npc.zone] = (npcsByZone[npc.zone] || 0) + 1;
    }
    
    return {
      totalNpcs: this.npcsMap.size,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      sources: {
        mongodb: this.npcsMap.size,
        json: 0
      },
      zones: {
        loaded: Array.from(this.loadedZones),
        count: this.loadedZones.size
      },
      npcsByType,
      npcsByZone,
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

  public cleanup(): void {
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.validationErrors.clear();
    this.npcsMap.clear();
    this.npcsByZone.clear();
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
  }

  debugSystem(): void {
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs MONGODB ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs (premiers 10):`);
    const npcsArray = Array.from(this.npcsMap.values());
    for (const npc of npcsArray.slice(0, 10)) {
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type || 'legacy'}) - Zone: ${npc.zone} - Shop: ${npc.shopId || 'N/A'}`);
    }
    
    console.log(`\n🗺️ NPCs par zone:`);
    for (const [zone, npcs] of this.npcsByZone) {
      console.log(`  📍 ${zone}: ${npcs.length} NPCs`);
    }
    
    console.log(`\n🔥 Hot Reload:`, this.getHotReloadStatus());
    console.log(`\n💾 Cache: ${this.mongoCache.size} zones en cache`);
    console.log(`\n⚙️ Config:`, this.config);
  }
  setCollisionManager(collisionManager: any): void {
  this.collisionManager = collisionManager;
  console.log(`🎯 [NPCManager] CollisionManager configuré`);
}

private addAllNpcsToCollision(npcsData: any[]): void {
  for (const npc of npcsData) {
    this.addNpcToCollision(npc);
  }
}

private addNpcToCollision(npc: any): void {
  if (!this.collisionManager) return;

  const config = npc.collisionConfig;
  const width = config?.width || 16;
  const height = config?.height || 16;
  const offsetX = config?.offsetX || 0;
  const offsetY = config?.offsetY || 0;

  const finalX = npc.x + offsetX;
  const finalY = npc.y + offsetY;

  if (config?.enabled !== false) {
    this.collisionManager.addNpcCollision(npc.id, finalX, finalY, width, height);
  }
}

private removeNpcFromCollision(npcId: number): void {
  if (!this.collisionManager) return;
  this.collisionManager.removeNpcCollision(npcId);
}
}
