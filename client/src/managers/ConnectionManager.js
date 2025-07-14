// client/src/managers/ConnectionManager.js
// ✅ Gestionnaire de reconnexion automatique invisible pour Colyseus
// Support monitoring robuste + reconnexion seamless

export class ConnectionManager {
  /**
   * @param {NetworkManager} networkManager - Référence au NetworkManager parent
   */
  constructor(networkManager) {
    this.networkManager = networkManager;
    
    // État de connexion
    this.state = {
      isMonitoring: false,
      connectionQuality: 'good', // 'good', 'poor', 'bad'
      lastPingTime: 0,
      lastPongTime: 0,
      lastPingDuration: 0,
      averagePing: 0,
      connectionLost: false,
      reconnecting: false
    };

    // Configuration
    this.config = {
      pingInterval: 5000,           // Ping toutes les 5s
      pongTimeout: 10000,           // Timeout pong après 10s
      reconnectDelay: 1000,         // Délai initial reconnexion
      maxReconnectDelay: 30000,     // Délai max reconnexion
      maxReconnectAttempts: 10,     // Max tentatives
      connectionQualityThreshold: {
        good: 200,                  // < 200ms = good
        poor: 500,                  // < 500ms = poor
        bad: 1000                   // > 1000ms = bad
      }
    };

    // Timers et intervalles
    this.pingInterval = null;
    this.pongTimeout = null;
    this.reconnectTimeout = null;

    // Stats de reconnexion
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    this.lastDisconnectTime = 0;
    this.totalReconnections = 0;

    // Callbacks
    this.callbacks = {
      onReconnecting: null,
      onReconnected: null,
      onConnectionLost: null,
      onMaxReconnectReached: null,
      onQualityChanged: null
    };

    // Buffer des pings pour calculer la moyenne
    this.pingHistory = [];
    this.maxPingHistory = 10;

    // Données de restauration
    this.restoreData = {
      lastZone: null,
      lastPosition: { x: 0, y: 0 },
      lastPlayerData: null
    };

    console.log('🔧 [ConnectionManager] Initialisé');
  }

  // === GESTION DU MONITORING ===

  startMonitoring() {
    if (this.state.isMonitoring) {
      console.warn('⚠️ [ConnectionManager] Monitoring déjà actif');
      return;
    }

    console.log('🎯 [ConnectionManager] Démarrage monitoring connexion');
    this.state.isMonitoring = true;
    this.state.connectionLost = false;
    this.reconnectAttempts = 0;

    // Setup du ping automatique
    this.setupPingSystem();

    console.log('✅ [ConnectionManager] Monitoring actif');
  }

  stopMonitoring() {
    console.log('🛑 [ConnectionManager] Arrêt monitoring');
    this.state.isMonitoring = false;

    // Nettoyer tous les timers
    this.clearAllTimers();

    console.log('✅ [ConnectionManager] Monitoring arrêté');
  }

  setupPingSystem() {
    // Envoyer un ping périodique
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);

    console.log(`🏓 [ConnectionManager] Ping automatique configuré (${this.config.pingInterval}ms)`);
  }

  // === MÉTHODES PUBLIQUES POUR HANDLERS ===
  
  // Le NetworkManager appellera ces méthodes quand il reçoit les messages
  handlePongFromServer(data) {
    console.log(`🏓 [ConnectionManager] Pong reçu via NetworkManager:`, data);
    this.handlePong(data);
  }

  handleErrorFromServer(error) {
    console.error('🚨 [ConnectionManager] Erreur via NetworkManager:', error);
    this.handleConnectionError(error);
  }

  handleLeaveFromServer(code) {
    console.warn(`📤 [ConnectionManager] Déconnexion via NetworkManager (code: ${code})`);
    
    // Ne pas traiter comme perte si c'est une transition intentionnelle
    if (!this.networkManager.isTransitionActive) {
      this.handleConnectionLost();
    }
  }

  // === SYSTÈME DE PING/PONG ===

  sendPing() {
    if (!this.networkManager.room || !this.networkManager.isConnected) {
      return;
    }

    // Sauvegarder les données avant ping
    this.captureRestoreData();

    const pingTime = Date.now();
    this.state.lastPingTime = pingTime;

    try {
      this.networkManager.room.send("ping", { timestamp: pingTime });

      // Démarrer le timeout pour le pong
      this.pongTimeout = setTimeout(() => {
        console.warn('⏰ [ConnectionManager] Timeout pong - connexion problématique');
        this.handlePongTimeout();
      }, this.config.pongTimeout);

    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur envoi ping:', error);
      this.handleConnectionError(error);
    }
  }

  handlePong(data) {
    const pongTime = Date.now();
    this.state.lastPongTime = pongTime;

    // Calculer la latence
    if (data.timestamp) {
      const pingDuration = pongTime - data.timestamp;
      this.state.lastPingDuration = pingDuration;

      // Ajouter à l'historique
      this.pingHistory.push(pingDuration);
      if (this.pingHistory.length > this.maxPingHistory) {
        this.pingHistory.shift();
      }

      // Calculer la moyenne
      this.state.averagePing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;

      // Évaluer la qualité de connexion
      this.evaluateConnectionQuality(pingDuration);
    }

    // Arrêter le timeout pong
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    console.log(`🏓 [ConnectionManager] Pong reçu: ${this.state.lastPingDuration}ms (moy: ${Math.round(this.state.averagePing)}ms)`);
  }

  handlePongTimeout() {
    console.warn('⚠️ [ConnectionManager] Timeout pong - connexion dégradée');
    
    this.state.connectionQuality = 'bad';
    
    if (this.callbacks.onQualityChanged) {
      this.callbacks.onQualityChanged('bad', this.state.averagePing);
    }

    // Déclencher une vérification de connexion
    this.testConnection();
  }

  evaluateConnectionQuality(pingDuration) {
    let newQuality = 'good';
    
    if (pingDuration > this.config.connectionQualityThreshold.bad) {
      newQuality = 'bad';
    } else if (pingDuration > this.config.connectionQualityThreshold.poor) {
      newQuality = 'poor';
    }

    if (newQuality !== this.state.connectionQuality) {
      const oldQuality = this.state.connectionQuality;
      this.state.connectionQuality = newQuality;
      
      console.log(`📊 [ConnectionManager] Qualité connexion: ${oldQuality} → ${newQuality} (${pingDuration}ms)`);
      
      if (this.callbacks.onQualityChanged) {
        this.callbacks.onQualityChanged(newQuality, pingDuration);
      }
    }
  }

  // === GESTION DES ERREURS ET RECONNEXION ===

  handleConnectionError(error) {
    console.error('🚨 [ConnectionManager] Erreur connexion:', error);
    
    if (!this.state.connectionLost) {
      this.handleConnectionLost();
    }
  }

  handleConnectionLost() {
    console.warn('📉 [ConnectionManager] === CONNEXION PERDUE ===');
    
    this.state.connectionLost = true;
    this.lastDisconnectTime = Date.now();
    
    // Notifier la perte de connexion
    if (this.callbacks.onConnectionLost) {
      this.callbacks.onConnectionLost({
        timestamp: this.lastDisconnectTime,
        attempts: this.reconnectAttempts,
        averagePing: this.state.averagePing
      });
    }

    // Démarrer la reconnexion automatique
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      this.handleMaxReconnectReached();
    }
  }

  scheduleReconnection() {
    if (this.state.reconnecting) {
      console.log('🔄 [ConnectionManager] Reconnexion déjà en cours');
      return;
    }

    this.reconnectAttempts++;
    console.log(`⏳ [ConnectionManager] Reconnexion ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} dans ${this.currentReconnectDelay}ms`);

    // Notifier le début de reconnexion
    if (this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts, this.config.maxReconnectAttempts);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnection();
    }, this.currentReconnectDelay);

    // Augmenter le délai pour la prochaine tentative (backoff exponentiel)
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.config.maxReconnectDelay
    );
  }

  async attemptReconnection() {
    console.log(`🔄 [ConnectionManager] === TENTATIVE RECONNEXION ${this.reconnectAttempts} ===`);
    
    this.state.reconnecting = true;

    try {
      // Nettoyer l'ancienne connexion
      await this.cleanupOldConnection();

      // Tentative de reconnexion
      const success = await this.performReconnection();

      if (success) {
        console.log('🎉 [ConnectionManager] === RECONNEXION RÉUSSIE ===');
        await this.handleReconnectionSuccess();
      } else {
        console.warn(`❌ [ConnectionManager] Échec reconnexion ${this.reconnectAttempts}`);
        this.handleReconnectionFailure();
      }

    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur lors de la reconnexion:', error);
      this.handleReconnectionFailure();
    }

    this.state.reconnecting = false;
  }

  async cleanupOldConnection() {
    console.log('🧹 [ConnectionManager] Nettoyage ancienne connexion...');
    
    // Arrêter les timers
    this.clearAllTimers();

    // Nettoyer la room existante si nécessaire
    if (this.networkManager.room) {
      try {
        // Ne pas await pour éviter de bloquer
        this.networkManager.room.leave(false);
      } catch (error) {
        console.warn('⚠️ [ConnectionManager] Erreur nettoyage room:', error);
      }
    }
  }

  async performReconnection() {
    console.log('🔌 [ConnectionManager] Tentative connexion...');

    try {
      // Utiliser les données de restore pour reconnecter
      const spawnZone = this.restoreData.lastZone || this.networkManager.currentZone || "beach";
      const spawnData = {
        spawnX: this.restoreData.lastPosition.x || 360,
        spawnY: this.restoreData.lastPosition.y || 120,
        isReconnection: true,
        previousSessionId: this.networkManager.sessionId
      };

      console.log(`🎯 [ConnectionManager] Reconnexion vers zone: ${spawnZone}`, spawnData);

      // Utiliser la méthode connect du NetworkManager
      const success = await this.networkManager.connect(spawnZone, spawnData);

      return success;

    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur reconnexion:', error);
      return false;
    }
  }

  async handleReconnectionSuccess() {
    console.log('✅ [ConnectionManager] Reconnexion réussie - restauration état...');
    
    // Reset des compteurs
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    this.state.connectionLost = false;
    this.totalReconnections++;

    // Stats de reconnexion
    const reconnectionStats = {
      attempts: this.reconnectAttempts,
      totalReconnections: this.totalReconnections,
      downtime: Date.now() - this.lastDisconnectTime,
      restoredZone: this.restoreData.lastZone,
      restoredPosition: this.restoreData.lastPosition
    };

    // Redémarrer le monitoring
    this.startMonitoring();

    // Attendre un peu que la connexion se stabilise
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restaurer l'état du jeu
    await this.restoreGameState();

    // Notifier le succès
    if (this.callbacks.onReconnected) {
      this.callbacks.onReconnected(reconnectionStats);
    }

    console.log('🎊 [ConnectionManager] État restauré avec succès');
  }

  handleReconnectionFailure() {
    console.warn(`❌ [ConnectionManager] Échec reconnexion ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      // Programmer la prochaine tentative
      this.scheduleReconnection();
    } else {
      this.handleMaxReconnectReached();
    }
  }

  handleMaxReconnectReached() {
    console.error(`💀 [ConnectionManager] Nombre maximum de reconnexions atteint (${this.config.maxReconnectAttempts})`);
    
    this.state.connectionLost = true;
    this.state.reconnecting = false;

    if (this.callbacks.onMaxReconnectReached) {
      this.callbacks.onMaxReconnectReached(this.reconnectAttempts);
    }
  }

  // === RESTAURATION DE L'ÉTAT ===

  captureRestoreData() {
    if (!this.networkManager) return;

    // Capturer les données importantes pour la restauration
    this.restoreData = {
      lastZone: this.networkManager.currentZone,
      lastPosition: {
        x: this.networkManager.myPlayerData?.x || 360,
        y: this.networkManager.myPlayerData?.y || 120
      },
      lastPlayerData: this.networkManager.myPlayerData ? {...this.networkManager.myPlayerData} : null,
      timestamp: Date.now()
    };
  }

  async restoreGameState() {
    console.log('🔄 [ConnectionManager] Restauration état du jeu...');

    try {
      // Attendre que la connexion soit stable
      await this.waitForStableConnection();

      // Demander l'état actuel de la zone
      if (this.restoreData.lastZone) {
        this.networkManager.requestCurrentZone(this.restoreData.lastZone);
      }

      // Demander la liste des NPCs
      if (this.networkManager.room) {
        this.networkManager.room.send("requestNpcs", { 
          zone: this.restoreData.lastZone 
        });
      }

      // Vérifier que le joueur existe toujours
      this.networkManager.ensureMyPlayerExists();

      console.log('✅ [ConnectionManager] État du jeu restauré');

    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur restauration état:', error);
    }
  }

  async waitForStableConnection(timeout = 5000) {
    console.log('⏳ [ConnectionManager] Attente connexion stable...');
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStability = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout attente connexion stable'));
          return;
        }

        if (this.networkManager.isConnected && 
            this.networkManager.room && 
            this.networkManager.room.connection.isOpen) {
          console.log('✅ [ConnectionManager] Connexion stable détectée');
          resolve();
        } else {
          setTimeout(checkStability, 100);
        }
      };

      checkStability();
    });
  }

  // === MÉTHODES PUBLIQUES ===

  forceReconnection() {
    console.log('🔧 [ConnectionManager] Reconnexion forcée demandée');
    
    // Reset des tentatives pour permettre une nouvelle série
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    
    // Simuler une perte de connexion
    this.handleConnectionLost();
  }

  testConnection() {
    console.log('🧪 [ConnectionManager] Test de connexion...');
    
    if (!this.networkManager.room || !this.networkManager.isConnected) {
      console.warn('❌ [ConnectionManager] Pas de connexion à tester');
      return false;
    }

    try {
      // Envoyer un ping de test
      this.sendPing();
      return true;
    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur test connexion:', error);
      return false;
    }
  }

  getConnectionStats() {
    return {
      isMonitoring: this.state.isMonitoring,
      connectionQuality: this.state.connectionQuality,
      lastPingTime: this.state.lastPingTime,
      lastPongTime: this.state.lastPongTime,
      lastPingDuration: this.state.lastPingDuration,
      averagePing: Math.round(this.state.averagePing),
      connectionLost: this.state.connectionLost,
      reconnecting: this.state.reconnecting,
      reconnectAttempts: this.reconnectAttempts,
      totalReconnections: this.totalReconnections,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      currentReconnectDelay: this.currentReconnectDelay,
      lastDisconnectTime: this.lastDisconnectTime,
      restoreData: this.restoreData
    };
  }

  // === CALLBACKS ===

  onReconnecting(callback) {
    this.callbacks.onReconnecting = callback;
  }

  onReconnected(callback) {
    this.callbacks.onReconnected = callback;
  }

  onConnectionLost(callback) {
    this.callbacks.onConnectionLost = callback;
  }

  onMaxReconnectReached(callback) {
    this.callbacks.onMaxReconnectReached = callback;
  }

  onQualityChanged(callback) {
    this.callbacks.onQualityChanged = callback;
  }

  // === UTILITAIRES ===

  clearAllTimers() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  destroy() {
    console.log('🗑️ [ConnectionManager] Destruction...');
    
    this.stopMonitoring();
    this.clearAllTimers();
    
    // Reset des callbacks
    this.callbacks = {};
    
    console.log('✅ [ConnectionManager] Détruit');
  }
}

// Export pour utilisation
export default ConnectionManager;

console.log('✅ ConnectionManager chargé - Support reconnexion automatique invisible');
