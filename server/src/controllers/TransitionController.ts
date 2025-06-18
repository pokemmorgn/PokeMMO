// src/server/controllers/TransitionController.ts

export class TransitionController {
  room: any; // Typiquement BaseRoom, à typer selon ton projet

  constructor(room) {
    this.room = room;
  }

  async handleTransition(room, client, data) {
    const player = room.state.players.get(client.sessionId);

    if (!player || (player as any).isTransitioning) {
      console.warn(`[TransitionController] Transition ignorée : déjà en cours pour ${player?.name}`);
      return;
    }

    (player as any).isTransitioning = true;

    const spawnPosition = room.calculateSpawnPosition(data.targetZone);

    // Désactive anticheat, TP le joueur, sauvegarde, etc.
    room.movementController.handleMove(
      client.sessionId,
      player,
      { x: spawnPosition.x, y: spawnPosition.y, direction: player.direction, isMoving: false },
      true
    );
    player.x = spawnPosition.x;
    player.y = spawnPosition.y;
    player.isMoving = false;

    room.state.players.delete(client.sessionId);
    room.movementController?.resetPlayer?.(client.sessionId);

    await room.PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnPosition.x, lastY: spawnPosition.y, lastMap: data.targetZone } }
    );

    client.send("zoneChanged", {
      targetZone: data.targetZone,
      fromZone: room.mapName.replace('Room', 'Scene'),
      direction: data.direction,
      spawnX: spawnPosition.x,
      spawnY: spawnPosition.y
    });
    (player as any).isTransitioning = false;
  }
}

export default TransitionController;
