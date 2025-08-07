// client/src/scenes/BattleScene.js - VERSION MODERNE POKÉMON ROUGE/BLEU

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';
import { BattleCaptureManager } from '../managers/Battle/BattleCaptureManager.js';
import { PokemonMovesUI } from '../Battle/PokemonMovesUI.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers essentiels (inchangés pour compatibilité)
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
    this.pokemonMovesUI = null;
    
    // Interface moderne Pokémon Rouge/Bleu
    this.modernHealthBars = { player1: null, player2: null };
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    this.battleUI = null; // Nouveau container principal
    
    // Données Pokémon actuelles (inchangées)
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    this.spriteStructures = new Map();
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    
    // Positions optimisées pour éviter les superpositions
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.78 },        // Plus à gauche et bas
      opponent: { x: 0.70, y: 0.25 },      // Plus au centre-haut pour éviter la barre
      playerPlatform: { x: 0.18, y: 0.88 },
      opponentPlatform: { x: 0.73, y: 0.35 }
    };
    
    // Interface state (inchangé pour compatibilité)
    this.interfaceMode = 'hidden';
    this.battleTranslator = null;
    
    console.log('🎮 [BattleScene] Initialisé - Style Pokémon Rouge/Bleu Moderne');
  }

  // === INITIALISATION (méthodes existantes préservées) ===

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
  }

  create() {
    console.log('[BattleScene] 🎨 Création interface moderne...');

    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      this.addModernStyles();
      this.createGameBoyBattleEnvironment();
      this.createPixelPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      this.createGameBoyHealthBars();
      this.createGameBoyActionInterface();
      this.createPokemonMovesInterface();
      this.createPixelBattleDialog();
      this.setupBattleNetworkEvents();
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
      
      console.log('[BattleScene] ✅ Interface Pokémon Rouge/Bleu créée');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur création:', error);
    }
  }

  // === 🎨 STYLES POKÉMON ROUGE/BLEU ===

  addModernStyles() {
    // Les styles seront appliqués via les éléments Phaser directement
    console.log('🎨 [BattleScene] Styles Pokémon Rouge/Bleu appliqués');
  }

  // === 🌍 ENVIRONNEMENT GAME BOY ===

  createGameBoyBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
    // Background avec effet CRT légèrement verdâtre
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.05;
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      // Teinte Game Boy légèrement verdâtre
      this.battleBackground.setTint(0xf5f5dc);
    } else {
      this.createGameBoyGradientBackground(width, height);
    }
    
    // Bordure style Game Boy
    this.createGameBoyBorder(width, height);
    
    // Sol pixelisé
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
    
    // Bordure externe noire épaisse
    border.lineStyle(8, 0x1a1a1a, 1);
    border.strokeRect(4, 4, width - 8, height - 8);
    
    // Bordure interne gris Game Boy
    border.lineStyle(4, 0x8fad8f, 1);
    border.strokeRect(12, 12, width - 24, height - 24);
  }

  createPixelGround(width, height) {
    const groundY = height * 0.82;
    const ground = this.add.graphics();
    ground.setDepth(-50);
    
    // Sol principal
    ground.fillStyle(0x6B8E6B, 0.8);
    ground.fillRect(0, groundY, width, height - groundY);
    
    // Lignes de séparation pixelisées
    ground.lineStyle(2, 0x4a6b4a, 0.9);
    for (let i = 0; i < 5; i++) {
      const y = groundY + (i * 8);
      ground.lineBetween(0, y, width, y);
    }
    
    // Motif herbe pixelisé
    ground.fillStyle(0x7ba05b, 0.6);
    for (let x = 0; x < width; x += 16) {
      for (let y = groundY + 8; y < height; y += 12) {
        if (Math.random() > 0.7) {
          ground.fillRect(x, y, 4, 6);
        }
      }
    }
  }

  // === 🏠 PLATEFORMES PIXELISÉES ===

  createPixelPokemonPlatforms() {
    const { width, height } = this.cameras.main;
    
    // Plateforme joueur (plus grande, style Game Boy)
    this.createPixelPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      140, 'player'
    );
    
    // Plateforme adversaire (plus petite, en perspective)
    this.createPixelPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      90, 'opponent'
    );
  }

  createPixelPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    platform.setDepth(type === 'player' ? 15 : 10);
    
    // Ombre pixelisée
    platform.fillStyle(0x2d4a2d, 0.6);
    platform.fillEllipse(x + 4, y + 4, size, size * 0.25);
    
    // Base de la plateforme (couleurs Game Boy)
    const baseColor = type === 'player' ? 0x8fad8f : 0x6b8e6b;
    platform.fillStyle(baseColor, 0.9);
    platform.fillEllipse(x, y, size, size * 0.25);
    
    // Détails pixelisés
    platform.fillStyle(0x4a6b4a, 0.8);
    platform.fillEllipse(x, y + 2, size * 0.8, size * 0.15);
    
    // Bordure pixelisée
    platform.lineStyle(3, 0x2d4a2d, 1);
    platform.strokeEllipse(x, y, size, size * 0.25);
    
    // Petites herbes autour
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const grassX = x + Math.cos(angle) * (size * 0.6);
      const grassY = y + Math.sin(angle) * (size * 0.15);
      
      platform.fillStyle(0x7ba05b, 0.7);
      platform.fillRect(grassX - 2, grassY - 3, 4, 6);
    }
  }

  // === 📊 BARRES DE VIE GAME BOY REPOSITIONNÉES (PLUS COMPACTES) ===

  createGameBoyHealthBars() {
    const { width, height } = this.cameras.main;
    
    // Barre adversaire (haut gauche, compacte)
    this.createGameBoyHealthBar('player2', {
      x: width * 0.05,
      y: height * 0.05,
      width: 260,     // ✅ PLUS PETIT !
      height: 55,     // ✅ BEAUCOUP PLUS COMPACT (70→55) !
      isPlayer: false
    });
    
    // Barre joueur (bas droite, compacte)
    this.createGameBoyHealthBar('player1', {
      x: width * 0.55,
      y: height * 0.58,  // ✅ REMONTÉ de 0.65 à 0.58 !
      width: 300,        // ✅ PLUS PETIT !
      height: 75,        // ✅ PLUS COMPACT (85→75) !
      isPlayer: true
    });
  }

  createGameBoyHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    container.setDepth(180);
    
    // Panel principal style Game Boy (plus compact)
    const bgPanel = this.add.graphics();
    
    // Fond principal
    bgPanel.fillStyle(0xf0f8f0, 0.95);
    bgPanel.fillRoundedRect(0, 0, config.width, config.height, 6); // Bordures plus petites
    
    // Bordure épaisse noire
    bgPanel.lineStyle(3, 0x1a1a1a, 1); // Plus fine
    bgPanel.strokeRoundedRect(0, 0, config.width, config.height, 6);
    
    // Bordure intérieure grise
    bgPanel.lineStyle(2, 0x8fad8f, 1);
    bgPanel.strokeRoundedRect(3, 3, config.width - 6, config.height - 6, 4);
    
    // Zone d'information (plus compacte)
    const infoPanel = this.add.graphics();
    infoPanel.fillStyle(0xe8f4e8, 1);
    infoPanel.fillRoundedRect(8, 8, config.width - 16, 22, 3); // ✅ RÉDUIT de 35 à 22 !
    infoPanel.lineStyle(1, 0x6b8e6b, 1);
    infoPanel.strokeRoundedRect(8, 8, config.width - 16, 22, 3);
    
    // Nom Pokémon (style pixel)
    const nameText = this.add.text(12, 12, 
      config.isPlayer ? 'VOTRE POKÉMON' : 'POKÉMON SAUVAGE', {
      fontSize: config.isPlayer ? '12px' : '11px', // ✅ RÉDUIT !
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    
    // Niveau avec style Game Boy (plus petit)
    const levelBg = this.add.graphics();
    levelBg.fillStyle(0x1a1a1a, 1);
    levelBg.fillRoundedRect(config.width - 65, 10, 50, 16, 2); // ✅ PLUS PETIT !
    
    const levelText = this.add.text(config.width - 63, 12, 'LV.--', {
      fontSize: '10px', // ✅ PLUS PETIT !
      fontFamily: 'monospace',
      color: '#f0f8f0',
      fontWeight: 'bold'
    });
    
    // Zone HP (remontée)
    const hpLabel = this.add.text(12, 38, 'HP', { // ✅ REMONTÉ de 55 à 38 !
      fontSize: '12px', // ✅ PLUS PETIT !
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    
    // Fond barre HP
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x2d4a2d, 1);
    hpBarBg.fillRoundedRect(35, 38, config.width - 50, 12, 2); // ✅ REMONTÉ et PLUS FIN !
    
    // Barre HP avec dégradé Game Boy
    const hpBar = this.add.graphics();
    this.updateGameBoyHealthBarVisual(hpBar, config.width - 50, 1.0);
    hpBar.x = 35;
    hpBar.y = 38;
    
    // Texte HP numérique (joueur seulement)
    let hpText = null;
    if (config.isPlayer) {
      hpText = this.add.text(config.width - 80, 55, '--/--', { // ✅ REMONTÉ !
        fontSize: '12px', // ✅ PLUS PETIT !
        fontFamily: 'monospace',
        color: '#1a1a1a',
        fontWeight: 'bold'
      });
    }
    
    // Barre EXP (joueur seulement)
    let expBar = null;
    if (config.isPlayer) {
      const expLabel = this.add.text(12, 62, 'EXP', { // ✅ REMONTÉ !
        fontSize: '10px', // ✅ PLUS PETIT !
        fontFamily: 'monospace',
        color: '#1a1a1a',
        fontWeight: 'bold'
      });
      
      const expBarBg = this.add.graphics();
      expBarBg.fillStyle(0x6b8e6b, 1);
      expBarBg.fillRoundedRect(35, 64, config.width - 50, 8, 2); // ✅ REMONTÉ et PLUS FIN !
      
      expBar = this.add.graphics();
      expBar.fillStyle(0x4169e1, 1);
      expBar.fillRoundedRect(0, 0, 0, 8, 2);
      expBar.x = 35;
      expBar.y = 64;
      
      container.add([expLabel, expBarBg, expBar]);
    }
    
    container.add([bgPanel, infoPanel, nameText, levelBg, levelText, hpLabel, hpBarBg, hpBar]);
    if (hpText) container.add(hpText);
    
    container.setVisible(false);
    
    this.modernHealthBars[type] = {
      container, nameText, levelText, hpBar, hpText, expBar, config
    };
  }

  updateGameBoyHealthBarVisual(graphics, maxWidth, hpPercentage) {
    graphics.clear();
    
    // Couleurs Game Boy selon HP
    let color1, color2;
    if (hpPercentage > 0.6) {
      color1 = 0x4caf50; // Vert foncé
      color2 = 0x8bc34a; // Vert clair
    } else if (hpPercentage > 0.3) {
      color1 = 0xff9800; // Orange foncé
      color2 = 0xffc107; // Orange clair
    } else {
      color1 = 0xf44336; // Rouge foncé
      color2 = 0xff5722; // Rouge clair
    }
    
    const width = Math.max(0, maxWidth * hpPercentage);
    
    // Barre principale
    graphics.fillStyle(color1, 1);
    graphics.fillRoundedRect(0, 0, width, 16, 3);
    
    // Effet de brillance Game Boy
    graphics.fillStyle(color2, 0.7);
    graphics.fillRoundedRect(2, 2, Math.max(0, width - 4), 6, 2);
    
    // Pixels de détail
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillRoundedRect(2, 2, Math.max(0, width - 4), 2, 1);
  }

  // === 🎮 INTERFACE D'ACTIONS GAME BOY ADAPTIVE (COMPACTE) ===

  createGameBoyActionInterface() {
    const { width, height } = this.cameras.main;
    
    // Conteneur principal en bas (plus compact)
    this.actionInterface = this.add.container(0, height - 120); // Réduit de 160 à 120
    this.actionInterface.setDepth(190);
    
    // Panel principal style Game Boy (taille réduite)
    this.mainPanel = this.add.graphics();
    this.drawMainPanel(width, 100, 'buttons'); // Réduit de 140 à 100
    this.actionInterface.add(this.mainPanel);
    
    // Zone de texte adaptative (masquée par défaut)
    this.textPanel = this.add.graphics();
    this.textPanel.setVisible(false);
    this.actionInterface.add(this.textPanel);
    
    // Texte d'action/narratif adaptatif
    this.actionMessageText = this.add.text(width/2, 30, '', { // Position plus haute
      fontSize: '16px', // Police plus petite
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: width - 80 }
    });
    this.actionMessageText.setOrigin(0.5, 0.5);
    this.actionMessageText.setVisible(false);
    this.actionInterface.add(this.actionMessageText);
    
    // Créer boutons Game Boy
    this.createGameBoyActionButtons(width);
    
    // Indicateur de continuation pour texte narratif
    this.continueArrow = this.add.text(width - 50, 80, '▼', { // Position ajustée
      fontSize: '14px', // Plus petit
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    this.continueArrow.setOrigin(0.5);
    this.continueArrow.setVisible(false);
    this.actionInterface.add(this.continueArrow);
    
    // Animation clignotante pour l'indicateur
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
    
    // Adapter la hauteur selon le mode (plus compact)
    const panelHeight = mode === 'narrative' ? 90 : height; // Réduit
    const panelY = mode === 'narrative' ? 10 : 0; // Position ajustée
    
    // Panel principal
    this.mainPanel.fillStyle(0xf0f8f0, 0.98);
    this.mainPanel.fillRoundedRect(20, panelY, width - 40, panelHeight, 8); // Bordures plus petites
    
    // Bordure épaisse
    this.mainPanel.lineStyle(4, 0x1a1a1a, 1); // Plus fine
    this.mainPanel.strokeRoundedRect(20, panelY, width - 40, panelHeight, 8);
    
    // Bordure intérieure
    this.mainPanel.lineStyle(2, 0x8fad8f, 1);
    this.mainPanel.strokeRoundedRect(24, panelY + 4, width - 48, panelHeight - 8, 6); // Ajusté
  }

  drawTextPanel(width, mode) {
    if (!this.textPanel) return;
    
    this.textPanel.clear();
    
    if (mode === 'narrative') {
      // Panel pour le texte narratif (plus compact)
      this.textPanel.fillStyle(0xe8f4e8, 1);
      this.textPanel.fillRoundedRect(30, 20, width - 60, 60, 6); // Plus petit
      this.textPanel.lineStyle(2, 0x6b8e6b, 1);
      this.textPanel.strokeRoundedRect(30, 20, width - 60, 60, 6);
    } else if (mode === 'message') {
      // Panel plus petit pour les messages d'action
      this.textPanel.fillStyle(0xe8f4e8, 1);
      this.textPanel.fillRoundedRect(30, 10, width - 60, 35, 6); // Plus petit
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
    
    // Positions optimisées pour interface compacte
    const buttonWidth = (width - 100) / 2;
    const buttonHeight = 26;                // ✅ ENCORE PLUS PETIT (28→26) !
    const startX = 30;
    const startY = 25;                      // ✅ ENCORE PLUS HAUT (40→25) !
    const gapX = 15;
    const gapY = 5;                         // ✅ ESPACEMENT MINIMUM (6→5) !
    
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
    
    // Fond du bouton
    const bg = this.add.graphics();
    bg.fillStyle(action.color, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 4); // Bordures plus petites
    
    // Bordure style Game Boy
    bg.lineStyle(2, 0x1a1a1a, 1); // Plus fine
    bg.strokeRoundedRect(0, 0, width, height, 4);
    
    // Effet de relief
    bg.lineStyle(1, 0xffffff, 0.7); // Plus fin
    bg.strokeRoundedRect(1, 1, width - 2, height - 2, 3);
    
    // Icône (plus petite)
    const icon = this.add.text(8, height/2, action.icon, {
      fontSize: '14px', // Réduit
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    icon.setOrigin(0, 0.5);
    
    // Texte (plus petit)
    const text = this.add.text(width/2, height/2, action.text, {
      fontSize: '12px', // Réduit
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    
    buttonContainer.add([bg, icon, text]);
    buttonContainer.setSize(width, height);
    buttonContainer.setInteractive();
    
    // Effets hover Game Boy (conservés)
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
    
    // Action clic (inchangée pour compatibilité)
    buttonContainer.on('pointerdown', () => {
      this.handleActionButton(action.key);
    });
    
    return buttonContainer;
  }

  // === 💬 DIALOGUE PIXELISÉ ===

  createPixelBattleDialog() {
    const { width, height } = this.cameras.main;
    this.battleDialog = this.add.container(0, height - 120);
    this.battleDialog.setDepth(185);
    
    // Panel de dialogue Game Boy
    const dialogPanel = this.add.graphics();
    dialogPanel.fillStyle(0xf0f8f0, 0.98);
    dialogPanel.fillRoundedRect(15, 0, width - 30, 100, 10);
    
    // Bordure épaisse
    dialogPanel.lineStyle(4, 0x1a1a1a, 1);
    dialogPanel.strokeRoundedRect(15, 0, width - 30, 100, 10);
    
    // Fond intérieur
    dialogPanel.fillStyle(0xe8f4e8, 1);
    dialogPanel.fillRoundedRect(25, 10, width - 50, 80, 6);
    
    // Bordure intérieure
    dialogPanel.lineStyle(2, 0x6b8e6b, 1);
    dialogPanel.strokeRoundedRect(25, 10, width - 50, 80, 6);
    
    // Texte avec police monospace
    this.dialogText = this.add.text(40, 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold',
      wordWrap: { width: width - 80 },
      lineSpacing: 5
    });
    this.dialogText.setOrigin(0, 0.5);
    
    // Indicateur de continuation style Game Boy
    const continueArrow = this.add.text(width - 50, 75, '▼', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    continueArrow.setOrigin(0.5);
    
    // Animation clignotante
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

  // === 💬 DIALOGUE PIXELISÉ (MAINTENU POUR COMPATIBILITÉ) ===

  createPixelBattleDialog() {
    const { width, height } = this.cameras.main;
    this.battleDialog = this.add.container(0, height - 120);
    this.battleDialog.setDepth(185);
    
    // Panel de dialogue Game Boy
    const dialogPanel = this.add.graphics();
    dialogPanel.fillStyle(0xf0f8f0, 0.98);
    dialogPanel.fillRoundedRect(15, 0, width - 30, 100, 10);
    
    // Bordure épaisse
    dialogPanel.lineStyle(4, 0x1a1a1a, 1);
    dialogPanel.strokeRoundedRect(15, 0, width - 30, 100, 10);
    
    // Fond intérieur
    dialogPanel.fillStyle(0xe8f4e8, 1);
    dialogPanel.fillRoundedRect(25, 10, width - 50, 80, 6);
    
    // Bordure intérieure
    dialogPanel.lineStyle(2, 0x6b8e6b, 1);
    dialogPanel.strokeRoundedRect(25, 10, width - 50, 80, 6);
    
    // Texte avec police monospace
    this.dialogText = this.add.text(40, 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold',
      wordWrap: { width: width - 80 },
      lineSpacing: 5
    });
    this.dialogText.setOrigin(0, 0.5);
    
    // Indicateur de continuation style Game Boy
    const continueArrow = this.add.text(width - 50, 75, '▼', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#1a1a1a'
    });
    continueArrow.setOrigin(0.5);
    
    // Animation clignotante
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

  detectBattleSpriteStructure(width, height, view) {
    console.log(`🔍 [BattleScene] Détection structure pour ${width}×${height} (${view})`);
    
    const rows = 1;
    const commonFrameWidths = [32, 48, 64, 80, 96, 128];
    const validOptions = [];
    
    commonFrameWidths.forEach(frameWidth => {
      if (width % frameWidth === 0) {
        const cols = width / frameWidth;
        const frameHeight = height / rows;
        
        if (cols >= 10 && cols <= 200 && frameHeight >= 32) {
          validOptions.push({
            cols: cols,
            rows: rows,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            totalFrames: cols,
            description: `${cols} frames (${frameWidth}×${frameHeight}px)`,
            score: this.calculateSpriteScore(frameWidth, frameHeight, cols, rows),
            method: 'common_width'
          });
        }
      }
    });
    
    if (validOptions.length === 0) {
      for (let frameWidth = 32; frameWidth <= 128; frameWidth += 4) {
        if (width % frameWidth === 0) {
          const cols = width / frameWidth;
          if (cols >= 10 && cols <= 200) {
            validOptions.push({
              cols: cols,
              rows: rows,
              frameWidth: frameWidth,
              frameHeight: height,
              totalFrames: cols,
              description: `${cols} frames auto (${frameWidth}×${height}px)`,
              score: this.calculateSpriteScore(frameWidth, height, cols, rows),
              method: 'auto_division'
            });
          }
        }
      }
    }
    
    if (validOptions.length === 0) {
      const estimatedCols = Math.round(width / 64);
      const frameWidth = width / estimatedCols;
      
      return {
        cols: estimatedCols,
        rows: rows,
        frameWidth: Math.floor(frameWidth),
        frameHeight: height,
        totalFrames: estimatedCols,
        description: `${estimatedCols} frames estimé`,
        method: 'fallback_estimate'
      };
    }
    
    validOptions.sort((a, b) => b.score - a.score);
    return validOptions[0];
  }

  calculateSpriteScore(frameW, frameH, cols, rows) {
    let score = 0;
    
    const commonSizes = [48, 64, 80, 96];
    if (commonSizes.includes(frameW)) score += 30;
    if (commonSizes.includes(frameH)) score += 20;
    
    const aspectRatio = frameW / frameH;
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 25;
    else if (aspectRatio >= 0.6 && aspectRatio <= 1.5) score += 15;
    
    if (rows === 1) score += 20;
    if (cols >= 20 && cols <= 50) score += 15;
    else if (cols >= 10 && cols <= 100) score += 10;
    
    if (frameW < 32 || frameW > 200) score -= 20;
    if (frameH < 32 || frameH > 200) score -= 20;
    
    return score;
  }

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
    
    if (!gameRoom) {
      console.warn('⚠️ [BattleScene] GameRoom non trouvé pour BattleInventoryUI');
      return;
    }
    
    if (!this.battleNetworkHandler) {
      console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant');
      return;
    }
    
    this.battleInventoryUI = new BattleInventoryUI(gameRoom, battleContext);
    console.log('⚔️ BattleInventoryUI créé avec CaptureManager');
  }

  createPokemonMovesInterface() {
    // ✅ DÉSACTIVER L'ANCIENNE INTERFACE POPUP
    console.log('🚫 [BattleScene] Interface PokemonMovesUI désactivée - utilisation système intégré');
    
    // Ne plus créer la popup, on utilise le système intégré
    this.pokemonMovesUI = null;
    
    // Pas d'événements à écouter pour l'ancienne interface
    console.log('✅ [BattleScene] Système d\'attaques intégré activé');
  }

  handleActionButton(actionKey) {
    console.log('[BattleScene] 🎯 Action:', actionKey);
    
    this.hideActionButtons();
    
    switch (actionKey) {
      case 'attack':
        if (!this.pokemonMovesUI) {
          console.error('❌ [BattleScene] PokemonMovesUI non initialisé');
          this.showActionMessage('Interface attaques non disponible');
          setTimeout(() => {
            this.showActionButtons();
          }, 2000);
          return;
        }

        if (!this.battleNetworkHandler || !this.battleNetworkHandler.canSendBattleActions?.()) {
          console.error('❌ [BattleScene] NetworkHandler non connecté');
          this.showActionMessage('Non connecté au combat');
          setTimeout(() => {
            this.showActionButtons();
          }, 2000);
          return;
        }

        this.showActionMessage('Chargement des attaques...');

        console.log('🎮 [BattleScene] Ouverture menu attaques...');
        
        const safetyTimeout = setTimeout(() => {
          console.error('⏰ [BattleScene] Timeout sécurité - retour menu principal');
          this.showActionMessage('Timeout - réessayez');
          setTimeout(() => {
            this.showActionButtons();
          }, 2000);
        }, 6000);

        const originalRequestMoves = this.pokemonMovesUI.requestMoves.bind(this.pokemonMovesUI);
        this.pokemonMovesUI.requestMoves = () => {
          clearTimeout(safetyTimeout);
          originalRequestMoves();
        };

        this.pokemonMovesUI.requestMoves();
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
          console.error('❌ [BattleScene] Erreur inventaire:', error);
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
          console.error('❌ [BattleScene] Erreur fuite:', error);
          this.showActionMessage('Erreur lors de la fuite');
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
    }
  }

  initializeCaptureManager() {
    if (!this.battleNetworkHandler) {
      console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant pour CaptureManager');
      return;
    }
    
    const playerRole = this.playerRole || 'player1';
    
    this.captureManager = new BattleCaptureManager(
      this,
      this.battleNetworkHandler,
      playerRole
    );
    
    console.log('🎯 [BattleScene] CaptureManager initialisé');
  }

  // === AFFICHAGE POKÉMON AVEC STYLE AMÉLIORÉ ===

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
      this.playerPokemonSprite.setScale(4.0); // Légèrement plus gros
      this.playerPokemonSprite.setDepth(25);
      this.playerPokemonSprite.setOrigin(0.5, 1);
      
      // Effet pixelisé
      this.playerPokemonSprite.texture.setFilter(Phaser.Textures.NEAREST);
      
      this.animatePixelPokemonEntry(this.playerPokemonSprite, 'left');
      this.currentPlayerPokemon = pokemonData;
      
      setTimeout(() => {
        this.updateModernHealthBar('player1', pokemonData);
      }, 500);
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur Pokémon joueur:', error);
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
      const x = width * this.pokemonPositions.opponent.x;
      const y = height * this.pokemonPositions.opponent.y;
      
      this.opponentPokemonSprite = this.add.sprite(x, y, spriteKey, 0);
      this.opponentPokemonSprite.setScale(3.2); // Plus petit pour la perspective
      this.opponentPokemonSprite.setDepth(20);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      // Effet pixelisé
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
      console.error('[BattleScene] ❌ Erreur Pokémon adversaire:', error);
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
    
    // Animation d'entrée avec rebond Game Boy
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
    // Animation plus subtile style Game Boy
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
    
    // Effet chromatique avec couleurs Game Boy
    this.tweens.add({
      targets: sprite,
      tint: [0xffd700, 0xffff00, 0xffd700, 0xffffff],
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Particules dorées
    this.createShinyParticles(sprite);
  }

  createPixelSparkles(sprite) {
    // Petites étoiles pixelisées autour du Pokémon
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
    const position = type === 'player' ? 
      { x: width * this.pokemonPositions.player.x, y: height * this.pokemonPositions.player.y } :
      { x: width * this.pokemonPositions.opponent.x, y: height * this.pokemonPositions.opponent.y };
    
    const container = this.add.container(position.x, position.y);
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getGameBoyTypeColor(primaryType);
    
    // Corps principal avec bordure Game Boy
    const body = this.add.graphics();
    body.fillStyle(typeColor, 0.9);
    body.fillCircle(0, 0, 45);
    body.lineStyle(4, 0x1a1a1a, 1);
    body.strokeCircle(0, 0, 45);
    body.lineStyle(2, 0xffffff, 0.8);
    body.strokeCircle(0, 0, 42);
    
    // Point d'interrogation pixelisé
    const questionMark = this.add.text(0, -5, '?', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#1a1a1a',
      fontWeight: 'bold'
    });
    questionMark.setOrigin(0.5);
    
    // Nom avec style Game Boy
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
    // Couleurs Game Boy selon le type
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

  // === MESSAGES AVEC STYLE GAME BOY ADAPTATIF ===

  showBattleMessage(message, duration = 0) {
    // Utiliser le nouveau système adaptatif
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
      console.error('[BattleScene] ❌ Barre de vie non trouvée:', type);
      return;
    }
    
    if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
      console.warn(`[BattleScene] ⚠️ HP manquants pour ${type}`);
      return;
    }
    
    // Mise à jour nom avec style Game Boy
    const displayName = pokemonData.name ? pokemonData.name.toUpperCase() : 'POKÉMON';
    healthBar.nameText.setText(healthBar.config.isPlayer ? `VOTRE ${displayName}` : displayName);
    healthBar.levelText.setText(`LV.${pokemonData.level || 1}`);
    
    // Calcul pourcentage
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    // Animation barre avec style Game Boy
    this.animateGameBoyHealthBar(healthBar.hpBar, healthBar.config.width - 70, hpPercentage);
    
    // Texte HP joueur
    if (healthBar.config.isPlayer && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    // Barre EXP joueur
    if (healthBar.config.isPlayer && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateGameBoyExpBar(healthBar.expBar, healthBar.config.width - 70, expPercentage);
    }
    
    // Affichage avec animation Game Boy
    healthBar.container.setVisible(true);
    healthBar.container.setAlpha(0);
    this.tweens.add({
      targets: healthBar.container,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut'
    });
  }

  animateGameBoyHealthBar(graphics, maxWidth, targetPercentage) {
    let currentPercentage = graphics.currentPercentage || 1;
    graphics.currentPercentage = targetPercentage;
    
    this.tweens.add({
      targets: { value: currentPercentage },
      value: targetPercentage,
      duration: 1000,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        this.updateGameBoyHealthBarVisual(graphics, maxWidth, percentage);
      }
    });
  }

  animateGameBoyExpBar(graphics, maxWidth, targetPercentage) {
    const width = Math.max(0, maxWidth * targetPercentage);
    graphics.clear();
    graphics.fillStyle(0x4169e1, 1);
    graphics.fillRoundedRect(0, 0, width, 10, 2);
    graphics.fillStyle(0x6495ed, 0.6);
    graphics.fillRoundedRect(1, 1, Math.max(0, width - 2), 3, 1);
  }

  // === 🎮 GESTION DES MODES : ACTIONS vs ATTAQUES ===

  // Mode boutons d'action normaux
  showActionButtons() {
    console.log('🎮 [BattleScene] Mode BOUTONS ACTIONS activé');
    const { width } = this.cameras.main;
    
    this.hideActionMessage();
    this.hideNarrativeMode();
    this.hideMoveButtons(); // S'assurer que les attaques sont cachées
    
    // Redessiner le panel pour les boutons (compact)
    this.drawMainPanel(width, 100, 'buttons');
    
    // Cacher le panel de texte
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
    
    // Montrer les boutons d'action
    if (this.actionInterface) {
      this.actionInterface.list.forEach(child => {
        if (child.isActionButton) {
          child.setVisible(true);
        }
      });
      
      this.actionInterface.setVisible(true);
      this.actionInterface.setAlpha(1);
    }
    
    // Cacher l'indicateur de continuation
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
    
    this.interfaceMode = 'buttons';
  }

  // ✅ NOUVEAU : Mode boutons d'attaques (remplace les 4 boutons)
  showMoveButtons(moves) {
    console.log('⚔️ [BattleScene] Mode ATTAQUES activé avec:', moves);
    const { width } = this.cameras.main;
    
    this.hideActionButtons(); // Cacher les boutons d'action
    this.hideActionMessage();
    this.hideNarrativeMode();
    
    // Redessiner le panel pour les attaques
    this.drawMainPanel(width, 100, 'moves');
    
    // Cacher le panel de texte
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
    
    // Créer/montrer les boutons d'attaques
    this.createMoveButtons(moves, width);
    
    // Cacher l'indicateur de continuation
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
    
    this.interfaceMode = 'moves';
  }

  // ✅ NOUVEAU : Créer les boutons d'attaques dynamiquement
  createMoveButtons(moves, width) {
    // Nettoyer les anciens boutons d'attaques s'ils existent
    if (this.moveButtons) {
      this.moveButtons.forEach(button => button.destroy());
    }
    this.moveButtons = [];
    
    // Positions identiques aux boutons d'action
    const buttonWidth = (width - 100) / 2;
    const buttonHeight = 26;
    const startX = 30;
    const startY = 25;
    const gapX = 15;
    const gapY = 5;
    
    // Couleurs par type d'attaque
    const moveTypeColors = {
      'normal': 0xa8a8a8,
      'fire': 0xff4444,
      'water': 0x4488ff,
      'electric': 0xffd700,
      'grass': 0x44dd44,
      'ice': 0x88ddff,
      'fighting': 0xcc2222,
      'poison': 0xaa44aa,
      'ground': 0xddcc44,
      'flying': 0xaabbff,
      'psychic': 0xff4488,
      'bug': 0xaabb22,
      'rock': 0xbbaa44,
      'ghost': 0x7755aa,
      'dragon': 0x7744ff,
      'dark': 0x775544,
      'steel': 0xaaaaaa,
      'fairy': 0xffaaee
    };
    
    // Créer jusqu'à 4 boutons d'attaques
    for (let i = 0; i < Math.min(4, moves.length); i++) {
      const move = moves[i];
      const x = startX + (i % 2) * (buttonWidth + gapX);
      const y = startY + Math.floor(i / 2) * (buttonHeight + gapY);
      
      // Couleur selon le type d'attaque ou couleur par défaut
      const moveColor = moveTypeColors[move.type?.toLowerCase()] || 0x64b5f6;
      
      const moveAction = {
        key: `move_${move.id}`,
        text: move.name.toUpperCase().substring(0, 10), // Limiter la longueur
        color: moveColor,
        icon: this.getMoveIcon(move.type),
        moveData: move
      };
      
      const button = this.createGameBoyButton(x, y, buttonWidth, buttonHeight, moveAction);
      button.isMoveButton = true;
      
      // Event handler spécifique aux attaques
      button.removeAllListeners('pointerdown');
      button.on('pointerdown', () => {
        this.handleMoveButton(move);
      });
      
      this.actionInterface.add(button);
      this.moveButtons.push(button);
    }
    
    // Si moins de 4 attaques, ajouter un bouton "RETOUR"
    if (moves.length < 4 || true) { // Toujours ajouter le bouton retour
      const backX = startX + (3 % 2) * (buttonWidth + gapX); // Position du 4e bouton
      const backY = startY + Math.floor(3 / 2) * (buttonHeight + gapY);
      
      const backAction = {
        key: 'back',
        text: 'RETOUR',
        color: 0x607d8b,
        icon: '◀'
      };
      
      const backButton = this.createGameBoyButton(backX, backY, buttonWidth, buttonHeight, backAction);
      backButton.isMoveButton = true;
      
      backButton.removeAllListeners('pointerdown');
      backButton.on('pointerdown', () => {
        this.returnToActionButtons();
      });
      
      this.actionInterface.add(backButton);
      this.moveButtons.push(backButton);
    }
  }

  // ✅ NOUVEAU : Masquer les boutons d'attaques
  hideMoveButtons() {
    if (this.moveButtons) {
      this.moveButtons.forEach(button => {
        if (button && button.setVisible) {
          button.setVisible(false);
        }
      });
    }
  }

  // ✅ NOUVEAU : Retour aux boutons d'action
  returnToActionButtons() {
    console.log('🔙 [BattleScene] Retour aux boutons d\'action');
    
    // Masquer et détruire les boutons d'attaques
    if (this.moveButtons) {
      this.moveButtons.forEach(button => {
        if (button && button.destroy) {
          button.destroy();
        }
      });
      this.moveButtons = [];
    }
    
    // Réafficher les boutons d'action
    this.showActionButtons();
  }

  // ✅ NOUVEAU : Gestionnaire d'attaque sélectionnée
  handleMoveButton(move) {
    console.log('⚔️ [BattleScene] Attaque sélectionnée:', move.name);
    
    // Afficher le message d'attaque
    const pokemonName = this.currentPlayerPokemon?.name || 'Votre Pokémon';
    this.showActionMessage(`${pokemonName} utilise ${move.name} !`);
    
    // Masquer les boutons d'attaques
    this.hideMoveButtons();
    
    // Émettre l'événement pour le système de combat
    this.scene.events.emit('battleActionSelected', {
      type: 'move',
      moveId: move.id,
      moveName: move.name,
      moveData: move
    });
    
    // Envoyer au réseau si disponible
    if (this.battleNetworkHandler && this.battleNetworkHandler.selectMove) {
      try {
        this.battleNetworkHandler.selectMove(move.id, move);
      } catch (error) {
        console.error('❌ [BattleScene] Erreur envoi attaque:', error);
      }
    }
  }

  // ✅ NOUVEAU : Icônes par type d'attaque
  getMoveIcon(moveType) {
    const typeIcons = {
      'normal': '○',
      'fire': '🔥',
      'water': '💧',
      'electric': '⚡',
      'grass': '🌿',
      'ice': '❄',
      'fighting': '👊',
      'poison': '☠',
      'ground': '🌍',
      'flying': '🦅',
      'psychic': '🧠',
      'bug': '🐛',
      'rock': '🗿',
      'ghost': '👻',
      'dragon': '🐉',
      'dark': '🌙',
      'steel': '⚙',
      'fairy': '✨'
    };
    
    return typeIcons[moveType?.toLowerCase()] || '⚔';
  }

  // Mode message court (attaques, erreurs)
  showActionMessage(message) {
    console.log('💬 [BattleScene] Mode MESSAGE:', message);
    const { width } = this.cameras.main;
    
    this.hideActionButtons();
    this.hideNarrativeMode();
    
    // Redessiner le panel pour message court
    this.drawMainPanel(width, 100, 'message');
    this.drawTextPanel(width, 'message');
    
    if (!this.actionMessageText) return;
    
    // Repositionner le texte pour le mode message (position ajustée)
    this.actionMessageText.setPosition(width/2, 27); // Plus haut
    this.actionMessageText.setText(message.toUpperCase());
    this.actionMessageText.setVisible(true);
    
    // Montrer le panel de texte
    if (this.textPanel) {
      this.textPanel.setVisible(true);
    }
    
    // Cacher l'indicateur de continuation
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

  // Mode texte narratif (apparitions, événements)
  showNarrativeMessage(message, showContinue = true) {
    console.log('📖 [BattleScene] Mode NARRATIF:', message);
    const { width } = this.cameras.main;
    
    this.hideActionButtons();
    this.hideActionMessage();
    
    // Redessiner le panel pour narratif (compact)
    this.drawMainPanel(width, 90, 'narrative');
    this.drawTextPanel(width, 'narrative');
    
    if (!this.actionMessageText) return;
    
    // Repositionner le texte pour le mode narratif (position ajustée)
    this.actionMessageText.setPosition(width/2, 50); // Position centrée
    this.actionMessageText.setText(message.toUpperCase());
    this.actionMessageText.setVisible(true);
    
    // Montrer le panel de texte
    if (this.textPanel) {
      this.textPanel.setVisible(true);
    }
    
    // Montrer/cacher l'indicateur de continuation
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

  // Masquer mode message
  hideActionMessage() {
    if (!this.actionMessageText) return;
    this.actionMessageText.setVisible(false);
    
    if (this.textPanel) {
      this.textPanel.setVisible(false);
    }
  }

  // Masquer mode narratif
  hideNarrativeMode() {
    this.hideActionMessage(); // Même logique de base
    
    if (this.continueArrow) {
      this.continueArrow.setVisible(false);
    }
  }

  // Masquer boutons d'action
  hideActionButtons() {
    if (!this.actionInterface) return;
    
    this.actionInterface.list.forEach(child => {
      if (child.isActionButton) {
        child.setVisible(false);
      }
    });
  }

  // === EFFETS VISUELS GAME BOY ===

  createAttackEffect(attacker, target) {
    if (!attacker || !target) return;
    
    const originalX = attacker.x;
    
    // Animation de charge plus prononcée
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
    // Effet d'impact style Game Boy avec plusieurs cercles
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
    
    // Étoiles d'impact
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
    
    // Texte de dégâts style Game Boy
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
    
    // Shake plus prononcé
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 12,
      duration: 60,
      yoyo: true,
      repeat: 6,
      onComplete: () => sprite.setX(originalX)
    });
    
    // Flash rouge
    const originalTint = sprite.tint;
    sprite.setTint(0xff4444);
    
    this.tweens.add({
      targets: sprite,
      tint: originalTint,
      duration: 300,
      ease: 'Power2.easeOut'
    });
  }

  // === CHARGEMENT SPRITES (inchangé pour compatibilité) ===

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
    const structureKey = `${pokemonId}_${view}`;
    
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
          
          console.log(`📐 [BattleScene] ${spriteKey}: ${cols} colonnes de ${frameWidth}×${frameHeight}px`);
          
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
      
      // Fond Game Boy
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#8fad8f' : '#b8d4b8');
      gradient.addColorStop(1, view === 'front' ? '#6b8e6b' : '#8fad8f');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Bordure Game Boy
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Bordure intérieure
      ctx.strokeStyle = '#f0f8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(48, 48, 36, 0, Math.PI * 2);
      ctx.stroke();
      
      // Point d'interrogation pixelisé
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 48, 48);
      
      this.textures.addCanvas(fallbackKey, canvas);
    }
    
    return fallbackKey;
  }

  // === ÉVÉNEMENTS RÉSEAU (inchangés pour compatibilité) ===

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    this.battleNetworkHandler.on('actionResult', (data) => {
      if (data.success) {
        console.log('✅ [BattleScene] Action confirmée par le serveur');
        
        if (data.battleEvents && data.battleEvents.length > 0) {
          this.processBattleEventsServerDriven(data.battleEvents);
        }
      }
      
      if (!data.success) {
        this.showActionMessage(`Erreur: ${data.error}`);
      }
    });

    this.battleNetworkHandler.on('moveUsed', (data) => {
      console.log('⚔️ [BattleScene] moveUsed avec données PP:', data);
      
      const message = `${data.attackerName} utilise ${data.moveName} !`;
      this.showActionMessage(message);
      
      if (data.attackerRole === 'player1') {
        this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      } else {
        this.createAttackEffect(this.opponentPokemonSprite, this.playerPokemonSprite);
      }
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      console.log('💥 [BattleScene] damageDealt - GÈRE LES DÉGÂTS:', data);
      
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
      console.log('👋 [BattleScene] Déconnexion BattleRoom détectée:', data);
      
      setTimeout(() => {
        this.endBattle({ result: 'disconnected' });
      }, 1000);
    });

    this.battleNetworkHandler.on('requestMovesResult', (data) => {
      console.log('📋 [BattleScene] Résultat demande attaques:', data);
      
      if (!data.success) {
        console.error('❌ [BattleScene] Erreur attaques:', data.error);
        
        this.hideActionMessage();
        this.showActionMessage(`Erreur: ${data.error}`);
        
        if (this.pokemonMovesUI) {
          this.pokemonMovesUI.cancelRequest();
        }
        
        setTimeout(() => {
          this.showActionButtons();
        }, 3000);
      } else {
        this.hideActionMessage();
      }
    });

    this.battleNetworkHandler.on('connectionTimeout', (data) => {
      console.error('⏰ [BattleScene] Timeout connexion:', data);
      this.showActionMessage('Connexion instable - réessayez');
      
      if (this.pokemonMovesUI) {
        this.pokemonMovesUI.cancelRequest();
      }
      
      setTimeout(() => {
        this.showActionButtons();
      }, 3000);
    });

    this.battleNetworkHandler.on('networkError', (data) => {
      console.error('🌐 [BattleScene] Erreur réseau:', data);
      this.showActionMessage('Erreur réseau - reconnexion...');
      
      if (this.pokemonMovesUI) {
        this.pokemonMovesUI.cancelRequest();
      }
      
      setTimeout(() => {
        this.showActionButtons();
      }, 4000);
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
    
    this.battleNetworkHandler.on('aiThinking', (data) => {
      this.handleBattleEvent('opponentTurn', data);
    });
    
    this.battleNetworkHandler.on('turnChanged', (data) => {
      if (data.currentTurn === 'player1') {
        // Le serveur enverra yourTurn quand il voudra
      } else if (data.currentTurn === 'player2') {
        this.hideActionButtons();
      } else if (data.currentTurn === 'narrator') {
        this.hideActionButtons();
      }
    });
    
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.hideActionButtons();
    });
    
    this.battleNetworkHandler.on('battleJoined', (data) => {
      this.playerRole = data.yourRole;
      this.battleTranslator = new BattleTranslator(this.playerRole);
      console.log('🌍 [BattleScene] Traducteur initialisé pour:', this.playerRole);
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleNetworkBattleStart(data);
    });

    this.battleNetworkHandler.on('koMessage', (data) => {
      console.log('💀 [BattleScene] K.O. Message reçu:', data);
      
      this.showActionMessage(data.message);
      
      if (data.playerRole === 'player1') {
        this.showPlayerPokemonFaint();
      } else {
        this.showEnemyPokemonFaint();
      }
    });
    
    this.battleNetworkHandler.on('winnerAnnounce', (data) => {
      console.log('🏆 [BattleScene] Winner Announce reçu:', data);
      
      setTimeout(() => {
        this.transitionToEndBattle(data);
      }, 1500);
    });

    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleBattleEvent('yourTurn', data);
    });
  }

  // === SYSTÈME DE TRADUCTION ADAPTATIF AVEC MESSAGES D'INTRO ===

  handleBattleEvent(eventType, data = {}) {
    console.log(`🌍 [BattleScene] Événement: ${eventType}`, data);
    if (eventType === 'moveUsed') return;
    
    // Actions d'interface
    if (eventType === 'yourTurn') {
      this.showActionButtons(); // Mode boutons
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
    
    // ✅ NOUVEAU : Gestion spéciale des événements d'introduction
    const introEvents = ['wildPokemonAppears', 'battleStart'];
    const narrativeEvents = ['pokemonFainted', 'victory', 'defeat'];
    
    // Traduction du message avec mode adaptatif
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        if (introEvents.includes(eventType)) {
          // ✅ Messages d'introduction avec indicateur de continuation
          this.showNarrativeMessage(message, true);
        } else if (narrativeEvents.includes(eventType)) {
          // Messages narratifs importants avec continuation
          this.showNarrativeMessage(message, true);
        } else {
          // Autres messages sans continuation
          this.showNarrativeMessage(message, false);
        }
        
        console.log(`💬 Message traduit (${this.battleTranslator.language}): "${message}"`);
      }
    } else {
      console.warn('[BattleScene] ⚠️ Traducteur non initialisé pour:', eventType);
      
      // ✅ FALLBACK : Messages par défaut pour l'intro
      if (eventType === 'wildPokemonAppears') {
        const pokemonName = data.pokemonName || 'UN POKÉMON SAUVAGE';
        this.showNarrativeMessage(`${pokemonName} APPARAÎT !`, true);
      } else if (eventType === 'battleStart') {
        this.showNarrativeMessage('QUE VOULEZ-VOUS FAIRE ?', true);
      }
    }
  }

  processBattleEventsServerDriven(battleEvents) {
    console.log('⚔️ [BattleScene] Traitement événements server-driven:', battleEvents);
    
    battleEvents.forEach((event, index) => {
      if (event.type === 'moveUsed') {
        console.log('🚫 [BattleScene] moveUsed ignoré dans processBattleEventsServerDriven');
        return;
      }
      
      this.handleBattleEvent(event.type, event.data);
    });
  }

  // === HANDLERS RÉSEAU (inchangés) ===

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

  // === UI MANAGEMENT (inchangé) ===

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

  // === CONTRÔLES PUBLICS (inchangés) ===

  startBattle(battleData) {
    if (!this.isActive) {
      console.error('[BattleScene] ❌ Scène non active');
      return;
    }

    console.log('[BattleScene] 🎮 Notification UIManager: mode battle');
    try {
      if (window.pokemonUISystem?.setGameState) {
        window.pokemonUISystem.setGameState('battle', { animated: true });
      } else if (window.uiManager?.setGameState) {
        window.uiManager.setGameState('battle', { animated: true });
      } else {
        console.warn('[BattleScene] ⚠️ UIManager non disponible');
      }
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur notification UIManager:', error);
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

  // === NETTOYAGE (inchangé) ===

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
    
    console.log(`[BattleScene] ${spritesRemoved} sprites supprimés`);
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

  // === FONCTIONS HELPER (inchangées) ===

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
      console.error('[BattleScene] ❌ Erreur envoi battleFinished:', error);
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
        console.warn('[BattleScene] ⚠️ Erreur reset UI:', error);
      }
    }
  }

  // === SIMULATION (inchangée) ===

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

  // === ANIMATIONS K.O. GAME BOY ===

  showPlayerPokemonFaint() {
    if (!this.playerPokemonSprite) return;
    
    console.log('💀 [BattleScene] Animation K.O. joueur Game Boy');
    
    // Animation de chute avec rotation
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
    
    console.log('💀 [BattleScene] Animation K.O. adversaire Game Boy');
    
    // Animation de chute avec rotation opposée
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
    
    // Spirales style Game Boy
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
    console.log('🎯 [BattleScene] Transition vers end battle Game Boy');
    console.log('🏆 Données vainqueur:', winnerData);
    
    if (!this.battleNetworkHandler?.isConnectedToBattle || this.interfaceMode === 'ended') {
      console.warn('⚠️ [BattleScene] Transition ignorée - combat déjà terminé');
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
    console.log('🎁 [BattleScene] Affichage message de fin Game Boy avec récompenses');
    
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
    
    // Confettis style Game Boy
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

  // === TEST MODERNE ADAPTATIF AVEC INTRO ===

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
    
    // ✅ SÉQUENCE D'INTRODUCTION RÉALISTE
    setTimeout(() => this.showNarrativeMessage('UN PIKACHU CHROMATIQUE APPARAÎT !', true), 2000);
    setTimeout(() => this.showNarrativeMessage('ALLEZ ! BULBIZARRE !', true), 4000);
    setTimeout(() => this.showNarrativeMessage('QUE VOULEZ-VOUS FAIRE ?', true), 6000);
    setTimeout(() => this.showActionButtons(), 8000); // ✅ PUIS LES BOUTONS !
  }

  // === DIAGNOSTIC (inchangé) ===

  debugHealthBarsState() {
    console.log('🔍 === DIAGNOSTIC COMPLET BARRES DE VIE GAME BOY ===');
    console.log('📍 Timestamp:', new Date().toISOString());
    
    console.log('🎮 État BattleScene:', {
      isActive: this.isActive,
      isVisible: this.isVisible,
      sceneKey: this.scene.key,
      sceneVisible: this.scene.visible,
      sceneActive: this.scene.isActive(),
      sceneAwake: !this.scene.isSleeping()
    });
    
    console.log('📊 État modernHealthBars:', {
      exists: !!this.modernHealthBars,
      player1: {
        exists: !!this.modernHealthBars?.player1,
        container: !!this.modernHealthBars?.player1?.container,
        visible: this.modernHealthBars?.player1?.container?.visible,
        position: this.modernHealthBars?.player1?.container ? 
          `${this.modernHealthBars.player1.container.x}, ${this.modernHealthBars.player1.container.y}` : 'N/A'
      },
      player2: {
        exists: !!this.modernHealthBars?.player2,
        container: !!this.modernHealthBars?.player2?.container,
        visible: this.modernHealthBars?.player2?.container?.visible,
        position: this.modernHealthBars?.player2?.container ? 
          `${this.modernHealthBars.player2.container.x}, ${this.modernHealthBars.player2.container.y}` : 'N/A'
      }
    });
    
    console.log('🐾 Données Pokémon actuelles:', {
      player: {
        exists: !!this.currentPlayerPokemon,
        name: this.currentPlayerPokemon?.name,
        hp: this.currentPlayerPokemon ? 
          `${this.currentPlayerPokemon.currentHp}/${this.currentPlayerPokemon.maxHp}` : 'N/A'
      },
      opponent: {
        exists: !!this.currentOpponentPokemon,
        name: this.currentOpponentPokemon?.name,
        hp: this.currentOpponentPokemon ? 
          `${this.currentOpponentPokemon.currentHp}/${this.currentOpponentPokemon.maxHp}` : 'N/A'
      }
    });
    
    return {
      sceneReady: this.isActive && this.isVisible,
      healthBarsCreated: !!(this.modernHealthBars?.player1 && this.modernHealthBars?.player2),
      pokemonDataPresent: !!(this.currentPlayerPokemon && this.currentOpponentPokemon),
      containersVisible: {
        player1: this.modernHealthBars?.player1?.container?.visible || false,
        player2: this.modernHealthBars?.player2?.container?.visible || false
      },
      playerRole: this.playerRole
    };
  }

  // === DESTRUCTION (inchangée) ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();

    // ✅ Plus de référence à pokemonMovesUI
    this.pokemonMovesUI = null;

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
    
    // ✅ Nettoyer les boutons d'attaques
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

// === FONCTIONS GLOBALES DE TEST ADAPTATIVES AVEC ATTAQUES ===

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
  console.log('🎮 [Test] Interface Game Boy adaptative activée !');
};

// Tests des différents modes d'affichage
window.testNarrativeMode = function(message = 'UN POKÉMON SAUVAGE APPARAÎT !') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.showNarrativeMessage(message, true);
    console.log('📖 [Test] Mode narratif activé');
  }
};

window.testActionMode = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.showActionButtons();
    console.log('🎮 [Test] Mode boutons activé');
  }
};

// ✅ NOUVEAU : Test du mode attaques
window.testMoveMode = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const testMoves = battleScene.getTestMoves();
    battleScene.showMoveButtons(testMoves);
    console.log('⚔️ [Test] Mode attaques activé avec:', testMoves.length, 'attaques');
  }
};

// ✅ NOUVEAU : Test du bouton retour
window.testBackToActions = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.returnToActionButtons();
    console.log('🔙 [Test] Retour aux boutons d\'action');
  }
};

window.testMessageMode = function(message = 'PIKACHU UTILISE ÉCLAIR !') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.showActionMessage(message);
    console.log('💬 [Test] Mode message activé');
  }
};

window.debugGameBoyHealthBars = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  return battleScene.debugHealthBarsState();
};

window.gameBoyDamagePlayer = function(damage = 8) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulatePlayerDamage(damage);
    console.log(`💥 [Game Boy] Dégâts joueur: ${damage} (HP restants: ${result})`);
  }
};

window.gameBoyDamageOpponent = function(damage = 8) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulateOpponentDamage(damage);
    console.log(`💥 [Game Boy] Dégâts adversaire: ${damage} (HP restants: ${result})`);
  }
};

console.log('✅ [BattleScene] VERSION POKÉMON ROUGE/BLEU AVEC ATTAQUES INTÉGRÉES CHARGÉE !');
console.log('🎨 Style: Interface Game Boy avec modes adaptatifs');
console.log('📱 Modes: Narratif / Actions / Attaques / Messages');
console.log('⚔️ Nouveau: Attaques remplacent les boutons au lieu de popup');
console.log('🎮 Optimisé: Panel dynamique selon le contexte');
console.log('🧪 Tests disponibles:');
console.log('   - window.testGameBoyBattle() - Test interface complète');
console.log('   - window.testNarrativeMode(message) - Test mode narratif');
console.log('   - window.testActionMode() - Test mode boutons');
console.log('   - window.testMoveMode() - Test mode attaques'); // ✅ NOUVEAU
console.log('   - window.testBackToActions() - Test retour actions'); // ✅ NOUVEAU
console.log('   - window.testMessageMode(message) - Test mode message');
console.log('   - window.debugGameBoyHealthBars() - Debug barres Game Boy');
console.log('   - window.gameBoyDamagePlayer(damage) - Test dégâts joueur');
console.log('   - window.gameBoyDamageOpponent(damage) - Test dégâts adversaire');
