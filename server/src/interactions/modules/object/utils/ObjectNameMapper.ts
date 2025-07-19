// src/interactions/modules/object/utils/ObjectNameMapper.ts
// Library pour l'auto-détection d'objets par nom depuis Tiled - INTÉGRÉE AVEC ItemDB
// Utilisable par tous les sous-modules pour mapper nom → itemId + validation

import { isValidItemId, getItemData, getItemPocket, ItemData } from "../../../../utils/ItemDB";

export interface ObjectMapping {
  itemId: string;
  type: string;  // 'ground_item', 'hidden_item', etc.
  defaultQuantity?: number;
  // Plus de métadonnées hardcodées - on utilise ItemDB
}

export interface MappingResult {
  found: boolean;
  mapping?: ObjectMapping;
  itemData?: ItemData;  // Données réelles depuis ItemDB
  originalName: string;
  suggestions?: string[];
  validationError?: string;
}

/**
 * Mappings nom Tiled → ItemDB (BASÉS SUR VOTRE items.json RÉEL)
 * Organisé par catégories existantes dans votre DB
 */
const OBJECT_NAME_MAPPINGS: Record<string, ObjectMapping> = {
  
  // === POKÉ BALLS (basé sur items.json) ===
  'pokeball': {
    itemId: 'poke_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'poke_ball': {
    itemId: 'poke_ball', 
    type: 'ground_item',
    defaultQuantity: 1
  },
  'superball': {
    itemId: 'great_ball',
    type: 'ground_item', 
    defaultQuantity: 1
  },
  'great_ball': {
    itemId: 'great_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'greatball': {
    itemId: 'great_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'ultraball': {
    itemId: 'ultra_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'ultra_ball': {
    itemId: 'ultra_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'masterball': {
    itemId: 'master_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'master_ball': {
    itemId: 'master_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'safari_ball': {
    itemId: 'safari_ball',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === POTIONS ET SOINS (basé sur items.json) ===
  'potion': {
    itemId: 'potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'super_potion': {
    itemId: 'super_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'superpotion': {
    itemId: 'super_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'hyper_potion': {
    itemId: 'hyper_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'hyperpotion': {
    itemId: 'hyper_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'max_potion': {
    itemId: 'max_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'maxpotion': {
    itemId: 'max_potion',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'full_restore': {
    itemId: 'full_restore',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'fullrestore': {
    itemId: 'full_restore',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === REVIVES ===
  'revive': {
    itemId: 'revive',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'max_revive': {
    itemId: 'max_revive',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'maxrevive': {
    itemId: 'max_revive',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === SOINS DE STATUT (basé sur items.json) ===
  'antidote': {
    itemId: 'antidote',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'parlyz_heal': {
    itemId: 'parlyz_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'paralyz_heal': {
    itemId: 'parlyz_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'awakening': {
    itemId: 'awakening',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'burn_heal': {
    itemId: 'burn_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'ice_heal': {
    itemId: 'ice_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'full_heal': {
    itemId: 'full_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'fullheal': {
    itemId: 'full_heal',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === OBJETS UTILITAIRES (basé sur items.json) ===
  'escape_rope': {
    itemId: 'escape_rope',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'escaperope': {
    itemId: 'escape_rope',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'repel': {
    itemId: 'repel',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'super_repel': {
    itemId: 'super_repel',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'superrepel': {
    itemId: 'super_repel',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'max_repel': {
    itemId: 'max_repel',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'maxrepel': {
    itemId: 'max_repel',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === OBJETS CLÉS (généralement pour quêtes spéciales) ===
  'bike_voucher': {
    itemId: 'bike_voucher',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'bicycle': {
    itemId: 'bicycle',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'town_map': {
    itemId: 'town_map',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'itemfinder': {
    itemId: 'itemfinder',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'old_rod': {
    itemId: 'old_rod',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'good_rod': {
    itemId: 'good_rod',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'super_rod': {
    itemId: 'super_rod',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'card_key': {
    itemId: 'card_key',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'lift_key': {
    itemId: 'lift_key',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'ss_ticket': {
    itemId: 'ss_ticket',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'secret_key': {
    itemId: 'secret_key',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'poke_flute': {
    itemId: 'poke_flute',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'silph_scope': {
    itemId: 'silph_scope',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'exp_share': {
    itemId: 'exp_share',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'coin_case': {
    itemId: 'coin_case',
    type: 'ground_item',
    defaultQuantity: 1
  },

  // === FOSSILES ===
  'dome_fossil': {
    itemId: 'dome_fossil',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'helix_fossil': {
    itemId: 'helix_fossil',
    type: 'ground_item',
    defaultQuantity: 1
  },
  'old_amber': {
    itemId: 'old_amber',
    type: 'ground_item',
    defaultQuantity: 1
  }
};

/**
 * Alias communs pour une reconnaissance plus flexible
 */
const NAME_ALIASES: Record<string, string> = {
  // Poké Balls
  'pb': 'pokeball',
  'sb': 'superball', 
  'ub': 'ultraball',
  'mb': 'masterball',
  'gb': 'great_ball',
  
  // Potions
  'pot': 'potion',
  'sp': 'super_potion',
  'hp': 'hyper_potion',
  'mp': 'max_potion',
  'fr': 'full_restore',
  
  // Soins
  'anti': 'antidote',
  'para': 'parlyz_heal',
  'awake': 'awakening',
  'burn': 'burn_heal',
  'ice': 'ice_heal',
  'heal': 'full_heal',
  
  // Objets utilitaires
  'rope': 'escape_rope',
  'rep': 'repel',
  'sr': 'super_repel',
  'mr': 'max_repel',
  
  // Variantes orthographiques
  'pokéball': 'pokeball',
  'poké_ball': 'pokeball',
  'greatball': 'superball'
};

/**
 * Mapper principal pour l'auto-détection d'objets - INTÉGRÉ AVEC ItemDB
 */
export class ObjectNameMapper {
  
  /**
   * Mapper un nom d'objet Tiled vers un ItemDB ID avec validation
   * @param objectName - Nom depuis Tiled (ex: "pokeball", "antidote")
   * @returns Résultat du mapping avec itemId et vraies données ItemDB
   */
  static mapObjectName(objectName: string): MappingResult {
    if (!objectName) {
      return {
        found: false,
        originalName: objectName,
        suggestions: [],
        validationError: "Nom d'objet vide"
      };
    }
    
    // Normaliser le nom (lowercase, trim)
    const normalizedName = objectName.toLowerCase().trim();
    
    // 1. Recherche directe
    const directMapping = OBJECT_NAME_MAPPINGS[normalizedName];
    if (directMapping) {
      return this.validateAndEnrichMapping(directMapping, objectName);
    }
    
    // 2. Recherche via alias
    const aliasKey = NAME_ALIASES[normalizedName];
    if (aliasKey) {
      const aliasMapping = OBJECT_NAME_MAPPINGS[aliasKey];
      if (aliasMapping) {
        return this.validateAndEnrichMapping(aliasMapping, objectName);
      }
    }
    
    // 3. Recherche fuzzy (noms similaires)
    const suggestions = this.findSimilarNames(normalizedName);
    
    return {
      found: false,
      originalName: objectName,
      suggestions,
      validationError: `Nom "${objectName}" non reconnu`
    };
  }
  
  /**
   * Valider le mapping avec ItemDB et enrichir avec vraies données
   */
  private static validateAndEnrichMapping(mapping: ObjectMapping, originalName: string): MappingResult {
    try {
      // 1. Vérifier que l'item existe dans ItemDB
      if (!isValidItemId(mapping.itemId)) {
        return {
          found: false,
          originalName,
          validationError: `Item "${mapping.itemId}" n'existe pas dans ItemDB`
        };
      }
      
      // 2. Récupérer les vraies données depuis ItemDB
      const itemData = getItemData(mapping.itemId);
      
      // 3. Retourner le mapping validé avec vraies données
      return {
        found: true,
        mapping,
        itemData,
        originalName
      };
      
    } catch (error) {
      return {
        found: false,
        originalName,
        validationError: `Erreur validation ItemDB: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }
  
  /**
   * Trouver des noms similaires pour suggérer des corrections
   */
  private static findSimilarNames(name: string): string[] {
    const allNames = [
      ...Object.keys(OBJECT_NAME_MAPPINGS),
      ...Object.keys(NAME_ALIASES)
    ];
    
    const suggestions: string[] = [];
    
    for (const knownName of allNames) {
      // Recherche par inclusion
      if (knownName.includes(name) || name.includes(knownName)) {
        suggestions.push(knownName);
      }
      // Recherche par distance de Levenshtein simplifiée
      else if (this.getSimpleDistance(name, knownName) <= 2) {
        suggestions.push(knownName);
      }
    }
    
    // Limiter à 5 suggestions max
    return suggestions.slice(0, 5);
  }
  
  /**
   * Distance de Levenshtein simplifiée
   */
  private static getSimpleDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Calculer automatiquement la rareté basée sur le prix ItemDB
   */
  static calculateRarityFromPrice(itemData: ItemData): 'common' | 'rare' | 'epic' | 'legendary' {
    if (!itemData.price || itemData.price === null) {
      return 'epic'; // Objets sans prix = souvent key items
    }
    
    if (itemData.price <= 300) return 'common';
    if (itemData.price <= 1000) return 'rare';
    if (itemData.price <= 3000) return 'epic';
    return 'legendary';
  }
  
  /**
   * Obtenir tous les mappings disponibles avec validation
   */
  static getAllValidMappings(): Record<string, { mapping: ObjectMapping; itemData: ItemData }> {
    const validMappings: Record<string, { mapping: ObjectMapping; itemData: ItemData }> = {};
    
    for (const [name, mapping] of Object.entries(OBJECT_NAME_MAPPINGS)) {
      try {
        if (isValidItemId(mapping.itemId)) {
          const itemData = getItemData(mapping.itemId);
          validMappings[name] = { mapping, itemData };
        }
      } catch (error) {
        console.warn(`⚠️ [ObjectNameMapper] Mapping "${name}" invalide:`, error);
      }
    }
    
    return validMappings;
  }
  
  /**
   * Ajouter un mapping dynamiquement avec validation
   */
  static addMapping(name: string, mapping: ObjectMapping): boolean {
    try {
      if (!isValidItemId(mapping.itemId)) {
        console.error(`❌ [ObjectNameMapper] Item "${mapping.itemId}" n'existe pas dans ItemDB`);
        return false;
      }
      
      OBJECT_NAME_MAPPINGS[name.toLowerCase().trim()] = mapping;
      console.log(`✅ [ObjectNameMapper] Mapping ajouté: "${name}" → "${mapping.itemId}"`);
      return true;
      
    } catch (error) {
      console.error(`❌ [ObjectNameMapper] Erreur ajout mapping "${name}":`, error);
      return false;
    }
  }
  
  /**
   * Ajouter un alias dynamiquement
   */
  static addAlias(alias: string, targetName: string): boolean {
    const normalizedAlias = alias.toLowerCase().trim();
    const normalizedTarget = targetName.toLowerCase().trim();
    
    if (normalizedTarget in OBJECT_NAME_MAPPINGS) {
      NAME_ALIASES[normalizedAlias] = normalizedTarget;
      console.log(`✅ [ObjectNameMapper] Alias ajouté: "${alias}" → "${targetName}"`);
      return true;
    } else {
      console.error(`❌ [ObjectNameMapper] Target "${targetName}" n'existe pas dans les mappings`);
      return false;
    }
  }
  
  /**
   * Vérifier si un nom est reconnu
   */
  static isKnownName(name: string): boolean {
    const normalizedName = name.toLowerCase().trim();
    return normalizedName in OBJECT_NAME_MAPPINGS || normalizedName in NAME_ALIASES;
  }
  
  /**
   * Test d'intégrité avec ItemDB
   */
  static validateAllMappings(): {
    valid: number;
    invalid: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let valid = 0;
    let invalid = 0;
    
    for (const [name, mapping] of Object.entries(OBJECT_NAME_MAPPINGS)) {
      try {
        if (isValidItemId(mapping.itemId)) {
          getItemData(mapping.itemId); // Test récupération
          valid++;
        } else {
          invalid++;
          errors.push(`"${name}" → "${mapping.itemId}" (item inexistant)`);
        }
      } catch (error) {
        invalid++;
        errors.push(`"${name}" → erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    return { valid, invalid, errors };
  }
  
  /**
   * Obtenir les statistiques avec validation ItemDB
   */
  static getStats(): {
    totalMappings: number;
    validMappings: number;
    invalidMappings: number;
    totalAliases: number;
    supportedPockets: string[];
    integrationStatus: 'healthy' | 'warning' | 'error';
  } {
    const validation = this.validateAllMappings();
    const validMappings = this.getAllValidMappings();
    
    const pockets = new Set<string>();
    Object.values(validMappings).forEach(({ itemData }) => {
      pockets.add(itemData.pocket);
    });
    
    let integrationStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (validation.invalid > 0) {
      integrationStatus = validation.invalid > validation.valid ? 'error' : 'warning';
    }
    
    return {
      totalMappings: Object.keys(OBJECT_NAME_MAPPINGS).length,
      validMappings: validation.valid,
      invalidMappings: validation.invalid,
      totalAliases: Object.keys(NAME_ALIASES).length,
      supportedPockets: Array.from(pockets),
      integrationStatus
    };
  }
  
  /**
   * Debug avec validation ItemDB
   */
  static debug(): void {
    console.log(`🔍 [ObjectNameMapper] === DEBUG AVEC VALIDATION ItemDB ===`);
    
    const stats = this.getStats();
    console.log(`📊 Stats:`, stats);
    
    if (stats.invalidMappings > 0) {
      console.log(`❌ Mappings invalides:`);
      const validation = this.validateAllMappings();
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log(`✅ Exemples de mappings valides:`);
    const validMappings = this.getAllValidMappings();
    Object.entries(validMappings).slice(0, 5).forEach(([name, { mapping, itemData }]) => {
      console.log(`  "${name}" → "${mapping.itemId}" (${itemData.pocket}, ${itemData.price}₽)`);
    });
  }
}
