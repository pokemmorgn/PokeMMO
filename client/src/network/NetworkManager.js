import { Client } from "colyseus.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

// Mapping zone (targetZone serveur) => clé de scène Phaser
const ZONE_TO_SCENE = {
  beach: "BeachScene",
  beachscene: "BeachScene",
  greenrootbeach: "BeachScene", // Si jamais tu envoies ce nom
  village: "VillageScene",
  villagescene: "VillageScene",
  villagelab: "VillageLabScene",
  villagelabscene: "VillageLabScene",
  road1: "Road1Scene",
  road1scene: "Road1Scene",
  villagehouse1: "VillageHouse1Scene",
  villagehouse1scene: "VillageHouse1Scene",
  lavandia: "LavandiaScene",
  lavandiascene: "LavandiaScene"
};

export class NetworkManager {
  constructor(username) {
    this.client = new Client(GAME_CONFIG.server.url);
    this.username = username;
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isTransitioning = false;
    this.lastSendTime = 0;
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null,
      onZoneChanged: null,
    };
    this.zoneChangedListeners = [];
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

  // ✅ NOUVEAU : Handler pour les téléportations automatiques du serveur
  handleAutoTeleport(data) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] Transition automatique ignorée (déjà en cours)`);
      return;
    }

    this.isTransitioning = true;
    console.log(`🌀 [NetworkManager] Téléportation automatique reçue:`, data);

    // Mapping map → scène
    const targetMapKey = (data.targetMap || "").toLowerCase();
    const sceneKey = ZONE_TO_SCENE[targetMapKey] || "BeachScene";

    try {
      // Accès à l'instance Phaser pour changer de scène
      if (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES.length) {
        const game = window.Phaser.GAMES[0];
        if (game && game.scene) {
          // Trouver la scène active
          const activeScene = game.scene.getScenes().find(scene => scene.scene.isActive());
          if (activeScene && activeScene.scene.key !== sceneKey) {
            console.log(`🌀 [NetworkManager] Changement automatique vers ${sceneKey}`);
            
            // Nettoyer la scène actuelle si elle a une méthode cleanup
            if (activeScene.cleanup) {
              activeScene.cleanup();
            }
            
            // Démarrer la nouvelle scène
            activeScene.scene.start(sceneKey, {
              fromZone: activeScene.scene.key,
              spawnX: data.targetX,
              spawnY: data.targetY,
              spawnPoint: data.spawnPoint
            });
          }
        }
      }

      this.isTransitioning = false;
      console.log(`✅ [NetworkManager] Téléportation automatique terminée`);

    } catch (error) {
      console.error(`❌ [NetworkManager] Erreur téléportation automatique:`, error);
      this.isTransitioning = false;
    }
  }

  async handleZoneTransition(data) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] Transition déjà en cours, ignorée`);
      return;
    }

    this.isTransitioning = true;
    console.log(`[NetworkManager] Début transition vers ${data.targetZone}`);

    // Nouveau : on traduit targetZone en clé de room et en clé de scène !
    const zoneKey = (data.targetZone || "").toLowerCase();
    let newRoomName = "";
    let sceneKey = ZONE_TO_SCENE[zoneKey] || "BeachScene"; // fallback

    switch(zoneKey) {
      case "beach":
      case "beachscene":
        newRoomName = "BeachRoom";
        break;
      case "village":
      case "villagescene":
        newRoomName = "VillageRoom";
        break;
      case "road1":
      case "road1scene":
        newRoomName = "Road1Room";
        break;
      case "villagelab":
      case "villagelabscene":
        newRoomName = "VillageLabRoom";
        break;
      case "villagehouse1":
      case "villagehouse1scene":
        newRoomName = "VillageHouse1Room";
        break;
      case "lavandia":
      case "lavandiascene":
        newRoomName = "LavandiaRoom";
        break;
      default:
        newRoomName = "BeachRoom";
        console.warn(`[NetworkManager] Nom de zone inconnu: ${data.targetZone}, fallback vers BeachRoom`);
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
  fromZone: data.fromZone,
  targetSpawn: data.entryName,
  targetZone: data.targetZone
});
    

      this.sessionId = this.room.sessionId;
      this.isConnected = true;

      this.setupRoomListeners();

      this.isTransitioning = false;

      // === Appel la transition de scène Phaser (au lieu de laisser à l'ancien callback)
      if (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES.length) {
        // Accès à l'instance Phaser active
        const game = window.Phaser.GAMES[0];
        if (game && game.scene && game.scene.start) {
          game.scene.start(sceneKey, {
            fromZone: data.fromZone,
            spawnX: data.spawnX,
            spawnY: data.spawnY
          });
        }
      } else if (this.callbacks.onZoneChanged) {
        // Fallback custom si besoin
        this.callbacks.onZoneChanged(data);
      }

      console.log(`[NetworkManager] Transition réseau terminée vers ${newRoomName}`);

    } catch (error) {
      console.error(`[NetworkManager] Erreur lors de la transition de room:`, error);
      this.isTransitioning = false;
      this.connect("BeachRoom");
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

    // ✅ NOUVEAU : Écouter les téléportations automatiques
    this.room.onMessage("teleport_success", (data) => {
      console.log(`🌀 [NetworkManager] teleport_success reçu:`, data);
      this.handleAutoTeleport(data);
    });

    // ✅ NOUVEAU : Écouter les échecs de téléportation
    this.room.onMessage("teleport_failed", (data) => {
      console.warn(`❌ [NetworkManager] teleport_failed:`, data.reason);
      // Optionnel : afficher un message à l'utilisateur
    });

    // ✅ GARDER : L'ancien système pour compatibilité
    this.room.onMessage("zoneChanged", (data) => {
      console.log(`[NetworkManager] Réception zoneChanged (ancien système):`, data);
      this.handleZoneTransition(data);
    });

    this.room.onLeave(() => {
      console.log(`[NetworkManager] Déconnexion de la room`);
      if (!this.isTransitioning) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
      }
    });

    // Enregistre les callbacks onMessage définis avant la connexion
    if (this._pendingMessages && this._pendingMessages.length > 0) {
      this._pendingMessages.forEach(({ type, callback }) => {
        this.room.onMessage(type, callback);
      });
      this._pendingMessages = [];
    }

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

  sendNpcInteract(npcId) {
    if (this.isConnected && this.room && !this.isTransitioning) {
      this.room.send("npcInteract", { npcId });
    }
  }

  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.isTransitioning) {
      this.room.send(type, data);
    }
  }

  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onPlayerData(callback) { this.callbacks.onPlayerData = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
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

  onMessage(type, callback) {
    if (this.room) {
      this.room.onMessage(type, callback);
    } else {
      if (!this._pendingMessages) this._pendingMessages = [];
      this._pendingMessages.push({ type, callback });
    }
  }

  getSessionId() { return this.sessionId; }

  requestZoneTransition(exitName) {
    if (this.isConnected && this.room && !this.isTransitioning) {
      console.log(`[Network] Demande de transition via la sortie '${exitName}'`);
      this.room.send("changeZone", {
        targetSpawn: exitName,
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
