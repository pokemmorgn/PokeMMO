#!/usr/bin/env ts-node
// server/src/scripts/diagnoseMongoDB.ts
// Diagnostic pour voir pourquoi NpcData.distinct('zone') retourne 0

import mongoose from "mongoose";
import { NpcData } from "../models/NpcData";

async function diagnose() {
  console.log('🔍 Diagnostic MongoDB pour zones NPCs...');
  
  try {
    // 1. Connecter
    await mongoose.connect('mongodb://localhost:27017/pokemmo');
    console.log('✅ MongoDB connecté');
    
    // 2. Vérifier collection directe
    const db = mongoose.connection.db;
    const npcCollection = db.collection('npc_data');
    const rawCount = await npcCollection.countDocuments();
    console.log(`📊 Documents bruts dans npc_data: ${rawCount}`);
    
    // 3. Regarder un document brut
    if (rawCount > 0) {
      const sample = await npcCollection.findOne();
      console.log('📄 Exemple de document brut:');
      console.log(JSON.stringify(sample, null, 2));
      
      // 4. Tester distinct sur collection brute
      const rawZones = await npcCollection.distinct('zone');
      console.log(`🗺️  Zones distinctes (collection brute): ${rawZones.length} = [${rawZones.join(', ')}]`);
    }
    
    // 5. Tester via modèle NpcData
    console.log('\n🧪 Test via modèle NpcData...');
    
    try {
      const modelCount = await NpcData.countDocuments();
      console.log(`📊 Documents via modèle: ${modelCount}`);
      
      const modelZones = await NpcData.distinct('zone');
      console.log(`🗺️  Zones distinctes (modèle): ${modelZones.length} = [${modelZones.join(', ')}]`);
      
      if (modelCount > 0) {
        const modelSample = await NpcData.findOne();
        console.log('📄 Exemple via modèle:');
        console.log(`- ID: ${modelSample.npcId}`);
        console.log(`- Zone: ${modelSample.zone}`);
        console.log(`- Nom: ${modelSample.name}`);
        console.log(`- Type: ${modelSample.type}`);
      }
      
    } catch (modelError) {
      console.error('❌ Erreur avec le modèle NpcData:', modelError);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

diagnose();
