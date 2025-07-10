// client/src/managers/Battle/BattleCaptureManager.js
// GESTIONNAIRE CAPTURE CLIENT - 99% AUTHENTIQUE POKÉMON + TRADUCTIONS

import { BattleTranslator } from '../../Battle/BattleTranslator.js';

/**
 * BATTLE CAPTURE MANAGER - Version Client Pokémon Authentique + Multilingue
 * 
 * Responsabilités :
 * - Gestion des animations de capture authentiques
 * - Synchronisation avec le serveur (BattleRoom)
 * - Effets visuels et sonores fidèles aux jeux originaux
 * - Gestion du timing des secousses (1-4 secousses)
 * - Animation de la Ball qui tombe, bouge, s'ouvre/se ferme
 * - Messages authentiques multilingues ("Gotcha!" etc.)
 * 
 * Flow authentique :
 * 1. Joueur sélectionne Ball → Envoi au serveur
 * 2. Serveur calcule → Renvoie animations étape par étape
 * 3. Client exécute animations avec timing authentique
 * 4. Résultat final : capturé ou échappé
 */

export class BattleCaptureManager {
  
  constructor(battleScene, networkHandler, playerRole = 'player1') {
    console.log('🎯 [BattleCaptureManager] Initialisation authentique Pokémon + Traductions');
    
    this.battleScene = battleScene;
    this.networkHandler = networkHandler;
    this.playerRole = playerRole;
    
    // === SYSTÈME DE TRADUCTION ===
    this.translator = new BattleTranslator(playerRole);
    console.log(`🌍 [BattleCaptureManager] Traducteur configuré (${this.translator.language})`);
    
    // === ÉTAT DE CAPTURE ===
    this.isCapturing = false;
    this.currentCaptureData = null;
    this.captureAnimations = [];
    this.currentAnimationIndex = 0;
    
    // === SPRITES DE CAPTURE ===
    this.ballSprite = null;
    this.targetPokemonSprite = null;
    this.captureEffects = [];
    
    // === TIMING AUTHENTIQUE ===
    this.timings = {
      ballThrow: 800,        // Lancer de Ball
      ballHit: 300,          // Contact avec Pokémon
      pokemonDisappear: 400, // Pokémon disparaît dans Ball
      ballFall: 600,         // Ball tombe au sol
      shakeDelay: 200,       // Délai avant première secousse
      shakeDuration: 600,    // Durée d'une secousse
      shakeInterval: 400,    // Intervalle entre secousses
      resultDelay: 800,      // Délai avant résultat final
      successCelebration: 2000, // Célébration de capture
      failureEscape: 1000    // Animation d'échappement
    };
    
    // === POSITIONS ET CONSTANTES ===
    this.ballStartPosition = { x: 0, y: 0 };
    this.ballLandPosition = { x: 0, y: 0 };
    this.pokemonPosition = { x: 0, y: 0 };
    
    this.setupNetworkEvents();
    
    console.log('✅ [BattleCaptureManager] Prêt pour captures authentiques');
  }
  
  // === CONFIGURATION ÉVÉNEMENTS RÉSEAU ===
  
  setupNetworkEvents() {
    if (!this.networkHandler) {
      console.warn('⚠️ [BattleCaptureManager] NetworkHandler manquant');
      return;
    }
    
    // Réponse serveur pour tentative de capture
    this.networkHandler.on('actionResult', (data) => {
      if (data.captureData) {
        console.log('🎯 [BattleCaptureManager] Données capture reçues:', data.captureData);
        this.handleCaptureResult(data.captureData);
      }
    });
    
    // Événements de capture en temps réel (si implémentés plus tard)
    this.networkHandler.on('captureAnimationStep', (data) => {
      console.log('🎬 [BattleCaptureManager] Animation step:', data);
      this.handleAnimationStep(data);
    });
    
    console.log('📡 [BattleCaptureManager] Événements réseau configurés');
  }
  
  // === API PUBLIQUE ===
  
  /**
   * Démarre une tentative de capture
   */
  async attemptCapture(ballType, targetPokemonSprite) {
    console.log(`🎯 [BattleCaptureManager] Tentative capture avec ${ballType}`);
    
    if (this.isCapturing) {
      console.warn('⚠️ [BattleCaptureManager] Capture déjà en cours');
      return false;
    }
    
    // Validation
    if (!ballType || !targetPokemonSprite) {
      console.error('❌ [BattleCaptureManager] Paramètres manquants');
      return false;
    }
    
    // Préparer la capture
    this.isCapturing = true;
    this.targetPokemonSprite = targetPokemonSprite;
    this.pokemonPosition = { x: targetPokemonSprite.x, y: targetPokemonSprite.y };
    
    // Calculer positions
    this.calculateCapturePositions();
    
    // Créer sprite de Ball
    this.createBallSprite(ballType);
    
    // Envoyer au serveur
    if (this.networkHandler) {
      this.networkHandler.attemptCapture(ballType);
    }
    
    // Animation de lancer immédiate (avant réponse serveur)
    const ballDisplayName = this.getBallDisplayName(ballType);
    const throwMessage = this.getCaptureMessage('ballThrow', { ballName: ballDisplayName });
    this.showCaptureMessage(throwMessage, this.timings.ballThrow);
    
    this.startThrowAnimation();
    
    return true;
  }
  
  /**
   * Annule une capture en cours
   */
  cancelCapture() {
    console.log('❌ [BattleCaptureManager] Annulation capture');
    
    this.cleanup();
  }
  
  // === CALCULS DE POSITIONS ===
  
  calculateCapturePositions() {
    const { width, height } = this.battleScene.cameras.main;
    
    // Position de départ de la Ball (hors écran à gauche)
    this.ballStartPosition = {
      x: -100,
      y: height * 0.6
    };
    
    // Position d'atterrissage (devant le Pokémon)
    this.ballLandPosition = {
      x: this.pokemonPosition.x - 50,
      y: this.pokemonPosition.y + 20
    };
    
    console.log('📍 [BattleCaptureManager] Positions calculées:', {
      start: this.ballStartPosition,
      land: this.ballLandPosition,
      pokemon: this.pokemonPosition
    });
  }
  
  // === CRÉATION SPRITES ===
  
  createBallSprite(ballType) {
    // Pour le moment, sprite simple - à améliorer avec vraies textures
    this.ballSprite = this.battleScene.add.circle(
      this.ballStartPosition.x,
      this.ballStartPosition.y,
      12,
      this.getBallColor(ballType)
    );
    
    this.ballSprite.setStroke(0x000000, 2);
    this.ballSprite.setDepth(100);
    
    // Ajouter indicateur de type de Ball
    const ballText = this.battleScene.add.text(
      this.ballStartPosition.x,
      this.ballStartPosition.y - 20,
      this.getBallDisplayName(ballType),
      {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
      }
    );
    ballText.setOrigin(0.5);
    ballText.setDepth(101);
    
    this.captureEffects.push(ballText);
    
    console.log(`🎾 [BattleCaptureManager] Sprite ${ballType} créé`);
  }
  
  // === ANIMATIONS DE BASE ===
  
  async startThrowAnimation() {
    console.log('🚀 [BattleCaptureManager] Animation de lancer');
    
    if (!this.ballSprite) {
      console.error('❌ [BattleCaptureManager] Sprite Ball manquant');
      return;
    }
    
    // Animation de lancer avec rotation
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      x: this.pokemonPosition.x,
      y: this.pokemonPosition.y - 30,
      rotation: Math.PI * 4, // 2 tours complets
      duration: this.timings.ballThrow,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.handleBallContact();
      }
    });
    
    // Effet de trail (optionnel)
    this.createBallTrail();
  }
  
  handleBallContact() {
    console.log('💥 [BattleCaptureManager] Contact Ball-Pokémon');
    
    // Effet visuel de contact
    this.createContactEffect();
    
    // Attendre un court instant puis faire disparaître le Pokémon
    setTimeout(() => {
      this.pokemonDisappearAnimation();
    }, this.timings.ballHit);
  }
  
  pokemonDisappearAnimation() {
    console.log('✨ [BattleCaptureManager] Pokémon disparaît dans la Ball');
    
    if (!this.targetPokemonSprite) return;
    
    // Animation de réduction et disparition
    this.battleScene.tweens.add({
      targets: this.targetPokemonSprite,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0.3,
      duration: this.timings.pokemonDisappear,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.targetPokemonSprite.setVisible(false);
        this.ballFallAnimation();
      }
    });
    
    // Effet de lumière d'aspiration
    this.createAbsorptionEffect();
  }
  
  ballFallAnimation() {
    console.log('⬇️ [BattleCaptureManager] Ball tombe au sol');
    
    if (!this.ballSprite) return;
    
    // Animation de chute avec rebond
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      x: this.ballLandPosition.x,
      y: this.ballLandPosition.y,
      rotation: this.ballSprite.rotation + Math.PI,
      duration: this.timings.ballFall,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Attendre la réponse du serveur ou commencer les secousses
        this.waitForServerResponse();
      }
    });
  }
  
  // === TRADUCTIONS SPÉCIALES CAPTURE ===
  
  /**
   * Messages de capture authentiques multilingues
   */
  getCaptureMessage(messageType, data = {}) {
    const messages = {
      'fr': {
        ballThrow: (ballName) => `Vous lancez ${ballName} !`,
        criticalCapture: () => '⭐ Capture critique ! ⭐',
        ballShake1: () => 'La Ball bouge...',
        ballShake2: () => 'Elle bouge encore...',
        ballShake3: () => 'Et encore une fois...',
        ballShake4: () => 'Une dernière fois...',
        captureSuccess: (pokemonName) => `Gotcha ! ${pokemonName} a été capturé !`,
        captureFailure: (pokemonName) => `Oh non ! ${pokemonName} s'est échappé !`,
        addedToTeam: (pokemonName) => `${pokemonName} a été ajouté à votre équipe !`,
        sentToPC: (pokemonName) => `${pokemonName} a été envoyé au PC (équipe pleine).`
      },
      'en': {
        ballThrow: (ballName) => `You threw ${ballName}!`,
        criticalCapture: () => '⭐ Critical capture! ⭐',
        ballShake1: () => 'The Ball wobbled...',
        ballShake2: () => 'It wobbled again...',
        ballShake3: () => 'And once more...',
        ballShake4: () => 'One last time...',
        captureSuccess: (pokemonName) => `Gotcha! ${pokemonName} was caught!`,
        captureFailure: (pokemonName) => `Oh no! ${pokemonName} broke free!`,
        addedToTeam: (pokemonName) => `${pokemonName} was added to your team!`,
        sentToPC: (pokemonName) => `${pokemonName} was sent to PC (team full).`
      },
      'es': {
        ballThrow: (ballName) => `¡Lanzaste ${ballName}!`,
        criticalCapture: () => '⭐ ¡Captura crítica! ⭐',
        ballShake1: () => 'La Ball se tambalea...',
        ballShake2: () => 'Se tambalea otra vez...',
        ballShake3: () => 'Y una vez más...',
        ballShake4: () => 'Una última vez...',
        captureSuccess: (pokemonName) => `¡Atrapado! ¡${pokemonName} fue capturado!`,
        captureFailure: (pokemonName) => `¡Oh no! ¡${pokemonName} se escapó!`,
        addedToTeam: (pokemonName) => `¡${pokemonName} fue añadido a tu equipo!`,
        sentToPC: (pokemonName) => `${pokemonName} fue enviado al PC (equipo lleno).`
      }
    };
    
    const lang = this.translator.language;
    const langMessages = messages[lang] || messages['en'];
    const messageFunc = langMessages[messageType];
    
    if (!messageFunc) {
      console.warn(`⚠️ [CaptureManager] Message inconnu: ${messageType}`);
      return `[${messageType}]`;
    }
    
    return messageFunc(data.ballName, data.pokemonName, data);
  }
  
  waitForServerResponse() {
    console.log('⏳ [BattleCaptureManager] Attente réponse serveur...');
    
    // Timeout de sécurité si le serveur ne répond pas
    setTimeout(() => {
      if (this.isCapturing && !this.currentCaptureData) {
        console.warn('⚠️ [BattleCaptureManager] Timeout serveur, capture par défaut');
        this.handleDefaultCapture();
      }
    }, 5000);
  }
  
  handleCaptureResult(captureData) {
    console.log('📋 [BattleCaptureManager] Traitement résultat capture:', captureData);
    
    this.currentCaptureData = captureData;
    this.captureAnimations = captureData.animations || [];
    this.currentAnimationIndex = 0;
    
    // Commencer les animations selon les données serveur
    if (captureData.critical) {
      this.startCriticalCaptureSequence();
    } else {
      this.startNormalCaptureSequence();
    }
  }
  
  // === SÉQUENCES DE CAPTURE ===
  
  async startCriticalCaptureSequence() {
    console.log('⭐ [BattleCaptureManager] CAPTURE CRITIQUE !');
    
    // Effet spécial critique
    this.createCriticalEffect();
    
    // Message critique traduit
    const criticalMessage = this.getCaptureMessage('criticalCapture');
    this.showCaptureMessage(criticalMessage, 2000);
    
    // Une seule secousse puis succès
    setTimeout(() => {
      this.performShake(1, 1, true);
    }, this.timings.shakeDelay);
  }
  
  async startNormalCaptureSequence() {
    console.log('🎯 [BattleCaptureManager] Capture normale');
    
    const shakeCount = this.currentCaptureData?.shakeCount || 0;
    const captured = this.currentCaptureData?.captured || false;
    
    console.log(`🔄 [BattleCaptureManager] ${shakeCount} secousses prévues, capture: ${captured}`);
    
    // Commencer les secousses
    setTimeout(() => {
      this.startShakeSequence(shakeCount, captured);
    }, this.timings.shakeDelay);
  }
  
  // === ANIMATIONS DE SECOUSSES ===
  
  async startShakeSequence(totalShakes, willSucceed) {
    console.log(`🔄 [BattleCaptureManager] Début ${totalShakes} secousses`);
    
    for (let i = 0; i < totalShakes; i++) {
      await this.performShake(i + 1, totalShakes, false);
      
      // Pause entre secousses (sauf dernière)
      if (i < totalShakes - 1) {
        await this.delay(this.timings.shakeInterval);
      }
    }
    
    // Délai avant résultat final
    await this.delay(this.timings.resultDelay);
    
    if (willSucceed) {
      this.captureSuccess();
    } else {
      this.captureFailure();
    }
  }
  
  async performShake(shakeNumber, totalShakes, isCritical) {
    console.log(`〰️ [BattleCaptureManager] Secousse ${shakeNumber}/${totalShakes}`);
    
    if (!this.ballSprite) return;
    
    // Message de secousse traduit
    const shakeMessage = this.getCaptureMessage(`ballShake${shakeNumber}`);
    this.showCaptureMessage(shakeMessage, this.timings.shakeDuration);
    
    // Animation de secousse
    const originalX = this.ballSprite.x;
    const shakeIntensity = isCritical ? 15 : 10;
    
    return new Promise((resolve) => {
      this.battleScene.tweens.add({
        targets: this.ballSprite,
        x: originalX - shakeIntensity,
        duration: this.timings.shakeDuration / 4,
        ease: 'Power2.easeInOut',
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.ballSprite.setX(originalX);
          resolve();
        }
      });
      
      // Effet visuel de secousse
      this.createShakeEffect(shakeNumber);
    });
  }
  
  // === RÉSULTATS FINAUX ===
  
  captureSuccess() {
    console.log('🎉 [BattleCaptureManager] CAPTURE RÉUSSIE !');
    
    const pokemonName = this.currentCaptureData?.pokemonName || 'Pokémon';
    
    // Effet de confirmation
    this.createSuccessEffect();
    
    // Message de succès authentique traduit
    const successMessage = this.getCaptureMessage('captureSuccess', { pokemonName });
    this.showCaptureMessage(successMessage, this.timings.successCelebration);
    
    // Message d'ajout à l'équipe/PC si disponible
    if (this.currentCaptureData?.addedTo) {
      const addMessage = this.currentCaptureData.addedTo === 'team' ?
        this.getCaptureMessage('addedToTeam', { pokemonName }) :
        this.getCaptureMessage('sentToPC', { pokemonName });
      
      setTimeout(() => {
        this.showCaptureMessage(addMessage, 2000);
      }, 1500);
    }
    
    // Animation de célébration
    this.celebrateCapture();
    
    // Nettoyage après célébration
    setTimeout(() => {
      this.cleanup();
    }, this.timings.successCelebration);
  }
  
  captureFailure() {
    console.log('💨 [BattleCaptureManager] Capture échouée !');
    
    const pokemonName = this.currentCaptureData?.pokemonName || 'Pokémon';
    
    // Ouvrir la Ball
    this.ballOpenAnimation();
    
    // Message d'échec traduit
    const failureMessage = this.getCaptureMessage('captureFailure', { pokemonName });
    this.showCaptureMessage(failureMessage, this.timings.failureEscape);
    
    // Faire réapparaître le Pokémon
    setTimeout(() => {
      this.pokemonEscapeAnimation();
    }, 300);
    
    // Nettoyage après échec
    setTimeout(() => {
      this.cleanup();
    }, this.timings.failureEscape);
  }
  
  // === EFFETS VISUELS ===
  
  createBallTrail() {
    // Effet de traînée derrière la Ball (simple pour commencer)
    // TODO: Améliorer avec particules
  }
  
  createContactEffect() {
    // Effet d'impact Ball-Pokémon
    const impact = this.battleScene.add.circle(
      this.pokemonPosition.x,
      this.pokemonPosition.y,
      20,
      0xFFFFFF,
      0.8
    );
    impact.setDepth(99);
    
    this.battleScene.tweens.add({
      targets: impact,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => impact.destroy()
    });
  }
  
  createAbsorptionEffect() {
    // Effet de lumière d'aspiration
    const absorption = this.battleScene.add.circle(
      this.pokemonPosition.x,
      this.pokemonPosition.y,
      30,
      0x00FFFF,
      0.6
    );
    absorption.setDepth(98);
    
    this.battleScene.tweens.add({
      targets: absorption,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: this.timings.pokemonDisappear,
      ease: 'Power2.easeIn',
      onComplete: () => absorption.destroy()
    });
  }
  
  createCriticalEffect() {
    // Effet spécial capture critique (étoiles dorées)
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const star = this.battleScene.add.text(
          this.ballLandPosition.x + (Math.random() - 0.5) * 60,
          this.ballLandPosition.y + (Math.random() - 0.5) * 40,
          '⭐',
          { fontSize: '20px' }
        );
        star.setDepth(102);
        
        this.battleScene.tweens.add({
          targets: star,
          y: star.y - 50,
          alpha: 0,
          scale: 2,
          duration: 1500,
          onComplete: () => star.destroy()
        });
      }, i * 200);
    }
  }
  
  createShakeEffect(shakeNumber) {
    // Effet visuel pendant les secousses
    const dust = this.battleScene.add.circle(
      this.ballLandPosition.x + (Math.random() - 0.5) * 30,
      this.ballLandPosition.y + 15,
      3,
      0x8B4513,
      0.7
    );
    dust.setDepth(90);
    
    this.battleScene.tweens.add({
      targets: dust,
      y: dust.y - 20,
      alpha: 0,
      duration: 500,
      onComplete: () => dust.destroy()
    });
  }
  
  createSuccessEffect() {
    // Effet de confirmation (flash blanc)
    const flash = this.battleScene.add.rectangle(
      this.battleScene.cameras.main.centerX,
      this.battleScene.cameras.main.centerY,
      this.battleScene.cameras.main.width,
      this.battleScene.cameras.main.height,
      0xFFFFFF,
      0.8
    );
    flash.setDepth(200);
    
    this.battleScene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy()
    });
  }
  
  // === ANIMATIONS SPÉCIALES ===
  
  ballOpenAnimation() {
    console.log('📖 [BattleCaptureManager] Ball s\'ouvre');
    
    if (!this.ballSprite) return;
    
    // Animation d'ouverture (changement de couleur/forme)
    this.ballSprite.setFillStyle(0xFF4444, 0.7);
    
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      scaleX: 1.3,
      scaleY: 0.7,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.ballSprite.setFillStyle(0xCCCCCC, 0.5);
      }
    });
  }
  
  pokemonEscapeAnimation() {
    console.log('💨 [BattleCaptureManager] Pokémon s\'échappe');
    
    if (!this.targetPokemonSprite) return;
    
    // Faire réapparaître le Pokémon
    this.targetPokemonSprite.setVisible(true);
    this.targetPokemonSprite.setScale(0.1);
    this.targetPokemonSprite.setAlpha(0.3);
    
    this.battleScene.tweens.add({
      targets: this.targetPokemonSprite,
      scaleX: this.targetPokemonSprite.scaleX || 1,
      scaleY: this.targetPokemonSprite.scaleY || 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });
  }
  
  celebrateCapture() {
    console.log('🎊 [BattleCaptureManager] Célébration capture');
    
    if (!this.ballSprite) return;
    
    // Animation de joie de la Ball
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      y: this.ballSprite.y - 20,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true
    });
  }
  
  // === UTILITAIRES ===
  
  showCaptureMessage(message, duration) {
    console.log(`💬 [BattleCaptureManager] Message: "${message}"`);
    
    // Utiliser le système de messages de BattleScene si disponible
    if (this.battleScene.showBattleMessage) {
      this.battleScene.showBattleMessage(message, duration);
    } else if (this.battleScene.showActionMessage) {
      this.battleScene.showActionMessage(message);
    } else {
      console.log(`📢 ${message}`);
    }
  }
  
  getShakeMessage(shakeNumber) {
    // Utiliser le système de traduction pour les secousses
    return this.getCaptureMessage(`ballShake${shakeNumber}`);
  }
  
  getBallDisplayName(ballType) {
    // Noms des Balls en français/multilingue
    const names = {
      'fr': {
        'poke_ball': 'Poké Ball',
        'great_ball': 'Super Ball',
        'ultra_ball': 'Hyper Ball',
        'master_ball': 'Master Ball',
        'timer_ball': 'Chrono Ball',
        'quick_ball': 'Rapide Ball',
        'dusk_ball': 'Sombre Ball',
        'repeat_ball': 'Bis Ball',
        'net_ball': 'Filet Ball',
        'dive_ball': 'Scaphandre Ball',
        'nest_ball': 'Nid Ball'
      },
      'en': {
        'poke_ball': 'Poké Ball',
        'great_ball': 'Great Ball',
        'ultra_ball': 'Ultra Ball',
        'master_ball': 'Master Ball',
        'timer_ball': 'Timer Ball',
        'quick_ball': 'Quick Ball',
        'dusk_ball': 'Dusk Ball',
        'repeat_ball': 'Repeat Ball',
        'net_ball': 'Net Ball',
        'dive_ball': 'Dive Ball',
        'nest_ball': 'Nest Ball'
      },
      'es': {
        'poke_ball': 'Poké Ball',
        'great_ball': 'Super Ball',
        'ultra_ball': 'Ultra Ball',
        'master_ball': 'Master Ball',
        'timer_ball': 'Tiempo Ball',
        'quick_ball': 'Veloz Ball',
        'dusk_ball': 'Ocaso Ball',
        'repeat_ball': 'Bis Ball',
        'net_ball': 'Red Ball',
        'dive_ball': 'Buceo Ball',
        'nest_ball': 'Nido Ball'
      }
    };
    
    const lang = this.translator.language;
    const langNames = names[lang] || names['en'];
    return langNames[ballType] || ballType;
  }
  
  getBallColor(ballType) {
    const colors = {
      'poke_ball': 0xFF4444,
      'great_ball': 0x4444FF,
      'ultra_ball': 0xFFD700,
      'master_ball': 0x9932CC,
      'timer_ball': 0xFFFFFF,
      'quick_ball': 0x00FFFF
    };
    return colors[ballType] || 0xFF4444;
  }
  
  handleDefaultCapture() {
    // Capture par défaut en cas de problème serveur
    this.currentCaptureData = {
      captured: Math.random() > 0.5,
      shakeCount: Math.floor(Math.random() * 4),
      pokemonName: 'Pokémon'
    };
    
    this.startNormalCaptureSequence();
  }
  
  handleAnimationStep(data) {
    // Pour animations futures étape par étape
    console.log('🎬 [BattleCaptureManager] Animation step:', data);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // === NETTOYAGE ===
  
  cleanup() {
    console.log('🧹 [BattleCaptureManager] Nettoyage capture');
    
    // Supprimer sprites
    if (this.ballSprite) {
      this.ballSprite.destroy();
      this.ballSprite = null;
    }
    
    // Supprimer effets
    this.captureEffects.forEach(effect => {
      if (effect && effect.destroy) {
        effect.destroy();
      }
    });
    this.captureEffects = [];
    
    // Reset état
    this.isCapturing = false;
    this.currentCaptureData = null;
    this.captureAnimations = [];
    this.currentAnimationIndex = 0;
    this.targetPokemonSprite = null;
    
    console.log('✅ [BattleCaptureManager] Nettoyage terminé');
  }
  
  // === API CONFIGURATION ===
  
  /**
   * Change la langue du système de capture
   */
  setLanguage(language) {
    if (this.translator) {
      this.translator.setLanguage(language);
      console.log(`🌍 [BattleCaptureManager] Langue changée: ${language}`);
    }
  }
  
  /**
   * Met à jour le rôle du joueur
   */
  setPlayerRole(playerRole) {
    this.playerRole = playerRole;
    if (this.translator) {
      this.translator.setPlayerId(playerRole);
      console.log(`🎮 [BattleCaptureManager] Rôle mis à jour: ${playerRole}`);
    }
  }
  
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      hasCurrentData: !!this.currentCaptureData,
      ballSpriteActive: !!this.ballSprite,
      effectsCount: this.captureEffects.length,
      networkConnected: !!this.networkHandler,
      language: this.translator?.language || 'unknown',
      playerRole: this.playerRole,
      supportedLanguages: this.translator?.getSupportedLanguages() || [],
      version: 'pokemon_authentique_multilingue_v1'
    };
  }
  
  // === TESTS AMÉLIORÉS ===
  
  testCapture(ballType = 'poke_ball') {
    console.log('🧪 [BattleCaptureManager] Test capture multilingue');
    
    // Simuler un Pokémon cible
    const testPokemon = this.battleScene.add.circle(400, 200, 30, 0xFFFF00);
    testPokemon.setDepth(50);
    
    this.attemptCapture(ballType, testPokemon);
    
    // Simuler réponse serveur après 2s
    setTimeout(() => {
      this.handleCaptureResult({
        captured: Math.random() > 0.3,
        shakeCount: Math.floor(Math.random() * 4),
        pokemonName: 'Pikachu Test',
        ballType: ballType,
        critical: Math.random() > 0.9,
        addedTo: Math.random() > 0.5 ? 'team' : 'pc'
      });
    }, 2000);
  }
  
  /**
   * Test tous les messages dans toutes les langues
   */
  testAllLanguages() {
    console.log('🌍 [BattleCaptureManager] Test toutes les langues');
    
    const languages = ['fr', 'en', 'es'];
    const testData = {
      ballName: 'Poké Ball',
      pokemonName: 'Pikachu'
    };
    
    languages.forEach(lang => {
      console.log(`\n📍 === ${lang.toUpperCase()} ===`);
      this.setLanguage(lang);
      
      console.log('Lancer:', this.getCaptureMessage('ballThrow', testData));
      console.log('Critique:', this.getCaptureMessage('criticalCapture'));
      console.log('Secousse 1:', this.getCaptureMessage('ballShake1'));
      console.log('Succès:', this.getCaptureMessage('captureSuccess', testData));
      console.log('Échec:', this.getCaptureMessage('captureFailure', testData));
    });
    
    // Revenir à la langue d'origine
    this.setLanguage(this.translator.detectLanguage());
  }
}

// === FONCTIONS GLOBALES DE TEST AMÉLIORÉES ===

window.testCapture = function(ballType = 'poke_ball') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    battleScene.captureManager.testCapture(ballType);
  } else {
    console.error('❌ BattleScene ou CaptureManager non trouvé');
  }
};

window.testCriticalCapture = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    // Force une capture critique
    const testPokemon = battleScene.add.circle(400, 200, 30, 0xFFFF00);
    battleScene.captureManager.attemptCapture('master_ball', testPokemon);
    
    setTimeout(() => {
      battleScene.captureManager.handleCaptureResult({
        captured: true,
        shakeCount: 1,
        pokemonName: 'Pikachu',
        ballType: 'master_ball',
        critical: true,
        addedTo: 'team'
      });
    }, 2000);
  }
};

window.testCaptureLanguages = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    battleScene.captureManager.testAllLanguages();
  } else {
    console.error('❌ BattleScene ou CaptureManager non trouvé');
  }
};

window.setCaptureLanguage = function(language) {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    battleScene.captureManager.setLanguage(language);
    console.log(`🌍 Langue de capture changée: ${language}`);
  } else {
    console.error('❌ BattleScene ou CaptureManager non trouvé');
  }
};

console.log('✅ [BattleCaptureManager] Chargé avec traductions multilingues !');
console.log('🧪 Tests: window.testCapture(), window.testCriticalCapture()');
console.log('🌍 Langues: window.testCaptureLanguages(), window.setCaptureLanguage("fr|en|es")');

export default BattleCaptureManager;
