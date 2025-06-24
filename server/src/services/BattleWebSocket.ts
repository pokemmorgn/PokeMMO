// server/src/services/BattleWebSocket.ts
export class BattleWebSocket {
  static notifyBattleUpdate(battleId: string, update: any) {
    // Envoie les mises à jour aux clients connectés
    // gameServer.rooms.get(battleId)?.broadcast(update);
  }
}
