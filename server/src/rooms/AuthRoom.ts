// ===============================================
// AuthRoom.ts - Room de connexion/authentification sécurisée Sui
// ===============================================
import { Room, Client } from "@colyseus/core";
import { AuthState, AuthPlayer } from "../schema/AuthState";
import { PlayerData } from "../models/PlayerData";
import { Connection } from "@mysten/sui.js/client";
import { verifySignature } from "@mysten/sui.js/verify";
import { fromB64 } from "@mysten/bcs";

interface AuthOptions {
  walletAddress?: string;
  signature?: string;
  message?: string;
  publicKey?: string;
}

export class AuthRoom extends Room<AuthState> {
  maxClients = 1000; // Plus de clients pour la gestion globale d'auth
  private suiClient: Connection;
  private challenges: Map<string, { message: string, timestamp: number }> = new Map();
  
  // Nettoyage des challenges expirés toutes les 5 minutes
  private readonly CHALLENGE_EXPIRY = 5 * 60 * 1000; 

  onCreate(options: any) {
    this.setState(new AuthState());

    console.log('🔐 DEBUT onCreate AuthRoom');

    // Initialiser le client Sui (mainnet/testnet selon config)
    this.suiClient = new Connection({
      fullnode: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443"
    });

    // Nettoyage périodique des challenges expirés
    this.clock.setInterval(() => {
      this.cleanExpiredChallenges();
    }, 60000); // Toutes les minutes

    // === DEMANDE DE CHALLENGE ===
    this.onMessage("requestChallenge", (client, data: { walletAddress: string }) => {
      this.handleChallengeRequest(client, data);
    });

    // === VERIFICATION DE SIGNATURE ===
    this.onMessage("verifySignature", async (client, data: AuthOptions) => {
      await this.handleSignatureVerification(client, data);
    });

    // === DECONNEXION ===
    this.onMessage("disconnect", (client) => {
      this.handleDisconnection(client);
    });

    console.log("[AuthRoom] Room d'authentification créée :", this.roomId);
    console.log('🔐 FIN onCreate AuthRoom');
  }

  /**
   * Génère un challenge cryptographique unique pour l'adresse wallet
   */
  private handleChallengeRequest(client: Client, data: { walletAddress: string }) {
    try {
      const { walletAddress } = data;
      
      if (!this.isValidSuiAddress(walletAddress)) {
        client.send("challengeError", { 
          error: "Adresse Sui invalide",
          code: "INVALID_ADDRESS"
        });
        return;
      }

      // Générer un message de challenge unique
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Connexion sécurisée au jeu\nAdresse: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Stocker le challenge
      this.challenges.set(client.sessionId, {
        message,
        timestamp
      });

      console.log(`[AuthRoom] Challenge généré pour ${walletAddress}: ${client.sessionId}`);

      client.send("challengeGenerated", {
        message,
        walletAddress,
        sessionId: client.sessionId
      });

    } catch (error) {
      console.error("[AuthRoom] Erreur génération challenge:", error);
      client.send("challengeError", { 
        error: "Erreur interne de génération",
        code: "GENERATION_ERROR"
      });
    }
  }

  /**
   * Vérifie la signature cryptographique côté serveur
   */
  private async handleSignatureVerification(client: Client, data: AuthOptions) {
    try {
      const { walletAddress, signature, publicKey } = data;

      // Vérifications de base
      if (!walletAddress || !signature || !publicKey) {
        client.send("authError", { 
          error: "Données manquantes pour la vérification",
          code: "MISSING_DATA"
        });
        return;
      }

      // Récupérer le challenge
      const challenge = this.challenges.get(client.sessionId);
      if (!challenge) {
        client.send("authError", { 
          error: "Challenge non trouvé ou expiré",
          code: "CHALLENGE_NOT_FOUND"
        });
        return;
      }

      // Vérifier l'expiration du challenge
      if (Date.now() - challenge.timestamp > this.CHALLENGE_EXPIRY) {
        this.challenges.delete(client.sessionId);
        client.send("authError", { 
          error: "Challenge expiré",
          code: "CHALLENGE_EXPIRED"
        });
        return;
      }

      // === VERIFICATION CRYPTOGRAPHIQUE SUI ===
      const isSignatureValid = await this.verifySuiSignature(
        challenge.message,
        signature,
        publicKey,
        walletAddress
      );

      if (!isSignatureValid) {
        client.send("authError", { 
          error: "Signature invalide",
          code: "INVALID_SIGNATURE"
        });
        return;
      }

      // === VERIFICATION ON-CHAIN (optionnelle) ===
      const walletExists = await this.verifyWalletOnChain(walletAddress);
      if (!walletExists) {
        console.warn(`[AuthRoom] Wallet ${walletAddress} non trouvé on-chain`);
        // Note: On peut continuer même si le wallet est nouveau
      }

      // === AUTHENTIFICATION REUSSIE ===
      await this.authenticatePlayer(client, walletAddress);

      // Nettoyer le challenge utilisé
      this.challenges.delete(client.sessionId);

      console.log(`✅ [AuthRoom] Authentification réussie pour ${walletAddress}`);

    } catch (error) {
      console.error("[AuthRoom] Erreur vérification signature:", error);
      client.send("authError", { 
        error: "Erreur de vérification",
        code: "VERIFICATION_ERROR"
      });
    }
  }

  /**
   * Vérifie cryptographiquement la signature Sui
   */
  private async verifySuiSignature(
    message: string, 
    signature: string, 
    publicKey: string, 
    walletAddress: string
  ): Promise<boolean> {
    try {
      // Convertir le message en bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Convertir la signature depuis base64
      const signatureBytes = fromB64(signature);
      
      // Convertir la clé publique depuis base64
      const publicKeyBytes = fromB64(publicKey);

      // Vérifier la signature avec la librairie Sui
      const isValid = await verifySignature(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      // Vérification supplémentaire: la clé publique correspond-elle à l'adresse?
      const derivedAddress = this.deriveAddressFromPublicKey(publicKeyBytes);
      const addressMatches = derivedAddress === walletAddress;

      console.log(`[AuthRoom] Signature valide: ${isValid}, Adresse correspond: ${addressMatches}`);

      return isValid && addressMatches;

    } catch (error) {
      console.error("[AuthRoom] Erreur vérification cryptographique:", error);
      return false;
    }
  }

  /**
   * Vérifie que le wallet existe on-chain
   */
  private async verifyWalletOnChain(walletAddress: string): Promise<boolean> {
    try {
      const objects = await this.suiClient.getOwnedObjects({
        owner: walletAddress,
        limit: 1
      });

      // Si on peut récupérer les objets, le wallet existe
      return objects.data !== undefined;

    } catch (error) {
      console.error("[AuthRoom] Erreur vérification on-chain:", error);
      return false;
    }
  }

  /**
   * Authentifie le joueur et met à jour la base de données
   */
  private async authenticatePlayer(client: Client, walletAddress: string) {
    try {
      // Vérifier si joueur avec cette adresse existe déjà connecté
      const existingPlayer = Array.from(this.state.players.values())
        .find(p => p.walletAddress === walletAddress);

      if (existingPlayer) {
        // Déconnecter l'ancienne session
        const oldSessionId = Array.from(this.state.players.entries())
          .find(([_, p]) => p.walletAddress === walletAddress)?.[0];
        
        if (oldSessionId) {
          this.state.players.delete(oldSessionId);
          console.log(`[AuthRoom] Ancienne session ${oldSessionId} supprimée pour ${walletAddress}`);
        }
      }

      // Rechercher ou créer le joueur en base
      let playerData = await PlayerData.findOne({ walletAddress });
      
      if (!playerData) {
        // Créer un nouveau joueur
        const username = `Player_${walletAddress.substring(2, 8)}`;
        playerData = await PlayerData.create({
          username,
          walletAddress,
          lastX: 52,
          lastY: 48,
          lastMap: "Beach",
          createdAt: new Date(),
          lastLogin: new Date(),
          isVerified: true
        });
        console.log(`[AuthRoom] Nouveau joueur créé: ${username} (${walletAddress})`);
      } else {
        // Mettre à jour la dernière connexion
        await PlayerData.updateOne(
          { walletAddress },
          { 
            $set: { 
              lastLogin: new Date(),
              isVerified: true 
            } 
          }
        );
        console.log(`[AuthRoom] Joueur existant connecté: ${playerData.username}`);
      }

      // Créer l'entrée dans le state de la room
      const authPlayer = new AuthPlayer();
      authPlayer.sessionId = client.sessionId;
      authPlayer.walletAddress = walletAddress;
      authPlayer.username = playerData.username;
      authPlayer.isAuthenticated = true;
      authPlayer.authenticatedAt = Date.now();

      this.state.players.set(client.sessionId, authPlayer);

      // Envoyer la confirmation au client
      client.send("authSuccess", {
        username: playerData.username,
        walletAddress: walletAddress,
        lastMap: playerData.lastMap,
        lastX: playerData.lastX,
        lastY: playerData.lastY,
        sessionId: client.sessionId
      });

    } catch (error) {
      console.error("[AuthRoom] Erreur authentification joueur:", error);
      client.send("authError", { 
        error: "Erreur de sauvegarde",
        code: "DATABASE_ERROR"
      });
    }
  }

  /**
   * Gère la déconnexion propre
   */
  private handleDisconnection(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[AuthRoom] Déconnexion de ${player.username} (${player.walletAddress})`);
      this.state.players.delete(client.sessionId);
    }
    
    // Nettoyer le challenge si présent
    this.challenges.delete(client.sessionId);
  }

  /**
   * Nettoie les challenges expirés
   */
  private cleanExpiredChallenges() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, challenge] of this.challenges.entries()) {
      if (now - challenge.timestamp > this.CHALLENGE_EXPIRY) {
        this.challenges.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[AuthRoom] ${cleaned} challenges expirés nettoyés`);
    }
  }

  /**
   * Valide le format d'une adresse Sui
   */
  private isValidSuiAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(address);
  }

  /**
   * Dérive l'adresse à partir de la clé publique
   */
  private deriveAddressFromPublicKey(publicKeyBytes: Uint8Array): string {
    // Implémentation simplifiée - à adapter selon le schéma Sui exact
    // Cette fonction devrait utiliser la même logique que Sui pour dériver l'adresse
    
    // Pour l'instant, on fait confiance à la vérification de signature
    // Une implémentation complète nécessiterait d'importer les utilitaires Sui appropriés
    
    return ""; // Placeholder - implémenter la dérivation d'adresse Sui
  }

  async onJoin(client: Client, options: AuthOptions) {
    console.log(`[AuthRoom] Nouvelle connexion: ${client.sessionId}`);
    
    // Le joueur devra demander un challenge pour s'authentifier
    client.send("authRequired", {
      message: "Authentification requise via signature Sui",
      sessionId: client.sessionId
    });
  }

  async onLeave(client: Client) {
    this.handleDisconnection(client);
  }

  async onDispose() {
    console.log("[AuthRoom] Room d'authentification fermée");
    this.challenges.clear();
  }
}
