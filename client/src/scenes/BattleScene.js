// client/src/scenes/BattleScene.js - VERSION MODULAIRE avec HealthBarManagerAAaa

import { HealthBarManager } from '../managers/HealthBarManager.js';
import { BattleActionUI } from '../Battle/BattleActionUI.js';

let pokemonSpriteConfig = null;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.currentZone = null  // ✅ SAUVEGARDER LES VALEURS ORIGINALES AVANT MODIFICATION
    
    
    // Managers
    this.battleManager = null;
    this.gameManager = null;
    this.networkHandler = null;
    this.healthBarManager = null; // ✅ NOUVEAU: Manager des barres de vie
    this.battleActionUI = null;
    this.battleNetworkHandler = null;
    
    // État de la scène
    this.isActive = false;
    this.isVisible = false;
    
    // Sprites Pokémon avec gestion 9x9
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // Cache des tailles de frames
    this.frameSizeCache = new Map();
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // État UI précédent pour restauration élégante
    this.previousUIState = null;
    
    // Positions des Pokémon (style Pokémon classique)
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.75 },      // 15% gauche, 75% bas (premier plan)
      opponent: { x: 0.75, y: 0.35 }     // 75% droite, 35% haut (arrière-plan)
    };
    
    console.log('⚔️ [BattleScene] Constructeur modulaire avec HealthBarManager');
  }

  // === INITIALISATION ===

init(data = {}) {
  this.gameManager = data.gameManager
    || this.scene.get('GameScene')?.gameManager
    || window.pokemonUISystem?.gameManager
    || window.gameManager;

this.battleNetworkHandler = data.battleNetworkHandler
  || window.battleSystem?.battleConnection?.networkHandler
  || window.globalNetworkManager?.battleNetworkHandler
  || null;

if (!this.battleNetworkHandler) {
  console.warn('⚠️ [BattleScene] BattleNetworkHandler non trouvé dans init');
} else {
  console.log('✅ [BattleScene] BattleNetworkHandler trouvé :', this.battleNetworkHandler);
}

  if (!this.gameManager || !this.networkHandler) {
    console.warn('⚠️ [BattleScene] Managers partiellement manquants dans init');
  }
}


  preload() {
    console.log('📁 [BattleScene] Préchargement sprites Pokémon 9x9...');
    
    // Background de combat
   if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    // Sprites Pokémon avec calcul automatique des frames
   // this.loadPokemonSpritesheets9x9();
    
    // Événement de completion pour debug
    this.load.on('complete', () => {
      console.log('✅ [BattleScene] Chargement sprites terminé');
      this.debugLoadedTextures();
    });
    
    console.log('✅ [BattleScene] Préchargement configuré avec calcul 9x9');
  }

create() {
  console.log('🎨 [BattleScene] Création de la scène modulaire...');

  // ✅ GARDER: Masquer la scène par défaut AVANT de créer les éléments
  this.scene.setVisible(false);
  this.scene.sleep(); // Mettre en veille
  
  // ✅ AJOUT: Marquer comme prête pour activation
  this.isReadyForActivation = true;
  
  try {
    // 1. Créer le background
    this.createBattleBackground();
    
    // 2. Calculer les positions
    this.createPokemonPositions();
    
    // ✅ 3. NOUVEAU: Initialiser le HealthBarManager
    this.healthBarManager = new HealthBarManager(this);
    this.healthBarManager.createHealthBars();

    this.battleActionUI = new BattleActionUI(this, this.battleManager);
    this.battleActionUI.create();
    this.setupBattleActionEvents();
    
    // 4. Setup managers et événements
    this.setupBasicBattleManager();
    this.setupBasicEvents();
    this.setupBattleNetworkEvents();
    
    this.isActive = true;
    console.log('✅ [BattleScene] Scène créée avec HealthBarManager modulaire');
    
  } catch (error) {
    console.error('❌ [BattleScene] Erreur lors de la création:', error);
  }
}
  // === GESTION UI ÉLÉGANTE avec UIManager ===

  
  activateBattleUI() {
    console.log('🎮 [BattleScene] Activation UI battle via UIManager...');
    
    if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
      try {
        this.previousUIState = {
          gameState: window.pokemonUISystem.setGameState.currentGameState || 'exploration',
          timestamp: Date.now()
        };
        
        const success = window.pokemonUISystem.setGameState('battle', {
          animated: true,
          force: true
        });
        
        if (success) {
          console.log('✅ [BattleScene] Mode battle activé via UIManager');
          return true;
        } else {
          return this.fallbackHideUI();
        }
        
      } catch (error) {
        console.error('❌ [BattleScene] Erreur UIManager:', error);
        return this.fallbackHideUI();
      }
      
    } else {
      console.warn('⚠️ [BattleScene] UIManager non disponible, fallback');
      return this.fallbackHideUI();
    }
  }

  deactivateBattleUI() {
    console.log('🔄 [BattleScene] Désactivation UI battle via UIManager...');
    
    if (window.pokemonUISystem && window.pokemonUISystem.setGameState && this.previousUIState) {
      try {
        const targetState = this.previousUIState.gameState || 'exploration';
        
        const success = window.pokemonUISystem.setGameState(targetState, {
          animated: true
        });
        
        if (success) {
          console.log(`✅ [BattleScene] État "${targetState}" restauré via UIManager`);
          this.previousUIState = null;
          return true;
        } else {
          return this.fallbackRestoreUI();
        }
        
      } catch (error) {
        console.error('❌ [BattleScene] Erreur restauration UIManager:', error);
        return this.fallbackRestoreUI();
      }
      
    } else {
      console.warn('⚠️ [BattleScene] UIManager ou état précédent non disponible');
      return this.fallbackRestoreUI();
    }
  }

  fallbackHideUI() {
    console.log('🆘 [BattleScene] Fallback masquage UI manuel...');
    
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
    
    console.log(`🆘 [BattleScene] ${hiddenCount} éléments masqués manuellement`);
    return hiddenCount > 0;
  }

  fallbackRestoreUI() {
    console.log('🆘 [BattleScene] Fallback restauration UI manuelle...');
    
    const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
    let restoredCount = 0;
    
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-battle-hidden');
      restoredCount++;
    });
    
    console.log(`🆘 [BattleScene] ${restoredCount} éléments restaurés manuellement`);
    return restoredCount > 0;
  }

  // === SPRITES POKÉMON ===

// REMPLACER la méthode loadPokemonSpritesheets9x9()
// Remplacez la méthode loadPokemonSpritesheets9x9() dans BattleScene

async loadPokemonSpritesheets9x9() {
  console.log('🐾 [BattleScene] Chargement avec PokemonSpriteConfig...');
  
  // Charger la config une seule fois
  if (!this.cache.json.has('pokemonSpriteConfig')) {
    this.load.json('pokemonSpriteConfig', 'assets/pokemon/PokemonSpriteConfig.json');
    this.load.start();
    
    await new Promise(resolve => {
      this.load.once('complete', resolve);
    });
  }
  
  pokemonSpriteConfig = this.cache.json.get('pokemonSpriteConfig');
  console.log('✅ [BattleScene] Config chargée:', pokemonSpriteConfig);
}

// NOUVELLE méthode pour charger un Pokémon spécifique avec la config
async loadPokemonSprite(pokemonId, view = 'front') {
  const spriteKey = `pokemon_${pokemonId}_${view}`;
  
  if (this.textures.exists(spriteKey)) {
    console.log(`✅ [BattleScene] Sprite déjà chargé: ${spriteKey}`);
    return spriteKey;
  }
  
  console.log(`📁 [BattleScene] Chargement dynamique: ${spriteKey}`);
  
  try {
    // S'assurer que la config est chargée
    if (!pokemonSpriteConfig) {
      await this.loadPokemonSpritesheets9x9();
    }
    
    // ✅ UTILISER LA CONFIG JSON
    const config = pokemonSpriteConfig[pokemonId] || pokemonSpriteConfig.default;
    
    // ✅ NOUVEAU CHEMIN CORRECT
    const paddedId = pokemonId.toString().padStart(3, '0'); // 1 -> "001"
    const imagePath = `assets/pokemon/${paddedId}/${view}.png`;
    
    console.log(`🔍 [BattleScene] Chemin: ${imagePath}`);
    console.log(`📐 [BattleScene] Config pour ${pokemonId}:`, config);
    
    // Charger comme spritesheet avec les dimensions de la config
    this.load.spritesheet(spriteKey, imagePath, {
      frameWidth: config.spriteWidth,   // 38 par défaut
      frameHeight: config.spriteHeight  // 38 par défaut
    });
    
    // Attendre le chargement
    await new Promise((resolve, reject) => {
      this.load.once('complete', resolve);
      this.load.once('loaderror', (file) => {
        if (file.key === spriteKey) {
          reject(new Error(`Erreur chargement: ${file.src}`));
        }
      });
      this.load.start();
    });
    
    if (this.textures.exists(spriteKey)) {
      console.log(`✅ [BattleScene] Spritesheet chargé: ${spriteKey} (${config.spriteWidth}x${config.spriteHeight})`);
      return spriteKey;
    } else {
      throw new Error(`Spritesheet non créé: ${spriteKey}`);
    }
    
  } catch (error) {
    console.error(`❌ [BattleScene] Erreur chargement ${spriteKey}:`, error);
    return this.createFallbackSprite(view);
  }
}

// Méthode pour créer un sprite de fallback
createFallbackSprite(view) {
  const fallbackKey = `pokemon_placeholder_${view}`;
  
  if (!this.textures.exists(fallbackKey)) {
    console.log(`🎭 [BattleScene] Création placeholder: ${fallbackKey}`);
    
    // Créer un canvas simple
    const canvas = document.createElement('canvas');
    canvas.width = 38;
    canvas.height = 38;
    const ctx = canvas.getContext('2d');
    
    // Dessiner un cercle coloré
    ctx.fillStyle = view === 'front' ? '#4A90E2' : '#7ED321';
    ctx.beginPath();
    ctx.arc(19, 19, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', 19, 23);
    
    // Ajouter au cache des textures
    this.textures.addCanvas(fallbackKey, canvas);
  }
  
  return fallbackKey;
}

  loadPokemonWithMultipleSizes(pokemonConfig) {
    const { id, name, commonSizes } = pokemonConfig;
    
    ['front', 'back'].forEach(view => {
      const spriteKey = `pokemon_${id}_${view}`;
      
      if (this.textures.exists(spriteKey)) return;
      
      const imagePath = `assets/pokemon/${name}/${view}.png`;
      const primarySize = commonSizes[0] || 360;
      const frameSize = this.calculateFrameSize9x9(primarySize, primarySize);
      
      this.load.spritesheet(spriteKey, imagePath, {
        frameWidth: frameSize.frameWidth,
        frameHeight: frameSize.frameHeight
      });
      
      this.frameSizeCache.set(spriteKey, {
        imageSize: primarySize,
        frameWidth: frameSize.frameWidth,
        frameHeight: frameSize.frameHeight,
        calculated: true
      });
    });
  }

  calculateFrameSize9x9(imageWidth, imageHeight) {
    const frameWidth = Math.floor(imageWidth / 9);
    const frameHeight = Math.floor(imageHeight / 9);
    
    return {
      frameWidth,
      frameHeight,
      totalFrames: 81,
      grid: '9x9'
    };
  }

  loadPlaceholderSprites() {
    const placeholderConfigs = [
      { key: 'pokemon_placeholder_front', size: 96 },
      { key: 'pokemon_placeholder_back', size: 96 }
    ];
    
    placeholderConfigs.forEach(config => {
      if (!this.textures.exists(config.key)) {
        this.load.image(config.key, this.createPlaceholderData(config.size));
      }
    });
  }

  createPlaceholderData(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FFA500');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size-2, size-2);
    
    ctx.fillStyle = '#000000';
    ctx.font = `${size/3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', size/2, size/2);
    
    return canvas.toDataURL();
  }

  // === BACKGROUND ET POSITIONS ===

  createBattleBackground() {
    console.log('🖼️ [BattleScene] Création background de combat...');
    
    const { width, height } = this.cameras.main;
    
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      
      const scaleX = width / this.battleBackground.width;
      const scaleY = height / this.battleBackground.height;
      const scale = Math.max(scaleX, scaleY);
      
      this.battleBackground.setScale(scale);
      this.battleBackground.setDepth(-100);
      
      console.log('✅ [BattleScene] Background chargé et mis à l\'échelle');
    } else {
      console.warn('⚠️ [BattleScene] Background manquant, création fallback...');
      this.createFallbackBackground();
    }
  }

  createFallbackBackground() {
    const { width, height } = this.cameras.main;
    
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      0x87CEEB, 0x87CEEB,  // Bleu ciel
      0x32CD32, 0x228B22   // Vert herbe
    );
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    
    const horizonY = height * 0.55;
    bg.lineStyle(3, 0x2F4F2F, 0.6);
    bg.lineBetween(0, horizonY, width, horizonY);
    
    this.battleBackground = bg;
  }

  createPokemonPositions() {
    console.log('🐾 [BattleScene] Calcul positions Pokémon...');
    
    const { width, height } = this.cameras.main;
    
    this.pokemonPositions.playerAbsolute = {
      x: width * this.pokemonPositions.player.x,
      y: height * this.pokemonPositions.player.y
    };
    
    this.pokemonPositions.opponentAbsolute = {
      x: width * this.pokemonPositions.opponent.x,
      y: height * this.pokemonPositions.opponent.y
    };
    
    console.log('✅ [BattleScene] Positions calculées:', {
      player: this.pokemonPositions.playerAbsolute,
      opponent: this.pokemonPositions.opponentAbsolute,
      screen: { width, height }
    });
  }

  // === ✅ AFFICHAGE POKÉMON AVEC HEALTHBARMANAGER ===

displayPlayerPokemon(pokemonData) {
  console.log('🔥 [FORCE] === DÉBUT AFFICHAGE POKÉMON JOUEUR AVEC FORÇAGE TOTAL ===');
  console.log('🔥 [FORCE] Données reçues:', pokemonData);
  
  // ✅ VÉRIFICATIONS PRÉALABLES COMPLÈTES
  console.log('🔍 [FORCE] État de la scène:', {
    active: this.scene.isActive(),
    visible: this.scene.isVisible(),
    sleeping: this.scene.isSleeping(),
    key: this.scene.key
  });
  
  console.log('🔍 [FORCE] État du système:', {
    gameExists: !!window.game,
    sceneManager: !!this.scene,
    cameras: !!this.cameras,
    textures: !!this.textures,
    children: !!this.children
  });
  
  // ✅ FORCER L'ACTIVATION DE LA SCÈNE
  if (this.scene.isSleeping()) {
    console.log('😴 [FORCE] Réveil de la scène...');
    this.scene.wake();
  }
  
  if (!this.scene.isVisible()) {
    console.log('👁️ [FORCE] Activation visibilité scène...');
    this.scene.setVisible(true);
  }
  
  if (!this.scene.isActive()) {
    console.log('🎬 [FORCE] Activation scène...');
    this.scene.start();
  }
  
  // ✅ VÉRIFIER LES POSITIONS
  if (!this.pokemonPositions?.playerAbsolute) {
    console.log('📐 [FORCE] Recalcul positions...');
    this.createPokemonPositions();
    console.log('📐 [FORCE] Positions créées:', this.pokemonPositions);
  }
  
  // ✅ NETTOYER ANCIEN SPRITE AVEC FORCE
  if (this.playerPokemonSprite) {
    console.log('🗑️ [FORCE] Destruction forcée ancien sprite...');
    try {
      this.playerPokemonSprite.destroy();
    } catch (e) {
      console.warn('⚠️ [FORCE] Erreur destruction sprite:', e);
    }
    this.playerPokemonSprite = null;
  }
  
  if (!pokemonData) {
    console.error('❌ [FORCE] Pas de données Pokémon');
    return;
  }
  
  // ✅ GÉNÉRATION SPRITE KEY AVEC VÉRIFICATIONS
  const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'back');
  console.log('🔑 [FORCE] Clé sprite:', spriteKey);
  
  // ✅ VÉRIFIER TEXTURE EXISTE
  const textureExists = this.textures.exists(spriteKey);
  console.log('🖼️ [FORCE] Texture existe:', textureExists);
  
  if (!textureExists) {
    console.error('❌ [FORCE] TEXTURE MANQUANTE - Listing textures disponibles...');
    const availableTextures = [];
    this.textures.each((key) => {
      if (key.includes('pokemon')) {
        availableTextures.push(key);
      }
    });
    console.log('📝 [FORCE] Textures pokemon disponibles:', availableTextures);
    
    // Utiliser un fallback
    this.createPokemonPlaceholder('player', pokemonData);
    return;
  }
  
  try {
    console.log('🏗️ [FORCE] === CRÉATION SPRITE AVEC VÉRIFICATIONS ===');
    
    const position = this.pokemonPositions.playerAbsolute;
    console.log('📍 [FORCE] Position cible:', position);
    
    // ✅ CRÉATION SPRITE AVEC MULTIPLES VÉRIFICATIONS
    this.playerPokemonSprite = this.add.sprite(position.x, position.y, spriteKey, 0);
    
    console.log('✅ [FORCE] Sprite créé, vérifications...');
    
    // ✅ VÉRIFICATIONS IMMÉDIATE POST-CRÉATION
    if (!this.playerPokemonSprite) {
      throw new Error('Sprite non créé');
    }
    
    if (!this.playerPokemonSprite.texture) {
      throw new Error('Texture sprite non assignée');
    }
    
    if (this.playerPokemonSprite.texture.key === '__MISSING') {
      throw new Error('Texture __MISSING détectée');
    }
    
    console.log('✅ [FORCE] Sprite validé, texture:', this.playerPokemonSprite.texture.key);
    
    // ✅ CONFIGURATION SPRITE AVEC FORÇAGE
    console.log('🎨 [FORCE] Configuration sprite...');
    
    this.playerPokemonSprite.setScale(2.8);
    this.playerPokemonSprite.setDepth(20);
    this.playerPokemonSprite.setOrigin(0.5, 1);
    
    // ✅ FORÇAGE VISIBILITÉ MULTIPLE
    console.log('👁️ [FORCE] === FORÇAGE VISIBILITÉ MULTIPLE ===');
    
    this.playerPokemonSprite.setVisible(true);
    this.playerPokemonSprite.setActive(true);
    this.playerPokemonSprite.setAlpha(1);
    
    // ✅ FORÇAGE SUPPLÉMENTAIRE
    this.playerPokemonSprite.visible = true;
    this.playerPokemonSprite.alpha = 1;
    this.playerPokemonSprite.active = true;
    
    // ✅ POSITIONNEMENT FORCÉ
    this.playerPokemonSprite.x = position.x;
    this.playerPokemonSprite.y = position.y;
    
    console.log('📊 [FORCE] État après forçage:', {
      x: this.playerPokemonSprite.x,
      y: this.playerPokemonSprite.y,
      visible: this.playerPokemonSprite.visible,
      active: this.playerPokemonSprite.active,
      alpha: this.playerPokemonSprite.alpha,
      scaleX: this.playerPokemonSprite.scaleX,
      scaleY: this.playerPokemonSprite.scaleY,
      depth: this.playerPokemonSprite.depth,
      texture: this.playerPokemonSprite.texture.key,
      frame: this.playerPokemonSprite.frame.name
    });
    
    // ✅ DONNÉES SPRITE
    this.playerPokemonSprite.setData('isPokemon', true);
    this.playerPokemonSprite.setData('pokemonType', 'player');
    this.playerPokemonSprite.setData('pokemonId', pokemonData.pokemonId);
    
    // ✅ FORÇAGE DISPLAY LIST
    console.log('📋 [FORCE] Forçage display list...');
    if (this.children && this.children.bringToTop) {
      this.children.bringToTop(this.playerPokemonSprite);
    }
    
    // ✅ FORÇAGE RENDU SYSTÈME
    if (this.sys && this.sys.displayList) {
      this.sys.displayList.bringToTop(this.playerPokemonSprite);
    }
    
    // ✅ FORÇAGE CAMÉRA
    if (this.cameras && this.cameras.main) {
      console.log('📷 [FORCE] Vérification caméra...');
      const camera = this.cameras.main;
      console.log('📷 [FORCE] Caméra dimensions:', {
        width: camera.width,
        height: camera.height,
        x: camera.x,
        y: camera.y
      });
      
      // Vérifier si sprite dans le champ
      const inBounds = (
        this.playerPokemonSprite.x >= 0 && 
        this.playerPokemonSprite.x <= camera.width &&
        this.playerPokemonSprite.y >= 0 && 
        this.playerPokemonSprite.y <= camera.height
      );
      console.log('📷 [FORCE] Sprite dans caméra:', inBounds);
      
      if (!inBounds) {
        console.log('🚨 [FORCE] SPRITE HORS CAMÉRA - REPOSITIONNEMENT FORCÉ');
        this.playerPokemonSprite.setPosition(camera.width * 0.15, camera.height * 0.75);
      }
    }
    
    // ✅ MULTIPLES APPELS DE RENDU
    console.log('🔄 [FORCE] Forçage rendu multiple...');
    
    // Méthode 1: Update manuelle
    if (this.playerPokemonSprite.preUpdate) {
      this.playerPokemonSprite.preUpdate();
    }
    
    // Méthode 2: Update transform
    if (this.playerPokemonSprite.updateDisplayOrigin) {
      this.playerPokemonSprite.updateDisplayOrigin();
    }
    
    // Méthode 3: Forcer dirty
    if (this.playerPokemonSprite.setDirty) {
      this.playerPokemonSprite.setDirty();
    }
    
    // ✅ SAUVEGARDE DONNÉES
    this.currentPlayerPokemon = pokemonData;
    
    // ✅ VÉRIFICATION FINALE IMMÉDIATE
    console.log('🏁 [FORCE] === VÉRIFICATION FINALE ===');
    console.log('🏁 [FORCE] Sprite final état:', {
      exists: !!this.playerPokemonSprite,
      visible: this.playerPokemonSprite?.visible,
      alpha: this.playerPokemonSprite?.alpha,
      active: this.playerPokemonSprite?.active,
      position: {
        x: this.playerPokemonSprite?.x,
        y: this.playerPokemonSprite?.y
      },
      inChildren: this.children.list.includes(this.playerPokemonSprite),
      texture: this.playerPokemonSprite?.texture?.key
    });
    
    // ✅ VÉRIFICATIONS RETARDÉES MULTIPLES
    [100, 500, 1000, 2000].forEach(delay => {
      setTimeout(() => {
        if (this.playerPokemonSprite) {
          console.log(`⏰ [FORCE] Vérification ${delay}ms:`, {
            visible: this.playerPokemonSprite.visible,
            alpha: this.playerPokemonSprite.alpha,
            active: this.playerPokemonSprite.active,
            x: this.playerPokemonSprite.x,
            y: this.playerPokemonSprite.y
          });
          
          // Re-forcer si nécessaire
          if (!this.playerPokemonSprite.visible || this.playerPokemonSprite.alpha < 1) {
            console.log(`🔧 [FORCE] RE-FORÇAGE ${delay}ms...`);
            this.playerPokemonSprite.setVisible(true);
            this.playerPokemonSprite.setAlpha(1);
            this.playerPokemonSprite.setActive(true);
          }
        } else {
          console.error(`❌ [FORCE] Sprite perdu après ${delay}ms !`);
        }
      }, delay);
    });
    
    // ✅ HEALTHBAR
    setTimeout(() => {
      if (this.healthBarManager) {
        console.log('❤️ [FORCE] Mise à jour barre de vie...');
        this.healthBarManager.updatePlayerHealthBar(pokemonData);
      }
    }, 200);
    
    console.log(`✅ [FORCE] === POKÉMON JOUEUR FORCÉ: ${pokemonData.name} ===`);
    
  } catch (error) {
    console.error('❌ [FORCE] ERREUR CRITIQUE:', error);
    console.log('🆘 [FORCE] Création placeholder de secours...');
    this.createPokemonPlaceholder('player', pokemonData);
  }
}

  debugPokemonDisplay() {
  console.log('🔍 === DIAGNOSTIC COMPLET AFFICHAGE POKÉMON ===');
  
  // État scène
  console.log('🎬 État scène:', {
    key: this.scene.key,
    active: this.scene.isActive(),
    visible: this.scene.isVisible(),
    sleeping: this.scene.isSleeping()
  });
  
  // État sprites
  console.log('🐾 État sprites:', {
    playerExists: !!this.playerPokemonSprite,
    opponentExists: !!this.opponentPokemonSprite
  });
  
  // Sprite joueur détaillé
  if (this.playerPokemonSprite) {
    const sprite = this.playerPokemonSprite;
    console.log('👤 Sprite joueur détaillé:', {
      visible: sprite.visible,
      alpha: sprite.alpha,
      active: sprite.active,
      x: sprite.x,
      y: sprite.y,
      scaleX: sprite.scaleX,
      scaleY: sprite.scaleY,
      depth: sprite.depth,
      texture: sprite.texture.key,
      frame: sprite.frame.name,
      width: sprite.width,
      height: sprite.height,
      displayWidth: sprite.displayWidth,
      displayHeight: sprite.displayHeight,
      inChildren: this.children.list.includes(sprite)
    });
  }
  
  // Children de la scène
  console.log('👥 Enfants scène:', {
    total: this.children.list.length,
    sprites: this.children.list.filter(child => child.type === 'Sprite').length,
    pokemonSprites: this.children.list.filter(child => 
      child.getData && child.getData('isPokemon')
    ).length
  });
  
  // Textures disponibles
  const pokemonTextures = [];
  this.textures.each((key) => {
    if (key.includes('pokemon')) {
      pokemonTextures.push(key);
    }
  });
  console.log('🖼️ Textures pokemon:', pokemonTextures);
  
  // État caméra
  const camera = this.cameras.main;
  console.log('📷 Caméra:', {
    width: camera.width,
    height: camera.height,
    x: camera.x,
    y: camera.y,
    zoom: camera.zoom
  });
  
  // Positions calculées
  console.log('📐 Positions:', this.pokemonPositions);
  
  console.log('🔍 === FIN DIAGNOSTIC ===');
}

  
getPokemonSpriteKey(pokemonId, view = 'front') {
const paddedId = pokemonId.toString().padStart(3, '0');
const spriteKey = `pokemon_${paddedId}_${view}`;
  
  if (this.textures.exists(spriteKey)) {
    // ✅ NOUVEAU: Message plus simple car on sait que ça vient du LoaderScene
    console.log(`✅ [BattleScene] Sprite utilisé depuis LoaderScene: ${spriteKey}`);
    return spriteKey;
  } else {
    console.warn(`⚠️ [BattleScene] Sprite non chargé: ${spriteKey}, fallback placeholder`);
    return this.createFallbackSprite(view);
  }
}

  createPokemonPlaceholder(type, pokemonData) {
    console.log(`🎭 [BattleScene] Création placeholder intelligent ${type}:`, pokemonData.name);
    
    if (!this.pokemonPositions?.playerAbsolute || !this.pokemonPositions?.opponentAbsolute) {
      this.createPokemonPositions();
    }
    
    const position = type === 'player' ? 
      this.pokemonPositions.playerAbsolute : 
      this.pokemonPositions.opponentAbsolute;
    
    if (!position) return;
    
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    const placeholder = this.add.circle(position.x, position.y, 50, typeColor, 0.8);
    placeholder.setStroke(3, 0x000000);
    
    const nameText = this.add.text(
      position.x, position.y - 5,
      pokemonData.name || 'Pokémon',
      {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    
    const levelText = this.add.text(
      position.x, position.y + 10,
      `Niv. ${pokemonData.level || '?'}`,
      {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFF99',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
    
    const scale = type === 'player' ? 2.8 : 2.2;
    const depth = type === 'player' ? 20 : 15;
    
    [placeholder, nameText, levelText].forEach(obj => {
      obj.setScale(scale * 0.4);
      obj.setDepth(depth);
    });
    
    const direction = type === 'player' ? 'left' : 'right';
    this.animatePokemonEntry(placeholder, direction);
    
    if (type === 'player') {
      this.playerPokemonSprite = placeholder;
      this.currentPlayerPokemon = pokemonData;
    } else {
      this.opponentPokemonSprite = placeholder;
      this.currentOpponentPokemon = pokemonData;
    }
    
    console.log(`✅ [BattleScene] Placeholder ${type} créé pour ${pokemonData.name}`);
  }

  // === ANIMATIONS ===

animatePokemonEntry(sprite, direction) {
  console.log('🎬 [bulbi animation] === DÉBUT ANIMATION FIXÉE ===');
  console.log('🎬 [bulbi animation] Sprite reçu:', sprite?.texture?.key, 'direction:', direction);
  
  if (!sprite) {
    console.error('🎬 [bulbi animation] ERREUR: Sprite manquant !');
    return null;
  }

  // ✅ VÉRIFICATION TEXTURE SIMPLIFIÉE
  const hasValidSource = sprite.texture.source && sprite.texture.source[0] && sprite.texture.source[0].image;
  const hasValidFrame = sprite.frame && sprite.frame.width > 0 && sprite.frame.height > 0;
  
  if (!hasValidSource || !hasValidFrame) {
    console.error('🔍 [DIAGNOSTIC] ❌ TEXTURE OU FRAME INVALIDE - ABANDON');
    return null;
  }
  
  console.log('🔍 [DIAGNOSTIC] ✅ TEXTURE VALIDE - PROCÉDURE ANIMATION');

  // ✅ SAUVEGARDER LES VALEURS CIBLES (POSITION FINALE)
  const targetX = sprite.x;
  const targetY = sprite.y;
  const targetScaleX = sprite.scaleX;
  const targetScaleY = sprite.scaleY;
  
  console.log('🎯 [bulbi animation] Position cible:', { x: targetX, y: targetY });
  console.log('🎯 [bulbi animation] Scale cible:', { x: targetScaleX, y: targetScaleY });

  // ✅ CALCULER POSITION DE DÉPART
  const screenWidth = this.cameras.main.width;
  const startX = direction === 'left' ? -100 : screenWidth + 100;
  const startY = targetY + 30; // Légèrement plus bas
  const startScale = Math.max(0.3, targetScaleX * 0.4); // Échelle minimum
  
  console.log('🚀 [bulbi animation] Position de départ:', { x: startX, y: startY, scale: startScale });
  
  // ✅ CONFIGURATION IMMÉDIATE DU SPRITE
  sprite.setPosition(startX, startY);
  sprite.setScale(startScale);
  sprite.setAlpha(0);
  sprite.setVisible(true);
  sprite.setActive(true);
  
  console.log('⚙️ [bulbi animation] Sprite configuré - État actuel:', {
    x: sprite.x,
    y: sprite.y,
    alpha: sprite.alpha,
    scaleX: sprite.scaleX,
    visible: sprite.visible,
    active: sprite.active
  });
  
  // ✅ FORCER LA MISE À JOUR DU RENDU
  if (sprite.scene && sprite.scene.sys && sprite.scene.sys.displayList) {
    sprite.scene.sys.displayList.bringToTop(sprite);
  }

  // ✅ ID UNIQUE POUR LE TWEEN
  const tweenId = `pokemon_entry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  console.log('🎬 [bulbi animation] ID tween unique:', tweenId);

  console.log('🚀 [bulbi animation] LANCEMENT TWEEN IMMÉDIAT...');
  
  try {
    // ✅ ANIMATION PRINCIPALE CORRIGÉE
    const mainTween = this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      alpha: 1,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 800,  // ✅ RÉDUIT : 1200ms → 800ms
      ease: 'Back.easeOut',
      
      // ✅ PROPRIÉTÉS TWEEN AMÉLIORÉES
      paused: false,        // S'assurer qu'il n'est pas en pause
      repeat: 0,            // Pas de répétition
      yoyo: false,          // Pas d'aller-retour
      
      onStart: () => {
        console.log('🎬 [bulbi animation] ✅ TWEEN DÉMARRÉ !');
        console.log('📍 Position sprite au démarrage:', { x: sprite.x, y: sprite.y, alpha: sprite.alpha });
      },
      
      onUpdate: (tween, target) => {
        // Log périodique plus fréquent pour debug
        if (tween.totalProgress > 0 && Math.random() < 0.1) { // 10% de chance
          console.log('🎬 [bulbi animation] Progression:', {
            progress: Math.round(tween.totalProgress * 100) + '%',
            x: Math.round(target.x),
            y: Math.round(target.y),
            alpha: Math.round(target.alpha * 100) / 100,
            scale: Math.round(target.scaleX * 100) / 100,
            visible: target.visible
          });
        }
      },
      
      onComplete: () => {
        console.log('🎬 [bulbi animation] ✅ ANIMATION TERMINÉE !');
        console.log('📍 Position finale:', { 
          x: sprite.x, 
          y: sprite.y, 
          alpha: sprite.alpha,
          scale: sprite.scaleX,
          visible: sprite.visible
        });
        
        // ✅ ANIMATION DE REBOND SIMPLIFIÉE
        console.log('🎾 [bulbi animation] Lancement rebond final...');
        
        this.tweens.add({
          targets: sprite,
          y: targetY - 10,
          duration: 150,  // ✅ RÉDUIT : 200ms → 150ms
          ease: 'Quad.easeOut',
          yoyo: true,
          onComplete: () => {
            console.log('🎬 [bulbi animation] ✅ REBOND TERMINÉ !');
            // S'assurer que la position finale est correcte
            sprite.setPosition(targetX, targetY);
            sprite.setAlpha(1);
            sprite.setScale(targetScaleX, targetScaleY);
          }
        });
      },
      
      onStop: () => {
        console.warn('⚠️ [bulbi animation] TWEEN ARRÊTÉ PRÉMATURÉMENT');
      }
    });
    
    // ✅ VÉRIFICATION IMMÉDIATE APRÈS CRÉATION
    console.log('🔍 [DIAGNOSTIC] === VÉRIFICATION TWEEN ===');
    console.log('🔍 Tween créé:', !!mainTween);
    console.log('🔍 Tween state initial:', mainTween.state);
    console.log('🔍 Tween paused:', mainTween.paused);
    console.log('🔍 Tween targets:', mainTween.targets?.length);
    console.log('🔍 TweenManager actif:', this.tweens.manager?.state);
    
    // ✅ FORCER LE DÉMARRAGE SI NÉCESSAIRE
    if (mainTween.state !== 2) { // Si pas en état RUNNING
      console.log('🔧 [bulbi animation] Forçage démarrage tween...');
      mainTween.restart();
    }
    
    // ✅ VÉRIFICATION APRÈS 100ms
    setTimeout(() => {
      console.log('🕒 [bulbi animation] Vérification après 100ms:');
      console.log('📍 Position actuelle:', { x: sprite.x, y: sprite.y, alpha: sprite.alpha });
      console.log('🔍 État tween:', mainTween.state);
      
      if (mainTween.state !== 2 && sprite.alpha < 0.1) {
        console.error('❌ [bulbi animation] TWEEN BLOQUÉ - ANIMATION MANUELLE');
        
        // Animation de secours manuelle
        this.tweens.add({
          targets: sprite,
          alpha: 1,
          x: targetX,
          y: targetY,
          scaleX: targetScaleX,
          scaleY: targetScaleY,
          duration: 800,
          ease: 'Power2.easeOut',
          onStart: () => console.log('🆘 Animation de secours démarrée'),
          onComplete: () => console.log('🆘 Animation de secours terminée')
        });
      }
    }, 100);
    
    return mainTween;
    
  } catch (error) {
    console.error('❌ [bulbi animation] EXCEPTION TWEEN:', error);
    
    // ✅ FALLBACK : AFFICHAGE IMMÉDIAT
    console.log('🆘 [bulbi animation] FALLBACK - Affichage immédiat');
    sprite.setPosition(targetX, targetY);
    sprite.setScale(targetScaleX, targetScaleY);
    sprite.setAlpha(1);
    sprite.setVisible(true);
    
    return null;
  }
}

  addShinyEffect(sprite) {
    if (!sprite) return;
    
    this.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    console.log('✨ [BattleScene] Effet shiny appliqué');
  }

  getTypeColor(type) {
    const typeColors = {
      'normal': 0xA8A878, 'fire': 0xF08030, 'water': 0x6890F0, 'electric': 0xF8D030,
      'grass': 0x78C850, 'ice': 0x98D8D8, 'fighting': 0xC03028, 'poison': 0xA040A0,
      'ground': 0xE0C068, 'flying': 0xA890F0, 'psychic': 0xF85888, 'bug': 0xA8B820,
      'rock': 0xB8A038, 'ghost': 0x705898, 'dragon': 0x7038F8, 'dark': 0x705848,
      'steel': 0xB8B8D0, 'fairy': 0xEE99AC
    };
    
    return typeColors[type.toLowerCase()] || 0xFFFFFF;
  }

  // === ✅ MÉTHODES PUBLIQUES AVEC HEALTHBARMANAGER ===

handleEncounterStart(encounterData) {
  console.log('🐾 [BattleScene] handleEncounterStart avec réseau:', encounterData);
  
  if (!this.isActive) {
    console.warn('⚠️ [BattleScene] Scène non active, activation...');
    if (this.scene && this.scene.wake) {
      this.scene.wake();
    }
  }
  
  // Activer l'UI de combat
  const uiActivated = this.activateBattleUI();
  if (uiActivated) {
    console.log('✅ [BattleScene] UI de combat activée via UIManager');
  }
  
  // S'assurer que les positions sont calculées
  if (!this.pokemonPositions?.playerAbsolute) {
    this.createPokemonPositions();
  }
  
  // Afficher seulement le Pokémon adversaire (le serveur enverra les données complètes via battleStart)
  if (encounterData.pokemon) {
    console.log('👹 [BattleScene] Affichage Pokémon de la rencontre (temporaire)...');
    this.displayOpponentPokemon(encounterData.pokemon);
  }
  
  this.isVisible = true;
  console.log('✅ [BattleScene] Rencontre traitée - attente données serveur');
}

startBattle(battleData) {
  console.log('⚔️ [BattleScene] Démarrage combat réseau:', battleData);
  
  if (!this.isActive) {
    console.error('❌ [BattleScene] Scène non active');
    return;
  }
  
  // Les données viennent maintenant du serveur via handleNetworkBattleStart
  // Cette méthode sert surtout de fallback
  this.handleNetworkBattleStart(battleData);
}

  hideBattle() {
    console.log('🖥️ [BattleScene] Masquage combat avec HealthBarManager...');
    
    // Désactiver l'UI de combat élégamment
    const uiDeactivated = this.deactivateBattleUI();
    if (uiDeactivated) {
      console.log('✅ [BattleScene] UI de combat désactivée via UIManager');
    }
    
    // ✅ NOUVEAU: Masquer les barres via HealthBarManager
    if (this.healthBarManager) {
      this.healthBarManager.hideHealthBars();
    }
    
    this.isVisible = false;
    
    // Mettre en veille la scène
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
    
    console.log('✅ [BattleScene] Combat masqué avec HealthBarManager');
  }

  endBattle(battleResult = {}) {
    console.log('🏁 [BattleScene] Fin de combat avec HealthBarManager:', battleResult);
    
    // Restaurer l'UI élégamment
    const uiRestored = this.deactivateBattleUI();
    if (uiRestored) {
      console.log('✅ [BattleScene] UI restaurée après fin de combat');
    }
    
    // Nettoyer les sprites et barres
    this.clearAllPokemonSprites();
    if (this.healthBarManager) {
      this.healthBarManager.clearHealthBars();
    }
    
    // Masquer la scène
    this.hideBattle();
    
    console.log('✅ [BattleScene] Combat terminé avec HealthBarManager');
  }

  // === ✅ DÉLÉGATION VERS HEALTHBARMANAGER ===

  /**
   * Simuler des dégâts sur le joueur (délégué au HealthBarManager)
   */
  simulatePlayerDamage(damage) {
    if (this.healthBarManager && this.currentPlayerPokemon) {
      return this.healthBarManager.simulatePlayerDamage(damage, this.currentPlayerPokemon);
    }
    console.warn('⚠️ [BattleScene] HealthBarManager ou Pokémon joueur non disponible');
    return null;
  }

  /**
   * Simuler des dégâts sur l'adversaire (délégué au HealthBarManager)
   */
  simulateOpponentDamage(damage) {
    if (this.healthBarManager && this.currentOpponentPokemon) {
      return this.healthBarManager.simulateOpponentDamage(damage, this.currentOpponentPokemon);
    }
    console.warn('⚠️ [BattleScene] HealthBarManager ou Pokémon adversaire non disponible');
    return null;
  }

  /**
   * Ajouter de l'expérience (délégué au HealthBarManager)
   */
  addExperience(expGained) {
    if (this.healthBarManager && this.currentPlayerPokemon) {
      return this.healthBarManager.addExperience(expGained, this.currentPlayerPokemon);
    }
    console.warn('⚠️ [BattleScene] HealthBarManager ou Pokémon joueur non disponible');
    return null;
  }

  /**
   * Changer le statut d'un Pokémon (délégué au HealthBarManager)
   */
  changeStatus(pokemonType, newStatus) {
    if (!this.healthBarManager) {
      console.warn('⚠️ [BattleScene] HealthBarManager non disponible');
      return null;
    }
    
    const pokemon = pokemonType === 'player' ? this.currentPlayerPokemon : this.currentOpponentPokemon;
    if (!pokemon) {
      console.warn(`⚠️ [BattleScene] Pokémon ${pokemonType} non disponible`);
      return null;
    }
    
    return this.healthBarManager.changeStatus(pokemonType, newStatus, pokemon);
  }

  // === NETTOYAGE ET UTILITAIRES ===

  clearAllPokemonSprites() {
    console.log('🧹 [BattleScene] Nettoyage sprites Pokémon...');
    
    // Supprimer sprites principaux
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    // Nettoyer sprites orphelins avec tag 'isPokemon'
    const allChildren = this.children.list.slice();
    allChildren.forEach(child => {
      if (child.getData && child.getData('isPokemon')) {
        console.log('🗑️ [BattleScene] Suppression sprite orphelin:', child.getData('pokemonId'));
        child.destroy();
      }
    });
    
    // Nettoyer données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('✅ [BattleScene] Nettoyage terminé');
  }

  debugLoadedTextures() {
    console.log('🔍 [BattleScene] === DEBUG TEXTURES CHARGÉES ===');
    
    const pokemonTextures = [];
    
    try {
      this.textures.each((key, texture) => {
        if (typeof key === 'string' && key.includes('pokemon_')) {
          const size = texture.source && texture.source[0] ? texture.source[0] : { width: 0, height: 0 };
          const frameInfo = this.frameSizeCache.get(key);
          
          pokemonTextures.push({
            key,
            size: `${size.width}x${size.height}`,
            frames: frameInfo?.totalFrames || 'inconnu',
            frameSize: frameInfo ? `${frameInfo.frameWidth}x${frameInfo.frameHeight}` : 'non calculé'
          });
        }
      });
      
      if (pokemonTextures.length > 0) {
        console.table(pokemonTextures);
      } else {
        console.log('ℹ️ [BattleScene] Aucune texture Pokémon trouvée');
      }
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur debug textures:', error);
      console.log('🔍 [BattleScene] Textures disponibles:', Object.keys(this.textures.list || {}));
    }
    
    console.log('🔍 === FIN DEBUG TEXTURES ===');
  }

  debugCurrentSprites() {
    console.log('🔍 [BattleScene] === DEBUG SPRITES ET HEALTHBARMANAGER ===');
    
    if (this.playerPokemonSprite) {
      console.log('👤 Joueur:', {
        texture: this.playerPokemonSprite.texture?.key || 'non définie',
        frame: this.playerPokemonSprite.frame?.name || 'non définie',
        position: `${this.playerPokemonSprite.x}, ${this.playerPokemonSprite.y}`,
        scale: this.playerPokemonSprite.scale,
        visible: this.playerPokemonSprite.visible
      });
    } else {
      console.log('👤 Joueur: Aucun sprite');
    }
    
    if (this.opponentPokemonSprite) {
      console.log('👹 Adversaire:', {
        texture: this.opponentPokemonSprite.texture?.key || 'non définie',
        frame: this.opponentPokemonSprite.frame?.name || 'non définie',
        position: `${this.opponentPokemonSprite.x}, ${this.opponentPokemonSprite.y}`,
        scale: this.opponentPokemonSprite.scale,
        visible: this.opponentPokemonSprite.visible
      });
    } else {
      console.log('👹 Adversaire: Aucun sprite');
    }
    
    // ✅ NOUVEAU: Debug HealthBarManager
    console.log('🩺 HealthBarManager:', {
      initialized: !!this.healthBarManager,
      playerBar: this.healthBarManager?.playerHealthBar ? 'créée' : 'non créée',
      opponentBar: this.healthBarManager?.opponentHealthBar ? 'créée' : 'non créée'
    });
    
    if (this.healthBarManager) {
      this.healthBarManager.debugHealthBars();
    }
    
    // Debug état UI
    try {
      if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
        console.log('🎮 État UI actuel:', {
          gameState: window.pokemonUISystem.setGameState.currentGameState || 'inconnu',
          questTrackerState: window.pokemonUISystem.getModuleState ? 
            window.pokemonUISystem.getModuleState('questTracker') : 'méthode non disponible'
        });
      } else {
        console.log('🎮 État UI: UIManager non disponible ou incomplet');
      }
    } catch (error) {
      console.error('❌ [BattleScene] Erreur debug UI:', error);
    }
    
    console.log('🔍 === FIN DEBUG SPRITES ET HEALTHBARMANAGER ===');
  }

  // === ✅ MÉTHODES DE TEST MODULAIRES ===

  /**
   * Test complet avec HealthBarManager modulaire
   */
  testDisplayPokemonWithHealthBarManager() {
    console.log('🧪 [BattleScene] Test sprites + HealthBarManager modulaire...');
    
    // Activer l'UI de combat
    const uiActivated = this.activateBattleUI();
    console.log('🎮 [BattleScene] UI activée:', uiActivated);
    
    // Nettoyer et afficher
    this.clearAllPokemonSprites();
    if (this.healthBarManager) {
      this.healthBarManager.clearHealthBars();
    }
    
    const testPlayerPokemon = {
      pokemonId: 4,
      id: 'player_charmander_test',
      name: 'Charmander',
      level: 5,
      currentHp: 15,
      maxHp: 18,
      currentExp: 45,
      expToNext: 100,
      statusCondition: 'normal',
      types: ['fire']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      id: 'wild_pikachu_test',
      name: 'Pikachu',
      level: 8,
      currentHp: 20,
      maxHp: 25,
      statusCondition: 'normal',
      types: ['electric'],
      shiny: false
    };
    
    // Afficher avec délais pour l'effet
    setTimeout(() => {
      this.displayPlayerPokemon(testPlayerPokemon);
    }, 500);
    
    setTimeout(() => {
      this.displayOpponentPokemon(testOpponentPokemon);
    }, 1200);
    
    // Debug après affichage
    setTimeout(() => {
      this.debugCurrentSprites();
    }, 3000);
    
    console.log('✅ [BattleScene] Test lancé avec HealthBarManager modulaire');
  }
// === GESTION DES ÉVÉNEMENTS D'INTERFACE ===
setupBattleActionEvents() {
  console.log('🔗 [BattleScene] Configuration événements interface d\'actions...');
  
  if (!this.battleActionUI) {
    console.warn('⚠️ [BattleScene] BattleActionUI non disponible pour événements');
    return;
  }
  
  // Écouter les actions de combat sélectionnées
  this.events.on('battleActionSelected', (actionData) => {
    console.log('🎯 [BattleScene] Action reçue:', actionData);
    this.handlePlayerActionSelected(actionData);
  });
  
  console.log('✅ [BattleScene] Événements interface configurés');
}

// Gérer les actions du joueur avec vraies actions de combat
handlePlayerActionSelected(actionData) {
  console.log('⚔️ [BattleScene] Traitement action:', actionData.type);
  
  // Masquer l'interface
  if (this.battleActionUI) {
    this.battleActionUI.hide();
  }
  
  // Traiter l'action selon le type
  switch (actionData.type) {
    case 'move':
      this.executePlayerMove(actionData.moveId);
      break;
      
    case 'item':
      this.executePlayerItem(actionData.itemId);
      break;
      
    case 'run':
      this.executePlayerRun();
      break;
      
    default:
      console.warn('⚠️ [BattleScene] Type d\'action inconnu:', actionData.type);
      // Réafficher l'interface si action inconnue
      setTimeout(() => {
        if (this.battleActionUI) {
          this.battleActionUI.show();
        }
      }, 1000);
  }
}

  // === EXÉCUTION DES ACTIONS DE COMBAT ===

executePlayerMove(moveId) {
  console.log(`💥 [BattleScene] Attaque: ${moveId}`);
  
  // Envoyer l'action au serveur
  if (this.battleNetworkHandler) {
    const success = this.battleNetworkHandler.useMove(moveId);
    if (success) {
      console.log('📤 [BattleScene] Action envoyée au serveur');
    } else {
      console.error('❌ [BattleScene] Échec envoi action au serveur');
    }
  }
  
  if (window.showGameNotification) {
    window.showGameNotification(`${this.currentPlayerPokemon?.name || 'Votre Pokémon'} utilise ${moveId}!`, 'info', {
      duration: 2000,
      position: 'top-center'
    });
  }
  
  // Ne plus simuler localement - le serveur va répondre
}

executePlayerItem(itemId) {
  console.log(`🎒 [BattleScene] Utilisation objet: ${itemId}`);
  
  // Envoyer au serveur
  if (this.battleNetworkHandler) {
    this.battleNetworkHandler.useItem(itemId);
  }
  
  if (window.showGameNotification) {
    window.showGameNotification(`Utilisation de ${itemId}`, 'info', {
      duration: 2000,
      position: 'top-center'
    });
  }
}

executePlayerRun() {
  console.log(`🏃 [BattleScene] Tentative de fuite`);
  
  // Envoyer au serveur
  if (this.battleNetworkHandler) {
    this.battleNetworkHandler.attemptRun();
  }
  
  if (window.showGameNotification) {
    window.showGameNotification('Tentative de fuite...', 'warning', {
      duration: 2000,
      position: 'top-center'
    });
  }
}
  /**
   * Test cycle complet combat avec HealthBarManager
   */
  testFullBattleCycleWithHealthBarManager() {
    console.log('🧪 [BattleScene] Test cycle complet avec HealthBarManager modulaire...');
    
    // Étape 1: Démarrer combat
    console.log('1️⃣ Démarrage combat...');
    
    // Étape 2: Simuler quelques actions de combat
    setTimeout(() => {
      console.log('2️⃣ Simulation actions de combat...');
      
      // Dégâts sur adversaire
      this.simulateOpponentDamage(8);
      
      setTimeout(() => {
        // Dégâts sur joueur
        this.simulatePlayerDamage(5);
        
        setTimeout(() => {
          // Changement de statut
          this.changeStatus('opponent', 'poison');
          
          setTimeout(() => {
            // Gain d'expérience
            this.addExperience(25);
          }, 1500);
        }, 1500);
      }, 2000);
      
    }, 4000);
    
    // Étape 3: Simuler fin de combat après 12 secondes
    setTimeout(() => {
      console.log('3️⃣ Simulation fin de combat...');
      this.endBattle({
        result: 'victory',
        rewards: { experience: 50, gold: 25 }
      });
    }, 12000);
    
    // Étape 4: Vérifier état final
    setTimeout(() => {
      console.log('4️⃣ Vérification état final...');
      this.debugCurrentSprites();
    }, 14000);
  }

  // === GESTION DES TOURS ===

showPlayerActionMenu() {
  console.log('🎮 [BattleScene] Affichage menu actions joueur...');
  
  if (this.battleActionUI) {
    // Vérifier le contexte (combat sauvage vs dresseur)
    const context = {
      canFlee: true,        // Peut fuir en combat sauvage
      canUseBag: true,      // Peut utiliser le sac
      canSwitchPokemon: false // Pas de changement en combat sauvage
    };
    
    this.battleActionUI.showContextualActions(context);
  } else {
    console.warn('⚠️ [BattleScene] Interface d\'actions non disponible');
  }
}

waitForPlayerAction() {
  console.log('⏳ [BattleScene] Attente action joueur...');
  
  return new Promise((resolve) => {
    this.showPlayerActionMenu();
    
    // Écouter l'action une seule fois
    const handleAction = (actionData) => {
      this.events.off('battleActionSelected', handleAction);
      resolve(actionData);
    };
    
    this.events.once('battleActionSelected', handleAction);
  });
}
  /**
   * Test spécifique des animations de barres via HealthBarManager
   */
  testHealthBarManagerAnimations() {
    console.log('🧪 [BattleScene] Test animations HealthBarManager...');
    
    if (!this.currentPlayerPokemon || !this.currentOpponentPokemon) {
      console.warn('⚠️ [BattleScene] Pas de Pokémon actifs, lancement test complet d\'abord...');
      this.testDisplayPokemonWithHealthBarManager();
      
      setTimeout(() => {
        this.testHealthBarManagerAnimations();
      }, 4000);
      return;
    }
    
    console.log('💥 Test séquence de dégâts via HealthBarManager...');
    
    // Séquence de test des dégâts
    const damageSequence = [
      { target: 'opponent', damage: 3, delay: 1000 },
      { target: 'player', damage: 4, delay: 2000 },
      { target: 'opponent', damage: 5, delay: 3000 },
      { target: 'player', damage: 2, delay: 4000 },
      { target: 'opponent', damage: 7, delay: 5000 }
    ];
    
    damageSequence.forEach(({ target, damage, delay }) => {
      setTimeout(() => {
        if (target === 'player') {
          this.simulatePlayerDamage(damage);
        } else {
          this.simulateOpponentDamage(damage);
        }
      }, delay);
    });
    
    // Test changements de statut
    setTimeout(() => {
      console.log('🔮 Test changements de statut...');
      this.changeStatus('player', 'burn');
    }, 6000);
    
    setTimeout(() => {
      this.changeStatus('opponent', 'paralysis');
    }, 7000);
    
    // Test gain d'expérience
    setTimeout(() => {
      console.log('✨ Test gain d\'expérience...');
      this.addExperience(30);
    }, 8000);
    
    console.log('✅ [BattleScene] Tests animations HealthBarManager lancés');
  }

  // === MÉTHODES DE BASE (temporaires) ===

  setupBasicBattleManager() {
    console.log('⚔️ [BattleScene] Setup BattleManager basique');
    // Version simplifiée pour focus sur HealthBarManager
  }

  setupBasicEvents() {
    console.log('🔗 [BattleScene] Setup événements basiques');
    // Version simplifiée pour focus sur HealthBarManager
  }

setupBattleNetworkEvents() {
  console.log('📡 [BattleScene] Configuration événements réseau...');
  
  if (!this.battleNetworkHandler) {
    console.warn('⚠️ [BattleScene] BattleNetworkHandler manquant pour événements');
    return;
  }
  
  // ✅ DEBUG: Vérifier la référence
  console.log('🔍 [BattleScene] BattleNetworkHandler référence:', this.battleNetworkHandler);
  console.log('🔍 [BattleScene] Test événement sur cet objet...');
  
  // Test simple
  this.battleNetworkHandler.on('battleRoomCreated', (data) => {
    console.log('🎯 [BattleScene] ÉVÉNEMENT REÇU battleRoomCreated:', data);
    this.handleNetworkBattleRoomCreated(data);
  });
    
    this.battleNetworkHandler.on('turnChange', (data) => {
      console.log('🔄 [BattleScene] turnChange reçu:', data);
      this.handleNetworkTurnChange(data);
    });
    
    this.battleNetworkHandler.on('battleMessage', (data) => {
      console.log('💬 [BattleScene] battleMessage reçu:', data);
      this.handleNetworkBattleMessage(data);
    });

        // Événements de résultats d'actions
    this.battleNetworkHandler.on('attackResult', (data) => {
      console.log('💥 [BattleScene] attackResult reçu:', data);
      this.handleNetworkAttackResult(data);
    });
    
    this.battleNetworkHandler.on('pokemonFainted', (data) => {
      console.log('😵 [BattleScene] pokemonFainted reçu:', data);
      this.handleNetworkPokemonFainted(data);
    });
    
    this.battleNetworkHandler.on('battleEnd', (data) => {
      console.log('🏁 [BattleScene] battleEnd reçu:', data);
      this.handleNetworkBattleEnd(data);
    });
    
    this.battleNetworkHandler.on('statusEffectApplied', (data) => {
      console.log('🌡️ [BattleScene] statusEffectApplied reçu:', data);
      this.handleNetworkStatusEffect(data);
    });
    console.log('✅ [BattleScene] Événements réseau configurés');
}
  // === HANDLERS ÉVÉNEMENTS RÉSEAU ===

  handleNetworkBattleRoomCreated(data) {
  console.log('🏠 [BattleScene] Traitement battleRoomCreated:', data);
  
  // Afficher les Pokémon depuis les données de création
  if (data.playerPokemon) {
    console.log('👤 [BattleScene] Affichage Pokémon joueur depuis battleRoomCreated...');
    this.displayPlayerPokemon(data.playerPokemon);
  }
  
  if (data.wildPokemon) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire depuis battleRoomCreated...');
    
    // Convertir les données wild en format complet
    const opponentData = {
      pokemonId: data.wildPokemon.pokemonId,
      name: `Pokémon sauvage #${data.wildPokemon.pokemonId}`,
      level: data.wildPokemon.level,
      currentHp: 50, // Valeur temporaire
      maxHp: 50,
      statusCondition: 'normal',
      types: ['normal'],
      shiny: data.wildPokemon.shiny,
      gender: data.wildPokemon.gender,
      isWild: true
    };
    
    this.displayOpponentPokemon(opponentData);
  }
  
  // Activer l'UI et afficher le menu d'actions
  this.activateBattleUI();
  this.isVisible = true;
  
  // Afficher le menu d'actions après un délai
  setTimeout(() => {
    this.showPlayerActionMenu();
  }, 3000);
}
  
handleNetworkBattleStart(data) {
  console.log('⚔️ [BattleScene] Traitement battleStart réseau:', data);
  
  // ✅ Si les données viennent de battleRoomCreated, les utiliser
  if (data.playerPokemon) {
    this.displayPlayerPokemon(data.playerPokemon);
  }
  // Afficher les Pokémon depuis les données serveur
  if (data.playerPokemon) {
    this.displayPlayerPokemon(data.playerPokemon);
  }
  
  if (data.opponentPokemon) {
    this.displayOpponentPokemon(data.opponentPokemon);
  }
  
  // Activer l'UI de combat
  this.activateBattleUI();
  this.isVisible = true;
}

handleNetworkTurnChange(data) {
  console.log('🔄 [BattleScene] Traitement turnChange réseau:', data);
  
  // Si c'est le tour du joueur, afficher le menu d'actions
  if (data.currentTurn === 'player' || data.isPlayerTurn) {
    setTimeout(() => {
      this.showPlayerActionMenu();
    }, 1000);
  }
}

handleNetworkBattleMessage(data) {
  console.log('💬 [BattleScene] Message de combat:', data.message);
  
  // Afficher le message via notifications
  if (window.showGameNotification) {
    window.showGameNotification(data.message, 'info', {
      duration: 3000,
      position: 'top-center'
    });
  }
}

  handleNetworkAttackResult(data) {
  console.log('💥 [BattleScene] Résultat attaque:', data);
  
  // Mettre à jour les HP via HealthBarManager
  if (data.targetType === 'player' && data.damage > 0) {
    if (this.currentPlayerPokemon) {
      this.currentPlayerPokemon.currentHp = Math.max(0, this.currentPlayerPokemon.currentHp - data.damage);
      this.healthBarManager?.updatePlayerHealthBar(this.currentPlayerPokemon);
    }
  } else if (data.targetType === 'opponent' && data.damage > 0) {
    if (this.currentOpponentPokemon) {
      this.currentOpponentPokemon.currentHp = Math.max(0, this.currentOpponentPokemon.currentHp - data.damage);
      this.healthBarManager?.updateOpponentHealthBar(this.currentOpponentPokemon);
    }
  }
  
  // Réafficher le menu après l'action
  setTimeout(() => {
    this.showPlayerActionMenu();
  }, 2000);
}

handleNetworkPokemonFainted(data) {
  console.log('😵 [BattleScene] Pokémon KO:', data);
  
  if (window.showGameNotification) {
    window.showGameNotification(`${data.pokemonName} est KO !`, 'warning', {
      duration: 3000,
      position: 'top-center'
    });
  }
}

handleNetworkBattleEnd(data) {
  console.log('🏁 [BattleScene] Fin de combat réseau:', data);
  
  // Afficher le résultat
  if (window.showGameNotification) {
    const message = data.result === 'victory' ? 'Victoire !' : 
                   data.result === 'defeat' ? 'Défaite...' : 'Combat terminé';
    window.showGameNotification(message, data.result === 'victory' ? 'success' : 'info', {
      duration: 4000,
      position: 'top-center'
    });
  }
  
  // Terminer le combat après un délai
  setTimeout(() => {
    this.endBattle(data);
  }, 3000);
}

handleNetworkStatusEffect(data) {
  console.log('🌡️ [BattleScene] Effet de statut:', data);
  
  // Mettre à jour le statut via HealthBarManager
  if (data.targetType === 'player' && this.currentPlayerPokemon) {
    this.currentPlayerPokemon.statusCondition = data.status;
    this.healthBarManager?.updatePlayerHealthBar(this.currentPlayerPokemon);
  } else if (data.targetType === 'opponent' && this.currentOpponentPokemon) {
    this.currentOpponentPokemon.statusCondition = data.status;
    this.healthBarManager?.updateOpponentHealthBar(this.currentOpponentPokemon);
  }
}

  // === ✅ MÉTHODES D'ACTIVATION POUR BATTLEUITRANSITION ===

/**
 * Active la BattleScene depuis BattleUITransition
 */
activateFromTransition() {
  console.log('🎬 [BattleScene] Activation depuis BattleUITransition...');
  
  if (!this.isReadyForActivation) {
    console.warn('⚠️ [BattleScene] Scène non prête pour activation');
    return false;
  }
  
  try {
    // Réveiller si endormie
    if (this.scene.isSleeping()) {
      this.scene.wake();
    }
    
    // Rendre visible
    this.scene.setVisible(true);
    
    // Marquer comme visible
    this.isVisible = true;
    
    console.log('✅ [BattleScene] Activée depuis BattleUITransition');
    return true;
    
  } catch (error) {
    console.error('❌ [BattleScene] Erreur activation:', error);
    return false;
  }
}

/**
 * Désactive la BattleScene pour retour à l'exploration
 */
deactivateForTransition() {
  console.log('🛑 [BattleScene] Désactivation pour transition retour...');
  
  try {
    // Masquer
    this.scene.setVisible(false);
    
    // Mettre en veille
    this.scene.sleep();
    
    // Marquer comme non visible
    this.isVisible = false;
    
    console.log('✅ [BattleScene] Désactivée pour transition');
    return true;
    
  } catch (error) {
    console.error('❌ [BattleScene] Erreur désactivation:', error);
    return false;
  }
}

  
  // === NETTOYAGE FINAL ===

  destroy() {
    console.log('💀 [BattleScene] Destruction...');
    
    // Restaurer l'UI avant destruction
    if (this.previousUIState) {
      console.log('🔄 [BattleScene] Restauration UI avant destruction...');
      this.deactivateBattleUI();
    }
    
    // Nettoyer sprites
    this.clearAllPokemonSprites();
    
    // ✅ NOUVEAU: Détruire HealthBarManager
    if (this.healthBarManager) {
      this.healthBarManager.destroy();
      this.healthBarManager = null;
    }
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    // Nettoyer cache
    this.frameSizeCache.clear();
    
    // Nettoyer état
    this.previousUIState = null;
    
    super.destroy();
    
    console.log('✅ [BattleScene] Détruite avec HealthBarManager modulaire');
  }
}


// ✅ FONCTIONS GLOBALES MODULAIRES AVEC HEALTHBARMANAGER

// Test animations spécifiques HealthBarManager
window.testHealthBarManagerAnimations = function() {
  console.log('🧪 === TEST ANIMATIONS HEALTHBARMANAGER ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (window.game.scene.isActive('BattleScene')) {
    battleScene.testHealthBarManagerAnimations();
  } else {
    console.warn('⚠️ BattleScene non active - lancez d\'abord testBattleWithHealthBarManager()');
  }
};

// Contrôles manuels simplifiés (délégués à HealthBarManager)
window.damagePlayer = function(damage = 3) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulatePlayerDamage(damage);
    console.log(`💥 Dégâts joueur: ${damage} (HP restants: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.damageOpponent = function(damage = 3) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.simulateOpponentDamage(damage);
    console.log(`💥 Dégâts adversaire: ${damage} (HP restants: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.addExp = function(exp = 20) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.addExperience(exp);
    console.log(`✨ Expérience gagnée: ${exp} (EXP actuelle: ${result})`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

window.testPlayerPokemonOnly = function() {
  console.log('🧪 === TEST POKÉMON JOUEUR SEUL ===');
  console.log('🌱 Test focus sur Bulbasaur uniquement...');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // ✅ ACTIVER LA SCÈNE SI NÉCESSAIRE
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    window.game.scene.setVisible('BattleScene', true);
  }
  
  // ✅ NETTOYER COMPLÈTEMENT
  console.log('🧹 Nettoyage complet...');
  battleScene.clearAllPokemonSprites();
  if (battleScene.healthBarManager) {
    battleScene.healthBarManager.clearHealthBars();
  }
  
  // ✅ ACTIVER L'UI DE COMBAT
  console.log('🎮 Activation UI battle...');
  const uiResult = battleScene.activateBattleUI();
  console.log('🎮 UI activée:', uiResult);
  
  // ✅ DONNÉES DE TEST POKÉMON JOUEUR
  const testPlayerPokemon = {
    pokemonId: 1,
    id: 'test_bulbasaur_player',
    name: 'Bulbasaur',
    level: 5,
    currentHp: 18,
    maxHp: 20,
    currentExp: 45,
    expToNext: 100,
    statusCondition: 'normal',
    types: ['grass', 'poison']
  };
  
  console.log('🌱 === AFFICHAGE BULBASAUR JOUEUR ===');
  console.log('📋 Données:', testPlayerPokemon);
  
  // ✅ AFFICHER LE POKÉMON JOUEUR
  try {
    battleScene.displayPlayerPokemon(testPlayerPokemon);
    console.log('✅ displayPlayerPokemon() appelée');
  } catch (error) {
    console.error('❌ Erreur dans displayPlayerPokemon():', error);
  }
  
  // ✅ DIAGNOSTICS IMMÉDIATS
  console.log('🔍 === DIAGNOSTIC IMMÉDIAT ===');
  setTimeout(() => {
    console.log('📊 État sprite joueur après 500ms:');
    
    if (battleScene.playerPokemonSprite) {
      const sprite = battleScene.playerPokemonSprite;
      console.log('✅ Sprite existe');
      console.log('📍 Position:', { x: sprite.x, y: sprite.y });
      console.log('👁️ Visibilité:', { 
        visible: sprite.visible, 
        alpha: sprite.alpha,
        active: sprite.active 
      });
      console.log('🎨 Apparence:', {
        scaleX: sprite.scaleX,
        scaleY: sprite.scaleY,
        depth: sprite.depth
      });
      console.log('🖼️ Texture:', sprite.texture.key);
      console.log('🎯 Frame:', sprite.frame.name);
      console.log('📐 Dimensions:', {
        width: sprite.width,
        height: sprite.height,
        displayWidth: sprite.displayWidth,
        displayHeight: sprite.displayHeight
      });
      
      // Vérifier si dans la caméra
      const camera = battleScene.cameras.main;
      const inView = sprite.x >= 0 && sprite.x <= camera.width && 
                     sprite.y >= 0 && sprite.y <= camera.height;
      console.log('📷 Dans le champ de vision:', inView);
      
      // Forcer visibilité si problème
      if (!sprite.visible || sprite.alpha < 0.1) {
        console.log('🆘 FORÇAGE VISIBILITÉ...');
        sprite.setVisible(true);
        sprite.setAlpha(1);
        sprite.setActive(true);
        console.log('🆘 Sprite forcé à visible');
      }
      
    } else {
      console.error('❌ Aucun sprite joueur créé !');
    }
    
    // Debug positions calculées
    console.log('📐 Positions calculées:');
    console.log('- playerAbsolute:', battleScene.pokemonPositions?.playerAbsolute);
    console.log('- Camera:', { 
      width: battleScene.cameras.main.width, 
      height: battleScene.cameras.main.height 
    });
    
    // Debug textures chargées
    console.log('🖼️ Textures Pokémon disponibles:');
    const pokemonTextures = [];
    battleScene.textures.each((key, texture) => {
      if (key.includes('pokemon_')) {
        pokemonTextures.push(key);
      }
    });
    console.log('📝 Liste:', pokemonTextures);
    
  }, 500);
  
  // ✅ DIAGNOSTIC APPROFONDI
  setTimeout(() => {
    console.log('🔍 === DIAGNOSTIC FINAL (2s) ===');
    
    if (battleScene.playerPokemonSprite) {
      const sprite = battleScene.playerPokemonSprite;
      console.log('✅ Sprite toujours présent');
      console.log('📍 Position finale:', { x: sprite.x, y: sprite.y });
      console.log('👁️ État final:', { 
        visible: sprite.visible, 
        alpha: sprite.alpha 
      });
      
      // Test manuel de déplacement
      console.log('🎯 Test déplacement manuel vers centre...');
      sprite.setPosition(400, 300);
      sprite.setAlpha(1);
      sprite.setVisible(true);
      console.log('🎯 Sprite déplacé au centre (400, 300)');
      
    } else {
      console.error('❌ Sprite joueur perdu !');
    }
    
    // Debug scene children
    console.log('👥 Enfants de la scène:');
    const children = battleScene.children.list;
    console.log(`📊 Total: ${children.length} objets`);
    
    const pokemonSprites = children.filter(child => 
      child.getData && child.getData('isPokemon')
    );
    console.log(`🐾 Sprites Pokémon: ${pokemonSprites.length}`);
    
    pokemonSprites.forEach((sprite, index) => {
      console.log(`  ${index + 1}. ${sprite.getData('pokemonType')} - ${sprite.texture.key} - visible: ${sprite.visible}`);
    });
    
  }, 2000);
  
  console.log('🚀 Test lancé - vérifiez les logs dans 2 secondes...');
};

window.setStatus = function(target = 'player', status = 'poison') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.changeStatus(target, status);
    console.log(`🔮 Statut ${target}: ${result}`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
};

// === TEST COMBAT COMPLET AVEC HEALTHBARMANAGER ===
window.testBattleWithHealthBarManager = function() {
  console.log('🧪 === TEST COMBAT COMPLET AVEC HEALTHBARMANAGER ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // ✅ ACTIVER LA SCÈNE
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.wake('BattleScene');
    window.game.scene.setVisible('BattleScene', true);
  }
  
  // ✅ NETTOYAGE COMPLET
  console.log('🧹 Nettoyage complet...');
  battleScene.clearAllPokemonSprites();
  if (battleScene.healthBarManager) {
    battleScene.healthBarManager.clearHealthBars();
  }
  
  // ✅ ACTIVER L'UI DE COMBAT
  console.log('🎮 Activation UI battle...');
  const uiResult = battleScene.activateBattleUI();
  console.log('🎮 UI activée:', uiResult);
  
  // ✅ DONNÉES POKÉMON JOUEUR
  const testPlayerPokemon = {
    pokemonId: 1,
    id: 'test_bulbasaur_battle',
    name: 'Bulbasaur',
    level: 8,
    currentHp: 22,
    maxHp: 25,
    currentExp: 120,
    expToNext: 200,
    statusCondition: 'normal',
    types: ['grass', 'poison']
  };
  
  // ✅ DONNÉES POKÉMON ADVERSAIRE
  const testOpponentPokemon = {
    pokemonId: 25,
    id: 'wild_pikachu_battle',
    name: 'Pikachu',
    level: 6,
    currentHp: 18,
    maxHp: 20,
    statusCondition: 'normal',
    types: ['electric'],
    shiny: false,
    gender: 'male',
    isWild: true
  };
  
  console.log('🌱 === AFFICHAGE POKÉMON JOUEUR (BULBASAUR) ===');
  console.log('📋 Données joueur:', testPlayerPokemon);
  
  // ✅ AFFICHER LE POKÉMON JOUEUR AVEC DÉLAI
  setTimeout(() => {
    try {
      battleScene.displayPlayerPokemon(testPlayerPokemon);
      console.log('✅ Pokémon joueur affiché');
    } catch (error) {
      console.error('❌ Erreur affichage joueur:', error);
    }
  }, 500);
  
  console.log('⚡ === AFFICHAGE POKÉMON ADVERSAIRE (PIKACHU) ===');
  console.log('📋 Données adversaire:', testOpponentPokemon);
  
  // ✅ AFFICHER LE POKÉMON ADVERSAIRE AVEC DÉLAI
  setTimeout(() => {
    try {
      battleScene.displayOpponentPokemon(testOpponentPokemon);
      console.log('✅ Pokémon adversaire affiché');
    } catch (error) {
      console.error('❌ Erreur affichage adversaire:', error);
    }
  }, 1200);
  
  // ✅ DIAGNOSTICS APRÈS AFFICHAGE
  setTimeout(() => {
    console.log('🔍 === DIAGNOSTIC SPRITES APRÈS AFFICHAGE ===');
    
    // Debug Pokémon joueur
    if (battleScene.playerPokemonSprite) {
      const playerSprite = battleScene.playerPokemonSprite;
      console.log('🌱 Pokémon joueur:');
      console.log('  📍 Position:', { x: playerSprite.x, y: playerSprite.y });
      console.log('  👁️ Visibilité:', { visible: playerSprite.visible, alpha: playerSprite.alpha });
      console.log('  🖼️ Texture:', playerSprite.texture.key);
    } else {
      console.warn('⚠️ Aucun sprite joueur');
    }
    
    // Debug Pokémon adversaire  
    if (battleScene.opponentPokemonSprite) {
      const opponentSprite = battleScene.opponentPokemonSprite;
      console.log('⚡ Pokémon adversaire:');
      console.log('  📍 Position:', { x: opponentSprite.x, y: opponentSprite.y });
      console.log('  👁️ Visibilité:', { visible: opponentSprite.visible, alpha: opponentSprite.alpha });
      console.log('  🖼️ Texture:', opponentSprite.texture.key);
    } else {
      console.warn('⚠️ Aucun sprite adversaire');
    }
    
    // Debug HealthBarManager
    console.log('❤️ HealthBarManager:');
    console.log('  🔧 Initialisé:', !!battleScene.healthBarManager);
    if (battleScene.healthBarManager) {
      console.log('  👤 Barre joueur:', !!battleScene.healthBarManager.playerHealthBar);
      console.log('  👹 Barre adversaire:', !!battleScene.healthBarManager.opponentHealthBar);
    }
    
  }, 3500);
  
  // ✅ AFFICHAGE MENU D'ACTIONS
  setTimeout(() => {
    console.log('🎮 === AFFICHAGE MENU D\'ACTIONS ===');
    try {
      battleScene.showPlayerActionMenu();
      console.log('✅ Menu d\'actions affiché');
    } catch (error) {
      console.error('❌ Erreur affichage menu:', error);
    }
  }, 4000);
  
  console.log('🚀 Test combat complet lancé...');
  console.log('⏱️ Bulbasaur dans 0.5s, Pikachu dans 1.2s, menu dans 4s');
};

window.testPokemonForceDisplay = function() {
  console.log('🔥 === TEST FORÇAGE ULTIME POKÉMON ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // Diagnostic préalable
  battleScene.debugPokemonDisplay();
  
  // Activer scène avec force
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation forcée BattleScene...');
    window.game.scene.wake('BattleScene');
    window.game.scene.setVisible('BattleScene', true);
  }
  
  // Nettoyage
  battleScene.clearAllPokemonSprites();
  
  // Test data
  const testPokemon = {
    pokemonId: 1,
    id: 'test_bulbasaur_force',
    name: 'Bulbasaur FORCÉ',
    level: 5,
    currentHp: 18,
    maxHp: 20,
    types: ['grass', 'poison']
  };
  
  console.log('🌱 LANCEMENT AFFICHAGE FORCÉ...');
  battleScene.displayPlayerPokemon(testPokemon);
  
  // Vérifications multiples
  setTimeout(() => {
    console.log('🔍 Vérification 1s après...');
    battleScene.debugPokemonDisplay();
  }, 1000);
  
  setTimeout(() => {
    console.log('🔍 Vérification 3s après...');
    battleScene.debugPokemonDisplay();
  }, 3000);
};

// ✅ FORÇAGE MANUEL DEPUIS CONSOLE
window.forceShowPlayerSprite = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene?.playerPokemonSprite) {
    console.log('❌ Pas de sprite joueur à forcer');
    return;
  }
  
  const sprite = battleScene.playerPokemonSprite;
  console.log('🔧 FORÇAGE MANUEL SPRITE...');
  
  sprite.setVisible(true);
  sprite.setActive(true);
  sprite.setAlpha(1);
  sprite.setPosition(400, 300); // Position centre
  
  console.log('✅ Sprite forcé à visible au centre');
};

// Debug HealthBarManager
window.debugHealthBarManager = function() {
  console.log('🔍 === DEBUG HEALTHBARMANAGER ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    console.warn('⚠️ BattleScene non active');
    return;
  }
  
  console.log('🩺 HealthBarManager:', {
    exists: !!battleScene.healthBarManager,
    playerHealthBar: battleScene.healthBarManager?.playerHealthBar ? 'créée' : 'non créée',
    opponentHealthBar: battleScene.healthBarManager?.opponentHealthBar ? 'créée' : 'non créée'
  });
  
  if (battleScene.healthBarManager) {
    battleScene.healthBarManager.debugHealthBars();
  } else {
    console.error('❌ HealthBarManager non initialisé');
  }
  
  console.log('🔍 === FIN DEBUG HEALTHBARMANAGER ===');
};

console.log('✅ [BattleScene] Module MODULAIRE chargé avec HealthBarManager séparé !');
console.log('🩺 Fonctions de test modulaires:');
console.log('   window.testBattleWithHealthBarManager() - ✅ Test complet modulaire');
console.log('   window.testFullBattleWithHealthBarManager() - ✅ Cycle complet modulaire');
console.log('   window.testHealthBarManagerAnimations() - ✅ Test animations modulaires');
console.log('   window.debugHealthBarManager() - ✅ Debug HealthBarManager');
console.log('');
console.log('🎮 Contrôles manuels (délégués au HealthBarManager):');
console.log('   window.damagePlayer(5) - Infliger dégâts au joueur');
console.log('   window.damageOpponent(3) - Infliger dégâts à l\'adversaire');
console.log('   window.addExp(25) - Ajouter expérience');
console.log('   window.setStatus("player", "poison") - Changer statut');
console.log('');
console.log('🏗️ ARCHITECTURE MODULAIRE:');
console.log('   ✅ BattleScene.js - Gestion sprites et UI');
console.log('   ✅ HealthBarManager.js - Gestion barres de vie');
console.log('   ✅ Séparation des responsabilités');
console.log('   ✅ Code plus maintenable et organisé');
console.log('');
console.log('🚀 UTILISEZ: window.testBattleWithHealthBarManager() pour voir l\'architecture modulaire !');
