import { BaseZoneScene } from './BaseZoneScene.js';

export class WraithmoorCimeteryScene extends BaseZoneScene {
  constructor() {
    super('WraithmoorCimeteryScene', 'wraithmoorcimetery');
    this.transitionCooldowns = {};
    console.log("[WraithmoorCimeteryScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[WraithmoorCimeteryScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à WraithmoorCimetery
    this.add.text(16, 16, 'Cimetière des Landes\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour WraithmoorCimetery
    this.setupWraithmoorCimeteryEvents();
    // Placement des NPCs spécifiques à WraithmoorCimetery
    this.setupNPCs();
  }

  setupWraithmoorCimeteryEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[WraithmoorCimeteryScene] Bienvenue dans le Cimetière des Landes !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nCimetière Spectral\nConnected!');
        console.log("[WraithmoorCimeteryScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[WraithmoorCimeteryScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[WraithmoorCimeteryScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[WraithmoorCimeteryScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[WraithmoorCimeteryScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x191970 // Couleur bleu nuit pour le cimetière
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(25, 25, 112, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Gardien');
    });

    console.log(`[WraithmoorCimeteryScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[WraithmoorCimeteryScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      GardienTombes: "Je veille sur le repos éternel des anciens dresseurs.",
      FossoyeurPokemon: "Ces tombes abritent les âmes de Pokémon légendaires...",
      PretreSpectre: "Mes prières apaisent les esprits tourmentés.",
      HistorienMort: "Chaque tombe raconte l'histoire d'un héros oublié.",
      ConservateursAmnes: "Nous préservons la mémoire des disparus.",
      SentinelleEternelle: "Aucun vivant ne doit troubler ce repos sacré !",
      ArchivisteFuneste: "Les chroniques de la mort sont écrites ici.",
      Gardien: "Respecte les morts, ils veillent sur les vivants.",
    };
    const message = dialogues[npcName] || 'Que la paix soit avec les âmes défuntes...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(25, 25, 112, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[WraithmoorCimeteryScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[WraithmoorCimeteryScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
