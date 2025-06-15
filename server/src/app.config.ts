import express from 'express';
import path from 'path';
import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

import { PokeWorldRoom } from "./rooms/PokeWorldRoom";
import { connectDB } from "./db";

export default config({

    initializeGameServer: (gameServer) => {
        gameServer.define('PokeWorld', PokeWorldRoom);
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
