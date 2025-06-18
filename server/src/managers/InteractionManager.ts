// src/managers/InteractionManager.ts

import { NpcManager, NpcData } from "./NPCManager";
import { Player } from "../schema/PokeWorldState";

export interface NpcInteractionResult {
  type: string;
  message?: string;
  shopId?: string;
  lines?: string[];
}

export class InteractionManager {
  private npcManager: NpcManager;

  constructor(npcManager: NpcManager) {
    this.npcManager = npcManager;
  }

  handleNpcInteraction(player: Player, npcId: number): NpcInteractionResult {
    const npc: NpcData | undefined = this.npcManager.getNpcById(npcId);
    if (!npc) {
      return { type: "error", message: "NPC inconnu." };
    }

    // Vérifie la proximité (par exemple 64px)
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx > 64 || dy > 64) {
      return { type: "error", message: "Trop loin du NPC." };
    }

    // Différents types d'interaction selon les propriétés du NPC
    if (npc.properties.shop) {
      return { type: "shop", shopId: npc.properties.shop };
    } else if (npc.properties.healer) {
      return { type: "heal", message: "Vos Pokémon sont soignés !" };
    } else if (npc.properties.dialogue) {
      // Dialogue peut être string ou tableau de strings
      const lines = Array.isArray(npc.properties.dialogue)
        ? npc.properties.dialogue
        : [npc.properties.dialogue];
      return { type: "dialogue", lines };
    } else {
      return { type: "dialogue", lines: ["Bonjour !"] };
    }
  }
}
