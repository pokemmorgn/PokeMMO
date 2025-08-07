// client/src/scenes/BattleScene.js - VERSION SANS INTERFACE MODERNE OVERLAY

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';
import { BattleCaptureManager } from '../managers/Battle/BattleCaptureManager.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.playerRole = null;
    this.battleInventoryUI = null;
    this.captureManager = null;
    
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    this.modernHealthBars = { player1: null, player2: null };
    this.battleDialog = null;
    this.battleActionUI = null; // ✅ SEULEMENT LE BattleActionUI
    
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    this.spriteStructures = new Map();
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    
    this.pokemonPositions = {
      player: { x: 0.22, y: 0.75 },
      opponent: { x: 0.78, y: 0.35 },
      playerPlatform: { x: 0.25, y: 0.85 },
      opponentPlatform: { x: 0.75, y: 0.45 }
    };
    
    this.battleTranslator = null;
  }

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
      this.createBattleEnvironment();
      this.createPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      this.createModernHealthBars();
      // ❌ SUPPRIMER: this.createModernActionInterface();
      this.createBattleActionUI(); // ✅ SEULEMENT CETTE INTERFACE
      this.createBattleDialog();
      this.setupBattleNetworkEvents();
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
    } catch (error) {
      console.error('[BattleScene] Erreur création:', error);
    }
  }

  createBattleActionUI() {
    // ✅ Créer et connecter le BattleActionUI avec le battleManager
    this.battleActionUI = new BattleActionUI(this, {
      // Passer les méthodes dont BattleActionUI a besoin
      selectMove: (moveId) => {
        console.log(`⚔️ Attaque sélectionnée: ${moveId}`);
        // Envoyer au serveur
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.performBattleAction('attack', { moveId });
        }
      },
      useItem: (itemId) => {
        console.log(`🎒 Objet utilisé: ${itemId}`);
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.performBattleAction('item', { itemId });
        }
      },
      attemptRun: () => {
        console.log(`🏃 Tentative de fuite`);
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.attemptRun();
        }
      }
    });
    
    this.battleActionUI.create();
    
    // ✅ Écouter les événements du BattleActionUI
    this.events.on('battleActionSelected', (data) => {
      console.log('🎯 Action de combat sélectionnée:', data);
      // L'action a déjà été envoyée au serveur par les callbacks ci-dessus
    });
  }

  createBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
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
    
    this.createPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      120, 'player'
    );
    
    this.createPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      80, 'opponent'
    );
  }

  createPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 5, y + 5, size, size * 0.3);
    
    platform.fillStyle(type === 'player' ? 0x8B4513 : 0x696969, 0.7);
    platform.fillEllipse(x, y, size, size * 0.3);
    
    platform.lineStyle(2, type === 'player' ? 0x654321 : 0x555555, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.3);
    
    platform.setDepth(type === 'player' ? 10 : 5);
  }

  createModernHealthBars() {
    const { width, height } = this.cameras.main;
    
    this.createModernHealthBar('player2', {
      x: width * 0.05,
      y: height * 0.15,
      width: 280,
      height: 80
    });
    
    this.createModernHealthBar('player1', {
      x: width * 0.05,
      y: height * 0.75,
      width: 320,
      height: 100
    });
  }

  createModernHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    
    const bgPanel = this.add.graphics();
    bgPanel.fillStyle(0x000000, 0.7);
    bgPanel.fillRoundedRect(0, 0, config.width, config.height, 12);
    bgPanel.lineStyle(3, type === 'player' ? 0x4A90E2 : 0xE74C3C, 1);
    bgPanel.strokeRoundedRect(0, 0, config.width, config.height, 12);
    
    const nameText = this.add.text(15, 15, type === 'player' ? 'Votre Pokémon' : 'Pokémon Adversaire', {
      fontSize: type === 'player' ? '18px' : '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    
    const levelText = this.add.text(config.width - 60, 15, 'Niv. --', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold'
    });
    
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x333333, 1);
    hpBarBg.fillRoundedRect(15, config.height - 35, config.width - 30, 12, 6);
    
    const hpBar = this.add.graphics();
    this.updateHealthBarVisual(hpBar, config.width - 30, 1.0);
    hpBar.x = 15;
    hpBar.y = config.height - 35;
    
    let hpText = null;
    if (type === 'player') {
      hpText = this.add.text(config.width - 100, config.height - 55, '--/--', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold'
      });
    }
    
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
    
    let color = 0x4CAF50;
    if (hpPercentage < 0.5) color = 0xFF9800;
    if (hpPercentage < 0.2) color = 0xF44336;
    
    const width = Math.max(0, maxWidth * hpPercentage);
    
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, 12, 6);
    
    graphics.fillStyle(0xFFFFFF, 0.3);
    graphics.fillRoundedRect(0, 2, width, 4, 2);
  }

  updateModernHealthBar(type, pokemonData) {
    const healthBar = this.modernHealthBars[type];
    if (!healthBar) return;
    
    if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
      return;
    }
    
    healthBar.nameText.setText(pokemonData.name || 'Pokémon');
    healthBar.levelText.setText(`Niv. ${pokemonData.level || 1}`);
    
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    this.animateHealthBar(healthBar.hpBar, healthBar.config.width - 30, hpPercentage);
    
    if (type === 'player' && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    if (type === 'player' && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateExpBar(healthBar.expBar, healthBar.config.width - 30, expPercentage);
    }
    
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

  // ✅ MÉTHODES POUR CONTRÔLER LE BattleActionUI depuis BattleScene

  showActionButtons() {
    if (this.battleActionUI) {
      this.battleActionUI.show();
    }
  }

  hideActionButtons() {
    if (this.battleActionUI) {
      this.battleActionUI.hide();
    }
  }

  showActionMessage(message) {
    // Utiliser le système de dialogue pour les messages
    this.showBattleMessage(message);
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
    
    if (!gameRoom || !this.battleNetworkHandler) return;
    
    this.battleInventoryUI = new BattleInventoryUI(gameRoom, battleContext);
  }

  initializeCaptureManager() {
    if (!this.battleNetworkHandler) return;
    
    const playerRole = this.playerRole || 'player1';
    
    this.captureManager = new BattleCaptureManager(
      this,
      this.battleNetworkHandler,
      playerRole
    );
  }

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
    
    this.battleNetworkHandler.on('aiThinking', (data) => {
      this.handleBattleEvent('opponentTurn', data);
    });
    
    this.battleNetworkHandler.on('turnChanged', (data) => {
      if (data.currentTurn === 'player2' || data.currentTurn === 'narrator') {
        this.hideActionButtons();
      }
    });
    
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.hideActionButtons();
      setTimeout(() => {
        this.endBattle({ result: 'ended' });
      }, 3000);
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

  handleBattleEvent(eventType, data = {}) {
    if (eventType === 'moveUsed') return;
    
    if (eventType === 'yourTurn') {
      this.showActionButtons();
      return;
    }
    
    if (eventType === 'opponentTurn') {
      this.hideActionButtons();
    }

    if (eventType === 'battleEnd') {
      this.hideActionButtons();
      
      setTimeout(() => {
        this.endBattle({ result: 'ended' });
      }, 3000);
    }
    
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        this.showActionMessage(message);
      }
    }
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

  startBattle(battleData) {
    if (!this.isActive) return;

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
      return false;
    }
  }

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
    
    if (this.battleActionUI) {
      this.battleActionUI.hide();
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

  showPlayerPokemonFaint() {
    if (!this.playerPokemonSprite) return;
    
    this.tweens.add({
      targets: this.playerPokemonSprite,
      y: this.playerPokemonSprite.y + 30,
      alpha: 0.3,
      angle: -90,
      duration: 1500,
      ease: 'Power2.easeIn'
    });
    
    this.createKOEffect(this.playerPokemonSprite);
  }

  showEnemyPokemonFaint() {
    if (!this.opponentPokemonSprite) return;
    
    this.tweens.add({
      targets: this.opponentPokemonSprite,
      y: this.opponentPokemonSprite.y + 30,
      alpha: 0.3,
      angle: 90,
      duration: 1500,
      ease: 'Power2.easeIn'
    });
    
    this.createKOEffect(this.opponentPokemonSprite);
  }

  createKOEffect(sprite) {
    if (!sprite) return;
    
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
    if (!this.battleNetworkHandler?.isConnectedToBattle) {
      return;
    }
    
    this.hideActionButtons();
    this.showBattleEndMessage(winnerData);
    
    setTimeout(() => {
      this.endBattle({ result: 'completed', winner: winnerData.winner });
    }, 4000);
  }

  showBattleEndMessage(winnerData) {
    let fullMessage = winnerData.message;
    
    if (winnerData.winner === 'player1') {
      const rewards = this.calculateBattleRewards();
      
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
    
    this.showActionMessage(fullMessage);
    
    if (winnerData.winner === 'player1') {
      this.createVictoryEffect();
    }
  }

  calculateBattleRewards() {
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
    const { width, height } = this.cameras.main;
    
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

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();

    if (this.battleActionUI) {
      this.battleActionUI.destroy();
      this.battleActionUI = null;
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
}
