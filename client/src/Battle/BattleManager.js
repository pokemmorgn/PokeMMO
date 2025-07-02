// client/src/managers/BattleManager.js - Gestionnaire de logique de combat côté client

export class BattleManager {
  constructor() {
    // État du combat
    this.battleState = {
      active: false,
      battleId: null,
      battleType: null, // "wild", "trainer", "pvp"
      phase: 'intro', // "intro", "team_selection", "battle", "ended"
      
      // Participants
      player: {
        id: null,
        name: null,
        pokemon: null
      },
      opponent: {
        id: null,
        name: null,
        pokemon: null,
        isWild: false
      },
      
      // Combat
      currentTurn: null, // "player1", "player2"
      turnNumber: 1,
      canRun: true,
      waitingForAction: false,
      
      // Interface
      selectedAction: null,
      selectedMove: null,
      selectedItem: null,
      showingSubmenu: null, // "moves", "items", "pokemon"
      
      // Log et messages
      battleLog: [],
      lastMessage: "",
      
      // Résultats
      battleEnded: false,
      winner: null,
      rewards: null
    };
    
    // Callbacks d'événements
    this.eventCallbacks = new Map();
    
    // Références UI et réseau
    this.networkHandler = null;
    this.uiHandler = null;
    this.gameManager = null;
    
    // État interne
    this.isInitialized = false;
    this.movementWasBlocked = false;
    
    console.log('⚔️ [BattleManager] Initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise le BattleManager avec les dépendances
   */
  initialize(gameManager, networkHandler) {
    console.log('🔧 [BattleManager] Initialisation avec dépendances...');
    
    this.gameManager = gameManager;
    this.networkHandler = networkHandler;
    
    // Setup des événements réseau
    this.setupNetworkEvents();
    
    this.isInitialized = true;
    console.log('✅ [BattleManager] Initialisé avec succès');
  }

  /**
   * Configure les événements réseau pour le combat
   */
setupNetworkEvents() {
  console.log('📡 [BattleManager] Configuration des événements réseau...');
  
  // ✅ PROTECTION: Vérifier que networkHandler existe et a les bonnes méthodes
  if (!this.networkHandler) {
    console.warn('⚠️ [BattleManager] NetworkHandler manquant - événements ignorés');
    return;
  }
  
  // ✅ CORRECTION: Essayer plusieurs sources pour les événements de combat
  let battleEventSource = null;
  
  // Option 1: BattleNetworkHandler direct (le meilleur)
  if (this.networkHandler.battleNetworkHandler && typeof this.networkHandler.battleNetworkHandler.on === 'function') {
    battleEventSource = this.networkHandler.battleNetworkHandler;
    console.log('✅ [BattleManager] Utilisation BattleNetworkHandler direct');
  }
  // Option 2: NetworkHandler principal avec méthode .on()
  else if (typeof this.networkHandler.on === 'function') {
    battleEventSource = this.networkHandler;
    console.log('✅ [BattleManager] Utilisation NetworkHandler principal');
  }
  // Option 3: BattleNetworkHandler global
  else if (window.globalNetworkManager?.battleNetworkHandler && typeof window.globalNetworkManager.battleNetworkHandler.on === 'function') {
    battleEventSource = window.globalNetworkManager.battleNetworkHandler;
    console.log('✅ [BattleManager] Utilisation BattleNetworkHandler global');
  }
  else {
    console.error('❌ [BattleManager] Aucune source d\'événements de combat trouvée');
    console.log('🔍 Debug networkHandler:', {
      networkHandler: !!this.networkHandler,
      networkHandlerKeys: this.networkHandler ? Object.keys(this.networkHandler).slice(0, 10) : [],
      hasBattleHandler: !!(this.networkHandler?.battleNetworkHandler),
      hasOnMethod: typeof this.networkHandler?.on === 'function',
      globalBattleHandler: !!(window.globalNetworkManager?.battleNetworkHandler)
    });
    return;
  }

  // ✅ CONFIGURER LES ÉVÉNEMENTS avec la source trouvée
  try {
    // Rencontre sauvage avec combat immédiat
    battleEventSource.on('wildEncounterStart', (data) => {
      console.log('🐾 [BattleManager] wildEncounterStart reçu:', data);
      this.handleWildEncounterStart(data);
    });

    // BattleRoom créée
    battleEventSource.on('battleRoomCreated', (data) => {
      console.log('🏠 [BattleManager] battleRoomCreated reçu:', data);
      this.handleBattleRoomCreated(data);
    });

    // Rejoindre BattleRoom
    battleEventSource.on('joinBattleRoom', (data) => {
      console.log('🚪 [BattleManager] joinBattleRoom reçu:', data);
      this.handleJoinBattleRoom(data);
    });

    // Combat commencé
    battleEventSource.on('battleStart', (data) => {
      console.log('⚔️ [BattleManager] battleStart reçu:', data);
      this.handleBattleStart(data);
    });

    // Changement de tour
    battleEventSource.on('turnChange', (data) => {
      console.log('🔄 [BattleManager] turnChange reçu:', data);
      this.handleTurnChange(data);
    });

    // Message de combat
    battleEventSource.on('battleMessage', (data) => {
      console.log('💬 [BattleManager] battleMessage reçu:', data);
      this.addBattleMessage(data.message);
    });

    // Fin de combat
    battleEventSource.on('battleEnd', (data) => {
      console.log('🏁 [BattleManager] battleEnd reçu:', data);
      this.handleBattleEnd(data);
    });

    // Erreurs de combat
    battleEventSource.on('battleError', (data) => {
      console.error('❌ [BattleManager] battleError reçu:', data);
      this.handleBattleError(data);
    });

    console.log('✅ [BattleManager] Événements réseau configurés avec succès');

  } catch (error) {
    console.error('❌ [BattleManager] Erreur configuration événements:', error);
  }
}

  // === GESTION DES ÉVÉNEMENTS RÉSEAU ===

  /**
   * Une rencontre sauvage démarre immédiatement
   */
  handleWildEncounterStart(data) {
    console.log('🐾 [BattleManager] Rencontre sauvage:', data);
    
    // Bloquer les mouvements
    this.disableMovement();
    
    // Préparer l'état de combat
    this.battleState.active = true;
    this.battleState.battleType = 'wild';
    this.battleState.phase = 'intro';
    
    // Pokémon adversaire
    this.battleState.opponent = {
      pokemon: data.pokemon,
      isWild: true,
      name: `${data.pokemon.name} sauvage`
    };
    
    // Afficher l'interface de combat
    this.showBattleInterface();
    
    // Message d'introduction
    this.addBattleMessage(data.message || `Un ${data.pokemon.name} sauvage apparaît !`);
    
    this.triggerEvent('encounterStart', data);
  }

  /**
   * BattleRoom créée par le serveur
   */
  handleBattleRoomCreated(data) {
    console.log('🏠 [BattleManager] BattleRoom créée:', data.battleRoomId);
    
    this.battleState.battleId = data.battleRoomId;
    this.battleState.battleType = data.battleType;
    
    // Rejoindre automatiquement la BattleRoom
    if (this.networkHandler) {
      console.log('🚪 [BattleManager] Tentative de rejoindre BattleRoom...');
      this.networkHandler.joinRoom(data.battleRoomId);
    }
    
    this.triggerEvent('battleRoomCreated', data);
  }

  /**
   * Rejoindre la BattleRoom
   */
  handleJoinBattleRoom(data) {
    console.log('🚪 [BattleManager] Rejoindre BattleRoom:', data.battleRoomId);
    
    this.battleState.phase = 'team_selection';
    this.addBattleMessage('Connexion au combat...');
    
    this.triggerEvent('joinBattleRoom', data);
  }

  /**
   * Combat effectivement commencé
   */
  handleBattleStart(data) {
    console.log('⚔️ [BattleManager] Combat commencé !', data);
    
    this.battleState.phase = 'battle';
    this.battleState.player.pokemon = data.player1Pokemon;
    this.battleState.opponent.pokemon = data.player2Pokemon;
    this.battleState.currentTurn = data.currentTurn;
    this.battleState.turnNumber = data.turnNumber;
    this.battleState.waitingForAction = true;
    
    // Mettre à jour l'interface
    this.updateBattleInterface();
    
    this.triggerEvent('battleStart', data);
  }

  /**
   * Changement de tour
   */
  handleTurnChange(data) {
    console.log('🔄 [BattleManager] Nouveau tour:', data.turnNumber, 'Current:', data.currentTurn);
    
    this.battleState.currentTurn = data.currentTurn;
    this.battleState.turnNumber = data.turnNumber;
    this.battleState.waitingForAction = data.currentTurn === 'player1';
    
    // Réinitialiser l'interface d'action
    this.resetActionSelection();
    this.updateBattleInterface();
    
    this.triggerEvent('turnChange', data);
  }

  /**
   * Fin de combat
   */
  handleBattleEnd(data) {
    console.log('🏁 [BattleManager] Fin de combat:', data.result);
    
    this.battleState.phase = 'ended';
    this.battleState.battleEnded = true;
    this.battleState.winner = data.result;
    this.battleState.rewards = data.rewards;
    this.battleState.waitingForAction = false;
    
    // Message de fin
    const resultMessage = this.getEndMessage(data.result);
    this.addBattleMessage(resultMessage);
    
    // Afficher les récompenses
    if (data.rewards) {
      this.showRewards(data.rewards);
    }
    
    // Programmer la fermeture
    setTimeout(() => {
      this.endBattle();
    }, 5000);
    
    this.triggerEvent('battleEnd', data);
  }

  /**
   * Erreur de combat
   */
  handleBattleError(data) {
    console.error('❌ [BattleManager] Erreur combat:', data);
    
    this.addBattleMessage(`Erreur: ${data.message}`);
    
    // Si erreur critique, fermer le combat
    if (data.critical) {
      setTimeout(() => {
        this.endBattle();
      }, 3000);
    }
    
    this.triggerEvent('battleError', data);
  }

  // === ACTIONS DE COMBAT ===

  /**
   * Sélectionner une action de combat
   */
  selectAction(actionType) {
    if (!this.canSelectAction()) {
      console.warn('⚠️ [BattleManager] Impossible de sélectionner une action maintenant');
      return false;
    }

    console.log(`🎯 [BattleManager] Action sélectionnée: ${actionType}`);
    
    this.battleState.selectedAction = actionType;
    
    switch (actionType) {
      case 'fight':
        this.showMovesSubmenu();
        break;
      case 'bag':
        this.showItemsSubmenu();
        break;
      case 'pokemon':
        this.showPokemonSubmenu();
        break;
      case 'run':
        this.attemptRun();
        break;
    }
    
    this.triggerEvent('actionSelected', { action: actionType });
    return true;
  }

  /**
   * Sélectionner une attaque
   */
  selectMove(moveId) {
    console.log(`💥 [BattleManager] Attaque sélectionnée: ${moveId}`);
    
    this.battleState.selectedMove = moveId;
    this.hideSubmenus();
    
    // Envoyer l'action au serveur
    this.sendBattleAction('attack', { moveId });
    
    this.triggerEvent('moveSelected', { moveId });
  }

  /**
   * Utiliser un objet
   */
  useItem(itemId) {
    console.log(`🎒 [BattleManager] Objet utilisé: ${itemId}`);
    
    this.battleState.selectedItem = itemId;
    this.hideSubmenus();
    
    // Envoyer l'action au serveur
    this.sendBattleAction('item', { itemId });
    
    this.triggerEvent('itemUsed', { itemId });
  }

  /**
   * Tenter de fuir
   */
  attemptRun() {
    if (!this.battleState.canRun) {
      this.addBattleMessage("Impossible de fuir !");
      return false;
    }

    console.log(`🏃 [BattleManager] Tentative de fuite`);
    
    // Envoyer l'action au serveur
    this.sendBattleAction('run', {});
    
    this.triggerEvent('runAttempted', {});
    return true;
  }

  /**
   * Envoyer une action de combat au serveur
   */
  sendBattleAction(actionType, data) {
    if (!this.networkHandler || !this.battleState.battleId) {
      console.error('❌ [BattleManager] Impossible d\'envoyer l\'action - pas de connexion');
      return;
    }

    console.log(`📤 [BattleManager] Envoi action: ${actionType}`, data);
    
    this.battleState.waitingForAction = false;
    
    this.networkHandler.send('battleAction', {
      actionType,
      ...data
    });
  }

  // === GESTION DE L'INTERFACE ===

  /**
   * Afficher l'interface de combat
   */
  showBattleInterface() {
    console.log('🖥️ [BattleManager] Affichage interface de combat');
    
    // Créer l'overlay s'il n'existe pas
    if (!this.uiHandler) {
      this.createBattleUI();
    }
    
    // Afficher l'overlay
    if (this.uiHandler) {
      this.uiHandler.show();
    }
    
    this.triggerEvent('interfaceShown');
  }

  /**
   * Mettre à jour l'interface de combat
   */
  updateBattleInterface() {
    if (!this.uiHandler) return;
    
    this.uiHandler.updatePokemonDisplay();
    this.uiHandler.updateTurnIndicator();
    this.uiHandler.updateActionButtons();
  }

  /**
   * Créer l'interface de combat
   */
  createBattleUI() {
    console.log('🏗️ [BattleManager] Création interface combat');
    
    // TODO: Créer BattleUI quand le fichier sera prêt
    // this.uiHandler = new BattleUI(this);
    
    this.triggerEvent('uiCreated');
  }

  /**
   * Afficher le sous-menu des attaques
   */
  showMovesSubmenu() {
    this.battleState.showingSubmenu = 'moves';
    this.updateBattleInterface();
    this.triggerEvent('submenuShown', { type: 'moves' });
  }

  /**
   * Afficher le sous-menu des objets
   */
  showItemsSubmenu() {
    this.battleState.showingSubmenu = 'items';
    this.updateBattleInterface();
    this.triggerEvent('submenuShown', { type: 'items' });
  }

  /**
   * Afficher le sous-menu des Pokémon
   */
  showPokemonSubmenu() {
    this.battleState.showingSubmenu = 'pokemon';
    this.updateBattleInterface();
    this.triggerEvent('submenuShown', { type: 'pokemon' });
  }

  /**
   * Cacher tous les sous-menus
   */
  hideSubmenus() {
    this.battleState.showingSubmenu = null;
    this.updateBattleInterface();
    this.triggerEvent('submenuHidden');
  }

  /**
   * Réinitialiser la sélection d'action
   */
  resetActionSelection() {
    this.battleState.selectedAction = null;
    this.battleState.selectedMove = null;
    this.battleState.selectedItem = null;
    this.hideSubmenus();
  }

  // === GESTION DES MESSAGES ===

  /**
   * Ajouter un message au log de combat
   */
  addBattleMessage(message) {
    console.log(`💬 [BattleManager] Message: ${message}`);
    
    this.battleState.battleLog.push(message);
    this.battleState.lastMessage = message;
    
    // Limiter le log à 50 messages
    if (this.battleState.battleLog.length > 50) {
      this.battleState.battleLog.shift();
    }
    
    // Mettre à jour l'UI
    if (this.uiHandler) {
      this.uiHandler.addLogMessage(message);
    }
    
    this.triggerEvent('messageAdded', { message });
  }

  /**
   * Afficher les récompenses
   */
  showRewards(rewards) {
    console.log('🎁 [BattleManager] Récompenses:', rewards);
    
    if (rewards.experience > 0) {
      this.addBattleMessage(`Vous gagnez ${rewards.experience} points d'expérience !`);
    }
    
    if (rewards.gold > 0) {
      this.addBattleMessage(`Vous trouvez ${rewards.gold} pièces d'or !`);
    }
    
    if (rewards.pokemonCaught) {
      this.addBattleMessage(`Pokémon capturé avec succès !`);
    }
    
    this.triggerEvent('rewardsShown', { rewards });
  }

  // === UTILITAIRES ===

  /**
   * Vérifier si on peut sélectionner une action
   */
  canSelectAction() {
    return this.battleState.active && 
           this.battleState.phase === 'battle' && 
           this.battleState.waitingForAction &&
           this.battleState.currentTurn === 'player1';
  }

  /**
   * Obtenir le message de fin de combat
   */
  getEndMessage(result) {
    switch (result) {
      case 'victory':
        return 'Victoire ! Vous avez remporté le combat !';
      case 'defeat':
        return 'Défaite... Vos Pokémon sont tous KO.';
      case 'fled':
        return 'Vous avez pris la fuite !';
      case 'draw':
        return 'Match nul !';
      default:
        return 'Combat terminé.';
    }
  }

  /**
   * Désactiver le mouvement du joueur
   */
  disableMovement() {
    if (this.gameManager && this.gameManager.player) {
      this.movementWasBlocked = true;
      this.gameManager.player.setMovementEnabled(false);
      console.log('🚫 [BattleManager] Mouvement désactivé');
    }
  }

  /**
   * Réactiver le mouvement du joueur
   */
  enableMovement() {
    if (this.gameManager && this.gameManager.player && this.movementWasBlocked) {
      this.gameManager.player.setMovementEnabled(true);
      this.movementWasBlocked = false;
      console.log('✅ [BattleManager] Mouvement réactivé');
    }
  }

  /**
   * Terminer le combat et nettoyer
   */
  endBattle() {
    console.log('🏁 [BattleManager] Fin du combat - nettoyage');
    
    // Réinitialiser l'état
    this.battleState.active = false;
    this.battleState.phase = 'ended';
    
    // Cacher l'interface
    if (this.uiHandler) {
      this.uiHandler.hide();
    }
    
    // Réactiver le mouvement
    this.enableMovement();
    
    // Nettoyer
    this.resetBattleState();
    
    this.triggerEvent('battleEnded');
  }

  /**
   * Réinitialiser l'état de combat
   */
  resetBattleState() {
    this.battleState = {
      active: false,
      battleId: null,
      battleType: null,
      phase: 'intro',
      player: { id: null, name: null, pokemon: null },
      opponent: { id: null, name: null, pokemon: null, isWild: false },
      currentTurn: null,
      turnNumber: 1,
      canRun: true,
      waitingForAction: false,
      selectedAction: null,
      selectedMove: null,
      selectedItem: null,
      showingSubmenu: null,
      battleLog: [],
      lastMessage: "",
      battleEnded: false,
      winner: null,
      rewards: null
    };
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
          console.error(`❌ [BattleManager] Erreur callback ${eventName}:`, error);
        }
      });
    }
  }

  // === GETTERS ===

  get isActive() {
    return this.battleState.active;
  }

  get currentPhase() {
    return this.battleState.phase;
  }

  get isMyTurn() {
    return this.battleState.currentTurn === 'player1' && this.battleState.waitingForAction;
  }

  get battleLog() {
    return [...this.battleState.battleLog];
  }

  get playerPokemon() {
    return this.battleState.player.pokemon;
  }

  get opponentPokemon() {
    return this.battleState.opponent.pokemon;
  }
}
