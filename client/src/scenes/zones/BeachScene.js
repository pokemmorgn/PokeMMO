// ===============================================
// BeachScene.js - Intro starter Bulbizarre animé + dialogue + blocage joueur
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

// Mini-manager pour spritesheet 2x4 Pokémon (tu peux sortir la classe si besoin)
class PokemonSpriteManager {
  constructor(scene) {
    this.scene = scene;
  }

  loadSpritesheet(pokemonName) {
    const key = `${pokemonName}_Walk`;
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 32,
        frameHeight: 32,
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

  // 2x4 format : 0-1 up, 2-3 down, 4-5 left, 6-7 right
  createAnimations(key) {
    const anims = this.scene.anims;
    if (!anims.exists(`${key}_up`)) {
      anims.create({ key: `${key}_up`, frames: anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
      anims.create({ key: `${key}_down`, frames: anims.generateFrameNumbers(key, { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
      anims.create({ key: `${key}_left`, frames: anims.generateFrameNumbers(key, { start: 4, end: 5 }), frameRate: 6, repeat: -1 });
      anims.create({ key: `${key}_right`, frames: anims.generateFrameNumbers(key, { start: 6, end: 7 }), frameRate: 6, repeat: -1 });
    }
  }
}

export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    this.transitionCooldowns = {};
    this.pokemonSpriteManager = null;
  }

  setupZoneTransitions() {
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (worldsLayer) {
      const greenRootObj = worldsLayer.objects.find(obj => obj.name === 'GR');
      if (greenRootObj) {
        this.createTransitionZone(greenRootObj, 'VillageScene', 'north');
      }
    }
  }

  createTransitionZone(transitionObj, targetScene, direction) {
    const zone = this.add.zone(
      transitionObj.x + transitionObj.width / 2,
      transitionObj.y + transitionObj.height / 2,
      transitionObj.width,
      transitionObj.height
    );

    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.setImmovable(true);

    let overlapCreated = false;
    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && !overlapCreated) {
          overlapCreated = true;

          this.physics.add.overlap(myPlayer, zone, () => {
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) return;
            this.transitionCooldowns[cooldownKey] = true;
            zone.body.enable = false;
            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) delete this.transitionCooldowns[cooldownKey];
              if (zone.body) zone.body.enable = true;
            });
          });

          checkPlayerInterval.remove();
        }
      },
    });
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;

    if (initData?.fromZone === 'VillageScene') {
      player.x = 52; player.y = 48;
    } else if (initData?.fromZone) {
      player.x = 52; player.y = 48;
    }
    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }
    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }

    // Intro (seulement sur premier spawn)
    if (!initData?.fromZone) this.startIntroSequence(player);
  }

  create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.setupBeachEvents();
  }

  // ===============================
  // INTRO : Starter animé + lock player
  // ===============================
  startIntroSequence(player) {
    // 1. Bloque tous les contrôles joueur
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    // 2. Bulbizarre spawn loin à droite et arrive devant le joueur
    this.spawnStarterPokemon(player.x + 120, player.y, '001_Bulbasaur', 'left', player);
  }

  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null) {
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);

    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);

        // Bulbizarre avance vers le joueur
        this.tweens.add({
          targets: starter,
          x: x - 120, // arrive pile devant le joueur
          duration: 2200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Pendant l'arrivée, le joueur regarde à droite
            if (player && player.anims && player.anims.currentAnim?.key !== 'walk_right') {
              player.play('walk_right', true);
              player.lastDirection = 'right';
            }
          },
          onComplete: () => {
            // Bulbizarre idle devant joueur, joueur aussi
            starter.play(`${pokemonName}_Walk_left`);
            if (player) player.play('idle_right');
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
    // Dialogue au-dessus de Bulbizarre
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

    // Après 2s, Bulbizarre repart vers le nord (tp village) et disparait
    this.time.delayedCall(2000, () => {
      textBox.destroy();

      // Bulbizarre monte (vers zone village)
      this.tweens.add({
        targets: starter,
        y: starter.y - 90, // distance à ajuster selon ta map
        duration: 1600,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          // Joue anim vers le haut
          starter.play(`${starter.texture.key}_up`, true);
        },
        onComplete: () => {
          starter.destroy();

          // 4. Débloque le joueur et le clavier !
          this.input.keyboard.enabled = true;
          if (player.body) player.body.enable = true;
          this._introBlocked = false;
          if (player) player.play('idle_down');
        }
      });
    });
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      // Pour debug/ambiance
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
