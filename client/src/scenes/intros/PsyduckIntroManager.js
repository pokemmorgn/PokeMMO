// client/src/scenes/intros/PsyduckIntroManager.js
// Manages Psyduck intro sequence with sequential dialogue system
// ✅ FIX COMPLET: Attendre window.playerReady et fermeture LoadingScreen

export class PsyduckIntroManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.psyduck = null;
    this.onCompleteCallback = null;
    this.questIntegrationEnabled = false;
    this.fallbackMode = false;
    this.listenersSetup = false;
  }

  // === SERVER LISTENERS SETUP ===

  setupServerListenersWhenReady() {
    if (this.listenersSetup) return;

    if (!this.scene.room) {
      this.fallbackMode = true;
      this.listenersSetup = true;
      return;
    }

    this.setupServerListeners();
  }

  setupServerListeners() {
    if (this.listenersSetup || !this.scene.room) {
      this.fallbackMode = true;
      this.listenersSetup = true;
      return;
    }

    try {
      this.scene.room.onMessage("triggerIntroSequence", (data) => {
        if (data.shouldStartIntro && !this.isPlaying) {
          this.questIntegrationEnabled = true;
          this.fallbackMode = false;
          
          this.scene.time.delayedCall(500, () => {
            this.startIntro(() => {
              if (this.questIntegrationEnabled) {
                this.notifyServer("intro_completed");
              }
            });
          });
        } else if (data.shouldStartIntro && this.isPlaying) {
          this.upgradeToServerMode();
        }
      });
      
      this.scene.room.onMessage("questGranted", (data) => {
        // Quest notifications handled elsewhere
      });
      
      this.scene.room.onMessage("introQuestCompleted", (data) => {
        this.showQuestCompletionMessage(data.message);
      });

      this.listenersSetup = true;
    } catch (error) {
      console.error(`[PsyduckIntro] Error setting up listeners:`, error);
      this.fallbackMode = true;
      this.listenersSetup = true;
    }
  }

  ensureListenersSetup() {
    this.setupServerListenersWhenReady();
  }

  upgradeToServerMode() {
    if (this.listenersSetup && !this.fallbackMode) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }
    
    if (this.scene.room) {
      this.fallbackMode = false;
      this.questIntegrationEnabled = true;
    }
  }

  // === INTRO CONTROL ===

  startIntroFallback() {
    if (this.isPlaying) return;

    this.questIntegrationEnabled = false;
    this.fallbackMode = true;
    this.listenersSetup = true;
    
    this.startIntro(() => {
      console.log("Intro completed in fallback mode");
    });
  }

  // ✅ FIX: Attendre VRAIMENT que tout soit prêt
  async startIntro(onComplete = null) {
    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }

    this.isPlaying = true;
    this.onCompleteCallback = onComplete;

    console.log('[PsyduckIntro] === DÉMARRAGE INTRO - VÉRIFICATIONS ===');

    // ✅ ÉTAPE 1: Attendre que le LoadingScreen soit fermé
    const loadingClosed = await this.waitForLoadingScreenClosed(10000);
    if (!loadingClosed) {
      console.warn('[PsyduckIntro] LoadingScreen pas fermé après 10s, continue quand même');
    }

    // ✅ ÉTAPE 2: Attendre que le flag global playerReady soit true
    const playerReady = await this.waitForPlayerReady(8000);
    if (!playerReady) {
      console.warn('[PsyduckIntro] Flag playerReady pas prêt après 8s, annulation intro');
      this.cleanup();
      return;
    }

    // ✅ ÉTAPE 3: Vérifier que l'objet joueur existe et est valide
    const playerObject = await this.waitForValidPlayerObject(3000);
    if (!playerObject) {
      console.warn('[PsyduckIntro] Objet joueur pas valide après 3s, annulation intro');
      this.cleanup();
      return;
    }

        // ✅ NOUVEAU: DÉLAI DE 2 SECONDES avant démarrage
    console.log('[PsyduckIntro] ⏳ Attente 2 secondes supplémentaires...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[PsyduckIntro] ✅ Toutes les vérifications passées, démarrage intro');
    
    // ✅ ÉTAPE 4: Bloquer les inputs et charger Psyduck
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();

    // ✅ ÉTAPE 5: Délai final avant spawn Psyduck
    this.scene.time.delayedCall(800, () => {
      this.spawnPsyduck();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Attendre fermeture LoadingScreen
  waitForLoadingScreenClosed(maxWaitTime = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();
      
      const check = () => {
        // ✅ Vérifier le flag global loadingScreenClosed
        if (typeof window !== "undefined" && window.loadingScreenClosed === true) {
          console.log('[PsyduckIntro] ✅ LoadingScreen fermé détecté');
          return resolve(true);
        }
        
        // ✅ Fallback: vérifier s'il n'y a pas d'overlay visible
        const loadingOverlay = document.querySelector('.loading-screen-overlay');
        if (!loadingOverlay || !loadingOverlay.classList.contains('visible')) {
          console.log('[PsyduckIntro] ✅ Pas d\'overlay LoadingScreen visible');
          return resolve(true);
        }
        
        if (Date.now() - start > maxWaitTime) {
          console.warn('[PsyduckIntro] ⏰ Timeout attente fermeture LoadingScreen');
          return resolve(false);
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  // ✅ MÉTHODE MODIFIÉE: Attendre le flag playerReady global
  waitForPlayerReady(maxWaitTime = 8000) {
    return new Promise(resolve => {
      const start = Date.now();

      const check = () => {
        // ✅ PRIORITÉ 1: Flag global playerReady
        if (typeof window !== "undefined" && window.playerReady === true) {
          console.log('[PsyduckIntro] ✅ Flag window.playerReady détecté');
          return resolve(true);
        }

        // ✅ PRIORITÉ 2: Flag playerSpawned + loadingScreenClosed
        if (typeof window !== "undefined" && 
            window.playerSpawned === true && 
            window.loadingScreenClosed === true) {
          console.log('[PsyduckIntro] ✅ Flags playerSpawned + loadingScreenClosed détectés');
          window.playerReady = true; // Marquer comme prêt
          return resolve(true);
        }

        // ✅ Timeout
        if (Date.now() - start > maxWaitTime) {
          console.warn('[PsyduckIntro] ⏰ Timeout attente playerReady');
          return resolve(false);
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Attendre objet joueur valide
waitForValidPlayerObject(maxWaitTime = 1000) {
  return new Promise(resolve => {
    // ✅ Si tous les flags sont OK, on fait confiance
    if (window.playerReady && window.playerSpawned && window.loadingScreenClosed) {
      console.log('[PsyduckIntro] ✅ Tous les flags OK, joueur considéré valide');
      return resolve(true);
    }
    
    // ✅ Sinon, vérification rapide
    const scene = this.scene;
    const myPlayer = scene?.playerManager?.getMyPlayer?.();
    
    if (myPlayer && myPlayer.x !== undefined && myPlayer.y !== undefined) {
      console.log('[PsyduckIntro] ✅ Joueur trouvé avec position valide');
      return resolve(true);
    }
    
    // ✅ Timeout court
    setTimeout(() => {
      console.log('[PsyduckIntro] ✅ Timeout court écoulé, on continue');
      resolve(true);
    }, maxWaitTime);
  });
}

  notifyServer(step) {
    if (!this.questIntegrationEnabled || !this.scene.room || this.fallbackMode) {
      return;
    }

    try {
      this.scene.room.send("progressIntroQuest", { step: step });
    } catch (error) {
      console.error(`[PsyduckIntro] Server notification error:`, error);
      this.fallbackMode = true;
      this.questIntegrationEnabled = false;
    }
  }

  showQuestCompletionMessage(message) {
    if (!this.scene || !this.scene.add) return;

    try {
      const text = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2,
        message,
        {
          fontSize: "18px",
          color: "#00ff00",
          backgroundColor: "#000000",
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5).setDepth(2000);
      
      this.scene.time.delayedCall(3000, () => {
        if (text && text.scene) {
          this.scene.tweens.add({
            targets: text,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              if (text && text.destroy) {
                text.destroy();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error(`[PsyduckIntro] Error displaying message:`, error);
    }
  }

  // === PSYDUCK SETUP ===
  
  loadPsyduckSpritesheet() {
    const key = 'psyduck_walk';
    
    if (!this.scene.textures.exists(key)) {
      try {
        this.scene.load.spritesheet(key, 'assets/pokemon/054_psyduck/Walk-Anim.png', {
          frameWidth: 24,
          frameHeight: 40
        });
        
        this.scene.load.once('complete', () => {
          this.createPsyduckAnimations();
        });
        
        this.scene.load.start();
      } catch (error) {
        console.error(`[PsyduckIntro] Error loading spritesheet:`, error);
      }
    } else {
      this.createPsyduckAnimations();
    }
  }

  createPsyduckAnimations() {
    if (!this.scene || !this.scene.anims) return;

    const anims = this.scene.anims;
    const key = 'psyduck_walk';
    
    try {
      if (!anims.exists('psyduck_walk_right')) {
        anims.create({
          key: 'psyduck_walk_right',
          frames: [
            { key, frame: 8 }, { key, frame: 9 },
            { key, frame: 10 }, { key, frame: 11 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }

      if (!anims.exists('psyduck_walk_up')) {
        anims.create({
          key: 'psyduck_walk_up',
          frames: [
            { key, frame: 16 }, { key, frame: 17 },
            { key, frame: 18 }, { key, frame: 19 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }

      if (!anims.exists('psyduck_walk_left')) {
        anims.create({
          key: 'psyduck_walk_left',
          frames: [
            { key, frame: 24 }, { key, frame: 25 },
            { key, frame: 26 }, { key, frame: 27 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }
      
      if (!anims.exists('psyduck_walk_down')) {
        anims.create({
          key: 'psyduck_walk_down',
          frames: [
            { key, frame: 0 }, { key, frame: 1 },
            { key, frame: 2 }, { key, frame: 3 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }
    } catch (error) {
      console.error(`[PsyduckIntro] Error creating animations:`, error);
    }
  }

  // === INTRO PHASES ===

  spawnPsyduck() {
    if (!this.scene || !this.scene.add) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🦆 Spawn de Psyduck...');
      this.psyduck = this.scene.add.sprite(160, 32, 'psyduck_walk', 8)
        .setOrigin(0.5, 1)
        .setDepth(6);
      
      this.startPhase1_WalkRight();
    } catch (error) {
      console.error(`[PsyduckIntro] Error spawning Psyduck:`, error);
      this.cleanup();
    }
  }

  startPhase1_WalkRight() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🚶 Phase 1: Marche vers la droite');
      this.psyduck.anims.play('psyduck_walk_right');
      
      this.scene.tweens.add({
        targets: this.psyduck,
        x: 360,
        duration: 3000,
        ease: 'Linear',
        onUpdate: () => {
          if (this.psyduck && this.psyduck.anims && !this.psyduck.anims.isPlaying) {
            this.psyduck.anims.play('psyduck_walk_right');
          }
        },
        onComplete: () => {
          this.startPhase2_WalkDown();
        }
      });
    } catch (error) {
      console.error(`[PsyduckIntro] Error in phase 1:`, error);
      this.cleanup();
    }
  }

  startPhase2_WalkDown() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] ⬇️ Phase 2: Marche vers le bas');
      this.psyduck.anims.play('psyduck_walk_down');
      
      this.scene.tweens.add({
        targets: this.psyduck,
        y: 90,
        duration: 2500,
        ease: 'Linear',
        onUpdate: () => {
          if (this.psyduck && this.psyduck.anims && !this.psyduck.anims.isPlaying) {
            this.psyduck.anims.play('psyduck_walk_down');
          }
        },
        onComplete: () => {
          this.startPhase3_Interaction();
        }
      });
    } catch (error) {
      console.error(`[PsyduckIntro] Error in phase 2:`, error);
      this.cleanup();
    }
  }

  startPhase3_Interaction() {
    if (!this.psyduck) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 💬 Phase 3: Interaction et dialogue');
      this.psyduck.anims.stop();
      this.psyduck.setFrame(0);
      this.notifyServer("intro_watched");
      this.notifyServer("psyduck_talked");
      
      this.showDialogue([
        { text: "Psy? Psy... duck?", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "The yellow duck-like creature tilts its head, looking confused", speaker: "Narrator", hideName: true },
        { text: "It holds its head with both hands... seems to have a headache", speaker: "Narrator", hideName: true },
        { text: "Psy... psy duck? Psy?", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "Despite its confusion, it points toward some buildings in the distance", speaker: "Narrator", hideName: true },
        { text: "Maybe it's trying to tell you something about that place?", speaker: "Narrator", hideName: true }
      ]);

    } catch (error) {
      console.error(`[PsyduckIntro] Error in phase 3:`, error);
      this.cleanup();
    }
  }

  // === DIALOGUE SYSTEM ===

  async showDialogue(messages) {
    if (!messages || messages.length === 0) {
      console.error(`[PsyduckIntro] No messages to display`);
      this.finishIntro();
      return;
    }

    try {
      const apiAvailable = await this.waitForSequentialAPI(5000);
      
      if (!apiAvailable) {
        this.fallbackToConsole(messages);
        return;
      }

      const success = await window.createSequentialDiscussion(
        "???", 
        "/assets/portrait/psyduckPortrait.png", 
        messages, 
        {
          showProgress: true,
          narratorName: "Narrator",
          narratorPortrait: "/assets/portrait/systemPortrait.png",
          hideName: true,
          onComplete: () => {
            this.finishIntro();
          }
        }
      );
      
      if (!success) {
        this.fallbackToConsole(messages);
      }
      
    } catch (error) {
      console.error(`[PsyduckIntro] Dialogue error:`, error);
      this.fallbackToConsole(messages);
    }
  }

  waitForSequentialAPI(maxWaitTime = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkAPI = () => {
        if (typeof window.createSequentialDiscussion === 'function') {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= maxWaitTime) {
          resolve(false);
          return;
        }
        
        setTimeout(checkAPI, 100);
      };
      
      checkAPI();
    });
  }

  fallbackToConsole(messages) {
    console.log(`[PsyduckIntro] === PSYDUCK MESSAGES (Fallback) ===`);
    messages.forEach((msg, i) => {
      if (typeof msg === 'string') {
        console.log(`  ${i + 1}. ${msg}`);
      } else {
        console.log(`  ${i + 1}. [${msg.speaker || 'Unknown'}] ${msg.text}`);
      }
    });
    console.log(`===============================================`);
    
    setTimeout(() => {
      this.finishIntro();
    }, 2000);
  }

  // === INTRO COMPLETION ===

  finishIntro() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🔚 Fin de l\'intro - retour de Psyduck');
      
      // Return to top
      this.psyduck.anims.play('psyduck_walk_up');
      
      this.scene.tweens.add({
        targets: this.psyduck,
        y: 32,
        duration: 2500,
        ease: 'Linear',
        onComplete: () => {
          if (!this.psyduck || !this.scene) {
            this.cleanup();
            return;
          }
          
          // Return to left
          this.psyduck.anims.play('psyduck_walk_left');
          
          this.scene.tweens.add({
            targets: this.psyduck,
            x: 160,
            duration: 3000,
            ease: 'Linear',
            onComplete: () => {
              if (!this.psyduck || !this.scene) {
                this.cleanup();
                return;
              }
              
              // Fade out
              this.scene.tweens.add({
                targets: this.psyduck,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                  if (this.psyduck && this.psyduck.destroy) {
                    this.psyduck.destroy();
                  }
                  this.psyduck = null;

                  this.cleanup();
                  
                  if (this.scene.room) {
                    this.scene.room.send("progressIntroQuest", {
                      step: "intro_watched",
                      playerName: this.scene.playerManager?.getMyPlayer()?.name || "unknown"
                    });
                  }
                }
              });
            }
          });
        }
      });
    } catch (error) {
      console.error(`[PsyduckIntro] Error finishing intro:`, error);
      this.cleanup();
    }
  }

  cleanup() {
    try {
      console.log('[PsyduckIntro] 🧹 Nettoyage intro...');
      this.isPlaying = false;
      this.unblockPlayerInputs();
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
    } catch (error) {
      console.error(`[PsyduckIntro] Cleanup error:`, error);
    }
  }

  // === INPUT CONTROL ===

  blockPlayerInputs() {
    if (!this.scene) return;

    try {
      console.log('[PsyduckIntro] 🔒 Blocage des inputs joueur');
      
      if (this.scene.input && this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = false;
      }
      
      const myPlayer = this.scene.playerManager?.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.enable = false;
      }
      
      this.scene._introBlocked = true;
    } catch (error) {
      console.error(`[PsyduckIntro] Error blocking inputs:`, error);
    }
  }

  unblockPlayerInputs() {
    if (!this.scene) return;

    try {
      console.log('[PsyduckIntro] 🔓 Déblocage des inputs joueur');
      
      if (this.scene.input && this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = true;
      }
      
      const myPlayer = this.scene.playerManager?.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.enable = true;
      }
      
      this.scene._introBlocked = false;
    } catch (error) {
      console.error(`[PsyduckIntro] Error unblocking inputs:`, error);
    }
  }

  // === UTILITY METHODS ===

  forceStop() {
    if (!this.isPlaying) return;
    
    try {
      console.log('[PsyduckIntro] 🛑 Arrêt forcé de l\'intro');
      
      if (this.psyduck) {
        if (this.psyduck.destroy) {
          this.psyduck.destroy();
        }
        this.psyduck = null;
      }
      
      this.cleanup();
    } catch (error) {
      console.error(`[PsyduckIntro] Force stop error:`, error);
      this.isPlaying = false;
      this.psyduck = null;
      this.unblockPlayerInputs();
    }
  }

  isIntroPlaying() {
    return this.isPlaying;
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      questIntegrationEnabled: this.questIntegrationEnabled,
      fallbackMode: this.fallbackMode,
      listenersSetup: this.listenersSetup,
      hasPsyduck: this.psyduck !== null,
      hasScene: this.scene !== null,
      hasRoom: this.scene?.room !== null,
      hasCallback: this.onCompleteCallback !== null,
      // ✅ NOUVEAUX STATUTS
      playerReady: typeof window !== "undefined" && window.playerReady === true,
      loadingScreenClosed: typeof window !== "undefined" && window.loadingScreenClosed === true,
      validPlayerObject: this.scene?.playerManager?.getMyPlayer?.() !== null
    };
  }

  testIntro() {
    if (this.isPlaying) {
      this.forceStop();
      setTimeout(() => {
        this.startIntroFallback();
      }, 1000);
    } else {
      this.startIntroFallback();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Debug complet des flags
  debugStatus() {
    console.log(`🔍 [PsyduckIntro] === DEBUG STATUS COMPLET ===`);
    
    const status = this.getStatus();
    console.log(`📊 Status général:`, status);
    
    // Vérifications détaillées
    console.log(`🏁 Flags globaux:`, {
      playerReady: window?.playerReady,
      playerSpawned: window?.playerSpawned,
      loadingScreenClosed: window?.loadingScreenClosed
    });
    
    // État du joueur
    const myPlayer = this.scene?.playerManager?.getMyPlayer?.();
    console.log(`👤 Joueur:`, {
      exists: !!myPlayer,
      hasSprite: !!myPlayer?.sprite,
      position: myPlayer ? { x: myPlayer.x, y: myPlayer.y } : null,
      validPosition: myPlayer ? (myPlayer.x !== 0 && myPlayer.y !== 0) : false
    });
    
    // État de la scène
    console.log(`🎬 Scène:`, {
      exists: !!this.scene,
      key: this.scene?.scene?.key,
      active: this.scene?.scene?.isActive(),
      hasPlayerManager: !!this.scene?.playerManager,
      hasRoom: !!this.scene?.room
    });
    
    console.log(`=======================================`);
    return status;
  }
  
  destroy() {
    try {
      console.log('[PsyduckIntro] 💀 Destruction du manager');
      this.forceStop();
      this.scene = null;
      this.onCompleteCallback = null;
      this.questIntegrationEnabled = false;
      this.fallbackMode = false;
      this.listenersSetup = false;
    } catch (error) {
      console.error(`[PsyduckIntro] Destruction error:`, error);
    }
  }
}
