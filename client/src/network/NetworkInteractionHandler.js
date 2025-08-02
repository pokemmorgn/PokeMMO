// client/src/network/NetworkInteractionHandler.js
// ✅ Handler spécialisé pour toutes les interactions réseau + Quest Indicators

export class NetworkInteractionHandler {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isInitialized = false;
    this.handlersSetup = false;
    
    this.state = {
      lastInteractionTime: 0,
      pendingInteractions: new Map(),
      interactionCooldown: 500,
      currentInteractionId: null
    };
    
    this.callbacks = {
      onObjectInteraction: null,
      onSearchResult: null,
      onNpcInteraction: null,
      onUnifiedInterfaceResult: null,
      onInteractionError: null,
      onInteractionSuccess: null,
      onInteractionBlocked: null
    };
    
    this.debugCounters = {
      objectInteractions: 0,
      searchInteractions: 0,
      npcInteractions: 0,
      unifiedInterfaceResults: 0,
      errorsReceived: 0,
      messagesHandled: 0,
      initializationAttempts: 0
    };
    
    this.config = {
      enableDebugLogs: true,
      maxPendingInteractions: 10,
      interactionTimeout: 8000,
      retryAttempts: 2,
      maxInitRetries: 5,
      initRetryDelay: 500
    };
  }

  initialize() {
    this.debugCounters.initializationAttempts++;
    
    if (!this.networkManager || !this.networkManager.room) {
      console.error('[NetworkInteractionHandler] ❌ NetworkManager/Room manquant');
      return false;
    }

    const roomState = this.checkRoomReadiness();
    if (!roomState.ready) {
      if (this.debugCounters.initializationAttempts < this.config.maxInitRetries) {
        setTimeout(() => this.initialize(), this.config.initRetryDelay);
      }
      return false;
    }

    try {
      const handlersResult = this.setupInteractionHandlers();
      if (!handlersResult) {
        throw new Error('Échec setup handlers');
      }
      
      const verificationResult = this.verifyHandlersSetup();
      if (!verificationResult.success) {
        throw new Error(`Handlers non vérifiés: ${verificationResult.error}`);
      }
      
      this.isInitialized = true;
      this.handlersSetup = true;
      
      console.log('[NetworkInteractionHandler] ✅ Initialisé avec succès');
      return true;
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur initialisation:', error);
      this.isInitialized = false;
      this.handlersSetup = false;
      return false;
    }
  }

  checkRoomReadiness() {
    const room = this.networkManager.room;
    
    if (!room) return { ready: false, reason: 'room_missing' };
    if (!room.hasJoined) return { ready: false, reason: 'room_not_joined' };
    if (!this.networkManager.isConnected) return { ready: false, reason: 'network_not_connected' };
    if (room.state === undefined) return { ready: false, reason: 'room_state_undefined' };
    if (typeof room.send !== 'function') return { ready: false, reason: 'room_send_unavailable' };
    if (!room.onMessageHandlers) return { ready: false, reason: 'room_handlers_missing' };

    return { ready: true, reason: 'all_checks_passed' };
  }

  setupInteractionHandlers() {
    const room = this.networkManager.room;
    
    try {
      this.cleanupExistingHandlers();
      
      // Handlers d'interaction existants
      room.onMessage("objectInteractionResult", (data) => {
        this.debugCounters.messagesHandled++;
        this.handleObjectInteractionResult(data);
      });

      room.onMessage("searchResult", (data) => {
        this.debugCounters.messagesHandled++;
        this.handleSearchResult(data);
      });

      room.onMessage("interactionError", (data) => {
        this.debugCounters.errorsReceived++;
        this.handleInteractionError(data);
      });

      room.onMessage("interactionBlocked", (data) => {
        this.handleInteractionBlocked(data);
      });

      room.onMessage("interactionCooldown", (data) => {
        this.handleInteractionCooldown(data);
      });

      room.onMessage("interactionResult", (data) => {
        this.debugCounters.messagesHandled++;
        this.handleGenericInteractionResult(data);
      });

      // ✅ NOUVEAU: Handler pour les indicateurs de quête
      room.onMessage("questStatuses", (data) => {
        console.log('[NetworkInteractionHandler] 🎯 Quest statuses reçus:', data);
        this.handleQuestStatuses(data);
      });

      console.log('[NetworkInteractionHandler] ✅ Handlers configurés (+ quest indicators)');
      return true;
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur setup handlers:', error);
      return false;
    }
  }

  // ✅ NOUVEAU: Handler pour les indicateurs de quête
  handleQuestStatuses(data) {
    if (!data || !data.questStatuses || !Array.isArray(data.questStatuses)) {
      console.warn('[NetworkInteractionHandler] ⚠️ Format questStatuses invalide:', data);
      return;
    }

    console.log(`[NetworkInteractionHandler] 📊 Mise à jour ${data.questStatuses.length} indicateurs de quête`);

    // Obtenir la scène active
    const activeScene = this.getActiveScene();
    if (!activeScene || !activeScene.npcManager) {
      console.warn('[NetworkInteractionHandler] ⚠️ Scène/NpcManager non disponible pour quest indicators');
      return;
    }

    // Appliquer les indicateurs de quête
    try {
      activeScene.npcManager.updateQuestIndicators(data.questStatuses);
      
      // Debug des indicateurs appliqués
      data.questStatuses.forEach(status => {
        const indicator = status.type === 'questAvailable' ? '!' : '?';
        const color = status.type === 'questAvailable' ? 'jaune' : 
                     status.type === 'questReadyToComplete' ? 'jaune' : 'gris';
        console.log(`[NetworkInteractionHandler]   NPC ${status.npcId}: ${indicator} ${color}`);
      });
      
      console.log('[NetworkInteractionHandler] ✅ Indicateurs de quête mis à jour');
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur mise à jour quest indicators:', error);
    }
  }

  // Obtenir la scène active
  getActiveScene() {
    // Méthode 1: Via window.game
    if (window.game && window.game.scene) {
      const scenes = window.game.scene.getScenes(true);
      if (scenes && scenes.length > 0) {
        return scenes[0];
      }
    }
    
    // Méthode 2: Via NetworkManager si il a une référence
    if (this.networkManager && this.networkManager.scene) {
      return this.networkManager.scene;
    }
    
    // Méthode 3: Via globalNetworkManager
    if (window.globalNetworkManager && window.globalNetworkManager.scene) {
      return window.globalNetworkManager.scene;
    }
    
    return null;
  }

  cleanupExistingHandlers() {
    const room = this.networkManager.room;
    
    if (!room || !room.onMessageHandlers) return;
    
    const interactionEvents = [
      'objectInteractionResult',
      'searchResult', 
      'interactionError',
      'interactionBlocked',
      'interactionCooldown',
      'interactionResult',
      'questStatuses' // ✅ Inclure le nouveau handler
    ];
    
    let cleanedCount = 0;
    interactionEvents.forEach(eventName => {
      if (room.onMessageHandlers.events[eventName]) {
        delete room.onMessageHandlers.events[eventName];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[NetworkInteractionHandler] 🧹 Nettoyé ${cleanedCount} anciens handlers`);
    }
  }

  verifyHandlersSetup() {
    const room = this.networkManager.room;
    
    if (!room || !room.onMessageHandlers) {
      return { success: false, error: 'room_or_handlers_missing' };
    }
    
    const requiredHandlers = [
      'objectInteractionResult',
      'searchResult',
      'interactionError',
      'questStatuses' // ✅ Vérifier le nouveau handler
    ];
    
    const missingHandlers = requiredHandlers.filter(handler => 
      !room.onMessageHandlers.events[handler]
    );
    
    if (missingHandlers.length > 0) {
      return { 
        success: false, 
        error: `handlers_missing: ${missingHandlers.join(', ')}` 
      };
    }
    
    return { success: true };
  }

  sendObjectInteract(objectId) {
    if (!this.ensureHandlersReady()) {
      console.error('[NetworkInteractionHandler] ❌ Handlers pas prêts');
      return false;
    }
  
    if (!this.canSendInteraction()) return false;
  
    this.debugCounters.objectInteractions++;
    
    try {
      const interactionData = { objectId: objectId };
      
      if (this.networkManager.myPlayerData) {
        interactionData.playerPosition = {
          x: this.networkManager.myPlayerData.x,
          y: this.networkManager.myPlayerData.y
        };
      }
      
      this.networkManager.room.send("objectInteract", interactionData);
      this.trackInteraction('object', interactionData);
      
      return true;
  
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur envoi objectInteract:', error);
      this.handleSendError('objectInteract', error);
      return false;
    }
  }

  sendSearchHiddenItem(position, searchRadius = 32, additionalData = {}) {
    if (!this.ensureHandlersReady()) return false;
    if (!this.canSendInteraction()) return false;

    this.debugCounters.searchInteractions++;
    
    try {
      const searchData = {
        position: position,
        searchRadius: searchRadius,
        timestamp: Date.now(),
        zone: this.networkManager.currentZone,
        sessionId: this.networkManager.sessionId,
        ...additionalData
      };

      if (this.networkManager.myPlayerData) {
        searchData.playerInfo = {
          id: this.networkManager.myPlayerData.id,
          name: this.networkManager.myPlayerData.name,
          position: {
            x: this.networkManager.myPlayerData.x,
            y: this.networkManager.myPlayerData.y
          }
        };
      }
      
      this.networkManager.room.send("searchHiddenItem", searchData);
      this.trackInteraction('search', searchData);
      
      return true;

    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur envoi searchHiddenItem:', error);
      this.handleSendError('searchHiddenItem', error);
      return false;
    }
  }

  sendNpcInteract(npcId, additionalData = {}) {
    this.debugCounters.npcInteractions++;
    
    try {
      if (this.networkManager.room) {
        const dataToSend = {
          npcId: npcId,
          ...additionalData
        };
        
        this.networkManager.room.send("npcInteract", dataToSend);
        return true;
      }
      else {
        console.error('[NetworkInteractionHandler] ❌ Room non disponible');
        return false;
      }
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur envoi npcInteract:', error);
      this.handleSendError('npcInteract', error);
      return false;
    }
  }

  ensureHandlersReady() {
    const room = this.networkManager?.room;
    
    if (!room || !room.onMessageHandlers) {
      console.error('[NetworkInteractionHandler] ❌ Room ou handlers manquants');
      return false;
    }
    
    const requiredHandlers = ['objectInteractionResult', 'searchResult', 'interactionError'];
    const missingHandlers = requiredHandlers.filter(handler => 
      !room.onMessageHandlers.events[handler]
    );
    
    if (missingHandlers.length > 0) {
      const setupResult = this.setupInteractionHandlers();
      if (!setupResult) {
        console.error('[NetworkInteractionHandler] ❌ Échec re-setup handlers');
        return false;
      }
      
      const stillMissing = requiredHandlers.filter(handler => 
        !room.onMessageHandlers.events[handler]
      );
      
      if (stillMissing.length > 0) {
        console.error(`[NetworkInteractionHandler] ❌ Handlers toujours manquants: ${stillMissing.join(', ')}`);
        return false;
      }
      
      this.handlersSetup = true;
    }
    
    return true;
  }

  handleObjectInteractionResult(data) {
    this.cleanupTrackedInteraction(data.interactionId || data.objectId);
    
    switch (data.resultType) {
      case 'objectCollected':
        console.log('[NetworkInteractionHandler] ✅ Objet collecté:', data.objectName);
        break;
      case 'itemFound':
        console.log('[NetworkInteractionHandler] ✅ Objet trouvé:', data.item);
        break;
      case 'pcAccess':
        console.log('[NetworkInteractionHandler] 💻 Accès PC accordé');
        break;
      default:
        console.log('[NetworkInteractionHandler] ❓ Résultat objet:', data.resultType);
    }
    
    if (this.callbacks.onObjectInteraction) {
      this.callbacks.onObjectInteraction(data);
    }
    
    if (data.success && this.callbacks.onInteractionSuccess) {
      this.callbacks.onInteractionSuccess('object', data);
    } else if (!data.success && this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError('object', data);
    }
  }

  handleSearchResult(data) {
    this.cleanupTrackedInteraction(data.interactionId || 'search');
    
    if (data.found) {
      console.log('[NetworkInteractionHandler] ✅ Objet trouvé:', data.item);
      if (data.message) {
        this.showInteractionMessage(data.message, 'success');
      }
    } else {
      console.log('[NetworkInteractionHandler] 🔍 Rien trouvé');
      if (data.message) {
        this.showInteractionMessage(data.message, 'info');
      }
    }
    
    if (this.callbacks.onSearchResult) {
      this.callbacks.onSearchResult(data);
    }
    
    if (this.callbacks.onInteractionSuccess) {
      this.callbacks.onInteractionSuccess('search', data);
    }
  }

  handleInteractionError(data) {
    if (data.interactionId) {
      this.cleanupTrackedInteraction(data.interactionId);
    }
    
    this.showInteractionMessage(data.message || 'Erreur d\'interaction', 'error');
    
    if (this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError(data.type || 'unknown', data);
    }
  }

  handleInteractionBlocked(data) {
    this.showInteractionMessage(data.message || data.reason || 'Interaction bloquée', 'warning');
    
    if (this.callbacks.onInteractionBlocked) {
      this.callbacks.onInteractionBlocked(data);
    }
  }

  handleInteractionCooldown(data) {
    const seconds = Math.ceil(data.remainingTime / 1000);
    this.showInteractionMessage(`Attendez ${seconds} seconde(s)`, 'warning');
  }

  handleGenericInteractionResult(data) {
    switch (data.type) {
      case 'object':
        this.handleObjectInteractionResult(data);
        break;
      case 'search':
        this.handleSearchResult(data);
        break;
      case 'npc':
        if (data.unifiedInterface) {
          this.handleUnifiedInterfaceResult(data);
        } else {
          if (this.callbacks.onNpcInteraction) {
            this.callbacks.onNpcInteraction(data);
          }
        }
        break;
      default:
        if (data.unifiedInterface) {
          this.handleUnifiedInterfaceResult(data);
        } else {
          if (this.callbacks.onInteractionSuccess) {
            this.callbacks.onInteractionSuccess(data.type, data);
          }
        }
    }
  }

  handleUnifiedInterfaceResult(data) {
    this.debugCounters.unifiedInterfaceResults++;
    
    if (!this.validateUnifiedInterfaceData(data)) {
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(data);
      }
      return;
    }
    
    try {
      const unifiedData = {
        ...data,
        isUnifiedInterface: true,
        originalData: data,
        timestamp: Date.now()
      };
      
      if (this.callbacks.onUnifiedInterfaceResult) {
        this.callbacks.onUnifiedInterfaceResult(unifiedData);
      } else if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(unifiedData);
      } else {
        this.showInteractionMessage('Interface unifiée non supportée', 'warning');
      }
      
      if (this.callbacks.onInteractionSuccess) {
        this.callbacks.onInteractionSuccess('unifiedInterface', data);
      }
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur interface unifiée:', error);
      
      if (this.callbacks.onInteractionError) {
        this.callbacks.onInteractionError('unifiedInterface', {
          error: error.message,
          originalData: data
        });
      }
    }
  }

  validateUnifiedInterfaceData(data) {
    if (!data || !data.unifiedInterface) return false;
    
    const ui = data.unifiedInterface;
    if (!ui.npcId || !ui.capabilities || !Array.isArray(ui.capabilities) || ui.capabilities.length === 0) {
      return false;
    }
    
    return true;
  }

  canSendInteraction() {
    if (!this.networkManager?.isConnected || !this.networkManager?.room) {
      this.showInteractionMessage('Connexion requise', 'error');
      return false;
    }

    if (this.networkManager.isTransitioning) {
      this.showInteractionMessage('Impossible pendant transition', 'warning');
      return false;
    }

    const now = Date.now();
    if (now - this.state.lastInteractionTime < this.state.interactionCooldown) {
      return false;
    }

    if (this.state.pendingInteractions.size >= this.config.maxPendingInteractions) {
      this.showInteractionMessage('Trop d\'interactions en cours', 'warning');
      return false;
    }

    return true;
  }

  trackInteraction(type, data) {
    const interactionId = this.generateInteractionId(type, data);
    
    const interaction = {
      id: interactionId,
      type: type,
      data: data,
      timestamp: Date.now(),
      timeout: setTimeout(() => {
        this.handleInteractionTimeout(interactionId);
      }, this.config.interactionTimeout)
    };
    
    this.state.pendingInteractions.set(interactionId, interaction);
    this.state.lastInteractionTime = Date.now();
    this.state.currentInteractionId = interactionId;
  }

  cleanupTrackedInteraction(interactionId) {
    const interaction = this.state.pendingInteractions.get(interactionId);
    
    if (interaction) {
      if (interaction.timeout) {
        clearTimeout(interaction.timeout);
      }
      
      this.state.pendingInteractions.delete(interactionId);
      
      if (this.state.currentInteractionId === interactionId) {
        this.state.currentInteractionId = null;
      }
    }
  }

  handleInteractionTimeout(interactionId) {
    const interaction = this.state.pendingInteractions.get(interactionId);
    if (interaction) {
      this.showInteractionMessage('Interaction expirée', 'warning');
      this.cleanupTrackedInteraction(interactionId);
      
      if (this.callbacks.onInteractionError) {
        this.callbacks.onInteractionError(interaction.type, {
          error: 'timeout',
          message: 'Interaction expirée'
        });
      }
    }
  }

  handleSendError(messageType, error) {
    this.showInteractionMessage(`Erreur envoi: ${error.message}`, 'error');
    
    if (this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError(messageType, {
        error: 'send_failed',
        message: error.message,
        originalError: error
      });
    }
  }

  // Callbacks publics
  onObjectInteraction(callback) { this.callbacks.onObjectInteraction = callback; }
  onSearchResult(callback) { this.callbacks.onSearchResult = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onUnifiedInterfaceResult(callback) { this.callbacks.onUnifiedInterfaceResult = callback; }
  onInteractionError(callback) { this.callbacks.onInteractionError = callback; }
  onInteractionSuccess(callback) { this.callbacks.onInteractionSuccess = callback; }
  onInteractionBlocked(callback) { this.callbacks.onInteractionBlocked = callback; }

  generateInteractionId(type, data) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    let identifier = 'unknown';
    switch (type) {
      case 'object': identifier = data.objectId || 'obj'; break;
      case 'search': identifier = `${data.position?.x || 0}_${data.position?.y || 0}`; break;
      case 'npc': identifier = data.npcId || 'npc'; break;
    }
    
    return `${type}_${identifier}_${timestamp}_${random}`;
  }

  showInteractionMessage(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      try {
        window.showGameNotification(message, type, { 
          duration: 3000,
          position: 'bottom-right'
        });
      } catch (error) {
        console.log(`[NetworkInteractionHandler] ${type.toUpperCase()}: ${message}`);
      }
    } else {
      console.log(`[NetworkInteractionHandler] ${type.toUpperCase()}: ${message}`);
    }
  }

  getDebugInfo() {
    const room = this.networkManager?.room;
    const handlersCount = room?.onMessageHandlers ? Object.keys(room.onMessageHandlers.events).length : 0;
    const interactionHandlers = room?.onMessageHandlers ? Object.keys(room.onMessageHandlers.events).filter(key => 
      key.includes('interaction') || key.includes('search') || key.includes('Result') || key.includes('questStatuses')
    ) : [];

    return {
      isInitialized: this.isInitialized,
      handlersSetup: this.handlersSetup,
      counters: this.debugCounters,
      state: {
        ...this.state,
        pendingInteractionsCount: this.state.pendingInteractions.size
      },
      networkManagerReady: !!(this.networkManager?.isConnected && this.networkManager?.room),
      roomReadiness: this.checkRoomReadiness(),
      handlersInfo: {
        totalHandlers: handlersCount,
        interactionHandlers: interactionHandlers,
        hasQuestStatusHandler: interactionHandlers.includes('questStatuses') // ✅ Nouveau check
      }
    };
  }

  destroy() {
    this.state.pendingInteractions.forEach((interaction) => {
      if (interaction.timeout) {
        clearTimeout(interaction.timeout);
      }
    });
    
    this.state.pendingInteractions.clear();
    
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    this.isInitialized = false;
    this.handlersSetup = false;
    this.networkManager = null;
  }
}

// Fonctions debug globales
window.debugInteractionHandler = function() {
  if (window.globalNetworkManager?.interactionHandler) {
    const info = window.globalNetworkManager.interactionHandler.getDebugInfo();
    console.table(info.counters);
    return info;
  }
  return null;
};

window.testQuestIndicators = function() {
  console.log('🧪 Test quest indicators...');
  
  const mockQuestStatuses = {
    questStatuses: [
      { npcId: 2, type: 'questAvailable' },
      { npcId: 3, type: 'questInProgress' },
      { npcId: 4, type: 'questReadyToComplete' }
    ]
  };
  
  if (window.globalNetworkManager?.interactionHandler) {
    window.globalNetworkManager.interactionHandler.handleQuestStatuses(mockQuestStatuses);
    console.log('✅ Test envoyé - vérifiez les NPCs');
    
    setTimeout(() => {
      const scene = window.game?.scene?.getScenes(true)?.[0];
      if (scene?.npcManager) {
        scene.npcManager.updateQuestIndicators([]);
        console.log('🧹 Test nettoyé');
      }
    }, 10000);
  }
};

console.log('✅ NetworkInteractionHandler avec Quest Indicators chargé!');
console.log('🧪 Utilisez window.testQuestIndicators() pour tester les "!"');
