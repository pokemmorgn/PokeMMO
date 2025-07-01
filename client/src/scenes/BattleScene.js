// client/src/scenes/BattleScene.js - Scène de combat overlay
import { BattleManager } from '../Battle/BattleManager.js';
import { BattleUI } from '../Battle/BattleUI.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers
    this.battleManager = null;
    this.battleUI = null;
    this.gameManager = null;
    this.networkHandler = null;
    
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    
    // Références DOM
    this.battleOverlay = null;
    
    console.log('⚔️ [BattleScene] Constructeur initialisé');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('🔧 [BattleScene] Init avec data:', data);
    
    // Récupérer les managers depuis la scène précédente ou les data
    this.gameManager = data.gameManager || this.scene.get('GameScene')?.gameManager;
    this.networkHandler = data.networkHandler || this.scene.get('GameScene')?.networkHandler;
    
    if (!this.gameManager || !this.networkHandler) {
      console.error('❌ [BattleScene] Managers manquants dans init');
      return;
    }
    
    console.log('✅ [BattleScene] Managers récupérés');
  }

  preload() {
    console.log('📁 [BattleScene] Préchargement des ressources...');
    
    // Charger les sprites de Pokémon (placeholders pour l'instant)
    this.load.image('pokemon_placeholder_front', 'assets/pokemon/placeholder_front.png');
    this.load.image('pokemon_placeholder_back', 'assets/pokemon/placeholder_back.png');
    
    // Charger les backgrounds de combat
    this.load.image('battle_bg_grass', 'assets/battle/bg_grass.png');
    this.load.image('battle_bg_beach', 'assets/battle/bg_beach.png');
    
    // Charger les éléments d'interface
    this.load.image('battle_hud_frame', 'assets/battle/hud_frame.png');
    this.load.image('hp_bar_bg', 'assets/battle/hp_bar_bg.png');
    this.load.image('hp_bar_fill', 'assets/battle/hp_bar_fill.png');
    
    // Fallbacks si les assets n'existent pas
    this.load.on('loaderror', (file) => {
      console.warn(`⚠️ [BattleScene] Asset manquant: ${file.key}, utilisation d'un placeholder`);
    });
    
    console.log('✅ [BattleScene] Préchargement configuré');
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // Initialiser le BattleManager
      this.battleManager = new BattleManager();
      
      if (!this.gameManager || !this.networkHandler) {
        console.error('❌ [BattleScene] Impossible de créer sans managers');
        return;
      }
      
      this.battleManager.initialize(this.gameManager, this.networkHandler);
      
      // Créer l'overlay DOM
      this.createBattleOverlay();
      
      // Initialiser l'interface de combat
      this.battleUI = new BattleUI(this, this.battleManager);
      this.battleUI.initialize();
      this.battleUI.createBackground();

      // Setup des événements
      this.setupBattleEvents();
      
      // La scène est créée mais pas visible
      this.isActive = true;
      this.isVisible = false;
      
      console.log('✅ [BattleScene] Scène créée avec succès');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === CRÉATION DE L'OVERLAY DOM ===

  createBattleOverlay() {
    console.log('🖥️ [BattleScene] Création de l\'overlay DOM...');
    
    // Créer l'overlay principal
    this.battleOverlay = document.createElement('div');
    this.battleOverlay.className = 'battle-overlay';
    this.battleOverlay.id = 'battleOverlay';
    
    // Structure HTML de base
    this.battleOverlay.innerHTML = `
      <div class="battle-header">
        <div class="battle-info">
          <h2 class="battle-title">Combat Pokémon</h2>
          <div class="battle-turn-info">
            <span id="turnIndicator">Votre tour</span>
          </div>
        </div>
        <div class="battle-controls">
          <button class="battle-btn" id="battleMenuBtn">Menu</button>
          <button class="battle-btn" id="battleExitBtn">Quitter</button>
        </div>
      </div>
      
      <div class="battle-field">
        <div id="battleBackground"></div>
        <div id="pokemonField">
          <!-- Pokémon sprites seront injectés ici -->
        </div>
        <div id="battleEffects">
          <!-- Effets visuels temporaires -->
        </div>
      </div>
      
      <div class="battle-interface">
        <div class="battle-log" id="battleLog">
          <div class="battle-log-message">Combat en attente...</div>
        </div>
        
        <div class="battle-actions" id="battleActions">
          <button class="action-button fight" data-action="fight">
            <span class="action-icon">⚔️</span>
            <span class="action-text">Attaque</span>
          </button>
          <button class="action-button bag" data-action="bag">
            <span class="action-icon">🎒</span>
            <span class="action-text">Sac</span>
          </button>
          <button class="action-button pokemon" data-action="pokemon">
            <span class="action-icon">🔄</span>
            <span class="action-text">Pokémon</span>
          </button>
          <button class="action-button run" data-action="run">
            <span class="action-icon">🏃</span>
            <span class="action-text">Fuir</span>
          </button>
        </div>
      </div>
      
      <!-- Sous-menus (cachés par défaut) -->
      <div class="battle-submenu" id="movesSubmenu">
        <div class="submenu-header">
          <h3 class="submenu-title">Choisissez une attaque</h3>
          <button class="submenu-close" id="closeMovesSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div class="moves-grid" id="movesGrid">
            <!-- Attaques seront injectées ici -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu" id="itemsSubmenu">
        <div class="submenu-header">
          <h3 class="submenu-title">Choisissez un objet</h3>
          <button class="submenu-close" id="closeItemsSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div id="itemsList">
            <!-- Objets seront injectés ici -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu" id="pokemonSubmenu">
        <div class="submenu-header">
          <h3 class="submenu-title">Choisissez un Pokémon</h3>
          <button class="submenu-close" id="closePokemonSubmenu">×</button>
        </div>
        <div class="submenu-content">
          <div id="pokemonList">
            <!-- Pokémon seront injectés ici -->
          </div>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(this.battleOverlay);
    
    // Setup des événements DOM
    this.setupDOMEvents();
    
    console.log('✅ [BattleScene] Overlay DOM créé');
  }

  // === ÉVÉNEMENTS DOM ===

  setupDOMEvents() {
    console.log('🔗 [BattleScene] Configuration des événements DOM...');
    
    // Boutons d'action principaux
    const actionButtons = this.battleOverlay.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleActionClick(action);
      });
    });
    
    // Boutons de contrôle
    const menuBtn = this.battleOverlay.querySelector('#battleMenuBtn');
    const exitBtn = this.battleOverlay.querySelector('#battleExitBtn');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        this.toggleBattleMenu();
      });
    }
    
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        this.attemptExitBattle();
      });
    }
    
    // Boutons de fermeture des sous-menus
    const closeButtons = this.battleOverlay.querySelectorAll('.submenu-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.hideAllSubmenus();
      });
    });
    
    console.log('✅ [BattleScene] Événements DOM configurés');
  }

  // === ÉVÉNEMENTS DE COMBAT ===

  setupBattleEvents() {
    if (!this.battleManager) return;
    
    console.log('⚔️ [BattleScene] Configuration des événements de combat...');
    
    // Événements du BattleManager
    this.battleManager.on('encounterStart', (data) => {
      this.handleEncounterStart(data);
    });
    
    this.battleManager.on('battleStart', (data) => {
      this.handleBattleStart(data);
    });
    
    this.battleManager.on('turnChange', (data) => {
      this.handleTurnChange(data);
    });
    
    this.battleManager.on('messageAdded', (data) => {
      this.addBattleLogMessage(data.message);
    });
    
    this.battleManager.on('battleEnd', (data) => {
      this.handleBattleEnd(data);
    });
    
    this.battleManager.on('actionSelected', (data) => {
      this.handleActionSelected(data);
    });
    
    this.battleManager.on('submenuShown', (data) => {
      this.showSubmenu(data.type);
    });
    
    this.battleManager.on('submenuHidden', () => {
      this.hideAllSubmenus();
    });
    
    console.log('✅ [BattleScene] Événements de combat configurés');
  }

  // === HANDLERS D'ÉVÉNEMENTS ===

  handleEncounterStart(data) {
    console.log('🐾 [BattleScene] Début de rencontre:', data);
    
    // Afficher l'interface de combat
    this.showBattleInterface();
    
    // Mettre à jour les informations
    this.updateBattleTitle('Combat sauvage !');
    this.addBattleLogMessage(`Un ${data.pokemon?.name || 'Pokémon'} sauvage apparaît !`);
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleScene] Début de combat:', data);
    
    // Afficher les Pokémon
    if (this.battleUI) {
      this.battleUI.displayPokemon(data.player1Pokemon, data.player2Pokemon);
    }
    
    // Mettre à jour le tour
    this.updateTurnIndicator(data.currentTurn);
    
    // Activer les boutons d'action
    this.enableActionButtons();
  }

  handleTurnChange(data) {
    console.log('🔄 [BattleScene] Changement de tour:', data);
    
    this.updateTurnIndicator(data.currentTurn);
    this.hideAllSubmenus();
    
    // Réactiver les boutons si c'est notre tour
    if (data.currentTurn === 'player1') {
      this.enableActionButtons();
    } else {
      this.disableActionButtons();
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleScene] Fin de combat:', data);
    
    this.addBattleLogMessage(`Combat terminé : ${data.result}`);
    this.disableActionButtons();
    
    // Programmer la fermeture
    setTimeout(() => {
      this.hideBattleInterface();
    }, 3000);
  }

  handleActionSelected(data) {
    console.log('🎯 [BattleScene] Action sélectionnée:', data);
    
    // Désactiver temporairement les boutons
    this.disableActionButtons();
  }

  // === GESTION DES ACTIONS ===

  handleActionClick(action) {
    if (!this.battleManager) {
      console.warn('⚠️ [BattleScene] BattleManager non disponible');
      return;
    }
    
    if (!this.battleManager.canSelectAction()) {
      console.warn('⚠️ [BattleScene] Impossible de sélectionner une action maintenant');
      return;
    }
    
    console.log(`🎮 [BattleScene] Action cliquée: ${action}`);
    
    const success = this.battleManager.selectAction(action);
    if (!success) {
      console.warn(`⚠️ [BattleScene] Échec de sélection de l'action: ${action}`);
    }
  }

  // === GESTION DES SOUS-MENUS ===

  showSubmenu(type) {
    console.log(`📋 [BattleScene] Affichage sous-menu: ${type}`);
    
    // Cacher tous les sous-menus d'abord
    this.hideAllSubmenus();
    
    const submenu = this.battleOverlay?.querySelector(`#${type}Submenu`);
    if (submenu) {
      submenu.classList.add('active');
      
      // Remplir le contenu selon le type
      switch (type) {
        case 'moves':
          this.populateMovesSubmenu();
          break;
        case 'items':
          this.populateItemsSubmenu();
          break;
        case 'pokemon':
          this.populatePokemonSubmenu();
          break;
      }
    }
  }

  hideAllSubmenus() {
    const submenus = this.battleOverlay?.querySelectorAll('.battle-submenu');
    submenus?.forEach(submenu => {
      submenu.classList.remove('active');
    });
  }

  populateMovesSubmenu() {
    console.log('💥 [BattleScene] Population des attaques...');
    
    const movesGrid = this.battleOverlay?.querySelector('#movesGrid');
    if (!movesGrid) return;
    
    // Récupérer les attaques du Pokémon actuel
    const playerPokemon = this.battleManager?.playerPokemon;
    if (!playerPokemon || !playerPokemon.moves) {
      movesGrid.innerHTML = '<p>Aucune attaque disponible</p>';
      return;
    }
    
    // Générer les boutons d'attaque
    const movesHTML = playerPokemon.moves.map(moveId => `
      <button class="move-button" data-move-id="${moveId}">
        <div class="move-name">${this.getMoveName(moveId)}</div>
        <div class="move-info">PP: ${this.getMovePP(moveId)}</div>
      </button>
    `).join('');
    
    movesGrid.innerHTML = movesHTML;
    
    // Ajouter les événements
    const moveButtons = movesGrid.querySelectorAll('.move-button');
    moveButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const moveId = e.currentTarget.dataset.moveId;
        this.selectMove(moveId);
      });
    });
  }

  populateItemsSubmenu() {
    console.log('🎒 [BattleScene] Population des objets...');
    
    const itemsList = this.battleOverlay?.querySelector('#itemsList');
    if (!itemsList) return;
    
    // TODO: Récupérer l'inventaire du joueur
    // Pour l'instant, objets de base
    const items = [
      { id: 'poke_ball', name: 'Poké Ball', count: 5 },
      { id: 'potion', name: 'Potion', count: 3 }
    ];
    
    const itemsHTML = items.map(item => `
      <button class="item-button" data-item-id="${item.id}">
        <span class="item-name">${item.name}</span>
        <span class="item-count">×${item.count}</span>
      </button>
    `).join('');
    
    itemsList.innerHTML = itemsHTML;
    
    // Ajouter les événements
    const itemButtons = itemsList.querySelectorAll('.item-button');
    itemButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const itemId = e.currentTarget.dataset.itemId;
        this.selectItem(itemId);
      });
    });
  }

  populatePokemonSubmenu() {
    console.log('🔄 [BattleScene] Population des Pokémon...');
    
    const pokemonList = this.battleOverlay?.querySelector('#pokemonList');
    if (!pokemonList) return;
    
    // TODO: Récupérer l'équipe du joueur
    // Pour l'instant, Pokémon de base
    const team = [
      { id: '1', name: 'Bulbasaur', level: 5, hp: 20, maxHp: 20, status: 'normal' },
      { id: '2', name: 'Charmander', level: 5, hp: 0, maxHp: 19, status: 'ko' }
    ];
    
    const pokemonHTML = team.map(pokemon => `
      <button class="pokemon-button ${pokemon.hp <= 0 ? 'fainted' : ''}" 
              data-pokemon-id="${pokemon.id}"
              ${pokemon.hp <= 0 ? 'disabled' : ''}>
        <div class="pokemon-info">
          <div class="pokemon-name">${pokemon.name} Niv.${pokemon.level}</div>
          <div class="pokemon-hp">PV: ${pokemon.hp}/${pokemon.maxHp}</div>
          <div class="pokemon-status">${pokemon.status === 'ko' ? 'KO' : pokemon.status}</div>
        </div>
      </button>
    `).join('');
    
    pokemonList.innerHTML = pokemonHTML;
    
    // Ajouter les événements
    const pokemonButtons = pokemonList.querySelectorAll('.pokemon-button:not([disabled])');
    pokemonButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const pokemonId = e.currentTarget.dataset.pokemonId;
        this.selectPokemon(pokemonId);
      });
    });
  }

  // === SÉLECTION D'ACTIONS ===

  selectMove(moveId) {
    console.log(`💥 [BattleScene] Attaque sélectionnée: ${moveId}`);
    
    if (this.battleManager) {
      this.battleManager.selectMove(moveId);
    }
  }

  selectItem(itemId) {
    console.log(`🎒 [BattleScene] Objet sélectionné: ${itemId}`);
    
    if (this.battleManager) {
      this.battleManager.useItem(itemId);
    }
  }

  selectPokemon(pokemonId) {
    console.log(`🔄 [BattleScene] Pokémon sélectionné: ${pokemonId}`);
    
    // TODO: Implémenter changement de Pokémon
    this.addBattleLogMessage(`Changement de Pokémon non encore implémenté`);
    this.hideAllSubmenus();
  }

  // === GESTION DE L'INTERFACE ===

  showBattleInterface() {
    console.log('🖥️ [BattleScene] Affichage interface de combat');
    
    if (this.battleOverlay) {
      this.battleOverlay.classList.add('active');
      this.isVisible = true;
      
      // Faire passer la scène en premier plan
      this.scene.bringToTop();
    }
  }

  hideBattleInterface() {
    console.log('🖥️ [BattleScene] Masquage interface de combat');
    
    if (this.battleOverlay) {
      this.battleOverlay.classList.remove('active');
      this.isVisible = false;
      
      // Revenir à la scène principale
    if (this.scene && typeof this.scene.sleep === 'function') {
      this.scene.sleep();
    }
  }

  updateBattleTitle(title) {
    const titleElement = this.battleOverlay?.querySelector('.battle-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  updateTurnIndicator(currentTurn) {
    const indicator = this.battleOverlay?.querySelector('#turnIndicator');
    if (indicator) {
      if (currentTurn === 'player1') {
        indicator.textContent = 'Votre tour';
        indicator.className = 'turn-indicator my-turn';
      } else {
        indicator.textContent = 'Tour adversaire';
        indicator.className = 'turn-indicator opponent-turn';
      }
    }
  }

  enableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = false;
      button.classList.remove('disabled');
    });
  }

  disableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = true;
      button.classList.add('disabled');
    });
  }

  addBattleLogMessage(message) {
    const battleLog = this.battleOverlay?.querySelector('#battleLog');
    if (!battleLog) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'battle-log-message';
    messageElement.textContent = message;
    
    battleLog.appendChild(messageElement);
    
    // Faire défiler vers le bas
    battleLog.scrollTop = battleLog.scrollHeight;
    
    // Limiter le nombre de messages (garder les 20 derniers)
    const messages = battleLog.querySelectorAll('.battle-log-message');
    if (messages.length > 20) {
      messages[0].remove();
    }
  }

  // === MÉTHODES UTILITAIRES ===

  getMoveName(moveId) {
    // Table des noms d'attaques - à remplacer par une vraie DB
    const moveNames = {
      'tackle': 'Charge',
      'growl': 'Grondement', 
      'vine_whip': 'Fouet Lianes',
      'ember': 'Flammèche',
      'water_gun': 'Pistolet à O',
      'thunder_shock': 'Éclair'
    };
    
    return moveNames[moveId] || moveId;
  }

  getMovePP(moveId) {
    // Table des PP d'attaques - à remplacer par une vraie DB
    const movePP = {
      'tackle': '35/35',
      'growl': '40/40',
      'vine_whip': '25/25',
      'ember': '25/25',
      'water_gun': '25/25',
      'thunder_shock': '30/30'
    };
    
    return movePP[moveId] || '??/??';
  }

  toggleBattleMenu() {
    console.log('📋 [BattleScene] Toggle menu de combat');
    // TODO: Implémenter menu de combat (options, etc.)
  }

  attemptExitBattle() {
    console.log('🚪 [BattleScene] Tentative de sortie de combat');
    
    if (this.battleManager && this.battleManager.isActive) {
      // Tenter de fuir
      this.battleManager.attemptRun();
    } else {
      // Fermer directement
      this.hideBattleInterface();
    }
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Lance un combat sauvage
   */
  startWildBattle(wildPokemon, location) {
    console.log('🐾 [BattleScene] Lancement combat sauvage:', wildPokemon);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller la scène si elle dort
    if (!this.scene.isActive()) {
      this.scene.wake();
    }
    
    // Le BattleManager va gérer la logique
    // L'interface sera mise à jour via les événements
  }

  /**
   * Ferme le combat et revient au jeu normal
   */
  endBattle() {
    console.log('🏁 [BattleScene] Fin de combat');
    
    this.hideBattleInterface();
    
    // Nettoyer l'état
    if (this.battleManager) {
      this.battleManager.endBattle();
    }
    
    // Remettre la scène en veille
    this.scene.sleep();
  }

  /**
   * Vérifie si le combat est actif
   */
  isBattleActive() {
    return this.isVisible && this.battleManager?.isActive;
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleScene] Destruction de la scène...');
    
    // Supprimer l'overlay DOM
    if (this.battleOverlay && this.battleOverlay.parentNode) {
      this.battleOverlay.parentNode.removeChild(this.battleOverlay);
      this.battleOverlay = null;
    }
    
    // Nettoyer les managers
    if (this.battleUI) {
      this.battleUI.destroy();
      this.battleUI = null;
    }
    
    if (this.battleManager) {
      this.battleManager = null;
    }
    
    // Appeler le destroy parent
    super.destroy();
    
    console.log('✅ [BattleScene] Scène détruite');
  }
}
