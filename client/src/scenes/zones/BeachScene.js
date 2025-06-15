// ===============================================
// BeachScene.js - Intro starter carré + dialogue en bas + cooldown
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class BeachScene extends BaseZoneScene {
  constructor() {
    super('BeachScene', 'GreenRootBeach');
    this.transitionCooldowns = {};
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

  startIntroSequence(player) {
    // Starter (carré bleu) qui s’approche du joueur
    this.spawnStarterPokemon(player.x + 48, player.y);
  }

  spawnStarterPokemon(x, y) {
    const starter = this.add.rectangle(x, y, 24, 24, 0x66ccff)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(5);

    // Animation pour venir à côté du joueur
    this.tweens.add({
      targets: starter,
      x: x - 36,
      duration: 700,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.showIntroDialogue(starter);
      }
    });
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

    // Après 2s, retire le carré et le texte
    this.time.delayedCall(2000, () => {
      starter.destroy();
      textBox.destroy();
      // Enchaîner la suite ici si tu veux (ex : mouvement auto vers le village)
    });
  }

  create() {
    super.create();
    this.setupBeachEvents();
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
