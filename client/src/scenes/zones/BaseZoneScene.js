this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}] Transition échouée:`, result);
      this.handleTransitionError(result);
    });

    console.log(`✅ [${this.scene.key}] Tous les handlers WorldRoom configurés`);
  }

  setupQuestStatusHandler() {
    console.log(`🎯 [${this.scene.key}] Configuration handler quest statuses...`);
    
    this.networkManager.onMessage("questStatuses", (data) => {
      console.log(`🎯 [${this.scene.key}] Quest statuses reçus:`, data);
      
      if (this.npcManager && data.questStatuses && data.questStatuses.length > 0) {
        console.log(`✅ [${this.scene.key}] Mise à jour des indicateurs de quête`);
        this.npcManager.updateQuestIndicators(data.questStatuses);
      }
    });
  }
  
  setupExistingHandlers() {
    this.networkManager.onSnap((data) => {
      if (this.playerManager) {
        this.playerManager.snapMyPlayerTo(data.x, data.y);
      }
    });
    
    this.networkManager.onDisconnect(() => {
      this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\nDisconnected from WorldRoom`);
      
      if (window.TeamManager) {
        console.log(`🧹 [${this.scene.key}] Nettoyage TeamManager suite à déconnexion`);
        if (typeof window.TeamManager.destroy === 'function') {
          window.TeamManager.destroy();
        }
      }
      this.teamSystemInitialized = false;
    });
  }

  initializeInventorySystem() {
    if (window.inventorySystem) {
      console.log(`[${this.scene.key}] Réutilisation de l'inventaire global existant`);
      if (this.networkManager?.room) {
        window.inventorySystem.gameRoom = this.networkManager.room;
        window.inventorySystem.setupServerListeners();
      }
      this.inventorySystem = window.inventorySystem;
      this.inventoryInitialized = true;
      return;
    }

    try {
      console.log(`🎒 [${this.scene.key}] Initialisation du système d'inventaire...`);
      this.inventorySystem = new InventorySystem(this, this.networkManager.room);

      if (this.inventorySystem.inventoryUI) {
        this.inventorySystem.inventoryUI.currentLanguage = 'en';
      }

      window.inventorySystem = this.inventorySystem;
      window.inventorySystemGlobal = this.inventorySystem;

      this.setupInventoryEventHandlers();

      if (typeof window.connectInventoryToServer === 'function') {
        window.connectInventoryToServer(this.networkManager.room);
      }

      this.inventoryInitialized = true;
      console.log(`✅ [${this.scene.key}] Système d'inventaire initialisé`);

      this.time.delayedCall(2000, () => {
        this.testInventoryConnection();
      });

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation inventaire:`, error);
    }
  }

  testInventoryConnection() {
    if (!this.inventorySystem || !this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Cannot test inventory: no system or room`);
      return;
    }

    console.log(`🧪 [${this.scene.key}] Test de connexion inventaire...`);
    this.inventorySystem.requestInventoryData();
  }
  
  setupInventoryEventHandlers() { }
  
  initializeQuestSystem() {
    if (!window.questSystem && this.networkManager?.room) {
      try {
        window.questSystem = new QuestSystem(this, this.networkManager.room);
        console.log("✅ [QuestSystem] Initialisé");
      } catch (e) {
        console.error("❌ Erreur init QuestSystem:", e);
      }
    }
  }

  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`✅ [${this.scene.key}] Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

        if (this.cameraManager) {
          this.cameraManager.followPlayer(myPlayer);
          this.cameraFollowing = true;
        } else {
          console.warn(`⚠️ [${this.scene.key}] CameraManager pas encore prêt, attente...`);
          this.time.delayedCall(500, () => {
            if (this.cameraManager) {
              console.log(`🔄 [${this.scene.key}] CameraManager prêt, activation caméra`);
              this.cameraManager.followPlayer(myPlayer);
              this.cameraFollowing = true;
            } else {
              console.error(`❌ [${this.scene.key}] CameraManager toujours absent après 500ms`);
            }
          });
        }

        this.positionPlayer(myPlayer);
        
        if (typeof this.onPlayerReady === 'function') {
          this.onPlayerReady(myPlayer);
        }
      }
    });
  }

  verifyNetworkState() {
    if (!this.networkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager manquant`);
      return;
    }
    
    console.log(`🔍 [${this.scene.key}] Vérification état réseau...`);
    
    this.networkManager.debugState();
    this.networkManager.checkZoneSynchronization(this.scene.key);
    
    if (this.playerManager) {
      this.time.delayedCall(500, () => {
        this.playerManager.forceResynchronization();
      });
    }
  }

  positionPlayer(player) {
    const initData = this.scene.settings.data;
    
    console.log(`📍 [${this.scene.key}] Positionnement joueur...`);
    console.log(`📊 InitData:`, initData);
    console.log(`👤 Position actuelle du joueur: (${player.x}, ${player.y})`);
    
    if (player.x !== undefined && player.y !== undefined && 
        player.x !== 0 && player.y !== 0) {
      console.log(`📍 [${this.scene.key}] Position serveur conservée: (${player.x}, ${player.y})`);
      
      player.setVisible(true);
      player.setActive(true);
      player.setDepth(5);

      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 32;
        player.indicator.setVisible(true);
      }

      if (this.networkManager && this.networkManager.isConnected) {
        this.networkManager.sendMove(player.x, player.y, 'down', false);
      }

      this.onPlayerPositioned(player, initData);
      return;
    }
    
    if (initData?.fromTransition && initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      console.log(`📍 [${this.scene.key}] Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
      player.x = initData.spawnX;
      player.y = initData.spawnY;
      player.targetX = initData.spawnX;
      player.targetY = initData.spawnY;
    } 
    else {
      console.warn(`⚠️ [${this.scene.key}] FALLBACK - Aucune position valide trouvée`);
      const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
      console.log(`📍 [${this.scene.key}] Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
      player.x = defaultPos.x;
      player.y = defaultPos.y;
      player.targetX = defaultPos.x;
      player.targetY = defaultPos.y;
    }

    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
      player.indicator.setVisible(true);
    }

    if (this.networkManager && this.networkManager.isConnected) {
      this.networkManager.sendMove(player.x, player.y, 'down', false);
    }

    this.onPlayerPositioned(player, initData);
  }

  showErrorState(message) {
    if (window.hideLoadingOverlay) window.hideLoadingOverlay();

    this.updateInfoText(`PokeWorld MMO\n${this.scene.key}\n${message}`);
    
    this.time.delayedCall(5000, () => {
      if (!this.networkSetupComplete) {
        console.log(`🔄 [${this.scene.key}] Tentative de reconnexion...`);
        this.initializeWithExistingConnection();
      }
    });
  }

  updateInfoText(text) {
    if (this.infoText) {
      this.infoText.setText(text);
    }
  }

  update() {
    TransitionIntegration.updateTransitions(this);
    
    if (this.time.now % 1000 < 16) {
      this.checkPlayerState();
    }

    if (this.playerManager) this.playerManager.update();
    if (this.cameraManager) this.cameraManager.update();

    if (this.sys.animatedTiles && typeof this.sys.animatedTiles.update === 'function') {
      this.sys.animatedTiles.update();
    }

    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && this.coordsText) {
      this.coordsText.setText(`Player: x:${Math.round(myPlayer.x)}, y:${Math.round(myPlayer.y)}`);
    }

    if (!this.networkManager?.getSessionId()) return;
    const myPlayerState = this.networkManager.getPlayerState(this.networkManager.getSessionId());
    if (!myPlayerState) return;

    this.handleMovement(myPlayerState);

    if (myPlayer && myPlayer.isMovingLocally) {
      this.checkForEncounters(myPlayer.x, myPlayer.y);
    }
  }

  isSceneStillValid(expectedScene) {
    return this.scene && this.scene.key === expectedScene && this.scene.isActive();
  }
  
  cleanup() {
    TransitionIntegration.cleanupTransitions(this);

    if (this.scene.isActive(this.scene.key)) {
      this.scene.stop(this.scene.key);
      console.log(`[${this.scene.key}] ⛔ Scene stoppée (cleanup)`);
    }

    if (this.networkManager?.room) {
      this.networkManager.room.removeAllListeners("currentZone");
      this.networkManager.room.removeAllListeners("snap");
      this.networkManager.room.removeAllListeners("questStatuses");
      this.networkManager.room.removeAllListeners("wildEncounter");
      this.networkManager.room.removeAllListeners("encounterFailed");
      this.networkManager.room.removeAllListeners("encounterZoneInfo");
      console.log(`[${this.scene.key}] 🎧 Nettoyage des écouteurs réseau`);
    }

    console.log(`🧹 [${this.scene.key}] Nettoyage optimisé...`);

    const isTransition = this.networkManager && this.networkManager.isTransitionActive;
    
    if (!isTransition) {
      if (this.playerManager) {
        this.playerManager.clearAllPlayers();
      }
    } else {
      console.log(`🔄 [${this.scene.key}] Nettoyage léger pour transition`);
    }

    if (this.interactionManager) {
      this.interactionManager.destroy();
      this.interactionManager = null;
    }

    if (this.teamSystemInitialized && window.TeamManager) {
      if (!isTransition) {
        console.log(`🧹 [${this.scene.key}] Nettoyage TeamManager (non-transition)`);
        if (typeof window.TeamManager.destroy === 'function') {
          window.TeamManager.destroy();
        }
        this.teamSystemInitialized = false;
      } else {
        console.log(`🔄 [${this.scene.key}] TeamManager conservé pour transition`);
      }
    }

    // ✅ VERSION SIMPLE: Setup des inputs sans complications
  setupInputs() {
    console.log(`⌨️ [${this.scene.key}] Setup inputs basique...`);
    
    // ✅ Setup basique Phaser - pas d'InputManager complexe
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.input.keyboard.enableGlobalCapture();

    // ✅ CRÉER UN INPUTMANAGER SIMPLE
    try {
      import('../../input/InputManager.js').then(({ InputManager }) => {
        this.inputManager = new InputManager(this);
        console.log(`✅ [${this.scene.key}] InputManager créé`);
      }).catch(error => {
        console.warn(`⚠️ [${this.scene.key}] InputManager import échoué, fallback Phaser:`, error);
        // Pas grave, on continue avec Phaser
      });
    } catch (error) {
      console.warn(`⚠️ [${this.scene.key}] InputManager échec, fallback Phaser:`, error);
    }

    // ✅ Raccourcis debug
    this.input.keyboard.on('keydown-C', () => {
      this.debugCollisions();
    });

    this.input.keyboard.on('keydown-F', () => {
      this.debugEncounters();
    });

    this.input.keyboard.on('keydown-G', () => {
      this.forceEncounterTest();
    });

    console.log(`✅ [${this.scene.key}] Inputs configurés`);
  }

  createUI() {
    this.infoText = this.add.text(16, 16, `PokeWorld MMO\n${this.scene.key}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 50, 0, 0.8)',
      padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    this.coordsText = this.add.text(this.scale.width - 16, 16, 'Player: x:0, y:0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(255, 0, 0, 0.8)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000).setOrigin(1, 0);

    this.encounterText = this.add.text(16, this.scale.height - 60, 'Encounters: Not initialized', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      backgroundColor: 'rgba(0, 0, 255, 0.8)',
      padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
  }

  handleZoneData(data) {
    console.log(`🗺️ [${this.scene.key}] Handling zone data for: ${data.zone}`);
    
    if (data.zone !== this.zoneName) {
      console.warn(`[${this.scene.key}] Zone data pour ${data.zone} mais nous sommes dans ${this.zoneName}`);
      return;
    }

    if (data.music && this.sound) {
      this.sound.stopAll();
      this.sound.play(data.music, { loop: true, volume: 0.5 });
    }

    console.log(`✅ [${this.scene.key}] Zone data appliquée`);
  }

  handleTransitionError(result) {
    console.error(`❌ [${this.scene.key}] Erreur transition: ${result.reason}`);
    this.showNotification(`Transition impossible: ${result.reason}`, 'error');
  }

  checkPlayerState() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      if (this.playerManager && this.mySessionId) {
        this.playerManager.forceResynchronization();
      }
      return false;
    }
    
    let fixed = false;
    
    if (!myPlayer.visible) {
      myPlayer.setVisible(true);
      fixed = true;
    }
    
    if (!myPlayer.active) {
      myPlayer.setActive(true);
      fixed = true;
    }
    
    if (myPlayer.depth !== 3.5) {
      myPlayer.setDepth(3.5);
      fixed = true;
    }
    
    if (myPlayer.indicator) {
      if (!myPlayer.indicator.visible) {
        myPlayer.indicator.setVisible(true);
        fixed = true;
      }
      
      if (Math.abs(myPlayer.indicator.x - myPlayer.x) > 1 || 
          Math.abs(myPlayer.indicator.y - (myPlayer.y - 24)) > 1) {
        myPlayer.indicator.x = myPlayer.x;
        myPlayer.indicator.y = myPlayer.y - 24;
        fixed = true;
      }
    }

    this.updateEncounterDisplay(myPlayer);
    
    return true;
  }

  updateEncounterDisplay(myPlayer) {
    if (!this.encounterText || !this.encounterManager || !myPlayer) return;

    const posInfo = this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y);
    
    let displayText = `Encounters: `;
    
    if (this.encounterInitialized) {
      displayText += `✅ | Zone: ${posInfo.zoneId || 'None'} | `;
      displayText += `Grass: ${posInfo.isOnGrass ? '✅' : '❌'} | `;
      displayText += `Water: ${posInfo.isOnWater ? '❌' : '❌'} | `;
      displayText += `Can: ${posInfo.canEncounter ? '✅' : '❌'}`;
    } else {
      displayText += `❌ Not initialized`;
    }
    
    this.encounterText.setText(displayText);
  }

  showNotification(message, type = 'info') {
    if (this.interactionManager) {
      this.interactionManager.showMessage(message, type);
      return;
    }

    const notification = this.add.text(
      this.cameras.main.centerX,
      50,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : '#44ff44',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }

  setupPlayerCollisions() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer || !myPlayer.body) {
      this.time.delayedCall(200, () => this.setupPlayerCollisions());
      return;
    }
    
    if (!this.collisionLayers || this.collisionLayers.length === 0) {
      return;
    }
    
    this.collisionLayers.forEach((layer, index) => {
      const collider = this.physics.add.collider(myPlayer, layer, (player, tile) => {
        console.log(`💥 COLLISION! à (${Math.round(player.x)}, ${Math.round(player.y)})`);
      }, null, this);
      
      if (!myPlayer.colliders) myPlayer.colliders = [];
      myPlayer.colliders.push(collider);
    });
  }

  debugCollisions() {
    console.log("🔍 === DEBUG COLLISIONS ===");
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour debug");
      return;
    }
    
    console.log("👤 Joueur:", {
      x: myPlayer.x.toFixed(1),
      y: myPlayer.y.toFixed(1),
      hasBody: !!myPlayer.body,
      bodySize: myPlayer.body ? `${myPlayer.body.width}x${myPlayer.body.height}` : 'N/A',
      colliders: myPlayer.colliders ? myPlayer.colliders.length : 0
    });
  }

  debugEncounters() {
    console.log("🎲 === DEBUG ENCOUNTERS ===");
    
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non initialisé");
      return;
    }
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour debug");
      return;
    }
    
    console.log("📊 Stats EncounterManager:", this.encounterManager.getStats());
    console.log("📍 Position actuelle:", {
      x: myPlayer.x.toFixed(1),
      y: myPlayer.y.toFixed(1)
    });
    
    const posInfo = this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y);
    console.log("🗺️ Info position:", posInfo);
    
    this.encounterManager.debugZones();
    
    this.showNotification(`Debug encounters dans la console`, 'info');
  }

  forceEncounterTest() {
    console.log("🔧 === FORCE TEST ENCOUNTER ===");
    
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non initialisé");
      this.showNotification("EncounterManager non initialisé", 'error');
      return;
    }
    
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.log("❌ Pas de joueur pour test");
      this.showNotification("Pas de joueur trouvé", 'error');
      return;
    }
    
    console.log("🎯 Force check encounter à position:", myPlayer.x, myPlayer.y);
    
    const encounterData = this.encounterManager.forceEncounterCheck(myPlayer.x, myPlayer.y);
    
    console.log("📊 Résultat force check:", encounterData);
    
    if (encounterData.shouldTrigger) {
      console.log("✅ Encounter forcé - envoi au serveur");
      
      if (this.networkManager?.room) {
        this.networkManager.room.send("triggerEncounter", {
          x: myPlayer.x,
          y: myPlayer.y,
          zoneId: encounterData.zoneId,
          method: encounterData.method,
          encounterRate: encounterData.encounterRate,
          forced: true,
          timestamp: Date.now()
        });
        
        this.showNotification("Encounter forcé envoyé au serveur!", 'success');
      } else {
        this.showNotification("Pas de connexion serveur", 'error');
      }
    } else {
      this.showNotification("Impossible de forcer encounter ici", 'warning');
    }
  }

  testEncounterAtPosition(x, y) {
    if (!this.encounterManager) {
      console.log("❌ EncounterManager non disponible");
      return null;
    }
    
    console.log(`🧪 Test encounter à (${x}, ${y})`);
    return this.encounterManager.forceEncounterCheck(x, y);
  }

  getTeamSystemStatus() {
    return {
      initialized: this.teamSystemInitialized,
      attempts: this.teamInitializationAttempts,
      maxAttempts: this.maxTeamInitAttempts,
      globalManagerExists: !!window.TeamManager,
      globalManagerInitialized: window.TeamManager?.isInitialized || false
    };
  }

  getEncounterSystemStatus() {
    return {
      initialized: this.encounterInitialized,
      managerExists: !!this.encounterManager,
      mapLoaded: !!this.map,
      stats: this.encounterManager?.getStats() || null
    };
  }

  forceTeamSystemInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation système d'équipe...`);
    this.teamSystemInitialized = false;
    this.teamInitializationAttempts = 0;
    
    setTimeout(() => {
      this.initializeTeamSystemSafely();
    }, 1000);
  }

  forceEncounterSystemInit() {
    console.log(`🔧 [${this.scene.key}] Force réinitialisation système d'encounter...`);
    this.encounterInitialized = false;
    this.encounterManager = null;
    
    setTimeout(() => {
      this.initializeEncounterManager();
    }, 1000);
  }

  isTeamSystemReady() {
    return this.teamSystemInitialized && window.TeamManager && window.TeamManager.isInitialized;
  }

  isEncounterSystemReady() {
    return this.encounterInitialized && !!this.encounterManager;
  }

  getTeamManager() {
    return this.isTeamSystemReady() ? window.TeamManager : null;
  }

  getEncounterManager() {
    return this.isEncounterSystemReady() ? this.encounterManager : null;
  }

  debugScene() {
    console.log(`🔍 [${this.scene.key}] === DEBUG SCENE COMPLÈTE ===`);
    console.log(`📊 Managers:`, {
      playerManager: !!this.playerManager,
      npcManager: !!this.npcManager,
      networkManager: !!this.networkManager,
      interactionManager: !!this.interactionManager,
      inventorySystem: !!this.inventorySystem,
      encounterManager: !!this.encounterManager,
      inputManager: !!this.inputManager
    });
    
    console.log(`📊 État scène:`, {
      isReady: this.isSceneReady,
      networkSetup: this.networkSetupComplete,
      playerReady: this.myPlayerReady,
      zoneName: this.zoneName,
      sessionId: this.mySessionId,
      teamSystemInitialized: this.teamSystemInitialized,
      teamInitAttempts: this.teamInitializationAttempts,
      encounterSystemInitialized: this.encounterInitialized,
      movementBlockHandlerInitialized: this.movementBlockHandlerInitialized
    });
  }

  debugAllSystems() {
    console.log(`🔍 [${this.scene.key}] === DEBUG TOUS LES SYSTÈMES ===`);
    
    this.debugScene();
    
    console.log(`⚔️ Team System:`, this.getTeamSystemStatus());
    console.log(`🎲 Encounter System:`, this.getEncounterSystemStatus());
    
    console.log(`🎒 Inventory:`, {
      exists: !!this.inventorySystem,
      initialized: this.inventoryInitialized,
      global: !!window.inventorySystem
    });
    
    console.log(`🎯 Interaction:`, {
      exists: !!this.interactionManager,
      shopSystem: !!this.interactionManager?.shopSystem
    });
    
    console.log(`🌍 DayNight:`, {
      exists: !!this.dayNightWeatherManager
    });
    
    console.log(`🎮 Network:`, {
      manager: !!this.networkManager,
      connected: this.networkManager?.isConnected,
      room: !!this.networkManager?.room,
      sessionId: this.mySessionId
    });

    console.log(`🔒 MovementBlockHandler:`, {
      sceneInitialized: this.movementBlockHandlerInitialized,
      sceneAttempts: this.movementBlockInitAttempts,
      globalExists: typeof movementBlockHandler !== 'undefined',
      globalStatus: typeof movementBlockHandler !== 'undefined' ? movementBlockHandler.getStatus() : null
    });
  }

  testTeamConnection() {
    console.log(`🧪 [${this.scene.key}] Test connexion Team System...`);
    
    if (!this.isTeamSystemReady()) {
      console.log(`❌ Team System pas prêt, status:`, this.getTeamSystemStatus());
      return false;
    }
    
    try {
      const teamManager = this.getTeamManager();
      teamManager.requestTeamData();
      console.log(`✅ Test connexion team réussi`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur test connexion team:`, error);
      return false;
    }
  }

  testEncounterConnection() {
    console.log(`🧪 [${this.scene.key}] Test connexion Encounter System...`);
    
    if (!this.isEncounterSystemReady()) {
      console.log(`❌ Encounter System pas prêt, status:`, this.getEncounterSystemStatus());
      return false;
    }
    
    try {
      const myPlayer = this.playerManager?.getMyPlayer();
      if (!myPlayer) {
        console.log(`❌ Pas de joueur pour test encounter`);
        return false;
      }
      
      const encounterData = this.encounterManager.checkEncounterOnMove(myPlayer.x, myPlayer.y);
      console.log(`✅ Test encounter réussi:`, encounterData);
      return true;
    } catch (error) {
      console.error(`❌ Erreur test encounter:`, error);
      return false;
    }
  }

  getShopSystem() {
    return this.interactionManager?.shopSystem || null;
  }

  isShopOpen() {
    return this.interactionManager?.isShopOpen() || false;
  }

  debugShop() {
    if (this.interactionManager) {
      this.interactionManager.debugState();
    } else {
      console.log(`🔍 [${this.scene.key}] Aucun InteractionManager`);
    }
  }

  requestTime() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("getTime");
    }
  }

  requestWeather() {
    if (this.networkManager?.room) {
      this.networkManager.room.send("getWeather");
    }
  }

  getCurrentTimeWeather() {
    if (this.dayNightWeatherManager) {
      return {
        time: this.dayNightWeatherManager.getCurrentTime(),
        weather: this.dayNightWeatherManager.getCurrentWeather()
      };
    }
    return null;
  }

  getCurrentEncounterInfo() {
    const myPlayer = this.playerManager?.getMyPlayer();
    if (!myPlayer || !this.encounterManager) {
      return null;
    }
    
    return {
      position: { x: myPlayer.x, y: myPlayer.y },
      positionInfo: this.encounterManager.getPositionInfo(myPlayer.x, myPlayer.y),
      stats: this.encounterManager.getStats()
    };
  }

  resetEncounterCooldowns() {
    if (this.encounterManager) {
      this.encounterManager.resetCooldowns();
      console.log(`🔄 [${this.scene.key}] Cooldowns encounter reset`);
      this.showNotification("Cooldowns encounter reset", 'info');
    }
  }

  simulateEncounterSteps(count = 5) {
    if (this.encounterManager) {
      this.encounterManager.simulateSteps(count);
      console.log(`👟 [${this.scene.key}] ${count} pas simulés`);
      this.showNotification(`${count} pas simulés pour encounter`, 'info');
    }
  }
} NETTOYAGE SIMPLE: MovementBlockHandler
    if (this.movementBlockHandlerInitialized) {
      this.movementBlockHandlerInitialized = false;
      this.movementBlockInitAttempts = 0;
      
      // Reset seulement si c'est notre scène
      if (movementBlockHandler && movementBlockHandler.scene === this) {
        console.log(`🧹 [${this.scene.key}] Reset MovementBlockHandler pour cette scène`);
        movementBlockHandler.reset();
      }
    }
    
    if (this.encounterManager) {
      this.encounterManager = null;
      this.encounterInitialized = false;
      console.log(`🧹 [${this.scene.key}] EncounterManager nettoyé`);
    }

    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
    
    if (this.dayNightWeatherManager) {
      this.dayNightWeatherManager.destroy();
      this.dayNightWeatherManager = null;
    }
    
    if (this.animatedObjects) {
      this.animatedObjects.clear(true, true);
      this.animatedObjects = null;
    }

    this.time.removeAllEvents();
    this.cameraFollowing = false;
    this.myPlayerReady = false;
    this.isSceneReady = false;
    this.networkSetupComplete = false;
    
    console.log(`✅ [${this.scene.key}] Nettoyage terminé`);
  }

  setupCleanupHandlers() {
    this.events.on('shutdown', () => {
      console.log(`📤 [${this.scene.key}] Shutdown - nettoyage`);
      this.cleanup();
    });
    
    this.events.on('destroy', () => {
      console.log(`💀 [${this.scene.key}] Destroy - nettoyage final`);
      this.cleanup();
    });
  }

  handleMovement(myPlayerState) {
    const myPlayer = this.playerManager.getMyPlayer();
    if (!myPlayer || !myPlayer.body) return;

    // ✅ VÉRIFICATION SIMPLE: MovementBlockHandler avec protection
    try {
      if (movementBlockHandler && movementBlockHandler.isMovementBlocked()) {
        myPlayer.body.setVelocity(0, 0);
        myPlayer.anims.play(`idle_${this.lastDirection}`, true);
        myPlayer.isMovingLocally = false;
        
        const now = Date.now();
        if (!this.lastStopTime || now - this.lastStopTime > 100) {
          this.networkManager.sendMove(
            myPlayer.x,
            myPlayer.y,
            this.lastDirection,
            false
          );
          this.lastStopTime = now;
        }
        
        return;
      }
    } catch (error) {
      console.warn(`⚠️ [${this.scene.key}] Erreur vérification MovementBlockHandler:`, error);
    }

    const speed = 80;
    let vx = 0, vy = 0;
    let inputDetected = false, direction = null;
    
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed; inputDetected = true; direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed; inputDetected = true; direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed; inputDetected = true; direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed; inputDetected = true; direction = 'down';
    }
    
    let actuallyMoving = inputDetected;
    myPlayer.body.setVelocity(vx, vy);
    
    if (vx !== 0 && vy !== 0) {
      myPlayer.body.setVelocity(vx * 0.707, vy * 0.707);
    }
    
    if (inputDetected && direction) {
      this.lastDirection = direction;
      
      if (actuallyMoving) {
        myPlayer.anims.play(`walk_${direction}`, true);
        myPlayer.isMovingLocally = true;
      } else {
        myPlayer.anims.play(`idle_${direction}`, true);
        myPlayer.isMovingLocally = false;
      }
    } else {
      myPlayer.anims.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
    }
    
    if (inputDetected) {
      const now = Date.now();
      if (!this.lastMoveTime || now - this.lastMoveTime > 50) {
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          direction,
          actuallyMoving
        );
        this.lastMoveTime = now;
      }
    } 
    else {
      const now = Date.now();
      if (!this.lastStopTime || now - this.lastStopTime > 100) {
        this.networkManager.sendMove(
          myPlayer.x,
          myPlayer.y,
          this.lastDirection,
          false
        );
        this.lastStopTime = now;
      }
    }
  }

  mapSceneToZone(sceneName) {
    const mapping = {
      'BeachScene': 'beach',
      'VillageScene': 'village',
      'VillageLabScene': 'villagelab',
      'Road1Scene': 'road1',
      'Road1HiddenScene': 'road1hidden',
      'Road1HouseScene': 'road1house',
      'VillageHouse1Scene': 'villagehouse1',
      'LavandiaScene': 'lavandia',
      'LavandiaAnalysisScene': 'lavandiaanalysis',
      'LavandiaBossRoomScene': 'lavandiabossroom',
      'LavandiaCelebiTempleScene': 'lavandiacelebitemple',
      'LavandiaEquipementScene': 'lavandiaequipement',
      'LavandiaFurnitureScene': 'lavandiafurniture',
      'LavandiaHealingCenterScene': 'lavandiahealingcenter',
      'LavandiaHouse1Scene': 'lavandiahouse1',
      'LavandiaHouse2Scene': 'lavandiahouse2',
      'LavandiaHouse3Scene': 'lavandiahouse3',
      'LavandiaHouse4Scene': 'lavandiahouse4',
      'LavandiaHouse5Scene': 'lavandiahouse5',
      'LavandiaHouse6Scene': 'lavandiahouse6',
      'LavandiaHouse7Scene': 'lavandiahouse7',
      'LavandiaHouse8Scene': 'lavandiahouse8',
      'LavandiaHouse9Scene': 'lavandiahouse9',
      'LavandiaResearchLabScene': 'lavandiaresearchlab',
      'LavandiaShopScene': 'lavandiashop',
      'VillageFloristScene': 'villageflorist',
      'VillageHouse2Scene': 'villagehouse2',
      'Road2Scene': 'road2',
      'Road3Scene': 'road3',
      'NoctherCave1Scene': 'nocthercave1',
      'NoctherCave2Scene': 'nocthercave2',
      'NoctherCave2BisScene': 'nocthercave2bis'
    };
    return mapping[sceneName] || sceneName.toLowerCase();
  }

  mapZoneToScene(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene',
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'road1house': 'Road1HouseScene',
      'road1hidden': 'Road1HiddenScene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene',
      'lavandiaanalysis': 'LavandiaAnalysisScene',
      'lavandiabossroom': 'LavandiaBossRoomScene',
      'lavandiacelebitemple': 'LavandiaCelebiTempleScene',
      'lavandiaequipement': 'LavandiaEquipementScene',
      'lavandiafurniture': 'LavandiaFurnitureScene',
      'lavandiahealingcenter': 'LavandiaHealingCenterScene',
      'lavandiahouse1': 'LavandiaHouse1Scene',
      'lavandiahouse2': 'LavandiaHouse2Scene',
      'lavandiahouse3': 'LavandiaHouse3Scene',
      'lavandiahouse4': 'LavandiaHouse4Scene',
      'lavandiahouse5': 'LavandiaHouse5Scene',
      'lavandiahouse6': 'LavandiaHouse6Scene',
      'lavandiahouse7': 'LavandiaHouse7Scene',
      'lavandiahouse8': 'LavandiaHouse8Scene',
      'lavandiahouse9': 'LavandiaHouse9Scene',
      'lavandiaresearchlab': 'LavandiaResearchLabScene',
      'lavandiashop': 'LavandiaShopScene',
      'villageflorist': 'VillageFloristScene',
      'villagehouse2': 'VillageHouse2Scene',
      'road2': 'Road2Scene',
      'road3': 'Road3Scene',
      'nocthercave1': 'NoctherCave1Scene',
      'nocthercave2': 'NoctherCave2Scene',
      'nocthercave2bis': 'NoctherCave2BisScene'
    };
    return mapping[zoneName.toLowerCase()] || zoneName;
  }

  normalizeZoneName(sceneName) {
    return this.mapSceneToZone(sceneName);
  }

  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  loadMap() {
    console.log('— DEBUT loadMap —');
    this.map = this.make.tilemap({ key: this.mapKey });

    let needsLoading = false;
    this.map.tilesets.forEach(tileset => {
      if (!this.textures.exists(tileset.name)) {
        this.load.image(tileset.name, `assets/sprites/${tileset.name}.png`);
        needsLoading = true;
      }
    });

    const finishLoad = () => {
      this.phaserTilesets = this.map.tilesets.map(ts => {
        return this.map.addTilesetImage(ts.name, ts.name);
      });
      
      this.layers = {};
      const depthOrder = {
        'BelowPlayer': 1,
        'BelowPlayer2': 2,
        'World': 3,
        'AbovePlayer': 4,
        'Grass': 1.5
      };

      this.map.layers.forEach(layerData => {
        const layer = this.map.createLayer(layerData.name, this.phaserTilesets, 0, 0);
        this.layers[layerData.name] = layer;
        
        const depth = depthOrder[layerData.name] ?? 0;
        layer.setDepth(depth);
      });

      if (this.sys.animatedTiles) {
        this.sys.animatedTiles.init(this.map);
      }

      Object.values(this.layers).forEach(layer => {
        if (layer && typeof layer.setCollisionByProperty === 'function') {
          layer.setCollisionByProperty({ collides: true });
        }
      });

      this.setupAnimatedObjects();
      this.setupScene();

      setTimeout(() => {
        this.initializeEncounterManager();
      }, 500);
    };

    if (needsLoading) {
      this.load.once('complete', finishLoad);
      this.load.start();
    } else {
      finishLoad();
    }
  }

  setupAnimatedObjects() {
    if (this.map.objects && this.map.objects.length > 0) {
      this.map.objects.forEach(objectLayer => {
        objectLayer.objects.forEach(obj => {
          if (obj.gid) {
            const sprite = this.add.sprite(obj.x, obj.y - obj.height, 'dude');
            if (obj.properties && obj.properties.length > 0) {
              const animationProp = obj.properties.find(prop => prop.name === 'animation');
              if (animationProp && animationProp.value) {
                if (this.anims.exists(animationProp.value)) {
                  sprite.play(animationProp.value);
                }
              }
            }
            if (!this.animatedObjects) {
              this.animatedObjects = this.add.group();
            }
            this.animatedObjects.add(sprite);
          }
        });
      });
    }
  }

  setupScene() {
    console.log('— DEBUT setupScene —');
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    const baseWidth = this.scale.width;
    const baseHeight = this.scale.height;
    const zoomX = baseWidth / this.map.widthInPixels;
    const zoomY = baseHeight / this.map.heightInPixels;
    const zoom = Math.min(zoomX, zoomY);
    
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBackgroundColor('#2d5a3d');
    this.cameras.main.setRoundPixels(true);
    
    this.cameraManager = new CameraManager(this);
    
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    
    this.collisionLayers = [];
    Object.values(this.layers).forEach(layer => {
      if (layer && layer.layer && layer.layer.name.toLowerCase().includes('world')) {
        layer.setCollisionByProperty({ collides: true });
        this.collisionLayers.push(layer);
      }
    });
    
    this.time.delayedCall(100, () => {
      this.setupPlayerCollisions();
    });
  }

  getDefaultSpawnPosition(fromZone) {
    return { x: 100, y: 100 };
  }

  onPlayerPositioned(player, initData) {
    console.log(`📍 [${this.scene.key}] Joueur positionné, application météo IMMÉDIATE...`);
    
    const zoneName = this.normalizeZoneName(this.scene.key);
    
    if (this.dayNightWeatherManager) {
      this.dayNightWeatherManager.handleSceneTransition(zoneName, initData);
      
      console.log(`✅ [${this.scene.key}] Météo appliquée immédiatement pour: ${zoneName}`);
    } else {
      console.warn(`⚠️ [${this.scene.key}] DayNightWeatherManager pas encore prêt`);
    }
  }

  setupManagers() {
    this.playerManager = new PlayerManager(this);
    this.npcManager = new NpcManager(this);
    if (this.mySessionId) {
      this.playerManager.setMySessionId(this.mySessionId);
    }
  }

  createPlayerAnimations() {
    if (!this.textures.exists('dude') || this.anims.exists('walk_left')) return;

    this.anims.create({
      key: 'walk_left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_left', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_right', frames: [{ key: 'dude', frame: 5 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_up',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_up', frames: [{ key: 'dude', frame: 4 }], frameRate: 1 });
    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle_down', frames: [{ key: 'dude', frame: 5 }], frameRate: 1 });
  }

  // ✅// client/src/scenes/zones/BaseZoneScene.js - VERSION CONSERVATRICE CORRIGÉE
// ✅ Garde la structure originale, corrige seulement les boucles infinies

import { PlayerManager } from "../../game/PlayerManager.js";
import { CameraManager } from "../../camera/CameraManager.js";
import { NpcManager } from "../../game/NpcManager";
import { QuestSystem } from "../../game/QuestSystem.js";
import { InventorySystem } from "../../game/InventorySystem.js";
import { InteractionManager } from "../../game/InteractionManager.js";
import { TransitionIntegration } from '../../transitions/TransitionIntegration.js';
import { integrateShopToScene } from "../../game/ShopIntegration.js";
import { DayNightWeatherManager } from "../../game/DayNightWeatherManager.js";
import { CharacterManager } from "../../game/CharacterManager.js";
import { zoneEnvironmentManager } from "../../managers/ZoneEnvironmentManager.js";
import { WeatherEffects } from "../../effects/WeatherEffects.js";
import { ClientEncounterManager } from "../../managers/EncounterManager.js";
import { movementBlockHandler } from "../../input/MovementBlockHandler.js";
import { integrateMusicToScene } from "../../managers/MapMusicManager.js";

export class BaseZoneScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super({ key: sceneKey });
    this.mapKey = mapKey;
    this.phaserTilesets = [];
    this.layers = {};
    this.cameraFollowing = false;
    this.lastDirection = 'down';
    this.mySessionId = null;
    this.loadTimer = null;
    this.animatedObjects = null;
    this.lastMoveTime = 0;
    this.lastStopTime = 0;
    this.myPlayerReady = false;
    this.dayNightWeatherManager = null;
    this.currentEnvironment = null;
    this.environmentInitialized = false;
    this.weatherEffects = null;
    this.weatherInitialized = false;
    
    // Inventaire
    this.inventorySystem = null;
    this.inventoryInitialized = false;
    
    // Zone et état réseau
    this.zoneName = null;
    this.serverZoneConfirmed = false;
    this.isSceneReady = false;
    this.networkSetupComplete = false;

    // Grace period pour éviter les transitions involontaires
    this.justArrivedAtZone = false;

    // InteractionManager
    this.interactionManager = null;

    // Système d'équipe avec protection
    this.teamSystemInitialized = false;
    this.teamInitializationAttempts = 0;
    this.maxTeamInitAttempts = 3;

    // EncounterManager
    this.encounterManager = null;
    this.encounterInitialized = false;
    this.lastEncounterCheck = 0;
    this.encounterCheckInterval = 100;

    // ✅ AJOUT SIMPLE: Protection MovementBlockHandler
    this.movementBlockHandlerInitialized = false;
    this.movementBlockInitAttempts = 0;
  }

  preload() {
    const ext = 'tmj';
    this.load.tilemapTiledJSON(this.mapKey, `assets/maps/${this.mapKey}.${ext}`);

    this.load.spritesheet('BoyWalk', 'assets/character/BoyWalk.png', {
      frameWidth: 24,
      frameHeight: 24,
    });
  }

  create() {
    if (window.showLoadingOverlay) window.showLoadingOverlay("Chargement de la zone...");

    TransitionIntegration.setupTransitions(this);

    console.log(`🌍 === CRÉATION ZONE: ${this.scene.key} ===`);
    console.log(`📊 Scene data reçue:`, this.scene.settings.data);

    this.createPlayerAnimations();
    this.setupManagers();
    this.initPlayerSpawnFromSceneData();
    this.justArrivedAtZone = true;
    this.time.delayedCall(500, () => { this.justArrivedAtZone = false; });
    integrateMusicToScene(this);

    this.loadMap();
    this.setupInputs();
    this.createUI();
    this.myPlayerReady = false;
    this.isSceneReady = true;
    
    this.initializeWithExistingConnection();

    this.setupPlayerReadyHandler();
    this.setupCleanupHandlers();

    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
  }

  initializeWithExistingConnection() {
    console.log(`📡 [${this.scene.key}] === UTILISATION CONNEXION EXISTANTE ===`);
    
    if (!window.globalNetworkManager) {
      console.error(`❌ [${this.scene.key}] NetworkManager global manquant!`);
      this.showErrorState("NetworkManager global introuvable");
      return;
    }

    if (!window.globalNetworkManager.isConnected) {
      console.error(`❌ [${this.scene.key}] NetworkManager global non connecté!`);
      this.showErrorState("Connexion réseau inactive");
      return;
    }

    this.networkManager = window.globalNetworkManager;
    this.mySessionId = this.networkManager.getSessionId();

    console.log(`✅ [${this.scene.key}] NetworkManager récupéré:`, {
      sessionId: this.mySessionId,
      isConnected: this.networkManager.isConnected,
      currentZone: this.networkManager.getCurrentZone()
    });

    this.setupNetworkHandlers();
    this.networkSetupComplete = true;

    this.initializeGameSystems();

    this.requestServerZone();
    this.verifyNetworkState();

    if (this.networkManager && this.networkManager.room) {
      this.networkManager.setupRoomListeners();
      this.networkManager.restoreCustomCallbacks?.();
    }

    // ✅ INITIALISATION SIMPLE: Différée pour éviter les blocages
    this.time.delayedCall(2000, () => {
      this.initializeMovementBlockHandler();
    });

    this.networkSetupComplete = true;
  }

  // ✅ VERSION SIMPLIFIÉE: Initialisation MovementBlockHandler
  initializeMovementBlockHandler() {
    console.log(`🔒 [${this.scene.key}] Initialisation MovementBlockHandler...`);
    
    // Protection basique contre les boucles
    if (this.movementBlockHandlerInitialized) {
      console.log(`⏭️ [${this.scene.key}] MovementBlockHandler déjà initialisé`);
      return;
    }
    
    this.movementBlockInitAttempts++;
    
    if (this.movementBlockInitAttempts > 3) {
      console.warn(`⚠️ [${this.scene.key}] Trop de tentatives MovementBlockHandler - abandon`);
      return;
    }
    
    // Vérifier que l'InputManager existe
    if (!this.inputManager) {
      console.warn(`⚠️ [${this.scene.key}] InputManager manquant pour MovementBlockHandler`);
      return;
    }
    
    // Vérifier que le NetworkManager est prêt
    if (!this.networkManager?.isConnected) {
      console.warn(`⚠️ [${this.scene.key}] NetworkManager pas prêt pour MovementBlockHandler`);
      return;
    }
    
    try {
      // Initialiser directement sans import complexe
      movementBlockHandler.initialize(
        this.inputManager,
        this.networkManager,
        this
      );
      
      this.movementBlockHandlerInitialized = true;
      console.log(`✅ [${this.scene.key}] MovementBlockHandler initialisé`);
      
    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur MovementBlockHandler:`, error);
    }
  }

  initializeGameSystems() {
    console.log(`🎮 [${this.scene.key}] Initialisation des systèmes de jeu...`);

    // 1. Inventaire
    this.initializeInventorySystem();

    // 2. Temps/Météo
    setTimeout(() => {
      this.initializeTimeWeatherSystem();
    }, 300);
    
    // 3. InteractionManager
    setTimeout(() => {
      this.initializeInteractionManager();
    }, 600);
    
    // 4. Quêtes
    setTimeout(() => {
      this.initializeQuestSystem();
    }, 900);
    
    // 5. Météo finale
    setTimeout(() => {
      const zoneName = this.normalizeZoneName(this.scene.key);
      console.log(`🌍 [${this.scene.key}] Application météo finale pour: ${zoneName}`);
      
      if (this.dayNightWeatherManager) {
        this.dayNightWeatherManager.forceImmediateWeatherApplication(zoneName);
      }
    }, 1200);

    // 6. Système d'équipe
    setTimeout(() => {
      if (typeof window.initTeamSystem === 'function') {
        console.log(`⚔️ [${this.scene.key}] Init team system global`);
        window.initTeamSystem(this.networkManager.room);
      }
    }, 1500);

    // 7. EncounterManager
    setTimeout(() => {
      this.initializeEncounterManager();
    }, 1800);
    
    console.log(`✅ [${this.scene.key}] Planification initialisation systèmes terminée`);
  }

  initializeEncounterManager() {
    console.log(`🎲 [${this.scene.key}] === INITIALISATION ENCOUNTER MANAGER ===`);

    try {
      if (!this.map) {
        console.warn(`⚠️ [${this.scene.key}] Carte pas encore chargée, retry dans 1s...`);
        setTimeout(() => this.initializeEncounterManager(), 1000);
        return;
      }

      this.encounterManager = new ClientEncounterManager();
      
      const mapData = this.cache.tilemap.get(this.mapKey);
      if (mapData && mapData.data) {
        console.log(`🗺️ [${this.scene.key}] Chargement données carte pour encounters...`);
        this.encounterManager.loadMapData(mapData.data);
        this.encounterInitialized = true;
        
        console.log(`✅ [${this.scene.key}] EncounterManager initialisé avec succès!`);
        
        window.encounterManager = this.encounterManager;
        this.encounterManager.debugZones();
        this.setupEncounterNetworkHandlers();
        
      } else {
        console.error(`❌ [${this.scene.key}] Impossible de récupérer les données de carte`);
      }

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation EncounterManager:`, error);
    }
  }

  setupEncounterNetworkHandlers() {
    if (!this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Pas de room pour setup encounter handlers`);
      return;
    }

    console.log(`📡 [${this.scene.key}] Setup handlers réseau encounters...`);

    this.networkManager.onMessage("wildEncounter", (data) => {
      if (data.success) {
        this.handleWildEncounter(data);
      }
    });

    console.log(`✅ [${this.scene.key}] Handlers encounter configurés`);
  }

  handleWildEncounter(data) {
    console.log(`🎲 [${this.scene.key}] === ENCOUNTER CONFIRMÉ ===`);
    console.log(`👾 Pokémon: ${data.pokemon?.name} Niveau ${data.pokemon?.level}`);

    const myPlayer = this.playerManager?.getMyPlayer();
    if (myPlayer && myPlayer.body) {
      myPlayer.body.setVelocity(0, 0);
      myPlayer.anims.play(`idle_${this.lastDirection}`, true);
    }

    if (window.showGameNotification) {
      window.showGameNotification(
        `ENCOUNTER WITH ${data.pokemon?.name?.toUpperCase() || 'POKÉMON'}!`,
        'encounter',
        { 
          duration: 3000, 
          position: 'top-center',
          bounce: true 
        }
      );
    }

    this.time.delayedCall(1000, () => {
      console.log(`⚔️ [${this.scene.key}] Transition vers combat (TODO)`);
      
      if (window.showGameNotification) {
        window.showGameNotification(
          `Combat non implémenté - continuez à explorer !`,
          'info',
          { duration: 2000, position: 'bottom-center' }
        );
      }
    });
  }

  checkForEncounters(x, y) {
    if (!this.encounterInitialized || !this.encounterManager) {
      return;
    }

    if (this.justArrivedAtZone) {
      return;
    }

    const now = Date.now();
    if (now - this.lastEncounterCheck < this.encounterCheckInterval) {
      return;
    }
    this.lastEncounterCheck = now;

    const encounterData = this.encounterManager.checkEncounterOnMove(x, y);
    
    if (encounterData.shouldTrigger) {
      console.log(`🎲 [${this.scene.key}] Encounter possible détecté - envoi au serveur`);
      
      if (this.networkManager?.room) {
        this.networkManager.room.send("triggerEncounter", {
          x: x,
          y: y,
          zoneId: encounterData.zoneId,
          method: encounterData.method,
          encounterRate: encounterData.encounterRate,
          timestamp: now
        });
      }
    }
  }

  initializeTeamSystemSafely() {
    console.log(`⚔️ [${this.scene.key}] === INITIALISATION TEAM SYSTEM SIMPLE ===`);

    if (this.teamSystemInitialized) {
      console.log(`ℹ️ [${this.scene.key}] Système d'équipe déjà initialisé`);
      return;
    }

    if (this.teamInitializationAttempts >= this.maxTeamInitAttempts) {
      console.warn(`⚠️ [${this.scene.key}] Trop de tentatives d'initialisation team - abandon`);
      return;
    }

    this.teamInitializationAttempts++;
    console.log(`⚔️ [${this.scene.key}] Tentative ${this.teamInitializationAttempts}/${this.maxTeamInitAttempts}`);

    if (!this.networkManager?.room) {
      console.warn(`⚠️ [${this.scene.key}] Pas de room - retry dans 2s`);
      setTimeout(() => this.initializeTeamSystemSafely(), 2000);
      return;
    }

    if (window.TeamManager && window.TeamManager.isInitialized) {
      console.log(`ℹ️ [${this.scene.key}] TeamManager global déjà initialisé - réutilisation`);
      this.teamSystemInitialized = true;
      return;
    }

    try {
      console.log(`🚀 [${this.scene.key}] Initialisation team system simple...`);
      
      if (typeof window.initTeamSystem === 'function') {
        console.log(`🎯 [${this.scene.key}] Appel window.initTeamSystem avec room...`);
        
        const teamManager = window.initTeamSystem(this.networkManager.room);
        
        if (teamManager) {
          console.log(`✅ [${this.scene.key}] Système d'équipe initialisé avec succès!`);
          this.teamSystemInitialized = true;
          
          if (typeof window.onSystemInitialized === 'function') {
            window.onSystemInitialized('team');
          }
          
          setTimeout(() => {
            console.log(`✅ [${this.scene.key}] Test: TeamManager exists:`, !!window.TeamManager);
            console.log(`✅ [${this.scene.key}] Test: TeamIcon exists:`, !!document.querySelector('#team-icon'));
          }, 1000);
          
        } else {
          console.error(`❌ [${this.scene.key}] window.initTeamSystem a retourné null`);
          this.handleTeamInitFailure();
        }
        
      } else {
        console.error(`❌ [${this.scene.key}] window.initTeamSystem n'existe pas!`);
        this.handleTeamInitFailure();
      }

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation team:`, error);
      this.handleTeamInitFailure();
    }
  }

  handleTeamInitFailure() {
    if (this.teamInitializationAttempts < this.maxTeamInitAttempts) {
      console.log(`🔄 [${this.scene.key}] Retry initialisation team dans 5s... (${this.teamInitializationAttempts}/${this.maxTeamInitAttempts})`);
      setTimeout(() => this.initializeTeamSystemSafely(), 5000);
    } else {
      console.error(`❌ [${this.scene.key}] Échec définitif d'initialisation du système d'équipe`);
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification('Système d\'équipe indisponible', 'warning', {
          duration: 5000,
          position: 'top-center'
        });
      }
    }
  }

  initializeTimeWeatherSystem() {
    if (!this.networkManager) {
      console.warn(`⚠️ [${this.scene.key}] Pas de NetworkManager pour TimeWeatherManager`);
      return;
    }

    try {
      console.log(`🌍 [${this.scene.key}] === INITIALISATION SYSTÈME TEMPS/MÉTÉO ===`);

      if (!this.environmentInitialized) {
        this.initializeZoneEnvironment();
      }

      this.dayNightWeatherManager = new DayNightWeatherManager(this);
      this.dayNightWeatherManager.initialize(this.networkManager);

      console.log(`✅ [${this.scene.key}] Système temps/météo initialisé`);

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation temps/météo:`, error);
    }
  }

  initializeZoneEnvironment() {
    const zoneName = this.normalizeZoneName(this.scene.key);
    this.currentEnvironment = zoneEnvironmentManager.getZoneEnvironment(zoneName);
    
    console.log(`🌍 [${this.scene.key}] Environnement détecté: ${this.currentEnvironment}`);
    
    if (this.dayNightWeatherManager) {
      this.dayNightWeatherManager.onZoneChanged(zoneName);
    }
    
    zoneEnvironmentManager.debugZoneEnvironment(zoneName);
    
    this.environmentInitialized = true;
  }

  onZoneChanged(newZoneName) {
    console.log(`🌍 [${this.scene.key}] Zone changée: ${newZoneName}`);
    
    if (this.dayNightWeatherManager) {
      this.dayNightWeatherManager.handleSceneTransition(newZoneName);
      console.log(`✅ [${this.scene.key}] Météo de transition appliquée pour: ${newZoneName}`);
    } else {
      console.warn(`⚠️ [${this.scene.key}] DayNightWeatherManager pas disponible`);
    }
  }
  
  initializeInteractionManager() {
    if (!this.networkManager) {
      console.warn(`⚠️ [${this.scene.key}] Pas de NetworkManager pour InteractionManager`);
      return;
    }

    try {
      console.log(`🎯 [${this.scene.key}] === INITIALISATION INTERACTION MANAGER ===`);

      this.interactionManager = new InteractionManager(this);

      this.interactionManager.initialize(
        this.networkManager,
        this.playerManager,
        this.npcManager
      );

      console.log(`✅ [${this.scene.key}] InteractionManager initialisé avec succès`);

      integrateShopToScene(this, this.networkManager);

      console.log(`✅ [${this.scene.key}] Shop intégré via InteractionManager`);

    } catch (error) {
      console.error(`❌ [${this.scene.key}] Erreur initialisation InteractionManager:`, error);
    }
  }

  onPlayerReady(player) {
    console.log(`[${this.scene.key}] ✅ onPlayerReady appelé pour ${player.sessionId}`);
  }
  
  initPlayerSpawnFromSceneData() {
    const data = this.scene.settings.data || {};
    const sessionId = this.mySessionId;
    let spawnX = 52, spawnY = 48;

    if (typeof data.spawnX === 'number') spawnX = data.spawnX;
    if (typeof data.spawnY === 'number') spawnY = data.spawnY;

    if (this.playerManager && !this.playerManager.getMyPlayer()) {
      const characterId = data.characterId || 'brendan';
      console.log(`[${this.scene.key}] Création joueur avec personnage: ${characterId}`);
      
      this.playerManager.createPlayer(sessionId, spawnX, spawnY, characterId);
      console.log(`[${this.scene.key}] Joueur spawn à (${spawnX}, ${spawnY}) avec personnage ${characterId}`);
    } else {
      console.log(`[${this.scene.key}] Joueur déjà présent ou playerManager manquant.`);
    }
  }

  requestServerZone() {
    console.log(`📍 [${this.scene.key}] === DEMANDE ZONE AU SERVEUR ===`);
    
    if (!this.networkManager?.room) {
      console.error(`❌ [${this.scene.key}] Pas de connexion pour demander la zone`);
      return;
    }
    
    this.networkManager.room.send("requestCurrentZone", {
      sceneKey: this.scene.key,
      timestamp: Date.now()
    });
    
    console.log(`📤 [${this.scene.key}] Demande de zone envoyée au serveur`);
  }

  setupNetworkHandlers() {
    if (!this.networkManager) return;

    console.log(`📡 [${this.scene.key}] Configuration handlers réseau...`);

    this.networkManager.onMessage("currentZone", (data) => {
      console.log(`📍 [${this.scene.key}] === ZONE REÇUE DU SERVEUR ===`);
      console.log(`🎯 Zone serveur: ${data.zone}`);
      console.log(`📊 Position serveur: (${data.x}, ${data.y})`);
      
      const oldZone = this.zoneName;
      this.zoneName = data.zone;
      this.serverZoneConfirmed = true;
      
      console.log(`🔄 [${this.scene.key}] Zone mise à jour: ${oldZone} → ${this.zoneName}`);
      
      const expectedScene = this.mapZoneToScene(data.zone);
      if (this.scene.key !== expectedScene) {
        console.warn(`[${this.scene.key}] 🔄 Redirection nécessaire → ${expectedScene}`);
        this.redirectToCorrectScene(expectedScene, data);
        return;
      }
      
      if (this.playerManager) {
        this.playerManager.currentZone = this.zoneName;
        this.playerManager.forceResynchronization();
      }
      
      console.log(`✅ [${this.scene.key}] Zone serveur confirmée: ${this.zoneName}`);
    });

    this.networkManager.onStateChange((state) => {
      if (!this.isSceneReady || !this.networkSetupComplete) {
        console.log(`⏳ [${this.scene.key}] State reçu mais scène pas prête, ignoré`);
        return;
      }
      
      if (!state || !state.players) return;
      if (!this.playerManager) return;

      this.synchronizeSessionId();
      
      this.playerManager.updatePlayers(state);
      this.handleMyPlayerFromState();
    });

    this.setupWorldRoomHandlers();
    this.setupQuestStatusHandler();
    this.setupExistingHandlers();

    this.time.delayedCall(500, () => {
      console.log(`🔄 [${this.scene.key}] Forcer synchronisation initiale...`);
      if (this.networkManager.room) {
        this.networkManager.room.send("requestInitialState", { 
          zone: this.networkManager.getCurrentZone() 
        });
      }
    });
  }

  redirectToCorrectScene(correctScene, serverData) {
    console.warn('=== [DEBUG] REDIRECTION SCENE ===');
    console.warn('FROM:', this.scene.key, 'TO:', correctScene);
    console.warn('serverData:', serverData);

    const transitionData = {
      fromZone: serverData.zone,
      fromTransition: true,
      networkManager: this.networkManager,
      mySessionId: this.mySessionId,
      spawnX: serverData.x,
      spawnY: serverData.y,
      serverForced: true,
      preservePlayer: true,
      weatherData: this.dayNightWeatherManager?.getCurrentStateForTransition()
    };

    if (window.showLoadingOverlay) window.showLoadingOverlay("Changement de zone...");

    this.scene.start(correctScene, transitionData);
  }

  synchronizeSessionId() {
    if (!this.networkManager) return;
    
    const currentNetworkSessionId = this.networkManager.getSessionId();
    if (this.mySessionId !== currentNetworkSessionId) {
      console.warn(`⚠️ [${this.scene.key}] SessionId désynchronisé: ${this.mySessionId} → ${currentNetworkSessionId}`);
      this.mySessionId = currentNetworkSessionId;
      
      if (this.playerManager) {
        this.playerManager.setMySessionId(this.mySessionId);
      }
    }
  }

  handleMyPlayerFromState() {
    if (this.myPlayerReady) return;
    
    const myPlayer = this.playerManager.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      console.log(`✅ [${this.scene.key}] Joueur local trouvé: ${this.mySessionId}`);
      if (window.hideLoadingOverlay) window.hideLoadingOverlay();

      if (!myPlayer.visible) {
        console.log(`🔧 [${this.scene.key}] Forcer visibilité joueur local`);
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
      }
      
      this.cameraManager.followPlayer(myPlayer);
      this.cameraFollowing = true;
      this.positionPlayer(myPlayer);
      
      if (typeof this.onPlayerReady === 'function') {
        this.onPlayerReady(myPlayer);
      }
    }
  }

  setupWorldRoomHandlers() {
    console.log(`📡 [${this.scene.key}] === SETUP WORLD ROOM HANDLERS ===`);

    this.networkManager.onZoneData((data) => {
      console.log(`🗺️ [${this.scene.key}] Zone data reçue:`, data);
      this.handleZoneData(data);
    });

    this.networkManager.onNpcList((npcs) => {
      console.log(`🤖 [${this.scene.key}] === HANDLER NPCS APPELÉ ===`);
      console.log(`📊 NPCs reçus: ${npcs.length}`);
      
      if (!this.npcManager) {
        console.error(`❌ [${this.scene.key}] NpcManager MANQUANT !`);
        return;
      }
      
      if (!npcs || npcs.length === 0) {
        console.log(`ℹ️ [${this.scene.key}] Aucun NPC à spawner`);
        return;
      }
      
      console.log(`✅ [${this.scene.key}] APPEL spawnNpcs() avec ${npcs.length} NPCs`);
      this.npcManager.spawnNpcs(npcs);
    });

    this.networkManager.onTransitionSuccess((result) => {
      console.log(`✅ [${this.scene.key}] Transition réussie:`, result);
      
      const targetScene = this.mapZoneToScene(result.currentZone || result.zone || result.targetZone);
      
      if (this.scene.key !== targetScene) {
        console.warn(`[Transition] Redirection auto vers ${targetScene}`);
        this.scene.start(targetScene, {
          fromZone: this.zoneName,
          fromTransition: true,
          networkManager: this.networkManager,
          mySessionId: this.mySessionId,
          spawnX: result.position?.x,
          spawnY: result.position?.y,
          preservePlayer: true
        });
      }
    });

    this.networkManager.onTransitionError((result) => {
      console.error(`❌ [${this.scene.key}]
