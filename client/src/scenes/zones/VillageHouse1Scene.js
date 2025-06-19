import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageHouse1Scene extends BaseZoneScene {
  constructor() {
    super('VillageHouse1Scene', 'House1Interior');
    this.transitionCooldowns = {};
    this.npcs = []; // initialise ici
    this.interactiveObjects = []; // initialise ici
  }

  setupZoneTransitions() {
    const retrySetup = () => this.time.delayedCall(100, () => this.setupZoneTransitions());

    if (!this.playerManager) {
      console.warn("playerManager non encore initialisé, retry dans 100ms");
      return retrySetup();
    }

    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn("Layer 'Worlds' non trouvé");
      return;
    }

    const player = this.playerManager.getMyPlayer();
    if (!player) {
      console.warn("Player non encore créé, retry dans 100ms");
      return retrySetup();
    }
    console.log(`🎮 Joueur récupéré: position (${player.x}, ${player.y})`);

    if (!player.body) {
      console.warn("⚠️ Player.body non créé, retry setupZoneTransitions dans 100ms");
      return retrySetup();
    }
    console.log("✅ Player.body présent, création des zones de transition");

    worldsLayer.objects.forEach(obj => {
      const targetZoneProp = obj.properties?.find(p => p.name === 'targetZone');
      const directionProp = obj.properties?.find(p => p.name === 'direction');
      if (!targetZoneProp) {
        console.warn(`⚠️ Objet ${obj.name || obj.id} dans 'Worlds' sans propriété targetZone, ignoré`);
        return;
      }

      const targetZone = targetZoneProp.value;
      const direction = directionProp ? directionProp.value : 'north';

      console.log(`➡️ Création zone transition vers ${targetZone} à (${obj.x},${obj.y}), taille ${obj.width}x${obj.height}`);

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
          console.warn("⚠️ networkManager non défini, transition ignorée");
          return;
        }
        console.log(`↪️ Overlap détecté avec zone transition vers ${targetZone} (${direction})`);
        this.networkManager.requestZoneTransition(targetZone, direction);
      });
    });
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
