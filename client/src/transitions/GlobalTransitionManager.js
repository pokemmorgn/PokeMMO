// client/src/transitions/GlobalTransitionManager.js
// ✅ VERSION COMPLÈTE AVEC DEBUG RENFORCÉ POUR DIAGNOSTIQUER LA BOUCLE

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
    
    // ✅ DÉLAI DE GRÂCE GLOBAL AMÉLIORÉ
    this.graceTime = 0;
    this.graceDuration = 3000; // 3 secondes
    
    // ✅ NOUVEAU : Protection spawn sécurisé
    this.lastTeleportId = null;
    this.spawnProtectionTime = 0;
    this.spawnProtectionDuration = 2000; // 2 secondes protection spawn
    this.lastGraceLogTime = 0;
    this.lastSpawnLogTime = 0;
    
    // ✅ DEBUG TRACKING
    this.transitionHistory = [];
    this.collisionAttempts = 0;
    
    console.log(`🌍 [GlobalTransitionManager] Créé - Instance globale unique`);
  }

  // ✅ ATTACHEMENT AVEC PROTECTION SPAWN ET RESET TRANSITION
  attachToScene(scene) {
    console.log(`🔗 [GlobalTransitionManager] === ATTACHEMENT À SCÈNE ===`);
    console.log(`📍 Scène: ${scene.scene.key}`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    
    // Détacher de l'ancienne scène si nécessaire
    if (this.currentScene) {
      console.log(`🔓 [GlobalTransitionManager] Détachement de: ${this.currentScene.scene.key}`);
    }
    
    this.currentScene = scene;
    
    // ✅ RESET CRITIQUE : Arrêter toute transition en cours lors de l'attachement
    if (this.isTransitioning) {
      console.log(`🔄 [GlobalTransitionManager] RESET transition lors attachement nouvelle scène`);
      this.isTransitioning = false;
      this.hideLoadingOverlay();
      this.clearTransitionTimeout();
    }
    
    // ✅ Obtenir la zone depuis plusieurs sources
    const sceneZone = this.getZoneFromScene(scene.scene.key);
    const networkZone = scene.networkManager?.getCurrentZone();
    const serverZone = scene.currentZone;
    
    console.log(`🔍 [GlobalTransitionManager] Sources de zone:`);
    console.log(`  - Scene calculée: ${sceneZone}`);
    console.log(`  - NetworkManager: ${networkZone}`);
    console.log(`  - Server zone: ${serverZone}`);
    
    // Priorité au serveur, sinon calculée
    this.currentZone = serverZone || networkZone || sceneZone;
    
    console.log(`🎯 [GlobalTransitionManager] Zone finale: ${this.currentZone}`);
    
    if (!this.currentZone) {
      console.error(`❌ [GlobalTransitionManager] ERREUR: Aucune zone déterminée!`);
      this.currentZone = sceneZone; // Fallback
      console.log(`🔧 [GlobalTransitionManager] Fallback zone: ${this.currentZone}`);
    }
    
    // ✅ NOUVEAU : Activer protection spawn si transition récente
    const sceneData = scene.scene.settings.data;
    if (sceneData?.fromTransition) {
      this.activateSpawnProtection();
      console.log(`🛡️ [GlobalTransitionManager] Protection spawn activée pour transition`);
      
      // ✅ DEBUG: Log données de transition
      console.log(`📊 [GlobalTransitionManager] Données transition:`, sceneData);
    }
    
    // ✅ Reset compteur collisions pour nouvelle scène
    this.collisionAttempts = 0;
    
    // Scan des téléports dans la nouvelle scène
    this.scanSceneForTeleports(scene);
    
    this.isActive = true;
    console.log(`✅ [GlobalTransitionManager] Attaché à ${scene.scene.key}, zone: ${this.currentZone}`);
    
    // ✅ NOUVEAU : Log état final pour debug
    this.logAttachmentSummary();
  }

  // ✅ NOUVELLE MÉTHODE : Résumé attachement
  logAttachmentSummary() {
    console.log(`📋 [GlobalTransitionManager] === RÉSUMÉ ATTACHEMENT ===`);
    console.log(`🎯 Scène: ${this.currentScene?.scene.key}`);
    console.log(`📍 Zone: ${this.currentZone}`);
    console.log(`🔧 Actif: ${this.isActive}`);
    console.log(`🛡️ Protection grâce: ${this.graceTime > Date.now() ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`🛡️ Protection spawn: ${this.isSpawnProtected() ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`🚪 Téléports: ${this.teleportZones.size}`);
    console.log(`🔒 Dernier téléport: ${this.lastTeleportId || 'aucun'}`);
  }

  // ✅ NOUVELLE MÉTHODE : Protection spawn
  activateSpawnProtection(duration = null) {
    const protectionDuration = duration || this.spawnProtectionDuration;
    this.spawnProtectionTime = Date.now() + protectionDuration;
    
    console.log(`🛡️ [GlobalTransitionManager] PROTECTION SPAWN: ${protectionDuration}ms`);
    console.log(`🛡️ [GlobalTransitionManager] Fin protection: ${new Date(this.spawnProtectionTime).toLocaleTimeString()}`);
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier protection spawn
  isSpawnProtected() {
    return this.spawnProtectionTime > Date.now();
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

  // ✅ Scanner téléports
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
    
    // ✅ Log détaillé des téléports pour debug
    this.logTeleportDetails(scene.scene.key);
  }

  // ✅ NOUVELLE MÉTHODE : Log détails téléports
  logTeleportDetails(sceneKey) {
    console.log(`📋 [GlobalTransitionManager] === TÉLÉPORTS DÉTAILLÉS ===`);
    
    this.teleportZones.forEach((teleport) => {
      if (teleport.sceneKey === sceneKey) {
        console.log(`🚪 ${teleport.id}:`);
        console.log(`   Position: (${teleport.x}, ${teleport.y})`);
        console.log(`   Taille: ${teleport.width}x${teleport.height}`);
        console.log(`   ${teleport.fromZone} → ${teleport.targetZone}[${teleport.targetSpawn}]`);
      }
    });
  }

  // ✅ Process téléport
  processTeleport(obj, index, scene) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone || !targetSpawn) {
      console.error(`❌ [GlobalTransitionManager] Téléport ${index} invalide dans ${scene.scene.key}`);
      return false;
    }

    // ✅ Vérifier que currentZone est définie
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
      fromZone: this.currentZone
    };

    this.teleportZones.set(teleport.id, teleport);
    console.log(`✅ [GlobalTransitionManager] Téléport: ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
    
    return true;
  }

  // ✅ Création zones collision
  createCollisionZones(scene) {
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

  // ✅ Debug visuel
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

  // ✅ CHECK COLLISIONS AVEC DEBUG ULTRA DÉTAILLÉ
  checkCollisions(player) {
    // ✅ PREMIER CHECK : États basiques
    if (!this.isActive) {
      if (this.collisionAttempts % 120 === 0) { // Log toutes les 2 secondes environ
        console.log(`🚫 [GlobalTransitionManager] INACTIF - pas de check collisions`);
      }
      this.collisionAttempts++;
      return;
    }

    if (!player) {
      if (this.collisionAttempts % 120 === 0) {
        console.log(`👤 [GlobalTransitionManager] PAS DE JOUEUR - pas de check collisions`);
      }
      this.collisionAttempts++;
      return;
    }

    if (this.isTransitioning) {
      if (this.collisionAttempts % 60 === 0) {
        console.log(`🌀 [GlobalTransitionManager] EN TRANSITION - pas de check collisions`);
      }
      this.collisionAttempts++;
      return;
    }

    if (!this.currentScene) {
      if (this.collisionAttempts % 120 === 0) {
        console.log(`🎬 [GlobalTransitionManager] PAS DE SCÈNE - pas de check collisions`);
      }
      this.collisionAttempts++;
      return;
    }

    const now = Date.now();

    // ✅ PROTECTION 1 : Délai de grâce global
    if (this.graceTime > now) {
      if (!this.lastGraceLogTime || now - this.lastGraceLogTime > 2000) {
        const remaining = Math.ceil((this.graceTime - now) / 1000);
        console.log(`🛡️ [GlobalTransitionManager] Délai de grâce: ${remaining}s restantes`);
        this.lastGraceLogTime = now;
      }
      this.collisionAttempts++;
      return;
    }

    // ✅ PROTECTION 2 : Protection spawn
    if (this.isSpawnProtected()) {
      if (!this.lastSpawnLogTime || now - this.lastSpawnLogTime > 1000) {
        const remaining = Math.ceil((this.spawnProtectionTime - now) / 1000);
        console.log(`🛡️ [GlobalTransitionManager] Protection spawn: ${remaining}s restantes`);
        this.lastSpawnLogTime = now;
      }
      this.collisionAttempts++;
      return;
    }

    // ✅ LOG DÉTAILLÉ PÉRIODIQUE DE L'ÉTAT
    if (this.collisionAttempts % 300 === 0) { // Toutes les 5 secondes environ
      console.log(`🔍 [GlobalTransitionManager] === CHECK COLLISION ACTIF ===`);
      console.log(`👤 Joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      console.log(`🎬 Scène: ${this.currentScene.scene.key}`);
      console.log(`🚪 Téléports dans cette scène: ${this.getTeleportsForCurrentScene().length}`);
      console.log(`🔒 Dernier téléport ignoré: ${this.lastTeleportId || 'aucun'}`);
    }

    // ✅ DÉTECTION COLLISIONS AVEC DEBUG
    let collisionDetected = false;
    
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== this.currentScene.scene.key) return;

      // ✅ PROTECTION 3 : Ignore le dernier téléport utilisé
      if (this.lastTeleportId && teleportData.id === this.lastTeleportId) {
        // Log occasionnel pour debug
        if (this.collisionAttempts % 180 === 0) {
          console.log(`🔒 [GlobalTransitionManager] Ignore téléport: ${teleportData.id}`);
        }
        return;
      }

      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.log(`💥 [GlobalTransitionManager] ========== COLLISION DÉTECTÉE ==========`);
        console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
        console.log(`🎯 Téléport: ${teleportData.id}`);
        console.log(`📍 Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
        console.log(`📍 Zone téléport: (${teleportData.x}, ${teleportData.y}) ${teleportData.width}x${teleportData.height}`);
        console.log(`🎯 Destination: ${teleportData.targetZone}[${teleportData.targetSpawn}]`);
        console.log(`🛡️ Protections: grâce=${this.graceTime > now}, spawn=${this.isSpawnProtected()}`);
        console.log(`🔒 Dernier téléport: ${this.lastTeleportId}`);
        console.log(`===============================================`);
        
        collisionDetected = true;
        this.triggerTransition(teleportData);
      }
    });

    // ✅ Log si aucune collision (occasionnel)
    if (!collisionDetected && this.collisionAttempts % 600 === 0) { // Toutes les 10 secondes
      console.log(`✅ [GlobalTransitionManager] Aucune collision détectée (check ${this.collisionAttempts})`);
    }

    this.collisionAttempts++;
  }

  // ✅ NOUVELLE MÉTHODE : Obtenir téléports de la scène actuelle
  getTeleportsForCurrentScene() {
    const teleports = [];
    this.teleportZones.forEach((teleport) => {
      if (teleport.sceneKey === this.currentScene?.scene.key) {
        teleports.push(teleport);
      }
    });
    return teleports;
  }

  // ✅ COLLISION AVEC DEBUG DÉTAILLÉ
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

    const collision = (
      playerBounds.x < teleportBounds.x + teleportBounds.width &&
      playerBounds.x + playerBounds.width > teleportBounds.x &&
      playerBounds.y < teleportBounds.y + teleportBounds.height &&
      playerBounds.y + playerBounds.height > teleportBounds.y
    );

    return collision;
  }

  // ✅ DÉCLENCHEMENT TRANSITION AVEC HISTORIQUE
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.warn(`⚠️ [GlobalTransitionManager] Transition déjà en cours`);
      return;
    }

    console.log(`🚀 [GlobalTransitionManager] === DÉBUT TRANSITION ===`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`📊 Données téléport:`, teleportData);
    
    // ✅ AJOUTER À L'HISTORIQUE
    this.transitionHistory.push({
      timestamp: Date.now(),
      teleportId: teleportData.id,
      from: teleportData.fromZone,
      to: teleportData.targetZone,
      spawn: teleportData.targetSpawn
    });

    // ✅ Limiter historique à 10 dernières transitions
    if (this.transitionHistory.length > 10) {
      this.transitionHistory.shift();
    }

    // ✅ VÉRIFIER ET CORRIGER fromZone
    if (!teleportData.fromZone) {
      console.error(`❌ [GlobalTransitionManager] fromZone manquante! Recalcul...`);
      teleportData.fromZone = this.currentZone || this.getZoneFromScene(this.currentScene.scene.key);
      console.log(`🔧 [GlobalTransitionManager] fromZone corrigée: ${teleportData.fromZone}`);
    }
    
    if (!teleportData.fromZone) {
      console.error(`❌ [GlobalTransitionManager] Impossible de déterminer la zone source!`);
      this.handleTransitionError({ reason: "Zone source indéterminée" });
      return;
    }

    console.log(`📍 [GlobalTransitionManager] Transition: ${teleportData.fromZone} → ${teleportData.targetZone}`);

    this.lastTeleportId = teleportData.id;
    
    this.isTransitioning = true;
    this.currentTransitionData = teleportData;

    this.showLoadingOverlay(teleportData);
    this.setTransitionTimeout();

    console.log(`📤 [GlobalTransitionManager] Envoi requête serveur...`);
    this.sendTransitionRequest(teleportData);
  }

  // ✅ ENVOI REQUÊTE AVEC DEBUG
  sendTransitionRequest(teleportData) {
    console.log(`📤 [GlobalTransitionManager] === ENVOI REQUÊTE SERVEUR ===`);
    console.log(`📊 Données téléport:`, teleportData);
    
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

    // ✅ S'assurer que fromZone est définie
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
      fromZone: fromZone,
      targetZone: teleportData.targetZone,
      targetSpawn: teleportData.targetSpawn,
      playerX: myPlayer.x,
      playerY: myPlayer.y,
      teleportId: teleportData.id
    };

    console.log(`📤 [GlobalTransitionManager] === REQUÊTE FINALE ===`);
    console.log(`📊 Requête complète:`, request);

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

  // ✅ LISTENER RÉPONSE SERVEUR
  setupTransitionListener() {
    console.log(`👂 [GlobalTransitionManager] Setup listener...`);

    this.transitionResponseHandler = (result) => {
      console.log(`📨 [GlobalTransitionManager] === RÉPONSE SERVEUR ===`);
      console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
      console.log(`📊 Résultat reçu:`, result);
      
      this.clearTransitionTimeout();
      this.currentScene.networkManager.onTransitionValidation(null);
      
      if (result?.success) {
        this.handleTransitionSuccess(result, this.currentTransitionData);
      } else {
        const errorReason = result?.reason || "Erreur inconnue";
        console.error(`❌ [GlobalTransitionManager] Erreur: "${errorReason}"`);
        this.handleTransitionError({ reason: errorReason });
      }
    };

    this.currentScene.networkManager.onTransitionValidation(this.transitionResponseHandler);
  }

  // ✅ SUCCÈS TRANSITION AVEC PROTECTIONS RENFORCÉES ET RESET IMMÉDIAT
  handleTransitionSuccess(result, teleportData) {
    console.log(`✅ [GlobalTransitionManager] === TRANSITION VALIDÉE ===`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`📊 Résultat serveur:`, result);
    
    const targetZone = result.currentZone || teleportData.targetZone;
    const targetScene = this.getSceneFromZone(targetZone);
    
    if (!targetScene) {
      this.handleTransitionError({ reason: `Zone inconnue: ${targetZone}` });
      return;
    }

    // ✅ RESET IMMÉDIAT DE L'ÉTAT TRANSITION - CRITIQUE!
    this.isTransitioning = false;
    console.log(`🔄 [GlobalTransitionManager] isTransitioning = false (IMMÉDIAT)`);

    // ✅ PROTECTIONS GLOBALES RENFORCÉES
    this.activateGracePeriod();
    this.activateSpawnProtection();
    
    // ✅ Mémoriser le téléport utilisé
    this.lastTeleportId = teleportData.id;
    
    // ✅ Réinitialiser l'ID après TOUTES les protections
    const totalProtectionTime = Math.max(this.graceDuration, this.spawnProtectionDuration) + 500;
    setTimeout(() => {
      console.log(`🔓 [GlobalTransitionManager] Réinitialisation lastTeleportId: ${this.lastTeleportId}`);
      this.lastTeleportId = null;
    }, totalProtectionTime);
    
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
        globalTransitionManager: this,
        needsSpawnProtection: true
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

  // ✅ REPOSITIONNEMENT AVEC VÉRIFICATION SÉCURITÉ
  repositionPlayer(result) {
    const myPlayer = this.currentScene.playerManager?.getMyPlayer();
    if (myPlayer && result.position) {
      console.log(`📍 [GlobalTransitionManager] === REPOSITIONNEMENT JOUEUR ===`);
      console.log(`📊 Position avant: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
      console.log(`📊 Position serveur: (${result.position.x}, ${result.position.y})`);
      
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;
      
      console.log(`📊 Position après: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
      
      this.checkPlayerSafePosition(myPlayer);
    }
  }

  // ✅ VÉRIFIER POSITION SÉCURISÉE
  checkPlayerSafePosition(player) {
    console.log(`🔍 [GlobalTransitionManager] === VÉRIFICATION POSITION SÉCURISÉE ===`);
    
    let conflictFound = false;
    
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== this.currentScene.scene.key) return;
      
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.warn(`⚠️ [GlobalTransitionManager] JOUEUR SUR TÉLÉPORT: ${teleportData.id}`);
        console.warn(`   Téléport: (${teleportData.x}, ${teleportData.y}) ${teleportData.width}x${teleportData.height}`);
        console.warn(`   Joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
        conflictFound = true;
      }
    });
    
    if (conflictFound) {
      console.warn(`🚨 [GlobalTransitionManager] POSITION DANGEREUSE DÉTECTÉE!`);
      // Prolonger la protection spawn
      this.activateSpawnProtection(5000); // 5 secondes supplémentaires
      console.log(`🛡️ [GlobalTransitionManager] Protection spawn prolongée à 5s`);
    } else {
      console.log(`✅ [GlobalTransitionManager] Position sécurisée confirmée`);
    }
  }

  // ✅ DÉLAI DE GRÂCE GLOBAL
  activateGracePeriod(duration = null) {
    const graceDuration = duration || this.graceDuration;
    this.graceTime = Date.now() + graceDuration;
    
    console.log(`🛡️ [GlobalTransitionManager] DÉLAI DE GRÂCE GLOBAL: ${graceDuration}ms`);
    console.log(`🛡️ [GlobalTransitionManager] Fin prévue: ${new Date(this.graceTime).toLocaleTimeString()}`);
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
    console.error(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.error(`📊 Données erreur complètes:`, result);
    console.error(`📝 Raison: "${reason}"`);
    
    this.hideLoadingOverlay();
    this.showErrorPopup(reason);
    this.resetTransitionState();
    
    // ✅ Réactiver après erreur pour éviter les blocages
    this.activateGracePeriod(1000); // 1 seconde de grâce après erreur
  }

  resetTransitionState() {
    console.log(`🔄 [GlobalTransitionManager] Reset état transition`);
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.clearTransitionTimeout();
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
    console.log(`🌍 [GlobalTransitionManager] ${active ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    this.isActive = active;
  }

  // ✅ DEBUG INFO ULTRA COMPLET
  debugInfo() {
    console.log(`🌍 [GlobalTransitionManager] === DEBUG COMPLET ===`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`🎯 Scène actuelle: ${this.currentScene?.scene.key || 'aucune'}`);
    console.log(`📍 Zone actuelle: ${this.currentZone}`);
    console.log(`🔧 État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`🌀 En transition: ${this.isTransitioning}`);
    
    const now = Date.now();
    
    // Délai de grâce
    if (this.graceTime > now) {
      const remaining = Math.ceil((this.graceTime - now) / 1000);
      console.log(`🛡️ Délai de grâce: ACTIF (${remaining}s)`);
    } else {
      console.log(`🛡️ Délai de grâce: INACTIF`);
    }
    
    // Protection spawn
    if (this.isSpawnProtected()) {
      const remaining = Math.ceil((this.spawnProtectionTime - now) / 1000);
      console.log(`🛡️ Protection spawn: ACTIF (${remaining}s)`);
    } else {
      console.log(`🛡️ Protection spawn: INACTIF`);
    }
    
    console.log(`🔒 Dernier téléport: ${this.lastTeleportId || 'aucun'}`);
    console.log(`📍 Téléports totaux: ${this.teleportZones.size}`);
    console.log(`🔍 Tentatives collision: ${this.collisionAttempts}`);
    
    // Position joueur
    const myPlayer = this.currentScene?.playerManager?.getMyPlayer();
    if (myPlayer) {
      console.log(`👤 Position joueur: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
      this.checkPlayerSafePosition(myPlayer);
    }
    
    // Téléports de la scène actuelle
    const currentTeleports = this.getTeleportsForCurrentScene();
    console.log(`🚪 Téléports scène actuelle: ${currentTeleports.length}`);
    currentTeleports.forEach((teleport, index) => {
      console.log(`   ${index + 1}. ${teleport.id}: (${teleport.x},${teleport.y}) → ${teleport.targetZone}`);
    });
    
    // Historique transitions
    console.log(`📜 Historique transitions (${this.transitionHistory.length}):`);
    this.transitionHistory.slice(-5).forEach((transition, index) => {
      const time = new Date(transition.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. ${time}: ${transition.from} → ${transition.to} (${transition.teleportId})`);
    });
  }

  // ✅ NOUVELLE MÉTHODE : Log état complet pour diagnostic
  diagnosticLog() {
    console.log(`🏥 [GlobalTransitionManager] === DIAGNOSTIC COMPLET ===`);
    
    // État système
    console.log(`🔧 ÉTAT SYSTÈME:`);
    console.log(`   - GlobalTransitionManager actif: ${this.isActive}`);
    console.log(`   - En transition: ${this.isTransitioning}`);
    console.log(`   - Scène attachée: ${this.currentScene?.scene.key || 'aucune'}`);
    console.log(`   - Zone courante: ${this.currentZone}`);
    
    // Protections
    const now = Date.now();
    console.log(`🛡️ PROTECTIONS:`);
    console.log(`   - Délai de grâce: ${this.graceTime > now ? `ACTIF (${Math.ceil((this.graceTime - now) / 1000)}s)` : 'INACTIF'}`);
    console.log(`   - Protection spawn: ${this.isSpawnProtected() ? `ACTIF (${Math.ceil((this.spawnProtectionTime - now) / 1000)}s)` : 'INACTIF'}`);
    console.log(`   - Dernier téléport ignoré: ${this.lastTeleportId || 'aucun'}`);
    
    // Joueur
    const myPlayer = this.currentScene?.playerManager?.getMyPlayer();
    console.log(`👤 JOUEUR:`);
    if (myPlayer) {
      console.log(`   - Position: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
      console.log(`   - Visible: ${myPlayer.visible}`);
      console.log(`   - Actif: ${myPlayer.active}`);
    } else {
      console.log(`   - Joueur introuvable!`);
    }
    
    // Téléports
    const currentTeleports = this.getTeleportsForCurrentScene();
    console.log(`🚪 TÉLÉPORTS SCÈNE ACTUELLE (${currentTeleports.length}):`);
    currentTeleports.forEach((teleport) => {
      const isColliding = myPlayer ? this.isPlayerCollidingWithTeleport(myPlayer, teleport) : false;
      const isIgnored = this.lastTeleportId === teleport.id;
      console.log(`   - ${teleport.id}:`);
      console.log(`     Position: (${teleport.x}, ${teleport.y}) ${teleport.width}x${teleport.height}`);
      console.log(`     Destination: ${teleport.targetZone}[${teleport.targetSpawn}]`);
      console.log(`     Collision: ${isColliding ? 'OUI' : 'NON'}`);
      console.log(`     Ignoré: ${isIgnored ? 'OUI' : 'NON'}`);
    });
    
    // Statistiques
    console.log(`📊 STATISTIQUES:`);
    console.log(`   - Tentatives collision: ${this.collisionAttempts}`);
    console.log(`   - Transitions historique: ${this.transitionHistory.length}`);
    
    if (this.transitionHistory.length > 0) {
      const lastTransition = this.transitionHistory[this.transitionHistory.length - 1];
      const timeSince = Math.floor((now - lastTransition.timestamp) / 1000);
      console.log(`   - Dernière transition: il y a ${timeSince}s (${lastTransition.from} → ${lastTransition.to})`);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Forcer reset pour déblocage d'urgence
  emergencyReset() {
    console.log(`🚨 [GlobalTransitionManager] === RESET D'URGENCE ===`);
    
    this.isTransitioning = false;
    this.graceTime = 0;
    this.spawnProtectionTime = 0;
    this.lastTeleportId = null;
    this.currentTransitionData = null;
    this.clearTransitionTimeout();
    this.hideLoadingOverlay();
    
    console.log(`🚨 [GlobalTransitionManager] Reset d'urgence terminé`);
    this.debugInfo();
  }

  destroy() {
    console.log(`🌍 [GlobalTransitionManager] 💀 Destruction...`);
    
    this.hideLoadingOverlay();
    this.clearTransitionTimeout();
    this.teleportZones.clear();
    this.transitionHistory = [];
    this.isActive = false;
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.currentScene = null;
    
    console.log(`🌍 [GlobalTransitionManager] ✅ Détruit`);
  }
}
