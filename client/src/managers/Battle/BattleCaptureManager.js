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
  
  // === INITIALISATION AVEC RETRY COUNTER ===
  
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
    
    // === GESTION RÉSEAU ===
    this.retryCount = 0; // ✅ NOUVEAU: Compteur de retry
    
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
  
  // === CRÉATION SPRITES AUTHENTIQUES ===
  
  createBallSprite(ballType) {
    // ✅ Créer une vraie Pokéball avec graphics
    this.ballSprite = this.battleScene.add.graphics();
    this.ballSprite.setPosition(this.ballStartPosition.x, this.ballStartPosition.y);
    this.ballSprite.setDepth(1000);
    
    // Dessiner la Pokéball réaliste
    this.drawPokeball(this.ballSprite, 0, 0, 25, ballType);
    
    console.log(`🎾 [BattleCaptureManager] Pokéball ${ballType} créée à:`, {
      x: this.ballStartPosition.x,
      y: this.ballStartPosition.y
    });
  }
  
  /**
   * Dessine une Pokéball réaliste selon le type
   */
  drawPokeball(graphics, x = 0, y = 0, size = 25, ballType = 'poke_ball') {
    graphics.clear();
    
    // Couleurs selon le type de Ball
    const colors = this.getBallColors(ballType);
    
    // Partie supérieure 
    graphics.fillStyle(colors.top);
    graphics.beginPath();
    graphics.arc(x, y, size, Math.PI, 0, true);
    graphics.fill();
    
    // Partie inférieure
    graphics.fillStyle(colors.bottom);
    graphics.beginPath();
    graphics.arc(x, y, size, 0, Math.PI, true);
    graphics.fill();
    
    // Ligne centrale noire
    graphics.lineStyle(3, 0x000000);
    graphics.beginPath();
    graphics.moveTo(x - size, y);
    graphics.lineTo(x + size, y);
    graphics.stroke();
    
    // Bouton central
    graphics.fillStyle(colors.button);
    graphics.fillCircle(x, y, 8);
    graphics.lineStyle(2, 0x000000);
    graphics.strokeCircle(x, y, 8);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(x, y, 4);
    
    // Effet spécial selon le type
    if (colors.special) {
      graphics.lineStyle(2, colors.special, 0.6);
      graphics.strokeCircle(x, y, size + 3);
    }
  }
  
  /**
   * Couleurs authentiques des différentes Balls
   */
  getBallColors(ballType) {
    const ballColors = {
      'poke_ball': { top: 0xFF4444, bottom: 0xFFFFFF, button: 0xFFFFFF },
      'great_ball': { top: 0x4444FF, bottom: 0xFFFFFF, button: 0xFFFFFF },
      'ultra_ball': { top: 0xFFD700, bottom: 0x000000, button: 0xFFD700 },
      'master_ball': { top: 0x9932CC, bottom: 0xFFFFFF, button: 0xFF69B4, special: 0xFFD700 },
      'timer_ball': { top: 0xFFFFFF, bottom: 0xFF8C00, button: 0xFFFFFF },
      'quick_ball': { top: 0x00FFFF, bottom: 0xFFFF00, button: 0xFFFFFF },
      'dusk_ball': { top: 0x2F4F2F, bottom: 0xFF4500, button: 0x8B0000 },
      'repeat_ball': { top: 0xFFD700, bottom: 0x4169E1, button: 0xFFFFFF },
      'net_ball': { top: 0x00CED1, bottom: 0x000080, button: 0xFFFFFF },
      'dive_ball': { top: 0x4169E1, bottom: 0x87CEEB, button: 0xFFFFFF },
      'nest_ball': { top: 0x9ACD32, bottom: 0xFFD700, button: 0x8B4513 }
    };
    
    return ballColors[ballType] || ballColors['poke_ball'];
  }
  
  // === ANIMATIONS AUTHENTIQUES ===
  
  async startThrowAnimation() {
    console.log('🚀 [BattleCaptureManager] Animation lancer authentique');
    
    if (!this.ballSprite) {
      console.error('❌ [BattleCaptureManager] Sprite Ball manquant');
      return;
    }
    
    // Animation de lancer avec rotation authentique
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
  }
  
  handleBallContact() {
    console.log('💥 [BattleCaptureManager] Contact Ball-Pokémon');
    
    // Effet visuel de contact authentique
    this.createContactEffect();
    
    // Attendre un court instant puis faire disparaître le Pokémon
    setTimeout(() => {
      this.pokemonDisappearAnimation();
    }, this.timings.ballHit);
  }
  
  pokemonDisappearAnimation() {
    console.log('✨ [BattleCaptureManager] Pokémon disparaît dans la Ball');
    
    if (!this.targetPokemonSprite) return;
    
    // Animation de réduction et disparition authentique
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
    
    // Animation de chute avec rebond authentique
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      x: this.ballLandPosition.x,
      y: this.ballLandPosition.y,
      rotation: this.ballSprite.rotation + Math.PI,
      duration: this.timings.ballFall,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        console.log('⏳ [BattleCaptureManager] En attente réponse serveur...');
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
    
    // ✅ RESET RETRY COUNTER
    this.resetRetryCount();
    
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
  
  // === SÉQUENCE DE TEXTES AUTHENTIQUE DANS LE PANEL D'ACTION ===
  
  async startCaptureTextSequence() {
    console.log('📖 [BattleCaptureManager] Début séquence textes dans panel d\'action');
    
    // ✅ PAS DE MASQUAGE - Utiliser le panel d'action
    // this.battleScene.hideActionButtons(); // SUPPRIMÉ
    // this.battleScene.hideActionMessage(); // SUPPRIMÉ
    
    // ✅ SÉQUENCE COMPLÈTE DE TEXTES DANS LE PANEL
    const ballDisplayName = this.getBallDisplayName(this.currentCaptureData?.ballType || 'poke_ball');
    const throwMessage = this.getCaptureMessage('ballThrow', { ballName: ballDisplayName });
    
    // 1. Message de lancer
    this.showCaptureMessage(throwMessage);
    
    // Attendre que l'animation de lancer soit terminée
    await this.delay(2000);
    
    // 2. Messages de secousses selon le serveur
    if (this.currentCaptureData?.critical) {
      // Capture critique - message spécial
      const criticalMessage = this.getCaptureMessage('criticalCapture');
      this.showCaptureMessage(criticalMessage);
      await this.delay(2500);
    } else {
      // Secousses normales avec délais authentiques
      const shakeCount = this.currentCaptureData?.shakeCount || 0;
      const shakeMessages = [
        this.getCaptureMessage('ballShake1'), // "La Ball bouge..."
        this.getCaptureMessage('ballShake2'), // "Elle bouge encore..."
        this.getCaptureMessage('ballShake3'), // "Et encore une fois..."
        this.getCaptureMessage('ballShake4')  // "Une dernière fois..."
      ];
      
      for (let i = 0; i < shakeCount; i++) {
        this.showCaptureMessage(shakeMessages[i]);
        await this.delay(1500); // Délai entre chaque secousse
      }
      
      // Délai suspense avant résultat
      await this.delay(1000);
    }
    
    // 3. Message final
    const pokemonName = this.currentCaptureData?.pokemonName || 'Pokémon';
    
    if (this.currentCaptureData?.captured) {
      // Succès - "Gotcha ! Pikachu a été capturé !"
      const successMessage = this.getCaptureMessage('captureSuccess', { pokemonName });
      this.showCaptureMessage(successMessage);
      
      // Message d'ajout équipe/PC
      if (this.currentCaptureData?.addedTo) {
        setTimeout(() => {
          const addMessage = this.currentCaptureData.addedTo === 'team' ?
            this.getCaptureMessage('addedToTeam', { pokemonName }) :
            this.getCaptureMessage('sentToPC', { pokemonName });
          
          this.showCaptureMessage(addMessage);
        }, 2000);
      }
    } else {
      // Échec - "Oh non ! Pikachu s'est échappé !"
      const failureMessage = this.getCaptureMessage('captureFailure', { pokemonName });
      this.showCaptureMessage(failureMessage);
    }
    
    console.log('✅ [BattleCaptureManager] Séquence textes terminée');
  }
  
  async startCriticalCaptureSequence() {
    console.log('⭐ [BattleCaptureManager] CAPTURE CRITIQUE !');
    
    // Effet spécial critique
    this.createCriticalEffect();
    
    // Message critique traduit
    const criticalMessage = this.getCaptureMessage('criticalCapture');
    this.showCaptureMessage(criticalMessage, 2000);
    
    // Une seule secousse puis succès (authentique)
    setTimeout(() => {
      this.performShake(1, 1, true).then(() => {
        setTimeout(() => {
          this.captureSuccess();
        }, this.timings.resultDelay);
      });
    }, this.timings.shakeDelay);
  }
  
  async startNormalCaptureSequence() {
    console.log('🎯 [BattleCaptureManager] Capture normale');
    
    const shakeCount = this.currentCaptureData?.shakeCount || 0;
    const captured = this.currentCaptureData?.captured || false;
    
    console.log(`🔄 [BattleCaptureManager] ${shakeCount} secousses prévues, capture: ${captured}`);
    
    // Commencer les secousses après délai
    setTimeout(() => {
      this.startShakeSequence(shakeCount, captured);
    }, this.timings.shakeDelay);
  }
  
  // === ANIMATIONS DE SECOUSSES SILENCIEUSES ===
  
  async startShakeSequence(totalShakes, willSucceed) {
    console.log(`🔄 [BattleCaptureManager] Début ${totalShakes} secousses silencieuses`);
    
    // ✅ PAS DE MESSAGES ICI - La séquence texte s'en charge
    // Juste les animations visuelles
    
    for (let i = 0; i < totalShakes; i++) {
      await this.performShakeAuthentic(i + 1, totalShakes);
      
      // Pause entre secousses (sauf dernière)
      if (i < totalShakes - 1) {
        await this.delay(this.timings.shakeInterval);
      }
    }
    
    // Délai suspense avant résultat
    await this.delay(this.timings.resultDelay);
    
    if (willSucceed) {
      this.captureSuccess();
    } else {
      this.captureFailure();
    }
  }
  
  /**
   * Secousse authentique SILENCIEUSE (pas de message)
   */
  async performShakeAuthentic(shakeNumber, totalShakes) {
    console.log(`〰️ [BattleCaptureManager] Secousse silencieuse ${shakeNumber}/${totalShakes}`);
    
    if (!this.ballSprite) return;
    
    return new Promise((resolve) => {
      const originalX = this.ballSprite.x;
      
      // Intensité progressive comme dans les vrais jeux
      const intensity = 10 + (shakeNumber * 2);
      
      this.battleScene.tweens.add({
        targets: this.ballSprite,
        x: originalX - intensity,
        duration: 120,
        ease: 'Power2.easeInOut',
        yoyo: true,
        repeat: 4, // Plus de répétitions = secousses plus visibles
        onComplete: () => {
          this.ballSprite.setPosition(originalX, this.ballSprite.y);
          
          // Effet de poussière authentique
          this.createShakeEffectAuthentic(shakeNumber, intensity);
          
          resolve();
        }
      });
    });
  }
  
  /**
   * Ancienne méthode performShake pour compatibilité
   */
  async performShake(shakeNumber, totalShakes, isCritical) {
    return this.performShakeAuthentic(shakeNumber, totalShakes);
  }
  
  // === RÉSULTATS FINAUX SILENCIEUX ===
  
  captureSuccess() {
    console.log('🎉 [BattleCaptureManager] CAPTURE RÉUSSIE - Animation seule !');
    
    // ✅ PAS DE MESSAGE ICI - La séquence texte s'en charge
    // Juste les effets visuels
    
    // Effet de confirmation doré authentique
    this.createSuccessEffectAuthentic();
    
    // Animation de célébration authentique
    this.celebrateCaptureAuthentic();
    
    // Nettoyage après célébration
    setTimeout(() => {
      this.cleanup();
      
      // ✅ RÉAFFICHER LES BOUTONS APRÈS LA CAPTURE
      setTimeout(() => {
        if (this.battleScene.showActionButtons) {
          this.battleScene.showActionButtons();
        }
      }, 1000);
    }, this.timings.successCelebration);
  }
  
  captureFailure() {
    console.log('💨 [BattleCaptureManager] Capture échouée - Animation seule !');
    
    // ✅ PAS DE MESSAGE ICI - La séquence texte s'en charge
    // Juste les effets visuels
    
    // Ball s'ouvre authentique
    this.ballOpenAnimationAuthentic();
    
    // Faire réapparaître le Pokémon
    setTimeout(() => {
      this.pokemonEscapeAnimationAuthentic();
    }, 300);
    
    // Nettoyage après échec
    setTimeout(() => {
      this.cleanup();
      
      // ✅ RÉAFFICHER LES BOUTONS APRÈS L'ÉCHEC
      setTimeout(() => {
        if (this.battleScene.showActionButtons) {
          this.battleScene.showActionButtons();
        }
      }, 1000);
    }, this.timings.failureEscape);
  }
  
  // === EFFETS VISUELS AUTHENTIQUES ===
  
  createContactEffect() {
    // Effet d'impact Ball-Pokémon authentique
    const impact = this.battleScene.add.circle(
      this.pokemonPosition.x,
      this.pokemonPosition.y,
      30,
      0xFFFFFF,
      0.8
    );
    impact.setDepth(999);
    
    this.battleScene.tweens.add({
      targets: impact,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2.easeOut',
      onComplete: () => impact.destroy()
    });
  }
  
  createAbsorptionEffect() {
    // Effet de lumière d'aspiration authentique
    const absorption = this.battleScene.add.circle(
      this.pokemonPosition.x,
      this.pokemonPosition.y,
      40,
      0x00FFFF,
      0.6
    );
    absorption.setDepth(998);
    
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
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const star = this.battleScene.add.text(
          this.ballLandPosition.x + (Math.random() - 0.5) * 80,
          this.ballLandPosition.y + (Math.random() - 0.5) * 60,
          '⭐',
          { fontSize: '24px' }
        );
        star.setDepth(1500);
        
        this.battleScene.tweens.add({
          targets: star,
          y: star.y - 60,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          rotation: Math.PI * 2,
          duration: 2000,
          onComplete: () => star.destroy()
        });
      }, i * 150);
    }
  }
  
  createShakeEffectAuthentic(shakeNumber, intensity) {
    // Effet visuel pendant les secousses authentique
    for (let j = 0; j < 5; j++) {
      const dust = this.battleScene.add.circle(
        this.ballLandPosition.x + (Math.random() - 0.5) * 40,
        this.ballLandPosition.y + 25,
        2 + Math.random() * 3,
        0x8B4513,
        0.8
      );
      dust.setDepth(990);
      
      this.battleScene.tweens.add({
        targets: dust,
        y: dust.y - 25,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 600,
        onComplete: () => dust.destroy()
      });
    }
  }
  
  createSuccessEffectAuthentic() {
    // Flash de succès doré authentique
    const successFlash = this.battleScene.add.rectangle(
      this.battleScene.cameras.main.centerX,
      this.battleScene.cameras.main.centerY,
      this.battleScene.cameras.main.width,
      this.battleScene.cameras.main.height,
      0xFFD700,
      0.7
    );
    successFlash.setDepth(2000);
    
    this.battleScene.tweens.add({
      targets: successFlash,
      alpha: 0,
      duration: 800,
      onComplete: () => successFlash.destroy()
    });
    
    // Étoiles de célébration
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const star = this.battleScene.add.text(
          this.ballLandPosition.x + (Math.random() - 0.5) * 100,
          this.ballLandPosition.y + (Math.random() - 0.5) * 60,
          '⭐',
          { fontSize: '20px' }
        );
        star.setDepth(1500);
        
        this.battleScene.tweens.add({
          targets: star,
          y: star.y - 60,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          rotation: Math.PI * 2,
          duration: 2000,
          onComplete: () => star.destroy()
        });
      }, i * 150);
    }
  }
  
  // === ANIMATIONS SPÉCIALES AUTHENTIQUES ===
  
  ballOpenAnimationAuthentic() {
    console.log('📖 [BattleCaptureManager] Ball s\'ouvre authentique');
    
    if (!this.ballSprite) return;
    
    // Redessiner la Ball ouverte (gris transparent)
    this.ballSprite.clear();
    this.ballSprite.fillStyle(0x888888, 0.5);
    this.ballSprite.fillRect(-25, -25, 50, 50);
    
    // Animation d'ouverture
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      scaleX: 1.2,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2.easeInOut',
      yoyo: true,
      onComplete: () => {
        // Redessiner la Ball normale mais plus transparente
        this.drawPokeball(this.ballSprite, 0, 0, 25, this.currentCaptureData?.ballType || 'poke_ball');
        this.ballSprite.setAlpha(0.6);
      }
    });
  }
  
  pokemonEscapeAnimationAuthentic() {
    console.log('💨 [BattleCaptureManager] Pokémon s\'échappe authentique');
    
    if (!this.targetPokemonSprite) return;
    
    // Faire réapparaître le Pokémon avec animation Back.easeOut
    this.targetPokemonSprite.setVisible(true);
    this.targetPokemonSprite.setScale(0.1);
    this.targetPokemonSprite.setAlpha(0.3);
    
    this.battleScene.tweens.add({
      targets: this.targetPokemonSprite,
      scaleX: this.targetPokemonSprite.originalScaleX || 2.8,
      scaleY: this.targetPokemonSprite.originalScaleY || 2.8,
      alpha: 1,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => {
        console.log('✅ [BattleCaptureManager] Pokémon réapparu correctement');
      }
    });
  }
  
  celebrateCaptureAuthentic() {
    console.log('🎊 [BattleCaptureManager] Célébration capture authentique');
    
    if (!this.ballSprite) return;
    
    // Animation de joie de la Ball + rotation authentique
    this.battleScene.tweens.add({
      targets: this.ballSprite,
      y: this.ballSprite.y - 30,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        console.log('✅ [BattleCaptureManager] Célébration terminée');
      }
    });
  }
  
  // === UTILITAIRES ===
  
  showCaptureMessage(message, duration = 2000) {
    console.log(`💬 [BattleCaptureManager] Message: "${message}"`);
    
    // ✅ UTILISER LE SYSTÈME D'ACTION (panel à droite)
    if (this.battleScene.showActionMessage) {
      // Utiliser le système d'action avec debug
      this.battleScene.showActionMessage(message);
    } else if (this.battleScene.showBattleMessage) {
      // Fallback vers le dialogue principal
      this.battleScene.showBattleMessage(message, duration);
    } else {
      // Fallback console si aucun système disponible
      console.log(`📢 [Capture] ${message}`);
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
  
  // === NETTOYAGE COMPLET ET SÉCURISÉ ===
  
  cleanup() {
    console.log('🧹 [BattleCaptureManager] Nettoyage capture COMPLET');
    
    // ✅ ARRÊTER TOUS LES TWEENS LIÉS À LA CAPTURE
    this.stopAllCaptureTweens();
    
    // ✅ SUPPRIMER SPRITE BALL (GRAPHICS)
    if (this.ballSprite) {
      try {
        this.ballSprite.destroy();
        this.ballSprite = null;
        console.log('🎾 [BattleCaptureManager] Ball sprite détruite');
      } catch (error) {
        console.warn('⚠️ [BattleCaptureManager] Erreur destruction Ball:', error);
        this.ballSprite = null;
      }
    }
    
    // ✅ SUPPRIMER TOUS LES EFFETS
    this.captureEffects.forEach((effect, index) => {
      if (effect && effect.destroy) {
        try {
          effect.destroy();
          console.log(`🌟 [BattleCaptureManager] Effet ${index} détruit`);
        } catch (error) {
          console.warn(`⚠️ [BattleCaptureManager] Erreur destruction effet ${index}:`, error);
        }
      }
    });
    this.captureEffects = [];
    
    // ✅ RESTAURER LE POKÉMON CIBLE S'IL ÉTAIT CACHÉ
    if (this.targetPokemonSprite && !this.targetPokemonSprite.visible) {
      this.targetPokemonSprite.setVisible(true);
      this.targetPokemonSprite.setScale(this.targetPokemonSprite.originalScaleX || 2.8);
      this.targetPokemonSprite.setAlpha(1);
      console.log('🐾 [BattleCaptureManager] Pokémon restauré après nettoyage');
    }
    
    // ✅ RESET COMPLET DE L'ÉTAT
    this.isCapturing = false;
    this.currentCaptureData = null;
    this.captureAnimations = [];
    this.currentAnimationIndex = 0;
    this.targetPokemonSprite = null;
    
    // ✅ NETTOYER LES TIMERS SI NÉCESSAIRE
    this.clearCaptureTimers();
    
    console.log('✅ [BattleCaptureManager] Nettoyage COMPLET terminé');
  }
  
  /**
   * Arrête tous les tweens liés à la capture en cours
   */
  stopAllCaptureTweens() {
    try {
      const allTweens = this.battleScene.tweens.getAllTweens();
      let stoppedCount = 0;
      
      allTweens.forEach(tween => {
        // Vérifier si le tween cible la Ball ou des effets de capture
        if (tween.targets && Array.isArray(tween.targets)) {
          const isCaptureTween = tween.targets.some(target => {
            return target === this.ballSprite || 
                   this.captureEffects.includes(target) ||
                   (target && target.texture && target.texture.key && target.texture.key.includes('capture'));
          });
          
          if (isCaptureTween) {
            tween.stop();
            tween.destroy();
            stoppedCount++;
          }
        }
      });
      
      if (stoppedCount > 0) {
        console.log(`🛑 [BattleCaptureManager] ${stoppedCount} tweens de capture arrêtés`);
      }
    } catch (error) {
      console.warn('⚠️ [BattleCaptureManager] Erreur arrêt tweens:', error);
    }
  }
  
  /**
   * Nettoie les timers de capture
   */
  clearCaptureTimers() {
    // Pour les futurs timers si nécessaire
    // (actuellement on utilise setTimeout mais on pourrait les tracker)
  }
  
  /**
   * Méthode de nettoyage d'urgence (publique)
   */
  forceCleanup() {
    console.log('🚨 [BattleCaptureManager] NETTOYAGE FORCÉ !');
    
    // Arrêter immédiatement tout
    this.isCapturing = false;
    
    // Nettoyage agressif
    this.cleanup();
    
    // Vérification finale
    if (this.ballSprite) {
      console.warn('⚠️ [BattleCaptureManager] Ball sprite persistante détectée');
      this.ballSprite = null;
    }
    
    console.log('✅ [BattleCaptureManager] Nettoyage forcé terminé');
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
      isClean: this.isClean(), // ✅ NOUVEAU
      activeTweens: this.battleScene ? this.battleScene.tweens.getAllTweens().length : 0, // ✅ NOUVEAU
      version: 'pokemon_authentique_multilingue_clean_v2' // ✅ MISE À JOUR
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

// === FONCTIONS GLOBALES DE TEST ET DEBUG AMÉLIORÉES ===

window.testCapture = function(ballType = 'poke_ball') {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    // ✅ NETTOYAGE PRÉVENTIF
    battleScene.captureManager.forceCleanup();
    
    battleScene.captureManager.testCapture(ballType);
  } else {
    console.error('❌ BattleScene ou CaptureManager non trouvé');
  }
};

window.testCriticalCapture = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    // ✅ NETTOYAGE PRÉVENTIF
    battleScene.captureManager.forceCleanup();
    
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

// ✅ NOUVELLES FONCTIONS DE DEBUG
window.cleanupCapture = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    battleScene.captureManager.forceCleanup();
    console.log('🧹 Nettoyage forcé effectué');
  }
};

window.captureStatus = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    const status = battleScene.captureManager.getStatus();
    console.log('📊 Status CaptureManager:', status);
    return status;
  }
};

window.resetCaptureManager = function() {
  const battleScene = window.game?.scene?.getScene('BattleScene');
  if (battleScene && battleScene.captureManager) {
    battleScene.captureManager.resetForNewBattle();
    console.log('🔄 CaptureManager reset pour nouveau combat');
  }
};

console.log('✅ [BattleCaptureManager] Chargé avec système de nettoyage avancé !');
console.log('🧪 Tests: window.testCapture(), window.testCriticalCapture()');
console.log('🌍 Langues: window.testCaptureLanguages(), window.setCaptureLanguage("fr|en|es")');
console.log('🔧 Debug: window.cleanupCapture(), window.captureStatus(), window.resetCaptureManager()');

export default BattleCaptureManager;
