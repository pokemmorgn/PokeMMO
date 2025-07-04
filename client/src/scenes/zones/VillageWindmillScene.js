import { BaseZoneScene } from './BaseZoneScene.js';

export class VillageWindmillScene extends BaseZoneScene {
  constructor() {
    super('VillageWindmillScene', 'villagewindmill');
    this.transitionCooldowns = {};
    this.windmillRotation = 0;
    this.windmillBlades = null;
    console.log("[VillageWindmillScene] Constructor appelé");
  }

  // 🔥 HOOK appelé UNE FOIS dès que le joueur local est prêt et positionné
  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[VillageWindmillScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);

    // Affichage instructions spécifiques au Moulin
    this.add.text(16, 16, 'Moulin du Village\nFlèches pour se déplacer\nAppuyez sur "D" pour les hitboxes\nLe moulin produit de la farine !', {
      font: '16px monospace',
      fill: '#000000',
      padding: { x: 10, y: 5 },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }).setScrollFactor(0).setDepth(1001);

    // Événements d'accueil custom pour le Moulin
    this.setupWindmillEvents();
    // Animation du moulin
    this.setupWindmillAnimation();
  }

  setupWindmillEvents() {
    this.time.delayedCall(1000, () => {
      console.log("[VillageWindmillScene] Bienvenue au Moulin du Village !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nMoulin du Village\nConnected!\n🌾 Production active');
        console.log("[VillageWindmillScene] InfoText mise à jour");
      }
    });

    // Événement de production de farine
    this.time.addEvent({
      delay: 5000,
      callback: this.produceFlour,
      callbackScope: this,
      loop: true
    });
  }

  setupWindmillAnimation() {
    // Trouve les objets du moulin dans la carte
    const windmillLayer = this.map.getObjectLayer('Windmill');
    if (windmillLayer) {
      windmillLayer.objects.forEach(obj => {
        if (obj.name === 'WindmillBlades') {
          this.createWindmillBlades(obj);
        }
      });
    }

    // Animation continue des pales
    this.time.addEvent({
      delay: 50,
      callback: this.rotateWindmill,
      callbackScope: this,
      loop: true
    });
  }

  createWindmillBlades(bladesData) {
    // Création visuelle des pales du moulin
    const centerX = bladesData.x + bladesData.width / 2;
    const centerY = bladesData.y + bladesData.height / 2;
    
    this.windmillBlades = this.add.graphics();
    this.windmillBlades.x = centerX;
    this.windmillBlades.y = centerY;
    this.windmillBlades.setDepth(500);
    
    console.log("[VillageWindmillScene] 🌪️ Pales du moulin créées");
  }

  rotateWindmill() {
    if (this.windmillBlades) {
      this.windmillRotation += 2;
      this.windmillBlades.clear();
      
      // Dessine les 4 pales du moulin
      this.windmillBlades.lineStyle(4, 0x8B4513);
      this.windmillBlades.fillStyle(0xDEB887);
      
      for (let i = 0; i < 4; i++) {
        const angle = (this.windmillRotation + i * 90) * Math.PI / 180;
        const x1 = Math.cos(angle) * 5;
        const y1 = Math.sin(angle) * 5;
        const x2 = Math.cos(angle) * 40;
        const y2 = Math.sin(angle) * 40;
        
        this.windmillBlades.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
        
        // Pale triangulaire
        const blade = new Phaser.Geom.Triangle(
          x2, y2,
          x2 + Math.cos(angle + Math.PI/2) * 15, y2 + Math.sin(angle + Math.PI/2) * 15,
          x2 + Math.cos(angle - Math.PI/2) * 15, y2 + Math.sin(angle - Math.PI/2) * 15
        );
        this.windmillBlades.fillTriangleShape(blade);
        this.windmillBlades.strokeTriangleShape(blade);
      }
    }
  }

  produceFlour() {
    console.log("[VillageWindmillScene] 🌾 Production de farine en cours...");
    
    // Effet visuel de production
    const productionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      '🌾 Farine produite ! 🌾',
      {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#FFD700',
        backgroundColor: 'rgba(139, 69, 19, 0.8)',
        padding: { x: 12, y: 8 },
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    // Animation de fade out
    this.tweens.add({
      targets: productionText,
      alpha: 0,
      y: productionText.y - 50,
      duration: 2000,
      onComplete: () => productionText.destroy()
    });
  }



  cleanup() {
    console.log("[VillageWindmillScene] cleanup appelé");
    this.transitionCooldowns = {};
    this.windmillRotation = 0;
    if (this.windmillBlades) {
      this.windmillBlades.destroy();
      this.windmillBlades = null;
    }
    super.cleanup();
  }
}
