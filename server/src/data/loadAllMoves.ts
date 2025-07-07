// server/src/data/loadAllMoves.ts

import fs from "fs";
import path from "path";

// Pour adapter, change "./moves-index.json" selon l'endroit d'appel
const movesIndex = require("./moves-index.json"); // { moveName: type }
const MOVES_PATH = path.join(__dirname, "moves");

function loadAllMoves() {
  const allMoves: Record<string, any> = {};

  let loaded = 0, notFound = 0;

  for (const [moveName, type] of Object.entries(movesIndex)) {
    const typeFile = path.join(MOVES_PATH, `${type}.json`);
    if (!fs.existsSync(typeFile)) {
      notFound++;
      continue;
    }
    const movesOfType = JSON.parse(fs.readFileSync(typeFile, "utf8"));
    const moveData = movesOfType[moveName];
    if (moveData) {
      allMoves[moveName] = {
        moveId: moveName,
        type: type.charAt(0).toUpperCase() + type.slice(1),
        ...moveData,
        maxPp: moveData.pp,
      };
      loaded++;
    } else {
      allMoves[moveName] = {
        moveId: moveName,
        type,
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
    `🟢 [ALL_MOVES] Chargement des attaques : ${loaded} moves trouvés, ${notFound} moves manquants ou partiels.`
  );
  return allMoves;
}

export const ALL_MOVES = loadAllMoves();
