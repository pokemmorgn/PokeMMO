// ===============================================
// BeachScene.js - Beach + Intro automatique avec fix timing complet (flow clientReady)
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
    this._roomConnectionTimer = null;
    this._clientReadySent = false;
  }

  async create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.psyduckIntroManager = new PsyduckIntroManager(this, this.room);

    // ✅ Configurer les listeners immédiatement si room disponible
    this.setupEarlyListeners();
    this.setupBeachEvents();
  }

  // === SETUP LISTENERS TÔT, puis send clientReady ===
  setupEarlyListeners() {
    const checkRoom = () => {
      if (this.room) {
        console.log(`📡 [BeachScene] Room détectée dans create(), setup listeners`);
        this.psyduckIntroManager.ensureListenersSetup();
        this.setupServerListeners();
        this.time.delayedCall(20, () => {
         // this.sendClientReady();
        });
        return true;
      }
      return false;
    };

    if (!checkRoom()) {
      let attempts = 0;
      const maxAttempts = 60;
      const roomTimer = this.time.addEvent({
        delay: 50,
        repeat: maxAttempts,
        callback: () => {
          attempts++;
          if (checkRoom()) {
            roomTimer.remove();
          } else if (attempts >= maxAttempts) {
            console.log(`⚠️ [BeachScene] Timeout attente room dans create()`);
            roomTimer.remove();
          }
        }
      });
    }
  }

  // === Envoi clientReady (flow 100% sûr) ===
  sendClientReady() {
    if (this.room && !this._clientReadySent) {
      this.room.send("clientReady");
      this._clientReadySent = true;
      console.log("🚦 [BeachScene] clientReady envoyé au serveur");
      // Ici, on n'envoie plus jamais checkAutoIntroQuest !
    }
  }

  // === Plus d'appel à triggerIntroCheck ni checkAutoIntroQuest dans cette version ===

  // === CONFIGURATION ÉCOUTES SERVEUR SIMPLIFIÉE ===
  setupServerListeners() {
    if (!this.room) {
      console.warn(`⚠️ [BeachScene] Pas de room disponible pour les écoutes serveur`);
      console.log(`ℹ️ [BeachScene] Mode déconnecté: intro fallback disponible`);
      return;
    }

    console.log(`📡 [BeachScene] Configuration écoutes serveur avec room connectée`);

    // NE PAS écouter triggerIntroSequence ici - c'est PsyduckIntroManager qui s’en charge
    this.room.onMessage("questGranted", (data) => {
      console.log("🎁 [BeachScene] Nouvelle quête reçue (BeachScene):", data);
    });

    this.room.onMessage("introQuestCompleted", (data) => {
      console.log("🎉 [BeachScene] Quête d'intro terminée (BeachScene):", data);
    });

    console.log(`✅ [BeachScene] Écoutes serveur BeachScene configurées`);
  }

  // === Fallback si pas de serveur ou bug côté serveur ===
  startIntroFallback() {
    if (this._introTriggered) {
      console.log(`ℹ️ [BeachScene] Intro déjà déclenchée`);
      return;
    }
    console.log(`🎬 [BeachScene] Démarrage intro en mode fallback (pas de serveur)`);
    this._introTriggered = true;
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.startIntroFallback();
    }
  }

  // === POSITION PLAYER CORRIGÉE ===
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    super.positionPlayer(player);
    console.log(`👤 [BeachScene] Joueur positionné: ${player.name || 'joueur'} à (${player.x}, ${player.y})`);
    if (!this._introTriggered && !this._serverCheckSent) {
      this.time.delayedCall(200, () => {
        if (!this._introTriggered) {
          this._introTriggered = true;
          this.startIntroWithServerDetection();
        }
      });
    }
  }

  // === Hook après positionnement joueur
  onPlayerPositioned(player, initData) {
    console.log(`✅ [BeachScene] Joueur définitivement positionné à (${player.x}, ${player.y})`);
    if (player.setVisible) player.setVisible(true);
    if (player.alpha !== undefined) player.alpha = 1;
    console.log(`👁️ [BeachScene] Visibilité joueur vérifiée`);
  }

  // === Démarrage intro + détection serveur (utilisé seulement si fallback nécessaire)
  startIntroWithServerDetection() {
    console.log(`🎬 [BeachScene] Démarrage intro avec détection serveur en parallèle`);
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.startIntroFallback();
    }
    // (Pas besoin de checkAutoIntroQuest ici)
  }

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

  // === Intro Psyduck classique ===
  startPsyduckIntro() {
    if (this.psyduckIntroManager) {
      console.log(`🎬 [BeachScene] Démarrage intro Psyduck avec intégration serveur`);
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

  // === Debug et autres méthodes (inchangées) ===

  forceStartIntro() {
    console.log(`🧪 [BeachScene] Force start intro (mode test)`);
    if (!this._introTriggered) {
      this._introTriggered = true;
      this.psyduckIntroManager.ensureListenersSetup();
      this.startPsyduckIntro();
    }
  }

  resetIntroState() {
    console.log(`🔄 [BeachScene] Reset intro state`);
    this._introTriggered = false;
    this._serverCheckSent = false;
    this._clientReadySent = false;
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
    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer) {
      console.log(`👤 Joueur:`, {
        x: myPlayer.x,
        y: myPlayer.y,
        visible: myPlayer.visible,
        alpha: myPlayer.alpha,
        exists: true
      });
    } else {
      console.log(`👤 Joueur: NON TROUVÉ`);
    }
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.debugStatus();
    }
    console.log(`=======================================`);
  }

  cleanup() {
    console.log(`🧹 [BeachScene] Nettoyage...`);
    if (this._fallbackTimer) {
      this._fallbackTimer.remove();
      this._fallbackTimer = null;
    }
    if (this._roomConnectionTimer) {
      this._roomConnectionTimer.remove();
      this._roomConnectionTimer = null;
    }
    if (this.psyduckIntroManager) {
      this.psyduckIntroManager.destroy();
      this.psyduckIntroManager = null;
    }
    this.transitionCooldowns = {};
    this._introTriggered = false;
    this._serverCheckSent = false;
    this._clientReadySent = false;
    console.log(`✅ [BeachScene] Nettoyage terminé`);
    super.cleanup();
  }

  onDestroy() {
    console.log(`💀 [BeachScene] Destruction de la scène`);
    this.cleanup();
  }

  // === Compatibilité, intro animée starter (inutile pour intro server)
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
