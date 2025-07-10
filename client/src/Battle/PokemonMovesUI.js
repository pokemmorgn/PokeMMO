// client/src/Battle/PokemonMovesUI.js
// Interface d'attaques Pokémon authentique (style Rouge/Bleu) avec gestion PP et Struggle

export class PokemonMovesUI {
  constructor(scene, battleNetworkHandler) {
    this.scene = scene;
    this.networkHandler = battleNetworkHandler;
    
    // État des attaques
    this.availableMoves = [];
    this.currentPokemonName = '';
    this.forceStruggle = false;
    this.isWaitingForMoves = false;
    
    // Interface
    this.movesContainer = null;
    this.moveButtons = [];
    this.backButton = null;
    this.titleText = null;
    this.pokemonNameText = null;
    
    // Configuration visuelle Pokémon authentique
    this.config = {
      width: 440,
      height: 280,
      x: 0.5, // Centre écran
      y: 0.65,
      buttonWidth: 180,
      buttonHeight: 50,
      gap: 15,
      cornerRadius: 8
    };
    
    console.log('⚔️ [PokemonMovesUI] Interface attaques Pokémon authentique initialisée');
  }

  // === CRÉATION INTERFACE ===

  create() {
    const { width, height } = this.scene.cameras.main;
    const x = width * this.config.x;
    const y = height * this.config.y;

    // Conteneur principal
    this.movesContainer = this.scene.add.container(x, y);
    this.movesContainer.setDepth(250);
    this.movesContainer.setVisible(false);

    // Background style Game Boy
    this.createGameBoyBackground();
    
    // Titre
    this.createTitle();
    
    // Zone nom Pokémon
    this.createPokemonNameDisplay();
    
    // Grille des attaques (2x2)
    this.createMoveGrid();
    
    // Bouton retour
    this.createBackButton();
    
    // Configuration événements réseau
    this.setupNetworkEvents();
    
    console.log('✅ [PokemonMovesUI] Interface créée avec style Pokémon authentique');
  }

  createGameBoyBackground() {
    const bg = this.scene.add.graphics();
    
    // Fond principal (style Game Boy)
    bg.fillStyle(0x9CBD0F, 1); // Vert Game Boy
    bg.fillRoundedRect(-this.config.width/2, -this.config.height/2, 
                       this.config.width, this.config.height, this.config.cornerRadius);
    
    // Bordure externe noire épaisse
    bg.lineStyle(4, 0x0F380F, 1);
    bg.strokeRoundedRect(-this.config.width/2, -this.config.height/2, 
                         this.config.width, this.config.height, this.config.cornerRadius);
    
    // Bordure interne claire
    bg.lineStyle(2, 0xDFDFDF, 1);
    bg.strokeRoundedRect(-this.config.width/2 + 8, -this.config.height/2 + 8, 
                         this.config.width - 16, this.config.height - 16, this.config.cornerRadius);
    
    this.movesContainer.add(bg);
  }

  createTitle() {
    this.titleText = this.scene.add.text(0, -this.config.height/2 + 25, 'ATTAQUES', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#0F380F',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 1
    });
    this.titleText.setOrigin(0.5);
    this.movesContainer.add(this.titleText);
  }

  createPokemonNameDisplay() {
    this.pokemonNameText = this.scene.add.text(0, -this.config.height/2 + 55, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#0F380F',
      fontWeight: 'bold'
    });
    this.pokemonNameText.setOrigin(0.5);
    this.movesContainer.add(this.pokemonNameText);
  }

  createMoveGrid() {
    // Positions pour grille 2x2
    const positions = [
      { x: -this.config.buttonWidth/2 - this.config.gap/2, y: -25 }, // Haut gauche
      { x: this.config.buttonWidth/2 + this.config.gap/2, y: -25 },  // Haut droite
      { x: -this.config.buttonWidth/2 - this.config.gap/2, y: 35 },  // Bas gauche
      { x: this.config.buttonWidth/2 + this.config.gap/2, y: 35 }    // Bas droite
    ];

    this.moveButtons = [];
    for (let i = 0; i < 4; i++) {
      const button = this.createMoveButton(positions[i], i);
      this.movesContainer.add(button.container);
      this.moveButtons.push(button);
    }
  }

  createMoveButton(position, index) {
    const container = this.scene.add.container(position.x, position.y);
    
    // Background du bouton
    const bg = this.scene.add.graphics();
    this.drawMoveButtonBackground(bg, 'normal');
    container.add(bg);
    
    // Nom de l'attaque
    const nameText = this.scene.add.text(-this.config.buttonWidth/2 + 10, -15, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    container.add(nameText);
    
    // Type de l'attaque
    const typeText = this.scene.add.text(-this.config.buttonWidth/2 + 10, 0, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#FFFFFF'
    });
    container.add(typeText);
    
    // PP
    const ppText = this.scene.add.text(this.config.buttonWidth/2 - 10, -15, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#FFFF00',
      fontWeight: 'bold'
    });
    ppText.setOrigin(1, 0);
    container.add(ppText);
    
    // Puissance/Précision
    const powerText = this.scene.add.text(this.config.buttonWidth/2 - 10, 5, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#CCCCCC'
    });
    powerText.setOrigin(1, 0);
    container.add(powerText);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, this.config.buttonWidth, this.config.buttonHeight, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => this.onMoveButtonHover(index, true));
    hitArea.on('pointerout', () => this.onMoveButtonHover(index, false));
    hitArea.on('pointerdown', () => this.onMoveButtonClick(index));
    
    return {
      container,
      bg,
      nameText,
      typeText,
      ppText,
      powerText,
      hitArea,
      index,
      moveData: null,
      isEnabled: true
    };
  }

  drawMoveButtonBackground(graphics, state, typeColor = null) {
    graphics.clear();
    
    let bgColor, borderColor;
    
    switch (state) {
      case 'disabled':
        bgColor = 0x666666;
        borderColor = 0x333333;
        break;
      case 'hover':
        bgColor = typeColor ? this.lightenColor(typeColor, 0.3) : 0xFFFFFF;
        borderColor = 0xFFFF00;
        break;
      case 'normal':
      default:
        bgColor = typeColor || 0x4A4A4A;
        borderColor = 0x222222;
        break;
    }
    
    // Fond
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(-this.config.buttonWidth/2, -this.config.buttonHeight/2, 
                             this.config.buttonWidth, this.config.buttonHeight, 6);
    
    // Bordure
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(-this.config.buttonWidth/2, -this.config.buttonHeight/2, 
                               this.config.buttonWidth, this.config.buttonHeight, 6);
    
    // Effet 3D (style Game Boy)
    if (state !== 'disabled') {
      graphics.lineStyle(1, 0xFFFFFF, 0.8);
      graphics.lineBetween(-this.config.buttonWidth/2, -this.config.buttonHeight/2, 
                           this.config.buttonWidth/2, -this.config.buttonHeight/2);
      graphics.lineBetween(-this.config.buttonWidth/2, -this.config.buttonHeight/2, 
                           -this.config.buttonWidth/2, this.config.buttonHeight/2);
    }
  }

  createBackButton() {
    const backContainer = this.scene.add.container(0, this.config.height/2 - 30);
    
    // Background
    const backBg = this.scene.add.graphics();
    backBg.fillStyle(0x8B4513, 1);
    backBg.fillRoundedRect(-50, -15, 100, 30, 6);
    backBg.lineStyle(2, 0x5D2F0A, 1);
    backBg.strokeRoundedRect(-50, -15, 100, 30, 6);
    backContainer.add(backBg);
    
    // Texte
    const backText = this.scene.add.text(0, 0, 'RETOUR', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    backText.setOrigin(0.5);
    backContainer.add(backText);
    
    // Zone interactive
    const backHitArea = this.scene.add.rectangle(0, 0, 100, 30, 0x000000, 0);
    backHitArea.setInteractive({ useHandCursor: true });
    backContainer.add(backHitArea);
    
    // Événements
    backHitArea.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(0xA0522D, 1);
      backBg.fillRoundedRect(-50, -15, 100, 30, 6);
      backBg.lineStyle(2, 0x8B4513, 1);
      backBg.strokeRoundedRect(-50, -15, 100, 30, 6);
    });
    
    backHitArea.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(0x8B4513, 1);
      backBg.fillRoundedRect(-50, -15, 100, 30, 6);
      backBg.lineStyle(2, 0x5D2F0A, 1);
      backBg.strokeRoundedRect(-50, -15, 100, 30, 6);
    });
    
    backHitArea.on('pointerdown', () => {
      this.hide();
    });
    
    this.movesContainer.add(backContainer);
    this.backButton = backContainer;
  }

  // === GESTION ÉVÉNEMENTS RÉSEAU ===

  setupNetworkEvents() {
    if (!this.networkHandler) {
      console.warn('⚠️ [PokemonMovesUI] NetworkHandler manquant');
      return;
    }

    // Réponse aux attaques disponibles
    this.networkHandler.on('requestMovesResult', (data) => {
      this.handleMovesResult(data);
    });

    console.log('📡 [PokemonMovesUI] Événements réseau configurés');
  }

  handleMovesResult(data) {
    console.log('📋 [PokemonMovesUI] Attaques reçues:', data);

    if (!data.success) {
      console.error('❌ [PokemonMovesUI] Erreur:', data.error);
      this.hide();
      return;
    }

    // Mettre à jour les données
    this.availableMoves = data.moves || [];
    this.currentPokemonName = data.pokemonName || 'Pokémon';
    this.forceStruggle = data.forceStruggle || false;

    // Afficher l'interface
    this.displayMoves();
  }

  // === AFFICHAGE DES ATTAQUES ===

  displayMoves() {
    console.log(`🎮 [PokemonMovesUI] Affichage ${this.availableMoves.length} attaques`);

    // Mettre à jour le nom du Pokémon
    this.pokemonNameText.setText(this.currentPokemonName);

    // Titre spécial pour Struggle
    if (this.forceStruggle) {
      this.titleText.setText('LUTTE FORCÉE');
      this.titleText.setStyle({ color: '#FF0000' });
    } else {
      this.titleText.setText('ATTAQUES');
      this.titleText.setStyle({ color: '#0F380F' });
    }

    // Mettre à jour chaque bouton
    for (let i = 0; i < 4; i++) {
      const button = this.moveButtons[i];
      const moveData = this.availableMoves[i];

      if (moveData) {
        this.populateMoveButton(button, moveData);
      } else {
        this.clearMoveButton(button);
      }
    }

    // Afficher l'interface avec animation
    this.show();
  }

  populateMoveButton(button, moveData) {
    // Données de l'attaque
    button.moveData = moveData;
    button.isEnabled = !moveData.disabled;

    // Nom
    button.nameText.setText(moveData.name.toUpperCase());

    // Type avec couleur
    const typeColor = this.getTypeColor(moveData.type);
    button.typeText.setText(moveData.type.toUpperCase());
    button.typeText.setStyle({ color: this.getTypeTextColor(moveData.type) });

    // PP avec couleur selon disponibilité
    const ppColor = moveData.currentPp <= 0 ? '#FF0000' : 
                   moveData.currentPp <= 5 ? '#FF8800' : '#FFFF00';
    button.ppText.setText(`PP ${moveData.currentPp}/${moveData.maxPp}`);
    button.ppText.setStyle({ color: ppColor });

    // Puissance et précision
    const powerText = moveData.power > 0 ? `PWR ${moveData.power}` : 'STAT';
    const accText = moveData.accuracy > 0 ? `ACC ${moveData.accuracy}` : '';
    button.powerText.setText(`${powerText} ${accText}`);

    // Background selon l'état
    const state = button.isEnabled ? 'normal' : 'disabled';
    this.drawMoveButtonBackground(button.bg, state, typeColor);

    // Interactivité
    button.hitArea.setInteractive(button.isEnabled);
    button.container.setAlpha(button.isEnabled ? 1 : 0.5);

    console.log(`📝 [PokemonMovesUI] Bouton ${button.index}: ${moveData.name} (${moveData.currentPp}/${moveData.maxPp} PP)`);
  }

  clearMoveButton(button) {
    button.moveData = null;
    button.isEnabled = false;
    
    button.nameText.setText('---');
    button.typeText.setText('');
    button.ppText.setText('');
    button.powerText.setText('');
    
    this.drawMoveButtonBackground(button.bg, 'disabled');
    button.hitArea.setInteractive(false);
    button.container.setAlpha(0.3);
  }

  // === ÉVÉNEMENTS BOUTONS ===

  onMoveButtonHover(index, isHover) {
    const button = this.moveButtons[index];
    if (!button.isEnabled || !button.moveData) return;

    const state = isHover ? 'hover' : 'normal';
    const typeColor = this.getTypeColor(button.moveData.type);
    this.drawMoveButtonBackground(button.bg, state, typeColor);

    // Effet de scale léger
    const scale = isHover ? 1.05 : 1;
    this.scene.tweens.add({
      targets: button.container,
      scaleX: scale,
      scaleY: scale,
      duration: 100,
      ease: 'Power2.easeOut'
    });
  }

  onMoveButtonClick(index) {
    const button = this.moveButtons[index];
    if (!button.isEnabled || !button.moveData) {
      console.warn(`⚠️ [PokemonMovesUI] Bouton ${index} non cliquable`);
      return;
    }

    const moveData = button.moveData;
    console.log(`⚔️ [PokemonMovesUI] Attaque sélectionnée: ${moveData.name} (${moveData.moveId})`);

    // Effet visuel de clic
    this.scene.tweens.add({
      targets: button.container,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        // Envoyer l'attaque au serveur
        this.selectMove(moveData);
      }
    });
  }

  selectMove(moveData) {
    console.log(`📤 [PokemonMovesUI] Envoi attaque: ${moveData.moveId}`);

    // Masquer l'interface
    this.hide();

    // Envoyer au serveur via le NetworkHandler
    if (this.networkHandler) {
      this.networkHandler.performBattleAction('attack', {
        moveId: moveData.moveId
      });
    } else {
      console.error('❌ [PokemonMovesUI] NetworkHandler manquant pour envoi');
    }

    // Déclencher l'événement pour la BattleScene
    this.scene.events.emit('moveSelected', {
      moveId: moveData.moveId,
      moveName: moveData.name,
      moveData: moveData
    });
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Demande les attaques disponibles au serveur
   */
  requestMoves() {
    if (!this.networkHandler) {
      console.error('❌ [PokemonMovesUI] NetworkHandler manquant');
      return;
    }

    console.log('📤 [PokemonMovesUI] Demande attaques au serveur...');
    this.isWaitingForMoves = true;
    
    this.networkHandler.sendToBattle('requestMoves');
  }

  /**
   * Affiche l'interface d'attaques
   */
  show() {
    if (!this.movesContainer) return;

    this.movesContainer.setVisible(true);
    this.movesContainer.setAlpha(0);
    this.movesContainer.setScale(0.8);

    this.scene.tweens.add({
      targets: this.movesContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    console.log('👁️ [PokemonMovesUI] Interface affichée');
  }

  /**
   * Masque l'interface d'attaques
   */
  hide() {
    if (!this.movesContainer) return;

    this.scene.tweens.add({
      targets: this.movesContainer,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.movesContainer.setVisible(false);
        this.isWaitingForMoves = false;
      }
    });

    // Déclencher l'événement de retour
    this.scene.events.emit('movesMenuClosed');

    console.log('👁️ [PokemonMovesUI] Interface masquée');
  }

  /**
   * Vérifie si l'interface est visible
   */
  isVisible() {
    return this.movesContainer && this.movesContainer.visible;
  }

  // === UTILITAIRES DE COULEURS ===

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

  getTypeTextColor(type) {
    // Types sombres = texte blanc, types clairs = texte noir
    const darkTypes = ['fighting', 'poison', 'ghost', 'dragon', 'dark', 'rock'];
    return darkTypes.includes(type.toLowerCase()) ? '#FFFFFF' : '#000000';
  }

  lightenColor(color, factor) {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    const newR = Math.min(255, r + (255 - r) * factor);
    const newG = Math.min(255, g + (255 - g) * factor);
    const newB = Math.min(255, b + (255 - b) * factor);
    
    return (newR << 16) | (newG << 8) | newB;
  }

  // === NETTOYAGE ===

  destroy() {
    if (this.movesContainer) {
      this.movesContainer.destroy();
      this.movesContainer = null;
    }
    
    this.moveButtons = [];
    this.availableMoves = [];
    this.networkHandler = null;
    
    console.log('💀 [PokemonMovesUI] Interface détruite');
  }
}
