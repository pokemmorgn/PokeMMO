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
    this.onCompleteCallback = null;
    
    // Configuration du prologue
    this.config = {
      duration: 15000, // Durée totale augmentée pour les nouveaux textes
      textSequence: [
        { text: "A blinding flash of light...", delay: 1000, duration: 2500 },
        { text: "And then... silence.", delay: 3800, duration: 2200 },
        { text: "You open your eyes to an unknown world.", delay: 6300, duration: 2800 },
        { text: "Something feels... wrong here. Even the air whispers of ancient conflicts.", delay: 9400, duration: 3500 },
        { text: "Time itself seems uncertain in this place.", delay: 13200, duration: 2800 },
        { text: "But in this troubled world, you are not alone...", delay: 16300, duration: 2500 }
      ],
      visions: [
        { image: 'vision1', delay: 1500, duration: 3000, alpha: 0.3 }, // L'Harmonie (début)
        { image: 'vision2', delay: 3000, duration: 2500, alpha: 0.4 }, // Le Pacte (se superpose à vision1)
        { image: 'vision3', delay: 5500, duration: 2000, alpha: 0.5 }, // La Trahison (plus intense)
        { image: 'vision4', delay: 7000, duration: 3000, alpha: 0.6 }, // La Corruption (climax)
        { image: 'vision5', delay: 11000, duration: 4000, alpha: 0.3 }  // L'Observateur (fin, plus long)
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
      this.scene.time.delayedCall(this.config.duration + 4000, () => {
        if (this.isPlaying) {
          this.complete();
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
    
    this.config.visions.forEach((vision, index) => {
      this.scene.time.delayedCall(vision.delay, () => {
        this.showVision(vision.image, vision.duration, vision.alpha, camera);
      });
    });
  }

  showVision(imageKey, duration, alpha, camera) {
    // Créer l'image de vision
    const visionImage = this.scene.add.image(
      camera.width / 2,
      camera.height / 2,
      imageKey
    ).setOrigin(0.5).setAlpha(0).setDepth(9500);

    // Ajuster la taille pour qu'elle s'adapte à l'écran (réduit de 20%)
    const scaleX = camera.width / visionImage.width;
    const scaleY = camera.height / visionImage.height;
    const scale = Math.min(scaleX, scaleY) * 0.64; // 64% de l'écran max (80% - 20%)
    visionImage.setScale(scale);

    this.container.add(visionImage);
    this.effects.push(visionImage);

    // Animation fade in
    this.scene.tweens.add({
      targets: visionImage,
      alpha: alpha,
      duration: 800,
      ease: 'Power2'
    });

    // Animation fade out
    this.scene.tweens.add({
      targets: visionImage,
      alpha: 0,
      duration: 1000,
      delay: duration - 1000,
      ease: 'Power2'
    });
  }

  // === SÉQUENCE DE TEXTE ===
  startTextSequence() {
    this.config.textSequence.forEach((textData, index) => {
      this.scene.time.delayedCall(textData.delay, () => {
        this.showText(textData.text, textData.duration, index === this.config.textSequence.length - 1);
      });
    });
  }

  showText(text, duration, isLast = false) {
    const camera = this.scene.cameras.main;
    
    // Texte principal
    const textObject = this.scene.add.text(
      camera.width / 2,
      camera.height / 2 + 100, // Légèrement en bas pour laisser place aux effets
      text,
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { 
          width: Math.min(camera.width - 80, 600) // Maximum 600px ou largeur écran -80px
        },
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

    // Animation d'apparition
    this.scene.tweens.add({
      targets: textObject,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });

    // Animation de disparition (sauf pour le dernier texte)
    if (!isLast) {
      this.scene.tweens.add({
        targets: textObject,
        alpha: 0,
        duration: 800,
        delay: duration - 800,
        ease: 'Power2'
      });
    } else {
      // Pour le dernier texte, on lance la completion après un délai
      this.scene.time.delayedCall(duration, () => {
        this.complete();
      });
    }
  }

  // === FINALISATION ===
  complete() {
    if (!this.isPlaying) return;

    console.log('[Prologue] ✅ Prologue completed, transitioning to intro');
    
    // Fade out final de tout le container
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.cleanup();
        
        // Callback de completion
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }
    });
  }

  // === NETTOYAGE ===
  cleanup() {
    try {
      console.log('[Prologue] 🧹 Cleaning up prologue...');
      
      // Arrêter tous les tweens
      if (this.scene && this.scene.tweens) {
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
        this.container.destroy(true); // true = détruit les enfants aussi
      }

      // Reset des variables
      this.container = null;
      this.effects = [];
      this.texts = [];
      this.isPlaying = false;
      this.onCompleteCallback = null;
      
    } catch (error) {
      console.error('[Prologue] Erreur lors du nettoyage:', error);
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
