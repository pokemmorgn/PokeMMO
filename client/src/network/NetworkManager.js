// client/src/network/NetworkManager.js - VERSION CORRIGÉE
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
    this.pendingTransitionResolve = null; // ✅ AJOUT pour les transitions
  }

  async connect(roomName = null) {
    try {
      const targetRoomName = roomName || GAME_CONFIG.server.roomName;
      if (!targetRoomName) throw new Error("Room name is required");

      if (this.room) {
        await this.disconnect();
      }

      console.log(`[NetworkManager] 🔌 Connexion à la room: ${targetRoomName}`);
      this.room = await this.client.joinOrCreate(targetRoomName, {
        username: this.username,
      });

      // ✅ CORRECTION CRITIQUE : S'assurer que sessionId est défini
      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.isTransitioning = false;

      console.log(`[NetworkManager] ✅ Connecté! SessionId: ${this.sessionId}`);

      this.setupRoomListeners();
      return true;
    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  setupRoomListeners() {
    if (!this.room) return;

    // ✅ CORRECTION : Vérifier que sessionId est défini avant les listeners
    if (!this.sessionId) {
      this.sessionId = this.room.sessionId;
      console.log(`[NetworkManager] 🔧 SessionId récupéré dans setupRoomListeners: ${this.sessionId}`);
    }

    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) this.callbacks.onStateChange(state);
    });

    this.room.onMessage("playerData", (data) => {
      if (this.callbacks.onPlayerData) this.callbacks.onPlayerData(data);
    });

    // ✅ Listeners pour les transitions
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
      console.log(`[NetworkManager] 📤 Déconnexion de la room`);
      if (!this.isTransitioning) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
      }
    });

    // ✅ CORRECTION CRITIQUE : Appeler onConnect APRÈS avoir tout configuré
    if (this.callbacks.onConnect) {
      console.log(`[NetworkManager] 🎯 Déclenchement onConnect avec sessionId: ${this.sessionId}`);
      this.callbacks.onConnect();
    }
  }

  // ✅ Demander une transition
  async requestTransition(transitionData) {
    if (!this.isConnected || !this.room || this.isTransitioning) {
      console.warn("[NetworkManager] ⚠️ Cannot request transition - not connected or already transitioning");
      return false;
    }

    console.log(`[NetworkManager] 🌀 Demande de transition:`, transitionData);

    return new Promise((resolve) => {
      this.pendingTransitionResolve = resolve;
      this.room.send("requestTransition", transitionData);
      
      setTimeout(() => {
        if (this.pendingTransitionResolve) {
          console.warn("[NetworkManager] ⏰ Transition request timeout");
          this.pendingTransitionResolve(false);
          this.pendingTransitionResolve = null;
        }
      }, 3000);
    });
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

  // ✅ Méthode pour changer de room (transitions entre zones)
  async changeZone(targetRoomName, spawnData = {}) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] ⚠️ Transition déjà en cours`);
      return false;
    }

    this.isTransitioning = true;
    console.log(`[NetworkManager] 🔄 Changement vers ${targetRoomName}`);

    try {
      // Sauvegarder les infos actuelles
      const oldSessionId = this.sessionId;
      
      // Quitter la room actuelle
      if (this.room) {
        await this.room.leave();
        this.room = null;
        this.sessionId = null;
      }

      // Délai court
      await new Promise(resolve => setTimeout(resolve, 100));

      // Se connecter à la nouvelle room
      const success = await this.connect(targetRoomName);
      
      if (success) {
        console.log(`[NetworkManager] ✅ Changement réussi vers ${targetRoomName}, nouveau sessionId: ${this.sessionId}`);
        return true;
      } else {
        console.error(`[NetworkManager] ❌ Échec du changement vers ${targetRoomName}`);
        return false;
      }
    } catch (error) {
      console.error(`[NetworkManager] 💥 Erreur changement de zone:`, error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  // ✅ Méthode pour obtenir l'état d'un joueur (existante mais vérifiée)
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

  // ✅ DEBUG : Méthode pour diagnostiquer l'état
  debugState() {
    console.log(`[NetworkManager] 🔍 DEBUG:`, {
      sessionId: this.sessionId,
      isConnected: this.isConnected,
      roomConnected: this.room?.connection?.isOpen,
      roomId: this.room?.id,
      isTransitioning: this.isTransitioning
    });
  }
}
