
// ==========================================
// BeachRoom.ts - Version avec support des channels
// ==========================================
import { BaseChannelRoom } from "./BaseChannelRoom";

export class BeachRoom extends BaseChannelRoom {
  public mapName = "BeachRoom";
  protected defaultX = 52;
  protected defaultY = 48;

  onCreate(options: any) {
    super.onCreate(options);
    console.log(`🏖️ BeachRoom créée [Channel ${this.channelIndex}]:`, this.roomId);
    
    // Logique spécifique à Beach si nécessaire
    this.setupBeachSpecificFeatures();
  }

  private setupBeachSpecificFeatures() {
    // Exemple : événements spéciaux à la plage
    this.clock.setTimeout(() => {
      this.broadcast("environmentMessage", {
        message: `🌊 Bienvenue sur la plage ! [Channel ${this.channelIndex + 1}]`,
        type: "info"
      });
    }, 2000);
  }
}
