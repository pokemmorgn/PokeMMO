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
        
        console.log("[TRANSITIONCONTROLLER] Constructeur appelé, initialisation mapManager.");
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

    console.log(`[TRANSITIONCONTROLLER] [loadCurrentMap] roomName: ${roomName}, mapName: ${mapName}, mapPath: ${mapPath}`);

    // On récupère le résultat dans "loaded"
    const loaded = this.mapManager.loadMap(mapName, mapPath);

    if (loaded) {
        console.log(`[TRANSITIONCONTROLLER] [loadCurrentMap] ✅ Map "${mapName}" chargée avec succès.`);
    } else {
        console.log(`[TRANSITIONCONTROLLER] [loadCurrentMap] ❌ Map "${mapName}" introuvable (${mapPath}).`);
    }
}



    /**
     * Charge une map supplémentaire (pour les destinations)
     */
    public loadAdditionalMap(mapName: string): void {
        const mapPath = `../assets/maps/${mapName.toLowerCase()}.tmj`;
        console.log(`[TRANSITIONCONTROLLER] [loadAdditionalMap] mapName: ${mapName}, mapPath: ${mapPath}`);
        this.mapManager.loadMap(mapName, mapPath);
    }

    public checkAutoTeleport(client: Client, player: any): boolean {
        console.log(`[TRANSITIONCONTROLLER] [checkAutoTeleport] sessionId: ${client.sessionId}, player.map: ${player.map}, pos: (${player.x}, ${player.y})`);
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            player.x,
            player.y
        );

        if (teleportResult && teleportResult.success) {
            console.log(`[TRANSITIONCONTROLLER] [checkAutoTeleport] Téléport trouvé:`, teleportResult);
            // Charger la map de destination si elle n'est pas encore chargée
            this.loadAdditionalMap(teleportResult.targetMap);
            
            this.executeTeleport(client, player, teleportResult);
            return true;
        }
        console.log(`[TRANSITIONCONTROLLER] [checkAutoTeleport] Aucun téléport trouvé.`);
        return false;
    }

    public handleTransition(client: Client, data: any): void {
        const player = this.room.state.players.get(client.sessionId);
        if (!player) {
            console.log(`[TRANSITIONCONTROLLER] [handleTransition] Aucun player pour sessionId: ${client.sessionId}`);
            return;
        }

        console.log(`[TRANSITIONCONTROLLER] [handleTransition] Demande de transition pour player: ${player.name}, map: ${player.map}, pos: (${data.x || player.x}, ${data.y || player.y})`);
        const teleportResult = this.mapManager.teleportPlayer(
            client.sessionId,
            player.map,
            data.x || player.x,
            data.y || player.y
        );

        if (teleportResult && teleportResult.success) {
            console.log(`[TRANSITIONCONTROLLER] [handleTransition] Téléport validé:`, teleportResult);
            // Charger la map de destination si elle n'est pas encore chargée
            this.loadAdditionalMap(teleportResult.targetMap);
            
            this.executeTeleport(client, player, teleportResult);
        } else {
            console.log(`[TRANSITIONCONTROLLER] [handleTransition] Échec de transition pour ${player.name}`);
            client.send("teleport_failed", { 
                reason: "Aucun téléport à cette position" 
            });
        }
    }

    private executeTeleport(client: Client, player: any, teleportResult: TeleportResult): void {
        console.log(`[TRANSITIONCONTROLLER] [executeTeleport] Téléportation de ${player.name} vers ${teleportResult.targetMap} (${teleportResult.targetX}, ${teleportResult.targetY})`);
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

        console.log(`[TRANSITIONCONTROLLER] ✅ ${player.name} téléporté vers ${teleportResult.targetMap} [${teleportResult.targetX}, ${teleportResult.targetY}]`);
    }

    public getSpawnPoint(mapName: string, spawnName?: string): { x: number; y: number } | null {
        console.log(`[TRANSITIONCONTROLLER] [getSpawnPoint] mapName: ${mapName}, spawnName: ${spawnName}`);
        // Charger la map si elle n'est pas encore chargée
        this.loadAdditionalMap(mapName);
        const spawn = this.mapManager.getSpawnPoint(mapName, spawnName);
        console.log(`[TRANSITIONCONTROLLER] [getSpawnPoint] Résultat:`, spawn);
        return spawn;
    }

    public getMapData(mapName: string): TiledMap | undefined {
        console.log(`[TRANSITIONCONTROLLER] [getMapData] mapName: ${mapName}`);
        return this.mapManager.getMapData(mapName);
    }
}
