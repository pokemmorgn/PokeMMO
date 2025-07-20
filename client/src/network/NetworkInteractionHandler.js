// client/src/network/NetworkInteractionHandler.js
// ✅ CORRECTED - Handler spécialisé pour toutes les interactions réseau
// Étend les capacités du NetworkManager sans le polluer

export class NetworkInteractionHandler {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.isInitialized = false;
    this.handlersSetup = false; // ✅ NOUVEAU FLAG
    
    // ✅ État des interactions
    this.state = {
      lastInteractionTime: 0,
      pendingInteractions: new Map(),
      interactionCooldown: 500,
      currentInteractionId: null
    };
    
    // ✅ Callbacks pour chaque type d'interaction
    this.callbacks = {
      onObjectInteraction: null,
      onSearchResult: null,
      onNpcInteraction: null,
      onInteractionError: null,
      onInteractionSuccess: null,
      onInteractionBlocked: null
    };
    
    // ✅ Compteurs debug
    this.debugCounters = {
      objectInteractions: 0,
      searchInteractions: 0,
      npcInteractions: 0,
      errorsReceived: 0,
      messagesHandled: 0,
      initializationAttempts: 0 // ✅ NOUVEAU
    };
    
    // ✅ Configuration
    this.config = {
      enableDebugLogs: true,
      maxPendingInteractions: 10,
      interactionTimeout: 8000,
      retryAttempts: 2,
      maxInitRetries: 5, // ✅ NOUVEAU
      initRetryDelay: 500 // ✅ NOUVEAU
    };
    
    console.log('[NetworkInteractionHandler] 🔧 Créé avec NetworkManager');
    
    // ✅ SUPPRIMÉ : L'auto-initialisation du constructeur
    // On attend l'appel explicite à initialize()
  }

  // === INITIALISATION REFACTORISÉE ===

  initialize() {
    this.debugCounters.initializationAttempts++;
    
    console.log(`[NetworkInteractionHandler] 🚀 === INITIALISATION ATTEMPT #${this.debugCounters.initializationAttempts} ===`);
    
    // ✅ Vérifications préliminaires
    if (!this.networkManager) {
      console.error('[NetworkInteractionHandler] ❌ NetworkManager manquant');
      return false;
    }

    if (!this.networkManager.room) {
      console.error('[NetworkInteractionHandler] ❌ Room manquante');
      return false;
    }

    // ✅ NOUVELLE LOGIQUE : Vérification d'état de la room plus robuste
    const roomState = this.checkRoomReadiness();
    if (!roomState.ready) {
      console.warn(`[NetworkInteractionHandler] ⚠️ Room pas prête: ${roomState.reason}`);
      
      // ✅ Retry intelligent avec limite
      if (this.debugCounters.initializationAttempts < this.config.maxInitRetries) {
        console.log(`[NetworkInteractionHandler] 🔄 Retry dans ${this.config.initRetryDelay}ms...`);
        setTimeout(() => {
          this.initialize();
        }, this.config.initRetryDelay);
      } else {
        console.error('[NetworkInteractionHandler] ❌ Max retries atteint, abandon');
      }
      
      return false;
    }

    console.log('[NetworkInteractionHandler] ✅ Room prête, setup handlers...');
    console.log('[NetworkInteractionHandler] Room ID:', this.networkManager.room.roomId);
    console.log('[NetworkInteractionHandler] Session ID:', this.networkManager.sessionId);
    console.log('[NetworkInteractionHandler] Room hasJoined:', this.networkManager.room.hasJoined);

    try {
      // ✅ NOUVEAU : Setup handlers avec vérification
      const handlersResult = this.setupInteractionHandlers();
      if (!handlersResult) {
        throw new Error('Échec setup handlers');
      }
      
      // ✅ NOUVEAU : Vérification post-setup
      const verificationResult = this.verifyHandlersSetup();
      if (!verificationResult.success) {
        throw new Error(`Handlers non vérifiés: ${verificationResult.error}`);
      }
      
      this.isInitialized = true;
      this.handlersSetup = true;
      
      console.log('[NetworkInteractionHandler] ✅ Initialisé avec succès');
      console.log(`[NetworkInteractionHandler] 📊 Tentatives: ${this.debugCounters.initializationAttempts}`);
      
      return true;
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur initialisation:', error);
      
      // ✅ Reset flags en cas d'erreur
      this.isInitialized = false;
      this.handlersSetup = false;
      
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérification robuste de l'état de la room
  checkRoomReadiness() {
    const room = this.networkManager.room;
    
    // ✅ Vérifications basiques
    if (!room) {
      return { ready: false, reason: 'room_missing' };
    }

    if (!room.hasJoined) {
      return { ready: false, reason: 'room_not_joined' };
    }

    if (!this.networkManager.isConnected) {
      return { ready: false, reason: 'network_not_connected' };
    }

    // ✅ Vérification de l'état interne de la room Colyseus
    if (room.state === undefined) {
      return { ready: false, reason: 'room_state_undefined' };
    }

    // ✅ Vérification que la room peut recevoir des messages
    if (typeof room.send !== 'function') {
      return { ready: false, reason: 'room_send_unavailable' };
    }

    // ✅ Vérification des handlers Colyseus
    if (!room.onMessageHandlers) {
      return { ready: false, reason: 'room_handlers_missing' };
    }

    return { ready: true, reason: 'all_checks_passed' };
  }

  // ✅ MÉTHODE REFACTORISÉE : Setup handlers avec retour booléen
  setupInteractionHandlers() {
    const room = this.networkManager.room;
    
    console.log('[NetworkInteractionHandler] 👂 Configuration des handlers...');
    
    try {
      // ✅ NOUVEAU : Nettoyer les anciens handlers si ils existent
      this.cleanupExistingHandlers();
      
      // ✅ Handler pour résultats d'interaction objet
      room.onMessage("objectInteractionResult", (data) => {
        this.debugCounters.messagesHandled++;
        console.log(`[NetworkInteractionHandler] 📦 === OBJECT INTERACTION RESULT #${this.debugCounters.messagesHandled} ===`);
        console.log('[NetworkInteractionHandler] Data:', data);
        
        this.handleObjectInteractionResult(data);
      });

      // ✅ Handler pour résultats de fouille
      room.onMessage("searchResult", (data) => {
        this.debugCounters.messagesHandled++;
        console.log(`[NetworkInteractionHandler] 🔍 === SEARCH RESULT #${this.debugCounters.messagesHandled} ===`);
        console.log('[NetworkInteractionHandler] Data:', data);
        
        this.handleSearchResult(data);
      });

      // ✅ Handler pour erreurs d'interaction
      room.onMessage("interactionError", (data) => {
        this.debugCounters.errorsReceived++;
        console.log(`[NetworkInteractionHandler] ❌ === INTERACTION ERROR #${this.debugCounters.errorsReceived} ===`);
        console.log('[NetworkInteractionHandler] Error:', data);
        
        this.handleInteractionError(data);
      });

      // ✅ Handler pour blocages d'interaction
      room.onMessage("interactionBlocked", (data) => {
        console.log('[NetworkInteractionHandler] 🚫 === INTERACTION BLOCKED ===');
        console.log('[NetworkInteractionHandler] Reason:', data.reason);
        
        this.handleInteractionBlocked(data);
      });

      // ✅ Handler pour cooldowns
      room.onMessage("interactionCooldown", (data) => {
        console.log('[NetworkInteractionHandler] ⏰ === INTERACTION COOLDOWN ===');
        console.log('[NetworkInteractionHandler] Cooldown:', data.remainingTime + 'ms');
        
        this.handleInteractionCooldown(data);
      });

      // ✅ Handler générique pour nouveaux types d'interaction
      room.onMessage("interactionResult", (data) => {
        this.debugCounters.messagesHandled++;
        console.log(`[NetworkInteractionHandler] 🎭 === INTERACTION RESULT GÉNÉRIQUE #${this.debugCounters.messagesHandled} ===`);
        console.log('[NetworkInteractionHandler] Type:', data.type);
        console.log('[NetworkInteractionHandler] Data:', data);
        
        this.handleGenericInteractionResult(data);
      });

      console.log('[NetworkInteractionHandler] ✅ Handlers configurés');
      return true;
      
    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur setup handlers:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Nettoyage des anciens handlers
  cleanupExistingHandlers() {
    const room = this.networkManager.room;
    
    if (!room || !room.onMessageHandlers) {
      return;
    }
    
    const interactionEvents = [
      'objectInteractionResult',
      'searchResult', 
      'interactionError',
      'interactionBlocked',
      'interactionCooldown',
      'interactionResult'
    ];
    
    let cleanedCount = 0;
    
    interactionEvents.forEach(eventName => {
      if (room.onMessageHandlers.events[eventName]) {
        // ✅ Supprimer les anciens handlers
        delete room.onMessageHandlers.events[eventName];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[NetworkInteractionHandler] 🧹 Nettoyé ${cleanedCount} anciens handlers`);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérification post-setup
  verifyHandlersSetup() {
    const room = this.networkManager.room;
    
    if (!room || !room.onMessageHandlers) {
      return { success: false, error: 'room_or_handlers_missing' };
    }
    
    const requiredHandlers = [
      'objectInteractionResult',
      'searchResult',
      'interactionError'
    ];
    
    const missingHandlers = [];
    
    requiredHandlers.forEach(handler => {
      if (!room.onMessageHandlers.events[handler]) {
        missingHandlers.push(handler);
      }
    });
    
    if (missingHandlers.length > 0) {
      return { 
        success: false, 
        error: `handlers_missing: ${missingHandlers.join(', ')}` 
      };
    }
    
    console.log('[NetworkInteractionHandler] ✅ Vérification handlers OK');
    return { success: true };
  }

  // ✅ NOUVELLE MÉTHODE PUBLIQUE : Force re-setup des handlers
  forceReinitializeHandlers() {
    console.log('[NetworkInteractionHandler] 🔧 Force re-initialisation handlers...');
    
    this.handlersSetup = false;
    
    const result = this.setupInteractionHandlers();
    if (result) {
      const verification = this.verifyHandlersSetup();
      if (verification.success) {
        this.handlersSetup = true;
        console.log('[NetworkInteractionHandler] ✅ Re-initialisation handlers réussie');
        return true;
      } else {
        console.error('[NetworkInteractionHandler] ❌ Échec vérification après re-init:', verification.error);
        return false;
      }
    }
    
    console.error('[NetworkInteractionHandler] ❌ Échec re-initialisation handlers');
    return false;
  }

  // === ENVOI D'INTERACTIONS ===

  sendObjectInteract(objectId, objectType = null, position = null, additionalData = {}) {
    // ✅ NOUVEAU : Vérification handlers avant envoi
    if (!this.ensureHandlersReady()) {
      console.error('[NetworkInteractionHandler] ❌ Handlers pas prêts, envoi impossible');
      return false;
    }

    if (!this.canSendInteraction()) {
      return false;
    }

    this.debugCounters.objectInteractions++;
    console.log(`[NetworkInteractionHandler] 📤 === OBJECT INTERACT #${this.debugCounters.objectInteractions} ===`);
    console.log('[NetworkInteractionHandler] Object ID:', objectId);
    console.log('[NetworkInteractionHandler] Type:', objectType);
    console.log('[NetworkInteractionHandler] Position:', position);

    try {
      const interactionData = {
        objectId: objectId,
        objectType: objectType,
        position: position,
        timestamp: Date.now(),
        zone: this.networkManager.currentZone,
        sessionId: this.networkManager.sessionId,
        ...additionalData
      };

      // ✅ Ajouter position du joueur si disponible
      if (this.networkManager.myPlayerData) {
        interactionData.playerPosition = {
          x: this.networkManager.myPlayerData.x,
          y: this.networkManager.myPlayerData.y
        };
      }

      console.log('[NetworkInteractionHandler] 📤 Envoi objectInteract:', interactionData);
      
      const room = this.networkManager.room;
      room.send("objectInteract", interactionData);
      
      // ✅ Tracking de l'interaction
      this.trackInteraction('object', interactionData);
      
      console.log('[NetworkInteractionHandler] ✅ Interaction objet envoyée');
      return true;

    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur envoi objectInteract:', error);
      this.handleSendError('objectInteract', error);
      return false;
    }
  }

  sendSearchHiddenItem(position, searchRadius = 32, additionalData = {}) {
    // ✅ NOUVEAU : Vérification handlers avant envoi
    if (!this.ensureHandlersReady()) {
      console.error('[NetworkInteractionHandler] ❌ Handlers pas prêts, envoi impossible');
      return false;
    }

    if (!this.canSendInteraction()) {
      return false;
    }

    this.debugCounters.searchInteractions++;
    console.log(`[NetworkInteractionHandler] 📤 === SEARCH HIDDEN ITEM #${this.debugCounters.searchInteractions} ===`);
    console.log('[NetworkInteractionHandler] Position:', position);
    console.log('[NetworkInteractionHandler] Radius:', searchRadius);

    try {
      const searchData = {
        position: position,
        searchRadius: searchRadius,
        timestamp: Date.now(),
        zone: this.networkManager.currentZone,
        sessionId: this.networkManager.sessionId,
        ...additionalData
      };

      // ✅ Ajouter infos joueur si disponibles
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

      console.log('[NetworkInteractionHandler] 📤 Envoi searchHiddenItem:', searchData);
      
      const room = this.networkManager.room;
      room.send("searchHiddenItem", searchData);
      
      // ✅ Tracking de l'interaction
      this.trackInteraction('search', searchData);
      
      console.log('[NetworkInteractionHandler] ✅ Fouille envoyée');
      return true;

    } catch (error) {
      console.error('[NetworkInteractionHandler] ❌ Erreur envoi searchHiddenItem:', error);
      this.handleSendError('searchHiddenItem', error);
      return false;
    }
  }

  sendNpcInteract(npcId, additionalData = {}) {
    this.debugCounters.npcInteractions++;
    console.log(`[NetworkInteractionHandler] 📤 === NPC INTERACT #${this.debugCounters.npcInteractions} ===`);
    console.log('[NetworkInteractionHandler] NPC ID (number):', npcId);
    
    try {
      // ✅ BYPASSER l'ancienne méthode - utiliser directement room.send
      if (this.networkManager.room) {
        console.log('[NetworkInteractionHandler] 🔧 Envoi direct via room.send (format minimal)');
        
        // ✅ Format EXACT qui fonctionne (testé en console)
        this.networkManager.room.send("npcInteract", {
          npcId: npcId // ← JUSTE ÇA !
        });
        
        console.log('[NetworkInteractionHandler] ✅ Interaction NPC envoyée (format minimal)');
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

  // ✅ NOUVELLE MÉTHODE : S'assurer que les handlers sont prêts
// ✅ CORRECTION : Vérification directe à chaque interaction
ensureHandlersReady() {
  const room = this.networkManager?.room;
  
  if (!room || !room.onMessageHandlers) {
    console.error('[NetworkInteractionHandler] ❌ Room ou handlers manquants');
    return false;
  }
  
  // ✅ VÉRIFICATION DIRECTE : Les handlers existent-ils vraiment ?
  const requiredHandlers = ['objectInteractionResult', 'searchResult', 'interactionError'];
  const missingHandlers = requiredHandlers.filter(handler => 
    !room.onMessageHandlers.events[handler]
  );
  
  if (missingHandlers.length > 0) {
    console.warn(`[NetworkInteractionHandler] ⚠️ Handlers manquants: ${missingHandlers.join(', ')}`);
    console.log('[NetworkInteractionHandler] 🔧 Re-setup automatique des handlers...');
    
    // ✅ RE-SETUP IMMÉDIAT
    const setupResult = this.setupInteractionHandlers();
    if (!setupResult) {
      console.error('[NetworkInteractionHandler] ❌ Échec re-setup handlers');
      return false;
    }
    
    // ✅ RE-VÉRIFICATION
    const stillMissing = requiredHandlers.filter(handler => 
      !room.onMessageHandlers.events[handler]
    );
    
    if (stillMissing.length > 0) {
      console.error(`[NetworkInteractionHandler] ❌ Handlers toujours manquants après re-setup: ${stillMissing.join(', ')}`);
      return false;
    }
    
    console.log('[NetworkInteractionHandler] ✅ Handlers re-setup avec succès');
    this.handlersSetup = true;
  }
  
  return true;
}

  // === GESTION DES RÉSULTATS ===

  handleObjectInteractionResult(data) {
    console.log('[NetworkInteractionHandler] 🔄 Traitement résultat objet');
    
    // ✅ Nettoyer l'interaction trackée
    this.cleanupTrackedInteraction(data.interactionId || data.objectId);
    
    // ✅ Traitement selon le type de résultat
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
        
      case 'machineActivated':
        console.log('[NetworkInteractionHandler] ⚙️ Machine activée:', data.machineType);
        break;
        
      case 'objectError':
        console.log('[NetworkInteractionHandler] ❌ Erreur objet:', data.message);
        break;
        
      default:
        console.log('[NetworkInteractionHandler] ❓ Résultat objet inconnu:', data.resultType);
    }
    
    // ✅ Déclencher callback
    if (this.callbacks.onObjectInteraction) {
      this.callbacks.onObjectInteraction(data);
    }
    
    // ✅ Callback succès/erreur global
    if (data.success && this.callbacks.onInteractionSuccess) {
      this.callbacks.onInteractionSuccess('object', data);
    } else if (!data.success && this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError('object', data);
    }
  }

  handleSearchResult(data) {
    console.log('[NetworkInteractionHandler] 🔄 Traitement résultat fouille');
    
    // ✅ Nettoyer l'interaction trackée
    this.cleanupTrackedInteraction(data.interactionId || 'search');
    
    if (data.found) {
      console.log('[NetworkInteractionHandler] ✅ Objet trouvé lors de la fouille:', data.item);
      
      // ✅ Afficher message de succès
      if (data.message) {
        this.showInteractionMessage(data.message, 'success');
      }
      
    } else {
      console.log('[NetworkInteractionHandler] 🔍 Rien trouvé lors de la fouille');
      
      // ✅ Afficher message d'échec
      if (data.message) {
        this.showInteractionMessage(data.message, 'info');
      }
    }
    
    // ✅ Déclencher callback
    if (this.callbacks.onSearchResult) {
      this.callbacks.onSearchResult(data);
    }
    
    // ✅ Callback global
    if (this.callbacks.onInteractionSuccess) {
      this.callbacks.onInteractionSuccess('search', data);
    }
  }

  handleInteractionError(data) {
    console.error('[NetworkInteractionHandler] ❌ Erreur interaction reçue:', data);
    
    // ✅ Nettoyer toute interaction en cours
    if (data.interactionId) {
      this.cleanupTrackedInteraction(data.interactionId);
    }
    
    // ✅ Afficher le message d'erreur
    this.showInteractionMessage(data.message || 'Erreur d\'interaction', 'error');
    
    // ✅ Déclencher callback
    if (this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError(data.type || 'unknown', data);
    }
  }

  handleInteractionBlocked(data) {
    console.log('[NetworkInteractionHandler] 🚫 Interaction bloquée:', data.reason);
    
    // ✅ Afficher message de blocage
    this.showInteractionMessage(data.message || data.reason || 'Interaction bloquée', 'warning');
    
    // ✅ Déclencher callback
    if (this.callbacks.onInteractionBlocked) {
      this.callbacks.onInteractionBlocked(data);
    }
  }

  handleInteractionCooldown(data) {
    console.log('[NetworkInteractionHandler] ⏰ Cooldown actif:', data.remainingTime + 'ms');
    
    const seconds = Math.ceil(data.remainingTime / 1000);
    this.showInteractionMessage(`Attendez ${seconds} seconde(s) avant d'interagir à nouveau`, 'warning');
  }

  handleGenericInteractionResult(data) {
    console.log('[NetworkInteractionHandler] 🔄 Traitement résultat générique');
    
    // ✅ Router selon le type
    switch (data.type) {
      case 'object':
        this.handleObjectInteractionResult(data);
        break;
        
      case 'search':
        this.handleSearchResult(data);
        break;
        
      case 'npc':
        // ✅ Déléguer au système NPC existant
        if (this.callbacks.onNpcInteraction) {
          this.callbacks.onNpcInteraction(data);
        }
        break;
        
      default:
        console.log('[NetworkInteractionHandler] ❓ Type d\'interaction inconnu:', data.type);
        
        // ✅ Callback générique
        if (this.callbacks.onInteractionSuccess) {
          this.callbacks.onInteractionSuccess(data.type, data);
        }
    }
  }

  // === GESTION D'ÉTAT ===

  canSendInteraction() {
    // ✅ Vérifications de base
    if (!this.networkManager?.isConnected || !this.networkManager?.room) {
      console.log('[NetworkInteractionHandler] 🚫 Pas connecté');
      this.showInteractionMessage('Connexion requise pour interagir', 'error');
      return false;
    }

    if (this.networkManager.isTransitioning) {
      console.log('[NetworkInteractionHandler] 🚫 Transition en cours');
      this.showInteractionMessage('Impossible d\'interagir pendant une transition', 'warning');
      return false;
    }

    // ✅ Vérification cooldown
    const now = Date.now();
    if (now - this.state.lastInteractionTime < this.state.interactionCooldown) {
      const remaining = this.state.interactionCooldown - (now - this.state.lastInteractionTime);
      console.log('[NetworkInteractionHandler] 🚫 Cooldown actif:', remaining + 'ms');
      return false;
    }

    // ✅ Vérification limite d'interactions en attente
    if (this.state.pendingInteractions.size >= this.config.maxPendingInteractions) {
      console.log('[NetworkInteractionHandler] 🚫 Trop d\'interactions en attente');
      this.showInteractionMessage('Trop d\'interactions en cours, attendez...', 'warning');
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
    
    console.log(`[NetworkInteractionHandler] 📝 Interaction trackée: ${interactionId}`);
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
      
      console.log(`[NetworkInteractionHandler] 🗑️ Interaction nettoyée: ${interactionId}`);
    }
  }

  handleInteractionTimeout(interactionId) {
    console.warn(`[NetworkInteractionHandler] ⏰ Timeout interaction: ${interactionId}`);
    
    const interaction = this.state.pendingInteractions.get(interactionId);
    if (interaction) {
      this.showInteractionMessage('Interaction expirée, réessayez', 'warning');
      this.cleanupTrackedInteraction(interactionId);
      
      // ✅ Callback d'erreur
      if (this.callbacks.onInteractionError) {
        this.callbacks.onInteractionError(interaction.type, {
          error: 'timeout',
          message: 'Interaction expirée'
        });
      }
    }
  }

  handleSendError(messageType, error) {
    console.error(`[NetworkInteractionHandler] ❌ Erreur envoi ${messageType}:`, error);
    
    this.showInteractionMessage(`Erreur lors de l'envoi: ${error.message}`, 'error');
    
    // ✅ Callback d'erreur
    if (this.callbacks.onInteractionError) {
      this.callbacks.onInteractionError(messageType, {
        error: 'send_failed',
        message: error.message,
        originalError: error
      });
    }
  }

  // === CALLBACKS PUBLICS ===

  onObjectInteraction(callback) {
    this.callbacks.onObjectInteraction = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback objectInteraction configuré');
  }

  onSearchResult(callback) {
    this.callbacks.onSearchResult = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback searchResult configuré');
  }

  onNpcInteraction(callback) {
    this.callbacks.onNpcInteraction = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback npcInteraction configuré');
  }

  onInteractionError(callback) {
    this.callbacks.onInteractionError = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback interactionError configuré');
  }

  onInteractionSuccess(callback) {
    this.callbacks.onInteractionSuccess = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback interactionSuccess configuré');
  }

  onInteractionBlocked(callback) {
    this.callbacks.onInteractionBlocked = callback;
    console.log('[NetworkInteractionHandler] 🔧 Callback interactionBlocked configuré');
  }

  // === UTILITAIRES ===

  generateInteractionId(type, data) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    let identifier = 'unknown';
    
    switch (type) {
      case 'object':
        identifier = data.objectId || 'obj';
        break;
      case 'search':
        identifier = `${data.position?.x || 0}_${data.position?.y || 0}`;
        break;
      case 'npc':
        identifier = data.npcId || 'npc';
        break;
    }
    
    return `${type}_${identifier}_${timestamp}_${random}`;
  }

  showInteractionMessage(message, type = 'info') {
    console.log(`[NetworkInteractionHandler] 💬 Message: ${message} (${type})`);
    
    // ✅ Utiliser le système de notifications global s'il existe
    if (typeof window.showGameNotification === 'function') {
      try {
        window.showGameNotification(message, type, { 
          duration: 3000,
          position: 'bottom-right'
        });
      } catch (error) {
        console.error('[NetworkInteractionHandler] ❌ Erreur notification:', error);
        console.log(`[NetworkInteractionHandler] ${type.toUpperCase()}: ${message}`);
      }
    } else {
      console.log(`[NetworkInteractionHandler] ${type.toUpperCase()}: ${message}`);
    }
  }

  // === DEBUG ET MONITORING ===

  getDebugInfo() {
    const room = this.networkManager?.room;
    const handlersCount = room?.onMessageHandlers ? Object.keys(room.onMessageHandlers.events).length : 0;
    const interactionHandlers = room?.onMessageHandlers ? Object.keys(room.onMessageHandlers.events).filter(key => 
      key.includes('interaction') || key.includes('search') || key.includes('Result')
    ) : [];

    return {
      isInitialized: this.isInitialized,
      handlersSetup: this.handlersSetup, // ✅ NOUVEAU
      counters: this.debugCounters,
      state: {
        ...this.state,
        pendingInteractionsCount: this.state.pendingInteractions.size,
        pendingInteractionIds: Array.from(this.state.pendingInteractions.keys())
      },
      config: this.config,
      networkManagerReady: !!(this.networkManager?.isConnected && this.networkManager?.room),
      roomId: this.networkManager?.room?.roomId,
      sessionId: this.networkManager?.sessionId,
      currentZone: this.networkManager?.currentZone,
      roomReadiness: this.checkRoomReadiness(), // ✅ NOUVEAU
      handlersInfo: { // ✅ NOUVEAU
        totalHandlers: handlersCount,
        interactionHandlers: interactionHandlers,
        hasObjectHandler: interactionHandlers.includes('objectInteractionResult'),
        hasSearchHandler: interactionHandlers.includes('searchResult')
      }
    };
  }

  resetDebugCounters() {
    console.log('[NetworkInteractionHandler] 🔄 Reset compteurs debug');
    
    const oldCounters = { ...this.debugCounters };
    
    this.debugCounters = {
      objectInteractions: 0,
      searchInteractions: 0,
      npcInteractions: 0,
      errorsReceived: 0,
      messagesHandled: 0,
      initializationAttempts: 0
    };
    
    console.log('[NetworkInteractionHandler] Anciens compteurs:', oldCounters);
  }

  clearPendingInteractions() {
    console.log('[NetworkInteractionHandler] 🗑️ Nettoyage interactions en attente');
    
    // ✅ Nettoyer tous les timeouts
    this.state.pendingInteractions.forEach((interaction) => {
      if (interaction.timeout) {
        clearTimeout(interaction.timeout);
      }
    });
    
    this.state.pendingInteractions.clear();
    this.state.currentInteractionId = null;
    
    console.log('[NetworkInteractionHandler] ✅ Interactions nettoyées');
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('[NetworkInteractionHandler] 💀 Destruction...');
    
    // ✅ Nettoyer les interactions en attente
    this.clearPendingInteractions();
    
    // ✅ Nettoyer les callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    // ✅ Réinitialiser l'état
    this.isInitialized = false;
    this.handlersSetup = false;
    this.networkManager = null;
    
    console.log('[NetworkInteractionHandler] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugInteractionHandler = function() {
  if (window.globalNetworkManager?.interactionHandler) {
    const info = window.globalNetworkManager.interactionHandler.getDebugInfo();
    console.log('[NetworkInteractionHandler] === DEBUG INFO ===');
    console.table(info.counters);
    console.log('[NetworkInteractionHandler] Info complète:', info);
    return info;
  } else {
    console.error('[NetworkInteractionHandler] Handler non trouvé');
    return null;
  }
};

window.resetInteractionHandlerDebug = function() {
  if (window.globalNetworkManager?.interactionHandler) {
    window.globalNetworkManager.interactionHandler.resetDebugCounters();
    console.log('[NetworkInteractionHandler] Compteurs debug reset');
    return true;
  }
  return false;
};

window.forceReinitInteractionHandlers = function() {
  if (window.globalNetworkManager?.interactionHandler) {
    const result = window.globalNetworkManager.interactionHandler.forceReinitializeHandlers();
    console.log('[NetworkInteractionHandler] Force réinit result:', result);
    return result;
  }
  return false;
};

console.log('✅ NetworkInteractionHandler chargé!');
console.log('🔍 Utilisez window.debugInteractionHandler() pour diagnostiquer');
console.log('🔄 Utilisez window.resetInteractionHandlerDebug() pour reset compteurs');
console.log('🔧 Utilisez window.forceReinitInteractionHandlers() pour force réinit handlers');
