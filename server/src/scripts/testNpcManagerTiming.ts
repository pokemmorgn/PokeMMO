#!/usr/bin/env ts-node
// server/src/scripts/testNpcManagerTiming.ts
// Test pour confirmer le problème de timing

import mongoose from "mongoose";
import { NpcManager } from "../managers/NPCManager";

async function testTiming() {
  console.log('⏰ Test timing NpcManager...');
  
  try {
    // 1. Connecter MongoDB
    await mongoose.connect('mongodb://localhost:27017/pokemmo');
    console.log('✅ MongoDB connecté');
    
    // 2. Créer NpcManager (comme fait le serveur)
    console.log('🚀 Création NpcManager...');
    const npcManager = new NpcManager();
    
    // 3. Vérifier immédiatement après création
    console.log(`📊 Immédiatement après création: ${npcManager.getAllNpcs().length} NPCs`);
    
    // 4. Attendre un peu et revérifier
    console.log('⏳ Attente 2 secondes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`📊 Après 2 secondes: ${npcManager.getAllNpcs().length} NPCs`);
    
    // 5. Attendre encore et revérifier
    console.log('⏳ Attente 3 secondes de plus...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`📊 Après 5 secondes total: ${npcManager.getAllNpcs().length} NPCs`);
    
    // 6. Tester les méthodes
    if (npcManager.getAllNpcs().length > 0) {
      console.log('✅ Les NPCs sont maintenant chargés !');
      console.log(`🗺️  Zones chargées: ${npcManager.getLoadedZones().join(', ')}`);
      
      const firstNpc = npcManager.getAllNpcs()[0];
      console.log(`🤖 Premier NPC: ${firstNpc.name} (${firstNpc.type})`);
    } else {
      console.log('❌ Les NPCs ne se chargent toujours pas...');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testTiming();
