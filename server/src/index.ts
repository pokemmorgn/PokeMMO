import fs   from "fs";
import https from "https";
import { listen } from "@colyseus/tools";   // <-- (pas “colyseus” !)
import appConfig from "./app.config";

// ───── Certificats Let’s Encrypt
const sslOptions = {
  key : fs.readFileSync("/home/ubuntu/pokerune_certs/privkey.pem"),
  cert: fs.readFileSync("/home/ubuntu/pokerune_certs/fullchain.pem"),
};

// ───── Crée le serveur HTTPS
const httpsServer = https.createServer(sslOptions);

// ───── Lance Colyseus + Express sur ce serveur
listen(appConfig, {            // 1er paramètre = app.config
  server: httpsServer,         // 2ᵉ paramètre = objet d’options
  port  : 2567                 // (le port DOIT rester 2567)
}).then(() => {
  console.log("✅ Serveur HTTPS lancé sur https://pokerune.cloud:2567");
});