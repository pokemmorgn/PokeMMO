// ===== server/src/rooms/WorldRoom.ts =====
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";
import { NpcManager } from "../managers/NPCManager";
import { InventoryManager } from "../managers/InventoryManager"; 
import { getItemData, getItemPocket } from "../utils/ItemDB";


export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  private npcManagers: Map<string, NpcManager> = new Map();
  
  // Limite pour auto-scaling
  maxClients = 50;

  onCreate(options: any) {
    console.log(`🌍 === WORLDROOM CRÉATION ===`);
    console.log(`📊 Options:`, options);

    // Initialiser le state
    this.setState(new PokeWorldState());
    console.log(`✅ State initialisé`);

    // Initialiser le ZoneManager
    this.zoneManager = new ZoneManager(this);
    console.log(`✅ ZoneManager initialisé`);

    this.initializeNpcManagers();
    
    // Messages handlers
    this.setupMessageHandlers();
    console.log(`✅ Message handlers configurés`);

    console.log(`🚀 WorldRoom prête ! MaxClients: ${this.maxClients}`);
  }

    private initializeNpcManagers() {
    const zones = ['beach', 'village', 'villagelab', 'villagehouse1', 'road1', 'lavandia'];
    
    zones.forEach(zoneName => {
      try {
        const mapPath = `../assets/maps/${zoneName}.tmj`;
        const npcManager = new NpcManager(mapPath);
        this.npcManagers.set(zoneName, npcManager);
        console.log(`✅ NPCs chargés pour ${zoneName}: ${npcManager.getAllNpcs().length}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de charger les NPCs pour ${zoneName}:`, error);
      }
    });
  }

    async onPlayerJoinZone(client: Client, zoneName: string) {
    // ✅ ENVOYER LES NPCS DEPUIS LE FICHIER .TMJ
    const npcManager = this.npcManagers.get(zoneName);
    if (npcManager) {
      const npcs = npcManager.getAllNpcs();
      client.send("npcList", npcs);
      console.log(`📤 ${npcs.length} NPCs envoyés pour ${zoneName}`);
    }
  }
  
  private setupMessageHandlers() {
    console.log(`📨 === SETUP MESSAGE HANDLERS ===`);

    // === HANDLERS EXISTANTS ===
    
    // Mouvement du joueur
    this.onMessage("playerMove", (client, data) => {
      this.handlePlayerMove(client, data);
    });

    // Transition entre zones
    this.onMessage("moveToZone", (client, data) => {
      console.log(`🌀 === ZONE TRANSITION REQUEST ===`);
      console.log(`👤 From: ${client.sessionId}`);
      console.log(`📍 Data:`, data);
      this.zoneManager.handleZoneTransition(client, data);
    });

    // Interaction avec NPC
    this.onMessage("npcInteract", (client, data) => {
      console.log(`💬 === NPC INTERACTION REQUEST ===`);
      this.zoneManager.handleNpcInteraction(client, data.npcId);
    });

    // Démarrage de quête
    this.onMessage("questStart", (client, data) => {
      console.log(`🎯 === QUEST START REQUEST ===`);
      this.zoneManager.handleQuestStart(client, data.questId);
    });

    // === NOUVEAUX HANDLERS POUR L'INVENTAIRE ===

    // Récupérer l'inventaire complet du joueur
    this.onMessage("getInventory", async (client) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        console.log(`🎒 Récupération inventaire pour ${player.name}`);
        
        // Récupérer les données d'inventaire groupées par poche
        const inventoryData = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        
        client.send("inventoryData", inventoryData);
        console.log(`✅ Inventaire envoyé à ${player.name}:`, Object.keys(inventoryData));
        
      } catch (error) {
        console.error("❌ Erreur getInventory:", error);
        client.send("inventoryError", { 
          message: "Impossible de charger l'inventaire" 
        });
      }
    });

      public getNpcManager(zoneName: string): NpcManager | undefined {
    const npcManager = this.npcManagers.get(zoneName);
    if (!npcManager) {
      console.warn(`⚠️ [WorldRoom] NpcManager non trouvé pour la zone: ${zoneName}`);
      console.log(`📋 [WorldRoom] Zones disponibles:`, Array.from(this.npcManagers.keys()));
    }
    return npcManager;
  }

  // ✅ MÉTHODE UTILITAIRE : Lister toutes les zones avec NPCs
  public getAvailableNpcZones(): string[] {
    return Array.from(this.npcManagers.keys());
  }

  // ✅ MÉTHODE DEBUG : Afficher le statut des NPCs
  public debugNpcManagers(): void {
    console.log(`🔍 [WorldRoom] === DEBUG NPC MANAGERS ===`);
    this.npcManagers.forEach((npcManager, zoneName) => {
      const npcs = npcManager.getAllNpcs();
      console.log(`🌍 Zone: ${zoneName} - ${npcs.length} NPCs`);
      npcs.forEach(npc => {
        console.log(`  🤖 NPC ${npc.id}: ${npc.name} at (${npc.x}, ${npc.y})`);
      });
    });
    console.log(`=======================================`);
  }
  
    // Utiliser un objet
    this.onMessage("useItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Joueur non trouvé" 
          });
          return;
        }

        console.log(`🎒 ${player.name} utilise ${data.itemId} (contexte: ${data.context})`);

        // Vérifier si l'objet peut être utilisé
        const canUse = await InventoryManager.canUseItem(
          player.name, 
          data.itemId, 
          data.context
        );
        
        if (!canUse) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Impossible d'utiliser cet objet maintenant" 
          });
          return;
        }

        // Vérifier que le joueur possède l'objet
        const itemCount = await InventoryManager.getItemCount(player.name, data.itemId);
        if (itemCount <= 0) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Vous n'avez pas cet objet" 
          });
          return;
        }

        // Retirer l'objet de l'inventaire
        const success = await InventoryManager.removeItem(player.name, data.itemId, 1);
        if (!success) {
          client.send("itemUseResult", { 
            success: false, 
            message: "Erreur lors de la suppression de l'objet" 
          });
          return;
        }

        // Appliquer l'effet de l'objet
        const effectResult = await this.applyItemEffect(player, data.itemId, data.context);
        
        client.send("itemUseResult", { 
          success: true, 
          message: effectResult.message || `${data.itemId} utilisé avec succès` 
        });

        // Notifier la mise à jour d'inventaire
        client.send("inventoryUpdate", {
          type: "remove",
          itemId: data.itemId,
          quantity: 1,
          pocket: getItemPocket(data.itemId)
        });

        console.log(`✅ ${player.name} a utilisé ${data.itemId}`);
        
      } catch (error) {
        console.error("❌ Erreur useItem:", error);
        client.send("itemUseResult", { 
          success: false, 
          message: "Erreur lors de l'utilisation" 
        });
      }
    });

    // Ramasser un objet au sol
    this.onMessage("pickupItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          client.send("inventoryError", { message: "Joueur non trouvé" });
          return;
        }

        console.log(`🎒 ${player.name} ramasse ${data.itemId} à (${data.x}, ${data.y})`);

        // Vérifier la proximité (distance maximale de 2 tiles)
        const distance = Math.sqrt(
          Math.pow(player.x - data.x, 2) + Math.pow(player.y - data.y, 2)
        );
        
        if (distance > 2) {
          client.send("inventoryError", { message: "Objet trop éloigné" });
          return;
        }

        // Ajouter l'objet à l'inventaire
        await InventoryManager.addItem(player.name, data.itemId, 1);
        
        // Notifier le client
        client.send("inventoryUpdate", {
          type: "add",
          itemId: data.itemId,
          quantity: 1,
          pocket: getItemPocket(data.itemId)
        });

        client.send("itemPickup", {
          itemId: data.itemId,
          quantity: 1
        });

        console.log(`✅ ${player.name} a ramassé ${data.itemId}`);

      } catch (error) {
        console.error("❌ Erreur pickupItem:", error);
        client.send("inventoryError", { 
          message: "Impossible de ramasser l'objet" 
        });
      }
    });

    // Handler pour les tests (développement uniquement)
    this.onMessage("testAddItem", async (client, data) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        console.log(`🧪 Test: ajout de ${data.quantity || 1} ${data.itemId} à ${player.name}`);

        // Ajouter l'objet
        await InventoryManager.addItem(player.name, data.itemId, data.quantity || 1);
        
        // Notifier le client
        client.send("inventoryUpdate", {
          type: "add",
          itemId: data.itemId,
          quantity: data.quantity || 1,
          pocket: getItemPocket(data.itemId)
        });

        console.log(`✅ Test réussi: ${data.itemId} ajouté`);
        
      } catch (error) {
        console.error("❌ Erreur testAddItem:", error);
        client.send("inventoryError", { 
          message: `Erreur lors de l'ajout de ${data.itemId}` 
        });
      }
    });

    console.log(`✅ Tous les handlers configurés (y compris inventaire)`);
  }

  async onJoin(client: Client, options: any = {}) {
    console.log(`👤 === PLAYER JOIN ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`📊 Options:`, options);

    try {
      // Créer le joueur
      const player = new Player();
      
      // Données de base
      player.id = client.sessionId;
      player.name = options.name || `Player_${client.sessionId.substring(0, 6)}`;
      player.x = options.spawnX || 52;
      player.y = options.spawnY || 48;
      
      // Zone de spawn
      player.currentZone = options.spawnZone || "beach";
      console.log(`🌍 Zone de spawn: ${player.currentZone}`);
      
      // Compatibilité avec l'ancien système
      player.map = player.currentZone; // Compatibilité
      
      // Ajouter au state
      this.state.players.set(client.sessionId, player);
      
      console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      console.log(`✅ Joueur ${player.name} créé`);

      // === CONFIGURATION INVENTAIRE DE DÉPART ===
      try {
        console.log(`🎒 Configuration inventaire de départ pour ${player.name}`);
        
      
      // Donne les objets de départ
      await InventoryManager.addItem(player.name, "poke_ball", 5);
      await InventoryManager.addItem(player.name, "potion", 3);
      
      // Ne donne la town_map que si le joueur ne l’a pas déjà
      const hasMap = await InventoryManager.getItemCount(player.name, "town_map");
      if (hasMap === 0) {
        await InventoryManager.addItem(player.name, "town_map", 1);
      }

        
        // Afficher l'inventaire groupé par poche
        const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
        console.log(`🎒 [INVENTAIRE groupé par poche] ${player.name}:`, grouped);
        
        console.log(`✅ Objets de départ ajoutés pour ${player.name}`);
      } catch (err) {
        console.error(`❌ [INVENTAIRE] Erreur lors de l'ajout d'objets de départ pour ${player.name}:`, err);
      }
      
      // Faire entrer le joueur dans sa zone initiale
      await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
      
      console.log(`🎉 ${player.name} a rejoint le monde !`);

    } catch (error) {
      console.error(`❌ Erreur lors du join:`, error);
      
      // En cas d'erreur, faire quitter le client
      client.leave(1000, "Erreur lors de la connexion");
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 === PLAYER LEAVE ===`);
    console.log(`🔑 Session: ${client.sessionId}`);
    console.log(`✅ Consenti: ${consented}`);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`📍 Position finale: (${player.x}, ${player.y}) dans ${player.currentZone}`);
      
      // Notifier la zone que le joueur part
      this.zoneManager.onPlayerLeaveZone(client, player.currentZone);
      
      // Supprimer du state
      this.state.players.delete(client.sessionId);
      console.log(`🗑️ Joueur ${player.name} supprimé du state`);
    }

    console.log(`👋 Client ${client.sessionId} déconnecté`);
  }

  onDispose() {
    console.log(`💀 === WORLDROOM DISPOSE ===`);
    console.log(`👥 Joueurs restants: ${this.state.players.size}`);
    
    // Sauvegarder les données des joueurs restants
    this.state.players.forEach((player, sessionId) => {
      console.log(`💾 Sauvegarde joueur: ${player.name} à (${player.x}, ${player.y}) dans ${player.currentZone}`);
    });

    console.log(`✅ WorldRoom fermée`);
  }

  private handlePlayerMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Mettre à jour la position
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;

    // Debug occasionnel (1 fois sur 10)
    if (Math.random() < 0.1) {
    //  console.log(`🚶 ${player.name}: (${player.x}, ${player.y})`);
    console.log(`🌍 ${player.name}:  Zone: ${player.currentZone}`);
    }
  }

  // === MÉTHODES POUR LES EFFETS D'OBJETS ===

  /**
   * Applique l'effet d'un objet utilisé
   */
  private async applyItemEffect(player: any, itemId: string, context: string): Promise<{ message?: string }> {
    const itemData = getItemData(itemId);
    
    console.log(`🎯 Application effet ${itemId} pour ${player.name}`);
    
    switch (itemData.type) {
      case 'medicine':
        return await this.applyMedicineEffect(player, itemData);
        
      case 'item':
        return await this.applyUtilityItemEffect(player, itemData, itemId);
        
      case 'ball':
        return { message: `${itemId} utilisé (effet Poké Ball non implémenté)` };
        
      default:
        return { message: `${itemId} utilisé (effet générique)` };
    }
  }

  /**
   * Applique l'effet des objets de soin
   */
  private async applyMedicineEffect(player: any, itemData: any): Promise<{ message?: string }> {
    // TODO: Implémenter la logique de soin des Pokémon
    // Pour l'instant, juste un message
    
    if (itemData.heal_amount) {
      const healAmount = itemData.heal_amount === 'full' ? 'tous les' : itemData.heal_amount;
      return { message: `Pokémon soigné de ${healAmount} PV !` };
    }
    
    if (itemData.status_cure) {
      const curedStatus = Array.isArray(itemData.status_cure) ? itemData.status_cure.join(', ') : itemData.status_cure;
      return { message: `Statut ${curedStatus} guéri !` };
    }
    
    return { message: "Pokémon soigné !" };
  }

  /**
   * Applique l'effet des objets utilitaires
   */
  private async applyUtilityItemEffect(player: any, itemData: any, itemId: string): Promise<{ message?: string }> {
    switch (itemId) {
      case 'escape_rope':
        // TODO: Téléporter le joueur au dernier Centre Pokémon
        return { message: "Vous êtes retourné au dernier Centre Pokémon !" };
        
      case 'repel':
      case 'super_repel':
      case 'max_repel':
        // TODO: Activer l'effet Repousse
        const steps = itemData.effect_steps || 100;
        return { message: `Repousse activé pour ${steps} pas !` };
        
      default:
        return { message: `${itemId} utilisé !` };
    }
  }

  // === MÉTHODES UTILITAIRES POUR L'INVENTAIRE ===

  /**
   * Donner un objet à un joueur et notifier le client
   */
  async giveItemToPlayer(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      await InventoryManager.addItem(playerName, itemId, quantity);
      
      // Trouver le client pour la notification
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.name === playerName) {
          const client = this.clients.find(c => c.sessionId === sessionId);
          if (client) {
            client.send("inventoryUpdate", {
              type: "add",
              itemId: itemId,
              quantity: quantity,
              pocket: getItemPocket(itemId)
            });
          }
          break;
        }
      }
      
      console.log(`✅ Donné ${quantity} ${itemId} à ${playerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors du don d'objet:`, error);
      return false;
    }
  }

  /**
   * Retirer un objet à un joueur
   */
  async takeItemFromPlayer(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const success = await InventoryManager.removeItem(playerName, itemId, quantity);
      
      if (success) {
        // Trouver le client pour la notification
        for (const [sessionId, player] of this.state.players.entries()) {
          if (player.name === playerName) {
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) {
              client.send("inventoryUpdate", {
                type: "remove",
                itemId: itemId,
                quantity: quantity,
                pocket: getItemPocket(itemId)
              });
            }
            break;
          }
        }
        
        console.log(`✅ Retiré ${quantity} ${itemId} à ${playerName}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Erreur lors du retrait d'objet:`, error);
      return false;
    }
  }

  /**
   * Vérifier si un joueur possède un objet
   */
  async playerHasItem(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const count = await InventoryManager.getItemCount(playerName, itemId);
      return count >= quantity;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification d'objet:`, error);
      return false;
    }
  }
}
