import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageHouse2Scene extends BaseZoneScene {
  constructor() {
    super('VillageHouse2Scene', 'villagehouse2');
    this.transitionCooldowns = {};
    console.log("[VillageHouse2Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageHouse2Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à VillageHouse2
    this.add.text(16, 16, 'Maison du Village 2\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour VillageHouse2
    this.setupVillageHouse2Events();
    // Placement des NPCs spécifiques à VillageHouse2
    this.setupNPCs();
  }

  setupVillageHouse2Events() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageHouse2Scene] Bienvenue dans la Maison 2 du Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nMaison Village 2\nConnected!');
        console.log("[VillageHouse2Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[VillageHouse2Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[VillageHouse2Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[VillageHouse2Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[VillageHouse2Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x8B4513 // Couleur marron pour l'intérieur
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
      this.interactWithNPC(npcData.name || 'Habitant');
    });

    console.log(`[VillageHouse2Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[VillageHouse2Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Papa: "Bienvenue dans notre maison ! Tu veux du thé ?",
      Maman: "J'espère que tu te plais dans notre village !",
      Enfant: "Tu veux jouer avec moi ? J'ai des cartes Pokémon !",
      GrandMere: "Ah, un jeune dresseur ! De mon temps...",
      GrandPere: "Cette maison existe depuis des générations.",
      Cousin: "Tu connais des techniques de combat ?",
      Tante: "J'ai préparé des biscuits, sers-toi !",
      Habitant: "Fais comme chez toi dans cette maison !",
    };
    const message = dialogues[npcName] || 'Bienvenue dans notre foyer !';
    
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
      console.log(`[VillageHouse2Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[VillageHouse2Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
