// client/src/Battle/transitions/SpiralTransition.js
// Transition spirale authentique style Pokémon Ruby/Sapphire/Emerald - VERSION AMÉLIORÉE

export class SpiralTransition {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.particles = null;
    this.isActive = false;
    this.spiralMask = null;
    this.animationStartTime = null;
    
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
      
      // Démarrer l'animation spirale avec garantie de completion
      await this.animateSpiralComplete();
      
      // Ajouter des particules si configuré
      if (config.sprites && config.sprites.particles) {
        this.createParticles(config.sprites.particles);
      }
      
      console.log('✅ [SpiralTransition] Effet terminé complètement');
      
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
   * Animation spirale avec garantie de completion
   */
  async animateSpiralComplete() {
    const duration = this.config.duration || 1200;
    const spiralTurns = this.config.spiralTurns || 3; // Nombre de tours complets
    const direction = this.config.direction || 'clockwise';
    
    console.log(`🌀 [SpiralTransition] Animation spirale complète: ${spiralTurns} tours, ${duration}ms`);
    
    return new Promise(resolve => {
      this.animationStartTime = Date.now();
      
      // Animation fluide avec requestAnimationFrame
      const animate = () => {
        const elapsed = Date.now() - this.animationStartTime;
        const progress = Math.min(elapsed / duration, 1); // S'assurer que progress ne dépasse pas 1
        
        // Dessiner la spirale selon le progrès
        this.drawSpiralProgress(progress, spiralTurns, direction);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // S'assurer que la spirale est complète
          this.drawSpiralProgress(1, spiralTurns, direction);
          console.log('🌀 [SpiralTransition] Animation spirale 100% complète');
          resolve();
        }
      };
      
      animate();
    });
  }

  /**
   * Dessine la spirale selon le progrès
   */
  drawSpiralProgress(progress, spiralTurns, direction) {
    const { width, height } = this.scene.scale;
    const maxRadius = Math.max(width, height) * 0.8;
    const directionMultiplier = direction === 'clockwise' ? 1 : -1;
    
    // Effacer et redessiner
    this.graphics.clear();
    
    // Couleur qui évolue avec le progrès
    const colors = this.config.colors || ['#000000', '#444444'];
    const color = this.interpolateColor(colors[0], colors[1], progress);
    
    this.graphics.fillStyle(parseInt(color.replace('#', '0x')), 0.9);
    
    // Calculer l'angle maximum à dessiner
    const maxAngle = spiralTurns * Math.PI * 2 * progress;
    const segments = Math.max(32, Math.floor(maxAngle * 8)); // Plus de segments pour plus de fluidité
    
    // Dessiner la spirale progressive
    this.graphics.beginPath();
    
    // Commencer du centre
    this.graphics.moveTo(this.centerX, this.centerY);
    
    // Dessiner les points de la spirale
    for (let i = 0; i <= segments; i++) {
      const segmentProgress = i / segments;
      const angle = maxAngle * segmentProgress * directionMultiplier;
      
      // Rayon croissant selon une courbe
      const radiusProgress = this.easeOutCubic(segmentProgress);
      const radius = maxRadius * radiusProgress;
      
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      this.graphics.lineTo(x, y);
    }
    
    // Si on n'est pas au début, créer un secteur fermé
    if (progress > 0.05) {
      // Revenir au centre pour fermer le secteur
      this.graphics.lineTo(this.centerX, this.centerY);
      this.graphics.closePath();
      this.graphics.fillPath();
      
      // Ajouter un contour pour plus d'authenticité
      this.graphics.lineStyle(2, 0x666666, 0.6);
      this.graphics.strokePath();
    }
    
    // Effet de brillance au bord de la spirale
    if (progress > 0.1) {
      this.addProgressiveShine(progress, maxAngle, maxRadius, directionMultiplier);
    }
  }

  /**
   * Ajoute un effet de brillance au bord de la spirale
   */
  addProgressiveShine(progress, maxAngle, maxRadius, directionMultiplier) {
    const shineGraphics = this.scene.add.graphics();
    shineGraphics.setDepth(10000);
    shineGraphics.setScrollFactor(0);
    
    // Ligne de brillance au bord actuel
    const currentAngle = maxAngle * directionMultiplier;
    const currentRadius = maxRadius * this.easeOutCubic(progress);
    
    const endX = this.centerX + Math.cos(currentAngle) * currentRadius;
    const endY = this.centerY + Math.sin(currentAngle) * currentRadius;
    
    // Gradient de brillance
    shineGraphics.lineStyle(4, 0xFFFFFF, 0.8);
    shineGraphics.beginPath();
    shineGraphics.moveTo(this.centerX, this.centerY);
    shineGraphics.lineTo(endX, endY);
    shineGraphics.strokePath();
    
    // Effet de lueur
    shineGraphics.lineStyle(8, 0xFFFFFF, 0.3);
    shineGraphics.strokePath();
    
    // Auto-destruction rapide
    this.scene.tweens.add({
      targets: shineGraphics,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        shineGraphics.destroy();
      }
    });
  }

  /**
   * Version alternative avec segments fixes pour plus de contrôle
   */
  async animateSpiral() {
    const duration = this.config.duration || 1200;
    const segments = this.config.segments || 12; // Plus de segments par défaut
    const direction = this.config.direction || 'clockwise';
    
    console.log(`🌀 [SpiralTransition] Animation spirale segmentée: ${segments} segments, ${duration}ms`);
    
    return new Promise(resolve => {
      let currentSegment = 0;
      const segmentDuration = duration / segments;
      
      // S'assurer qu'on a assez de temps par segment
      const minSegmentDuration = 50; // Minimum 50ms par segment
      const actualSegmentDuration = Math.max(minSegmentDuration, segmentDuration);
      const totalActualDuration = actualSegmentDuration * segments;
      
      console.log(`⏱️ [SpiralTransition] Durée réelle: ${totalActualDuration}ms (${actualSegmentDuration}ms par segment)`);
      
      // Animation par segments avec timing garanti
      const animateSegment = () => {
        if (currentSegment >= segments) {
          console.log('🌀 [SpiralTransition] Tous les segments terminés');
          resolve();
          return;
        }
        
        this.drawSpiralSegment(currentSegment, segments, direction);
        currentSegment++;
        
        setTimeout(animateSegment, actualSegmentDuration);
      };
      
      animateSegment();
    });
  }

  /**
   * Dessine un segment de spirale (version améliorée)
   */
  drawSpiralSegment(segmentIndex, totalSegments, direction) {
    const { width, height } = this.scene.scale;
    const maxRadius = Math.max(width, height) * 0.8;
    const progress = (segmentIndex + 1) / totalSegments;
    
    // Calculer l'angle pour ce segment
    const totalAngle = (this.config.spiralTurns || 3) * Math.PI * 2;
    const currentAngle = totalAngle * progress;
    const directionMultiplier = direction === 'clockwise' ? 1 : -1;
    
    // Effacer et redessiner
    this.graphics.clear();
    
    // Couleur évolutive
    const colors = this.config.colors || ['#000000', '#444444'];
    const color = this.interpolateColor(colors[0], colors[1], progress);
    
    this.graphics.fillStyle(parseInt(color.replace('#', '0x')), 0.9);
    
    // Créer le secteur spirale
    this.graphics.beginPath();
    this.graphics.moveTo(this.centerX, this.centerY);
    
    // Dessiner la spirale jusqu'au segment actuel
    const steps = Math.max(32, Math.floor(currentAngle * 4));
    for (let i = 0; i <= steps; i++) {
      const stepProgress = i / steps;
      const angle = currentAngle * stepProgress * directionMultiplier;
      const radius = maxRadius * this.easeOutCubic(stepProgress);
      
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      this.graphics.lineTo(x, y);
    }
    
    // Fermer le secteur
    this.graphics.lineTo(this.centerX, this.centerY);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    // Contour
    this.graphics.lineStyle(2, 0x666666, 0.5);
    this.graphics.strokePath();
    
    // Effet de brillance
    if (segmentIndex > 0) {
      this.addShineEffect(segmentIndex, totalSegments, currentAngle, maxRadius, directionMultiplier);
    }
  }

  /**
   * Ajoute un effet de brillance amélioré
   */
  addShineEffect(segmentIndex, totalSegments, currentAngle, maxRadius, directionMultiplier) {
    const shineGraphics = this.scene.add.graphics();
    shineGraphics.setDepth(10000);
    shineGraphics.setScrollFactor(0);
    
    // Position du bord de la spirale
    const progress = segmentIndex / totalSegments;
    const radius = maxRadius * this.easeOutCubic(progress);
    const angle = currentAngle * directionMultiplier;
    
    const endX = this.centerX + Math.cos(angle) * radius;
    const endY = this.centerY + Math.sin(angle) * radius;
    
    // Ligne de brillance principale
    shineGraphics.lineStyle(3, 0xFFFFFF, 1);
    shineGraphics.beginPath();
    shineGraphics.moveTo(this.centerX, this.centerY);
    shineGraphics.lineTo(endX, endY);
    shineGraphics.strokePath();
    
    // Halo de brillance
    shineGraphics.lineStyle(6, 0xFFFFFF, 0.4);
    shineGraphics.strokePath();
    
    // Fade out
    this.scene.tweens.add({
      targets: shineGraphics,
      alpha: 0,
      duration: 150,
      ease: 'Power2.easeOut',
      onComplete: () => {
        shineGraphics.destroy();
      }
    });
  }

  /**
   * Fonction d'easing pour un mouvement plus naturel
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Crée des particules d'éclairs
   */
  createParticles(particleType) {
    console.log(`⚡ [SpiralTransition] Particules: ${particleType}`);
    
    const particleCount = 16;
    
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        // Position le long de la spirale
        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = 80 + Math.random() * 120;
        
        const startX = this.centerX + Math.cos(angle) * distance;
        const startY = this.centerY + Math.sin(angle) * distance;
        
        this.createLightningParticle(startX, startY);
      }, i * 60);
    }
  }

  /**
   * Crée une particule d'éclair améliorée
   */
  createLightningParticle(x, y) {
    const particle = this.scene.add.graphics();
    particle.setDepth(10001);
    particle.setScrollFactor(0);
    
    // Éclair en zigzag plus réaliste
    const lightningColor = 0xFFFF00;
    particle.lineStyle(2, lightningColor, 1);
    particle.beginPath();
    
    let currentX = x;
    let currentY = y;
    particle.moveTo(currentX, currentY);
    
    // Plusieurs segments de zigzag
    for (let i = 0; i < 4; i++) {
      currentX += (Math.random() - 0.5) * 25;
      currentY += 8 + Math.random() * 12;
      particle.lineTo(currentX, currentY);
    }
    
    particle.strokePath();
    
    // Effet de lueur
    particle.lineStyle(4, lightningColor, 0.5);
    particle.strokePath();
    
    // Animation vers le centre avec rotation
    this.scene.tweens.add({
      targets: particle,
      x: this.centerX + (Math.random() - 0.5) * 30,
      y: this.centerY + (Math.random() - 0.5) * 30,
      rotation: Math.random() * Math.PI * 2,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 400 + Math.random() * 200,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        particle.destroy();
      }
    });
    
    // Effet de scintillement
    this.scene.tweens.add({
      targets: particle,
      alpha: { from: 1, to: 0.4 },
      duration: 60,
      yoyo: true,
      repeat: 4
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
