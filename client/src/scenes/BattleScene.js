// client/src/scenes/BattleScene.js - Version optimisée avec gestion langue et Universal Switch

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';
import { BattleTranslator } from '../Battle/BattleTranslator.js';
import { BattleInventoryUI } from '../components/BattleInventoryUI.js';
import { createKOManager, setupKOManagerEvents } from '../Battle/KOManager.js';
import { 
  t, 
  battleT, 
  getMoveNameT, 
  getTypeNameT, 
  getBattleMessageT,
  isBattleTranslationsReady,
  loadBattleTranslations 
} from '../managers/LocalizationManager.js';
import { createPokemonTeamSwitchUI, setupTeamSwitchEvents } from '../Battle/PokemonTeamSwitchUI.js';
import { createCaptureManager } from '../Battle/CaptureManager.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers
    this.gameManager = null;
    this.battleNetworkHandler = null;
    this.healthBarManager = null;
    this.koManager = null;
    this.playerRole = null;
    this.battleInventoryUI = null;
    this.captureManager = null;
    
    // État
    this.isActive = false;
    this.isVisible = false;
    this.isReadyForActivation = false;
    this.switchingAvailable = false;
    this.availableSwitchCount = 0;
    this.battleType = 'wild';
    
    // 🆕 ÉTAT UNIVERSAL SWITCH
    this.isMultiPokemonBattle = false;
    this.canSwitch = false;
    this.availableSwitches = [];
    this.noTimeLimit = true;
    
    // Localisation
    this.battleLocalizationReady = false;
    this.battleTranslator = null;
    this.languageCleanupFunction = null; // Pour nettoyer l'événement
    this.captureManager = null;
    // Sprites Pokémon
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // Interface
    this.modernHealthBars = { player1: null, player2: null };
    this.actionInterface = null;
    this.actionMessageText = null;
    this.battleDialog = null;
    this.battleUI = null;
    this.pokemonTeamUI = null;
    // Données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    this.currentPlayerMoves = [];
    this.previousUIState = null;
    this.spriteStructures = new Map();
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    
    // Positions
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.78 },
      opponent: { x: 0.70, y: 0.50 },
      playerPlatform: { x: 0.18, y: 0.88 },
      opponentPlatform: { x: 0.73, y: 0.55 }
    };
    
    // Interface state
    this.interfaceMode = 'hidden';
    this.moveButtons = [];
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
      this.createModernBattleEnvironment();
      this.createModernPokemonPlatforms();
      this.healthBarManager = new HealthBarManager(this);
      
      this.initializeKOManager();
      this.createModernHealthBars();
      this.createModernActionInterface();
      this.createModernBattleDialog();
      this.setupBattleNetworkEvents();
      this.setupLanguageListener(); // Nouvelle méthode
      
      this.isActive = true;
      this.isReadyForActivation = true;
      this.initializeCaptureManager();
      this.initializeBattleLocalization();
      
      // 🔧 CORRECTION SIMPLE - Toujours créer l'interface équipe
      console.log('🔧 [BattleScene] Création interface équipe...');
      try {
        if (this.battleNetworkHandler) {
          this.pokemonTeamUI = createPokemonTeamSwitchUI(this, this.battleNetworkHandler);
          console.log('✅ [BattleScene] Interface équipe créée avec NetworkHandler');
        } else {
          // Créer sans NetworkHandler pour éviter erreur
          this.pokemonTeamUI = {
            showUniversalSwitch: (data) => {
              console.warn('⚠️ [BattleScene] Interface équipe simulée - NetworkHandler manquant');
              return false;
            },
            isOpen: () => false,
            destroy: () => {}
          };
          console.log('⚠️ [BattleScene] Interface équipe simulée créée (NetworkHandler manquant)');
        }
      } catch (error) {
        console.error('❌ [BattleScene] Erreur création interface équipe:', error);
        // Interface de secours
        this.pokemonTeamUI = {
          showUniversalSwitch: (data) => false,
          isOpen: () => false,
          destroy: () => {}
        };
      }
    } catch (error) {
      console.error('[BattleScene] Erreur création:', error);
    }
  }

  // === GESTION LANGUE ===

    setupLanguageListener() {
      // 🆕 VÉRIFICATION SÉCURISÉE
      if (window.optionsSystem && typeof window.optionsSystem.addLanguageListener === 'function') {
        this.languageCleanupFunction = window.optionsSystem.addLanguageListener((newLang, oldLang) => {
          this.onLanguageChanged(newLang, oldLang);
        });
      } else {
        console.log('ℹ️ [BattleScene] OptionsSystem non disponible, skip language listener');
      }
      
      // Écouter également l'événement global
      window.addEventListener('languageChanged', this.handleGlobalLanguageChange);
    }

  handleGlobalLanguageChange = (event) => {
    const newLang = event.detail?.newLanguage;
    if (newLang) {
      this.onLanguageChanged(newLang, null);
    }
  };

  onLanguageChanged(newLang, oldLang) {
    if (!this.isActive || !this.isVisible) return;
    
    // Recharger les traductions battle si nécessaire
    this.initializeBattleLocalization();
    
    // Mettre à jour l'interface
    this.updateInterfaceLanguage();
    
    // Mettre à jour les barres de vie
    this.updateHealthBarsLanguage();
  }

  updateInterfaceLanguage() {
    // Recréer les boutons d'action avec nouvelles traductions
    if (this.interfaceMode === 'buttons') {
      const { width } = this.cameras.main;
      this.recreateActionButtons(width);
    }
    
    // Mettre à jour les textes de moves si affiché
    if (this.interfaceMode === 'moves' && this.currentPlayerMoves.length > 0) {
      this.updateMoveButtonsLanguage();
    }
  }

  updateHealthBarsLanguage() {
    if (this.currentPlayerPokemon && this.modernHealthBars.player1) {
      this.updateModernHealthBar('player1', this.currentPlayerPokemon);
    }
    
    if (this.currentOpponentPokemon && this.modernHealthBars.player2) {
      this.updateModernHealthBar('player2', this.currentOpponentPokemon);
    }
  }

  updateMoveButtonsLanguage() {
    // Mettre à jour les noms des moves avec les nouvelles traductions
    this.currentPlayerMoves = this.currentPlayerMoves.map(move => ({
      ...move,
      name: this.getMoveName(move.id)
    }));
    
    // Recréer les boutons de moves
    this.showMoveButtons(this.currentPlayerMoves);
  }

  recreateActionButtons(width) {
    // Supprimer les anciens boutons d'action
    if (this.actionInterface) {
      this.actionInterface.list.forEach(child => {
        if (child.isActionButton) {
          child.destroy();
        }
      });
    }
    
    // Recréer avec nouvelles traductions
    this.createModernActionButtons(width);
  }

  // === INITIALISATION KOMANAGER ===

  initializeKOManager() {
    try {
      this.koManager = createKOManager(this);
      
      this.koManager.setOnKOComplete((koData) => {
        this.handleKOSequenceComplete(koData);
      });
      
      this.koManager.setOnBattleEnd((battleEndData) => {
        this.endBattle(battleEndData);
      });
    } catch (error) {
      console.error('Erreur initialisation KOManager:', error);
    }
  }

  handleKOSequenceComplete(koData) {
    setTimeout(() => {
      if (koData.battleContinues !== false) {
        this.showActionButtons();
      } else {
        this.showNarrativeMessage('Fin du combat...', false);
      }
    }, 1000);
  }

  // === ENVIRONNEMENT ===

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
    
    border.lineStyle(3, 0x4a90e2, 1);
    border.strokeRect(8, 8, width - 16, height - 16);
    
    border.lineStyle(2, 0x357abd, 0.8);
    border.strokeRect(12, 12, width - 24, height - 24);
  }

  createModernGround(width, height) {
    const groundY = height * 0.82;
    const ground = this.add.graphics();
    ground.setDepth(-50);
    
    ground.fillGradientStyle(0x4a90e2, 0x4a90e2, 0x357abd, 0x357abd, 0.3);
    ground.fillRect(0, groundY, width, height - groundY);
    
    ground.lineStyle(1, 0x87ceeb, 0.4);
    for (let i = 0; i < 3; i++) {
      const y = groundY + (i * 12);
      ground.lineBetween(0, y, width, y);
    }
  }

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
    
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 4, y + 4, size, size * 0.25);
    
    const baseColor = type === 'player' ? 0x4a90e2 : 0x357abd;
    platform.fillGradientStyle(baseColor, baseColor, 0x2a3f5f, 0x2a3f5f, 0.8);
    platform.fillEllipse(x, y, size, size * 0.25);
    
    platform.fillStyle(0x87ceeb, 0.3);
    platform.fillEllipse(x, y - 2, size * 0.8, size * 0.15);
    
    platform.lineStyle(2, 0x87ceeb, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.25);
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const pointX = x + Math.cos(angle) * (size * 0.4);
      const pointY = y + Math.sin(angle) * (size * 0.12);
      
      platform.fillStyle(0x87ceeb, 0.6);
      platform.fillCircle(pointX, pointY, 2);
    }
  }

  // === BARRES DE VIE ===

createModernHealthBars() {
  console.log('🏥 [BattleScene] Création barres de vie modernes...');
  
  const { width, height } = this.cameras.main;
  
  // 🆕 NETTOYER LES ANCIENNES BARRES AVANT CRÉATION
  if (this.modernHealthBars.player1?.container) {
    try {
      this.modernHealthBars.player1.container.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction ancienne barre player1:', error);
    }
  }
  
  if (this.modernHealthBars.player2?.container) {
    try {
      this.modernHealthBars.player2.container.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction ancienne barre player2:', error);
    }
  }
  
  // Créer les nouvelles barres
  try {
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
    
    console.log('✅ [BattleScene] Barres de vie créées avec succès');
    
    // 🆕 VÉRIFICATION POST-CRÉATION
    console.log('🔍 [BattleScene] Vérification post-création:');
    console.log('  - player1 container existe:', !!this.modernHealthBars.player1?.container);
    console.log('  - player2 container existe:', !!this.modernHealthBars.player2?.container);
    
  } catch (error) {
    console.error('❌ [BattleScene] Erreur création barres de vie:', error);
  }
}

  createModernHealthBar(type, config) {
    const container = this.add.container(config.x, config.y);
    container.setDepth(180);
    
    const bgPanel = this.add.graphics();
    this.drawModernPanel(bgPanel, config.width, config.height);
    
    const nameText = this.add.text(15, 15, 
      config.isPlayer ? t('battle.ui.your_pokemon') : t('battle.ui.wild_pokemon'), {
      fontSize: config.isPlayer ? '14px' : '12px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ffffff',
      fontWeight: 'bold'
    });
    
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
    
    const hpLabel = this.add.text(15, 42, 'HP', {
      fontSize: '13px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#87ceeb',
      fontWeight: 'bold'
    });
    
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
  // 🆕 LABEL EXP avec couleur dorée
  const expLabel = this.add.text(15, 65, 'EXP', {
    fontSize: '11px',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: '#FFD700', // 🆕 Couleur dorée au lieu de bleu
    fontWeight: 'bold'
  });
  
  expBarContainer = this.createModernExpBar(45, 67, config.width - 60);
  
  // 🆕 AJOUTER AU CONTAINER (cette ligne était correcte)
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
    
    // 🆕 CORRECTION : S'assurer que l'expBar est ajoutée même si créée plus tard
    if (config.isPlayer && expBarContainer) {
      // Vérifier que le label EXP et la barre sont dans le container
      console.log('📊 [BattleScene] ExpBar ajoutée pour', type);
    }
    
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
    
    graphics.fillGradientStyle(0x2a3f5f, 0x2a3f5f, 0x1e2d42, 0x1e2d42);
    graphics.fillRoundedRect(0, 0, width, height, 12);
    
    graphics.lineStyle(3, 0x4a90e2, 1);
    graphics.strokeRoundedRect(0, 0, width, height, 12);
    
    graphics.lineStyle(2, 0x357abd, 0.8);
    graphics.strokeRoundedRect(3, 3, width - 6, height - 6, 10);
    
    graphics.lineStyle(1, 0x87ceeb, 0.4);
    graphics.strokeRoundedRect(6, 6, width - 12, height - 12, 8);
  }

  createModernHPBar(x, y, maxWidth) {
    const container = this.add.container(x, y);
    
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.4);
    background.fillRoundedRect(0, 0, maxWidth, 14, 4);
    background.lineStyle(2, 0x4a90e2, 0.6);
    background.strokeRoundedRect(0, 0, maxWidth, 14, 4);
    
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
  
  const background = this.add.graphics();
  background.fillStyle(0x000000, 0.4);
  background.fillRoundedRect(0, 0, maxWidth, 10, 3);
  // 🆕 Bordure dorée pour XP (comme les vrais jeux Pokémon)
  background.lineStyle(1, 0xFFD700, 0.8);
  background.strokeRoundedRect(0, 0, maxWidth, 10, 3);
  
  const expBar = this.add.graphics();
  
  container.add([background, expBar]);
  
  return {
    container,
    background,
    expBar,
    maxWidth,
    currentPercentage: 0.0 // 🆕 Initialiser à 0 au lieu d'undefined
  };
}

updateModernHealthBar(type, pokemonData) {
  console.log(`🩺 [BattleScene] Mise à jour barre de vie ${type}:`, pokemonData);
  
  const healthBar = this.modernHealthBars[type];
  if (!healthBar) {
    console.error(`❌ [BattleScene] Barre de vie ${type} introuvable`);
    // Tenter de recréer
    this.createModernHealthBars();
    return;
  }
  
  if (!healthBar.container) {
    console.error(`❌ [BattleScene] Container barre de vie ${type} introuvable`);
    return;
  }
  
  if (pokemonData.currentHp === undefined || pokemonData.maxHp === undefined) {
    console.warn(`⚠️ [BattleScene] Données HP manquantes pour ${type}`);
    return;
  }
  
  const displayName = pokemonData.name ? pokemonData.name.toUpperCase() : 'POKÉMON';
  const nameKey = healthBar.config.isPlayer ? 'battle.ui.your_pokemon_name' : 'battle.ui.wild_pokemon_name';
  healthBar.nameText.setText(t(nameKey).replace('{name}', displayName));
  healthBar.levelText.setText(`LV.${pokemonData.level || 1}`);
  
  const hpPercentage = Math.max(0, Math.min(1, pokemonData.currentHp / pokemonData.maxHp));
  
  if (pokemonData.currentHp <= 0 || pokemonData.statusCondition === 'ko') {
    this.updateHealthBarForKO(healthBar, pokemonData);
  } else {
    this.updateHealthBarNormal(healthBar, hpPercentage, pokemonData);
  }
  
  if (healthBar.config.isPlayer && healthBar.expBar && pokemonData.currentExp !== undefined) {
    const expPercentage = pokemonData.currentExp / pokemonData.expToNext;
    this.animateModernExpBar(healthBar.expBar, expPercentage);
  }
  
  // 🆕 FORCER LA VISIBILITÉ
  healthBar.container.setVisible(true);
  healthBar.container.setAlpha(1);
  
  console.log(`✅ [BattleScene] Barre de vie ${type} mise à jour et visible`);
  
  if (healthBar.container.alpha < 1) {
    this.tweens.add({
      targets: healthBar.container,
      alpha: 1,
      duration: 600,
      ease: 'Power2.easeOut'
    });
  }
}

  updateHealthBarForKO(healthBar, pokemonData) {
    this.animateModernHealthBarToZero(healthBar.hpBar);
    
    if (healthBar.config.isPlayer && healthBar.hpText) {
      healthBar.hpText.setText('K.O.');
      healthBar.hpText.setTint(0xFF0000);
    }
    
    if (healthBar.nameText) {
      healthBar.nameText.setTint(0x999999);
    }
  }

  updateHealthBarNormal(healthBar, hpPercentage, pokemonData) {
    this.animateModernHealthBar(healthBar.hpBar, hpPercentage);
    
    if (healthBar.config.isPlayer && healthBar.hpText) {
      healthBar.hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
      healthBar.hpText.clearTint();
    }
    
    if (healthBar.nameText) {
      healthBar.nameText.clearTint();
    }
  }

  updateModernHealthBarVisual(hpBarContainer, targetPercentage) {
    if (!hpBarContainer || !hpBarContainer.hpBar) return;
    
    const { hpBar, maxWidth } = hpBarContainer;
    const percentage = Math.max(0, Math.min(1, targetPercentage));
    
    hpBar.clear();
    
    if (percentage <= 0) return;
    
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
    
    hpBar.fillGradientStyle(primaryColor, primaryColor, secondaryColor, secondaryColor);
    hpBar.fillRoundedRect(2, 2, currentWidth - 4, 10, 3);
    
    hpBar.fillStyle(0xffffff, 0.3);
    hpBar.fillRoundedRect(2, 2, Math.max(0, currentWidth - 4), 3, 2);
    
    hpBar.lineStyle(1, 0xffffff, 0.2);
    hpBar.strokeRoundedRect(2, 2, currentWidth - 4, 10, 3);
    
    hpBarContainer.currentPercentage = percentage;
  }

  animateModernHealthBarToZero(hpBarContainer) {
    if (!hpBarContainer || !hpBarContainer.hpBar) return;
    
    const { hpBar, maxWidth } = hpBarContainer;
    const startPercentage = hpBarContainer.currentPercentage || 0;
    
    if (startPercentage <= 0) {
      hpBar.clear();
      hpBarContainer.currentPercentage = 0;
      return;
    }
    
    this.tweens.add({
      targets: { value: startPercentage },
      value: 0,
      duration: 1200,
      ease: 'Power2.easeIn',
      onUpdate: (tween) => {
        const percentage = tween.targets[0].value;
        
        hpBar.clear();
        
        if (percentage > 0) {
          const currentWidth = Math.floor(maxWidth * percentage);
          
          hpBar.fillGradientStyle(0xFF0000, 0xFF0000, 0xAA0000, 0xAA0000);
          hpBar.fillRoundedRect(2, 2, currentWidth - 4, 10, 3);
          
          if (percentage < 0.1) {
            const flickerAlpha = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
            hpBar.clear();
            hpBar.fillGradientStyle(0xFF0000, 0xFF0000, 0xAA0000, 0xAA0000, flickerAlpha);
            hpBar.fillRoundedRect(2, 2, currentWidth - 4, 10, 3);
          }
        }
      },
      onComplete: () => {
        hpBarContainer.currentPercentage = 0;
      }
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

animateModernExpBar(expBarContainer, targetPercentage, animated = true) {
  if (!expBarContainer || !expBarContainer.expBar) {
    console.warn('⚠️ [BattleScene] ExpBar container manquant');
    return;
  }
  
  const percentage = Math.max(0, Math.min(1, targetPercentage));
  
  // 🆕 ANIMATION FLUIDE OU INSTANTANÉE
  if (animated && expBarContainer.currentPercentage !== undefined) {
    // Animation avec Tween
    this.tweens.add({
      targets: { value: expBarContainer.currentPercentage },
      value: percentage,
      duration: 800,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const currentPercent = tween.targets[0].value;
        this.updateExpBarVisual(expBarContainer, currentPercent);
      },
      onComplete: () => {
        expBarContainer.currentPercentage = percentage;
      }
    });
  } else {
    // Mise à jour instantanée
    this.updateExpBarVisual(expBarContainer, percentage);
    expBarContainer.currentPercentage = percentage;
  }
}

// 🆕 NOUVELLE MÉTHODE : Ajouter cette méthode après animateModernExpBar()
updateExpBarVisual(expBarContainer, percentage) {
  if (!expBarContainer || !expBarContainer.expBar) return;
  
  const { expBar, maxWidth } = expBarContainer;
  const width = Math.max(0, maxWidth * percentage);
  
  expBar.clear();
  
  if (width > 0) {
    // 🆕 GRADIENT BLEU POKÉMON AUTHENTIQUE (différent de la barre HP)
    expBar.fillGradientStyle(0x4FC3F7, 0x4FC3F7, 0x29B6F6, 0x29B6F6);
    expBar.fillRoundedRect(2, 2, width - 4, 6, 2);
    
    // 🆕 EFFET DE BRILLANCE EN HAUT
    expBar.fillStyle(0xffffff, 0.4);
    expBar.fillRoundedRect(2, 2, Math.max(0, width - 4), 2, 1);
    
    // 🆕 BORDURE INTÉRIEURE SUBTILE
    expBar.lineStyle(1, 0x81D4FA, 0.3);
    expBar.strokeRoundedRect(2, 2, width - 4, 6, 2);
  }
}

  // === INTERFACE D'ACTIONS ===

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
      { key: 'attack', text: battleT('actions.attack'), color: 0x4a90e2, icon: '⚔' },
      { key: 'bag', text: battleT('actions.bag'), color: 0x4a90e2, icon: '🎒' },
      { key: 'pokemon', text: battleT('actions.pokemon'), color: 0x4a90e2, icon: '🔄' },
      { key: 'run', text: battleT('actions.run'), color: 0x607d8b, icon: '🏃' }
    ];
    
    const totalPadding = 70;
    const availableWidth = width - totalPadding;
    const buttonWidth = (availableWidth - 20) / 2;
    const buttonHeight = 32;
    const gapX = 20;
    const gapY = 8;
    
    const totalButtonsHeight = (buttonHeight * 2) + gapY;
    const verticalPadding = (110 - totalButtonsHeight) / 2;
    
    const startX = totalPadding / 2;
    const startY = verticalPadding;
    
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
    bg.fillStyle(action.color, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 8);
    
    bg.lineStyle(2, 0xffffff, 0.6);
    bg.strokeRoundedRect(0, 0, width, height, 8);
    
    bg.lineStyle(1, action.color, 0.8);
    bg.strokeRoundedRect(1, 1, width - 2, height - 2, 7);
    
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
      const hoverColor = this.brightenColor(action.color, 0.3);
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(0, 0, width, height, 8);
      
      bg.lineStyle(3, 0x87ceeb, 1);
      bg.strokeRoundedRect(0, 0, width, height, 8);
      
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

  brightenColor(color, factor) {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * (1 + factor)));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * (1 + factor)));
    const b = Math.min(255, Math.floor((color & 0xFF) * (1 + factor)));
    return (r << 16) | (g << 8) | b;
  }

  // === DIALOGUE ===

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
    
    const totalPadding = 70;
    const availableWidth = width - totalPadding;
    const buttonWidth = (availableWidth - 20) / 2;
    const buttonHeight = 32;
    const gapX = 20;
    const gapY = 8;
    
    const totalButtonsHeight = (buttonHeight * 2) + gapY;
    const verticalPadding = (110 - totalButtonsHeight) / 2;
    
    const startX = totalPadding / 2;
    const startY = verticalPadding;
    
    const moveTypeColors = {
      'normal': 0xa8a8a8, 'fire': 0xff4444, 'water': 0x4488ff,
      'electric': 0xffd700, 'grass': 0x44dd44, 'ice': 0x88ddff,
      'fighting': 0xcc2222, 'poison': 0xaa44aa, 'ground': 0xddcc44,
      'flying': 0xaabbff, 'psychic': 0xff4488, 'bug': 0xaabb22,
      'rock': 0xbbaa44, 'ghost': 0x7755aa, 'dragon': 0x7744ff,
      'dark': 0x775544, 'steel': 0xaaaaaa, 'fairy': 0xffaaee
    };
    
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
    this.interfaceMode = 'waiting';
    
    try {
      if (this.events && typeof this.events.emit === 'function') {
        this.events.emit('battleActionSelected', {
          type: 'move',
          moveId: move.id,
          moveName: move.name,
          moveData: move
        });
      }
      
      if (this.battleNetworkHandler) {
        let sendSuccess = false;
        
        if (typeof this.battleNetworkHandler.selectMove === 'function') {
          sendSuccess = this.battleNetworkHandler.selectMove(move.id, move);
        } else if (typeof this.battleNetworkHandler.performBattleAction === 'function') {
          sendSuccess = this.battleNetworkHandler.performBattleAction('attack', {
            moveId: move.id,
            moveName: move.name
          });
        } else if (typeof this.battleNetworkHandler.sendToBattle === 'function') {
          sendSuccess = this.battleNetworkHandler.sendToBattle('battleAction', {
            type: 'attack',
            moveId: move.id,
            moveName: move.name
          });
        }
        
        if (!sendSuccess) {
          throw new Error('Aucune méthode d\'envoi disponible');
        }
        
        const timeoutId = setTimeout(() => {
          if (this.interfaceMode === 'waiting') {
            this.showActionMessage('Timeout - pas de réponse du serveur');
            
            setTimeout(() => {
              this.interfaceMode = 'buttons';
              this.showActionButtons();
            }, 2000);
          }
        }, 8000);
        
        const eventsToWatch = [
          'moveUsed', 'damageDealt', 'actionResult', 'yourTurn'
        ];
        
        const cleanupTimeout = () => {
          clearTimeout(timeoutId);
          this.interfaceMode = 'narrative';
        };
        
        eventsToWatch.forEach(eventType => {
          this.battleNetworkHandler.off(eventType, cleanupTimeout);
          this.battleNetworkHandler.on(eventType, cleanupTimeout);
        });
        
      } else {
        throw new Error('NetworkHandler manquant');
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'attaque:', error);
      this.showActionMessage('Erreur lors de l\'envoi de l\'attaque');
      
      setTimeout(() => {
        this.interfaceMode = 'buttons';
        this.showActionButtons();
      }, 2000);
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
    console.log(`🎮 [BattleScene] Action button: ${actionKey}`);
    
    this.hideActionButtons();
    
    switch (actionKey) {
      case 'attack':
        if (this.currentPlayerMoves.length > 0) {
          this.showMoveButtons(this.currentPlayerMoves);
        } else {
          this.requestMovesFromServer();
        }
        break;
        
case 'bag':
  try {
    if (!this.battleInventoryUI) {
      this.showActionMessage('Initialisation inventaire...');
      this.createBattleInventoryUI();
    }
    
    // ✅ CORRECTION 6: Vérifier CaptureManager avant ouverture inventaire
    if (!this.captureManager && this.battleNetworkHandler) {
      console.log('🔧 [BattleScene] CaptureManager manquant, création tardive...');
      this.initializeCaptureManager();
      
      // Debug immédiat
      this.debugCaptureManager();
    }
    
    if (this.battleInventoryUI) {
      this.battleInventoryUI.openToBalls();
    } else {
      this.showActionMessage('Inventaire non disponible');
      setTimeout(() => this.showActionButtons(), 2000);
    }
  } catch (error) {
    console.error('❌ Erreur inventaire:', error);
    this.showActionMessage('Erreur inventaire');
    setTimeout(() => this.showActionButtons(), 2000);
  }
  break;
        
      case 'pokemon':
        console.log(`🔄 [BattleScene] Pokémon button - État:`, {
          pokemonTeamUI: !!this.pokemonTeamUI,
          canSwitch: this.canSwitch,
          isMultiPokemonBattle: this.isMultiPokemonBattle,
          availableSwitches: this.availableSwitches?.length || 0,
          battleType: this.battleType
        });
        
        // 🔧 CORRECTION SIMPLE - Vérifications et messages clairs
        if (!this.pokemonTeamUI) {
          console.error('❌ [BattleScene] Interface équipe totalement manquante');
          // Essayer de créer l'interface manquante
          if (!this.ensurePokemonTeamUI()) {
            this.showActionMessage('Erreur : Interface équipe non initialisée');
            setTimeout(() => this.showActionButtons(), 2000);
            break;
          }
        }
        
        // Vérification basique des capacités de switch
        if (!this.canSwitch && !this.isMultiPokemonBattle) {
          const message = this.battleType === 'wild' ? 
            'Combat sauvage 1v1 - Changement impossible' :
            'Combat 1v1 - Changement impossible';
          console.log('ℹ️ [BattleScene] Changement bloqué:', message);
          this.showActionMessage(message);
          setTimeout(() => this.showActionButtons(), 2000);
          break;
        }
        
        // Données minimales pour l'interface
        const switchData = {
          canSwitch: this.canSwitch || false,
          availableSwitches: this.availableSwitches || [],
          isMultiPokemonBattle: this.isMultiPokemonBattle || false,
          switchingEnabled: this.canSwitch || false,
          battleType: this.battleType || 'wild',
          noTimeLimit: this.noTimeLimit !== false,
          playerTeam: this.currentPlayerPokemon ? [this.currentPlayerPokemon] : [],
          activePokemonIndex: 0
        };
        
        console.log(`🔄 [BattleScene] Tentative ouverture interface:`, switchData);
        
        try {
          const success = this.pokemonTeamUI.showUniversalSwitch(switchData);
          if (!success) {
            const reasonMessage = 'Changement actuellement indisponible';
            console.log('⚠️ [BattleScene] Interface refusée:', reasonMessage);
            this.showActionMessage(reasonMessage);
            setTimeout(() => this.showActionButtons(), 2000);
          } else {
            console.log('✅ [BattleScene] Interface équipe ouverte');
          }
        } catch (error) {
          console.error('❌ [BattleScene] Erreur ouverture interface:', error);
          this.showActionMessage('Erreur : Impossible d\'ouvrir l\'interface équipe');
          setTimeout(() => this.showActionButtons(), 2000);
        }
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
          console.error('Erreur fuite:', error);
          this.showActionMessage(t('battle.ui.messages.run_error'));
          setTimeout(() => this.showActionButtons(), 2000);
        }
        break;
    }
  }

  /**
   * 🔧 CORRECTION SIMPLE - Initialisation forcée interface équipe
   */
  ensurePokemonTeamUI() {
    if (!this.pokemonTeamUI) {
      console.log('🔧 [BattleScene] Création tardive interface équipe...');
      try {
        if (this.battleNetworkHandler) {
          this.pokemonTeamUI = createPokemonTeamSwitchUI(this, this.battleNetworkHandler);
          console.log('✅ [BattleScene] Interface équipe créée tardivement');
        } else {
          // Interface simulée pour éviter crash
          this.pokemonTeamUI = {
            showUniversalSwitch: (data) => {
              console.warn('⚠️ [BattleScene] Pas de NetworkHandler - Changement simulé bloqué');
              return false;
            },
            isOpen: () => false,
            destroy: () => {}
          };
          console.log('⚠️ [BattleScene] Interface équipe simulée créée');
        }
      } catch (error) {
        console.error('❌ [BattleScene] Erreur création tardive:', error);
        return false;
      }
    }
    return true;
  }

  requestMovesFromServer() {
    this.showActionMessage('Récupération des attaques...');
    
    if (!this.battleNetworkHandler) {
      this.showActionMessage('Erreur : connexion manquante');
      setTimeout(() => this.showActionButtons(), 2000);
      return;
    }
    
    try {
      if (typeof this.battleNetworkHandler.requestMoves === 'function') {
        this.battleNetworkHandler.requestMoves();
      } else if (typeof this.battleNetworkHandler.sendToBattle === 'function') {
        this.battleNetworkHandler.sendToBattle('requestMoves');
      } else if (typeof this.battleNetworkHandler.send === 'function') {
        this.battleNetworkHandler.send('requestMoves');
      } else {
        this.showActionMessage('Erreur : méthode d\'envoi manquante');
        setTimeout(() => this.showActionButtons(), 2000);
        return;
      }
      
      setTimeout(() => {
        if (this.currentPlayerMoves.length === 0) {
          this.showActionMessage('Timeout : pas de réponse du serveur');
          setTimeout(() => this.showActionButtons(), 2000);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Erreur lors de la demande des moves:', error);
      this.showActionMessage('Erreur lors de la demande des attaques');
      setTimeout(() => this.showActionButtons(), 2000);
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
      console.error('Erreur Pokémon joueur:', error);
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
      console.error('Erreur Pokémon adversaire:', error);
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
      
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#4a90e2' : '#87ceeb');
      gradient.addColorStop(0.7, view === 'front' ? '#357abd' : '#4a90e2');
      gradient.addColorStop(1, view === 'front' ? '#2a3f5f' : '#357abd');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#87ceeb';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(48, 48, 37, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 48, 48);
      
      this.textures.addCanvas(fallbackKey, canvas);
    }
    
    return fallbackKey;
  }

  async initializeBattleLocalization() {
    try {
      if (!isBattleTranslationsReady()) {
        await loadBattleTranslations();
      }
      
      const playerRole = this.playerRole || 'player1';
      this.battleTranslator = new BattleTranslator(playerRole);
      
      this.battleLocalizationReady = true;
    } catch (error) {
      console.error('Erreur initialisation localisation:', error);
      this.battleLocalizationReady = false;
    }
  }

  // === ÉVÉNEMENTS RÉSEAU ===

  setupBattleNetworkEvents() {
    if (!this.battleNetworkHandler) return;
    
    setupKOManagerEvents(this.koManager, this.battleNetworkHandler);
    
    this.events.on('teamUIClosed', (data) => {
      console.log('👥 Interface équipe fermée:', data?.reason);
      this.showActionButtons();
    });
    // 🆕 ÉVÉNEMENTS UNIVERSAL SWITCH
    this.battleNetworkHandler.on('battleStart', (data) => {
      console.log('⚔️ [BattleScene] battleStart reçu:', data);
      this.handleUniversalBattleStart(data);
    });
    
    this.battleNetworkHandler.on('actionSelectionStart', (data) => {
      console.log('🎯 [BattleScene] actionSelectionStart reçu:', data);
      this.handleUniversalActionSelectionStart(data);
    });
    
    this.battleNetworkHandler.on('phaseChanged', (data) => {
      console.log('📋 [BattleScene] phaseChanged reçu:', data);
      this.handleUniversalPhaseChanged(data);
    });
    
    // 🆕 ÉVÉNEMENTS ÉQUIPE SPÉCIFIQUES
    this.battleNetworkHandler.on('switchRequired', (data) => {
      console.log('🚨 [BattleScene] switchRequired reçu:', data);
      this.handleUniversalSwitchRequired(data);
    });
    
    this.battleNetworkHandler.on('pokemonSwitched', (data) => {
      console.log('🔄 [BattleScene] pokemonSwitched reçu:', data);
      this.handleUniversalPokemonSwitched(data);
    });
    
    // 🔥 ÉVÉNEMENTS EXISTANTS
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
    });

    this.battleNetworkHandler.on('damageDealt', (data) => {
      let attacker, target;
      if (data.targetRole === 'player1') {
        attacker = this.opponentPokemonSprite;
        target = this.playerPokemonSprite;
      } else {
        attacker = this.playerPokemonSprite;
        target = this.opponentPokemonSprite;
      }
      
      this.createCompleteAttackSequence(attacker, target, data.damage, data.targetRole);
      
      if (data.targetRole === 'player1' && this.currentPlayerPokemon) {
        this.currentPlayerPokemon.currentHp = data.newHp;
        this.currentPlayerPokemon.maxHp = data.maxHp || this.currentPlayerPokemon.maxHp;
      } else if (data.targetRole === 'player2' && this.currentOpponentPokemon) {
        this.currentOpponentPokemon.currentHp = data.newHp;
        this.currentOpponentPokemon.maxHp = data.maxHp || this.currentOpponentPokemon.maxHp;
      }
      
      const pokemonData = {
        name: data.targetName || 'Pokémon',
        currentHp: data.newHp,
        maxHp: data.maxHp || this.getCurrentMaxHp(data.targetRole),
        level: this.getCurrentLevel(data.targetRole)
      };
      
      setTimeout(() => {
        this.updateModernHealthBar(data.targetRole, pokemonData);
      }, 700);
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
    
    this.battleNetworkHandler.on('yourTurn', (data) => {
      this.handleBattleEvent('yourTurn', data);
    });
  }

  // === 🆕 HANDLERS UNIVERSAL SWITCH ===

  /**
   * 🆕 Traitement battleStart universel
   */
 handleUniversalBattleStart(data) {
  console.log('⚔️ [BattleScene] Traitement battleStart universel:', data);
  
  // 🆕 S'ASSURER QUE L'INTERFACE EST PRÊTE
  this.ensureBattleInterfaceReady();
  
  // Extraire propriétés Universal Switch
  this.isMultiPokemonBattle = data.isMultiPokemonBattle || false;
  this.switchingEnabled = data.switchingEnabled || false;
  this.battleType = data.gameState?.type || 'wild';
  
  console.log(`🔍 [BattleScene] État détecté:`, {
    type: this.battleType,
    multiPokemon: this.isMultiPokemonBattle,
    switchingEnabled: this.switchingEnabled
  });
  
  // Traitement classique
  if (data.isNarrative || data.duration) {
    return;
  }
  
  const playerPokemon = data.playerPokemon || data.gameState?.player1?.pokemon;
  const opponentPokemon = data.opponentPokemon || data.gameState?.player2?.pokemon;
  
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

  /**
   * 🆕 Traitement actionSelectionStart universel
   */
handleUniversalActionSelectionStart(data) {
  console.log('🎯 [BattleScene] actionSelectionStart universel:', data);
  
  // 🆕 S'ASSURER QUE L'INTERFACE EST PRÊTE À CHAQUE TOUR
  this.ensureBattleInterfaceReady();
  
  // 🆕 EXTRAIRE OPTIONS SWITCH UNIVERSELLES
  this.canSwitch = data.canSwitch !== false;
  this.availableSwitches = data.availableSwitches || [];
  this.noTimeLimit = data.noTimeLimit !== false;
  
  // Extraire moves du joueur si présent
  if (data.gameState && data.gameState.player1 && data.gameState.player1.pokemon) {
    const playerPokemon = data.gameState.player1.pokemon;
    
    // 🆕 MISE À JOUR DU POKÉMON ACTUEL
    this.currentPlayerPokemon = playerPokemon;
    
    if (playerPokemon.moves && Array.isArray(playerPokemon.moves)) {
      this.currentPlayerMoves = this.transformServerMoves(playerPokemon.moves, playerPokemon);
      
      if (this.currentPlayerPokemon) {
        this.currentPlayerPokemon.moves = this.currentPlayerMoves;
      }
    } else {
      this.currentPlayerMoves = [];
    }
    
    // 🆕 METTRE À JOUR LA BARRE DE VIE DU JOUEUR
    console.log('🩺 [BattleScene] Mise à jour HP joueur depuis actionSelection:', playerPokemon);
    this.updateModernHealthBar('player1', playerPokemon);
  } else {
    this.currentPlayerMoves = [];
  }
  
  // 🆕 TRAITER POKÉMON ADVERSAIRE SI PRÉSENT
  if (data.gameState && data.gameState.player2 && data.gameState.player2.pokemon) {
    const opponentPokemon = data.gameState.player2.pokemon;
    this.currentOpponentPokemon = opponentPokemon;
    
    console.log('🩺 [BattleScene] Mise à jour HP adversaire depuis actionSelection:', opponentPokemon);
    this.updateModernHealthBar('player2', opponentPokemon);
  }
  
  // 🆕 NOTIFIER ÉQUIPE SI CHANGEMENTS DISPONIBLES
  if (this.canSwitch && this.availableSwitches.length > 0) {
    console.log('🔄 [BattleScene] Changements disponibles:', this.availableSwitches.length);
    this.events.emit('switchingAvailable', {
      availableCount: this.availableSwitches.length,
      canSwitch: this.canSwitch,
      battleType: this.battleType,
      isMultiPokemonBattle: this.isMultiPokemonBattle
    });
  }
  
  this.showActionButtons();
}
  /**
   * 🆕 Traitement phaseChanged universel
   */
handleUniversalPhaseChanged(data) {
  console.log('📋 [BattleScene] phaseChanged universel:', data);
  
  // Mettre à jour l'état selon la phase
  if (data.phase === 'action_selection') {
    // Extraire options switch si présentes
    if (data.canSwitch !== undefined) {
      this.canSwitch = data.canSwitch;
    }
    if (data.availableSwitches) {
      this.availableSwitches = data.availableSwitches;
    }
    
    this.showActionButtons();
  } else if (data.phase === 'switch_phase' || data.phase === 'forced_switch') {
    // Phase de changement - sera gérée par switchRequired
  } else if (data.phase === 'ended') {
    // 🎯 DÉCLENCHER LE KOMANAGER
    console.log('🏁 [BattleScene] Combat terminé, trigger KOManager');
    this.triggerKOManagerFromPhase(data);
  }
  
  // Mettre à jour propriétés universelles si présentes
  if (data.isMultiPokemonBattle !== undefined) {
    this.isMultiPokemonBattle = data.isMultiPokemonBattle;
  }
  if (data.switchingEnabled !== undefined) {
    this.switchingEnabled = data.switchingEnabled;
  }
}

// Nouvelle méthode simple pour déclencher le KOManager :
triggerKOManagerFromPhase(phaseData) {
  console.log('💀 [BattleScene] Déclenchement KOManager depuis phase ended:', phaseData);
  
  // Déterminer qui est KO selon le trigger
  const trigger = phaseData.trigger;
  let koData = null;
  
  if (trigger === 'opponent_pokemon_fainted') {
    // Pokémon adversaire KO
    koData = {
      targetRole: 'player2',
      pokemonName: this.currentOpponentPokemon?.name || 'Pokémon ennemi',
      maxHp: this.currentOpponentPokemon?.maxHp || 100,
      level: this.currentOpponentPokemon?.level || 5,
      winner: phaseData.gameState?.winner || 'player1',
      battleEndData: phaseData
    };
  } else if (trigger === 'player_pokemon_fainted') {
    // Pokémon joueur KO
    koData = {
      targetRole: 'player1', 
      pokemonName: this.currentPlayerPokemon?.name || 'Votre Pokémon',
      maxHp: this.currentPlayerPokemon?.maxHp || 100,
      level: this.currentPlayerPokemon?.level || 5,
      winner: phaseData.gameState?.winner || 'player2',
      battleEndData: phaseData
    };
  }
  
  // Déclencher le KOManager si on a des données valides
  if (koData && this.koManager) {
    console.log('🎯 [BattleScene] Appel KOManager.handlePokemonKO:', koData);
    this.koManager.handlePokemonKO(koData);
  } else {
    console.warn('⚠️ [BattleScene] Impossible de déclencher KOManager:', {
      koData: !!koData,
      koManager: !!this.koManager,
      trigger
    });
    
    // Fallback : fin directe
    setTimeout(() => {
      this.endBattle(phaseData);
    }, 2000);
  }
}

  /**
   * 🆕 Traitement switchRequired universel (changement forcé)
   */
  handleUniversalSwitchRequired(data) {
    console.log('🚨 [BattleScene] switchRequired universel:', data);
    
    if (!this.pokemonTeamUI) {
      console.error('❌ [BattleScene] Interface équipe non disponible pour changement forcé');
      return;
    }
    
    // Préparer données pour interface forcée
    const forcedSwitchData = {
      isForced: true,
      availableOptions: data.availableOptions || data.availablePokemon || [],
      timeLimit: data.timeLimit,
      battleType: data.battleType || this.battleType,
      playerRole: data.playerRole,
      reason: data.reason || 'pokemon_fainted'
    };
    
    console.log('🚨 [BattleScene] Ouverture changement forcé:', forcedSwitchData);
    
    // Utiliser l'interface universelle en mode forcé
    this.pokemonTeamUI.handleUniversalForcedSwitch(forcedSwitchData);
  }

  /**
   * 🆕 Traitement pokemonSwitched universel
   */
  handleUniversalPokemonSwitched(data) {
    console.log('🔄 [BattleScene] pokemonSwitched universel:', data);
    
    if (data.playerRole === 'player1') {
      // Mise à jour Pokémon joueur
      if (data.newActivePokemon || data.toPokemon) {
        const newPokemon = data.newActivePokemon || data.toPokemon;
        this.currentPlayerPokemon = newPokemon;
        this.displayPlayerPokemon(newPokemon);
      }
    } else if (data.playerRole === 'player2') {
      // Mise à jour Pokémon adversaire
      if (data.newActivePokemon || data.toPokemon) {
        const newPokemon = data.newActivePokemon || data.toPokemon;
        this.currentOpponentPokemon = newPokemon;
        this.displayOpponentPokemon(newPokemon);
      }
    }
    
    // Message contextuel
    const pokemonName = data.toPokemon?.name || data.newActivePokemon?.name || 'Pokémon';
    const isForced = data.isForced || data.reason === 'forced_after_ko';
    
    const message = isForced ?
      `${pokemonName} est envoyé au combat !` :
      `Changement réussi ! ${pokemonName} rejoint le combat !`;
    
    this.showNarrativeMessage(message, false);
    
    // Retourner aux boutons d'action après délai
    setTimeout(() => {
      this.showActionButtons();
    }, 2000);
  }

  // === 🔥 MÉTHODES EXISTANTES CONSERVÉES ===

  processBattleEventsServerDriven(battleEvents) {
    battleEvents.forEach((event, index) => {
      if (event.type === 'moveUsed') {
        return;
      }
      
      this.handleBattleEvent(event.type, event.data);
    });
  }

  handleNetworkBattleStart(data) {
    // Utilisé par la compatibilité - rediriger vers Universal
    this.handleUniversalBattleStart(data);
  }

  startBattleIntroSequence(opponentPokemon) {
    setTimeout(() => {
      this.handleBattleEvent('wildPokemonAppears', { 
        pokemonName: opponentPokemon?.name || 'Pokémon' 
      });
    }, 2000);
  }

  // === GESTION DES ÉVÉNEMENTS ===

  handleBattleEvent(eventType, data = {}) {
    if (eventType === 'pokemonFainted' || eventType === 'battleEnd') {
      return;
    }
    
    if (eventType === 'yourTurn') {
      this.showActionButtons();
      return;
    }
    
    if (eventType === 'opponentTurn') {
      this.hideActionButtons();
      this.showNarrativeMessage(t('battle.ui.messages.opponent_thinking'), false);
      return;
    }

    if (eventType === 'actionSelectionStart') {
      this.handleUniversalActionSelectionStart(data);
      return;
    }
    
    const introEvents = ['wildPokemonAppears', 'battleStart'];
    const narrativeEvents = ['victory', 'defeat'];
    
    let message = null;
    
    if (this.battleTranslator) {
      message = this.battleTranslator.translate(eventType, data);
    } else {
      if (eventType === 'wildPokemonAppears') {
        const pokemonName = data.pokemonName || t('battle.ui.messages.wild_pokemon');
        message = t('battle.ui.messages.wild_pokemon_appears').replace('{name}', pokemonName);
      } else if (eventType === 'battleStart') {
        message = t('battle.ui.messages.what_will_you_do');
      }
    }
    
    if (message) {
      if (introEvents.includes(eventType)) {
        this.showNarrativeMessage(message, true);
      } else if (narrativeEvents.includes(eventType)) {
        this.showNarrativeMessage(message, true);
      } else {
        this.showNarrativeMessage(message, false);
      }
    }
  }

  transformServerMoves(serverMoves, pokemonData) {
    return serverMoves.map((moveId, index) => {
      const move = {
        id: moveId,
        name: this.getMoveName(moveId),
        type: this.getMoveType(moveId),
        power: this.getMovePower(moveId),
        pp: this.getMoveMaxPP(moveId),
        maxPp: this.getMoveMaxPP(moveId),
        accuracy: this.getMoveAccuracy(moveId),
        description: this.getMoveDescription(moveId)
      };
      
      return move;
    });
  }

  getMoveName(moveId) {
    // Utiliser le LocalizationManager pour obtenir le nom traduit
    if (getMoveNameT) {
      const translatedName = getMoveNameT(moveId);
      if (translatedName && translatedName !== moveId) {
        return translatedName;
      }
    }
    
    // Fallback vers noms hardcodés si traduction pas disponible
    const moveNames = {
      'tackle': 'Charge',
      'tail_whip': 'Mimi-Queue',
      'scratch': 'Griffe',
      'growl': 'Grondement',
      'ember': 'Flammèche',
      'water_gun': 'Pistolet à O',
      'vine_whip': 'Fouet Lianes',
      'thunder_shock': 'Éclair',
      'quick_attack': 'Vive-Attaque',
      'bite': 'Morsure'
    };
    return moveNames[moveId] || moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  getMoveType(moveId) {
    const moveTypes = {
      'tackle': 'normal',
      'tail_whip': 'normal',
      'scratch': 'normal',
      'growl': 'normal',
      'ember': 'fire',
      'water_gun': 'water',
      'vine_whip': 'grass',
      'thunder_shock': 'electric',
      'quick_attack': 'normal',
      'bite': 'dark'
    };
    return moveTypes[moveId] || 'normal';
  }

  getMovePower(moveId) {
    const movePowers = {
      'tackle': 40,
      'tail_whip': 0,
      'scratch': 40,
      'growl': 0,
      'ember': 40,
      'water_gun': 40,
      'vine_whip': 45,
      'thunder_shock': 40,
      'quick_attack': 40,
      'bite': 60
    };
    return movePowers[moveId] || 50;
  }

  getMoveMaxPP(moveId) {
    const movePP = {
      'tackle': 35,
      'tail_whip': 30,
      'scratch': 35,
      'growl': 40,
      'ember': 25,
      'water_gun': 25,
      'vine_whip': 25,
      'thunder_shock': 30,
      'quick_attack': 30,
      'bite': 25
    };
    return movePP[moveId] || 20;
  }

  getMoveAccuracy(moveId) {
    const moveAccuracies = {
      'tackle': 100,
      'tail_whip': 100,
      'scratch': 100,
      'growl': 100,
      'ember': 100,
      'water_gun': 100,
      'vine_whip': 100,
      'thunder_shock': 100,
      'quick_attack': 100,
      'bite': 100
    };
    return moveAccuracies[moveId] || 100;
  }

  getMoveDescription(moveId) {
    const moveDescriptions = {
      'tackle': 'Une charge physique basique.',
      'tail_whip': 'Remue la queue pour baisser la Défense.',
      'scratch': 'Lacère avec des griffes acérées.',
      'growl': 'Gronde pour intimider et baisser l\'Attaque.',
      'ember': 'Projette une petite flamme.',
      'water_gun': 'Projette de l\'eau à haute pression.',
      'vine_whip': 'Fouette avec des lianes flexibles.',
      'thunder_shock': 'Attaque électrique de faible intensité.',
      'quick_attack': 'Attaque rapide qui frappe en premier.',
      'bite': 'Morsure puissante qui peut faire flincher.'
    };
    return moveDescriptions[moveId] || 'Attaque Pokémon.';
  }

  // === EFFETS VISUELS ===

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

  createCompleteAttackSequence(attacker, target, damage, targetRole) {
    if (!attacker || !target) return;
    
    const originalX = attacker.x;
    
    this.tweens.add({
      targets: attacker,
      x: originalX + (target.x > attacker.x ? 60 : -60),
      scaleX: attacker.scaleX * 1.1,
      scaleY: attacker.scaleY * 1.1,
      duration: 300,
      ease: 'Power2.easeOut',
      
      onComplete: () => {
        this.createModernImpactEffect(target.x, target.y);
        this.createModernDamageEffect(target, damage);
        
        const targetOriginalX = target.x;
        this.tweens.add({
          targets: target,
          x: targetOriginalX + 15,
          scaleX: target.scaleX * 0.95,
          scaleY: target.scaleY * 0.95,
          duration: 80,
          yoyo: true,
          repeat: 4,
          onComplete: () => {
            target.setX(targetOriginalX);
          }
        });
        
        target.setTint(0xff6b6b);
        this.tweens.add({
          targets: target,
          alpha: 0.8,
          duration: 200,
          yoyo: true,
          onComplete: () => {
            target.clearTint();
            target.setAlpha(1);
          }
        });
        
        this.tweens.add({
          targets: attacker,
          x: originalX,
          scaleX: attacker.scaleX / 1.1,
          scaleY: attacker.scaleY / 1.1,
          duration: 250,
          ease: 'Power2.easeIn'
        });
      }
    });
  }

  createModernDamageEffect(sprite, damage) {
    if (!sprite) return;
    
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
    
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: originalX + 15,
      duration: 70,
      yoyo: true,
      repeat: 5,
      onComplete: () => sprite.setX(originalX)
    });
    
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
    console.warn('⚠️ [BattleScene] NetworkHandler manquant pour CaptureManager');
    return;
  }
  
  const playerRole = this.playerRole || 'player1';
  
  // ✅ CORRECTION 1: Vérifier que createCaptureManager existe
  if (typeof createCaptureManager !== 'function') {
    console.error('❌ [BattleScene] createCaptureManager non importé');
    return;
  }
  
  // ✅ CORRECTION 2: Créer et vérifier
  this.captureManager = createCaptureManager(this, this.battleNetworkHandler, playerRole);
  
  // ✅ CORRECTION 3: Vérifier que les événements sont bien enregistrés
  if (!this.captureManager) {
    console.error('❌ [BattleScene] CaptureManager création échouée');
    return;
  }
  
  // ✅ CORRECTION 4: Debug des événements enregistrés
  console.log('🎯 [BattleScene] CaptureManager initialisé');
  console.log('📡 [BattleScene] NetworkHandler disponible:', !!this.battleNetworkHandler);
  console.log('📋 [BattleScene] Événements NetworkHandler:', 
    Object.keys(this.battleNetworkHandler.eventCallbacks || {}));
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
        console.error('Erreur UIManager:', error);
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
        console.error('Erreur restauration UIManager:', error);
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

  // === UTILITAIRES ===

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

  // === CONTRÔLES PUBLICS ===

startBattle(battleData) {
  if (!this.isActive) {
    console.error('❌ [BattleScene] Scène non active');
    return;
  }

  console.log('🎮 [BattleScene] Démarrage combat avec données:', battleData);
  
  // 🆕 S'ASSURER QUE L'INTERFACE EST PRÊTE
  this.ensureBattleInterfaceReady();

  try {
    if (window.pokemonUISystem?.setGameState) {
      window.pokemonUISystem.setGameState('battle', { animated: true });
    } else if (window.uiManager?.setGameState) {
      window.uiManager.setGameState('battle', { animated: true });
    }
  } catch (error) {
    console.error('❌ Erreur notification UIManager:', error);
  }
  
  this.handleUniversalBattleStart(battleData);
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
      console.error('Erreur activation:', error);
      return false;
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
      console.error('Erreur envoi battleFinished:', error);
    }
    
    setTimeout(() => {
      this.completeBattleCleanup(battleResult);
    }, 500);
  }

completeBattleCleanup(battleResult) {
  console.log('🧹 [BattleScene] Début nettoyage complet...', battleResult);
  
  // 🆕 NETTOYAGE ÉTAT UNIVERSAL SWITCH
  this.isMultiPokemonBattle = false;
  this.canSwitch = false;
  this.availableSwitches = [];
  this.noTimeLimit = true;
  this.switchingAvailable = false;
  this.availableSwitchCount = 0;
  this.battleType = 'wild';
  
  // 🆕 NETTOYAGE ÉTAT INTERFACE
  this.interfaceMode = 'hidden';
  this.currentPlayerMoves = [];
  this.playerRole = null;
  
  // 🆕 NETTOYAGE ÉTAT LOCALISATION
  this.battleLocalizationReady = false;
  if (this.battleTranslator) {
    this.battleTranslator = null;
  }
  
  // 🆕 NETTOYAGE DONNÉES POKÉMON
  this.currentPlayerPokemon = null;
  this.currentOpponentPokemon = null;
  
  // Nettoyage réseau
  if (this.battleNetworkHandler) {
    // Déconnecter tous les événements spécifiques à ce combat
    const eventsToClean = [
      'battleStart', 'actionSelectionStart', 'phaseChanged', 
      'switchRequired', 'pokemonSwitched', 'actionResult', 
      'moveUsed', 'damageDealt', 'narrativeStart', 'narrativeEnd',
      'battleJoined', 'yourTurn', 'battleRoomDisconnected'
    ];
    
    eventsToClean.forEach(eventName => {
      try {
        this.battleNetworkHandler.off(eventName);
      } catch (error) {
        console.warn(`⚠️ Erreur nettoyage événement ${eventName}:`, error);
      }
    });
    
    this.battleNetworkHandler.disconnectFromBattleRoom();
  }
  
  // Nettoyage système bataille global
  if (window.battleSystem) {
    window.battleSystem.isInBattle = false;
    window.battleSystem.isTransitioning = false;
    window.battleSystem.currentBattleRoom = null;
    window.battleSystem.currentBattleData = null;
    window.battleSystem.selectedPokemon = null;
    // 🆕 NETTOYAGE ÉTAT UNIVERSAL SWITCH GLOBAL
    window.battleSystem.lastBattleState = null;
    window.battleSystem.pendingSwitchData = null;
  }
  
  // Nettoyage GameManager
  if (this.gameManager?.battleState) {
    this.gameManager.battleState = 'none';
    this.gameManager.inBattle = false;
    // 🆕 RESET DONNÉES BATTLE GAMEMANAGER
    this.gameManager.currentBattle = null;
    this.gameManager.lastBattleResult = battleResult;
  }
  
  // Nettoyage visuel
  this.clearAllPokemonSprites();
  this.clearAllHealthBars();
  this.hideBattle();
  
  // 🆕 NETTOYAGE MANAGERS
  this.cleanupManagers();
  
  // Reset UI
  if (window.pokemonUISystem?.setGameState) {
    try {
      window.pokemonUISystem.setGameState('exploration', { force: true });
    } catch (error) {
      console.warn('⚠️ Erreur reset UI:', error);
    }
  }
  
  console.log('✅ [BattleScene] Nettoyage complet terminé');
}
debugHealthBarsState() {
  console.log('🔍 [DEBUG] État des barres de vie:');
  console.log('  - modernHealthBars objet:', this.modernHealthBars);
  console.log('  - player1 existe:', !!this.modernHealthBars?.player1);
  console.log('  - player2 existe:', !!this.modernHealthBars?.player2);
  
  if (this.modernHealthBars?.player1) {
    const p1 = this.modernHealthBars.player1;
    console.log('  - player1.container:', !!p1.container);
    console.log('  - player1.container.visible:', p1.container?.visible);
    console.log('  - player1.container.alpha:', p1.container?.alpha);
    console.log('  - player1.container.depth:', p1.container?.depth);
    console.log('  - player1.container.x:', p1.container?.x);
    console.log('  - player1.container.y:', p1.container?.y);
  }
  
  if (this.modernHealthBars?.player2) {
    const p2 = this.modernHealthBars.player2;
    console.log('  - player2.container:', !!p2.container);
    console.log('  - player2.container.visible:', p2.container?.visible);
    console.log('  - player2.container.alpha:', p2.container?.alpha);
    console.log('  - player2.container.depth:', p2.container?.depth);
    console.log('  - player2.container.x:', p2.container?.x);
    console.log('  - player2.container.y:', p2.container?.y);
  }
  
  // Vérifier tous les containers dans la scène
  const allContainers = this.children.list.filter(child => child.type === 'Container');
  console.log('  - Containers totaux dans la scène:', allContainers.length);
  
  allContainers.forEach((container, index) => {
    if (container.depth >= 180) { // Profondeur des barres de vie
      console.log(`    HealthBar Container ${index}: visible=${container.visible}, depth=${container.depth}, x=${container.x}, y=${container.y}, alpha=${container.alpha}`);
    }
  });
  
  // Vérifier l'état de la scène elle-même
  console.log('  - Scène visible:', this.scene.isVisible());
  console.log('  - Scène active:', this.scene.isActive());
  console.log('  - isVisible flag:', this.isVisible);
}

// Modifier la méthode ensureBattleInterfaceReady pour ajouter plus de debug :
ensureBattleInterfaceReady() {
  console.log('🔧 [BattleScene] Vérification interface combat...');
  
  // Debug l'état avant
  this.debugHealthBarsState();
  
  // Vérifier et recréer les barres de vie si nécessaire
  if (!this.modernHealthBars.player1 || !this.modernHealthBars.player2) {
    console.log('🔧 [BattleScene] Recréation des barres de vie...');
    
    // Forcer la recréation complète
    this.modernHealthBars = { player1: null, player2: null };
    
    try {
      this.createModernHealthBars();
      console.log('✅ [BattleScene] Barres de vie recréées avec succès');
    } catch (error) {
      console.error('❌ [BattleScene] Erreur création barres de vie:', error);
    }
  } else {
    console.log('ℹ️ [BattleScene] Barres de vie déjà présentes');
  }
  
  // Debug l'état après
  this.debugHealthBarsState();
  
  // Vérifier l'interface d'action
  if (!this.actionInterface) {
    console.log('🔧 [BattleScene] Recréation interface d\'action...');
    this.createModernActionInterface();
  }
  
  // Vérifier le dialogue de combat
  if (!this.battleDialog) {
    console.log('🔧 [BattleScene] Recréation dialogue combat...');
    this.createModernBattleDialog();
  }
  
  // Vérifier le HealthBarManager
  if (!this.healthBarManager) {
    console.log('🔧 [BattleScene] Recréation HealthBarManager...');
    this.healthBarManager = new HealthBarManager(this);
  }
  
  // Vérifier le KOManager
  if (!this.koManager) {
    console.log('🔧 [BattleScene] Recréation KOManager...');
    this.initializeKOManager();
  }
  
  // Vérifier l'interface équipe
  if (!this.pokemonTeamUI) {
    console.log('🔧 [BattleScene] Recréation interface équipe...');
    this.ensurePokemonTeamUI();
  }
  
  // Vérifier le CaptureManager
  if (!this.captureManager && this.battleNetworkHandler) {
    console.log('🔧 [BattleScene] Recréation CaptureManager...');
    this.initializeCaptureManager();
  }
  
  console.log('✅ [BattleScene] Interface combat vérifiée/recréée');
}
  
// 🆕 NOUVELLE MÉTHODE : Nettoyage des barres de vie
clearAllHealthBars() {
  console.log('🧹 [BattleScene] Nettoyage barres de vie...');
  
  Object.keys(this.modernHealthBars).forEach(key => {
    const healthBar = this.modernHealthBars[key];
    if (healthBar?.container) {
      try {
        // Cacher au lieu de détruire immédiatement
        healthBar.container.setVisible(false);
        // Détruire seulement si on est sûr de pouvoir recréer
        healthBar.container.destroy();
      } catch (error) {
        console.warn(`⚠️ Erreur destruction barre de vie ${key}:`, error);
      }
    }
  });
  
  // Réinitialiser l'objet
  this.modernHealthBars = { player1: null, player2: null };
}

// 🆕 NOUVELLE MÉTHODE : Nettoyage des managers
cleanupManagers() {
  console.log('🧹 [BattleScene] Nettoyage managers...');
  
  // Nettoyage KOManager
  if (this.koManager) {
    try {
      this.koManager.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction KOManager:', error);
    }
    this.koManager = null;
  }
  
  // Nettoyage PokemonTeamUI
  if (this.pokemonTeamUI) {
    try {
      this.pokemonTeamUI.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction PokemonTeamUI:', error);
    }
    this.pokemonTeamUI = null;
  }
  
  // Nettoyage CaptureManager
  if (this.captureManager) {
    try {
      this.captureManager.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction CaptureManager:', error);
    }
    this.captureManager = null;
  }
  
  // Nettoyage BattleInventoryUI
  if (this.battleInventoryUI) {
    try {
      if (typeof this.battleInventoryUI.destroy === 'function') {
        this.battleInventoryUI.destroy();
      }
    } catch (error) {
      console.warn('⚠️ Erreur destruction BattleInventoryUI:', error);
    }
    this.battleInventoryUI = null;
  }
  
  // Nettoyage HealthBarManager
  if (this.healthBarManager) {
    try {
      if (typeof this.healthBarManager.destroy === 'function') {
        this.healthBarManager.destroy();
      }
    } catch (error) {
      console.warn('⚠️ Erreur destruction HealthBarManager:', error);
    }
    this.healthBarManager = null;
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

  // === DESTRUCTION ===

  destroy() {
    this.deactivateBattleUI();
    this.clearAllPokemonSprites();

    // Nettoyer les événements langue
    if (this.languageCleanupFunction) {
      this.languageCleanupFunction();
      this.languageCleanupFunction = null;
    }
    
    window.removeEventListener('languageChanged', this.handleGlobalLanguageChange);

    if (this.koManager) {
      this.koManager.destroy();
      this.koManager = null;
    }

    if (this.pokemonTeamUI) {
      this.pokemonTeamUI.destroy();
      this.pokemonTeamUI = null;
    }
    
    if (this.actionInterface) {
      this.actionInterface.destroy();
      this.actionInterface = null;
    }
    
    if (this.battleDialog) {
      this.battleDialog.destroy();
      this.battleDialog = null;
    }
   if (this.captureManager) {
        this.captureManager.destroy();
        this.captureManager = null;
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
