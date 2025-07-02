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
    
    // 🆕 SPRITES POKÉMON - Charger comme SPRITESHEETS avec frame 0
    this.loadPokemonSpritesheets();
    
    console.log('✅ [BattleScene] Préchargement en cours...');
  }

  // 🆕 MÉTHODE: Chargement sprites Pokémon en spritesheets
  loadPokemonSpritesheets() {
    console.log('🐾 [BattleScene] Chargement sprites Pokémon (spritesheets)...');
    
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
    
    // ✅ CORRECTION: Charger comme spritesheets avec frame 0
    pokemonSprites.forEach(pokemon => {
      const frontKey = `pokemon_${pokemon.id}_front`;
      const backKey = `pokemon_${pokemon.id}_back`;
      
      // Vérifier si pas déjà chargé
      if (!this.textures.exists(frontKey)) {
        // Charger comme spritesheet avec frame size appropriée
        this.load.spritesheet(frontKey, `assets/pokemon/${pokemon.name}/front.png`, {
          frameWidth: 96,  // Taille standard frame front
          frameHeight: 96
        });
      }
      
      if (!this.textures.exists(backKey)) {
        // Charger comme spritesheet avec frame size appropriée  
        this.load.spritesheet(backKey, `assets/pokemon/${pokemon.name}/back.png`, {
          frameWidth: 96,  // Taille standard frame back
          frameHeight: 96
        });
      }
    });
    
    // 🆕 PLACEHOLDERS si sprites manquent
    if (!this.textures.exists('pokemon_placeholder_front')) {
      this.load.spritesheet('pokemon_placeholder_front', 'assets/pokemon/placeholder_front.png', {
        frameWidth: 96,
        frameHeight: 96
      });
    }
    
    if (!this.textures.exists('pokemon_placeholder_back')) {
      this.load.spritesheet('pokemon_placeholder_back', 'assets/pokemon/placeholder_back.png', {
        frameWidth: 96,
        frameHeight: 96
      });
    }
    
    console.log(`✅ [BattleScene] ${pokemonSprites.length} Pokémon spritesheets en cours de chargement`);
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
    
    // ✅ CORRECTION: S'assurer que les propriétés existent
    if (!this.pokemonPositions.playerAbsolute) {
      this.pokemonPositions.playerAbsolute = {};
    }
    if (!this.pokemonPositions.opponentAbsolute) {
      this.pokemonPositions.opponentAbsolute = {};
    }
    
    // Calculer positions absolues basées sur l'image de référence
    this.pokemonPositions.playerAbsolute.x = width * this.pokemonPositions.player.x;
    this.pokemonPositions.playerAbsolute.y = height * this.pokemonPositions.player.y;
    
    this.pokemonPositions.opponentAbsolute.x = width * this.pokemonPositions.opponent.x;
    this.pokemonPositions.opponentAbsolute.y = height * this.pokemonPositions.opponent.y;
    
    console.log('✅ [BattleScene] Positions calculées:', {
      player: this.pokemonPositions.playerAbsolute,
      opponent: this.pokemonPositions.opponentAbsolute,
      screen: { width, height }
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
    
    // ✅ CORRECTION: Supprimer l'ancien sprite proprement
    if (this.playerPokemonSprite) {
      console.log('🗑️ [BattleScene] Suppression ancien sprite joueur');
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
      // ✅ CORRECTION: Créer le sprite avec frame 0 pour spritesheet
      this.playerPokemonSprite = this.add.sprite(
        this.pokemonPositions.playerAbsolute.x,
        this.pokemonPositions.playerAbsolute.y,
        spriteKey,
        0  // ✅ FRAME 0 pour spritesheet
      );
      
      // ✅ MARQUER le sprite pour le nettoyage
      this.playerPokemonSprite.setData('isPokemon', true);
      this.playerPokemonSprite.setData('pokemonType', 'player');
      
      // Configuration du sprite joueur
      this.playerPokemonSprite.setScale(2.5);  // Plus grand (premier plan)
      this.playerPokemonSprite.setDepth(20);
      this.playerPokemonSprite.setOrigin(0.5, 1);  // Ancré au sol
      
      // Animation d'entrée
      this.animatePokemonEntry(this.playerPokemonSprite, 'player');
      
      // Stocker les données
      this.currentPlayerPokemon = pokemonData;
      
      console.log(`✅ [BattleScene] Pokémon joueur affiché: ${pokemonData.name} (${spriteKey}, frame 0)`);
      
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
    
    // ✅ CORRECTION: Supprimer l'ancien sprite proprement
    if (this.opponentPokemonSprite) {
      console.log('🗑️ [BattleScene] Suppression ancien sprite adversaire');
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
      // ✅ CORRECTION: Créer le sprite avec frame 0 pour spritesheet
      this.opponentPokemonSprite = this.add.sprite(
        this.pokemonPositions.opponentAbsolute.x,
        this.pokemonPositions.opponentAbsolute.y,
        spriteKey,
        0  // ✅ FRAME 0 pour spritesheet
      );
      
      // ✅ MARQUER le sprite pour le nettoyage
      this.opponentPokemonSprite.setData('isPokemon', true);
      this.opponentPokemonSprite.setData('pokemonType', 'opponent');
      
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
      
      console.log(`✅ [BattleScene] Pokémon adversaire affiché: ${pokemonData.name} (${spriteKey}, frame 0)`);
      
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
    
    // ✅ CORRECTION: Nettoyer d'abord tous les sprites existants
    this.clearAllPokemonSprites();
    
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

  // 🆕 MÉTHODE: Nettoyer tous les sprites Pokémon
  clearAllPokemonSprites() {
    console.log('🧹 [BattleScene] Nettoyage de tous les sprites Pokémon...');
    
    // Supprimer le sprite joueur
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    // Supprimer le sprite adversaire
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    // ✅ CORRECTION: Nettoyer TOUS les sprites avec les tags "pokemon"
    // Au cas où il y aurait des sprites orphelins
    const allChildren = this.children.list.slice(); // Copie pour éviter les modifications pendant l'itération
    allChildren.forEach(child => {
      if (child.texture && (
        child.texture.key.includes('pokemon_') || 
        child.texture.key.includes('placeholder') ||
        (child.getData && child.getData('isPokemon'))
      )) {
        console.log('🗑️ [BattleScene] Suppression sprite orphelin:', child.texture.key);
        child.destroy();
      }
    });
    
    // Nettoyer les données
    this.currentPlayerPokemon = null;
    this.currentOpponentPokemon = null;
    
    console.log('✅ [BattleScene] Nettoyage terminé');
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * 🆕 MÉTHODE REQUISE: Gestion du début de rencontre (appelée par BattleUITransition)
   */
  handleEncounterStart(encounterData) {
    console.log('🐾 [BattleScene] handleEncounterStart appelée:', encounterData);
    
    if (!this.isActive) {
      console.warn('⚠️ [BattleScene] Scène non active, activation...');
      if (this.scene && this.scene.wake) {
        this.scene.wake();
      }
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
    
    // Pour les tests, afficher aussi un Pokémon joueur par défaut
    if (!this.currentPlayerPokemon) {
      console.log('👤 [BattleScene] Affichage Pokémon joueur par défaut...');
      const defaultPlayerPokemon = {
        pokemonId: 4,
        id: 'player_charmander',
        name: 'Charmander',
        level: 5,
        currentHp: 18,
        maxHp: 18,
        types: ['fire']
      };
      this.displayPlayerPokemon(defaultPlayerPokemon);
    }
    
    this.isVisible = true;
    console.log('✅ [BattleScene] Rencontre traitée avec succès');
  }

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

// 🆕 FONCTION POUR TESTER DIFFÉRENTES TAILLES DE FRAMES
window.testFrameSize = function(width, height, type = 'both') {
  console.log(`🔍 Test de taille de frame: ${width}x${height} pour ${type}`);
  
  const scene = window.game?.scene?.getScene('BattleScene');
  if (scene) {
    // Supprimer les textures existantes selon le type
    const texturesToRemove = [];
    
    if (type === 'back' || type === 'both') {
      texturesToRemove.push('pokemon_4_back');
    }
    if (type === 'front' || type === 'both') {
      texturesToRemove.push('pokemon_25_front');
    }
    
    texturesToRemove.forEach(key => {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
        console.log(`🗑️ Texture ${key} supprimée`);
      }
    });
    
    // Recharger avec la nouvelle taille
    if (type === 'back' || type === 'both') {
      scene.load.spritesheet('pokemon_4_back', 'assets/pokemon/charmander/back.png', {
        frameWidth: width,
        frameHeight: height
      });
    }
    
    if (type === 'front' || type === 'both') {
      scene.load.spritesheet('pokemon_25_front', 'assets/pokemon/pikachu/front.png', {
        frameWidth: width,
        frameHeight: height
      });
    }
    
    scene.load.start();
    
    scene.load.once('complete', () => {
      console.log(`✅ Rechargement terminé avec ${width}x${height} pour ${type}`);
      // Relancer le test
      window.testBattleSprites();
    });
  }
};

// 🔧 AUTO-CORRECTION DU SYSTÈME DE COMBAT RÉEL
window.fixRealBattleSystem = function() {
  console.log('🔧 === CORRECTION AUTOMATIQUE DU SYSTÈME DE COMBAT ===');
  
  let fixesApplied = 0;
  
  // 1. Corriger BattleUITransition
  if (window.fixBattleUITransition) {
    window.fixBattleUITransition();
    fixesApplied++;
    console.log('✅ BattleUITransition corrigée');
  }
  
  if (window.fixBattleEndTransition) {
    window.fixBattleEndTransition();
    fixesApplied++;
    console.log('✅ Fin de combat corrigée');
  }
  
  // 2. Corriger le BattleIntegration si disponible
  if (window.gameManager?.battleIntegration) {
    const battleIntegration = window.gameManager.battleIntegration;
    
    if (battleIntegration.handleWildEncounterStart) {
      const originalHandler = battleIntegration.handleWildEncounterStart.bind(battleIntegration);
      
      battleIntegration.handleWildEncounterStart = function(data) {
        console.log('🐾 [BattleIntegration CORRIGÉ] Rencontre sauvage avec masquage UI complet');
        
        // ✅ MASQUER COMPLÈTEMENT L'UI AVANT TOUT
        if (window.hideAllUI) {
          const hiddenCount = window.hideAllUI();
          console.log(`✅ [BattleIntegration] ${hiddenCount} éléments UI masqués`);
        }
        
        // Appeler l'handler original
        return originalHandler(data);
      };
      
      fixesApplied++;
      console.log('✅ BattleIntegration.handleWildEncounterStart corrigé');
    }
  }
  
  // 3. Corriger directement dans le network handler si accessible
  if (window.globalNetworkManager?.battleNetworkHandler) {
    const battleHandler = window.globalNetworkManager.battleNetworkHandler;
    
    if (battleHandler.handleWildEncounterStart) {
      const originalNetworkHandler = battleHandler.handleWildEncounterStart.bind(battleHandler);
      
      battleHandler.handleWildEncounterStart = function(data) {
        console.log('🌐 [BattleNetworkHandler CORRIGÉ] Rencontre avec masquage UI');
        
        // ✅ MASQUER L'UI IMMÉDIATEMENT
        if (window.hideAllUI) {
          window.hideAllUI();
        }
        
        return originalNetworkHandler(data);
      };
      
      fixesApplied++;
      console.log('✅ BattleNetworkHandler.handleWildEncounterStart corrigé');
    }
  }
  
  // 4. Hook sur tous les événements wildEncounterStart possibles
  if (window.addEventListener) {
    window.addEventListener('wildEncounterStart', function(event) {
      console.log('🎣 [HOOK] wildEncounterStart intercepté - masquage UI');
      if (window.hideAllUI) {
        window.hideAllUI();
      }
    });
    fixesApplied++;
    console.log('✅ Hook global wildEncounterStart ajouté');
  }
  
  console.log(`🎯 ${fixesApplied} corrections appliquées au système de combat`);
  console.log('✅ Le système devrait maintenant cacher le QuestTracker automatiquement');
  
  return fixesApplied > 0;
};

// 🧪 FONCTION DE TEST DU SYSTÈME CORRIGÉ
window.testRealBattle = function() {
  console.log('🧪 Test du système de combat réel...');
  
  // Appliquer les corrections
  const fixed = window.fixRealBattleSystem();
  
  if (fixed) {
    console.log('✅ Corrections appliquées, le combat dans l\'herbe devrait maintenant masquer le QuestTracker');
    console.log('🌱 Allez dans l\'herbe pour tester !');
  } else {
    console.warn('⚠️ Aucune correction appliquée - vérifiez que le système de combat est chargé');
  }
  
  // Afficher l'état actuel
  window.debugUIState();
};

// 🆕 FONCTION POUR TESTER AVEC CALCUL AUTOMATIQUE
window.testSpritesheetCalculation = function() {
  console.log('🧮 Test calcul automatique spritesheet 9x9...');
  
  // Exemples de tailles communes
  const commonSizes = [
    { w: 360, h: 360, name: "360x360 (40x40 par frame)" },
    { w: 405, h: 405, name: "405x405 (45x45 par frame)" },
    { w: 576, h: 576, name: "576x576 (64x64 par frame)" },
    { w: 720, h: 720, name: "720x720 (80x80 par frame)" },
    { w: 288, h: 288, name: "288x288 (32x32 par frame)" }
  ];
  
  console.log('🔍 Calculs pour différentes tailles d\'images:');
  commonSizes.forEach(size => {
    const result = window.calculateFrameSize9x9(size.w, size.h);
    console.log(`📊 ${size.name} → Frame: ${result.frameWidth}x${result.frameHeight}`);
  });
  
  console.log('💡 Utilisez: window.testFrameSize9x9(imageWidth, imageHeight)');
};

// 🆕 FONCTION POUR TESTER UNE TAILLE SPÉCIFIQUE CALCULÉE
window.testFrameSize9x9 = function(imageWidth, imageHeight) {
  console.log(`🧮 Test avec image ${imageWidth}x${imageHeight} en grille 9x9...`);
  
  const { frameWidth, frameHeight } = window.calculateFrameSize9x9(imageWidth, imageHeight);
  
  // Tester avec les back sprites
  window.testFrameSize(frameWidth, frameHeight, 'back');
};

// 🆕 FONCTION POUR TESTER TAILLES COMMUNES
window.testCommonFrameSizes = function() {
  console.log('🧪 Test des tailles de frames communes...');
  
  const sizes = [
    { w: 32, h: 32, name: 'Mini' },
    { w: 40, h: 45, name: 'Back Pokémon (spécialisé)' }, // ✅ AJOUTÉ
    { w: 48, h: 48, name: 'Petite' },
    { w: 64, h: 64, name: 'Classique' },
    { w: 80, h: 80, name: 'Moyenne' },
    { w: 96, h: 96, name: 'Grande' },
    { w: 128, h: 128, name: 'Très grande' }
  ];
  
  console.log('📏 Tailles disponibles:');
  sizes.forEach((size, index) => {
    console.log(`${index + 1}. ${size.name}: ${size.w}x${size.h} - window.testFrameSize(${size.w}, ${size.h})`);
  });
  
  console.log('💡 Fonctions spécialisées:');
  console.log('🎯 Back sprites 40x45: window.testBackSprites40x45()');
  console.log('🎯 Front sprites 64x64: window.testFrameSize(64, 64, "front")');
};

// 🆕 FONCTION POUR NETTOYER L'ÉCRAN
window.clearBattleScreen = function() {
  console.log('🧹 Nettoyage de l\'écran de combat...');
  
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.clearAllPokemonSprites) {
    battleScene.clearAllPokemonSprites();
    console.log('✅ Écran nettoyé');
  } else {
    console.warn('⚠️ BattleScene non trouvée ou méthode manquante');
  }
};

// 🆕 FONCTION DE TEST GLOBALE AVEC UI FORCÉE (VERSION AMÉLIORÉE)
window.testBattleSprites = function() {
  console.log('🧪 Test affichage sprites Pokémon avec UI cachée...');
  
  // ✅ ÉTAPE 0: Nettoyer d'abord l'écran
  window.clearBattleScreen();
  
  // ✅ ÉTAPE 1: UTILISER LA FONCTION QUI FONCTIONNE
  console.log('🎮 Masquage complet de l\'UI...');
  const hiddenCount = window.hideAllUI();
  console.log(`✅ ${hiddenCount} éléments UI masqués`);
  
  // ✅ ÉTAPE 2: Activer la BattleScene immédiatement
  setTimeout(() => {
    const battleScene = window.game?.scene?.getScene('BattleScene');
    if (battleScene) {
      // Activer la BattleScene
      if (!window.game.scene.isActive('BattleScene')) {
        console.log('🎬 Activation de la BattleScene...');
        window.game.scene.start('BattleScene');
        
        // Attendre que la scène soit créée
        setTimeout(() => {
          const activeBattleScene = window.game.scene.getScene('BattleScene');
          if (activeBattleScene) {
            activeBattleScene.testDisplayPokemon();
          }
        }, 500);
      } else {
        battleScene.testDisplayPokemon();
      }
      
      console.log('✅ Test lancé - L\'UI est COMPLÈTEMENT cachée (QuestTracker inclus)');
    } else {
      console.error('❌ BattleScene non trouvée');
    }
  }, 300); // Délai réduit car hideAllUI() est instantané
};

// 🆕 FONCTION DE TEST DES RENCONTRES AVEC UI FORCÉE
window.testBattleEncounter = function() {
  console.log('🧪 Test rencontre via BattleUITransition avec UI forcée...');
  
  // ✅ FORCER le mode battle
  console.log('🎮 FORÇAGE du mode battle...');
  
  if (window.pokemonUISystem) {
    // Mode battle avec force
    window.pokemonUISystem.setGameState('battle', { 
      animated: true,
      force: true 
    });
    
    // Double vérification - masquer explicitement
    ['inventory', 'team', 'quest', 'questTracker', 'chat'].forEach(moduleId => {
      window.pokemonUISystem.hideModule(moduleId, { animated: false });
      window.pokemonUISystem.disableModule(moduleId);
    });
    
    console.log('✅ Mode battle forcé et modules cachés');
  }
  
  // Attendre puis lancer la rencontre
  setTimeout(() => {
    const battleScene = window.game?.scene?.getScene('BattleScene');
    if (battleScene) {
      // Simuler une rencontre
      const encounterData = {
        pokemon: {
          pokemonId: 25,
          id: 'wild_pikachu_test',
          name: 'Pikachu',
          level: 8,
          currentHp: 25,
          maxHp: 25,
          types: ['electric'],
          shiny: false
        },
        location: 'test_zone',
        method: 'debug_encounter'
      };
      
      // Activer la scène si nécessaire
      if (!window.game.scene.isActive('BattleScene')) {
        window.game.scene.start('BattleScene');
        setTimeout(() => {
          const activeBattleScene = window.game.scene.getScene('BattleScene');
          if (activeBattleScene) {
            activeBattleScene.handleEncounterStart(encounterData);
          }
        }, 500);
      } else {
        battleScene.handleEncounterStart(encounterData);
      }
      
      console.log('✅ Test de rencontre lancé avec UI cachée');
    } else {
      console.error('❌ BattleScene non trouvée');
    }
  }, 800);
};

// 🆕 FONCTION DE DEBUG DE L'UI
window.debugUIState = function() {
  console.log('🔍 === DEBUG ÉTAT UI ===');
  
  if (window.pokemonUISystem) {
    console.log('📊 État global:', window.pokemonUISystem.globalState);
    console.log('🎮 État de jeu actuel:', window.pokemonUISystem.globalState.currentGameState);
    
    // Vérifier chaque module
    ['inventory', 'team', 'quest', 'questTracker', 'chat'].forEach(moduleId => {
      const module = window.pokemonUISystem.getModule(moduleId);
      const state = window.pokemonUISystem.getModuleState(moduleId);
      
      console.log(`🔸 ${moduleId}:`, {
        initialized: window.pokemonUISystem.isModuleInitialized(moduleId),
        state: state,
        visible: state?.visible,
        enabled: state?.enabled,
        domElement: !!module?.iconElement,
        domVisible: module?.iconElement ? 
          window.getComputedStyle(module.iconElement).display !== 'none' : 'N/A'
      });
    });
    
    // Vérifier les éléments DOM
    const elementsToCheck = [
      '#inventory-icon', '#team-icon', '#quest-icon', 
      '#questTracker', '#quest-tracker', '#chat'  // ✅ AJOUTÉ quest-tracker
    ];
    
    console.log('🔍 Vérification DOM:');
    elementsToCheck.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const style = window.getComputedStyle(element);
        console.log(`🔸 ${selector}:`, {
          exists: true,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex
        });
      } else {
        console.log(`🔸 ${selector}: NOT FOUND`);
      }
    });
    
    // ✅ NOUVEAU: Vérifier spécifiquement le QuestTracker
    const questTracker = document.querySelector('#quest-tracker');
    if (questTracker) {
      console.log('🎯 QUEST TRACKER spécifique:', {
        className: questTracker.className,
        style: questTracker.style.cssText,
        offsetParent: !!questTracker.offsetParent,
        clientHeight: questTracker.clientHeight,
        isConnected: questTracker.isConnected
      });
    }
  } else {
    console.error('❌ PokemonUISystem non trouvé');
  }
  
  console.log('🔍 === FIN DEBUG ===');
};

// 🆕 FONCTION SPÉCIALISÉE POUR MASQUER COMPLÈTEMENT L'UI
window.hideAllUI = function() {
  console.log('🚫 Masquage complet de toute l\'UI...');
  
  // 1. Via le système UI
  if (window.pokemonUISystem) {
    window.pokemonUISystem.setGameState('battle', { animated: false, force: true });
    ['inventory', 'team', 'quest', 'questTracker', 'chat'].forEach(moduleId => {
      window.pokemonUISystem.hideModule(moduleId, { animated: false });
      window.pokemonUISystem.disableModule(moduleId);
    });
  }
  
  // 2. Masquage DOM direct de TOUS les éléments UI possibles
  const allUIElements = [
    // Modules classiques
    '#inventory-icon', '#team-icon', '#quest-icon', '#chat',
    '.inventory-ui', '.team-ui', '.quest-ui', '.chat-container',
    
    // QuestTracker spécifique
    '#questTracker', '#quest-tracker', '.quest-tracker',
    
    // Classes génériques
    '.ui-icon', '.game-icon', '.interface-icon',
    '.ui-module', '.game-module',
    
    // Autres éléments UI potentiels
    '.minimap', '.health-bar', '.status-bar',
    '.notification-container', '.tooltip'
  ];
  
  let hiddenCount = 0;
  allUIElements.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (window.getComputedStyle(el).display !== 'none') {
        el.style.display = 'none';
        hiddenCount++;
        console.log(`🔸 Masqué: ${selector}`);
      }
    });
  });
  
  console.log(`✅ ${hiddenCount} éléments UI masqués`);
  
  // 3. Vérification finale
  const questTracker = document.querySelector('#quest-tracker');
  if (questTracker && window.getComputedStyle(questTracker).display !== 'none') {
    console.log('🎯 Masquage forcé final du QuestTracker');
    questTracker.style.display = 'none !important';
    questTracker.style.visibility = 'hidden';
    questTracker.style.opacity = '0';
  }
  
  return hiddenCount;
};

// 🆕 FONCTION POUR RESTAURER L'UI
window.showAllUI = function() {
  console.log('👁️ Restauration de l\'UI...');
  
  // 1. Via le système UI
  if (window.pokemonUISystem) {
    window.pokemonUISystem.setGameState('exploration', { animated: true });
  }
  
  // 2. Restauration DOM
  const allUIElements = document.querySelectorAll('[style*="display: none"]');
  let restoredCount = 0;
  
  allUIElements.forEach(el => {
    if (el.style.display === 'none') {
      el.style.display = '';
      el.style.visibility = '';
      el.style.opacity = '';
      restoredCount++;
    }
  });
  
  console.log(`✅ ${restoredCount} éléments UI restaurés`);
  
  return restoredCount;
};
