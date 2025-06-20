// client/src/components/scene/NetworkComponent.js
// ✅ Composant responsable de la gestion réseau

export class NetworkComponent {
  constructor(scene) {
    this.scene = scene;
    this.networkManager = null;
    this.mySessionId = null;
    this.isConnected = false;
    this.networkSetupComplete = false;
    
    // État de transition
    this.transitionState = {
      isInProgress: false,
      targetZone: null,
      startTime: 0,
      maxDuration: 10000
    };
    
    this.callbacks = {
      onConnect: null,
      onStateChange: null,
      onZoneData: null,
      onNpcList: null,
      onTransitionSuccess: null,
      onTransitionError: null,
      onNpcInteraction: null,
      onSnap: null
    };
  }

  // === INITIALISATION ===
  async initialize(sceneData = null) {
    console.log(`📡 [NetworkComponent] Initialisation pour ${this.scene.scene.key}...`);
    
    // Cas 1: NetworkManager fourni via sceneData
    if (sceneData?.networkManager) {
      console.log(`📡 NetworkManager reçu via transition`);
      this.useExistingNetworkManager(sceneData.networkManager, sceneData);
      return true;
    }
    
    // Cas 2: Chercher dans les autres scènes
    const existingNetworkManager = this.findExistingNetworkManager();
    if (existingNetworkManager) {
      console.log(`📡 NetworkManager trouvé dans autre scène`);
      this.useExistingNetworkManager(existingNetworkManager);
      return true;
    }
    
    // Cas 3: Première connexion (BeachScene uniquement)
    if (this.scene.scene.key === 'BeachScene') {
      console.log(`📡 Première connexion WorldRoom`);
      return await this.initializeNewConnection();
    }
    
    console.error(`❌ Aucun NetworkManager disponible pour ${this.scene.scene.key}`);
    return false;
  }

  useExistingNetworkManager(networkManager, sceneData = null) {
    this.networkManager = networkManager;
    this.mySessionId = networkManager.getSessionId();
    this.isConnected = true;
    
    this.setupNetworkHandlers();
    this.networkSetupComplete = true;
    
    // Vérifier l'état du réseau
    this.verifyNetworkState();
    
    if (this.callbacks.onConnect) {
      this.callbacks.onConnect();
    }
  }

  async initializeNewConnection() {
    try {
      const connectionData = await this.prepareConnectionData();
      
      const { NetworkManager } = await import("../../network/NetworkManager.js");
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
        this.isConnected = true;
        this.networkSetupComplete = true;
        
        if (this.callbacks.onConnect) {
          this.callbacks.onConnect();
        }
        
        return true;
      }
      
      throw new Error("Échec de connexion au serveur");
      
    } catch (error) {
      console.error(`❌ Erreur connexion:`, error);
      return false;
    }
  }

  // === GESTION DES ÉVÉNEMENTS ===
  setupNetworkHandlers() {
    if (!this.networkManager) return;

    // Handler de connexion
    this.networkManager.onConnect(() => {
      console.log(`✅ Connexion établie`);
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    // Handler d'état
    this.networkManager.onStateChange((state) => {
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(state);
      }
    });

    // Handlers WorldRoom
    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ Zone data reçue:`, data);
      if (this.callbacks.onZoneData) {
        this.callbacks.onZoneData(data);
      }
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 NPCs reçus: ${npcs.length}`);
      if (this.callbacks.onNpcList) {
        this.callbacks.onNpcList(npcs);
      }
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ Transition réussie:`, result);
      if (this.callbacks.onTransitionSuccess) {
        this.callbacks.onTransitionSuccess(result);
      }
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ Transition échouée:`, result);
      if (this.callbacks.onTransitionError) {
        this.callbacks.onTransitionError(result);
      }
    });

    this.networkManager.onNpcInteraction((result) => {
      console.log(`💬 NPC interaction:`, result);
      if (this.callbacks.onNpcInteraction) {
        this.callbacks.onNpcInteraction(result);
      }
    });

    this.networkManager.onSnap((data) => {
      if (this.callbacks.onSnap) {
        this.callbacks.onSnap(data);
      }
    });

    this.networkManager.onDisconnect(() => {
      this.isConnected = false;
    });
  }

  // === CALLBACKS ===
  onConnect(callback) { this.callbacks.onConnect = callback; }
  onStateChange(callback) { this.callbacks.onStateChange = callback; }
  onZoneData(callback) { this.callbacks.onZoneData = callback; }
  onNpcList(callback) { this.callbacks.onNpcList = callback; }
  onTransitionSuccess(callback) { this.callbacks.onTransitionSuccess = callback; }
  onTransitionError(callback) { this.callbacks.onTransitionError = callback; }
  onNpcInteraction(callback) { this.callbacks.onNpcInteraction = callback; }
  onSnap(callback) { this.callbacks.onSnap = callback; }

  // === ACTIONS RÉSEAU ===
  sendMove(x, y, direction, isMoving) {
    if (this.networkManager && this.isConnected) {
      this.networkManager.sendMove(x, y, direction, isMoving);
    }
  }

  sendNpcInteract(npcId) {
    if (this.networkManager && this.isConnected) {
      this.networkManager.sendNpcInteract(npcId);
    }
  }

  moveToZone(targetZone, spawnX, spawnY) {
    if (this.networkManager && this.isConnected) {
      return this.networkManager.moveToZone(targetZone, spawnX, spawnY);
    }
    return false;
  }

  // === UTILITAIRES ===
  findExistingNetworkManager() {
    const scenesToCheck = ['BeachScene', 'VillageScene', 'Road1Scene', 'VillageLabScene', 'VillageHouse1Scene', 'LavandiaScene'];
    
    for (const sceneName of scenesToCheck) {
      if (sceneName === this.scene.scene.key) continue;
      
      const scene = this.scene.scene.manager.getScene(sceneName);
      if (scene?.networkComponent?.networkManager?.isConnected) {
        return scene.networkComponent.networkManager;
      }
    }
    
    return null;
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

  verifyNetworkState() {
    if (!this.networkManager) {
      console.error(`❌ NetworkManager manquant`);
      return;
    }
    
    this.networkManager.debugState();
    this.networkManager.checkZoneSynchronization(this.scene.scene.key);
  }

  // === MAPPING ZONES ===
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

  // === GETTERS ===
  getNetworkManager() { return this.networkManager; }
  getSessionId() { return this.mySessionId; }
  isNetworkReady() { return this.networkSetupComplete && this.isConnected; }
  getCurrentZone() { return this.networkManager?.getCurrentZone(); }

  // === CLEANUP ===
  destroy() {
    this.callbacks = {};
    this.networkManager = null;
    this.mySessionId = null;
    this.isConnected = false;
    this.networkSetupComplete = false;
  }
}
