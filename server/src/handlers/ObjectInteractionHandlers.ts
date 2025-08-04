// src/handlers/ObjectInteractionHandlers.ts
// Handlers séparés pour les interactions d'objets - Garde WorldRoom propre
// VERSION CORRIGÉE : Support MongoDB + Legacy

import { Client } from "@colyseus/core";
import { ObjectInteractionModule } from "../interactions/modules/ObjectInteractionModule";
import { InteractionRequest } from "../interactions/types/BaseInteractionTypes";
import { getItemPocket } from "../utils/ItemDB";

// ✅ NOUVEAUX IMPORTS - Support MongoDB
import { ItemService } from "../services/ItemService";
import { ItemData } from "../models/ItemData";

export class ObjectInteractionHandlers {
  
  private worldRoom: any; // Type WorldRoom
  private objectModule: ObjectInteractionModule;

  constructor(worldRoom: any) {
    this.worldRoom = worldRoom;
    console.log(`🎯 [ObjectInteractionHandlers] Initialisé avec support MongoDB`);
  }

  // ✅ NOUVELLE MÉTHODE : Récupère la poche d'un item (hybride Legacy + MongoDB)
  private async getItemPocketHybrid(itemId: string): Promise<string> {
    try {
      // 1. Essayer d'abord le système legacy
      try {
        return getItemPocket(itemId);
      } catch (legacyError) {
        // Continue vers MongoDB
      }

      // 2. Essayer avec MongoDB
      const mongoItem = await ItemService.getItemById(itemId);
      if (mongoItem) {
        return this.getCategoryToPocket(mongoItem.category);
      }

      // 3. Normaliser et réessayer
      const normalizedId = this.normalizeItemId(itemId);
      if (normalizedId !== itemId) {
        const normalizedItem = await ItemService.getItemById(normalizedId);
        if (normalizedItem) {
          console.log(`📦 [ObjectHandlers] Poche trouvée avec ID normalisé: ${itemId} → ${normalizedId}`);
          return this.getCategoryToPocket(normalizedItem.category);
        }
      }

      // 4. Recherche case-insensitive
      const item = await ItemData.findOne({ 
        itemId: { $regex: new RegExp(`^${itemId}$`, 'i') }, 
        isActive: true 
      });
      
      if (item) {
        console.log(`📦 [ObjectHandlers] Poche trouvée (case-insensitive): ${itemId} → ${item.itemId}`);
        return this.getCategoryToPocket(item.category);
      }

      // 5. Fallback par défaut
      console.warn(`⚠️ [ObjectHandlers] Poche non trouvée pour ${itemId}, utilisation 'items' par défaut`);
      return 'items';

    } catch (error) {
      console.error(`❌ [ObjectHandlers] Erreur récupération poche pour ${itemId}:`, error);
      return 'items'; // Fallback sûr
    }
  }

  // ✅ NOUVELLE MÉTHODE : Mappage MongoDB category vers poche legacy
  private getCategoryToPocket(category: string): string {
    const categoryToPocketMap: { [key: string]: string } = {
      'medicine': 'medicine',
      'pokeballs': 'balls', 
      'battle_items': 'battle_items',
      'key_items': 'key_items',
      'berries': 'berries',
      'machines': 'tms',
      'evolution_items': 'items',
      'held_items': 'held_items',
      'z_crystals': 'key_items',
      'dynamax_crystals': 'key_items',
      'tera_shards': 'items',
      'poke_toys': 'items',
      'ingredients': 'items',
      'treasure': 'valuables',
      'fossil': 'key_items',
      'flutes': 'key_items',
      'mail': 'key_items',
      'exp_items': 'items'
    };
    
    return categoryToPocketMap[category] || 'items';
  }

  // ✅ NOUVELLE MÉTHODE : Normalisation d'ID
  private normalizeItemId(itemId: string): string {
    if (!itemId) return itemId;
    
    return itemId
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // === MÉTHODES DE CONFIGURATION ===

  /**
   * Définir le module d'interaction objets
   */
  setObjectModule(objectModule: ObjectInteractionModule): void {
    this.objectModule = objectModule;
    console.log(`🔗 [ObjectInteractionHandlers] Module d'objets configuré`);
  }

  /**
   * Configuration des handlers dans WorldRoom
   */
  setupHandlers(): void {
    console.log(`📨 [ObjectInteractionHandlers] Configuration des handlers...`);

    // ✅ HANDLER: Interaction avec objet au sol/visible
    this.worldRoom.onMessage("objectInteract", async (client: Client, data: { objectId: string }) => {
      await this.handleObjectInteraction(client, data);
    });

    // ✅ HANDLER: Fouille d'objets cachés
    this.worldRoom.onMessage("searchHiddenItem", async (client: Client, data: { x: number; y: number }) => {
      await this.handleHiddenItemSearch(client, data);
    });

    // ✅ HANDLER: Demander les objets visibles d'une zone
    this.worldRoom.onMessage("requestZoneObjects", (client: Client, data: { zone: string }) => {
      this.handleRequestZoneObjects(client, data);
    });

    // ✅ HANDLER: Debug objets (dev seulement)
    this.worldRoom.onMessage("debugObjects", (client: Client) => {
      this.handleDebugObjects(client);
    });

    // ✅ HANDLER: Ajouter objet dynamiquement (dev/admin)
    this.worldRoom.onMessage("addObjectToZone", (client: Client, data: { zone: string; objectDef: any }) => {
      this.handleAddObjectToZone(client, data);
    });

    // ✅ HANDLER: Reset objet (admin)
    this.worldRoom.onMessage("resetObject", (client: Client, data: { zone: string; objectId: number }) => {
      this.handleResetObject(client, data);
    });

    // ✅ HANDLER: Hot-reload module (dev)
    this.worldRoom.onMessage("reloadObjectModule", (client: Client, data: { typeName: string }) => {
      this.handleReloadModule(client, data);
    });

    console.log(`✅ [ObjectInteractionHandlers] 7 handlers configurés avec support MongoDB`);
  }

  // === HANDLERS PRINCIPAUX ===

  /**
   * ✅ HANDLER MODIFIÉ : Interaction avec objet spécifique
   */
  private async handleObjectInteraction(client: Client, data: { objectId: string }): Promise<void> {
    console.log(`📦 [ObjectHandlers] Object interaction: ${data.objectId}`);
    
    const player = this.worldRoom.state.players.get(client.sessionId);
    if (!player) {
      client.send("objectInteractionResult", {
        success: false,
        message: "Joueur non trouvé"
      });
      return;
    }

    if (!this.objectModule) {
      client.send("objectInteractionResult", {
        success: false,
        message: "Système d'objets non disponible"
      });
      return;
    }

    try {
      // ✅ Créer la requête d'interaction
      const request: InteractionRequest = {
        type: 'object',
        targetId: data.objectId,
        position: {
          x: player.x,
          y: player.y,
          mapId: player.currentZone
        },
        data: {
          objectId: data.objectId
        },
        timestamp: Date.now()
      };

      // ✅ Traiter via le module
      const result = await this.objectModule.handle({
        player,
        request,
        validations: {},
        metadata: { timestamp: Date.now() }
      });
      
      console.log(`✅ [ObjectHandlers] Résultat: ${result.type}`);
      
      // ✅ Envoyer le résultat
      client.send("objectInteractionResult", result);

      // ✅ CORRECTION : Si succès et item reçu, notifier l'inventaire avec poche hybride
      if (result.success && result.data?.metadata?.itemReceived) {
        const itemData = result.data.metadata.itemReceived;
        
        // ✅ UTILISER LA MÉTHODE HYBRIDE POUR LA POCHE
        const itemPocket = await this.getItemPocketHybrid(itemData.itemId);
        
        client.send("inventoryUpdate", {
          type: "add",
          itemId: itemData.itemId,
          quantity: itemData.quantity,
          pocket: itemPocket
        });
        
        console.log(`📦 [ObjectHandlers] Item ajouté: ${itemData.itemId} x${itemData.quantity} (poche: ${itemPocket})`);
      }

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur object interaction:", error);
      client.send("objectInteractionResult", {
        success: false,
        type: "error",
        message: "Erreur lors de l'interaction avec l'objet"
      });
    }
  }

  /**
   * ✅ HANDLER MODIFIÉ : Fouille d'objets cachés
   */
  private async handleHiddenItemSearch(client: Client, data: { x: number; y: number }): Promise<void> {
    console.log(`🔍 [ObjectHandlers] Hidden item search at (${data.x}, ${data.y})`);
    
    const player = this.worldRoom.state.players.get(client.sessionId);
    if (!player) {
      client.send("searchResult", {
        success: false,
        message: "Joueur non trouvé"
      });
      return;
    }

    if (!this.objectModule) {
      client.send("searchResult", {
        success: false,
        message: "Système de fouille non disponible"
      });
      return;
    }

    // ✅ Bloquer le mouvement pendant la fouille
    this.worldRoom.blockPlayerMovement(client.sessionId, 'search', 1500);

    try {
      // ✅ Créer la requête de fouille
      const request: InteractionRequest = {
        type: 'object',
        targetId: 'search_general',
        position: {
          x: data.x,
          y: data.y,
          mapId: player.currentZone
        },
        data: {
          action: 'search'
        },
        timestamp: Date.now()
      };

      // ✅ Traiter via le module
      const result = await this.objectModule.handle({
        player,
        request,
        validations: {},
        metadata: { timestamp: Date.now() }
      });
      
      console.log(`🔍 [ObjectHandlers] Search result: ${result.type}`);
      
      // ✅ Envoyer le résultat
      client.send("searchResult", result);

      // ✅ CORRECTION : Si objet trouvé, notifier l'inventaire avec poche hybride
      if (result.success && result.data?.metadata?.itemReceived) {
        const itemData = result.data.metadata.itemReceived;
        
        // ✅ UTILISER LA MÉTHODE HYBRIDE POUR LA POCHE
        const itemPocket = await this.getItemPocketHybrid(itemData.itemId);
        
        client.send("inventoryUpdate", {
          type: "add",
          itemId: itemData.itemId,
          quantity: itemData.quantity,
          pocket: itemPocket
        });
        
        console.log(`🎁 [ObjectHandlers] Item caché trouvé: ${itemData.itemId} x${itemData.quantity} (poche: ${itemPocket})`);
      }

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur search:", error);
      client.send("searchResult", {
        success: false,
        type: "error",
        message: "Erreur lors de la fouille"
      });
    } finally {
      // ✅ Débloquer le mouvement
      this.worldRoom.unblockPlayerMovement(client.sessionId, 'search');
    }
  }

  /**
   * Demander les objets visibles d'une zone
   */
  private handleRequestZoneObjects(client: Client, data: { zone: string }): void {
    console.log(`📦 [ObjectHandlers] Request objects for zone: ${data.zone}`);
    
    if (!this.objectModule) {
      client.send("zoneObjects", { zone: data.zone, objects: [] });
      return;
    }

    try {
      const visibleObjects = this.objectModule.getVisibleObjectsInZone(data.zone);
      
      client.send("zoneObjects", {
        zone: data.zone,
        objects: visibleObjects
      });

      console.log(`📤 [ObjectHandlers] Sent ${visibleObjects.length} objects for zone ${data.zone}`);

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur requestZoneObjects:", error);
      client.send("zoneObjects", { zone: data.zone, objects: [] });
    }
  }

  // === HANDLERS ADMIN/DEBUG ===

  /**
   * Debug objets (dev seulement)
   */
  private handleDebugObjects(client: Client): void {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Debug refusé: ${client.sessionId} pas dev`);
      return;
    }

    if (!this.objectModule) {
      client.send("objectDebugResult", { error: "Module non disponible" });
      return;
    }

    console.log(`🔍 [ObjectHandlers] Debug objects by ${player.name}`);
    
    try {
      this.objectModule.debugSystem();
      const stats = this.objectModule.getSystemStats();
      
      client.send("objectDebugResult", {
        success: true,
        stats
      });
      
    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur debug:", error);
      client.send("objectDebugResult", { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
    }
  }

  /**
   * Ajouter objet dynamiquement (dev/admin)
   */
  private handleAddObjectToZone(client: Client, data: { zone: string; objectDef: any }): void {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Add object refusé: ${client.sessionId} pas dev`);
      return;
    }

    if (!this.objectModule) {
      client.send("objectAdded", { success: false, message: "Module non disponible" });
      return;
    }

    try {
      this.objectModule.addObject(data.zone, data.objectDef);
      
      client.send("objectAdded", {
        success: true,
        zone: data.zone,
        objectId: data.objectDef.id
      });

      console.log(`➕ [ObjectHandlers] Objet ${data.objectDef.id} ajouté à ${data.zone} par ${player.name}`);

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur add object:", error);
      client.send("objectAdded", { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur ajout objet' 
      });
    }
  }

  /**
   * Reset objet (admin)
   */
  private handleResetObject(client: Client, data: { zone: string; objectId: number }): void {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Reset object refusé: ${client.sessionId} pas dev`);
      return;
    }

    if (!this.objectModule) {
      client.send("objectReset", { success: false, message: "Module non disponible" });
      return;
    }

    try {
      const success = this.objectModule.resetObject(data.zone, data.objectId);
      
      client.send("objectReset", {
        success,
        zone: data.zone,
        objectId: data.objectId,
        message: success ? "Objet réinitialisé" : "Objet non trouvé"
      });

      if (success) {
        console.log(`🔄 [ObjectHandlers] Objet ${data.objectId} reset dans ${data.zone} par ${player.name}`);
      }

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur reset object:", error);
      client.send("objectReset", { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur reset objet' 
      });
    }
  }

  /**
   * Hot-reload module (dev)
   */
  private async handleReloadModule(client: Client, data: { typeName: string }): Promise<void> {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Reload module refusé: ${client.sessionId} pas dev`);
      return;
    }

    if (!this.objectModule) {
      client.send("moduleReloaded", { success: false, message: "Module non disponible" });
      return;
    }

    try {
      console.log(`🔥 [ObjectHandlers] Hot-reload module ${data.typeName} by ${player.name}`);
      
      const success = await this.objectModule.reloadSubModule(data.typeName);
      
      client.send("moduleReloaded", {
        success,
        typeName: data.typeName,
        message: success ? "Module rechargé avec succès" : "Échec du rechargement"
      });

      if (success) {
        console.log(`✅ [ObjectHandlers] Module ${data.typeName} rechargé avec succès`);
      }

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur reload module:", error);
      client.send("moduleReloaded", { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur reload module' 
      });
    }
  }

  // === MÉTHODES PUBLIQUES POUR WORLDROOM ===

  /**
   * Charger les objets d'une zone quand joueur rejoint
   */
  async loadObjectsForZone(zoneName: string): Promise<void> {
    if (!this.objectModule) {
      console.warn(`⚠️ [ObjectHandlers] Module non disponible pour charger zone ${zoneName}`);
      return;
    }

    try {
      const mapPath = `../../../assets/maps/${zoneName}.tmj`;
      await this.objectModule.loadObjectsFromJSON(zoneName);
      console.log(`✅ [ObjectHandlers] Objets chargés pour zone ${zoneName}`);
    } catch (error) {
      console.error(`❌ [ObjectHandlers] Erreur chargement objets zone ${zoneName}:`, error);
    }
  }

  /**
   * Envoyer les objets visibles au client qui rejoint une zone
   */
  sendZoneObjectsToClient(client: Client, zoneName: string): void {
    if (!this.objectModule) {
      return;
    }

    try {
      const visibleObjects = this.objectModule.getVisibleObjectsInZone(zoneName);
      
      client.send("zoneObjects", {
        zone: zoneName,
        objects: visibleObjects
      });

      console.log(`📦 [ObjectHandlers] ${visibleObjects.length} objets envoyés pour zone ${zoneName}`);
    } catch (error) {
      console.error(`❌ [ObjectHandlers] Erreur envoi objets zone ${zoneName}:`, error);
    }
  }

  // ✅ NOUVELLES MÉTHODES DE DIAGNOSTIC

  /**
   * ✅ NOUVEAU : Diagnostique les items de l'inventaire des clients
   */
  async diagnoseInventoryItems(client: Client): Promise<void> {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Diagnose inventory refusé: ${client.sessionId} pas dev`);
      return;
    }

    try {
      // Import InventoryManager dynamiquement
      const { InventoryManager } = await import('../managers/InventoryManager');
      
      const diagnosis = await InventoryManager.diagnoseInventoryItems(player.name);
      
      client.send("inventoryDiagnosis", {
        success: true,
        playerName: player.name,
        diagnosis
      });

      console.log(`🔍 [ObjectHandlers] Diagnostic inventaire pour ${player.name}:`, diagnosis);

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur diagnostic inventaire:", error);
      client.send("inventoryDiagnosis", { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur diagnostic' 
      });
    }
  }

  /**
   * ✅ NOUVEAU : Répare l'inventaire d'un joueur
   */
  async repairPlayerInventory(client: Client, options: any = {}): Promise<void> {
    const player = this.worldRoom.state.players.get(client.sessionId);
    
    if (!player?.isDev) {
      console.log(`🚫 [ObjectHandlers] Repair inventory refusé: ${client.sessionId} pas dev`);
      return;
    }

    try {
      // Import InventoryManager dynamiquement
      const { InventoryManager } = await import('../managers/InventoryManager');
      
      const repairResult = await InventoryManager.repairInventory(player.name, {
        removeUnknownItems: options.removeUnknownItems || false,
        fixPockets: options.fixPockets || true,
        normalizeItemIds: options.normalizeItemIds || true
      });
      
      client.send("inventoryRepaired", {
        success: true,
        playerName: player.name,
        repairResult
      });

      console.log(`🔧 [ObjectHandlers] Inventaire réparé pour ${player.name}:`, repairResult);

    } catch (error) {
      console.error("❌ [ObjectHandlers] Erreur réparation inventaire:", error);
      client.send("inventoryRepaired", { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur réparation' 
      });
    }
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    console.log(`🧹 [ObjectInteractionHandlers] Nettoyage...`);
    
    if (this.objectModule) {
      await this.objectModule.cleanup();
    }
    
    console.log(`✅ [ObjectInteractionHandlers] Nettoyage terminé`);
  }
}
