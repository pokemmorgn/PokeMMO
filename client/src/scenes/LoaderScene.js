// ===============================================
// LoaderScene.js - Version centralisée avec ZoneMapping
// ===============================================
import { 
  generateMapLoadConfig, 
  zoneToScene, 
  getAllZones 
} from "../config/ZoneMapping.js";

export class LoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoaderScene' });
    window.PokemonSpriteConfig = null;
  }
  
  preload() {
    this.createLoadingBar();

    // ✅ CHARGEMENT AUTOMATIQUE DE TOUTES LES MAPS
    console.log('🗺️ [LoaderScene] Chargement automatique des maps...');
    const mapConfigs = generateMapLoadConfig();
    
    mapConfigs.forEach(config => {
      this.load.tilemapTiledJSON(config.key, config.path);
      console.log(`📋 [LoaderScene] Map ajoutée: ${config.key} → ${config.path}`);
    });
    
    console.log(`✅ [LoaderScene] ${mapConfigs.length} maps chargées automatiquement`);

    // ✅ Tilesets (inchangé)
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

    // 🎵 MUSIQUES (inchangé)
    this.load.audio('village_theme', 'assets/audio/music/village_theme.mp3');
    this.load.audio('lavandia_theme', 'assets/audio/music/lavandia_theme.mp3');
    this.load.audio('road1_theme', 'assets/audio/music/road1_theme.mp3');
    
    // BATTLE BACKGROUND (inchangé)
    // this.load.image('battlebg01', 'assets/battle/bg_battle_01.png');
    
    // Npcs (inchangé)
    this.load.spritesheet('oldman1', 'assets/npc/oldman1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('Scientist', 'assets/npc/scientist1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('OldLady', 'assets/npc/oldlady1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('floristvillage', 'assets/npc/floristvillage.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('scientist1', 'assets/npc/scientist1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('oldlady1', 'assets/npc/oldlady1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fatman1', 'assets/npc/fatman1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('blondegirl', 'assets/npc/blondegirl.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('kid1', 'assets/npc/kid1.png', { frameWidth: 32, frameHeight: 32 });

    // ✅ TEST SIMPLE - Bulbasaur back (inchangé)
    this.load.spritesheet('pokemon_001_back', 'assets/pokemon/001/back.png', {
      frameWidth: 38,
      frameHeight: 38
    });

    // ✅ DEBUG pour voir si ça marche (inchangé)
    this.load.on('filecomplete-spritesheet-pokemon_1_back', () => {
      console.log('✅ pokemon_001_back spritesheet chargé avec succès ! (38x38)');
    });

    this.load.on('loaderror', (file) => {
      if (file.key === 'pokemon_1_back') {
        console.error('❌ ÉCHEC chargement pokemon_1_back:', file.src, file.error);
      }
    });
    
    // Charger le spritesheet du joueur (inchangé)
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    
    // ✅ Progress events (inchangé)
    this.load.on('progress', (progress) => {
      this.updateProgressBar(progress);
    });

    this.load.on('complete', () => {
      console.log('✅ Tous les assets sont chargés !');
      this.startGame();
    });

    // ✅ Error handling (inchangé)
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
        const lastMap = data.lastMap || 'beach'; // ✅ Utiliser nom de zone en minuscules
        
        // ✅ CONVERSION AUTOMATIQUE ZONE → SCÈNE
        const targetScene = zoneToScene(lastMap);
        
        console.log(`🎯 [LoaderScene] Redirection automatique: ${lastMap} → ${targetScene}`);
        
        this.scene.start(targetScene);
        
      } else {
        console.log('📍 [LoaderScene] Pas de données utilisateur, démarrage BeachScene');
        this.scene.start('BeachScene');
      }
    } catch (e) {
      console.warn("⚠️ [LoaderScene] Erreur API, démarrage BeachScene", e);
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
    // Charge ton JSON custom (inchangé)
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
