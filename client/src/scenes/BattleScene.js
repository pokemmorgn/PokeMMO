// client/src/scenes/BattleScene.js - VERSION CORRIGÉE utilisant UIManager élégamment

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    
    // Managers
    this.battleManager = null;
    this.gameManager = null;
    this.networkHandler = null;
    
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
    
    // ✅ ÉTAT UI PRÉCÉDENT pour restauration élégante
    this.previousUIState = null;
    
    // Positions des Pokémon (style Pokémon classique)
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.75 },      // 15% gauche, 75% bas (premier plan)
      opponent: { x: 0.75, y: 0.35 }     // 75% droite, 35% haut (arrière-plan)
    };
    
    console.log('⚔️ [BattleScene] Constructeur avec UIManager intégré');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('🔧 [BattleScene] Init avec data:', data);
    
    this.gameManager = data.gameManager || this.scene.get('GameScene')?.gameManager;
    this.networkHandler = data.networkHandler || this.scene.get('GameScene')?.networkHandler;
    
    if (!this.gameManager || !this.networkHandler) {
      console.warn('⚠️ [BattleScene] Managers partiellement manquants dans init');
    }
    
    console.log('✅ [BattleScene] Init terminé');
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
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // 1. Créer le background
      this.createBattleBackground();
      
      // 2. Calculer les positions
      this.createPokemonPositions();
      
      // 3. Setup managers et événements
      this.setupBasicBattleManager();
      this.setupBasicEvents();
      
      this.isActive = true;
      console.log('✅ [BattleScene] Scène créée - UIManager ready');
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === ✅ GESTION UI ÉLÉGANTE avec UIManager ===

  /**
   * ✅ NOUVELLE MÉTHODE: Activer le mode battle via UIManager
   */
  activateBattleUI() {
    console.log('🎮 [BattleScene] Activation UI battle via UIManager...');
    
    // ✅ Sauvegarder l'état actuel pour restauration
    if (window.pokemonUISystem) {
      this.previousUIState = {
        gameState: window.pokemonUISystem.globalState.currentGameState,
        timestamp: Date.now()
      };
      
      console.log('💾 [BattleScene] État UI sauvegardé:', this.previousUIState);
      
      try {
        // ✅ MÉTHODE ÉLÉGANTE: Utiliser le UIManager
        const success = window.pokemonUISystem.setGameState('battle', {
          animated: true,
          force: true
        });
        
        if (success) {
          console.log('✅ [BattleScene] Mode battle activé via UIManager');
          console.log('🎯 [BattleScene] QuestTracker automatiquement masqué');
          return true;
        } else {
          console.warn('⚠️ [BattleScene] Échec activation mode battle UIManager');
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

  /**
   * ✅ NOUVELLE MÉTHODE: Désactiver le mode battle via UIManager
   */
  deactivateBattleUI() {
    console.log('🔄 [BattleScene] Désactivation UI battle via UIManager...');
    
    if (window.pokemonUISystem && this.previousUIState) {
      try {
        // ✅ MÉTHODE ÉLÉGANTE: Restaurer l'état précédent
        const targetState = this.previousUIState.gameState || 'exploration';
        
        const success = window.pokemonUISystem.setGameState(targetState, {
          animated: true
        });
        
        if (success) {
          console.log(`✅ [BattleScene] État "${targetState}" restauré via UIManager`);
          console.log('🎯 [BattleScene] QuestTracker automatiquement restauré');
          
          // Nettoyer l'état sauvegardé
          this.previousUIState = null;
          return true;
        } else {
          console.warn('⚠️ [BattleScene] Échec restauration UIManager');
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

  /**
   * ✅ MÉTHODE FALLBACK: Si UIManager ne fonctionne pas
   */
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

  /**
   * ✅ MÉTHODE FALLBACK: Restauration manuelle
   */
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

  // === SPRITES POKÉMON (Code existant optimisé) ===

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

  // === BACKGROUND ET POSITIONS (Code existant) ===

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

  // === AFFICHAGE POKÉMON (Code existant optimisé) ===

  displayPlayerPokemon(pokemonData) {
    console.log('👤 [BattleScene] Affichage Pokémon joueur (9x9 frame 0):', pokemonData);
    
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
      
      const frameInfo = this.frameSizeCache.get(spriteKey);
      console.log(`✅ [BattleScene] Pokémon joueur affiché: ${pokemonData.name}`);
      console.log(`📊 [BattleScene] Sprite: ${spriteKey}, Frame: 0, Size: ${frameInfo?.frameWidth || '?'}x${frameInfo?.frameHeight || '?'}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon joueur:', error);
      this.createPokemonPlaceholder('player', pokemonData);
    }
  }

  displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire (9x9 frame 0):', pokemonData);
    
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
      
      const frameInfo = this.frameSizeCache.get(spriteKey);
      console.log(`✅ [BattleScene] Pokémon adversaire affiché: ${pokemonData.name}`);
      console.log(`📊 [BattleScene] Sprite: ${spriteKey}, Frame: 0, Size: ${frameInfo?.frameWidth || '?'}x${frameInfo?.frameHeight || '?'}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon adversaire:', error);
      this.createPokemonPlaceholder('opponent', pokemonData);
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

  // === ANIMATIONS (Code existant) ===

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

  // === ✅ MÉTHODES PUBLIQUES CORRIGÉES avec UIManager ===

  /**
   * ✅ CORRIGÉ: Gestion du début de rencontre avec UIManager
   */
  handleEncounterStart(encounterData) {
    console.log('🐾 [BattleScene] handleEncounterStart avec UIManager élégant:', encounterData);
    
    if (!this.isActive) {
      console.warn('⚠️ [BattleScene] Scène non active, activation...');
      if (this.scene && this.scene.wake) {
        this.scene.wake();
      }
    }
    
    // ✅ ÉTAPE 1: Activer l'UI de combat ÉLÉGAMMENT
    const uiActivated = this.activateBattleUI();
    if (uiActivated) {
      console.log('✅ [BattleScene] UI de combat activée via UIManager');
    } else {
      console.warn('⚠️ [BattleScene] Problème activation UI de combat');
    }
    
    // ÉTAPE 2: S'assurer que les positions sont calculées
    if (!this.pokemonPositions?.playerAbsolute) {
      this.createPokemonPositions();
    }
    
    // ÉTAPE 3: Afficher le Pokémon adversaire de la rencontre
    if (encounterData.pokemon) {
      console.log('👹 [BattleScene] Affichage Pokémon de la rencontre...');
      this.displayOpponentPokemon(encounterData.pokemon);
    }
    
    // ÉTAPE 4: Pokémon joueur par défaut si nécessaire
    if (!this.currentPlayerPokemon) {
      console.log('👤 [BattleScene] Affichage Pokémon joueur par défaut...');
      const defaultPlayerPokemon = {
        pokemonId: 4,
        id: 'player_charmander_default',
        name: 'Charmander',
        level: 5,
        currentHp: 18,
        maxHp: 18,
        types: ['fire']
      };
      this.displayPlayerPokemon(defaultPlayerPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Rencontre traitée avec UIManager élégant');
  }

  /**
   * ✅ CORRIGÉ: Démarrage combat avec UIManager
   */
  startBattle(battleData) {
    console.log('⚔️ [BattleScene] Démarrage combat avec UIManager:', battleData);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller scène si nécessaire
    if (this.scene && !this.scene.isActive()) {
      this.scene.wake();
    }
    
    // ✅ ÉTAPE 1: Activer l'UI de combat via UIManager
    const uiActivated = this.activateBattleUI();
    if (uiActivated) {
      console.log('✅ [BattleScene] UI de combat activée pour startBattle');
    }
    
    // ÉTAPE 2: Afficher les Pokémon avec frames 9x9
    if (battleData.playerPokemon) {
      this.displayPlayerPokemon(battleData.playerPokemon);
    }
    
    if (battleData.opponentPokemon) {
      this.displayOpponentPokemon(battleData.opponentPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Combat démarré avec UIManager élégant');
  }

  /**
   * ✅ CORRIGÉ: Masquage combat avec UIManager
   */
  hideBattle() {
    console.log('🖥️ [BattleScene] Masquage combat avec UIManager...');
    
    // ✅ ÉTAPE 1: Désactiver l'UI de combat ÉLÉGAMMENT
    const uiDeactivated = this.deactivateBattleUI();
    if (uiDeactivated) {
      console.log('✅ [BattleScene] UI de combat désactivée via UIManager');
    } else {
      console.warn('⚠️ [BattleScene] Problème désactivation UI de combat');
    }
    
    this.isVisible = false;
    
    // ÉTAPE 2: Mettre en veille la scène
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
    
    console.log('✅ [BattleScene] Combat masqué avec UIManager élégant');
  }

  /**
   * ✅ CORRIGÉ: Fin de combat avec restauration UI élégante
   */
  endBattle(battleResult = {}) {
    console.log('🏁 [BattleScene] Fin de combat avec UIManager:', battleResult);
    
    // ✅ ÉTAPE 1: Restaurer l'UI élégamment
    const uiRestored = this.deactivateBattleUI();
    if (uiRestored) {
      console.log('✅ [BattleScene] UI restaurée après fin de combat');
    }
    
    // ÉTAPE 2: Nettoyer les sprites
    this.clearAllPokemonSprites();
    
    // ÉTAPE 3: Masquer la scène
    this.hideBattle();
    
    console.log('✅ [BattleScene] Combat terminé avec UIManager élégant');
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
    this.textures.each((key, texture) => {
      if (key.includes('pokemon_')) {
        const size = texture.source[0];
        const frameInfo = this.frameSizeCache.get(key);
        
        pokemonTextures.push({
          key,
          size: `${size.width}x${size.height}`,
          frames: frameInfo?.totalFrames || 'inconnu',
          frameSize: frameInfo ? `${frameInfo.frameWidth}x${frameInfo.frameHeight}` : 'non calculé'
        });
      }
    });
    
    console.table(pokemonTextures);
    console.log('🔍 === FIN DEBUG TEXTURES ===');
  }

  debugCurrentSprites() {
    console.log('🔍 [BattleScene] === DEBUG SPRITES ACTUELS ===');
    
    if (this.playerPokemonSprite) {
      console.log('👤 Joueur:', {
        texture: this.playerPokemonSprite.texture.key,
        frame: this.playerPokemonSprite.frame.name,
        position: `${this.playerPokemonSprite.x}, ${this.playerPokemonSprite.y}`,
        scale: this.playerPokemonSprite.scale,
        visible: this.playerPokemonSprite.visible
      });
    }
    
    if (this.opponentPokemonSprite) {
      console.log('👹 Adversaire:', {
        texture: this.opponentPokemonSprite.texture.key,
        frame: this.opponentPokemonSprite.frame.name,
        position: `${this.opponentPokemonSprite.x}, ${this.opponentPokemonSprite.y}`,
        scale: this.opponentPokemonSprite.scale,
        visible: this.opponentPokemonSprite.visible
      });
    }
    
    // ✅ NOUVEAU: Debug état UI
    if (window.pokemonUISystem) {
      console.log('🎮 État UI actuel:', {
        gameState: window.pokemonUISystem.globalState.currentGameState,
        questTrackerVisible: window.pokemonUISystem.getModuleState('questTracker')?.visible,
        questTrackerEnabled: window.pokemonUISystem.getModuleState('questTracker')?.enabled
      });
    }
    
    console.log('🔍 === FIN DEBUG SPRITES ===');
  }

  // === MÉTHODES DE TEST AMÉLIORÉES ===

  /**
   * ✅ NOUVEAU: Test complet avec UIManager
   */
  testDisplayPokemonWithUIManager() {
    console.log('🧪 [BattleScene] Test sprites + UIManager...');
    
    // ✅ ÉTAPE 1: Activer l'UI de combat
    const uiActivated = this.activateBattleUI();
    console.log('🎮 [BattleScene] UI activée:', uiActivated);
    
    // ÉTAPE 2: Nettoyer et afficher
    this.clearAllPokemonSprites();
    
    const testPlayerPokemon = {
      pokemonId: 4,
      id: 'player_charmander_test',
      name: 'Charmander',
      level: 5,
      currentHp: 18,
      maxHp: 18,
      types: ['fire']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      id: 'wild_pikachu_test',
      name: 'Pikachu',
      level: 8,
      currentHp: 25,
      maxHp: 25,
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
    }, 2500);
    
    console.log('✅ [BattleScene] Test lancé avec UIManager');
  }

  /**
   * ✅ NOUVEAU: Test cycle complet combat
   */
  testFullBattleCycle() {
    console.log('🧪 [BattleScene] Test cycle complet combat...');
    
    // Étape 1: Démarrer combat
    console.log('1️⃣ Démarrage combat...');
    this.testDisplayPokemonWithUIManager();
    
    // Étape 2: Simuler fin de combat après 8 secondes
    setTimeout(() => {
      console.log('2️⃣ Simulation fin de combat...');
      this.endBattle({
        result: 'victory',
        rewards: { experience: 50, gold: 25 }
      });
    }, 8000);
    
    // Étape 3: Vérifier état final
    setTimeout(() => {
      console.log('3️⃣ Vérification état final...');
      this.debugCurrentSprites();
    }, 10000);
  }

  // === MÉTHODES DE BASE (temporaires) ===

  setupBasicBattleManager() {
    console.log('⚔️ [BattleScene] Setup BattleManager basique');
    // Version simplifiée pour focus sur UIManager et sprites
  }

  setupBasicEvents() {
    console.log('🔗 [BattleScene] Setup événements basiques');
    // Version simplifiée pour focus sur UIManager et sprites
  }

  // === NETTOYAGE FINAL ===

  destroy() {
    console.log('💀 [BattleScene] Destruction...');
    
    // ✅ ÉTAPE 1: Restaurer l'UI avant destruction
    if (this.previousUIState) {
      console.log('🔄 [BattleScene] Restauration UI avant destruction...');
      this.deactivateBattleUI();
    }
    
    // ÉTAPE 2: Nettoyer sprites
    this.clearAllPokemonSprites();
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    // ÉTAPE 3: Nettoyer cache
    this.frameSizeCache.clear();
    
    // ÉTAPE 4: Nettoyer état
    this.previousUIState = null;
    
    super.destroy();
    
    console.log('✅ [BattleScene] Détruite avec restauration UI');
  }
}

// ✅ FONCTIONS GLOBALES CORRIGÉES avec UIManager

// Fonction pour tester avec UIManager au lieu de hideAllUI
window.testBattleSpritesMagicUIManager = function() {
  console.log('🧪 === TEST SPRITES AVEC UIMANAGER ÉLÉGANT ===');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (!battleScene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // ✅ PAS DE hideAllUI() - Le UIManager s'en charge !
  console.log('🎮 Test sans hideAllUI() - UIManager gère tout !');
  
  // Activer la scène si nécessaire
  if (!window.game.scene.isActive('BattleScene')) {
    console.log('🎬 Activation BattleScene...');
    window.game.scene.start('BattleScene');
    
    setTimeout(() => {
      const activeBattleScene = window.game.scene.getScene('BattleScene');
      if (activeBattleScene) {
        activeBattleScene.testDisplayPokemonWithUIManager();
      }
    }, 500);
  } else {
    battleScene.testDisplayPokemonWithUIManager();
  }
  
  console.log('✅ Test élégant lancé - UIManager gère l\'UI automatiquement !');
};

// Test complet du cycle de combat
window.testFullBattleCycleUIManager = function() {
  console.log('🧪 === TEST CYCLE COMPLET AVEC UIMANAGER ===');
  
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
        activeBattleScene.testFullBattleCycle();
      }
    }, 500);
  } else {
    battleScene.testFullBattleCycle();
  }
  
  console.log('✅ Test cycle complet lancé avec UIManager !');
};

// Fonction pour tester spécifiquement le QuestTracker
window.testQuestTrackerHiding = function() {
  console.log('🧪 === TEST QUESTTRACKER HIDING ===');
  
  // 1. Vérifier état initial
  console.log('1️⃣ État initial:');
  window.debugUIState && window.debugUIState();
  
  // 2. Test mode battle
  console.log('\n2️⃣ Activation mode battle...');
  if (window.pokemonUISystem) {
    window.pokemonUISystem.setGameState('battle', { animated: true });
    
    setTimeout(() => {
      console.log('\n📊 État après mode battle:');
      window.debugUIState && window.debugUIState();
      
      // 3. Test restauration
      console.log('\n3️⃣ Restauration exploration...');
      window.pokemonUISystem.setGameState('exploration', { animated: true });
      
      setTimeout(() => {
        console.log('\n📊 État après restauration:');
        window.debugUIState && window.debugUIState();
      }, 1000);
      
    }, 1000);
  } else {
    console.error('❌ PokemonUISystem non trouvé');
  }
};

// Comparaison UIManager vs hideAllUI
window.compareUIManagerVsHideAll = function() {
  console.log('🧪 === COMPARAISON UIMANAGER vs hideAllUI ===');
  
  console.log('\n🎯 MÉTHODE ÉLÉGANTE (UIManager):');
  console.log('✅ window.pokemonUISystem.setGameState("battle")');
  console.log('✅ Gestion centralisée et responsive');
  console.log('✅ QuestTracker automatiquement géré');
  console.log('✅ Animations fluides');
  console.log('✅ Restauration garantie');
  
  console.log('\n❌ MÉTHODE PRIMITIVE (hideAllUI):');
  console.log('❌ Manipulation DOM directe');
  console.log('❌ Risque d\'oubli d\'éléments');
  console.log('❌ Pas de gestion des états');
  console.log('❌ Difficile à maintenir');
  
  console.log('\n🎯 CONCLUSION: UIManager est LARGEMENT supérieur !');
  
  // Test pratique
  console.log('\n🧪 Test pratique - regardez la console:');
  window.testQuestTrackerHiding();
};

// Debug spécialisé pour UIManager
window.debugUIManagerState = function() {
  console.log('🔍 === DEBUG UIMANAGER STATE ===');
  
  if (window.pokemonUISystem) {
    console.log('📊 État global:', window.pokemonUISystem.globalState);
    
    console.log('\n📋 États de jeu configurés:');
    Object.keys(window.pokemonUISystem.gameStates).forEach(stateName => {
      const state = window.pokemonUISystem.gameStates[stateName];
      console.log(`🔸 ${stateName}:`, {
        visible: state.visibleModules,
        hidden: state.hiddenModules,
        questTracker: {
          visible: state.visibleModules?.includes('questTracker'),
          hidden: state.hiddenModules?.includes('questTracker')
        }
      });
    });
    
    console.log('\n🎮 Modules:');
    ['inventory', 'team', 'quest', 'questTracker', 'chat'].forEach(moduleId => {
      const state = window.pokemonUISystem.getModuleState(moduleId);
      console.log(`🔸 ${moduleId}:`, state);
    });
    
  } else {
    console.error('❌ PokemonUISystem non trouvé');
  }
  
  console.log('🔍 === FIN DEBUG ===');
};

console.log('✅ [BattleScene] Module chargé avec UIManager élégant');
console.log('🎯 Fonctions de test avec UIManager:');
console.log('   window.testBattleSpritesMagicUIManager() - Test sprites + UIManager');
console.log('   window.testFullBattleCycleUIManager() - Test cycle complet');
console.log('   window.testQuestTrackerHiding() - Test QuestTracker uniquement');
console.log('   window.compareUIManagerVsHideAll() - Comparaison méthodes');
console.log('   window.debugUIManagerState() - Debug UIManager');
console.log('🚀 La BattleScene utilise maintenant le UIManager ÉLÉGAMMENT !');
console.log('🎮 Plus besoin de hideAllUI() - tout est automatique !');
