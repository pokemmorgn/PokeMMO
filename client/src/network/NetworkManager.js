// client/src/network/NetworkManager.js - VERSION SIMPLIFIÉE
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
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null,
    };
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

  setupRoomListeners() {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) this.callbacks.onStateChange(state);
    });

    this.room.onMessage("playerData", (data) => {
      if (this.callbacks.onPlayerData) this.callbacks.onPlayerData(data);
    });

    // ✅ NOUVEAU : Écouter les réponses de transition
    this.room.onMessage("transitionApproved", (data) => {
      console.log(`✅ [NetworkManager] Transition approuvée:`, data);
      if (this.pendingTransitionResolve) {
        this.pendingTransitionResolve(true);
        this.pendingTransitionResolve = null;
      }
    });

    this.room.onMessage("transitionDenied", (data) => {
      console.warn(`❌ [NetworkManager] Transition refusée:`, data.reason);
      if (this.pendingTransitionResolve) {
        this.pendingTransitionResolve(false);
        this.pendingTransitionResolve = null;
      }
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

  // ✅ NOUVELLE MÉTHODE : Demander une transition (simplifié)
  async requestTransition(transitionData) {
    if (!this.isConnected || !this.room || this.isTransitioning) {
      console.warn("[NetworkManager] Cannot request transition - not connected or already transitioning");
      return false;
    }

    console.log(`[NetworkManager] Demande de transition:`, transitionData);

    return new Promise((resolve) => {
      // Stocker le resolver pour la réponse
      this.pendingTransitionResolve = resolve;
      
      // Envoyer la demande au serveur
      this.room.send("requestTransition", transitionData);
      
      // Timeout après 3 secondes
      setTimeout(() => {
        if (this.pendingTransitionResolve) {
          console.warn("[NetworkManager] Transition request timeout");
          this.pendingTransitionResolve(false);
          this.pendingTransitionResolve = null;
        }
      }, 3000);
    });
  }

  // ✅ MÉTHODES EXISTANTES CONSERVÉES
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

  onMessage(type, callback) {
    if (this.room) {
      this.room.onMessage(type, callback);
    } else {
      if (!this._pendingMessages) this._pendingMessages = [];
      this._pendingMessages.push({ type, callback });
    }
  }

  getSessionId() { return this.sessionId; }

  // ✅ MÉTHODE SIMPLIFIÉE : Plus de logique complexe
  async changeZone(targetRoomName, spawnData = {}) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] Transition déjà en cours`);
      return false;
    }

    this.isTransitioning = true;
    console.log(`[NetworkManager] Changement vers ${targetRoomName}`);

    try {
      // Quitter la room actuelle
      if (this.room) {
        await this.room.leave();
        this.room = null;
      }

      // Délai court pour éviter les conflits
      await new Promise(resolve => setTimeout(resolve, 100));

      // Se connecter à la nouvelle room
      const success = await this.connect(targetRoomName);
      
      if (success) {
        console.log(`[NetworkManager] ✅ Changement de zone réussi vers ${targetRoomName}`);
        return true;
      } else {
        console.error(`[NetworkManager] ❌ Échec du changement vers ${targetRoomName}`);
        return false;
      }
    } catch (error) {
      console.error(`[NetworkManager] Erreur changement de zone:`, error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  async disconnect() {
    if (this.room) {
      this.isConnected = false;
      this.isTransitioning = false;
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
