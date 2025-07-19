import express from 'express';
import path from 'path';
import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { PlayerData } from "./models/PlayerData";
import { BeachRoom } from "./rooms/BeachRoom";
import { VillageRoom } from "./rooms/VillageRoom";
import { Road1Room } from "./rooms/Road1Room";
import { VillageLabRoom } from "./rooms/VillageLabRoom";
import { VillageHouse1Room } from "./rooms/VillageHouse1Room";
import { LavandiaRoom } from "./rooms/LavandiaRoom";
import { WorldRoom } from "./rooms/WorldRoom";
import { connectDB } from "./db";
import { AuthRoom } from "./rooms/AuthRoom";
import { MoveManager } from "./managers/MoveManager";
import battleRoutes from './routes/battleRoutes';
import { PokemonManager } from "./managers/PokemonManager";
import { WorldChatRoom } from "./rooms/WorldChatRoom";
import { getServerConfig } from "./config/serverConfig";
import { PlayerQuest } from "./models/PlayerQuest";
import { BattleRoom } from "./rooms/BattleRoom";
import jwt from 'jsonwebtoken';

let globalPokemonManager: PokemonManager;

export default config({
  initializeGameServer: (gameServer) => {
    // ✅ NOUVEAU: Middleware pour capturer l'IP
    gameServer.onAuth = (client: any, options: any, req: any) => {
      const headers = req?.headers || {};
      
      const ipSources = [
        headers['x-real-ip'],                 // Nginx
        headers['x-forwarded-for']?.split(',')[0]?.trim(),
        headers['x-client-ip'],
        '127.0.0.1'
      ];
      
      let detectedIP = 'localhost';
      for (const ip of ipSources) {
        if (ip && ip !== 'unknown' && ip.length > 3) {
          detectedIP = ip;
          break;
        }
      }
      
      client.detectedIP = detectedIP;
      console.log(`🌐 [IP] Client ${client.sessionId}: ${detectedIP}`);
      
      return true;
    };
    // ✅ ENREGISTREMENT des rooms avec AuthRoom en priorité
    gameServer.define('AuthRoom', AuthRoom);
    gameServer.define('world', WorldRoom);
    gameServer.define('worldchat', WorldChatRoom);
    gameServer.define("battle", BattleRoom)
      .enableRealtimeListing();
    
    console.log("✅ Toutes les rooms enregistrées (AuthRoom, WorldRoom, WorldChatRoom, BattleRoom)");
  },

  initializeExpress: (app) => {
    // ✅ MIDDLEWARE pour parser JSON
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.set('trust proxy', true);


    // ✅ MIDDLEWARE de sécurité basique
    app.use((req, res, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    });

    // ✅ ROUTE de base améliorée
    app.get("/hello_world", (req, res) => {
      res.json({
        message: "Welcome to PokeWorld!",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        authentication: "enabled"
      });
    });

    // ✅ ROUTE de santé du système
    app.get("/health", async (req, res) => {
      try {
        // Vérifier MongoDB
        const playerCount = await PlayerData.countDocuments();
        
        // Vérifier variables d'environnement critiques
        const envCheck = {
          mongodb: !!process.env.MONGODB_URI,
          jwt: !!process.env.JWT_SECRET,
          port: !!process.env.PORT
        };

        res.json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          database: {
            connected: true,
            totalPlayers: playerCount
          },
          environment: envCheck,
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(500).json({
          status: "unhealthy",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    });

    // ✅ MIDDLEWARE d'authentification JWT
    const authenticateJWT = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Token invalide ou expiré' });
      }
    };

    // ✅ NOUVEAU: MIDDLEWARE pour développeurs uniquement
    const requireDev = async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token requis' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const player = await PlayerData.findOne({ username: decoded.username });
        if (!player || !player.isDev) {
          return res.status(403).json({ error: 'Accès développeur requis' });
        }

        req.user = decoded;
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
      }
    };

    // ✅ API pour récupérer les données du joueur (sécurisée)
    app.get("/api/playerData", authenticateJWT, async (req: any, res) => {
      try {
        const username = req.query.username || req.user.username;
        
        if (!username) {
          return res.status(400).json({ error: "Username manquant" });
        }

        // Vérifier que l'utilisateur demande ses propres données ou a les permissions
        if (req.user.username !== username && !req.user.permissions?.includes('admin')) {
          return res.status(403).json({ error: "Accès refusé" });
        }
        
        const player = await PlayerData.findOne({ username }).select('-password -deviceFingerprint');
        if (!player) {
          return res.status(404).json({ error: "Joueur non trouvé" });
        }
        
        res.json({
          username: player.username,
          email: player.email,
          lastMap: player.lastMap,
          lastX: player.lastX,
          lastY: player.lastY,
          gold: player.gold,
          level: player.level,
          experience: player.experience,
          walletAddress: player.walletAddress,
          createdAt: player.createdAt,
          lastLogin: player.lastLogin,
          loginCount: player.loginCount,
          playtime: player.totalPlaytime || 0,
          isActive: player.isActive
        });
      } catch (err) {
        console.error('❌ Erreur API playerData:', err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // ✅ API pour vérifier la disponibilité d'un username
    app.post("/api/check-username", async (req, res) => {
      try {
        const { username } = req.body;
        
        if (!username || username.length < 3) {
          return res.json({ available: false, reason: "Username trop court" });
        }

        const existing = await PlayerData.findOne({ 
          username: { $regex: new RegExp(`^${username}$`, 'i') } 
        });
        
        res.json({ 
          available: !existing,
          reason: existing ? "Username déjà pris" : "Username disponible"
        });
      } catch (error) {
        console.error('❌ Erreur check username:', error);
        res.status(500).json({ available: false, reason: "Erreur serveur" });
      }
    });

    // ✅ API pour vérifier la disponibilité d'un email
    app.post("/api/check-email", async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.json({ available: false, reason: "Email requis" });
        }

        const existing = await PlayerData.findOne({ 
          email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });
        
        res.json({ 
          available: !existing,
          reason: existing ? "Email déjà utilisé" : "Email disponible"
        });
      } catch (error) {
        console.error('❌ Erreur check email:', error);
        res.status(500).json({ available: false, reason: "Erreur serveur" });
      }
    });

    // ✅ NOUVELLES ROUTES DEV

    // Stats dev
    app.get("/api/dev/stats", requireDev, async (req: any, res) => {
      try {
        const totalPlayers = await PlayerData.countDocuments();
        const activePlayers = await PlayerData.countDocuments({ isActive: true });
        const developers = await PlayerData.countDocuments({ isDev: true });
        
        res.json({
          totalPlayers,
          activePlayers,
          developers,
          uptime: Math.floor(process.uptime()),
          memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          requestedBy: req.user.username
        });
      } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // Promouvoir dev
    app.post("/api/dev/promote", requireDev, async (req: any, res) => {
      try {
        const { username } = req.body;
        if (!username) {
          return res.status(400).json({ error: "Username requis" });
        }

        const player = await PlayerData.findOne({ username });
        if (!player) {
          return res.status(404).json({ error: "Joueur non trouvé" });
        }

        if (player.isDev) {
          return res.status(400).json({ error: "Déjà développeur" });
        }

        player.isDev = true;
        await player.save();

        console.log(`🔧 ${req.user.username} a promu ${username} en développeur`);
        
        res.json({ message: `${username} est maintenant développeur` });
      } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // Lister les devs
    app.get("/api/dev/list", requireDev, async (req: any, res) => {
      try {
        const devs = await PlayerData.find({ isDev: true })
          .select('username email isActive createdAt lastLogin');
        
        res.json({
          developers: devs.map(dev => ({
            username: dev.username,
            email: dev.email,
            isActive: dev.isActive,
            createdAt: dev.createdAt,
            lastLogin: dev.lastLogin
          })),
          total: devs.length
        });
      } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // Dashboard dev
    app.get("/dev", requireDev, (req: any, res) => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Dev Dashboard - PokeWorld</title>
    <style>
        body { font-family: Arial; background: #0d1117; color: #c9d1d9; padding: 20px; }
        .card { background: #161b22; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #30363d; }
        .stat { background: #21262d; padding: 15px; margin: 10px 0; border-radius: 5px; }
        button { background: #238636; color: white; border: none; padding: 10px 20px; 
                 border-radius: 6px; cursor: pointer; margin: 5px; }
        button:hover { background: #2ea043; }
        input { background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; 
                padding: 8px; border-radius: 4px; margin: 5px; }
    </style>
</head>
<body>
    <h1>🔧 Dev Dashboard - PokeWorld</h1>
    <p>Connecté en tant que: <strong>${req.user.username}</strong></p>
    
    <div class="card">
        <h3>📊 Statistiques Serveur</h3>
        <div id="stats">Chargement...</div>
        <button onclick="loadStats()">🔄 Actualiser</button>
    </div>
    
    <div class="card">
        <h3>👥 Gestion Développeurs</h3>
        <div id="devs">Chargement...</div>
        <br>
        <input type="text" id="promoteUser" placeholder="Username à promouvoir">
        <button onclick="promoteUser()">⬆️ Promouvoir en Dev</button>
        <button onclick="loadDevs()">🔄 Actualiser Liste</button>
    </div>
    
    <div class="card">
        <h3>🛠️ Outils</h3>
        <button onclick="window.open('/monitor', '_blank')">📊 Monitor Colyseus</button>
        <button onclick="window.open('/playground', '_blank')">🎮 Playground</button>
        <button onclick="window.open('/health', '_blank')">💚 Health Check</button>
    </div>

    <script>
        const token = localStorage.getItem('sessionToken');
        
        async function loadStats() {
            try {
                const res = await fetch('/api/dev/stats', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await res.json();
                document.getElementById('stats').innerHTML = 
                    '<div class="stat"><strong>Joueurs total:</strong> ' + data.totalPlayers + '</div>' +
                    '<div class="stat"><strong>Joueurs actifs:</strong> ' + data.activePlayers + '</div>' +
                    '<div class="stat"><strong>Développeurs:</strong> ' + data.developers + '</div>' +
                    '<div class="stat"><strong>Uptime:</strong> ' + Math.floor(data.uptime / 60) + ' minutes</div>' +
                    '<div class="stat"><strong>Mémoire:</strong> ' + data.memory + '</div>';
            } catch (e) {
                alert('Erreur stats: ' + e.message);
            }
        }
        
        async function loadDevs() {
            try {
                const res = await fetch('/api/dev/list', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await res.json();
                let html = '<p><strong>Total:</strong> ' + data.total + ' développeur(s)</p>';
                data.developers.forEach(dev => {
                    html += '<div class="stat">' + dev.username + 
                           (dev.isActive ? ' 🟢' : ' 🔴') + '</div>';
                });
                document.getElementById('devs').innerHTML = html;
            } catch (e) {
                alert('Erreur devs: ' + e.message);
            }
        }
        
        async function promoteUser() {
            const username = document.getElementById('promoteUser').value;
            if (!username) return alert('Username requis');
            
            try {
                const res = await fetch('/api/dev/promote', {
                    method: 'POST',
                    headers: { 
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username })
                });
                const data = await res.json();
                alert(data.message || data.error);
                document.getElementById('promoteUser').value = '';
                loadDevs();
            } catch (e) {
                alert('Erreur: ' + e.message);
            }
        }
        
        // Charger au démarrage
        loadStats();
        loadDevs();
    </script>
</body>
</html>
      `);
    });

    // ✅ API pour les statistiques (admin uniquement)
    app.get("/api/admin/stats", authenticateJWT, async (req: any, res) => {
      try {
        // Vérifier permissions admin
        if (!req.user.permissions?.includes('admin')) {
          return res.status(403).json({ error: "Permissions admin requises" });
        }

        const stats = await Promise.all([
          PlayerData.countDocuments(),
          PlayerData.countDocuments({ isActive: true }),
          PlayerData.countDocuments({ walletAddress: { $exists: true, $ne: null } }),
          PlayerData.countDocuments({ 
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
          })
        ]);

        res.json({
          totalPlayers: stats[0],
          activePlayers: stats[1],
          playersWithWallet: stats[2],
          newPlayersLast24h: stats[3],
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Erreur stats admin:', error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // ✅ Routes de combat (sécurisées)
    app.use('/api/battle', authenticateJWT, battleRoutes);
    console.log("✅ Routes de combat configurées avec authentification");

    // ✅ ROUTE pour servir la page d'authentification
    app.get("/auth", (req, res) => {
      res.sendFile(path.join(__dirname, '../../client/public/auth.html'));
    });

    // ✅ Redirection racine vers auth si pas connecté
    app.get("/", (req, res) => {
      // Vérifier si il y a un token valide dans les cookies ou headers
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.sessionToken;
      
      if (token) {
        try {
          jwt.verify(token, process.env.JWT_SECRET!);
          // Token valide, servir le jeu
          res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
        } catch (error) {
          // Token invalide, rediriger vers auth
          res.redirect('/auth');
        }
      } else {
        // Pas de token, rediriger vers auth
        res.redirect('/auth');
      }
    });

    // ✅ Fichiers statiques (client du jeu)
    app.use(express.static(path.join(__dirname, '../../client/dist')));
    app.use('/public', express.static(path.join(__dirname, '../../client/public')));

    // ✅ Route catch-all pour SPA (single page application)
    app.get('/index.html', (req, res) => {
      res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });

    // ✅ Outils de développement
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
      console.log("🛠️ Playground disponible sur /playground");
    }
    
    // ✅ MONITOR SÉCURISÉ (devs uniquement)
    app.use("/monitor", requireDev, monitor());
    console.log("📊 Monitor sécurisé sur /monitor (devs uniquement)");

    // ✅ Gestion des erreurs 404
    app.use((req, res) => {
      res.status(404).json({
        error: "Route non trouvée",
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // ✅ Gestion des erreurs globales
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('❌ Erreur Express:', error);
      res.status(500).json({
        error: "Erreur serveur interne",
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    });
  },

  beforeListen: async () => {
    try {
      console.log("🚀 === INITIALISATION SERVEUR POKEWORLD ===");
      
      // ✅ VÉRIFICATIONS de sécurité
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET manquant dans les variables d'environnement");
      }
      
      if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI manquant dans les variables d'environnement");
      }

      // ✅ CONNEXION à la base de données
      await connectDB();
      console.log("✅ Connecté à MongoDB: pokeworld");

      // ✅ VÉRIFICATION de l'index unique sur username
      try {
        await PlayerData.collection.createIndex(
          { username: 1 }, 
          { unique: true, collation: { locale: 'en', strength: 2 } }
        );
        await PlayerData.collection.createIndex(
          { email: 1 }, 
          { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } }
        );
        console.log("✅ Index MongoDB créés/vérifiés");
      } catch (indexError) {
        console.log("ℹ️ Index MongoDB déjà existants");
      }

      // ✅ NOUVEAU: Corriger l'index walletAddress
      try {
        await PlayerData.collection.dropIndex("walletAddress_1");
        console.log("🗑️ Ancien index walletAddress supprimé");
      } catch (e) {
        console.log("ℹ️ Index walletAddress n'existait pas ou déjà supprimé");
      }

      await PlayerData.collection.createIndex(
        { walletAddress: 1 }, 
        { unique: true, sparse: true }
      );
      console.log("✅ Index walletAddress corrigé (sparse = plusieurs null OK)");

      // ✅ RESET QUESTS (si configuré)
      const config = getServerConfig();
      if (config.autoresetQuest) {
        await PlayerQuest.deleteMany({});
        console.log("🔥 PlayerQuest vidé (auto-reset activé)");
      }

      // ✅ INITIALISATION du système de combat
      console.log("⚔️ Initialisation du système de combat...");
      
      // Initialiser MoveManager
      console.log("📋 Initialisation du MoveManager...");
      await MoveManager.initialize();

      // Initialiser PokemonManager
      if (!globalPokemonManager) {
        globalPokemonManager = new PokemonManager({
          basePath: './src/data/pokemon',
          enableCache: true
        });
        await globalPokemonManager.loadPokemonIndex();
        console.log("✅ PokemonManager initialisé");
      }

      console.log("✅ Système de combat initialisé");

      // ✅ STATISTIQUES de démarrage
      try {
        const totalPlayers = await PlayerData.countDocuments();
        const activePlayers = await PlayerData.countDocuments({ isActive: true });
        const developers = await PlayerData.countDocuments({ isDev: true });
        const playersWithWallet = await PlayerData.countDocuments({ 
          walletAddress: { $exists: true, $ne: null } 
        });
        
        console.log("📊 === STATISTIQUES SERVEUR ===");
        console.log(`👥 Joueurs total: ${totalPlayers}`);
        console.log(`✅ Joueurs actifs: ${activePlayers}`);
        console.log(`🔧 Développeurs: ${developers}`);
        console.log(`💰 Avec wallet: ${playersWithWallet}`);
        console.log("==================================");
      } catch (statsError) {
        console.log("⚠️ Impossible de récupérer les statistiques");
      }

      console.log("🚀 Serveur PokeWorld prêt avec système dev sécurisé !");

    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation:", err);
      process.exit(1);
    }
  }
});

export { globalPokemonManager };
