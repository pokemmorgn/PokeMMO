import fs from "fs";
import https from "https";
import { Server } from "colyseus";
import appConfig from "./app.config";

// Créer un serveur HTTPS
const sslOptions = {
  key: fs.readFileSync("/home/ubuntu/pokerune_certs/privkey.pem"),
  cert: fs.readFileSync("/home/ubuntu/pokerune_certs/fullchain.pem"),
};
const httpsServer = https.createServer(sslOptions);

// Créer et démarrer le GameServer Colyseus manuellement
const gameServer = new Server({
  server: httpsServer,
});

appConfig.initializeGameServer?.(gameServer);
appConfig.beforeListen?.().then(() => {
  httpsServer.listen(2567, () => {
    console.log("✅ Serveur HTTPS lancé sur https://pokerune.cloud:2567");
  });
});
