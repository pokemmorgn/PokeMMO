// server/src/managers/MoveManager.ts
import fs from 'fs/promises';
import path from 'path';

export interface MoveData {
  id: string;
  name: string;
  type: string;
  category: "Physical" | "Special" | "Status";
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  description: string;
  effects?: string[];
  contact?: boolean;
}

export class MoveManager {
  private static moves: Map<string, MoveData> = new Map();
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    try {
      // Charger tous les fichiers de moves
      const moveTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 
                        'fighting', 'poison', 'ground', 'flying', 'psychic', 
                        'bug', 'rock', 'ghost'];

      for (const type of moveTypes) {
        try {
          const filePath = path.join(__dirname, `../data/moves/${type}.json`);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const movesData = JSON.parse(fileContent);

          for (const [moveId, moveData] of Object.entries(movesData)) {
            this.moves.set(moveId, {
              id: moveId,
              type: type.charAt(0).toUpperCase() + type.slice(1),
              contact: true, // Par défaut, sera ajusté selon le move
              ...moveData as any
            });
          }

          console.log(`✅ Attaques ${type} chargées (${Object.keys(movesData).length})`);
        } catch (error) {
          console.warn(`⚠️ Impossible de charger les attaques ${type}:`, error);
        }
      }

      console.log(`✅ ${this.moves.size} attaques chargées au total`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des attaques:', error);
    }
  }

  static getMoveData(moveId: string): MoveData | null {
    return this.moves.get(moveId) || null;
  }

  static getAllMoves(): MoveData[] {
    return Array.from(this.moves.values());
  }

  static getMovesByType(type: string): MoveData[] {
    return Array.from(this.moves.values()).filter(move => move.type === type);
  }

  static getMovesByCategory(category: "Physical" | "Special" | "Status"): MoveData[] {
    return Array.from(this.moves.values()).filter(move => move.category === category);
  }

  static searchMoves(query: string): MoveData[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.moves.values()).filter(move => 
      move.name.toLowerCase().includes(lowerQuery) ||
      move.description.toLowerCase().includes(lowerQuery)
    );
  }
}
