/**
 * Entrée principale du serveur Colyseus – écoute **uniquement** en HTTP local.
 * Le chiffrement TLS est géré par Nginx (reverse-proxy).
 */

import { listen } from "@colyseus/tools";
import appConfig from "./app.config";

// Lance Colyseus sur 127.0.0.1:2567 (HTTP)
listen(appConfig, 2567).then(() => {
  console.log("✅ Colyseus écoute sur http://127.0.0.1:2567");
});