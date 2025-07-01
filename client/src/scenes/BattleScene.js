// client/src/scenes/BattleScene.js - Scène de combat avec overlay centré
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
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('⚔️ [BattleScene] Constructeur initialisé');
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
    // Le préchargement se fait maintenant via les sprites Phaser dans BattleUI
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
      
      // Créer l'overlay DOM centré
      this.createCenteredBattleOverlay();
      
      // Initialiser l'interface de combat Phaser
      this.battleUI = new BattleUI(this, this.battleManager);
      this.battleUI.initialize();

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

  // === CRÉATION DE L'OVERLAY CENTRÉ ===

  createCenteredBattleOverlay() {
    console.log('🖥️ [BattleScene] Création de l\'overlay centré...');
    
    // ✅ NOUVEAU: Overlay centré 85% avec monde visible derrière
    this.battleOverlay = document.createElement('div');
    this.battleOverlay.className = 'battle-overlay centered-overlay';
    this.battleOverlay.id = 'battleOverlay';
    
    // ✅ Styles pour centrer l'overlay
    this.battleOverlay.style.cssText = `
      position: fixed;
      top: 7.5%;
      left: 7.5%;
      width: 85%;
      height: 85%;
      z-index: 5000;
      border-radius: 15px;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      display: none;
      flex-direction: column;
    `;
    
    // Structure HTML complète avec interface de combat
    this.battleOverlay.innerHTML = `
      <!-- Header avec titre et contrôles -->
      <div class="battle-header">
        <div class="battle-info">
          <h2 class="battle-title" id="battleTitle">Combat Pokémon</h2>
          <div class="battle-turn-info">
            <span class="turn-indicator" id="turnIndicator">En attente...</span>
          </div>
        </div>
        <div class="battle-controls">
          <button class="battle-btn" id="battleMenuBtn">Menu</button>
          <button class="battle-btn" id="battleExitBtn">Quitter</button>
        </div>
      </div>
      
      <!-- Champ de bataille avec Pokémon -->
      <div class="battle-field">
        <div id="battleBackground"></div>
        
        <!-- Barres de vie des Pokémon -->
        <div class="pokemon-health-bar opponent" id="opponentHealthBar" style="display: none;">
          <div class="pokemon-name">
            <span id="opponentName">Pokémon</span>
            <span class="pokemon-level" id="opponentLevel">Lv.?</span>
          </div>
          <div class="health-bar-container">
            <div class="health-bar high" id="opponentHealthBarFill"></div>
          </div>
          <div class="status-indicator" id="opponentStatus"></div>
        </div>
        
        <div class="pokemon-health-bar player" id="playerHealthBar" style="display: none;">
          <div class="pokemon-name">
            <span id="playerName">Votre Pokémon</span>
            <span class="pokemon-level" id="playerLevel">Lv.?</span>
          </div>
          <div class="health-bar-container">
            <div class="health-bar high" id="playerHealthBarFill"></div>
          </div>
          <div class="health-text" id="playerHealthText">??/??</div>
          <div class="status-indicator" id="playerStatus"></div>
        </div>
        
        <!-- Zone des sprites Pokémon (géré par BattleUI Phaser) -->
        <div id="pokemonField">
          <!-- Les sprites Pokémon seront affichés ici par BattleUI -->
        </div>
        
        <!-- Zone des effets de combat -->
        <div id="battleEffects">
          <!-- Effets visuels temporaires -->
        </div>
      </div>
      
      <!-- Interface de combat (log + actions) -->
      <div class="battle-interface">
        <div class="battle-log" id="battleLog">
          <div class="battle-log-message">Combat en cours d'initialisation...</div>
        </div>
        
        <div class="battle-actions" id="battleActions">
          <button class="action-button fight" data-action="fight" disabled>
            <span class="action-icon">⚔️</span>
            <span class="action-text">Attaque</span>
          </button>
          <button class="action-button bag" data-action="bag" disabled>
            <span class="action-icon">🎒</span>
            <span class="action-text">Sac</span>
          </button>
          <button class="action-button pokemon" data-action="pokemon" disabled>
            <span class="action-icon">🔄</span>
            <span class="action-text">Pokémon</span>
          </button>
          <button class="action-button run" data-action="run" disabled>
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
    
    console.log('✅ [BattleScene] Overlay centré créé');
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
      menuBtn.addEventListener('click', () => this.toggleBattleMenu());
    }
    
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.attemptExitBattle());
    }
    
    // Boutons de fermeture des sous-menus
    const closeButtons = this.battleOverlay.querySelectorAll('.submenu-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => this.hideAllSubmenus());
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
    
    // Stocker les données du Pokémon adversaire
    this.currentOpponentPokemon = data.pokemon;
    
    // Mettre à jour l'affichage de l'adversaire
    if (this.currentOpponentPokemon) {
      this.updateOpponentDisplay(this.currentOpponentPokemon);
    }
  }

  handleBattleStart(data) {
    console.log('⚔️ [BattleScene] Début de combat:', data);
    
    // Stocker les données des Pokémon
    this.currentPlayerPokemon = data.player1Pokemon;
    this.currentOpponentPokemon = data.player2Pokemon;
    
    // Afficher les Pokémon dans l'interface Phaser
    if (this.battleUI) {
      this.battleUI.displayPokemon(this.currentPlayerPokemon, this.currentOpponentPokemon);
    }
    
    // Mettre à jour les barres de vie
    this.updatePlayerDisplay(this.currentPlayerPokemon);
    this.updateOpponentDisplay(this.currentOpponentPokemon);
    
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

  // === MISE À JOUR DE L'AFFICHAGE ===

  updatePlayerDisplay(pokemonData) {
    if (!pokemonData) return;
    
    const healthBar = this.battleOverlay.querySelector('#playerHealthBar');
    const nameElement = this.battleOverlay.querySelector('#playerName');
    const levelElement = this.battleOverlay.querySelector('#playerLevel');
    const healthFill = this.battleOverlay.querySelector('#playerHealthBarFill');
    const healthText = this.battleOverlay.querySelector('#playerHealthText');
    const statusElement = this.battleOverlay.querySelector('#playerStatus');
    
    if (healthBar) healthBar.style.display = 'block';
    if (nameElement) nameElement.textContent = pokemonData.name || 'Votre Pokémon';
    if (levelElement) levelElement.textContent = `Lv.${pokemonData.level || 1}`;
    if (healthText) healthText.textContent = `${pokemonData.currentHp || 0}/${pokemonData.maxHp || 1}`;
    
    // Barre de vie
    if (healthFill && pokemonData.maxHp > 0) {
      const hpPercent = (pokemonData.currentHp / pokemonData.maxHp) * 100;
      healthFill.style.width = `${hpPercent}%`;
      
      // Couleur selon les HP
      healthFill.className = 'health-bar';
      if (hpPercent > 50) {
        healthFill.classList.add('high');
      } else if (hpPercent > 20) {
        healthFill.classList.add('medium');
      } else {
        healthFill.classList.add('low');
      }
    }
    
    // Statut
    if (statusElement) {
      const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
      statusElement.textContent = statusEmoji;
      statusElement.className = `status-indicator ${pokemonData.statusCondition || ''}`;
    }
  }

  updateOpponentDisplay(pokemonData) {
    if (!pokemonData) return;
    
    const healthBar = this.battleOverlay.querySelector('#opponentHealthBar');
    const nameElement = this.battleOverlay.querySelector('#opponentName');
    const levelElement = this.battleOverlay.querySelector('#opponentLevel');
    const healthFill = this.battleOverlay.querySelector('#opponentHealthBarFill');
    const statusElement = this.battleOverlay.querySelector('#opponentStatus');
    
    if (healthBar) healthBar.style.display = 'block';
    if (nameElement) nameElement.textContent = pokemonData.name || 'Pokémon';
    if (levelElement) levelElement.textContent = `Lv.${pokemonData.level || 1}`;
    
    // Barre de vie
    if (healthFill && pokemonData.maxHp > 0) {
      const hpPercent = (pokemonData.currentHp / pokemonData.maxHp) * 100;
      healthFill.style.width = `${hpPercent}%`;
      
      // Couleur selon les HP
      healthFill.className = 'health-bar';
      if (hpPercent > 50) {
        healthFill.classList.add('high');
      } else if (hpPercent > 20) {
        healthFill.classList.add('medium');
      } else {
        healthFill.classList.add('low');
      }
    }
    
    // Statut
    if (statusElement) {
      const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
      statusElement.textContent = statusEmoji;
      statusElement.className = `status-indicator ${pokemonData.statusCondition || ''}`;
    }
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
  }

  selectItem(itemId) {
    console.log(`🎒 [BattleScene] Objet sélectionné: ${itemId}`);
    
    if (this.battleManager) {
      this.battleManager.useItem(itemId);
    }
    
    this.addBattleLogMessage(`Vous utilisez ${this.getItemName(itemId)} !`);
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
    
    if (this.battleOverlay) {
      this.battleOverlay.style.display = 'flex';
      this.battleOverlay.classList.add('active');
      this.isVisible = true;
      
      // Faire passer la scène en premier plan
      if (this.scene && this.scene.bringToTop) {
        this.scene.bringToTop();
      }
    }
  }

  hideBattleInterface() {
    console.log('🖥️ [BattleScene] Masquage interface de combat');
    
    if (this.battleOverlay) {
      this.battleOverlay.classList.remove('active');
      setTimeout(() => {
        this.battleOverlay.style.display = 'none';
      }, 300); // Attendre la fin de l'animation
      this.isVisible = false;
    }
    
    // Revenir à la scène principale
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  updateBattleTitle(title) {
    const titleElement = this.battleOverlay?.querySelector('#battleTitle');
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

  // === EFFETS VISUELS ===

  showDamageNumber(damage, target) {
    const effectsContainer = this.battleOverlay?.querySelector('#battleEffects');
    if (!effectsContainer || !target) return;
    
    const damageElement = document.createElement('div');
    damageElement.className = 'battle-effect damage-number';
    damageElement.textContent = `-${damage}`;
    
    // Position relative au target
    const rect = target.getBoundingClientRect();
    const containerRect = effectsContainer.getBoundingClientRect();
    
    damageElement.style.left = `${rect.left - containerRect.left + rect.width/2}px`;
    damageElement.style.top = `${rect.top - containerRect.top}px`;
    
    effectsContainer.appendChild(damageElement);
    
    // Supprimer après l'animation
    setTimeout(() => {
      if (damageElement.parentNode) {
        damageElement.parentNode.removeChild(damageElement);
      }
    }, 1500);
  }

  showHealNumber(heal, target) {
    const effectsContainer = this.battleOverlay?.querySelector('#battleEffects');
    if (!effectsContainer || !target) return;
    
    const healElement = document.createElement('div');
    healElement.className = 'battle-effect heal-number';
    healElement.textContent = `+${heal}`;
    
    // Position relative au target
    const rect = target.getBoundingClientRect();
    const containerRect = effectsContainer.getBoundingClientRect();
    
    healElement.style.left = `${rect.left - containerRect.left + rect.width/2}px`;
    healElement.style.top = `${rect.top - containerRect.top}px`;
    
    effectsContainer.appendChild(healElement);
    
    // Supprimer après l'animation
    setTimeout(() => {
      if (healElement.parentNode) {
        healElement.parentNode.removeChild(healElement);
      }
    }, 1200);
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
    // Table des noms d'attaques - à remplacer par une vraie DB
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
    // Table des PP d'attaques - à remplacer par une vraie DB
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

  getStatusEmoji(status) {
    const statusEmojis = {
      'normal': '',
      'poison': '☠️',
      'burn': '🔥', 
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵'
    };
    
    return statusEmojis[status] || '';
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

  toggleBattleMenu() {
    console.log('📋 [BattleScene] Toggle menu de combat');
    // TODO: Implémenter menu de combat (sauvegarde, options, etc.)
    this.addBattleLogMessage('Menu de combat en cours de développement...');
  }

  attemptExitBattle() {
    console.log('🚪 [BattleScene] Tentative de sortie de combat');
    
    if (this.battleManager && this.battleManager.isActive) {
      // Tenter de fuir
      const success = this.battleManager.attemptRun();
      if (!success) {
        this.addBattleLogMessage('Impossible de fuir !');
      }
    } else {
      // Fermer directement
      this.hideBattleInterface();
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
      this.updatePlayerDisplay(this.currentPlayerPokemon);
    }
    
    if (battleState.player2Pokemon) {
      this.currentOpponentPokemon = battleState.player2Pokemon;
      this.updateOpponentDisplay(this.currentOpponentPokemon);
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
      
      // Effet visuel de dégâts
      const targetElement = data.target === 'player1' ? 
        this.battleOverlay.querySelector('#playerHealthBar') :
        this.battleOverlay.querySelector('#opponentHealthBar');
      
      if (targetElement) {
        this.showDamageNumber(data.damage, targetElement);
      }
    }
    
    // Mettre à jour l'affichage des Pokémon
    if (data.target === 'player1') {
      this.updatePlayerDisplay(data.targetPokemon);
    } else {
      this.updateOpponentDisplay(data.targetPokemon);
    }
  }

  handlePokemonFainted(data) {
    console.log('😵 [BattleScene] Pokémon KO:', data);
    
    const pokemonName = data.pokemon?.name || 'Pokémon';
    this.addBattleLogMessage(`${pokemonName} est KO !`);
    
    // Mettre à jour l'affichage
    if (data.owner === 'player1') {
      this.updatePlayerDisplay(data.pokemon);
    } else {
      this.updateOpponentDisplay(data.pokemon);
    }
  }

  handleStatusEffect(data) {
    console.log('🌡️ [BattleScene] Effet de statut:', data);
    
    const pokemonName = data.pokemon?.name || 'Pokémon';
    const statusText = this.getStatusText(data.status);
    
    this.addBattleLogMessage(`${pokemonName} est ${statusText} !`);
    
    // Mettre à jour l'affichage
    if (data.owner === 'player1') {
      this.updatePlayerDisplay(data.pokemon);
    } else {
      this.updateOpponentDisplay(data.pokemon);
    }
  }

  handleCaptureShake(data) {
    console.log('🎯 [BattleScene] Secousse de capture:', data);
    
    this.addBattleLogMessage(`La ${this.getItemName(data.ballType)} bouge...`);
    
    // TODO: Animation de secousse de la Ball
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
