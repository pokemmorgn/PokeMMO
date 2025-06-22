// client/src/network/NetworkManager.js - VERSION CORRIGÉE CALLBACKS
// ✅ AJOUT DE LA MÉTHODE onTransitionValidation MANQUANTE

import { Client } from "colyseus.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

export class NetworkManager {
  constructor(username) {
    this.client = new Client(GAME_CONFIG.server.url);
    this.username = username;
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    
    this.isTransitionActive = false;
    this.transitionStartTime = 0;
    this.currentZone = null;
    
    this.lastSendTime = 0;
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onDisconnect: null,
      onCurrentZone: null,
      onZoneData: null,
      onNpcList: null,
      onNpcInteraction: null,
      onSnap: null,
      onTransitionValidation: null // ✅ AJOUTÉ
    };
    
    console.log(`📡 [NetworkManager] Initialisé pour: ${username}`);
  }

  // ✅ CONNEXION (identique)
  async connect(spawnZone = "beach", spawnData = {}) {
    try {
      console.log(`📡 [NetworkManager] === CONNEXION WORLDROOM ===`);
      console.log(`🌍 Zone spawn: ${spawnZone}`);
      console.log(`📊 Données spawn:`, spawnData);
      
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

      this.room = await this.client.joinOrCreate("world", roomOptions);
      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      
      console.log(`📡 [NetworkManager] ✅ Connecté! SessionId: ${this.sessionId}`);

      this.setupRoomListeners();
      return true;
      
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      return false;
    }
  }

  // ✅ LISTENERS CORRIGÉS
  setupRoomListeners() {
    if (!this.room) return;

    console.log(`📡 [NetworkManager] Setup listeners...`);

    // ✅ LISTENER 1: Zone actuelle
    this.room.onMessage("currentZone", (data) => {
      console.log(`📍 [NetworkManager] === ZONE SERVEUR REÇUE ===`);
      console.log(`🎯 Zone: ${data.zone}`);
      console.log(`📊 Position: (${data.x}, ${data.y})`);
      
      this.currentZone = data.zone;
      
      if (this.callbacks.onCurrentZone) {
        this.callbacks.onCurrentZone(data);
      }
      
      console.log(`📡 [NetworkManager] ✅ Zone mise à jour: ${this.currentZone}`);
    });

    // ✅ LISTENER 2: État initial
    this.room.onStateChange.once((state) => {
      console.log(`📡 [NetworkManager] État initial reçu`);
      console.log(`👥 Joueurs: ${state.players?.size || 0}`);
      
      if (this.callbacks.onStateChange && state.players?.size > 0) {
        this.callbacks.onStateChange(state);
      }
    });

    // ✅ LISTENER 3: États réguliers
    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    // ✅ LISTENER 4: Zone data
    this.room.onMessage("zoneData", (data) => {
      console.log(`📡 [NetworkManager] Zone data: ${data.zone}`);
      this.currentZone = data.zone;
      
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    // ✅ LISTENER 5: NPCs
    this.room.onMessage("npcList", (npcs) => {
      console.log(`📡 [NetworkManager] NPCs reçus: ${npcs.length}`);
      
      if (this.callbacks.onNpcList) {
        this.callbacks.onNpcList(npcs);
      }
    });

    // ✅ LISTENER 6: Validation transition (CORRIGÉ)
    this.room.onMessage("transitionResult", (result) => {
      console.log(`📡 [NetworkManager] === RÉSULTAT TRANSITION ===`);
      console.log(`✅ Succès: ${result.success}`);
      
      if (result.success) {
        console.log(`🎯 Nouvelle zone: ${result.currentZone}`);
        this.currentZone = result.currentZone;
        this.isTransitionActive = false;
      } else {
        console.error(`❌ Erreur: ${result.reason}`);
        this.isTransitionActive = false;
      }
      
      // ✅ NOUVEAU : APPEL DIRECT DU CALLBACK TRANSITION
      console.log(`📞 [NetworkManager] Appel callback transition...`);
      if (this.callbacks.onTransitionValidation) {
        console.log(`📞 [NetworkManager] ✅ Callback trouvé, appel...`);
        this.callbacks.onTransitionValidation(result);
      } else {
        console.warn(`📞 [NetworkManager] ⚠️ Aucun callback transition enregistré!`);
      }
    });

    // ✅ LISTENER 7: Interactions NPC
    this.room.onMessage("npcInteractionResult", (result) => {
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // ✅ LISTENER 8: Snap position
    this.room.onMessage("snap", (data) => {
      if (this.callbacks.onSnap) {
        this.callbacks.onSnap(data);
      }
    });

    // ✅ LISTENER 9: Connexion établie
    this.room.onJoin(() => {
      console.log(`📡 [NetworkManager] Connexion établie`);
      
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    // ✅ LISTENER 10: Déconnexion
    this.room.onLeave(() => {
      console.log(`📡 [NetworkManager] Déconnexion`);
      
      if (!this.isTransitionActive) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      }
    });

    console.log(`📡 [NetworkManager] ✅ Listeners configurés`);
  }

  // ✅ TRANSITION SIMPLIFIÉE
  moveToZone(targetZone, spawnX, spawnY) {
    if (!this.isConnected || !this.room) {
      console.warn("📡 [NetworkManager] ⚠️ Pas connecté pour transition");
      return false;
    }

    if (this.isTransitionActive) {
      console.warn(`📡 [NetworkManager] ⚠️ Transition déjà en cours`);
      return false;
    }

    console.log(`📡 [NetworkManager] === DEMANDE TRANSITION ===`);
    console.log(`📍 Vers: ${targetZone}`);
    console.log(`📊 Position: (${spawnX}, ${spawnY})`);
    
    this.isTransitionActive = true;
    this.transitionStartTime = Date.now();
    
    this.room.send("moveToZone", {
      targetZone: targetZone,
      spawnX: spawnX,
      spawnY: spawnY
    });

    return true;
  }

  // ✅ VÉRIFICATION CONNEXION AVANT ENVOI
  validateTransition(request) {
    if (!this.isConnected || !this.room) {
      console.warn("📡 [NetworkManager] ⚠️ Pas connecté pour validation");
      
      // ✅ NOUVEAU : Tentative reconnexion si déconnecté
      if (!this.isConnected) {
        console.log("📡 [NetworkManager] Tentative reconnexion automatique...");
        this.attemptReconnection();
      }
      
      return false;
    }

    console.log(`📡 [NetworkManager] === VALIDATION TRANSITION ===`);
    console.log(`📤 Requête:`, request);
    
    this.isTransitionActive = true;
    this.transitionStartTime = Date.now();
    
    try {
      this.room.send("validateTransition", request);
      return true;
    } catch (error) {
      console.error(`❌ [NetworkManager] Erreur envoi transition:`, error);
      this.handleTransitionDisconnect();
      return false;
    }
  }

  // ✅ COMMUNICATION
  sendMove(x, y, direction, isMoving) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        this.room.send("playerMove", { x, y, direction, isMoving });
        this.lastSendTime = now;
      }
    }
  }

  sendNpcInteract(npcId) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      this.room.send("npcInteract", { npcId });
    }
  }
  
  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      this.room.send(type, data);
    }
  }

  requestCurrentZone(sceneKey) {
    if (this.isConnected && this.room) {
      console.log(`📡 [NetworkManager] Demande zone pour: ${sceneKey}`);
      
      this.room.send("requestCurrentZone", {
        sceneKey: sceneKey,
        timestamp: Date.now()
      });
    }
  }

  // ✅ GETTERS
  getSessionId() { 
    return this.sessionId; 
  }

  getCurrentZone() {
    return this.currentZone;
  }

  isTransitioning() {
    return this.isTransitionActive;
  }

  // ✅ CALLBACKS SIMPLIFIÉS
  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onCurrentZone(callback) { this.callbacks.onCurrentZone = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  onNpcList(callback) { this.callbacks.onNpcList = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }
  
  // ✅ NOUVEAU : CALLBACK TRANSITION VALIDATION
  onTransitionValidation(callback) { 
    console.log(`📞 [NetworkManager] Enregistrement callback transition:`, !!callback);
    this.callbacks.onTransitionValidation = callback; 
  }

  // ✅ HELPER POUR ONMESSAGE
  onMessage(type, callback) {
    if (this.room) {
      this.room.onMessage(type, callback);
    }
  }

  // ✅ DEBUG
  debugState() {
    console.log(`📡 [NetworkManager] === DEBUG ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 Connecté: ${this.isConnected}`);
    console.log(`🌀 En transition: ${this.isTransitionActive}`);
    console.log(`🌍 Zone actuelle: ${this.currentZone}`);
    console.log(`🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.log(`👥 Joueurs: ${this.room?.state?.players?.size || 0}`);
    
    // ✅ NOUVEAU : Debug callbacks
    console.log(`📞 Callbacks enregistrés:`);
    Object.keys(this.callbacks).forEach(key => {
      console.log(`  - ${key}: ${!!this.callbacks[key]}`);
    });
    
    if (this.isTransitionActive) {
      const elapsed = Date.now() - this.transitionStartTime;
      console.log(`⏱️ Transition depuis: ${elapsed}ms`);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Gestion déconnexion pendant transition
  handleTransitionDisconnect() {
    console.log(`🔧 [NetworkManager] === GESTION DÉCONNEXION TRANSITION ===`);
    
    // ✅ Marquer comme déconnecté
    this.isConnected = false;
    
    // ✅ Arrêter la transition
    this.isTransitionActive = false;
    
    // ✅ Notifier l'erreur au TransitionManager
    if (this.callbacks.onTransitionValidation) {
      console.log(`📞 [NetworkManager] Notifier erreur transition...`);
      this.callbacks.onTransitionValidation({
        success: false,
        reason: "Connexion perdue pendant la transition"
      });
    }
    
    // ✅ Tentative de reconnexion automatique après délai
    console.log(`🔄 [NetworkManager] Tentative reconnexion dans 2 secondes...`);
    
    setTimeout(() => {
      this.attemptReconnection();
    }, 2000);
  }

  // ✅ NOUVELLE MÉTHODE : Tentative de reconnexion
  async attemptReconnection() {
    console.log(`🔄 [NetworkManager] === TENTATIVE RECONNEXION ===`);
    
    if (this.isConnected) {
      console.log(`✅ [NetworkManager] Déjà reconnecté`);
      return;
    }
    
    try {
      // ✅ Nettoyer l'ancienne connexion
      if (this.room) {
        try {
          await this.room.leave();
        } catch (e) {
          // Ignorer erreurs de déconnexion
        }
        this.room = null;
      }
      
      // ✅ Nouvelle connexion avec zone actuelle
      const roomOptions = {
        name: this.username,
        spawnZone: this.currentZone || "beach",
        reconnect: true // Flag pour le serveur
      };
      
      console.log(`📡 [NetworkManager] Reconnexion avec options:`, roomOptions);
      
      this.room = await this.client.joinOrCreate("world", roomOptions);
      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      
      console.log(`✅ [NetworkManager] Reconnexion réussie! Nouveau SessionId: ${this.sessionId}`);
      
      // ✅ Reconfigurer les listeners
      this.setupRoomListeners();
      
      // ✅ Notifier la reconnexion
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
      
    } catch (error) {
      console.error(`❌ [NetworkManager] Échec reconnexion:`, error);
      
      // ✅ Réessayer après délai plus long
      setTimeout(() => {
        this.attemptReconnection();
      }, 5000);
    }
  }
  async disconnect() {
    console.log(`📡 [NetworkManager] Déconnexion...`);
    
    this.isTransitionActive = false;
    
    if (this.room) {
      this.isConnected = false;
      
      try {
        await this.room.leave();
        console.log(`📡 [NetworkManager] ✅ Déconnecté`);
      } catch (error) {
        console.warn("📡 [NetworkManager] ⚠️ Erreur déconnexion:", error);
      }
      
      this.room = null;
      this.sessionId = null;
      this.currentZone = null;
    }
  }
}
