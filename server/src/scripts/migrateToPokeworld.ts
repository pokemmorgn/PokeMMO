#!/usr/bin/env ts-node
// server/src/scripts/migrateToPokeworld.ts
// Migrer les NPCs de pokemmo vers pokeworld

import mongoose from "mongoose";

async function migrateToPokeworld() {
  console.log('🔄 Migration NPCs pokemmo → pokeworld...');
  
  try {
    // 1. Se connecter à pokemmo (source)
    const sourceMongo = mongoose.createConnection('mongodb://localhost:27017/pokemmo');
    await sourceMongo.asPromise();
    console.log('✅ Connecté à pokemmo (source)');
    
    // 2. Se connecter à pokeworld (destination)
    const destMongo = mongoose.createConnection('mongodb://localhost:27017/pokeworld');
    await destMongo.asPromise();
    console.log('✅ Connecté à pokeworld (destination)');
    
    // 3. Lire tous les NPCs de pokemmo
    const sourceNpcs = await sourceMongo.db.collection('npc_data').find({}).toArray();
    console.log(`📄 ${sourceNpcs.length} NPCs trouvés dans pokemmo`);
    
    if (sourceNpcs.length === 0) {
      console.log('❌ Aucun NPC à migrer !');
      return;
    }
    
    // 4. Nettoyer pokeworld d'abord
    const deleteResult = await destMongo.db.collection('npc_data').deleteMany({});
    console.log(`🧹 ${deleteResult.deletedCount} anciens NPCs supprimés de pokeworld`);
    
    // 5. Insérer dans pokeworld
    const insertResult = await destMongo.db.collection('npc_data').insertMany(sourceNpcs);
    console.log(`✅ ${insertResult.insertedCount} NPCs insérés dans pokeworld`);
    
    // 6. Vérifier
    const verifyCount = await destMongo.db.collection('npc_data').countDocuments();
    console.log(`🔍 Vérification: ${verifyCount} NPCs dans pokeworld`);
    
    // 7. Tester distinct zones
    const zones = await destMongo.db.collection('npc_data').distinct('zone');
    console.log(`🗺️ Zones dans pokeworld: ${zones.join(', ')}`);
    
    console.log('🎉 Migration terminée avec succès !');
    
    // 8. Fermer connexions
    await sourceMongo.close();
    await destMongo.close();
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
  }
}

migrateToPokeworld();
