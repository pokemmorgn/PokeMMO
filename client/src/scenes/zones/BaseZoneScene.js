// client/src/scenes/zones/BaseZoneScene.js - VERSION AVEC INTERACTIONMANAGER ET SYSTÈME DE CHARGEMENT JOUEUR
// ✅ Utilise la connexion établie dans main.js et délègue les interactions à InteractionManager
// ✅ Système d'écran de chargement pour la préparation du joueur

import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { InteractionManager } from "../../game/InteractionManager.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";
import { DayNightManager } from '../../game/DayNightManager.js';
import { ClientCollisionManager } from "../../game/ClientCollisionsManager.js";

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

    // Grace period pour éviter les transitions involontaires
    this.justArrivedAtZone = false;

    // ✅ NOUVEAU: InteractionManager au lieu de ShopIntegration direct
    this.interactionManager = null;

    // ✅ NOUVEAU: Système d'écran de chargement joueur
    this.playerLoadingOverlay = null;
    this.playerLoadingText = null;
    this.playerLoadingProgress = null;
    this.isPlayerLoading = false;
    this.playerLoadingSteps = [
      "Connexion au serveur...",
      "Chargement des données joueur...",
      "Positionnement du personnage...",
      "Configuration de la caméra...",
      "Finalisation..."
    ];
    this.currentLoadingStep = 0;
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
    this.initPlayerSpawnFromSceneData();
    this.justArrivedAtZone = true;
    this.time.delayedCall(500, () => { this.justArrivedAtZone = false; });

    this.loadMap();
    this.setupInputs();
    this.createUI();
    this.dayNightManager = new DayNightManager(this);
    this.myPlayerReady = false;
    this.isSceneReady = true;

    // ✅ CRÉER L'ÉCRAN DE CHARGEMENT JOUEUR
    this.createPlayerLoadingOverlay();

    // ✅ UTILISER LA CONNEXION EXISTANTE AU LIEU DE CRÉER UNE NOUVELLE
    this.initializeWithExistingConnection();

    this.setupPlayerReadyHandler();
    this.setupCleanupHandlers();

    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
  }

  // ✅ NOUVELLE MÉTHODE: Création de l'écran de chargement joueur
  createPlayerLoadingOverlay() {
    console.log(`🎨 [${this.scene.key}] Création de l'écran de chargement joueur...`);

    // Arrière-plan semi-transparent
    this.playerLoadingOverlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setScrollFactor(0).setDepth(9999).setVisible(false);

    // Texte de chargement principal
    this.playerLoadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'Préparation du personnage...',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(10000).setVisible(false);

    // Texte de progression détaillée
    this.playerLoadingProgress = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20,
      '',
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#cccccc',
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(10000).setVisible(false);

    // Animation de points de chargement
    this.playerLoadingDots = '';
    this.playerLoadingTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        if (this.isPlayerLoading) {
          this.playerLoadingDots = this.playerLoadingDots.length >= 3 ? '' : this.playerLoadingDots + '.';
          if (this.playerLoadingText && this.playerLoadingText.active) {
            this.playerLoadingText.setText('Préparation du personnage' + this.playerLoadingDots);
          }
        }
      },
      loop: true
    });

    console.log(`✅ [${this.scene.key}] Écran de chargement joueur créé`);
  }

  // ✅ NOUVELLE MÉTHODE: Afficher l'écran de chargement joueur
  showPlayerLoading() {
    console.log(`📱 [${this.scene.key}] === AFFICHAGE ÉCRAN CHARGEMENT JOUEUR ===`);
    
    this.isPlayerLoading = true;
    this.currentLoadingStep = 0;

    // Masquer l'overlay de chargement global s'il est encore visible
    if (window.hideLoadingOverlay) {
      window.hideLoadingOverlay();
    }

    // Afficher l'écran de chargement joueur
    if (this.playerLoadingOverlay) this.playerLoadingOverlay.setVisible(true);
    if (this.playerLoadingText) this.playerLoadingText.setVisible(true);
    if (this.playerLoadingProgress) this.playerLoadingProgress.setVisible(true);

    this.updatePlayerLoadingStep(0);

    console.log(`✅ [${this.scene.key}] Écran de chargement joueur affiché`);
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour l'étape de chargement
  updatePlayerLoadingStep(stepIndex) {
    if (stepIndex >= this.playerLoadingSteps.length) return;

    this.currentLoadingStep = stepIndex;
    const stepText = this.playerLoadingSteps[stepIndex];
    
    console.log(`📊 [${this.scene.key}] Étape de chargement: ${stepIndex + 1}/${this.playerLoadingSteps.length} - ${stepText}`);
    
    if (this.playerLoadingProgress && this.playerLoadingProgress.active) {
      this.playerLoadingProgress.setText(`${stepText} (${stepIndex + 1}/${this.playerLoadingSteps.length})`);
    }

    // Animation de transition entre les étapes
    if (this.playerLoadingProgress && this.playerLoadingProgress.active) {
      this.tweens.add({
        targets: this.playerLoadingProgress,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Masquer l'écran de chargement joueur
  hidePlayerLoading() {
    console.log(`📱 [${this.scene.key}] === MASQUAGE ÉCRAN CHARGEMENT JOUEUR ===`);
    
    this.isPlayerLoading = false;

    // Animation de fondu sortant
    const hideElements = [this.playerLoadingOverlay, this.playerLoadingText, this.playerLoadingProgress];
    
    hideElements.forEach(element => {
      if (element && element.active) {
        this.tweens.add({
          targets: element,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => {
            if (element && element.active) {
              element.setVisible(false);
              element.setAlpha(1); // Réinitialiser l'alpha pour la prochaine fois
            }
          }
        });
      }
    });

    // Arrêter le timer d'animation des points
    if (this.playerLoadingTimer) {
      this.playerLoadingTimer.destroy();
      this.playerLoadingTimer = null;
    }

    console.log(`✅ [${this.scene.key}] Écran de chargement joueur masqué`);
  }

  // ✅ MÉTHODE INCHANGÉE: Utiliser la connexion existante
  initializeWithExistingConnection() {
    console.log(`📡 [${this.scene.key}] === UTILISATION CONNEXION EXISTANTE ===`);
    
    if (!window.globalNetworkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager global manquant!`);
      this.showErrorState("NetworkManager global introuvable");
      return;
    }

    if (!window.globalNetworkManager.isConnected) {
      console.error(`❌ [${this.scene.key}] NetworkManager global non connecté!`);
      this.showErrorState("Connexion réseau inactive");
      return;
    }

    this.networkManager = window.globalNetworkManager;
    this.mySessionId = this.networkManager.getSessionId();

    console.log(`✅ [${this.scene.key}] NetworkManager récupéré:`, {
      sessionId: this.mySessionId,
      isConnected: this.networkManager.isConnected,
      currentZone: this.networkManager.getCurrentZone()
    });

    this.setupNetworkHandlers();
    this.networkSetupComplete = true;

    // ✅ Initialiser les systèmes de jeu
    this.initializeGameSystems();

    this.requestServerZone();
    this.verifyNetworkState();

    // CRITIQUE : Toujours refaire le setup après toute nouvelle room !
    if (this.networkManager && this.networkManager.room) {
      this.networkManager.setupRoomListeners();
      this.networkManager.restoreCustomCallbacks?.();
    }

    this.setupNetworkHandlers();
    this.networkSetupComplete = true;
  }

  // ✅ MÉTHODE MODIFIÉE: Initialiser tous les systèmes avec InteractionManager
  initializeGameSystems() {
    console.log(`🎮 [${this.scene.key}] Initialisation des systèmes de jeu...`);

    // Inventaire
    this.initializeInventorySystem();
    
    // ✅ NOUVEAU: Initialiser InteractionManager au lieu de ShopIntegration directement
    this.initializeInteractionManager();
    
    // Quêtes (sera initialisé après connexion)
    this.initializeQuestSystem();

    console.log(`✅ [${this.scene.key}] Systèmes de jeu initialisés`);
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation de l'InteractionManager
  initializeInteractionManager() {
    if (!this.networkManager) {
      console.warn(`⚠️ [${this.scene.key}] Pas de NetworkManager pour InteractionManager`);
      return;
    }

    try {
      console.log(`🎯 [${this.scene.key}] === INITIALISATION INTERACTION MANAGER ===`);

      // Créer l'InteractionManager
      this.interactionManager = new InteractionManager(this);

      // L'initialiser avec les managers requis
      this.interactionManager.initialize(
        this.networkManager,
        this.playerManager,
        this.npcManager
      );

      console.log(`✅ [${this.scene.key}] InteractionManager initialisé avec succès`);

      // ✅ Intégrer le shop via l'InteractionManager
      integrateShopToScene(this, this.networkManager);

      console.log(`✅ [${this.scene.key}] Shop intégré via InteractionManager`);

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation InteractionManager:`, error);
    }
  }

  onPlayerReady(player) {
    // Hook vide par défaut. Sera utilisé si défini dans une scène spécifique.
    console.log(`[${this.scene.key}] ✅ onPlayerReady appelé pour ${player.sessionId}`);
    console.log(`[${this.scene.key}] ✅ Hook onPlayerReady déclenché pour`, player.sessionId);
  }
  
  initPlayerSpawnFromSceneData() {
    const data = this.scene.settings.data || {};
    const sessionId = this.mySessionId;
    let spawnX = 52, spawnY = 48;

    // Si transition de zone, coordonnées transmises
    if (typeof data.spawnX === 'number') spawnX = data.spawnX;
    if (typeof data.spawnY === 'number') spawnY = data.spawnY;

    // Création réelle du joueur (évite de doubler le joueur si déjà présent)
    if (this.playerManager && !this.playerManager.getMyPlayer()) {
      this.playerManager.createPlayer(sessionId, spawnX, spawnY);
      console.log(`[${this.scene.key}] Joueur spawn à (${spawnX}, ${spawnY})`);
    } else {
      console.log(`[${this.scene.key}] Joueur déjà présent ou playerManager manquant.`);
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Demander la zone au serveur
  requestServerZone() {
    console.log(`📍 [${this.scene.key}] === DEMANDE ZONE AU SERVEUR ===`);
    
    if (!this.networkManager?.room) {
      console.error(`❌ [${this.scene.key}] Pas de connexion pour demander la zone`);
      return;
    }
    
    this.networkManager.room.send("requestCurrentZone", {
      sceneKey: this.scene.key,
      timestamp: Date.now()
    });
    
    console.log(`📤 [${this.scene.key}] Demande de zone envoyée au serveur`);
  }

  // ✅ MÉTHODE SIMPLIFIÉE: Setup des handlers réseau (InteractionManager gère les interactions)
  setupNetworkHandlers() {
    if (!this.networkManager) return;

    console.log(`📡 [${this.scene.key}] Configuration handlers réseau...`);

    // ✅ Handler pour recevoir la zone officielle du serveur
    this.networkManager.onMessage("currentZone", (data) => {
      console.log(`📍 [${this.scene.key}] === ZONE REÇUE DU SERVEUR ===`);
      console.log(`🎯 Zone serveur: ${data.zone}`);
      console.log(`📊 Position serveur: (${data.x}, ${data.y})`);
      
      const oldZone = this.zoneName;
      this.zoneName = data.zone;
      this.serverZoneConfirmed = true;
      
      console.log(`🔄 [${this.scene.key}] Zone mise à jour: ${oldZone} → ${this.zoneName}`);
      
       const expectedScene = this.mapZoneToScene(data.zone); // Utilise le nom reçu, pas this.zoneName !
  // Comparaison stricte :
  if (this.scene.key !== expectedScene) {
    console.warn(`[${this.scene.key}] 🔄 Redirection nécessaire → ${expectedScene}`);
    this.redirectToCorrectScene(expectedScene, data);
    return;
  }
      
      if (this.playerManager) {
        this.playerManager.currentZone = this.zoneName;
        this.playerManager.forceResynchronization();
      }
      
      console.log(`✅ [${this.scene.key}] Zone serveur confirmée: ${this.zoneName}`);
    });

    // ✅ Handler d'état avec protection
    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady || !this.networkSetupComplete) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête, ignoré`);
        return;
      }
      
      
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      this.synchronizeSessionId();
      
      this.playerManager.updatePlayers(state);
      this.handleMyPlayerFromState();
    });

    // ✅ SUPPRIMÉ: Les handlers d'interaction NPC - maintenant gérés par InteractionManager
    // L'InteractionManager configure ses propres handlers réseau dans sa méthode setupNetworkHandlers()
    
    // Handlers de zone WorldRoom
    this.setupWorldRoomHandlers();
    
    // Handler pour les quest statuses
    this.setupQuestStatusHandler();
    
    // Handlers existants (snap, disconnect)
    this.setupExistingHandlers();

    // Forcer une première synchronisation
    this.time.delayedCall(500, () => {
      console.log(`🔄 [${this.scene.key}] Forcer synchronisation initiale...`);
      if (this.networkManager.room) {
        this.networkManager.room.send("requestInitialState", { 
          zone: this.networkManager.getCurrentZone() 
        });
      }
    });
  }

  // ✅ MÉTHODE INCHANGÉE: Redirection vers la bonne scène
  redirectToCorrectScene(correctScene, serverData) {
    console.warn('=== [DEBUG] REDIRECTION SCENE ===');
    console.warn('FROM:', this.scene.key, 'TO:', correctScene);
    console.warn('serverData:', serverData);

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

    console.warn('[DEBUG] SCENE.START called', {
      fromScene: this.scene.key,
      toScene: correctScene,
      transitionData
    });
    console.trace();

    this.scene.start(correctScene, transitionData);

    setTimeout(() => {
      console.warn('[DEBUG] APRES SCENE.START', {
        activeScenes: Object.keys(this.scene.manager.keys).filter(k => this.scene.manager.isActive(k)),
        currentScene: this.scene.key
      });
    }, 500);
  }

  // ✅ MÉTHODE INCHANGÉE: Synchronisation sessionId
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

  // ✅ MÉTHODE INCHANGÉE: Gestion du joueur local depuis le state
  handleMyPlayerFromState() {
    if (this.myPlayerReady) return;
    
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      console.log(`✅ [${this.scene.key}] Joueur local trouvé: ${this.mySessionId}`);
      if (window.hideLoadingOverlay) window.hideLoadingOverlay();

      if (!myPlayer.visible) {
        console.log(`🔧 [${this.scene.key}] Forcer visibilité joueur local`);
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
      }
      
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.positionPlayer(myPlayer);
      
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Setup des handlers WorldRoom
  setupWorldRoomHandlers() {
    console.log(`📡 [${this.scene.key}] === SETUP WORLD ROOM HANDLERS ===`);
    console.log(`📊 NetworkManager existe: ${!!this.networkManager}`);
    console.log(`🤖 NpcManager existe: ${!!this.npcManager}`);

    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] === HANDLER NPCS APPELÉ ===`);
      console.log(`📊 NPCs reçus: ${npcs.length}`);
      console.log(`🎭 NpcManager existe: ${!!this.npcManager}`);
      
      if (!this.npcManager) {
        console.error(`❌ [${this.scene.key}] NpcManager MANQUANT !`);
        return;
      }
      
      if (!npcs || npcs.length === 0) {
        console.log(`ℹ️ [${this.scene.key}] Aucun NPC à spawner`);
        return;
      }
      
      console.log(`✅ [${this.scene.key}] APPEL spawnNpcs() avec ${npcs.length} NPCs`);
      this.npcManager.spawnNpcs(npcs);
      console.log(`✅ [${this.scene.key}] spawnNpcs() terminé`);
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ [${this.scene.key}] Transition réussie:`, result);
      
      const targetScene = this.mapZoneToScene(result.currentZone || result.zone || result.targetZone);
      console.log(`[Transition] Scene active: ${this.scene.key} | Scene cible: ${targetScene}`);
      
      if (this.scene.key !== targetScene) {
        console.warn(`[Transition] Redirection auto vers ${targetScene}`);
        this.scene.start(targetScene, {
          fromZone: this.zoneName,
          fromTransition: true,
          networkManager: this.networkManager,
          mySessionId: this.mySessionId,
          spawnX: result.position?.x,
          spawnY: result.position?.y,
          preservePlayer: true
        });
      } else {
        if (typeof this.positionPlayer === "function" && result.position) {
          const myPlayer = this.playerManager?.getMyPlayer();
          if (myPlayer) {
            myPlayer.x = result.position.x;
            myPlayer.y = result.position.y;
            myPlayer.targetX = result.position.x;
            myPlayer.targetY = result.position.y;
            this.cameraManager?.snapToPlayer?.();
          }
        }
      }
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}] Transition échouée:`, result);
      this.handleTransitionError(result);
    });

    // ✅ SUPPRIMÉ: onNpcInteraction handler - maintenant géré par InteractionManager

    console.log(`✅ [${this.scene.key}] Tous les handlers WorldRoom configurés`);
  }

  // ✅ MÉTHODE INCHANGÉE: Setup handler quest statuses
  setupQuestStatusHandler() {
    console.log(`🎯 [${this.scene.key}] Configuration handler quest statuses...`);
    
    this.networkManager.onMessage("questStatuses", (data) => {
      console.log(`🎯 [${this.scene.key}] Quest statuses reçus:`, data);
      
      if (this.npcManager && data.questStatuses && data.questStatuses.length > 0) {
        console.log(`✅ [${this.scene.key}] Mise à jour des indicateurs de quête`);
        
        data.questStatuses.forEach(status => {
          console.log(`  🔸 NPC ${status.npcId}: ${status.type}`);
        });
        
        this.npcManager.updateQuestIndicators(data.questStatuses);
      } else {
        console.log(`⚠️ [${this.scene.key}] Pas d'indicateurs à mettre à jour`);
      }
    });
    
    console.log(`✅ [${this.scene.key}] Handler quest statuses configuré`);
  }
  
  // ✅ MÉTHODE INCHANGÉE: Setup des handlers existants
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

  // ✅ MÉTHODE INCHANGÉE: Initialisation du système d'inventaire
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

  testInventoryConnection() {
    if (!this.inventorySystem || !this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Cannot test inventory: no system or room`);
      return;
    }

    console.log(`🧪 [${this.scene.key}] Test de connexion inventaire...`);
    this.inventorySystem.requestInventoryData();
  }
  
  setupInventoryEventHandlers() { }
  
  // ✅ MÉTHODE INCHANGÉE: Initialisation du système de quêtes
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

  // ✅ MÉTHODE MODIFIÉE: Setup du handler joueur prêt avec système de chargement
  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        console.log(`🎬 [${this.scene.key}] === DÉMARRAGE PRÉPARATION JOUEUR ===`);
        
        // ✅ AFFICHER L'ÉCRAN DE CHARGEMENT JOUEUR
        this.showPlayerLoading();
        
        // ✅ SÉQUENCE DE PRÉPARATION AVEC ÉTAPES
        this.preparePlayerSequence(myPlayer);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Séquence de préparation du joueur avec étapes
  preparePlayerSequence(myPlayer) {
    console.log(`🎭 [${this.scene.key}] === SÉQUENCE PRÉPARATION JOUEUR ===`);
    
    let currentStep = 0;
    
    // Étape 1: Connexion au serveur (déjà fait)
    this.updatePlayerLoadingStep(currentStep++);
    
    this.time.delayedCall(300, () => {
      // Étape 2: Chargement des données joueur
      this.updatePlayerLoadingStep(currentStep++);
      
      this.time.delayedCall(400, () => {
        // Étape 3: Positionnement du personnage
        this.updatePlayerLoadingStep(currentStep++);
        this.positionPlayer(myPlayer);
        
        this.time.delayedCall(300, () => {
          // Étape 4: Configuration de la caméra
          this.updatePlayerLoadingStep(currentStep++);
          this.setupPlayerCamera(myPlayer);
          
          this.time.delayedCall(400, () => {
            // Étape 5: Finalisation
            this.updatePlayerLoadingStep(currentStep++);
            
            this.time.delayedCall(500, () => {
              // ✅ FINALISER LA PRÉPARATION
              this.finalizePlayerSetup(myPlayer);
            });
          });
        });
      });
    });
  }

  // ✅ NOUVELLE MÉTHODE: Configuration de la caméra du joueur
  setupPlayerCamera(myPlayer) {
    console.log(`📷 [${this.scene.key}] Configuration caméra pour le joueur...`);
    
    if (this.cameraManager) {
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      console.log(`✅ [${this.scene.key}] Caméra configurée immédiatement`);
    } else {
      console.warn(`⚠️ [${this.scene.key}] CameraManager pas encore prêt, attente...`);
      this.time.delayedCall(500, () => {
        if (this.cameraManager) {
          console.log(`🔄 [${this.scene.key}] CameraManager prêt, activation caméra`);
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
        } else {
          console.error(`❌ [${this.scene.key}] CameraManager toujours absent après 500ms`);
        }
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Finalisation de la configuration du joueur
  finalizePlayerSetup(myPlayer) {
    console.log(`🎉 [${this.scene.key}] === FINALISATION JOUEUR ===`);
    
    this.myPlayerReady = true;
    
    console.log(`✅ [${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

    // Assurer la visibilité du joueur
    if (!myPlayer.visible) {
      console.log(`🔧 [${this.scene.key}] Forcer visibilité joueur local`);
      myPlayer.setVisible(true);
      myPlayer.setActive(true);
    }

    // ✅ MASQUER L'ÉCRAN DE CHARGEMENT JOUEUR
    this.hidePlayerLoading();
    
    // Appeler le hook onPlayerReady si défini
    if (typeof this.onPlayerReady === 'function') {
      this.onPlayerReady(myPlayer);
    }
    
    console.log(`🎊 [${this.scene.key}] Joueur entièrement prêt et opérationnel !`);
  }

  // ✅ MÉTHODE INCHANGÉE: Vérification de l'état réseau
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

  // ✅ MÉTHODE INCHANGÉE: Position du joueur avec données de transition
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

  // ✅ MÉTHODE INCHANGÉE: Affichage d'état d'erreur
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

  // ✅ MÉTHODE INCHANGÉE: Mise à jour du texte d'info
  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Update principal
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
  
  // ✅ MÉTHODE MODIFIÉE: Cleanup avec InteractionManager et écran de chargement
  cleanup() {
    TransitionIntegration.cleanupTransitions(this);

    // ✅ Nettoyer l'écran de chargement joueur
    if (this.isPlayerLoading) {
      this.hidePlayerLoading();
    }
    
    if (this.playerLoadingTimer) {
      this.playerLoadingTimer.destroy();
      this.playerLoadingTimer = null;
    }

    if (this.scene.isActive(this.scene.key)) {
      this.scene.stop(this.scene.key);
      console.log(`[${this.scene.key}] ⛔ Scene stoppée (cleanup)`);
    }

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

    // ✅ NOUVEAU: Nettoyer l'InteractionManager
    if (this.interactionManager) {
      this.interactionManager.destroy();
      this.interactionManager = null;
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
    if (this.dayNightManager) {
      this.dayNightManager.destroy();
      this.dayNightManager = null;
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
    
    // ✅ Nettoyer les éléments de l'écran de chargement
    if (this.playerLoadingOverlay) {
      this.playerLoadingOverlay.destroy();
      this.playerLoadingOverlay = null;
    }
    if (this.playerLoadingText) {
      this.playerLoadingText.destroy();
      this.playerLoadingText = null;
    }
    if (this.playerLoadingProgress) {
      this.playerLoadingProgress.destroy();
      this.playerLoadingProgress = null;
    }
    
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

  // ✅ MÉTHODE INCHANGÉE: Gestion du mouvement
  handleMovement(myPlayerState) {
    const speed = 120;
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer) return;

    let vx = 0, vy = 0;
    let inputDetected = false, direction = null;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed; inputDetected = true; direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed; inputDetected = true; direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed; inputDetected = true; direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed; inputDetected = true; direction = 'down';
    }

    let actuallyMoving = inputDetected;

    if (inputDetected && this.clientCollisionManager) {
      const deltaTime = 1/60;
      const nextX = myPlayer.x + (vx * deltaTime);
      const nextY = myPlayer.y + (vy * deltaTime);
      
      const canMoveDiagonal = this.clientCollisionManager.canMoveTo(nextX, nextY);
      
      if (!canMoveDiagonal) {
        const canMoveX = (vx !== 0) ? this.clientCollisionManager.canMoveTo(nextX, myPlayer.y) : false;
        const canMoveY = (vy !== 0) ? this.clientCollisionManager.canMoveTo(myPlayer.x, nextY) : false;
        
        if (canMoveX && !canMoveY) {
          vy = 0;
          console.log(`🧱 [ClientCollision] Glissement horizontal`);
        } else if (canMoveY && !canMoveX) {
          vx = 0;
          console.log(`🧱 [ClientCollision] Glissement vertical`);
        } else {
          vx = 0;
          vy = 0;
          console.log(`🚫 [ClientCollision] Complètement bloqué`);
        }
      }
      
      actuallyMoving = (vx !== 0 || vy !== 0);
    }

    myPlayer.body.setVelocity(vx, vy);

    if (inputDetected && direction) {
      this.lastDirection = direction;
      
      if (actuallyMoving) {
        myPlayer.play(`walk_${direction}`, true);
        myPlayer.isMovingLocally = true;
      } else {
        myPlayer.play(`idle_${direction}`, true);
        myPlayer.isMovingLocally = false;
      }
    } else {
      myPlayer.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
    }

    if (inputDetected) {
      const now = Date.now();
      if (!this.lastMoveTime || now - this.lastMoveTime > 50) {
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          direction,
          actuallyMoving
        );
        this.lastMoveTime = now;
      }
    }
  }

  // === MÉTHODES UTILITAIRES CONSERVÉES ===

mapSceneToZone(sceneName) {
  const mapping = {
    // Zones existantes
    'BeachScene': 'beach',
    'VillageScene': 'village',
    'VillageLabScene': 'villagelab',
    'Road1Scene': 'road1',
    'VillageHouse1Scene': 'villagehouse1',
    'LavandiaScene': 'lavandia',
    
    // Zones Lavandia
    'LavandiaAnalysisScene': 'analysis',
    'LavandiaBossRoomScene': 'bossroom',
    'LavandiaCelibTempleScene': 'celibtemple',
    'LavandiaEquipementScene': 'equipement',
    'LavandiaFurnitureScene': 'furniture',
    'LavandiaHealingCenterScene': 'healingcenter',
    'LavandiaHouse1Scene': 'house1',
    'LavandiaHouse2Scene': 'house2',
    'LavandiaHouse3Scene': 'house3',
    'LavandiaHouse4Scene': 'house4',
    'LavandiaHouse5Scene': 'house5',
    'LavandiaHouse6Scene': 'house6',
    'LavandiaHouse7Scene': 'house7',
    'LavandiaHouse8Scene': 'house8',
    'LavandiaHouse9Scene': 'house9',
    'LavandiaResearchLabScene': 'researchlab',
    'LavandiaShopScene': 'shop',
    
    // Zones Village supplémentaires
    'VillageFloristScene': 'villageflorist',
    'VillageHouse2Scene': 'villagehouse2',
    
    // Zones Road
    'Road1HouseScene': 'road1house',
    'Road2Scene': 'road2',
    'Road3Scene': 'road3',
    
    // Zones Nocther Cave
    'NoctherCave1Scene': 'nocthercave1',
    'NoctherCave2Scene': 'nocthercave2',
    'NoctherCave2BisScene': 'nocthercave2bis'
  };
  return mapping[sceneName] || sceneName.toLowerCase();
}

mapZoneToScene(zoneName) {
  const mapping = {
    // Zones existantes
    'beach': 'BeachScene',
    'village': 'VillageScene',
    'villagelab': 'VillageLabScene',
    'road1': 'Road1Scene',
    'villagehouse1': 'VillageHouse1Scene',
    'lavandia': 'LavandiaScene',
    
    // Zones Lavandia
    'analysis': 'LavandiaAnalysisScene',
    'bossroom': 'LavandiaBossRoomScene',
    'celibtemple': 'LavandiaCelibTempleScene',
    'equipement': 'LavandiaEquipementScene',
    'furniture': 'LavandiaFurnitureScene',
    'healingcenter': 'LavandiaHealingCenterScene',
    'house1': 'LavandiaHouse1Scene',
    'house2': 'LavandiaHouse2Scene',
    'house3': 'LavandiaHouse3Scene',
    'house4': 'LavandiaHouse4Scene',
    'house5': 'LavandiaHouse5Scene',
    'house6': 'LavandiaHouse6Scene',
    'house7': 'LavandiaHouse7Scene',
    'house8': 'LavandiaHouse8Scene',
    'house9': 'LavandiaHouse9Scene',
    'researchlab': 'LavandiaResearchLabScene',
    'shop': 'LavandiaShopScene',
    
    // Zones Village supplémentaires
    'villageflorist': 'VillageFloristScene',
    'villagehouse2': 'VillageHouse2Scene',
    
    // Zones Road
    'road1house': 'Road1HouseScene',
    'road2': 'Road2Scene',
    'road3': 'Road3Scene',
    
    // Zones Nocther Cave
    'nocthercave1': 'NoctherCave1Scene',
    'nocthercave2': 'NoctherCave2Scene',
    'nocthercave2bis': 'NoctherCave2BisScene'
  };
  return mapping[zoneName.toLowerCase()] || zoneName;
}

normalizeZoneName(sceneName) {
  const mapping = {
    // Zones existantes
    'BeachScene': 'beach',
    'VillageScene': 'village',
    'VillageLabScene': 'villagelab',
    'Road1Scene': 'road1',
    'VillageHouse1Scene': 'villagehouse1',
    'LavandiaScene': 'lavandia',
    
    // Zones Lavandia
    'LavandiaAnalysisScene': 'analysis',
    'LavandiaBossRoomScene': 'bossroom',
    'LavandiaCelibTempleScene': 'celibtemple',
    'LavandiaEquipementScene': 'equipement',
    'LavandiaFurnitureScene': 'furniture',
    'LavandiaHealingCenterScene': 'healingcenter',
    'LavandiaHouse1Scene': 'house1',
    'LavandiaHouse2Scene': 'house2',
    'LavandiaHouse3Scene': 'house3',
    'LavandiaHouse4Scene': 'house4',
    'LavandiaHouse5Scene': 'house5',
    'LavandiaHouse6Scene': 'house6',
    'LavandiaHouse7Scene': 'house7',
    'LavandiaHouse8Scene': 'house8',
    'LavandiaHouse9Scene': 'house9',
    'LavandiaResearchLabScene': 'researchlab',
    'LavandiaShopScene': 'shop',
    
    // Zones Village supplémentaires
    'VillageFloristScene': 'villageflorist',
    'VillageHouse2Scene': 'villagehouse2',
    
    // Zones Road
    'Road1HouseScene': 'road1house',
    'Road2Scene': 'road2',
    'Road3Scene': 'road3',
    
    // Zones Nocther Cave
    'NoctherCave1Scene': 'nocthercave1',
    'NoctherCave2Scene': 'nocthercave2',
    'NoctherCave2BisScene': 'nocthercave2bis'
  };
  return mapping[sceneName] || sceneName.toLowerCase();
}

  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ MÉTHODE INCHANGÉE: Chargement de la carte
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
        
        const depth = depthOrder[layerData.name] ?? 0;
        layer.setDepth(depth);
        
        console.log(`📐 [${this.scene.key}] Layer "${layerData.name}" depth: ${depth}`);
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
    this.clientCollisionManager = new ClientCollisionManager(this);
    if (this.clientCollisionManager.loadCollisionsFromTilemap()) {
      console.log(`✅ [${this.scene.key}] Collisions client chargées`);
    }
  }

  getDefaultSpawnPosition(fromZone) {
    return { x: 100, y: 100 };
  }

  onPlayerPositioned(player, initData) {
    // Hook pour logique spécifique
  }

  // ✅ MÉTHODE MODIFIÉE: Setup des managers avec InteractionManager
  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
    
    // ✅ NOUVEAU: L'InteractionManager sera initialisé dans initializeGameSystems()
    // après que le NetworkManager soit disponible
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

  // ✅ MÉTHODE SIMPLIFIÉE: Setup des inputs (plus de gestion E directe)
  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // ✅ SUPPRIMÉ: La gestion de la touche E est maintenant dans InteractionManager
    // L'InteractionManager configure ses propres raccourcis clavier dans setupInputHandlers()
    
    console.log(`⌨️ [${this.scene.key}] Inputs configurés (interactions gérées par InteractionManager)`);
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

  // ✅ MÉTHODE SUPPRIMÉE: handleNpcInteraction
  // Cette méthode est maintenant gérée entièrement par l'InteractionManager
  // qui configure son propre handler réseau pour "npcInteractionResult"

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
    
    if (myPlayer.depth !== 3.5) {
      myPlayer.setDepth(3.5);
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
    // ✅ Déléguer aux systèmes de notification appropriés si disponibles
    if (this.interactionManager) {
      this.interactionManager.showMessage(message, type);
      return;
    }

    // Fallback vers notification Phaser
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

  // ✅ MÉTHODES UTILITAIRES SIMPLIFIÉES: Accès aux systèmes via InteractionManager
  getShopSystem() {
    return this.interactionManager?.shopSystem || null;
  }

  isShopOpen() {
    return this.interactionManager?.isShopOpen() || false;
  }

  debugShop() {
    if (this.interactionManager) {
      this.interactionManager.debugState();
    } else {
      console.log(`🔍 [${this.scene.key}] Aucun InteractionManager`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Debug complet de la scène
  debugScene() {
    console.log(`🔍 [${this.scene.key}] === DEBUG SCENE COMPLÈTE ===`);
    console.log(`📊 Managers:`, {
      playerManager: !!this.playerManager,
      npcManager: !!this.npcManager,
      networkManager: !!this.networkManager,
      interactionManager: !!this.interactionManager,
      inventorySystem: !!this.inventorySystem
    });
    
    if (this.interactionManager) {
      this.interactionManager.debugState();
    }
    
    console.log(`📊 État scène:`, {
      isReady: this.isSceneReady,
      networkSetup: this.networkSetupComplete,
      playerReady: this.myPlayerReady,
      zoneName: this.zoneName,
      sessionId: this.mySessionId
    });
  }
}
