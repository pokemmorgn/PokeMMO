// ===============================================
// LoaderScene.js - Version corrigée
// ===============================================
export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
  }

  preload() {
    this.createLoadingBar();

    // ✅ Maps
    this.load.tilemapTiledJSON('beach', 'assets/maps/beach.tmj');
    this.load.tilemapTiledJSON('village', 'assets/maps/village.tmj');
    this.load.tilemapTiledJSON('villagelab', 'assets/maps/villagelab.tmj');
    this.load.tilemapTiledJSON('villagehouse1', 'assets/maps/villagehouse1.tmj');
    this.load.tilemapTiledJSON('lavandia', 'assets/maps/lavandia.tmj');
    this.load.tilemapTiledJSON('road1', 'assets/maps/road1.tmj');
    // ✅ Tilesets
    this.load.image('Assets', 'assets/sprites/Assets.png');
    this.load.image('Greenroot', 'assets/sprites/Greenroot.png');
    this.load.image('LaboInterior', 'assets/sprites/LaboInterior.png');
    this.load.image('LaboInterior2', 'assets/sprites/LaboInterior2.png');
    this.load.image('FloatingRing_1', 'assets/sprites/FloatingRing_1.png');
    this.load.image('RockFloating_1', 'assets/sprites/RockFloating_1.png');
    this.load.image('RockFloating_2', 'assets/sprites/RockFloating_2.png');
    this.load.image('RockFloating_3', 'assets/sprites/Rockfloating_3.png');
    this.load.image('Umbrella', 'assets/sprites/Umbrella.png');
    this.load.image('Water', 'assets/sprites/Water.png');
    this.load.image('Water_2', 'assets/sprites/Water_2.png');
    this.load.image('Water_3', 'assets/sprites/Water_3.png');

    // Npcs
    this.load.spritesheet('OldMan', 'assets/npc/OldMan.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('Scientist', 'assets/npc/Scientist.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('OldLady', 'assets/npc/OldLady.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('BrownGuy', 'assets/npc/BrownGuy.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('BlondeGirl', 'assets/npc/BlondeGirl.png', { frameWidth: 32, frameHeight: 32 });

    // Charger le spritesheet du joueur (32x32 par frame)
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
    // ✅ Progress events
    this.load.on('progress', (progress) => {
      this.updateProgressBar(progress);
    });

    this.load.on('complete', () => {
      console.log('✅ Tous les assets sont chargés !');
      this.startGame();
    });

    // ✅ Error handling
    this.load.on('loaderror', (file) => {
      console.error('❌ Erreur de chargement:', file.src);
    });
  }

  updateProgressBar(progress) {
    if (this.progressBar) {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ff00);
      this.progressBar.fillRect(250, 280, 300 * progress, 20);
    }
    if (this.progressText) {
      this.progressText.setText(Math.round(progress * 100) + '%');
    }
  }

  async startGame() {
    // Récupérer la dernière position et démarrer la bonne scène
    const getWalletFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('wallet');
    };

    let identifier = getWalletFromUrl();
    if (!identifier && window.app?.currentAccount?.address) {
      identifier = window.app.currentAccount.address;
    }
    if (!identifier) {
      alert("Aucun wallet connecté !");
      return;
    }

    try {
      const res = await fetch(`/api/playerData?username=${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const data = await res.json();
        const lastMap = data.lastMap || 'Beach';
        switch (lastMap.toLowerCase()) {
          case 'beach':
            this.scene.start('BeachScene');
            break;
          case 'village':
            this.scene.start('VillageScene');
            break;
          case 'villagelab':
            this.scene.start('VillageLabScene');
            break;
          case 'road1':
            this.scene.start('Road1Scene');
            break;
            case 'villagehouse1':
            this.scene.start('VillageHouse1Scene');
            break;
            case 'lavandia':
            this.scene.start('LavandiaScene');
            break;
          default:
            this.scene.start('BeachScene');
        }
      } else {
        this.scene.start('BeachScene');
      }
    } catch (e) {
      console.warn("Erreur API, démarrage BeachScene", e);
      this.scene.start('BeachScene');
    }
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
