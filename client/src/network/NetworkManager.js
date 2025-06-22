// client/src/network/NetworkManager.js - VERSION LOGGUÉE POUR DEBUG AVANCÉ

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
      onMyPlayerConfirmed: null,
      onMyPlayerMissing: null,
    };

    console.log(`[NetworkManager][ctor] Créé pour utilisateur : ${username}`);
  }

  async connect(spawnZone = "beach", spawnData = {}) {
    console.log(`[NetworkManager][connect] Demande de connexion...`);
    try {
      if (this.room) {
        console.log(`[NetworkManager][connect] Room déjà existante. Déconnexion d'abord.`);
        await this.disconnect();
      }

      const roomOptions = {
        name: this.username,
        spawnZone: spawnZone,
        spawnX: spawnData.spawnX || 52,
        spawnY: spawnData.spawnY || 48,
        ...spawnData
      };

      console.log(`[NetworkManager][connect] Options de connexion Colyseus :`, roomOptions);

      this.room = await this.client.joinOrCreate("world", roomOptions);

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.currentZone = spawnZone;
      this.myPlayerConfirmed = false;
      this.myPlayerData = null;

      this.resetTransitionState();

      console.log(`[NetworkManager][connect] ✅ Connecté à WorldRoom! SessionId: ${this.sessionId}`);

      this.setupRoomListeners();
      return true;

    } catch (error) {
      console.error("[NetworkManager][connect] ❌ Connection error:", error);
      return false;
    }
  }

  setupRoomListeners() {
    if (!this.room) {
      console.error("[NetworkManager][setupRoomListeners] ❌ Aucune room");
      return;
    }

    console.log(`[NetworkManager][setupRoomListeners] Setup des listeners sur WorldRoom (id: ${this.room.id}, session: ${this.sessionId})`);

    // --- PLAYER SPAWNED ---
    this.room.onMessage("playerSpawned", (data) => {
      console.log(`[NetworkManager][playerSpawned] Data:`, data);

      if (data.isMyPlayer) {
        console.log(`[NetworkManager][playerSpawned] --> C'est MON joueur`);
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
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(this.myPlayerData);
        }
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 1000);
      }
    });

    // --- STATE FORCÉ ---
    this.room.onMessage("forcedStateSync", (data) => {
      console.log(`[NetworkManager][forcedStateSync] Data:`, data);

      const playersMap = new Map();
      if (data.players) {
        Object.entries(data.players).forEach(([sessionId, playerData]) => {
          playersMap.set(sessionId, playerData);
        });
      }
      const stateWithMap = { players: playersMap };
      console.log(`[NetworkManager][forcedStateSync] State (Map):`, playersMap);
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(stateWithMap);
      }
    });

    // --- PLAYER STATE RESPONSE ---
    this.room.onMessage("playerStateResponse", (data) => {
      console.log(`[NetworkManager][playerStateResponse] Data:`, data);

      if (data.exists && data.isMyPlayer) {
        console.log(`[NetworkManager][playerStateResponse] Mon joueur confirmé`);
        this.myPlayerData = data;
        this.myPlayerConfirmed = true;
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(data);
        }
      } else {
        console.error(`[NetworkManager][playerStateResponse] Mon joueur N'EXISTE PAS sur le serveur`);
        this.myPlayerConfirmed = false;
        if (this.callbacks.onMyPlayerMissing) {
          this.callbacks.onMyPlayerMissing(data);
        }
      }
    });

    // --- PRESENCE CHECK ---
    this.room.onMessage("presenceCheck", (data) => {
      console.log(`[NetworkManager][presenceCheck] Data:`, data);

      if (!data.exists) {
        console.error(`[NetworkManager][presenceCheck] Je ne suis PAS dans le state serveur !`);
        this.myPlayerConfirmed = false;
        this.requestPlayerState();
      } else {
        console.log(`[NetworkManager][presenceCheck] Ma présence est confirmée.`);
        this.myPlayerConfirmed = true;
      }
    });

    // --- CURRENT ZONE ---
    this.room.onMessage("currentZone", (data) => {
      console.log(`[NetworkManager][currentZone] Data:`, data);
      this.currentZone = data.zone;
      if (this.callbacks.onCurrentZone) {
        this.callbacks.onCurrentZone(data);
      }
    });

    // --- ÉTAT INITIAL ---
    this.room.onStateChange.once((state) => {
      console.log(`[NetworkManager][onStateChange.once] Etat initial reçu. players:`, state.players);

      if (state.players?.has && state.players.has(this.sessionId)) {
        console.log(`[NetworkManager][onStateChange.once] Mon joueur trouvé dans l'état initial`);
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
        console.warn(`[NetworkManager][onStateChange.once] Mon joueur absent de l'état initial`);
        this.myPlayerConfirmed = false;
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 500);
      }
      if (this.callbacks.onStateChange && state.players?.size > 0) {
        this.callbacks.onStateChange(state);
      }
    });

    // --- ONJOIN ---
    this.room.onJoin(() => {
      console.log(`[NetworkManager][onJoin] Client rejoint la room. sessionId: ${this.sessionId}`);
      setTimeout(() => {
        if (!this.myPlayerConfirmed) {
          console.log(`[NetworkManager][onJoin] Vérification présence après join`);
          this.checkMyPresence();
        }
      }, 1000);
      this.room.send("requestInitialState", { zone: this.currentZone });
    });

    // --- ZONE DATA ---
    this.room.onMessage("zoneData", (data) => {
      console.log(`[NetworkManager][zoneData] Data:`, data);
      this.currentZone = data.zone;
      this.lastReceivedZoneData = data;
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    // --- NPC LIST ---
    this.room.onMessage("npcList", (npcs) => {
      console.log(`[NetworkManager][npcList] Nombre de npcs: ${npcs.length}`, npcs);
      this.lastReceivedNpcs = npcs;
      if (this.callbacks.onNpcList) {
        this.callbacks.onNpcList(npcs);
      }
    });

    // --- TRANSITION RESULT ---
    this.room.onMessage("transitionResult", (result) => {
      console.log(`[NetworkManager][transitionResult] Data:`, result);
      if (result.success && result.currentZone) {
        console.log(`[NetworkManager][transitionResult] Transition réussie vers: ${result.currentZone}`);
        this.currentZone = result.currentZone;
      }
      if (this.onTransitionValidation) {
        this.onTransitionValidation(result);
      }
      if (result.success && this.callbacks.onTransitionSuccess) {
        this.callbacks.onTransitionSuccess(result);
      } else if (!result.success && this.callbacks.onTransitionError) {
        this.callbacks.onTransitionError(result);
      }
    });

    // --- NPC INTERACTION ---
    this.room.onMessage("npcInteractionResult", (result) => {
      console.log(`[NetworkManager][npcInteractionResult] Data:`, result);
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // --- STATE CHANGE (FILTRÉ ou PAS) ---
    this.room.onStateChange((state) => {
      console.log(`[NetworkManager][onStateChange] State reçu. players:`, state.players);
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    // --- FILTERED STATE ---
    this.room.onMessage("filteredState", (state) => {
      console.log(`[NetworkManager][filteredState] Data:`, state);

      const playersMap = new Map();
      if (state.players) {
        Object.entries(state.players).forEach(([sessionId, playerData]) => {
          playersMap.set(sessionId, playerData);
        });
      }

      const stateWithMap = { players: playersMap };
      console.log(`[NetworkManager][filteredState] players:`, Array.from(playersMap.keys()));
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(stateWithMap);
      }
    });

    // --- PLAYER DATA ---
    this.room.onMessage("playerData", (data) => {
      console.log(`[NetworkManager][playerData] Data:`, data);
      if (this.callbacks.onPlayerData) {
        this.callbacks.onPlayerData(data);
      }
    });

    // --- SNAP ---
    this.room.onMessage("snap", (data) => {
      console.log(`[NetworkManager][snap] Data:`, data);
      if (this.callbacks.onSnap) {
        this.callbacks.onSnap(data);
      }
    });

    // --- ONLEAVE ---
    this.room.onLeave(() => {
      console.log(`[NetworkManager][onLeave] Déconnexion WorldRoom`);
      if (!this.transitionState.isActive) {
        this.isConnected = false;
        this.myPlayerConfirmed = false;
        this.myPlayerData = null;
        if (this.callbacks.onDisconnect) {
          this.callbacks.onDisconnect();
        }
      }
    });

    // --- Connexion terminée ---
    if (this.callbacks.onConnect) {
      console.log(`[NetworkManager][onConnect] Callback connexion appelé`);
      this.callbacks.onConnect();
    }
  }

  // --- NOUVELLES MÉTHODES POUR PREMIER JOUEUR ---
  ensureMyPlayerExists() {
    console.log(`[NetworkManager][ensureMyPlayerExists] myPlayerConfirmed=${this.myPlayerConfirmed} myPlayerData?=${!!this.myPlayerData} sessionId=${this.sessionId}`);
    if (!this.room || !this.sessionId) {
      console.error(`[NetworkManager][ensureMyPlayerExists] ❌ Pas de room/sessionId pour vérifier`);
      return;
    }
    const hasInState = this.room.state?.players?.has && this.room.state.players.has(this.sessionId);
    if (!hasInState || !this.myPlayerConfirmed) {
      console.warn(`[NetworkManager][ensureMyPlayerExists] Mon joueur absent ou non confirmé !`);
      this.requestPlayerState();
      setTimeout(() => {
        this.checkMyPresence();
      }, 2000);
    } else {
      console.log(`[NetworkManager][ensureMyPlayerExists] Mon joueur trouvé et confirmé`);
    }
  }

  requestPlayerState() {
    console.log(`[NetworkManager][requestPlayerState] Envoi de requestPlayerState au serveur`);
    if (this.room) {
      this.room.send("requestPlayerState");
    }
  }

  checkMyPresence() {
    console.log(`[NetworkManager][checkMyPresence] Envoi de checkMyPresence au serveur`);
    if (this.room) {
      this.room.send("checkMyPresence");
    }
  }

  // --- CALLBACKS ---
  onMyPlayerConfirmed(callback) { this.callbacks.onMyPlayerConfirmed = callback; }
  onMyPlayerMissing(callback) { this.callbacks.onMyPlayerMissing = callback; }
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
  onTransitionValidation(callback) { this.callbacks.onTransitionValidation = callback; }
  onCurrentZone(callback) { this.callbacks.onCurrentZone = callback; }

  onMessage(type, callback) {
    console.log(`[NetworkManager][onMessage] Enregistrement du handler pour '${type}'`);
    if (this.room) {
      this.room.onMessage(type, callback);
    } else {
      if (!this._pendingMessages) this._pendingMessages = [];
      this._pendingMessages.push({ type, callback });
    }
  }

  // --- GETTERS ---
  getSessionId() { console.log(`[NetworkManager][getSessionId] Retourne: ${this.sessionId}`); return this.sessionId; }
  getCurrentZone() { console.log(`[NetworkManager][getCurrentZone] Retourne: ${this.currentZone}`); return this.currentZone; }
  get isTransitionActive() { return this.transitionState.isActive; }
  isMyPlayerReady() { return this.myPlayerConfirmed && this.myPlayerData !== null; }
  getMyPlayerData() { return this.myPlayerData; }

  getPlayerState(sessionId) {
    const player = (this.room && this.room.state && this.room.state.players) ? this.room.state.players.get(sessionId) : null;
    console.log(`[NetworkManager][getPlayerState] Pour sessionId: ${sessionId}, player:`, player);
    return player;
  }

  // --- TRANSITION ---
  moveToZone(targetZone, spawnX, spawnY) {
    console.log(`[NetworkManager][moveToZone] Demande moveToZone: ${targetZone}, spawn: (${spawnX},${spawnY})`);
    if (!this.isConnected || !this.room) {
      console.warn("[NetworkManager][moveToZone] ⚠️ Not connected");
      return false;
    }
    if (this.transitionState.isActive) {
      console.warn(`[NetworkManager][moveToZone] ⚠️ Transition déjà en cours vers: ${this.transitionState.targetZone}`);
      return false;
    }
    this.startTransition(targetZone);
    this.room.send("moveToZone", {
      targetZone: targetZone,
      spawnX: spawnX,
      spawnY: spawnY
    });
    return true;
  }

  startTransition(targetZone) {
    console.log(`[NetworkManager][startTransition] Début transition vers: ${targetZone}`);
    if (this.transitionState.timeout) clearTimeout(this.transitionState.timeout);
    this.transitionState = {
      isActive: true,
      targetZone: targetZone,
      startTime: Date.now(),
      timeout: setTimeout(() => {
        console.error(`[NetworkManager][startTransition] ⏰ Timeout transition vers: ${targetZone}`);
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
    console.log(`[NetworkManager][resetTransitionState]`);
    if (this.transitionState.timeout) clearTimeout(this.transitionState.timeout);
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
    console.log(`[NetworkManager][sendMove]`, {x, y, direction, isMoving});
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      const now = Date.now();
      if (!this.lastSendTime || now - this.lastSendTime > 50) {
        this.room.send("playerMove", { x, y, direction, isMoving });
        this.lastSendTime = now;
      }
    }
  }

  startQuest(questId) {
    console.log(`[NetworkManager][startQuest] id: ${questId}`);
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      this.room.send("questStart", { questId });
    }
  }

  sendNpcInteract(npcId) {
    console.log(`[NetworkManager][sendNpcInteract] id: ${npcId}`);
    if (this.isConnected && this.room && !this.isTransitioning) {
      this.room.send("npcInteract", { npcId });
    }
  }

  sendMessage(type, data) {
    console.log(`[NetworkManager][sendMessage] type: ${type}, data:`, data);
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      this.room.send(type, data);
    }
  }

  notifyZoneChange(newZone, x, y) {
    console.log(`[NetworkManager][notifyZoneChange] newZone: ${newZone}, x: ${x}, y: ${y}`);
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      this.room.send("notifyZoneChange", {
        newZone: newZone,
        x: x,
        y: y
      });
      this.currentZone = newZone;
      console.log(`[NetworkManager][notifyZoneChange] Zone mise à jour: ${newZone}`);
    } else {
      console.warn(`[NetworkManager][notifyZoneChange] Impossible de notifier changement zone - pas connecté`);
    }
  }

  requestCurrentZone(sceneKey) {
    console.log(`[NetworkManager][requestCurrentZone] pour scene: ${sceneKey}`);
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      this.room.send("requestCurrentZone", {
        sceneKey: sceneKey,
        timestamp: Date.now()
      });
    } else {
      console.warn(`[NetworkManager][requestCurrentZone] Impossible de demander zone - pas connecté`);
    }
  }

  async disconnect() {
    console.log(`[NetworkManager][disconnect] Déconnexion demandée`);
    this.resetTransitionState();
    this.myPlayerConfirmed = false;
    this.myPlayerData = null;

    if (this.room) {
      this.isConnected = false;
      try {
        const roomId = this.room.id;
        await this.room.leave();
        console.log(`[NetworkManager][disconnect] ✅ Déconnexion réussie de ${roomId}`);
      } catch (error) {
        console.warn("[NetworkManager][disconnect] ⚠️ Erreur lors de la déconnexion:", error);
      }
      this.room = null;
      this.sessionId = null;
      this.currentZone = null;
    }
  }

  checkZoneSynchronization(currentScene) {
    console.log(`[NetworkManager][checkZoneSynchronization] pour scene: ${currentScene}`);
    if (!this.room || !this.sessionId) {
      console.warn(`[NetworkManager][checkZoneSynchronization] Pas de room pour vérifier la sync zone`);
      return false;
    }
    const myPlayer = this.room.state.players.get(this.sessionId);
    if (!myPlayer) {
      console.warn(`[NetworkManager][checkZoneSynchronization] Joueur non trouvé pour sync zone`);
      return false;
    }
    const serverZone = myPlayer.currentZone;
    const clientZone = this.mapSceneToZone(currentScene);
    if (serverZone !== clientZone) {
      console.warn(`[NetworkManager][checkZoneSynchronization] DÉSYNCHRONISATION DÉTECTÉE - Demande correction serveur`);
      this.requestCurrentZone(currentScene);
      return false;
    }
    console.log(`[NetworkManager][checkZoneSynchronization] Zones synchronisées: ${serverZone}`);
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
    const zone = mapping[sceneName] || sceneName.toLowerCase();
    console.log(`[NetworkManager][mapSceneToZone] ${sceneName} → ${zone}`);
    return zone;
  }

  async forceZoneSynchronization(currentScene) {
    console.log(`[NetworkManager][forceZoneSynchronization] Forcer la resynchronisation zone pour: ${currentScene}`);
    if (!this.room) {
      console.warn(`[NetworkManager][forceZoneSynchronization] Pas de room pour resynchroniser`);
      return false;
    }
    try {
      this.requestCurrentZone(currentScene);
      return true;
    } catch (error) {
      console.error(`[NetworkManager][forceZoneSynchronization] Erreur:`, error);
      return false;
    }
  }

  debugState() {
    console.log(`[NetworkManager][debugState] === ÉTAT DEBUG WORLDROOM ===`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`🆔 SessionId: ${this.sessionId}`);
    console.log(`🔌 isConnected: ${this.isConnected}`);
    console.log(`🌀 isTransitioning: ${this.isTransitioning}`);
    console.log(`🎯 transitionState:`, this.transitionState);
    console.log(`🌍 currentZone: ${this.currentZone}`);
    console.log(`🏠 Room ID: ${this.room?.id || 'aucune'}`);
    console.log(`📡 Room connectée: ${this.room?.connection?.isOpen || false}`);
    console.log(`📊 Joueurs dans room: ${this.room?.state?.players?.size || 0}`);
    console.log(`👤 === MON JOUEUR ===`);
    console.log(`✅ Confirmé: ${this.myPlayerConfirmed}`);
    console.log(`📊 Data:`, this.myPlayerData);
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
}
