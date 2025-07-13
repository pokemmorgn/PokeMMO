// server/src/managers/EncounterMapManager.ts
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

  constructor(mapPath: string) {
    this.loadMapData(mapPath);
  }

  private loadMapData(mapPath: string) {
    const fileName = mapPath.endsWith('.tmj') ? mapPath : mapPath.replace(/\.[^.]+$/, '') + '.tmj';
    const resolvedPath = path.resolve(__dirname, "../../build/assets/maps", fileName);

    console.log(`🗺️ [EncounterMap] Chargement map : ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`EncounterMapManager: Le fichier map n'existe pas : ${resolvedPath}`);
    }

    this.mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    this.tileWidth = this.mapData.tilewidth;
    this.tileHeight = this.mapData.tileheight;

    // Charger les différents types de tiles
    this.loadGrassTiles();
    this.loadWaterTiles();
    this.loadEncounterZones();

    console.log(`✅ [EncounterMap] Map chargée :`);
    console.log(`   🌿 Grass tiles: ${this.grassTiles.size}`);
    console.log(`   🌊 Water tiles: ${this.waterTiles.size}`);
    console.log(`   📍 Encounter zones: ${this.encounterZones.size}`);
  }

  // ✅ CHARGEMENT DES TILES D'HERBE (même logique que client)
  private loadGrassTiles() {
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

  // ✅ CHARGEMENT DES TILES D'EAU (même logique que client)
  private loadWaterTiles() {
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

  // ✅ CHARGEMENT DES ZONES D'ENCOUNTER (même logique que client)
  private loadEncounterZones() {
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

  // ✅ VÉRIFIER SI POSITION SUR HERBE (même logique que client)
  public isPositionOnGrass(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.tileWidth);
    const tileY = Math.floor(y / this.tileHeight);

    // Chercher le layer BelowPlayer2 (comme côté client)
    const belowPlayer2Layer = this.mapData.layers.find((layer: any) =>
      layer.name === 'BelowPlayer2' && layer.type === 'tilelayer'
    );

    if (!belowPlayer2Layer || !belowPlayer2Layer.data) return false;

    const index = tileY * (belowPlayer2Layer.width || this.mapData.width) + tileX;
    if (index < 0 || index >= belowPlayer2Layer.data.length) return false;

    const tileId = belowPlayer2Layer.data[index];
    return this.grassTiles.has(tileId);
  }

  // ✅ VÉRIFIER SI POSITION SUR EAU (même logique que client)
  public isPositionOnWater(x: number, y: number): boolean {
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

  // ✅ TROUVER LA ZONE D'ENCOUNTER À UNE POSITION (même logique que client)
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

  // ✅ DÉTERMINER LE TYPE DE TERRAIN ET MÉTHODE D'ENCOUNTER
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

  // ✅ VALIDATION SÉCURISÉE : Comparer avec info client
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

  // ✅ DEBUG ET STATS
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
        width: this.mapData.width * this.tileWidth,
        height: this.mapData.height * this.tileHeight
      },
      tileSize: {
        width: this.tileWidth,
        height: this.tileHeight
      }
    };
  }
}
