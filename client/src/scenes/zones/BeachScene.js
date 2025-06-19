// ===============================================
// BeachScene.js - Intro Bulbizarre animé + dialogue + transition + blocage joueur
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

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
    super('BeachScene', 'GreenRootBeach');
    this.transitionCooldowns = {};
    this.pokemonSpriteManager = null;
    this._introBlocked = false;
  }

  create() {
    super.create();
    this.pokemonSpriteManager = new PokemonSpriteManager(this);
    this.setupBeachEvents();
  }

  // --- Gère la transition vers VillageScene ---
setupZoneTransitions() {
  const worldsLayer = this.map.getObjectLayer('Worlds');
  if (!worldsLayer) {
    console.warn("Layer 'Worlds' non trouvé dans la map");
    return;
  }

  const player = this.playerManager.getMyPlayer();
  if (!player) {
    console.warn("Player non encore créé, impossible d'ajouter les overlaps de transition");
    return;
  }
  if (!player.body) {
    console.warn("Player.body non créé, impossible d'ajouter les overlaps de transition");
    return;
  }

  worldsLayer.objects.forEach(obj => {
    const targetZoneProp = obj.properties?.find(p => p.name === 'targetZone');
    const directionProp = obj.properties?.find(p => p.name === 'direction');
    if (!targetZoneProp) {
      console.warn(`Objet ${obj.name || obj.id} dans 'Worlds' sans propriété targetZone, ignoré`);
      return;
    }

    const targetZone = targetZoneProp.value;
    const direction = directionProp ? directionProp.value : 'north';

    console.log(`Création zone transition vers ${targetZone} à (${obj.x},${obj.y}) taille ${obj.width}x${obj.height}`);

    const zone = this.add.zone(
      obj.x + obj.width / 2,
      obj.y + obj.height / 2,
      obj.width,
      obj.height
    );
    this.physics.world.enable(zone);
    zone.body.setAllowGravity(false);
    zone.body.setImmovable(true);

    this.physics.add.overlap(player, zone, () => {
      if (!this.networkManager) {
        console.warn("networkManager non défini, transition ignorée");
        return;
      }
      console.log(`Overlap détecté, demande de transition vers ${targetZone} (${direction})`);
      this.networkManager.requestZoneTransition(targetZone, direction);
    });
  });
}

  // --- Gère le placement joueur au spawn ---
  positionPlayer(player) {
    const initData = this.scene.settings.data;

    if (initData?.fromZone === 'VillageScene' || initData?.fromZone) {
      player.x = 52;
      player.y = 48;
    }
    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }
    if (this.networkManager) this.networkManager.sendMove(player.x, player.y);

    // Intro : seulement si spawn direct depuis menu (pas une transition)
    if (!initData?.fromZone) this.startIntroSequence(player);
  }

  // ==================== INTRO ANIMÉE ======================
  startIntroSequence(player) {
    // 1. Bloque les entrées joueur (clavier + collisions)
    this.input.keyboard.enabled = false;
    if (player.body) player.body.enable = false;
    this._introBlocked = true;

    // 2. Tourne le joueur vers la droite (ex : anim ou frame statique)
    if (player.anims && player.anims.currentAnim?.key !== 'walk_right') {
      if (this.anims.exists('walk_right')) player.play('walk_right');
    }

    // 3. Bulbizarre spawn loin à droite, arrive devant le joueur
    const spawnX = player.x + 120;
    const arriveX = player.x + 24; // devant le joueur
    const y = player.y;

    this.spawnStarterPokemon(spawnX, y, '001_Bulbasaur', 'left', player, arriveX);
  }

  // Bulbizarre entre, pause, repart au nord
  spawnStarterPokemon(x, y, pokemonName, direction = "left", player = null, arriveX = null) {
    this.pokemonSpriteManager.loadSpritesheet(pokemonName);

    const trySpawn = () => {
      if (this.textures.exists(`${pokemonName}_Walk`)) {
        const starter = this.pokemonSpriteManager.createPokemonSprite(pokemonName, x, y, direction);

        // Avance lentement vers le joueur
        this.tweens.add({
          targets: starter,
          x: arriveX ?? (x - 36),
          duration: 2200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Forcer l’anim du joueur vers la droite
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
    // Dialogue
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

    // 2s pause devant le joueur, puis Bulbizarre part vers le nord
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
          // Débloque le joueur !
          this.input.keyboard.enabled = true;
          if (player.body) player.body.enable = true;
          this._introBlocked = false;
          if (player.anims && this.anims.exists('idle_down')) player.play('idle_down');
        }
      });
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
