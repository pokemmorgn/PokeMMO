import { listen } from "@colyseus/tools";
import appConfig from "./app.config";
import https from "https";
import fs from "fs";

// Lis les certificats Let's Encrypt
const sslOptions = {
  cert: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/privkey.pem'),
};

// Crée le serveur HTTPS
const server = https.createServer(sslOptions);

// Lance Colyseus en écoutant sur le serveur HTTPS
listen(appConfig, { server, port: 2567 }).then(() => {
  console.log("✅ Serveur Colyseus lancé sur https://pokerune.cloud:2567 (SSL direct)");
});