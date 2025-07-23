#!/usr/bin/env npx ts-node

// scripts/migrate-gameobjects.ts
// Script de migration des objets de jeu : JSON → MongoDB
// Usage: npx ts-node scripts/migrate-gameobjects.ts [options]

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { GameObjectData } from '../server/src/models/GameObjectData';

// ===== INTERFACES =====

interface MigrationOptions {
  force: boolean;           // Écraser les objets existants
  dryRun: boolean;          // Simulation sans écriture
  specificZone?: string;    // Migrer une zone spécifique
  verbose: boolean;         // Logs détaillés
  backup: boolean;          // Créer une sauvegarde avant migration
}

interface MigrationStats {
  totalFiles: number;
  totalObjects: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedObjects: number;
  updatedObjects: number;
  errors: string[];
  warnings: string[];
  processedZones: Set<string>;
}

interface GameObjectZoneData {
  zone: string;
  version: string;
  lastUpdated: string;
  description?: string;
  defaultRequirements?: any;
  requirementPresets?: any;
  objects: Array<{
    id: number;
    position: { x: number; y: number };
    type: 'ground' | 'hidden' | 'pc' | 'vending_machine' | 'panel' | 'guild_board';
    itemId?: string;
    sprite?: string;
    quantity?: number;
    cooldown?: number;
    searchRadius?: number;
    itemfinderRadius?: number;
    findChance?: number;
    requirements?: any;
    requirementPreset?: string;
    [key: string]: any;
  }>;
}

// ===== CONFIGURATION =====

const CONFIG = {
  GAMEOBJECTS_PATH: './server/build/data/gameobjects',
  BACKUP_PATH: './backups/gameobjects',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo',
  CONNECTION_TIMEOUT: 10000
};

// ===== CLASSE PRINCIPALE =====

class GameObjectMigrator {
  private options: MigrationOptions;
  private stats: MigrationStats;
  
  constructor(options: MigrationOptions) {
    this.options = options;
    this.stats = {
      totalFiles: 0,
      totalObjects: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedObjects: 0,
      updatedObjects: 0,
      errors: [],
      warnings: [],
      processedZones: new Set()
    };
  }

  // === MÉTHODE PRINCIPALE ===
  
  async migrate(): Promise<void> {
    console.log('🚀 [GameObject Migration] Démarrage de la migration JSON → MongoDB');
    console.log('📊 [Config]', {
      source: CONFIG.GAMEOBJECTS_PATH,
      dryRun: this.options.dryRun,
      force: this.options.force,
      specificZone: this.options.specificZone,
      backup: this.options.backup
    });

    try {
      // 1. Connexion MongoDB
      await this.connectToMongoDB();
      
      // 2. Créer sauvegarde si demandé
      if (this.options.backup && !this.options.dryRun) {
        await this.createBackup();
      }
      
      // 3. Scanner les fichiers JSON
      const jsonFiles = this.scanJsonFiles();
      
      // 4. Migrer chaque fichier
      for (const filePath of jsonFiles) {
        await this.migrateZoneFile(filePath);
      }
      
      // 5. Afficher le rapport final
      this.displayFinalReport();
      
    } catch (error) {
      console.error('❌ [Migration] Erreur fatale:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }

  // === CONNEXION MONGODB ===
  
  private async connectToMongoDB(): Promise<void> {
    try {
      console.log('🔌 [MongoDB] Connexion en cours...');
      
      await mongoose.connect(CONFIG.MONGODB_URI, {
        serverSelectionTimeoutMS: CONFIG.CONNECTION_TIMEOUT
      });
      
      const dbName = mongoose.connection.db?.databaseName;
      console.log(`✅ [MongoDB] Connecté à la base: ${dbName}`);
      
      // Test de la collection
      const existingCount = await GameObjectData.countDocuments();
      console.log(`📊 [MongoDB] Objets existants: ${existingCount}`);
      
    } catch (error) {
      throw new Error(`Impossible de se connecter à MongoDB: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // === SAUVEGARDE ===
  
  private async createBackup(): Promise<void> {
    try {
      console.log('💾 [Backup] Création de la sauvegarde...');
      
      // Créer le dossier de backup
      const backupDir = path.resolve(CONFIG.BACKUP_PATH);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Exporter les données existantes
      const existingObjects = await GameObjectData.find({});
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `gameobjects-backup-${timestamp}.json`);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        totalObjects: existingObjects.length,
        objects: existingObjects.map(obj => obj.toObject())
      };
      
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`✅ [Backup] Sauvegarde créée: ${backupFile} (${existingObjects.length} objets)`);
      
    } catch (error) {
      throw new Error(`Erreur création backup: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // === SCAN DES FICHIERS JSON ===
  
  private scanJsonFiles(): string[] {
    try {
      const gameObjectsDir = path.resolve(CONFIG.GAMEOBJECTS_PATH);
      
      if (!fs.existsSync(gameObjectsDir)) {
        throw new Error(`Dossier gameobjects introuvable: ${gameObjectsDir}`);
      }
      
      let jsonFiles = fs.readdirSync(gameObjectsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(gameObjectsDir, file));
      
      // Filtrer par zone spécifique si demandé
      if (this.options.specificZone) {
        const targetFile = `${this.options.specificZone}.json`;
        jsonFiles = jsonFiles.filter(filePath => 
          path.basename(filePath) === targetFile
        );
        
        if (jsonFiles.length === 0) {
          throw new Error(`Zone spécifique non trouvée: ${this.options.specificZone}`);
        }
      }
      
      this.stats.totalFiles = jsonFiles.length;
      console.log(`📄 [Scanner] ${jsonFiles.length} fichiers JSON trouvés`);
      
      if (this.options.verbose) {
        jsonFiles.forEach(file => {
          console.log(`  📁 ${path.basename(file)}`);
        });
      }
      
      return jsonFiles;
      
    } catch (error) {
      throw new Error(`Erreur scan fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // === MIGRATION D'UNE ZONE ===
  
  private async migrateZoneFile(filePath: string): Promise<void> {
    const zoneName = path.basename(filePath, '.json');
    
    try {
      console.log(`\n🌍 [Zone: ${zoneName}] Début de la migration...`);
      
      // Lire et parser le JSON
      const jsonContent = fs.readFileSync(filePath, 'utf-8');
      const zoneData: GameObjectZoneData = JSON.parse(jsonContent);
      
      if (!zoneData.objects || !Array.isArray(zoneData.objects)) {
        this.stats.warnings.push(`${zoneName}: Pas d'objets trouvés`);
        return;
      }
      
      console.log(`📦 [Zone: ${zoneName}] ${zoneData.objects.length} objets à migrer`);
      this.stats.totalObjects += zoneData.objects.length;
      
      // Migrer chaque objet
      for (const objectData of zoneData.objects) {
        await this.migrateObject(objectData, zoneName, zoneData);
      }
      
      this.stats.processedZones.add(zoneName);
      
    } catch (error) {
      const errorMsg = `Zone ${zoneName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      this.stats.errors.push(errorMsg);
      console.error(`❌ [Zone: ${zoneName}] ${errorMsg}`);
    }
  }

  // === MIGRATION D'UN OBJET ===
  
  private async migrateObject(
    objectData: any, 
    zoneName: string, 
    zoneData: GameObjectZoneData
  ): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log(`  🔧 [Objet ${objectData.id}] Migration en cours...`);
      }
      
      // Vérifier si l'objet existe déjà
      const existingObject = await GameObjectData.findOne({
        zone: zoneName,
        objectId: objectData.id
      });
      
      if (existingObject && !this.options.force) {
        this.stats.skippedObjects++;
        
        if (this.options.verbose) {
          console.log(`  ⏭️  [Objet ${objectData.id}] Ignoré (existe déjà, utilisez --force pour écraser)`);
        }
        return;
      }
      
      // Préparer les données avec résolution des requirements
      const processedData = this.processObjectData(objectData, zoneData);
      
      if (this.options.dryRun) {
        // Mode simulation
        console.log(`  🎭 [DRY RUN] Objet ${objectData.id}:`, {
          type: processedData.type,
          itemId: processedData.itemId,
          position: processedData.position
        });
        this.stats.successfulMigrations++;
        return;
      }
      
      // Migration réelle
      if (existingObject) {
        // Mise à jour
        await existingObject.updateFromJson(processedData);
        this.stats.updatedObjects++;
        
        if (this.options.verbose) {
          console.log(`  🔄 [Objet ${objectData.id}] Mis à jour`);
        }
      } else {
        // Création
        await GameObjectData.createFromJson(processedData, zoneName);
        this.stats.successfulMigrations++;
        
        if (this.options.verbose) {
          console.log(`  ✅ [Objet ${objectData.id}] Créé`);
        }
      }
      
    } catch (error) {
      this.stats.failedMigrations++;
      const errorMsg = `Objet ${objectData.id} dans ${zoneName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      this.stats.errors.push(errorMsg);
      
      console.error(`  ❌ [Objet ${objectData.id}] ${errorMsg}`);
    }
  }

  // === TRAITEMENT DES DONNÉES OBJET ===
  
  private processObjectData(objectData: any, zoneData: GameObjectZoneData): any {
    // Copier les données de base
    const processed = { ...objectData };
    
    // Résoudre les requirements avec héritage (comme dans ObjectInteractionModule)
    if (zoneData.defaultRequirements || zoneData.requirementPresets || objectData.requirementPreset) {
      processed.requirements = this.resolveRequirements(
        objectData,
        zoneData.defaultRequirements,
        zoneData.requirementPresets
      );
    }
    
    // Normaliser les noms de propriétés
    if (processed.cooldown) {
      processed.cooldownHours = processed.cooldown;
      delete processed.cooldown;
    }
    
    // Validation ItemDB si disponible
    if (processed.itemId) {
      try {
        const { isValidItemId } = require('../server/src/utils/ItemDB');
        if (!isValidItemId(processed.itemId)) {
          this.stats.warnings.push(`Objet ${objectData.id}: ItemId "${processed.itemId}" invalide`);
        }
      } catch (error) {
        // ItemDB pas disponible, continuer sans validation
      }
    }
    
    return processed;
  }

  // === RÉSOLUTION DES REQUIREMENTS (même logique que ObjectInteractionModule) ===
  
  private resolveRequirements(
    objData: any,
    defaultRequirements?: any,
    requirementPresets?: any
  ): any {
    let resolved: any = {};

    // 1. Defaults selon le type
    if (defaultRequirements && objData.type in defaultRequirements) {
      resolved = { ...resolved, ...defaultRequirements[objData.type] };
    }

    // 2. Preset spécifique
    if (objData.requirementPreset && requirementPresets?.[objData.requirementPreset]) {
      resolved = { ...resolved, ...requirementPresets[objData.requirementPreset] };
    }

    // 3. Requirements directs (priorité max)
    if (objData.requirements) {
      resolved = { ...resolved, ...objData.requirements };
    }

    return Object.keys(resolved).length > 0 ? resolved : undefined;
  }

  // === RAPPORT FINAL ===
  
  private displayFinalReport(): void {
    console.log('\n🎉 [Migration] Rapport final:');
    console.log('=====================================');
    
    // Statistiques générales
    console.log(`📊 Statistiques:`);
    console.log(`  • Fichiers traités: ${this.stats.totalFiles}`);
    console.log(`  • Zones migrées: ${this.stats.processedZones.size}`);
    console.log(`  • Objets totaux: ${this.stats.totalObjects}`);
    console.log(`  • Migrations réussies: ${this.stats.successfulMigrations}`);
    console.log(`  • Objets mis à jour: ${this.stats.updatedObjects}`);
    console.log(`  • Objets ignorés: ${this.stats.skippedObjects}`);
    console.log(`  • Échecs: ${this.stats.failedMigrations}`);
    
    // Zones traitées
    if (this.stats.processedZones.size > 0) {
      console.log(`\n🌍 Zones migrées: ${Array.from(this.stats.processedZones).join(', ')}`);
    }
    
    // Avertissements
    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️  Avertissements (${this.stats.warnings.length}):`);
      this.stats.warnings.slice(0, 10).forEach(warning => {
        console.log(`  - ${warning}`);
      });
      if (this.stats.warnings.length > 10) {
        console.log(`  ... et ${this.stats.warnings.length - 10} autres`);
      }
    }
    
    // Erreurs
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Erreurs (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 10).forEach(error => {
        console.log(`  - ${error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`  ... et ${this.stats.errors.length - 10} autres`);
      }
    }
    
    // Status final
    const successRate = this.stats.totalObjects > 0 
      ? ((this.stats.successfulMigrations + this.stats.updatedObjects) / this.stats.totalObjects * 100).toFixed(1)
      : '0';
    
    console.log(`\n🎯 Taux de réussite: ${successRate}%`);
    
    if (this.options.dryRun) {
      console.log(`\n🎭 Mode simulation activé - Aucune modification réelle`);
    }
    
    console.log('=====================================');
  }
}

// ===== UTILITAIRES CLI ===

function parseArguments(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    force: false,
    dryRun: false,
    verbose: false,
    backup: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--force':
      case '-f':
        options.force = true;
        break;
        
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--backup':
      case '-b':
        options.backup = true;
        break;
        
      case '--zone':
      case '-z':
        if (i + 1 < args.length) {
          options.specificZone = args[i + 1];
          i++; // Skip next argument
        }
        break;
        
      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Option inconnue: ${arg}`);
          displayHelp();
          process.exit(1);
        }
    }
  }
  
  return options;
}

function displayHelp(): void {
  console.log(`
🚀 Migration des GameObjects JSON vers MongoDB

Usage: npx ts-node scripts/migrate-gameobjects.ts [options]

Options:
  -f, --force        Écraser les objets existants
  -d, --dry-run      Simulation sans écriture réelle
  -v, --verbose      Logs détaillés
  -b, --backup       Créer une sauvegarde avant migration
  -z, --zone <nom>   Migrer une zone spécifique seulement
  -h, --help         Afficher cette aide

Exemples:
  npx ts-node scripts/migrate-gameobjects.ts --dry-run
  npx ts-node scripts/migrate-gameobjects.ts --force --backup
  npx ts-node scripts/migrate-gameobjects.ts --zone road1 --verbose
  `);
}

// ===== POINT D'ENTRÉE ===

async function main(): Promise<void> {
  try {
    const options = parseArguments();
    const migrator = new GameObjectMigrator(options);
    await migrator.migrate();
    
    console.log('✅ Migration terminée avec succès !');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Lancer le script si exécuté directement
if (require.main === module) {
  main();
}

export { GameObjectMigrator, MigrationOptions, MigrationStats };
