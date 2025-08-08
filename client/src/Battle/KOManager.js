// client/src/Battle/KOManager.js - Système de KO COMPLÈTEMENT CENTRALISÉ

export class KOManager {
  constructor(battleScene) {
    this.scene = battleScene;
    
    // État du gestionnaire
    this.isProcessingKO = false;
    this.koQueue = [];
    this.currentKOData = null;
    
    // Configuration des timings authentiques Pokémon
    this.timings = {
      criticalPhase: 1500,        // Flash rouge + vibration (plus long)
      faintAnimation: 2000,       // Chute + rotation + cri déformé
      koMessage: 2500,            // Message officiel K.O.
      visualEffects: 800,         // Effets visuels (spirales, poussière)
      healthBarUpdate: 1200,      // Mise à jour barre de vie vers 0
      finalCleanup: 500,          // Nettoyage final
      postKODelay: 1500           // Attente avant suite du combat
    };
    
    // Références aux éléments de la scène
    this.healthBars = null;
    this.pokemonSprites = {
      player: null,
      opponent: null
    };
    
    // Callbacks externes (vers BattleScene)
    this.onKOComplete = null;
    this.onBattleEnd = null;
    
    console.log('💀 [KOManager] Système centralisé initialisé');
  }

  // === ✅ MÉTHODE PRINCIPALE - POINT D'ENTRÉE UNIQUE ===

  /**
   * 🎯 POINT D'ENTRÉE PRINCIPAL - Appelé depuis BattleScene sur événement 'pokemonFainted'
   * @param {object} koData - Données du Pokémon KO
   */
  async handlePokemonKO(koData) {
    console.log('💀 [KOManager] === DÉBUT SÉQUENCE KO ===', koData);
    
    // Validation des données
    if (!koData || !koData.targetRole) {
      console.error('❌ [KOManager] Données KO invalides:', koData);
      return;
    }
    
    // Gestion de la queue si déjà en cours
    if (this.isProcessingKO) {
      console.log('⏳ [KOManager] Ajout à la queue:', koData.pokemonName);
      this.koQueue.push(koData);
      return;
    }
    
    // Démarrer la séquence complète
    this.isProcessingKO = true;
    this.currentKOData = koData;
    
    try {
      // 🎯 SÉQUENCE COMPLÈTE GÉRÉE ICI
      await this.executeCompleteKOSequence(koData);
      
      console.log('✅ [KOManager] Séquence KO terminée avec succès');
      
    } catch (error) {
      console.error('❌ [KOManager] Erreur durant la séquence KO:', error);
    } finally {
      // Nettoyage et gestion de la queue
      this.isProcessingKO = false;
      this.currentKOData = null;
      
      // Traiter le prochain KO en queue
      if (this.koQueue.length > 0) {
        const nextKO = this.koQueue.shift();
        setTimeout(() => {
          this.handlePokemonKO(nextKO);
        }, 500);
      }
    }
  }

  // === SÉQUENCE COMPLÈTE DE KO ===

  /**
   * 🎬 Exécute la séquence complète de KO avec tous les effets
   */
  async executeCompleteKOSequence(koData) {
    const { targetRole, pokemonName } = koData;
    const isMyPokemon = targetRole === 'player1';
    
    console.log(`💀 [KOManager] Séquence pour ${pokemonName} (${isMyPokemon ? 'Joueur' : 'Adversaire'})`);
    
    // 🔍 Récupérer les références nécessaires
    this.updateReferences();
    const targetSprite = this.getTargetSprite(targetRole);
    const targetHealthBar = this.getTargetHealthBar(targetRole);
    
    if (!targetSprite) {
      console.warn('⚠️ [KOManager] Sprite cible non trouvé pour:', targetRole);
      return;
    }
    
    // 🎬 PHASE 1: État critique (HP très bas)
    await this.executeCriticalPhase(targetSprite, targetHealthBar);
    
    // 🎬 PHASE 2: Animation de chute + cri déformé
    await this.executeFaintAnimation(targetSprite, pokemonName, isMyPokemon);
    
    // 🎬 PHASE 3: Mise à jour forcée de la barre de vie
    await this.executeHealthBarKO(targetHealthBar, koData);
    
    // 🎬 PHASE 4: Message officiel K.O.
    await this.executeKOMessage(pokemonName, isMyPokemon);
    
    // 🎬 PHASE 5: Effets visuels finaux
    await this.executeVisualEffects(targetSprite);
    
    // 🎬 PHASE 6: Nettoyage et notification
    await this.executeCleanupAndNotify(koData);
  }

  // === PHASE 1: ÉTAT CRITIQUE ===

  async executeCriticalPhase(targetSprite, targetHealthBar) {
    console.log('🔴 [KOManager] Phase critique...');
    
    return new Promise(resolve => {
      let flashCount = 0;
      const totalFlashes = 8; // Plus de flashs pour plus d'impact
      const originalX = targetSprite.x;
      
      const flashLoop = () => {
        if (flashCount >= totalFlashes) {
          targetSprite.clearTint();
          targetSprite.setX(originalX);
          resolve();
          return;
        }
        
        // Flash rouge intense
        targetSprite.setTint(flashCount % 2 === 0 ? 0xFF0000 : 0xFF6666);
        
        // Vibration plus prononcée
        const shakeIntensity = 12 + (flashCount * 2);
        targetSprite.setX(originalX + (Math.random() - 0.5) * shakeIntensity);
        
        // Effet sur la barre de vie si disponible
        if (targetHealthBar && flashCount % 2 === 0) {
          this.flashHealthBarCritical(targetHealthBar);
        }
        
        flashCount++;
        setTimeout(flashLoop, 150); // Timing plus lent pour plus d'impact
      };
      
      flashLoop();
    });
  }

  flashHealthBarCritical(healthBar) {
    if (!healthBar || !healthBar.container) return;
    
    // Flash rouge sur la barre de vie
    this.scene.tweens.add({
      targets: healthBar.container,
      tint: 0xFF0000,
      duration: 100,
      yoyo: true,
      ease: 'Power2.easeInOut'
    });
  }

  // === PHASE 2: ANIMATION DE CHUTE ===

  async executeFaintAnimation(targetSprite, pokemonName, isMyPokemon) {
    console.log('💔 [KOManager] Animation de chute...');
    
    return new Promise(resolve => {
      const originalY = targetSprite.y;
      const originalX = targetSprite.x;
      const originalScale = targetSprite.scaleX;
      const fallDistance = 80;
      
      // 🔊 Cri déformé du Pokémon
      this.playDistortedCry(pokemonName);
      
      // 🎬 Animation de chute avec rotation
      this.scene.tweens.add({
        targets: targetSprite,
        y: originalY + fallDistance,
        x: originalX + (isMyPokemon ? -20 : 20), // Légère dérive
        scaleX: originalScale * 0.7,
        scaleY: originalScale * 0.7,
        alpha: 0.2,
        angle: isMyPokemon ? -35 : 35, // Rotation selon le côté
        duration: this.timings.faintAnimation,
        ease: 'Power2.easeIn',
        onUpdate: (tween) => {
          // Effet de désaturation progressive
          const progress = tween.progress;
          const grayValue = progress * 0.8;
          
          // Appliquer un filtre gris progressif
          targetSprite.setTint(this.interpolateToGray(0xFFFFFF, grayValue));
        },
        onComplete: () => {
          // 👁️ Effet yeux spiralés
          this.createSpiralEyesEffect(targetSprite.x, targetSprite.y - 30);
          
          // 💨 Nuage de poussière à l'impact
          setTimeout(() => {
            this.createDustCloudEffect(targetSprite.x, originalY + fallDistance + 10);
          }, 200);
          
          resolve();
        }
      });
    });
  }

  // === PHASE 3: MISE À JOUR BARRE DE VIE ===

  async executeHealthBarKO(targetHealthBar, koData) {
    console.log('💖 [KOManager] Mise à jour barre de vie KO...');
    
    if (!targetHealthBar) {
      console.warn('⚠️ [KOManager] Barre de vie non trouvée');
      return;
    }
    
    return new Promise(resolve => {
      // Forcer la mise à jour de la barre de vie avec les bonnes données
      const pokemonData = {
        name: koData.pokemonName || 'Pokémon',
        currentHp: 0, // ✅ FORCÉ À 0
        maxHp: koData.maxHp || 100,
        level: koData.level || 5,
        statusCondition: 'ko' // ✅ STATUT KO
      };
      
      // Appeler directement la méthode de BattleScene avec des données cohérentes
      if (this.scene.updateModernHealthBar) {
        const targetRole = koData.targetRole === 'player1' ? 'player1' : 'player2';
        this.scene.updateModernHealthBar(targetRole, pokemonData);
      }
      
      setTimeout(resolve, this.timings.healthBarUpdate);
    });
  }

  // === PHASE 4: MESSAGE KO ===

  async executeKOMessage(pokemonName, isMyPokemon) {
    console.log('💬 [KOManager] Message K.O...');
    
    return new Promise(resolve => {
      const koMessage = isMyPokemon 
        ? `${pokemonName} est K.O. !`
        : `${pokemonName} ennemi est K.O. !`;
      
      // Afficher via BattleScene
      if (this.scene.showNarrativeMessage) {
        this.scene.showNarrativeMessage(koMessage, true);
      }
      
      // Son de KO si disponible
      if (this.scene.sound && this.scene.sound.get('pokemon_faint')) {
        this.scene.sound.play('pokemon_faint', { volume: 0.7 });
      }
      
      setTimeout(resolve, this.timings.koMessage);
    });
  }

  // === PHASE 5: EFFETS VISUELS FINAUX ===

  async executeVisualEffects(targetSprite) {
    console.log('✨ [KOManager] Effets visuels finaux...');
    
    return new Promise(resolve => {
      // Faire disparaître le sprite progressivement
      this.scene.tweens.add({
        targets: targetSprite,
        alpha: 0,
        scaleX: targetSprite.scaleX * 0.3,
        scaleY: targetSprite.scaleY * 0.3,
        duration: this.timings.visualEffects,
        ease: 'Power2.easeOut',
        onComplete: () => {
          targetSprite.setVisible(false);
          resolve();
        }
      });
    });
  }

  // === PHASE 6: NETTOYAGE ET NOTIFICATION ===

  async executeCleanupAndNotify(koData) {
    console.log('🧹 [KOManager] Nettoyage et notification...');
    
    return new Promise(resolve => {
      // Mettre à jour l'état local du Pokémon dans BattleScene
      this.updateLocalPokemonState(koData);
      
      // Notifier BattleScene que la séquence est terminée
      if (this.onKOComplete) {
        this.onKOComplete(koData);
      }
      
      // Émettre l'événement pour BattleScene
      if (this.scene.events) {
        this.scene.events.emit('koSequenceComplete', {
          targetRole: koData.targetRole,
          pokemonName: koData.pokemonName,
          timestamp: Date.now()
        });
      }
      
      setTimeout(resolve, this.timings.finalCleanup);
    });
  }

  // === EFFETS VISUELS SPÉCIALISÉS ===

  createSpiralEyesEffect(x, y) {
    for (let i = 0; i < 2; i++) {
      const spiral = this.scene.add.text(
        x + (i === 0 ? -25 : 25), 
        y,
        '@',
        {
          fontSize: '28px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: '#666666',
          fontWeight: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      
      spiral.setOrigin(0.5);
      spiral.setDepth(100);
      
      // Animation de rotation spirale
      this.scene.tweens.add({
        targets: spiral,
        rotation: Math.PI * 8, // Plus de rotations
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 2500,
        ease: 'Power2.easeOut',
        onComplete: () => spiral.destroy()
      });
    }
  }

  createDustCloudEffect(x, y) {
    // Nuage de poussière plus réaliste
    const dustCloud = this.scene.add.graphics();
    dustCloud.setPosition(x, y);
    dustCloud.setDepth(30);
    
    // Plusieurs couches de poussière
    const dustColors = [0xCCCCCC, 0xAAAAAA, 0x888888];
    const dustSizes = [50, 35, 20];
    
    dustColors.forEach((color, index) => {
      const size = dustSizes[index];
      dustCloud.fillStyle(color, 0.6 - index * 0.1);
      dustCloud.fillEllipse(0, -index * 3, size, size * 0.6);
    });
    
    // Animation d'expansion et de disparition
    this.scene.tweens.add({
      targets: dustCloud,
      scaleX: 3.0,
      scaleY: 2.0,
      alpha: 0,
      y: y - 20,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => dustCloud.destroy()
    });
    
    // Particules de poussière individuelles
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.createDustParticle(x, y);
      }, i * 100);
    }
  }

  createDustParticle(baseX, baseY) {
    const particle = this.scene.add.graphics();
    const x = baseX + (Math.random() - 0.5) * 60;
    const y = baseY + (Math.random() - 0.5) * 20;
    
    particle.setPosition(x, y);
    particle.setDepth(35);
    
    particle.fillStyle(0x999999, 0.8);
    particle.fillCircle(0, 0, 2 + Math.random() * 3);
    
    this.scene.tweens.add({
      targets: particle,
      x: x + (Math.random() - 0.5) * 40,
      y: y - 30 - Math.random() * 20,
      alpha: 0,
      duration: 800 + Math.random() * 400,
      ease: 'Power2.easeOut',
      onComplete: () => particle.destroy()
    });
  }

  playDistortedCry(pokemonName) {
    // Cartographie des cris par nom
    const pokemonCries = {
      'Bulbasaur': 'cry_001',
      'Charmander': 'cry_004', 
      'Squirtle': 'cry_007',
      'Pikachu': 'cry_025'
    };
    
    const cryKey = pokemonCries[pokemonName] || 'cry_generic';
    
    if (this.scene.sound && this.scene.sound.get(cryKey)) {
      // Cri déformé (pitch plus bas, volume réduit)
      this.scene.sound.play(cryKey, { 
        volume: 0.4, 
        rate: 0.6, // Pitch plus grave
        delay: 0.2
      });
    }
  }

  // === MÉTHODES UTILITAIRES ===

  updateReferences() {
    // Mettre à jour les références aux sprites et barres de vie
    if (this.scene.playerPokemonSprite) {
      this.pokemonSprites.player = this.scene.playerPokemonSprite;
    }
    if (this.scene.opponentPokemonSprite) {
      this.pokemonSprites.opponent = this.scene.opponentPokemonSprite;
    }
    if (this.scene.modernHealthBars) {
      this.healthBars = this.scene.modernHealthBars;
    }
  }

  getTargetSprite(targetRole) {
    if (targetRole === 'player1') {
      return this.pokemonSprites.player || this.scene.playerPokemonSprite;
    } else if (targetRole === 'player2') {
      return this.pokemonSprites.opponent || this.scene.opponentPokemonSprite;
    }
    return null;
  }

  getTargetHealthBar(targetRole) {
    if (!this.healthBars) return null;
    
    if (targetRole === 'player1') {
      return this.healthBars.player1;
    } else if (targetRole === 'player2') {
      return this.healthBars.player2;
    }
    return null;
  }

  updateLocalPokemonState(koData) {
    // Mettre à jour l'état local des Pokémon dans BattleScene
    if (koData.targetRole === 'player1' && this.scene.currentPlayerPokemon) {
      this.scene.currentPlayerPokemon.currentHp = 0;
      this.scene.currentPlayerPokemon.statusCondition = 'ko';
    } else if (koData.targetRole === 'player2' && this.scene.currentOpponentPokemon) {
      this.scene.currentOpponentPokemon.currentHp = 0;
      this.scene.currentOpponentPokemon.statusCondition = 'ko';
    }
  }

  interpolateToGray(originalColor, grayFactor) {
    // Convertir progressivement vers le gris
    const r = 255;
    const g = 255;
    const b = 255;
    
    const grayValue = Math.floor(128 + (127 * (1 - grayFactor)));
    
    const newR = Math.floor(r * (1 - grayFactor) + grayValue * grayFactor);
    const newG = Math.floor(g * (1 - grayFactor) + grayValue * grayFactor);
    const newB = Math.floor(b * (1 - grayFactor) + grayValue * grayFactor);
    
    return (newR << 16) | (newG << 8) | newB;
  }

  // === GESTION FIN DE COMBAT ===

  async handleBattleEnd(battleEndData) {
    console.log('🏁 [KOManager] Gestion fin de combat:', battleEndData);
    
    const { winner, reason, koVictory } = battleEndData;
    const isVictory = winner === 'player1';
    
    if (koVictory && isVictory) {
      await this.playVictorySequence(battleEndData);
    } else if (winner === 'player2' || winner === 'opponent') {
      await this.playDefeatSequence(battleEndData);
    } else {
      // Afficher le message par défaut
      if (this.scene.showNarrativeMessage) {
        this.scene.showNarrativeMessage(battleEndData.message || 'Combat terminé', true);
      }
    }
    
    // Programmer la fin du combat
    const delay = isVictory ? 6000 : 4000;
    setTimeout(() => {
      if (this.onBattleEnd) {
        this.onBattleEnd(battleEndData);
      } else if (this.scene.endBattle) {
        this.scene.endBattle({
          result: winner,
          reason,
          koVictory
        });
      }
    }, delay);
  }

  async playVictorySequence(battleEndData) {
    console.log('🎉 [KOManager] Séquence de victoire...');
    
    // Message de victoire
    if (this.scene.showNarrativeMessage) {
      this.scene.showNarrativeMessage(
        battleEndData.message || 'Vous avez gagné !', 
        true
      );
    }
    
    // Musique de victoire
    if (this.scene.sound && this.scene.sound.get('victory_theme')) {
      this.scene.sound.play('victory_theme', { volume: 0.8 });
    }
    
    // Effets visuels de victoire
    this.createVictoryEffects();
    
    // Afficher les récompenses si disponibles
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    if (battleEndData.rewards || this.scene.currentOpponentPokemon) {
      await this.showBattleRewards(battleEndData);
    }
  }

  async playDefeatSequence(battleEndData) {
    console.log('💀 [KOManager] Séquence de défaite...');
    
    // Message de défaite
    if (this.scene.showNarrativeMessage) {
      this.scene.showNarrativeMessage(
        battleEndData.message || 'Tous vos Pokémon sont K.O. !', 
        true
      );
    }
    
    // Overlay sombre progressif
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    overlay.setDepth(1000);
    
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.8,
      duration: 3000,
      ease: 'Power2.easeIn'
    });
    
    await new Promise(resolve => setTimeout(resolve, 3500));
  }

  createVictoryEffects() {
    const { width, height } = this.scene.cameras.main;
    
    // Confettis
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const confetti = this.scene.add.text(
          Math.random() * width, 
          -30, 
          ['✦', '◆', '▲', '●', '★'][Math.floor(Math.random() * 5)], 
          { 
            fontSize: '24px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)],
            fontWeight: 'bold'
          }
        );
        confetti.setDepth(200);
        
        this.scene.tweens.add({
          targets: confetti,
          y: height + 50,
          x: confetti.x + (Math.random() - 0.5) * 150,
          rotation: Math.PI * 6,
          alpha: 0,
          scaleX: 2.5,
          scaleY: 2.5,
          duration: 5000,
          ease: 'Power2.easeIn',
          onComplete: () => confetti.destroy()
        });
      }, i * 300);
    }
  }

  async showBattleRewards(battleEndData) {
    console.log('🎁 [KOManager] Affichage des récompenses...');
    
    const rewards = battleEndData.rewards || this.calculateDefaultRewards();
    
    if (rewards.experience > 0) {
      await this.showExperienceGain(rewards.experience);
    }
    
    if (rewards.money > 0) {
      await this.showMoneyGain(rewards.money);
    }
    
    if (rewards.items && rewards.items.length > 0) {
      await this.showItemsFound(rewards.items);
    }
  }

  async showExperienceGain(exp) {
    if (this.scene.showNarrativeMessage) {
      const pokemonName = this.scene.currentPlayerPokemon?.name || 'Votre Pokémon';
      this.scene.showNarrativeMessage(
        `${pokemonName} gagne ${exp} points d'expérience !`, 
        true
      );
    }
    
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  async showMoneyGain(money) {
    if (this.scene.showNarrativeMessage) {
      this.scene.showNarrativeMessage(`Vous trouvez ${money} ¥ !`, true);
    }
    
    // Effet de pièces qui tombent
    this.createCoinRainEffect(money);
    
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  createCoinRainEffect(amount) {
    const coinCount = Math.min(10, Math.floor(amount / 10));
    
    for (let i = 0; i < coinCount; i++) {
      setTimeout(() => {
        const coin = this.scene.add.text(
          Math.random() * this.scene.cameras.main.width,
          -20,
          '¥',
          {
            fontSize: '32px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: '#FFD700',
            fontWeight: 'bold',
            stroke: '#B8860B',
            strokeThickness: 2
          }
        );
        
        coin.setDepth(150);
        
        this.scene.tweens.add({
          targets: coin,
          y: this.scene.cameras.main.height + 50,
          rotation: Math.PI * 4,
          alpha: 0.7,
          duration: 2500 + Math.random() * 1000,
          ease: 'Power2.easeIn',
          onComplete: () => coin.destroy()
        });
      }, i * 150);
    }
  }

  calculateDefaultRewards() {
    const opponentLevel = this.scene.currentOpponentPokemon?.level || 5;
    const playerLevel = this.scene.currentPlayerPokemon?.level || 5;
    
    const levelDiff = Math.max(1, opponentLevel - playerLevel + 5);
    const baseExp = opponentLevel * 18;
    const finalExp = Math.floor(baseExp * (levelDiff / 10));
    
    return {
      experience: finalExp,
      money: Math.floor(opponentLevel * 25 + Math.random() * 75),
      items: Math.random() > 0.7 ? [{ name: 'Potion', quantity: 1 }] : []
    };
  }

  // === CALLBACKS EXTERNES ===

  /**
   * 🎯 Définir un callback pour la fin de séquence KO
   */
  setOnKOComplete(callback) {
    this.onKOComplete = callback;
  }

  /**
   * 🎯 Définir un callback pour la fin de combat
   */
  setOnBattleEnd(callback) {
    this.onBattleEnd = callback;
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * 🎯 Vérifier si une séquence KO est en cours
   */
  isKOInProgress() {
    return this.isProcessingKO;
  }

  /**
   * 🎯 Obtenir les données du KO en cours
   */
  getCurrentKOData() {
    return this.currentKOData;
  }

  /**
   * 🎯 Forcer l'arrêt de toute séquence KO
   */
  forceStopKO() {
    console.log('🛑 [KOManager] Arrêt forcé de la séquence KO');
    this.isProcessingKO = false;
    this.currentKOData = null;
    this.koQueue = [];
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [KOManager] Destruction...');
    
    this.forceStopKO();
    
    // Nettoyer les références
    this.scene = null;
    this.healthBars = null;
    this.pokemonSprites = { player: null, opponent: null };
    this.onKOComplete = null;
    this.onBattleEnd = null;
    
    console.log('✅ [KOManager] Détruit');
  }
}

// === ✅ FONCTIONS D'ASSISTANCE POUR BATTLESCENE ===

/**
 * 🎯 Fonction helper pour faciliter l'intégration dans BattleScene
 * Usage: this.koManager = createKOManager(this);
 */
export function createKOManager(battleScene) {
  return new KOManager(battleScene);
}

/**
 * 🎯 Fonction helper pour configurer les événements automatiquement
 * Usage: setupKOManagerEvents(this.koManager, this.battleNetworkHandler);
 */
export function setupKOManagerEvents(koManager, battleNetworkHandler) {
  if (!koManager || !battleNetworkHandler) {
    console.warn('⚠️ [setupKOManagerEvents] Paramètres manquants');
    return;
  }
  
  console.log('📡 [setupKOManagerEvents] Configuration des événements KO...');
  
  // Event principal : pokemonFainted -> KOManager
  battleNetworkHandler.on('pokemonFainted', (data) => {
    console.log('💀 [EVENT] pokemonFainted -> KOManager');
    koManager.handlePokemonKO(data);
  });
  
  // Event secondaire : battleEnd -> KOManager
  battleNetworkHandler.on('battleEnd', (data) => {
    console.log('🏁 [EVENT] battleEnd -> KOManager');
    koManager.handleBattleEnd(data);
  });
  
  console.log('✅ [setupKOManagerEvents] Événements configurés');
}

console.log('💀 [KOManager] Système centralisé chargé');
console.log('🎯 Usage simple:');
console.log('   const koManager = createKOManager(this);');
console.log('   setupKOManagerEvents(koManager, networkHandler);');
console.log('   koManager.handlePokemonKO(koData); // Point d\'entrée unique');
