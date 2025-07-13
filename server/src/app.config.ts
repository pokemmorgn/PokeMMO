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
    
    app.use("/monitor", monitor());
    console.log("📊 Monitor disponible sur /monitor");

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
  console.log("🗑️ Index walletAddress supprimé");
} catch (e) {
  console.log("ℹ️ Pas d'index à supprimer");
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
        const playersWithWallet = await PlayerData.countDocuments({ 
          walletAddress: { $exists: true, $ne: null } 
        });
        
        console.log("📊 === STATISTIQUES SERVEUR ===");
        console.log(`👥 Joueurs total: ${totalPlayers}`);
        console.log(`✅ Joueurs actifs: ${activePlayers}`);
        console.log(`💰 Avec wallet: ${playersWithWallet}`);
        console.log("==================================");
      } catch (statsError) {
        console.log("⚠️ Impossible de récupérer les statistiques");
      }

      console.log("🚀 Serveur PokeWorld prêt avec authentification sécurisée !");

    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation:", err);
      process.exit(1);
    }
  }
});

export { globalPokemonManager };
