// ===============================================
// BeachScene.js - Beach + Intro automatique (sans starter automatique)
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

  }

  async create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.psyduckIntroManager = new PsyduckIntroManager(this);

    this.setupServerListeners();
    this.setupBeachEvents();
  }

  setupServerListeners() {
  if (!this.room) {
    console.warn(`⚠️ [BeachScene] Pas de room disponible pour les écoutes serveur`);
    return;
  }

  console.log(`📡 [BeachScene] Configuration écoutes serveur`);

  // Écouter le déclenchement de l'intro depuis le serveur
  this.room.onMessage("triggerIntroSequence", (data) => {
    console.log("🎬 [BeachScene] Serveur demande intro:", data);
    
    if (data.shouldStartIntro && !this._introTriggered) {
      this._introTriggered = true;
      
      // Déclencher l'intro avec un court délai
      this.time.delayedCall(500, () => {
        this.startPsyduckIntro();
      });
    }
  });

  console.log(`✅ [BeachScene] Écoutes serveur configurées`);
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

  // --- Gère le placement joueur au spawn ---
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    // ✅ AMÉLIORATION: Utiliser la méthode parent avec position par défaut
    super.positionPlayer(player);

    // 🎬 Déclencher l'intro automatiquement (seulement si pas déjà fait)
    // if (!this._introTriggered && !initData?.fromZone) {
    //   this._introTriggered = true;
    //   this.time.delayedCall(1500, () => {
    //     this.startPsyduckIntro();
    //   });
    // }
    
    // L'intro sera déclenchée UNIQUEMENT par le serveur via triggerIntroSequence
  }

  // ✅ NOUVEAU: Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    // Logique spécifique à BeachScene si nécessaire
    console.log(`[BeachScene] Joueur positionné à (${player.x}, ${player.y})`);
}

// 🦆 INTRO PSYDUCK
startPsyduckIntro() {
    if (this.psyduckIntroManager) {
        this.psyduckIntroManager.startIntro(() => {
            console.log("✅ Intro Psyduck terminée");
        });
    }
}

  // ==================== INTRO ANIMÉE ======================
  startIntroSequence(player) {
    console.log("🎬 Démarrage de l'intro animée");
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
        console.log("✅ Intro terminée, joueur débloqué");
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

  cleanup() {
    this.transitionCooldowns = {};
    this._introTriggered = false;
    if (this.psyduckIntroManager) {
  this.psyduckIntroManager.destroy();
  this.psyduckIntroManager = null;
}
    super.cleanup();
  }
}
