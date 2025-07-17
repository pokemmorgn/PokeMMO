// client/src/managers/ConnectionManager.js
// ✅ Complete connection manager with server restart detection and auto-logout
// Enhanced with popup error handling and redirect to login

export class ConnectionManager {
  /**
   * @param {NetworkManager} networkManager - Reference to parent NetworkManager
   */
  constructor(networkManager) {
    this.networkManager = networkManager;
    
    // Connection state
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
      pingInterval: 5000,           // Ping every 5s
      pongTimeout: 10000,           // Pong timeout after 10s
      reconnectDelay: 1000,         // Initial reconnect delay
      maxReconnectDelay: 30000,     // Max reconnect delay
      maxReconnectAttempts: 10,     // Max attempts
      connectionQualityThreshold: {
        good: 200,                  // < 200ms = good
        poor: 500,                  // < 500ms = poor
        bad: 1000                   // > 1000ms = bad
      }
    };

    // ✅ NEW: Server restart detection configuration
    this.serverRestartConfig = {
      maxConsecutiveErrors: 3,        // Max consecutive errors before considering restart
      reconnectFailureThreshold: 5,   // Max reconnection failures before popup
      serverRestartCodes: [1006, 1001, 1011, 1012], // WebSocket codes indicating restart
      authErrorCodes: [4001, 4002, 4003], // Authentication error codes
      detectServerRestartTimeout: 30000, // 30s to detect restart
    };

    // ✅ NEW: Server restart detection state
    this.serverRestartState = {
      isServerRestarting: false,
      consecutiveErrors: 0,
      lastAuthError: null,
      serverRestartDetected: false,
      authFailures: 0
    };

    // Timers and intervals
    this.pingInterval = null;
    this.pongTimeout = null;
    this.reconnectTimeout = null;

    // Reconnection stats
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
      onQualityChanged: null,
      // ✅ NEW: Server restart callbacks
      onServerRestartDetected: null,
      onAuthFailure: null,
      onForceLogout: null
    };

    // Ping history buffer to calculate average
    this.pingHistory = [];
    this.maxPingHistory = 10;

    // Restore data
    this.restoreData = {
      lastZone: null,
      lastPosition: { x: 0, y: 0 },
      lastPlayerData: null
    };

    console.log('🔧 [ConnectionManager] Initialized with server restart detection');
  }

  // === MONITORING MANAGEMENT ===

  startMonitoring() {
    if (this.state.isMonitoring) {
      console.warn('⚠️ [ConnectionManager] Monitoring already active');
      return;
    }

    console.log('🎯 [ConnectionManager] Starting connection monitoring');
    this.state.isMonitoring = true;
    this.state.connectionLost = false;
    this.reconnectAttempts = 0;

    // Reset server restart state
    this.resetServerRestartState();

    // Setup automatic ping
    this.setupPingSystem();

    console.log('✅ [ConnectionManager] Monitoring active');
  }

  stopMonitoring() {
    console.log('🛑 [ConnectionManager] Stopping monitoring');
    this.state.isMonitoring = false;

    // Clear all timers
    this.clearAllTimers();

    console.log('✅ [ConnectionManager] Monitoring stopped');
  }

  setupPingSystem() {
    // Send periodic ping
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);

    console.log(`🏓 [ConnectionManager] Automatic ping configured (${this.config.pingInterval}ms)`);
  }

  // === PUBLIC METHODS FOR HANDLERS ===
  
  // NetworkManager will call these methods when receiving messages
  handlePongFromServer(data) {
    console.log(`🏓 [ConnectionManager] Pong received via NetworkManager:`, data);
    this.handlePong(data);
  }

  handleErrorFromServer(error) {
    console.error('🚨 [ConnectionManager] Error via NetworkManager:', error);
    
    // ✅ NEW: Check for server restart
    const isServerRestart = this.detectServerRestart(error.code || error.reason, error.message || error.reason);
    
    if (!isServerRestart) {
      this.handleConnectionError(error);
    }
  }

  handleLeaveFromServer(code) {
    console.warn(`📤 [ConnectionManager] Disconnection via NetworkManager (code: ${code})`);
    
    // ✅ NEW: Check for server restart codes
    const isServerRestart = this.detectServerRestart(code, 'Connection closed');
    
    // Don't treat as loss if it's an intentional transition
    if (!this.networkManager.isTransitionActive && !isServerRestart) {
      this.handleConnectionLost();
    }
  }

  // === PING/PONG SYSTEM ===

  sendPing() {
    if (!this.networkManager.room || !this.networkManager.isConnected) {
      return;
    }

    // Save data before ping
    this.captureRestoreData();

    const pingTime = Date.now();
    this.state.lastPingTime = pingTime;

    try {
      this.networkManager.room.send("ping", { timestamp: pingTime });

      // Start pong timeout
      this.pongTimeout = setTimeout(() => {
        console.warn('⏰ [ConnectionManager] Pong timeout - problematic connection');
        this.handlePongTimeout();
      }, this.config.pongTimeout);

    } catch (error) {
      console.error('❌ [ConnectionManager] Error sending ping:', error);
      this.handleConnectionError(error);
    }
  }

  handlePong(data) {
    const pongTime = Date.now();
    this.state.lastPongTime = pongTime;

    // Calculate latency
    if (data.timestamp) {
      const pingDuration = pongTime - data.timestamp;
      this.state.lastPingDuration = pingDuration;

      // Add to history
      this.pingHistory.push(pingDuration);
      if (this.pingHistory.length > this.maxPingHistory) {
        this.pingHistory.shift();
      }

      // Calculate average
      this.state.averagePing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;

      // Evaluate connection quality
      this.evaluateConnectionQuality(pingDuration);
    }

    // Clear pong timeout
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    // ✅ NEW: Reset consecutive errors on successful pong
    this.serverRestartState.consecutiveErrors = 0;

    console.log(`🏓 [ConnectionManager] Pong received: ${this.state.lastPingDuration}ms (avg: ${Math.round(this.state.averagePing)}ms)`);
  }

  handlePongTimeout() {
    console.warn('⚠️ [ConnectionManager] Pong timeout - degraded connection');
    
    this.state.connectionQuality = 'bad';
    
    // ✅ NEW: Count as consecutive error
    this.serverRestartState.consecutiveErrors++;
    
    if (this.callbacks.onQualityChanged) {
      this.callbacks.onQualityChanged('bad', this.state.averagePing);
    }

    // Trigger connection check
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
      
      console.log(`📊 [ConnectionManager] Connection quality: ${oldQuality} → ${newQuality} (${pingDuration}ms)`);
      
      if (this.callbacks.onQualityChanged) {
        this.callbacks.onQualityChanged(newQuality, pingDuration);
      }
    }
  }

  // === ✅ NEW: SERVER RESTART DETECTION ===

  /**
   * Detects if server has restarted based on error codes
   */
  detectServerRestart(errorCode, message) {
    console.log(`🔍 [ConnectionManager] Analyzing error for restart: ${errorCode} - ${message}`);

    // Check codes specific to server restart
    if (this.serverRestartConfig.serverRestartCodes.includes(errorCode)) {
      console.warn('🔄 [ConnectionManager] Server restart code detected');
      this.handleServerRestartDetected('WebSocket Error Code');
      return true;
    }

    // Check authentication error codes (expired JWT after restart)
    if (this.serverRestartConfig.authErrorCodes.includes(errorCode)) {
      console.warn('🔐 [ConnectionManager] Authentication error detected');
      this.handleAuthFailure(errorCode, message);
      return true;
    }

    // Count consecutive errors
    this.serverRestartState.consecutiveErrors++;
    console.log(`📊 [ConnectionManager] Consecutive errors: ${this.serverRestartState.consecutiveErrors}`);

    // Detect restart by accumulation of errors
    if (this.serverRestartState.consecutiveErrors >= this.serverRestartConfig.maxConsecutiveErrors) {
      console.warn('⚠️ [ConnectionManager] Too many consecutive errors - probable server restart');
      this.handleServerRestartDetected('Multiple Consecutive Errors');
      return true;
    }

    return false;
  }

  /**
   * Handles server restart detection
   */
  handleServerRestartDetected(reason) {
    if (this.serverRestartState.isServerRestarting) {
      console.log('🔄 [ConnectionManager] Server restart already being processed');
      return;
    }

    console.error(`🚨 [ConnectionManager] === SERVER RESTART DETECTED ===`);
    console.error(`📋 [ConnectionManager] Reason: ${reason}`);

    this.serverRestartState.isServerRestarting = true;
    this.serverRestartState.serverRestartDetected = true;

    // Stop normal monitoring
    this.stopMonitoring();

    // Wait a bit to see if it's really a restart
    setTimeout(() => {
      this.confirmServerRestart();
    }, 2000);
  }

  /**
   * Confirms server restart and decides action
   */
  async confirmServerRestart() {
    console.log('🔍 [ConnectionManager] Confirming server restart...');

    // Try quick reconnection to confirm
    try {
      const quickReconnect = await this.testQuickReconnection();
      
      if (quickReconnect) {
        console.log('✅ [ConnectionManager] False alarm - server available');
        this.resetServerRestartState();
        this.startMonitoring();
        return;
      }
    } catch (error) {
      console.error('❌ [ConnectionManager] Confirmation reconnection failed:', error);
    }

    // Restart confirmed
    console.error('💀 [ConnectionManager] Server restart confirmed');
    this.handleConfirmedServerRestart();
  }

  /**
   * Quick reconnection test
   */
  async testQuickReconnection() {
    console.log('⚡ [ConnectionManager] Quick reconnection test...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      // Try to reconnect quickly
      this.attemptReconnection()
        .then((success) => {
          clearTimeout(timeout);
          resolve(success);
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
    });
  }

  /**
   * Handles confirmed server restart
   */
  handleConfirmedServerRestart() {
    console.error('🚨 [ConnectionManager] Processing confirmed server restart');

    // Restart data
    const restartData = {
      reason: 'Server Restart Confirmed',
      timestamp: Date.now(),
      consecutiveErrors: this.serverRestartState.consecutiveErrors,
      lastPosition: this.restoreData.lastPosition,
      lastZone: this.restoreData.lastZone,
      totalReconnections: this.totalReconnections
    };

    // Notify server restart
    if (this.callbacks.onServerRestartDetected) {
      this.callbacks.onServerRestartDetected(restartData);
    }

    // Decide action based on failure count
    if (this.reconnectAttempts >= this.serverRestartConfig.reconnectFailureThreshold) {
      console.error('💀 [ConnectionManager] Too many failures - redirecting to login');
      this.handleForceLogout('Server restarted. Please log in again.');
    } else {
      console.log('🔄 [ConnectionManager] Attempting post-restart reconnection');
      this.handlePostRestartReconnection();
    }
  }

  /**
   * Handles authentication failures (expired JWT)
   */
  handleAuthFailure(errorCode, message) {
    console.error(`🔐 [ConnectionManager] Authentication error: ${errorCode} - ${message}`);

    this.serverRestartState.authFailures++;
    this.serverRestartState.lastAuthError = { code: errorCode, message, timestamp: Date.now() };

    // Notify authentication error
    if (this.callbacks.onAuthFailure) {
      this.callbacks.onAuthFailure(errorCode, message);
    }

    // If too many auth errors, force logout
    if (this.serverRestartState.authFailures >= 3) {
      console.error('💀 [ConnectionManager] Too many authentication errors');
      this.handleForceLogout('Authentication expired. Please log in again.');
    }
  }

  /**
   * Forces logout and return to login page
   */
  handleForceLogout(reason) {
    console.error(`🚪 [ConnectionManager] Forced logout: ${reason}`);

    // Stop all processes
    this.stopMonitoring();
    this.clearAllTimers();

    // Clear game session
    this.clearGameSession();

    // Logout data
    const logoutData = {
      reason,
      timestamp: Date.now(),
      wasServerRestart: this.serverRestartState.serverRestartDetected,
      authFailures: this.serverRestartState.authFailures,
      reconnectAttempts: this.reconnectAttempts
    };

    // Notify forced logout
    if (this.callbacks.onForceLogout) {
      this.callbacks.onForceLogout(logoutData);
    }

    // Show error popup and redirect
    this.showServerRestartPopup(reason);
  }

  /**
   * Handles post-restart reconnection attempts
   */
  async handlePostRestartReconnection() {
    console.log('🔄 [ConnectionManager] Attempting post-restart reconnection...');
    
    // Reset some counters for fresh start
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    
    // Wait a bit for server to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try reconnection
    this.scheduleReconnection();
  }

  /**
   * Shows server restart popup and redirects to login
   */
  showServerRestartPopup(reason) {
    console.log('🚨 [ConnectionManager] Showing server restart popup');

    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Inter', sans-serif;
    `;

    // Create popup
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 450px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-50px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);

    // Popup content
    popup.innerHTML = `
      <div style="margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">🔄</div>
        <h2 style="color: #e74c3c; margin-bottom: 15px; font-size: 24px;">Server Restarted</h2>
        <p style="color: #7f8c8d; font-size: 16px; line-height: 1.5;">
          ${reason || 'The game server has been restarted. Please log in again to continue playing.'}
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
          <p style="color: #e74c3c; font-size: 14px; margin: 0;">
            <strong>Don't worry!</strong> Your progress has been saved automatically.
          </p>
        </div>
      </div>

      <button id="returnToLoginBtn" style="
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">
        Return to Login
      </button>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Button click handler
    document.getElementById('returnToLoginBtn').addEventListener('click', () => {
      console.log('🚪 [ConnectionManager] Redirecting to login page');
      this.redirectToLogin();
    });

    // Auto-redirect after 10 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        console.log('⏰ [ConnectionManager] Auto-redirecting to login after timeout');
        this.redirectToLogin();
      }
    }, 10000);
  }

  /**
   * Redirects to login page
   */
  redirectToLogin() {
    console.log('🔄 [ConnectionManager] Redirecting to auth.html...');
    
    // Clear all session data
    this.clearGameSession();
    
    // Redirect to login page
    window.location.href = '/auth.html';
  }

  /**
   * Clears game session data
   */
  clearGameSession() {
    console.log('🧹 [ConnectionManager] Clearing game session data');

    // Clear session storage
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('pws_game_session');

    // Clear any game-specific data
    if (window.gameState) {
      window.gameState = null;
    }

    // Disconnect from room
    if (this.networkManager && this.networkManager.room) {
      try {
        this.networkManager.room.leave(true);
      } catch (error) {
        console.warn('⚠️ [ConnectionManager] Error leaving room:', error);
      }
    }
  }

  /**
   * Resets server restart state
   */
  resetServerRestartState() {
    this.serverRestartState = {
      isServerRestarting: false,
      consecutiveErrors: 0,
      lastAuthError: null,
      serverRestartDetected: false,
      authFailures: 0
    };
  }

  // === ERROR HANDLING AND RECONNECTION ===

  handleConnectionError(error) {
    console.error('🚨 [ConnectionManager] Connection error:', error);
    
    if (!this.state.connectionLost) {
      this.handleConnectionLost();
    }
  }

  handleConnectionLost() {
    console.warn('📉 [ConnectionManager] === CONNECTION LOST ===');
    
    this.state.connectionLost = true;
    this.lastDisconnectTime = Date.now();
    
    // Notify connection loss
    if (this.callbacks.onConnectionLost) {
      this.callbacks.onConnectionLost({
        timestamp: this.lastDisconnectTime,
        attempts: this.reconnectAttempts,
        averagePing: this.state.averagePing
      });
    }

    // Start automatic reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      this.handleMaxReconnectReached();
    }
  }

  scheduleReconnection() {
    if (this.state.reconnecting) {
      console.log('🔄 [ConnectionManager] Reconnection already in progress');
      return;
    }

    this.reconnectAttempts++;
    console.log(`⏳ [ConnectionManager] Reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.currentReconnectDelay}ms`);

    // Notify reconnection start
    if (this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts, this.config.maxReconnectAttempts);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnection();
    }, this.currentReconnectDelay);

    // Increase delay for next attempt (exponential backoff)
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.config.maxReconnectDelay
    );
  }

  async attemptReconnection() {
    console.log(`🔄 [ConnectionManager] === RECONNECTION ATTEMPT ${this.reconnectAttempts} ===`);
    
    this.state.reconnecting = true;

    try {
      // Clean old connection
      await this.cleanupOldConnection();

      // Attempt reconnection
      const success = await this.performReconnection();

      if (success) {
        console.log('🎉 [ConnectionManager] === RECONNECTION SUCCESSFUL ===');
        await this.handleReconnectionSuccess();
      } else {
        console.warn(`❌ [ConnectionManager] Reconnection failed ${this.reconnectAttempts}`);
        this.handleReconnectionFailure();
      }

    } catch (error) {
      console.error('❌ [ConnectionManager] Error during reconnection:', error);
      this.handleReconnectionFailure();
    }

    this.state.reconnecting = false;
  }

  async cleanupOldConnection() {
    console.log('🧹 [ConnectionManager] Cleaning old connection...');
    
    // Stop timers
    this.clearAllTimers();

    // Clean existing room if necessary
    if (this.networkManager.room) {
      try {
        // Don't await to avoid blocking
        this.networkManager.room.leave(false);
      } catch (error) {
        console.warn('⚠️ [ConnectionManager] Error cleaning room:', error);
      }
    }
  }

  async performReconnection() {
    console.log('🔌 [ConnectionManager] Attempting connection...');

    try {
      // Use restore data to reconnect
      const spawnZone = this.restoreData.lastZone || this.networkManager.currentZone || "beach";
      const spawnData = {
        spawnX: this.restoreData.lastPosition.x || 360,
        spawnY: this.restoreData.lastPosition.y || 120,
        isReconnection: true,
        previousSessionId: this.networkManager.sessionId
      };

      console.log(`🎯 [ConnectionManager] Reconnecting to zone: ${spawnZone}`, spawnData);

      // Use NetworkManager connect method
      const success = await this.networkManager.connect(spawnZone, spawnData);

      return success;

    } catch (error) {
      console.error('❌ [ConnectionManager] Reconnection error:', error);
      return false;
    }
  }

  async handleReconnectionSuccess() {
    console.log('✅ [ConnectionManager] Reconnection successful - restoring state...');
    
    // Reset counters
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    this.state.connectionLost = false;
    this.totalReconnections++;

    // Reset server restart state
    this.resetServerRestartState();

    // Reconnection stats
    const reconnectionStats = {
      attempts: this.reconnectAttempts,
      totalReconnections: this.totalReconnections,
      downtime: Date.now() - this.lastDisconnectTime,
      restoredZone: this.restoreData.lastZone,
      restoredPosition: this.restoreData.lastPosition
    };

    // Restart monitoring
    this.startMonitoring();

    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restore game state
    await this.restoreGameState();

    // Notify success
    if (this.callbacks.onReconnected) {
      this.callbacks.onReconnected(reconnectionStats);
    }

    console.log('🎊 [ConnectionManager] State restored successfully');
  }

  handleReconnectionFailure() {
    console.warn(`❌ [ConnectionManager] Reconnection failed ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      // Schedule next attempt
      this.scheduleReconnection();
    } else {
      this.handleMaxReconnectReached();
    }
  }

  handleMaxReconnectReached() {
    console.error(`💀 [ConnectionManager] Maximum reconnections reached (${this.config.maxReconnectAttempts})`);
    
    this.state.connectionLost = true;
    this.state.reconnecting = false;

    if (this.callbacks.onMaxReconnectReached) {
      this.callbacks.onMaxReconnectReached(this.reconnectAttempts);
    }

    // After max reconnects, consider it a server restart
    this.handleForceLogout('Unable to reconnect to server. Please log in again.');
  }

  // === STATE RESTORATION ===

  captureRestoreData() {
    if (!this.networkManager) return;

    // Capture important data for restoration
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
    console.log('🔄 [ConnectionManager] Restoring game state...');

    try {
      // Wait for stable connection
      await this.waitForStableConnection();

      // Request current zone state
      if (this.restoreData.lastZone) {
        this.networkManager.requestCurrentZone(this.restoreData.lastZone);
      }

      // Request NPC list
      if (this.networkManager.room) {
        this.networkManager.room.send("requestNpcs", { 
          zone: this.restoreData.lastZone 
        });
      }

      // Verify player still exists
      this.networkManager.ensureMyPlayerExists();

      console.log('✅ [ConnectionManager] Game state restored');

    } catch (error) {
      console.error('❌ [ConnectionManager] Error restoring state:', error);
    }
  }

  async waitForStableConnection(timeout = 5000) {
    console.log('⏳ [ConnectionManager] Waiting for stable connection...');
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStability = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for stable connection'));
          return;
        }

        if (this.networkManager.isConnected && 
            this.networkManager.room && 
            this.networkManager.room.connection.isOpen) {
          console.log('✅ [ConnectionManager] Stable connection detected');
          resolve();
        } else {
          setTimeout(checkStability, 100);
        }
      };

      checkStability();
    });
  }

  // === PUBLIC METHODS ===

  forceReconnection() {
    console.log('🔧 [ConnectionManager] Forced reconnection requested');
    
    // Reset attempts to allow new series
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    
    // Simulate connection loss
    this.handleConnectionLost();
  }

  testConnection() {
    console.log('🧪 [ConnectionManager] Connection test...');
    
    if (!this.networkManager.room || !this.networkManager.isConnected) {
      console.warn('❌ [ConnectionManager] No connection to test');
      return false;
    }

    try {
      // Send test ping
      this.sendPing();
      return true;
    } catch (error) {
      console.error('❌ [ConnectionManager] Connection test error:', error);
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
      restoreData: this.restoreData,
      // ✅ NEW: Server restart stats
      serverRestartState: this.serverRestartState,
      serverRestartConfig: this.serverRestartConfig
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

  // ✅ NEW: Server restart callbacks
  onServerRestartDetected(callback) {
    this.callbacks.onServerRestartDetected = callback;
  }

  onAuthFailure(callback) {
    this.callbacks.onAuthFailure = callback;
  }

  onForceLogout(callback) {
    this.callbacks.onForceLogout = callback;
  }

  // === UTILITIES ===

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
    console.log('🗑️ [ConnectionManager] Destroying...');
    
    this.stopMonitoring();
    this.clearAllTimers();
    
    // Reset callbacks
    this.callbacks = {};
    
    // Clear any remaining popups
    const existingOverlays = document.querySelectorAll('[style*="z-index: 10000"]');
    existingOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    console.log('✅ [ConnectionManager] Destroyed');
  }
}

// ✅ USAGE EXAMPLE - Add this to your NetworkManager initialization:
/*
// In your NetworkManager or main game file:

// Initialize connection manager
this.connectionManager = new ConnectionManager(this);

// Setup server restart detection callbacks
this.connectionManager.onServerRestartDetected((data) => {
  console.log('🚨 Server restart detected:', data);
  // Optional: Show custom notification
});

this.connectionManager.onAuthFailure((code, message) => {
  console.error('🔐 Authentication failed:', code, message);
  // Optional: Show auth error notification
});

this.connectionManager.onForceLogout((data) => {
  console.log('🚪 Forced logout:', data);
  // This will automatically show popup and redirect
});

// Setup room event handlers to forward to connection manager
room.onError = (code, message) => {
  this.connectionManager.handleErrorFromServer({ code, message });
};

room.onLeave = (code) => {
  this.connectionManager.handleLeaveFromServer(code);
};

room.onMessage("pong", (data) => {
  this.connectionManager.handlePongFromServer(data);
});

// Start monitoring
this.connectionManager.startMonitoring();
*/

// Export for use
export default ConnectionManager;

console.log('✅ Complete ConnectionManager loaded - Server restart detection with auto-logout');
