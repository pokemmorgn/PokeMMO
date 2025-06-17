// ===============================================
// BeachScene.js - Intro starter Bulbizarre animé + dialogue en bas + cooldown
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

// Mini-manager pour spritesheets Pokémon 2x4 (27x27px)
class PokemonSpriteManager {
  constructor(scene) {
    this.scene = scene;
  }

  loadSpritesheet(pokemonName) {
    const key = `${pokemonName}_Walk`;
    if (!this.scene.textures.exists(key)) {
      this.scene.load.spritesheet(key, `assets/pokemon/${pokemonName}.png`, {
        frameWidth: 27,
        frameHeight: 27,
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
      frames: [ { key, frame: 0 }, { key, frame: 1 } ],
      frameRate: 6,
      repeat: -1
    });
    anims.create({
      key: `${key}_down`,
      frames: [ { key, frame: 2 }, { key, frame: 3 } ],
      frameRate: 6,
      repeat: -1
    });
    anims.create({
      key: `${key}_left`,
      frames: [ { key, frame: 4 }, { key, frame: 5 } ],
      frameRate: 6,
      repeat: -1
    });
    anims.create({
      key: `${key}_right`,
      frames: [ { key, frame: 6 }, { key, frame: 7 } ],
      frameRate: 6,
      repeat: -1
    });
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

    console.log(`🚪 Zone de transition créée vers ${targetScene}`, zone);

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
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log(`[Transition] Cooldown actif ou déjà en transition vers ${targetScene}`);
              return;
            }
            this.transitionCooldowns[cooldownKey] = true;
            console.log("[Transition] Demande transition vers", targetScene);
            zone.body.enable = false;
            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) delete this.transitionCooldowns[cooldownKey];
              if (zone.body) zone.body.enable = true;
            });
          });

          checkPlayerInterval.remove();
          console.log(`✅ Overlap créé pour transition vers ${targetScene}`);
        }
      },
    });
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;

    // Spawn logique classique
    if (initData?.fromZone === 'VillageScene') {
      player.x = 52;
      player.y = 48;
      console.log(`🚪 Joueur positionné depuis VillageScene: ${player.x}, ${player.y}`);
    } else if (initData?.fromZone) {
      player.x = 52;
      player.y = 48;
      console.log(`🚪 Joueur positionné depuis ${initData.fromZone}: ${player.x}, ${player.y}`);
    } else {
      console.log(`🏖️ Joueur positionné à la position sauvée du serveur: (${player.x}, ${player.y})`);
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }

    // 👉 INTRODUCTION — Affiche le starter et le dialogue au premier spawn (temporaire : toujours !)
    if (!initData?.fromZone) { // Premier spawn depuis le menu (pas une transition)
      this.startIntroSequence(player);
    }
  }

  create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.setupBeachEvents();
  }

  // --- Intro Bulbizarre animé (starter Pokémon) ---
  startIntroSequence(player) {
    this.spawnStarterPokemon(player.x + 80, player.y, '001_Bulbasaur', 'left');
  }

  spawnStarterPokemon(x, y, pokemonName, direction = "left") {
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);

    // Attend que le spritesheet soit chargé avant de créer le sprite animé
    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);

        // Animation pour venir à côté du joueur
        this.tweens.add({
          targets: starter,
          x: x - 36,
          duration: 700,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            starter.play(`${pokemonName}_Walk_left`);
            this.showIntroDialogue(starter);
          }
        });
      } else {
        this.time.delayedCall(50, trySpawn);
      }
    };
    trySpawn();
  }

  showIntroDialogue(starter) {
    // Boîte de dialogue au-dessus du starter
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

    // Après 2s, retire le Pokémon et le texte
    this.time.delayedCall(2000, () => {
      starter.destroy();
      textBox.destroy();
      // Ici tu peux enchaîner vers le déplacement auto ou la suite si tu veux
    });
  }

  setupBeachEvents() {
    this.time.delayedCall(2000, () => {
      console.log("🏖️ Bienvenue sur la plage de GreenRoot !");
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
