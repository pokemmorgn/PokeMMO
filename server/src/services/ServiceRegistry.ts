// server/src/services/ServiceRegistry.ts
import { QuestManager } from "../managers/QuestManager";

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private questManager: QuestManager | null = null;
  private worldRoom: any = null; // Pour les notifications

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  // Enregistrer QuestManager
  registerQuestManager(questManager: QuestManager): void {
    this.questManager = questManager;
    console.log(`📋 QuestManager enregistré dans ServiceRegistry`);
  }

  // Enregistrer WorldRoom (pour les notifications)
  registerWorldRoom(worldRoom: any): void {
    this.worldRoom = worldRoom;
    console.log(`📋 WorldRoom enregistré dans ServiceRegistry`);
  }

  // Accès public au QuestManager
  getQuestManager(): QuestManager | null {
    if (!this.questManager) {
      console.error(`❌ QuestManager non disponible dans ServiceRegistry`);
    }
    return this.questManager;
  }

// Accès public au WorldRoom
getWorldRoom(): any | null {
  if (!this.worldRoom) {
    console.warn(`⚠️ WorldRoom non disponible dans ServiceRegistry`);
  }
  return this.worldRoom;
}

  // Helper pour notifier un joueur (utilisé par QuestManager)
  notifyPlayer(playerName: string, eventType: string, data: any): boolean {
    if (!this.worldRoom) {
      console.warn(`⚠️ WorldRoom non disponible pour notifications`);
      return false;
    }

    try {
      for (const [sessionId, player] of this.worldRoom.state.players) {
        if (player.name === playerName) {
          const client = this.worldRoom.clients.find((c: any) => c.sessionId === sessionId);
          if (client) {
            client.send(eventType, data);
            console.log(`📤 Notification envoyée à ${playerName}: ${eventType}`);
            return true;
          }
        }
      }
      console.warn(`⚠️ Client non trouvé pour ${playerName}`);
      return false;
    } catch (error) {
      console.error(`❌ Erreur notification:`, error);
      return false;
    }
  }

  // Helper pour distribuer les récompenses (utilisé par QuestManager)
  async distributeReward(playerName: string, reward: any): Promise<boolean> {
    if (!this.worldRoom) {
      console.warn(`⚠️ WorldRoom non disponible pour récompenses`);
      return false;
    }

    try {
      switch (reward.type) {
        case 'gold':
          const success = await this.worldRoom.updatePlayerGold(playerName, reward.amount);
          console.log(`💰 ${playerName} reçoit ${reward.amount} gold: ${success}`);
          return success;

        case 'item':
          const itemSuccess = await this.worldRoom.giveItemToPlayer(playerName, reward.itemId, reward.amount || 1);
          console.log(`📦 ${playerName} reçoit ${reward.amount || 1}x ${reward.itemId}: ${itemSuccess}`);
          return itemSuccess;

        case 'experience':
          // TODO: Implémenter système d'XP
          console.log(`⭐ ${playerName} reçoit ${reward.amount} XP`);
          return true;

        default:
          console.warn(`⚠️ Type de récompense inconnu: ${reward.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Erreur distribution récompense:`, error);
      return false;
    }
  }
}
