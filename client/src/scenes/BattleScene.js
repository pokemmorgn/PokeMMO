// client/src/scenes/BattleScene.js - Version corrigée avec séparation DOM/Phaser
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
    
    // ✅ SÉPARATION: DOM vs Phaser
    // DOM: Interface d'actions, log, menus
    this.battleOverlay = null;
    
    // Phaser: Background, sprites, effets visuels
    // (géré par BattleUI)
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('⚔️ [BattleScene] Constructeur initialisé (version corrigée)');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('🔧 [BattleScene] Init avec data:', data);
    
    // Récupérer les managers
    this.gameManager = data.gameManager || this.scene.get('GameScene')?.gameManager;
    this.networkHandler = data.networkHandler || this.scene.get('GameScene')?.networkHandler;
    
    if (!this.gameManager || !this.networkHandler) {
      console.error('❌ [BattleScene] Managers manquants dans init');
      return;
    }
    
    console.log('✅ [BattleScene] Managers récupérés');
  }

  preload() {
    console.log('📁 [BattleScene] Préchargement...');
    
    // ✅ S'assurer que le background de combat est chargé
    if (!this.textures.exists('battlebg01')) {
      console.log('📥 [BattleScene] Chargement background de combat...');
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    // ✅ Sprites Pokémon de base (si pas déjà chargés)
    const pokemonSprites = [
      { id: 1, name: 'bulbasaur' },
      { id: 4, name: 'charmander' },
      { id: 7, name: 'squirtle' },
      { id: 25, name: 'pikachu' }
    ];
    
    pokemonSprites.forEach(pokemon => {
      const frontKey = `${pokemon.name}_front`;
      const backKey = `${pokemon.name}_back`;
      
      if (!this.textures.exists(frontKey)) {
        this.load.image(frontKey, `assets/pokemon/${pokemon.name}_front.png`);
      }
      if (!this.textures.exists(backKey)) {
        this.load.image(backKey, `assets/pokemon/${pokemon.name}_back.png`);
      }
    });
    
    // ✅ Placeholders si sprites manquants
    if (!this.textures.exists('pokemon_placeholder_front')) {
      // Créer placeholder générique
      this.load.image('pokemon_placeholder_front', 'assets/pokemon/placeholder_front.png');
      this.load.image('pokemon_placeholder_back', 'assets/pokemon/placeholder_back.png');
    }
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // ✅ ORDRE CORRIGÉ:
      // 1. Initialiser le BattleManager
      this.battleManager = new BattleManager();
      
      if (!this.gameManager || !this.networkHandler) {
        console.error('❌ [BattleScene] Impossible de créer sans managers');
        return;
      }
      
      this.battleManager.initialize(this.gameManager, this.networkHandler);
      
      // 2. Créer l'interface Phaser (background, sprites, barres de vie)
      this.battleUI = new BattleUI(this, this.battleManager);
      this.battleUI.initialize();

      // 3. Créer l'overlay DOM (actions, log, menus)
      this.createBattleActionInterface();
      
      // 4. Setup des événements
      this.setupBattleEvents();
      
      // La scène est créée mais pas visible
      this.isActive = true;
      this.isVisible = false;
      
      console.log('✅ [BattleScene] Scène créée avec succès (séparation DOM/Phaser)');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === CRÉATION DE L'INTERFACE D'ACTIONS (DOM) ===

  createBattleActionInterface() {
    console.log('🖥️ [BattleScene] Création interface d\'actions DOM...');
    
    // ✅ NOUVEAU: Interface plus simple focalisée sur les actions
    this.battleOverlay = document.createElement('div');
    this.battleOverlay.className = 'battle-action-overlay';
    this.battleOverlay.id = 'battleActionOverlay';
    
    // Style optimisé pour ne pas couvrir le rendu Phaser
    this.battleOverlay.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100vw;
      height: 40vh;
      z-index: 6000;
      display: none;
      flex-direction: column;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 100%);
      font-family: 'Arial', sans-serif;
      color: white;
      pointer-events: all;
    `;
    
    // ✅ Structure simplifiée : Log + Actions
    this.battleOverlay.innerHTML = `
      <!-- Zone de log de combat (style Pokémon) -->
      <div class="battle-log-section">
        <div class="battle-log" id="battleLog">
          <div class="battle-log-message">Combat en cours d'initialisation...</div>
        </div>
      </div>
      
      <!-- Interface d'actions principale -->
      <div class="battle-actions-section">
        <div class="battle-actions-grid" id="battleActions">
          <button class="action-button fight" data-action="fight" disabled>
            <div class="action-icon">⚔️</div>
            <div class="action-text">Attaque</div>
          </button>
          <button class="action-button bag" data-action="bag" disabled>
            <div class="action-icon">🎒</div>
            <div class="action-text">Sac</div>
          </button>
          <button class="action-button pokemon" data-action="pokemon" disabled>
            <div class="action-icon">🔄</div>
            <div class="action-text">Pokémon</div>
          </button>
          <button class="action-button run" data-action="run" disabled>
            <div class="action-icon">🏃</div>
            <div class="action-text">Fuir</div>
          </button>
        </div>
        
        <!-- Indicateur de tour -->
        <div class="turn-indicator" id="turnIndicator">
          <span class="turn-text">En attente...</span>
        </div>
      </div>
      
      <!-- Sous-menus d'actions -->
      <div class="battle-submenu hidden" id="movesSubmenu">
        <div class="submenu-header">
          <h3>Choisissez une attaque</h3>
          <button class="submenu-close" data-close="moves">×</button>
        </div>
        <div class="submenu-content">
          <div class="moves-grid" id="movesGrid">
            <!-- Attaques injectées dynamiquement -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu hidden" id="itemsSubmenu">
        <div class="submenu-header">
          <h3>Choisissez un objet</h3>
          <button class="submenu-close" data-close="items">×</button>
        </div>
        <div class="submenu-content">
          <div id="itemsList">
            <!-- Objets injectés dynamiquement -->
          </div>
        </div>
      </div>
      
      <div class="battle-submenu hidden" id="pokemonSubmenu">
        <div class="submenu-header">
          <h3>Choisissez un Pokémon</h3>
          <button class="submenu-close" data-close="pokemon">×</button>
        </div>
        <div class="submenu-content">
          <div id="pokemonList">
            <!-- Pokémon injectés dynamiquement -->
          </div>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(this.battleOverlay);
    
    // Ajouter les styles CSS
    this.addBattleActionStyles();
    
    // Setup des événements DOM
    this.setupDOMEvents();
    
    console.log('✅ [BattleScene] Interface d\'actions DOM créée');
  }

  addBattleActionStyles() {
    if (document.querySelector('#battle-action-styles')) return;

    const style = document.createElement('style');
    style.id = 'battle-action-styles';
    style.textContent = `
      /* Styles pour l'interface d'actions de combat */
      .battle-action-overlay {
        font-family: 'Arial', sans-serif;
        user-select: none;
      }
      
      /* Section log de combat */
      .battle-log-section {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 10px 20px;
        min-height: 80px;
      }
      
      .battle-log {
        width: 100%;
        max-height: 60px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #FFD700;
        border-radius: 8px;
        padding: 10px 15px;
        font-size: 16px;
        line-height: 1.4;
      }
      
      .battle-log-message {
        margin: 2px 0;
        color: #FFFFFF;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      /* Section actions */
      .battle-actions-section {
        flex: 0 0 auto;
        padding: 10px 20px 20px;
      }
      
      .battle-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
      }
      
      .action-button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60px;
        background: linear-gradient(145deg, #4CAF50 0%, #45a049 100%);
        border: 3px solid #FFD700;
        border-radius: 12px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        position: relative;
        overflow: hidden;
      }
      
      .action-button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        background: linear-gradient(145deg, #5CBF60 0%, #55b059 100%);
      }
      
      .action-button:disabled {
        background: linear-gradient(145deg, #666 0%, #555 100%);
        border-color: #888;
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      .action-button .action-icon {
        font-size: 24px;
        margin-right: 8px;
      }
      
      .action-button .action-text {
        font-size: 16px;
        font-weight: bold;
      }
      
      /* Couleurs spécifiques par action */
      .action-button.fight {
        background: linear-gradient(145deg, #FF6B6B 0%, #FF5252 100%);
      }
      .action-button.fight:not(:disabled):hover {
        background: linear-gradient(145deg, #FF7B7B 0%, #FF6262 100%);
      }
      
      .action-button.bag {
        background: linear-gradient(145deg, #4ECDC4 0%, #26A69A 100%);
      }
      .action-button.bag:not(:disabled):hover {
        background: linear-gradient(145deg, #5EDCD4 0%, #36B6AA 100%);
      }
      
      .action-button.pokemon {
        background: linear-gradient(145deg, #FFB74D 0%, #FF9800 100%);
      }
      .action-button.pokemon:not(:disabled):hover {
        background: linear-gradient(145deg, #FFC75D 0%, #FFA810 100%);
      }
      
      .action-button.run {
        background: linear-gradient(145deg, #9575CD 0%, #7E57C2 100%);
      }
      .action-button.run:not(:disabled):hover {
        background: linear-gradient(145deg, #A585DD 0%, #8E67D2 100%);
      }
      
      /* Indicateur de tour */
      .turn-indicator {
        text-align: center;
        padding: 8px 15px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #FFD700;
        border-radius: 20px;
        margin-top: 10px;
      }
      
      .turn-indicator .turn-text {
        color: #FFD700;
        font-weight: bold;
        font-size: 14px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      .turn-indicator.my-turn .turn-text {
        color: #00FF00;
        animation: pulse 1s infinite;
      }
      
      .turn-indicator.opponent-turn .turn-text {
        color: #FF6666;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      /* Sous-menus */
      .battle-submenu {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        transition: all 0.3s ease;
        transform: translateY(100%);
      }
      
      .battle-submenu:not(.hidden) {
        transform: translateY(0);
      }
      
      .battle-submenu.hidden {
        transform: translateY(100%);
        pointer-events: none;
      }
      
      .submenu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: rgba(255, 215, 0, 0.2);
        border-bottom: 2px solid #FFD700;
      }
      
      .submenu-header h3 {
        color: #FFD700;
        margin: 0;
        font-size: 18px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      .submenu-close {
        background: #FF6B6B;
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .submenu-close:hover {
        background: #FF5252;
        transform: scale(1.1);
      }
      
      .submenu-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }
      
      /* Grille des attaques */
      .moves-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .move-button {
        background: linear-gradient(145deg, #2196F3 0%, #1976D2 100%);
        border: 2px solid #FFD700;
        border-radius: 8px;
        color: white;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 60px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }
      
      .move-button:hover {
        background: linear-gradient(145deg, #42A5F5 0%, #2196F3 100%);
        transform: translateY(-2px);
      }
      
      .move-button .move-name {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
      }
      
      .move-button .move-info {
        font-size: 12px;
        opacity: 0.8;
      }
      
      /* Liste des objets */
      #itemsList {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .item-button {
        background: linear-gradient(145deg, #4CAF50 0%, #388E3C 100%);
        border: 2px solid #FFD700;
        border-radius: 8px;
        color: white;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 50px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .item-button:hover {
        background: linear-gradient(145deg, #66BB6A 0%, #4CAF50 100%);
        transform: translateY(-2px);
      }
      
      .item-name {
        font-weight: bold;
        font-size: 14px;
      }
      
      .item-count {
        font-size: 12px;
        opacity: 0.8;
      }
      
      /* Liste des Pokémon */
      #pokemonList {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .pokemon-button {
        background: linear-gradient(145deg, #FF9800 0%, #F57C00 100%);
        border: 2px solid #FFD700;
        border-radius: 8px;
        color: white;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .pokemon-button:hover {
        background: linear-gradient(145deg, #FFB74D 0%, #FF9800 100%);
        transform: translateY(-2px);
      }
      
      .pokemon-button:disabled {
        background: linear-gradient(145deg, #666 0%, #555 100%);
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      .pokemon-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
      
      .pokemon-name {
        font-weight: bold;
        font-size: 14px;
      }
      
      .pokemon-hp, .pokemon-status {
        font-size: 12px;
        opacity: 0.9;
      }
    `;
    
    document.head.appendChild(style);
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
    
    // Boutons de fermeture des sous-menus
    const closeButtons = this.battleOverlay.querySelectorAll('.submenu-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const submenuType = e.currentTarget.dataset.close;
        this.hideSubmenu(submenuType);
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
    this.addBattleLogMessage(`Un ${data.pokemon?.name || 'Pokémon'} sauvage apparaît !`);
    
    // Stocker les données du Pokémon adversaire
    this.currentOpponentPokemon = data.pokemon;
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleScene] Début de combat:', data);
    
    // Stocker les données des Pokémon
    this.currentPlayerPokemon = data.player1Pokemon;
    this.currentOpponentPokemon = data.player2Pokemon;
    
    // ✅ Afficher les Pokémon dans l'interface Phaser
    if (this.battleUI) {
      this.battleUI.displayPokemon(this.currentPlayerPokemon, this.currentOpponentPokemon);
    }
    
    // Mettre à jour le tour
    this.updateTurnIndicator(data.currentTurn);
    
    // Activer les boutons d'action
    this.enableActionButtons();
    
    this.addBattleLogMessage('Le combat commence !');
  }

  handleTurnChange(data) {
    console.log('🔄 [BattleScene] Changement de tour:', data);
    
    this.updateTurnIndicator(data.currentTurn);
    this.hideAllSubmenus();
    
    // Réactiver les boutons si c'est notre tour
    if (data.currentTurn === 'player1') {
      this.enableActionButtons();
      this.addBattleLogMessage('C\'est votre tour !');
    } else {
      this.disableActionButtons();
      this.addBattleLogMessage('Tour de l\'adversaire...');
    }
  }

  handleBattleEnd(data) {
    console.log('🏁 [BattleScene] Fin de combat:', data);
    
    const resultMessage = this.getEndMessage(data.result);
    this.addBattleLogMessage(resultMessage);
    this.disableActionButtons();
    
    // Afficher les récompenses si disponibles
    if (data.rewards) {
      this.showRewards(data.rewards);
    }
    
    // Programmer la fermeture
    setTimeout(() => {
      this.hideBattleInterface();
    }, 5000);
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
      this.addBattleLogMessage('Vous ne pouvez pas agir maintenant !');
      return;
    }
    
    console.log(`🎮 [BattleScene] Action cliquée: ${action}`);
    
    const success = this.battleManager.selectAction(action);
    if (!success) {
      console.warn(`⚠️ [BattleScene] Échec de sélection de l'action: ${action}`);
      this.addBattleLogMessage(`Impossible d'utiliser ${action} !`);
    }
  }

  // === GESTION DES SOUS-MENUS ===

  showSubmenu(type) {
    console.log(`📋 [BattleScene] Affichage sous-menu: ${type}`);
    
    // Cacher tous les sous-menus d'abord
    this.hideAllSubmenus();
    
    const submenu = this.battleOverlay?.querySelector(`#${type}Submenu`);
    if (submenu) {
      submenu.classList.remove('hidden');
      
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

  hideSubmenu(type) {
    const submenu = this.battleOverlay?.querySelector(`#${type}Submenu`);
    if (submenu) {
      submenu.classList.add('hidden');
    }
  }

  hideAllSubmenus() {
    const submenus = this.battleOverlay?.querySelectorAll('.battle-submenu');
    submenus?.forEach(submenu => {
      submenu.classList.add('hidden');
    });
  }

  populateMovesSubmenu() {
    console.log('💥 [BattleScene] Population des attaques...');
    
    const movesGrid = this.battleOverlay?.querySelector('#movesGrid');
    if (!movesGrid) return;
    
    // Récupérer les attaques du Pokémon actuel
    const playerPokemon = this.currentPlayerPokemon;
    if (!playerPokemon || !playerPokemon.moves) {
      movesGrid.innerHTML = '<p style="text-align: center; color: #666;">Aucune attaque disponible</p>';
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
    
    // TODO: Récupérer l'inventaire réel du joueur
    // Pour l'instant, objets de base
    const items = [
      { id: 'poke_ball', name: 'Poké Ball', count: 5 },
      { id: 'great_ball', name: 'Super Ball', count: 2 },
      { id: 'potion', name: 'Potion', count: 3 },
      { id: 'super_potion', name: 'Super Potion', count: 1 }
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
    
    // TODO: Récupérer l'équipe réelle du joueur
    // Pour l'instant, équipe de base
    const team = [
      { id: '1', name: 'Bulbasaur', level: 5, hp: 20, maxHp: 20, status: 'normal' },
      { id: '2', name: 'Charmander', level: 5, hp: 15, maxHp: 19, status: 'normal' },
      { id: '3', name: 'Squirtle', level: 4, hp: 0, maxHp: 18, status: 'ko' }
    ];
    
    const pokemonHTML = team.map(pokemon => `
      <button class="pokemon-button ${pokemon.hp <= 0 ? 'fainted' : ''}" 
              data-pokemon-id="${pokemon.id}"
              ${pokemon.hp <= 0 ? 'disabled' : ''}>
        <div class="pokemon-info">
          <div class="pokemon-name">${pokemon.name} Niv.${pokemon.level}</div>
          <div class="pokemon-hp">PV: ${pokemon.hp}/${pokemon.maxHp}</div>
          <div class="pokemon-status">${pokemon.status === 'ko' ? 'KO' : this.getStatusText(pokemon.status)}</div>
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
    
    this.addBattleLogMessage(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} utilise ${this.getMoveName(moveId)} !`);
    this.hideAllSubmenus();
  }

  selectItem(itemId) {
    console.log(`🎒 [BattleScene] Objet sélectionné: ${itemId}`);
    
    if (this.battleManager) {
      this.battleManager.useItem(itemId);
    }
    
    this.addBattleLogMessage(`Vous utilisez ${this.getItemName(itemId)} !`);
    this.hideAllSubmenus();
  }

  selectPokemon(pokemonId) {
    console.log(`🔄 [BattleScene] Pokémon sélectionné: ${pokemonId}`);
    
    // TODO: Implémenter changement de Pokémon
    this.addBattleLogMessage(`Changement de Pokémon en cours de développement...`);
    this.hideAllSubmenus();
  }

  // === GESTION DE L'INTERFACE ===

  showBattleInterface() {
    console.log('🖥️ [BattleScene] Affichage interface de combat');
    
    // Afficher l'overlay DOM
    if (this.battleOverlay) {
      this.battleOverlay.style.display = 'flex';
      this.isVisible = true;
      
      // Faire passer la scène en premier plan
      if (this.scene && this.scene.bringToTop) {
        this.scene.bringToTop();
      }
    }
    
    // Afficher l'interface Phaser
    if (this.battleUI) {
      this.battleUI.show();
    }
  }

  hideBattleInterface() {
    console.log('🖥️ [BattleScene] Masquage interface de combat');
    
    // Cacher l'overlay DOM
    if (this.battleOverlay) {
      this.battleOverlay.style.display = 'none';
      this.isVisible = false;
    }
    
    // Cacher l'interface Phaser
    if (this.battleUI) {
      this.battleUI.hide();
    }
    
    // Revenir à la scène principale
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  updateTurnIndicator(currentTurn) {
    const indicator = this.battleOverlay?.querySelector('#turnIndicator');
    const turnText = indicator?.querySelector('.turn-text');
    
    if (indicator && turnText) {
      if (currentTurn === 'player1') {
        turnText.textContent = 'Votre tour';
        indicator.className = 'turn-indicator my-turn';
      } else {
        turnText.textContent = 'Tour adversaire';
        indicator.className = 'turn-indicator opponent-turn';
      }
    }
  }

  enableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = false;
    });
  }

  disableActionButtons() {
    const buttons = this.battleOverlay?.querySelectorAll('.action-button');
    buttons?.forEach(button => {
      button.disabled = true;
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
    
    // Limiter le nombre de messages (garder les 15 derniers)
    const messages = battleLog.querySelectorAll('.battle-log-message');
    if (messages.length > 15) {
      messages[0].remove();
    }
  }

  showRewards(rewards) {
    console.log('🎁 [BattleScene] Affichage des récompenses:', rewards);
    
    if (rewards.experience > 0) {
      this.addBattleLogMessage(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} gagne ${rewards.experience} points d'expérience !`);
    }
    
    if (rewards.gold > 0) {
      this.addBattleLogMessage(`Vous trouvez ${rewards.gold} pièces d'or !`);
    }
    
    if (rewards.pokemonCaught) {
      this.addBattleLogMessage(`${rewards.pokemonCaught.name} a été capturé avec succès !`);
    }
    
    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(item => {
        this.addBattleLogMessage(`Vous trouvez : ${item.name} x${item.quantity}`);
      });
    }
  }

  // === MÉTHODES UTILITAIRES ===

  getMoveName(moveId) {
    // Table des noms d'attaques
    const moveNames = {
      'tackle': 'Charge',
      'growl': 'Grondement', 
      'vine_whip': 'Fouet Lianes',
      'ember': 'Flammèche',
      'water_gun': 'Pistolet à O',
      'thunder_shock': 'Éclair',
      'scratch': 'Griffe',
      'tail_whip': 'Mimi-Queue',
      'bubble': 'Écume',
      'withdraw': 'Repli'
    };
    
    return moveNames[moveId] || moveId.replace('_', ' ');
  }

  getMovePP(moveId) {
    // Table des PP d'attaques
    const movePP = {
      'tackle': '35/35',
      'growl': '40/40',
      'vine_whip': '25/25',
      'ember': '25/25',
      'water_gun': '25/25',
      'thunder_shock': '30/30',
      'scratch': '35/35',
      'tail_whip': '30/30',
      'bubble': '30/30',
      'withdraw': '40/40'
    };
    
    return movePP[moveId] || '??/??';
  }

  getItemName(itemId) {
    const itemNames = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'max_potion': 'Potion Max'
    };
    
    return itemNames[itemId] || itemId.replace('_', ' ');
  }

  getStatusText(status) {
    const statusTexts = {
      'normal': 'Normal',
      'poison': 'Empoisonné',
      'burn': 'Brûlé', 
      'paralysis': 'Paralysé',
      'sleep': 'Endormi',
      'freeze': 'Gelé',
      'confusion': 'Confus'
    };
    
    return statusTexts[status] || status || 'Normal';
  }

  getEndMessage(result) {
    switch (result) {
      case 'victory':
        return 'Victoire ! Vous avez remporté le combat !';
      case 'defeat':
        return 'Défaite... Vos Pokémon sont tous KO.';
      case 'fled':
        return 'Vous avez pris la fuite !';
      case 'captured':
        return 'Pokémon capturé avec succès !';
      case 'draw':
        return 'Match nul !';
      default:
        return 'Combat terminé.';
    }
  }

  // === INTÉGRATION AVEC LE RÉSEAU ===

  /**
   * Met à jour l'état du combat depuis les données serveur
   */
  updateBattleState(battleState) {
    console.log('🔄 [BattleScene] Mise à jour état combat:', battleState);
    
    if (battleState.player1Pokemon) {
      this.currentPlayerPokemon = battleState.player1Pokemon;
      // Mettre à jour l'affichage Phaser
      if (this.battleUI) {
        this.battleUI.updatePlayerHealthBar(this.currentPlayerPokemon);
      }
    }
    
    if (battleState.player2Pokemon) {
      this.currentOpponentPokemon = battleState.player2Pokemon;
      // Mettre à jour l'affichage Phaser
      if (this.battleUI) {
        this.battleUI.updateOpponentHealthBar(this.currentOpponentPokemon);
      }
    }
    
    if (battleState.currentTurn) {
      this.updateTurnIndicator(battleState.currentTurn);
    }
    
    // Mettre à jour les boutons selon l'état
    if (battleState.waitingForAction && battleState.currentTurn === 'player1') {
      this.enableActionButtons();
    } else {
      this.disableActionButtons();
    }
  }

  /**
   * Gère les événements réseau spécifiques au combat
   */
  handleNetworkEvent(eventType, data) {
    console.log(`📡 [BattleScene] Événement réseau: ${eventType}`, data);
    
    switch (eventType) {
      case 'attackResult':
        this.handleAttackResult(data);
        break;
      case 'pokemonFainted':
        this.handlePokemonFainted(data);
        break;
      case 'statusEffectApplied':
        this.handleStatusEffect(data);
        break;
      case 'captureShake':
        this.handleCaptureShake(data);
        break;
      case 'captureResult':
        this.handleCaptureResult(data);
        break;
      default:
        console.log(`⚠️ [BattleScene] Événement réseau non géré: ${eventType}`);
    }
  }

  handleAttackResult(data) {
    console.log('💥 [BattleScene] Résultat d\'attaque:', data);
    
    const attacker = data.attacker === 'player1' ? this.currentPlayerPokemon : this.currentOpponentPokemon;
    const target = data.target === 'player1' ? this.currentPlayerPokemon : this.currentOpponentPokemon;
    
    // Message d'attaque
    this.addBattleLogMessage(`${attacker?.name || 'Pokémon'} utilise ${this.getMoveName(data.moveId)} !`);
    
    // Efficacité
    if (data.effectiveness > 1) {
      this.addBattleLogMessage('C\'est super efficace !');
    } else if (data.effectiveness < 1 && data.effectiveness > 0) {
      this.addBattleLogMessage('Ce n\'est pas très efficace...');
    } else if (data.effectiveness === 0) {
      this.addBattleLogMessage('Ça n\'a aucun effet !');
    }
    
    // Coup critique
    if (data.critical) {
      this.addBattleLogMessage('Coup critique !');
    }
    
    // Dégâts
    if (data.damage > 0) {
      this.addBattleLogMessage(`${target?.name || 'Pokémon'} perd ${data.damage} PV !`);
      
      // ✅ Effet visuel dans BattleUI
      if (this.battleUI) {
        const targetSprite = data.target === 'player1' ? 
          this.battleUI.playerPokemonSprite : this.battleUI.opponentPokemonSprite;
        
        if (targetSprite) {
          this.battleUI.showDamageNumber(data.damage, targetSprite);
          this.battleUI.animateHit(targetSprite);
        }
      }
    }
    
    // Mettre à jour l'affichage des Pokémon
    if (data.target === 'player1') {
      this.currentPlayerPokemon = data.targetPokemon;
      if (this.battleUI) {
        this.battleUI.updatePlayerHealthBar(this.currentPlayerPokemon);
      }
    } else {
      this.currentOpponentPokemon = data.targetPokemon;
      if (this.battleUI) {
        this.battleUI.updateOpponentHealthBar(this.currentOpponentPokemon);
      }
    }
  }

  handlePokemonFainted(data) {
    console.log('😵 [BattleScene] Pokémon KO:', data);
    
    const pokemonName = data.pokemon?.name || 'Pokémon';
    this.addBattleLogMessage(`${pokemonName} est KO !`);
    
    // Mettre à jour l'affichage
    if (data.owner === 'player1') {
      this.currentPlayerPokemon = data.pokemon;
      if (this.battleUI) {
        this.battleUI.updatePlayerHealthBar(this.currentPlayerPokemon);
      }
    } else {
      this.currentOpponentPokemon = data.pokemon;
      if (this.battleUI) {
        this.battleUI.updateOpponentHealthBar(this.currentOpponentPokemon);
      }
    }
  }

  handleStatusEffect(data) {
    console.log('🌡️ [BattleScene] Effet de statut:', data);
    
    const pokemonName = data.pokemon?.name || 'Pokémon';
    const statusText = this.getStatusText(data.status);
    
    this.addBattleLogMessage(`${pokemonName} est ${statusText} !`);
    
    // ✅ Effet visuel dans BattleUI
    if (this.battleUI) {
      const targetSprite = data.owner === 'player1' ? 
        this.battleUI.playerPokemonSprite : this.battleUI.opponentPokemonSprite;
      
      if (targetSprite) {
        this.battleUI.showStatusEffect(data.status, targetSprite);
      }
    }
    
    // Mettre à jour l'affichage
    if (data.owner === 'player1') {
      this.currentPlayerPokemon = data.pokemon;
      if (this.battleUI) {
        this.battleUI.updatePlayerHealthBar(this.currentPlayerPokemon);
      }
    } else {
      this.currentOpponentPokemon = data.pokemon;
      if (this.battleUI) {
        this.battleUI.updateOpponentHealthBar(this.currentOpponentPokemon);
      }
    }
  }

  handleCaptureShake(data) {
    console.log('🎯 [BattleScene] Secousse de capture:', data);
    
    this.addBattleLogMessage(`La ${this.getItemName(data.ballType)} bouge...`);
    
    // ✅ Animation dans BattleUI
    if (this.battleUI) {
      // L'animation de secousse est gérée par animateBallShakes dans BattleUI
    }
  }

  handleCaptureResult(data) {
    console.log('🎯 [BattleScene] Résultat de capture:', data);
    
    if (data.success) {
      this.addBattleLogMessage(`${data.pokemon?.name || 'Pokémon'} a été capturé !`);
    } else {
      this.addBattleLogMessage(`${data.pokemon?.name || 'Pokémon'} s'est échappé !`);
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
    if (this.scene && !this.scene.isActive()) {
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
    
    if (this.battleManager) {
      this.battleManager.endBattle();
    }
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // Reset de l'interface Phaser
    if (this.battleUI) {
      this.battleUI.reset();
    }
    
    // Revenir à la scène principale
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  /**
   * Vérifie si le combat est actif
   */
  isBattleActive() {
    return this.isVisible && this.battleManager?.isActive;
  }

  /**
   * Obtient l'état actuel du combat
   */
  getBattleState() {
    return {
      isActive: this.isBattleActive(),
      playerPokemon: this.currentPlayerPokemon,
      opponentPokemon: this.currentOpponentPokemon,
      battleManager: this.battleManager
    };
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleScene] Destruction de la scène...');
    
    // Supprimer l'overlay DOM
    if (this.battleOverlay && this.battleOverlay.parentNode) {
      this.battleOverlay.parentNode.removeChild(this.battleOverlay);
      this.battleOverlay = null;
    }
    
    // Supprimer les styles CSS
    const styles = document.querySelector('#battle-action-styles');
    if (styles) {
      styles.remove();
    }
    
    // Nettoyer les managers
    if (this.battleUI) {
      this.battleUI.destroy();
      this.battleUI = null;
    }
    
    if (this.battleManager) {
      this.battleManager = null;
    }
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // Appeler le destroy parent
    super.destroy();
    
    console.log('✅ [BattleScene] Scène détruite');
  }
}
