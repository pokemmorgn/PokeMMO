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

  // ✅ CORRECTION: Nouvel ordre de chargement
  create() {
    console.log(`🌍 Creating zone: ${this.scene.key}`);
    console.log(`📊 Scene data:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.setupManagers();
    
    // ✅ CORRECTION: Charger d'abord la map, PUIS initialiser le réseau
    this.loadMapFirst().then(() => {
        // Map chargée, maintenant on peut initialiser le réseau
        this.initializeNetworkFirst().then(() => {
            // Réseau prêt, maintenant setup final
            this.setupInputs();
            this.createUI();
        });
    });

    // Nettoyage amélioré
    this.events.on('shutdown', () => {
        console.log(`[${this.scene.key}] Shutdown - nettoyage`);
        this.cleanup();
    });
    this.events.on('destroy', () => {
        console.log(`[${this.scene.key}] Destroy - nettoyage final`);
        this.cleanup();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Charger la map en premier
  async loadMapFirst() {
    return new Promise((resolve) => {
        console.log(`[${this.scene.key}] 🗺️ Chargement map en priorité...`);
        
        // Charger la map de façon synchrone
        this.loadMap();
        
        // Attendre que la map soit complètement chargée
        const checkMapLoaded = () => {
            if (this.map && this.layers && Object.keys(this.layers).length > 0) {
                console.log(`[${this.scene.key}] ✅ Map chargée avec ${Object.keys(this.layers).length} layers`);
                resolve();
            } else {
                setTimeout(checkMapLoaded, 50);
            }
        };
        
        checkMapLoaded();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Initialiser le réseau en premier
  async initializeNetworkFirst() {
    console.log(`[${this.scene.key}] 🔌 Initialisation réseau prioritaire...`);
    
    // Attendre que le NetworkManager soit prêt
    await this.ensureNetworkManagerReady();
    
    // Une fois le NetworkManager prêt, configurer les listeners
    if (this.networkManager) {
        this.setupNetwork();
        console.log(`[${this.scene.key}] ✅ NetworkManager prêt, sessionId: ${this.mySessionId}`);
    } else {
        console.error(`[${this.scene.key}] ❌ Impossible d'obtenir un NetworkManager`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: S'assurer que le NetworkManager est prêt
  async ensureNetworkManagerReady() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 secondes max
        
        const checkNetwork = () => {
            attempts++;
            console.log(`[${this.scene.key}] 🔍 Tentative ${attempts}/${maxAttempts} - Recherche NetworkManager...`);
            
            // Essayer de récupérer le NetworkManager
            this.getExistingNetworkSync();
            
            if (this.networkManager && this.networkManager.isConnected && this.mySessionId) {
                console.log(`[${this.scene.key}] ✅ NetworkManager trouvé et connecté`);
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error(`[${this.scene.key}] ❌ Timeout: NetworkManager non trouvé après ${maxAttempts} tentatives`);
                // Forcer un retour à BeachScene si pas sur BeachScene
                if (this.scene.key !== 'BeachScene') {
                    this.scene.start('BeachScene');
                }
                resolve();
                return;
            }
            
            // Réessayer dans 100ms
            setTimeout(checkNetwork, 100);
        };
        
        checkNetwork();
    });
  }

  // ✅ VERSION SYNCHRONE de getExistingNetwork pour le checking
  getExistingNetworkSync() {
    // ✅ PRIORITÉ 1: Vérifier les données de scène
    const sceneData = this.scene.settings.data;
    if (sceneData && sceneData.networkManager && sceneData.networkManager.isConnected) {
        console.log(`[${this.scene.key}] ✅ NetworkManager depuis sceneData`);
        this.networkManager = sceneData.networkManager;
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
            this.playerManager.setMySessionId(this.mySessionId);
        }
        return true;
    }

    // ✅ PRIORITÉ 2: Variable globale
    if (window.globalNetworkManager && window.globalNetworkManager.isConnected) {
        console.log(`[${this.scene.key}] ✅ NetworkManager depuis window.globalNetworkManager`);
        this.networkManager = window.globalNetworkManager;
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
            this.playerManager.setMySessionId(this.mySessionId);
        }
        return true;
    }

    // ✅ PRIORITÉ 3: Autres scènes
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene', 'LavandiaScene'];
    for (const sceneName of scenesToCheck) {
        const scene = this.scene.manager.getScene(sceneName);
        if (scene && scene.networkManager && scene.networkManager.isConnected) {
            console.log(`[${this.scene.key}] ✅ NetworkManager depuis ${sceneName}`);
            this.networkManager = scene.networkManager;
            this.mySessionId = this.networkManager.getSessionId();
            if (this.playerManager) {
                this.playerManager.setMySessionId(this.mySessionId);
            }
            window.globalNetworkManager = this.networkManager;
            return true;
        }
    }

    // ✅ PRIORITÉ 4: Si c'est BeachScene, initialiser
    if (this.scene.key === 'BeachScene') {
        console.log(`[${this.scene.key}] 🔌 Initialisation NetworkManager pour BeachScene...`);
        this.initializeNetwork();
        return false; // Pas encore prêt, mais en cours d'initialisation
    }

    return false;
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

      // === Debug: Affichage des zones de téléport ===
      const teleportZones =
        this.map.objects
          ?.find(layer => layer.name === "Worlds")
          ?.objects
          ?.filter(obj => obj.name === "teleport") || [];

      teleportZones.forEach(obj => {
        const rect = this.add.rectangle(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height,
          0xff0000, 0.25 // Rouge, transparence 25%
        ).setDepth(999);
        rect.setStrokeStyle(2, 0xffffff); // Contour blanc pour bien voir
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

  // ✅ CORRECTION: setupScene avec vérification NetworkManager
  setupScene() {
    console.log('— DEBUT setupScene —');
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Zoom automatique selon taille map et taille canvas Phaser
    const baseWidth = this.scale.width;
    const baseHeight = this.scale.height;
    const zoomX = baseWidth / this.map.widthInPixels;
    const zoomY = baseHeight / this.map.heightInPixels;
    const zoom = Math.min(zoomX, zoomY);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);

    this.cameraManager = new CameraManager(this);
    
    // ✅ CORRECTION: S'assurer que le NetworkManager est configuré AVANT d'attendre le joueur
    if (!this.networkManager || !this.networkManager.isConnected) {
        console.warn(`[${this.scene.key}] ⚠️ setupScene appelé sans NetworkManager prêt, attente...`);
        
        // Attendre que le NetworkManager soit prêt
        let attempts = 0;
        const waitForNetwork = () => {
            attempts++;
            if (this.networkManager && this.networkManager.isConnected) {
                console.log(`[${this.scene.key}] ✅ NetworkManager prêt après ${attempts} tentatives`);
                this.waitForPlayerAndNetwork();
            } else if (attempts < 20) {
                setTimeout(waitForNetwork, 100);
            } else {
                console.error(`[${this.scene.key}] ❌ Timeout: NetworkManager toujours pas prêt`);
            }
        };
        waitForNetwork();
    } else {
        // NetworkManager déjà prêt
        this.waitForPlayerAndNetwork();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Attendre joueur + réseau
  waitForPlayerAndNetwork() {
    let retry = 0;
    const MAX_RETRY = 100; // 10 secondes max

    if (this.loadTimer) {
        this.loadTimer.remove(false);
        this.loadTimer = null;
    }

    this.loadTimer = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
            retry++;
            
            // ✅ VÉRIFIER: NetworkManager connecté ET joueur existant
            const networkReady = this.networkManager && this.networkManager.isConnected && this.mySessionId;
            const myPlayer = this.playerManager?.getMyPlayer();
            
            console.log(`[${this.scene.key}] 🔄 Tentative ${retry}/${MAX_RETRY}:`);
            console.log(`  - NetworkManager prêt: ${!!networkReady}`);
            console.log(`  - Joueur existant: ${!!myPlayer}`);
            
            if (networkReady && myPlayer) {
                console.log(`[${this.scene.key}] ✅ Joueur ET réseau prêts !`);
                
                myPlayer.setDepth(3.5);

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

                // ✅ IMPORTANT: Positionner le joueur SEULEMENT maintenant
                this.positionPlayer(myPlayer);

                this.loadTimer.remove();
                this.loadTimer = null;
                console.log('✅ Setup scene terminé avec succès');
                return;
            }
            
            // Si seulement le réseau manque, essayer de le récupérer
            if (!networkReady) {
                this.getExistingNetworkSync();
            }
            
            if (retry > MAX_RETRY) {
                console.error(`[${this.scene.key}] ❌ Timeout: Impossible de synchroniser joueur et réseau`);
                this.loadTimer.remove();
                this.loadTimer = null;
                
                // Diagnostic détaillé
                console.log("🔧 DIAGNOSTIC DE L'ERREUR:");
                console.log("- NetworkManager:", this.networkManager);
                console.log("- NetworkManager connecté:", this.networkManager?.isConnected);
                console.log("- SessionId:", this.mySessionId);
                console.log("- Joueur:", myPlayer);
                console.log("- Scène active:", this.scene.isActive());
                
                // Fallback: retour à BeachScene
                if (this.scene.key !== 'BeachScene') {
                    alert("Erreur de synchronisation. Retour à la plage...");
                    this.scene.start('BeachScene');
                } else {
                    alert("Erreur critique. Veuillez recharger la page.");
                }
            }
        }
    });
  }

  // ✅ AMÉLIORATION: Meilleure gestion des positions
  positionPlayer(player) {
    if (!player) {
        console.error(`[${this.scene.key}] ❌ positionPlayer appelé avec un joueur null`);
        return;
    }

    if (!this.networkManager || !this.networkManager.isConnected) {
        console.warn(`[${this.scene.key}] ⚠️ positionPlayer appelé sans NetworkManager connecté`);
        return;
    }

    console.log(`[${this.scene.key}] 🎯 Positionnement du joueur...`);
    
    const initData = this.scene.settings.data;
    
    // Position par défaut ou depuis spawn data
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
        console.log(`[${this.scene.key}] 📍 Position depuis serveur: ${initData.spawnX}, ${initData.spawnY}`);
        player.x = initData.spawnX;
        player.y = initData.spawnY;
    } else {
        // Utiliser les positions par défaut de la scène
        const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
        console.log(`[${this.scene.key}] 📍 Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
        player.x = defaultPos.x;
        player.y = defaultPos.y;
    }

    // Vérifier que le joueur est visible et actif
    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);

    // Logique commune pour l'indicateur
    if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 32;
        player.indicator.setVisible(true);
    }

    // ✅ IMPORTANT: Envoyer position AU SERVEUR seulement maintenant
    console.log(`[${this.scene.key}] 📤 Envoi position au serveur: (${player.x}, ${player.y})`);
    this.networkManager.sendMove(player.x, player.y);

    // Hook pour logique spécifique
    this.onPlayerPositioned(player, initData);
    
    console.log(`[${this.scene.key}] ✅ Joueur positionné avec succès`);
  }

  // À override dans les sous-classes
  getDefaultSpawnPosition(fromZone) {
    return { x: 100, y: 100 }; // Valeurs par défaut
  }

  onPlayerPositioned(player, initData) {
    // Hook pour logique spécifique (intro dans BeachScene)
  }

  async initializeNetwork() {
    console.log(`[${this.scene.key}] 🔌 Initialisation NetworkManager...`);
    
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

    try {
        let identifier = getWalletFromUrl();
        if (!identifier && window.app?.currentAccount?.address) {
            identifier = window.app.currentAccount.address;
        }
        if (!identifier) {
            // ✅ CORRECTION: Gestion mode guest
            identifier = "guest_" + Math.random().toString(36).substr(2, 9);
            console.log(`[${this.scene.key}] Mode guest, identifiant généré: ${identifier}`);
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
            case 'villagehouse1':
                roomName = 'VillageHouse1Room';
                break;
            case 'lavandia':
                roomName = 'LavandiaRoom';
                break;
            default:
                roomName = 'BeachRoom';
                console.warn(`lastMap inconnu: ${lastMap}, connexion à BeachRoom par défaut`);
        }
        console.log("DEBUG roomName choisi:", roomName);

        this.networkManager = new NetworkManager(identifier);
        
        // ✅ NOUVEAU: Sauvegarder immédiatement dans la variable globale
        window.globalNetworkManager = this.networkManager;
        
        this.setupNetwork();
        await this.connectToServer(roomName, { spawnX: lastX, spawnY: lastY, fromZone: 'reload' });
        
        console.log(`[${this.scene.key}] ✅ NetworkManager initialisé et sauvegardé globalement`);
        
    } catch (error) {
        console.error(`[${this.scene.key}] ❌ Erreur initialisation NetworkManager:`, error);
        this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnection failed!`);
    }
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

      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        // 🔥 Mémorise le dernier NPC ciblé pour le dialogue
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

  // ✅ AMÉLIORATION: setupNetwork avec meilleure gestion des états
  setupNetwork() {
    if (!this.networkManager) {
        console.error(`[${this.scene.key}] ❌ setupNetwork appelé sans NetworkManager`);
        return;
    }

    console.log(`[${this.scene.key}] 🔗 Configuration des listeners réseau...`);

    this.networkManager.onConnect(() => {
        console.log(`[${this.scene.key}] 🟢 Connexion confirmée`);
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
            this.playerManager.setMySessionId(this.mySessionId);
        }
        this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nConnected!`);

        // Système de quêtes
        if (!window.questSystem) {
            try {
                const gameRoom = this.networkManager.room || this.networkManager.gameRoom;
                window.questSystem = new QuestSystem(this, gameRoom);
                console.log("✅ [QuestSystem] Initialisé");
            } catch (e) {
                console.error("❌ Erreur init QuestSystem:", e);
            }
        }
        
        // Snap pour correction de position
        this.networkManager.onMessage("snap", (data) => {
            if (this.playerManager) {
                this.playerManager.snapMyPlayerTo(data.x, data.y);
            }
        });   
    });

    // ✅ CORRECTION MAJEURE: onStateChange intelligent qui vérifie la scène active
    this.networkManager.onStateChange((state) => {
        // ✅ NOUVEAU: Seulement traiter si cette scène est ACTIVE
        if (!this.scene.isActive()) {
            console.log(`[${this.scene.key}] 🚫 Ignoré - scène inactive`);
            return;
        }

        if (!state || !state.players) {
            console.warn(`[${this.scene.key}] ⚠️ État réseau invalide reçu`);
            return;
        }
        
        console.log(`[${this.scene.key}] 📡 Mise à jour état réseau - ${state.players.size} joueurs`);
        
        if (this.playerManager && this.mySessionId) {
            this.playerManager.updatePlayers(state);

            const myPlayer = this.playerManager.getMyPlayer();
            if (myPlayer) {
                console.log(`[${this.scene.key}] ✅ Mon joueur synchronisé à (${myPlayer.x}, ${myPlayer.y})`);
                
                // ✅ NOUVEAU: Ne configurer la caméra qu'une seule fois
                if (!this.cameraFollowing) {
                    console.log(`[${this.scene.key}] 📹 Configuration initiale de la caméra`);
                    this.cameraManager.followPlayer(myPlayer);
                    this.cameraFollowing = true;
                }
            } else {
                console.warn(`[${this.scene.key}] ⚠️ Mon joueur non trouvé dans l'état réseau (SessionId: ${this.mySessionId})`);
                
                // ✅ NOUVEAU: Debug pour comprendre pourquoi le joueur est manquant
                console.log(`[${this.scene.key}] 🔍 Debug - SessionIds disponibles:`, Array.from(state.players.keys()));
            }
        } else {
            console.warn(`[${this.scene.key}] ⚠️ PlayerManager ou SessionId manquant`);
        }
    });

    // Centraliser les listeners de messages
    this.setupMessageListeners();
  }

  // ✅ NOUVELLE MÉTHODE: Centraliser les listeners de messages
  setupMessageListeners() {
    // Messages NPC
    this.networkManager.onMessage("npcInteractionResult", (result) => {
      this.handleNpcInteraction(result);
    });

    // Téléportations automatiques
    this.networkManager.onMessage("teleport_success", (data) => {
      console.log(`🌀 [${this.scene.key}] Téléportation reçue:`, data);
      this.handleAutoTeleport(data);
    });

    // ✅ OPTIONNEL : Écouter les échecs de téléportation
    this.networkManager.onMessage("teleport_failed", (data) => {
      console.warn(`❌ [${this.scene.key}] Téléportation échouée:`, data.reason);
    });

    // ✅ GARDER l'ancien système pour compatibilité avec changeZone manuel
    this.zoneChangedHandler = (data) => {
      console.log(`[${this.scene.key}] Zone changée reçue (ancien système):`, data);

      // Mapping entre targetZone et la clé réelle de la scène Phaser
      const ZONE_TO_SCENE = {
        beach: "BeachScene",
        beachscene: "BeachScene",
        greenrootbeach: "BeachScene",
        village: "VillageScene",
        villagescene: "VillageScene",
        villagelab: "VillageLabScene",
        villagelabscene: "VillageLabScene",
        road1: "Road1Scene",
        road1scene: "Road1Scene",
        villagehouse1: "VillageHouse1Scene",
        villagehouse1scene: "VillageHouse1Scene",
        lavandia: "LavandiaScene",
        lavandiascene: "LavandiaScene"
      };

      const targetZoneKey = (data.targetZone || "").toLowerCase();
      const nextSceneKey = ZONE_TO_SCENE[targetZoneKey] || "BeachScene";

      if (nextSceneKey && nextSceneKey !== this.scene.key) {
        console.log(`[${this.scene.key}] Changement vers ${nextSceneKey}`);

        // ✅ CORRECTION: Ne pas cleanup, juste sauvegarder le NetworkManager
        if (this.networkManager) {
          window.globalNetworkManager = this.networkManager;
        }

        this.scene.start(nextSceneKey, {
          fromZone: this.scene.key,
          fromDirection: data.fromDirection || null,
          spawnX: data.spawnX,
          spawnY: data.spawnY,
          networkManager: this.networkManager // ✅ Toujours passer
        });
      }
    };

    this.networkManager.onZoneChanged(this.zoneChangedHandler);

    // Liste des NPCs
    this.networkManager.onMessage("npcList", (npcList) => {
      if (this.npcManager) {
        this.npcManager.spawnNpcs(npcList);
      }
    });

    // Déconnexion
    this.networkManager.onDisconnect(() => {
      this.infoText.setText(`PokeWorld MMO\n${this.scene.key}\nDisconnected`);
    });
  }

  // ✅ NOUVEAU: Gérer les téléportations automatiques
  handleAutoTeleport(data) {
    // Mapping entre targetMap et la clé réelle de la scène Phaser
    const MAP_TO_SCENE = {
      beach: "BeachScene",
      village: "VillageScene", 
      villagelab: "VillageLabScene",
      road1: "Road1Scene",
      villagehouse1: "VillageHouse1Scene",
      lavandia: "LavandiaScene"
    };

    const targetMapKey = (data.targetMap || "").toLowerCase();
    const nextSceneKey = MAP_TO_SCENE[targetMapKey] || "BeachScene";

    if (nextSceneKey && nextSceneKey !== this.scene.key) {
      console.log(`🌀 [${this.scene.key}] Transition automatique vers ${nextSceneKey}`);
      
      // ✅ NOUVEAU: Assurer que le NetworkManager est sauvegardé globalement
      if (this.networkManager) {
        window.globalNetworkManager = this.networkManager;
      }
      
      // Démarrer la nouvelle scène avec les nouvelles coordonnées
      this.scene.start(nextSceneKey, {
        fromZone: this.scene.key,
        spawnX: data.targetX,
        spawnY: data.targetY,
        spawnPoint: data.spawnPoint,
        networkManager: this.networkManager // ✅ NOUVEAU: Passer le NetworkManager
      });
    }
  }

  // ✅ NOUVEAU: Gérer les interactions NPC
  handleNpcInteraction(result) {
    console.log("🟢 [npcInteractionResult] Reçu :", result);

    if (result.type === "dialogue") {
      console.log("➡️ Type = dialogue");
      let npcName = "???";
      let spriteName = null;
      let portrait = result.portrait; // peut-être null/undefined
      if (result.npcId && this.npcManager) {
        console.log("🔍 Recherche NPC dans npcManager:", result.npcId, this.npcManager);
        const npc = this.npcManager.getNpcData(result.npcId);
        if (npc) {
          npcName = npc.name;
          spriteName = npc.sprite;
          console.log("✅ NPC trouvé :", npc);
          if (!portrait && spriteName) {
            portrait = `/assets/portrait/${spriteName}Portrait.png`;
            console.log("🖼️ Portrait reconstruit :", portrait);
          }
        } else {
          console.warn("❌ NPC introuvable pour id", result.npcId);
        }
      }
      console.log("💬 Affiche dialogue :", { portrait, npcName, lines: result.lines || [result.message] });
      
      // Vérifier que showNpcDialogue existe
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: portrait || "/assets/portrait/unknownPortrait.png",
          name: npcName,
          lines: result.lines || [result.message]
        });
      } else {
        console.warn("showNpcDialogue function not found");
      }
    }
    else if (result.type === "shop") {
      console.log("➡️ Type = shop", result);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: result.portrait || "assets/ui/shop_icon.png",
          name: "Shop",
          text: "Ouverture du shop: " + result.shopId
        });
      }
    }
    else if (result.type === "heal") {
      console.log("➡️ Type = heal", result);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: result.portrait || "assets/ui/heal_icon.png",
          name: "???",
          text: result.message || "Vos Pokémon sont soignés !"
        });
      }
    }
    else if (result.type === "questGiver" || result.type === "questComplete" || result.type === "questProgress") {
      console.log(`➡️ Type = ${result.type} (Appel QuestSystem)`, result, "window.questSystem =", window.questSystem);
      if (window.questSystem && typeof window.questSystem.handleNpcInteraction === 'function') {
        window.questSystem.handleNpcInteraction(result);
        return; // On s'arrête ici, rien d'autre à faire
      } else {
        console.warn("❌ QuestSystem non initialisé ou handleNpcInteraction manquant");
      }
    }
    else if (result.type === "error") {
      console.log("➡️ Type = error", result);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "Erreur",
          text: result.message
        });
      }
    }
    else {
      console.warn("⚠️ Type inconnu, dump complet :", result);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "???",
          text: JSON.stringify(result)
        });
      }
    }
  }

  update() {
    // ✅ NOUVEAU: Vérification périodique de l'état du joueur
    if (this.time.now % 1000 < 16) { // Chaque seconde environ
      this.checkPlayerState();
    }

    if (this.playerManager) this.playerManager.update();
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

  // ✅ NOUVEAU: Méthode pour vérifier l'état du joueur
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

    // ✅ NOUVEAU: Assurer que le NetworkManager est sauvegardé globalement
    if (this.networkManager) {
      window.globalNetworkManager = this.networkManager;
    }

    this.time.delayedCall(50, () => {
      console.log(`[${this.scene.key}] Lancement de la nouvelle scène ${targetScene}`);
      this.scene.start(targetScene, {
        fromZone: this.scene.key,
        fromDirection: fromDirection,
        networkManager: this.networkManager // ✅ NOUVEAU: Passer le NetworkManager
      });
    });
  }
  
  // ✅ AMÉLIORATION: Cleanup plus robuste
  cleanup() {
    console.log(`[${this.scene.key}] Nettoyage en cours...`);

    // ✅ IMPORTANT: Sauvegarder le NetworkManager avant tout nettoyage
    if (this.networkManager) {
      window.globalNetworkManager = this.networkManager;
      console.log(`[${this.scene.key}] NetworkManager sauvegardé dans window.globalNetworkManager`);
    }

    // ✅ NOUVEAU: Nettoyer TOUS les listeners de cette scène
    if (this.networkManager) {
      // Supprimer le listener onStateChange spécifique à cette scène
      if (this.networkManager.callbacks && this.networkManager.callbacks.onStateChange) {
        // Créer une nouvelle fonction qui filtre par scène active
        const originalCallback = this.networkManager.callbacks.onStateChange;
        this.networkManager.callbacks.onStateChange = (state) => {
          // Seulement appeler si cette scène est active
          if (this.scene.isActive()) {
            originalCallback(state);
          }
        };
      }
      
      if (this.zoneChangedHandler) {
        this.networkManager.offZoneChanged(this.zoneChangedHandler);
        this.zoneChangedHandler = null;
      }
    }

    // Nettoyer les joueurs SANS effacer mySessionId
    if (this.playerManager) {
      // ✅ NOUVEAU: Sauvegarder mySessionId avant nettoyage
      const savedSessionId = this.playerManager.mySessionId;
      this.playerManager.clearAllPlayers();
      this.playerManager.mySessionId = savedSessionId; // Restaurer
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
    
    // ✅ IMPORTANT: Ne PAS mettre this.networkManager = null
    // Garder la référence pour les autres scènes
  }

  // ✅ DEBUG: Fonction pour surveiller l'état
  checkSceneState() {
    console.log(`[${this.scene.key}] 🔍 ÉTAT DE LA SCÈNE:`);
    console.log("================================");
    console.log("NetworkManager:", !!this.networkManager);
    console.log("NetworkManager connecté:", this.networkManager?.isConnected);
    console.log("SessionId:", this.mySessionId);
    console.log("PlayerManager:", !!this.playerManager);
    console.log("Mon joueur:", !!this.playerManager?.getMyPlayer());
    console.log("Caméra suit:", this.cameraFollowing);
    console.log("Transition en cours:", this.isTransitioning);
    console.log("================================");
  }
}
