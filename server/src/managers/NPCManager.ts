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

  updateQuestIndicators(questStatuses) {
  console.log("🔄 Mise à jour des indicateurs de quête:", questStatuses);
  
  questStatuses.forEach(status => {
    const visuals = this.npcVisuals.get(status.npcId);
    if (visuals && this.isGameObjectValid(visuals.nameContainer)) {
      this.updateQuestIndicator(visuals.nameContainer, status.type);
    }
  });
}
  updateQuestIndicator(nameContainer, questType) {
  // Supprimer l'ancien indicateur s'il existe
  const oldIndicator = nameContainer.getByName('questIndicator');
  if (oldIndicator) {
    oldIndicator.destroy();
  }

  let indicatorText = '';
  let indicatorColor = 0xFFFFFF;

  switch (questType) {
    case 'questAvailable':
      indicatorText = '!';
      indicatorColor = 0xFFD700; // Jaune doré
      break;
    case 'questInProgress':
      indicatorText = '?';
      indicatorColor = 0x808080; // Gris
      break;
    case 'questReadyToComplete':
      indicatorText = '?';
      indicatorColor = 0xFFD700; // Jaune doré
      break;
    default:
      return; // Pas d'indicateur
  }

  // Créer le nouvel indicateur
  const indicator = this.scene.add.text(25, -12, indicatorText, {
    fontFamily: "monospace",
    fontSize: "14px",
    color: `#${indicatorColor.toString(16).padStart(6, '0')}`,
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 2
  }).setOrigin(0.5, 0.5);
  
  indicator.name = 'questIndicator';
  nameContainer.add(indicator);

  // Animation de pulsation
  this.scene.tweens.add({
    targets: indicator,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 800,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1
  });
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
