// client/src/network/NetworkManager.js - VERSION COMPLÈTE AVEC DEBUG
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
        console.log(`[NetworkManager] 🔌 Déconnexion de la room actuelle avant reconnexion`);
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

  // ✅ CORRIGÉ : Méthode pour changer de room (transitions entre zones) avec logs détaillés
  async changeZone(targetRoomName, spawnData = {}) {
    if (this.isTransitioning) {
      console.log(`[NetworkManager] ⚠️ Transition déjà en cours`);
      return false;
    }

    this.isTransitioning = true;
    console.log(`[NetworkManager] 🔄 === DÉBUT CHANGEMENT DE ZONE ===`);
    console.log(`[NetworkManager] 🏠 Room actuelle: ${this.room?.id || 'aucune'}`);
    console.log(`[NetworkManager] 🎯 Room cible: ${targetRoomName}`);
    console.log(`[NetworkManager] 👤 SessionId actuel: ${this.sessionId}`);
    console.log(`[NetworkManager] 📦 SpawnData:`, spawnData);

    try {
      // Sauvegarder les infos actuelles
      const oldRoomId = this.room?.id;
      const oldSessionId = this.sessionId;
      
      console.log(`[NetworkManager] 📤 Quitter room: ${oldRoomId}`);
      
      // Quitter la room actuelle
      if (this.room) {
        await this.room.leave();
        console.log(`[NetworkManager] ✅ Room ${oldRoomId} quittée`);
        this.room = null;
        this.sessionId = null;
        this.isConnected = false;
      }

      // Délai court pour laisser le serveur traiter la déconnexion
      console.log(`[NetworkManager] ⏳ Attente 200ms...`);
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log(`[NetworkManager] 🔌 Connexion à la nouvelle room: ${targetRoomName}`);
      
      // Se connecter à la nouvelle room avec les données de spawn
      this.room = await this.client.joinOrCreate(targetRoomName, {
        username: this.username,
        ...spawnData
      });

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      
      console.log(`[NetworkManager] ✅ === CHANGEMENT RÉUSSI ===`);
      console.log(`[NetworkManager] 🏠 Nouvelle room: ${this.room?.id}`);
      console.log(`[NetworkManager] 👤 Nouveau sessionId: ${this.sessionId}`);
      console.log(`[NetworkManager] 📊 Ancien sessionId: ${oldSessionId}`);
      
      if (oldSessionId !== this.sessionId) {
        console.log(`[NetworkManager] 🔄 SessionId changé: ${oldSessionId} → ${this.sessionId}`);
      }

      // Reconfigurer les listeners pour la nouvelle room
      this.setupRoomListeners();
      
      return true;
    } catch (error) {
      console.error(`[NetworkManager] 💥 Erreur changement de zone:`, error);
      this.isConnected = false;
      return false;
    } finally {
      this.isTransitioning = false;
      console.log(`[NetworkManager] 🏁 Fin du processus de changement de zone`);
    }
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

  // ✅ Méthode pour obtenir l'état d'un joueur (existante mais vérifiée)
  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }

  async disconnect() {
    console.log(`[NetworkManager] 🔌 Déconnexion demandée`);
    if (this.room) {
      this.isConnected = false;
      this.isTransitioning = false;
      try {
        console.log(`[NetworkManager] 📤 Quitter room: ${this.room.id}`);
        await this.room.leave();
        console.log(`[NetworkManager] ✅ Room quittée`);
      } catch (error) {
        console.warn("⚠️ Erreur lors de la déconnexion:", error);
      }
      this.room = null;
      this.sessionId = null;
    }
  }

  resetTransitionFlag() {
    this.isTransitioning = false;
    console.log(`[NetworkManager] 🚩 Flag de transition reset`);
  }

  // ✅ DEBUG : Méthode pour diagnostiquer l'état
  debugState() {
    console.log(`[NetworkManager] 🔍 === DEBUG STATE ===`);
    console.log(`   sessionId: ${this.sessionId}`);
    console.log(`   isConnected: ${this.isConnected}`);
    console.log(`   roomConnected: ${this.room?.connection?.isOpen}`);
    console.log(`   roomId: ${this.room?.id}`);
    console.log(`   isTransitioning: ${this.isTransitioning}`);
    console.log(`   username: ${this.username}`);
    
    if (this.room && this.room.state && this.room.state.players) {
      console.log(`   playersInRoom: ${this.room.state.players.size}`);
      const myPlayer = this.room.state.players.get(this.sessionId);
      if (myPlayer) {
        console.log(`   myPlayerPosition: (${myPlayer.x}, ${myPlayer.y})`);
        console.log(`   myPlayerMap: ${myPlayer.map}`);
      } else {
        console.log(`   myPlayer: NOT FOUND`);
      }
    }
    console.log(`[NetworkManager] 🔍 === END DEBUG ===`);
  }

  // ✅ NOUVELLE MÉTHODE : Forcer la reconnexion en cas de problème
  async forceReconnect(roomName) {
    console.log(`[NetworkManager] 🔄 === RECONNEXION FORCÉE ===`);
    this.debugState();
    
    try {
      await this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));
      const success = await this.connect(roomName);
      
      if (success) {
        console.log(`[NetworkManager] ✅ Reconnexion forcée réussie`);
      } else {
        console.error(`[NetworkManager] ❌ Échec de la reconnexion forcée`);
      }
      
      return success;
    } catch (error) {
      console.error(`[NetworkManager] 💥 Erreur lors de la reconnexion forcée:`, error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier l'état de la connexion
  isHealthy() {
    return this.isConnected && 
           this.room && 
           this.room.connection && 
           this.room.connection.isOpen && 
           this.sessionId;
  }
}
