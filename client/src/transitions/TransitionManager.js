// client/src/transitions/TransitionManager.js
// ✅ SYSTÈME DE TRANSITION AVEC VALIDATION SERVEUR PURE
// Le client ne calcule RIEN, il fait juste la détection de collision et attend le serveur

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    this.isTransitioning = false;
    
    // Collections des éléments de transition (LOCAL seulement pour collision)
    this.teleport = new Map(); // objets "teleport" avec targetzone/targetspawn
    this.zones = new Map();    // zones physiques créées
    
    // Mapping zone ↔ scene
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
    
    console.log(`🌀 [TransitionManager] Système client pur initialisé pour ${this.currentZone}`);
  }

  // ✅ INITIALISATION: Scanner seulement les teleports (pour collision)
  initialize() {
    console.log(`🌀 [TransitionManager] === INITIALISATION CLIENT ===`);
    
    if (!this.scene.map) {
      console.error(`🌀 [TransitionManager] ❌ Aucune map trouvée!`);
      return false;
    }

    // Chercher les layers contenant les objets
    const objectLayers = [
      this.scene.map.getObjectLayer('Worlds')
    ].filter(layer => layer !== null);

    if (objectLayers.length === 0) {
      console.warn(`🌀 [TransitionManager] ⚠️ Aucun layer d'objets trouvé`);
      return false;
    }

    console.log(`🌀 [TransitionManager] 📋 ${objectLayers.length} layers d'objets trouvés`);

    // Scanner SEULEMENT les teleports
    objectLayers.forEach(layer => {
      console.log(`🌀 [TransitionManager] 📂 Scan layer "${layer.name}" (${layer.objects.length} objets)`);
      
      layer.objects.forEach((obj, index) => {
        const objName = (obj.name || '').toLowerCase();
        
        if (objName === 'teleport') {
          this.processTeleport(obj, index, layer.name);
        }
        // ✅ PAS DE TRAITEMENT DES SPAWNS CÔTÉ CLIENT
      });
    });

    console.log(`🌀 [TransitionManager] ✅ Scan terminé:`);
    console.log(`  📍 ${this.teleport.size} teleports trouvés`);

    // Créer les zones physiques pour collision
    this.createPhysicalZones();
    
    if (this.debugMode) {
      this.debugInfo();
    }

    this.isActive = true;
    return true;
  }

  // ✅ TRAITER UN TELEPORT (pour collision seulement)
  processTeleport(obj, index, layerName) {
    const targetZone = this.getProperty(obj, 'targetzone');
    const targetSpawn = this.getProperty(obj, 'targetspawn');

    if (!targetZone) {
      console.warn(`🌀 [TransitionManager] ⚠️ Teleport ${index} (${layerName}) sans 'targetzone'`);
      return;
    }

    const teleport = {
      id: `teleport_${layerName}_${index}`,
      type: 'teleport',
      x: obj.x,
      y: obj.y,
      width: obj.width || 32,
      height: obj.height || 32,
      targetZone: targetZone,
      targetSpawn: targetSpawn,
      fromZone: this.currentZone
    };

    this.teleport.set(teleport.id, teleport);
    
    console.log(`🌀 [TransitionManager] 📍 Teleport "${teleport.id}": ${this.currentZone} → ${targetZone} ${targetSpawn ? `(spawn: ${targetSpawn})` : ''}`);
  }

  // ✅ CRÉER ZONES PHYSIQUES (pour collision)
  createPhysicalZones() {
    console.log(`🌀 [TransitionManager] === CRÉATION ZONES COLLISION ===`);

    this.teleport.forEach((teleportData) => {
      // Créer une zone invisible Phaser
      const zone = this.scene.add.zone(
        teleportData.x + teleportData.width / 2,
        teleportData.y + teleportData.height / 2,
        teleportData.width,
        teleportData.height
      );

      // Activer la physique
      this.scene.physics.world.enableBody(zone, Phaser.Physics.Arcade.STATIC_BODY);
      zone.body.setSize(teleportData.width, teleportData.height);

      // Attacher les données
      zone.transitionData = teleportData;
      
      // Debug visuel
      if (this.debugMode) {
        this.createDebugRect(zone, teleportData);
      }

      this.zones.set(teleportData.id, zone);
      
      console.log(`🌀 [TransitionManager] ✅ Zone collision "${teleportData.id}" créée`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.zones.size} zones collision créées`);
  }

  // ✅ DEBUG VISUEL
  createDebugRect(zone, teleportData) {
    const debugRect = this.scene.add.rectangle(
      zone.x, zone.y,
      zone.displayWidth, zone.displayHeight,
      0xff0000, 0.3
    );
    debugRect.setDepth(999);
    debugRect.setScrollFactor(0, 0);
    
    // Texte de debug
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

  // ✅ VÉRIFIER COLLISIONS (inchangé)
  checkCollisions(player) {
    if (!this.isActive || !player || this.isTransitioning) return;

    this.zones.forEach((zone) => {
      if (!zone.transitionData) return;

      // Vérifier collision simple avec bounds
      const playerBounds = player.getBounds();
      const zoneBounds = zone.getBounds();

      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
        this.triggerTransition(zone.transitionData);
      }
    });
  }

  // ✅ DÉCLENCHER TRANSITION (SIMPLIFIÉ - SERVEUR ONLY)
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.log(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === DEMANDE TRANSITION SERVEUR ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn: ${teleportData.targetSpawn || 'défaut'}`);

    this.isTransitioning = true;

    // Obtenir la position actuelle du joueur
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

    // ✅ POSITION TEMPORAIRE (sera corrigée par le serveur)
    const temporarySpawnPosition = { x: 100, y: 100 };

    console.log(`🚀 [TransitionManager] Transition temporaire, validation serveur en cours...`);
    
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      localTransition: true,
      spawnX: temporarySpawnPosition.x, // ← Position temporaire
      spawnY: temporarySpawnPosition.y, // ← Position temporaire
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
        teleportId: teleportData.id
      };

      console.log(`📤 [TransitionManager] Envoi demande validation:`, validationRequest);
      this.scene.networkManager.room.send("validateTransition", validationRequest);
    }

    // ✅ DÉMARRER LA NOUVELLE SCÈNE (position temporaire)
    this.scene.scene.start(targetScene, transitionData);
  }

  // ✅ SETUP LISTENER VALIDATION (inchangé)
  setupValidationListener(teleportData, originalState, targetScene, transitionData) {
    console.log(`👂 [TransitionManager] Setup listener de validation...`);
    
    const validationTimeout = setTimeout(() => {
      console.warn(`⏰ [TransitionManager] Timeout validation - transition acceptée par défaut`);
      this.isTransitioning = false;
    }, 5000);

    if (this.scene.networkManager?.room) {
      const validationHandler = (result) => {
        console.log(`📨 [TransitionManager] Résultat validation reçu:`, result);
        
        clearTimeout(validationTimeout);
        this.isTransitioning = false;

        if (result.success) {
          console.log(`✅ [TransitionManager] Transition validée par le serveur`);
          
          if (result.position) {
            const currentPlayer = this.scene.playerManager?.getMyPlayer();
            if (currentPlayer) {
              console.log(`🔧 [TransitionManager] Correction position serveur:`, result.position);
              currentPlayer.x = result.position.x;
              currentPlayer.y = result.position.y;
              currentPlayer.targetX = result.position.x;
              currentPlayer.targetY = result.position.y;
            }
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

  // ✅ ROLLBACK (inchangé)
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

  // ✅ AFFICHAGE ERREUR (inchangé)
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

  // ✅ HELPER (inchangé)
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ DEBUG (simplifié)
  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG CLIENT ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    
    console.log(`📍 TELEPORTS (${this.teleport.size}):`);
    this.teleport.forEach((teleport, id) => {
      console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone} ${teleport.targetSpawn || ''}`);
    });
    
    console.log(`⚡ ZONES COLLISION (${this.zones.size}):`);
    this.zones.forEach((zone, id) => {
      console.log(`  - ${id}: zone collision active`);
    });
  }

  // ✅ NETTOYAGE (simplifié)
  destroy() {
    console.log(`🌀 [TransitionManager] Nettoyage...`);
    
    this.zones.forEach((zone) => {
      if (zone && zone.destroy) {
        zone.destroy();
      }
    });
    
    this.teleport.clear();
    this.zones.clear();
    this.isActive = false;
    this.isTransitioning = false;
    
    console.log(`🌀 [TransitionManager] ✅ Nettoyé`);
  }

  // ✅ SETTER (inchangé)
  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }
}
