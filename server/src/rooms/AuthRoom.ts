// ===============================================
// AuthRoom.ts - Système d'authentification sécurisé Sui Network
// ===============================================
import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerData } from "../models/PlayerData";
import * as crypto from 'crypto';

// État de l'authentification
export class AuthState extends Schema {
  @type({ map: "string" }) authenticatedUsers = new MapSchema<string>();
  @type({ map: "string" }) pendingAuth = new MapSchema<string>();
}

// Interface pour les données d'authentification
interface AuthData {
  walletAddress: string;
  signature?: string;
  message?: string;
  timestamp: number;
}

export class AuthRoom extends Room<AuthState> {
  maxClients = 1000;
  private authChallenges = new Map<string, { message: string; timestamp: number }>();

  onCreate(options: any) {
    this.setState(new AuthState());
    console.log('🔐 AuthRoom créée:', this.roomId);

    // Nettoyage des défis expirés toutes les 5 minutes
    this.clock.setInterval(() => {
      this.cleanExpiredChallenges();
    }, 5 * 60 * 1000);

    // Message pour demander un défi d'authentification
    this.onMessage("requestChallenge", (client, data: { walletAddress: string }) => {
      this.handleChallengeRequest(client, data);
    });

    // Message pour vérifier l'authentification
    this.onMessage("verifyAuth", (client, data: AuthData) => {
      this.handleAuthVerification(client, data);
    });

    // Message pour vérifier le statut d'auth
    this.onMessage("checkAuthStatus", (client) => {
      this.handleAuthStatusCheck(client);
    });
  }

  private handleChallengeRequest(client: Client, data: { walletAddress: string }) {
    try {
      console.log(`🔐 Demande de défi pour: ${data.walletAddress} (${client.sessionId})`);

      // Validation de l'adresse Sui
      if (!this.isValidSuiAddress(data.walletAddress)) {
        client.send("authError", { 
          error: "Adresse Sui invalide",
          code: "INVALID_ADDRESS" 
        });
        return;
      }

      // Génération d'un message de défi unique
      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('hex');
      const challengeMessage = `Authentification PokeWorld\nAdresse: ${data.walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Stockage du défi
      this.authChallenges.set(client.sessionId, {
        message: challengeMessage,
        timestamp
      });

      // Marquer comme en attente
      this.state.pendingAuth.set(client.sessionId, data.walletAddress);

      // Envoi du défi au client
      client.send("authChallenge", {
        message: challengeMessage,
        walletAddress: data.walletAddress,
        timestamp
      });

      console.log(`✅ Défi envoyé pour ${data.walletAddress}`);

    } catch (error) {
      console.error("❌ Erreur lors de la génération du défi:", error);
      client.send("authError", { 
        error: "Erreur serveur lors de la génération du défi",
        code: "CHALLENGE_ERROR" 
      });
    }
  }

  private async handleAuthVerification(client: Client, data: AuthData) {
    try {
      console.log(`🔍 Vérification auth pour: ${data.walletAddress} (${client.sessionId})`);

      // Récupération du défi
      const challenge = this.authChallenges.get(client.sessionId);
      if (!challenge) {
        client.send("authError", { 
          error: "Aucun défi trouvé. Demandez d'abord un défi.",
          code: "NO_CHALLENGE" 
        });
        return;
      }

      // Vérification de l'expiration (5 minutes)
      if (Date.now() - challenge.timestamp > 5 * 60 * 1000) {
        this.authChallenges.delete(client.sessionId);
        this.state.pendingAuth.delete(client.sessionId);
        client.send("authError", { 
          error: "Défi expiré. Demandez un nouveau défi.",
          code: "CHALLENGE_EXPIRED" 
        });
        return;
      }

      // Validation de l'adresse
      if (!this.isValidSuiAddress(data.walletAddress)) {
        client.send("authError", { 
          error: "Adresse Sui invalide",
          code: "INVALID_ADDRESS" 
        });
        return;
      }

      // Vérification de la signature (simulation - à remplacer par vraie vérification Sui)
      const isValidSignature = await this.verifySuiSignature(
        challenge.message,
        data.signature || '',
        data.walletAddress
      );

      if (!isValidSignature) {
        client.send("authError", { 
          error: "Signature invalide",
          code: "INVALID_SIGNATURE" 
        });
        return;
      }

      // Authentification réussie
      await this.completeAuthentication(client, data.walletAddress);

    } catch (error) {
      console.error("❌ Erreur lors de la vérification:", error);
      client.send("authError", { 
        error: "Erreur serveur lors de la vérification",
        code: "VERIFICATION_ERROR" 
      });
    }
  }

  private async completeAuthentication(client: Client, walletAddress: string) {
    try {
      // Nettoyage des données temporaires
      this.authChallenges.delete(client.sessionId);
      this.state.pendingAuth.delete(client.sessionId);

      // Marquer comme authentifié
      this.state.authenticatedUsers.set(client.sessionId, walletAddress);

      // Recherche/création du joueur dans la base
      let playerData = await PlayerData.findOne({ 
        $or: [
          { username: walletAddress },
          { walletAddress: walletAddress }
        ]
      });

      if (!playerData) {
        // Création d'un nouveau compte
        playerData = await PlayerData.create({
          username: walletAddress,
          walletAddress: walletAddress,
          lastX: 52,
          lastY: 48,
          lastMap: "Beach",
          gold: 1000, // Gold de départ
          pokemons: [],
          createdAt: new Date(),
          lastLogin: new Date()
        });
        console.log(`✅ Nouveau compte créé pour ${walletAddress}`);
      } else {
        // Mise à jour de la dernière connexion
        await PlayerData.updateOne(
          { _id: playerData._id },
          { $set: { lastLogin: new Date() } }
        );
        console.log(`✅ Connexion mise à jour pour ${walletAddress}`);
      }

      // Envoi de la confirmation d'authentification
      client.send("authSuccess", {
        walletAddress: walletAddress,
        playerData: {
          username: playerData.username,
          lastMap: playerData.lastMap,
          lastX: playerData.lastX,
          lastY: playerData.lastY,
          gold: playerData.gold,
          pokemons: playerData.pokemons
        },
        timestamp: Date.now()
      });

      console.log(`🎉 Authentification réussie pour ${walletAddress}`);

    } catch (error) {
      console.error("❌ Erreur lors de la finalisation:", error);
      client.send("authError", { 
        error: "Erreur lors de la création/récupération du compte",
        code: "DATABASE_ERROR" 
      });
    }
  }

  private handleAuthStatusCheck(client: Client) {
    const walletAddress = this.state.authenticatedUsers.get(client.sessionId);
    const isPending = this.state.pendingAuth.has(client.sessionId);

    client.send("authStatus", {
      isAuthenticated: !!walletAddress,
      isPending: isPending,
      walletAddress: walletAddress || null
    });
  }

  private isValidSuiAddress(address: string): boolean {
    // Validation basique d'une adresse Sui
    // Les adresses Sui commencent par 0x et font 66 caractères
    const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    return suiAddressRegex.test(address);
  }

  private async verifySuiSignature(message: string, signature: string, address: string): Promise<boolean> {
    try {
      // TODO: Implémenter la vérification réelle de signature Sui
      // Pour l'instant, simulation (accepte toutes les signatures non vides)
      
      console.log(`🔍 Vérification signature pour ${address}`);
      console.log(`📝 Message: ${message.substring(0, 50)}...`);
      console.log(`✍️ Signature: ${signature.substring(0, 20)}...`);

      // Simulation - à remplacer par la vraie vérification Sui
      if (!signature || signature.length < 10) {
        return false;
      }

      // Ici, tu devrais utiliser les outils de vérification Sui
      // Exemple avec @mysten/sui.js :
      /*
      import { verifyMessage } from '@mysten/sui.js/verify';
      
      try {
        const isValid = await verifyMessage(
          new TextEncoder().encode(message),
          signature,
          address
        );
        return isValid;
      } catch (error) {
        console.error('Erreur vérification Sui:', error);
        return false;
      }
      */

      // Pour le développement, on accepte toute signature
      return true;

    } catch (error) {
      console.error('❌ Erreur vérification signature:', error);
      return false;
    }
  }

  private cleanExpiredChallenges() {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, challenge] of this.authChallenges) {
      if (now - challenge.timestamp > 5 * 60 * 1000) { // 5 minutes
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.authChallenges.delete(sessionId);
      this.state.pendingAuth.delete(sessionId);
      console.log(`🧹 Défi expiré nettoyé: ${sessionId}`);
    }

    if (expiredSessions.length > 0) {
      console.log(`🧹 ${expiredSessions.length} défis expirés nettoyés`);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`🔐 Nouvelle connexion AuthRoom: ${client.sessionId}`);
    
    // Envoi de l'état de connexion
    client.send("connectionEstablished", {
      sessionId: client.sessionId,
      timestamp: Date.now()
    });
  }

  async onLeave(client: Client) {
    console.log(`🔐 Déconnexion AuthRoom: ${client.sessionId}`);
    
    // Nettoyage des données de session
    this.authChallenges.delete(client.sessionId);
    this.state.pendingAuth.delete(client.sessionId);
    this.state.authenticatedUsers.delete(client.sessionId);
  }

  async onDispose() {
    console.log("🔐 AuthRoom fermée - nettoyage final");
    this.authChallenges.clear();
  }
}
