import { BaseZoneScene } from './BaseZoneScene.js';

export class Road1HiddenScene extends BaseZoneScene {
  constructor() {
    super('Road1HiddenScene', 'road1hidden');
    this.transitionCooldowns = {};
    console.log("[Road1HiddenScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[Road1HiddenScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques à Road1Hidden
    this.add.text(16, 16, 'Zone Cachée Route 1\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes', {
      font: '16px monospace',
      fill: '#ffffff',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(128, 0, 128, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour Road1Hidden
    this.setupRoad1HiddenEvents();
    // Placement des NPCs spécifiques à Road1Hidden
    this.setupNPCs();
    // Éléments spéciaux pour zone cachée
    this.setupHiddenElements();
  }

  setupRoad1HiddenEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[Road1HiddenScene] Découverte de la Zone Cachée !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nZone Cachée Route 1\nConnected!');
        console.log("[Road1HiddenScene] InfoText mise à jour");
      }
    });
  }

  setupNPCs() {
    console.log("[Road1HiddenScene] ⚙️ setupNPCs appelé");
    const npcLayer = this.map.getObjectLayer('NPCs');
    if (npcLayer) {
      console.log(`[Road1HiddenScene] Layer NPCs trouvé avec ${npcLayer.objects.length} NPC(s)`);
      npcLayer.objects.forEach(npcObj => this.createNPC(npcObj));
    } else {
      console.warn("[Road1HiddenScene] ⚠️ Layer 'NPCs' non trouvé");
    }
  }

  createNPC(npcData) {
    console.log(`[Road1HiddenScene] Création NPC: ${npcData.name || 'Sans nom'}`);
    const npc = this.add.rectangle(
      npcData.x + npcData.width / 2,
      npcData.y + npcData.height / 2,
      npcData.width,
      npcData.height,
      0x800080 // Couleur violet mystérieux pour zone cachée
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
      this.interactWithNPC(npcData.name || 'Mystérieux');
    });

    console.log(`[Road1HiddenScene] 👤 NPC créé : ${npcData.name || 'Sans nom'}`);
  }

  interactWithNPC(npcName) {
    console.log(`[Road1HiddenScene] 💬 Interaction avec ${npcName}`);
    const dialogues = {
      Sage: "Peu de dresseurs trouvent cet endroit secret...",
      Oracle: "Les mystères de cette zone ne sont pas pour tous.",
      Gardien: "Cette zone est protégée par d'anciennes forces.",
      Alchimiste: "Ici, je crée des objets rares et puissants.",
      Ermite: "J'ai choisi de vivre à l'écart du monde.",
      Mystique: "Les énergies de cet endroit sont... particulières.",
      Chercheur: "J'étudie les phénomènes étranges de cette zone.",
      Mystérieux: "Vous avez découvert l'un des secrets de la Route 1...",
    };
    const message = dialogues[npcName] || 'Bienvenue dans ce lieu mystérieux...';
    
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
      console.log(`[Road1HiddenScene] 💬 Dialogue avec ${npcName} détruit`);
    });
  }

  setupHiddenElements() {
    console.log("[Road1HiddenScene] ✨ Ajout d'éléments mystérieux");
    
    // Particules mystérieuses
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        const x = Phaser.Math.Between(100, this.sys.game.config.width - 100);
        const y = Phaser.Math.Between(100, this.sys.game.config.height - 100);
        
        const sparkle = this.add.circle(x, y, 3, 0x9370DB);
        sparkle.setAlpha(0.8);
        
        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          duration: 1500,
          ease: 'Power2',
          onComplete: () => sparkle.destroy()
        });
      },
      loop: true
    });

    // Message d'avertissement mystérieux
    this.time.delayedCall(3000, () => {
      const warningText = this.add.text(
        this.cameras.main.centerX,
        50,
        '✨ Vous ressentez une énergie mystérieuse... ✨',
        {
          fontSize: '16px',
          fontFamily: 'monospace',
          color: '#9370DB',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: { x: 10, y: 5 },
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      this.time.delayedCall(4000, () => {
        warningText.destroy();
      });
    });
  }

  cleanup() {
    console.log("[Road1HiddenScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
