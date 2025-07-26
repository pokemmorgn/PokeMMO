// src/game/NpcManager.ts - VERSION COMPLÈTE AVEC SPRITES DYNAMIQUES CORRIGÉE
// ✅ Intégration NpcSpriteManager pour sprites MongoDB + Corrections Timing Asynchrone

import { NpcSpriteManager } from '../managers/NpcSpriteManager.js';

export class NpcManager {
  constructor(scene) {
    this.scene = scene;
    this.npcVisuals = new Map();
    this.npcData = new Map();
    this.isDestroyed = false;
    
    // ✅ Protection contre spawn multiple
    this.isSpawning = false;
    
    // ✅ NpcSpriteManager pour sprites dynamiques
    this.npcSpriteManager = new NpcSpriteManager(scene);
    this.npcSpriteManager.initialize();
    
    console.log("📋 NpcManager initialisé avec NpcSpriteManager");
  }

  // ✅ MÉTHODE CORRIGÉE: Spawn avec sprites dynamiques + PROTECTION BOUCLE
  async spawnNpcs(npcList) {
    // ✅ PROTECTION CONTRE LES APPELS MULTIPLES
    if (this.isSpawning) {
      console.warn("⚠️ Spawn NPCs déjà en cours, ignoré");
      return;
    }
    
    this.isSpawning = true;
    
    try {
      console.log("👥 === SPAWN NPCs AVEC SPRITES DYNAMIQUES ===");
      console.log(`📊 Zone: ${this.scene.scene.key}`);
      console.log(`📊 NPCs à spawner: ${npcList.length}`);
      
      // ✅ Debug détaillé de chaque NPC reçu (incluant sprites)
      npcList.forEach((npc, index) => {
        console.log(`🎭 NPC ${index + 1}:`, {
          id: npc.id,
          name: npc.name,
          sprite: npc.sprite, // ✅ SPRITE MONGODB
          x: npc.x,
          y: npc.y,
          properties: npc.properties
        });
      });
      
      // ✅ Vérification de scène
      if (!this.scene) {
        console.warn("⚠️ Pas de scène pour spawner les NPCs");
        return;
      }
      
      // ✅ Pré-charger tous les sprites nécessaires
      const spritesToPreload = npcList
        .map(npc => npc.sprite)
        .filter(sprite => sprite && sprite !== '') // Filtrer les sprites vides
        .filter((sprite, index, array) => array.indexOf(sprite) === index); // Dédupliquer
      
      if (spritesToPreload.length > 0) {
        console.log(`🎨 Pré-chargement de ${spritesToPreload.length} sprites uniques:`, spritesToPreload);
        
        const preloadResult = await this.npcSpriteManager.preloadSprites(spritesToPreload);
        console.log(`🎨 Pré-chargement terminé:`, preloadResult);
      }
      
      // ✅ Nettoyer les NPCs existants si nécessaire
      if (this.npcVisuals.size > 0) {
        console.log(`🧹 Nettoyage préventif (${this.npcVisuals.size} NPCs existants)`);
        this.clearAllNpcs();
      }
      
      // ✅ Spawner chaque NPC avec gestion async
      const spawnPromises = npcList.map(npc => this.spawnNpc(npc));
      const spawnResults = await Promise.allSettled(spawnPromises);
      
      // ✅ Analyser les résultats
      const successful = spawnResults.filter(r => r.status === 'fulfilled').length;
      const failed = spawnResults.filter(r => r.status === 'rejected').length;
      
      console.log(`✅ Spawn terminé: ${successful} succès, ${failed} échecs sur ${npcList.length} NPCs`);
      
      if (failed > 0) {
        console.warn(`⚠️ ${failed} NPCs n'ont pas pu être spawnés`);
        spawnResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`❌ NPC ${npcList[index].id} (${npcList[index].name}):`, result.reason);
          }
        });
      }
      
      // ✅ Debug final des NPCs créés
      this.debugSpawnedNpcs();
      
    } catch (error) {
      console.error("❌ Erreur critique dans spawnNpcs:", error);
    } finally {
      // ✅ TOUJOURS LIBÉRER LE FLAG
      this.isSpawning = false;
    }
  }

  // ✅ MÉTHODE COMPLÈTEMENT CORRIGÉE: Spawn NPC individuel avec timing asynchrone fixé
  async spawnNpc(npc) {
    console.log(`👤 === SPAWN NPC AVEC SPRITE DYNAMIQUE (FIX) ===`);
    console.log(`🎭 Nom: ${npc.name} (ID: ${npc.id})`);
    console.log(`📍 Position: (${npc.x}, ${npc.y})`);
    console.log(`🎨 Sprite MongoDB: ${npc.sprite || 'non spécifié'}`);
    
    // ✅ Vérifications préliminaires
    if (this.isDestroyed) {
      throw new Error(`Cannot spawn NPC ${npc.id}: manager détruit`);
    }
    
    if (!this.scene) {
      throw new Error(`Cannot spawn NPC ${npc.id}: pas de scène`);
    }
    
    // ✅ Vérifier si le NPC existe déjà
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
      // ✅ ÉTAPE 1: Obtenir le sprite à utiliser via NpcSpriteManager
      console.log(`🎨 === GESTION SPRITE DYNAMIQUE (FIX) ===`);
      
      const spriteKeyToUse = await this.npcSpriteManager.getSpriteKeyToUse(npc.sprite);
      console.log(`🎨 Sprite final choisi: ${spriteKeyToUse} (demandé: ${npc.sprite})`);
      
      // ✅ ÉTAPE 2: FIX CRITIQUE - Attendre que le sprite soit vraiment disponible
      const spriteReady = await this.waitForSpriteAvailability(spriteKeyToUse, 3000); // 3 secondes max
      
      if (!spriteReady) {
        console.warn(`⚠️ Sprite ${spriteKeyToUse} pas disponible après attente, fallback ultime`);
        return await this.createNpcWithUltimateFallback(npc);
      }
      
      // ✅ ÉTAPE 3: DOUBLE CHECK - Vérifier que le sprite existe maintenant
      if (!this.scene.textures.exists(spriteKeyToUse)) {
        console.error(`❌ Sprite ${spriteKeyToUse} toujours pas disponible après attente`);
        return await this.createNpcWithUltimateFallback(npc);
      }

      // ✅ ÉTAPE 4: Créer le sprite avec la clé finale
      console.log(`🎨 Création sprite NPC avec support sprite sheets: ${spriteKeyToUse}`);
      
      // ✅ NOUVEAU : Obtenir les informations de sprite sheet
      const spriteSheetInfo = this.npcSpriteManager.getSpriteSheetInfo(spriteKeyToUse);
      
      let sprite;
      
      if (spriteSheetInfo.isSpriteSheet) {
        // ✅ Sprite Sheet : utiliser le frame par défaut
        console.log(`🎞️ Création sprite sheet: ${spriteSheetInfo.structure.name} (frame ${spriteSheetInfo.defaultFrame})`);
        
        if (npc.frameIndex !== undefined) {
          // Utiliser le frame spécifié par le serveur
          sprite = this.scene.add.sprite(npc.x, npc.y, spriteKeyToUse, npc.frameIndex);
          console.log(`🎯 Frame spécifiée par serveur: ${npc.frameIndex}`);
        } else {
          // Utiliser le frame par défaut (généralement 0 = idle down)
          sprite = this.scene.add.sprite(npc.x, npc.y, spriteKeyToUse, spriteSheetInfo.defaultFrame);
          console.log(`🎯 Frame par défaut utilisée: ${spriteSheetInfo.defaultFrame}`);
        }
        
        // ✅ Stocker les infos de sprite sheet sur le sprite
        sprite.spriteSheetInfo = spriteSheetInfo;
        
      } else {
        // ✅ Image Simple : création normale
        console.log(`🖼️ Création image simple`);
        
        if (npc.frameIndex !== undefined) {
          sprite = this.scene.add.sprite(npc.x, npc.y, spriteKeyToUse, npc.frameIndex);
        } else {
          sprite = this.scene.add.sprite(npc.x, npc.y, spriteKeyToUse);
        }
      }

      // ✅ ÉTAPE 5: Configuration plus robuste du sprite
      sprite.setOrigin(0.5, 1)
        .setDepth(4)
        .setScale(1)
        .setVisible(true)  // ✅ FORCER VISIBLE
        .setActive(true)   // ✅ FORCER ACTIF
        .setAlpha(1);      // ✅ FORCER ALPHA

      // ✅ ÉTAPE 6: Vérifier que le sprite a bien été créé
      if (!sprite) {
        throw new Error(`Sprite non créé pour NPC ${npc.id}`);
      }

      // ✅ ÉTAPE 7: VALIDATION POST-CRÉATION
      const isValid = this.validateSpriteCreation(sprite, npc.id);
      if (!isValid) {
        console.error(`❌ Sprite créé mais invalide pour NPC ${npc.id}`);
        return await this.createNpcWithUltimateFallback(npc);
      }

      console.log(`✅ Sprite créé et validé pour ${npc.name}:`, {
        textureKey: sprite.texture.key,
        originalRequested: npc.sprite,
        finalUsed: spriteKeyToUse,
        x: sprite.x,
        y: sprite.y,
        visible: sprite.visible,
        active: sprite.active,
        depth: sprite.depth,
        scale: `${sprite.scaleX}x${sprite.scaleY}`,
        alpha: sprite.alpha
      });

      // ✅ ÉTAPE 8: Stocker les informations de sprite pour debug
      sprite.npcSpriteInfo = {
        originalSprite: npc.sprite,
        finalSprite: spriteKeyToUse,
        isFromMongoDB: !!npc.sprite,
        isFallback: spriteKeyToUse !== npc.sprite,
        createdAt: Date.now()
      };

      // ✅ ÉTAPE 9: Création du container de nom
      const nameContainer = this.createNameContainer(npc);

      // ✅ ÉTAPE 10: Stockage avec informations étendues
      this.npcVisuals.set(npc.id, { 
        sprite, 
        nameContainer,
        spriteInfo: sprite.npcSpriteInfo
      });
      this.npcData.set(npc.id, npc);
      
      console.log(`✅ NPC ${npc.name} créé avec succès (sprite: ${spriteKeyToUse})`);
      
      // ✅ ÉTAPE 11: Test final de visibilité (délayé)
      this.scene.time.delayedCall(100, () => {
        this.validateNpcVisibility(npc.id);
      });
      
    } catch (error) {
      console.error(`❌ Erreur création NPC ${npc.id}:`, error);
      
      // ✅ FALLBACK ULTIME : Créer avec sprite par défaut
      try {
        console.log(`🔄 Tentative fallback ultime pour NPC ${npc.id}...`);
        await this.createNpcWithUltimateFallback(npc);
      } catch (fallbackError) {
        console.error(`❌ Échec fallback ultime pour NPC ${npc.id}:`, fallbackError);
        throw error; // Re-throw l'erreur originale
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE : Attendre la disponibilité d'un sprite
  async waitForSpriteAvailability(spriteKey, timeoutMs = 3000) {
    console.log(`⏳ Attente disponibilité sprite: ${spriteKey} (timeout: ${timeoutMs}ms)`);
    
    const startTime = Date.now();
    const checkInterval = 100; // Vérifier toutes les 100ms
    
    return new Promise((resolve) => {
      const checkSprite = () => {
        // ✅ Vérifier si le sprite est disponible
        if (this.scene.textures.exists(spriteKey)) {
          console.log(`✅ Sprite ${spriteKey} disponible après ${Date.now() - startTime}ms`);
          resolve(true);
          return;
        }
        
        // ✅ Timeout dépassé
        if (Date.now() - startTime >= timeoutMs) {
          console.warn(`⏰ Timeout atteint pour sprite ${spriteKey} après ${timeoutMs}ms`);
          resolve(false);
          return;
        }
        
        // ✅ Continuer à attendre
        setTimeout(checkSprite, checkInterval);
      };
      
      checkSprite();
    });
  }

  // ✅ NOUVELLE MÉTHODE : Valider la création d'un sprite
  validateSpriteCreation(sprite, npcId) {
    if (!sprite) {
      console.error(`❌ Sprite null pour NPC ${npcId}`);
      return false;
    }
    
    if (!sprite.texture) {
      console.error(`❌ Pas de texture pour sprite NPC ${npcId}`);
      return false;
    }
    
    if (!sprite.scene) {
      console.error(`❌ Sprite non attaché à la scène pour NPC ${npcId}`);
      return false;
    }
    
    if (sprite.x === undefined || sprite.y === undefined) {
      console.error(`❌ Position invalide pour sprite NPC ${npcId}: (${sprite.x}, ${sprite.y})`);
      return false;
    }
    
    // ✅ Vérifications de visibilité
    if (!sprite.visible) {
      console.warn(`⚠️ Sprite NPC ${npcId} créé mais pas visible`);
    }
    
    if (!sprite.active) {
      console.warn(`⚠️ Sprite NPC ${npcId} créé mais pas actif`);
    }
    
    console.log(`✅ Sprite NPC ${npcId} validé avec succès`);
    return true;
  }

  // ✅ NOUVELLE MÉTHODE : Valider la visibilité d'un NPC après création
  validateNpcVisibility(npcId) {
    const visual = this.npcVisuals.get(npcId);
    const data = this.npcData.get(npcId);
    
    if (!visual || !data) {
      console.error(`❌ NPC ${npcId} manquant pour validation visibilité`);
      return false;
    }
    
    if (!visual.sprite || !this.isGameObjectValid(visual.sprite)) {
      console.error(`❌ Sprite NPC ${npcId} invalide lors de la validation`);
      return false;
    }
    
    const sprite = visual.sprite;
    
    // ✅ Vérifications et corrections automatiques
    let needsFixing = false;
    const fixes = [];
    
    if (!sprite.visible) {
      sprite.setVisible(true);
      needsFixing = true;
      fixes.push('visible');
    }
    
    if (!sprite.active) {
      sprite.setActive(true);
      needsFixing = true;
      fixes.push('active');
    }
    
    if (sprite.alpha < 1) {
      sprite.setAlpha(1);
      needsFixing = true;
      fixes.push('alpha');
    }
    
    if (sprite.depth < 4) {
      sprite.setDepth(4);
      needsFixing = true;
      fixes.push('depth');
    }
    
    // ✅ Vérifier position
    const expectedX = data.x;
    const expectedY = data.y;
    
    if (Math.abs(sprite.x - expectedX) > 1 || Math.abs(sprite.y - expectedY) > 1) {
      sprite.setPosition(expectedX, expectedY);
      needsFixing = true;
      fixes.push('position');
    }
    
    if (needsFixing) {
      console.log(`🔧 NPC ${npcId} (${data.name}) corrigé automatiquement:`, fixes);
    } else {
      console.log(`✅ NPC ${npcId} (${data.name}) visibilité validée`);
    }
    
    return true;
  }

  // ✅ MÉTHODE AMÉLIORÉE : Fallback ultime avec validation
  async createNpcWithUltimateFallback(npc) {
    console.log(`🆘 Création NPC ${npc.id} avec fallback ultime amélioré...`);
    
    try {
      // ✅ S'assurer que le fallback existe
      const fallbackSprite = this.npcSpriteManager.config.fallbackSprite;
      
      if (!this.scene.textures.exists(fallbackSprite)) {
        console.log(`🎨 Création fallback graphique pour NPC ${npc.id}...`);
        this.npcSpriteManager.createDefaultFallback();
        
        // ✅ Attendre que le fallback soit créé
        await this.waitForSpriteAvailability(fallbackSprite, 1000);
        
        if (!this.scene.textures.exists(fallbackSprite)) {
          throw new Error(`Impossible de créer fallback sprite pour NPC ${npc.id}`);
        }
      }
      
      // ✅ Créer le sprite avec fallback
      const sprite = this.scene.add.sprite(npc.x, npc.y, fallbackSprite);
      sprite.setOrigin(0.5, 1)
        .setDepth(4)
        .setScale(1)
        .setVisible(true)
        .setActive(true)
        .setAlpha(1)
        .setTint(0xff9999); // ✅ Teinte légèrement rouge pour indiquer le fallback
      
      // ✅ Valider la création
      const isValid = this.validateSpriteCreation(sprite, npc.id);
      if (!isValid) {
        throw new Error(`Fallback sprite invalide pour NPC ${npc.id}`);
      }
      
      // ✅ Marquer comme fallback ultime
      sprite.npcSpriteInfo = {
        originalSprite: npc.sprite,
        finalSprite: fallbackSprite,
        isFromMongoDB: !!npc.sprite,
        isFallback: true,
        isUltimateFallback: true,
        createdAt: Date.now()
      };
      
      const nameContainer = this.createNameContainer(npc);
      
      this.npcVisuals.set(npc.id, { 
        sprite, 
        nameContainer,
        spriteInfo: sprite.npcSpriteInfo
      });
      this.npcData.set(npc.id, npc);
      
      console.log(`✅ NPC ${npc.name} créé avec fallback ultime`);
      
      // ✅ Test final de visibilité
      this.scene.time.delayedCall(100, () => {
        this.validateNpcVisibility(npc.id);
      });
      
    } catch (error) {
      console.error(`❌ Échec complet fallback ultime pour NPC ${npc.id}:`, error);
      throw error;
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE : Debug avec informations sprites détaillées
  debugSpawnedNpcs() {
    console.log("🔍 === DEBUG NPCs SPAWNÉS AVEC SPRITES ===");
    this.npcVisuals.forEach((visual, id) => {
      const data = this.npcData.get(id);
      const spriteInfo = visual.spriteInfo || {};
      
      console.log(`🎭 NPC ${id}:`, {
        name: data?.name,
        originalSprite: spriteInfo.originalSprite,
        finalSprite: spriteInfo.finalSprite,
        isFallback: spriteInfo.isFallback,
        isUltimateFallback: spriteInfo.isUltimateFallback,
        spriteExists: visual.sprite ? this.isGameObjectValid(visual.sprite) : false,
        visible: visual.sprite?.visible,
        active: visual.sprite?.active,
        alpha: visual.sprite?.alpha,
        depth: visual.sprite?.depth,
        x: visual.sprite?.x,
        y: visual.sprite?.y,
        nameContainer: !!visual.nameContainer
      });
    });
    
    // ✅ Afficher stats du NpcSpriteManager
    console.log("🎨 === STATS SPRITE MANAGER ===");
    this.npcSpriteManager.debugStats();
  }

  // ✅ MÉTHODE AMÉLIORÉE : Debug complet avec sprite manager
  debugFullState() {
    console.log("🔍 === DEBUG COMPLET NPC MANAGER AVEC SPRITES ===");
    console.log(`📊 Scene: ${this.scene?.scene?.key || 'AUCUNE'}`);
    console.log(`📊 Détruit: ${this.isDestroyed}`);
    console.log(`📊 En cours de spawn: ${this.isSpawning}`);
    console.log(`📊 NPCs data: ${this.npcData.size}`);
    console.log(`📊 NPCs visuals: ${this.npcVisuals.size}`);
    
    // ✅ Debug du NpcSpriteManager
    console.log("🎨 === ÉTAT SPRITE MANAGER ===");
    const spriteManagerInfo = this.npcSpriteManager.getDebugInfo();
    console.log(`🎨 Sprites chargés: ${spriteManagerInfo.cache.loaded.length}`);
    console.log(`🎨 Sprites en échec: ${spriteManagerInfo.cache.failed.length}`);
    console.log(`🎨 Stats:`, spriteManagerInfo.stats);
    
    // ✅ Debug des textures disponibles
    if (this.scene?.textures) {
      const textureList = Object.keys(this.scene.textures.list);
      console.log(`🎨 Textures Phaser disponibles (${textureList.length}):`, textureList.slice(0, 10));
    }
    
    // ✅ Debug de chaque NPC avec sprites
    this.debugSpawnedNpcs();
  }

  // ✅ NOUVELLES MÉTHODES : Gestion avancée des sprites NPCs
  
  getNpcSpriteInfo(npcId) {
    const visual = this.npcVisuals.get(npcId);
    if (!visual || !visual.spriteInfo) {
      return null;
    }
    
    return {
      npcId,
      ...visual.spriteInfo,
      currentTextureKey: visual.sprite?.texture?.key,
      isVisible: visual.sprite?.visible,
      isActive: visual.sprite?.active,
      position: {
        x: visual.sprite?.x,
        y: visual.sprite?.y
      }
    };
  }

  async reloadNpcSprite(npcId, newSpriteKey = null) {
    console.log(`🔄 === RECHARGEMENT SPRITE NPC ${npcId} ===`);
    
    const visual = this.npcVisuals.get(npcId);
    const data = this.npcData.get(npcId);
    
    if (!visual || !data) {
      console.error(`❌ NPC ${npcId} non trouvé pour rechargement sprite`);
      return false;
    }
    
    try {
      // ✅ Utiliser le nouveau sprite ou celui d'origine
      const spriteToLoad = newSpriteKey || data.sprite;
      console.log(`🎨 Rechargement avec sprite: ${spriteToLoad}`);
      
      // ✅ Charger le nouveau sprite
      const spriteKeyToUse = await this.npcSpriteManager.getSpriteKeyToUse(spriteToLoad);
      
      // ✅ Attendre que le sprite soit disponible
      const spriteReady = await this.waitForSpriteAvailability(spriteKeyToUse, 2000);
      
      if (!spriteReady) {
        console.error(`❌ Impossible de charger nouveau sprite ${spriteKeyToUse} pour NPC ${npcId}`);
        return false;
      }
      
      // ✅ Mettre à jour le sprite existant
      if (visual.sprite) {
        visual.sprite.setTexture(spriteKeyToUse);
        
        // ✅ Mettre à jour les infos de sprite
        visual.spriteInfo = {
          originalSprite: spriteToLoad,
          finalSprite: spriteKeyToUse,
          isFromMongoDB: !!spriteToLoad,
          isFallback: spriteKeyToUse !== spriteToLoad,
          reloaded: true,
          reloadedAt: Date.now()
        };
        
        visual.sprite.npcSpriteInfo = visual.spriteInfo;
        
        console.log(`✅ Sprite NPC ${npcId} rechargé: ${spriteKeyToUse}`);
        return true;
      }
      
    } catch (error) {
      console.error(`❌ Erreur rechargement sprite NPC ${npcId}:`, error);
      return false;
    }
  }

  cleanupUnusedSprites() {
    console.log("🧹 === NETTOYAGE SPRITES INUTILISÉS ===");
    
    // ✅ Récupérer les sprites actuellement utilisés
    const activeSprites = Array.from(this.npcVisuals.values())
      .map(visual => visual.spriteInfo?.finalSprite)
      .filter(sprite => sprite);
    
    console.log(`🎨 Sprites actifs: ${activeSprites.length}`, activeSprites);
    
    // ✅ Nettoyer via le sprite manager
    const cleaned = this.npcSpriteManager.cleanupUnusedSprites(activeSprites);
    
    console.log(`✅ ${cleaned} sprites inutilisés nettoyés`);
    return cleaned;
  }

  // ✅ NOUVELLES MÉTHODES : Force actions pour récupération
  
  async forceShowAllNpcs() {
    console.log("🔧 === FORCE AFFICHAGE TOUS LES NPCs ===");
    
    if (!this.npcVisuals || this.npcVisuals.size === 0) {
      console.log("❌ Aucun NPC à forcer");
      return 0;
    }
    
    let fixed = 0;
    
    for (const [id, visual] of this.npcVisuals) {
      const data = this.npcData.get(id);
      console.log(`🔧 Force fix NPC ${id} (${data?.name})`);
      
      if (visual.sprite && this.isGameObjectValid(visual.sprite)) {
        // ✅ Forcer toutes les propriétés de visibilité
        visual.sprite.setVisible(true);
        visual.sprite.setActive(true);
        visual.sprite.setDepth(4);
        visual.sprite.setScale(1);
        visual.sprite.setAlpha(1);
        
        // ✅ Vérifier la position
        if (data && data.x !== undefined && data.y !== undefined) {
          visual.sprite.setPosition(data.x, data.y);
        }
        
        // ✅ Forcer le refresh de texture si fallback
        if (visual.spriteInfo?.isFallback) {
          console.log(`🔄 Refresh fallback texture pour NPC ${id}`);
          visual.sprite.setTexture(this.npcSpriteManager.config.fallbackSprite);
        }
        
        fixed++;
        console.log(`✅ NPC ${id} forcé visible à (${visual.sprite.x}, ${visual.sprite.y})`);
      }
      
      // ✅ Forcer aussi le nameContainer
      if (visual.nameContainer && this.isGameObjectValid(visual.nameContainer)) {
        visual.nameContainer.setVisible(true);
        visual.nameContainer.setActive(true);
        visual.nameContainer.setDepth(4.1);
        if (data && data.x !== undefined && data.y !== undefined) {
          visual.nameContainer.setPosition(data.x - 7, data.y - 42);
        }
      }
    }
    
    console.log(`✅ ${fixed} NPCs forcés visibles`);
    return fixed;
  }

  async forceReloadAllNpcs() {
    console.log("🔄 === FORCE RELOAD COMPLET NPCs ===");
    
    if (this.isSpawning) {
      console.warn("⚠️ Spawn en cours, attente...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // ✅ Sauvegarder les données NPCs actuelles
    const savedNpcs = Array.from(this.npcData.values());
    console.log(`💾 Sauvegarde de ${savedNpcs.length} NPCs`);
    
    // ✅ Clear complet
    this.clearAllNpcs();
    
    // ✅ Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ✅ Re-spawner
    if (savedNpcs.length > 0) {
      console.log(`♻️ Re-spawn de ${savedNpcs.length} NPCs...`);
      await this.spawnNpcs(savedNpcs);
      
      // ✅ Force affichage après re-spawn
      setTimeout(() => {
        this.forceShowAllNpcs();
      }, 1000);
    }
  }

  // ✅ MÉTHODE MODIFIÉE : Nettoyage avec sprite manager
  clearAllNpcs() {
    if (this.isDestroyed) {
      console.warn("⚠️ NpcManager déjà détruit, skip clearAllNpcs");
      return;
    }

    console.log("🧹 === NETTOYAGE NPCs AVEC SPRITES ===");
    console.log(`🧹 NPCs à nettoyer: ${this.npcVisuals.size}`);
    
    // ✅ RESET DU FLAG DE SPAWN
    this.isSpawning = false;
    
    this.npcVisuals.forEach(({ sprite, nameContainer }, id) => {
      console.log(`🗑️ Suppression NPC ID ${id}`);
      
      // ✅ Sprite
      if (sprite) {
        if (this.isGameObjectValid(sprite)) {
          try {
            sprite.destroy();
            console.log(`✅ Sprite NPC ${id} détruit`);
          } catch (error) {
            console.warn(`⚠️ Erreur destruction sprite NPC ${id}:`, error);
          }
        } else {
          console.log(`🔍 Sprite du NPC ${id} déjà détruit ou invalide`);
        }
      }
      
      // ✅ Name container
      if (nameContainer) {
        if (this.isGameObjectValid(nameContainer)) {
          try {
            nameContainer.destroy();
            console.log(`✅ NameContainer NPC ${id} détruit`);
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
    
    // ✅ Nettoyer les sprites inutilisés après clearing
    setTimeout(() => {
      this.cleanupUnusedSprites();
    }, 100);
    
    console.log("✅ Nettoyage NPCs et sprites terminé");
  }

  // ✅ MÉTHODE MODIFIÉE : Destruction avec sprite manager
  destroy() {
    console.log("💀 Destruction NpcManager avec NpcSpriteManager");
    
    this.isDestroyed = true;
    this.clearAllNpcs();
    
    // ✅ Détruire le NpcSpriteManager
    if (this.npcSpriteManager) {
      this.npcSpriteManager.destroy();
      this.npcSpriteManager = null;
    }
    
    // ✅ Nettoyer les références
    this.scene = null;
    this.npcVisuals = null;
    this.npcData = null;
  }

  // ===== MÉTHODES EXISTANTES INCHANGÉES =====
  
  isGameObjectValid(gameObject) {
    try {
      if (!gameObject) return false;
      if (gameObject.destroyed) return false;
      if (gameObject.scene) {
        if (gameObject.scene.sys && gameObject.scene.sys.isDestroyed) return false;
      }
      const _ = gameObject.active !== undefined ? gameObject.active : true;
      return true;
    } catch (error) {
      return false;
    }
  }

  updateQuestIndicators(questStatuses) {
    questStatuses.forEach(status => {
      const visuals = this.npcVisuals.get(status.npcId);
      if (visuals && this.isGameObjectValid(visuals.nameContainer)) {
        this.updateQuestIndicator(visuals.nameContainer, status.type);
      }
    });
  }

  updateQuestIndicator(nameContainer, questType) {
    const oldIndicator = nameContainer.getByName('questIndicator');
    if (oldIndicator) {
      oldIndicator.destroy();
    }

    let indicatorText = '';
    let indicatorColor = 0xFFFFFF;

    switch (questType) {
      case 'questAvailable':
        indicatorText = '!';
        indicatorColor = 0xFFD700;
        break;
      case 'questInProgress':
        indicatorText = '?';
        indicatorColor = 0x808080;
        break;
      case 'questReadyToComplete':
        indicatorText = '?';
        indicatorColor = 0xFFD700;
        break;
      default:
        return;
    }

    const indicator = this.scene.add.text(0, -16, indicatorText, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: `#${indicatorColor.toString(16).padStart(6, '0')}`,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);
    
    indicator.name = 'questIndicator';
    nameContainer.add(indicator);

    this.scene.tweens.add({
      targets: indicator,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  createNameContainer(npc) {
    const nameContainer = this.scene.add.container(npc.x - 7, npc.y - 42);

    const tempText = this.scene.add.text(0, 0, npc.name, {
      fontFamily: "monospace",
      fontSize: "10px",
      fontStyle: "bold"
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const nameBg = this.scene.add.graphics();
    
    const bgColor = 0xF5E6B3;
    const borderColor = 0xB8935A;
    const shadowColor = 0x8B6F47;

    nameBg
      .fillStyle(shadowColor, 0.6)
      .fillRoundedRect(-(textWidth/2) - 6.4 + 1.6, -7.2 + 1.6, textWidth + 12.8, 14.4, 6.4)
      .fillStyle(bgColor, 0.95)
      .fillRoundedRect(-(textWidth/2) - 6.4, -7.2, textWidth + 12.8, 14.4, 6.4)
      .lineStyle(1.6, shadowColor, 0.8)
      .strokeRoundedRect(-(textWidth/2) - 6.4, -7.2, textWidth + 12.8, 14.4, 6.4)
      .lineStyle(0.8, 0xFFFFDD, 0.6)
      .strokeRoundedRect(-(textWidth/2) - 5.6, -6.4, textWidth + 11.2, 12.8, 5.6);

    const nameText = this.scene.add.text(0, -0.8, npc.name, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#2B1810",
      fontStyle: "bold",
      align: "center",
      stroke: "#F5E6B3",
      strokeThickness: 0.8
    }).setOrigin(0.5, 0.5);

    const decorDot1 = this.scene.add.rectangle(-(textWidth/2) - 4, -4.8, 1.6, 1.6, borderColor);
    const decorDot2 = this.scene.add.rectangle((textWidth/2) + 4, -4.8, 1.6, 1.6, borderColor);
    const decorDot3 = this.scene.add.rectangle(-(textWidth/2) - 4, 3.2, 1.6, 1.6, borderColor);
    const decorDot4 = this.scene.add.rectangle((textWidth/2) + 4, 3.2, 1.6, 1.6, borderColor);

    nameContainer.add([nameBg, nameText, decorDot1, decorDot2, decorDot3, decorDot4]);
    nameContainer.setDepth(4.1);

    try {
      if (this.scene && !this.scene.sys.isDestroyed) {
        nameContainer.setScale(0);
        this.scene.tweens.add({
          targets: nameContainer,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {},
          onError: (error) => {
            console.warn("⚠️ Erreur animation nameContainer:", error);
          }
        });
      } else {
        nameContainer.setScale(1);
      }
    } catch (error) {
      console.warn("⚠️ Erreur setup animation:", error);
      nameContainer.setScale(1);
    }

    return nameContainer;
  }

  // ===== AUTRES MÉTHODES EXISTANTES INCHANGÉES =====
  
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

  highlightClosestNpc(playerX, playerY, maxDist = 64) {
    if (this.isDestroyed) return;
    
    this.npcVisuals.forEach(({ sprite, nameContainer }) => {
      if (this.isGameObjectValid(sprite)) {
        try {
          sprite.clearTint();
        } catch (error) {
          console.warn("⚠️ Erreur clearTint:", error);
        }
      }
    });

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

  debugNpcs() {
    if (this.isDestroyed) {
      console.log("🐛 [DEBUG] NpcManager détruit");
      return;
    }
    
    console.log("🐛 [DEBUG] État actuel des NPCs avec sprites:");
    console.log(`📊 Total NPCs data: ${this.npcData.size}`);
    console.log(`📊 Total NPCs visuals: ${this.npcVisuals.size}`);
    
    this.npcData.forEach((npc, id) => {
      const visuals = this.npcVisuals.get(id);
      let visualsStatus = 'MANQUANT';
      let spriteInfo = '';
      
      if (visuals) {
        const spriteValid = this.isGameObjectValid(visuals.sprite);
        const containerValid = this.isGameObjectValid(visuals.nameContainer);
        visualsStatus = `Sprite: ${spriteValid ? 'OK' : 'INVALID'}, Container: ${containerValid ? 'OK' : 'INVALID'}`;
        
        // ✅ Ajouter info sprite
        if (visuals.spriteInfo) {
          spriteInfo = `[${visuals.spriteInfo.originalSprite} → ${visuals.spriteInfo.finalSprite}${visuals.spriteInfo.isFallback ? ' (FALLBACK)' : ''}]`;
        }
      }
      
      console.log(`  - ${npc.name} (ID: ${id}) à (${npc.x}, ${npc.y}) - ${visualsStatus} ${spriteInfo}`);
    });
  }

  isValid() {
    return !this.isDestroyed && this.scene && !this.scene.sys.isDestroyed;
  }

  forceRespawn() {
    if (this.isDestroyed || !this.scene) return;
    
    console.log("🔄 Force respawn des NPCs avec sprites...");
    
    const savedNpcs = Array.from(this.npcData.values());
    
    this.clearAllNpcs();
    
    if (savedNpcs.length > 0) {
      console.log(`♻️ Recréation de ${savedNpcs.length} NPCs avec sprites dynamiques`);
      this.spawnNpcs(savedNpcs);
    }
  }
}
