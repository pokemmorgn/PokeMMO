// client/src/transitions/GlobalTransitionManager.js
// ✅ VERSION GLOBALE - UN SEUL INSTANCE POUR TOUTE LA SESSION

export class GlobalTransitionManager {
  constructor() {
    this.currentScene = null;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    // Collections persistantes
    this.teleportZones = new Map();
    this.currentZone = null;
    
    // Loading et timeout
    this.loadingOverlay = null;
    this.transitionTimeout = 8000;
    this.transitionTimeoutHandle = null;
    
    // Données de transition en cours
    this.currentTransitionData = null;
    
    // ✅ DÉLAI DE GRÂCE GLOBAL PERSISTENT
    this.graceTime = 0;
    this.graceDuration = 3000; // 3 secondes
    
    console.log(`🌍 [GlobalTransitionManager] Créé - Instance globale unique`);
  }

  // ✅ ATTACHER À UNE SCÈNE - CORRIGÉ
  attachToScene(scene) {
    console.log(`🔗 [GlobalTransitionManager] === ATTACHEMENT À SCÈNE ===`);
    console.log(`📍 Scène: ${scene.scene.key}`);
    
    // Détacher de l'ancienne scène si nécessaire
    if (this.currentScene) {
      console.log(`🔓 [GlobalTransitionManager] Détachement de: ${this.currentScene.scene.key}`);
    }
    
    this.currentScene = scene;
    
    // ✅ CORRECTION 1: Obtenir la zone depuis plusieurs sources
    const sceneZone = this.getZoneFromScene(scene.scene.key);
    const networkZone = scene.networkManager?.getCurrentZone();
    const serverZone = scene.currentZone;
    
    console.log(`🔍 [GlobalTransitionManager] Sources de zone:`);
    console.log(`  - Scene calculée: ${sceneZone}`);
    console.log(`  - NetworkManager: ${networkZone}`);
    console.log(`  - Server zone: ${serverZone}`);
    
    // ✅ CORRECTION 2: Priorité au serveur, sinon calculée
    this.currentZone = serverZone || networkZone || sceneZone;
    
    console.log(`🎯 [GlobalTransitionManager] Zone finale: ${this.currentZone}`);
    
    if (!this.currentZone) {
      console.error(`❌ [GlobalTransitionManager] ERREUR: Aucune zone déterminée!`);
      this.currentZone = sceneZone; // Fallback
      console.log(`🔧 [GlobalTransitionManager] Fallback zone: ${this.currentZone}`);
    }
    
    // ✅ Scan des téléports dans la nouvelle scène
    this.scanSceneForTeleports(scene);
    
    this.isActive = true;
    console.log(`✅ [GlobalTransitionManager] Attaché à ${scene.scene.key}, zone: ${this.currentZone}`);
  }

  // ✅ SCANNER UNE SCÈNE POUR SES TÉLÉPORTS
  scanSceneForTeleports(scene) {
    console.log(`🔍 [GlobalTransitionManager] Scan téléports pour: ${scene.scene.key}`);
    
    if (!scene.map) {
      console.warn(`⚠️ [GlobalTransitionManager] Pas de map dans ${scene.scene.key}`);
      return;
    }

    const worldsLayer = scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`⚠️ [GlobalTransitionManager] Pas de layer Worlds dans ${scene.scene.key}`);
      return;
    }

    // ✅ Nettoyer les anciens téléports de cette scène
    this.clearTeleportsForScene(scene.scene.key);

    // ✅ Scanner les nouveaux téléports
    this.scanTeleports(worldsLayer, scene);
    
    // ✅ Créer les zones de collision
    this.createCollisionZones(scene);
    
    console.log(`✅ [GlobalTransitionManager] ${this.teleportZones.size} téléports trouvés pour ${scene.scene.key}`);
  }

  // ✅ NETTOYER LES TÉLÉPORTS D'UNE SCÈNE
  clearTeleportsForScene(sceneKey) {
    const toDelete = [];
    
    this.teleportZones.forEach((teleport, id) => {
      if (teleport.sceneKey === sceneKey) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => {
      this.teleportZones.delete(id);
    });
    
    console.log(`🗑️ [GlobalTransitionManager] ${toDelete.length} téléports supprimés pour ${sceneKey}`);
  }

  // ✅ Scanner téléports (adapté)
  scanTeleports(worldsLayer, scene) {
    let teleportCount = 0;

    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      const objType = (obj.type || '').toLowerCase();
      
      if (objName === 'teleport' || objType === 'teleport') {
        const success = this.processTeleport(obj, index, scene);
        if (success) {
          teleportCount++;
        }
      }
    });

    console.log(`🔍 [GlobalTransitionManager] ${teleportCount} téléports trouvés dans ${scene.scene.key}`);
  }

  // ✅ Process téléport (corrigé)
  processTeleport(obj, index, scene) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone || !targetSpawn) {
      console.error(`❌ [GlobalTransitionManager] Téléport ${index} invalide dans ${scene.scene.key}`);
      return false;
    }

    // ✅ CORRECTION 3: Vérifier que currentZone est définie
    if (!this.currentZone) {
      console.error(`❌ [GlobalTransitionManager] currentZone undefined! Recalcul...`);
      this.currentZone = this.getZoneFromScene(scene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] Zone recalculée: ${this.currentZone}`);
    }

    const teleport = {
      id: `${scene.scene.key}_teleport_${index}`,
      sceneKey: scene.scene.key,
      x: obj.x,
      y: obj.y,
      width: obj.width || 32,
      height: obj.height || 32,
      targetZone: targetZone,
      targetSpawn: targetSpawn,
      fromZone: this.currentZone // ✅ Utilisera la zone vérifiée
    };

    this.teleportZones.set(teleport.id, teleport);
    console.log(`✅ [GlobalTransitionManager] Téléport: ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
    
    return true;
  }

  // ✅ Création zones collision (adapté)
  createCollisionZones(scene) {
    // ✅ Créer seulement les zones pour cette scène
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== scene.scene.key) return;
      
      const zone = scene.add.zone(
        teleportData.x + teleportData.width / 2,
        teleportData.y + teleportData.height / 2,
        teleportData.width,
        teleportData.height
      );

      scene.physics.world.enableBody(zone, Phaser.Physics.Arcade.STATIC_BODY);
      zone.body.setSize(teleportData.width, teleportData.height);
      zone.transitionData = teleportData;

      this.createDebugVisuals(zone, teleportData, scene);
    });
  }

  // ✅ Debug visuel (adapté)
  createDebugVisuals(zone, teleportData, scene) {
    const debugRect = scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.3
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(3, 0x00aa00);
    
    const debugText = scene.add.text(
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

  // ✅ CHECK COLLISIONS GLOBAL
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning || !this.currentScene) return;

    // ✅ Vérifier délai de grâce GLOBAL
    const now = Date.now();
    if (this.graceTime > now) {
      if (!this.lastGraceLogTime || now - this.lastGraceLogTime > 2000) {
        const remaining = Math.ceil((this.graceTime - now) / 1000);
        console.log(`🛡️ [GlobalTransitionManager] Délai de grâce: ${remaining}s restantes`);
        this.lastGraceLogTime = now;
      }
      return;
    }

    // ✅ Vérifier seulement les téléports de la scène actuelle
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== this.currentScene.scene.key) return;
      
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.log(`💥 [GlobalTransitionManager] COLLISION: ${teleportData.id}!`);
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
      console.warn(`⚠️ [GlobalTransitionManager] Transition déjà en cours`);
      return;
    }

    console.log(`🚀 [GlobalTransitionManager] === DÉBUT TRANSITION ===`);
    console.log(`📊 Données téléport:`, teleportData);
    
    // ✅ CORRECTION 4: Vérifier les données avant envoi
    if (!teleportData.fromZone) {
      console.error(`❌ [GlobalTransitionManager] fromZone manquante! Recalcul...`);
      teleportData.fromZone = this.currentZone || this.getZoneFromScene(this.currentScene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] fromZone corrigée: ${teleportData.fromZone}`);
    }
    
    if (!teleportData.fromZone) {
      console.error(`❌ [GlobalTransitionManager] Impossible de déterminer la zone source!`);
      this.handleTransitionError({ reason: "Zone source inconnue: " + teleportData.fromZone });
      return;
    }

    console.log(`📍 [GlobalTransitionManager] Transition: ${teleportData.fromZone} → ${teleportData.targetZone}`);

    this.isTransitioning = true;
    this.currentTransitionData = teleportData;

    this.showLoadingOverlay(teleportData);
    this.setTransitionTimeout();

    const correctedData = await this.validateAndCorrectZone(teleportData);
    this.sendTransitionRequest(correctedData);
  }

  // ✅ ENVOI REQUÊTE CORRIGÉ AVEC DEBUG
  sendTransitionRequest(teleportData) {
    console.log(`📤 [GlobalTransitionManager] === ENVOI REQUÊTE SERVEUR ===`);
    console.log(`📊 Données téléport reçues:`, teleportData);
    
    if (!this.currentScene?.networkManager?.room) {
      console.error(`❌ Pas de connexion serveur`);
      this.handleTransitionError({ reason: "Pas de connexion serveur" });
      return;
    }

    const myPlayer = this.currentScene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.error(`❌ Joueur local introuvable`);
      this.handleTransitionError({ reason: "Joueur local introuvable" });
      return;
    }

    // ✅ CORRECTION : S'assurer que fromZone est définie
    let fromZone = teleportData.fromZone;
    
    if (!fromZone) {
      console.warn(`⚠️ [GlobalTransitionManager] fromZone manquante, recalcul...`);
      fromZone = this.currentZone || this.getZoneFromScene(this.currentScene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] fromZone recalculée: ${fromZone}`);
    }
    
    if (!fromZone) {
      console.error(`❌ [GlobalTransitionManager] Impossible de déterminer fromZone!`);
      this.handleTransitionError({ reason: "Zone source indéterminée" });
      return;
    }

    const request = {
      fromZone: fromZone,                    // ✅ Zone source vérifiée
      targetZone: teleportData.targetZone,   // ✅ Zone cible
      targetSpawn: teleportData.targetSpawn, // ✅ Point spawn
      playerX: myPlayer.x,                   // ✅ Position X
      playerY: myPlayer.y,                   // ✅ Position Y
      teleportId: teleportData.id           // ✅ ID téléport
    };

    console.log(`📤 [GlobalTransitionManager] === REQUÊTE FINALE ===`);
    console.log(`📊 Requête complète:`, request);
    console.log(`🔍 Détails:`);
    console.log(`  - fromZone: "${request.fromZone}"`);
    console.log(`  - targetZone: "${request.targetZone}"`);
    console.log(`  - targetSpawn: "${request.targetSpawn}"`);
    console.log(`  - position: (${request.playerX}, ${request.playerY})`);
    console.log(`  - teleportId: "${request.teleportId}"`);

    // ✅ Setup listener
    this.setupTransitionListener();
    
    try {
      this.currentScene.networkManager.room.send("validateTransition", request);
      console.log(`✅ [GlobalTransitionManager] Requête envoyée avec succès`);
    } catch (error) {
      console.error(`❌ [GlobalTransitionManager] Erreur envoi:`, error);
      this.handleTransitionError({ reason: `Erreur envoi: ${error.message}` });
    }
  }

  // ✅ LISTENER RÉPONSE SERVEUR AVEC DEBUG DÉTAILLÉ
  setupTransitionListener() {
    console.log(`👂 [GlobalTransitionManager] Setup listener...`);

    this.transitionResponseHandler = (result) => {
      console.log(`📨 [GlobalTransitionManager] === RÉPONSE SERVEUR ===`);
      console.log(`📊 Résultat reçu:`, result);
      console.log(`✅ Succès: ${result?.success}`);
      console.log(`🎯 Zone résultante: ${result?.currentZone}`);
      console.log(`📍 Position: ${result?.position ? `(${result.position.x}, ${result.position.y})` : 'undefined'}`);
      console.log(`❌ Erreur: ${result?.reason}`);
      
      this.clearTransitionTimeout();
      this.currentScene.networkManager.onTransitionValidation(null);
      
      if (result?.success) {
        this.handleTransitionSuccess(result, this.currentTransitionData);
      } else {
        // ✅ AMÉLIORATION : Gestion d'erreur plus détaillée
        const errorReason = result?.reason || "Erreur inconnue";
        console.error(`❌ [GlobalTransitionManager] Erreur détaillée: "${errorReason}"`);
        this.handleTransitionError({ reason: errorReason });
      }
    };

    this.currentScene.networkManager.onTransitionValidation(this.transitionResponseHandler);
  }

  // ✅ SUCCÈS TRANSITION (adapté)
  handleTransitionSuccess(result, teleportData) {
    console.log(`✅ [GlobalTransitionManager] === TRANSITION VALIDÉE ===`);
    
    const targetZone = result.currentZone || teleportData.targetZone;
    const targetScene = this.getSceneFromZone(targetZone);
    
    if (!targetScene) {
      this.handleTransitionError({ reason: `Zone inconnue: ${targetZone}` });
      return;
    }

    // ✅ ACTIVER DÉLAI DE GRÂCE GLOBAL
    this.activateGracePeriod();

    // ✅ Changement de scène
    if (targetScene !== this.currentScene.scene.key) {
      console.log(`🔄 [GlobalTransitionManager] Changement: ${this.currentScene.scene.key} → ${targetScene}`);
      
      const transitionData = {
        fromZone: this.currentZone,
        fromTransition: true,
        networkManager: this.currentScene.networkManager,
        mySessionId: this.currentScene.mySessionId,
        spawnX: result.position?.x,
        spawnY: result.position?.y,
        preservePlayer: true,
        globalTransitionManager: this // ✅ SE PASSER DANS LES DONNÉES
      };

      this.currentScene.scene.launch(targetScene, transitionData);
      
      this.currentScene.time.delayedCall(100, () => {
        this.currentScene.scene.stop();
      });
    } else {
      // Repositionnement local
      this.repositionPlayer(result);
      this.hideLoadingOverlay();
      this.resetTransitionState();
    }
  }

  // ✅ DÉLAI DE GRÂCE GLOBAL
  activateGracePeriod(duration = null) {
    const graceDuration = duration || this.graceDuration;
    this.graceTime = Date.now() + graceDuration;
    
    console.log(`🛡️ [GlobalTransitionManager] DÉLAI DE GRÂCE GLOBAL: ${graceDuration}ms`);
    console.log(`🛡️ [GlobalTransitionManager] Fin prévue: ${new Date(this.graceTime).toLocaleTimeString()}`);
  }

  // ✅ VALIDATION ET CORRECTION ZONE AMÉLIORÉE
  validateAndCorrectZone(teleportData) {
    console.log(`🔍 [GlobalTransitionManager] === VALIDATION ZONE ===`);
    console.log(`📊 Données téléport entrée:`, teleportData);
    console.log(`🎯 currentZone: ${this.currentZone}`);
    console.log(`🏠 Scene zone: ${this.getZoneFromScene(this.currentScene.scene.key)}`);
    
    // ✅ CORRECTION 1: S'assurer que fromZone est définie
    if (!teleportData.fromZone) {
      console.warn(`⚠️ [GlobalTransitionManager] fromZone manquante dans teleportData`);
      teleportData.fromZone = this.currentZone || this.getZoneFromScene(this.currentScene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] fromZone corrigée: ${teleportData.fromZone}`);
    }
    
    // ✅ CORRECTION 2: Vérifier currentZone
    if (!this.currentZone) {
      console.warn(`⚠️ [GlobalTransitionManager] currentZone manquante`);
      this.currentZone = this.getZoneFromScene(this.currentScene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] currentZone corrigée: ${this.currentZone}`);
    }
    
    // ✅ CORRECTION 3: Synchroniser si différent
    if (teleportData.fromZone !== this.currentZone) {
      console.warn(`⚠️ [GlobalTransitionManager] Désynchronisation détectée:`);
      console.warn(`  - teleportData.fromZone: ${teleportData.fromZone}`);
      console.warn(`  - this.currentZone: ${this.currentZone}`);
      
      // Utiliser la zone la plus fiable
      const reliableZone = this.currentZone || teleportData.fromZone;
      teleportData.fromZone = reliableZone;
      this.currentZone = reliableZone;
      
      console.log(`🔧 [GlobalTransitionManager] Zone synchronisée: ${reliableZone}`);
    }
    
    console.log(`✅ [GlobalTransitionManager] Zone validée: ${teleportData.fromZone}`);
    return { success: true, correctedData: teleportData };
  }

  setTransitionTimeout() {
    this.transitionTimeoutHandle = setTimeout(() => {
      this.handleTransitionError({ reason: "Timeout de transition" });
    }, this.transitionTimeout);
  }

  clearTransitionTimeout() {
    if (this.transitionTimeoutHandle) {
      clearTimeout(this.transitionTimeoutHandle);
      this.transitionTimeoutHandle = null;
    }
  }

  // ✅ ERREUR TRANSITION AVEC DEBUG
  handleTransitionError(result) {
    const reason = result?.reason || "Erreur inconnue";
    console.error(`❌ [GlobalTransitionManager] === ERREUR TRANSITION ===`);
    console.error(`📊 Données erreur complètes:`, result);
    console.error(`📝 Raison: "${reason}"`);
    
    this.hideLoadingOverlay();
    this.showErrorPopup(reason);
    this.resetTransitionState();
    
    // ✅ NOUVEAU : Réactiver après erreur pour éviter les blocages
    this.activateGracePeriod(1000); // 1 seconde de grâce après erreur
  }

  resetTransitionState() {
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.clearTransitionTimeout();
  }

  repositionPlayer(result) {
    const myPlayer = this.currentScene.playerManager?.getMyPlayer();
    if (myPlayer && result.position) {
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;
    }
  }

  showLoadingOverlay(teleportData) {
    if (this.loadingOverlay) this.loadingOverlay.destroy();
    
    this.loadingOverlay = this.currentScene.add.container(0, 0).setDepth(9999).setScrollFactor(0);
    
    const bg = this.currentScene.add.rectangle(0, 0, this.currentScene.scale.width, this.currentScene.scale.height, 0x000000, 0.8);
    const text = this.currentScene.add.text(0, 0, `Transition vers ${teleportData.targetZone}...`, {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
    
    this.loadingOverlay.add([bg, text]);
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
  }

  showErrorPopup(message) {
    if (this.currentScene?.showNotification) {
      this.currentScene.showNotification(message, 'error');
    }
  }

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

  // ✅ CONTRÔLES EXTERNES
  setActive(active) {
    this.isActive = active;
    console.log(`🌍 [GlobalTransitionManager] ${active ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  debugInfo() {
    console.log(`🌍 [GlobalTransitionManager] === DEBUG ===`);
    console.log(`🎯 Scène actuelle: ${this.currentScene?.scene.key || 'aucune'}`);
    console.log(`📍 Zone actuelle: ${this.currentZone}`);
    console.log(`🔧 État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`🌀 En transition: ${this.isTransitioning}`);
    console.log(`🛡️ Délai de grâce: ${this.graceTime > Date.now() ? 'ACTIF' : 'INACTIF'}`);
    console.log(`📍 Téléports totaux: ${this.teleportZones.size}`);
    
    if (this.graceTime > Date.now()) {
      const remaining = Math.ceil((this.graceTime - Date.now()) / 1000);
      console.log(`🛡️ Délai restant: ${remaining}s`);
    }
  }

  destroy() {
    console.log(`🌍 [GlobalTransitionManager] 💀 Destruction...`);
    
    this.hideLoadingOverlay();
    this.clearTransitionTimeout();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.currentScene = null;
    
    console.log(`🌍 [GlobalTransitionManager] ✅ Détruit`);
  }
}
