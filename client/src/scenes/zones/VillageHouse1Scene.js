import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageHouse1Scene extends BaseZoneScene {
  constructor() {
    super('VillageHouse1Scene', 'villagehouse1');
    this.transitionCooldowns = {};
    this.npcs = []; // initialise ici
    this.interactiveObjects = []; // initialise ici
  }

 
  positionPlayer(player) {
    const spawnLayer = this.map.getObjectLayer('SpawnPoint');
    if (spawnLayer) {
      const spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_House1');
      if (spawnPoint) {
        player.x = spawnPoint.x + spawnPoint.width / 2;
        player.y = spawnPoint.y + spawnPoint.height / 2;
        console.log(`🏠 Joueur positionné au SpawnPoint_House1: ${player.x}, ${player.y}`);
      } else {
        player.x = 300;
        player.y = 200;
      }
    } else {
      player.x = 300;
      player.y = 200;
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
    console.log('🚨 DEBUT VillageHouse1Scene.create()');
    super.create();

    this.add
      .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes\nPress "E" to interact', {
        font: '18px monospace',
        fill: '#000000',
        padding: { x: 20, y: 10 },
        backgroundColor: '#ffffff',
      })
      .setScrollFactor(0)
      .setDepth(30);

    this.setupNPCs();
    this.setupInteractiveObjects();
  }

  setupNPCs() {
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    }
  }

  setupInteractiveObjects() {
    const layer = this.map.getObjectLayer('Interactive');
    if (layer) {
      layer.objects.forEach(obj => this.createInteractiveObject(obj));
    }
    this.input.keyboard.on('keydown-E', this.handleInteraction, this);
  }

  createNPC(npcData) {
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x3498db
    );

    this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => this.interactWithNPC(npcData.name || 'Assistant'));

    npc.npcData = npcData; // important pour handleInteraction
    this.npcs.push(npc);
  }

  createInteractiveObject(objData) {
    const obj = this.add.rectangle(
      objData.x + objData.width / 2,
      objData.y + objData.height / 2,
      objData.width,
      objData.height,
      0xf39c12
    ).setAlpha(0.5);

    obj.objData = objData;
    this.interactiveObjects.push(obj);
  }

  handleInteraction() {
    const player = this.playerManager.getMyPlayer();
    if (!player) return;

    for (const npc of this.npcs) {
      if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 50) {
        this.interactWithNPC(npc.npcData?.name || 'Assistant');
        return;
      }
    }

    for (const obj of this.interactiveObjects) {
      if (Phaser.Math.Distance.Between(player.x, player.y, obj.x, obj.y) < 50) {
        this.interactWithObject(obj.objData?.name || 'Objet');
        return;
      }
    }
  }

  interactWithNPC(npcName) {
    const messages = {
      Assistant: 'Je m\'occupe de la maison.',
      Gardien: 'Je veille sur cette maison.',
    };
    this.showSimpleDialog(npcName, messages[npcName] || 'Bonjour !');
  }

  interactWithObject(objName) {
    const messages = {
      Meuble: 'Un beau meuble ancien.',
      Tableau: 'Un tableau accroché au mur.',
    };
    this.showSimpleDialog('Système', messages[objName] || 'Vous examinez l\'objet.');
  }

  showSimpleDialog(speaker, message) {
    const dialog = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, `${speaker}: "${message}"`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: { x: 10, y: 8 },
      wordWrap: { width: 350 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => dialog.destroy());
  }

  cleanup() {
    this.transitionCooldowns = {};
    this.npcs.length = 0;
    this.interactiveObjects.length = 0;
    this.input.keyboard.off('keydown-E', this.handleInteraction, this);
    super.cleanup();
  }
}
