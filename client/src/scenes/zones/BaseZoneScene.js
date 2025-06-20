// client/src/scenes/zones/BaseZoneScene.js - VERSION WORLDROOM CORRIGÉE
// ✅ Corrections pour la synchronisation et les transitions fluides

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
    
    // ✅ NOUVEAU : Gestion des états de transition
    this.transitionState = {
      isInProgress: false,
      targetZone: null,
      startTime: 0,
      maxDuration: 10000 // 10 secondes max
    };
    
    // ✅ NOUVEAU : Zone mapping et état
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
  
  // ✅ NOUVEAU: Vérifier immédiatement l'état du réseau
  this.verifyNetworkState();
  
  // ✅ AJOUT: Correction de la désynchronisation de zone
  this.time.delayedCall(200, () => {
    if (!this.networkManager.checkZoneSynchronization(this.scene.key)) {
      console.log(`🔄 [${this.scene.key}] Correction désynchronisation détectée`);
      this.networkManager.forceZoneSynchronization(this.scene.key);
    }
  });
  
  // ❌ SUPPRIMER CETTE PARTIE QUI FAIT PLANTER :
  /*
  this.time.delayedCall(400, () => {
    if (this.networkManager && this.networkManager.isConnected) {
      console.log(`🔄 [${this.scene.key}] Demande explicite des NPCs de zone`);
      
      // Forcer une demande de zone data pour récupérer les NPCs
      this.networkManager.room?.send("requestZoneData", { 
        zone: this.networkManager.currentZone 
      });
    }
  });
  */
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
      
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!`);

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
  
  // ✅ CORRECTION: Enlever "scene" du nom
  const sceneZone = this.scene.key.toLowerCase().replace('scene', '');
  
  if (this.networkManager.currentZone !== sceneZone) {
    console.log(`🚫 [${this.scene.key}] NPCs ignorés: zone serveur=${this.networkManager.currentZone} ≠ scène=${sceneZone}`);
    return;
  }
  
  if (this.npcManager && npcs.length > 0) {
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
    
    const targetScene = this.mapZoneToScene(result.currentZone);
    
    if (targetScene === this.scene.key) {
      // Même scène, juste repositionner
      console.log(`📍 [${this.scene.key}] Repositionnement dans la même scène`);
      this.repositionPlayerAfterTransition(result);
    } else {
      // Changement de scène
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
      preservePlayer: true // ✅ NOUVEAU: Flag pour préserver le joueur
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
    
    // ✅ IMPORTANT: NE PAS nettoyer le PlayerManager ni le NetworkManager
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

  // ✅ AMÉLIORATION: Nettoyage optimisé
  cleanup() {
    console.log(`🧹 [${this.scene.key}] Nettoyage optimisé...`);

    // ✅ NOUVEAU: Nettoyage conditionnel selon le type de fermeture
    const isTransition = this.networkManager && this.networkManager.isTransitionActive;
    
    if (!isTransition) {
      // Nettoyage complet seulement si ce n'est pas une transition
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
    } else {
      // En transition, préserver les données critiques
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
    this.isSceneReady = false;
    this.networkSetupComplete = false;
    
    console.log(`✅ [${this.scene.key}] Nettoyage terminé`);
  }

  // ✅ AMÉLIORATION: Setup des handlers de nettoyage
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

  // ✅ AMÉLIORATION: Gestion du mouvement avec désactivation du délai de grâce
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
}
