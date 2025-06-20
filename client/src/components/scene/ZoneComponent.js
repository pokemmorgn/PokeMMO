// client/src/components/scene/ZoneComponent.js
// ✅ Composant responsable des zones et transitions

export class ZoneComponent {
  constructor(scene) {
    this.scene = scene;
    this.zoneName = this.mapSceneToZone(scene.scene.key);
    this.transitionCooldowns = {};
    this.npcManager = null;
    this.transitionZones = [];
  }

  // === INITIALISATION ===
  async initialize() {
    try {
      console.log(`🌍 Initialisation ZoneComponent pour ${this.zoneName}...`);
      
      // Importer et créer le NpcManager
      const { NpcManager } = await import('../../game/NpcManager');
      this.npcManager = new NpcManager(this.scene);
      
      console.log(`✅ ZoneComponent initialisé`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur initialisation ZoneComponent:`, error);
      return false;
    }
  }

  // === TRANSITIONS ===
  setupZoneTransitions() {
    if (!this.scene.map) {
      console.warn(`setupZoneTransitions appelé avant loadMap`);
      return;
    }

    const transitionLayer = this.scene.map.getObjectLayer('Transitions') || 
                           this.scene.map.getObjectLayer('Teleports') || 
                           this.scene.map.getObjectLayer('Worlds');

    if (!transitionLayer) {
      console.log(`Aucun layer de transitions trouvé`);
      return;
    }

    console.log(`Found ${transitionLayer.objects.length} transition zones`);
    this.transitionZones = [];

    transitionLayer.objects.forEach((zone, index) => {
      const targetZone = this.getProperty(zone, 'targetZone') || this.getProperty(zone, 'targetMap');
      const spawnPoint = this.getProperty(zone, 'targetSpawn') || this.getProperty(zone, 'spawnPoint');
      const targetX = this.getProperty(zone, 'targetX');
      const targetY = this.getProperty(zone, 'targetY');

      if (!targetZone) {
        console.warn(`Zone ${index} sans targetZone/targetMap`);
        return;
      }

      const targetZoneName = this.mapSceneToZone(this.mapZoneToScene(targetZone));
      if (targetZoneName === this.zoneName) {
        console.warn(`⚠️ Zone ${index} pointe vers elle-même (${targetZone} → ${targetZoneName}), ignorée`);
        return;
      }

      const teleportZone = this.scene.add.zone(
        zone.x + (zone.width || 32) / 2, 
        zone.y + (zone.height || 32) / 2, 
        zone.width || 32, 
        zone.height || 32
      );

      this.scene.physics.world.enableBody(teleportZone, Phaser.Physics.Arcade.STATIC_BODY);
      teleportZone.body.setSize(zone.width || 32, zone.height || 32);

      const transitionData = {
        targetZone: targetZoneName,
        spawnPoint,
        targetX: targetX ? parseFloat(targetX) : undefined,
        targetY: targetY ? parseFloat(targetY) : undefined,
        fromZone: this.zoneName
      };

      teleportZone.transitionData = transitionData;
      this.transitionZones.push({ zone: teleportZone, data: transitionData });

      console.log(`✅ Transition zone ${index} setup:`, transitionData);
    });
  }

  checkTransitionCollisions() {
    // Ne pas vérifier pendant les transitions actives
    if (this.scene.networkComponent?.networkManager?.isTransitionActive) return;

    // Ne pas vérifier pendant le délai de grâce
    const now = Date.now();
    if (this.scene.playerComponent?.spawnGraceTime > 0 && 
        now < this.scene.playerComponent.spawnGraceTime) {
      return;
    }

    const myPlayer = this.scene.playerComponent?.getMyPlayer();
    if (!myPlayer) return;

    // Vérifier si le joueur bouge
    const isMoving = myPlayer.isMovingLocally || myPlayer.isMoving;
    if (!isMoving) {
      return;
    }

    // Vérifier toutes les zones de transition
    this.transitionZones.forEach(({ zone, data }) => {
      if (zone.body) {
        const playerBounds = myPlayer.getBounds();
        const zoneBounds = zone.getBounds();

        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
          console.log(`🌀 Collision transition vers ${data.targetZone}`);
          
          if (data.targetZone === this.zoneName) {
            console.warn(`⚠️ Tentative de transition vers soi-même ignorée`);
            return;
          }
          
          this.handleZoneTransition(data);
        }
      }
    });
  }

  async handleZoneTransition(transitionData) {
    // Vérifier les cooldowns
    const cooldownKey = transitionData.targetZone;
    const now = Date.now();
    
    if (this.transitionCooldowns[cooldownKey] && 
        now - this.transitionCooldowns[cooldownKey] < 1000) {
      console.log(`⏰ Transition vers ${cooldownKey} en cooldown`);
      return;
    }
    
    this.transitionCooldowns[cooldownKey] = now;

    // Vérifier si une transition est déjà en cours
    if (this.scene.networkComponent?.networkManager?.isTransitionActive) {
      console.log(`⚠️ Transition déjà en cours`);
      return;
    }

    if (transitionData.targetZone === this.zoneName) {
      console.warn(`⚠️ Transition vers soi-même bloquée`);
      return;
    }

    console.log(`🌀 === DÉBUT TRANSITION ===`);
    console.log(`📍 Destination: ${transitionData.targetZone}`);
    console.log(`📊 Data:`, transitionData);

    try {
      if (!this.scene.networkComponent?.isNetworkReady()) {
        throw new Error("Connexion réseau non prête");
      }

      const success = this.scene.networkComponent.moveToZone(
        transitionData.targetZone,
        transitionData.targetX,
        transitionData.targetY
      );

      if (!success) {
        throw new Error("Impossible d'envoyer la requête de transition");
      }

    } catch (error) {
      console.error(`❌ Erreur transition:`, error);
      this.showNotification(`Erreur: ${error.message}`, "error");
    }
  }

  // === GESTION DES NPCs ===
  handleNpcList(npcs) {
    console.log(`🤖 NPCs reçus: ${npcs.length}`);
    
    // Normalisation des noms de zones plus robuste
    const currentSceneZone = this.normalizeZoneName(this.scene.scene.key);
    const serverZone = this.scene.networkComponent?.getCurrentZone();
    
    console.log(`🔍 Comparaison zones: scene="${currentSceneZone}" vs server="${serverZone}"`);
    
    // Accepter les NPCs si on est dans la bonne zone OU si c'est juste après une transition
    const isCorrectZone = currentSceneZone === serverZone;
    const isRecentTransition = Date.now() - (this._lastTransitionTime || 0) < 3000; // 3 secondes de grâce
    
    if (!isCorrectZone && !isRecentTransition) {
      console.log(`🚫 NPCs ignorés: zone serveur=${serverZone} ≠ scène=${currentSceneZone}`);
      return;
    }
    
    if (this.npcManager && npcs.length > 0) {
      console.log(`✅ Spawn de ${npcs.length} NPCs`);
      this.npcManager.spawnNpcs(npcs);
    }
  }

  handleNpcInteraction(npcId) {
    if (this.scene.networkComponent?.isNetworkReady()) {
      this.scene.networkComponent.sendNpcInteract(npcId);
    }
  }

  getClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.npcManager) {
      return this.npcManager.getClosestNpc(playerX, playerY, maxDist);
    }
    return null;
  }

  highlightClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.npcManager) {
      this.npcManager.highlightClosestNpc(playerX, playerY, maxDist);
    }
  }

  // === GESTION DES SUCCÈS DE TRANSITION ===
  handleTransitionSuccess(result) {
    console.log(`✅ === TRANSITION RÉUSSIE ===`);
    console.log(`📍 Destination: ${result.currentZone}`);
    console.log(`📊 Résultat:`, result);
    
    // Marquer le moment de transition pour la grâce des NPCs
    this._lastTransitionTime = Date.now();
    
    const targetScene = this.mapZoneToScene(result.currentZone);
    
    if (targetScene === this.scene.scene.key) {
      console.log(`📍 Repositionnement dans la même scène`);
      this.repositionPlayerAfterTransition(result);
      
      // Forcer le rechargement des NPCs après repositionnement
      this.scene.time.delayedCall(500, () => {
        if (this.scene.networkComponent?.networkManager?.lastReceivedNpcs) {
          console.log(`🔄 Rechargement forcé des NPCs`);
          this.npcManager?.spawnNpcs(this.scene.networkComponent.networkManager.lastReceivedNpcs);
        }
      });
    } else {
      console.log(`🚀 Changement vers: ${targetScene}`);
      this.performSceneTransition(targetScene, result);
    }
  }

  repositionPlayerAfterTransition(result) {
    const myPlayer = this.scene.playerComponent?.getMyPlayer();
    if (myPlayer && result.position) {
      myPlayer.x = result.position.x;
      myPlayer.y = result.position.y;
      myPlayer.targetX = result.position.x;
      myPlayer.targetY = result.position.y;
      
      // Mettre à jour la caméra
      if (this.scene.cameraManager) {
        this.scene.cameraManager.snapToPlayer();
      }
      
      console.log(`📍 Position mise à jour: (${result.position.x}, ${result.position.y})`);
    }
    
    // Délai de grâce après repositionnement
    if (this.scene.playerComponent) {
      this.scene.playerComponent.spawnGraceTime = Date.now() + this.scene.playerComponent.spawnGraceDuration;
    }
  }

  performSceneTransition(targetScene, result) {
    console.log(`🚀 === CHANGEMENT DE SCÈNE ===`);
    console.log(`📍 Vers: ${targetScene}`);
    console.log(`📊 Data:`, result);
    
    // Préparer pour la transition
    this.prepareForTransition();
    
    // Démarrer la nouvelle scène avec toutes les données nécessaires
    const transitionData = {
      fromZone: this.zoneName,
      fromTransition: true,
      spawnX: result.position?.x,
      spawnY: result.position?.y,
      networkManager: this.scene.networkComponent?.getNetworkManager(),
      mySessionId: this.scene.networkComponent?.getSessionId(),
      preservePlayer: true,
      inventorySystem: this.scene.inventoryComponent?.inventorySystem
    };
    
    console.log(`📦 Données de transition:`, transitionData);
    
    this.scene.scene.start(targetScene, transitionData);
  }

  prepareForTransition() {
    console.log(`🔧 Préparation pour transition...`);
    
    // Arrêter les timers locaux
    this.scene.time.removeAllEvents();
    
    // Nettoyer les objets animés locaux
    if (this.scene.animatedObjects) {
      this.scene.animatedObjects.clear(true, true);
      this.scene.animatedObjects = null;
    }
    
    // Important: ne pas nettoyer les composants critiques (Network, Player, Inventory)
    // Ils seront transférés à la nouvelle scène
    
    console.log(`✅ Préparation terminée`);
  }

  // === UTILITAIRES ===
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  showNotification(message, type = 'info') {
    const notification = this.scene.add.text(
      this.scene.cameras.main.centerX,
      50,
      message,
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : type === 'success' ? '#44ff44' : '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.scene.time.delayedCall(3000, () => {
      if (notification && notification.scene) {
        notification.destroy();
      }
    });
  }

  // === MAPPING ZONES ===
  mapSceneToZone(sceneName) {
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

  mapZoneToScene(zoneName) {
    const mapping = {
      'beach': 'BeachScene',
      'village': 'VillageScene', 
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene'
    };
    return mapping[zoneName.toLowerCase()] || zoneName;
  }

  normalizeZoneName(sceneName) {
    return this.mapSceneToZone(sceneName);
  }

  // === GETTERS ===
  getZoneName() {
    return this.zoneName;
  }

  getNpcManager() {
    return this.npcManager;
  }

  getTransitionZones() {
    return this.transitionZones;
  }

  // === CLEANUP ===
  clearAllNpcs() {
    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
  }

  cleanup() {
    this.transitionCooldowns = {};
    this._lastTransitionTime = 0;
    this.transitionZones = [];
    
    if (this.npcManager) {
      this.npcManager.clearAllNpcs();
    }
  }

  destroy() {
    this.cleanup();
    
    if (this.npcManager) {
      this.npcManager.destroy();
    }
    this.npcManager = null;
  }
}
