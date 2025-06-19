// src/game/NpcManager.js - Version avec design moderne et amélioré

export class NpcManager {
  constructor(scene) {
    this.scene = scene;
    this.npcVisuals = new Map();
    this.npcData = new Map();
    this.highlightedNpc = null;
    
    console.log("📋 NpcManager initialisé avec design amélioré");
  }

  clearAllNpcs() {
    console.log("🧹 Nettoyage de tous les NPCs");
    this.npcVisuals.forEach(({ container }, id) => {
      console.log(`🗑️ Suppression NPC ID ${id}`);
      if (container && container.scene) {
        container.destroy();
      }
    });
    this.npcVisuals.clear();
    this.npcData.clear();
    this.highlightedNpc = null;
  }

  spawnNpcs(npcList) {
    console.log("👥 Spawn de", npcList.length, "NPCs");
    this.clearAllNpcs();
    for (const npc of npcList) {
      this.spawnNpc(npc);
    }
  }

  spawnNpc(npc) {
    console.log(`👤 Spawn NPC: ${npc.name} (ID: ${npc.id}) à position (${npc.x}, ${npc.y})`);
    
    // Container principal pour le NPC
    const npcContainer = this.scene.add.container(npc.x, npc.y);
    npcContainer.setDepth(4);

    // === SPRITE DU NPC ===
    let spriteKey = npc.sprite || "npc_placeholder";
    
    // Vérifie si le sprite existe, sinon crée un placeholder stylé
    if (!this.scene.textures.exists(spriteKey)) {
      console.log(`🎨 Création du placeholder stylé pour ${spriteKey}`);
      this.createStylizedPlaceholder(spriteKey, npc);
    }

    const sprite = this.scene.add.sprite(0, 0, spriteKey)
      .setOrigin(0.5, 1)
      .setScale(1);

    // === NAMEPLATE MODERNE ===
    const namePlate = this.createModernNameplate(npc.name, npc);
    
    // === INTERACTION INDICATOR ===
    const interactionIndicator = this.createInteractionIndicator();
    interactionIndicator.setVisible(false);

    // === STATUS EFFECTS ===
    const statusEffects = this.createStatusEffects(npc);

    // === SHADOW/GLOW EFFECT ===
    const shadowSprite = this.scene.add.sprite(0, 2, spriteKey)
      .setOrigin(0.5, 1)
      .setScale(1)
      .setTint(0x000000)
      .setAlpha(0.3);

    // Ajout au container dans l'ordre des depths
    npcContainer.add([
      shadowSprite,     // Ombre en arrière-plan
      sprite,          // Sprite principal
      namePlate,       // Nameplate au-dessus
      interactionIndicator, // Indicateur d'interaction
      statusEffects    // Effets de statut
    ]);

    // === INTERACTIONS ET ANIMATIONS ===
    this.setupNpcInteractions(npcContainer, sprite, namePlate, interactionIndicator, npc);

    // === ANIMATIONS D'ENTRÉE ===
    this.playSpawnAnimation(npcContainer, sprite, namePlate);

    // Stockage des références
    this.npcVisuals.set(npc.id, {
      container: npcContainer,
      sprite: sprite,
      namePlate: namePlate,
      interactionIndicator: interactionIndicator,
      statusEffects: statusEffects,
      shadow: shadowSprite
    });
    this.npcData.set(npc.id, npc);
    
    console.log(`✅ NPC ${npc.name} créé avec design moderne`);
  }

  createStylizedPlaceholder(spriteKey, npc) {
    const graphics = this.scene.add.graphics();
    
    // Gradient background
    graphics.fillGradientStyle(0x4a90e2, 0x4a90e2, 0x7b68ee, 0x7b68ee, 1);
    graphics.fillCircle(16, 16, 14);
    
    // Inner circle
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(16, 16, 10);
    
    // Decorative elements
    graphics.fillStyle(0x4a90e2);
    graphics.fillCircle(16, 12, 3); // Eyes
    graphics.fillCircle(16, 20, 2); // Mouth
    
    graphics.generateTexture(spriteKey, 32, 32);
    graphics.destroy();
  }

  createModernNameplate(name, npc) {
    // Container pour le nameplate
    const plateContainer = this.scene.add.container(0, -45);
    
    // Background avec gradient et bordure
    const plateWidth = Math.max(name.length * 8 + 16, 80);
    const plateHeight = 24;
    
    // Fond principal avec gradient
    const plateBackground = this.scene.add.graphics();
    plateBackground.fillGradientStyle(
      0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1
    );
    plateBackground.fillRoundedRect(-plateWidth/2, -plateHeight/2, plateWidth, plateHeight, 12);
    
    // Bordure brillante
    plateBackground.lineStyle(2, 0x64a6ff, 0.8);
    plateBackground.strokeRoundedRect(-plateWidth/2, -plateHeight/2, plateWidth, plateHeight, 12);
    
    // Effet de brillance
    const highlight = this.scene.add.graphics();
    highlight.fillGradientStyle(0xffffff, 0xffffff, 0x64a6ff, 0x64a6ff, 0.3);
    highlight.fillRoundedRect(-plateWidth/2 + 2, -plateHeight/2 + 1, plateWidth - 4, 4, 2);
    
    // Texte du nom avec style moderne
    const nameText = this.scene.add.text(0, 0, name, {
      fontFamily: "'Segoe UI', 'Arial', sans-serif",
      fontSize: "12px",
      color: "#ffffff",
      fontWeight: "600",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    // Effet de pulsation subtile pour le texte
    this.scene.tweens.add({
      targets: nameText,
      alpha: { from: 1, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    plateContainer.add([plateBackground, highlight, nameText]);
    return plateContainer;
  }

  createInteractionIndicator() {
    const indicator = this.scene.add.container(0, -70);
    
    // Icône d'interaction
    const icon = this.scene.add.graphics();
    icon.fillStyle(0xffeb3b);
    icon.fillCircle(0, 0, 8);
    icon.fillStyle(0x333333);
    icon.fillText = this.scene.add.text(0, 0, "E", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#333333",
      fontWeight: "bold"
    }).setOrigin(0.5, 0.5);

    // Animation de rebond
    this.scene.tweens.add({
      targets: indicator,
      y: -75,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    indicator.add([icon, icon.fillText]);
    return indicator;
  }

  createStatusEffects(npc) {
    const effectsContainer = this.scene.add.container(0, -25);
    
    // Exemple d'effets selon les propriétés du NPC
    if (npc.properties?.type === 'shop') {
      const shopIcon = this.scene.add.text(15, 0, "💰", {
        fontSize: "14px"
      }).setOrigin(0.5);
      effectsContainer.add(shopIcon);
    }
    
    if (npc.properties?.type === 'heal') {
      const healIcon = this.scene.add.text(-15, 0, "❤️", {
        fontSize: "14px"
      }).setOrigin(0.5);
      effectsContainer.add(healIcon);
    }

    if (npc.properties?.quest) {
      const questIcon = this.scene.add.text(0, 0, "!", {
        fontSize: "16px",
        color: "#ffeb3b",
        fontWeight: "bold",
        stroke: "#ff6b00",
        strokeThickness: 2
      }).setOrigin(0.5);
      
      // Animation de pulsation pour les quêtes
      this.scene.tweens.add({
        targets: questIcon,
        scale: { from: 1, to: 1.3 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      effectsContainer.add(questIcon);
    }
    
    return effectsContainer;
  }

  setupNpcInteractions(container, sprite, namePlate, indicator, npc) {
    // Zone d'interaction invisible mais plus large
    const hitArea = this.scene.add.zone(0, 0, 64, 64);
    container.add(hitArea);
    
    // Configuration interactive
    container.setSize(64, 64);
    container.setInteractive();

    // Effets de survol
    container.on('pointerover', () => {
      this.onNpcHover(container, sprite, namePlate, true);
    });

    container.on('pointerout', () => {
      this.onNpcHover(container, sprite, namePlate, false);
    });

    // Click interaction
    container.on('pointerdown', () => {
      this.onNpcClick(npc);
    });
  }

  onNpcHover(container, sprite, namePlate, isHovering) {
    if (isHovering) {
      // Effet de hover
      sprite.setTint(0xffff88);
      namePlate.getAt(0).lineStyle(2, 0xffeb3b, 1); // Change la bordure
      
      // Légère élévation
      this.scene.tweens.add({
        targets: container,
        y: container.y - 2,
        scale: 1.05,
        duration: 200,
        ease: 'Back.easeOut'
      });
    } else {
      // Retour à la normale
      sprite.clearTint();
      namePlate.getAt(0).lineStyle(2, 0x64a6ff, 0.8);
      
      this.scene.tweens.add({
        targets: container,
        y: container.y + 2,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
    }
  }

  onNpcClick(npc) {
    console.log(`🎯 Click sur NPC: ${npc.name}`);
    // Animation de click
    const visuals = this.npcVisuals.get(npc.id);
    if (visuals) {
      this.scene.tweens.add({
        targets: visuals.container,
        scale: { from: 1.05, to: 0.95 },
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  playSpawnAnimation(container, sprite, namePlate) {
    // Animation d'apparition
    container.setScale(0);
    container.setAlpha(0);
    
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
      delay: Math.random() * 200 // Délai aléatoire pour un effet plus naturel
    });

    // Animation du nameplate
    namePlate.setY(-20);
    this.scene.tweens.add({
      targets: namePlate,
      y: -45,
      duration: 400,
      ease: 'Bounce.easeOut',
      delay: 300
    });
  }

  // Trouve le NPC le plus proche du joueur
  getClosestNpc(playerX, playerY, maxDist = 64) {
    let closest = null;
    
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      if (!visuals) return;
      
      const dx = visuals.container.x - playerX;
      const dy = visuals.container.y - playerY;
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

  // Highlight du NPC le plus proche avec style moderne
  highlightClosestNpc(playerX, playerY, maxDist = 64) {
    // Reset tous les highlights
    this.npcVisuals.forEach(({ container, sprite, namePlate, interactionIndicator }) => {
      sprite.clearTint();
      interactionIndicator.setVisible(false);
      
      // Reset nameplate style
      const plateBackground = namePlate.getAt(0);
      plateBackground.lineStyle(2, 0x64a6ff, 0.8);
    });

    // Highlight le plus proche
    const closest = this.getClosestNpc(playerX, playerY, maxDist);
    if (closest) {
      const visuals = this.npcVisuals.get(closest.id);
      if (visuals) {
        // Highlight moderne
        visuals.sprite.setTint(0x88ff88);
        visuals.interactionIndicator.setVisible(true);
        
        // Style spécial pour le nameplate
        const plateBackground = visuals.namePlate.getAt(0);
        plateBackground.lineStyle(3, 0x00ff88, 1);
        
        // Effet de brillance
        if (this.highlightedNpc !== closest.id) {
          this.scene.tweens.add({
            targets: visuals.sprite,
            alpha: { from: 1, to: 0.7 },
            duration: 300,
            yoyo: true,
            ease: 'Sine.easeInOut'
          });
          this.highlightedNpc = closest.id;
        }
      }
    } else {
      this.highlightedNpc = null;
    }
  }

  // Optionnel : Pour effet de surbrillance, focus, etc.
  getNpcVisuals(npcId) {
    return this.npcVisuals.get(npcId);
  }

  // Optionnel : Pour dialoguer, lire les propriétés, etc.
  getNpcData(npcId) {
    return this.npcData.get(npcId);
  }

  // Obtient tous les NPCs actuellement spawned
  getAllNpcs() {
    return Array.from(this.npcData.values());
  }

  // Met à jour la position d'un NPC
  updateNpcPosition(npcId, x, y) {
    const visuals = this.npcVisuals.get(npcId);
    if (visuals) {
      visuals.container.x = x;
      visuals.container.y = y;
    }
  }

  // Animation spéciale pour attirer l'attention
  highlightNpcForQuest(npcId) {
    const visuals = this.npcVisuals.get(npcId);
    if (visuals) {
      // Effet de brillance dorée
      this.scene.tweens.add({
        targets: visuals.sprite,
        tint: { from: 0xffffff, to: 0xffd700 },
        duration: 1000,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut'
      });
      
      // Particules scintillantes (si vous avez un système de particules)
      // this.addSparkleEffect(visuals.container);
    }
  }

  // Debug: affiche des infos sur tous les NPCs
  debugNpcs() {
    console.log("🐛 [DEBUG] État actuel des NPCs (design moderne):");
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      console.log(`  - ${npc.name} (ID: ${id}) à (${npc.x}, ${npc.y}) - Visuals: ${visuals ? 'OK' : 'MANQUANT'}`);
    });
  }
}
