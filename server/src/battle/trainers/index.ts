// server/src/battle/trainers/index.ts
// 🎯 EXPORT CENTRAL MODULE COMBATS DRESSEURS + EXEMPLE D'UTILISATION

// === EXPORTS PRINCIPAUX ===

// Types et interfaces
export * from '../types/TrainerBattleTypes';

// Manager principal
export { TrainerTeamManager } from '../managers/TrainerTeamManager';
export type { BattleTeamState, SwitchValidation, TeamAnalysis } from '../managers/TrainerTeamManager';

// Helpers et utilities
export { TrainerBattleHelpers } from '../helpers/TrainerBattleHelpers';

// === EXEMPLE D'UTILISATION COMPLÈTE ===

import { TrainerTeamManager } from '../managers/TrainerTeamManager';
import { 
  TrainerData,
  TrainerBattleConfig,
  createTrainerBattleConfig
} from '../types/TrainerBattleTypes';
import { 
  createSimpleTrainer, 
  createGymLeader
} from '../helpers/TrainerBattleHelpers';

/**
 * 🎮 EXEMPLE COMPLET D'UTILISATION DU SYSTÈME DRESSEURS
 */
async function exampleTrainerBattleSetup(): Promise<{
  playerTeamManager: TrainerTeamManager;
  trainerData: TrainerData;
  battleConfig: TrainerBattleConfig;
  setupSuccess: boolean;
}> {
  
  console.log('🎯 [Exemple] Démonstration du système de combat dresseurs...');
  
  try {
    // === 1. SETUP ÉQUIPE JOUEUR ===
    console.log('👤 [Exemple] Configuration équipe joueur...');
    
    const playerTeamManager = new TrainerTeamManager('test_player');
    
    // Pour l'exemple, on crée une équipe directement
    const playerPokemon = [
      {
        id: 25, combatId: 'player_pikachu', name: 'Pikachu', level: 20,
        currentHp: 70, maxHp: 70, attack: 55, defense: 40, specialAttack: 50,
        specialDefense: 50, speed: 90, types: ['electric'], moves: ['thunderbolt', 'quick_attack'],
        status: 'normal', gender: 'male', shiny: false, isWild: false
      },
      {
        id: 4, combatId: 'player_charmander', name: 'Charmander', level: 18,
        currentHp: 65, maxHp: 65, attack: 52, defense: 43, specialAttack: 60,
        specialDefense: 50, speed: 65, types: ['fire'], moves: ['ember', 'scratch'],
        status: 'normal', gender: 'male', shiny: false, isWild: false
      }
    ];
    
    playerTeamManager.initializeWithPokemon(playerPokemon);
    console.log(`✅ [Exemple] Équipe joueur: ${playerPokemon.length} Pokémon`);
    
    // === 2. CREATION DRESSEUR ADVERSAIRE ===
    console.log('🤖 [Exemple] Création dresseur adversaire...');
    
    const trainerData = createGymLeader(
      'gym_brock',
      'Pierre', 
      'rock',
      2, // 2 Pokémon
      22  // Niveau moyen
    );
    
    console.log(`✅ [Exemple] Dresseur créé: ${trainerData.name} (${trainerData.trainerClass})`);
    console.log(`    Spécialité: Type ${trainerData.pokemon[0].types[0]}`);
    console.log(`    Équipe: ${trainerData.pokemon.length} Pokémon niveau ${trainerData.level}`);
    
    // === 3. CONFIGURATION COMBAT ===
    console.log('⚔️ [Exemple] Configuration du combat dresseur...');
    
    const battleConfig = createTrainerBattleConfig(
      'test_session_123',
      'TestPlayer',
      playerPokemon,
      trainerData
    );
    
    console.log(`✅ [Exemple] Combat configuré: ${battleConfig.type}`);
    console.log(`    Joueur: ${battleConfig.player1.name}`);
    console.log(`    Dresseur: ${battleConfig.trainer.name}`);
    console.log(`    Règles: Changements ${battleConfig.rules.allowSwitching ? 'autorisés' : 'interdits'}`);
    
    // === 4. ANALYSE ÉQUIPES ===
    console.log('📊 [Exemple] Analyse des équipes...');
    
    const playerAnalysis = playerTeamManager.analyzeTeam();
    console.log(`    Équipe joueur - ${playerAnalysis.alivePokemon}/${playerAnalysis.totalPokemon} vivants`);
    console.log(`    Plus fort: ${playerAnalysis.strongestPokemon?.name} (ATK: ${playerAnalysis.strongestPokemon?.attack})`);
    console.log(`    Plus rapide: ${playerAnalysis.fastestPokemon?.name} (SPE: ${playerAnalysis.fastestPokemon?.speed})`);
    
    // === 5. SIMULATION CHANGEMENT ===
    console.log('🔄 [Exemple] Test système de changement...');
    
    const activePokemon = playerTeamManager.getActivePokemon();
    console.log(`    Pokémon actif: ${activePokemon?.name}`);
    
    const switchValidation = playerTeamManager.validateSwitch(0, 1, 1, false);
    console.log(`    Changement 0→1 valide: ${switchValidation.isValid}`);
    if (switchValidation.isValid) {
      const switchSuccess = playerTeamManager.executeSwitch(0, 1, 1, false);
      console.log(`    Changement exécuté: ${switchSuccess}`);
      const newActive = playerTeamManager.getActivePokemon();
      console.log(`    Nouveau actif: ${newActive?.name}`);
    }
    
    // === 6. INTÉGRATION IA (PREVIEW) ===
    console.log('🧠 [Exemple] Aperçu intégration IA...');
    
    console.log(`    Profil IA dresseur: ${trainerData.aiProfile.difficulty}`);
    console.log(`    Stratégies: ${trainerData.aiProfile.strategies.length}`);
    console.log(`    Aggressivité: ${trainerData.aiProfile.aggressiveness}/100`);
    console.log(`    Intelligence: ${trainerData.aiProfile.intelligence}/100`);
    console.log(`    Mémoire: ${trainerData.aiProfile.memory ? 'Activée' : 'Désactivée'}`);
    
    // === 7. RÉCOMPENSES PREVIEW ===
    console.log('🎁 [Exemple] Aperçu système de récompenses...');
    
    console.log(`    Argent de base: ${trainerData.rewards.baseMoney}`);
    console.log(`    Multiplicateur: x${trainerData.rewards.moneyMultiplier}`);
    console.log(`    EXP de base: ${trainerData.rewards.baseExp}`);
    console.log(`    Objets possibles: ${trainerData.rewards.items?.length || 0}`);
    
    console.log('🎉 [Exemple] Configuration complète réussie !');
    
    return {
      playerTeamManager,
      trainerData,
      battleConfig,
      setupSuccess: true
    };
    
  } catch (error) {
    console.error('❌ [Exemple] Erreur configuration:', error);
    
    return {
      playerTeamManager: new TrainerTeamManager('error'),
      trainerData: createSimpleTrainer('error', 'Error', [{ id: 1, level: 1 }]),
      battleConfig: {} as TrainerBattleConfig,
      setupSuccess: false
    };
  }
}

/**
 * 🧪 EXEMPLE DE TEST RAPIDE
 */
async function quickTrainerBattleTest(): Promise<boolean> {
  console.log('🧪 [Test] Test rapide des modules dresseurs...');
  
  try {
    const { setupSuccess } = await exampleTrainerBattleSetup();
    
    if (setupSuccess) {
      console.log('✅ [Test] Tous les modules fonctionnent correctement !');
      console.log('🚀 [Test] Système prêt pour intégration avec BattleEngine');
      return true;
    } else {
      console.log('❌ [Test] Échec du test de configuration');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur durant le test:', error);
    return false;
  }
}

console.log('📚 [Module] Système combats dresseurs chargé et prêt !');
console.log('🎯 [Module] Prochaine étape: Intégration BattleEngine + SwitchManager');

// === EXPORT DE L'EXEMPLE POUR TESTS ===
export { exampleTrainerBattleSetup, quickTrainerBattleTest };
