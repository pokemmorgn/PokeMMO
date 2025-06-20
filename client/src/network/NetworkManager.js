// client/src/network/NetworkManager.js - VERSION WORLDROOM CORRIGÉE
// ✅ Corrections pour les états de transition et synchronisation

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
    
    // ✅ NOUVEAU: Gestion améliorée des transitions
    this.transitionState = {
      isActive: false,
      targetZone: null,
      startTime: 0,
      timeout: null,
      maxDuration: 8000 // 8 secondes max
    };
    
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
      
      // ✅ CORRECTION: Reset des états de transition lors de la connexion
      this.resetTransitionState();

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
  
  // ✅ NOUVEAU: Stocker les zone data
  this.lastReceivedZoneData = data;
  
  if (this.callbacks.onZoneData) {
    this.callbacks.onZoneData(data);
  }
});

// Liste des NPCs
this.room.onMessage("npcList", (npcs) => {
 console.log(`🤖 [NetworkManager] NPCs reçus: ${npcs.length}`);
 
 // ✅ NOUVEAU: Stocker les NPCs reçus
 this.lastReceivedNpcs = npcs;
 
 if (this.callbacks.onNpcList) {
   this.callbacks.onNpcList(npcs);
 }
});

// ✅ AMÉLIORATION: Gestion des résultats de transition
this.room.onMessage("transitionResult", (result) => {
 console.log(`🌀 [NetworkManager] === TRANSITION RESULT ===`);
 console.log(`📊 Résultat:`, result);
 
 if (result.success) {
   console.log(`✅ [NetworkManager] Transition réussie vers: ${result.currentZone}`);
   this.currentZone = result.currentZone;
   
   // ✅ CORRECTION CRITIQUE: Reset de l'état de transition AVANT le callback
   this.resetTransitionState();
   
   if (this.callbacks.onTransitionSuccess) {
     this.callbacks.onTransitionSuccess(result);
   }
 } else {
   console.error(`❌ [NetworkManager] Transition échouée: ${result.reason}`);
   
   // ✅ CORRECTION: Reset même en cas d'échec
   this.resetTransitionState();
   
   if (this.callbacks.onTransitionError) {
     this.callbacks.onTransitionError(result);
   }
 }
});

// Interactions NPC
this.room.onMessage("npcInteractionResult", (result) => {
 console.log(`💬 [NetworkManager] NPC interaction:`, result);
 
 if (this.callbacks.onNpcInteraction) {
   this.callbacks.onNpcInteraction(result);
 }
});

// ✅ AMÉLIORATION: État des joueurs avec protection transition
this.room.onStateChange((state) => {
 // ✅ NOUVEAU: Permettre les updates même en transition (pour que le joueur apparaisse)
 if (this.callbacks.onStateChange) {
   this.callbacks.onStateChange(state);
 }
});
    // ✅ AJOUTEZ ce listener pour le state filtré
this.room.onMessage("filteredState", (state) => {
    console.log(`📊 [NetworkManager] State filtré reçu:`, {
        playersCount: state.players?.size || 0,
        zone: this.currentZone
    });
    
    if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
    }
});
// ✅ NOUVEAU: Forcer le state initial après connexion
    this.room.onStateChange.once((state) => {
        console.log(`🎯 [NetworkManager] ÉTAT INITIAL reçu:`, state);
        console.log(`👥 Joueurs dans l'état initial:`, state.players.size);
        
        // Forcer l'appel du callback même pour l'état initial
        if (this.callbacks.onStateChange && state.players.size > 0) {
            console.log(`🔥 [NetworkManager] Force l'appel callback pour état initial`);
            this.callbacks.onStateChange(state);
        }
    });
        this.room.onMessage("filteredState", (state) => {
        console.log(`📊 [NetworkManager] State filtré reçu:`, {
            playersCount: state.players?.size || 0,
            zone: this.currentZone
        });
        
        if (this.callbacks.onStateChange) {
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
      if (!this.transitionState.isActive) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      }
    });

    // Appeler onConnect après configuration
    if (this.callbacks.onConnect) {
      console.log(`[NetworkManager] 🎯 Connexion établie`);
      this.callbacks.onConnect();
    }
  }

  // ✅ AMÉLIORATION: Transition entre zones avec gestion d'état
  moveToZone(targetZone, spawnX, spawnY) {
    if (!this.isConnected || !this.room) {
      console.warn("[NetworkManager] ⚠️ Cannot move to zone - not connected");
      return false;
    }

    // ✅ NOUVEAU: Vérifier si une transition est déjà en cours
    if (this.transitionState.isActive) {
      console.warn(`[NetworkManager] ⚠️ Transition déjà en cours vers: ${this.transitionState.targetZone}`);
      return false;
    }

    console.log(`[NetworkManager] 🌀 === DEMANDE TRANSITION ===`);
    console.log(`📍 De: ${this.currentZone} vers: ${targetZone}`);
    console.log(`📊 Position: (${spawnX}, ${spawnY})`);
    
    // ✅ NOUVEAU: Marquer la transition comme active
    this.startTransition(targetZone);
    
    this.room.send("moveToZone", {
      targetZone: targetZone,
      spawnX: spawnX,
      spawnY: spawnY
    });

    return true;
  }

  // ✅ NOUVELLE MÉTHODE: Démarrer une transition
  startTransition(targetZone) {
    console.log(`[NetworkManager] 🌀 Début transition vers: ${targetZone}`);
    
    // Nettoyer l'ancien timeout s'il existe
    if (this.transitionState.timeout) {
      clearTimeout(this.transitionState.timeout);
    }
    
    this.transitionState = {
      isActive: true,
      targetZone: targetZone,
      startTime: Date.now(),
      timeout: setTimeout(() => {
        console.error(`[NetworkManager] ⏰ Timeout transition vers: ${targetZone}`);
        this.resetTransitionState();
        
        if (this.callbacks.onTransitionError) {
          this.callbacks.onTransitionError({
            success: false,
            reason: "Timeout de transition"
          });
        }
      }, this.transitionState.maxDuration),
      maxDuration: 8000
    };
    
    // ✅ CORRECTION: Ne plus utiliser isTransitioning global
    this.isTransitioning = true;
  }

  // ✅ NOUVELLE MÉTHODE: Reset de l'état de transition
  resetTransitionState() {
    console.log(`[NetworkManager] 🔄 Reset de l'état de transition`);
    
    if (this.transitionState.timeout) {
      clearTimeout(this.transitionState.timeout);
    }
    
    this.transitionState = {
      isActive: false,
      targetZone: null,
      startTime: 0,
      timeout: null,
      maxDuration: 8000
    };
    
    this.isTransitioning = false;
  }

  // ✅ AMÉLIORATION: sendMove avec vérification transition allégée
  sendMove(x, y, direction, isMoving) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      // ✅ NOUVEAU: Permettre les mouvements même en transition (sinon le joueur ne peut pas bouger après transition)
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        this.room.send("playerMove", { x, y, direction, isMoving });
        this.lastSendTime = now;
      }
    }
  }

  sendNpcInteract(npcId) {
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      console.log(`[NetworkManager] 💬 Interaction NPC: ${npcId}`);
      this.room.send("npcInteract", { npcId });
    }
  }

  startQuest(questId) {
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      console.log(`[NetworkManager] 🎯 Démarrage quête: ${questId}`);
      this.room.send("questStart", { questId });
    }
  }

  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      this.room.send(type, data);
    }
  }
 notifyZoneChange(newZone, x, y) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
        console.log(`📡 [NetworkManager] Notification changement zone: ${this.currentZone} → ${newZone}`);
        
        this.room.send("notifyZoneChange", {
            newZone: newZone,
            x: x,
            y: y
        });
        
        this.currentZone = newZone;
        console.log(`✅ [NetworkManager] Zone mise à jour: ${newZone}`);
    } else {
        console.warn(`⚠️ [NetworkManager] Impossible de notifier changement zone - pas connecté`);
    }
  }
  // Callbacks
  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onPlayerData(callback) { this.callbacks.onPlayerData = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  onNpcList(callback) { this.callbacks.onNpcList = callback; }
  onTransitionSuccess(callback) { this.callbacks.onTransitionSuccess = callback; }
  onTransitionError(callback) { this.callbacks.onTransitionError = callback; }
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

  // ✅ AMÉLIORATION: isTransitioning avec état détaillé
  get isTransitionActive() {
    return this.transitionState.isActive;
  }

  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }

  async disconnect() {
    console.log(`[NetworkManager] 📤 Déconnexion demandée`);
    
    // Reset des états
    this.resetTransitionState();
    
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

  // ✅ SUPPRIMÉ: resetTransitionFlag (remplacé par resetTransitionState)

  // ✅ AMÉLIORATION: Debug state avec info transition
  debugState() {
    console.log(`[NetworkManager] 🔍 === ÉTAT DEBUG WORLDROOM ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 isConnected: ${this.isConnected}`);
    console.log(`🌀 isTransitioning: ${this.isTransitioning}`);
    console.log(`🎯 transitionState:`, this.transitionState);
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
      console.warn(`[NetworkManager] ⚠️ DÉSYNCHRONISATION ZONE !`);
      console.warn(`   Serveur: ${serverZone}`);
      console.warn(`   Client: ${clientZone} (${currentScene})`);
      return false;
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
