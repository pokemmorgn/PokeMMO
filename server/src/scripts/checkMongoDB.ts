#!/usr/bin/env ts-node
// server/src/scripts/checkMongoDB.ts
// Script pour vérifier ce qu'il y a vraiment en MongoDB

import mongoose from "mongoose";

async function checkMongoDB() {
  console.log('🔍 Vérification MongoDB...');
  
  try {
    // 1. Se connecter
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemmo';
    await mongoose.connect(mongoUrl);
    console.log(`✅ Connecté à: ${mongoUrl}`);
    
    // 2. Lister toutes les collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Collections trouvées (${collections.length}):`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // 3. Vérifier spécifiquement npc_data
    const npcCollection = db.collection('npc_data');
    const npcCount = await npcCollection.countDocuments();
    console.log(`\n🤖 Collection 'npc_data': ${npcCount} documents`);
    
    if (npcCount > 0) {
      // 4. Afficher quelques exemples
      const samples = await npcCollection.find().limit(5).toArray();
      console.log(`\n📄 Exemples de documents:`);
      samples.forEach(doc => {
        console.log(`  - ID: ${doc.npcId}, Zone: ${doc.zone}, Nom: ${doc.name}, Type: ${doc.type}`);
      });
      
      // 5. Zones distinctes
      const zones = await npcCollection.distinct('zone');
      console.log(`\n🗺️  Zones distinctes (${zones.length}): ${zones.join(', ')}`);
    }
    
    // 6. Autres collections qui pourraient contenir des NPCs
    const otherCollections = ['npcs', 'npcdata', 'npc_datas'];
    for (const colName of otherCollections) {
      try {
        const col = db.collection(colName);
        const count = await col.countDocuments();
        if (count > 0) {
          console.log(`⚠️  Collection '${colName}': ${count} documents (peut-être les NPCs sont ici?)`);
        }
      } catch (e) {
        // Collection n'existe pas, normal
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMongoDB();
