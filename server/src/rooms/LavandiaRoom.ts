import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class LavandiaRoom extends Room<PokeWorldState> {
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
      console.log(`[LavandiaRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // Position de spawn par défaut (au sud de Lavandia, par exemple)
      let spawnX = 350, spawnY = 750;

      // Tu ajoutes autant de cas que nécessaire selon les sorties de ta map
      switch(data.targetZone) {
        case 'Route8Scene': // Vers l’ouest
          spawnX = 40;    spawnY = 350;
          break;
        case 'Route10Scene': // Vers le nord
          spawnX = 350;   spawnY = 60;
          break;
        case 'PoketowerScene': // Vers la tour Pokémon
          spawnX = 550;   spawnY = 150;
          break;
        case 'LavandiaHouse1Scene':
          spawnX = 150;   spawnY = 670;
          break;
        default:
          console.warn(`[LavandiaRoom] Zone cible inconnue: ${data.targetZone}`);
      }

      // Supprimer le joueur de cette room (transition)
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[LavandiaRoom] Joueur ${client.sessionId} supprimé pour transition`);

        // Sauvegarder position + map cible dans la DB
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnX, lastY: spawnY, lastMap: data.targetZone } }
        );
        console.log(`[LavandiaRoom] Sauvegarde position et map (${spawnX}, ${spawnY}) dans ${data.targetZone} pour ${player.name}`);
      }

      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: "LavandiaScene",
        direction: data.direction,
        spawnX: spawnX,
        spawnY: spawnY
      });

      console.log(`[LavandiaRoom] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
    });

    console.log("[LavandiaRoom] Room créée :", this.roomId);
  }

  // Sauvegarde automatique
  async saveAllPlayers() {
    try {
      for (const [sessionId, player] of this.state.players) {
        await PlayerData.updateOne({ username: player.name }, {
          $set: { lastX: player.x, lastY: player.y, lastMap: "Lavandia" }
        });
      }
      console.log(`[LavandiaRoom] Sauvegarde automatique : ${this.state.players.size} joueurs`);
    } catch (error) {
      console.error("[LavandiaRoom] Erreur sauvegarde automatique:", error);
    }
  }

  async onJoin(client: Client, options: any) {
    const username = options.username || "Anonymous";

    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[LavandiaRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }

    let playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      playerData = await PlayerData.create({ username, lastX: 350, lastY: 750, lastMap: "Lavandia" });
    }

    const player = new Player();
    player.name = username;

    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[LavandiaRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[LavandiaRoom] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
    }

    player.map = "Lavandia";
    this.state.players.set(client.sessionId, player);
    console.log(`[LavandiaRoom] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: player.map }
      });
      console.log(`[LavandiaRoom] ${player.name} a quitté (sauvé à ${player.x}, ${player.y} sur ${player.map})`);
      this.state.players.delete(client.sessionId);
    }
  }
}