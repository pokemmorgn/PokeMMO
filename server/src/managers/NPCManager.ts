// PokeMMO/server/src/managers/NPCManager.ts
// Version étendue : Support JSON + Tiled avec rétrocompatibilité

import fs from "fs";
import path from "path";
import { 
  AnyNpc, 
  NpcZoneData, 
  NpcType,
  Direction,
  NpcValidationResult 
} from "../types/NpcTypes";

// ✅ EXTENSION de l'interface existante pour compatibilité JSON
export interface NpcData {
  // === PROPRIÉTÉS EXISTANTES (Tiled) ===
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties: Record<string, any>;
  
  // === NOUVELLES PROPRIÉTÉS (JSON) ===
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
  sourceType?: 'tiled' | 'json';
  sourceFile?: string;
  lastLoaded?: number;
}

// ✅ CONFIGURATION DU MANAGER
interface NpcManagerConfig {
  npcDataPath: string;
  autoLoadJSON: boolean;
  strictValidation: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
}

export class NpcManager {
  npcs: NpcData[] = [];
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR SUPPORT JSON
  private loadedZones: Set<string> = new Set();
  private npcSourceMap: Map<number, 'tiled' | 'json'> = new Map();
  private validationErrors: Map<number, string[]> = new Map();
  private lastLoadTime: number = 0;
  
  private config: NpcManagerConfig = {
    npcDataPath: './build/data/npcs',
    autoLoadJSON: true,
    strictValidation: process.env.NODE_ENV === 'production',
    debugMode: process.env.NODE_ENV === 'development',
    cacheEnabled: true
  };

  // ✅ CONSTRUCTEUR ÉTENDU - Support Tiled ET JSON + AUTO-SCAN
  constructor(mapPath?: string, zoneName?: string, customConfig?: Partial<NpcManagerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🚀 [NpcManager] Initialisation`, {
      mapPath,
      zoneName,
      autoScan: !mapPath && !zoneName,
      config: this.config
    });

    // === MODE 1: Chargement spécifique (existant) ===
    if (mapPath || zoneName) {
      // Chargement Tiled (existant)
      if (mapPath) {
        this.loadNpcsFromMap(mapPath);
      }
      
      // Chargement JSON (nouveau)
      if (zoneName) {
        this.loadNpcsFromJSON(zoneName);
      }
    } 
    // === MODE 2: Auto-scan complet (nouveau) ===
    else {
      this.log('info', `🔍 [NpcManager] Mode auto-scan activé`);
      this.autoLoadAllZones();
    }
    
    this.lastLoadTime = Date.now();
    
    this.log('info', `✅ [NpcManager] Initialisé avec succès`, {
      totalNpcs: this.npcs.length,
      tiledNpcs: Array.from(this.npcSourceMap.values()).filter(s => s === 'tiled').length,
      jsonNpcs: Array.from(this.npcSourceMap.values()).filter(s => s === 'json').length,
      zonesLoaded: Array.from(this.loadedZones)
    });
  }

  // ✅ MÉTHODE EXISTANTE (INCHANGÉE) - Compatibilité Tiled
  loadNpcsFromMap(mapPath: string): void {
    try {
      const resolvedPath = path.resolve(__dirname, mapPath);
      
      this.log('info', `📄 [Tiled] Chargement NPCs depuis: ${resolvedPath}`);
      
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`NPCManager: Le fichier map n'existe pas : ${resolvedPath}`);
      }
      
      const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      const npcLayer = mapData.layers.find((l: any) => l.name === "npcs");
      
      if (!npcLayer || !npcLayer.objects) {
        this.log('warn', `⚠️ [Tiled] Aucun layer NPCs trouvé dans ${resolvedPath}`);
        return;
      }

      let tiledNpcCount = 0;
      
      for (const obj of npcLayer.objects) {
        const propMap: Record<string, any> = {};
        if (obj.properties) {
          for (const prop of obj.properties) {
            propMap[prop.name] = prop.value;
          }
        }

        const npcData: NpcData = {
          id: obj.id,
          name: obj.name || propMap['Nom'] || "NPC",
          sprite: propMap['sprite'] || "npc_placeholder",
          x: obj.x,
          y: obj.y,
          properties: propMap,
          
          // Métadonnées source
          sourceType: 'tiled',
          sourceFile: mapPath,
          lastLoaded: Date.now()
        };

        this.npcs.push(npcData);
        this.npcSourceMap.set(obj.id, 'tiled');
        tiledNpcCount++;
      }
      
      this.log('info', `✅ [Tiled] ${tiledNpcCount} NPCs chargés depuis ${mapPath}`);
      
    } catch (error) {
      this.log('error', `❌ [Tiled] Erreur chargement ${mapPath}`, error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE - Support JSON
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
          } else {
            this.npcs.push(npcData);
            this.npcSourceMap.set(npcJson.id, 'json');
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

  // ✅ CONVERSION JSON -> NpcData unifié
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
      
      ...(npcJson.type === 'healer' && {
        healerConfig: (npcJson as any).healerConfig,
        healerDialogueIds: (npcJson as any).healerDialogueIds
      }),
      
      ...(npcJson.type === 'gym_leader' && {
        trainerId: (npcJson as any).trainerId,
        trainerClass: (npcJson as any).trainerClass,
        battleConfig: (npcJson as any).battleConfig,
        battleDialogueIds: (npcJson as any).battleDialogueIds,
        gymConfig: (npcJson as any).gymConfig,
        gymDialogueIds: (npcJson as any).gymDialogueIds
      }),
      
      ...(npcJson.type === 'transport' && {
        transportConfig: (npcJson as any).transportConfig,
        destinations: (npcJson as any).destinations,
        transportDialogueIds: (npcJson as any).transportDialogueIds
      }),
      
      ...(npcJson.type === 'service' && {
        serviceConfig: (npcJson as any).serviceConfig,
        serviceDialogueIds: (npcJson as any).serviceDialogueIds
      }),
      
      ...(npcJson.type === 'minigame' && {
        minigameConfig: (npcJson as any).minigameConfig,
        contestDialogueIds: (npcJson as any).contestDialogueIds
      }),
      
      ...(npcJson.type === 'researcher' && {
        researchConfig: (npcJson as any).researchConfig,
        researchDialogueIds: (npcJson as any).researchDialogueIds
      }),
      
      ...(npcJson.type === 'guild' && {
        guildConfig: (npcJson as any).guildConfig,
        guildDialogueIds: (npcJson as any).guildDialogueIds
      }),
      
      ...(npcJson.type === 'event' && {
        eventConfig: (npcJson as any).eventConfig,
        eventDialogueIds: (npcJson as any).eventDialogueIds
      }),
      
      ...(npcJson.type === 'quest_master' && {
        questMasterConfig: (npcJson as any).questMasterConfig,
        questMasterDialogueIds: (npcJson as any).questMasterDialogueIds
      }),
      
      // === MÉTADONNÉES SOURCE ===
      sourceType: 'json',
      sourceFile,
      lastLoaded: Date.now()
    };

    return npcData;
  }

  // ✅ VALIDATION JSON stricte
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
    
    if (!npcJson.type || typeof npcJson.type !== 'string') {
      errors.push(`Type manquant ou invalide: ${npcJson.type}`);
    }
    
    if (!npcJson.position || typeof npcJson.position.x !== 'number' || typeof npcJson.position.y !== 'number') {
      errors.push(`Position invalide: ${JSON.stringify(npcJson.position)}`);
    }
    
    if (!npcJson.sprite || typeof npcJson.sprite !== 'string') {
      errors.push(`Sprite manquant ou invalide: ${npcJson.sprite}`);
    }

    // Validation du type NPC
    const validTypes: NpcType[] = [
      'dialogue', 'merchant', 'trainer', 'healer', 'gym_leader',
      'transport', 'service', 'minigame', 'researcher', 'guild', 
      'event', 'quest_master'
    ];
    
    if (npcJson.type && !validTypes.includes(npcJson.type)) {
      errors.push(`Type NPC invalide: ${npcJson.type}. Types valides: ${validTypes.join(', ')}`);
    }

    // Validation spécialisée selon le type
    if (npcJson.type === 'merchant' && !npcJson.shopId) {
      errors.push(`NPC merchant doit avoir un shopId`);
    }
    
    if (npcJson.type === 'trainer' && !npcJson.trainerId) {
      errors.push(`NPC trainer doit avoir un trainerId`);
    }
    
    if (npcJson.type === 'gym_leader' && (!npcJson.gymConfig || !npcJson.gymConfig.badgeId)) {
      errors.push(`NPC gym_leader doit avoir gymConfig.badgeId`);
    }

    // Warnings pour recommandations
    if (npcJson.questsToGive && npcJson.questsToGive.length > 0 && !npcJson.questDialogueIds?.questOffer) {
      warnings.push(`NPC donne des quêtes mais n'a pas de questDialogueIds.questOffer`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // ✅ API EXISTANTE (INCHANGÉE) - Compatibilité
  getAllNpcs(): NpcData[] {
    return this.npcs;
  }

  getNpcById(id: number): NpcData | undefined {
    return this.npcs.find(npc => npc.id === id);
  }

  // ✅ MÉTHODES PUBLIQUES POUR L'AUTO-SCAN
  
  // Auto-chargement de toutes les zones (Tiled + JSON)
  private autoLoadAllZones(): void {
    this.log('info', `📂 [NpcManager] Auto-scan de toutes les zones...`);
    
    // === SCAN AUTOMATIQUE DES ZONES TILED ===
    const tiledZones = this.scanTiledMaps();
    
    // === SCAN AUTOMATIQUE DES ZONES JSON ===
    const jsonZones = this.scanNpcJsonFiles();
    
    // === COMBINER ET CHARGER ===
    const allZones = new Set([...tiledZones, ...jsonZones]);
    
    this.log('info', `🎯 [NpcManager] ${allZones.size} zones détectées:`, Array.from(allZones));
    
    let totalLoaded = 0;
    let tiledTotal = 0;
    let jsonTotal = 0;
    
    allZones.forEach(zoneName => {
      try {
        const mapPath = `../assets/maps/${zoneName}.tmj`;
        const hasMap = fs.existsSync(path.resolve(__dirname, mapPath));
        
        const npcsBeforeLoad = this.npcs.length;
        
        // Chargement hybride : Tiled (si existe) + JSON (si existe)
        if (hasMap) {
          this.loadNpcsFromMap(mapPath);
          const tiledCount = this.npcs.length - npcsBeforeLoad;
          tiledTotal += tiledCount;
          this.log('info', `📄 [Tiled] ${zoneName}: ${tiledCount} NPCs`);
        }
        
        // Toujours essayer JSON
        this.loadNpcsFromJSON(zoneName);
        const jsonCount = this.npcs.length - npcsBeforeLoad - (hasMap ? this.npcSourceMap.size - npcsBeforeLoad : 0);
        if (jsonCount > 0) {
          jsonTotal += jsonCount;
          this.log('info', `📄 [JSON] ${zoneName}: ${jsonCount} NPCs`);
        }
        
        const zoneTotal = this.npcs.length - npcsBeforeLoad;
        if (zoneTotal > 0) {
          totalLoaded += zoneTotal;
          this.log('info', `✅ Zone ${zoneName}: ${zoneTotal} NPCs total`);
        }
        
      } catch (error) {
        this.log('warn', `⚠️ Erreur zone ${zoneName}:`, error);
      }
    });
    
    this.log('info', `🎉 [NpcManager] Auto-scan terminé: ${totalLoaded} NPCs (${tiledTotal} Tiled + ${jsonTotal} JSON)`);
  }

  private scanTiledMaps(): string[] {
    try {
      const mapsDir = path.resolve(__dirname, '../assets/maps');
      if (!fs.existsSync(mapsDir)) {
        this.log('warn', `📁 [NpcManager] Dossier maps non trouvé: ${mapsDir}`);
        return [];
      }
      
      const tiledFiles = fs.readdirSync(mapsDir)
        .filter((file: string) => file.endsWith('.tmj'))
        .map((file: string) => file.replace('.tmj', ''));
      
      this.log('info', `🗺️ [NpcManager] ${tiledFiles.length} cartes Tiled trouvées`);
      return tiledFiles;
    } catch (error) {
      this.log('error', `❌ Erreur scan Tiled:`, error);
      return [];
    }
  }

  private scanNpcJsonFiles(): string[] {
    try {
      const npcDir = path.resolve(this.config.npcDataPath);
      if (!fs.existsSync(npcDir)) {
        this.log('info', `📁 [NpcManager] Création dossier NPCs: ${npcDir}`);
        fs.mkdirSync(npcDir, { recursive: true });
        return [];
      }
      
      const jsonFiles = fs.readdirSync(npcDir)
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => file.replace('.json', ''));
      
      this.log('info', `📄 [NpcManager] ${jsonFiles.length} fichiers NPCs JSON trouvés`);
      return jsonFiles;
    } catch (error) {
      this.log('error', `❌ Erreur scan NPCs JSON:`, error);
      return [];
    }
  }

  // ✅ NOUVELLES MÉTHODES PUBLIQUES
  
  // Obtenir NPCs par type
  getNpcsByType(type: NpcType): NpcData[] {
    return this.npcs.filter(npc => npc.type === type);
  }
  
  // Obtenir NPCs par source
  getNpcsBySource(source: 'tiled' | 'json'): NpcData[] {
    return this.npcs.filter(npc => npc.sourceType === source);
  }
  
  // Obtenir NPCs dans une zone (rayon)
  getNpcsInRadius(centerX: number, centerY: number, radius: number): NpcData[] {
    return this.npcs.filter(npc => {
      const distance = Math.sqrt(
        Math.pow(npc.x - centerX, 2) + 
        Math.pow(npc.y - centerY, 2)
      );
      return distance <= radius;
    });
  }
  
  // Obtenir NPCs avec quêtes
  getQuestGivers(): NpcData[] {
    return this.npcs.filter(npc => npc.questsToGive && npc.questsToGive.length > 0);
  }
  
  getQuestEnders(): NpcData[] {
    return this.npcs.filter(npc => npc.questsToEnd && npc.questsToEnd.length > 0);
  }
  
  // Vérifier si zone JSON est chargée
  isZoneLoaded(zoneName: string): boolean {
    return this.loadedZones.has(zoneName);
  }
  
  // Recharger une zone JSON
  reloadZone(zoneName: string): boolean {
    try {
      // Supprimer les NPCs existants de cette zone
      const npcsToRemove = this.npcs.filter(npc => 
        npc.sourceType === 'json' && 
        npc.sourceFile?.includes(`${zoneName}.json`)
      );
      
      for (const npc of npcsToRemove) {
        this.npcs = this.npcs.filter(n => n.id !== npc.id);
        this.npcSourceMap.delete(npc.id);
        this.validationErrors.delete(npc.id);
      }
      
      this.loadedZones.delete(zoneName);
      
      // Recharger
      this.loadNpcsFromJSON(zoneName);
      
      this.log('info', `🔄 [JSON] Zone ${zoneName} rechargée`);
      return true;
      
    } catch (error) {
      this.log('error', `❌ [JSON] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }
  
  // ✅ MÉTHODES D'ADMINISTRATION ET DEBUG
  
  getSystemStats() {
    const tiledCount = Array.from(this.npcSourceMap.values()).filter(s => s === 'tiled').length;
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
        tiled: tiledCount,
        json: jsonCount
      },
      zones: {
        loaded: Array.from(this.loadedZones),
        count: this.loadedZones.size
      },
      npcsByType,
      validationErrors: this.validationErrors.size,
      lastLoadTime: this.lastLoadTime,
      config: this.config
    };
  }
  
  debugSystem(): void {
    console.log(`🔍 [NpcManager] === DEBUG SYSTÈME NPCs ===`);
    
    const stats = this.getSystemStats();
    console.log(`📊 Statistiques:`, JSON.stringify(stats, null, 2));
    
    console.log(`\n📦 NPCs par ID:`);
    for (const npc of this.npcs.slice(0, 10)) { // Limiter à 10 pour debug
      console.log(`  🤖 ${npc.id}: ${npc.name} (${npc.type || 'legacy'}) [${npc.sourceType}]`);
    }
    
    if (this.validationErrors.size > 0) {
      console.log(`\n❌ Erreurs de validation:`);
      for (const [npcId, errors] of this.validationErrors.entries()) {
        console.log(`  🚫 NPC ${npcId}: ${errors.join(', ')}`);
      }
    }
  }
  
  // Obtenir détails validation d'un NPC
  getNpcValidationErrors(npcId: number): string[] | undefined {
    return this.validationErrors.get(npcId);
  }
  
  // Vérifier état du système
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Vérifier conflits d'ID
    const idCounts: Map<number, number> = new Map();
    for (const npc of this.npcs) {
      idCounts.set(npc.id, (idCounts.get(npc.id) || 0) + 1);
    }
    
    for (const [id, count] of idCounts.entries()) {
      if (count > 1) {
        issues.push(`ID en conflit: ${id} (${count} NPCs)`);
      }
    }
    
    // Vérifier erreurs de validation
    if (this.validationErrors.size > 0) {
      issues.push(`${this.validationErrors.size} NPCs avec erreurs de validation`);
    }
    
    // Vérifier cohérence des données
    for (const npc of this.npcs) {
      if (npc.type === 'merchant' && !npc.shopId && !npc.properties?.shop) {
        issues.push(`NPC merchant ${npc.id} sans shop configuré`);
      }
      
      if (npc.questsToGive?.length && !npc.questDialogueIds?.questOffer) {
        issues.push(`NPC ${npc.id} donne des quêtes mais pas de dialogue d'offre`);
      }
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // ✅ MÉTHODES UTILITAIRES PRIVÉES
  
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
