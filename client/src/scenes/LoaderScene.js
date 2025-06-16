// src/scenes/LoaderScene.js

export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
  }

  preload() {
    // Barre de progression
    this.createLoadingBar();

    // Charger toutes les maps d'un coup
    this.load.tilemapTiledJSON('GreenRootBeach', 'assets/maps/GreenRootBeach.tmj');
    this.load.tilemapTiledJSON('Greenroot', 'assets/maps/Greenroot.tmj');
    this.load.tilemapTiledJSON('ProfLaboInt', 'assets/maps/ProfLaboInt.tmj'); // LABO INTERIEUR

    // Tilesets principaux (un par fichier PNG ci-dessous)
    this.load.image('Assets', 'assets/sprites/Assets.png');
    this.load.image('Greenroot', 'assets/sprites/Greenroot.png');
    this.load.image('LaboInterior', 'assets/sprites/LaboInterior.png');
    this.load.image('LaboInterior2', 'assets/sprites/LaboInterior2.png');
    this.load.image('FloatingRing_1', 'assets/sprites/FloatingRing_1.png');
    this.load.image('RockFloating_1', 'assets/sprites/RockFloating_1.png');
    this.load.image('RockFloating_2', 'assets/sprites/RockFloating_2.png');
    this.load.image('RockFloating_3', 'assets/sprites/RockFloating_3.png');
    this.load.image('Umbrella', 'assets/sprites/Umbrella.png');
    this.load.image('Water', 'assets/sprites/Water.png');
    this.load.image('Water_2', 'assets/sprites/Water_2.png');
    this.load.image('Water_3', 'assets/sprites/Water_3.png');

    // Spritesheet du joueur
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    // Progress bar (inchangé)
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

    this.load.on('complete', async () => {
      // ... inchangé (logique pour démarrer la bonne scène)
      // ...
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
    this.add.text(400, 200, 'PokeWorld MMO', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(400, 240, 'Loading world...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc'
    }).setOrigin(0.5);
  }
}