// src/game/NpcManager.js - VERSION CORRIGÉE pour les transitions
// ✅ Corrections pour éviter les erreurs de sprites détruits et améliorer le spawn

export class NpcManager {
  constructor(scene) {
    this.scene = scene;
    this.npcVisuals = new Map();
    this.npcData = new Map();
    this.isDestroyed = false;
    
    console.log("📋 NpcManager initialisé");
  }

  // ✅ AMÉLIORATION: Nettoyage robuste avec vérifications
  clearAllNpcs() {
    if (this.isDestroyed) {
      console.warn("⚠️ NpcManager déjà détruit, skip clearAllNpcs");
      return;
    }

    console.log("🧹 Nettoyage de tous les NPCs");
    
    this.npcVisuals.forEach(({ sprite, nameContainer }, id) => {
      console.log(`🗑️ Suppression NPC ID ${id}`);
      
      // ✅ CORRECTION: Vérification robuste pour le sprite
      if (sprite) {
        if (this.isGameObjectValid(sprite)) {
          try {
            sprite.destroy();
          } catch (error) {
            console.warn(`⚠️ Erreur destruction sprite NPC ${id}:`, error);
          }
        } else {
          console.log(`🔍 Sprite du NPC ${id} déjà détruit ou invalide`);
        }
      }
      
      // ✅ CORRECTION: Vérification robuste pour le container de nom
      if (nameContainer) {
        if (this.isGameObjectValid(nameContainer)) {
          try {
            nameContainer.destroy();
          } catch (error) {
            console.warn(`⚠️ Erreur destruction nameContainer NPC ${id}:`, error);
          }
        } else {
          console.log(`🔍 NameContainer du NPC ${id} déjà détruit ou invalide`);
        }
      }
    });
    
    this.npcVisuals.clear();
    this.npcData.clear();
    
    console.log("✅ Nettoyage NPCs terminé");
  }

  // ✅ MÉTHODE AMÉLIORÉE: Vérification de validité d'un GameObject plus permissive
  isGameObjectValid(gameObject) {
    try {
      // Vérifier si l'objet existe
      if (!gameObject) return false;
      
      // Vérifier si l'objet n'est pas marqué comme détruit
      if (gameObject.destroyed) return false;
      
      // ✅ CORRECTION: Vérification de scène plus permissive
      if (gameObject.scene) {
        // Si l'objet a une scène, vérifier qu'elle n'est pas détruite
        if (gameObject.scene.sys && gameObject.scene.sys.isDestroyed) return false;
      }
      
      // Test supplémentaire: essayer d'accéder à une propriété de base
      const _ = gameObject.active !== undefined ? gameObject.active : true;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  updateQuestIndicators(questStatuses) {
    console.log("🔄 Mise à jour des indicateurs de quête:", questStatuses);
    
    questStatuses.forEach(status => {
      const visuals = this.npcVisuals.get(status.npcId);
      if (visuals && this.isGameObjectValid(visuals.nameContainer)) {
        this.updateQuestIndicator(visuals.nameContainer, status.type);
      }
    });
  }

  updateQuestIndicator(nameContainer, questType) {
  // Supprimer l'ancien indicateur s'il existe
  const oldIndicator = nameContainer.getByName('questIndicator');
  if (oldIndicator) {
    oldIndicator.destroy();
  }

  let indicatorText = '';
  let indicatorColor = 0xFFFFFF;

  switch (questType) {
    case 'questAvailable':
      indicatorText = '!';
      indicatorColor = 0xFFD700; // Jaune doré
      break;
    case 'questInProgress':
      indicatorText = '?';
      indicatorColor = 0x808080; // Gris
      break;
    case 'questReadyToComplete':
      indicatorText = '?';
      indicatorColor = 0xFFD700; // Jaune doré
      break;
    default:
      return; // Pas d'indicateur
  }

  // ✅ POSITION CORRIGÉE : Plus proche du nameplate
  // Le nameText est à (0, -0.8), on met l'indicateur juste au-dessus
  const indicator = this.scene.add.text(0, -16, indicatorText, {
    fontFamily: "monospace",
    fontSize: "16px", // ✅ Légèrement plus gros pour être visible
    color: `#${indicatorColor.toString(16).padStart(6, '0')}`,
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 3 // ✅ Stroke plus épais pour contraste
  }).setOrigin(0.5, 0.5);
  
  indicator.name = 'questIndicator';
  nameContainer.add(indicator);

  // Animation de pulsation améliorée
  this.scene.tweens.add({
    targets: indicator,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 1000, // ✅ Plus lent pour être moins distrayant
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1
  });
}
  
  // ✅ AMÉLIORATION: Spawn avec vérifications moins restrictives
  spawnNpcs(npcList) {
    console.log("👥 Spawn de", npcList.length, "NPCs");
    
    // ✅ CORRECTION: Vérification de scène moins restrictive
    if (!this.scene) {
      console.warn("⚠️ Pas de scène pour spawner les NPCs");
      return;
    }
    
    // ✅ CORRECTION: Ne nettoyer que si vraiment nécessaire
    if (this.npcVisuals.size > 0) {
      console.log(`🧹 Nettoyage préventif (${this.npcVisuals.size} NPCs existants)`);
      this.clearAllNpcs();
    }
    
    for (const npc of npcList) {
      try {
        this.spawnNpc(npc);
      } catch (error) {
        console.error(`❌ Erreur spawn NPC ${npc.id}:`, error);
      }
    }
    
    console.log(`✅ Spawn terminé, ${this.npcVisuals.size} NPCs créés`);
  }

  // ✅ AMÉLIORATION: Spawn avec gestion d'erreurs améliorée
  spawnNpc(npc) {
    console.log(`👤 Spawn NPC: ${npc.name} (ID: ${npc.id}) à position (${npc.x}, ${npc.y})`);
    
    // ✅ CORRECTION: Vérifications moins restrictives
    if (this.isDestroyed) {
      console.warn(`⚠️ Cannot spawn NPC ${npc.id}: manager détruit`);
      return;
    }
    
    if (!this.scene) {
      console.warn(`⚠️ Cannot spawn NPC ${npc.id}: pas de scène`);
      return;
    }
    
    // ✅ CORRECTION: Vérifier si le NPC existe déjà de manière plus souple
    if (this.npcVisuals.has(npc.id)) {
      const existing = this.npcVisuals.get(npc.id);
      if (existing && this.isGameObjectValid(existing.sprite)) {
        console.log(`⚠️ NPC ${npc.id} existe déjà et est valide, mise à jour position`);
        existing.sprite.x = npc.x;
        existing.sprite.y = npc.y;
        if (existing.nameContainer) {
          existing.nameContainer.x = npc.x - 7;
          existing.nameContainer.y = npc.y - 42;
        }
        return;
      } else {
        console.log(`🔧 NPC ${npc.id} existe mais invalide, recréation`);
        this.npcVisuals.delete(npc.id);
      }
    }
    
    try {
      // Gestion du sprite
      let spriteKey = npc.sprite || "npc_placeholder";
      
      // Vérifie si le sprite existe, sinon crée un placeholder
      if (!this.scene.textures.exists(spriteKey)) {
        console.log(`🎨 Création du placeholder pour ${spriteKey}`);
        this.createNpcPlaceholder(spriteKey);
      }

      // Création du sprite NPC
      const sprite = this.scene.add.sprite(npc.x, npc.y, spriteKey)
        .setOrigin(0.5, 1)
        .setDepth(4)
        .setScale(1);

      // ✅ AMÉLIORATION: Création du container de nom avec gestion d'erreurs
      const nameContainer = this.createNameContainer(npc);

      // ✅ CORRECTION: Stockage avec nom cohérent
      this.npcVisuals.set(npc.id, { sprite, nameContainer });
      this.npcData.set(npc.id, npc);
      
      console.log(`✅ NPC ${npc.name} créé avec succès`);
      
    } catch (error) {
      console.error(`❌ Erreur création NPC ${npc.id}:`, error);
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Création du placeholder
  createNpcPlaceholder(spriteKey) {
    try {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x8888ff);
      graphics.fillCircle(16, 16, 14);
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(16, 16, 10);
      graphics.generateTexture(spriteKey, 32, 32);
      graphics.destroy();
    } catch (error) {
      console.error(`❌ Erreur création placeholder ${spriteKey}:`, error);
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Création du container de nom
  createNameContainer(npc) {
    const nameContainer = this.scene.add.container(npc.x - 7, npc.y - 42);

    // Calcul dynamique de la taille basé sur le texte
    const tempText = this.scene.add.text(0, 0, npc.name, {
      fontFamily: "monospace",
      fontSize: "10px",
      fontStyle: "bold"
    });
    const textWidth = tempText.width;
    tempText.destroy();

    // Arrière-plan style parchemin/pixel avec dégradé
    const nameBg = this.scene.add.graphics();
    
    const bgColor = 0xF5E6B3;
    const borderColor = 0xB8935A;
    const shadowColor = 0x8B6F47;

    // Création du fond avec effet de profondeur
    nameBg
      .fillStyle(shadowColor, 0.6)
      .fillRoundedRect(-(textWidth/2) - 6.4 + 1.6, -7.2 + 1.6, textWidth + 12.8, 14.4, 6.4)
      .fillStyle(bgColor, 0.95)
      .fillRoundedRect(-(textWidth/2) - 6.4, -7.2, textWidth + 12.8, 14.4, 6.4)
      .lineStyle(1.6, shadowColor, 0.8)
      .strokeRoundedRect(-(textWidth/2) - 6.4, -7.2, textWidth + 12.8, 14.4, 6.4)
      .lineStyle(0.8, 0xFFFFDD, 0.6)
      .strokeRoundedRect(-(textWidth/2) - 5.6, -6.4, textWidth + 11.2, 12.8, 5.6);

    // Texte principal avec style pixel
    const nameText = this.scene.add.text(0, -0.8, npc.name, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#2B1810",
      fontStyle: "bold",
      align: "center",
      stroke: "#F5E6B3",
      strokeThickness: 0.8
    }).setOrigin(0.5, 0.5);

    // Petits points décoratifs aux coins
    const decorDot1 = this.scene.add.rectangle(-(textWidth/2) - 4, -4.8, 1.6, 1.6, borderColor);
    const decorDot2 = this.scene.add.rectangle((textWidth/2) + 4, -4.8, 1.6, 1.6, borderColor);
    const decorDot3 = this.scene.add.rectangle(-(textWidth/2) - 4, 3.2, 1.6, 1.6, borderColor);
    const decorDot4 = this.scene.add.rectangle((textWidth/2) + 4, 3.2, 1.6, 1.6, borderColor);

    nameContainer.add([nameBg, nameText, decorDot1, decorDot2, decorDot3, decorDot4]);
    nameContainer.setDepth(4.1);

    // ✅ AMÉLIORATION: Animation d'apparition avec gestion d'erreurs et vérification de scène
    try {
      if (this.scene && !this.scene.sys.isDestroyed) {
        nameContainer.setScale(0);
        this.scene.tweens.add({
          targets: nameContainer,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Animation terminée
          },
          onError: (error) => {
            console.warn("⚠️ Erreur animation nameContainer:", error);
          }
        });
      } else {
        // Pas d'animation si la scène n'est pas valide
        nameContainer.setScale(1);
      }
    } catch (error) {
      console.warn("⚠️ Erreur setup animation:", error);
      // Fallback: afficher directement
      nameContainer.setScale(1);
    }

    return nameContainer;
  }

  // ✅ AMÉLIORATION: getClosestNpc avec vérifications
  getClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.isDestroyed) return null;
    
    let closest = null;
    
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      if (!visuals || !this.isGameObjectValid(visuals.sprite)) return;
      
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

  // ✅ AMÉLIORATION: Highlight avec vérifications
  highlightClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.isDestroyed) return;
    
    // Reset tous les highlights
    this.npcVisuals.forEach(({ sprite, nameContainer }) => {
      if (this.isGameObjectValid(sprite)) {
        try {
          sprite.clearTint();
        } catch (error) {
          console.warn("⚠️ Erreur clearTint:", error);
        }
      }
    });

    // Highlight le plus proche
    const closest = this.getClosestNpc(playerX, playerY, maxDist);
    if (closest) {
      const visuals = this.npcVisuals.get(closest.id);
      if (visuals && this.isGameObjectValid(visuals.sprite)) {
        try {
          visuals.sprite.setTint(0x88ff88);
        } catch (error) {
          console.warn("⚠️ Erreur setTint:", error);
        }
      }
    }
  }

  // ✅ AMÉLIORATION: Getters avec vérifications
  getNpcVisuals(npcId) {
    if (this.isDestroyed) return undefined;
    return this.npcVisuals.get(npcId);
  }

  getNpcData(npcId) {
    if (this.isDestroyed) return undefined;
    return this.npcData.get(npcId);
  }

  getAllNpcs() {
    if (this.isDestroyed) return [];
    return Array.from(this.npcData.values());
  }

  // ✅ AMÉLIORATION: updateNpcPosition avec vérifications
  updateNpcPosition(npcId, x, y) {
    if (this.isDestroyed) return;
    
    const visuals = this.npcVisuals.get(npcId);
    if (visuals) {
      if (this.isGameObjectValid(visuals.sprite)) {
        visuals.sprite.x = x;
        visuals.sprite.y = y;
      }
      
      if (this.isGameObjectValid(visuals.nameContainer)) {
        visuals.nameContainer.x = x - 7;
        visuals.nameContainer.y = y - 42;
      }
    }
  }

  // ✅ AMÉLIORATION: Debug avec état de validité
  debugNpcs() {
    if (this.isDestroyed) {
      console.log("🐛 [DEBUG] NpcManager détruit");
      return;
    }
    
    console.log("🐛 [DEBUG] État actuel des NPCs:");
    console.log(`📊 Total NPCs data: ${this.npcData.size}`);
    console.log(`📊 Total NPCs visuals: ${this.npcVisuals.size}`);
    
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      let visualsStatus = 'MANQUANT';
      
      if (visuals) {
        const spriteValid = this.isGameObjectValid(visuals.sprite);
        const containerValid = this.isGameObjectValid(visuals.nameContainer);
        visualsStatus = `Sprite: ${spriteValid ? 'OK' : 'INVALID'}, Container: ${containerValid ? 'OK' : 'INVALID'}`;
      }
      
      console.log(`  - ${npc.name} (ID: ${id}) à (${npc.x}, ${npc.y}) - ${visualsStatus}`);
    });
  }

  // ✅ MÉTHODE INCHANGÉE: Destruction propre
  destroy() {
    console.log("💀 Destruction NpcManager");
    
    this.isDestroyed = true;
    this.clearAllNpcs();
    
    // Nettoyer les références
    this.scene = null;
    this.npcVisuals = null;
    this.npcData = null;
  }

  // ✅ NOUVELLE MÉTHODE: Vérification de l'état du manager
  isValid() {
    return !this.isDestroyed && this.scene && !this.scene.sys.isDestroyed;
  }

  // ✅ NOUVELLE MÉTHODE: Forcer le respawn (utile après transitions)
  forceRespawn() {
    if (this.isDestroyed || !this.scene) return;
    
    console.log("🔄 Force respawn des NPCs...");
    
    // Sauvegarder les données des NPCs
    const savedNpcs = Array.from(this.npcData.values());
    
    // Nettoyer et recréer
    this.clearAllNpcs();
    
    if (savedNpcs.length > 0) {
      console.log(`♻️ Recréation de ${savedNpcs.length} NPCs`);
      this.spawnNpcs(savedNpcs);
    }
  }
}
