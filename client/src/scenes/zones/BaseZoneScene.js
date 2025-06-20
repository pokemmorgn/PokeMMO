// client/src/scenes/zones/BaseZoneScene.js - VERSION REFACTORISÉE
// ✅ Scene de base simplifiée utilisant des composants

import { CameraManager } from "../../camera/CameraManager.js";
import { NetworkComponent } from "../../components/scene/NetworkComponent.js";
import { PlayerComponent } from "../../components/scene/PlayerComponent.js";
import { InventoryComponent } from "../../components/scene/InventoryComponent.js";
import { ZoneComponent } from "../../components/scene/ZoneComponent.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super({ key: sceneKey });
    this.mapKey = mapKey;
    
    // Gestion de la carte
    this.map = null;
    this.phaserTilesets = [];
    this.layers = {};
    this.worldLayer = null;
    this.animatedObjects = null;
    
    // Gestion des composants
    this.networkComponent = null;
    this.playerComponent = null;
    this.inventoryComponent = null;
    this.zoneComponent = null;
    this.cameraManager = null;
    
    // État de la scène
    this.isSceneReady = false;
    this.initializationComplete = false;
    
    // UI
    this.infoText = null;
    this.coordsText = null;
    this.helpText = null;
  }

  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);

    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  async create() {
    console.log(`🌍 === CRÉATION ZONE: ${this.scene.key} ===`);
    console.log(`📊 Scene data reçue:`, this.scene.settings.data);

    // 1. Créer les animations du joueur
    this.createPlayerAnimations();

    // 2. Charger la carte
    this.loadMap();

    // 3. Initialiser les composants dans l'ordre
    await this.initializeComponents();

    // 4. Setup des contrôles
    this.setupInputs();

    // 5. Créer l'interface utilisateur
    this.createUI();

    // 6. Finaliser l'initialisation
    this.finalizeInitialization();

    console.log(`✅ === ZONE ${this.scene.key} CRÉÉE ===`);
  }

  // === INITIALISATION DES COMPOSANTS ===
  async initializeComponents() {
    console.log(`🔧 Initialisation des composants...`);
    
    const sceneData = this.scene.settings.data;

    try {
      // 1. Zone Component (NPCs, transitions)
      this.zoneComponent = new ZoneComponent(this);
      await this.zoneComponent.initialize();

      // 2. Network Component (connexion serveur)
      this.networkComponent = new NetworkComponent(this);
      const networkInitialized = await this.networkComponent.initialize(sceneData);
      
      if (!networkInitialized) {
        throw new Error("Échec initialisation réseau");
      }

      // 3. Player Component (gestion joueurs)
      this.playerComponent = new PlayerComponent(this);
      await this.playerComponent.initialize(this.networkComponent.getSessionId());

      // 4. Inventory Component (inventaire)
      this.inventoryComponent = new InventoryComponent(this);
      await this.inventoryComponent.initialize(this.networkComponent.getNetworkManager());

      // 5. Camera Manager
      this.cameraManager = new CameraManager(this);

      // 6. Setup des callbacks entre composants
      this.setupComponentCallbacks();

      console.log(`✅ Tous les composants initialisés`);
      
    } catch (error) {
      console.error(`❌ Erreur initialisation composants:`, error);
      this.showErrorState(`Erreur: ${error.message}`);
    }
  }

  setupComponentCallbacks() {
    console.log(`🔗 Configuration des callbacks entre composants...`);

    // Network -> Player
    this.networkComponent.onStateChange((state) => {
      if (this.playerComponent) {
        this.playerComponent.updatePlayers(state);
      }
    });

    this.networkComponent.onSnap((data) => {
      if (this.playerComponent) {
        this.playerComponent.snapMyPlayerTo(data.x, data.y);
      }
    });

    // Network -> Zone
    this.networkComponent.onZoneData((data) => {
      this.handleZoneData(data);
    });

    this.networkComponent.onNpcList((npcs) => {
      if (this.zoneComponent) {
        this.zoneComponent.handleNpcList(npcs);
      }
    });

    this.networkComponent.onTransitionSuccess((result) => {
      if (this.zoneComponent) {
        this.zoneComponent.handleTransitionSuccess(result);
      }
    });

    this.networkComponent.onTransitionError((result) => {
      this.handleTransitionError(result);
    });

    this.networkComponent.onNpcInteraction((result) => {
      this.handleNpcInteraction(result);
    });

    // Player -> Camera
    this.playerComponent.onPlayerReady((myPlayer) => {
      console.log(`✅ Joueur prêt, configuration caméra...`);
      
      if (this.cameraManager) {
        this.cameraManager.followPlayer(myPlayer);
      }
      
      // Hook spécifique à la scène
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    });

    this.playerComponent.onPlayerPositioned((player, initData) => {
      // Hook spécifique à la scène
      if (typeof this.onPlayerPositioned === 'function') {
        this.onPlayerPositioned(player, initData);
      }
    });

    console.log(`✅ Callbacks configurés`);
  }

  // === FINALISATION ===
  finalizeInitialization() {
    // Setup de la scène (caméra, objets, etc.)
    this.setupScene();
    
    // Marquer comme prête
    this.isSceneReady = true;
    this.initializationComplete = true;
    
    console.log(`✅ Initialisation de ${this.scene.key} terminée`);
  }

  // === GESTION DE LA CARTE ===
  loadMap() {
    console.log('🗺️ Chargement de la carte...');
    this.map = this.make.tilemap({ key: this.mapKey });

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        console.log(`Chargement tileset "${tileset.name}"`);
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
      
      // Setup des transitions après que la carte soit chargée
      if (this.zoneComponent) {
        this.zoneComponent.setupZoneTransitions();
      }
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
    console.log('🎬 Configuration de la scène...');
    
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    const baseWidth = this.scale.width;
    const baseHeight = this.scale.height;
    const zoomX = baseWidth / this.map.widthInPixels;
    const zoomY = baseHeight / this.map.heightInPixels;
    const zoom = Math.min(zoomX, zoomY);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);

    // Créer des objets dans le monde si nécessaire
    if (this.inventoryComponent && this.scene.key === 'BeachScene') {
      this.time.delayedCall(3000, () => {
        this.inventoryComponent.createWorldItems();
      });
    }
  }

  // === CONTRÔLES ===
  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // Interaction NPC/objets
    this.input.keyboard.on("keydown-E", () => {
      if (window.shouldBlockInput && window.shouldBlockInput()) {
        return;
      }
      
      const myPlayer = this.playerComponent?.getMyPlayer();
      if (!myPlayer) return;

      // Chercher un NPC proche
      const npc = this.zoneComponent?.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        this.zoneComponent.handleNpcInteraction(npc.id);
        return;
      }

      // Chercher des objets ramassables
      const closestItem = this.inventoryComponent?.checkForNearbyItems(myPlayer);
      if (closestItem) {
        this.inventoryComponent.attemptPickupItem(closestItem, myPlayer);
      }
    });

    // Raccourcis inventaire et quêtes
    this.input.keyboard.on("keydown-I", (event) => {
      if (window.shouldBlockInput && window.shouldBlockInput()) return;
      event.preventDefault();
      this.inventoryComponent?.toggleInventory();
    });

    this.input.keyboard.on("keydown-Q", (event) => {
      if (window.shouldBlockInput && window.shouldBlockInput()) return;
      event.preventDefault();
      if (window.openQuestJournal) {
        window.openQuestJournal();
      }
    });
  }

  // === INTERFACE UTILISATEUR ===
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

    this.helpText = this.add.text(16, this.scale.height - 60, 
      'I: Inventory  Q: Quests  E: Interact', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ccc',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
  }

  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  // === GESTION DES ÉVÉNEMENTS ===
  handleZoneData(data) {
    console.log(`🗺️ Handling zone data for: ${data.zone}`);
    
    if (data.zone !== this.zoneComponent?.getZoneName()) {
      console.warn(`Zone data pour ${data.zone} mais nous sommes dans ${this.zoneComponent?.getZoneName()}`);
      return;
    }

    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }

    console.log(`✅ Zone data appliquée`);
  }

  handleTransitionError(result) {
    console.error(`❌ Erreur transition: ${result.reason}`);
    this.showNotification(`Transition impossible: ${result.reason}`, 'error');
  }

  handleNpcInteraction(result) {
    console.log("🟢 [npcInteractionResult] Reçu :", result);

    if (result.type === "dialogue") {
      let npcName = "???";
      let spriteName = null;
      let portrait = result.portrait;
      if (result.npcId && this.zoneComponent?.npcManager) {
        const npc = this.zoneComponent.npcManager.getNpcData(result.npcId);
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
    else if (result.type === "questGiver" || result.type === "questComplete" || result.type === "questProgress") {
      if (window.questSystem && typeof window.questSystem.handleNpcInteraction === 'function') {
        window.questSystem.handleNpcInteraction(result);
        return;
      }
    }
    else if (result.type === "giveItem") {
      console.log(`🎁 NPC donne objet:`, result);
      
      if (typeof window.showNpcDialogue === 'function') {
        const itemText = result.items ? 
          `You received: ${result.items.map(item => `${item.quantity} ${item.itemId}`).join(', ')}!` :
          result.message || "You received an item!";
          
        window.showNpcDialogue({
          portrait: result.portrait || "/assets/portrait/unknownPortrait.png",
          name: result.npcName || "???",
          text: itemText
        });
      }
    }
    else {
      console.warn("⚠️ Type d'interaction NPC inconnu:", result.type);
    }
  }

  showErrorState(message) {
    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    
    // Ajouter un bouton de retry si nécessaire
    this.time.delayedCall(5000, () => {
      if (!this.initializationComplete) {
        console.log(`🔄 Tentative de reconnexion...`);
        this.initializeComponents();
      }
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
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : type === 'success' ? '#44ff44' : '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }

  // === BOUCLE PRINCIPALE ===
  update(time, delta) {
    if (!this.isSceneReady || !this.initializationComplete) {
      return;
    }

    // Vérifications périodiques
    if (time % 1000 < 16) {
      this.checkPlayerState();
    }

    // Mise à jour des composants
    if (this.playerComponent) {
      this.playerComponent.update(delta);
      this.playerComponent.handleMovement();
    }

    if (this.cameraManager) {
      this.cameraManager.update();
    }

    // Vérifier les transitions
    if (this.zoneComponent) {
      this.zoneComponent.checkTransitionCollisions();
    }

    // Animations tiles
    if (this.sys.animatedTiles && typeof this.sys.animatedTiles.update === 'function') {
      this.sys.animatedTiles.update();
    }

    // Mise à jour UI
    const myPlayer = this.playerComponent?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }
  }

  checkPlayerState() {
    return this.playerComponent?.checkPlayerState() || false;
  }

  // === ANIMATIONS ===
  createPlayerAnimations() {
    if (!this.textures.exists('BoyWalk') || this.anims.exists('walk_left')) return;

    this.anims.create({
      key: 'walk_left',
      frames: this.anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }),
      frameRate: 15, repeat: -1
    });
    this.anims.create({ 
      key: 'idle_left', 
      frames: [{ key: 'BoyWalk', frame: 5 }], 
      frameRate: 1 
    });
    this.anims.create({
      key: 'walk_right',
      frames: this.anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }),
      frameRate: 15, repeat: -1
    });
    this.anims.create({ 
      key: 'idle_right', 
      frames: [{ key: 'BoyWalk', frame: 9 }], 
      frameRate: 1 
    });
    this.anims.create({
      key: 'walk_up',
      frames: this.anims.generateFrameNumbers('BoyWalk', { start: 12, end: 14 }),
      frameRate: 15, repeat: -1
    });
    this.anims.create({ 
      key: 'idle_up', 
      frames: [{ key: 'BoyWalk', frame: 13 }], 
      frameRate: 1 
    });
    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }),
      frameRate: 15, repeat: -1
    });
    this.anims.create({ 
      key: 'idle_down', 
      frames: [{ key: 'BoyWalk', frame: 1 }], 
      frameRate: 1 
    });
  }

  // === HOOKS POUR LES SCÈNES ENFANTS ===
  
  // Override dans les scènes enfants pour logique spécifique
  onPlayerReady(myPlayer) {
    // Hook à override dans les scènes enfants
    console.log(`Hook onPlayerReady appelé pour ${this.scene.key}`);
  }

  onPlayerPositioned(player, initData) {
    // Hook à override dans les scènes enfants
    console.log(`Hook onPlayerPositioned appelé pour ${this.scene.key}`);
  }

  // === NETTOYAGE ===
  cleanup() {
    console.log(`🧹 Nettoyage de ${this.scene.key}...`);

    // Déterminer le type de nettoyage
    const isTransition = this.networkComponent?.networkManager?.isTransitionActive;
    
    if (!isTransition) {
      // Nettoyage complet seulement si ce n'est pas une transition
      console.log(`🧹 Nettoyage complet`);
      
      if (this.playerComponent) {
        this.playerComponent.clearAllPlayers();
      }
      
      if (this.inventoryComponent) {
        this.inventoryComponent.cleanup();
      }
    } else {
      // En transition, préserver les données critiques
      console.log(`🔄 Nettoyage léger pour transition`);
      
      if (this.playerComponent) {
        this.playerComponent.cleanup();
      }
      
      if (this.inventoryComponent) {
        this.inventoryComponent.cleanup();
      }
    }

    // Nettoyage des composants locaux
    if (this.zoneComponent) {
      this.zoneComponent.cleanup();
    }

    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    this.time.removeAllEvents();
    this.isSceneReady = false;
    this.initializationComplete = false;
    
    console.log(`✅ Nettoyage de ${this.scene.key} terminé`);
  }

  // Cleanup automatique appelé par Phaser
  destroy() {
    this.cleanup();
    
    // Détruire les composants non-globaux
    if (this.zoneComponent) {
      this.zoneComponent.destroy();
    }
    
    if (this.playerComponent) {
      this.playerComponent.destroy();
    }
    
    if (this.networkComponent) {
      this.networkComponent.destroy();
    }
    
    // L'inventaire reste global
    if (this.inventoryComponent) {
      this.inventoryComponent.destroy();
    }
  }
}
