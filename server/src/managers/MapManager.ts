// ==========================================
// src/managers/MapManager.ts - Chargement à la demande
// ==========================================

import * as fs from 'fs';
import * as path from 'path';
import { 
    TiledMap, 
    TiledProperty, 
    Teleport, 
    Spawn, 
    TeleportResult 
} from '../types/MapTypes';

export class MapManager {
    private maps: Map<string, TiledMap>;
    private teleports: Map<string, Teleport>;
    private spawns: Map<string, Spawn>;

    constructor() {
        this.maps = new Map<string, TiledMap>();
        this.teleports = new Map<string, Teleport>();
        this.spawns = new Map<string, Spawn>();
    }

    /**
     * Charge une map spécifique depuis un fichier
     */
    public loadMap(mapName: string, mapPath: string): void {
        try {
            console.log(`📍 Chargement de la map ${mapName} depuis ${mapPath}`);
            
const resolvedPath = path.resolve(__dirname, mapPath);
console.log(`[MapManager] Résolution du chemin: ${mapPath} → ${resolvedPath}`);

if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Fichier de map introuvable: ${resolvedPath}`);
    return;
}

const mapData: TiledMap = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
            this.maps.set(mapName, mapData);
            this.extractTeleportsAndSpawns(mapName, mapData);
            
            console.log(`✅ Map ${mapName} chargée avec succès`);
            
        } catch (error) {
            console.error(`❌ Erreur lors du chargement de la map ${mapName}:`, error);
        }
    }

    /**
     * Charge plusieurs maps en une fois
     */
    public loadMaps(mapConfigs: Array<{ name: string; path: string }>): void {
        for (const config of mapConfigs) {
            this.loadMap(config.name, config.path);
        }
        this.buildTeleportNetwork();
    }

private extractTeleportsAndSpawns(mapName: string, mapData: TiledMap): void {
    for (const layer of mapData.layers) {
        if (layer.type === 'objectgroup' && layer.objects) {
            for (const obj of layer.objects) {
                console.log(`[MapManager] OBJ: name=${obj.name}, type=${obj.type}, props=`, obj.properties);
                const properties = this.parseProperties(obj.properties || []);

                // Essayons de détecter automatiquement
                if (properties.targetZone && properties.targetSpawn) {
                    if (obj.name?.toLowerCase().includes('spawn')) {
                        // Spawn
                        const spawnKey = `${properties.targetZone.toLowerCase()}_${properties.targetSpawn.toLowerCase()}`;
                        this.spawns.set(spawnKey, {
                            mapName: properties.targetZone as string,
                            x: obj.x,
                            y: obj.y,
                            targetSpawn: properties.targetSpawn as string,
                            targetZone: properties.targetZone as string
                        });
                        console.log(`[MapManager] Spawn ajouté: ${spawnKey}`);
                    } else {
                        // Teleport (fallback si pas explicitement marqué spawn)
                        const teleportKey = `${mapName}_teleport_${obj.id}`;
                        this.teleports.set(teleportKey, {
                            mapName,
                            x: obj.x,
                            y: obj.y,
                            width: obj.width || 32,
                            height: obj.height || 32,
                            targetSpawn: properties.targetSpawn as string,
                            targetZone: properties.targetZone as string
                        });
                        console.log(`[MapManager] Teleport ajouté: ${teleportKey}`);
                    }
                }
            }
        }
    }
        console.log(`[MapManager] Téléports trouvés sur la map "${mapName}":`);
    for (const [teleportKey, teleport] of this.teleports) {
        if (teleport.mapName === mapName) {
            console.log(`  - ${teleportKey}:`, teleport);
        }
    }
}


    private parseProperties(properties: TiledProperty[]): { [key: string]: string | number | boolean } {
        const parsed: { [key: string]: string | number | boolean } = {};
        for (const prop of properties) {
            parsed[prop.name] = prop.value;
        }
        return parsed;
    }

    private buildTeleportNetwork(): void {
        console.log('\n🔗 Réseau de téléportation:');
        for (const [teleportKey, teleport] of this.teleports) {
            const spawnKey = `${teleport.targetZone}_${teleport.targetSpawn}`;
            const targetSpawn = this.spawns.get(spawnKey);
            
            if (targetSpawn) {
                console.log(`  ${teleport.mapName} → ${targetSpawn.mapName}(${targetSpawn.targetSpawn})`);
            } else {
                console.warn(`  ⚠️  Spawn manquant pour: ${spawnKey}`);
            }
        }
    }

 public checkTeleportCollision(mapName: string, playerX: number, playerY: number): Teleport | null {
     mapName = mapName.toLowerCase();
      console.log(`[DEBUG] checkTeleportCollision appelé pour map=${mapName} pos=(${playerX},${playerY})`);
    for (const [teleportKey, teleport] of this.teleports) {
        if (teleport.mapName === mapName) {
            const xOk = playerX >= teleport.x && playerX < teleport.x + teleport.width;
            const yOk = playerY >= teleport.y && playerY < teleport.y + teleport.height;
            const inZone = xOk && yOk;
            console.log(`[DEBUG TELEPORT] Teleport ${teleportKey} (${teleport.x},${teleport.y},${teleport.width},${teleport.height}) vs joueur (${playerX},${playerY}) => xOk:${xOk} yOk:${yOk} => inZone:${inZone}`);
            if (inZone) return teleport;
        }
    }
    return null;
}


public getTeleportDestination(teleport: Teleport): { mapName: string; x: number; y: number; spawnPoint: string } | null {
    // Normalise la casse
    const spawnKey = `${teleport.targetZone.toLowerCase()}_${teleport.targetSpawn.toLowerCase()}`;
    console.log(`[DEBUG SPAWN] Recherche du spawnKey: "${spawnKey}"`);
    console.log(`[DEBUG SPAWN] Liste des spawns chargés:`, [...this.spawns.keys()]);

    const targetSpawn = this.spawns.get(spawnKey);
    
    if (!targetSpawn) {
        console.error(`❌ Spawn de destination introuvable: ${spawnKey}`);
        return null;
    }

    return {
        mapName: targetSpawn.mapName,
        x: targetSpawn.x,
        y: targetSpawn.y,
        spawnPoint: targetSpawn.targetSpawn
    };
}


public teleportPlayer(playerId: string, fromMap: string, playerX: number, playerY: number): TeleportResult | null {
    fromMap = fromMap.toLowerCase();
    console.log(`[TELEPORT] Appel pour playerId=${playerId}, fromMap=${fromMap}, pos=(${playerX},${playerY})`);
    
    const teleport = this.checkTeleportCollision(fromMap, playerX, playerY);
    if (!teleport) {
        console.warn(`[TELEPORT] Aucun téléport trouvé à cette position.`);
        return null;
    }
    console.log(`[TELEPORT] Téléport trouvé:`, teleport);

    const destination = this.getTeleportDestination(teleport);
    if (!destination) {
        console.error(`[TELEPORT] Aucune destination trouvée pour téléport (targetZone=${teleport.targetZone}, targetSpawn=${teleport.targetSpawn})`);
        return null;
    }
    console.log(`[TELEPORT] Destination trouvée:`, destination);

    console.log(`🌀 Téléportation: ${playerId} de ${fromMap} vers ${destination.mapName} [${destination.x},${destination.y}] (spawn: ${destination.spawnPoint})`);
    
    return {
        success: true,
        targetMap: destination.mapName,
        targetX: destination.x,
        targetY: destination.y,
        spawnPoint: destination.spawnPoint
    };
}


    public getMapData(mapName: string): TiledMap | undefined {
        return this.maps.get(mapName);
    }

    public getAllMapNames(): string[] {
        return Array.from(this.maps.keys());
    }

    public getSpawnPoint(mapName: string, spawnName?: string): { x: number; y: number } | null {
        if (spawnName) {
            const spawnKey = `${mapName}_${spawnName}`;
            const spawn = this.spawns.get(spawnKey);
            if (spawn) {
                return { x: spawn.x, y: spawn.y };
            }
        }
        return null;
    }
}

export const GlobalMapManager = new MapManager();
