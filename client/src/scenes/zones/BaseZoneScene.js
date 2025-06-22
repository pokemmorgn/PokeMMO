// client/src/scenes/zones/BaseZoneScene.js - VERSION WORLDROOM CORRIGÉE AVEC SHOP
// ✅ Utilise la connexion établie dans main.js au lieu de créer une nouvelle connexion

import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";

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

    // Inventaire
    this.inventorySystem = null;
    this.inventoryInitialized = false;
    
    // Zone et état réseau
    this.zoneName = null;
    this.serverZoneConfirmed = false;
    this.isSceneReady = false;
    this.networkSetupComplete = false;

    // Shop
    this.shopIntegration = null;

    // ✅ NOUVEAU: Flag pour éviter les doubles spawns
    this.playerSpawnInitialized = false;
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

    TransitionIntegration.setupTransitions(this);

    console.log(`🌍 === CRÉATION ZONE: ${this.scene.key} ===`);
    console.log(`📊 Scene data reçue:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.setupManagers();

    this.loadMap();
    this.setupInputs();
    this.createUI();

    this.myPlayerReady = false;
    this.playerSpawnInitialized = false;
    this.isSceneReady = true;

    // ✅ UTILISER LA CONNEXION EXISTANTE AU LIEU DE CRÉER UNE NOUVELLE
    this.initializeWithExistingConnection();

    this.setupPlayerReadyHandler();
    this.setupCleanupHandlers();

    // ✅ NOUVEAU: Timer de vérification caméra
this.time.addEvent({
  delay: 100,
  callback: this.checkCameraActivation,
  callbackScope: this,
  repeat: 5 // Vérifier 5 fois max
});
    
    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
  }

  // ✅ NOUVELLE MÉTHODE: Utiliser la connexion existante de main.js
  initializeWithExistingConnection() {
    console.log(`📡 [${this.scene.key}] === UTILISATION CONNEXION EXISTANTE ===`);
    
    // ✅ Vérifier que le NetworkManager global existe
    if (!window.globalNetworkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager global manquant!`);
      this.showErrorState("NetworkManager global introuvable");
      return;
    }

    // ✅ Vérifier que la connexion est active
    if (!window.globalNetworkManager.isConnected) {
      console.error(`❌ [${this.scene.key}] NetworkManager global non connecté!`);
      this.showErrorState("Connexion réseau inactive");
      return;
    }

    // ✅ Utiliser le NetworkManager global existant
    this.networkManager = window.globalNetworkManager;
    this.mySessionId = this.networkManager.getSessionId();

    // Ajouter :
if (this.playerManager) {
  this.playerManager.setMySessionId(this.mySessionId);
}
    
    console.log(`✅ [${this.scene.key}] NetworkManager récupéré:`, {
      sessionId: this.mySessionId,
      isConnected: this.networkManager.isConnected,
      currentZone: this.networkManager.getCurrentZone()
    });
    
    // ✅ Configuration des handlers réseau
    this.setupNetworkHandlers();
    this.networkSetupComplete = true;

    // ✅ Initialiser les systèmes de jeu
    this.initializeGameSystems();

    // ✅ Demander immédiatement la zone au serveur
    this.requestServerZone();

    // ✅ Vérifier l'état du réseau
    this.verifyNetworkState();
  }

  // ✅ NOUVELLE MÉTHODE: Initialiser tous les systèmes de jeu
  initializeGameSystems() {
    console.log(`🎮 [${this.scene.key}] Initialisation des systèmes de jeu...`);

    // Inventaire
    this.initializeInventorySystem();
    
    // Shop
    integrateShopToScene(this, this.networkManager);
    
    // Quêtes (sera initialisé après connexion)
    this.initializeQuestSystem();

    console.log(`✅ [${this.scene.key}] Systèmes de jeu initialisés`);
  }

  onPlayerReady(player) {
    // Hook vide par défaut. Sera utilisé si défini dans une scène spécifique.
    console.log(`[${this.scene.key}] ✅ onPlayerReady appelé pour ${player.sessionId}`);
    console.log(`[${this.scene.key}] ✅ Hook onPlayerReady déclenché pour`, player.sessionId);
  }
  
  // ✅ MÉTHODE MODIFIÉE: Ne pas créer de joueur ici si pas nécessaire
  initPlayerSpawnFromSceneData() {
    // ✅ PROTECTION CONTRE DOUBLE SPAWN
    if (this.playerSpawnInitialized) {
      console.log(`[${this.scene.key}] ⚠️ Spawn déjà initialisé, ignorer`);
      return;
    }

    const data = this.scene.settings.data || {};
    if (!this.mySessionId) {
      console.warn(`[${this.scene.key}] ⚠️ mySessionId manquant, impossible de créer le joueur`);
      return;
    }

    const sessionId = this.mySessionId;
    let spawnX = 52, spawnY = 48;

    // Si transition de zone, coordonnées transmises
    if (typeof data.spawnX === 'number') spawnX = data.spawnX;
    if (typeof data.spawnY === 'number') spawnY = data.spawnY;

    // ✅ NOUVEAU: Vérifier si le joueur existe déjà avant de le créer
    const existingPlayer = this.playerManager?.getMyPlayer();
    if (existingPlayer) {
      console.log(`[${this.scene.key}] ✅ Joueur existant trouvé, pas de nouvelle création`);
      this.playerSpawnInitialized = true;
      
      // Juste repositionner si nécessaire
      if (data.spawnX !== undefined && data.spawnY !== undefined) {
        existingPlayer.x = spawnX;
        existingPlayer.y = spawnY;
        existingPlayer.targetX = spawnX;
        existingPlayer.targetY = spawnY;
        console.log(`[${this.scene.key}] Joueur repositionné à (${spawnX}, ${spawnY})`);
      }
      return;
    }

    // Création réelle du joueur seulement si absent
    if (this.playerManager) {
      this.playerManager.createPlayer(sessionId, spawnX, spawnY);
      this.playerSpawnInitialized = true;
      console.log(`[${this.scene.key}] ✅ Nouveau joueur spawn à (${spawnX}, ${spawnY})`);
    } else {
      console.warn(`[${this.scene.key}] ⚠️ PlayerManager manquant, impossible de créer le joueur`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérification automatique de la caméra
checkCameraActivation() {
  if (this.cameraFollowing) return; // Déjà activée
  
  const myPlayer = this.playerManager?.getMyPlayer();
  
  if (myPlayer && this.cameraManager && !this.cameraFollowing) {
    console.log(`🎥 [${this.scene.key}] 🚀 Auto-activation caméra (timer)`);
    this.cameraManager.followPlayer(myPlayer);
    this.cameraFollowing = true;
    this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
    console.log(`✅ [${this.scene.key}] Caméra auto-activée !`);
  }
}
  
  // ✅ MÉTHODE MODIFIÉE: Demander la zone au serveur
  requestServerZone() {
    console.log(`📍 [${this.scene.key}] === DEMANDE ZONE AU SERVEUR ===`);
    
    if (!this.networkManager?.room) {
      console.error(`❌ [${this.scene.key}] Pas de connexion pour demander la zone`);
      return;
    }
    
    // Envoyer une demande de zone au serveur
    this.networkManager.room.send("requestCurrentZone", {
      sceneKey: this.scene.key,
      timestamp: Date.now()
    });
    
    console.log(`📤 [${this.scene.key}] Demande de zone envoyée au serveur`);
  }

  // ✅ MÉTHODE MODIFIÉE: Setup des handlers réseau avec spawn conditionnel
  setupNetworkHandlers() {
    if (!this.networkManager) return;

    console.log(`📡 [${this.scene.key}] Configuration handlers réseau...`);

    // ✅ Handler pour recevoir la zone officielle du serveur
    this.networkManager.onMessage("currentZone", (data) => {
      console.log(`📍 [${this.scene.key}] === ZONE REÇUE DU SERVEUR ===`);
      console.log(`🎯 Zone serveur: ${data.zone}`);
      console.log(`📊 Position serveur: (${data.x}, ${data.y})`);
      
      // ✅ APPLIQUER LA VÉRITÉ DU SERVEUR
      const oldZone = this.zoneName;
      this.zoneName = data.zone;
      this.serverZoneConfirmed = true;
      
      console.log(`🔄 [${this.scene.key}] Zone mise à jour: ${oldZone} → ${this.zoneName}`);
      
      // ✅ Si la scène ne correspond pas à la zone serveur, correction
      const expectedScene = this.mapZoneToScene(this.zoneName);
      if (!this.isSceneStillValid(expectedScene)) {
        console.warn(`[${this.scene.key}] 🔄 Redirection nécessaire → ${expectedScene}`);
        
        // ✅ REDIRECTION AUTOMATIQUE vers la bonne scène
        this.redirectToCorrectScene(expectedScene, data);
        return;
      }
      
      // ✅ NOUVEAU: Initialiser le spawn seulement après confirmation de zone
      if (!this.playerSpawnInitialized) {
        console.log(`[${this.scene.key}] 🎯 Zone confirmée, initialisation spawn...`);
        this.initPlayerSpawnFromSceneData();
      }
      
      // ✅ Synchroniser le PlayerManager avec la zone confirmée
      if (this.playerManager) {
        this.playerManager.currentZone = this.zoneName;
        this.playerManager.forceResynchronization();
      }
      
      console.log(`✅ [${this.scene.key}] Zone serveur confirmée: ${this.zoneName}`);
    });

    // ✅ NOUVEAU: Handler pour confirmation de mon joueur
    this.networkManager.onMyPlayerConfirmed((playerData) => {
      console.log(`👤 [${this.scene.key}] === MON JOUEUR CONFIRMÉ ===`);
      console.log(`📊 Player data:`, playerData);
      
      // ✅ Créer le joueur avec les données serveur si pas encore fait
      if (!this.playerSpawnInitialized && this.playerManager) {
        console.log(`[${this.scene.key}] 🎯 Création joueur avec données serveur...`);
        
        const player = this.playerManager.createPlayer(
          this.mySessionId, 
          playerData.x, 
          playerData.y
        );
        
        if (player) {
          this.playerSpawnInitialized = true;
          
          // ✅ FORCER le suivi caméra immédiatement
          if (this.cameraManager && !this.cameraFollowing) {
            console.log(`[${this.scene.key}] 🎥 Activation suivi caméra forcé`);
            this.cameraManager.followPlayer(player);
            this.cameraFollowing = true;
          }
          
          console.log(`✅ [${this.scene.key}] Joueur créé et caméra activée`);
        }
      }
    });

    // ✅ Handler d'état avec protection
    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady || !this.networkSetupComplete) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête, ignoré`);
        return;
      }
      
      console.log(`📊 [${this.scene.key}] State reçu:`, {
        playersCount: state.players?.size || 0,
        isFiltered: !!state.players,
        type: state.players instanceof Map ? 'Map' : 'Object'
      });
      
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      // ✅ Synchroniser sessionId
      this.synchronizeSessionId();
      
      this.playerManager.updatePlayers(state);

      // ✅ Gestion du joueur local
      this.handleMyPlayerFromState();
    });

    // Handlers de zone WorldRoom
    this.setupWorldRoomHandlers();

    // Handlers existants
    this.setupExistingHandlers();

    // ✅ FORCER UNE PREMIÈRE SYNCHRONISATION
    this.time.delayedCall(500, () => {
      console.log(`🔄 [${this.scene.key}] Forcer synchronisation initiale...`);
      if (this.networkManager.room) {
        this.networkManager.room.send("requestInitialState", { 
          zone: this.networkManager.getCurrentZone() 
        });
      }
    });
  }

  // ✅ MÉTHODE EXISTANTE: Redirection vers la bonne scène
  redirectToCorrectScene(correctScene, serverData) {
    console.log(`🚀 [${this.scene.key}] === REDIRECTION AUTOMATIQUE ===`);
    console.log(`📍 Vers: ${correctScene}`);
    
    const transitionData = {
      fromZone: serverData.zone,
      fromTransition: true,
      networkManager: this.networkManager,
      mySessionId: this.mySessionId,
      spawnX: serverData.x,
      spawnY: serverData.y,
      serverForced: true,
      preservePlayer: true
    };
    
    if (window.showLoadingOverlay) window.showLoadingOverlay("Changement de zone...");
    this.scene.start(correctScene, transitionData);
  }

  // ✅ MÉTHODE EXISTANTE: Synchronisation sessionId
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

  // ✅ MÉTHODE MODIFIÉE: Gestion du joueur local avec spawn conditionnel
handleMyPlayerFromState() {
  if (this.myPlayerReady) return;

  // ✅ D'abord essayer de créer le joueur si pas encore fait
  if (!this.playerSpawnInitialized) {
    console.log(`[${this.scene.key}] 🎯 Tentative création joueur depuis state...`);
    this.initPlayerSpawnFromSceneData();
  }

  let myPlayer = this.playerManager.getMyPlayer();

  // ✅ PATCH : recréer le joueur si toujours manquant
  if (!myPlayer && !this.playerSpawnInitialized) {
    console.warn(`[${this.scene.key}] ⚠️ Joueur local toujours manquant, tentative de création manuelle`);
    const playerState = this.networkManager.getPlayerState(this.mySessionId);
    if (playerState) {
      myPlayer = this.playerManager.createPlayer(
        this.mySessionId,
        playerState.x,
        playerState.y
      );
      if (myPlayer) {
        this.playerSpawnInitialized = true;
        console.log(`[${this.scene.key}] ✅ Joueur recréé manuellement à (${myPlayer.x}, ${myPlayer.y})`);
      }
    } else {
      console.warn(`[${this.scene.key}] ⚠️ playerState introuvable pour ${this.mySessionId}`);
    }
  }
}

  // ✅ Maintenant que le joueur est là, on poursuit
  if (myPlayer && !this.myPlayerReady) {
    this.myPlayerReady = true;
    console.log(`✅ [${this.scene.key}] Joueur local trouvé: ${this.mySessionId}`);
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();

    // ✅ DEBUG CAMÉRA
    console.log(`🎥 [${this.scene.key}] Debug caméra:`, {
      cameraManager: !!this.cameraManager,
      cameraFollowing: this.cameraFollowing,
      playerX: myPlayer.x,
      playerY: myPlayer.y
    });

    if (!this.cameraFollowing && this.cameraManager) {
      console.log(`[${this.scene.key}] 🎥 FORCER suivi caméra depuis state`);
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
    } else if (this.cameraFollowing && this.cameraManager && this.cameraManager.target !== myPlayer) {
      console.log(`[${this.scene.key}] 🔧 Correction cible caméra`);
      this.cameraManager.followPlayer(myPlayer);
      this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
    }

    if (!myPlayer.visible) {
      console.log(`🔧 [${this.scene.key}] Forcer visibilité joueur local`);
      myPlayer.setVisible(true);
      myPlayer.setActive(true);
    }

    this.positionPlayer(myPlayer);

    if (typeof this.onPlayerReady === 'function') {
      this.onPlayerReady(myPlayer);
    }
  }
}

    
// ✅ FORCER le suivi caméra ABSOLUMENT
if (!this.cameraFollowing && this.cameraManager) {
  console.log(`[${this.scene.key}] 🎥 FORCER suivi caméra depuis state`);
  this.cameraManager.followPlayer(myPlayer);
  this.cameraFollowing = true;
  
  // ✅ SNAP IMMÉDIAT de la caméra
  this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
  console.log(`[${this.scene.key}] 🎥 Caméra activée et centrée !`);
} else if (this.cameraFollowing && this.cameraManager && this.cameraManager.target !== myPlayer) {
  // ✅ CORRECTION: Si la caméra suit déjà mais pas le bon joueur
  console.log(`[${this.scene.key}] 🔧 Correction cible caméra`);
  this.cameraManager.followPlayer(myPlayer);
  this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
}
      
      // ✅ S'assurer que le joueur est visible
      if (!myPlayer.visible) {
        console.log(`🔧 [${this.scene.key}] Forcer visibilité joueur local`);
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
      }
      
      // ✅ FORCER le suivi caméra
      if (!this.cameraFollowing) {
        console.log(`[${this.scene.key}] 🎥 Activation suivi caméra depuis state`);
        this.cameraManager.followPlayer(myPlayer);
        this.cameraFollowing = true;
      }
      
      this.positionPlayer(myPlayer);
      
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    }
  }

  // ✅ MÉTHODE EXISTANTE: Setup des handlers WorldRoom
  setupWorldRoomHandlers() {
    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] NPCs reçus: ${npcs.length}`);
      
      const currentSceneZone = this.normalizeZoneName(this.scene.key);
      const serverZone = this.networkManager.currentZone;
      
      console.log(`🔍 [${this.scene.key}] Comparaison zones: scene="${currentSceneZone}" vs server="${serverZone}"`);
      
      const isCorrectZone = currentSceneZone === serverZone;
      const isRecentTransition = Date.now() - (this._lastTransitionTime || 0) < 3000;
      
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

  // ✅ MÉTHODE EXISTANTE: Setup des handlers existants
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

  // ✅ MÉTHODE EXISTANTE: Initialisation du système d'inventaire
  initializeInventorySystem() {
    if (window.inventorySystem) {
      console.log(`[${this.scene.key}] Réutilisation de l'inventaire global existant`);
      if (this.networkManager?.room) {
        window.inventorySystem.gameRoom = this.networkManager.room;
        window.inventorySystem.setupServerListeners();
      }
      this.inventorySystem = window.inventorySystem;
      this.inventoryInitialized = true;
      return;
    }

    try {
      console.log(`🎒 [${this.scene.key}] Initialisation du système d'inventaire...`);
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);

      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }

      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;

      this.setupInventoryEventHandlers();

      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }

      this.inventoryInitialized = true;
      console.log(`✅ [${this.scene.key}] Système d'inventaire initialisé`);

      this.time.delayedCall(2000, () => {
        this.testInventoryConnection();
      });

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation inventaire:`, error);
    }
  }

  // ✅ MÉTHODE EXISTANTE: Test de connexion inventaire
  testInventoryConnection() {
    if (!this.inventorySystem || !this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Cannot test inventory: no system or room`);
      return;
    }

    console.log(`🧪 [${this.scene.key}] Test de connexion inventaire...`);
    this.inventorySystem.requestInventoryData();
  }
  
  setupInventoryEventHandlers() { }
  
  // ✅ MÉTHODE EXISTANTE: Initialisation du système de quêtes
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

  // ✅ MÉTHODE MODIFIÉE: Setup du handler joueur prêt avec meilleur timing
  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`✅ [${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

        // ✅ FORCER ABSOLUMENT le suivi caméra
        if (!this.cameraFollowing) {
          console.log(`[${this.scene.key}] 🎥 FORCER suivi caméra depuis callback`);
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
        }
        
        this.positionPlayer(myPlayer);

        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(myPlayer);
        }
      }
    });
  }

  // ✅ MÉTHODE EXISTANTE: Vérification de l'état réseau
  verifyNetworkState() {
    if (!this.networkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager manquant`);
      return;
    }
    
    console.log(`🔍 [${this.scene.key}] Vérification état réseau...`);
    
    this.networkManager.debugState();
    this.networkManager.checkZoneSynchronization(this.scene.key);
    
    if (this.playerManager) {
      this.time.delayedCall(500, () => {
        this.playerManager.forceResynchronization();
      });
    }
  }

  // ✅ MÉTHODE EXISTANTE: Position du joueur avec données de transition
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    console.log(`📍 [${this.scene.key}] Positionnement joueur...`);
    console.log(`📊 InitData:`, initData);
    
    if (initData?.fromTransition && player.x && player.y) {
      console.log(`📍 Position serveur conservée: (${player.x}, ${player.y})`);
      return;
    }
    
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

    if (this.networkManager && this.networkManager.isConnected) {
      this.networkManager.sendMove(player.x, player.y, 'down', false);
    }

    this.onPlayerPositioned(player, initData);
  }

  // ✅ MÉTHODE EXISTANTE: Affichage d'état d'erreur
  showErrorState(message) {
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();

    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    
    this.time.delayedCall(5000, () => {
      if (!this.networkSetupComplete) {
        console.log(`🔄 [${this.scene.key}] Tentative de reconnexion...`);
        this.initializeWithExistingConnection();
      }
    });
  }

  // ✅ MÉTHODE EXISTANTE: Mise à jour du texte d'info
  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  // ✅ Reste des méthodes existantes inchangées...
  update() {
    TransitionIntegration.updateTransitions(this);
    
    if (this.time.now % 1000 < 16) {
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

  isSceneStillValid(expectedScene) {
    return this.scene && this.scene.key === expectedScene && this.scene.isActive();
  }
  
  cleanup() {
    TransitionIntegration.cleanupTransitions(this);

    // ✅ Stoppe cette scène pour éviter qu'elle reste active
    if (this.scene.isActive(this.scene.key)) {
      this.scene.stop(this.scene.key);
      console.log(`[${this.scene.key}] ⛔ Scene stoppée (cleanup)`);
    }

    // ✅ Désactive les écouteurs de messages réseau
    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("currentZone");
      this.networkManager.room.removeAllListeners("snap");
      this.networkManager.room.removeAllListeners("questStatuses");
      console.log(`[${this.scene.key}] 🎧 Nettoyage des écouteurs réseau`);
    }
    console.log(`🧹 [${this.scene.key}] Nettoyage optimisé...`);

    const isTransition = this.networkManager && this.networkManager.isTransitionActive;
    
    if (!isTransition) {
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
    } else {
      console.log(`🔄 [${this.scene.key}] Nettoyage léger pour transition`);
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }

    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.playerSpawnInitialized = false;
    this.isSceneReady = false;
    this.networkSetupComplete = false;
    
    console.log(`✅ [${this.scene.key}] Nettoyage terminé`);
  }

  setupCleanupHandlers() {
    this.events.on('shutdown', () => {
      console.log(`📤 [${this.scene.key}] Shutdown - nettoyage`);
      this.cleanup();
    });
    
    this.events.on('destroy', () => {
      console.log(`💀 [${this.scene.key}] Destroy - nettoyage final`);
      this.cleanup();
    });
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
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          direction || this.lastDirection,
          moved
        );
        this.lastMoveTime = now;
      }
    }
  }

  // === MÉTHODES UTILITAIRES CONSERVÉES ===

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
    return mapping[zoneName.toLowerCase()] || zoneName;
  }

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

    // ✅ Interaction E avec vérifications complètes
    this.input.keyboard.on("keydown-E", () => {
      // Vérifier si un dialogue de quête est ouvert
      if (window._questDialogActive) {
        console.log("⚠️ Fenêtre de quête ouverte, interaction E bloquée");
        return;
      }
      
      // Vérifier si le chat a le focus
      if (typeof window.isChatFocused === "function" && window.isChatFocused()) {
        console.log("⚠️ Chat ouvert, interaction E bloquée");
        return;
      }
      
      // Vérifier si un dialogue NPC est ouvert
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display !== 'none') {
        console.log("⚠️ Dialogue NPC ouvert, interaction avec environnement bloquée");
        return;
      }
      
      // Vérifier si l'inventaire est ouvert
      if (typeof window.isInventoryOpen === "function" && window.isInventoryOpen()) {
        console.log("⚠️ Inventaire ouvert, interaction E bloquée");
        return;
      }

      // Vérifier si le shop est ouvert
      if (this.isShopOpen()) {
        console.log("⚠️ Shop ouvert, interaction E bloquée");
        return;
      }

      const myPlayer = this.playerManager.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;

      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        console.log(`🎯 Interaction avec NPC: ${npc.name}`);
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager.sendNpcInteract(npc.id);
      } else {
        console.log("ℹ️ Aucun NPC à proximité pour interagir");
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

  // ✅ Gestion améliorée des interactions NPC avec shop
  handleNpcInteraction(result) {
    console.log("🟢 [npcInteractionResult] Reçu :", result);

    if (window._questDialogActive) {
      console.log("⚠️ Fenêtre de quête déjà ouverte, interaction ignorée");
      return;
    }

    // ✅ Gestion des shops via ShopIntegration
    if (result.type === "shop") {
      if (this.shopIntegration && this.shopIntegration.getShopSystem()) {
        console.log(`🏪 [${this.scene.key}] Délégation shop à ShopIntegration`);
        this.shopIntegration.handleShopNpcInteraction(result);
        return;
      }
      
      // Fallback si pas d'intégration
      console.warn(`⚠️ [${this.scene.key}] Shop reçu mais pas d'intégration shop`);
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: result.portrait || "assets/ui/shop_icon.png",
          name: "Shop",
          text: "Ouverture du shop: " + result.shopId
        });
      }
      return;
    }
    
    if (result.type === "dialogue") {
      let npcName = "???";
      let spriteName = null;
      let portrait = result.portrait;
      if (result.npcId && this.npcManager) {
        console.log("🐛 DEBUG: result.npcId =", result.npcId);
        console.log("🐛 DEBUG: NPCs disponibles:", this.npcManager.getAllNpcs().map(n => ({id: n.id, name: n.name})));
        
        const npc = this.npcManager.getNpcData(result.npcId);
        console.log("🐛 DEBUG: NPC trouvé =", npc);
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
      console.warn(`[${this.scene.key}] Joueur manquant! Tentative de récupération...`);
      
      if (this.playerManager && this.mySessionId) {
        console.log(`🔧 [${this.scene.key}] Tentative de resynchronisation...`);
        this.playerManager.forceResynchronization();
      }
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
    
    if (myPlayer.depth !== 5) {
      myPlayer.setDepth(5);
      fixed = true;
    }
    
    if (myPlayer.indicator) {
      if (!myPlayer.indicator.visible) {
        console.warn(`[${this.scene.key}] Indicateur invisible, restauration`);
        myPlayer.indicator.setVisible(true);
        fixed = true;
      }
      
      if (Math.abs(myPlayer.indicator.x - myPlayer.x) > 1 || 
          Math.abs(myPlayer.indicator.y - (myPlayer.y - 24)) > 1) {
        myPlayer.indicator.x = myPlayer.x;
        myPlayer.indicator.y = myPlayer.y - 24;
        fixed = true;
      }
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
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : '#44ff44',
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

  // ✅ Méthodes utilitaires pour l'accès au système shop
  getShopSystem() {
    return this.shopIntegration?.getShopSystem() || null;
  }

  // Ajoute cette méthode dans BaseZoneScene.js
forceActivateCamera() {
  const myPlayer = this.playerManager?.getMyPlayer();
  
  console.log(`🎥 [${this.scene.key}] === FORCE ACTIVATION CAMÉRA ===`);
  console.log(`- Player exists: ${!!myPlayer}`);
  console.log(`- CameraManager exists: ${!!this.cameraManager}`);
  console.log(`- CameraFollowing: ${this.cameraFollowing}`);
  
  if (myPlayer && this.cameraManager && !this.cameraFollowing) {
    console.log(`🎥 [${this.scene.key}] 🚀 ACTIVATION CAMÉRA FORCÉE`);
    this.cameraManager.followPlayer(myPlayer);
    this.cameraFollowing = true;
    
    // Snap la caméra immédiatement
    this.cameras.main.centerOn(myPlayer.x, myPlayer.y);
    console.log(`✅ [${this.scene.key}] Caméra activée et centrée !`);
  }
}
  
  isShopOpen() {
    return this.shopIntegration?.getShopSystem()?.isShopOpen() || false;
  }

  debugShop() {
    if (this.shopIntegration) {
      this.shopIntegration.debugShopState();
    } else {
      console.log(`🔍 [${this.scene.key}] Aucune intégration shop`);
    }
  }
}
