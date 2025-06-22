// client/src/scenes/zones/BaseZoneScene.js - VERSION DEBUG [BASESCENE] COMPLÈTE

import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
// import { GlobalTransitionManager } from '../../transitions/GlobalTransitionManager.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
super({ key: sceneKey });
console.log(
  `[DEBUG REBOOT SCENE] BaseZoneScene.constructor() — Nouvelle instance de ${sceneKey} à ${Date.now()}`,
  { sceneKey, stack: new Error().stack }
);
    this.mapKey = mapKey;
    this.phaserTilesets = [];
    this.layers = {};
    this.mySessionId = null;
    this.networkManager = null;
    this.globalTransitionManager = null;
    this.isSceneReady = false;
    this.myPlayerReady = false;
    this.currentZone = null;
    this.serverZoneConfirmed = false;
    this.cameraFollowing = false;
    this.lastDirection = 'down';
    this.lastMoveTime = 0;
    this.inventorySystem = null;
    this.shopIntegration = null;
    console.log(`[BASESCENE:${sceneKey}] === CONSTRUCTION SCÈNE GLOBALE ===`);
  }




  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    console.log(`[BASESCENE:${this.scene.key}] Preload terminé`);
  }

  create() {
    if (window.showLoadingOverlay) window.showLoadingOverlay("Chargement de la zone...");
    console.log(`[BASESCENE:${this.scene.key}] === PHASE 2: CRÉATION ===`);
    console.log(`[BASESCENE:${this.scene.key}] Scene data:`, this.scene.settings.data);
    this.createAnimations();
    this.loadMap();
    this.setupInputs();
    this.createUI();
    this.setupManagers();
   // this.initializeGlobalTransitions();
    this.initializeNetworking();
    this.isSceneReady = true;
    this.setupCleanupHandlers();
    console.log(`[BASESCENE:${this.scene.key}] ✅ Création terminée`);
  }

  // === GLOBAL TRANSITIONS ===
  initializeGlobalTransitions() {
    console.log(`[BASESCENE:${this.scene.key}] 🌍 INITIALISATION TRANSITIONS GLOBALES`);
    const sceneData = this.scene.settings.data;
    if (sceneData?.globalTransitionManager) {
      console.log(`[BASESCENE:${this.scene.key}] 🌍 GlobalTransitionManager fourni via transition`);
      this.globalTransitionManager = sceneData.globalTransitionManager;
if (this.map) {
  this.globalTransitionManager.attachToScene(this);
} else {
  this.waitForMapAndAttach();
}
      return;
    }
    if (window.globalTransitionManager) {
      console.log(`[BASESCENE:${this.scene.key}] 🌍 GlobalTransitionManager global trouvé`);
      this.globalTransitionManager = window.globalTransitionManager;
      this.time.delayedCall(100, () => {
        if (this.map) {
          this.globalTransitionManager.attachToScene(this);
        } else {
          this.waitForMapAndAttach();
        }
      });
      return;
    }
    console.log(`[BASESCENE:${this.scene.key}] 🌍 Création nouveau GlobalTransitionManager`);
    this.globalTransitionManager = new GlobalTransitionManager();
    window.globalTransitionManager = this.globalTransitionManager;
    this.time.delayedCall(100, () => {
      if (this.map) {
        this.globalTransitionManager.attachToScene(this);
      } else {
        this.waitForMapAndAttach();
      }
    });
  }

  waitForMapAndAttach() {
    const waitForMap = () => {
      if (this.map) {
        this.globalTransitionManager.attachToScene(this);
      } else {
        this.time.delayedCall(100, waitForMap);
      }
    };
    waitForMap();
  }

  // === NETWORK INIT ===
  initializeNetworking() {
    console.log(`[BASESCENE:${this.scene.key}] 📡 INITIALISATION RÉSEAU`);
    const sceneData = this.scene.settings.data;
    if (sceneData?.networkManager) {
      console.log(`[BASESCENE:${this.scene.key}] 📡 NetworkManager fourni via transition`);
      this.useExistingNetwork(sceneData.networkManager, sceneData);
      return;
    }
    const existingNetwork = this.findExistingNetwork();
    if (existingNetwork) {
      console.log(`[BASESCENE:${this.scene.key}] 📡 NetworkManager trouvé ailleurs`);
      this.useExistingNetwork(existingNetwork);
      return;
    }
    if (this.scene.key === 'BeachScene') {
      console.log(`[BASESCENE:${this.scene.key}] 📡 Première connexion WorldRoom`);
      this.createNewConnection();
    } else {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Aucun NetworkManager et pas BeachScene!`);
      this.showError("Erreur: Connexion réseau manquante");
    }
  }

  useExistingNetwork(networkManager, sceneData = null) {
    console.log(`[BASESCENE:${this.scene.key}] 📡 UTILISATION RÉSEAU EXISTANT`);
    this.networkManager = networkManager;
    this.mySessionId = networkManager.getSessionId();
    if (this.playerManager) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
    this.setupNetworkHandlers();
    this.initializeInventorySystem();
    integrateShopToScene(this, this.networkManager);
    this.requestServerZone();
    if (sceneData?.fromTransition) {
      this.handleTransitionData(sceneData);
    }
    console.log(`[BASESCENE:${this.scene.key}] 📡 Réseau existant configuré`);
  }

  findExistingNetwork() {
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene', 'LavandiaScene'];
    for (const sceneName of scenesToCheck) {
      if (sceneName === this.scene.key) continue;
      const scene = this.scene.manager.getScene(sceneName);
      if (scene?.networkManager?.isConnected) {
        console.log(`[BASESCENE:${this.scene.key}] 📡 NetworkManager trouvé dans: ${sceneName}`);
        return scene.networkManager;
      }
    }
    return null;
  }

  async createNewConnection() {
    console.log(`[BASESCENE:${this.scene.key}] 📡 NOUVELLE CONNEXION`);
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
        this.initializeInventorySystem();
        integrateShopToScene(this, this.networkManager);
        console.log(`[BASESCENE:${this.scene.key}] ✅ Connexion réussie: ${this.mySessionId}`);
      } else {
        throw new Error("Échec de connexion au serveur");
      }
    } catch (error) {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Erreur connexion:`, error);
      this.showError(`Erreur de connexion: ${error.message}`);
    }
  }

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
        console.warn(`[BASESCENE:${this.scene.key}] Erreur récupération dernière position`, e);
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
    console.log(`[BASESCENE:${this.scene.key}] prepareConnectionData:`, { identifier, lastMap, lastX, lastY, spawnZone });
    return { identifier, spawnZone, lastX, lastY };
  }

  setupNetworkHandlers() {
    console.log(`[BASESCENE:${this.scene.key}] 📡 SETUP HANDLERS`);
    this.networkManager.onCurrentZone((data) => {
      console.log(`[BASESCENE:${this.scene.key}] 📍 ZONE SERVEUR REÇUE:`, data);
      this.currentZone = data.zone;
      this.serverZoneConfirmed = true;
      if (this.globalTransitionManager) {
        console.log(`[BASESCENE:${this.scene.key}] 🔄 Sync zone avec GlobalTransitionManager: ${data.zone}`);
        this.globalTransitionManager.currentZone = data.zone;
        this.globalTransitionManager.teleportZones.forEach((teleport, id) => {
          if (teleport.sceneKey === this.scene.key) {
            teleport.fromZone = data.zone;
            console.log(`[BASESCENE:${this.scene.key}] 🔧 Téléport ${id} mis à jour: fromZone = ${data.zone}`);
          }
        });
      }
      const expectedScene = this.mapZoneToScene(this.currentZone);
      if (expectedScene && expectedScene !== this.scene.key) {
        console.warn(`[BASESCENE:${this.scene.key}] ⚠️ SCÈNE INCORRECTE !`);
        this.redirectToCorrectScene(expectedScene, data);
        return;
      }
      if (this.playerManager) {
        this.playerManager.currentZone = this.currentZone;
      }
      console.log(`[BASESCENE:${this.scene.key}] ✅ Zone serveur confirmée: ${this.currentZone}`);
    });

    this.networkManager.onConnect(() => {
      console.log(`[BASESCENE:${this.scene.key}] ✅ Connexion établie`);
      const currentSessionId = this.networkManager.getSessionId();
      if (this.mySessionId && this.mySessionId !== currentSessionId) {
        console.log(`[BASESCENE:${this.scene.key}] 🔄 RECONNEXION DÉTECTÉE`);
        this.mySessionId = currentSessionId;
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
        this.myPlayerReady = false;
        this.time.delayedCall(500, () => {
          this.handleMissingPlayer();
        });
      } else {
        setTimeout(() => {
          this.requestServerZone();
        }, 100);
      }
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!`);
      this.initializeQuestSystem();
    });

    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady) {
        console.log(`[BASESCENE:${this.scene.key}] ⏳ State reçu mais scène pas prête`);
        return;
      }
      if (!state?.players || !this.playerManager) return;
      console.log(`[BASESCENE:${this.scene.key}] 📊 State reçu: ${state.players.size} joueurs`);
      this.playerManager.updatePlayers(state);
      this.handleMyPlayerFromState();
      if (!this.myPlayerReady && this.mySessionId) {
        this.time.delayedCall(100, () => {
          if (!this.myPlayerReady) {
            console.warn(`[BASESCENE:${this.scene.key}] ⚠️ Joueur toujours manquant après state update`);
            this.handleMissingPlayer();
          }
        });
      }
    });

    this.networkManager.onZoneData((data) => {
      console.log(`[BASESCENE:${this.scene.key}] 🗺️ Zone data reçue:`, data);
      if (data.zone === this.currentZone) {
        this.handleZoneData(data);
      }
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`[BASESCENE:${this.scene.key}] 🤖 NPCs reçus: ${npcs.length}`);
      if (this.npcManager && npcs.length > 0) {
        this.npcManager.spawnNpcs(npcs);
      }
    });

    this.networkManager.onNpcInteraction((result) => {
      console.log(`[BASESCENE:${this.scene.key}] 💬 NPC interaction:`, result);
      this.handleNpcInteraction(result);
    });

    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });

    this.networkManager.onDisconnect(() => {
      console.log(`[BASESCENE:${this.scene.key}] ❌ Déconnexion détectée`);
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnexion perdue...\nTentative reconnexion...`);
      this.myPlayerReady = false;
      if (this.globalTransitionManager) {
        this.globalTransitionManager.setActive(false);
        console.log(`[BASESCENE:${this.scene.key}] 🚫 Transitions désactivées (déconnexion)`);
      }
    });

    console.log(`[BASESCENE:${this.scene.key}] 📡 Handlers configurés`);
  }

  requestServerZone() {
    console.log(`[BASESCENE:${this.scene.key}] 📍 DEMANDE ZONE AU SERVEUR`);
    if (!this.networkManager?.room) {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Pas de connexion pour demander la zone`);
      return;
    }
    this.networkManager.room.send("requestCurrentZone", {
      sceneKey: this.scene.key,
      timestamp: Date.now()
    });
    console.log(`[BASESCENE:${this.scene.key}] 📤 Demande de zone envoyée`);
  }

  redirectToCorrectScene(correctScene, serverData) {
    console.log(`[BASESCENE:${this.scene.key}] 🚀 REDIRECTION AUTOMATIQUE Vers: ${correctScene}`);
    const transitionData = {
      fromZone: serverData.zone,
      fromTransition: true,
      networkManager: this.networkManager,
      mySessionId: this.mySessionId,
      spawnX: serverData.x,
      spawnY: serverData.y,
      serverForced: true,
      preservePlayer: true,
      globalTransitionManager: this.globalTransitionManager
    };
    if (window.showLoadingOverlay) window.showLoadingOverlay("Changement de zone...");
    this.scene.start(correctScene, transitionData);
  }

  handleMyPlayerFromState() {
    if (this.myPlayerReady) return;
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      console.log(`[BASESCENE:${this.scene.key}] ✅ Joueur local trouvé: ${this.mySessionId}`);
      if (window.hideLoadingOverlay) window.hideLoadingOverlay();
      myPlayer.setVisible(true);
      myPlayer.setActive(true);
      myPlayer.setDepth(5);
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.positionPlayer(myPlayer);
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    } else if (!myPlayer && this.mySessionId) {
      console.warn(`[BASESCENE:${this.scene.key}] ⚠️ Joueur manquant pour sessionId: ${this.mySessionId}`);
      this.handleMissingPlayer();
    }
  }

  handleMissingPlayer() {
    console.log(`[BASESCENE:${this.scene.key}] 🔧 === RÉCUPÉRATION JOUEUR MANQUANT ===`);
    if (!this.mySessionId || !this.networkManager?.isConnected) {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Données manquantes pour récupération joueur`);
      return;
    }
    console.log(`[BASESCENE:${this.scene.key}] 📡 Demande de resynchronisation...`);
    if (this.networkManager.room) {
      this.networkManager.room.send("requestSync", {
        sessionId: this.mySessionId,
        currentZone: this.networkManager.getCurrentZone()
      });
    }
    this.time.delayedCall(500, () => {
      if (!this.myPlayerReady && this.playerManager) {
        console.log(`[BASESCENE:${this.scene.key}] 🔄 Force resynchronisation PlayerManager...`);
        this.playerManager.forceResynchronization();
        this.time.delayedCall(1000, () => {
          if (!this.myPlayerReady) {
            this.createEmergencyPlayer();
          }
        });
      }
    });
  }

  createEmergencyPlayer() {
    console.log(`[BASESCENE:${this.scene.key}] 🚨 === CRÉATION JOUEUR D'URGENCE ===`);
    if (!this.playerManager || this.myPlayerReady) return;
    const initData = this.scene.settings.data;
    let spawnX, spawnY;
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      spawnX = initData.spawnX;
      spawnY = initData.spawnY;
      console.log(`[BASESCENE:${this.scene.key}] 🚨 Position urgence depuis transition: (${spawnX}, ${spawnY})`);
    } else if (initData?.serverResult?.position) {
      spawnX = initData.serverResult.position.x;
      spawnY = initData.serverResult.position.y;
      console.log(`[BASESCENE:${this.scene.key}] 🚨 Position urgence depuis serverResult: (${spawnX}, ${spawnY})`);
    } else {
      const defaultPos = this.getDefaultSpawnPosition();
      spawnX = defaultPos.x;
      spawnY = defaultPos.y;
      console.log(`[BASESCENE:${this.scene.key}] 🚨 Position urgence par défaut: (${spawnX}, ${spawnY})`);
    }
    try {
      const emergencyPlayer = this.playerManager.createPlayer(this.mySessionId, spawnX, spawnY);
      if (emergencyPlayer) {
        console.log(`[BASESCENE:${this.scene.key}] ✅ Joueur d'urgence créé avec succès`);
        emergencyPlayer.setVisible(true);
        emergencyPlayer.setActive(true);
        emergencyPlayer.setDepth(5);
        this.cameraManager.followPlayer(emergencyPlayer);
        this.cameraFollowing = true;
        this.myPlayerReady = true;
        if (window.hideLoadingOverlay) window.hideLoadingOverlay();
        if (this.networkManager?.isConnected) {
          this.networkManager.sendMove(spawnX, spawnY, 'down', false);
        }
        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(emergencyPlayer);
        }
      } else {
        console.error(`[BASESCENE:${this.scene.key}] ❌ Échec création joueur d'urgence`);
        this.showError("Erreur: Impossible de créer le joueur");
      }
    } catch (error) {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Erreur création joueur d'urgence:`, error);
      this.showError(`Erreur joueur: ${error.message}`);
    }
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;
    console.log(`[BASESCENE:${this.scene.key}] 📍 === POSITIONNEMENT JOUEUR ===`);
    console.log(`[BASESCENE:${this.scene.key}] 📊 InitData:`, initData);
    console.log(`[BASESCENE:${this.scene.key}] 👤 Position actuelle joueur: (${player.x}, ${player.y})`);
    let finalX, finalY;
    if (initData?.fromTransition && (initData.spawnX !== undefined || initData.spawnY !== undefined)) {
      finalX = initData.spawnX;
      finalY = initData.spawnY;
      console.log(`[BASESCENE:${this.scene.key}] 📍 Position depuis SERVEUR (transition): (${finalX}, ${finalY})`);
    }
    else if (initData?.serverResult?.position) {
      finalX = initData.serverResult.position.x;
      finalY = initData.serverResult.position.y;
      console.log(`[BASESCENE:${this.scene.key}] 📍 Position depuis serverResult: (${finalX}, ${finalY})`);
    }
    else {
      const defaultPos = this.getDefaultSpawnPosition();
      finalX = defaultPos.x;
      finalY = defaultPos.y;
      console.log(`[BASESCENE:${this.scene.key}] 📍 Position par défaut: (${finalX}, ${finalY})`);
    }
    console.log(`[BASESCENE:${this.scene.key}] 🎯 POSITION FINALE: (${finalX}, ${finalY})`);
    player.x = finalX;
    player.y = finalY;
    player.targetX = finalX;
    player.targetY = finalY;
    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);
    if (player.indicator) {
      player.indicator.x = finalX;
      player.indicator.y = finalY - 32;
      player.indicator.setVisible(true);
    }
    if (this.networkManager?.isConnected) {
      console.log(`[BASESCENE:${this.scene.key}] 📤 Envoi position au serveur: (${finalX}, ${finalY})`);
      this.networkManager.sendMove(finalX, finalY, 'down', false);
    }
    console.log(`[BASESCENE:${this.scene.key}] ✅ Joueur positionné à: (${finalX}, ${finalY})`);
  }

  handleTransitionData(sceneData) {
    console.log(`[BASESCENE:${this.scene.key}] 🔄 Gestion données transition:`, sceneData);
    if (sceneData.isRollback && sceneData.restorePlayerState && this.playerManager) {
      console.log(`[BASESCENE:${this.scene.key}] 🔄 Rollback détecté`);
      const player = this.playerManager.createPlayer(
        this.mySessionId,
        sceneData.spawnX,
        sceneData.spawnY
      );
      if (player && sceneData.restorePlayerState) {
        player.setVisible(sceneData.restorePlayerState.visible);
        player.setActive(sceneData.restorePlayerState.active);
        player.targetX = sceneData.restorePlayerState.targetX;
        player.targetY = sceneData.restorePlayerState.targetY;
        console.log(`[BASESCENE:${this.scene.key}] ✅ État joueur restauré après rollback`);
      }
    }
    if (sceneData.fromTransition && this.playerManager) {
      this.time.delayedCall(100, () => {
        this.playerManager.forceResynchronization();
      });
    }
    console.log(`[BASESCENE:${this.scene.key}] 🌍 Transition gérée par GlobalTransitionManager`);
  }

  // === MANAGERS ===
  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
    console.log(`[BASESCENE:${this.scene.key}] Managers PlayerManager et NpcManager initialisés`);
  }

  initializeInventorySystem() {
    if (window.inventorySystem) {
      console.log(`[BASESCENE:${this.scene.key}] 🎒 Réutilisation inventaire global`);
      if (this.networkManager?.room) {
        window.inventorySystem.gameRoom = this.networkManager.room;
        window.inventorySystem.setupServerListeners();
      }
      this.inventorySystem = window.inventorySystem;
      return;
    }
    try {
      console.log(`[BASESCENE:${this.scene.key}] 🎒 Initialisation inventaire...`);
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);
      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }
      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;
      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }
      console.log(`[BASESCENE:${this.scene.key}] ✅ Inventaire initialisé`);
      this.time.delayedCall(2000, () => {
        this.inventorySystem?.requestInventoryData();
      });
    } catch (error) {
      console.error(`[BASESCENE:${this.scene.key}] ❌ Erreur inventaire:`, error);
    }
  }

  initializeQuestSystem() {
    if (!window.questSystem && this.networkManager?.room) {
      try {
        window.questSystem = new QuestSystem(this, this.networkManager.room);
        console.log(`[BASESCENE:${this.scene.key}] ✅ QuestSystem initialisé`);
      } catch (e) {
        console.error(`[BASESCENE:${this.scene.key}] ❌ Erreur QuestSystem:`, e);
      }
    }
  }

  // === UI ===
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
    console.log(`[BASESCENE:${this.scene.key}] UI créée`);
  }

  // === MAP & ANIMATIONS ===
  loadMap() {
    console.log(`[BASESCENE:${this.scene.key}] 🗺️ CHARGEMENT MAP`);
    this.map = this.make.tilemap({ key: this.mapKey });
    console.log(`[BASESCENE:${this.scene.key}] 🗺️ Map: ${this.mapKey}`);
    console.log(`[BASESCENE:${this.scene.key}] 🗺️ Tilesets:`, this.map.tilesets.map(ts => ts.name));
    console.log(`[BASESCENE:${this.scene.key}] 🗺️ Layers:`, this.map.layers.map(l => l.name));
    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        console.log(`[BASESCENE:${this.scene.key}] 🗺️ Chargement tileset: ${tileset.name}`);
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
      this.setupScene();
      console.log(`[BASESCENE:${this.scene.key}] ✅ Map chargée`);
    };
    if (needsLoading) {
      this.load.once('complete', finishLoad);
      this.load.start();
    } else {
      finishLoad();
    }
  }

  createAnimations() {
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
    console.log(`[BASESCENE:${this.scene.key}] Animations créées`);
  }

  setupScene() {
    console.log(`[BASESCENE:${this.scene.key}] 🎬 SETUP SCÈNE`);
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
    console.log(`[BASESCENE:${this.scene.key}] ✅ Scène configurée`);
  }

  // === INPUTS ===
  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();
    this.input.keyboard.on("keydown-E", () => {
      if (window._questDialogActive) {
        console.log(`[BASESCENE:${this.scene.key}] ⚠️ Fenêtre de quête ouverte, interaction E bloquée`);
        return;
      }
      if (typeof window.isChatFocused === "function" && window.isChatFocused()) {
        console.log(`[BASESCENE:${this.scene.key}] ⚠️ Chat ouvert, interaction E bloquée`);
        return;
      }
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display !== 'none') {
        console.log(`[BASESCENE:${this.scene.key}] ⚠️ Dialogue NPC ouvert, interaction bloquée`);
        return;
      }
      if (typeof window.isInventoryOpen === "function" && window.isInventoryOpen()) {
        console.log(`[BASESCENE:${this.scene.key}] ⚠️ Inventaire ouvert, interaction E bloquée`);
        return;
      }
      if (this.isShopOpen()) {
        console.log(`[BASESCENE:${this.scene.key}] ⚠️ Shop ouvert, interaction E bloquée`);
        return;
      }
      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;
      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        console.log(`[BASESCENE:${this.scene.key}] 🎯 Interaction avec NPC: ${npc.name}`);
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager?.sendNpcInteract(npc.id);
      } else {
        console.log(`[BASESCENE:${this.scene.key}] ℹ️ Aucun NPC à proximité pour interagir`);
      }
    });
    console.log(`[BASESCENE:${this.scene.key}] Inputs clavier configurés`);
  }

  // === UPDATE ===
  update() {
  // Update du GlobalTransitionManager
  // if (this.globalTransitionManager) {     // ← Commente ces lignes
  //   const myPlayer = this.playerManager?.getMyPlayer();
  //   if (myPlayer) {
  //     this.globalTransitionManager.checkCollisions(myPlayer);
  //   }
  // }
    // Vérification périodique de l'état du joueur
    if (this.time.now % 2000 < 16) {
      this.checkPlayerHealth();
    }
    if (this.playerManager) this.playerManager.update();
    if (this.cameraManager) this.cameraManager.update();
    if (this.sys.animatedTiles?.update) {
      this.sys.animatedTiles.update();
    }
    // COORDONNÉES
    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }
    // MOUVEMENT
    this.handleMovement();
  }

  checkPlayerHealth() {
    if (this.mySessionId && !this.myPlayerReady && this.networkManager?.isConnected) {
      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer) {
        console.warn(`[BASESCENE:${this.scene.key}] 🏥 Vérification santé: Joueur manquant`);
        this.handleMissingPlayer();
      } else if (!myPlayer.visible || !myPlayer.active) {
        console.warn(`[BASESCENE:${this.scene.key}] 🏥 Vérification santé: Joueur invisible/inactif`);
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
        myPlayer.setDepth(5);
        if (!this.myPlayerReady) {
          this.myPlayerReady = true;
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
          if (window.hideLoadingOverlay) window.hideLoadingOverlay();
        }
      }
    }
  }

  handleMovement() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) return;
    const speed = 120;
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
        this.networkManager?.sendMove(
          myPlayer.x,
          myPlayer.y,
          direction || this.lastDirection,
          moved
        );
        this.lastMoveTime = now;
      }
    }
  }

  // === CLEANUP ===
  cleanup() {
    console.log(`[BASESCENE:${this.scene.key}] 🧹 Nettoyage avec transitions globales...`);
    const isTransition = this.networkManager && this.networkManager.isTransitioning && this.networkManager.isTransitioning();
    if (!isTransition) {
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
    } else {
      console.log(`[BASESCENE:${this.scene.key}] 🔄 Nettoyage léger pour transition`);
    }
    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.isSceneReady = false;
    this.serverZoneConfirmed = false;
    console.log(`[BASESCENE:${this.scene.key}] ✅ Nettoyage terminé (GlobalTransitionManager préservé)`);
  }

  setupCleanupHandlers() {
    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
    console.log(`[BASESCENE:${this.scene.key}] Handlers de cleanup attachés`);
  }

  // === ZONE / QUESTS / NPCS ===
  handleZoneData(data) {
    console.log(`[BASESCENE:${this.scene.key}] 🗺️ Handling zone data:`, data);
    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }
  }

  handleNpcInteraction(result) {
    console.log(`[BASESCENE:${this.scene.key}] 💬 [npcInteractionResult] Reçu :`, result);
    if (window._questDialogActive) {
      console.log(`[BASESCENE:${this.scene.key}] ⚠️ Fenêtre de quête déjà ouverte, interaction ignorée`);
      return;
    }
    if (result.type === "shop") {
      if (this.shopIntegration?.getShopSystem()) {
        this.shopIntegration.handleShopNpcInteraction(result);
        return;
      }
    }
    if (result.type === "dialogue") {
      let npcName = "???";
      let portrait = result.portrait;
      if (result.npcId && this.npcManager) {
        const npc = this.npcManager.getNpcData(result.npcId);
        if (npc) {
          npcName = npc.name;
          if (!portrait && npc.sprite) {
            portrait = `/assets/portrait/${npc.sprite}Portrait.png`;
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
      if (window.questSystem?.handleNpcInteraction) {
        window.questSystem.handleNpcInteraction(result);
      }
    }
    else {
      if (typeof window.showNpcDialogue === 'function') {
        window.showNpcDialogue({
          portrait: null,
          name: "???",
          text: result.message || JSON.stringify(result)
        });
      }
    }
  }

  // === UTILS ===
  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  showError(message) {
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();
    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    this.time.delayedCall(5000, () => {
      console.log(`[BASESCENE:${this.scene.key}] 🔄 Tentative de reconnexion...`);
      this.initializeNetworking();
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
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : '#44ff44',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      if (notification?.scene) {
        notification.destroy();
      }
    });
  }

  getDefaultSpawnPosition() {
    return { x: 52, y: 48 };
  }

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
    return mapping[zoneName?.toLowerCase()] || null;
  }

  // === SHOP UTILS ===
  getShopSystem() {
    return this.shopIntegration?.getShopSystem() || null;
  }

  isShopOpen() {
    return this.shopIntegration?.getShopSystem()?.isShopOpen() || false;
  }

  debugShop() {
    if (this.shopIntegration) {
      this.shopIntegration.debugShopState();
    } else {
      console.log(`[BASESCENE:${this.scene.key}] 🔍 Aucune intégration shop`);
    }
  }

  // === HOOKS ===
  onPlayerReady(player) {
    // Override dans les scènes spécifiques si nécessaire
  }

  // === DEBUG ===
  debugState() {
    console.log(`[BASESCENE:${this.scene.key}] 🔍 === DEBUG ÉTAT ===`);
    console.log(`[BASESCENE:${this.scene.key}] 🎮 Scène prête: ${this.isSceneReady}`);
    console.log(`[BASESCENE:${this.scene.key}] 👤 Joueur prêt: ${this.myPlayerReady}`);
    console.log(`[BASESCENE:${this.scene.key}] 🆔 SessionId: ${this.mySessionId}`);
    console.log(`[BASESCENE:${this.scene.key}] 📍 Zone courante: ${this.currentZone}`);
    console.log(`[BASESCENE:${this.scene.key}] ✅ Zone confirmée: ${this.serverZoneConfirmed}`);
    console.log(`[BASESCENE:${this.scene.key}] 📡 NetworkManager: ${!!this.networkManager}`);
    console.log(`[BASESCENE:${this.scene.key}] 🔌 Connecté: ${this.networkManager?.isConnected || false}`);
    console.log(`[BASESCENE:${this.scene.key}] 🌍 GlobalTransitionManager: ${!!this.globalTransitionManager}`);
    if (this.networkManager) {
      this.networkManager.debugState();
    }
    if (this.globalTransitionManager) {
      this.globalTransitionManager.debugInfo();
    }
  }
}
