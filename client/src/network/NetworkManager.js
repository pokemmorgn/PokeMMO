// client/src/managers/ConnectionManager.js
// ✅ Gestionnaire de connexion robuste avec reconnexion automatique

export class ConnectionManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isMonitoring = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.pingInterval = 15000; // Ping every 15 seconds
    this.pongTimeout = 8000; // Expect pong within 8 seconds
    
    this.state = {
      isConnected: false,
      isReconnecting: false,
      lastPingTime: 0,
      lastPongTime: 0,
      consecutiveFailures: 0,
      connectionQuality: 'good', // good, poor, bad
      averageLatency: 0
    };
    
    this.intervals = {
      ping: null,
      monitoring: null,
      reconnect: null
    };
    
    this.callbacks = {
      onReconnecting: null,
      onReconnected: null,
      onConnectionLost: null,
      onConnectionRestored: null,
      onMaxReconnectReached: null
    };
    
    this.latencyHistory = [];
    this.maxLatencyHistory = 10;
    
    console.log('🔧 [ConnectionManager] Initialisé');
  }

  // ✅ Démarrer le monitoring de connexion
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ [ConnectionManager] Monitoring déjà actif');
      return;
    }

    console.log('🔍 [ConnectionManager] === DÉMARRAGE MONITORING ===');
    this.isMonitoring = true;
    this.state.isConnected = true;
    this.reconnectAttempts = 0;
    
    // ✅ CRITICAL: Setup du handler pong EN PREMIER
    this.setupPongHandler();
    
    // Setup ping/pong system
    this.setupPingPong();
    
    // Start connection health monitoring
    this.startHealthMonitoring();
    
    // Setup NetworkManager event listeners
    this.setupNetworkListeners();
    
    console.log('✅ [ConnectionManager] Monitoring actif');
  }

  // ✅ NOUVELLE MÉTHODE: Setup handler pong séparé
  setupPongHandler() {
    if (!this.networkManager.room) {
      console.warn(`⚠️ [ConnectionManager] Pas de room pour configurer pong handler`);
      return;
    }

    console.log(`📡 [ConnectionManager] Configuration handler pong pour room ${this.networkManager.room.id}`);
    
    try {
      this.networkManager.room.onMessage("pong", (data) => {
        this.handlePong(data);
      });
      console.log(`✅ [ConnectionManager] Handler pong configuré avec succès`);
    } catch (error) {
      console.error(`❌ [ConnectionManager] Erreur configuration handler pong:`, error);
    }
  }

  // ✅ Arrêter le monitoring
  stopMonitoring() {
    console.log('🛑 [ConnectionManager] Arrêt du monitoring');
    this.isMonitoring = false;
    
    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    this.intervals = {
      ping: null,
      monitoring: null,
      reconnect: null
    };
    
    console.log('✅ [ConnectionManager] Monitoring arrêté');
  }

  // ✅ Configuration du système ping/pong (intervalle seulement)
  setupPingPong() {
    // Clear existing ping interval
    if (this.intervals.ping) {
      clearInterval(this.intervals.ping);
    }

    // Start ping interval
    this.intervals.ping = setInterval(() => {
      this.sendPing();
    }, this.pingInterval);

    console.log(`📡 [ConnectionManager] Ping interval configuré (${this.pingInterval}ms)`);
  }

  // ✅ Envoyer un ping
  sendPing() {
    if (!this.networkManager.room || !this.networkManager.isConnected) {
      console.warn('⚠️ [ConnectionManager] Cannot ping - no room/connection');
      this.handleConnectionIssue();
      return;
    }

    try {
      this.state.lastPingTime = Date.now();
      this.networkManager.room.send("ping", { 
        timestamp: this.state.lastPingTime,
        clientId: this.networkManager.sessionId
      });
      
      console.log('📤 [ConnectionManager] Ping envoyé');
      
      // Setup pong timeout
      setTimeout(() => {
        this.checkPongTimeout();
      }, this.pongTimeout);
      
    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur ping:', error);
      this.handleConnectionIssue();
    }
  }

  // ✅ Gérer la réception d'un pong
  handlePong(data) {
    const now = Date.now();
    this.state.lastPongTime = now;
    
    // Calculate latency
    const latency = this.state.lastPingTime ? now - this.state.lastPingTime : 0;
    this.updateLatency(latency);
    
    // Reset consecutive failures
    this.state.consecutiveFailures = 0;
    
    // Update connection quality
    this.updateConnectionQuality(latency);
    
    console.log(`📥 [ConnectionManager] Pong reçu - Latence: ${latency}ms`);
    
    // If we were reconnecting, mark as reconnected
    if (this.state.isReconnecting) {
      this.handleReconnectionSuccess();
    }
  }

  // ✅ Vérifier le timeout du pong
  checkPongTimeout() {
    const now = Date.now();
    const timeSinceLastPong = now - this.state.lastPongTime;
    const timeSinceLastPing = now - this.state.lastPingTime;
    
    // If we sent a ping but didn't receive pong within timeout
    if (timeSinceLastPing < this.pongTimeout + 1000 && timeSinceLastPong > this.pongTimeout) {
      console.warn(`⏰ [ConnectionManager] Pong timeout (${timeSinceLastPong}ms)`);
      this.state.consecutiveFailures++;
      this.handleConnectionIssue();
    }
  }

  // ✅ Mettre à jour la latence moyenne
  updateLatency(latency) {
    this.latencyHistory.push(latency);
    
    // Keep only recent history
    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory = this.latencyHistory.slice(-this.maxLatencyHistory);
    }
    
    // Calculate average
    this.state.averageLatency = Math.round(
      this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length
    );
  }

  // ✅ Mettre à jour la qualité de connexion
  updateConnectionQuality(latency) {
    if (latency < 100) {
      this.state.connectionQuality = 'good';
    } else if (latency < 300) {
      this.state.connectionQuality = 'poor';
    } else {
      this.state.connectionQuality = 'bad';
    }
  }

  // ✅ Monitoring de santé général
  startHealthMonitoring() {
    if (this.intervals.monitoring) {
      clearInterval(this.intervals.monitoring);
    }

    this.intervals.monitoring = setInterval(() => {
      this.checkConnectionHealth();
    }, 5000); // Check every 5 seconds

    console.log('💓 [ConnectionManager] Health monitoring démarré');
  }

  // ✅ Vérifier la santé de la connexion
  checkConnectionHealth() {
    if (!this.networkManager.room) {
      console.warn('⚠️ [ConnectionManager] No room during health check');
      this.handleConnectionIssue();
      return;
    }

    const room = this.networkManager.room;
    
    // Check if connection is open
    if (!room.connection || !room.connection.isOpen) {
      console.warn('⚠️ [ConnectionManager] Connection not open during health check');
      this.handleConnectionIssue();
      return;
    }

    // Check if we haven't received pong for too long
    const now = Date.now();
    const timeSinceLastPong = now - this.state.lastPongTime;
    
    if (this.state.lastPongTime > 0 && timeSinceLastPong > this.pingInterval * 2) {
      console.warn(`⚠️ [ConnectionManager] No pong for ${timeSinceLastPong}ms`);
      this.state.consecutiveFailures++;
      this.handleConnectionIssue();
      return;
    }

    // Check consecutive failures
    if (this.state.consecutiveFailures > 3) {
      console.warn(`⚠️ [ConnectionManager] Too many consecutive failures: ${this.state.consecutiveFailures}`);
      this.handleConnectionIssue();
      return;
    }

    // All good
    if (this.state.isReconnecting) {
      this.handleReconnectionSuccess();
    }
  }

  // ✅ Gérer un problème de connexion
  handleConnectionIssue() {
    if (this.state.isReconnecting) {
      console.log('⚠️ [ConnectionManager] Issue during reconnection - continuing...');
      return;
    }

    console.warn('🚨 [ConnectionManager] === PROBLÈME DE CONNEXION DÉTECTÉ ===');
    console.warn(`📊 Failures: ${this.state.consecutiveFailures}`);
    console.warn(`⏱️ Last pong: ${Date.now() - this.state.lastPongTime}ms ago`);
    
    this.state.isConnected = false;
    
    // Notify callbacks
    if (this.callbacks.onConnectionLost) {
      this.callbacks.onConnectionLost(this.getConnectionStats());
    }
    
    // Start reconnection process
    this.startReconnection();
  }

  // ✅ Démarrer le processus de reconnexion
  startReconnection() {
    if (this.state.isReconnecting) {
      console.log('⚠️ [ConnectionManager] Reconnection already in progress');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [ConnectionManager] Max reconnect attempts reached');
      this.handleMaxReconnectReached();
      return;
    }

    console.log(`🔄 [ConnectionManager] === DÉBUT RECONNEXION ===`);
    console.log(`📊 Tentative: ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
    
    this.state.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Notify UI
    if (this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);
    }

    // Show notification to user
    if (window.showGameNotification) {
      window.showGameNotification(
        `Reconnexion en cours... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        'warning',
        { duration: 3000, position: 'top-center' }
      );
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`⏰ [ConnectionManager] Reconnexion dans ${delay}ms`);

    this.intervals.reconnect = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  // ✅ Tenter la reconnexion
  async attemptReconnection() {
    console.log('🔄 [ConnectionManager] === TENTATIVE DE RECONNEXION ===');

    try {
      // Get current zone and spawn data
      const currentZone = this.networkManager.getCurrentZone() || 'beach';
      const spawnData = {
        spawnX: this.networkManager.myPlayerData?.x || 360,
        spawnY: this.networkManager.myPlayerData?.y || 120
      };

      console.log(`🌍 [ConnectionManager] Reconnexion vers: ${currentZone}`);
      console.log(`📍 [ConnectionManager] Position: (${spawnData.spawnX}, ${spawnData.spawnY})`);

      // Disconnect first
      await this.networkManager.disconnect();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      const success = await this.networkManager.connect(currentZone, spawnData);
      
      if (success) {
        console.log('✅ [ConnectionManager] Reconnexion réussie !');
        
        // ✅ CRITIQUE: Reconfigurer le handler pong ET le ping interval APRÈS reconnexion
        setTimeout(() => {
          console.log('🔧 [ConnectionManager] Reconfiguration handlers après reconnexion...');
          this.setupPongHandler();
          this.setupPingPong();
        }, 500);
        
        this.handleReconnectionSuccess();
      } else {
        console.warn('❌ [ConnectionManager] Échec de reconnexion');
        this.handleReconnectionFailure();
      }

    } catch (error) {
      console.error('❌ [ConnectionManager] Erreur during reconnection:', error);
      this.handleReconnectionFailure();
    }
  }

  // ✅ Gérer le succès de reconnexion
  handleReconnectionSuccess() {
    console.log('🎉 [ConnectionManager] === RECONNEXION RÉUSSIE ===');
    
    this.state.isReconnecting = false;
    this.state.isConnected = true;
    this.state.consecutiveFailures = 0;
    this.reconnectAttempts = 0;
    
    // ✅ NE PAS redémarrer ping/pong ici - c'est fait dans attemptReconnection
    console.log('📡 [ConnectionManager] Ping/pong sera reconfiguré par attemptReconnection...');
    
    // Notify callbacks
    if (this.callbacks.onReconnected) {
      this.callbacks.onReconnected(this.getConnectionStats());
    }
    
    if (this.callbacks.onConnectionRestored) {
      this.callbacks.onConnectionRestored(this.getConnectionStats());
    }

    // Show success notification
    if (window.showGameNotification) {
      window.showGameNotification(
        'Connexion rétablie !',
        'success',
        { duration: 2000, position: 'top-center' }
      );
    }
  }

  // ✅ Gérer l'échec de reconnexion
  handleReconnectionFailure() {
    console.warn('❌ [ConnectionManager] Échec de reconnexion');
    
    this.state.isReconnecting = false;
    
    // Try again if we haven't reached max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log('🔄 [ConnectionManager] Nouvelle tentative programmée...');
      setTimeout(() => {
        this.startReconnection();
      }, 2000);
    } else {
      this.handleMaxReconnectReached();
    }
  }

  // ✅ Gérer le maximum de tentatives atteint
  handleMaxReconnectReached() {
    console.error('🚨 [ConnectionManager] === MAX RECONNECT ATTEMPTS REACHED ===');
    
    this.state.isReconnecting = false;
    
    // Notify callback
    if (this.callbacks.onMaxReconnectReached) {
      this.callbacks.onMaxReconnectReached(this.reconnectAttempts);
    }

    // Show critical notification
    if (window.showGameNotification) {
      window.showGameNotification(
        'Connexion perdue. Veuillez actualiser la page (F5).',
        'error',
        { duration: 10000, position: 'top-center' }
      );
    }

    // Optionally trigger page reload after delay
    setTimeout(() => {
      if (confirm('Connexion impossible. Actualiser la page ?')) {
        window.location.reload();
      }
    }, 5000);
  }

  // ✅ Configuration des listeners NetworkManager
  setupNetworkListeners() {
    if (!this.networkManager.room) return;

    // Listen for disconnection
    this.networkManager.room.onLeave(() => {
      if (!this.state.isReconnecting) {
        console.warn('🚪 [ConnectionManager] Room left unexpectedly');
        this.handleConnectionIssue();
      }
    });

    // Listen for connection errors
    this.networkManager.room.onError((error) => {
      console.error('❌ [ConnectionManager] Room error:', error);
      this.handleConnectionIssue();
    });

    console.log('👂 [ConnectionManager] NetworkManager listeners configurés');
  }

  // ✅ Obtenir les statistiques de connexion
  getConnectionStats() {
    return {
      isConnected: this.state.isConnected,
      isReconnecting: this.state.isReconnecting,
      consecutiveFailures: this.state.consecutiveFailures,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      averageLatency: this.state.averageLatency,
      connectionQuality: this.state.connectionQuality,
      lastPingTime: this.state.lastPingTime,
      lastPongTime: this.state.lastPongTime,
      timeSinceLastPong: this.state.lastPongTime ? Date.now() - this.state.lastPongTime : null
    };
  }

  // ✅ Forcer une reconnexion manuelle
  forceReconnection() {
    console.log('🔧 [ConnectionManager] === RECONNEXION FORCÉE ===');
    
    this.reconnectAttempts = 0;
    this.state.consecutiveFailures = 0;
    
    this.handleConnectionIssue();
  }

  // ✅ Test de la connexion
  testConnection() {
    console.log('🧪 [ConnectionManager] === TEST DE CONNEXION ===');
    
    const stats = this.getConnectionStats();
    console.log('📊 Stats:', stats);
    
    // Force a ping to test
    this.sendPing();
    
    return stats;
  }

  // ✅ Callbacks
  onReconnecting(callback) { this.callbacks.onReconnecting = callback; }
  onReconnected(callback) { this.callbacks.onReconnected = callback; }
  onConnectionLost(callback) { this.callbacks.onConnectionLost = callback; }
  onConnectionRestored(callback) { this.callbacks.onConnectionRestored = callback; }
  onMaxReconnectReached(callback) { this.callbacks.onMaxReconnectReached = callback; }

  // ✅ Nettoyage
  destroy() {
    console.log('🧹 [ConnectionManager] Destruction...');
    
    this.stopMonitoring();
    this.callbacks = {};
    this.latencyHistory = [];
    
    console.log('✅ [ConnectionManager] Détruit');
  }
}

// ✅ Fonctions de debug globales
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

window.testConnection = function() {
  if (window.globalNetworkManager?.connectionManager) {
    return window.globalNetworkManager.connectionManager.testConnection();
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

console.log('✅ ConnectionManager chargé avec succès !');
console.log('🔍 Utilisez window.debugConnectionManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testConnection() pour tester');
console.log('🔄 Utilisez window.forceReconnection() pour forcer une reconnexion');
