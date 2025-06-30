// ===============================================
// BeachScene.js - Beach + Intro
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';
import { PsyduckIntroManager } from '../intros/PsyduckIntroManager.js';


// === Mini-manager pour spritesheets Pokémon 2x4 (27x27px) ===
class PokemonSpriteManager {
  constructor(scene) { this.scene = scene; }

  loadSpritesheet(pokemonName) {
    const key = `${pokemonName}_Walk`;
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 27, frameHeight: 27,
      });
      this.scene.load.once('complete', () => this.createAnimations(key));
      this.scene.load.start();
    } else {
      this.createAnimations(key);
    }
  }

  createPokemonSprite(pokemonName, x, y, direction = "left") {
    const key = `${pokemonName}_Walk`;
    this.createAnimations(key);
    const sprite = this.scene.add.sprite(x, y, key, 0).setOrigin(0.5, 1);
    sprite.setDepth(5);
    sprite.direction = direction;
    sprite.pokemonAnimKey = `${key}_${direction}`;
    sprite.play(sprite.pokemonAnimKey);
    return sprite;
  }

  createAnimations(key) {
    const anims = this.scene.anims;
    if (anims.exists(`${key}_down`)) return;
    anims.create({
      key: `${key}_up`,
      frames: [{ key, frame: 0 }, { key, frame: 1 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_down`,
      frames: [{ key, frame: 2 }, { key, frame: 3 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_left`,
      frames: [{ key, frame: 4 }, { key, frame: 5 }],
      frameRate: 6, repeat: -1
    });
    anims.create({
      key: `${key}_right`,
      frames: [{ key, frame: 6 }, { key, frame: 7 }],
      frameRate: 6, repeat: -1
    });
  }
}

// ====================== BeachScene ==========================
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
  }

  async create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.psyduckIntroManager = new PsyduckIntroManager(this);

    this.setupServerListeners();
    this.setupBeachEvents();
  }

  // ✅ === CONFIGURATION DES ÉCOUTES SERVEUR AVEC FALLBACK ===
  setupServerListeners() {
    if (!this.room) {
      console.warn(`⚠️ [BeachScene] Pas de room disponible pour les écoutes serveur`);
      console.log(`ℹ️ [BeachScene] Mode déconnecté: intro fallback disponible`);
      return;
    }

    console.log(`📡 [BeachScene] Configuration écoutes serveur`);

    // Écouter le déclenchement de l'intro depuis le serveur
    this.room.onMessage("triggerIntroSequence", (data) => {
      console.log("🎬 [BeachScene] Serveur demande intro:", data);
      
      if (data.shouldStartIntro && !this._introTriggered) {
        this._introTriggered = true;
        
        // Annuler le timer de fallback puisque le serveur a répondu
        if (this._fallbackTimer) {
          this._fallbackTimer.remove();
          this._fallbackTimer = null;
          console.log(`⏰ [BeachScene] Timer fallback annulé - serveur a répondu`);
        }
        
        // Déclencher l'intro avec un court délai
        this.time.delayedCall(500, () => {
          this.startPsyduckIntro();
        });
      }
    });

    // Écouter les autres messages de quêtes
    this.room.onMessage("questGranted", (data) => {
      console.log("🎁 [BeachScene] Nouvelle quête reçue:", data);
      // Optionnel: afficher une notification
    });

    this.room.onMessage("introQuestCompleted", (data) => {
      console.log("🎉 [BeachScene] Quête d'intro terminée:", data);
      // Optionnel: afficher une notification de fin
    });

    console.log(`✅ [BeachScene] Écoutes serveur configurées`);
  }

  // ✅ === NOUVELLE MÉTHODE: FALLBACK POUR L'INTRO SI PAS DE CONNEXION SERVEUR ===
  startIntroFallback() {
    if (this._introTriggered) {
      console.log(`ℹ️ [BeachScene] Intro déjà déclenchée`);
      return;
    }

    console.log(`🎬 [BeachScene] Démarrage intro en mode fallback (pas de serveur)`);
    this._introTriggered = true;
    
    // Démarrer l'intro Psyduck en mode fallback
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.startIntroFallback();
    }
  }

  update() {
    if (this.shouldBlockInput()) return;
    super.update();
  }

  shouldBlockInput() {
    // window.shouldBlockInput peut ne pas exister !
    const globalBlock = typeof window.shouldBlockInput === "function" ? window.shouldBlockInput() : false;
    return globalBlock || this._introBlocked;
  }

  // ✅ AMÉLIORATION: Position par défaut pour BeachScene
  getDefaultSpawnPosition(fromZone) {
    // Position par défaut selon la zone d'origine
    if (fromZone === 'VillageScene' || fromZone) {
      return { x: 52, y: 48 };
    }
    return { x: 360, y: 120 }; // Position par défaut
  }

  // ✅ === PLACEMENT JOUEUR AU SPAWN AVEC SYSTÈME D'INTRO AMÉLIORÉ ===
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    // ✅ AMÉLIORATION: Utiliser la méthode parent avec position par défaut
    super.positionPlayer(player);

    // 🎬 NOUVEAU: Déclencher la vérification d'intro automatique avec fallback
    if (!this._introTriggered && !this._serverCheckSent) {
      this._serverCheckSent = true;
      
      console.log(`🎬 [BeachScene] Demande vérification intro quest pour ${player.name || 'joueur'}`);
      
      // Délai pour s'assurer que la connexion est stable
      this.time.delayedCall(1500, () => {
        if (this.room) {
          console.log(`📤 [BeachScene] Envoi checkAutoIntroQuest`);
          this.room.send("checkAutoIntroQuest");
          
          // ✅ NOUVEAU: Timer de fallback si pas de réponse du serveur en 3 secondes
          this._fallbackTimer = this.time.delayedCall(3000, () => {
            if (!this._introTriggered) {
              console.log(`⏰ [BeachScene] Timeout serveur (3s), démarrage intro fallback`);
              this.startIntroFallback();
            }
            this._fallbackTimer = null;
          });
          
        } else {
          console.warn(`⚠️ [BeachScene] Pas de room, démarrage intro fallback immédiat`);
          this.startIntroFallback();
        }
      });
    }
  }

  // ✅ NOUVEAU: Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    // Logique spécifique à BeachScene si nécessaire
    console.log(`[BeachScene] Joueur positionné à (${player.x}, ${player.y})`);
  }

  // 🦆 INTRO PSYDUCK
  startPsyduckIntro() {
    if (this.psyduckIntroManager) {
      console.log(`🎬 [BeachScene] Démarrage intro Psyduck avec intégration serveur`);
      this.psyduckIntroManager.startIntro(() => {
        console.log("✅ [BeachScene] Intro Psyduck terminée");
      });
    }
  }

  // ==================== INTRO ANIMÉE CLASSIQUE (pour compatibilité) ======================
  startIntroSequence(player) {
    console.log("🎬 [BeachScene] Démarrage de l'intro animée classique");
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    // Animation du joueur (droite)
    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    // Spawn du Pokémon starter
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

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  // 🎮 Méthode pour déclencher manuellement le starter (via NPC, bouton, etc.)
  triggerStarterSelection() {
    if (window.starterHUD) {
      window.starterHUD.show();
    } else {
      console.warn("⚠️ HUD de starter non initialisé");
    }
  }

  // ✅ === MÉTHODES DE DEBUG ET TESTS ===
  
  // Méthode pour forcer l'intro en mode test
  forceStartIntro() {
    console.log(`🧪 [BeachScene] Force start intro (mode test)`);
    if (!this._introTriggered) {
      this._introTriggered = true;
      this.startPsyduckIntro();
    }
  }

  // Méthode pour reset l'état d'intro
  resetIntroState() {
    console.log(`🔄 [BeachScene] Reset intro state`);
    this._introTriggered = false;
    this._serverCheckSent = false;
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
  }

  // Méthode pour vérifier l'état de l'intro
  getIntroStatus() {
    return {
      introTriggered: this._introTriggered,
      serverCheckSent: this._serverCheckSent,
      fallbackTimerActive: this._fallbackTimer !== null,
      psyduckManagerReady: this.psyduckIntroManager !== null,
      roomConnected: this.room !== null
    };
  }

  // ✅ === NETTOYAGE ===
  cleanup() {
    console.log(`🧹 [BeachScene] Nettoyage...`);
    
    // Nettoyer les timers
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
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

  // ✅ === MÉTHODES HÉRITÉES (pour compatibilité) ===
  
  // Surcharge pour debug
  onDestroy() {
    console.log(`💀 [BeachScene] Destruction de la scène`);
    this.cleanup();
  }

  // Debug de l'état de la scène
  debugSceneState() {
    console.log(`🔍 [BeachScene] === DEBUG SCENE STATE ===`);
    console.log(`📊 Intro Status:`, this.getIntroStatus());
    console.log(`🏖️ Beach Events:`, {
      pokemonManagerReady: this.pokemonSpriteManager !== null,
      inputBlocked: this._introBlocked,
      roomConnected: this.room !== null
    });
    console.log(`=======================================`);
  }
}
