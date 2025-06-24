// client/src/network/NetworkManager.js - VERSION MISE À JOUR COMPLÈTE
// ✅ Support interactions modernes + compatibilité + debugging amélioré

import { GAME_CONFIG } from "../config/gameConfig.js";

export class NetworkManager {
  /**
   * @param {Client} colyseusClient - Le client Colyseus global (déjà instancié)
   * @param {string} username - L'identifiant du joueur
   */
  constructor(colyseusClient, username) {
    this.client = colyseusClient;
    this.username = username;
    this.room = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isTransitioning = false;
    this.lastSendTime = 0;
    this.currentZone = null;
    this.lastReceivedNpcs = null;
    this.lastReceivedZoneData = null;
    this.onTransitionValidation = null;

    // ✅ NOUVEAU: Données de mon joueur
    this.myPlayerData = null;
    this.myPlayerConfirmed = false;

    // ✅ NOUVEAU: Stockage des NPCs pour replay
    this.lastReceivedNpcs = null;

    // ✅ NOUVEAU: Support interactions modernes
    this.interactionHistory = [];
    this.connectionHealth = {
      lastPing: 0,
      isHealthy: true,
      reconnectAttempts: 0
    };

    this.transitionState = {
      isActive: false,
      targetZone: null,
      startTime: 0,
      timeout: null,
      maxDuration: 8000
    };

    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onPlayerData: null,
      onDisconnect: null,
      onCurrentZone: null,
      onZoneData: null,
      onNpcList: null,
      onTransitionSuccess: null,
      onTransitionError: null,
      onNpcInteraction: null,
      onSnap: null,
      onTransitionValidation: null,
      // ✅ NOUVEAUX CALLBACKS POUR PREMIER JOUEUR
      onMyPlayerConfirmed: null,
      onMyPlayerMissing: null,
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
      this.myPlayerConfirmed = false;
      this.myPlayerData = null;
      this.connectionHealth.reconnectAttempts = 0;

      this.resetTransitionState();

      console.log(`[NetworkManager] ✅ Connecté à WorldRoom! SessionId: ${this.sessionId}`);

      this.setupRoomListeners();
      this.startHealthMonitoring();
      return true;

    } catch (error) {
      console.error("❌ Connection error:", error);
      this.connectionHealth.reconnectAttempts++;
      return false;
    }
  }

  // ✅ NOUVEAU: Monitoring de santé de connexion
  startHealthMonitoring() {
    // Ping périodique
    setInterval(() => {
      if (this.isConnected && this.room) {
        this.sendPing();
      }
    }, 30000); // Ping toutes les 30 secondes
  }

  sendPing() {
    if (this.room) {
      this.connectionHealth.lastPing = Date.now();
      this.room.send("ping", { timestamp: this.connectionHealth.lastPing });
    }
  }

  setupRoomListeners() {
    if (!this.room) return;

    console.log(`[NetworkManager] 👂 Setup des listeners WorldRoom...`);

    // ✅ NOUVEAU: Handler pong pour health check
    this.room.onMessage("pong", (data) => {
      const latency = Date.now() - this.connectionHealth.lastPing;
      this.connectionHealth.isHealthy = latency < 2000; // Healthy si < 2s
      console.log(`📡 Pong reçu, latence: ${latency}ms, healthy: ${this.connectionHealth.isHealthy}`);
    });

    // ✅ NOUVEAU: Handler pour confirmation de spawn
    this.room.onMessage("playerSpawned", (data) => {
      console.log(`🎯 [NetworkManager] === JOUEUR SPAWNÉ ===`, data);
      
      if (data.isMyPlayer) {
        console.log(`✅ [NetworkManager] Confirmation: MON joueur spawné !`);
        
        // Stocker les infos de mon joueur
        this.myPlayerData = {
          id: data.id,
          name: data.name,
          x: data.x,
          y: data.y,
          currentZone: data.currentZone,
          level: data.level,
          gold: data.gold
        };
        
        this.myPlayerConfirmed = true;
        
        // ✅ DÉCLENCHER la création immédiate du PlayerManager
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(this.myPlayerData);
        }
        
        // ✅ PROGRAMMER une vérification de sécurité
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 1000);
      }
    });

    // ✅ NOUVEAU: Handler pour state forcé
    this.room.onMessage("forcedStateSync", (data) => {
      console.log(`🔄 [NetworkManager] === STATE FORCÉ REÇU ===`, data);
      
      // Convertir l'object en Map si nécessaire pour compatibilité
      const playersMap = new Map();
      
      if (data.players) {
        Object.entries(data.players).forEach(([sessionId, playerData]) => {
          playersMap.set(sessionId, playerData);
        });
      }
      
      const stateWithMap = {
        players: playersMap
      };
      
      console.log(`📊 [NetworkManager] State forcé: ${playersMap.size} joueurs`);
      console.log(`🎯 [NetworkManager] Mon joueur présent: ${playersMap.has(data.mySessionId)}`);
      
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(stateWithMap);
      }
    });

    // ✅ NOUVEAU: Handler pour réponse de state
    this.room.onMessage("playerStateResponse", (data) => {
      console.log(`📋 [NetworkManager] === RÉPONSE PLAYER STATE ===`, data);
      
      if (data.exists && data.isMyPlayer) {
        console.log(`✅ [NetworkManager] Mon joueur confirmé par le serveur`);
        this.myPlayerData = data;
        this.myPlayerConfirmed = true;
        
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(data);
        }
      } else {
        console.error(`❌ [NetworkManager] Mon joueur n'existe pas sur le serveur !`);
        this.myPlayerConfirmed = false;
        
        // Essayer de se reconnecter ou gérer l'erreur
        if (this.callbacks.onMyPlayerMissing) {
          this.callbacks.onMyPlayerMissing(data);
        }
      }
    });

    // ✅ NOUVEAU: Handler pour vérification de présence
    this.room.onMessage("presenceCheck", (data) => {
      console.log(`👻 [NetworkManager] === VÉRIFICATION PRÉSENCE ===`, data);
      
      if (!data.exists) {
        console.error(`❌ [NetworkManager] JE NE SUIS PAS DANS LE STATE !`);
        this.myPlayerConfirmed = false;
        
        // Demander une resync ou se reconnecter
        this.requestPlayerState();
      } else {
        console.log(`✅ [NetworkManager] Ma présence confirmée`);
        this.myPlayerConfirmed = true;
      }
    });

    this.room.onMessage("currentZone", (data) => {
      console.log(`📍 [NetworkManager] Zone actuelle reçue du serveur:`, data);
      this.currentZone = data.zone;
      if (this.callbacks.onCurrentZone) {
        this.callbacks.onCurrentZone(data);
      }
    });

    // ✅ AMÉLIORATION: onStateChange.once pour état initial
    this.room.onStateChange.once((state) => {
      console.log(`🎯 [NetworkManager] === ÉTAT INITIAL REÇU ===`, {
        playersCount: state.players?.size || 0,
        mySessionId: this.sessionId,
        hasMyPlayer: state.players?.has && state.players.has(this.sessionId)
      });
      
      // Vérifier si mon joueur est présent
      if (state.players?.has && state.players.has(this.sessionId)) {
        console.log(`✅ [NetworkManager] Mon joueur trouvé dans l'état initial`);
        this.myPlayerConfirmed = true;
        
        const myPlayer = state.players.get(this.sessionId);
        if (myPlayer && !this.myPlayerData) {
          this.myPlayerData = {
            id: myPlayer.id,
            name: myPlayer.name,
            x: myPlayer.x,
            y: myPlayer.y,
            currentZone: myPlayer.currentZone,
            level: myPlayer.level,
            gold: myPlayer.gold
          };
          
          if (this.callbacks.onMyPlayerConfirmed) {
            this.callbacks.onMyPlayerConfirmed(this.myPlayerData);
          }
        }
      } else {
        console.warn(`⚠️ [NetworkManager] Mon joueur absent de l'état initial`);
        this.myPlayerConfirmed = false;
        
        // Programmer une vérification
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 500);
      }
      
      if (this.callbacks.onStateChange && state.players?.size > 0) {
        this.callbacks.onStateChange(state);
      }
    });

    // ✅ AMÉLIORATION: onJoin avec vérification
    this.room.onJoin(() => {
      console.log(`📡 [NetworkManager] === REJOINT LA ROOM ===`);
      
      // Attendre un peu puis vérifier si on existe
      setTimeout(() => {
        if (!this.myPlayerConfirmed) {
          console.log(`🔍 [NetworkManager] Vérification présence après join`);
          this.checkMyPresence();
        }
      }, 1000);
      
      // Demander l'état initial
      this.room.send("requestInitialState", { zone: this.currentZone });
    });

    this.room.onMessage("zoneData", (data) => {
      console.log(`🗺️ [NetworkManager] Zone data reçue:`, data);
      this.currentZone = data.zone;
      this.lastReceivedZoneData = data;
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    // ✅ HANDLER NPCs CORRIGÉ AVEC REPLAY
    this.room.onMessage("npcList", (npcs) => {
      console.log(`🤖 [NetworkManager] === MESSAGE NPCLIST INTERCEPTÉ ===`);
      console.log(`📊 NPCs: ${npcs.length}`);
      console.log(`🎯 Callback configuré: ${!!this.callbacks.onNpcList}`);
      
      // ✅ STOCKER LES NPCs REÇUS
      this.lastReceivedNpcs = npcs;
      
      console.log(`🤖 [NetworkManager] NPCs reçus: ${npcs.length}`);
      
      if (this.callbacks.onNpcList) {
        console.log(`✅ [NetworkManager] Envoi immédiat au callback`);
        this.callbacks.onNpcList(npcs);
      } else {
        console.log(`⏳ [NetworkManager] NPCs stockés en attente du callback`);
      }
    });

    this.room.onMessage("transitionResult", (result) => {
      console.log(`🔍 [NetworkManager] Résultat de validation de transition:`, result);

      // Sync la zone côté client (important)
      if (result.success && result.currentZone) {
        console.log(`🔄 [NetworkManager] Sync zone: ${this.currentZone} → ${result.currentZone}`);
        this.currentZone = result.currentZone;
      }

      // ✅ DÉLÈGUE à la propriété dynamique: utilisé par le TransitionManager !
      if (this.onTransitionValidation) {
        this.onTransitionValidation(result);
      }

      // Callbacks secondaires (optionnels)
      if (result.success && this.callbacks.onTransitionSuccess) {
        this.callbacks.onTransitionSuccess(result);
      } else if (!result.success && this.callbacks.onTransitionError) {
        this.callbacks.onTransitionError(result);
      }
    });

    // ✅ HANDLERS D'INTERACTION NPC MODERNISÉS - SUPPORT DOUBLE FORMAT
    this.room.onMessage("npcInteractionResult", (result) => {
      console.log(`💬 [NetworkManager] === NPC INTERACTION RESULT ===`, result);
      this.logInteraction('npc_interaction_result', result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // ✅ NOUVEAU: Support messages d'interaction étendus
    this.room.onMessage("interactionResult", (result) => {
      console.log(`🎭 [NetworkManager] === INTERACTION RESULT ÉTENDU ===`, result);
      this.logInteraction('interaction_result_extended', result);
      
      // Déléguer au même callback que npcInteractionResult pour compatibilité
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // ✅ NOUVEAU: Gestion des erreurs d'interaction
    this.room.onMessage("interactionError", (error) => {
      console.error(`❌ [NetworkManager] Erreur interaction:`, error);
      this.logInteraction('interaction_error', error);
      
      // Afficher l'erreur via le callback si disponible
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction({
          success: false,
          error: true,
          message: error.message || "Erreur d'interaction"
        });
      }
    });

    this.room.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    this.room.onMessage("filteredState", (state) => {
      console.log(`📊 [NetworkManager] State filtré reçu:`, {
        playersCount: Object.keys(state.players || {}).length,
        zone: this.currentZone
      });
      
      // Convertir l'object en Map pour compatibilité
      const playersMap = new Map();
      if (state.players) {
        Object.entries(state.players).forEach(([sessionId, playerData]) => {
          playersMap.set(sessionId, playerData);
        });
      }
      
      const stateWithMap = {
        players: playersMap
      };
      
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(stateWithMap);
      }
    });

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

    // ✅ NOUVEAUX HANDLERS POUR SHOP ET INVENTAIRE
    this.room.onMessage("shopCatalogResult", (data) => {
      console.log(`🏪 [NetworkManager] Catalogue shop reçu:`, data);
      // Ces messages sont gérés directement par les systèmes shop/inventaire
    });

    this.room.onMessage("shopTransactionResult", (data) => {
      console.log(`💰 [NetworkManager] Transaction shop:`, data);
      // Ces messages sont gérés directement par les systèmes shop/inventaire
    });

    this.room.onMessage("inventoryUpdate", (data) => {
      console.log(`🎒 [NetworkManager] Update inventaire:`, data);
      // Ces messages sont gérés directement par les systèmes shop/inventaire
    });

    this.room.onMessage("goldUpdate", (data) => {
      console.log(`💰 [NetworkManager] Update or:`, data);
      // Ces messages sont gérés directement par les systèmes shop/inventaire
    });

    this.room.onLeave(() => {
      console.log(`[NetworkManager] 📤 Déconnexion de WorldRoom`);
      if (!this.transitionState.isActive) {
        this.isConnected = false;
        this.myPlayerConfirmed = false;
        this.myPlayerData = null;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      }
    });

    if (this.callbacks.onConnect) {
      console.log(`[NetworkManager] 🎯 Connexion établie`);
      this.callbacks.onConnect();
    }
  }

  // ✅ NOUVEAU: Log des interactions pour debug
  logInteraction(type, data) {
    const logEntry = {
      timestamp: new Date(),
      type: type,
      data: data,
      sessionId: this.sessionId,
      zone: this.currentZone
    };
    
    this.interactionHistory.push(logEntry);
    
    // Garder seulement les 20 dernières
    if (this.interactionHistory.length > 20) {
      this.interactionHistory = this.interactionHistory.slice(-20);
    }
  }

  // ✅ NOUVELLES MÉTHODES POUR PREMIER JOUEUR

  ensureMyPlayerExists() {
    console.log(`🔍 [NetworkManager] === VÉRIFICATION MON JOUEUR ===`);
    console.log(`📊 State: confirmed=${this.myPlayerConfirmed}, data=${!!this.myPlayerData}`);
    
    if (!this.room || !this.sessionId) {
      console.error(`❌ [NetworkManager] Pas de room/sessionId pour vérifier`);
      return;
    }
    
    // Vérifier dans le state local
    const hasInState = this.room.state?.players?.has && this.room.state.players.has(this.sessionId);
    
    if (!hasInState || !this.myPlayerConfirmed) {
      console.warn(`⚠️ [NetworkManager] Mon joueur absent ou non confirmé !`);
      console.warn(`   Dans state: ${hasInState}`);
      console.warn(`   Confirmé: ${this.myPlayerConfirmed}`);
      
      // Demander au serveur
      this.requestPlayerState();
      
      // Programmer une nouvelle vérification
      setTimeout(() => {
        this.checkMyPresence();
      }, 2000);
    } else {
      console.log(`✅ [NetworkManager] Mon joueur trouvé et confirmé`);
    }
  }

  requestPlayerState() {
    console.log(`📤 [NetworkManager] Demande resync player state`);
    
    if (this.room) {
      this.room.send("requestPlayerState");
    }
  }

  checkMyPresence() {
    console.log(`📤 [NetworkManager] Vérification présence serveur`);
    
    if (this.room) {
      this.room.send("checkMyPresence");
    }
  }

  // ✅ NOUVEAUX CALLBACKS
  onMyPlayerConfirmed(callback) { this.callbacks.onMyPlayerConfirmed = callback; }
  onMyPlayerMissing(callback) { this.callbacks.onMyPlayerMissing = callback; }

  // ✅ GETTER POUR VÉRIFIER L'ÉTAT
  isMyPlayerReady() {
    return this.myPlayerConfirmed && this.myPlayerData !== null;
  }

  getMyPlayerData() {
    return this.myPlayerData;
  }

  // === MÉTHODES D'INTERACTION NPC MODERNISÉES ===

  // ✅ MÉTHODE ORIGINALE - Maintenue pour compatibilité
  sendNpcInteract(npcId) {
    if (this.isConnected && this.room && !this.isTransitioning) {
      console.log(`📤 [NetworkManager] Interaction NPC simple: ${npcId}`);
      this.room.send("npcInteract", { npcId });
      this.logInteraction('npc_interact_simple', { npcId });
    }
  }

  // ✅ NOUVELLE MÉTHODE - Support format étendu
  sendNpcInteraction(npcId, additionalData = {}) {
    if (!this.isConnected || !this.room || this.isTransitioning) {
      console.warn(`⚠️ [NetworkManager] Cannot send interaction - not ready`);
      return false;
    }

    console.log(`📤 [NetworkManager] === INTERACTION NPC ÉTENDUE ===`);
    console.log(`🎭 NPC ID: ${npcId}`);
    console.log(`📊 Données supplémentaires:`, additionalData);

    try {
      // ✅ Construire les données d'interaction
      const interactionData = {
        npcId: npcId,
        timestamp: Date.now(),
        zone: this.currentZone,
        sessionId: this.sessionId,
        ...additionalData
      };

      // ✅ Ajouter position du joueur si disponible
      if (this.myPlayerData) {
        interactionData.playerPosition = {
          x: this.myPlayerData.x,
          y: this.myPlayerData.y
        };
      }

      console.log(`📤 Données d'interaction envoyées:`, interactionData);

      // ✅ Essayer les deux formats pour compatibilité maximale
      this.room.send("interactWithNpc", interactionData);
      
      // ✅ Log pour debugging
      this.logInteraction('npc_interact_extended', interactionData);
      
      console.log(`✅ [NetworkManager] Interaction envoyée avec succès`);
      return true;

    } catch (error) {
      console.error(`❌ [NetworkManager] Erreur envoi interaction:`, error);
      
      // ✅ Fallback vers format simple
      try {
        console.log(`🔄 [NetworkManager] Fallback vers format simple...`);
        this.room.send("npcInteract", { npcId });
        this.logInteraction('npc_interact_fallback', { npcId, error: error.message });
        return true;
      } catch (fallbackError) {
        console.error(`❌ [NetworkManager] Fallback échoué aussi:`, fallbackError);
        return false;
      }
    }
  }

  // ✅ MÉTHODE UNIVERSELLE - Auto-détection du format
  interactWithNpc(npcId, options = {}) {
    console.log(`🎯 [NetworkManager] === INTERACTION UNIVERSELLE ===`);
    console.log(`🎭 NPC: ${npcId}`);
    console.log(`⚙️ Options:`, options);

    // ✅ Déterminer le format selon les options
    if (options.useExtended !== false && (options.includePosition || options.includeTimestamp || Object.keys(options).length > 1)) {
      // Format étendu
      console.log(`📈 Utilisation format étendu`);
      return this.sendNpcInteraction(npcId, options);
    } else {
      // Format simple
      console.log(`📊 Utilisation format simple`);
      this.sendNpcInteract(npcId);
      return true;
    }
  }

  // === MÉTHODES DE GESTION DE TRANSITIONS ET COMMUNICATION ===

  moveToZone(targetZone, spawnX, spawnY) {
    if (!this.isConnected || !this.room) {
      console.warn("[NetworkManager] ⚠️ Cannot move to zone - not connected");
      return false;
    }
    if (this.transitionState.isActive) {
      console.warn(`[NetworkManager] ⚠️ Transition déjà en cours vers: ${this.transitionState.targetZone}`);
      return false;
    }
    console.log(`[NetworkManager] 🌀 === DEMANDE TRANSITION ===`);
    console.log(`📍 De: ${this.currentZone} vers: ${targetZone}`);
    console.log(`📊 Position: (${spawnX}, ${spawnY})`);
    this.startTransition(targetZone);
    this.room.send("moveToZone", {
      targetZone: targetZone,
      spawnX: spawnX,
      spawnY: spawnY
    });
    return true;
  }

  startTransition(targetZone) {
    console.log(`[NetworkManager] 🌀 Début transition vers: ${targetZone}`);
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
    this.isTransitioning = true;
  }

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

  sendMove(x, y, direction, isMoving) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        this.room.send("playerMove", { x, y, direction, isMoving });
        this.lastSendTime = now;
        
        // ✅ Mettre à jour les données locales
        if (this.myPlayerData) {
          this.myPlayerData.x = x;
          this.myPlayerData.y = y;
        }
      }
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
      console.log(`📤 [NetworkManager] Envoi message: ${type}`, data);
      this.room.send(type, data);
      
      // ✅ Log pour certains types importants
      if (['shopTransaction', 'getShopCatalog', 'getInventory'].includes(type)) {
        this.logInteraction(`message_${type}`, data);
      }
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

  requestCurrentZone(sceneKey) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      console.log(`📍 [NetworkManager] Demande zone actuelle pour scène: ${sceneKey}`);
      this.room.send("requestCurrentZone", {
        sceneKey: sceneKey,
        timestamp: Date.now()
      });
    } else {
      console.warn(`⚠️ [NetworkManager] Impossible de demander zone - pas connecté`);
    }
  }

  // === CALLBACKS AVEC REPLAY NPCs ===

  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onPlayerData(callback) { this.callbacks.onPlayerData = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  
  // ✅ MÉTHODE CORRIGÉE AVEC REPLAY AUTOMATIQUE
  onNpcList(callback) { 
    console.log(`🔧 [NetworkManager] Configuration callback onNpcList`);
    console.log(`⏰ Timestamp configuration: ${Date.now()}`);
    console.log(`📊 NPCs en attente: ${this.lastReceivedNpcs?.length || 0}`);
    
    this.callbacks.onNpcList = callback; 
    
    // ✅ REPLAY AUTOMATIQUE des NPCs déjà reçus
    if (this.lastReceivedNpcs && this.lastReceivedNpcs.length > 0) {
      console.log(`🔄 [NetworkManager] REPLAY automatique de ${this.lastReceivedNpcs.length} NPCs`);
      
      // Délai court pour que la scène soit prête
      setTimeout(() => {
        if (this.callbacks.onNpcList && this.lastReceivedNpcs) {
          console.log(`📤 [NetworkManager] Envoi des NPCs en replay`);
          this.callbacks.onNpcList(this.lastReceivedNpcs);
        }
      }, 100);
    } else {
      console.log(`ℹ️ [NetworkManager] Aucun NPC en attente de replay`);
    }
  }
  
  onTransitionSuccess(callback) { this.callbacks.onTransitionSuccess = callback; }
  onTransitionError(callback) { this.callbacks.onTransitionError = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }
  onTransitionValidation(callback) { this.callbacks.onTransitionValidation = callback; }
  onCurrentZone(callback) { this.callbacks.onCurrentZone = callback; }

  onMessage(type, callback) {
    if (this.room) {
      this.room.onMessage(type, callback);
    } else {
      if (!this._pendingMessages) this._pendingMessages = [];
      this._pendingMessages.push({ type, callback });
    }
  }

  getSessionId() { return this.sessionId; }
  getCurrentZone() { return this.currentZone; }
  get isTransitionActive() { return this.transitionState.isActive; }

  getPlayerState(sessionId) {
    if (this.room && this.room.state && this.room.state.players) {
      return this.room.state.players.get(sessionId);
    }
    return null;
  }

  async disconnect() {
    console.log(`[NetworkManager] 📤 Déconnexion demandée`);
    this.resetTransitionState();
    this.myPlayerConfirmed = false;
    this.myPlayerData = null;
    
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
      console.warn(`[NetworkManager] 🔄 DÉSYNCHRONISATION DÉTECTÉE - DEMANDE CORRECTION SERVEUR`);
      console.warn(`   Serveur: ${serverZone}`);
      console.warn(`   Client: ${clientZone} (${currentScene})`);
      this.requestCurrentZone(currentScene);
      return false;
    }
    console.log(`[NetworkManager] ✅ Zones synchronisées: ${serverZone}`);
    return true;
  }

  mapSceneToZone(sceneName) {
    const mapping = {
    // Beach
    'BeachScene': 'beach',

    // Village
    'VillageScene': 'village',
    'VillageLabScene': 'villagelab',
    'VillageHouse1Scene': 'villagehouse1',
    'VillageHouse2Scene': 'villagehouse2',
    'VillageFloristScene': 'villageflorist',

    // Road
    'Road1Scene': 'road1',
    'Road1HouseScene': 'road1house',
    'Road2Scene': 'road2',
    'Road3Scene': 'road3',

    // Lavandia
    'LavandiaScene': 'lavandia',
    'LavandiaAnalysisScene': 'lavandiaanalysis',
    'LavandiaBossRoomScene': 'lavandiabossroom',
    'LavandiaCelibTempleScene': 'lavandiacelibtemple',
    'LavandiaEquipementScene': 'lavandiaequipement',
    'LavandiaFurnitureScene': 'lavandiafurniture',
    'LavandiaHealingCenterScene': 'lavandiahealingcenter',
    'LavandiaHouse1Scene': 'lavandiahouse1',
    'LavandiaHouse2Scene': 'lavandiahouse2',
    'LavandiaHouse3Scene': 'lavandiahouse3',
    'LavandiaHouse4Scene': 'lavandiahouse4',
    'LavandiaHouse5Scene': 'lavandiahouse5',
    'LavandiaHouse6Scene': 'lavandiahouse6',
    'LavandiaHouse7Scene': 'lavandiahouse7',
    'LavandiaHouse8Scene': 'lavandiahouse8',
    'LavandiaHouse9Scene': 'lavandiahouse9',
    'LavandiaResearchLabScene': 'lavandiaresearchlab',
    'LavandiaShopScene': 'lavandiashop',

    // NoctherCave
    'NoctherCave1Scene': 'nocthercave1',
    'NoctherCave2Scene': 'nocthercave2',
    'NoctherCave2BisScene': 'nocthercave2bis'
  };
  return mapping[sceneName] || 'beach';
}

  async forceZoneSynchronization(currentScene) {
    console.log(`[NetworkManager] 🔄 Forcer la resynchronisation zone...`);
    if (!this.room) {
      console.warn(`[NetworkManager] ❌ Pas de room pour resynchroniser`);
      return false;
    }
    try {
      this.requestCurrentZone(currentScene);
      return true;
    } catch (error) {
      console.error(`[NetworkManager] ❌ Erreur lors de la resynchronisation zone:`, error);
      return false;
    }
  }

  // Ajoute ça à la fin de NetworkManager
restoreCustomCallbacks() {
  if (!this.room) return;
  if (this.callbacks.onTransitionSuccess)
    this.onTransitionSuccess(this.callbacks.onTransitionSuccess);
  if (this.callbacks.onTransitionError)
    this.onTransitionError(this.callbacks.onTransitionError);
  if (this.callbacks.onNpcList)
    this.onNpcList(this.callbacks.onNpcList);
  if (this.callbacks.onTransitionValidation)
    this.onTransitionValidation(this.callbacks.onTransitionValidation);
  if (this.callbacks.onZoneData)
    this.onZoneData(this.callbacks.onZoneData);
  if (this.callbacks.onSnap)
    this.onSnap(this.callbacks.onSnap);
  if (this.callbacks.onNpcInteraction)
    this.onNpcInteraction(this.callbacks.onNpcInteraction);
  if (this.callbacks.onCurrentZone)
    this.onCurrentZone(this.callbacks.onCurrentZone);
  // Ajoute ici tout autre callback important...
}

  // ✅ DEBUG ET MONITORING AMÉLIORÉS
  
  debugState() {
    console.log(`[NetworkManager] 🔍 === ÉTAT DEBUG COMPLET ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 isConnected: ${this.isConnected}`);
    console.log(`🌀 isTransitioning: ${this.isTransitioning}`);
    console.log(`🎯 transitionState:`, this.transitionState);
    console.log(`🌍 currentZone: ${this.currentZone}`);
    console.log(`🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.log(`📡 Room connectée: ${this.room?.connection?.isOpen || false}`);
    console.log(`📊 Joueurs dans room: ${this.room?.state?.players?.size || 0}`);
    
    // ✅ NOUVEAU: Debug de mon joueur
    console.log(`👤 === MON JOUEUR ===`);
    console.log(`✅ Confirmé: ${this.myPlayerConfirmed}`);
    console.log(`📊 Data:`, this.myPlayerData);
    
    // ✅ NOUVEAU: Debug santé connexion
    console.log(`📡 === SANTÉ CONNEXION ===`);
    console.log(`💓 Healthy: ${this.connectionHealth.isHealthy}`);
    console.log(`📍 Last ping: ${this.connectionHealth.lastPing}`);
    console.log(`🔄 Reconnect attempts: ${this.connectionHealth.reconnectAttempts}`);
    
    // ✅ NOUVEAU: Debug interactions
    console.log(`🎭 === HISTORIQUE INTERACTIONS ===`);
    console.log(`📝 Total: ${this.interactionHistory.length}`);
    if (this.interactionHistory.length > 0) {
      const recent = this.interactionHistory.slice(-3);
      recent.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.type} à ${entry.timestamp.toLocaleTimeString()}`);
      });
    }
    
    if (this.room?.state?.players && this.sessionId) {
      const myPlayer = this.room.state.players.get(this.sessionId);
      if (myPlayer) {
        console.log(`🎮 Mon joueur dans state: (${myPlayer.x}, ${myPlayer.y}) dans ${myPlayer.currentZone}`);
      } else {
        console.log(`❌ Mon joueur non trouvé dans la room`);
      }
    }
    console.log(`================================`);
  }

  // ✅ NOUVEAU: Test de connexion complet
  testConnection() {
    console.log(`🧪 [NetworkManager] === TEST CONNEXION COMPLET ===`);
    
    const tests = [
      {
        name: 'Room exists',
        test: () => !!this.room,
        critical: true
      },
      {
        name: 'Connection open',
        test: () => this.room?.connection?.isOpen,
        critical: true
      },
      {
        name: 'Player confirmed',
        test: () => this.myPlayerConfirmed,
        critical: true
      },
      {
        name: 'Connection healthy',
        test: () => this.connectionHealth.isHealthy,
        critical: false
      },
      {
        name: 'Can send messages',
        test: () => this.isConnected && !this.isTransitioning,
        critical: true
      }
    ];

    let passed = 0;
    let critical_failed = 0;

    tests.forEach(test => {
      const result = test.test();
      const icon = result ? '✅' : test.critical ? '❌' : '⚠️';
      console.log(`${icon} ${test.name}: ${result ? 'OK' : 'FAIL'}`);
      
      if (result) {
        passed++;
      } else if (test.critical) {
        critical_failed++;
      }
    });

    console.log(`🎯 Tests: ${passed}/${tests.length} réussis`);
    
    if (critical_failed > 0) {
      console.log(`❌ ${critical_failed} tests critiques échoués - connexion non fonctionnelle`);
      return false;
    } else {
      console.log(`✅ Connexion opérationnelle`);
      return true;
    }
  }

  // ✅ NOUVEAU: Statistiques réseau
  getNetworkStats() {
    return {
      isConnected: this.isConnected,
      isHealthy: this.connectionHealth.isHealthy,
      lastPing: this.connectionHealth.lastPing,
      reconnectAttempts: this.connectionHealth.reconnectAttempts,
      interactionsCount: this.interactionHistory.length,
      roomId: this.room?.id,
      playersInRoom: this.room?.state?.players?.size || 0,
      myPlayerConfirmed: this.myPlayerConfirmed,
      currentZone: this.currentZone,
      isTransitioning: this.isTransitioning
    };
  }
}

// ✅ Fonctions de debug globales
window.debugNetworkManager = function() {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.debugState();
  } else {
    console.error('❌ NetworkManager global non disponible');
    return { error: 'NetworkManager manquant' };
  }
};

window.testNetworkConnection = function() {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.testConnection();
  } else {
    console.error('❌ NetworkManager global non disponible');
    return false;
  }
};

console.log('✅ NetworkManager mis à jour chargé!');
console.log('🔍 Utilisez window.debugNetworkManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testNetworkConnection() pour test connexion');
