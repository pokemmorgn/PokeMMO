import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";

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
    this.zoneChangedHandler = null; // Référence du handler
    this.lastMoveTime = 0; // Throttling des mouvements
  }

  preload() {
  const ext = 'tmj';
  this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);

  // Charger le spritesheet du joueur (32x32 par frame)
  this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
}

  create() {
    console.log(`🌍 Creating zone: ${this.scene.key}`);
    console.log(`📊 Scene data:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.loadMap();
    this.setupManagers();
    this.setupInputs();
    this.createUI();

      this.createDevMenu();  // <-- ajoute ce call ici

    // Gestion réseau simplifiée
    if (this.scene.key === 'BeachScene') {
      this.initializeNetwork();
    } else {
      this.getExistingNetwork();
    }

    // Nettoyage amélioré
    this.events.on('shutdown', () => {
      console.log(`[${this.scene.key}] Shutdown - nettoyage`);
      this.cleanup();
    });
    // Événement avant destruction
    this.events.on('destroy', () => {
      console.log(`[${this.scene.key}] Destroy - nettoyage final`);
      this.cleanup();
    });
  }

  getExistingNetwork() {
    // Liste des scènes qui pourraient avoir le NetworkManager
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene'];
    for (const sceneName of scenesToCheck) {
      const scene = this.scene.manager.getScene(sceneName);
      if (scene && scene.networkManager) {
        this.networkManager = scene.networkManager;
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
        this.setupNetwork();
        console.log(`[${this.scene.key}] NetworkManager récupéré de ${sceneName}, sessionId: ${this.mySessionId}`);
        return;
      }
    }
    console.warn(`[${this.scene.key}] Aucun NetworkManager trouvé, initialisation...`);
    this.initializeNetwork();
  }

  loadMap() {
    console.log('— DEBUT loadMap —');
    this.map = this.make.tilemap({ key: this.mapKey });

    // DEBUG LOGS : Tilesets & Layers
    console.log("========== [DEBUG] Chargement de la map ==========");
    console.log("Clé de la map (mapKey):", this.mapKey);
    console.log("Tilesets trouvés dans la map:", this.map.tilesets.map(ts => ts.name));
    console.log("Layers dans la map:", this.map.layers.map(l => l.name));
    console.log("==============================================");

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      console.log(`[DEBUG] Tileset "${tileset.name}"`);
      if (!this.textures.exists(tileset.name)) {
        console.log(`[DEBUG] --> Image du tileset "${tileset.name}" NON trouvée, chargement...`);
        this.load.image(tileset.name, `assets/sprites/${tileset.name}.png`);
        needsLoading = true;
      } else {
        console.log(`[DEBUG] --> Image du tileset "${tileset.name}" DÉJÀ chargée`);
      }
    });

    const finishLoad = () => {
      this.phaserTilesets = this.map.tilesets.map(ts => {
        console.log(`[DEBUG] Appel addTilesetImage pour "${ts.name}"`);
        return this.map.addTilesetImage(ts.name, ts.name);
      });

      this.layers = {};
      const depthOrder = {
        'BelowPlayer': 1,
        'BelowPlayer2': 2,
        'World': 3,
        'AbovePlayer': 4,
        'Grass': 1.5
      };

      this.map.layers.forEach(layerData => {
        console.log(`[DEBUG] Layer créé: ${layerData.name}`);
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
  console.log('— DEBUT setupScene —');
  this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

  // Zoom automatique selon taille map et taille canvas Phaser
  const baseWidth = this.scale.width;   // largeur canvas Phaser (ex: 800)
  const baseHeight = this.scale.height; // hauteur canvas Phaser (ex: 600)

  const zoomX = baseWidth / this.map.widthInPixels;
  const zoomY = baseHeight / this.map.heightInPixels;
  const zoom = Math.min(zoomX, zoomY);

  this.cameras.main.setZoom(zoom);

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
  const worldsLayer = this.map.getObjectLayer('Worlds');
  if (!worldsLayer) return;

  // Configuration des transitions par scène
  const transitionConfig = this.getTransitionConfig();
  
  worldsLayer.objects.forEach(obj => {
    const transition = transitionConfig[obj.name];
    if (transition) {
      this.createTransitionZone(obj, transition.targetScene, transition.direction);
    }
  });
}

// Méthode à override dans chaque scène
getTransitionConfig() {
  return {}; // À définir dans les sous-classes
}

positionPlayer(player) {
  const initData = this.scene.settings.data;
  
  // Position par défaut ou depuis spawn data
  if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
    player.x = initData.spawnX;
    player.y = initData.spawnY;
  } else {
    // Utiliser les positions par défaut de la scène
    const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
    player.x = defaultPos.x;
    player.y = defaultPos.y;
  }

  // Logique commune pour l'indicateur
  if (player.indicator) {
    player.indicator.x = player.x;
    player.indicator.y = player.y - 32;
  }

  if (this.networkManager) {
    this.networkManager.sendMove(player.x, player.y);
  }

  // Hook pour logique spécifique (intro, etc.)
  this.onPlayerPositioned(player, initData);
}

// À override dans les sous-classes
getDefaultSpawnPosition(fromZone) {
  return { x: 100, y: 100 }; // Valeurs par défaut
}

onPlayerPositioned(player, initData) {
  // Hook pour logique spécifique (intro dans BeachScene)
}

  async initializeNetwork() {
    const getWalletFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('wallet');
    };

    const fetchLastPosition = async (identifier) => {
      try {
        const res = await fetch(`/api/playerData?username=${encodeURIComponent(identifier)}`);
        if (res.ok) {
          const data = await res.json();
          console.log("DEBUG API response data:", data);
          return {
            lastMap: data.lastMap || 'Beach',
            lastX: data.lastX !== undefined ? data.lastX : 52,
            lastY: data.lastY !== undefined ? data.lastY : 48
          };
        }
      } catch (e) {
        console.warn("Erreur récupération dernière position, fallback à BeachRoom", e);
      }
      return { lastMap: 'Beach', lastX: 52, lastY: 48 };
    };

    (async () => {
      let identifier = getWalletFromUrl();
      if (!identifier && window.app?.currentAccount?.address) {
        identifier = window.app.currentAccount.address;
      }
      if (!identifier) {
        alert("Aucun wallet connecté !");
        throw new Error("Aucun wallet détecté");
      }

      const { lastMap, lastX, lastY } = await fetchLastPosition(identifier);
      const mapName = lastMap.toLowerCase();
      console.log(`DEBUG lastMap: ${lastMap}, mapName: ${mapName}`);

      let roomName = '';
      switch(mapName) {
        case 'beach':
          roomName = 'BeachRoom';
          break;
        case 'village':
          roomName = 'VillageRoom';
          break;
        case 'villagelab':
          roomName = 'VillageLabRoom';
          break;
        case 'road1':
          roomName = 'Road1Room';
          break;
          case 'house1':
          roomName = 'VillageHouse1Room';
          break;
        default:
          roomName = 'BeachRoom';
          console.warn(`lastMap inconnu: ${lastMap}, connexion à BeachRoom par défaut`);
      }
      console.log("DEBUG roomName choisi:", roomName);

      this.networkManager = new NetworkManager(identifier);
      this.setupNetwork();
      this.connectToServer(roomName, { spawnX: lastX, spawnY: lastY, fromZone: 'reload' });
    })();
  }

  async connectToServer(roomName, options = {}) {
    const connected = await this.networkManager.connect(roomName, options);
    if (!connected) {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnection failed!`);
      console.error("Échec de connexion au serveur");
    }
  }

  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
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

    // Appuie sur "E" pour interagir avec le NPC le plus proche
  this.input.keyboard.on("keydown-E", () => {
  const myPlayer = this.playerManager.getMyPlayer();
  if (!myPlayer || !this.npcManager) return;

  // Cherche le NPC le plus proche dans un rayon de 64px (tu peux ajuster)
  const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
  if (npc) {
    // Envoie la demande d’interaction au serveur
    this.networkManager.sendNpcInteract(npc.id);
    // Optionnel : feedback local (bip, highlight, etc.)
    // this.npcManager.highlightNpc(npc.id); 
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

  setupNetwork() {
  if (!this.networkManager) return;

  this.networkManager.onConnect(() => {
    this.mySessionId = this.networkManager.getSessionId();
    this.playerManager.setMySessionId(this.mySessionId);
    this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnected!`);

    // <-- AJOUTE ICI !
    this.networkManager.onMessage("snap", (data) => {
      this.playerManager.snapMyPlayerTo(data.x, data.y);
    });
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

    // Quand le serveur répond à l’interaction NPC
this.networkManager.onMessage("npcInteractionResult", (result) => {
  if (result.type === "dialogue") {
    showNpcDialogue({
      portrait: result.portrait || `assets/npc/${result.npcName?.toLowerCase() || 'unknown'}.png`, // adapte ce chemin !
      name: result.npcName || "???",
      text: result.lines ? result.lines[0] : result.message
    });
  } else if (result.type === "shop") {
    // TODO: affiche une fenêtre shop
    showNpcDialogue({
      portrait: result.portrait || "assets/ui/shop_icon.png",
      name: "Shop",
      text: "Ouverture du shop: " + result.shopId
    });
  } else if (result.type === "heal") {
    showNpcDialogue({
      portrait: result.portrait || "assets/ui/heal_icon.png",
      name: "???",
      text: result.message || "Vos Pokémon sont soignés !"
    });
  } else if (result.type === "error") {
    showNpcDialogue({
      portrait: null,
      name: "Erreur",
      text: result.message
    });
  } else {
    showNpcDialogue({
      portrait: null,
      name: "???",
      text: JSON.stringify(result)
    });
  }
});


    
    this.networkManager.onDisconnect(() => {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nDisconnected`);
    });

    this.zoneChangedHandler = (data) => {
      console.log(`[${this.scene.key}] Zone changée reçue:`, data);

      if (data.targetZone && data.targetZone !== this.scene.key) {
        console.log(`[${this.scene.key}] Changement vers ${data.targetZone}`);

        this.cleanup();

        this.scene.start(data.targetZone, {
          fromZone: this.scene.key,
          fromDirection: data.fromDirection || null,
          spawnX: data.spawnX,
          spawnY: data.spawnY
        });
      }
    };

    this.networkManager.onZoneChanged(this.zoneChangedHandler);

      this.networkManager.onMessage("npcList", (npcList) => {
    if (this.npcManager) {
      this.npcManager.spawnNpcs(npcList);
    }
  });
  }

  update() {
   if (this.playerManager) this.playerManager.update();  // <--- AJOUTE ÇA ICI

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
    const speed = this.playerSpeed;
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
this.networkManager.sendMove(myPlayer.x, myPlayer.y, direction || this.lastDirection, moved);
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

    this.cleanup();

    this.time.delayedCall(50, () => {
      console.log(`[${this.scene.key}] Lancement de la nouvelle scène ${targetScene}`);
      this.scene.start(targetScene, {
        fromZone: this.scene.key,
        fromDirection: fromDirection
      });
    });
  }

createDevMenu() {
  if (this.devMenuCreated) return;
  this.devMenuCreated = true;

  // Valeur initiale vitesse si non déjà présente
  if (this.playerSpeed === undefined) this.playerSpeed = 120;

  // Touche F1 pour toggle le menu
  this.input.keyboard.on('keydown-F1', () => {
    this.devMenu.setVisible(!this.devMenu.visible);
  });

  // Création du conteneur menu dev
  this.devMenu = this.add.container(8, 8).setDepth(9999).setVisible(false);

  // Fond compact
  const bg = this.add.rectangle(0, 0, 170, 70, 0x222244, 0.96)
    .setOrigin(0)
    .setScrollFactor(0);
  this.devMenu.add(bg);

  // Texte vitesse
  this.devSpeedText = this.add.text(8, 6, `SPD: ${this.playerSpeed}`, {
    fontSize: "13px", fill: "#fff"
  }).setScrollFactor(0);
  this.devMenu.add(this.devSpeedText);

  // Bouton + rapide
  const btnUp = this.add.text(8, 28, "[+]", { fontSize: "15px", fill: "#5f5" })
    .setInteractive()
    .on("pointerdown", () => {
      this.playerSpeed += 50;
      this.devSpeedText.setText(`SPD: ${this.playerSpeed}`);
    }).setScrollFactor(0);
  this.devMenu.add(btnUp);

  // Bouton - lent
  const btnDown = this.add.text(44, 28, "[-]", { fontSize: "15px", fill: "#f55" })
    .setInteractive()
    .on("pointerdown", () => {
      this.playerSpeed = Math.max(10, this.playerSpeed - 50);
      this.devSpeedText.setText(`SPD: ${this.playerSpeed}`);
    }).setScrollFactor(0);
  this.devMenu.add(btnDown);

  // Bouton TP droite
  const btnTP = this.add.text(84, 28, "[→ +100]", { fontSize: "13px", fill: "#9cf" })
    .setInteractive()
    .on("pointerdown", () => {
      const myPlayer = this.playerManager.getMyPlayer();
      if (myPlayer) {
        myPlayer.x += 100;
        this.networkManager.sendMove(myPlayer.x, myPlayer.y, "right", true);
      }
    }).setScrollFactor(0);
  this.devMenu.add(btnTP);

  // Info aide
  const txt = this.add.text(8, 54, "F1: Ouvrir menu", {
    fontSize: "11px", fill: "#ccc"
  }).setScrollFactor(0);
  this.devMenu.add(txt);

  // Met à jour la vitesse affichée
  this.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => {
      if (this.devMenu.visible) {
        this.devSpeedText.setText(`SPD: ${this.playerSpeed}`);
      }
    }
  });
}
  
  cleanup() {
    console.log(`[${this.scene.key}] Nettoyage en cours...`);

    if (this.networkManager && this.zoneChangedHandler) {
      this.networkManager.offZoneChanged(this.zoneChangedHandler);
      this.zoneChangedHandler = null;
    }

    if (this.playerManager) {
      this.playerManager.clearAllPlayers();
    }

    if (this.npcManager) {
    this.npcManager.clearAllNpcs();
    }

    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    if (this.loadTimer) {
      this.loadTimer.remove(false);
      this.loadTimer = null;
    }

    this.time.removeAllEvents();

    this.cameraFollowing = false;
    this.isTransitioning = false;
  }
}
