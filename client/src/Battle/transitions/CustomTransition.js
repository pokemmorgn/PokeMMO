// client/src/Battle/transitions/CustomTransition.js
// Template pour créer des transitions personnalisées facilement

export class CustomTransition {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.sprites = [];
    this.particles = [];
    this.overlays = [];
    this.isActive = false;
    this.customElements = new Map();
    
    console.log('🎨 [CustomTransition] Initialisé');
  }

  /**
   * Démarre l'effet personnalisé
   */
  async start(config) {
    if (this.isActive) {
      console.warn('⚠️ [CustomTransition] Déjà actif');
      return;
    }

    console.log('🎨 [CustomTransition] === DÉBUT EFFET PERSONNALISÉ ===');
    
    this.isActive = true;
    this.config = config.visual;
    this.sprites = config.sprites || {};
    
    try {
      // Initialiser les graphiques de base
      this.initializeGraphics();
      
      // Charger les sprites personnalisés
      await this.loadCustomSprites();
      
      // Exécuter l'animation selon le type
      await this.executeCustomAnimation();
      
      console.log('✅ [CustomTransition] Effet terminé');
      
    } catch (error) {
      console.error('❌ [CustomTransition] Erreur:', error);
    }
  }

  /**
   * Initialise les graphiques de base
   */
  initializeGraphics() {
    const { width, height } = this.scene.scale;
    
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(9999);
    this.graphics.setScrollFactor(0);
    
    this.centerX = width * 0.5;
    this.centerY = height * 0.5;
    this.screenWidth = width;
    this.screenHeight = height;
    
    console.log(`🎨 [CustomTransition] Graphiques initialisés`);
  }

  /**
   * Charge les sprites personnalisés
   */
  async loadCustomSprites() {
    console.log('📁 [CustomTransition] Chargement sprites personnalisés...');
    
    // Masque personnalisé
    if (this.sprites.mask) {
      await this.loadMaskSprite(this.sprites.mask);
    }
    
    // Overlay personnalisé
    if (this.sprites.overlay) {
      await this.loadOverlaySprite(this.sprites.overlay);
    }
    
    // Particules personnalisées
    if (this.sprites.particles) {
      await this.loadParticleSprites(this.sprites.particles);
    }
  }

  /**
   * Charge un sprite de masque
   */
  async loadMaskSprite(maskKey) {
    console.log(`🎭 [CustomTransition] Chargement masque: ${maskKey}`);
    
    if (this.scene.textures.exists(maskKey)) {
      const mask = this.scene.add.image(this.centerX, this.centerY, maskKey);
      mask.setDepth(10000);
      mask.setScrollFactor(0);
      mask.setAlpha(0);
      
      // Animation du masque
      this.scene.tweens.add({
        targets: mask,
        alpha: 1,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: this.config.duration * 0.8,
        ease: 'Power2.easeInOut'
      });
      
      this.customElements.set('mask', mask);
    } else {
      console.warn(`⚠️ [CustomTransition] Sprite masque non trouvé: ${maskKey}`);
    }
  }

  /**
   * Charge un sprite d'overlay
   */
  async loadOverlaySprite(overlayKey) {
    console.log(`🖼️ [CustomTransition] Chargement overlay: ${overlayKey}`);
    
    if (this.scene.textures.exists(overlayKey)) {
      const overlay = this.scene.add.image(this.centerX, this.centerY, overlayKey);
      overlay.setDepth(9998);
      overlay.setScrollFactor(0);
      overlay.setDisplaySize(this.screenWidth, this.screenHeight);
      overlay.setAlpha(0);
      
      // Animation fade in
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0.7,
        duration: this.config.duration * 0.6,
        ease: 'Power2.easeIn'
      });
      
      this.overlays.push(overlay);
      this.customElements.set('overlay', overlay);
    } else {
      console.warn(`⚠️ [CustomTransition] Sprite overlay non trouvé: ${overlayKey}`);
    }
  }

  /**
   * Charge les sprites de particules
   */
  async loadParticleSprites(particleKey) {
    console.log(`⭐ [CustomTransition] Chargement particules: ${particleKey}`);
    
    // Créer différents types de particules selon la clé
    switch (particleKey) {
      case 'custom_lightning':
        this.createCustomLightning();
        break;
      case 'custom_stars':
        this.createCustomStars();
        break;
      case 'custom_energy':
        this.createCustomEnergy();
        break;
      default:
        this.createGenericParticles(particleKey);
    }
  }

  /**
   * Exécute l'animation personnalisée
   */
  async executeCustomAnimation() {
    const duration = this.config.duration || 1500;
    const customParams = this.config.customParams || {};
    
    console.log(`🎬 [CustomTransition] Animation personnalisée: ${duration}ms`);
    
    // Exécuter selon les paramètres personnalisés
    if (customParams.animationType) {
      await this.executeSpecificAnimation(customParams.animationType, customParams);
    } else {
      await this.executeDefaultAnimation();
    }
  }

  /**
   * Exécute une animation spécifique
   */
  async executeSpecificAnimation(type, params) {
    console.log(`🎯 [CustomTransition] Animation spécifique: ${type}`);
    
    switch (type) {
      case 'wipe':
        await this.executeWipeAnimation(params);
        break;
      case 'shatter':
        await this.executeShatterAnimation(params);
        break;
      case 'vortex':
        await this.executeVortexAnimation(params);
        break;
      case 'pixels':
        await this.executePixelAnimation(params);
        break;
      default:
        await this.executeDefaultAnimation();
    }
  }

  /**
   * Animation de balayage (wipe)
   */
  async executeWipeAnimation(params) {
    const direction = params.direction || 'left-to-right';
    const speed = params.speed || 1000;
    
    console.log(`👋 [CustomTransition] Wipe: ${direction}`);
    
    return new Promise(resolve => {
      const wipeRect = this.scene.add.graphics();
      wipeRect.setDepth(9999);
      wipeRect.setScrollFactor(0);
      wipeRect.fillStyle(0x000000, 1);
      
      let startX, startY, endX, endY;
      
      switch (direction) {
        case 'left-to-right':
          startX = -this.screenWidth;
          startY = 0;
          endX = this.screenWidth;
          endY = 0;
          break;
        case 'top-to-bottom':
          startX = 0;
          startY = -this.screenHeight;
          endX = 0;
          endY = this.screenHeight;
          break;
        default:
          startX = -this.screenWidth;
          startY = 0;
          endX = this.screenWidth;
          endY = 0;
      }
      
      wipeRect.fillRect(startX, startY, this.screenWidth, this.screenHeight);
      
      this.scene.tweens.add({
        targets: wipeRect,
        x: endX,
        y: endY,
        duration: speed,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  /**
   * Animation de brisure (shatter)
   */
  async executeShatterAnimation(params) {
    const pieces = params.pieces || 16;
    const delay = params.delay || 50;
    
    console.log(`💥 [CustomTransition] Shatter: ${pieces} morceaux`);
    
    return new Promise(resolve => {
      let completedPieces = 0;
      
      for (let i = 0; i < pieces; i++) {
        setTimeout(() => {
          this.createShatterPiece(i, pieces, () => {
            completedPieces++;
            if (completedPieces >= pieces) {
              resolve();
            }
          });
        }, i * delay);
      }
    });
  }

  /**
   * Crée un morceau de brisure
   */
  createShatterPiece(index, total, onComplete) {
    const piece = this.scene.add.graphics();
    piece.setDepth(9999 + index);
    piece.setScrollFactor(0);
    
    // Position aléatoire
    const x = Math.random() * this.screenWidth;
    const y = Math.random() * this.screenHeight;
    const size = 20 + Math.random() * 40;
    
    // Forme irrégulière
    piece.fillStyle(0x222222, 0.8);
    piece.fillTriangle(
      x, y,
      x + size, y + size * 0.5,
      x + size * 0.5, y + size
    );
    
    // Animation de chute
    this.scene.tweens.add({
      targets: piece,
      y: this.screenHeight + 100,
      x: x + (Math.random() - 0.5) * 200,
      rotation: Math.random() * Math.PI * 4,
      alpha: 0,
      duration: 1000 + Math.random() * 500,
      ease: 'Power2.easeIn',
      onComplete: () => {
        piece.destroy();
        onComplete();
      }
    });
  }

  /**
   * Animation de vortex
   */
  async executeVortexAnimation(params) {
    const spirals = params.spirals || 3;
    const rotationSpeed = params.rotationSpeed || 2000;
    
    console.log(`🌪️ [CustomTransition] Vortex: ${spirals} spirales`);
    
    return new Promise(resolve => {
      let completedSpirals = 0;
      
      for (let i = 0; i < spirals; i++) {
        this.createVortexSpiral(i, spirals, rotationSpeed, () => {
          completedSpirals++;
          if (completedSpirals >= spirals) {
            resolve();
          }
        });
      }
    });
  }

  /**
   * Crée une spirale de vortex
   */
  createVortexSpiral(index, total, speed, onComplete) {
    const spiral = this.scene.add.graphics();
    spiral.setDepth(9999 + index);
    spiral.setScrollFactor(0);
    
    const radius = 50 + (index * 30);
    const color = [0xFF4444, 0x44FF44, 0x4444FF][index % 3];
    
    spiral.lineStyle(4, color, 0.8);
    
    // Dessiner la spirale
    const points = 100;
    spiral.beginPath();
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 4;
      const currentRadius = radius * (i / points);
      const x = this.centerX + Math.cos(angle) * currentRadius;
      const y = this.centerY + Math.sin(angle) * currentRadius;
      
      if (i === 0) {
        spiral.moveTo(x, y);
      } else {
        spiral.lineTo(x, y);
      }
    }
    spiral.strokePath();
    
    // Animation de rotation et contraction
    this.scene.tweens.add({
      targets: spiral,
      rotation: Math.PI * 4,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: speed,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        spiral.destroy();
        onComplete();
      }
    });
  }

  /**
   * Animation par défaut
   */
  async executeDefaultAnimation() {
    console.log('📝 [CustomTransition] Animation par défaut');
    
    return new Promise(resolve => {
      // Simple fade avec particules
      this.createGenericParticles('default');
      
      setTimeout(() => {
        resolve();
      }, this.config.duration || 1500);
    });
  }

  /**
   * Crée des éclairs personnalisés
   */
  createCustomLightning() {
    const lightningCount = 8;
    
    for (let i = 0; i < lightningCount; i++) {
      setTimeout(() => {
        this.createLightningBolt();
      }, i * 100);
    }
  }

  /**
   * Crée un éclair
   */
  createLightningBolt() {
    const lightning = this.scene.add.graphics();
    lightning.setDepth(10001);
    lightning.setScrollFactor(0);
    
    lightning.lineStyle(3, 0xFFFF00, 1);
    lightning.beginPath();
    
    // Éclair en zigzag
    const startX = Math.random() * this.screenWidth;
    const startY = 0;
    const endX = Math.random() * this.screenWidth;
    const endY = this.screenHeight;
    
    let currentX = startX;
    let currentY = startY;
    
    lightning.moveTo(currentX, currentY);
    
    const segments = 8;
    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const targetX = startX + (endX - startX) * progress;
      const targetY = startY + (endY - startY) * progress;
      
      currentX = targetX + (Math.random() - 0.5) * 60;
      currentY = targetY;
      
      lightning.lineTo(currentX, currentY);
    }
    
    lightning.strokePath();
    
    // Animation de l'éclair
    this.scene.tweens.add({
      targets: lightning,
      alpha: 0,
      duration: 200,
      delay: 100,
      onComplete: () => {
        lightning.destroy();
      }
    });
    
    this.particles.push(lightning);
  }

  /**
   * Crée des étoiles personnalisées
   */
  createCustomStars() {
    const starCount = 20;
    
    for (let i = 0; i < starCount; i++) {
      setTimeout(() => {
        this.createTwinklingStar();
      }, i * 50);
    }
  }

  /**
   * Crée une étoile scintillante
   */
  createTwinklingStar() {
    const star = this.scene.add.graphics();
    star.setDepth(10001);
    star.setScrollFactor(0);
    
    const x = Math.random() * this.screenWidth;
    const y = Math.random() * this.screenHeight;
    const size = 5 + Math.random() * 10;
    
    // Forme d'étoile
    star.fillStyle(0xFFFFFF, 1);
    star.beginPath();
    
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        star.moveTo(pointX, pointY);
      } else {
        star.lineTo(pointX, pointY);
      }
    }
    
    star.closePath();
    star.fillPath();
    
    // Animation scintillante
    this.scene.tweens.add({
      targets: star,
      alpha: { from: 1, to: 0.3 },
      scaleX: { from: 1, to: 1.5 },
      scaleY: { from: 1, to: 1.5 },
      duration: 500,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        star.destroy();
      }
    });
    
    this.particles.push(star);
  }

  /**
   * Crée de l'énergie personnalisée
   */
  createCustomEnergy() {
    this.createEnergyWaves();
    this.createEnergyOrbs();
  }

  /**
   * Crée des vagues d'énergie
   */
  createEnergyWaves() {
    const waveCount = 5;
    
    for (let i = 0; i < waveCount; i++) {
      setTimeout(() => {
        this.createEnergyWave(i);
      }, i * 200);
    }
  }

  /**
   * Crée une vague d'énergie
   */
  createEnergyWave(index) {
    const wave = this.scene.add.graphics();
    wave.setDepth(10000);
    wave.setScrollFactor(0);
    
    const color = [0xFF6600, 0xFF3300, 0xFF0066][index % 3];
    wave.lineStyle(6, color, 0.8);
    
    let radius = 0;
    const maxRadius = Math.max(this.screenWidth, this.screenHeight) * 0.8;
    
    const animateWave = () => {
      wave.clear();
      wave.lineStyle(6, color, 0.8 * (1 - radius / maxRadius));
      wave.strokeCircle(this.centerX, this.centerY, radius);
      
      radius += 12;
      
      if (radius < maxRadius) {
        requestAnimationFrame(animateWave);
      } else {
        wave.destroy();
      }
    };
    
    animateWave();
  }

  /**
   * Crée des orbes d'énergie
   */
  createEnergyOrbs() {
    const orbCount = 6;
    
    for (let i = 0; i < orbCount; i++) {
      const angle = (Math.PI * 2 * i) / orbCount;
      const distance = 100;
      
      const x = this.centerX + Math.cos(angle) * distance;
      const y = this.centerY + Math.sin(angle) * distance;
      
      this.createEnergyOrb(x, y);
    }
  }

  /**
   * Crée un orbe d'énergie
   */
  createEnergyOrb(x, y) {
    const orb = this.scene.add.graphics();
    orb.setDepth(10001);
    orb.setScrollFactor(0);
    
    // Orbe avec aura
    orb.fillStyle(0x00FFFF, 0.8);
    orb.fillCircle(x, y, 8);
    
    orb.lineStyle(2, 0xFFFFFF, 0.6);
    orb.strokeCircle(x, y, 12);
    
    // Animation vers le centre
    this.scene.tweens.add({
      targets: orb,
      x: this.centerX,
      y: this.centerY,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 800,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // Explosion finale
        const explosion = this.scene.add.graphics();
        explosion.setDepth(10002);
        explosion.setScrollFactor(0);
        explosion.fillStyle(0xFFFFFF, 1);
        explosion.fillCircle(this.centerX, this.centerY, 5);
        
        this.scene.tweens.add({
          targets: explosion,
          scaleX: 4,
          scaleY: 4,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            explosion.destroy();
          }
        });
        
        orb.destroy();
      }
    });
    
    this.particles.push(orb);
  }

  /**
   * Crée des particules génériques
   */
  createGenericParticles(type) {
    console.log(`⚡ [CustomTransition] Particules génériques: ${type}`);
    
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        this.createGenericParticle();
      }, i * 80);
    }
  }

  /**
   * Crée une particule générique
   */
  createGenericParticle() {
    const particle = this.scene.add.graphics();
    particle.setDepth(10001);
    particle.setScrollFactor(0);
    
    const x = Math.random() * this.screenWidth;
    const y = Math.random() * this.screenHeight;
    const size = 3 + Math.random() * 6;
    
    particle.fillStyle(0xFFFFFF, 1);
    particle.fillCircle(x, y, size);
    
    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      y: y + 100,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        particle.destroy();
      }
    });
    
    this.particles.push(particle);
  }

  /**
   * Nettoyage
   */
  cleanup() {
    console.log('🧹 [CustomTransition] Nettoyage...');
    
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    this.sprites.forEach(sprite => {
      if (sprite && sprite.scene) sprite.destroy();
    });
    this.sprites = [];
    
    this.particles.forEach(particle => {
      if (particle && particle.scene) particle.destroy();
    });
    this.particles = [];
    
    this.overlays.forEach(overlay => {
      if (overlay && overlay.scene) overlay.destroy();
    });
    this.overlays = [];
    
    this.customElements.forEach(element => {
      if (element && element.scene) element.destroy();
    });
    this.customElements.clear();
    
    this.isActive = false;
  }

  /**
   * Stop forcé
   */
  stop() {
    if (this.isActive) {
      this.cleanup();
    }
  }
}
