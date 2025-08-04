// server/src/scripts/renumber-npcs.ts
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

async function renumberAllNpcs() {
  try {
    console.log('🚀 [Renumber] Démarrage de la renumérotation globale des NPCs...');
    
    // 1. Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemon_game';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('npc_data');
    
    // 2. Supprimer l'ancien index unique qui bloque
    try {
      await collection.dropIndex({ zone: 1, npcId: 1 });
      console.log('✅ Index unique (zone + npcId) supprimé');
    } catch (error) {
      console.log('ℹ️ Index déjà supprimé ou non trouvé');
    }
    
    // 3. Récupérer TOUS les NPCs triés par zone puis par ancien ID
    const allNpcs = await collection.find({})
      .sort({ zone: 1, npcId: 1 }) // Tri par zone puis ID
      .toArray();
    
    console.log(`📊 ${allNpcs.length} NPCs trouvés à renuméroter`);
    
    if (allNpcs.length === 0) {
      console.log('⚠️ Aucun NPC trouvé dans la base de données');
      await mongoose.disconnect();
      return;
    }
    
    // 4. Afficher l'aperçu avant modification
    console.log('\n📋 Aperçu de la renumérotation :');
    console.log('Zone'.padEnd(15) + 'Nom'.padEnd(20) + 'Ancien ID'.padEnd(12) + 'Nouvel ID');
    console.log('-'.repeat(60));
    
    let newId = 1;
    for (const npc of allNpcs.slice(0, 10)) { // Afficher les 10 premiers
      console.log(
        (npc.zone || 'unknown').padEnd(15) + 
        (npc.name || 'unnamed').substring(0, 18).padEnd(20) + 
        String(npc.npcId).padEnd(12) + 
        String(newId)
      );
      newId++;
    }
    
    if (allNpcs.length > 10) {
      console.log('... et ' + (allNpcs.length - 10) + ' autres NPCs');
    }
    
    // 5. Demander confirmation (pour les tests)
    console.log(`\n🤔 Voulez-vous continuer la renumérotation de ${allNpcs.length} NPCs ?`);
    console.log('   Cette opération va assigner les IDs de 1 à ' + allNpcs.length);
    
    // En production, décommentez ces lignes pour demander confirmation :
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout
    // });
    // const answer = await new Promise(resolve => {
    //   readline.question('Tapez "oui" pour continuer : ', resolve);
    // });
    // readline.close();
    // 
    // if (answer !== 'oui') {
    //   console.log('❌ Opération annulée');
    //   await mongoose.disconnect();
    //   return;
    // }
    
    // 6. Renuméroter tous les NPCs
    console.log('\n🔄 Début de la renumérotation...');
    
    newId = 1;
    let updated = 0;
    
    for (const npc of allNpcs) {
      // Mettre à jour avec le nouvel ID séquentiel
      await collection.updateOne(
        { _id: npc._id },
        { $set: { npcId: newId } }
      );
      
      if (updated % 10 === 0 || updated < 20) {
        console.log(`🔄 ${npc.zone} - "${npc.name}": ${npc.npcId} → ${newId}`);
      }
      
      newId++;
      updated++;
      
      // Afficher le progrès tous les 50 NPCs
      if (updated % 50 === 0) {
        console.log(`📈 Progrès: ${updated}/${allNpcs.length} NPCs mis à jour`);
      }
    }
    
    console.log(`✅ ${updated} NPCs renumérotés avec succès !`);
    
    // 7. Créer les nouveaux index
    console.log('\n🔧 Création des nouveaux index...');
    
    await collection.createIndex({ npcId: 1 }, { unique: true });
    console.log('✅ Index unique global créé (npcId)');
    
    await collection.createIndex({ zone: 1, npcId: 1 });
    console.log('✅ Index de performance créé (zone + npcId)');
    
    // 8. Initialiser le compteur global
    console.log('\n🔢 Initialisation du compteur global...');
    
    await NpcCounter.findByIdAndUpdate(
      'npc_global_counter',
      { currentValue: allNpcs.length },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Compteur global initialisé à ${allNpcs.length}`);
    console.log(`   Prochain ID assigné : ${allNpcs.length + 1}`);
    
    // 9. Vérification finale
    console.log('\n🔍 Vérification finale...');
    
    const verification = await collection.aggregate([
      { $group: { _id: '$npcId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (verification.length === 0) {
      console.log('✅ Aucun doublon détecté - tous les IDs sont uniques !');
    } else {
      console.log('❌ Doublons détectés:', verification);
    }
    
    // 10. Résumé final
    console.log('\n🎉 RENUMÉROTATION TERMINÉE !');
    console.log(`📊 NPCs traités: ${updated}`);
    console.log(`🔢 IDs assignés: 1 à ${allNpcs.length}`);
    console.log(`🚀 Prochain ID libre: ${allNpcs.length + 1}`);
    console.log('✅ Index uniques créés');
    console.log('✅ Compteur global initialisé');
    
  } catch (error) {
    console.error('❌ Erreur durant la renumérotation:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion de MongoDB');
  }
}

// Exécuter le script
if (require.main === module) {
  renumberAllNpcs()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script échoué:', error);
      process.exit(1);
    });
}

export default renumberAllNpcs;
