import fs from "fs";
import https from "https";
import { listen } from "@colyseus/tools";
import app from "./app.config";

// Lire les certificats Let's Encrypt
const sslOptions = {
  key: fs.readFileSync("/etc/letsencrypt/live/pokerune.cloud/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/pokerune.cloud/fullchain.pem"),
};

// Crée un serveur HTTPS
const server = https.createServer(sslOptions);

// Lancer Colyseus + Express avec ce serveur HTTPS
listen(app, { server }).then(() => {
  console.log("✅ Serveur HTTPS lancé sur https://pokerune.cloud");
});
