// client/src/Battle/BattleConnection.js - Gestion connexion simultanée WorldRoom + BattleRoom
import * as Colyseus from 'colyseus.js';

export class BattleConnection {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Connexions
    this.worldRoom = null;      // Connexion WorldRoom principale
    this.battleRoom = null;     // Connexion BattleRoom pour combat
    
    // État
    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingBattleConnection = false;
    
    // Callbacks
    this.eventCallbacks = new Map();
    
    // Client Colyseus (réutiliser celui existant ou créer)
    this.client = null;
    
    console.log('🔗 [BattleConnection] Initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise la connexion avec la WorldRoom existante
   */
  initialize(worldRoom) {
    console.log('🔧 [BattleConnection] Initialisation...');
    
    if (!worldRoom) {
      console.error('❌ [BattleConnection] WorldRoom manquante');
      return false;
    }
    
    this.worldRoom = worldRoom;
    this.client = worldRoom.connection.transport.ws ? worldRoom.connection : null;
    
    if (!this.client) {
      console.error('❌ [BattleConnection] Client Colyseus non trouvé');
      return false;
    }
    
    // Setup des événements WorldRoom pour le combat
    this.setupWorldRoomBattleEvents();
    
    console.log('✅ [BattleConnection] Initialisé avec WorldRoom');
    return true;
  }

  // === ÉVÉNEMENTS WORLDROOM POUR LE COMBAT ===

  setupWorldRoomBattleEvents() {
    if (!this.worldRoom) return;
    
    console.log('📡 [BattleConnection] Configuration événements WorldRoom...');
    
    // Rencontre sauvage qui démarre un combat
    this.worldRoom.onMessage('wildEncounterStart', (data) => {
      console.log('🐾 [BattleConnection] Rencontre sauvage reçue:', data);
      this.handleWildEncounterStart(data);
    });
    
    // BattleRoom créée par le serveur
    this.worldRoom.onMessage('battleRoomCreated', (data) => {
      console.log('🏠 [BattleConnection] BattleRoom créée:', data);
      this.handleBattleRoomCreated(data);
    });
    
    // Instructions pour rejoindre BattleRoom
    this.worldRoom.onMessage('joinBattleRoom', (data) => {
      console.log('🚪 [BattleConnection] Instructions pour rejoindre BattleRoom:', data);
      this.handleJoinBattleRoomInstructions(data);
    });
    
    // Erreurs de combat depuis WorldRoom
    this.worldRoom.onMessage('battleError', (data) => {
      console.error('❌ [BattleConnection] Erreur combat depuis WorldRoom:', data);
      this.triggerEvent('battleError', data);
    });
    
    // Combat quitté/terminé
    this.worldRoom.onMessage('battleLeft', (data) => {
      console.log('👋 [BattleConnection] Combat quitté:', data);
      this.handleBattleLeft(data);
    });
    
    console.log('✅ [BattleConnection] Événements WorldRoom configurés');
  }

  // === GESTION DES ÉVÉNEMENTS ===

  handleWildEncounterStart(data) {
    console.log('🐾 [BattleConnection] Traitement rencontre sauvage...');
    
    // Notifier qu'un combat va commencer
    this.triggerEvent('encounterStart', {
      type: 'wild',
      pokemon: data.wildPokemon || data.pokemon,
      message: data.message,
      location: data.location
    });
  }

  async handleBattleRoomCreated(data) {
    console.log('🏠 [BattleConnection] Traitement création BattleRoom...');
    
    this.battleRoomId = data.battleRoomId;
    
    // Notifier la création
    this.triggerEvent('battleRoomCreated', {
      battleRoomId: this.battleRoomId,
      battleType: data.battleType
    });
    
    // Tenter de se connecter automatiquement
    const success = await this.connectToBattleRoom(this.battleRoomId);
    if (!success) {
      console.error('❌ [BattleConnection] Échec connexion automatique à BattleRoom');
    }
  }

  handleJoinBattleRoomInstructions(data) {
    console.log('🚪 [BattleConnection] Instructions reçues pour BattleRoom...');
    
    // Si on n'est pas encore connecté, essayer maintenant
    if (!this.isConnectedToBattle && data.battleRoomId) {
      this.connectToBattleRoom(data.battleRoomId);
    }
  }

  handleBattleLeft(data) {
    console.log('👋 [BattleConnection] Combat quitté...');
    
    // Nettoyer la connexion BattleRoom
    this.disconnectFromBattleRoom();
    
    this.triggerEvent('battleEnded', {
      reason: data.reason || 'left',
      message: data.message
    });
  }

  // === CONNEXION À LA BATTLEROOM ===

  async connectToBattleRoom(battleRoomId) {
    if (!this.client || !battleRoomId) {
      console.error('❌ [BattleConnection] Client ou battleRoomId manquant');
      return false;
    }
    
    if (this.pendingBattleConnection) {
      console.warn('⚠️ [BattleConnection] Connexion BattleRoom déjà en cours');
      return false;
    }
    
    console.log(`🔗 [BattleConnection] Connexion à BattleRoom: ${battleRoomId}`);
    this.pendingBattleConnection = true;
    
    try {
      // Se connecter à la BattleRoom
      this.battleRoom = await this.client.joinById(battleRoomId);
      
      console.log(`✅ [BattleConnection] Connecté à BattleRoom: ${battleRoomId}`);
      
      // Setup des événements BattleRoom
      this.setupBattleRoomEvents();
      
      this.isConnectedToBattle = true;
      this.pendingBattleConnection = false;
      
      // Notifier le succès
      this.triggerEvent('battleRoomJoined', {
        battleRoomId: battleRoomId,
        room: this.battleRoom
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ [BattleConnection] Erreur connexion BattleRoom:', error);
      
      this.pendingBattleConnection = false;
      
      this.triggerEvent('battleConnectionError', {
        error: error.message || 'Erreur connexion',
        battleRoomId: battleRoomId
      });
      
      return false;
    }
  }

  // === ÉVÉNEMENTS BATTLEROOM ===

  setupBattleRoomEvents() {
    if (!this.battleRoom) return;
    
    console.log('⚔️ [BattleConnection] Configuration événements BattleRoom...');
    
    // Combat rejoint avec succès
    this.battleRoom.onMessage('battleJoined', (data) => {
      console.log('⚔️ [BattleConnection] Combat rejoint:', data);
      this.triggerEvent('battleJoined', data);
    });
    
    // Phase du combat changée
    this.battleRoom.onMessage('phaseChange', (data) => {
      console.log('🔄 [BattleConnection] Phase combat:', data.phase);
      this.triggerEvent('phaseChange', data);
    });
    
    // Combat effectivement commencé
    this.battleRoom.onMessage('battleStart', (data) => {
      console.log('⚔️ [BattleConnection] Combat commencé !', data);
      this.triggerEvent('battleStart', data);
    });
    
    // Changement de tour
    this.battleRoom.onMessage('turnChange', (data) => {
      console.log('🔄 [BattleConnection] Changement tour:', data);
      this.triggerEvent('turnChange', data);
    });
    
    // Message de combat
    this.battleRoom.onMessage('battleMessage', (data) => {
      console.log('💬 [BattleConnection] Message combat:', data.message);
      this.triggerEvent('battleMessage', data);
    });
    
    // Fin de combat
    this.battleRoom.onMessage('battleEnd', (data) => {
      console.log('🏁 [BattleConnection] Fin combat:', data);
      this.triggerEvent('battleEnd', data);
      
      // Programmer la déconnexion
      setTimeout(() => {
        this.disconnectFromBattleRoom();
      }, 2000);
    });
    
    // Combat interrompu
    this.battleRoom.onMessage('battleInterrupted', (data) => {
      console.log('⚠️ [BattleConnection] Combat interrompu:', data);
      this.triggerEvent('battleInterrupted', data);
      this.disconnectFromBattleRoom();
    });
    
    // Animation de capture
    this.battleRoom.onMessage('captureShake', (data) => {
      console.log('🎯 [BattleConnection] Secousse capture:', data);
      this.triggerEvent('captureShake', data);
    });
    
    // Erreurs de BattleRoom
    this.battleRoom.onMessage('error', (data) => {
      console.error('❌ [BattleConnection] Erreur BattleRoom:', data);
      this.triggerEvent('battleError', data);
    });
    
    // État du combat mis à jour
    this.battleRoom.onStateChange((state) => {
      // console.log('📊 [BattleConnection] État combat mis à jour');
      this.triggerEvent('battleStateChange', { state });
    });
    
    // Déconnexion de la BattleRoom
    this.battleRoom.onLeave((code) => {
      console.log(`👋 [BattleConnection] Quitté BattleRoom (code: ${code})`);
      this.handleBattleRoomDisconnect(code);
    });
    
    // Erreur de la BattleRoom
    this.battleRoom.onError((code, message) => {
      console.error(`❌ [BattleConnection] Erreur BattleRoom: ${code} - ${message}`);
      this.triggerEvent('battleError', { code, message });
    });
    
    console.log('✅ [BattleConnection] Événements BattleRoom configurés');
  }

  handleBattleRoomDisconnect(code) {
    console.log(`👋 [BattleConnection] Déconnexion BattleRoom: ${code}`);
    
    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;
    
    this.triggerEvent('battleRoomDisconnected', { code });
  }

  // === ENVOI DE MESSAGES ===

  /**
   * Envoie un message à la WorldRoom
   */
  sendToWorld(type, data = {}) {
    if (!this.worldRoom) {
      console.error('❌ [BattleConnection] WorldRoom non connectée');
      return false;
    }
    
    try {
      this.worldRoom.send(type, data);
      console.log(`📤 [BattleConnection] Message envoyé à WorldRoom: ${type}`);
      return true;
    } catch (error) {
      console.error(`❌ [BattleConnection] Erreur envoi WorldRoom:`, error);
      return false;
    }
  }

  /**
   * Envoie un message à la BattleRoom
   */
  sendToBattle(type, data = {}) {
    if (!this.battleRoom || !this.isConnectedToBattle) {
      console.error('❌ [BattleConnection] BattleRoom non connectée');
      return false;
    }
    
    try {
      this.battleRoom.send(type, data);
      console.log(`📤 [BattleConnection] Message envoyé à BattleRoom: ${type}`);
      return true;
    } catch (error) {
      console.error(`❌ [BattleConnection] Erreur envoi BattleRoom:`, error);
      return false;
    }
  }

  // === ACTIONS DE COMBAT ===

  /**
   * Choisir le Pokémon initial pour le combat
   */
  choosePokemon(pokemonId) {
    return this.sendToBattle('choosePokemon', { pokemonId });
  }

  /**
   * Effectuer une action de combat
   */
  performBattleAction(actionType, data = {}) {
    return this.sendToBattle('battleAction', {
      actionType,
      ...data
    });
  }

  /**
   * Attaquer avec une capacité
   */
  attack(moveId) {
    return this.performBattleAction('attack', { moveId });
  }

  /**
   * Utiliser un objet
   */
  useItem(itemId) {
    return this.performBattleAction('item', { itemId });
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

  // === DÉCONNEXION ===

  async disconnectFromBattleRoom() {
    if (!this.battleRoom) {
      console.log('ℹ️ [BattleConnection] Aucune BattleRoom à déconnecter');
      return;
    }
    
    console.log('🔌 [BattleConnection] Déconnexion BattleRoom...');
    
    try {
      await this.battleRoom.leave();
      console.log('✅ [BattleConnection] BattleRoom quittée proprement');
    } catch (error) {
      console.warn('⚠️ [BattleConnection] Erreur lors de la déconnexion BattleRoom:', error);
    }
    
    this.isConnectedToBattle = false;
    this.battleRoom = null;
    this.battleRoomId = null;
  }

  /**
   * Quitter manuellement le combat
   */
  async leaveBattle(reason = 'manual') {
    console.log(`🚪 [BattleConnection] Quitter combat: ${reason}`);
    
    // Notifier la WorldRoom qu'on quitte le combat
    this.sendToWorld('leaveBattle', {
      battleRoomId: this.battleRoomId,
      reason: reason
    });
    
    // Déconnecter de la BattleRoom
    await this.disconnectFromBattleRoom();
    
    this.triggerEvent('battleLeft', { reason });
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
          console.error(`❌ [BattleConnection] Erreur callback ${eventName}:`, error);
        }
      });
    }
  }

  // === GETTERS ===

  get isConnected() {
    return this.isConnectedToBattle && this.battleRoom;
  }

  get currentBattleRoomId() {
    return this.battleRoomId;
  }

  get battleState() {
    return this.battleRoom?.state || null;
  }

  get worldRoomConnected() {
    return !!this.worldRoom;
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Obtenir l'état de connexion complet
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
        pending: this.pendingBattleConnection
      }
    };
  }

  /**
   * Vérifier si on peut envoyer des actions de combat
   */
  canSendBattleActions() {
    return this.isConnectedToBattle && 
           this.battleRoom && 
           !this.pendingBattleConnection;
  }

  /**
   * Debug des connexions
   */
  debugConnections() {
    console.log('🔍 [BattleConnection] === DEBUG CONNEXIONS ===');
    
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
        state: this.battleRoom.state ? 'present' : 'missing'
      });
    }
    
    console.log('📋 Événements enregistrés:', Array.from(this.eventCallbacks.keys()));
    console.log('=======================================');
  }

  // === NETTOYAGE ===

  async destroy() {
    console.log('💀 [BattleConnection] Destruction...');
    
    // Déconnecter de la BattleRoom
    await this.disconnectFromBattleRoom();
    
    // Nettoyer les références
    this.worldRoom = null;
    this.client = null;
    this.gameManager = null;
    
    // Nettoyer les callbacks
    this.eventCallbacks.clear();
    
    // Réinitialiser l'état
    this.isConnectedToBattle = false;
    this.battleRoomId = null;
    this.pendingBattleConnection = false;
    
    console.log('✅ [BattleConnection] Détruit');
  }
}
