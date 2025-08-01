// PokeMMO/server/src/managers/NPCManager.ts
// Version MongoDB uniquement - Support JSON retiré
// 🔧 VERSION CORRIGÉE - Fix accumulation des NPCs

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
  // 🔧 FIX MAJEUR: Utiliser Map au lieu d'Array pour éviter les doublons
  private npcsMap: Map<string, NpcData> = new Map(); // clé = zone_npcId
  private npcsByZone: Map<string, NpcData[]> = new Map(); // pour accès rapide par zone
  
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

  // 🔧 GETTER pour compatibilité avec l'ancien code
  get npcs(): NpcData[] {
    return Array.from(this.npcsMap.values());
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
        totalNpcs: this.npcsMap.size,
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
    
    while ((!this.isInitialized || this.npcsMap.size === 0) && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const loaded = this.isInitialized && this.npcsMap.size > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] ${this.npcsMap.size} NPCs chargés en ${loadTime}ms`);
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

  // 🔧 CHARGEMENT MONGODB POUR UNE ZONE AVEC DEBUG COMPLET ET FIX ACCUMULATION
  private async loadNpcsFromMongoDB(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    console.log(`🗄️ [MongoDB DEBUG] === CHARGEMENT ZONE ${zoneName} ===`);
    console.log(`⏰ Début: ${new Date().toISOString()}`);
    
    // 🔧 DEBUG: État AVANT chargement
    console.log(`🔍 [DEBUG AVANT] Total NPCs globaux AVANT chargement: ${this.npcsMap.size}`);
    console.log(`🔍 [DEBUG AVANT] Zones déjà chargées: ${Array.from(this.loadedZones).join(', ')}`);
    
    try {
      // ✅ ÉTAPE 1: Vérifier le cache
      if (this.config.useCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          console.log(`💾 [Cache HIT] Zone ${zoneName}: ${cached.length} NPCs depuis cache`);
          this.addNpcsToCollection(cached, zoneName);
          return;
        } else {
          console.log(`💾 [Cache MISS] Zone ${zoneName}: pas en cache, requête MongoDB`);
        }
      }
      
      // ✅ ÉTAPE 2: Requête MongoDB avec debug détaillé
      console.log(`🔍 [MongoDB QUERY] Recherche NPCs pour zone: "${zoneName}"`);
      console.log(`🔍 [MongoDB QUERY] Utilisation de: NpcData.findByZone("${zoneName}")`);
      
      const mongoNpcs = await NpcData.findByZone(zoneName);
      
      console.log(`📊 [MongoDB RESULT] Zone "${zoneName}": ${mongoNpcs.length} documents récupérés`);
      
      // ✅ ÉTAPE 3: Debug des documents récupérés
      if (mongoNpcs.length === 0) {
        console.warn(`⚠️ [MongoDB EMPTY] Aucun NPC trouvé pour zone "${zoneName}"`);
        console.warn(`🔍 [MongoDB DEBUG] Vérification: est-ce que la zone existe dans la base ?`);
        
        // Test: compter tous les NPCs avec cette zone
        const directCount = await NpcData.countDocuments({ zone: zoneName });
        console.warn(`🔍 [MongoDB COUNT] Count direct: ${directCount} NPCs pour zone "${zoneName}"`);
        
        // Test: voir les zones similaires
        const similarZones = await NpcData.distinct('zone', { 
          zone: { $regex: zoneName.substring(0, 4), $options: 'i' } 
        });
        console.warn(`🔍 [MongoDB SIMILAR] Zones similaires à "${zoneName}":`, similarZones);
        
        this.loadedZones.add(zoneName);
        return;
      }
      
      // ✅ ÉTAPE 4: Debug détaillé de chaque document
      console.log(`🧪 [MongoDB DOCS] Analyse détaillée des ${mongoNpcs.length} documents...`);
      
      mongoNpcs.forEach((doc, index) => {
        console.log(`📄 [DOC ${index + 1}/${mongoNpcs.length}] Structure:`, {
          _id: doc._id,
          npcId: doc.npcId,
          name: doc.name,
          zone: doc.zone,
          sprite: doc.sprite,
          position: doc.position,
          hasToNpcFormat: typeof doc.toNpcFormat === 'function',
          type: doc.type,
          isActive: doc.isActive
        });
      });
      
      // ✅ ÉTAPE 5: Conversion avec gestion d'erreur individuelle
      console.log(`🔄 [CONVERSION] Début conversion ${mongoNpcs.length} documents...`);
      
      const npcsData: NpcData[] = [];
      const conversionErrors: Array<{ index: number, doc: any, error: any }> = [];
      
      for (let i = 0; i < mongoNpcs.length; i++) {
        const mongoDoc = mongoNpcs[i];
        
        try {
          console.log(`🔄 [CONVERT ${i + 1}/${mongoNpcs.length}] Traitement NPC: ${mongoDoc.name || 'SANS_NOM'} (ID: ${mongoDoc.npcId})`);
          
          const converted = this.convertMongoDocToNpcData(mongoDoc, zoneName);
          
          console.log(`✅ [CONVERT ${i + 1}] Succès: ${converted.name} → Position (${converted.x}, ${converted.y})`);
          console.log(`✅ [CONVERT ${i + 1}] Détails:`, {
            id: converted.id,
            sprite: converted.sprite,
            type: converted.type,
            zone: converted.zone
          });
          
          npcsData.push(converted);
          
        } catch (error) {
          console.error(`❌ [CONVERT ERROR ${i + 1}] NPC: ${mongoDoc.name || 'SANS_NOM'}`);
          console.error(`❌ [CONVERT ERROR ${i + 1}] Document:`, {
            _id: mongoDoc._id,
            npcId: mongoDoc.npcId,
            name: mongoDoc.name,
            zone: mongoDoc.zone,
            position: mongoDoc.position,
            sprite: mongoDoc.sprite
          });
          console.error(`❌ [CONVERT ERROR ${i + 1}] Erreur:`, error instanceof Error ? error.message : String(error));
          console.error(`❌ [CONVERT ERROR ${i + 1}] Stack:`, error instanceof Error ? error.stack : 'N/A');
          
          conversionErrors.push({
            index: i,
            doc: mongoDoc,
            error: error
          });
          
          // ✅ CONTINUER au lieu de s'arrêter
          console.warn(`⚠️ [CONVERT SKIP ${i + 1}] Passage au NPC suivant...`);
        }
      }
      
      // ✅ ÉTAPE 6: Rapport de conversion
      console.log(`📊 [CONVERSION REPORT] Zone "${zoneName}"`);
      console.log(`📊 Documents récupérés: ${mongoNpcs.length}`);
      console.log(`📊 Conversions réussies: ${npcsData.length}`);
      console.log(`📊 Erreurs de conversion: ${conversionErrors.length}`);
      
      if (conversionErrors.length > 0) {
        console.error(`❌ [CONVERSION ERRORS] ${conversionErrors.length} NPCs n'ont pas pu être convertis:`);
        conversionErrors.forEach(({ index, doc, error }) => {
          console.error(`  - NPC ${index + 1}: ${doc.name || 'SANS_NOM'} (ID: ${doc.npcId}) → ${error instanceof Error ? error.message : String(error)}`);
        });
      }
      
      // 🔧 ÉTAPE 7: Ajout à la collection finale AVEC ACCUMULATION
      if (npcsData.length > 0) {
        console.log(`📥 [COLLECTION] Ajout de ${npcsData.length} NPCs à la collection...`);
        
        // 🔧 DEBUG: État AVANT ajout
        console.log(`🔍 [DEBUG AVANT AJOUT] Total NPCs globaux: ${this.npcsMap.size}`);
        
        this.addNpcsToCollection(npcsData, zoneName);
        
        console.log(`✅ [COLLECTION] NPCs ajoutés avec succès`);
        
        // 🔧 DEBUG: État APRÈS ajout - DOIT MONTRER L'ACCUMULATION
        const totalInMemory = this.npcsMap.size;
        const zoneInMemory = this.npcsByZone.get(zoneName)?.length || 0;
        console.log(`📊 [MEMORY CHECK] Total NPCs GLOBAUX en mémoire: ${totalInMemory}`);
        console.log(`📊 [MEMORY CHECK] NPCs zone "${zoneName}" en mémoire: ${zoneInMemory}`);
        
        // 🔧 DEBUG DÉTAILLÉ: Vérifier que l'accumulation fonctionne
        console.log(`🔍 [DEBUG ACCUMULATION] Zones avec NPCs:`);
        for (const [zone, npcs] of this.npcsByZone) {
          console.log(`  - ${zone}: ${npcs.length} NPCs`);
        }
        
      } else {
        console.error(`❌ [COLLECTION] Aucun NPC valide à ajouter pour zone "${zoneName}"`);
      }
      
      // ✅ ÉTAPE 8: Cache
      if (this.config.useCache && npcsData.length > 0) {
        console.log(`💾 [CACHE SET] Mise en cache de ${npcsData.length} NPCs pour zone "${zoneName}"`);
        this.setCache(zoneName, npcsData);
      }
      
      // ✅ ÉTAPE 9: Marquer la zone comme chargée
      this.loadedZones.add(zoneName);
      
      const queryTime = Date.now() - startTime;
      console.log(`✅ [MongoDB COMPLETE] Zone "${zoneName}": ${npcsData.length}/${mongoNpcs.length} NPCs chargés en ${queryTime}ms`);
      
      // 🔧 DEBUG FINAL: État global après cette zone
      console.log(`🔍 [DEBUG FINAL] Total NPCs globaux APRÈS zone "${zoneName}": ${this.npcsMap.size}`);
      
    } catch (error) {
      console.error(`❌ [MongoDB CRITICAL] Erreur critique zone "${zoneName}":`, error);
      console.error(`❌ [MongoDB CRITICAL] Type erreur:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`❌ [MongoDB CRITICAL] Message:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [MongoDB CRITICAL] Stack:`, error instanceof Error ? error.stack : 'N/A');
      
      // ✅ Essayer de marquer la zone comme chargée même en cas d'erreur
      this.loadedZones.add(zoneName);
      
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
      
      this.log('info', `🎉 [Auto-scan] Terminé: ${this.npcsMap.size} NPCs chargés`);
      
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

  // 🔧 MÉTHODE CORRIGÉE: AJOUTER NPCS À LA COLLECTION AVEC ACCUMULATION
  private addNpcsToCollection(npcsData: NpcData[], zoneName: string): void {
    console.log(`🔧 [ADD NPCS] Début ajout de ${npcsData.length} NPCs pour zone "${zoneName}"`);
    console.log(`🔧 [ADD NPCS] État AVANT: ${this.npcsMap.size} NPCs globaux`);
    
    // ✅ Ajouter chaque NPC à la Map globale avec une clé unique
    for (const npc of npcsData) {
      const uniqueKey = `${zoneName}_${npc.id}`;
      
      // Vérifier si le NPC existe déjà
      if (this.npcsMap.has(uniqueKey)) {
        console.log(`🔄 [ADD NPCS] Mise à jour NPC existant: ${uniqueKey}`);
      } else {
        console.log(`➕ [ADD NPCS] Ajout nouveau NPC: ${uniqueKey}`);
      }
      
      // ✅ AJOUT/MISE À JOUR dans la Map globale
      this.npcsMap.set(uniqueKey, npc);
    }
    
    // ✅ Stocker les NPCs par zone pour accès rapide
    this.npcsByZone.set(zoneName, [...npcsData]);
    
    console.log(`🔧 [ADD NPCS] État APRÈS: ${this.npcsMap.size} NPCs globaux`);
    console.log(`🔧 [ADD NPCS] NPCs zone "${zoneName}": ${npcsData.length}`);
    console.log(`✅ [ADD NPCS] Ajout terminé avec succès`);
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
      const uniqueKey = `${zoneName}_${npcData.id}`;
      
      // 🔧 Ajout avec la nouvelle méthode
      this.npcsMap.set(uniqueKey, npcData);
      
      // Mettre à jour la Map par zone
      const zoneNpcs = this.npcsByZone.get(zoneName) || [];
      zoneNpcs.push(npcData);
      this.npcsByZone.set(zoneName, zoneNpcs);
      
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
      const uniqueKey = `${zoneName}_${npcData.id}`;
      
      // 🔧 Mise à jour avec la nouvelle méthode
      const existed = this.npcsMap.has(uniqueKey);
      this.npcsMap.set(uniqueKey, npcData);
      
      // Mettre à jour la Map par zone
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
      
      this.log('info', existed ? `🔄 [HotReload] NPC mis à jour: ${npcData.name} (${npcData.id})` : `➕ [HotReload] NPC ajouté: ${npcData.name} (${npcData.id})`);
      this.notifyReloadCallbacks('update', npcData);
      
    } catch (error) {
      this.log('error', '❌ [HotReload] Erreur update:', error);
    }
  }

  private async handleNpcDelete(documentId: any): Promise<void> {
    try {
      // Chercher le NPC à supprimer
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
        // Supprimer de la Map globale
        this.npcsMap.delete(keyToDelete);
        
        // Supprimer de la Map par zone
        const zoneNpcs = this.npcsByZone.get(deletedNpc.zone) || [];
        const filteredZoneNpcs = zoneNpcs.filter(npc => npc.id !== deletedNpc!.id);
        this.npcsByZone.set(deletedNpc.zone, filteredZoneNpcs);
        
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

  // 🔧 MÉTHODES PUBLIQUES - ACCÈS AUX DONNÉES (MISES À JOUR)
  getAllNpcs(): NpcData[] {
    return Array.from(this.npcsMap.values());
  }

  getNpcById(id: number): NpcData | undefined {
    // Chercher dans toutes les zones
    for (const npc of this.npcsMap.values()) {
      if (npc.id === id) {
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
      
      // Supprimer tous les NPCs de cette zone
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
      
      // Recharger la zone
      await this.loadNpcsFromMongoDB(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur ${zoneName}:`, error);
      return false;
    }
  }

  // 🔧 STATISTIQUES SYSTÈME (MISES À JOUR)
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
        mongodb: this.npcsMap.size, // Tous les NPCs viennent de MongoDB maintenant
        json: 0 // Plus de support JSON
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

  // ✅ NETTOYAGE
  public cleanup(): void {
    this.log('info', '🧹 [NpcManager] Nettoyage...');
    
    this.stopHotReload();
    this.reloadCallbacks = [];
    this.mongoCache.clear();
    this.validationErrors.clear();
    this.npcsMap.clear();
    this.npcsByZone.clear();
    
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    
    this.log('info', '✅ [NpcManager] Nettoyage terminé');
  }

  // 🔧 DEBUG (MIS À JOUR)
  debugSystem(): void {
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs MONGODB ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs (premiers 10):`);
    const npcsArray = Array.from(this.npcsMap.values());
    for (const npc of npcsArray.slice(0, 10)) {
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type || 'legacy'}) - Zone: ${npc.zone}`);
    }
    
    console.log(`\n🗺️ NPCs par zone:`);
    for (const [zone, npcs] of this.npcsByZone) {
      console.log(`  📍 ${zone}: ${npcs.length} NPCs`);
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
