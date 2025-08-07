// client/src/scenes/BattleScene.js - VERSION MODERNE POKÉMON ROUGE/BLEU CORRIGÉE

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';
import { BattleCaptureManager } from '../managers/Battle/BattleCaptureManager.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers essentiels
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.playerRole = null;
    this.battleInventoryUI = null;
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    this.captureManager = null;
    
    // Sprites Pokémon
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // Interface moderne Pokémon Rouge/Bleu
    this.modernHealthBars = { player1: null, player2: null };
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    this.battleUI = null;
    
    // Données Pokémon actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    this.spriteStructures = new Map();
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    
    // Positions optimisées - RÉGLAGES DE POSITION
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.78 },
      opponent: { x: 0.70, y: 0.50 },      // ⬇️ POSITION POKÉMON ADVERSE : Ajustée à 0.50
      playerPlatform: { x: 0.18, y: 0.88 },
      opponentPlatform: { x: 0.73, y: 0.55 }  // ⬇️ POSITION SOCLE ADVERSE : Ajustée à 0.55
    };
    
    // Interface state
    this.interfaceMode = 'hidden';
    this.battleTranslator = null;
    
    // Boutons d'attaques
    this.moveButtons = [];
  }

  // === INITIALISATION ===

  init(data = {}) {
    this.gameManager = data.gameManager || 
      this.scene.get('GameScene')?.gameManager || 
      window.pokemonUISystem?.gameManager || 
      window.gameManager;

    this.battleNetworkHandler = data.battleNetworkHandler || 
      window.battleSystem?.battleConnection?.networkHandler || 
      window.globalNetworkManager?.battleNetworkHandler;

    if (data.battleData) {
      this.events.once('create', () => {
        this.startBattle(data.battleData);
      });
    }
  }

  preload() {
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
  }

  create() {
    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      this.addModernStyles();
      this.createGameBoyBattleEnvironment();
      this.createPixelPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      this.createGameBoyHealthBars();
      this.createGameBoyActionInterface();
      this.createPixelBattleDialog();
      this.setupBattleNetworkEvents();
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
      
    } catch (error) {
      console.error('[BattleScene] Erreur création:', error);
    }
  }

  // === STYLES POKÉMON ROUGE/BLEU ===

  addModernStyles() {
    // Styles appliqués via les éléments Phaser directement
  }

  // === ENVIRONNEMENT GAME BOY ===

  createGameBoyBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.05;
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      this.battleBackground.setTint(0xf5f5dc);
    } else {
      this.createGameBoyGradientBackground(width, height);
    }
    
    this.createGameBoyBorder(width, height);
    this.createPixelGround(width, height);
  }

  createGameBoyGradientBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe8f4f0, 0xe8f4f0, 0xd4e6d4, 0xb8d4b8);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    this.battleBackground = bg;
  }

  createGameBoyBorder(width, height) {
    const border = this.add.graphics();
    border.setDepth(200);
    
    border.lineStyle(8, 0x1a1a1a, 1);
    border.strokeRect(4, 4, width - 8, height - 8);
    
    border.lineStyle(4, 0x8fad8f, 1);
    border.strokeRect(12, 12, width - 24, height - 24);
  }

  createPixelGround(width, height) {
    const groundY = height * 0.82;
    const ground = this.add.graphics();
    ground.setDepth(-50);
    
    ground.fillStyle(0x6B8E6B, 0.8);
    ground.fillRect(0, groundY, width, height - groundY);
    
    ground.lineStyle(2, 0x4a6b4a, 0.9);
    for (let i = 0; i < 5; i++) {
      const y = groundY + (i * 8);
      ground.lineBetween(0, y, width, y);
    }
    
    ground.fillStyle(0x7ba05b, 0.6);
    for (let x = 0; x < width; x += 16) {
      for (let y = groundY + 8; y < height; y += 12) {
        if (Math.random() > 0.7) {
          ground.fillRect(x, y, 4, 6);
        }
      }
    }
  }

  // === PLATEFORMES PIXELISÉES ===

  createPixelPokemonPlatforms() {
    const { width, height } = this.cameras.main;
    
    this.createPixelPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      140, 'player'
    );
    
    this.createPixelPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      90, 'opponent'
    );
  }

  createPixelPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    platform.setDepth(type === 'player' ? 15 : 10);
    
    platform.fillStyle(0x2d4a2d, 0.6);
    platform.fillEllipse(x + 4, y + 4, size, size * 0.25);
    
    const baseColor = type === 'player' ? 0x8fad8f : 0x6b8e6b;
    platform.fillStyle(baseColor, 0.9);
    platform.fillEllipse(x, y, size, size * 0.25);
    
    platform.fillStyle(0x4a6b4a, 0.8);
    platform.fillEllipse(x, y + 2, size * 0.8, size * 0.15);
    
    platform.lineStyle(3, 0x2d4a2d, 1);
    platform.strokeEllipse(x, y, size, size * 0.25);
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const grassX = x + Math.cos(angle) * (size * 0.6);
      const grassY = y + Math.sin(angle) * (size * 0.15);
      
      platform.fillStyle(0x7ba05b, 0.7);
      platform.fillRect(grassX - 2, grassY - 3, 4, 6);
    }
  }

  // === BARRES DE VIE GAME BOY ===

  createGameBoyHealthBars() {
    const { width, height } = this.cameras.main;
    
    this.createGameBoyHealthBar('player2', {
      x: width * 0.05,
      y: height * 0.05,
      width: 260,
      height: 55,
      isPlayer: false
    });
    
    this.createGameBoyHealthBar('player1', {
      x: width * 0.55,
      y: height * 0.58,
      width: 300,
      height: 75,
      isPlayer: true
    });
  }

  createGameBoyHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    container.setDepth(180);
    
    // Panel principal avec style Game Boy authentique
    const bgPanel = this.add.graphics();
    this.drawGameBoyPanel(bgPanel, config.width, config.height);
    
    // Zone nom/niveau intégrée au panel
    const nameText = this.add.text(12, 12, 
      config.isPlayer ? 'VOTRE POKÉMON' : 'POKÉMON SAUVAGE', {
      fontSize: config.isPlayer ? '12px' : '11px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    
    // Badge niveau style Game Boy
    const levelContainer = this.add.container(config.width - 40, 18);
    const levelBadge = this.add.graphics();
    levelBadge.fillStyle(0x1a1a1a, 1);
    levelBadge.fillRoundedRect(-25, -8, 50, 16, 2);
    levelBadge.lineStyle(1, 0x8fad8f, 1);
    levelBadge.strokeRoundedRect(-25, -8, 50, 16, 2);
    
    const levelText = this.add.text(0, 0, 'LV.--', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#f0f8f0',
      fontWeight: 'bold'
    });
    levelText.setOrigin(0.5);
    levelContainer.add([levelBadge, levelText]);
    
    // Label HP avec style authentique
    const hpLabel = this.add.text(12, 38, 'HP', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    
    // Barre HP intégrée style Game Boy authentique
    const hpBarContainer = this.createGameBoyHPBar(35, 38, config.width - 50);
    
    let hpText = null;
    if (config.isPlayer) {
      hpText = this.add.text(config.width - 80, 55, '--/--', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#1a1a1a',
        fontWeight: 'bold'
      });
    }
    
    let expBarContainer = null;
    if (config.isPlayer) {
      const expLabel = this.add.text(12, 62, 'EXP', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#1a1a1a',
        fontWeight: 'bold'
      });
      
      expBarContainer = this.createGameBoyExpBar(35, 64, config.width - 50);
      container.add([expLabel, expBarContainer.container]);
    }
    
    container.add([
      bgPanel, 
      nameText, 
      levelContainer, 
      hpLabel, 
      hpBarContainer.container
    ]);
    
    if (hpText) container.add(hpText);
    
    container.setVisible(false);
    
    this.modernHealthBars[type] = {
      container, 
      nameText, 
      levelText, 
      hpBar: hpBarContainer,
      hpText, 
      expBar: expBarContainer,
      config
    };
  }

  drawGameBoyPanel(graphics, width, height) {
    graphics.clear();
    
    // Fond principal avec dégradé Game Boy subtil
    graphics.fillGradientStyle(0xf8fff8, 0xf8fff8, 0xf0f8f0, 0xe8f4e8);
    graphics.fillRoundedRect(0, 0, width, height, 6);
    
    // Bordure principale noire épaisse
    graphics.lineStyle(3, 0x1a1a1a, 1);
    graphics.strokeRoundedRect(0, 0, width, height, 6);
    
    // Bordure intérieure verte Game Boy
    graphics.lineStyle(2, 0x6b8e6b, 0.8);
    graphics.strokeRoundedRect(3, 3, width - 6, height - 6, 4);
    
    // Effet de relief interne subtil
    graphics.lineStyle(1, 0xffffff, 0.3);
    graphics.strokeRoundedRect(5, 5, width - 10, height - 10, 3);
  }

  createGameBoyHPBar(x, y, maxWidth) {
    const container = this.add.container(x, y);
    
    // Fond de la barre avec effet enfoncé Game Boy
    const background = this.add.graphics();
    background.fillStyle(0x2d4a2d, 1);
    background.fillRoundedRect(0, 0, maxWidth, 12, 2);
    background.lineStyle(1, 0x1a2a1a, 1);
    background.strokeRoundedRect(0, 0, maxWidth, 12, 2);
    
    // Bordure intérieure sombre (effet enfoncé)
    background.lineStyle(1, 0x0f1a0f, 0.8);
    background.strokeRoundedRect(1, 1, maxWidth - 2, 10, 1);
    
    // Barre HP principale
    const hpBar = this.add.graphics();
    
    // Segments de la barre (style Game Boy authentique)
    const segmentContainer = this.add.container(0, 0);
    
    container.add([background, segmentContainer, hpBar]);
    
    return {
      container,
      background,
      hpBar,
      segmentContainer,
      maxWidth,
      currentPercentage: 1.0
    };
  }

  createGameBoyExpBar(x, y, maxWidth) {
    const container = this.add.container(x, y);
    
    // Fond EXP avec style Game Boy
    const background = this.add.graphics();
    background.fillStyle(0x4a6b4a, 1);
    background.fillRoundedRect(0, 0, maxWidth, 8, 2);
    background.lineStyle(1, 0x2d4a2d, 1);
    background.strokeRoundedRect(0, 0, maxWidth, 8, 2);
    
    // Barre EXP
    const expBar = this.add.graphics();
    
    container.add([background, expBar]);
    
    return {
      container,
      background,
      expBar,
      maxWidth
    };
  }

  updateGameBoyHealthBarVisual(hpBarContainer, targetPercentage) {
    if (!hpBarContainer || !hpBarContainer.hpBar) return;
    
    const { hpBar, segmentContainer, maxWidth } = hpBarContainer;
    const percentage = Math.max(0, Math.min(1, targetPercentage));
    
    hpBar.clear();
    segmentContainer.removeAll(true);
    
    if (percentage <= 0) return;
    
    // Couleurs selon le pourcentage HP (Game Boy authentique)
    let primaryColor, secondaryColor, glowColor;
    if (percentage > 0.6) {
      primaryColor = 0x4caf50;    // Vert foncé
      secondaryColor = 0x66bb6a;  // Vert moyen
      glowColor = 0x81c784;       // Vert clair
    } else if (percentage > 0.3) {
      primaryColor = 0xff9800;    // Orange foncé
      secondaryColor = 0xffb74d;  // Orange moyen
      glowColor = 0xffcc02;       // Orange clair
    } else {
      primaryColor = 0xf44336;    // Rouge foncé
      secondaryColor = 0xe57373;  // Rouge moyen
      glowColor = 0xffab91;       // Rouge clair
    }
    
    const currentWidth = Math.floor(maxWidth * percentage);
    
    // Barre principale avec dégradé
    hpBar.fillGradientStyle(primaryColor, primaryColor, secondaryColor, secondaryColor);
    hpBar.fillRoundedRect(2, 2, currentWidth - 4, 8, 1);
    
    // Effet de brillance Game Boy (ligne du haut)
    hpBar.fillStyle(glowColor, 0.6);
    hpBar.fillRoundedRect(2, 2, Math.max(0, currentWidth - 4), 2, 1);
    
    // Segments pixelisés pour l'effet Game Boy authentique
    if (currentWidth > 6) {
      const segmentWidth = 3;
      const segmentCount = Math.floor(currentWidth / (segmentWidth + 1));
      
      for (let i = 0; i < segmentCount; i++) {
        const segmentX = 2 + i * (segmentWidth + 1);
        if (segmentX + segmentWidth <= currentWidth) {
          const segment = this.add.graphics();
          segment.fillStyle(0xffffff, 0.2);
          segment.fillRect(segmentX, 3, 1, 6);
          segmentContainer.add(segment);
        }
      }
    }
    
    hpBarContainer.currentPercentage = percentage;
  }

  // === INTERFACE D'ACTIONS GAME BOY ===

  createGameBoyActionInterface() {
    const { width, height } = this.cameras.main;
    
    this.actionInterface = this.add.container(0, height - 120);
    this.actionInterface.setDepth(190);
    
    this.mainPanel = this.add.graphics();
    this.drawMainPanel(width, 100, 'buttons');
    this.actionInterface.add(this.mainPanel);
    
    this.textPanel = this.add.graphics();
    this.textPanel.setVisible(false);
    this.actionInterface.add(this.textPanel);
    
    this.actionMessageText = this.add.text(width/2, 30, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: width - 80 }
    });
    this.actionMessageText.setOrigin(0.5, 0.5);
    this.actionMessageText.setVisible(false);
    this.actionInterface.add(this.actionMessageText);
    
    this.createGameBoyActionButtons(width);
    
    this.continueArrow = this.add.text(width - 50, 80, '▼', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    this.continueArrow.setOrigin(0.5);
    this.continueArrow.setVisible(false);
    this.actionInterface.add(this.continueArrow);
    
    this.tweens.add({
      targets: this.continueArrow,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Power2.easeInOut'
    });
    
    this.actionInterface.setVisible(false);
  }

  drawMainPanel(width, height, mode) {
    if (!this.mainPanel) return;
    
    this.mainPanel.clear();
    
    // Adapter la hauteur selon le mode - PLUS HAUT POUR LES ATTAQUES
    let panelHeight;
    if (mode === 'narrative') {
      panelHeight = 90;
    } else if (mode === 'moves') {
      panelHeight = 110; // Plus haut pour 4 attaques + bouton retour
    } else {
      panelHeight = height; // Mode boutons standard
    }
    
    const panelY = mode === 'narrative' ? 10 : 0;
    
    this.mainPanel.fillStyle(0xf0f8f0, 0.98);
    this.mainPanel.fillRoundedRect(20, panelY, width - 40, panelHeight, 8);
    
    this.mainPanel.lineStyle(4, 0x1a1a1a, 1);
    this.mainPanel.strokeRoundedRect(20, panelY, width - 40, panelHeight, 8);
    
    this.mainPanel.lineStyle(2, 0x8fad8f, 1);
    this.mainPanel.strokeRoundedRect(24, panelY + 4, width - 48, panelHeight - 8, 6);
  }

  drawTextPanel(width, mode) {
    if (!this.textPanel) return;
    
    this.textPanel.clear();
    
    if (mode === 'narrative') {
      this.textPanel.fillStyle(0xe8f4e8, 1);
      this.textPanel.fillRoundedRect(30, 20, width - 60, 60, 6);
      this.textPanel.lineStyle(2, 0x6b8e6b, 1);
      this.textPanel.strokeRoundedRect(30, 20, width - 60, 60, 6);
    } else if (mode === 'message') {
      this.textPanel.fillStyle(0xe8f4e8, 1);
      this.textPanel.fillRoundedRect(30, 10, width - 60, 35, 6);
      this.textPanel.lineStyle(2, 0x6b8e6b, 1);
      this.textPanel.strokeRoundedRect(30, 10, width - 60, 35, 6);
    }
  }

  createGameBoyActionButtons(width) {
    const actions = [
      { key: 'attack', text: 'COMBAT', color: 0xff5722, icon: '⚔' },
      { key: 'bag', text: 'SAC', color: 0x9c27b0, icon: '🎒' },
      { key: 'pokemon', text: 'POKÉMON', color: 0x2196f3, icon: '🔄' },
      { key: 'run', text: 'FUITE', color: 0x607d8b, icon: '🏃' }
    ];
    
    const buttonWidth = (width - 100) / 2;
    const buttonHeight = 26;
    const startX = 30;
    const startY = 25;
    const gapX = 15;
    const gapY = 5;
    
    actions.forEach((action, index) => {
      const x = startX + (index % 2) * (buttonWidth + gapX);
      const y = startY + Math.floor(index / 2) * (buttonHeight + gapY);
      
      const button = this.createGameBoyButton(x, y, buttonWidth, buttonHeight, action);
      button.isActionButton = true;
      this.actionInterface.add(button);
    });
  }

  createGameBoyButton(x, y, width, height, action) {
    const buttonContainer = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(action.color, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 4);
    
    bg.lineStyle(2, 0x1a1a1a, 1);
    bg.strokeRoundedRect(0, 0, width, height, 4);
    
    bg.lineStyle(1, 0xffffff, 0.7);
    bg.strokeRoundedRect(1, 1, width - 2, height - 2, 3);
    
    const icon = this.add.text(8, height/2, action.icon, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    icon.setOrigin(0, 0.5);
    
    const text = this.add.text(width/2, height/2, action.text, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    
    buttonContainer.add([bg, icon, text]);
    
    // Correction: Utiliser une zone de hit personnalisée au lieu de setSize + setInteractive
    const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
    buttonContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    buttonContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(action.color, 1);
      bg.fillRoundedRect(0, 0, width, height, 4);
      bg.lineStyle(3, 0xffd700, 1);
      bg.strokeRoundedRect(0, 0, width, height, 4);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100
      });
    });
    
    buttonContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(action.color, 0.9);
      bg.fillRoundedRect(0, 0, width, height, 4);
      bg.lineStyle(2, 0x1a1a1a, 1);
      bg.strokeRoundedRect(0, 0, width, height, 4);
      bg.lineStyle(1, 0xffffff, 0.7);
      bg.strokeRoundedRect(1, 1, width - 2, height - 2, 3);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1, scaleY: 1,
        duration: 100
      });
    });
    
    buttonContainer.on('pointerdown', () => {
      this.handleActionButton(action.key);
    });
    
    return buttonContainer;
  }

  // === DIALOGUE PIXELISÉ ===

  createPixelBattleDialog() {
    const { width, height } = this.cameras.main;
    this.battleDialog = this.add.container(0, height - 120);
    this.battleDialog.setDepth(185);
    
    const dialogPanel = this.add.graphics();
    dialogPanel.fillStyle(0xf0f8f0, 0.98);
    dialogPanel.fillRoundedRect(15, 0, width - 30, 100, 10);
    
    dialogPanel.lineStyle(4, 0x1a1a1a, 1);
    dialogPanel.strokeRoundedRect(15, 0, width - 30, 100, 10);
    
    dialogPanel.fillStyle(0xe8f4e8, 1);
    dialogPanel.fillRoundedRect(25, 10, width - 50, 80, 6);
    
    dialogPanel.lineStyle(2, 0x6b8e6b, 1);
    dialogPanel.strokeRoundedRect(25, 10, width - 50, 80, 6);
    
    this.dialogText = this.add.text(40, 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold',
      wordWrap: { width: width - 80 },
      lineSpacing: 5
    });
    this.dialogText.setOrigin(0, 0.5);
    
    const continueArrow = this.add.text(width - 50, 75, '▼', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    continueArrow.setOrigin(0.5);
    
    this.tweens.add({
      targets: continueArrow,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Power2.easeInOut'
    });
    
    this.battleDialog.add([dialogPanel, this.dialogText, continueArrow]);
    this.battleDialog.setVisible(false);
  }

  // === GESTION DES MODES : ACTIONS vs ATTAQUES ===

  showActionButtons() {
    const { width } = this.cameras.main;
    
    this.hideActionMessage();
    this.hideNarrativeMode();
    this.hideMoveButtons();
    
    this.drawMainPanel(width, 100, 'buttons');
    
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
    
    if (this.actionInterface) {
      this.actionInterface.list.forEach(child => {
        if (child.isActionButton) {
          child.setVisible(true);
        }
      });
      
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(1);
    }
    
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
    
    this.interfaceMode = 'buttons';
  }

  showMoveButtons(moves) {
    const { width } = this.cameras.main;
    
    this.hideActionButtons();
    this.hideActionMessage();
    this.hideNarrativeMode();
    
    // Panel plus haut pour accommoder 4 attaques + retour
    this.drawMainPanel(width, 110, 'moves');
    
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
    
    this.createMoveButtons(moves, width);
    
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
    
    this.interfaceMode = 'moves';
  }

  createMoveButtons(moves, width) {
    if (this.moveButtons) {
      this.moveButtons.forEach(button => button.destroy());
    }
    this.moveButtons = [];
    
    const buttonWidth = (width - 100) / 2;
    const buttonHeight = 26;
    const startX = 30;
    const startY = 20; // Plus haut pour faire place au bouton retour
    const gapX = 15;
    const gapY = 5;
    
    const moveTypeColors = {
      'normal': 0xa8a8a8, 'fire': 0xff4444, 'water': 0x4488ff,
      'electric': 0xffd700, 'grass': 0x44dd44, 'ice': 0x88ddff,
      'fighting': 0xcc2222, 'poison': 0xaa44aa, 'ground': 0xddcc44,
      'flying': 0xaabbff, 'psychic': 0xff4488, 'bug': 0xaabb22,
      'rock': 0xbbaa44, 'ghost': 0x7755aa, 'dragon': 0x7744ff,
      'dark': 0x775544, 'steel': 0xaaaaaa, 'fairy': 0xffaaee
    };
    
    // Créer exactement 4 boutons d'attaques (2x2)
    for (let i = 0; i < 4; i++) {
      const x = startX + (i % 2) * (buttonWidth + gapX);
      const y = startY + Math.floor(i / 2) * (buttonHeight + gapY);
      
      let moveAction;
      
      if (i < moves.length) {
        // Attaque réelle
        const move = moves[i];
        const moveColor = moveTypeColors[move.type?.toLowerCase()] || 0x64b5f6;
        
        moveAction = {
          key: `move_${move.id}`,
          text: move.name.toUpperCase().substring(0, 10),
          color: moveColor,
          icon: this.getMoveIcon(move.type),
          moveData: move
        };
        
        const button = this.createGameBoyButton(x, y, buttonWidth, buttonHeight, moveAction);
        button.isMoveButton = true;
        
        button.removeAllListeners('pointerdown');
        button.on('pointerdown', () => {
          this.handleMoveButton(move);
        });
        
        this.actionInterface.add(button);
        this.moveButtons.push(button);
      } else {
        // Emplacement vide si moins de 4 attaques
        moveAction = {
          key: 'empty',
          text: '---',
          color: 0x666666,
          icon: '-'
        };
        
        const button = this.createGameBoyButton(x, y, buttonWidth, buttonHeight, moveAction);
        button.isMoveButton = true;
        button.alpha = 0.3; // Semi-transparent pour montrer que c'est vide
        
        // Pas d'interaction pour les emplacements vides
        button.removeInteractive();
        
        this.actionInterface.add(button);
        this.moveButtons.push(button);
      }
    }
    
    // 🎮 BOUTON RETOUR SÉPARÉ EN BAS (sur toute la largeur)
    const backButtonWidth = width - 60; // Plus large
    const backButtonHeight = 22;
    const backX = 30;
    const backY = startY + 2 * (buttonHeight + gapY) + 8; // En dessous des attaques
    
    const backAction = {
      key: 'back',
      text: 'RETOUR',
      color: 0x607d8b,
      icon: '◀'
    };
    
    const backButton = this.createGameBoyButton(backX, backY, backButtonWidth, backButtonHeight, backAction);
    backButton.isMoveButton = true;
    
    backButton.removeAllListeners('pointerdown');
    backButton.on('pointerdown', () => {
      this.returnToActionButtons();
    });
    
    this.actionInterface.add(backButton);
    this.moveButtons.push(backButton);
  }

  hideMoveButtons() {
    if (this.moveButtons) {
      this.moveButtons.forEach(button => {
        if (button && button.setVisible) {
          button.setVisible(false);
        }
      });
    }
  }

  returnToActionButtons() {
    if (this.moveButtons) {
      this.moveButtons.forEach(button => {
        if (button && button.destroy) {
          button.destroy();
        }
      });
      this.moveButtons = [];
    }
    
    this.showActionButtons();
  }

  handleMoveButton(move) {
    const pokemonName = this.currentPlayerPokemon?.name || 'Votre Pokémon';
    this.showActionMessage(`${pokemonName} utilise ${move.name} !`);
    
    this.hideMoveButtons();
    
    this.scene.events.emit('battleActionSelected', {
      type: 'move',
      moveId: move.id,
      moveName: move.name,
      moveData: move
    });
    
    if (this.battleNetworkHandler && this.battleNetworkHandler.selectMove) {
      try {
        this.battleNetworkHandler.selectMove(move.id, move);
      } catch (error) {
        console.error('[BattleScene] Erreur envoi attaque:', error);
      }
    }
  }

  getMoveIcon(moveType) {
    const typeIcons = {
      'normal': '○', 'fire': '🔥', 'water': '💧', 'electric': '⚡',
      'grass': '🌿', 'ice': '❄', 'fighting': '👊', 'poison': '☠',
      'ground': '🌍', 'flying': '🦅', 'psychic': '🧠', 'bug': '🐛',
      'rock': '🗿', 'ghost': '👻', 'dragon': '🐉', 'dark': '🌙',
      'steel': '⚙', 'fairy': '✨'
    };
    
    return typeIcons[moveType?.toLowerCase()] || '⚔';
  }

  showActionMessage(message) {
    const { width } = this.cameras.main;
    
    this.hideActionButtons();
    this.hideNarrativeMode();
    
    this.drawMainPanel(width, 100, 'message');
    this.drawTextPanel(width, 'message');
    
    if (!this.actionMessageText) return;
    
    this.actionMessageText.setPosition(width/2, 27);
    this.actionMessageText.setText(message.toUpperCase());
    this.actionMessageText.setVisible(true);
    
    if (this.textPanel) {
      this.textPanel.setVisible(true);
    }
    
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
    
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
  }

  showNarrativeMessage(message, showContinue = true) {
    const { width } = this.cameras.main;
    
    this.hideActionButtons();
    this.hideActionMessage();
    
    this.drawMainPanel(width, 90, 'narrative');
    this.drawTextPanel(width, 'narrative');
    
    if (!this.actionMessageText) return;
    
    this.actionMessageText.setPosition(width/2, 50);
    this.actionMessageText.setText(message.toUpperCase());
    this.actionMessageText.setVisible(true);
    
    if (this.textPanel) {
      this.textPanel.setVisible(true);
    }
    
    if (this.continueArrow && showContinue) {
      this.continueArrow.setVisible(true);
    }
    
    if (!this.actionInterface.visible) {
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(0);
      this.tweens.add({
        targets: this.actionInterface,
        alpha: 1,
        duration: 500,
        ease: 'Power2.easeOut'
      });
    }
    
    this.interfaceMode = 'narrative';
  }

  hideActionMessage() {
    if (!this.actionMessageText) return;
    this.actionMessageText.setVisible(false);
    
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
  }

  hideNarrativeMode() {
    this.hideActionMessage();
    
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
  }

  hideActionButtons() {
    if (!this.actionInterface) return;
    
    this.actionInterface.list.forEach(child => {
      if (child.isActionButton) {
        child.setVisible(false);
      }
    });
  }

  handleActionButton(actionKey) {
    this.hideActionButtons();
    
    switch (actionKey) {
      case 'attack':
        // Créer des attaques de test et les afficher
        const testMoves = this.getTestMoves();
        this.showMoveButtons(testMoves);
        break;
        
      case 'bag':
        try {
          if (!this.battleInventoryUI) {
            this.showActionMessage('Initialisation inventaire...');
            this.createBattleInventoryUI();
          }
          
          if (this.battleInventoryUI) {
            this.battleInventoryUI.openToBalls();
          } else {
            this.showActionMessage('Inventaire de combat non disponible');
            setTimeout(() => this.showActionButtons(), 2000);
          }
        } catch (error) {
          console.error('[BattleScene] Erreur inventaire:', error);
          this.showActionMessage('Erreur inventaire');
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
        
      case 'pokemon':
        this.showActionMessage('Changement de Pokémon indisponible.');
        setTimeout(() => this.showActionButtons(), 2000);
        break;
        
      case 'run':
        if (!this.battleNetworkHandler) {
          this.showActionMessage('Impossible de fuir - pas de connexion');
          setTimeout(() => this.showActionButtons(), 2000);
          return;
        }
        
        this.showActionMessage('Tentative de fuite...');
        try {
          this.battleNetworkHandler.attemptRun();
        } catch (error) {
          console.error('[BattleScene] Erreur fuite:', error);
          this.showActionMessage('Erreur lors de la fuite');
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
    }
  }

  // Méthode pour obtenir des attaques de test (4 attaques complètes)
  getTestMoves() {
    return [
      { id: 1, name: 'Charge', type: 'normal', power: 40, pp: 35 },
      { id: 2, name: 'Fouet Lianes', type: 'grass', power: 45, pp: 25 },
      { id: 3, name: 'Poudre Toxik', type: 'poison', power: 0, pp: 35 },
      { id: 4, name: 'Vampigraine', type: 'grass', power: 0, pp: 10 }
    ];
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
      this.playerPokemonSprite.setScale(4.0);
      this.playerPokemonSprite.setDepth(25);
      this.playerPokemonSprite.setOrigin(0.5, 1);
      
      this.playerPokemonSprite.texture.setFilter(Phaser.Textures.NEAREST);
      
      this.animatePixelPokemonEntry(this.playerPokemonSprite, 'left');
      this.currentPlayerPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player1', pokemonData);
      }, 500);
      
    } catch (error) {
      console.error('[BattleScene] Erreur Pokémon joueur:', error);
      this.createGameBoyPokemonPlaceholder('player', pokemonData);
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
      
      // 🎯 POSITION POKÉMON ADVERSE - Calculée par rapport au socle + décalage
      const socleY = height * this.pokemonPositions.opponentPlatform.y;
      const pokemonY = socleY - 20; // Pokémon 20px au-dessus du socle
      
      const x = width * this.pokemonPositions.opponent.x;
      
      this.opponentPokemonSprite = this.add.sprite(x, pokemonY, spriteKey, 0);
      this.opponentPokemonSprite.setScale(3.2);
      this.opponentPokemonSprite.setDepth(20);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      this.opponentPokemonSprite.texture.setFilter(Phaser.Textures.NEAREST);
      
      this.animatePixelPokemonEntry(this.opponentPokemonSprite, 'right');
      
      if (pokemonData.shiny) {
        this.addGameBoyShinyEffect(this.opponentPokemonSprite);
      }
      
      this.currentOpponentPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player2', pokemonData);
      }, 800);
      
    } catch (error) {
      console.error('[BattleScene] Erreur Pokémon adversaire:', error);
      this.createGameBoyPokemonPlaceholder('opponent', pokemonData);
    }
  }

  animatePixelPokemonEntry(sprite, direction) {
    if (!sprite) return;
    
    const targetX = sprite.x;
    const targetY = sprite.y;
    const targetScale = sprite.scaleX;
    const { width } = this.cameras.main;
    const startX = direction === 'left' ? -150 : width + 150;
    
    sprite.setPosition(startX, targetY + 40);
    sprite.setScale(targetScale * 0.2);
    sprite.setAlpha(0);
    
    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.addPixelIdleAnimation(sprite, targetY);
        this.createPixelSparkles(sprite);
      }
    });
  }

  addPixelIdleAnimation(sprite, baseY) {
    this.tweens.add({
      targets: sprite,
      y: baseY - 6,
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  addGameBoyShinyEffect(sprite) {
    if (!sprite) return;
    
    this.tweens.add({
      targets: sprite,
      tint: [0xffd700, 0xffff00, 0xffd700, 0xffffff],
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.createShinyParticles(sprite);
  }

  createPixelSparkles(sprite) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const sparkle = this.add.text(
          sprite.x + (Math.random() - 0.5) * 80,
          sprite.y - Math.random() * 60,
          '✦',
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffd700'
          }
        );
        sparkle.setDepth(30);
        
        this.tweens.add({
          targets: sparkle,
          y: sparkle.y - 30,
          alpha: 0,
          duration: 1500,
          ease: 'Power2.easeOut',
          onComplete: () => sparkle.destroy()
        });
      }, i * 500);
    }
  }

  createShinyParticles(sprite) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const particle = this.add.text(
          sprite.x + (Math.random() - 0.5) * 60,
          sprite.y - Math.random() * 80,
          '★',
          {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffd700'
          }
        );
        particle.setDepth(35);
        
        this.tweens.add({
          targets: particle,
          y: particle.y - 40,
          x: particle.x + (Math.random() - 0.5) * 30,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 2000,
          ease: 'Power2.easeOut',
          onComplete: () => particle.destroy()
        });
      }, i * 200);
    }
  }

  createGameBoyPokemonPlaceholder(type, pokemonData) {
    const { width, height } = this.cameras.main;
    let position;
    
    if (type === 'player') {
      position = { 
        x: width * this.pokemonPositions.player.x, 
        y: height * this.pokemonPositions.player.y 
      };
    } else {
      // 🎯 PLACEHOLDER ADVERSAIRE - Position basée sur le socle + décalage
      const socleY = height * this.pokemonPositions.opponentPlatform.y;
      position = { 
        x: width * this.pokemonPositions.opponent.x, 
        y: socleY - 20  // 20px au-dessus du socle
      };
    }
    
    const container = this.add.container(position.x, position.y);
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getGameBoyTypeColor(primaryType);
    
    const body = this.add.graphics();
    body.fillStyle(typeColor, 0.9);
    body.fillCircle(0, 0, 45);
    body.lineStyle(4, 0x1a1a1a, 1);
    body.strokeCircle(0, 0, 45);
    body.lineStyle(2, 0xffffff, 0.8);
    body.strokeCircle(0, 0, 42);
    
    const questionMark = this.add.text(0, -5, '?', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    questionMark.setOrigin(0.5);
    
    const nameBg = this.add.graphics();
    nameBg.fillStyle(0xf0f8f0, 0.9);
    nameBg.fillRoundedRect(-40, 25, 80, 20, 4);
    nameBg.lineStyle(2, 0x1a1a1a, 1);
    nameBg.strokeRoundedRect(-40, 25, 80, 20, 4);
    
    const nameText = this.add.text(0, 35, pokemonData.name || 'POKÉMON', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    nameText.setOrigin(0.5);
    
    container.add([body, questionMark, nameBg, nameText]);
    container.setScale(type === 'player' ? 1.3 : 1.0);
    container.setDepth(type === 'player' ? 25 : 20);
    
    this.animatePixelPokemonEntry(container, type === 'player' ? 'left' : 'right');
    
    if (type === 'player') {
      this.playerPokemonSprite = container;
    } else {
      this.opponentPokemonSprite = container;
    }
  }

  getGameBoyTypeColor(type) {
    const colors = {
      'normal': 0xc4c4a4, 'fire': 0xe85444, 'water': 0x4488cc,
      'electric': 0xf4d444, 'grass': 0x84c454, 'ice': 0xa4d4f4,
      'fighting': 0xc44444, 'poison': 0xa444a4, 'ground': 0xd4c454,
      'flying': 0xa4c4f4, 'psychic': 0xf454a4, 'bug': 0xa4c444,
      'rock': 0xc4a454, 'ghost': 0x8464a4, 'dragon': 0x8454f4,
      'dark': 0x846454, 'steel': 0xa4a4a4, 'fairy': 0xf4a4d4
    };
    return colors[type.toLowerCase()] || 0xc4c4a4;
  }

  // === MESSAGES AVEC STYLE GAME BOY ===

  showBattleMessage(message, duration = 0) {
    this.showNarrativeMessage(message, duration === 0);
    
    if (duration > 0) {
      setTimeout(() => {
        this.hideNarrativeMode();
      }, duration);
    }
  }

  hideBattleMessage() {
    this.hideNarrativeMode();
  }

  updateModernHealthBar(type, pokemonData) {
    const healthBar = this.modernHealthBars[type];
    if (!healthBar) {
      console.error('[BattleScene] Barre de vie non trouvée:', type);
      return;
    }
    
    if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
      console.warn(`[BattleScene] HP manquants pour ${type}`);
      return;
    }
    
    const displayName = pokemonData.name ? pokemonData.name.toUpperCase() : 'POKÉMON';
    healthBar.nameText.setText(healthBar.config.isPlayer ? `VOTRE ${displayName}` : displayName);
    healthBar.levelText.setText(`LV.${pokemonData.level || 1}`);
    
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    // Animer la barre HP avec le nouveau système
    this.animateGameBoyHealthBar(healthBar.hpBar, hpPercentage);
    
    if (healthBar.config.isPlayer && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    if (healthBar.config.isPlayer && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateGameBoyExpBar(healthBar.expBar, expPercentage);
    }
    
    healthBar.container.setVisible(true);
    healthBar.container.setAlpha(0);
    this.tweens.add({
      targets: healthBar.container,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut'
    });
  }

  animateGameBoyHealthBar(hpBarContainer, targetPercentage) {
    if (!hpBarContainer || typeof hpBarContainer.currentPercentage === 'undefined') {
      hpBarContainer.currentPercentage = 1.0;
    }
    
    const currentPercentage = hpBarContainer.currentPercentage;
    
    this.tweens.add({
      targets: { value: currentPercentage },
      value: targetPercentage,
      duration: 1000,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        this.updateGameBoyHealthBarVisual(hpBarContainer, percentage);
      }
    });
  }

  animateGameBoyExpBar(expBarContainer, targetPercentage) {
    if (!expBarContainer || !expBarContainer.expBar) return;
    
    const { expBar, maxWidth } = expBarContainer;
    const width = Math.max(0, maxWidth * targetPercentage);
    
    expBar.clear();
    
    if (width > 0) {
      // Barre EXP avec dégradé bleu Game Boy
      expBar.fillGradientStyle(0x2196f3, 0x2196f3, 0x64b5f6, 0x64b5f6);
      expBar.fillRoundedRect(2, 2, width - 4, 4, 1);
      
      // Effet de brillance
      expBar.fillStyle(0x90caf9, 0.6);
      expBar.fillRoundedRect(2, 2, Math.max(0, width - 4), 1, 0);
    }
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
    
    if (this.loadedSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    if (this.loadingSprites.has(spriteKey)) {
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (this.loadedSprites.has(spriteKey)) {
            resolve(spriteKey);
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }
    
    this.loadingSprites.add(spriteKey);
    
    try {
      const paddedId = pokemonId.toString().padStart(3, '0');
      const imagePath = `assets/pokemon/${paddedId}/${view}.png`;
      
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.load.image(tempKey, imagePath);
        
        this.load.once('complete', () => {
          const texture = this.textures.get(tempKey);
          const width = texture.source[0].width;
          const height = texture.source[0].height;
          
          let cols, finalFrameWidth;
          const prioritySizes = [48, 64, 32, 80, 96, 128];
          let found = false;

          for (let testFrameW of prioritySizes) {
            if (width % testFrameW === 0) {
              const testCols = width / testFrameW;
              if (testCols >= 10 && testCols <= 100) {
                cols = testCols;
                finalFrameWidth = testFrameW;
                found = true;
                break;
              }
            }
          }

          if (!found) {
            for (let testFrameW = 32; testFrameW <= 128; testFrameW++) {
              if (width % testFrameW === 0) {
                const testCols = width / testFrameW;
                if (testCols >= 10 && testCols <= 100) {
                  cols = testCols;
                  finalFrameWidth = testFrameW;
                  break;
                }
              }
            }
          }

          if (!cols) {
            cols = Math.round(width / 64);
            finalFrameWidth = Math.floor(width / cols);
          }

          const frameWidth = finalFrameWidth;
          const frameHeight = height;
          
          this.load.spritesheet(spriteKey, imagePath, {
            frameWidth: frameWidth,
            frameHeight: frameHeight
          });
          
          this.load.once('complete', () => {
            this.textures.remove(tempKey);
            this.loadedSprites.add(spriteKey);
            this.loadingSprites.delete(spriteKey);
            resolve(spriteKey);
          });
          
          this.load.start();
        });
        
        this.load.once('loaderror', () => {
          this.loadingSprites.delete(spriteKey);
          reject();
        });
        
        this.load.start();
      });
      
      return spriteKey;
      
    } catch (error) {
      this.loadingSprites.delete(spriteKey);
      return this.createGameBoyFallbackSprite(view);
    }
  }

  createGameBoyFallbackSprite(view) {
    const fallbackKey = `pokemon_placeholder_${view}_gameboy`;
    
    if (!this.textures.exists(fallbackKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#8fad8f' : '#b8d4b8');
      gradient.addColorStop(1, view === 'front' ? '#6b8e6b' : '#8fad8f');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.strokeStyle = '#f0f8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(48, 48, 36, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 48, 48);
      
      this.textures.addCanvas(fallbackKey, canvas);
    }
    
    return fallbackKey;
  }

  // === GESTION DES ÉVÉNEMENTS ===

  handleBattleEvent(eventType, data = {}) {
    if (eventType === 'moveUsed') return;
    
    if (eventType === 'yourTurn') {
      this.showActionButtons();
      return;
    }
    
    if (eventType === 'opponentTurn') {
      this.hideActionButtons();
      this.showNarrativeMessage('L\'ADVERSAIRE RÉFLÉCHIT...', false);
      return;
    }

    if (eventType === 'battleEnd') {
      this.hideActionButtons();
      
      setTimeout(() => {
        this.endBattle({ result: 'ended' });
      }, 3000);
      return;
    }
    
    const introEvents = ['wildPokemonAppears', 'battleStart'];
    const narrativeEvents = ['pokemonFainted', 'victory', 'defeat'];
    
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        if (introEvents.includes(eventType)) {
          this.showNarrativeMessage(message, true);
        } else if (narrativeEvents.includes(eventType)) {
          this.showNarrativeMessage(message, true);
        } else {
          this.showNarrativeMessage(message, false);
        }
      }
    } else {
      if (eventType === 'wildPokemonAppears') {
        const pokemonName = data.pokemonName || 'UN POKÉMON SAUVAGE';
        this.showNarrativeMessage(`${pokemonName} APPARAÎT !`, true);
      } else if (eventType === 'battleStart') {
        this.showNarrativeMessage('QUE VOULEZ-VOUS FAIRE ?', true);
      }
    }
  }

  // === GESTION UI ===

  createBattleInventoryUI() {
    const gameRoom = this.gameManager?.gameRoom || 
                     this.battleNetworkHandler?.gameRoom || 
                     window.currentGameRoom;
    
    const battleContext = {
      battleScene: this,
      networkHandler: this.battleNetworkHandler,
      battleRoomId: this.battleNetworkHandler?.battleRoomId || null,
      captureManager: this.captureManager
    };
    
    if (!gameRoom || !this.battleNetworkHandler) {
      return;
    }
    
    this.battleInventoryUI = new BattleInventoryUI(gameRoom, battleContext);
  }

  initializeCaptureManager() {
    if (!this.battleNetworkHandler) {
      return;
    }
    
    const playerRole = this.playerRole || 'player1';
    
    this.captureManager = new BattleCaptureManager(
      this,
      this.battleNetworkHandler,
      playerRole
    );
  }

  // === ÉVÉNEMENTS RÉSEAU ===

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    this.battleNetworkHandler.on('actionResult', (data) => {
      if (data.success && data.battleEvents && data.battleEvents.length > 0) {
        this.processBattleEventsServerDriven(data.battleEvents);
      }
      
      if (!data.success) {
        this.showActionMessage(`Erreur: ${data.error}`);
      }
    });

    this.battleNetworkHandler.on('moveUsed', (data) => {
      const message = `${data.attackerName} utilise ${data.moveName} !`;
      this.showActionMessage(message);
      
      if (data.attackerRole === 'player1') {
        this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      } else {
        this.createAttackEffect(this.opponentPokemonSprite, this.playerPokemonSprite);
      }
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      const pokemonData = {
        name: data.targetName || 'Pokémon',
        currentHp: data.newHp,
        maxHp: data.maxHp || this.getCurrentMaxHp(data.targetRole),
        level: this.getCurrentLevel(data.targetRole)
      };
      
      if (data.targetRole === 'player1' && this.currentPlayerPokemon) {
        this.currentPlayerPokemon.currentHp = data.newHp;
        this.currentPlayerPokemon.maxHp = data.maxHp || this.currentPlayerPokemon.maxHp;
      } else if (data.targetRole === 'player2' && this.currentOpponentPokemon) {
        this.currentOpponentPokemon.currentHp = data.newHp;
        this.currentOpponentPokemon.maxHp = data.maxHp || this.currentOpponentPokemon.maxHp;
      }
      
      this.updateModernHealthBar(data.targetRole, pokemonData);
      this.createDamageEffectForRole(data.targetRole, data.damage);
    });
    
    this.battleNetworkHandler.on('battleRoomDisconnected', (data) => {
      setTimeout(() => {
        this.endBattle({ result: 'disconnected' });
      }, 1000);
    });

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
        this.handleBattleEvent('wildPokemonAppears', { 
          pokemonName: data.opponentPokemon.name 
        });
      }
      
      this.activateBattleUI();
      this.isVisible = true;
    });
    
    this.battleNetworkHandler.on('narrativeEnd', (data) => {
      this.handleBattleEvent('battleStart', data);
    });
    
    this.battleNetworkHandler.on('battleJoined', (data) => {
      this.playerRole = data.yourRole;
      this.battleTranslator = new BattleTranslator(this.playerRole);
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleNetworkBattleStart(data);
    });

    this.battleNetworkHandler.on('koMessage', (data) => {
      this.showActionMessage(data.message);
      
      if (data.playerRole === 'player1') {
        this.showPlayerPokemonFaint();
      } else {
        this.showEnemyPokemonFaint();
      }
    });
    
    this.battleNetworkHandler.on('winnerAnnounce', (data) => {
      setTimeout(() => {
        this.transitionToEndBattle(data);
      }, 1500);
    });

    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleBattleEvent('yourTurn', data);
    });
  }

  processBattleEventsServerDriven(battleEvents) {
    battleEvents.forEach((event, index) => {
      if (event.type === 'moveUsed') {
        return;
      }
      
      this.handleBattleEvent(event.type, event.data);
    });
  }

  handleNetworkBattleStart(data) {
    if (data.isNarrative || data.duration) {
      return;
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
    setTimeout(() => {
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: opponentPokemon?.name || 'Pokémon' 
      });
    }, 2000);
  }

  // === EFFETS VISUELS ===

  createAttackEffect(attacker, target) {
    if (!attacker || !target) return;
    
    const originalX = attacker.x;
    
    this.tweens.add({
      targets: attacker,
      x: originalX + (target.x > attacker.x ? 60 : -60),
      scaleX: attacker.scaleX * 1.1,
      scaleY: attacker.scaleY * 1.1,
      duration: 250,
      ease: 'Power2.easeOut',
      yoyo: true,
      onYoyo: () => {
        this.createGameBoyImpactEffect(target.x, target.y);
        this.tweens.add({
          targets: target,
          x: target.x + 15,
          scaleX: target.scaleX * 0.95,
          scaleY: target.scaleY * 0.95,
          duration: 80,
          yoyo: true,
          repeat: 4
        });
      }
    });
  }

  createGameBoyImpactEffect(x, y) {
    for (let i = 0; i < 3; i++) {
      const impact = this.add.graphics();
      impact.setPosition(x, y);
      impact.setDepth(50);
      
      const colors = [0xffffff, 0xffd700, 0xff8c00];
      impact.fillStyle(colors[i], 0.9 - i * 0.2);
      impact.fillCircle(0, 0, 8 + i * 4);
      
      this.tweens.add({
        targets: impact,
        scaleX: 3 + i,
        scaleY: 3 + i,
        alpha: 0,
        duration: 400 + i * 100,
        ease: 'Power2.easeOut',
        onComplete: () => impact.destroy()
      });
    }
    
    for (let j = 0; j < 4; j++) {
      const star = this.add.text(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        '✧',
        {
          fontSize: '18px',
          fontFamily: 'monospace',
          color: '#ffd700'
        }
      );
      star.setDepth(55);
      
      this.tweens.add({
        targets: star,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 600,
        ease: 'Power2.easeOut',
        onComplete: () => star.destroy()
      });
    }
  }

  createDamageEffect(sprite, damage) {
    if (!sprite) return;
    
    const damageText = this.add.text(sprite.x, sprite.y - 60, `-${damage}`, {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontWeight: 'bold',
      stroke: '#1a1a1a',
      strokeThickness: 3
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(60);
    
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 40,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => damageText.destroy()
    });
    
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 12,
      duration: 60,
      yoyo: true,
      repeat: 6,
      onComplete: () => sprite.setX(originalX)
    });
    
    const originalTint = sprite.tint;
    sprite.setTint(0xff4444);
    
    this.tweens.add({
      targets: sprite,
      tint: originalTint,
      duration: 300,
      ease: 'Power2.easeOut'
    });
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
        console.error('[BattleScene] Erreur UIManager:', error);
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
        console.error('[BattleScene] Erreur restauration UIManager:', error);
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
      console.error('[BattleScene] Scène non active');
      return;
    }

    try {
      if (window.pokemonUISystem?.setGameState) {
        window.pokemonUISystem.setGameState('battle', { animated: true });
      } else if (window.uiManager?.setGameState) {
        window.uiManager.setGameState('battle', { animated: true });
      }
    } catch (error) {
      console.error('[BattleScene] Erreur notification UIManager:', error);
    }
    
    this.handleNetworkBattleStart(battleData);
  }

  activateFromTransition() {
    if (!this.isReadyForActivation) {
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
      console.error('[BattleScene] Erreur activation:', error);
      return false;
    }
  }

  // === NETTOYAGE ===

  clearAllPokemonSprites() {
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
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
    
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
  }

  hideBattle() {
    this.deactivateBattleUI();
    
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

  // === FONCTIONS HELPER ===

  getCurrentMaxHp(targetRole) {
    if (targetRole === 'player1' && this.currentPlayerPokemon) {
      return this.currentPlayerPokemon.maxHp;
    }
    if (targetRole === 'player2' && this.currentOpponentPokemon) {
      return this.currentOpponentPokemon.maxHp;
    }
    return 100;
  }

  getCurrentLevel(targetRole) {
    if (targetRole === 'player1' && this.currentPlayerPokemon) {
      return this.currentPlayerPokemon.level;
    }
    if (targetRole === 'player2' && this.currentOpponentPokemon) {
      return this.currentOpponentPokemon.level;
    }
    return 5;
  }

  createDamageEffectForRole(targetRole, damage) {
    let targetSprite = null;
    
    if (targetRole === 'player1') {
      targetSprite = this.playerPokemonSprite;
      if (this.currentPlayerPokemon) {
        this.currentPlayerPokemon.currentHp = Math.max(0, this.currentPlayerPokemon.currentHp - damage);
      }
    } else if (targetRole === 'player2') {
      targetSprite = this.opponentPokemonSprite;
      if (this.currentOpponentPokemon) {
        this.currentOpponentPokemon.currentHp = Math.max(0, this.currentOpponentPokemon.currentHp - damage);
      }
    }
    
    if (targetSprite && damage > 0) {
      this.createDamageEffect(targetSprite, damage);
    }
  }

  endBattle(battleResult = {}) {
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
      console.error('[BattleScene] Erreur envoi battleFinished:', error);
    }
    
    setTimeout(() => {
      this.completeBattleCleanup(battleResult);
    }, 500);
  }

  completeBattleCleanup(battleResult) {
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.disconnectFromBattleRoom();
    }
    
    if (window.battleSystem) {
      window.battleSystem.isInBattle = false;
      window.battleSystem.isTransitioning = false;
      window.battleSystem.currentBattleRoom = null;
      window.battleSystem.currentBattleData = null;
      window.battleSystem.selectedPokemon = null;
    }
    
    if (this.gameManager?.battleState) {
      this.gameManager.battleState = 'none';
      this.gameManager.inBattle = false;
    }
    
    this.clearAllPokemonSprites();
    this.hideBattle();
    
    if (window.pokemonUISystem?.setGameState) {
      try {
        window.pokemonUISystem.setGameState('exploration', { force: true });
      } catch (error) {
        console.warn('[BattleScene] Erreur reset UI:', error);
      }
    }
  }

  // === ANIMATIONS K.O. ===

  showPlayerPokemonFaint() {
    if (!this.playerPokemonSprite) return;
    
    this.tweens.add({
      targets: this.playerPokemonSprite,
      y: this.playerPokemonSprite.y + 40,
      alpha: 0.2,
      angle: -45,
      scaleX: this.playerPokemonSprite.scaleX * 0.8,
      scaleY: this.playerPokemonSprite.scaleY * 0.8,
      duration: 2000,
      ease: 'Power2.easeIn'
    });
    
    this.createGameBoyKOEffect(this.playerPokemonSprite);
  }

  showEnemyPokemonFaint() {
    if (!this.opponentPokemonSprite) return;
    
    this.tweens.add({
      targets: this.opponentPokemonSprite,
      y: this.opponentPokemonSprite.y + 40,
      alpha: 0.2,
      angle: 45,
      scaleX: this.opponentPokemonSprite.scaleX * 0.8,
      scaleY: this.opponentPokemonSprite.scaleY * 0.8,
      duration: 2000,
      ease: 'Power2.easeIn'
    });
    
    this.createGameBoyKOEffect(this.opponentPokemonSprite);
  }

  createGameBoyKOEffect(sprite) {
    if (!sprite) return;
    
    const spirals = [];
    for (let i = 0; i < 4; i++) {
      const spiral = this.add.text(
        sprite.x + (Math.random() - 0.5) * 60,
        sprite.y - 30,
        '@',
        {
          fontSize: `${20 + i * 4}px`,
          fontFamily: 'monospace',
          color: i % 2 === 0 ? '#6b8e6b' : '#8fad8f'
        }
      );
      spiral.setDepth(60);
      spirals.push(spiral);
      
      this.tweens.add({
        targets: spiral,
        y: spiral.y - 80,
        x: spiral.x + (Math.random() - 0.5) * 40,
        alpha: 0,
        rotation: Math.PI * 6,
        scaleX: 2,
        scaleY: 2,
        duration: 2500,
        delay: i * 300,
        ease: 'Power2.easeOut',
        onComplete: () => spiral.destroy()
      });
    }
  }

  transitionToEndBattle(winnerData) {
    if (!this.battleNetworkHandler?.isConnectedToBattle || this.interfaceMode === 'ended') {
      return;
    }
    
    this.interfaceMode = 'ended';
    this.hideActionButtons();
    
    this.showGameBoyBattleEndMessage(winnerData);
    
    setTimeout(() => {
      this.endBattle({ result: 'completed', winner: winnerData.winner });
    }, 4000);
  }

  showGameBoyBattleEndMessage(winnerData) {
    let fullMessage = winnerData.message;
    
    if (winnerData.winner === 'player1') {
      const rewards = this.calculateBattleRewards();
      
      fullMessage += '\n\nRÉCOMPENSES OBTENUES :';
      
      if (rewards.experience > 0) {
        fullMessage += `\n⭐ +${rewards.experience} POINTS EXP`;
      }
      
      if (rewards.money > 0) {
        fullMessage += `\n💰 +${rewards.money} POKÉDOLLARS`;
      }
      
      if (rewards.items && rewards.items.length > 0) {
        rewards.items.forEach(item => {
          fullMessage += `\n📦 ${item.name.toUpperCase()} x${item.quantity}`;
        });
      }
    }
    
    this.showActionMessage(fullMessage);
    
    if (winnerData.winner === 'player1') {
      this.createGameBoyVictoryEffect();
    }
  }

  calculateBattleRewards() {
    const opponentLevel = this.currentOpponentPokemon?.level || 5;
    
    return {
      experience: Math.floor(opponentLevel * 10 + Math.random() * 20),
      money: Math.floor(opponentLevel * 15 + Math.random() * 50),
      items: Math.random() > 0.7 ? [
        { name: 'POTION', quantity: 1 }
      ] : []
    };
  }

  createGameBoyVictoryEffect() {
    const { width, height } = this.cameras.main;
    
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const confetti = this.add.text(
          Math.random() * width, 
          -20, 
          ['✦', '◆', '▲', '●'][Math.floor(Math.random() * 4)], 
          { 
            fontSize: '20px',
            fontFamily: 'monospace',
            color: ['#ffd700', '#8fad8f', '#6b8e6b', '#4a6b4a'][Math.floor(Math.random() * 4)]
          }
        );
        confetti.setDepth(200);
        
        this.tweens.add({
          targets: confetti,
          y: height + 50,
          x: confetti.x + (Math.random() - 0.5) * 120,
          rotation: Math.PI * 6,
          alpha: 0,
          duration: 4000,
          ease: 'Power2.easeIn',
          onComplete: () => confetti.destroy()
        });
      }, i * 200);
    }
  }

  // === TEST ===

  testModernBattleDisplay() {
    this.activateBattleUI();
    
    const testPlayerPokemon = {
      pokemonId: 1,
      name: 'Bulbizarre',
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
    
    setTimeout(() => this.showNarrativeMessage('UN PIKACHU CHROMATIQUE APPARAÎT !', true), 2000);
    setTimeout(() => this.showNarrativeMessage('ALLEZ ! BULBIZARRE !', true), 4000);
    setTimeout(() => this.showNarrativeMessage('QUE VOULEZ-VOUS FAIRE ?', true), 6000);
    setTimeout(() => this.showActionButtons(), 8000);
  }

  // === SIMULATION ===

  simulatePlayerDamage(damage) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentHp = Math.max(0, 
      this.currentPlayerPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player1', this.currentPlayerPokemon);
    this.createDamageEffect(this.playerPokemonSprite, damage);
    
    return this.currentPlayerPokemon.currentHp;
  }

  simulateOpponentDamage(damage) {
    if (!this.currentOpponentPokemon) return 0;
    
    this.currentOpponentPokemon.currentHp = Math.max(0, 
      this.currentOpponentPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player2', this.currentOpponentPokemon);
    this.createDamageEffect(this.opponentPokemonSprite, damage);
    
    return this.currentOpponentPokemon.currentHp;
  }

  // === DESTRUCTION ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();

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
    this.modernHealthBars = { player1: null, player2: null };
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    if (this.moveButtons) {
      this.moveButtons.forEach(button => {
        if (button && button.destroy) {
          button.destroy();
        }
      });
      this.moveButtons = [];
    }
    
    super.destroy();
  }
}

// === FONCTIONS GLOBALES DE TEST ===

window.testGameBoyBattle = function() {
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
  console.log('🎮 Interface Game Boy activée !');
};
