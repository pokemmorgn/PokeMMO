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
