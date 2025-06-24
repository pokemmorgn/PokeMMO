// client/src/services/BattleService.ts
class BattleService {
  private static baseUrl = '/api/battle';

  static async startBattle(opponentType: string, opponentId?: string) {
    const response = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentType, opponentId })
    });
    return response.json();
  }

  static async executeTurn(battleId: string, action: string, moveId?: string) {
    const response = await fetch(`${this.baseUrl}/execute-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId, action, moveId })
    });
    return response.json();
  }

  static async getBattleState(battleId: string) {
    const response = await fetch(`${this.baseUrl}/state/${battleId}`);
    return response.json();
  }
}
