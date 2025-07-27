// PokeMMO/server/src/managers/NPCManager.ts
// Version MongoDB Only - Support JSON retiré

import { NpcData } from "../models/NpcData";
import { 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

// ✅ INTERFACE SIMPLIFIÉE
export interface NpcData {
  // Propriétés de base
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  zone: string; // Toujours requis maintenant
  
  // Propriétés étendues MongoDB
  type: NpcType;
  position: { x: number; y: number };
  direction: Direction;
  interactionRadius: number;
  canWalkAway: boolean;
  autoFacePlayer: boolean;
  repeatable: boolean;
  cooldownSeconds: number;
  
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
  
  // Métadonnées
  isActive: boolean;
  lastLoaded: number;
  mongoDoc: any;
}

// ✅ CONFIGURATION SIMPLIFIÉE
interface NpcManagerConfig {
  useCache: boolean;
  cacheTTL: number;
  strictValidation: boolean;
  debugMode: boolean;
  hotReloadEnabled: boolean;
  maxRetries: number;
}

export class NpcManager {
  npcs: NpcData[] = [];
  
  // État d'initialisation
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Cache et zones
  private loadedZones: Set<string> = new Set();
  private mongoCache: Map<string, { data: NpcData[]; timestamp: number }> = new Map();
  private lastLoadTime: number = 0;
  
  // Hot Reload
  private changeStream: any = null;
  private reloadCallbacks: Array<(event: string, npcData?: any) => void> = [];
  
  // Configuration
  private config: NpcManagerConfig = {
    useCache: process.env.NPC_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.NPC_CACHE_TTL || '1800000'), // 30 min
    strictValidation: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    hotReloadEnabled: process.env.NPC_HOT_RELOAD !== 'false',
    maxRetries: 5
  };

  constructor(zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [NpcManager MongoDB] Construction`, {
      zoneName,
      autoScan: !zoneName,
      config: this.config
    });

    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [NpcManager MongoDB] Construit (prêt pour initialisation)`, {
      totalNpcs: this.npcs.length,
      needsInitialization: true
    });
  }

  // ===================================================================
  // 🚀 INITIALISATION SIMPLIFIÉE
  // ===================================================================

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
    
    this.initializationPromise = this.performMongoDBInitialization(zoneName);
    
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

  private async performMongoDBInitialization(zoneName?: string): Promise<void> {
    try {
      // Vérifier MongoDB
      await this.waitForMongoDBReady();
      
      if (zoneName) {
        // Mode spécifique
        this.log('info', `🎯 [NpcManager] Chargement zone: ${zoneName}`);
        await this.loadNpcsForZone(zoneName);
      } else {
        // Mode auto-scan
        this.log('info', `🔍 [NpcManager] Auto-scan MongoDB activé`);
        await this.autoLoadFromMongoDB();
      }
      
      // Démarrer Hot Reload après chargement réussi
      if (this.config.hotReloadEnabled) {
        this.startHotReload();
      }
      
    } catch (error) {
      this.log('error', `❌ [NpcManager] Erreur initialisation MongoDB:`, error);
      throw error;
    }
  }

  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente chargement NPCs (timeout: ${timeoutMs}ms)...`);
    
    // Lancer l'initialisation si pas encore fait
    if (!this.isInitialized && !this.isInitializing) {
      this.log('info', `🚀 [WaitForLoad] Lancement initialisation...`);
      this.initialize().catch(error => {
        this.log('error', `❌ [WaitForLoad] Erreur initialisation:`, error);
      });
    }
    
    // Attendre l'initialisation
    while ((!this.isInitialized || this.npcs.length === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.npcs.length > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] NPCs chargés: ${this.npcs.length} NPCs en ${loadTime}ms`);
      this.log('info', `🗺️  [WaitForLoad] Zones: ${Array.from(this.loadedZones).join(', ')}`);
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms`);
    }
    
    return loaded;
  }

  // ===================================================================
  // 🗄️ CHARGEMENT MONGODB
  // ===================================================================

  private async loadNpcsForZone(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache
      if (this.config.useCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.log('info', `💾 [Cache] Zone ${zoneName} trouvée en cache`);
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
      this.log('error', `❌ [MongoDB] Erreur chargement zone ${zoneName}:`, error);
      throw error;
    }
  }

  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      this.log('info', '🗄️ [Auto-scan] Récupération zones MongoDB...');
      
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
      this.log('error', '❌ [Auto-scan] Erreur:', error);
      throw error;
    }
  }

  private async waitForMongoDBReady(maxRetries: number = 10): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        this.log('info', `🏓 [MongoDB] Test connexion ${retries + 1}/${maxRetries}...`);
        
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Mongoose pas connecté');
        }
        
        await mongoose.connection.db.admin().ping();
        
        const testCount = await NpcData.countDocuments();
        this.log('info', `✅ [MongoDB] Prêt ! ${testCount} NPCs détectés`);
        return;
        
      } catch (error) {
        retries++;
        const waitTime = Math.min(1000 * retries, 5000);
        
        this.log('warn', `⚠️ [MongoDB] Échec ${retries}/${maxRetries}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        
        if (retries >= maxRetries) {
          throw new Error(`MongoDB non prêt après ${maxRetries} tentatives`);
        }
        
        this.log('info', `⏳ [MongoDB] Attente ${waitTime}ms avant retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // ===================================================================
  // 🔄 CONVERSION ET GESTION
  // ===================================================================

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
        
        isActive: mongoDoc.isActive !== false,
        lastLoaded: Date.now(),
        mongoDoc: mongoDoc
      };
      
    } catch (error) {
      this.log('error', '❌ [Conversion] Erreur:', error);
      throw error;
    }
  }

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

  // ===================================================================
  // 💾 CACHE
  // ===================================================================

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

  // ===================================================================
  // 🔥 HOT RELOAD
  // ===================================================================

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
        setTimeout(() => this.startHotReload(), 5000);
      });
      
      this.log('info', '✅ [HotReload] Actif !');
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Impossible de démarrer:', error);
    }
  }

  private async handleMongoDBChange(change: any): Promise<void> {
    try {
      this.log('info', `🔥 [HotReload] ${change.operationType} détecté`);
      
      switch (change.operationType) {
        case 'insert':
          await this.handleNpcInsert(change.fullDocument);
          break;
        case 'update':
        case 'replace':
          await this.handleNpcUpdate(change.fullDocument);
          break;
        case 'delete':
          await this.handleNpcDelete(change.documentKey._id);
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
      } else {
        this.npcs.push(npcData);
      }
      
      this.mongoCache.delete(zoneName);
      this.loadedZones.add(zoneName);
      
      this.log('info', `🔄 [HotReload] NPC mis à jour: ${npcData.name} (${npcData.id})`);
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

  // ===================================================================
  // 📋 MÉTHODES PUBLIQUES SIMPLIFIÉES
  // ===================================================================

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

  getNpcsInRadius(centerX: number, centerY: number, radius: number, zoneName?: string): NpcData[] {
    return this.npcs
      .filter(npc => !zoneName || npc.zone === zoneName)
      .filter(npc => {
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

  // ===================================================================
  // 🔧 ADMINISTRATION
  // ===================================================================

  async reloadZone(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement zone ${zoneName}...`);
      
      this.mongoCache.delete(zoneName);
      this.npcs = this.npcs.filter(npc => npc.zone !== zoneName);
      this.loadedZones.delete(zoneName);
      
      await this.loadNpcsForZone(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur:`, error);
      return false;
    }
  }

  onNpcChange(callback: (event: string, npcData?: any) => void): void {
    this.reloadCallbacks.push(callback);
    this.log('info', `📋 [HotReload] Callback enregistré (total: ${this.reloadCallbacks.length})`);
  }

  stopHotReload(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      this.log('info', '🛑 [HotReload] Arrêté');
    }
  }

  getHotReloadStatus(): { enabled: boolean; active: boolean; callbackCount: number } {
    return {
      enabled: this.config.hotReloadEnabled,
      active: !!this.changeStream,
      callbackCount: this.reloadCallbacks.length
    };
  }

  getSystemStats() {
    const npcsByType: Record<string, number> = {};
    const npcsByZone: Record<string, number> = {};
    
    for (const npc of this.npcs) {
      npcsByType[npc.type] = (npcsByType[npc.type] || 0) + 1;
      npcsByZone[npc.zone] = (npcsByZone[npc.zone] || 0) + 1;
    }
    
    return {
      totalNpcs: this.npcs.length,
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      source: 'mongodb_only',
      zones: {
        loaded: Array.from(this.loadedZones),
        count: this.loadedZones.size
      },
      npcsByType,
      npcsByZone,
      lastLoadTime: this.lastLoadTime,
      config: this.config,
      cache: {
        size: this.mongoCache.size,
        ttl: this.config.cacheTTL
      },
      hotReload: this.getHotReloadStatus()
    };
  }

  cleanup(): void {
    this.log('info', '🧹 [Cleanup] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [Cleanup] Terminé');
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

  debugSystem(): void {
    console.log(`🔍 [NpcManager MongoDB] === DEBUG SYSTÈME ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Stats:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs (premiers 10):`);
    for (const npc of this.npcs.slice(0, 10)) {
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type}) - Zone: ${npc.zone}`);
    }
    
    console.log(`\n🔥 Hot Reload:`, this.getHotReloadStatus());
    console.log(`⚙️ Config:`, this.config);
  }
}
