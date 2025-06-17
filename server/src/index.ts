import fs from "fs";
import https from "https";
import { listen } from "@colyseus/tools";
import app from "./app.config";

const sslOptions = {
  key: fs.readFileSync("/home/ubuntu/pokerune_certs/privkey.pem"),
  cert: fs.readFileSync("/home/ubuntu/pokerune_certs/fullchain.pem"),
};

const server = https.createServer(sslOptions);

listen(app, { server }).then(() => {
  console.log("✅ Serveur HTTPS lancé sur https://pokerune.cloud");
});
