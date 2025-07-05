import { BaseZoneScene } from './BaseZoneScene.js';

export class WraithmoorScene extends BaseZoneScene {
  constructor() {
    super('WraithmoorScene', 'wraithmoor');
    this.transitionCooldowns = {};
    console.log("[WraithmoorScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[WraithmoorScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Wraithmoor
    this.add.text(16, 16, 'Landes Spectrales\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Wraithmoor
    this.setupWraithmoorEvents();
    // Placement des NPCs spécifiques à Wraithmoor
    this.setupNPCs();
  }

  setupWraithmoorEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[WraithmoorScene] Bienvenue dans les Landes Spectrales !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLandes Spectrales\nConnected!');
        console.log("[WraithmoorScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[WraithmoorScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[WraithmoorScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[WraithmoorScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[WraithmoorScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x2F4F4F // Couleur gris-vert sombre pour les landes
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(47, 79, 79, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Vagabond');
    });

    console.log(`[WraithmoorScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[WraithmoorScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      EspritGardien: "Ces landes sont hantées par d'anciens esprits...",
      ChasseursFantomes: "Des Pokémon Spectre rôdent dans le brouillard.",
      MediumPokemon: "Je peux communiquer avec les esprits Pokémon !",
      ExorcisteDresseur: "Mes Pokémon purifient les âmes perdues.",
      ErmiteLandes: "J'ai choisi de vivre parmi les esprits.",
      VoyantSpectre: "L'avenir est sombre dans ces brumes éternelles...",
      NecromancienPokemon: "Je maîtrise les pouvoirs des ténèbres !",
      Vagabond: "Ces landes sont maudites, pars d'ici !",
    };
    const message = dialogues[npcName] || 'Les esprits murmurent dans le vent...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(47, 79, 79, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[WraithmoorScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[WraithmoorScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
