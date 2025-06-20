// client/src/scenes/zones/BaseZoneScene.js - VERSION AVEC INVENTAIRE INTÉGRÉ
// ✅ Ajout de l'intégration complète du système d'inventaire

import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
// ✅ NOUVEAU: Import du système d'inventaire
import { InventorySystem } from "../../game/InventorySystem.js";

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
    
    // ✅ NOUVEAU: Système d'inventaire
    this.inventorySystem = null;
    this.inventoryInitialized = false;
    
    // ✅ NOUVEAU: Délai de grâce après spawn
    this.spawnGraceTime = 0;
    this.spawnGraceDuration = 2000; // 2 secondes
    
    // ✅ NOUVEAU: Gestion des états de transition
    this.transitionState = {
      isInProgress: false,
      targetZone: null,
      startTime: 0,
      maxDuration: 10000 // 10 secondes max
    };
    
    // ✅ NOUVEAU: Zone mapping et état
    this.zoneName = this.mapSceneToZone(sceneKey);
    this.isSceneReady = false;
    this.networkSetupComplete = false;
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
    console.log(`🌍 === CRÉATION ZONE: ${this.scene.key} (${this.zoneName}) ===`);
    console.log(`📊 Scene data reçue:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.setupManagers();
    this.loadMap();
    this.setupInputs();
    this.createUI();

    this.myPlayerReady = false;
    this.isSceneReady = true;

    // ✅ AMÉLIORATION 1: Setup des zones de transition après la map
    this.setupZoneTransitions();

    // ✅ AMÉLIORATION 2: Gestion réseau améliorée
    this.initializeNetworking();

    // ✅ AMÉLIORATION 3: Hook joueur local avec vérifications
    this.setupPlayerReadyHandler();

    // Nettoyage amélioré
    this.setupCleanupHandlers();
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation réseau intelligente
  initializeNetworking() {
    console.log(`📡 [${this.scene.key}] Initialisation networking...`);
    
    const sceneData = this.scene.settings.data;
    
    // Cas 1: NetworkManager fourni via sceneData (transition normale)
    if (sceneData?.networkManager) {
      console.log(`📡 [${this.scene.key}] NetworkManager reçu via transition`);
      this.useExistingNetworkManager(sceneData.networkManager, sceneData);
      return;
    }
    
    // Cas 2: Chercher dans les autres scènes
    const existingNetworkManager = this.findExistingNetworkManager();
    if (existingNetworkManager) {
      console.log(`📡 [${this.scene.key}] NetworkManager trouvé dans autre scène`);
      this.useExistingNetworkManager(existingNetworkManager);
      return;
    }
    
    // Cas 3: Première connexion (BeachScene uniquement)
    if (this.scene.key === 'BeachScene') {
      console.log(`📡 [${this.scene.key}] Première connexion WorldRoom`);
      this.initializeNewNetworkConnection();
    } else {
      console.error(`❌ [${this.scene.key}] Aucun NetworkManager disponible et pas BeachScene!`);
      this.showErrorState("Erreur: Connexion réseau manquante");
    }
  }

  useExistingNetworkManager(networkManager, sceneData = null) {
    this.networkManager = networkManager;
    this.mySessionId = networkManager.getSessionId();
    
    console.log(`📡 [${this.scene.key}] SessionId récupéré: ${this.mySessionId}`);
    
    // ✅ CORRECTION CRITIQUE: Synchroniser le PlayerManager IMMÉDIATEMENT
    if (this.playerManager) {
      console.log(`🔄 [${this.scene.key}] Synchronisation PlayerManager...`);
      this.playerManager.setMySessionId(this.mySessionId);
      
      // ✅ NOUVEAU: Forcer une resynchronisation si nécessaire
      if (sceneData?.fromTransition) {
        this.time.delayedCall(100, () => {
          this.playerManager.forceResynchronization();
        });
      }
    }
    
    this.setupNetworkHandlers();
    this.networkSetupComplete = true;
    
    // ✅ NOUVEAU: Initialiser l'inventaire avec la connexion réseau
    this.initializeInventorySystem();
    
    // ✅ NOUVEAU: Vérifier immédiatement l'état du réseau
    this.verifyNetworkState();
    
    // ✅ AJOUT: Déclencher une mise à jour de zone après sync
    this.time.delayedCall(300, () => {
      console.log(`🔄 [${this.scene.key}] Vérifier NPCs stockés...`);
      
      // ✅ NOUVEAU: Utiliser les NPCs stockés si ils correspondent à notre zone
      if (this.networkManager.lastReceivedNpcs && 
          this.networkManager.lastReceivedZoneData && 
          this.networkManager.lastReceivedZoneData.zone === this.networkManager.currentZone) {
        
        console.log(`🎯 [${this.scene.key}] NPCs trouvés en cache pour zone: ${this.networkManager.currentZone}`);
        
        // Déclencher manuellement le spawn des NPCs
        if (this.npcManager) {
          this.npcManager.spawnNpcs(this.networkManager.lastReceivedNpcs);
        }
      } else {
        console.log(`⚠️ [${this.scene.key}] Aucun NPC en cache pour zone: ${this.networkManager.currentZone}`);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation du système d'inventaire
  initializeInventorySystem() {
    if (this.inventoryInitialized || !this.networkManager?.room) {
      console.log(`⚠️ [${this.scene.key}] Inventaire déjà initialisé ou pas de room`);
      return;
    }

    try {
      console.log(`🎒 [${this.scene.key}] Initialisation du système d'inventaire...`);
      
      // ✅ Créer le système d'inventaire avec la room du NetworkManager
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);
      
      // ✅ Configurer la langue en anglais
      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }
      
      // ✅ Rendre accessible globalement
      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;
      
      // ✅ Setup des événements d'inventaire spécifiques à la scène
      this.setupInventoryEventHandlers();
      
      // ✅ Connecter l'inventaire standalone au serveur (rétrocompatibilité)
      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }
      
      this.inventoryInitialized = true;
      console.log(`✅ [${this.scene.key}] Système d'inventaire initialisé`);
      
      // ✅ Test automatique après initialisation
      this.time.delayedCall(2000, () => {
        this.testInventoryConnection();
      });
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation inventaire:`, error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Setup des événements d'inventaire
  setupInventoryEventHandlers() {
    if (!this.networkManager?.room) return;

    console.log(`🎒 [${this.scene.key}] Configuration des événements d'inventaire...`);

    // ✅ Écouter les messages d'inventaire du serveur
    this.networkManager.room.onMessage("inventoryData", (data) => {
      console.log(`🎒 [${this.scene.key}] Données d'inventaire reçues:`, data);
    });

    this.networkManager.room.onMessage("inventoryUpdate", (data) => {
      console.log(`🔄 [${this.scene.key}] Mise à jour inventaire:`, data);
      
      // ✅ Afficher une notification dans la scène
      if (data.type === 'add') {
        this.showNotification(`+${data.quantity} ${data.itemId}`, 'success');
      } else if (data.type === 'remove') {
        this.showNotification(`-${data.quantity} ${data.itemId}`, 'info');
      }
    });

    this.networkManager.room.onMessage("itemPickup", (data) => {
      console.log(`🎁 [${this.scene.key}] Objet ramassé:`, data);
      this.showNotification(`Picked up: ${data.itemId} x${data.quantity}`, 'success');
      
      // ✅ Effet visuel de ramassage
      this.showPickupEffect(data);
    });

    this.networkManager.room.onMessage("itemUseResult", (data) => {
      console.log(`🎯 [${this.scene.key}] Résultat utilisation objet:`, data);
      
      if (data.success) {
        this.showNotification(data.message || "Item used successfully", 'success');
      } else {
        this.showNotification(data.message || "Cannot use this item", 'error');
      }
    });

    this.networkManager.room.onMessage("inventoryError", (data) => {
      console.error(`❌ [${this.scene.key}] Erreur inventaire:`, data);
      this.showNotification(data.message, 'error');
    });

    console.log(`✅ [${this.scene.key}] Événements d'inventaire configurés`);
  }

  // ✅ NOUVELLE MÉTHODE: Effet visuel de ramassage
  showPickupEffect(data) {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) return;

    // ✅ Créer un effet de texte qui monte
    const effectText = this.add.text(
      myPlayer.x,
      myPlayer.y - 20,
      `+${data.quantity} ${data.itemId}`,
      {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setDepth(1000);

    // ✅ Animation du texte
    this.tweens.add({
      targets: effectText,
      y: myPlayer.y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        effectText.destroy();
      }
    });

    // ✅ Effet de particules simple
    this.createSimpleParticleEffect(myPlayer.x, myPlayer.y - 10);
  }

  // ✅ NOUVELLE MÉTHODE: Effet de particules simple
  createSimpleParticleEffect(x, y) {
    // Créer quelques cercles colorés qui disparaissent
    for (let i = 0; i < 5; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        3,
        0xffdd00
      ).setDepth(999);

      this.tweens.add({
        targets: particle,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 800,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Test de connexion inventaire
  testInventoryConnection() {
    if (!this.inventorySystem || !this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Cannot test inventory: no system or room`);
      return;
    }

    console.log(`🧪 [${this.scene.key}] Test de connexion inventaire...`);
    
    // ✅ Demander les données d'inventaire
    this.inventorySystem.requestInventoryData();
    
    // ✅ Test d'ajout d'objet (pour le debug)
    if (this.scene.key === 'BeachScene') {
      this.time.delayedCall(3000, () => {
        console.log(`🧪 [${this.scene.key}] Test ajout d'objets de départ...`);
        this.networkManager.room.send("testAddItem", { itemId: "poke_ball", quantity: 3 });
        this.networkManager.room.send("testAddItem", { itemId: "potion", quantity: 2 });
        this.networkManager.room.send("testAddItem", { itemId: "town_map", quantity: 1 });
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Créer des objets ramassables dans le monde
  createWorldItems() {
    console.log(`🎁 [${this.scene.key}] Création d'objets dans le monde...`);
    
    // ✅ Exemple: Créer quelques objets ramassables pour tester
    const itemsToCreate = [
      { itemId: 'poke_ball', x: 150, y: 150 },
      { itemId: 'potion', x: 200, y: 180 },
      { itemId: 'antidote', x: 120, y: 200 }
    ];

    itemsToCreate.forEach((itemData, index) => {
      this.createWorldItem(itemData.itemId, itemData.x, itemData.y);
    });
  }

  // ✅ NOUVELLE MÉTHODE: Créer un objet individuel dans le monde
  createWorldItem(itemId, x, y) {
    // ✅ Créer un sprite pour l'objet
    const itemSprite = this.add.circle(x, y, 8, 0xffdd00);
    itemSprite.setDepth(3);
    itemSprite.setInteractive();
    
    // ✅ Ajouter un effet de brillance
    itemSprite.setStrokeStyle(2, 0xffffff);
    
    // ✅ Animation de clignotement
    this.tweens.add({
      targets: itemSprite,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // ✅ Stocker les données de l'objet
    itemSprite.itemData = {
      itemId: itemId,
      x: x,
      y: y
    };
    
    // ✅ Gérer l'interaction
    itemSprite.on('pointerdown', () => {
      this.attemptPickupItem(itemSprite);
    });
    
    // ✅ Ajouter à un groupe pour la gestion
    if (!this.worldItems) {
      this.worldItems = this.add.group();
    }
    this.worldItems.add(itemSprite);
    
    console.log(`🎁 [${this.scene.key}] Objet créé: ${itemId} à (${x}, ${y})`);
  }

  // ✅ NOUVELLE MÉTHODE: Tentative de ramassage d'objet
  attemptPickupItem(itemSprite) {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.warn(`⚠️ [${this.scene.key}] Pas de joueur pour ramasser l'objet`);
      return;
    }

    // ✅ Vérifier la distance
    const distance = Phaser.Math.Distance.Between(
      myPlayer.x, myPlayer.y,
      itemSprite.x, itemSprite.y
    );
    
    if (distance > 50) {
      this.showNotification("Too far from item", 'warning');
      console.log(`🚫 [${this.scene.key}] Trop loin de l'objet: ${distance}px`);
      return;
    }

    // ✅ Envoyer la requête de ramassage au serveur
    if (this.networkManager?.room) {
      console.log(`📤 [${this.scene.key}] Envoi requête pickup:`, itemSprite.itemData);
      
      this.networkManager.room.send("pickupItem", {
        itemId: itemSprite.itemData.itemId,
        quantity: 1,
        x: itemSprite.itemData.x,
        y: itemSprite.itemData.y
      });
      
      // ✅ Supprimer l'objet du monde immédiatement (feedback visuel)
      itemSprite.destroy();
      
      // ✅ Effet visuel de ramassage
      this.showPickupEffect({
        itemId: itemSprite.itemData.itemId,
        quantity: 1
      });
      
    } else {
      console.warn(`⚠️ [${this.scene.key}] Pas de connexion serveur pour ramasser l'objet`);
      this.showNotification("No server connection", 'error');
    }
  }

  // ✅ AMÉLIORATION: Setup des inputs avec inventaire
  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // ✅ Interaction NPC existante
    this.input.keyboard.on("keydown-E", () => {
      // ✅ Bloquer si l'inventaire est ouvert
      if (window.shouldBlockInput && window.shouldBlockInput()) {
        return;
      }
      
      const myPlayer = this.playerManager.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;

      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager.sendNpcInteract(npc.id);
      } else {
        // ✅ Si pas de NPC, chercher des objets ramassables
        this.checkForNearbyItems(myPlayer);
      }
    });

    // ✅ NOUVEAU: Raccourci inventaire
    this.input.keyboard.on("keydown-I", (event) => {
      if (window.shouldBlockInput && window.shouldBlockInput()) {
        return;
      }
      
      event.preventDefault();
      if (window.toggleInventory) {
        window.toggleInventory();
      } else if (this.inventorySystem) {
        this.inventorySystem.toggleInventory();
      }
    });

    // ✅ NOUVEAU: Raccourci journal des quêtes
    this.input.keyboard.on("keydown-Q", (event) => {
      if (window.shouldBlockInput && window.shouldBlockInput()) {
        return;
      }
      
      event.preventDefault();
      if (window.openQuestJournal) {
        window.openQuestJournal();
      }
    });

    // ✅ NOUVEAU: Raccourci de debug inventaire
    this.input.keyboard.on("keydown-T", (event) => {
      if (window.shouldBlockInput && window.shouldBlockInput()) {
        return;
      }
      
      if (event.ctrlKey) {
        event.preventDefault();
        this.testInventoryConnection();
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Chercher des objets ramassables à proximité
  checkForNearbyItems(player) {
    if (!this.worldItems) return;

    let closestItem = null;
    let closestDistance = Infinity;

    this.worldItems.children.entries.forEach(item => {
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        item.x, item.y
      );
      
      if (distance < 50 && distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });

    if (closestItem) {
      console.log(`🎁 [${this.scene.key}] Objet ramassable trouvé: ${closestItem.itemData.itemId}`);
      this.attemptPickupItem(closestItem);
    }
  }

  // ✅ AMÉLIORATION: Gestion du mouvement avec vérification d'inventaire
  handleMovement(myPlayerState) {
    // ✅ Bloquer le mouvement si l'inventaire est ouvert
    if (window.shouldBlockInput && window.shouldBlockInput()) {
      const myPlayer = this.playerManager.getMyPlayer();
      if (myPlayer) {
        myPlayer.body.setVelocity(0, 0);
        myPlayer.play(`idle_${this.lastDirection}`, true);
        myPlayer.isMovingLocally = false;
      }
      return;
    }

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
        console.log(`🏃 [${this.scene.key}] Joueur bouge, délai de grâce désactivé`);
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

  // ✅ AMÉLIORATION: Cleanup avec inventaire
  cleanup() {
    console.log(`🧹 [${this.scene.key}] Nettoyage optimisé...`);

    // ✅ NOUVEAU: Nettoyage conditionnel selon le type de fermeture
    const isTransition = this.networkManager && this.networkManager.isTransitionActive;
    
    if (!isTransition) {
      // Nettoyage complet seulement si ce n'est pas une transition
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
      
      // ✅ NOUVEAU: Nettoyer l'inventaire seulement en cas de fermeture complète
      if (this.inventorySystem && !window.inventorySystemGlobal) {
        this.inventorySystem.destroy();
        this.inventorySystem = null;
      }
    } else {
      // En transition, préserver les données critiques
      console.log(`🔄 [${this.scene.key}] Nettoyage léger pour transition`);
      
      // ✅ L'inventaire reste global et n'est pas nettoyé en transition
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }

    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    if (this.worldItems) {
      this.worldItems.clear(true, true);
      this.worldItems = null;
    }

    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.isSceneReady = false;
    this.networkSetupComplete = false;
    this.inventoryInitialized = false;
    
    console.log(`✅ [${this.scene.key}] Nettoyage terminé`);
  }

  // ✅ AMÉLIORATION: Setup du scene avec objets ramassables
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
    
    // ✅ NOUVEAU: Créer des objets ramassables dans certaines scènes
    if (this.scene.key === 'BeachScene') {
      this.time.delayedCall(3000, () => {
        this.createWorldItems();
      });
    }
  }

  // ✅ AMÉLIORATION: UI avec informations d'inventaire
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

    // ✅ NOUVEAU: Texte d'aide pour l'inventaire
    this.helpText = this.add.text(16, this.scale.height - 60, 
      'I: Inventory  Q: Quests  E: Interact  Ctrl+T: Test Inventory', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ccc',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
  }

  // ✅ NOUVELLE MÉTHODE: Chercher un NetworkManager existant
  findExistingNetworkManager() {
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene', 'LavandiaScene'];
    
    for (const sceneName of scenesToCheck) {
      if (sceneName === this.scene.key) continue;
      
      const scene = this.scene.manager.getScene(sceneName);
      if (scene?.networkManager?.isConnected) {
        console.log(`📡 [${this.scene.key}] NetworkManager trouvé dans: ${sceneName}`);
        return scene.networkManager;
      }
    }
    
    return null;
  }

  // ✅ AMÉLIORATION: Nouvelle connexion réseau avec gestion d'erreurs
  async initializeNewNetworkConnection() {
    try {
      const connectionData = await this.prepareConnectionData();
      
      this.networkManager = new NetworkManager(connectionData.identifier);
      this.setupNetworkHandlers();
      
      const connected = await this.networkManager.connect(
        connectionData.spawnZone, 
        { 
          spawnX: connectionData.lastX, 
          spawnY: connectionData.lastY 
        }
      );
      
      if (connected) {
        this.mySessionId = this.networkManager.getSessionId();
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
        this.networkSetupComplete = true;
        
        // ✅ NOUVEAU: Initialiser l'inventaire après connexion réussie
        this.initializeInventorySystem();
        
        console.log(`✅ [${this.scene.key}] Connexion réussie: ${this.mySessionId}`);
      } else {
        throw new Error("Échec de connexion au serveur");
      }
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur connexion:`, error);
      this.showErrorState(`Erreur de connexion: ${error.message}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Préparer les données de connexion
  async prepareConnectionData() {
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

    let identifier = getWalletFromUrl();
    if (!identifier && window.app?.currentAccount?.address) {
      identifier = window.app.currentAccount.address;
    }
    if (!identifier) {
      throw new Error("Aucun wallet connecté");
    }

    const { lastMap, lastX, lastY } = await fetchLastPosition(identifier);
    const spawnZone = this.mapSceneToZone(this.mapZoneToScene(lastMap));

    return { identifier, spawnZone, lastX, lastY };
  }

  // ✅ AMÉLIORATION: Setup des handlers réseau avec vérifications
  setupNetworkHandlers() {
    if (!this.networkManager) return;

    console.log(`📡 [${this.scene.key}] Configuration handlers réseau...`);

    // ✅ NOUVEAU: Handler de connexion amélioré
    this.networkManager.onConnect(() => {
      console.log(`✅ [${this.scene.key}] Connexion établie`);
      
      // Vérifier et synchroniser le sessionId
      const currentSessionId = this.networkManager.getSessionId();
      if (this.mySessionId !== currentSessionId) {
        console.log(`🔄 [${this.scene.key}] Mise à jour sessionId: ${this.mySessionId} → ${currentSessionId}`);
        this.mySessionId = currentSessionId;
        
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
      }
      
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!\nInventory: ${this.inventoryInitialized ? 'Ready' : 'Loading...'}`);

      // Quest system
      this.initializeQuestSystem();
    });

    // ✅ AMÉLIORATION: Handler d'état avec protection
    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady || !this.networkSetupComplete) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête, ignoré`);
        return;
      }
      
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      // ✅ CORRECTION: Vérification sessionId avant chaque update
      this.synchronizeSessionId();
      
      this.playerManager.updatePlayers(state);

      // ✅ AMÉLIORATION: Gestion du joueur local
      this.handleMyPlayerFromState();
    });

    // Handlers de zone WorldRoom
    this.setupWorldRoomHandlers();

    // Handlers existants
    this.setupExistingHandlers();
  }

  // ✅ NOUVELLE MÉTHODE: Synchronisation sessionId
  synchronizeSessionId() {
    if (!this.networkManager) return;
    
    const currentNetworkSessionId = this.networkManager.getSessionId();
    if (this.mySessionId !== currentNetworkSessionId) {
      console.warn(`⚠️ [${this.scene.key}] SessionId désynchronisé: ${this.mySessionId} → ${currentNetworkSessionId}`);
      this.mySessionId = currentNetworkSessionId;
      
      if (this.playerManager) {
        this.playerManager.setMySessionId(this.mySessionId);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gestion du joueur local depuis le state
  handleMyPlayerFromState() {
    if (this.myPlayerReady) return;
    
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      console.log(`✅ [${this.scene.key}] Joueur local trouvé: ${this.mySessionId}`);
      
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.positionPlayer(myPlayer);
      
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Setup des handlers WorldRoom
  setupWorldRoomHandlers() {
    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] NPCs reçus: ${npcs.length}`);
      
      // ✅ FIX 1: Normalisation des noms de zones plus robuste
      const currentSceneZone = this.normalizeZoneName(this.scene.key);
      const serverZone = this.networkManager.currentZone;
      
      console.log(`🔍 [${this.scene.key}] Comparaison zones: scene="${currentSceneZone}" vs server="${serverZone}"`);
      
      // ✅ FIX 2: Accepter les NPCs si on est dans la bonne zone OU si c'est juste après une transition
      const isCorrectZone = currentSceneZone === serverZone;
      const isRecentTransition = Date.now() - (this._lastTransitionTime || 0) < 3000; // 3 secondes de grâce
      
      if (!isCorrectZone && !isRecentTransition) {
        console.log(`🚫 [${this.scene.key}] NPCs ignorés: zone serveur=${serverZone} ≠ scène=${currentSceneZone}`);
        return;
      }
      
      if (this.npcManager && npcs.length > 0) {
        console.log(`✅ [${this.scene.key}] Spawn de ${npcs.length} NPCs`);
        this.npcManager.spawnNpcs(npcs);
      }
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ [${this.scene.key}] Transition réussie:`, result);
      this.handleTransitionSuccess(result);
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}] Transition échouée:`, result);
      this.handleTransitionError(result);
    });

    this.networkManager.onNpcInteraction((result) => {
      console.log(`💬 [${this.scene.key}] NPC interaction:`, result);
      this.handleNpcInteraction(result);
    });
  }

  // ✅ NOUVELLE MÉTHODE: Setup des handlers existants
  setupExistingHandlers() {
    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });

    this.networkManager.onDisconnect(() => {
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nDisconnected from WorldRoom`);
    });
  }

  // ✅ AMÉLIORATION: Setup du handler joueur prêt
  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`✅ [${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

        this.cameraManager.followPlayer(myPlayer);
        this.cameraFollowing = true;
        this.positionPlayer(myPlayer);

        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(myPlayer);
        }
      }
    });
  }

  // ✅ AMÉLIORATION: Vérification de l'état réseau
  verifyNetworkState() {
    if (!this.networkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager manquant`);
      return;
    }
    
    console.log(`🔍 [${this.scene.key}] Vérification état réseau...`);
    
    // Débugger l'état
    this.networkManager.debugState();
    
    // Vérifier la synchronisation des zones
    this.networkManager.checkZoneSynchronization(this.scene.key);
    
    // Forcer une resynchronisation si nécessaire
    if (this.playerManager) {
      this.time.delayedCall(500, () => {
        this.playerManager.forceResynchronization();
      });
    }
  }

  // ✅ AMÉLIORATION: Gestion des transitions avec état
  async handleZoneTransition(transitionData) {
    // ✅ CORRECTION: Utiliser la nouvelle API du NetworkManager
    if (this.networkManager && this.networkManager.isTransitionActive) {
      console.log(`⚠️ [${this.scene.key}] Transition déjà en cours via NetworkManager`);
      return;
    }

    if (transitionData.targetZone === this.zoneName) {
      console.warn(`⚠️ [${this.scene.key}] Transition vers soi-même bloquée`);
      return;
    }

    console.log(`🌀 [${this.scene.key}] === DÉBUT TRANSITION ===`);
    console.log(`📍 Destination: ${transitionData.targetZone}`);
    console.log(`📊 Data:`, transitionData);

    try {
      const success = this.networkManager.moveToZone(
        transitionData.targetZone,
        transitionData.targetX,
        transitionData.targetY
      );

      if (!success) {
        throw new Error("Impossible d'envoyer la requête de transition");
      }

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur transition:`, error);
      this.showNotification(`Erreur: ${error.message}`, "error");
    }
  }

  // ✅ AMÉLIORATION: Gestion des succès de transition
  handleTransitionSuccess(result) {
    console.log(`✅ [${this.scene.key}] === TRANSITION RÉUSSIE ===`);
    console.log(`📍 Destination: ${result.currentZone}`);
    console.log(`📊 Résultat:`, result);
    
    // ✅ FIX 3: Marquer le moment de transition pour la grâce des NPCs
    this._lastTransitionTime = Date.now();
    
    const targetScene = this.mapZoneToScene(result.currentZone);
    
    if (targetScene === this.scene.key) {
      console.log(`📍 [${this.scene.key}] Repositionnement dans la même scène`);
      this.repositionPlayerAfterTransition(result);
      
      // ✅ FIX 4: Forcer le rechargement des NPCs après repositionnement
      this.time.delayedCall(500, () => {
        if (this.networkManager?.lastReceivedNpcs) {
          console.log(`🔄 [${this.scene.key}] Rechargement forcé des NPCs`);
          this.npcManager?.spawnNpcs(this.networkManager.lastReceivedNpcs);
        }
      });
    } else {
      console.log(`🚀 [${this.scene.key}] Changement vers: ${targetScene}`);
      this.performSceneTransition(targetScene, result);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Repositionnement du joueur
  repositionPlayerAfterTransition(result) {
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && result.position) {
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;
      
      // Mettre à jour la caméra
      if (this.cameraManager) {
        this.cameraManager.snapToPlayer();
      }
      
      console.log(`📍 [${this.scene.key}] Position mise à jour: (${result.position.x}, ${result.position.y})`);
    }
    
    // Délai de grâce après repositionnement
    this.spawnGraceTime = Date.now() + this.spawnGraceDuration;
  }

  // ✅ AMÉLIORATION: Changement de scène optimisé
  performSceneTransition(targetScene, result) {
    console.log(`🚀 [${this.scene.key}] === CHANGEMENT DE SCÈNE ===`);
    console.log(`📍 Vers: ${targetScene}`);
    console.log(`📊 Data:`, result);
    
    // ✅ CORRECTION CRITIQUE: Nettoyage minimal pour préserver les données
    this.prepareForTransition();
    
    // Démarrer la nouvelle scène avec TOUTES les données nécessaires
    const transitionData = {
      fromZone: this.zoneName,
      fromTransition: true,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      networkManager: this.networkManager,
      mySessionId: this.mySessionId,
      preservePlayer: true, // ✅ NOUVEAU: Flag pour préserver le joueur
      inventorySystem: this.inventorySystem // ✅ NOUVEAU: Transférer l'inventaire
    };
    
    console.log(`📦 [${this.scene.key}] Données de transition:`, transitionData);
    
    this.scene.start(targetScene, transitionData);
  }

  // ✅ NOUVELLE MÉTHODE: Préparation pour transition
  prepareForTransition() {
    console.log(`🔧 [${this.scene.key}] Préparation pour transition...`);
    
    // ✅ CORRECTION: NE PAS faire de cleanup complet
    // On ne nettoie que ce qui est spécifique à cette scène
    
    // Arrêter les timers locaux
    this.time.removeAllEvents();
    
    // Nettoyer les objets animés locaux
    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }
    
    // ✅ NOUVEAU: Nettoyer les objets du monde
    if (this.worldItems) {
      this.worldItems.clear(true, true);
      this.worldItems = null;
    }
    
    // ✅ IMPORTANT: NE PAS nettoyer le PlayerManager, NetworkManager ni InventorySystem
    // Ils seront transférés à la nouvelle scène
    
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    
    console.log(`✅ [${this.scene.key}] Préparation terminée`);
  }

  // ✅ AMÉLIORATION: Position du joueur avec données de transition
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    console.log(`📍 [${this.scene.key}] Positionnement joueur...`);
    console.log(`📊 InitData:`, initData);
    
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      console.log(`📍 Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
      player.x = initData.spawnX;
      player.y = initData.spawnY;
      player.targetX = initData.spawnX;
      player.targetY = initData.spawnY;
    } else {
      const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
      console.log(`📍 Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
      player.x = defaultPos.x;
      player.y = defaultPos.y;
      player.targetX = defaultPos.x;
      player.targetY = defaultPos.y;
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
    console.log(`🛡️ [${this.scene.key}] Délai de grâce activé pour ${this.spawnGraceDuration}ms`);

    // Envoyer la position au serveur
    if (this.networkManager && this.networkManager.isConnected) {
      this.networkManager.sendMove(player.x, player.y, 'down', false);
    }

    this.onPlayerPositioned(player, initData);
  }

  // ✅ AMÉLIORATION: Vérification des collisions avec état de transition
  checkTransitionCollisions() {
    // ✅ CORRECTION: Utiliser la nouvelle API du NetworkManager
    if (!this.playerManager || (this.networkManager && this.networkManager.isTransitionActive)) return;

    // Ne pas vérifier pendant le délai de grâce
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

    // Vérifier toutes les zones de transition
    this.children.list.forEach(child => {
      if (child.transitionData && child.body) {
        const playerBounds = myPlayer.getBounds();
        const zoneBounds = child.getBounds();

        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
          console.log(`🌀 [${this.scene.key}] Collision transition vers ${child.transitionData.targetZone}`);
          
          if (child.transitionData.targetZone === this.zoneName) {
            console.warn(`⚠️ [${this.scene.key}] Tentative de transition vers soi-même ignorée`);
            return;
          }
          
          this.handleZoneTransition(child.transitionData);
        }
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation du système de quêtes
  initializeQuestSystem() {
    if (!window.questSystem && this.networkManager?.room) {
      try {
        window.questSystem = new QuestSystem(this, this.networkManager.room);
        console.log("✅ [QuestSystem] Initialisé");
      } catch (e) {
        console.error("❌ Erreur init QuestSystem:", e);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Affichage d'état d'erreur
  showErrorState(message) {
    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    
    // Ajouter un bouton de retry si nécessaire
    this.time.delayedCall(5000, () => {
      if (!this.networkSetupComplete) {
        console.log(`🔄 [${this.scene.key}] Tentative de reconnexion...`);
        this.initializeNetworking();
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour du texte d'info
  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  // ✅ AMÉLIORATION: Update avec vérifications d'état
  update() {
    // Vérifications périodiques
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

  // === MÉTHODES EXISTANTES CONSERVÉES ===

  // Mapping scene → zone
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

  // Mapping zone → scene
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

  // Normalisation des noms de zones
  normalizeZoneName(sceneName) {
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

      const targetZoneName = this.mapSceneToZone(this.mapZoneToScene(targetZone));
      if (targetZoneName === this.zoneName) {
        console.warn(`[${this.scene.key}] ⚠️ Zone ${index} pointe vers elle-même (${targetZone} → ${targetZoneName}), ignorée`);
        return;
      }

      const teleportZone = this.add.zone(
        zone.x + (zone.width || 32) / 2, 
        zone.y + (zone.height || 32) / 2, 
        zone.width || 32, 
        zone.height || 32
      );

      this.physics.world.enableBody(teleportZone, Phaser.Physics.Arcade.STATIC_BODY);
      teleportZone.body.setSize(zone.width || 32, zone.height || 32);

      teleportZone.transitionData = {
        targetZone: targetZoneName,
        spawnPoint,
        targetX: targetX ? parseFloat(targetX) : undefined,
        targetY: targetY ? parseFloat(targetY) : undefined,
        fromZone: this.zoneName
      };

      console.log(`[${this.scene.key}] ✅ Transition zone ${index} setup:`, teleportZone.transitionData);
    });
  }

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

  handleZoneData(data) {
    console.log(`🗺️ [${this.scene.key}] Handling zone data for: ${data.zone}`);
    
    if (data.zone !== this.zoneName) {
      console.warn(`[${this.scene.key}] Zone data pour ${data.zone} mais nous sommes dans ${this.zoneName}`);
      return;
    }

    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }

    console.log(`✅ [${this.scene.key}] Zone data appliquée`);
  }

  handleTransitionError(result) {
    console.error(`❌ [${this.scene.key}] Erreur transition: ${result.reason}`);
    this.showNotification(`Transition impossible: ${result.reason}`, 'error');
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
    // ✅ NOUVEAU: Gestion des interactions qui donnent des objets
    else if (result.type === "giveItem") {
      console.log(`🎁 [${this.scene.key}] NPC donne objet:`, result);
      
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
      
      // Les objets seront automatiquement ajoutés via les messages serveur
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

  // ✅ NOUVELLES MÉTHODES UTILITAIRES POUR L'INVENTAIRE

  // Obtenir le statut de l'inventaire
  getInventoryStatus() {
    return {
      initialized: this.inventoryInitialized,
      system: !!this.inventorySystem,
      global: !!window.inventorySystem,
      canUse: this.inventoryInitialized && this.networkManager?.room
    };
  }

  // Test rapide de l'inventaire depuis la console
  debugInventory() {
    console.log(`🎒 [${this.scene.key}] Debug inventaire:`, this.getInventoryStatus());
    
    if (this.inventorySystem) {
      console.log(`📊 Système d'inventaire:`, {
        isOpen: this.inventorySystem.isInventoryOpen(),
        canInteract: this.inventorySystem.canPlayerInteract()
      });
    }
    
    if (window.inventorySystem) {
      console.log(`🌍 Système global:`, {
        isOpen: window.inventorySystem.isInventoryOpen(),
        canInteract: window.inventorySystem.canPlayerInteract()
      });
    }
  }

  // Donner un objet au joueur (pour les NPCs)
  giveItemToPlayer(itemId, quantity = 1) {
    if (!this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Cannot give item: no server connection`);
      return false;
    }

    console.log(`🎁 [${this.scene.key}] Giving item to player: ${itemId} x${quantity}`);
    
    // Utiliser le système serveur pour donner l'objet
    this.networkManager.room.send("testAddItem", {
      itemId: itemId,
      quantity: quantity
    });
    
    return true;
  }

  // Vérifier si le joueur possède un objet
  async checkPlayerHasItem(itemId, quantity = 1) {
    if (window.inventorySystem && typeof window.inventorySystem.hasItem === 'function') {
      return window.inventorySystem.hasItem(itemId);
    }
    
    // Alternative : demander au serveur
    if (this.networkManager?.room) {
      return new Promise((resolve) => {
        // TODO: Implémenter une vérification côté serveur
        resolve(false);
      });
    }
    
    return false;
  }
}
