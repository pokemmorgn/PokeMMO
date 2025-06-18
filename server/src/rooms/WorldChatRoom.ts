import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";

// Optionnel: on peut garder en mémoire la liste des derniers messages
class WorldChatState extends Schema {
  @type({ map: "string" }) players = new MapSchema();
}

export class WorldChatRoom extends Room {
  maxClients = 200;

  onCreate(options) {
    this.setState(new WorldChatState());

    // Message de chat
    this.onMessage("chat", (client, data) => {
      // On récupère l'auteur (pseudo passé à la connexion)
      const username = client.auth?.username || "Anonyme";
      // Broadcast à tout le monde
      this.broadcast("chat", {
        author: username,
        message: data.message
      });
    });
  }

  onJoin(client, options) {
    // On stocke le pseudo dans la session (optionnel)
    client.auth = { username: options.username };
    this.state.players.set(client.sessionId, options.username);
    this.broadcast("chat", {
      author: "SYSTEM",
      message: `${options.username} a rejoint le chat !`
    });
  }

  onLeave(client) {
    const username = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.broadcast("chat", {
      author: "SYSTEM",
      message: `${username || "Un joueur"} a quitté le chat.`
    });
  }
}
