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
              { $set: { lastX: player.x, lastY: player.y, lastMap: player.map || "Beach" } }
            );
          } catch (err) {
            console.error(`❌ Erreur lors de la mise à jour de la position de ${player.name}`, err);
          }
        }
      }
    });

    // GESTION DE TRANSITION DE ZONE
    this.onMessage("changeZone", async (client, data: { targetZone: string, direction: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Change la zone côté serveur
        player.map = data.targetZone;

        // Position de spawn selon la direction (adapte à tes maps)
        if (data.direction === "north") {
          player.x = 100;
          player.y = 100;
        } else if (data.direction === "south") {
          player.x = 428;
          player.y = 465;
        } else {
          // Position par défaut si direction inconnue
          player.x = 52;
          player.y = 48;
        }

        // Sauvegarde côté Mongo
        try {
          await PlayerData.updateOne(
            { username: player.name },
            { $set: { lastX: player.x, lastY: player.y, lastMap: player.map } }
          );
        } catch (err) {
          console.error(`❌ Erreur lors de la sauvegarde zone: ${player.name}`, err);
        }

        // Notifie le client pour le changement de zone
        client.send("zoneChanged", {
          targetZone: data.targetZone,
          fromZone: data.fromZone || player.map,
          direction: data.direction,
        });

        console.log(`🌐 Zone changée pour ${player.name}: ${player.map} (${player.x},${player.y})`);
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
        // Premier login : nouvel utilisateur
        data = await PlayerData.create({
          username,
          gold: 0,
          pokemons: [],
          lastX: 52,
          lastY: 48,
          lastMap: "Beach"
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

    // Si lastX/Y ou lastMap sont absents, force le spawn initial
    if (
      typeof data.lastX !== "number" ||
      typeof data.lastY !== "number" ||
      !data.lastMap
    ) {
      player.x = 52;
      player.y = 48;
      player.map = "Beach";
      await PlayerData.updateOne(
        { username: player.name },
        { $set: { lastX: 52, lastY: 48, lastMap: "Beach" } }
      );
    } else {
      player.x = data.lastX;
      player.y = data.lastY;
      player.map = data.lastMap;
    }

    this.state.players.set(client.sessionId, player);
    console.log(`✨ ${player.name} connecté à (${player.x}, ${player.y}) sur ${player.map}`);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 ${player.name} a quitté la partie`);
      try {
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: player.x, lastY: player.y, lastMap: player.map || "Beach" } }
        );
      } catch (err) {
        console.error(`❌ Erreur lors de la sauvegarde de la position à la sortie de ${player.name}`, err);
      }
    }

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("🗑️ PokeWorld room supprimée :", this.roomId);
  }
}
