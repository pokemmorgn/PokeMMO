/**
 * Point d’entrée du serveur Colyseus
 * ──────────────────────────────────
 * 1.  Création d’un serveur **HTTP** local (pas de TLS ici)
 * 2.  Lancement de Colyseus + Express via `@colyseus/tools`
 * 3.  Écoute uniquement sur localhost:2567
 *
 * La couche HTTPS est terminée par Nginx ➜ voir la conf Nginx (proxy_pass).
 */

import http from "http";
import { listen } from "@colyseus/tools";      // helper Colyseus
import appConfig from "./app.config";          // ta configuration (rooms, express, etc.)

// ────────────────────────────────────────────────────────────
// 1. Création d’un serveur HTTP « nu » (Node.js natif)
const server = http.createServer();            // !! PAS https.createServer !!

// 2. Lancement de Colyseus + Express sur ce serveur
listen(appConfig, { server, port: 2567 })      // le port doit rester 2567
  .then(() => {
    // 3. Log de démarrage
    console.log("✅ Colyseus HTTP prêt sur http://localhost:2567");
  })
  .catch((err) => {
    console.error("❌ Erreur au démarrage du serveur Colyseus :", err);
    process.exit(1);
  });
