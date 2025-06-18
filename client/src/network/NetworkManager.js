import { Client } from "colyseus.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

export class NetworkManager {
  constructor(username) {
    this.client = new Client(GAME_CONFIG.server.url);
    this.username = username;
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isTransitioning = false; // ✅ Flag de transition
    this.lastSendTime = 0; // ✅ Pour le throttling
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null,
      onZoneChanged: null,
    };
    this.zoneChangedListeners = []; // Gestion des listeners
  }

  async connect(roomName = null) {
    try {
      const targetRoomName = roomName || GAME_CONFIG.server.roomName;
      if (!targetRoomName) throw new Error("Room name is required");

      if (this.room) {
        await this.disconnect();
      }

      console.log(`[NetworkManager] Connexion à la room: ${targetRoomName}`);
      this.room = await this.client.joinOrCreate(targetRoomName, {
        username: this.username,
      });

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.isTransitioning = false;

      this.setupRoomListeners();

      return true;
    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  async handleZoneTransition(data) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] Transition déjà en cours, ignorée`);
      return;
    }

    this.isTransitioning = true;
    console.log(`[NetworkManager] Début transition vers ${data.targetZone}`);

    let newRoomName = '';
    switch(data.targetZone) {
      case 'BeachScene': newRoomName = 'BeachRoom'; break;
      case 'VillageScene': newRoomName = 'VillageRoom'; break;
      case 'Road1Scene': newRoomName = 'Road1Room'; break;
      case 'VillageLabScene': newRoomName = 'VillageLabRoom'; break;
      case 'VillageHouse1Scene': newRoomName = 'VillageHouse1Room'; break; // <-- Ajout VillageHouse1
      default: newRoomName = 'DefaultRoom';
    }

    try {
      if (this.room) {
        console.log(`[NetworkManager] Quitte la room actuelle: ${this.room.name}`);
        await this.room.leave();
        this.room = null;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`[NetworkManager] Connexion à la nouvelle room: ${newRoomName}`);
      this.room = await this.client.joinOrCreate(newRoomName, {
        username: this.username,
        spawnX: data.spawnX,
        spawnY: data.spawnY,
        fromZone: data.fromZone
      });

      this.sessionId = this.room.sessionId;
      this.isConnected = true;

      this.setupRoomListeners();

      this.isTransitioning = false;

      if (this.callbacks.onZoneChanged) {
        this.callbacks.onZoneChanged(data);
      }

      console.log(`[NetworkManager] Transition réseau terminée vers ${newRoomName}`);

    } catch (error) {
      console.error(`[NetworkManager] Erreur lors de la transition de room:`, error);
      this.isTransitioning = false;
      this.connect('BeachRoom');
    }
  }

  setupRoomListeners() {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) this.callbacks.onStateChange(state);
    });

    this.room.onMessage("playerData", (data) => {
      if (this.callbacks.onPlayerData) this.callbacks.onPlayerData(data);
    });

    this.room.onMessage("zoneChanged", (data) => {
      console.log(`[NetworkManager] Réception zoneChanged:`, data);
      this.handleZoneTransition(data);
    });

    this.room.onLeave(() => {
      console.log(`[NetworkManager] Déconnexion de la room`);
      if (!this.isTransitioning) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
      }
    });

    if (this.callbacks.onConnect) this.callbacks.onConnect();
  }

 sendMove(x, y, direction, isMoving) {
  if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen && !this.isTransitioning) {
    const now = Date.now();
    if (!this.lastSendTime || now - this.lastSendTime > 50) {
      this.room.send("move", { x, y, direction, isMoving });
      this.lastSendTime = now;
    }
  }
}


  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.isTransitioning) {
      this.room.send(type, data);
    }
  }

  onConnect(callback) {
    this.callbacks.onConnect = callback;
  }
  
  onStateChange(callback) {
    this.callbacks.onStateChange = callback;
  }
  
  onPlayerData(callback) {
    this.callbacks.onPlayerData = callback;
  }
  
  onDisconnect(callback) {
    this.callbacks.onDisconnect = callback;
  }
  
  onZoneChanged(callback) {
    this.callbacks.onZoneChanged = callback;
    if (!this.zoneChangedListeners.includes(callback)) {
      this.zoneChangedListeners.push(callback);
    }
  }

  offZoneChanged(callback = null) {
    if (callback) {
      const index = this.zoneChangedListeners.indexOf(callback);
      if (index > -1) {
        this.zoneChangedListeners.splice(index, 1);
      }
    } else {
      this.zoneChangedListeners.length = 0;
    }
    this.callbacks.onZoneChanged = null;
  }

  getSessionId() {
    return this.sessionId;
  }

  requestZoneTransition(targetZone, direction = "north") {
    if (this.isConnected && this.room && !this.isTransitioning) {
      console.log(`[Network] Demande de changement de zone vers ${targetZone} (${direction})`);
      this.room.send("changeZone", {
        targetZone,
        direction,
      });
    } else {
      console.warn(`[Network] Impossible de changer de zone: connected=${this.isConnected}, transitioning=${this.isTransitioning}`);
    }
  }

  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }

  async disconnect() {
    if (this.room) {
      this.isConnected = false;
      this.isTransitioning = false;
      this.offZoneChanged();
      try {
        await this.room.leave();
      } catch (error) {
        console.warn("Erreur lors de la déconnexion:", error);
      }
      this.room = null;
      this.sessionId = null;
    }
  }

  resetTransitionFlag() {
    this.isTransitioning = false;
  }
}
