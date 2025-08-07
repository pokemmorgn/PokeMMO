// client/src/scenes/BattleScene.js - VERSION HARMONISÉE AVEC L'INVENTAIRE

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';
import { BattleCaptureManager } from '../managers/Battle/BattleCaptureManager.js';
import { t } from '../managers/LocalizationManager.js';

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
    
    // Interface moderne harmonisée
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
    
    // Positions optimisées
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.78 },
      opponent: { x: 0.70, y: 0.50 },
      playerPlatform: { x: 0.18, y: 0.88 },
      opponentPlatform: { x: 0.73, y: 0.55 }
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
      this.createModernBattleEnvironment();
      this.createModernPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      this.createModernHealthBars();
      this.createModernActionInterface();
      this.createModernBattleDialog();
      this.setupBattleNetworkEvents();
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
      
    } catch (error) {
      console.error('[BattleScene] Erreur création:', error);
    }
  }

  // === ENVIRONNEMENT MODERNE ===

  createModernBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.05;
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      this.battleBackground.setTint(0xf0f8f0);
    } else {
      this.createModernGradientBackground(width, height);
    }
    
    this.createModernBorder(width, height);
    this.createModernGround(width, height);
  }

  createModernGradientBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    this.battleBackground = bg;
  }

  createModernBorder(width, height) {
    const border = this.add.graphics();
    border.setDepth(200);
    
    // Bordure principale - même style que l'inventaire
    border.lineStyle(3, 0x4a90e2, 1);
    border.strokeRect(8, 8, width - 16, height - 16);
    
    // Bordure intérieure 
    border.lineStyle(2, 0x357abd, 0.8);
    border.strokeRect(12, 12, width - 24, height - 24);
  }

  createModernGround(width, height) {
    const groundY = height * 0.82;
    const ground = this.add.graphics();
    ground.setDepth(-50);
    
    // Dégradé moderne
    ground.fillGradientStyle(0x4a90e2, 0x4a90e2, 0x357abd, 0x357abd, 0.3);
    ground.fillRect(0, groundY, width, height - groundY);
    
    // Lignes d'effet
    ground.lineStyle(1, 0x87ceeb, 0.4);
    for (let i = 0; i < 3; i++) {
      const y = groundY + (i * 12);
      ground.lineBetween(0, y, width, y);
    }
  }

  // === PLATEFORMES MODERNES ===

  createModernPokemonPlatforms() {
    const { width, height } = this.cameras.main;
    
    this.createModernPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      140, 'player'
    );
    
    this.createModernPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      90, 'opponent'
    );
  }

  createModernPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    platform.setDepth(type === 'player' ? 15 : 10);
    
    // Ombre moderne
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 4, y + 4, size, size * 0.25);
    
    // Base avec style inventaire
    const baseColor = type === 'player' ? 0x4a90e2 : 0x357abd;
    platform.fillGradientStyle(baseColor, baseColor, 0x2a3f5f, 0x2a3f5f, 0.8);
    platform.fillEllipse(x, y, size, size * 0.25);
    
    // Reflet
    platform.fillStyle(0x87ceeb, 0.3);
    platform.fillEllipse(x, y - 2, size * 0.8, size * 0.15);
    
    // Bordure
    platform.lineStyle(2, 0x87ceeb, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.25);
    
    // Points lumineux
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const pointX = x + Math.cos(angle) * (size * 0.4);
      const pointY = y + Math.sin(angle) * (size * 0.12);
      
      platform.fillStyle(0x87ceeb, 0.6);
      platform.fillCircle(pointX, pointY, 2);
    }
  }

  // === BARRES DE VIE MODERNES ===

  createModernHealthBars() {
    const { width, height } = this.cameras.main;
    
    this.createModernHealthBar('player2', {
      x: width * 0.05,
      y: height * 0.05,
      width: 280,
      height: 60,
      isPlayer: false
    });
    
    this.createModernHealthBar('player1', {
      x: width * 0.50,
      y: height * 0.55,
      width: 320,
      height: 80,
      isPlayer: true
    });
  }

  createModernHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    container.setDepth(180);
    
    // Panel avec le style de l'inventaire
    const bgPanel = this.add.graphics();
    this.drawModernPanel(bgPanel, config.width, config.height);
    
    // Zone nom/niveau
    const nameText = this.add.text(15, 15, 
      config.isPlayer ? t('battle.ui.your_pokemon') : t('battle.ui.wild_pokemon'), {
      fontSize: config.isPlayer ? '14px' : '12px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    
    // Badge niveau moderne
    const levelContainer = this.add.container(config.width - 45, 20);
    const levelBadge = this.add.graphics();
    levelBadge.fillGradientStyle(0x4a90e2, 0x4a90e2, 0x357abd, 0x357abd);
    levelBadge.fillRoundedRect(-25, -10, 50, 20, 8);
    levelBadge.lineStyle(2, 0x87ceeb, 1);
    levelBadge.strokeRoundedRect(-25, -10, 50, 20, 8);
    
    const levelText = this.add.text(0, 0, 'LV.--', {
      fontSize: '11px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    levelText.setOrigin(0.5);
    levelContainer.add([levelBadge, levelText]);
    
    // Label HP moderne
    const hpLabel = this.add.text(15, 42, 'HP', {
      fontSize: '13px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#87ceeb',
      fontWeight: 'bold'
    });
    
    // Barre HP moderne
    const hpBarContainer = this.createModernHPBar(45, 42, config.width - 60);
    
    let hpText = null;
    if (config.isPlayer) {
      hpText = this.add.text(config.width - 90, 60, '--/--', {
        fontSize: '12px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: '#87ceeb',
        fontWeight: 'bold'
      });
    }
    
    let expBarContainer = null;
    if (config.isPlayer) {
      const expLabel = this.add.text(15, 65, 'EXP', {
        fontSize: '11px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: '#87ceeb',
        fontWeight: 'bold'
      });
      
      expBarContainer = this.createModernExpBar(45, 67, config.width - 60);
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

  drawModernPanel(graphics, width, height) {
    graphics.clear();
    
    // Fond avec dégradé moderne (même style que l'inventaire)
    graphics.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    graphics.fillRoundedRect(0, 0, width, height, 12);
    
    // Bordure principale bleue
    graphics.lineStyle(3, 0x4a90e2, 1);
    graphics.strokeRoundedRect(0, 0, width, height, 12);
    
    // Bordure intérieure
    graphics.lineStyle(2, 0x357abd, 0.8);
    graphics.strokeRoundedRect(3, 3, width - 6, height - 6, 10);
    
    // Effet de brillance
    graphics.lineStyle(1, 0x87ceeb, 0.4);
    graphics.strokeRoundedRect(6, 6, width - 12, height - 12, 8);
  }

  createModernHPBar(x, y, maxWidth) {
    const container = this.add.container(x, y);
    
    // Fond moderne
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.4);
    background.fillRoundedRect(0, 0, maxWidth, 14, 4);
    background.lineStyle(2, 0x4a90e2, 0.6);
    background.strokeRoundedRect(0, 0, maxWidth, 14, 4);
    
    // Barre HP principale
    const hpBar = this.add.graphics();
    
    container.add([background, hpBar]);
    
    return {
      container,
      background,
      hpBar,
      maxWidth,
      currentPercentage: 1.0
    };
  }

  createModernExpBar(x, y, maxWidth) {
    const container = this.add.container(x, y);
    
    // Fond EXP moderne
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.3);
    background.fillRoundedRect(0, 0, maxWidth, 10, 3);
    background.lineStyle(1, 0x4a90e2, 0.5);
    background.strokeRoundedRect(0, 0, maxWidth, 10, 3);
    
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

  updateModernHealthBarVisual(hpBarContainer, targetPercentage) {
    if (!hpBarContainer || !hpBarContainer.hpBar) return;
    
    const { hpBar, maxWidth } = hpBarContainer;
    const percentage = Math.max(0, Math.min(1, targetPercentage));
    
    hpBar.clear();
    
    if (percentage <= 0) return;
    
    // Couleurs modernes selon le pourcentage HP
    let primaryColor, secondaryColor;
    if (percentage > 0.6) {
      primaryColor = 0x4caf50;
      secondaryColor = 0x81c784;
    } else if (percentage > 0.3) {
      primaryColor = 0xff9800;
      secondaryColor = 0xffcc02;
    } else {
      primaryColor = 0xf44336;
      secondaryColor = 0xff7043;
    }
    
    const currentWidth = Math.floor(maxWidth * percentage);
    
    // Barre avec dégradé moderne
    hpBar.fillGradientStyle(primaryColor, primaryColor, secondaryColor, secondaryColor);
    hpBar.fillRoundedRect(2, 2, currentWidth - 4, 10, 3);
    
    // Effet de brillance moderne
    hpBar.fillStyle(0xffffff, 0.3);
    hpBar.fillRoundedRect(2, 2, Math.max(0, currentWidth - 4), 3, 2);
    
    // Bordure intérieure
    hpBar.lineStyle(1, 0xffffff, 0.2);
    hpBar.strokeRoundedRect(2, 2, currentWidth - 4, 10, 3);
    
    hpBarContainer.currentPercentage = percentage;
  }

  // === INTERFACE D'ACTIONS MODERNE ===

  createModernActionInterface() {
    const { width, height } = this.cameras.main;
    
    this.actionInterface = this.add.container(0, height - 130);
    this.actionInterface.setDepth(190);
    
    this.mainPanel = this.add.graphics();
    this.drawModernActionPanel(width, 110, 'buttons');
    this.actionInterface.add(this.mainPanel);
    
    this.textPanel = this.add.graphics();
    this.textPanel.setVisible(false);
    this.actionInterface.add(this.textPanel);
    
    this.actionMessageText = this.add.text(width/2, 35, '', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: width - 80 }
    });
    this.actionMessageText.setOrigin(0.5, 0.5);
    this.actionMessageText.setVisible(false);
    this.actionInterface.add(this.actionMessageText);
    
    this.createModernActionButtons(width);
    
    this.continueArrow = this.add.text(width - 60, 85, '▼', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#87ceeb'
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

  drawModernActionPanel(width, height, mode) {
    if (!this.mainPanel) return;
    
    this.mainPanel.clear();
    
    let panelHeight = height;
    if (mode === 'narrative') {
      panelHeight = 100;
    }
    
    const panelY = mode === 'narrative' ? 10 : 0;
    
    // Style moderne harmonisé avec l'inventaire
    this.mainPanel.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    this.mainPanel.fillRoundedRect(20, panelY, width - 40, panelHeight, 15);
    
    this.mainPanel.lineStyle(3, 0x4a90e2, 1);
    this.mainPanel.strokeRoundedRect(20, panelY, width - 40, panelHeight, 15);
    
    this.mainPanel.lineStyle(2, 0x357abd, 0.8);
    this.mainPanel.strokeRoundedRect(23, panelY + 3, width - 46, panelHeight - 6, 12);
  }

  drawModernTextPanel(width, mode) {
    if (!this.textPanel) return;
    
    this.textPanel.clear();
    
    if (mode === 'narrative') {
      this.textPanel.fillGradientStyle(0x1e2d42, 0x1e2d42, 0x2a3f5f, 0x2a3f5f, 0.95);
      this.textPanel.fillRoundedRect(35, 25, width - 70, 65, 8);
      this.textPanel.lineStyle(2, 0x4a90e2, 0.8);
      this.textPanel.strokeRoundedRect(35, 25, width - 70, 65, 8);
    } else if (mode === 'message') {
      this.textPanel.fillGradientStyle(0x1e2d42, 0x1e2d42, 0x2a3f5f, 0x2a3f5f, 0.95);
      this.textPanel.fillRoundedRect(35, 15, width - 70, 40, 8);
      this.textPanel.lineStyle(2, 0x4a90e2, 0.8);
      this.textPanel.strokeRoundedRect(35, 15, width - 70, 40, 8);
    }
  }

  createModernActionButtons(width) {
    const actions = [
      { key: 'attack', text: t('battle.ui.actions.attack'), color: 0xff5722, icon: '⚔' },
      { key: 'bag', text: t('battle.ui.actions.bag'), color: 0x9c27b0, icon: '🎒' },
      { key: 'pokemon', text: t('battle.ui.actions.pokemon'), color: 0x2196f3, icon: '🔄' },
      { key: 'run', text: t('battle.ui.actions.run'), color: 0x607d8b, icon: '🏃' }
    ];
    
    // Centrage parfait horizontal et vertical
    const totalPadding = 70;
    const availableWidth = width - totalPadding;
    const buttonWidth = (availableWidth - 20) / 2;
    const buttonHeight = 32;
    const gapX = 20;
    const gapY = 8;
    
    // Centrage vertical parfait dans le panel de 110px
    const totalButtonsHeight = (buttonHeight * 2) + gapY; // 2 rangées + gap
    const verticalPadding = (110 - totalButtonsHeight) / 2; // Panel height - buttons height, divisé par 2
    
    const startX = totalPadding / 2;
    const startY = verticalPadding; // Centrage vertical parfait
    
    actions.forEach((action, index) => {
      const x = startX + (index % 2) * (buttonWidth + gapX);
      const y = startY + Math.floor(index / 2) * (buttonHeight + gapY);
      
      const button = this.createModernButton(x, y, buttonWidth, buttonHeight, action);
      button.isActionButton = true;
      this.actionInterface.add(button);
    });
  }

  createModernButton(x, y, width, height, action) {
    const buttonContainer = this.add.container(x, y);
    
    const bg = this.add.graphics();
    // Style bouton moderne avec dégradé subtil et uniforme
    bg.fillStyle(action.color, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 8);
    
    // Bordure principale
    bg.lineStyle(2, 0xffffff, 0.6);
    bg.strokeRoundedRect(0, 0, width, height, 8);
    
    // Effet de profondeur subtil
    bg.lineStyle(1, action.color, 0.8);
    bg.strokeRoundedRect(1, 1, width - 2, height - 2, 7);
    
    // Effet de brillance en haut
    bg.fillStyle(0xffffff, 0.15);
    bg.fillRoundedRect(2, 2, width - 4, height / 3, 6);
    
    const icon = this.add.text(12, height/2, action.icon, {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff'
    });
    icon.setOrigin(0, 0.5);
    
    const text = this.add.text(width/2, height/2, action.text, {
      fontSize: '13px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    
    buttonContainer.add([bg, icon, text]);
    
    const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
    buttonContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    buttonContainer.on('pointerover', () => {
      bg.clear();
      // Hover avec couleur plus vive et effet lumineux
      const hoverColor = this.brightenColor(action.color, 0.3);
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(0, 0, width, height, 8);
      
      // Bordure dorée au hover
      bg.lineStyle(3, 0x87ceeb, 1);
      bg.strokeRoundedRect(0, 0, width, height, 8);
      
      // Effet de brillance renforcé au hover
      bg.fillStyle(0xffffff, 0.25);
      bg.fillRoundedRect(2, 2, width - 4, height / 2, 6);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1.05, scaleY: 1.05,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    });
    
    buttonContainer.on('pointerout', () => {
      bg.clear();
      // Retour à l'état normal
      bg.fillStyle(action.color, 0.9);
      bg.fillRoundedRect(0, 0, width, height, 8);
      
      bg.lineStyle(2, 0xffffff, 0.6);
      bg.strokeRoundedRect(0, 0, width, height, 8);
      
      bg.lineStyle(1, action.color, 0.8);
      bg.strokeRoundedRect(1, 1, width - 2, height - 2, 7);
      
      bg.fillStyle(0xffffff, 0.15);
      bg.fillRoundedRect(2, 2, width - 4, height / 3, 6);
      
      this.tweens.add({
        targets: buttonContainer,
        scaleX: 1, scaleY: 1,
        duration: 150,
        ease: 'Power2.easeOut'
      });
    });
    
    buttonContainer.on('pointerdown', () => {
      this.handleActionButton(action.key);
    });
    
    return buttonContainer;
  }

  // Fonction utilitaire pour éclaircir une couleur
  brightenColor(color, factor) {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * (1 + factor)));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * (1 + factor)));
    const b = Math.min(255, Math.floor((color & 0xFF) * (1 + factor)));
    return (r << 16) | (g << 8) | b;
  }

  // === DIALOGUE MODERNE ===

  createModernBattleDialog() {
    const { width, height } = this.cameras.main;
    this.battleDialog = this.add.container(0, height - 130);
    this.battleDialog.setDepth(185);
    
    const dialogPanel = this.add.graphics();
    dialogPanel.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    dialogPanel.fillRoundedRect(20, 0, width - 40, 110, 15);
    
    dialogPanel.lineStyle(3, 0x4a90e2, 1);
    dialogPanel.strokeRoundedRect(20, 0, width - 40, 110, 15);
    
    dialogPanel.fillGradientStyle(0x1e2d42, 0x1e2d42, 0x2a3f5f, 0x2a3f5f, 0.9);
    dialogPanel.fillRoundedRect(30, 15, width - 60, 80, 10);
    
    dialogPanel.lineStyle(2, 0x357abd, 0.8);
    dialogPanel.strokeRoundedRect(30, 15, width - 60, 80, 10);
    
    this.dialogText = this.add.text(50, 55, '', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold',
      wordWrap: { width: width - 100 },
      lineSpacing: 6
    });
    this.dialogText.setOrigin(0, 0.5);
    
    const continueArrow = this.add.text(width - 60, 85, '▼', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#87ceeb'
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

  // === GESTION DES MODES ===

  showActionButtons() {
    const { width } = this.cameras.main;
    
    this.hideActionMessage();
    this.hideNarrativeMode();
    this.hideMoveButtons();
    
    this.drawModernActionPanel(width, 110, 'buttons');
    
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
    
    this.drawModernActionPanel(width, 110, 'moves');
    
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
    
    // Même centrage que les boutons d'action (horizontal et vertical)
    const totalPadding = 70;
    const availableWidth = width - totalPadding;
    const buttonWidth = (availableWidth - 20) / 2;
    const buttonHeight = 32;
    const gapX = 20;
    const gapY = 8;
    
    // Centrage vertical parfait dans le panel de 110px
    const totalButtonsHeight = (buttonHeight * 2) + gapY;
    const verticalPadding = (110 - totalButtonsHeight) / 2;
    
    const startX = totalPadding / 2;
    const startY = verticalPadding; // Centrage vertical parfait
    
    const moveTypeColors = {
      'normal': 0xa8a8a8, 'fire': 0xff4444, 'water': 0x4488ff,
      'electric': 0xffd700, 'grass': 0x44dd44, 'ice': 0x88ddff,
      'fighting': 0xcc2222, 'poison': 0xaa44aa, 'ground': 0xddcc44,
      'flying': 0xaabbff, 'psychic': 0xff4488, 'bug': 0xaabb22,
      'rock': 0xbbaa44, 'ghost': 0x7755aa, 'dragon': 0x7744ff,
      'dark': 0x775544, 'steel': 0xaaaaaa, 'fairy': 0xffaaee
    };
    
    // Créer 4 boutons d'attaques
    for (let i = 0; i < 4; i++) {
      const x = startX + (i % 2) * (buttonWidth + gapX);
      const y = startY + Math.floor(i / 2) * (buttonHeight + gapY);
      
      let moveAction;
      
      if (i < moves.length) {
        const move = moves[i];
        const moveColor = moveTypeColors[move.type?.toLowerCase()] || 0x64b5f6;
        
        moveAction = {
          key: `move_${move.id}`,
          text: move.name.toUpperCase().substring(0, 12),
          color: moveColor,
          icon: this.getMoveIcon(move.type),
          moveData: move
        };
        
        const button = this.createModernButton(x, y, buttonWidth, buttonHeight, moveAction);
        button.isMoveButton = true;
        
        button.removeAllListeners('pointerdown');
        button.on('pointerdown', () => {
          this.handleMoveButton(move);
        });
        
        this.actionInterface.add(button);
        this.moveButtons.push(button);
      } else {
        moveAction = {
          key: 'empty',
          text: '---',
          color: 0x666666,
          icon: '-'
        };
        
        const button = this.createModernButton(x, y, buttonWidth, buttonHeight, moveAction);
        button.isMoveButton = true;
        button.alpha = 0.4;
        button.removeInteractive();
        
        this.actionInterface.add(button);
        this.moveButtons.push(button);
      }
    }
    
    // Bouton X de fermeture moderne
    this.createModernCloseButton(width);
  }

  createModernCloseButton(width) {
    const closeButtonSize = 28;
    const closeX = width - 55;
    const closeY = 10;
    
    const closeButton = this.add.container(closeX, closeY);
    
    const closeBg = this.add.graphics();
    closeBg.fillGradientStyle(0x8b0000, 0x8b0000, 0x5d0000, 0x5d0000);
    closeBg.fillRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
    
    closeBg.lineStyle(2, 0xff6b6b, 0.8);
    closeBg.strokeRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
    
    const closeText = this.add.text(0, 0, '✕', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    closeText.setOrigin(0.5);
    
    closeButton.add([closeBg, closeText]);
    closeButton.setSize(closeButtonSize, closeButtonSize);
    
    const hitArea = new Phaser.Geom.Rectangle(-closeButtonSize/2 - 3, -closeButtonSize/2 - 3, closeButtonSize + 6, closeButtonSize + 6);
    closeButton.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    closeButton.on('pointerover', () => {
      closeBg.clear();
      closeBg.fillGradientStyle(0xcd5c5c, 0xcd5c5c, 0x8b0000, 0x8b0000);
      closeBg.fillRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
      closeBg.lineStyle(3, 0x87ceeb, 1);
      closeBg.strokeRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
      
      this.tweens.add({
        targets: closeButton,
        scaleX: 1.1, scaleY: 1.1,
        duration: 150
      });
    });
    
    closeButton.on('pointerout', () => {
      closeBg.clear();
      closeBg.fillGradientStyle(0x8b0000, 0x8b0000, 0x5d0000, 0x5d0000);
      closeBg.fillRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
      closeBg.lineStyle(2, 0xff6b6b, 0.8);
      closeBg.strokeRoundedRect(-closeButtonSize/2, -closeButtonSize/2, closeButtonSize, closeButtonSize, 6);
      
      this.tweens.add({
        targets: closeButton,
        scaleX: 1, scaleY: 1,
        duration: 150
      });
    });
    
    closeButton.on('pointerdown', () => {
      this.returnToActionButtons();
    });
    
    closeButton.isMoveButton = true;
    this.actionInterface.add(closeButton);
    this.moveButtons.push(closeButton);
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
    const pokemonName = this.currentPlayerPokemon?.name || t('battle.ui.your_pokemon');
    this.showActionMessage(t('battle.ui.messages.pokemon_uses_move')
      .replace('{pokemon}', pokemonName)
      .replace('{move}', move.name));
    
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
    
    this.drawModernActionPanel(width, 110, 'message');
    this.drawModernTextPanel(width, 'message');
    
    if (!this.actionMessageText) return;
    
    this.actionMessageText.setPosition(width/2, 35);
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
    
    this.drawModernActionPanel(width, 100, 'narrative');
    this.drawModernTextPanel(width, 'narrative');
    
    if (!this.actionMessageText) return;
    
    this.actionMessageText.setPosition(width/2, 55);
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
        const testMoves = this.getTestMoves();
        this.showMoveButtons(testMoves);
        break;
        
      case 'bag':
        try {
          if (!this.battleInventoryUI) {
            this.showActionMessage(t('battle.ui.messages.initializing_inventory'));
            this.createBattleInventoryUI();
          }
          
          if (this.battleInventoryUI) {
            this.battleInventoryUI.openToBalls();
          } else {
            this.showActionMessage(t('battle.ui.messages.inventory_unavailable'));
            setTimeout(() => this.showActionButtons(), 2000);
          }
        } catch (error) {
          console.error('[BattleScene] Erreur inventaire:', error);
          this.showActionMessage(t('battle.ui.messages.inventory_error'));
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
        
      case 'pokemon':
        this.showActionMessage(t('battle.ui.messages.pokemon_change_unavailable'));
        setTimeout(() => this.showActionButtons(), 2000);
        break;
        
      case 'run':
        if (!this.battleNetworkHandler) {
          this.showActionMessage(t('battle.ui.messages.cannot_run_no_connection'));
          setTimeout(() => this.showActionButtons(), 2000);
          return;
        }
        
        this.showActionMessage(t('battle.ui.messages.attempting_to_run'));
        try {
          this.battleNetworkHandler.attemptRun();
        } catch (error) {
          console.error('[BattleScene] Erreur fuite:', error);
          this.showActionMessage(t('battle.ui.messages.run_error'));
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
    }
  }

  getTestMoves() {
    return [
      { id: 1, name: 'Charge', type: 'normal', power: 40, pp: 35 },
      { id: 2, name: 'Fouet Lianes', type: 'grass', power: 45, pp: 25 },
      { id: 3, name: 'Poudre Toxik', type: 'poison', power: 0, pp: 35 },
      { id: 4, name: 'Vampigraine', type: 'grass', power: 0, pp: 10 }
    ];
  }

  // === AFFICHAGE POKÉMON (inchangé mais avec effets modernes) ===

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
      
      this.animateModernPokemonEntry(this.playerPokemonSprite, 'left');
      this.currentPlayerPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player1', pokemonData);
      }, 500);
      
    } catch (error) {
      console.error('[BattleScene] Erreur Pokémon joueur:', error);
      this.createModernPokemonPlaceholder('player', pokemonData);
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
      
      const socleY = height * this.pokemonPositions.opponentPlatform.y;
      const pokemonY = socleY - 20;
      
      const x = width * this.pokemonPositions.opponent.x;
      
      this.opponentPokemonSprite = this.add.sprite(x, pokemonY, spriteKey, 0);
      this.opponentPokemonSprite.setScale(3.2);
      this.opponentPokemonSprite.setDepth(20);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      this.opponentPokemonSprite.texture.setFilter(Phaser.Textures.NEAREST);
      
      this.animateModernPokemonEntry(this.opponentPokemonSprite, 'right');
      
      if (pokemonData.shiny) {
        this.addModernShinyEffect(this.opponentPokemonSprite);
      }
      
      this.currentOpponentPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player2', pokemonData);
      }, 800);
      
    } catch (error) {
      console.error('[BattleScene] Erreur Pokémon adversaire:', error);
      this.createModernPokemonPlaceholder('opponent', pokemonData);
    }
  }

  animateModernPokemonEntry(sprite, direction) {
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
        this.addModernIdleAnimation(sprite, targetY);
        this.createModernSparkles(sprite);
      }
    });
  }

  addModernIdleAnimation(sprite, baseY) {
    this.tweens.add({
      targets: sprite,
      y: baseY - 8,
      duration: 2800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  addModernShinyEffect(sprite) {
    if (!sprite) return;
    
    this.tweens.add({
      targets: sprite,
      tint: [0x87ceeb, 0x4a90e2, 0x87ceeb, 0xffffff],
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.createModernShinyParticles(sprite);
  }

  createModernSparkles(sprite) {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const sparkle = this.add.text(
          sprite.x + (Math.random() - 0.5) * 90,
          sprite.y - Math.random() * 70,
          '✦',
          {
            fontSize: '18px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: '#87ceeb'
          }
        );
        sparkle.setDepth(30);
        
        this.tweens.add({
          targets: sparkle,
          y: sparkle.y - 35,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 1800,
          ease: 'Power2.easeOut',
          onComplete: () => sparkle.destroy()
        });
      }, i * 600);
    }
  }

  createModernShinyParticles(sprite) {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const particle = this.add.text(
          sprite.x + (Math.random() - 0.5) * 70,
          sprite.y - Math.random() * 90,
          '★',
          {
            fontSize: '14px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: '#87ceeb'
          }
        );
        particle.setDepth(35);
        
        this.tweens.add({
          targets: particle,
          y: particle.y - 50,
          x: particle.x + (Math.random() - 0.5) * 35,
          alpha: 0,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 2500,
          ease: 'Power2.easeOut',
          onComplete: () => particle.destroy()
        });
      }, i * 250);
    }
  }

  createModernPokemonPlaceholder(type, pokemonData) {
    const { width, height } = this.cameras.main;
    let position;
    
    if (type === 'player') {
      position = { 
        x: width * this.pokemonPositions.player.x, 
        y: height * this.pokemonPositions.player.y 
      };
    } else {
      const socleY = height * this.pokemonPositions.opponentPlatform.y;
      position = { 
        x: width * this.pokemonPositions.opponent.x, 
        y: socleY - 20
      };
    }
    
    const container = this.add.container(position.x, position.y);
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getModernTypeColor(primaryType);
    
    const body = this.add.graphics();
    body.fillGradientStyle(typeColor, typeColor, typeColor * 0.7, typeColor * 0.7);
    body.fillCircle(0, 0, 45);
    body.lineStyle(3, 0x87ceeb, 0.8);
    body.strokeCircle(0, 0, 45);
    body.lineStyle(2, 0x4a90e2, 0.6);
    body.strokeCircle(0, 0, 42);
    
    const questionMark = this.add.text(0, -5, '?', {
      fontSize: '36px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    questionMark.setOrigin(0.5);
    
    const nameBg = this.add.graphics();
    nameBg.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    nameBg.fillRoundedRect(-45, 25, 90, 24, 8);
    nameBg.lineStyle(2, 0x4a90e2, 0.8);
    nameBg.strokeRoundedRect(-45, 25, 90, 24, 8);
    
    const nameText = this.add.text(0, 37, pokemonData.name || 'POKÉMON', {
      fontSize: '12px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#87ceeb',
      fontWeight: 'bold'
    });
    nameText.setOrigin(0.5);
    
    container.add([body, questionMark, nameBg, nameText]);
    container.setScale(type === 'player' ? 1.3 : 1.0);
    container.setDepth(type === 'player' ? 25 : 20);
    
    this.animateModernPokemonEntry(container, type === 'player' ? 'left' : 'right');
    
    if (type === 'player') {
      this.playerPokemonSprite = container;
    } else {
      this.opponentPokemonSprite = container;
    }
  }

  getModernTypeColor(type) {
    const colors = {
      'normal': 0xa8a8a8, 'fire': 0xff5722, 'water': 0x2196f3,
      'electric': 0xffc107, 'grass': 0x4caf50, 'ice': 0x03a9f4,
      'fighting': 0xf44336, 'poison': 0x9c27b0, 'ground': 0xff9800,
      'flying': 0x3f51b5, 'psychic': 0xe91e63, 'bug': 0x8bc34a,
      'rock': 0x795548, 'ghost': 0x673ab7, 'dragon': 0x3f51b5,
      'dark': 0x424242, 'steel': 0x607d8b, 'fairy': 0xe91e63
    };
    return colors[type.toLowerCase()] || 0xa8a8a8;
  }

  // === MESSAGES MODERNES ===

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
    const nameKey = healthBar.config.isPlayer ? 'battle.ui.your_pokemon_name' : 'battle.ui.wild_pokemon_name';
    healthBar.nameText.setText(t(nameKey).replace('{name}', displayName));
    healthBar.levelText.setText(`LV.${pokemonData.level || 1}`);
    
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    this.animateModernHealthBar(healthBar.hpBar, hpPercentage);
    
    if (healthBar.config.isPlayer && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    if (healthBar.config.isPlayer && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateModernExpBar(healthBar.expBar, expPercentage);
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

  animateModernHealthBar(hpBarContainer, targetPercentage) {
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
        this.updateModernHealthBarVisual(hpBarContainer, percentage);
      }
    });
  }

  animateModernExpBar(expBarContainer, targetPercentage) {
    if (!expBarContainer || !expBarContainer.expBar) return;
    
    const { expBar, maxWidth } = expBarContainer;
    const width = Math.max(0, maxWidth * targetPercentage);
    
    expBar.clear();
    
    if (width > 0) {
      expBar.fillGradientStyle(0x4a90e2, 0x4a90e2, 0x87ceeb, 0x87ceeb);
      expBar.fillRoundedRect(2, 2, width - 4, 6, 2);
      
      expBar.fillStyle(0xffffff, 0.3);
      expBar.fillRoundedRect(2, 2, Math.max(0, width - 4), 2, 1);
    }
  }

  // === CHARGEMENT SPRITES (inchangé) ===
  
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
      return this.createModernFallbackSprite(view);
    }
  }

  createModernFallbackSprite(view) {
    const fallbackKey = `pokemon_placeholder_${view}_modern`;
    
    if (!this.textures.exists(fallbackKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      
      // Dégradé moderne
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#4a90e2' : '#87ceeb');
      gradient.addColorStop(0.7, view === 'front' ? '#357abd' : '#4a90e2');
      gradient.addColorStop(1, view === 'front' ? '#2a3f5f' : '#357abd');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Bordures modernes
      ctx.strokeStyle = '#87ceeb';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(48, 48, 37, 0, Math.PI * 2);
      ctx.stroke();
      
      // Point d'interrogation moderne
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
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
      this.showNarrativeMessage(t('battle.ui.messages.opponent_thinking'), false);
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
        const pokemonName = data.pokemonName || t('battle.ui.messages.wild_pokemon');
        this.showNarrativeMessage(t('battle.ui.messages.wild_pokemon_appears').replace('{name}', pokemonName), true);
      } else if (eventType === 'battleStart') {
        this.showNarrativeMessage(t('battle.ui.messages.what_will_you_do'), true);
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
        this.showActionMessage(t('battle.ui.messages.error_prefix') + data.error);
      }
    });

    this.battleNetworkHandler.on('moveUsed', (data) => {
      const message = t('battle.ui.messages.pokemon_uses_move')
        .replace('{pokemon}', data.attackerName)
        .replace('{move}', data.moveName);
      this.showActionMessage(message);
      
      if (data.attackerRole === 'player1') {
        this.createModernAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      } else {
        this.createModernAttackEffect(this.opponentPokemonSprite, this.playerPokemonSprite);
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
      this.createModernDamageEffectForRole(data.targetRole, data.damage);
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

  // === EFFETS VISUELS MODERNES ===

  createModernAttackEffect(attacker, target) {
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
        this.createModernImpactEffect(target.x, target.y);
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

  createModernImpactEffect(x, y) {
    // Effet d'impact moderne avec style harmonisé
    for (let i = 0; i < 4; i++) {
      const impact = this.add.graphics();
      impact.setPosition(x, y);
      impact.setDepth(50);
      
      const colors = [0xffffff, 0x87ceeb, 0x4a90e2, 0x357abd];
      impact.fillGradientStyle(colors[i], colors[i], colors[i] * 0.7, colors[i] * 0.7, 0.9 - i * 0.15);
      impact.fillCircle(0, 0, 10 + i * 5);
      
      this.tweens.add({
        targets: impact,
        scaleX: 3.5 + i,
        scaleY: 3.5 + i,
        alpha: 0,
        duration: 450 + i * 100,
        ease: 'Power2.easeOut',
        onComplete: () => impact.destroy()
      });
    }
    
    // Particules modernes
    for (let j = 0; j < 6; j++) {
      const particle = this.add.text(
        x + (Math.random() - 0.5) * 50,
        y + (Math.random() - 0.5) * 50,
        '✧',
        {
          fontSize: '20px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: '#87ceeb'
        }
      );
      particle.setDepth(55);
      
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scaleX: 2.2,
        scaleY: 2.2,
        x: particle.x + (Math.random() - 0.5) * 30,
        y: particle.y + (Math.random() - 0.5) * 30,
        duration: 700,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  createModernDamageEffect(sprite, damage) {
    if (!sprite) return;
    
    // Texte de dégâts moderne
    const damageText = this.add.text(sprite.x, sprite.y - 70, `-${damage}`, {
      fontSize: '32px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ff4444',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(60);
    
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      scaleX: 2.0,
      scaleY: 2.0,
      duration: 1400,
      ease: 'Power2.easeOut',
      onComplete: () => damageText.destroy()
    });
    
    // Effet de tremblement moderne
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 15,
      duration: 70,
      yoyo: true,
      repeat: 5,
      onComplete: () => sprite.setX(originalX)
    });
    
    // Effet de flash moderne avec les couleurs de l'interface
    const originalTint = sprite.tint;
    sprite.setTint(0xff6b6b);
    
    this.tweens.add({
      targets: sprite,
      tint: originalTint,
      duration: 350,
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

  createModernDamageEffectForRole(targetRole, damage) {
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
      this.createModernDamageEffect(targetSprite, damage);
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

  // === ANIMATIONS K.O. MODERNES ===

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
    
    this.createModernKOEffect(this.playerPokemonSprite);
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
    
    this.createModernKOEffect(this.opponentPokemonSprite);
  }

  createModernKOEffect(sprite) {
    if (!sprite) return;
    
    // Spirales K.O. modernes avec couleurs harmonisées
    const spirals = [];
    for (let i = 0; i < 5; i++) {
      const spiral = this.add.text(
        sprite.x + (Math.random() - 0.5) * 70,
        sprite.y - 30,
        '@',
        {
          fontSize: `${22 + i * 4}px`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: i % 2 === 0 ? '#87ceeb' : '#4a90e2',
          fontWeight: 'bold'
        }
      );
      spiral.setDepth(60);
      spirals.push(spiral);
      
      this.tweens.add({
        targets: spiral,
        y: spiral.y - 90,
        x: spiral.x + (Math.random() - 0.5) * 50,
        alpha: 0,
        rotation: Math.PI * 8,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: 2800,
        delay: i * 350,
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
    
    this.showModernBattleEndMessage(winnerData);
    
    setTimeout(() => {
      this.endBattle({ result: 'completed', winner: winnerData.winner });
    }, 4000);
  }

  showModernBattleEndMessage(winnerData) {
    let fullMessage = winnerData.message;
    
    if (winnerData.winner === 'player1') {
      const rewards = this.calculateBattleRewards();
      
      fullMessage += '\n\n' + t('battle.ui.rewards.title') + ' :';
      
      if (rewards.experience > 0) {
        fullMessage += `\n⭐ +${rewards.experience} ${t('battle.ui.rewards.exp_points')}`;
      }
      
      if (rewards.money > 0) {
        fullMessage += `\n💰 +${rewards.money} ${t('battle.ui.rewards.pokedollars')}`;
      }
      
      if (rewards.items && rewards.items.length > 0) {
        rewards.items.forEach(item => {
          fullMessage += `\n📦 ${item.name.toUpperCase()} x${item.quantity}`;
        });
      }
    }
    
    this.showActionMessage(fullMessage);
    
    if (winnerData.winner === 'player1') {
      this.createModernVictoryEffect();
    }
  }

  calculateBattleRewards() {
    const opponentLevel = this.currentOpponentPokemon?.level || 5;
    
    return {
      experience: Math.floor(opponentLevel * 10 + Math.random() * 20),
      money: Math.floor(opponentLevel * 15 + Math.random() * 50),
      items: Math.random() > 0.7 ? [
        { name: t('items.potion.name'), quantity: 1 }
      ] : []
    };
  }

  createModernVictoryEffect() {
    const { width, height } = this.cameras.main;
    
    // Confettis modernes avec couleurs harmonisées
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const confetti = this.add.text(
          Math.random() * width, 
          -20, 
          ['✦', '◆', '▲', '●', '★'][Math.floor(Math.random() * 5)], 
          { 
            fontSize: '22px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: ['#87ceeb', '#4a90e2', '#357abd', '#2a3f5f', '#ffffff'][Math.floor(Math.random() * 5)],
            fontWeight: 'bold'
          }
        );
        confetti.setDepth(200);
        
        this.tweens.add({
          targets: confetti,
          y: height + 50,
          x: confetti.x + (Math.random() - 0.5) * 140,
          rotation: Math.PI * 8,
          alpha: 0,
          scaleX: 2.0,
          scaleY: 2.0,
          duration: 4500,
          ease: 'Power2.easeIn',
          onComplete: () => confetti.destroy()
        });
      }, i * 250);
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
    
    setTimeout(() => this.showNarrativeMessage(t('battle.ui.messages.wild_pokemon_appears').replace('{name}', 'PIKACHU CHROMATIQUE'), true), 2000);
    setTimeout(() => this.showNarrativeMessage(t('battle.ui.messages.go_pokemon').replace('{name}', 'BULBIZARRE'), true), 4000);
    setTimeout(() => this.showNarrativeMessage(t('battle.ui.messages.what_will_you_do'), true), 6000);
    setTimeout(() => this.showActionButtons(), 8000);
  }

  // === SIMULATION ===

  simulatePlayerDamage(damage) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentHp = Math.max(0, 
      this.currentPlayerPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player1', this.currentPlayerPokemon);
    this.createModernDamageEffect(this.playerPokemonSprite, damage);
    
    return this.currentPlayerPokemon.currentHp;
  }

  simulateOpponentDamage(damage) {
    if (!this.currentOpponentPokemon) return 0;
    
    this.currentOpponentPokemon.currentHp = Math.max(0, 
      this.currentOpponentPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player2', this.currentOpponentPokemon);
    this.createModernDamageEffect(this.opponentPokemonSprite, damage);
    
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
  console.log('🎮 Interface moderne harmonisée activée !');
};
