// ===============================================
// LoaderScene.js - VERSION INVISIBLE (pas d'UI de chargement)
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
    
    // ✅ Guards contre double appel
    this._gameStarted = false;
    this._isStarting = false;
  }
  
  preload() {
    // ✅ PAS D'UI DE CHARGEMENT - c'est géré par ExtendedLoadingScreen
    console.log('🔇 [LoaderScene] Chargement silencieux (UI gérée par ExtendedLoadingScreen)');

    // ✅ CHARGEMENT AUTOMATIQUE DE TOUTES LES MAPS
    console.log('🗺️ [LoaderScene] Chargement automatique des maps...');
    const mapConfigs = generateMapLoadConfig();
    
    mapConfigs.forEach(config => {
      this.load.tilemapTiledJSON(config.key, config.path);
      console.log(`📋 [LoaderScene] Map ajoutée: ${config.key} → ${config.path}`);
    });
    
    console.log(`✅ [LoaderScene] ${mapConfigs.length} maps chargées automatiquement`);

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

    // 🎵 MUSIQUES
    this.load.audio('village_theme', 'assets/audio/music/village_theme.mp3');
    this.load.audio('lavandia_theme', 'assets/audio/music/lavandia_theme.mp3');
    this.load.audio('road1_theme', 'assets/audio/music/road1_theme.mp3');
    
    // Npcs
    this.load.spritesheet('oldman1', 'assets/npc/oldman1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('Scientist', 'assets/npc/scientist1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('OldLady', 'assets/npc/oldlady1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('floristvillage', 'assets/npc/floristvillage.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('scientist1', 'assets/npc/scientist1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('oldlady1', 'assets/npc/oldlady1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fatman1', 'assets/npc/fatman1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('blondegirl', 'assets/npc/blondegirl.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('kid1', 'assets/npc/kid1.png', { frameWidth: 32, frameHeight: 32 });

    // ✅ Pokémon sprites
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
    
    // Charger le spritesheet du joueur
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    
    // ✅ PAS DE PROGRESS BAR - juste des logs
    this.load.on('progress', (progress) => {
      // ✅ LOG SILENCIEUX au lieu de UI
      if (progress % 0.2 < 0.05) { // Log tous les 20%
        console.log(`📦 [LoaderScene] Progression: ${Math.round(progress * 100)}%`);
      }
    });

    // ✅ Event 'complete' avec guard
    this.load.on('complete', () => {
      console.log('✅ [LoaderScene] Tous les assets sont chargés !');
      
      // ✅ GUARD: Ne pas démarrer si déjà en cours
      if (!this._gameStarted && !this._isStarting) {
        console.log('🚀 [LoaderScene] Démarrage du jeu depuis preload.complete');
        this._isStarting = true;
        this.startGame();
      } else {
        console.log('ℹ️ [LoaderScene] startGame déjà appelé, ignoré');
      }
    });

    // ✅ Error handling
    this.load.on('loaderror', (file) => {
      console.error('❌ Erreur de chargement:', file.src);
    });
  }

  // ✅ PAS DE createLoadingBar() - on utilise ExtendedLoadingScreen

  async startGame() {
    // ✅ GUARD PRINCIPAL: Empêcher double exécution
    if (this._gameStarted) {
      console.log('⚠️ [LoaderScene] startGame déjà exécuté, abandon');
      return;
    }
    
    // ✅ MARQUER COMME DÉMARRÉ IMMÉDIATEMENT
    this._gameStarted = true;
    console.log('🎯 [LoaderScene] === DÉMARRAGE UNIQUE DU JEU ===');

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
        const lastMap = data.lastMap || 'beach';
        
        // ✅ CONVERSION AUTOMATIQUE ZONE → SCÈNE
        const targetScene = zoneToScene(lastMap);
        
        console.log(`🎯 [LoaderScene] Redirection automatique: ${lastMap} → ${targetScene}`);
        
        // ✅ DÉLAI COURT pour s'assurer que ExtendedLoadingScreen a le temps de se fermer
        setTimeout(() => {
          if (this.scene.isActive(targetScene)) {
            console.log('⚠️ [LoaderScene] Scène cible déjà active, restart au lieu de start');
            this.scene.restart(targetScene);
          } else {
            this.scene.start(targetScene);
          }
        }, 500);
        
      } else {
        console.log('📍 [LoaderScene] Pas de données utilisateur, démarrage BeachScene');
        setTimeout(() => {
          this.scene.start('BeachScene');
        }, 500);
      }
    } catch (e) {
      console.warn("⚠️ [LoaderScene] Erreur API, démarrage BeachScene", e);
      setTimeout(() => {
        this.scene.start('BeachScene');
      }, 500);
    }
  }
  
  async create() {
    console.log('🔧 [LoaderScene] create() appelé (mode invisible)');
    
    // ✅ CHARGEMENT JSON SEULEMENT
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

    // ✅ PAS DE startGame() ICI - géré par preload.complete
    console.log('✅ [LoaderScene] create() terminé (mode invisible, pas de UI)');
  }

  // ✅ MÉTHODES DE DEBUG
  getLoaderStatus() {
    return {
      gameStarted: this._gameStarted,
      isStarting: this._isStarting,
      loadComplete: this.load.isLoading() === false,
      sceneActive: this.scene.isActive(),
      sceneVisible: this.scene.isVisible(),
      totalLoaded: this.load.totalComplete,
      totalToLoad: this.load.totalToLoad,
      mode: 'invisible' // Indique qu'on utilise ExtendedLoadingScreen
    };
  }

  resetLoaderState() {
    console.log('🔄 [LoaderScene] Reset état loader');
    this._gameStarted = false;
    this._isStarting = false;
  }

  forceStartGame() {
    console.log('🚀 [LoaderScene] Force start game (debug)');
    this.resetLoaderState();
    this.startGame();
  }

  // ✅ MÉTHODE POUR RENDRE VISIBLE (si nécessaire)
  makeVisible() {
    console.log('👁️ [LoaderScene] Rendre visible');
    this.scene.setVisible(true);
  }

  makeInvisible() {
    console.log('👻 [LoaderScene] Rendre invisible'); 
    this.scene.setVisible(false);
  }
}
