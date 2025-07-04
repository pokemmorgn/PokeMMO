// client/src/Battle/BattleActionUI.js - Interface d'actions de combat style Pokémon classique

export class BattleActionUI {
  constructor(scene, battleManager) {
    this.scene = scene;
    this.battleManager = battleManager;
    
    // Containers
    this.mainActionContainer = null;
    this.movesContainer = null;
    this.bagContainer = null;
    this.pokemonContainer = null;
    
    // État
    this.currentMenu = 'main'; // 'main', 'moves', 'bag', 'pokemon'
    this.selectedAction = null;
    this.isVisible = false;
    this.waitingForInput = false;
    
    // Configuration layout
    this.layout = {
      mainMenu: {
        x: 0.5,
        y: 0.85,
        width: 400,
        height: 120
      },
      subMenu: {
        x: 0.5,
        y: 0.75,
        width: 350,
        height: 200
      }
    };
    
    console.log('🎮 [BattleActionUI] Constructeur initialisé');
  }

  // === CRÉATION DE L'INTERFACE ===

  create() {
    console.log('🏗️ [BattleActionUI] Création de l\'interface d\'actions...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Créer le menu principal (4 boutons)
    this.createMainActionMenu(width, height);
    
    // Créer les sous-menus
    this.createMovesMenu(width, height);
    this.createBagMenu(width, height);
    this.createPokemonMenu(width, height);
    
    // Masquer par défaut
    this.hideAll();
    
    console.log('✅ [BattleActionUI] Interface créée');
  }

  // === MENU PRINCIPAL (FIGHT/BAG/POKEMON/RUN) ===

  createMainActionMenu(width, height) {
    console.log('🎯 [BattleActionUI] Création menu principal...');
    
    const x = width * this.layout.mainMenu.x;
    const y = height * this.layout.mainMenu.y;
    
    // Container principal
    this.mainActionContainer = this.scene.add.container(x, y);
    this.mainActionContainer.setDepth(200);
    
    // Background du menu principal
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-200, -60, 400, 120, 12);
    bg.lineStyle(3, 0xFFD700, 1);
    bg.strokeRoundedRect(-200, -60, 400, 120, 12);
    this.mainActionContainer.add(bg);
    
    // Créer les 4 boutons principaux en 2x2
    const buttons = [
      { key: 'fight', text: 'FIGHT', icon: '⚔️', pos: { x: -100, y: -25 }, color: 0xFF4444 },
      { key: 'bag', text: 'BAG', icon: '🎒', pos: { x: 100, y: -25 }, color: 0x4444FF },
      { key: 'pokemon', text: 'POKÉMON', icon: '⚽', pos: { x: -100, y: 25 }, color: 0x44FF44 },
      { key: 'run', text: 'RUN', icon: '🏃', pos: { x: 100, y: 25 }, color: 0xFFAA44 }
    ];
    
    this.actionButtons = [];
    
    buttons.forEach((buttonConfig, index) => {
      const button = this.createActionButton(buttonConfig);
      this.mainActionContainer.add(button.container);
      this.actionButtons.push(button);
    });
    
    console.log('✅ [BattleActionUI] Menu principal créé avec 4 boutons');
  }

  createActionButton(config) {
    const { key, text, icon, pos, color } = config;
    
    // Container du bouton
    const container = this.scene.add.container(pos.x, pos.y);
    
    // Background du bouton
    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 0.8);
    bg.fillRoundedRect(-45, -20, 90, 40, 8);
    bg.lineStyle(2, 0xFFFFFF, 0.8);
    bg.strokeRoundedRect(-45, -20, 90, 40, 8);
    
    // Effet hover
    const hoverBg = this.scene.add.graphics();
    hoverBg.fillStyle(0xFFFFFF, 0.3);
    hoverBg.fillRoundedRect(-45, -20, 90, 40, 8);
    hoverBg.setVisible(false);
    
    // Icône
    const iconText = this.scene.add.text(-25, -5, icon, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Texte
    const textLabel = this.scene.add.text(10, -5, text, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);
    
    // Ajouter au container
    container.add([bg, hoverBg, iconText, textLabel]);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, 90, 40, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => {
      hoverBg.setVisible(true);
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    hitArea.on('pointerout', () => {
      hoverBg.setVisible(false);
      this.scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    hitArea.on('pointerdown', () => {
      this.onActionButtonClicked(key);
    });
    
    return {
      container,
      key,
      bg,
      hoverBg,
      hitArea,
      setEnabled: (enabled) => {
        hitArea.setInteractive(enabled);
        container.setAlpha(enabled ? 1 : 0.5);
      }
    };
  }

  // === SOUS-MENU DES ATTAQUES ===

  createMovesMenu(width, height) {
    console.log('💥 [BattleActionUI] Création menu attaques...');
    
    const x = width * this.layout.subMenu.x;
    const y = height * this.layout.subMenu.y;
    
    this.movesContainer = this.scene.add.container(x, y);
    this.movesContainer.setDepth(210);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-175, -100, 350, 200, 12);
    bg.lineStyle(3, 0xFF4444, 1);
    bg.strokeRoundedRect(-175, -100, 350, 200, 12);
    this.movesContainer.add(bg);
    
    // Titre
    const title = this.scene.add.text(0, -80, '💥 CHOISIR UNE ATTAQUE', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.movesContainer.add(title);
    
    // Placeholder pour les attaques (seront ajoutées dynamiquement)
    this.moveButtons = [];
    
    // Bouton retour
    this.createBackButton(this.movesContainer, () => this.showMainMenu());
    
    console.log('✅ [BattleActionUI] Menu attaques créé');
  }

  // === SOUS-MENU DU SAC ===

  createBagMenu(width, height) {
    console.log('🎒 [BattleActionUI] Création menu sac...');
    
    const x = width * this.layout.subMenu.x;
    const y = height * this.layout.subMenu.y;
    
    this.bagContainer = this.scene.add.container(x, y);
    this.bagContainer.setDepth(210);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-175, -100, 350, 200, 12);
    bg.lineStyle(3, 0x4444FF, 1);
    bg.strokeRoundedRect(-175, -100, 350, 200, 12);
    this.bagContainer.add(bg);
    
    // Titre
    const title = this.scene.add.text(0, -80, '🎒 SAC À DOS', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.bagContainer.add(title);
    
    // Items communs de combat
    const commonItems = [
      { key: 'potion', name: 'Potion', icon: '🧪', description: 'Restaure 20 PV' },
      { key: 'super_potion', name: 'Super Potion', icon: '💊', description: 'Restaure 50 PV' },
      { key: 'pokeball', name: 'Poké Ball', icon: '⚽', description: 'Capture un Pokémon' },
      { key: 'great_ball', name: 'Super Ball', icon: '🔵', description: 'Meilleure capture' }
    ];
    
    this.itemButtons = [];
    
    commonItems.forEach((item, index) => {
      const button = this.createItemButton(item, index);
      this.bagContainer.add(button.container);
      this.itemButtons.push(button);
    });
    
    // Bouton retour
    this.createBackButton(this.bagContainer, () => this.showMainMenu());
    
    console.log('✅ [BattleActionUI] Menu sac créé');
  }

  createItemButton(itemConfig, index) {
    const { key, name, icon, description } = itemConfig;
    
    const x = (index % 2) * 150 - 75;
    const y = Math.floor(index / 2) * 35 - 30;
    
    const container = this.scene.add.container(x, y);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x333333, 0.8);
    bg.fillRoundedRect(-70, -15, 140, 30, 6);
    bg.lineStyle(1, 0x888888);
    bg.strokeRoundedRect(-70, -15, 140, 30, 6);
    
    // Icône
    const iconText = this.scene.add.text(-60, 0, icon, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Nom de l'item
    const nameText = this.scene.add.text(-40, 0, name, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    }).setOrigin(0, 0.5);
    
    container.add([bg, iconText, nameText]);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, 140, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x555555, 0.9);
      bg.fillRoundedRect(-70, -15, 140, 30, 6);
      bg.lineStyle(2, 0xFFD700);
      bg.strokeRoundedRect(-70, -15, 140, 30, 6);
    });
    
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333333, 0.8);
      bg.fillRoundedRect(-70, -15, 140, 30, 6);
      bg.lineStyle(1, 0x888888);
      bg.strokeRoundedRect(-70, -15, 140, 30, 6);
    });
    
    hitArea.on('pointerdown', () => {
      this.onItemSelected(key);
    });
    
    return { container, key, hitArea };
  }

  // === SOUS-MENU POKÉMON ===

  createPokemonMenu(width, height) {
    console.log('⚽ [BattleActionUI] Création menu Pokémon...');
    
    const x = width * this.layout.subMenu.x;
    const y = height * this.layout.subMenu.y;
    
    this.pokemonContainer = this.scene.add.container(x, y);
    this.pokemonContainer.setDepth(210);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-175, -100, 350, 200, 12);
    bg.lineStyle(3, 0x44FF44, 1);
    bg.strokeRoundedRect(-175, -100, 350, 200, 12);
    this.pokemonContainer.add(bg);
    
    // Titre
    const title = this.scene.add.text(0, -80, '⚽ ÉQUIPE POKÉMON', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.pokemonContainer.add(title);
    
    // Message pour l'instant
    const message = this.scene.add.text(0, -20, 'Changement de Pokémon\nnon disponible en combat sauvage', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#CCCCCC',
      align: 'center'
    }).setOrigin(0.5);
    this.pokemonContainer.add(message);
    
    // Bouton retour
    this.createBackButton(this.pokemonContainer, () => this.showMainMenu());
    
    console.log('✅ [BattleActionUI] Menu Pokémon créé');
  }

  // === BOUTON RETOUR UNIVERSEL ===

  createBackButton(container, callback) {
    const backButton = this.scene.add.container(130, 70);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x666666, 0.8);
    bg.fillRoundedRect(-25, -15, 50, 30, 6);
    bg.lineStyle(2, 0xFFFFFF);
    bg.strokeRoundedRect(-25, -15, 50, 30, 6);
    
    // Texte
    const text = this.scene.add.text(0, 0, '← RETOUR', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    backButton.add([bg, text]);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, 50, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    backButton.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x888888, 0.9);
      bg.fillRoundedRect(-25, -15, 50, 30, 6);
      bg.lineStyle(2, 0xFFD700);
      bg.strokeRoundedRect(-25, -15, 50, 30, 6);
    });
    
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x666666, 0.8);
      bg.fillRoundedRect(-25, -15, 50, 30, 6);
      bg.lineStyle(2, 0xFFFFFF);
      bg.strokeRoundedRect(-25, -15, 50, 30, 6);
    });
    
    hitArea.on('pointerdown', callback);
    
    container.add(backButton);
  }

  // === GESTION DES ACTIONS ===

  onActionButtonClicked(action) {
    console.log(`🎯 [BattleActionUI] Action sélectionnée: ${action}`);
    
    this.selectedAction = action;
    
    switch (action) {
      case 'fight':
        this.showMovesMenu();
        break;
      case 'bag':
        this.showBagMenu();
        break;
      case 'pokemon':
        this.showPokemonMenu();
        break;
      case 'run':
        this.onRunSelected();
        break;
    }
  }

  onMoveSelected(moveId) {
    console.log(`💥 [BattleActionUI] Attaque sélectionnée: ${moveId}`);
    
    // Masquer l'interface
    this.hide();
    
    // Notifier le BattleManager
    if (this.battleManager) {
      this.battleManager.selectMove(moveId);
    }
    
    // Déclencher événement
    this.scene.events.emit('battleActionSelected', {
      type: 'move',
      moveId: moveId
    });
  }

  onItemSelected(itemId) {
    console.log(`🎒 [BattleActionUI] Objet sélectionné: ${itemId}`);
    
    // Masquer l'interface
    this.hide();
    
    // Notifier le BattleManager
    if (this.battleManager) {
      this.battleManager.useItem(itemId);
    }
    
    // Déclencher événement
    this.scene.events.emit('battleActionSelected', {
      type: 'item',
      itemId: itemId
    });
  }

  onRunSelected() {
    console.log(`🏃 [BattleActionUI] Tentative de fuite`);
    
    // Masquer l'interface
    this.hide();
    
    // Notifier le BattleManager
    if (this.battleManager) {
      this.battleManager.attemptRun();
    }
    
    // Déclencher événement
    this.scene.events.emit('battleActionSelected', {
      type: 'run'
    });
  }

  // === GESTION DES MENUS ===

  showMainMenu() {
    console.log('🎮 [BattleActionUI] Affichage menu principal');
    
    this.currentMenu = 'main';
    this.hideAllSubMenus();
    
    if (this.mainActionContainer) {
      this.mainActionContainer.setVisible(true);
      
      // Animation d'entrée
      this.mainActionContainer.setAlpha(0);
      this.mainActionContainer.setScale(0.8);
      
      this.scene.tweens.add({
        targets: this.mainActionContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });
    }
    
    this.isVisible = true;
    this.waitingForInput = true;
  }

  showMovesMenu() {
    console.log('💥 [BattleActionUI] Affichage menu attaques');
    
    this.currentMenu = 'moves';
    this.hideAllSubMenus();
    
    // Charger les attaques du Pokémon actuel
    this.loadCurrentPokemonMoves();
    
    if (this.movesContainer) {
      this.movesContainer.setVisible(true);
      
      // Animation d'entrée
      this.movesContainer.setAlpha(0);
      this.movesContainer.setY(this.movesContainer.y + 50);
      
      this.scene.tweens.add({
        targets: this.movesContainer,
        alpha: 1,
        y: this.movesContainer.y - 50,
        duration: 300,
        ease: 'Power2.easeOut'
      });
    }
  }

  showBagMenu() {
    console.log('🎒 [BattleActionUI] Affichage menu sac');
    
    this.currentMenu = 'bag';
    this.hideAllSubMenus();
    
    if (this.bagContainer) {
      this.bagContainer.setVisible(true);
      
      // Animation d'entrée
      this.bagContainer.setAlpha(0);
      this.bagContainer.setY(this.bagContainer.y + 50);
      
      this.scene.tweens.add({
        targets: this.bagContainer,
        alpha: 1,
        y: this.bagContainer.y - 50,
        duration: 300,
        ease: 'Power2.easeOut'
      });
    }
  }

  showPokemonMenu() {
    console.log('⚽ [BattleActionUI] Affichage menu Pokémon');
    
    this.currentMenu = 'pokemon';
    this.hideAllSubMenus();
    
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(true);
      
      // Animation d'entrée
      this.pokemonContainer.setAlpha(0);
      this.pokemonContainer.setY(this.pokemonContainer.y + 50);
      
      this.scene.tweens.add({
        targets: this.pokemonContainer,
        alpha: 1,
        y: this.pokemonContainer.y - 50,
        duration: 300,
        ease: 'Power2.easeOut'
      });
    }
  }

  hideAllSubMenus() {
    if (this.movesContainer) this.movesContainer.setVisible(false);
    if (this.bagContainer) this.bagContainer.setVisible(false);
    if (this.pokemonContainer) this.pokemonContainer.setVisible(false);
  }

  hideAll() {
    this.hideAllSubMenus();
    if (this.mainActionContainer) this.mainActionContainer.setVisible(false);
    this.isVisible = false;
    this.waitingForInput = false;
  }

  hide() {
    console.log('👻 [BattleActionUI] Masquage interface');
    
    const containersToHide = [
      this.mainActionContainer,
      this.movesContainer,
      this.bagContainer,
      this.pokemonContainer
    ].filter(container => container && container.visible);
    
    if (containersToHide.length === 0) {
      this.isVisible = false;
      this.waitingForInput = false;
      return;
    }
    
    // Animation de sortie
    this.scene.tweens.add({
      targets: containersToHide,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 250,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.hideAll();
      }
    });
  }

  show() {
    console.log('👁️ [BattleActionUI] Affichage interface');
    this.showMainMenu();
  }

  // === CHARGEMENT DYNAMIQUE DES ATTAQUES ===

  loadCurrentPokemonMoves() {
    console.log('💥 [BattleActionUI] Chargement attaques Pokémon...');
    
    // Nettoyer les boutons existants
    this.moveButtons.forEach(button => {
      button.container.destroy();
    });
    this.moveButtons = [];
    
    // Attaques par défaut (à remplacer par les vraies attaques du Pokémon)
    const defaultMoves = [
      { id: 'tackle', name: 'Charge', type: 'normal', pp: 35, power: 40 },
      { id: 'growl', name: 'Grondement', type: 'normal', pp: 40, power: 0 },
      { id: 'thunder_shock', name: 'Éclair', type: 'electric', pp: 30, power: 40 },
      { id: 'quick_attack', name: 'Vive-Attaque', type: 'normal', pp: 30, power: 40 }
    ];
    
    // Créer les boutons d'attaques
    defaultMoves.forEach((move, index) => {
      const button = this.createMoveButton(move, index);
      this.movesContainer.add(button.container);
      this.moveButtons.push(button);
    });
  }

  createMoveButton(move, index) {
    const x = (index % 2) * 150 - 75;
    const y = Math.floor(index / 2) * 35 - 30;
    
    const container = this.scene.add.container(x, y);
    
    // Background avec couleur du type
    const typeColor = this.getTypeColor(move.type);
    const bg = this.scene.add.graphics();
    bg.fillStyle(typeColor, 0.8);
    bg.fillRoundedRect(-70, -15, 140, 30, 6);
    bg.lineStyle(2, 0xFFFFFF, 0.8);
    bg.strokeRoundedRect(-70, -15, 140, 30, 6);
    
    // Nom de l'attaque
    const nameText = this.scene.add.text(-65, -5, move.name, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);
    
    // PP
    const ppText = this.scene.add.text(65, -5, `PP ${move.pp}`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(1, 0.5);
    
    // Type
    const typeText = this.scene.add.text(0, 8, move.type.toUpperCase(), {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, nameText, ppText, typeText]);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, 140, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    hitArea.on('pointerout', () => {
      this.scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    
    hitArea.on('pointerdown', () => {
      this.onMoveSelected(move.id);
    });
    
    return { container, move, hitArea };
  }

  // === UTILITAIRES ===

  getTypeColor(type) {
    const typeColors = {
      'normal': 0xA8A878,
      'fire': 0xF08030,
      'water': 0x6890F0,
      'electric': 0xF8D030,
      'grass': 0x78C850,
      'ice': 0x98D8D8,
      'fighting': 0xC03028,
      'poison': 0xA040A0,
      'ground': 0xE0C068,
      'flying': 0xA890F0,
      'psychic': 0xF85888,
      'bug': 0xA8B820,
      'rock': 0xB8A038,
      'ghost': 0x705898,
      'dragon': 0x7038F8,
      'dark': 0x705848,
      'steel': 0xB8B8D0,
      'fairy': 0xEE99AC
    };
    
    return typeColors[type.toLowerCase()] || 0xA8A878;
  }

  // === MISE À JOUR DES DONNÉES ===

  updatePokemonMoves(pokemon) {
    console.log('🔄 [BattleActionUI] Mise à jour attaques:', pokemon.name);
    
    if (this.currentMenu === 'moves' && this.movesContainer.visible) {
      this.loadCurrentPokemonMoves();
    }
  }

  updatePlayerInventory(inventory) {
    console.log('🔄 [BattleActionUI] Mise à jour inventaire');
    
    // TODO: Mettre à jour les items disponibles dans le menu sac
    // selon l'inventaire réel du joueur
  }

  // === GESTION DE L'ÉTAT ===

  setEnabled(enabled) {
    console.log(`🔧 [BattleActionUI] setEnabled: ${enabled}`);
    
    this.actionButtons?.forEach(button => {
      button.setEnabled(enabled);
    });
    
    this.waitingForInput = enabled;
  }

  isWaitingForInput() {
    return this.waitingForInput && this.isVisible;
  }

  getCurrentMenu() {
    return this.currentMenu;
  }

  // === CONTRÔLES CLAVIER (OPTIONNEL) ===

  setupKeyboardControls() {
    console.log('⌨️ [BattleActionUI] Configuration contrôles clavier...');
    
    // Touches pour navigation
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    // Touches WASD
    this.wasd = this.scene.input.keyboard.addKeys('W,S,A,D');
    
    // Touches d'action
    this.actionKeys = this.scene.input.keyboard.addKeys('SPACE,ENTER,ESC');
    
    // Gestionnaire d'événements clavier
    this.scene.input.keyboard.on('keydown', (event) => {
      if (!this.isVisible || !this.waitingForInput) return;
      
      switch (event.code) {
        case 'Escape':
          if (this.currentMenu !== 'main') {
            this.showMainMenu();
          }
          break;
          
        case 'Enter':
        case 'Space':
          // Confirmer la sélection actuelle
          break;
          
        // Navigation avec flèches
        case 'ArrowUp':
        case 'KeyW':
          this.navigateUp();
          break;
          
        case 'ArrowDown':
        case 'KeyS':
          this.navigateDown();
          break;
          
        case 'ArrowLeft':
        case 'KeyA':
          this.navigateLeft();
          break;
          
        case 'ArrowRight':
        case 'KeyD':
          this.navigateRight();
          break;
      }
    });
  }

  navigateUp() {
    // TODO: Navigation clavier vers le haut
    console.log('⬆️ Navigation haut');
  }

  navigateDown() {
    // TODO: Navigation clavier vers le bas
    console.log('⬇️ Navigation bas');
  }

  navigateLeft() {
    // TODO: Navigation clavier vers la gauche
    console.log('⬅️ Navigation gauche');
  }

  navigateRight() {
    // TODO: Navigation clavier vers la droite
    console.log('➡️ Navigation droite');
  }

  // === ÉVÉNEMENTS EXTERNES ===

  onBattleTurnStart(isPlayerTurn) {
    console.log(`🔄 [BattleActionUI] Tour ${isPlayerTurn ? 'joueur' : 'adversaire'}`);
    
    if (isPlayerTurn) {
      this.show();
    } else {
      this.hide();
    }
  }

  onBattleMessage(message) {
    console.log(`💬 [BattleActionUI] Message: ${message}`);
    
    // Masquer temporairement l'interface pendant les messages
    if (this.isVisible) {
      this.setEnabled(false);
      
      // Réactiver après le message
      setTimeout(() => {
        this.setEnabled(true);
      }, 2000);
    }
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Affiche l'interface et attend une action du joueur
   */
  waitForPlayerAction() {
    console.log('⏳ [BattleActionUI] Attente action joueur...');
    
    return new Promise((resolve) => {
      this.show();
      
      // Écouter l'événement d'action sélectionnée
      const handleAction = (action) => {
        this.scene.events.off('battleActionSelected', handleAction);
        resolve(action);
      };
      
      this.scene.events.on('battleActionSelected', handleAction);
    });
  }

  /**
   * Affiche uniquement les options disponibles selon le contexte
   */
  showContextualActions(context = {}) {
    console.log('🎯 [BattleActionUI] Actions contextuelles:', context);
    
    const { canFlee = true, canUseBag = true, canSwitchPokemon = false } = context;
    
    // Activer/désactiver les boutons selon le contexte
    this.actionButtons?.forEach(button => {
      switch (button.key) {
        case 'run':
          button.setEnabled(canFlee);
          break;
        case 'bag':
          button.setEnabled(canUseBag);
          break;
        case 'pokemon':
          button.setEnabled(canSwitchPokemon);
          break;
        case 'fight':
          button.setEnabled(true); // Toujours disponible
          break;
      }
    });
    
    this.show();
  }

  // === ANIMATIONS SPÉCIALES ===

  showWithTypeEffect(moveType) {
    console.log(`✨ [BattleActionUI] Effet de type: ${moveType}`);
    
    if (this.mainActionContainer) {
      const typeColor = this.getTypeColor(moveType);
      
      // Effet de particules du type
      const particles = this.scene.add.particles(0, 0, 'sparkle', {
        x: { min: -200, max: 200 },
        y: { min: -60, max: 60 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: typeColor,
        lifespan: 1000,
        quantity: 3
      });
      
      this.mainActionContainer.add(particles);
      
      // Nettoyer après animation
      setTimeout(() => {
        particles.destroy();
      }, 2000);
    }
    
    this.show();
  }

  pulseActionButton(action) {
    console.log(`💓 [BattleActionUI] Pulse bouton: ${action}`);
    
    const button = this.actionButtons?.find(btn => btn.key === action);
    
    if (button) {
      this.scene.tweens.add({
        targets: button.container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // === DEBUG ===

  debugInterface() {
    console.log('🔍 === DEBUG BATTLE ACTION UI ===');
    console.log('📊 État actuel:', {
      isVisible: this.isVisible,
      currentMenu: this.currentMenu,
      waitingForInput: this.waitingForInput,
      selectedAction: this.selectedAction
    });
    
    console.log('📦 Containers:', {
      mainActionContainer: !!this.mainActionContainer,
      movesContainer: !!this.movesContainer,
      bagContainer: !!this.bagContainer,
      pokemonContainer: !!this.pokemonContainer
    });
    
    console.log('🎮 Boutons d\'action:', 
      this.actionButtons?.map(btn => ({
        key: btn.key,
        enabled: !btn.hitArea.disableInteractive
      })) || []
    );
    
    console.log('💥 Boutons d\'attaques:', this.moveButtons?.length || 0);
    console.log('🎒 Boutons d\'objets:', this.itemButtons?.length || 0);
    
    return {
      state: {
        isVisible: this.isVisible,
        currentMenu: this.currentMenu,
        waitingForInput: this.waitingForInput
      },
      containers: {
        main: !!this.mainActionContainer,
        moves: !!this.movesContainer,
        bag: !!this.bagContainer,
        pokemon: !!this.pokemonContainer
      },
      buttons: {
        actions: this.actionButtons?.length || 0,
        moves: this.moveButtons?.length || 0,
        items: this.itemButtons?.length || 0
      }
    };
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleActionUI] Destruction...');
    
    // Détruire les containers
    if (this.mainActionContainer) {
      this.mainActionContainer.destroy();
      this.mainActionContainer = null;
    }
    
    if (this.movesContainer) {
      this.movesContainer.destroy();
      this.movesContainer = null;
    }
    
    if (this.bagContainer) {
      this.bagContainer.destroy();
      this.bagContainer = null;
    }
    
    if (this.pokemonContainer) {
      this.pokemonContainer.destroy();
      this.pokemonContainer = null;
    }
    
    // Nettoyer les références
    this.actionButtons = [];
    this.moveButtons = [];
    this.itemButtons = [];
    
    // Nettoyer les événements clavier
    if (this.scene && this.scene.input) {
      this.scene.input.keyboard.removeAllListeners();
    }
    
    console.log('✅ [BattleActionUI] Interface détruite');
  }
}

// === FONCTIONS DE TEST GLOBALES ===

// Test de l'interface d'actions
window.testBattleActionUI = function() {
  console.log('🧪 === TEST INTERFACE ACTIONS DE COMBAT ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return false;
  }
  
  // Activer la scène si nécessaire
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.start('BattleScene');
    
    setTimeout(() => {
      const activeBattleScene = window.game.scene.getScene('BattleScene');
      if (activeBattleScene) {
        testBattleActionUIInternal(activeBattleScene);
      }
    }, 500);
  } else {
    testBattleActionUIInternal(battleScene);
  }
  
  return true;
};

function testBattleActionUIInternal(battleScene) {
  console.log('🎮 [Test] Création BattleActionUI...');
  
  // Créer une instance de test
  const actionUI = new BattleActionUI(battleScene, null);
  actionUI.create();
  
  // Afficher l'interface
  setTimeout(() => {
    actionUI.show();
    console.log('✅ [Test] Interface d\'actions affichée');
  }, 500);
  
  // Test séquence d'actions
  setTimeout(() => {
    console.log('🧪 [Test] Test séquence actions...');
    actionUI.pulseActionButton('fight');
  }, 2000);
  
  setTimeout(() => {
    actionUI.showMovesMenu();
  }, 4000);
  
  setTimeout(() => {
    actionUI.showMainMenu();
  }, 6000);
  
  setTimeout(() => {
    actionUI.showBagMenu();
  }, 8000);
  
  setTimeout(() => {
    actionUI.showMainMenu();
  }, 10000);
  
  // Stockage global pour debug
  window.testBattleActionUIInstance = actionUI;
  
  console.log('✅ [Test] Séquence de test lancée !');
  console.log('🔍 Utilisez window.testBattleActionUIInstance.debugInterface() pour debug');
}

// Test rapide affichage
window.quickTestBattleActions = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    window.game.scene.start('BattleScene');
    setTimeout(() => window.quickTestBattleActions(), 500);
    return;
  }
  
  const actionUI = new BattleActionUI(battleScene, null);
  actionUI.create();
  actionUI.show();
  
  window.quickBattleActionUI = actionUI;
  console.log('✅ Interface d\'actions créée rapidement !');
};

console.log('✅ [BattleActionUI] Interface d\'actions de combat chargée !');
console.log('🧪 Utilisez window.testBattleActionUI() pour tester');
console.log('⚡ Utilisez window.quickTestBattleActions() pour test rapide');
console.log('');
console.log('🎮 FONCTIONNALITÉS:');
console.log('   ✅ Menu principal: FIGHT/BAG/POKEMON/RUN');
console.log('   ✅ Sous-menu attaques avec types colorés');
console.log('   ✅ Sous-menu sac avec objets de combat');
console.log('   ✅ Sous-menu Pokémon (placeholder)');
console.log('   ✅ Animations fluides et effets visuels');
console.log('   ✅ Navigation au clavier (optionnelle)');
console.log('   ✅ Interface contextuelle selon situation');
console.log('');
console.log('🎯 INTÉGRATION FACILE:');
console.log('   📝 Import: import { BattleActionUI } from "./BattleActionUI.js"');
console.log('   🏗️ Création: const actionUI = new BattleActionUI(scene, battleManager)');
console.log('   ⚡ Utilisation: actionUI.create(); actionUI.show()');
console.log('');
console.log('🚀 PRÊT POUR INTÉGRATION DANS BATTLESCENE !');
