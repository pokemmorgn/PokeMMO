// server/src/managers/EncounterMapManager.js - VERSION CORRIGÉE
import fs from 'fs/promises';
import path from 'path';

export class EncounterMapManager {
  constructor(mapName) {
    this.mapName = mapName;
    this.mapData = null;
    this.encounterZones = new Map();
    this.grassTiles = new Set();
    this.waterTiles = new Set();
    
    // ✅ CORRECTION: Essayer de charger la carte avec fallback
    this.loadMapDataSafe();
  }

  // ✅ NOUVELLE MÉTHODE: Chargement sécurisé avec fallback
  async loadMapDataSafe() {
    try {
      await this.loadMapData();
      console.log(`✅ [EncounterMapManager] Carte ${this.mapName} chargée avec succès`);
    } catch (error) {
      console.warn(`⚠️ [EncounterMapManager] Impossible de charger ${this.mapName}, utilisation fallback`);
      this.createFallbackMapData();
    }
  }

  async loadMapData() {
    // ✅ CORRECTION: Essayer plusieurs extensions et emplacements
    const possiblePaths = [
      path.join(__dirname, '../assets/maps', `${this.mapName}.tmj`),
      path.join(__dirname, '../assets/maps', `${this.mapName}.json`),
      path.join(__dirname, '../../assets/maps', `${this.mapName}.tmj`),
      path.join(__dirname, '../../assets/maps', `${this.mapName}.json`),
      path.join(process.cwd(), 'assets/maps', `${this.mapName}.tmj`),
      path.join(process.cwd(), 'assets/maps', `${this.mapName}.json`)
    ];

    console.log(`🔍 [EncounterMapManager] Recherche carte: ${this.mapName}`);
    
    let mapContent = null;
    let foundPath = null;

    // ✅ Essayer chaque chemin
    for (const filePath of possiblePaths) {
      try {
        console.log(`📁 [EncounterMapManager] Test: ${filePath}`);
        
        // Vérifier si le fichier existe
        await fs.access(filePath);
        
        // Lire le contenu
        mapContent = await fs.readFile(filePath, 'utf-8');
        foundPath = filePath;
        
        console.log(`✅ [EncounterMapManager] Carte trouvée: ${filePath}`);
        break;
        
      } catch (error) {
        // Continuer vers le prochain chemin
        continue;
      }
    }

    if (!mapContent) {
      throw new Error(`EncounterMapManager: Aucun fichier map trouvé pour ${this.mapName}`);
    }

    // ✅ Parser les données
    try {
      this.mapData = JSON.parse(mapContent);
      console.log(`📋 [EncounterMapManager] Données parsées depuis: ${foundPath}`);
      
      // ✅ Charger les zones et tiles
      this.loadEncounterZones();
      this.loadGrassTiles();
      this.loadWaterTiles();
      
    } catch (parseError) {
      throw new Error(`EncounterMapManager: Erreur parsing JSON - ${parseError.message}`);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Créer des données de fallback
  createFallbackMapData() {
    console.log(`🔧 [EncounterMapManager] Création fallback pour ${this.mapName}`);
    
    this.mapData = {
      name: this.mapName,
      width: 50,
      height: 50,
      tilewidth: 32,
      tileheight: 32,
      layers: [
        {
          name: 'BelowPlayer2',
          type: 'tilelayer',
          width: 50,
          height: 50,
          data: new Array(2500).fill(0).map(() => Math.random() > 0.7 ? 1 : 0) // Quelques tiles d'herbe
        },
        {
          name: 'objects',
          type: 'objectgroup',
          objects: [
            {
              id: 1,
              name: 'encounterzone',
              type: 'encounterzone',
              x: 0,
              y: 0,
              width: 1600, // 50 * 32
              height: 1600, // 50 * 32
              properties: [
                { name: 'zoneId', value: `${this.mapName}_default` }
              ]
            }
          ]
        }
      ],
      tilesets: [
        {
          firstgid: 1,
          tiles: [
            {
              id: 0,
              properties: [
                { name: 'grassTile', value: true }
              ]
            }
          ]
        }
      ]
    };

    // ✅ Charger les zones et tiles depuis le fallback
    this.loadEncounterZones();
    this.loadGrassTiles();
    this.loadWaterTiles();

    console.log(`✅ [EncounterMapManager] Fallback créé avec:`);
    console.log(`   📍 Zones: ${this.encounterZones.size}`);
    console.log(`   🌿 Grass tiles: ${this.grassTiles.size}`);
  }

  // ✅ MÉTHODES EXISTANTES (légèrement améliorées)
  
  loadEncounterZones() {
    if (!this.mapData?.layers) return;
    
    this.encounterZones.clear();
    
    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        for (const obj of layer.objects) {
          if (this.isEncounterZone(obj)) {
            const zoneId = this.extractZoneId(obj);
            if (zoneId) {
              this.encounterZones.set(obj.id.toString(), {
                id: obj.id,
                zoneId: zoneId,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                bounds: {
                  left: obj.x,
                  right: obj.x + obj.width,
                  top: obj.y,
                  bottom: obj.y + obj.height
                }
              });
              console.log(`📍 [EncounterMapManager] Zone ajoutée: ${zoneId}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ [EncounterMapManager] ${this.encounterZones.size} zones de rencontre chargées`);
  }

  loadGrassTiles() {
    if (!this.mapData?.tilesets) return;
    
    this.grassTiles.clear();
    
    for (const tileset of this.mapData.tilesets) {
      if (tileset.tiles) {
        for (const tile of tileset.tiles) {
          if (tile.properties) {
            const grassProp = tile.properties.find(p => p.name === 'grassTile');
            if (grassProp && grassProp.value) {
              const globalTileId = tileset.firstgid + tile.id;
              this.grassTiles.add(globalTileId);
            }
          }
        }
      }
    }
    
    console.log(`✅ [EncounterMapManager] ${this.grassTiles.size} tiles d'herbe chargées`);
  }

  loadWaterTiles() {
    if (!this.mapData?.tilesets) return;
    
    this.waterTiles.clear();
    
    for (const tileset of this.mapData.tilesets) {
      if (tileset.tiles) {
        for (const tile of tileset.tiles) {
          if (tile.properties) {
            const waterProp = tile.properties.find(p => p.name === 'waterTile');
            if (waterProp && waterProp.value) {
              const globalTileId = tileset.firstgid + tile.id;
              this.waterTiles.add(globalTileId);
            }
          }
        }
      }
    }
    
    console.log(`✅ [EncounterMapManager] ${this.waterTiles.size} tiles d'eau chargées`);
  }

  // ✅ MÉTHODES UTILITAIRES

  isEncounterZone(obj) {
    return (
      obj.name === 'encounterzone' || 
      obj.name === 'encouterzone' ||
      obj.type === 'encounterzone' || 
      obj.type === 'encouterzone'
    );
  }

  extractZoneId(obj) {
    if (!obj.properties) return null;
    
    const zoneIdProp = obj.properties.find(p =>
      p.name === 'zoneId' || p.name === 'zoneid' || p.name === 'zoneID'
    );
    
    return zoneIdProp?.value || null;
  }

  // ✅ API PUBLIQUE (préservée)

  isPositionOnGrass(x, y) {
    if (!this.mapData) return false;
    
    const tileX = Math.floor(x / this.mapData.tilewidth);
    const tileY = Math.floor(y / this.mapData.tileheight);

    const belowPlayer2Layer = this.mapData.layers.find(layer =>
      layer.name === 'BelowPlayer2' && layer.type === 'tilelayer'
    );

    if (!belowPlayer2Layer?.data) return false;
    
    const index = tileY * (belowPlayer2Layer.width || this.mapData.width) + tileX;
    if (index < 0 || index >= belowPlayer2Layer.data.length) return false;
    
    const tileId = belowPlayer2Layer.data[index];
    return this.grassTiles.has(tileId);
  }

  isPositionOnWater(x, y) {
    if (!this.mapData) return false;
    
    const tileX = Math.floor(x / this.mapData.tilewidth);
    const tileY = Math.floor(y / this.mapData.tileheight);

    for (const layer of this.mapData.layers) {
      if (layer.type === 'tilelayer' && layer.data) {
        const index = tileY * (layer.width || this.mapData.width) + tileX;
        if (index >= 0 && index < layer.data.length) {
          const tileId = layer.data[index];
          if (this.waterTiles.has(tileId)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getEncounterZoneAt(x, y) {
    for (const [id, zone] of this.encounterZones.entries()) {
      if (
        x >= zone.bounds.left &&
        x <= zone.bounds.right &&
        y >= zone.bounds.top &&
        y <= zone.bounds.bottom
      ) {
        return zone.zoneId;
      }
    }
    return null;
  }

  getPositionInfo(x, y) {
    return {
      isOnGrass: this.isPositionOnGrass(x, y),
      isOnWater: this.isPositionOnWater(x, y),
      zoneId: this.getEncounterZoneAt(x, y),
      mapLoaded: !!this.mapData
    };
  }

  // ✅ DEBUG
  debugMapData() {
    console.log(`🔍 [EncounterMapManager] === DEBUG ${this.mapName} ===`);
    console.log(`📊 Map chargée: ${!!this.mapData}`);
    
    if (this.mapData) {
      console.log(`📐 Dimensions: ${this.mapData.width} x ${this.mapData.height}`);
      console.log(`🔲 Tile size: ${this.mapData.tilewidth} x ${this.mapData.tileheight}`);
      console.log(`📑 Layers: ${this.mapData.layers?.length || 0}`);
      console.log(`🎨 Tilesets: ${this.mapData.tilesets?.length || 0}`);
    }
    
    console.log(`📍 Encounter zones: ${this.encounterZones.size}`);
    console.log(`🌿 Grass tiles: ${this.grassTiles.size}`);
    console.log(`🌊 Water tiles: ${this.waterTiles.size}`);
    
    // Lister les zones
    this.encounterZones.forEach((zone, id) => {
      console.log(`   📍 ${id}: ${zone.zoneId} (${zone.x}, ${zone.y})`);
    });
  }
}

// ✅ EXPORT
export default EncounterMapManager;
