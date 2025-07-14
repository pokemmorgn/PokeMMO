// client/src/scenes/intros/PsyduckIntroManager.js
// Manages Psyduck intro sequence with sequential dialogue system
// ✅ DEUX SEQUENCES: Beach (originale) + Village (nouvelle avec lab et téléport)
import { PrologueManager } from './PrologueManager.js';

export class PsyduckIntroManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.psyduck = null;
    this.onCompleteCallback = null;
    this.questIntegrationEnabled = false;
    this.fallbackMode = false;
    this.listenersSetup = false;
    this.cameraFollowingPsyduck = false;
    this.originalCameraTarget = null;
    this.introType = 'beach'; // 'beach', 'village', ou 'village_simple'
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

  // ✅ NOUVELLE MÉTHODE: Démarrer intro pour le village (avec dialogue)
  startVillageIntro(onComplete = null) {
    this.introType = 'village';
    this.startIntro(onComplete);
  }

  // ✅ NOUVELLE MÉTHODE: Démarrer intro simple pour le village (SANS dialogue)
  async startSimpleVillageIntro(onComplete = null) {
    this.introType = 'village_simple';
    
    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }
    this.blockPlayerInputs();
    this.isPlaying = true;
    this.onCompleteCallback = onComplete;

    console.log(`[PsyduckIntro] === DÉMARRAGE INTRO VILLAGE SIMPLE (SANS DIALOGUE) ===`);

    // ✅ Vérifications comme dans startIntro
    const loadingClosed = await this.waitForLoadingScreenClosed(10000);
    if (!loadingClosed) {
      console.warn('[PsyduckIntro] LoadingScreen pas fermé après 10s, continue quand même');
    }

    const playerReady = await this.waitForPlayerReady(8000);
    if (!playerReady) {
      console.warn('[PsyduckIntro] Flag playerReady pas prêt après 8s, annulation intro');
      this.cleanup();
      return;
    }

    const playerObject = await this.waitForValidPlayerObject(3000);
    if (!playerObject) {
      console.warn('[PsyduckIntro] Objet joueur pas valide après 3s, annulation intro');
      this.cleanup();
      return;
    }

    console.log('[PsyduckIntro] ⏳ Attente 2 secondes supplémentaires...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[PsyduckIntro] ✅ Démarrage intro village simple`);
    
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();

    // ✅ Spawn Psyduck en mode simple (sans dialogue)
    this.scene.time.delayedCall(800, () => {
      this.spawnPsyduckAtLabSimple();
    });
  }

  // ✅ MÉTHODE ORIGINALE: Démarrer intro pour la beach
  startBeachIntro(onComplete = null) {
    this.introType = 'beach';
    this.startIntro(onComplete);
  }

  // ✅ FIX: Attendre VRAIMENT que tout soit prêt
  async startIntro(onComplete = null) {
    if (this.isPlaying || !this.scene) return;

    if (!this.listenersSetup) {
      this.ensureListenersSetup();
    }
    this.blockPlayerInputs();
    this.isPlaying = true;
    this.onCompleteCallback = onComplete;

    console.log(`[PsyduckIntro] === DÉMARRAGE INTRO ${this.introType.toUpperCase()} - VÉRIFICATIONS ===`);

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
    
    console.log(`[PsyduckIntro] ✅ Toutes les vérifications passées, démarrage intro ${this.introType}`);
    
    // ✅ ÉTAPE 4: Bloquer les inputs et charger Psyduck
    this.blockPlayerInputs();
    this.loadPsyduckSpritesheet();

    // ✅ ÉTAPE 5: Délai final avant spawn Psyduck selon le type d'intro
    this.scene.time.delayedCall(800, () => {
      if (this.introType === 'village') {
        this.spawnPsyduckAtLab();
      } else {
        this.spawnPsyduck(); // Version beach originale
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Attendre fermeture LoadingScreen
  waitForLoadingScreenClosed(maxWaitTime = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();
      
      const check = () => {
        if (typeof window !== "undefined" && window.loadingScreenClosed === true) {
          console.log('[PsyduckIntro] ✅ LoadingScreen fermé détecté');
          return resolve(true);
        }
        
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

  waitForPlayerReady(maxWaitTime = 8000) {
    return new Promise(resolve => {
      const start = Date.now();

      const check = () => {
        if (typeof window !== "undefined" && window.playerReady === true) {
          console.log('[PsyduckIntro] ✅ Flag window.playerReady détecté');
          return resolve(true);
        }

        if (typeof window !== "undefined" && 
            window.playerSpawned === true && 
            window.loadingScreenClosed === true) {
          console.log('[PsyduckIntro] ✅ Flags playerSpawned + loadingScreenClosed détectés');
          window.playerReady = true;
          return resolve(true);
        }

        if (Date.now() - start > maxWaitTime) {
          console.warn('[PsyduckIntro] ⏰ Timeout attente playerReady');
          return resolve(false);
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  }

  waitForValidPlayerObject(maxWaitTime = 1000) {
    return new Promise(resolve => {
      if (window.playerReady && window.playerSpawned && window.loadingScreenClosed) {
        console.log('[PsyduckIntro] ✅ Tous les flags OK, joueur considéré valide');
        return resolve(true);
      }
      
      const scene = this.scene;
      const myPlayer = scene?.playerManager?.getMyPlayer?.();
      
      if (myPlayer && myPlayer.x !== undefined && myPlayer.y !== undefined) {
        console.log('[PsyduckIntro] ✅ Joueur trouvé avec position valide');
        return resolve(true);
      }
      
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

      if (!anims.exists('psyduck_idle')) {
        anims.create({
          key: 'psyduck_idle',
          frames: [{ key, frame: 0 }],
          frameRate: 1,
          repeat: 0
        });
      }
    } catch (error) {
      console.error(`[PsyduckIntro] Error creating animations:`, error);
    }
  }

  // === BEACH INTRO PHASES (VERSION ORIGINALE) ===

  spawnPsyduck() {
    if (!this.scene || !this.scene.add) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🦆 Spawn de Psyduck (Beach)...');
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
      console.log('[PsyduckIntro] 🚶 Phase 1: Marche vers la droite (Beach)');
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
      console.log('[PsyduckIntro] ⬇️ Phase 2: Marche vers le bas (Beach)');
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
      console.log('[PsyduckIntro] 💬 Phase 3: Interaction et dialogue (Beach)');
      this.psyduck.anims.stop();
      this.psyduck.setFrame(0);
      this.notifyServer("psyduck_talked");
      
      this.showDialogue([
        { text: "Psy? Psy... duck?", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "The yellow duck-like creature tilts its head, looking confused", speaker: "Narrator", hideName: true },
        { text: "It holds its head with both hands... seems to have a headache", speaker: "Narrator", hideName: true },
        { text: "Psy... psy duck? Psy?", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "Despite its confusion, it points toward some buildings in the distance", speaker: "Narrator", hideName: true },
        { text: "Maybe it's trying to tell you something about that place?", speaker: "Narrator", hideName: true }
      ], () => {
        this.finishBeachIntro();
      });

    } catch (error) {
      console.error(`[PsyduckIntro] Error in phase 3:`, error);
      this.cleanup();
    }
  }

  finishBeachIntro() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🔚 Fin de l\'intro beach - retour de Psyduck');
      
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
              this.notifyServer("intro_watched");
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
      console.error(`[PsyduckIntro] Error finishing beach intro:`, error);
      this.cleanup();
    }
  }

  // === VILLAGE INTRO PHASES (AVEC DIALOGUE) ===

  spawnPsyduckAtLab() {
    if (!this.scene || !this.scene.add) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🦆 Spawn de Psyduck devant le lab (Village avec dialogue)...');
      
      const labPosition = this.getLabPosition();
      
      this.psyduck = this.scene.add.sprite(labPosition.x, labPosition.y, 'psyduck_walk', 0)
        .setOrigin(0.5, 1)
        .setDepth(6);
      
      this.focusCameraOnPsyduck();
      
      this.scene.time.delayedCall(1500, () => {
        this.startPsyduckDialogue();
      });
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error spawning Psyduck at lab:`, error);
      this.cleanup();
    }
  }

  // ✅ VILLAGE INTRO SIMPLE (SANS DIALOGUE)

  spawnPsyduckAtLabSimple() {
    if (!this.scene || !this.scene.add) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🦆 Spawn de Psyduck devant le lab (SIMPLE - SANS dialogue)...');
      
      const labPosition = this.getLabPosition();
      
      this.psyduck = this.scene.add.sprite(labPosition.x, labPosition.y, 'psyduck_walk', 0)
        .setOrigin(0.5, 1)
        .setDepth(6);

      this.scene.time.delayedCall(200, () => {
            this.startPsyduckDialoguevillage();
        });
      // ✅ Fixer la caméra sur Psyduck
      this.focusCameraOnPsyduck();
      
      // ✅ Attendre 1 seconde puis aller directement au téléport (SANS dialogue)
      this.scene.time.delayedCall(1000, () => {
        this.startWalkToTeleport();
      });
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error spawning Psyduck at lab (simple):`, error);
      this.cleanup();
    }
  }

  focusCameraOnPsyduck() {
    if (!this.scene || !this.scene.cameras || !this.psyduck) return;

    try {
      console.log('[PsyduckIntro] 📷 Fixation caméra sur Psyduck');
      
      const camera = this.scene.cameras.main;
      
      // ✅ Sauvegarder la cible actuelle de la caméra
      this.originalCameraTarget = camera._target || null;
      
      // ✅ Arrêter le suivi actuel
      camera.stopFollow();
      
      // ✅ Faire suivre Psyduck par la caméra
      camera.startFollow(this.psyduck, true, 0.08, 0.08);
      
      this.cameraFollowingPsyduck = true;
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error focusing camera:`, error);
    }
  }

    startPsyduckDialogue() {
    if (!this.psyduck) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 💬 Dialogue avec Psyduck sur la plage');
      
      this.psyduck.anims.play('psyduck_idle');
      this.notifyServer("psyduck_talked");
      
      const labMessages = [
        { text: "Psy? Psy... duck?", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "The yellow duck-like creature appears to be waiting for something...", speaker: "Narrator", hideName: true },
        { text: "It looks at you, then toward the mysterious building", speaker: "Narrator", hideName: true },
        { text: "Psy... duck! Psy psy!", speaker: "???", portrait: "/assets/portrait/psyduckPortrait.png" },
        { text: "Suddenly, it starts walking toward what seems to be a teleportation device!", speaker: "Narrator", hideName: true }
      ];
      
      this.showDialogue(labMessages, () => {
        this.startWalkToTeleport();
      });

    } catch (error) {
      console.error(`[PsyduckIntro] Error in plage dialogue:`, error);
      this.cleanup();
    }
  }

    startPsyduckDialoguevillage() {
    if (!this.psyduck) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 💬 Dialogue avec Psyduck avant labo (narrateur)');
      this.notifyServer("follow_psyduck");
      
      const labMessages = [
        { text: "Well, that weird yellow duck thing just waddled right into that big building… whatever that is.", speaker: "Narrator", hideName: true },
        { text: "You don’t really know what’s going on, but hey — following a random Pokémon is as good a plan as any, right?", speaker: "Narrator", hideName: true },
        { text: "Let’s see what kind of trouble it’s getting into inside that lab.", speaker: "Narrator", hideName: true },
      ];
      
      this.showDialogue(labMessages, () => {
        this.startWalkToTeleport();
        this.notifyServer("follow_psyduck");  
      });

    } catch (error) {
      console.error(`[PsyduckIntro] Error in village dialogue:`, error);
      this.cleanup();
    }
  }
  
  startWalkToTeleport() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 🚶 Psyduck marche vers le téléport');
      
      const teleportPosition = this.getTeleportPosition();
      
      this.psyduck.anims.play('psyduck_walk_up');
      
      this.scene.tweens.add({
        targets: this.psyduck,
        x: teleportPosition.x,
        y: teleportPosition.y,
        duration: 3000,
        ease: 'Linear',
        onUpdate: () => {
          if (this.psyduck && this.psyduck.anims && !this.psyduck.anims.isPlaying) {
            this.psyduck.anims.play('psyduck_walk_up');
          }
        },
        onComplete: () => {
          this.psyduckTeleportDisappear();
        }
      });
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error walking to teleport:`, error);
      this.cleanup();
    }
  }

  psyduckTeleportDisappear() {
    if (!this.psyduck || !this.scene) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] ✨ Psyduck disparaît par téléportation');
      
      this.psyduck.anims.stop();
      this.psyduck.setFrame(16); // Frame vers le haut
      
      // ✅ Effet de téléportation
      this.scene.tweens.add({
        targets: this.psyduck,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          console.log('[PsyduckIntro] 🌟 Psyduck a disparu !');
          
          if (this.psyduck && this.psyduck.destroy) {
            this.psyduck.destroy();
          }
          this.psyduck = null;
          
          this.notifyServer("intro_watched");
          
          this.scene.time.delayedCall(1500, () => {
            this.returnCameraToPlayer();
          });
        }
      });
      
      // ✅ Optionnel: Effet sonore
      // this.scene.sound.play('teleport_sound');
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error in teleport disappear:`, error);
      this.cleanup();
    }
  }

  returnCameraToPlayer() {
    if (!this.scene || !this.scene.cameras) {
      this.cleanup();
      return;
    }

    try {
      console.log('[PsyduckIntro] 📷 Retour caméra au joueur');
      
      const camera = this.scene.cameras.main;
      camera.stopFollow();
      
      const myPlayer = this.scene.playerManager?.getMyPlayer();
      
      if (myPlayer) {
        camera.startFollow(myPlayer, true, 0.08, 0.08);
        console.log('[PsyduckIntro] ✅ Caméra rendue au joueur');
      } else if (this.originalCameraTarget) {
        camera.startFollow(this.originalCameraTarget, true, 0.08, 0.08);
        console.log('[PsyduckIntro] ✅ Caméra rendue à la cible originale');
      } else {
        console.warn('[PsyduckIntro] ⚠️ Pas de cible trouvée pour la caméra');
      }
      
      this.cameraFollowingPsyduck = false;
      this.originalCameraTarget = null;
      
      this.finishIntro();
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error returning camera:`, error);
      this.cleanup();
    }
  }

  // === DIALOGUE SYSTEM ===

  async showDialogue(messages, onDialogueComplete = null) {
    if (!messages || messages.length === 0) {
      console.error(`[PsyduckIntro] No messages to display`);
      if (onDialogueComplete) {
        onDialogueComplete();
      } else {
        this.finishIntro();
      }
      return;
    }

    try {
      const apiAvailable = await this.waitForSequentialAPI(5000);
      
      if (!apiAvailable) {
        this.fallbackToConsole(messages, onDialogueComplete);
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
            if (onDialogueComplete) {
              onDialogueComplete();
            } else {
              this.finishIntro();
            }
          }
        }
      );
      
      if (!success) {
        this.fallbackToConsole(messages, onDialogueComplete);
      }
      
    } catch (error) {
      console.error(`[PsyduckIntro] Dialogue error:`, error);
      this.fallbackToConsole(messages, onDialogueComplete);
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

  fallbackToConsole(messages, onDialogueComplete = null) {
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
      if (onDialogueComplete) {
        onDialogueComplete();
      } else {
        this.finishIntro();
      }
    }, 2000);
  }

  // === INTRO COMPLETION ===

  finishIntro() {
    try {
      console.log(`[PsyduckIntro] 🔚 Fin de l'intro ${this.introType} terminée`);
      
      // ✅ S'assurer que la caméra soit revenue au joueur pour le village
      if ((this.introType === 'village' || this.introType === 'village_simple') && this.cameraFollowingPsyduck) {
        this.returnCameraToPlayer();
        return; // returnCameraToPlayer appellera cleanup
      }
      
      this.cleanup();
      
      // ✅ Notification serveur finale
      if (this.scene.room) {
        this.scene.room.send("progressIntroQuest", {
          step: "intro_watched",
          playerName: this.scene.playerManager?.getMyPlayer()?.name || "unknown"
        });
      }
      
    } catch (error) {
      console.error(`[PsyduckIntro] Error finishing intro:`, error);
      this.cleanup();
    }
  }

  cleanup() {
    try {
      console.log(`[PsyduckIntro] 🧹 Nettoyage intro ${this.introType}...`);
      
      // ✅ Nettoyer la caméra si nécessaire
      if (this.cameraFollowingPsyduck && this.scene && this.scene.cameras) {
        const camera = this.scene.cameras.main;
        camera.stopFollow();
        
        const myPlayer = this.scene.playerManager?.getMyPlayer();
        if (myPlayer) {
          camera.startFollow(myPlayer, true, 0.08, 0.08);
        }
        
        this.cameraFollowingPsyduck = false;
        this.originalCameraTarget = null;
      }
      
      // ✅ Nettoyer Psyduck
      if (this.psyduck && this.psyduck.destroy) {
        this.psyduck.destroy();
      }
      this.psyduck = null;
      
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
      console.log(`[PsyduckIntro] 🛑 Arrêt forcé de l'intro ${this.introType}`);
      
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
      this.cameraFollowingPsyduck = false;
      this.originalCameraTarget = null;
      this.unblockPlayerInputs();
    }
  }

  isIntroPlaying() {
    return this.isPlaying;
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      introType: this.introType,
      questIntegrationEnabled: this.questIntegrationEnabled,
      fallbackMode: this.fallbackMode,
      listenersSetup: this.listenersSetup,
      hasPsyduck: this.psyduck !== null,
      hasScene: this.scene !== null,
      hasRoom: this.scene?.room !== null,
      hasCallback: this.onCompleteCallback !== null,
      cameraFollowingPsyduck: this.cameraFollowingPsyduck,
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

  // ✅ Test spécifique pour le village simple
  testSimpleVillageIntro() {
    if (this.isPlaying) {
      this.forceStop();
      setTimeout(() => {
        this.startSimpleVillageIntro();
      }, 1000);
    } else {
      this.startSimpleVillageIntro();
    }
  }

  // ✅ Test spécifique pour le village (avec dialogue)
  testVillageIntro() {
    if (this.isPlaying) {
      this.forceStop();
      setTimeout(() => {
        this.startVillageIntro();
      }, 1000);
    } else {
      this.startVillageIntro();
    }
  }

  // ✅ Test spécifique pour la beach
  testBeachIntro() {
    if (this.isPlaying) {
      this.forceStop();
      setTimeout(() => {
        this.startBeachIntro();
      }, 1000);
    } else {
      this.startBeachIntro();
    }
  }

  debugStatus() {
    console.log(`🔍 [PsyduckIntro] === DEBUG STATUS COMPLET ${this.introType.toUpperCase()} ===`);
    
    const status = this.getStatus();
    console.log(`📊 Status général:`, status);
    
    console.log(`🏁 Flags globaux:`, {
      playerReady: window?.playerReady,
      playerSpawned: window?.playerSpawned,
      loadingScreenClosed: window?.loadingScreenClosed
    });
    
    const myPlayer = this.scene?.playerManager?.getMyPlayer?.();
    console.log(`👤 Joueur:`, {
      exists: !!myPlayer,
      hasSprite: !!myPlayer?.sprite,
      position: myPlayer ? { x: myPlayer.x, y: myPlayer.y } : null,
      validPosition: myPlayer ? (myPlayer.x !== 0 && myPlayer.y !== 0) : false
    });
    
    console.log(`🎬 Scène:`, {
      exists: !!this.scene,
      key: this.scene?.scene?.key,
      active: this.scene?.scene?.isActive(),
      hasPlayerManager: !!this.scene?.playerManager,
      hasRoom: !!this.scene?.room
    });
    
    console.log(`📷 Caméra:`, {
      followingPsyduck: this.cameraFollowingPsyduck,
      hasOriginalTarget: !!this.originalCameraTarget,
      currentTarget: this.scene?.cameras?.main?._target
    });
    
    console.log(`=======================================`);
    return status;
  }

  // ✅ Configuration des positions
  getLabPosition() {
    return this.labPosition || { x: 885, y: 435 };
  }

  getTeleportPosition() {
    return this.teleportPosition || { x: 885, y: 521 };
  }

  setLabAndTeleportPositions(labX, labY, teleportX, teleportY) {
    this.labPosition = { x: labX, y: labY };
    this.teleportPosition = { x: teleportX, y: teleportY };
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
      this.cameraFollowingPsyduck = false;
      this.originalCameraTarget = null;
      this.introType = 'beach';
    } catch (error) {
      console.error(`[PsyduckIntro] Destruction error:`, error);
    }
  }
}
