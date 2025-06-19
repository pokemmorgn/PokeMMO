import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";

class WorldChatState extends Schema {
  @type({ map: "string" }) players = new MapSchema<string>();
}

export class WorldChatRoom extends Room<WorldChatState> {
  maxClients = 200;

  onCreate(options: any): void {
    this.setState(new WorldChatState());

    this.onMessage("chat", (client: Client, data: any) => {
      const username = client.auth?.username || "Anonyme";
      this.broadcast("chat", {
        author: username,
        message: data.message,
        timestamp: new Date().toISOString(), // <-- Ici !
        type: "normal"
      });
    });
  }

  onJoin(client: Client, options: any): void {
    client.auth = { username: options.username };
    this.state.players.set(client.sessionId, options.username);
    this.broadcast("chat", {
      author: "SYSTEM",
      message: `${options.username} a rejoint le chat !`,
      timestamp: new Date().toISOString(), // <-- Ici aussi !
      type: "system"
    });
  }

  onLeave(client: Client): void {
    const username = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.broadcast("chat", {
      author: "SYSTEM",
      message: `${username || "Un joueur"} a quitté le chat.`,
      timestamp: new Date().toISOString(), // <-- Ici aussi !
      type: "system"
    });
  }
}
