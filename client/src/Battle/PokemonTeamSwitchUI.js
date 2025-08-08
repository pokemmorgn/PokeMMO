// client/src/Battle/PokemonTeamSwitchUI.js
// Interface de changement d'équipe Pokémon authentique pour combats dresseurs

export class PokemonTeamSwitchUI {
  constructor(scene, battleNetworkHandler) {
    this.scene = scene;
    this.networkHandler = battleNetworkHandler;
    
    // État de l'équipe
    this.playerTeam = [];
    this.activePokemonIndex = 0;
    this.canSwitch = true;
    this.isForcedSwitch = false;
    this.availablePokemon = [];
    this.timeLimit = null;
    this.timeLimitTimer = null;
    
    // Interface
    this.teamContainer = null;
    this.menuContainer = null;
    this.pokemonSlots = [];
    this.backButton = null;
    this.titleText = null;
    this.isVisible = false;
    
    // Configuration visuelle Pokémon authentique
    this.config = {
      width: 480,
      height: 360,
      x: 0.5,
      y: 0.5,
      slotWidth: 200,
      slotHeight: 80,
      gap: 12,
      cornerRadius: 8
    };
    
    console.log('👥 [PokemonTeamSwitchUI] Interface équipe Pokémon initialisée');
  }

  // === CRÉATION DE L'INTERFACE ===

  create() {
    const { width, height } = this.scene.cameras.main;
    const x = width * this.config.x;
    const y = height * this.config.y;

    // Conteneur principal
    this.teamContainer = this.scene.add.container(x, y);
    this.teamContainer.setDepth(300);
    this.teamContainer.setVisible(false);

    // Background principal style Game Boy
    this.createPokemonBackground();
    
    // Titre dynamique
    this.createTitle();
    
    // Grille des Pokémon (2 colonnes, 3 lignes max)
    this.createPokemonGrid();
    
    // Bouton retour (contextuel)
    this.createContextualBackButton();
    
    // Timer pour changement forcé
    this.createTimerDisplay();
    
    // Écouteurs réseau
    this.setupTeamNetworkEvents();
    
    console.log('✅ [PokemonTeamSwitchUI] Interface créée avec style authentique');
  }

  createPokemonBackground() {
    const bg = this.scene.add.graphics();
    
    // Fond principal (style Game Boy Pro)
    bg.fillStyle(0x1a472a, 1); // Vert foncé Pokémon
    bg.fillRoundedRect(-this.config.width/2, -this.config.height/2, 
                       this.config.width, this.config.height, this.config.cornerRadius);
    
    // Bordure externe dorée
    bg.lineStyle(4, 0xFFD700, 1);
    bg.strokeRoundedRect(-this.config.width/2, -this.config.height/2, 
                         this.config.width, this.config.height, this.config.cornerRadius);
    
    // Bordure interne claire
    bg.lineStyle(2, 0x32CD32, 1);
    bg.strokeRoundedRect(-this.config.width/2 + 8, -this.config.height/2 + 8, 
                         this.config.width - 16, this.config.height - 16, this.config.cornerRadius);
    
    // Motif décoratif coins
    this.addCornerDecorations(bg);
    
    this.teamContainer.add(bg);
  }

  addCornerDecorations(graphics) {
    const corners = [
      { x: -this.config.width/2 + 15, y: -this.config.height/2 + 15 }, // Haut gauche
      { x: this.config.width/2 - 15, y: -this.config.height/2 + 15 },  // Haut droite
      { x: -this.config.width/2 + 15, y: this.config.height/2 - 15 },  // Bas gauche
      { x: this.config.width/2 - 15, y: this.config.height/2 - 15 }    // Bas droite
    ];
    
    corners.forEach(corner => {
      graphics.fillStyle(0xFFD700, 0.8);
      graphics.fillCircle(corner.x, corner.y, 6);
      graphics.lineStyle(2, 0x32CD32, 1);
      graphics.strokeCircle(corner.x, corner.y, 6);
    });
  }

  createTitle() {
    this.titleText = this.scene.add.text(0, -this.config.height/2 + 25, 'ÉQUIPE POKéMON', {
      fontFamily: "'Courier New', monospace",
      fontSize: '18px',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#0F380F',
      strokeThickness: 2
    });
    this.titleText.setOrigin(0.5);
    this.teamContainer.add(this.titleText);
    
    // Sous-titre contextuel
    this.subtitleText = this.scene.add.text(0, -this.config.height/2 + 50, '', {
      fontFamily: "'Courier New', monospace",
      fontSize: '12px',
      color: '#FFFFFF',
      fontWeight: 'normal'
    });
    this.subtitleText.setOrigin(0.5);
    this.teamContainer.add(this.subtitleText);
  }

  createPokemonGrid() {
    // Positions pour grille 2x3
    const positions = [
      { x: -this.config.slotWidth/2 - this.config.gap/2, y: -80 },  // Haut gauche
      { x: this.config.slotWidth/2 + this.config.gap/2, y: -80 },   // Haut droite
      { x: -this.config.slotWidth/2 - this.config.gap/2, y: 0 },    // Milieu gauche
      { x: this.config.slotWidth/2 + this.config.gap/2, y: 0 },     // Milieu droite
      { x: -this.config.slotWidth/2 - this.config.gap/2, y: 80 },   // Bas gauche
      { x: this.config.slotWidth/2 + this.config.gap/2, y: 80 }     // Bas droite
    ];

    this.pokemonSlots = [];
    for (let i = 0; i < 6; i++) {
      const slot = this.createPokemonSlot(positions[i], i);
      this.teamContainer.add(slot.container);
      this.pokemonSlots.push(slot);
    }
  }

  createPokemonSlot(position, index) {
    const container = this.scene.add.container(position.x, position.y);
    
    // Background du slot
    const bg = this.scene.add.graphics();
    this.drawSlotBackground(bg, 'empty');
    container.add(bg);
    
    // Icône Pokémon
    const pokemonIcon = this.scene.add.text(-this.config.slotWidth/2 + 15, -10, '❓', {
      fontSize: '24px',
      fontFamily: "'Segoe UI Emoji', Arial, sans-serif"
    });
    container.add(pokemonIcon);
    
    // Nom du Pokémon
    const nameText = this.scene.add.text(-this.config.slotWidth/2 + 45, -15, '---', {
      fontFamily: "'Courier New', monospace",
      fontSize: '12px',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    container.add(nameText);
    
    // Niveau
    const levelText = this.scene.add.text(this.config.slotWidth/2 - 15, -15, '', {
      fontFamily: "'Courier New', monospace",
      fontSize: '11px',
      color: '#FFD700',
      fontWeight: 'bold'
    });
    levelText.setOrigin(1, 0);
    container.add(levelText);
    
    // Barre de HP
    const hpContainer = this.createSlotHPBar(-this.config.slotWidth/2 + 45, 5);
    container.add(hpContainer.container);
    
    // Indicateur de statut
    const statusIndicator = this.scene.add.text(this.config.slotWidth/2 - 15, 15, '', {
      fontSize: '16px',
      fontFamily: "'Segoe UI Emoji', Arial, sans-serif"
    });
    statusIndicator.setOrigin(1, 0);
    container.add(statusIndicator);
    
    // Zone interactive
    const hitArea = this.scene.add.rectangle(0, 0, this.config.slotWidth, this.config.slotHeight, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    // Événements
    hitArea.on('pointerover', () => this.onSlotHover(index, true));
    hitArea.on('pointerout', () => this.onSlotHover(index, false));
    hitArea.on('pointerdown', () => this.onSlotClick(index));
    
    return {
      container,
      bg,
      pokemonIcon,
      nameText,
      levelText,
      hpContainer,
      statusIndicator,
      hitArea,
      index,
      pokemonData: null,
      isEnabled: false,
      isActive: false
    };
  }

  drawSlotBackground(graphics, state, isActive = false) {
    graphics.clear();
    
    let bgColor, borderColor, innerColor;
    
    switch (state) {
      case 'available':
        bgColor = 0x2d5016;
        borderColor = 0x32CD32;
        innerColor = 0x228B22;
        break;
      case 'active':
        bgColor = 0x4169E1;
        borderColor = 0x87CEEB;
        innerColor = 0x6495ED;
        break;
      case 'ko':
        bgColor = 0x8B0000;
        borderColor = 0xFF6347;
        innerColor = 0xDC143C;
        break;
      case 'disabled':
        bgColor = 0x2F4F4F;
        borderColor = 0x696969;
        innerColor = 0x555555;
        break;
      case 'hover':
        bgColor = 0x3CB371;
        borderColor = 0x00FF7F;
        innerColor = 0x90EE90;
        break;
      case 'empty':
      default:
        bgColor = 0x2F2F2F;
        borderColor = 0x5F5F5F;
        innerColor = 0x404040;
        break;
    }
    
    // Fond principal
    graphics.fillStyle(bgColor, 0.9);
    graphics.fillRoundedRect(-this.config.slotWidth/2, -this.config.slotHeight/2, 
                             this.config.slotWidth, this.config.slotHeight, 6);
    
    // Bordure
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(-this.config.slotWidth/2, -this.config.slotHeight/2, 
                               this.config.slotWidth, this.config.slotHeight, 6);
    
    // Bordure intérieure
    graphics.lineStyle(1, innerColor, 0.8);
    graphics.strokeRoundedRect(-this.config.slotWidth/2 + 2, -this.config.slotHeight/2 + 2, 
                               this.config.slotWidth - 4, this.config.slotHeight - 4, 5);
    
    // Effet de brillance si actif
    if (isActive) {
      graphics.fillStyle(0xFFFFFF, 0.15);
      graphics.fillRoundedRect(-this.config.slotWidth/2, -this.config.slotHeight/2, 
                               this.config.slotWidth, this.config.slotHeight/3, 6);
    }
  }

  createSlotHPBar(x, y) {
    const container = this.scene.add.container(x, y);
    
    const bgWidth = 100;
    const bgHeight = 8;
    
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.6);
    background.fillRoundedRect(0, 0, bgWidth, bgHeight, 3);
    background.lineStyle(1, 0x666666, 0.8);
    background.strokeRoundedRect(0, 0, bgWidth, bgHeight, 3);
    
    const hpBar = this.scene.add.graphics();
    
    const hpText = this.scene.add.text(bgWidth + 5, bgHeight/2, '', {
      fontSize: '9px',
      fontFamily: "'Courier New', monospace",
      color: '#FFFFFF'
    });
    hpText.setOrigin(0, 0.5);
    
    container.add([background, hpBar, hpText]);
    
    return {
      container,
      background,
      hpBar,
      hpText,
      bgWidth
    };
  }

  createContextualBackButton() {
    this.backButton = this.scene.add.container(0, this.config.height/2 - 30);
    
    // Background
    const backBg = this.scene.add.graphics();
    backBg.fillStyle(0x8B4513, 1);
    backBg.fillRoundedRect(-60, -15, 120, 30, 8);
    backBg.lineStyle(2, 0xFFD700, 1);
    backBg.strokeRoundedRect(-60, -15, 120, 30, 8);
    this.backButton.add(backBg);
    
    // Texte contextuel
    this.backButtonText = this.scene.add.text(0, 0, 'RETOUR', {
      fontFamily: "'Courier New', monospace",
      fontSize: '12px',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    this.backButtonText.setOrigin(0.5);
    this.backButton.add(this.backButtonText);
    
    // Zone interactive
    const backHitArea = this.scene.add.rectangle(0, 0, 120, 30, 0x000000, 0);
    backHitArea.setInteractive({ useHandCursor: true });
    this.backButton.add(backHitArea);
    
    // Événements
    backHitArea.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(0xA0522D, 1);
      backBg.fillRoundedRect(-60, -15, 120, 30, 8);
      backBg.lineStyle(3, 0x00FF7F, 1);
      backBg.strokeRoundedRect(-60, -15, 120, 30, 8);
    });
    
    backHitArea.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(0x8B4513, 1);
      backBg.fillRoundedRect(-60, -15, 120, 30, 8);
      backBg.lineStyle(2, 0xFFD700, 1);
      backBg.strokeRoundedRect(-60, -15, 120, 30, 8);
    });
    
    backHitArea.on('pointerdown', () => {
      this.handleBackButton();
    });
    
    this.teamContainer.add(this.backButton);
  }

  createTimerDisplay() {
    this.timerContainer = this.scene.add.container(0, -this.config.height/2 + 75);
    this.timerContainer.setVisible(false);
    
    // Background timer
    const timerBg = this.scene.add.graphics();
    timerBg.fillStyle(0xFF0000, 0.8);
    timerBg.fillRoundedRect(-50, -12, 100, 24, 8);
    timerBg.lineStyle(2, 0xFFFFFF, 1);
    timerBg.strokeRoundedRect(-50, -12, 100, 24, 8);
    
    this.timerText = this.scene.add.text(0, 0, '00:30', {
      fontFamily: "'Courier New', monospace",
      fontSize: '14px',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    this.timerText.setOrigin(0.5);
    
    this.timerContainer.add([timerBg, this.timerText]);
    this.teamContainer.add(this.timerContainer);
  }

  // === GESTION DES ÉVÉNEMENTS ===

  onSlotHover(index, isHover) {
    const slot = this.pokemonSlots[index];
    if (!slot.isEnabled) return;
    
    if (isHover) {
      this.drawSlotBackground(slot.bg, slot.isActive ? 'active' : 'hover');
      
      // Animation de scale
      this.scene.tweens.add({
        targets: slot.container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    } else {
      const state = this.getSlotState(slot);
      this.drawSlotBackground(slot.bg, state, slot.isActive);
      
      this.scene.tweens.add({
        targets: slot.container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    }
  }

  onSlotClick(index) {
    const slot = this.pokemonSlots[index];
    
    if (!slot.isEnabled || !slot.pokemonData) {
      console.warn(`⚠️ [PokemonTeamSwitchUI] Slot ${index} non cliquable`);
      return;
    }
    
    if (slot.isActive) {
      console.warn(`⚠️ [PokemonTeamSwitchUI] Pokémon déjà actif`);
      return;
    }
    
    console.log(`🔄 [PokemonTeamSwitchUI] Changement vers slot ${index}`);
    this.performPokemonSwitch(index);
  }

  handleBackButton() {
    if (this.isForcedSwitch) {
      // Ne peut pas annuler un changement forcé
      console.warn('⚠️ [PokemonTeamSwitchUI] Changement forcé - annulation impossible');
      return;
    }
    
    console.log('❌ [PokemonTeamSwitchUI] Annulation changement');
    this.hide();
  }

  // === GESTION RÉSEAU ===

  setupTeamNetworkEvents() {
    if (!this.networkHandler) {
      console.warn('⚠️ [PokemonTeamSwitchUI] NetworkHandler manquant');
      return;
    }

    // ✅ NOUVEAU: Événements Universal Switch
    this.networkHandler.on('battleStart', (data) => {
      console.log('⚔️ [PokemonTeamSwitchUI] Début combat - analyse équipe:', data);
      this.handleUniversalBattleStart(data);
    });

    this.networkHandler.on('actionSelectionStart', (data) => {
      console.log('🎯 [PokemonTeamSwitchUI] Sélection action - switch disponible:', data);
      this.handleActionSelectionStart(data);
    });

    // Événements d'équipe du serveur
    this.networkHandler.on('teamStateUpdate', (data) => {
      console.log('👥 [PokemonTeamSwitchUI] Mise à jour équipe reçue:', data);
      this.handleTeamStateUpdate(data);
    });
    
    this.networkHandler.on('pokemonSwitched', (data) => {
      console.log('🔄 [PokemonTeamSwitchUI] Changement confirmé:', data);
      this.handlePokemonSwitched(data);
    });
    
    this.networkHandler.on('phaseChanged', (data) => {
      if (data.phase === 'forced_switch') {
        console.log('🚨 [PokemonTeamSwitchUI] Changement forcé requis:', data);
        this.handleForcedSwitch(data);
      }
    });

    // ✅ NOUVEAU: Changement forcé spécifique
    this.networkHandler.on('switchRequired', (data) => {
      console.log('🚨 [PokemonTeamSwitchUI] Switch requis après KO:', data);
      this.handleSwitchRequired(data);
    });
    
    this.networkHandler.on('actionQueued', (data) => {
      if (data.actionType === 'switch') {
        console.log('✅ [PokemonTeamSwitchUI] Action switch acceptée');
        this.hide();
      }
    });
    
    this.networkHandler.on('switchError', (data) => {
      console.error('❌ [PokemonTeamSwitchUI] Erreur changement:', data);
      this.handleSwitchError(data);
    });

    console.log('📡 [PokemonTeamSwitchUI] Événements Universal Switch configurés');
  }

  // === ✅ NOUVEAUX HANDLERS UNIVERSAL SWITCH ===

  handleUniversalBattleStart(data) {
    const { gameState, isMultiPokemonBattle, switchingEnabled } = data;
    
    console.log('⚔️ [PokemonTeamSwitchUI] Analyse combat Universal:', {
      isMultiPokemon: isMultiPokemonBattle,
      switchingEnabled: switchingEnabled,
      battleType: gameState?.battleType || 'unknown'
    });

    // Extraire équipe du gameState
    if (gameState?.player1?.team) {
      this.playerTeam = gameState.player1.team.pokemon || [];
      this.activePokemonIndex = gameState.player1.team.activePokemonIndex || 0;
      this.canSwitch = switchingEnabled && isMultiPokemonBattle;
      
      console.log(`✅ [PokemonTeamSwitchUI] Équipe chargée: ${this.playerTeam.length} Pokémon, switch: ${this.canSwitch}`);
    }

    // Notifier BattleScene que le switch est disponible
    if (this.canSwitch && this.playerTeam.length > 1) {
      this.battleScene.events.emit('switchAvailable', {
        enabled: true,
        teamSize: this.playerTeam.length,
        battleType: gameState?.battleType
      });
    }
  }

  handleActionSelectionStart(data) {
    const { canSwitch, availableSwitches, noTimeLimit } = data;
    
    console.log('🎯 [PokemonTeamSwitchUI] Sélection action:', {
      canSwitch,
      availableSwitches: availableSwitches?.length || 0,
      noTimeLimit
    });

    // Mettre à jour état de switch
    this.canSwitch = canSwitch;
    this.availablePokemon = availableSwitches || [];
    this.noTimeLimit = noTimeLimit;

    // Informer BattleScene
    this.battleScene.events.emit('switchStatusUpdate', {
      canSwitch,
      availableCount: this.availablePokemon.length,
      noTimeLimit
    });
  }

  handleSwitchRequired(data) {
    // Nouveau événement pour changement forcé après KO
    if (data.playerRole === 'player1') {
      console.log('🚨 [PokemonTeamSwitchUI] Switch requis:', data);
      
      this.isForcedSwitch = true;
      this.availablePokemon = data.availableOptions || [];
      this.timeLimit = data.timeLimit || 30000;
      
      this.titleText.setText('POKÉMON K.O. !');
      this.titleText.setTint(0xFF0000);
      this.subtitleText.setText('Choisissez un Pokémon de remplacement :');
      
      this.backButton.setVisible(false);
      this.startForcedSwitchTimer();
      
      this.updateTeamDisplay();
      this.show();
    }
  }
    // Mettre à jour les données d'équipe depuis le serveur
    if (data.team && data.team.pokemon) {
      this.playerTeam = data.team.pokemon;
      this.activePokemonIndex = data.team.activePokemonIndex || 0;
      this.canSwitch = data.team.canSwitch !== false;
      
      this.updateTeamDisplay();
    }
  }

  handleForcedSwitch(data) {
    this.isForcedSwitch = true;
    this.availablePokemon = data.forcedSwitch.availablePokemon || [];
    this.timeLimit = data.forcedSwitch.timeLimit || 30000;
    
    // Mise à jour interface pour mode urgence
    this.titleText.setText('CHOIX OBLIGATOIRE');
    this.titleText.setTint(0xFF0000);
    this.subtitleText.setText('Votre Pokémon est K.O. ! Choisissez un remplaçant :');
    
    // Cacher bouton retour en mode forcé
    this.backButton.setVisible(false);
    
    // Démarrer timer
    this.startForcedSwitchTimer();
    
    this.updateTeamDisplay();
    this.show();
  }

  handlePokemonSwitched(data) {
    if (data.playerRole === 'player1') {
      // Mise à jour locale après switch réussi
      this.activePokemonIndex = data.toPokemonIndex;
      this.updateTeamDisplay();
      
      // Fermer l'interface après un délai
      setTimeout(() => {
        this.hide();
      }, 1000);
    }
  }

  handleSwitchError(data) {
    // Afficher l'erreur à l'utilisateur
    this.subtitleText.setText(`Erreur : ${data.error}`);
    this.subtitleText.setTint(0xFF0000);
    
    // Réinitialiser après 2 secondes
    setTimeout(() => {
      this.resetErrorState();
    }, 2000);
  }

  resetErrorState() {
    this.subtitleText.setTint(0xFFFFFF);
    this.updateSubtitleText();
  }

  performPokemonSwitch(targetIndex) {
    if (!this.networkHandler) {
      console.error('❌ [PokemonTeamSwitchUI] NetworkHandler manquant');
      return;
    }
    
    // ✅ Action switch Universal selon nouvelles spécifications
    const switchAction = {
      actionType: "switch",
      fromPokemonIndex: this.activePokemonIndex,
      toPokemonIndex: targetIndex,
      isForced: this.isForcedSwitch,
      battleType: this.getBattleType() // ✅ NOUVEAU: Contexte combat
    };
    
    console.log('📤 [PokemonTeamSwitchUI] Envoi Universal Switch:', switchAction);
    
    // Envoyer via WebSocket selon spécifications serveur
    try {
      if (this.networkHandler.sendToBattle) {
        this.networkHandler.sendToBattle('battleAction', switchAction);
      } else if (this.networkHandler.send) {
        this.networkHandler.send('battleAction', switchAction);
      } else {
        throw new Error('Aucune méthode d\'envoi disponible');
      }
    } catch (error) {
      console.error('❌ [PokemonTeamSwitchUI] Erreur envoi Universal Switch:', error);
      this.handleSwitchError({ error: 'Erreur réseau' });
    }
  }

  getBattleType() {
    // Détecter le type de combat pour le contexte Universal Switch
    if (this.battleScene?.battleState?.battleType) {
      return this.battleScene.battleState.battleType;
    }
    
    // Fallback: deviner selon les données
    if (this.battleScene?.currentOpponentPokemon?.isWild) {
      return 'wild';
    }
    
    return 'trainer'; // Par défaut
  }

  startForcedSwitchTimer() {
    if (this.timeLimitTimer) {
      clearInterval(this.timeLimitTimer);
    }
    
    this.timerContainer.setVisible(true);
    let remainingTime = Math.floor(this.timeLimit / 1000);
    
    this.updateTimerDisplay(remainingTime);
    
    this.timeLimitTimer = setInterval(() => {
      remainingTime--;
      this.updateTimerDisplay(remainingTime);
      
      if (remainingTime <= 0) {
        clearInterval(this.timeLimitTimer);
        this.handleTimerExpired();
      }
    }, 1000);
  }

  updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    
    // Clignotement rouge si critique
    if (seconds <= 10) {
      this.timerText.setTint(seconds % 2 === 0 ? 0xFF0000 : 0xFFFFFF);
    }
  }

  handleTimerExpired() {
    // Auto-sélectionner le premier Pokémon disponible
    const firstAvailable = this.availablePokemon.find(index => 
      this.playerTeam[index] && this.playerTeam[index].currentHp > 0
    );
    
    if (firstAvailable !== undefined) {
      console.log('⏰ [PokemonTeamSwitchUI] Timer expiré - sélection automatique:', firstAvailable);
      this.performPokemonSwitch(firstAvailable);
    } else {
      console.error('💀 [PokemonTeamSwitchUI] Aucun Pokémon disponible - combat perdu');
    }
  }

  // === AFFICHAGE ET MISE À JOUR ===

  updateTeamDisplay() {
    for (let i = 0; i < 6; i++) {
      const slot = this.pokemonSlots[i];
      const pokemon = this.playerTeam[i];
      
      if (pokemon) {
        this.populatePokemonSlot(slot, pokemon, i);
      } else {
        this.clearPokemonSlot(slot);
      }
    }
  }

  populatePokemonSlot(slot, pokemon, index) {
    slot.pokemonData = pokemon;
    slot.isActive = (index === this.activePokemonIndex);
    
    // Déterminer disponibilité
    if (this.isForcedSwitch) {
      slot.isEnabled = this.availablePokemon.includes(index);
    } else {
      slot.isEnabled = pokemon.currentHp > 0 && !slot.isActive;
    }
    
    // Icône Pokémon (emoji ou sprite)
    const pokemonEmoji = this.getPokemonEmoji(pokemon.pokemonId || pokemon.id);
    slot.pokemonIcon.setText(pokemonEmoji);
    
    // Nom
    slot.nameText.setText(pokemon.name.toUpperCase());
    
    // Niveau
    slot.levelText.setText(`N.${pokemon.level}`);
    
    // Barre HP
    this.updateSlotHPBar(slot.hpContainer, pokemon);
    
    // Indicateur statut
    const statusEmoji = this.getStatusEmoji(pokemon.statusCondition || 'normal');
    slot.statusIndicator.setText(statusEmoji);
    
    // Background selon l'état
    const state = this.getSlotState(slot);
    this.drawSlotBackground(slot.bg, state, slot.isActive);
    
    // Interactivité
    slot.hitArea.setInteractive(slot.isEnabled);
    slot.container.setAlpha(slot.isEnabled ? 1 : 0.6);
    
    console.log(`📝 [PokemonTeamSwitchUI] Slot ${index}: ${pokemon.name} (${this.getSlotState(slot)})`);
  }

  clearPokemonSlot(slot) {
    slot.pokemonData = null;
    slot.isEnabled = false;
    slot.isActive = false;
    
    slot.pokemonIcon.setText('❓');
    slot.nameText.setText('---');
    slot.levelText.setText('');
    slot.statusIndicator.setText('');
    
    // Vider barre HP
    slot.hpContainer.hpBar.clear();
    slot.hpContainer.hpText.setText('');
    
    this.drawSlotBackground(slot.bg, 'empty');
    slot.hitArea.setInteractive(false);
    slot.container.setAlpha(0.4);
  }

  updateSlotHPBar(hpContainer, pokemon) {
    const { hpBar, hpText, bgWidth } = hpContainer;
    
    const hpPercent = Math.max(0, Math.min(1, pokemon.currentHp / pokemon.maxHp));
    const barWidth = bgWidth * hpPercent;
    
    // Couleur selon les HP
    let hpColor;
    if (hpPercent > 0.6) hpColor = 0x32CD32;      // Vert
    else if (hpPercent > 0.3) hpColor = 0xFFD700; // Jaune
    else if (hpPercent > 0) hpColor = 0xFF0000;   // Rouge
    else hpColor = 0x666666;                      // Gris (KO)
    
    hpBar.clear();
    if (barWidth > 0) {
      hpBar.fillStyle(hpColor, 0.9);
      hpBar.fillRoundedRect(1, 1, barWidth - 2, 6, 2);
    }
    
    hpText.setText(`${pokemon.currentHp}/${pokemon.maxHp}`);
  }

  getSlotState(slot) {
    if (!slot.pokemonData) return 'empty';
    if (slot.isActive) return 'active';
    if (slot.pokemonData.currentHp <= 0) return 'ko';
    if (!slot.isEnabled) return 'disabled';
    return 'available';
  }

  updateSubtitleText() {
    if (this.isForcedSwitch) {
      this.subtitleText.setText('Votre Pokémon est K.O. ! Choisissez un remplaçant :');
    } else if (this.canSwitch && this.playerTeam.length > 1) {
      const battleType = this.getBattleType();
      if (battleType === 'wild') {
        this.subtitleText.setText('✨ Changement possible même en combat sauvage !');
      } else {
        this.subtitleText.setText('Choisissez le Pokémon à envoyer au combat :');
      }
    } else {
      this.subtitleText.setText('Aucun changement disponible');
    }
  }

  // === ✅ MÉTHODES PUBLIQUES UNIVERSAL SWITCH ===

  /**
   * Affiche le menu de changement Universal (tous types de combat)
   */
  showUniversalSwitch(data = {}) {
    console.log('🆕 [PokemonTeamSwitchUI] Affichage Universal Switch:', data);
    
    this.isForcedSwitch = false;
    this.availablePokemon = data.availableSwitches || [];
    this.timeLimit = null;
    
    // Configuration interface Universal Switch
    const battleType = data.battleType || this.getBattleType();
    
    if (battleType === 'wild') {
      this.titleText.setText('🌟 ÉQUIPE - COMBAT SAUVAGE');
      this.titleText.setTint(0x00FF7F); // Vert pour indiquer la nouveauté
    } else {
      this.titleText.setText('👥 ÉQUIPE - DRESSEUR');
      this.titleText.clearTint();
    }
    
    this.updateSubtitleText();
    this.backButton.setVisible(true);
    this.backButtonText.setText('RETOUR');
    this.timerContainer.setVisible(false);
    
    // Utiliser équipe fournie ou locale
    if (data.playerTeam) {
      this.playerTeam = data.playerTeam;
    }
    if (data.activePokemonIndex !== undefined) {
      this.activePokemonIndex = data.activePokemonIndex;
    }
    if (data.canSwitch !== undefined) {
      this.canSwitch = data.canSwitch;
    }
    
    this.updateTeamDisplay();
    this.show();
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Affiche le menu de changement normal
   */
  showForSwitch(teamData) {
    this.isForcedSwitch = false;
    this.availablePokemon = [];
    this.timeLimit = null;
    
    if (teamData) {
      this.playerTeam = teamData.pokemon || [];
      this.activePokemonIndex = teamData.activePokemonIndex || 0;
      this.canSwitch = teamData.canSwitch !== false;
    }
    
    // Configuration interface normale
    this.titleText.setText('ÉQUIPE POKéMON');
    this.titleText.clearTint();
    this.updateSubtitleText();
    this.backButton.setVisible(true);
    this.backButtonText.setText('RETOUR');
    this.timerContainer.setVisible(false);
    
    this.updateTeamDisplay();
    this.show();
  }

  /**
   * Affiche le menu de changement forcé
   */
  showForForcedSwitch(switchData) {
    this.handleForcedSwitch(switchData);
  }

  show() {
    if (!this.teamContainer) return;
    
    this.teamContainer.setVisible(true);
    this.teamContainer.setAlpha(0);
    this.teamContainer.setScale(0.8);
    this.isVisible = true;
    
    this.scene.tweens.add({
      targets: this.teamContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    console.log('👁️ [PokemonTeamSwitchUI] Interface équipe affichée');
  }

  hide() {
    if (!this.teamContainer) return;
    
    // Nettoyer timer si actif
    if (this.timeLimitTimer) {
      clearInterval(this.timeLimitTimer);
      this.timeLimitTimer = null;
    }
    
    this.scene.tweens.add({
      targets: this.teamContainer,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.teamContainer.setVisible(false);
        this.isVisible = false;
        this.resetState();
      }
    });
    
    console.log('👁️ [PokemonTeamSwitchUI] Interface équipe masquée');
  }

  resetState() {
    this.isForcedSwitch = false;
    this.availablePokemon = [];
    this.timeLimit = null;
    
    this.titleText.clearTint();
    this.subtitleText.clearTint();
  }

  isOpen() {
    return this.isVisible;
  }

  // === UTILITAIRES ===

  getPokemonEmoji(pokemonId) {
    const pokemonEmojis = {
      1: '🌱',   // Bulbasaur
      4: '🔥',   // Charmander  
      7: '💧',   // Squirtle
      25: '⚡',  // Pikachu
      150: '🧠', // Mewtwo
      144: '❄️', // Articuno
      145: '⚡', // Zapdos
      146: '🔥'  // Moltres
    };
    return pokemonEmojis[pokemonId] || '❓';
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'normal': '',
      'poison': '☠️',
      'burn': '🔥',
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵',
      'ko': '💀'
    };
    return statusEmojis[status] || '';
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [PokemonTeamSwitchUI] Destruction...');
    
    // Nettoyer timer
    if (this.timeLimitTimer) {
      clearInterval(this.timeLimitTimer);
    }
    
    // Détruire conteneur principal
    if (this.teamContainer) {
      this.teamContainer.destroy();
      this.teamContainer = null;
    }
    
    // Nettoyer références
    this.pokemonSlots = [];
    this.playerTeam = [];
    this.networkHandler = null;
    
    console.log('✅ [PokemonTeamSwitchUI] Interface équipe détruite');
  }
}

// === INTÉGRATION AVEC BATTLESCENE ===

/**
 * Fonction helper pour intégrer dans BattleScene
 */
export function createPokemonTeamSwitchUI(battleScene, networkHandler) {
  const teamUI = new PokemonTeamSwitchUI(battleScene, networkHandler);
  teamUI.create();
  return teamUI;
}

/**
 * Fonction pour configurer les événements automatiquement
 */
export function setupTeamSwitchEvents(teamUI, battleScene) {
  if (!teamUI || !battleScene) return;
  
  // Intégrer avec les événements BattleScene
  battleScene.events.on('showTeamSelector', (data) => {
    if (data.forced) {
      teamUI.showForForcedSwitch(data);
    } else {
      teamUI.showForSwitch(data.teamData);
    }
  });
  
  battleScene.events.on('hideTeamSelector', () => {
    teamUI.hide();
  });
}

console.log('✅ [PokemonTeamSwitchUI] Système UNIVERSAL SWITCH chargé !');
console.log('🎯 Nouvelles fonctionnalités :');
console.log('   ✅ Combat sauvage multi-Pokémon supporté');
console.log('   ✅ Interface authentique style Game Boy');
console.log('   ✅ Changement normal via menu POKéMON');  
console.log('   ✅ Changement forcé après KO avec timer');
console.log('   ✅ Actions Universal Switch (actionType: "switch")');
console.log('   ✅ Support battleType contexte (wild/trainer)');
console.log('   ✅ Validation côté client (Pokémon KO, actif, etc.)');
console.log('   ✅ Gestion erreurs et timeouts');
console.log('   ✅ Animations et effets visuels');
console.log('🚀 Compatible avec tous types de combat !');

// === ✅ FONCTIONS D'INTÉGRATION UNIVERSAL SWITCH ===

/**
 * ✅ Intégration complète avec BattleScene pour Universal Switch
 */
export function integrateUniversalSwitch(teamUI, battleScene, networkHandler) {
  if (!teamUI || !battleScene || !networkHandler) {
    console.warn('⚠️ [integrateUniversalSwitch] Paramètres manquants');
    return;
  }
  
  console.log('🔗 [integrateUniversalSwitch] Intégration Universal Switch...');
  
  // ✅ Événement battleStart - analyser si Universal Switch disponible
  networkHandler.on('battleStart', (data) => {
    if (data.isMultiPokemonBattle && data.switchingEnabled) {
      console.log('🆕 Combat Universal Switch détecté !', data.gameState?.battleType);
      
      // Notifier BattleScene que le switch est disponible
      battleScene.events.emit('universalSwitchEnabled', {
        battleType: data.gameState?.battleType,
        teamSize: data.gameState?.player1?.team?.pokemon?.length || 0
      });
    }
  });
  
  // ✅ Événement actionSelectionStart - vérifier canSwitch
  networkHandler.on('actionSelectionStart', (data) => {
    if (data.canSwitch && data.availableSwitches?.length > 0) {
      console.log('🎯 Switch disponible ce tour !', {
        available: data.availableSwitches.length,
        noTimeLimit: data.noTimeLimit
      });
      
      // Activer bouton switch dans BattleScene
      battleScene.events.emit('enableSwitchButton', {
        availableCount: data.availableSwitches.length,
        noTimeLimit: data.noTimeLimit
      });
    } else {
      // Désactiver bouton switch
      battleScene.events.emit('disableSwitchButton');
    }
  });
  
  console.log('✅ [integrateUniversalSwitch] Intégration terminée');
}
