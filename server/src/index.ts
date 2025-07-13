// ✅ FORCER le chargement depuis src/
require('dotenv').config({ path: __dirname + '/.env' });

// ✅ VÉRIFICATION immédiate
console.log('🔍 === VÉRIFICATION VARIABLES D\'ENVIRONNEMENT ===');
console.log('- Fichier .env existe:', require('fs').existsSync(__dirname + '/.env'));
console.log('- MongoDB:', process.env.MONGODB_URI ? 'Configuré ✅' : 'Manquant ❌');
console.log('- JWT Secret:', process.env.JWT_SECRET ? 'Configuré ✅' : 'Manquant ❌');
console.log('- Port:', process.env.PORT || 'Défaut (2567)');
console.log('- Node Env:', process.env.NODE_ENV || 'Défaut');

// Import de la configuration après chargement .env
import { listen } from "@colyseus/tools";
import appConfig from "./app.config";

// Démarrer le serveur
const port = parseInt(process.env.PORT || '2567');
listen(appConfig, port);
