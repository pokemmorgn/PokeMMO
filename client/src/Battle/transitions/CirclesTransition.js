// client/src/Battle/transitions/CirclesTransition.js
// Transition cercles concentriques style Pokémon versions récentes

export class CirclesTransition {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.circles = [];
    this.isActive = false;
    this.particles = [];
    
    console.log('⭕ [CirclesTransition] Initialisé');
  }

  /**
   * Démarre l'effet cercles
   */
  async start(config) {
    if (this.isActive) {
      console.warn('⚠️ [CirclesTransition] Déjà actif');
      return;
    }

    console.log('⭕ [CirclesTransition] === DÉBUT EFFET CERCLES ===');
    
    this.isActive = true;
    this.config = config.visual;
    
    try {
      // Créer les graphiques
      this.createGraphics();
      
      // Démarrer l'animation des cercles
      await this.animateCircles();
      
      // Ajouter des particules si configuré
      if (config.sprites && config.sprites.particles) {
        this.createParticles(config.sprites.particles);
      }
      
      console.log('✅ [CirclesTransition] Effet terminé');
      
    } catch (error) {
      console.error('❌ [CirclesTransition] Erreur:', error);
    }
  }

  /**
   * Crée les graphiques de base
   */
  createGraphics() {
    const { width, height } = this.scene.scale;
    
    // Graphics principal
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(9999);
    this.graphics.setScrollFactor(0);
    
    // Centre de l'écran
    this.centerX = width * (this.config.centerX || 0.5);
    this.centerY = height * (this.config.centerY || 0.5);
    this.maxRadius = Math.max(width, height) * 0.8;
    
    console.log(`🎨 [CirclesTransition] Graphiques créés (${width}x${height})`);
  }

  /**
   * Anime les cercles concentriques
   */
  async animateCircles() {
    const duration = this.config.duration || 1000;
    const circleCount = this.config.circleCount || 6;
    const direction = this.config.direction || 'inward'; // 'inward' ou 'outward'
    
    console.log(`⭕ [CirclesTransition] Animation: ${circleCount} cercles, ${duration}ms, ${direction}`);
    
    return new Promise(resolve => {
      let completedCircles = 0;
      
      // Créer chaque cercle avec un délai
      for (let i = 0; i < circleCount; i++) {
        const delay = (duration / circleCount) * i;
        
        setTimeout(() => {
          this.createAnimatedCircle(i, circleCount, direction, () => {
            completedCircles++;
            if (completedCircles >= circleCount) {
              resolve();
            }
          });
        }, delay);
      }
    });
  }

  /**
   * Crée et anime un cercle
   */
  createAnimatedCircle(index, totalCount, direction, onComplete) {
    const circleGraphics = this.scene.add.graphics();
    circleGraphics.setDepth(9999 + index);
    circleGraphics.setScrollFactor(0);
    
    // Couleurs du cercle
    const colors = this.config.colors || ['#1a1a1a', '#444444'];
    const colorIndex = index % colors.length;
    const color = colors[colorIndex];
    const alpha = 0.8 - (index * 0.1); // Transparence décroissante
    
    // Taille initiale et finale
    let startRadius, endRadius;
    
    if (direction === 'inward') {
      startRadius = this.maxRadius + (index * 50);
      endRadius = 0;
    } else {
      startRadius = 0;
      endRadius = this.maxRadius + (index * 50);
    }
    
    // État initial
    circleGraphics.lineStyle(8 + index * 2, parseInt(color.replace('#', '0x')), alpha);
    
    // Animation du rayon
    let currentRadius = startRadius;
    
    const animateRadius = () => {
      circleGraphics.clear();
      
      if (currentRadius > 0) {
        // Dessiner le cercle
        circleGraphics.lineStyle(8 + index * 2, parseInt(color.replace('#', '0x')), alpha);
        circleGraphics.strokeCircle(this.centerX, this.centerY, currentRadius);
        
        // Effet de lueur
        circleGraphics.lineStyle(4, 0xFFFFFF, alpha * 0.5);
        circleGraphics.strokeCircle(this.centerX, this.centerY, currentRadius);
      }
    };
    
    // Tween d'animation
    this.scene.tweens.add({
      targets: { radius: startRadius },
      radius: endRadius,
      duration: 600,
      ease: 'Power2.easeInOut',
      onUpdate: (tween) => {
        currentRadius = tween.targets[0].radius;
        animateRadius();
      },
      onComplete: () => {
        // Fade out
        this.scene.tweens.add({
          targets: circleGraphics,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            circleGraphics.destroy();
            onComplete();
          }
        });
      }
    });
    
    // Effet de pulsation
    this.scene.tweens.add({
      targets: circleGraphics,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1
    });
    
    this.circles.push(circleGraphics);
  }

  /**
   * Crée des particules électriques
   */
  createParticles(particleType) {
    console.log(`⚡ [CirclesTransition] Particules: ${particleType}`);
    
    const particleCount = 16;
    
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        this.createElectricParticle(i, particleCount);
      }, i * 50);
    }
  }

  /**
   * Crée une particule électrique
   */
  createElectricParticle(index, total) {
    // Position autour du centre
    const angle = (Math.PI * 2 * index) / total;
    const distance = 150 + Math.random() * 100;
    
    const startX = this.centerX + Math.cos(angle) * distance;
    const startY = this.centerY + Math.sin(angle) * distance;
    
    const particle = this.scene.add.graphics();
    particle.setDepth(10001);
    particle.setScrollFactor(0);
    
    // Forme d'étincelle
    const sparkSize = 3 + Math.random() * 4;
    particle.fillStyle(0x00FFFF, 1);
    particle.fillCircle(startX, startY, sparkSize);
    
    // Traînée électrique
    particle.lineStyle(2, 0x00FFFF, 0.8);
    particle.beginPath();
    particle.moveTo(startX, startY);
    
    for (let j = 0; j < 3; j++) {
      const trailX = startX + (Math.random() - 0.5) * 20;
      const trailY = startY + (Math.random() - 0.5) * 20;
      particle.lineTo(trailX, trailY);
    }
    particle.strokePath();
    
    // Animation vers le centre
    this.scene.tweens.add({
      targets: particle,
      x: this.centerX + (Math.random() - 0.5) * 20,
      y: this.centerY + (Math.random() - 0.5) * 20,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 800 + Math.random() * 400,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        particle.destroy();
      }
    });
    
    // Effet de scintillement
    this.scene.tweens.add({
      targets: particle,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true,
      repeat: -1
    });
    
    this.particles.push(particle);
  }

  /**
   * Crée un effet de vague
   */
  createWaveEffect() {
    const waveGraphics = this.scene.add.graphics();
    waveGraphics.setDepth(9998);
    waveGraphics.setScrollFactor(0);
    
    let waveRadius = 0;
    const maxWaveRadius = this.maxRadius * 1.5;
    
    const animateWave = () => {
      waveGraphics.clear();
      
      if (waveRadius < maxWaveRadius) {
        // Vague principale
        waveGraphics.lineStyle(6, 0x4444FF, 0.6);
        waveGraphics.strokeCircle(this.centerX, this.centerY, waveRadius);
        
        // Vague secondaire
        if (waveRadius > 50) {
          waveGraphics.lineStyle(4, 0x6666FF, 0.4);
          waveGraphics.strokeCircle(this.centerX, this.centerY, waveRadius - 50);
        }
        
        waveRadius += 8;
        requestAnimationFrame(animateWave);
      } else {
        waveGraphics.destroy();
      }
    };
    
    animateWave();
  }

  /**
   * Ajoute des éclats lumineux
   */
  createLightBursts() {
    const burstCount = 8;
    
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        const angle = (Math.PI * 2 * i) / burstCount;
        const distance = 80;
        
        const x = this.centerX + Math.cos(angle) * distance;
        const y = this.centerY + Math.sin(angle) * distance;
        
        this.createLightBurst(x, y);
      }, i * 100);
    }
  }

  /**
   * Crée un éclat lumineux
   */
  createLightBurst(x, y) {
    const burst = this.scene.add.graphics();
    burst.setDepth(10000);
    burst.setScrollFactor(0);
    
    // Étoile lumineuse
    burst.fillStyle(0xFFFFFF, 1);
    burst.beginPath();
    
    const rays = 6;
    const innerRadius = 5;
    const outerRadius = 15;
    
    for (let i = 0; i < rays * 2; i++) {
      const angle = (Math.PI * i) / rays;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        burst.moveTo(pointX, pointY);
      } else {
        burst.lineTo(pointX, pointY);
      }
    }
    
    burst.closePath();
    burst.fillPath();
    
    // Animation d'explosion
    this.scene.tweens.add({
      targets: burst,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2.easeOut',
      onComplete: () => {
        burst.destroy();
      }
    });
  }

  /**
   * Nettoyage
   */
  cleanup() {
    console.log('🧹 [CirclesTransition] Nettoyage...');
    
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    this.circles.forEach(circle => {
      if (circle && circle.scene) {
        circle.destroy();
      }
    });
    this.circles = [];
    
    this.particles.forEach(particle => {
      if (particle && particle.scene) {
        particle.destroy();
      }
    });
    this.particles = [];
    
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
