// ===============================================
// BeachScene.js - Intro Bulbizarre animé + dialogue + transition + blocage joueur
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

// --- Mini-manager pour spritesheets Pokémon 2x4 (27x27px) ---
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
    anims.create({ key: `${key}_up`, frames: [{ key, frame: 0 }, { key, frame: 1 }], frameRate: 6, repeat: -1 });
    anims.create({ key: `${key}_down`, frames: [{ key, frame: 2 }, { key, frame: 3 }], frameRate: 6, repeat: -1 });
    anims.create({ key: `${key}_left`, frames: [{ key, frame: 4 }, { key, frame: 5 }], frameRate: 6, repeat: -1 });
    anims.create({ key: `${key}_right`, frames: [{ key, frame: 6 }, { key, frame: 7 }], frameRate: 6, repeat: -1 });
  }
}

// ================= BeachScene ===================
export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
  }

  create() {
    super.create(); // tout le setup de base (map, managers, UI, transitions, etc.)
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  // --- Configuration des transitions ---
  getTransitionConfig() {
    return {
      'GR': { targetScene: 'VillageScene', direction: 'north' }
      // Ajoute d'autres transitions ici si besoin
    };
  }

  // --- Hook appelé après positionnement joueur (BaseZoneScene) ---
  onPlayerPositioned(player, initData) {
    // Si on spawn directement (pas via une transition), lancer l’intro animée
    if (!initData?.fromZone) {
      this.startIntroSequence(player);
    }
  }

  // ==================== INTRO ANIMÉE ======================
  startIntroSequence(player) {
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
    const textBox = this.add.text(
      starter.x, starter.y - 32,
      "Salut ! Tu viens d’arriver ? Je t’emmène au village !",
      {
        fontSize: "13px",
        color: "#fff",
        backgroundColor: "#114",
        padding: { x: 6, y: 4 }
      }
    ).setDepth(1000).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      textBox.destroy();
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
          // Débloque le joueur
          this.input.keyboard.enabled = true;
          if (player.body) player.body.enable = true;
          this._introBlocked = false;
          if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        }
      });
    });
  }

  // Le cleanup général est déjà fait par BaseZoneScene
}
