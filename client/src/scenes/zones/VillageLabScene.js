// ===============================================
// VillageLabScene.js - Laboratoire du Professeur (Colyseus MMO)
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'VillageLab');
    this.transitionCooldowns = {};
  }

  create() {
    console.log("🚨 DEBUT VillageLabScene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: '18px monospace',
      fill: '#000000',
      padding: { x: 20, y: 10 },
      backgroundColor: '#ffffff',
    }).setScrollFactor(0).setDepth(30);

    console.log("⚙️ Setup lab events...");
    this.setupLabEvents();

    console.log("⚙️ Setup NPCs...");
    this.setupNPCs();

    this.time.delayedCall(100, () => {
      console.log("⚙️ Setup zone transitions...");
      this.setupZoneTransitions();
    });

    console.log("🚨 FIN VillageLabScene.create()");
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
  }

  positionPlayer(player) {
    console.log("🔄 positionPlayer appelé");
    const initData = this.scene.settings.data;
    console.log("Init data:", initData);

    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      player.x = initData.spawnX;
      player.y = initData.spawnY;
      console.log(`Position du joueur fixée depuis données serveur à (${player.x}, ${player.y})`);
    } else {
      console.log("⚠️ Pas de coordonnées spawn reçues, position du joueur non modifiée");
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

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("🧪 Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
        console.log("InfoText mise à jour");
      }
    });

    // Gestion des messages serveur (dialogues, starter...)
    if (this.networkManager?.room) {
      this.networkManager.room.onMessage('professorDialog', (data) => this.showProfessorDialog(data));
      this.networkManager.room.onMessage('starterReceived', (data) => this.showStarterReceived(data));
      this.networkManager.room.onMessage('welcomeToLab', (data) => this.showWelcomeMessage(data));
    }
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
    const color = npcData.name === 'Professeur' ? 0x2ecc71 : 0x3498db;
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      color
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
      this.interactWithNPC(npcData.name || 'Assistant');
    });

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    if (npcName === 'Professeur') {
      this.networkManager?.room?.send('interactWithProfessor', {});
    } else {
      const messages = {
        Assistant: 'Je m\'occupe de l\'entretien du laboratoire.',
        Chercheur: 'Nous étudions les Pokémon ici. Fascinant !',
        Stagiaire: 'J\'apprends encore... C\'est compliqué !',
      };
      const message = messages[npcName] || 'Bonjour ! Je travaille ici.';
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
  }

  // === Gestion du dialogue professeur & starter via serveur ===

  showProfessorDialog(data) {
    // Simple : à adapter selon ce que tu veux côté UI
    const dialogBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Professeur: "${data.message}"`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 350 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    this.time.delayedCall(6000, () => dialogBox.destroy());
  }

  showStarterReceived(data) {
    const msg = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      data.message,
      {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 20, y: 15 },
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(4000, () => msg.destroy());
  }

  showWelcomeMessage(data) {
    if (data.message) {
      const box = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        `Laboratoire: "${data.message}"`,
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 10, y: 8 },
          wordWrap: { width: 350 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

      this.time.delayedCall(3000, () => box.destroy());
    }
  }

  cleanup() {
    this.transitionCooldowns = {};
    console.log("⚙️ cleanup appelé");
    super.cleanup();
  }
}