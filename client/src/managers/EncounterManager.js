// client/src/managers/ClientEncounterManager.js - VERSION CLEAN AVEC LOGS UTILES

export class ClientEncounterManager {
  constructor(mapData = null) {
    this.mapData = null;
    this.encounterZones = new Map();
    this.grassTiles = new Set();
    this.waterTiles = new Set();

    // Cooldown client (plus permissif que serveur)
    this.lastEncounterTime = 0;
    this.CLIENT_ENCOUNTER_COOLDOWN = 500;

    // Compteur de pas pour encounters
    this.stepCount = 0;
    this.STEPS_PER_ENCOUNTER_CHECK = 3;

    if (mapData) {
      this.loadMapData(mapData);
    }
  }

  // CHARGEMENT DES DONNÉES DE CARTE
  loadMapData(mapData) {
    this.mapData = mapData;
    this.loadEncounterZones();
    this.loadGrassTiles();
    this.loadWaterTiles();
  }

  // CHARGEMENT DES ZONES DE RENCONTRE (supporte les deux variantes de nom)
  loadEncounterZones() {
    if (!this.mapData) return;
    this.encounterZones.clear();

    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        for (const obj of layer.objects) {
          let zoneIdProp = null;
          if (obj.properties) {
            zoneIdProp = obj.properties.find(p =>
              p.name === 'zoneId' || p.name === 'zoneid' || p.name === 'zoneID'
            );
          }
          const isEncounterZone =
            (obj.name === 'encounterzone' || obj.name === 'encouterzone' ||
            obj.type === 'encounterzone' || obj.type === 'encouterzone');

          if (isEncounterZone && zoneIdProp && zoneIdProp.value) {
            this.encounterZones.set(obj.id.toString(), {
              id: obj.id,
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
            });
          }
        }
      }
    }
  }

  // CHARGEMENT DES TILES D'HERBE
  loadGrassTiles() {
    if (!this.mapData) return;
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
  }

  // CHARGEMENT DES TILES D'EAU
  loadWaterTiles() {
    if (!this.mapData) return;
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
  }

  // VÉRIFICATION DE RENCONTRE LORS DU MOUVEMENT
  checkEncounterOnMove(x, y) {
    // Cooldown client
    const now = Date.now();
    if (now - this.lastEncounterTime < this.CLIENT_ENCOUNTER_COOLDOWN) {
      console.log(`[Rencontre] Cooldown actif`);
      return { shouldTrigger: false, method: 'grass', encounterRate: 0 };
    }

    // Compter les pas
    this.stepCount++;
    if (this.stepCount < this.STEPS_PER_ENCOUNTER_CHECK) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0 };
    }
    this.stepCount = 0;

    // Vérifier si on est sur une herbe ou sur l'eau
    const isOnGrass = this.isPositionOnGrass(x, y);
    const isOnWater = this.isPositionOnWater(x, y);

    if (!isOnGrass && !isOnWater) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0 };
    }

    // Trouver la zone de rencontre
    const zoneId = this.getEncounterZoneAt(x, y);
    if (!zoneId) {
      return { shouldTrigger: false, method: 'grass', encounterRate: 0 };
    }

    // Déterminer le type de rencontre et le taux
    const method = isOnWater ? 'fishing' : 'grass';
    const encounterRate = this.calculateEncounterRate(method, zoneId);

    // LOG principal
    console.log(`[Rencontre] Possible ! zone=${zoneId} type=${method} taux=${(encounterRate*100).toFixed(1)}%`);

    // Mettre à jour le cooldown
    this.lastEncounterTime = now;

    // ENVOI AU SERVEUR À FAIRE ICI
    // (à mettre là où tu gères le network, typiquement)
    // gameRoom.send("checkEncounter", { zone, method, x, y, zoneId });

    return {
      shouldTrigger: true,
      zoneId: zoneId,
      method: method,
      encounterRate: encounterRate
    };
  }

  // VÉRIFIER SI POSITION SUR HERBE
  isPositionOnGrass(x, y) {
    if (!this.mapData) return false;
    const tileX = Math.floor(x / this.mapData.tilewidth);
    const tileY = Math.floor(y / this.mapData.tileheight);

    const belowPlayer2Layer = this.mapData.layers.find(layer =>
      layer.name === 'BelowPlayer2' && layer.type === 'tilelayer'
    );

    if (!belowPlayer2Layer || !belowPlayer2Layer.data) return false;
    const index = tileY * (belowPlayer2Layer.width || this.mapData.width) + tileX;
    if (index < 0 || index >= belowPlayer2Layer.data.length) return false;
    const tileId = belowPlayer2Layer.data[index];
    return this.grassTiles.has(tileId);
  }

  // VÉRIFIER SI POSITION SUR EAU
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

  // TROUVER LA ZONE DE RENCONTRE À UNE POSITION
  getEncounterZoneAt(x, y) {
    for (const [id, zone] of this.encounterZones.entries()) {
      const inside =
        x >= zone.bounds.left &&
        x <= zone.bounds.right &&
        y >= zone.bounds.top &&
        y <= zone.bounds.bottom;
      if (inside) {
        return zone.zoneId;
      }
    }
    return null;
  }

  // CALCULER LE TAUX DE RENCONTRE
  calculateEncounterRate(method, zoneId) {
    let baseRate = 0.1; // 10% par défaut
    if (method === 'grass') {
      if (zoneId.includes('grass1')) baseRate = 0.08;
      else if (zoneId.includes('grass2')) baseRate = 0.12;
      else if (zoneId.includes('grass3')) baseRate = 0.15;
      else baseRate = 0.1;
    } else if (method === 'fishing') {
      baseRate = 0.3;
    }
    return baseRate;
  }

  // FORCER UNE VÉRIFICATION DE RENCONTRE (pour tests)
  forceEncounterCheck(x, y) {
    this.lastEncounterTime = 0;
    this.stepCount = this.STEPS_PER_ENCOUNTER_CHECK;
    return this.checkEncounterOnMove(x, y);
  }

  // OBTENIR INFO SUR POSITION ACTUELLE
  getPositionInfo(x, y) {
    const isOnGrass = this.isPositionOnGrass(x, y);
    const isOnWater = this.isPositionOnWater(x, y);
    const zoneId = this.getEncounterZoneAt(x, y);
    const canEncounter = (isOnGrass || isOnWater) && zoneId !== null;
    return {
      isOnGrass,
      isOnWater,
      zoneId,
      canEncounter
    };
  }

  // DEBUG DES ZONES CHARGÉES (utilitaire éventuel)
  debugZones() {
    console.log(`[DEBUG] Nb zones: ${this.encounterZones.size}`);
    this.encounterZones.forEach((zone, id) => {
      console.log(`Zone ${id}: ${zone.zoneId} (${zone.bounds.left},${zone.bounds.top})-(${zone.bounds.right},${zone.bounds.bottom})`);
    });
  }

  // RESET COOLDOWNS (pour tests)
  resetCooldowns() {
    this.lastEncounterTime = 0;
    this.stepCount = 0;
  }

  // OBTENIR STATS
  getStats() {
    return {
      encounterZonesCount: this.encounterZones.size,
      grassTilesCount: this.grassTiles.size,
      waterTilesCount: this.waterTiles.size,
      lastEncounterTime: this.lastEncounterTime,
      stepCount: this.stepCount
    };
  }

  // MÉTHODES POUR L'INTÉGRATION AVEC LE SYSTÈME DE COMBAT

  canTriggerEncounter(x, y) {
    const info = this.getPositionInfo(x, y);
    return info.canEncounter;
  }

  getZoneDataForServer(x, y) {
    const info = this.getPositionInfo(x, y);
    return {
      zoneId: info.zoneId,
      method: info.isOnWater ? 'fishing' : 'grass',
      canEncounter: info.canEncounter
    };
  }

  simulateSteps(count) {
    this.stepCount += count;
  }
}
