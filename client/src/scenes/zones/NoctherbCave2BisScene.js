import { BaseZoneScene } from './BaseZoneScene.js';

export class NoctherbCave2BisScene extends BaseZoneScene {
  constructor() {
    super('NoctherbCave2BisScene', 'noctherbcave2bis');
    this.transitionCooldowns = {};
    console.log("[NoctherbCave2BisScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[NoctherbCave2BisScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à NoctherbCave2Bis
    this.add.text(16, 16, 'Grotte Noctherb - Passage Secret\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour NoctherbCave2Bis
    this.setupNoctherbCave2BisEvents();
    // Placement des NPCs spécifiques à NoctherbCave2Bis
    this.setupNPCs();
  }

  setupNoctherbCave2BisEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[NoctherbCave2BisScene] Bienvenue dans le Passage Secret de la Grotte Noctherb !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nPassage Secret\nConnected!');
        console.log("[NoctherbCave2BisScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[NoctherbCave2BisScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[NoctherbCave2BisScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[NoctherbCave2BisScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[NoctherbCave2BisScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x9932CC // Couleur violet mystique pour le passage secret
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(153, 50, 204, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Mystique');
    });

    console.log(`[NoctherbCave2BisScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[NoctherbCave2BisScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      GardienSecret: "Tu as trouvé le passage secret ! Peu y arrivent...",
      ErmiteGrotte: "Je garde les secrets de cette grotte depuis des siècles.",
      OracleNoctherb: "Les cristaux murmurent des prophéties anciennes...",
      MaitreOcculte: "Mes Pokémon Spectre protègent ces lieux sacrés.",
      ChercheurAncien: "Ces inscriptions datent d'une époque oubliée !",
      SageAbyssal: "Les ténèbres ici cachent des vérités cosmiques.",
      GardienReliques: "Ne touche pas aux artefacts sans permission !",
      Mystique: "Ce passage n'existe que pour les élus...",
    };
    const message = dialogues[npcName] || 'Les mystères les plus profonds t\'attendent...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(153, 50, 204, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[NoctherbCave2BisScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[NoctherbCave2BisScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
