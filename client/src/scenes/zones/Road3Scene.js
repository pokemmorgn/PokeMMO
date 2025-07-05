import { BaseZoneScene } from './BaseZoneScene.js';

export class Road3Scene extends BaseZoneScene {
  constructor() {
    super('Road3Scene', 'road3');
    this.transitionCooldowns = {};
    console.log("[Road3Scene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road3Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Road3
    this.add.text(16, 16, 'Route 3\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Road3
    this.setupRoad3Events();
    // Placement des NPCs spécifiques à Road3
    this.setupNPCs();
  }

  setupRoad3Events() {
    this.time.delayedCall(1000, () => {
      console.log("[Road3Scene] Bienvenue sur la Route 3 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nRoute 3\nConnected!');
        console.log("[Road3Scene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[Road3Scene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[Road3Scene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[Road3Scene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[Road3Scene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x8FBC8F // Couleur vert clair pour la route
    );

    const npcName = this.add.text(
      npc.x,
      npc.y - 30,
      npcData.name || 'NPC',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(143, 188, 143, 0.7)',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.interactWithNPC(npcData.name || 'Voyageur');
    });

    console.log(`[Road3Scene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[Road3Scene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      DresseurElite: "Tu sembles prometteur ! Prêt pour un défi ?",
      Cartographe: "Cette route est plus dangereuse que les précédentes.",
      VeteranDresseur: "J'ai parcouru toutes les routes de la région !",
      ChercheurPokemon: "Des espèces rares se cachent dans les environs.",
      NinjaPokemon: "Mes techniques sont secrètes... mais efficaces !",
      EleveusePokemon: "Mes Pokémon sont mes meilleurs amis !",
      ChampionAspirante: "Un jour, je serai Maître Pokémon !",
      Voyageur: "Cette route mène vers des défis plus grands !",
    };
    const message = dialogues[npcName] || 'Cette route est pleine de mystères !';
    
    const dialogueBox = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 100,
      `${npcName}: "${message}"`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: 'rgba(143, 188, 143, 0.8)',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      dialogueBox.destroy();
      console.log(`[Road3Scene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  cleanup() {
    console.log("[Road3Scene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
