// src/game/NpcManager.js - Version corrigée avec affichage des noms

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
    
    console.log("📋 NpcManager initialisé");
  }

  clearAllNpcs(): void {
    console.log("🧹 Nettoyage de tous les NPCs");
    this.npcVisuals.forEach(({ sprite, nameText }, id) => {
      console.log(`🗑️ Suppression NPC ID ${id}`);
      if (sprite && !sprite.scene) {
        console.warn(`⚠️ Sprite du NPC ${id} déjà détruit`);
      } else {
        sprite?.destroy();
      }
      
      if (nameText && !nameText.scene) {
        console.warn(`⚠️ Texte du NPC ${id} déjà détruit`);
      } else {
        nameText?.destroy();
      }
    });
    this.npcVisuals.clear();
    this.npcData.clear();
  }

  spawnNpcs(npcList: NpcData[]): void {
    console.log("👥 Spawn de", npcList.length, "NPCs");
    this.clearAllNpcs();
    for (const npc of npcList) {
      this.spawnNpc(npc);
    }
  }

  spawnNpc(npc: NpcData): void {
    console.log(`👤 Spawn NPC: ${npc.name} (ID: ${npc.id}) à position (${npc.x}, ${npc.y})`);
    
    // Gestion du sprite
    let spriteKey = npc.sprite || "npc_placeholder";
    
    // Vérifie si le sprite existe, sinon crée un placeholder
    if (!this.scene.textures.exists(spriteKey)) {
      console.log(`🎨 Création du placeholder pour ${spriteKey}`);
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x8888ff);
      graphics.fillCircle(16, 16, 14); // Cercle au lieu d'un carré
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(16, 16, 10);
      graphics.generateTexture(spriteKey, 32, 32);
      graphics.destroy();
    }

    // Création du sprite NPC
    const sprite = this.scene.add.sprite(npc.x, npc.y, spriteKey)
      .setOrigin(0.5, 1)
      .setDepth(4)
      .setScale(1);

// Création du nom du NPC, sans background, avec ombre pour la lisibilité
const nameText = this.scene.add.text(npc.x, npc.y - 42, npc.name, {
  fontFamily: "Arial",
  fontSize: "12px",        // Police réduite
  color: "#ffffff",
  fontStyle: "bold",
  align: "center",
  stroke: "#1a1a1a",      // Contour gris foncé plus doux
  strokeThickness: 2       // Contour plus fin
})
  .setOrigin(0.5, 1)
  .setDepth(4.1);

// Ombre plus subtile et moderne
nameText.setShadow(1, 2, "#000000", 6, false, true);

// Ajout d'un arrière-plan semi-transparent arrondi
const nameBg = this.scene.add.graphics()
  .fillStyle(0x000000, 0.6)  // Noir avec 60% d'opacité
  .fillRoundedRect(
    npc.x - (nameText.width / 2) - 8,  // Position X centrée avec padding
    npc.y - 50,                         // Position Y au-dessus du texte
    nameText.width + 16,                // Largeur avec padding
    20,                                 // Hauteur
    8                                   // Coins arrondis
  )
  .setDepth(4.0);  // Derrière le texte

// Optionnel : effet de glow subtil
nameText.setTint(0xf0f0f0);  // Légèrement moins blanc pour un effet plus doux

// Petit point décoratif
const decorDot = this.scene.add.circle(-nameText.width/2 - 8, -2, 2, 0x4a9eff);

nameContainer.add([nameBg, nameText, decorDot]);
nameContainer.setDepth(4.1);

    // Effet de survol pour le NPC
    sprite.setInteractive();
    sprite.on('pointerover', () => {
      sprite.setTint(0xffff88); // Légère teinte jaune au survol
      nameText.setStyle({ backgroundColor: "#004400cc" });
    });

    sprite.on('pointerout', () => {
      sprite.clearTint();
      nameText.setStyle({ backgroundColor: "#000000cc" });
    });

    // Stockage des références
    this.npcVisuals.set(npc.id, { sprite, nameText });
    this.npcData.set(npc.id, npc);
    
    console.log(`✅ NPC ${npc.name} créé avec succès`);
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
    
    if (closest) {
      console.log(`🎯 NPC le plus proche: ${closest.npc.name} à ${Math.round(closest.dist)}px`);
    }
    
    return closest ? closest.npc : null;
  }

  // Highlight du NPC le plus proche
  highlightClosestNpc(playerX: number, playerY: number, maxDist = 64): void {
    // Reset tous les highlights
    this.npcVisuals.forEach(({ sprite, nameText }) => {
      sprite.clearTint();
      nameText.setStyle({ backgroundColor: "#000000cc" });
    });

    // Highlight le plus proche
    const closest = this.getClosestNpc(playerX, playerY, maxDist);
    if (closest) {
      const visuals = this.npcVisuals.get(closest.id);
      if (visuals) {
        visuals.sprite.setTint(0x88ff88); // Vert pour indiquer qu'il est interactif
        visuals.nameText.setStyle({ backgroundColor: "#008800cc" });
      }
    }
  }

  // Optionnel : Pour effet de surbrillance, focus, etc.
  getNpcVisuals(npcId: number): NpcVisuals | undefined {
    return this.npcVisuals.get(npcId);
  }

  // Optionnel : Pour dialoguer, lire les propriétés, etc.
  getNpcData(npcId: number): NpcData | undefined {
    return this.npcData.get(npcId);
  }

  // Obtient tous les NPCs actuellement spawned
  getAllNpcs(): NpcData[] {
    return Array.from(this.npcData.values());
  }

  // Met à jour la position d'un NPC (si besoin de mouvement)
  updateNpcPosition(npcId: number, x: number, y: number): void {
    const visuals = this.npcVisuals.get(npcId);
    if (visuals) {
      visuals.sprite.x = x;
      visuals.sprite.y = y;
      visuals.nameText.x = x;
      visuals.nameText.y = y - 40;
    }
  }

  // Debug: affiche des infos sur tous les NPCs
  debugNpcs(): void {
    console.log("🐛 [DEBUG] État actuel des NPCs:");
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      console.log(`  - ${npc.name} (ID: ${id}) à (${npc.x}, ${npc.y}) - Visuals: ${visuals ? 'OK' : 'MANQUANT'}`);
    });
  }
}
