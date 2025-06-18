// src/game/NpcManager.ts

export interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties: Record<string, any>;
}

interface NpcVisuals {
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
}

export class NpcManager {
  private scene: Phaser.Scene;
  private npcVisuals: Map<number, NpcVisuals>;
  private npcData: Map<number, NpcData>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.npcVisuals = new Map();
    this.npcData = new Map();
  }

  clearAllNpcs(): void {
    this.npcVisuals.forEach(({ sprite, nameText }) => {
      sprite.destroy();
      nameText.destroy();
    });
    this.npcVisuals.clear();
    this.npcData.clear();
  }

  spawnNpcs(npcList: NpcData[]): void {
    this.clearAllNpcs();
    for (const npc of npcList) {
      this.spawnNpc(npc);
    }
  }

  spawnNpc(npc: NpcData): void {
    let spriteKey = npc.sprite || "npc_placeholder";
    if (!this.scene.textures.exists(spriteKey)) {
      // Création d’un placeholder simple
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x8888ff);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture(spriteKey, 32, 32);
      graphics.destroy();
    }

    const sprite = this.scene.add.sprite(npc.x, npc.y, spriteKey)
      .setOrigin(0.5, 1)
      .setDepth(4);

    const nameText = this.scene.add.text(npc.x, npc.y - 32, npc.name, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000a",
      padding: { left: 4, right: 4, top: 1, bottom: 1 }
    } as Phaser.Types.GameObjects.Text.TextStyle)
      .setOrigin(0.5, 1)
      .setDepth(4.1);

    this.npcVisuals.set(npc.id, { sprite, nameText });
    this.npcData.set(npc.id, npc);
  }

  // Trouve le NPC le plus proche du joueur (coordonnées world, rayon en pixels)
  getClosestNpc(playerX: number, playerY: number, maxDist = 64): NpcData | null {
    let closest: { npc: NpcData; dist: number } | null = null;
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      if (!visuals) return;
      const dx = visuals.sprite.x - playerX;
      const dy = visuals.sprite.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= maxDist && (!closest || dist < closest.dist)) {
        closest = { npc, dist };
      }
    });
    return closest ? closest.npc : null;
  }

  // Optionnel : Pour effet de surbrillance, focus, etc.
  getNpcVisuals(npcId: number): NpcVisuals | undefined {
    return this.npcVisuals.get(npcId);
  }

  // Optionnel : Pour dialoguer, lire les propriétés, etc.
  getNpcData(npcId: number): NpcData | undefined {
    return this.npcData.get(npcId);
  }
}
