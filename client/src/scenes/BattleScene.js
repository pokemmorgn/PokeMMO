// client/src/scenes/BattleScene.js - VERSION MODERNE ET NOSTALGIQUE COMPLÈTE

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers
    this.battleManager = null;
    this.gameManager = null;
    this.networkHandler = null;
    this.healthBarManager = null;
    this.battleActionUI = null;
    this.battleNetworkHandler = null;
    
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    
    // Sprites et éléments visuels
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    this.groundElements = [];
    this.environmentElements = [];
    
    // Interface moderne
    this.modernHealthBars = {
      player: null,
      opponent: null
    };
    this.actionInterface = null;
    this.battleDialog = null;
    this.statusEffects = {
      player: [],
      opponent: []
    };
    
    // Cache des données
    this.frameSizeCache = new Map();
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.previousUIState = null;
    
    // Positions optimisées pour le style Pokémon
    this.pokemonPositions = {
      player: { x: 0.22, y: 0.75 },      // Position Pokémon joueur (dos)
      opponent: { x: 0.78, y: 0.35 },    // Position Pokémon adversaire (face)
      playerPlatform: { x: 0.25, y: 0.85 },  // Plateforme joueur
      opponentPlatform: { x: 0.75, y: 0.45 } // Plateforme adversaire
    };
    
    // Animations et effets
    this.battleEffects = [];
    this.screenShakeIntensity = 0;
    
    console.log('⚔️ [BattleScene] Constructeur moderne et nostalgique initialisé');
  }

  // === INITIALISATION ===

init(data = {}) {
  console.log('[BUGPOKEMON] 🔧 BattleScene.init appelée avec:', data);
  console.log('[BUGPOKEMON] 🔍 data.battleData existe ?', !!data.battleData);
  console.log('[BUGPOKEMON] 🔍 data.selectedPokemon existe ?', !!data.selectedPokemon);
  
  this.gameManager = data.gameManager
    || this.scene.get('GameScene')?.gameManager
    || window.pokemonUISystem?.gameManager
    || window.gameManager;

  this.battleNetworkHandler = data.battleNetworkHandler
    || window.battleSystem?.battleConnection?.networkHandler
    || window.globalNetworkManager?.battleNetworkHandler
    || null;

  if (!this.battleNetworkHandler) {
    console.warn('[BUGPOKEMON] ⚠️ BattleNetworkHandler non trouvé dans init');
  } else {
    console.log('[BUGPOKEMON] ✅ BattleNetworkHandler trouvé');
  }

  if (!this.gameManager) {
    console.warn('[BUGPOKEMON] ⚠️ GameManager manquant dans init');
  }
  
  // ✅ AJOUTER : Si on a des battleData, déclencher le combat !
  if (data.battleData) {
    console.log('[BUGPOKEMON] 🎯 Déclenchement automatique startBattle...');
    // Attendre que la scène soit complètement créée
    this.events.once('create', () => {
      console.log('[BUGPOKEMON] 🚀 Scene créée, appel startBattle...');
      this.startBattle(data.battleData);
    });
  }
}

  preload() {
    console.log('📁 [BattleScene] Préchargement ressources modernes...');
    
    // Background de combat amélioré
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    // Éléments d'interface moderne
    if (!this.textures.exists('battle_platform')) {
      // Créer des plateformes visuelles
      this.createPlatformTextures();
    }
    
    // Charger les sprites Pokémon
    this.loadPokemonSpritesheets();
    
    this.load.on('complete', () => {
      console.log('✅ [BattleScene] Chargement terminé');
    });
  }

  create() {
    console.log('🎨 [BattleScene] Création scène moderne et nostalgique...');

    // Masquer par défaut
    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      // 1. Créer l'environnement
      this.createModernBattleEnvironment();
      
      // 2. Créer les plateformes Pokémon
      this.createPokemonPlatforms();
      
      // 3. Initialiser le système de barres de vie moderne
      this.healthBarManager = new HealthBarManager(this);
      this.createModernHealthBars();
      
      // 4. Créer l'interface d'actions moderne
      this.createModernActionInterface();
      
      // 5. Créer le système de dialogue de combat
      this.createBattleDialog();
      
      // 6. Setup des managers et événements
      this.setupBattleManagers();
      this.setupModernEvents();
      this.setupBattleNetworkEvents();
      
      this.isActive = true;
      this.isReadyForActivation = true;
      
      console.log('✅ [BattleScene] Scène moderne créée avec succès');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === CRÉATION ENVIRONNEMENT MODERNE ===

  createModernBattleEnvironment() {
    console.log('🌍 [BattleScene] Création environnement moderne...');
    
    const { width, height } = this.cameras.main;
    
    // Background principal avec dégradé
    this.createEnhancedBackground(width, height);
    
    // Éléments d'atmosphère
    this.createAtmosphereEffects(width, height);
    
    // Terrain de combat
    this.createBattleGround(width, height);
    
    console.log('✅ [BattleScene] Environnement moderne créé');
  }

  createEnhancedBackground(width, height) {
    // Background avec texture si disponible
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.1; // Légèrement plus grand
      
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      
      // Effet de parallaxe subtil
      this.battleBackground.setTint(0xf0f8ff);
    } else {
      // Fallback avec dégradé moderne
      this.createModernGradientBackground(width, height);
    }
  }

  createModernGradientBackground(width, height) {
    const bg = this.add.graphics();
    
    // Dégradé moderne du ciel à l'herbe
    bg.fillGradientStyle(
      0x87CEEB, 0x87CEEB,  // Bleu ciel en haut
      0x98FB98, 0x228B22   // Vert herbe en bas
    );
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    
    // Ligne d'horizon moderne
    const horizonY = height * 0.55;
    bg.lineStyle(2, 0x2F4F2F, 0.5);
    bg.lineBetween(0, horizonY, width, horizonY);
    
    // Nuages stylisés
    this.createStylizedClouds(width, height);
    
    this.battleBackground = bg;
  }

  createStylizedClouds(width, height) {
    const cloudPositions = [
      { x: width * 0.2, y: height * 0.25 },
      { x: width * 0.7, y: height * 0.15 },
      { x: width * 0.9, y: height * 0.3 }
    ];
    
    cloudPositions.forEach(pos => {
      const cloud = this.add.ellipse(pos.x, pos.y, 80, 40, 0xFFFFFF, 0.7);
      cloud.setDepth(-90);
      
      // Animation flottante
      this.tweens.add({
        targets: cloud,
        y: pos.y - 10,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  createAtmosphereEffects(width, height) {
    // Effet de luminosité douce (herbe supprimée)
    this.createAmbientLighting(width, height);
  }

  createGrassParticles(width, height) {
    // Méthode supprimée - plus de particules d'herbe
    return;
  }

  createAmbientLighting(width, height) {
    const lightOverlay = this.add.graphics();
    lightOverlay.fillGradientStyle(
      0xFFFFE0, 0xFFFFE0,  // Lumière dorée
      0xFFFFE0, 0xFFFFE0,
      0.1
    );
    lightOverlay.fillRect(0, 0, width, height);
    lightOverlay.setDepth(-70);
    lightOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
  }

  createBattleGround(width, height) {
    // Terrain principal simplifié - SANS BASE D'HERBE
    const groundY = height * 0.75;
    const ground = this.add.graphics();
    
    // Sol basique sans texture d'herbe
    ground.fillStyle(0x87CEEB, 0.1);  // Bleu très transparent pour continuité
    ground.fillRect(0, groundY, width, height - groundY);
    
    // Ligne d'horizon simple
    ground.lineStyle(1, 0x2F4F2F, 0.2);
    ground.lineBetween(0, groundY, width, groundY);
    
    ground.setDepth(-60);
    this.groundElements.push(ground);
  }

  // === PLATEFORMES POKÉMON ===

  createPokemonPlatforms() {
    console.log('🏔️ [BattleScene] Création plateformes Pokémon...');
    
    const { width, height } = this.cameras.main;
    
    // Plateforme joueur (perspective proche)
    this.createPlatform(
      width * this.pokemonPositions.playerPlatform.x,
      height * this.pokemonPositions.playerPlatform.y,
      120, 'player'
    );
    
    // Plateforme adversaire (perspective lointaine)
    this.createPlatform(
      width * this.pokemonPositions.opponentPlatform.x,
      height * this.pokemonPositions.opponentPlatform.y,
      80, 'opponent'
    );
    
    console.log('✅ [BattleScene] Plateformes créées');
  }

  createPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    
    // Ombre de la plateforme
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 5, y + 5, size, size * 0.3);
    
    // Plateforme principale
    platform.fillStyle(type === 'player' ? 0x8B4513 : 0x696969, 0.7);
    platform.fillEllipse(x, y, size, size * 0.3);
    
    // Bordure
    platform.lineStyle(2, type === 'player' ? 0x654321 : 0x555555, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.3);
    
    platform.setDepth(type === 'player' ? 10 : 5);
    
    // Stocker la référence
    if (type === 'player') {
      this.playerPlatform = platform;
    } else {
      this.opponentPlatform = platform;
    }
  }

  createPlatformTextures() {
    // Créer des textures de plateformes dynamiquement si nécessaire
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Plateforme marron pour le joueur
    const gradient = ctx.createRadialGradient(60, 20, 0, 60, 20, 60);
    gradient.addColorStop(0, '#D2B48C');
    gradient.addColorStop(1, '#8B4513');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 120, 40);
    
    this.textures.addCanvas('battle_platform_player', canvas);
  }

  // === BARRES DE VIE MODERNES ===

  createModernHealthBars() {
    console.log('❤️ [BattleScene] Création barres de vie modernes...');
    
    const { width, height } = this.cameras.main;
    
    // Barre de vie adversaire (à gauche du Pokémon adversaire)
    this.createModernHealthBar('opponent', {
      x: width * 0.05,  // Changé de 0.65 à 0.05 (à gauche)
      y: height * 0.15,
      width: 280,
      height: 80
    });
    
    // Barre de vie joueur (en bas à gauche)
    this.createModernHealthBar('player', {
      x: width * 0.05,
      y: height * 0.75,
      width: 320,
      height: 100
    });
    
    console.log('✅ [BattleScene] Barres de vie modernes créées');
  }

  createModernHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    
    // Background de la barre avec style moderne
    const bgPanel = this.add.graphics();
    bgPanel.fillStyle(0x000000, 0.7);
    bgPanel.fillRoundedRect(0, 0, config.width, config.height, 12);
    
    // Bordure moderne
    bgPanel.lineStyle(3, type === 'player' ? 0x4A90E2 : 0xE74C3C, 1);
    bgPanel.strokeRoundedRect(0, 0, config.width, config.height, 12);
    
    // Nom du Pokémon
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
    
    // Conteneur barre de vie
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x333333, 1);
    hpBarBg.fillRoundedRect(15, config.height - 35, config.width - 30, 12, 6);
    
    // Barre de vie actuelle
    const hpBar = this.add.graphics();
    this.updateHealthBarVisual(hpBar, config.width - 30, 1.0, true);
    hpBar.x = 15;
    hpBar.y = config.height - 35;
    
    // Texte HP pour le joueur
    let hpText = null;
    if (type === 'player') {
      hpText = this.add.text(config.width - 100, config.height - 55, '--/--', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold'
      });
    }
    
    // Barre d'expérience pour le joueur
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
    
    // Ajouter tous les éléments au conteneur
    container.add([bgPanel, nameText, levelText, hpBarBg, hpBar]);
    if (hpText) container.add(hpText);
    
    // Sauvegarder les références
    container.setDepth(100);
    container.setVisible(false);
    
    this.modernHealthBars[type] = {
      container,
      nameText,
      levelText,
      hpBar,
      hpText,
      expBar,
      config
    };
  }

  updateHealthBarVisual(graphics, maxWidth, hpPercentage, animate = true) {
    graphics.clear();
    
    // Couleur selon le pourcentage de vie
    let color = 0x4CAF50; // Vert
    if (hpPercentage < 0.5) color = 0xFF9800; // Orange
    if (hpPercentage < 0.2) color = 0xF44336; // Rouge
    
    const width = Math.max(0, maxWidth * hpPercentage);
    
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, 12, 6);
    
    // Effet de brillance
    graphics.fillStyle(0xFFFFFF, 0.3);
    graphics.fillRoundedRect(0, 2, width, 4, 2);
  }

  // === INTERFACE D'ACTIONS MODERNE ===

createModernActionInterface() {
    console.log('🎮 [BattleScene] Création interface d\'actions moderne...');
    
    const { width, height } = this.cameras.main;
    
    // Conteneur principal pour l'interface - DÉPLACÉ À DROITE
    this.actionInterface = this.add.container(width - 420, height - 180);
    
    // Panel principal avec style Pokémon moderne - AJOUTÉ EN PREMIER
    const mainPanel = this.add.graphics();
    mainPanel.fillStyle(0x1a1a1a, 0.95);
    mainPanel.fillRoundedRect(20, 0, 380, 160, 16);  // Ajusté la largeur
    
    // Bordure stylée
    mainPanel.lineStyle(4, 0x4A90E2, 1);
    mainPanel.strokeRoundedRect(20, 0, 380, 160, 16);
    
    // IMPORTANT: Ajouter le panel en PREMIER pour qu'il soit en arrière-plan
    this.actionInterface.add(mainPanel);
    
    // Boutons d'action modernes - AJOUTÉS APRÈS pour être au premier plan
    this.createActionButtons();
    
    this.actionInterface.setDepth(200);
    this.actionInterface.setVisible(false);
    
    console.log('✅ [BattleScene] Interface d\'actions moderne créée à droite');
  }

  createActionButtons() {
    const buttonConfig = {
      width: 160,  // Légèrement réduit pour s'adapter à droite
      height: 50,
      gap: 15
    };
    
    const startX = 40;
    const startY = 40;
    
    const actions = [
      { key: 'attack', text: 'Attaque', color: 0xE74C3C, icon: '⚔️' },
      { key: 'bag', text: 'Sac', color: 0x9B59B6, icon: '🎒' },
      { key: 'pokemon', text: 'Pokémon', color: 0x3498DB, icon: '🔄' },
      { key: 'run', text: 'Fuite', color: 0x95A5A6, icon: '🏃' }
    ];
    
    actions.forEach((action, index) => {
      const x = startX + (index % 2) * (buttonConfig.width + buttonConfig.gap);
      const y = startY + Math.floor(index / 2) * (buttonConfig.height + 15);
      
      const button = this.createModernButton(x, y, buttonConfig, action);
      this.actionInterface.add(button);
    });
  }

  createModernButton(x, y, config, action) {
    const buttonContainer = this.add.container(x, y);
    
    // Background du bouton
    const bg = this.add.graphics();
    bg.fillStyle(action.color, 0.8);
    bg.fillRoundedRect(0, 0, config.width, config.height, 12);
    
    // Bordure
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
    
    // Interactivité
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
        scaleX: 1.05,
        scaleY: 1.05,
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
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
    
    // Action au clic
    buttonContainer.on('pointerdown', () => {
      this.handleActionButton(action.key);
    });
    
    return buttonContainer;
  }

  // === SYSTÈME DE DIALOGUE MODERNE ===

  createBattleDialog() {
    console.log('💬 [BattleScene] Création système de dialogue...');
    
    const { width, height } = this.cameras.main;
    
    this.battleDialog = this.add.container(0, height - 100);
    
    // Panel de dialogue
    const dialogPanel = this.add.graphics();
    dialogPanel.fillStyle(0x000000, 0.9);
    dialogPanel.fillRoundedRect(20, 0, width - 40, 80, 12);
    
    dialogPanel.lineStyle(3, 0xFFFFFF, 0.8);
    dialogPanel.strokeRoundedRect(20, 0, width - 40, 80, 12);
    
    // Texte du dialogue
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
    
    console.log('✅ [BattleScene] Système de dialogue créé');
  }

  showBattleMessage(message, duration = 3000) {
    if (!this.battleDialog || !this.dialogText) return;
    
    this.dialogText.setText(message);
    this.battleDialog.setVisible(true);
    
    // Animation d'apparition
    this.battleDialog.setAlpha(0);
    this.tweens.add({
      targets: this.battleDialog,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
    
    // Masquer après délai
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

  // === GESTION DES POKÉMON AVEC STYLE MODERNE ===

  async displayPlayerPokemon(pokemonData) {
    console.log('👤 [BattleScene] Affichage Pokémon joueur moderne:', pokemonData);
    
    if (!this.pokemonPositions) {
      this.calculatePokemonPositions();
    }
    
    // Nettoyer ancien sprite
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (!pokemonData) return;
    
    try {
      // Charger et créer le sprite
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'back');
      
      const { width, height } = this.cameras.main;
      const x = width * this.pokemonPositions.player.x;
      const y = height * this.pokemonPositions.player.y;
      
      this.playerPokemonSprite = this.add.sprite(x, y, spriteKey, 0);
      this.playerPokemonSprite.setScale(3.5);
      this.playerPokemonSprite.setDepth(25);
      this.playerPokemonSprite.setOrigin(0.5, 1);
      
      // Animation d'entrée moderne
      this.animateModernPokemonEntry(this.playerPokemonSprite, 'left');
      
      // Sauvegarder données
      this.currentPlayerPokemon = pokemonData;
      
      // Mettre à jour la barre de vie
      setTimeout(() => {
        this.updateModernHealthBar('player', pokemonData);
      }, 500);
      
      console.log('✅ [BattleScene] Pokémon joueur affiché avec style moderne');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon joueur:', error);
      this.createModernPokemonPlaceholder('player', pokemonData);
    }
  }

  async displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire moderne:', pokemonData);
    
    if (!this.pokemonPositions) {
      this.calculatePokemonPositions();
    }
    
    // Nettoyer ancien sprite
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    if (!pokemonData) return;
    
    try {
      // Charger et créer le sprite
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'front');
      
      const { width, height } = this.cameras.main;
      const x = width * this.pokemonPositions.opponent.x;
      const y = height * this.pokemonPositions.opponent.y;
      
      this.opponentPokemonSprite = this.add.sprite(x, y, spriteKey, 0);
      this.opponentPokemonSprite.setScale(2.8);
      this.opponentPokemonSprite.setDepth(20);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      // Animation d'entrée moderne
      this.animateModernPokemonEntry(this.opponentPokemonSprite, 'right');
      
      // Effet shiny si applicable
      if (pokemonData.shiny) {
        this.addModernShinyEffect(this.opponentPokemonSprite);
      }
      
      // Sauvegarder données
      this.currentOpponentPokemon = pokemonData;
      
      // Mettre à jour la barre de vie
      setTimeout(() => {
        this.updateModernHealthBar('opponent', pokemonData);
      }, 800);
      
      console.log('✅ [BattleScene] Pokémon adversaire affiché avec style moderne');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon adversaire:', error);
      this.createModernPokemonPlaceholder('opponent', pokemonData);
    }
  }

  animateModernPokemonEntry(sprite, direction) {
    if (!sprite) return null;
    
    const targetX = sprite.x;
    const targetY = sprite.y;
    const targetScale = sprite.scaleX;
    
    // Position de départ avec effet dramatique
    const { width } = this.cameras.main;
    const startX = direction === 'left' ? -150 : width + 150;
    const startY = targetY + 50;
    
    // Configuration initiale
    sprite.setPosition(startX, startY);
    sprite.setScale(targetScale * 0.3);
    sprite.setAlpha(0);
    sprite.setVisible(true);
    sprite.setActive(true);
    
    // Animation principale avec style moderne
    const mainTween = this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 1000,
      ease: 'Back.easeOut',
      onStart: () => {
        // Effet de particules d'entrée
        this.createEntryParticles(targetX, targetY);
        
        // Shake de caméra léger
        this.cameras.main.shake(300, 0.005);
      },
      onComplete: () => {
        // Animation de rebond final
        this.tweens.add({
          targets: sprite,
          y: targetY - 15,
          duration: 200,
          ease: 'Quad.easeOut',
          yoyo: true,
          onComplete: () => {
            // Animation de respiration idle
            this.addIdleAnimation(sprite, targetY);
          }
        });
      }
    });
    
    return mainTween;
  }

  createEntryParticles(x, y) {
    // Particules d'impact moderne
    for (let i = 0; i < 12; i++) {
      const particle = this.add.circle(x, y, 4, 0xFFD700, 0.8);
      particle.setDepth(30);
      
      const angle = (i / 12) * Math.PI * 2;
      const distance = 60;
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  addIdleAnimation(sprite, baseY) {
    // Animation de respiration continue
    this.tweens.add({
      targets: sprite,
      y: baseY - 8,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  addModernShinyEffect(sprite) {
    if (!sprite) return;
    
    // Effet shiny moderne avec particules
    this.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Particules brillantes continues
    this.time.addEvent({
      delay: 1500,
      callback: () => {
        if (sprite && sprite.active) {
          this.createShinyParticles(sprite.x, sprite.y);
        }
      },
      repeat: -1
    });
  }

  createShinyParticles(x, y) {
    for (let i = 0; i < 5; i++) {
      const particle = this.add.star(
        x + Phaser.Math.Between(-30, 30),
        y + Phaser.Math.Between(-40, 20),
        5, 8, 16,
        0xFFD700, 0.8
      );
      particle.setDepth(35);
      
      this.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        scale: 0.3,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  createModernPokemonPlaceholder(type, pokemonData) {
    console.log(`🎭 [BattleScene] Création placeholder moderne ${type}:`, pokemonData.name);
    
    const { width, height } = this.cameras.main;
    const position = type === 'player' ? 
      { x: width * this.pokemonPositions.player.x, y: height * this.pokemonPositions.player.y } :
      { x: width * this.pokemonPositions.opponent.x, y: height * this.pokemonPositions.opponent.y };
    
    // Container pour le placeholder
    const placeholderContainer = this.add.container(position.x, position.y);
    
    // Corps principal avec dégradé du type
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getModernTypeColor(primaryType);
    
    const body = this.add.graphics();
    body.fillGradientStyle(typeColor, typeColor, typeColor * 0.7, typeColor * 0.7);
    body.fillCircle(0, 0, 40);
    body.lineStyle(3, 0xFFFFFF, 0.8);
    body.strokeCircle(0, 0, 40);
    
    // Icône de type
    const typeIcon = this.getTypeIcon(primaryType);
    const iconText = this.add.text(0, -5, typeIcon, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    });
    iconText.setOrigin(0.5);
    
    // Nom du Pokémon
    const nameText = this.add.text(0, 15, pokemonData.name || 'Pokémon', {
      fontSize: '12px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    nameText.setOrigin(0.5);
    
    // Niveau
    const levelText = this.add.text(0, 28, `Niv. ${pokemonData.level || '?'}`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    levelText.setOrigin(0.5);
    
    placeholderContainer.add([body, iconText, nameText, levelText]);
    
    const scale = type === 'player' ? 1.5 : 1.2;
    const depth = type === 'player' ? 25 : 20;
    
    placeholderContainer.setScale(scale);
    placeholderContainer.setDepth(depth);
    
    // Animation d'entrée
    const direction = type === 'player' ? 'left' : 'right';
    this.animateModernPokemonEntry(placeholderContainer, direction);
    
    // Sauvegarder référence
    if (type === 'player') {
      this.playerPokemonSprite = placeholderContainer;
    } else {
      this.opponentPokemonSprite = placeholderContainer;
    }
  }

  getModernTypeColor(type) {
    const modernTypeColors = {
      'normal': 0xA8A878, 'fire': 0xFF4444, 'water': 0x4488FF, 
      'electric': 0xFFDD00, 'grass': 0x44DD44, 'ice': 0x88DDFF,
      'fighting': 0xCC2222, 'poison': 0xAA44AA, 'ground': 0xDDCC44,
      'flying': 0xAABBFF, 'psychic': 0xFF4488, 'bug': 0xAABB22,
      'rock': 0xBBAA44, 'ghost': 0x7755AA, 'dragon': 0x7744FF,
      'dark': 0x775544, 'steel': 0xAAAAAAA, 'fairy': 0xFFAAEE
    };
    
    return modernTypeColors[type.toLowerCase()] || 0xFFFFFF;
  }

  getTypeIcon(type) {
    const typeIcons = {
      'normal': '⭐', 'fire': '🔥', 'water': '💧', 'electric': '⚡',
      'grass': '🌿', 'ice': '❄️', 'fighting': '👊', 'poison': '☠️',
      'ground': '🌍', 'flying': '🦅', 'psychic': '🔮', 'bug': '🐛',
      'rock': '🗿', 'ghost': '👻', 'dragon': '🐲', 'dark': '🌙',
      'steel': '⚔️', 'fairy': '🧚'
    };
    
    return typeIcons[type.toLowerCase()] || '❓';
  }

  // === BARRES DE VIE MODERNES ===

  updateModernHealthBar(type, pokemonData) {
    const healthBar = this.modernHealthBars[type];
    if (!healthBar) return;
    
    // Mettre à jour les informations
    healthBar.nameText.setText(pokemonData.name || 'Pokémon');
    healthBar.levelText.setText(`Niv. ${pokemonData.level || 1}`);
    
    // Calculer pourcentage de vie
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    
    // Animer la barre de vie
    this.animateHealthBar(healthBar.hpBar, healthBar.config.width - 30, hpPercentage);
    
    // Mettre à jour le texte HP pour le joueur
    if (type === 'player' && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    // Mettre à jour barre d'expérience pour le joueur
    if (type === 'player' && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateExpBar(healthBar.expBar, healthBar.config.width - 30, expPercentage);
    }
    
    // Afficher la barre
    healthBar.container.setVisible(true);
    
    // Animation d'apparition
    healthBar.container.setAlpha(0);
    this.tweens.add({
      targets: healthBar.container,
      alpha: 1,
      duration: 500,
      ease: 'Power2.easeOut'
    });
  }

  animateHealthBar(graphics, maxWidth, targetPercentage) {
    // Animation fluide de la barre de vie
    let currentPercentage = graphics.currentPercentage || 1;
    graphics.currentPercentage = targetPercentage;
    
    this.tweens.add({
      targets: { value: currentPercentage },
      value: targetPercentage,
      duration: 800,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        this.updateHealthBarVisual(graphics, maxWidth, percentage, false);
      }
    });
  }

  animateExpBar(graphics, maxWidth, targetPercentage) {
    const width = Math.max(0, maxWidth * targetPercentage);
    
    graphics.clear();
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillRoundedRect(0, 0, width, 8, 4);
    
    // Effet de brillance
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillRoundedRect(0, 1, width, 3, 2);
  }

  // === INTERFACE D'ACTIONS ===

  showModernActionMenu() {
    console.log('🎮 [BattleScene] Affichage menu actions moderne...');
    
    if (!this.actionInterface) return;
    
    this.actionInterface.setVisible(true);
    this.actionInterface.setAlpha(0);
    
    // Animation d'apparition moderne
    this.tweens.add({
      targets: this.actionInterface,
      alpha: 1,
      y: this.actionInterface.y - 10,
      duration: 400,
      ease: 'Back.easeOut'
    });
  }

  hideModernActionMenu() {
    if (!this.actionInterface) return;
    
    this.tweens.add({
      targets: this.actionInterface,
      alpha: 0,
      y: this.actionInterface.y + 10,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.actionInterface.setVisible(false);
      }
    });
  }

  handleActionButton(actionKey) {
    console.log('🎯 [BattleScene] Action sélectionnée:', actionKey);
    
    this.hideModernActionMenu();
    
    switch (actionKey) {
      case 'attack':
        this.showAttackMenu();
        break;
        
      case 'bag':
        this.showBagMenu();
        break;
        
      case 'pokemon':
        this.showPokemonMenu();
        break;
        
      case 'run':
        this.attemptRun();
        break;
    }
  }

  showAttackMenu() {
    // Ici vous pourriez créer un sous-menu pour les attaques
    this.showBattleMessage('Sélectionnez une attaque...', 2000);
    
    // Pour l'exemple, utiliser la première attaque
    setTimeout(() => {
      this.executePlayerAction({
        type: 'move',
        moveId: 'tackle',
        moveName: 'Charge'
      });
    }, 1000);
  }

  showBagMenu() {
    this.showBattleMessage('Ouverture du sac...', 2000);
    
    setTimeout(() => {
      this.showModernActionMenu();
    }, 2000);
  }

  showPokemonMenu() {
    this.showBattleMessage('Changement de Pokémon indisponible.', 2000);
    
    setTimeout(() => {
      this.showModernActionMenu();
    }, 2000);
  }

  attemptRun() {
    this.showBattleMessage('Tentative de fuite...', 2000);
    
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.attemptRun();
    }
  }

  executePlayerAction(actionData) {
    console.log('⚔️ [BattleScene] Exécution action:', actionData);
    
    if (actionData.type === 'move') {
      this.showBattleMessage(`${this.currentPlayerPokemon?.name} utilise ${actionData.moveName}!`, 2000);
      
      if (this.battleNetworkHandler) {
        this.battleNetworkHandler.useMove(actionData.moveId);
      }
      
      // Effet visuel d'attaque
      this.createAttackEffect(this.playerPokemonSprite, this.opponentPokemonSprite);
    }
  }

  createAttackEffect(attacker, target) {
    if (!attacker || !target) return;
    
    // Animation d'attaque
    const originalX = attacker.x;
    
    this.tweens.add({
      targets: attacker,
      x: originalX + (target.x > attacker.x ? 50 : -50),
      duration: 200,
      ease: 'Power2.easeOut',
      yoyo: true,
      onYoyo: () => {
        // Effet d'impact
        this.createImpactEffect(target.x, target.y);
        
        // Shake de la cible
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
    // Effet d'explosion moderne
    const impact = this.add.graphics();
    impact.setPosition(x, y);
    impact.setDepth(40);
    
    // Cercle d'impact
    impact.fillStyle(0xFFFFFF, 0.8);
    impact.fillCircle(0, 0, 5);
    
    this.tweens.add({
      targets: impact,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        impact.destroy();
      }
    });
    
    // Particules d'impact
    this.createImpactParticles(x, y);
  }

  createImpactParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(x, y, 3, 0xFF4444, 0.8);
      particle.setDepth(35);
      
      const angle = (i / 8) * Math.PI * 2;
      const speed = 40;
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: 'Power2.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  // === CHARGEMENT SPRITES ===

  async loadPokemonSpritesheets() {
    console.log('📁 [BattleScene] Chargement config sprites...');
    
    if (!this.cache.json.has('pokemonSpriteConfig')) {
      this.load.json('pokemonSpriteConfig', 'assets/pokemon/PokemonSpriteConfig.json');
      this.load.start();
      
      await new Promise(resolve => {
        this.load.once('complete', resolve);
      });
    }
    
    pokemonSpriteConfig = this.cache.json.get('pokemonSpriteConfig');
    console.log('✅ [BattleScene] Config sprites chargée');
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
        this.load.once('loaderror', (file) => {
          if (file.key === spriteKey) {
            reject(new Error(`Erreur chargement: ${file.src}`));
          }
        });
        this.load.start();
      });
      
      return this.textures.exists(spriteKey) ? spriteKey : this.createFallbackSprite(view);
      
    } catch (error) {
      console.error(`❌ [BattleScene] Erreur chargement ${spriteKey}:`, error);
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

  // === GESTION DES POSITIONS ===

  calculatePokemonPositions() {
    const { width, height } = this.cameras.main;
    
    this.pokemonPositions.playerAbsolute = {
      x: width * this.pokemonPositions.player.x,
      y: height * this.pokemonPositions.player.y
    };
    
    this.pokemonPositions.opponentAbsolute = {
      x: width * this.pokemonPositions.opponent.x,
      y: height * this.pokemonPositions.opponent.y
    };
  }

  // === SETUP ET ÉVÉNEMENTS ===

  setupBattleManagers() {
    console.log('⚔️ [BattleScene] Setup managers...');
    // Configuration basique des managers
  }

  setupModernEvents() {
    console.log('🔗 [BattleScene] Setup événements modernes...');
    
    // Événements d'action de combat
    this.events.on('battleActionSelected', (actionData) => {
      this.executePlayerAction(actionData);
    });
    
    // Événements de fin de tour
    this.events.on('turnComplete', () => {
      setTimeout(() => {
        this.showModernActionMenu();
      }, 1000);
    });
  }

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    console.log('📡 [BattleScene] Configuration événements réseau...');
    
    this.battleNetworkHandler.on('battleStart', (data) => {
      this.handleNetworkBattleStart(data);
    });
    
    this.battleNetworkHandler.on('attackResult', (data) => {
      this.handleNetworkAttackResult(data);
    });
    
    this.battleNetworkHandler.on('battleEnd', (data) => {
      this.handleNetworkBattleEnd(data);
    });
    
    this.battleNetworkHandler.on('turnChange', (data) => {
      this.handleNetworkTurnChange(data);
    });
  }

  // === HANDLERS RÉSEAU ===

handleNetworkBattleStart(data) {
  console.log('[BUGPOKEMON] ⚔️ Début combat réseau:', data);
  
  // ✅ AFFICHER LE POKÉMON JOUEUR EN PREMIER
  if (data.playerPokemon) {
    console.log('[BUGPOKEMON] 👤 Données Pokémon joueur:', data.playerPokemon);
    this.displayPlayerPokemon(data.playerPokemon);
  }
  
  // ✅ PUIS AFFICHER LE POKÉMON ADVERSAIRE
  if (data.opponentPokemon || data.wildPokemon) {
    const opponent = data.opponentPokemon || {
      pokemonId: data.wildPokemon.pokemonId,
      name: `Pokémon sauvage #${data.wildPokemon.pokemonId}`,
      level: data.wildPokemon.level,
      currentHp: 50,
      maxHp: 50,
      statusCondition: 'normal',
      types: ['normal'],
      shiny: data.wildPokemon.shiny
    };
    
    console.log('[BUGPOKEMON] 👹 Données Pokémon adversaire construites:', opponent);
    console.log('[BUGPOKEMON] 👹 data.opponentPokemon original:', data.opponentPokemon);
    console.log('[BUGPOKEMON] 👹 data.wildPokemon original:', data.wildPokemon);
    
    this.displayOpponentPokemon(opponent);
  }
  
  this.activateBattleUI();
  this.isVisible = true;
  
  setTimeout(() => {
    this.showBattleMessage('Un combat commence !', 2000);
    setTimeout(() => {
      this.showModernActionMenu();
    }, 2500);
  }, 1500);
}

  handleNetworkAttackResult(data) {
    console.log('💥 [BattleScene] Résultat attaque réseau:', data);
    
    // Mettre à jour les HP
    if (data.targetType === 'player' && this.currentPlayerPokemon) {
      this.currentPlayerPokemon.currentHp = Math.max(0, 
        this.currentPlayerPokemon.currentHp - (data.damage || 0));
      this.updateModernHealthBar('player', this.currentPlayerPokemon);
    } else if (data.targetType === 'opponent' && this.currentOpponentPokemon) {
      this.currentOpponentPokemon.currentHp = Math.max(0, 
        this.currentOpponentPokemon.currentHp - (data.damage || 0));
      this.updateModernHealthBar('opponent', this.currentOpponentPokemon);
    }
    
    // Afficher message de résultat
    if (data.message) {
      this.showBattleMessage(data.message, 2000);
    }
    
    setTimeout(() => {
      this.showModernActionMenu();
    }, 2500);
  }

  handleNetworkBattleEnd(data) {
    console.log('🏁 [BattleScene] Fin combat réseau:', data);
    
    const message = data.result === 'victory' ? 'Victoire !' : 
                   data.result === 'defeat' ? 'Défaite...' : 'Combat terminé';
    
    this.showBattleMessage(message, 4000);
    
    setTimeout(() => {
      this.endBattle(data);
    }, 4000);
  }

  handleNetworkTurnChange(data) {
    console.log('🔄 [BattleScene] Changement de tour:', data);
    
    if (data.isPlayerTurn) {
      setTimeout(() => {
        this.showModernActionMenu();
      }, 1000);
    }
  }

  // === UI MANAGEMENT ===

  activateBattleUI() {
    console.log('🎮 [BattleScene] Activation UI battle moderne...');
    
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
        console.error('❌ [BattleScene] Erreur UIManager:', error);
        return this.fallbackHideUI();
      }
    }
    
    return this.fallbackHideUI();
  }

  deactivateBattleUI() {
    console.log('🔄 [BattleScene] Désactivation UI battle...');
    
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
        console.error('❌ [BattleScene] Erreur restauration UIManager:', error);
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

  // === MÉTHODES PUBLIQUES D'ACTIVATION ===

startBattle(battleData) {
  console.log('[BUGPOKEMON] ⚔️ startBattle appelée avec:', battleData);
  console.log('[BUGPOKEMON] 🔍 playerPokemon existe ?', !!battleData.playerPokemon);
  console.log('[BUGPOKEMON] 🔍 opponentPokemon existe ?', !!battleData.opponentPokemon);
  console.log('[BUGPOKEMON] 🔍 Contenu playerPokemon:', battleData.playerPokemon);
  
  if (!this.isActive) {
    console.error('[BUGPOKEMON] ❌ Scène non active');
    return;
  }
  
  this.handleNetworkBattleStart(battleData);
}

  hideBattle() {
    console.log('🖥️ [BattleScene] Masquage combat moderne...');
    
    this.deactivateBattleUI();
    
    // Masquer tous les éléments UI
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
    
    if (this.scene?.sleep) {
      this.scene.sleep();
    }
  }

  endBattle(battleResult = {}) {
    console.log('🏁 [BattleScene] Fin combat moderne:', battleResult);
    
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();
    this.clearAllEffects();
    this.hideBattle();
  }

  activateFromTransition() {
    console.log('🎬 [BattleScene] Activation depuis transition...');
    
    if (!this.isReadyForActivation) {
      console.warn('⚠️ [BattleScene] Scène non prête');
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
      console.error('❌ [BattleScene] Erreur activation:', error);
      return false;
    }
  }

  deactivateForTransition() {
    console.log('🛑 [BattleScene] Désactivation pour transition...');
    
    try {
      this.scene.setVisible(false);
      this.scene.sleep();
      this.isVisible = false;
      
      return true;
    } catch (error) {
      console.error('❌ [BattleScene] Erreur désactivation:', error);
      return false;
    }
  }

  // === MÉTHODES DE SIMULATION POUR TESTS ===

  simulatePlayerDamage(damage) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentHp = Math.max(0, 
      this.currentPlayerPokemon.currentHp - damage);
    
    this.updateModernHealthBar('player', this.currentPlayerPokemon);
    
    // Effet visuel de dégâts
    this.createDamageEffect(this.playerPokemonSprite, damage);
    
    return this.currentPlayerPokemon.currentHp;
  }

  simulateOpponentDamage(damage) {
    if (!this.currentOpponentPokemon) return 0;
    
    this.currentOpponentPokemon.currentHp = Math.max(0, 
      this.currentOpponentPokemon.currentHp - damage);
    
    this.updateModernHealthBar('opponent', this.currentOpponentPokemon);
    
    // Effet visuel de dégâts
    this.createDamageEffect(this.opponentPokemonSprite, damage);
    
    return this.currentOpponentPokemon.currentHp;
  }

  addExperience(expGained) {
    if (!this.currentPlayerPokemon) return 0;
    
    this.currentPlayerPokemon.currentExp = Math.min(
      this.currentPlayerPokemon.expToNext,
      this.currentPlayerPokemon.currentExp + expGained
    );
    
    this.updateModernHealthBar('player', this.currentPlayerPokemon);
    
    // Effet visuel d'expérience
    this.createExpGainEffect(expGained);
    
    return this.currentPlayerPokemon.currentExp;
  }

  createDamageEffect(sprite, damage) {
    if (!sprite) return;
    
    // Texte de dégâts flottant
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
    
    // Animation du texte
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        damageText.destroy();
      }
    });
    
    // Shake du sprite
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 8,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        sprite.setX(originalX);
      }
    });
  }

  createExpGainEffect(expGained) {
    if (!this.playerPokemonSprite) return;
    
    // Texte d'expérience
    const expText = this.add.text(
      this.playerPokemonSprite.x + 30, 
      this.playerPokemonSprite.y - 30, 
      `+${expGained} EXP`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    expText.setOrigin(0.5);
    expText.setDepth(50);
    
    // Animation dorée
    this.tweens.add({
      targets: expText,
      y: expText.y - 40,
      alpha: 0,
      scale: 1.2,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        expText.destroy();
      }
    });
    
    // Particules dorées
    for (let i = 0; i < 6; i++) {
      const particle = this.add.star(
        this.playerPokemonSprite.x + Phaser.Math.Between(-20, 20),
        this.playerPokemonSprite.y + Phaser.Math.Between(-30, 10),
        5, 4, 8,
        0xFFD700, 0.8
      );
      particle.setDepth(45);
      
      this.tweens.add({
        targets: particle,
        y: particle.y - 25,
        alpha: 0,
        scale: 0.3,
        duration: 800,
        delay: i * 100,
        ease: 'Power2.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  // === MÉTHODES ÉTENDUES POUR RENCONTRES ===

  handleEncounterStart(encounterData) {
    console.log('🐾 [BattleScene] Début rencontre moderne:', encounterData);
    
    if (!this.isActive) {
      this.scene.wake();
    }
    
    this.activateBattleUI();
    
    if (encounterData.pokemon) {
      this.displayOpponentPokemon(encounterData.pokemon);
    }
    
    this.isVisible = true;
  }

  // === HANDLERS ÉVÉNEMENTS RÉSEAU ÉTENDUS ===

  handleNetworkBattleRoomCreated(data) {
    console.log('🏠 [BattleScene] Salle de combat créée:', data);
    
    if (data.playerPokemon) {
      this.displayPlayerPokemon(data.playerPokemon);
    }
    
    if (data.wildPokemon) {
      const opponentData = {
        pokemonId: data.wildPokemon.pokemonId,
        name: `Pokémon sauvage #${data.wildPokemon.pokemonId}`,
        level: data.wildPokemon.level,
        currentHp: 50,
        maxHp: 50,
        statusCondition: 'normal',
        types: ['normal'],
        shiny: data.wildPokemon.shiny,
        isWild: true
      };
      
      this.displayOpponentPokemon(opponentData);
    }
    
    this.activateBattleUI();
    this.isVisible = true;
    
    setTimeout(() => {
      this.showModernActionMenu();
    }, 3000);
  }

  handleNetworkBattleMessage(data) {
    console.log('💬 [BattleScene] Message combat:', data.message);
    
    this.showBattleMessage(data.message, 3000);
  }

  handleNetworkPokemonFainted(data) {
    console.log('😵 [BattleScene] Pokémon KO:', data);
    
    this.showBattleMessage(`${data.pokemonName} est KO !`, 3000);
    
    // Effet visuel de KO
    const targetSprite = data.targetType === 'player' ? 
      this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (targetSprite) {
      this.createKOEffect(targetSprite);
    }
  }

  handleNetworkStatusEffect(data) {
    console.log('🌡️ [BattleScene] Effet de statut:', data);
    
    if (data.targetType === 'player' && this.currentPlayerPokemon) {
      this.currentPlayerPokemon.statusCondition = data.status;
      this.updateModernHealthBar('player', this.currentPlayerPokemon);
    } else if (data.targetType === 'opponent' && this.currentOpponentPokemon) {
      this.currentOpponentPokemon.statusCondition = data.status;
      this.updateModernHealthBar('opponent', this.currentOpponentPokemon);
    }
    
    // Effet visuel de statut
    this.createStatusEffect(data.targetType, data.status);
  }

  createKOEffect(sprite) {
    if (!sprite) return;
    
    // Animation de chute
    this.tweens.add({
      targets: sprite,
      alpha: 0.3,
      y: sprite.y + 20,
      rotation: 0.3,
      duration: 1000,
      ease: 'Power2.easeIn'
    });
    
    // Particules de disparition
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(
        sprite.x + Phaser.Math.Between(-30, 30),
        sprite.y + Phaser.Math.Between(-20, 20),
        2, 0x888888, 0.7
      );
      particle.setDepth(40);
      
      this.tweens.add({
        targets: particle,
        y: particle.y - 50,
        alpha: 0,
        duration: 1500,
        delay: i * 100,
        ease: 'Power1.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  createStatusEffect(targetType, status) {
    const sprite = targetType === 'player' ? 
      this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (!sprite) return;
    
    const statusColors = {
      poison: 0x8B008B,
      burn: 0xFF4500,
      paralysis: 0xFFD700,
      sleep: 0x4169E1,
      freeze: 0x87CEEB
    };
    
    const color = statusColors[status] || 0xFFFFFF;
    
    // Effet de statut visuel
    const statusEffect = this.add.circle(sprite.x, sprite.y - 40, 15, color, 0.6);
    statusEffect.setDepth(45);
    
    // Animation pulsante
    this.tweens.add({
      targets: statusEffect,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        statusEffect.destroy();
      }
    });
  }

  // === NETTOYAGE ===

  clearAllPokemonSprites() {
    console.log('🧹 [BattleScene] Nettoyage sprites modernes...');
    
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    // Nettoyer sprites orphelins
    const allChildren = this.children.list.slice();
    allChildren.forEach(child => {
      if (child.getData?.('isPokemon')) {
        child.destroy();
      }
    });
    
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
  }

  clearAllEffects() {
    // Nettoyer tous les effets visuels
    this.battleEffects.forEach(effect => {
      if (effect && effect.destroy) {
        effect.destroy();
      }
    });
    this.battleEffects = [];
    
    // Arrêter toutes les animations
    this.tweens.killAll();
  }

  // === MÉTHODES DE TEST MODERNES ===

  testModernBattleDisplay() {
    console.log('🧪 [BattleScene] Test affichage moderne...');
    
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
    
    setTimeout(() => {
      this.displayPlayerPokemon(testPlayerPokemon);
    }, 500);
    
    setTimeout(() => {
      this.displayOpponentPokemon(testOpponentPokemon);
    }, 1200);
    
    setTimeout(() => {
      this.showBattleMessage('Un Pikachu chromatique apparaît !', 2000);
    }, 2000);
    
    setTimeout(() => {
      this.showModernActionMenu();
    }, 4500);
  }

  testModernBattleSequence() {
    console.log('🧪 [BattleScene] Test séquence complète moderne...');
    
    this.testModernBattleDisplay();
    
    // Séquence d'actions simulées
    setTimeout(() => {
      this.simulateOpponentDamage(8);
      this.showBattleMessage('Bulbasaur utilise Charge !', 2000);
    }, 6000);
    
    setTimeout(() => {
      this.simulatePlayerDamage(6);
      this.showBattleMessage('Pikachu utilise Éclair !', 2000);
    }, 8500);
    
    setTimeout(() => {
      this.addExperience(45);
      this.showBattleMessage('Bulbasaur gagne de l\'expérience !', 2000);
    }, 11000);
    
    setTimeout(() => {
      this.showBattleMessage('Pikachu fuit le combat !', 3000);
    }, 13500);
    
    setTimeout(() => {
      this.endBattle({ result: 'victory', exp: 45 });
    }, 17000);
  }

  // === DEBUG ===

  debugModernBattleScene() {
    console.log('🔍 [BattleScene] === DEBUG SCÈNE MODERNE ===');
    
    console.log('🏗️ Sprites Pokémon:', {
      player: !!this.playerPokemonSprite,
      opponent: !!this.opponentPokemonSprite
    });
    
    console.log('❤️ Barres de vie:', {
      playerBar: !!this.modernHealthBars.player,
      opponentBar: !!this.modernHealthBars.opponent
    });
    
    console.log('🎮 Interface:', {
      actionInterface: !!this.actionInterface,
      battleDialog: !!this.battleDialog
    });
    
    console.log('📊 État scène:', {
      active: this.isActive,
      visible: this.isVisible,
      ready: this.isReadyForActivation
    });
    
    console.log('🐾 Données Pokémon:', {
      player: this.currentPlayerPokemon?.name || 'aucun',
      opponent: this.currentOpponentPokemon?.name || 'aucun'
    });
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('💀 [BattleScene] Destruction scène moderne...');
    
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();
    this.clearAllEffects();
    
    // Nettoyer les conteneurs UI
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
    
    // Nettoyer l'environnement
    this.groundElements.forEach(element => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.groundElements = [];
    
    this.environmentElements.forEach(element => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.environmentElements = [];
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    // Nettoyer cache
    this.frameSizeCache.clear();
    this.previousUIState = null;
    
    super.destroy();
    
    console.log('✅ [BattleScene] Destruction moderne terminée');
  }
}

// === FONCTIONS GLOBALES MODERNES ===

// Test principal moderne
window.testModernBattle = function() {
  console.log('🧪 === TEST BATTLE SCENE MODERNE ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // Correction: utiliser les bonnes méthodes de scène
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  battleScene.testModernBattleDisplay();
};

// Test séquence complète moderne
window.testModernBattleSequence = function() {
  console.log('🧪 === TEST SÉQUENCE BATTLE MODERNE ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  battleScene.testModernBattleSequence();
};

// Contrôles modernes simplifiés
window.modernDamagePlayer = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulatePlayerDamage(damage);
    console.log(`💥 Dégâts joueur: ${damage} (HP: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.modernDamageOpponent = function(damage = 5) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulateOpponentDamage(damage);
    console.log(`💥 Dégâts adversaire: ${damage} (HP: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.modernAddExp = function(exp = 25) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.addExperience(exp);
    console.log(`✨ Expérience: +${exp} (Total: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.modernShowMessage = function(message = 'Message de test !') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.showBattleMessage(message, 3000);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.modernShowActionMenu = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    battleScene.showModernActionMenu();
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.debugModernBattle = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene) {
    battleScene.debugModernBattleScene();
  } else {
    console.error('❌ BattleScene non trouvée');
  }
};

// Fonctions de test spécialisées
window.testModernPokemonEntry = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  const testPokemon = {
    pokemonId: 6,
    name: 'Charizard',
    level: 25,
    currentHp: 78,
    maxHp: 85,
    currentExp: 1250,
    expToNext: 1800,
    statusCondition: 'normal',
    types: ['fire', 'flying'],
    shiny: false
  };
  
  battleScene.displayPlayerPokemon(testPokemon);
};

window.testModernShinyPokemon = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    battleScene.scene.setVisible(true);
  }
  
  const shinyPokemon = {
    pokemonId: 150,
    name: 'Mewtwo',
    level: 70,
    currentHp: 106,
    maxHp: 106,
    statusCondition: 'normal',
    types: ['psychic'],
    shiny: true
  };
  
  battleScene.displayOpponentPokemon(shinyPokemon);
};

console.log('✅ [BattleScene] MODULE MODERNE ET NOSTALGIQUE COMPLET CHARGÉ !');
console.log('');
console.log('🎮 === INTERFACE MODERNE ET NOSTALGIQUE ===');
console.log('   ✨ Design inspiré des Pokémon classiques');
console.log('   🎨 Animations fluides et modernes');
console.log('   ❤️ Barres de vie stylisées');
console.log('   🎯 Interface d\'actions interactive');
console.log('   💬 Système de dialogue immersif');
console.log('   🌟 Effets visuels améliorés');
console.log('   🎪 Plateformes et environnement 3D');
console.log('   ⚡ Effets shiny pour Pokémon chromatiques');
console.log('');
console.log('🧪 === FONCTIONS DE TEST ===');
console.log('   window.testModernBattle() - Test affichage moderne');
console.log('   window.testModernBattleSequence() - Séquence complète');
console.log('   window.testModernPokemonEntry() - Test entrée Pokémon');
console.log('   window.testModernShinyPokemon() - Test Pokémon shiny');
console.log('');
console.log('🎮 === CONTRÔLES MANUELS ===');
console.log('   window.modernDamagePlayer(5) - Dégâts joueur');
console.log('   window.modernDamageOpponent(5) - Dégâts adversaire');
console.log('   window.modernAddExp(25) - Gain expérience');
console.log('   window.modernShowMessage("Test") - Message combat');
console.log('   window.modernShowActionMenu() - Menu actions');
console.log('   window.debugModernBattle() - Debug complet');
console.log('');
console.log('🚀 COMMENCEZ PAR: window.testModernBattle()');
console.log('🎯 STYLE: Nostalgique Pokémon + Technologies modernes !');
console.log('🏆 FONCTIONNALITÉS: Interface complète, animations fluides, effets visuels');
