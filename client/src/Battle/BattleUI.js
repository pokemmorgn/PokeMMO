// client/src/Battle/BattleUI.js - Interface utilisateur du combat avec background intégré
export class BattleUI {
  constructor(scene, battleManager) {
    this.scene = scene;
    this.battleManager = battleManager;
    
    // Éléments Phaser principaux
    this.background = null;
    this.battleBgImage = null;
    this.playerPokemonSprite = null;
    this.opponentPokemonSprite = null;
    this.playerHealthBar = null;
    this.opponentHealthBar = null;
    
    // Données des Pokémon
    this.playerPokemonData = null;
    this.opponentPokemonData = null;
    
    // Conteneurs
    this.pokemonContainer = null;
    this.uiContainer = null;
    this.backgroundContainer = null;
    
    // Positions optimisées selon l'image de référence
    this.layout = {
      // Background settings
      background: {
        scale: 1.0,
        depth: -100
      },
      
      // Positions des Pokémon (style classique)
      playerPokemon: {
        x: 0.15,  // 15% depuis la gauche
        y: 0.75,  // 75% depuis le haut (premier plan)
        scale: 2.8,
        depth: 20
      },
      
      opponentPokemon: {
        x: 0.75,  // 75% depuis la gauche  
        y: 0.35,  // 35% depuis le haut (arrière-plan)
        scale: 2.2,
        depth: 15
      },
      
      // Barres de vie style Pokémon
      playerHealthBar: {
        x: 0.55,  // Droite de l'écran
        y: 0.7,   // Bas
        width: 350,
        height: 90
      },
      
      opponentHealthBar: {
        x: 0.05,  // Gauche de l'écran
        y: 0.1,   // Haut
        width: 350,
        height: 90
      }
    };
    
    // État
    this.isInitialized = false;
    
    console.log('🎨 [BattleUI] Constructeur initialisé avec layout optimisé');
  }

  // === INITIALISATION ===

  initialize() {
    console.log('🔧 [BattleUI] Initialisation...');
    
    if (!this.scene) {
      console.error('❌ [BattleUI] Scene manquante');
      return;
    }
    
    try {
      // Ordre d'initialisation optimisé
      this.createContainers();
      this.createBattleBackground();
      this.createPokemonPositions();
      this.createStylizedHealthBars();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ [BattleUI] Interface initialisée avec background de combat');
      
    } catch (error) {
      console.error('❌ [BattleUI] Erreur lors de l\'initialisation:', error);
    }
  }

  // === CRÉATION DES CONTENEURS ===

  createContainers() {
    console.log('📦 [BattleUI] Création des conteneurs...');
    
    // Conteneur principal pour le background
    this.backgroundContainer = this.scene.add.container(0, 0);
    this.backgroundContainer.setDepth(-100);
    
    // Conteneur pour les Pokémon
    this.pokemonContainer = this.scene.add.container(0, 0);
    this.pokemonContainer.setDepth(10);
    
    // Conteneur pour l'UI Phaser (barres de vie, effets)
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setDepth(50);
    
    console.log('✅ [BattleUI] Conteneurs créés');
  }

  // === CRÉATION DU BACKGROUND DE COMBAT ===

  createBattleBackground() {
    console.log('🖼️ [BattleUI] Création du background de combat...');
    
    const { width, height } = this.scene.cameras.main;
    
    // ✅ NOUVEAU: Utiliser l'image de background chargée
    if (this.scene.textures.exists('battlebg01')) {
      console.log('🎨 [BattleUI] Utilisation du background chargé: battlebg01');
      
      this.battleBgImage = this.scene.add.image(width/2, height/2, 'battlebg01');
      
      // Ajuster la taille pour couvrir l'écran
      const scaleX = width / this.battleBgImage.width;
      const scaleY = height / this.battleBgImage.height;
      const scale = Math.max(scaleX, scaleY);
      
      this.battleBgImage.setScale(scale);
      this.battleBgImage.setDepth(this.layout.background.depth);
      
      this.backgroundContainer.add(this.battleBgImage);
      
    } else {
      console.warn('⚠️ [BattleUI] Background battlebg01 non trouvé, création fallback');
      this.createFallbackBackground();
    }
    
    console.log('✅ [BattleUI] Background de combat créé');
  }

  createFallbackBackground() {
    const { width, height } = this.scene.cameras.main;
    
    // Background de base si l'image n'est pas disponible
    this.background = this.scene.add.graphics();
    
    // Dégradé ciel vers terrain (style Pokémon)
    this.background.fillGradientStyle(
      0x87CEEB, 0x87CEEB,  // Bleu ciel en haut
      0x32CD32, 0x228B22   // Vert herbe en bas
    );
    this.background.fillRect(0, 0, width, height);
    this.background.setDepth(-100);
    
    // Ligne d'horizon
    const horizonY = height * 0.55;
    this.background.lineStyle(3, 0x2F4F2F, 0.6);
    this.background.lineBetween(0, horizonY, width, horizonY);
    
    // Zones de combat (plateformes)
    this.createBattlePlatforms();
    
    this.backgroundContainer.add(this.background);
  }

  createBattlePlatforms() {
    const { width, height } = this.scene.cameras.main;
    
    // Plateforme joueur (premier plan, plus grande)
    const playerPlatform = this.scene.add.ellipse(
      width * this.layout.playerPokemon.x, 
      height * (this.layout.playerPokemon.y + 0.05), 
      140, 45, 
      0x228B22, 0.4
    );
    playerPlatform.setDepth(-50);
    playerPlatform.setStrokeStyle(2, 0x1F5F1F, 0.8);
    
    // Plateforme adversaire (arrière-plan, plus petite)
    const opponentPlatform = this.scene.add.ellipse(
      width * this.layout.opponentPokemon.x, 
      height * (this.layout.opponentPokemon.y + 0.08), 
      110, 35, 
      0x32CD32, 0.3
    );
    opponentPlatform.setDepth(-50);
    opponentPlatform.setStrokeStyle(2, 0x2F4F2F, 0.6);
    
    this.backgroundContainer.add([playerPlatform, opponentPlatform]);
  }

  // === POSITIONS DES POKÉMON ===

  createPokemonPositions() {
    console.log('🐾 [BattleUI] Configuration des positions Pokémon...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Positions basées sur le layout optimisé
    this.playerPokemonPos = {
      x: width * this.layout.playerPokemon.x,
      y: height * this.layout.playerPokemon.y
    };
    
    this.opponentPokemonPos = {
      x: width * this.layout.opponentPokemon.x,
      y: height * this.layout.opponentPokemon.y
    };
    
    console.log('✅ [BattleUI] Positions configurées:', {
      player: this.playerPokemonPos,
      opponent: this.opponentPokemonPos
    });
  }

  // === BARRES DE VIE STYLISÉES ===

  createStylizedHealthBars() {
    console.log('❤️ [BattleUI] Création des barres de vie stylisées...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Barre de vie adversaire (en haut à gauche)
    this.opponentHealthBar = this.createHealthBarGroup(
      width * this.layout.opponentHealthBar.x, 
      height * this.layout.opponentHealthBar.y, 
      'opponent'
    );
    
    // Barre de vie joueur (en bas à droite)
    this.playerHealthBar = this.createHealthBarGroup(
      width * this.layout.playerHealthBar.x, 
      height * this.layout.playerHealthBar.y, 
      'player'
    );
    
    console.log('✅ [BattleUI] Barres de vie stylisées créées');
  }

  createHealthBarGroup(x, y, type) {
    const container = this.scene.add.container(x, y);
    container.setDepth(60);
    
    const layout = type === 'player' ? this.layout.playerHealthBar : this.layout.opponentHealthBar;
    const isPlayer = type === 'player';
    
    // ✅ NOUVEAU: Design inspiré des vrais jeux Pokémon
    
    // Background principal avec bordure
    const bgWidth = layout.width;
    const bgHeight = layout.height;
    
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRoundedRect(0, 0, bgWidth, bgHeight, 12);
    
    // Bordure dorée
    background.lineStyle(3, 0xFFD700, 0.9);
    background.strokeRoundedRect(0, 0, bgWidth, bgHeight, 12);
    
    // Bordure intérieure
    background.lineStyle(1, 0xFFFFFF, 0.5);
    background.strokeRoundedRect(2, 2, bgWidth-4, bgHeight-4, 10);
    
    // ✅ Zone nom et niveau
    const nameText = this.scene.add.text(15, 12, 'Pokémon', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    const levelText = this.scene.add.text(bgWidth - 25, 12, 'L??', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFF99',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(1, 0);
    
    // ✅ Barre de HP avec style Pokémon
    const hpBarY = 40;
    const hpBarWidth = 200;
    const hpBarHeight = 12;
    
    // Background de la barre HP
    const hpBarBg = this.scene.add.graphics();
    hpBarBg.fillStyle(0x404040);
    hpBarBg.fillRoundedRect(15, hpBarY, hpBarWidth, hpBarHeight, 6);
    hpBarBg.lineStyle(1, 0x202020);
    hpBarBg.strokeRoundedRect(15, hpBarY, hpBarWidth, hpBarHeight, 6);
    
    // Barre de HP remplie
    const hpBarFill = this.scene.add.graphics();
    hpBarFill.fillStyle(0x00FF00);
    hpBarFill.fillRoundedRect(15, hpBarY, hpBarWidth, hpBarHeight, 6);
    
    // ✅ Texte HP (seulement pour le joueur)
    let hpText = null;
    if (isPlayer) {
      hpText = this.scene.add.text(15, hpBarY + 18, 'HP: ??/??', {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      });
    }
    
    // ✅ Label HP
    const hpLabel = this.scene.add.text(15, hpBarY - 15, 'HP', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    
    // ✅ Indicateur de statut
    const statusIcon = this.scene.add.text(bgWidth - 30, hpBarY + 15, '', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // ✅ Barre d'expérience (seulement pour le joueur)
    let expBar = null;
    if (isPlayer) {
      const expBarY = hpBarY + 25;
      const expBarBg = this.scene.add.graphics();
      expBarBg.fillStyle(0x404040);
      expBarBg.fillRoundedRect(15, expBarY, hpBarWidth * 0.8, 4, 2);
      
      const expBarFill = this.scene.add.graphics();
      expBarFill.fillStyle(0x0080FF);
      expBarFill.fillRoundedRect(15, expBarY, hpBarWidth * 0.6, 4, 2);
      
      expBar = { bg: expBarBg, fill: expBarFill };
      container.add([expBarBg, expBarFill]);
    }
    
    // Ajouter tous les éléments au container
    const elements = [background, nameText, levelText, hpLabel, hpBarBg, hpBarFill, statusIcon];
    if (hpText) elements.push(hpText);
    
    container.add(elements);
    
    // Cacher par défaut
    container.setVisible(false);
    
    return {
      container: container,
      nameText: nameText,
      levelText: levelText,
      hpLabel: hpLabel,
      hpBarBg: hpBarBg,
      hpBarFill: hpBarFill,
      hpText: hpText,
      statusIcon: statusIcon,
      expBar: expBar,
      maxWidth: hpBarWidth
    };
  }

  // === AFFICHAGE DES POKÉMON ===

  displayPokemon(playerPokemon, opponentPokemon) {
    console.log('🐾 [BattleUI] Affichage des Pokémon...');
    console.log('👤 Joueur:', playerPokemon);
    console.log('👹 Adversaire:', opponentPokemon);
    
    if (playerPokemon) {
      this.displayPlayerPokemon(playerPokemon);
    }
    
    if (opponentPokemon) {
      this.displayOpponentPokemon(opponentPokemon);
    }
  }

  displayPlayerPokemon(pokemonData) {
    console.log('👤 [BattleUI] Affichage Pokémon joueur:', pokemonData);
    
    this.playerPokemonData = pokemonData;
    
    // Supprimer l'ancien sprite s'il existe
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
    }
    
    // ✅ Créer le sprite (vue de dos pour le joueur)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'back');
    
    try {
      this.playerPokemonSprite = this.scene.add.sprite(
        this.playerPokemonPos.x,
        this.playerPokemonPos.y,
        spriteKey
      );
      
      // Configuration du sprite
      this.playerPokemonSprite.setScale(this.layout.playerPokemon.scale);
      this.playerPokemonSprite.setDepth(this.layout.playerPokemon.depth);
      
      // Animation d'entrée depuis la gauche
      this.animatePokemonEntry(this.playerPokemonSprite, 'left');
      
      this.pokemonContainer.add(this.playerPokemonSprite);
      
    } catch (error) {
      console.warn('⚠️ [BattleUI] Erreur création sprite joueur:', error);
      // Créer un placeholder
      this.createPokemonPlaceholder(this.playerPokemonPos, pokemonData, 'player');
    }
    
    // Mettre à jour la barre de vie
    this.updatePlayerHealthBar(pokemonData);
    
    console.log('✅ [BattleUI] Pokémon joueur affiché');
  }

  displayOpponentPokemon(pokemonData) {
    console.log('👹 [BattleUI] Affichage Pokémon adversaire:', pokemonData);
    
    this.opponentPokemonData = pokemonData;
    
    // Supprimer l'ancien sprite s'il existe
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
    }
    
    // ✅ Créer le sprite (vue de face pour l'adversaire)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId || pokemonData.id, 'front');
    
    try {
      this.opponentPokemonSprite = this.scene.add.sprite(
        this.opponentPokemonPos.x,
        this.opponentPokemonPos.y,
        spriteKey
      );
      
      // Configuration du sprite
      this.opponentPokemonSprite.setScale(this.layout.opponentPokemon.scale);
      this.opponentPokemonSprite.setDepth(this.layout.opponentPokemon.depth);
      
      // Effet shiny si applicable
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentPokemonSprite);
      }
      
      // Animation d'entrée depuis la droite
      this.animatePokemonEntry(this.opponentPokemonSprite, 'right');
      
      this.pokemonContainer.add(this.opponentPokemonSprite);
      
    } catch (error) {
      console.warn('⚠️ [BattleUI] Erreur création sprite adversaire:', error);
      // Créer un placeholder
      this.createPokemonPlaceholder(this.opponentPokemonPos, pokemonData, 'opponent');
    }
    
    // Mettre à jour la barre de vie
    this.updateOpponentHealthBar(pokemonData);
    
    console.log('✅ [BattleUI] Pokémon adversaire affiché');
  }

  createPokemonPlaceholder(position, pokemonData, type) {
    console.log(`🎭 [BattleUI] Création placeholder ${type}:`, pokemonData.name);
    
    // Placeholder coloré selon le type principal
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    const placeholder = this.scene.add.circle(
      position.x, position.y,
      50, typeColor, 0.8
    );
    
    // Texte avec le nom
    const nameText = this.scene.add.text(
      position.x, position.y,
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
    
    // Échelle selon le type
    const scale = type === 'player' ? this.layout.playerPokemon.scale * 0.4 : this.layout.opponentPokemon.scale * 0.4;
    placeholder.setScale(scale);
    nameText.setScale(scale);
    
    // Depth
    const depth = type === 'player' ? this.layout.playerPokemon.depth : this.layout.opponentPokemon.depth;
    placeholder.setDepth(depth);
    nameText.setDepth(depth + 1);
    
    // Stocker la référence
    if (type === 'player') {
      this.playerPokemonSprite = placeholder;
    } else {
      this.opponentPokemonSprite = placeholder;
    }
    
    this.pokemonContainer.add([placeholder, nameText]);
    
    // Animation d'entrée
    this.animatePokemonEntry(placeholder, type === 'player' ? 'left' : 'right');
  }

  // === MISE À JOUR DES BARRES DE VIE ===

  updatePlayerHealthBar(pokemonData) {
    if (!this.playerHealthBar || !pokemonData) return;
    
    const { nameText, levelText, hpBarFill, hpText, statusIcon, container, maxWidth } = this.playerHealthBar;
    
    // Nom et niveau
    nameText.setText(pokemonData.name || 'Pokémon');
    levelText.setText(`L${pokemonData.level || 1}`);
    
    // Barre de HP avec animation
    const hpPercent = pokemonData.maxHp > 0 ? pokemonData.currentHp / pokemonData.maxHp : 0;
    const barWidth = Math.max(0, maxWidth * hpPercent);
    
    // Couleur selon les HP (style Pokémon)
    let hpColor = 0x00FF00; // Vert
    if (hpPercent <= 0.5) hpColor = 0xFFFF00; // Jaune
    if (hpPercent <= 0.2) hpColor = 0xFF0000; // Rouge
    
    // Animation de la barre
    this.scene.tweens.add({
      targets: { width: 0 },
      width: barWidth,
      duration: 500,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const currentWidth = tween.getValue();
        hpBarFill.clear();
        hpBarFill.fillStyle(hpColor);
        hpBarFill.fillRoundedRect(15, 40, currentWidth, 12, 6);
      }
    });
    
    // Texte HP
    if (hpText) {
      hpText.setText(`HP: ${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    // Statut
    const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    container.setVisible(true);
    
    // Animation si HP critiques
    if (hpPercent <= 0.2 && hpPercent > 0) {
      this.addCriticalHpAnimation(container);
    }
    
    console.log(`✅ [BattleUI] Barre joueur mise à jour: ${pokemonData.currentHp}/${pokemonData.maxHp}`);
  }

  updateOpponentHealthBar(pokemonData) {
    if (!this.opponentHealthBar || !pokemonData) return;
    
    const { nameText, levelText, hpBarFill, statusIcon, container, maxWidth } = this.opponentHealthBar;
    
    // Nom et niveau
    nameText.setText(pokemonData.name || 'Pokémon');
    levelText.setText(`L${pokemonData.level || 1}`);
    
    // Barre de HP avec animation
    const hpPercent = pokemonData.maxHp > 0 ? pokemonData.currentHp / pokemonData.maxHp : 0;
    const barWidth = Math.max(0, maxWidth * hpPercent);
    
    // Couleur selon les HP
    let hpColor = 0x00FF00; // Vert
    if (hpPercent <= 0.5) hpColor = 0xFFFF00; // Jaune
    if (hpPercent <= 0.2) hpColor = 0xFF0000; // Rouge
    
    // Animation de la barre
    this.scene.tweens.add({
      targets: { width: maxWidth },
      width: barWidth,
      duration: 800,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const currentWidth = tween.getValue();
        hpBarFill.clear();
        hpBarFill.fillStyle(hpColor);
        hpBarFill.fillRoundedRect(15, 40, currentWidth, 12, 6);
      }
    });
    
    // Statut
    const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    container.setVisible(true);
    
    console.log(`✅ [BattleUI] Barre adversaire mise à jour: ${pokemonData.currentHp}/${pokemonData.maxHp}`);
  }

  // === ANIMATIONS ===

  animatePokemonEntry(sprite, direction) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    const originalY = sprite.y;
    
    // Position de départ (hors écran)
    const startX = direction === 'left' ? -150 : this.scene.cameras.main.width + 150;
    sprite.setPosition(startX, originalY + 50);
    sprite.setAlpha(0);
    sprite.setScale(sprite.scaleX * 0.5);
    
    // Animation d'entrée dynamique
    this.scene.tweens.add({
      targets: sprite,
      x: originalX,
      y: originalY,
      alpha: 1,
      scaleX: sprite.scaleX * 2,
      scaleY: sprite.scaleY * 2,
      duration: 1000,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Petite animation d'atterrissage
        this.scene.tweens.add({
          targets: sprite,
          y: originalY + 8,
          duration: 300,
          yoyo: true,
          ease: 'Bounce.easeOut'
        });
      }
    });
  }

  addCriticalHpAnimation(container) {
    if (!container) return;
    
    // Animation de clignotement rouge pour HP critiques
    this.scene.tweens.add({
      targets: container,
      alpha: 0.3,
      tint: 0xFF0000,
      duration: 300,
      yoyo: true,
      repeat: 5,
      ease: 'Power2',
      onComplete: () => {
        container.clearTint();
        container.setAlpha(1);
      }
    });
  }

  addShinyEffect(sprite) {
    if (!sprite) return;
    
    // Effet scintillant pour les Pokémon shiny
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    console.log('✨ [BattleUI] Effet shiny appliqué');
  }

  // === MÉTHODES UTILITAIRES ===

  getPokemonSpriteKey(pokemonId, view = 'front') {
    // Mapping des sprites selon l'ID
    const spriteMap = {
      1: view === 'back' ? 'bulbasaur_back' : 'bulbasaur_front',
      4: view === 'back' ? 'charmander_back' : 'charmander_front', 
      7: view === 'back' ? 'squirtle_back' : 'squirtle_front',
      25: view === 'back' ? 'pikachu_back' : 'pikachu_front',
      // Ajouter d'autres Pokémon selon les besoins
    };
    
    const spriteKey = spriteMap[pokemonId];
    
    // Vérifier si le sprite existe, sinon utiliser placeholder
    if (spriteKey && this.scene.textures.exists(spriteKey)) {
      return spriteKey;
    } else {
      console.warn(`⚠️ [BattleUI] Sprite manquant: ${spriteKey || `pokemon_${pokemonId}_${view}`}`);
      // Retourner un placeholder générique
      return view === 'back' ? 'pokemon_placeholder_back' : 'pokemon_placeholder_front';
    }
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'normal': '',
      'poison': '💜',
      'burn': '🔥', 
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵',
      'ko': '💀'
    };
    
    return statusEmojis[status] || '';
  }

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

  // === EFFETS SPÉCIAUX ===

  showDamageNumber(damage, target) {
    if (!target || damage <= 0) return;
    
    const damageText = this.scene.add.text(target.x, target.y - 60, `-${damage}`, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#FF0000',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3
    });
    
    damageText.setOrigin(0.5);
    damageText.setDepth(100);
    
    // Animation du nombre de dégâts
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 120,
      alpha: 0,
      scale: 1.8,
      duration: 1800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  showHealNumber(heal, target) {
    if (!target || heal <= 0) return;
    
    const healText = this.scene.add.text(target.x, target.y - 60, `+${heal}`, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#00FF00',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3
    });
    
    healText.setOrigin(0.5);
    healText.setDepth(100);
    
    // Animation du nombre de soins
    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 100,
      alpha: 0,
      scale: 1.4,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        healText.destroy();
      }
    });
  }

  showStatusEffect(effect, target) {
    if (!target || !effect) return;
    
    const effectEmoji = this.getStatusEmoji(effect);
    if (!effectEmoji) return;
    
    const effectText = this.scene.add.text(target.x, target.y - 40, effectEmoji, {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif'
    });
    
    effectText.setOrigin(0.5);
    effectText.setDepth(100);
    
    // Animation de l'effet de statut
    this.scene.tweens.add({
      targets: effectText,
      y: effectText.y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 2500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        effectText.destroy();
      }
    });
  }

  // === ANIMATIONS D'ATTAQUE ===

  animateAttack(attackerType, targetType, moveData) {
    console.log(`💥 [BattleUI] Animation attaque: ${attackerType} → ${targetType}`, moveData);
    
    const attacker = attackerType === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
    const target = targetType === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (!attacker || !target) return;
    
    // Animation de l'attaquant (mouvement vers l'avant)
    const originalX = attacker.x;
    const moveDistance = attackerType === 'player' ? 80 : -80;
    
    this.scene.tweens.add({
      targets: attacker,
      x: originalX + moveDistance,
      duration: 400,
      ease: 'Power2.easeOut',
      yoyo: true,
      onComplete: () => {
        // Retour en position
        attacker.x = originalX;
      }
    });
    
    // Animation du défenseur (impact)
    setTimeout(() => {
      this.animateHit(target);
      
      // Effet visuel d'impact
      this.createImpactEffect(target.x, target.y);
    }, 400);
  }

  animateHit(sprite) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    
    // Secousse horizontale
    this.scene.tweens.add({
      targets: sprite,
      x: originalX + 15,
      duration: 80,
      yoyo: true,
      repeat: 4,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.x = originalX;
      }
    });
    
    // Flash rouge
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFF0000,
      duration: 150,
      yoyo: true,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.clearTint();
      }
    });
  }

  createImpactEffect(x, y) {
    // Effet d'étoiles d'impact
    const stars = [];
    const starCount = 8;
    
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const distance = 30;
      
      const star = this.scene.add.text(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        '★',
        {
          fontSize: '20px',
          color: '#FFFF00',
          stroke: '#FF0000',
          strokeThickness: 2
        }
      );
      
      star.setOrigin(0.5);
      star.setDepth(90);
      stars.push(star);
      
      // Animation des étoiles
      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 80,
        y: y + Math.sin(angle) * 80,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: 'Power2.easeOut',
        onComplete: () => {
          star.destroy();
        }
      });
    }
  }

  // === ANIMATIONS DE CAPTURE ===

  animateCapture(ballType, targetPokemon) {
    console.log(`🎯 [BattleUI] Animation de capture: ${ballType}`);
    
    if (!targetPokemon || !this.opponentPokemonSprite) return;
    
    // Créer la Poké Ball
    const ballSprite = this.scene.add.circle(
      this.playerPokemonPos.x - 50,
      this.playerPokemonPos.y - 30,
      15,
      0xFF0000 // Rouge de la Poké Ball
    );
    ballSprite.setStrokeStyle(3, 0x000000);
    ballSprite.setDepth(30);
    
    // Ligne centrale de la Ball
    const ballLine = this.scene.add.graphics();
    ballLine.lineStyle(2, 0x000000);
    ballLine.lineBetween(-15, 0, 15, 0);
    ballLine.setDepth(31);
    
    const ballContainer = this.scene.add.container(
      this.playerPokemonPos.x - 50,
      this.playerPokemonPos.y - 30,
      [ballSprite, ballLine]
    );
    
    // Animation de lancer vers le Pokémon
    this.scene.tweens.add({
      targets: ballContainer,
      x: this.opponentPokemonSprite.x,
      y: this.opponentPokemonSprite.y - 20,
      rotation: Math.PI * 4, // Rotation pendant le vol
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Animation de capture
        this.animatePokemonCapture(ballContainer);
      }
    });
  }

  animatePokemonCapture(ballContainer) {
    if (!this.opponentPokemonSprite) return;
    
    // Flash blanc de capture
    const flash = this.scene.add.rectangle(
      this.opponentPokemonSprite.x,
      this.opponentPokemonSprite.y,
      120, 120,
      0xFFFFFF
    );
    flash.setDepth(40);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Faire disparaître le Pokémon avec effet
    this.scene.tweens.add({
      targets: this.opponentPokemonSprite,
      alpha: 0,
      scale: 0.1,
      duration: 400,
      ease: 'Power2.easeIn'
    });
    
    // Animation de la Ball qui tombe et secoue
    setTimeout(() => {
      this.animateBallShakes(ballContainer);
    }, 500);
  }

  animateBallShakes(ballContainer, shakes = 3) {
    let currentShake = 0;
    
    const shake = () => {
      if (currentShake >= shakes) {
        // Fin des secousses - succès ou échec déterminé par le serveur
        console.log('🎯 [BattleUI] Fin des secousses de la Ball');
        return;
      }
      
      currentShake++;
      
      // Secousse de la Ball
      this.scene.tweens.add({
        targets: ballContainer,
        rotation: ballContainer.rotation + 0.5,
        y: ballContainer.y - 10,
        duration: 200,
        yoyo: true,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          // Attendre avant la prochaine secousse
          setTimeout(shake, 800);
        }
      });
    };
    
    // Première secousse après un délai
    setTimeout(shake, 600);
  }

  // === ÉVÉNEMENTS ET CALLBACKS ===

  setupEventListeners() {
    if (!this.battleManager) return;
    
    console.log('🔗 [BattleUI] Configuration des événements...');
    
    // Écouter les événements du BattleManager
    this.battleManager.on('pokemonUpdated', (data) => {
      if (data.pokemon === 'player') {
        this.updatePlayerHealthBar(data.pokemonData);
      } else {
        this.updateOpponentHealthBar(data.pokemonData);
      }
    });
    
    this.battleManager.on('attackAnimationStart', (data) => {
      this.animateAttack(data.attacker, data.target, data.moveData);
    });
    
    this.battleManager.on('damageDealt', (data) => {
      const target = data.target === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
      this.showDamageNumber(data.damage, target);
      this.animateHit(target);
    });
    
    this.battleManager.on('healingDone', (data) => {
      const target = data.target === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
      this.showHealNumber(data.healing, target);
    });
    
    this.battleManager.on('statusEffectApplied', (data) => {
      const target = data.target === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
      this.showStatusEffect(data.effect, target);
    });
    
    this.battleManager.on('captureAttempt', (data) => {
      this.animateCapture(data.ballType, this.opponentPokemonData);
    });
    
    console.log('✅ [BattleUI] Événements configurés');
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Met à jour l'affichage des Pokémon
   */
  updatePokemonDisplay() {
    if (this.playerPokemonData) {
      this.updatePlayerHealthBar(this.playerPokemonData);
    }
    
    if (this.opponentPokemonData) {
      this.updateOpponentHealthBar(this.opponentPokemonData);
    }
  }

  /**
   * Met à jour l'indicateur de tour
   */
  updateTurnIndicator() {
    // Cette méthode est gérée par BattleScene
    console.log('🔄 [BattleUI] Mise à jour indicateur de tour');
  }

  /**
   * Met à jour les boutons d'action
   */
  updateActionButtons() {
    // Cette méthode est gérée par BattleScene
    console.log('🎮 [BattleUI] Mise à jour boutons d\'action');
  }

  /**
   * Ajoute un message au log de combat
   */
  addLogMessage(message) {
    // Cette méthode est gérée par BattleScene
    console.log(`💬 [BattleUI] Message: ${message}`);
  }

  /**
   * Affiche l'interface
   */
  show() {
    console.log('👁️ [BattleUI] Affichage de l\'interface');
    
    if (this.backgroundContainer) {
      this.backgroundContainer.setVisible(true);
    }
    
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(true);
    }
    
    if (this.uiContainer) {
      this.uiContainer.setVisible(true);
    }
  }

  /**
   * Cache l'interface
   */
  hide() {
    console.log('👁️ [BattleUI] Masquage de l\'interface');
    
    if (this.backgroundContainer) {
      this.backgroundContainer.setVisible(false);
    }
    
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(false);
    }
    
    if (this.uiContainer) {
      this.uiContainer.setVisible(false);
    }
    
    // Cacher les barres de vie
    if (this.playerHealthBar?.container) {
      this.playerHealthBar.container.setVisible(false);
    }
    
    if (this.opponentHealthBar?.container) {
      this.opponentHealthBar.container.setVisible(false);
    }
  }

  /**
   * Remet à zéro l'interface
   */
  reset() {
    console.log('🔄 [BattleUI] Reset de l\'interface');
    
    // Supprimer les sprites de Pokémon
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
      this.playerPokemonSprite = null;
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
      this.opponentPokemonSprite = null;
    }
    
    // Réinitialiser les données
    this.playerPokemonData = null;
    this.opponentPokemonData = null;
    
    // Cacher les barres de vie
    this.hide();
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [BattleUI] Destruction...');
    
    // Nettoyer les sprites
    if (this.playerPokemonSprite) {
      this.playerPokemonSprite.destroy();
    }
    
    if (this.opponentPokemonSprite) {
      this.opponentPokemonSprite.destroy();
    }
    
    // Nettoyer les conteneurs
    if (this.pokemonContainer) {
      this.pokemonContainer.destroy();
    }
    
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }
    
    if (this.backgroundContainer) {
      this.backgroundContainer.destroy();
    }
    
    // Nettoyer les barres de vie
    if (this.playerHealthBar?.container) {
      this.playerHealthBar.container.destroy();
    }
    
    if (this.opponentHealthBar?.container) {
      this.opponentHealthBar.container.destroy();
    }
    
    console.log('✅ [BattleUI] Interface détruite');
  }
}
