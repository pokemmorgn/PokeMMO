// src/interactions/modules/ObjectInteractionModule.ts
// Module principal d'interaction avec les objets - VERSION JSON
//
// ✅ NOUVELLE APPROCHE : Lecture depuis fichiers JSON au lieu de Tiled
// Fichiers : /data/gameobjects/{zone}.json

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

// ✅ IMPORTS DU SYSTÈME MODULAIRE - VERSION FINALE
import { 
  IObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult
} from "./object/core/IObjectSubModule";
import { SubModuleFactory } from "./object/core/SubModuleFactory";

// ✅ INTERFACE POUR JSON DE ZONE
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
    type: 'ground' | 'hidden';
    name?: string;
    itemId?: string;
    sprite?: string;
    quantity?: number;
    cooldown?: number;
    rarity?: string;
    searchRadius?: number;
    itemfinderRadius?: number;
    requirements?: Record<string, any>;
    requirementPreset?: string;
  }>;
}

// ✅ INTERFACE POUR ÉTAT PERSISTANT DES OBJETS
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

// ✅ MODULE PRINCIPAL - VERSION JSON
export class ObjectInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "ObjectInteractionModule";
  readonly supportedTypes: InteractionType[] = ["object"];
  readonly version = "2.0.0"; // ← Version JSON

  // ✅ COMPOSANTS DU SYSTÈME
  private subModuleFactory: SubModuleFactory;
  private stateManager: ObjectStateManager;
  private objectsByZone: Map<string, Map<number, ObjectDefinition>> = new Map();
  
  // ✅ CONFIGURATION MODIFIÉE POUR JSON
private config = {
  submodulesPath: path.resolve(__dirname, './object/submodules'),
  stateFile: './data/object_states.json',
  gameObjectsPath: './build/data/gameobjects',  // ← MODIFIÉ
  autoLoadMaps: true,
  securityEnabled: process.env.NODE_ENV === 'production'
};

  constructor(customConfig?: Partial<typeof ObjectInteractionModule.prototype.config>) {
    super();
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `🔄 [JSON] Initialisation avec fichiers JSON`, {
      gameObjectsPath: this.config.gameObjectsPath,
      autoLoadMaps: this.config.autoLoadMaps,
      securityEnabled: this.config.securityEnabled
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

  // === MÉTHODES PRINCIPALES (INCHANGÉES) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'object';
  }

  async handle(context: InteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      
      this.log('info', `🎯 [JSON] Traitement interaction objet`, { 
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
      
      this.log('error', '❌ [JSON] Erreur traitement objet', error);
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
    
    this.log('info', `🔍 [JSON] Recherche objet ${objectId} dans zone ${zone}`);
    
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) {
      this.log('warn', `❌ [JSON] Objet ${objectId} non trouvé dans ${zone}`);
      return this.createErrorResult(`Objet ${objectId} non trouvé dans ${zone}`, "OBJECT_NOT_FOUND");
    }

    this.log('info', `✅ [JSON] Objet trouvé: ${objectDef.name || objectDef.type}`, {
      type: objectDef.type,
      hasName: !!objectDef.name,
      hasItemId: !!objectDef.itemId
    });

    const state = this.stateManager.getObjectState(zone, objectId);
    objectDef.state = state;

    if (objectDef.type === 'unknown' || !objectDef.type) {
      objectDef.type = 'ground_item';
      this.log('info', `🔧 [JSON] Auto-détection: "${objectDef.name}" → ground_item`);
    }
    
    const subModule = this.subModuleFactory.findModuleForObject(objectDef);
    if (!subModule) {
      return this.createErrorResult(`Aucun gestionnaire pour le type: ${objectDef.type}`, "NO_HANDLER");
    }

    this.log('info', `🚀 [JSON] Délégation à ${subModule.typeName}`, { 
      objectId, 
      type: objectDef.type 
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
    
    this.log('info', `🔍 [JSON] Fouille générale dans ${zone}`, {
      position: { x: position.x, y: position.y }
    });
    
    const nearbyHiddenObjects = this.findHiddenObjectsNear(zone, position.x, position.y, 32);
    
    this.log('info', `🔍 [JSON] ${nearbyHiddenObjects.length} objets cachés trouvés dans la zone`);

    if (nearbyHiddenObjects.length > 0) {
      const objectDef = nearbyHiddenObjects[0];
      const state = this.stateManager.getObjectState(zone, objectDef.id);
      objectDef.state = state;

      const subModule = this.subModuleFactory.findModuleForObject(objectDef);
      if (subModule) {
        this.log('info', `🚀 [JSON] Fouille délégué à ${subModule.typeName}`);
        
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

    this.log('info', `❌ [JSON] Rien trouvé lors de la fouille`);
    return createInteractionResult.noItemFound(
      "0",
      "search",
      "Il n'y a rien ici.",
      1
    );
  }

  // === PARSING DES JSON - VERSION COMPLÈTEMENT NOUVELLE ===

  /**
   * ✅ NOUVELLE MÉTHODE : Charger les objets depuis JSON
   */
  async loadObjectsFromJSON(zoneName: string): Promise<void> {
    try {
      const jsonPath = path.resolve(this.config.gameObjectsPath, `${zoneName}.json`);
      
      console.log(`🔍 [JSON] Tentative chargement: ${jsonPath}`);

      if (!fs.existsSync(jsonPath)) {
        this.log('warn', `📄 [JSON] Fichier introuvable: ${jsonPath}`);
        return;
      }

      console.log(`📖 [JSON] Lecture fichier ${zoneName}.json...`);
      const jsonData: GameObjectZoneData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      console.log(`✅ [JSON] Données lues:`, {
        zone: jsonData.zone,
        version: jsonData.version,
        objectCount: jsonData.objects?.length || 0,
        hasDefaultRequirements: !!jsonData.defaultRequirements,
        hasPresets: !!jsonData.requirementPresets
      });

      if (!jsonData.objects || !Array.isArray(jsonData.objects)) {
        this.log('warn', `⚠️ [JSON] Aucun objet dans ${zoneName}.json`);
        return;
      }

      const objects = new Map<number, ObjectDefinition>();

      console.log(`🔧 [JSON] Traitement de ${jsonData.objects.length} objets...`);

      for (const objData of jsonData.objects) {
        try {
          console.log(`📦 [JSON] Traitement objet ID ${objData.id}:`, {
            type: objData.type,
            name: objData.name,
            itemId: objData.itemId,
            position: objData.position,
            sprite: objData.sprite
          });

          // Résoudre les requirements avec héritage
          const resolvedRequirements = this.resolveRequirements(
            objData, 
            jsonData.defaultRequirements, 
            jsonData.requirementPresets
          );

          console.log(`🔑 [JSON] Requirements résolus pour objet ${objData.id}:`, resolvedRequirements);

          // Déterminer le type final pour ObjectDefinition
          let finalType: string = objData.type;
          if (objData.type === 'ground') finalType = 'ground_item';
          if (objData.type === 'hidden') finalType = 'hidden_item';

          const objectDef: ObjectDefinition = {
            // Données de base
            id: objData.id,
            name: objData.name || `Object_${objData.id}`,
            x: objData.position.x,
            y: objData.position.y,
            zone: zoneName,
            
            // Type et contenu
            type: finalType,
            itemId: objData.itemId,
            quantity: objData.quantity || 1,
            rarity: objData.rarity || 'common',
            respawnTime: 0, // Géré par cooldown système
            
            // Requirements résolus
            requirements: Object.keys(resolvedRequirements).length > 0 ? resolvedRequirements : undefined,
            
            // Propriétés custom (pour compatibilité)
            customProperties: {
              // Données JSON originales
              sprite: objData.sprite,
              cooldownHours: objData.cooldown || 24,
              
              // Propriétés spécifiques hidden
              ...(objData.type === 'hidden' && {
                searchRadius: objData.searchRadius || 16,
                itemfinderRadius: objData.itemfinderRadius || 64
              }),
              
              // Toutes les autres propriétés
              originalType: objData.type,
              requirementPreset: objData.requirementPreset
            },
            
            // État runtime
            state: {
              collected: false,
              collectedBy: []
            }
          };

          objects.set(objData.id, objectDef);
          
          console.log(`✅ [JSON] Objet ${objData.id} ajouté:`, {
            finalType,
            hasRequirements: !!objectDef.requirements,
            customPropsCount: Object.keys(objectDef.customProperties).length
          });

        } catch (objError) {
          console.error(`❌ [JSON] Erreur traitement objet ${objData.id}:`, objError);
          this.log('error', `Erreur objet ${objData.id}`, objError);
        }
      }

      this.objectsByZone.set(zoneName, objects);
      
      console.log(`🎉 [JSON] Zone ${zoneName} chargée avec succès:`, {
        totalObjects: objects.size,
        groundItems: Array.from(objects.values()).filter(o => o.type === 'ground_item').length,
        hiddenItems: Array.from(objects.values()).filter(o => o.type === 'hidden_item').length
      });

    } catch (error) {
      console.error(`❌ [JSON] Erreur chargement ${zoneName}.json:`, error);
      this.log('error', `Erreur chargement JSON ${zoneName}`, error);
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Résoudre requirements avec héritage
   */
  private resolveRequirements(
    objData: any,
    defaultRequirements?: GameObjectZoneData['defaultRequirements'],
    requirementPresets?: GameObjectZoneData['requirementPresets']
  ): Record<string, any> {
    let resolved: Record<string, any> = {};

    // 1. Defaults selon le type
    if (defaultRequirements && objData.type in defaultRequirements) {
      resolved = { ...resolved, ...defaultRequirements[objData.type as keyof typeof defaultRequirements] };
    }

    // 2. Preset spécifique
    if (objData.requirementPreset && requirementPresets?.[objData.requirementPreset]) {
      resolved = { ...resolved, ...requirementPresets[objData.requirementPreset] };
    }

    // 3. Requirements directs (priorité max)
    if (objData.requirements) {
      resolved = { ...resolved, ...objData.requirements };
    }

    return resolved;
  }

  // === ACCÈS AUX OBJETS (INCHANGÉ) ===

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
            rarity: objectDef.rarity,
            sprite: objectDef.customProperties?.sprite, // ← NOUVEAU
            collected: false
          });
        }
      }
    }

    if (serverConfig.autoresetObjects && visibleObjects.length > 0) {
      console.log(`🔄 [JSON] Reset visuel: ${visibleObjects.length} objets visibles dans ${zone}`);
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
      name: objectData.name || `Object_${objectId}`,
      x: objectData.x || 0,
      y: objectData.y || 0,
      zone,
      type: objectData.type || 'unknown',
      itemId: objectData.itemId,
      quantity: objectData.quantity || 1,
      rarity: objectData.rarity || 'common',
      respawnTime: objectData.respawnTime || 0,
      requirements: objectData.requirements,
      customProperties: objectData.customProperties || {},
      state: {
        collected: false,
        collectedBy: []
      }
    };

    zoneObjects.set(objectId, objectDef);
    this.log('info', `📦 [JSON] Objet ${objectId} ajouté dynamiquement à ${zone}`);
  }

  resetObject(zone: string, objectId: number): boolean {
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) return false;

    this.stateManager.resetObject(zone, objectId);
    this.log('info', `🔄 [JSON] Objet ${objectId} réinitialisé dans ${zone}`);
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
      this.log('info', `🎁 [JSON] Donner item à ${playerName}`, { itemId, quantity, source });
      
      return {
        success: true,
        message: `${quantity}x ${itemId} ajouté à l'inventaire`,
        newQuantity: quantity
      };
      
    } catch (error) {
      this.log('error', '❌ [JSON] Erreur giveItemToPlayer', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // === CYCLE DE VIE ===

  async initialize(): Promise<void> {
    await super.initialize();
    
    console.log(`🚀 [JSON] Initialisation du système modulaire avec JSON...`);
    
    await this.subModuleFactory.discoverAndLoadModules();
    
    if (this.config.autoLoadMaps) {
      await this.loadDefaultJSONZones();
    }
    
    console.log(`✅ [JSON] Système d'objets JSON initialisé avec succès`);
  }

  async cleanup(): Promise<void> {
    this.log('info', '🧹 [JSON] Nettoyage du système d\'objets...');
    
    await this.subModuleFactory.cleanup();
    this.stateManager.cleanup();
    
    await super.cleanup();
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Charger les zones JSON par défaut
   */
  private async loadDefaultJSONZones(): Promise<void> {
    console.log(`📂 [JSON] Chargement des zones depuis: ${this.config.gameObjectsPath}`);
    
    try {
      const gameObjectsDir = path.resolve(this.config.gameObjectsPath);
      
      if (!fs.existsSync(gameObjectsDir)) {
        console.log(`📁 [JSON] Création du dossier: ${gameObjectsDir}`);
        fs.mkdirSync(gameObjectsDir, { recursive: true });
        return;
      }

      const jsonFiles = fs.readdirSync(gameObjectsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      console.log(`📋 [JSON] ${jsonFiles.length} fichiers JSON trouvés:`, jsonFiles);

      for (const zoneName of jsonFiles) {
        console.log(`⏳ [JSON] Chargement zone: ${zoneName}...`);
        await this.loadObjectsFromJSON(zoneName);
      }

      console.log(`🎉 [JSON] Toutes les zones chargées avec succès !`);
      
    } catch (error) {
      console.error(`❌ [JSON] Erreur chargement zones:`, error);
    }
  }

  // === MÉTHODES D'ADMINISTRATION ===

  async reloadSubModule(typeName: string): Promise<boolean> {
    return await this.subModuleFactory.reloadModule(typeName);
  }

  /**
   * ✅ MODIFIÉ : Recharger une zone JSON
   */
  async reloadZone(zoneName: string): Promise<boolean> {
    try {
      console.log(`🔄 [JSON] Rechargement zone: ${zoneName}`);
      
      // Supprimer la zone actuelle
      this.objectsByZone.delete(zoneName);
      
      // Recharger depuis JSON
      await this.loadObjectsFromJSON(zoneName);
      
      const reloadedObjects = this.objectsByZone.get(zoneName)?.size || 0;
      console.log(`✅ [JSON] Zone ${zoneName} rechargée: ${reloadedObjects} objets`);
      
      return reloadedObjects > 0;
    } catch (error) {
      console.error(`❌ [JSON] Erreur rechargement ${zoneName}:`, error);
      return false;
    }
  }

  getSystemStats(): any {
    const factoryStats = this.subModuleFactory.getStats();
    const stateStats = this.stateManager.getStats();
    const baseStats = this.getStats();

    return {
      module: baseStats,
      factory: factoryStats,
      states: stateStats,
      config: {
        gameObjectsPath: this.config.gameObjectsPath, // ← MODIFIÉ
        autoLoadMaps: this.config.autoLoadMaps,
        version: this.version
      },
      zones: {
        total: this.objectsByZone.size,
        zones: Array.from(this.objectsByZone.keys()),
        totalObjects: Array.from(this.objectsByZone.values())
          .reduce((sum, zoneMap) => sum + zoneMap.size, 0)
      }
    };
  }

  debugSystem(): void {
    console.log(`🔍 [JSON] === DEBUG SYSTÈME OBJETS JSON ===`);
    
    console.log(`📦 Zones chargées: ${this.objectsByZone.size}`);
    for (const [zone, objects] of this.objectsByZone.entries()) {
      console.log(`  🌍 ${zone}: ${objects.size} objets`);
      
      // Détails par type
      const byType: Record<string, number> = {};
      for (const obj of objects.values()) {
        byType[obj.type] = (byType[obj.type] || 0) + 1;
      }
      for (const [type, count] of Object.entries(byType)) {
        console.log(`    📋 ${type}: ${count}`);
      }
    }
    
    this.subModuleFactory.debug();
    
    const stateStats = this.stateManager.getStats();
    console.log(`💾 États: ${JSON.stringify(stateStats, null, 2)}`);
  }

  // === MÉTHODES UTILITAIRES PROTÉGÉES ===

  protected createErrorResult(message: string, code?: string): InteractionResult {
    return createInteractionResult.error(message, code, {
      module: this.moduleName,
      timestamp: Date.now()
    });
  }
}
