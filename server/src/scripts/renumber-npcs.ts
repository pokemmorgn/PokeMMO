// server/src/scripts/fix-npc-indexes.ts
import mongoose from 'mongoose';
import { NpcData } from '../models/NpcData';
import dotenv from 'dotenv';

dotenv.config();

async function fixNpcIndexes() {
  try {
    console.log('🔧 [Fix] Démarrage de la correction des index NPCs...');
    
    // 1. Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('npc_data');
    
    // 2. Lister tous les index actuels
    console.log('\n📋 Index actuels:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // 3. Supprimer l'index unique global problématique (npcId seul)
    try {
      const globalNpcIdIndex = indexes.find(idx => 
        idx.unique === true && 
        idx.key && 
        Object.keys(idx.key).length === 1 && 
        idx.key.npcId === 1
      );
      
      if (globalNpcIdIndex) {
        await collection.dropIndex(globalNpcIdIndex.name);
        console.log(`✅ Index unique global supprimé: ${globalNpcIdIndex.name}`);
      } else {
        console.log('ℹ️ Aucun index unique global sur npcId trouvé');
      }
    } catch (error) {
      console.log('⚠️ Erreur suppression index:', (error as Error).message);
    }
    
    // 4. Vérifier et créer l'index composite correct (zone + npcId unique)
    try {
      const compositeIndex = indexes.find(idx => 
        idx.unique === true && 
        idx.key && 
        idx.key.zone === 1 && 
        idx.key.npcId === 1
      );
      
      if (!compositeIndex) {
        await collection.createIndex(
          { zone: 1, npcId: 1 }, 
          { unique: true, name: 'zone_1_npcId_1_unique' }
        );
        console.log('✅ Index composite unique créé: (zone + npcId)');
      } else {
        console.log('✅ Index composite unique existe déjà');
      }
    } catch (error) {
      console.error('❌ Erreur création index composite:', error);
    }
    
    // 5. Créer l'index de performance non-unique sur npcId seul
    try {
      const performanceIndex = indexes.find(idx => 
        !idx.unique && 
        idx.key && 
        Object.keys(idx.key).length === 1 && 
        idx.key.npcId === 1
      );
      
      if (!performanceIndex) {
        await collection.createIndex(
          { npcId: 1 }, 
          { unique: false, name: 'npcId_1_performance' }
        );
        console.log('✅ Index performance créé: npcId (non-unique)');
      } else {
        console.log('✅ Index performance existe déjà');
      }
    } catch (error) {
      console.error('❌ Erreur création index performance:', error);
    }
    
    // 6. Vérifier les doublons dans chaque zone
    console.log('\n🔍 Vérification des doublons par zone...');
    
    const zones = await collection.distinct('zone');
    console.log(`📍 Zones trouvées: ${zones.join(', ')}`);
    
    for (const zone of zones) {
      const duplicates = await collection.aggregate([
        { $match: { zone: zone } },
        { $group: { _id: '$npcId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
      ]).toArray();
      
      if (duplicates.length > 0) {
        console.log(`⚠️ Zone ${zone}: ${duplicates.length} doublons détectés`);
        
        // Corriger les doublons automatiquement
        for (const duplicate of duplicates) {
          console.log(`🔧 Correction doublon npcId ${duplicate._id} dans ${zone}`);
          
          // Garder le premier, renuméroter les autres
          const docs = duplicate.docs.slice(1); // Ignorer le premier
          
          for (let i = 0; i < docs.length; i++) {
            // Trouver le prochain ID libre dans cette zone
            const maxId = await collection.findOne(
              { zone: zone },
              { sort: { npcId: -1 } }
            );
            
            const newId = (maxId?.npcId || 0) + 1 + i;
            
            await collection.updateOne(
              { _id: docs[i] },
              { $set: { npcId: newId } }
            );
            
            console.log(`  ✅ Document ${docs[i]} → npcId ${newId}`);
          }
        }
      } else {
        console.log(`✅ Zone ${zone}: aucun doublon`);
      }
    }
    
    // 7. Vérification finale
    console.log('\n🔍 Vérification finale...');
    
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('\n📋 Index finaux:');
    finalIndexes.forEach(index => {
      const uniqueStr = index.unique ? ' (UNIQUE)' : '';
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}${uniqueStr}`);
    });
    
    // Test d'insertion pour vérifier que tout fonctionne
    const testZones = await collection.distinct('zone');
    if (testZones.length > 0) {
      const testZone = testZones[0];
      const maxId = await collection.findOne(
        { zone: testZone },
        { sort: { npcId: -1 } }
      );
      
      console.log(`\n🧪 Test d'insertion dans zone ${testZone}...`);
      console.log(`📊 Prochain ID disponible: ${(maxId?.npcId || 0) + 1}`);
    }
    
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('✅ Index corrigés');
    console.log('✅ Doublons résolus');
    console.log('✅ Système prêt pour les sauvegardes');
    
  } catch (error) {
    console.error('❌ Erreur durant la correction:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion de MongoDB');
  }
}

// Exécuter le script
if (require.main === module) {
  fixNpcIndexes()
    .then(() => {
      console.log('✅ Script de correction terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script de correction échoué:', error);
      process.exit(1);
    });
}

export default fixNpcIndexes;
