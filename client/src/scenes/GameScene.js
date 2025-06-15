// src/scenes/GameScene.js
import { NetworkManager } from "../network/NetworkManager.js";
import { PlayerManager } from "../game/PlayerManager.js";
import { InputManager } from "../input/InputManager.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets here if needed
  }

  create() {
    console.log("🎮 Game scene created");
    
    // Initialize managers
    this.networkManager = new NetworkManager();
    this.playerManager = new PlayerManager(this);
    this.inputManager = new InputManager(this);
    
    // Setup network callbacks
    this.setupNetworkCallbacks();
    
    // Connect to server
    this.connectToServer();
  }

  setupNetworkCallbacks() {
    // When connected to server
    this.networkManager.onConnect(() => {
      console.log("✅ Successfully connected to game server");
      this.playerManager.setMySessionId(this.networkManager.getSessionId());
    });

    // When game state changes
    this.networkManager.onStateChange((state) => {
      this.playerManager.updatePlayers(state);
    });

    // When receiving player data
    this.networkManager.onPlayerData((data) => {
      console.log("👤 Received player data:", data);
    });

    // When disconnected
    this.networkManager.onDisconnect(() => {
      console.log("❌ Disconnected from server");
    });

    // When player wants to move
    this.inputManager.onMove((x, y) => {
      this.networkManager.sendMove(x, y);
    });
  }

  async connectToServer() {
    const connected = await this.networkManager.connect();
    if (!connected) {
      console.error("Failed to connect to server");
      // Could show an error screen here
    }
  }

  update() {
    // Get current player position
    const mySessionId = this.networkManager.getSessionId();
    const myPlayerState = this.networkManager.getPlayerState(mySessionId);
    
    if (myPlayerState) {
      // Update input based on current position
      this.inputManager.update(myPlayerState.x, myPlayerState.y);
    }
  }

  // Cleanup when scene is destroyed
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
  }
}