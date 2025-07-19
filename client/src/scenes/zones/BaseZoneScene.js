// client/src/scenes/zones/BaseZoneScene.js - VERSION AVEC ENCOUNTER MANAGER INTÉGRÉ
// ✅ Utilise la connexion établie dans main.js et délègue les interactions à InteractionManager
// 🆕 NOUVEAU: Intégration complète du ClientEncounterManager
// 🔒 MODIFIÉ: Système MovementBlockHandler uniquement

// ✅ NOUVEAU: Import du système de chargement
import { QuickLoading } from '../../components/LoadingScreen.js';
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager.ts";
import { InventorySystem } from "../../game/InventorySystem.js";
import { BaseInteractionManager } from "../../game/BaseInteractionManager.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";
import { CharacterManager } from "../../game/CharacterManager.js";
import { zoneEnvironmentManager } from "../../managers/ZoneEnvironmentManager.js";
// 🆕 NOUVEAU: Import du ClientEncounterManager
import { ClientEncounterManager } from "../../managers/EncounterManager.js";
// 🔒 MODIFIÉ: Import pour MovementBlockHandler
import { movementBlockHandler } from "../../input/MovementBlockHandler.js";
import { InputManager } from "../../input/InputManager.js";
import { integrateMusicToScene } from "../../managers/MapMusicManager.js";
import { sceneToZone, zoneToScene } from '../../config/ZoneMapping.js';
import { PokemonFollowerManager } from "../../game/PokemonFollowerManager.js";
import { OverworldPokemonManager } from "../../game/OverworldPokemonManager.js";
import { WeatherIcon } from '../../ui/WeatherIcon.js';
import { globalWeatherManager } from '../../managers/GlobalWeatherManager.js';



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
    this.globalWeatherManager = null;
    this.weatherSystemType = null; // 'global', 'fallback'
    this.questModuleInitialized = false;
    this.questModuleAttempts = 0;
    this.maxQuestModuleAttempts = 3;
    this.networkManager = (this.scene?.settings?.data?.networkManager) || window.globalNetworkManager;
    this.room = this.networkManager?.room || window.currentGameRoom;
    this.timeWeatherWidget = null;
    this.weatherIcon = null; // Remplace l'ancienne icône

    // Inventaire
    this.inventorySystem = null;
    this.inventoryInitialized = false;
        // ✅ NOUVEAU: Propriétés pour les Pokémon overworld
    this.overworldPokemonManager = null;
    this.overworldPokemonInitialized = false;
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
    this.pokemonFollowerManager = null;
    this.followerSystemInitialized = false;
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

  // ✅ NOUVEAU: Tracking initialisation UI
    this.uiInitialized = false;
    this.uiInitializationAttempts = 0;
    this.maxUIInitAttempts = 3;
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
    console.log(`🌍 === CRÉATION ZONE: ${this.scene.key} ===`);
    console.log(`📊 Scene data reçue:`, this.scene.settings.data);
    
    // ✅ SETUP DES TRANSITIONS (garde ça)
    TransitionIntegration.setupTransitions(this);
    
    // ✅ UN SEUL APPEL - startOptimizedLoading() fait TOUT
    this.startOptimizedLoading();
}

  
// ✅ NOUVELLE MÉTHODE: Chargement optimisé avec LoadingScreen
startOptimizedLoading() {
    console.log(`🚀 [${this.scene.key}] === CHARGEMENT DIRECT SANS ÉCRAN ===`);
    
    // ✅ Faire tout le chargement DIRECTEMENT (pas d'écran)
    this.createPlayerAnimations();
    this.setupManagers();
    this.initPlayerSpawnFromSceneData();
    this.justArrivedAtZone = true;
    this.time.delayedCall(500, () => { this.justArrivedAtZone = false; });
    
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
    
    // ✅ Initialiser les systèmes en arrière-plan
    this.initializeGameSystems();
}

// ✅ NOUVELLE MÉTHODE - UI EN SILENCE TOTALE
async initializeUIQuietly() {
    console.log(`🤫 [${this.scene.key}] UI en silence...`);
    
    if (this.uiInitialized) return;
    
    try {
        // ✅ DIRECT - SANS AUCUN ÉCRAN
        if (typeof initializePokemonUI === 'function') {
            const result = await initializePokemonUI();
            
            if (result.success) {
                this.uiInitialized = true;
                console.log(`✅ [${this.scene.key}] UI prête en silence`);
            }
        }
    } catch (error) {
        console.error(`❌ [${this.scene.key}] Erreur UI silencieuse:`, error);
    }
}

  // ✅ NOUVELLE MÉTHODE: Démarrer LoadingScreen avec UI intégrée
  startIntegratedLoadingScreen() {
    console.log(`🎮 [${this.scene.key}] === CHARGEMENT INTÉGRÉ ZONE + UI ===`);
    
    // Créer un LoadingScreen personnalisé pour cette zone avec UI intégrée
    if (window.globalLoadingScreen) {
      // Étapes combinées : zone + UI
      const integratedSteps = [
        "Chargement de la carte...",
        "Initialisation des joueurs...",
        "Configuration réseau...",
        "Démarrage interface utilisateur...",
        "Chargement modules UI...",
        "Configuration des icônes...",
        "Finalisation de l'interface...",
        "Zone prête !"
      ];
      
      // Démarrer l'écran de chargement personnalisé
      window.globalLoadingScreen.showCustomLoading(integratedSteps, {
        title: `Chargement ${this.scene.key}`,
        icon: '🌍',
        stepDelay: 400
      }).then(() => {
        console.log(`✅ [${this.scene.key}] Chargement intégré terminé`);
        // L'écran se ferme automatiquement
      });
      
    } else {
      console.warn(`⚠️ [${this.scene.key}] GlobalLoadingScreen non disponible`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation UI PENDANT le chargement (pas après)
  async initializeUISystemsDuringLoading() {
    console.log(`🎮 [${this.scene.key}] === INITIALISATION UI PENDANT CHARGEMENT ===`);
    
    // Protection contre initialisations multiples
    if (this.uiInitialized) {
      console.log(`ℹ️ [${this.scene.key}] UI déjà initialisée`);
      return;
    }
    
    if (this.uiInitializationAttempts >= this.maxUIInitAttempts) {
      console.warn(`⚠️ [${this.scene.key}] Trop de tentatives d'initialisation UI - abandon`);
      return;
    }
    
    this.uiInitializationAttempts++;
    console.log(`🎮 [${this.scene.key}] Tentative UI ${this.uiInitializationAttempts}/${this.maxUIInitAttempts}`);
    
    try {
      // Vérifier que les pré-requis sont prêts
      if (!window.globalNetworkManager?.isConnected) {
        console.warn(`⚠️ [${this.scene.key}] NetworkManager pas prêt, retry dans 1s...`);
        this.time.delayedCall(1000, () => {
          this.initializeUISystemsDuringLoading();
        });
        return;
      }
      
      // ✅ NOUVEAU: Initialiser directement sans LoadingScreen séparé
      if (typeof window.initializePokemonUI === 'function') {
        console.log(`🚀 [${this.scene.key}] Initialisation directe PokemonUI...`);
        
        const result = await window.initializePokemonUI();
        
        if (result.success) {
          this.uiInitialized = true;
          console.log(`✅ [${this.scene.key}] Interface utilisateur initialisée !`);
          
          // Déclencher notification de succès
          if (typeof window.showGameNotification === 'function') {
            window.showGameNotification('Interface prête !', 'success', { 
              duration: 1500, 
              position: 'bottom-center' 
            });
          }
          
        } else {
          console.error(`❌ [${this.scene.key}] Erreur initialisation UI:`, result.error);
          this.handleUIInitializationFailure(result.error);
        }
        
      } else {
        console.error(`❌ [${this.scene.key}] window.initializePokemonUI non disponible !`);
        this.handleUIInitializationFailure("Fonction d'initialisation UI manquante");
      }
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur critique initialisation UI:`, error);
      this.handleUIInitializationFailure(error.message);
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Initialisation UI avec LoadingScreen
  async initializeUISystemsWithLoading() {
    console.log(`🎮 [${this.scene.key}] === INITIALISATION UI AVEC CHARGEMENT ===`);
    
    // Protection contre initialisations multiples
    if (this.uiInitialized) {
      console.log(`ℹ️ [${this.scene.key}] UI déjà initialisée`);
      return;
    }
    
    if (this.uiInitializationAttempts >= this.maxUIInitAttempts) {
      console.warn(`⚠️ [${this.scene.key}] Trop de tentatives d'initialisation UI - abandon`);
      return;
    }
    
    this.uiInitializationAttempts++;
    console.log(`🎮 [${this.scene.key}] Tentative UI ${this.uiInitializationAttempts}/${this.maxUIInitAttempts}`);
    
    try {
      // Vérifier que les pré-requis sont prêts
      if (!window.globalNetworkManager?.isConnected) {
        console.warn(`⚠️ [${this.scene.key}] NetworkManager pas prêt, retry dans 2s...`);
        this.time.delayedCall(2000, () => {
          this.initializeUISystemsWithLoading();
        });
        return;
      }
      
      // Déclencher l'initialisation UI avec LoadingScreen
      if (typeof window.initializeUIWithLoading === 'function') {
        console.log(`🚀 [${this.scene.key}] Lancement initialisation UI avec écran de chargement...`);
        
        const result = await window.initializeUIWithLoading();
        
        if (result.success) {
          this.uiInitialized = true;
          console.log(`✅ [${this.scene.key}] Interface utilisateur initialisée avec succès !`);
          
          // Cacher l'ancien overlay s'il existe
          if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
          }
          
        } else {
          console.error(`❌ [${this.scene.key}] Erreur initialisation UI:`, result.error);
          this.handleUIInitializationFailure(result.error);
        }
        
      } else {
        console.error(`❌ [${this.scene.key}] window.initializeUIWithLoading non disponible !`);
        this.handleUIInitializationFailure("Fonction d'initialisation UI manquante");
      }
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur critique initialisation UI:`, error);
      this.handleUIInitializationFailure(error.message);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gestion des échecs d'initialisation UI
  handleUIInitializationFailure(errorMessage) {
    if (this.uiInitializationAttempts < this.maxUIInitAttempts) {
      console.log(`🔄 [${this.scene.key}] Retry initialisation UI dans 3s... (${this.uiInitializationAttempts}/${this.maxUIInitAttempts})`);
      this.time.delayedCall(3000, () => {
        this.initializeUISystemsWithLoading();
      });
    } else {
      console.error(`❌ [${this.scene.key}] Échec définitif d'initialisation UI`);
      
      // Afficher un fallback notification
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification('Interface utilisateur indisponible', 'error', {
          duration: 5000,
          position: 'top-center'
        });
      }
      
      // Cacher l'overlay même en cas d'échec pour ne pas bloquer le jeu
      if (window.hideLoadingOverlay) {
        window.hideLoadingOverlay();
      }
    }
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

  this.networkManager = this.networkManager || window.globalNetworkManager;
  console.log('[BaseZoneScene] NetworkManager utilisé :', this.networkManager, 'Room:', this.room);
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
    this.networkManager._networkHandlersSetup = false;
    this.networkManager._worldHandlersSetup = false;
    this.networkManager.setupRoomListeners();
    this.networkManager.restoreCustomCallbacks?.();
    
    // ✅ AJOUT CRITIQUE: Re-initialiser le système de combat
    if (window.battleSystem && this.networkManager.battleNetworkHandler) {
      console.log('🔗 [BaseZoneScene] Re-connexion BattleManager...');
      window.battleSystem.battleConnection = this.networkManager.battleNetworkHandler;
      
      // ✅ NOUVEAU: Re-setup des événements de combat
      if (window.battleSystem.battleConnection.networkHandler) {
        window.battleSystem.battleConnection.networkHandler = this.networkManager.battleNetworkHandler;
        window.battleSystem.battleConnection.setupNetworkEvents();
      }
    }
    
    // ✅ NOUVEAU: Vérifier que BattleNetworkHandler a le bon client
    if (this.networkManager.battleNetworkHandler && window.client) {
      this.networkManager.battleNetworkHandler.client = window.client;
      console.log('✅ [BaseZoneScene] BattleNetworkHandler client mis à jour');
    }
  }

  // 🔒 NOUVEAU: Initialiser MovementBlockHandler après NetworkManager
  this.initializeMovementBlockHandler();
  this.networkSetupComplete = true;

  // === [HOOK ROOM READY] ===
  if (this.networkManager && this.networkManager.room) {
    this.room = this.networkManager.room; // Synchronise la référence locale
    if (typeof this.onRoomAvailable === "function") {
      this.onRoomAvailable(this.room);
    }
  }
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

setRoom(room) {
  // Méthode à appeler pour changer de room (par exemple lors d'une transition de zone)
  console.log(`🔄 [${this.scene?.key || 'BaseZoneScene'}] setRoom appelé :`, room);

  this.room = room;
  if (this.networkManager) {
    this.networkManager.room = room;
    console.log(`🔄 [${this.scene?.key || 'BaseZoneScene'}] Changement de room dans NetworkManager`);
    this.networkManager.setupRoomListeners();
    this.networkManager.restoreCustomCallbacks?.();
  } else {
    console.warn(`⚠️ [${this.scene?.key || 'BaseZoneScene'}] Pas de networkManager pour setRoom`);
  }
  // Re-initialiser certains systèmes si besoin
  this.initializeGameSystems();
  console.log(`✅ [${this.scene?.key || 'BaseZoneScene'}] Systèmes réinitialisés après changement de room`);
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
      
    // 5. Système d'équipe
    setTimeout(() => {
      // ✅ UTILISER LA FONCTION GLOBALE COMME L'INVENTAIRE
      if (typeof window.initTeamSystem === 'function') {
        console.log(`⚔️ [${this.scene.key}] Init team system global`);
        window.initTeamSystem(this.networkManager.room);
      }
    }, 1500);
    }, 1200);
    // 🆕 6. EncounterManager (après le chargement de la carte)
    setTimeout(() => {
      this.initializeEncounterManager();
    }, 1800);
      setTimeout(() => {
    this.initializeOverworldPokemon();
  }, 2100);
    console.log(`✅ [${this.scene.key}] Planification initialisation systèmes terminée`);

  }
// ✅ NOUVELLE MÉTHODE: Initialisation des Pokémon overworld
initializeOverworldPokemon() {
  console.log(`🌍 [${this.scene.key}] === INITIALISATION POKÉMON OVERWORLD ===`);
  
  try {
    if (!this.overworldPokemonManager) {
      console.error(`❌ [${this.scene.key}] OverworldPokemonManager non initialisé`);
      return;
    }
    
    // ✅ UTILISER LA FONCTION EXISTANTE
    const currentZone = this.mapSceneToZone(this.scene.key);
    
    // ✅ VÉRIFIER SI LA ZONE EST CONFIGURÉE CÔTÉ SERVEUR
    const configuredZones = ['village', 'lavandia'];
    
    if (!configuredZones.includes(currentZone)) {
      console.log(`ℹ️ [${this.scene.key}] Zone ${currentZone} non configurée pour les Pokémon overworld - skip`);
      return;
    }
    
    // Marquer comme initialisé
    this.overworldPokemonInitialized = true;
    
    // Demander la synchronisation au serveur
    setTimeout(() => {
      if (this.networkManager?.room) {
        console.log(`🔄 [${this.scene.key}] Demande synchronisation Pokémon overworld pour zone: ${currentZone}`);
        this.networkManager.room.send("requestOverworldSync");
      }
    }, 3000); // Après tous les autres systèmes
    
    console.log(`✅ [${this.scene.key}] Pokémon overworld initialisé pour zone: ${currentZone}`);
    
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur initialisation Pokémon overworld:`, error);
  }
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
          timestamp: now,
          zone: this.zoneName
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
  console.log(`🌍 [${this.scene.key}] === CONNEXION AU SYSTÈME MÉTÉO GLOBAL ===`);

  // ✅ VÉRIFIER QUE LE SYSTÈME GLOBAL EXISTE
  if (!window.globalWeatherManager) {
    console.error(`❌ [${this.scene.key}] GlobalWeatherManager manquant!`);
    this.setupWeatherFallback();
    return;
  }

  if (!window.globalWeatherManager.isInitialized) {
    console.warn(`⚠️ [${this.scene.key}] GlobalWeatherManager pas encore initialisé, attente...`);
    
    // Attendre jusqu'à 5 secondes
    this.waitForGlobalWeatherSystem(0, 25); // 25 x 200ms = 5 secondes
    return;
  }

  // ✅ ENREGISTRER CETTE SCÈNE DANS LE SYSTÈME GLOBAL
  this.connectToGlobalWeatherSystem();
}

waitForGlobalWeatherSystem(attempts, maxAttempts) {
  if (attempts >= maxAttempts) {
    console.error(`❌ [${this.scene.key}] Timeout attente système météo global - fallback`);
    this.setupWeatherFallback();
    return;
  }

  console.log(`⏳ [${this.scene.key}] Attente système météo global... (${attempts + 1}/${maxAttempts})`);

  setTimeout(() => {
    if (window.globalWeatherManager?.isInitialized) {
      console.log(`✅ [${this.scene.key}] Système météo global prêt!`);
      this.connectToGlobalWeatherSystem();
    } else {
      this.waitForGlobalWeatherSystem(attempts + 1, maxAttempts);
    }
  }, 200);
}

connectToGlobalWeatherSystem() {
  try {
    const zoneName = this.normalizeZoneName(this.scene.key);
    
    console.log(`🔗 [${this.scene.key}] Connexion au système météo global pour zone: ${zoneName}`);

    // ✅ ENREGISTRER CETTE SCÈNE
    const success = window.globalWeatherManager.registerScene(this, zoneName);
    
    if (success) {
      // ✅ MARQUER COMME ACTIVE
      window.globalWeatherManager.setActiveScene(this.scene.key);
      
      // ✅ STOCKER LA RÉFÉRENCE
      this.globalWeatherManager = window.globalWeatherManager;
      this.weatherSystemType = 'global';
      
      console.log(`✅ [${this.scene.key}] Connecté au système météo global`);
      
      // ✅ INITIALISER L'ENVIRONNEMENT LOCAL
      this.initializeZoneEnvironment();
      
    } else {
      console.error(`❌ [${this.scene.key}] Échec enregistrement dans le système global`);
      this.setupWeatherFallback();
    }

  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur connexion système global:`, error);
    this.setupWeatherFallback();
  }
}

setupWeatherFallback() {
  console.log(`🔄 [${this.scene.key}] Configuration météo fallback...`);
  
  // ✅ SYSTÈME MINIMAL LOCAL
  this.globalWeatherManager = {
    isInitialized: true,
    fallbackMode: true,
    getCurrentTime: () => ({ hour: 12, isDayTime: true }),
    getCurrentWeather: () => ({ weather: 'clear', displayName: 'Ciel dégagé' }),
    registerScene: () => false,
    setActiveScene: () => {},
    onZoneChanged: (zone) => console.log(`🌤️ [FALLBACK] Zone changée: ${zone}`)
  };
  
  this.weatherSystemType = 'fallback';
  this.initializeZoneEnvironment();
  
  console.log(`✅ [${this.scene.key}] Météo fallback configurée`);
}

onZoneChanged(newZoneName) {
  console.log(`🌍 [${this.scene.key}] Zone changée: ${newZoneName}`);
  
  // ✅ NOTIFIER LE SYSTÈME GLOBAL
  if (this.globalWeatherManager && typeof this.globalWeatherManager.onZoneChanged === 'function') {
    this.globalWeatherManager.onZoneChanged(newZoneName);
  }
  
  // ✅ OU UTILISER LA FONCTION GLOBALE
  if (typeof window.onWeatherZoneChanged === 'function') {
    window.onWeatherZoneChanged(newZoneName);
  }
  
  // ✅ NOUVEAU: Mettre à jour le widget si nécessaire
  if (this.timeWeatherWidget) {
    // Le widget se mettra à jour automatiquement via les callbacks
    console.log(`🕐 [${this.scene.key}] Widget notifié du changement de zone`);
  }
}

debugWeatherSystem() {
  console.log(`🔍 [${this.scene.key}] === DEBUG SYSTÈME MÉTÉO GLOBAL ===`);
  
  const status = {
    weatherSystemType: this.weatherSystemType || 'unknown',
    hasGlobalManager: !!this.globalWeatherManager,
    globalSystemExists: !!window.globalWeatherManager,
    globalSystemInitialized: window.globalWeatherManager?.isInitialized || false,
    environment: this.currentEnvironment,
    zoneName: this.normalizeZoneName(this.scene.key),
    isRegistered: window.globalWeatherManager?.registeredScenes?.has(this.scene.key) || false,
    isActive: window.globalWeatherManager?.activeScenes?.has(this.scene.key) || false
  };
  
  console.log(`📊 Status météo ${this.scene.key}:`, status);
  return status;
}

getCurrentTimeWeather() {
  if (window.globalWeatherManager?.isInitialized) {
    return {
      time: window.globalWeatherManager.getCurrentTime(),
      weather: window.globalWeatherManager.getCurrentWeather()
    };
  }
  
  // Fallback
  return {
    time: { hour: 12, isDayTime: true },
    weather: { weather: 'clear', displayName: 'Ciel dégagé' }
  };
}

  // === MÉTHODES DE DEBUG POUR BASE INTERACTION MANAGER ===

debugBaseInteractionManager() {
  console.log(`🎯 [${this.scene.key}] === DEBUG BASE INTERACTION MANAGER ===`);
  
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non initialisé`);
    return null;
  }
  
  const info = this.interactionManager.getDebugInfo();
  console.table({
    'Interactions Totales': info.stats.totalInteractions,
    'Erreurs': info.stats.errors,
    'Taux de Succès': info.stats.successRate,
    'Inputs': info.stats.inputEvents,
    'Inputs Bloqués': info.stats.blockedInputs,
    'Temps Moyen': `${info.stats.averageResponseTime.toFixed(0)}ms`
  });
  
  console.log(`📊 [${this.scene.key}] Info complète BaseInteractionManager:`, info);
  this.showNotification('Debug BaseInteractionManager dans la console', 'info');
  
  return info;
}

testNpcInteractionSystem() {
  console.log(`🧪 [${this.scene.key}] Test système interaction NPC...`);
  
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non disponible`);
    this.showNotification('BaseInteractionManager non disponible', 'error');
    return false;
  }
  
  // Trouver le NPC le plus proche pour test
  const myPlayer = this.playerManager?.getMyPlayer();
  if (!myPlayer) {
    console.error(`❌ [${this.scene.key}] Pas de joueur pour test NPC`);
    this.showNotification('Pas de joueur trouvé', 'error');
    return false;
  }
  
  const targetNpc = this.npcManager?.getClosestNpc(myPlayer.x, myPlayer.y, 100);
  if (!targetNpc) {
    console.error(`❌ [${this.scene.key}] Aucun NPC à proximité pour test`);
    this.showNotification('Aucun NPC à proximité', 'warning');
    return false;
  }
  
  console.log(`🎯 [${this.scene.key}] Test interaction avec NPC: ${targetNpc.name}`);
  
  try {
    const result = this.interactionManager.manualInteraction(targetNpc, { type: 'npc' });
    console.log(`✅ [${this.scene.key}] Test NPC réussi:`, result);
    this.showNotification(`Test NPC réussi avec ${targetNpc.name}`, 'success');
    return result;
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur test NPC:`, error);
    this.showNotification(`Erreur test NPC: ${error.message}`, 'error');
    return false;
  }
}

testObjectInteractionSystem() {
  console.log(`🧪 [${this.scene.key}] Test système interaction objets...`);
  
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non disponible`);
    this.showNotification('BaseInteractionManager non disponible', 'error');
    return false;
  }
  
  // Créer un objet test factice
  const myPlayer = this.playerManager?.getMyPlayer();
  if (!myPlayer) {
    console.error(`❌ [${this.scene.key}] Pas de joueur pour test objet`);
    this.showNotification('Pas de joueur trouvé', 'error');
    return false;
  }
  
  const testObject = {
    id: 'test_pokeball',
    name: 'test_pokeball',
    x: myPlayer.x + 32,
    y: myPlayer.y,
    properties: {
      objectType: 'pokeball',
      collectible: true
    }
  };
  
  console.log(`🎯 [${this.scene.key}] Test interaction avec objet test:`, testObject);
  
  try {
    const result = this.interactionManager.manualInteraction(testObject, { type: 'object' });
    console.log(`✅ [${this.scene.key}] Test objet réussi:`, result);
    this.showNotification(`Test objet réussi`, 'success');
    return result;
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur test objet:`, error);
    this.showNotification(`Erreur test objet: ${error.message}`, 'error');
    return false;
  }
}

testSearchHiddenItems(x = null, y = null) {
  console.log(`🧪 [${this.scene.key}] Test fouille objets cachés...`);
  
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non disponible`);
    this.showNotification('BaseInteractionManager non disponible', 'error');
    return false;
  }
  
  // Utiliser position du joueur si pas spécifiée
  const myPlayer = this.playerManager?.getMyPlayer();
  const searchX = x !== null ? x : (myPlayer ? myPlayer.x : 100);
  const searchY = y !== null ? y : (myPlayer ? myPlayer.y : 100);
  
  console.log(`🔍 [${this.scene.key}] Test fouille à position (${searchX}, ${searchY})`);
  
  try {
    const result = this.interactionManager.searchHiddenItems(
      { x: searchX, y: searchY },
      32 // radius
    );
    
    console.log(`✅ [${this.scene.key}] Test fouille envoyé:`, result);
    this.showNotification(`Test fouille envoyé à (${searchX}, ${searchY})`, 'success');
    return result;
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur test fouille:`, error);
    this.showNotification(`Erreur test fouille: ${error.message}`, 'error');
    return false;
  }
}

getBaseInteractionStats() {
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non disponible`);
    return null;
  }
  
  const stats = this.interactionManager.getDebugInfo();
  console.log(`📊 [${this.scene.key}] Stats BaseInteractionManager:`, stats);
  return stats;
}

resetBaseInteractionStats() {
  if (!this.interactionManager) {
    console.error(`❌ [${this.scene.key}] BaseInteractionManager non disponible`);
    return false;
  }
  
  try {
    this.interactionManager.resetStats();
    console.log(`🔄 [${this.scene.key}] Stats BaseInteractionManager reset`);
    this.showNotification('Stats BaseInteractionManager reset', 'success');
    return true;
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur reset stats:`, error);
    this.showNotification(`Erreur reset stats: ${error.message}`, 'error');
    return false;
  }
}
  
  // ✅ MÉTHODE INCHANGÉE: Initialiser l'environnement de la zone
initializeZoneEnvironment() {
    const zoneName = this.normalizeZoneName(this.scene.key);
    this.currentEnvironment = zoneEnvironmentManager.getZoneEnvironment(zoneName);
    
    console.log(`🌍 [${this.scene.key}] Environnement détecté: ${this.currentEnvironment}`);
    
    // Debug des informations d'environnement
    if (this.debugMode) {  // ← AJOUTER cette condition
        zoneEnvironmentManager.debugZoneEnvironment(zoneName);
    }
    
    this.environmentInitialized = true;
}

  // ✅ MÉTHODE INCHANGÉE: Initialisation de l'InteractionManager
  initializeInteractionManager() {
    if (!this.networkManager) {
      console.warn(`⚠️ [${this.scene.key}] Pas de NetworkManager pour BaseInteractionManager`);
      return;
    }
  
    try {
      console.log(`🎯 [${this.scene.key}] === INITIALISATION BASE INTERACTION MANAGER ===`);
  
      // Créer le BaseInteractionManager
      this.interactionManager = new BaseInteractionManager(this);
  
      // L'initialiser avec les dépendances
      this.interactionManager.initialize({
        networkManager: this.networkManager,
        networkInteractionHandler: this.networkManager.interactionHandler,
        playerManager: this.playerManager,
        npcManager: this.npcManager,
        questSystem: window.questSystem || window.questSystemGlobal,
        shopSystem: window.shopSystem
      });
  
      console.log(`✅ [${this.scene.key}] BaseInteractionManager initialisé avec succès`);
  
      // ✅ Shop integration (automatique avec BaseInteractionManager)
      integrateShopToScene(this, this.networkManager);
  
      console.log(`✅ [${this.scene.key}] Shop intégré via BaseInteractionManager`);
  
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation BaseInteractionManager:`, error);
    }
  }

onPlayerReady(player) {
  console.log(`✅ [${this.scene.key}] === PLAYER READY HOOK ===`);
  console.log(`👤 Joueur prêt: ${player.sessionId} à (${player.x}, ${player.y})`);
  
  // ✅ MARQUER comme spawné
  this._playerFullySpawned = true;
  
  // ✅ NOUVEAU: Mettre à jour le flag global playerSpawned
  if (typeof window !== "undefined") {
    window.playerSpawned = true;
    console.log('[GLOBAL] playerSpawned = true (joueur prêt)');
    
    // ✅ Si le loading screen est déjà fermé, marquer playerReady
    if (window.loadingScreenClosed && !window.playerReady) {
      window.playerReady = true;
      console.log('[GLOBAL] playerReady = true (playerSpawned + loading déjà fermé)');
    }
  }
  
  // ✅ VÉRIFIER position valide
  if (player.x !== undefined && player.y !== undefined && player.x !== 0 && player.y !== 0) {
    this._playerPositionConfirmed = true;
    console.log(`📍 [${this.scene.key}] Position joueur confirmée: (${player.x}, ${player.y})`);
  }
  
  // ✅ Si on attendait le spawn pour envoyer clientReady
  if (this._waitingForPlayerSpawn && !this._clientReadySent) {
    console.log(`🚦 [${this.scene.key}] Joueur prêt, envoi clientReady maintenant`);
    this.time.delayedCall(500, () => {
      this.sendClientReady();
    });
  }
  
  // ✅ DÉLAI SÉCURISÉ avant de pouvoir démarrer l'intro
  this.time.delayedCall(1000, () => {
    this._introReadyToStart = true;
    console.log(`🎬 [${this.scene.key}] Intro maintenant autorisée à démarrer`);
    
    // Si on a une intro en attente, la démarrer maintenant
    if (this._pendingIntroStart) {
      console.log(`🚀 [${this.scene.key}] Démarrage intro qui était en attente`);
      this._pendingIntroStart();
      this._pendingIntroStart = null;
    }
  });
  
  // ✅ Debug final
  console.log('🏁 [BaseZoneScene] État flags après onPlayerReady:', {
    playerSpawned: window?.playerSpawned,
    loadingScreenClosed: window?.loadingScreenClosed,
    playerReady: window?.playerReady
  });
}
  
initPlayerSpawnFromSceneData() {
  const data = this.scene.settings.data || {};
  const sessionId = this.mySessionId;
  
  if (!sessionId) {
    console.warn(`⚠️ [${this.scene.key}] sessionId manquant, retry dans 1s...`);
    setTimeout(() => {
      if (this.networkManager?.getSessionId()) {
        this.mySessionId = this.networkManager.getSessionId();
        this.initPlayerSpawnFromSceneData();
      }
    }, 1000);
    return;
  }
  
  // ✅ FIX: Ne plus créer le joueur ici, attendre le serveur
  console.log(`⏸️ [${this.scene.key}] Attente position serveur pour ${sessionId}`);
  
 
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

        // ✅ AJOUTER CES LIGNES AU DÉBUT :
    if (this.networkManager._networkHandlersSetup) {
      console.log(`⚠️ [${this.scene.key}] Network handlers déjà configurés, skip`);
      return;
    }
    
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
this.networkManager.onMessage("overworldPokemon", (data) => {
//    console.log(`🌍 [${this.scene.key}] Message overworld Pokémon reçu:`, data.type);
    
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.handleServerMessage(data);
    } else {
      console.warn(`⚠️ [${this.scene.key}] OverworldPokemonManager pas prêt pour message ${data.type}`);
    }
  });

    // ✅ AJOUTER APRÈS le handler "overworldPokemon" existant :
this.networkManager.send = (messageType, data) => {
  if (this.networkManager?.room) {
    this.networkManager.room.send(messageType, data);
  }
};
    // ✅ Handler d'état avec protection
    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady || !this.networkSetupComplete) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête, ignoré`);
        return;
      }
      
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      this.synchronizeSessionId();
            if (this.pokemonFollowerManager && state && state.players) {
        this.updateFollowersFromState(state);
      }
      this.playerManager.updatePlayers(state);
      this.handleMyPlayerFromState();
    });

    // Handlers de zone WorldRoom
    this.setupWorldRoomHandlers();
    
    // Handler pour les quest statuses
    this.setupQuestStatusHandler();
    
    // Handlers existants (snap, disconnect)
    this.setupExistingHandlers();
    this.networkManager._networkHandlersSetup = true;

    
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

  // ================================================================================================
// FIX POUR L'ERREUR shouldDisplayPlayer
// ================================================================================================

// REMPLACER la méthode updateFollowersFromState dans BaseZoneScene.js

updateFollowersFromState(state) {
  if (!this.pokemonFollowerManager || !this.isSceneReady || !this.playerManager) {
    return;
  }
  
  state.players.forEach((playerState, sessionId) => {
    // ✅ FIX: Vérifier que le joueur existe côté PlayerManager
    const playerExists = this.playerManager.players.has(sessionId);
    
    // Logique simple : si le joueur existe dans PlayerManager, afficher son follower
    const shouldShowPlayer = playerExists;
    
    if (shouldShowPlayer && playerState.follower) {
      // Créer ou mettre à jour le follower
      if (!this.pokemonFollowerManager.hasFollower(sessionId)) {
        this.pokemonFollowerManager.createFollower(sessionId, {
          pokemonId: playerState.follower.pokemonId,
          nickname: playerState.follower.nickname,
          x: playerState.follower.x,
          y: playerState.follower.y,
          direction: playerState.follower.direction,
          isMoving: playerState.follower.isMoving,
          isShiny: playerState.follower.isShiny,
          level: playerState.follower.level
        });
      } else {
        this.pokemonFollowerManager.updateFollower(sessionId, {
          x: playerState.follower.x,
          y: playerState.follower.y,
          direction: playerState.follower.direction,
          isMoving: playerState.follower.isMoving
        });
      }
    } else {
      // Supprimer le follower si le joueur n'est plus dans la zone ou n'a plus de follower
      if (this.pokemonFollowerManager.hasFollower(sessionId)) {
        this.pokemonFollowerManager.removeFollower(sessionId);
      }
    }
  });
}

// ✅ AJOUTER cette méthode fallback dans BaseZoneScene
shouldShowPlayerFallback(sessionId, playerState) {
  // Toujours afficher notre propre joueur
  if (sessionId === this.mySessionId) {
    return true;
  }
  
  // Pour les autres joueurs, vérifier la zone
  if (playerState.currentZone && this.zoneName) {
    return playerState.currentZone === this.zoneName;
  }
  
  // Si pas d'info de zone, afficher par défaut
  return true;
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

    // ✅ AJOUTER CES LIGNES AU DÉBUT :
    if (this.networkManager._worldHandlersSetup) {
      console.log(`⚠️ [${this.scene.key}] World handlers déjà configurés, skip`);
      return;
    }

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

    // ✅ AJOUTER CETTE LIGNE À LA FIN :
    this.networkManager._worldHandlersSetup = true;
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
  
  // ✅ PRIORITÉ 1: Transition avec données explicites (MÊME SI le joueur a déjà une position)
  if (initData?.fromTransition && initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
    console.log(`📍 [${this.scene.key}] OVERRIDE - Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
    player.x = initData.spawnX;
    player.y = initData.spawnY;
    player.targetX = initData.spawnX;
    player.targetY = initData.spawnY;
    
    // Forcer la mise à jour visuelle
    player.setPosition(initData.spawnX, initData.spawnY);
  } 
  // ✅ PRIORITÉ 2: Si le joueur a déjà une position valide du serveur ET qu'on n'est pas en transition
  else if (player.x !== undefined && player.y !== undefined && 
           player.x !== 0 && player.y !== 0) {
    console.log(`📍 [${this.scene.key}] Position serveur conservée: (${player.x}, ${player.y})`);
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
// ✅ CORRIGER EN :
if (this.overworldPokemonManager) {
    this.overworldPokemonManager.update(this.game.loop.delta);
}
    
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
    if (this.pokemonFollowerManager) {
      this.pokemonFollowerManager.update();
    }
    this.handleMovement(myPlayerState);

    // 🆕 NOUVEAU: Vérifier les encounters pendant le mouvement
    if (myPlayer && myPlayer.isMovingLocally) {
     // this.checkForEncounters(myPlayer.x, myPlayer.y);
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
      // ✅ NOUVEAU: Nettoyer le widget temps/météo
  if (this.timeWeatherWidget) {
    this.timeWeatherWidget.destroy();
    this.timeWeatherWidget = null;
    console.log(`🧹 [${this.scene.key}] Widget temps/météo nettoyé`);
  }
  // ✅ NOUVEAU: Nettoyer les Pokémon overworld
    if (this.overworldPokemonManager) {
      this.overworldPokemonManager.cleanup();
      this.overworldPokemonManager = null;
      this.overworldPokemonInitialized = false;
      console.log(`🧹 [${this.scene.key}] OverworldPokemonManager nettoyé`);
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
    if (this.pokemonFollowerManager) {
      this.pokemonFollowerManager.cleanup();
      this.pokemonFollowerManager = null;
    }
    console.log(`🧹 [${this.scene.key}] Nettoyage optimisé...`);

    // AJOUTER JUSTE APRÈS :
    // ✅ DÉSENREGISTRER DU SYSTÈME MÉTÉO GLOBAL
    if (window.globalWeatherManager && this.scene.key) {
      console.log(`🌤️ [${this.scene.key}] Désenregistrement du système météo global`);
      window.globalWeatherManager.unregisterScene(this.scene.key);
    }
    
    // ✅ NETTOYER LES RÉFÉRENCES LOCALES
    this.globalWeatherManager = null;
    this.weatherSystemType = null;
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
    if (this.questModuleInitialized && !isTransition) {
      console.log(`🧹 [${this.scene.key}] Nettoyage Quest Module (non-transition)`);
      
      // Le nouveau système se nettoie automatiquement
      // Juste reset nos flags locaux
      this.questModuleInitialized = false;
      this.questModuleAttempts = 0;
    } else if (isTransition) {
      console.log(`🔄 [${this.scene.key}] Quest Module conservé pour transition`);
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

 // Remplacer les méthodes mapSceneToZone et mapZoneToScene
mapSceneToZone(sceneName) {
  return sceneToZone(sceneName);
}

mapZoneToScene(zoneName) {
  return zoneToScene(zoneName);
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
    // ✅ STOCKER LES LAYERS POUR COLLISIONS
this.collisionLayers = [];
Object.values(this.layers).forEach(layer => {
  if (layer && layer.layer) {
    const layerName = layer.layer.name.toLowerCase();
    // Inclure les layers "world" ET "bellowplayer2"
    if (layerName.includes('world') || layerName.includes('bellowplayer2')) {
      layer.setCollisionByProperty({ collides: true });
      this.collisionLayers.push(layer);
      console.log(`[BaseZoneScene] Collisions activées pour: ${layer.layer.name}`);
    }
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
  
  // ✅ MARQUER CETTE SCÈNE COMME ACTIVE DANS LE SYSTÈME GLOBAL
  if (this.globalWeatherManager && this.globalWeatherManager.setActiveScene) {
    this.globalWeatherManager.setActiveScene(this.scene.key);
    console.log(`🎯 [${this.scene.key}] Scène marquée comme active dans le système météo`);
  }
  
  // ✅ NOUVEAU: Forcer la mise à jour du widget après positionnement
  if (this.timeWeatherWidget) {
    this.time.delayedCall(1000, () => {
      this.connectWidgetToWeatherSystem();
    });
  }
}
  
  // ✅ MÉTHODE MODIFIÉE: Setup des managers avec InteractionManager
  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    
    // AJOUTER
    this.pokemonFollowerManager = new PokemonFollowerManager(this);
    console.log("✅ PokemonFollowerManager initialisé");

      // ✅ AJOUTER CETTE LIGNE MANQUANTE :
  this.overworldPokemonManager = new OverworldPokemonManager(this);
  console.log("✅ OverworldPokemonManager initialisé");
    
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
    this.input.keyboard.on('keydown-O', () => {
      this.debugOverworldPokemon();
    });

    this.input.keyboard.on('keydown-P', () => {
      this.forceSpawnOverworldPokemon();
    });

    this.input.keyboard.on('keydown-L', () => {
      this.clearCurrentOverworldArea();
    });
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
    getQuestModuleStatus() {
      return {
        initialized: this.questModuleInitialized,
        attempts: this.questModuleAttempts,
        maxAttempts: this.maxQuestModuleAttempts,
        globalSystemExists: !!window.questSystem,
        globalSystemReady: !!window.questSystemReady,
        uiManagerExists: !!window.uiManager
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

    // AJOUTER ces méthodes après getCurrentMovementBlockInfo() :

testGlobalWeatherConnection() {
  console.log(`🧪 [${this.scene.key}] Test connexion système météo global...`);
  
  if (!window.globalWeatherManager?.isInitialized) {
    console.error(`❌ [${this.scene.key}] Système météo global pas prêt`);
    return false;
  }
  
  try {
    // Test des fonctions de base
    const currentTime = window.globalWeatherManager.getCurrentTime();
    const currentWeather = window.globalWeatherManager.getCurrentWeather();
    
    console.log(`⏰ Temps global:`, currentTime);
    console.log(`🌦️ Météo globale:`, currentWeather);
    
    // Test de l'enregistrement de cette scène
    const stats = window.globalWeatherManager.getStats();
    console.log(`📊 Stats système global:`, stats);
    
    // Test de force update
    window.globalWeatherManager.forceUpdate();
    
    console.log(`✅ [${this.scene.key}] Test connexion météo global réussi`);
    return true;
    
  } catch (error) {
    console.error(`❌ [${this.scene.key}] Erreur test météo global:`, error);
    return false;
  }
}

forceWeatherRefresh() {
  console.log(`🔄 [${this.scene.key}] Force refresh météo...`);
  
  if (window.globalWeatherManager?.isInitialized) {
    // Désenregistrer et re-enregistrer pour forcer un refresh
    window.globalWeatherManager.unregisterScene(this.scene.key);
    
    setTimeout(() => {
      this.connectToGlobalWeatherSystem();
    }, 100);
    
  } else {
    console.warn(`⚠️ [${this.scene.key}] Système global pas disponible pour refresh`);
  }
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
  console.log(`🔍 [${this.scene.key}] === DEBUG SYSTÈME MÉTÉO GLOBAL ===`);
  
  const status = {
    weatherSystemType: this.weatherSystemType || 'unknown',
    hasGlobalManager: !!this.globalWeatherManager,
    globalSystemExists: !!window.globalWeatherManager,
    globalSystemInitialized: window.globalWeatherManager?.isInitialized || false,
    environment: this.currentEnvironment,
    zoneName: this.normalizeZoneName(this.scene.key),
    isRegistered: window.globalWeatherManager?.registeredScenes?.has(this.scene.key) || false,
    isActive: window.globalWeatherManager?.activeScenes?.has(this.scene.key) || false
  };
  
  console.log(`📊 Status météo ${this.scene.key}:`, status);
  return status;
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
      forceInputManagerInit: () => this.forceInputManagerInit(),
            // ✅ NOUVELLES FONCTIONS DEBUG BASE INTERACTION MANAGER
      debugBaseInteraction: () => this.debugBaseInteractionManager(),
      testNpcInteraction: () => this.testNpcInteractionSystem(),
      testObjectInteraction: () => this.testObjectInteractionSystem(),
      searchHiddenItems: (x, y) => this.testSearchHiddenItems(x, y),
      getInteractionStats: () => this.getBaseInteractionStats(),
      resetInteractionStats: () => this.resetBaseInteractionStats(),
    debugWeather: () => this.debugWeatherSystem(),
    testWeather: () => this.testGlobalWeatherConnection(),
    forceWeatherRefresh: () => this.forceWeatherRefresh(),
    getCurrentWeather: () => this.getCurrentTimeWeather()
    };
    
    console.log(`🔧 [${this.scene.key}] Fonctions debug exposées: window.debug_${this.scene.key}`);
  }
  // ✅ MÉTHODES DE CHARGEMENT ASYNC
async loadZoneComponents() {
    return new Promise(resolve => {
        this.createPlayerAnimations();
        this.setupManagers();
        this.initPlayerSpawnFromSceneData();
        this.justArrivedAtZone = true;
        this.time.delayedCall(500, () => { this.justArrivedAtZone = false; });
        
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
        
        setTimeout(resolve, 300);
    });
}

async initializeUIComponents() {
    return new Promise(async resolve => {
        try {
            if (typeof initializePokemonUI === 'function') {
                await initializePokemonUI();
                console.log(`✅ [${this.scene.key}] Interface utilisateur initialisée`);
            } else {
                console.warn(`⚠️ [${this.scene.key}] initializePokemonUI non disponible`);
            }
            resolve();
        } catch (error) {
            console.error(`❌ [${this.scene.key}] Erreur UI:`, error);
            resolve(); // Continuer même en cas d'erreur
        }
    });
}

performDirectLoading() {
    console.log(`🔄 [${this.scene.key}] Chargement direct de secours...`);
    
    this.createPlayerAnimations();
    this.setupManagers();
    this.initPlayerSpawnFromSceneData();
    this.justArrivedAtZone = true;
    this.time.delayedCall(500, () => { this.justArrivedAtZone = false; });
    
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
    
    this.initializeGameSystems();
  this.initializeOverworldPokemon();

}

// ✅ FONCTIONS UTILITAIRES
delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

promisifyMethod(method) {
    return new Promise(resolve => {
        try {
            method();
            setTimeout(resolve, 200);
        } catch (error) {
            console.error('Erreur dans promisifyMethod:', error);
            resolve();
        }
    });
}
  // ✅ NOUVELLES MÉTHODES DE DEBUG pour Pokémon overworld

debugOverworldPokemon() {
  console.log(`🔍 [${this.scene.key}] === DEBUG POKÉMON OVERWORLD ===`);
  
  // ✅ UTILISER LA FONCTION EXISTANTE
  const currentZone = this.mapSceneToZone(this.scene.key); // Utilise la méthode existante
  
  // ✅ VÉRIFIER SI LA ZONE EST CONFIGURÉE CÔTÉ SERVEUR
  const configuredZones = ['village', 'lavandia']; // Zones avec des Pokémon overworld
  
  if (!configuredZones.includes(currentZone)) {
    console.log(`ℹ️ [${this.scene.key}] Zone ${currentZone} non configurée pour les Pokémon overworld`);
    this.showNotification(`Zone ${currentZone} : pas de Pokémon overworld`, 'info');
    return;
  }
  
  if (!this.overworldPokemonManager) {
    console.log("❌ OverworldPokemonManager non initialisé");
    return;
  }
  
  this.overworldPokemonManager.debugOverworldPokemon();
  
  if (this.networkManager?.room) {
    this.networkManager.room.send("debugOverworldPokemon");
  }
  
  this.showNotification(`Debug Pokémon overworld dans la console`, 'info');
}

forceSpawnOverworldPokemon() {
  console.log(`🎯 [${this.scene.key}] Force spawn Pokémon overworld`);
  
  // ✅ UTILISER LA FONCTION EXISTANTE
  const currentZone = this.mapSceneToZone(this.scene.key);
  
  // ✅ VÉRIFIER SI LA ZONE EST CONFIGURÉE CÔTÉ SERVEUR
  const configuredZones = ['village', 'lavandia'];
  
  if (!configuredZones.includes(currentZone)) {
    console.log(`ℹ️ [${this.scene.key}] Zone ${currentZone} non configurée pour les Pokémon overworld`);
    this.showNotification(`Zone ${currentZone} : pas de Pokémon overworld`, 'warning');
    return;
  }
  
  const myPlayer = this.playerManager?.getMyPlayer();
  if (!myPlayer) {
    console.log("❌ Pas de joueur pour spawn");
    this.showNotification("Pas de joueur trouvé", 'error');
    return;
  }
  
  if (this.networkManager?.room) {
    this.networkManager.room.send("forceSpawnOverworldPokemon", {
      areaId: currentZone, // ✅ Utiliser directement le nom de zone
      pokemonId: 17, // Roucoups par défaut
      x: myPlayer.x,
      y: myPlayer.y
    });
    
    this.showNotification(`Force spawn Roucoups dans ${currentZone}`, 'success');
  } else {
    this.showNotification("Pas de connexion serveur", 'error');
  }
}

clearCurrentOverworldArea() {
  console.log(`🧹 [${this.scene.key}] Nettoyage zone overworld actuelle`);
  
  // ✅ UTILISER LA FONCTION EXISTANTE
  const currentZone = this.mapSceneToZone(this.scene.key);
  
  // ✅ VÉRIFIER SI LA ZONE EST CONFIGURÉE CÔTÉ SERVEUR
  const configuredZones = ['village', 'lavandia'];
  
  if (!configuredZones.includes(currentZone)) {
    console.log(`ℹ️ [${this.scene.key}] Zone ${currentZone} non configurée pour les Pokémon overworld`);
    this.showNotification(`Zone ${currentZone} : pas de Pokémon overworld`, 'warning');
    return;
  }
  
  if (this.networkManager?.room) {
    this.networkManager.room.send("clearOverworldArea", {
      areaId: currentZone // ✅ Utiliser directement le nom de zone
    });
    
    this.showNotification(`Zone ${currentZone} nettoyée`, 'success');
  } else {
    this.showNotification("Pas de connexion serveur", 'error');
  }
}

}
