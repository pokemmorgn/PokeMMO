/**
 * SpriteUtils.js - Gestion des sprites et icons Pokemon
 */

export class SpriteUtils {
  
  static spriteSizes = null;
  static spriteSizesLoaded = false;

  static async loadSpriteSizes() {
    if (this.spriteSizesLoaded) return;
    
    try {
      console.log("📋 [SpriteUtils] Chargement sprite-sizes.json...");
      
      const response = await fetch('/assets/pokemon/sprite-sizes.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.spriteSizes = await response.json();
      this.spriteSizesLoaded = true;
      
      console.log(`✅ [SpriteUtils] ${Object.keys(this.spriteSizes).length} Pokémon sprites chargés`);
    } catch (error) {
      console.warn(`⚠️ [SpriteUtils] Impossible de charger sprite-sizes.json:`, error);
      this.spriteSizes = {};
      this.spriteSizesLoaded = true;
    }
  }

  // === 🎯 NOUVELLES MÉTHODES POUR LES ICONS ===

  /**
   * Génère le chemin vers l'icon d'un Pokémon
   * @param {number} pokemonId - ID du Pokémon (1-151+)
   * @returns {string} - Chemin vers l'icon
   */
  static getPokemonIconPath(pokemonId) {
    const paddedId = pokemonId.toString().padStart(3, '0');
    return `/assets/pokemon/${paddedId}/${paddedId}icons.png`;
  }

  /**
   * Récupère la structure de l'icon (toujours 128x64, 2 frames, on utilise l'index 0)
   * @param {number} pokemonId - ID du Pokémon
   * @returns {Object} - Structure de l'icon
   */
  static getPokemonIconStructure(pokemonId) {
    return {
      path: this.getPokemonIconPath(pokemonId),
      totalWidth: 128,
      totalHeight: 64,
      frameWidth: 64,  // 128 / 2 = 64px par frame
      frameHeight: 64, // Hauteur complète
      cols: 2,
      rows: 1,
      totalFrames: 2,
      useFrameIndex: 0, // On utilise toujours la première frame (index 0)
      name: `Icon ${pokemonId.toString().padStart(3, '0')}`,
      source: 'pokemon-icon',
      qualityScore: 100
    };
  }

  /**
   * Charge un icon Pokemon et retourne sa structure
   * @param {number} pokemonId - ID du Pokémon
   * @returns {Promise<Object>} - Structure de l'icon avec image
   */
  static async loadPokemonIcon(pokemonId) {
    const structure = this.getPokemonIconStructure(pokemonId);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Vérifier que l'image a bien la taille attendue
        if (img.width === 128 && img.height === 64) {
          console.log(`✅ [SpriteUtils] Icon ${pokemonId} chargé: ${img.width}x${img.height}`);
          structure.image = img;
          structure.loaded = true;
          resolve(structure);
        } else {
          console.warn(`⚠️ [SpriteUtils] Icon ${pokemonId} taille inattendue: ${img.width}x${img.height} (attendu: 128x64)`);
          structure.image = img;
          structure.loaded = true;
          structure.unexpected_size = true;
          resolve(structure);
        }
      };
      
      img.onerror = () => {
        console.error(`❌ [SpriteUtils] Impossible de charger l'icon ${pokemonId}`);
        structure.loaded = false;
        structure.error = true;
        reject(new Error(`Icon ${pokemonId} non trouvé`));
      };
      
      img.src = structure.path;
    });
  }

  /**
   * Crée un canvas avec seulement la première frame de l'icon
   * @param {number} pokemonId - ID du Pokémon
   * @returns {Promise<HTMLCanvasElement>} - Canvas avec l'icon frame 0
   */
  static async createPokemonIconCanvas(pokemonId) {
    try {
      const structure = await this.loadPokemonIcon(pokemonId);
      
      const canvas = document.createElement('canvas');
      canvas.width = structure.frameWidth;  // 64px
      canvas.height = structure.frameHeight; // 64px
      
      const ctx = canvas.getContext('2d');
      
      // Dessiner seulement la première frame (index 0)
      ctx.drawImage(
        structure.image,
        0, 0,                           // Source X, Y (première frame)
        structure.frameWidth,           // Source width
        structure.frameHeight,          // Source height
        0, 0,                          // Destination X, Y
        structure.frameWidth,           // Destination width
        structure.frameHeight           // Destination height
      );
      
      console.log(`🎨 [SpriteUtils] Canvas icon ${pokemonId} créé: ${canvas.width}x${canvas.height}`);
      return canvas;
      
    } catch (error) {
      console.error(`❌ [SpriteUtils] Erreur création canvas icon ${pokemonId}:`, error);
      throw error;
    }
  }

  /**
   * Convertit un icon en Data URL pour utilisation directe
   * @param {number} pokemonId - ID du Pokémon
   * @returns {Promise<string>} - Data URL de l'icon
   */
  static async getPokemonIconDataURL(pokemonId) {
    try {
      const canvas = await this.createPokemonIconCanvas(pokemonId);
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`❌ [SpriteUtils] Erreur conversion Data URL ${pokemonId}:`, error);
      return null;
    }
  }

  /**
   * Teste le chargement d'un icon Pokemon
   * @param {number} pokemonId - ID du Pokémon à tester
   */
  static async testPokemonIcon(pokemonId) {
    console.log(`🧪 [SpriteUtils] === TEST ICON ${pokemonId} ===`);
    
    try {
      const structure = await this.loadPokemonIcon(pokemonId);
      
      console.log(`📊 Résultat icon:`, {
        pokemonId,
        path: structure.path,
        size: `${structure.totalWidth}x${structure.totalHeight}`,
        frameSize: `${structure.frameWidth}x${structure.frameHeight}`,
        frames: structure.totalFrames,
        useFrame: structure.useFrameIndex,
        loaded: structure.loaded,
        unexpected: structure.unexpected_size || false
      });
      
      // Tester aussi la création du canvas
      const canvas = await this.createPokemonIconCanvas(pokemonId);
      console.log(`🎨 Canvas créé: ${canvas.width}x${canvas.height}`);
      
      return { structure, canvas };
      
    } catch (error) {
      console.error(`❌ Test icon échoué:`, error);
      return null;
    }
  }

  /**
   * Teste plusieurs icons Pokemon
   */
  static async testMultipleIcons() {
    const testCases = [
      { id: 1, name: 'Bulbizarre' },
      { id: 4, name: 'Salamèche' },
      { id: 7, name: 'Carapuce' },
      { id: 25, name: 'Pikachu' },
      { id: 150, name: 'Mewtwo' }
    ];
    
    console.log(`🧪 [SpriteUtils] === TEST BATCH ${testCases.length} ICONS ===`);
    
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`\n🎯 Test icon ${testCase.name} (${testCase.id}):`);
      
      try {
        const result = await this.testPokemonIcon(testCase.id);
        
        results.push({
          pokemon: testCase,
          success: !!result,
          result
        });
        
      } catch (error) {
        console.error(`❌ Erreur icon ${testCase.name}:`, error);
        results.push({
          pokemon: testCase,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 === RÉSUMÉ ICONS ===`);
    console.log(`✅ Succès: ${successCount}/${testCases.length}`);
    console.log(`❌ Échecs: ${testCases.length - successCount}/${testCases.length}`);
    
    return results;
  }

  // === 🎯 MÉTHODES EXISTANTES POUR LES ANIMATIONS (conservées) ===

  static async getSpriteStructure(pokemonId, animationFile, width, height) {
    if (!this.spriteSizesLoaded) {
      await this.loadSpriteSizes();
    }
    
    console.log(`🎯 [SpriteUtils] getSpriteStructure pour ${pokemonId} - ${animationFile} (${width}x${height})`);
    
    if (this.spriteSizes?.[pokemonId]?.[animationFile]) {
      const expectedSize = this.spriteSizes[pokemonId][animationFile];
      const [expectedW, expectedH] = expectedSize.split('x').map(Number);
      
      if (width === expectedW && height === expectedH) {
        console.log(`📋 [SpriteUtils] Taille confirmée par JSON: ${expectedSize}`);
        return this.getKnownStructureFromSize(expectedSize, animationFile);
      } else {
        console.warn(`⚠️ [SpriteUtils] Taille JSON ne correspond pas:`, {
          expected: expectedSize,
          actual: `${width}x${height}`,
          using: 'auto-detection'
        });
      }
    }
    
    return this.detectSpriteStructureAdvanced(width, height, animationFile);
  }

  static getKnownStructureFromSize(sizeString, animationFile) {
    const [width, height] = sizeString.split('x').map(Number);
    
    let structure;
    
    if (animationFile.includes('Walk-Anim')) {
      if (width === 160 && height === 256) structure = { cols: 5, rows: 8 };
      else if (width === 240 && height === 320) structure = { cols: 6, rows: 8 };
      else if (width === 192 && height === 256) structure = { cols: 6, rows: 8 };
      else if (width === 128 && height === 256) structure = { cols: 4, rows: 8 };
      else if (width === 256 && height === 256) structure = { cols: 8, rows: 8 };
      else {
        const possibleCols = [4, 5, 6, 8, 9, 10];
        for (const cols of possibleCols) {
          if (width % cols === 0 && height === 256) {
            structure = { cols, rows: 8 };
            break;
          }
        }
      }
    } else if (animationFile.includes('Swing-Anim')) {
      if (width === 288) structure = { cols: 9, rows: 1 };
      else if (width === 256) structure = { cols: 8, rows: 1 };
      else if (width === 192) structure = { cols: 6, rows: 1 };
      else {
        const possibleCols = [6, 8, 9, 10];
        for (const cols of possibleCols) {
          if (width % cols === 0) {
            structure = { cols, rows: 1 };
            break;
          }
        }
      }
    }
    
    if (!structure) {
      structure = this.detectSpriteStructureAdvanced(width, height, animationFile);
    } else {
      if (!structure.frameWidth) structure.frameWidth = width / structure.cols;
      if (!structure.frameHeight) structure.frameHeight = height / structure.rows;
      structure.totalFrames = structure.cols * structure.rows;
      structure.name = `${structure.cols}x${structure.rows} (JSON-${animationFile})`;
      structure.source = 'json-rules';
      structure.qualityScore = 100;
    }
    
    console.log(`✅ [SpriteUtils] Structure JSON: ${structure.name}`);
    return structure;
  }

  static detectSpriteStructureAdvanced(width, height, animationFile = '') {
    console.log(`🔍 [SpriteUtils] Détection avancée pour ${width}x${height} (${animationFile})`);
    
    const exactDivisions = [];
    
    for (let cols = 1; cols <= 24; cols++) {
      for (let rows = 1; rows <= 12; rows++) {
        const frameW = width / cols;
        const frameH = height / rows;
        
        if (frameW % 1 === 0 && frameH % 1 === 0) {
          exactDivisions.push({
            cols, rows, frameWidth: frameW, frameHeight: frameH,
            totalFrames: cols * rows
          });
        }
      }
    }
    
    if (exactDivisions.length === 0) {
      return this.createFallbackStructure(width, height);
    }
    
    const scoredOptions = exactDivisions.map(option => {
      let score = 0;
      const { cols, rows, frameWidth, frameHeight } = option;
      
      if (rows === 8 && animationFile.includes('Walk')) {
        score += 50;
        if (cols === 5) score += 30;
        if (cols === 6) score += 35;
        if (cols === 4) score += 20;
        if (cols === 8) score += 15;
      }
      
      if (rows === 1 && animationFile.includes('Swing')) {
        score += 40;
        if (cols === 8) score += 25;
        if (cols === 9) score += 30;
        if (cols === 6) score += 15;
      }
      
      if (frameWidth >= 16 && frameWidth <= 64 && frameHeight >= 16 && frameHeight <= 64) {
        score += 30;
        if (frameWidth % 8 === 0) score += 10;
        if (frameHeight % 8 === 0) score += 10;
        if (frameWidth === 32 && frameHeight === 32) score += 20;
        if (frameWidth === 40 && frameHeight === 40) score += 15;
      }
      
      const aspectRatio = frameWidth / frameHeight;
      if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
        score += 20;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 15;
      }
      
      const totalFrames = cols * rows;
      if (totalFrames >= 8 && totalFrames <= 80) {
        score += 15;
        if ([40, 48, 64, 32, 16, 8, 9, 10].includes(totalFrames)) score += 10;
      }
      
      if (cols > 24 || rows > 12) score -= 20;
      if (frameWidth < 8 || frameHeight < 8) score -= 30;
      if (frameWidth > 128 || frameHeight > 128) score -= 20;
      
      return {
        ...option,
        score,
        aspectRatio: (frameWidth / frameHeight).toFixed(2),
        name: this.generateStructureName(cols, rows, frameWidth, frameHeight, animationFile)
      };
    });
    
    scoredOptions.sort((a, b) => b.score - a.score);
    const best = scoredOptions[0];
    
    console.log(`✅ [SpriteUtils] Détection avancée: ${best.name} (score: ${best.score})`);
    console.log(`🔍 [SpriteUtils] Top 3 options:`, scoredOptions.slice(0, 3).map(o => `${o.name} (${o.score})`));
    
    return best;
  }

  static generateStructureName(cols, rows, frameWidth, frameHeight, animationFile) {
    let type = 'unknown';
    
    if (rows === 8 && animationFile.includes('Walk')) {
      if (cols === 5) type = 'walk-roucool';
      else if (cols === 6) type = 'walk-standard';
      else if (cols === 4) type = 'walk-compact';
      else type = 'walk';
    } else if (rows === 1 && animationFile.includes('Swing')) {
      type = 'swing';
    } else if (rows === 8) {
      type = 'walk-variant';
    }
    
    return `${cols}x${rows} (${type}) [${frameWidth}x${frameHeight}px]`;
  }

  static createFallbackStructure(width, height) {
    console.warn(`⚠️ [SpriteUtils] Aucune division exacte trouvée pour ${width}x${height}, utilisation fallback`);
    
    return {
      cols: 1,
      rows: 1,
      frameWidth: width,
      frameHeight: height,
      totalFrames: 1,
      name: `1x1 (fallback) [${width}x${height}px]`,
      source: 'fallback',
      qualityScore: 0,
      aspectRatio: (width / height).toFixed(2)
    };
  }

  static async detectSpriteStructureForOverworld(pokemonId, animationFile, width, height) {
    return await this.getSpriteStructure(pokemonId, animationFile, width, height);
  }

  static async loadPokemonSpriteStructure(pokemonId, animationFile, scene) {
    try {
      const paddedId = pokemonId.toString().padStart(3, '0');
      const spritePath = `/assets/pokemon/${paddedId}/${animationFile}`;
      
      return new Promise((resolve, reject) => {
        const tempImage = new Image();
        
        tempImage.onload = async () => {
          try {
            const structure = await this.getSpriteStructure(
              pokemonId, 
              animationFile, 
              tempImage.width, 
              tempImage.height
            );
            
            console.log(`✅ [SpriteUtils] Structure pour ${pokemonId}/${animationFile}:`, structure);
            resolve(structure);
          } catch (error) {
            reject(error);
          }
        };
        
        tempImage.onerror = () => {
          reject(new Error(`Impossible de charger ${spritePath}`));
        };
        
        tempImage.src = spritePath;
      });
      
    } catch (error) {
      console.error(`❌ [SpriteUtils] Erreur chargement structure:`, error);
      throw error;
    }
  }

  static async testPokemonSprite(pokemonId, animationFile = 'Walk-Anim.png') {
    console.log(`🧪 [SpriteUtils] === TEST ${pokemonId} - ${animationFile} ===`);
    
    try {
      const structure = await this.loadPokemonSpriteStructure(pokemonId, animationFile);
      
      console.log(`📊 Résultat:`, {
        pokemonId,
        animationFile,
        structure: structure.name,
        frames: `${structure.frameWidth}x${structure.frameHeight}`,
        grid: `${structure.cols}x${structure.rows}`,
        source: structure.source,
        score: structure.score || 'N/A'
      });
      
      return structure;
    } catch (error) {
      console.error(`❌ Test échoué:`, error);
      return null;
    }
  }

  static async testMultiplePokemon() {
    const testCases = [
      { id: 1, name: 'Bulbizarre' },
      { id: 4, name: 'Salamèche' },
      { id: 7, name: 'Carapuce' },
      { id: 16, name: 'Roucool' },
      { id: 25, name: 'Pikachu' }
    ];
    
    console.log(`🧪 [SpriteUtils] === TEST BATCH ${testCases.length} POKÉMON ===`);
    
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`\n🎯 Test ${testCase.name} (${testCase.id}):`);
      
      try {
        const walkResult = await this.testPokemonSprite(testCase.id, 'Walk-Anim.png');
        const swingResult = await this.testPokemonSprite(testCase.id, 'Swing-Anim.png');
        
        results.push({
          pokemon: testCase,
          walk: walkResult,
          swing: swingResult,
          success: !!(walkResult && swingResult)
        });
        
      } catch (error) {
        console.error(`❌ Erreur ${testCase.name}:`, error);
        results.push({
          pokemon: testCase,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 === RÉSUMÉ BATCH ===`);
    console.log(`✅ Succès: ${successCount}/${testCases.length}`);
    console.log(`❌ Échecs: ${testCases.length - successCount}/${testCases.length}`);
    
    return results;
  }

  // === 🎯 MÉTHODE UTILITAIRE POUR LE POKÉDEX ===

  /**
   * Génère le HTML pour afficher un icon Pokemon dans le Pokédx
   * @param {number} pokemonId - ID du Pokémon
   * @param {string} cssClass - Classes CSS additionnelles
   * @returns {string} - HTML de l'icon
   */
  static getPokemonIconHTML(pokemonId, cssClass = '') {
    const paddedId = pokemonId.toString().padStart(3, '0');
    const iconPath = this.getPokemonIconPath(pokemonId);
    
    return `<div class="pokemon-icon-container ${cssClass}" style="
      width: 64px; 
      height: 64px; 
      background-image: url('${iconPath}'); 
      background-position: 0 0; 
      background-size: 128px 64px; 
      background-repeat: no-repeat;
    " data-pokemon-id="${pokemonId}"></div>`;
  }

}

// === 🧪 MÉTHODES DE TEST RAPIDE ===

// Pour tester rapidement dans la console :
// SpriteUtils.testPokemonIcon(25); // Test Pikachu
// SpriteUtils.testMultipleIcons(); // Test batch
