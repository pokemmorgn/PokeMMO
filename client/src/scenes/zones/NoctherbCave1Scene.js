import { BaseZoneScene } from './BaseZoneScene.js';

export class NoctherbCave1Scene extends BaseZoneScene {
  constructor() {
    super('NoctherbCave1Scene', 'noctherbcave1');
    this.transitionCooldowns = {};
    console.log("[NoctherbCave1Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[NoctherbCave1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à NoctherbCave1
    this.add.text(16, 16, 'Grotte Noctherb - Niveau 1\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour NoctherbCave1
    this.setupNoctherbCave1Events();
    // Placement des NPCs spécifiques à NoctherbCave1
    this.setupNPCs();
  }

  setupNoctherbCave1Events() {
    this.time.delayedCall(1000, () => {
      console.log("[NoctherbCave1Scene] Bienvenue dans la Grotte Noctherb - Niveau 1 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nGrotte Noctherb 1\nConnected!');
        console.log("[NoctherbCave1Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[NoctherbCave1Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[NoctherbCave1Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[NoctherbCave1Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[NoctherbCave1Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x4B0082 // Couleur violet foncé pour la grotte
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(75, 0, 130, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Explorateur');
    });

    console.log(`[NoctherbCave1Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[NoctherbCave1Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      SpeleologuePokemon: "Cette grotte cache des Pokémon uniques !",
      MinerPokemon: "J'ai trouvé des pierres d'évolution ici !",
      ExplorateursGrotte: "Les passages mènent plus profond...",
      ChercheurCristaux: "Les cristaux de cette grotte sont magiques.",
      DresseurGrotte: "Mes Pokémon Roche sont imbattables ici !",
      GuideGrotte: "Attention aux éboulements, reste sur le chemin !",
      ArcheologuePokemon: "Cette grotte a des milliers d'années !",
      Explorateur: "Il fait sombre ici, reste prudent !",
    };
    const message = dialogues[npcName] || 'Cette grotte recèle de mystères...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(75, 0, 130, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[NoctherbCave1Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[NoctherbCave1Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
