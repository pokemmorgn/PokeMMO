// server/src/rooms/WorldRoom.ts - VERSION COMPLÈTE AVEC CORRECTIONS QUÊTES
import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { ZoneManager } from "../managers/ZoneManager";
import { NpcManager } from "../managers/NPCManager";
import { InventoryManager } from "../managers/InventoryManager"; 
import { getItemData, getItemPocket } from "../utils/ItemDB";

// Interfaces pour typer les réponses des quêtes
interface QuestStartResult {
  success: boolean;
  message: string;
  quest?: any;
}

interface Quest {
  id: string;
  name: string;
  currentStepIndex?: number;
}

export class WorldRoom extends Room<PokeWorldState> {
  private zoneManager!: ZoneManager;
  private npcManagers: Map<string, NpcManager> = new Map();
  
  // Limite pour auto-scaling
  maxClients = 50;
  private lastStateUpdate = 0;
  private stateUpdateInterval = 100;
  
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

    // ✅ ENVOYER LES STATUTS DE QUÊTE POUR CETTE ZONE
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.updateQuestStatuses(player.name);
    }
  }

  // ✅ MÉTHODES PUBLIQUES - CORRECTEMENT PLACÉES
  public getNpcManager(zoneName: string): NpcManager | undefined {
    const npcManager = this.npcManagers.get(zoneName);
    if (!npcManager) {
      console.warn(`⚠️ [WorldRoom] NpcManager non trouvé pour la zone: ${zoneName}`);
      console.log(`📋 [WorldRoom] Zones disponibles:`, Array.from(this.npcManagers.keys()));
    }
    return npcManager;
  }

  public getAvailableNpcZones(): string[] {
    return Array.from(this.npcManagers.keys());
  }

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

    this.onMessage("notifyZoneChange", (client, data: { newZone: string, x: number, y: number }) => {
  console.log(`🔄 === ZONE CHANGE NOTIFICATION ===`);
  console.log(`👤 Client: ${client.sessionId}`);
  console.log(`📍 Nouvelle zone: ${data.newZone} à (${data.x}, ${data.y})`);
  
  const player = this.state.players.get(client.sessionId);
  if (player) {
    const oldZone = player.currentZone;
    
    // Mettre à jour la zone et position du joueur
    player.currentZone = data.newZone;
    player.x = data.x;
    player.y = data.y;
    
    console.log(`✅ ${player.name}: ${oldZone} → ${data.newZone}`);
    
    // Envoyer les NPCs de la nouvelle zone
    this.onPlayerJoinZone(client, data.newZone);
    
    // Déclencher une mise à jour du state filtré
    this.scheduleFilteredStateUpdate();
  }
});
    // ✅ === NOUVEAUX HANDLERS POUR LES QUÊTES ===

    // Démarrage de quête
    this.onMessage("startQuest", (client, data) => {
      console.log(`🎯 === QUEST START REQUEST ===`);
      this.handleStartQuest(client, data);
    });

    // Récupérer les quêtes actives
    this.onMessage("getActiveQuests", (client) => {
      this.handleGetActiveQuests(client);
    });

    // Récupérer les quêtes disponibles
    this.onMessage("getAvailableQuests", (client) => {
      this.handleGetAvailableQuests(client);
    });

    // Progression de quête
    this.onMessage("questProgress", (client, data) => {
      this.handleQuestProgress(client, data);
    });

    // Debug des quêtes
    this.onMessage("debugQuests", (client) => {
      this.debugQuests(client);
    });

    // === HANDLERS POUR L'INVENTAIRE ===

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

    console.log(`✅ Tous les handlers configurés (y compris inventaire et quêtes)`);
  }

  // ✅ === NOUVEAUX HANDLERS POUR LES QUÊTES ===

  private async handleStartQuest(client: Client, data: { questId: string }) {
    try {
      console.log(`🎯 Démarrage de quête ${data.questId} pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("questStartResult", {
          success: false,
          message: "Joueur non trouvé"
        });
        return;
      }

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
      const result = await this.zoneManager.handleQuestStart(client, data.questId);
      
      console.log(`📤 Envoi questStartResult:`, result);
      client.send("questStartResult", result);
      
      // Si succès, envoyer aussi questStarted pour compatibilité
      if (result.success && result.quest) {
        client.send("questStarted", {
          quest: result.quest,
          message: result.message
        });
        
        // Mettre à jour les statuts de quête pour tous les clients
        this.updateQuestStatuses(player.name);
      }
      
    } catch (error) {
      console.error("❌ Erreur handleStartQuest:", error);
      client.send("questStartResult", {
        success: false,
        message: "Erreur serveur lors du démarrage de la quête"
      });
    }
  }

  private async handleGetActiveQuests(client: Client) {
    try {
      console.log(`📋 Récupération des quêtes actives pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("activeQuestsList", { quests: [] });
        return;
      }

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      
      console.log(`📤 Envoi de ${activeQuests.length} quêtes actives`);
      client.send("activeQuestsList", {
        quests: activeQuests
      });
      
    } catch (error) {
      console.error("❌ Erreur handleGetActiveQuests:", error);
      client.send("activeQuestsList", { quests: [] });
    }
  }

  private async handleGetAvailableQuests(client: Client) {
    try {
      console.log(`📋 Récupération des quêtes disponibles pour ${client.sessionId}`);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        client.send("availableQuestsList", { quests: [] });
        return;
      }

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
      
      console.log(`📤 Envoi de ${availableQuests.length} quêtes disponibles`);
      client.send("availableQuestsList", {
        quests: availableQuests
      });
      
    } catch (error) {
      console.error("❌ Erreur handleGetAvailableQuests:", error);
      client.send("availableQuestsList", { quests: [] });
    }
  }

  private async handleQuestProgress(client: Client, data: any) {
    try {
      console.log(`📈 Progression de quête pour ${client.sessionId}:`, data);
      
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
      const results = await this.zoneManager.updateQuestProgress(player.name, data);
      
      if (results && results.length > 0) {
        console.log(`📤 Envoi questProgressUpdate:`, results);
        client.send("questProgressUpdate", results);
        
        // Mettre à jour les statuts de quête
        this.updateQuestStatuses(player.name);
      }
      
    } catch (error) {
      console.error("❌ Erreur handleQuestProgress:", error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour les statuts de quête
  private async updateQuestStatuses(username: string) {
    try {
      // ✅ FIX: Utiliser directement la méthode de délégation du ZoneManager
      const questStatuses = await this.zoneManager.getQuestStatuses(username);
      
      // Envoyer les statuts de quête à tous les clients de la zone
      this.broadcast("questStatuses", {
        questStatuses: questStatuses
      });
      
      console.log(`📊 Statuts de quête mis à jour pour ${username}:`, questStatuses.length);
      
    } catch (error) {
      console.error("❌ Erreur updateQuestStatuses:", error);
    }
  }

  // ✅ MÉTHODE DE DEBUG POUR LES QUÊTES
  private async debugQuests(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    console.log(`🐛 [DEBUG QUETES] Joueur: ${player.name}`);
    
    try {
      // ✅ FIX: Debug avec les méthodes de délégation du ZoneManager
      const activeQuests = await this.zoneManager.getActiveQuests(player.name);
      const availableQuests = await this.zoneManager.getAvailableQuests(player.name);
      
      console.log(`🐛 [DEBUG] Quêtes actives (${activeQuests.length}):`, 
        activeQuests.map((q: Quest) => ({ id: q.id, name: q.name, step: q.currentStepIndex })));
      
      console.log(`🐛 [DEBUG] Quêtes disponibles (${availableQuests.length}):`, 
        availableQuests.map((q: Quest) => ({ id: q.id, name: q.name })));
        
    } catch (error) {
      console.error(`🐛 [DEBUG] Erreur debug quêtes:`, error);
    }
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
    player.map = player.currentZone;
    
    // Ajouter au state
    this.state.players.set(client.sessionId, player);
    
    console.log(`📍 Position: (${player.x}, ${player.y}) dans ${player.currentZone}`);
    console.log(`✅ Joueur ${player.name} créé`);

    // Configuration inventaire de départ
    try {
      console.log(`🎒 Configuration inventaire de départ pour ${player.name}`);
      
      await InventoryManager.addItem(player.name, "poke_ball", 5);
      await InventoryManager.addItem(player.name, "potion", 3);
      
      const hasMap = await InventoryManager.getItemCount(player.name, "town_map");
      if (hasMap === 0) {
        await InventoryManager.addItem(player.name, "town_map", 1);
      }

      const grouped = await InventoryManager.getAllItemsGroupedByPocket(player.name);
      console.log(`🎒 [INVENTAIRE groupé par poche] ${player.name}:`, grouped);
      
      console.log(`✅ Objets de départ ajoutés pour ${player.name}`);
    } catch (err) {
      console.error(`❌ [INVENTAIRE] Erreur lors de l'ajout d'objets de départ pour ${player.name}:`, err);
    }
    
    // Faire entrer le joueur dans sa zone initiale
    await this.zoneManager.onPlayerJoinZone(client, player.currentZone);
    
    // ✅ NOUVEAU: Démarrer les updates de state filtré
    this.scheduleFilteredStateUpdate();
    
    // Envoyer les statuts de quête initiaux après un délai
    this.clock.setTimeout(() => {
      this.updateQuestStatuses(player.name);
    }, 1000);
    
    console.log(`🎉 ${player.name} a rejoint le monde !`);

  } catch (error) {
    console.error(`❌ Erreur lors du join:`, error);
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
      console.log(`🌍 ${player.name}: Zone: ${player.currentZone}`);
    }
  }

  // === MÉTHODES POUR LES EFFETS D'OBJETS ===

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

  private async applyMedicineEffect(player: any, itemData: any): Promise<{ message?: string }> {
    // TODO: Implémenter la logique de soin des Pokémon
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

  private async applyUtilityItemEffect(player: any, itemData: any, itemId: string): Promise<{ message?: string }> {
    switch (itemId) {
      case 'escape_rope':
        return { message: "Vous êtes retourné au dernier Centre Pokémon !" };
        
      case 'repel':
      case 'super_repel':
      case 'max_repel':
        const steps = itemData.effect_steps || 100;
        return { message: `Repousse activé pour ${steps} pas !` };
        
      default:
        return { message: `${itemId} utilisé !` };
    }
  }

  // === MÉTHODES UTILITAIRES POUR L'INVENTAIRE ===

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

  async playerHasItem(playerName: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const count = await InventoryManager.getItemCount(playerName, itemId);
      return count >= quantity;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification d'objet:`, error);
      return false;
    }
  
  private getFilteredStateForClient(client: Client): any {
  const player = this.state.players.get(client.sessionId);
  if (!player) return null;

  const playerZone = player.currentZone;
  
  // Créer un state filtré avec seulement les joueurs de la même zone
  const filteredPlayers = new Map();
  
  this.state.players.forEach((otherPlayer, sessionId) => {
    if (otherPlayer.currentZone === playerZone) {
      filteredPlayers.set(sessionId, otherPlayer);
    }
  });

  // ✅ SOLUTION : Typer correctement l'objet
  const playersObject: { [key: string]: any } = {};
  filteredPlayers.forEach((player, sessionId) => {
    playersObject[sessionId] = {
      id: player.id,
      name: player.name,
      x: player.x,
      y: player.y,
      currentZone: player.currentZone,
      direction: player.direction,
      isMoving: player.isMoving
    };
  });

  return {
    players: new Map(Object.entries(playersObject))
  };
}

}

private sendFilteredState() {
  const now = Date.now();
  
  // Throttle : max 1 update toutes les 100ms
  if (now - this.lastStateUpdate < this.stateUpdateInterval) {
    return;
  }
  
  this.lastStateUpdate = now;
  
  // Envoyer un state filtré à chaque client selon sa zone
  this.clients.forEach(client => {
    const filteredState = this.getFilteredStateForClient(client);
    if (filteredState) {
      client.send("filteredState", filteredState);
    }
  });
  
  console.log(`📤 States filtrés envoyés à ${this.clients.length} clients`);
}

private scheduleFilteredStateUpdate() {
  // Programmer une mise à jour dans 50ms (pour regrouper les changements)
  this.clock.setTimeout(() => {
    this.sendFilteredState();
  }, 50);
}
}

 
