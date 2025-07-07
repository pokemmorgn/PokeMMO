// server/src/data/loadAllMoves.ts

import fs from "fs";
import path from "path";

// Dépend du contexte d'exécutioN
const movesIndex = require("./moves-index.json"); // { moveName: type }
const MOVES_PATH = path.join(__dirname, "moves");

function loadAllMoves(): Record<string, any> {
  // Log au tout début pour vérifier le chargement
  console.log("🔄 [ALL_MOVES] Lancement du chargement de toutes les attaques Pokémon…");

  const allMoves: Record<string, any> = {};

  let loaded = 0, notFound = 0;

  for (const [moveName, type] of Object.entries(movesIndex)) {
    const typeStr = String(type);
    const typeFile = path.join(MOVES_PATH, `${typeStr}.json`);

    if (!fs.existsSync(typeFile)) {
      notFound++;
      continue;
    }
    let movesOfType: Record<string, any> = {};
    try {
      movesOfType = JSON.parse(fs.readFileSync(typeFile, "utf8"));
    } catch (e) {
      console.warn(`⚠️ [ALL_MOVES] Erreur lecture JSON: ${typeFile}`, e);
      notFound++;
      continue;
    }

    const moveData = movesOfType[moveName];
    if (moveData) {
      allMoves[moveName] = {
        moveId: moveName,
        type: typeStr.charAt(0).toUpperCase() + typeStr.slice(1),
        ...moveData,
        maxPp: moveData.pp,
      };
      loaded++;
    } else {
      // Move absent dans le fichier, fallback par défaut
      allMoves[moveName] = {
        moveId: moveName,
        type: typeStr.charAt(0).toUpperCase() + typeStr.slice(1),
        name: moveName,
        category: "Physical",
        power: 40,
        accuracy: 100,
        pp: 35,
        maxPp: 35,
        priority: 0,
        description: "Default move",
      };
      notFound++;
    }
  }

  // 🟢 Log d'autotest au démarrage
  console.log(
    `🟢 [ALL_MOVES] Chargement des attaques terminé : ${loaded} moves trouvés, ${notFound} moves manquants ou partiels.`
  );
  return allMoves;
}

export const ALL_MOVES = loadAllMoves();
