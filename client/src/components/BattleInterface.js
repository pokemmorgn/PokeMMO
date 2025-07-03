// client/src/Battle/PokemonBattleInterface.js - Interface de combat style Pokémon authentique
export class PokemonBattleInterface {
  constructor(scene, battleManager) {
    this.scene = scene;
    this.battleManager = battleManager;
    
    // État de l'interface
    this.isVisible = false;
    this.currentMenu = 'main'; // 'main', 'moves', 'bag', 'pokemon'
    this.selectedIndex = 0;
    
    // Conteneurs Phaser
    this.interfaceContainer = null;
    this.backgroundGraphics = null;
    this.menuContainer = null;
    this.buttonContainer = null;
    
    // Boutons et éléments
    this.actionButtons = [];
    this.moveButtons = [];
    this.backButton = null;
    
    // Messages et log
    this.messageBox = null;
    this.currentMessage = "";
    
    // Configuration style Pokémon
    this.colors = {
      background: 0x2a3f5f,
      border: 0x4a90e2,
      buttonNormal: 0x3b82c4,
      buttonHover: 0x2563eb,
      buttonSelected: 0x1d4ed8,
      text: 0xffffff,
      accent: 0xffcb05
    };
    
    // Layout responsive
    this.layout = this.calculateLayout();
    
    console.log('⚔️ [PokemonBattleInterface] Interface créée');
  }

  // === CRÉATION DE L'INTERFACE ===

  create() {
    console.log('🎨 [PokemonBattleInterface] Création interface...');
    
    // Conteneur principal
    this.interfaceContainer = this.scene.add.container(0, 0);
    this.interfaceContainer.setDepth(5000);
    this.interfaceContainer.setVisible(false);
    
    // Background de l'interface
    this.createBackground();
    
    // Boîte de message
    this.createMessageBox();
    
    // Menu principal
    this.createMainMenu();
    
    // Setup des événements
    this.setupControls();
    
    console.log('✅ [PokemonBattleInterface] Interface créée');
  }

  calculateLayout() {
    const { width, height } = this.scene.cameras.main;
    
    return {
      // Interface en bas de l'écran (style Pokémon authentique)
      interface: {
        x: 0,
        y: height * 0.65, // Commence à 65% de l'écran
        width: width,
        height: height * 0.35 // Prend 35% de la hauteur
      },
      
      // Zone de message (en haut de l'interface)
      message: {
        x: 20,
        y: 20,
        width: width - 40,
        height: 80
      },
      
      // Zone des boutons (en bas de l'interface)
      buttons: {
        x: 20,
        y: 120,
        width: width - 40,
        height: height * 0.35 - 140
      }
    };
  }

  createBackground() {
    // Background principal style Pokémon
    this.backgroundGraphics = this.scene.add.graphics();
    
    const layout = this.layout.interface;
    
    // Dégradé de fond
    this.backgroundGraphics.fillGradientStyle(
      this.colors.background, this.colors.background,
      0x1e2d42, 0x1e2d42
    );
    this.backgroundGraphics.fillRect(layout.x, layout.y, layout.width, layout.height);
    
    // Bordure supérieure dorée (style Pokémon)
    this.backgroundGraphics.lineStyle(4, this.colors.accent);
    this.backgroundGraphics.lineBetween(layout.x, layout.y, layout.x + layout.width, layout.y);
    
    // Bordures latérales
    this.backgroundGraphics.lineStyle(2, this.colors.border);
    this.backgroundGraphics.strokeRect(layout.x, layout.y, layout.width, layout.height);
    
    this.interfaceContainer.add(this.backgroundGraphics);
  }

  createMessageBox() {
    const msgLayout = this.layout.message;
    const interfaceY = this.layout.interface.y;
    
    // Background de la boîte de message
    const msgBg = this.scene.add.graphics();
    msgBg.fillStyle(0xffffff);
    msgBg.fillRoundedRect(msgLayout.x, interfaceY + msgLayout.y, msgLayout.width, msgLayout.height, 8);
    msgBg.lineStyle(3, 0x000000);
    msgBg.strokeRoundedRect(msgLayout.x, interfaceY + msgLayout.y, msgLayout.width, msgLayout.height, 8);
    
    // Texte du message
    this.messageBox = this.scene.add.text(
      msgLayout.x + 20, 
      interfaceY + msgLayout.y + 20,
      "Que veux-tu faire ?",
      {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#000000',
        wordWrap: { width: msgLayout.width - 40 }
      }
    );
    
    this.interfaceContainer.add([msgBg, this.messageBox]);
  }

  createMainMenu() {
    this.clearMenuContainer();
    
    const btnLayout = this.layout.buttons;
    const interfaceY = this.layout.interface.y;
    
    // Actions principales du combat Pokémon
    const actions = [
      { id: 'fight', text: '⚔️ ATTAQUE', color: 0xdc2626 },
      { id: 'bag', text: '🎒 SAC', color: 0x2563eb },
      { id: 'pokemon', text: '🎮 POKÉMON', color: 0x7c3aed },
      { id: 'run', text: '🏃 FUIR', color: 0x6b7280 }
    ];
    
    this.actionButtons = [];
    
    // Disposition en grille 2x2 (style Pokémon classique)
    const buttonWidth = (btnLayout.width - 30) / 2;
    const buttonHeight = (btnLayout.height - 20) / 2;
    
    actions.forEach((action, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      
      const x = btnLayout.x + col * (buttonWidth + 10);
      const y = interfaceY + btnLayout.y + row * (buttonHeight + 10);
      
      const button = this.createActionButton(
        x, y, buttonWidth, buttonHeight,
        action.text, action.color, action.id
      );
      
      this.actionButtons.push(button);
    });
    
    // Sélectionner le premier bouton
    this.selectButton(0);
  }

  createActionButton(x, y, width, height, text, color, actionId) {
    const buttonContainer = this.scene.add.container(x, y);
    
    // Background du bouton avec effet 3D
    const bg = this.scene.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(0, 0, width, height, 12);
    
    // Bordure claire (effet 3D haut)
    bg.lineStyle(3, 0xffffff, 0.8);
    bg.beginPath();
    bg.moveTo(8, 3);
    bg.lineTo(width - 8, 3);
    bg.moveTo(3, 8);
    bg.lineTo(3, height - 8);
    bg.strokePath();
    
    // Bordure sombre (effet 3D bas)
    bg.lineStyle(3, 0x000000, 0.6);
    bg.beginPath();
    bg.moveTo(width - 3, 8);
    bg.lineTo(width - 3, height - 8);
    bg.moveTo(8, height - 3);
    bg.lineTo(width - 8, height - 3);
    bg.strokePath();
    
    // Texte du bouton
    const buttonText = this.scene.add.text(width / 2, height / 2, text, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // Shadow du texte
    const textShadow = this.scene.add.text(width / 2 + 2, height / 2 + 2, text, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#000000',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    buttonContainer.add([bg, textShadow, buttonText]);
    
    // Données du bouton
    buttonContainer.setData('actionId', actionId);
    buttonContainer.setData('bg', bg);
    buttonContainer.setData('text', buttonText);
    buttonContainer.setData('originalColor', color);
    buttonContainer.setData('isSelected', false);
    
    // Interactivité
    buttonContainer.setSize(width, height);
    buttonContainer.setInteractive({ useHandCursor: true });
    
    buttonContainer.on('pointerover', () => {
      if (!buttonContainer.getData('isSelected')) {
        this.hoverButton(buttonContainer);
      }
    });
    
    buttonContainer.on('pointerout', () => {
      if (!buttonContainer.getData('isSelected')) {
        this.unhoverButton(buttonContainer);
      }
    });
    
    buttonContainer.on('pointerdown', () => {
      this.selectButtonByContainer(buttonContainer);
      this.confirmAction();
    });
    
    this.interfaceContainer.add(buttonContainer);
    
    return buttonContainer;
  }

  // === GESTION DES SOUS-MENUS ===

  createMovesMenu() {
    console.log('💥 [PokemonBattleInterface] Création menu attaques...');
    
    this.clearMenuContainer();
    this.currentMenu = 'moves';
    
    // Obtenir les attaques du Pokémon actuel
    const playerPokemon = this.battleManager?.battleState?.player?.pokemon;
    const moves = playerPokemon?.moves || [
      { id: 'tackle', name: 'Charge', pp: 30, maxPp: 30, type: 'normal', power: 40 },
      { id: 'thunderbolt', name: 'Tonnerre', pp: 15, maxPp: 15, type: 'electric', power: 90 },
      { id: 'quick_attack', name: 'Vive-Attaque', pp: 30, maxPp: 30, type: 'normal', power: 40 },
      { id: 'tail_whip', name: 'Mimi-Queue', pp: 30, maxPp: 30, type: 'normal', power: 0 }
    ];
    
    const btnLayout = this.layout.buttons;
    const interfaceY = this.layout.interface.y;
    
    this.moveButtons = [];
    
    // Disposition en grille 2x2 pour les attaques
    const buttonWidth = (btnLayout.width - 30) / 2;
    const buttonHeight = (btnLayout.height - 60) / 2; // Place pour bouton retour
    
    moves.slice(0, 4).forEach((move, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      
      const x = btnLayout.x + col * (buttonWidth + 10);
      const y = interfaceY + btnLayout.y + row * (buttonHeight + 10);
      
      const button = this.createMoveButton(x, y, buttonWidth, buttonHeight, move);
      this.moveButtons.push(button);
    });
    
    // Bouton retour
    this.createBackButton();
    
    // Mettre à jour le message
    this.updateMessage("Choisis une attaque !");
    
    // Sélectionner la première attaque
    this.selectButton(0);
  }

  createMoveButton(x, y, width, height, move) {
    const buttonContainer = this.scene.add.container(x, y);
    
    // Couleur selon le type
    const typeColors = {
      normal: 0x9ca3af, fire: 0xef4444, water: 0x3b82f6, electric: 0xeab308,
      grass: 0x22c55e, ice: 0x06b6d4, fighting: 0xdc2626, poison: 0x8b5cf6,
      ground: 0xa3a3a3, flying: 0x60a5fa, psychic: 0xec4899, bug: 0x84cc16,
      rock: 0x78716c, ghost: 0x6b7280, dragon: 0x7c3aed, dark: 0x374151,
      steel: 0x9ca3af, fairy: 0xf472b6
    };
    
    const moveColor = typeColors[move.type] || 0x6b7280;
    
    // Background du bouton
    const bg = this.scene.add.graphics();
    bg.fillStyle(moveColor);
    bg.fillRoundedRect(0, 0, width, height, 8);
    bg.lineStyle(2, 0x000000);
    bg.strokeRoundedRect(0, 0, width, height, 8);
    
    // Nom de l'attaque
    const nameText = this.scene.add.text(8, 8, move.name, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontWeight: 'bold'
    });
    
    // PP (Points de Pouvoir)
    const ppText = this.scene.add.text(width - 8, height - 8, `PP: ${move.pp}/${move.maxPp}`, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(1, 1);
    
    // Type
    const typeText = this.scene.add.text(8, height - 8, move.type.toUpperCase(), {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0, 1);
    
    // Puissance (si applicable)
    if (move.power > 0) {
      const powerText = this.scene.add.text(width - 8, 8, `PWR: ${move.power}`, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffff00'
      }).setOrigin(1, 0);
      buttonContainer.add(powerText);
    }
    
    buttonContainer.add([bg, nameText, ppText, typeText]);
    
    // Données du bouton
    buttonContainer.setData('moveId', move.id);
    buttonContainer.setData('move', move);
    buttonContainer.setData('bg', bg);
    buttonContainer.setData('originalColor', moveColor);
    buttonContainer.setData('isSelected', false);
    
    // Interactivité
    buttonContainer.setSize(width, height);
    buttonContainer.setInteractive({ useHandCursor: true });
    
    buttonContainer.on('pointerover', () => {
      if (!buttonContainer.getData('isSelected')) {
        this.hoverButton(buttonContainer);
      }
    });
    
    buttonContainer.on('pointerout', () => {
      if (!buttonContainer.getData('isSelected')) {
        this.unhoverButton(buttonContainer);
      }
    });
    
    buttonContainer.on('pointerdown', () => {
      this.selectButtonByContainer(buttonContainer);
      this.confirmAction();
    });
    
    this.interfaceContainer.add(buttonContainer);
    
    return buttonContainer;
  }

  createBackButton() {
    const btnLayout = this.layout.buttons;
    const interfaceY = this.layout.interface.y;
    
    const backY = interfaceY + btnLayout.y + btnLayout.height - 40;
    
    this.backButton = this.scene.add.text(
      btnLayout.x + btnLayout.width / 2,
      backY,
      "← RETOUR",
      {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    
    this.backButton.setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => {
      this.goBack();
    });
    
    this.interfaceContainer.add(this.backButton);
  }

  // === GESTION DE LA NAVIGATION ===

  selectButton(index) {
    // Désélectionner tous les boutons
    const currentButtons = this.getCurrentButtons();
    currentButtons.forEach(button => {
      this.unselectButton(button);
    });
    
    // Sélectionner le bouton actuel
    if (currentButtons[index]) {
      this.selectedIndex = index;
      this.highlightButton(currentButtons[index]);
      currentButtons[index].setData('isSelected', true);
    }
  }

  selectButtonByContainer(buttonContainer) {
    const currentButtons = this.getCurrentButtons();
    const index = currentButtons.indexOf(buttonContainer);
    if (index !== -1) {
      this.selectButton(index);
    }
  }

  getCurrentButtons() {
    switch (this.currentMenu) {
      case 'main':
        return this.actionButtons;
      case 'moves':
        return this.moveButtons;
      default:
        return this.actionButtons;
    }
  }

  hoverButton(button) {
    const bg = button.getData('bg');
    if (bg) {
      bg.clear();
      bg.fillStyle(this.colors.buttonHover);
      bg.fillRoundedRect(0, 0, button.width, button.height, 12);
    }
    
    // Petit effet de scale
    this.scene.tweens.add({
      targets: button,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 100,
      ease: 'Power2'
    });
  }

  unhoverButton(button) {
    const bg = button.getData('bg');
    const originalColor = button.getData('originalColor');
    if (bg && originalColor) {
      bg.clear();
      bg.fillStyle(originalColor);
      bg.fillRoundedRect(0, 0, button.width, button.height, 12);
    }
    
    // Retour à la taille normale
    this.scene.tweens.add({
      targets: button,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2'
    });
  }

  highlightButton(button) {
    const bg = button.getData('bg');
    if (bg) {
      bg.clear();
      bg.fillStyle(this.colors.buttonSelected);
      bg.fillRoundedRect(0, 0, button.width, button.height, 12);
      
      // Bordure dorée pour la sélection
      bg.lineStyle(3, this.colors.accent);
      bg.strokeRoundedRect(0, 0, button.width, button.height, 12);
    }
    
    // Effet de pulsation
    this.scene.tweens.add({
      targets: button,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  unselectButton(button) {
    const originalColor = button.getData('originalColor');
    const bg = button.getData('bg');
    
    if (bg && originalColor) {
      bg.clear();
      bg.fillStyle(originalColor);
      bg.fillRoundedRect(0, 0, button.width, button.height, 12);
    }
    
    button.setData('isSelected', false);
    
    // Arrêter les tweens
    this.scene.tweens.killTweensOf(button);
    button.setScale(1, 1);
  }

  // === ACTIONS ===

  confirmAction() {
    const currentButtons = this.getCurrentButtons();
    const selectedButton = currentButtons[this.selectedIndex];
    
    if (!selectedButton) return;
    
    if (this.currentMenu === 'main') {
      const actionId = selectedButton.getData('actionId');
      this.handleMainAction(actionId);
    } else if (this.currentMenu === 'moves') {
      const move = selectedButton.getData('move');
      this.handleMoveSelection(move);
    }
  }

  handleMainAction(actionId) {
    console.log(`⚔️ [PokemonBattleInterface] Action: ${actionId}`);
    
    switch (actionId) {
      case 'fight':
        this.createMovesMenu();
        break;
      
      case 'bag':
        this.updateMessage("Ouverture du sac...");
        this.sendBattleAction('bag', {});
        break;
      
      case 'pokemon':
        this.updateMessage("Changement de Pokémon...");
        this.sendBattleAction('pokemon', {});
        break;
      
      case 'run':
        this.updateMessage("Tentative de fuite...");
        this.sendBattleAction('run', {});
        break;
      
      default:
        console.warn(`⚠️ Action non reconnue: ${actionId}`);
    }
  }

  handleMoveSelection(move) {
    console.log(`💥 [PokemonBattleInterface] Attaque sélectionnée: ${move.name}`);
    
    if (move.pp <= 0) {
      this.updateMessage(`${move.name} n'a plus de PP !`);
      return;
    }
    
    this.updateMessage(`${move.name} sélectionné !`);
    this.sendBattleAction('attack', { moveId: move.id, move: move });
    
    // Retourner au menu principal après action
    setTimeout(() => {
      this.hide();
    }, 1000);
  }

  goBack() {
    if (this.currentMenu === 'moves') {
      this.createMainMenu();
      this.currentMenu = 'main';
      this.updateMessage("Que veux-tu faire ?");
    }
  }

  // === COMMUNICATION AVEC LE SYSTÈME DE COMBAT ===

  sendBattleAction(actionType, actionData) {
    console.log(`📤 [PokemonBattleInterface] Envoi action: ${actionType}`, actionData);
    
    // Envoyer via le BattleManager
    if (this.battleManager && this.battleManager.sendBattleAction) {
      this.battleManager.sendBattleAction(actionType, actionData);
    }
    
    // Ou directement via le network handler
    if (this.scene.networkHandler && this.scene.networkHandler.performBattleAction) {
      this.scene.networkHandler.performBattleAction(actionType, actionData);
    }
    
    // Événement global pour compatibilité
    if (window.onBattleAction) {
      window.onBattleAction({
        type: actionType,
        data: actionData,
        timestamp: Date.now()
      });
    }
    
    // Notification utilisateur
    if (window.showGameNotification) {
      let message = '';
      switch (actionType) {
        case 'attack':
          message = `💥 ${actionData.move?.name || 'Attaque'} utilisé !`;
          break;
        case 'bag':
          message = '🎒 Ouverture du sac...';
          break;
        case 'pokemon':
          message = '🎮 Changement de Pokémon...';
          break;
        case 'run':
          message = '🏃 Tentative de fuite !';
          break;
      }
      
      if (message) {
        window.showGameNotification(message, 'info', { duration: 2000 });
      }
    }
  }

  // === GESTION DES MESSAGES ===

  updateMessage(text) {
    this.currentMessage = text;
    if (this.messageBox) {
      this.messageBox.setText(text);
      
      // Animation du texte
      this.messageBox.setAlpha(0);
      this.scene.tweens.add({
        targets: this.messageBox,
        alpha: 1,
        duration: 300,
        ease: 'Power2'
      });
    }
  }

  // === CONTRÔLES CLAVIER ===

  setupControls() {
    // Contrôles clavier pour navigation
    this.scene.input.keyboard.on('keydown-UP', () => {
      this.navigateUp();
    });
    
    this.scene.input.keyboard.on('keydown-DOWN', () => {
      this.navigateDown();
    });
    
    this.scene.input.keyboard.on('keydown-LEFT', () => {
      this.navigateLeft();
    });
    
    this.scene.input.keyboard.on('keydown-RIGHT', () => {
      this.navigateRight();
    });
    
    this.scene.input.keyboard.on('keydown-ENTER', () => {
      this.confirmAction();
    });
    
    this.scene.input.keyboard.on('keydown-SPACE', () => {
      this.confirmAction();
    });
    
    this.scene.input.keyboard.on('keydown-ESC', () => {
      this.goBack();
    });
    
    this.scene.input.keyboard.on('keydown-BACKSPACE', () => {
      this.goBack();
    });
  }

  navigateUp() {
    if (this.currentMenu === 'main' || this.currentMenu === 'moves') {
      // Navigation en grille 2x2
      const newIndex = this.selectedIndex - 2;
      if (newIndex >= 0) {
        this.selectButton(newIndex);
      }
    }
  }

  navigateDown() {
    if (this.currentMenu === 'main' || this.currentMenu === 'moves') {
      const currentButtons = this.getCurrentButtons();
      const newIndex = this.selectedIndex + 2;
      if (newIndex < currentButtons.length) {
        this.selectButton(newIndex);
      }
    }
  }

  navigateLeft() {
    if (this.selectedIndex % 2 === 1) { // Si on est sur la colonne de droite
      this.selectButton(this.selectedIndex - 1);
    }
  }

  navigateRight() {
    const currentButtons = this.getCurrentButtons();
    if (this.selectedIndex % 2 === 0 && this.selectedIndex + 1 < currentButtons.length) {
      this.selectButton(this.selectedIndex + 1);
    }
  }

  // === AFFICHAGE/MASQUAGE ===

  show() {
    console.log('👁️ [PokemonBattleInterface] Affichage interface');
    
    if (!this.interfaceContainer) {
      this.create();
    }
    
    this.interfaceContainer.setVisible(true);
    this.isVisible = true;
    
    // Animation d'entrée
    this.interfaceContainer.setAlpha(0);
    this.interfaceContainer.setY(this.layout.interface.y + 50);
    
    this.scene.tweens.add({
      targets: this.interfaceContainer,
      alpha: 1,
      y: 0,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    // Réinitialiser au menu principal
    this.createMainMenu();
    this.currentMenu = 'main';
    this.updateMessage("Que veux-tu faire ?");
  }

  hide() {
    console.log('👻 [PokemonBattleInterface] Masquage interface');
    
    if (!this.interfaceContainer) return;
    
    // Animation de sortie
    this.scene.tweens.add({
      targets: this.interfaceContainer,
      alpha: 0,
      y: this.layout.interface.y + 50,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.interfaceContainer.setVisible(false);
        this.isVisible = false;
      }
    });
  }

  // === MÉTHODES UTILITAIRES ===

  clearMenuContainer() {
    // Nettoyer les boutons existants
    this.actionButtons.forEach(button => {
      if (button && button.destroy) {
        this.scene.tweens.killTweensOf(button);
        button.destroy();
      }
    });
    this.actionButtons = [];
    
    this.moveButtons.forEach(button => {
      if (button && button.destroy) {
        this.scene.tweens.killTweensOf(button);
        button.destroy();
      }
    });
    this.moveButtons = [];
    
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = null;
    }
  }

  // === MISE À JOUR ===

  updatePokemonData(playerPokemon) {
    // Mettre à jour les données du Pokémon si nécessaire
    if (this.currentMenu === 'moves') {
      // Recréer le menu des attaques avec les nouvelles données
      this.createMovesMenu();
    }
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('💀 [PokemonBattleInterface] Destruction interface...');
    
    // Nettoyer les tweens
    if (this.interfaceContainer) {
      this.scene.tweens.killTweensOf(this.interfaceContainer);
    }
    
    // Nettoyer les boutons
    this.clearMenuContainer();
    
    // Détruire les éléments
    if (this.interfaceContainer) {
      this.interfaceContainer.destroy();
      this.interfaceContainer = null;
    }
    
    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
      this.backgroundGraphics = null;
    }
    
    // Nettoyer les références
    this.messageBox = null;
    this.scene = null;
    this.battleManager = null;
    
    console.log('✅ [PokemonBattleInterface] Interface détruite');
  }

  // === MÉTHODES DE TEST ===

  testInterface() {
    console.log('🧪 [PokemonBattleInterface] Test de l\'interface...');
    
    if (!this.isVisible) {
      this.show();
    }
    
    // Simuler une navigation
    setTimeout(() => {
      this.selectButton(1); // Sélectionner "SAC"
    }, 1000);
    
    setTimeout(() => {
      this.selectButton(0); // Retour à "ATTAQUE"
    }, 2000);
    
    setTimeout(() => {
      this.handleMainAction('fight'); // Ouvrir menu attaques
    }, 3000);
    
    setTimeout(() => {
      this.goBack(); // Retour menu principal
    }, 5000);
    
    console.log('✅ [PokemonBattleInterface] Test lancé');
  }

  // === GETTERS ===

  get visible() {
    return this.isVisible;
  }

  get currentMenuType() {
    return this.currentMenu;
  }

  get selectedButtonIndex() {
    return this.selectedIndex;
  }
}
