import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class PokeWorldRoom extends Room<PokeWorldState> {
  maxClients = 10;

  onCreate(options: any) {
    this.setState(new PokeWorldState());

    this.onMessage("move", async (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = Math.max(16, Math.min(584, data.x));
        player.y = Math.max(16, Math.min(584, data.y));

        if (player.name) {
          try {
            await PlayerData.updateOne(
              { username: player.name },
              { $set: { lastX: player.x, lastY: player.y } }
            );
          } catch (err) {
            console.error(`❌ Erreur lors de la mise à jour de la position de ${player.name}`, err);
          }
        }
      }
    });

    console.log("🌍 PokeWorld room created:", this.roomId);
  }

  async onJoin(client: Client, options: any) {
    const { username } = options;

    if (!username) {
      console.warn("❌ Aucun nom d'utilisateur fourni");
      client.leave();
      return;
    }

    let data;

    try {
      data = await PlayerData.findOne({ username });

      if (!data) {
        data = await PlayerData.create({
          username,
          gold: 0,
          pokemons: [],
          lastX: 300,
          lastY: 300
        });
        console.log(`🆕 Nouveau joueur : ${username}`);
      } else {
        console.log(`✅ Joueur existant : ${username}`);
      }
    } catch (err) {
      console.error(`❌ Erreur MongoDB lors du chargement du joueur "${username}"`, err);
      client.leave();
      return;
    }

    const player = new Player();
    player.name = data.username;
    player.x = data.lastX ?? 300;
    player.y = data.lastY ?? 300;

    this.state.players.set(client.sessionId, player);
    console.log(`✨ ${player.name} connecté à (${player.x}, ${player.y})`);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 ${player.name} a quitté la partie`);
      try {
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: player.x, lastY: player.y } }
        );
      } catch (err) {
        console.error(`❌ Erreur lors de la sauvegarde de la position à la sortie de ${player.name}`, err);
      }
    }

    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    console.log("🗑️ PokeWorld room supprimée :", this.roomId);
  }
}
