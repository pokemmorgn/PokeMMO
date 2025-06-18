import { NpcManager } from "./NPCManager";

export class InteractionManager {
  private npcManager: NpcManager;
  constructor(npcManager: NpcManager) {
    this.npcManager = npcManager;
  }

  handleNpcInteraction(player, npcId: number) {
    const npc = this.npcManager.getNpcById(npcId);
    if (!npc) return { type: "error", message: "NPC inconnu." };

    // Optionnel : vérifie la distance, etc.
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx > 64 || dy > 64) return { type: "error", message: "Trop loin du NPC." };

    // Exemple de logique de réponse (à adapter selon tes propriétés)
    if (npc.properties.shop) {
      return { type: "shop", shopId: npc.properties.shop };
    } else if (npc.properties.healer) {
      return { type: "heal", message: "Vos Pokémon sont soignés !" };
    } else {
      return { type: "dialogue", lines: [npc.properties.dialogue || "Bonjour !"] };
    }
  }
}
