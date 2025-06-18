// src/server/controllers/MovementController.ts

type MoveData = {
  x: number;
  y: number;
  direction: string;
  isMoving: boolean;
};

type PlayerState = {
  x: number;
  y: number;
  direction: string;
  isMoving: boolean;
};

interface IMapManager {
  checkCollision(x: number, y: number): boolean;
}

type LastMove = { x: number; y: number; t: number };

export class MovementController {
  private mapManager: IMapManager;
  private lastMoves: Map<string, LastMove>;
  private readonly MAX_SPEED: number = 400; // px/sec, à adapter
  private readonly POS_EPSILON: number = 6; // px, marge snap

  constructor(mapManager: IMapManager) {
    this.mapManager = mapManager;
    this.lastMoves = new Map();
  }

  /**
   * Valide et applique un mouvement demandé par un joueur
   * @param sessionId 
   * @param playerState État actuel serveur du joueur
   * @param data Mouvement proposé par le client
   * @returns Mouvement validé/corrigé par le serveur
   */
  handleMove(
    sessionId: string,
    playerState: PlayerState,
    data: MoveData
  ): { x: number; y: number; direction: string; isMoving: boolean; snapped: boolean } {
    const now = Date.now();
    const lastMove = this.lastMoves.get(sessionId) || { x: playerState.x, y: playerState.y, t: now - 100 };
    const dt = Math.max((now - lastMove.t) / 1000, 0.016); // secondes, min 16ms

    // Calcul du déplacement
    const dx = data.x - playerState.x;
    const dy = data.y - playerState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / dt;

    // 1. Vérifie la vitesse
    if (speed > this.MAX_SPEED) {
      this.lastMoves.set(sessionId, { x: playerState.x, y: playerState.y, t: now });
      return {
        x: playerState.x,
        y: playerState.y,
        direction: playerState.direction,
        isMoving: false,
        snapped: true
      };
    }

    // 2. Vérifie la collision
    if (this.mapManager && this.mapManager.checkCollision(data.x, data.y)) {
      this.lastMoves.set(sessionId, { x: playerState.x, y: playerState.y, t: now });
      return {
        x: playerState.x,
        y: playerState.y,
        direction: playerState.direction,
        isMoving: false,
        snapped: true
      };
    }

    // 3. Mouvement autorisé
    this.lastMoves.set(sessionId, { x: data.x, y: data.y, t: now });
    return {
      x: data.x,
      y: data.y,
      direction: data.direction,
      isMoving: data.isMoving,
      snapped: false
    };
  }

  /** Optionnel : Reset quand déco */
  resetPlayer(sessionId: string) {
    this.lastMoves.delete(sessionId);
  }
}

export default MovementController;
