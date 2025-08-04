// server/src/scripts/restore-indexes.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function restoreOriginalIndexes() {
  try {
    console.log('🔧 Restauration des index originaux...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemon_game';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('npc_data');
    
    // 1. Supprimer TOUS les index (sauf _id)
    console.log('🗑️ Suppression de tous les index...');
    try {
      await collection.dropIndexes();
      console.log('✅ Tous les index supprimés');
    } catch (error) {
      console.log('ℹ️ Erreur suppression index:', (error as Error).message);
    }
    
    // 2. Recréer les index ORIGINAUX (ceux qui marchaient avant)
    console.log('🔨 Recréation des index originaux...');
    
    // Index original qui permettait les doublons par zone (mais qui marchait)
    await collection.createIndex({ zone: 1, npcId: 1 }, { unique: true });
    console.log('✅ Index principal restauré: { zone: 1, npcId: 1 } unique');
    
    // Autres index de performance
    await collection.createIndex({ zone: 1, isActive: 1 });
    await collection.createIndex({ zone: 1, type: 1 });
    await collection.createIndex({ type: 1, isActive: 1 });
    await collection.createIndex({ shopId: 1 });
    await collection.createIndex({ zone: 1, shopId: 1 });
    
    console.log('✅ Index de performance restaurés');
    
    // 3. Vérifier les index
    const indexes = await collection.listIndexes().toArray();
    console.log('📋 Index actuels:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });
    
    console.log('\n🎉 Index originaux restaurés !');
    console.log('ℹ️ Vous pouvez maintenant recréer vos NPCs');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

restoreOriginalIndexes();
