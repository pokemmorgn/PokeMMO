import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'Greenroot');
    this.transitionCooldowns = {};
  }

  
    const doorLayer = this.map.getObjectLayer('Door');
    if (doorLayer) {
      const labDoor = doorLayer.objects.find(obj => obj.name === 'Labo');
      if (labDoor) {
        this.createTransitionZone(labDoor, 'VillageLabScene', 'north');
        console.log(`🧪 Transition vers Laboratoire trouvée !`);
      } else {
        console.warn(`⚠️ Objet 'Labo' non trouvé dans le layer Door`);
        console.log("Objets disponibles dans Door:", doorLayer.objects.map(obj => obj.name));
      }

      // ✅ AJOUT : Transition vers VillageHouse1
      const house1Door = doorLayer.objects.find(obj => obj.name === 'House1');
      if (house1Door) {
        this.createTransitionZone(house1Door, 'VillageHouse1Scene', 'inside');
        console.log(`🏠 Transition vers VillageHouse1 trouvée !`);
      } else {
        console.warn(`⚠️ Objet 'House1' non trouvé dans le layer Door`);
      }
    } else {
      console.warn(`⚠️ Layer 'Door' non trouvé`);
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
        // ✅ AJOUT : Spawn depuis la maison
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

  create() {
    console.log("🚨 DEBUT VillageScene.create()");
    super.create();

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);

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
