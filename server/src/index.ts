import { listen } from "@colyseus/tools";
import appConfig from "./app.config";
import https from 'https';
import fs from 'fs';

// Configuration SSL
const httpsOptions = {
    cert: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/privkey.pem')
};

// Créer serveur HTTPS
const server = https.createServer(httpsOptions);

listen(appConfig, 2567, server).then(() => {
    console.log(`✅ Colyseus écoute sur https://pokerune.cloud:2567`);
});