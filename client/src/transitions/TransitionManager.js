// client/src/transitions/TransitionManager.js
// ✅ VERSION CORRIGÉE - FIX CHANGEMENT DE SCÈNE

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
    
    // ✅ NOUVEAU : Délai de grâce après transition
    this.graceTime = Date.now() + 3000; // 3 secondes de grâce au démarrage
    this.graceDuration = 2000; // 2 secondes sans collision après transition
    
    console.log(`🌀 [TransitionManager] 📍 INIT zone: ${this.currentZone} (scène: ${scene.scene.key})`);
  }

  // ✅ Initialisation (identique)
  initialize() {
    console.log(`🌀 [TransitionManager] === ÉTAPE 1: SCAN TÉLÉPORTS ===`);
    
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
    
    this.isActive = true;
    this.logInitializationSummary();
    return true;
  }

  // ✅ Scanner téléports (identique)
  scanTeleports(worldsLayer) {
    console.log(`🌀 [TransitionManager] === ÉTAPE 2: SCAN OBJETS ===`);
    
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

  // ✅ Process téléport (identique)
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

  // ✅ Création zones collision (identique)
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

      this.createDebugVisuals(zone, teleportData);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.teleportZones.size} zones collision créées`);
  }

  // ✅ Debug visuel (identique)
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

  // ✅ Check collisions AVEC DÉLAI DE GRÂCE
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    // ✅ NOUVEAU : Vérifier délai de grâce
    const now = Date.now();
    if (this.graceTime > now) {
      // Encore en délai de grâce, pas de collision
      return;
    }

    if (!this.lastPlayerLogTime || now - this.lastPlayerLogTime > 2000) {
      console.log(`🌀 [TransitionManager] 👤 Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      this.lastPlayerLogTime = now;
    }

    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.log(`🌀 [TransitionManager] 💥 COLLISION DÉTECTÉE avec ${teleportData.id}!`);
        this.triggerTransition(teleportData);
      }
    });
  }

  // ✅ Collision (identique)
  isPlayerCollidingWithTeleport(player, teleportData) {
    const playerBounds = {
      x: player.x - 16,
      y: player.y - 32,
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

  // ✅ DÉCLENCHEMENT TRANSITION CORRIGÉ
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.warn(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === ÉTAPE 6: DÉBUT TRANSITION ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn: ${teleportData.targetSpawn}`);

    this.isTransitioning = true;
    
    // ✅ NOUVEAU : Stocker les données de transition
    this.currentTransitionData = teleportData;

    this.showLoadingOverlay(teleportData);

    this.transitionTimeoutHandle = setTimeout(() => {
      console.error(`🌀 [TransitionManager] ⏰ TIMEOUT TRANSITION`);
      this.handleTransitionError({ reason: "Timeout de transition" });
    }, this.transitionTimeout);

    const correctionResult = await this.validateAndCorrectZone(teleportData);
    if (!correctionResult.success) {
      this.handleTransitionError(correctionResult);
      return;
    }

    this.sendTransitionRequest(correctionResult.correctedData);
  }

  // ✅ Validation zone (identique)
  async validateAndCorrectZone(teleportData) {
    const clientZone = this.scene.currentZone || this.currentZone;
    const serverZone = this.scene.networkManager?.getCurrentZone();
    
    if (clientZone === serverZone && serverZone === teleportData.fromZone) {
      return { success: true, correctedData: teleportData };
    }
    
    const correctedFromZone = serverZone || clientZone;
    const correctedData = { ...teleportData, fromZone: correctedFromZone };
    
    console.log(`🔧 Zone corrigée: ${teleportData.fromZone} → ${correctedFromZone}`);
    return { success: true, correctedData };
  }

  // ✅ ENVOI REQUÊTE CORRIGÉ
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
      playerX: myPlayer.x,
      playerY: myPlayer.y,
      teleportId: teleportData.id
    };

    console.log(`📤 Envoi requête:`, request);
    
    // ✅ NOUVEAU : Setup listener AVANT envoi
    this.setupTransitionListener();
    
    this.scene.networkManager.room.send("validateTransition", request);
  }

  // ✅ LISTENER RÉPONSE SERVEUR CORRIGÉ
  setupTransitionListener() {
    console.log(`👂 [TransitionManager] Setup listener validation...`);

    // ✅ NOUVEAU : Handler réponse avec données stockées
    this.transitionResponseHandler = (result) => {
      console.log(`📨 [TransitionManager] === RÉPONSE SERVEUR ===`);
      console.log(`📊 Résultat:`, result);
      
      this.clearTransitionTimeout();
      
      // ✅ NETTOYER LE HANDLER
      this.scene.networkManager.onTransitionValidation(null);
      this.transitionResponseHandler = null;
      
      if (result.success) {
        // ✅ UTILISER LES DONNÉES STOCKÉES ET LA RÉPONSE SERVEUR
        this.handleTransitionSuccess(result, this.currentTransitionData);
      } else {
        this.handleTransitionError(result);
      }
    };

    // ✅ CORRECTION : UTILISER LA MÉTHODE AU LIEU D'ASSIGNATION DIRECTE
    this.scene.networkManager.onTransitionValidation(this.transitionResponseHandler);
    
    console.log(`👂 [TransitionManager] ✅ Listener configuré`);
  }

  // ✅ SUCCÈS TRANSITION CORRIGÉ - UTILISE LAUNCH AU LIEU DE START
  async handleTransitionSuccess(result, teleportData) {
    console.log(`🌀 [TransitionManager] === TRANSITION VALIDÉE ===`);
    console.log(`📊 Résultat serveur:`, result);
    console.log(`📊 Données téléport:`, teleportData);
    
    const targetZone = result.currentZone || teleportData.targetZone;
    const targetScene = this.getSceneFromZone(targetZone);

    console.log(`🚀 [TransitionManager] === CHANGEMENT DE SCÈNE (LAUNCH) ===`);
    console.log(`📍 De: ${this.scene.scene.key} → ${targetScene}`);
    
    if (!targetScene) {
      console.error(`❌ Scene introuvable pour zone: ${targetZone}`);
      this.handleTransitionError({ reason: `Zone inconnue: ${targetZone}` });
      return;
    }
    
    console.log(`🎯 [TransitionManager] Zone cible: ${targetZone}`);
    console.log(`🎬 [TransitionManager] Scène cible: ${targetScene}`);
    console.log(`🏠 [TransitionManager] Scène actuelle: ${this.scene.scene.key}`);

    // ✅ Même scène = repositionnement local
    if (targetScene === this.scene.scene.key) {
      console.log(`📍 [TransitionManager] === REPOSITIONNEMENT LOCAL ===`);
      this.repositionPlayer(result);
      this.hideLoadingOverlay();
      this.resetTransitionState();
      return;
    }

    // ✅ NOUVEAU : UTILISER LAUNCH AU LIEU DE START POUR PRÉSERVER LA CONNEXION
    console.log(`🚀 [TransitionManager] === CHANGEMENT DE SCÈNE (LAUNCH) ===`);
    console.log(`📍 De: ${this.scene.scene.key} → ${targetScene}`);

    const delayBeforeSwitch = 500; // 150ms à adapter selon ton ressenti
    await new Promise((resolve) => setTimeout(resolve, delayBeforeSwitch));

    // ✅ AMÉLIORATION : S'assurer que les coordonnées spawn sont passées correctement
    const spawnX = result.position?.x;
    const spawnY = result.position?.y;
    
    console.log(`📍 [TransitionManager] Position spawn du serveur:`);
    console.log(`  - result.position:`, result.position);
    console.log(`  - spawnX: ${spawnX}`);
    console.log(`  - spawnY: ${spawnY}`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      spawnX: spawnX, // ✅ Position serveur
      spawnY: spawnY, // ✅ Position serveur
      preservePlayer: true,
      teleportData: teleportData,
      serverResult: result // ✅ Données complètes du serveur
    };

    console.log(`📤 [TransitionManager] Données transition complètes:`, transitionData);
    
    try {
      // ✅ MÉTHODE 1 : LAUNCH + STOP (préserve les connexions)
      console.log(`🔥 [TransitionManager] EXÉCUTION: this.scene.scene.launch("${targetScene}", ...)`);
      
      // Lancer la nouvelle scène
      this.scene.scene.launch(targetScene, transitionData);
      
      // ✅ NOUVEAU : Activer délai de grâce pour la nouvelle scène
      this.setGraceTimeForScene(targetScene);
      
    // 🔥 NE STOPPE PAS IMMÉDIATEMENT L’ANCIENNE SCÈNE !
    // À la place, passe le nom à fermer dans un global (ou sur window, simple et efficace pour debug)
    window.pendingSceneStop = this.scene.scene.key; // nom de l’ancienne scène

    console.log(`✅ [TransitionManager] Scene.launch() appelé, attente fermeture par la nouvelle scène`);

      
      console.log(`✅ [TransitionManager] Scene.launch() + stop() appelés avec succès`);
      
    } catch (error) {
      console.error(`❌ [TransitionManager] Erreur lors du changement de scène:`, error);
      
      // ✅ FALLBACK : Utiliser start() si launch() échoue
      console.log(`🔄 [TransitionManager] Fallback vers scene.start()...`);
      try {
        this.scene.scene.start(targetScene, transitionData);
      } catch (fallbackError) {
        console.error(`❌ [TransitionManager] Fallback échoué:`, fallbackError);
        this.handleTransitionError({ reason: `Erreur changement scène: ${error.message}` });
      }
    }
  }

  // ✅ ERREUR TRANSITION (identique)
  handleTransitionError(result) {
    console.error(`🌀 [TransitionManager] ❌ ERREUR TRANSITION:`, result.reason);
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.resetTransitionState();
  }

  // ✅ RESET ÉTAT TRANSITION
  resetTransitionState() {
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.clearTransitionTimeout();
    
    // ✅ CORRECTION : NETTOYER LE HANDLER PROPREMENT
    if (this.transitionResponseHandler) {
      this.scene.networkManager.onTransitionValidation(null);
      this.transitionResponseHandler = null;
    }
    
    console.log(`🌀 [TransitionManager] 🔄 État transition réinitialisé`);
  }

  // ✅ NOUVELLE MÉTHODE : Activer délai de grâce pour scène cible
  setGraceTimeForScene(targetScene) {
    console.log(`🛡️ [TransitionManager] Activation délai de grâce pour ${targetScene}...`);
    
    // ✅ Trouver la scène cible et activer son délai de grâce
    this.scene.time.delayedCall(200, () => {
      const targetSceneInstance = this.scene.scene.manager.getScene(targetScene);
      if (targetSceneInstance?.transitionManager) {
        const graceEndTime = Date.now() + this.graceDuration;
        targetSceneInstance.transitionManager.graceTime = graceEndTime;
        
        console.log(`🛡️ [TransitionManager] Délai de grâce activé pour ${targetScene} jusqu'à ${graceEndTime}`);
        console.log(`🛡️ [TransitionManager] Aucune transition possible pendant ${this.graceDuration}ms`);
      }
    });
  }

  // ✅ MÉTHODE POUR ACTIVER DÉLAI DE GRÂCE MANUEL
  activateGracePeriod(duration = null) {
    const graceDuration = duration || this.graceDuration;
    this.graceTime = Date.now() + graceDuration;
    
    console.log(`🛡️ [TransitionManager] Délai de grâce activé manuellement pour ${graceDuration}ms`);
    console.log(`🛡️ [TransitionManager] Fin prévue: ${this.graceTime}`);
  }
  clearTransitionTimeout() {
    if (this.transitionTimeoutHandle) {
      clearTimeout(this.transitionTimeoutHandle);
      this.transitionTimeoutHandle = null;
    }
  }

  // ✅ Repositionnement (identique)
  repositionPlayer(result) {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (myPlayer && result.position) {
      console.log(`📍 Repositionnement: (${result.position.x}, ${result.position.y})`);
      
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;

      if (this.scene.cameraManager) {
        this.scene.cameraManager.snapToPlayer();
      }
    }
  }

  // ✅ Loading overlay (simplifié)
  showLoadingOverlay(teleportData) {
    console.log(`🔄 [TransitionManager] Affichage loading pour: ${teleportData.targetZone}`);
    
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
    }
    
    this.loadingOverlay = this.scene.add.container(0, 0).setDepth(9999).setScrollFactor(0);
    
    const bg = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.8);
    const text = this.scene.add.text(0, 0, `Transition vers ${teleportData.targetZone}...`, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.loadingOverlay.add([bg, text]);
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
      console.log(`🔄 [TransitionManager] Loading masqué`);
    }
  }

  // ✅ Popup erreur (simplifié)
  showErrorPopup(message) {
    console.log(`🚫 [TransitionManager] Affichage erreur: ${message}`);
    
    if (this.scene.showNotification) {
      this.scene.showNotification(message, 'error');
    }
  }

  // ✅ HELPERS (identiques)
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

  // ✅ Debug et nettoyage (identiques)
  logInitializationSummary() {
    console.log(`🌀 [TransitionManager] === RÉSUMÉ INITIALISATION ===`);
    console.log(`📍 Zone courante: ${this.currentZone}`);
    console.log(`🔧 État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`📍 Téléports trouvés: ${this.teleportZones.size}`);
    
    if (this.teleportZones.size > 0) {
      this.teleportZones.forEach((teleport, id) => {
        console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
      });
    }
  }

  debugInfo() {
    this.logInitializationSummary();
  }

  destroy() {
    console.log(`🌀 [TransitionManager] 💀 Destruction...`);
    
    this.hideLoadingOverlay();
    this.clearTransitionTimeout();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    this.currentTransitionData = null;
    
    // ✅ CORRECTION : NETTOYER LE HANDLER PROPREMENT
    if (this.transitionResponseHandler) {
      this.scene.networkManager.onTransitionValidation(null);
      this.transitionResponseHandler = null;
    }
    
    console.log(`🌀 [TransitionManager] ✅ Détruit`);
  }

  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}`);
  }
}
