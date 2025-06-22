// client/src/transitions/TransitionManager.js
// ✅ VERSION SIMPLIFIÉE ET CLARIFIÉE

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true; // ✅ DEBUG TOUJOURS ACTIVÉ
    this.isTransitioning = false;
    
    // Collections locales pour collision
    this.teleportZones = new Map();
    this.currentZone = this.getZoneFromScene(scene.scene.key);
    
    // Loading et timeout
    this.loadingOverlay = null;
    this.transitionTimeout = 8000; // 8 secondes max
    this.transitionTimeoutHandle = null;
    
    console.log(`🌀 [TransitionManager] 📍 INIT zone: ${this.currentZone} (scène: ${scene.scene.key})`);
  }

  // ✅ ÉTAPE 1 : Initialisation avec logs détaillés
  initialize() {
    console.log(`🌀 [TransitionManager] === ÉTAPE 1: SCAN TÉLÉPORTS ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ ERREUR: Aucune map dans la scène!`);
      return false;
    }

    console.log(`🌀 [TransitionManager] ✅ Map trouvée:`, {
      width: this.scene.map.width,
      height: this.scene.map.height,
      layers: this.scene.map.layers.length,
      objectLayers: this.scene.map.objects?.length || 0
    });

    // Chercher le layer "Worlds"
    const worldsLayer = this.scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`🌀 [TransitionManager] ⚠️ WARN: Layer "Worlds" introuvable`);
      console.log(`🌀 [TransitionManager] 📂 Layers disponibles:`, 
        this.scene.map.objects?.map(layer => layer.name) || []
      );
      return false;
    }

    console.log(`🌀 [TransitionManager] ✅ Layer "Worlds" trouvé avec ${worldsLayer.objects.length} objets`);

    // Scanner SEULEMENT les téléports
    this.scanTeleports(worldsLayer);
    
    // Créer les zones de collision
    this.createCollisionZones();
    
    this.isActive = true;
    this.logInitializationSummary();
    return true;
  }

  // ✅ ÉTAPE 2 : Scanner les téléports avec logs détaillés
  scanTeleports(worldsLayer) {
    console.log(`🌀 [TransitionManager] === ÉTAPE 2: SCAN OBJETS ===`);
    
    let teleportCount = 0;
    let ignoredCount = 0;

    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      const objType = (obj.type || '').toLowerCase();
      
      console.log(`🌀 [TransitionManager] 📦 Objet ${index}: name="${obj.name}" type="${obj.type}" x=${obj.x} y=${obj.y}`);
      
      if (objName === 'teleport' || objType === 'teleport') {
        const success = this.processTeleport(obj, index);
        if (success) {
          teleportCount++;
        } else {
          ignoredCount++;
        }
      } else {
        console.log(`🌀 [TransitionManager] ⏭️ Objet "${obj.name}" ignoré (pas un téléport)`);
        ignoredCount++;
      }
    });

    console.log(`🌀 [TransitionManager] 📊 RÉSULTAT SCAN:`);
    console.log(`  - ✅ Téléports trouvés: ${teleportCount}`);
    console.log(`  - ⏭️ Objets ignorés: ${ignoredCount}`);
    console.log(`  - 📍 Total objets: ${worldsLayer.objects.length}`);
  }

  // ✅ ÉTAPE 3 : Traitement d'un téléport avec validation
  processTeleport(obj, index) {
    console.log(`🌀 [TransitionManager] === ÉTAPE 3: PROCESS TÉLÉPORT ${index} ===`);
    
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    console.log(`🌀 [TransitionManager] 🔍 Propriétés trouvées:`);
    console.log(`  - targetzone: "${targetZone}"`);
    console.log(`  - targetspawn: "${targetSpawn}"`);
    console.log(`  - position: (${obj.x}, ${obj.y})`);
    console.log(`  - taille: ${obj.width}x${obj.height}`);

    // Validation
    if (!targetZone) {
      console.error(`🌀 [TransitionManager] ❌ ERREUR: Téléport ${index} sans 'targetzone'`);
      console.log(`🌀 [TransitionManager] 📋 Propriétés disponibles:`, obj.properties);
      return false;
    }

    if (!targetSpawn) {
      console.error(`🌀 [TransitionManager] ❌ ERREUR: Téléport ${index} sans 'targetspawn'`);
      return false;
    }

    // Créer l'objet téléport
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
    
    console.log(`🌀 [TransitionManager] ✅ TÉLÉPORT CRÉÉ: "${teleport.id}"`);
    console.log(`  - Route: ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
    console.log(`  - Zone: (${teleport.x}, ${teleport.y}) ${teleport.width}x${teleport.height}`);
    
    return true;
  }

  // ✅ ÉTAPE 4 : Création zones collision avec debug visuel
  createCollisionZones() {
    console.log(`🌀 [TransitionManager] === ÉTAPE 4: CRÉATION COLLISIONS ===`);

    this.teleportZones.forEach((teleportData) => {
      console.log(`🌀 [TransitionManager] 🔨 Création zone: ${teleportData.id}`);
      
      // Zone invisible pour collision
      const zone = this.scene.add.zone(
        teleportData.x + teleportData.width / 2,
        teleportData.y + teleportData.height / 2,
        teleportData.width,
        teleportData.height
      );

      // Physique
      this.scene.physics.world.enableBody(zone, Phaser.Physics.Arcade.STATIC_BODY);
      zone.body.setSize(teleportData.width, teleportData.height);
      zone.transitionData = teleportData;

      // ✅ DEBUG VISUEL TOUJOURS ACTIVÉ
      this.createDebugVisuals(zone, teleportData);

      console.log(`🌀 [TransitionManager] ✅ Zone collision active: ${teleportData.id}`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.teleportZones.size} zones collision créées`);
  }

  // ✅ DEBUG VISUEL AMÉLIORÉ
  createDebugVisuals(zone, teleportData) {
    // Rectangle de zone - TOUJOURS VISIBLE
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.3 // ✅ Plus visible
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(3, 0x00aa00); // ✅ Plus épais
    
    // Texte avec zone de destination - TOUJOURS VISIBLE
    const debugText = this.scene.add.text(
      zone.x, zone.y - 25,
      `🚪 → ${teleportData.targetZone}`,
      {
        fontSize: '14px', // ✅ Plus gros
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 4 }
      }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
    
    console.log(`🌀 [TransitionManager] 🎨 Debug visuel créé pour ${teleportData.id}`);
  }

  // ✅ ÉTAPE 5 : Vérification collision avec logs
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    // ✅ LOG PÉRIODIQUE DE LA POSITION DU JOUEUR (toutes les 2 secondes)
    if (!this.lastPlayerLogTime || Date.now() - this.lastPlayerLogTime > 2000) {
      console.log(`🌀 [TransitionManager] 👤 Position joueur: (${Math.round(player.x)}, ${Math.round(player.y)})`);
      this.lastPlayerLogTime = Date.now();
    }

    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        console.log(`🌀 [TransitionManager] 💥 COLLISION DÉTECTÉE avec ${teleportData.id}!`);
        this.triggerTransition(teleportData);
      }
    });
  }

  // ✅ COLLISION AVEC LOGS
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

    const isColliding = (
      playerBounds.x < teleportBounds.x + teleportBounds.width &&
      playerBounds.x + playerBounds.width > teleportBounds.x &&
      playerBounds.y < teleportBounds.y + teleportBounds.height &&
      playerBounds.y + playerBounds.height > teleportBounds.y
    );

    // ✅ LOG DÉTAILLÉ SEULEMENT SI COLLISION
    if (isColliding) {
      console.log(`🌀 [TransitionManager] 🎯 COLLISION ${teleportData.id}:`);
      console.log(`  - Joueur: (${playerBounds.x}, ${playerBounds.y}) ${playerBounds.width}x${playerBounds.height}`);
      console.log(`  - Téléport: (${teleportBounds.x}, ${teleportBounds.y}) ${teleportBounds.width}x${teleportBounds.height}`);
    }

    return isColliding;
  }

  // ✅ ÉTAPE 6 : Déclenchement transition avec timeout
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.warn(`🌀 [TransitionManager] ⚠️ Transition déjà en cours, annulation`);
      return;
    }

    console.log(`🌀 [TransitionManager] === ÉTAPE 6: DÉBUT TRANSITION ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn: ${teleportData.targetSpawn}`);

    this.isTransitioning = true;

    // ✅ LOADING IMMÉDIAT
    this.showLoadingOverlay(teleportData);

    // ✅ TIMEOUT DE SÉCURITÉ
    this.transitionTimeoutHandle = setTimeout(() => {
      console.error(`🌀 [TransitionManager] ⏰ TIMEOUT TRANSITION (${this.transitionTimeout}ms)`);
      this.handleTransitionError({ reason: "Timeout de transition" });
    }, this.transitionTimeout);

    // ✅ VALIDATION ZONE AVANT ENVOI
    const correctionResult = await this.validateAndCorrectZone(teleportData);
    if (!correctionResult.success) {
      this.handleTransitionError(correctionResult);
      return;
    }

    // ✅ ENVOI AU SERVEUR
    this.sendTransitionRequest(correctionResult.correctedData);
  }

  // ✅ VALIDATION ET CORRECTION DE ZONE
  async validateAndCorrectZone(teleportData) {
    console.log(`🌀 [TransitionManager] === VALIDATION ZONE ===`);
    
    const clientZone = this.scene.zoneName;
    const serverZone = this.scene.networkManager?.getCurrentZone();
    
    console.log(`🔍 Zone client: "${clientZone}"`);
    console.log(`🔍 Zone serveur: "${serverZone}"`);
    console.log(`🔍 Zone téléport: "${teleportData.fromZone}"`);
    
    // Si tout est sync, OK
    if (clientZone === serverZone && serverZone === teleportData.fromZone) {
      console.log(`✅ Zones synchronisées`);
      return { success: true, correctedData: teleportData };
    }
    
    // Correction automatique
    console.warn(`⚠️ DÉSYNCHRONISATION DÉTECTÉE - CORRECTION AUTO`);
    const correctedFromZone = serverZone || clientZone;
    
    const correctedData = {
      ...teleportData,
      fromZone: correctedFromZone
    };
    
    console.log(`🔧 Zone corrigée: ${teleportData.fromZone} → ${correctedFromZone}`);
    
    return { success: true, correctedData };
  }

  // ✅ ENVOI REQUÊTE AU SERVEUR
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
    
    // ✅ SETUP LISTENER RÉPONSE
    this.setupTransitionListener(teleportData);
    
    // ✅ ENVOI
    this.scene.networkManager.room.send("validateTransition", request);
  }

  // ✅ LISTENER RÉPONSE SERVEUR
  setupTransitionListener(teleportData) {
    console.log(`👂 Setup listener validation...`);

    // ✅ Nettoyer ancien listener
    if (this.scene.networkManager.onTransitionValidation) {
      this.scene.networkManager.onTransitionValidation = null;
    }

    // ✅ Handler réponse
    const handleResponse = (result) => {
      console.log(`📨 Réponse serveur:`, result);
      
      this.clearTransitionTimeout();
      this.scene.networkManager.onTransitionValidation = null;
      
      if (result.success) {
        this.handleTransitionSuccess(result, teleportData);
      } else {
        this.handleTransitionError(result);
      }
    };

    this.scene.networkManager.onTransitionValidation = handleResponse;
  }

  // ✅ SUCCÈS TRANSITION
  handleTransitionSuccess(result, teleportData) {
    console.log(`🌀 [TransitionManager] ✅ TRANSITION VALIDÉE`);
    
    const targetScene = this.getSceneFromZone(teleportData.targetZone);
    
    if (!targetScene) {
      console.error(`❌ Scene introuvable pour zone: ${teleportData.targetZone}`);
      this.handleTransitionError({ reason: `Zone inconnue: ${teleportData.targetZone}` });
      return;
    }

    // Même scène = repositionnement local
    if (targetScene === this.scene.scene.key) {
      console.log(`📍 Repositionnement local`);
      this.repositionPlayer(result);
      this.hideLoadingOverlay();
      this.resetTransitionState();
      return;
    }

    // Changement de scène
    console.log(`🚀 Changement vers: ${targetScene}`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      preservePlayer: true
    };

    this.scene.scene.start(targetScene, transitionData);
  }

  // ✅ ERREUR TRANSITION
  handleTransitionError(result) {
    console.error(`🌀 [TransitionManager] ❌ ERREUR TRANSITION:`, result.reason);
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.resetTransitionState();
  }

  // ✅ RESET ÉTAT TRANSITION
  resetTransitionState() {
    this.isTransitioning = false;
    this.clearTransitionTimeout();
    console.log(`🌀 [TransitionManager] 🔄 État transition réinitialisé`);
  }

  // ✅ CLEAR TIMEOUT
  clearTransitionTimeout() {
    if (this.transitionTimeoutHandle) {
      clearTimeout(this.transitionTimeoutHandle);
      this.transitionTimeoutHandle = null;
    }
  }

  // ✅ REPOSITIONNEMENT LOCAL
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

  // ✅ LOADING OVERLAY
  showLoadingOverlay(teleportData) {
    console.log(`🔄 Affichage loading...`);
    // ... code loading identique ...
    this.loadingOverlay = this.scene.add.container(0, 0).setDepth(9999).setScrollFactor(0);
    // ... reste du code loading ...
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
      console.log(`🔄 Loading masqué`);
    }
  }

  // ✅ POPUP ERREUR
  showErrorPopup(message) {
    console.log(`🚫 Affichage erreur: ${message}`);
    // ... code popup identique ...
  }

  // ✅ LOG RÉSUMÉ INITIALISATION
  logInitializationSummary() {
    console.log(`🌀 [TransitionManager] === RÉSUMÉ INITIALISATION ===`);
    console.log(`📍 Zone courante: ${this.currentZone}`);
    console.log(`🔧 État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`📍 Téléports trouvés: ${this.teleportZones.size}`);
    
    if (this.teleportZones.size > 0) {
      console.log(`📋 LISTE DES TÉLÉPORTS:`);
      this.teleportZones.forEach((teleport, id) => {
        console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
      });
    }
    
    console.log(`🌀 [TransitionManager] === INITIALISATION TERMINÉE ===`);
  }

  // ✅ HELPERS UTILITAIRES
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
    return mapping[zoneName] || null;
  }

  // ✅ DEBUG ET NETTOYAGE
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
    
    console.log(`🌀 [TransitionManager] ✅ Détruit`);
  }

  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}`);
  }
}
