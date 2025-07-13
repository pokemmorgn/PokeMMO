// client/src/network/BattleNetworkHandler.js - VERSION CORRIGÉE COMPLÈTE
// 🔄 COMPLÈTEMENT RECRÉE pour correspondre au serveur modernisé

/**
 * GESTIONNAIRE RÉSEAU MINIMAL ET MODERNE
 * Synchronisé avec le serveur BattleRoom + BattleIntegration
 */
export class BattleNetworkHandler {
  constructor(mainNetworkManager) {
    this.networkManager = mainNetworkManager;

    // Connexions
    this.worldRoom = null;
    this.battleRoom = null;
    this.client = null;

    // État simplifié
    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingConnection = false;

    // Système d'événements
    this.eventCallbacks = new Map();

    // Messages en attente
    this.pendingMessages = [];

    console.log('🌐 [BattleNetworkHandler] Version moderne initialisée');
  }

  // === INITIALISATION ===

  initialize(worldRoom, client) {
    console.log('🔧 [BattleNetworkHandler] Initialisation moderne...');

    if (!worldRoom) {
      console.error('❌ WorldRoom manquante');
      return false;
    }

    this.worldRoom = worldRoom;

    // Prioriser window.client
    if (window.client && typeof window.client.joinById === 'function') {
      this.client = window.client;
      console.log('✅ Client global utilisé');
    } else if (client && typeof client.joinById === 'function') {
      this.client = client;
      console.log('✅ Client fourni utilisé');
    } else {
      console.error('❌ Aucun client Colyseus valide');
      return false;
    }

    // ✅ IMMÉDIAT: Configurer les événements WorldRoom
    this.setupWorldRoomEvents();

    console.log('✅ BattleNetworkHandler moderne initialisé');
    return true;
  }

  // === ÉVÉNEMENTS WORLDROOM (SYNCHRONISÉS SERVEUR) ===

  setupWorldRoomEvents() {
    if (!this.worldRoom?.onMessage) {
      console.error('❌ worldRoom.onMessage non disponible');
      return;
    }

    console.log('📡 Configuration événements WorldRoom modernes...');

    try {
      // ✅ RENCONTRES - correspond à BattleRoom.ts
      this.networkManager.onMessage("wildEncounterStart", (data) => {
        console.log('🐾 wildEncounterStart reçu:', data);
        
        // 🎬 NOUVEAU: Déclencher la transition de combat si disponible
        const currentScene = this.networkManager?.getCurrentScene?.() || window.game?.scene?.getScene('Road1Scene');
        if (currentScene?.battleTransitionManager?.isTransitionInProgress && !currentScene.battleTransitionManager.isTransitionInProgress()) {
          console.log('🎬 [BattleNetworkHandler] Déclenchement transition de combat...');
          
          const battleData = {
            type: 'wild',
            pokemon: data.wildPokemon || data.pokemon,
            location: data.location,
            method: data.method
          };
          
          currentScene.battleTransitionManager.startBattleTransition(battleData, 'spiral');
        } else {
          // 🔄 Fallback vers l'événement normal
          this.triggerEvent('wildEncounterStart', {
            type: 'wild',
            pokemon: data.wildPokemon || data.pokemon,
            location: data.location,
            method: data.method
          });
        }
      });

      // ✅ CRÉATION BATTLEROOM - correspond aux callbacks BattleIntegration
      this.worldRoom.onMessage('battleRoomCreated', (data) => {
        console.log('🏠 battleRoomCreated reçu:', data);
        this.handleBattleRoomCreated(data);
      });

      // ✅ ERRORS ET STATUS
      this.worldRoom.onMessage('battleError', (data) => {
        console.error('❌ Erreur combat:', data);
        this.triggerEvent('battleError', data);
      });

      this.worldRoom.onMessage('encounterFailed', (data) => {
        console.error('❌ Rencontre échouée:', data);
        this.triggerEvent('battleError', { 
          message: data.message || 'Échec rencontre',
          type: 'encounter_failed'
        });
      });

      console.log('✅ Événements WorldRoom configurés');

    } catch (error) {
      console.error('❌ Erreur configuration événements:', error);
    }
  }

  // === HANDLER BATTLEROOM CREATED ===

  async handleBattleRoomCreated(data) {
    console.log('🏠 Traitement création BattleRoom moderne...');
    console.log('📊 Données reçues:', {
      battleRoomId: data.battleRoomId,
      battleType: data.battleType,
      hasPlayerPokemon: !!data.playerPokemon,
      hasOpponentPokemon: !!data.opponentPokemon
    });

    this.battleRoomId = data.battleRoomId;

    try {
      // ✅ CONNEXION AUTOMATIQUE à la BattleRoom
      console.log('🔗 Connexion automatique BattleRoom...');
      const success = await this.connectToBattleRoom(this.battleRoomId);

      if (!success) {
        console.error('❌ Échec connexion BattleRoom');
        this.triggerEvent('battleConnectionFailed', { battleRoomId: this.battleRoomId });
        return;
      }

      // ✅ NOTIFICATION avec données complètes
      this.triggerEvent('battleRoomCreated', {
        battleRoomId: this.battleRoomId,
        battleType: data.battleType,
        playerPokemon: data.playerPokemon,
        opponentPokemon: data.opponentPokemon,
        wildPokemon: data.wildPokemon,
        location: data.location,
        currentZone: data.currentZone
      });

      console.log('✅ BattleRoom créée et connectée');

    } catch (error) {
      console.error('💥 Erreur traitement BattleRoom:', error);
    }
  }

  // === CONNEXION BATTLEROOM ===

  async connectToBattleRoom(battleRoomId) {
    console.log(`🔗 Connexion BattleRoom: ${battleRoomId}`);

    if (!battleRoomId || this.pendingConnection) {
      console.warn('⚠️ Connexion impossible');
      return false;
    }

    this.pendingConnection = true;

    try {
      // ✅ Vérification client
      if (!this.client?.joinById) {
        if (window.client?.joinById) {
          this.client = window.client;
        } else {
          throw new Error('Client Colyseus invalide');
        }
      }

      // ✅ Options de connexion avec identité préservée
      const joinOptions = {
        worldSessionId: this.worldRoom?.sessionId,
        playerName: this.worldRoom?.state?.players?.get(this.worldRoom.sessionId)?.name || 'Joueur'
      };

      console.log('🚀 Tentative joinById avec options:', joinOptions);

      // ✅ CONNEXION
      this.battleRoom = await this.client.joinById(battleRoomId, joinOptions);

      if (!this.battleRoom) {
        throw new Error('BattleRoom null reçue');
      }

      console.log('✅ Connecté à BattleRoom:', {
        id: this.battleRoom.id,
        sessionId: this.battleRoom.sessionId
      });

      // ✅ Configuration événements BattleRoom
      this.setupBattleRoomEvents();

      this.isConnectedToBattle = true;
      this.pendingConnection = false;

      // ✅ Traiter messages en attente
      this.processPendingMessages();

      // ✅ Notification connexion réussie
      this.triggerEvent('battleRoomConnected', {
        battleRoomId,
        room: this.battleRoom
      });

      return true;

    } catch (error) {
      console.error('❌ Erreur connexion BattleRoom:', error);
      this.pendingConnection = false;

      this.triggerEvent('battleConnectionError', {
        error: error.message,
        battleRoomId
      });

      return false;
    }
  }

  // === ÉVÉNEMENTS BATTLEROOM (SYNCHRONISÉS SERVEUR) ===

  setupBattleRoomEvents() {
    if (!this.battleRoom) return;

    console.log('⚔️ Configuration événements BattleRoom modernes...');

    try {
      // ✅ ÉVÉNEMENTS COMBAT ESSENTIELS - correspondent aux callbacks BattleRoom.ts

      
      // ✅ CRITICAL: ActionResult - pour synchronisation HP
      this.battleRoom.onMessage('actionResult', (data) => {
        console.log('🎮 [NETWORK] actionResult reçu:', data);
        this.triggerEvent('actionResult', data);
      });

      this.battleRoom.onMessage('narrativeStart', (data) => {
      console.log('📖 [NETWORK] narrativeStart reçu:', data);
      this.triggerEvent('narrativeStart', data);
    });

    // ✅ Fin narration - Début combat
    this.battleRoom.onMessage('narrativeEnd', (data) => {
      console.log('📖→⚔️ [NETWORK] narrativeEnd reçu:', data);
      this.triggerEvent('narrativeEnd', data);
    });
    
    // ✅ IA en réflexion
    this.battleRoom.onMessage('aiThinking', (data) => {
      console.log('🤖 [NETWORK] aiThinking reçu:', data);
      this.triggerEvent('aiThinking', data);
    });
      // ✅ CRITICAL: TurnChanged - pour gestion des tours
      this.battleRoom.onMessage('turnChanged', (data) => {
        console.log('🔄 [NETWORK] turnChanged reçu:', data.currentTurn);
        this.triggerEvent('turnChanged', data);
      });
      
      // ✅ CRITICAL: YourTurn - UN SEUL handler
      this.battleRoom.onMessage('yourTurn', (data) => {
        console.log('🎯 [NETWORK] yourTurn reçu:', data);
        console.log('🎯 Déclenchement événement yourTurn...');
        this.triggerEvent('yourTurn', data);
        
        // Debug supplémentaire
        console.log('🎯 yourTurn événement déclenché, callbacks:', this.eventCallbacks.get('yourTurn')?.length || 0);
      });

            // === ✅ ÉVÉNEMENTS BROADCAST MANAGER (NOUVEAU) ===
      this.battleRoom.onMessage('battleEvent', (event) => {
        console.log('⚔️ [NETWORK] battleEvent reçu:', event.eventId, event.data);
        
        // Déclencher l'événement spécifique
        this.triggerEvent(event.eventId, event.data);
        
        // Déclencher aussi l'événement générique
        this.triggerEvent('battleEvent', event);
      });
      
      // ✅ EVENTS DE BATAILLE
      this.battleRoom.onMessage('battleJoined', (data) => {
        console.log('⚔️ [NETWORK] battleJoined:', data);
        this.triggerEvent('battleJoined', data);
      });

      this.battleRoom.onMessage('battleStart', (data) => {
        console.log('⚔️ [NETWORK] battleStart:', data);
        this.triggerEvent('battleStart', data);
      });

      this.battleRoom.onMessage('phaseChange', (data) => {
        console.log('🔄 [NETWORK] phaseChange:', data.phase);
        this.triggerEvent('phaseChange', data);
      });

      // ✅ MESSAGES DE COMBAT - correspond aux broadcastMessage
      this.battleRoom.onMessage('battleMessage', (data) => {
        console.log('💬 [NETWORK] battleMessage:', data.message);
        this.triggerEvent('battleMessage', data);
      });

      // ✅ MISES À JOUR HP - correspond aux callbacks updatePokemonHP
      this.battleRoom.onMessage('pokemonHPUpdate', (data) => {
        console.log('💖 [NETWORK] pokemonHPUpdate:', data);
        this.triggerEvent('pokemonHPUpdate', data);
      });

      // ✅ FIN DE COMBAT - correspond aux BattleEndManager
      this.battleRoom.onMessage('battleEnd', (data) => {
        console.log('🏁 [NETWORK] battleEnd:', data);
        this.triggerEvent('battleEnd', data);
      });

      this.battleRoom.onMessage('battleEndWithRewards', (data) => {
        console.log('🏁 [NETWORK] battleEndWithRewards:', data);
        this.triggerEvent('battleEndWithRewards', data);

        // Programmer déconnexion
        setTimeout(() => {
          this.disconnectFromBattleRoom();
        }, 3000);
      });

      // ✅ GESTION D'ERREURS
      this.battleRoom.onMessage('battleError', (data) => {
        console.error('❌ [NETWORK] battleError:', data);
        this.triggerEvent('battleError', data);
      });

      // ✅ INTERRUPTIONS
      this.battleRoom.onMessage('battleInterrupted', (data) => {
        console.log('⚠️ [NETWORK] battleInterrupted:', data);
        this.triggerEvent('battleInterrupted', data);
        this.disconnectFromBattleRoom();
      });

      // ✅ NOUVEAUX HANDLERS POUR SYNCHRONISATION COMPLÈTE
      this.battleRoom.onMessage('battleStateUpdate', (data) => {
        console.log('📊 [NETWORK] battleStateUpdate:', data);
        this.triggerEvent('battleStateUpdate', data);
      });

      this.battleRoom.onMessage('attackAnimation', (data) => {
        console.log('⚔️ [NETWORK] attackAnimation:', data);
        this.triggerEvent('attackAnimation', data);
      });

      this.battleRoom.onMessage('damageDealt', (data) => {
        console.log('💥 [NETWORK] damageDealt:', data);
        this.triggerEvent('damageDealt', data);
      });

      // ✅ HANDLER GÉNÉRIQUE pour messages non capturés
      this.battleRoom.onMessage('message', (data) => {
        console.log('💬 [NETWORK] message générique:', data);
        this.triggerEvent('message', data);
      });

      // ✅ ÉVÉNEMENTS DE CONNEXION
      this.battleRoom.onStateChange((state) => {
        // Ne pas loguer le state complet pour éviter le spam
        this.triggerEvent('battleStateChange', { state });
      });

      this.battleRoom.onLeave((code) => {
        console.log(`👋 [NETWORK] BattleRoom quittée (${code})`);
        this.handleBattleRoomDisconnect(code);
      });

      this.battleRoom.onError((code, message) => {
        console.error(`❌ [NETWORK] Erreur BattleRoom: ${code} - ${message}`);
        this.triggerEvent('battleRoomError', { code, message });
      });

      // ✅ CATCH-ALL pour debug (si supporté par Colyseus)
      try {
        this.battleRoom.onMessage('*', (type, data) => {
          console.log(`🌟 [NETWORK] [CATCH-ALL] ${type}:`, data);
          // Retransmettre tous les événements non capturés
          this.triggerEvent(type, data);
        });
      } catch (error) {
        console.log('ℹ️ [NETWORK] Catch-all non supporté par cette version de Colyseus');
      }

      console.log('✅ Événements BattleRoom configurés avec handlers étendus');

    } catch (error) {
      console.error('❌ Erreur configuration événements BattleRoom:', error);
    }
  }

  handleBattleRoomDisconnect(code) {
    console.log(`👋 [NETWORK] Déconnexion BattleRoom: ${code}`);

    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;

    this.triggerEvent('battleRoomDisconnected', { code });
  }

  // === ENVOI DE MESSAGES (SYNCHRONISÉS SERVEUR) ===

  /**
   * ✅ Envoie vers WorldRoom
   */
  sendToWorld(messageType, data = {}) {
    if (!this.worldRoom) {
      console.error('❌ WorldRoom non connectée');
      return false;
    }

    try {
      this.worldRoom.send(messageType, data);
      console.log(`📤➡️ WorldRoom: ${messageType}`, data);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi WorldRoom:`, error);
      return false;
    }
  }

  /**
   * ✅ Envoie vers BattleRoom - correspond aux handlers BattleRoom.ts
   */
  sendToBattle(messageType, data = {}) {
    if (!this.isConnectedToBattle || !this.battleRoom) {
      console.warn(`⚠️ BattleRoom non connectée, mise en attente: ${messageType}`);
      this.pendingMessages.push({ messageType, data, timestamp: Date.now() });
      return false;
    }

    try {
      this.battleRoom.send(messageType, data);
      console.log(`📤⚔️ BattleRoom: ${messageType}`, data);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi BattleRoom:`, error);
      return false;
    }
  }

  /**
   * ✅ Traite les messages en attente
   */
  processPendingMessages() {
    if (this.pendingMessages.length === 0) return;

    console.log(`📤 Traitement ${this.pendingMessages.length} messages en attente...`);

    const now = Date.now();
    const validMessages = this.pendingMessages.filter(msg => (now - msg.timestamp) < 30000);

    validMessages.forEach(({ messageType, data }) => {
      this.sendToBattle(messageType, data);
    });

    this.pendingMessages = [];
    console.log(`✅ ${validMessages.length} messages traités`);
  }

  // === ACTIONS DE COMBAT (SYNCHRONISÉES SERVEUR) ===

  /**
   * ✅ Demande de combat sauvage - correspond à startWildBattle WorldRoom
   */
  requestWildBattle(wildPokemonData) {
    console.log('🐾 Demande combat sauvage:', wildPokemonData);
    return this.sendToWorld('startWildBattle', {
      wildPokemon: wildPokemonData.pokemon || wildPokemonData,
      location: wildPokemonData.location || 'unknown',
      method: wildPokemonData.method || 'manual'
    });
  }

  /**
   * ✅ Choix de Pokémon - correspond au handler choosePokemon
   */
  choosePokemon(pokemonId) {
    console.log('🔄 Choix Pokémon:', pokemonId);
    return this.sendToBattle('choosePokemon', { pokemonId });
  }

  /**
   * ✅ Action de combat - correspond au handler battleAction
   */
  performBattleAction(actionType, actionData = {}) {
    console.log('🎮 Action combat:', actionType, actionData);
    return this.sendToBattle('battleAction', {
      actionType,
      ...actionData
    });
  }

  /**
   * ✅ Utiliser une attaque - correspond au processAction avec 'attack'
   */
  useMove(moveId) {
    console.log('⚔️ Utilisation attaque:', moveId);
    return this.performBattleAction('attack', { moveId });
  }

  /**
   * ✅ Utiliser un objet - correspond au processAction avec 'item'
   */
  useItem(itemId, targetId = null) {
    console.log('🎒 Utilisation objet:', itemId);
    return this.performBattleAction('item', { itemId, targetId });
  }

  /**
   * ✅ Changer de Pokémon - correspond au processAction avec 'switch'
   */
  switchPokemon(newPokemonId) {
    console.log('🔄 Changement Pokémon:', newPokemonId);
    return this.performBattleAction('switch', { targetPokemonId: newPokemonId });
  }

  /**
   * ✅ Tentative de fuite - correspond au handler attemptFlee
   */
  attemptRun() {
    console.log('🏃 Tentative fuite');
    return this.sendToBattle('attemptFlee', {});
  }

  /**
   * ✅ Tentative de capture - correspond au handler attemptCapture
   */
  attemptCapture(ballType) {
    console.log('🎯 Tentative capture:', ballType);
    return this.sendToBattle('attemptCapture', { ballType });
  }

  /**
   * ✅ Quitter le combat - correspond aux handlers de fin
   */
  leaveBattle(reason = 'manual') {
    console.log('🚪 Quitter combat:', reason);

    this.sendToWorld('leaveBattle', {
      battleRoomId: this.battleRoomId,
      reason
    });

    this.disconnectFromBattleRoom();
    return true;
  }

  // === DÉCONNEXION ===

  async disconnectFromBattleRoom() {
    if (!this.battleRoom) {
      console.log('ℹ️ Aucune BattleRoom à déconnecter');
      return;
    }

    try {
      await this.battleRoom.leave();
      console.log('✅ BattleRoom quittée proprement');
    } catch (error) {
      console.warn('⚠️ Erreur déconnexion BattleRoom:', error);
    }

    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;
    this.pendingMessages = [];
  }

  // === SYSTÈME D'ÉVÉNEMENTS ===

  on(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName).push(callback);
    console.log(`📝 [EVENTS] Handler ajouté pour '${eventName}' (total: ${this.eventCallbacks.get(eventName).length})`);
  }

  off(eventName, callback) {
    if (this.eventCallbacks.has(eventName)) {
      const callbacks = this.eventCallbacks.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`📝 [EVENTS] Handler retiré pour '${eventName}' (restants: ${callbacks.length})`);
      }
    }
  }

  triggerEvent(eventName, data = {}) {
    console.log(`🔔 [EVENT] ${eventName}`, data);
    if (this.eventCallbacks.has(eventName)) {
      const callbacks = this.eventCallbacks.get(eventName);
      console.log(`🔔 [EVENT] Déclenchement de ${callbacks.length} callback(s) pour '${eventName}'`);
      
      callbacks.forEach((callback, index) => {
        try {
          console.log(`🔔 [EVENT] Exécution callback ${index + 1}/${callbacks.length} pour '${eventName}'`);
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur callback ${index + 1} pour ${eventName}:`, error);
        }
      });
    } else {
      console.log(`⚠️ [EVENT] Aucun callback pour '${eventName}'`);
    }
  }

  // === ÉTAT ET DEBUG ===

  getConnectionStatus() {
    return {
      worldRoom: {
        connected: !!this.worldRoom,
        id: this.worldRoom?.id || null
      },
      battleRoom: {
        connected: this.isConnectedToBattle,
        id: this.battleRoomId,
        pending: this.pendingConnection
      },
      client: {
        available: !!this.client,
        hasJoinById: typeof this.client?.joinById === 'function'
      },
      pendingMessages: this.pendingMessages.length,
      eventListeners: Array.from(this.eventCallbacks.keys())
    };
  }

  canSendBattleActions() {
    return this.isConnectedToBattle && this.battleRoom && !this.pendingConnection;
  }

  debug() {
    console.log('🔍 === DEBUG BATTLE NETWORK HANDLER ===');
    const status = this.getConnectionStatus();
    console.log('📊 État:', status);
    console.log('📋 Événements écoutés:', Array.from(this.eventCallbacks.keys()));
    console.log('📤 Messages en attente:', this.pendingMessages.length);
    
    // Debug détaillé des callbacks
    this.eventCallbacks.forEach((callbacks, eventName) => {
      console.log(`📝 [DEBUG] '${eventName}': ${callbacks.length} callback(s)`);
    });
    
    return status;
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 Destruction BattleNetworkHandler...');

    await this.disconnectFromBattleRoom();

    this.worldRoom = null;
    this.client = null;
    this.networkManager = null;
    this.eventCallbacks.clear();
    this.pendingMessages = [];

    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingConnection = false;

    console.log('✅ BattleNetworkHandler détruit');
  }
}

// === FONCTIONS DE TEST AMÉLIORÉES ===

/**
 * Test de connexion basique
 */
window.testBattleNetwork = function() {
  console.log('🧪 === TEST BATTLE NETWORK ===');
  
  const mockWorldRoom = {
    id: 'test_world',
    sessionId: 'test_session',
    onMessage: (type, callback) => {
      console.log(`📝 Mock onMessage: ${type}`);
    },
    send: (type, data) => {
      console.log(`📤 Mock send: ${type}`, data);
    }
  };

  const handler = new BattleNetworkHandler(null);
  const success = handler.initialize(mockWorldRoom, window.client);
  
  console.log(`Résultat: ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  console.log('État:', handler.getConnectionStatus());
  
  return handler;
};

/**
 * Test debug complet
 */
window.debugBattleNetworkHandler = function() {
  console.log('🔍 === DEBUG BATTLE NETWORK HANDLER ===');
  
  const handler = window.battleSystem?.battleConnection?.networkHandler;
  if (handler) {
    handler.debug();
  } else {
    console.error('❌ BattleNetworkHandler non trouvé');
    console.log('🔍 Chemins testés:');
    console.log('   window.battleSystem:', !!window.battleSystem);
    console.log('   window.battleSystem?.battleConnection:', !!window.battleSystem?.battleConnection);
  }
};

/**
 * Simulation d'un combat
 */
window.simulateBattle = function() {
  console.log('🎮 === SIMULATION COMBAT ===');
  
  const handler = window.testBattleNetwork();
  
  if (handler.getConnectionStatus().worldRoom.connected) {
    // Simuler une demande de combat
    handler.requestWildBattle({
      pokemon: { pokemonId: 25, level: 5, name: 'Pikachu' },
      location: 'test_route_1'
    });
    
    console.log('✅ Demande de combat envoyée');
  } else {
    console.log('❌ WorldRoom non connectée');
  }
};

console.log('✅ BattleNetworkHandler MODERNE CORRIGÉ chargé !');
console.log('🔧 Corrections apportées:');
console.log('   ✅ Duplication yourTurn supprimée');
console.log('   ✅ Handlers manquants ajoutés');
console.log('   ✅ Logs de debug améliorés');
console.log('   ✅ Gestion d\'erreurs renforcée');
console.log('');
console.log('🧪 Tests disponibles:');
console.log('   window.testBattleNetwork() - Test connexion');
console.log('   window.debugBattleNetworkHandler() - Debug complet');
console.log('   window.simulateBattle() - Simulation combat');
console.log('🚀 Prêt pour intégration avec BattleIntegration !');
