// ==========================================
// src/controllers/TransitionController.ts - Utilisation simplifiée
// ==========================================

import { Room, Client } from "@colyseus/core";
import { MapManager } from '../managers/MapManager';
import { TeleportResult, TiledMap } from '../types/MapTypes';

export class TransitionController {
    private mapManager: MapManager;
    private room: Room;

    constructor(room: Room) {
        this.room = room;
        this.mapManager = new MapManager();
        
        // Charger la map de cette room
        this.loadCurrentMap();
    }

    /**
     * Charge la map de la room actuelle
     */
    private loadCurrentMap(): void {
        const roomName = (this.room as any).mapName || 'unknown';
        const mapName = roomName.replace('Room', '').toLowerCase();
        const mapPath = `../assets/maps/${mapName}.tmj`;
        
        this.mapManager.loadMap(mapName, mapPath);
    }

    /**
     * Charge une map supplémentaire (pour les destinations)
     */
    public loadAdditionalMap(mapName: string): void {
        const mapPath = `../assets/maps/${mapName.toLowerCase()}.tmj`;
        this.mapManager.loadMap(mapName, mapPath);
    }

    public checkAutoTeleport(client: Client, player: any): boolean {
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            player.x,
            player.y
        );

        if (teleportResult && teleportResult.success) {
            // Charger la map de destination si elle n'est pas encore chargée
            this.loadAdditionalMap(teleportResult.targetMap);
            
            this.executeTeleport(client, player, teleportResult);
            return true;
        }

        return false;
    }

    public handleTransition(client: Client, data: any): void {
        const player = this.room.state.players.get(client.sessionId);
        if (!player) return;

        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            data.x || player.x,
            data.y || player.y
        );

        if (teleportResult && teleportResult.success) {
            // Charger la map de destination si elle n'est pas encore chargée
            this.loadAdditionalMap(teleportResult.targetMap);
            
            this.executeTeleport(client, player, teleportResult);
        } else {
            client.send("teleport_failed", { 
                reason: "Aucun téléport à cette position" 
            });
        }
    }

    private executeTeleport(client: Client, player: any, teleportResult: TeleportResult): void {
        player.x = teleportResult.targetX;
        player.y = teleportResult.targetY;
        player.map = teleportResult.targetMap;
        player.isMoving = false;
        (player as any).justSpawned = true;

        const newMapData = this.mapManager.getMapData(teleportResult.targetMap);
        
        client.send("teleport_success", {
            targetMap: teleportResult.targetMap,
            targetX: teleportResult.targetX,
            targetY: teleportResult.targetY,
            spawnPoint: teleportResult.spawnPoint,
            mapData: newMapData
        });

        console.log(`✅ ${player.name} téléporté vers ${teleportResult.targetMap}`);
    }

    public getSpawnPoint(mapName: string, spawnName?: string): { x: number; y: number } | null {
        // Charger la map si elle n'est pas encore chargée
        this.loadAdditionalMap(mapName);
        return this.mapManager.getSpawnPoint(mapName, spawnName);
    }

    public getMapData(mapName: string): TiledMap | undefined {
        return this.mapManager.getMapData(mapName);
    }
}
