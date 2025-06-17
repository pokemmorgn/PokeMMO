// Test simple AuthRoom
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";

export class AuthState extends Schema {
  @type("string") status = "ready";
}

export class AuthRoom extends Room<AuthState> {
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new AuthState());
    console.log('🔐 TEST AuthRoom créée:', this.roomId);
  }

  async onJoin(client: Client, options: any) {
    console.log(`🔐 TEST Connexion: ${client.sessionId}`);
    client.send("connectionEstablished", {
      sessionId: client.sessionId,
      timestamp: Date.now()
    });
  }

  async onLeave(client: Client) {
    console.log(`🔐 TEST Déconnexion: ${client.sessionId}`);
  }
}
