// ==========================================
// managers/MapManager.ts - Import des types
// ==========================================

import * as fs from 'fs';
import * as path from 'path';
import { 
    TiledMap, 
    TiledLayer, 
    TiledObject, 
    TiledProperty, 
    Teleport, 
    Spawn, 
    TeleportResult 
} from '../types/MapTypes';

export class MapManager {
    private mapsDirectory: string;
    private maps: Map<string, TiledMap>;
    private teleports: Map<string, Teleport>;
    private spawns: Map<string, Spawn>;

    constructor(mapsDirectory: string = './maps') {
        this.mapsDirectory = mapsDirectory;
        this.maps = new Map<string, TiledMap>();
        this.teleports = new Map<string, Teleport>();
        this.spawns = new Map<string, Spawn>();
        
        this.loadAllMaps();
        this.buildTeleportNetwork();
    }

    private loadAllMaps(): void {
        try {
            const mapFiles = fs.readdirSync(this.mapsDirectory)
                .filter((file: string) => file.endsWith('.json'));

            for (const mapFile of mapFiles) {
                const mapPath = path.join(this.mapsDirectory, mapFile);
                const mapData: TiledMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
                const mapName = path.basename(mapFile, '.json');
                
                this.maps.set(mapName, mapData);
                this.extractTeleportsAndSpawns(mapName, mapData);
            }

            console.log(`✅ Chargé ${this.maps.size} maps avec ${this.teleports.size} téléports et ${this.spawns.size} spawns`);
        } catch (error) {
            console.error('❌ Erreur lors du chargement des maps:', error);
        }
    }

    private extractTeleportsAndSpawns(mapName: string, mapData: TiledMap): void {
        for (const layer of mapData.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                for (const obj of layer.objects) {
                    const properties = this.parseProperties(obj.properties || []);
                    
                    if (obj.name === 'teleport' && properties.targetSpawn && properties.targetZone) {
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
                    }
                    
                    if (obj.name === 'spawn' && properties.targetSpawn && properties.targetZone) {
                        const spawnKey = `${properties.targetZone}_${properties.targetSpawn}`;
                        this.spawns.set(spawnKey, {
                            mapName: properties.targetZone as string,
                            x: obj.x,
                            y: obj.y,
                            targetSpawn: properties.targetSpawn as string,
                            targetZone: properties.targetZone as string
                        });
                    }
                }
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
        for (const [teleportKey, teleport] of this.teleports) {
            if (teleport.mapName === mapName) {
                if (playerX >= teleport.x && 
                    playerX < teleport.x + teleport.width &&
                    playerY >= teleport.y && 
                    playerY < teleport.y + teleport.height) {
                    return teleport;
                }
            }
        }
        return null;
    }

    public getTeleportDestination(teleport: Teleport): { mapName: string; x: number; y: number; spawnPoint: string } | null {
        const spawnKey = `${teleport.targetZone}_${teleport.targetSpawn}`;
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
        const teleport = this.checkTeleportCollision(fromMap, playerX, playerY);
        
        if (!teleport) {
            return null;
        }

        const destination = this.getTeleportDestination(teleport);
        
        if (!destination) {
            return null;
        }

        console.log(`🌀 Téléportation: ${playerId} de ${fromMap} vers ${destination.mapName}`);
        
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
