#!/usr/bin/env ts-node
// server/src/scripts/simpleMigration.ts
// Migration ultra-simple : JSON → MongoDB

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { NpcData } from "../models/NpcData";

async function migrateRoad1() {
  console.log('🚀 Migration simple road1.json → MongoDB...');
  
  try {
    // 1. Connecter MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo');
    console.log('✅ MongoDB connecté');
    
    // 2. Lire road1.json
    const jsonPath = './server/src/data/npcs/road1.json';
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📄 Fichier lu: ${jsonData.npcs.length} NPCs`);
    
    // 3. Nettoyer la zone dans MongoDB
    await NpcData.deleteMany({ zone: 'road1' });
    console.log('🧹 Zone road1 nettoyée');
    
    // 4. Insérer chaque NPC
    let migratedCount = 0;
    for (const npcJson of jsonData.npcs) {
      try {
        await NpcData.createFromJson(npcJson, 'road1');
        migratedCount++;
        console.log(`  ✅ NPC ${npcJson.id}: ${npcJson.name}`);
      } catch (error) {
        console.log(`  ❌ NPC ${npcJson.id}: ${error}`);
      }
    }
    
    console.log(`\n🎉 Migration terminée: ${migratedCount}/${jsonData.npcs.length} NPCs migrés`);
    
    // 5. Vérifier
    const dbCount = await NpcData.countDocuments({ zone: 'road1' });
    console.log(`✅ Vérification: ${dbCount} NPCs en base`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter
migrateRoad1();
