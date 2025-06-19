// ==========================================
// MapManager.ts - Gestionnaire des maps et transitions
// ==========================================

import * as fs from 'fs';
import * as path from 'path';

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

    /**
     * Charge toutes les maps depuis le répertoire
     */
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

    /**
     * Extrait les téléports et spawns d'une map Tiled
     */
    private extractTeleportsAndSpawns(mapName: string, mapData: TiledMap): void {
        // Parcourir tous les layers de la map
        for (const layer of mapData.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                for (const obj of layer.objects) {
                    // Vérifier les propriétés personnalisées
                    const properties = this.parseProperties(obj.properties || []);
                    
                    // Gérer les téléports
                    if (properties.type === 'teleport' && properties.targetzone && properties.fromzone) {
                        const teleportKey = `${mapName}_${properties.fromzone}`;
                        this.teleports.set(teleportKey, {
                            mapName,
                            x: obj.x,
                            y: obj.y,
                            width: obj.width || 32,
                            height: obj.height || 32,
                            fromzone: properties.fromzone as string,
                            targetzone: properties.targetzone as string,
                            targetspawn: (properties.targetspawn as string) || (properties.fromzone as string)
                        });
                    }
                    
                    // Gérer les spawns
                    if (properties.type === 'spawn' && properties.targetspawn && properties.targetzone) {
                        const spawnKey = `${properties.targetzone}_${properties.targetspawn}`;
                        this.spawns.set(spawnKey, {
                            mapName: properties.targetzone as string,
                            x: obj.x,
                            y: obj.y,
                            targetspawn: properties.targetspawn as string,
                            targetzone: properties.targetzone as string
                        });
                    }
                }
            }
        }
    }

    /**
     * Parse les propriétés Tiled en objet JavaScript
     */
    private parseProperties(properties: TiledProperty[]): ParsedProperties {
        const parsed: ParsedProperties = {};
        for (const prop of properties) {
            parsed[prop.name] = prop.value;
        }
        return parsed;
    }

    /**
     * Construit le réseau de téléportation
     */
    private buildTeleportNetwork(): void {
        console.log('\n🔗 Réseau de téléportation:');
        for (const [teleportKey, teleport] of this.teleports) {
            const spawnKey = `${teleport.targetzone}_${teleport.targetspawn}`;
            const targetSpawn = this.spawns.get(spawnKey);
            
            if (targetSpawn) {
                console.log(`  ${teleport.mapName}(${teleport.fromzone}) → ${targetSpawn.mapName}(${targetSpawn.targetspawn})`);
            } else {
                console.warn(`  ⚠️  Spawn manquant pour: ${spawnKey}`);
            }
        }
    }

    /**
     * Vérifie si un joueur est sur un téléport
     */
    public checkTeleportCollision(mapName: string, playerX: number, playerY: number): Teleport | null {
        for (const [teleportKey, teleport] of this.teleports) {
            if (teleport.mapName === mapName) {
                // Vérification de collision simple (rectangle)
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

    /**
     * Obtient la destination d'un téléport
     */
    public getTeleportDestination(teleport: Teleport): { mapName: string; x: number; y: number; spawnPoint: string } | null {
        const spawnKey = `${teleport.targetzone}_${teleport.targetspawn}`;
        const targetSpawn = this.spawns.get(spawnKey);
        
        if (!targetSpawn) {
            console.error(`❌ Spawn de destination introuvable: ${spawnKey}`);
            return null;
        }

        return {
            mapName: targetSpawn.mapName,
            x: targetSpawn.x,
            y: targetSpawn.y,
            spawnPoint: targetSpawn.targetspawn
        };
    }

    /**
     * Effectue une téléportation
     */
    public teleportPlayer(player: { id: string; name?: string }, fromMap: string, playerX: number, playerY: number): TeleportResult | null {
        const teleport = this.checkTeleportCollision(fromMap, playerX, playerY);
        
        if (!teleport) {
            return null; // Pas de téléport à cette position
        }

        const destination = this.getTeleportDestination(teleport);
        
        if (!destination) {
            return null; // Destination invalide
        }

        console.log(`🌀 Téléportation: ${player.id} de ${fromMap} vers ${destination.mapName}`);
        
        return {
            success: true,
            targetMap: destination.mapName,
            targetX: destination.x,
            targetY: destination.y,
            spawnPoint: destination.spawnPoint
        };
    }

    /**
     * Obtient les données d'une map
     */
    public getMapData(mapName: string): TiledMap | undefined {
        return this.maps.get(mapName);
    }

    /**
     * Liste toutes les maps disponibles
     */
    public getAllMapNames(): string[] {
        return Array.from(this.maps.keys());
    }

    /**
     * Recharge toutes les maps (utile pour le dev)
     */
    public reloadMaps(): void {
        this.maps.clear();
        this.teleports.clear();
        this.spawns.clear();
        this.loadAllMaps();
        this.buildTeleportNetwork();
    }
}
