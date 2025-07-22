#!/usr/bin/env ts-node
// server/src/scripts/cleanupPokemmo.ts
// Supprimer les NPCs de l'ancienne base pokemmo

import mongoose from "mongoose";

async function cleanupPokemmo() {
  console.log('🧹 Nettoyage des NPCs dans pokemmo...');
  
  try {
    // 1. Se connecter à pokemmo
    const pokemmoMongo = mongoose.createConnection('mongodb://localhost:27017/pokemmo');
    await pokemmoMongo.asPromise();
    console.log('✅ Connecté à pokemmo');
    
    // 2. Compter d'abord
    const count = await pokemmoMongo.db.collection('npc_data').countDocuments();
    console.log(`📊 ${count} NPCs trouvés dans pokemmo`);
    
    if (count === 0) {
      console.log('ℹ️  Rien à supprimer !');
      await pokemmoMongo.close();
      return;
    }
    
    // 3. Supprimer tous les NPCs
    const result = await pokemmoMongo.db.collection('npc_data').deleteMany({});
    console.log(`🗑️  ${result.deletedCount} NPCs supprimés de pokemmo`);
    
    // 4. Vérifier
    const remainingCount = await pokemmoMongo.db.collection('npc_data').countDocuments();
    console.log(`🔍 Vérification: ${remainingCount} NPCs restants dans pokemmo`);
    
    if (remainingCount === 0) {
      console.log('✅ Nettoyage terminé avec succès !');
    } else {
      console.log('⚠️ Il reste encore des NPCs...');
    }
    
    // 5. Fermer connexion
    await pokemmoMongo.close();
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

cleanupPokemmo();
