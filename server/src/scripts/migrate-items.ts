// server/src/scripts/migrate-items.ts - SCRIPT DE MIGRATION COMPLET DES ITEMS
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { ItemService } from '../services/ItemService';
import { ItemData } from '../models/ItemData';
import { ItemEffect, ItemAction, ActionType, EffectTrigger } from '../items/ItemEffectTypes';

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';
const ITEMS_JSON_PATH = process.env.ITEMS_JSON_PATH || './server/src/data/items.json';

// ===== FONCTIONS UTILITAIRES =====

/**
 * Connecte à MongoDB
 */
async function connectToDatabase(): Promise<void> {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Ferme la connexion MongoDB
 */
async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('⚠️ Error disconnecting from MongoDB:', error);
  }
}

/**
 * Lit le fichier JSON des items
 */
function readItemsJson(): any {
  try {
    console.log('📖 Reading items JSON file...');
    console.log(`📍 Path: ${ITEMS_JSON_PATH}`);
    
    if (!fs.existsSync(ITEMS_JSON_PATH)) {
      throw new Error(`Items JSON file not found at: ${ITEMS_JSON_PATH}`);
    }
    
    const jsonContent = fs.readFileSync(ITEMS_JSON_PATH, 'utf8');
    const itemsData = JSON.parse(jsonContent);
    
    console.log(`✅ Items JSON loaded successfully`);
    
    // Afficher un aperçu des données
    const itemIds = Object.keys(itemsData);
    console.log(`📊 Found ${itemIds.length} items in JSON`);
    console.log(`📋 Sample items: ${itemIds.slice(0, 5).join(', ')}${itemIds.length > 5 ? '...' : ''}`);
    
    return itemsData;
  } catch (error) {
    console.error('❌ Failed to read items JSON:', error);
    throw error;
  }
}

/**
 * Ajoute les items personnalisés hardcodés
 */
function addCustomItems(): any {
  const customItems = {
    'dreamroot_pendant': {
      name: 'Dreamroot Pendant',
      description: 'A pendant shaped like a leaf touched by moonlight. Said to protect from nightmares.',
      type: 'key_item',
      price: null as null,
      sell_price: null as null,
      stackable: false,
      consumable: false,
      usable_in_battle: false,
      usable_in_field: true,
      custom_effects: {
        ghost_resistance: 0.15,  // 15% de résistance aux attaques Ghost
        forest_bonus: 0.10,      // 10% de bonus dans les zones forestières
        nightmare_protection: true
      }
    }
  };
  
  console.log(`➕ Added ${Object.keys(customItems).length} custom items`);
  return customItems;
}

/**
 * Vide complètement la collection items
 */
async function clearItemsCollection(): Promise<void> {
  try {
    console.log('🧹 Clearing existing items collection...');
    
    const deleteResult = await ItemData.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing items`);
    
  } catch (error) {
    console.error('❌ Error clearing items collection:', error);
    throw error;
  }
}

/**
 * Convertit un item JSON legacy vers le nouveau format avec effets
 */
function convertLegacyItemToNew(itemId: string, legacyItem: any): any {
  const newItem: any = {
    itemId: itemId,
    name: legacyItem.name || itemId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    description: generateItemDescription(itemId, legacyItem),
    category: inferCategory(legacyItem),
    price: legacyItem.price,
    sellPrice: legacyItem.sell_price,
    stackable: legacyItem.stackable ?? true,
    consumable: inferConsumable(legacyItem),
    effects: generateEffects(itemId, legacyItem),
    // Nouveaux champs visuels
    sprite: itemId, // Pour compatibilité
    icon: generateIconPath(itemId, legacyItem),
    overworldSprite: generateOverworldSpritePath(itemId, legacyItem),
    generation: inferGeneration(itemId, legacyItem),
    rarity: inferRarity(itemId, legacyItem),
    tags: generateTags(itemId, legacyItem),
    obtainMethods: generateObtainMethods(itemId, legacyItem),
    usageRestrictions: generateUsageRestrictions(legacyItem)
  };
  
  return newItem;
}

/**
 * Génère le chemin de l'icône inventaire
 */
function generateIconPath(itemId: string, legacyItem: any): string {
  // Convention: icons/items/[category]/[item_id].png
  const category = inferCategory(legacyItem);
  return `icons/items/${category}/${itemId}.png`;
}

/**
 * Génère le chemin du sprite overworld
 */
function generateOverworldSpritePath(itemId: string, legacyItem: any): string {
  // Convention: sprites/overworld/items/[item_id].png
  return `sprites/overworld/items/${itemId}.png`;
}

/**
 * Infère la génération d'introduction
 */
function inferGeneration(itemId: string, legacyItem: any): number {
  // Items classiques de Gen 1
  const gen1Items = [
    'poke_ball', 'great_ball', 'ultra_ball', 'master_ball', 'safari_ball',
    'potion', 'super_potion', 'hyper_potion', 'max_potion', 'full_restore',
    'antidote', 'parlyz_heal', 'awakening', 'burn_heal', 'ice_heal', 'full_heal',
    'revive', 'max_revive', 'repel', 'super_repel', 'max_repel',
    'bicycle', 'town_map', 'itemfinder', 'old_rod', 'good_rod', 'super_rod',
    'exp_share', 'escape_rope'
  ];
  
  // Items de Gen 2
  const gen2Items = ['love_ball', 'moon_ball', 'friend_ball', 'lure_ball', 'heavy_ball', 'level_ball', 'fast_ball'];
  
  // Items personnalisés = Gen 9 (dernière génération)
  if (itemId === 'dreamroot_pendant') return 9;
  
  if (gen1Items.includes(itemId)) return 1;
  if (gen2Items.includes(itemId)) return 2;
  
  // Par défaut Gen 1
  return 1;
}

/**
 * Génère une description appropriée pour l'item
 */
function generateItemDescription(itemId: string, legacyItem: any): string {
  // Si une description custom est fournie, l'utiliser
  if (legacyItem.description) {
    return legacyItem.description;
  }
  
  // Descriptions personnalisées pour les items connus
  const descriptions: { [key: string]: string } = {
    // Poké Balls
    'poke_ball': 'A standard Poké Ball used to catch wild Pokémon. It has a basic catch rate.',
    'great_ball': 'A high-performance Poké Ball with a better catch rate than a standard Poké Ball.',
    'ultra_ball': 'An ultra-high performance Poké Ball with an even higher catch rate than a Great Ball.',
    'master_ball': 'The ultimate Poké Ball that will catch any wild Pokémon without fail.',
    'safari_ball': 'A special Poké Ball used only in the Safari Zone.',
    'love_ball': 'A Poké Ball that works best on Pokémon of the opposite gender.',
    'moon_ball': 'A Poké Ball that works well on Pokémon that evolve with a Moon Stone.',
    'friend_ball': 'A Poké Ball that makes caught Pokémon more friendly.',
    'lure_ball': 'A Poké Ball that works well on Pokémon caught with a fishing rod.',
    'heavy_ball': 'A Poké Ball that works better on heavier Pokémon.',
    'level_ball': 'A Poké Ball that works better on lower-level Pokémon.',
    'fast_ball': 'A Poké Ball that works well on fast Pokémon.',
    
    // Potions
    'potion': 'A healing item that restores 20 HP to a Pokémon.',
    'super_potion': 'A healing item that restores 50 HP to a Pokémon.',
    'hyper_potion': 'A healing item that restores 200 HP to a Pokémon.',
    'max_potion': 'A healing item that fully restores a Pokémon\'s HP.',
    'full_restore': 'A medicine that fully restores HP and cures all status conditions.',
    
    // Status healers
    'antidote': 'A medicine that cures a poisoned Pokémon.',
    'parlyz_heal': 'A medicine that cures a paralyzed Pokémon.',
    'awakening': 'A medicine that awakens a sleeping Pokémon.',
    'burn_heal': 'A medicine that cures a burned Pokémon.',
    'ice_heal': 'A medicine that thaws out a frozen Pokémon.',
    'full_heal': 'A medicine that cures all status conditions.',
    
    // Revival items
    'revive': 'A medicine that revives a fainted Pokémon with half HP.',
    'max_revive': 'A medicine that revives a fainted Pokémon with full HP.',
    
    // Repels
    'repel': 'Prevents weak wild Pokémon from appearing for 100 steps.',
    'super_repel': 'Prevents weak wild Pokémon from appearing for 200 steps.',
    'max_repel': 'Prevents weak wild Pokémon from appearing for 250 steps.',
    
    // Key items
    'bicycle': 'A folding bicycle that allows much faster movement.',
    'town_map': 'A detailed map of the region showing your current location.',
    'itemfinder': 'A device that signals when hidden items are nearby.',
    'old_rod': 'An old fishing rod for catching Pokémon in water.',
    'good_rod': 'A decent fishing rod for catching better water Pokémon.',
    'super_rod': 'An awesome fishing rod for catching the best water Pokémon.',
    'exp_share': 'A device that shares experience points with all party Pokémon.',
    'escape_rope': 'A rope that allows instant escape from caves and dungeons.',
    
    // Custom items
    'dreamroot_pendant': 'A pendant shaped like a leaf touched by moonlight. Said to protect from nightmares.'
  };
  
  if (descriptions[itemId]) {
    return descriptions[itemId];
  }
  
  // Description générée automatiquement
  const name = legacyItem.name || itemId.replace(/_/g, ' ');
  return `A ${name.toLowerCase()} used in Pokémon adventures.`;
}

/**
 * Infère la catégorie depuis les données legacy
 */
function inferCategory(legacyItem: any): string {
  const typeMap: { [key: string]: string } = {
    'ball': 'pokeballs',
    'medicine': 'medicine',
    'item': 'battle_items',
    'key_item': 'key_items'
  };
  
  return typeMap[legacyItem.type] || 'battle_items';
}

/**
 * Infère si l'item est consommable
 */
function inferConsumable(legacyItem: any): boolean {
  return legacyItem.type !== 'key_item';
}

/**
 * Infère la rareté de l'item
 */
function inferRarity(itemId: string, legacyItem: any): string {
  // Raretés spéciales
  if (itemId === 'master_ball') return 'legendary';
  if (itemId === 'dreamroot_pendant') return 'mythic'; // Item personnalisé rare
  if (itemId.includes('max_')) return 'rare';
  if (itemId.includes('super_') || itemId.includes('hyper_')) return 'uncommon';
  if (legacyItem.type === 'key_item') return 'epic';
  if (!legacyItem.price || legacyItem.price === null) return 'rare';
  
  return 'common';
}

/**
 * Génère les tags pour l'item
 */
function generateTags(itemId: string, legacyItem: any): string[] {
  const tags: string[] = [];
  
  // Tags basés sur le type
  if (legacyItem.type === 'ball') tags.push('catching', 'pokeball');
  if (legacyItem.type === 'medicine') tags.push('healing', 'medicine');
  if (legacyItem.type === 'key_item') tags.push('key', 'story', 'important');
  
  // Tags basés sur les effets
  if (legacyItem.heal_amount) tags.push('hp-restore');
  if (legacyItem.status_cure) tags.push('status-cure');
  if (legacyItem.revive_amount) tags.push('revival');
  if (legacyItem.effect_steps) tags.push('repel', 'field-effect');
  
  // Tags basés sur l'utilisation
  if (legacyItem.usable_in_battle) tags.push('battle');
  if (legacyItem.usable_in_field) tags.push('field');
  
  // Tags basés sur le nom
  if (itemId.includes('rod')) tags.push('fishing');
  if (itemId.includes('key')) tags.push('access');
  if (itemId.includes('fossil')) tags.push('fossil', 'pokemon-source');
  
  // Tags spéciaux pour items personnalisés
  if (itemId === 'dreamroot_pendant') {
    tags.push('mystical', 'protection', 'ghost-ward', 'forest-affinity');
  }
  
  return [...new Set(tags)]; // Supprimer les doublons
}

/**
 * Génère les méthodes d'obtention
 */
function generateObtainMethods(itemId: string, legacyItem: any): any[] {
  const methods: any[] = [];
  
  // Items achetables en boutique
  if (legacyItem.price && legacyItem.price > 0) {
    methods.push({
      method: 'shop',
      cost: legacyItem.price,
      currency: 'money',
      location: 'Poké Mart'
    });
  }
  
  // Items spéciaux
  const specialMethods: { [key: string]: any } = {
    'master_ball': { method: 'gift', location: 'Silph Co', conditions: ['Story progression'] },
    'safari_ball': { method: 'event', location: 'Safari Zone', conditions: ['Safari Zone access'] },
    'bicycle': { method: 'gift', location: 'Cerulean City', conditions: ['Bike Voucher'] },
    'exp_share': { method: 'gift', location: 'Fuchsia City', conditions: ['Deliver item to aide'] },
    'old_rod': { method: 'gift', location: 'Vermilion City', npc: 'Fishing Guru' },
    'good_rod': { method: 'gift', location: 'Fuchsia City', npc: 'Fishing Guru' },
    'super_rod': { method: 'gift', location: 'Route 12', npc: 'Fishing Guru' },
    'dreamroot_pendant': { 
      method: 'event', 
      location: 'Moonlit Grove', 
      conditions: ['Complete Dream Guardian quest', 'Full moon night'],
      npc: 'Dream Sage',
      event: 'Nightmare Cleansing Ritual'
    }
  };
  
  if (specialMethods[itemId]) {
    methods.push(specialMethods[itemId]);
  }
  
  // Si aucune méthode spécifique, ajouter une méthode par défaut
  if (methods.length === 0) {
    if (legacyItem.type === 'key_item') {
      methods.push({ method: 'event', conditions: ['Story progression'] });
    } else {
      methods.push({ method: 'find' });
    }
  }
  
  return methods;
}

/**
 * Génère les restrictions d'usage
 */
function generateUsageRestrictions(legacyItem: any): any {
  const restrictions: any = {};
  
  if (legacyItem.usable_in_battle && !legacyItem.usable_in_field) {
    restrictions.battleOnly = true;
  }
  
  if (legacyItem.usable_in_field && !legacyItem.usable_in_battle) {
    restrictions.fieldOnly = true;
  }
  
  return restrictions;
}

/**
 * Génère les effets pour l'item
 */
function generateEffects(itemId: string, legacyItem: any): ItemEffect[] {
  const effects: ItemEffect[] = [];
  
  // Effets de soin
  if (legacyItem.heal_amount) {
    const healEffect: ItemEffect = {
      id: `heal_${itemId}`,
      name: 'Healing Effect',
      description: `Restores ${legacyItem.heal_amount === 'full' ? 'all' : legacyItem.heal_amount} HP`,
      trigger: 'on_use' as EffectTrigger,
      actions: []
    };
    
    if (legacyItem.heal_amount === 'full') {
      healEffect.actions.push({
        type: 'heal_hp_max' as ActionType,
        target: 'self',
        value: true,
        success_message: 'HP fully restored!'
      });
    } else {
      healEffect.actions.push({
        type: 'heal_hp_fixed' as ActionType,
        target: 'self',
        value: legacyItem.heal_amount,
        success_message: `Restored ${legacyItem.heal_amount} HP!`
      });
    }
    
    effects.push(healEffect);
  }
  
  // Effets de soins de statut
  if (legacyItem.status_cure && legacyItem.status_cure.length > 0) {
    const cureEffect: ItemEffect = {
      id: `cure_${itemId}`,
      name: 'Status Cure Effect',
      description: `Cures ${legacyItem.status_cure.includes('all') ? 'all status conditions' : legacyItem.status_cure.join(', ')}`,
      trigger: 'on_use' as EffectTrigger,
      actions: []
    };
    
    if (legacyItem.status_cure.includes('all')) {
      cureEffect.actions.push({
        type: 'cure_all_status' as ActionType,
        target: 'self',
        value: true,
        success_message: 'All status conditions cured!'
      });
    } else {
      for (const status of legacyItem.status_cure) {
        cureEffect.actions.push({
          type: 'cure_status' as ActionType,
          target: 'self',
          value: status,
          success_message: `${status.charAt(0).toUpperCase() + status.slice(1)} cured!`
        });
      }
    }
    
    effects.push(cureEffect);
  }
  
  // Effets de revive
  if (legacyItem.revive_amount) {
    const reviveEffect: ItemEffect = {
      id: `revive_${itemId}`,
      name: 'Revival Effect',
      description: `Revives fainted Pokémon with ${legacyItem.revive_amount * 100}% HP`,
      trigger: 'on_use' as EffectTrigger,
      conditions: [{
        type: 'pokemon_species', // Placeholder - besoin d'une condition "is fainted"
        operator: 'equals',
        value: 'fainted' // Placeholder
      }],
      actions: [{
        type: 'revive_pokemon' as ActionType,
        target: 'self',
        value: legacyItem.revive_amount,
        success_message: legacyItem.revive_amount === 1 ? 'Pokémon revived with full HP!' : 'Pokémon revived!'
      }]
    };
    
    effects.push(reviveEffect);
  }
  
  // Effets repel
  if (legacyItem.effect_steps) {
    const repelEffect: ItemEffect = {
      id: `repel_${itemId}`,
      name: 'Repel Effect',
      description: `Prevents wild Pokémon encounters for ${legacyItem.effect_steps} steps`,
      trigger: 'on_use_in_field' as EffectTrigger,
      actions: [{
        type: 'prevent_wild_encounters' as ActionType,
        target: 'field',
        value: legacyItem.effect_steps,
        duration: legacyItem.effect_steps,
        success_message: `Wild Pokémon repelled for ${legacyItem.effect_steps} steps!`
      }]
    };
    
    effects.push(repelEffect);
  }
  
  // Effets de capture (Poké Balls)
  if (legacyItem.type === 'ball') {
    const catchEffect: ItemEffect = {
      id: `catch_${itemId}`,
      name: 'Capture Effect',
      description: getCaptureDescription(itemId),
      trigger: 'on_use_in_battle' as EffectTrigger,
      actions: [{
        type: getCaptureActionType(itemId) as ActionType,
        target: 'opponent',
        value: getCaptureValue(itemId),
        success_message: 'Pokémon captured!',
        failure_message: 'The Pokémon broke free!'
      }]
    };
    
    effects.push(catchEffect);
  }
  
  // Effets personnalisés pour le Dreamroot Pendant
  if (itemId === 'dreamroot_pendant') {
    // Effet de résistance Ghost
    const ghostResistEffect: ItemEffect = {
      id: 'dreamroot_ghost_resist',
      name: 'Ghost Ward',
      description: 'Provides resistance against Ghost-type moves',
      trigger: 'when_hit' as EffectTrigger,
      conditions: [{
        type: 'move_type',
        operator: 'equals',
        value: 'ghost'
      }],
      actions: [{
        type: 'modify_damage' as ActionType,
        target: 'self',
        value: 0.85, // Réduit les dégâts de 15%
        success_message: 'The pendant glows, reducing the ghostly attack!'
      }]
    };
    
    // Effet de bonus en forêt
    const forestBonusEffect: ItemEffect = {
      id: 'dreamroot_forest_bonus',
      name: 'Forest Affinity',
      description: 'Provides bonuses in forest environments',
      trigger: 'in_terrain' as EffectTrigger,
      conditions: [{
        type: 'location',
        operator: 'contains',
        value: 'forest'
      }],
      actions: [{
        type: 'boost_stat' as ActionType,
        target: 'self',
        value: { stat: 'evasion', modifier: 1.1 },
        success_message: 'The forest energy enhances your movements!'
      }]
    };
    
    // Protection contre les cauchemars (effet narratif)
    const nightmareProtection: ItemEffect = {
      id: 'dreamroot_nightmare_ward',
      name: 'Dream Protection',
      description: 'Protects against nightmare-inducing effects',
      trigger: 'on_status_inflict' as EffectTrigger,
      conditions: [{
        type: 'has_status',
        operator: 'equals',
        value: 'sleep'
      }],
      actions: [{
        type: 'prevent_status' as ActionType,
        target: 'self',
        value: 'nightmare',
        success_message: 'The pendant wards off the nightmare!'
      }]
    };
    
    effects.push(ghostResistEffect, forestBonusEffect, nightmareProtection);
  }
  
  return effects;
}

/**
 * Obtient la description de capture pour les Poké Balls
 */
function getCaptureDescription(itemId: string): string {
  const descriptions: { [key: string]: string } = {
    'poke_ball': 'Standard capture rate',
    'great_ball': 'Improved capture rate (1.5x)',
    'ultra_ball': 'High capture rate (2x)',
    'master_ball': 'Guaranteed capture',
    'safari_ball': 'Safari Zone special ball',
    'love_ball': 'More effective on opposite gender Pokémon',
    'moon_ball': 'More effective on Moon Stone evolution Pokémon',
    'friend_ball': 'Makes captured Pokémon friendlier',
    'lure_ball': 'More effective on hooked Pokémon',
    'heavy_ball': 'More effective on heavy Pokémon',
    'level_ball': 'More effective on lower level Pokémon',
    'fast_ball': 'More effective on fast Pokémon'
  };
  
  return descriptions[itemId] || 'Captures wild Pokémon';
}

/**
 * Obtient le type d'action de capture
 */
function getCaptureActionType(itemId: string): ActionType {
  return itemId === 'master_ball' ? 'guaranteed_catch' : 'modify_catch_rate';
}

/**
 * Obtient la valeur de capture
 */
function getCaptureValue(itemId: string): number {
  const values: { [key: string]: number } = {
    'poke_ball': 1,
    'great_ball': 1.5,
    'ultra_ball': 2,
    'master_ball': 1, // Guaranteed catch n'utilise pas la valeur
    'safari_ball': 1.5,
    'love_ball': 8, // Conditionnel sur le genre
    'moon_ball': 4, // Conditionnel sur Moon Stone
    'friend_ball': 1,
    'lure_ball': 3, // Conditionnel sur pêche
    'heavy_ball': 1, // Variable selon le poids
    'level_ball': 1, // Variable selon le niveau
    'fast_ball': 4 // Conditionnel sur la vitesse
  };
  
  return values[itemId] || 1;
}

/**
 * Affiche les statistiques avant migration
 */
async function showPreMigrationStats(): Promise<void> {
  try {
    console.log('\n📊 PRE-MIGRATION DATABASE STATS');
    console.log('================================');
    
    const totalItems = await ItemData.countDocuments({});
    const activeItems = await ItemData.countDocuments({ isActive: true });
    
    console.log(`📦 Total items in database: ${totalItems}`);
    console.log(`✅ Active items: ${activeItems}`);
    console.log(`❌ Inactive items: ${totalItems - activeItems}`);
    
    if (totalItems > 0) {
      const stats = await ItemService.getItemStats();
      console.log('\n📈 Breakdown by category:');
      Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`  - ${category}: ${count}`);
      });
      
      console.log('\n💰 Economic stats:');
      console.log(`  - Buyable items: ${stats.buyable}`);
      console.log(`  - Sellable items: ${stats.sellable}`);
    }
    
    console.log('================================\n');
  } catch (error) {
    console.error('⚠️ Error getting pre-migration stats:', error);
  }
}

/**
 * Affiche les statistiques après migration
 */
async function showPostMigrationStats(): Promise<void> {
  try {
    console.log('\n📊 POST-MIGRATION DATABASE STATS');
    console.log('=================================');
    
    const stats = await ItemService.getItemStats();
    
    console.log(`📦 Total items: ${stats.total}`);
    console.log(`💰 Buyable items: ${stats.buyable}`);
    console.log(`💸 Sellable items: ${stats.sellable}`);
    console.log(`⚡ Items with effects: ${stats.withEffects}`);
    console.log(`🔄 Consumable items: ${stats.consumable}`);
    
    console.log('\n📈 Breakdown by category:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count}`);
    });
    
    console.log('\n🎮 Breakdown by generation:');
    Object.entries(stats.byGeneration).forEach(([generation, count]) => {
      console.log(`  - Gen ${generation}: ${count}`);
    });
    
    console.log('\n💎 Breakdown by rarity:');
    Object.entries(stats.byRarity).forEach(([rarity, count]) => {
      console.log(`  - ${rarity}: ${count}`);
    });
    
    console.log('\n🖼️ Visual assets summary:');
    const itemsWithIcons = await ItemData.countDocuments({ icon: { $exists: true, $ne: null } });
    const itemsWithOverworld = await ItemData.countDocuments({ overworldSprite: { $exists: true, $ne: null } });
    console.log(`  - Items with icons: ${itemsWithIcons}`);
    console.log(`  - Items with overworld sprites: ${itemsWithOverworld}`);
    
    console.log('=================================\n');
  } catch (error) {
    console.error('⚠️ Error getting post-migration stats:', error);
  }
}

/**
 * Effectue la migration complète des items
 */
async function migrateItems(itemsData: any, options: {
  dryRun?: boolean;
  clearExisting?: boolean;
}): Promise<void> {
  try {
    const { dryRun = false, clearExisting = true } = options;
    
    console.log('🚀 Starting complete items migration...');
    console.log(`🔧 Options: dryRun=${dryRun}, clearExisting=${clearExisting}`);
    
    // Nettoyer la base si demandé
    if (clearExisting && !dryRun) {
      await clearItemsCollection();
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    }
    
    // Ajouter les items personnalisés
    const customItems = addCustomItems();
    const allItems = { ...itemsData, ...customItems };
    
    // Convertir et migrer chaque item
    const itemIds = Object.keys(allItems);
    let success = 0;
    let errors: string[] = [];
    
    console.log(`\n📦 Processing ${itemIds.length} items (${Object.keys(itemsData).length} from JSON + ${Object.keys(customItems).length} custom)...`);
    
    for (const itemId of itemIds) {
      try {
        const legacyItem = allItems[itemId];
        const newItem = convertLegacyItemToNew(itemId, legacyItem);
        
        if (!dryRun) {
          await ItemService.createItem(newItem);
        }
        
        success++;
        const customTag = Object.keys(customItems).includes(itemId) ? ' [CUSTOM]' : '';
        console.log(`✅ ${itemId} - ${newItem.name}${customTag}`);
        
      } catch (error) {
        const errorMsg = `❌ ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.log(errorMsg);
      }
    }
    
    console.log('\n✅ MIGRATION COMPLETED');
    console.log('=====================');
    console.log(`✅ Success: ${success} items`);
    console.log(`⚠️ Errors: ${errors.length}`);
    console.log(`🎨 New visual fields: icon, overworldSprite`);
    console.log(`🔮 Custom items added: ${Object.keys(customItems).length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Valide la base de données après migration
 */
async function validateDatabase(): Promise<void> {
  try {
    console.log('🔍 Validating database integrity...');
    
    const validation = await ItemService.validateDatabase();
    
    console.log('\n🔍 VALIDATION RESULTS');
    console.log('====================');
    console.log(`Status: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (validation.issues.length > 0) {
      console.log('\n⚠️ Issues found:');
      validation.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ No issues found - database is healthy!');
    }
    
    console.log('\n📊 Effect validation:');
    console.log(`Items checked: ${validation.effectValidation.items_checked}`);
    console.log(`Items with errors: ${validation.effectValidation.items_with_errors}`);
    
    // Validation spécifique aux nouveaux champs
    console.log('\n🖼️ Visual assets validation:');
    const itemsWithoutIcons = await ItemData.countDocuments({ 
      $or: [{ icon: { $exists: false } }, { icon: null }, { icon: '' }] 
    });
    const itemsWithoutOverworld = await ItemData.countDocuments({ 
      $or: [{ overworldSprite: { $exists: false } }, { overworldSprite: null }, { overworldSprite: '' }] 
    });
    
    console.log(`Items without icons: ${itemsWithoutIcons}`);
    console.log(`Items without overworld sprites: ${itemsWithoutOverworld}`);
    
    console.log('====================\n');
  } catch (error) {
    console.error('⚠️ Error during validation:', error);
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Parse des arguments
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    clearExisting: !args.includes('--no-clear'),
    skipValidation: args.includes('--skip-validation'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  // Afficher l'aide
  if (options.help) {
    console.log(`
📦 Items Complete Migration Script v2.0
=======================================

Usage: npx ts-node server/src/scripts/migrate-items.ts [options]

Options:
  --dry-run, -d          Run without making changes (simulation)
  --no-clear             Don't clear existing items before migration
  --skip-validation      Skip database validation after migration
  --help, -h             Show this help message

Environment Variables:
  MONGODB_URI           MongoDB connection string (default: mongodb://localhost:27017/pokemmo)
  ITEMS_JSON_PATH       Path to items.json file (default: ./server/src/data/items.json)

New Features v2.0:
  ✨ Added icon and overworldSprite fields for better visual management
  🔮 Added custom items support (Dreamroot Pendant included)
  🎨 Enhanced generation inference and rarity system
  📊 Improved validation and statistics

Examples:
  npx ts-node server/src/scripts/migrate-items.ts                    # Full migration with clear
  npx ts-node server/src/scripts/migrate-items.ts --dry-run          # Simulation only
  npx ts-node server/src/scripts/migrate-items.ts --no-clear         # Migrate without clearing

⚠️  WARNING: This script will COMPLETELY REPLACE all items in the database!
    Use --dry-run first to preview changes.
`);
    return;
  }
  
  console.log('🎮 PokéMMO Complete Items Migration Script v2.0');
  console.log('===============================================\n');
  
  if (!options.dryRun && options.clearExisting) {
    console.log('⚠️  WARNING: This will COMPLETELY REPLACE all items in the database!');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    
    // Attendre 5 secondes pour permettre l'annulation
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    // Étape 1: Connexion à la base de données
    await connectToDatabase();
    
    // Étape 2: Lecture du JSON
    const itemsData = readItemsJson();
    
    // Étape 3: Statistiques pré-migration
    await showPreMigrationStats();
    
    // Étape 4: Migration complète
    await migrateItems(itemsData, options);
    
    // Étape 5: Statistiques post-migration
    if (!options.dryRun) {
      await showPostMigrationStats();
    }
    
    // Étape 6: Validation (optionnelle)
    if (!options.skipValidation && !options.dryRun) {
      await validateDatabase();
    }
    
    console.log('🎉 Migration script completed successfully!');
    console.log('🔮 Custom items (like Dreamroot Pendant) have been added');
    console.log('🎨 New visual fields (icon, overworldSprite) are ready for asset management');
    
  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    await disconnectFromDatabase();
  }
}

// ===== GESTION DES SIGNAUX =====
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, gracefully shutting down...');
  await disconnectFromDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, gracefully shutting down...');
  await disconnectFromDatabase();
  process.exit(0);
});

// ===== EXÉCUTION =====
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateItems };
