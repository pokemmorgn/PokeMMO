// PokeMMO/server/src/managers/NPCManager.ts
// Version adaptée : Ton code existant + Support MongoDB + waitForLoad()

import fs from "fs";
import path from "path";
import { NpcData } from "../models/NpcData"; // ✅ NOUVEAU : Import du modèle MongoDB
import { 
  AnyNpc, 
  NpcZoneData, 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

// ✅ NOUVEAU : Énumération des sources de données (SIMPLIFIÉ - sans Tiled)
export enum NpcDataSource {
  JSON = 'json', 
  MONGODB = 'mongodb',
  HYBRID = 'hybrid' // MongoDB + JSON fallback
}

// ✅ EXTENSION de ton interface existante (pas de breaking changes)
export interface NpcData {
  // === PROPRIÉTÉS EXISTANTES (Tiled) - INCHANGÉES ===
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties: Record<string, any>;
  
  // === PROPRIÉTÉS JSON (existantes) - INCHANGÉES ===
  type?: NpcType;
  position?: { x: number; y: number };
  direction?: Direction;
  interactionRadius?: number;
  canWalkAway?: boolean;
  autoFacePlayer?: boolean;
  repeatable?: boolean;
  cooldownSeconds?: number;
  
  // Système de traduction (IDs)
  dialogueIds?: string[];
  dialogueId?: string;
  conditionalDialogueIds?: Record<string, string[]>;
  
  // Système quêtes flexible
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
  sourceType?: 'json' | 'mongodb'; // ✅ SIMPLIFIÉ : que JSON et MongoDB
  sourceFile?: string;
  lastLoaded?: number;
  
  // ✅ NOUVEAU : Support MongoDB
  isActive?: boolean;
  mongoDoc?: any; // Référence au document MongoDB si chargé depuis là
}

// ✅ CONFIGURATION ÉTENDUE (avec tes paramètres existants)
interface NpcManagerConfig {
  // === NOUVEAUX PARAMÈTRES MongoDB ===
  primaryDataSource: NpcDataSource;
  useMongoCache: boolean;
  cacheTTL: number; // TTL du cache en millisecondes
  enableFallback: boolean; // Fallback JSON si MongoDB échoue
  
  // === PARAMÈTRES EXISTANTS (inchangés) ===
  npcDataPath: string;
  autoLoadJSON: boolean;
  strictValidation: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
}

export class NpcManager {
  npcs: NpcData[] = []; // ✅ TON ARRAY EXISTANT - inchangé
  
  // === PROPRIÉTÉS EXISTANTES (JSON/MongoDB seulement) ===
  private loadedZones: Set<string> = new Set();
  private npcSourceMap: Map<number, 'json' | 'mongodb'> = new Map(); // ✅ SIMPLIFIÉ
  private validationErrors: Map<number, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  // ✅ NOUVELLES PROPRIÉTÉS MongoDB
  private mongoCache: Map<string, { data: NpcData[]; timestamp: number }> = new Map();
  private npcSourceMapExtended: Map<number, NpcDataSource> = new Map();
  
  // ✅ CONFIGURATION ÉTENDUE
  private config: NpcManagerConfig = {
    // Nouveaux paramètres
    primaryDataSource: NpcDataSource.MONGODB, // ✅ FORCÉ EN MONGODB
    useMongoCache: process.env.NPC_USE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.NPC_CACHE_TTL || '1800000'), // 30 minutes
    enableFallback: process.env.NPC_FALLBACK !== 'false',
    
    // Paramètres existants
    npcDataPath: './build/data/npcs',
    autoLoadJSON: true,
    strictValidation: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    cacheEnabled: true
  };

  // ✅ CONSTRUCTEUR SIMPLIFIÉ (JSON + MongoDB seulement)
  constructor(zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [NpcManager] Initialisation`, {
      zoneName,
      primarySource: this.config.primaryDataSource,
      autoScan: !zoneName,
      config: this.config
    });

    // === MODE 1: Chargement spécifique (adapté) ===
    if (zoneName) {
      this.initializeSpecific(zoneName);
    } 
    // === MODE 2: Auto-scan complet (adapté) ===
    else {
      this.log('info', `🔍 [NpcManager] Mode auto-scan activé`);
      this.autoLoadAllZones();
    }
    
    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [NpcManager] Initialisé avec succès`, {
      totalNpcs: this.npcs.length,
      jsonNpcs: Array.from(this.npcSourceMap.values()).filter(s => s === 'json').length,
      mongoNpcs: Array.from(this.npcSourceMapExtended.values()).filter(s => s === NpcDataSource.MONGODB).length,
      zonesLoaded: Array.from(this.loadedZones)
    });
  }

  // ✅ NOUVELLE MÉTHODE : Attendre que le chargement MongoDB soit terminé
  async waitForLoad(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    this.log('info', `⏳ [WaitForLoad] Attente du chargement des NPCs (timeout: ${timeoutMs}ms)...`);
    
    while (this.npcs.length === 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 100ms
    }
    
    const loaded = this.npcs.length > 0;
    const loadTime = Date.now() - startTime;
    
    if (loaded) {
      this.log('info', `✅ [WaitForLoad] NPCs chargés: ${this.npcs.length} NPCs en ${loadTime}ms`);
      this.log('info', `🗺️  [WaitForLoad] Zones chargées: ${Array.from(this.loadedZones).join(', ')}`);
    } else {
      this.log('warn', `⚠️ [WaitForLoad] Timeout après ${timeoutMs}ms, ${this.npcs.length} NPCs chargés`);
    }
    
    return loaded;
  }

  // ✅ MÉTHODE SIMPLIFIÉE : Initialisation spécifique (JSON + MongoDB seulement)
  private async initializeSpecific(zoneName: string): Promise<void> {
    try {
      // ✅ SIMPLIFIÉ : Chargement selon la source configurée
      await this.loadNpcsForZone(zoneName);
      
    } catch (error) {
      this.log('error', 'Erreur initialisation spécifique', error);
      throw error;
    }
  }

  // ✅ MÉTHODE PRINCIPALE SIMPLIFIÉE : Chargement par zone (JSON + MongoDB seulement)
  private async loadNpcsForZone(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    this.log('info', `🎯 [Zone: ${zoneName}] Chargement selon stratégie: ${this.config.primaryDataSource}`);
    
    try {
      switch (this.config.primaryDataSource) {
        case NpcDataSource.MONGODB:
          await this.loadNpcsFromMongoDB(zoneName);
          break;
          
        case NpcDataSource.JSON:
          this.loadNpcsFromJSON(zoneName); // ✅ TON CODE EXISTANT
          break;
          
        case NpcDataSource.HYBRID:
          // Essayer MongoDB d'abord, fallback JSON
          try {
            await this.loadNpcsFromMongoDB(zoneName);
          } catch (mongoError) {
            this.log('warn', `⚠️  [Hybrid] MongoDB échoué pour ${zoneName}, fallback JSON`);
            this.loadNpcsFromJSON(zoneName); // ✅ TON CODE EXISTANT
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

  // ✅ NOUVELLE MÉTHODE : Chargement depuis MongoDB
  private async loadNpcsFromMongoDB(zoneName: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Vérifier cache
      if (this.config.useMongoCache) {
        const cached = this.getFromCache(zoneName);
        if (cached) {
          this.log('info', `💾 [MongoDB Cache] Zone ${zoneName} trouvée en cache`);
          this.addNpcsToCollection(cached, NpcDataSource.MONGODB);
          return;
        }
      }
      
      // Requête MongoDB
      this.log('info', `🗄️  [MongoDB] Chargement zone ${zoneName}...`);
      
      const mongoNpcs = await NpcData.findByZone(zoneName);
      
      // Conversion au format de ton système existant
      const npcsData: NpcData[] = mongoNpcs.map(mongoDoc => 
        this.convertMongoDocToNpcData(mongoDoc, zoneName)
      );
      
      // Ajouter à ta collection existante
      this.addNpcsToCollection(npcsData, NpcDataSource.MONGODB);
      
      // Mise en cache
      if (this.config.useMongoCache) {
        this.setCache(zoneName, npcsData);
      }
      
      this.loadedZones.add(zoneName);
      
      const queryTime = Date.now() - startTime;
      this.log('info', `✅ [MongoDB] Zone ${zoneName}: ${npcsData.length} NPCs chargés en ${queryTime}ms`);
      
    } catch (error) {
      this.log('error', `❌ [MongoDB] Erreur chargement zone ${zoneName}:`, error);
      
      // Fallback vers JSON si activé
      if (this.config.enableFallback) {
        this.log('info', `🔄 [Fallback] Tentative chargement JSON pour ${zoneName}`);
        this.loadNpcsFromJSON(zoneName); // ✅ TON CODE EXISTANT
      } else {
        throw error;
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE : Conversion MongoDB vers ton format
  private convertMongoDocToNpcData(mongoDoc: any, zoneName: string): NpcData {
    const npcFormat = mongoDoc.toNpcFormat();
    
    return {
      // ✅ COMPATIBLE avec ton système existant
      id: npcFormat.id,
      name: npcFormat.name,
      sprite: npcFormat.sprite,
      x: npcFormat.position.x,
      y: npcFormat.position.y,
      properties: {}, // Vide pour MongoDB, tout est structuré
      
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
      ...mongoDoc.npcData,
      
      // Métadonnées
      sourceType: 'mongodb',
      sourceFile: mongoDoc.sourceFile,
      lastLoaded: Date.now(),
      isActive: mongoDoc.isActive,
      mongoDoc: mongoDoc // Référence pour updates
    };
  }

  // ✅ MÉTHODE SIMPLIFIÉE : Ajouter NPCs à ta collection existante (sans Tiled)
  private addNpcsToCollection(npcsData: NpcData[], source: NpcDataSource): void {
    for (const npc of npcsData) {
      // Éviter les doublons (même logique que ton code existant)
      const existingIndex = this.npcs.findIndex(existing => 
        existing.id === npc.id
      );
      
      if (existingIndex >= 0) {
        this.npcs[existingIndex] = npc; // Remplacer
      } else {
        this.npcs.push(npc); // Ajouter
      }
      
      // Mettre à jour les maps de sources (JSON + MongoDB seulement)
      this.npcSourceMap.set(npc.id, npc.sourceType as 'json' | 'mongodb');
      this.npcSourceMapExtended.set(npc.id, source);
    }
  }

  // ✅ MÉTHODES DE CACHE (nouvelles)
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
      data: [...data], // Copie pour éviter mutations
      timestamp: Date.now()
    });
  }

  // ===== MÉTHODE JSON EXISTANTE (INCHANGÉE) =====

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

      // Validation de base
      if (!jsonData.npcs || !Array.isArray(jsonData.npcs)) {
        this.log('warn', `⚠️ [JSON] Aucun NPC dans ${zoneName}.json`);
        return;
      }

      let jsonNpcCount = 0;
      let validationErrors = 0;

      for (const npcJson of jsonData.npcs) {
        try {
          // Validation stricte si activée
          if (this.config.strictValidation) {
            const validation = this.validateNpcJson(npcJson);
            if (!validation.valid) {
              this.validationErrors.set(npcJson.id, validation.errors || []);
              this.log('error', `❌ [JSON] NPC ${npcJson.id} invalide:`, validation.errors);
              validationErrors++;
              continue;
            }
          }

          // Conversion NpcJson -> NpcData unifié
          const npcData = this.convertJsonToNpcData(npcJson, zoneName, jsonPath);
          
          // Vérification conflit d'ID
          const existingNpc = this.npcs.find(n => n.id === npcJson.id);
          if (existingNpc) {
            this.log('warn', `⚠️ [JSON] Conflit ID ${npcJson.id}: ${existingNpc.sourceType} vs JSON`);
            
            // Remplacer si JSON est plus récent
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

  // ✅ TES MÉTHODES PUBLIQUES EXISTANTES (INCHANGÉES - API COMPATIBLE)
  getAllNpcs(): NpcData[] {
    return this.npcs;
  }

  getNpcById(id: number): NpcData | undefined {
    return this.npcs.find(npc => npc.id === id);
  }

  // ===== NOUVELLES MÉTHODES PUBLIQUES MongoDB =====

  /**
   * ✅ NOUVEAU : Recharge une zone depuis MongoDB
   */
  async reloadZoneFromMongoDB(zoneName: string): Promise<boolean> {
    try {
      this.log('info', `🔄 [Reload] Rechargement zone ${zoneName} depuis MongoDB`);
      
      // Nettoyer cache et NPCs existants de cette zone
      this.mongoCache.delete(zoneName);
      this.npcs = this.npcs.filter(npc => 
        !(npc.sourceType === 'mongodb' && this.extractZoneFromNpc(npc) === zoneName)
      );
      this.loadedZones.delete(zoneName);
      
      // Recharger
      await this.loadNpcsFromMongoDB(zoneName);
      
      this.log('info', `✅ [Reload] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [Reload] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }

  /**
   * ✅ NOUVEAU : Synchroniser modifications vers MongoDB
   */
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
          
          // Chercher ou créer en MongoDB
          let mongoDoc = await NpcData.findOne({ 
            zone,
            npcId: npc.id 
          });
          
          if (mongoDoc) {
            // Mettre à jour
            await mongoDoc.updateFromJson(this.convertNpcDataToJson(npc));
            results.success++;
          } else {
            // Créer nouveau
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

  // ===== TES MÉTHODES UTILITAIRES EXISTANTES (adaptées) =====

  private convertJsonToNpcData(npcJson: AnyNpc, zoneName: string, sourceFile: string): NpcData {
    const npcData: NpcData = {
      // === PROPRIÉTÉS DE BASE (mappées) ===
      id: npcJson.id,
      name: npcJson.name,
      sprite: npcJson.sprite,
      x: npcJson.position.x,
      y: npcJson.position.y,
      properties: {}, // Vide pour JSON, tout est structuré
      
      // === PROPRIÉTÉS JSON STRUCTURÉES ===
      type: npcJson.type,
      position: npcJson.position,
      direction: npcJson.direction,
      interactionRadius: npcJson.interactionRadius,
      canWalkAway: npcJson.canWalkAway,
      autoFacePlayer: npcJson.autoFacePlayer,
      repeatable: npcJson.repeatable,
      cooldownSeconds: npcJson.cooldownSeconds,
      
      // Conditions d'apparition
      spawnConditions: npcJson.spawnConditions,
      
      // Système quêtes flexible
      questsToGive: npcJson.questsToGive,
      questsToEnd: npcJson.questsToEnd,
      questRequirements: npcJson.questRequirements,
      questDialogueIds: npcJson.questDialogueIds,
      
      // === PROPRIÉTÉS SPÉCIALISÉES PAR TYPE ===
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
      
      // ... autres types
      
      // === MÉTADONNÉES SOURCE ===
      sourceType: 'json',
      sourceFile,
      lastLoaded: Date.now()
    };

    return npcData;
  }

  // ✅ MÉTHODES UTILITAIRES pour MongoDB
  private extractZoneFromNpc(npc: NpcData): string {
    if (npc.sourceFile) {
      const match = npc.sourceFile.match(/([^\/\\]+)\.json$/); // ✅ Seulement JSON
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
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
      
      // Propriétés spécialisées
      ...(npc.shopId && { shopId: npc.shopId }),
      ...(npc.shopType && { shopType: npc.shopType }),
      ...(npc.shopDialogueIds && { shopDialogueIds: npc.shopDialogueIds }),
      ...(npc.trainerId && { trainerId: npc.trainerId }),
      // ... autres propriétés selon le type
    };
  }

  // ===== TES AUTRES MÉTHODES EXISTANTES (toutes inchangées) =====
  
  // Auto-chargement de toutes les zones (Tiled + JSON)
  private autoLoadAllZones(): void {
    this.log('info', `📂 [NpcManager] Auto-scan avec source: ${this.config.primaryDataSource}...`);
    
    if (this.config.primaryDataSource === NpcDataSource.MONGODB || 
        this.config.primaryDataSource === NpcDataSource.HYBRID) {
      // MongoDB en mode asynchrone
      this.autoLoadFromMongoDB().catch(error => {
        this.log('error', 'Erreur auto-scan MongoDB:', error);
        if (this.config.enableFallback) {
          this.log('info', 'Fallback vers scan JSON/Tiled');
          this.autoLoadFromFiles();
        }
      });
    } else {
      // Scan des fichiers JSON/Tiled (ton code existant)
      this.autoLoadFromFiles();
    }
  }

  // ✅ NOUVEAU : Auto-scan MongoDB
  private async autoLoadFromMongoDB(): Promise<void> {
    try {
      this.log('info', '🗄️  [Auto-scan MongoDB] Récupération des zones...');
      
      // Récupérer toutes les zones distinctes
      const zones = await NpcData.distinct('zone');
      
      this.log('info', `📋 [MongoDB] ${zones.length} zones trouvées: ${zones.join(', ')}`);
      
      // Charger chaque zone
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

  // Auto-scan des fichiers JSON seulement (simplifié)
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

  // ===== MÉTHODES PUBLIQUES SIMPLIFIÉES (JSON + MongoDB seulement) =====
  
  getNpcsByType(type: NpcType): NpcData[] {
    return this.npcs.filter(npc => npc.type === type);
  }
  
  getNpcsBySource(source: 'json' | 'mongodb'): NpcData[] {
    return this.npcs.filter(npc => npc.sourceType === source);
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
  
  // ✅ STATS SIMPLIFIÉES (JSON + MongoDB seulement)
  
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
      }
    };
  }

  // ✅ DEBUG SIMPLIFIÉ (JSON + MongoDB seulement)
  debugSystem(): void {
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs SIMPLIFIÉ ===`);
    
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

    // ✅ INFOS DEBUG MongoDB
    console.log(`\n💾 État du cache MongoDB:`);
    console.log(`  - Taille: ${this.mongoCache.size}`);
    console.log(`  - TTL: ${this.config.cacheTTL / 1000}s`);
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`  - Source primaire: ${this.config.primaryDataSource}`);
    console.log(`  - Fallback activé: ${this.config.enableFallback}`);
    console.log(`  - Cache MongoDB: ${this.config.useMongoCache}`);
  }

  // ===== TES MÉTHODES PRIVÉES EXISTANTES (toutes inchangées) =====

  private validateNpcJson(npcJson: any): NpcValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation des champs obligatoires
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
