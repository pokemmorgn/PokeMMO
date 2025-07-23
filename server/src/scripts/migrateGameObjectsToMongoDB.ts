// server/src/scripts/migrateGameObjectsToMongoDB.ts
// Script de migration simple pour migrer les objets JSON vers MongoDB
// Usage: npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Import du modèle
import { GameObjectData } from '../models/GameObjectData';

// Configuration
const CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo',
  gameObjectsPath: './build/data/gameobjects', // Depuis la racine du projet
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose')
};

interface MigrationStats {
  filesProcessed: number;
  objectsCreated: number;
  objectsUpdated: number;
  objectsSkipped: number;
  errors: string[];
}

async function connectToMongoDB(): Promise<void> {
  try {
    await mongoose.connect(CONFIG.mongoUri);
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  }
}

async function scanJsonFiles(): Promise<string[]> {
  try {
    if (!fs.existsSync(CONFIG.gameObjectsPath)) {
      console.error(`❌ Dossier non trouvé: ${CONFIG.gameObjectsPath}`);
      process.exit(1);
    }

    const files = fs.readdirSync(CONFIG.gameObjectsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(CONFIG.gameObjectsPath, file));

    console.log(`📁 ${files.length} fichiers JSON trouvés`);
    return files;
  } catch (error) {
    console.error('❌ Erreur scan fichiers:', error);
    process.exit(1);
  }
}

async function migrateFile(filePath: string, stats: MigrationStats): Promise<void> {
  const fileName = path.basename(filePath, '.json');
  
  try {
    console.log(`\n📄 Traitement: ${fileName}.json`);
    
    // Lire le fichier JSON
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const zoneData = JSON.parse(jsonContent);
    
    if (!zoneData.zone || !zoneData.objects || !Array.isArray(zoneData.objects)) {
      stats.errors.push(`${fileName}: Format JSON invalide`);
      return;
    }

    console.log(`   Zone: ${zoneData.zone}`);
    console.log(`   Version: ${zoneData.version || 'N/A'}`);
    console.log(`   Objets: ${zoneData.objects.length}`);

    if (CONFIG.dryRun) {
      console.log(`   🔍 [DRY RUN] Simulation migration...`);
      stats.objectsCreated += zoneData.objects.length;
      stats.filesProcessed++;
      return;
    }

    // Migrer chaque objet
    for (const jsonObject of zoneData.objects) {
      try {
        // Vérifier si l'objet existe déjà
        const existing = await GameObjectData.findOne({ 
          zone: zoneData.zone, 
          objectId: jsonObject.id 
        });

        if (existing && !CONFIG.force) {
          if (CONFIG.verbose) {
            console.log(`   ⏭️  Objet ${jsonObject.id} existe déjà (utilisez --force pour écraser)`);
          }
          stats.objectsSkipped++;
          continue;
        }

        if (existing && CONFIG.force) {
          // Mettre à jour l'existant
          await existing.updateFromJson(jsonObject);
          if (CONFIG.verbose) {
            console.log(`   🔄 Objet ${jsonObject.id} mis à jour`);
          }
          stats.objectsUpdated++;
        } else {
          // Créer nouveau
          await GameObjectData.createFromJson(jsonObject, zoneData.zone);
          if (CONFIG.verbose) {
            console.log(`   ➕ Objet ${jsonObject.id} créé (${jsonObject.itemId || jsonObject.type})`);
          }
          stats.objectsCreated++;
        }

      } catch (objError) {
        const errorMsg = `${fileName} - Objet ${jsonObject.id}: ${objError instanceof Error ? objError.message : 'Erreur inconnue'}`;
        stats.errors.push(errorMsg);
        console.log(`   ❌ ${errorMsg}`);
      }
    }

    stats.filesProcessed++;
    console.log(`   ✅ ${fileName} terminé`);

  } catch (error) {
    const errorMsg = `${fileName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
    stats.errors.push(errorMsg);
    console.log(`   ❌ ${errorMsg}`);
  }
}

async function showPreMigrationStats(): Promise<void> {
  try {
    const totalObjects = await GameObjectData.countDocuments();
    const activeObjects = await GameObjectData.countDocuments({ isActive: true });
    const zones = await GameObjectData.distinct('zone');
    
    console.log('\n📊 État actuel de la base:');
    console.log(`   Objets total: ${totalObjects}`);
    console.log(`   Objets actifs: ${activeObjects}`);
    console.log(`   Zones: ${zones.length} (${zones.join(', ')})`);
    
    if (totalObjects > 0 && !CONFIG.force && !CONFIG.dryRun) {
      console.log('\n⚠️  Des objets existent déjà en base !');
      console.log('   Utilisez --force pour écraser ou --dry-run pour simuler');
      
      // Demander confirmation simple
      const proceed = process.argv.includes('--yes');
      if (!proceed) {
        console.log('   Ajoutez --yes pour continuer sans confirmation');
        process.exit(0);
      }
    }
  } catch (error) {
    console.log('⚠️  Impossible de vérifier l\'état de la base (normal si première migration)');
  }
}

async function main(): Promise<void> {
  console.log('🚀 Migration des objets de jeu JSON → MongoDB');
  console.log(`📂 Source: ${CONFIG.gameObjectsPath}`);
  console.log(`🗄️  MongoDB: ${CONFIG.mongoUri}`);
  
  if (CONFIG.dryRun) {
    console.log('🔍 Mode DRY RUN activé (simulation)');
  }
  if (CONFIG.force) {
    console.log('💪 Mode FORCE activé (écrasement)');
  }
  if (CONFIG.verbose) {
    console.log('📝 Mode VERBOSE activé');
  }

  // Connexion
  await connectToMongoDB();

  // Stats pré-migration
  await showPreMigrationStats();

  // Scanner les fichiers
  const jsonFiles = await scanJsonFiles();
  
  if (jsonFiles.length === 0) {
    console.log('❌ Aucun fichier JSON trouvé');
    process.exit(1);
  }

  // Stats de migration
  const stats: MigrationStats = {
    filesProcessed: 0,
    objectsCreated: 0,
    objectsUpdated: 0,
    objectsSkipped: 0,
    errors: []
  };

  // Migrer chaque fichier
  const startTime = Date.now();
  
  for (const filePath of jsonFiles) {
    await migrateFile(filePath, stats);
  }

  // Rapport final
  const duration = Date.now() - startTime;
  
  console.log('\n🎉 Migration terminée !');
  console.log('═'.repeat(50));
  console.log(`⏱️  Durée: ${duration}ms`);
  console.log(`📁 Fichiers traités: ${stats.filesProcessed}/${jsonFiles.length}`);
  console.log(`➕ Objets créés: ${stats.objectsCreated}`);
  console.log(`🔄 Objets mis à jour: ${stats.objectsUpdated}`);
  console.log(`⏭️  Objets ignorés: ${stats.objectsSkipped}`);
  console.log(`❌ Erreurs: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Détail des erreurs:');
    stats.errors.forEach(error => console.log(`   - ${error}`));
  }

  // Vérification post-migration
  if (!CONFIG.dryRun) {
    try {
      const finalCount = await GameObjectData.countDocuments({ isActive: true });
      const zoneCount = await GameObjectData.distinct('zone');
      console.log(`\n✅ Vérification: ${finalCount} objets actifs dans ${zoneCount.length} zones`);
    } catch (verifyError) {
      console.log('⚠️  Impossible de vérifier le résultat final');
    }
  }

  await mongoose.disconnect();
  console.log('👋 Déconnecté de MongoDB');
  
  // Code de sortie
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non gérée:', error);
  process.exit(1);
});

// Help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎮 Migration des objets de jeu JSON vers MongoDB

Usage:
  npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts [options]

Options:
  --dry-run     Simuler la migration sans rien écrire en base
  --force       Écraser les objets existants
  --verbose     Affichage détaillé
  --yes         Pas de confirmation interactive
  --help, -h    Afficher cette aide

Variables d'environnement:
  MONGODB_URI   URI de connexion MongoDB (défaut: mongodb://localhost:27017/pokemmo)

Exemples:
  # Simulation
  npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts --dry-run

  # Migration réelle
  npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts --yes

  # Migration avec écrasement
  npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts --force --yes

  # Migration détaillée
  npx ts-node server/src/scripts/migrateGameObjectsToMongoDB.ts --verbose --yes
`);
  process.exit(0);
}

// Lancer la migration
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
