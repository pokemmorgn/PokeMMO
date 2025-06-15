import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class VillageRoom extends Room<PokeWorldState> {
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    // Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      this.saveAllPlayers();
      console.log(`[${new Date().toISOString()}] Sauvegarde automatique de tous les joueurs`);
    }, 30000);

    this.onMessage("move", (client, data: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });

    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      console.log(`[VillageRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      let spawnX = 52, spawnY = 48;

      if (data.targetZone === 'BeachScene') {
        spawnX = 100;
        spawnY = 100;
      } else if (data.targetZone === 'Road1Scene') {
        spawnX = 342;
        spawnY = 618;
      }

      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[VillageRoom] Joueur ${client.sessionId} supprimé pour transition`);

        // Sauvegarde position + map cible dans la DB
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnX, lastY: spawnY, lastMap: data.targetZone } }
        );
        console.log(`[VillageRoom] Sauvegarde position et map (${spawnX}, ${spawnY}) dans ${data.targetZone} pour ${player.name}`);
      }

      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: "VillageScene",
        direction: data.direction,
        spawnX: spawnX,
        spawnY: spawnY
      });

      console.log(`[VillageRoom] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
    });

    console.log("[VillageRoom] Room créée :", this.roomId);
  }

  async saveAllPlayers() {
    try {
      for (const [sessionId, player] of this.state.players) {
        await PlayerData.updateOne({ username: player.name }, {
          $set: { lastX: player.x, lastY: player.y, lastMap: "Village" }
        });
      }
      console.log(`[VillageRoom] Sauvegarde automatique : ${this.state.players.size} joueurs`);
    } catch (error) {
      console.error("[VillageRoom] Erreur sauvegarde automatique:", error);
    }
  }

  async onJoin(client: Client, options: any) {
    const username = options.username || "Anonymous";

    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[VillageRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }

    let playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      playerData = await PlayerData.create({ username, lastX: 200, lastY: 150, lastMap: "Village" });
    }

    const player = new Player();
    player.name = username;

    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[VillageRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[VillageRoom] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
    }

    player.map = "Village";
    this.state.players.set(client.sessionId, player);
    console.log(`[VillageRoom] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

async onLeave(client: Client) {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    await PlayerData.updateOne({ username: player.name }, {
      $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
    });
    console.log(`[VillageRoom] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
    this.state.players.delete(client.sessionId);
  }
}
} // <-- fermeture de la classe VillageRoom
