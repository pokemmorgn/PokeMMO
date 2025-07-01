// client/src/network/BattleNetworkHandler.js - Gestionnaire réseau dédié au combat

/**
 * Gestionnaire réseau spécialisé pour le système de combat
 * Gère toutes les communications serveur liées aux combats
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
    
    console.log('🌐 [BattleNetworkHandler] Initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise le handler avec les connexions existantes
   */
  initialize(worldRoom, client) {
    console.log('🔧 [BattleNetworkHandler] Initialisation...');
    
    if (!worldRoom) {
      console.error('❌ [BattleNetworkHandler] WorldRoom manquante');
      return false;
    }
    
    this.worldRoom = worldRoom;
    
    // ✅ CORRECTION: Prioriser window.client puis le client passé
    if (window.client && typeof window.client.joinById === 'function') {
      this.client = window.client;
      console.log('✅ [BattleNetworkHandler] Utilisation client global');
    } else if (client && typeof client.joinById === 'function') {
      this.client = client;
      console.log('✅ [BattleNetworkHandler] Utilisation client fourni');
    } else {
      console.error('❌ [BattleNetworkHandler] Aucun client Colyseus valide disponible');
      console.log('🔍 Debug clients:', {
        windowClient: !!window.client,
        windowClientType: typeof window.client,
        windowClientJoinById: typeof window.client?.joinById,
        providedClient: !!client,
        providedClientType: typeof client,
        providedClientJoinById: typeof client?.joinById
      });
      return false;
    }
    
    // Setup des événements WorldRoom pour les combats
    this.setupWorldRoomBattleEvents();
    
    console.log('✅ [BattleNetworkHandler] Initialisé avec client valide');
    return true;
  }

  // === ÉVÉNEMENTS WORLDROOM POUR LE COMBAT ===

  setupWorldRoomBattleEvents() {
    if (!this.worldRoom) return;
    
    console.log('📡 [BattleNetworkHandler] Configuration événements WorldRoom combat...');
    
    // === RENCONTRES ET CRÉATION DE COMBAT ===
    
    this.worldRoom.onMessage('wildEncounterStart', (data) => {
      console.log('🐾 [BattleNetworkHandler] Rencontre sauvage:', data);
      this.handleWildEncounterStart(data);
    });
    
    this.worldRoom.onMessage('battleRoomCreated', (data) => {
      console.log('🏠 [BattleNetworkHandler] BattleRoom créée:', data);
      this.handleBattleRoomCreated(data);
    });
    
    this.worldRoom.onMessage('joinBattleRoom', (data) => {
      console.log('🚪 [BattleNetworkHandler] Rejoindre BattleRoom:', data);
      this.handleJoinBattleRoomRequest(data);
    });
    
    // === GESTION DES ERREURS ===
    
    this.worldRoom.onMessage('battleError', (data) => {
      console.error('❌ [BattleNetworkHandler] Erreur combat WorldRoom:', data);
      this.triggerEvent('battleError', data);
    });
    
    this.worldRoom.onMessage('battleLeft', (data) => {
      console.log('👋 [BattleNetworkHandler] Combat quitté WorldRoom:', data);
      this.handleBattleLeftFromWorld(data);
    });
    
    // === STATUTS ET NOTIFICATIONS ===
    
    this.worldRoom.onMessage('battleStatus', (data) => {
      console.log('📊 [BattleNetworkHandler] Statut combat:', data);
      this.triggerEvent('battleStatusUpdate', data);
    });
    
    this.worldRoom.onMessage('canBattleResult', (data) => {
      console.log('✅ [BattleNetworkHandler] Peut combattre:', data);
      this.triggerEvent('canBattleResult', data);
    });
    
    console.log('✅ [BattleNetworkHandler] Événements WorldRoom configurés');
  }

  // === HANDLERS DES ÉVÉNEMENTS WORLDROOM ===

  handleWildEncounterStart(data) {
    console.log('🐾 [BattleNetworkHandler] Traitement rencontre sauvage...');
    
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
    console.log('🏠 [BattleNetworkHandler] Traitement création BattleRoom...');
    
    this.battleRoomId = data.battleRoomId;
    
    // Notifier la création
    this.triggerEvent('battleRoomCreated', {
      battleRoomId: this.battleRoomId,
      battleType: data.battleType,
      wildPokemon: data.wildPokemon
    });
    
    // Connexion automatique
    const success = await this.connectToBattleRoom(this.battleRoomId);
    if (!success) {
      console.error('❌ [BattleNetworkHandler] Échec connexion auto BattleRoom');
      this.triggerEvent('battleConnectionFailed', { battleRoomId: this.battleRoomId });
    }
  }

  async handleJoinBattleRoomRequest(data) {
    console.log('🚪 [BattleNetworkHandler] Demande rejoindre BattleRoom...');
    
    if (!this.isConnectedToBattle && data.battleRoomId) {
      await this.connectToBattleRoom(data.battleRoomId);
    }
    
    this.triggerEvent('joinBattleRoomRequested', data);
  }

  handleBattleLeftFromWorld(data) {
    console.log('👋 [BattleNetworkHandler] Combat quitté depuis WorldRoom...');
    
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
      console.error('❌ [BattleNetworkHandler] battleRoomId manquant');
      return false;
    }

    if (this.pendingConnection) {
      console.warn('⚠️ [BattleNetworkHandler] Connexion déjà en cours');
      return false;
    }

    console.log(`🔗 [BattleNetworkHandler] Connexion à BattleRoom: ${battleRoomId}`);
    this.pendingConnection = true;

    try {
      // ✅ CORRECTION 1: Double vérification du client avec fallback automatique
      if (!this.client || typeof this.client.joinById !== 'function') {
        console.error('❌ [BattleNetworkHandler] Client invalide:', typeof this.client);
        
        // ✅ TENTATIVE DE RÉCUPÉRATION AUTOMATIQUE
        if (window.client && typeof window.client.joinById === 'function') {
          console.log('🔄 [BattleNetworkHandler] Récupération client global automatique');
          this.client = window.client;
        } else {
          throw new Error('Aucun client Colyseus valide disponible');
        }
      }

      console.log(`🎯 [BattleNetworkHandler] Client utilisé:`, {
        hasJoinById: typeof this.client.joinById === 'function',
        clientKeys: Object.keys(this.client).slice(0, 5), // Premiers 5 pour debug
        isGlobalClient: this.client === window.client
      });

      // ✅ CORRECTION 2: Connexion avec gestion d'erreur améliorée
      console.log(`🚀 [BattleNetworkHandler] Tentative joinById(${battleRoomId})`);
      
      this.battleRoom = await this.client.joinById(battleRoomId);
      
      if (!this.battleRoom) {
        throw new Error('BattleRoom reçue null');
      }

      console.log(`✅ [BattleNetworkHandler] Connecté à BattleRoom: ${battleRoomId}`);
      console.log(`🎮 [BattleNetworkHandler] Room info:`, {
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
      console.error('❌ [BattleNetworkHandler] Erreur connexion BattleRoom:', error);
      console.error('🔍 [BattleNetworkHandler] Détails erreur:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3), // 3 premières lignes
        clientType: typeof this.client,
        hasJoinById: this.client ? typeof this.client.joinById : 'no client'
      });

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
    
    console.log('⚔️ [BattleNetworkHandler] Configuration événements BattleRoom...');
    
    // === ÉVÉNEMENTS DE COMBAT ===
    
    this.battleRoom.onMessage('battleJoined', (data) => {
      console.log('⚔️ [BattleNetworkHandler] Combat rejoint:', data);
      this.triggerEvent('battleJoined', data);
    });
    
    this.battleRoom.onMessage('phaseChange', (data) => {
      console.log('🔄 [BattleNetworkHandler] Phase combat changée:', data.phase);
      this.triggerEvent('phaseChange', data);
    });
    
    this.battleRoom.onMessage('battleStart', (data) => {
      console.log('⚔️ [BattleNetworkHandler] Combat commencé:', data);
      this.triggerEvent('battleStart', data);
    });
    
    this.battleRoom.onMessage('turnChange', (data) => {
      console.log('🔄 [BattleNetworkHandler] Tour changé:', data);
      this.triggerEvent('turnChange', data);
    });
    
    this.battleRoom.onMessage('battleMessage', (data) => {
      console.log('💬 [BattleNetworkHandler] Message combat:', data.message);
      this.triggerEvent('battleMessage', data);
    });
    
    this.battleRoom.onMessage('battleEnd', (data) => {
      console.log('🏁 [BattleNetworkHandler] Combat terminé:', data);
      this.triggerEvent('battleEnd', data);
      
      // Programmer la déconnexion
      setTimeout(() => {
        this.disconnectFromBattleRoom();
      }, 3000);
    });
    
    this.battleRoom.onMessage('battleInterrupted', (data) => {
      console.log('⚠️ [BattleNetworkHandler] Combat interrompu:', data);
      this.triggerEvent('battleInterrupted', data);
      this.disconnectFromBattleRoom();
    });
    
    // === ÉVÉNEMENTS D'ACTIONS ===
    
    this.battleRoom.onMessage('attackResult', (data) => {
      console.log('💥 [BattleNetworkHandler] Résultat attaque:', data);
      this.triggerEvent('attackResult', data);
    });
    
    this.battleRoom.onMessage('captureShake', (data) => {
      console.log('🎯 [BattleNetworkHandler] Secousse capture:', data);
      this.triggerEvent('captureShake', data);
    });
    
    this.battleRoom.onMessage('pokemonFainted', (data) => {
      console.log('😵 [BattleNetworkHandler] Pokémon KO:', data);
      this.triggerEvent('pokemonFainted', data);
    });
    
    this.battleRoom.onMessage('statusEffectApplied', (data) => {
      console.log('🌡️ [BattleNetworkHandler] Effet de statut:', data);
      this.triggerEvent('statusEffectApplied', data);
    });
    
    // === ÉVÉNEMENTS DE CONNEXION ===
    
    this.battleRoom.onStateChange((state) => {
      // Diffuser les changements d'état sans spam
      this.triggerEvent('battleStateChange', { state });
    });
    
    this.battleRoom.onLeave((code) => {
      console.log(`👋 [BattleNetworkHandler] Quitté BattleRoom (${code})`);
      this.handleBattleRoomDisconnect(code);
    });
    
    this.battleRoom.onError((code, message) => {
      console.error(`❌ [BattleNetworkHandler] Erreur BattleRoom: ${code} - ${message}`);
      this.triggerEvent('battleRoomError', { code, message });
    });
    
    console.log('✅ [BattleNetworkHandler] Événements BattleRoom configurés');
  }

  handleBattleRoomDisconnect(code) {
    console.log(`👋 [BattleNetworkHandler] Déconnexion BattleRoom: ${code}`);
    
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
      console.error('❌ [BattleNetworkHandler] WorldRoom non connectée');
      return false;
    }
    
    try {
      this.worldRoom.send(messageType, data);
      console.log(`📤➡️ [BattleNetworkHandler] → WorldRoom: ${messageType}`);
      return true;
    } catch (error) {
      console.error(`❌ [BattleNetworkHandler] Erreur envoi WorldRoom:`, error);
      return false;
    }
  }

  /**
   * Envoie un message à la BattleRoom
   */
  sendToBattle(messageType, data = {}) {
    if (!this.isConnectedToBattle || !this.battleRoom) {
      console.warn(`⚠️ [BattleNetworkHandler] BattleRoom non connectée, mise en attente: ${messageType}`);
      
      // Mettre en attente si pas connecté
      this.pendingMessages.push({ messageType, data, timestamp: Date.now() });
      return false;
    }
    
    try {
      this.battleRoom.send(messageType, data);
      console.log(`📤⚔️ [BattleNetworkHandler] → BattleRoom: ${messageType}`);
      return true;
    } catch (error) {
      console.error(`❌ [BattleNetworkHandler] Erreur envoi BattleRoom:`, error);
      return false;
    }
  }

  /**
   * Traite les messages en attente après connexion BattleRoom
   */
  processPendingMessages() {
    if (this.pendingMessages.length === 0) return;
    
    console.log(`📤 [BattleNetworkHandler] Traitement ${this.pendingMessages.length} messages en attente...`);
    
    // Filtrer les messages trop anciens (>30s)
    const now = Date.now();
    const validMessages = this.pendingMessages.filter(msg => (now - msg.timestamp) < 30000);
    
    // Envoyer les messages valides
    validMessages.forEach(({ messageType, data }) => {
      this.sendToBattle(messageType, data);
    });
    
    // Nettoyer
    this.pendingMessages = [];
    
    console.log(`✅ [BattleNetworkHandler] ${validMessages.length} messages traités`);
  }

  // === ACTIONS DE COMBAT SPÉCIFIQUES ===

  /**
   * Demander un combat sauvage
   */
  requestWildBattle(wildPokemonData) {
    return this.sendToWorld('startWildBattle', {
      wildPokemon: wildPokemonData.pokemon || wildPokemonData,
      location: wildPokemonData.location || 'unknown',
      method: wildPokemonData.method || 'manual'
    });
  }

  /**
   * Choisir le Pokémon de départ
   */
  choosePokemon(pokemonId) {
    return this.sendToBattle('choosePokemon', { pokemonId });
  }

  /**
   * Effectuer une action de combat
   */
  performBattleAction(actionType, actionData = {}) {
    return this.sendToBattle('battleAction', {
      actionType,
      ...actionData
    });
  }

  /**
   * Attaquer avec une capacité
   */
  useMove(moveId) {
    return this.performBattleAction('attack', { moveId });
  }

  /**
   * Utiliser un objet
   */
  useItem(itemId, targetId = null) {
    return this.performBattleAction('item', { itemId, targetId });
  }

  /**
   * Changer de Pokémon
   */
  switchPokemon(newPokemonId) {
    return this.performBattleAction('switch', { targetPokemonId: newPokemonId });
  }

  /**
   * Tenter de fuir
   */
  attemptRun() {
    return this.performBattleAction('run', {});
  }

  /**
   * Tenter une capture
   */
  attemptCapture(ballType) {
    return this.sendToBattle('attemptCapture', { ballType });
  }

  /**
   * Quitter le combat
   */
  leaveBattle(reason = 'manual') {
    console.log(`🚪 [BattleNetworkHandler] Quitter combat: ${reason}`);
    
    // Notifier la WorldRoom
    this.sendToWorld('leaveBattle', {
      battleRoomId: this.battleRoomId,
      reason: reason
    });
    
    // Déconnecter de la BattleRoom
    this.disconnectFromBattleRoom();
    
    return true;
  }

  // === REQUÊTES D'INFORMATION ===

  /**
   * Vérifier si on peut combattre
   */
  checkCanBattle() {
    return this.sendToWorld('canBattle', {});
  }

  /**
   * Obtenir le statut du combat
   */
  getBattleStatus() {
    return this.sendToWorld('getBattleStatus', {});
  }

  /**
   * Obtenir l'état actuel de la BattleRoom
   */
  getBattleState() {
    return this.sendToBattle('getBattleState', {});
  }

  // === DÉCONNEXION ===

  async disconnectFromBattleRoom() {
    if (!this.battleRoom) {
      console.log('ℹ️ [BattleNetworkHandler] Aucune BattleRoom à déconnecter');
      return;
    }
    
    console.log('🔌 [BattleNetworkHandler] Déconnexion BattleRoom...');
    
    try {
      await this.battleRoom.leave();
      console.log('✅ [BattleNetworkHandler] BattleRoom quittée proprement');
    } catch (error) {
      console.warn('⚠️ [BattleNetworkHandler] Erreur déconnexion BattleRoom:', error);
    }
    
    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;
    
    // Nettoyer les messages en attente
    this.pendingMessages = [];
  }

  // === SYSTÈME D'ÉVÉNEMENTS ===

  /**
   * Enregistrer un callback d'événement
   */
  on(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName).push(callback);
  }

  /**
   * Supprimer un callback d'événement
   */
  off(eventName, callback) {
    if (this.eventCallbacks.has(eventName)) {
      const callbacks = this.eventCallbacks.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Déclencher un événement
   */
  triggerEvent(eventName, data = {}) {
    if (this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ [BattleNetworkHandler] Erreur callback ${eventName}:`, error);
        }
      });
    }
  }

  // === ÉTAT ET DEBUG ===

  /**
   * Obtient l'état de connexion
   */
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

  /**
   * Vérifie si on peut envoyer des actions
   */
  canSendBattleActions() {
    return this.isConnectedToBattle && 
           this.battleRoom && 
           !this.pendingConnection;
  }

  /**
   * Debug complet
   */
  debug() {
    console.log('🔍 [BattleNetworkHandler] === DEBUG ===');
    
    const status = this.getConnectionStatus();
    console.log('📊 État connexions:', status);
    
    if (this.worldRoom) {
      console.log('🌍 WorldRoom:', {
        id: this.worldRoom.id,
        sessionId: this.worldRoom.sessionId
      });
    }
    
    if (this.battleRoom) {
      console.log('⚔️ BattleRoom:', {
        id: this.battleRoom.id,
        sessionId: this.battleRoom.sessionId,
        state: this.battleRoom.state ? 'présent' : 'manquant'
      });
    }
    
    if (this.client) {
      console.log('🔗 Client:', {
        type: typeof this.client,
        hasJoinById: typeof this.client.joinById === 'function',
        isGlobal: this.client === window.client,
        keys: Object.keys(this.client).slice(0, 10)
      });
    }
    
    console.log('📋 Événements écoutés:', Array.from(this.eventCallbacks.keys()));
    console.log('📤 Messages en attente:', this.pendingMessages.length);
    console.log('=====================================');
    
    return {
      status,
      canSendActions: this.canSendBattleActions(),
      eventListeners: Array.from(this.eventCallbacks.keys()),
      pendingMessagesCount: this.pendingMessages.length
    };
  }

  // === MÉTHODES UTILITAIRES POUR LA CORRECTION ===

  /**
   * Force la mise à jour du client (pour les corrections en temps réel)
   */
  updateClient(newClient) {
    if (newClient && typeof newClient.joinById === 'function') {
      console.log('🔄 [BattleNetworkHandler] Mise à jour forcée du client');
      this.client = newClient;
      return true;
    }
    return false;
  }

  /**
   * Vérifie et corrige automatiquement le client si nécessaire
   */
  validateAndFixClient() {
    console.log('🔧 [BattleNetworkHandler] Validation du client...');
    
    if (!this.client || typeof this.client.joinById !== 'function') {
      console.warn('⚠️ [BattleNetworkHandler] Client invalide détecté');
      
      if (window.client && typeof window.client.joinById === 'function') {
        console.log('🔄 [BattleNetworkHandler] Auto-correction avec client global');
        this.client = window.client;
        return true;
      } else {
        console.error('❌ [BattleNetworkHandler] Aucun client valide disponible pour correction');
        return false;
      }
    }
    
    console.log('✅ [BattleNetworkHandler] Client valide');
    return true;
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 [BattleNetworkHandler] Destruction...');
    
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
    
    console.log('✅ [BattleNetworkHandler] Détruit');
  }
}
