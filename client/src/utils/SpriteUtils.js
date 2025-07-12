/**
 * SpriteUtils.js - Gestion des sprites avec support FlapAround-Anim
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
    } else if (animationFile.includes('FlapAround-Anim')) {
      if (width === 328 && height === 28) structure = { cols: 15, rows: 1 };
      else if (width === 432 && height === 320) structure = { cols: 18, rows: 1 };
      else if (width === 512 && height === 32) structure = { cols: 16, rows: 1 };
      else if (width === 256 && height === 32) structure = { cols: 8, rows: 1 };
      else if (width === 320 && height === 32) structure = { cols: 10, rows: 1 };
      else if (width === 480 && height === 32) structure = { cols: 15, rows: 1 };
      else {
        const possibleCols = [8, 10, 12, 14, 15, 16, 18, 19, 20, 22, 24];
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
      
      if (rows === 1 && animationFile.includes('FlapAround')) {
        score += 1000;
        if (cols === 15) score += 100;
        if (cols === 18) score += 90;
        if (cols === 16) score += 85;
        if (cols === 8) score += 50;
        if (cols === 10) score += 40;
        if (cols % 2 === 0) score += 20;
        
        if (frameWidth >= 16 && frameWidth <= 48 && frameHeight >= 16 && frameHeight <= 400) {
          score += 50;
        }
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
        if ([40, 48, 64, 32, 16, 15, 8, 9, 10, 18].includes(totalFrames)) score += 10;
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
    } else if (rows === 1 && animationFile.includes('FlapAround')) {
      if (cols === 15) type = 'flaparound-15f';
      if (cols === 18) type = 'flaparound-18f';
      else if (cols === 16) type = 'flaparound-full';
      else if (cols === 8) type = 'flaparound-simple';
      else type = 'flaparound';
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
    
    console.log(`🧪 [SpriteUtils] === TEST BATCH ${testCases.length} POKÉMON avec FlapAround ===`);
    
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`\n🎯 Test ${testCase.name} (${testCase.id}):`);
      
      try {
        const walkResult = await this.testPokemonSprite(testCase.id, 'Walk-Anim.png');
        const swingResult = await this.testPokemonSprite(testCase.id, 'Swing-Anim.png');
        const flapResult = await this.testPokemonSprite(testCase.id, 'FlapAround-Anim.png');
        
        results.push({
          pokemon: testCase,
          walk: walkResult,
          swing: swingResult,
          flap: flapResult,
          success: !!(walkResult && swingResult && flapResult)
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

}
