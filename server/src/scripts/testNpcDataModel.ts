#!/usr/bin/env ts-node
// server/src/scripts/testNpcDataModel.ts
// Test si le modèle NpcData fonctionne

import mongoose from "mongoose";
import { NpcData } from "../models/NpcData";

async function testModel() {
  console.log('🧪 Test du modèle NpcData...');
  
  try {
    // 1. Connecter
    await mongoose.connect('mongodb://localhost:27017/pokemmo');
    console.log('✅ MongoDB connecté');
    
    // 2. Test findByZone (la méthode utilisée par NpcManager)
    console.log('🔍 Test NpcData.findByZone("road1")...');
    const npcs = await NpcData.findByZone('road1');
    console.log(`✅ Résultat: ${npcs.length} NPCs trouvés`);
    
    if (npcs.length > 0) {
      const firstNpc = npcs[0];
      console.log(`📄 Premier NPC: ${firstNpc.name} (ID: ${firstNpc.npcId})`);
      
      // 3. Test de conversion
      const npcFormat = firstNpc.toNpcFormat();
      console.log(`🔄 Conversion réussie: ${npcFormat.name} (${npcFormat.type})`);
    }
    
    // 4. Test distinct zones
    console.log('🔍 Test NpcData.distinct("zone")...');
    const zones = await NpcData.distinct('zone');
    console.log(`✅ Zones trouvées: ${zones.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Erreur modèle:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testModel();
