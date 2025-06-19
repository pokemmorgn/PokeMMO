// ==========================================
// TransitionController.ts - Contrôleur de transition pour BaseRoom
// ==========================================

import { Room, Client } from "@colyseus/core";
import { MapManager } from '../managers/MapManager';

export class TransitionController {
    private mapManager: MapManager;
    private room: Room;

    constructor(room: Room, mapsDirectory: string = './assets/maps') {
        this.room = room;
        this.mapManager = new MapManager(mapsDirectory);
    }

    /**
     * Vérifie et exécute une téléportation automatique lors du mouvement
     */
    public checkAutoTeleport(client: Client, player: any): boolean {
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            player.x,
            player.y
        );

        if (teleportResult && teleportResult.success) {
            this.executeTeleport(client, player, teleportResult);
            return true;
        }

        return false;
    }

    /**
     * Gère les transitions manuelles (message "changeZone")
     */
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
            this.executeTeleport(client, player, teleportResult);
        } else {
            client.send("teleport_failed", { 
                reason: "Aucun téléport à cette position" 
            });
        }
    }

    /**
     * Exécute la téléportation
     */
    private executeTeleport(client: Client, player: any, teleportResult: any): void {
        // Mettre à jour la position du joueur
        player.x = teleportResult.targetX;
        player.y = teleportResult.targetY;
        player.map = teleportResult.targetMap;
        player.isMoving = false;
        (player as any).justSpawned = true; // Pour éviter l'anticheat au spawn

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

        console.log(`✅ ${player.name} téléporté vers ${teleportResult.targetMap}`);
    }

    /**
     * Obtient un point de spawn spécifique
     */
    public getSpawnPoint(mapName: string, spawnName?: string): { x: number; y: number } | null {
        return this.mapManager.getSpawnPoint(mapName, spawnName);
    }

    /**
     * Obtient les données d'une map
     */
    public getMapData(mapName: string): any {
        return this.mapManager.getMapData(mapName);
    }
}
