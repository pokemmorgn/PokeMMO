// client/src/network/NetworkManager.js - VERSION NETTOYÉE (ARCHITECTURE CLARIFIÉE)
// ✅ Responsabilités clarifiées : CONNEXION uniquement
// ✅ Interactions déléguées au NetworkInteractionHandler

import { GAME_CONFIG } from "../config/gameConfig.js";
import { BattleNetworkHandler } from "./BattleNetworkHandler.js";
import { sceneToZone, zoneToScene } from "../config/ZoneMapping.js";
import { ConnectionManager } from "../managers/ConnectionManager.js";
import { NetworkInteractionHandler } from "./NetworkInteractionHandler.js";

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

    // ✅ Handler de combat spécialisé
    this.battleNetworkHandler = null;
    // ✅ Handler d'interactions spécialisé (responsable de TOUTES les interactions)
    this.interactionHandler = null;
    // ✅ Données de mon joueur
    this.myPlayerData = null;
    this.myPlayerConfirmed = false;

    // ✅ Stockage des NPCs pour replay
    this.lastReceivedNpcs = null;

    // ✅ Historique pour debug uniquement
    this.interactionHistory = [];
    
    // ✅ INTÉGRATION CONNECTIONMANAGER - Gestion connexion/reconnexion
    this.connectionManager = new ConnectionManager(this);
    
    // ✅ ANCIEN connectionHealth maintenu pour compatibilité (délègue au ConnectionManager)
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
      // ✅ CALLBACKS POUR PREMIER JOUEUR
      onMyPlayerConfirmed: null,
      onMyPlayerMissing: null,
    };

    // ✅ CONFIGURATION CALLBACKS CONNECTIONMANAGER
    this.setupConnectionManagerCallbacks();
    
    console.log('🔧 [NetworkManager] Initialisé - Architecture clarifiée (Connexion uniquement)');
  }

  // ✅ CONFIGURATION DES CALLBACKS CONNECTIONMANAGER
  setupConnectionManagerCallbacks() {
    this.connectionManager.onReconnecting((attempt, maxAttempts) => {
      console.log(`🔄 [NetworkManager] Reconnexion ${attempt}/${maxAttempts}`);
      if (window.showGameNotification) {
        window.showGameNotification(
          `Reconnexion automatique... (${attempt}/${maxAttempts})`,
          'warning',
          { duration: 3000, position: 'top-center' }
        );
      }
    });

    this.connectionManager.onReconnected((stats) => {
      console.log('🎉 [NetworkManager] Reconnexion réussie:', stats);
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
      console.warn('🚨 [NetworkManager] Connexion perdue:', stats);
      this.isConnected = false;
      if (!this.transitionState.isActive && this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });

    this.connectionManager.onMaxReconnectReached((attempts) => {
     console.error('💀 [NetworkManager] Reconnexion impossible après', attempts, 'tentatives');
     
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
     console.error('🚨 [NetworkManager] Server restart detected:', data);
     if (window.showGameNotification) {
       window.showGameNotification('Server restarting...', 'warning', { duration: 5000 });
     }
    });

    this.connectionManager.onAuthFailure((errorCode, message) => {
     console.error(`🔐 [NetworkManager] Auth error: ${errorCode} - ${message}`);
     if (window.showGameNotification) {
       window.showGameNotification('Authentication expired...', 'error', { duration: 3000 });
     }
    });

    this.connectionManager.onForceLogout((data) => {
     console.error('🚪 [NetworkManager] Forced logout:', data);
    });
  }

  async connect(spawnZone = "beach", spawnData = {}, sceneInstance = null) {
    try {
      console.log(`[NetworkManager] 🔌 Connexion à WorldRoom...`);
      console.log(`[NetworkManager] 🌍 Zone de spawn: ${spawnZone}`);

      if (this.room) {
        await this.disconnect();
      }

      // ✅ RÉCUPÉRER LE TOKEN DE SESSION
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

      console.log(`[NetworkManager] 📝 Options de connexion:`, {
        ...roomOptions,
        sessionToken: roomOptions.sessionToken ? '***TOKEN***' : 'MISSING'
      });

      this.room = await this.client.joinOrCreate("world", roomOptions);

      this.sessionId = this.room.sessionId;
      this.isConnected = true;
      this.currentZone = spawnZone;
      this.myPlayerConfirmed = false;
      this.myPlayerData = null;

      this.resetTransitionState();

      console.log(`[NetworkManager] ✅ Connecté à WorldRoom! SessionId: ${this.sessionId}`);

      // PATCH DE SYNCHRONISATION
      if (sceneInstance && typeof sceneInstance.setRoom === 'function') {
        console.log('[NetworkManager] 🟢 Patch: Appel de setRoom() sur la scène', sceneInstance.constructor.name);
        sceneInstance.setRoom(this.room);
      }

      this.setupRoomListeners();
      this.connectionManager.startMonitoring();
      
      await this.initializeBattleSystem();
      await this.initializeInteractionHandler();
      return true;

    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  getUserSession() {
    const token = sessionStorage.getItem('sessionToken');
    
    if (!token) {
      console.warn('[NetworkManager] ❌ Aucun token JWT trouvé');
      return null;
    }

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.warn('[NetworkManager] ❌ Token JWT expiré');
        sessionStorage.removeItem('sessionToken');
        return null;
      }

      console.log('[NetworkManager] ✅ JWT valide pour:', decoded.username);
      
      return {
        username: decoded.username,
        sessionToken: token,
        userId: decoded.userId,
        isDev: decoded.isDev || false,
        permissions: decoded.permissions || ['play']
      };
      
    } catch (error) {
      console.error('[NetworkManager] ❌ Erreur JWT:', error);
      sessionStorage.removeItem('sessionToken');
      return null;
    }
  }

  async initializeBattleSystem() {
    console.log('⚔️ [NetworkManager] Initialisation système de combat...');
    
    if (!this.room || !this.client) {
      console.error('❌ [NetworkManager] Room ou Client manquant pour combat');
      return false;
    }
    
    try {
      this.battleNetworkHandler = new BattleNetworkHandler(this);
      const success = this.battleNetworkHandler.initialize(this.room, this.client);
      
      if (success) {
        console.log('✅ [NetworkManager] Système de combat initialisé');
        return true;
      } else {
        console.error('❌ [NetworkManager] Échec initialisation système de combat');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [NetworkManager] Erreur initialisation combat:', error);
      return false;
    }
  }

  async initializeInteractionHandler() {
    console.log('🎭 [NetworkManager] Initialisation système d\'interactions...');
    
    if (!this.room || !this.sessionId) {
      console.error('❌ [NetworkManager] Room ou SessionId manquant pour interactions');
      return false;
    }
    
    try {
      // ✅ NetworkInteractionHandler = RESPONSABLE DE TOUTES LES INTERACTIONS
      this.interactionHandler = new NetworkInteractionHandler(this);
      const success = this.interactionHandler.initialize();
      
      if (success) {
        // ✅ Connecter NetworkManager → NetworkInteractionHandler
        this.onNpcInteraction((result) => {
          console.log('🔗 [NetworkManager] Routage vers NetworkInteractionHandler:', result);
          if (this.interactionHandler?.callbacks?.onNpcInteraction) {
            this.interactionHandler.callbacks.onNpcInteraction(result);
          }
        });
        
        console.log('✅ [NetworkManager] Système d\'interactions initialisé');
        return true;
      } else {
        console.error('❌ [NetworkManager] Échec initialisation système d\'interactions');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [NetworkManager] Erreur initialisation interactions:', error);
      return false;
    }
  }
      
  setupRoomListeners() {
    if (!this.room) return;

    console.log(`[NetworkManager] 👂 Setup des listeners WorldRoom...`);

    // ✅ Handler pour confirmation de spawn
// ✅ Handler pour confirmation de spawn AVEC REDIRECTION AUTO
this.room.onMessage("playerSpawned", (data) => {
  console.log(`🎯 [NetworkManager] === JOUEUR SPAWNÉ ===`, data);
  
  if (data.isMyPlayer) {
    console.log(`✅ [NetworkManager] Confirmation: MON joueur spawné !`);
    console.log(`📍 Position serveur: (${data.x}, ${data.y}) dans ${data.currentZone}`);
    
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
    
    // ✅ NOUVEAU: VÉRIFICATION ZONE ET REDIRECTION AUTO
    const currentScene = this.room.scene?.scene?.key; // Scène actuelle du client
    const expectedScene = this.mapZoneToScene(data.currentZone); // Scène que dit le serveur
    
    console.log(`🔍 [NetworkManager] Vérification zone:`);
    console.log(`  Client dans: ${currentScene}`);
    console.log(`  Serveur dit: ${data.currentZone} → ${expectedScene}`);
    
    if (currentScene !== expectedScene) {
      console.warn(`🚨 [NetworkManager] DÉSYNC DÉTECTÉE ! CLIENT OBÉIT AU SERVEUR`);
      console.warn(`  Redirection: ${currentScene} → ${expectedScene}`);
      
      // ✅ REDIRECTION IMMÉDIATE VERS LA BONNE SCÈNE
      setTimeout(() => {
        if (this.room.scene?.scene?.scene) {
          console.log(`🔄 [NetworkManager] Lancement redirection vers ${expectedScene}`);
          
          this.room.scene.scene.scene.start(expectedScene, {
            fromServerCorrection: true,
            networkManager: this,
            mySessionId: this.sessionId,
            spawnX: data.x,           // ✅ POSITION SERVEUR
            spawnY: data.y,           // ✅ POSITION SERVEUR  
            serverForced: true,
            preservePlayer: true
          });
        }
      }, 100); // Délai minimal pour éviter les conflits
      
      return; // ✅ SORTIR - Ne pas continuer le traitement normal
    }
    
    console.log(`✅ [NetworkManager] Zone correcte, pas de redirection nécessaire`);
    
    if (this.callbacks.onMyPlayerConfirmed) {
      this.callbacks.onMyPlayerConfirmed(this.myPlayerData);
    }
    
    setTimeout(() => {
      this.ensureMyPlayerExists();
    }, 1000);
  }
});

    // ✅ Handler pour blocages de mouvement
    this.room.onMessage("movementBlocked", (data) => {
      console.log('🚫 [NetworkManager] Mouvement bloqué:', data);
    });

    this.room.onMessage("movementUnblocked", (data) => {
      console.log('🔓 [NetworkManager] Mouvement débloqué:', data);
    });

    // ✅ Handler pour pong - délègue au ConnectionManager
    this.room.onMessage("pong", (data) => {
      console.log(`🏓 [NetworkManager] Pong reçu, délégation au ConnectionManager`);
      this.connectionManager.handlePongFromServer(data);
    });

    // ✅ Handler pour erreurs - délègue au ConnectionManager  
    this.room.onError((error) => {
      console.error(`🚨 [NetworkManager] Erreur room, délégation au ConnectionManager`);
      this.connectionManager.handleErrorFromServer(error);
    });

    // ✅ Handler pour déconnexions - délègue au ConnectionManager
    this.room.onLeave((code) => {
      console.warn(`📤 [NetworkManager] Déconnexion room, délégation au ConnectionManager`);
      this.connectionManager.handleLeaveFromServer(code);
    });
      
    // ✅ Handler pour state forcé
    this.room.onMessage("forcedStateSync", (data) => {
      console.log(`🔄 [NetworkManager] === STATE FORCÉ REÇU ===`, data);
      
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

    // ✅ Handler pour réponse de state
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
        
        if (this.callbacks.onMyPlayerMissing) {
          this.callbacks.onMyPlayerMissing(data);
        }
      }
    });

    // ✅ Handler pour vérification de présence
    this.room.onMessage("presenceCheck", (data) => {
      console.log(`👻 [NetworkManager] === VÉRIFICATION PRÉSENCE ===`, data);
      
      if (!data.exists) {
        console.error(`❌ [NetworkManager] JE NE SUIS PAS DANS LE STATE !`);
        this.myPlayerConfirmed = false;
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

    // ✅ onStateChange.once pour état initial
    this.room.onStateChange.once((state) => {
      console.log(`🎯 [NetworkManager] === ÉTAT INITIAL REÇU ===`, {
        playersCount: state.players?.size || 0,
        mySessionId: this.sessionId,
        hasMyPlayer: state.players?.has && state.players.has(this.sessionId)
      });
      
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
        
        setTimeout(() => {
          this.ensureMyPlayerExists();
        }, 500);
      }
      
      if (this.callbacks.onStateChange && state.players?.size > 0) {
        this.callbacks.onStateChange(state);
      }
    });

    // ✅ onJoin avec vérification
    this.room.onJoin(() => {
      console.log(`📡 [NetworkManager] === REJOINT LA ROOM ===`);
      
      setTimeout(() => {
        if (!this.myPlayerConfirmed) {
          console.log(`🔍 [NetworkManager] Vérification présence après join`);
          this.checkMyPresence();
        }
      }, 1000);
      
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

    // ✅ HANDLER NPCs AVEC REPLAY
this.room.onMessage("npcList", (npcs) => {
  console.log(`🤖 [NetworkManager] === MESSAGE NPCLIST INTERCEPTÉ (DEBUG COMPLET) ===`);
  console.log(`⏰ Timestamp réception: ${new Date().toISOString()}`);
  console.log(`📊 NPCs reçus: ${npcs ? npcs.length : 'NULL/UNDEFINED'}`);
  console.log(`🎯 Callback configuré: ${!!this.callbacks.onNpcList}`);
  console.log(`🏠 Room ID: ${this.room?.id || 'UNKNOWN'}`);
  console.log(`🔑 Session ID: ${this.sessionId}`);
  
  // ✅ VALIDATION DES DONNÉES
  if (!npcs) {
    console.error(`❌ [NetworkManager] NPCs NULL ou UNDEFINED reçus !`);
    return;
  }
  
  if (!Array.isArray(npcs)) {
    console.error(`❌ [NetworkManager] NPCs n'est pas un tableau:`, typeof npcs);
    console.error(`❌ [NetworkManager] Contenu NPCs:`, npcs);
    return;
  }
  
  if (npcs.length === 0) {
    console.warn(`⚠️ [NetworkManager] Tableau NPCs vide reçu`);
  }
  
  // ✅ DEBUG DÉTAILLÉ DES NPCS REÇUS
  console.log(`🤖 [NetworkManager] === DÉTAIL DES ${npcs.length} NPCs REÇUS ===`);
  npcs.forEach((npc, index) => {
    console.log(`  ${index + 1}. ID:${npc?.id} "${npc?.name}" à (${npc?.x}, ${npc?.y}) zone:"${npc?.zone}" sprite:"${npc?.sprite}"`);
    
    // Validation structure NPC
    const requiredFields = ['id', 'name', 'x', 'y', 'zone'];
    const missingFields = requiredFields.filter(field => npc[field] === undefined || npc[field] === null);
    
    if (missingFields.length > 0) {
      console.error(`❌ [NetworkManager] NPC ${index + 1} incomplet, champs manquants:`, missingFields);
      console.error(`❌ [NetworkManager] NPC ${index + 1} data:`, npc);
    }
  });
  
  // ✅ STOCKAGE POUR REPLAY
  console.log(`💾 [NetworkManager] Stockage NPCs pour replay...`);
  this.lastReceivedNpcs = npcs;
  console.log(`✅ [NetworkManager] ${npcs.length} NPCs stockés pour replay`);
  
  // ✅ ENVOI IMMÉDIAT AU CALLBACK
  if (this.callbacks.onNpcList) {
    console.log(`📤 [NetworkManager] === ENVOI IMMÉDIAT AU CALLBACK ===`);
    console.log(`📤 [NetworkManager] Callback disponible: OUI`);
    console.log(`📤 [NetworkManager] NPCs à envoyer: ${npcs.length}`);
    
    try {
      console.log(`🔄 [NetworkManager] Appel du callback onNpcList...`);
      this.callbacks.onNpcList(npcs);
      console.log(`✅ [NetworkManager] Callback onNpcList appelé avec succès !`);
    } catch (callbackError) {
      console.error(`❌ [NetworkManager] Erreur dans le callback onNpcList:`, callbackError);
      console.error(`❌ [NetworkManager] Stack trace:`, callbackError.stack);
    }
  } else {
    console.log(`⏳ [NetworkManager] === CALLBACK PAS ENCORE CONFIGURÉ ===`);
    console.log(`⏳ [NetworkManager] NPCs stockés en attente du callback`);
    console.log(`⏳ [NetworkManager] Les NPCs seront envoyés dès que le callback sera configuré`);
  }
  
  console.log(`🎉 [NetworkManager] === TRAITEMENT NPCLIST TERMINÉ ===`);
});

    this.room.onMessage("transitionResult", (result) => {
      console.log(`🔍 [NetworkManager] Résultat de validation de transition:`, result);

      if (result.success && result.currentZone) {
        console.log(`🔄 [NetworkManager] Sync zone: ${this.currentZone} → ${result.currentZone}`);
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

    // ✅ HANDLERS D'INTERACTION NPC - SUPPORT DOUBLE FORMAT
    this.room.onMessage("npcInteractionResult", (result) => {
      console.log('💬 [NetworkManager] === NPC INTERACTION RESULT ===', result);
      console.log('💬 [NetworkManager] === DEBUG COMPLET ===', JSON.stringify(result, null, 2));
      console.log('💬 [NetworkManager] === CLÉS DISPONIBLES ===', Object.keys(result));
      console.log('💬 [NetworkManager] === CHAMPS CRITIQUES ===', {
        type: result.type,
        npcId: result.npcId,
        npcName: result.npcName,
        isUnifiedInterface: result.isUnifiedInterface,
        capabilities: result.capabilities,
        contextualData: result.contextualData
      });
      
      this.logInteraction('npc_interaction_result', result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // ✅ Support messages d'interaction étendus
    this.room.onMessage("interactionResult", (result) => {
      console.log(`🎭 [NetworkManager] === INTERACTION RESULT ÉTENDU ===`, result);
      this.logInteraction('interaction_result_extended', result);
      
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    // ✅ Gestion des erreurs d'interaction
    this.room.onMessage("interactionError", (error) => {
      console.error(`❌ [NetworkManager] Erreur interaction:`, error);
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
      console.log(`📊 [NetworkManager] State filtré reçu:`, {
        playersCount: Object.keys(state.players || {}).length,
        zone: this.currentZone
      });
      
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

    // ✅ HANDLERS POUR SHOP ET INVENTAIRE
    this.room.onMessage("shopCatalogResult", (data) => {
      console.log(`🏪 [NetworkManager] Catalogue shop reçu:`, data);
    });

    this.room.onMessage("shopTransactionResult", (data) => {
      console.log(`💰 [NetworkManager] Transaction shop:`, data);
    });

    this.room.onMessage("inventoryUpdate", (data) => {
      console.log(`🎒 [NetworkManager] Update inventaire:`, data);
    });

    this.room.onMessage("zoneObjects", (data) => {
      console.log(`📦 [NetworkManager] Objets de zone reçus:`, data);
      if (this.callbacks.onZoneObjects) {
        this.callbacks.onZoneObjects(data);
      }
    });
    
    this.room.onMessage("goldUpdate", (data) => {
      console.log(`💰 [NetworkManager] Update or:`, data);
    });

    this.room.onLeave(() => {
      console.log(`[NetworkManager] 📤 Déconnexion de WorldRoom`);
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
      console.log(`[NetworkManager] 🎯 Connexion établie`);
      this.callbacks.onConnect();
    }
  }

  // ✅ Log des interactions pour debug uniquement
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

  // === MÉTHODES POUR PREMIER JOUEUR ===

  ensureMyPlayerExists() {
    console.log(`🔍 [NetworkManager] === VÉRIFICATION MON JOUEUR ===`);
    console.log(`📊 State: confirmed=${this.myPlayerConfirmed}, data=${!!this.myPlayerData}`);
    
    if (!this.room || !this.sessionId) {
      console.error(`❌ [NetworkManager] Pas de room/sessionId pour vérifier`);
      return;
    }
    
    const hasInState = this.room.state?.players?.has && this.room.state.players.has(this.sessionId);
    
    if (!hasInState || !this.myPlayerConfirmed) {
      console.warn(`⚠️ [NetworkManager] Mon joueur absent ou non confirmé !`);
      console.warn(`   Dans state: ${hasInState}`);
      console.warn(`   Confirmé: ${this.myPlayerConfirmed}`);
      
      this.requestPlayerState();
      
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

  // ✅ GETTERS POUR VÉRIFIER L'ÉTAT
  isMyPlayerReady() {
    return this.myPlayerConfirmed && this.myPlayerData !== null;
  }

  getMyPlayerData() {
    return this.myPlayerData;
  }

  // === MÉTHODES D'INTERACTION - DÉLÉGATION VERS INTERACTIONHANDLER ===

  // ✅ DÉLÉGATION - Les interactions sont gérées par NetworkInteractionHandler
  sendNpcInteract(npcId, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendNpcInteract(npcId, additionalData);
    } else {
      console.warn('[NetworkManager] ⚠️ InteractionHandler non disponible');
      return false;
    }
  }

  // ✅ DÉLÉGATION - Méthodes d'interaction objets gérées par InteractionHandler
  sendObjectInteract(objectId, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendObjectInteract(objectId, additionalData);
    } else {
      console.warn('[NetworkManager] ⚠️ InteractionHandler non disponible pour objets');
      return false;
    }
  }
  
  sendSearchHiddenItem(position, searchRadius = 32, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendSearchHiddenItem(position, searchRadius, additionalData);
    } else {
      console.warn('[NetworkManager] ⚠️ InteractionHandler non disponible pour fouille');
      return false;
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
  
  // ✅ MÉTHODE AVEC REPLAY AUTOMATIQUE
  onNpcList(callback) { 
    console.log(`🔧 [NetworkManager] Configuration callback onNpcList`);
    console.log(`⏰ Timestamp configuration: ${Date.now()}`);
    console.log(`📊 NPCs en attente: ${this.lastReceivedNpcs?.length || 0}`);
    
    this.callbacks.onNpcList = callback; 
    
    if (this.lastReceivedNpcs && this.lastReceivedNpcs.length > 0) {
      console.log(`🔄 [NetworkManager] REPLAY automatique de ${this.lastReceivedNpcs.length} NPCs`);
      
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
    console.log(`[NetworkManager] 📤 Déconnexion demandée`);
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
    return sceneToZone(sceneName);
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

  // ✅ Restaurer les callbacks après reconnexion
  restoreCustomCallbacks() {
    if (!this.room) return;
    
    console.log('🔄 [NetworkManager] Restauration des callbacks après reconnexion...');
    
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
      
    console.log('✅ [NetworkManager] Callbacks restaurés');
  }

  getBattleNetworkHandler() {
    return this.battleNetworkHandler;
  }

  // === ACCÈS AU SYSTÈME D'INTERACTIONS ===

  getInteractionHandler() {
    return this.interactionHandler;
  }
  
  // ✅ MÉTHODES GESTION CONNECTIONMANAGER
  
  forceReconnection() {
    console.log('🔧 [NetworkManager] Reconnexion forcée demandée');
    this.connectionManager.forceReconnection();
  }
  
  getConnectionStats() {
    return this.connectionManager.getConnectionStats();
  }
  
  testConnection() {
    return this.connectionManager.testConnection();
  }
  
  // === DEBUG ET MONITORING ===
  
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
    
    console.log(`👤 === MON JOUEUR ===`);
    console.log(`✅ Confirmé: ${this.myPlayerConfirmed}`);
    console.log(`📊 Data:`, this.myPlayerData);
    
    console.log(`🔌 === CONNECTION MANAGER ===`);
    const connectionStats = this.getConnectionStats();
    console.log(`📡 Stats connexion:`, connectionStats);
    
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

window.debugConnectionManager = function() {
  if (window.globalNetworkManager?.connectionManager) {
    const stats = window.globalNetworkManager.connectionManager.getConnectionStats();
    console.log('🔍 [ConnectionManager] Stats:', stats);
    return stats;
  } else {
    console.error('❌ ConnectionManager non disponible');
    return null;
  }
};

window.forceReconnection = function() {
  if (window.globalNetworkManager?.connectionManager) {
    window.globalNetworkManager.connectionManager.forceReconnection();
    return true;
  } else {
    console.error('❌ ConnectionManager non disponible');
    return false;
  }
};

window.getConnectionStats = function() {
  if (window.globalNetworkManager) {
    return window.globalNetworkManager.getNetworkStats();
  } else {
    console.error('❌ NetworkManager global non disponible');
    return null;
  }
};

window.debugInteractionHandler = function() {
  if (window.globalNetworkManager?.interactionHandler) {
    const info = window.globalNetworkManager.interactionHandler.getDebugInfo();
    return info;
  } else {
    console.error('❌ InteractionHandler non disponible');
    return null;
  }
};

console.log('✅ NetworkManager NETTOYÉ chargé ! Architecture clarifiée : Connexion uniquement');
console.log('🎭 Toutes les interactions sont gérées par NetworkInteractionHandler');
console.log('🔍 Utilisez window.debugNetworkManager() pour diagnostiquer');
console.log('📊 Utilisez window.getConnectionStats() pour les stats complètes');
