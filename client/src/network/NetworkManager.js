// client/src/network/NetworkManager.js - VERSION OPTIMISÉE
import { GAME_CONFIG } from "../config/gameConfig.js";
import { BattleNetworkHandler } from "./BattleNetworkHandler.js";
import { sceneToZone, zoneToScene } from "../config/ZoneMapping.js";
import { ConnectionManager } from "../managers/ConnectionManager.js";
import { NetworkInteractionHandler } from "./NetworkInteractionHandler.js";

export class NetworkManager {
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

    this.battleNetworkHandler = null;
    this.interactionHandler = null;
    this.myPlayerData = null;
    this.myPlayerConfirmed = false;
    this.lastReceivedNpcs = null;
    this.interactionHistory = [];
    
    this.connectionManager = new ConnectionManager(this);
    
    this.connectionHealth = {
      get lastPing() { return this.connectionManager?.state?.lastPingTime || 0; },
      get isHealthy() { return this.connectionManager?.state?.connectionQuality !== 'bad'; },
      get reconnectAttempts() { return this.connectionManager?.reconnectAttempts || 0; },
      get lastPong() { return this.connectionManager?.state?.lastPongTime || 0; }
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
      onMyPlayerConfirmed: null,
      onMyPlayerMissing: null,
    };

    this.setupConnectionManagerCallbacks();
  }

  setupConnectionManagerCallbacks() {
    this.connectionManager.onReconnecting((attempt, maxAttempts) => {
      if (window.showGameNotification) {
        window.showGameNotification(
          `Reconnexion automatique... (${attempt}/${maxAttempts})`,
          'warning',
          { duration: 3000, position: 'top-center' }
        );
      }
    });

    this.connectionManager.onReconnected((stats) => {
      this.restoreCustomCallbacks();
      this.setupRoomListeners();
      if (window.showGameNotification) {
        window.showGameNotification(
          'Connexion rétablie !',
          'success',
          { duration: 2000, position: 'top-center' }
        );
      }
    });

    this.connectionManager.onConnectionLost((stats) => {
      this.isConnected = false;
      if (!this.transitionState.isActive && this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });

    this.connectionManager.onMaxReconnectReached((attempts) => {
      if (window.showGameNotification) {
        window.showGameNotification(
          'Connexion perdue définitivement. Rechargez la page (F5).',
          'error',
          { duration: 10000, position: 'top-center' }
        );
      }
      
      setTimeout(() => {
        if (confirm('Impossible de rétablir la connexion. Recharger la page ?')) {
          window.location.reload();
        }
      }, 5000);
    });

    this.connectionManager.onServerRestartDetected((data) => {
      if (window.showGameNotification) {
        window.showGameNotification('Server restarting...', 'warning', { duration: 5000 });
      }
    });

    this.connectionManager.onAuthFailure((errorCode, message) => {
      if (window.showGameNotification) {
        window.showGameNotification('Authentication expired...', 'error', { duration: 3000 });
      }
    });
  }

  async connect(spawnZone = "beach", spawnData = {}, sceneInstance = null) {
    try {
      if (this.room) {
        await this.disconnect();
      }

      const userSession = this.getUserSession();
      
      const roomOptions = {
        name: this.username,
        spawnZone: spawnZone,
        spawnX: spawnData.spawnX || 360,
        spawnY: spawnData.spawnY || 120,
        sessionToken: userSession?.sessionToken,
        permissions: userSession?.permissions || ['play'],
        ...spawnData
      };

      this.room = await this.client.joinOrCreate("world", roomOptions);

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.currentZone = spawnZone;
      this.myPlayerConfirmed = false;
      this.myPlayerData = null;

      this.resetTransitionState();

      if (sceneInstance && typeof sceneInstance.setRoom === 'function') {
        sceneInstance.setRoom(this.room);
      }

      this.setupRoomListeners();
      this.connectionManager.startMonitoring();
      
      // ✅ OPTIMISÉ : Initialisation séquentielle et contrôlée
      await this.initializeBattleSystem();
      await this.initializeInteractionHandlerOptimized();
      
      return true;

    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  getUserSession() {
    const token = sessionStorage.getItem('sessionToken');
    
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        sessionStorage.removeItem('sessionToken');
        return null;
      }
      
      return {
        username: decoded.username,
        sessionToken: token,
        userId: decoded.userId,
        isDev: decoded.isDev || false,
        permissions: decoded.permissions || ['play']
      };
      
    } catch (error) {
      sessionStorage.removeItem('sessionToken');
      return null;
    }
  }

  async initializeBattleSystem() {
    if (!this.room || !this.client) {
      return false;
    }
    
    try {
      this.battleNetworkHandler = new BattleNetworkHandler(this);
      const success = this.battleNetworkHandler.initialize(this.room, this.client);
      return success;
    } catch (error) {
      return false;
    }
  }

  // ✅ NOUVEAU : Initialisation optimisée des interactions
  async initializeInteractionHandlerOptimized() {
    if (!this.room || !this.sessionId) {
      return false;
    }
    
    try {
      this.interactionHandler = new NetworkInteractionHandler(this);
      
      // ✅ Attendre que la room soit vraiment prête
      const roomReady = await this.waitForRoomReady(3000);
      if (!roomReady) {
        console.warn('[NetworkManager] ⚠️ Room pas prête, setup différé');
        return false;
      }
      
      // ✅ Setup une seule fois au bon moment
      const success = this.interactionHandler.initialize();
      
      if (success) {
        this.connectInteractionCallbacks();
        return true;
      } else {
        return false;
      }
      
    } catch (error) {
      return false;
    }
  }

  // ✅ NOUVEAU : Attendre que la room soit prête
  async waitForRoomReady(timeoutMs = 3000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.room && this.room.hasJoined && this.room.onMessageHandlers) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= timeoutMs) {
          resolve(false);
          return;
        }
        
        setTimeout(checkReady, 100);
      };
      
      checkReady();
    });
  }

  // ✅ NOUVEAU : Connecter les callbacks d'interaction
  connectInteractionCallbacks() {
    this.onNpcInteraction((result) => {
      if (this.interactionHandler?.callbacks?.onNpcInteraction) {
        this.interactionHandler.callbacks.onNpcInteraction(result);
      }
    });
  }

  // ✅ NOUVEAU : Méthode publique pour récupérer quest data
  getNpcQuestData(npcId) {
    return this.interactionHandler?.getNpcQuestData(npcId) || {
      availableQuestIds: [],
      inProgressQuestIds: [],
      readyToCompleteQuestIds: []
    };
  }

  // ✅ NOUVEAU : Méthode publique pour demander détails quête
  requestQuestDetails(npcId, questId) {
    if (!this.interactionHandler) {
      return false;
    }
    return this.interactionHandler.requestQuestDetails(npcId, questId);
  }

  // ✅ NOUVEAU : Vérifier si NPC a des quêtes
  npcHasQuests(npcId) {
    return this.interactionHandler?.npcHasQuests(npcId) || false;
  }
      
  setupRoomListeners() {
    if (!this.room) return;

    this.room.onMessage("playerSpawned", (data) => {
      if (data.isMyPlayer) {
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
        
        const currentScene = this.room.scene?.scene?.key;
        const expectedScene = this.mapZoneToScene(data.currentZone);
        
        if (currentScene !== expectedScene) {
          setTimeout(() => {
            if (this.room.scene?.scene?.scene) {
              this.room.scene.scene.scene.start(expectedScene, {
                fromServerCorrection: true,
                networkManager: this,
                mySessionId: this.sessionId,
                spawnX: data.x,
                spawnY: data.y,
                serverForced: true,
                preservePlayer: true
              });
            }
          }, 100);
          return;
        }
        
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(this.myPlayerData);
        }
        
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 1000);
      }
    });

    this.room.onMessage("movementBlocked", (data) => {
      // Géré par MovementBlockManager
    });
    this.room.onMessage("movementUnblocked", (data) => {
      // Géré par MovementBlockManager
    });

    this.room.onMessage("pong", (data) => {
      this.connectionManager.handlePongFromServer(data);
    });

    this.room.onError((error) => {
      this.connectionManager.handleErrorFromServer(error);
    });

    this.room.onLeave((code) => {
      this.connectionManager.handleLeaveFromServer(code);
    });
      
    this.room.onMessage("forcedStateSync", (data) => {
      const playersMap = new Map();
      
      if (data.players) {
        Object.entries(data.players).forEach(([sessionId, playerData]) => {
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

    this.room.onMessage("playerStateResponse", (data) => {
      if (data.exists && data.isMyPlayer) {
        this.myPlayerData = data;
        this.myPlayerConfirmed = true;
        
        if (this.callbacks.onMyPlayerConfirmed) {
          this.callbacks.onMyPlayerConfirmed(data);
        }
      } else {
        this.myPlayerConfirmed = false;
        
        if (this.callbacks.onMyPlayerMissing) {
          this.callbacks.onMyPlayerMissing(data);
        }
      }
    });

    this.room.onMessage("presenceCheck", (data) => {
      if (!data.exists) {
        this.myPlayerConfirmed = false;
        this.requestPlayerState();
      } else {
        this.myPlayerConfirmed = true;
      }
    });

    this.room.onMessage("currentZone", (data) => {
      this.currentZone = data.zone;
      if (this.callbacks.onCurrentZone) {
        this.callbacks.onCurrentZone(data);
      }
    });

    this.room.onMessage("forcePlayerPosition", (data) => {
      if (window.playerManager && typeof window.playerManager.forcePosition === "function") {
        window.playerManager.forcePosition(data.x, data.y, data.direction, data.currentZone);
      } else {
        if (this.myPlayerData) {
          this.myPlayerData.x = data.x;
          this.myPlayerData.y = data.y;
          this.myPlayerData.direction = data.direction;
          this.myPlayerData.currentZone = data.currentZone;
        }
      }
    });

    this.room.onStateChange.once((state) => {
      if (state.players?.has && state.players.has(this.sessionId)) {
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
        this.myPlayerConfirmed = false;
        
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 500);
      }
      
      if (this.callbacks.onStateChange && state.players?.size > 0) {
        this.callbacks.onStateChange(state);
      }
    });

    // ✅ OPTIMISÉ : Setup interaction handlers au bon moment
    this.room.onJoin(() => {
      // ✅ Re-setup automatique si handlers pas encore prêts
      setTimeout(() => {
        if (this.interactionHandler && !this.interactionHandler.isInitialized) {
          const success = this.interactionHandler.initialize();
          if (success) {
            this.connectInteractionCallbacks();
          }
        }
      }, 500);
      
      setTimeout(() => {
        if (!this.myPlayerConfirmed) {
          this.checkMyPresence();
        }
      }, 1000);
      
      this.room.send("requestInitialState", { zone: this.currentZone });
    });

    this.room.onMessage("zoneData", (data) => {
      this.currentZone = data.zone;
      this.lastReceivedZoneData = data;
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    this.room.onMessage("npcList", (npcs) => {
      if (!npcs || !Array.isArray(npcs)) {
        return;
      }
      
      this.lastReceivedNpcs = npcs;
      
      if (this.callbacks.onNpcList) {
        try {
          this.callbacks.onNpcList(npcs);
        } catch (callbackError) {
          console.error(`❌ [NetworkManager] Erreur dans le callback onNpcList:`, callbackError);
        }
      }
    });

    this.room.onMessage("transitionResult", (result) => {
      if (result.success && result.currentZone) {
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

    this.room.onMessage("npcInteractionResult", (result) => {
      this.logInteraction('npc_interaction_result', result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

        // ✅ NOUVEAU : Handler pour questDetailsResult
    this.room.onMessage("questDetailsResult", (data) => {
      if (this.interactionHandler) {
        this.interactionHandler.handleQuestDetailsResult(data);
      }
    });
    
    this.room.onMessage("interactionResult", (result) => {
      this.logInteraction('interaction_result_extended', result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    this.room.onMessage("interactionError", (error) => {
      this.logInteraction('interaction_error', error);
      
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

    this.room.onMessage("shopCatalogResult", (data) => {
      // Shop handlers
    });

    this.room.onMessage("shopTransactionResult", (data) => {
      // Shop handlers
    });

    this.room.onMessage("inventoryUpdate", (data) => {
      // Inventory handlers
    });

    this.room.onMessage("zoneObjects", (data) => {
      if (this.callbacks.onZoneObjects) {
        this.callbacks.onZoneObjects(data);
      }
    });
    
    this.room.onMessage("goldUpdate", (data) => {
      // Gold handlers
    });

    this.room.onLeave(() => {
      if (!this.transitionState.isActive) {
        this.isConnected = false;
        this.myPlayerConfirmed = false;
        this.myPlayerData = null;
      }
    });

    this.room.onError((error) => {
      console.error(`❌ [NetworkManager] Erreur room:`, error);
    });

    if (this.callbacks.onConnect) {
      this.callbacks.onConnect();
    }
  }

  logInteraction(type, data) {
    const logEntry = {
      timestamp: new Date(),
      type: type,
      data: data,
      sessionId: this.sessionId,
      zone: this.currentZone
    };
    
    this.interactionHistory.push(logEntry);
    
    if (this.interactionHistory.length > 20) {
      this.interactionHistory = this.interactionHistory.slice(-20);
    }
  }

  ensureMyPlayerExists() {
    if (!this.room || !this.sessionId) {
      return;
    }
    
    const hasInState = this.room.state?.players?.has && this.room.state.players.has(this.sessionId);
    
    if (!hasInState || !this.myPlayerConfirmed) {
      this.requestPlayerState();
      
      setTimeout(() => {
        this.checkMyPresence();
      }, 2000);
    }
  }

  requestPlayerState() {
    if (this.room) {
      this.room.send("requestPlayerState");
    }
  }

  checkMyPresence() {
    if (this.room) {
      this.room.send("checkMyPresence");
    }
  }

  onMyPlayerConfirmed(callback) { this.callbacks.onMyPlayerConfirmed = callback; }
  onMyPlayerMissing(callback) { this.callbacks.onMyPlayerMissing = callback; }

  isMyPlayerReady() {
    return this.myPlayerConfirmed && this.myPlayerData !== null;
  }

  getMyPlayerData() {
    return this.myPlayerData;
  }

  sendNpcInteract(npcId, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendNpcInteract(npcId, additionalData);
    } else {
      return false;
    }
  }

  sendObjectInteract(objectId, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendObjectInteract(objectId, additionalData);
    } else {
      return false;
    }
  }
  
  sendSearchHiddenItem(position, searchRadius = 32, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendSearchHiddenItem(position, searchRadius, additionalData);
    } else {
      return false;
    }
  }

  moveToZone(targetZone, spawnX, spawnY) {
    if (!this.isConnected || !this.room) {
      return false;
    }
    if (this.transitionState.isActive) {
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
    if (this.transitionState.timeout) {
      clearTimeout(this.transitionState.timeout);
    }
    this.transitionState = {
      isActive: true,
      targetZone: targetZone,
      startTime: Date.now(),
      timeout: setTimeout(() => {
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
        
        if (this.myPlayerData) {
          this.myPlayerData.x = x;
          this.myPlayerData.y = y;
        }
      }
    }
  }

  startQuest(questId) {
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      this.room.send("questStart", { questId });
    }
  }

  sendMessage(type, data) {
    if (this.isConnected && this.room && !this.transitionState.isActive) {
      this.room.send(type, data);
      
      if (['shopTransaction', 'getShopCatalog', 'getInventory'].includes(type)) {
        this.logInteraction(`message_${type}`, data);
      }
    }
  }

  notifyZoneChange(newZone, x, y) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      this.room.send("notifyZoneChange", {
        newZone: newZone,
        x: x,
        y: y
      });
      this.currentZone = newZone;
    }
  }

  requestCurrentZone(sceneKey) {
    if (this.isConnected && this.room && this.room.connection && this.room.connection.isOpen) {
      this.room.send("requestCurrentZone", {
        sceneKey: sceneKey,
        timestamp: Date.now()
      });
    }
  }

  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onPlayerData(callback) { this.callbacks.onPlayerData = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  
  onNpcList(callback) { 
    this.callbacks.onNpcList = callback; 
    
    if (this.lastReceivedNpcs && this.lastReceivedNpcs.length > 0) {
      setTimeout(() => {
        if (this.callbacks.onNpcList && this.lastReceivedNpcs) {
          this.callbacks.onNpcList(this.lastReceivedNpcs);
        }
      }, 100);
    }
  }
  
  onTransitionSuccess(callback) { this.callbacks.onTransitionSuccess = callback; }
  onTransitionError(callback) { this.callbacks.onTransitionError = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }
  onTransitionValidation(callback) { this.callbacks.onTransitionValidation = callback; }
  onCurrentZone(callback) { this.callbacks.onCurrentZone = callback; }
  onZoneObjects(callback) { this.callbacks.onZoneObjects = callback; }
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
    this.resetTransitionState();
    
    this.connectionManager.stopMonitoring();
    
    if (this.battleNetworkHandler) {
      await this.battleNetworkHandler.destroy();
      this.battleNetworkHandler = null;
    }
    if (this.interactionHandler) {
      this.interactionHandler.destroy();
      this.interactionHandler = null;
    }
    this.myPlayerConfirmed = false;
    this.myPlayerData = null;
    
    if (this.room) {
      this.isConnected = false;
      try {
        await this.room.leave();
      } catch (error) {
        // Ignore disconnect errors
      }
      this.room = null;
      this.sessionId = null;
      this.currentZone = null;
    }
  }

  checkZoneSynchronization(currentScene) {
    if (!this.room || !this.sessionId) {
      return false;
    }
    const myPlayer = this.room.state.players.get(this.sessionId);
    if (!myPlayer) {
      return false;
    }
    const serverZone = myPlayer.currentZone;
    const clientZone = this.mapSceneToZone(currentScene);
    if (serverZone !== clientZone) {
      this.requestCurrentZone(currentScene);
      return false;
    }
    return true;
  }

  mapSceneToZone(sceneName) {
    return sceneToZone(sceneName);
  }

  mapZoneToScene(zoneName) {
    return zoneToScene(zoneName);
  }

  async forceZoneSynchronization(currentScene) {
    if (!this.room) {
      return false;
    }
    try {
      this.requestCurrentZone(currentScene);
      return true;
    } catch (error) {
      return false;
    }
  }

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
  }

  getBattleNetworkHandler() {
    return this.battleNetworkHandler;
  }

  getInteractionHandler() {
    return this.interactionHandler;
  }
  
  forceReconnection() {
    this.connectionManager.forceReconnection();
  }
  
  getConnectionStats() {
    return this.connectionManager.getConnectionStats();
  }
  
  testConnection() {
    return this.connectionManager.testConnection();
  }
  
  debugState() {
    const connectionStats = this.getConnectionStats();
    
    const debugInfo = {
      username: this.username,
      sessionId: this.sessionId,
      isConnected: this.isConnected,
      isTransitioning: this.isTransitioning,
      currentZone: this.currentZone,
      roomId: this.room?.id,
      roomConnected: this.room?.connection?.isOpen,
      playersInRoom: this.room?.state?.players?.size,
      myPlayerConfirmed: this.myPlayerConfirmed,
      myPlayerData: this.myPlayerData,
      connectionStats: connectionStats,
      interactionHandler: !!this.interactionHandler,
      interactionHandlerReady: this.interactionHandler?.isInitialized,
      // ✅ NOUVEAU : Stats des quêtes
      questSystem: this.interactionHandler ? {
        npcsWithQuests: this.interactionHandler.npcQuestData?.size || 0,
        handlersSetup: this.interactionHandler.handlersSetup
      } : null
    };
    
    console.table(debugInfo);
    return debugInfo;
  }

  getNetworkStats() {
    const connectionStats = this.getConnectionStats();
    return {
      ...connectionStats,
      interactionsCount: this.interactionHistory.length,
      roomId: this.room?.id,
      playersInRoom: this.room?.state?.players?.size || 0,
      myPlayerConfirmed: this.myPlayerConfirmed,
      currentZone: this.currentZone,
      isTransitioning: this.isTransitioning
    };
  }
}

// Fonctions debug globales
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
    return false;
  }
};

window.forceReconnection = function() {
  if (window.globalNetworkManager?.connectionManager) {
    window.globalNetworkManager.connectionManager.forceReconnection();
    return true;
  } else {
    return false;
  }
};

window.getConnectionStats = function() {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.getNetworkStats();
  } else {
    return null;
  }
};

// ✅ NOUVEAU : Fonctions quest globales optimisées
window.requestQuestDetails = function(npcId, questId) {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.requestQuestDetails(npcId, questId);
  }
  return false;
};

window.getNpcQuests = function(npcId) {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.getNpcQuestData(npcId);
  }
  return { availableQuestIds: [], inProgressQuestIds: [], readyToCompleteQuestIds: [] };
};

window.testQuestDetails = function(npcId = 2, questId = 'lost_gloves') {
  return window.requestQuestDetails(npcId, questId);
};

console.log('✅ NetworkManager OPTIMISÉ chargé avec système quest intégré !');
console.log('🎯 Utilisez window.testQuestDetails(npcId, questId) pour tester');
