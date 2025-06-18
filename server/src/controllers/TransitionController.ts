// src/controllers/TransitionController.ts

import { Client } from "@colyseus/core";
import { PlayerData } from "../models/PlayerData";
import { BaseRoom } from "../rooms/BaseRoom";
import { Player } from "../schema/PokeWorldState";

type TransitionData = {
  targetZone: string;
  direction: string;
  targetSpawn?: string;
  targetX?: number;
  targetY?: number;
};

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

    // Calcule la position de spawn selon la room cible et les données reçues
    const spawnPosition = this.room.calculateSpawnPosition({
      targetZone: data.targetZone,
      targetSpawn: data.targetSpawn,
      targetX: data.targetX,
      targetY: data.targetY,
    });

    console.log(`[TransitionController] Transition ${player.name} (${this.room.mapName}) -> ${data.targetZone} (${spawnPosition.x},${spawnPosition.y})`);

    // Téléporte le joueur en désactivant les contrôles anticheat
    this.room.movementController.handleMove(
      client.sessionId,
      player,
      { x: spawnPosition.x, y: spawnPosition.y, direction: player.direction, isMoving: false },
      true // skipAnticheat
    );
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.isMoving = false;

    // Supprime le joueur de la room actuelle (il sera récréé dans la nouvelle)
    this.room.state.players.delete(client.sessionId);
    this.room.movementController?.resetPlayer?.(client.sessionId);

    // Sauvegarde la position dans la base de données
    await PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
    );

    // Envoie la confirmation au client avec la nouvelle zone et position de spawn
    client.send("zoneChanged", {
      targetZone: data.targetZone,
      fromZone: this.room.mapName.replace('Room', 'Scene'),
      direction: data.direction,
      spawnX: spawnPosition.x,
      spawnY: spawnPosition.y
    });

    console.log(`[TransitionController] Transition terminée pour ${player.name}`);
  }
}

export default TransitionController;
