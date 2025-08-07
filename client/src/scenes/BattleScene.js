// client/src/scenes/BattleScene.js - VERSION MODERNE INSPIRÉE QUESTUI

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
    
    // === 🎨 ÉTAT MODERNE (inspiré QuestUI) ===
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    
    // === 🎮 MANAGERS ===
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.captureManager = null;
    this.playerRole = null;
    
    // === 🖼️ ÉLÉMENTS VISUELS MODERNES ===
    this.battleBackground = null;
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.modernHealthBars = { player1: null, player2: null };
    this.modernActionPanel = null; // ✅ NOUVEAU
    this.modernBattleDialog = null; // ✅ NOUVEAU
    this.modernEffectsLayer = null; // ✅ NOUVEAU
    
    // === 📱 INTERFACES MODERNES ===
    this.battleActionUI = null; // ✅ REMPLACE l'ancien système
    this.pokemonMovesUI = null;
    this.battleInventoryUI = null;
    this.modernMessageSystem = null; // ✅ NOUVEAU
    
    // === 🎯 ÉTAT INTERFACE MODERNE ===
    this.interfaceState = {
      mode: 'hidden', // 'hidden', 'waiting', 'action_selection', 'move_selection', 'message'
      isTransitioning: false,
      lastUpdate: 0,
      messageQueue: [], // ✅ File de messages
      animationQueue: [] // ✅ File d'animations
    };
    
    // === 🧠 DONNÉES POKÉMON ===
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.battleData = null;
    
    // === 🎮 CACHE ET OPTIMISATIONS ===
    this.spriteStructures = new Map();
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    this.animationCache = new Map(); // ✅ Cache des animations
    
    // === 🎨 THÈME MODERNE ===
    this.modernTheme = {
      colors: {
        primary: 0x4A90E2,
        secondary: 0x7ED321,
        success: 0x27AE60,
        warning: 0xF39C12,
        danger: 0xE74C3C,
        dark: 0x2C3E50,
        light: 0xECF0F1,
        accent: 0x9B59B6
      },
      gradients: {
        panel: ['#2C3E50', '#34495E'],
        health: ['#27AE60', '#2ECC71'],
        action: ['#3498DB', '#2980B9']
      },
      animations: {
        fadeIn: { duration: 400, ease: 'Power2.easeOut' },
        slideIn: { duration: 600, ease: 'Back.easeOut' },
        bounce: { duration: 300, ease: 'Bounce.easeOut' }
      }
    };
    
    console.log('⚔️ [BattleScene] MODERNE - Initialisé avec thème et état avancé');
  }

  // === 🚀 INITIALISATION MODERNE ===

  init(data = {}) {
    console.log('[BattleScene] 🔧 Initialisation moderne:', data);
    
    // Récupération managers (inchangé mais avec logs améliorés)
    this.gameManager = data.gameManager || 
      this.scene.get('GameScene')?.gameManager || 
      window.pokemonUISystem?.gameManager || 
      window.gameManager;

    this.battleNetworkHandler = data.battleNetworkHandler || 
      window.battleSystem?.battleConnection?.networkHandler || 
      window.globalNetworkManager?.battleNetworkHandler;

    if (!this.battleNetworkHandler) {
      console.warn('[BattleScene] ⚠️ BattleNetworkHandler manquant - Mode dégradé');
    }

    if (!this.gameManager) {
      console.warn('[BattleScene] ⚠️ GameManager manquant - Mode dégradé');
    }
    
    // ✅ NOUVEAU : Stockage des données initiales
    this.battleData = data.battleData || null;
    
    // Déclenchement automatique modernisé
    if (data.battleData) {
      console.log('[BattleScene] 🎯 Déclenchement automatique moderne...');
      this.events.once('create', () => {
        this.initializeModernBattle(data.battleData);
      });
    }
  }

  preload() {
    console.log('[BattleScene] 📁 Préchargement moderne...');
    
    // Assets de base (inchangé)
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
  }

  create() {
    console.log('[BattleScene] 🎨 Création interface moderne...');

    // État initial
    this.scene.setVisible(false);
    this.scene.sleep();
    
    try {
      // ✅ CRÉATION DANS L'ORDRE MODERNE
      this.addModernStyles(); // ✅ NOUVEAU
      this.createModernBattleEnvironment();
      this.createModernEffectsLayer();
      this.createModernPokemonPlatforms();
      this.createModernHealthSystem();
      this.createModernActionSystem();
      this.createModernMessageSystem();
      this.createModernDialogSystem();
      this.setupModernNetworkHandlers();
      
      // Initialisation des managers
      this.healthBarManager = new HealthBarManager(this);
      this.initializeModernCaptureManager();
      
      // État final
      this.isActive = true;
      this.isReadyForActivation = true;
      
      console.log('[BattleScene] ✅ Interface moderne créée avec succès');
      
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur création moderne:', error);
    }
  }

  // === 🎨 STYLES MODERNES (inspiré QuestUI) ===

  addModernStyles() {
    if (document.querySelector('#battle-scene-modern-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'battle-scene-modern-styles';
    style.textContent = `
      /* ===== BATTLE SCENE MODERNE V2 ===== */
      
      .battle-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: linear-gradient(135deg, 
          rgba(44, 62, 80, 0.95), 
          rgba(52, 73, 94, 0.95)) !important;
        backdrop-filter: blur(5px) !important;
        z-index: 1000 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.6s ease !important;
      }
      
      .battle-overlay.active {
        opacity: 1 !important;
        pointer-events: all !important;
      }
      
      .battle-ui-panel {
        background: linear-gradient(145deg, 
          rgba(255, 255, 255, 0.15),
          rgba(255, 255, 255, 0.05)) !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 16px !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.4s ease !important;
      }
      
      .battle-ui-panel:hover {
        border-color: rgba(74, 144, 226, 0.6) !important;
        box-shadow: 0 12px 40px rgba(74, 144, 226, 0.2) !important;
      }
      
      .modern-battle-button {
        background: linear-gradient(145deg, #4A90E2, #357ABD) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 20px !important;
        color: white !important;
        font-weight: bold !important;
        font-size: 16px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3) !important;
      }
      
      .modern-battle-button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.4) !important;
      }
      
      .modern-battle-button:active {
        transform: translateY(0px) !important;
      }
      
      .modern-battle-button.danger {
        background: linear-gradient(145deg, #E74C3C, #C0392B) !important;
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3) !important;
      }
      
      .modern-battle-button.success {
        background: linear-gradient(145deg, #27AE60, #229954) !important;
        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3) !important;
      }
      
      .modern-health-bar {
        background: linear-gradient(90deg, 
          rgba(0, 0, 0, 0.3),
          rgba(0, 0, 0, 0.1)) !important;
        border-radius: 20px !important;
        overflow: hidden !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      .modern-message-panel {
        background: linear-gradient(145deg,
          rgba(44, 62, 80, 0.95),
          rgba(52, 73, 94, 0.95)) !important;
        border: 2px solid rgba(52, 152, 219, 0.6) !important;
        border-radius: 16px !important;
        backdrop-filter: blur(15px) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
      }
      
      @keyframes modernFadeIn {
        from { 
          opacity: 0; 
          transform: translateY(20px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0px) scale(1); 
        }
      }
      
      @keyframes modernSlideIn {
        from { 
          opacity: 0; 
          transform: translateX(-100px); 
        }
        to { 
          opacity: 1; 
          transform: translateX(0px); 
        }
      }
      
      @keyframes modernBounce {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .animate-fade-in {
        animation: modernFadeIn 0.6s ease-out !important;
      }
      
      .animate-slide-in {
        animation: modernSlideIn 0.8s ease-out !important;
      }
      
      .animate-bounce {
        animation: modernBounce 0.5s ease-out !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [BattleScene] Styles modernes appliqués');
  }

  // === 🌍 ENVIRONNEMENT MODERNE ===

  createModernBattleEnvironment() {
    const { width, height } = this.cameras.main;
    
    // ✅ ARRIÈRE-PLAN AMÉLIORÉ avec effet parallaxe
    this.createEnhancedBackground(width, height);
    
    // ✅ SOL MODERNE avec effets
    this.createModernGround(width, height);
    
    // ✅ EFFETS D'AMBIANCE
    this.createAmbientEffects(width, height);
  }

  createEnhancedBackground(width, height) {
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY) * 1.1;
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      
      // ✅ EFFET DE PROFONDEUR
      this.battleBackground.setTint(0xe8f4fd);
      this.tweens.add({
        targets: this.battleBackground,
        scaleX: scale * 1.02,
        scaleY: scale * 1.02,
        duration: 8000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
    } else {
      this.createModernGradientBackground(width, height);
    }
  }

  createModernGradientBackground(width, height) {
    // ✅ DÉGRADÉ MODERNE MULTICOUCHE
    const bg1 = this.add.graphics();
    bg1.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x98FB98, 0x228B22, 1);
    bg1.fillRect(0, 0, width, height);
    bg1.setDepth(-100);
    
    const bg2 = this.add.graphics();
    bg2.fillGradientStyle(0x4A90E2, 0x74B9FF, 0x00B894, 0x55A3FF, 0.3);
    bg2.fillRect(0, 0, width, height);
    bg2.setDepth(-95);
    
    this.battleBackground = bg1;
  }

  createModernGround(width, height) {
    const groundY = height * 0.75;
    
    // ✅ SOL AVEC TEXTURE MODERNE
    const ground = this.add.graphics();
    
    // Base du sol
    ground.fillStyle(0x2C3E50, 0.8);
    ground.fillRect(0, groundY, width, height - groundY);
    
    // Ligne d'horizon avec effet lumineux
    ground.lineStyle(3, 0x3498DB, 0.8);
    ground.lineBetween(0, groundY, width, groundY);
    ground.lineStyle(1, 0x74B9FF, 0.4);
    ground.lineBetween(0, groundY + 2, width, groundY + 2);
    
    // Motifs géométriques sur le sol
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ground.lineStyle(1, 0x34495E, 0.3);
      ground.lineBetween(x, groundY, x, height);
    }
    
    ground.setDepth(-60);
    
    // ✅ ANIMATION SUBTILE
    this.tweens.add({
      targets: ground,
      alpha: 0.9,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  createAmbientEffects(width, height) {
    // ✅ PARTICULES D'AMBIANCE
    this.createFloatingParticles(width, height);
    
    // ✅ RAYONS DE LUMIÈRE
    this.createLightRays(width, height);
  }

  createFloatingParticles(width, height) {
    // Créer des particules flottantes pour l'ambiance
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const particle = this.add.graphics();
        particle.fillStyle(0xFFFFFF, 0.1 + Math.random() * 0.2);
        particle.fillCircle(0, 0, 2 + Math.random() * 3);
        
        const startX = Math.random() * width;
        const startY = height + 50;
        particle.setPosition(startX, startY);
        particle.setDepth(-50);
        
        this.tweens.add({
          targets: particle,
          y: -50,
          x: startX + (Math.random() - 0.5) * 200,
          alpha: 0,
          duration: 15000 + Math.random() * 10000,
          ease: 'Power1.easeOut',
          onComplete: () => particle.destroy()
        });
      }, i * 1000);
    }
  }

  createLightRays(width, height) {
    // Rayons de lumière diagonaux
    const rays = this.add.graphics();
    rays.lineStyle(2, 0xFFFFFF, 0.1);
    
    for (let i = 0; i < 5; i++) {
      const startX = (width / 5) * i;
      rays.lineBetween(startX, 0, startX + 100, height);
    }
    
    rays.setDepth(-80);
    
    this.tweens.add({
      targets: rays,
      alpha: 0.05,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // === 🎮 COUCHE D'EFFETS MODERNE ===

  createModernEffectsLayer() {
    // ✅ CONTENEUR DÉDIÉ AUX EFFETS VISUELS
    this.modernEffectsLayer = this.add.container(0, 0);
    this.modernEffectsLayer.setDepth(200); // Au-dessus de tout
    
    console.log('✨ [BattleScene] Couche d\'effets moderne créée');
  }

  // === 🏟️ PLATEFORMES MODERNES ===

  createModernPokemonPlatforms() {
    const { width, height } = this.cameras.main;
    
    // ✅ PLATEFORME JOUEUR AMÉLIORÉE
    this.createAdvancedPlatform(
      width * 0.25,
      height * 0.85,
      140, 'player'
    );
    
    // ✅ PLATEFORME ADVERSAIRE AMÉLIORÉE
    this.createAdvancedPlatform(
      width * 0.75,
      height * 0.45,
      100, 'opponent'
    );
  }

  createAdvancedPlatform(x, y, size, type) {
    const platform = this.add.graphics();
    
    // ✅ OMBRE MODERNE
    platform.fillStyle(0x000000, 0.25);
    platform.fillEllipse(x + 8, y + 8, size, size * 0.35);
    
    // ✅ BASE AVEC DÉGRADÉ
    const color1 = type === 'player' ? 0x3498DB : 0xE74C3C;
    const color2 = type === 'player' ? 0x2980B9 : 0xC0392B;
    
    platform.fillGradientStyle(color1, color1, color2, color2, 0.8);
    platform.fillEllipse(x, y, size, size * 0.35);
    
    // ✅ BORDURE LUMINEUSE
    platform.lineStyle(3, type === 'player' ? 0x74B9FF : 0xFF6B9D, 0.9);
    platform.strokeEllipse(x, y, size, size * 0.35);
    
    // ✅ CERCLES CONCENTRIQUES
    platform.lineStyle(1, 0xFFFFFF, 0.3);
    platform.strokeEllipse(x, y, size * 0.7, size * 0.25);
    platform.strokeEllipse(x, y, size * 0.4, size * 0.15);
    
    platform.setDepth(type === 'player' ? 15 : 10);
    
    // ✅ ANIMATION DE PULSATION
    this.tweens.add({
      targets: platform,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // === 🏥 SYSTÈME DE SANTÉ MODERNE ===

  createModernHealthSystem() {
    const { width, height } = this.cameras.main;
    
    // ✅ BARRES DE VIE REDESSINÉES
    this.createUltraModernHealthBar('player1', {
      x: width * 0.05,
      y: height * 0.75,
      width: 350,
      height: 110,
      isPlayer: true
    });
    
    this.createUltraModernHealthBar('player2', {
      x: width * 0.95,
      y: height * 0.15,
      width: 320,
      height: 90,
      isPlayer: false
    });
  }

  createUltraModernHealthBar(type, config) {
    const container = this.add.container(
      config.isPlayer ? config.x : config.x - config.width, 
      config.y
    );
    
    // ✅ PANNEAU PRINCIPAL MODERNE
    const mainPanel = this.add.graphics();
    this.drawModernPanel(mainPanel, config.width, config.height, config.isPlayer);
    
    // ✅ NOM POKÉMON STYLÉ
    const nameText = this.add.text(20, 20, 
      config.isPlayer ? 'Votre Pokémon' : 'Pokémon Adversaire', {
        fontSize: config.isPlayer ? '20px' : '18px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      });
    
    // ✅ NIVEAU AVEC STYLE
    const levelText = this.add.text(config.width - 80, 20, 'Niv. --', {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#B8860B',
      strokeThickness: 2
    });
    
    // ✅ SYSTÈME DE SANTÉ AVANCÉ
    const healthSystem = this.createAdvancedHealthBar(config);
    
    // ✅ SYSTÈME EXP (joueur seulement)
    let expSystem = null;
    if (config.isPlayer) {
      expSystem = this.createAdvancedExpBar(config);
    }
    
    // Assemblage
    container.add([mainPanel, nameText, levelText, ...healthSystem.elements]);
    if (expSystem) {
      container.add(expSystem.elements);
    }
    
    container.setDepth(150);
    container.setVisible(false);
    
    // ✅ STOCKAGE MODERNE
    this.modernHealthBars[type] = {
      container, nameText, levelText, 
      healthBar: healthSystem.bar,
      healthText: config.isPlayer ? healthSystem.text : null,
      expBar: expSystem?.bar || null,
      config,
      // ✅ NOUVELLES PROPRIÉTÉS
      lastHpPercentage: 1.0,
      animationQueue: [],
      isAnimating: false
    };
  }

  drawModernPanel(graphics, width, height, isPlayer) {
    // ✅ FOND AVEC DÉGRADÉ COMPLEXE
    const gradient = isPlayer ? 
      { color1: 0x2C3E50, color2: 0x34495E, accent: 0x3498DB } :
      { color1: 0x8B0000, color2: 0xA0522D, accent: 0xDC143C };
    
    // Fond principal
    graphics.fillGradientStyle(
      gradient.color1, gradient.color1,
      gradient.color2, gradient.color2, 0.95
    );
    graphics.fillRoundedRect(0, 0, width, height, 16);
    
    // ✅ BORDURE ANIMÉE
    graphics.lineStyle(4, gradient.accent, 1);
    graphics.strokeRoundedRect(2, 2, width - 4, height - 4, 14);
    
    // ✅ REFLETS INTERNES
    graphics.fillStyle(0xFFFFFF, 0.1);
    graphics.fillRoundedRect(8, 8, width - 16, height * 0.3, 8);
    
    // ✅ MOTIFS DÉCORATIFS
    graphics.lineStyle(1, 0xFFFFFF, 0.2);
    for (let i = 0; i < 3; i++) {
      const y = 25 + i * 15;
      graphics.lineBetween(width - 30, y, width - 10, y);
    }
  }

  createAdvancedHealthBar(config) {
    const hpY = config.height - 45;
    const hpWidth = config.width - 40;
    
    // ✅ FOND DE LA BARRE
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x000000, 0.6);
    hpBg.fillRoundedRect(20, hpY, hpWidth, 16, 8);
    hpBg.lineStyle(2, 0x444444, 0.8);
    hpBg.strokeRoundedRect(20, hpY, hpWidth, 16, 8);
    
    // ✅ BARRE DE VIE AVEC EFFETS
    const hpBar = this.add.graphics();
    this.updateAdvancedHealthBar(hpBar, hpWidth, 1.0);
    hpBar.x = 20;
    hpBar.y = hpY;
    
    // ✅ TEXTE HP (joueur seulement)
    let hpText = null;
    if (config.isPlayer) {
      hpText = this.add.text(config.width - 120, hpY - 25, '--/--', {
        fontSize: '15px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      });
    }
    
    return {
      elements: [hpBg, hpBar, hpText].filter(Boolean),
      bar: hpBar,
      text: hpText
    };
  }

  createAdvancedExpBar(config) {
    const expY = config.height - 25;
    const expWidth = config.width - 40;
    
    // ✅ FOND EXP
    const expBg = this.add.graphics();
    expBg.fillStyle(0x444444, 0.8);
    expBg.fillRoundedRect(20, expY, expWidth, 12, 6);
    
    // ✅ BARRE EXP
    const expBar = this.add.graphics();
    expBar.x = 20;
    expBar.y = expY;
    
    return {
      elements: [expBg, expBar],
      bar: expBar
    };
  }

  updateAdvancedHealthBar(graphics, maxWidth, hpPercentage) {
    graphics.clear();
    
    // ✅ COULEUR DYNAMIQUE AMÉLIORÉE
    let color, glowColor;
    if (hpPercentage > 0.6) {
      color = 0x27AE60; glowColor = 0x2ECC71;
    } else if (hpPercentage > 0.3) {
      color = 0xF39C12; glowColor = 0xF1C40F;
    } else {
      color = 0xE74C3C; glowColor = 0xEC7063;
    }
    
    const width = Math.max(0, maxWidth * hpPercentage);
    
    // ✅ BARRE PRINCIPALE AVEC DÉGRADÉ
    graphics.fillGradientStyle(color, glowColor, color, glowColor, 1);
    graphics.fillRoundedRect(0, 2, width, 12, 6);
    
    // ✅ REFLET SUPÉRIEUR
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillRoundedRect(0, 2, width, 4, 6);
    
    // ✅ BORDURE LUMINEUSE
    if (width > 5) {
      graphics.lineStyle(1, glowColor, 0.8);
      graphics.strokeRoundedRect(0, 2, width, 12, 6);
    }
  }

  // === 🎮 SYSTÈME D'ACTIONS MODERNE ===

  createModernActionSystem() {
    const { width, height } = this.cameras.main;
    
    // ✅ PANNEAU D'ACTIONS REDESSINÉ
    this.modernActionPanel = this.add.container(width - 450, height - 200);
    
    // ✅ FOND MODERNE
    const actionBg = this.add.graphics();
    this.drawActionPanelBackground(actionBg, 430, 180);
    this.modernActionPanel.add(actionBg);
    
    // ✅ ZONE DE MESSAGE UNIFIÉE
    this.modernMessageText = this.add.text(215, 90, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: { width: 380 },
      stroke: '#000000',
      strokeThickness: 2
    });
    this.modernMessageText.setOrigin(0.5, 0.5);
    this.modernMessageText.setVisible(false);
    this.modernActionPanel.add(this.modernMessageText);
    
    // ✅ BOUTONS MODERNISÉS
    this.createModernActionButtons();
    
    this.modernActionPanel.setDepth(250);
    this.modernActionPanel.setVisible(false);
  }

  drawActionPanelBackground(graphics, width, height) {
    // ✅ FOND AVEC EFFET GLASSMORPHISM
    graphics.fillStyle(0x2C3E50, 0.85);
    graphics.fillRoundedRect(0, 0, width, height, 20);
    
    // ✅ BORDURE ANIMÉE
    graphics.lineStyle(3, 0x3498DB, 0.9);
    graphics.strokeRoundedRect(3, 3, width - 6, height - 6, 17);
    
    // ✅ REFLETS
    graphics.fillStyle(0xFFFFFF, 0.1);
    graphics.fillRoundedRect(10, 10, width - 20, height * 0.25, 10);
    
    // ✅ MOTIFS DÉCORATIFS
    graphics.fillStyle(0x34495E, 0.3);
    for (let i = 0; i < 5; i++) {
      graphics.fillCircle(width - 30, 30 + i * 25, 3);
    }
  }

  createModernActionButtons() {
    const actions = [
      { key: 'attack', text: 'Attaque', gradient: [0xE74C3C, 0xC0392B], icon: '⚔️' },
      { key: 'bag', text: 'Sac', gradient: [0x9B59B6, 0x8E44AD], icon: '🎒' },
      { key: 'pokemon', text: 'Équipe', gradient: [0x3498DB, 0x2980B9], icon: '🔄' },
      { key: 'run', text: 'Fuite', gradient: [0x95A5A6, 0x7F8C8D], icon: '🏃' }
    ];
    
    const buttonConfig = {
      startX: 50, startY: 50,
      width: 170, height: 55,
      gapX: 20, gapY: 20
    };
    
    actions.forEach((action, index) => {
      const x = buttonConfig.startX + (index % 2) * (buttonConfig.width + buttonConfig.gapX);
      const y = buttonConfig.startY + Math.floor(index / 2) * (buttonConfig.height + buttonConfig.gapY);
      
      const button = this.createUltraModernButton(x, y, buttonConfig, action);
      this.modernActionPanel.add(button);
    });
  }

  createUltraModernButton(x, y, config, action) {
    const buttonContainer = this.add.container(x, y);
    
    // ✅ ARRIÈRE-PLAN AVEC DÉGRADÉ
    const bg = this.add.graphics();
    this.drawButtonBackground(bg, config.width, config.height, action.gradient);
    
    // ✅ ICÔNE AMÉLIORÉE
    const icon = this.add.text(25, config.height/2, action.icon, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif'
    });
    icon.setOrigin(0, 0.5);
    
    // ✅ TEXTE STYLÉ
    const text = this.add.text(65, config.height/2, action.text, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    text.setOrigin(0, 0.5);
    
    // ✅ EFFET DE LUEUR
    const glow = this.add.graphics();
    glow.setVisible(false);
    this.drawButtonGlow(glow, config.width, config.height, action.gradient[0]);
    
    buttonContainer.add([glow, bg, icon, text]);
    buttonContainer.setSize(config.width, config.height);
    buttonContainer.setInteractive();
    
    // ✅ INTERACTIONS AVANCÉES
    this.setupAdvancedButtonInteractions(buttonContainer, bg, glow, action, config);
    
    return buttonContainer;
  }

  drawButtonBackground(graphics, width, height, gradient) {
    graphics.fillGradientStyle(
      gradient[0], gradient[0],
      gradient[1], gradient[1], 0.9
    );
    graphics.fillRoundedRect(0, 0, width, height, 15);
    
    graphics.lineStyle(2, 0xFFFFFF, 0.3);
    graphics.strokeRoundedRect(1, 1, width - 2, height - 2, 14);
    
    // Reflet supérieur
    graphics.fillStyle(0xFFFFFF, 0.15);
    graphics.fillRoundedRect(5, 5, width - 10, height * 0.3, 10);
  }

  drawButtonGlow(graphics, width, height, color) {
    graphics.lineStyle(4, color, 0.6);
    graphics.strokeRoundedRect(-2, -2, width + 4, height + 4, 17);
    graphics.lineStyle(2, 0xFFFFFF, 0.4);
    graphics.strokeRoundedRect(-1, -1, width + 2, height + 2, 16);
  }

  setupAdvancedButtonInteractions(container, bg, glow, action, config) {
    // ✅ HOVER AVEC EFFETS AVANCÉS
    container.on('pointerover', () => {
      glow.setVisible(true);
      
      this.tweens.add({
        targets: container,
        scaleX: 1.08, scaleY: 1.08,
        duration: 200,
        ease: 'Back.easeOut'
      });
      
      this.tweens.add({
        targets: glow,
        alpha: 1,
        duration: 300,
        ease: 'Power2.easeOut'
      });
    });
    
    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1, scaleY: 1,
        duration: 200,
        ease: 'Power2.easeOut'
      });
      
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => glow.setVisible(false)
      });
    });
    
    // ✅ CLIC AVEC ANIMATION
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Power2.easeOut',
        onComplete: () => {
          this.handleModernActionButton(action.key);
        }
      });
    });
  }

  // === 💬 SYSTÈME DE MESSAGES MODERNE ===

  createModernMessageSystem() {
    // ✅ GESTIONNAIRE DE FILE DE MESSAGES
    this.modernMessageSystem = {
      queue: [],
      isProcessing: false,
      currentMessage: null,
      defaultDuration: 3000
    };
    
    console.log('💬 [BattleScene] Système de messages moderne initialisé');
  }

  // ✅ MÉTHODE PRINCIPALE DE MESSAGES MODERNE
  showModernMessage(message, options = {}) {
    const messageConfig = {
      text: message,
      duration: options.duration || 0, // 0 = persistant
      priority: options.priority || 'normal', // 'low', 'normal', 'high', 'critical'
      type: options.type || 'info', // 'info', 'success', 'warning', 'error'
      animate: options.animate !== false,
      timestamp: Date.now()
    };
    
    console.log(`💬 [BattleScene] Message moderne: "${message}" (${messageConfig.priority})`);
    
    // ✅ AFFICHAGE IMMÉDIAT POUR LES MESSAGES CRITIQUES
    if (messageConfig.priority === 'critical') {
      this.displayMessageImmediately(messageConfig);
    } else {
      this.queueMessage(messageConfig);
    }
  }

  queueMessage(messageConfig) {
    this.modernMessageSystem.queue.push(messageConfig);
    
    if (!this.modernMessageSystem.isProcessing) {
      this.processMessageQueue();
    }
  }

  processMessageQueue() {
    if (this.modernMessageSystem.queue.length === 0) {
      this.modernMessageSystem.isProcessing = false;
      return;
    }
    
    this.modernMessageSystem.isProcessing = true;
    const message = this.modernMessageSystem.queue.shift();
    
    this.displayMessageImmediately(message);
  }

  displayMessageImmediately(messageConfig) {
    if (!this.modernActionPanel || !this.modernMessageText) return;
    
    // ✅ MASQUER BOUTONS
    this.hideModernActionButtons();
    
    // ✅ STYLE SELON LE TYPE
    this.applyMessageStyle(messageConfig.type);
    
    // ✅ AFFICHAGE AVEC ANIMATION
    this.modernMessageText.setText(messageConfig.text);
    this.modernMessageText.setVisible(true);
    
    if (!this.modernActionPanel.visible) {
      this.modernActionPanel.setVisible(true);
      this.modernActionPanel.setAlpha(0);
      
      this.tweens.add({
        targets: this.modernActionPanel,
        alpha: 1,
        duration: 400,
        ease: 'Power2.easeOut'
      });
    }
    
    // ✅ ANIMATION D'ENTRÉE
    if (messageConfig.animate) {
      this.modernMessageText.setScale(0.8);
      this.modernMessageText.setAlpha(0);
      
      this.tweens.add({
        targets: this.modernMessageText,
        scale: 1,
        alpha: 1,
        duration: 500,
        ease: 'Back.easeOut'
      });
    }
    
    this.interfaceState.mode = 'message';
    this.modernMessageSystem.currentMessage = messageConfig;
    
    // ✅ AUTO-MASQUAGE SI DURÉE SPÉCIFIÉE
    if (messageConfig.duration > 0) {
      setTimeout(() => {
        this.hideModernMessage();
        this.processMessageQueue(); // Message suivant
      }, messageConfig.duration);
    }
  }

  applyMessageStyle(type) {
    const styles = {
      'info': { color: '#FFFFFF', stroke: '#000000' },
      'success': { color: '#2ECC71', stroke: '#27AE60' },
      'warning': { color: '#F1C40F', stroke: '#F39C12' },
      'error': { color: '#E74C3C', stroke: '#C0392B' }
    };
    
    const style = styles[type] || styles.info;
    this.modernMessageText.setColor(style.color);
    this.modernMessageText.setStroke(style.stroke, 2);
  }

  hideModernMessage() {
    if (!this.modernMessageText) return;
    
    this.modernMessageText.setVisible(false);
    this.modernMessageSystem.currentMessage = null;
    
    if (this.interfaceState.mode === 'message') {
      this.interfaceState.mode = 'hidden';
    }
  }

  // === 📞 GESTION D'ACTIONS MODERNE ===

  handleModernActionButton(actionKey) {
    console.log(`[BattleScene] 🎯 Action moderne: ${actionKey}`);
    
    this.hideModernActionButtons();
    
    switch (actionKey) {
      case 'attack':
        this.handleModernAttackAction();
        break;
        
      case 'bag':
        this.handleModernBagAction();
        break;
        
      case 'pokemon':
        this.handleModernPokemonAction();
        break;
        
      case 'run':
        this.handleModernRunAction();
        break;
    }
  }

  handleModernAttackAction() {
    // ✅ VÉRIFICATIONS PRÉALABLES MODERNISÉES
    if (!this.pokemonMovesUI) {
      this.showModernMessage('Interface attaques non disponible', {
        type: 'error',
        duration: 2000
      });
      
      setTimeout(() => this.showModernActionButtons(), 2500);
      return;
    }

    if (!this.battleNetworkHandler?.canSendBattleActions?.()) {
      this.showModernMessage('Non connecté au combat', {
        type: 'warning',
        duration: 2000
      });
      
      setTimeout(() => this.showModernActionButtons(), 2500);
      return;
    }

    // ✅ AFFICHAGE TEMPORAIRE MODERNE
    this.showModernMessage('Chargement des attaques...', {
      type: 'info'
    });

    // ✅ TIMEOUT DE SÉCURITÉ MODERNE
    const safetyTimeout = setTimeout(() => {
      this.showModernMessage('Timeout - réessayez', {
        type: 'error',
        duration: 2000
      });
      
      setTimeout(() => this.showModernActionButtons(), 2500);
    }, 6000);

    // ✅ REQUÊTE AVEC NETTOYAGE
    const originalRequest = this.pokemonMovesUI.requestMoves.bind(this.pokemonMovesUI);
    this.pokemonMovesUI.requestMoves = () => {
      clearTimeout(safetyTimeout);
      this.hideModernMessage(); // Masquer "Chargement..."
      originalRequest();
    };

    this.pokemonMovesUI.requestMoves();
  }

  handleModernBagAction() {
    try {
      if (!this.battleInventoryUI) {
        this.showModernMessage('Initialisation inventaire...', {
          type: 'info'
        });
        this.createBattleInventoryUI();
      }
      
      if (this.battleInventoryUI) {
        this.hideModernMessage(); // Masquer le message de chargement
        this.battleInventoryUI.openToBalls();
      } else {
        this.showModernMessage('Inventaire de combat non disponible', {
          type: 'error',
          duration: 2000
        });
        setTimeout(() => this.showModernActionButtons(), 2500);
      }
    } catch (error) {
      console.error('❌ [BattleScene] Erreur inventaire moderne:', error);
      this.showModernMessage('Erreur inventaire', {
        type: 'error',
        duration: 2000
      });
      setTimeout(() => this.showModernActionButtons(), 2500);
    }
  }

  handleModernPokemonAction() {
    this.showModernMessage('Changement de Pokémon indisponible.', {
      type: 'warning',
      duration: 2000
    });
    setTimeout(() => this.showModernActionButtons(), 2500);
  }

  handleModernRunAction() {
    if (!this.battleNetworkHandler) {
      this.showModernMessage('Impossible de fuir - pas de connexion', {
        type: 'error',
        duration: 2000
      });
      setTimeout(() => this.showModernActionButtons(), 2500);
      return;
    }
    
    this.showModernMessage('Tentative de fuite...', {
      type: 'info'
    });
    
    try {
      this.battleNetworkHandler.attemptRun();
    } catch (error) {
      console.error('❌ [BattleScene] Erreur fuite moderne:', error);
      this.showModernMessage('Erreur lors de la fuite', {
        type: 'error',
        duration: 2000
      });
      setTimeout(() => this.showModernActionButtons(), 2500);
    }
  }

  // === 🎮 CONTRÔLES INTERFACE MODERNE ===

  showModernActionButtons() {
    console.log('[BattleScene] 🎮 showModernActionButtons - AFFICHAGE BOUTONS');
    
    this.hideModernMessage();
    
    if (!this.modernActionPanel) {
      console.error('[BattleScene] ❌ modernActionPanel non créé !');
      return;
    }
    
    console.log('[BattleScene] Panel trouvé, affichage...');
    
    // ✅ AFFICHER TOUS LES BOUTONS SAUF LE FOND ET LE TEXTE
    this.modernActionPanel.list.forEach((child, index) => {
      if (index > 1) { // Skip background (0) et messageText (1)
        child.setVisible(true);
        
        // ✅ ANIMATION D'ENTRÉE ÉCHELONNÉE
        child.setAlpha(0);
        child.setScale(0.8);
        
        this.tweens.add({
          targets: child,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 400,
          delay: (index - 2) * 100,
          ease: 'Back.easeOut'
        });
      }
    });
    
    // ✅ FORCER VISIBILITÉ DU PANEL
    this.modernActionPanel.setVisible(true);
    this.modernActionPanel.setAlpha(1);
    
    this.interfaceState.mode = 'action_selection';
    console.log('[BattleScene] ✅ Boutons modernes affichés, mode:', this.interfaceState.mode);
  }

  hideModernActionButtons() {
    if (!this.modernActionPanel) return;
    
    this.modernActionPanel.list.forEach((child, index) => {
      if (index > 1) { // Skip background et messageText
        child.setVisible(false);
      }
    });
    
    console.log('🎮 [BattleScene] Boutons modernes masqués');
  }

  // === 🎭 DIALOGUE MODERNE ===

  createModernDialogSystem() {
    const { width, height } = this.cameras.main;
    this.modernBattleDialog = this.add.container(0, height - 120);
    
    // ✅ PANNEAU MODERNE
    const dialogPanel = this.add.graphics();
    this.drawModernDialogPanel(dialogPanel, width - 40, 100);
    
    // ✅ TEXTE AVEC STYLE AVANCÉ
    this.modernDialogText = this.add.text(30, 50, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      wordWrap: { width: width - 100 },
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 5, fill: true }
    });
    this.modernDialogText.setOrigin(0, 0.5);
    
    this.modernBattleDialog.add([dialogPanel, this.modernDialogText]);
    this.modernBattleDialog.setDepth(180);
    this.modernBattleDialog.setVisible(false);
    
    console.log('💬 [BattleScene] Système de dialogue moderne créé');
  }

  drawModernDialogPanel(graphics, width, height) {
    // ✅ FOND GLASSMORPHISM
    graphics.fillStyle(0x1A252F, 0.9);
    graphics.fillRoundedRect(20, 0, width - 40, height, 16);
    
    // ✅ BORDURE LUMINEUSE ANIMÉE
    graphics.lineStyle(3, 0x52C5F5, 0.8);
    graphics.strokeRoundedRect(22, 2, width - 44, height - 4, 14);
    
    // ✅ REFLETS INTERNES
    graphics.fillStyle(0xFFFFFF, 0.1);
    graphics.fillRoundedRect(30, 8, width - 60, height * 0.25, 8);
    
    // ✅ INDICATEUR DE DIALOGUE (coin)
    graphics.fillStyle(0x3498DB, 0.7);
    graphics.fillCircle(width - 50, height / 2, 6);
    graphics.fillStyle(0x74B9FF, 1);
    graphics.fillCircle(width - 50, height / 2, 3);
  }

  // ✅ MÉTHODE MODERNE POUR AFFICHER DIALOGUES
  showModernBattleDialog(message, duration = 0) {
    if (!this.modernBattleDialog || !this.modernDialogText) return;
    
    this.modernDialogText.setText(message);
    this.modernBattleDialog.setVisible(true);
    this.modernBattleDialog.setAlpha(0);
    
    // ✅ ANIMATION D'ENTRÉE MODERNE
    this.tweens.add({
      targets: this.modernBattleDialog,
      alpha: 1,
      y: this.modernBattleDialog.y - 10,
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    // ✅ EFFET DE FRAPPE MACHINE À ÉCRIRE (optionnel)
    if (message.length > 50) {
      this.typewriterEffect(this.modernDialogText, message);
    }
    
    if (duration > 0) {
      setTimeout(() => {
        this.hideModernBattleDialog();
      }, duration);
    }
  }

  typewriterEffect(textObject, fullMessage, speed = 30) {
    textObject.setText('');
    let currentText = '';
    let charIndex = 0;
    
    const typeTimer = setInterval(() => {
      currentText += fullMessage[charIndex];
      textObject.setText(currentText);
      charIndex++;
      
      if (charIndex >= fullMessage.length) {
        clearInterval(typeTimer);
      }
    }, speed);
  }

  hideModernBattleDialog() {
    if (!this.modernBattleDialog) return;
    
    this.tweens.add({
      targets: this.modernBattleDialog,
      alpha: 0,
      y: this.modernBattleDialog.y + 10,
      duration: 400,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.modernBattleDialog.setVisible(false);
      }
    });
  }

  // === 🔧 MÉTHODES DE COMPATIBILITÉ ===

  // ✅ MÉTHODE ORIGINALE CONSERVÉE pour compatibilité
  startBattle(battleData) {
    console.log('[BattleScene] 🚀 startBattle (compatibilité) appelé:', battleData);
    
    if (!this.isActive) {
      console.error('[BattleScene] ❌ Scène non active');
      return;
    }

    // ✅ REDIRECTION VERS LA VERSION MODERNE
    return this.initializeModernBattle(battleData);
  }

  // ✅ VERSION MODERNE DE startBattle
  initializeModernBattle(battleData) {
    console.log('[BattleScene] 🚀 Initialisation combat moderne:', battleData);
    
    // ✅ NOTIFICATION UI MODERNE
    this.notifyUIManagerModern('battle');
    
    // ✅ TRAITEMENT DES DONNÉES
    this.processBattleData(battleData);
    
    // ✅ ACTIVATION MODERNE
    this.activateModernBattleMode();
  }

  // ✅ MÉTHODES ORIGINALES CONSERVÉES pour compatibilité réseau
  handleNetworkBattleStart(data) {
    console.log('[BattleScene] 📡 handleNetworkBattleStart (compatibilité):', data);
    
    // Vérifier mode narratif
    if (data.isNarrative || data.duration) {
      console.log('[BattleScene] Mode narratif détecté');
      return; // narrativeStart va gérer
    }
    
    // ✅ REDIRECTION VERS VERSION MODERNE
    return this.initializeModernBattle(data);
  }

  // ✅ ACTIVATION DEPUIS TRANSITION (compatibilité)
  activateFromTransition() {
    console.log('[BattleScene] 🔄 activateFromTransition (compatibilité)');
    
    if (!this.isReadyForActivation) {
      console.warn('[BattleScene] ⚠️ Scène non prête');
      return false;
    }
    
    try {
      if (this.scene.isSleeping()) {
        console.log('[BattleScene] Réveil de la scène...');
        this.scene.wake();
      }
      
      console.log('[BattleScene] Activation visuelle...');
      this.scene.setVisible(true);
      this.isVisible = true;
      
      // ✅ DÉMARRAGE MODERNE SI PAS ENCORE FAIT
      if (this.battleData && this.interfaceState.mode === 'hidden') {
        console.log('[BattleScene] Démarrage tardif moderne...');
        this.activateModernBattleMode();
      }
      
      return true;
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur activation:', error);
      return false;
    }
  }

  notifyUIManagerModern(mode) {
    console.log(`[BattleScene] 🎮 Notification UIManager moderne: ${mode}`);
    try {
      if (window.pokemonUISystem?.setGameState) {
        window.pokemonUISystem.setGameState(mode, { 
          animated: true, 
          modern: true // ✅ Nouveau flag
        });
      } else if (window.uiManager?.setGameState) {
        window.uiManager.setGameState(mode, { 
          animated: true, 
          modern: true 
        });
      } else {
        console.warn('[BattleScene] ⚠️ UIManager non disponible');
      }
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur notification UIManager moderne:', error);
    }
  }

  processBattleData(battleData) {
    // ✅ STOCKAGE DES DONNÉES AVEC VALIDATION
    this.battleData = this.validateBattleData(battleData);
    
    // ✅ PRÉPARATION DES POKÉMON
    if (this.battleData.playerPokemon) {
      this.currentPlayerPokemon = this.battleData.playerPokemon;
    }
    
    if (this.battleData.opponentPokemon) {
      this.currentOpponentPokemon = this.battleData.opponentPokemon;
    }
  }

  validateBattleData(data) {
    // ✅ VALIDATION ET NETTOYAGE DES DONNÉES
    const validated = {
      playerPokemon: data.playerPokemon || null,
      opponentPokemon: data.opponentPokemon || null,
      battleType: data.battleType || 'wild',
      isNarrative: data.isNarrative || false,
      duration: data.duration || 0
    };
    
    console.log('[BattleScene] ✅ Données validées:', validated);
    return validated;
  }

  activateModernBattleMode() {
    console.log('[BattleScene] 🚀 activateModernBattleMode - DÉMARRAGE');
    
    // ✅ ACTIVATION VISUELLE FORCÉE
    if (this.scene.isSleeping()) {
      console.log('[BattleScene] Réveil forcé de la scène...');
      this.scene.wake();
    }
    
    console.log('[BattleScene] Forcer visibilité...');
    this.scene.setVisible(true);
    this.scene.bringToTop();
    this.isVisible = true;
    
    // ✅ DÉMARRAGE IMMÉDIAT SI PAS DE DONNÉES POKÉMON
    if (!this.currentPlayerPokemon && !this.currentOpponentPokemon) {
      console.log('[BattleScene] Pas de données Pokémon - démarrage test...');
      this.startModernTestSequence();
    } else {
      // ✅ SÉQUENCE D'INTRODUCTION MODERNE
      this.startModernIntroSequence();
    }
  }

  // ✅ SÉQUENCE DE TEST SI PAS DE DONNÉES
  startModernTestSequence() {
    console.log('[BattleScene] 🧪 Séquence de test moderne (pas de données)');
    
    // Afficher immédiatement l'interface
    setTimeout(() => {
      this.hideExplorationUIModern();
      this.showModernActionButtons();
      this.showModernMessage('Interface de combat prête (mode test)', {
        type: 'info',
        duration: 3000
      });
    }, 500);
  }

  startModernIntroSequence() {
    console.log('[BattleScene] 🎬 Séquence d\'introduction moderne');
    
    // ✅ MASQUAGE UI EXPLORATION IMMÉDIAT
    this.hideExplorationUIModern();
    
    // ✅ VÉRIFICATION DONNÉES POKÉMON
    const hasPlayerPokemon = this.currentPlayerPokemon || this.battleData?.playerPokemon;
    const hasOpponentPokemon = this.currentOpponentPokemon || this.battleData?.opponentPokemon;
    
    console.log('[BattleScene] Données Pokémon:', {
      player: !!hasPlayerPokemon,
      opponent: !!hasOpponentPokemon
    });
    
    // ✅ AFFICHAGE IMMÉDIAT SI PAS DE POKÉMON
    if (!hasPlayerPokemon && !hasOpponentPokemon) {
      console.log('[BattleScene] Pas de Pokémon - activation immédiate');
      setTimeout(() => {
        this.activateModernBattleUI();
      }, 500);
      return;
    }
    
    // ✅ ÉTAPE 1: Affichage Pokémon avec délai
    if (hasPlayerPokemon) {
      setTimeout(() => {
        console.log('[BattleScene] Affichage Pokémon joueur...');
        this.displayPlayerPokemon(this.currentPlayerPokemon || this.battleData.playerPokemon);
      }, 500);
    }
    
    if (hasOpponentPokemon) {
      setTimeout(() => {
        console.log('[BattleScene] Affichage Pokémon adversaire...');
        this.displayOpponentPokemon(this.currentOpponentPokemon || this.battleData.opponentPokemon);
        
        // ✅ MESSAGE D'APPARITION MODERNE
        const opponentName = (this.currentOpponentPokemon || this.battleData.opponentPokemon)?.name;
        if (opponentName) {
          this.showModernMessage(
            `Un ${opponentName} sauvage apparaît !`,
            { type: 'info', duration: 3000 }
          );
        }
      }, 1200);
    }
    
    // ✅ ÉTAPE 2: Activation UI (plus rapide)
    setTimeout(() => {
      console.log('[BattleScene] Activation interface moderne...');
      this.activateModernBattleUI();
    }, hasOpponentPokemon ? 2500 : 1000);
  }

  activateModernBattleUI() {
    console.log('[BattleScene] 🎮 activateModernBattleUI - DÉMARRAGE UI');
    
    // ✅ MASQUAGE UI EXPLORATION (moderne)
    this.hideExplorationUIModern();
    
    // ✅ AFFICHAGE INTERFACE BATAILLE IMMÉDIAT
    console.log('[BattleScene] Affichage boutons d\'action...');
    this.showModernActionButtons();
    
    // ✅ MESSAGE DE BIENVENUE
    setTimeout(() => {
      this.showModernMessage('À vous de jouer !', {
        type: 'success',
        duration: 2000
      });
    }, 500);
    
    console.log('[BattleScene] 🎮 Interface de combat moderne activée');
  }

  hideExplorationUIModern() {
    // ✅ VERSION MODERNE DU MASQUAGE UI
    if (window.pokemonUISystem?.setGameState) {
      try {
        window.pokemonUISystem.setGameState('battle', {
          animated: true,
          force: true,
          modern: true
        });
        return true;
      } catch (error) {
        console.error('[BattleScene] ❌ Erreur UIManager moderne:', error);
      }
    }
    
    return this.fallbackHideUIModern();
  }

  fallbackHideUIModern() {
    const elementsToHide = [
      '#inventory-icon', '#team-icon', '#quest-icon', 
      '#questTracker', '#quest-tracker', '#chat',
      '.ui-icon', '.game-icon', '.quest-tracker',
      '.exploration-ui', '.modern-ui-panel' // ✅ Nouveaux sélecteurs
    ];
    
    let hiddenCount = 0;
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (window.getComputedStyle(el).display !== 'none') {
          el.style.display = 'none';
          el.setAttribute('data-battle-hidden-modern', 'true');
          hiddenCount++;
        }
      });
    });
    
    console.log(`🎮 [BattleScene] ${hiddenCount} éléments UI masqués (moderne)`);
    return hiddenCount > 0;
  }

  // === 🧹 NETTOYAGE MODERNE ===

  cleanupModernBattle() {
    console.log('[BattleScene] 🧹 Nettoyage moderne...');
    
    // ✅ NETTOYAGE MESSAGES
    if (this.modernMessageSystem) {
      this.modernMessageSystem.queue = [];
      this.modernMessageSystem.isProcessing = false;
      this.modernMessageSystem.currentMessage = null;
    }
    
    // ✅ NETTOYAGE ANIMATIONS
    this.tweens.killAll();
    
    // ✅ RESET ÉTAT
    this.interfaceState = {
      mode: 'hidden',
      isTransitioning: false,
      lastUpdate: 0,
      messageQueue: [],
      animationQueue: []
    };
    
    // ✅ RESTAURATION UI
    this.restoreExplorationUIModern();
    
    console.log('[BattleScene] ✅ Nettoyage moderne terminé');
  }

  restoreExplorationUIModern() {
    // ✅ RESTAURATION UI EXPLORATION (moderne)
    if (window.pokemonUISystem?.setGameState) {
      try {
        window.pokemonUISystem.setGameState('exploration', {
          animated: true,
          modern: true
        });
        return true;
      } catch (error) {
        console.error('[BattleScene] ❌ Erreur restauration UIManager moderne:', error);
      }
    }
    
    return this.fallbackRestoreUIModern();
  }

  fallbackRestoreUIModern() {
    const hiddenElements = document.querySelectorAll('[data-battle-hidden-modern="true"]');
    let restoredCount = 0;
    
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden-modern');
      restoredCount++;
    });
    
    console.log(`🎮 [BattleScene] ${restoredCount} éléments UI restaurés (moderne)`);
    return restoredCount > 0;
  }

  // === 🔗 GESTIONNAIRES RÉSEAU MODERNES ===

  setupModernNetworkHandlers() {
    if (!this.battleNetworkHandler) {
      console.warn('[BattleScene] ⚠️ Pas de NetworkHandler pour les events modernes');
      return;
    }
    
    console.log('[BattleScene] 📡 Configuration handlers réseau modernes...');
    
    // ✅ ÉVÉNEMENTS POKÉMON MODERNES
    this.battleNetworkHandler.on('moveUsed', (data) => {
      console.log('⚔️ [BattleScene] moveUsed moderne:', data);
      
      const message = `${data.attackerName} utilise ${data.moveName} !`;
      this.showModernMessage(message, { 
        type: 'info', 
        duration: 2000 
      });
      
      // ✅ Animation moderne d'attaque
      this.createModernAttackEffect(data);
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      console.log('💥 [BattleScene] damageDealt moderne:', data);
      
      // ✅ Mise à jour HP moderne
      this.updateModernHealthData(data);
      
      // ✅ Effet visuel moderne
      this.createModernDamageEffect(data);
    });

    this.battleNetworkHandler.on('actionResult', (data) => {
      if (data.success) {
        console.log('✅ [BattleScene] Action confirmée (moderne)');
        
        if (data.battleEvents?.length > 0) {
          this.processModernBattleEvents(data.battleEvents);
        }
      } else {
        this.showModernMessage(`Erreur: ${data.error}`, { 
          type: 'error', 
          duration: 3000 
        });
      }
    });

    // ✅ ÉVÉNEMENTS DE COMBAT MODERNES
    this.battleNetworkHandler.on('yourTurn', (data) => {
      console.log('🎮 [BattleScene] Votre tour (moderne)');
      this.showModernActionButtons();
    });

    this.battleNetworkHandler.on('turnChanged', (data) => {
      console.log('🔄 [BattleScene] Changement de tour moderne:', data.currentTurn);
      
      if (data.currentTurn === 'player2') {
        this.hideModernActionButtons();
        this.showModernMessage('Tour de l\'adversaire...', { 
          type: 'info' 
        });
      } else if (data.currentTurn === 'narrator') {
        this.hideModernActionButtons();
      }
    });

    // ✅ ÉVÉNEMENTS DE FIN MODERNES
    this.battleNetworkHandler.on('koMessage', (data) => {
      console.log('💀 [BattleScene] K.O. moderne:', data);
      
      this.showModernMessage(data.message, { 
        type: 'warning', 
        duration: 3000 
      });
      
      this.createModernKOEffect(data);
    });

    this.battleNetworkHandler.on('winnerAnnounce', (data) => {
      console.log('🏆 [BattleScene] Victoire moderne:', data);
      
      setTimeout(() => {
        this.handleModernBattleEnd(data);
      }, 1500);
    });

    this.battleNetworkHandler.on('battleEnd', (data) => {
      console.log('🏁 [BattleScene] Fin de combat moderne:', data);
      this.hideModernActionButtons();
      
      setTimeout(() => {
        this.endModernBattle({ result: 'ended' });
      }, 3000);
    });

    // ✅ GESTION D'ERREURS MODERNE
    this.battleNetworkHandler.on('networkError', (data) => {
      console.error('🌐 [BattleScene] Erreur réseau moderne:', data);
      this.showModernMessage('Erreur réseau - reconnexion...', {
        type: 'error',
        duration: 4000
      });
      
      setTimeout(() => {
        this.showModernActionButtons();
      }, 4500);
    });

    this.battleNetworkHandler.on('battleRoomDisconnected', (data) => {
      console.log('👋 [BattleScene] Déconnexion moderne:', data);
      
      this.showModernMessage('Connexion perdue', {
        type: 'error',
        duration: 2000
      });
      
      setTimeout(() => {
        this.endModernBattle({ result: 'disconnected' });
      }, 2500);
    });

    console.log('✅ [BattleScene] Handlers réseau modernes configurés');
  }

  // === 🎬 EFFETS VISUELS MODERNES ===

  createModernAttackEffect(data) {
    const attackerSprite = data.attackerRole === 'player1' ? 
      this.playerPokemonSprite : this.opponentPokemonSprite;
    const targetSprite = data.attackerRole === 'player1' ? 
      this.opponentPokemonSprite : this.playerPokemonSprite;
    
    if (!attackerSprite || !targetSprite) return;
    
    // ✅ ANIMATION D'ATTAQUE MODERNE
    const originalX = attackerSprite.x;
    const moveDistance = targetSprite.x > attackerSprite.x ? 60 : -60;
    
    // Phase 1: Mouvement vers la cible
    this.tweens.add({
      targets: attackerSprite,
      x: originalX + moveDistance,
      scaleX: attackerSprite.scaleX * 1.1,
      scaleY: attackerSprite.scaleY * 1.1,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // ✅ EFFET D'IMPACT MODERNE
        this.createModernImpactEffect(targetSprite.x, targetSprite.y);
        
        // Phase 2: Retour et shake de la cible
        this.tweens.add({
          targets: attackerSprite,
          x: originalX,
          scaleX: attackerSprite.scaleX,
          scaleY: attackerSprite.scaleY,
          duration: 300,
          ease: 'Power2.easeIn'
        });
        
        this.tweens.add({
          targets: targetSprite,
          x: targetSprite.x + 15,
          duration: 80,
          yoyo: true,
          repeat: 4,
          ease: 'Power2.easeInOut'
        });
      }
    });
  }

  createModernImpactEffect(x, y) {
    // ✅ EFFET D'IMPACT MULTICOUCHE
    const impact = this.add.container(x, y);
    impact.setDepth(300);
    
    // Onde de choc principale
    const shockwave = this.add.graphics();
    shockwave.lineStyle(4, 0xFFFFFF, 1);
    shockwave.strokeCircle(0, 0, 5);
    impact.add(shockwave);
    
    // Particules d'impact
    for (let i = 0; i < 8; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xFFD700, 0.8);
      particle.fillCircle(0, 0, 3);
      
      const angle = (Math.PI * 2 / 8) * i;
      particle.x = Math.cos(angle) * 10;
      particle.y = Math.sin(angle) * 10;
      
      impact.add(particle);
      
      this.tweens.add({
        targets: particle,
        x: Math.cos(angle) * 40,
        y: Math.sin(angle) * 40,
        alpha: 0,
        duration: 600,
        ease: 'Power2.easeOut'
      });
    }
    
    // Animation de l'onde de choc
    this.tweens.add({
      targets: shockwave,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => impact.destroy()
    });
    
    // ✅ FLASH D'ÉCRAN
    this.cameras.main.flash(100, 255, 255, 255, false, 0.3);
  }

  updateModernHealthData(data) {
    // ✅ SYNCHRONISATION DONNÉES LOCALES
    if (data.targetRole === 'player1' && this.currentPlayerPokemon) {
      this.currentPlayerPokemon.currentHp = data.newHp;
      this.currentPlayerPokemon.maxHp = data.maxHp || this.currentPlayerPokemon.maxHp;
      
      this.updateModernHealthBar('player1', this.currentPlayerPokemon);
    } else if (data.targetRole === 'player2' && this.currentOpponentPokemon) {
      this.currentOpponentPokemon.currentHp = data.newHp;
      this.currentOpponentPokemon.maxHp = data.maxHp || this.currentOpponentPokemon.maxHp;
      
      this.updateModernHealthBar('player2', this.currentOpponentPokemon);
    }
  }

  updateModernHealthBar(type, pokemonData) {
    const healthBar = this.modernHealthBars[type];
    if (!healthBar) {
      console.error(`[BattleScene] ❌ Barre de vie moderne non trouvée: ${type}`);
      return;
    }
    
    // ✅ VALIDATION DES DONNÉES
    if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
      console.warn(`[BattleScene] ⚠️ HP manquants pour ${type}`);
      return;
    }
    
    // ✅ MISE À JOUR INFOS
    healthBar.nameText.setText(pokemonData.name || 'Pokémon');
    healthBar.levelText.setText(`Niv. ${pokemonData.level || 1}`);
    
    // ✅ CALCUL POURCENTAGE AVEC ANIMATION
    const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
    const previousPercentage = healthBar.lastHpPercentage || 1.0;
    
    // ✅ ANIMATION MODERNE DE LA BARRE
    this.animateModernHealthBar(healthBar, hpPercentage, previousPercentage);
    
    // ✅ TEXTE HP (joueur seulement)
    if (type === 'player1' && healthBar.healthText) {
      healthBar.healthText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
      
      // Animation du texte HP
      this.tweens.add({
        targets: healthBar.healthText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Power2.easeOut'
      });
    }
    
    // ✅ BARRE EXP (joueur seulement)
    if (type === 'player1' && healthBar.expBar && pokemonData.currentExp !== undefined) {
      const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
      this.animateModernExpBar(healthBar.expBar, healthBar.config.width - 40, expPercentage);
    }
    
    // ✅ AFFICHAGE AVEC ANIMATION D'ENTRÉE
    if (!healthBar.container.visible) {
      healthBar.container.setVisible(true);
      healthBar.container.setAlpha(0);
      healthBar.container.setScale(0.9);
      
      this.tweens.add({
        targets: healthBar.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 600,
        ease: 'Back.easeOut'
      });
    }
    
    // ✅ STOCKAGE POUR PROCHAINE ANIMATION
    healthBar.lastHpPercentage = hpPercentage;
  }

  animateModernHealthBar(healthBar, targetPercentage, currentPercentage) {
    const maxWidth = healthBar.config.width - 40;
    
    // ✅ ANIMATION FLUIDE AVEC COULEUR DYNAMIQUE
    this.tweens.add({
      targets: { value: currentPercentage },
      value: targetPercentage,
      duration: Math.abs(targetPercentage - currentPercentage) * 1500,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        this.updateAdvancedHealthBar(healthBar.healthBar, maxWidth, percentage);
      },
      onComplete: () => {
        // ✅ EFFET DE FIN D'ANIMATION
        if (targetPercentage <= 0.2) {
          this.addCriticalHealthEffect(healthBar);
        }
      }
    });
  }

  animateModernExpBar(expBar, maxWidth, targetPercentage) {
    const width = Math.max(0, maxWidth * targetPercentage);
    
    expBar.clear();
    expBar.fillGradientStyle(0xFFD700, 0xFFA500, 0xFFD700, 0xFFA500, 1);
    expBar.fillRoundedRect(0, 0, width, 12, 6);
    
    // Reflet sur la barre EXP
    expBar.fillStyle(0xFFFFFF, 0.4);
    expBar.fillRoundedRect(0, 1, width, 4, 6);
  }

  addCriticalHealthEffect(healthBar) {
    // ✅ EFFET DE VIE CRITIQUE (clignotement rouge)
    this.tweens.add({
      targets: healthBar.container,
      alpha: 0.7,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Power2.easeInOut'
    });
    
    // Son d'alerte si disponible
    // this.sound.play('lowHealth', { volume: 0.3 });
  }

  createModernDamageEffect(data) {
    const targetSprite = data.targetRole === 'player1' ? 
      this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (!targetSprite || !data.damage) return;
    
    // ✅ TEXTE DE DÉGÂTS MODERNE
    const damageText = this.add.text(targetSprite.x, targetSprite.y - 60, `-${data.damage}`, {
      fontSize: '28px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FF4444',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true }
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(350);
    
    // ✅ ANIMATION MODERNE DU TEXTE
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => damageText.destroy()
    });
    
    // ✅ SHAKE MODERNE DU SPRITE
    const originalX = targetSprite.x;
    const originalY = targetSprite.y;
    
    this.tweens.add({
      targets: targetSprite,
      x: originalX + 12,
      duration: 60,
      yoyo: true,
      repeat: 6,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        targetSprite.setPosition(originalX, originalY);
      }
    });
    
    // ✅ EFFET DE TINT ROUGE
    targetSprite.setTint(0xFF6B6B);
    this.tweens.add({
      targets: targetSprite,
      duration: 400,
      ease: 'Power2.easeOut',
      onComplete: () => {
        targetSprite.clearTint();
      }
    });
  }

  createModernKOEffect(data) {
    const targetSprite = data.playerRole === 'player1' ? 
      this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (!targetSprite) return;
    
    console.log(`💀 [BattleScene] Animation K.O. moderne pour: ${data.playerRole}`);
    
    // ✅ ANIMATION DE CHUTE MODERNE
    this.tweens.add({
      targets: targetSprite,
      y: targetSprite.y + 40,
      alpha: 0.2,
      angle: data.playerRole === 'player1' ? -120 : 120,
      scaleX: targetSprite.scaleX * 0.8,
      scaleY: targetSprite.scaleY * 0.8,
      duration: 2000,
      ease: 'Power2.easeIn'
    });
    
    // ✅ EFFET SPIRALE K.O. MODERNE
    this.createModernSpiralEffect(targetSprite);
    
    // ✅ ÉCRAN FLASH
    this.cameras.main.flash(200, 255, 100, 100, false, 0.5);
  }

  createModernSpiralEffect(sprite) {
    // ✅ SPIRALES MULTIPLES MODERNES
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const spiral = this.add.graphics();
        spiral.lineStyle(4, 0xFFFFFF, 0.8 - i * 0.15);
        spiral.arc(0, 0, 25 + i * 15, 0, Math.PI * 2);
        spiral.setPosition(sprite.x, sprite.y - 30);
        spiral.setDepth(400);
        
        this.tweens.add({
          targets: spiral,
          y: spiral.y - 80,
          alpha: 0,
          scaleX: 3,
          scaleY: 3,
          rotation: Math.PI * 6,
          duration: 2500,
          delay: i * 100,
          ease: 'Power2.easeOut',
          onComplete: () => spiral.destroy()
        });
      }, i * 200);
    }
  }

  // === 🏆 FIN DE COMBAT MODERNE ===

  handleModernBattleEnd(winnerData) {
    console.log('🎯 [BattleScene] Fin de combat moderne:', winnerData);
    
    if (this.interfaceState.mode === 'ended') {
      console.warn('⚠️ [BattleScene] Combat déjà terminé');
      return;
    }
    
    this.interfaceState.mode = 'ended';
    this.hideModernActionButtons();
    
    // ✅ AFFICHAGE MODERNE DES RÉSULTATS
    this.displayModernBattleResults(winnerData);
    
    // ✅ FERMETURE AUTOMATIQUE
    setTimeout(() => {
      this.endModernBattle({ 
        result: 'completed', 
        winner: winnerData.winner 
      });
    }, 5000);
  }

  displayModernBattleResults(winnerData) {
    let resultMessage = winnerData.message;
    
    if (winnerData.winner === 'player1') {
      const rewards = this.calculateModernRewards();
      
      resultMessage += '\n\n🎁 RÉCOMPENSES OBTENUES';
      
      if (rewards.experience > 0) {
        resultMessage += `\n✨ +${rewards.experience} Points d'Expérience`;
      }
      
      if (rewards.money > 0) {
        resultMessage += `\n💰 +${rewards.money}₽`;
      }
      
      if (rewards.items?.length > 0) {
        rewards.items.forEach(item => {
          resultMessage += `\n🎒 ${item.name} ×${item.quantity}`;
        });
      }
      
      // ✅ EFFET DE VICTOIRE MODERNE
      this.createModernVictoryEffect();
    }
    
    // ✅ AFFICHAGE DANS DIALOGUE MODERNE
    this.showModernBattleDialog(resultMessage, 0);
  }

  calculateModernRewards() {
    const opponentLevel = this.currentOpponentPokemon?.level || 5;
    const baseExp = Math.floor(opponentLevel * 12 + Math.random() * 25);
    const baseMoney = Math.floor(opponentLevel * 18 + Math.random() * 60);
    
    return {
      experience: baseExp,
      money: baseMoney,
      items: Math.random() > 0.6 ? [
        { name: 'Potion', quantity: Math.floor(Math.random() * 2) + 1 }
      ] : []
    };
  }

  createModernVictoryEffect() {
    const { width, height } = this.cameras.main;
    
    // ✅ CONFETTIS MODERNES
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const confetti = this.add.graphics();
        const colors = [0xFFD700, 0xFF6B9D, 0x74B9FF, 0x00CEC9, 0xFD79A8];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        confetti.fillStyle(color, 0.9);
        confetti.fillRect(-5, -5, 10, 10);
        confetti.setPosition(
          Math.random() * width, 
          -30
        );
        confetti.setDepth(500);
        confetti.setRotation(Math.random() * Math.PI * 2);
        
        this.tweens.add({
          targets: confetti,
          y: height + 30,
          x: confetti.x + (Math.random() - 0.5) * 200,
          rotation: confetti.rotation + Math.PI * 8,
          alpha: 0,
          duration: 4000 + Math.random() * 2000,
          ease: 'Power1.easeIn',
          onComplete: () => confetti.destroy()
        });
      }, i * 150);
    }
    
    // ✅ FLASH DE VICTOIRE
    this.cameras.main.flash(500, 255, 215, 0, false, 0.4);
    
    // ✅ ZOOM SUBTLE
    this.cameras.main.zoomTo(1.05, 1000, 'Power2.easeOut');
    setTimeout(() => {
      this.cameras.main.zoomTo(1, 1000, 'Power2.easeIn');
    }, 2000);
  }

  processModernBattleEvents(battleEvents) {
    console.log('⚔️ [BattleScene] Traitement événements modernes:', battleEvents);
    
    battleEvents.forEach((event, index) => {
      // ✅ IGNORER LES ÉVÉNEMENTS DÉJÀ TRAITÉS
      if (event.type === 'moveUsed') {
        console.log('🚫 [BattleScene] moveUsed ignoré (traité directement)');
        return;
      }
      
      // ✅ DÉLAI PROGRESSIF POUR LES ÉVÉNEMENTS
      setTimeout(() => {
        this.handleModernBattleEvent(event.type, event.data);
      }, index * 800);
    });
  }

  handleModernBattleEvent(eventType, data = {}) {
    console.log(`🌍 [BattleScene] Événement moderne: ${eventType}`, data);
    
    // ✅ ACTIONS D'INTERFACE MODERNES
    switch (eventType) {
      case 'yourTurn':
        this.showModernActionButtons();
        return;
        
      case 'opponentTurn':
        this.hideModernActionButtons();
        this.showModernMessage('Tour de l\'adversaire...', { 
          type: 'info' 
        });
        return;
        
      case 'battleStart':
        this.showModernMessage('Le combat commence !', { 
          type: 'success', 
          duration: 2000 
        });
        return;
        
      case 'wildPokemonAppears':
        this.showModernMessage(
          `Un ${data.pokemonName || 'Pokémon'} sauvage apparaît !`, 
          { type: 'info', duration: 3000 }
        );
        return;
        
      case 'battleEnd':
        this.hideModernActionButtons();
        setTimeout(() => {
          this.endModernBattle({ result: 'ended' });
        }, 3000);
        return;
    }
    
    // ✅ TRADUCTION AVEC BATTLETRASLATOR SI DISPONIBLE
    if (this.battleTranslator) {
      const message = this.battleTranslator.translate(eventType, data);
      if (message) {
        this.showModernMessage(message, { 
          type: 'info' 
        });
      }
    } else {
      console.warn(`[BattleScene] ⚠️ Traducteur non initialisé pour: ${eventType}`);
    }
  }

  // === 🏁 MÉTHODES DE FIN MODERNES ===

  endModernBattle(battleResult = {}) {
    console.log('[BattleScene] 🏁 Fin de combat moderne:', battleResult);
    
    // ✅ ENVOI DU RÉSULTAT
    try {
      if (this.battleNetworkHandler?.sendToWorld) {
        this.battleNetworkHandler.sendToWorld('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now(),
          modern: true
        });
      } else if (window.currentGameRoom) {
        window.currentGameRoom.send('battleFinished', {
          battleResult: typeof battleResult === 'string' ? battleResult : 'completed',
          timestamp: Date.now(),
          modern: true
        });
      }
    } catch (error) {
      console.error('[BattleScene] ❌ Erreur envoi battleFinished moderne:', error);
    }
    
    // ✅ NETTOYAGE MODERNE AVEC DÉLAI
    setTimeout(() => {
      this.completeModernBattleCleanup(battleResult);
    }, 800);
  }

  completeModernBattleCleanup(battleResult) {
    console.log('[BattleScene] 🧹 Nettoyage complet moderne...');
    
    // ✅ DÉCONNEXION RÉSEAU
    if (this.battleNetworkHandler) {
      this.battleNetworkHandler.disconnectFromBattleRoom();
    }
    
    // ✅ RESET SYSTÈME GLOBAL MODERNE
    if (window.battleSystem) {
      window.battleSystem.isInBattle = false;
      window.battleSystem.isTransitioning = false;
      window.battleSystem.currentBattleRoom = null;
      window.battleSystem.currentBattleData = null;
      window.battleSystem.selectedPokemon = null;
      console.log('🔄 [BattleScene] Système de combat réinitialisé');
    }
    
    // ✅ RESET GAMEMANAGER
    if (this.gameManager?.battleState) {
      this.gameManager.battleState = 'none';
      this.gameManager.inBattle = false;
      console.log('🎮 [BattleScene] GameManager réinitialisé');
    }
    
    // ✅ NETTOYAGE MODERNE COMPLET
    this.cleanupModernBattle();
    this.clearAllModernSprites();
    this.hideModernBattle();
    
    // ✅ FORCER RETOUR À L'EXPLORATION
    setTimeout(() => {
      this.notifyUIManagerModern('exploration');
    }, 500);
    
    console.log('✅ [BattleScene] Nettoyage moderne terminé');
  }

  clearAllModernSprites() {
    // ✅ SUPPRESSION SPRITES POKÉMON
    [this.playerPokemonSprite, this.opponentPokemonSprite].forEach(sprite => {
      if (sprite) {
        sprite.destroy();
      }
    });
    
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    
    // ✅ NETTOYAGE SPRITES ORPHELINS MODERNE
    const allChildren = this.children.list.slice();
    let spritesRemoved = 0;
    
    allChildren.forEach(child => {
      const shouldRemove = child && (
        child.texture?.key?.includes('pokemon_') ||
        child.getData?.('isPokemon') ||
        child.getData?.('isBattleEffect') ||
        (child.type === 'Graphics' && child.depth > 200) ||
        (child.type === 'Container' && child.x && 
         (Math.abs(child.x - this.cameras.main.width * 0.25) < 100 ||
          Math.abs(child.x - this.cameras.main.width * 0.75) < 100))
      );
      
      if (shouldRemove) {
        child.destroy();
        spritesRemoved++;
      }
    });
    
    // ✅ RESET DONNÉES
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.battleData = null;
    
    console.log(`🧹 [BattleScene] ${spritesRemoved} sprites modernes supprimés`);
  }

  hideModernBattle() {
    // ✅ DÉSACTIVATION UI MODERNE
    this.restoreExplorationUIModern();
    
    // ✅ MASQUAGE ÉLÉMENTS MODERNES
    [this.modernActionPanel, this.modernBattleDialog].forEach(element => {
      if (element) {
        element.setVisible(false);
      }
    });
    
    Object.values(this.modernHealthBars).forEach(healthBar => {
      if (healthBar?.container) {
        healthBar.container.setVisible(false);
      }
    });
    
    // ✅ ÉTAT FINAL
    this.isVisible = false;
    this.scene.setVisible(false);
    
    if (this.scene?.sleep) {
      this.scene.sleep();
    }
    
    console.log('👻 [BattleScene] Interface moderne masquée');
  }

  // === 🧪 FONCTION DE TEST PRINCIPALE ===

  testModernBattleInterface() {
    console.log('🧪 [BattleScene] Test interface moderne - DÉMARRAGE COMPLET...');
    
    // ✅ FORCER ACTIVATION DE LA SCÈNE
    if (!window.game.scene.isActive('BattleScene')) {
      console.log('🧪 Activation forcée de BattleScene...');
      window.game.scene.wake('BattleScene');
      this.scene.setVisible(true);
      this.scene.bringToTop();
    }
    
    // ✅ DONNÉES DE TEST
    const testPlayerPokemon = {
      pokemonId: 1,
      name: 'Bulbizarre',
      level: 15,
      currentHp: 42,
      maxHp: 48,
      currentExp: 220,
      expToNext: 300,
      types: ['grass', 'poison']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      name: 'Pikachu',
      level: 12,
      currentHp: 35,
      maxHp: 38,
      types: ['electric'],
      shiny: true
    };
    
    // ✅ FORCER LES DONNÉES
    this.currentPlayerPokemon = testPlayerPokemon;
    this.currentOpponentPokemon = testOpponentPokemon;
    this.battleData = {
      playerPokemon: testPlayerPokemon,
      opponentPokemon: testOpponentPokemon,
      battleType: 'wild'
    };
    
    // ✅ ACTIVATION IMMÉDIATE
    this.isVisible = true;
    this.activateModernBattleMode();
    
    console.log('✅ [BattleScene] Test moderne démarré avec données forcées');
    return { testPlayerPokemon, testOpponentPokemon };
  }

  // ✅ MÉTHODES EXISTANTES CONSERVÉES (displayPlayerPokemon, etc.)
  // [Garder les méthodes existantes de chargement sprites, etc.]
  
  // === 🎯 MANAGERS MODERNES ===
  
  initializeModernCaptureManager() {
    if (!this.battleNetworkHandler) {
      console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant pour CaptureManager moderne');
      return;
    }
    
    const playerRole = this.playerRole || 'player1';
    
    this.captureManager = new BattleCaptureManager(
      this,
      this.battleNetworkHandler,
      playerRole
    );
    
    console.log('🎯 [BattleScene] CaptureManager moderne initialisé');
  }

  createBattleInventoryUI() {
    const gameRoom = this.gameManager?.gameRoom || 
                     this.battleNetworkHandler?.gameRoom || 
                     window.currentGameRoom;
    
    const battleContext = {
      battleScene: this,
      networkHandler: this.battleNetworkHandler,
      battleRoomId: this.battleNetworkHandler?.battleRoomId || null,
      captureManager: this.captureManager,
      modern: true // ✅ FLAG MODERNE
    };
    
    if (!gameRoom || !this.battleNetworkHandler) {
      console.warn('⚠️ [BattleScene] Données manquantes pour BattleInventoryUI moderne');
      return;
    }
    
    this.battleInventoryUI = new BattleInventoryUI(gameRoom, battleContext);
    console.log('⚔️ BattleInventoryUI moderne créé');
  }

  // === 💾 DESTRUCTION MODERNE ===

  destroy() {
    console.log('[BattleScene] 💀 Destruction moderne...');
    
    this.cleanupModernBattle();
    this.clearAllModernSprites();

    // ✅ NETTOYAGE INTERFACES MODERNES
    [this.pokemonMovesUI, this.battleInventoryUI, this.captureManager].forEach(manager => {
      if (manager?.destroy) {
        manager.destroy();
      }
    });
    
    // ✅ NETTOYAGE CONTENEURS MODERNES
    [this.modernActionPanel, this.modernBattleDialog, this.modernEffectsLayer].forEach(container => {
      if (container) {
        container.destroy();
      }
    });
    
    // ✅ NETTOYAGE BARRES DE VIE MODERNES
    Object.values(this.modernHealthBars).forEach(healthBar => {
      if (healthBar?.container) {
        healthBar.container.destroy();
      }
    });
    
    // ✅ NETTOYAGE STYLES MODERNES
    const modernStyles = document.querySelector('#battle-scene-modern-styles');
    if (modernStyles) {
      modernStyles.remove();
    }
    
    // ✅ RESET COMPLET
    this.modernHealthBars = { player1: null, player2: null };
    this.modernActionPanel = null;
    this.modernBattleDialog = null;
    this.modernEffectsLayer = null;
    this.modernMessageSystem = null;
    
    super.destroy();
    console.log('✅ [BattleScene] Destruction moderne terminée');
  }
}

// === 🌟 FONCTIONS GLOBALES MODERNES ===

// ✅ FONCTION DE TEST PRINCIPALE
window.testModernBattleInterface = function() {
  console.log('🧪 Test interface moderne...');
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  
  return battleScene.testModernBattleInterface();
};

// ✅ FONCTION DE DEBUG ÉTAT
window.debugBattleSceneState = function() {
  console.log('🔍 === DEBUG ÉTAT BATTLE SCENE ===');
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  
  const state = {
    isActive: battleScene.isActive,
    isVisible: battleScene.isVisible,
    isReadyForActivation: battleScene.isReadyForActivation,
    sceneVisible: battleScene.scene.visible,
    sceneActive: battleScene.scene.isActive(),
    interfaceState: battleScene.interfaceState,
    modernActionPanel: {
      exists: !!battleScene.modernActionPanel,
      visible: battleScene.modernActionPanel?.visible || false,
      children: battleScene.modernActionPanel?.list?.length || 0
    },
    pokemonData: {
      player: battleScene.currentPlayerPokemon?.name || 'Aucun',
      opponent: battleScene.currentOpponentPokemon?.name || 'Aucun'
    },
    battleData: !!battleScene.battleData
  };
  
  console.log('📊 État complet:', state);
  return state;
};

// ✅ FONCTION DE FORÇAGE
window.forceBattleSceneVisible = function() {
  console.log('🔧 Forçage visibilité BattleScene...');
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return false;
  }
  
  if (battleScene.scene.isSleeping()) {
    battleScene.scene.wake();
  }
  
  battleScene.scene.setVisible(true);
  battleScene.scene.bringToTop();
  battleScene.isVisible = true;
  
  // Forcer affichage interface si créée
  if (battleScene.modernActionPanel) {
    battleScene.modernActionPanel.setVisible(true);
    battleScene.showModernActionButtons();
  }
  
  console.log('✅ BattleScene forcé visible');
  return true;
};

window.testModernBattleMessages = function() {
  console.log('🧪 Test messages modernes...');
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  const messages = [
    { text: 'Message d\'information', type: 'info', duration: 2000 },
    { text: 'Succès !', type: 'success', duration: 2000 },
    { text: 'Attention !', type: 'warning', duration: 2000 },
    { text: 'Erreur critique', type: 'error', duration: 2000 }
  ];
  
  messages.forEach((msg, index) => {
    setTimeout(() => {
      battleScene.showModernMessage(msg.text, { 
        type: msg.type, 
        duration: msg.duration 
      });
    }, index * 3000);
  });
  
  console.log('✅ Séquence de test lancée');
};

window.debugModernBattleState = function() {
  console.log('🔍 === DEBUG ÉTAT MODERNE ===');
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return null;
  }
  
  const state = {
    interfaceState: battleScene.interfaceState,
    modernTheme: battleScene.modernTheme,
    messageSystem: battleScene.modernMessageSystem,
    healthBars: Object.keys(battleScene.modernHealthBars).reduce((acc, key) => {
      acc[key] = {
        exists: !!battleScene.modernHealthBars[key],
        visible: battleScene.modernHealthBars[key]?.container?.visible || false
      };
      return acc;
    }, {}),
    pokemonData: {
      player: battleScene.currentPlayerPokemon?.name || 'Aucun',
      opponent: battleScene.currentOpponentPokemon?.name || 'Aucun'
    }
  };
  
  console.log('📊 État moderne complet:', state);
  return state;
};

console.log('🌟 [BattleScene] VERSION ULTRA-MODERNE CHARGÉE !');
console.log('🎨 Thème: Interface glassmorphism avec animations avancées');
console.log('💬 Messages: Système de file avec types et priorités');
console.log('⚡ Effets: Animations multicouches et impacts visuels');
console.log('🧪 Tests disponibles:');
console.log('   - window.testModernBattleInterface() - Test complet');
console.log('   - window.testModernBattleMessages() - Test messages');
console.log('   - window.debugModernBattleState() - État moderne');
