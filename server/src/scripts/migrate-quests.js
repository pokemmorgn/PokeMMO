#!/usr/bin/env node

// scripts/migrate-quests.js
// Script de migration des quêtes depuis JSON vers MongoDB (Base: pokeworld)

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
const MONGODB_URI = 'mongodb://localhost:27017/pokeworld';
const QUEST_JSON_PATH = './build/data/quests/quests.json';
const FALLBACK_PATHS = [
  './server/data/quests/quests.json',
  './data/quests/quests.json',
  './src/data/quests/quests.json'
];

// ===== SCHÉMA QUEST DATA (simplifié pour migration) =====
const QuestDataSchema = new mongoose.Schema({
  questId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['main', 'side', 'daily', 'repeatable'],
    default: 'side'
  },
  prerequisites: [String],
  startNpcId: Number,
  endNpcId: Number,
  isRepeatable: { type: Boolean, default: false },
  cooldownHours: Number,
  autoComplete: { type: Boolean, default: true },
  dialogues: {
    questOffer: [String],
    questInProgress: [String],
    questComplete: [String]
  },
  steps: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    objectives: [{
      id: { type: String, required: true },
      type: { 
        type: String, 
        required: true,
        enum: ['collect', 'defeat', 'talk', 'reach', 'deliver']
      },
      description: { type: String, required: true },
      target: String,
      targetName: String,
      itemId: String,
      requiredAmount: { type: Number, required: true, min: 1 },
      validationDialogue: [String]
    }],
    rewards: [{
      type: { 
        type: String, 
        required: true,
        enum: ['gold', 'item', 'pokemon', 'experience']
      },
      itemId: String,
      amount: Number,
      pokemonId: Number
    }]
  }],
  isActive: { type: Boolean, default: true },
  version: { type: String, default: '1.0.0' },
  lastUpdated: { type: Date, default: Date.now },
  sourceFile: String,
  tags: [String]
}, {
  timestamps: true,
  collection: 'quest_data'
});

// ===== MODÈLE =====
const QuestData = mongoose.model('QuestData', QuestDataSchema);

// ===== FONCTIONS UTILITAIRES =====

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'info':
      console.log(`${prefix} ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, data || '');
      break;
    case 'error':
      console.error(`${prefix} ${message}`, data || '');
      break;
    case 'success':
      console.log(`\x1b[32m${prefix} ${message}\x1b[0m`, data || '');
      break;
  }
}

function findQuestJsonFile() {
  // Vérifier le chemin principal
  if (fs.existsSync(QUEST_JSON_PATH)) {
    log('info', `Fichier trouvé: ${QUEST_JSON_PATH}`);
    return QUEST_JSON_PATH;
  }
  
  // Vérifier les chemins de fallback
  for (const fallbackPath of FALLBACK_PATHS) {
    if (fs.existsSync(fallbackPath)) {
      log('info', `Fichier trouvé (fallback): ${fallbackPath}`);
      return fallbackPath;
    }
  }
  
  throw new Error(`Fichier quests.json introuvable. Chemins vérifiés: ${[QUEST_JSON_PATH, ...FALLBACK_PATHS].join(', ')}`);
}

function validateQuestData(quest) {
  const errors = [];
  
  if (!quest.id || typeof quest.id !== 'string') {
    errors.push('ID manquant ou invalide');
  }
  
  if (!quest.name || typeof quest.name !== 'string') {
    errors.push('Nom manquant ou invalide');
  }
  
  if (!quest.steps || !Array.isArray(quest.steps) || quest.steps.length === 0) {
    errors.push('Étapes manquantes ou invalides');
  } else {
    quest.steps.forEach((step, index) => {
      if (!step.objectives || !Array.isArray(step.objectives) || step.objectives.length === 0) {
        errors.push(`Étape ${index + 1}: objectifs manquants`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function connectToMongoDB() {
  try {
    log('info', `Connexion à MongoDB: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Vérifier la connexion
    const dbName = mongoose.connection.db.databaseName;
    log('success', `✅ Connecté à la base de données: ${dbName}`);
    
    // Vérifier la collection existante
    const existingCount = await QuestData.countDocuments();
    log('info', `📊 Quêtes existantes en base: ${existingCount}`);
    
    return true;
  } catch (error) {
    log('error', 'Erreur connexion MongoDB:', error.message);
    throw error;
  }
}

async function loadQuestJsonData() {
  try {
    const questFilePath = findQuestJsonFile();
    log('info', `📖 Lecture du fichier: ${questFilePath}`);
    
    const fileContent = fs.readFileSync(questFilePath, 'utf-8');
    const questData = JSON.parse(fileContent);
    
    if (!questData.quests || !Array.isArray(questData.quests)) {
      throw new Error('Format JSON invalide: propriété "quests" manquante ou invalide');
    }
    
    log('success', `✅ ${questData.quests.length} quêtes trouvées dans le JSON`);
    return {
      quests: questData.quests,
      sourceFile: path.basename(questFilePath)
    };
    
  } catch (error) {
    log('error', 'Erreur lecture JSON:', error.message);
    throw error;
  }
}

async function migrateQuest(questJson, sourceFile) {
  try {
    // Validation
    const validation = validateQuestData(questJson);
    if (!validation.valid) {
      return {
        success: false,
        questId: questJson.id || 'UNKNOWN',
        error: `Validation échouée: ${validation.errors.join(', ')}`
      };
    }
    
    // Vérifier si existe déjà
    const existingQuest = await QuestData.findOne({ questId: questJson.id });
    
    if (existingQuest) {
      // Mettre à jour
      log('info', `🔄 Mise à jour quête existante: ${questJson.name}`);
      
      await QuestData.updateOne(
        { questId: questJson.id },
        {
          $set: {
            name: questJson.name,
            description: questJson.description || '',
            category: questJson.category || 'side',
            prerequisites: questJson.prerequisites || [],
            startNpcId: questJson.startNpcId,
            endNpcId: questJson.endNpcId,
            isRepeatable: questJson.isRepeatable || false,
            cooldownHours: questJson.cooldownHours,
            autoComplete: questJson.autoComplete !== false,
            dialogues: questJson.dialogues,
            steps: questJson.steps,
            lastUpdated: new Date(),
            sourceFile: sourceFile,
            version: '1.0.0'
          }
        }
      );
      
      return {
        success: true,
        questId: questJson.id,
        action: 'updated'
      };
      
    } else {
      // Créer nouveau
      log('info', `➕ Création nouvelle quête: ${questJson.name}`);
      
      const newQuest = new QuestData({
        questId: questJson.id,
        name: questJson.name,
        description: questJson.description || '',
        category: questJson.category || 'side',
        prerequisites: questJson.prerequisites || [],
        startNpcId: questJson.startNpcId,
        endNpcId: questJson.endNpcId,
        isRepeatable: questJson.isRepeatable || false,
        cooldownHours: questJson.cooldownHours,
        autoComplete: questJson.autoComplete !== false,
        dialogues: questJson.dialogues,
        steps: questJson.steps,
        sourceFile: sourceFile,
        version: '1.0.0'
      });
      
      await newQuest.save();
      
      return {
        success: true,
        questId: questJson.id,
        action: 'created'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      questId: questJson.id || 'UNKNOWN',
      error: error.message
    };
  }
}

async function performMigration() {
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    // Charger les données JSON
    const { quests, sourceFile } = await loadQuestJsonData();
    stats.total = quests.length;
    
    log('info', `🚀 Début de la migration de ${stats.total} quêtes...`);
    
    // Migrer chaque quête
    for (let i = 0; i < quests.length; i++) {
      const quest = quests[i];
      const progress = `[${i + 1}/${stats.total}]`;
      
      log('info', `${progress} Traitement: ${quest.name || quest.id}`);
      
      const result = await migrateQuest(quest, sourceFile);
      
      if (result.success) {
        if (result.action === 'created') {
          stats.created++;
          log('success', `${progress} ✅ Créée: ${result.questId}`);
        } else {
          stats.updated++;
          log('success', `${progress} 🔄 Mise à jour: ${result.questId}`);
        }
      } else {
        stats.errors++;
        stats.errorDetails.push({
          questId: result.questId,
          error: result.error
        });
        log('error', `${progress} ❌ Erreur ${result.questId}: ${result.error}`);
      }
    }
    
    return stats;
    
  } catch (error) {
    log('error', 'Erreur durant la migration:', error.message);
    throw error;
  }
}

async function generateReport(stats) {
  log('info', '\n📊 === RAPPORT DE MIGRATION ===');
  log('info', `Total quêtes traitées: ${stats.total}`);
  log('success', `✅ Créées: ${stats.created}`);
  log('success', `🔄 Mises à jour: ${stats.updated}`);
  log('error', `❌ Erreurs: ${stats.errors}`);
  
  if (stats.errorDetails.length > 0) {
    log('warn', '\n⚠️ Détail des erreurs:');
    for (const error of stats.errorDetails) {
      log('warn', `  - ${error.questId}: ${error.error}`);
    }
  }
  
  // Vérification finale
  const totalInDb = await QuestData.countDocuments();
  log('info', `\n📈 Total quêtes en base après migration: ${totalInDb}`);
  
  // Exemples de quêtes migrées
  const sampleQuests = await QuestData.find().limit(3).select('questId name category');
  if (sampleQuests.length > 0) {
    log('info', '\n📋 Exemples de quêtes migrées:');
    for (const quest of sampleQuests) {
      log('info', `  - ${quest.questId}: ${quest.name} (${quest.category})`);
    }
  }
  
  log('success', '\n🎉 Migration terminée !');
}

// ===== FONCTION PRINCIPALE =====
async function main() {
  let exitCode = 0;
  
  try {
    log('info', '🚀 === DÉBUT MIGRATION QUÊTES JSON → MONGODB ===');
    log('info', `🎯 Base de données cible: ${MONGODB_URI}`);
    
    // Connexion MongoDB
    await connectToMongoDB();
    
    // Migration
    const stats = await performMigration();
    
    // Rapport
    await generateReport(stats);
    
    if (stats.errors > 0) {
      log('warn', `⚠️ Migration terminée avec ${stats.errors} erreur(s)`);
      exitCode = 1;
    } else {
      log('success', '✅ Migration terminée avec succès !');
    }
    
  } catch (error) {
    log('error', '💥 Erreur fatale durant la migration:', error.message);
    console.error(error.stack);
    exitCode = 2;
  } finally {
    // Fermer la connexion MongoDB
    if (mongoose.connection.readyState === 1) {
      log('info', '🔌 Fermeture connexion MongoDB...');
      await mongoose.connection.close();
    }
    
    log('info', `🏁 Script terminé avec le code: ${exitCode}`);
    process.exit(exitCode);
  }
}

// ===== GESTION DES SIGNAUX =====
process.on('SIGINT', async () => {
  log('warn', '⚠️ Interruption détectée (Ctrl+C)');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(130);
});

process.on('SIGTERM', async () => {
  log('warn', '⚠️ Arrêt demandé (SIGTERM)');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(143);
});

// ===== LANCEMENT =====
if (require.main === module) {
  main();
}

module.exports = {
  main,
  connectToMongoDB,
  loadQuestJsonData,
  migrateQuest,
  QuestData
};
