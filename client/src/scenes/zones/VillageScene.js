import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'Greenroot');
    this.transitionCooldowns = {};
  }

  create() {
    console.log("🚨 DEBUT VillageScene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);

    console.log("⚙️ Setup village events...");
    this.setupVillageEvents();

    console.log("⚙️ Setup NPCs...");
    this.setupNPCs();

    this.time.delayedCall(100, () => {
      console.log("⚙️ Setup zone transitions...");
      this.setupZoneTransitions();
    });

    console.log("🚨 FIN VillageScene.create()");
  }

  setupZoneTransitions() {
  if (!this.playerManager) {
    console.warn("playerManager non encore initialisé, retry dans 100ms");
    this.time.delayedCall(100, () => this.setupZoneTransitions());
    return;
  }

  const worldsLayer = this.map.getObjectLayer('Worlds');
  if (!worldsLayer) {
    console.warn("Layer 'Worlds' non trouvé");
    return;
  }

  const player = this.playerManager.getMyPlayer();
  if (!player) {
    console.warn("Player non encore créé, retry dans 100ms");
    this.time.delayedCall(100, () => this.setupZoneTransitions());
    return;
  }
    console.log(`🎮 Joueur récupéré: position (${player.x}, ${player.y})`);

    if (!player.body) {
      console.warn("⚠️ Player.body non créé, retry setupZoneTransitions dans 100ms");
      this.time.delayedCall(100, () => this.setupZoneTransitions());
      return;
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

    // Layer Door
    const doorLayer = this.map.getObjectLayer('Door');
    if (!doorLayer) {
      console.warn("⚠️ Layer 'Door' non trouvé");
      return;
    }
    console.log(`🚪 Layer 'Door' trouvé, ${doorLayer.objects.length} objets`);

    const labDoor = doorLayer.objects.find(obj => obj.name === 'Labo');
    if (labDoor) {
      this.createTransitionZone(labDoor, 'VillageLabScene', 'north');
      console.log("🧪 Transition vers Laboratoire trouvée !");
    } else {
      console.warn("⚠️ Objet 'Labo' non trouvé dans 'Door'");
      console.log("Objets dans Door:", doorLayer.objects.map(o => o.name));
    }

    const house1Door = doorLayer.objects.find(obj => obj.name === 'House1');
    if (house1Door) {
      this.createTransitionZone(house1Door, 'VillageHouse1Scene', 'inside');
      console.log("🏠 Transition vers VillageHouse1 trouvée !");
    } else {
      console.warn("⚠️ Objet 'House1' non trouvé dans 'Door'");
    }
  }

  positionPlayer(player) {
    console.log("🔄 positionPlayer appelé");
    const initData = this.scene.settings.data;
    console.log("Init data:", initData);
    const spawnLayer = this.map.getObjectLayer('SpawnPoint');
    let spawnPoint = null;

    if (spawnLayer) {
      console.log("SpawnPoint layer trouvé");
      if (initData?.fromZone === 'BeachScene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        console.log("Spawn depuis BeachScene:", spawnPoint);
      } else if (initData?.fromZone === 'Road1Scene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRtop');
        console.log("Spawn depuis Road1Scene:", spawnPoint);
      } else if (initData?.fromZone === 'VillageLabScene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Labo');
        console.log("Spawn depuis VillageLabScene:", spawnPoint);
      } else if (initData?.fromZone === 'VillageHouse1Scene') {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_House1');
        console.log("Spawn depuis VillageHouse1Scene:", spawnPoint);
      } else {
        spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_GRbottom');
        console.log("Spawn par défaut:", spawnPoint);
      }

      if (spawnPoint) {
        player.x = spawnPoint.x + spawnPoint.width / 2;
        player.y = spawnPoint.y + spawnPoint.height / 2;
        console.log(`Position du joueur fixée à (${player.x}, ${player.y})`);
      } else {
        player.x = 200;
        player.y = 150;
        console.warn("⚠️ Aucun spawnPoint trouvé, position par défaut (200,150) utilisée");
      }
    } else {
      console.warn("⚠️ Pas de layer SpawnPoint, fallback position selon fromZone");
      if (initData?.fromZone === 'BeachScene') {
        player.x = 150;
        player.y = 200;
        console.log("Position fallback BeachScene (150,200)");
      } else if (initData?.fromZone === 'Road1Scene') {
        player.x = 100;
        player.y = 150;
        console.log("Position fallback Road1Scene (100,150)");
      } else if (initData?.fromZone === 'VillageLabScene') {
        player.x = 250;
        player.y = 180;
        console.log("Position fallback VillageLabScene (250,180)");
      } else if (initData?.fromZone === 'VillageHouse1Scene') {
        player.x = 220;
        player.y = 160;
        console.log("Position fallback VillageHouse1Scene (220,160)");
      } else {
        player.x = 200;
        player.y = 150;
        console.log("Position fallback défaut (200,150)");
      }
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
      console.log("Position indicateur mise à jour");
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
      console.log("Position joueur envoyée au serveur");
    }
  }

  setupVillageEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🏘️ Bienvenue à GreenRoot Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nGreenRoot Village\nConnected!');
        console.log("InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => {
        this.createNPC(npcObj);
      });
    } else {
      console.warn("⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`Création NPC: ${npcData.name || 'Sans nom'}`);
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

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
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
      console.log(`💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    console.log("⚙️ cleanup appelé");
    super.cleanup();
  }
}
