// client/src/managers/ConnectionManager.js
// 🔗 GESTIONNAIRE DE CONNEXION - Maintient la connexion pendant les intros longues

export class ConnectionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.lastPongReceived = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
    
    // Configuration
    this.config = {
      pingInterval: 5000,        // Ping toutes les 5 secondes
      pongTimeout: 10000,        // Timeout si pas de pong en 10s
      reconnectDelay: 2000,      // Délai avant reconnexion
      maxReconnectAttempts: 5,   // Max tentatives de reconnexion
      heartbeatInterval: 3000    // Heartbeat pour maintenir l'activité
    };
    
    this.setupEventListeners();
  }

  // === SETUP ===
  
  setupEventListeners() {
    // Écouter les événements de connexion Colyseus
    if (this.scene.room) {
      this.scene.room.onLeave((code) => {
        console.warn('[ConnectionManager] 🔌 Connexion fermée, code:', code);
        this.handleDisconnection(code);
      });

      this.scene.room.onError((code, message) => {
        console.error('[ConnectionManager] ❌ Erreur connexion:', code, message);
        this.handleConnectionError(code, message);
      });

      // Écouter les pongs du serveur
      this.scene.room.onMessage("pong", (data) => {
        this.handlePong(data);
      });
    }

    // Écouter les événements d'intro
    window.addEventListener('introStarted', this.handleIntroStarted.bind(this));
    window.addEventListener('introEnded', this.handleIntroEnded.bind(this));
  }

  // === GESTION DES ÉVÉNEMENTS D'INTRO ===
  
  handleIntroStarted(event) {
    console.log('[ConnectionManager] 🎬 Intro démarrée, activation du maintien de connexion');
    this.startConnectionMaintenance();
  }

  handleIntroEnded(event) {
    console.log('[ConnectionManager] 🏁 Intro terminée, arrêt du maintien de connexion');
    this.stopConnectionMaintenance();
  }

  // === MAINTENANCE DE CONNEXION ===
  
  startConnectionMaintenance() {
    if (this.isActive) {
      console.log('[ConnectionManager] ⚠️ Maintenance déjà active');
      return;
    }

    if (!this.scene.room) {
      console.warn('[ConnectionManager] ❌ Pas de room active');
      return;
    }

    console.log('[ConnectionManager] 🚀 Démarrage maintenance connexion');
    this.isActive = true;
    this.consecutiveFailures = 0;
    this.lastPongReceived = Date.now();
    
    this.startPingLoop();
    this.startHeartbeat();
  }

  stopConnectionMaintenance() {
    if (!this.isActive) return;
    
    console.log('[ConnectionManager] 🛑 Arrêt maintenance connexion');
    this.isActive = false;
    
    this.stopPingLoop();
    this.stopHeartbeat();
    this.clearReconnectTimeout();
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
    if (!this.scene.room || !this.isActive) return;

    try {
      const pingData = {
        timestamp: Date.now(),
        clientId: this.scene.room.sessionId,
        type: 'connection_check'
      };

      console.log('[ConnectionManager] 📡 Ping envoyé:', pingData.timestamp);
      this.scene.room.send("ping", pingData);
      
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
    if (!this.scene.room || !this.isActive) return;

    try {
      const heartbeatData = {
        timestamp: Date.now(),
        sessionId: this.scene.room.sessionId,
        sceneKey: this.scene.scene.key,
        playerData: this.getPlayerData()
      };

      this.scene.room.send("heartbeat", heartbeatData);
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
    if (!this.scene.networkHandler) {
      console.error('[ConnectionManager] ❌ Pas de NetworkHandler disponible');
      return;
    }

    console.log('[ConnectionManager] 🔄 Reconnexion en cours...');
    
    // Sauvegarder l'état actuel
    const currentState = this.saveCurrentState();
    
    try {
      // Tentative de reconnexion
      const success = await this.scene.networkHandler.reconnect();
      
      if (success) {
        console.log('[ConnectionManager] ✅ Reconnexion réussie');
        this.restoreCurrentState(currentState);
        this.consecutiveFailures = 0;
        this.lastPongReceived = Date.now();
        
        // Redémarrer la maintenance
        this.setupEventListeners();
        
      } else {
        throw new Error('Reconnexion échouée');
      }
      
    } catch (error) {
      console.error('[ConnectionManager] ❌ Erreur pendant reconnexion:', error);
      this.handleReconnectionFailure();
    }
  }

  handleReconnectionFailure() {
    console.error('[ConnectionManager] 🚨 Échec de reconnexion');
    
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

  // === SYNCHRONISATION ===
  
  updateSyncFlags() {
    // Mettre à jour les flags de synchronisation
    if (typeof window !== 'undefined') {
      window.connectionStable = true;
      window.lastConnectionCheck = Date.now();
    }
  }

  requestServerSync() {
    if (!this.scene.room) return;

    try {
      console.log('[ConnectionManager] 🔄 Demande synchronisation serveur');
      
      this.scene.room.send("requestSync", {
        timestamp: Date.now(),
        sceneKey: this.scene.scene.key,
        playerPosition: this.getPlayerPosition()
      });

    } catch (error) {
      console.error('[ConnectionManager] ❌ Erreur sync request:', error);
    }
  }

  // === ÉTAT ET DONNÉES ===
  
  saveCurrentState() {
    const state = {
      sceneKey: this.scene.scene.key,
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
    if (state.playerData && state.playerData.position) {
      const myPlayer = this.scene.playerManager?.getMyPlayer?.();
      if (myPlayer) {
        myPlayer.x = state.playerData.position.x;
        myPlayer.y = state.playerData.position.y;
      }
    }
  }

  getPlayerData() {
    const myPlayer = this.scene.playerManager?.getMyPlayer?.();
    
    if (!myPlayer) return null;
    
    return {
      sessionId: this.scene.room?.sessionId,
      position: { x: myPlayer.x, y: myPlayer.y },
      name: myPlayer.name,
      sprite: myPlayer.sprite?.texture?.key
    };
  }

  getPlayerPosition() {
    const myPlayer = this.scene.playerManager?.getMyPlayer?.();
    return myPlayer ? { x: myPlayer.x, y: myPlayer.y } : null;
  }

  // === GESTION DES ÉVÉNEMENTS DE CONNEXION ===
  
  handleDisconnection(code) {
    console.warn('[ConnectionManager] 🔌 Déconnexion détectée, code:', code);
    
    if (this.isActive) {
      // Tentative de reconnexion automatique pendant l'intro
      this.attemptReconnection();
    }
  }

  handleConnectionError(code, message) {
    console.error('[ConnectionManager] ❌ Erreur connexion:', { code, message });
    
    if (this.isActive) {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.maxFailures) {
        this.attemptReconnection();
      }
    }
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
      hasRoom: !!this.scene.room,
      roomConnected: this.scene.room?.connection?.readyState === 1,
      timeSinceLastPong: this.lastPongReceived ? Date.now() - this.lastPongReceived : null
    };
  }

  // === MÉTHODES PUBLIQUES ===
  
  forceReconnect() {
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
    this.stopConnectionMaintenance();
  }

  // === NETTOYAGE ===
  
  destroy() {
    console.log('[ConnectionManager] 💀 Destruction du ConnectionManager');
    
    this.stopConnectionMaintenance();
    
    // Nettoyer les événements
    window.removeEventListener('introStarted', this.handleIntroStarted.bind(this));
    window.removeEventListener('introEnded', this.handleIntroEnded.bind(this));
    
    this.scene = null;
  }
}

// === INTÉGRATION AUTOMATIQUE ===

// Export des méthodes d'intégration facile
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
