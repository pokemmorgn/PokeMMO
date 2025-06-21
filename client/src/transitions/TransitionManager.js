// client/src/transitions/TransitionManager.js
// ✅ CORRECTIONS POUR SPAWNS CORRECTS

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    // Collections des éléments de transition
    this.teleport = new Map();
    this.spawns = new Map(); // ✅ AJOUT: Collection des spawns
    this.zones = new Map();
    
    // ✅ AJOUT: Mapping des spawns par zone
    this.spawnsByZone = new Map();
    
    // Mapping zone ↔ scene (existant)
    this.zoneToScene = {
      'beach': 'BeachScene',
      'village': 'VillageScene',
      'villagelab': 'VillageLabScene',
      'road1': 'Road1Scene',
      'villagehouse1': 'VillageHouse1Scene',
      'lavandia': 'LavandiaScene'
    };
    
    this.sceneToZone = {};
    Object.keys(this.zoneToScene).forEach(zone => {
      this.sceneToZone[this.zoneToScene[zone]] = zone;
    });
    
    this.currentZone = this.sceneToZone[scene.scene.key] || 'unknown';
    
    console.log(`🌀 [TransitionManager] Système initialisé pour ${this.currentZone}`);
  }

  // ✅ INITIALISATION AMÉLIORÉE: Scanner teleports ET spawns
  initialize() {
    console.log(`🌀 [TransitionManager] === INITIALISATION COMPLÈTE ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ Aucune map trouvée!`);
      return false;
    }

    // Chercher les layers contenant les objets
    const objectLayers = [
      this.scene.map.getObjectLayer('Worlds'),
      this.scene.map.getObjectLayer('Objects'),
      this.scene.map.getObjectLayer('Teleports')
    ].filter(layer => layer !== null);

    if (objectLayers.length === 0) {
      console.warn(`🌀 [TransitionManager] ⚠️ Aucun layer d'objets trouvé`);
      return false;
    }

    console.log(`🌀 [TransitionManager] 📋 ${objectLayers.length} layers d'objets trouvés`);

    // ✅ SCAN COMPLET: teleports ET spawns
    objectLayers.forEach(layer => {
      console.log(`🌀 [TransitionManager] 📂 Scan layer "${layer.name}" (${layer.objects.length} objets)`);
      
      layer.objects.forEach((obj, index) => {
        const objName = (obj.name || '').toLowerCase();
        const objType = (obj.type || '').toLowerCase();
        
        if (objName === 'teleport' || objType === 'teleport') {
          this.processTeleport(obj, index, layer.name);
        } else if (objName.includes('spawn') || objType === 'spawn') {
          this.processSpawn(obj, index, layer.name);
        }
      });
    });

    console.log(`🌀 [TransitionManager] ✅ Scan terminé:`);
    console.log(`  📍 ${this.teleport.size} teleports trouvés`);
    console.log(`  🎯 ${this.spawns.size} spawns trouvés`);

    // Organiser les spawns par zone
    this.organizeSpawnsByZone();

    // Créer les zones physiques pour collision
    this.createPhysicalZones();
    
    if (this.debugMode) {
      this.debugInfo();
    }

    this.isActive = true;
    return true;
  }

  // ✅ NOUVELLE MÉTHODE: Traiter les spawns
  processSpawn(obj, index, layerName) {
    const targetZone = this.getProperty(obj, 'targetzone') || this.currentZone;
    const spawnName = this.getProperty(obj, 'spawn') || obj.name || `spawn_${index}`;

    const spawn = {
      id: `spawn_${layerName}_${index}`,
      name: spawnName,
      zone: targetZone,
      x: obj.x,
      y: obj.y,
      width: obj.width || 32,
      height: obj.height || 32
    };

    this.spawns.set(spawn.id, spawn);
    
    console.log(`🌀 [TransitionManager] 🎯 Spawn "${spawnName}": ${targetZone} à (${spawn.x}, ${spawn.y})`);
  }

  // ✅ NOUVELLE MÉTHODE: Organiser les spawns par zone
  organizeSpawnsByZone() {
    console.log(`🌀 [TransitionManager] === ORGANISATION SPAWNS PAR ZONE ===`);
    
    this.spawns.forEach((spawn) => {
      if (!this.spawnsByZone.has(spawn.zone)) {
        this.spawnsByZone.set(spawn.zone, new Map());
      }
      
      this.spawnsByZone.get(spawn.zone).set(spawn.name, spawn);
      console.log(`🎯 Spawn organisé: ${spawn.zone}.${spawn.name} → (${spawn.x}, ${spawn.y})`);
    });

    // Debug des spawns organisés
    this.spawnsByZone.forEach((zoneSpawns, zoneName) => {
      const spawnNames = Array.from(zoneSpawns.keys());
      console.log(`🌍 Zone ${zoneName}: ${spawnNames.length} spawns [${spawnNames.join(', ')}]`);
    });
  }

  // ✅ NOUVELLE MÉTHODE: Trouver une position de spawn
  findSpawnPosition(targetZone, targetSpawn) {
    console.log(`🔍 [TransitionManager] Recherche spawn: ${targetZone}.${targetSpawn}`);
    
    // 1. Chercher le spawn exact
    if (this.spawnsByZone.has(targetZone)) {
      const zoneSpawns = this.spawnsByZone.get(targetZone);
      
      if (targetSpawn && zoneSpawns.has(targetSpawn)) {
        const spawn = zoneSpawns.get(targetSpawn);
        console.log(`✅ Spawn exact trouvé: ${targetSpawn} → (${spawn.x}, ${spawn.y})`);
        return { x: spawn.x, y: spawn.y };
      }
      
      // 2. Chercher un spawn "default" ou "défaut"
      const defaultSpawns = ['default', 'défaut', 'main', 'principal'];
      for (const defaultName of defaultSpawns) {
        if (zoneSpawns.has(defaultName)) {
          const spawn = zoneSpawns.get(defaultName);
          console.log(`🎯 Spawn par défaut trouvé: ${defaultName} → (${spawn.x}, ${spawn.y})`);
          return { x: spawn.x, y: spawn.y };
        }
      }
      
      // 3. Prendre le premier spawn disponible
      if (zoneSpawns.size > 0) {
        const firstSpawn = Array.from(zoneSpawns.values())[0];
        console.log(`🔄 Premier spawn disponible: ${firstSpawn.name} → (${firstSpawn.x}, ${firstSpawn.y})`);
        return { x: firstSpawn.x, y: firstSpawn.y };
      }
    }
    
    // 4. Position par défaut de la scène
    const defaultPos = this.getSceneDefaultPosition(targetZone);
    console.warn(`⚠️ Aucun spawn trouvé, position par défaut: (${defaultPos.x}, ${defaultPos.y})`);
    return defaultPos;
  }

  // ✅ NOUVELLE MÉTHODE: Position par défaut par scène
  getSceneDefaultPosition(targetZone) {
    const defaults = {
      'beach': { x: 52, y: 48 },
      'village': { x: 200, y: 150 },
      'villagelab': { x: 100, y: 100 },
      'road1': { x: 50, y: 200 },
      'villagehouse1': { x: 80, y: 80 },
      'lavandia': { x: 300, y: 200 }
    };
    
    return defaults[targetZone] || { x: 100, y: 100 };
  }

  // ✅ DÉCLENCHER TRANSITION CORRIGÉE
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.log(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === DEMANDE TRANSITION SERVEUR ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn demandé: ${teleportData.targetSpawn || 'défaut'}`);

    this.isTransitioning = true;

    const myPlayer = this.scene.playerManager?.getMyPlayer();
    if (!myPlayer) {
      console.error(`🌀 [TransitionManager] ❌ Joueur local introuvable`);
      this.isTransitioning = false;
      return;
    }

    // ✅ SAUVEGARDE POUR ROLLBACK
    const originalState = {
      zone: this.currentZone,
      scene: this.scene.scene.key,
      player: {
        x: myPlayer.x,
        y: myPlayer.y,
        targetX: myPlayer.targetX,
        targetY: myPlayer.targetY,
        visible: myPlayer.visible,
        active: myPlayer.active
      }
    };

    const targetScene = this.zoneToScene[teleportData.targetZone];
    if (!targetScene) {
      console.error(`🌀 [TransitionManager] ❌ Scene inconnue pour zone: ${teleportData.targetZone}`);
      this.isTransitioning = false;
      return;
    }

    // ✅ CALCUL DE LA VRAIE POSITION DE SPAWN
    const spawnPosition = this.findSpawnPosition(teleportData.targetZone, teleportData.targetSpawn);
    
    console.log(`🎯 [TransitionManager] Position calculée: (${spawnPosition.x}, ${spawnPosition.y})`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      localTransition: true,
      spawnX: spawnPosition.x, // ✅ VRAIE position, pas temporaire
      spawnY: spawnPosition.y, // ✅ VRAIE position, pas temporaire
      targetSpawn: teleportData.targetSpawn, // ✅ AJOUT: Garder l'info du spawn
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      forcePlayerSync: true,
      pendingValidation: true
    };

    // ✅ SETUP LISTENER POUR VALIDATION
    this.setupValidationListener(teleportData, originalState, targetScene, transitionData);

    // ✅ ENVOYER DEMANDE AU SERVEUR
    if (this.scene.networkManager && this.scene.networkManager.isConnected) {
      const validationRequest = {
        fromZone: teleportData.fromZone,
        targetZone: teleportData.targetZone,
        targetSpawn: teleportData.targetSpawn,
        playerX: myPlayer.x,
        playerY: myPlayer.y,
        teleportId: teleportData.id,
        requestedSpawnPosition: spawnPosition // ✅ AJOUT: Position demandée
      };

      console.log(`📤 [TransitionManager] Envoi demande validation:`, validationRequest);
      this.scene.networkManager.room.send("validateTransition", validationRequest);
    }

    // ✅ DÉMARRER LA NOUVELLE SCÈNE avec la bonne position
    console.log(`🚀 [TransitionManager] Transition vers ${targetScene} avec position (${spawnPosition.x}, ${spawnPosition.y})`);
    this.scene.scene.start(targetScene, transitionData);
  }

  // ✅ SETUP LISTENER VALIDATION (amélioré)
  setupValidationListener(teleportData, originalState, targetScene, transitionData) {
    console.log(`👂 [TransitionManager] Setup listener de validation...`);
    
    const validationTimeout = setTimeout(() => {
      console.warn(`⏰ [TransitionManager] Timeout validation - utilisation position calculée`);
      this.isTransitioning = false;
    }, 5000);

    if (this.scene.networkManager?.room) {
      const validationHandler = (result) => {
        console.log(`📨 [TransitionManager] Résultat validation reçu:`, result);
        
        clearTimeout(validationTimeout);
        this.isTransitioning = false;

        if (result.success) {
          console.log(`✅ [TransitionManager] Transition validée par le serveur`);
          
          // ✅ PRIORITÉ: Position serveur > Position calculée > Position par défaut
          if (result.position) {
            const currentPlayer = this.scene.playerManager?.getMyPlayer();
            if (currentPlayer) {
              console.log(`🎯 [TransitionManager] Position serveur utilisée: (${result.position.x}, ${result.position.y})`);
              currentPlayer.x = result.position.x;
              currentPlayer.y = result.position.y;
              currentPlayer.targetX = result.position.x;
              currentPlayer.targetY = result.position.y;
            }
          } else {
            console.log(`🎯 [TransitionManager] Position calculée conservée: (${transitionData.spawnX}, ${transitionData.spawnY})`);
          }
        } else {
          console.error(`❌ [TransitionManager] Transition refusée: ${result.reason}`);
          
          if (result.rollback) {
            this.performRollbackImproved(originalState);
          }
          
          this.showTransitionError(result.reason);
        }
      };

      this.scene.networkManager.onTransitionValidation = validationHandler;
    }
  }

  // ✅ DEBUG AMÉLIORÉ
  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG COMPLET ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    
    console.log(`📍 TELEPORTS (${this.teleport.size}):`);
    this.teleport.forEach((teleport, id) => {
      console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone} ${teleport.targetSpawn || ''}`);
    });
    
    console.log(`🎯 SPAWNS (${this.spawns.size}):`);
    this.spawns.forEach((spawn, id) => {
      console.log(`  - ${spawn.name}: ${spawn.zone} à (${spawn.x}, ${spawn.y})`);
    });
    
    console.log(`🌍 SPAWNS PAR ZONE:`);
    this.spawnsByZone.forEach((zoneSpawns, zoneName) => {
      const spawnList = Array.from(zoneSpawns.entries()).map(([name, spawn]) => 
        `${name}(${spawn.x},${spawn.y})`
      ).join(', ');
      console.log(`  - ${zoneName}: ${spawnList}`);
    });
    
    console.log(`⚡ ZONES COLLISION (${this.zones.size}):`);
    this.zones.forEach((zone, id) => {
      console.log(`  - ${id}: zone collision active`);
    });
  }

  // Helper method (existant, inchangé)
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // Autres méthodes existantes inchangées...
  createPhysicalZones() {
    console.log(`🌀 [TransitionManager] === CRÉATION ZONES COLLISION ===`);

    this.teleport.forEach((teleportData) => {
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
        this.createDebugRect(zone, teleportData);
      }

      this.zones.set(teleportData.id, zone);
      console.log(`🌀 [TransitionManager] ✅ Zone collision "${teleportData.id}" créée`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.zones.size} zones collision créées`);
  }

  createDebugRect(zone, teleportData) {
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0xff0000, 0.3
    );
    debugRect.setDepth(999);
    
    const debugText = this.scene.add.text(
      zone.x, zone.y - 20,
      `→ ${teleportData.targetZone}${teleportData.targetSpawn ? '\n' + teleportData.targetSpawn : ''}`,
      {
        fontSize: '10px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
        align: 'center'
      }
    );
    debugText.setDepth(1000);
    debugText.setOrigin(0.5);
  }

  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    this.zones.forEach((zone) => {
      if (!zone.transitionData) return;

      const playerBounds = player.getBounds();
      const zoneBounds = zone.getBounds();

      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
        this.triggerTransition(zone.transitionData);
      }
    });
  }

  performRollbackImproved(originalState) {
    console.log(`🔄 [TransitionManager] === ROLLBACK AMÉLIORÉ ===`);
    console.log(`📍 Retour vers: ${originalState.scene} (${originalState.zone})`);
    
    const rollbackData = {
      fromTransition: true,
      isRollback: true,
      spawnX: originalState.player.x,
      spawnY: originalState.player.y,
      networkManager: this.scene.networkManager,
      mySessionId: this.scene.mySessionId,
      forcePlayerSync: true,
      restorePlayerState: originalState.player
    };

    console.log(`🔄 [TransitionManager] Rollback vers ${originalState.scene}`);
    this.scene.scene.start(originalState.scene, rollbackData);
  }

  showTransitionError(reason) {
    console.error(`🚫 [TransitionManager] ${reason}`);
    
    if (typeof this.scene.showNotification === 'function') {
      this.scene.showNotification(`Transition refusée: ${reason}`, 'error');
    } else {
      if (this.scene.add && this.scene.cameras && this.scene.cameras.main) {
        const notification = this.scene.add.text(
          this.scene.cameras.main.worldView.centerX || this.scene.scale.width / 2,
          50,
          `Transition refusée: ${reason}`,
          {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ff4444',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 10, y: 5 }
          }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

        if (this.scene.time) {
          this.scene.time.delayedCall(3000, () => {
            if (notification && notification.scene) {
              notification.destroy();
            }
          });
        }
      }
    }
  }

  destroy() {
    console.log(`🌀 [TransitionManager] Nettoyage...`);
    
    this.zones.forEach((zone) => {
      if (zone && zone.destroy) {
        zone.destroy();
      }
    });
    
    this.teleport.clear();
    this.spawns.clear();
    this.spawnsByZone.clear();
    this.zones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    
    console.log(`🌀 [TransitionManager] ✅ Nettoyé`);
  }

  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }
}
