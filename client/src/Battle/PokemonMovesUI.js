// client/src/Battle/PokemonMovesUI.js
// VERSION CORRIGÉE ANTI-FREEZE avec debug complet et timeouts

export class PokemonMovesUI {
  constructor(scene, battleNetworkHandler) {
    this.scene = scene;
    this.networkHandler = battleNetworkHandler;
    
    // État des attaques
    this.availableMoves = [];
    this.currentPokemonName = '';
    this.forceStruggle = false;
    this.isWaitingForMoves = false;
    
    // ✅ NOUVEAU: Anti-freeze avec timeout
    this.requestTimeout = null;
    this.maxWaitTime = 5000; // 5 secondes max
    this.debugMode = true; // Pour identifier les problèmes
    
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
      x: 0.5,
      y: 0.65,
      buttonWidth: 180,
      buttonHeight: 50,
      gap: 15,
      cornerRadius: 8
    };
    
    console.log('⚔️ [PokemonMovesUI] Interface attaques Pokémon authentique initialisée (version anti-freeze)');
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
    
    // ✅ AMÉLIORATION: Configuration événements réseau avec vérifications
    this.setupNetworkEventsRobust();
    
    console.log('✅ [PokemonMovesUI] Interface créée avec style Pokémon authentique (anti-freeze)');
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
      this.cancelRequest(); // ✅ NOUVEAU: Annuler proprement
      this.hide();
    });
    
    this.movesContainer.add(backContainer);
    this.backButton = backContainer;
  }

  // === ✅ GESTION ÉVÉNEMENTS RÉSEAU ROBUSTE ===

  setupNetworkEventsRobust() {
    if (!this.networkHandler) {
      console.error('❌ [PokemonMovesUI] NetworkHandler manquant - interface non fonctionnelle');
      return;
    }

    // ✅ VERIFICATION: Le networkHandler a-t-il la méthode on() ?
    if (typeof this.networkHandler.on !== 'function') {
      console.error('❌ [PokemonMovesUI] NetworkHandler invalide - pas de méthode on()');
      console.error('🔍 NetworkHandler type:', typeof this.networkHandler);
      console.error('🔍 NetworkHandler methods:', Object.getOwnPropertyNames(this.networkHandler));
      return;
    }

    try {
      // Réponse aux attaques disponibles
      this.networkHandler.on('requestMovesResult', (data) => {
        if (this.debugMode) {
          console.log('📥 [PokemonMovesUI] requestMovesResult reçu:', data);
        }
        this.handleMovesResultRobust(data);
      });

      console.log('📡 [PokemonMovesUI] Événements réseau configurés avec succès');
      
      // ✅ TEST: Vérifier que l'handler est bien ajouté
      this.testNetworkHandler();
      
    } catch (error) {
      console.error('❌ [PokemonMovesUI] Erreur configuration événements:', error);
    }
  }

  // ✅ NOUVEAU: Test de connectivité
  testNetworkHandler() {
    if (!this.networkHandler) {
      console.error('❌ [PokemonMovesUI] Test failed: pas de networkHandler');
      return false;
    }

    // Vérifier si c'est connecté
    if (typeof this.networkHandler.canSendBattleActions === 'function') {
      const canSend = this.networkHandler.canSendBattleActions();
      console.log(`🔗 [PokemonMovesUI] Test connexion: ${canSend ? '✅ OK' : '❌ KO'}`);
      return canSend;
    }

    // Vérifier si sendToBattle existe
    if (typeof this.networkHandler.sendToBattle === 'function') {
      console.log('✅ [PokemonMovesUI] sendToBattle disponible');
      return true;
    }

    console.error('❌ [PokemonMovesUI] sendToBattle non disponible');
    return false;
  }

  handleMovesResultRobust(data) {
    // ✅ Arrêter le timeout
    this.clearRequestTimeout();

    console.log('📋 [PokemonMovesUI] Attaques reçues (robuste):', data);

    if (!data.success) {
      console.error('❌ [PokemonMovesUI] Erreur serveur:', data.error);
      
      // ✅ Reset l'état
      this.isWaitingForMoves = false;
      
      // Afficher erreur à l'utilisateur
      this.showError(data.error || 'Erreur inconnue');
      return;
    }

    // ✅ Reset l'état d'attente
    this.isWaitingForMoves = false;

    // Mettre à jour les données
    this.availableMoves = data.moves || [];
    this.currentPokemonName = data.pokemonName || 'Pokémon';
    this.forceStruggle = data.forceStruggle || false;

    // Afficher l'interface
    this.displayMoves();
  }

  // === ✅ MÉTHODES PUBLIQUES ROBUSTES ===

  /**
   * Demande les attaques disponibles au serveur (version robuste)
   */
  requestMoves() {
    console.log('📤 [PokemonMovesUI] Demande attaques (robuste)...');

    // ✅ Vérifications préalables
    if (!this.networkHandler) {
      console.error('❌ [PokemonMovesUI] NetworkHandler manquant');
      this.showError('Connexion réseau indisponible');
      return;
    }

    if (this.isWaitingForMoves) {
      console.warn('⚠️ [PokemonMovesUI] Demande déjà en cours, ignorée');
      return;
    }

    // ✅ Test de connectivité
    if (!this.testNetworkHandler()) {
      console.error('❌ [PokemonMovesUI] NetworkHandler non connecté');
      this.showError('Non connecté au combat');
      return;
    }

    // ✅ Marquer comme en attente
    this.isWaitingForMoves = true;

    // ✅ Démarrer le timeout
    this.startRequestTimeout();

    try {
      // ✅ Envoi avec vérification de retour
      const sent = this.networkHandler.sendToBattle('requestMoves');
      
      if (sent === false) {
        console.error('❌ [PokemonMovesUI] Échec envoi sendToBattle');
        this.handleRequestFailure('Échec envoi requête');
        return;
      }

      console.log('✅ [PokemonMovesUI] Requête envoyée, attente réponse...');
      
    } catch (error) {
      console.error('❌ [PokemonMovesUI] Erreur lors de l\'envoi:', error);
      this.handleRequestFailure('Erreur réseau');
    }
  }

  // ✅ NOUVEAU: Gestion timeout
  startRequestTimeout() {
    this.clearRequestTimeout(); // Au cas où

    this.requestTimeout = setTimeout(() => {
      console.error('⏰ [PokemonMovesUI] Timeout - pas de réponse du serveur');
      this.handleRequestFailure('Timeout serveur');
    }, this.maxWaitTime);

    if (this.debugMode) {
      console.log(`⏰ [PokemonMovesUI] Timeout démarré (${this.maxWaitTime}ms)`);
    }
  }

  clearRequestTimeout() {
    if (this.requestTimeout) {
      clearTimeout(this.requestTimeout);
      this.requestTimeout = null;
      
      if (this.debugMode) {
        console.log('⏰ [PokemonMovesUI] Timeout arrêté');
      }
    }
  }

  // ✅ NOUVEAU: Gestion échec de requête
  handleRequestFailure(reason) {
    this.clearRequestTimeout();
    this.isWaitingForMoves = false;
    
    console.error(`❌ [PokemonMovesUI] Échec requête: ${reason}`);
    this.showError(reason);
  }

  // ✅ NOUVEAU: Annulation manuelle
  cancelRequest() {
    if (this.isWaitingForMoves) {
      console.log('🚫 [PokemonMovesUI] Annulation requête en cours');
      this.clearRequestTimeout();
      this.isWaitingForMoves = false;
    }
  }

  // ✅ NOUVEAU: Affichage d'erreur
  showError(message) {
    // Mettre le titre en rouge
    if (this.titleText) {
      this.titleText.setText('ERREUR');
      this.titleText.setStyle({ color: '#FF0000' });
    }

    // Afficher le message d'erreur
    if (this.pokemonNameText) {
      this.pokemonNameText.setText(message);
      this.pokemonNameText.setStyle({ color: '#FF0000' });
    }

    // Vider les boutons
    for (let i = 0; i < 4; i++) {
      this.clearMoveButton(this.moveButtons[i]);
    }

    // Afficher l'interface d'erreur
    this.show();

    // ✅ Auto-fermeture après 3 secondes
    setTimeout(() => {
      this.hide();
    }, 3000);

    // ✅ Déclencher l'événement d'erreur pour la BattleScene
    this.scene.events.emit('movesMenuError', { message });
  }

  // === AFFICHAGE DES ATTAQUES (INCHANGÉ) ===

  displayMoves() {
    console.log(`🎮 [PokemonMovesUI] Affichage ${this.availableMoves.length} attaques`);

    // Remettre les couleurs normales
    if (this.titleText) {
      if (this.forceStruggle) {
        this.titleText.setText('LUTTE FORCÉE');
        this.titleText.setStyle({ color: '#FF0000' });
      } else {
        this.titleText.setText('ATTAQUES');
        this.titleText.setStyle({ color: '#0F380F' });
      }
    }

    // Mettre à jour le nom du Pokémon
    if (this.pokemonNameText) {
      this.pokemonNameText.setText(this.currentPokemonName);
      this.pokemonNameText.setStyle({ color: '#0F380F' });
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

  // === ÉVÉNEMENTS BOUTONS (INCHANGÉ) ===

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

  // === AFFICHAGE/MASQUAGE (INCHANGÉ) ===

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

  hide() {
    if (!this.movesContainer) return;

    // ✅ Annuler toute requête en cours
    this.cancelRequest();

    this.scene.tweens.add({
      targets: this.movesContainer,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.movesContainer.setVisible(false);
      }
    });

    // Déclencher l'événement de retour
    this.scene.events.emit('movesMenuClosed');

    console.log('👁️ [PokemonMovesUI] Interface masquée');
  }

  isVisible() {
    return this.movesContainer && this.movesContainer.visible;
  }

  // === UTILITAIRES DE COULEURS (INCHANGÉ) ===

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

  // === ✅ DEBUG ET DIAGNOSTIC ===

  debugState() {
    console.log('🔍 === DEBUG POKEMONMOVESUI ===');
    console.log('📊 État:', {
      isWaitingForMoves: this.isWaitingForMoves,
      hasNetworkHandler: !!this.networkHandler,
      isVisible: this.isVisible(),
      availableMovesCount: this.availableMoves.length,
      currentPokemon: this.currentPokemonName,
      forceStruggle: this.forceStruggle
    });
    
    if (this.networkHandler) {
      console.log('🌐 NetworkHandler:', {
        type: typeof this.networkHandler,
        hasSendToBattle: typeof this.networkHandler.sendToBattle === 'function',
        hasOn: typeof this.networkHandler.on === 'function',
        canSend: this.networkHandler.canSendBattleActions?.() || 'unknown'
      });
    }
    
    console.log('🔍 === FIN DEBUG ===');
  }

  // === NETTOYAGE ===

  destroy() {
    // ✅ Nettoyer les timeouts
    this.clearRequestTimeout();
    
    if (this.movesContainer) {
      this.movesContainer.destroy();
      this.movesContainer = null;
    }
    
    this.moveButtons = [];
    this.availableMoves = [];
    this.networkHandler = null;
    this.isWaitingForMoves = false;
    
    console.log('💀 [PokemonMovesUI] Interface détruite (robuste)');
  }
}

// === ✅ NOUVELLES FONCTIONS DE TEST ANTI-FREEZE ===

// Test basique de l'interface
window.testPokemonMovesUIRobust = function() {
  console.log('🧪 === TEST POKEMONMOVESUI ANTI-FREEZE ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!battleScene.pokemonMovesUI) {
    console.error('❌ PokemonMovesUI non initialisé');
    return;
  }
  
  // Test de l'état
  battleScene.pokemonMovesUI.debugState();
  
  // Test de connectivité
  const canConnect = battleScene.pokemonMovesUI.testNetworkHandler();
  console.log(`🔗 Test connectivité: ${canConnect ? '✅ OK' : '❌ KO'}`);
  
  // Test d'affichage d'erreur
  console.log('🧪 Test affichage erreur...');
  battleScene.pokemonMovesUI.showError('Test erreur');
};

// Test de la requête avec debug
window.testPokemonMovesRequest = function() {
  console.log('🧪 === TEST REQUÊTE ATTAQUES ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene?.pokemonMovesUI) {
    console.error('❌ PokemonMovesUI non disponible');
    return;
  }
  
  const ui = battleScene.pokemonMovesUI;
  
  console.log('📤 Tentative de requête...');
  ui.debugMode = true; // Activer debug
  ui.requestMoves();
  
  // Tester l'annulation après 2 secondes
  setTimeout(() => {
    console.log('🚫 Test annulation...');
    ui.cancelRequest();
  }, 2000);
};

console.log('✅ [PokemonMovesUI] VERSION ANTI-FREEZE CHARGÉE !');
console.log('🧪 Tests disponibles :');
console.log('   window.testPokemonMovesUIRobust() - Test diagnostic complet');
console.log('   window.testPokemonMovesRequest() - Test requête avec debug');
console.log('🔧 Améliorations anti-freeze :');
console.log('   ✅ Timeout de 5 secondes sur les requêtes');
console.log('   ✅ Vérification connectivité avant envoi');
console.log('   ✅ Gestion d\'erreurs robuste');
console.log('   ✅ Annulation manuelle possible');
console.log('   ✅ Debug mode intégré');
console.log('   ✅ Reset automatique des états');
