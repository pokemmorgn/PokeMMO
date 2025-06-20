// PokeMMO/server/src/managers/NpcManager.ts

import fs from "fs";
import path from "path";

// Structure d'un NPC
export interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties: Record<string, any>;
}

export class NpcManager {
  npcs: NpcData[] = [];

  constructor(mapPath: string) {
    this.loadNpcsFromMap(mapPath);
  }
  loadNpcsFromMap(mapPath: string) {
    // Correction ici : chemin absolu basé sur le dossier du fichier actuel
    const resolvedPath = path.resolve(__dirname, mapPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`NpcManager: Le fichier map n'existe pas : ${resolvedPath}`);
    }
    const mapData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    const npcLayer = mapData.layers.find((l: any) => l.name === "npcs");
    if (!npcLayer || !npcLayer.objects) return;

    for (const obj of npcLayer.objects) {
      const propMap: Record<string, any> = {};
      if (obj.properties) {
        for (const prop of obj.properties) {
          propMap[prop.name] = prop.value;
        }
      }

      this.npcs.push({
        id: obj.id,
        name: obj.name || propMap['Nom'] || "NPC",
        sprite: propMap['sprite'] || "npc_placeholder",
        x: obj.x,
        y: obj.y,
        properties: propMap,
      });
    }
  }

  getAllNpcs(): NpcData[] {
    return this.npcs;
  }

  getNpcById(id: number): NpcData | undefined {
    return this.npcs.find(npc => npc.id === id);
  }
}
