// client/src/scenes/zones/BaseZoneScene.js - VERSION SIMPLIFIÉE WORLDROOM
// ✅ NOUVELLE APPROCHE : LE SERVEUR DICTE TOUT, LE CLIENT OBÉIT
// ✅ UNE SEULE SOURCE DE VÉRITÉ : LE SERVEUR

import { NetworkManager } from "../../network/NetworkManager.js";
import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { TransitionManager } from '../../transitions/TransitionManager.js'; // ✅ AJOUTÉ
import { integrateShopToScene } from "../../game/ShopIntegration.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super({ key: sceneKey });
    this.mapKey = mapKey;
    this.phaserTilesets = [];
    this.layers = {};
    
    // ✅ SIMPLIFIÉ : Variables d'état principales
    this.mySessionId = null;
    this.networkManager = null;
    this.isSceneReady = false;
    this.myPlayerReady = false;
    
    // ✅ NOUVEAU : Zone gérée par le serveur uniquement
    this.currentZone = null; // ❌ PLUS DE this.zoneName
    this.serverZoneConfirmed = false;
    
    // ✅ SIMPLIFIÉ : État de jeu
    this.cameraFollowing = false;
    this.lastDirection = 'down';
    this.lastMoveTime = 0;
    
    // ✅ SYSTÈMES
    this.inventorySystem = null;
    this.shopIntegration = null;
    
    console.log(`🎮 [${sceneKey}] === CONSTRUCTION SCÈNE SIMPLIFIÉE ===`);
  }

  // ✅ PHASE 1 : PRÉCHARGEMENT
  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);
    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  // ✅ PHASE 2 : CRÉATION DE LA SCÈNE
  create() {
    if (window.showLoadingOverlay) window.showLoadingOverlay("Chargement de la zone...");
    
    console.log(`🎮 [${this.scene.key}] === PHASE 2: CRÉATION ===`);
    console.log(`📊 Scene data:`, this.scene.settings.data);

    // ✅ ÉTAPE 1 : Base de la scène
    this.createAnimations();
    this.loadMap();
    this.setupInputs();
    this.createUI();
    
    // ✅ ÉTAPE 2 : Managers
    this.setupManagers();
    
    // ✅ ÉTAPE 3 : Intégrations
if (!this.transitionManager) {
  this.transitionManager = new TransitionManager(this);
  this.transitionManager.initialize();
  console.log(`[DEBUG] TransitionManager (re)créé dans create()`);
}
    
    // ✅ ÉTAPE 4 : Réseau (LE PLUS CRITIQUE)
    this.initializeNetworking();
    
    // ✅ ÉTAPE 5 : Finalisation
    this.isSceneReady = true;
    this.setupCleanupHandlers();
    
    console.log(`🎮 [${this.scene.key}] ✅ Création terminée`);
  }

  // ✅ PHASE 3 : INITIALISATION RÉSEAU SIMPLIFIÉE
  initializeNetworking() {
    console.log(`📡 [${this.scene.key}] === PHASE 3: RÉSEAU ===`);
    
    const sceneData = this.scene.settings.data;
    
    // CAS 1 : NetworkManager fourni (transition normale)
    if (sceneData?.networkManager) {
      console.log(`📡 [${this.scene.key}] NetworkManager fourni via transition`);
      this.useExistingNetwork(sceneData.networkManager, sceneData);
      return;
    }
    
    // CAS 2 : Chercher NetworkManager existant
    const existingNetwork = this.findExistingNetwork();
    if (existingNetwork) {
      console.log(`📡 [${this.scene.key}] NetworkManager trouvé ailleurs`);
      this.useExistingNetwork(existingNetwork);
      return;
    }
    
    // CAS 3 : Première connexion (BeachScene seulement)
    if (this.scene.key === 'BeachScene') {
      console.log(`📡 [${this.scene.key}] Première connexion WorldRoom`);
      this.createNewConnection();
    } else {
      console.error(`❌ [${this.scene.key}] Aucun NetworkManager et pas BeachScene!`);
      this.showError("Erreur: Connexion réseau manquante");
    }
  }

  // ✅ UTILISER RÉSEAU EXISTANT
  useExistingNetwork(networkManager, sceneData = null) {
    console.log(`📡 [${this.scene.key}] === UTILISATION RÉSEAU EXISTANT ===`);
    
    this.networkManager = networkManager;
    this.mySessionId = networkManager.getSessionId();
    
    // ✅ SYNCHRONISER PLAYERMASTER
    if (this.playerManager) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
    
    // ✅ SETUP HANDLERS
    this.setupNetworkHandlers();
    
    // ✅ SYSTÈMES ADDITIONNELS
    this.initializeInventorySystem();
    integrateShopToScene(this, this.networkManager);
    
    // ✅ DEMANDER ZONE AU SERVEUR IMMÉDIATEMENT
    this.requestServerZone();
    
    // ✅ GÉRER DONNÉES DE TRANSITION
    if (sceneData?.fromTransition) {
      this.handleTransitionData(sceneData);
    }
    
    console.log(`📡 [${this.scene.key}] ✅ Réseau existant configuré`);
  }

  // ✅ CHERCHER RÉSEAU EXISTANT
  findExistingNetwork() {
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

  // ✅ NOUVELLE CONNEXION
  async createNewConnection() {
    console.log(`📡 [${this.scene.key}] === NOUVELLE CONNEXION ===`);
    
    try {
      // ✅ PRÉPARER DONNÉES
      const connectionData = await this.prepareConnectionData();
      
      // ✅ CRÉER NETWORKMANAGER
      this.networkManager = new NetworkManager(connectionData.identifier);
      this.setupNetworkHandlers();
      
      // ✅ CONNECTER
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
        
        // ✅ SYSTÈMES
        this.initializeInventorySystem();
        integrateShopToScene(this, this.networkManager);
        
        console.log(`✅ [${this.scene.key}] Connexion réussie: ${this.mySessionId}`);
      } else {
        throw new Error("Échec de connexion au serveur");
      }
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur connexion:`, error);
      this.showError(`Erreur de connexion: ${error.message}`);
    }
  }

  // ✅ PRÉPARER DONNÉES DE CONNEXION
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

  // ✅ SETUP HANDLERS RÉSEAU SIMPLIFIÉS
  setupNetworkHandlers() {
    console.log(`📡 [${this.scene.key}] === SETUP HANDLERS ===`);
    
    // ✅ HANDLER 1 : ZONE OFFICIELLE DU SERVEUR (CRITIQUE)
    this.networkManager.onCurrentZone((data) => {
      console.log(`📍 [${this.scene.key}] === ZONE SERVEUR REÇUE ===`);
      console.log(`🎯 Zone: ${data.zone}`);
      console.log(`📊 Position: (${data.x}, ${data.y})`);
      
      // ✅ APPLIQUER LA VÉRITÉ DU SERVEUR
      this.currentZone = data.zone;
      this.serverZoneConfirmed = true;
      
      // ✅ VÉRIFIER COHÉRENCE SCÈNE
      const expectedScene = this.mapZoneToScene(this.currentZone);
      if (expectedScene && expectedScene !== this.scene.key) {
        console.warn(`⚠️ [${this.scene.key}] SCÈNE INCORRECTE !`);
        console.warn(`   Scène actuelle: ${this.scene.key}`);
        console.warn(`   Scène attendue: ${expectedScene}`);
        
        // ✅ REDIRECTION AUTOMATIQUE
        this.redirectToCorrectScene(expectedScene, data);
        return;
      }
      
      // ✅ SYNCHRONISER MANAGERS
      if (this.playerManager) {
        this.playerManager.currentZone = this.currentZone;
      }
      if (this.transitionManager) {
        this.transitionManager.currentZone = this.currentZone;
      }
      
      console.log(`✅ [${this.scene.key}] Zone serveur confirmée: ${this.currentZone}`);
    });

    // ✅ HANDLER 2 : CONNEXION ÉTABLIE - AMÉLIORÉ
    this.networkManager.onConnect(() => {
      console.log(`✅ [${this.scene.key}] Connexion établie`);
      
      // ✅ VÉRIFIER SI C'EST UNE RECONNEXION
      const currentSessionId = this.networkManager.getSessionId();
      if (this.mySessionId && this.mySessionId !== currentSessionId) {
        console.log(`🔄 [${this.scene.key}] RECONNEXION DÉTECTÉE`);
        console.log(`📍 Ancien SessionId: ${this.mySessionId}`);
        console.log(`📍 Nouveau SessionId: ${currentSessionId}`);
        
        // ✅ Mettre à jour le sessionId
        this.mySessionId = currentSessionId;
        if (this.playerManager) {
          this.playerManager.setMySessionId(this.mySessionId);
        }
        
        // ✅ Reset état du joueur
        this.myPlayerReady = false;
        
        // ✅ Forcer resynchronisation
        this.time.delayedCall(500, () => {
          this.handleMissingPlayer();
        });
      } else {
        // ✅ DEMANDER ZONE IMMÉDIATEMENT (première connexion)
        setTimeout(() => {
          this.requestServerZone();
        }, 100);
      }
      
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnected to WorldRoom!`);
      this.initializeQuestSystem();
    });

    // ✅ HANDLER 3 : ÉTAT DU JEU - AMÉLIORÉ
    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête`);
        return;
      }
      
      if (!state?.players || !this.playerManager) return;
      
      // ✅ LOG DU STATE REÇU
      console.log(`📊 [${this.scene.key}] State reçu: ${state.players.size} joueurs`);
      
      this.playerManager.updatePlayers(state);
      
      // ✅ GÉRER JOUEUR LOCAL AVEC TIMEOUT
      this.handleMyPlayerFromState();
      
      // ✅ NOUVEAU : Si toujours pas de joueur après state, déclencher récupération
      if (!this.myPlayerReady && this.mySessionId) {
        this.time.delayedCall(100, () => {
          if (!this.myPlayerReady) {
            console.warn(`⚠️ [${this.scene.key}] Joueur toujours manquant après state update`);
            this.handleMissingPlayer();
          }
        });
      }
    });

    // ✅ HANDLER 4 : ZONE DATA
    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      
      if (data.zone === this.currentZone) {
        this.handleZoneData(data);
      }
    });

    // ✅ HANDLER 5 : NPCS
    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] NPCs reçus: ${npcs.length}`);
      
      if (this.npcManager && npcs.length > 0) {
        this.npcManager.spawnNpcs(npcs);
      }
    });

    // ✅ HANDLER 6 : TRANSITIONS - GÉRÉ PAR TRANSITIONMANAGER
    // Le TransitionManager gère déjà les callbacks onTransitionValidation
    // Pas besoin de handler ici pour éviter les conflits

    // ✅ HANDLER 7 : INTERACTIONS NPC
    this.networkManager.onNpcInteraction((result) => {
      console.log(`💬 [${this.scene.key}] NPC interaction:`, result);
      this.handleNpcInteraction(result);
    });

    // ✅ HANDLER 8 : SNAP POSITION
    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });

    // ✅ HANDLER 9 : DÉCONNEXION - AMÉLIORÉ
    this.networkManager.onDisconnect(() => {
      console.log(`❌ [${this.scene.key}] Déconnexion détectée`);
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nConnexion perdue...\nTentative reconnexion...`);
      
      // ✅ NOUVEAU : Marquer joueur comme non prêt
      this.myPlayerReady = false;
      
      // ✅ NOUVEAU : Désactiver temporairement les transitions
      if (this.transitionManager) {
        this.transitionManager.setActive(false);
        console.log(`🚫 [${this.scene.key}] Transitions désactivées (déconnexion)`);
      }
    });

    console.log(`📡 [${this.scene.key}] ✅ Handlers configurés`);
  }

  // ✅ DEMANDER ZONE AU SERVEUR
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
    
    console.log(`📤 [${this.scene.key}] Demande de zone envoyée`);
  }

  // ✅ REDIRECTION VERS BONNE SCÈNE
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

  // ✅ GÉRER JOUEUR LOCAL DEPUIS STATE - VERSION AMÉLIORÉE
handleMyPlayerFromState() {
  if (this.myPlayerReady) return;

  // Cherche le player DANS LE STATE NETWORKMANAGER
  const playerData = this.networkManager?.state?.players?.get(this.mySessionId);
  let myPlayer = this.playerManager.getMyPlayer();

  // Si le player existe déjà localement mais pas "ready", on finalise l'init
  if (myPlayer && playerData) {
    this.myPlayerReady = true;
    console.log(`✅ [${this.scene.key}] Joueur local trouvé: ${this.mySessionId}`);

    if (window.hideLoadingOverlay) window.hideLoadingOverlay();

    // Forcer la visibilité
    myPlayer.setVisible(true);
    myPlayer.setActive(true);
    myPlayer.setDepth(5);

    // Caméra et position (optionnel: reprends ta logique existante ici)
    this.cameraManager.followPlayer(myPlayer);
    this.cameraFollowing = true;
    this.positionPlayer(myPlayer);

    if (typeof this.onPlayerReady === 'function') {
      this.onPlayerReady(myPlayer);
    }

    // Arrêt de l'ancienne scène proprement (une fois qu'on a le player)
    if (window.pendingSceneStop) {
      this.scene.scene.stop(window.pendingSceneStop);
      console.log(`[BaseZoneScene] Ancienne scène stoppée proprement après arrivée du joueur`);
      window.pendingSceneStop = null;
    }
    return;
  }

  // Si le joueur n'existe pas encore localement MAIS il est dans le state → on le crée
  if (!myPlayer && playerData) {
    // Création du player à la position donnée par le serveur (toujours !)
    myPlayer = this.playerManager.createPlayer(this.mySessionId, playerData.x, playerData.y);

    // Re-appel pour finaliser setup (ça passe dans la branche au-dessus)
    this.handleMyPlayerFromState();
    return;
  }

  // Si pas encore dans le state, on bloque et affiche un overlay
  if (!playerData) {
    // Affiche un loading si pas déjà visible
    if (!this._waitingForPlayer) {
      this._waitingForPlayer = true;
      if (window.showLoadingOverlay) window.showLoadingOverlay("Connexion à la nouvelle zone...");
      console.log(`[${this.scene.key}] Attente joueur dans le state serveur...`);
    }
    // On ne fait rien d'autre : on attend que Colyseus renvoie un state où le joueur est là
    return;
  }
}

  // ✅ NOUVELLE MÉTHODE : Gérer les joueurs manquants
  handleMissingPlayer() {
    console.log(`🔧 [${this.scene.key}] === RÉCUPÉRATION JOUEUR MANQUANT ===`);
    
    // ✅ Vérifier si on a les bonnes données
    if (!this.mySessionId || !this.networkManager?.isConnected) {
      console.error(`❌ [${this.scene.key}] Données manquantes pour récupération joueur`);
      return;
    }
    
    // ✅ Demander resynchronisation au serveur
    console.log(`📡 [${this.scene.key}] Demande de resynchronisation...`);
    
    if (this.networkManager.room) {
      this.networkManager.room.send("requestSync", {
        sessionId: this.mySessionId,
        currentZone: this.networkManager.getCurrentZone()
      });
    }
    
    // ✅ Forcer refresh du state
    this.time.delayedCall(500, () => {
      if (!this.myPlayerReady && this.playerManager) {
        console.log(`🔄 [${this.scene.key}] Force resynchronisation PlayerManager...`);
        this.playerManager.forceResynchronization();
        
        // ✅ Si toujours pas de joueur, créer manuellement
        this.time.delayedCall(1000, () => {
          if (!this.myPlayerReady) {
            this.createEmergencyPlayer();
          }
        });
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE : Création d'urgence du joueur
  createEmergencyPlayer() {
    console.log(`🚨 [${this.scene.key}] === CRÉATION JOUEUR D'URGENCE ===`);
    
    if (!this.playerManager || this.myPlayerReady) return;
    
    // ✅ Position par défaut ou depuis transition
    const initData = this.scene.settings.data;
    let spawnX, spawnY;
    
    // ✅ NOUVEAU : Vérifier toutes les sources de position
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      spawnX = initData.spawnX;
      spawnY = initData.spawnY;
      console.log(`🚨 [${this.scene.key}] Position urgence depuis transition: (${spawnX}, ${spawnY})`);
    } else if (initData?.serverResult?.position) {
      spawnX = initData.serverResult.position.x;
      spawnY = initData.serverResult.position.y;
      console.log(`🚨 [${this.scene.key}] Position urgence depuis serverResult: (${spawnX}, ${spawnY})`);
    } else {
      const defaultPos = this.getDefaultSpawnPosition();
      spawnX = defaultPos.x;
      spawnY = defaultPos.y;
      console.log(`🚨 [${this.scene.key}] Position urgence par défaut: (${spawnX}, ${spawnY})`);
    }
    
    console.log(`🚨 [${this.scene.key}] Création joueur urgence FINALE à (${spawnX}, ${spawnY})`);
    
    try {
      const emergencyPlayer = this.playerManager.createPlayer(this.mySessionId, spawnX, spawnY);
      
      if (emergencyPlayer) {
        console.log(`✅ [${this.scene.key}] Joueur d'urgence créé avec succès à (${spawnX}, ${spawnY})`);
        
        // ✅ Configuration immédiate
        emergencyPlayer.setVisible(true);
        emergencyPlayer.setActive(true);
        emergencyPlayer.setDepth(5);
        
        // ✅ Caméra
        this.cameraManager.followPlayer(emergencyPlayer);
        this.cameraFollowing = true;
        this.myPlayerReady = true;
        
        if (window.hideLoadingOverlay) window.hideLoadingOverlay();
        
        // ✅ Notifier le serveur de la position FINALE
        if (this.networkManager?.isConnected) {
          console.log(`📤 [${this.scene.key}] Envoi position urgence au serveur: (${spawnX}, ${spawnY})`);
          this.networkManager.sendMove(spawnX, spawnY, 'down', false);
        }
        if (!this.transitionManager) {
  this.transitionManager = new TransitionManager(this);
  this.transitionManager.initialize();
  console.log(`[DEBUG] TransitionManager réinitialisé après urgence`);
}

        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(emergencyPlayer);
        }
      } else {
        console.error(`❌ [${this.scene.key}] Échec création joueur d'urgence`);
        this.showError("Erreur: Impossible de créer le joueur");
      }
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur création joueur d'urgence:`, error);
      this.showError(`Erreur joueur: ${error.message}`);
    }
  }

  // ✅ POSITION DU JOUEUR - CORRIGÉE POUR TRANSITIONS
  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    console.log(`📍 [${this.scene.key}] === POSITIONNEMENT JOUEUR ===`);
    console.log(`📊 InitData:`, initData);
    console.log(`👤 Position actuelle joueur: (${player.x}, ${player.y})`);
    
    let finalX, finalY;
    
    // ✅ CAS 1 : Transition avec spawn serveur (PRIORITÉ ABSOLUE)
    if (initData?.fromTransition && (initData.spawnX !== undefined || initData.spawnY !== undefined)) {
      finalX = initData.spawnX;
      finalY = initData.spawnY;
      console.log(`📍 [${this.scene.key}] Position depuis SERVEUR (transition): (${finalX}, ${finalY})`);
    }
    // ✅ CAS 2 : Données serveur dans serverResult
    else if (initData?.serverResult?.position) {
      finalX = initData.serverResult.position.x;
      finalY = initData.serverResult.position.y;
      console.log(`📍 [${this.scene.key}] Position depuis serverResult: (${finalX}, ${finalY})`);
    }
    // ✅ CAS 3 : Position par défaut
    else {
      const defaultPos = this.getDefaultSpawnPosition();
      finalX = defaultPos.x;
      finalY = defaultPos.y;
      console.log(`📍 [${this.scene.key}] Position par défaut: (${finalX}, ${finalY})`);
    }

    // ✅ APPLIQUER LA POSITION FINALE
    console.log(`🎯 [${this.scene.key}] POSITION FINALE: (${finalX}, ${finalY})`);
    
    player.x = finalX;
    player.y = finalY;
    player.targetX = finalX;
    player.targetY = finalY;

    // ✅ FINALISER
    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);

    if (player.indicator) {
      player.indicator.x = finalX;
      player.indicator.y = finalY - 32;
      player.indicator.setVisible(true);
    }

    // ✅ ENVOYER AU SERVEUR LA POSITION CONFIRMÉE
    if (this.networkManager?.isConnected) {
      console.log(`📤 [${this.scene.key}] Envoi position au serveur: (${finalX}, ${finalY})`);
      this.networkManager.sendMove(finalX, finalY, 'down', false);
    }
    
    console.log(`✅ [${this.scene.key}] Joueur positionné à: (${finalX}, ${finalY})`);
  }

  // ✅ GÉRER DONNÉES DE TRANSITION - AVEC DÉLAI DE GRÂCE
  handleTransitionData(sceneData) {
    console.log(`🔄 [${this.scene.key}] Gestion données transition:`, sceneData);
    
    // ✅ NOUVEAU : Activer délai de grâce après transition
    if (sceneData.fromTransition) {
      console.log(`🛡️ [${this.scene.key}] Activation délai de grâce post-transition...`);
      
      this.time.delayedCall(500, () => {
        if (this.transitionManager) {
          this.transitionManager.activateGracePeriod(3000); // 3 secondes
          console.log(`🛡️ [${this.scene.key}] Délai de grâce activé: aucune transition pendant 3s`);
        }
      });
    }
    
    // ✅ ROLLBACK
    if (sceneData.isRollback && sceneData.restorePlayerState && this.playerManager) {
      console.log(`🔄 [${this.scene.key}] Rollback détecté`);
      
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
        
        console.log(`✅ [${this.scene.key}] État joueur restauré après rollback`);
      }
    }
    
    // ✅ FORCER RESYNCHRONISATION
    if (sceneData.fromTransition && this.playerManager) {
      this.time.delayedCall(100, () => {
        this.playerManager.forceResynchronization();
      });
    }
    
    // ✅ RÉACTIVER TRANSITIONS APRÈS CHANGEMENT DE SCÈNE
    if (sceneData.fromTransition) {
      console.log(`🔄 [${this.scene.key}] Post-transition: vérification TransitionManager...`);
      
      this.time.delayedCall(500, () => {
        this.ensureTransitionsActive();
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE : S'assurer que les transitions sont actives
  ensureTransitionsActive() {
    console.log(`🔧 [${this.scene.key}] === VÉRIFICATION TRANSITIONS ===`);
    
    if (!this.transitionManager) {
      console.warn(`⚠️ [${this.scene.key}] TransitionManager manquant!`);
      return;
    }
    
    // ✅ Debug état
    console.log(`🔍 [${this.scene.key}] État TransitionManager:`);
    console.log(`  - isActive: ${this.transitionManager.isActive}`);
    console.log(`  - isTransitioning: ${this.transitionManager.isTransitioning}`);
    console.log(`  - teleportZones: ${this.transitionManager.teleportZones.size}`);
    
    // ✅ Réactiver si nécessaire
    if (!this.transitionManager.isActive) {
      console.log(`🔧 [${this.scene.key}] Réactivation TransitionManager...`);
      this.transitionManager.setActive(true);
    }
    
    // ✅ Reset état transition si bloqué
    if (this.transitionManager.isTransitioning) {
      console.log(`🔧 [${this.scene.key}] Reset état transition bloqué...`);
      this.transitionManager.isTransitioning = false;
    }
    
    // ✅ Réinitialiser si pas de téléports
    if (this.transitionManager.teleportZones.size === 0) {
      console.log(`🔧 [${this.scene.key}] Aucun téléport trouvé, réinitialisation...`);
      
      if (this.map) {
        this.transitionManager.destroy();
        this.transitionManager = new TransitionManager(this);
        this.transitionManager.initialize();
        
        console.log(`✅ [${this.scene.key}] TransitionManager réinitialisé`);
      } else {
        console.warn(`⚠️ [${this.scene.key}] Map pas encore chargée pour réinit transitions`);
      }
    }
    
    // ✅ Log final
    console.log(`✅ [${this.scene.key}] Vérification transitions terminée`);
    this.transitionManager.debugInfo();
  }

  // ✅ GESTION TRANSITIONS - DÉLÉGUÉE AU TRANSITIONMANAGER
  handleTransitionSuccess(result) {
    console.log(`✅ [${this.scene.key}] Transition réussie (délégué au TransitionManager):`, result);
    // Le TransitionManager gère le changement de scène automatiquement
  }

  handleTransitionError(result) {
    console.error(`❌ [${this.scene.key}] Transition échouée:`, result);
    this.showNotification(`Transition impossible: ${result.reason}`, 'error');
  }

  // ✅ GESTION ZONE DATA
  handleZoneData(data) {
    console.log(`🗺️ [${this.scene.key}] Handling zone data:`, data);
    
    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }
  }

  // ✅ INTERACTIONS NPC SIMPLIFIÉES
  handleNpcInteraction(result) {
    console.log("💬 [npcInteractionResult] Reçu :", result);

    if (window._questDialogActive) {
      console.log("⚠️ Fenêtre de quête déjà ouverte, interaction ignorée");
      return;
    }

    // ✅ SHOP
    if (result.type === "shop") {
      if (this.shopIntegration?.getShopSystem()) {
        this.shopIntegration.handleShopNpcInteraction(result);
        return;
      }
    }
    
    // ✅ DIALOGUE
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
    
    // ✅ QUÊTES
    else if (result.type === "questGiver" || result.type === "questComplete" || result.type === "questProgress") {
      if (window.questSystem?.handleNpcInteraction) {
        window.questSystem.handleNpcInteraction(result);
      }
    }
    
    // ✅ AUTRES
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

  // ✅ INITIALISATION SYSTÈMES
  initializeInventorySystem() {
    if (window.inventorySystem) {
      console.log(`🎒 [${this.scene.key}] Réutilisation inventaire global`);
      if (this.networkManager?.room) {
        window.inventorySystem.gameRoom = this.networkManager.room;
        window.inventorySystem.setupServerListeners();
      }
      this.inventorySystem = window.inventorySystem;
      return;
    }

    try {
      console.log(`🎒 [${this.scene.key}] Initialisation inventaire...`);
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);

      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }

      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;

      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }

      console.log(`✅ [${this.scene.key}] Inventaire initialisé`);

      this.time.delayedCall(2000, () => {
        this.inventorySystem?.requestInventoryData();
      });

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur inventaire:`, error);
    }
  }

  initializeQuestSystem() {
    if (!window.questSystem && this.networkManager?.room) {
      try {
        window.questSystem = new QuestSystem(this, this.networkManager.room);
        console.log("✅ QuestSystem initialisé");
      } catch (e) {
        console.error("❌ Erreur QuestSystem:", e);
      }
    }
  }

  // ✅ UPDATE SIMPLIFIÉ AVEC VÉRIFICATIONS
  update() {
    TransitionIntegration.updateTransitions(this);

    if (this.transitionManager && this.playerManager?.getMyPlayer()) {
  this.transitionManager.checkCollisions(this.playerManager.getMyPlayer());
}
    // ✅ NOUVEAU : Vérification périodique de l'état du joueur
    if (this.time.now % 2000 < 16) { // Toutes les 2 secondes
      this.checkPlayerHealth();
    }

    if (this.playerManager) this.playerManager.update();
    if (this.cameraManager) this.cameraManager.update();

    if (this.sys.animatedTiles?.update) {
      this.sys.animatedTiles.update();
    }

    // ✅ COORDONNÉES
    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }

    // ✅ MOUVEMENT
    this.handleMovement();
  }

  // ✅ NOUVELLE MÉTHODE : Vérification santé du joueur
  checkPlayerHealth() {
    // ✅ Si on a un sessionId mais pas de joueur prêt
    if (this.mySessionId && !this.myPlayerReady && this.networkManager?.isConnected) {
      const myPlayer = this.playerManager?.getMyPlayer();
      
      if (!myPlayer) {
        console.warn(`🏥 [${this.scene.key}] Vérification santé: Joueur manquant`);
        this.handleMissingPlayer();
      } else if (!myPlayer.visible || !myPlayer.active) {
        console.warn(`🏥 [${this.scene.key}] Vérification santé: Joueur invisible/inactif`);
        
        // ✅ Restaurer visibilité
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

  // ✅ MOUVEMENT SIMPLIFIÉ
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

  // ✅ NETTOYAGE SIMPLIFIÉ
  cleanup() {
    console.log(`🧹 [${this.scene.key}] Nettoyage...`);
    
    TransitionIntegration.cleanupTransitions(this);
    
    const isTransition = this.networkManager?.isTransitioning();
    
    if (!isTransition) {
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }

    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.isSceneReady = false;
    this.serverZoneConfirmed = false;
    
    console.log(`✅ [${this.scene.key}] Nettoyage terminé`);
  }

  setupCleanupHandlers() {
    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
  }

  // ✅ SETUP MÉTHODES
  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
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
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // ✅ INTERACTION E SIMPLIFIÉE
    this.input.keyboard.on("keydown-E", () => {
      // ✅ VÉRIFICATIONS DE BLOCAGE
      if (window._questDialogActive) {
        console.log("⚠️ Fenêtre de quête ouverte, interaction E bloquée");
        return;
      }
      
      if (typeof window.isChatFocused === "function" && window.isChatFocused()) {
        console.log("⚠️ Chat ouvert, interaction E bloquée");
        return;
      }
      
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display !== 'none') {
        console.log("⚠️ Dialogue NPC ouvert, interaction bloquée");
        return;
      }
      
      if (typeof window.isInventoryOpen === "function" && window.isInventoryOpen()) {
        console.log("⚠️ Inventaire ouvert, interaction E bloquée");
        return;
      }

      if (this.isShopOpen()) {
        console.log("⚠️ Shop ouvert, interaction E bloquée");
        return;
      }

      // ✅ INTERACTION NPC
      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer || !this.npcManager) return;

      const npc = this.npcManager.getClosestNpc(myPlayer.x, myPlayer.y, 64);
      if (npc) {
        console.log(`🎯 Interaction avec NPC: ${npc.name}`);
        this.npcManager.lastInteractedNpc = npc;
        this.networkManager?.sendNpcInteract(npc.id);
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

  loadMap() {
    console.log(`🗺️ [${this.scene.key}] === CHARGEMENT MAP ===`);
    
    this.map = this.make.tilemap({ key: this.mapKey });

    console.log(`🗺️ Map: ${this.mapKey}`);
    console.log(`🗺️ Tilesets:`, this.map.tilesets.map(ts => ts.name));
    console.log(`🗺️ Layers:`, this.map.layers.map(l => l.name));

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        console.log(`🗺️ Chargement tileset: ${tileset.name}`);
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
      console.log(`✅ [${this.scene.key}] Map chargée`);
    };

    if (needsLoading) {
      this.load.once('complete', finishLoad);
      this.load.start();
    } else {
      finishLoad();
    }
  }

  setupScene() {
    console.log(`🎬 [${this.scene.key}] === SETUP SCÈNE ===`);
    
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
    
    console.log(`✅ [${this.scene.key}] Scène configurée`);
  }

  // ✅ UTILITAIRES SIMPLIFIÉS
  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  showError(message) {
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();
    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    
    this.time.delayedCall(5000, () => {
      console.log(`🔄 [${this.scene.key}] Tentative de reconnexion...`);
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

  // ✅ MAPPING ZONE ↔ SCÈNE
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

  // ✅ SHOP UTILITAIRES
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
      console.log(`🔍 [${this.scene.key}] Aucune intégration shop`);
    }
  }

  // ✅ HOOKS POUR CLASSES ENFANTS
onPlayerReady(player) {
  // ... ton code existant

  // Utilise une variable d'instance pour éviter de la re-déclarer à chaque fois
  this.hasStoppedPreviousScene = false;

  // Récupération du nom de la scène précédente (doit être passé dans tes transitionData)
  const previousSceneKey = this.initData?.fromScene;

  // Petite sécurité : si on vient d'une autre scène
  if (previousSceneKey && previousSceneKey !== this.scene.key) {
    const onFirstMove = (event) => {
      if (!this.hasStoppedPreviousScene) {
        this.hasStoppedPreviousScene = true;
        if (this.scene.isActive(previousSceneKey)) {
          this.scene.stop(previousSceneKey);
          console.log(`[TransitionManager] Scène précédente (${previousSceneKey}) stoppée après premier mouvement`);
        }
        // On retire le listener pour ne pas déclencher plusieurs fois
        this.input.keyboard.off('keydown', onFirstMove, this);
      }
    };

    // Ajoute le listener sur le clavier (après l'init du joueur)
    this.input.keyboard.on('keydown', onFirstMove, this);
  }
}



  // ✅ DEBUG
  debugState() {
    console.log(`🔍 [${this.scene.key}] === DEBUG ÉTAT ===`);
    console.log(`🎮 Scène prête: ${this.isSceneReady}`);
    console.log(`👤 Joueur prêt: ${this.myPlayerReady}`);
    console.log(`🆔 SessionId: ${this.mySessionId}`);
    console.log(`📍 Zone courante: ${this.currentZone}`);
    console.log(`✅ Zone confirmée: ${this.serverZoneConfirmed}`);
    console.log(`📡 NetworkManager: ${!!this.networkManager}`);
    console.log(`🔌 Connecté: ${this.networkManager?.isConnected || false}`);
    console.log(`🌀 En transition: ${this.networkManager?.isTransitioning() || false}`);
    
    if (this.networkManager) {
      this.networkManager.debugState();
    }
    
    if (this.transitionManager) {
      this.transitionManager.debugInfo();
    }
  }
}
