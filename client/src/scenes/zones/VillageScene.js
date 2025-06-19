import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageScene extends BaseZoneScene {
  constructor() {
    super('VillageScene', 'Greenroot');
    this.transitionCooldowns = {};
  }

  create() {
    console.log("🚨 DEBUT VillageScene.create()");
    super.create();
    // LOG CRUCIAL : est-ce que PlayerManager connaît déjà ton joueur après le create du parent ?
    if (this.playerManager) {
      console.log("[DEBUG] PlayerManager (VillageScene):", this.playerManager.players);
      // Essaie de log le player courant
      const myPlayer = this.playerManager.getMyPlayer && this.playerManager.getMyPlayer();
      if (myPlayer) {
        console.log("[DEBUG] Mon player existe déjà (juste après super.create()):", myPlayer.x, myPlayer.y, myPlayer);
      } else {
        console.warn("[DEBUG] Mon player n'existe PAS après super.create()");
      }
    }
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

    console.log("🚨 FIN VillageScene.create()");
  }

  // ✅ AMÉLIORATION: Position par défaut pour VillageScene
  getDefaultSpawnPosition(fromZone) {
    // Position par défaut selon la zone d'origine
    switch(fromZone) {
      case 'BeachScene':
        return { x: 100, y: 200 }; // Entrée depuis la plage
      case 'Road1Scene':
        return { x: 300, y: 100 }; // Entrée depuis la route
      case 'VillageLabScene':
        return { x: 150, y: 150 }; // Sortie du laboratoire
      default:
        return { x: 200, y: 200 }; // Position centrale par défaut
    }
  }

  // ✅ NOUVEAU: Hook pour logique spécifique après positionnement
  onPlayerPositioned(player, initData) {
    console.log(`[VillageScene] Joueur positionné à (${player.x}, ${player.y})`);
    
    // Logique spécifique selon la provenance
    if (initData?.fromZone === 'BeachScene') {
      console.log("[VillageScene] Arrivée depuis la plage");
    } else if (initData?.fromZone === 'VillageLabScene') {
      console.log("[VillageScene] Sortie du laboratoire");
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
