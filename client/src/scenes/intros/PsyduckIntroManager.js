// client/src/scenes/intros/PsyduckIntroManager.js
// Manages Psyduck intro sequence with sequential dialogue system

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
            this.notifyServer("intro_watched");
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

  startIntro(onComplete = null) {
    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }

    this.isPlaying = true;
    this.onCompleteCallback = onComplete;
    
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();
    
    this.scene.time.delayedCall(500, () => {
      this.spawnPsyduck();
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
      this.psyduck.anims.stop();
      this.psyduck.setFrame(0);
      
      this.notifyServer("psyduck_talked");
      
      this.showDialogue([
        "Psy? Psyduck!",
        "🦆 *Psyduck seems curious about you*",
        "🦆 *It points toward the distant village*",
        "Psy psy! Duck duck!",
        "🦆 *It encourages you to explore this mysterious region*"
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
        "Psyduck", 
        "/assets/portrait/psyduckPortrait.png", 
        messages, 
        {
          showProgress: true,
          narratorName: "Narrator",
          narratorPortrait: "/assets/portrait/systemPortrait.png",
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
      console.log(`  ${i + 1}. ${msg}`);
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
      hasCallback: this.onCompleteCallback !== null
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

  destroy() {
    try {
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
