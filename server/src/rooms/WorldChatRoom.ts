import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { serverConfig } from "../config/serverConfig";

class WorldChatState extends Schema {
  @type({ map: "string" }) players = new MapSchema<string>();
}

export class WorldChatRoom extends Room<WorldChatState> {
  maxClients = 200;
  private lastMessageTime = new Map<string, number>(); // Cooldown par client

  broadcastOnlineCount() {
    this.broadcast("onlineCount", { count: this.state.players.size });
  }

  onCreate(options: any): void {
    this.setState(new WorldChatState());

    this.onMessage("chat", (client: Client, data: any) => {
      // Vérifier si le chat est activé
      if (!serverConfig.chatEnabled) {
        client.send("chatError", { 
          message: "Le chat est actuellement désactivé." 
        });
        return;
      }

      // Vérifier le cooldown
      const now = Date.now();
      const lastMessage = this.lastMessageTime.get(client.sessionId) || 0;
      const timeSinceLastMessage = (now - lastMessage) / 1000; // en secondes

      if (timeSinceLastMessage < serverConfig.chatCooldown) {
        const remainingCooldown = Math.ceil(serverConfig.chatCooldown - timeSinceLastMessage);
        client.send("chatError", { 
          message: `Veuillez attendre ${remainingCooldown}s avant d'envoyer un nouveau message.` 
        });
        return;
      }

      // Vérifications basiques du message
      if (!data.message || typeof data.message !== 'string') {
        client.send("chatError", { message: "Message invalide." });
        return;
      }

      const message = data.message.trim();
      if (message.length === 0) {
        client.send("chatError", { message: "Le message ne peut pas être vide." });
        return;
      }

      if (message.length > 200) {
        client.send("chatError", { message: "Le message est trop long (max 200 caractères)." });
        return;
      }

      // Enregistrer le timestamp du message
      this.lastMessageTime.set(client.sessionId, now);

      // Diffuser le message
      const username = client.auth?.username || "Anonyme";
      this.broadcast("chat", {
        author: username,
        message: message,
        timestamp: new Date().toISOString(),
        type: "normal"
      });
    });
  }

  onJoin(client: Client, options: any): void {
    client.auth = { username: options.username };
    this.state.players.set(client.sessionId, options.username);
    
    // Message de bienvenue seulement si le chat est activé
    if (serverConfig.chatEnabled) {
      this.broadcast("chat", {
        author: "SYSTEM",
        message: `${options.username} a rejoint le chat !`,
        timestamp: new Date().toISOString(),
        type: "system"
      });
    }
    
    this.broadcastOnlineCount();
  }

  onLeave(client: Client): void {
    const username = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    
    // Nettoyer le cooldown
    this.lastMessageTime.delete(client.sessionId);
    
    // Message de départ seulement si le chat est activé
    if (serverConfig.chatEnabled) {
      this.broadcast("chat", {
        author: "SYSTEM",
        message: `${username || "Un joueur"} a quitté le chat.`,
        timestamp: new Date().toISOString(),
        type: "system"
      });
    }
    
    this.broadcastOnlineCount();
  }

  onDispose(): void {
    // Nettoyer les données de cooldown
    this.lastMessageTime.clear();
  }
}
