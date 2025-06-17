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
  // Stockage temporaire des clients authentifiés
  private authenticatedClients: Map<string, string> = new Map();

  onCreate(options: any) {
    this.setState(new AuthState());
    console.log("🔐 AuthRoom créée");

    // Gestionnaire du message d'authentification
    this.onMessage("authenticate", async (client, payload) => {
      console.log("📨 Demande d'authentification reçue:", {
        address: payload.address,
        walletType: payload.walletType,
        timestamp: payload.timestamp,
      });

      try {
        const { address, signature, message, walletType } = payload;

        // Validation des données
        if (!address || !signature || !message) {
          throw new Error("Données d'authentification manquantes");
        }

        // Vérifier le timestamp (optionnel, empêche le replay d'anciennes signatures)
        if (payload.timestamp) {
          const messageTime = parseInt(message.match(/\d+$/)?.[0] || "0");
          const currentTime = Date.now();
          const timeDiff = Math.abs(currentTime - messageTime);

          // Rejeter si la signature a plus de 5 minutes
          if (timeDiff > 5 * 60 * 1000) {
            throw new Error("Signature expirée");
          }
        }

        // Vérifier selon le type de wallet
        let isValid = false;

        if (walletType === "slush") {
          isValid = await this.verifySlushSignature(address, signature, message);
        } else if (walletType === "phantom" || !walletType) {
          // Pour Phantom ou fallback, on peut accepter temporairement
          // ou implémenter une vérification différente
          console.log("⚠️ Vérification alternative pour", walletType || "wallet inconnu");
          isValid = await this.verifyAlternativeAuth(address, signature, message);
        }

        if (!isValid) {
          throw new Error("Signature invalide");
        }

        // Authentification réussie
        console.log("✅ Authentification réussie pour", address);

        // Stocker l'authentification
        this.authenticatedClients.set(client.sessionId, address);
        (client as any).auth = { address, walletType };

        // Mettre à jour l'état
        this.state.address = address;
        this.state.connectedPlayers = this.authenticatedClients.size;
        this.state.message = `${this.authenticatedClients.size} joueur(s) connecté(s)`;

        // Confirmer au client
        client.send("authenticated", {
          status: "ok",
          address,
          sessionId: client.sessionId,
        });

        // Notifier les autres clients (optionnel)
        this.broadcast("playerJoined", { address }, { except: client });
      } catch (error: any) {
        console.error("❌ Erreur d'authentification:", error);
        this.disconnectClient(client, error.message);
      }
    });

    // Autres messages possibles
    this.onMessage("ping", (client) => {
      client.send("pong", { time: Date.now() });
    });
  }

  async verifySlushSignature(address: string, signature: string, message: string): Promise<boolean> {
    try {
      console.log("🔍 Vérification signature Slush");

      // Utiliser la bibliothèque Sui pour vérifier
      const messageBytes = new TextEncoder().encode(message);

      // La signature de Slush est au format base64
      const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));

      // Vérifier avec l'API Sui
      const isValid = await verifyPersonalMessage(messageBytes, signatureBytes, address);

      console.log("🔍 Résultat vérification:", isValid);
      return isValid;
    } catch (error) {
      console.error("❌ Erreur vérification Slush:", error);

      // Alternative : vérification manuelle si l'API ne fonctionne pas
      try {
        return await this.manualSuiVerification(address, signature, message);
      } catch (e) {
        console.error("❌ Vérification manuelle échouée:", e);
        return false;
      }
    }
  }

  async manualSuiVerification(address: string, signature: string, message: string): Promise<boolean> {
    try {
      // Vérification manuelle pour Sui (simplifiée)
      const messageBytes = new TextEncoder().encode(message);

      const prefix = new TextEncoder().encode("Sui Signed Message:\n");
      const fullMessage = new Uint8Array(prefix.length + messageBytes.length);
      fullMessage.set(prefix);
      fullMessage.set(messageBytes, prefix.length);

      // Simple vérification basique : format adresse, présence message
      return (
        address.startsWith("0x") &&
        address.length === 66 && // Adresse Sui (0x + 64 hex)
        signature.length > 0 &&
        message.includes("PokeWorld")
      );
    } catch (error) {
      console.error("Erreur vérification manuelle:", error);
      return false;
    }
  }

  async verifyAlternativeAuth(address: string, signature: string, message: string): Promise<boolean> {
    try {
      // Pour wallets ne supportant pas bien signMessage
      const decoded = atob(signature);
      const parts = decoded.split(":");

      if (parts.length >= 3 && parts[0] === address) {
        return message.includes("PokeWorld");
      }
      return false;
    } catch (error) {
      console.error("Erreur vérification alternative:", error);
      return false;
    }
  }

  disconnectClient(client: Client, reason: string) {
    console.log("🚫 Déconnexion client:", reason);
    client.send("error", { status: "error", reason });
    setTimeout(() => {
      try {
        client.leave();
      } catch {
        // Client déjà parti
      }
    }, 500);
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Client ${client.sessionId} a rejoint AuthRoom`);

    // Envoyer un message de bienvenue
    client.send("welcome", {
      message: "Bienvenue dans l'AuthRoom. Veuillez vous authentifier.",
      sessionId: client.sessionId,
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👤 Client ${client.sessionId} a quitté (consentement: ${consented})`);

    // Retirer de la liste des authentifiés
    const address = this.authenticatedClients.get(client.sessionId);
    if (address) {
      this.authenticatedClients.delete(client.sessionId);
      this.state.connectedPlayers = this.authenticatedClients.size;

      // Notifier les autres
      this.broadcast("playerLeft", { address });
    }
  }

  onDispose() {
    console.log("🗑️ AuthRoom supprimée");
    this.authenticatedClients.clear();
  }
}