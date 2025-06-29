// client/src/scenes/zones/BaseZoneScene.js - VERSION AVEC ENCOUNTER MANAGER INTÉGRÉ
// ✅ Utilise la connexion établie dans main.js et délègue les interactions à InteractionManager
// 🆕 NOUVEAU: Intégration complète du ClientEncounterManager
// 🔒 MODIFIÉ: Système MovementBlockHandler uniquement

import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { InteractionManager } from "../../game/InteractionManager.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";
import { DayNightWeatherManager } from "../../game/DayNightWeatherManager.js";
import { CharacterManager } from "../../game/CharacterManager.js";
import { zoneEnvironmentManager } from "../../managers/ZoneEnvironmentManager.js";
import { WeatherEffects } from "../../effects/WeatherEffects.js";
// 🆕 NOUVEAU: Import du ClientEncounterManager
import { ClientEncounterManager } from "../../managers/EncounterManager.js";
// 🔒 MODIFIÉ: Import pour MovementBlockHandler
import { movementBlockHandler } from "../../input/MovementBlockHandler.js";
import { InputManager } from "../../input/InputManager.js";
import { integrateMusicToScene } from "../../managers/MapMusicManager.js";


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
    this.lastStopTime = 0;
    this.myPlayerReady = false;
    this.dayNightWeatherManager = null;
    this.currentEnvironment = null;
    this.environmentInitialized = false;
    this.weatherEffects = null;
    this.weatherInitialized = false;
    
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

    // ✅ InteractionManager au lieu de ShopIntegration direct
    this.interactionManager = null;

    // ✅ Système d'équipe avec protection
    this.teamSystemInitialized = false;
    this.teamInitializationAttempts = 0;
    this.maxTeamInitAttempts = 3;

    // 🆕 NOUVEAU: ClientEncounterManager
    this.encounterManager = null;
    this.encounterInitialized = false;
    this.lastEncounterCheck = 0;
    this.encounterCheckInterval = 100; // Vérifier toutes les 100ms

    // 🔒 NOUVEAU: Propriétés MovementBlockHandler
    this.movementBlockHandlerInitialized = false;
    this.movementBlockInitAttempts = 0;
    this.maxMovementBlockInitAttempts = 5;
    
    // 🔒 NOUVEAU: InputManager
    this.inputManager = null;
    this.inputManagerReady = false;
  }

  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);

    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 24,
      frameHeight: 24,
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

    // 🔧 FIX: Intégration musique APRÈS le chargement de la map
    // Ne PAS intégrer ici, attendre que tout soit prêt
    
    this.loadMap();
    this.setupInputs();
    this.createUI();
    this.myPlayerReady = false;
    this.isSceneReady = true;
    
    this.initializeWithExistingConnection();
    this.setupPlayerReadyHandler();
    this.setupCleanupHandlers();

    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
}

  // ✅ MÉTHODE INCHANGÉE: Utiliser la connexion existante de main.js
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

    // 🔒 NOUVEAU: Initialiser MovementBlockHandler après NetworkManager
    this.initializeMovementBlockHandler();
    this.networkSetupComplete = true;
  }

  // 🔒 NOUVELLE MÉTHODE: Initialisation MovementBlockHandler avec protection
  initializeMovementBlockHandler() {
    console.log(`🔒 [${this.scene.key}] Initialisation MovementBlockHandler...`);
    
    // ✅ PROTECTION CONTRE LES INITIALISATIONS MULTIPLES
    if (this.movementBlockHandlerInitialized) {
      console.log(`⏭️ [${this.scene.key}] MovementBlockHandler déjà initialisé pour cette scène`);
      return;
    }
    
    // ✅ PROTECTION CONTRE TROP DE TENTATIVES
    this.movementBlockInitAttempts++;
    
    if (this.movementBlockInitAttempts > this.maxMovementBlockInitAttempts) {
      console.error(`❌ [${this.scene.key}] Trop de tentatives d'init MovementBlockHandler - abandon`);
      return;
    }
    
    console.log(`🔒 [${this.scene.key}] Tentative ${this.movementBlockInitAttempts}/${this.maxMovementBlockInitAttempts}`);
    
    // ✅ VÉRIFICATION STRICTE: Attendre que l'InputManager soit prêt ET setup
    if (!this.inputManager || !this.inputManagerReady || typeof this.inputManager.areInputsEnabled !== 'function') {
      console.warn(`⚠️ [${this.scene.key}] InputManager pas encore prêt, retry dans 1s... (tentative ${this.movementBlockInitAttempts})`);
      
      // ✅ DÉLAI PROGRESSIF pour éviter le spam
      const delay = Math.min(1000 * this.movementBlockInitAttempts, 5000);
      
      setTimeout(() => {
        if (this.scene.isActive()) { // ✅ Vérifier que la scène est toujours active
          this.initializeMovementBlockHandler();
        }
      }, delay);
      return;
    }
    
    // ✅ VÉRIFICATION NetworkManager
    if (!this.networkManager || !this.networkManager.isConnected) {
      console.warn(`⚠️ [${this.scene.key}] NetworkManager pas prêt, retry dans 2s...`);
      
      setTimeout(() => {
        if (this.scene.isActive()) {
          this.initializeMovementBlockHandler();
        }
      }, 2000);
      return;
    }
    
    try {
      // ✅ INITIALISER avec protection
      console.log(`🔧 [${this.scene.key}] Initialisation MovementBlockHandler avec managers...`);
      
      // ✅ Vérifier que l'instance globale n'est pas déjà sur-initialisée
      if (movementBlockHandler.isInitialized && movementBlockHandler.scene && movementBlockHandler.scene !== this) {
        console.log(`🔄 [${this.scene.key}] Reset MovementBlockHandler pour nouvelle scène`);
        movementBlockHandler.reset();
      }
      
      // ✅ Initialiser avec les managers requis
      movementBlockHandler.initialize(
        this.inputManager,
        this.networkManager,
        this
      );
      
      // ✅ Marquer comme initialisé pour cette scène
      this.movementBlockHandlerInitialized = true;
      
      console.log(`✅ [${this.scene.key}] MovementBlockHandler initialisé avec succès!`);
      
      // ✅ Test rapide
      setTimeout(() => {
        if (movementBlockHandler.isReady()) {
          console.log(`✅ [${this.scene.key}] MovementBlockHandler confirmé prêt`);
        } else {
          console.warn(`⚠️ [${this.scene.key}] MovementBlockHandler pas prêt après init`);
        }
      }, 500);
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation MovementBlockHandler:`, error);
      
      // ✅ Retry avec délai exponentiel en cas d'erreur
      if (this.movementBlockInitAttempts < this.maxMovementBlockInitAttempts) {
        const retryDelay = 2000 * this.movementBlockInitAttempts;
        console.log(`🔄 [${this.scene.key}] Retry dans ${retryDelay}ms...`);
        
        setTimeout(() => {
          if (this.scene.isActive()) {
            this.initializeMovementBlockHandler();
          }
        }, retryDelay);
      }
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Initialisation des systèmes avec ordre et délais sécurisés + EncounterManager
  initializeGameSystems() {
    console.log(`🎮 [${this.scene.key}] Initialisation des systèmes de jeu (ordre sécurisé)...`);

    // ✅ ORDRE D'INITIALISATION CRITIQUE pour éviter les conflits
    
    // 1. Inventaire (plus stable)
    this.initializeInventorySystem();

        // 4. Temps/Météo (peu de risque de conflit)
    setTimeout(() => {
      this.initializeTimeWeatherSystem();
    }, 300);
    
    // 2. InteractionManager (dépend de networkManager)
    setTimeout(() => {
      this.initializeInteractionManager();
    }, 600);
    
    // 3. Quêtes (dépend de la connexion stable)
    setTimeout(() => {
      this.initializeQuestSystem();
    }, 900);
    
    setTimeout(() => {
      const zoneName = this.normalizeZoneName(this.scene.key);
      console.log(`🌍 [${this.scene.key}] Application météo finale pour: ${zoneName}`);
      
      if (this.dayNightWeatherManager) {
        // ✅ Force l'application immédiate
        this.dayNightWeatherManager.forceImmediateWeatherApplication(zoneName);
      }
    }, 1200);
    // 5. Système d'équipe
    setTimeout(() => {
      // ✅ UTILISER LA FONCTION GLOBALE COMME L'INVENTAIRE
      if (typeof window.initTeamSystem === 'function') {
        console.log(`⚔️ [${this.scene.key}] Init team system global`);
        window.initTeamSystem(this.networkManager.room);
      }
    }, 1500);

    // 🆕 6. EncounterManager (après le chargement de la carte)
    setTimeout(() => {
      this.initializeEncounterManager();
    }, 1800);
    
    console.log(`✅ [${this.scene.key}] Planification initialisation systèmes terminée`);
  }

  // 🆕 NOUVELLE MÉTHODE: Initialisation du ClientEncounterManager
  initializeEncounterManager() {
    console.log(`🎲 [${this.scene.key}] === INITIALISATION ENCOUNTER MANAGER ===`);

    try {
      // ✅ Vérifier que la carte est chargée
      if (!this.map) {
        console.warn(`⚠️ [${this.scene.key}] Carte pas encore chargée, retry dans 1s...`);
        setTimeout(() => this.initializeEncounterManager(), 1000);
        return;
      }

      // ✅ Créer le ClientEncounterManager avec les données de carte
      this.encounterManager = new ClientEncounterManager();
      
      // ✅ Charger les données de carte Tiled
      const mapData = this.cache.tilemap.get(this.mapKey);
      if (mapData && mapData.data) {
        console.log(`🗺️ [${this.scene.key}] Chargement données carte pour encounters...`);
        this.encounterManager.loadMapData(mapData.data);
        this.encounterInitialized = true;
        
        console.log(`✅ [${this.scene.key}] EncounterManager initialisé avec succès!`);
        
        // ✅ Exposer globalement pour debug
        window.encounterManager = this.encounterManager;
        
        // ✅ Debug initial
        this.encounterManager.debugZones();
        
        // ✅ Setup des handlers réseau pour les combats
        this.setupEncounterNetworkHandlers();
        
      } else {
        console.error(`❌ [${this.scene.key}] Impossible de récupérer les données de carte`);
      }

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation EncounterManager:`, error);
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Setup des handlers réseau pour les encounters
setupEncounterNetworkHandlers() {
  if (!this.networkManager?.room) {
    console.warn(`⚠️ [${this.scene.key}] Pas de room pour setup encounter handlers`);
    return;
  }

  console.log(`📡 [${this.scene.key}] Setup handlers réseau encounters...`);

  // ✅ SEUL HANDLER : Combat confirmé par le serveur
  this.networkManager.onMessage("wildEncounter", (data) => {
    if (data.success) {
      this.handleWildEncounter(data);
    }
    // ✅ AUCUN ELSE - SILENCE TOTAL SI ÉCHEC
  });

  console.log(`✅ [${this.scene.key}] Handlers encounter configurés`);
}

  // 🆕 NOUVELLE MÉTHODE: Gestion des échecs d'encounter
handleWildEncounter(data) {
  console.log(`🎲 [${this.scene.key}] === ENCOUNTER CONFIRMÉ ===`);
  console.log(`👾 Pokémon: ${data.pokemon?.name} Niveau ${data.pokemon?.level}`);

  // ✅ Arrêter le joueur
  const myPlayer = this.playerManager?.getMyPlayer();
  if (myPlayer && myPlayer.body) {
    myPlayer.body.setVelocity(0, 0);
    myPlayer.anims.play(`idle_${this.lastDirection}`, true);
  }

  // ✅ SEULE NOTIFICATION VISIBLE : Combat confirmé
  if (window.showGameNotification) {
    window.showGameNotification(
      `ENCOUNTER WITH ${data.pokemon?.name?.toUpperCase() || 'POKÉMON'}!`,
      'encounter',
      { 
        duration: 3000, 
        position: 'top-center',
        bounce: true 
      }
    );
  }

  // ✅ Transition vers combat (TODO)
  this.time.delayedCall(1000, () => {
    console.log(`⚔️ [${this.scene.key}] Transition vers combat (TODO)`);
    
    if (window.showGameNotification) {
      window.showGameNotification(
        `Combat non implémenté - continuez à explorer !`,
        'info',
        { duration: 2000, position: 'bottom-center' }
      );
    }
  });
}

  // 🆕 NOUVELLE MÉTHODE: Gestion des infos de zone
  handleEncounterZoneInfo(data) {
    console.log(`📍 [${this.scene.key}] Info zone encounter mise à jour:`, data);
    
    // Optionnel: Afficher les infos de zone
    if (data.zoneId && window.showGameNotification) {
      window.showGameNotification(
        `Zone: ${data.zoneId} - ${data.encounterRate ? (data.encounterRate * 100).toFixed(1) + '%' : 'Pas d\'encounter'}`,
        'info',
        { duration: 2000, position: 'bottom-left' }
      );
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Vérification des encounters lors du mouvement
  checkForEncounters(x, y) {
    // ✅ Vérifier si l'EncounterManager est prêt
    if (!this.encounterInitialized || !this.encounterManager) {
      return;
    }

    // ✅ Vérifier si on vient d'arriver (grace period)
    if (this.justArrivedAtZone) {
      return;
    }

    // ✅ Throttling des vérifications
    const now = Date.now();
    if (now - this.lastEncounterCheck < this.encounterCheckInterval) {
      return;
    }
    this.lastEncounterCheck = now;

    // ✅ Vérifier encounter côté client
    const encounterData = this.encounterManager.checkEncounterOnMove(x, y);
    
    if (encounterData.shouldTrigger) {
      console.log(`🎲 [${this.scene.key}] Encounter possible détecté - envoi au serveur`);
      
      // ✅ Envoyer au serveur pour validation et traitement
      if (this.networkManager?.room) {
        this.networkManager.room.send("triggerEncounter", {
          x: x,
          y: y,
          zoneId: encounterData.zoneId,
          method: encounterData.method,
          encounterRate: encounterData.encounterRate,
          timestamp: now
        });
      }
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Initialisation sécurisée du système d'équipe
  initializeTeamSystemSafely() {
    console.log(`⚔️ [${this.scene.key}] === INITIALISATION TEAM SYSTEM SIMPLE ===`);

    // ✅ PROTECTION CONTRE LES TENTATIVES MULTIPLES
    if (this.teamSystemInitialized) {
      console.log(`ℹ️ [${this.scene.key}] Système d'équipe déjà initialisé`);
      return;
    }

    if (this.teamInitializationAttempts >= this.maxTeamInitAttempts) {
      console.warn(`⚠️ [${this.scene.key}] Trop de tentatives d'initialisation team - abandon`);
      return;
    }

    this.teamInitializationAttempts++;
    console.log(`⚔️ [${this.scene.key}] Tentative ${this.teamInitializationAttempts}/${this.maxTeamInitAttempts}`);

    // ✅ VÉRIFICATION SIMPLE: Juste vérifier que la gameRoom existe (comme inventaire)
    if (!this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Pas de room - retry dans 2s`);
      setTimeout(() => this.initializeTeamSystemSafely(), 2000);
      return;
    }

    // ✅ VÉRIFIER SI DÉJÀ INITIALISÉ GLOBALEMENT
    if (window.TeamManager && window.TeamManager.isInitialized) {
      console.log(`ℹ️ [${this.scene.key}] TeamManager global déjà initialisé - réutilisation`);
      this.teamSystemInitialized = true;
      return;
    }

    try {
      console.log(`🚀 [${this.scene.key}] Initialisation team system simple...`);
      
      // ✅ UTILISER LA FONCTION DEPUIS MAIN.JS (comme pour inventaire/quêtes)
      if (typeof window.initTeamSystem === 'function') {
        console.log(`🎯 [${this.scene.key}] Appel window.initTeamSystem avec room...`);
        
        const teamManager = window.initTeamSystem(this.networkManager.room);
        
        if (teamManager) {
          console.log(`✅ [${this.scene.key}] Système d'équipe initialisé avec succès!`);
          this.teamSystemInitialized = true;
          
          // ✅ ÉVÉNEMENT POUR SIGNALER QUE C'EST PRÊT
          if (typeof window.onSystemInitialized === 'function') {
            window.onSystemInitialized('team');
          }
          
          // ✅ TEST SIMPLE après un délai
          setTimeout(() => {
            console.log(`✅ [${this.scene.key}] Test: TeamManager exists:`, !!window.TeamManager);
            console.log(`✅ [${this.scene.key}] Test: TeamIcon exists:`, !!document.querySelector('#team-icon'));
          }, 1000);
          
        } else {
          console.error(`❌ [${this.scene.key}] window.initTeamSystem a retourné null`);
          this.handleTeamInitFailure();
        }
        
      } else {
        console.error(`❌ [${this.scene.key}] window.initTeamSystem n'existe pas!`);
        this.handleTeamInitFailure();
      }

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation team:`, error);
      this.handleTeamInitFailure();
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Gestion des échecs d'initialisation
  handleTeamInitFailure() {
    if (this.teamInitializationAttempts < this.maxTeamInitAttempts) {
      console.log(`🔄 [${this.scene.key}] Retry initialisation team dans 5s... (${this.teamInitializationAttempts}/${this.maxTeamInitAttempts})`);
      setTimeout(() => this.initializeTeamSystemSafely(), 5000);
    } else {
      console.error(`❌ [${this.scene.key}] Échec définitif d'initialisation du système d'équipe`);
      // Signaler l'échec mais ne pas bloquer le jeu
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification('Système d\'équipe indisponible', 'warning', {
          duration: 5000,
          position: 'top-center'
        });
      }
    }
  }

// ✅ DANS BaseZoneScene.js - REMPLACE initializeTimeWeatherSystem() par :

initializeTimeWeatherSystem() {
  console.log(`🌍 [${this.scene.key}] === INIT SYSTÈME MÉTÉO AVEC ATTENTE ===`);

  // ✅ FONCTION D'ATTENTE du système météo global
  const waitForWeatherSystem = (attempts = 0, maxAttempts = 10) => {
    console.log(`🔍 [${this.scene.key}] Tentative ${attempts + 1}/${maxAttempts} - Vérification météo...`);
    
    if (window.weatherManagerGlobal && window.weatherManagerGlobal.isInitialized) {
      console.log(`✅ [${this.scene.key}] Système météo global trouvé !`);
      this.setupWeatherForScene();
      return;
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ [${this.scene.key}] Système météo pas prêt, retry dans 200ms...`);
      setTimeout(() => {
        waitForWeatherSystem(attempts + 1, maxAttempts);
      }, 200);
    } else {
      console.error(`❌ [${this.scene.key}] Timeout attente système météo - mode dégradé`);
      this.setupWeatherFallback();
    }
  };

  // ✅ INITIALISER ENVIRONNEMENT LOCAL D'ABORD
  if (!this.environmentInitialized) {
    this.initializeZoneEnvironment();
  }

  // ✅ LANCER L'ATTENTE
  waitForWeatherSystem();
}

// ✅ NOUVELLE MÉTHODE: Setup météo quand système prêt
setupWeatherForScene() {
  try {
    console.log(`🌤️ [${this.scene.key}] Configuration météo pour scène...`);
    
    // ✅ RÉFÉRENCE AU MANAGER GLOBAL
    this.dayNightWeatherManager = window.weatherManagerGlobal;
    
    // ✅ ENREGISTREMENT AVEC LE SYSTÈME GLOBAL
    const zoneName = this.normalizeZoneName(this.scene.key);
    
    if (typeof window.registerSceneToWeather === 'function') {
      window.registerSceneToWeather(this, zoneName);
      console.log(`✅ [${this.scene.key}] Enregistré dans système météo global`);
    } else {
      console.warn(`⚠️ [${this.scene.key}] Fonction registerSceneToWeather manquante`);
      // Fallback manuel
      this.dayNightWeatherManager.onZoneChanged(zoneName);
    }
    
    console.log(`✅ [${this.scene.key}] Système météo configuré avec succès`);
    
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur setup météo:`, error);
    this.setupWeatherFallback();
  }
}

// ✅ NOUVELLE MÉTHODE: Fallback si système météo indisponible
setupWeatherFallback() {
  console.log(`🔄 [${this.scene.key}] Configuration météo fallback...`);
  
  // ✅ CRÉER UN SYSTÈME MINIMAL LOCAL
  this.dayNightWeatherManager = {
    isInitialized: true,
    localFallback: true,
    getCurrentTime: () => ({ hour: 12, isDayTime: true }),
    getCurrentWeather: () => ({ weather: 'clear', displayName: 'Ciel dégagé' }),
    onZoneChanged: (zone) => console.log(`🌤️ [FALLBACK] Zone changée: ${zone}`)
  };
  
  console.log(`✅ [${this.scene.key}] Météo fallback configurée`);
}

// ✅ MODIFIER AUSSI onZoneChanged pour être plus robuste :
onZoneChanged(newZoneName) {
  console.log(`🌍 [${this.scene.key}] Zone changée: ${newZoneName}`);
  
  // ✅ VÉRIFIER SI ON A UN SYSTÈME MÉTÉO
  if (this.dayNightWeatherManager && typeof this.dayNightWeatherManager.onZoneChanged === 'function') {
    this.dayNightWeatherManager.onZoneChanged(newZoneName);
    console.log(`✅ [${this.scene.key}] Changement de zone transmis au système météo`);
  } else {
    console.warn(`⚠️ [${this.scene.key}] Pas de système météo pour notifier le changement`);
  }
}

// ✅ MÉTHODE DE DEBUG MÉTÉO AMÉLIORÉE :
debugWeatherSystem() {
  console.log(`🔍 [${this.scene.key}] === DEBUG SYSTÈME MÉTÉO SCÈNE ===`);
  
  const status = {
    globalSystemExists: !!window.weatherManagerGlobal,
    globalSystemInitialized: window.weatherManagerGlobal?.isInitialized || false,
    localManagerRef: !!this.dayNightWeatherManager,
    localManagerType: this.dayNightWeatherManager?.localFallback ? 'FALLBACK' : 'GLOBAL',
    environment: this.currentEnvironment,
    zoneName: this.normalizeZoneName(this.scene.key),
    registerFunction: typeof window.registerSceneToWeather
  };
  
  console.log(`📊 Status météo ${this.scene.key}:`, status);
  
  // ✅ DIAGNOSTIC AUTOMATIQUE
  if (!status.globalSystemExists) {
    console.log(`❌ Système météo global manquant`);
    console.log(`💡 Solution: Attendre l'initialisation ou forcer avec setupWeatherFallback()`);
  } else if (!status.globalSystemInitialized) {
    console.log(`❌ Système météo global pas initialisé`);
    console.log(`💡 Solution: Vérifier l'initialisation dans main.js`);
  } else if (!status.localManagerRef) {
    console.log(`❌ Pas de référence locale au système météo`);
    console.log(`💡 Solution: Relancer initializeTimeWeatherSystem()`);
  } else {
    console.log(`✅ Système météo OK pour ${this.scene.key}`);
  }
  
  return status;
}
  // ✅ MÉTHODE INCHANGÉE: Initialiser l'environnement de la zone
  initializeZoneEnvironment() {
    const zoneName = this.normalizeZoneName(this.scene.key);
    this.currentEnvironment = zoneEnvironmentManager.getZoneEnvironment(zoneName);
    
    console.log(`🌍 [${this.scene.key}] Environnement détecté: ${this.currentEnvironment}`);
    
    // ✅ NOUVEAU: Synchronisation immédiate si le système existe déjà
    if (this.dayNightWeatherManager) {
      this.dayNightWeatherManager.onZoneChanged(zoneName);
    }
    
    // Debug des informations d'environnement
    zoneEnvironmentManager.debugZoneEnvironment(zoneName);
    
    this.environmentInitialized = true;
  }
onZoneChanged(newZoneName) {
  console.log(`🌍 [${this.scene.key}] Zone changée: ${newZoneName}`);
  
  // ✅ LE SYSTÈME GLOBAL GÈRE AUTOMATIQUEMENT LES CHANGEMENTS
  console.log(`✅ [${this.scene.key}] Changement de zone géré par système global`);
}
  
  // ✅ MÉTHODE INCHANGÉE: Initialisation de l'InteractionManager
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

      // ✅ Shop integration
      integrateShopToScene(this, this.networkManager);

      console.log(`✅ [${this.scene.key}] Shop intégré via InteractionManager`);

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation InteractionManager:`, error);
    }
  }

  onPlayerReady(player) {
    // Hook vide par défaut. Sera utilisé si défini dans une scène spécifique.
    console.log(`[${this.scene.key}] ✅ onPlayerReady appelé pour ${player.sessionId}`);
  }
  
  initPlayerSpawnFromSceneData() {
    const data = this.scene.settings.data || {};
    const sessionId = this.mySessionId;
    let spawnX = 52, spawnY = 48;

    // Si transition de zone, coordonnées transmises
    if (typeof data.spawnX === 'number') spawnX = data.spawnX;
    if (typeof data.spawnY === 'number') spawnY = data.spawnY;

    // ✅ Création réelle du joueur avec Character System
    if (this.playerManager && !this.playerManager.getMyPlayer()) {
      // Récupérer l'ID du personnage depuis les données de scène ou utiliser brendan
      const characterId = data.characterId || 'brendan';
      console.log(`[${this.scene.key}] Création joueur avec personnage: ${characterId}`);
      
      this.playerManager.createPlayer(sessionId, spawnX, spawnY, characterId);
      console.log(`[${this.scene.key}] Joueur spawn à (${spawnX}, ${spawnY}) avec personnage ${characterId}`);
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

  // ✅ MÉTHODE INCHANGÉE: Setup des handlers réseau
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
      
      const expectedScene = this.mapZoneToScene(data.zone);
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
      preservePlayer: true,
      weatherData: this.dayNightWeatherManager?.getCurrentStateForTransition()

    };

    if (window.showLoadingOverlay) window.showLoadingOverlay("Changement de zone...");

    this.scene.start(correctScene, transitionData);
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

    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] === HANDLER NPCS APPELÉ ===`);
      console.log(`📊 NPCs reçus: ${npcs.length}`);
      
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
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ [${this.scene.key}] Transition réussie:`, result);
      
      const targetScene = this.mapZoneToScene(result.currentZone || result.zone || result.targetZone);
      
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
      }
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}] Transition échouée:`, result);
      this.handleTransitionError(result);
    });

    console.log(`✅ [${this.scene.key}] Tous les handlers WorldRoom configurés`);
  }

  // ✅ MÉTHODE INCHANGÉE: Setup handler quest statuses
  setupQuestStatusHandler() {
    console.log(`🎯 [${this.scene.key}] Configuration handler quest statuses...`);
    
    this.networkManager.onMessage("questStatuses", (data) => {
      console.log(`🎯 [${this.scene.key}] Quest statuses reçus:`, data);
      
      if (this.npcManager && data.questStatuses && data.questStatuses.length > 0) {
        console.log(`✅ [${this.scene.key}] Mise à jour des indicateurs de quête`);
        this.npcManager.updateQuestIndicators(data.questStatuses);
      }
    });
  }
  
  // ✅ MÉTHODE MODIFIÉE: Setup des handlers existants avec nettoyage team
  setupExistingHandlers() {
    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });
    
    this.networkManager.onDisconnect(() => {
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nDisconnected from WorldRoom`);
      
      // ✅ NOUVEAU: Nettoyer le team system si déconnexion
      if (window.TeamManager) {
        console.log(`🧹 [${this.scene.key}] Nettoyage TeamManager suite à déconnexion`);
        if (typeof window.TeamManager.destroy === 'function') {
          window.TeamManager.destroy();
        }
      }
      this.teamSystemInitialized = false;
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

  // ✅ MÉTHODE INCHANGÉE: Setup du handler joueur prêt
  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`✅ [${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

        if (this.cameraManager) {
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
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

        this.positionPlayer(myPlayer);
        
        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(myPlayer);
        }
      }
    });
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

  // ✅ MÉTHODE CORRIGÉE: Position du joueur avec priorité serveur
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    console.log(`📍 [${this.scene.key}] Positionnement joueur...`);
    console.log(`📊 InitData:`, initData);
    console.log(`👤 Position actuelle du joueur: (${player.x}, ${player.y})`);
    
    // ✅ PRIORITÉ 1: Si le joueur a déjà une position valide du serveur, LA CONSERVER !
    if (player.x !== undefined && player.y !== undefined && 
        player.x !== 0 && player.y !== 0) {
      console.log(`📍 [${this.scene.key}] Position serveur conservée: (${player.x}, ${player.y})`);
      
      // Juste s'assurer que le joueur est visible et actif
      player.setVisible(true);
      player.setActive(true);
      player.setDepth(5);

      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 32;
        player.indicator.setVisible(true);
      }

      // Envoyer la position au serveur pour confirmation
      if (this.networkManager && this.networkManager.isConnected) {
        this.networkManager.sendMove(player.x, player.y, 'down', false);
      }

      this.onPlayerPositioned(player, initData);
      return; // ✅ SORTIR ICI - Ne pas toucher à la position !
    }
    
    // ✅ PRIORITÉ 2: Transition avec données explicites
    if (initData?.fromTransition && initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      console.log(`📍 [${this.scene.key}] Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
      player.x = initData.spawnX;
      player.y = initData.spawnY;
      player.targetX = initData.spawnX;
      player.targetY = initData.spawnY;
    } 
    // ✅ PRIORITÉ 3: Fallback seulement si vraiment aucune position
    else {
      console.warn(`⚠️ [${this.scene.key}] FALLBACK - Aucune position valide trouvée`);
      const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
      console.log(`📍 [${this.scene.key}] Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
      player.x = defaultPos.x;
      player.y = defaultPos.y;
      player.targetX = defaultPos.x;
      player.targetY = defaultPos.y;
    }

    // Setup final du joueur
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

  // ✅ MÉTHODE MODIFIÉE: Update principal avec vérification d'encounters
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

    // 🆕 NOUVEAU: Vérifier les encounters pendant le mouvement
    if (myPlayer && myPlayer.isMovingLocally) {
      this.checkForEncounters(myPlayer.x, myPlayer.y);
    }
  }

  isSceneStillValid(expectedScene) {
    return this.scene && this.scene.key === expectedScene && this.scene.isActive();
  }
  
  // ✅ MÉTHODE MODIFIÉE: Cleanup avec TeamManager, EncounterManager et MovementBlockHandler
  cleanup() {
    TransitionIntegration.cleanupTransitions(this);

    if (this.scene.isActive(this.scene.key)) {
      this.scene.stop(this.scene.key);
      console.log(`[${this.scene.key}] ⛔ Scene stoppée (cleanup)`);
    }

    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("currentZone");
      this.networkManager.room.removeAllListeners("snap");
      this.networkManager.room.removeAllListeners("questStatuses");
      // 🆕 NOUVEAU: Nettoyer les handlers d'encounter
      this.networkManager.room.removeAllListeners("wildEncounter");
      this.networkManager.room.removeAllListeners("encounterFailed");
      this.networkManager.room.removeAllListeners("encounterZoneInfo");
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

    // ✅ NOUVEAU: Nettoyage conditionnel du TeamManager
    if (this.teamSystemInitialized && window.TeamManager) {
      // Ne nettoyer que si on n'est pas en transition
      if (!isTransition) {
        console.log(`🧹 [${this.scene.key}] Nettoyage TeamManager (non-transition)`);
        if (typeof window.TeamManager.destroy === 'function') {
          window.TeamManager.destroy();
        }
        this.teamSystemInitialized = false;
      } else {
        console.log(`🔄 [${this.scene.key}] TeamManager conservé pour transition`);
      }
    }

    // 🔒 NOUVEAU: Nettoyage MovementBlockHandler
    if (this.movementBlockHandlerInitialized) {
      console.log(`🧹 [${this.scene.key}] Nettoyage MovementBlockHandler...`);
      
      // ✅ Reset des flags pour cette scène
      this.movementBlockHandlerInitialized = false;
      this.movementBlockInitAttempts = 0;
      
      // ✅ Reset du MovementBlockHandler si c'est notre scène
      if (movementBlockHandler && movementBlockHandler.scene === this) {
        console.log(`🧹 [${this.scene.key}] Reset MovementBlockHandler pour cette scène`);
        movementBlockHandler.reset();
      }
    }

    // 🔒 NOUVEAU: Nettoyage InputManager
    if (this.inputManager) {
      console.log(`🧹 [${this.scene.key}] Nettoyage InputManager...`);
      this.inputManager.destroy();
      this.inputManager = null;
      this.inputManagerReady = false;
    }
    
    // 🆕 NOUVEAU: Nettoyer l'EncounterManager
    if (this.encounterManager) {
      // L'EncounterManager n'a pas besoin de cleanup spécial, juste le déréférencer
      this.encounterManager = null;
      this.encounterInitialized = false;
      console.log(`🧹 [${this.scene.key}] EncounterManager nettoyé`);
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
    
this.dayNightWeatherManager = null;
    
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

  // 🔒 MÉTHODE MODIFIÉE: Gestion du mouvement avec MovementBlockHandler
  handleMovement(myPlayerState) {
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer || !myPlayer.body) return;

    // 🔒 ÉTAPE 1: VÉRIFICATION BLOCAGE AVANT TOUT via InputManager
    if (this.inputManager && !this.inputManager.areInputsEnabled()) {
      // Arrêter immédiatement le joueur
      myPlayer.body.setVelocity(0, 0);
      myPlayer.anims.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
      
      // Envoyer l'arrêt au serveur si pas encore fait
      const now = Date.now();
      if (!this.lastStopTime || now - this.lastStopTime > 100) {
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          this.lastDirection,
          false  // isMoving = false
        );
        this.lastStopTime = now;
      }
      
      return; // ✅ SORTIR - Pas de mouvement autorisé
    }

    // 🔒 ÉTAPE 2: TRAITEMENT NORMAL DU MOUVEMENT
    const speed = 80;
    let vx = 0, vy = 0;
    let inputDetected = false, direction = null;
    
    // 🔒 PRIORITÉ 1: Utiliser l'InputManager s'il est prêt
    if (this.inputManager && this.inputManagerReady) {
      if (this.inputManager.isKeyDown('left')) {
        vx = -speed; inputDetected = true; direction = 'left';
      } else if (this.inputManager.isKeyDown('right')) {
        vx = speed; inputDetected = true; direction = 'right';
      }
      if (this.inputManager.isKeyDown('up')) {
        vy = -speed; inputDetected = true; direction = 'up';
      } else if (this.inputManager.isKeyDown('down')) {
        vy = speed; inputDetected = true; direction = 'down';
      }
    } else {
      // 🔒 FALLBACK vers cursors directs si InputManager pas prêt
      console.log(`⚠️ [${this.scene.key}] Fallback vers cursors directs`);
      
      if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
        vx = -speed; inputDetected = true; direction = 'left';
      } else if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
        vx = speed; inputDetected = true; direction = 'right';
      }
      if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
        vy = -speed; inputDetected = true; direction = 'up';
      } else if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
        vy = speed; inputDetected = true; direction = 'down';
      }
    }
    
    let actuallyMoving = inputDetected;
    myPlayer.body.setVelocity(vx, vy);
    
    // ✅ NORMALISER LA VITESSE DIAGONALE
    if (vx !== 0 && vy !== 0) {
      myPlayer.body.setVelocity(vx * 0.707, vy * 0.707); // √2 ≈ 0.707
    }
    
    if (inputDetected && direction) {
      this.lastDirection = direction;
      
      if (actuallyMoving) {
        myPlayer.anims.play(`walk_${direction}`, true);
        myPlayer.isMovingLocally = true;
      } else {
        myPlayer.anims.play(`idle_${direction}`, true);
        myPlayer.isMovingLocally = false;
      }
    } else {
      myPlayer.anims.play(`idle_${this.lastDirection}`, true);
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
    // ✅ ENVOYER AUSSI QUAND ON S'ARRÊTE !
    else {
      const now = Date.now();
      if (!this.lastStopTime || now - this.lastStopTime > 100) {
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          this.lastDirection,
          false  // ← isMoving = false
        );
        this.lastStopTime = now;
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
      'Road1HiddenScene': 'road1hidden',
      'Road1HouseScene': 'road1house',
      'VillageHouse1Scene': 'villagehouse1',
      'LavandiaScene': 'lavandia',
      'LavandiaAnalysisScene': 'lavandiaanalysis',
      'LavandiaBossRoomScene': 'lavandiabossroom',
      'LavandiaCelebiTempleScene': 'lavandiacelebitemple',
      'LavandiaEquipementScene': 'lavandiaequipement',
      'LavandiaFurnitureScene': 'lavandiafurniture',
      'LavandiaHealingCenterScene': 'lavandiahealingcenter',
      'LavandiaHouse1Scene': 'lavandiahouse1',
      'LavandiaHouse2Scene': 'lavandiahouse2',
      'LavandiaHouse3Scene': 'lavandiahouse3',
      'LavandiaHouse4Scene': 'lavandiahouse4',
      'LavandiaHouse5Scene': 'lavandiahouse5',
      'LavandiaHouse6Scene': 'lavandiahouse6',
      'LavandiaHouse7Scene': 'lavandiahouse7',
      'LavandiaHouse8Scene': 'lavandiahouse8',
      'LavandiaHouse9Scene': 'lavandiahouse9',
      'LavandiaResearchLabScene': 'lavandiaresearchlab',
      'LavandiaShopScene': 'lavandiashop',
      'VillageFloristScene': 'villageflorist',
      'VillageHouse2Scene': 'villagehouse2',
      'Road2Scene': 'road2',
      'Road3Scene': 'road3',
      'NoctherCave1Scene': 'nocthercave1',
      'NoctherCave2Scene': 'nocthercave2',
      'NoctherCave2BisScene': 'nocthercave2bis'
    };
    return mapping[sceneName] || sceneName.toLowerCase();
  }

  mapZoneToScene(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene',
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'road1house': 'Road1HouseScene',
      'road1hidden': 'Road1HiddenScene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene',
      'lavandiaanalysis': 'LavandiaAnalysisScene',
      'lavandiabossroom': 'LavandiaBossRoomScene',
      'lavandiacelebitemple': 'LavandiaCelebiTempleScene',
      'lavandiaequipement': 'LavandiaEquipementScene',
      'lavandiafurniture': 'LavandiaFurnitureScene',
      'lavandiahealingcenter': 'LavandiaHealingCenterScene',
      'lavandiahouse1': 'LavandiaHouse1Scene',
      'lavandiahouse2': 'LavandiaHouse2Scene',
      'lavandiahouse3': 'LavandiaHouse3Scene',
      'lavandiahouse4': 'LavandiaHouse4Scene',
      'lavandiahouse5': 'LavandiaHouse5Scene',
      'lavandiahouse6': 'LavandiaHouse6Scene',
      'lavandiahouse7': 'LavandiaHouse7Scene',
      'lavandiahouse8': 'LavandiaHouse8Scene',
      'lavandiahouse9': 'LavandiaHouse9Scene',
      'lavandiaresearchlab': 'LavandiaResearchLabScene',
      'lavandiashop': 'LavandiaShopScene',
      'villageflorist': 'VillageFloristScene',
      'villagehouse2': 'VillageHouse2Scene',
      'road2': 'Road2Scene',
      'road3': 'Road3Scene',
      'nocthercave1': 'NoctherCave1Scene',
      'nocthercave2': 'NoctherCave2Scene',
      'nocthercave2bis': 'NoctherCave2BisScene'
    };
    return mapping[zoneName.toLowerCase()] || zoneName;
  }

  normalizeZoneName(sceneName) {
    return this.mapSceneToZone(sceneName);
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

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
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
      });

      if (this.sys.animatedTiles) {
        this.sys.animatedTiles.init(this.map);
      }

      Object.values(this.layers).forEach(layer => {
        if (layer && typeof layer.setCollisionByProperty === 'function') {
          layer.setCollisionByProperty({ collides: true });
        }
      });

      this.setupAnimatedObjects();
      this.setupScene();

      // 🆕 NOUVEAU: Initialiser l'EncounterManager après le chargement de la carte
      setTimeout(() => {
        this.initializeEncounterManager();
      }, 500);
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
    
    // ✅ PHYSICS WORLD SETUP
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    // ✅ STOCKER LES LAYERS POUR COLLISIONS
    this.collisionLayers = [];
    Object.values(this.layers).forEach(layer => {
      if (layer && layer.layer && layer.layer.name.toLowerCase().includes('world')) {
        layer.setCollisionByProperty({ collides: true });
        this.collisionLayers.push(layer);
      }
    });
    
    // 🔥 NOUVEAU: CRÉER LES COLLIDERS
    this.time.delayedCall(100, () => {
      this.setupPlayerCollisions();
    });
// 🔧 FIX: INTÉGRER LA MUSIQUE ICI, quand tout est prêt
this.time.delayedCall(300, () => {
    console.log(`🎵 [${this.scene.key}] === INTÉGRATION MUSIQUE (DÉLAI) ===`);
    try {
        integrateMusicToScene(this); // ← UTILISER L'IMPORT STATIQUE
        console.log(`✅ [${this.scene.key}] Musique intégrée avec succès`);
    } catch (error) {
        console.error(`❌ [${this.scene.key}] Erreur intégration musique:`, error);
    }
});
  }

  getDefaultSpawnPosition(fromZone) {
    return { x: 100, y: 100 };
  }

  onPlayerPositioned(player, initData) {
  console.log(`📍 [${this.scene.key}] Joueur positionné`);
  
  // ✅ LA MÉTÉO EST DÉJÀ APPLIQUÉE AUTOMATIQUEMENT PAR LE SYSTÈME GLOBAL
  const zoneName = this.normalizeZoneName(this.scene.key);
  console.log(`✅ [${this.scene.key}] Météo globale active pour: ${zoneName}`);
}
  
  // ✅ MÉTHODE MODIFIÉE: Setup des managers avec InteractionManager
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

  // 🔒 MÉTHODE MODIFIÉE: Setup des inputs avec InputManager
  setupInputs() {
    console.log(`⌨️ [${this.scene.key}] Setup inputs avec InputManager...`);
    
    // ✅ TOUJOURS créer les cursors de base pour le fallback
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();
    
    try {
      // 🔒 Créer l'InputManager ici AVANT tout le reste
      this.inputManager = new InputManager(this);
      this.inputManagerReady = true;
      
      console.log(`✅ [${this.scene.key}] InputManager créé et prêt`);
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur création InputManager:`, error);
      
      // 🔒 Fallback déjà configuré ci-dessus
      console.log(`🔄 [${this.scene.key}] Utilisation fallback cursors directs...`);
      this.inputManagerReady = false;
    }
    
    // ✅ Raccourcis clavier debug (garder ceux existants)
    this.input.keyboard.on('keydown-C', () => {
      this.debugCollisions();
    });

    this.input.keyboard.on('keydown-F', () => {
      this.debugEncounters();
    });

    this.input.keyboard.on('keydown-G', () => {
      this.forceEncounterTest();
    });

    // 🔒 NOUVEAU: Raccourci pour debug MovementBlockHandler
    this.input.keyboard.on('keydown-M', () => {
      this.debugMovementBlockHandler();
    });

    // 🔒 NOUVEAU: Raccourci pour debug InputManager
    this.input.keyboard.on('keydown-I', () => {
      this.debugInputManager();
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

    // 🆕 NOUVEAU: Texte d'info encounters
    this.encounterText = this.add.text(16, this.scale.height - 60, 'Encounters: Not initialized', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 0, 255, 0.8)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // 🔒 NOUVEAU: Texte d'info MovementBlock
    this.movementBlockText = this.add.text(16, this.scale.height - 100, 'Movement: OK', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 255, 0, 0.8)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
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

  checkPlayerState() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      if (this.playerManager && this.mySessionId) {
        this.playerManager.forceResynchronization();
      }
      return false;
    }
    
    let fixed = false;
    
    if (!myPlayer.visible) {
      myPlayer.setVisible(true);
      fixed = true;
    }
    
    if (!myPlayer.active) {
      myPlayer.setActive(true);
      fixed = true;
    }
    
    if (myPlayer.depth !== 3.5) {
      myPlayer.setDepth(3.5);
      fixed = true;
    }
    
    if (myPlayer.indicator) {
      if (!myPlayer.indicator.visible) {
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

    // 🆕 NOUVEAU: Mettre à jour l'affichage des encounters
    this.updateEncounterDisplay(myPlayer);
    
    // 🔒 NOUVEAU: Mettre à jour l'affichage MovementBlock
    this.updateMovementBlockDisplay();
    
    return true;
  }

  // 🆕 NOUVELLE MÉTHODE: Mettre à jour l'affichage des encounters
  updateEncounterDisplay(myPlayer) {
    if (!this.encounterText || !this.encounterManager || !myPlayer) return;

    const posInfo = this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y);
    const stats = this.encounterManager.getStats();
    
    let displayText = `Encounters: `;
    
    if (this.encounterInitialized) {
      displayText += `✅ | Zone: ${posInfo.zoneId || 'None'} | `;
      displayText += `Grass: ${posInfo.isOnGrass ? '✅' : '❌'} | `;
      displayText += `Water: ${posInfo.isOnWater ? '❌' : '❌'} | `;
      displayText += `Can: ${posInfo.canEncounter ? '✅' : '❌'}`;
    } else {
      displayText += `❌ Not initialized`;
    }
    
    this.encounterText.setText(displayText);
  }

  // 🔒 NOUVELLE MÉTHODE: Mettre à jour l'affichage MovementBlock
  updateMovementBlockDisplay() {
    if (!this.movementBlockText) return;

    let displayText = `Movement: `;
    let bgColor = 'rgba(0, 255, 0, 0.8)'; // Vert par défaut
    
    if (!this.inputManagerReady) {
      displayText += `❌ InputManager not ready`;
      bgColor = 'rgba(255, 0, 0, 0.8)'; // Rouge
    } else if (!this.movementBlockHandlerInitialized) {
      displayText += `⚠️ BlockHandler not initialized`;
      bgColor = 'rgba(255, 165, 0, 0.8)'; // Orange
    } else if (this.inputManager && !this.inputManager.areInputsEnabled()) {
      displayText += `🚫 BLOCKED`;
      bgColor = 'rgba(255, 0, 0, 0.8)'; // Rouge
      
      // Ajouter la raison si disponible
      if (movementBlockHandler && movementBlockHandler.blockReason) {
        displayText += ` (${movementBlockHandler.blockReason})`;
      }
    } else {
      displayText += `✅ FREE`;
      bgColor = 'rgba(0, 255, 0, 0.8)'; // Vert
    }
    
    this.movementBlockText.setText(displayText);
    this.movementBlockText.setBackgroundColor(bgColor);
  }

  showNotification(message, type = 'info') {
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

  setupPlayerCollisions() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer || !myPlayer.body) {
      this.time.delayedCall(200, () => this.setupPlayerCollisions());
      return;
    }
    
    if (!this.collisionLayers || this.collisionLayers.length === 0) {
      return;
    }
    
    this.collisionLayers.forEach((layer, index) => {
      const collider = this.physics.add.collider(myPlayer, layer, (player, tile) => {
        console.log(`💥 COLLISION! à (${Math.round(player.x)}, ${Math.round(player.y)})`);
      }, null, this);
      
      if (!myPlayer.colliders) myPlayer.colliders = [];
      myPlayer.colliders.push(collider);
    });
  }

  debugCollisions() {
    console.log("🔍 === DEBUG COLLISIONS ===");
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour debug");
      return;
    }
    
    console.log("👤 Joueur:", {
      x: myPlayer.x.toFixed(1),
      y: myPlayer.y.toFixed(1),
      hasBody: !!myPlayer.body,
      bodySize: myPlayer.body ? `${myPlayer.body.width}x${myPlayer.body.height}` : 'N/A',
      colliders: myPlayer.colliders ? myPlayer.colliders.length : 0
    });
  }

  // 🆕 NOUVELLES MÉTHODES DE DEBUG POUR LES ENCOUNTERS

  debugEncounters() {
    console.log("🎲 === DEBUG ENCOUNTERS ===");
    
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non initialisé");
      return;
    }
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour debug");
      return;
    }
    
    console.log("📊 Stats EncounterManager:", this.encounterManager.getStats());
    console.log("📍 Position actuelle:", {
      x: myPlayer.x.toFixed(1),
      y: myPlayer.y.toFixed(1)
    });
    
    const posInfo = this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y);
    console.log("🗺️ Info position:", posInfo);
    
    // Debug zones
    this.encounterManager.debugZones();
    
    // Afficher notification
    this.showNotification(`Debug encounters dans la console`, 'info');
  }

  forceEncounterTest() {
    console.log("🔧 === FORCE TEST ENCOUNTER ===");
    
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non initialisé");
      this.showNotification("EncounterManager non initialisé", 'error');
      return;
    }
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour test");
      this.showNotification("Pas de joueur trouvé", 'error');
      return;
    }
    
    console.log("🎯 Force check encounter à position:", myPlayer.x, myPlayer.y);
    
    // Forcer un check encounter
    const encounterData = this.encounterManager.forceEncounterCheck(myPlayer.x, myPlayer.y);
    
    console.log("📊 Résultat force check:", encounterData);
    
    if (encounterData.shouldTrigger) {
      console.log("✅ Encounter forcé - envoi au serveur");
      
      // Envoyer au serveur
      if (this.networkManager?.room) {
        this.networkManager.room.send("triggerEncounter", {
          x: myPlayer.x,
          y: myPlayer.y,
          zoneId: encounterData.zoneId,
          method: encounterData.method,
          encounterRate: encounterData.encounterRate,
          forced: true,
          timestamp: Date.now()
        });
        
        this.showNotification("Encounter forcé envoyé au serveur!", 'success');
      } else {
        this.showNotification("Pas de connexion serveur", 'error');
      }
    } else {
      this.showNotification("Impossible de forcer encounter ici", 'warning');
    }
  }

  // 🔒 NOUVELLES MÉTHODES DE DEBUG POUR MOVEMENTBLOCKHANDLER

  debugMovementBlockHandler() {
    console.log("🔒 === DEBUG MOVEMENT BLOCK HANDLER ===");
    
    if (!this.movementBlockHandlerInitialized) {
      console.log("❌ MovementBlockHandler non initialisé");
      this.showNotification("MovementBlockHandler non initialisé", 'error');
      return;
    }
    
    console.log("📊 Status MovementBlockHandler:", movementBlockHandler.getStatus());
    console.log("📊 Initialization Status:", movementBlockHandler.getInitializationStatus());
    
    // Test de fonctionnement
    console.log("🧪 Test isMovementBlocked():", movementBlockHandler.isMovementBlocked());
    console.log("📊 Stats blocages:", movementBlockHandler.getStats());
    
    // Afficher notification
    this.showNotification(`Debug MovementBlockHandler dans la console`, 'info');
  }

  debugInputManager() {
    console.log("⌨️ === DEBUG INPUT MANAGER ===");
    
    if (!this.inputManager) {
      console.log("❌ InputManager non initialisé");
      this.showNotification("InputManager non initialisé", 'error');
      return;
    }
    
    // Utiliser la méthode debug de l'InputManager
    this.inputManager.debug();
    
    // Test de connexion MovementBlockHandler
    const testResult = this.inputManager.testMovementBlockHandlerConnection();
    console.log("🔗 Test connexion MovementBlockHandler:", testResult);
    
    // Afficher notification
    this.showNotification(`Debug InputManager dans la console`, 'info');
  }

  testEncounterAtPosition(x, y) {
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non disponible");
      return null;
    }
    
    console.log(`🧪 Test encounter à (${x}, ${y})`);
    return this.encounterManager.forceEncounterCheck(x, y);
  }

  // ✅ NOUVELLES MÉTHODES: Gestion du système d'équipe
  getTeamSystemStatus() {
    return {
      initialized: this.teamSystemInitialized,
      attempts: this.teamInitializationAttempts,
      maxAttempts: this.maxTeamInitAttempts,
      globalManagerExists: !!window.TeamManager,
      globalManagerInitialized: window.TeamManager?.isInitialized || false
    };
  }

  // 🆕 NOUVELLES MÉTHODES: Gestion du système d'encounter
  getEncounterSystemStatus() {
    return {
      initialized: this.encounterInitialized,
      managerExists: !!this.encounterManager,
      mapLoaded: !!this.map,
      stats: this.encounterManager?.getStats() || null
    };
  }

  // 🔒 NOUVELLES MÉTHODES: Gestion du système MovementBlock
  getMovementBlockSystemStatus() {
    return {
      initialized: this.movementBlockHandlerInitialized,
      attempts: this.movementBlockInitAttempts,
      maxAttempts: this.maxMovementBlockInitAttempts,
      inputManagerReady: this.inputManagerReady,
      inputManagerExists: !!this.inputManager,
      globalHandlerExists: !!movementBlockHandler,
      globalHandlerReady: movementBlockHandler?.isReady() || false,
      isBlocked: movementBlockHandler?.isMovementBlocked() || false,
      blockReason: movementBlockHandler?.blockReason || null
    };
  }

  forceTeamSystemInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation système d'équipe...`);
    this.teamSystemInitialized = false;
    this.teamInitializationAttempts = 0;
    
    setTimeout(() => {
      this.initializeTeamSystemSafely();
    }, 1000);
  }

  forceEncounterSystemInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation système d'encounter...`);
    this.encounterInitialized = false;
    this.encounterManager = null;
    
    setTimeout(() => {
      this.initializeEncounterManager();
    }, 1000);
  }

  // 🔒 NOUVELLE MÉTHODE: Force réinit MovementBlock
  forceMovementBlockSystemInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation système MovementBlock...`);
    this.movementBlockHandlerInitialized = false;
    this.movementBlockInitAttempts = 0;
    
    // Reset du handler global si nécessaire
    if (movementBlockHandler && movementBlockHandler.scene === this) {
      movementBlockHandler.reset();
    }
    
    setTimeout(() => {
      this.initializeMovementBlockHandler();
    }, 1000);
  }

  // 🔒 NOUVELLE MÉTHODE: Force réinit InputManager
  forceInputManagerInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation InputManager...`);
    
    if (this.inputManager) {
      this.inputManager.destroy();
    }
    
    this.inputManager = null;
    this.inputManagerReady = false;
    
    setTimeout(() => {
      this.setupInputs();
    }, 500);
  }

  isTeamSystemReady() {
    return this.teamSystemInitialized && window.TeamManager && window.TeamManager.isInitialized;
  }

  isEncounterSystemReady() {
    return this.encounterInitialized && !!this.encounterManager;
  }

  // 🔒 NOUVELLES MÉTHODES: Status MovementBlock
  isMovementBlockSystemReady() {
    return this.movementBlockHandlerInitialized && 
           this.inputManagerReady && 
           movementBlockHandler?.isReady();
  }

  isInputManagerReady() {
    return this.inputManagerReady && !!this.inputManager;
  }

  getTeamManager() {
    return this.isTeamSystemReady() ? window.TeamManager : null;
  }

  getEncounterManager() {
    return this.isEncounterSystemReady() ? this.encounterManager : null;
  }

  // 🔒 NOUVELLES MÉTHODES: Getters MovementBlock
  getMovementBlockHandler() {
    return this.isMovementBlockSystemReady() ? movementBlockHandler : null;
  }

  getInputManager() {
    return this.isInputManagerReady() ? this.inputManager : null;
  }

  // ✅ MÉTHODES DE DEBUG ÉTENDUES
  debugScene() {
    console.log(`🔍 [${this.scene.key}] === DEBUG SCENE COMPLÈTE ===`);
    console.log(`📊 Managers:`, {
      playerManager: !!this.playerManager,
      npcManager: !!this.npcManager,
      networkManager: !!this.networkManager,
      interactionManager: !!this.interactionManager,
      inventorySystem: !!this.inventorySystem,
      encounterManager: !!this.encounterManager, // 🆕
      inputManager: !!this.inputManager, // 🔒
      movementBlockHandler: !!movementBlockHandler // 🔒
    });
    
    console.log(`📊 État scène:`, {
      isReady: this.isSceneReady,
      networkSetup: this.networkSetupComplete,
      playerReady: this.myPlayerReady,
      zoneName: this.zoneName,
      sessionId: this.mySessionId,
      teamSystemInitialized: this.teamSystemInitialized,
      teamInitAttempts: this.teamInitializationAttempts,
      encounterSystemInitialized: this.encounterInitialized, // 🆕
      movementBlockSystemInitialized: this.movementBlockHandlerInitialized, // 🔒
      inputManagerReady: this.inputManagerReady // 🔒
    });
  }

  debugAllSystems() {
    console.log(`🔍 [${this.scene.key}] === DEBUG TOUS LES SYSTÈMES ===`);
    
    this.debugScene();
    
    console.log(`⚔️ Team System:`, this.getTeamSystemStatus());
    
    // 🆕 NOUVEAU: Debug encounter system
    console.log(`🎲 Encounter System:`, this.getEncounterSystemStatus());
    
    // 🔒 NOUVEAU: Debug movement block system
    console.log(`🔒 MovementBlock System:`, this.getMovementBlockSystemStatus());
    
    console.log(`🎒 Inventory:`, {
      exists: !!this.inventorySystem,
      initialized: this.inventoryInitialized,
      global: !!window.inventorySystem
    });
    
    console.log(`🎯 Interaction:`, {
      exists: !!this.interactionManager,
      shopSystem: !!this.interactionManager?.shopSystem
    });
    
    console.log(`🌍 DayNight:`, {
      exists: !!this.dayNightWeatherManager
    });
    
    console.log(`🎮 Network:`, {
      manager: !!this.networkManager,
      connected: this.networkManager?.isConnected,
      room: !!this.networkManager?.room,
      sessionId: this.mySessionId
    });
  }

  testTeamConnection() {
    console.log(`🧪 [${this.scene.key}] Test connexion Team System...`);
    
    if (!this.isTeamSystemReady()) {
      console.log(`❌ Team System pas prêt, status:`, this.getTeamSystemStatus());
      return false;
    }
    
    try {
      const teamManager = this.getTeamManager();
      teamManager.requestTeamData();
      console.log(`✅ Test connexion team réussi`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur test connexion team:`, error);
      return false;
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Test du système d'encounter
  testEncounterConnection() {
    console.log(`🧪 [${this.scene.key}] Test connexion Encounter System...`);
    
    if (!this.isEncounterSystemReady()) {
      console.log(`❌ Encounter System pas prêt, status:`, this.getEncounterSystemStatus());
      return false;
    }
    
    try {
      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer) {
        console.log(`❌ Pas de joueur pour test encounter`);
        return false;
      }
      
      const encounterData = this.encounterManager.checkEncounterOnMove(myPlayer.x, myPlayer.y);
      console.log(`✅ Test encounter réussi:`, encounterData);
      return true;
    } catch (error) {
      console.error(`❌ Erreur test encounter:`, error);
      return false;
    }
  }

  // 🔒 NOUVELLE MÉTHODE: Test du système MovementBlock
  testMovementBlockConnection() {
    console.log(`🧪 [${this.scene.key}] Test connexion MovementBlock System...`);
    
    if (!this.isMovementBlockSystemReady()) {
      console.log(`❌ MovementBlock System pas prêt, status:`, this.getMovementBlockSystemStatus());
      return false;
    }
    
    try {
      const handler = this.getMovementBlockHandler();
      const inputManager = this.getInputManager();
      
      console.log(`🔒 Handler status:`, handler.getStatus());
      console.log(`⌨️ InputManager status:`, inputManager.getStatus());
      
      // Test de base
      const isBlocked = handler.isMovementBlocked();
      const areInputsEnabled = inputManager.areInputsEnabled();
      
      console.log(`✅ Test MovementBlock réussi:`, {
        isBlocked,
        areInputsEnabled,
        consistent: isBlocked !== areInputsEnabled
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur test MovementBlock:`, error);
      return false;
    }
  }

  // ✅ MÉTHODES UTILITAIRES POUR LE SHOP ET AUTRES SYSTÈMES
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

  requestTime() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("getTime");
    }
  }

  requestWeather() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("getWeather");
    }
  }

  getCurrentTimeWeather() {
    if (this.dayNightWeatherManager) {
      return {
        time: this.dayNightWeatherManager.getCurrentTime(),
        weather: this.dayNightWeatherManager.getCurrentWeather()
      };
    }
    return null;
  }

  // 🆕 NOUVELLES MÉTHODES UTILITAIRES POUR LES ENCOUNTERS

  getCurrentEncounterInfo() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer || !this.encounterManager) {
      return null;
    }
    
    return {
      position: { x: myPlayer.x, y: myPlayer.y },
      positionInfo: this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y),
      stats: this.encounterManager.getStats()
    };
  }

  resetEncounterCooldowns() {
    if (this.encounterManager) {
      this.encounterManager.resetCooldowns();
      console.log(`🔄 [${this.scene.key}] Cooldowns encounter reset`);
      this.showNotification("Cooldowns encounter reset", 'info');
    }
  }

  simulateEncounterSteps(count = 5) {
    if (this.encounterManager) {
      this.encounterManager.simulateSteps(count);
      console.log(`👟 [${this.scene.key}] ${count} pas simulés`);
      this.showNotification(`${count} pas simulés pour encounter`, 'info');
    }
  }

  // 🔒 NOUVELLES MÉTHODES UTILITAIRES POUR MOVEMENTBLOCK

  getCurrentMovementBlockInfo() {
    if (!this.isMovementBlockSystemReady()) {
      return {
        error: "MovementBlock system not ready"
      };
    }
    
    return {
      handler: movementBlockHandler.getStatus(),
      inputManager: this.inputManager.getStatus(),
      isBlocked: movementBlockHandler.isMovementBlocked(),
      blockReason: movementBlockHandler.blockReason,
      blockMessage: movementBlockHandler.blockMessage
    };
  }
debugMusicSystem() {
    console.log(`🔍 [${this.scene.key}] === DEBUG SYSTÈME MUSIQUE ===`);
    
    // Vérifier si le MapMusicManager est chargé
    if (window.mapMusicManager) {
        console.log(`✅ [${this.scene.key}] MapMusicManager global disponible`);
        window.mapMusicManager.debugState();
    } else {
        console.error(`❌ [${this.scene.key}] MapMusicManager global MANQUANT`);
    }
    
    // Vérifier si cette scène a l'intégration
    if (this.musicManager) {
        console.log(`✅ [${this.scene.key}] MusicManager local disponible`);
        console.log(`🎯 Zone actuelle:`, this.musicManager.currentZone);
        console.log(`🎵 Track actuelle:`, this.musicManager.currentTrack?.key);
    } else {
        console.error(`❌ [${this.scene.key}] MusicManager local MANQUANT`);
    }
    
    // Vérifier les assets audio
    if (this.cache?.audio) {
        const audioKeys = this.cache.audio.getKeys();
        console.log(`🎼 [${this.scene.key}] Assets audio (${audioKeys.length}):`, audioKeys);
        
        // Vérifier les tracks spécifiques
        const requiredTracks = ['road1_theme', 'village_theme', 'lavandia_theme'];
        requiredTracks.forEach(track => {
            const exists = this.cache.audio.exists(track);
            console.log(`${exists ? '✅' : '❌'} [${this.scene.key}] ${track}: ${exists ? 'DISPONIBLE' : 'MANQUANT'}`);
        });
    } else {
        console.error(`❌ [${this.scene.key}] Cache audio MANQUANT`);
    }
    
    // Vérifier le SoundManager
    if (this.sound) {
        console.log(`✅ [${this.scene.key}] SoundManager disponible`);
        console.log(`🔧 [${this.scene.key}] Context state:`, this.sound.context?.state || 'unknown');
        console.log(`🔊 [${this.scene.key}] Volume global:`, this.sound.volume);
        console.log(`🔇 [${this.scene.key}] Muted:`, this.sound.mute);
    } else {
        console.error(`❌ [${this.scene.key}] SoundManager MANQUANT`);
    }
}
  forceUnblockMovement() {
    if (movementBlockHandler) {
      movementBlockHandler.requestForceUnblock();
      console.log(`🔓 [${this.scene.key}] Demande déblocage forcé envoyée`);
      this.showNotification("Demande déblocage forcé envoyée", 'info');
    }
  }

  requestMovementBlockStatus() {
    if (movementBlockHandler) {
      movementBlockHandler.requestBlockStatus();
      console.log(`📊 [${this.scene.key}] Demande status blocage envoyée`);
      this.showNotification("Demande status blocage envoyée", 'info');
    }
  }

  // ✅ NOUVELLES MÉTHODES DE DEBUG MÉTÉO
  debugWeatherSystem() {
    console.log(`🔍 [${this.scene.key}] === DEBUG SYSTÈME MÉTÉO ===`);
    
    const status = {
      globalSystemExists: !!window.weatherManagerGlobal,
      globalSystemInitialized: window.weatherManagerGlobal?.isInitialized || false,
      localManagerRef: !!this.dayNightWeatherManager,
      environment: this.currentEnvironment,
      zoneName: this.normalizeZoneName(this.scene.key)
    };
    
    console.log(`📊 Status:`, status);
    return status;
  }

  testGlobalWeather() {
    console.log(`🧪 [${this.scene.key}] Test système météo global...`);
    
    if (!window.weatherManagerGlobal?.isInitialized) {
      console.error(`❌ [${this.scene.key}] Système météo global pas prêt`);
      return false;
    }
    
    const currentTime = window.getGlobalTime();
    const currentWeather = window.getGlobalWeather();
    
    console.log(`⏰ Temps actuel:`, currentTime);
    console.log(`🌦️ Météo actuelle:`, currentWeather);
    console.log(`✅ [${this.scene.key}] Test météo terminé`);
    return true;
  }
  
  // 🆕 MÉTHODES D'EXPOSITION GLOBALE POUR LE DEBUG
  exposeDebugFunctions() {
    // Exposer les fonctions de debug sur window pour usage en console
    window[`debug_${this.scene.key}`] = {
      debugScene: () => this.debugScene(),
      debugAllSystems: () => this.debugAllSystems(),
      debugEncounters: () => this.debugEncounters(),
      forceEncounter: () => this.forceEncounterTest(),
      testEncounter: () => this.testEncounterConnection(),
      resetEncounterCooldowns: () => this.resetEncounterCooldowns(),
      simulateSteps: (count) => this.simulateEncounterSteps(count),
      getEncounterInfo: () => this.getCurrentEncounterInfo(),
      getEncounterStatus: () => this.getEncounterSystemStatus(),
      // 🔒 NOUVELLES FONCTIONS MOVEMENTBLOCK
      debugMovementBlock: () => this.debugMovementBlockHandler(),
      debugInputManager: () => this.debugInputManager(),
      testMovementBlock: () => this.testMovementBlockConnection(),
      forceUnblock: () => this.forceUnblockMovement(),
      requestBlockStatus: () => this.requestMovementBlockStatus(),
      getMovementBlockInfo: () => this.getCurrentMovementBlockInfo(),
      getMovementBlockStatus: () => this.getMovementBlockSystemStatus(),
      forceMovementBlockInit: () => this.forceMovementBlockSystemInit(),
      forceInputManagerInit: () => this.forceInputManagerInit()
    };
    
    console.log(`🔧 [${this.scene.key}] Fonctions debug exposées: window.debug_${this.scene.key}`);
  }
}
