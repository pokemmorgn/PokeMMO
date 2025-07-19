// src/interactions/modules/ObjectInteractionModule.ts
// Module principal d'interaction avec les objets - VERSION FINALE PROPRE
//
// ✅ CONFIGURATION FACILE DU LAYER :
// Pour changer le nom du layer dans Tiled, modifiez :
// - objectLayerName: 'objects' → 'items' ou 'interactables' etc.
// Ou utilisez : objectModule.setObjectLayerName('mon_layer')

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

// ✅ INTERFACE POUR ÉTAT PERSISTANT DES OBJETS
interface ObjectState {
  objectId: number;
  zone: string;
  collected: boolean;
  lastCollectedTime?: number;
  collectedBy: string[];
  customState?: Record<string, any>;
}

// ✅ GESTIONNAIRE D'ÉTAT PERSISTANT
class ObjectStateManager {
  private states: Map<string, ObjectState> = new Map(); // `${zone}_${objectId}` -> state
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
      // Créer état par défaut
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
      // Créer le dossier si nécessaire
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
    // Sauvegarde automatique toutes les 5 minutes
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

// ✅ MODULE PRINCIPAL - VERSION FINALE CORRIGÉE
export class ObjectInteractionModule extends BaseInteractionModule {
  
  readonly moduleName = "ObjectInteractionModule";
  readonly supportedTypes: InteractionType[] = ["object"];
  readonly version = "1.0.0";

  // ✅ COMPOSANTS DU SYSTÈME
  private subModuleFactory: SubModuleFactory;
  private stateManager: ObjectStateManager;
  private objectsByZone: Map<string, Map<number, ObjectDefinition>> = new Map();
  
  // ✅ CONFIGURATION
  private config = {
    submodulesPath: path.resolve(__dirname, './object/submodules'),
    stateFile: './data/object_states.json',
    autoLoadMaps: true,
    securityEnabled: process.env.NODE_ENV === 'production',
    objectLayerName: 'objects' // ✅ VARIABLE CONFIGURABLE POUR LE NOM DU LAYER
  };

  constructor(customConfig?: Partial<typeof ObjectInteractionModule.prototype.config>) {
    super();
    
    // Fusionner configuration
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.log('info', `Initialisation avec config:`, {
      objectLayerName: this.config.objectLayerName,
      autoLoadMaps: this.config.autoLoadMaps,
      securityEnabled: this.config.securityEnabled
    });
    
    // Initialiser composants
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

  // === MÉTHODES PRINCIPALES (BaseInteractionModule) ===

  canHandle(request: InteractionRequest): boolean {
    return request.type === 'object';
  }

  async handle(context: InteractionContext): Promise<InteractionResult> {
    const startTime = Date.now();
    
    try {
      const { player, request } = context;
      
      this.log('info', `Traitement interaction objet`, { 
        player: player.name, 
        data: request.data 
      });

      // Déterminer le type d'interaction
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
      
      this.log('error', 'Erreur traitement objet', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        "PROCESSING_FAILED"
      );
    }
  }

  // === HANDLERS SPÉCIALISÉS - VERSION CORRIGÉE ===

  private async handleSpecificObject(player: Player, request: InteractionRequest): Promise<InteractionResult> {
    const startTime = Date.now();
    const objectIdRaw = request.data?.objectId;
    const objectId = typeof objectIdRaw === 'string' ? parseInt(objectIdRaw, 10) : objectIdRaw;
    const zone = player.currentZone;
    
    if (!objectId || isNaN(objectId)) {
      return this.createErrorResult(`Object ID invalide: ${objectIdRaw}`, "INVALID_OBJECT_ID");
    }
    
    // Récupérer la définition de l'objet
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) {
      return this.createErrorResult(`Objet ${objectId} non trouvé dans ${zone}`, "OBJECT_NOT_FOUND");
    }

    // Mettre à jour l'état depuis le StateManager
    const state = this.stateManager.getObjectState(zone, objectId);
    objectDef.state = state;

    // Trouver le sous-module approprié
    const subModule = this.subModuleFactory.findModuleForObject(objectDef);
    if (!subModule) {
      return this.createErrorResult(`Aucun gestionnaire pour le type: ${objectDef.type}`, "NO_HANDLER");
    }

    this.log('info', `Délégation à ${subModule.typeName}`, { objectId, type: objectDef.type });

    // Déléguer au sous-module
    const result = await subModule.handle(player, objectDef, request.data);

    // Mettre à jour les statistiques
    const processingTime = Date.now() - startTime;
    this.updateStats(result.success, processingTime);

    // Post-traitement si succès
    if (result.success && result.data?.objectData?.collected) {
      this.stateManager.markAsCollected(zone, objectId, player.name);
      
      // Assurer compatibilité des types pour objectId
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
    
    // Chercher des objets cachés proches
    const nearbyHiddenObjects = this.findHiddenObjectsNear(zone, position.x, position.y, 32);

    if (nearbyHiddenObjects.length > 0) {
      // Prendre le premier objet caché trouvé
      const objectDef = nearbyHiddenObjects[0];
      const state = this.stateManager.getObjectState(zone, objectDef.id);
      objectDef.state = state;

      // Trouver le sous-module pour objets cachés
      const subModule = this.subModuleFactory.findModuleForObject(objectDef);
      if (subModule) {
        const result = await subModule.handle(player, objectDef, { action: 'search' });
        
        if (result.success && result.data?.objectData?.collected) {
          this.stateManager.markAsCollected(zone, objectDef.id, player.name);
          
          // Assurer compatibilité des types pour objectId
          if (result.data?.objectData) {
            result.data.objectData.objectId = objectDef.id.toString();
          }
        }
        
        return result;
      }
    }

    // Rien trouvé
    return createInteractionResult.noItemFound(
      "0",           // objectId
      "search",      // objectType  
      "Il n'y a rien ici.", // message
      1              // attempts
    );
  }

  // === PARSING DES MAPS - VERSION FINALE CORRIGÉE ===

  /**
   * Charger les objets d'une zone depuis la map Tiled
   */
  async loadObjectsFromMap(zoneName: string, mapPath: string): Promise<void> {
    try {
      const resolvedPath = path.isAbsolute(mapPath) 
        ? mapPath 
        : path.resolve(__dirname, mapPath);

      if (!fs.existsSync(resolvedPath)) {
        this.log('warn', `Fichier map introuvable: ${resolvedPath}`);
        return;
      }

      const mapData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      
      // ✅ UTILISE LA VARIABLE CONFIGURABLE POUR LE LAYER
      const objectLayer = mapData.layers?.find((l: any) => l.name === this.config.objectLayerName);
      if (!objectLayer || !objectLayer.objects) {
        this.log('info', `Aucun layer "${this.config.objectLayerName}" dans ${zoneName}`);
        return;
      }

      const objects = new Map<number, ObjectDefinition>();

      // Parser chaque objet
      for (const obj of objectLayer.objects) {
        const customProperties: Record<string, any> = {};
        
        if (obj.properties) {
          for (const prop of obj.properties) {
            customProperties[prop.name] = prop.value;
          }
        }

        const objectDef: ObjectDefinition = {
          id: obj.id,
          name: obj.name || customProperties['name'] || `Object_${obj.id}`,
          x: obj.x,
          y: obj.y,
          zone: zoneName,
          type: customProperties['type'] || 'unknown',
          itemId: customProperties['itemId'],
          quantity: customProperties['quantity'] || 1,
          rarity: customProperties['rarity'] || 'common',
          respawnTime: customProperties['respawnTime'] || 0,
          requirements: this.parseRequirements(customProperties),
          customProperties,
          state: {
            collected: false,
            collectedBy: []
          }
        };

        objects.set(obj.id, objectDef);
      }

      this.objectsByZone.set(zoneName, objects);
      this.log('info', `${objects.size} objets chargés pour ${zoneName}`);

    } catch (error) {
      this.log('error', `Erreur chargement map ${zoneName}`, error);
    }
  }

  private parseRequirements(props: Record<string, any>): ObjectDefinition['requirements'] {
    const requirements: any = {};
    
    if (props.level) requirements.level = props.level;
    if (props.badge) requirements.badge = props.badge;
    if (props.item) requirements.item = props.item;
    if (props.quest) requirements.quest = props.quest;
    
    return Object.keys(requirements).length > 0 ? requirements : undefined;
  }

  // === ACCÈS AUX OBJETS ===

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

  /**
   * Obtenir les objets visibles d'une zone
   */
  getVisibleObjectsInZone(zone: string): any[] {
    const zoneObjects = this.objectsByZone.get(zone);
    if (!zoneObjects) return [];

    const visibleObjects: any[] = [];

    for (const objectDef of zoneObjects.values()) {
      // Exclure les objets cachés et collectés
      if (objectDef.type !== 'hidden_item') {
        const state = this.stateManager.getObjectState(zone, objectDef.id);
        
        if (!state.collected) {
          visibleObjects.push({
            id: objectDef.id,
            type: objectDef.type,
            name: objectDef.name,
            x: objectDef.x,
            y: objectDef.y,
            rarity: objectDef.rarity,
            collected: false
          });
        }
      }
    }

    return visibleObjects;
  }

  /**
   * Ajouter un objet dynamiquement (admin/dev)
   */
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
    this.log('info', `Objet ${objectId} ajouté à la zone ${zone}`);
  }

  /**
   * Réinitialiser un objet (admin)
   */
  resetObject(zone: string, objectId: number): boolean {
    const objectDef = this.getObject(zone, objectId);
    if (!objectDef) return false;

    this.stateManager.resetObject(zone, objectId);
    this.log('info', `Objet ${objectId} réinitialisé dans ${zone}`);
    return true;
  }

  // === MÉTHODES PUBLIQUES POUR L'INVENTAIRE ===

  /**
   * Donner un objet au joueur via l'InventoryManager
   */
  async giveItemToPlayer(
    playerName: string,
    itemId: string,
    quantity: number = 1,
    source: string = 'object_interaction'
  ): Promise<{ success: boolean; message: string; newQuantity?: number }> {
    try {
      // TODO: Intégrer avec InventoryManager quand disponible
      // Pour l'instant, log seulement
      this.log('info', `Donner item à ${playerName}`, { itemId, quantity, source });
      
      // Simulation - remplacer par vraie logique InventoryManager
      return {
        success: true,
        message: `${quantity}x ${itemId} ajouté à l'inventaire`,
        newQuantity: quantity
      };
      
    } catch (error) {
      this.log('error', 'Erreur giveItemToPlayer', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // === CYCLE DE VIE ===

  async initialize(): Promise<void> {
    await super.initialize();
    
    this.log('info', 'Initialisation du système modulaire...');
    
    // Initialiser la factory et découvrir les sous-modules
    await this.subModuleFactory.discoverAndLoadModules();
    
    // Charger automatiquement les maps si configuré
    if (this.config.autoLoadMaps) {
      await this.loadDefaultMaps();
    }
    
    this.log('info', 'Système d\'objets initialisé avec succès');
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage du système d\'objets...');
    
    await this.subModuleFactory.cleanup();
    this.stateManager.cleanup();
    
    await super.cleanup();
  }

  // ✅ MÉTHODE FINALE SANS DEBUG
  private async loadDefaultMaps(): Promise<void> {
    const defaultZones = [
      'beach', 'village', 'villagelab', 'villagehouse1', 'villagewindmill', 
      'villagehouse2', 'villageflorist', 'road1', 'road2', 'road3'
    ];

    for (const zone of defaultZones) {
      const mapPath = path.resolve(process.cwd(), 'build', 'assets', 'maps', `${zone}.tmj`);
      await this.loadObjectsFromMap(zone, mapPath);
    }
  }

  // === MÉTHODES D'ADMINISTRATION ===

  async reloadSubModule(typeName: string): Promise<boolean> {
    return await this.subModuleFactory.reloadModule(typeName);
  }

  /**
   * ✅ CHANGER LE NOM DU LAYER D'OBJETS (facilement configurable)
   * @param layerName - Nom du layer dans Tiled (ex: "objects", "items", "interactables")
   */
  setObjectLayerName(layerName: string): void {
    this.config.objectLayerName = layerName;
    this.log('info', `Nom du layer d'objets changé: ${layerName}`);
  }

  /**
   * Obtenir le nom du layer actuel
   */
  getObjectLayerName(): string {
    return this.config.objectLayerName;
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
        objectLayerName: this.config.objectLayerName,
        autoLoadMaps: this.config.autoLoadMaps
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
    this.log('info', '=== DEBUG SYSTÈME OBJETS ===');
    
    console.log(`📦 Zones chargées: ${this.objectsByZone.size}`);
    for (const [zone, objects] of this.objectsByZone.entries()) {
      console.log(`  🌍 ${zone}: ${objects.size} objets`);
    }
    
    this.subModuleFactory.debug();
    
    const stateStats = this.stateManager.getStats();
    console.log(`💾 États: ${JSON.stringify(stateStats, null, 2)}`);
  }

  // === MÉTHODES UTILITAIRES PROTÉGÉES ===

  /**
   * Créer un résultat d'erreur standardisé
   */
  protected createErrorResult(message: string, code?: string): InteractionResult {
    return createInteractionResult.error(message, code, {
      module: this.moduleName,
      timestamp: Date.now()
    });
  }
}
