// server/src/rooms/AuthRoom.ts
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { verifyPersonalMessage } from "@mysten/sui.js/verify";
import { PlayerData } from "../models/PlayerData";
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

// État de la room d'authentification
export class AuthState extends Schema {
  @type("string") message: string = "Authentification en cours…";
  @type("string") address: string = "";
  @type("number") connectedPlayers: number = 0;
}

export class AuthRoom extends Room<AuthState> {
  private authenticatedClients: Map<string, string> = new Map();
  // ✅ MIDDLEWARE pour capturer l'IP à la connexion
  onAuth(client: any, options: any, req: any) {
    console.log(`🔍 [AuthRoom] onAuth pour client ${client.sessionId}`);
    
    const headers = req?.headers || {};
    console.log(`📋 [AuthRoom] Headers reçus:`, {
      'x-real-ip': headers['x-real-ip'],
      'x-forwarded-for': headers['x-forwarded-for'],
      'x-client-ip': headers['x-client-ip'],
      'host': headers['host']
    });
    
    const ipSources = [
      headers['x-real-ip'],
      headers['x-forwarded-for']?.split(',')[0]?.trim(),
      headers['x-client-ip'],
      '127.0.0.1'
    ];
    
    let detectedIP = 'localhost';
    for (const ip of ipSources) {
      if (ip && ip !== 'unknown' && ip.length > 3) {
        detectedIP = ip;
        console.log(`✅ [AuthRoom] IP détectée: ${ip}`);
        break;
      }
    }
    
    // Injecter l'IP dans le client
    client.detectedIP = detectedIP;
    
    return true; // Autoriser la connexion
  }
  // ✅ NOUVELLES PROPRIÉTÉS pour sécurité renforcée
  private activeSessions: Map<string, any> = new Map();
  private failedAttempts: Map<string, number> = new Map();
  private rateLimitByIP: Map<string, { count: number; lastAttempt: number }> = new Map();

  onCreate(options: any) {
    this.setState(new AuthState());
    console.log("🔐 AuthRoom créée avec sécurité renforcée");

    // ✅ VÉRIFICATIONS de sécurité au démarrage
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET manquant dans .env !');
      throw new Error('JWT_SECRET required for security');
    }

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI manquant dans .env !');
      throw new Error('Database connection required');
    }

    console.log('✅ Variables d\'environnement validées');

    // ✅ NETTOYAGE périodique des sessions expirées
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 10 * 60 * 1000); // Toutes les 10 minutes

    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    // ✅ NOUVEAU: Debug connection pour vérifier les headers
    this.onMessage("debug_connection", (client) => {
      const headers = (client as any).request?.headers || {};
      const connection = (client as any).request?.connection || {};
      const socket = (client as any).request?.socket || {};
      
      console.log("🔍 [AuthRoom] DEBUG Headers pour", client.sessionId);
      console.log("📋 Headers:", {
        'x-forwarded-for': headers['x-forwarded-for'],
        'x-real-ip': headers['x-real-ip'],
        'cf-connecting-ip': headers['cf-connecting-ip'],
        'x-client-ip': headers['x-client-ip'],
        'x-cluster-client-ip': headers['x-cluster-client-ip'],
        'forwarded': headers['forwarded'],
        'user-agent': headers['user-agent']
      });
      console.log("🔌 Connection:", {
        remoteAddress: connection.remoteAddress,
        remotePort: connection.remotePort,
        socketRemoteAddress: socket.remoteAddress
      });
    });

    // ✅ HANDLER : Registration sécurisée
    this.onMessage("user_register", async (client, payload) => {
      const clientIP = this.getClientIP(client);
      
      // Rate limiting
      if (this.isRateLimited(clientIP, 'register')) {
        client.send("register_result", { 
          status: "error", 
          reason: "Too many registration attempts. Please wait before trying again." 
        });
        return;
      }

      try {
        const { username, email, password, deviceFingerprint, userAgent, timezone } = payload;
        
        console.log("📨 Demande d'inscription:", { username, email, ip: clientIP });
        
        // ✅ VALIDATION stricte côté serveur
        const validation = this.validateRegistrationData(username, email, password);
        if (!validation.valid) {
          this.recordFailedAttempt(clientIP, 'register');
          client.send("register_result", { 
            status: "error", 
            reason: validation.reason 
          });
          return;
        }
        
        // ✅ VÉRIFICATIONS d'existence dans la DB
        const [existingUser, existingEmail] = await Promise.all([
          PlayerData.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }),
          email ? PlayerData.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }) : null
        ]);
        
        if (existingUser) {
          this.recordFailedAttempt(clientIP, 'register');
          client.send("register_result", { 
            status: "error", 
            reason: "Username already exists" 
          });
          return;
        }
        
        if (existingEmail) {
          this.recordFailedAttempt(clientIP, 'register');
          client.send("register_result", { 
            status: "error", 
            reason: "Email already registered" 
          });
          return;
        }

        // ✅ HASH sécurisé du mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // ✅ CRÉER l'utilisateur dans MongoDB avec métadonnées complètes
        const newUser = new PlayerData({
          username: username.trim(),
          email: email ? email.toLowerCase().trim() : undefined,
          password: hashedPassword,
          deviceFingerprint,
          registrationIP: clientIP,
          lastLoginIP: clientIP,
          
          // Données de départ du jeu
          gold: 1000,
          lastX: 360,
          lastY: 120,
          lastMap: "beach",
          level: 1,
          experience: 0,
          
          // Métadonnées de sécurité
          createdAt: new Date(),
          lastLogin: new Date(),
          loginCount: 1,
          isActive: true,
          emailVerified: false,
          failedLoginAttempts: 0,
          passwordChangedAt: new Date()
        });

        await newUser.save();
        
        // ✅ GÉNÉRER JWT sécurisé
        const sessionToken = this.generateJWT({
          username: newUser.username,
          userId: newUser._id,
          permissions: ['play'],
          type: 'game_session',
          deviceFingerprint,
          registrationTime: Date.now(),
          isDev: newUser.isDev || false
        });

        // ✅ STOCKER session active avec métadonnées
        this.activeSessions.set(sessionToken, {
          username: newUser.username,
          userId: newUser._id,
          deviceFingerprint,
          clientIP,
          userAgent,
          timezone,
          lastActivity: Date.now(),
          createdAt: Date.now()
        });

        // ✅ RÉPONSE sécurisée (pas d'infos sensibles)
        client.send("register_result", {
          status: "ok",
          sessionToken,
          tokenExpiry: Date.now() + this.getSessionDuration(),
          permissions: ['play'],
          userData: { 
            username: newUser.username, 
            email: newUser.email,
            level: newUser.level,
            coins: newUser.gold,
            lastMap: newUser.lastMap,
            isNewUser: true,
            isDev: newUser.isDev || false
          }
        });

        console.log(`✅ Nouvel utilisateur créé: ${newUser.username} (${newUser.email}) depuis ${clientIP}`);

      } catch (error) {
        console.error('❌ Erreur registration:', error);
        this.recordFailedAttempt(clientIP, 'register');
        client.send("register_result", { 
          status: "error", 
          reason: "Server error during registration. Please try again." 
        });
      }
    });

    // ✅ HANDLER : Login sécurisé
    this.onMessage("user_login", async (client, payload) => {
      const clientIP = this.getClientIP(client);
      
      // Rate limiting
      if (this.isRateLimited(clientIP, 'login')) {
        client.send("login_result", { 
          status: "error", 
          reason: "Too many login attempts. Please wait before trying again." 
        });
        return;
      }

      try {
        const { username, password, deviceFingerprint, userAgent, timezone } = payload;
        
        console.log("📨 Demande de connexion:", { username, ip: clientIP });
        
        // ✅ VALIDATION basique
        if (!username || !password) {
          this.recordFailedAttempt(clientIP, 'login');
          client.send("login_result", { 
            status: "error", 
            reason: "Username and password are required" 
          });
          return;
        }
        
        // ✅ RECHERCHE utilisateur (insensible à la casse pour username)
        const user = await PlayerData.findOne({ 
          username: { $regex: new RegExp(`^${username}$`, 'i') },
          isActive: true 
        });
        
        if (!user || !user.password) {
          this.recordFailedAttempt(clientIP, 'login');
          client.send("login_result", { 
            status: "error", 
            reason: "Invalid username or password" 
          });
          return;
        }

        // ✅ VÉRIFICATIONS de sécurité du compte
        if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date())) {
          client.send("login_result", { 
            status: "error", 
            reason: `Account banned${user.banReason ? ': ' + user.banReason : ''}` 
          });
          return;
        }

        if (user.failedLoginAttempts >= 5 && user.lastFailedLogin && (Date.now() - user.lastFailedLogin.getTime()) < 15 * 60 * 1000) {
          client.send("login_result", { 
            status: "error", 
            reason: "Account temporarily locked due to failed login attempts. Try again later." 
          });
          return;
        }

        // ✅ VÉRIFICATION mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          user.lastFailedLogin = new Date();
          await user.save();
          this.recordFailedAttempt(clientIP, 'login');
          
          client.send("login_result", { 
            status: "error", 
            reason: "Invalid username or password" 
          });
          return;
        }

        // ✅ CONNEXION réussie - mise à jour utilisateur
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        if (clientIP) user.lastLoginIP = clientIP;
        user.currentSessionStart = new Date(); // Démarrer session
        user.failedLoginAttempts = 0;
        user.lastFailedLogin = undefined;
        
        if (deviceFingerprint) {
          user.deviceFingerprint = deviceFingerprint;
        }
        
        await user.save();

        // ✅ GÉNÉRER nouveau JWT
        const sessionToken = this.generateJWT({
          username: user.username,
          userId: user._id,
          permissions: ['play'],
          type: 'game_session',
          deviceFingerprint,
          loginTime: Date.now(),
          isDev: user.isDev || false
        });

        // ✅ STOCKER session active
        this.activeSessions.set(sessionToken, {
          username: user.username,
          userId: user._id,
          deviceFingerprint,
          clientIP,
          userAgent,
          timezone,
          lastActivity: Date.now(),
          createdAt: Date.now()
        });

        // ✅ RÉPONSE avec données utilisateur
        client.send("login_result", {
          status: "ok",
          sessionToken,
          tokenExpiry: Date.now() + this.getSessionDuration(),
          permissions: ['play'],
          userData: { 
            username: user.username, 
            email: user.email,
            level: user.level || 1,
            coins: user.gold || 1000,
            lastMap: user.lastMap || "beach",
            playtime: user.totalPlaytime || 0,
            loginCount: user.loginCount,
            lastLogin: user.lastLogin,
            isDev: user.isDev || false
          }
        });

        console.log(`✅ Connexion réussie: ${user.username} (connexion #${user.loginCount}) depuis ${clientIP}`);

      } catch (error) {
        console.error('❌ Erreur login:', error);
        this.recordFailedAttempt(clientIP, 'login');
        client.send("login_result", { 
          status: "error", 
          reason: "Server error during login. Please try again." 
        });
      }
    });

    // ✅ HANDLER : Session heartbeat
    this.onMessage("session_heartbeat", async (client, payload) => {
      try {
        const { sessionToken } = payload;
        
        if (!sessionToken) {
          client.send("heartbeat_response", { status: "error", reason: "Token required" });
          return;
        }

        if (this.activeSessions.has(sessionToken)) {
          const session = this.activeSessions.get(sessionToken);
          
          const sessionAge = Date.now() - session.createdAt;
          if (sessionAge > this.getSessionDuration()) {
            this.activeSessions.delete(sessionToken);
            client.send("heartbeat_response", { status: "expired" });
            return;
          }

          // ✅ NOUVEAU : Mettre à jour playtime
          if (session.username) {
            try {
              const user = await PlayerData.findOne({ username: session.username });
              if (user && user.currentSessionStart) {
                const sessionTime = Math.floor((Date.now() - user.currentSessionStart.getTime()) / (1000 * 60));
                user.totalPlaytime = (user.totalPlaytime || 0) + sessionTime;
                user.currentSessionStart = new Date(); // Reset pour prochaine mesure
                await user.save();
              }
            } catch (error) {
              console.error('❌ Erreur update playtime:', error);
            }
          }

          session.lastActivity = Date.now();
          client.send("heartbeat_response", { status: "ok", serverTime: Date.now() });
          
        } else {
          try {
            const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
            
            this.activeSessions.set(sessionToken, {
              username: decoded.username,
              userId: decoded.userId,
              lastActivity: Date.now(),
              createdAt: Date.now(),
              fromHeartbeat: true
            });
            
            client.send("heartbeat_response", { status: "ok", restored: true });
            
          } catch (jwtError) {
            client.send("heartbeat_response", { status: "expired" });
          }
        }

      } catch (error) {
        console.error('❌ Erreur heartbeat:', error);
        client.send("heartbeat_response", { status: "error" });
      }
    });

    // ✅ HANDLER : Logout sécurisé
    this.onMessage("user_logout", async (client, payload) => {
      try {
        const { sessionToken } = payload;
        
        if (sessionToken && this.activeSessions.has(sessionToken)) {
          const session = this.activeSessions.get(sessionToken);
          
          // ✅ NOUVEAU : Finaliser playtime
          if (session.username) {
            try {
              const user = await PlayerData.findOne({ username: session.username });
              if (user && user.currentSessionStart) {
                const sessionTime = Math.floor((Date.now() - user.currentSessionStart.getTime()) / (1000 * 60));
                user.totalPlaytime = (user.totalPlaytime || 0) + sessionTime;
                user.currentSessionStart = null; // Fin de session
                await user.save();
                console.log(`⏰ Playtime mis à jour pour ${user.username}: +${sessionTime}min (total: ${user.totalPlaytime}min)`);
              }
            } catch (error) {
              console.error('❌ Erreur finalize playtime:', error);
            }
          }
          
          this.activeSessions.delete(sessionToken);
          console.log(`👋 Déconnexion volontaire: ${session.username}`);
        }
        
        client.send("logout_result", { status: "ok" });
        
      } catch (error) {
        console.error('❌ Erreur logout:', error);
        client.send("logout_result", { status: "error" });
      }
    });

    // ✅ HANDLER : Liaison wallet sécurisée
    this.onMessage("link_wallet", async (client, payload) => {
      console.log("🔗 [AuthRoom] === WALLET LINK REQUEST ===");
      console.log("👤 Client:", client.sessionId);
      console.log("📊 Payload:", { 
        username: payload.username, 
        hasToken: !!payload.sessionToken,
        tokenLength: payload.sessionToken?.length,
        address: payload.address,
        walletType: payload.walletType
      });
      
      try {
        const { username, sessionToken, address, signature, message, walletType } = payload;
        
        // ✅ VÉRIFICATION SESSION AMÉLIORÉE avec debug
        if (!sessionToken) {
          console.log("❌ [AuthRoom] Pas de sessionToken");
          client.send("wallet_linked", { 
            status: "error", 
            reason: "No session token provided" 
          });
          return;
        }

        // Debug état des sessions actives
        console.log("🔍 [AuthRoom] Sessions actives:", this.activeSessions.size);
        console.log("🔍 [AuthRoom] Token dans activeSessions:", this.activeSessions.has(sessionToken));

        // ✅ VALIDATION SESSION UNIFIÉE
        const sessionCheck = await this.validateSession(sessionToken);
        if (!sessionCheck.valid) {
          console.log("❌ [AuthRoom] Session invalide");
          client.send("wallet_linked", { 
            status: "error", 
            reason: "Invalid or expired session" 
          });
          return;
        }

        if (sessionCheck.username !== username) {
          console.log("❌ [AuthRoom] Username mismatch");
          client.send("wallet_linked", { 
            status: "error", 
            reason: "Session username mismatch" 
          });
          return;
        }

        console.log(`✅ [AuthRoom] Session validée pour ${sessionCheck.username}`);

        // ✅ VÉRIFIER la signature wallet
        const isValid = await this.verifySlushSignature(address, signature, message);
        if (!isValid) {
          client.send("wallet_linked", { 
            status: "error", 
            reason: "Invalid wallet signature" 
          });
          return;
        }

        // ✅ VÉRIFIER que l'adresse n'est pas déjà utilisée
        const existingWallet = await PlayerData.findOne({ 
          walletAddress: address,
          username: { $ne: username } 
        });
        
        if (existingWallet) {
          client.send("wallet_linked", { 
            status: "error", 
            reason: "This wallet is already linked to another account" 
          });
          return;
        }

        // ✅ SAUVEGARDER l'adresse wallet
        await PlayerData.updateOne(
          { username },
          { 
            walletAddress: address,
            lastLogin: new Date() // Mise à jour timestamp
          }
        );

        client.send("wallet_linked", {
          status: "ok",
          address,
          walletType
        });

        console.log(`✅ Wallet lié: ${username} → ${address} (${walletType})`);

      } catch (error) {
        console.error('❌ Erreur wallet linking:', error);
        client.send("wallet_linked", { 
          status: "error", 
          reason: "Server error during wallet linking" 
        });
      }
    });

    // ✅ HANDLERS EXISTANTS (compatibilité)
    this.onMessage("authenticate", async (client, payload) => {
      console.log("📨 Demande d'authentification wallet (ancien système):", {
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

        const isValid = await this.verifySlushSignature(address, signature, message);
        if (!isValid) throw new Error("Signature invalide");

        console.log("✅ Authentification wallet réussie pour", address);
        this.authenticatedClients.set(client.sessionId, address);
        (client as any).auth = { address, walletType };
        this.state.address = address;
        this.state.connectedPlayers = this.authenticatedClients.size;

        client.send("authenticated", {
          status: "ok",
          address,
          sessionId: client.sessionId,
        });

      } catch (error: any) {
        console.error("❌ Erreur d'authentification wallet:", error);
        this.disconnectClient(client, error.message);
      }
    });

    this.onMessage("username_auth", async (client, payload) => {
      console.log("📨 Demande d'authentification username (ancien système):", payload);

      try {
        const { username } = payload;
        
        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
          client.send("username_result", { 
            status: "error", 
            reason: "Username invalide (3-20 caractères, lettres/chiffres seulement)" 
          });
          return;
        }

        let player = await PlayerData.findOne({ username: username });
        
        if (player) {
          client.send("username_result", { 
            status: "ok", 
            username: username,
            existing: true,
            userData: {
              coins: player.gold || 0,
              level: 1,
            }
          });
        } else {
          const newPlayer = new PlayerData({
            username: username,
            gold: 1000,
            lastX: 300,
            lastY: 300,
            lastMap: "beach"
          });
          
          await newPlayer.save();
          
          client.send("username_result", { 
            status: "ok", 
            username: username,
            existing: false,
            userData: {
              coins: newPlayer.gold,
              level: 1,
              lastMap: newPlayer.lastMap,
              lastX: newPlayer.lastX,
              lastY: newPlayer.lastY
            }
          });
        }

        this.authenticatedClients.set(client.sessionId, username);
        (client as any).auth = { address: username, walletType: "username" };
        this.state.connectedPlayers = this.authenticatedClients.size;

      } catch (error: any) {
        console.error("❌ Erreur authentification username:", error);
        client.send("username_result", { 
          status: "error", 
          reason: "Erreur base de données: " + error.message 
        });
      }
    });

    this.onMessage("ping", (client) => {
      client.send("pong", { time: Date.now() });
    });
  }

  // ✅ MÉTHODE AMÉLIORÉE pour récupérer l'IP avec DEBUG COMPLET
 private getClientIP(client: Client): string {
  try {
    console.log(`🔍 [AuthRoom] === RÉCUPÉRATION IP pour ${client.sessionId} ===`);
    
    // ✅ PRIORITÉ 1: IP injectée par le middleware global
    const detectedIP = (client as any).detectedIP;
    if (detectedIP && detectedIP !== 'unknown') {
      console.log(`✅ [AuthRoom] IP via middleware: ${detectedIP}`);
      
      // Analyser le type d'IP
      if (detectedIP.startsWith('127.') || detectedIP === 'localhost') {
        console.log(`🏠 [IP] Connexion locale: ${detectedIP}`);
        return 'localhost';
      } else if (detectedIP.startsWith('192.168.') || detectedIP.startsWith('10.')) {
        console.log(`🏢 [IP] Réseau privé: ${detectedIP}`);
        return `local_${detectedIP}`;
      } else {
        console.log(`🌐 [IP] IP publique: ${detectedIP}`);
        return detectedIP;
      }
    }
    
    // ✅ PRIORITÉ 2: Fallback vers les propriétés Colyseus (si middleware échoue)
    const headers = (client as any).request?.headers || {};
    const connection = (client as any).request?.connection || {};
    
    console.log(`🔍 [AuthRoom] Fallback - Headers:`, {
      'x-real-ip': headers['x-real-ip'],
      'x-forwarded-for': headers['x-forwarded-for'],
      'x-client-ip': headers['x-client-ip']
    });
    
    const fallbackSources = [
      headers['x-real-ip'],
      headers['x-forwarded-for']?.split(',')[0]?.trim(),
      headers['x-client-ip'],
      connection.remoteAddress
    ];
    
    for (const ip of fallbackSources) {
      if (ip && this.isValidIP(ip)) {
        const cleanedIP = this.cleanIP(ip);
        console.log(`✅ [AuthRoom] IP via fallback: ${cleanedIP}`);
        return cleanedIP;
      }
    }
    
    // ✅ PRIORITÉ 3: Dernier recours
    console.log(`⚠️ [AuthRoom] Utilisation localhost par défaut`);
    return 'localhost';
    
  } catch (error) {
    console.error(`❌ [AuthRoom] Erreur récupération IP:`, error);
    return 'localhost';
  }
}

  // ✅ MÉTHODE AMÉLIORÉE: Valider une IP (plus permissive)
  private isValidIP(ip: string): boolean {
    if (!ip || ip === 'unknown' || ip.length < 3) return false;
    
    // Nettoyer d'abord
    const cleanedIP = ip.split(':')[0].trim();
    
    // IPv4 check (plus permissif)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(cleanedIP)) {
      const parts = cleanedIP.split('.');
      const validParts = parts.every(part => {
        const num = parseInt(part);
        return !isNaN(num) && num >= 0 && num <= 255;
      });
      if (validParts) {
        console.log(`✅ IP IPv4 valide: ${cleanedIP}`);
        return true;
      }
    }
    
    // IPv6 check
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (ipv6Regex.test(cleanedIP)) {
      console.log(`✅ IP IPv6 valide: ${cleanedIP}`);
      return true;
    }
    
    // Adresses spéciales acceptées
    const specialAddresses = [
      '127.0.0.1', 'localhost', '::1', '0.0.0.0'
    ];
    
    if (specialAddresses.includes(cleanedIP)) {
      console.log(`✅ IP spéciale valide: ${cleanedIP}`);
      return true;
    }
    
    // Réseaux privés acceptés
    if (cleanedIP.startsWith('192.168.') || 
        cleanedIP.startsWith('10.') || 
        cleanedIP.startsWith('172.')) {
      console.log(`✅ IP réseau privé valide: ${cleanedIP}`);
      return true;
    }
    
    console.log(`❌ IP invalide: ${cleanedIP}`);
    return false;
  }

  // ✅ MÉTHODE AMÉLIORÉE: Nettoyer l'IP (plus robuste)
  private cleanIP(ip: string): string {
    if (!ip) return 'unknown';
    
    // Nettoyer la chaîne
    let cleanedIP = ip.toString().trim();
    
    // Retirer les ports (IPv4)
    if (cleanedIP.includes(':') && !cleanedIP.includes('::')) {
      // IPv4 avec port
      cleanedIP = cleanedIP.split(':')[0];
    }
    
    // Retirer les caractères de formatage
    cleanedIP = cleanedIP.replace(/[\[\]]/g, ''); // Enlever [] des IPv6
    
    // Mapping des IPs spéciales
    const mappings: { [key: string]: string } = {
      '127.0.0.1': 'localhost',
      '::1': 'localhost',
      'localhost': 'localhost',
      '0.0.0.0': 'localhost'
    };
    
    if (mappings[cleanedIP]) {
      return mappings[cleanedIP];
    }
    
    // Préfixer les réseaux privés
    if (cleanedIP.startsWith('192.168.') || cleanedIP.startsWith('10.')) {
      return `local_${cleanedIP}`;
    }
    
    return cleanedIP;
  }

  // ✅ NOUVELLE MÉTHODE: Générer IP de fallback
  private generateFallbackIP(client: Client, headers: any): string {
    const userAgent = headers['user-agent'] || '';
    const acceptLanguage = headers['accept-language'] || '';
    const sessionId = client.sessionId;
    
    // Créer un hash unique basé sur les infos disponibles
    const fingerprint = `${userAgent}_${acceptLanguage}_${sessionId}`.slice(0, 50);
    const hash = this.simpleHash(fingerprint);
    
    return `unknown_${hash}`;
  }

  // ✅ NOUVELLE MÉTHODE: Hash simple
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  // ✅ MÉTHODES UTILITAIRES de sécurité

  private validateRegistrationData(username: string, email: string, password: string) {
    if (!username || username.length < 3 || username.length > 20) {
      return { valid: false, reason: "Username must be between 3 and 20 characters" };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, reason: "Username can only contain letters, numbers, - and _" };
    }

    // Usernames interdits
    const prohibitedUsernames = [
      'admin', 'administrator', 'root', 'system', 'null', 'undefined', 
      'bot', 'moderator', 'support', 'help', 'api', 'www', 'mail',
      'pokeworld', 'pokemon', 'nintendo', 'gamefreak'
    ];
    
    if (prohibitedUsernames.includes(username.toLowerCase())) {
      return { valid: false, reason: "This username is not allowed" };
    }

    if (email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email)) {
      return { valid: false, reason: "Please enter a valid email address" };
    }

    // Domaines email jetables interdits
    if (email) {
      const disposableDomains = [
        'tempmail.org', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'throwaway.email', 'temp-mail.org', 'getairmail.com', 'fake-mail.org'
      ];
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(emailDomain)) {
        return { valid: false, reason: "Disposable email addresses are not allowed" };
      }
    }

    if (!password || password.length < 8) {
      return { valid: false, reason: "Password must be at least 8 characters long" };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { valid: false, reason: "Password must contain at least one uppercase letter, lowercase letter, and number" };
    }

    // Mots de passe faibles interdits
    const weakPasswords = [
      'password', '12345678', 'qwerty123', 'password123', 'abcdefgh',
      'pokemon123', 'pokeworld', '123456789', 'qwertyui'
    ];
    if (weakPasswords.includes(password.toLowerCase())) {
      return { valid: false, reason: "This password is too common. Please choose a stronger password." };
    }

    return { valid: true };
  }

  private generateJWT(payload: any): string {
    return jwt.sign(
      {
        ...payload,
        isDev: payload.isDev || false
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: '6h',
        issuer: 'pokeworld-auth',
        audience: 'pokeworld-game'
      }
    );
  }

  private getSessionDuration(): number {
    const duration = process.env.SESSION_DURATION || '6h';
    // Convertir en millisecondes
    if (duration.endsWith('h')) {
      return parseInt(duration) * 60 * 60 * 1000;
    } else if (duration.endsWith('m')) {
      return parseInt(duration) * 60 * 1000;
    } else if (duration.endsWith('d')) {
      return parseInt(duration) * 24 * 60 * 60 * 1000;
    }
    return 6 * 60 * 60 * 1000; // Défaut 6h
  }

  private isRateLimited(ip: string, action: string): boolean {
    const key = `${ip}_${action}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = action === 'register' ? 5 : 10;

    if (!this.rateLimitByIP.has(key)) {
      this.rateLimitByIP.set(key, { count: 1, lastAttempt: now });
      return false;
    }

    const limit = this.rateLimitByIP.get(key)!;
    
    // Reset si fenêtre expirée
    if (now - limit.lastAttempt > windowMs) {
      this.rateLimitByIP.set(key, { count: 1, lastAttempt: now });
      return false;
    }

    // Incrémenter et vérifier limite
    limit.count++;
    limit.lastAttempt = now;
    
    return limit.count > maxAttempts;
  }

  private recordFailedAttempt(ip: string, action: string): void {
    const key = `${ip}_${action}`;
    const now = Date.now();
    
    if (!this.rateLimitByIP.has(key)) {
      this.rateLimitByIP.set(key, { count: 1, lastAttempt: now });
    } else {
      const limit = this.rateLimitByIP.get(key)!;
      limit.count++;
      limit.lastAttempt = now;
    }
    
    console.log(`⚠️ Tentative échouée ${action} depuis ${ip} (${this.rateLimitByIP.get(key)?.count} tentatives)`);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxAge = this.getSessionDuration();
    let cleanedCount = 0;

    for (const [token, session] of this.activeSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.activeSessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Nettoyage: ${cleanedCount} sessions expirées supprimées`);
    }

    // Nettoyer aussi les rate limits expirés
    const rateLimitWindowMs = 15 * 60 * 1000;
    for (const [key, limit] of this.rateLimitByIP.entries()) {
      if (now - limit.lastAttempt > rateLimitWindowMs) {
        this.rateLimitByIP.delete(key);
      }
    }
  }

  private calculatePlaytime(createdAt: Date): number {
    // Calculer le temps de jeu approximatif en minutes
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60)); // Convertir en minutes
  }

  // ✅ MÉTHODES EXISTANTES (compatibilité)

  async verifySlushSignature(address: string, signature: string, message: string): Promise<boolean> {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const publicKey = await verifyPersonalMessage(messageBytes, signature);

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
    
    // ✅ NOUVEAU: Log IP à la connexion
    const clientIP = this.getClientIP(client);
    console.log(`🌐 IP détectée: ${clientIP}`);
    
    client.send("welcome", {
      message: "Bienvenue dans l'AuthRoom. Veuillez vous authentifier.",
      sessionId: client.sessionId,
      serverTime: Date.now()
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👤 Client ${client.sessionId} a quitté (consentement: ${consented})`);
    
    // Nettoyer les sessions liées à ce client
    const address = this.authenticatedClients.get(client.sessionId);
    if (address) {
      this.authenticatedClients.delete(client.sessionId);
      this.state.connectedPlayers = this.authenticatedClients.size;
      this.broadcast("playerLeft", { address });
    }

    // Nettoyer les sessions JWT si possible (recherche par sessionId)
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.clientSessionId === client.sessionId) {
        this.activeSessions.delete(token);
        console.log(`🧹 Session JWT nettoyée pour client ${client.sessionId}`);
        break;
      }
    }
  }

  onDispose() {
    console.log("🗑️ AuthRoom supprimée");
    
    // Nettoyage complet
    this.authenticatedClients.clear();
    this.activeSessions.clear();
    this.failedAttempts.clear();
    this.rateLimitByIP.clear();
    
    console.log("✅ Nettoyage AuthRoom terminé");
  }

  // ✅ MÉTHODES publiques pour monitoring

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  public getSessionsInfo(): any {
    const sessions = Array.from(this.activeSessions.values());
    return {
      total: sessions.length,
      byIP: this.groupBy(sessions, 'clientIP'),
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt)) : null
    };
  }

  private groupBy(array: any[], key: string): { [key: string]: number } {
    return array.reduce((result, item) => {
      const group = item[key] || 'unknown';
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  private async validateSession(sessionToken: string): Promise<{ valid: boolean, username?: string }> {
    if (!sessionToken) {
      return { valid: false };
    }
    
    // Vérifier dans activeSessions
    if (this.activeSessions.has(sessionToken)) {
      const session = this.activeSessions.get(sessionToken);
      return { valid: true, username: session.username };
    }
    
    // Fallback: restaurer depuis JWT
    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
      
      // Vérifier expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.log(`⏰ [AuthRoom] JWT expiré pour ${decoded.username}`);
        return { valid: false };
      }
      
      // Restaurer la session
      this.activeSessions.set(sessionToken, {
        username: decoded.username,
        userId: decoded.userId,
        lastActivity: Date.now(),
        createdAt: decoded.iat * 1000 || Date.now(),
        restored: true
      });
      
      console.log(`🔄 [AuthRoom] Session restaurée pour ${decoded.username}`);
      return { valid: true, username: decoded.username };
      
    } catch (error) {
      console.error(`❌ [AuthRoom] JWT invalide:`, error);
      return { valid: false };
    }
  }
}
