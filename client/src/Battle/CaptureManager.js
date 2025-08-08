// client/src/managers/Battle/CaptureManager.js
// 🎯 GESTIONNAIRE COMPLET DE CAPTURE POKÉMON - Authentique Gen 5

export class CaptureManager {
  constructor(battleScene, networkHandler, playerRole = 'player1') {
    this.scene = battleScene;
    this.networkHandler = networkHandler;
    this.playerRole = playerRole;
    
    // État de capture
    this.isCapturing = false;
    this.currentCaptureData = null;
    this.captureSequenceActive = false;
    
    // Éléments visuels
    this.ballSprite = null;
    this.captureEffects = [];
    this.captureParticles = [];
    
    // Configuration authentique
    this.timings = {
      ballThrow: 800,           // Lancer vers Pokémon
      ballHit: 300,             // Contact avec Pokémon  
      pokemonDisappear: 400,    // Pokémon disparaît dans Ball
      ballFall: 600,            // Ball tombe au sol
      shakeDelay: 200,          // Délai avant première secousse
      shakeDuration: 600,       // Durée d'une secousse
      shakeInterval: 400,       // Intervalle entre secousses
      resultDelay: 800,         // Délai avant résultat final
      successCelebration: 2000, // Célébration de capture
      failureEscape: 1000       // Animation d'échappement
    };
    
    // Configuration visuelle
    this.ballColors = {
      'poke_ball': { primary: 0xFF0000, secondary: 0xFFFFFF },
      'great_ball': { primary: 0x0066CC, secondary: 0xFF0000 },
      'ultra_ball': { primary: 0x000000, secondary: 0xFFD700 },
      'master_ball': { primary: 0x6600CC, secondary: 0xFF66FF },
      'safari_ball': { primary: 0x8B4513, secondary: 0x90EE90 },
      'net_ball': { primary: 0x008080, secondary: 0x000000 },
      'dive_ball': { primary: 0x0066FF, secondary: 0x87CEEB },
      'nest_ball': { primary: 0x90EE90, secondary: 0x32CD32 },
      'repeat_ball': { primary: 0x8B0000, secondary: 0xFF6347 },
      'timer_ball': { primary: 0x555555, secondary: 0xFFFFFF },
      'luxury_ball': { primary: 0x000000, secondary: 0xFFD700 },
      'premier_ball': { primary: 0xFFFFFF, secondary: 0xFF0000 }
    };
    
    // Callbacks
    this.onCaptureComplete = null;
    this.onCaptureStart = null;
    
    console.log('🎯 [CaptureManager] Initialisé pour', playerRole);
    
    // Setup événements réseau
    this.setupNetworkEvents();
  }

  // === POINT D'ENTRÉE PRINCIPAL ===

  /**
   * 🎯 MÉTHODE PRINCIPALE - Démarrer une tentative de capture
   * @param {string} ballType - Type de Ball utilisée
   * @param {Phaser.GameObjects.Sprite} targetSprite - Sprite du Pokémon cible
   */
  attemptCapture(ballType, targetSprite) {
    if (this.isCapturing) {
      console.warn('⚠️ [CaptureManager] Capture déjà en cours');
      return false;
    }

    if (!this.networkHandler) {
      console.error('❌ [CaptureManager] NetworkHandler manquant');
      return false;
    }

    if (!targetSprite) {
      console.error('❌ [CaptureManager] Sprite cible manquant');
      return false;
    }

    console.log(`🎯 [CaptureManager] === DÉBUT CAPTURE: ${ballType} ===`);

    this.isCapturing = true;
    this.currentCaptureData = {
      ballType,
      targetSprite,
      startTime: Date.now()
    };

    // Callback début de capture
    if (this.onCaptureStart) {
      this.onCaptureStart(ballType, targetSprite);
    }

    // 1. Message immédiat
    this.showCaptureMessage(`Lancement d'une ${this.getBallDisplayName(ballType)}...`);

    // 2. Démarrer l'animation de lancer
    this.startThrowAnimation(ballType, targetSprite);

    // 3. Envoyer la requête au serveur (après un court délai pour l'animation)
    setTimeout(() => {
      this.sendCaptureRequest(ballType);
    }, 200);

    return true;
  }

  // === ANIMATIONS DE CAPTURE ===

  /**
   * 🎬 Animation complète de lancer de Ball
   */
  async startThrowAnimation(ballType, targetSprite) {
    console.log(`🎬 [CaptureManager] Animation lancer: ${ballType}`);

    // Créer la Ball
    this.ballSprite = this.createBallSprite(ballType);

    try {
      // Phase 1: Lancer vers le Pokémon
      await this.animateThrow(targetSprite);
      
      // Phase 2: Contact et absorption
      await this.animateContact(targetSprite);
      
      // Phase 3: Chute au sol
      await this.animateFall();
      
      // Phase 4: Attendre les données serveur pour les secousses
      this.captureSequenceActive = true;
      console.log('✅ [CaptureManager] Animation lancer terminée, en attente serveur...');
      
    } catch (error) {
      console.error('❌ [CaptureManager] Erreur animation:', error);
      this.handleCaptureError('Erreur animation');
    }
  }

  /**
   * 🏀 Créer le sprite de Ball
   */
  createBallSprite(ballType) {
    const { width, height } = this.scene.cameras.main;
    
    // Position de départ (côté joueur)
    const startX = width * 0.15 - 50;
    const startY = height * 0.78 - 30;

    // Utiliser sprite si disponible, sinon créer graphiquement
    let ballSprite;
    
    if (this.scene.textures.exists(`ball_${ballType}`)) {
      ballSprite = this.scene.add.sprite(startX, startY, `ball_${ballType}`);
      ballSprite.setScale(2.0);
    } else {
      // Créer Ball graphiquement
      ballSprite = this.scene.add.graphics();
      ballSprite.setPosition(startX, startY);
      this.drawBallGraphics(ballSprite, ballType);
    }

    ballSprite.setDepth(100);
    ballSprite.ballType = ballType;

    return ballSprite;
  }

  /**
   * 🎨 Dessiner la Ball graphiquement
   */
  drawBallGraphics(graphics, ballType) {
    graphics.clear();
    
    const colors = this.ballColors[ballType] || this.ballColors['poke_ball'];
    const radius = 15;

    // Partie supérieure
    graphics.fillStyle(colors.primary, 1);
    graphics.beginPath();
    graphics.arc(0, 0, radius, Math.PI, 0, false);
    graphics.fillPath();

    // Partie inférieure
    graphics.fillStyle(colors.secondary, 1);
    graphics.beginPath();
    graphics.arc(0, 0, radius, 0, Math.PI, false);
    graphics.fillPath();

    // Ligne centrale
    graphics.lineStyle(2, 0x000000, 1);
    graphics.lineBetween(-radius, 0, radius, 0);

    // Centre (bouton)
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillCircle(0, 0, 5);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeCircle(0, 0, 5);
  }

  /**
   * 🚀 Animation lancer vers le Pokémon
   */
  animateThrow(targetSprite) {
    return new Promise((resolve) => {
      const targetX = targetSprite.x;
      const targetY = targetSprite.y - 20;

      this.scene.tweens.add({
        targets: this.ballSprite,
        x: targetX,
        y: targetY,
        rotation: Math.PI * 4, // Rotation pendant le vol
        duration: this.timings.ballThrow,
        ease: 'Power2.easeOut',
        onComplete: resolve
      });

      // Son de lancer si disponible
      this.playSound('ball_throw');
    });
  }

  /**
   * 💥 Animation contact et absorption
   */
  animateContact(targetSprite) {
    return new Promise((resolve) => {
      // Flash blanc de capture
      const flash = this.scene.add.rectangle(
        targetSprite.x, targetSprite.y,
        120, 120, 0xFFFFFF
      );
      flash.setDepth(150);
      flash.setAlpha(0);

      this.scene.tweens.add({
        targets: flash,
        alpha: 1,
        duration: this.timings.ballHit / 2,
        yoyo: true,
        onComplete: () => {
          flash.destroy();
        }
      });

      // Son de contact
      this.playSound('ball_hit');

      // Faire disparaître le Pokémon progressivement
      setTimeout(() => {
        this.scene.tweens.add({
          targets: targetSprite,
          alpha: 0,
          scaleX: targetSprite.scaleX * 0.1,
          scaleY: targetSprite.scaleY * 0.1,
          duration: this.timings.pokemonDisappear,
          ease: 'Power2.easeIn',
          onComplete: () => {
            // Masquer complètement
            targetSprite.setVisible(false);
            resolve();
          }
        });
      }, this.timings.ballHit);

      // Particules d'absorption
      this.createAbsorptionParticles(targetSprite.x, targetSprite.y);
    });
  }

  /**
   * 📉 Animation chute au sol
   */
  animateFall() {
    return new Promise((resolve) => {
      const groundY = this.ballSprite.y + 60;

      this.scene.tweens.add({
        targets: this.ballSprite,
        y: groundY,
        rotation: this.ballSprite.rotation + Math.PI,
        duration: this.timings.ballFall,
        ease: 'Bounce.easeOut',
        onComplete: resolve
      });
    });
  }

  /**
   * 🌟 Particules d'absorption
   */
  createAbsorptionParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 40;
      
      const particle = this.scene.add.text(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        '✦',
        {
          fontSize: '16px',
          color: '#00FFFF'
        }
      );
      
      particle.setDepth(120);
      
      this.scene.tweens.add({
        targets: particle,
        x: x,
        y: y,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: this.timings.pokemonDisappear,
        ease: 'Power2.easeIn',
        onComplete: () => particle.destroy()
      });
    }
  }

  // === GESTION ÉVÉNEMENTS SERVEUR ===

  /**
   * 📡 Configuration des événements réseau
   */
  setupNetworkEvents() {
    if (!this.networkHandler) return;

    // Réponse de capture du serveur
    this.networkHandler.on('captureResult', (data) => {
      console.log('📥 [CaptureManager] Réponse serveur:', data);
      this.handleServerCaptureResponse(data);
    });

    // Événements de secousses en temps réel
    this.networkHandler.on('captureShake', (data) => {
      console.log('📳 [CaptureManager] Secousse:', data.shakeNumber);
      this.animateShake(data.shakeNumber, data.totalShakes);
    });

    // Résultat final de capture
    this.networkHandler.on('captureFinal', (data) => {
      console.log('🏁 [CaptureManager] Résultat final:', data.captured);
      this.handleFinalResult(data);
    });

    console.log('📡 [CaptureManager] Événements réseau configurés');
  }

  /**
   * 📤 Envoyer requête de capture au serveur
   */
  sendCaptureRequest(ballType) {
    if (!this.networkHandler) {
      console.error('❌ [CaptureManager] Impossible d\'envoyer requête');
      this.handleCaptureError('NetworkHandler manquant');
      return;
    }

    try {
      const success = this.networkHandler.attemptCapture(ballType);
      
      if (!success) {
        throw new Error('Échec envoi requête');
      }

      console.log(`📤 [CaptureManager] Requête envoyée: ${ballType}`);
      
    } catch (error) {
      console.error('❌ [CaptureManager] Erreur envoi:', error);
      this.handleCaptureError('Erreur réseau');
    }
  }

  /**
   * 📨 Traitement réponse serveur
   */
  handleServerCaptureResponse(data) {
    if (!this.captureSequenceActive) {
      console.warn('⚠️ [CaptureManager] Réponse serveur hors séquence');
      return;
    }

    if (data.success) {
      this.processCaptureData(data.captureData);
    } else {
      this.handleCaptureError(data.error || 'Erreur serveur');
    }
  }

  /**
   * 🔄 Traitement des données de capture
   */
  async processCaptureData(captureData) {
    console.log('🔄 [CaptureManager] Traitement données:', captureData);

    const { 
      captured, 
      shakeCount, 
      critical = false, 
      pokemonName,
      gen5Details 
    } = captureData;

    // Attendre délai avant secousses
    await this.wait(this.timings.shakeDelay);

    if (critical) {
      // Capture critique: 1 secousse + succès immédiat
      this.showCaptureMessage('⭐ CAPTURE CRITIQUE !');
      await this.animateShake(1, 1);
      await this.wait(this.timings.resultDelay);
      await this.animateSuccess(pokemonName);
    } else {
      // Capture normale: jusqu'à 3 secousses
      await this.animateShakeSequence(shakeCount, captured);
      
      if (captured) {
        await this.animateSuccess(pokemonName);
      } else {
        await this.animateFailure();
      }
    }

    // Finaliser
    this.finalizeCaptureSequence(captured, captureData);
  }

  /**
   * 📳 Animation d'une secousse
   */
  animateShake(shakeNumber, totalShakes) {
    return new Promise((resolve) => {
      if (!this.ballSprite) {
        resolve();
        return;
      }

      const originalX = this.ballSprite.x;
      const shakeIntensity = 10;

      this.scene.tweens.add({
        targets: this.ballSprite,
        x: originalX + shakeIntensity,
        duration: this.timings.shakeDuration / 4,
        yoyo: true,
        repeat: 3,
        ease: 'Power2.easeInOut',
        onComplete: () => {
          this.ballSprite.setX(originalX);
          resolve();
        }
      });

      // Son de secousse
      this.playSound('ball_shake');
      
      console.log(`📳 [CaptureManager] Secousse ${shakeNumber}/${totalShakes}`);
    });
  }

  /**
   * 📳📳📳 Séquence complète de secousses
   */
  async animateShakeSequence(maxShakes, willSucceed) {
    const actualShakes = willSucceed ? maxShakes : Math.min(maxShakes, 3);
    
    for (let i = 1; i <= actualShakes; i++) {
      await this.animateShake(i, actualShakes);
      
      // Intervalle entre secousses (sauf dernière)
      if (i < actualShakes) {
        await this.wait(this.timings.shakeInterval);
      }
    }

    // Délai final avant résultat
    await this.wait(this.timings.resultDelay);
  }

  /**
   * ✅ Animation de succès
   */
  animateSuccess(pokemonName) {
    return new Promise((resolve) => {
      console.log('🎉 [CaptureManager] CAPTURE RÉUSSIE !');

      // Message de succès
      this.showCaptureMessage(`${pokemonName} a été capturé !`);

      // Étoiles de succès
      this.createSuccessParticles();

      // Son de succès
      this.playSound('capture_success');

      // Faire disparaître la Ball après célébration
      setTimeout(() => {
        if (this.ballSprite) {
          this.scene.tweens.add({
            targets: this.ballSprite,
            alpha: 0,
            scaleX: this.ballSprite.scaleX * 0.1,
            scaleY: this.ballSprite.scaleY * 0.1,
            duration: 500,
            ease: 'Power2.easeIn',
            onComplete: () => {
              this.ballSprite?.destroy();
              this.ballSprite = null;
              resolve();
            }
          });
        } else {
          resolve();
        }
      }, this.timings.successCelebration);
    });
  }

  /**
   * ❌ Animation d'échec
   */
  animateFailure() {
    return new Promise((resolve) => {
      console.log('💥 [CaptureManager] CAPTURE ÉCHOUÉE !');

      // Message d'échec
      this.showCaptureMessage('Le Pokémon s\'est échappé !');

      // Ball s'ouvre et Pokémon réapparaît
      if (this.ballSprite && this.currentCaptureData?.targetSprite) {
        // Flash rouge d'échec
        const flash = this.scene.add.rectangle(
          this.ballSprite.x, this.ballSprite.y,
          60, 60, 0xFF0000
        );
        flash.setDepth(140);
        
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 3,
          scaleY: 3,
          duration: 400,
          onComplete: () => flash.destroy()
        });

        // Pokémon réapparaît
        const targetSprite = this.currentCaptureData.targetSprite;
        targetSprite.setVisible(true);
        targetSprite.setAlpha(0);
        targetSprite.setScale(targetSprite.scaleX * 0.1, targetSprite.scaleY * 0.1);

        this.scene.tweens.add({
          targets: targetSprite,
          alpha: 1,
          scaleX: targetSprite.scaleX * 10,
          scaleY: targetSprite.scaleY * 10,
          duration: this.timings.failureEscape,
          ease: 'Back.easeOut'
        });
      }

      // Son d'échappement
      this.playSound('pokemon_escape');

      // Ball disparaît
      setTimeout(() => {
        if (this.ballSprite) {
          this.ballSprite.destroy();
          this.ballSprite = null;
        }
        resolve();
      }, this.timings.failureEscape);
    });
  }

  /**
   * 🌟 Particules de succès
   */
  createSuccessParticles() {
    if (!this.ballSprite) return;

    const x = this.ballSprite.x;
    const y = this.ballSprite.y;

    // Confettis autour de la Ball
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30;
      
      const particle = this.scene.add.text(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        ['✦', '★', '◆', '▲', '●'][i % 5],
        {
          fontSize: '20px',
          color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5]
        }
      );
      
      particle.setDepth(160);
      
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 60,
        x: particle.x + (Math.random() - 0.5) * 40,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        rotation: Math.PI * 4,
        duration: 2000,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  // === FINALISATION ===

  /**
   * 🏁 Finaliser la séquence de capture
   */
  finalizeCaptureSequence(captured, captureData) {
    console.log(`🏁 [CaptureManager] Finalisation: ${captured ? 'SUCCÈS' : 'ÉCHEC'}`);

    // Nettoyer l'état
    this.isCapturing = false;
    this.captureSequenceActive = false;
    this.currentCaptureData = null;

    // Callback de fin
    if (this.onCaptureComplete) {
      this.onCaptureComplete(captured, captureData);
    }

    // Retourner aux boutons d'action après délai
    setTimeout(() => {
      if (this.scene.showActionButtons) {
        this.scene.showActionButtons();
      }
    }, 1500);

    console.log('✅ [CaptureManager] Séquence terminée');
  }

  /**
   * ⚠️ Gestion des erreurs de capture
   */
  handleCaptureError(errorMessage) {
    console.error('❌ [CaptureManager] Erreur:', errorMessage);

    this.showCaptureMessage(`Erreur de capture: ${errorMessage}`);

    // Nettoyer
    this.cleanup();

    // Retourner aux boutons après délai
    setTimeout(() => {
      if (this.scene.showActionButtons) {
        this.scene.showActionButtons();
      }
    }, 2000);
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * 💬 Afficher message de capture
   */
  showCaptureMessage(message) {
    if (this.scene.showActionMessage) {
      this.scene.showActionMessage(message);
    } else if (this.scene.showNarrativeMessage) {
      this.scene.showNarrativeMessage(message, false);
    }
  }

  /**
   * 🔊 Jouer son
   */
  playSound(soundKey) {
    try {
      if (this.scene.sound && this.scene.cache?.audio?.exists(soundKey)) {
        this.scene.sound.play(soundKey, { volume: 0.7 });
      }
    } catch (error) {
      // Sons optionnels
    }
  }

  /**
   * ⏳ Attendre
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🏷️ Nom d'affichage de Ball
   */
  getBallDisplayName(ballType) {
    const names = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'safari_ball': 'Safari Ball',
      'net_ball': 'Filet Ball',
      'dive_ball': 'Scuba Ball',
      'nest_ball': 'Nid Ball',
      'repeat_ball': 'Bis Ball',
      'timer_ball': 'Chrono Ball',
      'luxury_ball': 'Luxe Ball',
      'premier_ball': 'Honor Ball'
    };
    return names[ballType] || ballType.replace(/_/g, ' ');
  }

  /**
   * 🧹 Nettoyage
   */
  cleanup() {
    this.isCapturing = false;
    this.captureSequenceActive = false;
    this.currentCaptureData = null;

    if (this.ballSprite) {
      this.ballSprite.destroy();
      this.ballSprite = null;
    }

    // Nettoyer effets
    this.captureEffects.forEach(effect => {
      if (effect && effect.destroy) effect.destroy();
    });
    this.captureEffects = [];

    this.captureParticles.forEach(particle => {
      if (particle && particle.destroy) particle.destroy();
    });
    this.captureParticles = [];
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * 🎯 Définir callback de début de capture
   */
  setOnCaptureStart(callback) {
    this.onCaptureStart = callback;
  }

  /**
   * 🏁 Définir callback de fin de capture
   */
  setOnCaptureComplete(callback) {
    this.onCaptureComplete = callback;
  }

  /**
   * ❓ Vérifier si capture en cours
   */
  isCaptureInProgress() {
    return this.isCapturing || this.captureSequenceActive;
  }

  /**
   * 🛑 Forcer arrêt de capture
   */
  forceStopCapture() {
    console.log('🛑 [CaptureManager] Arrêt forcé');
    this.cleanup();
  }

  // === DESTRUCTION ===

  /**
   * 💀 Détruire le manager
   */
  destroy() {
    console.log('💀 [CaptureManager] Destruction...');
    
    this.cleanup();
    
    // Nettoyer références
    this.scene = null;
    this.networkHandler = null;
    this.onCaptureComplete = null;
    this.onCaptureStart = null;
    
    console.log('✅ [CaptureManager] Détruit');
  }
}

// === FONCTION D'ASSISTANCE POUR BATTLESCENE ===

/**
 * 🎯 Créer et configurer un CaptureManager pour BattleScene
 * Usage: this.captureManager = createCaptureManager(this, this.battleNetworkHandler);
 */
export function createCaptureManager(battleScene, networkHandler, playerRole = 'player1') {
  const captureManager = new CaptureManager(battleScene, networkHandler, playerRole);
  
  // Configuration automatique des callbacks
  captureManager.setOnCaptureStart((ballType, targetSprite) => {
    console.log(`🎬 [CaptureManager] Début capture: ${ballType}`);
    
    // Masquer boutons d'action pendant capture
    if (battleScene.hideActionButtons) {
      battleScene.hideActionButtons();
    }
  });
  
  captureManager.setOnCaptureComplete((captured, captureData) => {
    console.log(`🏁 [CaptureManager] Fin capture: ${captured ? 'Succès' : 'Échec'}`);
    
    // Le manager gère déjà le retour aux boutons d'action
    // BattleScene peut ajouter sa propre logique ici si nécessaire
  });
  
  return captureManager;
}

console.log('🎯 [CaptureManager] Gestionnaire de capture Pokémon authentique chargé !');
console.log('📋 Fonctionnalités:');
console.log('   ✅ Animations authentiques Gen 5');
console.log('   ✅ Séquence de secousses synchronisée serveur');
console.log('   ✅ Support captures critiques (1 secousse)');
console.log('   ✅ Effets visuels et particules');
console.log('   ✅ Gestion complète des erreurs');
console.log('   ✅ Intégration minimale BattleScene');
console.log('🚀 Usage: const captureManager = createCaptureManager(battleScene, networkHandler);');
