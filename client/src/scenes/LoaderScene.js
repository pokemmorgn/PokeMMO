// ===============================================
// LoaderScene.js - Version corrigée
// ===============================================
export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
        window.PokemonSpriteConfig = null;
  }
  preload() {
    this.createLoadingBar();

    // ✅ Maps
this.load.tilemapTiledJSON('beach', 'assets/maps/beach.tmj');

this.load.tilemapTiledJSON('village', 'assets/maps/village.tmj');
this.load.tilemapTiledJSON('villagelab', 'assets/maps/villagelab.tmj');
this.load.tilemapTiledJSON('villagehouse1', 'assets/maps/villagehouse1.tmj');
this.load.tilemapTiledJSON('villagehouse2', 'assets/maps/villagehouse2.tmj');
this.load.tilemapTiledJSON('villageflorist', 'assets/maps/villageflorist.tmj');

this.load.tilemapTiledJSON('road1', 'assets/maps/road1.tmj');
this.load.tilemapTiledJSON('road1house', 'assets/maps/road1house.tmj');
    this.load.tilemapTiledJSON('road1hidden', 'assets/maps/road1hidden.tmj');

this.load.tilemapTiledJSON('road2', 'assets/maps/road2.tmj');
this.load.tilemapTiledJSON('road3', 'assets/maps/road3.tmj');

this.load.tilemapTiledJSON('lavandia', 'assets/maps/lavandia.tmj');
this.load.tilemapTiledJSON('lavandiaanalysis', 'assets/maps/lavandiaanalysis.tmj');
this.load.tilemapTiledJSON('lavandiabossroom', 'assets/maps/lavandiabossroom.tmj');
this.load.tilemapTiledJSON('lavandiacelebitemple', 'assets/maps/lavandiacelebitemple.tmj');
this.load.tilemapTiledJSON('lavandiaequipment', 'assets/maps/lavandiaequipment.tmj');
this.load.tilemapTiledJSON('lavandiafurniture', 'assets/maps/lavandiafurniture.tmj');
this.load.tilemapTiledJSON('lavandiahealingcenter', 'assets/maps/lavandiahealingcenter.tmj');
this.load.tilemapTiledJSON('lavandiahouse1', 'assets/maps/lavandiahouse1.tmj');
this.load.tilemapTiledJSON('lavandiahouse2', 'assets/maps/lavandiahouse2.tmj');
this.load.tilemapTiledJSON('lavandiahouse3', 'assets/maps/lavandiahouse3.tmj');
this.load.tilemapTiledJSON('lavandiahouse4', 'assets/maps/lavandiahouse4.tmj');
this.load.tilemapTiledJSON('lavandiahouse5', 'assets/maps/lavandiahouse5.tmj');
this.load.tilemapTiledJSON('lavandiahouse6', 'assets/maps/lavandiahouse6.tmj');
this.load.tilemapTiledJSON('lavandiahouse7', 'assets/maps/lavandiahouse7.tmj');
this.load.tilemapTiledJSON('lavandiahouse8', 'assets/maps/lavandiahouse8.tmj');
this.load.tilemapTiledJSON('lavandiahouse9', 'assets/maps/lavandiahouse9.tmj');
this.load.tilemapTiledJSON('lavandiaresearchlab', 'assets/maps/lavandiaresearchlab.tmj');
this.load.tilemapTiledJSON('lavandiashop', 'assets/maps/lavandiashop.tmj');

this.load.tilemapTiledJSON('nocthercave1', 'assets/maps/noctherbcave1.tmj');
this.load.tilemapTiledJSON('nocthercave2', 'assets/maps/noctherbcave2.tmj');
this.load.tilemapTiledJSON('nocthercave2bis', 'assets/maps/noctherbcave2bis.tmj');
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

    // 🎵 MUSIQUES (après BoyWalk)
this.load.audio('village_theme', 'assets/audio/music/village_theme.mp3');
this.load.audio('lavandia_theme', 'assets/audio/music/lavandia_theme.mp3');
this.load.audio('road1_theme', 'assets/audio/music/road1_theme.mp3');
    // BATTTLE BACKGROUND
     // this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    // Npcs
    this.load.spritesheet('oldman1', 'assets/npc/oldman1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('Scientist', 'assets/npc/scientist1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('OldLady', 'assets/npc/oldlady1.png', { frameWidth: 32, frameHeight: 32 });

    // ✅ TEST SIMPLE - Bulbasaur back
this.load.spritesheet('pokemon_001_back', 'assets/pokemon/001/back.png', {
  frameWidth: 38,
  frameHeight: 38
});

// ✅ DEBUG pour voir si ça marche
this.load.on('filecomplete-spritesheet-pokemon_1_back', () => {
  console.log('✅ pokemon_001_back spritesheet chargé avec succès ! (38x38)');
});

this.load.on('loaderror', (file) => {
  if (file.key === 'pokemon_1_back') {
    console.error('❌ ÉCHEC chargement pokemon_1_back:', file.src, file.error);
  }
});
    
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
      // Village
      case 'village':
        this.scene.start('VillageScene');
        break;
      case 'villagelab':
        this.scene.start('VillageLabScene');
        break;
      case 'villagehouse1':
        this.scene.start('VillageHouse1Scene');
        break;
      case 'villagehouse2':
        this.scene.start('VillageHouse2Scene');
        break;
      case 'villageflorist':
        this.scene.start('VillageFloristScene');
        break;

      // Beach
      case 'beach':
        this.scene.start('BeachScene');
        break;

      // Road
      case 'road1':
        this.scene.start('Road1Scene');
        break;
      case 'road1house':
        this.scene.start('Road1HouseScene');
        break;
      case 'road1hidden':
        this.scene.start('Road1HiddenScene');
        break;
      case 'road2':
        this.scene.start('Road2Scene');
        break;
      case 'road3':
        this.scene.start('Road3Scene');
        break;

      // Lavandia
      case 'lavandia':
        this.scene.start('LavandiaScene');
        break;
      case 'lavandiaanalysis':
        this.scene.start('LavandiaAnalysisScene');
        break;
      case 'lavandiabossroom':
        this.scene.start('LavandiaBossRoomScene');
        break;
      case 'lavandiacelebitemple':
        this.scene.start('LavandiaCelebiTempleScene');
        break;
      case 'lavandiaequipment':
        this.scene.start('LavandiaEquipmentScene');
        break;
      case 'lavandiafurniture':
        this.scene.start('LavandiaFurnitureScene');
        break;
      case 'lavandiahealingcenter':
        this.scene.start('LavandiaHealingCenterScene');
        break;
      case 'lavandiahouse1':
        this.scene.start('LavandiaHouse1Scene');
        break;
      case 'lavandiahouse2':
        this.scene.start('LavandiaHouse2Scene');
        break;
      case 'lavandiahouse3':
        this.scene.start('LavandiaHouse3Scene');
        break;
      case 'lavandiahouse4':
        this.scene.start('LavandiaHouse4Scene');
        break;
      case 'lavandiahouse5':
        this.scene.start('LavandiaHouse5Scene');
        break;
      case 'lavandiahouse6':
        this.scene.start('LavandiaHouse6Scene');
        break;
      case 'lavandiahouse7':
        this.scene.start('LavandiaHouse7Scene');
        break;
      case 'lavandiahouse8':
        this.scene.start('LavandiaHouse8Scene');
        break;
      case 'lavandiahouse9':
        this.scene.start('LavandiaHouse9Scene');
        break;
      case 'lavandiaresearchlab':
        this.scene.start('LavandiaResearchLabScene');
        break;
      case 'lavandiashop':
        this.scene.start('LavandiaShopScene');
        break;

      // NoctherCave
      case 'nocthercave1':
        this.scene.start('NoctherCave1Scene');
        break;
      case 'nocthercave2':
        this.scene.start('NoctherCave2Scene');
        break;
      case 'nocthercave2bis':
        this.scene.start('NoctherCave2BisScene');
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
    async create() {
    // Charge ton JSON custom
    try {
      const res = await fetch('assets/pokemon/PokemonSpriteConfig.json');
      window.PokemonSpriteConfig = await res.json();
      console.log('✅ PokemonSpriteConfig chargé !', window.PokemonSpriteConfig);
    } catch (err) {
      console.warn('❌ Impossible de charger PokemonSpriteConfig.json, fallback utilisé.', err);
      window.PokemonSpriteConfig = {
        default: { offsetX: 0, offsetY: 0, scale: 1, spriteWidth: 64, spriteHeight: 64, sheetCols: 9, sheetRows: 9 }
      };
    }

    // Ensuite, démarre le jeu
    this.startGame();
  }
}
