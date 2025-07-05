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

type LastMove = { x: number; y: number; t: number };

export class MovementController {
  private lastMoves: Map<string, LastMove>;
  private readonly MAX_SPEED: number = 250; // px/sec
  private readonly POS_EPSILON: number = 6; // px

  constructor() {
    this.lastMoves = new Map();
  }

  handleMove(
    sessionId: string,
    playerState: PlayerState,
    data: MoveData,
    skipAnticheat: boolean = false
  ): { x: number; y: number; direction: string; isMoving: boolean; snapped: boolean } {
    const now = Date.now();

    if (skipAnticheat) {
      this.lastMoves.set(sessionId, { x: data.x, y: data.y, t: now });
      return {
        x: data.x,
        y: data.y,
        direction: data.direction,
        isMoving: data.isMoving,
        snapped: false
      };
    }

    const lastMove = this.lastMoves.get(sessionId) || { x: playerState.x, y: playerState.y, t: now - 100 };
    const dt = Math.max((now - lastMove.t) / 1000, 0.016);

    const dx = data.x - playerState.x;
    const dy = data.y - playerState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / dt;

    if (speed > this.MAX_SPEED) {
      console.warn(`[ANTICHEAT][${sessionId}] CHEAT DETECTED: speed=${speed.toFixed(1)}px/s > max=${this.MAX_SPEED}, snap to (${playerState.x},${playerState.y})`);
      this.lastMoves.set(sessionId, { x: playerState.x, y: playerState.y, t: now });
      return {
        x: playerState.x,
        y: playerState.y,
        direction: playerState.direction,
        isMoving: false,
        snapped: true
      };
    }

    this.lastMoves.set(sessionId, { x: data.x, y: data.y, t: now });
    return {
      x: data.x,
      y: data.y,
      direction: data.direction,
      isMoving: data.isMoving,
      snapped: false
    };
  }

  resetPlayer(sessionId: string) {
 //   console.log(`[ANTICHEAT][${sessionId}] resetPlayer() appelé, suppression lastMoves`);
    this.lastMoves.delete(sessionId);
  }
}

export default MovementController;
