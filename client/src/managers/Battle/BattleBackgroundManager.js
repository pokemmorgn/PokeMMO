// client/src/managers/Battle/BattleBackgroundManager.js
// Gestionnaire des backgrounds et environnements de combat

export class BattleBackgroundManager {
  constructor(scene) {
    this.scene = scene;
    
    // Éléments visuels
    this.background = null;
    this.groundLayer = null;
    this.platforms = [];
    this.effects = [];
    
    // Configuration
    this.backgroundType = 'default';
    this.environmentData = null;
    
    // Positions des plateformes (% de l'écran)
    this.platformPositions = {
      player: { x: 0.25, y: 0.85, size: 120 },
      opponent: { x: 0.75, y: 0.45, size: 80 }
    };
    
    console.log('🏞️ [BattleBackgroundManager] Initialisé');
  }

  // === CRÉATION DE L'ENVIRONNEMENT ===

  /**
   * Crée l'environnement de combat complet
   */
  createEnvironment(environmentType = 'grass', locationData = null) {
    console.log(`🏞️ [BattleBackgroundManager] Création environnement: ${environmentType}`);
    
    this.backgroundType = environmentType;
    this.environmentData = locationData;
    
    const { width, height } = this.scene.cameras.main;
    
    // 1. Background principal
    this.createBackground(width, height);
    
    // 2. Sol et terrain
    this.createGroundLayer(width, height);
    
    // 3. Plateformes de combat
    this.createBattlePlatforms(width, height);
    
    // 4. Effets d'ambiance
    this.createAmbientEffects();
    
    console.log('✅ [BattleBackgroundManager] Environnement créé');
  }

  /**
   * Crée le background principal
   */
  createBackground(width, height) {
    // Essayer d'utiliser l'image de background
    if (this.scene.textures.exists('battlebg01')) {
      this.background = this.scene.add.image(width/2, height/2, 'battlebg01');
      
      // Ajuster la taille pour couvrir l'écran
      const scaleX = width / this.background.width;
      const scaleY = height / this.background.height;
      const scale = Math.max(scaleX, scaleY) * 1.1;
      
      this.background.setScale(scale);
      this.background.setDepth(-100);
      
      // Teinte selon l'environnement
      const environmentTint = this.getEnvironmentTint();
      if (environmentTint !== 0xFFFFFF) {
        this.background.setTint(environmentTint);
      }
      
      console.log('🖼️ [BattleBackgroundManager] Background image utilisé');
    } else {
      // Fallback avec gradient
      this.createGradientBackground(width, height);
    }
  }

  /**
   * Crée un background en dégradé (fallback)
   */
  createGradientBackground(width, height) {
    this.background = this.scene.add.graphics();
    
    const colors = this.getEnvironmentColors();
    
    // Dégradé vertical
    this.background.fillGradientStyle(
      colors.skyTop, colors.skyTop,
      colors.skyBottom, colors.groundTop
    );
    this.background.fillRect(0, 0, width, height);
    this.background.setDepth(-100);
    
    console.log('🎨 [BattleBackgroundManager] Background dégradé créé');
  }

  /**
   * Crée la couche de sol
   */
  createGroundLayer(width, height) {
    this.groundLayer = this.scene.add.graphics();
    
    const colors = this.getEnvironmentColors();
    const groundY = height * 0.75;
    
    // Sol principal
    this.groundLayer.fillStyle(colors.ground, 0.3);
    this.groundLayer.fillRect(0, groundY, width, height - groundY);
    
    // Ligne d'horizon
    this.groundLayer.lineStyle(2, colors.horizonLine, 0.4);
    this.groundLayer.lineBetween(0, groundY, width, groundY);
    
    // Texture du sol selon l'environnement
    this.addGroundTexture(width, height, groundY);
    
    this.groundLayer.setDepth(-60);
  }

  /**
   * Ajoute de la texture au sol
   */
  addGroundTexture(width, height, groundY) {
    const colors = this.getEnvironmentColors();
    
    switch (this.backgroundType) {
      case 'grass':
        this.addGrassTexture(width, height, groundY, colors);
        break;
      case 'cave':
        this.addCaveTexture(width, height, groundY, colors);
        break;
      case 'water':
        this.addWaterTexture(width, height, groundY, colors);
        break;
      case 'desert':
        this.addDesertTexture(width, height, groundY, colors);
        break;
      default:
        this.addDefaultTexture(width, height, groundY, colors);
    }
  }

  /**
   * Texture herbe
   */
  addGrassTexture(width, height, groundY, colors) {
    // Petites lignes d'herbe
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = groundY + Math.random() * 20;
      
      this.groundLayer.lineStyle(1, 0x228B22, 0.6);
      this.groundLayer.lineBetween(x, y, x, y - 5 - Math.random() * 8);
    }
  }

  /**
   * Texture cave
   */
  addCaveTexture(width, height, groundY, colors) {
    // Rochers et pierres
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = groundY + Math.random() * 30;
      const size = 3 + Math.random() * 8;
      
      this.groundLayer.fillStyle(0x696969, 0.5);
      this.groundLayer.fillCircle(x, y, size);
    }
  }

  /**
   * Texture eau
   */
  addWaterTexture(width, height, groundY, colors) {
    // Petites vagues
    for (let i = 0; i < width; i += 20) {
      this.groundLayer.lineStyle(2, 0x4682B4, 0.4);
      this.groundLayer.beginPath();
      this.groundLayer.moveTo(i, groundY + 10);
      this.groundLayer.quadraticCurveTo(i + 10, groundY + 5, i + 20, groundY + 10);
      this.groundLayer.strokePath();
    }
  }

  /**
   * Texture désert
   */
  addDesertTexture(width, height, groundY, colors) {
    // Ondulations de sable
    for (let i = 0; i < width; i += 30) {
      this.groundLayer.lineStyle(1, 0xF4A460, 0.3);
      this.groundLayer.beginPath();
      this.groundLayer.moveTo(i, groundY + 15);
      this.groundLayer.quadraticCurveTo(i + 15, groundY + 10, i + 30, groundY + 15);
      this.groundLayer.strokePath();
    }
  }

  /**
   * Texture par défaut
   */
  addDefaultTexture(width, height, groundY, colors) {
    // Points dispersés
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = groundY + Math.random() * 25;
      
      this.groundLayer.fillStyle(colors.ground, 0.4);
      this.groundLayer.fillCircle(x, y, 2);
    }
  }

  /**
   * Crée les plateformes de combat
   */
  createBattlePlatforms(width, height) {
    // Plateforme joueur
    const playerPlatform = this.createPlatform(
      width * this.platformPositions.player.x,
      height * this.platformPositions.player.y,
      this.platformPositions.player.size,
      'player'
    );
    this.platforms.push(playerPlatform);
    
    // Plateforme adversaire
    const opponentPlatform = this.createPlatform(
      width * this.platformPositions.opponent.x,
      height * this.platformPositions.opponent.y,
      this.platformPositions.opponent.size,
      'opponent'
    );
    this.platforms.push(opponentPlatform);
    
    console.log('⭕ [BattleBackgroundManager] Plateformes créées');
  }

  /**
   * Crée une plateforme individuelle
   */
  createPlatform(x, y, size, type) {
    const platform = this.scene.add.graphics();
    const colors = this.getEnvironmentColors();
    
    // Ombre
    platform.fillStyle(0x000000, 0.2);
    platform.fillEllipse(x + 5, y + 5, size, size * 0.3);
    
    // Plateforme principale
    const platformColor = type === 'player' ? colors.playerPlatform : colors.opponentPlatform;
    platform.fillStyle(platformColor, 0.7);
    platform.fillEllipse(x, y, size, size * 0.3);
    
    // Bordure
    const borderColor = type === 'player' ? colors.playerBorder : colors.opponentBorder;
    platform.lineStyle(2, borderColor, 0.8);
    platform.strokeEllipse(x, y, size, size * 0.3);
    
    // Détails selon l'environnement
    this.addPlatformDetails(platform, x, y, size, type);
    
    platform.setDepth(type === 'player' ? 10 : 5);
    
    return platform;
  }

  /**
   * Ajoute des détails aux plateformes selon l'environnement
   */
  addPlatformDetails(platform, x, y, size, type) {
    switch (this.backgroundType) {
      case 'grass':
        // Petits brins d'herbe
        for (let i = 0; i < 5; i++) {
          const px = x + (Math.random() - 0.5) * size * 0.6;
          const py = y + (Math.random() - 0.5) * size * 0.1;
          platform.lineStyle(1, 0x32CD32, 0.7);
          platform.lineBetween(px, py, px, py - 3);
        }
        break;
      case 'cave':
        // Petits cailloux
        for (let i = 0; i < 3; i++) {
          const px = x + (Math.random() - 0.5) * size * 0.5;
          const py = y + (Math.random() - 0.5) * size * 0.1;
          platform.fillStyle(0x708090, 0.6);
          platform.fillCircle(px, py, 2);
        }
        break;
      case 'water':
        // Reflets d'eau
        platform.lineStyle(1, 0x87CEEB, 0.5);
        platform.strokeEllipse(x, y - 2, size * 0.8, size * 0.2);
        break;
    }
  }

  // === EFFETS D'AMBIANCE ===

  /**
   * Crée les effets d'ambiance
   */
  createAmbientEffects() {
    switch (this.backgroundType) {
      case 'grass':
        this.createGrassEffects();
        break;
      case 'cave':
        this.createCaveEffects();
        break;
      case 'water':
        this.createWaterEffects();
        break;
      case 'desert':
        this.createDesertEffects();
        break;
    }
  }

  /**
   * Effets pour environnement herbe
   */
  createGrassEffects() {
    // Particules de pollen flottantes
    this.createFloatingParticles(0x98FB98, 8, {
      speed: 0.5,
      drift: true,
      fadeInOut: true
    });
  }

  /**
   * Effets pour environnement cave
   */
  createCaveEffects() {
    // Particules de poussière
    this.createFloatingParticles(0xD3D3D3, 12, {
      speed: 0.3,
      drift: false,
      fadeInOut: true
    });
  }

  /**
   * Effets pour environnement eau
   */
  createWaterEffects() {
    // Bulles d'eau
    this.createBubbleEffect();
    
    // Reflets lumineux
    this.createWaterReflections();
  }

  /**
   * Effets pour environnement désert
   */
  createDesertEffects() {
    // Particules de sable
    this.createFloatingParticles(0xF4A460, 15, {
      speed: 1.2,
      drift: true,
      fadeInOut: false
    });
  }

  /**
   * Crée des particules flottantes
   */
  createFloatingParticles(color, count, options = {}) {
    const { width, height } = this.scene.cameras.main;
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createSingleParticle(color, width, height, options);
      }, i * 300);
    }
  }

  /**
   * Crée une particule individuelle
   */
  createSingleParticle(color, width, height, options) {
    const particle = this.scene.add.graphics();
    particle.fillStyle(color, 0.6);
    particle.fillCircle(0, 0, 1 + Math.random() * 2);
    
    // Position aléatoire
    particle.setPosition(
      Math.random() * width,
      height + 20
    );
    particle.setDepth(-10);
    
    // Animation de mouvement
    const targetY = -50;
    const drift = options.drift ? (Math.random() - 0.5) * 100 : 0;
    
    this.scene.tweens.add({
      targets: particle,
      y: targetY,
      x: particle.x + drift,
      duration: 8000 / (options.speed || 1),
      ease: 'Linear',
      onComplete: () => {
        particle.destroy();
        // Recréer une nouvelle particule
        setTimeout(() => {
          this.createSingleParticle(color, width, height, options);
        }, Math.random() * 3000);
      }
    });
    
    // Effet de fade si demandé
    if (options.fadeInOut) {
      this.scene.tweens.add({
        targets: particle,
        alpha: 0.2,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    this.effects.push(particle);
  }

  /**
   * Crée un effet de bulles pour l'eau
   */
  createBubbleEffect() {
    const { width, height } = this.scene.cameras.main;
    
    // Créer des bulles périodiquement
    const createBubble = () => {
      const bubble = this.scene.add.graphics();
      bubble.lineStyle(1, 0x87CEEB, 0.8);
      bubble.strokeCircle(0, 0, 3 + Math.random() * 5);
      
      bubble.setPosition(
        Math.random() * width,
        height * 0.75 + Math.random() * 50
      );
      bubble.setDepth(-10);
      
      // Animation vers le haut
      this.scene.tweens.add({
        targets: bubble,
        y: bubble.y - 100 - Math.random() * 50,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 3000 + Math.random() * 2000,
        ease: 'Power2.easeOut',
        onComplete: () => bubble.destroy()
      });
      
      this.effects.push(bubble);
    };
    
    // Créer une bulle toutes les 2-4 secondes
    const bubbleInterval = setInterval(createBubble, 2000 + Math.random() * 2000);
    
    // Nettoyer l'intervalle plus tard
    this.scene.events.once('shutdown', () => {
      clearInterval(bubbleInterval);
    });
  }

  /**
   * Crée des reflets lumineux sur l'eau
   */
  createWaterReflections() {
    const { width, height } = this.scene.cameras.main;
    const groundY = height * 0.75;
    
    for (let i = 0; i < 5; i++) {
      const reflection = this.scene.add.graphics();
      reflection.fillStyle(0xFFFFFF, 0.3);
      reflection.fillEllipse(0, 0, 20 + Math.random() * 30, 5);
      
      reflection.setPosition(
        Math.random() * width,
        groundY + 10 + Math.random() * 20
      );
      reflection.setDepth(-20);
      
      // Animation de scintillement
      this.scene.tweens.add({
        targets: reflection,
        alpha: 0,
        scaleX: 1.5,
        duration: 1000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.effects.push(reflection);
    }
  }

  // === CONFIGURATION DES COULEURS ===

  /**
   * Obtient les couleurs selon l'environnement
   */
  getEnvironmentColors() {
    switch (this.backgroundType) {
      case 'grass':
        return {
          skyTop: 0x87CEEB,
          skyBottom: 0x98FB98,
          groundTop: 0x32CD32,
          ground: 0x228B22,
          horizonLine: 0x2F4F2F,
          playerPlatform: 0x8B4513,
          opponentPlatform: 0x696969,
          playerBorder: 0x654321,
          opponentBorder: 0x555555
        };
      
      case 'cave':
        return {
          skyTop: 0x2F2F2F,
          skyBottom: 0x1C1C1C,
          groundTop: 0x696969,
          ground: 0x404040,
          horizonLine: 0x2F2F2F,
          playerPlatform: 0x708090,
          opponentPlatform: 0x556B2F,
          playerBorder: 0x2F4F4F,
          opponentBorder: 0x2F2F2F
        };
      
      case 'water':
        return {
          skyTop: 0x87CEEB,
          skyBottom: 0x4682B4,
          groundTop: 0x1E90FF,
          ground: 0x0066CC,
          horizonLine: 0x4169E1,
          playerPlatform: 0x8B4513,
          opponentPlatform: 0x696969,
          playerBorder: 0x654321,
          opponentBorder: 0x4682B4
        };
      
      case 'desert':
        return {
          skyTop: 0xFFE4B5,
          skyBottom: 0xF4A460,
          groundTop: 0xDEB887,
          ground: 0xD2B48C,
          horizonLine: 0xCD853F,
          playerPlatform: 0x8B4513,
          opponentPlatform: 0x696969,
          playerBorder: 0x654321,
          opponentBorder: 0xA0522D
        };
      
      default:
        return {
          skyTop: 0x87CEEB,
          skyBottom: 0x98FB98,
          groundTop: 0x32CD32,
          ground: 0x228B22,
          horizonLine: 0x2F4F2F,
          playerPlatform: 0x8B4513,
          opponentPlatform: 0x696969,
          playerBorder: 0x654321,
          opponentBorder: 0x555555
        };
    }
  }

  /**
   * Obtient la teinte d'environnement pour l'image de fond
   */
  getEnvironmentTint() {
    switch (this.backgroundType) {
      case 'grass':
        return 0xF0F8FF; // Légèrement bleuté
      case 'cave':
        return 0x808080; // Gris sombre
      case 'water':
        return 0xE0F6FF; // Bleu clair
      case 'desert':
        return 0xFFF8DC; // Beige chaud
      default:
        return 0xFFFFFF; // Pas de teinte
    }
  }

  // === TRANSITIONS ET ANIMATIONS ===

  /**
   * Change l'environnement avec transition
   */
  async changeEnvironment(newType, transitionDuration = 1000) {
    console.log(`🔄 [BattleBackgroundManager] Transition vers: ${newType}`);
    
    // Fade out actuel
    const currentElements = [this.background, this.groundLayer, ...this.platforms];
    
    await new Promise(resolve => {
      this.scene.tweens.add({
        targets: currentElements,
        alpha: 0,
        duration: transitionDuration / 2,
        ease: 'Power2.easeIn',
        onComplete: resolve
      });
    });
    
    // Nettoyer l'ancien
    this.clearEnvironment();
    
    // Créer le nouveau
    this.createEnvironment(newType);
    
    // Fade in nouveau
    const newElements = [this.background, this.groundLayer, ...this.platforms];
    newElements.forEach(element => element.setAlpha(0));
    
    this.scene.tweens.add({
      targets: newElements,
      alpha: 1,
      duration: transitionDuration / 2,
      ease: 'Power2.easeOut'
    });
    
    console.log('✅ [BattleBackgroundManager] Transition terminée');
  }

  /**
   * Applique un effet de météo
   */
  applyWeatherEffect(weatherType, intensity = 1) {
    console.log(`🌤️ [BattleBackgroundManager] Effet météo: ${weatherType}`);
    
    switch (weatherType) {
      case 'rain':
        this.createRainEffect(intensity);
        break;
      case 'sun':
        this.createSunEffect(intensity);
        break;
      case 'sandstorm':
        this.createSandstormEffect(intensity);
        break;
      case 'snow':
        this.createSnowEffect(intensity);
        break;
      case 'fog':
        this.createFogEffect(intensity);
        break;
    }
  }

  /**
   * Effet de pluie
   */
  createRainEffect(intensity) {
    const { width, height } = this.scene.cameras.main;
    const dropCount = Math.floor(30 * intensity);
    
    for (let i = 0; i < dropCount; i++) {
      setTimeout(() => {
        this.createRainDrop(width, height);
      }, i * 50);
    }
  }

  /**
   * Crée une goutte de pluie
   */
  createRainDrop(width, height) {
    const drop = this.scene.add.graphics();
    drop.lineStyle(2, 0x87CEEB, 0.7);
    drop.lineBetween(0, 0, 0, 8);
    
    drop.setPosition(
      Math.random() * (width + 100) - 50,
      -20
    );
    drop.setDepth(-5);
    
    this.scene.tweens.add({
      targets: drop,
      y: height + 20,
      x: drop.x - 30, // Effet de vent
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        drop.destroy();
        // Recréer une goutte
        setTimeout(() => {
          this.createRainDrop(width, height);
        }, Math.random() * 500);
      }
    });
    
    this.effects.push(drop);
  }

  /**
   * Effet de soleil
   */
  createSunEffect(intensity) {
    if (this.background) {
      // Effet de luminosité
      this.scene.tweens.add({
        targets: this.background,
        tint: 0xFFFFAA,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /**
   * Effet de tempête de sable
   */
  createSandstormEffect(intensity) {
    this.createFloatingParticles(0xF4A460, Math.floor(25 * intensity), {
      speed: 2 * intensity,
      drift: true,
      fadeInOut: false
    });
  }

  /**
   * Effet de neige
   */
  createSnowEffect(intensity) {
    this.createFloatingParticles(0xFFFFFF, Math.floor(20 * intensity), {
      speed: 0.4 / intensity,
      drift: true,
      fadeInOut: true
    });
  }

  /**
   * Effet de brouillard
   */
  createFogEffect(intensity) {
    const { width, height } = this.scene.cameras.main;
    
    const fog = this.scene.add.graphics();
    fog.fillStyle(0xFFFFFF, 0.3 * intensity);
    fog.fillRect(0, 0, width, height);
    fog.setDepth(-30);
    
    // Animation de mouvement
    this.scene.tweens.add({
      targets: fog,
      alpha: 0.1 * intensity,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.effects.push(fog);
  }

  // === GETTERS ET SETTERS ===

  /**
   * Obtient le type d'environnement actuel
   */
  getEnvironmentType() {
    return this.backgroundType;
  }

  /**
   * Obtient les positions des plateformes
   */
  getPlatformPositions() {
    return this.platformPositions;
  }

  /**
   * Modifie les positions des plateformes
   */
  setPlatformPositions(newPositions) {
    this.platformPositions = { ...this.platformPositions, ...newPositions };
  }

  // === UTILITAIRES ===

  /**
   * Redimensionne l'environnement
   */
  resize() {
    const { width, height } = this.scene.cameras.main;
    
    // Redimensionner le background
    if (this.background && this.background.setDisplaySize) {
      const scaleX = width / this.background.width;
      const scaleY = height / this.background.height;
      const scale = Math.max(scaleX, scaleY) * 1.1;
      this.background.setScale(scale);
      this.background.setPosition(width/2, height/2);
    }
    
    // Recréer les autres éléments si nécessaire
    if (this.groundLayer) {
      this.groundLayer.destroy();
    }
    this.createGroundLayer(width, height);
    
    // Repositionner les plateformes
    this.platforms.forEach(platform => platform.destroy());
    this.platforms = [];
    this.createBattlePlatforms(width, height);
  }

  /**
   * Met en pause les effets d'ambiance
   */
  pauseEffects() {
    this.effects.forEach(effect => {
      if (effect.setVisible) {
        effect.setVisible(false);
      }
    });
  }

  /**
   * Reprend les effets d'ambiance
   */
  resumeEffects() {
    this.effects.forEach(effect => {
      if (effect.setVisible) {
        effect.setVisible(true);
      }
    });
  }

  // === NETTOYAGE ===

  /**
   * Nettoie l'environnement actuel
   */
  clearEnvironment() {
    // Détruire le background
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    
    // Détruire la couche de sol
    if (this.groundLayer) {
      this.groundLayer.destroy();
      this.groundLayer = null;
    }
    
    // Détruire les plateformes
    this.platforms.forEach(platform => platform.destroy());
    this.platforms = [];
    
    // Détruire les effets
    this.effects.forEach(effect => {
      if (effect.destroy) {
        effect.destroy();
      }
    });
    this.effects = [];
  }

  /**
   * Détruit le manager
   */
  destroy() {
    console.log('💀 [BattleBackgroundManager] Destruction...');
    
    this.clearEnvironment();
    
    // Nettoyer les références
    this.scene = null;
    this.environmentData = null;
    
    console.log('✅ [BattleBackgroundManager] Détruit');
  }
}
