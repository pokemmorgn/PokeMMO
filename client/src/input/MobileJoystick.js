// client/src/input/MobileJoystick.js - VERSION FIXÉE
export class MobileJoystick {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isActive = false;
    this.isDragging = false;
    this.isMobile = this.detectMobile();
    
    // Configuration par défaut
    this.config = {
      x: options.x || 120,
      y: options.y || (scene.cameras.main.height - 120),
      baseRadius: options.baseRadius || 60,
      knobRadius: options.knobRadius || 25,
      maxDistance: options.maxDistance || 50,
      deadZone: options.deadZone || 0.1,
      baseColor: options.baseColor || 0x333333,
      baseAlpha: options.baseAlpha || 0.7,
      knobColor: options.knobColor || 0x64a6ff,
      knobAlpha: options.knobAlpha || 0.9,
      autoHide: options.autoHide !== false, // Par défaut true
      followPointer: options.followPointer || false
    };

    this.currentInput = { x: 0, y: 0, angle: 0, force: 0 };
    this.callbacks = {
      onMove: null,
      onStart: null,
      onEnd: null
    };

    this.createJoystick();
    this.setupEvents();
    
    console.log(`🕹️ Mobile Joystick initialized (Mobile: ${this.isMobile})`);
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  createJoystick() {
    // Conteneur principal
    this.joystickContainer = this.scene.add.container(this.config.x, this.config.y);
    this.joystickContainer.setDepth(2000);
    this.joystickContainer.setScrollFactor(0);

    // Base du joystick (cercle extérieur)
    this.base = this.scene.add.circle(0, 0, this.config.baseRadius, this.config.baseColor);
    this.base.setAlpha(this.config.baseAlpha);
    this.base.setStrokeStyle(3, 0x555555, 0.8);

    // Bouton du joystick (cercle intérieur mobile)
    this.knob = this.scene.add.circle(0, 0, this.config.knobRadius, this.config.knobColor);
    this.knob.setAlpha(this.config.knobAlpha);
    this.knob.setStrokeStyle(2, 0xffffff, 0.8);

    // Indicateur de direction (petite flèche)
    this.directionIndicator = this.scene.add.triangle(0, -15, 0, 10, -8, -10, 8, -10, 0x00ff00);
    this.directionIndicator.setAlpha(0);

    // ✅ FIX: Zone interactive simplifiée
    this.interactiveZone = this.scene.add.zone(0, 0, this.config.baseRadius * 3, this.config.baseRadius * 3);
    
    // ✅ SOLUTION 1: Utiliser directement Phaser.Geom.Circle.Contains
    try {
      this.interactiveZone.setInteractive({
        hitArea: new Phaser.Geom.Circle(0, 0, this.config.baseRadius * 1.5),
        hitAreaCallback: Phaser.Geom.Circle.Contains, // ✅ Fonction native Phaser
        useHandCursor: true
      });
      console.log('✅ Zone interactive du joystick configurée avec Phaser.Geom.Circle.Contains');
    } catch (error) {
      console.warn('⚠️ Erreur avec Circle.Contains, fallback rectangle:', error);
      
      // ✅ FALLBACK: Rectangle (plus sûr)
      this.interactiveZone.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(
          -this.config.baseRadius * 1.5, 
          -this.config.baseRadius * 1.5, 
          this.config.baseRadius * 3, 
          this.config.baseRadius * 3
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      console.log('✅ Zone interactive du joystick configurée avec Rectangle (fallback)');
    }

    // Ajouter au conteneur APRÈS avoir configuré l'interactivité
    this.joystickContainer.add([this.base, this.knob, this.directionIndicator, this.interactiveZone]);

    // Masquer par défaut si autoHide est activé et pas sur mobile
    if (this.config.autoHide && !this.isMobile) {
      this.hide();
    }
  }

  setupEvents() {
    // ✅ Vérifications de sécurité avant configuration des événements
    if (!this.interactiveZone) {
      console.error('❌ MobileJoystick: Zone interactive non créée');
      return;
    }

    if (!this.interactiveZone.input) {
      console.error('❌ MobileJoystick: Zone interactive non configurée correctement');
      return;
    }

    // ✅ Événements tactiles/souris avec gestion d'erreurs
    try {
      this.interactiveZone.on('pointerdown', this.onPointerDown, this);
      this.scene.input.on('pointermove', this.onPointerMove, this);
      this.scene.input.on('pointerup', this.onPointerUp, this);
      
      // ✅ Événements supplémentaires pour mobile
      if (this.isMobile) {
        this.interactiveZone.on('pointerout', this.onPointerUp, this);
        this.interactiveZone.on('pointercancel', this.onPointerUp, this);
      }
      
      console.log('✅ Événements du joystick configurés');
    } catch (error) {
      console.error('❌ Erreur configuration événements joystick:', error);
    }

    // Gestion de l'orientation mobile
    if (this.isMobile) {
      this.orientationHandler = () => {
        setTimeout(() => this.repositionForOrientation(), 100);
      };
      window.addEventListener('orientationchange', this.orientationHandler);
    }

    // Afficher/masquer selon le contexte
    this.scene.events.on('wake', () => {
      if (this.isMobile || !this.config.autoHide) {
        this.show();
      }
    });
  }

  onPointerDown(pointer) {
    if (!this.isActive) return;

    this.isDragging = true;
    this.startPointer = { x: pointer.x, y: pointer.y };

    // Si followPointer est activé, déplacer la base du joystick
    if (this.config.followPointer) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.joystickContainer.x = worldPoint.x;
      this.joystickContainer.y = worldPoint.y;
    }

    // Animation d'activation avec vérification
    if (this.scene.tweens && this.base) {
      this.scene.tweens.add({
        targets: this.base,
        scaleX: 1.1,
        scaleY: 1.1,
        alpha: this.config.baseAlpha * 1.2,
        duration: 100,
        ease: 'Power2'
      });
    }

    this.show();

    if (this.callbacks.onStart) {
      try {
        this.callbacks.onStart();
      } catch (error) {
        console.error('❌ Erreur callback onStart:', error);
      }
    }
  }

  onPointerMove(pointer) {
    if (!this.isDragging || !this.isActive) return;

    try {
      // Calculer la position relative par rapport à la base
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.joystickContainer.x;
      const dy = worldPoint.y - this.joystickContainer.y;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Limiter la distance à maxDistance
      const clampedDistance = Math.min(distance, this.config.maxDistance);
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;

      // Mettre à jour la position du bouton
      if (this.knob) {
        this.knob.x = knobX;
        this.knob.y = knobY;
      }

      // Calculer la force (0 à 1)
      const force = Math.min(distance / this.config.maxDistance, 1);

      // Zone morte
      if (force < this.config.deadZone) {
        this.currentInput = { x: 0, y: 0, angle: 0, force: 0 };
        if (this.directionIndicator) {
          this.directionIndicator.setAlpha(0);
        }
      } else {
        // Normaliser les valeurs (-1 à 1)
        const normalizedX = (knobX / this.config.maxDistance);
        const normalizedY = (knobY / this.config.maxDistance);
        
        this.currentInput = {
          x: normalizedX,
          y: normalizedY,
          angle: angle,
          force: force
        };

        // Mettre à jour l'indicateur de direction
        if (this.directionIndicator) {
          this.directionIndicator.setRotation(angle + Math.PI / 2);
          this.directionIndicator.setAlpha(force * 0.8);
        }
      }

      // Callback de mouvement
      if (this.callbacks.onMove) {
        try {
          this.callbacks.onMove(this.currentInput);
        } catch (error) {
          console.error('❌ Erreur callback onMove:', error);
        }
      }
    } catch (error) {
      console.error('❌ Erreur onPointerMove:', error);
    }
  }

  onPointerUp(pointer) {
    if (!this.isDragging) return;

    this.isDragging = false;

    try {
      // Animation de retour à la position centrale
      if (this.scene.tweens && this.knob) {
        this.scene.tweens.add({
          targets: this.knob,
          x: 0,
          y: 0,
          duration: 200,
          ease: 'Power2'
        });
      }

      // Animation de désactivation de la base
      if (this.scene.tweens && this.base) {
        this.scene.tweens.add({
          targets: this.base,
          scaleX: 1,
          scaleY: 1,
          alpha: this.config.baseAlpha,
          duration: 200,
          ease: 'Power2'
        });
      }

      // Masquer l'indicateur de direction
      if (this.scene.tweens && this.directionIndicator) {
        this.scene.tweens.add({
          targets: this.directionIndicator,
          alpha: 0,
          duration: 150
        });
      }

      // Reset des valeurs
      this.currentInput = { x: 0, y: 0, angle: 0, force: 0 };

      // Auto-masquer si nécessaire
      if (this.config.autoHide && !this.isMobile) {
        if (this.scene.time) {
          this.scene.time.delayedCall(1000, () => {
            if (!this.isDragging) {
              this.hide();
            }
          });
        }
      }

      if (this.callbacks.onEnd) {
        try {
          this.callbacks.onEnd();
        } catch (error) {
          console.error('❌ Erreur callback onEnd:', error);
        }
      }
    } catch (error) {
      console.error('❌ Erreur onPointerUp:', error);
    }
  }

  // Méthodes publiques
  show() {
    if (!this.joystickContainer) return;
    
    this.isActive = true;
    this.joystickContainer.setVisible(true);
    
    if (this.scene.tweens) {
      this.scene.tweens.add({
        targets: this.joystickContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
    }
  }

  hide() {
    if (!this.joystickContainer) return;
    
    if (this.scene.tweens) {
      this.scene.tweens.add({
        targets: this.joystickContainer,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          this.isActive = false;
          if (this.joystickContainer) {
            this.joystickContainer.setVisible(false);
          }
        }
      });
    } else {
      this.isActive = false;
      this.joystickContainer.setVisible(false);
    }
  }

  setPosition(x, y) {
    this.config.x = x;
    this.config.y = y;
    if (this.joystickContainer) {
      this.joystickContainer.x = x;
      this.joystickContainer.y = y;
    }
  }

  repositionForOrientation() {
    if (!this.scene?.cameras?.main) return;
    
    const camera = this.scene.cameras.main;
    if (window.orientation === 90 || window.orientation === -90) {
      // Mode paysage
      this.setPosition(120, camera.height - 80);
    } else {
      // Mode portrait
      this.setPosition(80, camera.height - 120);
    }
  }

  getCurrentInput() {
    return this.currentInput;
  }

  // Callbacks
  onMove(callback) {
    this.callbacks.onMove = callback;
  }

  onStart(callback) {
    this.callbacks.onStart = callback;
  }

  onEnd(callback) {
    this.callbacks.onEnd = callback;
  }

  // Méthodes utilitaires pour les directions
  getDirection() {
    const { x, y, force } = this.currentInput;
    
    if (force < this.config.deadZone) {
      return null;
    }

    // Déterminer la direction principale
    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? 'right' : 'left';
    } else {
      return y > 0 ? 'down' : 'up';
    }
  }

  isMoving() {
    return this.currentInput.force > this.config.deadZone;
  }

  // Remet le joystick à zéro comme si l'utilisateur relâchait tout
  reset() {
    this.isDragging = false;
    
    if (this.knob) {
      this.knob.x = 0;
      this.knob.y = 0;
    }
    
    this.currentInput = { x: 0, y: 0, angle: 0, force: 0 };
    
    if (this.directionIndicator) {
      this.directionIndicator.setAlpha(0);
    }

    // Si autoHide doit s'appliquer
    if (this.config.autoHide && !this.isMobile) {
      this.hide();
    } else {
      this.show();
    }

    if (this.callbacks.onEnd) {
      try {
        this.callbacks.onEnd();
      } catch (error) {
        console.error('❌ Erreur callback onEnd dans reset:', error);
      }
    }
  }

  // ✅ Méthode pour désactiver temporairement sans détruire
  disableTemporarily() {
    console.log('🚫 Désactivation temporaire du MobileJoystick');
    
    this.isActive = false;
    this.isDragging = false;
    
    if (this.interactiveZone && this.interactiveZone.input) {
      this.interactiveZone.disableInteractive();
    }
    
    if (this.joystickContainer) {
      this.joystickContainer.setVisible(false);
    }
  }

  // ✅ Méthode pour réactiver
  reactivate() {
    console.log('✅ Réactivation du MobileJoystick');
    
    if (this.interactiveZone && !this.interactiveZone.input.enabled) {
      this.interactiveZone.setInteractive();
    }
    
    this.isActive = true;
    
    if (this.isMobile || !this.config.autoHide) {
      this.show();
    }
  }

  // ✅ Nettoyage complet et sécurisé
  destroy() {
    console.log('🧹 Destruction MobileJoystick...');

    try {
      // Nettoyer les événements de scène
      if (this.scene && this.scene.input) {
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
      }

      // Nettoyer la zone interactive
      if (this.interactiveZone) {
        if (this.interactiveZone.input) {
          this.interactiveZone.removeInteractive();
        }
        
        this.interactiveZone.off('pointerdown', this.onPointerDown, this);
        
        if (this.isMobile) {
          this.interactiveZone.off('pointerout', this.onPointerUp, this);
          this.interactiveZone.off('pointercancel', this.onPointerUp, this);
        }
        
        if (this.interactiveZone.destroy) {
          this.interactiveZone.destroy();
        }
        this.interactiveZone = null;
      }

      // Nettoyer le conteneur principal
      if (this.joystickContainer) {
        this.joystickContainer.destroy(true);
        this.joystickContainer = null;
      }

      // Nettoyer l'événement d'orientation
      if (this.isMobile && this.orientationHandler) {
        window.removeEventListener('orientationchange', this.orientationHandler);
        this.orientationHandler = null;
      }

      // Nettoyer les références
      this.base = null;
      this.knob = null;
      this.directionIndicator = null;
      this.callbacks = {};
      this.scene = null;

      console.log('✅ MobileJoystick détruit avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la destruction du MobileJoystick:', error);
    }
  }
}
