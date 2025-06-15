// src/scenes/LoaderScene.js - Mise à jour pour la nouvelle architecture

export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
  }

  preload() {
    // Barre de progression
    this.createLoadingBar();

    // Charger toutes les maps d'un coup
    this.load.tilemapTiledJSON('GreenRootBeach', 'assets/maps/GreenRootBeach.tmj');
    this.load.tilemapTiledJSON('Greenroot', 'assets/maps/Greenroot.tmj'); // Corrigé la casse

    // Charger les tilesets communs
    this.load.image('All', 'assets/sprites/All.png');
    this.load.image('Beach', 'assets/sprites/Beach.png');
    this.load.image('AnimatedPalmTree', 'assets/sprites/AnimatedPalmTree.png');

    // Charger le spritesheet du joueur
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    // Sons d'ambiance (optionnel pour plus tard)
    // this.load.audio('ocean_waves', 'assets/audio/ocean_waves.ogg');
    // this.load.audio('village_theme', 'assets/audio/village_theme.ogg');

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

  let lastMap = "BeachScene"; // défaut
  try {
    const username = window.username;
const res = await fetch(`http://localhost:2567/api/playerData?username=${encodeURIComponent(username)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.lastMap) {
        // Pour éviter toute confusion de casse ou d'ID
        if (["BeachScene", "VillageScene", "Road1Scene"].includes(data.lastMap)) {
          lastMap = data.lastMap;
        } else if (data.lastMap.toLowerCase().includes("beach")) {
          lastMap = "BeachScene";
        } else if (data.lastMap.toLowerCase().includes("village")) {
          lastMap = "VillageScene";
        } else if (data.lastMap.toLowerCase().includes("road")) {
          lastMap = "Road1Scene";
        }
      }
      console.log("🌍 Last map from DB:", lastMap);
    } else {
      console.warn("❓ API playerData NOK, default to Beach");
    }
  } catch (e) {
    console.warn("❌ API playerData error, default to Beach", e);
  }

  // Démarre la SCÈNE selon la sauvegarde !
  this.scene.start(lastMap);
});
  }

  createLoadingBar() {
    // Fond de la barre de progression
    this.add.rectangle(400, 290, 320, 40, 0x222222);
    
    // Barre de progression
    this.progressBar = this.add.graphics();
    
    // Texte de pourcentage
    this.progressText = this.add.text(400, 290, '0%', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Titre du jeu
    this.add.text(400, 200, 'PokeWorld MMO', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Texte de chargement
    this.add.text(400, 240, 'Loading world...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc'
    }).setOrigin(0.5);
  }
}