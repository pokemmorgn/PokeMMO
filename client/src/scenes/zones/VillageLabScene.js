// ===============================================
// VillageLabScene.js - Laboratoire du Professeur avec logique de transition
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'VillageLab');
    this.transitionCooldowns = {};
    this.professorInteracted = false;
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

    let overlapCreated = false;
    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && !overlapCreated) {
          overlapCreated = true;
          this.physics.add.overlap(myPlayer, transitionZone, () => {
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) return;

            this.transitionCooldowns[cooldownKey] = true;
            console.log(`[Transition] Demande transition vers ${targetScene} (${direction})`);
            transitionZone.body.enable = false;
            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              delete this.transitionCooldowns[cooldownKey];
              if (transitionZone.body) transitionZone.body.enable = true;
            });
          });

          checkPlayerInterval.remove();
          console.log(`✅ Overlap créé pour transition vers ${targetScene}`);
        }
      }
    });
  }

  positionPlayer(player) {
    const spawnLayer = this.map.getObjectLayer('SpawnPoint');
    if (spawnLayer) {
      const spawnPoint = spawnLayer.objects.find(obj => obj.name === 'SpawnPoint_Labo');
      if (spawnPoint) {
        player.x = spawnPoint.x + spawnPoint.width / 2;
        player.y = spawnPoint.y + spawnPoint.height / 2;
        console.log(`🧪 Joueur positionné au SpawnPoint_Laboratory: ${player.x}, ${player.y}`);
      } else {
        player.x = 300;
        player.y = 200;
        console.warn("⚠️ SpawnPoint_Labo non trouvé, position par défaut utilisée");
      }
    } else {
      player.x = 300;
      player.y = 200;
      console.warn("⚠️ Pas de layer SpawnPoint, position par défaut utilisée");
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
    console.log('🚨 DEBUT VillageLabScene.create()');
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

    this.setupLabEvents();
    this.setupNPCs();
    this.setupInteractiveObjects();
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
      }
    });

    if (this.networkManager?.room) {
      this.networkManager.room.onMessage('professorDialog', (data) => this.showProfessorDialog(data));
      this.networkManager.room.onMessage('starterReceived', (data) => this.showStarterReceived(data));
      this.networkManager.room.onMessage('welcomeToLab', (data) => this.showWelcomeMessage(data));
    }
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

    this.input.keyboard.on('keydown-E', () => this.handleInteraction());
  }

  createNPC(npcData) {
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      npcData.name === 'Professeur' ? 0x2ecc71 : 0x3498db
    );

    const label = this.add.text(
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

    npc.npcData = npcData;
    this.npcs = this.npcs || [];
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
    this.interactiveObjects = this.interactiveObjects || [];
    this.interactiveObjects.push(obj);
  }

  handleInteraction() {
    const player = this.playerManager.getMyPlayer();
    if (!player) return;

    for (const npc of this.npcs || []) {
      if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 50) {
        this.interactWithNPC(npc.npcData.name);
        return;
      }
    }

    for (const obj of this.interactiveObjects || []) {
      if (Phaser.Math.Distance.Between(player.x, player.y, obj.x, obj.y) < 50) {
        this.interactWithObject(obj.objData.name);
        return;
      }
    }
  }

  interactWithNPC(npcName) {
    if (npcName === 'Professeur') {
      this.networkManager?.room?.send('interactWithProfessor', {});
    } else {
      const messages = {
        Assistant: 'Je m\'occupe de l\'entretien du laboratoire.',
        Chercheur: 'Nous étudions les Pokémon ici. Fascinant !',
        Stagiaire: 'J\'apprends encore... C\'est compliqué !',
      };
      this.showSimpleDialog(npcName, messages[npcName] || 'Bonjour ! Je travaille ici.');
    }
  }

  interactWithObject(objName) {
    const messages = {
      Ordinateur: 'L\'ordinateur affiche des données sur les Pokémon.',
      Machine: 'Cette machine analyse les Pokéball.',
      Bibliothèque: 'Des livres sur les Pokémon... Très instructif !',
      Microscope: 'Un microscope high-tech pour étudier l\'ADN Pokémon.',
    };
    this.showSimpleDialog('Système', messages[objName] || 'Vous examinez l\'objet.');
  }

  showProfessorDialog(data) {
    const dialogBg = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 400, 200, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(2000);

    const dialogText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, `Professeur: "${data.message}"`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      wordWrap: { width: 350 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    if (data.options) {
      data.options.forEach((option, i) => {
        const btn = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 20 + i * 30, `${i + 1}. ${option}`, {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#00ff00',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        btn.setInteractive();
        btn.on('pointerdown', () => {
          this.handleProfessorChoice(option);
          dialogBg.destroy();
          dialogText.destroy();
          btn.destroy();
        });
      });
    }

    this.time.delayedCall(10000, () => {
      dialogBg?.destroy();
      dialogText?.destroy();
    });
  }

  handleProfessorChoice(choice) {
    if (choice === 'Recevoir un Pokémon') {
      this.showStarterSelection();
    } else if (choice === 'Informations') {
      this.showSimpleDialog('Professeur', 'Je donne leur premier Pokémon aux nouveaux dresseurs !');
    }
  }

  showStarterSelection() {
    const starters = ['Bulbasaur', 'Charmander', 'Squirtle'];
    const bg = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 500, 250, 0x0066cc, 0.9)
      .setScrollFactor(0)
      .setDepth(2000);

    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 80, 'Choisissez votre Pokémon de départ:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    starters.forEach((pokemon, i) => {
      const btn = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 20 + i * 40, pokemon, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 200, 0, 0.8)',
        padding: { x: 15, y: 8 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      btn.setInteractive();
      btn.on('pointerdown', () => {
        this.networkManager?.room?.send('selectStarter', { pokemon });
        bg.destroy();
        btn.destroy();
      });
    });
  }

  showStarterReceived(data) {
    const msg = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, data.message, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffff00',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: { x: 20, y: 15 },
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(4000, () => msg.destroy());
  }

  showWelcomeMessage(data) {
    if (data.message) {
      this.showSimpleDialog('Laboratoire', data.message);
    }
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
    this.npcs = [];
    this.interactiveObjects = [];
    super.cleanup();
  }
}
