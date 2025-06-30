// client/src/scenes/intros/PsyduckIntroManager.js
// ===============================================
// Gestionnaire d'intro avec Psyduck pour BeachScene + Intégration quêtes serveur COMPLET
// ===============================================

export class PsyduckIntroManager {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.psyduck = null;
    this.onCompleteCallback = null;
    this.questIntegrationEnabled = false;
    this.fallbackMode = false;
    
    // ✅ NOUVEAU: Setup des écoutes serveur avec gestion d'erreurs
    this.setupServerListeners();
  }

  // ✅ === INTÉGRATION SERVEUR POUR LES QUÊTES ===
  
  /**
   * Configure les écoutes des messages serveur avec fallback
   */
  setupServerListeners() {
    if (!this.scene.room) {
      console.warn(`⚠️ [PsyduckIntro] Pas de room disponible pour les écoutes serveur`);
      console.log(`ℹ️ [PsyduckIntro] Mode déconnecté: l'intro peut être déclenchée manuellement`);
      this.fallbackMode = true;
      return;
    }

    console.log(`📡 [PsyduckIntro] Configuration écoutes serveur`);

    try {
      // Écouter le déclenchement de l'intro depuis le serveur
      this.scene.room.onMessage("triggerIntroSequence", (data) => {
        console.log("🎬 [PsyduckIntro] Serveur demande intro:", data);
        
        if (data.shouldStartIntro && !this.isPlaying) {
          this.questIntegrationEnabled = true;
          this.fallbackMode = false;
          
          // Déclencher l'intro avec un court délai
          this.scene.time.delayedCall(500, () => {
            this.startIntro(() => {
              console.log("✅ [PsyduckIntro] Intro terminée avec intégration serveur");
              
              // Notifier la completion finale au serveur
              if (this.questIntegrationEnabled) {
                this.notifyServer("intro_completed");
              }
            });
            
            // Notifier immédiatement que l'intro a commencé
            this.notifyServer("intro_watched");
          });
        }
      });
      
      // Écouter la completion de la quête d'intro
      this.scene.room.onMessage("introQuestCompleted", (data) => {
        console.log("🎉 [PsyduckIntro] Quête d'intro terminée:", data);
        this.showQuestCompletionMessage(data.message);
      });

      console.log(`✅ [PsyduckIntro] Écoutes serveur configurées`);
      
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur lors de la configuration des écoutes:`, error);
      this.fallbackMode = true;
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE: Démarre l'intro en mode fallback (sans serveur)
   */
  startIntroFallback() {
    if (this.isPlaying) {
      console.warn(`⚠️ [PsyduckIntro] Intro déjà en cours`);
      return;
    }

    console.log(`🎬 [PsyduckIntro] Mode fallback: Démarrage intro sans serveur`);
    this.questIntegrationEnabled = false;
    this.fallbackMode = true;
    
    this.startIntro(() => {
      console.log("✅ [PsyduckIntro] Intro terminée en mode fallback");
      // En mode fallback, pas de notification serveur
    });
  }

  /**
   * Notifie le serveur des progressions de quête
   */
  notifyServer(step) {
    if (!this.questIntegrationEnabled || !this.scene.room || this.fallbackMode) {
      console.log(`ℹ️ [PsyduckIntro] Skip notification serveur: ${step} (intégration: ${this.questIntegrationEnabled}, fallback: ${this.fallbackMode})`);
      return;
    }

    console.log(`📤 [PsyduckIntro] Notification serveur: ${step}`);
    
    try {
      this.scene.room.send("progressIntroQuest", { step: step });
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur notification serveur:`, error);
      // Passer en mode fallback si erreur de communication
      this.fallbackMode = true;
      this.questIntegrationEnabled = false;
    }
  }

  /**
   * Affiche un message de completion de quête
   */
  showQuestCompletionMessage(message) {
    if (!this.scene || !this.scene.add) {
      console.warn(`⚠️ [PsyduckIntro] Scene non disponible pour afficher le message`);
      return;
    }

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
      
      // Faire disparaître après 3 secondes
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
      console.error(`❌ [PsyduckIntro] Erreur affichage message:`, error);
    }
  }

  // ✅ === MÉTHODES EXISTANTES MODIFIÉES ===

  /**
   * Charge le spritesheet de Psyduck
   */
  loadPsyduckSpritesheet() {
    const key = 'psyduck_walk';
    
    if (!this.scene.textures.exists(key)) {
      console.log(`🦆 [PsyduckIntro] Chargement spritesheet Psyduck...`);
      
      try {
        this.scene.load.spritesheet(key, 'assets/pokemon/054_psyduck/Walk-Anim.png', {
          frameWidth: 24,  // Ajustez selon votre spritesheet
          frameHeight: 40  // Ajustez selon votre spritesheet
        });
        
        this.scene.load.once('complete', () => {
          this.createPsyduckAnimations();
        });
        
        this.scene.load.start();
      } catch (error) {
        console.error(`❌ [PsyduckIntro] Erreur chargement spritesheet:`, error);
      }
    } else {
      this.createPsyduckAnimations();
    }
  }

  /**
   * Crée les animations pour Psyduck
   */
  createPsyduckAnimations() {
    if (!this.scene || !this.scene.anims) {
      console.error(`❌ [PsyduckIntro] Scene ou anims non disponible`);
      return;
    }

    const anims = this.scene.anims;
    const key = 'psyduck_walk';
    
    try {
      // Animation marche droite (frames 8,9,10,11)
      if (!anims.exists('psyduck_walk_right')) {
        anims.create({
          key: 'psyduck_walk_right',
          frames: [
            { key, frame: 8 },
            { key, frame: 9 },
            { key, frame: 10 },
            { key, frame: 11 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }

      // Animation marche haut
      if (!anims.exists('psyduck_walk_up')) {
        anims.create({
          key: 'psyduck_walk_up',
          frames: [
            { key, frame: 16 },
            { key, frame: 17 },
            { key, frame: 18 },
            { key, frame: 19 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }

      // Animation marche gauche
      if (!anims.exists('psyduck_walk_left')) {
        anims.create({
          key: 'psyduck_walk_left',
          frames: [
            { key, frame: 24 },
            { key, frame: 25 },
            { key, frame: 26 },
            { key, frame: 27 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }
      
      // Animation marche bas (frames 0,1,2,3)
      if (!anims.exists('psyduck_walk_down')) {
        anims.create({
          key: 'psyduck_walk_down',
          frames: [
            { key, frame: 0 },
            { key, frame: 1 },
            { key, frame: 2 },
            { key, frame: 3 }
          ],
          frameRate: 6,
          repeat: -1
        });
      }

      console.log(`✅ [PsyduckIntro] Animations créées`);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur création animations:`, error);
    }
  }

  /**
   * Démarre l'intro complète
   */
  startIntro(onComplete = null) {
    if (this.isPlaying) {
      console.warn(`⚠️ [PsyduckIntro] Intro déjà en cours`);
      return;
    }

    if (!this.scene) {
      console.error(`❌ [PsyduckIntro] Scene non disponible`);
      return;
    }

    this.isPlaying = true;
    this.onCompleteCallback = onComplete;
    
    console.log(`🎬 [PsyduckIntro] === DÉBUT INTRO PSYDUCK ===`);
    console.log(`🔧 Mode: ${this.fallbackMode ? 'FALLBACK' : 'SERVEUR'}`);
    
    // Bloquer les inputs du joueur
    this.blockPlayerInputs();
    
    // Charger le spritesheet si nécessaire
    this.loadPsyduckSpritesheet();
    
    // Attendre un peu que tout soit chargé puis commencer
    this.scene.time.delayedCall(500, () => {
      this.spawnPsyduck();
    });
  }

  /**
   * Spawn Psyduck à la position initiale
   */
  spawnPsyduck() {
    if (!this.scene || !this.scene.add) {
      console.error(`❌ [PsyduckIntro] Scene non disponible pour spawn`);
      this.cleanup();
      return;
    }

    console.log(`🦆 [PsyduckIntro] Spawn Psyduck en (160, 32)`);
    
    try {
      // Créer le sprite Psyduck
      this.psyduck = this.scene.add.sprite(160, 32, 'psyduck_walk', 8)
        .setOrigin(0.5, 1)  // Origine en bas-centre
        .setDepth(6);       // Au-dessus du joueur
      
      // Démarrer la première phase : marche vers la droite
      this.startPhase1_WalkRight();
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur spawn Psyduck:`, error);
      this.cleanup();
    }
  }

  /**
   * Phase 1 : Marche de 160,32 vers 360,32 (vers la droite)
   */
  startPhase1_WalkRight() {
    if (!this.psyduck || !this.scene) {
      console.error(`❌ [PsyduckIntro] Psyduck ou scene non disponible pour phase 1`);
      this.cleanup();
      return;
    }

    console.log(`➡️ [PsyduckIntro] Phase 1 : Marche vers la droite`);
    
    try {
      // Jouer l'animation de marche droite
      this.psyduck.anims.play('psyduck_walk_right');
      
      // Tween pour se déplacer horizontalement
      this.scene.tweens.add({
        targets: this.psyduck,
        x: 360,  // Destination X
        duration: 3000,  // 3 secondes
        ease: 'Linear',
        onUpdate: () => {
          // S'assurer que l'animation continue
          if (this.psyduck && this.psyduck.anims && !this.psyduck.anims.isPlaying) {
            this.psyduck.anims.play('psyduck_walk_right');
          }
        },
        onComplete: () => {
          console.log(`✅ [PsyduckIntro] Phase 1 terminée`);
          this.startPhase2_WalkDown();
        }
      });
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur phase 1:`, error);
      this.cleanup();
    }
  }

  /**
   * Phase 2 : Marche de 360,32 vers 360,110 (vers le bas)
   */
  startPhase2_WalkDown() {
    if (!this.psyduck || !this.scene) {
      console.error(`❌ [PsyduckIntro] Psyduck ou scene non disponible pour phase 2`);
      this.cleanup();
      return;
    }

    console.log(`⬇️ [PsyduckIntro] Phase 2 : Marche vers le bas`);
    
    try {
      // Changer l'animation pour marche vers le bas
      this.psyduck.anims.play('psyduck_walk_down');
      
      // Tween pour se déplacer verticalement
      this.scene.tweens.add({
        targets: this.psyduck,
        y: 90,  // Destination Y (près du joueur en 360,120)
        duration: 2500,  // 2.5 secondes
        ease: 'Linear',
        onUpdate: () => {
          // S'assurer que l'animation continue
          if (this.psyduck && this.psyduck.anims && !this.psyduck.anims.isPlaying) {
            this.psyduck.anims.play('psyduck_walk_down');
          }
        },
        onComplete: () => {
          console.log(`✅ [PsyduckIntro] Phase 2 terminée`);
          this.startPhase3_Interaction();
        }
      });
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur phase 2:`, error);
      this.cleanup();
    }
  }

  /**
   * Phase 3 : Interaction finale
   */
  startPhase3_Interaction() {
    if (!this.psyduck) {
      console.error(`❌ [PsyduckIntro] Psyduck non disponible pour phase 3`);
      this.cleanup();
      return;
    }

    console.log(`💬 [PsyduckIntro] Phase 3 : Interaction`);
    
    try {
      // Arrêter l'animation
      this.psyduck.anims.stop();
      this.psyduck.setFrame(0);  // Frame idle vers le bas
      
      // ✅ NOUVEAU: Notifier le serveur de l'interaction avec Psyduck
      this.notifyServer("psyduck_talked");
      
      // Messages d'interaction
      this.showDialogue([
        "Psy? Psyduck!",
        "🦆 *Psyduck semble curieux de vous voir*",
        "🦆 *Il pointe du doigt vers le village*"
      ]);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur phase 3:`, error);
      this.cleanup();
    }
  }

  /**
   * Affiche une série de dialogues
   */
  showDialogue(messages) {
    if (!this.scene || !this.psyduck) {
      console.error(`❌ [PsyduckIntro] Scene ou Psyduck non disponible pour dialogue`);
      this.finishIntro();
      return;
    }

    let messageIndex = 0;
    
    const showNextMessage = () => {
      if (messageIndex >= messages.length) {
        this.finishIntro();
        return;
      }
      
      const message = messages[messageIndex];
      console.log(`💬 [PsyduckIntro] Message ${messageIndex + 1}/${messages.length}: ${message}`);
      
      try {
        // Créer la bulle de texte
        const textBox = this.scene.add.text(
          this.psyduck.x,
          this.psyduck.y - 40,
          message,
          {
            fontSize: "14px",
            color: "#fff",
            backgroundColor: "#336699",
            padding: { x: 8, y: 6 },
            borderRadius: 5,
            wordWrap: { width: 200 }
          }
        ).setDepth(1000).setOrigin(0.5);
        
        messageIndex++;
        
        // Attendre 2.5 secondes puis message suivant
        this.scene.time.delayedCall(2500, () => {
          if (textBox && textBox.destroy) {
            textBox.destroy();
          }
          showNextMessage();
        });
      } catch (error) {
        console.error(`❌ [PsyduckIntro] Erreur affichage dialogue:`, error);
        this.finishIntro();
      }
    };
    
    showNextMessage();
  }

  /**
   * Termine l'intro
   */
  finishIntro() {
    if (!this.psyduck || !this.scene) {
      console.log(`⚠️ [PsyduckIntro] Finish intro sans Psyduck/scene, cleanup direct`);
      this.cleanup();
      return;
    }

    console.log(`🎉 [PsyduckIntro] === FIN INTRO ===`);
    
    try {
      // Phase 4 : Retour vers le haut (360,32)
      this.psyduck.anims.play('psyduck_walk_up');
      
      this.scene.tweens.add({
        targets: this.psyduck,
        y: 32,  // Retour à la position Y initiale
        duration: 2500,
        ease: 'Linear',
        onComplete: () => {
          if (!this.psyduck || !this.scene) {
            this.cleanup();
            return;
          }
          
          // Phase 5 : Retour vers la gauche (160,32)
          this.psyduck.anims.play('psyduck_walk_left');
          
          this.scene.tweens.add({
            targets: this.psyduck,
            x: 160,  // Retour à la position X initiale
            duration: 3000,
            ease: 'Linear',
            onComplete: () => {
              if (!this.psyduck || !this.scene) {
                this.cleanup();
                return;
              }
              
              // Disparition finale
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
                }
              });
            }
          });
        }
      });
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur finish intro:`, error);
      this.cleanup();
    }
  }

  /**
   * Nettoie et débloque le joueur
   */
  cleanup() {
    console.log(`🧹 [PsyduckIntro] Nettoyage`);
    
    try {
      this.isPlaying = false;
      this.unblockPlayerInputs();
      
      // Callback de fin d'intro
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
      
      console.log(`✅ [PsyduckIntro] Joueur débloqué, intro terminée`);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur cleanup:`, error);
    }
  }

  /**
   * Bloque les inputs du joueur
   */
  blockPlayerInputs() {
    if (!this.scene) {
      console.warn(`⚠️ [PsyduckIntro] Scene non disponible pour bloquer inputs`);
      return;
    }

    try {
      if (this.scene.input && this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = false;
      }
      
      const myPlayer = this.scene.playerManager?.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.enable = false;
      }
      
      // Marquer que l'intro bloque
      this.scene._introBlocked = true;
      
      console.log(`🔒 [PsyduckIntro] Inputs bloqués`);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur blocage inputs:`, error);
    }
  }

  /**
   * Débloque les inputs du joueur
   */
  unblockPlayerInputs() {
    if (!this.scene) {
      console.warn(`⚠️ [PsyduckIntro] Scene non disponible pour débloquer inputs`);
      return;
    }

    try {
      if (this.scene.input && this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = true;
      }
      
      const myPlayer = this.scene.playerManager?.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.enable = true;
      }
      
      // Démarquer le blocage
      this.scene._introBlocked = false;
      
      console.log(`🔓 [PsyduckIntro] Inputs débloqués`);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur déblocage inputs:`, error);
    }
  }

  /**
   * Force l'arrêt de l'intro (si nécessaire)
   */
  forceStop() {
    if (!this.isPlaying) return;
    
    console.log(`🛑 [PsyduckIntro] Arrêt forcé`);
    
    try {
      // Supprimer Psyduck s'il existe
      if (this.psyduck) {
        if (this.psyduck.destroy) {
          this.psyduck.destroy();
        }
        this.psyduck = null;
      }
      
      // Nettoyer
      this.cleanup();
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur force stop:`, error);
      // Force cleanup même en cas d'erreur
      this.isPlaying = false;
      this.psyduck = null;
      this.unblockPlayerInputs();
    }
  }

  /**
   * Vérifie si l'intro est en cours
   */
  isIntroPlaying() {
    return this.isPlaying;
  }

  /**
   * ✅ NOUVELLES MÉTHODES DE DEBUG ET STATUS
   */
  
  /**
   * Retourne l'état complet de l'intro manager
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      questIntegrationEnabled: this.questIntegrationEnabled,
      fallbackMode: this.fallbackMode,
      hasPsyduck: this.psyduck !== null,
      hasScene: this.scene !== null,
      hasRoom: this.scene?.room !== null,
      hasCallback: this.onCompleteCallback !== null
    };
  }

  /**
   * Debug de l'état actuel
   */
  debugStatus() {
    console.log(`🔍 [PsyduckIntro] === DEBUG STATUS ===`);
    console.log(`📊 Status:`, this.getStatus());
    console.log(`🦆 Psyduck:`, this.psyduck ? {
      x: this.psyduck.x,
      y: this.psyduck.y,
      visible: this.psyduck.visible,
      alpha: this.psyduck.alpha
    } : 'null');
    console.log(`======================================`);
  }

  /**
   * Test de l'intro (mode développement)
   */
  testIntro() {
    console.log(`🧪 [PsyduckIntro] Test intro (mode développement)`);
    
    if (this.isPlaying) {
      console.log(`⚠️ [PsyduckIntro] Intro déjà en cours, arrêt forcé d'abord`);
      this.forceStop();
      
      // Redémarrer après un délai
      setTimeout(() => {
        this.startIntroFallback();
      }, 1000);
    } else {
      this.startIntroFallback();
    }
  }

  /**
   * Nettoie complètement le manager
   */
  destroy() {
    console.log(`💀 [PsyduckIntro] Destruction complète`);
    
    try {
      this.forceStop();
      this.scene = null;
      this.onCompleteCallback = null;
      this.questIntegrationEnabled = false;
      this.fallbackMode = false;
      
      console.log(`✅ [PsyduckIntro] Destruction terminée`);
    } catch (error) {
      console.error(`❌ [PsyduckIntro] Erreur destruction:`, error);
    }
  }
}
