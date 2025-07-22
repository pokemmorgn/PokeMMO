#!/usr/bin/env ts-node
// server/src/scripts/fixMigration.ts
// Corrige la migration en ajoutant isActive: true

import mongoose from "mongoose";

async function fixMigration() {
  console.log('🔧 Correction migration - Ajout isActive: true...');
  
  try {
    // 1. Connecter MongoDB
    await mongoose.connect('mongodb://localhost:27017/pokemmo');
    console.log('✅ MongoDB connecté');
    
    // 2. Mettre à jour tous les NPCs pour ajouter isActive: true
    const db = mongoose.connection.db;
    const result = await db.collection('npc_data').updateMany(
      {}, // Tous les documents
      { $set: { isActive: true } } // Ajouter isActive: true
    );
    
    console.log(`✅ ${result.modifiedCount} NPCs mis à jour avec isActive: true`);
    
    // 3. Vérifier
    const activeCount = await db.collection('npc_data').countDocuments({ isActive: true });
    console.log(`✅ Vérification: ${activeCount} NPCs actifs trouvés`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixMigration();
