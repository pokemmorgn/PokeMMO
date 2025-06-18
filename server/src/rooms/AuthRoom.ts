// src/rooms/AuthRoom.ts
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { verifyPersonalMessage } from "@mysten/sui.js/verify";

// État de la room d’authentification
export class AuthState extends Schema {
  @type("string") message: string = "Authentification en cours…";
  @type("string") address: string = "";
  @type("number") connectedPlayers: number = 0;
}

export class AuthRoom extends Room<AuthState> {
  private authenticatedClients: Map<string, string> = new Map();

  onCreate(options: any) {
    this.setState(new AuthState());
    console.log("🔐 AuthRoom créée");

    this.onMessage("authenticate", async (client, payload) => {
      console.log("📨 Demande d'authentification reçue:", {
        address: payload.address,
        walletType: payload.walletType,
        timestamp: payload.timestamp,
      });

      try {
        const { address, signature, message, walletType } = payload;
        if (!address || !signature || !message) throw new Error("Données d'authentification manquantes");

        if (payload.timestamp) {
          const messageTime = parseInt(message.match(/\d+$/)?.[0] || "0");
          const currentTime = Date.now();
          const timeDiff = Math.abs(currentTime - messageTime);
          if (timeDiff > 5 * 60 * 1000) throw new Error("Signature expirée");
        }

let isValid = false;

if (
  walletType === "slush" ||
  walletType === "phantom" ||
  walletType === "suiwallet" ||
  walletType === "sui-standard" ||
  walletType === "walletconnect"
) {
  isValid = await this.verifySlushSignature(address, signature, message);
} else {
  isValid = false;
}

        if (!isValid) throw new Error("Signature invalide");

        console.log("✅ Authentification réussie pour", address);
        this.authenticatedClients.set(client.sessionId, address);
        (client as any).auth = { address, walletType };
        this.state.address = address;
        this.state.connectedPlayers = this.authenticatedClients.size;
        this.state.message = `${this.authenticatedClients.size} joueur(s) connecté(s)`;

        client.send("authenticated", {
          status: "ok",
          address,
          sessionId: client.sessionId,
        });

        this.broadcast("playerJoined", { address }, { except: client });
      } catch (error: any) {
        console.error("❌ Erreur d'authentification:", error);
        this.disconnectClient(client, error.message);
      }
    });

    this.onMessage("ping", (client) => {
      client.send("pong", { time: Date.now() });
    });
  }

  // Signature Sui universelle (Phantom récent, Slush, SuiWallet)
  async verifySlushSignature(address: string, signature: string, message: string): Promise<boolean> {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const publicKey = await verifyPersonalMessage(messageBytes, signature); // signature base64 Sui

      if (!publicKey) return false;
      const derivedAddress = publicKey.toSuiAddress?.();
      if (derivedAddress !== address) {
        console.warn("Adresse dérivée ne correspond pas à l'adresse fournie");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Erreur vérification Sui-compatible:", error);
      return false;
    }
  }

  disconnectClient(client: Client, reason: string) {
    console.log("🚫 Déconnexion client:", reason);
    client.send("error", { status: "error", reason });
    setTimeout(() => {
      try { client.leave(); } catch {}
    }, 500);
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Client ${client.sessionId} a rejoint AuthRoom`);
    client.send("welcome", {
      message: "Bienvenue dans l'AuthRoom. Veuillez vous authentifier.",
      sessionId: client.sessionId,
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👤 Client ${client.sessionId} a quitté (consentement: ${consented})`);
    const address = this.authenticatedClients.get(client.sessionId);
    if (address) {
      this.authenticatedClients.delete(client.sessionId);
      this.state.connectedPlayers = this.authenticatedClients.size;
      this.broadcast("playerLeft", { address });
    }
  }

  onDispose() {
    console.log("🗑️ AuthRoom supprimée");
    this.authenticatedClients.clear();
  }
}
