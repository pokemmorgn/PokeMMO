// client/src/scenes/BattleScene.js - VERSION SERVER-DRIVEN SANS TIMERS CLIENT

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
    
    // Managers essentiels
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.playerRole = null; // 'player1' ou 'player2'
    this.battleInventoryUI = null;
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    this.captureManager = null;
    // Sprites Pokémon
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    this.pokemonMovesUI = null;
    // Interface moderne
    this.modernHealthBars = { player1: null, player2: null };
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    
    // Données Pokémon actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    this.spriteStructures = new Map(); // pokemonId_view -> structure
this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
this.loadedSprites = new Set(); // Cache des sprites chargés
    // Positions optimisées
    this.pokemonPositions = {
      player: { x: 0.22, y: 0.75 },
      opponent: { x: 0.78, y: 0.35 },
      playerPlatform: { x: 0.25, y: 0.85 },
      opponentPlatform: { x: 0.75, y: 0.45 }
    };
    
    // Interface state (simplifié - plus de timers)
    this.interfaceMode = 'hidden'; // 'hidden', 'message', 'buttons'
    this.battleTranslator = null; // Sera initialisé avec playerRole
    
    console.log('⚔️ [BattleScene] Initialisé - Server-Driven');
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
      this.createPokemonMovesInterface();
      this.createBattleDialog();
      this.setupBattleNetworkEvents();
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
      console.log('[BattleScene] ✅ Création terminée');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur création:', error);
    }
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
  
  // Si pas de largeur courante, essayer division auto
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
  
  // Fallback
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
  // Après la méthode create(), ajouter cette nouvelle méthode
createBattleInventoryUI() {
  const gameRoom = this.gameManager?.gameRoom || 
                   this.battleNetworkHandler?.gameRoom || 
                   window.currentGameRoom;
  
  const battleContext = {
    battleScene: this,
    networkHandler: this.battleNetworkHandler,
    battleRoomId: this.battleNetworkHandler?.battleRoomId || null,
    captureManager: this.captureManager  // ✅ AJOUTER CETTE LIGNE
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
  console.log('⚔️ BattleInventoryUI créé avec CaptureManager:', {
    gameRoom: !!gameRoom,
    networkHandler: !!this.battleNetworkHandler,
    captureManager: !!this.captureManager  // ✅ VÉRIFICATION
  });
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
    this.createModernHealthBar('player2', {
      x: width * 0.05,
      y: height * 0.15,
      width: 280,
      height: 80
    });
    
    // Barre joueur (en bas à gauche)
    this.createModernHealthBar('player1', {
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

createPokemonMovesInterface() {
  if (!this.battleNetworkHandler) {
    console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant pour PokemonMovesUI');
    return;
  }

  // ✅ VÉRIFICATION: NetworkHandler est-il vraiment connecté ?
  if (this.battleNetworkHandler && typeof this.battleNetworkHandler.canSendBattleActions === 'function') {
    const canSend = this.battleNetworkHandler.canSendBattleActions();
    if (!canSend) {
      console.warn('⚠️ [BattleScene] NetworkHandler pas encore connecté - interface en attente');
    }
  }

  this.pokemonMovesUI = new PokemonMovesUI(this, this.battleNetworkHandler);
  this.pokemonMovesUI.create();

  // ✅ NOUVEL ÉVÉNEMENT: Gestion des erreurs
  this.events.on('movesMenuError', (data) => {
    console.error('❌ [BattleScene] Erreur menu attaques:', data.message);
    
    // Afficher l'erreur dans l'interface principale
    this.showActionMessage(`Erreur attaques: ${data.message}`);
    
    // Revenir au menu principal après 3 secondes
    setTimeout(() => {
      this.showActionButtons();
    }, 3000);
  });

  // Écouter les événements de l'interface (existants)
  this.events.on('moveSelected', (data) => {
    console.log(`⚔️ [BattleScene] Attaque sélectionnée: ${data.moveName}`);
    
    // Afficher le message d'action
    this.showActionMessage(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} utilise ${data.moveName} !`);
    
    // Déclencher l'événement pour le système de combat
    this.scene.events.emit('battleActionSelected', {
      type: 'move',
      moveId: data.moveId,
      moveName: data.moveName,
      moveData: data.moveData
    });
  });

  this.events.on('movesMenuClosed', () => {
    console.log('🔙 [BattleScene] Menu attaques fermé - retour menu principal');
    this.showActionButtons(); // Revenir au menu principal
  });

  console.log('✅ [BattleScene] Interface attaques Pokémon authentique créée (anti-freeze)');
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
      // ✅ VÉRIFICATIONS PRÉALABLES
      if (!this.pokemonMovesUI) {
        console.error('❌ [BattleScene] PokemonMovesUI non initialisé');
        this.showActionMessage('Interface attaques non disponible');
        
        // ✅ AUTO-RETOUR au menu après erreur
        setTimeout(() => {
          this.showActionButtons();
        }, 2000);
        return;
      }

      // ✅ VÉRIFICATION: NetworkHandler connecté ?
      if (!this.battleNetworkHandler || !this.battleNetworkHandler.canSendBattleActions?.()) {
        console.error('❌ [BattleScene] NetworkHandler non connecté');
        this.showActionMessage('Non connecté au combat');
        
        setTimeout(() => {
          this.showActionButtons();
        }, 2000);
        return;
      }

      // ✅ AFFICHAGE TEMPORAIRE pendant la requête
      this.showActionMessage('Chargement des attaques...');

      console.log('🎮 [BattleScene] Ouverture menu attaques authentique...');
      
      // ✅ TIMEOUT DE SÉCURITÉ: Si pas de réponse en 6 secondes, revenir au menu
      const safetyTimeout = setTimeout(() => {
        console.error('⏰ [BattleScene] Timeout sécurité - retour menu principal');
        this.showActionMessage('Timeout - réessayez');
        
        setTimeout(() => {
          this.showActionButtons();
        }, 2000);
      }, 6000);

      // ✅ Effacer le timeout si tout va bien
      const originalRequestMoves = this.pokemonMovesUI.requestMoves.bind(this.pokemonMovesUI);
      this.pokemonMovesUI.requestMoves = () => {
        clearTimeout(safetyTimeout);
        originalRequestMoves();
      };

      this.pokemonMovesUI.requestMoves(); // Demande au serveur + affichage auto
      break;
      
    case 'bag':
      // ✅ GESTION AMÉLIORÉE
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
      // ✅ VÉRIFICATION avant fuite
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
    // CAPTURE SYSTEMS
  initializeCaptureManager() {
  if (!this.battleNetworkHandler) {
    console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant pour CaptureManager');
    return;
  }
  
  // Déterminer le playerRole
  const playerRole = this.playerRole || 'player1';
  
  // Créer le CaptureManager
  this.captureManager = new BattleCaptureManager(
    this,                     // battleScene
    this.battleNetworkHandler, // networkHandler 
    playerRole                // playerRole pour traductions
  );
  
  console.log('🎯 [BattleScene] CaptureManager initialisé');
} 
  // CAPTURE SYSTEM END

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
        this.updateModernHealthBar('player1', pokemonData);
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
        this.updateModernHealthBar('player2', pokemonData);
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

  // ✅ SIMPLIFIÉ: showBattleMessage sans timer par défaut
  showBattleMessage(message, duration = 0) {
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
    
    // ✅ SEULEMENT si une durée est explicitement demandée
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

  // === INTERFACE STATE MANAGEMENT (SIMPLIFIÉ) ===

  // ✅ SIMPLIFIÉ: showActionMessage sans timer par défaut
// REMPLACE ta méthode showActionMessage() par cette version DEBUG :

showActionMessage(message) {
  // 🔍 DEBUG COMPLET DE TOUS LES AFFICHAGES
  console.log('🔍 [DOUBLE ACTION DEBUG] ==========================================');
  console.log('🔍 [DOUBLE ACTION DEBUG] showActionMessage() appelé !');
  console.log('🔍 [DOUBLE ACTION DEBUG] Message:', message);
  console.log('🔍 [DOUBLE ACTION DEBUG] Timestamp:', Date.now());
  
  // 🔍 STACK TRACE pour voir QUI appelle cette méthode
  console.log('🔍 [DOUBLE ACTION DEBUG] STACK TRACE:');
  console.trace();
  
  // 🔍 État actuel de l'interface
  console.log('🔍 [DOUBLE ACTION DEBUG] Interface mode avant:', this.interfaceMode);
  console.log('🔍 [DOUBLE ACTION DEBUG] actionInterface visible:', this.actionInterface?.visible);
  console.log('🔍 [DOUBLE ACTION DEBUG] actionMessageText visible:', this.actionMessageText?.visible);
  
  if (!this.actionInterface || !this.actionMessageText) {
    console.log('🔍 [DOUBLE ACTION DEBUG] ❌ Interface manquante, ABANDON');
    return;
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
  
  console.log('🔍 [DOUBLE ACTION DEBUG] Interface mode après:', this.interfaceMode);
  console.log('🔍 [DOUBLE ACTION DEBUG] Message affiché avec succès');
  console.log('🔍 [DOUBLE ACTION DEBUG] ==========================================');
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
    
    // Charger et détecter automatiquement
    const tempKey = `${spriteKey}_temp`;
    
    await new Promise((resolve, reject) => {
      this.load.image(tempKey, imagePath);
      
      this.load.once('complete', () => {
        const texture = this.textures.get(tempKey);
        const width = texture.source[0].width;
        const height = texture.source[0].height;
        
        // Détection auto : assumer 1 ligne, calculer colonnes
let cols, finalFrameWidth;

// Essayer en priorité les tailles communes des Pokémon
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

// Si pas trouvé avec les tailles prioritaires, essayer toutes
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

// Fallback si rien trouvé
if (!cols) {
  cols = Math.round(width / 64);
  finalFrameWidth = Math.floor(width / cols);
}

const frameWidth = finalFrameWidth;
const frameHeight = height;
        
        console.log(`📐 [BattleScene] ${spriteKey}: ${cols} colonnes de ${frameWidth}×${frameHeight}px`);
        
        // Charger comme spritesheet
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
    
    // ✅ SIMPLIFIÉ: Action result sans gestion de timing compliquée
      this.battleNetworkHandler.on('actionResult', (data) => {
        if (data.success) {
          console.log('✅ [BattleScene] Action confirmée par le serveur');
          
          // ✅ JUSTE traiter les événements non-moveUsed
          if (data.battleEvents && data.battleEvents.length > 0) {
            this.processBattleEventsServerDriven(data.battleEvents);
          }
        }
        
        if (!data.success) {
          this.showActionMessage(`Erreur: ${data.error}`);
        }
      });

    // === ✅ ÉVÉNEMENTS POKÉMON AUTHENTIQUES (NOUVEAU) ===
    this.battleNetworkHandler.on('moveUsed', (data) => {
      console.log('⚔️ [BattleScene] moveUsed avec données PP:', data);
      
      // Message d'attaque
      const message = `${data.attackerName} utilise ${data.moveName} !`;
      this.showActionMessage(message);
      
      // Animation d'attaque
      if (data.attackerRole === 'player1') {
        this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      } else {
        this.createAttackEffect(this.opponentPokemonSprite, this.playerPokemonSprite);
      }
      
      // ✅ NOUVEAU : Si c'est le joueur qui attaque, mettre à jour les PP localement
      if (data.attackerRole === 'player1' && this.pokemonMovesUI) {
        // Optionnel : Synchroniser les PP affichés si le menu est encore ouvert
        // (Normalement le menu se ferme après sélection)
      }
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      console.log('💥 [BattleScene] damageDealt - GÈRE LES DÉGÂTS:', data);
      
      // ✅ METTRE À JOUR LES HP et BARRES DE VIE
      const pokemonData = {
        name: data.targetName || 'Pokémon',
        currentHp: data.newHp,
        maxHp: data.maxHp || this.getCurrentMaxHp(data.targetRole),
        level: this.getCurrentLevel(data.targetRole)
      };
      
      // ✅ SYNCHRONISER LES DONNÉES LOCALES
      if (data.targetRole === 'player1' && this.currentPlayerPokemon) {
        this.currentPlayerPokemon.currentHp = data.newHp;
        this.currentPlayerPokemon.maxHp = data.maxHp || this.currentPlayerPokemon.maxHp;
      } else if (data.targetRole === 'player2' && this.currentOpponentPokemon) {
        this.currentOpponentPokemon.currentHp = data.newHp;
        this.currentOpponentPokemon.maxHp = data.maxHp || this.currentOpponentPokemon.maxHp;
      }
      
      // ✅ METTRE À JOUR LES BARRES DE VIE
      this.updateModernHealthBar(data.targetRole, pokemonData);
      
      // ✅ EFFET VISUEL DE DÉGÂTS
      this.createDamageEffectForRole(data.targetRole, data.damage);
    });
    
        // ✅ NOUVEAU: Handler pour déconnexion BattleRoom
    this.battleNetworkHandler.on('battleRoomDisconnected', (data) => {
      console.log('👋 [BattleScene] Déconnexion BattleRoom détectée:', data);
      
      // Forcer le retour à l'exploration
      setTimeout(() => {
        this.endBattle({ result: 'disconnected' });
      }, 1000);
    });

  this.battleNetworkHandler.on('requestMovesResult', (data) => {
    console.log('📋 [BattleScene] Résultat demande attaques (amélioré):', data);
    
    if (!data.success) {
      console.error('❌ [BattleScene] Erreur attaques:', data.error);
      
      // ✅ Masquer le message de chargement
      this.hideActionMessage();
      
      // Afficher l'erreur
      this.showActionMessage(`Erreur: ${data.error}`);
      
      // ✅ Si l'interface est bloquée, la débloquer
      if (this.pokemonMovesUI) {
        this.pokemonMovesUI.cancelRequest();
      }
      
      // Revenir au menu principal après erreur
      setTimeout(() => {
        this.showActionButtons();
      }, 3000);
    } else {
      // ✅ Masquer le message de chargement en cas de succès
      this.hideActionMessage();
    }
    // Si succès, PokemonMovesUI gère automatiquement l'affichage
  });
      this.battleNetworkHandler.on('connectionTimeout', (data) => {
    console.error('⏰ [BattleScene] Timeout connexion:', data);
    this.showActionMessage('Connexion instable - réessayez');
    
    // Débloquer l'interface
    if (this.pokemonMovesUI) {
      this.pokemonMovesUI.cancelRequest();
    }
    
    setTimeout(() => {
      this.showActionButtons();
    }, 3000);
  });

  // ✅ NOUVEAU: Handler d'erreur générale
  this.battleNetworkHandler.on('networkError', (data) => {
    console.error('🌐 [BattleScene] Erreur réseau:', data);
    this.showActionMessage('Erreur réseau - reconnexion...');
    
    // Débloquer tout
    if (this.pokemonMovesUI) {
      this.pokemonMovesUI.cancelRequest();
    }
    
    setTimeout(() => {
      this.showActionButtons();
    }, 4000);
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
        // ✅ Utiliser traduction
        this.handleBattleEvent('wildPokemonAppears', { 
          pokemonName: data.opponentPokemon.name 
        });
      }
      
      this.activateBattleUI();
      this.isVisible = true;
    });
    
    // Fin narratif
    this.battleNetworkHandler.on('narrativeEnd', (data) => {
      this.handleBattleEvent('battleStart', data);
    });
    
    // IA réfléchit
    this.battleNetworkHandler.on('aiThinking', (data) => {
      this.handleBattleEvent('opponentTurn', data);
    });
    
    // ✅ SIMPLIFIÉ: Tour changé sans timer
    this.battleNetworkHandler.on('turnChanged', (data) => {
      if (data.currentTurn === 'player1') {
        // ✅ Le serveur enverra yourTurn quand il voudra
      } else if (data.currentTurn === 'player2') {
        this.hideActionButtons();
      } else if (data.currentTurn === 'narrator') {
        this.hideActionButtons();
      }
    });
    
    // ✅ SIMPLIFIÉ: Fin de combat sans timer côté client
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.hideActionButtons();
      // ✅ Le serveur gérera le timing de endBattle()
    });
    
    // Autres événements
    this.battleNetworkHandler.on('battleJoined', (data) => {
      this.playerRole = data.yourRole;
      this.battleTranslator = new BattleTranslator(this.playerRole);
      console.log('🌍 [BattleScene] Traducteur initialisé pour:', this.playerRole);
    });
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleNetworkBattleStart(data);
    });

        // === ✅ NOUVEAUX HANDLERS K.O. (ÉTAPE 2) ===
    this.battleNetworkHandler.on('koMessage', (data) => {
      console.log('💀 [BattleScene] K.O. Message reçu:', data);
      
      // Afficher le message K.O.
      this.showActionMessage(data.message);
      
      // Animation K.O. du Pokémon si nécessaire
      if (data.playerRole === 'player1') {
        this.showPlayerPokemonFaint();
      } else {
        this.showEnemyPokemonFaint();
      }
    });
    
      this.battleNetworkHandler.on('winnerAnnounce', (data) => {
        console.log('🏆 [BattleScene] Winner Announce reçu:', data);
        
        // ✅ PAS de message simple ici - juste programmer les récompenses
        // this.showActionMessage(data.message); // ❌ SUPPRIMER CETTE LIGNE
        
        // ✅ Programmer SEULEMENT les récompenses après 1.5s
        setTimeout(() => {
          this.transitionToEndBattle(data);
        }, 1500);
      });
    // ✅ SIMPLIFIÉ: yourTurn sans timer
    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleBattleEvent('yourTurn', data);
    });
  }

  // === SYSTÈME DE TRADUCTION D'ÉVÉNEMENTS (INCHANGÉ) ===

  handleBattleEvent(eventType, data = {}) {
    console.log(`🌍 [BattleScene] Événement: ${eventType}`, data);
    if (eventType === 'moveUsed') return;
    // Actions d'interface
    if (eventType === 'yourTurn') {
      this.showActionButtons();
      return; // ✅ Pas de message pour yourTurn
    }
    
    if (eventType === 'opponentTurn') {
      this.hideActionButtons();
    }
    
if (eventType === 'battleEnd') {
  this.hideActionButtons();
  
  // ✅ NOUVEAU: Forcer fermeture après battleEnd
  setTimeout(() => {
    this.endBattle({ result: 'ended' });
  }, 3000);
}
    
    // Traduction du message
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        // ✅ Messages restent affichés jusqu'au prochain événement
        this.showActionMessage(message);
        console.log(`💬 Message traduit (${this.battleTranslator.language}): "${message}"`);
      }
    } else {
      console.warn('[BattleScene] ⚠️ Traducteur non initialisé pour:', eventType);
    }
  }

  // === TRAITEMENT DES ÉVÉNEMENTS SERVER-DRIVEN ===

processBattleEventsServerDriven(battleEvents) {
  console.log('⚔️ [BattleScene] Traitement événements server-driven:', battleEvents);
  
  // ✅ FILTRER LES MOVEUSED POUR ÉVITER LES DOUBLONS !
  battleEvents.forEach((event, index) => {
    
    // 🚫 IGNORER MOVEUSED (déjà géré par handler direct)
    if (event.type === 'moveUsed') {
      console.log('🚫 [BattleScene] moveUsed ignoré dans processBattleEventsServerDriven');
      return;
    }
    
    // ✅ Traiter tous les autres événements normalement
    this.handleBattleEvent(event.type, event.data);
  });
}


  // === HANDLERS RÉSEAU (SIMPLIFIÉS) ===

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

  // ✅ SIMPLIFIÉ: Introduction sans timer compliqué
  startBattleIntroSequence(opponentPokemon) {
    // Délai minimal pour l'entrée des Pokémon
    setTimeout(() => {
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: opponentPokemon?.name || 'Pokémon' 
      });
    }, 2000);
    
    // ✅ Le serveur enverra yourTurn quand il voudra !
  }

  // === UI MANAGEMENT (INCHANGÉ) ===

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

      // ===== 🎯 NOUVEAU: Prévenir UIManager =====
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

  // === NETTOYAGE ===

  clearAllPokemonSprites() {
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
    
    console.log(`[BattleScene] ${spritesRemoved} sprites supprimés`);
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
// === FONCTIONS HELPER À AJOUTER ===

// Helper pour récupérer maxHp actuel
getCurrentMaxHp(targetRole) {
  if (targetRole === 'player1' && this.currentPlayerPokemon) {
    return this.currentPlayerPokemon.maxHp;
  }
  if (targetRole === 'player2' && this.currentOpponentPokemon) {
    return this.currentOpponentPokemon.maxHp;
  }
  return 100; // Fallback
}

// Helper pour récupérer level actuel  
getCurrentLevel(targetRole) {
  if (targetRole === 'player1' && this.currentPlayerPokemon) {
    return this.currentPlayerPokemon.level;
  }
  if (targetRole === 'player2' && this.currentOpponentPokemon) {
    return this.currentOpponentPokemon.level;
  }
  return 5; // Fallback
}

// Helper pour effet visuel selon le rôle
createDamageEffectForRole(targetRole, damage) {
  let targetSprite = null;
  
  if (targetRole === 'player1') {
    targetSprite = this.playerPokemonSprite;
    // Mettre à jour les données locales
    if (this.currentPlayerPokemon) {
      this.currentPlayerPokemon.currentHp = Math.max(0, this.currentPlayerPokemon.currentHp - damage);
    }
  } else if (targetRole === 'player2') {
    targetSprite = this.opponentPokemonSprite;
    // Mettre à jour les données locales
    if (this.currentOpponentPokemon) {
      this.currentOpponentPokemon.currentHp = Math.max(0, this.currentOpponentPokemon.currentHp - damage);
    }
  }
  
  if (targetSprite && damage > 0) {
    this.createDamageEffect(targetSprite, damage);
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
    
    // ✅ SIMPLIFIÉ: Nettoyage immédiat ou léger délai
    setTimeout(() => {
      this.completeBattleCleanup(battleResult);
    }, 500);
  }

  completeBattleCleanup(battleResult) {
    // Déconnexion
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.disconnectFromBattleRoom();
    }
    
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
    setTimeout(() => this.showBattleMessage('Un Pikachu chromatique apparaît !'), 2000);
    // ✅ SIMPLIFIÉ: Pas de timer pour l'interface
  }

  // === ✅ NOUVELLES MÉTHODES K.O. (ÉTAPE 2) ===

showPlayerPokemonFaint() {
  if (!this.playerPokemonSprite) return;
  
  console.log('💀 [BattleScene] Animation K.O. joueur');
  
  // Animation de chute
  this.tweens.add({
    targets: this.playerPokemonSprite,
    y: this.playerPokemonSprite.y + 30,
    alpha: 0.3,
    angle: -90,
    duration: 1500,
    ease: 'Power2.easeIn'
  });
  
  // Effet visuel
  this.createKOEffect(this.playerPokemonSprite);
}

showEnemyPokemonFaint() {
  if (!this.opponentPokemonSprite) return;
  
  console.log('💀 [BattleScene] Animation K.O. adversaire');
  
  // Animation de chute
  this.tweens.add({
    targets: this.opponentPokemonSprite,
    y: this.opponentPokemonSprite.y + 30,
    alpha: 0.3,
    angle: 90,
    duration: 1500,
    ease: 'Power2.easeIn'
  });
  
  // Effet visuel
  this.createKOEffect(this.opponentPokemonSprite);
}

createKOEffect(sprite) {
  if (!sprite) return;
  
  // Effet de spirale K.O.
  const spirals = [];
  for (let i = 0; i < 3; i++) {
    const spiral = this.add.graphics();
    spiral.lineStyle(3, 0xFFFFFF, 0.8);
    spiral.arc(0, 0, 20 + i * 10, 0, Math.PI * 2);
    spiral.setPosition(sprite.x, sprite.y - 20);
    spiral.setDepth(50);
    spirals.push(spiral);
    
    this.tweens.add({
      targets: spiral,
      y: spiral.y - 50,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      rotation: Math.PI * 4,
      duration: 2000,
      delay: i * 200,
      ease: 'Power2.easeOut',
      onComplete: () => spiral.destroy()
    });
  }
}

transitionToEndBattle(winnerData) {
  console.log('🎯 [BattleScene] Transition vers end battle');
  console.log('🏆 Données vainqueur:', winnerData);
  
  // ✅ VÉRIFICATION SÉCURISÉE
  if (!this.battleNetworkHandler?.isConnectedToBattle || this.interfaceMode === 'ended') {
    console.warn('⚠️ [BattleScene] Transition ignorée - combat déjà terminé');
    return;
  }
  
  // ✅ MARQUER comme terminé pour éviter les exploits
  this.interfaceMode = 'ended';
  
  // Masquer l'interface d'actions
  this.hideActionButtons();
  
  // ✅ AFFICHER MESSAGE DE VICTOIRE + RÉCOMPENSES
  this.showBattleEndMessage(winnerData);
  
  // ✅ TERMINER AUTOMATIQUEMENT APRÈS 4S
  setTimeout(() => {
    this.endBattle({ result: 'completed', winner: winnerData.winner });
  }, 4000);
}

showBattleEndMessage(winnerData) {
  console.log('🎁 [BattleScene] Affichage message de fin avec récompenses');
  
  // ✅ MESSAGE UNIQUE avec tout dedans
  let fullMessage = winnerData.message;
  
  if (winnerData.winner === 'player1') {
    const rewards = this.calculateBattleRewards();
    
    // ✅ Ajouter directement les récompenses
    fullMessage += '\n\n🎁 Récompenses :';
    
    if (rewards.experience > 0) {
      fullMessage += `\n🌟 +${rewards.experience} XP`;
    }
    
    if (rewards.money > 0) {
      fullMessage += `\n💰 +${rewards.money}₽`;
    }
    
    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(item => {
        fullMessage += `\n📦 ${item.name} x${item.quantity}`;
      });
    }
  }
  
 
  // ✅ AFFICHER DANS LE CADRE D'ACTION EXISTANT
  this.showActionMessage(fullMessage);
  
  // ✅ EFFET VISUEL SPÉCIAL POUR LA VICTOIRE
  if (winnerData.winner === 'player1') {
    this.createVictoryEffect();
  }
}

calculateBattleRewards() {
  // ✅ CALCUL SIMPLE DES RÉCOMPENSES (à remplacer par les vraies données serveur)
  const opponentLevel = this.currentOpponentPokemon?.level || 5;
  
  return {
    experience: Math.floor(opponentLevel * 10 + Math.random() * 20),
    money: Math.floor(opponentLevel * 15 + Math.random() * 50),
    items: Math.random() > 0.7 ? [
      { name: 'Potion', quantity: 1 }
    ] : []
  };
}

createVictoryEffect() {
  // ✅ EFFET VISUEL LÉGER POUR LA VICTOIRE
  const { width, height } = this.cameras.main;
  
  // Créer des étoiles qui tombent
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const star = this.add.text(
        Math.random() * width, 
        -50, 
        '⭐', 
        { fontSize: '24px' }
      );
      star.setDepth(150);
      
      this.tweens.add({
        targets: star,
        y: height + 50,
        x: star.x + (Math.random() - 0.5) * 100,
        rotation: Math.PI * 4,
        alpha: 0,
        duration: 3000,
        ease: 'Power2.easeIn',
        onComplete: () => star.destroy()
      });
    }, i * 300);
  }
}

  // === DESTRUCTION ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();

    // ✅ NOUVEAU : Nettoyer l'interface attaques
    if (this.pokemonMovesUI) {
      this.pokemonMovesUI.destroy();
      this.pokemonMovesUI = null;
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
    this.modernHealthBars = { player1: null, player2: null };
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    super.destroy();
  }
// === DIAGNOSTIC COMPLET DES BARRES DE VIE ===
  // Version corrigée pour Phaser

  debugHealthBarsState() {
    console.log('🔍 === DIAGNOSTIC COMPLET BARRES DE VIE ===');
    console.log('📍 Timestamp:', new Date().toISOString());
    
    // 1. Vérifier l'état général de la scène
    console.log('🎮 État BattleScene:', {
      isActive: this.isActive,
      isVisible: this.isVisible,
      sceneKey: this.scene.key,
      sceneVisible: this.scene.visible,
      sceneActive: this.scene.isActive(), // Corrigé
      sceneAwake: !this.scene.isSleeping()
    });
    
    // 2. Vérifier l'objet modernHealthBars
    console.log('📊 État modernHealthBars:', {
      exists: !!this.modernHealthBars,
      player: {
        exists: !!this.modernHealthBars?.player,
        container: !!this.modernHealthBars?.player?.container,
        visible: this.modernHealthBars?.player?.container?.visible,
        position: this.modernHealthBars?.player?.container ? 
          `${this.modernHealthBars.player.container.x}, ${this.modernHealthBars.player.container.y}` : 'N/A'
      },
      opponent: {
        exists: !!this.modernHealthBars?.opponent,
        container: !!this.modernHealthBars?.opponent?.container,
        visible: this.modernHealthBars?.opponent?.container?.visible,
        position: this.modernHealthBars?.opponent?.container ? 
          `${this.modernHealthBars.opponent.container.x}, ${this.modernHealthBars.opponent.container.y}` : 'N/A'
      }
    });
    
    // 3. Vérifier les données Pokémon actuelles
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
    
    // 4. Vérifier le mapping des rôles
    console.log('🎭 Mapping des rôles:', {
      playerRole: this.playerRole,
      battleTranslator: !!this.battleTranslator,
      expectedMapping: {
        'player1 devrait mapper vers': 'player',
        'player2 devrait mapper vers': 'opponent'
      }
    });
    
    // 5. Lister quelques enfants de la scène
    console.log('🧒 Enfants de la scène (total:', this.children.length, '):');
    const relevantChildren = this.children.list.filter(child => 
      child.type === 'Container' || 
      child.texture?.key?.includes('pokemon') ||
      child.depth > 50
    );
    
    relevantChildren.slice(0, 10).forEach((child, index) => {
      console.log(`  ${index}: ${child.type || 'Unknown'} - Key: ${child.texture?.key || 'N/A'} - Visible: ${child.visible} - Position: ${child.x || 'N/A'}, ${child.y || 'N/A'} - Depth: ${child.depth}`);
    });
    
    // 6. Vérifier les managers
    console.log('🏥 Managers:', {
      healthBarManager: !!this.healthBarManager,
      gameManager: !!this.gameManager,
      battleNetworkHandler: !!this.battleNetworkHandler
    });
    
    // 7. Test rapide updateModernHealthBar
    console.log('🧪 Test rapide updateModernHealthBar:');
    try {
      // Test avec 'player'
      if (this.modernHealthBars?.player) {
        console.log('✅ modernHealthBars.player existe');
      } else {
        console.log('❌ modernHealthBars.player manquant');
      }
      
      // Test avec 'opponent'  
      if (this.modernHealthBars?.opponent) {
        console.log('✅ modernHealthBars.opponent existe');
      } else {
        console.log('❌ modernHealthBars.opponent manquant');
      }
      
    } catch (error) {
      console.error('❌ Erreur test updateModernHealthBar:', error);
    }
    
    console.log('🔍 === FIN DIAGNOSTIC ===');
    
    // 8. Retourner un résumé structuré
    return {
      sceneReady: this.isActive && this.isVisible,
      healthBarsCreated: !!(this.modernHealthBars?.player && this.modernHealthBars?.opponent),
      pokemonDataPresent: !!(this.currentPlayerPokemon && this.currentOpponentPokemon),
      containersVisible: {
        player: this.modernHealthBars?.player?.container?.visible || false,
        opponent: this.modernHealthBars?.opponent?.container?.visible || false
      },
      playerRole: this.playerRole,
      recommendation: this.getDiagnosticRecommendation()
    };
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

// === FONCTIONS GLOBALES DE DEBUG ===
window.debugBattleHealthBars = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  return battleScene.debugHealthBarsState();
};

window.testBattleHealthBars = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  return battleScene.testHealthBarUpdate();
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

console.log('✅ [BattleScene] VERSION SERVER-DRIVEN CHARGÉE !');
console.log('🎯 Système: Messages persistent jusqu\'au prochain événement');
console.log('🧪 Test: window.testModernBattle()');
