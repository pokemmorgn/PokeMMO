import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super({ key: sceneKey });
    this.mapKey = mapKey;
    this.phaserTilesets = [];
    this.layers = {};
    this.cameraFollowing = false;
    this.lastDirection = 'down';
    this.mySessionId = null;
    this.loadTimer = null;
    this.animatedObjects = null;
    this.zoneChangedHandler = null; // ✅ AJOUT : Référence du handler
    this.lastMoveTime = 0; // ✅ AJOUT : Pour le throttling des mouvements
  }

  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);

    if (!this.textures.exists('dude')) {
      this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48,
      });
    }
  }

  create() {
    console.log(`🌍 Creating zone: ${this.scene.key}`);
    console.log(`📊 Scene data:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.loadMap();
    this.setupManagers();
    this.setupInputs();
    this.createUI();

    // ✅ MODIFICATION : Gestion réseau simplifiée
    if (this.scene.key === 'BeachScene') {
      this.initializeNetwork();
    } else {
      this.getExistingNetwork();
    }

    // ✅ MODIFICATION : Nettoyage amélioré
    this.events.on('shutdown', () => {
      console.log(`[${this.scene.key}] Shutdown - nettoyage`);
      this.cleanup();
    });

    // ✅ AJOUT : Événement avant destruction
    this.events.on('destroy', () => {
      console.log(`[${this.scene.key}] Destroy - nettoyage final`);
      this.cleanup();
    });
  }

  loadMap() {
    console.log('--- DEBUT loadMap ---');
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
      const depthOrder = {
        'BelowPlayer': 1,
        'BelowPlayer2': 2,
        'World': 3,
        'AbovePlayer': 4,
      };

      this.map.layers.forEach(layerData => {
        const layer = this.map.createLayer(layerData.name, this.phaserTilesets, 0, 0);
        this.layers[layerData.name] = layer;
        layer.setDepth(depthOrder[layerData.name] ?? 0);
      });

      if (this.sys.animatedTiles) {
        this.sys.animatedTiles.init(this.map);
      }

      this.worldLayer = this.layers['World'];
      if (this.worldLayer) {
        this.worldLayer.setCollisionByProperty({ collides: true });
        const debugGraphics = this.add.graphics();
        this.worldLayer.renderDebug(debugGraphics, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(255, 128, 0, 180),
          faceColor: new Phaser.Display.Color(255, 0, 0, 255),
        });
      }

      this.setupAnimatedObjects();
      this.setupScene();
      this.setupZoneTransitions();
    };

    if (needsLoading) {
      this.load.once('complete', finishLoad);
      this.load.start();
    } else {
      finishLoad();
    }
  }

  setupAnimatedObjects() {
    if (this.map.objects && this.map.objects.length > 0) {
      this.map.objects.forEach(objectLayer => {
        objectLayer.objects.forEach(obj => {
          if (obj.gid) {
            const sprite = this.add.sprite(obj.x, obj.y - obj.height, 'dude');
            if (obj.properties && obj.properties.length > 0) {
              const animationProp = obj.properties.find(prop => prop.name === 'animation');
              if (animationProp && animationProp.value) {
                if (this.anims.exists(animationProp.value)) {
                  sprite.play(animationProp.value);
                }
              }
            }
            if (!this.animatedObjects) {
              this.animatedObjects = this.add.group();
            }
            this.animatedObjects.add(sprite);
          }
        });
      });
    }
  }

  setupScene() {
    console.log('--- DEBUT setupScene ---');
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);

    this.cameraManager = new CameraManager(this);

    let retry = 0;
    const MAX_RETRY = 60;

    if (this.loadTimer) {
      this.loadTimer.remove(false);
      this.loadTimer = null;
    }

    this.loadTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager?.getMyPlayer();
        if (myPlayer) {
          myPlayer.setDepth(3.5);
          this.positionPlayer(myPlayer);

          if (this.worldLayer) {
            const debugGraphics = this.add.graphics();
            this.worldLayer.renderDebug(debugGraphics, {
              tileColor: null,
              collidingTileColor: new Phaser.Display.Color(255, 128, 0, 200),
              faceColor: new Phaser.Display.Color(255, 0, 0, 255)
            });
            this.physics.add.collider(myPlayer, this.worldLayer);
          }

          this.cameraManager.followPlayer(myPlayer);
          this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
          this.cameraFollowing = true;
          this.loadTimer.remove();
          this.loadTimer = null;
          console.log('--- FIN setupScene ---');
        } else {
          retry++;
          if (retry > MAX_RETRY) {
            this.loadTimer.remove();
            this.loadTimer = null;
            alert("Erreur : ton joueur n'est pas synchronisé. Recharge la page !");
          }
        }
      }
    });
  }

  setupZoneTransitions() {
    // à override dans les sous-classes
  }

positionPlayer(player) {
  // ✅ Utiliser la position du serveur au lieu de forcer (100, 100)
  const serverX = player.x || 100; // Fallback si pas de position serveur
  const serverY = player.y || 100;
  
  player.x = serverX;
  player.y = serverY;
  
  console.log(`Position appliquée: (${serverX}, ${serverY})`);
}

  initializeNetwork() {
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
      throw new Error("Aucun wallet détecté");
    }

    let roomName = '';
    switch(this.scene.key) {
      case 'BeachScene': roomName = 'BeachRoom'; break;
      case 'VillageScene': roomName = 'VillageRoom'; break;
      case 'Road1Scene': roomName = 'Road1Room'; break; // ✅ AJOUT
      default: roomName = 'DefaultRoom';
    }

    this.networkManager = new NetworkManager(identifier);
    this.setupNetwork();
    this.connectToServer(roomName);
  }

  getExistingNetwork() {
    // ✅ MODIFICATION : Récupérer le NetworkManager depuis n'importe quelle scène active
    const scenes = ['BeachScene', 'VillageScene'];
    let foundNetworkManager = null;
    
    for (const sceneName of scenes) {
      const scene = this.scene.manager.getScene(sceneName);
      if (scene && scene.networkManager) {
        foundNetworkManager = scene.networkManager;
        break;
      }
    }

    if (foundNetworkManager) {
      this.networkManager = foundNetworkManager;
      this.mySessionId = this.networkManager.getSessionId();
      if (this.playerManager) {
        this.playerManager.setMySessionId(this.mySessionId);
      }
      this.setupNetwork();
      console.log(`[${this.scene.key}] NetworkManager récupéré, sessionId: ${this.mySessionId}`);
    } else {
      console.warn(`[${this.scene.key}] Aucun NetworkManager trouvé, initialisation...`);
      this.initializeNetwork();
    }
  }

  setupManagers() {
    this.playerManager = new PlayerManager(this);
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
  }

  createPlayerAnimations() {
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

  setupNetwork() {
    if (!this.networkManager) return;

    this.networkManager.onConnect(() => {
      this.mySessionId = this.networkManager.getSessionId();
      this.playerManager.setMySessionId(this.mySessionId);
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnected!`);
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
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nDisconnected`);
    });

    // ✅ MODIFICATION : Handler unique de transition - plus simple
    this.zoneChangedHandler = (data) => {
      console.log(`[${this.scene.key}] Zone changée reçue:`, data);
      
      // Vérifier que c'est bien pour changer de scène
      if (data.targetZone && data.targetZone !== this.scene.key) {
        console.log(`[${this.scene.key}] Changement vers ${data.targetZone}`);
        
        // Nettoyage immédiat et changement de scène
        this.cleanup();
        
        this.scene.start(data.targetZone, { 
          fromZone: this.scene.key,
          fromDirection: data.fromDirection || null 
        });
      }
    };

    this.networkManager.onZoneChanged(this.zoneChangedHandler);
  }

  async connectToServer(roomName) {
    const connected = await this.networkManager.connect(roomName);
    if (!connected) {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnection failed!`);
      console.error("Échec de connexion au serveur");
    }
  }

  update() {
    if (this.cameraManager) this.cameraManager.update();

    if (this.sys.animatedTiles && typeof this.sys.animatedTiles.update === 'function') {
      this.sys.animatedTiles.update();
    }

    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }

    if (!this.networkManager?.getSessionId()) return;

    const myPlayerState = this.networkManager.getPlayerState(this.networkManager.getSessionId());
    if (!myPlayerState) return;

    this.handleMovement(myPlayerState);
  }

  handleMovement(myPlayerState) {
    const speed = 120;
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) return;

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

    // ✅ MODIFICATION : Prédiction côté client pour un mouvement fluide
    myPlayer.body.setVelocity(vx, vy);

    if (moved && direction) {
      myPlayer.play(`walk_${direction}`, true);
      this.lastDirection = direction;
      
      // ✅ AJOUT : Marquer que le joueur bouge localement
      myPlayer.isMovingLocally = true;
    } else {
      myPlayer.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
    }

    // ✅ MODIFICATION : Envoyer la position seulement si on bouge ET avec throttling
    if (moved) {
      const now = Date.now();
      if (!this.lastMoveTime || now - this.lastMoveTime > 50) { // Max 20 FPS pour le réseau
        this.networkManager.sendMove(myPlayer.x, myPlayer.y);
        this.lastMoveTime = now;
      }
    }
  }

  transitionToZone(targetScene, fromDirection = null) {
    if (this.isTransitioning) {
      console.log(`[${this.scene.key}] Transition déjà en cours, ignorée`);
      return;
    }

    console.log(`[${this.scene.key}] Début transition vers ${targetScene}`);
    this.isTransitioning = true;

    // ✅ MODIFICATION : Le NetworkManager gère le changement de room automatiquement
    // On fait juste le nettoyage de la scène et on lance la nouvelle scène
    this.cleanup();

    // ✅ MODIFICATION : Délai pour s'assurer que le nettoyage est terminé
    this.time.delayedCall(50, () => {
      console.log(`[${this.scene.key}] Lancement de la nouvelle scène ${targetScene}`);
      this.scene.start(targetScene, { 
        fromZone: this.scene.key,
        fromDirection: fromDirection 
      });
    });
  }

  cleanup() {
    console.log(`[${this.scene.key}] Nettoyage en cours...`);

    // ✅ Nettoyer les handlers réseau
    if (this.networkManager && this.zoneChangedHandler) {
      this.networkManager.offZoneChanged(this.zoneChangedHandler);
      this.zoneChangedHandler = null;
    }

    // ✅ Nettoyer les joueurs
    if (this.playerManager) {
      this.playerManager.clearAllPlayers();
    }

    // ✅ Nettoyer les objets animés
    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    // ✅ Nettoyer les timers
    if (this.loadTimer) {
      this.loadTimer.remove(false);
      this.loadTimer = null;
    }

    // ✅ Nettoyer tous les événements
    this.time.removeAllEvents();

    // ✅ Réinitialiser les flags
    this.cameraFollowing = false;
    this.isTransitioning = false;
  }
}