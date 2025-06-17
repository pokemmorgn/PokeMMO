import { listen } from "@colyseus/tools";
import appConfig from "./app.config";
import https from "https";
import fs from "fs";

const httpsOptions = {
    cert: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/pokerune.cloud/privkey.pem')
};
const httpsServer = https.createServer(httpsOptions);

listen(appConfig, 2567, httpsServer).then(() => {
    console.log("✅ Colyseus écoute sur https://pokerune.cloud:2567");
});