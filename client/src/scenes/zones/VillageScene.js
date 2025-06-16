// ===============================================
// VillageScene.js - Version corrigée avec cooldown de transition + Labo
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'Greenroot');
    this.transitionCooldowns = {}; // ✅ AJOUT : Cooldowns par zone de transition
  }

  setupZoneTransitions() {
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (worldsLayer) {
      // Transition vers la plage
      const beachExit = worldsLayer.objects.find(obj => obj.name === 'GRbeach');
      if (beachExit) {
        this.createTransitionZone(beachExit, 'BeachScene', 'south');
      }

      // ✅ Transition vers Road1
      const roadExit = worldsLayer.objects.find(obj => obj.name === 'Road_1');
      if (roadExit) {
        this.createTransitionZone(roadExit, 'Road1Scene', 'east');
        console.log(`🛣️ Transition vers Road1 trouvée !`);
      } else {
        console.warn(`⚠️ Objet 'Road_1' non trouvé dans le layer Worlds`);
        // Debug : Lister tous les objets du layer Worlds
        console.log("Objets disponibles dans Worlds:", worldsLayer.objects.map(obj => obj.name));
      }
    }

    // ✅ AJOUT : Vérifier le layer Door pour le laboratoire
    const doorLayer = this.map.getObjectLayer('Doors');
    if (doorLayer) {
      const labDoor = doorLayer.objects.find(obj => obj.name === 'Labo');
      if (labDoor) {
        this.createTransitionZone(labDoor, 'VillageLabScene', 'north');
        console.log(`🧪 Transition vers Laboratoire trouvée !`);
      } else {
        console.warn(`⚠️ Objet 'Labo' non trouvé dans le layer Door`);
        console.log("Objets disponibles dans Door:", doorLayer.objects.map(obj => obj.name));
      }
    } else {
      console.warn(`⚠️ Layer 'Door' non trouvé`);
    }
  }

  createTransitionZone(transitionObj, targetScene, direction) {
    const transitionZone = this.add.zone(
      transitionObj.x + transitionObj.width / 2,
      transitionObj.y + transitionObj.height / 2,
      transitionObj.width,
      transitionObj.height
    );

    this.physics.world.enable(transitionZone);
    transitionZone.body.setAllowGravity(false);
    transitionZone.body.setImmovable(true);

    console.log(`🚪 Zone de transition créée vers ${targetScene} (${direction})`, transitionZone);

    // ✅ CORRECTION : Attendre que le joueur soit créé puis créer l'overlap UNE SEULE FOIS
    let overlapCreated = false;

    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && !overlapCreated) {
          overlapCreated = true;

          this.physics.add.overlap(myPlayer, transitionZone, () => {
            // ✅ AJOUT : Vérifier le cooldown pour éviter les transitions multiples
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log(`[Transition] Cooldown actif ou déjà en transition vers ${targetScene}`);
              return;
            }

            // ✅ AJOUT : Activer le cooldown
            this.transitionCooldowns[cooldownKey] = true;
            console.log(`[Transition] Demande transition vers ${targetScene} (${direction})`);

            // ✅ AJOUT : Désactiver temporairement la zone de transition
            transitionZone.body.enable = false;

            this.networkManager.requestZoneTransition(targetScene, direction);

            // ✅ AJOUT : Réactiver après un délai (au cas où la transition échoue)
            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) {
                delete this.transitionCooldowns[cooldownKey];
              }
              if (transitionZone.body) {
                transitionZone.body.enable = true;
              }
            });
          });

          checkPlayerInterval.remove();
          console.log(`✅ Overlap créé pour transition vers ${targetScene}`);
        }
      },
    });
  }

  positionPlayer(player) {
    console.log("🚨 DEBUT positionPlayer() dans VillageScene");
    const initData = this.scene.settings.data;
    console.log("🚨 initData:", initData);

    const spawnLayer = this.map.getObjectLayer('SpawnPoint');
    if (spawnLayer) {
      let spawnPoint = null;

      // Choisir le bon spawn point selon la zone d'origine
      if (initData?.fromZone === 'BeachScene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        if (spawnPoint) {
          player.x = spawnPoint.x + spawnPoint.width / 2;
          player.y = spawnPoint.y + spawnPoint.height / 2;
          console.log(`🎯 Joueur positionné au SpawnPoint depuis BeachScene: ${player.x}, ${player.y}`);
        }
      } else if (initData?.fromZone === 'Road1Scene') {
        // ✅ Spawn point pour retour depuis Road1
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Road1') ||
                     spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        if (spawnPoint) {
          player.x = spawnPoint.x + spawnPoint.width / 2;
          player.y = spawnPoint.y + spawnPoint.height / 2;
          console.log(`🛣️ Joueur positionné depuis Road1: ${player.x}, ${player.y}`);
        }
      } else if (initData?.fromZone === 'VillageLabScene') {
        // ✅ AJOUT : Spawn point pour retour depuis le Laboratoire
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Labo') ||
                     spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        if (spawnPoint) {
          player.x = spawnPoint.x + spawnPoint.width / 2;
          player.y = spawnPoint.y + spawnPoint.height / 2;
          console.log(`🧪 Joueur positionné depuis Laboratoire: ${player.x}, ${player.y}`);
        }
      } else {
        // Position par défaut
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        if (spawnPoint) {
          player.x = spawnPoint.x + spawnPoint.width / 2;
          player.y = spawnPoint.y + spawnPoint.height / 2;
          console.log(`🎯 Joueur positionné au SpawnPoint par défaut: ${player.x}, ${player.y}`);
        } else {
          player.x = 200;
          player.y = 150;
          console.log(`⚠️ Pas de SpawnPoint trouvé, position par défaut: ${player.x}, ${player.y}`);
        }
      }
    } else {
      // Fallback sans layer SpawnPoint
      if (initData?.fromZone === 'BeachScene') {
        player.x = 150;
        player.y = 200;
        console.log(`🚪 Pas de SpawnLayer, position depuis BeachScene: ${player.x}, ${player.y}`);
      } else if (initData?.fromZone === 'Road1Scene') {
        player.x = 100;
        player.y = 150;
        console.log(`🛣️ Pas de SpawnLayer, position depuis Road1: ${player.x}, ${player.y}`);
      } else if (initData?.fromZone === 'VillageLabScene') {
        // ✅ AJOUT : Position fallback depuis le Laboratoire
        player.x = 250;
        player.y = 180;
        console.log(`🧪 Pas de SpawnLayer, position depuis Laboratoire: ${player.x}, ${player.y}`);
      } else {
        player.x = 200;
        player.y = 150;
        console.log(`🏘️ Pas de SpawnLayer, position par défaut: ${player.x}, ${player.y}`);
      }
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }
    console.log("🚨 FIN positionPlayer()");
  }

  create() {
    console.log("🚨 DEBUT VillageScene.create()");
    super.create();

    this.add
      .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
        font: '18px monospace',
        fill: '#000000',
        padding: { x: 20, y: 10 },
        backgroundColor: '#ffffff',
      })
      .setScrollFactor(0)
      .setDepth(30);

    this.setupVillageEvents();
    this.setupNPCs();

    console.log("🚨 FIN VillageScene.create()");
  }

  setupVillageEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🏘️ Bienvenue à GreenRoot Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nGreenRoot Village\nConnected!');
      }
    });
  }

  setupNPCs() {
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      npcLayer.objects.forEach(npcObj => {
        this.createNPC(npcObj);
      });
    }
  }

  createNPC(npcData) {
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x3498db
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Villageois');
    });

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`, npc);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    const dialogues = {
      Maire: "Bienvenue à GreenRoot ! C'est un village paisible.",
      Marchand: "J'ai de super objets à vendre ! Revenez plus tard.",
      Enfant: "J'ai vu des Pokémon près de la forêt !",
      Villageois: "Bonjour ! Belle journée, n'est-ce pas ?",
      Professeur: "Rendez-vous au laboratoire si vous voulez un Pokémon !",
    };
    const message = dialogues[npcName] || 'Bonjour, voyageur !';
    const dialogueBox = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        `${npcName}: "${message}"`,
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 10, y: 8 },
          wordWrap: { width: 300 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
    });
  }

  // ✅ AJOUT : Nettoyage des cooldowns lors de la destruction de la scène
  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}