// ===============================================
// VillageLabScene.js - Version avec InteractionManager SIMPLE
// ===============================================
import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageLabScene extends BaseZoneScene {
  constructor() {
    super('VillageLabScene', 'villagelab');
    this.transitionCooldowns = {};
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageLabScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions
    this.add.text(16, 16, 'Laboratoire Pokémon\nFlèches pour se déplacer\nAppuyez sur "E" près de la table starter', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil
    this.setupLabEvents();
  }

  setupLabEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageLabScene] Bienvenue au Laboratoire !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLaboratoire Pokémon\nConnected!');
      }
    });
  }

  cleanup() {
    console.log("[VillageLabScene] cleanup appelé");
    this.transitionCooldowns = {};
    super.cleanup();
  }
}

console.log("✅ VillageLabScene chargée avec InteractionManager pour starter");
