// client/src/scenes/BattleScene.js - VERSION MODULAIRE avec HealthBarManager

import { HealthBarManager } from '../managers/HealthBarManager.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.currentZone = null;
    
    // Managers
    this.battleManager = null;
    this.gameManager = null;
    this.networkHandler = null;
    this.healthBarManager = null; // ✅ NOUVEAU: Manager des barres de vie
    
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

  this.networkHandler = data.networkHandler
    || this.scene.get('GameScene')?.networkHandler
    || window.pokemonUISystem?.networkHandler
    || window.networkHandler;

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
    this.loadPokemonSpritesheets9x9();
    
    // Événement de completion pour debug
    this.load.on('complete', () => {
      console.log('✅ [BattleScene] Chargement sprites terminé');
      this.debugLoadedTextures();
    });
    
    console.log('✅ [BattleScene] Préchargement configuré avec calcul 9x9');
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène modulaire...');
    
    try {
      // 1. Créer le background
      this.createBattleBackground();
      
      // 2. Calculer les positions
      this.createPokemonPositions();
      
      // ✅ 3. NOUVEAU: Initialiser le HealthBarManager
      this.healthBarManager = new HealthBarManager(this);
      this.healthBarManager.createHealthBars();
      
      // 4. Setup managers et événements
      this.setupBasicBattleManager();
      this.setupBasicEvents();
      
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

  loadPokemonSpritesheets9x9() {
    console.log('🐾 [BattleScene] Chargement intelligent sprites 9x9...');
    
    const pokemonConfigs = [
      { id: 1, name: 'bulbasaur', commonSizes: [360, 405, 288] },
      { id: 4, name: 'charmander', commonSizes: [360, 405, 288] },
      { id: 7, name: 'squirtle', commonSizes: [360, 405, 288] },
      { id: 25, name: 'pikachu', commonSizes: [360, 576, 288] },
      { id: 39, name: 'jigglypuff', commonSizes: [288, 360] },
      { id: 52, name: 'meowth', commonSizes: [288, 360] },
      { id: 54, name: 'psyduck', commonSizes: [360, 405] },
      { id: 150, name: 'mewtwo', commonSizes: [576, 720] }
    ];
    
    pokemonConfigs.forEach(pokemon => {
      this.loadPokemonWithMultipleSizes(pokemon);
    });
    
    this.loadPlaceholderSprites();
    
    console.log(`✅ [BattleScene] ${pokemonConfigs.length} Pokémon configurés pour chargement 9x9`);
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
    console.log('👤 [BattleScene] Affichage Pokémon joueur avec HealthBarManager:', pokemonData);
    
    if (!this.pokemonPositions?.playerAbsolute) {
      this.createPokemonPositions();
    }
    
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (!pokemonData) return;
    
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'back');
    
    try {
      this.playerPokemonSprite = this.add.sprite(
        this.pokemonPositions.playerAbsolute.x,
        this.pokemonPositions.playerAbsolute.y,
        spriteKey,
        0  // Frame 0 pour spritesheet 9x9
      );
      
      if (!this.playerPokemonSprite.texture || this.playerPokemonSprite.texture.key === '__MISSING') {
        throw new Error(`Texture manquante pour ${spriteKey}`);
      }
      
      this.playerPokemonSprite.setScale(2.8);
      this.playerPokemonSprite.setDepth(20);
      this.playerPokemonSprite.setOrigin(0.5, 1);
      
      this.playerPokemonSprite.setData('isPokemon', true);
      this.playerPokemonSprite.setData('pokemonType', 'player');
      this.playerPokemonSprite.setData('pokemonId', pokemonData.pokemonId);
      
      this.animatePokemonEntry(this.playerPokemonSprite, 'left');
      this.currentPlayerPokemon = pokemonData;
      
      // ✅ NOUVEAU: Utiliser HealthBarManager
      setTimeout(() => {
        if (this.healthBarManager) {
          this.healthBarManager.updatePlayerHealthBar(pokemonData);
        }
      }, 800);
      
      console.log(`✅ [BattleScene] Pokémon joueur affiché avec HealthBarManager: ${pokemonData.name}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon joueur:', error);
      this.createPokemonPlaceholder('player', pokemonData);
      
      // Barre de vie même pour placeholder
      setTimeout(() => {
        if (this.healthBarManager) {
          this.healthBarManager.updatePlayerHealthBar(pokemonData);
        }
      }, 800);
    }
  }

  displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire avec HealthBarManager:', pokemonData);
    
    if (!this.pokemonPositions?.opponentAbsolute) {
      this.createPokemonPositions();
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    if (!pokemonData) return;
    
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'front');
    
    try {
      this.opponentPokemonSprite = this.add.sprite(
        this.pokemonPositions.opponentAbsolute.x,
        this.pokemonPositions.opponentAbsolute.y,
        spriteKey,
        0  // Frame 0 pour spritesheet 9x9
      );
      
      if (!this.opponentPokemonSprite.texture || this.opponentPokemonSprite.texture.key === '__MISSING') {
        throw new Error(`Texture manquante pour ${spriteKey}`);
      }
      
      this.opponentPokemonSprite.setScale(2.2);
      this.opponentPokemonSprite.setDepth(15);
      this.opponentPokemonSprite.setOrigin(0.5, 1);
      
      this.opponentPokemonSprite.setData('isPokemon', true);
      this.opponentPokemonSprite.setData('pokemonType', 'opponent');
      this.opponentPokemonSprite.setData('pokemonId', pokemonData.pokemonId);
      
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentPokemonSprite);
      }
      
      this.animatePokemonEntry(this.opponentPokemonSprite, 'right');
      this.currentOpponentPokemon = pokemonData;
      
      // ✅ NOUVEAU: Utiliser HealthBarManager
      setTimeout(() => {
        if (this.healthBarManager) {
          this.healthBarManager.updateOpponentHealthBar(pokemonData);
        }
      }, 1200);
      
      console.log(`✅ [BattleScene] Pokémon adversaire affiché avec HealthBarManager: ${pokemonData.name}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon adversaire:', error);
      this.createPokemonPlaceholder('opponent', pokemonData);
      
      // Barre de vie même pour placeholder
      setTimeout(() => {
        if (this.healthBarManager) {
          this.healthBarManager.updateOpponentHealthBar(pokemonData);
        }
      }, 1200);
    }
  }

  getPokemonSpriteKey(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId}_${view}`;
    
    if (this.textures.exists(spriteKey)) {
      const texture = this.textures.get(spriteKey);
      console.log(`✅ [BattleScene] Sprite trouvé: ${spriteKey} (${texture.source[0].width}x${texture.source[0].height})`);
      return spriteKey;
    } else {
      console.warn(`⚠️ [BattleScene] Sprite manquant: ${spriteKey}, fallback placeholder`);
      
      const placeholderKey = `pokemon_placeholder_${view}`;
      if (this.textures.exists(placeholderKey)) {
        return placeholderKey;
      } else {
        return this.textures.exists('pokemon_placeholder_front') ? 
          'pokemon_placeholder_front' : '__DEFAULT';
      }
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
    if (!sprite) return;
    
    const originalX = sprite.x;
    const originalY = sprite.y;
    
    const startX = direction === 'left' ? -150 : this.cameras.main.width + 150;
    sprite.setPosition(startX, originalY + 50);
    sprite.setAlpha(0);
    sprite.setScale(sprite.scaleX * 0.5);
    
    this.tweens.add({
      targets: sprite,
      x: originalX,
      y: originalY,
      alpha: 1,
      scaleX: sprite.scaleX * 2,
      scaleY: sprite.scaleY * 2,
      duration: 1000,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          y: originalY + 8,
          duration: 300,
          yoyo: true,
          ease: 'Bounce.easeOut'
        });
      }
    });
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
    console.log('🐾 [BattleScene] handleEncounterStart avec HealthBarManager:', encounterData);
    
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
    
    // Afficher le Pokémon adversaire de la rencontre
    if (encounterData.pokemon) {
      console.log('👹 [BattleScene] Affichage Pokémon de la rencontre...');
      this.displayOpponentPokemon(encounterData.pokemon);
    }
    
    // Pokémon joueur par défaut si nécessaire
    if (!this.currentPlayerPokemon) {
      console.log('👤 [BattleScene] Affichage Pokémon joueur par défaut...');
      const defaultPlayerPokemon = {
        pokemonId: 4,
        id: 'player_charmander_default',
        name: 'Charmander',
        level: 5,
        currentHp: 15,
        maxHp: 18,
        currentExp: 45,
        expToNext: 100,
        statusCondition: 'normal',
        types: ['fire']
      };
      this.displayPlayerPokemon(defaultPlayerPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Rencontre traitée avec HealthBarManager');
  }

  startBattle(battleData) {
    console.log('⚔️ [BattleScene] Démarrage combat avec HealthBarManager:', battleData);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller scène si nécessaire
    if (this.scene && !this.scene.isActive()) {
      this.scene.wake();
    }
    
    // Activer l'UI de combat via UIManager
    const uiActivated = this.activateBattleUI();
    if (uiActivated) {
      console.log('✅ [BattleScene] UI de combat activée pour startBattle');
    }
    
    // Afficher les Pokémon avec HealthBarManager
    if (battleData.playerPokemon) {
      this.displayPlayerPokemon(battleData.playerPokemon);
    }
    
    if (battleData.opponentPokemon) {
      this.displayOpponentPokemon(battleData.opponentPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Combat démarré avec HealthBarManager');
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

  /**
   * Test cycle complet combat avec HealthBarManager
   */
  testFullBattleCycleWithHealthBarManager() {
    console.log('🧪 [BattleScene] Test cycle complet avec HealthBarManager modulaire...');
    
    // Étape 1: Démarrer combat
    console.log('1️⃣ Démarrage combat...');
    this.testDisplayPokemonWithHealthBarManager();
    
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

// Fonction principale de test avec HealthBarManager modulaire
window.testBattleWithHealthBarManager = function() {
  console.log('🧪 === TEST COMPLET AVEC HEALTHBARMANAGER MODULAIRE ===');
  
  // Diagnostic préalable
  console.log('🏥 Diagnostic UIManager...');
  const uiOK = window.diagnosticUIManager && window.diagnosticUIManager();
  
  if (!uiOK) {
    console.error('❌ UIManager non fonctionnel - utilisez diagnosticUIManager() pour plus d\'infos');
    return false;
  }
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return false;
  }
  
  console.log('🩺 Test avec HealthBarManager modulaire !');
  
  // Activer la scène si nécessaire
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.start('BattleScene');
    
    setTimeout(() => {
      const activeBattleScene = window.game.scene.getScene('BattleScene');
      if (activeBattleScene && activeBattleScene.testDisplayPokemonWithHealthBarManager) {
        activeBattleScene.testDisplayPokemonWithHealthBarManager();
      } else {
        console.error('❌ testDisplayPokemonWithHealthBarManager non disponible');
      }
    }, 500);
  } else {
    if (battleScene.testDisplayPokemonWithHealthBarManager) {
      battleScene.testDisplayPokemonWithHealthBarManager();
    } else {
      console.error('❌ testDisplayPokemonWithHealthBarManager non disponible');
    }
  }
  
  console.log('✅ Test HealthBarManager modulaire lancé !');
  return true;
};

// Test cycle complet avec HealthBarManager modulaire
window.testFullBattleWithHealthBarManager = function() {
  console.log('🧪 === TEST CYCLE COMPLET AVEC HEALTHBARMANAGER MODULAIRE ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  if (!window.game.scene.isActive('BattleScene')) {
    window.game.scene.start('BattleScene');
    setTimeout(() => {
      const activeBattleScene = window.game.scene.getScene('BattleScene');
      if (activeBattleScene) {
        activeBattleScene.testFullBattleCycleWithHealthBarManager();
      }
    }, 500);
  } else {
    battleScene.testFullBattleCycleWithHealthBarManager();
  }
  
  console.log('✅ Test cycle complet HealthBarManager modulaire lancé !');
};

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

window.setStatus = function(target = 'player', status = 'poison') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && window.game.scene.isActive('BattleScene')) {
    const result = battleScene.changeStatus(target, status);
    console.log(`🔮 Statut ${target}: ${result}`);
  } else {
    console.warn('⚠️ BattleScene non active');
  }
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

activateBattleUI() {
  console.log('🎮 [BattleScene] Activation UI battle avec QuestTracker...');
  
  // Sauvegarder l'état UI précédent
  this.previousUIState = {
    gameState: window.pokemonUISystem?.currentGameState || 'exploration',
    questTrackerVisible: this.isQuestTrackerVisible(),
    timestamp: Date.now()
  };
  
  console.log('💾 [BattleScene] État UI sauvegardé:', this.previousUIState);
  
  // ✅ MÉTHODE 1: Via UIManager (prioritaire)
  if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
    try {
      const success = window.pokemonUISystem.setGameState('battle', {
        animated: true,
        force: true
      });
      
      if (success) {
        console.log('✅ [BattleScene] Mode battle activé via UIManager');
        
        // Double-vérification QuestTracker
        setTimeout(() => {
          if (this.isQuestTrackerVisible()) {
            console.log('⚠️ [BattleScene] QuestTracker encore visible, masquage manuel...');
            this.forceHideQuestTracker();
          }
        }, 200);
        
        return true;
      }
    } catch (error) {
      console.error('❌ [BattleScene] Erreur UIManager:', error);
    }
  }
  
  // ✅ MÉTHODE 2: Masquage manuel si UIManager échoue
  console.log('🔧 [BattleScene] Fallback: masquage manuel du QuestTracker...');
  return this.forceHideQuestTracker();
}

/**
 * ✅ NOUVELLE MÉTHODE: Désactivation UI battle avec restauration QuestTracker
 */
deactivateBattleUI() {
  console.log('🔄 [BattleScene] Désactivation UI battle et restauration QuestTracker...');
  
  if (!this.previousUIState) {
    console.warn('⚠️ [BattleScene] Pas d\'état précédent sauvegardé');
    this.previousUIState = { gameState: 'exploration', questTrackerVisible: true };
  }
  
  // ✅ MÉTHODE 1: Via UIManager (prioritaire)
  if (window.pokemonUISystem && window.pokemonUISystem.setGameState) {
    try {
      const targetState = this.previousUIState.gameState || 'exploration';
      const success = window.pokemonUISystem.setGameState(targetState, {
        animated: true
      });
      
      if (success) {
        console.log(`✅ [BattleScene] État "${targetState}" restauré via UIManager`);
        
        // Restaurer QuestTracker si il était visible
        if (this.previousUIState.questTrackerVisible) {
          setTimeout(() => {
            if (!this.isQuestTrackerVisible()) {
              console.log('🔄 [BattleScene] Restauration manuelle QuestTracker...');
              this.forceShowQuestTracker();
            }
          }, 200);
        }
        
        this.previousUIState = null;
        return true;
      }
    } catch (error) {
      console.error('❌ [BattleScene] Erreur restauration UIManager:', error);
    }
  }
  
  // ✅ MÉTHODE 2: Restauration manuelle si UIManager échoue
  console.log('🔧 [BattleScene] Fallback: restauration manuelle...');
  if (this.previousUIState.questTrackerVisible) {
    this.forceShowQuestTracker();
  }
  
  this.previousUIState = null;
  return true;
}

/**
 * ✅ MÉTHODE UTILITAIRE: Vérifier si QuestTracker est visible
 */
isQuestTrackerVisible() {
  const elements = document.querySelectorAll('#questTracker, #quest-tracker, .quest-tracker');
  
  if (elements.length === 0) {
    return false; // Pas d'élément trouvé
  }
  
  // Vérifier si au moins un élément est réellement visible
  const visibleElements = Array.from(elements).filter(el => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           parseInt(style.top || '0') > -1000;
  });
  
  const isVisible = visibleElements.length > 0;
  console.log(`👁️ [BattleScene] QuestTracker visible: ${isVisible} (${elements.length} total, ${visibleElements.length} visibles)`);
  
  return isVisible;
}

/**
 * ✅ MÉTHODE UTILITAIRE: Masquage forcé QuestTracker
 */
forceHideQuestTracker() {
  console.log('🫥 [BattleScene] Masquage forcé QuestTracker...');
  
  // ✅ MÉTHODE 1: Via UIManager (plus propre)
  if (window.pokemonUISystem && window.pokemonUISystem.hideModule) {
    try {
      const result = window.pokemonUISystem.hideModule('questTracker');
      console.log('📤 [BattleScene] hideModule résultat:', result);
      
      // Vérifier que ça a marché
      setTimeout(() => {
        if (!this.isQuestTrackerVisible()) {
          console.log('✅ [BattleScene] QuestTracker masqué via UIManager');
          return true;
        } else {
          console.log('⚠️ [BattleScene] UIManager insuffisant, méthode brutale...');
          this.brutalHideQuestTracker();
        }
      }, 100);
      
      return result;
    } catch (error) {
      console.error('❌ [BattleScene] Erreur UIManager hideModule:', error);
    }
  }
  
  // ✅ MÉTHODE 2: Méthode brutale (fallback)
  return this.brutalHideQuestTracker();
}

/**
 * ✅ MÉTHODE UTILITAIRE: Masquage brutal QuestTracker (méthode qui a marché en console)
 */
brutalHideQuestTracker() {
  console.log('🔨 [BattleScene] Masquage brutal QuestTracker...');
  
  const selectors = ['#questTracker', '#quest-tracker', '.quest-tracker', '.questTracker'];
  let elementsHidden = 0;
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Stocker pour restauration
      el.setAttribute('data-battle-hidden', 'true');
      el.setAttribute('data-original-parent', el.parentNode?.tagName || 'unknown');
      el.setAttribute('data-original-display', getComputedStyle(el).display);
      
      // Stocker dans une liste globale pour restauration
      if (!window._battleHiddenElements) {
        window._battleHiddenElements = [];
      }
      window._battleHiddenElements.push({
        element: el,
        originalParent: el.parentNode,
        nextSibling: el.nextSibling,
        selector: selector
      });
      
      // Suppression du DOM (méthode qui a marché)
      el.remove();
      elementsHidden++;
      
      console.log(`🗑️ [BattleScene] QuestTracker supprimé:`, el);
    });
  });
  
  if (elementsHidden > 0) {
    console.log(`✅ [BattleScene] ${elementsHidden} QuestTracker(s) masqué(s) brutalement`);
    return true;
  } else {
    console.log('ℹ️ [BattleScene] Aucun QuestTracker trouvé à masquer');
    return false;
  }
}

/**
 * ✅ MÉTHODE UTILITAIRE: Restauration forcée QuestTracker
 */
forceShowQuestTracker() {
  console.log('👁️ [BattleScene] Restauration forcée QuestTracker...');
  
  // ✅ MÉTHODE 1: Via UIManager (plus propre)
  if (window.pokemonUISystem && window.pokemonUISystem.showModule) {
    try {
      const result = window.pokemonUISystem.showModule('questTracker');
      console.log('📤 [BattleScene] showModule résultat:', result);
      
      // Vérifier que ça a marché
      setTimeout(() => {
        if (this.isQuestTrackerVisible()) {
          console.log('✅ [BattleScene] QuestTracker restauré via UIManager');
          return true;
        } else {
          console.log('⚠️ [BattleScene] UIManager insuffisant, restauration brutale...');
          this.brutalShowQuestTracker();
        }
      }, 100);
      
      return result;
    } catch (error) {
      console.error('❌ [BattleScene] Erreur UIManager showModule:', error);
    }
  }
  
  // ✅ MÉTHODE 2: Restauration brutale (fallback)
  return this.brutalShowQuestTracker();
}

/**
 * ✅ MÉTHODE UTILITAIRE: Restauration brutale QuestTracker
 */
brutalShowQuestTracker() {
  console.log('🔨 [BattleScene] Restauration brutale QuestTracker...');
  
  let elementsRestored = 0;
  
  // Restaurer depuis la liste stockée
  if (window._battleHiddenElements) {
    const questTrackerElements = window._battleHiddenElements.filter(item => 
      item.selector && item.selector.includes('quest')
    );
    
    questTrackerElements.forEach(item => {
      if (item.originalParent && item.element) {
        try {
          // Restaurer à la position originale
          if (item.nextSibling && item.nextSibling.parentNode === item.originalParent) {
            item.originalParent.insertBefore(item.element, item.nextSibling);
          } else {
            item.originalParent.appendChild(item.element);
          }
          
          // Nettoyer les attributs
          item.element.removeAttribute('data-battle-hidden');
          item.element.removeAttribute('data-original-parent');
          item.element.removeAttribute('data-original-display');
          
          elementsRestored++;
          console.log(`🔄 [BattleScene] QuestTracker restauré:`, item.element);
        } catch (error) {
          console.error(`❌ [BattleScene] Erreur restauration:`, error);
        }
      }
    });
    
    // Nettoyer la liste
    window._battleHiddenElements = window._battleHiddenElements.filter(item => 
      !item.selector || !item.selector.includes('quest')
    );
  }
  
  // Alternative: restaurer via les attributs data-battle-hidden
  const hiddenElements = document.querySelectorAll('[data-battle-hidden="true"]');
  hiddenElements.forEach(el => {
    el.style.display = '';
    el.removeAttribute('data-battle-hidden');
    elementsRestored++;
    console.log(`🔄 [BattleScene] Élément restauré via attribut:`, el);
  });
  
  if (elementsRestored > 0) {
    console.log(`✅ [BattleScene] ${elementsRestored} QuestTracker(s) restauré(s) brutalement`);
    return true;
  } else {
    console.log('ℹ️ [BattleScene] Aucun QuestTracker trouvé à restaurer');
    return false;
  }
}

/**
 * ✅ MÉTHODE DE DEBUG: État complet QuestTracker
 */
debugQuestTrackerState() {
  console.log('🔍 [BattleScene] === DEBUG QUESTTRACKER ===');
  
  const elements = document.querySelectorAll('#questTracker, #quest-tracker, .quest-tracker');
  console.log(`📊 Total éléments: ${elements.length}`);
  
  elements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`  ${i+1}. ID: "${el.id}", Classes: "${el.className}"`);
    console.log(`     Display: ${style.display}`);
    console.log(`     Visibility: ${style.visibility}`);
    console.log(`     Opacity: ${style.opacity}`);
    console.log(`     Position: ${style.position}`);
    console.log(`     Top: ${style.top}`);
    console.log(`     Hidden by: ${el.getAttribute('data-battle-hidden')}`);
  });
  
  console.log(`👁️ Est visible: ${this.isQuestTrackerVisible()}`);
  console.log(`💾 État précédent:`, this.previousUIState);
  console.log(`🗑️ Éléments stockés:`, window._battleHiddenElements?.length || 0);
  
  return {
    totalElements: elements.length,
    visible: this.isQuestTrackerVisible(),
    previousState: this.previousUIState,
    storedElements: window._battleHiddenElements?.length || 0
  };
}

// ✅ FONCTIONS GLOBALES DE TEST
window.testBattleQuestTracker = function() {
  console.log('🧪 === TEST QUESTTRACKER DANS BATTLE ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return false;
  }
  
  // Ajouter les méthodes si elles n'existent pas
  if (!battleScene.isQuestTrackerVisible) {
    console.log('🔧 Ajout des méthodes QuestTracker à BattleScene...');
    
    // Copier toutes les nouvelles méthodes
    battleScene.isQuestTrackerVisible = window.BattleScene_isQuestTrackerVisible;
    battleScene.forceHideQuestTracker = window.BattleScene_forceHideQuestTracker;
    battleScene.brutalHideQuestTracker = window.BattleScene_brutalHideQuestTracker;
    battleScene.forceShowQuestTracker = window.BattleScene_forceShowQuestTracker;
    battleScene.brutalShowQuestTracker = window.BattleScene_brutalShowQuestTracker;
    battleScene.debugQuestTrackerState = window.BattleScene_debugQuestTrackerState;
    battleScene.activateBattleUI = window.BattleScene_activateBattleUI;
    battleScene.deactivateBattleUI = window.BattleScene_deactivateBattleUI;
  }
  
  console.log('📊 État initial:');
  battleScene.debugQuestTrackerState();
  
  console.log('\n🫥 Test masquage...');
  battleScene.activateBattleUI();
  
  setTimeout(() => {
    console.log('\n📊 Après masquage:');
    battleScene.debugQuestTrackerState();
    
    console.log('\n👁️ Test restauration...');
    battleScene.deactivateBattleUI();
    
    setTimeout(() => {
      console.log('\n📊 Après restauration:');
      battleScene.debugQuestTrackerState();
    }, 1000);
  }, 1000);
  
  return true;
};

// ✅ EXPOSER LES MÉTHODES DANS WINDOW POUR INJECTION
window.BattleScene_isQuestTrackerVisible = isQuestTrackerVisible;
window.BattleScene_forceHideQuestTracker = forceHideQuestTracker;
window.BattleScene_brutalHideQuestTracker = brutalHideQuestTracker;
window.BattleScene_forceShowQuestTracker = forceShowQuestTracker;
window.BattleScene_brutalShowQuestTracker = brutalShowQuestTracker;
window.BattleScene_debugQuestTrackerState = debugQuestTrackerState;
window.BattleScene_activateBattleUI = activateBattleUI;
window.BattleScene_deactivateBattleUI = deactivateBattleUI;

console.log('✅ [BattleScene] Méthodes QuestTracker disponibles');
console.log('🧪 Test: window.testBattleQuestTracker()');

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
