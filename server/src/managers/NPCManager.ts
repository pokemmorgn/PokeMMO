// PokeMMO/server/src/managers/NPCManager.ts
// Version MongoDB uniquement - Support JSON retiré

import { NpcData } from "../models/NpcData";
import { 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

// ✅ INTERFACE SIMPLIFIÉE - MongoDB uniquement
export interface NpcData {
  // === PROPRIÉTÉS DE BASE ===
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  zone: string; // Toujours requis maintenant
  
  // === PROPRIÉTÉS ÉTENDUES ===
  type?: NpcType;
  position?: { x: number; y: number };
  direction?: Direction;
  interactionRadius?: number;
  canWalkAway?: boolean;
  autoFacePlayer?: boolean;
  repeatable?: boolean;
  cooldownSeconds?: number;
  
  // Système de dialogue
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
  
  // Propriétés spécialisées par type
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
  
  // Métadonnées MongoDB
  isActive?: boolean;
  mongoDoc?: any;
  lastLoaded?: number;
}

// ✅ CONFIGURATION SIMPLIFIÉE
interface NpcManagerConfig {
  useCache: boolean;
  cacheTTL: number;
  debugMode: boolean;
  strictValidation: boolean;
  hotReloadEnabled: boolean;
}

export class NpcManager {
  npcs: NpcData[] = [];
  
  // ✅ FLAGS D'ÉTAT
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // ✅ PROPRIÉTÉS SIMPLIFIÉES
  private loadedZones: Set<string> = new Set();
  private validationErrors: Map<number, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  // Cache MongoDB
  private mongoCache: Map<string, { data: NpcData[]; timestamp: number }> = new Map();
  
  // Hot Reload
  private changeStream: any = null;
  private reloadCallbacks: Array<(event: string, npcData?: any) => void> = [];
  
  // ✅ CONFIGURATION SIMPLIFIÉE
  private config: NpcManagerConfig = {
    useCache: process.env.NPC_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.NPC_CACHE_TTL || '1800000'),
    debugMode: process.env.NODE_ENV === 'development',
    strictValidation: process.env.NODE_ENV === 'production',
    hotReloadEnabled: process.env.NPC_HOT_RELOAD !== 'false'
  };

  // ✅ CONSTRUCTEUR SIMPLIFIÉ
  constructor(zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [NpcManager] Construction MongoDB uniquement`, {
      zoneName,
      autoScan: !zoneName,
      config: this.config
    });

    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [NpcManager] Construit (MongoDB uniquement)`);
  }

  // ✅ INITIALISATION ASYNCHRONE
  async initialize(zoneName?: string): Promise<void> {
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
    this.log('info', `🔄 [NpcManager] Démarrage initialisation MongoDB...`);
    
    this.initializationPromise = this.performInitialization(zoneName);
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.log('info', `✅ [NpcManager] Initialisation terminée`, {
        totalNpcs: this.npcs.length,
        zones: Array.from(this.loadedZones)
      });
    } catch (error) {
      this.log('error', `❌ [NpcManager] Erreur initialisation:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // ✅ LOGIQUE D'INITIALISATION SIMPLIFIÉE
  private async performInitialization(zoneName?: string): Promise<void> {
    try {
      if (zoneName) {
        this.log('info', `🎯 [NpcManager] Chargement zone: ${zoneName}`);
        await this.loadNpcsForZone(zoneName);
      } else {
        this.log('info', `🔍 [NpcManager] Auto-scan MongoDB activé`);
        await this.autoLoadFromMongoDB();
      }
    } catch (error) {
      this.log('error', `❌ [NpcManager] Erreur initialisation:`, error);
      throw error;
    }
  }

  // ✅ ATTENDRE LE CHARGEMENT
  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente chargement NPCs (timeout: ${timeoutMs}ms)...`);
    
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [WaitForLoad] Lancement initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    while ((!this.isInitialized || this.npcs.length === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.npcs.length > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] ${this.npcs.length} NPCs chargés en ${loadTime}ms`);
      this.log('info', `🗺️ [WaitForLoad] Zones: ${Array.from(this.loadedZones).join(', ')}`);
      
      if (this.config.hotReloadEnabled) {
        this.startHotReload();
      }
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms`);
    }
    
    return loaded;
  }

  // ✅ CHARGEMENT D'UNE ZONE SPÉCIFIQUE
  private async loadNpcsForZone(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    this.log('info', `🎯 [Zone: ${zoneName}] Chargement MongoDB...`);
    
    try {
      await this.loadNpcsFromMongoDB(zoneName);
      
      const loadTime = Date.now() - startTime;
      this.log('info', `✅ [Zone: ${zoneName}] Chargé en ${loadTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [Zone: ${zoneName}] Erreur:`, error);
      throw error;
    }
  }

  // ✅ CHARGEMENT MONGODB POUR UNE ZONE
  private async loadNpcsFromMongoDB(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache
      if (this.config.useCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.log('info', `💾 [MongoDB Cache] Zone ${zoneName} trouvée`);
          this.addNpcsToCollection(cached);
          return;
        }
      }
      
      this.log('info', `🗄️ [MongoDB] Chargement zone ${zoneName}...`);
      
      const mongoNpcs = await NpcData.findByZone(zoneName);
      
      const npcsData: NpcData[] = mongoNpcs.map(mongoDoc => 
        this.convertMongoDocToNpcData(mongoDoc, zoneName)
      );
      
      this.addNpcsToCollection(npcsData);
      
      if (this.config.useCache) {
        this.setCache(zoneName, npcsData);
      }
      
      this.loadedZones.add(zoneName);
      
      const queryTime = Date.now() - startTime;
      this.log('info', `✅ [MongoDB] Zone ${zoneName}: ${npcsData.length} NPCs en ${queryTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur zone ${zoneName}:`, error);
      throw error;
    }
  }

  // ✅ AUTO-SCAN MONGODB
  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      this.log('info', '🗄️ [Auto-scan] Vérification MongoDB...');
      
      await this.waitForMongoDBReady();
      
      const zones = await NpcData.distinct('zone');
      
      this.log('info', `📋 [MongoDB] ${zones.length} zones trouvées: ${zones.join(', ')}`);
      
      for (const zoneName of zones) {
        try {
          await this.loadNpcsForZone(zoneName);
        } catch (error) {
          this.log('warn', `⚠️ Erreur zone ${zoneName}:`, error);
        }
      }
      
      this.log('info', `🎉 [Auto-scan] Terminé: ${this.npcs.length} NPCs chargés`);
      
    } catch (error) {
      this.log('error', '❌ [Auto-scan MongoDB] Erreur:', error);
      throw error;
    }
  }

  // ✅ PING MONGODB
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
        
        const testCount = await NpcData.countDocuments();
        this.log('info', `✅ [MongoDB Ping] ${testCount} NPCs détectés`);
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        this.log('warn', `⚠️ [MongoDB Ping] Échec ${retries}/${maxRetries}`);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ✅ CONVERSION MONGODB VERS NPCDATA
  private convertMongoDocToNpcData(mongoDoc: any, zoneName: string): NpcData {
    try {
      let npcFormat: any;
      
      if (typeof mongoDoc.toNpcFormat === 'function') {
        npcFormat = mongoDoc.toNpcFormat();
      } else {
        // Conversion manuelle pour Change Streams
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
        
        ...(mongoDoc.npcData || {}),
        
        lastLoaded: Date.now(),
        isActive: mongoDoc.isActive,
        mongoDoc: mongoDoc
      };
      
    } catch (error) {
      this.log('error', '❌ [convertMongoDocToNpcData] Erreur:', error);
      throw error;
    }
  }

  // ✅ AJOUTER NPCS À LA COLLECTION
  private addNpcsToCollection(npcsData: NpcData[]): void {
    for (const npc of npcsData) {
      const existingIndex = this.npcs.findIndex(existing => existing.id === npc.id);
      
      if (existingIndex >= 0) {
        this.npcs[existingIndex] = npc;
      } else {
        this.npcs.push(npc);
      }
    }
  }

  // ✅ GESTION DU CACHE
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

  // ✅ HOT RELOAD - DÉMARRAGE
  private startHotReload(): void {
    try {
      this.log('info', '🔥 [HotReload] Démarrage Change Streams...');
      
      this.changeStream = NpcData.watch([], { 
        fullDocument: 'updateLookup'
      });
      
      this.changeStream.on('change', (change: any) => {
        this.handleMongoDBChange(change);
      });
      
      this.changeStream.on('error', (error: any) => {
        this.log('error', '❌ [HotReload] Erreur:', error);
        
        setTimeout(() => {
          this.log('info', '🔄 [HotReload] Redémarrage...');
          this.startHotReload();
        }, 5000);
      });
      
      this.log('info', '✅ [HotReload] Change Streams actif!');
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Impossible de démarrer:', error);
    }
  }

  // ✅ HOT RELOAD - GESTION DES CHANGEMENTS
  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      this.log('info', `🔥 [HotReload] ${change.operationType}`);
      
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
      this.log('error', '❌ [HotReload] Erreur traitement:', error);
    }
  }

  private async handleNpcInsert(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      
      this.npcs.push(npcData);
      this.loadedZones.add(zoneName);
      this.mongoCache.delete(zoneName);
      
      this.log('info', `➕ [HotReload] NPC ajouté: ${npcData.name} (${npcData.id}) dans ${zoneName}`);
      this.notifyReloadCallbacks('insert', npcData);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur ajout:', error);
    }
  }

  private async handleNpcUpdate(mongoDoc: any): Promise<void> {
    try {
      const zoneName = mongoDoc.zone;
      const npcData = this.convertMongoDocToNpcData(mongoDoc, zoneName);
      
      const existingIndex = this.npcs.findIndex(npc => npc.id === npcData.id);
      if (existingIndex >= 0) {
        this.npcs[existingIndex] = npcData;
        this.log('info', `🔄 [HotReload] NPC mis à jour: ${npcData.name} (${npcData.id})`);
      } else {
        this.npcs.push(npcData);
        this.log('info', `➕ [HotReload] NPC ajouté: ${npcData.name} (${npcData.id})`);
      }
      
      this.mongoCache.delete(zoneName);
      this.loadedZones.add(zoneName);
      this.notifyReloadCallbacks('update', npcData);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur update:', error);
    }
  }

  private async handleNpcDelete(documentId: any): Promise<void> {
    try {
      const npcIndex = this.npcs.findIndex(npc => 
        npc.mongoDoc && npc.mongoDoc._id.equals(documentId)
      );
      
      if (npcIndex >= 0) {
        const deletedNpc = this.npcs[npcIndex];
        
        this.npcs.splice(npcIndex, 1);
        this.mongoCache.delete(deletedNpc.zone);
        
        this.log('info', `➖ [HotReload] NPC supprimé: ${deletedNpc.name} (${deletedNpc.id})`);
        this.notifyReloadCallbacks('delete', deletedNpc);
        
      } else {
        this.log('warn', `⚠️ [HotReload] NPC à supprimer non trouvé`);
      }
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur suppression:', error);
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
      this.log('info', '🛑 [HotReload] Arrêté');
    }
  }

  public getHotReloadStatus(): { enabled: boolean; active: boolean; callbackCount: number } {
    return {
      enabled: this.config.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  // ✅ MÉTHODES PUBLIQUES - ACCÈS AUX DONNÉES
  getAllNpcs(): NpcData[] {
    return this.npcs;
  }

  getNpcById(id: number): NpcData | undefined {
    return this.npcs.find(npc => npc.id === id);
  }

  getNpcsByZone(zoneName: string): NpcData[] {
    return this.npcs.filter(npc => npc.zone === zoneName);
  }

  getNpcsByType(type: NpcType): NpcData[] {
    return this.npcs.filter(npc => npc.type === type);
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

  // ✅ RECHARGEMENT DE ZONE
  async reloadZoneFromMongoDB(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Zone ${zoneName}`);
      
      this.mongoCache.delete(zoneName);
      this.npcs = this.npcs.filter(npc => npc.zone !== zoneName);
      this.loadedZones.delete(zoneName);
      
      await this.loadNpcsFromMongoDB(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur ${zoneName}:`, error);
      return false;
    }
  }

  // ✅ STATISTIQUES SYSTÈME
  getSystemStats() {
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

  // ✅ NETTOYAGE
  public cleanup(): void {
    this.log('info', '🧹 [NpcManager] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.validationErrors.clear();
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [NpcManager] Nettoyage terminé');
  }

  // ✅ DEBUG
  debugSystem(): void {
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs MONGODB ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs (premiers 10):`);
    for (const npc of this.npcs.slice(0, 10)) {
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type || 'legacy'}) - Zone: ${npc.zone}`);
    }
    
    console.log(`\n🔥 Hot Reload:`, this.getHotReloadStatus());
    console.log(`\n💾 Cache: ${this.mongoCache.size} zones en cache`);
    console.log(`\n⚙️ Config:`, this.config);
  }

  // ✅ LOGGING
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
