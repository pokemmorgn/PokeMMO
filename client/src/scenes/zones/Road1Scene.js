import { BaseZoneScene } from './BaseZoneScene.js';

export class Road1Scene extends BaseZoneScene {
  constructor() {
    super('Road1Scene', 'road1');
    this.transitionCooldowns = {};
  }

  // Position de spawn par défaut (optionnel, à adapter selon tes besoins)
  getDefaultSpawnPosition(fromZone) {
    // Exemples de positions selon la zone d'origine
    switch (fromZone) {
      case 'VillageScene':
        return { x: 100, y: 300 };
      default:
        return { x: 100, y: 300 };
    }
  }

  // Hook appelé une fois que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
    // Ici tu peux déclencher des événements custom liés à l'arrivée du joueur si besoin
  }

  create() {
    console.log("🚨 DEBUT Road1Scene.create()");
    super.create();
    console.log("✅ BaseZoneScene.create() appelé");

    this.add.text(16, 16, 'Route 1 - Route vers l\'aventure\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '18px monospace',
      fill: '#ffffff',
      padding: { x: 20, y: 10 },
      backgroundColor: 'rgba(139, 69, 19, 0.8)',
    }).setScrollFactor(0).setDepth(30);

    console.log("⚙️ Setup Road1 events...");
    this.setupRoad1Events();

    console.log("⚙️ Setup NPCs...");
    this.setupNPCs();

    console.log("🚨 FIN Road1Scene.create()");
  }

  setupRoad1Events() {
    this.time.delayedCall(1000, () => {
      console.log("🛣️ Bienvenue sur la Route 1 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nRoute 1\nConnected!');
        console.log("InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
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
      0x8B4513
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(139, 69, 19, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Voyageur');
    });

    console.log(`👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`💬 Interaction avec ${npcName}`);
    const dialogues = {
      Garde: "Attention aux Pokémon sauvages sur cette route !",
      Voyageur: "Cette route mène vers de nombreuses aventures !",
      Dresseur: "Veux-tu te battre ? Plus tard peut-être !",
      Randonneur: "J'ai vu des Pokémon rares plus loin sur la route.",
      Guide: "Bienvenue sur la Route 1 ! Restez sur le chemin.",
      Collecteur: "Je cherche des baies le long de cette route.",
    };
    const message = dialogues[npcName] || 'Salut ! Belle route, n\'est-ce pas ?';
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(139, 69, 19, 0.8)',
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
