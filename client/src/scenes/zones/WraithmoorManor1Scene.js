import { BaseZoneScene } from './BaseZoneScene.js';

export class WraithmoorManor1Scene extends BaseZoneScene {
  constructor() {
    super('WraithmoorManor1Scene', 'wraithmoormanor1');
    this.transitionCooldowns = {};
    console.log("[WreaithmoorManor1Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[WraithmoorManor1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à WreaithmoorManor1
    this.add.text(16, 16, 'Manoir Spectral - Niveau 1\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour WreaithmoorManor1
    this.setupWreaithmoorManor1Events();
    // Placement des NPCs spécifiques à WreaithmoorManor1
    this.setupNPCs();
  }

  setupWreaithmoorManor1Events() {
    this.time.delayedCall(1000, () => {
      console.log("[WraithmoorManor1Scene] Bienvenue dans le Manoir Spectral !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nManoir Spectral\nConnected!');
        console.log("[WraithmoorManor1Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[WraithmoorManor1Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[WraithmoorManor1Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[WraithmoorManor1Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[WraithmoorManor1Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x8B0000 // Couleur rouge sombre pour le manoir hanté
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(139, 0, 0, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Fantome');
    });

    console.log(`[WraithmoorManor1Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[WraithmoorManor1Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      MaitreManoir: "Bienvenue dans ma demeure éternelle, visiteur...",
      ServiteurSpectre: "Le maître vous attend dans les étages supérieurs.",
      BibliothecaireFantome: "Ces livres contiennent des secrets interdits...",
      CuisinierEctoplasmique: "Mon dernier repas date de plusieurs siècles !",
      FemmeChambresSpectre: "Je nettoie ces pièces depuis ma mort...",
      JardinierMort: "Mes plantes poussent encore, malgré mon trépas.",
      GardeMaison: "Personne ne quitte ce manoir sans permission !",
      Fantome: "Tu ne devrais pas être ici, mortel...",
    };
    const message = dialogues[npcName] || 'Ce manoir cache des mystères terrifiants...';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(139, 0, 0, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[WraithmoorManor1Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[WraithmoorManor1Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
