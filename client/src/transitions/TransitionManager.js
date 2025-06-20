// client/src/transitions/TransitionManager.js
// ✅ NOUVEAU SYSTÈME DE TRANSITION 100% LOCAL
// Remplace entièrement l'ancien système

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.debugMode = true;
    
    // Collections des éléments de transition
    this.teleport = new Map(); // objets "teleport" avec targetzone/targetspawn
    this.spawn = new Map();    // objets "spawn" avec leur nom
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
    
    console.log(`🌀 [TransitionManager] Nouveau système initialisé pour ${this.currentZone}`);
  }

  // ✅ ÉTAPE 1: Scanner la map et extraire tous les éléments
  initialize() {
    console.log(`🌀 [TransitionManager] === INITIALISATION ===`);
    
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

    // Scanner tous les objets de tous les layers
    objectLayers.forEach(layer => {
      console.log(`🌀 [TransitionManager] 📂 Scan layer "${layer.name}" (${layer.objects.length} objets)`);
      
      layer.objects.forEach((obj, index) => {
        this.processObject(obj, index, layer.name);
      });
    });

    console.log(`🌀 [TransitionManager] ✅ Scan terminé:`);
    console.log(`  📍 ${this.teleport.size} teleport trouvés`);
    console.log(`  🎯 ${this.spawn.size} spawn trouvés`);

    // Créer les zones physiques
    this.createPhysicalZones();
    
    // Debug
    if (this.debugMode) {
      this.debugInfo();
    }

    this.isActive = true;
    return true;
  }

  // ✅ ÉTAPE 2: Analyser chaque objet
  processObject(obj, index, layerName) {
    const objName = (obj.name || '').toLowerCase();
    
    if (objName === 'teleport') {
      this.processTeleport(obj, index, layerName);
    } else if (objName === 'spawn') {
      this.processSpawn(obj, index, layerName);
    }
  }


  // ✅ TRAITER UN TELEPORT
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

  // ✅ TRAITER UN SPAWN
  processSpawn(obj, index, layerName) {
    // Récupérer le nom du spawn depuis plusieurs sources possibles
    const spawnName = this.getProperty(obj, 'name') || 
                     this.getProperty(obj, 'spawnname') ||
                     obj.name;

    if (!spawnName) {
      console.warn(`🌀 [TransitionManager] ⚠️ Spawn ${index} (${layerName}) sans nom`);
      return;
    }

    const spawn = {
      id: `spawn_${layerName}_${index}`,
      type: 'spawn',
      name: spawnName,
      x: obj.x,
      y: obj.y,
      zone: this.currentZone
    };

    this.spawn.set(spawnName, spawn);
    
    console.log(`🌀 [TransitionManager] 🎯 Spawn "${spawnName}": (${spawn.x}, ${spawn.y}) dans ${this.currentZone}`);
  }

  // ✅ ÉTAPE 3: Créer les zones physiques pour les teleport
  createPhysicalZones() {
    console.log(`🌀 [TransitionManager] === CRÉATION ZONES PHYSIQUES ===`);

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
      
      console.log(`🌀 [TransitionManager] ✅ Zone physique "${teleportData.id}" créée`);
    });

    console.log(`🌀 [TransitionManager] ✅ ${this.zones.size} zones physiques créées`);
  }

  // ✅ CRÉER RECTANGLE DE DEBUG
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

  // ✅ ÉTAPE 4: Vérifier les collisions avec le joueur
  checkCollisions(player) {
    if (!this.isActive || !player) return;

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

  // ✅ ÉTAPE 5: Déclencher une transition (100% LOCAL)
  async triggerTransition(teleportData) {
    if (this.isTransitioning) {
      console.log(`🌀 [TransitionManager] ⚠️ Transition déjà en cours`);
      return;
    }

    console.log(`🌀 [TransitionManager] === TRANSITION 100% LOCALE ===`);
    console.log(`📍 De: ${teleportData.fromZone}`);
    console.log(`📍 Vers: ${teleportData.targetZone}`);
    console.log(`🎯 Spawn: ${teleportData.targetSpawn || 'défaut'}`);

    this.isTransitioning = true;

    // Calculer la scène cible
    const targetScene = this.zoneToScene[teleportData.targetZone];
    
    if (!targetScene) {
      console.error(`🌀 [TransitionManager] ❌ Scene inconnue pour zone: ${teleportData.targetZone}`);
      this.isTransitioning = false;
      return;
    }

    // Calculer la position de spawn (chargement depuis fichier .tmj)
    const spawnPosition = await this.calculateSpawnPosition(teleportData.targetSpawn, teleportData.targetZone);

    console.log(`🚀 [TransitionManager] Transition LOCALE vers: ${targetScene}`);
    console.log(`📍 Position spawn: (${spawnPosition.x}, ${spawnPosition.y})`);

    // ✅ DONNÉES 100% LOCALES - pas de NetworkManager
    const transitionData = {
      fromZone: this.currentZone,
      fromTransition: true,
      spawnX: spawnPosition.x,
      spawnY: spawnPosition.y,
      spawnPoint: teleportData.targetSpawn,
      localTransition: true // ✅ Flag pour indiquer que c'est local
    };

    console.log(`🌀 [TransitionManager] ✅ Transition LOCALE - aucune donnée serveur transmise`);

    // Démarrer la nouvelle scène
    this.scene.scene.start(targetScene, transitionData);
  }

  // ✅ CALCULER LA POSITION DE SPAWN
  async calculateSpawnPosition(targetSpawnName, targetZone) {
    // Position par défaut si rien trouvé
    const defaultPos = { x: 100, y: 100 };

    if (!targetSpawnName) {
      console.log(`🌀 [TransitionManager] Pas de spawn spécifique, position par défaut`);
      return defaultPos;
    }

    console.log(`🌀 [TransitionManager] 🔍 Recherche spawn "${targetSpawnName}" dans zone "${targetZone}"`);

    try {
      // Charger la map de la zone cible
      const mapData = await this.loadTargetMap(targetZone);
      if (!mapData) {
        console.warn(`🌀 [TransitionManager] ❌ Impossible de charger la map pour "${targetZone}"`);
        return defaultPos;
      }

      // Chercher l'objet spawn dans la map
      const spawnPosition = this.findSpawnInMap(mapData, targetSpawnName);
      if (spawnPosition) {
        console.log(`🌀 [TransitionManager] ✅ Spawn "${targetSpawnName}" trouvé: (${spawnPosition.x}, ${spawnPosition.y})`);
        return spawnPosition;
      } else {
        console.warn(`🌀 [TransitionManager] ⚠️ Spawn "${targetSpawnName}" non trouvé dans "${targetZone}"`);
        return defaultPos;
      }

    } catch (error) {
      console.error(`🌀 [TransitionManager] ❌ Erreur lors du chargement spawn:`, error);
      return defaultPos;
    }
  }

  // ✅ CHARGER LA MAP CIBLE
  async loadTargetMap(targetZone) {
    console.log(`🌀 [TransitionManager] 📥 Chargement map "${targetZone}.tmj"`);

    try {
      const response = await fetch(`assets/maps/${targetZone}.tmj`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const mapData = await response.json();
      console.log(`🌀 [TransitionManager] ✅ Map "${targetZone}" chargée (${mapData.layers?.length || 0} layers)`);
      
      return mapData;
    } catch (error) {
      console.error(`🌀 [TransitionManager] ❌ Erreur chargement "${targetZone}.tmj":`, error);
      return null;
    }
  }

  // ✅ CHERCHER LE SPAWN DANS LA MAP
  findSpawnInMap(mapData, targetSpawnName) {
    if (!mapData.layers) {
      console.warn(`🌀 [TransitionManager] ⚠️ Aucun layer dans la map`);
      return null;
    }

    // Chercher dans tous les layers d'objets
    for (const layer of mapData.layers) {
      if (layer.type !== 'objectgroup' || !layer.objects) {
        continue;
      }

      console.log(`🌀 [TransitionManager] 🔍 Scan layer "${layer.name}" (${layer.objects.length} objets)`);

      // Chercher l'objet spawn
      for (const obj of layer.objects) {
        if (obj.name === 'spawn') {
          // Vérifier si c'est le bon spawn
          const spawnName = this.getPropertyFromObject(obj, 'name');
          
          if (spawnName === targetSpawnName) {
            console.log(`🌀 [TransitionManager] 🎯 Spawn "${targetSpawnName}" trouvé dans layer "${layer.name}"`);
            
            return {
              x: obj.x,
              y: obj.y
            };
          }
        }
      }
    }

    console.warn(`🌀 [TransitionManager] ❌ Spawn "${targetSpawnName}" non trouvé dans la map`);
    return null;
  }

  // ✅ HELPER: Récupérer une propriété d'un objet (pour les maps chargées)
  getPropertyFromObject(obj, propertyName) {
    if (!obj.properties) return null;
    
    const prop = obj.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ HELPER: Récupérer une propriété d'objet Tiled
  getProperty(object, propertyName) {
    if (!object.properties) return null;
    
    const prop = object.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ DEBUG: Afficher toutes les infos
  debugInfo() {
    console.log(`🌀 [TransitionManager] === DEBUG INFO ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    
    console.log(`📍 TELEPORT (${this.teleport.size}):`);
    this.teleport.forEach((teleport, id) => {
      console.log(`  - ${id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone} ${teleport.targetSpawn || ''}`);
    });
    
    console.log(`🎯 SPAWN (${this.spawn.size}):`);
    this.spawn.forEach((spawn, name) => {
      console.log(`  - "${name}": (${spawn.x}, ${spawn.y})`);
    });
    
    console.log(`⚡ ZONES PHYSIQUES (${this.zones.size}):`);
    this.zones.forEach((zone, id) => {
      console.log(`  - ${id}: zone physique active`);
    });
  }

  // ✅ NETTOYAGE
  destroy() {
    console.log(`🌀 [TransitionManager] Nettoyage...`);
    
    this.zones.forEach((zone) => {
      if (zone && zone.destroy) {
        zone.destroy();
      }
    });
    
    this.teleport.clear();
    this.spawn.clear();
    this.zones.clear();
    this.isActive = false;
    
    console.log(`🌀 [TransitionManager] ✅ Nettoyé`);
  }

  // ✅ SETTER pour désactiver les transitions temporairement
  setActive(active) {
    this.isActive = active;
    console.log(`🌀 [TransitionManager] ${active ? 'Activé' : 'Désactivé'}`);
  }
}
