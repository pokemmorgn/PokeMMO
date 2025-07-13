// client/src/Battle/transitions/SpiralTransition.js
// Transition spirale authentique style Pokémon Ruby/Sapphire/Emerald

export class SpiralTransition {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.particles = null;
    this.isActive = false;
    this.spiralMask = null;
    
    console.log('🌀 [SpiralTransition] Initialisé');
  }

  /**
   * Démarre l'effet spirale
   */
  async start(config) {
    if (this.isActive) {
      console.warn('⚠️ [SpiralTransition] Déjà actif');
      return;
    }

    console.log('🌀 [SpiralTransition] === DÉBUT EFFET SPIRALE ===');
    
    this.isActive = true;
    this.config = config.visual;
    
    try {
      // Créer les graphiques
      this.createGraphics();
      
      // Démarrer l'animation spirale
      await this.animateSpiral();
      
      // Ajouter des particules si configuré
      if (config.sprites && config.sprites.particles) {
        this.createParticles(config.sprites.particles);
      }
      
      console.log('✅ [SpiralTransition] Effet terminé');
      
    } catch (error) {
      console.error('❌ [SpiralTransition] Erreur:', error);
    }
  }

  /**
   * Crée les graphiques de base
   */
  createGraphics() {
    const { width, height } = this.scene.scale;
    
    // Graphics principal pour la spirale
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(9999);
    this.graphics.setScrollFactor(0);
    
    // Centre de l'écran
    this.centerX = width * (this.config.centerX || 0.5);
    this.centerY = height * (this.config.centerY || 0.5);
    
    console.log(`🎨 [SpiralTransition] Graphiques créés (${width}x${height})`);
  }

  /**
   * Anime la spirale
   */
  async animateSpiral() {
    const duration = this.config.duration || 1200;
    const segments = this.config.segments || 8;
    const direction = this.config.direction || 'clockwise';
    
    console.log(`🌀 [SpiralTransition] Animation spirale: ${segments} segments, ${duration}ms`);
    
    return new Promise(resolve => {
      let currentSegment = 0;
      const segmentDuration = duration / segments;
      
      // Animation par segments
      const animateSegment = () => {
        if (currentSegment >= segments) {
          resolve();
          return;
        }
        
        this.drawSpiralSegment(currentSegment, segments, direction);
        currentSegment++;
        
        setTimeout(animateSegment, segmentDuration);
      };
      
      animateSegment();
    });
  }

  /**
   * Dessine un segment de spirale
   */
  drawSpiralSegment(segmentIndex, totalSegments, direction) {
    const { width, height } = this.scene.scale;
    const maxRadius = Math.max(width, height);
    
    // Calculer l'angle pour ce segment
    const angleStep = (Math.PI * 2) / totalSegments;
    const currentAngle = angleStep * segmentIndex;
    const directionMultiplier = direction === 'clockwise' ? 1 : -1;
    
    // Effacer et redessiner
    this.graphics.clear();
    
    // Couleur du segment (gradient noir vers gris)
    const colors = this.config.colors || ['#000000', '#333333'];
    const color = this.interpolateColor(colors[0], colors[1], segmentIndex / totalSegments);
    
    // Dessiner la spirale jusqu'à ce segment
    this.graphics.fillStyle(parseInt(color.replace('#', '0x')), 0.9);
    
    // Créer le masque spirale
    this.graphics.beginPath();
    this.graphics.moveTo(this.centerX, this.centerY);
    
    // Dessiner la spirale
    for (let i = 0; i <= segmentIndex; i++) {
      const angle = angleStep * i * directionMultiplier;
      const radius = (maxRadius * i) / totalSegments;
      
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    }
    
    // Compléter le secteur
    const finalAngle = currentAngle * directionMultiplier;
    const finalRadius = maxRadius;
    const finalX = this.centerX + Math.cos(finalAngle) * finalRadius;
    const finalY = this.centerY + Math.sin(finalAngle) * finalRadius;
    
    this.graphics.lineTo(finalX, finalY);
    this.graphics.lineTo(this.centerX, this.centerY);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    // Effet de brillance
    this.addShineEffect(segmentIndex, totalSegments);
  }

  /**
   * Ajoute un effet de brillance
   */
  addShineEffect(segmentIndex, totalSegments) {
    if (segmentIndex < 2) return; // Pas d'effet sur les premiers segments
    
    const shineGraphics = this.scene.add.graphics();
    shineGraphics.setDepth(10000);
    shineGraphics.setScrollFactor(0);
    
    // Ligne de brillance
    shineGraphics.lineStyle(3, 0xFFFFFF, 0.8);
    
    const angleStep = (Math.PI * 2) / totalSegments;
    const angle = angleStep * segmentIndex;
    const radius = Math.max(this.scene.scale.width, this.scene.scale.height);
    
    const startX = this.centerX;
    const startY = this.centerY;
    const endX = this.centerX + Math.cos(angle) * radius;
    const endY = this.centerY + Math.sin(angle) * radius;
    
    shineGraphics.beginPath();
    shineGraphics.moveTo(startX, startY);
    shineGraphics.lineTo(endX, endY);
    shineGraphics.strokePath();
    
    // Fade out la brillance
    this.scene.tweens.add({
      targets: shineGraphics,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        shineGraphics.destroy();
      }
    });
  }

  /**
   * Crée des particules d'éclairs
   */
  createParticles(particleType) {
    console.log(`⚡ [SpiralTransition] Particules: ${particleType}`);
    
    const particleCount = 12;
    const { width, height } = this.scene.scale;
    
    for (let i = 0; i < particleCount; i++) {
      // Position aléatoire autour du centre
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 100 + Math.random() * 200;
      
      const startX = this.centerX + Math.cos(angle) * distance;
      const startY = this.centerY + Math.sin(angle) * distance;
      
      this.createLightningParticle(startX, startY);
    }
  }

  /**
   * Crée une particule d'éclair
   */
  createLightningParticle(x, y) {
    const particle = this.scene.add.graphics();
    particle.setDepth(10001);
    particle.setScrollFactor(0);
    
    // Dessiner un petit éclair
    particle.lineStyle(2, 0xFFFF00, 1);
    particle.beginPath();
    particle.moveTo(x, y);
    particle.lineTo(x + (Math.random() - 0.5) * 20, y + 10);
    particle.lineTo(x + (Math.random() - 0.5) * 20, y + 20);
    particle.strokePath();
    
    // Animation de l'éclair
    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      duration: 300 + Math.random() * 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        particle.destroy();
      }
    });
    
    // Effet de scintillement
    this.scene.tweens.add({
      targets: particle,
      alpha: { from: 1, to: 0.3 },
      duration: 50,
      yoyo: true,
      repeat: 3
    });
  }

  /**
   * Interpolation de couleur
   */
  interpolateColor(color1, color2, factor) {
    const c1 = parseInt(color1.replace('#', ''), 16);
    const c2 = parseInt(color2.replace('#', ''), 16);
    
    const r1 = (c1 >> 16) & 255;
    const g1 = (c1 >> 8) & 255;
    const b1 = c1 & 255;
    
    const r2 = (c2 >> 16) & 255;
    const g2 = (c2 >> 8) & 255;
    const b2 = c2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Nettoyage
   */
  cleanup() {
    console.log('🧹 [SpiralTransition] Nettoyage...');
    
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    if (this.particles) {
      this.particles.destroy();
      this.particles = null;
    }
    
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
