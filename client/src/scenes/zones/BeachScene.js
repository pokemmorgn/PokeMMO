// client/src/scenes/zones/BeachScene.js
// MODIFICATION pour intégrer avec PsyduckIntroManager différé

export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'beach');
    this.transitionCooldowns = {};
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
    this._introTriggered = false;
    this.psyduckIntroManager = null;
    this._serverCheckSent = false;
    this._fallbackTimer = null;
    this._roomConnectionTimer = null;
  }

  async create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.psyduckIntroManager = new PsyduckIntroManager(this);

    this.setupBeachEvents();
  }

  // ✅ === ATTENTE CONNEXION ROOM AVEC INTÉGRATION PSYDUCK ===
  waitForRoomConnection() {
    console.log(`🔗 [BeachScene] Attente connexion room...`);
    
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes
    
    this._roomConnectionTimer = this.time.addEvent({
      delay: 100,
      repeat: maxAttempts,
      callback: () => {
        attempts++;
        
        if (this.room) {
          console.log(`✅ [BeachScene] Room connectée après ${attempts * 100}ms`);
          
          // Arrêter le timer
          if (this._roomConnectionTimer) {
            this._roomConnectionTimer.remove();
            this._roomConnectionTimer = null;
          }
          
          // ✅ NOUVEAU: Configurer les listeners dans PsyduckIntroManager
          this.psyduckIntroManager.ensureListenersSetup();
          
          // Configurer les listeners de BeachScene
          this.setupServerListeners();
          
          // Déclencher la vérification d'intro
          this.triggerIntroCheck();
          
        } else if (attempts >= maxAttempts) {
          console.warn(`⚠️ [BeachScene] Timeout connexion room (5s), mode fallback`);
          
          // Arrêter le timer
          if (this._roomConnectionTimer) {
            this._roomConnectionTimer.remove();
            this._roomConnectionTimer = null;
          }
          
          // ✅ NOUVEAU: S'assurer que PsyduckIntroManager est en mode fallback
          this.psyduckIntroManager.ensureListenersSetup();
          
          // Configurer BeachScene en mode fallback
          this.setupServerListeners();
          
          // Déclencher intro fallback
          this.startIntroFallback();
        }
      }
    });
  }

  // ✅ === DÉCLENCHEMENT VÉRIFICATION D'INTRO ===
  triggerIntroCheck() {
    if (this._introTriggered || this._serverCheckSent) {
      console.log(`ℹ️ [BeachScene] Intro déjà déclenchée ou vérification envoyée`);
      return;
    }

    console.log(`🎬 [BeachScene] Déclenchement vérification intro avec room connectée`);
    this._serverCheckSent = true;
    
    if (this.room) {
      console.log(`📤 [BeachScene] Envoi checkAutoIntroQuest avec room valide`);
      this.room.send("checkAutoIntroQuest");
      
      // Timer de fallback si pas de réponse du serveur en 3 secondes
      this._fallbackTimer = this.time.delayedCall(3000, () => {
        if (!this._introTriggered) {
          console.log(`⏰ [BeachScene] Timeout serveur (3s), démarrage intro fallback`);
          this.startIntroFallback();
        }
        this._fallbackTimer = null;
      });
      
    } else {
      console.warn(`⚠️ [BeachScene] Room perdue, démarrage intro fallback`);
      this.startIntroFallback();
    }
  }

  // ✅ === CONFIGURATION ÉCOUTES SERVEUR ===
  setupServerListeners() {
    if (!this.room) {
      console.warn(`⚠️ [BeachScene] Pas de room disponible pour les écoutes serveur`);
      console.log(`ℹ️ [BeachScene] Mode déconnecté: intro fallback disponible`);
      return;
    }

    console.log(`📡 [BeachScene] Configuration écoutes serveur avec room connectée`);

    // ✅ IMPORTANTE: Ne pas écouter triggerIntroSequence ici !
    // C'est PsyduckIntroManager qui l'écoute maintenant

    // Écouter les autres messages de quêtes
    this.room.onMessage("questGranted", (data) => {
      console.log("🎁 [BeachScene] Nouvelle quête reçue:", data);
    });

    this.room.onMessage("introQuestCompleted", (data) => {
      console.log("🎉 [BeachScene] Quête d'intro terminée (BeachScene):", data);
    });

    console.log(`✅ [BeachScene] Écoutes serveur BeachScene configurées`);
  }

  // ✅ === MÉTHODE FALLBACK ===
  startIntroFallback() {
    if (this._introTriggered) {
      console.log(`ℹ️ [BeachScene] Intro déjà déclenchée`);
      return;
    }

    console.log(`🎬 [BeachScene] Démarrage intro en mode fallback (pas de serveur)`);
    this._introTriggered = true;
    
    // ✅ NOUVEAU: Utiliser la méthode fallback du PsyduckIntroManager
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.startIntroFallback();
    }
  }

  // ✅ === POSITION PLAYER AVEC TIMING FIXÉ ===
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    super.positionPlayer(player);

    // ✅ Attendre la connexion room avant de déclencher l'intro
    if (!this._introTriggered && !this._serverCheckSent) {
      console.log(`🎬 [BeachScene] Joueur positionné, attente connexion room pour intro`);
      
      // Délai de base pour s'assurer que le joueur est bien positionné
      this.time.delayedCall(1000, () => {
        this.waitForRoomConnection();
      });
    }
  }

  // ✅ === MÉTHODES EXISTANTES INCHANGÉES ===
  
  update() {
    if (this.shouldBlockInput()) return;
    super.update();
  }

  shouldBlockInput() {
    const globalBlock = typeof window.shouldBlockInput === "function" ? window.shouldBlockInput() : false;
    return globalBlock || this._introBlocked;
  }

  getDefaultSpawnPosition(fromZone) {
    if (fromZone === 'VillageScene' || fromZone) {
      return { x: 52, y: 48 };
    }
    return { x: 360, y: 120 };
  }

  onPlayerPositioned(player, initData) {
    console.log(`[BeachScene] Joueur positionné à (${player.x}, ${player.y})`);
  }

  // ✅ === MÉTHODE D'INTRO PSYDUCK MODIFIÉE ===
  startPsyduckIntro() {
    if (this.psyduckIntroManager) {
      console.log(`🎬 [BeachScene] Démarrage intro Psyduck avec intégration serveur`);
      
      // ✅ NOUVEAU: S'assurer que les listeners sont configurés
      this.psyduckIntroManager.ensureListenersSetup();
      
      this.psyduckIntroManager.startIntro(() => {
        console.log("✅ [BeachScene] Intro Psyduck terminée");
      });
    }
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  triggerStarterSelection() {
    if (window.starterHUD) {
      window.starterHUD.show();
    } else {
      console.warn("⚠️ HUD de starter non initialisé");
    }
  }

  // ✅ === MÉTHODES DE DEBUG AMÉLIORÉES ===
  
  forceStartIntro() {
    console.log(`🧪 [BeachScene] Force start intro (mode test)`);
    if (!this._introTriggered) {
      this._introTriggered = true;
      // ✅ S'assurer que PsyduckIntroManager est prêt
      this.psyduckIntroManager.ensureListenersSetup();
      this.startPsyduckIntro();
    }
  }

  resetIntroState() {
    console.log(`🔄 [BeachScene] Reset intro state`);
    this._introTriggered = false;
    this._serverCheckSent = false;
    
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
    
    if (this._roomConnectionTimer) {
      this._roomConnectionTimer.remove();
      this._roomConnectionTimer = null;
    }
  }

  getIntroStatus() {
    return {
      introTriggered: this._introTriggered,
      serverCheckSent: this._serverCheckSent,
      fallbackTimerActive: this._fallbackTimer !== null,
      roomConnectionTimerActive: this._roomConnectionTimer !== null,
      psyduckManagerReady: this.psyduckIntroManager !== null,
      psyduckManagerStatus: this.psyduckIntroManager?.getStatus(),
      roomConnected: this.room !== null
    };
  }

  debugSceneState() {
    console.log(`🔍 [BeachScene] === DEBUG SCENE STATE ===`);
    console.log(`📊 Intro Status:`, this.getIntroStatus());
    console.log(`🏖️ Beach Events:`, {
      pokemonManagerReady: this.pokemonSpriteManager !== null,
      inputBlocked: this._introBlocked,
      roomConnected: this.room !== null
    });
    
    // ✅ NOUVEAU: Debug du PsyduckIntroManager
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.debugStatus();
    }
    
    console.log(`=======================================`);
  }

  // ✅ === NETTOYAGE AMÉLIORÉ ===
  cleanup() {
    console.log(`🧹 [BeachScene] Nettoyage...`);
    
    // Nettoyer tous les timers
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
    
    if (this._roomConnectionTimer) {
      this._roomConnectionTimer.remove();
      this._roomConnectionTimer = null;
    }
    
    // Nettoyer l'intro manager
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.destroy();
      this.psyduckIntroManager = null;
    }
    
    // Reset des états
    this.transitionCooldowns = {};
    this._introTriggered = false;
    this._serverCheckSent = false;
    
    console.log(`✅ [BeachScene] Nettoyage terminé`);
    
    super.cleanup();
  }

  onDestroy() {
    console.log(`💀 [BeachScene] Destruction de la scène`);
    this.cleanup();
  }

  // === MÉTHODES HÉRITÉES POUR COMPATIBILITÉ (intros classiques) ===
  
  startIntroSequence(player) {
    console.log("🎬 [BeachScene] Démarrage de l'intro animée classique");
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    const spawnX = player.x + 120;
    const arriveX = player.x + 24;
    const y = player.y;
    this.spawnStarterPokemon(spawnX, y, '001_Bulbasaur', 'left', player, arriveX);
  }

  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null, arriveX = null) {
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);
    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);
        this.tweens.add({
          targets: starter,
          x: arriveX ?? (x - 36),
          duration: 2200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
              if (this.anims.exists('walk_right')) player.play('walk_right');
            }
          },
          onComplete: () => {
            starter.play(`${pokemonName}_Walk_left`);
            if (player.anims && this.anims.exists('idle_right')) player.play('idle_right');
            this.showIntroDialogue(starter, player);
          }
        });
      } else {
        this.time.delayedCall(50, trySpawn);
      }
    };
    trySpawn();
  }

  showIntroDialogue(starter, player) {
    const messages = [
      "Salut ! Tu viens d'arriver ?",
      "Parfait ! Je vais t'emmener au village !",
      "Suis-moi !"
    ];
    let messageIndex = 0;
    const showNextMessage = () => {
      if (messageIndex >= messages.length) {
        this.finishIntroSequence(starter, player);
        return;
      }
      const textBox = this.add.text(
        starter.x, starter.y - 32,
        messages[messageIndex],
        {
          fontSize: "13px",
          color: "#fff",
          backgroundColor: "#114",
          padding: { x: 6, y: 4 }
        }
      ).setDepth(1000).setOrigin(0.5);
      messageIndex++;
      this.time.delayedCall(2000, () => {
        textBox.destroy();
        showNextMessage();
      });
    };
    showNextMessage();
  }

  finishIntroSequence(starter, player) {
    this.tweens.add({
      targets: starter,
      y: starter.y - 90,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onStart: () => {
        starter.play(`${starter.texture.key}_up`, true);
      },
      onComplete: () => {
        starter.destroy();
        this.input.keyboard.enabled = true;
        if (player.body) player.body.enable = true;
        this._introBlocked = false;
        if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        console.log("✅ [BeachScene] Intro classique terminée, joueur débloqué");
      }
    });
  }
}
