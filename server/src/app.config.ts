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
import { connectDB } from "./db";
import { AuthRoom } from "./rooms/AuthRoom";
import { MoveManager } from "./managers/MoveManager";
import { PokemonManager } from "./managers/PokemonManager";
import { WorldChatRoom } from "./rooms/WorldChatRoom";
import { getServerConfig } from "./config/serverConfig";
import { PlayerQuest } from "./models/PlayerQuest";

let globalPokemonManager: PokemonManager;
let globalMoveManager: MoveManager;

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define('AuthRoom', AuthRoom);
    gameServer.define('Road1Room', Road1Room);
    gameServer.define('BeachRoom', BeachRoom);
    gameServer.define('VillageRoom', VillageRoom);
    gameServer.define('VillageLabRoom', VillageLabRoom);
gameServer.define('VillageHouse1Room', VillageHouse1Room);
gameServer.define('LavandiaRoom', LavandiaRoom);
gameServer.define('worldchat', WorldChatRoom);
  },

  initializeExpress: (app) => {
    app.get("/hello_world", (req, res) => {
      res.send("Welcome to PokeWorld!");
    });

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

    app.use(express.static(path.join(__dirname, '../client/dist')));

    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
    }

    app.use("/monitor", monitor());
  },

  beforeListen: async () => {
    try {
      await connectDB();
      console.log("✅ Connected to MongoDB: pokeworld");
    // === ICI TON RESET QUESTS ===
    const config = getServerConfig();
    if (config.autoresetQuest) {
      await PlayerQuest.deleteMany({});
      console.log("🔥 PlayerQuest vidé (auto-reset activé)");
    }
    // ============================
      console.log("🔄 Initialisation du MoveManager...");
      globalMoveManager = new MoveManager({
        basePath: './src/data',
        useDevFallback: true,
        enableCache: true
      });
      console.log("✅ MoveManager initialisé");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    }
  }
});

export { globalMoveManager, globalPokemonManager };
