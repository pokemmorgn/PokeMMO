// server/src/scripts/migrate-items.ts - SCRIPT DE MIGRATION COMPLET DES ITEMS
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { ItemService } from '../services/ItemService';
import { ItemData } from '../models/ItemData';
import { ItemEffect, ItemAction } from '../items/ItemEffectTypes';

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo';
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
    sprite: itemId,
    generation: 1, // Par défaut Gen 1 pour les items de base
    rarity: inferRarity(itemId, legacyItem),
    tags: generateTags(itemId, legacyItem),
    obtainMethods: generateObtainMethods(itemId, legacyItem),
    usageRestrictions: generateUsageRestrictions(legacyItem)
  };
  
  return newItem;
}

/**
 * Génère une description appropriée pour l'item
 */
function generateItemDescription(itemId: string, legacyItem: any): string {
  // Descriptions personnalisées pour les items connus
  const descriptions: { [key: string]: string } = {
    // Poké Balls
    'poke_ball': 'A standard Poké Ball used to catch wild Pokémon. It has a basic catch rate.',
    'great_ball': 'A high-performance Poké Ball with a better catch rate than a standard Poké Ball.',
    'ultra_ball': 'An ultra-high performance Poké Ball with an even higher catch rate than a Great Ball.',
    'master_ball': 'The ultimate Poké Ball that will catch any wild Pokémon without fail.',
    'safari_ball': 'A special Poké Ball used only in the Safari Zone.',
    'love_ball': 'A Poké Ball that works best on Pokémon of the opposite gender.',
    
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
    'escape_rope': 'A rope that allows instant escape from caves and dungeons.'
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
    'super_rod': { method: 'gift', location: 'Route 12', npc: 'Fishing Guru' }
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
      trigger: 'on_use',
      actions: []
    };
    
    if (legacyItem.heal_amount === 'full') {
      healEffect.actions.push({
        type: 'heal_hp_max',
        target: 'self',
        value: true,
        success_message: 'HP fully restored!'
      });
    } else {
      healEffect.actions.push({
        type: 'heal_hp_fixed',
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
      trigger: 'on_use',
      actions: []
    };
    
    if (legacyItem.status_cure.includes('all')) {
      cureEffect.actions.push({
        type: 'cure_all_status',
        target: 'self',
        value: true,
        success_message: 'All status conditions cured!'
      });
    } else {
      for (const status of legacyItem.status_cure) {
        cureEffect.actions.push({
          type: 'cure_status',
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
      trigger: 'on_use',
      conditions: [{
        type: 'pokemon_species', // Placeholder - besoin d'une condition "is fainted"
        operator: 'equals',
        value: 'fainted' // Placeholder
      }],
      actions: [{
        type: 'revive_pokemon',
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
      trigger: 'on_use_in_field',
      actions: [{
        type: 'prevent_wild_encounters',
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
      trigger: 'on_use_in_battle',
      actions: [{
        type: getCaptureActionType(itemId),
        target: 'opponent',
        value: getCaptureValue(itemId),
        success_message: 'Pokémon captured!',
        failure_message: 'The Pokémon broke free!'
      }]
    };
    
    effects.push(catchEffect);
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
    'love_ball': 'More effective on opposite gender Pokémon'
  };
  
  return descriptions[itemId] || 'Captures wild Pokémon';
}

/**
 * Obtient le type d'action de capture
 */
function getCaptureActionType(itemId: string): string {
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
    'love_ball': 8 // Conditionnel
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
    
    // Convertir et migrer chaque item
    const itemIds = Object.keys(itemsData);
    let success = 0;
    let errors: string[] = [];
    
    console.log(`\n📦 Processing ${itemIds.length} items...`);
    
    for (const itemId of itemIds) {
      try {
        const legacyItem = itemsData[itemId];
        const newItem = convertLegacyItemToNew(itemId, legacyItem);
        
        if (!dryRun) {
          await ItemService.createItem(newItem);
        }
        
        success++;
        console.log(`✅ ${itemId} - ${newItem.name}`);
        
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
📦 Items Complete Migration Script
=================================

Usage: npx ts-node server/src/scripts/migrate-items.ts [options]

Options:
  --dry-run, -d          Run without making changes (simulation)
  --no-clear             Don't clear existing items before migration
  --skip-validation      Skip database validation after migration
  --help, -h             Show this help message

Environment Variables:
  MONGODB_URI           MongoDB connection string (default: mongodb://localhost:27017/pokemmo)
  ITEMS_JSON_PATH       Path to items.json file (default: ./server/src/data/items.json)

Examples:
  npx ts-node server/src/scripts/migrate-items.ts                    # Full migration with clear
  npx ts-node server/src/scripts/migrate-items.ts --dry-run          # Simulation only
  npx ts-node server/src/scripts/migrate-items.ts --no-clear         # Migrate without clearing

⚠️  WARNING: This script will COMPLETELY REPLACE all items in the database!
    Use --dry-run first to preview changes.
`);
    return;
  }
  
  console.log('🎮 PokéMMO Complete Items Migration Script');
  console.log('==========================================\n');
  
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
// server/src/scripts/migrate-items.ts - SCRIPT DE MIGRATION DES ITEMS JSON VERS MONGODB
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { ItemService } from '../services/ItemService';
import { ItemData } from '../models/ItemData';

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo';
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
    
    console.log('=================================\n');
  } catch (error) {
    console.error('⚠️ Error getting post-migration stats:', error);
  }
}

/**
 * Effectue la migration des items
 */
async function migrateItems(itemsData: any, options: {
  dryRun?: boolean;
  clearExisting?: boolean;
  updateExisting?: boolean;
}): Promise<void> {
  try {
    const { dryRun = false, clearExisting = false, updateExisting = true } = options;
    
    console.log('🚀 Starting items migration...');
    console.log(`🔧 Options: dryRun=${dryRun}, clearExisting=${clearExisting}, updateExisting=${updateExisting}`);
    
    // Nettoyer la base si demandé
    if (clearExisting && !dryRun) {
      console.log('🧹 Clearing existing items...');
      const deleteResult = await ItemData.deleteMany({});
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing items`);
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    }
    
    // Effectuer la migration
    const startTime = Date.now();
    
    if (!dryRun) {
      const results = await ItemService.importFromJson(itemsData);
      
      const duration = Date.now() - startTime;
      
      console.log('\n✅ MIGRATION COMPLETED');
      console.log('=====================');
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`✅ Success: ${results.success} items`);
      console.log(`⚠️ Errors: ${results.errors.length}`);
      
      if (results.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        results.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
    } else {
      // Mode dry run - simulation
      const itemIds = Object.keys(itemsData);
      const existingItems = await ItemService.itemsExist(itemIds);
      
      let newItems = 0;
      let existingCount = 0;
      
      for (const itemId of itemIds) {
        if (existingItems[itemId]) {
          existingCount++;
        } else {
          newItems++;
        }
      }
      
      console.log('\n🔍 DRY RUN RESULTS');
      console.log('==================');
      console.log(`📦 Total items in JSON: ${itemIds.length}`);
      console.log(`🆕 New items to create: ${newItems}`);
      console.log(`🔄 Existing items to update: ${existingCount}`);
      console.log('==================');
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
    clearExisting: args.includes('--clear') || args.includes('-c'),
    updateExisting: !args.includes('--no-update'),
    skipValidation: args.includes('--skip-validation'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  // Afficher l'aide
  if (options.help) {
    console.log(`
📦 Items Migration Script
========================

Usage: npx ts-node server/src/scripts/migrate-items.ts [options]

Options:
  --dry-run, -d          Run without making changes (simulation)
  --clear, -c            Clear existing items before migration
  --no-update            Don't update existing items
  --skip-validation      Skip database validation after migration
  --help, -h             Show this help message

Environment Variables:
  MONGODB_URI           MongoDB connection string (default: mongodb://localhost:27017/pokemmo)
  ITEMS_JSON_PATH       Path to items.json file (default: ./server/src/data/items.json)

Examples:
  npx ts-node server/src/scripts/migrate-items.ts                    # Normal migration
  npx ts-node server/src/scripts/migrate-items.ts --dry-run          # Simulation only
  npx ts-node server/src/scripts/migrate-items.ts --clear            # Clear and migrate
  npx ts-node server/src/scripts/migrate-items.ts --clear --dry-run  # Simulate clear and migrate
`);
    return;
  }
  
  console.log('🎮 PokéMMO Items Migration Script');
  console.log('==================================\n');
  
  try {
    // Étape 1: Connexion à la base de données
    await connectToDatabase();
    
    // Étape 2: Lecture du JSON
    const itemsData = readItemsJson();
    
    // Étape 3: Statistiques pré-migration
    await showPreMigrationStats();
    
    // Étape 4: Migration
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
