// client/src/network/BattleNetworkHandler.js - Version complète corrigée avec timing

/**
 * Gestionnaire réseau spécialisé pour le système de combat
 * ✅ CORRECTION: Configuration immédiate des événements pour éviter les "onMessage not registered"
 */
export class BattleNetworkHandler {
  constructor(mainNetworkManager) {
    this.networkManager = mainNetworkManager;

    // Connexions
    this.worldRoom = null;      // Référence vers WorldRoom
    this.battleRoom = null;     // Connexion BattleRoom dédiée
    this.client = null;         // Client Colyseus

    // État
    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingConnection = false;

    // Callbacks d'événements
    this.eventCallbacks = new Map();

    // Messages en attente si pas encore connecté
    this.pendingMessages = [];

    // Flags pour éviter les appels multiples
    this._leavingBattle = false;
    this._isDisconnecting = false;

    console.log('[DEBUG NETWORK BATTLE] 🌐 BattleNetworkHandler Initialisé');
  }

  // === INITIALISATION IMMÉDIATE ===

  /**
   * ✅ CORRECTION CRITIQUE: Initialise et configure les événements IMMÉDIATEMENT
   */
  initialize(worldRoom, client) {
    console.log('[DEBUG NETWORK BATTLE] 🔧 Initialisation IMMÉDIATE...');

    if (!worldRoom) {
      console.error('[DEBUG NETWORK BATTLE] ❌ WorldRoom manquante');
      return false;
    }

    this.worldRoom = worldRoom;

    // ✅ CORRECTION: Prioriser window.client puis le client passé
    if (window.client && typeof window.client.joinById === 'function') {
      this.client = window.client;
      console.log('[DEBUG NETWORK BATTLE] ✅ Utilisation client global (window.client)');
    } else if (client && typeof client.joinById === 'function') {
      this.client = client;
      console.log('[DEBUG NETWORK BATTLE] ✅ Utilisation client fourni');
    } else {
      console.error('[DEBUG NETWORK BATTLE] ❌ Aucun client Colyseus valide disponible');
      console.log('[DEBUG NETWORK BATTLE] 🔍 Debug clients:', {
        windowClient: !!window.client,
        windowClientType: typeof window.client,
        windowClientJoinById: typeof window.client?.joinById,
        providedClient: !!client,
        providedClientType: typeof client,
        providedClientJoinById: typeof client?.joinById
      });
      return false;
    }

    // ✅ CORRECTION CRITIQUE: Configurer les événements IMMÉDIATEMENT
    // AVANT que le serveur puisse envoyer des messages
    this.setupWorldRoomBattleEvents();

    console.log('[DEBUG NETWORK BATTLE] ✅ Initialisé avec événements configurés IMMÉDIATEMENT');
    return true;
  }

  // === ÉVÉNEMENTS WORLDROOM (CONFIGURÉS IMMÉDIATEMENT) ===

  setupWorldRoomBattleEvents() {
    if (!this.worldRoom) {
      console.error('[DEBUG NETWORK BATTLE] ❌ Pas de WorldRoom pour configurer événements');
      return;
    }

    console.log('[DEBUG NETWORK BATTLE] 📡 Configuration IMMÉDIATE événements WorldRoom...');

    // ✅ CORRECTION: Vérifier que onMessage existe
    if (typeof this.worldRoom.onMessage !== 'function') {
      console.error('[DEBUG NETWORK BATTLE] ❌ worldRoom.onMessage n\'est pas une fonction:', typeof this.worldRoom.onMessage);
      console.log('[DEBUG NETWORK BATTLE] 🔍 WorldRoom keys:', Object.keys(this.worldRoom).slice(0, 10));
      return;
    }

    try {
      // === RENCONTRES ET CRÉATION DE COMBAT ===

      this.worldRoom.onMessage('wildEncounterStart', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🐾 wildEncounterStart reçu:', data);
        this.handleWildEncounterStart(data);
      });

        this.worldRoom.onMessage('battleRoomCreated', (data) => {
          console.log('[DEBUG NETWORK BATTLE] 🏠 battleRoomCreated reçu:', data);
          // Pour un log ultra verbeux :
          console.log('[DEBUG ULTRA BATTLE DATA]', JSON.stringify(data, null, 2));
          this.handleBattleRoomCreated(data);
        });


      this.worldRoom.onMessage('joinBattleRoom', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🚪 joinBattleRoom reçu:', data);
        this.handleJoinBattleRoomRequest(data);
      });

      // === GESTION DES ERREURS ===

      this.worldRoom.onMessage('battleError', (data) => {
        console.error('[DEBUG NETWORK BATTLE] ❌ Erreur combat WorldRoom:', data);
        this.triggerEvent('battleError', data);
      });

      this.worldRoom.onMessage('encounterFailed', (data) => {
        console.error('[DEBUG NETWORK BATTLE] ❌ encounterFailed reçu:', data);
        this.triggerEvent('battleError', { 
          message: data.message || 'Échec rencontre',
          type: 'encounter_failed'
        });
      });

      this.worldRoom.onMessage('battleLeft', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 👋 battleLeft reçu:', data);
        this.handleBattleLeftFromWorld(data);
      });

      // === STATUTS ET NOTIFICATIONS ===

      this.worldRoom.onMessage('battleStatus', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 📊 battleStatus reçu:', data);
        this.triggerEvent('battleStatusUpdate', data);
      });

      this.worldRoom.onMessage('canBattleResult', (data) => {
        console.log('[DEBUG NETWORK BATTLE] ✅ canBattleResult reçu:', data);
        this.triggerEvent('canBattleResult', data);
      });

      this.worldRoom.onMessage('battleDeclined', (data) => {
        console.log('[DEBUG NETWORK BATTLE] ❌ battleDeclined reçu:', data);
        this.triggerEvent('battleDeclined', data);
      });

      // === RÉCOMPENSES ===

      this.worldRoom.onMessage('rewardsClaimed', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🎁 rewardsClaimed reçu:', data);
        this.triggerEvent('rewardsClaimed', data);
      });

      this.worldRoom.onMessage('rewardsError', (data) => {
        console.error('[DEBUG NETWORK BATTLE] ❌ rewardsError reçu:', data);
        this.triggerEvent('rewardsError', data);
      });

      // === DEBUG ===

      this.worldRoom.onMessage('battleDebugInfo', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🔍 battleDebugInfo reçu:', data);
        this.triggerEvent('battleDebugInfo', data);
      });

      console.log('[DEBUG NETWORK BATTLE] ✅ Événements WorldRoom configurés IMMÉDIATEMENT');

    } catch (error) {
      console.error('[DEBUG NETWORK BATTLE] ❌ Erreur configuration événements WorldRoom:', error);
    }
  }

  // === HANDLERS DES ÉVÉNEMENTS WORLDROOM ===

  handleWildEncounterStart(data) {
    console.log('[DEBUG NETWORK BATTLE] 🐾 Traitement rencontre sauvage...', data);

    // Notifier le système de combat
    this.triggerEvent('wildEncounterStart', {
      type: 'wild',
      pokemon: data.wildPokemon || data.pokemon,
      location: data.location,
      method: data.method,
      message: data.message
    });
  }

async handleBattleRoomCreated(data) {
  console.log('[BUGPOKEMON] 📥 RÉCEPTION battleRoomCreated:', data);
  console.log('[BUGPOKEMON] 📋 Clés reçues:', Object.keys(data));
  console.log('[BUGPOKEMON] 👤 playerPokemon:', data.playerPokemon);
  console.log('[BUGPOKEMON] 🔍 SERVEUR data.opponentPokemon COMPLET:', JSON.stringify(data.opponentPokemon, null, 2));
  console.log('[BUGPOKEMON] 🔍 data.wildPokemon:', data.wildPokemon);
  
  console.log('[DEBUG NETWORK BATTLE] 🏠 Traitement création BattleRoom...', data);
  
  // ✅ DEBUG: Vérifier les données
  console.log('[DEBUG] data.playerPokemon existe ?', !!data.playerPokemon);
  console.log('[DEBUG] data.wildPokemon existe ?', !!data.wildPokemon);
  console.log('[DEBUG] Avant triggerEvent...');
  
  this.battleRoomId = data.battleRoomId;

  // Notifier la création
  this.triggerEvent('battleRoomCreated', {
    battleRoomId: this.battleRoomId,
    battleType: data.battleType,
    playerPokemon: data.playerPokemon,
    wildPokemon: data.wildPokemon
  });
  
  console.log('[DEBUG] Après triggerEvent...');

    // Connexion automatique
    const success = await this.connectToBattleRoom(this.battleRoomId);
    if (!success) {
      console.error('[DEBUG NETWORK BATTLE] ❌ Échec connexion auto BattleRoom');
      this.triggerEvent('battleConnectionFailed', { battleRoomId: this.battleRoomId });
    }
  }

  async handleJoinBattleRoomRequest(data) {
    console.log('[DEBUG NETWORK BATTLE] 🚪 Demande rejoindre BattleRoom...', data);

    if (!this.isConnectedToBattle && data.battleRoomId) {
      await this.connectToBattleRoom(data.battleRoomId);
    }

    this.triggerEvent('joinBattleRoomRequested', data);
  }

  handleBattleLeftFromWorld(data) {
    console.log('[DEBUG NETWORK BATTLE] 👋 Combat quitté depuis WorldRoom...', data);

    // Nettoyer la connexion BattleRoom
    this.disconnectFromBattleRoom();

    this.triggerEvent('battleLeft', {
      reason: data.reason || 'server_request',
      message: data.message
    });
  }

  // === CONNEXION À LA BATTLEROOM ===

  async connectToBattleRoom(battleRoomId) {
    if (!battleRoomId) {
      console.error('[DEBUG NETWORK BATTLE] ❌ battleRoomId manquant');
      return false;
    }

    if (this.pendingConnection) {
      console.warn('[DEBUG NETWORK BATTLE] ⚠️ Connexion déjà en cours');
      return false;
    }

    console.log(`[DEBUG NETWORK BATTLE] 🔗 Connexion à BattleRoom: ${battleRoomId}`);
    this.pendingConnection = true;

    try {
      // ✅ Double vérification du client
      if (!this.client || typeof this.client.joinById !== 'function') {
        console.error('[DEBUG NETWORK BATTLE] ❌ Client invalide:', typeof this.client);

        // Tentative récupération
        if (window.client && typeof window.client.joinById === 'function') {
          console.log('[DEBUG NETWORK BATTLE] 🔄 Récupération client global automatique');
          this.client = window.client;
        } else {
          throw new Error('Aucun client Colyseus valide disponible');
        }
      }

      console.log(`[DEBUG NETWORK BATTLE] 🎯 Client utilisé:`, {
        hasJoinById: typeof this.client.joinById === 'function',
        clientKeys: Object.keys(this.client).slice(0, 5),
        isGlobalClient: this.client === window.client
      });

      // Connexion
      console.log(`[DEBUG NETWORK BATTLE] 🚀 Tentative joinById(${battleRoomId})`);
      this.battleRoom = await this.client.joinById(battleRoomId);

      if (!this.battleRoom) {
        throw new Error('BattleRoom reçue null');
      }

      console.log(`[DEBUG NETWORK BATTLE] ✅ Connecté à BattleRoom: ${battleRoomId}`);
      console.log(`[DEBUG NETWORK BATTLE] 🎮 Room info:`, {
        id: this.battleRoom.id,
        sessionId: this.battleRoom.sessionId,
        name: this.battleRoom.name
      });

      // Configuration des événements BattleRoom
      this.setupBattleRoomEvents();

      this.isConnectedToBattle = true;
      this.pendingConnection = false;

      // Envoyer les messages en attente
      this.processPendingMessages();

      // Notifier la connexion réussie
      this.triggerEvent('battleRoomConnected', {
        battleRoomId: battleRoomId,
        room: this.battleRoom
      });

      return true;

    } catch (error) {
      console.error('[DEBUG NETWORK BATTLE] ❌ Erreur connexion BattleRoom:', error);
      this.pendingConnection = false;

      this.triggerEvent('battleConnectionError', {
        error: error.message || 'Connection failed',
        battleRoomId: battleRoomId,
        details: error.toString()
      });

      return false;
    }
  }

  // === ÉVÉNEMENTS BATTLEROOM ===

  setupBattleRoomEvents() {
    if (!this.battleRoom) return;

    console.log('[DEBUG NETWORK BATTLE] ⚔️ Configuration événements BattleRoom...');

    try {
      // === ÉVÉNEMENTS DE COMBAT ===

      this.battleRoom.onMessage('battleJoined', (data) => {
        console.log('[DEBUG NETWORK BATTLE] ⚔️ battleJoined:', data);
        this.triggerEvent('battleJoined', data);
      });

      this.battleRoom.onMessage('phaseChange', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🔄 phaseChange:', data.phase);
        this.triggerEvent('phaseChange', data);
      });

      this.battleRoom.onMessage('battleStart', (data) => {
        console.log('[DEBUG NETWORK BATTLE] ⚔️ battleStart:', data);
        this.triggerEvent('battleStart', data);
      });

      this.battleRoom.onMessage('turnChange', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🔄 turnChange:', data);
        this.triggerEvent('turnChange', data);
      });

      this.battleRoom.onMessage('battleMessage', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 💬 battleMessage:', data.message);
        this.triggerEvent('battleMessage', data);
      });

      this.battleRoom.onMessage('battleEnd', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🏁 battleEnd:', data);
        this.triggerEvent('battleEnd', data);

        // Programmer la déconnexion
        setTimeout(() => {
          this.disconnectFromBattleRoom();
        }, 3000);
      });

      this.battleRoom.onMessage('battleInterrupted', (data) => {
        console.log('[DEBUG NETWORK BATTLE] ⚠️ battleInterrupted:', data);
        this.triggerEvent('battleInterrupted', data);
        this.disconnectFromBattleRoom();
      });

      // === ÉVÉNEMENTS D'ACTIONS ===

      this.battleRoom.onMessage('attackResult', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 💥 attackResult:', data);
        this.triggerEvent('attackResult', data);
      });

      this.battleRoom.onMessage('captureShake', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🎯 captureShake:', data);
        this.triggerEvent('captureShake', data);
      });

      this.battleRoom.onMessage('captureResult', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🎯 captureResult:', data);
        this.triggerEvent('captureResult', data);
      });

      this.battleRoom.onMessage('pokemonFainted', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 😵 pokemonFainted:', data);
        this.triggerEvent('pokemonFainted', data);
      });

      this.battleRoom.onMessage('statusEffectApplied', (data) => {
        console.log('[DEBUG NETWORK BATTLE] 🌡️ statusEffectApplied:', data);
        this.triggerEvent('statusEffectApplied', data);
      });

      // === ÉVÉNEMENTS DE CONNEXION ===

      this.battleRoom.onStateChange((state) => {
        this.triggerEvent('battleStateChange', { state });
      });

      this.battleRoom.onLeave((code) => {
        console.log(`[DEBUG NETWORK BATTLE] 👋 onLeave BattleRoom (${code})`);
        this.handleBattleRoomDisconnect(code);
      });

      this.battleRoom.onError((code, message) => {
        console.error(`[DEBUG NETWORK BATTLE] ❌ Erreur BattleRoom: ${code} - ${message}`);
        this.triggerEvent('battleRoomError', { code, message });
      });

      console.log('[DEBUG NETWORK BATTLE] ✅ Événements BattleRoom configurés');

    } catch (error) {
      console.error('[DEBUG NETWORK BATTLE] ❌ Erreur configuration événements BattleRoom:', error);
    }
  }

  handleBattleRoomDisconnect(code) {
    console.log(`[DEBUG NETWORK BATTLE] 👋 Déconnexion BattleRoom: ${code}`);

    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;

    this.triggerEvent('battleRoomDisconnected', { code });
  }

  // === ENVOI DE MESSAGES ===

  /**
   * Envoie un message à la WorldRoom
   */
  sendToWorld(messageType, data = {}) {
    if (!this.worldRoom) {
      console.error('[DEBUG NETWORK BATTLE] ❌ WorldRoom non connectée');
      return false;
    }

    // Log du readyState si dispo (pour debug profond)
    if (this.worldRoom.connection?.ws) {
      console.log('[DEBUG NETWORK BATTLE] [WS WorldRoom] readyState =', this.worldRoom.connection.ws.readyState);
    }

    try {
      this.worldRoom.send(messageType, data);
      console.log(`[DEBUG NETWORK BATTLE] 📤➡️ → WorldRoom: ${messageType}`, data);
      return true;
    } catch (error) {
      console.error(`[DEBUG NETWORK BATTLE] ❌ Erreur envoi WorldRoom:`, error);
      return false;
    }
  }

  /**
   * Envoie un message à la BattleRoom
   */
  sendToBattle(messageType, data = {}) {
    if (!this.isConnectedToBattle || !this.battleRoom) {
      console.warn(`[DEBUG NETWORK BATTLE] ⚠️ BattleRoom non connectée, mise en attente: ${messageType}`);
      this.pendingMessages.push({ messageType, data, timestamp: Date.now() });
      return false;
    }

    // Log du readyState si dispo (pour debug profond)
    if (this.battleRoom.connection?.ws) {
      console.log('[DEBUG NETWORK BATTLE] [WS BattleRoom] readyState =', this.battleRoom.connection.ws.readyState);
    }

    try {
      this.battleRoom.send(messageType, data);
      console.log(`[DEBUG NETWORK BATTLE] 📤⚔️ → BattleRoom: ${messageType}`, data);
      return true;
    } catch (error) {
      console.error(`[DEBUG NETWORK BATTLE] ❌ Erreur envoi BattleRoom:`, error);
      return false;
    }
  }

  /**
   * Traite les messages en attente après connexion BattleRoom
   */
  processPendingMessages() {
    if (this.pendingMessages.length === 0) return;

    console.log(`[DEBUG NETWORK BATTLE] 📤 Traitement ${this.pendingMessages.length} messages en attente...`);

    // Filtrer les messages trop anciens (>30s)
    const now = Date.now();
    const validMessages = this.pendingMessages.filter(msg => (now - msg.timestamp) < 30000);

    validMessages.forEach(({ messageType, data }) => {
      this.sendToBattle(messageType, data);
    });

    this.pendingMessages = [];

    console.log(`[DEBUG NETWORK BATTLE] ✅ ${validMessages.length} messages traités`);
  }

  // === ACTIONS DE COMBAT SPÉCIFIQUES ===

  requestWildBattle(wildPokemonData) {
    console.log('[DEBUG NETWORK BATTLE] [API] requestWildBattle', wildPokemonData);
    return this.sendToWorld('startWildBattle', {
      wildPokemon: wildPokemonData.pokemon || wildPokemonData,
      location: wildPokemonData.location || 'unknown',
      method: wildPokemonData.method || 'manual'
    });
  }

  choosePokemon(pokemonId) {
    console.log('[DEBUG NETWORK BATTLE] [API] choosePokemon', pokemonId);
    return this.sendToBattle('choosePokemon', { pokemonId });
  }

  performBattleAction(actionType, actionData = {}) {
    console.log('[DEBUG NETWORK BATTLE] [API] performBattleAction', actionType, actionData);
    return this.sendToBattle('battleAction', {
      actionType,
      ...actionData
    });
  }

  useMove(moveId) {
    console.log('[DEBUG NETWORK BATTLE] [API] useMove', moveId);
    return this.performBattleAction('attack', { moveId });
  }

  useItem(itemId, targetId = null) {
    console.log('[DEBUG NETWORK BATTLE] [API] useItem', itemId, targetId);
    return this.performBattleAction('item', { itemId, targetId });
  }

  switchPokemon(newPokemonId) {
    console.log('[DEBUG NETWORK BATTLE] [API] switchPokemon', newPokemonId);
    return this.performBattleAction('switch', { targetPokemonId: newPokemonId });
  }

  attemptRun() {
    console.log('[DEBUG NETWORK BATTLE] [API] attemptRun');
    return this.performBattleAction('run', {});
  }

  attemptCapture(ballType) {
    console.log('[DEBUG NETWORK BATTLE] [API] attemptCapture', ballType);
    return this.sendToBattle('attemptCapture', { ballType });
  }

  leaveBattle(reason = 'manual') {
    if (this._leavingBattle) {
      console.log('[DEBUG NETWORK BATTLE] ⚠️ leaveBattle déjà en cours, ignore');
      return false;
    }
    this._leavingBattle = true;

    this.sendToWorld('leaveBattle', {
      battleRoomId: this.battleRoomId,
      reason: reason
    });

    this.disconnectFromBattleRoom();

    // ✅ Remettre le flag à false peu après pour permettre d'autres combats
    setTimeout(() => { this._leavingBattle = false; }, 250);

    return true;
  }

  // === REQUÊTES D'INFORMATION ===

  checkCanBattle() {
    console.log('[DEBUG NETWORK BATTLE] [API] checkCanBattle');
    return this.sendToWorld('canBattle', {});
  }

  getBattleStatus() {
    console.log('[DEBUG NETWORK BATTLE] [API] getBattleStatus');
    return this.sendToWorld('getBattleStatus', {});
  }

  getBattleState() {
    console.log('[DEBUG NETWORK BATTLE] [API] getBattleState');
    return this.sendToBattle('getBattleState', {});
  }

  // === DÉCONNEXION ===

  async disconnectFromBattleRoom() {
    if (!this.battleRoom || this._isDisconnecting) {
      console.log('[DEBUG NETWORK BATTLE] ℹ️ Aucune BattleRoom à déconnecter ou déjà en déconnexion');
      return;
    }
    this._isDisconnecting = true;
    try {
      await this.battleRoom.leave();
      console.log('[DEBUG NETWORK BATTLE] ✅ BattleRoom quittée proprement');
    } catch (error) {
      console.warn('[DEBUG NETWORK BATTLE] ⚠️ Erreur déconnexion BattleRoom:', error);
    }
    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;
    this.pendingMessages = [];

    // ✅ Toujours remettre le flag à false après (dans tous les cas)
    setTimeout(() => { this._isDisconnecting = false; }, 250);
  }

  // === SYSTÈME D'ÉVÉNEMENTS ===

  on(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName).push(callback);
  }

  off(eventName, callback) {
    if (this.eventCallbacks.has(eventName)) {
      const callbacks = this.eventCallbacks.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  triggerEvent(eventName, data = {}) {
    console.log('[DEBUG NETWORK BATTLE] [TRIGGER]', eventName, data);
    if (this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[DEBUG NETWORK BATTLE] ❌ Erreur callback ${eventName}:`, error);
        }
      });
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
        hasJoinById: typeof this.client?.joinById === 'function',
        isGlobal: this.client === window.client
      },
      pendingMessages: this.pendingMessages.length
    };
  }

  canSendBattleActions() {
    return this.isConnectedToBattle &&
           this.battleRoom &&
           !this.pendingConnection;
  }

  debug() {
    console.log('[DEBUG NETWORK BATTLE] === DEBUG ===');

    const status = this.getConnectionStatus();
    console.log('[DEBUG NETWORK BATTLE] 📊 État connexions:', status);

    if (this.worldRoom) {
      console.log('[DEBUG NETWORK BATTLE] 🌍 WorldRoom:', {
        id: this.worldRoom.id,
        sessionId: this.worldRoom.sessionId
      });
    }

    if (this.battleRoom) {
      console.log('[DEBUG NETWORK BATTLE] ⚔️ BattleRoom:', {
        id: this.battleRoom.id,
        sessionId: this.battleRoom.sessionId,
        state: this.battleRoom.state ? 'présent' : 'manquant'
      });
    }

    if (this.client) {
      console.log('[DEBUG NETWORK BATTLE] 🔗 Client:', {
        type: typeof this.client,
        hasJoinById: typeof this.client.joinById === 'function',
        isGlobal: this.client === window.client,
        keys: Object.keys(this.client).slice(0, 10)
      });
    }

    console.log('[DEBUG NETWORK BATTLE] 📋 Événements écoutés:', Array.from(this.eventCallbacks.keys()));
    console.log('[DEBUG NETWORK BATTLE] 📤 Messages en attente:', this.pendingMessages.length);
    console.log('[DEBUG NETWORK BATTLE] =====================================');

    return {
      status,
      canSendActions: this.canSendBattleActions(),
      eventListeners: Array.from(this.eventCallbacks.keys()),
      pendingMessagesCount: this.pendingMessages.length
    };
  }

  // === MÉTHODES UTILITAIRES ===

  updateClient(newClient) {
    if (newClient && typeof newClient.joinById === 'function') {
      console.log('[DEBUG NETWORK BATTLE] 🔄 Mise à jour forcée du client');
      this.client = newClient;
      return true;
    }
    return false;
  }

  validateAndFixClient() {
    console.log('[DEBUG NETWORK BATTLE] 🔧 Validation du client...');

    if (!this.client || typeof this.client.joinById !== 'function') {
      console.warn('[DEBUG NETWORK BATTLE] ⚠️ Client invalide détecté');

      if (window.client && typeof window.client.joinById === 'function') {
        console.log('[DEBUG NETWORK BATTLE] 🔄 Auto-correction avec client global');
        this.client = window.client;
        return true;
      } else {
        console.error('[DEBUG NETWORK BATTLE] ❌ Aucun client valide disponible pour correction');
        return false;
      }
    }

    console.log('[DEBUG NETWORK BATTLE] ✅ Client valide');
    return true;
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('[DEBUG NETWORK BATTLE] 💀 Destruction...');

    // Déconnecter de la BattleRoom
    await this.disconnectFromBattleRoom();

    // Nettoyer les références
    this.worldRoom = null;
    this.client = null;
    this.networkManager = null;

    // Nettoyer les callbacks
    this.eventCallbacks.clear();

    // Nettoyer les messages en attente
    this.pendingMessages = [];

    // Réinitialiser l'état
    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingConnection = false;
    this._leavingBattle = false;
    this._isDisconnecting = false;

    console.log('[DEBUG NETWORK BATTLE] ✅ Détruit');
  }
}
