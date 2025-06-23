import { BaseZoneScene } from './BaseZoneScene.js';

export class Road1Scene extends BaseZoneScene {
  constructor() {
    super('Road1Scene', 'road1');
    this.transitionCooldowns = {};
    console.log("[Road1Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Road1
    this.add.text(16, 16, 'Route 1 - Route vers l\'aventure\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(139, 69, 19, 0.8)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Road1
    this.setupRoad1Events();
    // Placement des NPCs spécifiques à Road1
    this.setupNPCs();
  }

  setupRoad1Events() {
    this.time.delayedCall(1500, () => {
      console.log("[Road1Scene] Bienvenue sur la Route 1 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nRoute 1\nConnected!');
        console.log("[Road1Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[Road1Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[Road1Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[Road1Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[Road1Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x8B4513 // Couleur marron pour Road1
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

    console.log(`[Road1Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[Road1Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Garde: "Attention aux Pokémon sauvages sur cette route !",
      Voyageur: "Cette route mène vers de nombreuses aventures !",
      Dresseur: "Veux-tu te battre ? Plus tard peut-être !",
      Randonneur: "J'ai vu des Pokémon rares plus loin sur la route.",
      Guide: "Bienvenue sur la Route 1 ! Restez sur le chemin.",
      Collecteur: "Je cherche des baies le long de cette route.",
      Voyageur: "Bonne route, jeune dresseur !",
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
      console.log(`[Road1Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[Road1Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
