// src/server/controllers/TransitionController.ts

import { Client } from "@colyseus/core";
import { PlayerData } from "../models/PlayerData";
import { BaseRoom } from "../rooms/BaseRoom";
import { PokeWorldState, Player } from "../schema/PokeWorldState";

type TransitionData = { targetZone: string; direction: string };

export class TransitionController {
  room: BaseRoom;

  constructor(room: BaseRoom) {
    this.room = room;
  }

  async handleTransition(client: Client, data: TransitionData) {
    const player = this.room.state.players.get(client.sessionId) as Player | undefined;

    if (!player || (player as any).isTransitioning) {
      console.warn(`[TransitionController] Transition ignorée : déjà en cours pour ${player?.name}`);
      return;
    }

    (player as any).isTransitioning = true;

    const spawnPosition = this.room.calculateSpawnPosition(data.targetZone);

    console.log(`[TransitionController] Transition ${player.name} (${this.room.mapName}) -> ${data.targetZone} (${spawnPosition.x},${spawnPosition.y})`);

    // Désactive anticheat, TP le joueur, sauvegarde, etc.
    this.room.movementController.handleMove(
      client.sessionId,
      player,
      { x: spawnPosition.x, y: spawnPosition.y, direction: player.direction, isMoving: false },
      true // skipAnticheat
    );
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.isMoving = false;

    // On enlève le joueur (il sera réinstancié à l'arrivée)
    this.room.state.players.delete(client.sessionId);
    this.room.movementController?.resetPlayer?.(client.sessionId);

    await PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
    );

    client.send("zoneChanged", {
      targetZone: data.targetZone,
      fromZone: this.room.mapName.replace('Room', 'Scene'),
      direction: data.direction,
      spawnX: spawnPosition.x,
      spawnY: spawnPosition.y
    });

    // Le flag sera reset à la prochaine connexion
    console.log(`[TransitionController] Transition terminée pour ${player.name}`);
  }
}

export default TransitionController;
