// src/scenes/LoaderScene.js - Version simple sans dynamique

export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
  }

  preload() {
    // Barre de progression (optionnel)
    this.createLoadingBar();

    // Charger la map Tiled
    this.load.tilemapTiledJSON('greenroot', 'assets/maps/GreenRoot.tmj');

    // Charger le tileset All.png
    this.load.image('All', 'assets/sprites/All.png');

    // Charger le spritesheet dude
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    this.load.on('progress', (progress) => {
      if (this.progressBar) {
        this.progressBar.clear();
        this.progressBar.fillStyle(0x00ff00);
        this.progressBar.fillRect(250, 280, 300 * progress, 20);
      }
      if (this.progressText) {
        this.progressText.setText(Math.round(progress * 100) + '%');
      }
    });

    this.load.on('complete', () => {
      this.scene.start('MapLoaderScene');
    });
  }

  createLoadingBar() {
    this.add.rectangle(400, 290, 320, 40, 0x222222);
    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(400, 290, '0%', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5);
  }
}
