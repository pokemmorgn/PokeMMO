import { Room, Client } from "@colyseus/core";
import { PokeWorldState, Player } from "../schema/PokeWorldState";
import { PlayerData } from "../models/PlayerData";

export class Road1Room extends Room<PokeWorldState> {
  maxClients = 100;

   onCreate(options: any) {
    this.setState(new PokeWorldState());

    // ✅ AJOUT : Sauvegarde automatique toutes les 30 secondes
    this.clock.setInterval(() => {
      this.saveAllPlayers();
	        console.log(`[${new Date().toISOString()}] Sauvegarde automatique de tous les joueurs`);

    }, 30000); // 30 secondes

    this.onMessage("move", (client, data: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });

    this.onMessage("changeZone", (client, data: { targetZone: string, direction: string }) => {
      console.log(`[Road1Room] Demande changement de zone de ${client.sessionId} vers ${data.targetZone} (${data.direction})`);

      // ✅ Calculer la position de spawn dans la zone cible
      let spawnX = 342, spawnY = 618; // Position par défaut
      
      switch(data.targetZone) {
        case 'BeachScene':
          // Position d'entrée depuis la route vers la plage (côté nord)
          spawnX = 52;
          spawnY = 48;
          break;
        case 'VillageScene':
          // Position d'entrée depuis la route vers le village (côté sud)
  spawnX = 342;     // ✅ Position que vous voulez
  spawnY = 618;     // ✅ Position que vous voulez
          break;
        case 'Forest1Scene':
          // Position d'entrée depuis la route vers la forêt (côté est)
          spawnX = 100;
          spawnY = 200;
          break;
        case 'Cave1Scene':
          // Position d'entrée depuis la route vers la grotte (côté ouest)
          spawnX = 300;
          spawnY = 100;
          break;
        default:
          console.warn(`[Road1Room] Zone cible inconnue: ${data.targetZone}`);
      }

      // ✅ Supprimer immédiatement le joueur de cette room
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.players.delete(client.sessionId);
        console.log(`[Road1Room] Joueur ${client.sessionId} supprimé pour transition`);
      }

      client.send("zoneChanged", {
        targetZone: data.targetZone,
        fromZone: "Road1Scene",
        direction: data.direction,
        spawnX: spawnX,
        spawnY: spawnY
      });

      console.log(`[Road1Room] Transition envoyée: ${data.targetZone} à (${spawnX}, ${spawnY})`);
    });

    console.log("[Road1Room] Room créée :", this.roomId);
  }
 // ✅ AJOUT : Méthode de sauvegarde automatique
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
    
    // ✅ Vérifier s'il n'y a pas déjà un joueur avec ce username
    const existingPlayer = Array.from(this.state.players.values()).find(p => p.name === username);
    if (existingPlayer) {
      // Supprimer l'ancien joueur avec le même username
      const oldSessionId = Array.from(this.state.players.entries()).find(([_, p]) => p.name === username)?.[0];
      if (oldSessionId) {
        this.state.players.delete(oldSessionId);
        console.log(`[Road1Room] Ancien joueur ${username} supprimé (sessionId: ${oldSessionId})`);
      }
    }
    
    // Charge ou crée le player
    let playerData = await PlayerData.findOne({ username });
    if (!playerData) {
      playerData = await PlayerData.create({ username, lastX: 200, lastY: 150, lastMap: "Road1" });
    }
    
    const player = new Player();
    player.name = username;
    
    // ✅ Utiliser les coordonnées de spawn si fournies (transition depuis autre zone)
    if (options.spawnX !== undefined && options.spawnY !== undefined) {
      player.x = options.spawnX;
      player.y = options.spawnY;
      console.log(`[Road1Room] ${username} spawn à (${options.spawnX}, ${options.spawnY}) depuis ${options.fromZone}`);
    } else {
      // Position par défaut ou dernière position sauvée
      player.x = playerData.lastX;
      player.y = playerData.lastY;
      console.log(`[Road1Room] ${username} spawn à position sauvée (${player.x}, ${player.y})`);
    }
    
    player.map = "Road1";
    this.state.players.set(client.sessionId, player);
    console.log(`[Road1Room] ${username} est entré avec sessionId: ${client.sessionId}`);
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Sauvegarde en base
      await PlayerData.updateOne({ username: player.name }, {
        $set: { lastX: player.x, lastY: player.y, lastMap: "Road1" }
      });
      console.log(`[Road1Room] ${player.name} a quitté (sauvé à ${player.x}, ${player.y})`);
      this.state.players.delete(client.sessionId);
    }
  }
}