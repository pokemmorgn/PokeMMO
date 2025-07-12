// 🦅 NOUVEAU: BONUS FLAPAROUND ANIMATION (1 ligne, paires)
      if (rows === 1 &&      // 🦅 NOUVEAU: BONUS FLAPAROUND ANIMATION (1 ligne, paires)
      if (rows === 1 && animationFile.includes('FlapAround')) {
        score += 100; // ✅ BOOST/**
 * 🔧 MISE À JOUR SPRITEUTILS.JS AVEC SYSTÈME JSON + DÉTECTION AVANCÉE + FLAPAROUND
 * ✅ Intégrer le JSON et la détection automatique qu'on a développé + support FlapAround
 */

export class SpriteUtils {
  
  // Cache pour les tailles de sprites
  static spriteSizes = null;
  static spriteSizesLoaded = false;

  // ✅ NOUVELLE MÉTHODE: Charger la base de données des tailles
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
      this.spriteSizesLoaded = true; // Éviter les retry
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Obtenir structure avec JSON + auto-détection
  static async getSpriteStructure(pokemonId, animationFile, width, height) {
    // Charger la base de données si pas encore fait
    if (!this.spriteSizesLoaded) {
      await this.loadSpriteSizes();
    }
    
    console.log(`🎯 [SpriteUtils] getSpriteStructure pour ${pokemonId} - ${animationFile} (${width}x${height})`);
    
    // 1. Vérifier JSON des tailles connues
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
    
    // 2. Fallback sur auto-détection améliorée
    return this.detectSpriteStructureAdvanced(width, height, animationFile);
  }

  // ✅ NOUVELLE MÉTHODE: Structure connue depuis taille
  static getKnownStructureFromSize(sizeString, animationFile) {
    const [width, height] = sizeString.split('x').map(Number);
    
    // Règles automatiques basées sur nos tests
    let structure;
    
    if (animationFile.includes('Walk-Anim')) {
      // Walk animations = toujours 8 lignes
      if (width === 160 && height === 256) structure = { cols: 5, rows: 8 }; // Roucool
      else if (width === 240 && height === 320) structure = { cols: 6, rows: 8 }; // Bulbizarre  
      else if (width === 192 && height === 256) structure = { cols: 6, rows: 8 }; // Standard
      else if (width === 128 && height === 256) structure = { cols: 4, rows: 8 }; // Compact
      else if (width === 256 && height === 256) structure = { cols: 8, rows: 8 }; // Large
      else {
        // Auto-calcul pour Walk
        const possibleCols = [4, 5, 6, 8, 9, 10];
        for (const cols of possibleCols) {
          if (width % cols === 0 && height === 256) {
            structure = { cols, rows: 8 };
            break;
          }
        }
      }
    } else if (animationFile.includes('Swing-Anim')) {
      // Swing animations = 1 ligne
      if (width === 288) structure = { cols: 9, rows: 1 };
      else if (width === 256) structure = { cols: 8, rows: 1 };
      else if (width === 192) structure = { cols: 6, rows: 1 };
      else {
        // Auto-calcul pour Swing
        const possibleCols = [6, 8, 9, 10];
        for (const cols of possibleCols) {
          if (width % cols === 0) {
            structure = { cols, rows: 1 };
            break;
          }
        }
      }
    } else if (animationFile.includes('FlapAround-Anim')) {
      // ✅ NOUVEAU: FlapAround animations = FORCER 1 ligne même si le sprite en a plusieurs
      // On utilise seulement la première ligne du sprite
      if (width === 432 && height === 320) structure = { cols: 18, rows: 1 }; // ✅ FORCE 18x1 au lieu de 18x8
      else if (width === 512 && height === 32) structure = { cols: 16, rows: 1 }; // 16 frames (8 directions x 2)
      else if (width === 256 && height === 32) structure = { cols: 8, rows: 1 }; // 8 frames (directions simples)
      else if (width === 320 && height === 32) structure = { cols: 10, rows: 1 }; // 10 frames
      else if (width === 480 && height === 32) structure = { cols: 15, rows: 1 }; // 15 frames
      else {
        // Auto-calcul pour FlapAround (TOUJOURS forcer 1 ligne)
        const possibleCols = [8, 10, 12, 14, 16, 18, 19, 20, 22, 24];
        for (const cols of possibleCols) {
          if (width % cols === 0) {
            structure = { cols, rows: 1 }; // ✅ TOUJOURS 1 ligne pour FlapAround
            break;
          }
        }
      }8 directions x 2 frames = 16 frames minimum
      if (width === 512 && height === 32) structure = { cols: 16, rows: 1 }; // 16 frames (8 directions x 2)
      else if (width === 256 && height === 32) structure = { cols: 8, rows: 1 }; // 8 frames (directions simples)
      else if (width === 320 && height === 32) structure = { cols: 10, rows: 1 }; // 10 frames
      else if (width === 480 && height === 32) structure = { cols: 15, rows: 1 }; // 15 frames
      else {
        // Auto-calcul pour FlapAround (toujours 1 ligne)
        const possibleCols = [8, 10, 12, 14, 16, 18, 20];
        for (const cols of possibleCols) {
          if (width % cols === 0 && height <= 64) { // FlapAround généralement petites frames
            structure = { cols, rows: 1 };
            break;
          }
        }
      }
    }
    
    // Fallback si aucune règle
    if (!structure) {
      structure = this.detectSpriteStructureAdvanced(width, height, animationFile);
    } else {
      structure.frameWidth = width / structure.cols;
      structure.frameHeight = height / structure.rows;
      structure.totalFrames = structure.cols * structure.rows;
      structure.name = `${structure.cols}x${structure.rows} (JSON-${animationFile})`;
      structure.source = 'json-rules';
      structure.qualityScore = 100;
    }
    
    console.log(`✅ [SpriteUtils] Structure JSON: ${structure.name}`);
    return structure;
  }

  // ✅ DÉTECTION AVANCÉE (notre système perfectionné)
  static detectSpriteStructureAdvanced(width, height, animationFile = '') {
    console.log(`🔍 [SpriteUtils] Détection avancée pour ${width}x${height} (${animationFile})`);
    
    // Générer toutes les divisions exactes possibles
    const exactDivisions = [];
    
    for (let cols = 1; cols <= 20; cols++) {
      for (let rows = 1; rows <= 20; rows++) {
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
    
    // Scoring intelligent
    const scoredOptions = exactDivisions.map(option => {
      let score = 0;
      const { cols, rows, frameWidth, frameHeight } = option;
      
      // 🎯 BONUS WALK ANIMATION (8 lignes)
      if (rows === 8 && animationFile.includes('Walk')) {
        score += 50;
        if (cols === 5) score += 30; // Roucool
        if (cols === 6) score += 35; // Standard/Bulbizarre
        if (cols === 4) score += 20; // Compact
        if (cols === 8) score += 15; // Large
      }
      
      // 🎯 BONUS SWING ANIMATION (1 ligne)
      if (rows === 1 && animationFile.includes('Swing')) {
        score += 40;
        if (cols === 8) score += 25;
        if (cols === 9) score += 30;
        if (cols === 6) score += 15;
      }
      
      // 🦅 NOUVEAU: BONUS FLAPAROUND ANIMATION (1 ligne, paires)
      if (rows === 1 && animationFile.includes('FlapAround')) {
        score += 1000; // ✅ SCORE ÉNORME pour forcer la détection 1 ligne
        if (cols === 18) score += 100; // 18 colonnes = parfait
        if (cols === 16) score += 90; // 8 directions x 2 frames = idéal
        if (cols === 8) score += 50;  // 8 directions simples
        if (cols === 10) score += 40; // Variant
        if (cols % 2 === 0) score += 20; // Bonus pour paires
        
        // Bonus pour frames rectangulaires (FlapAround peut avoir des frames hautes)
        if (frameWidth >= 16 && frameWidth <= 48 && frameHeight >= 16 && frameHeight <= 400) {
          score += 50;
        }
      }
      
      // 🎯 TAILLE DE FRAME OPTIMALE
      if (frameWidth >= 16 && frameWidth <= 64 && frameHeight >= 16 && frameHeight <= 64) {
        score += 30;
        if (frameWidth % 8 === 0) score += 10;
        if (frameHeight % 8 === 0) score += 10;
        if (frameWidth === 32 && frameHeight === 32) score += 20;
        if (frameWidth === 40 && frameHeight === 40) score += 15; // Bulbizarre
      }
      
      // 🎯 RATIO D'ASPECT
      const aspectRatio = frameWidth / frameHeight;
      if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
        score += 20;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 15;
      }
      
      // 🎯 NOMBRE DE FRAMES LOGIQUE
      const totalFrames = cols * rows;
      if (totalFrames >= 8 && totalFrames <= 80) {
        score += 15;
        if ([40, 48, 64, 32, 16, 8, 9, 10].includes(totalFrames)) score += 10;
      }
      
      // 🎯 ÉVITER FORMATS BIZARRES
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
    
    // Trier par score
    scoredOptions.sort((a, b) => b.score - a.score);
    const best = scoredOptions[0];
    
    console.log(`✅ [SpriteUtils] Détection avancée: ${best.name} (score: ${best.score})`);
    console.log(`🔍 [SpriteUtils] Top 3 options:`, scoredOptions.slice(0, 3).map(o => `${o.name} (${o.score})`));
    
    return best;
  }

  // ✅ GÉNÉRATION DE NOM INTELLIGENT
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
      if (cols === 16) type = 'flaparound-full';
      else if (cols === 18) type = 'flaparound-9dir';
      else if (cols === 19) type = 'flaparound-19f';
      else if (cols === 8) type = 'flaparound-simple';
      else type = 'flaparound';
    } else if (rows === 8) {
      type = 'walk-variant';
    }
    
    return `${cols}x${rows} (${type}) [${frameWidth}x${frameHeight}px]`;
  }

  // ✅ FALLBACK STRUCTURE
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

  // === 🔧 INTÉGRATION DANS OVERWORLDPOKEMONMANAGER ===

  /**
   * ✅ REMPLACER detectSpriteStructure() dans OverworldPokemonManager.js par :
   */
  static async detectSpriteStructureForOverworld(pokemonId, animationFile, width, height) {
    return await this.getSpriteStructure(pokemonId, animationFile, width, height);
  }

  /**
   * ✅ MÉTHODE POUR OVERWORLDPOKEMONMANAGER: Chargement sprite avec structure
   */
  static async loadPokemonSpriteStructure(pokemonId, animationFile, scene) {
    try {
      // Charger l'image temporairement pour obtenir les dimensions
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

  // === 📋 MÉTHODES DE TEST ET DEBUG ===

  /**
   * 🧪 Test spécifique pour un Pokémon
   */
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

  /**
   * 🧪 Test batch de plusieurs Pokémon avec FlapAround
   */
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
    
    // Résumé
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 === RÉSUMÉ BATCH ===`);
    console.log(`✅ Succès: ${successCount}/${testCases.length}`);
    console.log(`❌ Échecs: ${testCases.length - successCount}/${testCases.length}`);
    
    return results;
  }

}
