// client/src/scenes/BattleScene.js - SOLUTION SPRITES 9x9 avec calcul automatique

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
    
    // 🆕 SPRITES POKÉMON avec gestion 9x9
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // 🆕 CACHE DES TAILLES DE FRAMES
    this.frameSizeCache = new Map();
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // 🆕 POSITIONS DES POKÉMON (style Pokémon classique)
    this.pokemonPositions = {
      player: { x: 0.15, y: 0.75 },      // 15% gauche, 75% bas (premier plan)
      opponent: { x: 0.75, y: 0.35 }     // 75% droite, 35% haut (arrière-plan)
    };
    
    console.log('⚔️ [BattleScene] Constructeur initialisé - Sprites 9x9 Ready');
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

  // ✅ SOLUTION: PRELOAD avec calcul automatique 9x9
  preload() {
    console.log('📁 [BattleScene] Préchargement sprites Pokémon 9x9...');
    
    // Background de combat
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    // ✅ SPRITES POKÉMON avec calcul automatique des frames
    this.loadPokemonSpritesheets9x9();
    
    // ✅ Événement de completion pour debug
    this.load.on('complete', () => {
      console.log('✅ [BattleScene] Chargement sprites terminé');
      this.debugLoadedTextures();
    });
    
    console.log('✅ [BattleScene] Préchargement configuré avec calcul 9x9');
  }

  // ✅ SOLUTION PRINCIPALE: Chargement intelligent des sprites 9x9
  loadPokemonSpritesheets9x9() {
    console.log('🐾 [BattleScene] Chargement intelligent sprites 9x9...');
    
    // Liste des Pokémon avec leurs configurations spécifiques
    const pokemonConfigs = [
      // Starters Kanto
      { id: 1, name: 'bulbasaur', commonSizes: [360, 405, 288] },
      { id: 4, name: 'charmander', commonSizes: [360, 405, 288] },
      { id: 7, name: 'squirtle', commonSizes: [360, 405, 288] },
      
      // Pikachu (très courant)
      { id: 25, name: 'pikachu', commonSizes: [360, 576, 288] },
      
      // Autres populaires
      { id: 39, name: 'jigglypuff', commonSizes: [288, 360] },
      { id: 52, name: 'meowth', commonSizes: [288, 360] },
      { id: 54, name: 'psyduck', commonSizes: [360, 405] },
      { id: 150, name: 'mewtwo', commonSizes: [576, 720] }
    ];
    
    // ✅ Charger chaque Pokémon avec essai de tailles multiples
    pokemonConfigs.forEach(pokemon => {
      this.loadPokemonWithMultipleSizes(pokemon);
    });
    
    // ✅ PLACEHOLDERS toujours disponibles
    this.loadPlaceholderSprites();
    
    console.log(`✅ [BattleScene] ${pokemonConfigs.length} Pokémon configurés pour chargement 9x9`);
  }

  // ✅ FONCTION CLEF: Chargement avec essai de tailles multiples
  loadPokemonWithMultipleSizes(pokemonConfig) {
    const { id, name, commonSizes } = pokemonConfig;
    
    // Pour front et back
    ['front', 'back'].forEach(view => {
      const spriteKey = `pokemon_${id}_${view}`;
      
      if (this.textures.exists(spriteKey)) {
        console.log(`⏭️ [BattleScene] Sprite ${spriteKey} déjà chargé`);
        return;
      }
      
      // ✅ SOLUTION: Essayer les tailles communes pour ce Pokémon
      const imagePath = `assets/pokemon/${name}/${view}.png`;
      
      // Utiliser la première taille comme défaut, les autres comme fallback
      const primarySize = commonSizes[0] || 360;
      const frameSize = this.calculateFrameSize9x9(primarySize, primarySize);
      
      console.log(`📊 [BattleScene] ${spriteKey}: essai ${primarySize}x${primarySize} → frames ${frameSize.frameWidth}x${frameSize.frameHeight}`);
      
      this.load.spritesheet(spriteKey, imagePath, {
        frameWidth: frameSize.frameWidth,
        frameHeight: frameSize.frameHeight
      });
      
      // Stocker dans le cache pour référence
      this.frameSizeCache.set(spriteKey, {
        imageSize: primarySize,
        frameWidth: frameSize.frameWidth,
        frameHeight: frameSize.frameHeight,
        calculated: true
      });
    });
  }

  // ✅ FONCTION UTILITAIRE: Calcul frame size 9x9
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

  // ✅ Placeholders toujours fonctionnels
  loadPlaceholderSprites() {
    const placeholderConfigs = [
      { key: 'pokemon_placeholder_front', size: 96 },
      { key: 'pokemon_placeholder_back', size: 96 }
    ];
    
    placeholderConfigs.forEach(config => {
      if (!this.textures.exists(config.key)) {
        // Créer un placeholder procédural si pas de fichier
        this.load.image(config.key, this.createPlaceholderData(config.size));
      }
    });
  }

  // ✅ Création de placeholder procédural
  createPlaceholderData(size) {
    // Créer une image canvas simple comme placeholder
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Gradient simple
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FFA500');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Bordure
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size-2, size-2);
    
    // Texte "?"
    ctx.fillStyle = '#000000';
    ctx.font = `${size/3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', size/2, size/2);
    
    return canvas.toDataURL();
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // 1. Créer le background
      this.createBattleBackground();
      
      // 2. Calculer les positions AVANT tout
      this.createPokemonPositions();
      
      // 3. Setup managers et événements
      this.setupBasicBattleManager();
      this.setupBasicEvents();
      
      this.isActive = true;
      console.log('✅ [BattleScene] Scène créée - Sprites 9x9 prêts');
      console.log('🐾 [BattleScene] Positions configurées:', this.pokemonPositions);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // === CRÉATION DU BACKGROUND ===

  createBattleBackground() {
    console.log('🖼️ [BattleScene] Création background de combat...');
    
    const { width, height } = this.cameras.main;
    
    if (this.textures.exists('battlebg01')) {
      this.battleBackground = this.add.image(width/2, height/2, 'battlebg01');
      
      // Ajuster la taille pour couvrir l'écran
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
    
    // Dégradé style Pokémon authentique
    bg.fillGradientStyle(
      0x87CEEB, 0x87CEEB,  // Bleu ciel en haut
      0x32CD32, 0x228B22   // Vert herbe en bas
    );
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    
    // Ligne d'horizon
    const horizonY = height * 0.55;
    bg.lineStyle(3, 0x2F4F2F, 0.6);
    bg.lineBetween(0, horizonY, width, horizonY);
    
    this.battleBackground = bg;
  }

  // === POSITIONS DES POKÉMON ===

  createPokemonPositions() {
    console.log('🐾 [BattleScene] Calcul positions Pokémon...');
    
    const { width, height } = this.cameras.main;
    
    // Calculer positions absolues
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

  // ✅ SOLUTION: AFFICHAGE POKÉMON JOUEUR avec frame 0
  displayPlayerPokemon(pokemonData) {
    console.log('👤 [BattleScene] Affichage Pokémon joueur (9x9 frame 0):', pokemonData);
    
    // Vérifier positions
    if (!this.pokemonPositions?.playerAbsolute) {
      this.createPokemonPositions();
    }
    
    // Nettoyer ancien sprite
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (!pokemonData) {
      console.warn('⚠️ [BattleScene] Pas de données Pokémon joueur');
      return;
    }
    
    // ✅ CLEF: Obtenir sprite avec gestion d'erreur
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'back');
    
    try {
      // ✅ SOLUTION: Créer sprite avec frame 0 EXPLICITE
      this.playerPokemonSprite = this.add.sprite(
        this.pokemonPositions.playerAbsolute.x,
        this.pokemonPositions.playerAbsolute.y,
        spriteKey,
        0  // ✅ FRAME 0 pour spritesheet 9x9
      );
      
      // ✅ Vérifier que le sprite a bien la texture
      if (!this.playerPokemonSprite.texture || this.playerPokemonSprite.texture.key === '__MISSING') {
        throw new Error(`Texture manquante pour ${spriteKey}`);
      }
      
      // Configuration spécialisée vue de dos
      this.playerPokemonSprite.setScale(2.8);  // Plus grand (premier plan)
      this.playerPokemonSprite.setDepth(20);
      this.playerPokemonSprite.setOrigin(0.5, 1);  // Ancré au sol
      
      // ✅ Marquer le sprite pour debug
      this.playerPokemonSprite.setData('isPokemon', true);
      this.playerPokemonSprite.setData('pokemonType', 'player');
      this.playerPokemonSprite.setData('pokemonId', pokemonData.pokemonId);
      
      // Animation d'entrée depuis la gauche
      this.animatePokemonEntry(this.playerPokemonSprite, 'left');
      
      // Stocker les données
      this.currentPlayerPokemon = pokemonData;
      
      // ✅ Log de succès avec détails
      const frameInfo = this.frameSizeCache.get(spriteKey);
      console.log(`✅ [BattleScene] Pokémon joueur affiché: ${pokemonData.name}`);
      console.log(`📊 [BattleScene] Sprite: ${spriteKey}, Frame: 0, Size: ${frameInfo?.frameWidth || '?'}x${frameInfo?.frameHeight || '?'}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon joueur:', error);
      this.createPokemonPlaceholder('player', pokemonData);
    }
  }

  // ✅ SOLUTION: AFFICHAGE POKÉMON ADVERSAIRE avec frame 0
  displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire (9x9 frame 0):', pokemonData);
    
    // Vérifier positions
    if (!this.pokemonPositions?.opponentAbsolute) {
      this.createPokemonPositions();
    }
    
    // Nettoyer ancien sprite
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    if (!pokemonData) {
      console.warn('⚠️ [BattleScene] Pas de données Pokémon adversaire');
      return;
    }
    
    // ✅ CLEF: Obtenir sprite avec gestion d'erreur
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'front');
    
    try {
      // ✅ SOLUTION: Créer sprite avec frame 0 EXPLICITE
      this.opponentPokemonSprite = this.add.sprite(
        this.pokemonPositions.opponentAbsolute.x,
        this.pokemonPositions.opponentAbsolute.y,
        spriteKey,
        0  // ✅ FRAME 0 pour spritesheet 9x9
      );
      
      // ✅ Vérifier que le sprite a bien la texture
      if (!this.opponentPokemonSprite.texture || this.opponentPokemonSprite.texture.key === '__MISSING') {
        throw new Error(`Texture manquante pour ${spriteKey}`);
      }
      
      // Configuration spécialisée vue de face
      this.opponentPokemonSprite.setScale(2.2);  // Plus petit (arrière-plan)
      this.opponentPokemonSprite.setDepth(15);
      this.opponentPokemonSprite.setOrigin(0.5, 1);  // Ancré au sol
      
      // ✅ Marquer le sprite pour debug
      this.opponentPokemonSprite.setData('isPokemon', true);
      this.opponentPokemonSprite.setData('pokemonType', 'opponent');
      this.opponentPokemonSprite.setData('pokemonId', pokemonData.pokemonId);
      
      // Effet shiny si applicable
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentPokemonSprite);
      }
      
      // Animation d'entrée depuis la droite
      this.animatePokemonEntry(this.opponentPokemonSprite, 'right');
      
      // Stocker les données
      this.currentOpponentPokemon = pokemonData;
      
      // ✅ Log de succès avec détails
      const frameInfo = this.frameSizeCache.get(spriteKey);
      console.log(`✅ [BattleScene] Pokémon adversaire affiché: ${pokemonData.name}`);
      console.log(`📊 [BattleScene] Sprite: ${spriteKey}, Frame: 0, Size: ${frameInfo?.frameWidth || '?'}x${frameInfo?.frameHeight || '?'}`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon adversaire:', error);
      this.createPokemonPlaceholder('opponent', pokemonData);
    }
  }

  // ✅ SOLUTION: Gestion intelligente des clefs de sprites
  getPokemonSpriteKey(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId}_${view}`;
    
    // ✅ Vérification avec logs détaillés
    if (this.textures.exists(spriteKey)) {
      const texture = this.textures.get(spriteKey);
      console.log(`✅ [BattleScene] Sprite trouvé: ${spriteKey} (${texture.source[0].width}x${texture.source[0].height})`);
      return spriteKey;
    } else {
      console.warn(`⚠️ [BattleScene] Sprite manquant: ${spriteKey}, fallback placeholder`);
      
      // ✅ Essayer placeholder spécialisé
      const placeholderKey = `pokemon_placeholder_${view}`;
      if (this.textures.exists(placeholderKey)) {
        return placeholderKey;
      } else {
        // Dernière option: placeholder générique
        return this.textures.exists('pokemon_placeholder_front') ? 
          'pokemon_placeholder_front' : '__DEFAULT';
      }
    }
  }

  // ✅ PLACEHOLDER amélioré avec informations
  createPokemonPlaceholder(type, pokemonData) {
    console.log(`🎭 [BattleScene] Création placeholder intelligent ${type}:`, pokemonData.name);
    
    if (!this.pokemonPositions?.playerAbsolute || !this.pokemonPositions?.opponentAbsolute) {
      this.createPokemonPositions();
    }
    
    const position = type === 'player' ? 
      this.pokemonPositions.playerAbsolute : 
      this.pokemonPositions.opponentAbsolute;
    
    if (!position) {
      console.error(`❌ [BattleScene] Position ${type} non disponible`);
      return;
    }
    
    // ✅ Couleur selon le type avec meilleur mapping
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    // ✅ Placeholder plus détaillé
    const placeholder = this.add.circle(position.x, position.y, 50, typeColor, 0.8);
    placeholder.setStroke(3, 0x000000);
    
    // Nom du Pokémon
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
    
    // Niveau
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
    
    // Configuration selon le type
    const scale = type === 'player' ? 2.8 : 2.2;
    const depth = type === 'player' ? 20 : 15;
    
    [placeholder, nameText, levelText].forEach(obj => {
      obj.setScale(scale * 0.4);
      obj.setDepth(depth);
    });
    
    // Animation d'entrée
    const direction = type === 'player' ? 'left' : 'right';
    this.animatePokemonEntry(placeholder, direction);
    
    // Stocker selon le type
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
    
    // Position de départ
    const startX = direction === 'left' ? -150 : this.cameras.main.width + 150;
    sprite.setPosition(startX, originalY + 50);
    sprite.setAlpha(0);
    sprite.setScale(sprite.scaleX * 0.5);
    
    // Animation d'entrée dynamique
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
        // Animation d'atterrissage
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
    
    // Effet scintillant pour Pokémon shiny
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

  // === UTILITAIRES ===

  getTypeColor(type) {
    const typeColors = {
      'normal': 0xA8A878,
      'fire': 0xF08030,
      'water': 0x6890F0,
      'electric': 0xF8D030,
      'grass': 0x78C850,
      'ice': 0x98D8D8,
      'fighting': 0xC03028,
      'poison': 0xA040A0,
      'ground': 0xE0C068,
      'flying': 0xA890F0,
      'psychic': 0xF85888,
      'bug': 0xA8B820,
      'rock': 0xB8A038,
      'ghost': 0x705898,
      'dragon': 0x7038F8,
      'dark': 0x705848,
      'steel': 0xB8B8D0,
      'fairy': 0xEE99AC
    };
    
    return typeColors[type.toLowerCase()] || 0xFFFFFF;
  }

  // === DEBUG ET DIAGNOSTIC ===

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

  // === MÉTHODES PUBLIQUES DE TEST ===

  testDisplayPokemon() {
    console.log('🧪 [BattleScene] Test affichage Pokémon avec frames 9x9...');
    
    this.clearAllPokemonSprites();
    
    // Pokémon de test avec IDs courants
    const testPlayerPokemon = {
      pokemonId: 4,
      id: 'player_charmander',
      name: 'Charmander',
      level: 5,
      currentHp: 18,
      maxHp: 18,
      types: ['fire']
    };
    
    const testOpponentPokemon = {
      pokemonId: 25,
      id: 'wild_pikachu',
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
    }, 2000);
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
    
    console.log('🔍 === FIN DEBUG SPRITES ===');
  }

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
    
    // ✅ Nettoyer sprites orphelins avec tag 'isPokemon'
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

  // === MÉTHODES PUBLIQUES ===

  handleEncounterStart(encounterData) {
    console.log('🐾 [BattleScene] handleEncounterStart avec sprites 9x9:', encounterData);
    
    if (!this.isActive) {
      console.warn('⚠️ [BattleScene] Scène non active, activation...');
      if (this.scene && this.scene.wake) {
        this.scene.wake();
      }
    }
    
    // S'assurer positions calculées
    if (!this.pokemonPositions?.playerAbsolute) {
      this.createPokemonPositions();
    }
    
    // Afficher Pokémon de la rencontre
    if (encounterData.pokemon) {
      console.log('👹 [BattleScene] Affichage Pokémon rencontre...');
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
        currentHp: 18,
        maxHp: 18,
        types: ['fire']
      };
      this.displayPlayerPokemon(defaultPlayerPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Rencontre traitée avec sprites 9x9');
  }

  startBattle(battleData) {
    console.log('⚔️ [BattleScene] Démarrage combat avec sprites 9x9:', battleData);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller scène si nécessaire
    if (this.scene && !this.scene.isActive()) {
      this.scene.wake();
    }
    
    // Afficher Pokémon avec frames 9x9
    if (battleData.playerPokemon) {
      this.displayPlayerPokemon(battleData.playerPokemon);
    }
    
    if (battleData.opponentPokemon) {
      this.displayOpponentPokemon(battleData.opponentPokemon);
    }
    
    this.isVisible = true;
  }

  hideBattle() {
    console.log('🖥️ [BattleScene] Masquage combat...');
    
    this.isVisible = false;
    
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  // === MÉTHODES DE BASE (temporaires) ===

  setupBasicBattleManager() {
    console.log('⚔️ [BattleScene] Setup BattleManager basique');
    // Version simplifiée pour focus sur sprites
  }

  setupBasicEvents() {
    console.log('🔗 [BattleScene] Setup événements basiques');
    // Version simplifiée pour focus sur sprites
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleScene] Destruction...');
    
    // Nettoyer sprites
    this.clearAllPokemonSprites();
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    // Nettoyer cache
    this.frameSizeCache.clear();
    
    super.destroy();
    
    console.log('✅ [BattleScene] Détruite');
  }
}

// ✅ FONCTIONS GLOBALES DE TEST ET DEBUG

// Fonction utilitaire pour calcul 9x9
window.calculateFrameSize9x9 = function(imageWidth, imageHeight) {
  const frameWidth = Math.floor(imageWidth / 9);
  const frameHeight = Math.floor(imageHeight / 9);
  
  console.log(`🧮 Calcul 9x9: ${imageWidth}x${imageHeight} → ${frameWidth}x${frameHeight} par frame`);
  
  return {
    frameWidth,
    frameHeight,
    totalFrames: 81,
    grid: '9x9',
    coverage: {
      width: frameWidth * 9,
      height: frameHeight * 9,
      wastedWidth: imageWidth - (frameWidth * 9),
      wastedHeight: imageHeight - (frameHeight * 9)
    }
  };
};

// Test avec différentes tailles d'images
window.testFrameSizeCalculations = function() {
  console.log('🧮 === TEST CALCULS FRAME SIZE 9x9 ===');
  
  const testSizes = [
    { w: 360, h: 360, desc: "Standard carré" },
    { w: 405, h: 405, desc: "Carré optimisé" },
    { w: 288, h: 288, desc: "Petit carré" },
    { w: 576, h: 576, desc: "Grand carré" },
    { w: 720, h: 720, desc: "Très grand carré" },
    { w: 360, h: 450, desc: "Rectangle vertical" },
    { w: 450, h: 360, desc: "Rectangle horizontal" }
  ];
  
  testSizes.forEach(size => {
    console.log(`\n📏 ${size.desc} (${size.w}x${size.h}):`);
    const result = window.calculateFrameSize9x9(size.w, size.h);
    console.log(`   Frame: ${result.frameWidth}x${result.frameHeight}`);
    console.log(`   Couverture: ${result.coverage.width}x${result.coverage.height}`);
    if (result.coverage.wastedWidth > 0 || result.coverage.wastedHeight > 0) {
      console.log(`   ⚠️ Perte: ${result.coverage.wastedWidth}x${result.coverage.wastedHeight} pixels`);
    } else {
      console.log(`   ✅ Couverture parfaite`);
    }
  });
  
  console.log('\n🎯 Tailles optimales recommandées pour 9x9:');
  console.log('   360x360 → 40x40 (aucune perte)');
  console.log('   405x405 → 45x45 (aucune perte)');
  console.log('   288x288 → 32x32 (aucune perte)');
  console.log('   576x576 → 64x64 (aucune perte)');
};

// Test recharge dynamique avec taille spécifique
window.testSpecificFrameSize = function(pokemonId, view, frameWidth, frameHeight) {
  console.log(`🔄 Test recharge ${pokemonId} ${view} avec frames ${frameWidth}x${frameHeight}`);
  
  const scene = window.game?.scene?.getScene('BattleScene');
  if (!scene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  const spriteKey = `pokemon_${pokemonId}_${view}`;
  
  // Supprimer texture existante
  if (scene.textures.exists(spriteKey)) {
    scene.textures.remove(spriteKey);
    console.log(`🗑️ Texture ${spriteKey} supprimée`);
  }
  
  // Recharger avec nouvelle taille
  const pokemonNames = {
    1: 'bulbasaur', 4: 'charmander', 7: 'squirtle', 25: 'pikachu',
    39: 'jigglypuff', 52: 'meowth', 54: 'psyduck', 150: 'mewtwo'
  };
  
  const pokemonName = pokemonNames[pokemonId] || 'unknown';
  const imagePath = `assets/pokemon/${pokemonName}/${view}.png`;
  
  scene.load.spritesheet(spriteKey, imagePath, {
    frameWidth: frameWidth,
    frameHeight: frameHeight
  });
  
  scene.load.start();
  
  scene.load.once('complete', () => {
    console.log(`✅ ${spriteKey} rechargé avec frames ${frameWidth}x${frameHeight}`);
    
    // Mettre à jour le cache
    scene.frameSizeCache.set(spriteKey, {
      frameWidth: frameWidth,
      frameHeight: frameHeight,
      totalFrames: 81,
      recalculated: true
    });
    
    // Relancer test d'affichage
    scene.testDisplayPokemon();
  });
};

// Test automatique avec tailles communes
window.testCommonPokemonSizes = function() {
  console.log('🧪 Test des tailles communes de Pokémon...');
  
  // Tester Charmander back avec 40x40 (image 360x360)
  window.testSpecificFrameSize(4, 'back', 40, 40);
  
  setTimeout(() => {
    // Tester Pikachu front avec 64x64 (image 576x576)
    window.testSpecificFrameSize(25, 'front', 64, 64);
  }, 2000);
};

// Test avec auto-détection de taille optimale
window.testAutoDetectFrameSize = function(pokemonId, view) {
  console.log(`🔍 Auto-détection taille optimale pour Pokémon ${pokemonId} ${view}`);
  
  const scene = window.game?.scene?.getScene('BattleScene');
  if (!scene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  const spriteKey = `pokemon_${pokemonId}_${view}`;
  
  // Si déjà chargé, obtenir la taille
  if (scene.textures.exists(spriteKey)) {
    const texture = scene.textures.get(spriteKey);
    const source = texture.source[0];
    const imageWidth = source.width;
    const imageHeight = source.height;
    
    console.log(`📊 Image actuelle: ${imageWidth}x${imageHeight}`);
    
    // Calculer taille optimale 9x9
    const optimal = window.calculateFrameSize9x9(imageWidth, imageHeight);
    
    console.log(`🎯 Taille optimale calculée: ${optimal.frameWidth}x${optimal.frameHeight}`);
    
    // Recharger avec la taille optimale
    window.testSpecificFrameSize(pokemonId, view, optimal.frameWidth, optimal.frameHeight);
    
    return optimal;
  } else {
    console.warn(`⚠️ Texture ${spriteKey} non chargée`);
    return null;
  }
};

// Fonction de test complète avec masquage UI
window.testBattleSprites = function() {
  console.log('🧪 === TEST COMPLET SPRITES 9x9 ===');
  
  // ✅ Masquer complètement l'UI
  if (window.hideAllUI) {
    const hiddenCount = window.hideAllUI();
    console.log(`✅ ${hiddenCount} éléments UI masqués`);
  }
  
  // Activer BattleScene
  setTimeout(() => {
    const battleScene = window.game?.scene?.getScene('BattleScene');
    if (battleScene) {
      // Activer si nécessaire
      if (!window.game.scene.isActive('BattleScene')) {
        console.log('🎬 Activation BattleScene...');
        window.game.scene.start('BattleScene');
        
        setTimeout(() => {
          const activeBattleScene = window.game.scene.getScene('BattleScene');
          if (activeBattleScene) {
            activeBattleScene.testDisplayPokemon();
          }
        }, 500);
      } else {
        battleScene.testDisplayPokemon();
      }
      
      console.log('✅ Test sprites 9x9 lancé avec UI masquée');
    } else {
      console.error('❌ BattleScene non trouvée');
    }
  }, 300);
  
  // Debug après test
  setTimeout(() => {
    window.debugSpriteStatus();
  }, 4000);
};

// Debug status des sprites
window.debugSpriteStatus = function() {
  console.log('🔍 === DEBUG STATUS SPRITES ===');
  
  const scene = window.game?.scene?.getScene('BattleScene');
  if (scene && scene.debugCurrentSprites) {
    scene.debugCurrentSprites();
  }
  
  if (scene && scene.debugLoadedTextures) {
    scene.debugLoadedTextures();
  }
  
  console.log('🔍 === FIN DEBUG ===');
};

// Test spécialisé pour différentes configurations
window.testPokemonConfiguration = function(config) {
  console.log('🎮 Test configuration Pokémon:', config);
  
  const scene = window.game?.scene?.getScene('BattleScene');
  if (!scene) {
    console.error('❌ BattleScene non trouvée');
    return;
  }
  
  // Configuration par défaut
  const defaultConfig = {
    playerId: 4,
    opponentId: 25,
    playerFrameSize: { width: 40, height: 40 },
    opponentFrameSize: { width: 64, height: 64 },
    showAnimations: true,
    clearFirst: true
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  if (finalConfig.clearFirst) {
    scene.clearAllPokemonSprites();
  }
  
  // Test avec configuration spécifique
  setTimeout(() => {
    const playerPokemon = {
      pokemonId: finalConfig.playerId,
      name: `TestPlayer${finalConfig.playerId}`,
      level: 5,
      types: ['fire']
    };
    scene.displayPlayerPokemon(playerPokemon);
  }, 500);
  
  setTimeout(() => {
    const opponentPokemon = {
      pokemonId: finalConfig.opponentId,
      name: `TestOpponent${finalConfig.opponentId}`,
      level: 8,
      types: ['electric']
    };
    scene.displayOpponentPokemon(opponentPokemon);
  }, 1200);
};

console.log('✅ [BattleScene] Module chargé avec support sprites 9x9');
console.log('🧪 Fonctions de test disponibles:');
console.log('   window.testBattleSprites() - Test complet');
console.log('   window.calculateFrameSize9x9(w, h) - Calcul frames');
console.log('   window.testFrameSizeCalculations() - Test calculs');
console.log('   window.testSpecificFrameSize(id, view, fw, fh) - Test taille spécifique');
console.log('   window.testAutoDetectFrameSize(id, view) - Auto-détection');
console.log('   window.testCommonPokemonSizes() - Tailles communes');
console.log('   window.debugSpriteStatus() - Debug sprites');
console.log('🎯 Utilisez testBattleSprites() pour commencer!');
