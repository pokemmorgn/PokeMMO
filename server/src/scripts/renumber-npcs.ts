// server/src/scripts/migrate-to-global-ids.ts
import mongoose, { Schema } from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Schema pour le compteur global
const NpcCounterSchema = new Schema({
  _id: { type: String, required: true, default: 'npc_global_counter' },
  currentValue: { type: Number, default: 0 }
}, { collection: 'npc_counters' });

const NpcCounter = mongoose.model('NpcCounter', NpcCounterSchema);

async function migrateToGlobalIds() {
  try {
    console.log('🚀 [Migration] Démarrage migration vers IDs globaux...');
    
    // 1. Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('npc_data');
    
    // 2. ÉTAPE CRITIQUE: Supprimer tous les index problématiques
    console.log('\n🗑️ Suppression des index existants...');
    try {
      const indexes = await collection.listIndexes().toArray();
      console.log('📋 Index existants:', indexes.map(i => i.name));
      
      for (const index of indexes) {
        // Garder seulement l'index _id_ par défaut
        if (index.name !== '_id_') {
          try {
            await collection.dropIndex(index.name);
            console.log(`✅ Index "${index.name}" supprimé`);
          } catch (error) {
            console.log(`⚠️ Impossible de supprimer l'index "${index.name}":`, (error as Error).message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la suppression des index:', (error as Error).message);
    }
    
    // 3. Récupérer tous les NPCs et les renuméroter globalement
    console.log('\n📊 Récupération de tous les NPCs...');
    const allNpcs = await collection.find({})
      .sort({ zone: 1, npcId: 1 }) // Tri par zone puis ID pour cohérence
      .toArray();
    
    console.log(`📈 ${allNpcs.length} NPCs trouvés à renuméroter`);
    
    if (allNpcs.length === 0) {
      console.log('⚠️ Aucun NPC trouvé dans la base de données');
      await mongoose.disconnect();
      return;
    }
    
    // 4. Renuméroter avec des IDs globaux uniques
    console.log('\n🔄 Attribution des nouveaux IDs globaux...');
    
    let newGlobalId = 1;
    let updated = 0;
    
    for (const npc of allNpcs) {
      try {
        await collection.updateOne(
          { _id: npc._id },
          { $set: { npcId: newGlobalId } }
        );
        
        if (updated % 20 === 0 || updated < 50) {
          console.log(`🔄 ${npc.zone} - "${npc.name}": ${npc.npcId} → ${newGlobalId}`);
        }
        
        newGlobalId++;
        updated++;
        
        // Afficher le progrès tous les 100 NPCs
        if (updated % 100 === 0) {
          console.log(`📈 Progrès: ${updated}/${allNpcs.length} NPCs mis à jour`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur mise à jour NPC ${npc._id}:`, error);
      }
    }
    
    console.log(`✅ ${updated} NPCs renumérotés avec IDs globaux (1 à ${allNpcs.length})`);
    
    // 5. Créer les nouveaux index CORRECTS
    console.log('\n🔧 Création des nouveaux index...');
    
    // INDEX PRINCIPAL: npcId unique GLOBAL
    await collection.createIndex({ npcId: 1 }, { unique: true });
    console.log('✅ Index unique GLOBAL créé (npcId)');
    
    // INDEX PERFORMANCE: zone + npcId (non-unique)
    await collection.createIndex({ zone: 1, npcId: 1 });
    console.log('✅ Index performance créé (zone + npcId)');
    
    // Autres index de performance
    await collection.createIndex({ zone: 1, isActive: 1 });
    console.log('✅ Index performance créé (zone + isActive)');
    
    await collection.createIndex({ zone: 1, type: 1 });
    console.log('✅ Index performance créé (zone + type)');
    
    await collection.createIndex({ type: 1, isActive: 1 });
    console.log('✅ Index performance créé (type + isActive)');
    
    // 6. Initialiser le compteur global
    console.log('\n🔢 Initialisation du compteur global...');
    
    await NpcCounter.findByIdAndUpdate(
      'npc_global_counter',
      { currentValue: allNpcs.length },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Compteur global initialisé à ${allNpcs.length}`);
    console.log(`🎯 Prochain ID qui sera attribué : ${allNpcs.length + 1}`);
    
    // 7. Vérification finale
    console.log('\n🔍 Vérification finale...');
    
    // Vérifier qu'il n'y a pas de doublons
    const verification = await collection.aggregate([
      { $group: { _id: '$npcId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (verification.length === 0) {
      console.log('✅ Aucun doublon détecté - tous les IDs sont uniques GLOBALEMENT !');
    } else {
      console.log('❌ Doublons détectés:', verification);
    }
    
    // Vérifier la séquence
    const minMax = await collection.aggregate([
      { $group: { 
        _id: null, 
        min: { $min: '$npcId' }, 
        max: { $max: '$npcId' },
        count: { $sum: 1 }
      }}
    ]).toArray();
    
    if (minMax[0]) {
      const { min, max, count } = minMax[0];
      console.log(`📊 IDs: min=${min}, max=${max}, count=${count}`);
      
      if (min === 1 && max === count) {
        console.log('✅ Séquence parfaite : IDs de 1 à ' + count);
      } else {
        console.log('⚠️ Séquence non continue détectée');
      }
    }
    
    // 8. Test de création d'un nouveau NPC
    console.log('\n🧪 Test de création d\'un nouveau NPC...');
    const testNpc = {
      npcId: allNpcs.length + 1, // Le prochain ID
      zone: 'test_zone',
      name: 'Test NPC Migration',
      type: 'dialogue',
      position: { x: 0, y: 0 },
      sprite: 'npc_default',
      direction: 'south',
      isActive: true
    };
    
    try {
      const insertResult = await collection.insertOne(testNpc);
      console.log(`✅ Test NPC créé avec ID ${testNpc.npcId} (_id: ${insertResult.insertedId})`);
      
      // Supprimer le NPC de test
      await collection.deleteOne({ _id: insertResult.insertedId });
      console.log('✅ Test NPC supprimé');
      
    } catch (error) {
      console.error('❌ Erreur test création NPC:', error);
    }
    
    // 9. Résumé final
    console.log('\n🎉 MIGRATION VERS IDs GLOBAUX TERMINÉE !');
    console.log(`📊 NPCs traités: ${updated}`);
    console.log(`🔢 IDs globaux: 1 à ${allNpcs.length}`);
    console.log(`🚀 Prochain ID libre: ${allNpcs.length + 1}`);
    console.log('✅ Index uniques GLOBAUX créés');
    console.log('✅ Compteur global initialisé');
    console.log('✅ Système prêt pour création automatique avec IDs globaux uniques');
    
    console.log('\n📝 IMPORTANT:');
    console.log('- Les IDs sont maintenant GLOBAUX et UNIQUES pour tous les NPCs');
    console.log('- Le système attribuera automatiquement le prochain ID libre');
    console.log('- Plus de conflit entre zones');
    console.log('- Le compteur s\'incrémente automatiquement à chaque création');
    
  } catch (error) {
    console.error('❌ Erreur durant la migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion de MongoDB');
  }
}

// Exécuter le script
if (require.main === module) {
  migrateToGlobalIds()
    .then(() => {
      console.log('✅ Script de migration terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script de migration échoué:', error);
      process.exit(1);
    });
}

export default migrateToGlobalIds;
