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
    this.pendingTransitionResolve = null;
  }

async connect(roomName = null) {
  try {
    const targetRoomName = roomName || GAME_CONFIG.server.roomName;
    if (!targetRoomName) throw new Error("Room name is required");

    if (this.room) {
      await this.disconnect();
    }

    console.log(`[NetworkManager] 🔌 Connexion à la room: ${targetRoomName}`);
    
    // ✅ CORRECTION CRITIQUE : Forcer joinOrCreate à réutiliser les rooms existantes
    // en utilisant un roomId fixe basé sur le nom de la room
    const roomOptions = {
      username: this.username,
    };

    console.log(`[NetworkManager] 📝 Options de connexion:`, roomOptions);
    
    // ✅ SOLUTION 1 : Essayer d'abord de rejoindre une room existante
    try {
      console.log(`[NetworkManager] 🔍 Tentative de rejoindre une room existante ${targetRoomName}...`);
      
      // Lister les rooms disponibles pour ce type
      const availableRooms = await this.client.getAvailableRooms(targetRoomName);
      console.log(`[NetworkManager] 📋 Rooms disponibles:`, availableRooms.map(r => ({ roomId: r.roomId, clients: r.clients })));
      
      if (availableRooms.length > 0) {
        // Rejoindre la première room disponible (pas pleine)
        const targetRoom = availableRooms.find(room => room.clients < room.maxClients) || availableRooms[0];
        console.log(`[NetworkManager] 🎯 Rejoindre room existante: ${targetRoom.roomId}`);
        
        this.room = await this.client.joinById(targetRoom.roomId, roomOptions);
        console.log(`[NetworkManager] ✅ Rejoint room existante: ${targetRoom.roomId}`);
      } else {
        throw new Error("Aucune room disponible");
      }
    } catch (joinError) {
      // Si impossible de rejoindre une room existante, en créer une nouvelle
      console.log(`[NetworkManager] ⚠️ Impossible de rejoindre room existante, création...`);
      console.log(`[NetworkManager] 🔧 Raison:`, joinError.message);
      
      this.room = await this.client.create(targetRoomName, roomOptions);
      console.log(`[NetworkManager] ✅ Nouvelle room créée`);
    }

    // ✅ CORRECTION CRITIQUE : S'assurer que sessionId est défini
    this.sessionId = this.room.sessionId;
    this.isConnected = true;
    this.isTransitioning = false;

    console.log(`[NetworkManager] ✅ Connecté! Room: ${this.room.id}, SessionId: ${this.sessionId}`);

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

    // ✅ NOUVEAU : Handler pour la resynchronisation
    this.room.onMessage("forceZoneSync", (data) => {
      console.warn(`🔧 [NetworkManager] RESYNCHRONISATION FORCÉE reçue !`);
      console.warn(`   Serveur dit que nous sommes dans: ${data.currentZone}`);
      // Ce message sera traité par BaseZoneScene
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

  // ✅ Méthode pour changer de room (VERSION AVEC LOGGING DÉTAILLÉ)
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
  console.log(`[NetworkManager] 📊 SpawnData:`, spawnData);

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

    // Délai court pour éviter les problèmes de connexion rapide
    console.log(`[NetworkManager] ⏳ Délai de 200ms...`);
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`[NetworkManager] 🔌 Connexion à la room cible: ${targetRoomName}`);
    
    // ✅ CORRECTION : Options de connexion avec spawn data
    const roomOptions = {
      username: this.username,
      ...spawnData
    };
    
    console.log(`[NetworkManager] 📝 Options de connexion:`, roomOptions);
    
    // ✅ SOLUTION : Essayer de rejoindre une room existante d'abord
    try {
      console.log(`[NetworkManager] 🔍 Recherche de rooms existantes pour ${targetRoomName}...`);
      
      const availableRooms = await this.client.getAvailableRooms(targetRoomName);
      console.log(`[NetworkManager] 📋 Rooms trouvées:`, availableRooms.map(r => ({ 
        roomId: r.roomId, 
        clients: r.clients,
        maxClients: r.maxClients 
      })));
      
      if (availableRooms.length > 0) {
        // Prendre la première room non pleine
        const targetRoom = availableRooms.find(room => room.clients < room.maxClients) || availableRooms[0];
        console.log(`[NetworkManager] 🎯 Rejoindre room: ${targetRoom.roomId} (${targetRoom.clients}/${targetRoom.maxClients} joueurs)`);
        
        this.room = await this.client.joinById(targetRoom.roomId, roomOptions);
        console.log(`[NetworkManager] ✅ Rejoint room existante: ${targetRoom.roomId}`);
      } else {
        throw new Error("Aucune room disponible");
      }
      
    } catch (joinError) {
      console.log(`[NetworkManager] ⚠️ Impossible de rejoindre, création d'une nouvelle room`);
      console.log(`[NetworkManager] 🔧 Erreur:`, joinError.message);
      
      this.room = await this.client.create(targetRoomName, roomOptions);
      console.log(`[NetworkManager] ✅ Nouvelle room créée: ${this.room.id}`);
    }
    
    // ✅ IMPORTANT : Récupérer le nouveau sessionId
    this.sessionId = this.room.sessionId;
    this.isConnected = true;
    
    console.log(`[NetworkManager] ✅ === CHANGEMENT RÉUSSI ===`);
    console.log(`[NetworkManager] 🏠 Room finale: ${this.room?.id}`);
    console.log(`[NetworkManager] 👤 Nouveau sessionId: ${this.sessionId}`);
    console.log(`[NetworkManager] 📊 Ancien sessionId: ${oldSessionId}`);
    
    if (oldSessionId !== this.sessionId) {
      console.log(`[NetworkManager] 🔄 SessionId changé: ${oldSessionId} → ${this.sessionId}`);
    }
    
    // ✅ CRITIQUE : Reconfigurer les listeners pour la nouvelle room
    console.log(`[NetworkManager] 🔧 Reconfiguration des listeners...`);
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

  // ✅ Méthode pour obtenir l'état d'un joueur (existante mais vérifiée)
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
      this.isTransitioning = false;
      
      try {
        const roomId = this.room.id;
        await this.room.leave();
        console.log(`[NetworkManager] ✅ Déconnexion réussie de ${roomId}`);
      } catch (error) {
        console.warn("[NetworkManager] ⚠️ Erreur lors de la déconnexion:", error);
      }
      
      this.room = null;
      this.sessionId = null;
    }
  }

  resetTransitionFlag() {
    console.log(`[NetworkManager] 🔄 Reset du flag de transition`);
    this.isTransitioning = false;
  }

  // ✅ DEBUG : Méthode pour diagnostiquer l'état (AMÉLIORÉE)
  debugState() {
    console.log(`[NetworkManager] 🔍 === ÉTAT DEBUG ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 isConnected: ${this.isConnected}`);
    console.log(`🌀 isTransitioning: ${this.isTransitioning}`);
    console.log(`🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.log(`📡 Room connectée: ${this.room?.connection?.isOpen || false}`);
    console.log(`📊 Joueurs dans room: ${this.room?.state?.players?.size || 0}`);
    
    if (this.room?.state?.players && this.sessionId) {
      const myPlayer = this.room.state.players.get(this.sessionId);
      if (myPlayer) {
        console.log(`🎮 Mon joueur: (${myPlayer.x}, ${myPlayer.y}) dans ${myPlayer.map}`);
      } else {
        console.log(`❌ Mon joueur non trouvé dans la room`);
      }
    }
    console.log(`========================`);
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier la synchronisation
  checkSynchronization() {
    if (!this.room || !this.sessionId) {
      console.warn(`[NetworkManager] ⚠️ Pas de room ou sessionId pour vérifier la sync`);
      return false;
    }

    const myPlayer = this.room.state.players.get(this.sessionId);
    if (!myPlayer) {
      console.warn(`[NetworkManager] ❌ Joueur non trouvé dans room state`);
      return false;
    }

    console.log(`[NetworkManager] ✅ Synchronisation OK - Joueur trouvé: ${myPlayer.name} à (${myPlayer.x}, ${myPlayer.y})`);
    return true;
  }

  // ✅ NOUVELLE MÉTHODE : Forcer une resynchronisation
  async forceSynchronization() {
    console.log(`[NetworkManager] 🔄 Forcer la resynchronisation...`);
    
    if (!this.room) {
      console.warn(`[NetworkManager] ❌ Pas de room pour resynchroniser`);
      return false;
    }

    try {
      // Demander au serveur notre position actuelle
      this.room.send("requestPlayerSync");
      return true;
    } catch (error) {
      console.error(`[NetworkManager] ❌ Erreur lors de la resynchronisation:`, error);
      return false;
    }
  }
}
