// src/rooms/AuthRoom.ts
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import * as crypto from "crypto";

// Schéma d'état basique (optionnel)
export class AuthState extends Schema {
  @type("string") message: string = "Authentification en cours...";
  @type("string") address: string = "";
}

export class AuthRoom extends Room<AuthState> {
  onCreate(options: any) {
    this.setState(new AuthState());

    this.onMessage("authenticate", async (client, payload) => {
      const { address, signature, message } = payload;

      // Ici, vérifie la signature (exemple simplifié)
      if (!address || !signature || !message) {
        this.disconnectClient(client, "Missing authentication data");
        return;
      }

      // -- Ici il FAUT vérifier la signature réellement (exemple à adapter) --
      const isValid = await this.verifySignature(address, signature, message);
      if (!isValid) {
        this.disconnectClient(client, "Signature invalid");
        return;
      }

      // Auth OK : mets à jour l’état, marque le client comme authentifié, etc.
      this.state.address = address;
      client.auth = { address };

      // Répondre au client
      this.send(client, { status: "ok", address });
    });
  }

  async verifySignature(address: string, signature: string, message: string): Promise<boolean> {
    // Ici il faut intégrer la vérification SUI (Sui/Ethereum/Ed25519, etc.)
    // Pour la démo : always true. À sécuriser.
    return true;
  }

  disconnectClient(client: Client, reason: string) {
    this.send(client, { status: "error", reason });
    setTimeout(() => client.leave(), 500);
  }

  onJoin(client: Client) {
    // Optionnel : log/traitement à la connexion.
  }

  onLeave(client: Client) {
    // Optionnel : log/traitement à la déco.
  }
}
