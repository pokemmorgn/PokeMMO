// client/src/scenes/BattleScene.js - ÉTAPE 1: Chargement et affichage sprites Pokémon

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
    
    // 🆕 SPRITES POKÉMON
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.battleBackground = null;
    
    // Données actuelles
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    // 🆕 POSITIONS DES POKÉMON (basées sur l'image de référence)
    this.pokemonPositions = {
      player: { x: 0.25, y: 0.75 },      // Premier plan à gauche
      opponent: { x: 0.75, y: 0.35 }     // Arrière-plan à droite
    };
    
    console.log('⚔️ [BattleScene] Constructeur initialisé - Focus sprites Pokémon');
  }

  // === INITIALISATION ===

  init(data = {}) {
    console.log('🔧 [BattleScene] Init avec data:', data);
    
    this.gameManager = data.gameManager || this.scene.get('GameScene')?.gameManager;
    this.networkHandler = data.networkHandler || this.scene.get('GameScene')?.networkHandler;
    
    if (!this.gameManager || !this.networkHandler) {
      console.error('❌ [BattleScene] Managers manquants dans init');
      return;
    }
    
    console.log('✅ [BattleScene] Managers récupérés');
  }

  // 🆕 PRELOAD: Chargement de TOUS les sprites Pokémon nécessaires
  preload() {
    console.log('📁 [BattleScene] Préchargement sprites Pokémon...');
    
    // Background de combat
    if (!this.textures.exists('battlebg01')) {
      this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    }
    
    // 🆕 SPRITES POKÉMON - Charger une gamme de sprites disponibles
    this.loadPokemonSprites();
    
    console.log('✅ [BattleScene] Préchargement en cours...');
  }

  // 🆕 MÉTHODE: Chargement sprites Pokémon
  loadPokemonSprites() {
    console.log('🐾 [BattleScene] Chargement sprites Pokémon...');
    
    // Liste des Pokémon de base avec sprites disponibles
    const pokemonSprites = [
      // Starters Kanto
      { id: 1, name: 'bulbasaur' },
      { id: 2, name: 'ivysaur' },
      { id: 3, name: 'venusaur' },
      { id: 4, name: 'charmander' },
      { id: 5, name: 'charmeleon' },
      { id: 6, name: 'charizard' },
      { id: 7, name: 'squirtle' },
      { id: 8, name: 'wartortle' },
      { id: 9, name: 'blastoise' },
      
      // Pokémon courants
      { id: 10, name: 'caterpie' },
      { id: 11, name: 'metapod' },
      { id: 12, name: 'butterfree' },
      { id: 13, name: 'weedle' },
      { id: 14, name: 'kakuna' },
      { id: 15, name: 'beedrill' },
      
      // Pikachu et évolutions
      { id: 25, name: 'pikachu' },
      { id: 26, name: 'raichu' },
      
      // Autres populaires
      { id: 39, name: 'jigglypuff' },
      { id: 40, name: 'wigglytuff' },
      { id: 52, name: 'meowth' },
      { id: 54, name: 'psyduck' },
      { id: 150, name: 'mewtwo' }
    ];
    
    // Charger front et back pour chaque Pokémon
    pokemonSprites.forEach(pokemon => {
      const frontKey = `pokemon_${pokemon.id}_front`;
      const backKey = `pokemon_${pokemon.id}_back`;
      
      // Vérifier si pas déjà chargé
      if (!this.textures.exists(frontKey)) {
        this.load.image(frontKey, `assets/pokemon/${pokemon.name}/front.png`);
      }
      
      if (!this.textures.exists(backKey)) {
        this.load.image(backKey, `assets/pokemon/${pokemon.name}/back.png`);
      }
    });
    
    // 🆕 PLACEHOLDERS si sprites manquent
    if (!this.textures.exists('pokemon_placeholder_front')) {
      this.load.image('pokemon_placeholder_front', 'assets/pokemon/placeholder_front.png');
    }
    
    if (!this.textures.exists('pokemon_placeholder_back')) {
      this.load.image('pokemon_placeholder_back', 'assets/pokemon/placeholder_back.png');
    }
    
    console.log(`✅ [BattleScene] ${pokemonSprites.length} Pokémon sprites en cours de chargement`);
  }

  create() {
    console.log('🎨 [BattleScene] Création de la scène...');
    
    try {
      // 1. Créer le background de combat
      this.createBattleBackground();
      
      // 2. ✅ CORRECTION: Calculer les positions AVANT tout
      this.createPokemonPositions();
      
      // 3. Initialiser le BattleManager (simplifié pour cette étape)
      this.setupBasicBattleManager();
      
      // 4. Setup événements de base
      this.setupBasicEvents();
      
      this.isActive = true;
      console.log('✅ [BattleScene] Scène créée - Prête pour sprites Pokémon');
      console.log('🐾 [BattleScene] Positions calculées:', this.pokemonPositions);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur lors de la création:', error);
    }
  }

  // 🆕 MÉTHODE: Création du background de combat
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

  // 🆕 MÉTHODE: Background de secours
  createFallbackBackground() {
    const { width, height } = this.cameras.main;
    
    const bg = this.add.graphics();
    
    // Dégradé ciel/herbe style Pokémon
    bg.fillGradientStyle(
      0x87CEEB, 0x87CEEB,  // Bleu ciel
      0x32CD32, 0x228B22   // Vert herbe
    );
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    
    this.battleBackground = bg;
  }

  // 🆕 MÉTHODE: Préparation positions Pokémon
  createPokemonPositions() {
    console.log('🐾 [BattleScene] Préparation positions Pokémon...');
    
    const { width, height } = this.cameras.main;
    
    // Calculer positions absolues basées sur l'image de référence
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
      opponent: this.pokemonPositions.opponentAbsolute
    });
  }

  // 🆕 MÉTHODE: Affichage d'un Pokémon joueur (vue de dos)
  displayPlayerPokemon(pokemonData) {
    console.log('👤 [BattleScene] Affichage Pokémon joueur:', pokemonData);
    
    // ✅ CORRECTION: Vérifier que les positions sont disponibles
    if (!this.pokemonPositions?.playerAbsolute) {
      console.error('❌ [BattleScene] Positions non calculées, recalcul...');
      this.createPokemonPositions();
    }
    
    // Supprimer l'ancien sprite
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (!pokemonData) {
      console.warn('⚠️ [BattleScene] Pas de données Pokémon joueur');
      return;
    }
    
    // Obtenir la clé du sprite (vue de dos)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'back');
    
    try {
      // Créer le sprite
      this.playerPokemonSprite = this.add.sprite(
        this.pokemonPositions.playerAbsolute.x,
        this.pokemonPositions.playerAbsolute.y,
        spriteKey
      );
      
      // Configuration du sprite joueur
      this.playerPokemonSprite.setScale(2.5);  // Plus grand (premier plan)
      this.playerPokemonSprite.setDepth(20);
      this.playerPokemonSprite.setOrigin(0.5, 1);  // Ancré au sol
      
      // Animation d'entrée
      this.animatePokemonEntry(this.playerPokemonSprite, 'player');
      
      // Stocker les données
      this.currentPlayerPokemon = pokemonData;
      
      console.log(`✅ [BattleScene] Pokémon joueur affiché: ${pokemonData.name} (${spriteKey})`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon joueur:', error);
      // Créer un placeholder
      this.createPokemonPlaceholder('player', pokemonData);
    }
  }

  // 🆕 MÉTHODE: Affichage d'un Pokémon adversaire (vue de face)
  displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleScene] Affichage Pokémon adversaire:', pokemonData);
    
    // ✅ CORRECTION: Vérifier que les positions sont disponibles
    if (!this.pokemonPositions?.opponentAbsolute) {
      console.error('❌ [BattleScene] Positions non calculées, recalcul...');
      this.createPokemonPositions();
    }
    
    // Supprimer l'ancien sprite
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    if (!pokemonData) {
      console.warn('⚠️ [BattleScene] Pas de données Pokémon adversaire');
      return;
    }
    
    // Obtenir la clé du sprite (vue de face)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'front');
    
    try {
      // Créer le sprite
      this.opponentPokemonSprite = this.add.sprite(
        this.pokemonPositions.opponentAbsolute.x,
        this.pokemonPositions.opponentAbsolute.y,
        spriteKey
      );
      
      // Configuration du sprite adversaire
      this.opponentPokemonSprite.setScale(2.0);  // Plus petit (arrière-plan)
      this.opponentPokemonSprite.setDepth(15);
      this.opponentPokemonSprite.setOrigin(0.5, 1);  // Ancré au sol
      
      // Effet shiny si applicable
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentPokemonSprite);
      }
      
      // Animation d'entrée
      this.animatePokemonEntry(this.opponentPokemonSprite, 'opponent');
      
      // Stocker les données
      this.currentOpponentPokemon = pokemonData;
      
      console.log(`✅ [BattleScene] Pokémon adversaire affiché: ${pokemonData.name} (${spriteKey})`);
      
    } catch (error) {
      console.error('❌ [BattleScene] Erreur affichage Pokémon adversaire:', error);
      // Créer un placeholder
      this.createPokemonPlaceholder('opponent', pokemonData);
    }
  }

  // 🆕 MÉTHODE: Obtenir clé de sprite
  getPokemonSpriteKey(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId}_${view}`;
    
    // Vérifier si le sprite existe
    if (this.textures.exists(spriteKey)) {
      return spriteKey;
    } else {
      console.warn(`⚠️ [BattleScene] Sprite manquant: ${spriteKey}, utilisation placeholder`);
      return `pokemon_placeholder_${view}`;
    }
  }

  // 🆕 MÉTHODE: Placeholder si sprite manquant
  createPokemonPlaceholder(type, pokemonData) {
    console.log(`🎭 [BattleScene] Création placeholder ${type}:`, pokemonData.name);
    
    // ✅ CORRECTION: Vérifier que les positions sont calculées
    if (!this.pokemonPositions?.playerAbsolute || !this.pokemonPositions?.opponentAbsolute) {
      console.error('❌ [BattleScene] Positions non calculées, recalcul...');
      this.createPokemonPositions();
    }
    
    const position = type === 'player' ? 
      this.pokemonPositions.playerAbsolute : 
      this.pokemonPositions.opponentAbsolute;
    
    if (!position) {
      console.error(`❌ [BattleScene] Position ${type} non disponible`);
      return;
    }
    
    // Couleur selon le type principal du Pokémon
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    // Créer un cercle coloré avec le nom
    const placeholder = this.add.circle(position.x, position.y, 60, typeColor, 0.8);
    placeholder.setStroke(4, 0x000000);
    
    const nameText = this.add.text(
      position.x, position.y,
      pokemonData.name || 'Pokémon',
      {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    
    // Configuration selon le type
    const scale = type === 'player' ? 2.5 : 2.0;
    const depth = type === 'player' ? 20 : 15;
    
    placeholder.setScale(scale * 0.5);
    nameText.setScale(scale * 0.5);
    placeholder.setDepth(depth);
    nameText.setDepth(depth + 1);
    
    // Animation d'entrée
    this.animatePokemonEntry(placeholder, type);
    
    // Stocker selon le type
    if (type === 'player') {
      this.playerPokemonSprite = placeholder;
      this.currentPlayerPokemon = pokemonData;
    } else {
      this.opponentPokemonSprite = placeholder;
      this.currentOpponentPokemon = pokemonData;
    }
  }

  // 🆕 MÉTHODE: Animation d'entrée
  animatePokemonEntry(sprite, type) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    const originalY = sprite.y;
    
    // Position de départ (hors écran)
    const startX = type === 'player' ? -150 : this.cameras.main.width + 150;
    sprite.setPosition(startX, originalY + 50);
    sprite.setAlpha(0);
    sprite.setScale(sprite.scaleX * 0.3);
    
    // Animation d'entrée dynamique
    this.tweens.add({
      targets: sprite,
      x: originalX,
      y: originalY,
      alpha: 1,
      scaleX: sprite.scaleX * 3.33,  // Retour à la taille normale
      scaleY: sprite.scaleY * 3.33,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Animation d'atterrissage
        this.tweens.add({
          targets: sprite,
          y: originalY + 10,
          duration: 400,
          yoyo: true,
          ease: 'Bounce.easeOut'
        });
      }
    });
  }

  // 🆕 MÉTHODE: Effet shiny
  addShinyEffect(sprite) {
    if (!sprite) return;
    
    // Effet scintillant pour les Pokémon shiny
    this.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    console.log('✨ [BattleScene] Effet shiny appliqué');
  }

  // 🆕 MÉTHODE: Couleurs par type
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

  // 🆕 MÉTHODES DE BASE (temporaires pour cette étape)
  setupBasicBattleManager() {
    // Version simplifiée pour tester les sprites
    console.log('⚔️ [BattleScene] Setup BattleManager basique pour tests sprites');
  }

  setupBasicEvents() {
    // Événements de base pour tests
    console.log('🔗 [BattleScene] Setup événements basiques');
  }

  // 🆕 MÉTHODE DE TEST: Afficher des Pokémon de test
  testDisplayPokemon() {
    console.log('🧪 [BattleScene] Test affichage Pokémon...');
    
    // Pokémon joueur test
    const testPlayerPokemon = {
      pokemonId: 4,
      id: 'player_charizard',
      name: 'Charmander',
      level: 5,
      currentHp: 18,
      maxHp: 18,
      types: ['fire']
    };
    
    // Pokémon adversaire test
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
    
    // Afficher avec délai pour l'effet
    setTimeout(() => {
      this.displayPlayerPokemon(testPlayerPokemon);
    }, 500);
    
    setTimeout(() => {
      this.displayOpponentPokemon(testOpponentPokemon);
    }, 1200);
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Point d'entrée principal pour démarrer un combat
   */
  startBattle(battleData) {
    console.log('⚔️ [BattleScene] Démarrage combat avec sprites:', battleData);
    
    if (!this.isActive) {
      console.error('❌ [BattleScene] Scène non active');
      return;
    }
    
    // Réveiller la scène si nécessaire
    if (this.scene && !this.scene.isActive()) {
      this.scene.wake();
    }
    
    // Afficher les Pokémon
    if (battleData.playerPokemon) {
      this.displayPlayerPokemon(battleData.playerPokemon);
    }
    
    if (battleData.opponentPokemon) {
      this.displayOpponentPokemon(battleData.opponentPokemon);
    }
    
    this.isVisible = true;
  }

  /**
   * Masquer la scène de combat
   */
  hideBattle() {
    console.log('🖥️ [BattleScene] Masquage combat...');
    
    this.isVisible = false;
    
    if (this.scene && this.scene.sleep) {
      this.scene.sleep();
    }
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleScene] Destruction...');
    
    // Nettoyer les sprites
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    if (this.battleBackground) {
      this.battleBackground.destroy();
      this.battleBackground = null;
    }
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    super.destroy();
    
    console.log('✅ [BattleScene] Détruite');
  }
}

// 🆕 FONCTION DE TEST GLOBALE
window.testBattleSprites = function() {
  console.log('🧪 Test affichage sprites Pokémon...');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene) {
    battleScene.testDisplayPokemon();
    console.log('✅ Test lancé - Vérifiez l\'affichage des sprites');
  } else {
    console.error('❌ BattleScene non trouvée');
  }
};

console.log('✅ BattleScene modifiée - Focus sprites Pokémon');
console.log('🧪 Utilisez window.testBattleSprites() pour tester');
