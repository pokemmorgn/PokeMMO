// server/src/managers/ZoneManager.ts - VERSION COMPLÈTE AVEC COLLISIONS ET SHOP

import { Client } from "@colyseus/core";
import { WorldRoom } from "../rooms/WorldRoom";
import { IZone } from "../rooms/zones/IZone";
import { BeachZone } from "../rooms/zones/BeachZone";
import { VillageZone } from "../rooms/zones/VillageZone";
import { VillageLabZone } from "../rooms/zones/VillageLabZone";
import { Villagehouse1 } from "../rooms/zones/Villagehouse1";
import { Villageflorist } from "../rooms/zones/Villageflorist";
import { Player } from "../schema/PokeWorldState";

import { QuestManager } from "./QuestManager";
import { ShopManager } from "./ShopManager";
import { InteractionManager } from "./InteractionManager";
import { QuestProgressEvent } from "../types/QuestTypes";

// COLLISION MANAGER
import { CollisionManager } from "./CollisionManager";

export class ZoneManager {
  private zones = new Map<string, IZone>();
  private collisions = new Map<string, CollisionManager>(); // <--- NOUVEAU

  private room: WorldRoom;
  private questManager: QuestManager;
  private shopManager: ShopManager;
  private interactionManager: InteractionManager;

  constructor(room: WorldRoom) {
    this.room = room;
    console.log(`🗺️ === ZONE MANAGER INIT ===`);
    this.initializeManagers();
    this.loadAllZones();
  }

  private initializeManagers() {
    try {
      this.questManager = new QuestManager(`../data/quests/quests.json`);
      console.log(`✅ QuestManager initialisé`);
      this.shopManager = new ShopManager(`../data/shops/shops.json`, `../data/items/items.json`);
      console.log(`✅ ShopManager initialisé`);
      this.interactionManager = new InteractionManager(
        this.room.getNpcManager.bind(this.room),
        this.questManager,
        this.shopManager
      );
      console.log(`✅ InteractionManager initialisé avec ShopManager`);
    } catch (error) {
      console.error(`❌ Erreur initialisation managers:`, error);
    }
  }

  private loadAllZones() {
    console.log(`🏗️ Chargement des zones...`);

    this.loadZone('beach', new BeachZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour beach");
    this.collisions.set('beach', new CollisionManager("beach.tmj"));

    this.loadZone('village', new VillageZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour village");
    this.collisions.set('village', new CollisionManager("village.tmj"));

    this.loadZone('villagelab', new VillageLabZone(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villagelab");
    this.collisions.set('villagelab', new CollisionManager("villagelab.tmj"));

    this.loadZone('villagehouse1', new Villagehouse1(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villagehouse1");
    this.collisions.set('villagehouse1', new CollisionManager("villagehouse1.tmj"));

    this.loadZone('villageflorist', new Villageflorist(this.room));
    console.log("[ZoneManager] Initialisation collisions pour villageflorist");
    this.collisions.set('villageflorist', new CollisionManager("villageflorist.tmj"));

    console.log(`✅ ${this.zones.size} zones chargées:`, Array.from(this.zones.keys()));
    console.log(`✅ Collisions chargées pour :`, Array.from(this.collisions.keys()));
}


  private loadZone(zoneName: string, zone: IZone) {
    console.log(`📦 Chargement zone: ${zoneName}`);
    this.zones.set(zoneName, zone);
    console.log(`✅ Zone ${zoneName} chargée`);
  }

  // ACCESSEUR COLLISION
  getCollisionManager(zoneName: string): CollisionManager | undefined {
    return this.collisions.get(zoneName);
  }

  // ======================= RESTE DU FICHIER INCHANGÉ =======================

  async handleZoneTransition(client: Client, data: any) {
    console.log(`🌀 === ZONE TRANSITION HANDLER ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📍 Data:`, data);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("transitionResult", { success: false, reason: "Player not found" });
      return;
    }

    const fromZone = player.currentZone;
    const toZone = data.targetZone;

    console.log(`🔄 Transition: ${fromZone} → ${toZone}`);

    const targetZone = this.zones.get(toZone);
    if (!targetZone) {
      console.error(`❌ Zone de destination inconnue: ${toZone}`);
      client.send("transitionResult", { success: false, reason: "Zone not found" });
      return;
    }

    try {
      if (fromZone && fromZone !== toZone) {
        console.log(`📤 Sortie de zone: ${fromZone}`);
        this.onPlayerLeaveZone(client, fromZone);
      }

      player.currentZone = toZone;
      player.map = toZone;
      if (data.spawnX !== undefined) player.x = data.spawnX;
      if (data.spawnY !== undefined) player.y = data.spawnY;

      console.log(`📍 Position mise à jour: (${player.x}, ${player.y}) dans ${toZone}`);

      console.log(`📥 Entrée dans zone: ${toZone}`);
      await this.onPlayerJoinZone(client, toZone);

      client.send("transitionResult", { 
        success: true, 
        currentZone: toZone,
        position: { x: player.x, y: player.y }
      });

      console.log(`✅ Transition réussie: ${player.name} est maintenant dans ${toZone}`);

    } catch (error) {
      console.error(`❌ Erreur lors de la transition:`, error);
      client.send("transitionResult", { success: false, reason: "Transition failed" });
    }
  }

  async onPlayerJoinZone(client: Client, zoneName: string) {
    console.log(`📥 === PLAYER JOIN ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      await zone.onPlayerEnter(client);
      await this.room.onPlayerJoinZone(client, zoneName);
      
      const player = this.room.state.players.get(client.sessionId);
      if (player) {
        console.log(`🎯 [ZoneManager] Programmation quest statuses pour ${player.name}`);
        
        setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 1000);
        setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 3000);
        setTimeout(() => this.sendQuestStatusesForZone(client, zoneName), 5000);
      }
      
      console.log(`✅ Player entered zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  onPlayerLeaveZone(client: Client, zoneName: string) {
    console.log(`📤 === PLAYER LEAVE ZONE ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`🌍 Zone: ${zoneName}`);

    const zone = this.zones.get(zoneName);
    if (zone) {
      zone.onPlayerLeave(client);
      console.log(`✅ Player left zone: ${zoneName}`);
    } else {
      console.error(`❌ Zone not found: ${zoneName}`);
    }
  }

  async handleNpcInteraction(client: Client, npcId: number) {
    console.log(`💬 === NPC INTERACTION (DÉLÉGATION AVEC SHOP) ===`);
    
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Joueur non trouvé"
      });
      return;
    }

    try {
      const result = await this.interactionManager.handleNpcInteraction(player, npcId);
      console.log(`📤 Envoi résultat interaction:`, result.type);
      client.send("npcInteractionResult", result);
      if (result.questProgress && result.questProgress.length > 0) {
        client.send("questProgressUpdate", result.questProgress);
        await this.sendQuestStatusesForZone(client, player.currentZone);
      }
    } catch (error) {
      console.error(`❌ Erreur interaction NPC ${npcId}:`, error);
      client.send("npcInteractionResult", {
        type: "error",
        message: "Erreur lors de l'interaction avec le NPC"
      });
    }
  }

  async handleShopTransaction(client: Client, data: {
    shopId: string;
    action: 'buy' | 'sell';
    itemId: string;
    quantity: number;
  }) {
    console.log(`🛒 === SHOP TRANSACTION ===`);
    console.log(`👤 Client: ${client.sessionId}`);
    console.log(`📦 Data:`, data);

    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      console.error(`❌ Player not found: ${client.sessionId}`);
      client.send("shopTransactionResult", {
        success: false,
        message: "Joueur non trouvé"
      });
      return;
    }

    try {
      const result = await this.interactionManager.handleShopTransaction(
        player,
        data.shopId,
        data.action,
        data.itemId,
        data.quantity
      );
      console.log(`📤 Résultat transaction shop:`, result.success ? 'SUCCESS' : 'FAILED');
      client.send("shopTransactionResult", result);
      if (result.success) {
        console.log(`💰 Transaction réussie: ${data.action} ${data.quantity}x ${data.itemId}`);
        if (result.newGold !== undefined) {
          player.gold = result.newGold;
          console.log(`💰 Nouvel or du joueur: ${player.gold}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur transaction shop:`, error);
      client.send("shopTransactionResult", {
        success: false,
        message: "Erreur lors de la transaction"
      });
    }
  }

  async handleQuestStart(client: Client, questId: string): Promise<{ success: boolean; message: string; quest?: any }> {
    console.log(`🎯 === QUEST START (DÉLÉGATION) ===`);
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) {
      return {
        success: false,
        message: "Joueur non trouvé"
      };
    }

    try {
      const quest = await this.questManager.startQuest(player.name, questId);
      if (quest) {
        await this.sendQuestStatusesForZone(client, player.currentZone);
        this.broadcastToZone(player.currentZone, "questUpdate", {
          player: player.name,
          action: "started",
          questId: questId
        });
        return {
          success: true,
          quest: quest,
          message: `Quête "${quest.name}" démarrée !`
        };
      } else {
        return {
          success: false,
          message: "Impossible de démarrer cette quête"
        };
      }
    } catch (error) {
      console.error(`❌ Erreur démarrage quête ${questId}:`, error);
      return {
        success: false,
        message: "Erreur lors du démarrage de la quête"
      };
    }
  }

  async getActiveQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getActiveQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getActiveQuests:`, error);
      return [];
    }
  }

  async getAvailableQuests(username: string): Promise<any[]> {
    try {
      return await this.questManager.getAvailableQuests(username);
    } catch (error) {
      console.error(`❌ Erreur getAvailableQuests:`, error);
      return [];
    }
  }

  async updateQuestProgress(username: string, event: QuestProgressEvent): Promise<any[]> {
    try {
      return await this.questManager.updateQuestProgress(username, event);
    } catch (error) {
      console.error(`❌ Erreur updateQuestProgress:`, error);
      return [];
    }
  }

  private async sendQuestStatusesForZone(client: Client, zoneName: string) {
    const player = this.room.state.players.get(client.sessionId) as Player;
    if (!player) return;
    try {
      const questStatuses = await this.interactionManager.getQuestStatuses(player.name);
      if (questStatuses.length > 0) {
        client.send("questStatuses", { questStatuses });
        console.log(`📊 Statuts de quête envoyés pour ${zoneName}: ${questStatuses.length}`);
      }
    } catch (error) {
      console.error(`❌ Erreur sendQuestStatusesForZone:`, error);
    }
  }

  getPlayersInZone(zoneName: string): Player[] {
    const playersInZone = Array.from(this.room.state.players.values())
      .filter((player: Player) => player.currentZone === zoneName);
    console.log(`📊 Players in zone ${zoneName}: ${playersInZone.length}`);
    return playersInZone;
  }

  broadcastToZone(zoneName: string, message: string, data: any) {
    console.log(`📡 Broadcasting to zone ${zoneName}: ${message}`);
    const clientsInZone = this.room.clients.filter(client => {
      const player = this.room.state.players.get(client.sessionId) as Player;
      return player && player.currentZone === zoneName;
    });
    clientsInZone.forEach(client => {
      client.send(message, data);
    });
    console.log(`📤 Message envoyé à ${clientsInZone.length} clients dans ${zoneName}`);
  }

  async getQuestStatuses(username: string): Promise<any[]> {
    try {
      return await this.interactionManager.getQuestStatuses(username);
    } catch (error) {
      console.error(`❌ Erreur getQuestStatuses:`, error);
      return [];
    }
  }

  getQuestManager(): QuestManager {
    return this.questManager;
  }
  getShopManager(): ShopManager {
    return this.shopManager;
  }
  getInteractionManager(): InteractionManager {
    return this.interactionManager;
  }
}
