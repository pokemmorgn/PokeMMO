// client/src/scenes/zones/BaseZoneScene.js - VERSION CENTRALISÉE PRÊTE À L'EMPLOI

import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { TransitionManager } from '../../transitions/TransitionManager.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super({ key: sceneKey });
    this.mapKey = mapKey;
    this.phaserTilesets = [];
    this.layers = {};

    // État principal
    this.mySessionId = null;
    this.networkManager = null;
    this.isSceneReady = false;
    this.myPlayerReady = false;
    this.currentZone = null;
    this.serverZoneConfirmed = false;

    // Systèmes de jeu
    this.inventorySystem = null;
    this.shopIntegration = null;
    this.questSystem = null;

    this.cameraFollowing = false;
    this.lastDirection = 'down';
    this.lastMoveTime = 0;

    console.log(`🎮 [${sceneKey}] === CONSTRUCTION SCÈNE CENTRALISÉE ===`);
  }

  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    if (window.showLoadingOverlay) window.showLoadingOverlay("Chargement de la zone...");

    // Animations, map, inputs, UI
    this.createAnimations();
    this.loadMap();
    this.setupInputs();
    this.createUI();
    this.setupManagers();

    // Transition manager unique
    if (!this.transitionManager) {
      this.transitionManager = new TransitionManager(this);
      this.transitionManager.initialize();
    }

    // --- 💡 CONNECTION COLYSEUS CENTRALISÉE ---
    this.networkManager = window.globalNetworkManager; // On prend l’instance unique
    this.mySessionId = this.networkManager.getSessionId();

    // On passe le NetworkManager déjà connecté
    this.useExistingNetwork(this.networkManager, this.scene.settings.data);

    this.isSceneReady = true;
    this.setupCleanupHandlers();

    console.log(`🎮 [${this.scene.key}] ✅ Création terminée`);
  }

  useExistingNetwork(networkManager, sceneData = null) {
    this.networkManager = networkManager;
    this.mySessionId = networkManager.getSessionId();

    // Setup player manager
    if (this.playerManager) {
      this.playerManager.setMySessionId(this.mySessionId);
    }

    this.setupNetworkHandlers();

    // Init inventaire/quests (toujours depuis globals)
    this.initializeInventorySystem();
    integrateShopToScene(this, this.networkManager);
    this.initializeQuestSystem();

    // Zone demandée au serveur
    this.requestServerZone();

    if (sceneData?.fromTransition) {
      this.handleTransitionData(sceneData);
    }
  }

  setupNetworkHandlers() {
    // HANDLERS COLYSEUS
    this.networkManager.onCurrentZone((data) => {
      this.currentZone = data.zone;
      this.serverZoneConfirmed = true;

      const expectedScene = this.mapZoneToScene(this.currentZone);
      if (expectedScene && expectedScene !== this.scene.key) {
        this.redirectToCorrectScene(expectedScene, data);
        return;
      }
      if (this.playerManager) this.playerManager.currentZone = this.currentZone;
      if (this.transitionManager) this.transitionManager.currentZone = this.currentZone;
    });

    this.networkManager.onConnect(() => {
      this.mySessionId = this.networkManager.getSessionId();
      if (this.playerManager) this.playerManager.setMySessionId(this.mySessionId);
      this.myPlayerReady = false;
      setTimeout(() => this.requestServerZone(), 100);
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!`);
      this.initializeQuestSystem();
    });

    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady) return;
      if (!state?.players || !this.playerManager) return;
      this.playerManager.updatePlayers(state);
      this.handleMyPlayerFromState();
      if (!this.myPlayerReady && this.mySessionId) {
        this.time.delayedCall(100, () => {
          if (!this.myPlayerReady) this.handleMissingPlayer();
        });
      }
    });

    this.networkManager.onZoneData((data) => {
      if (data.zone === this.currentZone) this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      if (this.npcManager && npcs.length > 0) this.npcManager.spawnNpcs(npcs);
    });

    this.networkManager.onNpcInteraction((result) => this.handleNpcInteraction(result));
    this.networkManager.onSnap((data) => {
      if (this.playerManager) this.playerManager.snapMyPlayerTo(data.x, data.y);
    });
    this.networkManager.onDisconnect(() => {
      this.myPlayerReady = false;
      if (this.transitionManager) this.transitionManager.setActive(false);
    });
  }

  requestServerZone() {
    if (!this.networkManager?.room) return;
    this.networkManager.room.send("requestCurrentZone", {
      sceneKey: this.scene.key,
      timestamp: Date.now()
    });
  }

  handleMyPlayerFromState() {
    if (this.myPlayerReady) return;
    if (!this.networkManager?.isConnected) return;

    const playerData = this.networkManager?.state?.players?.get(this.mySessionId);
    let myPlayer = this.playerManager.getMyPlayer();

    if (myPlayer && playerData) {
      this.myPlayerReady = true;
      if (window.hideLoadingOverlay) window.hideLoadingOverlay();
      myPlayer.setVisible(true);
      myPlayer.setActive(true);
      myPlayer.setDepth(5);
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.positionPlayer(myPlayer);
      if (typeof this.onPlayerReady === 'function') this.onPlayerReady(myPlayer);
      if (window.pendingSceneStop) {
        this.scene.scene.stop(window.pendingSceneStop);
        window.pendingSceneStop = null;
      }
      return;
    }
    if (!myPlayer && playerData) {
      myPlayer = this.playerManager.createPlayer(this.mySessionId, playerData.x, playerData.y);
      this.handleMyPlayerFromState();
      return;
    }
    if (!playerData) {
      if (!this._waitingForPlayer) {
        this._waitingForPlayer = true;
        if (window.showLoadingOverlay) window.showLoadingOverlay("Connexion à la nouvelle zone...");
      }
      return;
    }
  }

  handleMissingPlayer() {
    if (!this.mySessionId || !this.networkManager?.isConnected) return;
    if (this.networkManager.room) {
      this.networkManager.room.send("requestSync", {
        sessionId: this.mySessionId,
        currentZone: this.networkManager.getCurrentZone()
      });
    }
    this.time.delayedCall(500, () => {
      if (!this.myPlayerReady && this.playerManager) {
        this.playerManager.forceResynchronization();
        this.time.delayedCall(1000, () => {
          if (!this.myPlayerReady) this.createEmergencyPlayer();
        });
      }
    });
  }

  createEmergencyPlayer() {
    if (!this.playerManager || this.myPlayerReady) return;
    const initData = this.scene.settings.data;
    let spawnX = 52, spawnY = 48;
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      spawnX = initData.spawnX;
      spawnY = initData.spawnY;
    }
    const emergencyPlayer = this.playerManager.createPlayer(this.mySessionId, spawnX, spawnY);
    if (emergencyPlayer) {
      emergencyPlayer.setVisible(true);
      emergencyPlayer.setActive(true);
      emergencyPlayer.setDepth(5);
      this.cameraManager.followPlayer(emergencyPlayer);
      this.cameraFollowing = true;
      this.myPlayerReady = true;
      if (window.hideLoadingOverlay) window.hideLoadingOverlay();
      if (this.networkManager?.isConnected) {
        this.networkManager.sendMove(spawnX, spawnY, 'down', false);
      }
      if (typeof this.onPlayerReady === 'function') this.onPlayerReady(emergencyPlayer);
    }
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;
    let finalX, finalY;
    if (initData?.fromTransition && (initData.spawnX !== undefined || initData.spawnY !== undefined)) {
      finalX = initData.spawnX;
      finalY = initData.spawnY;
    }
    else if (initData?.serverResult?.position) {
      finalX = initData.serverResult.position.x;
      finalY = initData.serverResult.position.y;
    }
    else {
      const defaultPos = this.getDefaultSpawnPosition();
      finalX = defaultPos.x;
      finalY = defaultPos.y;
    }
    player.x = finalX;
    player.y = finalY;
    player.targetX = finalX;
    player.targetY = finalY;
    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);
    if (player.indicator) {
      player.indicator.x = finalX;
      player.indicator.y = finalY - 32;
      player.indicator.setVisible(true);
    }
    if (this.networkManager?.isConnected) {
      this.networkManager.sendMove(finalX, finalY, 'down', false);
    }
  }

  handleZoneData(data) {
    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }
  }

  handleNpcInteraction(result) {
    if (window._questDialogActive) return;
    if (result.type === "shop") {
      if (this.shopIntegration?.getShopSystem()) {
        this.shopIntegration.handleShopNpcInteraction(result);
        return;
      }
    }
    if (result.type === "dialogue") {
      let npcName = "???";
      let portrait = result.portrait;
      if (result.npcId && this.npcManager) {
        const npc = this.npcManager.getNpcData(result.npcId);
        if (npc) {
          npcName = npc.name;
          if (!portrait && npc.sprite) portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
        }
      }
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: portrait || "/assets/portrait/unknownPortrait.png",
          name: npcName,
          lines: result.lines || [result.message]
        });
      }
    }
    else if (result.type === "questGiver" || result.type === "questComplete" || result.type === "questProgress") {
      if (window.questSystem?.handleNpcInteraction) {
        window.questSystem.handleNpcInteraction(result);
      }
    }
    else {
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "???",
          text: result.message || JSON.stringify(result)
        });
      }
    }
  }

  initializeInventorySystem() {
    // Toujours utiliser le global déjà créé
    if (window.inventorySystem) {
      if (this.networkManager?.room) {
        window.inventorySystem.gameRoom = this.networkManager.room;
        window.inventorySystem.setupServerListeners();
      }
      this.inventorySystem = window.inventorySystem;
      return;
    }
    try {
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);
      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }
      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;
      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }
      this.time.delayedCall(2000, () => {
        this.inventorySystem?.requestInventoryData();
      });
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur inventaire:`, error);
    }
  }

  initializeQuestSystem() {
    // Toujours utiliser le global déjà créé
    if (!window.questSystem && this.networkManager?.room) {
      try {
        window.questSystem = new QuestSystem(this, this.networkManager.room);
        this.questSystem = window.questSystem;
      } catch (e) {
        console.error("❌ Erreur QuestSystem:", e);
      }
    }
  }

  // --- UTILITAIRES --- (à adapter selon tes besoins)
  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
  }

  createAnimations() {
    if (!this.textures.exists('dude') || this.anims.exists('walk_left')) return;

    this.anims.create({
      key: 'walk_left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_left', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_right', frames: [{ key: 'dude', frame: 5 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_up',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_up', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_down', frames: [{ key: 'dude', frame: 5 }], frameRate: 1 });
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // INTERACTION E
    this.input.keyboard.on("keydown-E", () => {
      if (window._questDialogActive) return;
      if (typeof window.isChatFocused === "function" && window.isChatFocused()) return;
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display !== 'none') return;
      if (typeof window.isInventoryOpen === "function" && window.isInventoryOpen()) return;
      if (this.isShopOpen()) return;

      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;
      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager?.sendNpcInteract(npc.id);
      }
    });
  }

  createUI() {
    this.infoText = this.add.text(16, 16, `PokeWorld MMO\n${this.scene.key}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 50, 0, 0.8)',
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    this.coordsText = this.add.text(this.scale.width - 16, 16, 'Player: x:0, y:0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(255, 0, 0, 0.8)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000).setOrigin(1, 0);
  }

  loadMap() {
    this.map = this.make.tilemap({ key: this.mapKey });
    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        this.load.image(tileset.name, `assets/sprites/${tileset.name}.png`);
        needsLoading = true;
      }
    });

    const finishLoad = () => {
      this.phaserTilesets = this.map.tilesets.map(ts => this.map.addTilesetImage(ts.name, ts.name));
      this.layers = {};
      const depthOrder = { 'BelowPlayer': 1, 'BelowPlayer2': 2, 'World': 3, 'AbovePlayer': 4, 'Grass': 1.5 };
      this.map.layers.forEach(layerData => {
        const layer = this.map.createLayer(layerData.name, this.phaserTilesets, 0, 0);
        this.layers[layerData.name] = layer;
        layer.setDepth(depthOrder[layerData.name] ?? 0);
      });
      if (this.sys.animatedTiles) this.sys.animatedTiles.init(this.map);
      this.worldLayer = this.layers['World'];
      if (this.worldLayer) this.worldLayer.setCollisionByProperty({ collides: true });
      this.setupScene();
    };

    if (needsLoading) {
      this.load.once('complete', finishLoad);
      this.load.start();
    } else {
      finishLoad();
    }
  }

  setupScene() {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    const baseWidth = this.scale.width;
    const baseHeight = this.scale.height;
    const zoomX = baseWidth / this.map.widthInPixels;
    const zoomY = baseHeight / this.map.heightInPixels;
    const zoom = Math.min(zoomX, zoomY);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);
    this.cameraManager = new CameraManager(this);
  }

  // --- CLEANUP ---
  cleanup() {
    TransitionIntegration.cleanupTransitions(this);
    const isTransition = this.networkManager?.isTransitioning();
    if (!isTransition) {
      if (this.playerManager) this.playerManager.clearAllPlayers();
    }
    if (this.npcManager) this.npcManager.clearAllNpcs();
    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.isSceneReady = false;
    this.serverZoneConfirmed = false;
  }
  setupCleanupHandlers() {
    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
  }

  // --- UPDATE ---
  update() {
    TransitionIntegration.updateTransitions(this);
    if (this.transitionManager && this.playerManager?.getMyPlayer()) {
      this.transitionManager.checkCollisions(this.playerManager.getMyPlayer());
    }
    if (this.playerManager) this.playerManager.update();
    if (this.cameraManager) this.cameraManager.update();
    if (this.sys.animatedTiles?.update) this.sys.animatedTiles.update();
    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }
    this.handleMovement();
  }

  handleMovement() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) return;

    const speed = 120;
    let vx = 0, vy = 0;
    let moved = false, direction = null;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed; moved = true; direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed; moved = true; direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed; moved = true; direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed; moved = true; direction = 'down';
    }

    myPlayer.body.setVelocity(vx, vy);

    if (moved && direction) {
      myPlayer.play(`walk_${direction}`, true);
      this.lastDirection = direction;
      myPlayer.isMovingLocally = true;
    } else {
      myPlayer.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
    }

    if (moved) {
      const now = Date.now();
      if (!this.lastMoveTime || now - this.lastMoveTime > 50) {
        this.networkManager?.sendMove(
          myPlayer.x,
          myPlayer.y,
          direction || this.lastDirection,
          moved
        );
        this.lastMoveTime = now;
      }
    }
  }

  // --- UTILS ---
  updateInfoText(text) {
    if (this.infoText) this.infoText.setText(text);
  }

  showError(message) {
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();
    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    this.time.delayedCall(5000, () => {
      this.initializeNetworking?.();
    });
  }

  showNotification(message, type = 'info') {
    const notification = this.add.text(
      this.cameras.main.centerX,
      50,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : '#44ff44',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      if (notification?.scene) notification.destroy();
    });
  }

  getDefaultSpawnPosition() {
    return { x: 52, y: 48 };
  }

  // --- ZONE <-> SCENE ---
  mapSceneToZone(sceneName) {
    const mapping = {
      'BeachScene': 'beach',
      'VillageScene': 'village',
      'VillageLabScene': 'villagelab',
      'Road1Scene': 'road1',
      'VillageHouse1Scene': 'villagehouse1',
      'LavandiaScene': 'lavandia'
    };
    return mapping[sceneName] || sceneName.toLowerCase();
  }
  mapZoneToScene(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene',
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene'
    };
    return mapping[zoneName?.toLowerCase()] || null;
  }

  getShopSystem() {
    return this.shopIntegration?.getShopSystem() || null;
  }
  isShopOpen() {
    return this.shopIntegration?.getShopSystem()?.isShopOpen() || false;
  }
  debugShop() {
    if (this.shopIntegration) this.shopIntegration.debugShopState();
  }

  // HOOKS POUR CLASSES ENFANTS
  onPlayerReady(player) {
    this.hasStoppedPreviousScene = false;
    const previousSceneKey = this.initData?.fromScene;
    if (previousSceneKey && previousSceneKey !== this.scene.key) {
      const onFirstMove = (event) => {
        if (!this.hasStoppedPreviousScene) {
          this.hasStoppedPreviousScene = true;
          if (this.scene.isActive(previousSceneKey)) {
            this.scene.stop(previousSceneKey);
          }
          this.input.keyboard.off('keydown', onFirstMove, this);
        }
      };
      this.input.keyboard.on('keydown', onFirstMove, this);
    }
  }

  debugState() {
    console.log(`🔍 [${this.scene.key}] === DEBUG ÉTAT ===`);
    console.log(`🎮 Scène prête: ${this.isSceneReady}`);
    console.log(`👤 Joueur prêt: ${this.myPlayerReady}`);
    console.log(`🆔 SessionId: ${this.mySessionId}`);
    console.log(`📍 Zone courante: ${this.currentZone}`);
    console.log(`✅ Zone confirmée: ${this.serverZoneConfirmed}`);
    console.log(`📡 NetworkManager: ${!!this.networkManager}`);
    console.log(`🔌 Connecté: ${this.networkManager?.isConnected || false}`);
    console.log(`🌀 En transition: ${this.networkManager?.isTransitioning() || false}`);
    if (this.networkManager) this.networkManager.debugState?.();
    if (this.transitionManager) this.transitionManager.debugInfo?.();
  }
}
