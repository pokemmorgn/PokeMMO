import express from 'express';
import path from 'path';
import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

import { BeachRoom } from "./rooms/BeachRoom";
import { VillageRoom } from "./rooms/VillageRoom";
import { Road1Room } from "./rooms/Road1Room"; // ✅ AJOUT : Import de Road1Room
import { connectDB } from "./db";

export default config({
  initializeGameServer: (gameServer) => {
    // Définition des rooms par zone
	gameServer.define('Road1Room', Road1Room),
    gameServer.define('BeachRoom', BeachRoom),
    gameServer.define('VillageRoom', VillageRoom);
  },

  initializeExpress: (app) => {
    app.get("/hello_world", (req, res) => {
      res.send("Welcome to PokeWorld!");
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
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    }
  }
});
