// server/src/managers/InteractionManager.ts

export class InteractionManager {
  constructor(npcManager) {
    this.npcManager = npcManager; // pour accéder à la liste/infos des npcs
  }

  // Interaction principale
  handleNpcInteraction(player, npcId) {
    const npc = this.npcManager.getNpcById(npcId);
    if (!npc) return { type: "error", message: "NPC inconnu." };

    // Vérifier la distance (ex : 64px)
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx > 64 || dy > 64) return { type: "error", message: "Trop loin du NPC." };

    // Logique : on renvoie le type d’interaction selon le npc
    // (ici tu peux faire évoluer selon le jeu : dialogue, shop, soins...)
    if (npc.properties.shop) {
      return { type: "shop", shopId: npc.properties.shop };
    } else if (npc.properties.healer) {
      return { type: "heal", message: "Vos Pokémon sont soignés !" };
    } else {
      // Dialogue par défaut
      return { type: "dialogue", lines: [npc.properties.dialogue || "Bonjour !"] };
    }
  }
}
