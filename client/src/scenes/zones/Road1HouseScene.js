import { BaseZoneScene } from './BaseZoneScene.js';

export class Road1HouseScene extends BaseZoneScene {
  constructor() {
    super('Road1HouseScene', 'road1house');
    this.transitionCooldowns = {};
    console.log("[Road1HouseScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road1HouseScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Road1House
    this.add.text(16, 16, 'Maison de la Route 1\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Road1House
    this.setupRoad1HouseEvents();
    // Placement des NPCs spécifiques à Road1House
    this.setupNPCs();
  }

  setupRoad1HouseEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[Road1HouseScene] Bienvenue dans la Maison de la Route 1 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nMaison Route 1\nConnected!');
        console.log("[Road1HouseScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[Road1HouseScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[Road1HouseScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[Road1HouseScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[Road1HouseScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x4169E1 // Couleur bleu royal pour la route
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(65, 105, 225, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Voyageur');
    });

    console.log(`[Road1HouseScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[Road1HouseScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Gardien: "Cette maison protège les voyageurs de la Route 1.",
      Soigneur: "Vos Pokémon ont besoin de soins ? Je peux les aider !",
      Marchand: "J'ai des objets utiles pour votre aventure !",
      Voyageur: "La Route 1 peut être dangereuse, restez vigilant.",
      Guide: "Vous cherchez votre chemin ? Je connais bien la région.",
      Ranger: "Je surveille cette zone pour la sécurité des dresseurs.",
      Herboriste: "Ces plantes médicinales soignent les Pokémon.",
      Ermite: "Je vis ici depuis des années, loin de l'agitation.",
    };
    const message = dialogues[npcName] || 'Bienvenue dans cette maison refuge !';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(65, 105, 225, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[Road1HouseScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[Road1HouseScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
