// client/src/network/NetworkManager.js - VERSION LOGGÉE [NETWORKMANAGER]
// ✅ GESTION DÉCONNEXION + RECONNEXION AUTOMATIQUE + LOGS DEBUG COMPLETS

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
      onTransitionValidation: null
    };

    console.log(`[NETWORKMANAGER] 📡 Initialisé pour: ${username}`);
  }

  // ✅ CONNEXION
  async connect(spawnZone = "beach", spawnData = {}) {
    console.warn(`[NETWORKMANAGER] [connect] Tentative connexion: spawnZone=${spawnZone}, spawnData=`, spawnData, "currentZone=", this.currentZone);

    try {
      console.log(`[NETWORKMANAGER] 📡 === CONNEXION WORLDROOM ===`);
      console.log(`[NETWORKMANAGER] 🌍 Zone spawn: ${spawnZone}`);
      console.log(`[NETWORKMANAGER] 📊 Données spawn:`, spawnData);

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

      console.log(`[NETWORKMANAGER] 📡 ✅ Connecté! SessionId: ${this.sessionId}, currentZone: ${this.currentZone}`);

      this.setupRoomListeners();
      return true;

    } catch (error) {
      console.error("[NETWORKMANAGER] ❌ Erreur connexion:", error);
      return false;
    }
  }

  // ✅ LISTENERS COMPLETS
  setupRoomListeners() {
    if (!this.room) return;

    console.log(`[NETWORKMANAGER] 📡 Setup listeners...`);

    // ✅ LISTENER 1: Zone actuelle
    this.room.onMessage("currentZone", (data) => {
      console.log(`[NETWORKMANAGER] 📍 === ZONE SERVEUR REÇUE ===`);
      console.log(`[NETWORKMANAGER] 🎯 Zone: ${data.zone}`);
      console.log(`[NETWORKMANAGER] 📊 Position: (${data.x}, ${data.y})`);

      this.currentZone = data.zone;

      if (this.callbacks.onCurrentZone) {
        this.callbacks.onCurrentZone(data);
      }

      console.log(`[NETWORKMANAGER] 📡 ✅ Zone mise à jour: ${this.currentZone}`);
    });

    // ✅ LISTENER 2: État initial
    this.room.onStateChange.once((state) => {
      console.log(`[NETWORKMANAGER] 📡 État initial reçu`);
      console.log(`[NETWORKMANAGER] 👥 Joueurs: ${state.players?.size || 0}`);

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
      console.log(`[NETWORKMANAGER] 📡 Zone data: ${data.zone}`);
      this.currentZone = data.zone;

      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    // ✅ LISTENER 5: NPCs
    this.room.onMessage("npcList", (npcs) => {
      console.log(`[NETWORKMANAGER] 📡 NPCs reçus: ${npcs.length}`);

      if (this.callbacks.onNpcList) {
        this.callbacks.onNpcList(npcs);
      }
    });

    // ✅ LISTENER 6: Validation transition CORRIGÉ
    this.room.onMessage("transitionResult", (result) => {
      console.log(`[NETWORKMANAGER] 📡 === RÉSULTAT TRANSITION ===`);
      console.log(`[NETWORKMANAGER] ✅ Succès: ${result.success}`);
      if (result.success) {
        console.log(`[NETWORKMANAGER] 🎯 Nouvelle zone: ${result.currentZone}`);
        this.currentZone = result.currentZone;
        this.isTransitionActive = false;
      } else {
        console.error(`[NETWORKMANAGER] ❌ Erreur: ${result.reason}`);
        this.isTransitionActive = false;
      }

      // ✅ APPEL DIRECT DU CALLBACK TRANSITION
      console.log(`[NETWORKMANAGER] 📞 Appel callback transition...`);
      if (this.callbacks.onTransitionValidation) {
        console.log(`[NETWORKMANAGER] 📞 ✅ Callback trouvé, appel...`);
        this.callbacks.onTransitionValidation(result);
      } else {
        console.warn(`[NETWORKMANAGER] 📞 ⚠️ Aucun callback transition enregistré!`);
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
      console.log(`[NETWORKMANAGER] 📡 Connexion établie`);
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    // ✅ LISTENER 10: Déconnexion AMÉLIORÉE
    this.room.onLeave(() => {
      console.warn(`[NETWORKMANAGER] 📡 === DÉCONNEXION DÉTECTÉE ===`);
      console.warn(`[NETWORKMANAGER] 🌀 En transition: ${this.isTransitionActive}`);
      console.warn(`[NETWORKMANAGER] 🔌 État connexion: ${this.isConnected}`);
      console.warn(`[NETWORKMANAGER] currentZone au moment de la déco:`, this.currentZone);

      if (!this.isTransitionActive) {
        this.isConnected = false;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      } else {
        // ✅ Déconnexion pendant transition = tentative reconnexion
        console.warn(`[NETWORKMANAGER] ⚠️ Déconnexion pendant transition!`);
        this.handleTransitionDisconnect();
      }
    });

    // ✅ LISTENER 11: Gestion erreur WebSocket
    this.room.onError((error) => {
      console.error(`[NETWORKMANAGER] ❌ Erreur WebSocket:`, error);

      if (this.isTransitionActive) {
        console.warn(`[NETWORKMANAGER] ⚠️ Erreur pendant transition`);
        this.handleTransitionDisconnect();
      }
    });

    console.log(`[NETWORKMANAGER] 📡 ✅ Listeners configurés`);
  }

  // ✅ NOUVELLE MÉTHODE : Gestion déconnexion pendant transition
  handleTransitionDisconnect() {
    console.warn(`[NETWORKMANAGER] 🔧 === GESTION DÉCONNEXION TRANSITION ===`);

    // ✅ Marquer comme déconnecté
    this.isConnected = false;

    // ✅ Arrêter la transition
    this.isTransitionActive = false;

    // ✅ Notifier l'erreur au TransitionManager
    if (this.callbacks.onTransitionValidation) {
      console.warn(`[NETWORKMANAGER] 📞 Notifier erreur transition...`);
      this.callbacks.onTransitionValidation({
        success: false,
        reason: "Connexion perdue pendant la transition"
      });
    }

    // ✅ Tentative de reconnexion automatique après délai
    console.warn(`[NETWORKMANAGER] 🔄 Tentative reconnexion dans 2 secondes...`);
    setTimeout(() => {
      this.attemptReconnection();
    }, 2000);
  }

  // ✅ NOUVELLE MÉTHODE : Tentative de reconnexion
  async attemptReconnection() {
    console.warn(`[NETWORKMANAGER] 🔄 === TENTATIVE RECONNEXION ===`);
    console.warn(`[NETWORKMANAGER] 🔄 currentZone:`, this.currentZone);

    if (this.isConnected) {
      console.log(`[NETWORKMANAGER] ✅ Déjà reconnecté`);
      return;
    }

    try {
      // ✅ Nettoyer l'ancienne connexion
      if (this.room) {
        try {
          await this.room.leave();
        } catch (e) { }
        this.room = null;
      }

      // ✅ Nouvelle connexion avec zone actuelle
      const roomOptions = {
        name: this.username,
        spawnZone: this.currentZone || "beach",
        reconnect: true // Flag pour le serveur
      };

      console.warn(`[NETWORKMANAGER] 📡 Reconnexion avec options:`, roomOptions);

      this.room = await this.client.joinOrCreate("world", roomOptions);
      this.sessionId = this.room.sessionId;
      this.isConnected = true;

      console.log(`[NETWORKMANAGER] ✅ Reconnexion réussie! Nouveau SessionId: ${this.sessionId}, currentZone: ${this.currentZone}`);

      // ✅ Reconfigurer les listeners
      this.setupRoomListeners();

      // ✅ Notifier la reconnexion
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }

    } catch (error) {
      console.error(`[NETWORKMANAGER] ❌ Échec reconnexion:`, error);
      setTimeout(() => {
        this.attemptReconnection();
      }, 5000);
    }
  }

  // ✅ TRANSITION SIMPLIFIÉE
  moveToZone(targetZone, spawnX, spawnY) {
    if (!this.isConnected || !this.room) {
      console.warn("[NETWORKMANAGER] ⚠️ Pas connecté pour transition");
      return false;
    }

    if (this.isTransitionActive) {
      console.warn(`[NETWORKMANAGER] ⚠️ Transition déjà en cours`);
      return false;
    }

    console.warn(`[NETWORKMANAGER] === DEMANDE TRANSITION ===`);
    console.warn(`[NETWORKMANAGER] Vers: ${targetZone}`);
    console.warn(`[NETWORKMANAGER] Position: (${spawnX}, ${spawnY})`);
    console.warn(`[NETWORKMANAGER] currentZone (avant):`, this.currentZone);

    this.isTransitionActive = true;
    this.transitionStartTime = Date.now();

    this.room.send("moveToZone", {
      targetZone: targetZone,
      spawnX: spawnX,
      spawnY: spawnY
    });

    return true;
  }

  // ✅ VALIDATION TRANSITION AVEC PROTECTION
  validateTransition(request) {
    if (!this.isConnected || !this.room) {
      console.warn("[NETWORKMANAGER] ⚠️ Pas connecté pour validation");
      if (!this.isConnected) {
        console.warn("[NETWORKMANAGER] Tentative reconnexion automatique...");
        this.attemptReconnection();
      }
      return false;
    }

    console.warn(`[NETWORKMANAGER] === VALIDATION TRANSITION ===`);
    console.warn(`[NETWORKMANAGER] 📤 Requête:`, request);
    console.warn(`[NETWORKMANAGER] currentZone (avant):`, this.currentZone);

    this.isTransitionActive = true;
    this.transitionStartTime = Date.now();

    try {
      this.room.send("validateTransition", request);
      return true;
    } catch (error) {
      console.error(`[NETWORKMANAGER] ❌ Erreur envoi transition:`, error);
      this.handleTransitionDisconnect();
      return false;
    }
  }

  // ✅ COMMUNICATION SÉCURISÉE
  sendMove(x, y, direction, isMoving) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        try {
          this.room.send("playerMove", { x, y, direction, isMoving });
          this.lastSendTime = now;
        } catch (error) {
          console.warn("[NETWORKMANAGER] Erreur envoi mouvement:", error);
        }
      }
    }
  }

  sendNpcInteract(npcId) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      try {
        this.room.send("npcInteract", { npcId });
      } catch (error) {
        console.warn("[NETWORKMANAGER] Erreur interaction NPC:", error);
      }
    }
  }

  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.isTransitionActive) {
      try {
        this.room.send(type, data);
      } catch (error) {
        console.warn(`[NETWORKMANAGER] Erreur envoi ${type}:`, error);
      }
    }
  }

  requestCurrentZone(sceneKey) {
    if (this.isConnected && this.room) {
      console.warn(`[NETWORKMANAGER] Demande zone pour: ${sceneKey}`);
      try {
        this.room.send("requestCurrentZone", {
          sceneKey: sceneKey,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn("[NETWORKMANAGER] Erreur demande zone:", error);
      }
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

  // ✅ CALLBACKS
  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onCurrentZone(callback) { this.callbacks.onCurrentZone = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  onNpcList(callback) { this.callbacks.onNpcList = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }
  // ✅ CALLBACK TRANSITION VALIDATION CORRIGÉ
  onTransitionValidation(callback) { 
    console.warn(`[NETWORKMANAGER] 📞 Enregistrement callback transition:`, !!callback);
    this.callbacks.onTransitionValidation = callback; 
  }

  // ✅ HELPER POUR ONMESSAGE
  onMessage(type, callback) {
    if (this.room) {
      try {
        this.room.onMessage(type, callback);
      } catch (error) {
        console.warn(`[NETWORKMANAGER] Erreur setup listener ${type}:`, error);
      }
    }
  }

  // ✅ DEBUG COMPLET
  debugState() {
    console.warn(`[NETWORKMANAGER] === DEBUG ===`);
    console.warn(`[NETWORKMANAGER] 👤 Username: ${this.username}`);
    console.warn(`[NETWORKMANAGER] 🆔 SessionId: ${this.sessionId}`);
    console.warn(`[NETWORKMANAGER] 🔌 Connecté: ${this.isConnected}`);
    console.warn(`[NETWORKMANAGER] 🌀 En transition: ${this.isTransitionActive}`);
    console.warn(`[NETWORKMANAGER] 🌍 Zone actuelle: ${this.currentZone}`);
    console.warn(`[NETWORKMANAGER] 🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.warn(`[NETWORKMANAGER] 👥 Joueurs: ${this.room?.state?.players?.size || 0}`);
    // ✅ Debug callbacks
    console.warn(`[NETWORKMANAGER] 📞 Callbacks enregistrés:`);
    Object.keys(this.callbacks).forEach(key => {
      console.warn(`  - ${key}: ${!!this.callbacks[key]}`);
    });
    if (this.isTransitionActive) {
      const elapsed = Date.now() - this.transitionStartTime;
      console.warn(`[NETWORKMANAGER] ⏱️ Transition depuis: ${elapsed}ms`);
    }
  }

  // ✅ DÉCONNEXION PROPRE
  async disconnect() {
    console.warn(`[NETWORKMANAGER] 📡 Déconnexion...`);
    this.isTransitionActive = false;
    if (this.room) {
      this.isConnected = false;
      try {
        await this.room.leave();
        console.warn(`[NETWORKMANAGER] 📡 ✅ Déconnecté`);
      } catch (error) {
        console.warn("[NETWORKMANAGER] ⚠️ Erreur déconnexion:", error);
      }
      this.room = null;
      this.sessionId = null;
      this.currentZone = null;
    }
    // ✅ Nettoyer la référence globale
    if (window.globalNetworkManager === this) {
      window.globalNetworkManager = null;
    }
  }
}
