// client/src/managers/ConnectionManager.js
// 🔗 GESTIONNAIRE DE CONNEXION - Maintient la connexion pendant les intros longues

export class ConnectionManager {
  constructor(roomOrScene) {
    // Support à la fois room directe ou scene avec room
    if (roomOrScene && roomOrScene.room) {
      this.scene = roomOrScene;
      this.room = roomOrScene.room;
    } else if (roomOrScene && roomOrScene.send) {
      this.room = roomOrScene;
      this.scene = null;
    } else {
      this.scene = roomOrScene;
      this.room = roomOrScene?.room || null;
    }
    
    this.isActive = false;
    this.isPermanent = false; // Mode permanent
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.lastPongReceived = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
    this.listenersSetup = false;
    
    // Configuration
    this.config = {
      pingInterval: 5000,        // Ping toutes les 5 secondes
      pongTimeout: 10000,        // Timeout si pas de pong en 10s
      reconnectDelay: 2000,      // Délai avant reconnexion
      maxReconnectAttempts: 5,   // Max tentatives de reconnexion
      heartbeatInterval: 3000    // Heartbeat pour maintenir l'activité
    };
  }

  // === MAINTENANCE PERMANENTE ===
  
  startPermanentMaintenance() {
    console.log('[ConnectionManager] 🚀 Démarrage maintenance PERMANENTE');
    this.isPermanent = true;
    this.startConnectionMaintenance();
    
    // Surveillance des événements de déconnexion réseau
    window.addEventListener('online', this.handleNetworkOnline.bind(this));
    window.addEventListener('offline', this.handleNetworkOffline.bind(this));
    
    return true;
  }
  
  stopPermanentMaintenance() {
    console.log('[ConnectionManager] 🛑 Arrêt maintenance permanente');
    this.isPermanent = false;
    this.stopConnectionMaintenance();
    
    window.removeEventListener('online', this.handleNetworkOnline.bind(this));
    window.removeEventListener('offline', this.handleNetworkOffline.bind(this));
  }
  
  pauseMaintenance() {
    if (this.isActive) {
      this.stopPingLoop();
      this.stopHeartbeat();
      console.log('[ConnectionManager] ⏸️ Maintenance en pause (connexion préservée)');
    }
  }
  
  resumeMaintenance() {
    if (this.isPermanent && !this.pingInterval && !this.heartbeatInterval) {
      this.startPingLoop();
      this.startHeartbeat();
      console.log('[ConnectionManager] ▶️ Maintenance reprise');
    }
  }
  
  handleNetworkOnline() {
    console.log('[ConnectionManager] 🌐 Réseau détecté - vérification connexion...');
    setTimeout(() => {
      if (this.isPermanent) {
        this.checkConnectionHealth();
      }
    }, 2000);
  }
  
  handleNetworkOffline() {
    console.warn('[ConnectionManager] 📶 Réseau perdu - mode dégradé');
    this.consecutiveFailures = Math.min(this.consecutiveFailures + 1, this.maxFailures - 1);
  }

  // === MAINTENANCE DE CONNEXION ===
  
  startConnectionMaintenance() {
    if (this.isActive) {
      console.log('[ConnectionManager] ⚠️ Maintenance déjà active');
      return;
    }

    if (!this.room) {
      console.warn('[ConnectionManager] ❌ Pas de room active');
      return;
    }

    console.log('[ConnectionManager] 🚀 Démarrage maintenance connexion' + (this.isPermanent ? ' (PERMANENTE)' : ''));
    this.isActive = true;
    this.consecutiveFailures = 0;
    this.lastPongReceived = Date.now();
    
    this.startPingLoop();
    this.startHeartbeat();
    
    // En mode permanent, setup les listeners une seule fois
    if (this.isPermanent && !this.listenersSetup) {
      this.setupRoomListeners();
    }
  }

  stopConnectionMaintenance() {
    if (!this.isActive) return;
    
    console.log('[ConnectionManager] 🛑 Arrêt maintenance connexion');
    this.isActive = false;
    
    this.stopPingLoop();
    this.stopHeartbeat();
    this.clearReconnectTimeout();
  }

  setupRoomListeners() {
    if (!this.room || this.listenersSetup) return;
    
    console.log('[ConnectionManager] 🎧 Configuration listeners room');
    
    this.room.onLeave((code) => {
      console.warn('[ConnectionManager] 🔌 Connexion fermée, code:', code);
      this.handleDisconnection(code);
    });

    this.room.onError((code, message) => {
      console.error('[ConnectionManager] ❌ Erreur connexion:', code, message);
      this.handleConnectionError(code, message);
    });

    this.room.onMessage("pong", (data) => {
      this.handlePong(data);
    });
    
    this.listenersSetup = true;
  }

  // === GESTION DES ÉVÉNEMENTS D'INTRO ===
  
  handleIntroStarted(event) {
    console.log('[ConnectionManager] 🎬 Intro démarrée, activation du maintien de connexion');
    if (!this.isPermanent) {
      this.startConnectionMaintenance();
    }
  }

  handleIntroEnded(event) {
    console.log('[ConnectionManager] 🏁 Intro terminée');
    if (!this.isPermanent) {
      this.stopConnectionMaintenance();
    }
  }

  // === PING/PONG SYSTEM ===
  
  startPingLoop() {
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);
  }

  stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  sendPing() {
    if (!this.room || !this.isActive) return;

    try {
      const pingData = {
        timestamp: Date.now(),
        clientId: this.room.sessionId,
        type: this.isPermanent ? 'permanent_check' : 'connection_check'
      };

      console.log('[ConnectionManager] 📡 Ping envoyé:', pingData.timestamp);
      this.room.send("ping", pingData);
      
      // Programmer un timeout pour vérifier le pong
      setTimeout(() => {
        this.checkPongTimeout(pingData.timestamp);
      }, this.config.pongTimeout);

    } catch (error) {
      console.error('[ConnectionManager] ❌ Erreur envoi ping:', error);
      this.handlePingFailure();
    }
  }

  handlePong(data) {
    if (!this.isActive) return;

    this.lastPongReceived = Date.now();
    this.consecutiveFailures = 0;
    
    const latency = this.lastPongReceived - data.timestamp;
    console.log('[ConnectionManager] 🏓 Pong reçu, latence:', latency + 'ms');

    // Réinitialiser les flags de synchronisation
    this.updateSyncFlags();
  }

  checkPongTimeout(pingTimestamp) {
    if (!this.isActive) return;

    const timeSinceLastPong = Date.now() - (this.lastPongReceived || 0);
    
    if (timeSinceLastPong > this.config.pongTimeout) {
      console.warn('[ConnectionManager] ⏰ Timeout pong détecté');
      this.handlePingFailure();
    }
  }

  handlePingFailure() {
    this.consecutiveFailures++;
    console.warn(`[ConnectionManager] ❌ Échec ping ${this.consecutiveFailures}/${this.maxFailures}`);

    if (this.consecutiveFailures >= this.maxFailures) {
      console.error('[ConnectionManager] 🚨 Trop d\'échecs, tentative de reconnexion');
      this.attemptReconnection();
    }
  }

  // === HEARTBEAT SYSTEM ===
  
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendHeartbeat() {
    if (!this.room || !this.isActive) return;

    try {
      const heartbeatData = {
        timestamp: Date.now(),
        sessionId: this.room.sessionId,
        sceneKey: this.scene?.scene?.key || 'global',
        playerData: this.getPlayerData(),
        isPermanent: this.isPermanent
      };

      this.room.send("heartbeat", heartbeatData);
      console.log('[ConnectionManager] 💓 Heartbeat envoyé');

    } catch (error) {
      console.warn('[ConnectionManager] ❌ Erreur heartbeat:', error);
    }
  }

  // === RECONNEXION ===
  
  attemptReconnection() {
    if (!this.isActive) return;

    console.log('[ConnectionManager] 🔄 Tentative de reconnexion...');
    
    this.clearReconnectTimeout();
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.performReconnection();
      } catch (error) {
        console.error('[ConnectionManager] ❌ Échec reconnexion:', error);
        this.handleReconnectionFailure();
      }
    }, this.config.reconnectDelay);
  }

  async performReconnection() {
    console.log('[ConnectionManager] 🔄 Reconnexion en cours...');
    
    // Tenter de reconnecter via le NetworkManager global
    if (window.globalNetworkManager && window.globalNetworkManager.reconnect) {
      try {
        const success = await window.globalNetworkManager.reconnect();
        
        if (success) {
          console.log('[ConnectionManager] ✅ Reconnexion réussie');
          this.consecutiveFailures = 0;
          this.lastPongReceived = Date.now();
          
          // Mettre à jour la room si elle a changé
          this.room = window.globalNetworkManager.room || this.room;
          
          // Redémarrer la maintenance si nécessaire
          if (!this.listenersSetup) {
            this.setupRoomListeners();
          }
          
        } else {
          throw new Error('Reconnexion échouée');
        }
        
      } catch (error) {
        console.error('[ConnectionManager] ❌ Erreur pendant reconnexion:', error);
        this.handleReconnectionFailure();
      }
    } else {
      console.warn('[ConnectionManager] ❌ NetworkManager non disponible pour reconnexion');
      this.handleReconnectionFailure();
    }
  }

  handleReconnectionFailure() {
    console.error('[ConnectionManager] 🚨 Échec de reconnexion');
    
    if (this.isPermanent) {
      // En mode permanent, essayer à nouveau après un délai plus long
      setTimeout(() => {
        if (this.consecutiveFailures < this.config.maxReconnectAttempts) {
          this.attemptReconnection();
        } else {
          console.error('[ConnectionManager] 💥 Abandon après trop de tentatives');
          this.stopPermanentMaintenance();
        }
      }, this.config.reconnectDelay * 3);
    } else {
      // Arrêter la maintenance et notifier
      this.stopConnectionMaintenance();
      
      // Déclencher un événement de perte de connexion
      window.dispatchEvent(new CustomEvent('connectionLost', {
        detail: { 
          reason: 'reconnection_failed',
          consecutiveFailures: this.consecutiveFailures 
        }
      }));
    }
  }

  // === SYNCHRONISATION ===
  
  updateSyncFlags() {
    // Mettre à jour les flags de synchronisation
    if (typeof window !== 'undefined') {
      window.connectionStable = true;
      window.lastConnectionCheck = Date.now();
    }
  }

  requestServerSync() {
    if (!this.room) return;

    try {
      console.log('[ConnectionManager] 🔄 Demande synchronisation serveur');
      
      this.room.send("requestSync", {
        timestamp: Date.now(),
        sceneKey: this.scene?.scene?.key || 'global',
        playerPosition: this.getPlayerPosition()
      });

    } catch (error) {
      console.error('[ConnectionManager] ❌ Erreur sync request:', error);
    }
  }

  // === ÉTAT ET DONNÉES ===
  
  saveCurrentState() {
    const state = {
      sceneKey: this.scene?.scene?.key || 'global',
      playerData: this.getPlayerData(),
      timestamp: Date.now()
    };
    
    console.log('[ConnectionManager] 💾 État sauvegardé:', state);
    return state;
  }

  restoreCurrentState(state) {
    if (!state) return;
    
    console.log('[ConnectionManager] 📁 Restauration état:', state);
    
    // Restaurer la position du joueur si nécessaire
    if (state.playerData && state.playerData.position && this.scene) {
      const myPlayer = this.scene.playerManager?.getMyPlayer?.();
      if (myPlayer) {
        myPlayer.x = state.playerData.position.x;
        myPlayer.y = state.playerData.position.y;
      }
    }
  }

  getPlayerData() {
    if (!this.scene) return null;
    
    const myPlayer = this.scene.playerManager?.getMyPlayer?.();
    
    if (!myPlayer) return null;
    
    return {
      sessionId: this.room?.sessionId,
      position: { x: myPlayer.x, y: myPlayer.y },
      name: myPlayer.name,
      sprite: myPlayer.sprite?.texture?.key
    };
  }

  getPlayerPosition() {
    if (!this.scene) return null;
    
    const myPlayer = this.scene.playerManager?.getMyPlayer?.();
    return myPlayer ? { x: myPlayer.x, y: myPlayer.y } : null;
  }

  // === GESTION DES ÉVÉNEMENTS DE CONNEXION ===
  
  handleDisconnection(code) {
    console.warn('[ConnectionManager] 🔌 Déconnexion détectée, code:', code);
    
    if (this.isActive || this.isPermanent) {
      // Tentative de reconnexion automatique
      this.attemptReconnection();
    }
  }

  handleConnectionError(code, message) {
    console.error('[ConnectionManager] ❌ Erreur connexion:', { code, message });
    
    if (this.isActive || this.isPermanent) {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.maxFailures) {
        this.attemptReconnection();
      }
    }
  }

  // === NOUVELLES MÉTHODES POUR MODE PERMANENT ===
  
  checkConnectionHealth() {
    if (!this.room) return false;
    
    const isConnected = this.room.connection?.readyState === 1;
    const timeSinceLastPong = Date.now() - (this.lastPongReceived || 0);
    
    console.log('[ConnectionManager] 🩺 Check santé connexion:', {
      isConnected,
      timeSinceLastPong,
      consecutiveFailures: this.consecutiveFailures
    });
    
    if (!isConnected || timeSinceLastPong > this.config.pongTimeout * 2) {
      console.warn('[ConnectionManager] 🚨 Connexion dégradée détectée');
      this.handlePingFailure();
      return false;
    }
    
    return true;
  }
  
  forceReconnect() {
    console.log('[ConnectionManager] 🔄 Reconnexion forcée...');
    this.consecutiveFailures = this.maxFailures; // Force la reconnexion
    this.attemptReconnection();
    return true;
  }
  
  gracefulShutdown() {
    console.log('[ConnectionManager] 👋 Arrêt propre du ConnectionManager');
    this.stopPermanentMaintenance();
    
    if (this.room) {
      try {
        this.room.send("disconnect", { reason: 'client_shutdown' });
      } catch (error) {
        console.warn('[ConnectionManager] Erreur envoi disconnect:', error);
      }
    }
  }
  
  getDetailedStatus() {
    return {
      ...this.getStatus(),
      isPermanent: this.isPermanent,
      roomId: this.room?.id,
      roomSessionId: this.room?.sessionId,
      roomConnected: this.room?.connection?.readyState === 1,
      listenersSetup: this.listenersSetup || false,
      networkOnline: navigator.onLine,
      lastPingTime: this.lastPingTime || null,
      timeSinceLastPong: this.lastPongReceived ? Date.now() - this.lastPongReceived : null
    };
  }

  // === UTILITAIRES ===
  
  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      consecutiveFailures: this.consecutiveFailures,
      lastPongReceived: this.lastPongReceived,
      hasRoom: !!this.room,
      roomConnected: this.room?.connection?.readyState === 1,
      timeSinceLastPong: this.lastPongReceived ? Date.now() - this.lastPongReceived : null
    };
  }

  // === MÉTHODES PUBLIQUES ===
  
  forceReconnection() {
    console.log('[ConnectionManager] 🔄 Reconnexion forcée demandée');
    this.attemptReconnection();
  }

  forcePing() {
    console.log('[ConnectionManager] 📡 Ping forcé');
    this.sendPing();
  }

  // === ACTIVATION MANUELLE ===
  
  enableDuringIntro() {
    console.log('[ConnectionManager] 🎬 Activation manuelle pour intro');
    this.startConnectionMaintenance();
  }

  disableAfterIntro() {
    console.log('[ConnectionManager] 🏁 Désactivation manuelle après intro');
    if (!this.isPermanent) {
      this.stopConnectionMaintenance();
    }
  }

  // === NETTOYAGE ===
  
  destroy() {
    console.log('[ConnectionManager] 💀 Destruction du ConnectionManager');
    
    this.stopPermanentMaintenance();
    
    // Nettoyer les événements
    window.removeEventListener('online', this.handleNetworkOnline.bind(this));
    window.removeEventListener('offline', this.handleNetworkOffline.bind(this));
    
    this.scene = null;
    this.room = null;
  }
}

// === INTÉGRATION AUTOMATIQUE ===
export const ConnectionUtils = {
  // Créer et attacher un ConnectionManager à une scène
  attachToScene(scene) {
    if (!scene.connectionManager) {
      scene.connectionManager = new ConnectionManager(scene);
      console.log('[ConnectionUtils] ✅ ConnectionManager attaché à la scène');
    }
    return scene.connectionManager;
  },

  // Activer pour une intro spécifique
  enableForIntro(scene) {
    const manager = this.attachToScene(scene);
    manager.enableDuringIntro();
    return manager;
  },

  // Désactiver après intro
  disableAfterIntro(scene) {
    if (scene.connectionManager) {
      scene.connectionManager.disableAfterIntro();
    }
  }
};
