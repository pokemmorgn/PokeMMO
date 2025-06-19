// ==========================================
// VillageRoom.ts - Version avec support des channels  
// ==========================================
import { Client } from "@colyseus/core";
import { BaseChannelRoom } from "./BaseChannelRoom";

export class VillageRoom extends BaseChannelRoom {
  public mapName = "VillageRoom";
  protected defaultX = 428;
  protected defaultY = 445;

  onCreate(options: any) {
    super.onCreate(options);
    console.log(`🏘️ VillageRoom créée [Channel ${this.channelIndex}]:`, this.roomId);
    
    // Logique spécifique au Village si nécessaire
    this.setupVillageSpecificFeatures();
  }

  private setupVillageSpecificFeatures() {
    // Exemple : événements spéciaux au village
    this.clock.setTimeout(() => {
      this.broadcast("environmentMessage", {
        message: `🏘️ Bienvenue au village de GreenRoot ! [Channel ${this.channelIndex + 1}]`,
        type: "info"
      });
    }, 2000);

    // Exemple : marché du village toutes les 5 minutes
    this.clock.setInterval(() => {
      if (this.state.players.size > 0) {
        this.broadcast("villageEvent", {
          type: "market",
          message: "🛒 Le marché du village ouvre ses portes !",
          channel: this.channelIndex
        });
      }
    }, 5 * 60 * 1000);
  }

  // Override pour gérer les features spéciales du village
  async onJoin(client: Client, options: any) {
    await super.onJoin(client, options);
    
    // Message de bienvenue spécial pour le village
    client.send("villageWelcome", {
      message: `Bienvenue dans le village ! Vous êtes sur le canal ${this.channelIndex + 1}`,
      channelIndex: this.channelIndex,
      villageFeatures: [
        "🏪 Boutiques disponibles",
        "🔬 Laboratoire Pokémon", 
        "🏠 Maisons visitables",
        "🛤️ Route vers l'aventure"
      ]
    });
  }
}