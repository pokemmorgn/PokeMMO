// client/src/managers/Battle/PokemonSpriteManager.js
// Gestionnaire spécialisé pour les sprites Pokémon en combat

export class PokemonSpriteManager {
  constructor(scene) {
    this.scene = scene;
    
    // Sprites actuels
    this.playerSprite = null;
    this.opponentSprite = null;
    
    // Cache et état
    this.spriteStructures = new Map(); // pokemonId_view -> structure
    this.loadingSprites = new Set();
    this.loadedSprites = new Set();
    
    // Données actuelles
    this.currentPlayerData = null;
    this.currentOpponentData = null;
    
    // Positions (% de l'écran)
    this.positions = {
      player: { x: 0.22, y: 0.75 },
      opponent: { x: 0.78, y: 0.35 },
      playerPlatform: { x: 0.25, y: 0.85 },
      opponentPlatform: { x: 0.75, y: 0.45 }
    };
    
    // Échelles
    this.scales = {
      player: 3.5,
      opponent: 2.8,
      placeholderPlayer: 1.5,
      placeholderOpponent: 1.2
    };
    
    console.log('🐾 [PokemonSpriteManager] Initialisé');
  }

  // === AFFICHAGE PRINCIPAL ===

  /**
   * Affiche le Pokémon du joueur
   */
  async displayPlayerPokemon(pokemonData) {
    if (!pokemonData) {
      console.warn('⚠️ [PokemonSpriteManager] Données joueur manquantes');
      return;
    }
    
    console.log('👤 [PokemonSpriteManager] Affichage Pokémon joueur:', pokemonData.name);
    
    // Nettoyer l'ancien sprite
    this.clearPlayerSprite();
    
    try {
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'back');
      const { width, height } = this.scene.cameras.main;
      
      const x = width * this.positions.player.x;
      const y = height * this.positions.player.y;
      
      this.playerSprite = this.scene.add.sprite(x, y, spriteKey, 0);
      this.playerSprite.setScale(this.scales.player);
      this.playerSprite.setDepth(25);
      this.playerSprite.setOrigin(0.5, 1);
      this.playerSprite.setData('isPokemon', true);
      this.playerSprite.setData('pokemonRole', 'player');
      
      // Animation d'entrée
      this.animatePokemonEntry(this.playerSprite, 'left');
      
      // Sauvegarder les données
      this.currentPlayerData = pokemonData;
      
      console.log('✅ [PokemonSpriteManager] Pokémon joueur affiché');
      return this.playerSprite;
      
    } catch (error) {
      console.error('❌ [PokemonSpriteManager] Erreur Pokémon joueur:', error);
      return this.createPokemonPlaceholder('player', pokemonData);
    }
  }

  /**
   * Affiche le Pokémon adversaire
   */
  async displayOpponentPokemon(pokemonData) {
    if (!pokemonData) {
      console.warn('⚠️ [PokemonSpriteManager] Données adversaire manquantes');
      return;
    }
    
    console.log('👹 [PokemonSpriteManager] Affichage Pokémon adversaire:', pokemonData.name);
    
    // Nettoyer l'ancien sprite
    this.clearOpponentSprite();
    
    try {
      const spriteKey = await this.loadPokemonSprite(pokemonData.pokemonId || pokemonData.id, 'front');
      const { width, height } = this.scene.cameras.main;
      
      const x = width * this.positions.opponent.x;
      const y = height * this.positions.opponent.y;
      
      this.opponentSprite = this.scene.add.sprite(x, y, spriteKey, 0);
      this.opponentSprite.setScale(this.scales.opponent);
      this.opponentSprite.setDepth(20);
      this.opponentSprite.setOrigin(0.5, 1);
      this.opponentSprite.setData('isPokemon', true);
      this.opponentSprite.setData('pokemonRole', 'opponent');
      
      // Animation d'entrée
      this.animatePokemonEntry(this.opponentSprite, 'right');
      
      // Effet shiny si applicable
      if (pokemonData.shiny) {
        this.addShinyEffect(this.opponentSprite);
      }
      
      // Sauvegarder les données
      this.currentOpponentData = pokemonData;
      
      console.log('✅ [PokemonSpriteManager] Pokémon adversaire affiché');
      return this.opponentSprite;
      
    } catch (error) {
      console.error('❌ [PokemonSpriteManager] Erreur Pokémon adversaire:', error);
      return this.createPokemonPlaceholder('opponent', pokemonData);
    }
  }

  // === CHARGEMENT DES SPRITES ===

  /**
   * Charge un sprite Pokémon avec détection automatique de structure
   */
  async loadPokemonSprite(pokemonId, view = 'front') {
    const spriteKey = `pokemon_${pokemonId.toString().padStart(3, '0')}_${view}`;
    
    // Déjà chargé
    if (this.loadedSprites.has(spriteKey)) {
      return spriteKey;
    }
    
    // En cours de chargement
    if (this.loadingSprites.has(spriteKey)) {
      return this.waitForSpriteLoad(spriteKey);
    }
    
    this.loadingSprites.add(spriteKey);
    
    try {
      const paddedId = pokemonId.toString().padStart(3, '0');
      const imagePath = `assets/pokemon/${paddedId}/${view}.png`;
      
      // Charger temporairement pour détecter la structure
      const tempKey = `${spriteKey}_temp`;
      
      await new Promise((resolve, reject) => {
        this.scene.load.image(tempKey, imagePath);
        
        this.scene.load.once('complete', () => {
          try {
            const texture = this.scene.textures.get(tempKey);
            const width = texture.source[0].width;
            const height = texture.source[0].height;
            
            // Détection automatique de la structure
            const structure = this.detectSpriteStructure(width, height, view);
            
            console.log(`📐 [PokemonSpriteManager] ${spriteKey}: ${structure.cols} colonnes de ${structure.frameWidth}×${structure.frameHeight}px`);
            
            // Charger comme spritesheet avec la structure détectée
            this.scene.load.spritesheet(spriteKey, imagePath, {
              frameWidth: structure.frameWidth,
              frameHeight: structure.frameHeight
            });
            
            this.scene.load.once('complete', () => {
              // Nettoyer le temporaire
              this.scene.textures.remove(tempKey);
              this.loadedSprites.add(spriteKey);
              this.loadingSprites.delete(spriteKey);
              resolve(spriteKey);
            });
            
            this.scene.load.start();
            
          } catch (error) {
            reject(error);
          }
        });
        
        this.scene.load.once('loaderror', reject);
        this.scene.load.start();
      });
      
      return spriteKey;
      
    } catch (error) {
      console.error(`❌ [PokemonSpriteManager] Erreur chargement ${spriteKey}:`, error);
      this.loadingSprites.delete(spriteKey);
      return this.createFallbackSprite(view);
    }
  }

  /**
   * Attend qu'un sprite en cours de chargement soit prêt
   */
  async waitForSpriteLoad(spriteKey) {
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.loadedSprites.has(spriteKey)) {
          resolve(spriteKey);
        } else {
          setTimeout(checkLoaded, 50);
        }
      };
      checkLoaded();
    });
  }

  /**
   * Détecte automatiquement la structure d'un spritesheet Pokémon
   */
  detectSpriteStructure(width, height, view) {
    console.log(`🔍 [PokemonSpriteManager] Détection structure pour ${width}×${height} (${view})`);
    
    // Tailles de frames communes pour les Pokémon
    const prioritySizes = [48, 64, 32, 80, 96, 128];
    let bestStructure = null;
    
    // Essayer les tailles prioritaires
    for (const frameWidth of prioritySizes) {
      if (width % frameWidth === 0) {
        const cols = width / frameWidth;
        if (cols >= 10 && cols <= 100) {
          bestStructure = {
            cols: cols,
            rows: 1,
            frameWidth: frameWidth,
            frameHeight: height,
            totalFrames: cols,
            score: this.calculateStructureScore(frameWidth, height, cols, 1)
          };
          break;
        }
      }
    }
    
    // Si pas trouvé, essayer toutes les tailles possibles
    if (!bestStructure) {
      for (let frameWidth = 32; frameWidth <= 128; frameWidth++) {
        if (width % frameWidth === 0) {
          const cols = width / frameWidth;
          if (cols >= 10 && cols <= 100) {
            const structure = {
              cols: cols,
              rows: 1,
              frameWidth: frameWidth,
              frameHeight: height,
              totalFrames: cols,
              score: this.calculateStructureScore(frameWidth, height, cols, 1)
            };
            
            if (!bestStructure || structure.score > bestStructure.score) {
              bestStructure = structure;
            }
          }
        }
      }
    }
    
    // Fallback si rien trouvé
    if (!bestStructure) {
      const estimatedCols = Math.round(width / 64);
      bestStructure = {
        cols: estimatedCols,
        rows: 1,
        frameWidth: Math.floor(width / estimatedCols),
        frameHeight: height,
        totalFrames: estimatedCols,
        score: 0
      };
    }
    
    return bestStructure;
  }

  /**
   * Calcule un score pour une structure détectée
   */
  calculateStructureScore(frameW, frameH, cols, rows) {
    let score = 0;
    
    // Bonus pour les tailles courantes
    const commonSizes = [48, 64, 80, 96];
    if (commonSizes.includes(frameW)) score += 30;
    if (commonSizes.includes(frameH)) score += 20;
    
    // Bonus pour un ratio d'aspect carré
    const aspectRatio = frameW / frameH;
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 25;
    else if (aspectRatio >= 0.6 && aspectRatio <= 1.5) score += 15;
    
    // Bonus pour une seule ligne
    if (rows === 1) score += 20;
    
    // Bonus pour un nombre raisonnable de colonnes
    if (cols >= 20 && cols <= 50) score += 15;
    else if (cols >= 10 && cols <= 100) score += 10;
    
    // Malus pour des tailles étranges
    if (frameW < 32 || frameW > 200) score -= 20;
    if (frameH < 32 || frameH > 200) score -= 20;
    
    return score;
  }

  /**
   * Crée un sprite de fallback en cas d'erreur
   */
  createFallbackSprite(view) {
    const fallbackKey = `pokemon_placeholder_${view}`;
    
    if (!this.scene.textures.exists(fallbackKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      
      // Gradient selon la vue
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, view === 'front' ? '#4A90E2' : '#7ED321');
      gradient.addColorStop(1, view === 'front' ? '#2E5BBA' : '#5BA818');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Bordure
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Point d'interrogation
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('?', 48, 58);
      
      this.scene.textures.addCanvas(fallbackKey, canvas);
    }
    
    return fallbackKey;
  }

  // === PLACEHOLDERS ===

  /**
   * Crée un placeholder visuel en cas d'échec de chargement
   */
  createPokemonPlaceholder(type, pokemonData) {
    console.log(`🎭 [PokemonSpriteManager] Création placeholder ${type}:`, pokemonData.name);
    
    const { width, height } = this.scene.cameras.main;
    const position = type === 'player' ? 
      { x: width * this.positions.player.x, y: height * this.positions.player.y } :
      { x: width * this.positions.opponent.x, y: height * this.positions.opponent.y };
    
    const container = this.scene.add.container(position.x, position.y);
    
    // Couleur selon le type principal
    const primaryType = pokemonData.types?.[0] || 'normal';
    const typeColor = this.getTypeColor(primaryType);
    
    // Corps principal
    const body = this.scene.add.graphics();
    body.fillStyle(typeColor, 0.8);
    body.fillCircle(0, 0, 40);
    body.lineStyle(3, 0xFFFFFF, 0.8);
    body.strokeCircle(0, 0, 40);
    
    // Nom du Pokémon
    const nameText = this.scene.add.text(0, 15, pokemonData.name || 'Pokémon', {
      fontSize: '12px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#FFFFFF',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    nameText.setOrigin(0.5);
    
    container.add([body, nameText]);
    
    // Configuration selon le type
    const scale = type === 'player' ? this.scales.placeholderPlayer : this.scales.placeholderOpponent;
    container.setScale(scale);
    container.setDepth(type === 'player' ? 25 : 20);
    container.setData('isPokemon', true);
    container.setData('pokemonRole', type);
    container.setData('isPlaceholder', true);
    
    // Animation d'entrée
    this.animatePokemonEntry(container, type === 'player' ? 'left' : 'right');
    
    // Sauvegarder la référence
    if (type === 'player') {
      this.playerSprite = container;
      this.currentPlayerData = pokemonData;
    } else {
      this.opponentSprite = container;
      this.currentOpponentData = pokemonData;
    }
    
    return container;
  }

  // === ANIMATIONS ===

  /**
   * Animation d'entrée d'un Pokémon
   */
  animatePokemonEntry(sprite, direction) {
    if (!sprite) return;
    
    const targetX = sprite.x;
    const targetY = sprite.y;
    const targetScale = sprite.scaleX;
    const { width } = this.scene.cameras.main;
    
    // Position de départ (hors écran)
    const startX = direction === 'left' ? -150 : width + 150;
    
    sprite.setPosition(startX, targetY + 50);
    sprite.setScale(targetScale * 0.3);
    sprite.setAlpha(0);
    
    // Animation d'entrée avec rebond
    this.scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 1000,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Animation d'idle flottante
        this.addIdleAnimation(sprite, targetY);
      }
    });
  }

  /**
   * Animation d'idle (flottement)
   */
  addIdleAnimation(sprite, baseY) {
    if (!sprite) return;
    
    this.scene.tweens.add({
      targets: sprite,
      y: baseY - 8,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Effet shiny (scintillement doré)
   */
  addShinyEffect(sprite) {
    if (!sprite) return;
    
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFFD700,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    console.log('✨ [PokemonSpriteManager] Effet shiny appliqué');
  }

  // === EFFETS DE COMBAT ===

  /**
   * Animation d'attaque
   */
  animateAttack(attackerType, targetType) {
    const attacker = attackerType === 'player' ? this.playerSprite : this.opponentSprite;
    const target = targetType === 'player' ? this.playerSprite : this.opponentSprite;
    
    if (!attacker || !target) {
      console.warn('⚠️ [PokemonSpriteManager] Sprites manquants pour animation attaque');
      return;
    }
    
    const originalX = attacker.x;
    const moveDistance = attackerType === 'player' ? 50 : -50;
    
    // Mouvement vers l'avant
    this.scene.tweens.add({
      targets: attacker,
      x: originalX + moveDistance,
      duration: 200,
      ease: 'Power2.easeOut',
      yoyo: true,
      onYoyo: () => {
        // Impact sur la cible
        this.animateHit(target);
      },
      onComplete: () => {
        attacker.setX(originalX);
      }
    });
  }

  /**
   * Animation d'impact/dégâts
   */
  animateHit(sprite) {
    if (!sprite) return;
    
    const originalX = sprite.x;
    
    // Secousse horizontale
    this.scene.tweens.add({
      targets: sprite,
      x: originalX + 15,
      duration: 80,
      yoyo: true,
      repeat: 4,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.setX(originalX);
      }
    });
    
    // Flash rouge
    this.scene.tweens.add({
      targets: sprite,
      tint: 0xFF0000,
      duration: 150,
      yoyo: true,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        sprite.clearTint();
      }
    });
  }

  /**
   * Animation K.O.
   */
  animateFaint(pokemonType) {
    const sprite = pokemonType === 'player' ? this.playerSprite : this.opponentSprite;
    if (!sprite) return;
    
    console.log(`💀 [PokemonSpriteManager] Animation K.O. ${pokemonType}`);
    
    // Animation de chute avec rotation
    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y + 30,
      alpha: 0.3,
      angle: pokemonType === 'player' ? -90 : 90,
      duration: 1500,
      ease: 'Power2.easeIn'
    });
    
    // Effet visuel K.O.
    this.createKOEffect(sprite);
  }

  /**
   * Effet visuel K.O. (spirales)
   */
  createKOEffect(sprite) {
    if (!sprite) return;
    
    for (let i = 0; i < 3; i++) {
      const spiral = this.scene.add.graphics();
      spiral.lineStyle(3, 0xFFFFFF, 0.8);
      spiral.arc(0, 0, 20 + i * 10, 0, Math.PI * 2);
      spiral.setPosition(sprite.x, sprite.y - 20);
      spiral.setDepth(50);
      
      this.scene.tweens.add({
        targets: spiral,
        y: spiral.y - 50,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        rotation: Math.PI * 4,
        duration: 2000,
        delay: i * 200,
        ease: 'Power2.easeOut',
        onComplete: () => spiral.destroy()
      });
    }
  }

  // === UTILITAIRES ===

  /**
   * Obtient la couleur d'un type Pokémon
   */
  getTypeColor(type) {
    const colors = {
      'normal': 0xA8A878, 'fire': 0xFF4444, 'water': 0x4488FF,
      'electric': 0xFFDD00, 'grass': 0x44DD44, 'ice': 0x88DDFF,
      'fighting': 0xCC2222, 'poison': 0xAA44AA, 'ground': 0xDDCC44,
      'flying': 0xAABBFF, 'psychic': 0xFF4488, 'bug': 0xAABB22,
      'rock': 0xBBAA44, 'ghost': 0x7755AA, 'dragon': 0x7744FF,
      'dark': 0x775544, 'steel': 0xAAAAAA, 'fairy': 0xFFAAEE
    };
    return colors[type.toLowerCase()] || 0xFFFFFF;
  }

  // === GETTERS ===

  /**
   * Obtient le sprite du joueur
   */
  getPlayerSprite() {
    return this.playerSprite;
  }

  /**
   * Obtient le sprite de l'adversaire
   */
  getOpponentSprite() {
    return this.opponentSprite;
  }

  /**
   * Obtient les données du Pokémon joueur
   */
  getPlayerData() {
    return this.currentPlayerData;
  }

  /**
   * Obtient les données du Pokémon adversaire
   */
  getOpponentData() {
    return this.currentOpponentData;
  }

  /**
   * Vérifie si les sprites sont chargés
   */
  areSpritesLoaded() {
    return !!(this.playerSprite && this.opponentSprite);
  }

  // === NETTOYAGE ===

  /**
   * Supprime le sprite du joueur
   */
  clearPlayerSprite() {
    if (this.playerSprite) {
      this.playerSprite.destroy();
      this.playerSprite = null;
    }
    this.currentPlayerData = null;
  }

  /**
   * Supprime le sprite de l'adversaire
   */
  clearOpponentSprite() {
    if (this.opponentSprite) {
      this.opponentSprite.destroy();
      this.opponentSprite = null;
    }
    this.currentOpponentData = null;
  }

  /**
   * Supprime tous les sprites
   */
  clearAllSprites() {
    this.clearPlayerSprite();
    this.clearOpponentSprite();
    
    // Nettoyage des sprites orphelins dans la scène
    const allSprites = this.scene.children.list.slice();
    let spritesRemoved = 0;
    
    allSprites.forEach(child => {
      if (child && child.getData && child.getData('isPokemon')) {
        child.destroy();
        spritesRemoved++;
      }
    });
    
    console.log(`🧹 [PokemonSpriteManager] ${spritesRemoved} sprites supprimés`);
  }

  /**
   * Détruit le manager
   */
  destroy() {
    console.log('💀 [PokemonSpriteManager] Destruction...');
    
    this.clearAllSprites();
    
    // Nettoyer les caches
    this.spriteStructures.clear();
    this.loadingSprites.clear();
    this.loadedSprites.clear();
    
    // Nettoyer les références
    this.scene = null;
    
    console.log('✅ [PokemonSpriteManager] Détruit');
  }
}
