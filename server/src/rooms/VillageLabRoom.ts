// ===============================================
// VillageLabRoom.ts - Room du labo du village, héritant de BaseRoom
// ===============================================
import { BaseRoom } from "./BaseRoom";
import { Client } from "@colyseus/core";

export class VillageLabRoom extends BaseRoom {
  protected mapName = "VillageLabRoom";
  protected defaultX = 300;
  protected defaultY = 200;

  // Calcul du spawn selon la zone de destination
public calculateSpawnPosition(targetZone: string): { x: number, y: number } {
  switch (targetZone) {
    case "VillageScene":
      return { x: 248, y: 364 }; // Position où spawn le joueur s'il vient de BeachScene
    default:
      return { x: this.defaultX, y: this.defaultY };
  }
}



  // Ajout des messages custom (interactions labo)
  onCreate(options: any): void {
    super.onCreate(options);

    this.onMessage("interactWithProfessor", (client: Client) => {
      console.log(`[VillageLabRoom] ${client.sessionId} interagit avec le professeur`);
      client.send("professorDialog", {
        message: "Bonjour ! Bienvenue dans mon laboratoire !",
        options: ["Recevoir un Pokémon", "Informations", "Fermer"],
      });
    });

    this.onMessage("selectStarter", (client: Client, data: { pokemon: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        console.log(`[VillageLabRoom] ${player.name} sélectionne ${data.pokemon} comme starter`);
        client.send("starterReceived", {
          pokemon: data.pokemon,
          message: `Félicitations ! Vous avez reçu ${data.pokemon} !`,
        });
      }
    });

    console.log("[VillageLabRoom] Room créée :", this.roomId);
  }

  // Ajout possible de message de bienvenue, hook sur onJoin (optionnel)
  async onJoin(client: Client, options: any): Promise<void> {
    await super.onJoin(client, options);
    client.send("welcomeToLab", {
      message: "Bienvenue dans le laboratoire du Professeur !",
      canReceiveStarter: true
    });
  }
}
