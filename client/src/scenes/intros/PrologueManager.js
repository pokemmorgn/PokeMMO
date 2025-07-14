// client/src/scenes/intros/PrologueManager.js
// Module standalone pour le prologue de transport mystique
// Usage: await prologueManager.start() avant de lancer l'intro Psyduck

export class PrologueManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.container = null;
    this.effects = [];
    this.texts = [];
    this.dreamBox = null;
    this.activeTimers = []; // Pour tracker les delayedCall
    this.onCompleteCallback = null;
    
    // Configuration du prologue
    this.config = {
      duration: 15000, // Durée totale augmentée pour les nouveaux textes
      textSequence: [
        { text: "A blinding flash of light...", delay: 1000, duration: 4000 },
        { text: "And then... silence.", delay: 6000, duration: 4000 },
        { text: "You open your eyes to an unknown world.", delay: 11000, duration: 5000 },
        { text: "Something feels... wrong here. Even the air whispers of ancient conflicts.", delay: 17000, duration: 6000 },
        { text: "Time itself seems uncertain in this place.", delay: 24000, duration: 5000 },
        { text: "But in this troubled world, you are not alone...", delay: 30000, duration: 5000 }
      ],
      visions: [
        { image: 'vision1' }, // L'Harmonie (début)
        { image: 'vision2' }, // Le Pacte (se superpose à vision1)
        { image: 'vision3' }, // La Trahison (plus intense)
        { image: 'vision4' }, // La Corruption (climax)
        { image: 'vision5' }  // L'Observateur (fin, plus long)
      ]
    };
  }

  // === PRELOAD DES IMAGES DE VISION ===
  preloadVisionImages() {
    if (!this.scene.load) return Promise.resolve();
    
    return new Promise((resolve) => {
      // Charger les 5 images de vision
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
      
      // Preload des images de vision
      await this.preloadVisionImages();
      
      this.createContainer();
      this.createMysticalBackground();
      this.startTextSequence();
      
      // Auto-completion après la durée totale + buffer
      this.scene.time.delayedCall(this.config.duration + 5000, () => {
        if (this.isPlaying) {
          console.log('[Prologue] ⏰ Auto-completion par timeout après', this.config.duration + 5000, 'ms');
          this.complete();
        } else {
          console.log('[Prologue] ⏰ Timeout mais déjà terminé');
        }
      });

      return true;

    } catch (error) {
      console.error('[Prologue] Erreur démarrage:', error);
      this.cleanup();
      return false;
    }
  }

  // === CRÉATION DE L'INTERFACE ===
  createContainer() {
    // Container principal fixé à la caméra
    this.container = this.scene.add.container(0, 0)
      .setDepth(10000)
      .setScrollFactor(0);

    // Fond noir initial
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

    // 1. Particules de lumière mystiques (phase 1: flash aveuglant)
    this.scene.time.delayedCall(800, () => {
      this.createLightFlash(centerX, centerY);
    });

    // 2. Spiral mystique (phase 2: transport)
    this.scene.time.delayedCall(3000, () => {
      this.createMysticalSpiral(centerX, centerY);
    });

    // 3. Éveil progressif (phase 3: clarification)
    this.scene.time.delayedCall(6000, () => {
      this.createAwakeningEffect();
    });

    // 4. Particules flottantes + effet temporel instable (phase 4: monde troublé)
    this.scene.time.delayedCall(9000, () => {
      this.createFloatingParticles(centerX, centerY);
    });

    // 5. Distorsion temporelle subtile (phase 5: instabilité de Celebi)
    this.scene.time.delayedCall(13000, () => {
      this.createTimeDistortion(centerX, centerY);
    });

    // 6. Séquence de visions des souvenirs anciens
    this.createVisionSequence();
  }

  createLightFlash(x, y) {
    // Flash de lumière aveuglante
    const flash = this.scene.add.circle(x, y, 0, 0xffffff, 0);
    this.container.add(flash);
    this.effects.push(flash);

    // Animation du flash
    this.scene.tweens.add({
      targets: flash,
      radius: 400,
      alpha: 0.9,
      duration: 800,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        // Fade out progressif
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 1500,
          ease: 'Power3'
        });
      }
    });

    // Effet de pulsation subtile
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
    // Création d'une spirale mystique avec graphics
    const graphics = this.scene.add.graphics();
    this.container.add(graphics);
    this.effects.push(graphics);

    let angle = 0;
    const spiralTween = this.scene.tweens.addCounter({
      from: 0,
      to: 720, // 2 tours complets
      duration: 3000,
      ease: 'Power2',
      onUpdate: () => {
        angle = spiralTween.getValue();
        
        graphics.clear();
        graphics.lineStyle(2, 0x4a90e2, 0.8);
        
        // Dessiner la spirale
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
        // Disparition de la spirale
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
    
    // Effet de "vision floue" qui se clarifie
    const blurOverlay = this.scene.add.rectangle(
      camera.width / 2,
      camera.height / 2,
      camera.width,
      camera.height,
      0x87ceeb, // Bleu ciel léger
      0.6
    );
    
    this.container.add(blurOverlay);
    this.effects.push(blurOverlay);

    // Clairement progressif
    this.scene.tweens.add({
      targets: blurOverlay,
      alpha: 0,
      duration: 2500,
      ease: 'Power3'
    });

    // Effet de "clignotement d'yeux"
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

    // Animation de clignotement
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
    // Particules mystiques flottantes pour suggérer la corruption du monde
    for (let i = 0; i < 12; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        const particle = this.scene.add.circle(
          x + (Math.random() - 0.5) * 400,
          y + (Math.random() - 0.5) * 300,
          Math.random() * 4 + 2,
          // Couleurs plus sombres et instables pour refléter la corruption
          Math.random() > 0.5 ? 0xff6b6b : 0x4ecdc4, // Rouge corruption ou bleu instable
          0.7
        );
        
        this.container.add(particle);
        this.effects.push(particle);

        // Animation flottante plus erratique
        this.scene.tweens.add({
          targets: particle,
          y: particle.y - (Math.random() * 80 + 30),
          x: particle.x + (Math.random() - 0.5) * 60,
          alpha: 0,
          duration: 4000,
          ease: 'Power2'
        });

        // Pulsation instable
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
      
      // Tracker ce timer aussi
      this.activeTimers.push(timer);
    }
  }

  createTimeDistortion(x, y) {
    // Effet de distorsion temporelle pour suggérer l'instabilité de Celebi
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
        
        // Cercles concentriques qui "vacillent" dans le temps
        for (let ring = 1; ring <= 4; ring++) {
          const baseRadius = ring * 30;
          const distortion = Math.sin(time * Math.PI / 180 * ring) * 10;
          const alpha = 0.3 - (ring * 0.05);
          
          distortionGraphics.lineStyle(2, 0x9b59b6, alpha);
          distortionGraphics.strokeCircle(x, y, baseRadius + distortion);
        }
        
        // Lignes temporelles brisées
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
        // Disparition progressive
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
    
    // Créer la box de rêve centrée
    this.createDreamBox(camera);
    
    // Démarrer le slideshow de visions
    this.startDreamSlideshow();
  }

  createDreamBox(camera) {
    const boxWidth = 300; // Largeur
    const boxHeight = 210; // Hauteur réduite de 30% (300 - 90)
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    
    // Container pour la box de rêve
    this.dreamBox = this.scene.add.container(centerX, centerY);
    this.container.add(this.dreamBox);
    
    // Fond semi-transparent SANS bordure visible
    const dreamBg = this.scene.add.rectangle(0, 0, boxWidth + 20, boxHeight + 20, 0x000000, 0.3);
    // Pas de bordure visible
    
    // Effet de lueur très subtile autour de la box
    const glow = this.scene.add.rectangle(0, 0, boxWidth + 60, boxHeight + 60, 0x4a90e2, 0.05);
    
    this.dreamBox.add([glow, dreamBg]);
    this.effects.push(this.dreamBox);
    
    // Animation de pulsation très douce et lente (transe)
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
    
    // Pulsation du fond pour effet hypnotique
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
    const dreamTransitionDuration = 6000; // 6 secondes par image au lieu de 3
    
    const showNextVision = () => {
      if (currentVisionIndex >= visions.length) {
        // Fin du slideshow
        this.scene.time.delayedCall(3000, () => {
          this.fadeDreamBox();
        });
        return;
      }
      
      const vision = visions[currentVisionIndex];
      this.showDreamVision(vision.image, dreamTransitionDuration);
      
      currentVisionIndex++;
      
      // Programmer la prochaine vision
      this.scene.time.delayedCall(dreamTransitionDuration, showNextVision);
    };
    
    // Démarrer le slideshow après un délai plus long pour la transe
    this.scene.time.delayedCall(4000, showNextVision); // 4 secondes au lieu de 1.5
  }

  showDreamVision(imageKey, duration) {
    // Vérifier que la dreamBox existe encore
    if (!this.dreamBox || !this.scene) {
      console.warn('[Prologue] DreamBox déjà détruite, skip vision');
      return;
    }
    
    const boxWidth = 300;
    const boxHeight = 210;
    
    // Créer l'image de vision
    const visionImage = this.scene.add.image(0, 0, imageKey);
    
    // Ajuster à la taille de la box (format rectangulaire)
    const scaleX = boxWidth / visionImage.width;
    const scaleY = boxHeight / visionImage.height;
    const scale = Math.min(scaleX, scaleY) * 0.85;
    visionImage.setScale(scale);
    
    // Effet de transe INTENSE - très flou et désaturé
    visionImage.setAlpha(0);
    visionImage.setTint(0x888888);
    
    // Ajouter les couches de flou
    const blurLayer1 = this.scene.add.image(2, 2, imageKey);
    blurLayer1.setScale(scale * 1.02);
    blurLayer1.setAlpha(0);
    blurLayer1.setTint(0x666666);
    
    const blurLayer2 = this.scene.add.image(-2, -2, imageKey);
    blurLayer2.setScale(scale * 0.98);
    blurLayer2.setAlpha(0);
    blurLayer2.setTint(0x999999);
    
    // Vérifier encore avant d'ajouter
    if (this.dreamBox) {
      this.dreamBox.add([blurLayer1, blurLayer2, visionImage]);
    } else {
      // Si dreamBox n'existe plus, détruire les images
      visionImage.destroy();
      blurLayer1.destroy();
      blurLayer2.destroy();
      return;
    }
    
    // Animation d'apparition PLUS VISIBLE
    this.scene.tweens.add({
      targets: visionImage,
      alpha: 0.8, // Plus visible
      duration: 1000, // Plus lent
      ease: 'Power2'
    });
    
    this.scene.tweens.add({
      targets: blurLayer1,
      alpha: 0.3, // Plus visible
      duration: 1200,
      ease: 'Power2'
    });
    
    this.scene.tweens.add({
      targets: blurLayer2,
      alpha: 0.2, // Plus visible
      duration: 1400,
      ease: 'Power2'
    });
    
    // Mouvement hypnotique pendant la durée visible
    this.scene.tweens.add({
      targets: visionImage,
      scaleX: scale * 1.1,
      scaleY: scale * 1.1,
      rotation: (Math.random() - 0.5) * 0.15,
      y: (Math.random() - 0.5) * 15,
      duration: duration - 2000, // Mouvement pendant presque toute la durée
      ease: 'Sine.easeInOut'
    });
    
    // EFFET D'ENVOL COMME SOUVENIR INSTABLE
    const flyAwayDelay = duration - 2000; // Commencer l'envol 2 secondes avant la fin
    
    this.scene.time.delayedCall(flyAwayDelay, () => {
      // Vérifier que les objets existent encore
      if (!visionImage || !visionImage.scene) return;
      
      // Direction aléatoire pour l'envol
      const flyDirection = Math.random() * Math.PI * 2; // Angle aléatoire
      const flyDistance = 300 + Math.random() * 200; // Distance 300-500px
      const flyX = Math.cos(flyDirection) * flyDistance;
      const flyY = Math.sin(flyDirection) * flyDistance;
      
      // Envol de l'image principale
      this.scene.tweens.add({
        targets: visionImage,
        x: flyX,
        y: flyY,
        alpha: 0,
        scaleX: scale * 0.3, // Rétrécit en s'envolant
        scaleY: scale * 0.3,
        rotation: visionImage.rotation + (Math.random() - 0.5) * 2, // Rotation finale
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
          if (visionImage && visionImage.destroy) {
            visionImage.destroy();
          }
        }
      });
      
      // Envol des couches de flou (directions légèrement différentes)
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
    });
  }

  fadeDreamBox() {
    if (this.dreamBox) {
      this.scene.tweens.add({
        targets: this.dreamBox,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
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
      this.activeTimers.push(timer); // Tracker le timer
    });
  }

  // Fonction utilitaire pour formater le texte avec passage à la ligne intelligent
  formatTextWithLineBreaks(text, maxCharsPerLine = 15) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      // Si ajouter ce mot dépasse la limite ET qu'on a déjà du contenu
      if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    
    // Ajouter la dernière ligne
    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }
    
    return lines.join('\n');
  }

  showText(text, duration, isLast = false) {
    console.log(`[Prologue] 📄 showText appelé: "${text.substring(0, 40)}..." isLast:`, isLast, 'container exists:', !!this.container);
    
    // Vérifier que le container existe encore
    if (!this.container || !this.scene) {
      console.warn('[Prologue] ❌ Container déjà détruit, skip texte:', text.substring(0, 30));
      return;
    }
    
    const camera = this.scene.cameras.main;
    
    // Formater le texte avec passage à la ligne intelligent
    const formattedText = this.formatTextWithLineBreaks(text, 15);
    
    console.log(`[Prologue] ✅ Création texte: "${formattedText}"`);
    
    // Texte principal - POSITION ORIGINALE
    const textObject = this.scene.add.text(
      camera.width / 2,
      camera.height / 2 + 100, // Position originale : milieu + 100px
      formattedText,
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8, // Espacement entre les lignes
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }
    ).setOrigin(0.5).setAlpha(0); // Origin 0.5 comme avant

    this.container.add(textObject);
    this.texts.push(textObject);

    console.log(`[Prologue] ✅ Texte ajouté au container, total textes:`, this.texts.length);

    // Animation d'apparition
    this.scene.tweens.add({
      targets: textObject,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });

    // Animation de disparition (sauf pour le dernier texte)
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
      // Pour le dernier texte, on lance la completion après un délai
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
    
    // Fade out final de tout le container
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        console.log('[Prologue] 🎭 Fade out terminé, début cleanup');
        this.cleanup();
        
        // Callback de completion
        if (this.onCompleteCallback) {
          console.log('[Prologue] 📞 Appel du callback');
          this.onCompleteCallback();
        }
      }
    });
  }

  // === NETTOYAGE ===
  cleanup() {
    try {
      console.log('[Prologue] 🧹 Cleaning up prologue... isPlaying:', this.isPlaying, 'activeTimers:', this.activeTimers.length);
      
      // ✅ NOUVEAU: Annuler tous les timers actifs
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
      }

      // Détruire le container et tout son contenu
      if (this.container && this.container.destroy) {
        console.log('[Prologue] 💥 Destruction du container');
        this.container.destroy(true); // true = détruit les enfants aussi
      }

      // Reset des variables
      this.container = null;
      this.effects = [];
      this.texts = [];
      this.dreamBox = null;
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

  // === CONFIGURATION ===
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Méthode pour personnaliser les textes
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

// === EXEMPLE D'UTILISATION ===
/*
// Dans ton PsyduckIntroManager, tu peux l'utiliser comme ça :

import { PrologueManager } from './PrologueManager.js';

// Avant de lancer ton intro Psyduck :
async startFullIntro() {
  // 1. Lancer le prologue
  const { prologue, success } = await PrologueManager.createAndRun(this.scene, () => {
    // 2. Quand le prologue est fini, lancer l'intro Psyduck
    this.startIntro(() => {
              console.log("Full intro completed!");
    });
  });
  
  if (!success) {
    console.warn("Prologue failed, launching Psyduck intro directly");
    this.startIntro();
  }
}
*/
