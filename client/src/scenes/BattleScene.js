// Autres événements
    this.battleNetworkHandler.on('battleJoined', (data) => {
      console.log('⚔️ [BattleScene] Battle joined, rôle:', data.yourRole);
      this.playerRole = data.yourRole;
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      console.log('🚀 [BattleScene] Battle start:', data);
      this.handleNetworkBattleStart(data);
    });// client/src/scenes/BattleScene.js - VERSION NETTOYÉE SANS DOUBLONS

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers essentiels
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.playerRole = null; // 'player1' ou 'player2'
    
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    
    // Sprites Pokémon
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // Interface moderne
    this.modernHealthBars = { player: null, opponent: null };
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    
    // Données Pokémon actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    
    // Positions optimisées
    this.pokemonPositions = {
      player: { x: 0.22, y: 0.75 },
      opponent: { x: 0.78, y: 0.35 },
      playerPlatform: { x: 0.25, y: 0.85 },
      opponentPlatform: { x: 0.75, y: 0.45 }
    };
    
    // Interface state
    this.interfaceMode = 'hidden'; // 'hidden', 'message', 'buttons'
    this.messageTimer = null;
    
    // ✅ NOUVEAU: Gestionnaire de timing anti-chevauchement
    this.timingManager = {
      isDisplayingEvents: false,
      eventQueue: [],
      currentEventEndTime: 0,
      playerTurnPending: false
    };
    
    console.log('⚔️ [BattleScene] Initialisé avec timing manager');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('[BattleScene] 🔧 Initialisation avec:', data);
    
    this.gameManager = data.gameManager || 
      this.scene.get('GameScene')?.gameManager || 
      window.pokemonUISystem?.gameManager || 
      window.gameManager;

    this.battleNetworkHandler = data.battleNetworkHandler || 
      window.battleSystem?.battleConnection?.networkHandler || 
      window.globalNetworkManager?.battleNetworkHandler;

    if (!this.battleNetworkHandler) {
      console.warn('[BattleScene] ⚠️ BattleNetworkHandler manquant');
    }

    if (!this.gameManager) {
      console.warn('[BattleScene] ⚠️ GameManager manquant');
    }
    
    // Déclencher combat automatique si battleData fournie
    if (data.battleData) {
      console.log('[BattleScene] 🎯 Déclenchement automatique...');
      this.events.once('create', () => {
        this.startBattle(data.battleData);
      });
    }
  }

  preload() {
    console.log('[BattleScene] 📁 Préchargement...');
    
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    this.loadPokemonSpritesheets();
  }

  create() {
    console.log('[BattleScene] 🎨 Création...');

    // Masquer par défaut
    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      this.createBattleEnvironment();
      this.createPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      this.createModernHealthBars();
      this.createModernActionInterface();
      this.createBattleDialog();
      this.setupBattleNetworkEvents();
      
      this.isActive = true;
      this.isReadyForActivation = true;
      
      console.log('[BattleScene] ✅ Création terminée');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur création:', error);
    }
  }

  // === ENVIRONNEMENT ===

  createBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
    // Background
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.1;
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      this.battleBackground.setTint(0xf0f8ff);
    } else {
      this.createGradientBackground(width, height);
    }
    
    // Sol simple
    const groundY = height * 0.75;
    const ground = this.add.graphics();
    ground.fillStyle(0x87CEEB, 0.1);
    ground.fillRect(0, groundY, width, height - groundY);
    ground.lineStyle(1, 0x2F4F2F, 0.2);
    ground.lineBetween(0, groundY, width, groundY);
    ground.setDepth(-60);
  }

  createGradientBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x98FB98, 0x228B22);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    this.battleBackground = bg;
  }

  createPokemonPlatforms() {
    const { width, height } = this.cameras.main;
    
    // Plateforme joueur
    this.createPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      120, 'player'
    );
    
    // Plateforme adversaire
    this.createPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      80, 'opponent'
    );
  }

  createPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    
    // Ombre
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 5, y + 5, size, size * 0.3);
    
    // Plateforme
    platform.fillStyle(type === 'player' ? 0x8B4513 : 0x696969, 0.7);
    platform.fillEllipse(x, y, size, size * 0.3);
    
    // Bordure
    platform.lineStyle(2, type === 'player' ? 0x654321 : 0x555555, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.3);
    
    platform.setDepth(type === 'player' ? 10 : 5);
  }

  // === BARRES DE VIE ===

  createModernHealthBars() {
    const { width, height } = this.cameras.main;
    
    // Barre adversaire (à gauche)
    this.createModernHealthBar('opponent', {
      x: width * 0.05,
      y: height * 0.15,
      width: 280,
      height: 80
    });
    
    // Barre joueur (en bas à gauche)
    this.createModernHealthBar('player', {
      x: width * 0.05,
      y: height * 0.75,
      width: 320,
      height: 100
    });
  }

  createModernHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    
    // Background
    const bgPanel = this.add.graphics();
    bgPanel.fillStyle(0x000000, 0.7);
    bgPanel.fillRoundedRect(0, 0, config.width, config.height, 12);
    bgPanel.lineStyle(3, type === 'player' ? 0x4A90E2 : 0xE74C3C, 1);
    bgPanel.strokeRoundedRect(0, 0, config.width, config.height, 12);
    
    // Nom Pokémon
    const nameText = this.add.text(15, 15, type === 'player' ? 'Votre Pokémon' : 'Pokémon Adversaire', {
      fontSize: type === 'player' ? '18px' : '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    
    // Niveau
    const levelText = this.add.text(config.width - 60, 15, 'Niv. --', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold'
    });
    
    // Barre HP background
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x333333, 1);
    hpBarBg.fillRoundedRect(15, config.height - 35, config.width - 30, 12, 6);
    
    // Barre HP
    const hpBar = this.add.graphics();
    this.updateHealthBarVisual(hpBar, config.width - 30, 1.0);
    hpBar.x = 15;
    hpBar.y = config.height - 35;
    
    // Texte HP (joueur seulement)
    let hpText = null;
    if (type === 'player') {
      hpText = this.add.text(config.width - 100, config.height - 55, '--/--', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold'
      });
    }
    
    // Barre EXP (joueur seulement)
    let expBar = null;
    if (type === 'player') {
      const expBarBg = this.add.graphics();
      expBarBg.fillStyle(0x444444, 1);
      expBarBg.fillRoundedRect(15, config.height - 20, config.width - 30, 8, 4);
      
      expBar = this.add.graphics();
      expBar.fillStyle(0xFFD700, 1);
      expBar.fillRoundedRect(0, 0, 0, 8, 4);
      expBar.x = 15;
      expBar.y = config.height - 20;
      
      container.add([expBarBg, expBar]);
    }
    
    container.add([bgPanel, nameText, levelText, hpBarBg, hpBar]);
    if (hpText) container.add(hpText);
    
    container.setDepth(100);
    container.setVisible(false);
    
    this.modernHealthBars[type] = {
      container, nameText, levelText, hpBar, hpText, expBar, config
    };
  }

  updateHealthBarVisual(graphics, maxWidth, hpPercentage) {
    graphics.clear();
    
    let color = 0x4CAF50; // Vert
    if (hpPercentage < 0.5) color = 0xFF9800; // Orange
    if (hpPercentage < 0.2) color = 0xF44336; // Rouge
    
    const width = Math.max(0, maxWidth * hpPercentage);
    
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, 12, 6);
    
    // Brillance
    graphics.fillStyle(0xFFFFFF, 0.3);
    graphics.fillRoundedRect(0, 2, width, 4, 2);
  }

  updateModernHealthBar(type, pokemonData) {
    const healthBar = this.modernHealthBars[type];
    if (!healthBar) {
      console.error('[BattleScene] ❌ Barre de vie non trouvée:', type);
      return;
    }
    
    // Protection HP
    if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
      console.warn(`[BattleScene] ⚠️ HP manquants pour ${type}`);
      return;
    }
    
    // Mise à jour infos
    healthBar.nameText.setText(pokemonData.name || 'Pokémon');
    healthBar.levelText.setText(`Niv. ${pokemonData.level || 1}`);
    
    // Calcul pourcentage
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    // Animation barre
    this.animateHealthBar(healthBar.hpBar, healthBar.config.width - 30, hpPercentage);
    
    // Texte HP joueur
    if (type === 'player' && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    // Barre EXP joueur
    if (type === 'player' && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateExpBar(healthBar.expBar, healthBar.config.width - 30, expPercentage);
    }
    
    // Affichage avec animation
    healthBar.container.setVisible(true);
    healthBar.container.setAlpha(0);
    this.tweens.add({
      targets: healthBar.container,
      alpha: 1,
      duration: 500,
      ease: 'Power2.easeOut'
    });
  }

  animateHealthBar(graphics, maxWidth, targetPercentage) {
    let currentPercentage = graphics.currentPercentage || 1;
    graphics.currentPercentage = targetPercentage;
    
    this.tweens.add({
      targets: { value: currentPercentage },
      value: targetPercentage,
      duration: 800,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        this.updateHealthBarVisual(graphics, maxWidth, percentage);
      }
    });
  }

  animateExpBar(graphics, maxWidth, targetPercentage) {
    const width = Math.max(0, maxWidth * targetPercentage);
    graphics.clear();
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillRoundedRect(0, 0, width, 8, 4);
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillRoundedRect(0, 1, width, 3, 2);
  }

  // === INTERFACE D'ACTIONS ===

  createModernActionInterface() {
    const { width, height } = this.cameras.main;
    
    // Conteneur à droite
    this.actionInterface = this.add.container(width - 420, height - 180);
    
    // Panel principal
    const mainPanel = this.add.graphics();
    mainPanel.fillStyle(0x1a1a1a, 0.95);
    mainPanel.fillRoundedRect(20, 0, 380, 160, 16);
    mainPanel.lineStyle(4, 0x4A90E2, 1);
    mainPanel.strokeRoundedRect(20, 0, 380, 160, 16);
    this.actionInterface.add(mainPanel);
    
    // Zone de texte unifiée
    this.actionMessageText = this.add.text(200, 80, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: 340 }
    });
    this.actionMessageText.setOrigin(0.5, 0.5);
    this.actionMessageText.setVisible(false);
    this.actionInterface.add(this.actionMessageText);
    
    // Créer boutons
    this.createActionButtons();
    
    this.actionInterface.setDepth(200);
    this.actionInterface.setVisible(false);
  }

  createActionButtons() {
    const actions = [
      { key: 'attack', text: 'Attaque', color: 0xE74C3C, icon: '⚔️' },
      { key: 'bag', text: 'Sac', color: 0x9B59B6, icon: '🎒' },
      { key: 'pokemon', text: 'Pokémon', color: 0x3498DB, icon: '🔄' },
      { key: 'run', text: 'Fuite', color: 0x95A5A6, icon: '🏃' }
    ];
    
    const startX = 40;
    const startY = 40;
    const buttonWidth = 160;
    const buttonHeight = 50;
    const gap = 15;
    
    actions.forEach((action, index) => {
      const x = startX + (index % 2) * (buttonWidth + gap);
      const y = startY + Math.floor(index / 2) * (buttonHeight + 15);
      
      const button = this.createModernButton(x, y, { width: buttonWidth, height: buttonHeight }, action);
      this.actionInterface.add(button);
    });
  }

  createModernButton(x, y, config, action) {
    const buttonContainer = this.add.container(x, y);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(action.color, 0.8);
    bg.fillRoundedRect(0, 0, config.width, config.height, 12);
    bg.lineStyle(2, 0xFFFFFF, 0.8);
    bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
    
    // Icône
    const icon = this.add.text(20, config.height/2, action.icon, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    });
    icon.setOrigin(0, 0.5);
    
    // Texte
    const text = this.add.text(55, config.height/2, action.text, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    text.setOrigin(0, 0.5);
    
    buttonContainer.add([bg, icon, text]);
    buttonContainer.setSize(config.width, config.height);
    buttonContainer.setInteractive();
    
    // Effets hover
    buttonContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(action.color, 1);
      bg.fillRoundedRect(0, 0, config.width, config.height, 12);
      bg.lineStyle(3, 0xFFD700, 1);
      bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100
      });
    });
    
    buttonContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(action.color, 0.8);
      bg.fillRoundedRect(0, 0, config.width, config.height, 12);
      bg.lineStyle(2, 0xFFFFFF, 0.8);
      bg.strokeRoundedRect(0, 0, config.width, config.height, 12);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1, scaleY: 1,
        duration: 100
      });
    });
    
    // Action clic
    buttonContainer.on('pointerdown', () => {
      this.handleActionButton(action.key);
    });
    
    return buttonContainer;
  }

  handleActionButton(actionKey) {
    console.log('[BattleScene] 🎯 Action:', actionKey);
    
    this.hideActionButtons();
    
    switch (actionKey) {
      case 'attack':
        this.showAttackMenu();
        break;
      case 'bag':
        this.showActionMessage('Ouverture du sac...', 2000);
        setTimeout(() => this.showActionButtons(), 2000);
        break;
      case 'pokemon':
        this.showActionMessage('Changement de Pokémon indisponible.', 2000);
        setTimeout(() => this.showActionButtons(), 2000);
        break;
      case 'run':
        this.showActionMessage('Tentative de fuite...', 2000);
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.attemptRun();
        }
        break;
    }
  }

  showAttackMenu() {
    this.showActionMessage('Sélectionnez une attaque...', 2000);
    
    // Utiliser première attaque par défaut
    setTimeout(() => {
      this.executePlayerAction({
        type: 'move',
        moveId: 'tackle',
        moveName: 'Charge'
      });
    }, 1000);
  }

  executePlayerAction(actionData) {
    if (actionData.type === 'move') {
      this.hideActionButtons();
      this.showActionMessage(`${this.currentPlayerPokemon?.name} utilise ${actionData.moveName}!`);
      
      setTimeout(() => {
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.useMove(actionData.moveId);
        }
        this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      }, 1000);
    }
  }

  // === AFFICHAGE POKÉMON ===

  async displayPlayerPokemon(pokemonData) {
    if (!pokemonData) return;
    
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    try {
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'back');
      const { width, height } = this.cameras.main;
      const x = width * this.pokemonPositions.player.x;
      const y = height * this.pokemonPositions.player.y;
      
      this.playerPokemonSprite = this.add.sprite(x, y, spriteKey, 0);
      this.playerPokemonSprite.setScale(3.5);
      this.playerPokemonSprite.setDepth(25);
      this.playerPokemonSprite.setOrigin(0.5, 1);
      
      this.animatePokemonEntry(this.playerPokemonSprite, 'left');
      this.currentPlayerPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player', pokemonData);
      }, 500);
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur Pokémon joueur:', error);
      this.createPokemonPlaceholder('player', pokemonData);
    }
  }

  async displayOpponentPokemon(pokemonData) {
    if (!pokemonData) return;
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    try {
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'front');
      const { width, height } = this.cameras.main;
      const x = width * this.pokemonPositions.opponent.x;
      const y = height * this.pokemonPositions.opponent.y;
      
      this.opponentPokemonSprite = this.add.sprite(x, y, spriteKey, 0);
      this.opponentPokemonSprite.setScale(2.8);
      this.opponentPokemonSprite.setDepth(20);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      this.animatePokemonEntry(this.opponentPokemonSprite, 'right');
      
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentPokemonSprite);
      }
      
      this.currentOpponentPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('opponent', pokemonData);
      }, 800);
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur Pokémon adversaire:', error);
      this.createPokemonPlaceholder('opponent', pokemonData);
    }
  }

  animatePokemonEntry(sprite, direction) {
    if (!sprite) return;
    
    const targetX = sprite.x;
    const targetY = sprite.y;
    const targetScale = sprite.scaleX;
    const { width } = this.cameras.main;
    const startX = direction === 'left' ? -150 : width + 150;
    
    sprite.setPosition(startX, targetY + 50);
    sprite.setScale(targetScale * 0.3);
    sprite.setAlpha(0);
    
    this.tweens.add({
      targets: sprite,
      x: targetX, y: targetY,
      alpha: 1,
      scaleX: targetScale, scaleY: targetScale,
      duration: 1000,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.addIdleAnimation(sprite, targetY);
      }
    });
  }

  addIdleAnimation(sprite, baseY) {
    this.tweens.add({
      targets: sprite,
      y: baseY - 8,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  addShinyEffect(sprite) {
    if (!sprite) return;
    
    this.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  createPokemonPlaceholder(type, pokemonData) {
    const { width, height } = this.cameras.main;
    const position = type === 'player' ? 
      { x: width * this.pokemonPositions.player.x, y: height * this.pokemonPositions.player.y } :
      { x: width * this.pokemonPositions.opponent.x, y: height * this.pokemonPositions.opponent.y };
    
    const container = this.add.container(position.x, position.y);
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    const body = this.add.graphics();
    body.fillStyle(typeColor, 0.8);
    body.fillCircle(0, 0, 40);
    body.lineStyle(3, 0xFFFFFF, 0.8);
    body.strokeCircle(0, 0, 40);
    
    const nameText = this.add.text(0, 15, pokemonData.name || 'Pokémon', {
      fontSize: '12px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    nameText.setOrigin(0.5);
    
    container.add([body, nameText]);
    container.setScale(type === 'player' ? 1.5 : 1.2);
    container.setDepth(type === 'player' ? 25 : 20);
    
    this.animatePokemonEntry(container, type === 'player' ? 'left' : 'right');
    
    if (type === 'player') {
      this.playerPokemonSprite = container;
    } else {
      this.opponentPokemonSprite = container;
    }
  }

  getTypeColor(type) {
    const colors = {
      'normal': 0xA8A878, 'fire': 0xFF4444, 'water': 0x4488FF,
      'electric': 0xFFDD00, 'grass': 0x44DD44, 'ice': 0x88DDFF,
      'fighting': 0xCC2222, 'poison': 0xAA44AA, 'ground': 0xDDCC44,
      'flying': 0xAABBFF, 'psychic': 0xFF4488, 'bug': 0xAABB22,
      'rock': 0xBBAA44, 'ghost': 0x7755AA, 'dragon': 0x7744FF,
      'dark': 0x775544, 'steel': 0xAAAAAAA, 'fairy': 0xFFAAEE
    };
    return colors[type.toLowerCase()] || 0xFFFFFF;
  }

  // === DIALOGUE ===

  createBattleDialog() {
    const { width, height } = this.cameras.main;
    this.battleDialog = this.add.container(0, height - 100);
    
    const dialogPanel = this.add.graphics();
    dialogPanel.fillStyle(0x000000, 0.9);
    dialogPanel.fillRoundedRect(20, 0, width - 40, 80, 12);
    dialogPanel.lineStyle(3, 0xFFFFFF, 0.8);
    dialogPanel.strokeRoundedRect(20, 0, width - 40, 80, 12);
    
    this.dialogText = this.add.text(40, 40, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      wordWrap: { width: width - 80 }
    });
    this.dialogText.setOrigin(0, 0.5);
    
    this.battleDialog.add([dialogPanel, this.dialogText]);
    this.battleDialog.setDepth(150);
    this.battleDialog.setVisible(false);
  }

  showBattleMessage(message, duration = 3000) {
    if (!this.battleDialog || !this.dialogText) return;
    
    this.dialogText.setText(message);
    this.battleDialog.setVisible(true);
    this.battleDialog.setAlpha(0);
    
    this.tweens.add({
      targets: this.battleDialog,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
    
    if (duration > 0) {
      setTimeout(() => {
        this.hideBattleMessage();
      }, duration);
    }
  }

  hideBattleMessage() {
    if (!this.battleDialog) return;
    
    this.tweens.add({
      targets: this.battleDialog,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.battleDialog.setVisible(false);
      }
    });
  }

  // === INTERFACE STATE MANAGEMENT ===

  showActionMessage(message, duration = 0) {
    if (!this.actionInterface || !this.actionMessageText) return;
    
    // Annuler timer précédent
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    
    this.hideActionButtons();
    this.actionMessageText.setText(message);
    this.actionMessageText.setVisible(true);
    
    if (!this.actionInterface.visible) {
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(0);
      this.tweens.add({
        targets: this.actionInterface,
        alpha: 1,
        duration: 400,
        ease: 'Power2.easeOut'
      });
    }
    
    this.interfaceMode = 'message';
    
    if (duration > 0) {
      this.messageTimer = setTimeout(() => {
        this.hideActionMessage();
      }, duration);
    }
  }

  hideActionMessage() {
    if (!this.actionMessageText) return;
    this.actionMessageText.setVisible(false);
    this.interfaceMode = 'hidden';
  }

  showActionButtons() {
    this.hideActionMessage();
    
    if (this.actionInterface) {
      this.actionInterface.list.forEach(child => {
        if (child !== this.actionInterface.list[0] && child !== this.actionMessageText) {
          child.setVisible(true);
        }
      });
      
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(1);
    }
    
    this.interfaceMode = 'buttons';
  }

  hideActionButtons() {
    if (!this.actionInterface) return;
    
    this.actionInterface.list.forEach(child => {
      if (child !== this.actionInterface.list[0] && child !== this.actionMessageText) {
        child.setVisible(false);
      }
    });
  }

  // === EFFETS VISUELS ===

  createAttackEffect(attacker, target) {
    if (!attacker || !target) return;
    
    const originalX = attacker.x;
    
    this.tweens.add({
      targets: attacker,
      x: originalX + (target.x > attacker.x ? 50 : -50),
      duration: 200,
      ease: 'Power2.easeOut',
      yoyo: true,
      onYoyo: () => {
        this.createImpactEffect(target.x, target.y);
        this.tweens.add({
          targets: target,
          x: target.x + 10,
          duration: 50,
          yoyo: true,
          repeat: 3
        });
      }
    });
  }

  createImpactEffect(x, y) {
    const impact = this.add.graphics();
    impact.setPosition(x, y);
    impact.setDepth(40);
    impact.fillStyle(0xFFFFFF, 0.8);
    impact.fillCircle(0, 0, 5);
    
    this.tweens.add({
      targets: impact,
      scaleX: 3, scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => impact.destroy()
    });
  }

  createDamageEffect(sprite, damage) {
    if (!sprite) return;
    
    const damageText = this.add.text(sprite.x, sprite.y - 50, `-${damage}`, {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FF4444',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 2
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(50);
    
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => damageText.destroy()
    });
    
    // Shake sprite
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 8,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => sprite.setX(originalX)
    });
  }

  // === CHARGEMENT SPRITES ===

  async loadPokemonSpritesheets() {
    if (!this.cache.json.has('pokemonSpriteConfig')) {
      this.load.json('pokemonSpriteConfig', 'assets/pokemon/PokemonSpriteConfig.json');
      this.load.start();
      
      await new Promise(resolve => {
        this.load.once('complete', resolve);
      });
    }
    
    pokemonSpriteConfig = this.cache.json.get('pokemonSpriteConfig');
  }

  async loadPokemonSprite(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId.toString().padStart(3, '0')}_${view}`;
    
    if (this.textures.exists(spriteKey)) {
      return spriteKey;
    }
    
    try {
      if (!pokemonSpriteConfig) {
        await this.loadPokemonSpritesheets();
      }
      
      const config = pokemonSpriteConfig[pokemonId] || pokemonSpriteConfig.default;
      const paddedId = pokemonId.toString().padStart(3, '0');
      const imagePath = `assets/pokemon/${paddedId}/${view}.png`;
      
      this.load.spritesheet(spriteKey, imagePath, {
        frameWidth: config.spriteWidth,
        frameHeight: config.spriteHeight
      });
      
      await new Promise((resolve, reject) => {
        this.load.once('complete', resolve);
        this.load.once('loaderror', reject);
        this.load.start();
      });
      
      return this.textures.exists(spriteKey) ? spriteKey : this.createFallbackSprite(view);
      
    } catch (error) {
      console.error(`[BattleScene] ❌ Erreur chargement ${spriteKey}:`, error);
      return this.createFallbackSprite(view);
    }
  }

  createFallbackSprite(view) {
    const fallbackKey = `pokemon_placeholder_${view}`;
    
    if (!this.textures.exists(fallbackKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#4A90E2' : '#7ED321');
      gradient.addColorStop(1, view === 'front' ? '#2E5BBA' : '#5BA818');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('?', 48, 58);
      
      this.textures.addCanvas(fallbackKey, canvas);
    }
    
    return fallbackKey;
  }

  // === ÉVÉNEMENTS RÉSEAU ===

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    // Action result avec timing anti-chevauchement
    this.battleNetworkHandler.on('actionResult', (data) => {
      console.log('🎮 [BattleScene] actionResult reçu:', data);
      
      if (data.success && data.gameState) {
        // Synchroniser HP
        if (data.gameState.player1?.pokemon && this.currentPlayerPokemon) {
          this.currentPlayerPokemon.currentHp = data.gameState.player1.pokemon.currentHp;
          this.currentPlayerPokemon.maxHp = data.gameState.player1.pokemon.maxHp;
          setTimeout(() => {
            this.updateModernHealthBar('player', this.currentPlayerPokemon);
          }, 500);
        }
        
        if (data.gameState.player2?.pokemon && this.currentOpponentPokemon) {
          this.currentOpponentPokemon.currentHp = data.gameState.player2.pokemon.currentHp;
          this.currentOpponentPokemon.maxHp = data.gameState.player2.pokemon.maxHp;
          setTimeout(() => {
            this.updateModernHealthBar('opponent', this.currentOpponentPokemon);
          }, 500);
        }
        
        // ✅ NOUVEAU: Afficher événements avec anti-chevauchement
        if (data.events && data.events.length > 0) {
          this.displayBattleEventsWithAntiOverlap(data.events);
        }
      }
      
      if (!data.success) {
        this.showActionMessage(`Erreur: ${data.error}`, 2000);
      }
    });
    
    // Début narratif
    this.battleNetworkHandler.on('narrativeStart', (data) => {
      if (this.scene.isSleeping()) {
        this.scene.wake();
      }
      this.scene.setVisible(true);
      this.scene.bringToTop();
      
      if (data.playerPokemon) {
        this.displayPlayerPokemon(data.playerPokemon);
      }
      
      if (data.opponentPokemon) {
        this.displayOpponentPokemon(data.opponentPokemon);
      }
      
      this.showActionMessage(data.events[0] || 'Un Pokémon sauvage apparaît !');
      this.activateBattleUI();
      this.isVisible = true;
    });
    
    // Fin narratif
    this.battleNetworkHandler.on('narrativeEnd', (data) => {
      this.showActionMessage(data.message || 'Le combat commence !');
    });
    
    // IA réfléchit
    this.battleNetworkHandler.on('aiThinking', (data) => {
      this.hideActionButtons();
      this.showActionMessage(data.message || "L'adversaire réfléchit...");
    });
    
    // Tour changé avec gestion anti-chevauchement
    this.battleNetworkHandler.on('turnChanged', (data) => {
      console.log('🔄 [BattleScene] turnChanged reçu:', data.currentTurn);
      
      if (data.currentTurn === 'player1') {
        console.log('👤 [BattleScene] Tour joueur détecté');
        // ✅ NE PAS afficher immédiatement - attendre yourTurn
      } else if (data.currentTurn === 'player2') {
        console.log('🤖 [BattleScene] Tour IA');
        this.hideActionButtons();
      } else if (data.currentTurn === 'narrator') {
        console.log('📖 [BattleScene] Mode narrateur');
        this.hideActionButtons();
      }
    });
    
    // Fin de combat
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.hideActionButtons();
      const message = data.winner === 'player1' ? 
        '🎉 Victoire ! Vous avez gagné !' : 
        '💀 Défaite... Vous avez perdu !';
      this.showActionMessage(message, 5000);
      setTimeout(() => {
        this.endBattle(data);
      }, 5000);
    });
    
    // Tour du joueur avec anti-chevauchement
    this.battleNetworkHandler.on('yourTurn', (data) => {
      console.log('🎯 [BattleScene] yourTurn reçu - VÉRIFICATION TIMING:', data);
      
      // ✅ VÉRIFIER si des événements sont en cours
      if (this.timingManager.isDisplayingEvents) {
        console.log('⏳ [BattleScene] Événements en cours, tour joueur EN ATTENTE...');
        
        // ✅ MARQUER le tour comme en attente
        this.timingManager.playerTurnPending = true;
        
        // ✅ CALCULER le délai restant
        const now = Date.now();
        const remainingTime = Math.max(0, this.timingManager.currentEventEndTime - now);
        
        console.log(`⏰ [BattleScene] Délai restant: ${remainingTime}ms`);
        
        if (remainingTime > 0) {
          // ✅ ATTENDRE que les événements se terminent
          setTimeout(() => {
            if (this.timingManager.playerTurnPending) {
              console.log('🎯 [BattleScene] Affichage tour joueur APRÈS événements');
              this.timingManager.playerTurnPending = false;
              this.showActionButtons();
            }
          }, remainingTime + 200); // +200ms de marge
        }
      } else {
        // ✅ Aucun événement en cours, afficher immédiatement
        console.log('🎯 [BattleScene] Aucun événement en cours, affichage IMMÉDIAT');
        setTimeout(() => {
          this.showActionButtons();
        }, 500);
      }
    });
  }

  // === TIMING ANTI-CHEVAUCHEMENT ===

  displayBattleEventsWithAntiOverlap(events) {
    console.log('📝 [BattleScene] Affichage événements ANTI-CHEVAUCHEMENT:', events);
    
    // ✅ MARQUER qu'on affiche des événements
    this.timingManager.isDisplayingEvents = true;
    
    let currentDelay = 0;
    
    events.forEach((event, index) => {
      const duration = this.getMessageDuration(event);
      
      setTimeout(() => {
        console.log(`💬 [${index + 1}/${events.length}] "${event}" (${duration}ms)`);
        this.showActionMessage(event, duration);
        
        // ✅ Si c'est le dernier message
        if (index === events.length - 1) {
          // ✅ CALCULER le temps de fin TOTAL
          const endTime = Date.now() + duration + 500; // +500ms de marge
          this.timingManager.currentEventEndTime = endTime;
          
          setTimeout(() => {
            console.log('✅ [BattleScene] Tous les événements terminés');
            this.timingManager.isDisplayingEvents = false;
            
            // ✅ Si un tour joueur est en attente, l'afficher maintenant
            if (this.timingManager.playerTurnPending) {
              console.log('🎯 [BattleScene] Affichage du tour joueur en attente');
              this.timingManager.playerTurnPending = false;
              this.showActionButtons();
            }
          }, duration + 500);
        }
        
      }, currentDelay);
      
      currentDelay += duration + 300; // +300ms entre messages
    });
    
    console.log(`⏱️ [BattleScene] Durée totale prévue: ${currentDelay}ms`);
  }

  getMessageDuration(message) {
    const text = message.toLowerCase();
    
    if (text.includes('utilise') || text.includes('attaque')) return 2000;
    if (text.includes('perd') && text.includes('hp')) return 2500;
    if (text.includes('k.o') || text.includes('est mis')) return 3000;
    if (text.includes('efficace')) return 2200;
    if (text.includes('critique')) return 1800;
    if (text.includes('rate') || text.includes('échoue')) return 2000;
    
    const baseTime = Math.max(1500, message.length * 80);
    return Math.min(baseTime, 4000);
  }

  // === HANDLERS RÉSEAU ===

  handleNetworkBattleStart(data) {
    // Vérifier mode narratif
    if (data.isNarrative || data.duration) {
      return; // narrativeStart va gérer
    }
    
    const playerPokemon = data.playerPokemon;
    const opponentPokemon = data.opponentPokemon;
    
    if (playerPokemon) {
      this.displayPlayerPokemon(playerPokemon);
    }
    
    if (opponentPokemon) {
      this.displayOpponentPokemon(opponentPokemon);
    }
    
    this.activateBattleUI();
    this.isVisible = true;
    this.startBattleIntroSequence(opponentPokemon);
  }

  startBattleIntroSequence(opponentPokemon) {
    const opponentName = opponentPokemon?.name || 'Pokémon sauvage';
    
    setTimeout(() => {
      this.showActionMessage(`Un ${opponentName} sauvage apparaît !`);
    }, 2000);
    
    setTimeout(() => {
      this.hideActionMessage();
      this.showActionButtons();
    }, 5000);
  }

  // === UI MANAGEMENT ===

  activateBattleUI() {
    if (window.pokemonUISystem?.setGameState) {
      try {
        this.previousUIState = {
          gameState: window.pokemonUISystem.setGameState.currentGameState || 'exploration',
          timestamp: Date.now()
        };
        
        return window.pokemonUISystem.setGameState('battle', {
          animated: true,
          force: true
        });
      } catch (error) {
        console.error('[BattleScene] ❌ Erreur UIManager:', error);
        return this.fallbackHideUI();
      }
    }
    
    return this.fallbackHideUI();
  }

  deactivateBattleUI() {
    if (window.pokemonUISystem?.setGameState && this.previousUIState) {
      try {
        const targetState = this.previousUIState.gameState || 'exploration';
        const success = window.pokemonUISystem.setGameState(targetState, {
          animated: true
        });
        
        if (success) {
          this.previousUIState = null;
          return true;
        }
      } catch (error) {
        console.error('[BattleScene] ❌ Erreur restauration UIManager:', error);
      }
    }
    
    return this.fallbackRestoreUI();
  }

  fallbackHideUI() {
    const elementsToHide = [
      '#inventory-icon', '#team-icon', '#quest-icon', 
      '#questTracker', '#quest-tracker', '#chat',
      '.ui-icon', '.game-icon', '.quest-tracker'
    ];
    
    let hiddenCount = 0;
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (window.getComputedStyle(el).display !== 'none') {
          el.style.display = 'none';
          el.setAttribute('data-battle-hidden', 'true');
          hiddenCount++;
        }
      });
    });
    
    return hiddenCount > 0;
  }

  fallbackRestoreUI() {
    const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
    let restoredCount = 0;
    
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden');
      restoredCount++;
    });
    
    return restoredCount > 0;
  }

  // === CONTRÔLES PUBLICS ===

  startBattle(battleData) {
    if (!this.isActive) {
      console.error('[BattleScene] ❌ Scène non active');
      return;
    }
    
    this.handleNetworkBattleStart(battleData);
  }

  activateFromTransition() {
    if (!this.isReadyForActivation) {
      console.warn('[BattleScene] ⚠️ Scène non prête');
      return false;
    }
    
    try {
      if (this.scene.isSleeping()) {
        this.scene.wake();
      }
      
      this.scene.setVisible(true);
      this.isVisible = true;
      return true;
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur activation:', error);
      return false;
    }
  }

  // === NETTOYAGE AMÉLIORÉ ===

  clearAllPokemonSprites() {
    console.log('🧹 [BattleScene] Nettoyage sprites...');
    
    // Supprimer sprites spécifiques
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    // Supprimer sprites orphelins
    const allSprites = this.children.list.slice();
    let spritesRemoved = 0;
    
    allSprites.forEach(child => {
      if (child && (
        child.texture?.key?.includes('pokemon_') ||
        child.getData?.('isPokemon') ||
        (child.type === 'Sprite' && child.scale && child.scale > 1.5) ||
        (child.type === 'Container' && child.x && 
         (Math.abs(child.x - this.cameras.main.width * 0.22) < 50 ||
          Math.abs(child.x - this.cameras.main.width * 0.78) < 50))
      )) {
        child.destroy();
        spritesRemoved++;
      }
    });
    
    // Reset données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // ✅ NOUVEAU: Reset timing manager
    this.timingManager.isDisplayingEvents = false;
    this.timingManager.playerTurnPending = false;
    this.timingManager.currentEventEndTime = 0;
    
    console.log(`[BattleScene] ${spritesRemoved} sprites supprimés, timing reset`);
  }

  hideBattle() {
    this.deactivateBattleUI();
    
    // Masquer éléments UI
    if (this.actionInterface) {
      this.actionInterface.setVisible(false);
    }
    
    if (this.battleDialog) {
      this.battleDialog.setVisible(false);
    }
    
    Object.values(this.modernHealthBars).forEach(healthBar => {
      if (healthBar?.container) {
        healthBar.container.setVisible(false);
      }
    });
    
    this.isVisible = false;
    this.scene.setVisible(false);
    
    if (this.scene?.sleep) {
      this.scene.sleep();
    }
  }

  endBattle(battleResult = {}) {
    // Envoyer battleFinished
    try {
      if (this.battleNetworkHandler?.sendToWorld) {
        this.battleNetworkHandler.sendToWorld('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now()
        });
      } else if (window.currentGameRoom) {
        window.currentGameRoom.send('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur envoi battleFinished:', error);
    }
    
    // Nettoyage après délai
    setTimeout(() => {
      this.completeBattleCleanup(battleResult);
    }, 500);
  }

  completeBattleCleanup(battleResult) {
    console.log('🧹 [BattleScene] Nettoyage complet...');
    
    // Déconnexion
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.disconnectFromBattleRoom();
    }
    
    // ✅ NOUVEAU: Reset timing manager complet
    this.timingManager.isDisplayingEvents = false;
    this.timingManager.playerTurnPending = false;
    this.timingManager.currentEventEndTime = 0;
    this.timingManager.eventQueue = [];
    
    // Reset système global
    if (window.battleSystem) {
      window.battleSystem.isInBattle = false;
      window.battleSystem.isTransitioning = false;
      window.battleSystem.currentBattleRoom = null;
      window.battleSystem.currentBattleData = null;
      window.battleSystem.selectedPokemon = null;
    }
    
    // Reset GameManager
    if (this.gameManager?.battleState) {
      this.gameManager.battleState = 'none';
      this.gameManager.inBattle = false;
    }
    
    // Nettoyage final
    this.clearAllPokemonSprites();
    this.hideBattle();
    
    // Forcer exploration
    if (window.pokemonUISystem?.setGameState) {
      try {
        window.pokemonUISystem.setGameState('exploration', { force: true });
      } catch (error) {
        console.warn('[BattleScene] ⚠️ Erreur reset UI:', error);
      }
    }
    
    console.log('✅ [BattleScene] Nettoyage complet terminé - Timing reset');
  }

  // === SIMULATION POUR TESTS ===

  simulatePlayerDamage(damage) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentHp = Math.max(0, 
      this.currentPlayerPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player', this.currentPlayerPokemon);
    this.createDamageEffect(this.playerPokemonSprite, damage);
    
    return this.currentPlayerPokemon.currentHp;
  }

  simulateOpponentDamage(damage) {
    if (!this.currentOpponentPokemon) return 0;
    
    this.currentOpponentPokemon.currentHp = Math.max(0, 
      this.currentOpponentPokemon.currentHp - damage);
    
    this.updateModernHealthBar('opponent', this.currentOpponentPokemon);
    this.createDamageEffect(this.opponentPokemonSprite, damage);
    
    return this.currentOpponentPokemon.currentHp;
  }

  // === TESTS ===

  testModernBattleDisplay() {
    this.activateBattleUI();
    
    const testPlayerPokemon = {
      pokemonId: 1,
      name: 'Bulbasaur',
      level: 12,
      currentHp: 35,
      maxHp: 42,
      currentExp: 156,
      expToNext: 250,
      statusCondition: 'normal',
      types: ['grass', 'poison']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      name: 'Pikachu',
      level: 10,
      currentHp: 28,
      maxHp: 32,
      statusCondition: 'normal',
      types: ['electric'],
      shiny: true
    };
    
    setTimeout(() => this.displayPlayerPokemon(testPlayerPokemon), 500);
    setTimeout(() => this.displayOpponentPokemon(testOpponentPokemon), 1200);
    setTimeout(() => this.showBattleMessage('Un Pikachu chromatique apparaît !', 2000), 2000);
    setTimeout(() => this.showActionButtons(), 4500);
  }

  // === DESTRUCTION ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();
    
    // Nettoyer timers
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    
    // Nettoyer conteneurs
    if (this.actionInterface) {
      this.actionInterface.destroy();
      this.actionInterface = null;
    }
    
    if (this.battleDialog) {
      this.battleDialog.destroy();
      this.battleDialog = null;
    }
    
    Object.values(this.modernHealthBars).forEach(healthBar => {
      if (healthBar?.container) {
        healthBar.container.destroy();
      }
    });
    this.modernHealthBars = { player: null, opponent: null };
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    super.destroy();
  }
}

// === FONCTIONS GLOBALES DE TEST ===

window.testModernBattle = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  battleScene.testModernBattleDisplay();
};

window.modernDamagePlayer = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulatePlayerDamage(damage);
    console.log(`💥 Dégâts joueur: ${damage} (HP: ${result})`);
  }
};

window.modernDamageOpponent = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulateOpponentDamage(damage);
    console.log(`💥 Dégâts adversaire: ${damage} (HP: ${result})`);
  }
};

console.log('✅ [BattleScene] VERSION NETTOYÉE CHARGÉE - Sans doublons !');
console.log('🧪 Test: window.testModernBattle()');
