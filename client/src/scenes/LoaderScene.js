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

    // Tilesets communs et labo
    this.load.image('All', 'assets/sprites/All.png');
    this.load.image('Beach', 'assets/sprites/Beach.png');
    this.load.image('AnimatedPalmTree', 'assets/sprites/AnimatedPalmTree.png');
    this.load.image('LaboInterior1', 'assets/sprites/LaboInterior1.png'); // Ajout
    this.load.image('LaboInterior2', 'assets/sprites/LaboInterior2.png'); // Ajout

    // Spritesheet du joueur
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    // ...progress bar et on('complete') inchangé
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
      console.log('📦 All assets loaded, checking player position...');

      let lastMap = "BeachScene";
      try {
        const username = window.username;
        const res = await fetch(`/api/playerData?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.lastMap) {
            if (["BeachScene", "VillageScene", "Road1Scene", "VillageLabScene"].includes(data.lastMap)) {
              lastMap = data.lastMap;
            } else if (data.lastMap.toLowerCase().includes("beach")) {
              lastMap = "BeachScene";
            } else if (data.lastMap.toLowerCase().includes("village") && !data.lastMap.toLowerCase().includes("lab")) {
              lastMap = "VillageScene";
            } else if (data.lastMap.toLowerCase().includes("road")) {
              lastMap = "Road1Scene";
            } else if (
              data.lastMap.toLowerCase().includes("labo") ||
              data.lastMap.toLowerCase().includes("proflabo")
            ) {
              lastMap = "VillageLabScene";
            }
          }
          console.log("🌍 Last map from DB:", lastMap);
        } else {
          console.warn("❓ API playerData NOK, default to Beach");
        }
      } catch (e) {
        console.warn("❌ API playerData error, default to Beach", e);
      }

      this.scene.start(lastMap);
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