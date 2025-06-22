// client/src/transitions/GlobalTransitionManager.js
// ✅ VERSION COMPLÈTE AVEC DEBUG ULTRA RENFORCÉ POUR DIAGNOSTIQUER LA BOUCLE

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
    
    // ✅ AJOUTER À L'HISTORIQUE
    this.transitionHistory.push({
      timestamp: Date.now(),
      teleportId: teleportData.id,
      from: teleportData.fromZone,
      to: teleportData.targetZone,
      spawn: teleportData.targetSpawn,
      collisionCheck: this.collisionAttempts
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
      console.log(`📨 [GlobalTransitionManager] ================================================`);
      console.log(`📨 [GlobalTransitionManager] === RÉPONSE SERVEUR ===`);
      console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
      console.log(`📊 Résultat reçu:`, result);
      console.log(`📨 [GlobalTransitionManager] ================================================`);
      
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

  // ✅ SUCCÈS TRANSITION AVEC PROTECTIONS RENFORCÉES ET DEBUG ULTRA DÉTAILLÉ
  handleTransitionSuccess(result, teleportData) {
    console.log(`✅ [GlobalTransitionManager] ================================================`);
    console.log(`✅ [GlobalTransitionManager] === TRANSITION VALIDÉE ===`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`📊 Résultat serveur complet:`, result);
    console.log(`📊 Téléport utilisé:`, teleportData);
    console.log(`✅ [GlobalTransitionManager] ================================================`);
    
    const targetZone = result.currentZone || teleportData.targetZone;
    const targetScene = this.getSceneFromZone(targetZone);
    
    console.log(`🎯 Zone cible: ${targetZone}`);
    console.log(`🎬 Scène cible: ${targetScene}`);
    console.log(`🎬 Scène actuelle: ${this.currentScene.scene.key}`);
    
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
    console.log(`🔒 [GlobalTransitionManager] lastTeleportId défini: ${this.lastTeleportId}`);
    
    // ✅ Réinitialiser l'ID après TOUTES les protections
    const totalProtectionTime = Math.max(this.graceDuration, this.spawnProtectionDuration) + 500;
    setTimeout(() => {
      console.log(`🔓 [GlobalTransitionManager] === RÉINITIALISATION TÉLÉPORT ID ===`);
      console.log(`🔓 [GlobalTransitionManager] Ancien ID: ${this.lastTeleportId}`);
      this.lastTeleportId = null;
      console.log(`🔓 [GlobalTransitionManager] Nouveau ID: ${this.lastTeleportId}`);
    }, totalProtectionTime);
    
    // ✅ LOG POSITION REÇUE DU SERVEUR
    if (result.position) {
      console.log(`📍 [GlobalTransitionManager] === POSITION SERVEUR ===`);
      console.log(`📍 X: ${result.position.x}`);
      console.log(`📍 Y: ${result.position.y}`);
      
      // ✅ NOUVEAU : Ajouter à l'historique de repositionnement
      this.repositionHistory.push({
        timestamp: Date.now(),
        fromScene: this.currentScene.scene.key,
        toScene: targetScene,
        serverPosition: { ...result.position },
        teleportUsed: teleportData.id
      });
      
      // Limiter l'historique
      if (this.repositionHistory.length > 5) {
        this.repositionHistory.shift();
      }
    }
    
    // ✅ Changement de scène
    if (targetScene !== this.currentScene.scene.key) {
      console.log(`🔄 [GlobalTransitionManager] === CHANGEMENT DE SCÈNE ===`);
      console.log(`🔄 Depuis: ${this.currentScene.scene.key}`);
      console.log(`🔄 Vers: ${targetScene}`);
      
      const transitionData = {
        fromZone: this.currentZone,
        fromTransition: true,
        networkManager: this.currentScene.networkManager,
        mySessionId: this.currentScene.mySessionId,
        spawnX: result.position?.x,
        spawnY: result.position?.y,
        preservePlayer: true,
        globalTransitionManager: this,
        needsSpawnProtection: true,
        // ✅ NOUVEAU : Debug info
        debugTransitionId: teleportData.id,
        debugTimestamp: Date.now()
      };

      console.log(`🔄 [GlobalTransitionManager] Données transition pour nouvelle scène:`, transitionData);

      this.currentScene.scene.launch(targetScene, transitionData);
      
      this.currentScene.time.delayedCall(100, () => {
        console.log(`🛑 [GlobalTransitionManager] Arrêt de l'ancienne scène: ${this.currentScene.scene.key}`);
        this.currentScene.scene.stop();
      });
    } else {
      // Repositionnement local
      console.log(`📍 [GlobalTransitionManager] === REPOSITIONNEMENT LOCAL ===`);
      this.repositionPlayer(result);
      this.hideLoadingOverlay();
      this.resetTransitionState();
    }
  }

  // ✅ REPOSITIONNEMENT AVEC VÉRIFICATION SÉCURITÉ ET DEBUG
  repositionPlayer(result) {
    const myPlayer = this.currentScene.playerManager?.getMyPlayer();
    if (!myPlayer || !result.position) {
      console.error(`❌ [GlobalTransitionManager] Impossible de repositionner: player=${!!myPlayer}, position=${!!result.position}`);
      return;
    }
    
    console.log(`📍 [GlobalTransitionManager] ================================================`);
    console.log(`📍 [GlobalTransitionManager] === REPOSITIONNEMENT JOUEUR ===`);
    console.log(`📊 Position AVANT: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
    console.log(`📊 Position SERVEUR: (${result.position.x}, ${result.position.y})`);
    
    // ✅ NOUVEAU : Vérification et correction de spawn
    const correctedPosition = this.checkAndFixSpawnPosition(myPlayer, result);
    
    console.log(`📊 Position CORRIGÉE: (${correctedPosition.x}, ${correctedPosition.y})`);
    console.log(`🔧 Correction appliquée: ${correctedPosition.wasCorrected ? 'OUI' : 'NON'}`);
    
    // Appliquer la position
    myPlayer.x = correctedPosition.x;
    myPlayer.y = correctedPosition.y;
    myPlayer.targetX = correctedPosition.x;
    myPlayer.targetY = correctedPosition.y;
    
    console.log(`📊 Position FINALE: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
    
    if (correctedPosition.wasCorrected) {
      console.warn(`🚨 [GlobalTransitionManager] Position corrigée pour éviter collision`);
      
      // Envoyer la position corrigée au serveur
      if (this.currentScene.networkManager?.isConnected) {
        console.log(`📤 [GlobalTransitionManager] Envoi position corrigée au serveur`);
        this.currentScene.networkManager.sendMove(correctedPosition.x, correctedPosition.y, 'down', false);
      }
    }
    
    // ✅ VÉRIFICATION POST-REPOSITIONNEMENT
    setTimeout(() => {
      this.verifyRepositionSafety(myPlayer);
    }, 100);
    
    console.log(`📍 [GlobalTransitionManager] ================================================`);
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier et corriger position spawn
  checkAndFixSpawnPosition(player, result) {
    console.log(`🔍 [GlobalTransitionManager] === VÉRIFICATION SPAWN SÉCURISÉ ===`);
    
    let spawnX = result.position?.x || player.x;
    let spawnY = result.position?.y || player.y;
    
    console.log(`📍 Position serveur originale: (${spawnX}, ${spawnY})`);
    
    // Vérifier collision avec TOUS les téléports de la scène cible
    let isOnTeleport = false;
    let conflictingTeleports = [];
    
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== this.currentScene.scene.key) return;
      
      // Simuler la position du joueur
      const playerBounds = {
        x: spawnX - 16,
        y: spawnY - 32,
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
      
      if (collision) {
        isOnTeleport = true;
        conflictingTeleports.push(teleportData);
        console.warn(`⚠️ [GlobalTransitionManager] SPAWN SUR TÉLÉPORT: ${teleportData.id}`);
        console.warn(`   Zone téléport: (${teleportData.x}, ${teleportData.y}) ${teleportData.width}x${teleportData.height}`);
        console.warn(`   Destination: ${teleportData.targetZone}[${teleportData.targetSpawn}]`);
      }
    });
    
    // Si spawn sur téléport → décaler la position
    if (isOnTeleport && conflictingTeleports.length > 0) {
      console.log(`🚨 [GlobalTransitionManager] === CORRECTION POSITION SPAWN ===`);
      console.log(`🚨 Téléports en conflit: ${conflictingTeleports.length}`);
      
      const primaryTeleport = conflictingTeleports[0];
      
      // Décaler de 80 pixels dans la direction opposée au téléport
      const teleportCenterX = primaryTeleport.x + primaryTeleport.width / 2;
      const teleportCenterY = primaryTeleport.y + primaryTeleport.height / 2;
      
      const deltaX = spawnX - teleportCenterX;
      const deltaY = spawnY - teleportCenterY;
      
      console.log(`🚨 Delta depuis centre téléport: (${deltaX}, ${deltaY})`);
      
      // Décaler dans la direction opposée
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Décaler horizontalement
        spawnX += deltaX > 0 ? 80 : -80;
        console.log(`🚨 Décalage horizontal: ${deltaX > 0 ? '+80' : '-80'}`);
      } else {
        // Décaler verticalement
        spawnY += deltaY > 0 ? 80 : -80;
        console.log(`🚨 Décalage vertical: ${deltaY > 0 ? '+80' : '-80'}`);
      }
      
      console.log(`🔧 [GlobalTransitionManager] Position corrigée: (${spawnX}, ${spawnY})`);
      
      // Prolonger la protection spawn
      this.activateSpawnProtection(5000); // 5 secondes
      console.log(`🛡️ [GlobalTransitionManager] Protection spawn prolongée à 5s`);
    } else {
      console.log(`✅ [GlobalTransitionManager] Position spawn sécurisée, aucune correction nécessaire`);
    }
    
    return { x: spawnX, y: spawnY, wasCorrected: isOnTeleport };
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier sécurité post-repositionnement
  verifyRepositionSafety(player) {
    console.log(`🔍 [GlobalTransitionManager] === VÉRIFICATION POST-REPOSITIONNEMENT ===`);
    
    const onTeleportDetails = this.checkPlayerOnTeleports(player);
    
    if (onTeleportDetails.isOnTeleport) {
      console.warn(`🚨 [POST-REPOSITION] JOUEUR ENCORE SUR TÉLÉPORT!`);
      console.warn(`   Téléports: ${onTeleportDetails.teleportIds.join(', ')}`);
      console.warn(`   Position: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      
      // Second correctif d'urgence
      this.performEmergencyPlayerReposition(player, onTeleportDetails.teleports);
      
      // Debug spécial pour traquer le problème
      console.error(`🚨 [CRITICAL] ÉCHEC CORRECTION POSITION SPAWN!`);
      console.error(`   Cette situation peut causer une boucle de retour instantané`);
      console.error(`   Historique repositionnement:`, this.repositionHistory);
    } else {
      console.log(`✅ [POST-REPOSITION] Position vérifiée sécurisée`);
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
    console.error(`❌ [GlobalTransitionManager] ================================================`);
    console.error(`❌ [GlobalTransitionManager] === ERREUR TRANSITION ===`);
    console.error(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.error(`📊 Données erreur complètes:`, result);
    console.error(`📝 Raison: "${reason}"`);
    console.error(`❌ [GlobalTransitionManager] ================================================`);
    
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
    
    console.log(`🖥️ [GlobalTransitionManager] Loading overlay affiché`);
  }

  // ✅ IMPROVED hideLoadingOverlay - DÉTRUIT TOUS LES OVERLAYS
  hideLoadingOverlay() {
    console.log(`🧹 [GlobalTransitionManager] === NETTOYAGE LOADING OVERLAY ===`);
    
    if (this.loadingOverlay) {
      console.log(`🗑️ [GlobalTransitionManager] Destruction loadingOverlay principal`);
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
    
    // ✅ NOUVEAU : Nettoyer TOUS les overlays potentiels dans la scène
    if (this.currentScene) {
      const allContainers = this.currentScene.children.list.filter(child => 
        child.type === 'Container' && child.depth >= 9000
      );
      
      allContainers.forEach((container, index) => {
        console.log(`🗑️ [GlobalTransitionManager] Destruction container overlay ${index}`);
        container.destroy();
      });
      
      // ✅ Chercher rectangles noirs suspects
      const blackRects = this.currentScene.children.list.filter(child => 
        child.type === 'Rectangle' && 
        child.fillColor === 0x000000 && 
        child.depth >= 9000
      );
      
      blackRects.forEach((rect, index) => {
        console.log(`🗑️ [GlobalTransitionManager] Destruction rectangle noir ${index}`);
        rect.destroy();
      });
    }
    
    console.log(`✅ [GlobalTransitionManager] Tous les overlays nettoyés`);
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

  // ✅ DEBUG INFO ULTRA COMPLET AVEC HISTORIQUES
  debugInfo() {
    console.log(`🌍 [GlobalTransitionManager] ================================================`);
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
      
      // Vérifier collisions actuelles
      const onTeleportDetails = this.checkPlayerOnTeleports(myPlayer);
      if (onTeleportDetails.isOnTeleport) {
        console.warn(`🚨 JOUEUR ACTUELLEMENT SUR TÉLÉPORT(S): ${onTeleportDetails.teleportIds.join(', ')}`);
      } else {
        console.log(`✅ Joueur en position sécurisée`);
      }
    }
    
    // Téléports de la scène actuelle
    const currentTeleports = this.getTeleportsForCurrentScene();
    console.log(`🚪 Téléports scène actuelle: ${currentTeleports.length}`);
    currentTeleports.forEach((teleport, index) => {
      console.log(`   ${index + 1}. ${teleport.id}:`);
      console.log(`      Position: (${teleport.x},${teleport.y}) ${teleport.width}x${teleport.height}`);
      console.log(`      Destination: ${teleport.targetZone}[${teleport.targetSpawn}]`);
    });
    
    // Historique transitions
    console.log(`📜 Historique transitions (${this.transitionHistory.length}):`);
    this.transitionHistory.slice(-5).forEach((transition, index) => {
      const time = new Date(transition.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. ${time}: ${transition.from} → ${transition.to} (${transition.teleportId}) [check #${transition.collisionCheck}]`);
    });
    
    // ✅ NOUVEAU : Historique repositionnements
    console.log(`📍 Historique repositionnements (${this.repositionHistory.length}):`);
    this.repositionHistory.forEach((reposition, index) => {
      const time = new Date(reposition.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. ${time}: ${reposition.fromScene} → ${reposition.toScene}`);
      console.log(`      Position: (${reposition.serverPosition.x}, ${reposition.serverPosition.y})`);
      console.log(`      Téléport: ${reposition.teleportUsed}`);
    });
    
    console.log(`🌍 [GlobalTransitionManager] ================================================`);
  }

  // ✅ NOUVELLE MÉTHODE : Forcer reset pour déblocage d'urgence
  emergencyReset() {
    console.log(`🚨 [GlobalTransitionManager] ================================================`);
    console.log(`🚨 [GlobalTransitionManager] === RESET D'URGENCE ===`);
    
    this.isTransitioning = false;
    this.graceTime = 0;
    this.spawnProtectionTime = 0;
    this.lastTeleportId = null;
    this.currentTransitionData = null;
    this.clearTransitionTimeout();
    this.hideLoadingOverlay();
    this.resetDebugCounters();
    
    console.log(`🚨 [GlobalTransitionManager] Reset d'urgence terminé`);
    this.debugInfo();
    console.log(`🚨 [GlobalTransitionManager] ================================================`);
  }

  destroy() {
    console.log(`🌍 [GlobalTransitionManager] 💀 Destruction...`);
    
    this.hideLoadingOverlay();
    this.clearTransitionTimeout();
    this.teleportZones.clear();
    this.transitionHistory = [];
    this.repositionHistory = [];
    this.isActive = false;
    this.isTransitioning = false;
    this.currentTransitionData = null;
    this.currentScene = null;
    
    console.log(`🌍 [GlobalTransitionManager] ✅ Détruit`);
  }
} DÉLAI DE GRÂCE GLOBAL AMÉLIORÉ
    this.graceTime = 0;
    this.graceDuration = 3000; // 3 secondes
    
    // ✅ NOUVEAU : Protection spawn sécurisé
    this.lastTeleportId = null;
    this.spawnProtectionTime = 0;
    this.spawnProtectionDuration = 2000; // 2 secondes protection spawn
    this.lastGraceLogTime = 0;
    this.lastSpawnLogTime = 0;
    
    // ✅ DEBUG TRACKING RENFORCÉ
    this.transitionHistory = [];
    this.collisionAttempts = 0;
    this.debugCollisionLog = 0;
    this.debugSpawnLog = 0;
    this.repositionHistory = [];
    
    console.log(`🌍 [GlobalTransitionManager] Créé - Instance globale unique avec debug ultra renforcé`);
  }

  // ✅ ATTACHEMENT AVEC NETTOYAGE COMPLET DU LOADING + DEBUG
  attachToScene(scene) {
    console.log(`🔗 [GlobalTransitionManager] ===============================================`);
    console.log(`🔗 [GlobalTransitionManager] === ATTACHEMENT À SCÈNE ===`);
    console.log(`📍 Scène: ${scene.scene.key}`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`🔗 [GlobalTransitionManager] ===============================================`);
    
    // Détacher de l'ancienne scène si nécessaire
    if (this.currentScene) {
      console.log(`🔓 [GlobalTransitionManager] Détachement de: ${this.currentScene.scene.key}`);
    }
    
    this.currentScene = scene;
    
    // ✅ NETTOYAGE COMPLET LORS DE L'ATTACHEMENT - CRITIQUE !
    console.log(`🧹 [GlobalTransitionManager] === NETTOYAGE COMPLET ===`);
    this.isTransitioning = false;
    this.hideLoadingOverlay(); // ✅ SUPPRIMER LE CARRÉ NOIR
    this.clearTransitionTimeout(); // ✅ ANNULER LE TIMEOUT
    this.currentTransitionData = null;
    this.resetDebugCounters(); // ✅ NOUVEAU
    console.log(`🧹 [GlobalTransitionManager] Nettoyage terminé`);
    
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
      console.log(`📊 [GlobalTransitionManager] Données transition complètes:`, sceneData);
      
      // ✅ NOUVEAU : Log détaillé des positions
      if (sceneData.spawnX !== undefined && sceneData.spawnY !== undefined) {
        console.log(`📍 [GlobalTransitionManager] Position spawn reçue: (${sceneData.spawnX}, ${sceneData.spawnY})`);
      }
    }
    
    // ✅ Reset compteur collisions pour nouvelle scène
    this.collisionAttempts = 0;
    
    // Scan des téléports dans la nouvelle scène
    this.scanSceneForTeleports(scene);
    
    this.isActive = true;
    console.log(`✅ [GlobalTransitionManager] Attaché à ${scene.scene.key}, zone: ${this.currentZone}`);
    
    // ✅ NOUVEAU : Log état final pour debug
    this.logAttachmentSummary();
    
    // ✅ NOUVEAU : Programmer debug post-spawn
    this.schedulePostSpawnDebug();
  }

  // ✅ NOUVELLE MÉTHODE : Reset compteurs debug
  resetDebugCounters() {
    this.debugCollisionLog = 0;
    this.debugSpawnLog = 0;
    this.lastGraceLogTime = 0;
    this.lastSpawnLogTime = 0;
    console.log(`🔄 [GlobalTransitionManager] Compteurs debug réinitialisés`);
  }

  // ✅ NOUVELLE MÉTHODE : Debug post-spawn programmé
  schedulePostSpawnDebug() {
    // Debug à intervals pour traquer le problème
    [1000, 2000, 3000, 5000].forEach((delay) => {
      setTimeout(() => {
        this.debugPostSpawnState(delay);
      }, delay);
    });
  }

  // ✅ NOUVELLE MÉTHODE : Debug état post-spawn
  debugPostSpawnState(delay) {
    const myPlayer = this.currentScene?.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log(`🔍 [POST-SPAWN DEBUG ${delay}ms] Pas de joueur trouvé`);
      return;
    }

    console.log(`🔍 [POST-SPAWN DEBUG ${delay}ms] ==========================================`);
    console.log(`👤 Position joueur: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`);
    console.log(`🛡️ Protection spawn: ${this.isSpawnProtected() ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`🛡️ Délai de grâce: ${this.graceTime > Date.now() ? 'ACTIF' : 'INACTIF'}`);
    console.log(`🔒 Dernier téléport ignoré: ${this.lastTeleportId || 'aucun'}`);
    
    // Vérifier collision avec chaque téléport
    let onTeleportCount = 0;
    this.teleportZones.forEach((teleport) => {
      if (teleport.sceneKey !== this.currentScene.scene.key) return;
      
      const isColliding = this.isPlayerCollidingWithTeleport(myPlayer, teleport);
      if (isColliding) {
        onTeleportCount++;
        console.warn(`🚨 [POST-SPAWN DEBUG ${delay}ms] JOUEUR SUR TÉLÉPORT: ${teleport.id}`);
        console.warn(`   Téléport: (${teleport.x}, ${teleport.y}) ${teleport.width}x${teleport.height}`);
        console.warn(`   Destination: ${teleport.targetZone}[${teleport.targetSpawn}]`);
        console.warn(`   Est ignoré: ${this.lastTeleportId === teleport.id ? 'OUI' : 'NON'}`);
      }
    });
    
    if (onTeleportCount === 0) {
      console.log(`✅ [POST-SPAWN DEBUG ${delay}ms] Position sécurisée, aucune collision`);
    } else {
      console.warn(`🚨 [POST-SPAWN DEBUG ${delay}ms] ${onTeleportCount} collision(s) détectée(s)!`);
    }
    
    console.log(`🔍 [POST-SPAWN DEBUG ${delay}ms] ==========================================`);
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

  // ✅ CHECK COLLISIONS AVEC DEBUG ULTRA DÉTAILLÉ ET DÉTECTION PROBLÈME
  checkCollisions(player) {
    // ✅ COMPTEUR GLOBAL POUR DEBUG
    this.collisionAttempts++;
    this.debugCollisionLog++;

    // ✅ PREMIER CHECK : États basiques
    if (!this.isActive) {
      if (this.debugCollisionLog % 120 === 0) { // Log toutes les 2 secondes environ
        console.log(`🚫 [GlobalTransitionManager] INACTIF - pas de check collisions (tentative ${this.collisionAttempts})`);
      }
      return;
    }

    if (!player) {
      if (this.debugCollisionLog % 120 === 0) {
        console.log(`👤 [GlobalTransitionManager] PAS DE JOUEUR - pas de check collisions (tentative ${this.collisionAttempts})`);
      }
      return;
    }

    if (this.isTransitioning) {
      if (this.debugCollisionLog % 60 === 0) {
        console.log(`🌀 [GlobalTransitionManager] EN TRANSITION - pas de check collisions (tentative ${this.collisionAttempts})`);
      }
      return;
    }

    if (!this.currentScene) {
      if (this.debugCollisionLog % 120 === 0) {
        console.log(`🎬 [GlobalTransitionManager] PAS DE SCÈNE - pas de check collisions (tentative ${this.collisionAttempts})`);
      }
      return;
    }

    const now = Date.now();

    // ✅ PROTECTION 1 : Délai de grâce global
    if (this.graceTime > now) {
      if (!this.lastGraceLogTime || now - this.lastGraceLogTime > 2000) {
        const remaining = Math.ceil((this.graceTime - now) / 1000);
        console.log(`🛡️ [GlobalTransitionManager] [CHECK ${this.collisionAttempts}] Délai de grâce: ${remaining}s restantes`);
        this.lastGraceLogTime = now;
      }
      return;
    }

    // ✅ PROTECTION 2 : Protection spawn avec DEBUG RENFORCÉ
    if (this.isSpawnProtected()) {
      this.debugSpawnLog++;
      
      if (!this.lastSpawnLogTime || now - this.lastSpawnLogTime > 1000) {
        const remaining = Math.ceil((this.spawnProtectionTime - now) / 1000);
        console.log(`🛡️ [GlobalTransitionManager] [CHECK ${this.collisionAttempts}] Protection spawn: ${remaining}s restantes`);
        this.lastSpawnLogTime = now;
        
        // ✅ NOUVEAU : Vérifier si le joueur EST DÉJÀ sur un téléport pendant la protection
        const onTeleportDetails = this.checkPlayerOnTeleports(player);
        if (onTeleportDetails.isOnTeleport) {
          console.warn(`🚨 [SPAWN PROTECTION] JOUEUR SUR TÉLÉPORT PENDANT PROTECTION!`);
          console.warn(`   Téléports en collision: ${onTeleportDetails.teleportIds.join(', ')}`);
          console.warn(`   Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
          console.warn(`   Protection restante: ${remaining}s`);
          
          // ✅ CORRECTION IMMÉDIATE
          this.performEmergencyPlayerReposition(player, onTeleportDetails.teleports);
        }
      }
      return;
    }

    // ✅ LOG DÉTAILLÉ PÉRIODIQUE DE L'ÉTAT ACTIF
    if (this.debugCollisionLog % 300 === 0) { // Toutes les 5 secondes environ
      console.log(`🔍 [GlobalTransitionManager] [CHECK ${this.collisionAttempts}] === CHECK COLLISION ACTIF ===`);
      console.log(`👤 Joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      console.log(`🎬 Scène: ${this.currentScene.scene.key}`);
      console.log(`🚪 Téléports dans cette scène: ${this.getTeleportsForCurrentScene().length}`);
      console.log(`🔒 Dernier téléport ignoré: ${this.lastTeleportId || 'aucun'}`);
    }

    // ✅ DÉTECTION COLLISIONS AVEC DEBUG DÉTAILLÉ
    const collisionDetails = this.checkPlayerOnTeleports(player);
    
    if (collisionDetails.isOnTeleport) {
      // ✅ VÉRIFIER SI ON DOIT IGNORER CES COLLISIONS
      const validTeleports = collisionDetails.teleports.filter(teleport => 
        teleport.id !== this.lastTeleportId
      );
      
      if (validTeleports.length > 0) {
        const teleportToUse = validTeleports[0]; // Premier téléport valide
        
        console.log(`💥 [GlobalTransitionManager] ========== COLLISION DÉTECTÉE ==========`);
        console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
        console.log(`🔢 Check #: ${this.collisionAttempts}`);
        console.log(`🎯 Téléport: ${teleportToUse.id}`);
        console.log(`📍 Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
        console.log(`📍 Zone téléport: (${teleportToUse.x}, ${teleportToUse.y}) ${teleportToUse.width}x${teleportToUse.height}`);
        console.log(`🎯 Destination: ${teleportToUse.targetZone}[${teleportToUse.targetSpawn}]`);
        console.log(`🛡️ Protections: grâce=${this.graceTime > now}, spawn=${this.isSpawnProtected()}`);
        console.log(`🔒 Dernier téléport: ${this.lastTeleportId}`);
        console.log(`🔒 Téléports ignorés: ${collisionDetails.teleports.length - validTeleports.length}`);
        console.log(`===============================================`);
        
        this.triggerTransition(teleportToUse);
      } else {
        // ✅ TOUTES LES COLLISIONS SONT IGNORÉES
        if (this.debugCollisionLog % 60 === 0) {
          console.log(`🔒 [GlobalTransitionManager] [CHECK ${this.collisionAttempts}] Collisions ignorées (lastTeleportId=${this.lastTeleportId})`);
          console.log(`   Téléports en collision: ${collisionDetails.teleportIds.join(', ')}`);
        }
      }
    } else {
      // ✅ PAS DE COLLISION - Log occasionnel
      if (this.debugCollisionLog % 600 === 0) { // Toutes les 10 secondes
        console.log(`✅ [GlobalTransitionManager] [CHECK ${this.collisionAttempts}] Aucune collision détectée`);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE : Vérifier collisions joueur avec tous téléports
  checkPlayerOnTeleports(player) {
    const collidingTeleports = [];
    const teleportIds = [];
    
    this.teleportZones.forEach((teleportData) => {
      if (teleportData.sceneKey !== this.currentScene.scene.key) return;
      
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        collidingTeleports.push(teleportData);
        teleportIds.push(teleportData.id);
      }
    });
    
    return {
      isOnTeleport: collidingTeleports.length > 0,
      teleports: collidingTeleports,
      teleportIds: teleportIds,
      count: collidingTeleports.length
    };
  }

  // ✅ NOUVELLE MÉTHODE : Repositionnement d'urgence
  performEmergencyPlayerReposition(player, collidingTeleports) {
    console.warn(`🚨 [GlobalTransitionManager] === REPOSITIONNEMENT D'URGENCE ===`);
    
    if (collidingTeleports.length === 0) return;
    
    // Trouver une position sûre
    const safePosition = this.findSafePositionAwayFromTeleports(player, collidingTeleports);
    
    console.warn(`🚨 Position originale: (${Math.round(player.x)}, ${Math.round(player.y)})`);
    console.warn(`🚨 Position sécurisée: (${safePosition.x}, ${safePosition.y})`);
    
    // Appliquer la nouvelle position
    player.x = safePosition.x;
    player.y = safePosition.y;
    player.targetX = safePosition.x;
    player.targetY = safePosition.y;
    
    // Prolonger la protection spawn
    this.activateSpawnProtection(5000); // 5 secondes supplémentaires
    
    // Envoyer au serveur
    if (this.currentScene.networkManager?.isConnected) {
      console.warn(`🚨 Envoi position d'urgence au serveur`);
      this.currentScene.networkManager.sendMove(safePosition.x, safePosition.y, 'down', false);
    }
    
    console.warn(`🚨 [GlobalTransitionManager] Repositionnement d'urgence terminé`);
  }

  // ✅ NOUVELLE MÉTHODE : Trouver position sûre
  findSafePositionAwayFromTeleports(player, collidingTeleports) {
    // Stratégie simple : décaler de 100 pixels dans la direction opposée au premier téléport
    const firstTeleport = collidingTeleports[0];
    
    const teleportCenterX = firstTeleport.x + firstTeleport.width / 2;
    const teleportCenterY = firstTeleport.y + firstTeleport.height / 2;
    
    const deltaX = player.x - teleportCenterX;
    const deltaY = player.y - teleportCenterY;
    
    let newX = player.x;
    let newY = player.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Décaler horizontalement
      newX += deltaX > 0 ? 100 : -100;
    } else {
      // Décaler verticalement
      newY += deltaY > 0 ? 100 : -100;
    }
    
    return { x: newX, y: newY };
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

    console.log(`🚀 [GlobalTransitionManager] ================================================`);
    console.log(`🚀 [GlobalTransitionManager] === DÉBUT TRANSITION ===`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString()}`);
    console.log(`🔢 Check collision #: ${this.collisionAttempts}`);
    console.log(`📊 Données téléport:`, teleportData);
    console.log(`🚀 [GlobalTransitionManager] ================================================`);
    
    // ✅
