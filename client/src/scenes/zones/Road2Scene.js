import { BaseZoneScene } from './BaseZoneScene.js';

export class Road2Scene extends BaseZoneScene {
  constructor() {
    super('Road2Scene', 'road2');
    this.transitionCooldowns = {};
    console.log("[Road2Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road2Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Road2
    this.add.text(16, 16, 'Route 2\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Road2
    this.setupRoad2Events();
    // Placement des NPCs spécifiques à Road2
    this.setupNPCs();
  }

  setupRoad2Events() {
    this.time.delayedCall(1000, () => {
      console.log("[Road2Scene] Bienvenue sur la Route 2 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nRoute 2\nConnected!');
        console.log("[Road2Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[Road2Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[Road2Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[Road2Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[Road2Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x228B22 // Couleur verte pour la route
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(34, 139, 34, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Voyageur');
    });

    console.log(`[Road2Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[Road2Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Dresseur: "Veux-tu combattre ? Mes Pokémon sont prêts !",
      Randonneur: "Cette route mène vers des aventures passionnantes !",
      Marchand: "J'ai des objets rares à vendre !",
      Guide: "Attention aux Pokémon sauvages sur cette route !",
      Explorateur: "J'ai découvert des passages secrets par ici.",
      Botaniste: "Les plantes de cette région sont fascinantes !",
      Voyageur: "Cette route est pleine de surprises !",
    };
    const message = dialogues[npcName] || 'Bonne route, dresseur !';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(34, 139, 34, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[Road2Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[Road2Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
