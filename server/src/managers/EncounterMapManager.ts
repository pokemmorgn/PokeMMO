// server/src/managers/EncounterMapManager.ts - FIX NOMS DE MAPS
import fs from "fs";
import path from "path";

export interface EncounterZone {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export class EncounterMapManager {
  private grassTiles: Set<number> = new Set();
  private waterTiles: Set<number> = new Set();
  private encounterZones: Map<string, EncounterZone> = new Map();
  private tileWidth: number = 16;
  private tileHeight: number = 16;
  private mapData: any = null;

  // ✅ NOUVELLE MAPPING TABLE SCENE -> FICHIER MAP
  private static sceneToMapMapping: Record<string, string> = {
    'Road1Scene': 'road1',
    'Road2Scene': 'road2', 
    'CityScene': 'city',
    'ForestScene': 'forest',
    'WildernessScene': 'wilderness',
    'RouteScene': 'route',
    'TownScene': 'town',
    // Ajoute ici tes autres correspondances selon tes fichiers
  };

  constructor(mapPath: string) {
    this.loadMapData(mapPath);
  }

  // ✅ NOUVELLE MÉTHODE : Résoudre le nom réel du fichier
  private resolveMapFileName(inputName: string): string {
    console.log(`🔍 [EncounterMap] Résolution nom : "${inputName}"`);

    // 1. Vérifier la mapping table
    if (EncounterMapManager.sceneToMapMapping[inputName]) {
      const mappedName = EncounterMapManager.sceneToMapMapping[inputName];
      console.log(`✅ [EncounterMap] Trouvé dans mapping : ${inputName} -> ${mappedName}`);
      return mappedName + '.tmj';
    }

    // 2. Essayer le nom tel quel (avec .tmj)
    if (inputName.endsWith('.tmj')) {
      return inputName;
    }

    // 3. Essayer en minuscules
    const lowerName = inputName.toLowerCase();
    if (lowerName !== inputName) {
      console.log(`🔄 [EncounterMap] Essai minuscules : ${lowerName}`);
      return lowerName + '.tmj';
    }

    // 4. Essayer en retirant "Scene" du nom
    if (inputName.endsWith('Scene')) {
      const withoutScene = inputName.replace(/Scene$/, '').toLowerCase();
      console.log(`🔄 [EncounterMap] Essai sans "Scene" : ${withoutScene}`);
      return withoutScene + '.tmj';
    }

    // 5. Fallback : nom + .tmj
    return inputName + '.tmj';
  }

  // ✅ NOUVELLE MÉTHODE : Trouver le fichier qui existe vraiment
  private findExistingMapFile(baseName: string): string | null {
    const baseDir = path.resolve(__dirname, "../../build/assets/maps");
    
    // Liste des noms possibles à tester
    const possibleNames = [
      this.resolveMapFileName(baseName),
      baseName.toLowerCase() + '.tmj',
      baseName.replace(/Scene$/, '').toLowerCase() + '.tmj',
      baseName + '.tmj',
      baseName.toLowerCase() + '.json',
      baseName.replace(/Scene$/, '') + '.tmj'
    ];

    console.log(`🔍 [EncounterMap] Test fichiers pour "${baseName}" dans ${baseDir}`);

    for (const fileName of possibleNames) {
      const fullPath = path.join(baseDir, fileName);
      console.log(`   🔎 Test : ${fileName}`);
      
      if (fs.existsSync(fullPath)) {
        console.log(`   ✅ Trouvé : ${fileName}`);
        return fullPath;
      }
    }

    // ✅ BONUS : Lister les fichiers disponibles pour debug
    try {
      const availableFiles = fs.readdirSync(baseDir);
      console.log(`📋 [EncounterMap] Fichiers disponibles dans ${baseDir}:`);
      availableFiles.forEach(file => console.log(`   📄 ${file}`));
    } catch (error) {
      console.log(`❌ [EncounterMap] Impossible de lire ${baseDir}`);
    }

    return null;
  }

  private loadMapData(mapPath: string) {
    console.log(`🗺️ [EncounterMap] === CHARGEMENT MAP ===`);
    console.log(`📥 Input: "${mapPath}"`);

    // ✅ UTILISER LA NOUVELLE RÉSOLUTION
    const resolvedPath = this.findExistingMapFile(mapPath);
    
    if (!resolvedPath) {
      console.error(`❌ [EncounterMap] Aucun fichier map trouvé pour "${mapPath}"`);
      throw new Error(`EncounterMapManager: Aucun fichier map trouvé pour "${mapPath}"`);
    }

    console.log(`✅ [EncounterMap] Fichier résolu : ${resolvedPath}`);

    // ✅ CHARGER AVEC GESTION D'ERREUR AMÉLIORÉE
    try {
      const fileContent = fs.readFileSync(resolvedPath, "utf-8");
      this.mapData = JSON.parse(fileContent);
      
      // Validation basique
      if (!this.mapData.tilewidth || !this.mapData.tileheight) {
        throw new Error("Fichier map invalide : propriétés tilewidth/tileheight manquantes");
      }
      
      this.tileWidth = this.mapData.tilewidth;
      this.tileHeight = this.mapData.tileheight;

      // Charger les différents types de tiles
      this.loadGrassTiles();
      this.loadWaterTiles();
      this.loadEncounterZones();

      console.log(`✅ [EncounterMap] Map chargée avec succès :`);
      console.log(`   📏 Taille tiles: ${this.tileWidth}x${this.tileHeight}`);
      console.log(`   🗺️ Taille map: ${this.mapData.width}x${this.mapData.height}`);
      console.log(`   🌿 Grass tiles: ${this.grassTiles.size}`);
      console.log(`   🌊 Water tiles: ${this.waterTiles.size}`);
      console.log(`   📍 Encounter zones: ${this.encounterZones.size}`);
      
    } catch (parseError) {
      console.error(`❌ [EncounterMap] Erreur lecture/parsing :`, parseError);
      throw new Error(`Erreur chargement map "${mapPath}": ${parseError}`);
    }
  }

  // ✅ MÉTHODE STATIQUE : Ajouter une correspondance scene->map
  public static addSceneMapping(sceneName: string, mapFileName: string): void {
    EncounterMapManager.sceneToMapMapping[sceneName] = mapFileName;
    console.log(`➕ [EncounterMap] Mapping ajouté : ${sceneName} -> ${mapFileName}`);
  }

  // ✅ MÉTHODE STATIQUE : Voir toutes les correspondances
  public static getSceneMappings(): Record<string, string> {
    return { ...EncounterMapManager.sceneToMapMapping };
  }

  // ✅ TOUTES LES MÉTHODES EXISTANTES RESTENT IDENTIQUES
  private loadGrassTiles() {
    if (!this.mapData?.tilesets) {
      console.warn(`⚠️ [EncounterMap] Pas de tilesets dans la map`);
      return;
    }

    for (const tileset of this.mapData.tilesets) {
      if (!tileset.tiles) continue;
      
      for (const tile of tileset.tiles) {
        if (tile.properties) {
          const grassProp = tile.properties.find((p: any) => p.name === 'grassTile');
          if (grassProp && grassProp.value === true) {
            const globalTileId = tileset.firstgid + tile.id;
            this.grassTiles.add(globalTileId);
          }
        }
      }
    }
  }

  private loadWaterTiles() {
    if (!this.mapData?.tilesets) {
      console.warn(`⚠️ [EncounterMap] Pas de tilesets dans la map`);
      return;
    }

    for (const tileset of this.mapData.tilesets) {
      if (!tileset.tiles) continue;
      
      for (const tile of tileset.tiles) {
        if (tile.properties) {
          const waterProp = tile.properties.find((p: any) => p.name === 'waterTile');
          if (waterProp && waterProp.value === true) {
            const globalTileId = tileset.firstgid + tile.id;
            this.waterTiles.add(globalTileId);
          }
        }
      }
    }
  }

  private loadEncounterZones() {
    if (!this.mapData?.layers) {
      console.warn(`⚠️ [EncounterMap] Pas de layers dans la map`);
      return;
    }

    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        for (const obj of layer.objects) {
          let zoneIdProp = null;
          if (obj.properties) {
            zoneIdProp = obj.properties.find((p: any) =>
              p.name === 'zoneId' || p.name === 'zoneid' || p.name === 'zoneID'
            );
          }

          const isEncounterZone = (
            obj.name === 'encounterzone' || obj.name === 'encouterzone' ||
            obj.type === 'encounterzone' || obj.type === 'encouterzone'
          );

          if (isEncounterZone && zoneIdProp && zoneIdProp.value) {
            const zone: EncounterZone = {
              id: obj.id.toString(),
              zoneId: zoneIdProp.value,
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
            };

            this.encounterZones.set(obj.id.toString(), zone);
            console.log(`📍 [EncounterMap] Zone chargée: ${zoneIdProp.value} à (${obj.x}, ${obj.y})`);
          }
        }
      }
    }
  }

  public isPositionOnGrass(x: number, y: number): boolean {
    if (!this.mapData) return false;
    
    const tileX = Math.floor(x / this.tileWidth);
    const tileY = Math.floor(y / this.tileHeight);

    const belowPlayer2Layer = this.mapData.layers.find((layer: any) =>
      layer.name === 'BelowPlayer2' && layer.type === 'tilelayer'
    );

    if (!belowPlayer2Layer || !belowPlayer2Layer.data) return false;

    const index = tileY * (belowPlayer2Layer.width || this.mapData.width) + tileX;
    if (index < 0 || index >= belowPlayer2Layer.data.length) return false;

    const tileId = belowPlayer2Layer.data[index];
    return this.grassTiles.has(tileId);
  }

  public isPositionOnWater(x: number, y: number): boolean {
    if (!this.mapData) return false;
    
    const tileX = Math.floor(x / this.tileWidth);
    const tileY = Math.floor(y / this.tileHeight);

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

  public getEncounterZoneAt(x: number, y: number): string | null {
    for (const [id, zone] of this.encounterZones.entries()) {
      const inside = (
        x >= zone.bounds.left &&
        x <= zone.bounds.right &&
        y >= zone.bounds.top &&
        y <= zone.bounds.bottom
      );
      
      if (inside) {
        return zone.zoneId;
      }
    }
    return null;
  }

  public getTerrainInfo(x: number, y: number): {
    isOnGrass: boolean;
    isOnWater: boolean;
    encounterZone: string | null;
    method: 'grass' | 'fishing' | null;
    canEncounter: boolean;
  } {
    const isOnGrass = this.isPositionOnGrass(x, y);
    const isOnWater = this.isPositionOnWater(x, y);
    const encounterZone = this.getEncounterZoneAt(x, y);
    
    let method: 'grass' | 'fishing' | null = null;
    if (isOnWater && encounterZone) {
      method = 'fishing';
    } else if (isOnGrass && encounterZone) {
      method = 'grass';
    }

    const canEncounter = method !== null;

    return {
      isOnGrass,
      isOnWater,
      encounterZone,
      method,
      canEncounter
    };
  }

  public validateClientTerrain(
    x: number, 
    y: number, 
    clientTerrainType?: string
  ): {
    valid: boolean;
    serverTerrain: any;
    clientTerrain: string | undefined;
    mismatch: boolean;
  } {
    const serverTerrain = this.getTerrainInfo(x, y);
    
    let expectedClientTerrain = 'normal';
    if (serverTerrain.isOnGrass) expectedClientTerrain = 'grass';
    else if (serverTerrain.isOnWater) expectedClientTerrain = 'water';

    const mismatch = clientTerrainType !== undefined && clientTerrainType !== expectedClientTerrain;
    
    if (mismatch) {
      console.warn(`🚫 [EncounterMap] Terrain mismatch à (${x}, ${y}):`);
      console.warn(`   Serveur: ${expectedClientTerrain}`);
      console.warn(`   Client: ${clientTerrainType}`);
    }

    return {
      valid: !mismatch,
      serverTerrain,
      clientTerrain: clientTerrainType,
      mismatch
    };
  }

  public debugPosition(x: number, y: number): void {
    const terrain = this.getTerrainInfo(x, y);
    console.log(`🔍 [EncounterMap] Debug position (${x}, ${y}):`);
    console.log(`   🌿 Sur herbe: ${terrain.isOnGrass}`);
    console.log(`   🌊 Sur eau: ${terrain.isOnWater}`);
    console.log(`   📍 Zone encounter: ${terrain.encounterZone || 'aucune'}`);
    console.log(`   🎣 Méthode: ${terrain.method || 'aucune'}`);
    console.log(`   ✅ Peut encounter: ${terrain.canEncounter}`);
  }

  public getStats(): {
    grassTilesCount: number;
    waterTilesCount: number;
    encounterZonesCount: number;
    mapSize: { width: number; height: number };
    tileSize: { width: number; height: number };
  } {
    return {
      grassTilesCount: this.grassTiles.size,
      waterTilesCount: this.waterTiles.size,
      encounterZonesCount: this.encounterZones.size,
      mapSize: {
        width: this.mapData?.width * this.tileWidth || 0,
        height: this.mapData?.height * this.tileHeight || 0
      },
      tileSize: {
        width: this.tileWidth,
        height: this.tileHeight
      }
    };
  }
}
