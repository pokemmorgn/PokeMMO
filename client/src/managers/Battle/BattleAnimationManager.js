// client/src/managers/Battle/BattleAnimationManager.js
// Gestionnaire spécialisé pour les animations de combat avec support des animations simultanées

export class BattleAnimationManager {
  constructor(scene) {
    this.scene = scene;
    
    // État des animations
    this.isAnimating = false;
    this.animationQueue = [];
    this.currentAnimation = null;
    this.concurrentAnimations = new Set(); // ✅ Nouvelles animations concurrentes
    
    // Références aux sprites (à injecter depuis l'extérieur)
    this.playerSprite = null;
    this.opponentSprite = null;
    
    // Effets temporaires
    this.temporaryEffects = [];
    
    // Configuration des animations
    this.animationConfig = {
      // Timings par défaut
      attack: {
        approach: 200,
        impact: 150,
        return: 300
      },
      damage: {
        shake: 80,
        flash: 150,
        number: 1000
      },
      status: {
        float: 2500,
        fade: 300
      },
      entry: {
        slide: 1000,
        bounce: 300
      },
      faint: {
        fall: 1500,
        spiral: 2000
      }
    };
    
    // ✅ Types d'animations pouvant être simultanées
    this.concurrentTypes = new Set(['pokemonEntry', 'heal', 'statusEffect']);
    
    console.log('✨ [BattleAnimationManager] Initialisé avec support concurrent');
  }

  // === CONFIGURATION ===

  /**
   * Définit les références aux sprites
   */
  setSpriteReferences(playerSprite, opponentSprite) {
    this.playerSprite = playerSprite;
    this.opponentSprite = opponentSprite;
    console.log('🔗 [BattleAnimationManager] Références sprites configurées');
  }

  /**
   * Met à jour une référence de sprite
   */
  updateSpriteReference(type, sprite) {
    if (type === 'player') {
      this.playerSprite = sprite;
    } else if (type === 'opponent') {
      this.opponentSprite = sprite;
    }
  }

  // === SYSTÈME DE QUEUE AMÉLIORÉ ===

  /**
   * Ajoute une animation à la queue avec support de concurrence
   */
  queueAnimation(animationType, data = {}, options = {}) {
    const animation = {
      id: Date.now() + Math.random(),
      type: animationType,
      data: data,
      timestamp: Date.now(),
      concurrent: options.concurrent !== false && this.concurrentTypes.has(animationType) // ✅ Par défaut concurrent pour certains types
    };
    
    this.animationQueue.push(animation);
    console.log(`🎬 [BattleAnimationManager] Animation ajoutée: ${animationType} (concurrent: ${animation.concurrent})`);
    
    // Démarrer si pas en cours
    if (!this.isAnimating) {
      this.processAnimationQueue();
    }
    
    return animation.id;
  }

  /**
   * Traite la queue d'animations avec support de concurrence
   */
  async processAnimationQueue() {
    if (this.animationQueue.length === 0 && this.concurrentAnimations.size === 0) {
      this.isAnimating = false;
      return;
    }
    
    this.isAnimating = true;
    
    // ✅ Traiter toutes les animations concurrentes disponibles
    const concurrentBatch = [];
    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue[0];
      
      if (animation.concurrent) {
        // Animation concurrente : la retirer de la queue et l'ajouter au batch
        this.animationQueue.shift();
        concurrentBatch.push(animation);
      } else {
        // Animation séquentielle : s'arrêter ici si on a déjà des concurrentes
        if (concurrentBatch.length > 0) {
          break;
        }
        // Sinon traiter cette animation seule
        const singleAnimation = this.animationQueue.shift();
        await this.executeSingleAnimation(singleAnimation);
        // Continuer avec la suite de la queue
        this.processAnimationQueue();
        return;
      }
    }
    
    // ✅ Exécuter le batch d'animations concurrentes
    if (concurrentBatch.length > 0) {
      await this.executeConcurrentAnimations(concurrentBatch);
    }
    
    // Continuer avec la suite de la queue
    this.processAnimationQueue();
  }

  /**
   * Exécute une animation unique (séquentielle)
   */
  async executeSingleAnimation(animation) {
    this.currentAnimation = animation;
    console.log(`▶️ [BattleAnimationManager] Exécution séquentielle: ${animation.type}`);
    
    try {
      await this.executeAnimation(animation);
    } catch (error) {
      console.error(`❌ [BattleAnimationManager] Erreur animation ${animation.type}:`, error);
    }
    
    this.currentAnimation = null;
  }

  /**
   * ✅ Exécute plusieurs animations en parallèle
   */
  async executeConcurrentAnimations(animations) {
    console.log(`⚡ [BattleAnimationManager] Exécution concurrente de ${animations.length} animations:`, 
                animations.map(a => a.type));
    
    // Ajouter au set des animations concurrentes
    animations.forEach(anim => this.concurrentAnimations.add(anim));
    
    // Lancer toutes les animations en parallèle
    const promises = animations.map(async (animation) => {
      try {
        await this.executeAnimation(animation);
      } catch (error) {
        console.error(`❌ [BattleAnimationManager] Erreur animation concurrente ${animation.type}:`, error);
      } finally {
        // Retirer du set à la fin
        this.concurrentAnimations.delete(animation);
      }
    });
    
    // Attendre que toutes les animations soient terminées
    await Promise.all(promises);
    
    console.log(`✅ [BattleAnimationManager] Batch concurrent terminé`);
  }

  /**
   * Exécute une animation spécifique
   */
  async executeAnimation(animation) {
    switch (animation.type) {
      case 'pokemonEntry':
        return this.animatePokemonEntry(animation.data);
      case 'attack':
        return this.animateAttack(animation.data);
      case 'damage':
        return this.animateDamage(animation.data);
      case 'heal':
        return this.animateHeal(animation.data);
      case 'statusEffect':
        return this.animateStatusEffect(animation.data);
      case 'faint':
        return this.animateFaint(animation.data);
      case 'capture':
        return this.animateCapture(animation.data);
      case 'victory':
        return this.animateVictory(animation.data);
      case 'custom':
        return this.animateCustom(animation.data);
      default:
        console.warn(`⚠️ [BattleAnimationManager] Animation inconnue: ${animation.type}`);
    }
  }

  // === ANIMATIONS PRINCIPALES ===

  /**
   * Animation d'entrée d'un Pokémon
   */
  async animatePokemonEntry(data) {
    const { sprite, direction = 'left' } = data;
    if (!sprite) return;
    
    const targetX = sprite.x;
    const targetY = sprite.y;
    const targetScale = sprite.scaleX;
    const { width } = this.scene.cameras.main;
    
    // Position de départ
    const startX = direction === 'left' ? -150 : width + 150;
    
    sprite.setPosition(startX, targetY + 50);
    sprite.setScale(targetScale * 0.3);
    sprite.setAlpha(0);
    sprite.setVisible(true); // ✅ Rendre visible au début de l'animation
    
    return new Promise(resolve => {
      // Animation d'entrée
      this.scene.tweens.add({
        targets: sprite,
        x: targetX,
        y: targetY,
        alpha: 1,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: this.animationConfig.entry.slide,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Animation de rebond
          this.scene.tweens.add({
            targets: sprite,
            y: targetY + 8,
            duration: this.animationConfig.entry.bounce,
            yoyo: true,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              // Démarrer l'animation d'idle
              this.startIdleAnimation(sprite, targetY);
              resolve();
            }
          });
        }
      });
    });
  }

  /**
   * Animation d'idle (flottement)
   */
  startIdleAnimation(sprite, baseY) {
    if (!sprite || !sprite.scene) return;
    
    const idleTween = this.scene.tweens.add({
      targets: sprite,
      y: baseY - 8,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Stocker pour pouvoir l'arrêter plus tard
    if (sprite.setData) {
      sprite.setData('idleTween', idleTween);
    }
  }

  /**
   * Animation d'attaque
   */
  async animateAttack(data) {
    const { attackerType, targetType, moveName, moveType } = data;
    
    const attacker = attackerType === 'player' ? this.playerSprite : this.opponentSprite;
    const target = targetType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!attacker || !target) {
      console.warn('⚠️ [BattleAnimationManager] Sprites manquants pour attaque');
      return;
    }
    
    console.log(`⚔️ [BattleAnimationManager] Animation attaque: ${moveName}`);
    
    const originalX = attacker.x;
    const moveDistance = attackerType === 'player' ? 50 : -50;
    
    return new Promise(resolve => {
      // Phase 1: Approche
      this.scene.tweens.add({
        targets: attacker,
        x: originalX + moveDistance,
        duration: this.animationConfig.attack.approach,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Phase 2: Impact
          this.createAttackEffect(target, moveType);
          
          // Phase 3: Retour
          this.scene.tweens.add({
            targets: attacker,
            x: originalX,
            duration: this.animationConfig.attack.return,
            ease: 'Power2.easeIn',
            onComplete: resolve
          });
        }
      });
    });
  }

  /**
   * Crée l'effet visuel d'une attaque
   */
  createAttackEffect(target, moveType) {
    // Effet d'impact générique
    this.createImpactEffect(target.x, target.y, moveType);
    
    // Animation de hit sur la cible
    this.animateHit(target);
  }

  /**
   * Effet d'impact visuel
   */
  createImpactEffect(x, y, moveType = 'normal') {
    const effectColor = this.getMoveTypeColor(moveType);
    
    // Explosion d'étoiles
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
          color: `#${effectColor.toString(16).padStart(6, '0')}`,
          stroke: '#FFFFFF',
          strokeThickness: 2
        }
      );
      
      star.setOrigin(0.5);
      star.setDepth(90);
      this.temporaryEffects.push(star);
      
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
          this.removeFromTemporaryEffects(star);
        }
      });
    }
    
    // Flash central
    const flash = this.scene.add.rectangle(x, y, 120, 120, 0xFFFFFF);
    flash.setDepth(40);
    flash.setAlpha(0.8);
    this.temporaryEffects.push(flash);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        flash.destroy();
        this.removeFromTemporaryEffects(flash);
      }
    });
  }

  /**
   * Animation de hit (secousse et flash)
   */
  animateHit(sprite) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    
    // Secousse horizontale
    this.scene.tweens.add({
      targets: sprite,
      x: originalX + 15,
      duration: this.animationConfig.damage.shake,
      yoyo: true,
      repeat: 4,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.setX(originalX);
      }
    });
    
    // Flash rouge
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFF0000,
      duration: this.animationConfig.damage.flash,
      yoyo: true,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.clearTint();
      }
    });
  }

  /**
   * Animation de dégâts (nombre flottant)
   */
  async animateDamage(data) {
    const { targetType, damage, isCritical = false } = data;
    const target = targetType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!target || damage <= 0) return;
    
    console.log(`💥 [BattleAnimationManager] Animation dégâts: ${damage}`);
    
    return new Promise(resolve => {
      // Texte de dégâts
      const damageText = this.scene.add.text(target.x, target.y - 50, `-${damage}`, {
        fontSize: isCritical ? '32px' : '28px',
        fontFamily: 'Arial Black, sans-serif',
        color: isCritical ? '#FF0000' : '#FF4444',
        fontWeight: 'bold',
        stroke: '#FFFFFF',
        strokeThickness: 3
      });
      
      damageText.setOrigin(0.5);
      damageText.setDepth(100);
      this.temporaryEffects.push(damageText);
      
      // Animation du texte
      this.scene.tweens.add({
        targets: damageText,
        y: damageText.y - 80,
        alpha: 0,
        scale: isCritical ? 2.0 : 1.8,
        duration: this.animationConfig.damage.number,
        ease: 'Power2.easeOut',
        onComplete: () => {
          damageText.destroy();
          this.removeFromTemporaryEffects(damageText);
          resolve();
        }
      });
      
      // Effet critique si applicable
      if (isCritical) {
        this.createCriticalEffect(target);
      }
    });
  }

  /**
   * Effet critique
   */
  createCriticalEffect(target) {
    const criticalText = this.scene.add.text(target.x, target.y - 80, 'CRITIQUE !', {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFD700',
      fontWeight: 'bold',
      stroke: '#FF0000',
      strokeThickness: 2
    });
    
    criticalText.setOrigin(0.5);
    criticalText.setDepth(110);
    this.temporaryEffects.push(criticalText);
    
    // Animation scintillante
    this.scene.tweens.add({
      targets: criticalText,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        criticalText.destroy();
        this.removeFromTemporaryEffects(criticalText);
      }
    });
  }

  /**
   * Animation de soins
   */
  async animateHeal(data) {
    const { targetType, healing } = data;
    const target = targetType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!target || healing <= 0) return;
    
    console.log(`💚 [BattleAnimationManager] Animation soins: ${healing}`);
    
    return new Promise(resolve => {
      // Particules de soins
      this.createHealingParticles(target);
      
      // Texte de soins
      const healText = this.scene.add.text(target.x, target.y - 50, `+${healing}`, {
        fontSize: '24px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#00FF00',
        fontWeight: 'bold',
        stroke: '#FFFFFF',
        strokeThickness: 3
      });
      
      healText.setOrigin(0.5);
      healText.setDepth(100);
      this.temporaryEffects.push(healText);
      
      this.scene.tweens.add({
        targets: healText,
        y: healText.y - 60,
        alpha: 0,
        scale: 1.4,
        duration: 1500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          healText.destroy();
          this.removeFromTemporaryEffects(healText);
          resolve();
        }
      });
    });
  }

  /**
   * Particules de soins
   */
  createHealingParticles(target) {
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const particle = this.scene.add.text(
          target.x + (Math.random() - 0.5) * 80,
          target.y + (Math.random() - 0.5) * 60,
          '✚',
          {
            fontSize: '16px',
            color: '#00FF88',
            stroke: '#FFFFFF',
            strokeThickness: 1
          }
        );
        
        particle.setOrigin(0.5);
        particle.setDepth(95);
        this.temporaryEffects.push(particle);
        
        this.scene.tweens.add({
          targets: particle,
          y: particle.y - 40,
          alpha: 0,
          scale: 0.5,
          duration: 2000,
          ease: 'Power2.easeOut',
          onComplete: () => {
            particle.destroy();
            this.removeFromTemporaryEffects(particle);
          }
        });
      }, i * 100);
    }
  }

  /**
   * Animation d'effet de statut
   */
  async animateStatusEffect(data) {
    const { targetType, statusType, isApplied = true } = data;
    const target = targetType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!target) return;
    
    console.log(`🌟 [BattleAnimationManager] Animation statut: ${statusType}`);
    
    const statusEmoji = this.getStatusEmoji(statusType);
    const statusColor = this.getStatusColor(statusType);
    
    return new Promise(resolve => {
      // Icône de statut
      const statusIcon = this.scene.add.text(target.x, target.y - 40, statusEmoji, {
        fontSize: '36px',
        fontFamily: 'Arial, sans-serif'
      });
      
      statusIcon.setOrigin(0.5);
      statusIcon.setDepth(100);
      this.temporaryEffects.push(statusIcon);
      
      // Animation de l'icône
      this.scene.tweens.add({
        targets: statusIcon,
        y: statusIcon.y - 60,
        alpha: 0,
        scale: 1.5,
        duration: this.animationConfig.status.float,
        ease: 'Power2.easeOut',
        onComplete: () => {
          statusIcon.destroy();
          this.removeFromTemporaryEffects(statusIcon);
          resolve();
        }
      });
      
      // Effet visuel sur le Pokémon
      if (isApplied) {
        this.applyStatusVisualEffect(target, statusType, statusColor);
      }
    });
  }

  /**
   * Applique un effet visuel de statut sur le Pokémon
   */
  applyStatusVisualEffect(sprite, statusType, color) {
    switch (statusType) {
      case 'poison':
        // Teinte violette qui pulse
        this.scene.tweens.add({
          targets: sprite,
          tint: 0x800080,
          duration: 1000,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut'
        });
        break;
      
      case 'burn':
        // Effet de flammes
        this.createBurnEffect(sprite);
        break;
      
      case 'paralysis':
        // Étincelles électriques
        this.createParalysisEffect(sprite);
        break;
      
      case 'sleep':
        // Bulles de sommeil
        this.createSleepEffect(sprite);
        break;
      
      case 'freeze':
        // Cristaux de glace
        this.createFreezeEffect(sprite);
        break;
    }
  }

  /**
   * Animation K.O.
   */
  async animateFaint(data) {
    const { pokemonType } = data;
    const sprite = pokemonType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!sprite) return;
    
    console.log(`💀 [BattleAnimationManager] Animation K.O.: ${pokemonType}`);
    
    return new Promise(resolve => {
      // Arrêter l'animation d'idle
      const idleTween = sprite.getData?.('idleTween');
      if (idleTween) {
        idleTween.destroy();
      }
      
      // Animation de chute
      this.scene.tweens.add({
        targets: sprite,
        y: sprite.y + 30,
        alpha: 0.3,
        angle: pokemonType === 'player' ? -90 : 90,
        duration: this.animationConfig.faint.fall,
        ease: 'Power2.easeIn',
        onComplete: resolve
      });
      
      // Effet de spirales K.O.
      this.createKOSpiralEffect(sprite);
    });
  }

  /**
   * Effet de spirales K.O.
   */
  createKOSpiralEffect(sprite) {
    for (let i = 0; i < 3; i++) {
      const spiral = this.scene.add.graphics();
      spiral.lineStyle(3, 0xFFFFFF, 0.8);
      spiral.arc(0, 0, 20 + i * 10, 0, Math.PI * 2);
      spiral.setPosition(sprite.x, sprite.y - 20);
      spiral.setDepth(50);
      this.temporaryEffects.push(spiral);
      
      this.scene.tweens.add({
        targets: spiral,
        y: spiral.y - 50,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        rotation: Math.PI * 4,
        duration: this.animationConfig.faint.spiral,
        delay: i * 200,
        ease: 'Power2.easeOut',
        onComplete: () => {
          spiral.destroy();
          this.removeFromTemporaryEffects(spiral);
        }
      });
    }
  }

  /**
   * Animation de capture
   */
  async animateCapture(data) {
    const { ballType = 'pokeball', targetSprite } = data;
    
    console.log(`🎯 [BattleAnimationManager] Animation capture: ${ballType}`);
    
    return new Promise(resolve => {
      setTimeout(resolve, 2000); // Placeholder
    });
  }

  /**
   * Animation de victoire
   */
  async animateVictory(data) {
    const { winner } = data;
    
    console.log(`🎉 [BattleAnimationManager] Animation victoire: ${winner}`);
    
    return new Promise(resolve => {
      this.createVictoryEffect();
      setTimeout(resolve, 3000);
    });
  }

  /**
   * Effet de victoire
   */
  createVictoryEffect() {
    const { width, height } = this.scene.cameras.main;
    
    // Étoiles qui tombent
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const star = this.scene.add.text(
          Math.random() * width,
          -50,
          '⭐',
          { fontSize: '24px' }
        );
        star.setDepth(150);
        this.temporaryEffects.push(star);
        
        this.scene.tweens.add({
          targets: star,
          y: height + 50,
          x: star.x + (Math.random() - 0.5) * 100,
          rotation: Math.PI * 4,
          alpha: 0,
          duration: 3000,
          ease: 'Power2.easeIn',
          onComplete: () => {
            star.destroy();
            this.removeFromTemporaryEffects(star);
          }
        });
      }, i * 250);
    }
  }

  // === ANIMATIONS SPÉCIALISÉES ===

  /**
   * Effet de brûlure
   */
  createBurnEffect(sprite) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const flame = this.scene.add.text(
          sprite.x + (Math.random() - 0.5) * 40,
          sprite.y + (Math.random() - 0.5) * 40,
          '🔥',
          { fontSize: '16px' }
        );
        flame.setDepth(95);
        this.temporaryEffects.push(flame);
        
        this.scene.tweens.add({
          targets: flame,
          y: flame.y - 30,
          alpha: 0,
          duration: 1500,
          ease: 'Power2.easeOut',
          onComplete: () => {
            flame.destroy();
            this.removeFromTemporaryEffects(flame);
          }
        });
      }, i * 200);
    }
  }

  /**
   * Effet de paralysie
   */
  createParalysisEffect(sprite) {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const spark = this.scene.add.text(
          sprite.x + (Math.random() - 0.5) * 60,
          sprite.y + (Math.random() - 0.5) * 60,
          '⚡',
          { fontSize: '14px' }
        );
        spark.setDepth(95);
        this.temporaryEffects.push(spark);
        
        this.scene.tweens.add({
          targets: spark,
          alpha: 0,
          scale: 0.5,
          duration: 800,
          ease: 'Power2.easeOut',
          onComplete: () => {
            spark.destroy();
            this.removeFromTemporaryEffects(spark);
          }
        });
      }, i * 100);
    }
  }

  /**
   * Effet de sommeil
   */
  createSleepEffect(sprite) {
    const createBubble = () => {
      const bubble = this.scene.add.text(
        sprite.x + (Math.random() - 0.5) * 30,
        sprite.y - 20,
        '💤',
        { fontSize: '18px' }
      );
      bubble.setDepth(95);
      this.temporaryEffects.push(bubble);
      
      this.scene.tweens.add({
        targets: bubble,
        y: bubble.y - 40,
        x: bubble.x + (Math.random() - 0.5) * 20,
        alpha: 0,
        duration: 2500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          bubble.destroy();
          this.removeFromTemporaryEffects(bubble);
        }
      });
    };
    
    // Créer des bulles périodiquement
    for (let i = 0; i < 4; i++) {
      setTimeout(createBubble, i * 600);
    }
  }

  /**
   * Effet de gel
   */
  createFreezeEffect(sprite) {
    // Teinte bleue glaciale
    this.scene.tweens.add({
      targets: sprite,
      tint: 0x87CEEB,
      duration: 1500,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Cristaux de glace
    for (let i = 0; i < 6; i++) {
      const crystal = this.scene.add.text(
        sprite.x + (Math.random() - 0.5) * 50,
        sprite.y + (Math.random() - 0.5) * 50,
        '❄️',
        { fontSize: '16px' }
      );
      crystal.setDepth(95);
      this.temporaryEffects.push(crystal);
      
      this.scene.tweens.add({
        targets: crystal,
        alpha: 0,
        rotation: Math.PI,
        scale: 0.3,
        duration: 2000,
        ease: 'Power2.easeOut',
        onComplete: () => {
          crystal.destroy();
          this.removeFromTemporaryEffects(crystal);
        }
      });
    }
  }

  // === UTILITAIRES ===

  /**
   * Obtient la couleur d'un type d'attaque
   */
  getMoveTypeColor(moveType) {
    const colors = {
      'normal': 0xA8A878, 'fire': 0xFF4444, 'water': 0x4488FF,
      'electric': 0xFFDD00, 'grass': 0x44DD44, 'ice': 0x88DDFF,
      'fighting': 0xCC2222, 'poison': 0xAA44AA, 'ground': 0xDDCC44,
      'flying': 0xAABBFF, 'psychic': 0xFF4488, 'bug': 0xAABB22,
      'rock': 0xBBAA44, 'ghost': 0x7755AA, 'dragon': 0x7744FF,
      'dark': 0x775544, 'steel': 0xAAAAAA, 'fairy': 0xFFAAEE
    };
    return colors[moveType] || 0xFFFFFF;
  }

  /**
   * Obtient l'emoji d'un statut
   */
  getStatusEmoji(statusType) {
    const emojis = {
      'poison': '☠️',
      'burn': '🔥',
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵'
    };
    return emojis[statusType] || '❓';
  }

  /**
   * Obtient la couleur d'un statut
   */
  getStatusColor(statusType) {
    const colors = {
      'poison': 0x800080,
      'burn': 0xFF4500,
      'paralysis': 0xFFD700,
      'sleep': 0x9370DB,
      'freeze': 0x87CEEB,
      'confusion': 0xFF69B4
    };
    return colors[statusType] || 0xFFFFFF;
  }

  /**
   * Supprime un effet des effets temporaires
   */
  removeFromTemporaryEffects(effect) {
    const index = this.temporaryEffects.indexOf(effect);
    if (index > -1) {
      this.temporaryEffects.splice(index, 1);
    }
  }

  // === CONTRÔLES ===

  /**
   * Arrête toutes les animations
   */
  stopAllAnimations() {
    console.log('⏹️ [BattleAnimationManager] Arrêt de toutes les animations');
    
    // Vider la queue
    this.animationQueue = [];
    this.concurrentAnimations.clear();
    this.isAnimating = false;
    this.currentAnimation = null;
    
    // Détruire les effets temporaires
    this.temporaryEffects.forEach(effect => {
      if (effect.destroy) {
        effect.destroy();
      }
    });
    this.temporaryEffects = [];
    
    // Arrêter les tweens sur les sprites
    if (this.playerSprite) {
      this.scene.tweens.killTweensOf(this.playerSprite);
    }
    if (this.opponentSprite) {
      this.scene.tweens.killTweensOf(this.opponentSprite);
    }
  }

  /**
   * Met en pause les animations
   */
  pauseAnimations() {
    this.scene.tweens.pauseAll();
  }

  /**
   * Reprend les animations
   */
  resumeAnimations() {
    this.scene.tweens.resumeAll();
  }

  /**
   * Vide la queue d'animations
   */
  clearQueue() {
    this.animationQueue = [];
    this.concurrentAnimations.clear();
    console.log('🗑️ [BattleAnimationManager] Queue vidée');
  }

  // === GETTERS ===

  /**
   * Vérifie si une animation est en cours
   */
  isCurrentlyAnimating() {
    return this.isAnimating;
  }

  /**
   * Obtient la queue d'animations
   */
  getAnimationQueue() {
    return [...this.animationQueue];
  }

  /**
   * Obtient l'animation actuelle
   */
  getCurrentAnimation() {
    return this.currentAnimation;
  }

  /**
   * ✅ Obtient les animations concurrentes en cours
   */
  getConcurrentAnimations() {
    return Array.from(this.concurrentAnimations);
  }

  // === API PUBLIQUES POUR CONTRÔLER LA CONCURRENCE ===

  /**
   * ✅ Force une animation à être concurrente
   */
  queueConcurrentAnimation(animationType, data = {}) {
    return this.queueAnimation(animationType, data, { concurrent: true });
  }

  /**
   * ✅ Force une animation à être séquentielle
   */
  queueSequentialAnimation(animationType, data = {}) {
    return this.queueAnimation(animationType, data, { concurrent: false });
  }

  // === NETTOYAGE ===

  /**
   * Détruit le manager
   */
  destroy() {
    console.log('💀 [BattleAnimationManager] Destruction...');
    
    this.stopAllAnimations();
    
    // Nettoyer les références
    this.scene = null;
    this.playerSprite = null;
    this.opponentSprite = null;
    this.currentAnimation = null;
    this.concurrentAnimations.clear();
    
    console.log('✅ [BattleAnimationManager] Détruit');
  }
}
