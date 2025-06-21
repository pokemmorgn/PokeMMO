// client/src/network/NetworkManager.js - VERSION WORLDROOM SANS TRANSITIONS
// ✅ Système de réseau de base sans gestion automatique des transitions

import { Client } from "colyseus.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

export class NetworkManager {
  constructor(username) {
    this.client = new Client(GAME_CONFIG.server.url);
    this.username = username;
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isTransitioning = false;
    this.lastSendTime = 0;
    this.currentZone = null;
    this.lastReceivedNpcs = null;
    this.lastReceivedZoneData = null;
    
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null,
    };
  }

  async connect(spawnZone = "beach", spawnData = {}) {
    try {
      console.log(`[NetworkManager] 🔌 Connexion à WorldRoom...`);
      console.log(`[NetworkManager] 🌍 Zone de spawn: ${spawnZone}`);
      
      if (this.room) {
        await this.disconnect();
      }

      const roomOptions = {
        name: this.username,
        spawnZone: spawnZone,
        spawnX: spawnData.spawnX || 52,
        spawnY: spawnData.spawnY || 48,
        ...spawnData
      };

      console.log(`[NetworkManager] 📝 Options de connexion:`, roomOptions);
      
      this.room = await this.client.joinOrCreate("world", roomOptions);
      
      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.currentZone = spawnZone;

      console.log(`[NetworkManager] ✅ Connecté à WorldRoom! SessionId: ${this.sessionId}`);

      this.setupRoomListeners();
      return true;
      
    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  setupRoomListeners() {
    if (!this.room) return;

    console.log(`[NetworkManager] 👂 Setup des listeners WorldRoom...`);

    // Zone data
    this.room.onMessage("zoneData", (data) => {
      console.log(`🗺️ [NetworkManager] Zone data reçue:`, data);
      this.currentZone = data.zone;
      
      // Stocker les zone data
      this.lastReceivedZoneData = data;
      
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    // Liste des NPCs
    this.room.onMessage("npcList", (npcs) => {
      console.log(`🤖 [NetworkManager] NPCs reçus: ${npcs.length}`);
      
      // Stocker les NPCs reçus
      this.lastReceivedNpcs = npcs;
      
      if (this.callbacks.onNpcList) {
        this.callbacks.onNpcList(npcs);
      }
    });

    // Interactions NPC
    this.room.onMessage("npcInteractionResult", (result) => {
      console.log(`💬 [NetworkManager] NPC interaction:`, result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // État des joueurs
    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    // State filtré
    this.room.onMessage("filteredState", (state) => {
      console.log(`📊 [NetworkManager] State filtré reçu:`, {
        playersCount: state.players?.size || 0,
        zone: this.currentZone
      });
      
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    // Forcer le state initial après connexion
    this.room.onStateChange.once((state) => {
      console.log(`🎯 [NetworkManager] ÉTAT INITIAL reçu:`, state);
      console.log(`👥 Joueurs dans l'état initial:`, state.players.size);
      
      // Forcer l'appel du callback même pour l'état initial
      if (this.callbacks.onStateChange && state.players.size > 0) {
        console.log(`🔥 [NetworkManager] Force l'appel callback pour état initial`);
        this.callbacks.onStateChange(state);
      }
    });

    // Messages existants
    this.room.onMessage("playerData", (data) => {
      if (this.callbacks.onPlayerData) {
        this.callbacks.onPlayerData(data);
      }
    });

    this.room.onMessage("snap", (data) => {
      if (this.callbacks.onSnap) {
        this.callbacks.onSnap(data);
      }
    });

    this.room.onLeave(() => {
      console.log(`[NetworkManager] 📤 Déconnexion de WorldRoom`);
      this.isConnected = false;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });

    // Appeler onConnect après configuration
    if (this.callbacks.onConnect) {
      console.log(`[NetworkManager] 🎯 Connexion établie`);
      this.callbacks.onConnect();
    }
  }

  sendMove(x, y, direction, isMoving) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        this.room.send("playerMove", { x, y, direction, isMoving });
        this.lastSendTime = now;
      }
    }
  }

  startQuest(questId) {
    if (this.isConnected && this.room) {
      console.log(`[NetworkManager] 🎯 Démarrage quête: ${questId}`);
      this.room.send("questStart", { questId });
    }
  }

  sendNpcInteract(npcId) {
    if (this.isConnected && this.room) {
      this.room.send("npcInteract", { npcId });
    }
  }
  
  sendMessage(type, data) {
    if (this.isConnected && this.room) {
      this.room.send(type, data);
    }
  }

  // Callbacks
  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onPlayerData(callback) { this.callbacks.onPlayerData = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  onNpcList(callback) { this.callbacks.onNpcList = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }

  onMessage(type, callback) {
    if (this.room) {
      this.room.onMessage(type, callback);
    } else {
      if (!this._pendingMessages) this._pendingMessages = [];
      this._pendingMessages.push({ type, callback });
    }
  }

  getSessionId() { 
    return this.sessionId; 
  }

  getCurrentZone() {
    return this.currentZone;
  }

  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }

  async disconnect() {
    console.log(`[NetworkManager] 📤 Déconnexion demandée`);
    
    if (this.room) {
      this.isConnected = false;
      
      try {
        const roomId = this.room.id;
        await this.room.leave();
        console.log(`[NetworkManager] ✅ Déconnexion réussie de ${roomId}`);
      } catch (error) {
        console.warn("[NetworkManager] ⚠️ Erreur lors de la déconnexion:", error);
      }
      
      this.room = null;
      this.sessionId = null;
      this.currentZone = null;
    }
  }

  debugState() {
    console.log(`[NetworkManager] 🔍 === ÉTAT DEBUG WORLDROOM ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 isConnected: ${this.isConnected}`);
    console.log(`🌀 isTransitioning: ${this.isTransitioning}`);
    console.log(`🌍 currentZone: ${this.currentZone}`);
    console.log(`🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.log(`📡 Room connectée: ${this.room?.connection?.isOpen || false}`);
    console.log(`📊 Joueurs dans room: ${this.room?.state?.players?.size || 0}`);
    
    if (this.room?.state?.players && this.sessionId) {
      const myPlayer = this.room.state.players.get(this.sessionId);
      if (myPlayer) {
        console.log(`🎮 Mon joueur: (${myPlayer.x}, ${myPlayer.y}) dans ${myPlayer.currentZone}`);
      } else {
        console.log(`❌ Mon joueur non trouvé dans la room`);
      }
    }
    console.log(`================================`);
  }

  checkZoneSynchronization(currentScene) {
    if (!this.room || !this.sessionId) {
      console.warn(`[NetworkManager] ⚠️ Pas de room pour vérifier la sync zone`);
      return false;
    }

    const myPlayer = this.room.state.players.get(this.sessionId);
    if (!myPlayer) {
      console.warn(`[NetworkManager] ❌ Joueur non trouvé pour sync zone`);
      return false;
    }

    const serverZone = myPlayer.currentZone;
    const clientZone = this.mapSceneToZone(currentScene);

    if (serverZone !== clientZone) {
      console.warn(`[NetworkManager] 🔄 DÉSYNCHRONISATION DÉTECTÉE - CORRECTION AUTO`);
      console.warn(`   Serveur: ${serverZone}`);
      console.warn(`   Client: ${clientZone} (${currentScene})`);
      
      // Correction automatique
      this.currentZone = serverZone;
      console.log(`✅ [NetworkManager] Zone client synchronisée: ${serverZone}`);
      return true;
    }

    console.log(`[NetworkManager] ✅ Zones synchronisées: ${serverZone}`);
    return true;
  }

  mapSceneToZone(sceneName) {
    const mapping = {
      'BeachScene': 'beach',
      'VillageScene': 'village',
      'VillageLabScene': 'villagelab',
      'Road1Scene': 'road1',
      'VillageHouse1Scene': 'villagehouse1',
      'LavandiaScene': 'lavandia'
    };
    
    return mapping[sceneName] || sceneName.toLowerCase();
  }

  async forceZoneSynchronization(currentScene) {
    console.log(`[NetworkManager] 🔄 Forcer la resynchronisation zone...`);
    
    if (!this.room) {
      console.warn(`[NetworkManager] ❌ Pas de room pour resynchroniser`);
      return false;
    }

    try {
      const clientZone = this.mapSceneToZone(currentScene);
      this.room.send("syncZone", { currentZone: clientZone });
      return true;
    } catch (error) {
      console.error(`[NetworkManager] ❌ Erreur lors de la resynchronisation zone:`, error);
      return false;
    }
  }
}
