
// src/scenes/PokeMMOScene.js - Style PokeMMO
import { NetworkManager } from "../network/NetworkManager.js";
import { PlayerManager } from "../game/PlayerManager.js";
import { InputManager } from "../input/InputManager.js";
import { CameraManager } from "../camera/CameraManager.js";
import { TilemapManager } from "../map/TilemapManager.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

export class PokeMMOScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PokeMMOScene' });
  }

  preload() {
    console.log("🎮 PokeMMO Scene - Loading assets");
    
    // Pour l'instant, on crée des rectangles colorés comme tiles
    // Plus tard, vous pourrez charger de vrais sprites Pokemon
    this.createBasicTileTextures();
  }

  create() {
    console.log("🌍 PokeMMO Scene - Creating world");
    
    // Initialiser les managers
    this.tilemapManager = new TilemapManager(this);
    this.cameraManager = new CameraManager(this);
    this.networkManager = new NetworkManager();
    this.playerManager = new PlayerManager(this);
    this.inputManager = new InputManager(this);
    
    // Créer le monde
    this.createWorld();
    
    // Configurer les callbacks réseau
    this.setupNetworkCallbacks();
    
    // Se connecter au serveur
    this.connectToServer();
    
    // Créer l'interface utilisateur
    this.createUI();
  }

  createBasicTileTextures() {
    // Créer des textures basiques pour les tiles
    const graphics = this.add.graphics();
    
    // Tile 1: Herbe (vert)
    graphics.fillStyle(0x4CAF50);
    graphics.fillRect(0, 0, GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    graphics.generateTexture('grass_tile', GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    
    // Tile 2: Mur (gris)
    graphics.clear();
    graphics.fillStyle(0x757575);
    graphics.fillRect(0, 0, GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    graphics.generateTexture('wall_tile', GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    
    // Tile 3: Fleur (jaune)
    graphics.clear();
    graphics.fillStyle(0xFFEB3B);
    graphics.fillRect(0, 0, GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    graphics.generateTexture('flower_tile', GAME_CONFIG.tilemap.tileSize, GAME_CONFIG.tilemap.tileSize);
    
    graphics.destroy();
  }

  createWorld() {
    // Créer la tilemap
    const map = this.tilemapManager.createBasicMap();
    
    // Configurer la physique du monde
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    
    // Configurer la caméra
    this.cameraManager.setBounds(map);
    
    console.log("🗺️ World created:", map.widthInPixels, "x", map.heightInPixels);
  }

  createUI() {
    // Texte d'information en haut à gauche (style PokeMMO)
    this.infoText = this.add.text(16, 16, 'PokeWorld MMO\nConnecting...', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    // Compteur de joueurs en ligne
    this.playersCountText = this.add.text(16, 100, 'Players online: 0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // Instructions de mouvement
    this.controlsText = this.add.text(16, this.scale.height - 80, 
      'Use ARROW KEYS or WASD to move', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
  }

  setupNetworkCallbacks() {
    // Connexion établie
    this.networkManager.onConnect(() => {
      console.log("✅ Connected to PokeWorld server");
      this.playerManager.setMySessionId(this.networkManager.getSessionId());
      this.infoText.setText('PokeWorld MMO\nConnected!');
    });

    // Changement d'état du jeu
    this.networkManager.onStateChange((state) => {
      this.playerManager.updatePlayers(state);
      this.updateUI(state);
      
      // Faire suivre notre joueur par la caméra
      const myPlayer = this.playerManager.getMyPlayer();
      if (myPlayer && !this.cameraManager.target) {
        this.cameraManager.followPlayer(myPlayer);
      }
    });

    // Données joueur reçues
    this.networkManager.onPlayerData((data) => {
      console.log("👤 Player data received:", data);
    });

    // Déconnexion
    this.networkManager.onDisconnect(() => {
      console.log("❌ Disconnected from server");
      this.infoText.setText('PokeWorld MMO\nDisconnected');
    });

    // Mouvement du joueur
    this.inputManager.onMove((x, y) => {
      // Vérifier les collisions avant d'envoyer le mouvement
      if (this.tilemapManager.isPositionFree(x, y)) {
        this.networkManager.sendMove(x, y);
      }
    });
  }

  updateUI(state) {
    // Mettre à jour le compteur de joueurs
    const playerCount = state.players.size;
    this.playersCountText.setText(`Players online: ${playerCount}`);
  }

  async connectToServer() {
    const connected = await this.networkManager.connect();
    if (!connected) {
      console.error("❌ Failed to connect to server");
      this.infoText.setText('PokeWorld MMO\nConnection failed!');
    }
  }

  update() {
    // Mettre à jour la caméra
    this.cameraManager.update();
    
    // Mettre à jour les contrôles
    const mySessionId = this.networkManager.getSessionId();
    const myPlayerState = this.networkManager.getPlayerState(mySessionId);
    
    if (myPlayerState) {
      this.inputManager.update(myPlayerState.x, myPlayerState.y);
    }
  }

  // Nettoyage quand la scène est détruite
  destroy() {
    if (this.networkManager) {
      this.networkManager.disconnect();
    }
    if (this.playerManager) {
      this.playerManager.destroy();
    }
    if (this.inputManager) {
      this.inputManager.destroy();
    }
    if (this.cameraManager) {
      this.cameraManager.destroy();
    }
    if (this.tilemapManager) {
      this.tilemapManager.destroy();
    }
  }
}