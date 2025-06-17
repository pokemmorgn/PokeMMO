import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class VillageLabRoom extends Room<PokeWorldState> {
  maxClients = 50;

  onCreate(options: any): void {
    this.setState(new PokeWorldState());

    this.clock.setInterval(() => {
      this.saveAllPlayers();
      console.log(`[${new Date().toISOString()}] Sauvegarde automatique de tous les joueurs (VillageLab)`);
    }, 30000);

    this.onMessage("move", (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });

    this.onMessage("changeZone", async (client: Client, data: { targetZone: string; direction: string }) => {
      console.log(`[VillageLabRoom] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      let spawnX = 300, spawnY = 200;

      switch (data.targetZone) {
        case 'VillageScene': spawnX = 400; spawnY = 300; break;
        case 'ProfessorOffice': spawnX = 150; spawnY = 100; break;
        case 'LabStorage': spawnX = 200; spawnY = 250; break;
      }

      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[VillageLabRoom] Joueur ${client.sessionId} supprimé pour transition`);

        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: spawnX, lastY: spawnY, lastMap: data.targetZone } }
        );
        console.log(`[VillageLabRoom] Sauvegarde position et map (${spawnX}, ${spawnY}) dans ${data.targetZone} pour ${player.name}`);
      }

      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: "VillageLabScene",
        direction: data.direction,
        spawnX,
        spawnY,
      });

      console.log(`[VillageLabRoom] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
    });

    this.onMessage("interactWithProfessor", (client: Client) => {
      console.log(`[VillageLabRoom] ${client.sessionId} interagit avec le professeur`);
      client.send("professorDialog", {
        message: "Bonjour ! Bienvenue dans mon laboratoire !",
        options: ["Recevoir un Pokémon", "Informations", "Fermer"],
      });
    });

    this.onMessage("selectStarter", async (client: Client, data: { pokemon: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        console.log(`[VillageLabRoom] ${player.name} sélectionne ${data.pokemon} comme starter`);
        client.send("starterReceived", {
          pokemon: data.pokemon,
          message: `Félicitations ! Vous avez reçu ${data.pokemon} !`,
        });
      }
    });

    console.log("[VillageLabRoom] Room créée :", this.roomId);
  }

  async saveAllPlayers(): Promise<void> {
    try {
      for (const [_, player] of this.state.players.entries()) {
        await PlayerData.updateOne(
          { username: player.name },
          { $set: { lastX: player.x, lastY: player.y, lastMap: "VillageLabScene" } }
        );
      }
      console.log(`[VillageLabRoom] Sauvegarde automatique : ${this.state.players.size} joueurs`);
    } catch (error) {
      console.error("[VillageLabRoom] Erreur sauvegarde automatique:", error);
    }
  }

  async onJoin(client: Client, options: any): Promise<void> {
    const username = options.username || "Anonymous";

    const existingPlayer = Array.from(this.state.players.values() as Iterable<Player>)
      .find(p => p.name === username);

    if (existingPlayer) {
      const oldSessionId = Array.from(this.state.players.entries() as Iterable<[string, Player]>)
        .find(([_, p]) => p.name === username)?.[0];

      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[VillageLabRoom] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }

    let playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      playerData = await PlayerData.create({
        username,
        lastX: 300,
        lastY: 200,
        lastMap: "VillageLabScene"
      });
    }

    const player = new Player();
    player.name = username;

    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[VillageLabRoom] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[VillageLabRoom] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
    }

    player.map = "VillageLabScene";
    this.state.players.set(client.sessionId, player);
    console.log(`[VillageLabRoom] ${username} est entré dans le laboratoire avec sessionId: ${client.sessionId}`);

    client.send("welcomeToLab", {
      message: "Bienvenue dans le laboratoire du Professeur !",
      canReceiveStarter: true
    });
  }

  async onLeave(client: Client): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await PlayerData.updateOne(
        { username: player.name },
        { $set: { lastX: player.x, lastY: player.y, lastMap: "VillageLabScene" } }
      );
      console.log(`[VillageLabRoom] ${player.name} a quitté le laboratoire (sauvé à ${player.x}, ${player.y} sur VillageLabScene)`);
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose(): void {
    console.log("[VillageLabRoom] Room fermée :", this.roomId);
    this.saveAllPlayers();
  }
}
