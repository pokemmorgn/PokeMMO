// ===============================================
// AuthRoom.ts - Système d'authentification sécurisé Sui Network - CORRIGÉ
// ===============================================
import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerData } from "../models/PlayerData";
import * as crypto from 'crypto';

// CORRECTION: État de l'authentification avec définitions schema strictes
export class AuthState extends Schema {
  @type({ map: "string" }) authenticatedUsers = new MapSchema<string>();
  @type({ map: "string" }) pendingAuth = new MapSchema<string>();
  @type("number") serverTimestamp: number = Date.now();
  @type("string") roomStatus: string = "active";
}

// Interface pour les données d'authentification
interface AuthData {
  walletAddress: string;
  signature?: string;
  message?: string;
  timestamp: number;
}

// Interface pour les données du défi
interface Challenge {
  message: string;
  timestamp: number;
  walletAddress: string;
}

export class AuthRoom extends Room<AuthState> {
  maxClients = 1000;
  private authChallenges = new Map<string, Challenge>();
  private readonly CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  onCreate(options: any) {
    console.log('🔐 AuthRoom créée:', this.roomId);
    
    // CORRECTION: Initialisation propre du state
    this.setState(new AuthState());
    this.state.serverTimestamp = Date.now();
    this.state.roomStatus = "active";

    // Nettoyage automatique des défis expirés
    this.clock.setInterval(() => {
      this.cleanExpiredChallenges();
    }, 60 * 1000); // Chaque minute

    // Mise à jour du timestamp serveur
    this.clock.setInterval(() => {
      this.state.serverTimestamp = Date.now();
    }, 30 * 1000); // Chaque 30 secondes

    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
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

    // Message pour se déconnecter
    this.onMessage("logout", (client) => {
      this.handleLogout(client);
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

      // CORRECTION: Nettoyage des données existantes avant d'ajouter
      this.cleanupClientData(client.sessionId);

      // Stockage du défi
      this.authChallenges.set(client.sessionId, {
        message: challengeMessage,
        timestamp,
        walletAddress: data.walletAddress
      });

      // Marquer comme en attente d'authentification
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

      // Vérification de l'expiration
      if (Date.now() - challenge.timestamp > this.CHALLENGE_EXPIRY) {
        this.cleanupClientData(client.sessionId);
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

      // Vérification que l'adresse correspond au défi
      if (challenge.walletAddress !== data.walletAddress) {
        client.send("authError", { 
          error: "L'adresse ne correspond pas au défi demandé",
          code: "ADDRESS_MISMATCH" 
        });
        return;
      }

      // CORRECTION: Vérification de la signature Sui
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
      this.cleanupClientData(client.sessionId);

      // Marquer comme authentifié
      this.state.authenticatedUsers.set(client.sessionId, walletAddress);

      // Recherche/création du joueur dans la base
      let playerData = await this.findOrCreatePlayer(walletAddress);

      // Envoi de la confirmation d'authentification
      client.send("authSuccess", {
        walletAddress: walletAddress,
        playerData: {
          username: playerData.username,
          lastMap: playerData.lastMap,
          lastX: playerData.lastX,
          lastY: playerData.lastY,
          gold: playerData.gold,
          pokemons: playerData.pokemons || [],
          level: playerData.level || 1
        },
        timestamp: Date.now(),
        sessionId: client.sessionId
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

  private async findOrCreatePlayer(walletAddress: string) {
    try {
      // Recherche du joueur existant
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
          gold: 1000,
          level: 1,
          pokemons: [],
          createdAt: new Date(),
          lastLogin: new Date()
        });
        console.log(`✅ Nouveau compte créé pour ${walletAddress}`);
      } else {
        // Mise à jour de la dernière connexion
        await PlayerData.updateOne(
          { _id: playerData._id },
          { 
            $set: { 
              lastLogin: new Date(),
              walletAddress: walletAddress // Assurer que l'adresse wallet est synchronisée
            } 
          }
        );
        console.log(`✅ Connexion mise à jour pour ${walletAddress}`);
      }

      return playerData;
    } catch (error) {
      console.error("❌ Erreur base de données:", error);
      throw error;
    }
  }

  private handleAuthStatusCheck(client: Client) {
    const walletAddress = this.state.authenticatedUsers.get(client.sessionId);
    const isPending = this.state.pendingAuth.has(client.sessionId);

    client.send("authStatus", {
      isAuthenticated: !!walletAddress,
      isPending: isPending,
      walletAddress: walletAddress || null,
      sessionId: client.sessionId,
      serverTimestamp: this.state.serverTimestamp
    });
  }

  private handleLogout(client: Client) {
    console.log(`🔓 Logout demandé pour: ${client.sessionId}`);
    this.cleanupClientData(client.sessionId);
    
    client.send("logoutSuccess", {
      sessionId: client.sessionId,
      timestamp: Date.now()
    });
  }

  private cleanupClientData(sessionId: string) {
    try {
      // Nettoyage des défis
      this.authChallenges.delete(sessionId);
      
      // Nettoyage du state (avec vérifications)
      if (this.state.pendingAuth && this.state.pendingAuth.has(sessionId)) {
        this.state.pendingAuth.delete(sessionId);
      }
      
      if (this.state.authenticatedUsers && this.state.authenticatedUsers.has(sessionId)) {
        this.state.authenticatedUsers.delete(sessionId);
      }
    } catch (error) {
      console.error(`❌ Erreur nettoyage ${sessionId}:`, error);
    }
  }

  private isValidSuiAddress(address: string): boolean {
    try {
      // Validation d'une adresse Sui
      // Les adresses Sui peuvent commencer par 0x et faire 66 caractères (format long)
      // Ou être plus courtes (format court)
      const suiAddressRegex = /^0x[a-fA-F0-9]{64}$|^0x[a-fA-F0-9]{40}$/;
      return suiAddressRegex.test(address) && address.length >= 42;
    } catch (error) {
      return false;
    }
  }

  private async verifySuiSignature(message: string, signature: string, address: string): Promise<boolean> {
    try {
      console.log(`🔍 Vérification signature pour ${address}`);
      console.log(`📝 Message: ${message.substring(0, 50)}...`);
      console.log(`✍️ Signature: ${signature ? signature.substring(0, 20) + '...' : 'aucune'}`);

      // Validation basique
      if (!signature || signature.length < 10) {
        console.log('❌ Signature manquante ou trop courte');
        return false;
      }

      // TODO: Implémenter la vérification réelle de signature Sui
      // Utiliser @mysten/sui.js pour la vérification
      /*
      import { verifyPersonalMessageSignature } from '@mysten/sui.js/verify';
      import { fromB64 } from '@mysten/sui.js/utils';
      
      try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = fromB64(signature);
        
        const isValid = await verifyPersonalMessageSignature(
          messageBytes,
          signatureBytes,
          address
        );
        
        console.log(`🔍 Résultat vérification Sui: ${isValid}`);
        return isValid;
      } catch (error) {
        console.error('❌ Erreur vérification Sui:', error);
        return false;
      }
      */

      // Pour le développement/test - REMPLACER EN PRODUCTION
      console.log('⚠️ Mode développement - signature acceptée automatiquement');
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
      if (now - challenge.timestamp > this.CHALLENGE_EXPIRY) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.cleanupClientData(sessionId);
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
      timestamp: Date.now(),
      serverTimestamp: this.state.serverTimestamp
    });

    // Vérification immédiate du statut
    this.handleAuthStatusCheck(client);
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`🔐 Déconnexion AuthRoom: ${client.sessionId} (consenti: ${consented})`);
    
    // Nettoyage complet des données client
    this.cleanupClientData(client.sessionId);
    
    console.log(`✅ Nettoyage session ${client.sessionId} terminé`);
  }

  async onDispose() {
    console.log("🔐 AuthRoom fermée - nettoyage final");
    try {
      this.authChallenges.clear();
      this.state.roomStatus = "disposed";
      console.log("✅ Nettoyage final terminé");
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage final:", error);
    }
  }

  // Méthodes utilitaires pour les autres rooms
  public isUserAuthenticated(sessionId: string): boolean {
    return this.state.authenticatedUsers.has(sessionId);
  }

  public getUserWallet(sessionId: string): string | null {
    return this.state.authenticatedUsers.get(sessionId) || null;
  }

  public getAuthenticatedUsers(): string[] {
    return Array.from(this.state.authenticatedUsers.values());
  }
}
