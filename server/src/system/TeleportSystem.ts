// ==========================================
// TeleportSystem.ts - Système de téléportation pour Room
// ==========================================

import { Room, Client } from 'colyseus';
import { MapManager } from '../managers/MapManager';
import { TeleportResult, TiledMap } from '../types/MapTypes';

export class TeleportSystem {
    private mapManager: MapManager;

constructor(mapsDirectory: string = './build/assets/maps') {
        this.mapManager = new MapManager(mapsDirectory);
    }

    /**
     * Vérifie et exécute une téléportation automatique
     */
    public checkAutoTeleport(room: Room, client: Client, player: any): boolean {
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            player.x,
            player.y
        );

        if (teleportResult && teleportResult.success) {
            this.executeTeleport(room, client, player, teleportResult);
            return true;
        }

        return false;
    }

    /**
     * Tente une téléportation manuelle
     */
    public attemptTeleport(room: Room, client: Client, player: any, x: number, y: number): boolean {
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            x,
            y
        );

        if (teleportResult && teleportResult.success) {
            this.executeTeleport(room, client, player, teleportResult);
            return true;
        } else {
            client.send("teleport_failed", { 
                reason: "Aucun téléport à cette position" 
            });
            return false;
        }
    }

    /**
     * Exécute la téléportation
     */
    private executeTeleport(room: Room, client: Client, player: any, teleportResult: TeleportResult): void {
        // Mettre à jour la position du joueur
        player.x = teleportResult.targetX;
        player.y = teleportResult.targetY;
        player.map = teleportResult.targetMap;
        player.isMoving = false;

        // Envoyer les données de la nouvelle map
        const newMapData = this.mapManager.getMapData(teleportResult.targetMap);
        
        // Envoyer la confirmation au client
        client.send("teleport_success", {
            targetMap: teleportResult.targetMap,
            targetX: teleportResult.targetX,
            targetY: teleportResult.targetY,
            spawnPoint: teleportResult.spawnPoint,
            mapData: newMapData
        });

        console.log(`✅ Joueur ${client.sessionId} téléporté vers ${teleportResult.targetMap}`);
    }

    /**
     * Obtient un point de spawn spécifique
     */
    public getSpawnPoint(mapName: string, spawnName?: string): { x: number; y: number } | null {
        if (spawnName) {
            const spawnKey = `${mapName}_${spawnName}`;
            const spawn = this.mapManager['spawns'].get(spawnKey);
            if (spawn) {
                return { x: spawn.x, y: spawn.y };
            }
        }
        return null;
    }

    /**
     * Obtient les données d'une map
     */
    public getMapData(mapName: string): TiledMap | undefined {
        return this.mapManager.getMapData(mapName);
    }

    /**
     * Liste toutes les maps
     */
    public getAllMaps(): string[] {
        return this.mapManager.getAllMapNames();
    }
}
