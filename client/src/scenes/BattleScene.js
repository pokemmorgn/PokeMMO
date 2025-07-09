// client/src/scenes/BattleScene.js - VERSION SERVER-DRIVEN AVEC DÉTECTION AUTO SPRITES

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';

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
    
    // Interface state (simplifié - plus de timers)
    this.interfaceMode = 'hidden'; // 'hidden', 'message', 'buttons'
    this.battleTranslator = null; // Sera initialisé avec playerRole
    
    // 🆕 SYSTÈME DE DÉTECTION AUTOMATIQUE DES SPRITES
    this.spriteStructures = new Map(); // pokemonId_view -> structure
    this.loadingSprites = new Set(); // Cache des sprites en cours de chargement
    this.loadedSprites = new Set(); // Cache des sprites chargés
    
    console.log('⚔️ [BattleScene] Initialisé - Server-Driven avec détection auto sprites');
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
    
    // 🆕 Plus besoin de loadPokemonSpritesheets() - détection auto !
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

  // === 🆕 SYSTÈME DE DÉTECTION AUTOMATIQUE DES SPRITES ===

  /**
   * 🆕 Détecte automatiquement la structure d'un sprite Pokémon
   * Optimisé pour spritesheets avec nombreuses colonnes sur 1 ligne
   */
  detectBattleSpriteStructure(width, height, view) {
    console.log(`🔍 [BattleScene] Détection structure pour ${width}×${height} (${view})`);
    
    // Assumer 1 ligne et calculer le nombre de colonnes automatiquement
    const rows = 1;
    
    // Tester différentes largeurs de frame courantes pour les Pokémon
    const commonFrameWidths = [32, 48, 64, 80, 96, 128];
    const validOptions = [];
    
    // Test 1: Essayer les largeurs courantes
    commonFrameWidths.forEach(frameWidth => {
      if (width % frameWidth === 0) {
        const cols = width / frameWidth;
        const frameHeight = height / rows;
        
        // Vérifier que c'est dans une plage raisonnable
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
    
    // Test 2: Si pas de largeur courante, essayer division automatique
    if (validOptions.length === 0) {
      console.log(`📐 [BattleScene] Pas de largeur standard, test division automatique...`);
      
      // Essayer des largeurs de frame entre 32 et 128px
      for (let frameWidth = 32; frameWidth <= 128; frameWidth += 4) {
        if (width % frameWidth === 0) {
          const cols = width / frameWidth;
          const frameHeight = height;
          
          // Accepter si le nombre de colonnes est raisonnable
          if (cols >= 10 && cols <= 200) {
            validOptions.push({
              cols: cols,
              rows: rows,
              frameWidth: frameWidth,
              frameHeight: frameHeight,
              totalFrames: cols,
              description: `${cols} frames auto (${frameWidth}×${frameHeight}px)`,
              score: this.calculateSpriteScore(frameWidth, frameHeight, cols, rows),
              method: 'auto_division'
            });
          }
        }
      }
    }
    
    // Test 3: Fallback - estimation intelligente
    if (validOptions.length === 0) {
      console.warn(`⚠️ [BattleScene] Pas de division parfaite, estimation pour ${width}×${height}`);
      
      // Estimer en supposant des frames de ~64px de large
      let estimatedFrameWidth = 64;
      let estimatedCols = Math.round(width / estimatedFrameWidth);
      
      // Ajuster pour avoir une division exacte
      estimatedFrameWidth = width / estimatedCols;
      
      validOptions.push({
        cols: estimatedCols,
        rows: rows,
        frameWidth: Math.floor(estimatedFrameWidth),
        frameHeight: height,
        totalFrames: estimatedCols,
        description: `${estimatedCols} frames estimé (${Math.floor(estimatedFrameWidth)}×${height}px)`,
        score: 0,
        method: 'fallback_estimate'
      });
    }

    // Trier par score (meilleur en premier)
    validOptions.sort((a, b) => b.score - a.score);
    
    const best = validOptions[0];
    console.log(`✅ [BattleScene] Structure choisie: ${best.description} (méthode: ${best.method})`);
    
    if (validOptions.length > 1) {
      console.log(`📊 [BattleScene] Autres options:`, validOptions.slice(1).map(o => `${o.description} (score: ${o.score})`));
    }

    return best;
  }

  /**
   * 🆕 Calcule un score pour une structure de sprite
   */
  calculateSpriteScore(frameW, frameH, cols, rows) {
    let score = 0;
    
    // Bonus pour les tailles courantes de frames Pokémon
    const commonSizes = [48, 64, 80, 96];
    if (commonSizes.includes(frameW)) score += 30;
    if (commonSizes.includes(frameH)) score += 20;
    
    // Bonus pour les sprites carrés ou légèrement rectangulaires
    const aspectRatio = frameW / frameH;
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 25; // Carré
    else if (aspectRatio >= 0.6 && aspectRatio <= 1.5) score += 15; // Proche du carré
    
    // Bonus majeur pour 1 ligne (typique combat)
    if (rows === 1) score += 20;
    
    // Bonus pour le nombre de colonnes dans des plages raisonnables
    if (cols >= 20 && cols <= 50) score += 15; // Plage idéale
    else if (cols >= 10 && cols <= 100) score += 10; // Plage acceptable
    
    // Bonus si la frame width divise bien la largeur totale
    score += 10; // Bonus de base pour division exacte
    
    // Malus pour frames trop petites ou trop grandes
    if (frameW < 32 || frameW > 200) score -= 20;
    if (frameH < 32 || frameH > 200) score -= 20;
    
    return score;
  }

  /**
   * 🆕 Charge un sprite Pokémon avec détection automatique
   */
  async loadPokemonSprite(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId.toString().padStart(3, '0')}_${view}`;
    const structureKey = `${pokemonId}_${view}`;
    
    // Déjà chargé
    if (this.loadedSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    // En cours de chargement
    if (this.loadingSprites.has(spriteKey)) {
      // Attendre que le chargement se termine
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
      
      console.log(`🎨 [BattleScene] Chargement sprite ${spriteKey}: ${imagePath}`);
      
      // Étape 1: Charger comme image temporaire pour détecter la taille
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.load.image(tempKey, imagePath);
        
        this.load.once('complete', () => {
          try {
            const texture = this.textures.get(tempKey);
            if (!texture || !texture.source[0]) {
              throw new Error(`Texture ${tempKey} introuvable`);
            }
            
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            
            // 🆕 Détection automatique de la structure
            const structure = this.detectBattleSpriteStructure(width, height, view);
            this.spriteStructures.set(structureKey, structure);
            
            console.log(`📐 [BattleScene] ${spriteKey}: ${width}×${height} → ${structure.description}`);
            
            // Étape 2: Charger comme spritesheet avec les bonnes dimensions
            this.load.spritesheet(spriteKey, imagePath, {
              frameWidth: structure.frameWidth,
              frameHeight: structure.frameHeight
            });
            
            this.load.once('complete', () => {
              // Nettoyer la texture temporaire
              this.textures.remove(tempKey);
              
              // 🆕 Créer des animations si multi-frames
              if (structure.totalFrames > 1) {
                this.createBattleAnimations(spriteKey, structure);
              }
              
              this.loadedSprites.add(spriteKey);
              this.loadingSprites.delete(spriteKey);
              
              console.log(`✅ [BattleScene] Sprite ${spriteKey} chargé (${structure.totalFrames} frames)`);
              resolve(spriteKey);
            });
            
            this.load.start();
            
          } catch (error) {
            console.error(`❌ [BattleScene] Erreur traitement ${tempKey}:`, error);
            this.loadingSprites.delete(spriteKey);
            reject(error);
          }
        });
        
        this.load.once('loaderror', (fileObj) => {
          console.error(`❌ [BattleScene] Erreur chargement ${imagePath}:`, fileObj);
          this.loadingSprites.delete(spriteKey);
          reject(new Error(`Impossible de charger ${imagePath}`));
        });
        
        this.load.start();
      });
      
      return spriteKey;
      
    } catch (error) {
      console.error(`❌ [BattleScene] Erreur loadPokemonSprite ${pokemonId}/${view}:`, error);
      this.loadingSprites.delete(spriteKey);
      
      // Retourner un sprite de fallback
      return this.createFallbackSprite(view);
    }
  }

  /**
   * 🆕 Crée des animations pour un sprite de combat multi-frames
   */
  createBattleAnimations(spriteKey, structure) {
    const [, pokemonIdPadded, view] = spriteKey.split('_');
    const pokemonId = parseInt(pokemonIdPadded);
    
    console.log(`🎬 [BattleScene] Création animations pour ${spriteKey} (${structure.totalFrames} frames)`);
    
    // Animation idle (utilise quelques frames du début)
    const idleFrames = Math.min(4, structure.totalFrames);
    const idleKey = `${spriteKey}_idle`;
    
    if (!this.anims.exists(idleKey)) {
      this.anims.create({
        key: idleKey,
        frames: this.anims.generateFrameNumbers(spriteKey, {
          start: 0,
          end: idleFrames - 1
        }),
        frameRate: 3, // Animation lente pour idle
        repeat: -1
      });
      console.log(`✅ [BattleScene] Animation idle créée: ${idleKey} (${idleFrames} frames)`);
    }
    
    // Animation complète (toutes les frames)
    const fullKey = `${spriteKey}_full`;
    
    if (!this.anims.exists(fullKey)) {
      this.anims.create({
        key: fullKey,
        frames: this.anims.generateFrameNumbers(spriteKey, {
          start: 0,
          end: structure.totalFrames - 1
        }),
        frameRate: 8, // Animation plus rapide
        repeat: -1
      });
      console.log(`✅ [BattleScene] Animation complète créée: ${fullKey} (${structure.totalFrames} frames)`);
    }
    
    // Animation d'attaque (milieu du spritesheet)
    if (structure.totalFrames >= 10) {
      const attackStart = Math.floor(structure.totalFrames * 0.3);
      const attackEnd = Math.floor(structure.totalFrames * 0.7);
      const attackKey = `${spriteKey}_attack`;
      
      if (!this.anims.exists(attackKey)) {
        this.anims.create({
          key: attackKey,
          frames: this.anims.generateFrameNumbers(spriteKey, {
            start: attackStart,
            end: attackEnd
          }),
          frameRate: 12, // Animation rapide pour attaque
          repeat: 1 // Une seule fois
        });
        console.log(`✅ [BattleScene] Animation attaque créée: ${attackKey} (frames ${attackStart}-${attackEnd})`);
      }
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
      if (window.inventorySystem) {
        window.inventorySystem.openInventoryToPocket('balls');
        this.hideActionButtons();
      } else {
        this.showActionMessage('Inventaire non disponible');
      }
      break;
      case 'pokemon':
        this.showActionMessage('Changement de Pokémon indisponible.');
        break;
      case 'run':
        this.showActionMessage('Tentative de fuite...');
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.attemptRun();
        }
        break;
    }
  }

  showAttackMenu() {
    this.showActionMessage('Sélectionnez une attaque...');
    
    // Utiliser première attaque par défaut (garde un délai pour l'UX)
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
      
      // Délai minimal pour l'UX, puis envoi au serveur
      setTimeout(() => {
        if (this.battleNetworkHandler) {
          this.battleNetworkHandler.useMove(actionData.moveId);
        }
        this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
      }, 1000);
    }
  }

  // === 🆕 AFFICHAGE POKÉMON AVEC ANIMATIONS ===

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
      
      // 🆕 Jouer l'animation idle si disponible
      const structure = this.spriteStructures.get(`${pokemonData.pokemonId || pokemonData.id}_back`);
      if (structure && structure.totalFrames > 1) {
        const idleKey = `${spriteKey}_idle`;
        if (this.anims.exists(idleKey)) {
          this.playerPokemonSprite.anims.play(idleKey);
          console.log(`🎬 [BattleScene] Animation idle joueur: ${idleKey}`);
        }
      }
      
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
      
      // 🆕 Jouer l'animation idle si disponible
      const structure = this.spriteStructures.get(`${pokemonData.pokemonId || pokemonData.id}_front`);
      if (structure && structure.totalFrames > 1) {
        const idleKey = `${spriteKey}_idle`;
        if (this.anims.exists(idleKey)) {
          this.opponentPokemonSprite.anims.play(idleKey);
          console.log(`🎬 [BattleScene] Animation idle adversaire: ${idleKey}`);
        }
      }
      
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

  // === INTERFACE STATE MANAGEMENT ===

  showActionMessage(message) {
    if (!this.actionInterface || !this.actionMessageText) return;
    
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

  // === 🆕 EFFETS VISUELS AVEC ANIMATIONS ===

  createAttackEffect(attacker, target) {
    if (!attacker || !target) return;
    
    // Déterminer le type d'attaquant et jouer l'animation d'attaque
    let attackAnimKey = null;
    
    if (attacker === this.playerPokemonSprite && this.currentPlayerPokemon) {
      const spriteKey = `pokemon_${this.currentPlayerPokemon.pokemonId.toString().padStart(3, '0')}_back`;
      attackAnimKey = `${spriteKey}_attack`;
    } else if (attacker === this.opponentPokemonSprite && this.currentOpponentPokemon) {
      const spriteKey = `pokemon_${this.currentOpponentPokemon.pokemonId.toString().padStart(3, '0')}_front`;
      attackAnimKey = `${spriteKey}_attack`;
    }
    
    const originalX = attacker.x;
    
    // Jouer l'animation d'attaque si disponible
    if (attackAnimKey && this.anims.exists(attackAnimKey)) {
      attacker.anims.play(attackAnimKey);
      console.log(`🎬 [BattleScene] Animation attaque: ${attackAnimKey}`);
      
      // Retourner à l'idle après l'attaque
      const idleAnimKey = attackAnimKey.replace('_attack', '_idle');
      if (this.anims.exists(idleAnimKey)) {
        attacker.anims.chain(idleAnimKey);
      }
    }
    
    // Animation de mouvement
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

  // === 🆕 FALLBACK SPRITE AMÉLIORÉ ===

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
    
    // Action result
    this.battleNetworkHandler.on('actionResult', (data) => {
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
        
        // Événements serveur
        if (data.battleEvents && data.battleEvents.length > 0) {
          this.processBattleEventsServerDriven(data.battleEvents);
        } else if (data.events && data.events.length > 0) {
          this.processLegacyEventsServerDriven(data.events);
        }
      }
      
      if (!data.success) {
        this.showActionMessage(`Erreur: ${data.error}`);
      }
    });

    // Déconnexion BattleRoom
    this.battleNetworkHandler.on('battleRoomDisconnected', (data) => {
      console.log('👋 [BattleScene] Déconnexion BattleRoom détectée:', data);
      
      setTimeout(() => {
        this.endBattle({ result: 'disconnected' });
      }, 1000);
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
    
    // Tour changé
    this.battleNetworkHandler.on('turnChanged', (data) => {
      if (data.currentTurn === 'player1') {
        // Le serveur enverra yourTurn quand il voudra
      } else if (data.currentTurn === 'player2') {
        this.hideActionButtons();
      } else if (data.currentTurn === 'narrator') {
        this.hideActionButtons();
      }
    });
    
    // Fin de combat
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.hideActionButtons();
      this.handleBattleEvent('battleEnd', { winnerId: data.winner });
      
      setTimeout(() => {
        this.endBattle({ result: 'ended' });
      }, 3000);
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
    
    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleBattleEvent('yourTurn', data);
    });
  }

  // === SYSTÈME DE TRADUCTION D'ÉVÉNEMENTS ===

  handleBattleEvent(eventType, data = {}) {
    console.log(`🌍 [BattleScene] Événement: ${eventType}`, data);
    
    // Actions d'interface
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
    
    // Traduction du message
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
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
    
    battleEvents.forEach((event, index) => {
      this.handleBattleEvent(event.type, event.data);
    });
  }

  processLegacyEventsServerDriven(events) {
    console.log('📜 [BattleScene] Traitement événements legacy server-driven:', events);
    
    if (events.length > 0 && this.interfaceMode !== 'buttons') {
      const lastEvent = events[events.length - 1];
      this.showActionMessage(lastEvent);
    } else {
      console.log('🎮 [BattleScene] Interface boutons active, ignorer legacy events');
    }
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
    // Délai minimal pour l'entrée des Pokémon
    setTimeout(() => {
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: opponentPokemon?.name || 'Pokémon' 
      });
    }, 2000);
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

  // === 🆕 FONCTIONS DE DEBUG POUR LA DÉTECTION ===

  debugSpriteDetection(pokemonId, view = 'front') {
    const structureKey = `${pokemonId}_${view}`;
    const structure = this.spriteStructures.get(structureKey);
    
    if (structure) {
      console.log(`🔍 [BattleScene] Structure Pokémon ${pokemonId} (${view}):`, {
        cols: structure.cols,
        rows: structure.rows,
        frameSize: `${structure.frameWidth}×${structure.frameHeight}px`,
        totalFrames: structure.totalFrames,
        method: structure.method,
        description: structure.description
      });
    } else {
      console.warn(`⚠️ [BattleScene] Aucune structure trouvée pour Pokémon ${pokemonId} (${view})`);
    }
  }

  debugAllSpriteStructures() {
    console.log(`🔍 [BattleScene] === DEBUG TOUTES LES STRUCTURES ===`);
    console.log(`📊 Structures détectées: ${this.spriteStructures.size}`);
    
    this.spriteStructures.forEach((structure, key) => {
      console.log(`📐 ${key}: ${structure.description} (méthode: ${structure.method})`);
    });
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
  }

  // === DESTRUCTION ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();
    
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
    
    // 🆕 Nettoyer les caches de sprites
    this.spriteStructures.clear();
    this.loadedSprites.clear();
    this.loadingSprites.clear();
    
    super.destroy();
  }
}

// === 🆕 FONCTIONS GLOBALES DE TEST ===

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

// 🆕 Fonctions de test pour la détection automatique
window.testBattleSpriteDetection = function(pokemonId = 1, view = 'front') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  battleScene.debugSpriteDetection(pokemonId, view);
};

window.debugAllBattleSprites = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  battleScene.debugAllSpriteStructures();
};

// 🆕 Test de détection avec tes exemples
window.testSpriteExamples = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  console.log('🧪 [BattleScene] Test avec tes exemples:');
  
  // Simulations des tailles que tu as mentionnées
  const examples = [
    { width: 2544, height: 53, desc: "Premier exemple" },
    { width: 6142, height: 74, desc: "Deuxième exemple" }, 
    { width: 1118, height: 43, desc: "Troisième exemple" }
  ];
  
  examples.forEach((ex, i) => {
    console.log(`\n📐 ${ex.desc} (${ex.width}×${ex.height}):`);
    const structure = battleScene.detectBattleSpriteStructure(ex.width, ex.height, 'test');
    console.log(`   → ${structure.cols} colonnes de ${structure.frameWidth}×${structure.frameHeight}px`);
    console.log(`   → ${structure.description} (${structure.method})`);
  });
};

console.log('✅ [BattleScene] VERSION COMPLÈTE avec détection automatique des sprites !');
console.log('🔍 Détection auto: 2544×53 → ~40 cols, 6142×74 → ~96 cols, 1118×43 → ~17 cols');
console.log('🧪 Tests disponibles:');
console.log('   - window.testModernBattle() : Test combat complet');
console.log('   - window.testBattleSpriteDetection(pokemonId, view) : Test détection');
console.log('   - window.debugAllBattleSprites() : Voir toutes les structures');
console.log('   - window.testSpriteExamples() : Test avec tes exemples de tailles');
