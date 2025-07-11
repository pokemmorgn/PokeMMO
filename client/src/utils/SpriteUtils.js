// client/src/utils/SpriteUtils.js - Module utilitaire pour gestion des spritesheets
// 🎯 Module réutilisable pour tous les types de sprites du jeu

/**
 * Utilitaire pour la gestion et l'affichage des spritesheets
 * Utilisable partout : TeamUI, OverworldPokemon, BattleUI, etc.
 */
export class SpriteUtils {
  
  // === 🔍 DÉTECTION AUTOMATIQUE DE STRUCTURE ===
  
  /**
   * Détecte automatiquement la structure d'un spritesheet
   * @param {number} width - Largeur totale de l'image
   * @param {number} height - Hauteur totale de l'image
   * @param {string} type - Type de sprite ('portrait', 'overworld', 'battle', 'auto')
   * @returns {Object} Structure détectée
   */
  static detectSpriteStructure(width, height, type = 'auto') {
    console.log(`🔍 [SpriteUtils] Détection structure ${width}x${height} (type: ${type})`);
    
    const possibilities = this.getSpriteTypePossibilities(type);
    const validOptions = [];

    possibilities.forEach(p => {
      const frameW = width / p.cols;
      const frameH = height / p.rows;
      
      if (frameW % 1 === 0 && frameH % 1 === 0) {
        const aspectRatio = frameW / frameH;
        const isSquareish = Math.abs(aspectRatio - 1) < 0.5;
        const isReasonableSize = frameW >= 16 && frameW <= 256 && frameH >= 16 && frameH <= 256;
        
        let qualityScore = 0;
        
        if (isSquareish) qualityScore += 20;
        if (isReasonableSize) qualityScore += 15;
        if (p.commonForType) qualityScore += 30;
        if (p.cols * p.rows <= 100) qualityScore += 10; // Préférer moins de frames
        
        validOptions.push({
          cols: p.cols,
          rows: p.rows,
          frameWidth: frameW,
          frameHeight: frameH,
          totalFrames: p.cols * p.rows,
          priority: p.priority,
          qualityScore: qualityScore,
          name: p.name,
          aspectRatio: aspectRatio,
          type: type
        });
      }
    });

    if (validOptions.length === 0) {
      console.warn(`⚠️ [SpriteUtils] Aucune structure valide pour ${width}×${height}`);
      return this.getFallbackStructure(width, height);
    }

    // Trier par qualité puis par priorité
    validOptions.sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      return a.priority - b.priority;
    });

    const best = validOptions[0];
    console.log(`✅ [SpriteUtils] Structure détectée: ${best.name} (${best.cols}x${best.rows})`);
    
    return best;
  }

  /**
   * Retourne les possibilités selon le type de sprite
   */
  static getSpriteTypePossibilities(type) {
    const commonStructures = [
      // Structures communes
      { cols: 1, rows: 1, priority: 1, name: "1x1 (static)", commonForType: type === 'portrait' },
      { cols: 2, rows: 1, priority: 2, name: "2x1 (simple anim)" },
      { cols: 3, rows: 1, priority: 3, name: "3x1 (short anim)" },
      { cols: 4, rows: 1, priority: 4, name: "4x1 (standard anim)", commonForType: type === 'portrait' },
      
      // Grilles carrées
      { cols: 2, rows: 2, priority: 5, name: "2x2 (quad)" },
      { cols: 3, rows: 3, priority: 6, name: "3x3 (nine)" },
      { cols: 4, rows: 4, priority: 7, name: "4x4 (sixteen)" },
      
      // Structures overworld communes
      { cols: 6, rows: 8, priority: 8, name: "6x8 (overworld standard)", commonForType: type === 'overworld' },
      { cols: 4, rows: 8, priority: 9, name: "4x8 (overworld compact)", commonForType: type === 'overworld' },
      { cols: 8, rows: 8, priority: 10, name: "8x8 (overworld large)", commonForType: type === 'overworld' },
      { cols: 9, rows: 8, priority: 11, name: "9x8 (overworld extended)" },
      { cols: 9, rows: 9, priority: 12, name: "9x9 (large grid)" },
      
      // Structures battle
      { cols: 5, rows: 1, priority: 13, name: "5x1 (battle sequence)", commonForType: type === 'battle' },
      { cols: 6, rows: 1, priority: 14, name: "6x1 (battle extended)" },
      { cols: 8, rows: 1, priority: 15, name: "8x1 (battle full)" },
      
      // Structures grandes
      { cols: 10, rows: 8, priority: 16, name: "10x8 (extended)" },
      { cols: 12, rows: 8, priority: 17, name: "12x8 (full)" },
      { cols: 16, rows: 8, priority: 18, name: "16x8 (mega)" },
    ];

    return commonStructures;
  }

  /**
   * Structure de fallback en cas d'échec de détection
   */
  static getFallbackStructure(width, height) {
    const estimatedFrameSize = Math.min(width, height, 64);
    const cols = Math.max(1, Math.round(width / estimatedFrameSize));
    const rows = Math.max(1, Math.round(height / estimatedFrameSize));
    
    return {
      cols: cols,
      rows: rows,
      frameWidth: Math.round(width / cols),
      frameHeight: Math.round(height / rows),
      totalFrames: cols * rows,
      name: "fallback",
      type: "auto"
    };
  }

  // === 🎨 GÉNÉRATION DE STYLES CSS ===

  /**
   * Génère le style CSS pour afficher une frame spécifique d'un spritesheet
   * @param {string} imageUrl - URL de l'image spritesheet
   * @param {Object} structure - Structure du spritesheet (de detectSpriteStructure)
   * @param {number} frameIndex - Index de la frame à afficher (défaut: 0)
   * @param {Object} options - Options d'affichage
   * @returns {string} Style CSS
   */
  static generateSpriteCSS(imageUrl, structure, frameIndex = 0, options = {}) {
    const {
      width = 'auto',
      height = 'auto',
      preservePixelArt = true,
      fitMode = 'contain' // 'contain', 'cover', 'exact'
    } = options;

    // Calculer la position de la frame
    const frameCol = frameIndex % structure.cols;
    const frameRow = Math.floor(frameIndex / structure.cols);
    
    // Calculer background-size (agrandir le spritesheet)
    const backgroundSizeX = structure.cols * 100;
    const backgroundSizeY = structure.rows * 100;
    
    // Calculer background-position (positionner sur la bonne frame)
    const positionX = frameCol * (100 / (structure.cols - 1 || 1));
    const positionY = frameRow * (100 / (structure.rows - 1 || 1));

    const styles = [
      `background-image: url('${imageUrl}')`,
      `background-size: ${backgroundSizeX}% ${backgroundSizeY}%`,
      `background-position: ${positionX}% ${positionY}%`,
      `background-repeat: no-repeat`
    ];

    if (width !== 'auto') styles.push(`width: ${width}`);
    if (height !== 'auto') styles.push(`height: ${height}`);
    
    if (preservePixelArt) {
      styles.push(`image-rendering: pixelated`);
      styles.push(`image-rendering: -moz-crisp-edges`);
      styles.push(`image-rendering: crisp-edges`);
    }

    return styles.join('; ') + ';';
  }

  /**
   * Version simplifiée pour afficher la première frame
   */
  static generateFirstFrameCSS(imageUrl, structure, options = {}) {
    return this.generateSpriteCSS(imageUrl, structure, 0, options);
  }

  // === 📱 MÉTHODES POUR DIFFÉRENTS USAGES ===

  /**
   * Spécialisé pour les portraits Pokémon dans l'interface Team
   */
  static generatePokemonPortraitStyle(pokemonId, options = {}) {
    if (!pokemonId) {
      return `
        background: linear-gradient(45deg, #ccc, #999);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
      `;
    }

    const imageUrl = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    
    // Structure typique pour les portraits (à ajuster selon tes sprites)
    const structure = {
      cols: 9,  // Ajuste selon tes tests
      rows: 9,  // Ajuste selon tes tests
      frameWidth: 64,
      frameHeight: 64
    };

    return this.generateFirstFrameCSS(imageUrl, structure, {
      width: '64px',
      height: '64px',
      preservePixelArt: true,
      ...options
    });
  }

  /**
   * Pour les sprites overworld animés
   */
  static generateOverworldSpriteStyle(pokemonId, frameIndex = 0, options = {}) {
    const imageUrl = `/assets/pokemon/${pokemonId.toString().padStart(3, '0')}/Walk-Anim.png`;
    
    // Structure typique overworld (utilise ta logique existante)
    const structure = {
      cols: 6,
      rows: 8,
      frameWidth: 32,
      frameHeight: 32
    };

    return this.generateSpriteCSS(imageUrl, structure, frameIndex, options);
  }

  /**
   * Pour les sprites de battle
   */
  static generateBattleSpriteStyle(pokemonId, frameIndex = 0, options = {}) {
    const imageUrl = `/assets/pokemon/battle/${pokemonId}.png`;
    
    const structure = {
      cols: 5,
      rows: 1,
      frameWidth: 96,
      frameHeight: 96
    };

    return this.generateSpriteCSS(imageUrl, structure, frameIndex, options);
  }

  // === 🔧 MÉTHODES UTILITAIRES ===

  /**
   * Détecte automatiquement la structure d'une image chargée
   */
  static async detectImageStructure(imageUrl, type = 'auto') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const structure = this.detectSpriteStructure(img.width, img.height, type);
        resolve(structure);
      };
      
      img.onerror = () => {
        reject(new Error(`Impossible de charger l'image: ${imageUrl}`));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Applique un style sprite à un élément DOM
   */
  static applySpriteToElement(element, imageUrl, structure, frameIndex = 0, options = {}) {
    const cssStyle = this.generateSpriteCSS(imageUrl, structure, frameIndex, options);
    
    // Appliquer chaque propriété CSS
    cssStyle.split(';').forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        element.style.setProperty(property, value);
      }
    });
  }

  /**
   * Crée un élément HTML avec un sprite
   */
  static createSpriteElement(imageUrl, structure, frameIndex = 0, options = {}) {
    const element = document.createElement('div');
    element.className = 'sprite-element';
    
    const cssStyle = this.generateSpriteCSS(imageUrl, structure, frameIndex, options);
    element.style.cssText = cssStyle;
    
    return element;
  }

  // === 📊 MÉTHODES D'INFORMATION ===

  /**
   * Retourne des infos sur un spritesheet
   */
  static getSpriteInfo(structure) {
    return {
      totalFrames: structure.totalFrames,
      frameSize: `${structure.frameWidth}x${structure.frameHeight}`,
      gridSize: `${structure.cols}x${structure.rows}`,
      type: structure.type || 'unknown',
      name: structure.name || 'unnamed'
    };
  }

  /**
   * Debug d'un spritesheet
   */
  static debugSprite(imageUrl, structure) {
    console.group(`🔍 [SpriteUtils] Debug: ${imageUrl}`);
    console.log('📊 Structure:', structure);
    console.log('🎯 Info:', this.getSpriteInfo(structure));
    console.log('🎨 CSS premier frame:', this.generateFirstFrameCSS(imageUrl, structure));
    console.groupEnd();
  }
}

// === 🎯 FONCTIONS DE COMMODITÉ ===

/**
 * Raccourci pour les portraits Pokémon
 */
export function getPokemonPortraitStyle(pokemonId, options = {}) {
  return SpriteUtils.generatePokemonPortraitStyle(pokemonId, options);
}

/**
 * Raccourci pour détecter une structure
 */
export function detectSprite(width, height, type = 'auto') {
  return SpriteUtils.detectSpriteStructure(width, height, type);
}

/**
 * Raccourci pour appliquer un sprite
 */
export function applySprite(element, imageUrl, structure, frameIndex = 0, options = {}) {
  return SpriteUtils.applySpriteToElement(element, imageUrl, structure, frameIndex, options);
}

// === 📋 EXPORT PAR DÉFAUT ===

export default SpriteUtils;

console.log(`
🎯 === SPRITE UTILS MODULE ===

✨ FONCTIONNALITÉS:
• Détection automatique de structure spritesheet
• Génération CSS optimisée pour toute frame
• Support multi-types (portrait, overworld, battle)
• Méthodes spécialisées par usage
• Utilitaires DOM intégrés

🎮 UTILISATION PARTOUT:
import { SpriteUtils, getPokemonPortraitStyle } from './utils/SpriteUtils.js';

// TeamUI
const style = getPokemonPortraitStyle(pokemonId);

// OverworldPokemon  
const structure = SpriteUtils.detectSpriteStructure(width, height, 'overworld');
const css = SpriteUtils.generateSpriteCSS(url, structure, frameIndex);

// BattleUI
const battleStyle = SpriteUtils.generateBattleSpriteStyle(pokemonId, 0);

🔧 RÉUTILISABLE ET MAINTENABLE !
`);
