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
import { BattleRoom } from './rooms/BattleRoom';
import { battleRoutes } from './routes/battleRoutes';
import { PokemonManager } from "./managers/PokemonManager";
import { WorldChatRoom } from "./rooms/WorldChatRoom";
import { getServerConfig } from "./config/serverConfig";
import { PlayerQuest } from "./models/PlayerQuest";

let globalPokemonManager: PokemonManager;
let globalMoveManager: MoveManager;

export default config({
  initializeGameServer: (gameServer) => {
    // Enregistrement des rooms
    gameServer.define('AuthRoom', AuthRoom);
    gameServer.define('world', WorldRoom);
    gameServer.define('worldchat', WorldChatRoom);
    gameServer.define('battle', BattleRoom)
      .enableRealtimeListing();
    
    console.log("✅ Toutes les rooms enregistrées (AuthRoom, WorldRoom, WorldChatRoom, BattleRoom)");
  },

  initializeExpress: (app) => {
    // Route de base
    app.get("/hello_world", (req, res) => {
      res.send("Welcome to PokeWorld!");
    });

    // API pour récupérer les données du joueur
    app.get("/api/playerData", async (req, res) => {
      const username = req.query.username;
      if (!username) return res.status(400).json({ error: "username manquant" });
      
      try {
        const player = await PlayerData.findOne({ username });
        if (!player) return res.status(404).json({ error: "not found" });
        
        res.json({
          lastMap: player.lastMap,
          lastX: player.lastX,
          lastY: player.lastY,
          gold: player.gold,
          walletAddress: player.walletAddress
        });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    // ✅ Routes de combat
    app.use('/api/battle', battleRoutes);
    console.log("✅ Routes de combat configurées");

    // Fichiers statiques
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Outils de développement
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
    }
    app.use("/monitor", monitor());
  },

  beforeListen: async () => {
    try {
      // Connexion à la base de données
      await connectDB();
      console.log("✅ Connected to MongoDB: pokeworld");

      // === RESET QUESTS (si configuré) ===
      const config = getServerConfig();
      if (config.autoresetQuest) {
        await PlayerQuest.deleteMany({});
        console.log("🔥 PlayerQuest vidé (auto-reset activé)");
      }
      // ====================================

      // ✅ Initialisation du système de combat
      console.log("🔄 Initialisation du système de combat...");
      
      // Initialiser MoveManager
      console.log("🔄 Initialisation du MoveManager...");
      globalMoveManager = new MoveManager({
        basePath: './src/data',
        useDevFallback: true,
        enableCache: true
      });
      
      // Initialiser le MoveManager pour le système de combat
      const { MoveManager: BattleMoveManager } = await import('./managers/MoveManager');
      await BattleMoveManager.initialize();
      
      console.log("✅ MoveManager initialisé");
      
      // Initialiser PokemonManager si pas déjà fait
      if (!globalPokemonManager) {
        globalPokemonManager = new PokemonManager({
          basePath: './src/data/pokemon',
          enableCache: true
        });
        await globalPokemonManager.loadPokemonIndex();
        console.log("✅ PokemonManager initialisé");
      }

      console.log("✅ Système de combat initialisé");

    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation:", err);
      process.exit(1);
    }
  }
});

export { globalMoveManager, globalPokemonManager };
