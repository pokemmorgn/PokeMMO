import { BaseZoneScene } from './BaseZoneScene.js';

export class NoctherbCave2Scene extends BaseZoneScene {
  constructor() {
    super('NoctherbCave2Scene', 'noctherbcave2');
    this.transitionCooldowns = {};
    console.log("[NoctherbCave2Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[NoctherbCave2Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à NoctherbCave2
    this.add.text(16, 16, 'Grotte Noctherb - Niveau 2\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour NoctherbCave2
    this.setupNoctherbCave2Events();
    // Placement des NPCs spécifiques à NoctherbCave2
    this.setupNPCs();
  }

  setupNoctherbCave2Events() {
    this.time.delayedCall(1000, () => {
      console.log("[NoctherbCave2Scene] Bienvenue dans la Grotte Noctherb - Niveau 2 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nGrotte Noctherb 2\nConnected!');
        console.log("[NoctherbCave2Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[NoctherbCave2Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[NoctherbCave2Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[NoctherbCave2Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[NoctherbCave2Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x800080 // Couleur violet plus foncé pour le niveau 2
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(128, 0, 128, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Explorateur');
    });

    console.log(`[NoctherbCave2Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[NoctherbCave2Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      ExpertGrotte: "Tu es arrivé au niveau 2 ! Impressionnant !",
      ChercheurProfond: "Les Pokémon ici sont plus puissants...",
      MaitreSpeleologue: "Ces galeries mènent vers des secrets anciens.",
      GardienCristaux: "Protège les cristaux sacrés de cette grotte !",
      VeteranExplorateur: "J'explore ces grottes depuis 20 ans !",
      SageGrotte: "Les légendes parlent de trésors au plus profond...",
      DresseurEliteGrotte: "Mes Pokémon Ténèbres dominent ici !",
      Explorateur: "Plus on descend, plus c'est dangereux !",
    };
    const message = dialogues[npcName] || 'Les profondeurs cachent bien des secrets...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(128, 0, 128, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[NoctherbCave2Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[NoctherbCave2Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
