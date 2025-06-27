// client/src/transitions/EncounterTransition.js
// Séquence de transition d'encounter style Pokémon moderne

export class EncounterTransition {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.isActive = false;
    this.currentStep = 0;
    this.pokemonData = null;
    this.playerSprite = null;
    this.exclamationSprite = null;
    this.timeline = null;
  }

  /**
   * Démarrer la séquence de transition d'encounter
   * @param {Object} encounterData - Données de l'encounter du serveur
   */
  start(encounterData) {
    if (this.isActive) {
      console.warn("⚠️ Transition encounter déjà active");
      return;
    }

    console.log("🎬 === DÉBUT TRANSITION ENCOUNTER ===");
    console.log("📊 Données:", encounterData);

    this.isActive = true;
    this.pokemonData = encounterData.pokemon;
    this.currentStep = 0;

    // Créer le conteneur principal
    this.createTransitionContainer();
    
    // Démarrer la séquence
    this.startSequence();
  }

  createTransitionContainer() {
    // Conteneur principal pour toute la transition
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(9999);
    this.container.setScrollFactor(0);
    
    // Fond transparent initial
    const bg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width * 2,
      this.scene.cameras.main.height * 2,
      0x000000,
      0
    );
    bg.setScrollFactor(0);
    this.container.add(bg);
    this.backgroundRect = bg;

    console.log("📦 Conteneur de transition créé");
  }

  startSequence() {
    console.log("🎬 Démarrage séquence...");
    
    // Étape 1: Point d'exclamation
    this.showExclamation();
  }

  showExclamation() {
    console.log("❗ Étape 1: Point d'exclamation");
    
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.error("❌ Pas de joueur trouvé pour l'exclamation");
      this.skipToTransition();
      return;
    }

    // Créer le point d'exclamation stylisé
    const exclamationContainer = this.scene.add.container(
      myPlayer.x,
      myPlayer.y - 40
    );
    exclamationContainer.setDepth(10000);

    // Fond du point d'exclamation
    const exclamationBg = this.scene.add.circle(0, 0, 20, 0xffffff);
    exclamationBg.setStrokeStyle(3, 0x4a90e2);

    // Texte du point d'exclamation
    const exclamationText = this.scene.add.text(0, 0, '!', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ff4444',
      stroke: '#ffffff',
      strokeThickness: 3
    }).setOrigin(0.5);

    exclamationContainer.add([exclamationBg, exclamationText]);
    this.container.add(exclamationContainer);
    this.exclamationSprite = exclamationContainer;

    // Animation du point d'exclamation
    exclamationContainer.setScale(0);
    exclamationContainer.setAlpha(0);

    // Tween d'apparition dramatique
    this.scene.tweens.add({
      targets: exclamationContainer,
      scale: 1.5,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: false,
      onComplete: () => {
        // Maintenir pendant 800ms
        this.scene.time.delayedCall(800, () => {
          // Disparition
          this.scene.tweens.add({
            targets: exclamationContainer,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => {
              this.showTransitionScreen();
            }
          });
        });
      }
    });

    // Effet de pulsation
    this.scene.tweens.add({
      targets: exclamationText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });
  }

  showTransitionScreen() {
    console.log("🌟 Étape 2: Écran de transition");

    // Animation du fond vers noir
    this.scene.tweens.add({
      targets: this.backgroundRect,
      alpha: 0.95,
      duration: 500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.createTransitionElements();
      }
    });
  }

  createTransitionElements() {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Container pour les éléments de transition
    const transitionContainer = this.scene.add.container(centerX, centerY);
    transitionContainer.setDepth(10001);
    transitionContainer.setScrollFactor(0);

    // Fond dégradé moderne
    const gradientBg = this.scene.add.rectangle(0, 0, 
      this.scene.cameras.main.width * 2, 
      this.scene.cameras.main.height * 2, 
      0x1a1a2e
    );
    transitionContainer.add(gradientBg);

    // Effets de particules (cercles animés)
    this.createParticleEffects(transitionContainer);

    // Texte principal
    const pokemonName = this.pokemonData?.name || 'POKÉMON';
    const mainText = this.scene.add.text(0, -50, `Un ${pokemonName.toUpperCase()} sauvage\napparaît !`, {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#4a90e2',
      strokeThickness: 4,
      align: 'center',
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 5,
        fill: true
      }
    }).setOrigin(0.5);

    // Sous-texte avec niveau
    const levelText = this.scene.add.text(0, 50, `Niveau ${this.pokemonData?.level || '??'}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#87ceeb',
      stroke: '#1a1a2e',
      strokeThickness: 2
    }).setOrigin(0.5);

    transitionContainer.add([mainText, levelText]);
    this.container.add(transitionContainer);

    // Animations d'entrée
    this.animateTransitionElements(transitionContainer, mainText, levelText);
  }

  createParticleEffects(container) {
    // Créer des cercles animés pour l'effet visuel
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const particle = this.scene.add.circle(x, y, 3 + Math.random() * 4, 0x4a90e2);
      particle.setAlpha(0.6 + Math.random() * 0.4);
      container.add(particle);

      // Animation de rotation
      this.scene.tweens.add({
        targets: particle,
        angle: 360,
        duration: 3000 + Math.random() * 2000,
        repeat: -1,
        ease: 'Linear'
      });

      // Animation de pulsation
      this.scene.tweens.add({
        targets: particle,
        scale: 1.5,
        duration: 1000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  animateTransitionElements(container, mainText, levelText) {
    // Container part de l'extérieur
    container.setScale(0.5);
    container.setAlpha(0);

    // Animation d'entrée du container
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 800,
      ease: 'Back.easeOut'
    });

    // Texte principal avec effet de frappe
    mainText.setAlpha(0);
    this.scene.tweens.add({
      targets: mainText,
      alpha: 1,
      duration: 600,
      delay: 200,
      ease: 'Power2.easeOut'
    });

    // Effet de glow sur le texte principal
    this.scene.tweens.add({
      targets: mainText.style,
      strokeThickness: 8,
      duration: 1000,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });

    // Texte de niveau arrive après
    levelText.setAlpha(0);
    levelText.setY(80);
    this.scene.tweens.add({
      targets: levelText,
      alpha: 1,
      y: 50,
      duration: 500,
      delay: 800,
      ease: 'Back.easeOut'
    });

    // Maintenir l'écran pendant 2.5 secondes puis commencer la sortie
    this.scene.time.delayedCall(2500, () => {
      this.exitTransition(container);
    });
  }

  exitTransition(container) {
    console.log("🚪 Étape 3: Sortie de transition");

    // Animation de sortie du container
    this.scene.tweens.add({
      targets: container,
      scale: 1.2,
      alpha: 0,
      duration: 600,
      ease: 'Power2.easeIn'
    });

    // Fond revient à transparent
    this.scene.tweens.add({
      targets: this.backgroundRect,
      alpha: 0,
      duration: 800,
      delay: 200,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        this.complete();
      }
    });
  }

  complete() {
    console.log("✅ Transition encounter terminée");

    // Nettoyer
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.isActive = false;
    this.currentStep = 0;
    this.pokemonData = null;

    // Notification que le joueur peut à nouveau bouger
    if (this.scene.showNotification) {
      this.scene.showNotification("Le Pokémon s'enfuit dans les hautes herbes...", 'info');
    }

    console.log("🎮 Joueur peut à nouveau bouger");
  }

  skipToTransition() {
    console.warn("⚠️ Skip vers transition directe");
    this.showTransitionScreen();
  }

  // Méthode pour interrompre la transition (si nécessaire)
  interrupt() {
    if (!this.isActive) return;

    console.log("⛔ Interruption transition encounter");

    // Arrêter tous les tweens
    this.scene.tweens.killTweensOf([this.container, this.backgroundRect]);

    // Nettoyer immédiatement
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.isActive = false;
    this.currentStep = 0;
  }

  // Getters pour l'état
  getIsActive() {
    return this.isActive;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  // Méthode pour customiser la transition (optionnel)
  setCustomStyle(options = {}) {
    this.customStyle = {
      textColor: options.textColor || '#ffffff',
      strokeColor: options.strokeColor || '#4a90e2',
      particleColor: options.particleColor || 0x4a90e2,
      backgroundColor: options.backgroundColor || 0x1a1a2e,
      ...options
    };
  }

  // Méthode de debug
  debug() {
    console.log("🔍 DEBUG EncounterTransition:", {
      isActive: this.isActive,
      currentStep: this.currentStep,
      pokemonData: this.pokemonData,
      hasContainer: !!this.container,
      sceneExists: !!this.scene
    });
  }
}
