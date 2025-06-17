import fs from "fs";
import https from "https";
import { Server } from "colyseus";
import appConfig from "./app.config";

const sslOptions = {
  key: fs.readFileSync("/home/ubuntu/pokerune_certs/privkey.pem"),
  cert: fs.readFileSync("/home/ubuntu/pokerune_certs/fullchain.pem"),
};

const httpsServer = https.createServer(sslOptions);

const gameServer = new Server({
  server: httpsServer,
});

(async () => {
  if (appConfig.initializeGameServer) appConfig.initializeGameServer(gameServer);
  if (appConfig.beforeListen) await appConfig.beforeListen();

  httpsServer.listen(2567, () => {
    console.log("✅ Serveur HTTPS lancé sur https://pokerune.cloud:2567");
  });
})();
