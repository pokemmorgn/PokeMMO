// client/src/transitions/TransitionManager.js
// ✅ VERSION DYNAMIQUE - SYNC AVEC SYSTÈME SERVEUR

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    // Collections locales (pour collision seulement)
    this.teleportZones = new Map(); // Zones de collision pour téléports
    this.currentZone = this.getZoneFromScene(scene.scene.key);
    
    // Loading overlay
    this.loadingOverlay = null;
    this.transitionStartTime = 0;
    this.transitionTimeout = 10000; // 10 secondes max
    
    console.log(`🌀 [TransitionManager] Système dynamique initialisé pour zone: ${this.currentZone}`);
  }

  // ✅ INITIALISATION: Scanner les téléports pour collision locale
  initialize() {
    console.log(`🌀 [TransitionManager] === SCAN TÉLÉPORTS POUR COLLISION ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ Aucune map trouvée!`);
      return false;
    }

    // Chercher le layer "Worlds" (ou autres)
    const worldsLayer = this.scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`🌀 [TransitionManager] ⚠️ Layer "Worlds" introuvable`);
      return false;
    }

    console.log(`🌀 [TransitionManager] 📂 Scan layer "Worlds" (${worldsLayer.objects.length} objets)`);

    // Scanner SEULEMENT les téléports
    let teleportCount = 0;
    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      
      if (objName === 'teleport') {
        this.processTeleport(obj, index);
        teleportCount++;
      }
      // ✅ IGNORER les spawns - le serveur gère tout
    });

    console.log(`🌀 [TransitionManager] ✅ ${teleportCount} téléports trouvés`);

    // Créer les zones de collision
    this.createCollisionZones();
    
    if (this.debugMode) {
      this.debugInfo();
    }

    this.isActive = true;
    return true;
  }

  // ✅ TRAITER UN TÉLÉPORT (récupération des propriétés)
  processTeleport(obj, index) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone) {
      console.warn(`🌀 [TransitionManager] ⚠️ Téléport ${index} sans 'targetzone'`);
      return;
    }

    if (!targetSpawn) {
      console.warn(`🌀 [TransitionManager] ⚠️ Téléport ${index} sans 'targetspawn'`);
      return;
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
    
    console.log(`🌀 [TransitionManager] 📍 Téléport "${teleport.id}": ${this.currentZone} → ${targetZone}[${targetSpawn}]`);
  }

  // ✅ CRÉER ZONES DE COLLISION PHASER
  createCollisionZones() {
    console.log(`🌀 [TransitionManager] === CRÉATION ZONES COLLISION ===`);

    this.teleportZones.forEach((teleportData) => {
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

      // Debug visuel
      if (this.debugMode) {
        this.createDebugVisuals(zone, teleportData);
      }

      console.log(`🌀 [TransitionManager] ✅ Zone collision créée: ${teleportData.id}`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.teleportZones.size} zones collision actives`);
  }

  // ✅ DEBUG VISUEL STYLE POKÉMON
  createDebugVisuals(zone, teleportData) {
    // Rectangle de zone
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.2
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(2, 0x00aa00);
    
    // Texte avec zone de destination
    const debugText = this.scene.add.text(
      zone.x, zone.y - 20,
      `→ ${teleportData.targetZone}`,
      {
        fontSize: '12px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
  }

  // ✅ VÉRIFIER COLLISIONS À CHAQUE FRAME
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        this.triggerTransition(teleportData);
      }
    });
  }

  // ✅ COLLISION SIMPLE RECTANGLE/RECTANGLE
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

  // ✅ DÉCLENCHER TRANSITION AVEC LOADING
async triggerTransition(teleportData) {
  if (this.isTransitioning) {
    console.log(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
    return;
  }

  console.log(`🌀 [TransitionManager] === DÉBUT TRANSITION ===`);
  console.log(`📍 De: ${teleportData.fromZone}`);
  console.log(`📍 Vers: ${teleportData.targetZone}`);
  console.log(`🎯 TargetSpawn: ${teleportData.targetSpawn}`);

  this.isTransitioning = true;
  this.transitionStartTime = Date.now();

  // ✅ AFFICHER LE LOADING IMMÉDIATEMENT (avant toute validation)
  this.showLoadingOverlay(teleportData);

  // ✅ NOUVEAU: Vérifier et corriger la désynchronisation AVANT d'envoyer
  const correctionResult = await this.checkAndCorrectZoneDesync(teleportData);
  if (!correctionResult.success) {
    this.hideLoadingOverlay();
    this.showErrorPopup(correctionResult.reason);
    this.isTransitioning = false;
    return;
  }

  // ✅ Utiliser les données corrigées
  const correctedTeleportData = correctionResult.correctedData;

  // Obtenir la position du joueur
  const myPlayer = this.scene.playerManager?.getMyPlayer();
  if (!myPlayer) {
    console.error(`🌀 [TransitionManager] ❌ Joueur local introuvable`);
    this.hideLoadingOverlay();
    this.showErrorPopup("Joueur local introuvable");
    this.isTransitioning = false;
    return;
  }

  // ✅ SETUP TIMEOUT DE SÉCURITÉ
  const timeoutHandle = setTimeout(() => {
    console.error(`🌀 [TransitionManager] ⏰ TIMEOUT DE TRANSITION`);
    this.hideLoadingOverlay();
    this.showErrorPopup("Timeout de transition (10s)");
    this.isTransitioning = false;
  }, this.transitionTimeout);

  // ✅ SETUP LISTENER DE VALIDATION
  this.setupTransitionListener(correctedTeleportData, timeoutHandle);

  // ✅ ENVOYER DEMANDE AU SERVEUR AVEC DONNÉES CORRIGÉES
  if (this.scene.networkManager?.room) {
    const request = {
      fromZone: correctedTeleportData.fromZone, // ✅ Zone corrigée
      targetZone: correctedTeleportData.targetZone,
      playerX: myPlayer.x,
      playerY: myPlayer.y,
      teleportId: correctedTeleportData.id
    };

    console.log(`📤 [TransitionManager] Envoi demande serveur (corrigée):`, request);
    this.scene.networkManager.room.send("validateTransition", request);
  } else {
    console.error(`🌀 [TransitionManager] ❌ Pas de connexion serveur`);
    clearTimeout(timeoutHandle);
    this.hideLoadingOverlay();
    this.showErrorPopup("Pas de connexion serveur");
    this.isTransitioning = false;
  }
}

// ✅ NOUVELLE MÉTHODE: Vérifier et corriger la désynchronisation
async checkAndCorrectZoneDesync(teleportData) {
  console.log(`🔄 [TransitionManager] === VÉRIFICATION DÉSYNC ===`);
  
  // Obtenir la zone serveur et client
  const clientZone = this.scene.zoneName; // Zone de la scène actuelle
  const serverZone = this.scene.networkManager?.getCurrentZone(); // Zone du serveur
  
  console.log(`🔍 [TransitionManager] Client zone: ${clientZone}`);
  console.log(`🔍 [TransitionManager] Server zone: ${serverZone}`);
  console.log(`🔍 [TransitionManager] Teleport fromZone: ${teleportData.fromZone}`);
  
  // Si tout est synchronisé, pas de problème
  if (clientZone === serverZone && serverZone === teleportData.fromZone) {
    console.log(`✅ [TransitionManager] Zones synchronisées`);
    return {
      success: true,
      correctedData: teleportData
    };
  }
  
  // ✅ CORRECTION AUTOMATIQUE
  console.warn(`⚠️ [TransitionManager] DÉSYNCHRONISATION DÉTECTÉE - CORRECTION AUTO`);
  console.warn(`   Client: ${clientZone}`);
  console.warn(`   Serveur: ${serverZone}`);
  console.warn(`   Téléport: ${teleportData.fromZone}`);
  
  // Utiliser la zone du serveur comme référence (plus fiable)
  const correctedFromZone = serverZone || clientZone;
  
  // Mettre à jour le NetworkManager
  if (this.scene.networkManager) {
    this.scene.networkManager.currentZone = correctedFromZone;
    console.log(`🔧 [TransitionManager] Zone NetworkManager mise à jour: ${correctedFromZone}`);
  }
  
  // Créer les données de téléport corrigées
  const correctedTeleportData = {
    ...teleportData,
    fromZone: correctedFromZone
  };
  
  console.log(`✅ [TransitionManager] Correction appliquée: ${teleportData.fromZone} → ${correctedFromZone}`);
  
  return {
    success: true,
    correctedData: correctedTeleportData
  };
}

  // ✅ SUCCÈS DE TRANSITION
  handleTransitionSuccess(result, teleportData) {
    const targetScene = this.getSceneFromZone(teleportData.targetZone);
    
    if (!targetScene) {
      console.error(`🌀 [TransitionManager] ❌ Scene introuvable pour zone: ${teleportData.targetZone}`);
      this.hideLoadingOverlay();
      this.showErrorPopup(`Zone inconnue: ${teleportData.targetZone}`);
      this.isTransitioning = false;
      return;
    }

    // ✅ PAS DE CHANGEMENT DE SCÈNE = REPOSITIONNEMENT LOCAL
    if (targetScene === this.scene.scene.key) {
      console.log(`📍 [TransitionManager] Repositionnement dans la même scène`);
      this.repositionPlayer(result);
      this.hideLoadingOverlay();
      this.isTransitioning = false;
      return;
    }

    // ✅ CHANGEMENT DE SCÈNE
    console.log(`🚀 [TransitionManager] Changement vers: ${targetScene}`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      preservePlayer: true
    };

    // ✅ LE LOADING SERA MASQUÉ PAR LA NOUVELLE SCÈNE
    this.scene.scene.start(targetScene, transitionData);
  }

  // ✅ ERREUR DE TRANSITION
  handleTransitionError(result) {
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.isTransitioning = false;
  }

  // ✅ REPOSITIONNEMENT LOCAL
  repositionPlayer(result) {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (myPlayer && result.position) {
      console.log(`📍 [TransitionManager] Repositionnement: (${result.position.x}, ${result.position.y})`);
      
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;

      // Snap caméra
      if (this.scene.cameraManager) {
        this.scene.cameraManager.snapToPlayer();
      }
    }
  }

  // ✅ LOADING OVERLAY STYLE POKÉMON
  showLoadingOverlay(teleportData) {
    // Conteneur principal
    this.loadingOverlay = this.scene.add.container(0, 0).setDepth(9999).setScrollFactor(0);

    // Fond semi-transparent
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x1a1a2e,
      0.9
    );

    // Conteneur du modal (style de ton UI)
    const modalWidth = 400;
    const modalHeight = 200;
    const modalBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth,
      modalHeight,
      0x2d3748
    ).setStrokeStyle(2, 0x4a5568);

    // Bordure externe (style bleu de ton UI)
    const borderBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth + 8,
      modalHeight + 8,
      0x4299e1
    );

    // Titre
    const titleText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 50,
      'Transition en cours...',
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Destination
    const destText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 20,
      `Vers: ${teleportData.targetZone}`,
      {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#a0aec0'
      }
    ).setOrigin(0.5);

    // Spinner simple (rotation)
    const spinner = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 20,
      '⟳',
      {
        fontSize: '24px',
        color: '#4299e1'
      }
    ).setOrigin(0.5);

    // Animation rotation
    this.scene.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });

    // Ajouter au conteneur
    this.loadingOverlay.add([borderBg, modalBg, overlay, titleText, destText, spinner]);

    console.log(`🔄 [TransitionManager] Loading affiché`);
  }

  // ✅ MASQUER LOADING
  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
      console.log(`🔄 [TransitionManager] Loading masqué`);
    }
  }

  // ✅ POPUP D'ERREUR SIMPLE
  showErrorPopup(message) {
    // Créer popup temporaire
    const errorPopup = this.scene.add.container(0, 0).setDepth(10000).setScrollFactor(0);

    const popupBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      350, 120,
      0xdc2626
    ).setStrokeStyle(2, 0x991b1b);

    const errorText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      `Erreur de transition:\n${message}`,
      {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 300 }
      }
    ).setOrigin(0.5);

    errorPopup.add([popupBg, errorText]);

    // Auto-destruction après 3 secondes
    this.scene.time.delayedCall(3000, () => {
      if (errorPopup) {
        errorPopup.destroy();
      }
    });

    console.log(`🚫 [TransitionManager] Erreur affichée: ${message}`);
  }

  // ✅ HELPER: Récupérer propriété d'objet Tiled
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ MAPPING ZONE ↔ SCÈNE
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

  // ✅ DEBUG INFO
  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG TRANSITION DYNAMIQUE ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    console.log(`État: ${this.isActive ? 'ACTIF' : 'INACTIF'}`);
    console.log(`En transition: ${this.isTransitioning}`);
    
    console.log(`📍 TÉLÉPORTS (${this.teleportZones.size}):`);
    this.teleportZones.forEach((teleport, id) => {
      console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
    });
  }

  // ✅ NETTOYAGE
  destroy() {
    console.log(`🌀 [TransitionManager] Nettoyage...`);
    
    this.hideLoadingOverlay();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    
    console.log(`🌀 [TransitionManager] ✅ Nettoyé`);
  }

  // ✅ CONTRÔLE EXTERNE
  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }
}
