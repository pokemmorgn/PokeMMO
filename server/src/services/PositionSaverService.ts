// server/src/services/PositionSaverService.ts
import { PlayerData } from "../models/PlayerData";

export interface PlayerPosition {
  username: string;
  x: number;
  y: number;
  zone: string;
}

export class PositionSaverService {
  private static instance: PositionSaverService;
  private pendingSaves = new Set<string>();

  private constructor() {}

  static getInstance(): PositionSaverService {
    if (!this.instance) {
      this.instance = new PositionSaverService();
    }
    return this.instance;
  }

  // ✅ SAUVEGARDE SIMPLE
  async savePosition(position: PlayerPosition, reason?: string): Promise<boolean> {
    // Éviter les sauvegardes simultanées du même joueur
    if (this.pendingSaves.has(position.username)) {
      console.log(`⏳ Sauvegarde ${position.username} déjà en cours`);
      return false;
    }

    this.pendingSaves.add(position.username);

    try {
      console.log(`💾 Sauvegarde position ${position.username}: (${position.x}, ${position.y}) dans ${position.zone}${reason ? ` - ${reason}` : ''}`);

      await PlayerData.findOneAndUpdate(
        { username: position.username },
        {
          lastX: Math.round(position.x),
          lastY: Math.round(position.y),
          lastMap: position.zone
        },
        { upsert: true }
      );

      console.log(`✅ Position sauvée pour ${position.username}`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${position.username}:`, error);
      return false;
    } finally {
      this.pendingSaves.delete(position.username);
    }
  }

  // ✅ SAUVEGARDE MULTIPLE (pour auto-save)
  async saveMultiplePositions(positions: PlayerPosition[]): Promise<number> {
    console.log(`💾 Sauvegarde batch de ${positions.length} positions`);
    
    const savePromises = positions
      .filter(pos => !this.pendingSaves.has(pos.username))
      .map(pos => this.savePosition(pos, "batch"));

    const results = await Promise.allSettled(savePromises);
    const successes = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Batch terminé: ${successes}/${positions.length} réussies`);
    return successes;
  }

  // ✅ HELPER POUR EXTRAIRE POSITION DEPUIS PLAYER
  extractPosition(player: any): PlayerPosition {
    return {
      username: player.name,
      x: player.x,
      y: player.y,
      zone: player.currentZone || "beach"
    };
  }
}
