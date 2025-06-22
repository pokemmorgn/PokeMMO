// client/src/transitions/TransitionManager.js
// ✅ VERSION PROPRE — PAS D’IMPORTS DE SCÈNES, TRANSITION FIABLE

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;

    this.teleportZones = new Map();
    this.currentZone = this.getZoneFromScene(scene.scene.key);

    this.loadingOverlay = null;
    this.transitionStartTime = 0;
    this.transitionTimeout = 10000;
    console.log(`🌀 [TransitionManager] Système dynamique initialisé pour zone: ${this.currentZone}`);
  }

  initialize() {
    console.log(`🌀 [TransitionManager] === SCAN TÉLÉPORTS POUR COLLISION ===`);
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ Aucune map trouvée!`);
      return false;
    }
    const worldsLayer = this.scene.map.getObjectLayer('Worlds');
    if (!worldsLayer) {
      console.warn(`🌀 [TransitionManager] ⚠️ Layer "Worlds" introuvable`);
      return false;
    }
    let teleportCount = 0;
    worldsLayer.objects.forEach((obj, index) => {
      const objName = (obj.name || '').toLowerCase();
      if (objName === 'teleport') {
        this.processTeleport(obj, index);
        teleportCount++;
      }
    });
    console.log(`🌀 [TransitionManager] ✅ ${teleportCount} téléports trouvés`);
    this.createCollisionZones();
    if (this.debugMode) this.debugInfo();
    this.isActive = true;
    return true;
  }

  processTeleport(obj, index) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');
    if (!targetZone || !targetSpawn) return;
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
      if (this.debugMode) this.createDebugVisuals(zone, teleportData);
    });
  }

  createDebugVisuals(zone, teleportData) {
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0x00ff00, 0.2
    );
    debugRect.setDepth(999);
    debugRect.setStrokeStyle(2, 0x00aa00);
    const debugText = this.scene.add.text(
      zone.x, zone.y - 20,
      `→ ${teleportData.targetZone}`,
      { fontSize: '12px', fill: '#fff', backgroundColor: '#000', padding: { x: 4, y: 2 } }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
  }

  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;
    if (this.scene.justArrivedAtZone) return;
    this.teleportZones.forEach((teleportData) => {
      if (this.isPlayerCollidingWithTeleport(player, teleportData)) {
        this.triggerTransition(teleportData);
      }
    });
  }

  isPlayerCollidingWithTeleport(player, teleportData) {
    const playerBounds = {
      x: player.x - 16, y: player.y - 32, width: 32, height: 32
    };
    const teleportBounds = {
      x: teleportData.x, y: teleportData.y,
      width: teleportData.width, height: teleportData.height
    };
    return (
      playerBounds.x < teleportBounds.x + teleportBounds.width &&
      playerBounds.x + playerBounds.width > teleportBounds.x &&
      playerBounds.y < teleportBounds.y + teleportBounds.height &&
      playerBounds.y + playerBounds.height > teleportBounds.y
    );
  }

  async triggerTransition(teleportData) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.transitionStartTime = Date.now();
    this.showLoadingOverlay(teleportData);
    const correctionResult = await this.checkAndCorrectZoneDesync(teleportData);
    if (!correctionResult.success) {
      this.hideLoadingOverlay();
      this.showErrorPopup(correctionResult.reason);
      this.isTransitioning = false;
      return;
    }
    const correctedTeleportData = correctionResult.correctedData;
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      this.hideLoadingOverlay();
      this.showErrorPopup("Joueur local introuvable");
      this.isTransitioning = false;
      return;
    }
    const timeoutHandle = setTimeout(() => {
      this.hideLoadingOverlay();
      this.showErrorPopup("Timeout de transition (10s)");
      this.isTransitioning = false;
    }, this.transitionTimeout);

    this.setupTransitionListener(correctedTeleportData, timeoutHandle);

    if (this.scene.networkManager?.room) {
      const request = {
        fromZone: correctedTeleportData.fromZone,
        targetZone: correctedTeleportData.targetZone,
        playerX: myPlayer.x,
        playerY: myPlayer.y,
        teleportId: correctedTeleportData.id
      };
      this.scene.networkManager.room.send("validateTransition", request);
    } else {
      clearTimeout(timeoutHandle);
      this.hideLoadingOverlay();
      this.showErrorPopup("Pas de connexion serveur");
      this.isTransitioning = false;
    }
  }

  async checkAndCorrectZoneDesync(teleportData) {
    const clientZone = this.scene.zoneName;
    const serverZone = this.scene.networkManager?.getCurrentZone();
    if (clientZone === serverZone && serverZone === teleportData.fromZone) {
      return { success: true, correctedData: teleportData };
    }
    const correctedFromZone = serverZone || clientZone;
    if (this.scene.networkManager) {
      this.scene.networkManager.currentZone = correctedFromZone;
    }
    const correctedTeleportData = { ...teleportData, fromZone: correctedFromZone };
    return { success: true, correctedData: correctedTeleportData };
  }

  setupTransitionListener(teleportData, timeoutHandle) {
    if (!this.scene.networkManager?.room) {
      clearTimeout(timeoutHandle);
      this.hideLoadingOverlay();
      this.showErrorPopup("Pas de connexion réseau");
      this.isTransitioning = false;
      return;
    }
    if (this.scene.networkManager.onTransitionValidation) {
      this.scene.networkManager.onTransitionValidation = null;
    }
    const handleTransitionResult = (result) => {
      clearTimeout(timeoutHandle);
      this.scene.networkManager.onTransitionValidation = null;
      if (result.success) {
        this.handleTransitionSuccess(result, teleportData);
      } else {
        this.handleTransitionError(result);
      }
    };
    this.scene.networkManager.onTransitionValidation = handleTransitionResult;
  }

  // ============ PATCH PRINCIPAL: PAS DE REMOVE/ADD, NI IMPORT =============
  handleTransitionSuccess(result, teleportData) {
    const targetScene = this.getSceneFromZone(teleportData.targetZone);

    if (!targetScene) {
      this.hideLoadingOverlay();
      this.showErrorPopup(`Zone inconnue: ${teleportData.targetZone}`);
      this.isTransitioning = false;
      return;
    }
    // Si déjà active (rare !), stoppe-la proprement avant start
    if (this.scene.scene.isActive(targetScene)) {
      this.scene.scene.stop(targetScene);
    }
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

  handleTransitionError(result) {
    this.hideLoadingOverlay();
    this.showErrorPopup(result.reason || "Erreur de transition");
    this.isTransitioning = false;
  }

  repositionPlayer(result) {
    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (myPlayer && result.position) {
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;
      if (this.scene.cameraManager) {
        this.scene.cameraManager.snapToPlayer();
      }
    }
  }

  showLoadingOverlay(teleportData) {
    this.loadingOverlay = this.scene.add.container(0, 0).setDepth(9999).setScrollFactor(0);
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x1a1a2e,
      0.9
    );
    const modalWidth = 400, modalHeight = 200;
    const modalBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth,
      modalHeight,
      0x2d3748
    ).setStrokeStyle(2, 0x4a5568);
    const borderBg = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      modalWidth + 8,
      modalHeight + 8,
      0x4299e1
    );
    const titleText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 50,
      'Transition en cours...',
      { fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#fff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    const destText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 20,
      `Vers: ${teleportData.targetZone}`,
      { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#a0aec0' }
    ).setOrigin(0.5);
    const spinner = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 20,
      '⟳',
      { fontSize: '24px', color: '#4299e1' }
    ).setOrigin(0.5);
    this.scene.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });
    this.loadingOverlay.add([borderBg, modalBg, overlay, titleText, destText, spinner]);
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.destroy();
      this.loadingOverlay = null;
    }
  }

  showErrorPopup(message) {
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
      { fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#fff', align: 'center', wordWrap: { width: 300 } }
    ).setOrigin(0.5);
    errorPopup.add([popupBg, errorText]);
    this.scene.time.delayedCall(3000, () => { errorPopup.destroy(); });
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
    return mapping[zoneName] || null;
  }

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

  destroy() {
    this.hideLoadingOverlay();
    this.teleportZones.clear();
    this.isActive = false;
    this.isTransitioning = false;
  }

  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }
}
