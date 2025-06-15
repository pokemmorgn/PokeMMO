import { NetworkManager } from "../network/NetworkManager.js";
import { PlayerManager } from "../game/PlayerManager.js";
import { CameraManager } from "../camera/CameraManager.js";

export class MapLoaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapLoaderScene' });
  }

  preload() {
    this.load.tilemapTiledJSON('greenroot', 'assets/maps/Greenroot.tmj');
    this.load.image('Greenroot_tiles', 'assets/sprites/Greenroot.png');
    this.load.image('Test_tiles', 'assets/sprites/Test.png');
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  create() {
    this.createPlayerAnimations();

    this.map = this.make.tilemap({ key: 'greenroot' });

    const greenrootTileset = this.map.addTilesetImage('Greenroot', 'Greenroot_tiles');
    const testTileset = this.map.addTilesetImage('Test', 'Test_tiles');

    this.groundLayer = this.map.createLayer('Terrain', [greenrootTileset, testTileset], 0, 0);
    this.groundLayer2 = this.map.createLayer('Terrain2', [greenrootTileset, testTileset], 0, 0);
    this.belowLayer = this.map.createLayer('BelowPlayer', [greenrootTileset, testTileset], 0, 0);
    this.belowLayer.setDepth(1);

    // Charger et créer les collisions à partir du layer object "Collisions"
    this.collisionObjects = this.map.getObjectLayer('Collisions');
    this.collidersGroup = this.physics.add.staticGroup();
    if (this.collisionObjects && this.collisionObjects.objects.length > 0) {
      this.collisionObjects.objects.forEach(obj => {
        const rect = this.add.rectangle(obj.x + obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
        this.physics.add.existing(rect, true);
        this.collidersGroup.add(rect);
      });
    }

    this.aboveLayer = this.map.createLayer('AbovePlayer', [greenrootTileset, testTileset], 0, 0);
    this.aboveLayer.setDepth(10);

    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);

    this.cameraManager = new CameraManager(this);
    this.setupInputs();
    this.setupManagers();
    this.setupGameVariables();
    this.createUI();
    this.setupNetwork();
    this.connectToServer();

    // Attends que le joueur soit créé dans PlayerManager, puis configure collision et profondeur
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer) {
          myPlayer.setDepth(5);  // profondeur entre belowLayer (1) et aboveLayer (10)
          this.physics.add.collider(myPlayer, this.collidersGroup);
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
          // Stop la boucle quand le joueur est prêt
          this.time.removeAllEvents();
        }
      }
    });
  }

  createPlayerAnimations() {
    if (!this.textures.exists('dude')) {
      console.error("Spritesheet 'dude' non trouvé !");
      return;
    }

    this.anims.create({
      key: 'walk_left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({ key: 'idle_left', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({ key: 'idle_right', frames: [{ key: 'dude', frame: 9 }], frameRate: 1 });

    this.anims.create({
      key: 'walk_up',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({ key: 'idle_up', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });

    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({ key: 'idle_down', frames: [{ key: 'dude', frame: 9 }], frameRate: 1 });
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();
  }

  setupManagers() {
    this.networkManager = new NetworkManager();
    this.playerManager = new PlayerManager(this);
  }

  setupGameVariables() {
    this.mySessionId = null;
    this.cameraFollowing = false;
    this.lastDirection = 'down';
  }

  createUI() {
    this.infoText = this.add.text(16, 16, 'PokeWorld MMO - GreenRoot\nConnecting...', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 50, 0, 0.8)',
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(1000);
  }

  setupNetwork() {
    this.networkManager.onConnect(() => {
      this.mySessionId = this.networkManager.getSessionId();
      this.playerManager.setMySessionId(this.mySessionId);
      this.infoText.setText('PokeWorld MMO - GreenRoot\nConnected!');
    });

    this.networkManager.onStateChange((state) => {
      this.playerManager.updatePlayers(state);

      if (!this.cameraFollowing) {
        const myPlayer = this.playerManager.getMyPlayer();
        if (myPlayer && this.cameraManager) {
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
        }
      }
    });

    this.networkManager.onDisconnect(() => {
      this.infoText.setText('PokeWorld MMO\nDisconnected');
    });
  }

  async connectToServer() {
    const connected = await this.networkManager.connect();
    if (!connected) {
      this.infoText.setText('PokeWorld MMO\nConnection failed!');
      console.error("Échec de connexion au serveur");
    }
  }

  update() {
    if (this.cameraManager) this.cameraManager.update();

    if (!this.networkManager.getSessionId()) return;

    const myPlayerState = this.networkManager.getPlayerState(this.networkManager.getSessionId());
    if (!myPlayerState) return;

    this.handleMovement(myPlayerState);
  }

  handleMovement(myPlayerState) {
    const speed = 4;
    let newX = myPlayerState.x;
    let newY = myPlayerState.y;
    let moved = false;
    let direction = null;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      newX -= speed;
      moved = true;
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      newX += speed;
      moved = true;
      direction = 'right';
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      newY -= speed;
      moved = true;
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      newY += speed;
      moved = true;
      direction = 'down';
    }

    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer) {
      if (moved && direction) {
        myPlayer.play(`walk_${direction}`, true);
        this.lastDirection = direction;
      } else {
        myPlayer.play(`idle_${this.lastDirection}`, true);
      }
    }

    if (moved) {
      this.networkManager.sendMove(newX, newY);
    }
  }
}
