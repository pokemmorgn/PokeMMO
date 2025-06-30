// client/src/Battle/BattleConnection.js - Version refactorisée utilisant BattleNetworkHandler
import { BattleNetworkHandler } from '../network/BattleNetworkHandler.js';

/**
 * Interface simplifiée pour le système de combat
 * Utilise BattleNetworkHandler pour toute la logique réseau
 */
export class BattleConnection {
  constructor(gameManager) {
    this.gameManager = gameManager;
    
    // Handler réseau dédié
    this.networkHandler = null;
    
    // État simplifié
    this.isInitialized = false;
    
    // Callbacks pour le BattleManager
    this.eventCallbacks = new Map();
    
    console.log('🔗 [BattleConnection] Initialisé (version refactorisée)');
  }

  // === INITIALISATION ===

  /**
   * Initialise avec le NetworkManager principal
   */
  initialize(networkManager) {
    console.log('🔧 [BattleConnection] Initialisation...');
    
    if (!networkManager || !networkManager.worldRoom || !networkManager.client) {
      console.error('❌ [BattleConnection] NetworkManager incomplet');
      return false;
    }
    
    // Créer le handler réseau spécialisé
    this.networkHandler = new BattleNetworkHandler(networkManager);
    
    // L'initialiser avec les connexions existantes
    const success = this.networkHandler.initialize(
      networkManager.worldRoom,
      networkManager.client
    );
    
    if (!success) {
      console.error('❌ [BattleConnection] Échec initialisation BattleNetworkHandler');
      return false;
    }
    
    // Setup des événements
    this.setupNetworkEvents();
    
    this.isInitialized = true;
    console.log('✅ [BattleConnection] Initialisé avec BattleNetworkHandler');
    return true;
  }

  /**
   * Alternative : initialiser directement avec WorldRoom (compatibilité)
   */
  initializeWithRoom(worldRoom) {
    console.log('🔧 [BattleConnection] Initialisation directe avec WorldRoom...');
    
    if (!worldRoom) {
      console.error('❌ [BattleConnection] WorldRoom manquante');
      return false;
    }
    
    // Extraire le client de la WorldRoom
    const client = worldRoom.connection?.transport?.ws ? worldRoom.connection : null;
    if (!client) {
      console.error('❌ [BattleConnection] Client Colyseus non trouvé dans WorldRoom');
      return false;
    }
    
    // Créer un NetworkManager temporaire pour compatibilité
    const mockNetworkManager = {
      worldRoom: worldRoom,
      client: client
    };
    
    return this.initialize(mockNetworkManager);
  }

  // === CONFIGURATION DES ÉVÉNEMENTS ===

  setupNetworkEvents() {
    if (!this.networkHandler) return;
    
    console.log('📡 [BattleConnection] Configuration des événements réseau...');
    
    // Rediriger tous les événements du BattleNetworkHandler vers les callbacks
    this.networkHandler.on('wildEncounterStart', (data) => {
      this.triggerEvent('wildEncounterStart', data);
    });
    
    this.networkHandler.on('battleRoomCreated', (data) => {
      this.triggerEvent('battleRoomCreated', data);
    });
    
    this.networkHandler.on('battleRoomConnected', (data) => {
      this.triggerEvent('joinBattleRoom', data);
    });
    
    this.networkHandler.on('battleJoined', (data) => {
      this.triggerEvent('battleJoined', data);
    });
    
    this.networkHandler.on('battleStart', (data) => {
      this.triggerEvent('battleStart', data);
    });
    
    this.networkHandler.on('turnChange', (data) => {
      this.triggerEvent('turnChange', data);
    });
    
    this.networkHandler.on('battleMessage', (data) => {
      this.triggerEvent('battleMessage', data);
    });
    
    this.networkHandler.on('battleEnd', (data) => {
      this.triggerEvent('battleEnd', data);
    });
    
    this.networkHandler.on('battleLeft', (data) => {
      this.triggerEvent('battleLeft', data);
    });
    
    this.networkHandler.on('battleError', (data) => {
      this.triggerEvent('battleError', data);
    });
    
    this.networkHandler.on('battleStateChange', (data) => {
      this.triggerEvent('battleStateChange', data);
    });
    
    // Événements spécifiques aux actions
    this.networkHandler.on('attackResult', (data) => {
      this.triggerEvent('attackResult', data);
    });
    
    this.networkHandler.on('captureShake', (data) => {
      this.triggerEvent('captureShake', data);
    });
    
    this.networkHandler.on('pokemonFainted', (data) => {
      this.triggerEvent('pokemonFainted', data);
    });
    
    this.networkHandler.on('statusEffectApplied', (data) => {
      this.triggerEvent('statusEffectApplied', data);
    });
    
    console.log('✅ [BattleConnection] Événements réseau configurés');
  }

  // === MÉTHODES D'ACTION (Délégation vers BattleNetworkHandler) ===

  /**
   * Demander un combat sauvage
   */
  requestWildBattle(wildPokemonData) {
    if (!this.networkHandler) {
      console.error('❌ [BattleConnection] NetworkHandler non initialisé');
      return false;
    }
    
    return this.networkHandler.requestWildBattle(wildPokemonData);
  }

  /**
   * Choisir le Pokémon de départ
   */
  choosePokemon(pokemonId) {
    if (!this.networkHandler) return false;
    return this.networkHandler.choosePokemon(pokemonId);
  }

  /**
   * Effectuer une action de combat
   */
  performBattleAction(actionType, actionData = {}) {
    if (!this.networkHandler) return false;
    return this.networkHandler.performBattleAction(actionType, actionData);
  }

  /**
   * Utiliser une attaque
   */
  useMove(moveId) {
    if (!this.networkHandler) return false;
    return this.networkHandler.useMove(moveId);
  }

  /**
   * Utiliser un objet
   */
  useItem(itemId, targetId = null) {
    if (!this.networkHandler) return false;
    return this.networkHandler.useItem(itemId, targetId);
  }

  /**
   * Changer de Pokémon
   */
  switchPokemon(newPokemonId) {
    if (!this.networkHandler) return false;
    return this.networkHandler.switchPokemon(newPokemonId);
  }

  /**
   * Tenter de fuir
   */
  attemptRun() {
    if (!this.networkHandler) return false;
    return this.networkHandler.attemptRun();
  }

  /**
   * Tenter une capture
   */
  attemptCapture(ballType) {
    if (!this.networkHandler) return false;
    return this.networkHandler.attemptCapture(ballType);
  }

  /**
   * Quitter le combat
   */
  leaveBattle(reason = 'manual') {
    if (!this.networkHandler) return false;
    return this.networkHandler.leaveBattle(reason);
  }

  // === MÉTHODES D'INFORMATION ===

  /**
   * Vérifier si on peut combattre
   */
  checkCanBattle() {
    if (!this.networkHandler) return false;
    return this.networkHandler.checkCanBattle();
  }

  /**
   * Obtenir le statut du combat
   */
  getBattleStatus() {
    if (!this.networkHandler) return false;
    return this.networkHandler.getBattleStatus();
  }

  /**
   * Obtenir l'état de la BattleRoom
   */
  getBattleState() {
    if (!this.networkHandler) return null;
    return this.networkHandler.getBattleState();
  }

  // === MÉTHODES POUR COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME ===

  /**
   * Envoyer un message (pour compatibilité - délègue vers le bon handler)
   */
  send(messageType, data = {}) {
    console.log(`📤 [BattleConnection] Envoi message: ${messageType}`);
    
    if (!this.networkHandler) {
      console.error('❌ [BattleConnection] NetworkHandler non disponible');
      return false;
    }
    
    // Déterminer si c'est pour WorldRoom ou BattleRoom selon le type de message
    const worldMessages = [
      'startWildBattle', 'leaveBattle', 'canBattle', 'getBattleStatus'
    ];
    
    const battleMessages = [
      'choosePokemon', 'battleAction', 'attemptCapture', 'attemptFlee', 
      'switchPokemon', 'getBattleState'
    ];
    
    if (worldMessages.includes(messageType)) {
      return this.networkHandler.sendToWorld(messageType, data);
    } else if (battleMessages.includes(messageType)) {
      return this.networkHandler.sendToBattle(messageType, data);
    } else {
      // Par défaut, essayer BattleRoom
      return this.networkHandler.sendToBattle(messageType, data);
    }
  }

  /**
   * Rejoindre room (pour compatibilité)
   */
  async joinRoom(roomId) {
    console.log(`🚪 [BattleConnection] Rejoindre room: ${roomId}`);
    
    if (!this.networkHandler) {
      console.error('❌ [BattleConnection] NetworkHandler non disponible');
      return false;
    }
    
    // Si c'est un battleRoomId, se connecter via le handler
    return await this.networkHandler.connectToBattleRoom(roomId);
  }

  // === GETTERS POUR COMPATIBILITÉ ===

  /**
   * Vérifie si connecté au combat
   */
  get isConnected() {
    return this.networkHandler?.canSendBattleActions() || false;
  }

  /**
   * ID de la BattleRoom actuelle
   */
  get currentBattleRoomId() {
    return this.networkHandler?.battleRoomId || null;
  }

  /**
   * État du combat
   */
  get battleState() {
    return this.networkHandler?.battleRoom?.state || null;
  }

  /**
   * Vérifier si WorldRoom connectée
   */
  get worldRoomConnected() {
    return this.networkHandler?.worldRoom ? true : false;
  }

  // === ÉTAT ET CONNEXIONS ===

  /**
   * Obtenir l'état complet des connexions
   */
  getConnectionStatus() {
    if (!this.networkHandler) {
      return {
        initialized: false,
        worldRoom: { connected: false },
        battleRoom: { connected: false }
      };
    }
    
    return {
      initialized: this.isInitialized,
      ...this.networkHandler.getConnectionStatus()
    };
  }

  /**
   * Vérifier si on peut envoyer des actions de combat
   */
  canSendBattleActions() {
    return this.networkHandler?.canSendBattleActions() || false;
  }

  // === SYSTÈME D'ÉVÉNEMENTS (Inchangé pour compatibilité) ===

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

  // === DEBUG ===

  /**
   * Debug des connexions
   */
  debugConnections() {
    console.log('🔍 [BattleConnection] === DEBUG CONNEXIONS ===');
    
    if (this.networkHandler) {
      return this.networkHandler.debug();
    } else {
      console.log('❌ NetworkHandler non initialisé');
      return { error: 'NetworkHandler not initialized' };
    }
  }

  /**
   * Test de fonctionnalité
   */
  test() {
    console.log('🧪 [BattleConnection] Test du système...');
    
    const status = this.getConnectionStatus();
    console.log('📊 État:', status);
    
    if (this.networkHandler) {
      // Test de connexion
      const canSend = this.canSendBattleActions();
      console.log('📤 Peut envoyer actions:', canSend);
      
      // Test d'événements
      const eventCount = this.eventCallbacks.size;
      console.log('📡 Événements enregistrés:', eventCount);
      
      return {
        status,
        canSendActions: canSend,
        eventCount,
        networkHandler: 'available'
      };
    } else {
      return {
        status,
        error: 'NetworkHandler not available'
      };
    }
  }

  // === NETTOYAGE ===

  /**
   * Nettoie et détruit la connexion
   */
  async destroy() {
    console.log('💀 [BattleConnection] Destruction...');
    
    // Détruire le handler réseau
    if (this.networkHandler) {
      await this.networkHandler.destroy();
      this.networkHandler = null;
    }
    
    // Nettoyer les callbacks
    this.eventCallbacks.clear();
    
    // Nettoyer les références
    this.gameManager = null;
    
    this.isInitialized = false;
    
    console.log('✅ [BattleConnection] Détruit');
  }
}
