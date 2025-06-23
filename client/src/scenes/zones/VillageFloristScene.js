import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageFloristScene extends BaseZoneScene {
  constructor() {
    super('VillageFloristScene', 'villageflorist');
    this.transitionCooldowns = {};
    console.log("[VillageFloristScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageFloristScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques au Fleuriste
    this.add.text(16, 16, '🌸 Fleuriste du Village 🌸\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 192, 203, 0.9)', // Rose
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour le Fleuriste
    this.setupVillageFloristEvents();
    // Placement des NPCs spécifiques au Fleuriste
    this.setupNPCs();
  }

  setupVillageFloristEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageFloristScene] Bienvenue chez le Fleuriste du Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nFleuriste Village\nConnected!');
        console.log("[VillageFloristScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[VillageFloristScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[VillageFloristScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[VillageFloristScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[VillageFloristScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0xFF69B4 // Couleur rose pour le fleuriste
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(255, 105, 180, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Fleuriste');
    });

    console.log(`[VillageFloristScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[VillageFloristScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Fleuriste: "Bienvenue ! J'ai les plus belles fleurs du village !",
      Proprietaire: "Ces fleurs viennent de mon jardin secret !",
      Assistante: "Voulez-vous acheter un bouquet pour quelqu'un ?",
      Jardinier: "Je cultive ces fleurs avec amour et patience.",
      Cliente: "Ces roses sont magnifiques ! Je vais en prendre une douzaine.",
      Apprentie: "J'apprends l'art floral, c'est passionnant !",
      Botaniste: "Chaque fleur a ses propriétés particulières...",
      Vendeuse: "Nos fleurs sont fraîches, cueillies ce matin !",
      Decoratrice: "Je peux vous faire un arrangement sur mesure !",
      Fleuriste: "Sentez ce parfum ! N'est-ce pas merveilleux ?",
    };
    const message = dialogues[npcName] || 'Ces fleurs sont splendides, n\'est-ce pas ?';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(255, 105, 180, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[VillageFloristScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[VillageFloristScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
