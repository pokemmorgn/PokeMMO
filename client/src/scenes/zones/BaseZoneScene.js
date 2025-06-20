// client/src/scenes/zones/BaseZoneScene.js - VERSION WORLDROOM

import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";

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
    this.lastMoveTime = 0;
    this.myPlayerReady = false;
    this.isTransitioning = false;
    
    // ✅ NOUVEAU : Délai de grâce après spawn
    this.spawnGraceTime = 0;
    this.spawnGraceDuration = 2000; // 2 secondes
    
    // ✅ NOUVEAU : Zone mapping
    this.zoneName = this.mapSceneToZone(sceneKey);
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
    console.log(`🌍 Creating zone: ${this.scene.key} (${this.zoneName})`);
    console.log(`📊 Scene data:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.setupManagers();
    this.loadMap();
    this.setupInputs();
    this.createUI();

    this.myPlayerReady = false;

    // ✅ MODIFIÉ : Setup des zones de transition pour WorldRoom
    this.setupZoneTransitions();

    // ✅ MODIFIÉ : Gestion réseau WorldRoom
    if (this.scene.key === 'BeachScene') {
      this.initializeNetworkWorldRoom();
    } else {
      this.getExistingNetworkWorldRoom();
    }

    // Hook détection joueur local prêt
    if (this.playerManager) {
      this.playerManager.onMyPlayerReady((myPlayer) => {
        if (!this.myPlayerReady) {
          this.myPlayerReady = true;
          console.log(`[${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
          this.positionPlayer(myPlayer);

          if (typeof this.onPlayerReady === 'function') {
            this.onPlayerReady(myPlayer);
          }
        }
      });
    }

    // Nettoyage
    this.events.on('shutdown', () => {
      console.log(`[${this.scene.key}] Shutdown - nettoyage`);
      this.cleanup();
    });
    this.events.on('destroy', () => {
      console.log(`[${this.scene.key}] Destroy - nettoyage final`);
      this.cleanup();
    });
  }

  // ✅ NOUVEAU : Mapping scene → zone
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

  // ✅ NOUVEAU : Mapping zone → scene
  mapZoneToScene(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene', 
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene'
    };
    
    return mapping[zoneName.toLowerCase()] || zoneName;
  }

  // ✅ MODIFIÉ : Setup des zones de transition pour WorldRoom
  setupZoneTransitions() {
    if (!this.map) {
      console.warn(`[${this.scene.key}] setupZoneTransitions appelé avant loadMap`);
      return;
    }

    const transitionLayer = this.map.getObjectLayer('Transitions') || 
                           this.map.getObjectLayer('Teleports') || 
                           this.map.getObjectLayer('Worlds');

    if (!transitionLayer) {
      console.log(`[${this.scene.key}] Aucun layer de transitions trouvé`);
      return;
    }

    console.log(`[${this.scene.key}] Found ${transitionLayer.objects.length} transition zones`);

    transitionLayer.objects.forEach((zone, index) => {
      const targetZone = this.getProperty(zone, 'targetZone') || this.getProperty(zone, 'targetMap');
      const spawnPoint = this.getProperty(zone, 'targetSpawn') || this.getProperty(zone, 'spawnPoint');
      const targetX = this.getProperty(zone, 'targetX');
      const targetY = this.getProperty(zone, 'targetY');

      if (!targetZone) {
        console.warn(`[${this.scene.key}] Zone ${index} sans targetZone/targetMap`);
        return;
      }

      // ✅ MODIFIÉ : Validation pour WorldRoom
      const targetZoneName = this.mapSceneToZone(this.mapZoneToScene(targetZone));
      if (targetZoneName === this.zoneName) {
        console.warn(`[${this.scene.key}] ⚠️ Zone ${index} pointe vers elle-même (${targetZone} → ${targetZoneName}), ignorée`);
        return;
      }

      // Créer une zone invisible pour la détection
      const teleportZone = this.add.zone(
        zone.x + (zone.width || 32) / 2, 
        zone.y + (zone.height || 32) / 2, 
        zone.width || 32, 
        zone.height || 32
      );

      // Activer la physique pour la collision avec le joueur
      this.physics.world.enableBody(teleportZone, Phaser.Physics.Arcade.STATIC_BODY);
      teleportZone.body.setSize(zone.width || 32, zone.height || 32);

      // ✅ MODIFIÉ : Stocker les données pour WorldRoom
      teleportZone.transitionData = {
        targetZone: targetZoneName, // Zone de destination (beach, village, etc.)
        spawnPoint,
        targetX: targetX ? parseFloat(targetX) : undefined,
        targetY: targetY ? parseFloat(targetY) : undefined,
        fromZone: this.zoneName // Zone actuelle
      };

      console.log(`[${this.scene.key}] ✅ Transition zone ${index} setup:`, teleportZone.transitionData);
    });
  }

  // ✅ MODIFIÉ : Vérifier les collisions pour WorldRoom
  checkTransitionCollisions() {
    if (!this.playerManager || this.isTransitioning) return;

    // Ne pas vérifier les transitions pendant le délai de grâce
    const now = Date.now();
    if (this.spawnGraceTime > 0 && now < this.spawnGraceTime) {
      return;
    }

    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) return;

    // Vérifier si le joueur bouge
    const isMoving = myPlayer.isMovingLocally || myPlayer.isMoving;
    if (!isMoving) {
      return;
    }

    // Vérifier tous les objets avec transitionData
    this.children.list.forEach(child => {
      if (child.transitionData && child.body) {
        const playerBounds = myPlayer.getBounds();
        const zoneBounds = child.getBounds();

        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
          console.log(`🌀 [${this.scene.key}] Collision transition vers ${child.transitionData.targetZone}`);
          
          if (child.transitionData.targetZone === this.zoneName) {
            console.warn(`[${this.scene.key}] ⚠️ Tentative de transition vers soi-même ignorée`);
            return;
          }
          
          this.handleZoneTransition(child.transitionData);
        }
      }
    });
  }

  // ✅ MODIFIÉ : Gérer la transition WorldRoom
  async handleZoneTransition(transitionData) {
    if (this.isTransitioning) {
      console.log(`[${this.scene.key}] Transition déjà en cours`);
      return;
    }

    if (transitionData.targetZone === this.zoneName) {
      console.warn(`[${this.scene.key}] ⚠️ Transition vers soi-même bloquée`);
      return;
    }

    console.log(`🌀 [${this.scene.key}] Début transition vers:`, transitionData.targetZone);
    this.isTransitioning = true;

    try {
      // ✅ MODIFIÉ : Utiliser moveToZone au lieu de requestTransition
      const success = this.networkManager.moveToZone(
        transitionData.targetZone,
        transitionData.targetX,
        transitionData.targetY
      );

      if (!success) {
        console.warn(`❌ [${this.scene.key}] Impossible d'envoyer la transition`);
        this.isTransitioning = false;
      }
      // La réponse sera gérée par le callback onTransitionSuccess/Error

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur transition:`, error);
      this.isTransitioning = false;
    }
  }

  // ✅ NOUVEAU : Gestion réseau WorldRoom pour scène initiale
  async initializeNetworkWorldRoom() {
    const getWalletFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('wallet');
    };

    const fetchLastPosition = async (identifier) => {
      try {
        const res = await fetch(`/api/playerData?username=${encodeURIComponent(identifier)}`);
        if (res.ok) {
          const data = await res.json();
          return {
            lastMap: data.lastMap || 'beach',
            lastX: data.lastX !== undefined ? data.lastX : 52,
            lastY: data.lastY !== undefined ? data.lastY : 48
          };
        }
      } catch (e) {
        console.warn("Erreur récupération dernière position", e);
      }
      return { lastMap: 'beach', lastX: 52, lastY: 48 };
    };

    try {
      let identifier = getWalletFromUrl();
      if (!identifier && window.app?.currentAccount?.address) {
        identifier = window.app.currentAccount.address;
      }
      if (!identifier) {
        alert("Aucun wallet connecté !");
        throw new Error("Aucun wallet détecté");
      }

      const { lastMap, lastX, lastY } = await fetchLastPosition(identifier);
      const spawnZone = this.mapSceneToZone(this.mapZoneToScene(lastMap));

      console.log(`[${this.scene.key}] Connexion WorldRoom - Zone: ${spawnZone}, Position: (${lastX}, ${lastY})`);

      this.networkManager = new NetworkManager(identifier);
      this.setupNetworkWorldRoom();
      await this.connectToWorldRoom(spawnZone, { spawnX: lastX, spawnY: lastY });

    } catch (error) {
      console.error(`[${this.scene.key}] Erreur init network:`, error);
    }
  }

  // ✅ NOUVEAU : Récupérer network existant pour WorldRoom
  getExistingNetworkWorldRoom() {
    const sceneData = this.scene.settings.data;
    
    if (sceneData && sceneData.networkManager) {
      console.log(`[${this.scene.key}] NetworkManager reçu via sceneData`);
      this.networkManager = sceneData.networkManager;
      this.mySessionId = this.networkManager.getSessionId();
      
      if (this.playerManager) {
        this.playerManager.setMySessionId(this.mySessionId);
      }
      
      this.setupNetworkWorldRoom();
      return;
    }

    // Chercher dans les autres scènes
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene', 'LavandiaScene'];
    for (const sceneName of scenesToCheck) {
      const scene = this.scene.manager.getScene(sceneName);
      if (scene && scene.networkManager && scene.networkManager.isConnected) {
        this.networkManager = scene.networkManager;
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
        this.setupNetworkWorldRoom();
        console.log(`[${this.scene.key}] NetworkManager récupéré de ${sceneName}`);
        return;
      }
    }
    
    console.warn(`[${this.scene.key}] Aucun NetworkManager trouvé, initialisation...`);
    this.initializeNetworkWorldRoom();
  }

  // ✅ NOUVEAU : Connexion à WorldRoom
  async connectToWorldRoom(spawnZone = "beach", spawnData = {}) {
    const connected = await this.networkManager.connect(spawnZone, spawnData);
    if (!connected) {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnection failed!`);
      console.error("Échec de connexion au serveur WorldRoom");
    }
  }

  // ✅ MODIFIÉ : Setup network pour WorldRoom
  setupNetworkWorldRoom() {
    if (!this.networkManager) return;

    console.log(`[${this.scene.key}] Setup network WorldRoom...`);

    this.networkManager.onConnect(() => {
      const currentSessionId = this.networkManager.getSessionId();
      if (this.mySessionId !== currentSessionId) {
        console.log(`[${this.scene.key}] SessionId mis à jour: ${this.mySessionId} → ${currentSessionId}`);
        this.mySessionId = currentSessionId;
        
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
      }
      
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!`);

      // Quest system
      if (!window.questSystem) {
        try {
          window.questSystem = new QuestSystem(this, this.networkManager.room);
          console.log("✅ [QuestSystem] Initialisé");
        } catch (e) {
          console.error("❌ Erreur init QuestSystem:", e);
        }
      }
    });

    // ✅ NOUVEAU : Handlers spécifiques WorldRoom
    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] NPCs reçus: ${npcs.length}`);
      if (this.npcManager) {
        this.npcManager.spawnNpcs(npcs);
      }
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ [${this.scene.key}] Transition réussie vers: ${result.currentZone}`);
      this.handleTransitionSuccess(result);
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}] Transition échouée: ${result.reason}`);
      this.handleTransitionError(result);
    });

    this.networkManager.onNpcInteraction((result) => {
      console.log(`💬 [${this.scene.key}] NPC interaction:`, result);
      this.handleNpcInteraction(result);
    });

    // Handlers existants
    this.networkManager.onStateChange((state) => {
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      const currentNetworkSessionId = this.networkManager.getSessionId();
      if (this.playerManager.mySessionId !== currentNetworkSessionId) {
        this.playerManager.setMySessionId(currentNetworkSessionId);
        this.mySessionId = currentNetworkSessionId;
      }

      this.playerManager.updatePlayers(state);

      const myPlayer = this.playerManager.getMyPlayer();
      if (myPlayer && !this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`[${this.scene.key}] Joueur trouvé avec sessionId: ${this.mySessionId}`);
        this.cameraManager.followPlayer(myPlayer);
        this.cameraFollowing = true;
        this.positionPlayer(myPlayer);
      }
    });

    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });

    this.networkManager.onDisconnect(() => {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nDisconnected from WorldRoom`);
    });
  }

  // ✅ NOUVEAU : Handler pour les données de zone
  handleZoneData(data) {
    console.log(`🗺️ [${this.scene.key}] Handling zone data for: ${data.zone}`);
    
    // Vérifier si les données correspondent à notre zone
    if (data.zone !== this.zoneName) {
      console.warn(`[${this.scene.key}] Zone data pour ${data.zone} mais nous sommes dans ${this.zoneName}`);
      return;
    }

    // Appliquer les données de zone (musique, météo, etc.)
    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }

    console.log(`✅ [${this.scene.key}] Zone data appliquée`);
  }

  // ✅ NOUVEAU : Handler pour transition réussie
  handleTransitionSuccess(result) {
    console.log(`✅ [${this.scene.key}] Transition vers: ${result.currentZone}`);
    
    // Déterminer la scène de destination
    const targetScene = this.mapZoneToScene(result.currentZone);
    
    if (targetScene === this.scene.key) {
      // Même scène, juste repositionner le joueur
      const myPlayer = this.playerManager.getMyPlayer();
      if (myPlayer && result.position) {
        myPlayer.x = result.position.x;
        myPlayer.y = result.position.y;
        console.log(`📍 [${this.scene.key}] Position mise à jour: (${result.position.x}, ${result.position.y})`);
      }
      this.isTransitioning = false;
    } else {
      // Changer de scène
      console.log(`🚀 [${this.scene.key}] Changement vers: ${targetScene}`);
      this.performSceneTransition(targetScene, result);
    }
  }

  // ✅ NOUVEAU : Handler pour erreur de transition
  handleTransitionError(result) {
    console.error(`❌ [${this.scene.key}] Erreur transition: ${result.reason}`);
    
    this.isTransitioning = false;
    
    // Afficher un message d'erreur
    this.showNotification(`Transition impossible: ${result.reason}`, 'error');
  }

  // ✅ NOUVEAU : Effectuer le changement de scène
  performSceneTransition(targetScene, result) {
    console.log(`🚀 [${this.scene.key}] Transition scène vers: ${targetScene}`);
    
    // Nettoyage de la scène actuelle
    this.cleanup();

    // Démarrer la nouvelle scène avec les données
    this.scene.start(targetScene, {
      fromZone: this.zoneName,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      networkManager: this.networkManager
    });
  }

  // ✅ MODIFIÉ : Position du joueur avec délai de grâce
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      console.log(`[${this.scene.key}] Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
      player.x = initData.spawnX;
      player.y = initData.spawnY;
    } else {
      const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
      console.log(`[${this.scene.key}] Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
      player.x = defaultPos.x;
      player.y = defaultPos.y;
    }

    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
      player.indicator.setVisible(true);
    }

    // Délai de grâce après spawn
    this.spawnGraceTime = Date.now() + this.spawnGraceDuration;
    console.log(`[${this.scene.key}] 🛡️ Délai de grâce activé pour ${this.spawnGraceDuration}ms`);

    // ✅ MODIFIÉ : Envoyer mouvement pour WorldRoom
    if (this.networkManager && this.networkManager.isConnected) {
      this.networkManager.sendMove(player.x, player.y, 'down', false);
    }

    this.onPlayerPositioned(player, initData);
  }

  // === MÉTHODES EXISTANTES CONSERVÉES ===

  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  loadMap() {
    console.log('— DEBUT loadMap —');
    this.map = this.make.tilemap({ key: this.mapKey });

    console.log("========== [DEBUG] Chargement de la map ==========");
    console.log("Clé de la map (mapKey):", this.mapKey);
    console.log("Tilesets trouvés dans la map:", this.map.tilesets.map(ts => ts.name));
    console.log("Layers dans la map:", this.map.layers.map(l => l.name));
    console.log("==============================================");

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        console.log(`[DEBUG] --> Chargement tileset "${tileset.name}"`);
        this.load.image(tileset.name, `assets/sprites/${tileset.name}.png`);
        needsLoading = true;
      }
    });

    const finishLoad = () => {
      this.phaserTilesets = this.map.tilesets.map(ts => {
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
      }

      this.setupAnimatedObjects();
      this.setupScene();
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

    const baseWidth = this.scale.width;
    const baseHeight = this.scale.height;
    const zoomX = baseWidth / this.map.widthInPixels;
    const zoomY = baseHeight / this.map.heightInPixels;
    const zoom = Math.min(zoomX, zoomY);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);

    this.cameraManager = new CameraManager(this);

    // Setup des transitions après que la map soit chargée
    this.setupZoneTransitions();
  }

  getDefaultSpawnPosition(fromZone) {
    return { x: 100, y: 100 };
  }

  onPlayerPositioned(player, initData) {
    // Hook pour logique spécifique
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

    this.input.keyboard.on("keydown-E", () => {
      const myPlayer = this.playerManager.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;

      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager.sendNpcInteract(npc.id);
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

  // ✅ MODIFIÉ : Update avec vérification des transitions
  update() {
    if (this.time.now % 1000 < 16) {
      this.checkPlayerState();
    }

    if (this.playerManager) this.playerManager.update();
    if (this.cameraManager) this.cameraManager.update();

    // Vérifier les transitions
    this.checkTransitionCollisions();

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

  handleNpcInteraction(result) {
    console.log("🟢 [npcInteractionResult] Reçu :", result);

    if (result.type === "dialogue") {
      let npcName = "???";
      let spriteName = null;
      let portrait = result.portrait;
      if (result.npcId && this.npcManager) {
        const npc = this.npcManager.getNpcData(result.npcId);
        if (npc) {
          npcName = npc.name;
          spriteName = npc.sprite;
          if (!portrait && spriteName) {
            portrait = `/assets/portrait/${spriteName}Portrait.png`;
          }
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
    else if (result.type === "shop") {
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: result.portrait || "assets/ui/shop_icon.png",
          name: "Shop",
          text: "Ouverture du shop: " + result.shopId
        });
      }
    }
    else if (result.type === "heal") {
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: result.portrait || "assets/ui/heal_icon.png",
          name: "???",
          text: result.message || "Vos Pokémon sont soignés !"
        });
      }
    }
    else if (result.type === "questGiver" || result.type === "questComplete" || result.type === "questProgress") {
      if (window.questSystem && typeof window.questSystem.handleNpcInteraction === 'function') {
        window.questSystem.handleNpcInteraction(result);
        return;
      }
    }
    else if (result.type === "error") {
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "Erreur",
          text: result.message
        });
      }
    }
    else {
      console.warn("⚠️ Type inconnu:", result);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "???",
          text: JSON.stringify(result)
        });
      }
    }
  }

  checkPlayerState() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.warn(`[${this.scene.key}] Joueur manquant!`);
      return false;
    }
    
    let fixed = false;
    
    if (!myPlayer.visible) {
      console.warn(`[${this.scene.key}] Joueur invisible, restauration`);
      myPlayer.setVisible(true);
      fixed = true;
    }
    
    if (!myPlayer.active) {
      console.warn(`[${this.scene.key}] Joueur inactif, restauration`);
      myPlayer.setActive(true);
      fixed = true;
    }
    
    if (myPlayer.indicator && !myPlayer.indicator.visible) {
      console.warn(`[${this.scene.key}] Indicateur invisible, restauration`);
      myPlayer.indicator.setVisible(true);
      fixed = true;
    }
    
    if (fixed) {
      console.log(`[${this.scene.key}] État du joueur corrigé`);
    }
    
    return true;
  }

  // ✅ MODIFIÉ : Gestion du mouvement avec désactivation du délai de grâce
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

    myPlayer.body.setVelocity(vx, vy);

    if (moved && direction) {
      myPlayer.play(`walk_${direction}`, true);
      this.lastDirection = direction;
      myPlayer.isMovingLocally = true;
      
      // Désactiver le délai de grâce dès que le joueur bouge
      if (this.spawnGraceTime > 0) {
        this.spawnGraceTime = 0;
        console.log(`[${this.scene.key}] 🏃 Joueur bouge, délai de grâce désactivé`);
      }
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

  // ✅ NOUVEAU : Afficher une notification
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

    // Auto-suppression
    this.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }
  
  cleanup() {
    console.log(`[${this.scene.key}] Nettoyage en cours...`);

    if (this.playerManager) {
      const savedSessionId = this.playerManager.mySessionId;
      this.playerManager.clearAllPlayers();
      this.playerManager.mySessionId = savedSessionId;
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
    this.myPlayerReady = false;
    this.spawnGraceTime = 0;
  }
}
