// ✅ SOLUTION 1 : Rendre NetworkManager vraiment global

// Dans BaseZoneScene.js - MODIFICATION initializeNetworking()
initializeNetworking() {
  console.log(`📡 [${this.scene.key}] === PHASE 3: RÉSEAU GLOBAL ===`);
  
  // ✅ NOUVEAU : Chercher TOUJOURS le NetworkManager global d'abord
  if (window.globalNetworkManager && window.globalNetworkManager.isConnected) {
    console.log(`📡 [${this.scene.key}] NetworkManager global trouvé et connecté`);
    this.useExistingNetwork(window.globalNetworkManager);
    return;
  }
  
  const sceneData = this.scene.settings.data;
  
  // CAS 1 : NetworkManager fourni via transition
  if (sceneData?.networkManager) {
    console.log(`📡 [${this.scene.key}] NetworkManager fourni via transition`);
    this.useExistingNetwork(sceneData.networkManager, sceneData);
    
    // ✅ NOUVEAU : Le rendre global
    window.globalNetworkManager = sceneData.networkManager;
    return;
  }
  
  // CAS 2 : Chercher NetworkManager existant
  const existingNetwork = this.findExistingNetwork();
  if (existingNetwork) {
    console.log(`📡 [${this.scene.key}] NetworkManager trouvé ailleurs`);
    this.useExistingNetwork(existingNetwork);
    
    // ✅ NOUVEAU : Le rendre global
    window.globalNetworkManager = existingNetwork;
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

// ✅ MODIFICATION createNewConnection()
async createNewConnection() {
  console.log(`📡 [${this.scene.key}] === NOUVELLE CONNEXION GLOBALE ===`);
  
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
      
      // ✅ NOUVEAU : Rendre global IMMÉDIATEMENT
      window.globalNetworkManager = this.networkManager;
      console.log(`📡 [${this.scene.key}] NetworkManager rendu global`);
      
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
