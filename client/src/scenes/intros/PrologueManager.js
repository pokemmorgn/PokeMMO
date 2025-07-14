// client/src/scenes/intros/PrologueManager.js
// CORRECTIFS: 
// 1. La dernière vision (vision5) ne s'envole PAS, elle reste jusqu'à la fin
// 2. Transition améliorée vers l'intro Psyduck
// 3. Debugging amélioré

export class PrologueManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.container = null;
    this.effects = [];
    this.texts = [];
    this.dreamBox = null;
    this.activeTimers = [];
    this.onCompleteCallback = null;
    this.currentVisions = []; // ✅ NOUVEAU: Tracker les visions actives
    
    // Configuration du prologue
    this.config = {
      duration: 40000,
      textSequence: [
        { text: "A blinding flash of light...", delay: 1000, duration: 4000 },
        { text: "And then... silence.", delay: 6000, duration: 4000 },
        { text: "You open your eyes to an unknown world.", delay: 11000, duration: 5000 },
        { text: "Something feels... wrong here. Even the air whispers of ancient conflicts.", delay: 17000, duration: 6000 },
        { text: "Time itself seems uncertain in this place.", delay: 24000, duration: 5000 },
        { text: "But in this troubled world, you are not alone...", delay: 30000, duration: 5000 }
      ],
      visions: [
        { image: 'vision1', isLast: false },
        { image: 'vision2', isLast: false }, 
        { image: 'vision3', isLast: false },
        { image: 'vision4', isLast: false },
        { image: 'vision5', isLast: true } // ✅ MARQUÉE comme dernière
      ]
    };
    console.log('[Prologue] 🐛 DEBUG: duration configurée à', this.config.duration, 'ms');
  }

  // === PRELOAD DES IMAGES DE VISION ===
  preloadVisionImages() {
    if (!this.scene.load) return Promise.resolve();
    
    return new Promise((resolve) => {
      this.scene.load.image('vision1', 'assets/preintro/vision1.png');
      this.scene.load.image('vision2', 'assets/preintro/vision2.png'); 
      this.scene.load.image('vision3', 'assets/preintro/vision3.png');
      this.scene.load.image('vision4', 'assets/preintro/vision4.png');
      this.scene.load.image('vision5', 'assets/preintro/vision5.png');
      
      this.scene.load.once('complete', resolve);
      this.scene.load.start();
    });
  }

  // === MÉTHODE PRINCIPALE ===
  async start(onComplete = null) {
    if (this.isPlaying) {
      console.warn('[Prologue] Prologue déjà en cours');
      return false;
    }

    this.isPlaying = true;
    this.onCompleteCallback = onComplete;

    try {
      console.log('[Prologue] 🎬 Starting mystical prologue');
      
      await this.preloadVisionImages();
      
      this.createContainer();
      this.createMysticalBackground();
      this.startTextSequence();
      
      // ✅ NOUVEAU: Auto-completion plus tard pour laisser le temps à la dernière vision
      const autoCompleteTimer = this.scene.time.delayedCall(this.config.duration + 3000, () => {
        if (this.isPlaying) {
          console.log('[Prologue] ⏰ Auto-completion par timeout après', this.config.duration + 3000, 'ms');
          this.complete();
        }
      });
      
      this.activeTimers.push(autoCompleteTimer);
      return true;

    } catch (error) {
      console.error('[Prologue] Erreur démarrage:', error);
      this.cleanup();
      return false;
    }
  }

  // === CRÉATION DE L'INTERFACE ===
  createContainer() {
    this.container = this.scene.add.container(0, 0)
      .setDepth(10000)
      .setScrollFactor(0);

    const camera = this.scene.cameras.main;
    const blackOverlay = this.scene.add.rectangle(
      camera.width / 2, 
      camera.height / 2, 
      camera.width, 
      camera.height, 
      0x000000, 
      1
    );

    this.container.add(blackOverlay);
    this.effects.push(blackOverlay);
  }

  // === EFFETS MYSTIQUES ===
  createMysticalBackground() {
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;

    this.scene.time.delayedCall(800, () => {
      this.createLightFlash(centerX, centerY);
    });

    this.scene.time.delayedCall(3000, () => {
      this.createMysticalSpiral(centerX, centerY);
    });

    this.scene.time.delayedCall(6000, () => {
      this.createAwakeningEffect();
    });

    this.scene.time.delayedCall(9000, () => {
      this.createFloatingParticles(centerX, centerY);
    });

    this.scene.time.delayedCall(13000, () => {
      this.createTimeDistortion(centerX, centerY);
    });

    this.createVisionSequence();
  }

  createLightFlash(x, y) {
    const flash = this.scene.add.circle(x, y, 0, 0xffffff, 0);
    this.container.add(flash);
    this.effects.push(flash);

    this.scene.tweens.add({
      targets: flash,
      radius: 400,
      alpha: 0.9,
      duration: 800,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 1500,
          ease: 'Power3'
        });
      }
    });

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 2
    });
  }

  createMysticalSpiral(x, y) {
    const graphics = this.scene.add.graphics();
    this.container.add(graphics);
    this.effects.push(graphics);

    let angle = 0;
    const spiralTween = this.scene.tweens.addCounter({
      from: 0,
      to: 720,
      duration: 3000,
      ease: 'Power2',
      onUpdate: () => {
        angle = spiralTween.getValue();
        
        graphics.clear();
        graphics.lineStyle(2, 0x4a90e2, 0.8);
        
        for (let i = 0; i < angle; i += 5) {
          const radius = (i / 720) * 100;
          const alpha = 1 - (i / 720);
          const spiralX = x + Math.cos(i * Math.PI / 180) * radius;
          const spiralY = y + Math.sin(i * Math.PI / 180) * radius;
          
          if (i === 0) {
            graphics.moveTo(spiralX, spiralY);
          } else {
            graphics.lineTo(spiralX, spiralY);
          }
        }
        
        graphics.strokePath();
      },
      onComplete: () => {
        this.scene.tweens.add({
          targets: graphics,
          alpha: 0,
          duration: 1000
        });
      }
    });
  }

  createAwakeningEffect() {
    const camera = this.scene.cameras.main;
    
    const blurOverlay = this.scene.add.rectangle(
      camera.width / 2,
      camera.height / 2,
      camera.width,
      camera.height,
      0x87ceeb,
      0.6
    );
    
    this.container.add(blurOverlay);
    this.effects.push(blurOverlay);

    this.scene.tweens.add({
      targets: blurOverlay,
      alpha: 0,
      duration: 2500,
      ease: 'Power3'
    });

    const blink = this.scene.add.rectangle(
      camera.width / 2,
      camera.height / 2,
      camera.width,
      camera.height,
      0x000000,
      0
    );
    
    this.container.add(blink);
    this.effects.push(blink);

    this.scene.tweens.add({
      targets: blink,
      alpha: 0.8,
      duration: 200,
      yoyo: true,
      repeat: 2,
      delay: 500
    });
  }

  createFloatingParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      const particleTimer = this.scene.time.delayedCall(i * 150, () => {
        const particle = this.scene.add.circle(
          x + (Math.random() - 0.5) * 400,
          y + (Math.random() - 0.5) * 300,
          Math.random() * 4 + 2,
          Math.random() > 0.5 ? 0xff6b6b : 0x4ecdc4,
          0.7
        );
        
        this.container.add(particle);
        this.effects.push(particle);

        this.scene.tweens.add({
          targets: particle,
          y: particle.y - (Math.random() * 80 + 30),
          x: particle.x + (Math.random() - 0.5) * 60,
          alpha: 0,
          duration: 4000,
          ease: 'Power2'
        });

        this.scene.tweens.add({
          targets: particle,
          scaleX: Math.random() * 1.8 + 0.5,
          scaleY: Math.random() * 1.8 + 0.5,
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: Math.floor(Math.random() * 3)
        });
      });
      
      this.activeTimers.push(particleTimer);
    }
  }

  createTimeDistortion(x, y) {
    const distortionGraphics = this.scene.add.graphics();
    this.container.add(distortionGraphics);
    this.effects.push(distortionGraphics);

    let time = 0;
    const distortionTween = this.scene.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 3000,
      ease: 'Sine.easeInOut',
      repeat: 1,
      onUpdate: () => {
        time = distortionTween.getValue();
        
        distortionGraphics.clear();
        
        for (let ring = 1; ring <= 4; ring++) {
          const baseRadius = ring * 30;
          const distortion = Math.sin(time * Math.PI / 180 * ring) * 10;
          const alpha = 0.3 - (ring * 0.05);
          
          distortionGraphics.lineStyle(2, 0x9b59b6, alpha);
          distortionGraphics.strokeCircle(x, y, baseRadius + distortion);
        }
        
        distortionGraphics.lineStyle(1, 0xe74c3c, 0.4);
        for (let i = 0; i < 8; i++) {
          const angle = (i * 45 + time * 2) * Math.PI / 180;
          const startX = x + Math.cos(angle) * 20;
          const startY = y + Math.sin(angle) * 20;
          const endX = x + Math.cos(angle) * (60 + Math.sin(time * Math.PI / 180) * 20);
          const endY = y + Math.sin(angle) * (60 + Math.sin(time * Math.PI / 180) * 20);
          
          distortionGraphics.moveTo(startX, startY);
          distortionGraphics.lineTo(endX, endY);
        }
        
        distortionGraphics.strokePath();
      },
      onComplete: () => {
        this.scene.tweens.add({
          targets: distortionGraphics,
          alpha: 0,
          duration: 1500
        });
      }
    });
  }

  createVisionSequence() {
    const camera = this.scene.cameras.main;
    this.createDreamBox(camera);
    this.startDreamSlideshow();
  }

  createDreamBox(camera) {
    const boxWidth = 300;
    const boxHeight = 210;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    
    this.dreamBox = this.scene.add.container(centerX, centerY);
    this.container.add(this.dreamBox);
    
    const dreamBg = this.scene.add.rectangle(0, 0, boxWidth + 20, boxHeight + 20, 0x000000, 0.3);
    const glow = this.scene.add.rectangle(0, 0, boxWidth + 60, boxHeight + 60, 0x4a90e2, 0.05);
    
    this.dreamBox.add([glow, dreamBg]);
    this.effects.push(this.dreamBox);
    
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.1,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 4000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    this.scene.tweens.add({
      targets: dreamBg,
      alpha: 0.4,
      duration: 5000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  startDreamSlideshow() {
    let currentVisionIndex = 0;
    const visions = this.config.visions;
    const dreamTransitionDuration = 6000;
    
    const showNextVision = () => {
      if (currentVisionIndex >= visions.length) {
        // ✅ CORRECTION: Attendre plus longtemps pour la dernière vision
        console.log('[Prologue] 🏁 Slideshow terminé, attente avant fade dreamBox');
        this.scene.time.delayedCall(8000, () => { // 8 secondes au lieu de 3
          this.fadeDreamBox();
        });
        return;
      }
      
      const vision = visions[currentVisionIndex];
      console.log(`[Prologue] 👁️ Vision ${currentVisionIndex + 1}/${visions.length}: ${vision.image} (isLast: ${vision.isLast})`);
      
      this.showDreamVision(vision.image, dreamTransitionDuration, vision.isLast);
      
      currentVisionIndex++;
      
      if (currentVisionIndex < visions.length) {
        this.scene.time.delayedCall(dreamTransitionDuration, showNextVision);
      } else {
        // ✅ Fin du slideshow mais la dernière vision reste
        console.log('[Prologue] 🎯 Dernière vision affichée, elle va rester');
        showNextVision(); // Appeler pour programmer le fade de la dreamBox
      }
    };
    
    this.scene.time.delayedCall(4000, showNextVision);
  }

  // ✅ CORRECTION MAJEURE: Paramètre isLast pour gérer différemment la dernière vision
  showDreamVision(imageKey, duration, isLast = false) {
    if (!this.dreamBox || !this.scene) {
      console.warn('[Prologue] DreamBox déjà détruite, skip vision');
      return;
    }
    
    const boxWidth = 300;
    const boxHeight = 210;
    
    console.log(`[Prologue] 🖼️ Affichage vision: ${imageKey} (isLast: ${isLast})`);
    
    const visionImage = this.scene.add.image(0, 0, imageKey);
    
    const scaleX = boxWidth / visionImage.width;
    const scaleY = boxHeight / visionImage.height;
    const scale = Math.min(scaleX, scaleY) * 0.85;
    visionImage.setScale(scale);
    
    visionImage.setAlpha(0);
    visionImage.setTint(0x888888);
    
    const blurLayer1 = this.scene.add.image(2, 2, imageKey);
    blurLayer1.setScale(scale * 1.02);
    blurLayer1.setAlpha(0);
    blurLayer1.setTint(0x666666);
    
    const blurLayer2 = this.scene.add.image(-2, -2, imageKey);
    blurLayer2.setScale(scale * 0.98);
    blurLayer2.setAlpha(0);
    blurLayer2.setTint(0x999999);
    
    if (this.dreamBox) {
      this.dreamBox.add([blurLayer1, blurLayer2, visionImage]);
    } else {
      visionImage.destroy();
      blurLayer1.destroy();
      blurLayer2.destroy();
      return;
    }

    // ✅ Tracker les visions pour nettoyage
    const visionGroup = { main: visionImage, blur1: blurLayer1, blur2: blurLayer2, isLast };
    this.currentVisions.push(visionGroup);
    
    // Animation d'apparition
    this.scene.tweens.add({
      targets: visionImage,
      alpha: 0.8,
      duration: 1000,
      ease: 'Power2'
    });
    
    this.scene.tweens.add({
      targets: blurLayer1,
      alpha: 0.3,
      duration: 1200,
      ease: 'Power2'
    });
    
    this.scene.tweens.add({
      targets: blurLayer2,
      alpha: 0.2,
      duration: 1400,
      ease: 'Power2'
    });
    
    // ✅ Mouvement hypnotique CONTINU pour la dernière vision
    if (isLast) {
      console.log(`[Prologue] ⭐ Vision ${imageKey} est la DERNIÈRE - mouvement hypnotique continu`);
      
      // Mouvement hypnotique infini pour la dernière vision
      this.scene.tweens.add({
        targets: visionImage,
        scaleX: scale * 1.15,
        scaleY: scale * 1.15,
        rotation: 0.1,
        y: 8,
        duration: 6000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1 // ✅ INFINI pour la dernière vision
      });
      
      // Effet de respiration pour les couches de flou
      this.scene.tweens.add({
        targets: [blurLayer1, blurLayer2],
        alpha: 0.4,
        scaleX: scale * 1.05,
        scaleY: scale * 1.05,
        duration: 4000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1 // ✅ INFINI
      });
      
    } else {
      // Mouvement normal pour les autres visions
      this.scene.tweens.add({
        targets: visionImage,
        scaleX: scale * 1.1,
        scaleY: scale * 1.1,
        rotation: (Math.random() - 0.5) * 0.15,
        y: (Math.random() - 0.5) * 15,
        duration: duration - 2000,
        ease: 'Sine.easeInOut'
      });
      
      // ✅ ENVOL uniquement pour les visions NON-dernières
      const flyAwayDelay = duration - 2000;
      
      this.scene.time.delayedCall(flyAwayDelay, () => {
        if (!visionImage || !visionImage.scene) return;
        
        console.log(`[Prologue] 🦋 Envol de vision: ${imageKey}`);
        
        const flyDirection = Math.random() * Math.PI * 2;
        const flyDistance = 300 + Math.random() * 200;
        const flyX = Math.cos(flyDirection) * flyDistance;
        const flyY = Math.sin(flyDirection) * flyDistance;
        
        // Envol image principale
        this.scene.tweens.add({
          targets: visionImage,
          x: flyX,
          y: flyY,
          alpha: 0,
          scaleX: scale * 0.3,
          scaleY: scale * 0.3,
          rotation: visionImage.rotation + (Math.random() - 0.5) * 2,
          duration: 2000,
          ease: 'Power2',
          onComplete: () => {
            if (visionImage && visionImage.destroy) {
              visionImage.destroy();
            }
          }
        });
        
        // Envol couches flou
        if (blurLayer1 && blurLayer1.scene) {
          this.scene.tweens.add({
            targets: blurLayer1,
            x: flyX + (Math.random() - 0.5) * 100,
            y: flyY + (Math.random() - 0.5) * 100,
            alpha: 0,
            scaleX: scale * 0.2,
            scaleY: scale * 0.2,
            rotation: blurLayer1.rotation + (Math.random() - 0.5) * 1.5,
            duration: 2200,
            ease: 'Power2',
            onComplete: () => {
              if (blurLayer1 && blurLayer1.destroy) {
                blurLayer1.destroy();
              }
            }
          });
        }
        
        if (blurLayer2 && blurLayer2.scene) {
          this.scene.tweens.add({
            targets: blurLayer2,
            x: flyX + (Math.random() - 0.5) * 120,
            y: flyY + (Math.random() - 0.5) * 120,
            alpha: 0,
            scaleX: scale * 0.1,
            scaleY: scale * 0.1,
            rotation: blurLayer2.rotation + (Math.random() - 0.5) * 1.8,
            duration: 2400,
            ease: 'Power2',
            onComplete: () => {
              if (blurLayer2 && blurLayer2.destroy) {
                blurLayer2.destroy();
              }
            }
          });
        }
        
        // ✅ Retirer de la liste des visions actives
        const index = this.currentVisions.findIndex(v => v.main === visionImage);
        if (index !== -1) {
          this.currentVisions.splice(index, 1);
        }
      });
    }
  }

  fadeDreamBox() {
    if (this.dreamBox) {
      console.log('[Prologue] 🌙 Fade dreamBox (mais la dernière vision reste visible)');
      
      // ✅ Fade seulement le fond de la dreamBox, pas le contenu
      const dreamBoxChildren = this.dreamBox.list;
      const backgroundElements = dreamBoxChildren.slice(0, 2); // Glow + Background
      
      this.scene.tweens.add({
        targets: backgroundElements,
        alpha: 0,
        duration: 2000,
        ease: 'Power2'
      });
    }
  }

  // === SÉQUENCE DE TEXTE ===
  startTextSequence() {
    console.log('[Prologue] 📝 Démarrage séquence de texte avec', this.config.textSequence.length, 'textes');
    
    this.config.textSequence.forEach((textData, index) => {
      console.log(`[Prologue] ⏰ Programmation texte ${index + 1}:`, textData.text.substring(0, 30) + '...', 'delay:', textData.delay, 'duration:', textData.duration);
      
      const timer = this.scene.time.delayedCall(textData.delay, () => {
        console.log(`[Prologue] 🎯 Exécution texte ${index + 1} à ${Date.now()}`);
        this.showText(textData.text, textData.duration, index === this.config.textSequence.length - 1);
      });
      this.activeTimers.push(timer);
    });
  }

  formatTextWithLineBreaks(text, maxCharsPerLine = 15) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    
    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }
    
    return lines.join('\n');
  }

  showText(text, duration, isLast = false) {
    console.log(`[Prologue] 📄 showText appelé: "${text.substring(0, 40)}..." isLast:`, isLast, 'container exists:', !!this.container);
    
    if (!this.container || !this.scene) {
      console.warn('[Prologue] ❌ Container déjà détruit, skip texte:', text.substring(0, 30));
      return;
    }
    
    const camera = this.scene.cameras.main;
    const formattedText = this.formatTextWithLineBreaks(text, 15);
    
    console.log(`[Prologue] ✅ Création texte: "${formattedText}"`);
    
    const textObject = this.scene.add.text(
      camera.width / 2,
      camera.height / 2 + 100,
      formattedText,
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }
    ).setOrigin(0.5).setAlpha(0);

    this.container.add(textObject);
    this.texts.push(textObject);

    console.log(`[Prologue] ✅ Texte ajouté au container, total textes:`, this.texts.length);

    this.scene.tweens.add({
      targets: textObject,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });

    if (!isLast) {
      console.log(`[Prologue] ⏰ Programmation fade out dans ${duration - 800}ms`);
      const fadeTimer = this.scene.time.delayedCall(duration - 800, () => {
        console.log(`[Prologue] 🌅 Fade out texte: "${text.substring(0, 30)}..."`);
        if (textObject && textObject.scene) {
          this.scene.tweens.add({
            targets: textObject,
            alpha: 0,
            duration: 800,
            ease: 'Power2'
          });
        }
      });
      this.activeTimers.push(fadeTimer);
    } else {
      console.log(`[Prologue] 🏁 DERNIER TEXTE! Programmation completion dans ${duration}ms`);
      const completeTimer = this.scene.time.delayedCall(duration, () => {
        console.log(`[Prologue] 🎬 Lancement completion finale`);
        this.complete();
      });
      this.activeTimers.push(completeTimer);
    }
  }

  // === FINALISATION ===
  complete() {
    if (!this.isPlaying) {
      console.log('[Prologue] ⚠️ Complete appelé mais pas en cours de lecture');
      return;
    }

    console.log('[Prologue] ✅ Prologue completed, transitioning to intro');
    
    // ✅ CORRECTION: Fade plus doux et callback appelé plus tôt
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 2000, // Plus lent pour transition douce
      ease: 'Power2',
      onComplete: () => {
        console.log('[Prologue] 🎭 Fade out terminé, début cleanup');
        this.cleanup();
      }
    });
    
    // ✅ NOUVEAU: Callback appelé PENDANT le fade, pas après
    this.scene.time.delayedCall(500, () => {
      if (this.onCompleteCallback) {
        console.log('[Prologue] 📞 Appel du callback (pendant transition)');
        this.onCompleteCallback();
      }
    });
  }

  // === NETTOYAGE ===
  cleanup() {
    try {
      console.log('[Prologue] 🧹 Cleaning up prologue... isPlaying:', this.isPlaying, 'activeTimers:', this.activeTimers.length);
      
      // Annuler tous les timers actifs
      console.log('[Prologue] ⏰ Annulation de', this.activeTimers.length, 'timers');
      this.activeTimers.forEach((timer, index) => {
        if (timer && timer.remove) {
          console.log(`[Prologue] ❌ Suppression timer ${index}`);
          timer.remove();
        }
      });
      this.activeTimers = [];
      
      // Arrêter tous les tweens
      if (this.scene && this.scene.tweens) {
        console.log('[Prologue] 🔄 Arrêt des tweens pour', this.effects.length, 'effets et', this.texts.length, 'textes');
        this.effects.forEach(effect => {
          if (effect) {
            this.scene.tweens.killTweensOf(effect);
          }
        });
        
        this.texts.forEach(text => {
          if (text) {
            this.scene.tweens.killTweensOf(text);
          }
        });

        // ✅ Arrêter les tweens des visions actives
        this.currentVisions.forEach(vision => {
          if (vision.main) this.scene.tweens.killTweensOf(vision.main);
          if (vision.blur1) this.scene.tweens.killTweensOf(vision.blur1);
          if (vision.blur2) this.scene.tweens.killTweensOf(vision.blur2);
        });
      }

      // Détruire le container et tout son contenu
      if (this.container && this.container.destroy) {
        console.log('[Prologue] 💥 Destruction du container');
        this.container.destroy(true);
      }

      // Reset des variables
      this.container = null;
      this.effects = [];
      this.texts = [];
      this.dreamBox = null;
      this.currentVisions = []; // ✅ Reset visions
      this.isPlaying = false;
      this.onCompleteCallback = null;
      
      console.log('[Prologue] ✅ Cleanup terminé');
      
    } catch (error) {
      console.error('[Prologue] ❌ Erreur lors du nettoyage:', error);
      this.isPlaying = false;
    }
  }

  // === CONTRÔLES ===
  skip() {
    if (this.isPlaying) {
      console.log('[Prologue] ⏩ Prologue skipped by user');
      this.complete();
    }
  }

  isActive() {
    return this.isPlaying;
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  setTexts(newTexts) {
    if (Array.isArray(newTexts)) {
      this.config.textSequence = newTexts;
    }
  }

  // === INTÉGRATION AVEC PSYDUCK INTRO ===
  static async createAndRun(scene, onComplete = null) {
    const prologue = new PrologueManager(scene);
    const success = await prologue.start(onComplete);
    return { prologue, success };
  }

  destroy() {
    this.cleanup();
    this.scene = null;
  }
}
