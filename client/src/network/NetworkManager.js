// client/src/network/NetworkManager.js - VERSION AVEC CONNECTIONMANAGER INTÉGRÉ
// ✅ Support reconnexion automatique + monitoring robuste

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

    // ✅ NOUVEAU: Handler de combat spécialisé
    this.battleNetworkHandler = null;
    // ✅ NOUVEAU: Handler d'interactions spécialisé
    this.interactionHandler = null;
    // ✅ NOUVEAU: Données de mon joueur
    this.myPlayerData = null;
    this.myPlayerConfirmed = false;

    // ✅ NOUVEAU: Stockage des NPCs pour replay
    this.lastReceivedNpcs = null;

    // ✅ NOUVEAU: Support interactions modernes
    this.interactionHistory = [];
    
    // ✅ INTÉGRATION CONNECTIONMANAGER - Remplace l'ancien connectionHealth
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
      // ✅ NOUVEAUX CALLBACKS POUR PREMIER JOUEUR
      onMyPlayerConfirmed: null,
      onMyPlayerMissing: null,
    };

    // ✅ CONFIGURATION CALLBACKS CONNECTIONMANAGER
    this.setupConnectionManagerCallbacks();
    
    console.log('🔧 [NetworkManager] Initialisé avec ConnectionManager intégré');
  }

  // ✅ CONFIGURATION DES CALLBACKS CONNECTIONMANAGER
  setupConnectionManagerCallbacks() {
    this.connectionManager.onReconnecting((attempt, maxAttempts) => {
      console.log(`🔄 [NetworkManager] Reconnexion ${attempt}/${maxAttempts}`);
      // Notifier l'UI via le système de notifications global
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
      
      // Restaurer les callbacks personnalisés
      this.restoreCustomCallbacks();
      
      // Re-setup des listeners spécifiques
      this.setupRoomListeners();
      
      // Notifier l'UI
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
      
      // Appeler le callback de déconnexion si pas en transition
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
 
 // Proposer de recharger la page après un délai
 setTimeout(() => {
   if (confirm('Impossible de rétablir la connexion. Recharger la page ?')) {
     window.location.reload();
   }
 }, 5000);
});

// ✅ NOUVEAU: Redémarrage serveur détecté
this.connectionManager.onServerRestartDetected((data) => {
 console.error('🚨 [NetworkManager] Server restart detected:', data);
 if (window.showGameNotification) {
   window.showGameNotification('Server restarting...', 'warning', { duration: 5000 });
 }
});

// ✅ NOUVEAU: Erreur d'authentification
this.connectionManager.onAuthFailure((errorCode, message) => {
 console.error(`🔐 [NetworkManager] Auth error: ${errorCode} - ${message}`);
 if (window.showGameNotification) {
   window.showGameNotification('Authentication expired...', 'error', { duration: 3000 });
 }
});

// ✅ NOUVEAU: Déconnexion forcée (popup automatique)
this.connectionManager.onForceLogout((data) => {
 console.error('🚪 [NetworkManager] Forced logout:', data);
 // Le ConnectionManager s'occupe automatiquement de la popup et redirect
});

} // ← Fermeture de setupConnectionManagerCallbacks()

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
        // ✅ AJOUTER LE TOKEN JWT
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
      
      // ✅ DÉMARRER LE CONNECTIONMANAGER AU LIEU DE L'ANCIEN HEALTH MONITORING
      this.connectionManager.startMonitoring();
      
      await this.initializeBattleSystem();
      await this.initializeInteractionHandler();
      return true;

    } catch (error) {
      console.error("❌ Connection error:", error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE pour récupérer la session utilisateur
 getUserSession() {
const token = sessionStorage.getItem('sessionToken');
  
  if (!token) {
    console.warn('[NetworkManager] ❌ Aucun token JWT trouvé');
    return null;
  }

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    
    // Vérifier expiration
if (decoded.exp && Date.now() >= decoded.exp * 1000) {
  console.warn('[NetworkManager] ❌ Token JWT expiré');
  sessionStorage.removeItem('sessionToken'); // ✅ COHÉRENT
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
  // ✅ SUPPRIMÉ: L'ancien startHealthMonitoring() - Remplacé par ConnectionManager
  
  // ✅ SUPPRIMÉ: L'ancien sendPing() - Géré par ConnectionManager

  async initializeBattleSystem() {
    console.log('⚔️ [NetworkManager] Initialisation système de combat...');
    
    if (!this.room || !this.client) {
      console.error('❌ [NetworkManager] Room ou Client manquant pour combat');
      return false;
    }
    
    try {
      // Créer le BattleNetworkHandler
      this.battleNetworkHandler = new BattleNetworkHandler(this);
      
      // L'initialiser avec les connexions existantes
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
    // Créer le NetworkInteractionHandler
    this.interactionHandler = new NetworkInteractionHandler(this);
    
    // L'initialiser avec la room actuelle
    const success = this.interactionHandler.initialize();
    
    if (success) {
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

    // ✅ PAS DE HANDLER PONG ICI - C'est le ConnectionManager qui s'en charge
    // Le ConnectionManager configurera automatiquement son propre handler pong

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

    // ✅ NOUVEAU: Handler spécialisé pour les blocages
    this.room.onMessage("movementBlocked", (data) => {
      console.log('🚫 [NetworkManager] Mouvement bloqué:', data);
      // Le MovementBlockHandler gérera automatiquement via ses listeners
    });

    // Dans setupRoomListeners(), après les autres handlers :

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
    this.room.onMessage("movementUnblocked", (data) => {
      console.log('🔓 [NetworkManager] Mouvement débloqué:', data);
      // Le MovementBlockHandler gérera automatiquement via ses listeners
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

    this.room.onMessage("forcePlayerPosition", (data) => {
      //console.warn("⛔️ [NetworkManager] Position forcée par le serveur (rollback collision):", data);
      // Ici tu fais le rollback de la position sur le client :
      if (window.playerManager && typeof window.playerManager.forcePosition === "function") {
        window.playerManager.forcePosition(data.x, data.y, data.direction, data.currentZone);
      } else {
        // Fallback : applique la position si tu stockes localement les coordonnées
        if (this.myPlayerData) {
          this.myPlayerData.x = data.x;
          this.myPlayerData.y = data.y;
          this.myPlayerData.direction = data.direction;
          this.myPlayerData.currentZone = data.currentZone;
        }
        // Tu peux aussi forcer le redraw ici selon ta structure
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

    // ✅ MODIFIÉ: onLeave délègue au ConnectionManager
    this.room.onLeave(() => {
      console.log(`[NetworkManager] 📤 Déconnexion de WorldRoom`);
      if (!this.transitionState.isActive) {
        this.isConnected = false;
        this.myPlayerConfirmed = false;
        this.myPlayerData = null;
        
        // Le ConnectionManager gère automatiquement la reconnexion
        // Ne pas appeler onDisconnect ici - le ConnectionManager s'en charge
      }
    });

    // ✅ MODIFIÉ: onError délègue au ConnectionManager  
    this.room.onError((error) => {
      console.error(`❌ [NetworkManager] Erreur room:`, error);
      // Le ConnectionManager détectera automatiquement l'erreur et gèrera la reconnexion
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
    
    // ✅ ARRÊTER LE CONNECTIONMANAGER
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

  // ✅ MODIFIÉ: Restaurer les callbacks après reconnexion
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

  // === MÉTHODES D'INTERACTION PUBLIQUES ===

  getInteractionHandler() {
    return this.interactionHandler;
  }
  
  // ✅ Méthodes de convenance pour interactions objets
  sendObjectInteract(objectId, objectType = null, position = null, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendObjectInteract(objectId, objectType, position, additionalData);
    } else {
      console.warn('[NetworkManager] ⚠️ InteractionHandler non disponible');
      return false;
    }
  }
  
  sendSearchHiddenItem(position, searchRadius = 32, additionalData = {}) {
    if (this.interactionHandler) {
      return this.interactionHandler.sendSearchHiddenItem(position, searchRadius, additionalData);
    } else {
      console.warn('[NetworkManager] ⚠️ InteractionHandler non disponible');
      return false;
    }
  }
  // ✅ NOUVEAU: Méthodes de gestion du ConnectionManager
  
  // Forcer une reconnexion manuelle
  forceReconnection() {
    console.log('🔧 [NetworkManager] Reconnexion forcée demandée');
    this.connectionManager.forceReconnection();
  }
  
  // Obtenir les stats de connexion
  getConnectionStats() {
    return this.connectionManager.getConnectionStats();
  }
  
  // Tester la connexion
  testConnection() {
    return this.connectionManager.testConnection();
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
    
    // ✅ NOUVEAU: Debug ConnectionManager
    console.log(`🔌 === CONNECTION MANAGER ===`);
    const connectionStats = this.getConnectionStats();
    console.log(`📡 Stats connexion:`, connectionStats);
    
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

  // ✅ NOUVEAU: Statistiques réseau (délègue au ConnectionManager)
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

// ✅ Fonctions de debug globales mises à jour
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

// ✅ NOUVELLES FONCTIONS DE DEBUG CONNECTIONMANAGER
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
    console.log('🎭 [InteractionHandler] Debug info:', info);
    return info;
  } else {
    console.error('❌ InteractionHandler non disponible');
    return null;
  }
};
console.log('✅ NetworkManager avec ConnectionManager intégré chargé!');
console.log('🔍 Utilisez window.debugNetworkManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testNetworkConnection() pour test connexion');
console.log('🔄 Utilisez window.forceReconnection() pour forcer une reconnexion');
console.log('📊 Utilisez window.getConnectionStats() pour les stats complètes');
console.log('🎭 Utilisez window.debugInteractionHandler() pour debug interactions');
