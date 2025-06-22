// client/src/transitions/TransitionManager.js
// ✅ VERSION CORRIGÉE - SYSTÈME DE TRANSITION STABLE

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    this.teleportZones = new Map();
    this.currentZone = this.getZoneFromScene(scene.scene.key);
    
    this.loadingOverlay = null;
    this.transitionTimeout = 8000;
    this.transitionTimeoutHandle = null;
    
    // ✅ Stocker les données de transition en cours
    this.currentTransitionData = null;
    this.pendingTransitionRequest = null;
    
    // ✅ Délai de grâce après transition
    this.graceTime = 0;
    this.graceDuration = 2000; // 2 secondes sans collision après transition
    
    console.log(`🌀 [TransitionManager] 📍 INIT zone: ${this.currentZone} (scène: ${scene.scene.key})`);
  }

  // ✅ Initialisation
  initialize() {
    console.log(`🌀 [TransitionManager] === INITIALISATION ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ ERREUR: Aucune map dans la scène!`);
      return false;
    }

    const worldsLayer = this.scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`🌀 [TransitionManager] ⚠️ WARN: Layer "Worlds" introuvable`);
      return false;
    }

    this.scanTeleports(worldsLayer);
    this.createCollisionZones();
    
    // ✅ Setup callback réseau IMMÉDIATEMENT
    this.setupNetworkCallback();
    
    this.isActive = true;
    this.logInitializationSummary();
    return true;
  }

  // ✅ NOUVEAU : Setup callback réseau centralisé
  setupNetworkCallback() {
    if (!this.scene.networkManager) {
      console.error(`🌀 [TransitionManager] ❌ Pas de NetworkManager!`);
      return;
    }

    console.log(`🌀 [TransitionManager] 📡 Setup callback transition...`);
    
    // ✅ Callback unique pour ce TransitionManager
    this.scene.networkManager.onTransitionValidation((result) => {
      console.log(`🌀 [TransitionManager] 📨 === CALLBACK TRANSITION REÇU ===`);
      console.log(`📊 Résultat:`, result);
      
      // ✅ Vérifier si c'est bien pour nous
      if (!this.isTransitioning || !this.pendingTransitionRequest) {
        console.warn(`🌀 [TransitionManager] ⚠️ Callback reçu mais pas en transition`);
        return;
      }
      
      this.handleTransitionResponse(result);
    });
    
    console.log(`🌀 [TransitionManager] ✅ Callback configuré`);
  }

  // ✅ Scanner téléports
  scanTeleports(worldsLayer) {
    console.log(`🌀 [TransitionManager] === SCAN TÉLÉPORTS ===`);
    
    let teleportCount = 0;
    let ignoredCount = 0;

    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      const objType = (obj.type || '').toLowerCase();
      
      if (objName === 'teleport' || objType === 'teleport') {
        const success = this.processTeleport(obj, index);
        if (success) {
          teleportCount++;
        } else {
          ignoredCount++;
        }
      } else {
        ignoredCount++;
      }
    });

    console.log(`🌀 [TransitionManager] 📊 RÉSULTAT: ${teleportCount} téléports, ${ignoredCount} ignorés`);
  }

  // ✅ Process téléport
  processTeleport(obj, index) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone || !targetSpawn) {
      console.error(`🌀 [TransitionManager] ❌ Téléport ${index} invalide`);
      return false;
    }

    const teleport = {
      id: `teleport_${index}`,
      x: obj.x,
      y: obj.y,
      width: obj.width || 32,
      height: obj.height || 32,
      targetZone: targetZone,
      targetSpawn: targetSpawn,
      fromZone: this.currentZone
    };

    this.teleportZones.set(teleport.id, teleport);
    console.log(`🌀 [TransitionManager] ✅ TÉLÉPORT: ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
    
    return true;
  }

  // ✅ Création zones collision
  createCollisionZones() {
    this.teleportZones.forEach((teleportData) => {
      const zone = this.scene.add.zone(
        teleportData.x + teleportData.width / 2,
        teleportData.y + teleportData.height / 2,
        teleportData.width,
        teleportData.height
      );

      this.scene.physics.world.enableBody(zone, Phaser.Physics.Arcade.STATIC_BODY);
      zone.body.setSize(teleportData.width, teleportData.height);
      zone.transitionData = teleportData;

      if (this.debugMode) {
        this.createDebugVisuals(zone, teleportData);
      }
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.teleportZones.size} zones collision créées`);
  }

  // ✅ Debug visuel
  createDebugVisuals(zone, teleportData) {
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.3
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(3, 0x00aa00);
    
    const debugText = this.scene.add.text(
      zone.x, zone.y - 25,
      `🚪 → ${teleportData.targetZone}`,
      {
        fontSize: '14px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 4 }
      }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
  }

  // ✅ Check collisions avec délai de grâce
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    // ✅ Vérifier délai de grâce
    const now = Date.now();
    if (this.graceTime > now) {
      return;
    }

    // ✅ Log périodique position joueur
    if (!this.lastPlayerLogTime || now - this.lastPlayerLogTime > 2000) {
      console.log(`🌀 [TransitionManager] 👤 Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      this.lastPlayerLogTime = now;
    }

    // ✅ Vérifier collisions
    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.log(`🌀 [TransitionManager] 💥 COLLISION DÉTECTÉE avec ${teleportData.id}!`);
        this.triggerTransition(teleportData);
      }
    });
  }

  // ✅ Test collision
  isPlayerCollidingWithTeleport(player, teleportData) {
    const playerBounds = {
      x: player.x - 16,
      y: player.y - 16,
      width: 32,
      height: 32
    };

    const teleportBounds = {
      x: teleportData.x,
      y: teleportData.y,
      width: teleportData.width,
      height: teleportData.height
    };

    return (
      playerBounds.x < teleportBounds.x + teleportBounds.width &&
      playerBounds.x + playerBounds.width > teleportBounds.x &&
      playerBounds.y < teleportBounds.y + teleportBounds.height &&
      playerBounds.y + playerBounds.height > teleportBounds.y
    );
  }

  // ✅ DÉCLENCHEMENT TRANSITION
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.warn(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === DÉBUT TRANSITION ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn: ${teleportData.targetSpawn}`);

    this.isTransitioning = true;
    this.currentTransitionData = teleportData;

    // ✅ Afficher loading
    this.showLoadingOverlay(teleportData);

    // ✅ Timeout de sécurité
    this.transitionTimeoutHandle = setTimeout(() => {
      console.error(`🌀 [TransitionManager] ⏰ TIMEOUT TRANSITION`);
      this.handleTransitionError({ reason: "Timeout de transition" });
    }, this.transitionTimeout);

    // ✅ Valider et corriger zone
    const correctionResult = await this.validateAndCorrectZone(teleportData);
    if (!correctionResult.success) {
      this.handleTransitionError(correctionResult);
      return;
    }

    // ✅ Envoyer requête
    this.sendTransitionRequest(correctionResult.correctedData);
  }

  // ✅ Validation zone
  async validateAndCorrectZone(teleportData) {
    const clientZone = this.scene.currentZone || this.currentZone;
    const serverZone = this.scene.networkManager?.getCurrentZone();
    
    console.log(`🌀 [TransitionManager] Validation zones:`);
    console.log(`  - Client: ${clientZone}`);
    console.log(`  - Serveur: ${serverZone}`);
    console.log(`  - Téléport: ${teleportData.fromZone}`);
    
    // ✅ Privilégier la zone serveur
    const correctedFromZone = serverZone || clientZone || teleportData.fromZone;
    
    if (correctedFromZone !== teleportData.fromZone) {
      console.log(`🔧 Zone corrigée: ${teleportData.fromZone} → ${correctedFromZone}`);
    }
    
    const correctedData = { ...teleportData, fromZone: correctedFromZone };
    return { success: true, correctedData };
  }

  // ✅ ENVOI REQUÊTE
  sendTransitionRequest(teleportData) {
    console.log(`🌀 [TransitionManager] === ENVOI SERVEUR ===`);
    
    if (!this.scene.networkManager?.room) {
      console.error(`❌ Pas de connexion serveur`);
      this.handleTransitionError({ reason: "Pas de connexion serveur" });
      return;
    }

    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.error(`❌ Joueur local introuvable`);
      this.handleTransitionError({ reason: "Joueur local introuvable" });
      return;
    }

    const request = {
      fromZone: teleportData.fromZone,
      targetZone: teleportData.targetZone,
      targetSpawn: teleportData.targetSpawn,
      playerX: Math.round(myPlayer.x),
      playerY: Math.round(myPlayer.y),
      teleportId: teleportData.id,
      timestamp: Date.now()
    };

    console.log(`📤 Envoi requête:`, request);
    
    // ✅ Stocker la requête en cours
    this.pendingTransitionRequest = request;
    
    // ✅ Envoyer au serveur
    this.scene.networkManager.room.send("validateTransition", request);
  }

  // ✅ HANDLER RÉPONSE SERVEUR
  handleTransitionResponse(result) {
    console.log(`🌀 [TransitionManager] === RÉPONSE SERVEUR REÇUE ===`);
    
    // ✅ Clear timeout
    this.clearTransitionTimeout();
    
    if (result.success) {
      this.handleTransitionSuccess(result);
    } else {
      this.handleTransitionError(result);
    }
  }

  // ✅ SUCCÈS TRANSITION
  handleTransitionSuccess(result) {
    console.log(`🌀 [TransitionManager] === TRANSITION VALIDÉE ===`);
    console.log(`📊 Résultat serveur:`, result);
    
    const targetZone = result.currentZone;
    const targetScene = this.getSceneFromZone(targetZone);
    
    if (!targetScene) {
      console.error(`❌ Scene introuvable pour zone: ${targetZone}`);
      this.handleTransitionError({ reason: `Zone inconnue: ${targetZone}` });
      return;
    }

    console.log(`🎯 Zone cible: ${targetZone}`);
    console.log(`🎬 Scène cible: ${targetScene}`);
    console.log(`🏠 Scène actuelle: ${this.scene.scene.key}`);

    // ✅ CAS 1: Même scène = repositionnement local
    if (targetScene === this.scene.scene.key) {
      console.log(`📍 === REPOSITIONNEMENT LOCAL ===`);
      this.repositionPlayer(result);
      this.completeTransition();
      return;
    }

    // ✅ CAS 2: Changement de scène
    console.log(`🚀 === CHANGEMENT DE SCÈNE ===`);
    this.performSceneTransition(targetScene, result);
  }

  // ✅ CHANGEMENT DE SCÈNE
  performSceneTransition(targetScene, serverResult) {
    console.log(`🚀 [TransitionManager] Transition vers: ${targetScene}`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      spawnX: serverResult.position?.x,
      spawnY: serverResult.position?.y,
      preservePlayer: true,
      serverResult: serverResult,
      teleportData: this.currentTransitionData
    };

    console.log(`📤 Données transition:`, transitionData);
    
    try {
      // ✅ Utiliser start() pour un changement propre
      this.scene.scene.start(targetScene, transitionData);
      console.log(`✅ Scene.start() appelé avec succès`);
      
    } catch (error) {
      console.error(`❌ Erreur changement de scène:`, error);
      this.handleTransitionError({ reason: `Erreur changement scène: ${error.message}` });
    }
  }

  // ✅ REPOSITIONNEMENT LOCAL
  repositionPlayer(result) {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer || !result.position) {
      console.error(`❌ Impossible de repositionner le joueur`);
      return;
    }
    
    console.log(`📍 Repositionnement: (${result.position.x}, ${result.position.y})`);
    
    // ✅ Mettre à jour position
    myPlayer.x = result.position.x;
    myPlayer.y = result.position.y;
    myPlayer.targetX = result.position.x;
    myPlayer.targetY = result.position.y;

    // ✅ Snap camera
    if (this.scene.cameraManager) {
      this.scene.cameraManager.snapToPlayer();
    }

    // ✅ Envoyer position au serveur
    if (this.scene.networkManager) {
      this.scene.networkManager.sendMove(
        result.position.x,
        result.position.y,
        'down',
        false
      );
    }
  }

  // ✅ ERREUR TRANSITION
  handleTransitionError(result) {
    console.error(`🌀 [TransitionManager] ❌ ERREUR TRANSITION:`, result.reason);
    
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.resetTransitionState();
    
    // ✅ Activer délai de grâce pour éviter re-trigger immédiat
    this.activateGracePeriod(3000);
  }

  // ✅ COMPLÉTER TRANSITION
  completeTransition() {
    console.log(`🌀 [TransitionManager] ✅ Transition terminée`);
    
    this.hideLoadingOverlay();
    this.resetTransitionState();
    
    // ✅ Activer délai de grâce
    this.activateGracePeriod();
  }

  // ✅ RESET ÉTAT
  resetTransitionState() {
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.pendingTransitionRequest = null;
    this.clearTransitionTimeout();
    
    console.log(`🌀 [TransitionManager] 🔄 État réinitialisé`);
  }

  // ✅ TIMEOUT
  clearTransitionTimeout() {
    if (this.transitionTimeoutHandle) {
      clearTimeout(this.transitionTimeoutHandle);
      this.transitionTimeoutHandle = null;
    }
  }

  // ✅ DÉLAI DE GRÂCE
  activateGracePeriod(duration = null) {
    const graceDuration = duration || this.graceDuration;
    this.graceTime = Date.now() + graceDuration;
    
    console.log(`🛡️ [TransitionManager] Délai de grâce: ${graceDuration}ms`);
  }

  // ✅ LOADING OVERLAY
  showLoadingOverlay(teleportData) {
    console.log(`🔄 [TransitionManager] Affichage loading...`);
    
    if (window.showLoadingOverlay) {
      window.showLoadingOverlay(`Transition vers ${teleportData.targetZone}...`);
      return;
    }
    
    // ✅ Fallback overlay interne
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
    }
    
    this.loadingOverlay = this.scene.add.container(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY
    ).setDepth(9999).setScrollFactor(0);
    
    const bg = this.scene.add.rectangle(0, 0, 
      this.scene.cameras.main.width, 
      this.scene.cameras.main.height, 
      0x000000, 0.8
    );
    
    const text = this.scene.add.text(0, 0, 
      `Transition vers ${teleportData.targetZone}...`, 
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    
    this.loadingOverlay.add([bg, text]);
  }

  hideLoadingOverlay() {
    if (window.hideLoadingOverlay) {
      window.hideLoadingOverlay();
    }
    
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
    
    console.log(`🔄 [TransitionManager] Loading masqué`);
  }

  // ✅ ERREUR POPUP
  showErrorPopup(message) {
    console.log(`🚫 [TransitionManager] Erreur: ${message}`);
    
    if (this.scene.showNotification) {
      this.scene.showNotification(message, 'error');
    } else {
      // ✅ Fallback notification
      const notification = this.scene.add.text(
        this.scene.cameras.main.centerX,
        100,
        message,
        {
          fontSize: '18px',
          color: '#ff4444',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(10000);
      
      this.scene.time.delayedCall(3000, () => {
        if (notification.scene) notification.destroy();
      });
    }
  }

  // ✅ HELPERS
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  getZoneFromScene(sceneName) {
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

  getSceneFromZone(zoneName) {
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

  // ✅ DEBUG
  logInitializationSummary() {
    console.log(`🌀 [TransitionManager] === RÉSUMÉ ===`);
    console.log(`📍 Zone: ${this.currentZone}`);
    console.log(`🔧 État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`📍 Téléports: ${this.teleportZones.size}`);
    
    if (this.teleportZones.size > 0) {
      this.teleportZones.forEach((teleport, id) => {
        console.log(`  - ${id}: → ${teleport.targetZone}[${teleport.targetSpawn}]`);
      });
    }
  }

  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG ===`);
    console.log(`🔧 Active: ${this.isActive}`);
    console.log(`🌀 En transition: ${this.isTransitioning}`);
    console.log(`📍 Zone: ${this.currentZone}`);
    console.log(`🚪 Téléports: ${this.teleportZones.size}`);
    console.log(`🛡️ Grace time: ${this.graceTime > Date.now() ? 'OUI' : 'NON'}`);
    
    if (this.pendingTransitionRequest) {
      console.log(`📤 Requête en cours:`, this.pendingTransitionRequest);
    }
  }

  // ✅ DESTRUCTION
  destroy() {
    console.log(`🌀 [TransitionManager] 💀 Destruction...`);
    
    this.hideLoadingOverlay();
    this.clearTransitionTimeout();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.pendingTransitionRequest = null;
    
    console.log(`🌀 [TransitionManager] ✅ Détruit`);
  }

  // ✅ CONTRÔLE
  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}`);
    
    if (active && this.teleportZones.size === 0 && this.scene.map) {
      console.log(`🌀 [TransitionManager] 🔄 Réinitialisation...`);
      this.initialize();
    }
  }
}
