import { BaseZoneScene } from './BaseZoneScene.js';


export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'Greenroot');
    this.transitionCooldowns = {};
  }

 create() {
  console.log("🚨 DEBUT VillageScene.create()");
  super.create(); // appelle BaseZoneScene.create() qui crée playerManager

  // Supprime cette ligne, BaseZoneScene s’en charge déjà :
  // this.playerManager = new PlayerManager(this);

  this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
    font: '18px monospace',
    fill: '#000000',
    padding: { x: 20, y: 10 },
    backgroundColor: '#ffffff',
  }).setScrollFactor(0).setDepth(30);

  this.setupVillageEvents();
  this.setupNPCs();

  this.time.delayedCall(100, () => {
    this.setupZoneTransitions();
  });

  console.log("🚨 FIN VillageScene.create()");
}

  setupZoneTransitions() {
    // Gestion du layer Worlds pour transitions classiques
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn("Layer 'Worlds' non trouvé dans la map");
      return;
    }

    const player = this.playerManager.getMyPlayer();
    if (!player) {
      console.warn("Player non encore créé, impossible d'ajouter les overlaps de transition");
      // Retry avec délai
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
    }
    if (!player.body) {
      console.warn("Player.body non créé, impossible d'ajouter les overlaps de transition");
      // Retry avec délai
      this.time.delayedCall(100, () => this.setupZoneTransitions());
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

    // Gestion du layer Door pour transitions vers Labo et House1
    const doorLayer = this.map.getObjectLayer('Door');
    if (!doorLayer) {
      console.warn(`⚠️ Layer 'Door' non trouvé`);
      return;
    }

    const labDoor = doorLayer.objects.find(obj => obj.name === 'Labo');
    if (labDoor) {
      this.createTransitionZone(labDoor, 'VillageLabScene', 'north');
      console.log(`🧪 Transition vers Laboratoire trouvée !`);
    } else {
      console.warn(`⚠️ Objet 'Labo' non trouvé dans le layer Door`);
      console.log("Objets disponibles dans Door:", doorLayer.objects.map(obj => obj.name));
    }

    const house1Door = doorLayer.objects.find(obj => obj.name === 'House1');
    if (house1Door) {
      this.createTransitionZone(house1Door, 'VillageHouse1Scene', 'inside');
      console.log(`🏠 Transition vers VillageHouse1 trouvée !`);
    } else {
      console.warn(`⚠️ Objet 'House1' non trouvé dans le layer Door`);
    }
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;
    const spawnLayer = this.map.getObjectLayer('SpawnPoint');
    let spawnPoint = null;

    if (spawnLayer) {
      if (initData?.fromZone === 'BeachScene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
      } else if (initData?.fromZone === 'Road1Scene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRtop');
      } else if (initData?.fromZone === 'VillageLabScene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Labo');
      } else if (initData?.fromZone === 'VillageHouse1Scene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_House1');
      } else {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
      }

      if (spawnPoint) {
        player.x = spawnPoint.x + spawnPoint.width / 2;
        player.y = spawnPoint.y + spawnPoint.height / 2;
      } else {
        player.x = 200;
        player.y = 150;
      }
    } else {
      // Fallback sans spawnLayer
      if (initData?.fromZone === 'BeachScene') {
        player.x = 150;
        player.y = 200;
      } else if (initData?.fromZone === 'Road1Scene') {
        player.x = 100;
        player.y = 150;
      } else if (initData?.fromZone === 'VillageLabScene') {
        player.x = 250;
        player.y = 180;
      } else if (initData?.fromZone === 'VillageHouse1Scene') {
        player.x = 220;
        player.y = 160;
      } else {
        player.x = 200;
        player.y = 150;
      }
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }
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
    const dialogueBox = this.add.text(
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
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
