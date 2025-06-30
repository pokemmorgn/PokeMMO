// client/src/Battle/BattleUI.js - Interface utilisateur du combat
export class BattleUI {
  constructor(scene, battleManager) {
    this.scene = scene;
    this.battleManager = battleManager;
    
    // Éléments Phaser
    this.background = null;
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
    
    // État
    this.isInitialized = false;
    
    console.log('🎨 [BattleUI] Constructeur initialisé');
  }

  // === INITIALISATION ===

  initialize() {
    console.log('🔧 [BattleUI] Initialisation...');
    
    if (!this.scene) {
      console.error('❌ [BattleUI] Scene manquante');
      return;
    }
    
    try {
      this.createBackground();
      this.createPokemonContainers();
      this.createHealthBars();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ [BattleUI] Interface initialisée');
      
    } catch (error) {
      console.error('❌ [BattleUI] Erreur lors de l\'initialisation:', error);
    }
  }

  // === CRÉATION DU BACKGROUND ===

  createBackground() {
    console.log('🖼️ [BattleUI] Création du background...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Background principal (dégradé ciel vers herbe)
    this.background = this.scene.add.graphics();
    this.background.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x228B22, 0x32CD32);
    this.background.fillRect(0, 0, width, height);
    this.background.setDepth(-100);
    
    // Ligne d'horizon
    const horizonY = height * 0.6;
    this.background.lineStyle(2, 0x2F4F2F, 0.5);
    this.background.lineBetween(0, horizonY, width, horizonY);
    
    // Plateforme joueur (plus proche, plus basse)
    const playerPlatform = this.scene.add.ellipse(
      width * 0.25, height * 0.75, 
      120, 40, 
      0x228B22, 0.3
    );
    playerPlatform.setDepth(-50);
    
    // Plateforme adversaire (plus loin, plus haute)
    const opponentPlatform = this.scene.add.ellipse(
      width * 0.75, height * 0.45, 
      100, 30, 
      0x32CD32, 0.3
    );
    opponentPlatform.setDepth(-50);
    
    console.log('✅ [BattleUI] Background créé');
  }

  // === CRÉATION DES CONTENEURS POKÉMON ===

  createPokemonContainers() {
    console.log('🐾 [BattleUI] Création des conteneurs Pokémon...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Conteneur principal pour les Pokémon
    this.pokemonContainer = this.scene.add.container(0, 0);
    this.pokemonContainer.setDepth(10);
    
    // Positions des Pokémon (style classique Pokémon)
    this.playerPokemonPos = {
      x: width * 0.25,
      y: height * 0.65
    };
    
    this.opponentPokemonPos = {
      x: width * 0.75,
      y: height * 0.35
    };
    
    console.log('✅ [BattleUI] Conteneurs créés');
  }

  // === CRÉATION DES BARRES DE VIE ===

  createHealthBars() {
    console.log('❤️ [BattleUI] Création des barres de vie...');
    
    const { width, height } = this.scene.cameras.main;
    
    // Conteneur pour l'UI
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setDepth(50);
    
    // Barre de vie adversaire (en haut à droite)
    this.opponentHealthBar = this.createHealthBarGroup(
      width - 220, 20, 'opponent'
    );
    
    // Barre de vie joueur (en bas à gauche)
    this.playerHealthBar = this.createHealthBarGroup(
      20, height - 120, 'player'
    );
    
    console.log('✅ [BattleUI] Barres de vie créées');
  }

  createHealthBarGroup(x, y, type) {
    const container = this.scene.add.container(x, y);
    container.setDepth(60);
    
    // Background de la barre de vie
    const bgWidth = 200;
    const bgHeight = 60;
    
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(0, 0, bgWidth, bgHeight, 8);
    background.lineStyle(2, 0xFFFFFF, 0.8);
    background.strokeRoundedRect(0, 0, bgWidth, bgHeight, 8);
    
    // Nom du Pokémon
    const nameText = this.scene.add.text(10, 8, 'Pokémon', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold'
    });
    
    // Niveau
    const levelText = this.scene.add.text(bgWidth - 40, 8, 'Lv5', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFF99'
    });
    
    // Container pour la barre de HP
    const hpBarBg = this.scene.add.graphics();
    hpBarBg.fillStyle(0x404040);
    hpBarBg.fillRoundedRect(10, 28, 120, 8, 4);
    
    const hpBarFill = this.scene.add.graphics();
    hpBarFill.fillStyle(0x00FF00);
    hpBarFill.fillRoundedRect(10, 28, 120, 8, 4);
    
    // Texte HP (seulement pour le joueur)
    let hpText = null;
    if (type === 'player') {
      hpText = this.scene.add.text(10, 42, '20/20', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF'
      });
    }
    
    // Indicateur de statut
    const statusIcon = this.scene.add.text(bgWidth - 20, 28, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif'
    });
    
    // Ajouter tout au container
    container.add([background, nameText, levelText, hpBarBg, hpBarFill, statusIcon]);
    if (hpText) container.add(hpText);
    
    // Cacher par défaut
    container.setVisible(false);
    
    return {
      container: container,
      nameText: nameText,
      levelText: levelText,
      hpBarBg: hpBarBg,
      hpBarFill: hpBarFill,
      hpText: hpText,
      statusIcon: statusIcon,
      maxWidth: 120
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
    
    // Créer le sprite (vue de dos pour le joueur)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId, 'back');
    this.playerPokemonSprite = this.scene.add.sprite(
      this.playerPokemonPos.x,
      this.playerPokemonPos.y,
      spriteKey
    );
    
    // Configuration du sprite
    this.playerPokemonSprite.setScale(2.5); // Plus gros car plus proche
    this.playerPokemonSprite.setDepth(20);
    
    // Animation d'entrée
    this.animatePokemonEntry(this.playerPokemonSprite, 'left');
    
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
    
    // Créer le sprite (vue de face pour l'adversaire)
    const spriteKey = this.getPokemonSpriteKey(pokemonData.pokemonId, 'front');
    this.opponentPokemonSprite = this.scene.add.sprite(
      this.opponentPokemonPos.x,
      this.opponentPokemonPos.y,
      spriteKey
    );
    
    // Configuration du sprite
    this.opponentPokemonSprite.setScale(2.0); // Plus petit car plus loin
    this.opponentPokemonSprite.setDepth(20);
    
    // Effet shiny si applicable
    if (pokemonData.shiny) {
      this.addShinyEffect(this.opponentPokemonSprite);
    }
    
    // Animation d'entrée
    this.animatePokemonEntry(this.opponentPokemonSprite, 'right');
    
    // Mettre à jour la barre de vie
    this.updateOpponentHealthBar(pokemonData);
    
    console.log('✅ [BattleUI] Pokémon adversaire affiché');
  }

  // === MISE À JOUR DES BARRES DE VIE ===

  updatePlayerHealthBar(pokemonData) {
    if (!this.playerHealthBar || !pokemonData) return;
    
    const { nameText, levelText, hpBarFill, hpText, statusIcon, container, maxWidth } = this.playerHealthBar;
    
    // Nom et niveau
    nameText.setText(pokemonData.name || 'Pokémon');
    levelText.setText(`Lv${pokemonData.level || 1}`);
    
    // Barre de HP
    const hpPercent = pokemonData.maxHp > 0 ? pokemonData.currentHp / pokemonData.maxHp : 0;
    const barWidth = Math.max(0, maxWidth * hpPercent);
    
    // Couleur selon les HP
    let hpColor = 0x00FF00; // Vert
    if (hpPercent < 0.5) hpColor = 0xFFFF00; // Jaune
    if (hpPercent < 0.2) hpColor = 0xFF0000; // Rouge
    
    hpBarFill.clear();
    hpBarFill.fillStyle(hpColor);
    hpBarFill.fillRoundedRect(10, 28, barWidth, 8, 4);
    
    // Texte HP
    if (hpText) {
      hpText.setText(`${pokemonData.currentHp}/${pokemonData.maxHp}`);
    }
    
    // Statut
    const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    container.setVisible(true);
    
    // Animation si HP faibles
    if (hpPercent < 0.2 && hpPercent > 0) {
      this.addLowHpAnimation(container);
    }
  }

  updateOpponentHealthBar(pokemonData) {
    if (!this.opponentHealthBar || !pokemonData) return;
    
    const { nameText, levelText, hpBarFill, statusIcon, container, maxWidth } = this.opponentHealthBar;
    
    // Nom et niveau
    nameText.setText(pokemonData.name || 'Pokémon');
    levelText.setText(`Lv${pokemonData.level || 1}`);
    
    // Barre de HP
    const hpPercent = pokemonData.maxHp > 0 ? pokemonData.currentHp / pokemonData.maxHp : 0;
    const barWidth = Math.max(0, maxWidth * hpPercent);
    
    // Couleur selon les HP
    let hpColor = 0x00FF00; // Vert
    if (hpPercent < 0.5) hpColor = 0xFFFF00; // Jaune
    if (hpPercent < 0.2) hpColor = 0xFF0000; // Rouge
    
    hpBarFill.clear();
    hpBarFill.fillStyle(hpColor);
    hpBarFill.fillRoundedRect(10, 28, barWidth, 8, 4);
    
    // Statut
    const statusEmoji = this.getStatusEmoji(pokemonData.statusCondition);
    statusIcon.setText(statusEmoji);
    
    // Afficher la barre
    container.setVisible(true);
  }

  // === ANIMATIONS ===

  animatePokemonEntry(sprite, direction) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    const originalY = sprite.y;
    
    // Position de départ (hors écran)
    const startX = direction === 'left' ? -100 : this.scene.cameras.main.width + 100;
    sprite.setPosition(startX, originalY);
    sprite.setAlpha(0);
    
    // Animation d'entrée
    this.scene.tweens.add({
      targets: sprite,
      x: originalX,
      alpha: 1,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Petite animation d'atterrissage
        this.scene.tweens.add({
          targets: sprite,
          y: originalY + 10,
          duration: 200,
          yoyo: true,
          ease: 'Bounce.easeOut'
        });
      }
    });
  }

  addShinyEffect(sprite) {
    if (!sprite) return;
    
    // Effet scintillant pour les Pokémon shiny
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Particules dorées
    this.createShinyParticles(sprite.x, sprite.y);
  }

  createShinyParticles(x, y) {
    // TODO: Ajouter des particules dorées
    console.log('✨ [BattleUI] Effet shiny à implémenter');
  }

  addLowHpAnimation(container) {
    if (!container) return;
    
    // Animation de clignotement pour HP bas
    this.scene.tweens.add({
      targets: container,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
  }

  // === ANIMATIONS D'ATTAQUE ===

  animateAttack(attackerType, targetType, moveData) {
    console.log(`💥 [BattleUI] Animation attaque: ${attackerType} → ${targetType}`);
    
    const attacker = attackerType === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
    const target = targetType === 'player' ? this.playerPokemonSprite : this.opponentPokemonSprite;
    
    if (!attacker || !target) return;
    
    // Animation de l'attaquant
    this.scene.tweens.add({
      targets: attacker,
      x: attacker.x + (attackerType === 'player' ? 50 : -50),
      duration: 300,
      yoyo: true,
      ease: 'Power2.easeOut'
    });
    
    // Animation du défenseur (dégâts)
    setTimeout(() => {
      this.animateHit(target);
    }, 300);
  }

  animateHit(sprite) {
    if (!sprite) return;
    
    // Secousse
    this.scene.tweens.add({
      targets: sprite,
      x: sprite.x + 10,
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Power2.easeInOut'
    });
    
    // Flash rouge
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFF0000,
      duration: 200,
      yoyo: true,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.clearTint();
      }
    });
  }

  // === MÉTHODES UTILITAIRES ===

  getPokemonSpriteKey(pokemonId, view = 'front') {
    // Retourner le sprite approprié ou un placeholder
    const spriteKey = `pokemon_${pokemonId}_${view}`;
    
    // Vérifier si le sprite existe, sinon utiliser placeholder
    if (this.scene.textures.exists(spriteKey)) {
      return spriteKey;
    } else {
      console.warn(`⚠️ [BattleUI] Sprite manquant: ${spriteKey}, utilisation placeholder`);
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
      'confusion': '😵'
    };
    
    return statusEmojis[status] || '';
  }

  // === EFFETS SPÉCIAUX ===

  showDamageNumber(damage, target) {
    if (!target || damage <= 0) return;
    
    const damageText = this.scene.add.text(target.x, target.y - 50, `-${damage}`, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FF0000',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 2
    });
    
    damageText.setOrigin(0.5);
    damageText.setDepth(100);
    
    // Animation du nombre de dégâts
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 100,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  showHealNumber(heal, target) {
    if (!target || heal <= 0) return;
    
    const healText = this.scene.add.text(target.x, target.y - 50, `+${heal}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#00FF00',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 2
    });
    
    healText.setOrigin(0.5);
    healText.setDepth(100);
    
    // Animation du nombre de soins
    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 80,
      alpha: 0,
      scale: 1.2,
      duration: 1200,
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
    
    const effectText = this.scene.add.text(target.x, target.y - 30, effectEmoji, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif'
    });
    
    effectText.setOrigin(0.5);
    effectText.setDepth(100);
    
    // Animation de l'effet de statut
    this.scene.tweens.add({
      targets: effectText,
      y: effectText.y - 60,
      alpha: 0,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        effectText.destroy();
      }
    });
  }

  // === ANIMATIONS DE CAPTURE ===

  animateCapture(ballType, targetPokemon) {
    console.log(`🎯 [BattleUI] Animation de capture: ${ballType}`);
    
    if (!targetPokemon || !this.opponentPokemonSprite) return;
    
    // Créer la Poké Ball
    const ballSprite = this.scene.add.sprite(
      this.playerPokemonPos.x,
      this.playerPokemonPos.y - 50,
      'poke_ball' // Placeholder
    );
    ballSprite.setScale(0.5);
    ballSprite.setDepth(30);
    
    // Animation de lancer
    this.scene.tweens.add({
      targets: ballSprite,
      x: this.opponentPokemonSprite.x,
      y: this.opponentPokemonSprite.y - 20,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Animation de capture
        this.animatePokemonCapture(ballSprite);
      }
    });
  }

  animatePokemonCapture(ballSprite) {
    if (!this.opponentPokemonSprite) return;
    
    // Flash blanc
    const flash = this.scene.add.rectangle(
      this.opponentPokemonSprite.x,
      this.opponentPokemonSprite.y,
      100, 100,
      0xFFFFFF
    );
    flash.setDepth(40);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Faire disparaître le Pokémon
    this.scene.tweens.add({
      targets: this.opponentPokemonSprite,
      alpha: 0,
      scale: 0.1,
      duration: 300
    });
    
    // Animation de la Ball qui secoue
    this.animateBallShakes(ballSprite);
  }

  animateBallShakes(ballSprite, shakes = 3) {
    let currentShake = 0;
    
    const shake = () => {
      if (currentShake >= shakes) {
        // Fin des secousses - succès ou échec déterminé ailleurs
        return;
      }
      
      currentShake++;
      
      // Secousse de la Ball
      this.scene.tweens.add({
        targets: ballSprite,
        rotation: 0.3,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          setTimeout(shake, 500);
        }
      });
    };
    
    setTimeout(shake, 500);
  }

  // === GESTION DES TYPES DE POKÉMON ===

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
    
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(true);
    }
    
    if (this.uiContainer) {
      this.uiContainer.setVisible(true);
    }
    
    if (this.background) {
      this.background.setVisible(true);
    }
  }

  /**
   * Cache l'interface
   */
  hide() {
    console.log('👁️ [BattleUI] Masquage de l\'interface');
    
    if (this.pokemonContainer) {
      this.pokemonContainer.setVisible(false);
    }
    
    if (this.uiContainer) {
      this.uiContainer.setVisible(false);
    }
    
    if (this.background) {
      this.background.setVisible(false);
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
    
    // Nettoyer le background
    if (this.background) {
      this.background.destroy();
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
