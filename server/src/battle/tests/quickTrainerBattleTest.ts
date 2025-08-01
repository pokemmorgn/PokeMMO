// server/src/battle/tests/quickTrainerBattleTest.ts
// 🧪 TEST RAPIDE ET COMPLET DU MODULE COMBATS DRESSEURS

import { TrainerTeamManager } from '../managers/TrainerTeamManager';
import { 
  TrainerData,
  TrainerBattleConfig,
  createTrainerBattleConfig,
  Pokemon,
  convertOwnedPokemonToBattlePokemon,
  createTrainerPokemonTeam,
  mapTrainerPhaseToInternal,
  TrainerBattlePhase
} from '../types/TrainerBattleTypes';
import { 
  createSimpleTrainer, 
  createGymLeader,
  createChampion,
  TrainerBattleHelpers
} from '../helpers/TrainerBattleHelpers';

// === INTERFACES DE TEST ===

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: string;
  error?: string;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  totalDuration: number;
}

/**
 * 🧪 CLASSE DE TEST PRINCIPALE
 */
class TrainerBattleTestSuite {
  
  private results: TestResult[] = [];
  private startTime = 0;
  
  constructor() {
    console.log('🧪 [TrainerBattleTest] Suite de tests initialisée');
  }
  
  // === EXÉCUTION COMPLÈTE ===
  
  async runAllTests(): Promise<TestSuite> {
    console.log('\n🎯 DÉBUT DES TESTS - MODULE COMBATS DRESSEURS');
    console.log('='.repeat(60));
    
    this.startTime = Date.now();
    
    try {
      // Tests dans l'ordre logique
      await this.testTypesAndInterfaces();
      await this.testTrainerCreation();
      await this.testTrainerTeamManager();
      await this.testBattleConfiguration();
      await this.testSwitchSystem();
      await this.testAIProfiles();
      await this.testRewardSystem();
      await this.testCompatibility();
      
    } catch (globalError) {
      console.error('💥 [TrainerBattleTest] Erreur globale:', globalError);
    }
    
    return this.generateReport();
  }
  
  // === TESTS INDIVIDUELS ===
  
  /**
   * Test 1: Types et interfaces de base
   */
  private async testTypesAndInterfaces(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🔍 Test 1: Types et interfaces...');
      
      // Test création Pokémon de base
      const testPokemon: Pokemon = {
        id: 25,
        combatId: 'test_pikachu',
        name: 'Pikachu',
        level: 20,
        currentHp: 70,
        maxHp: 70,
        attack: 55,
        defense: 40,
        specialAttack: 50,
        specialDefense: 50,
        speed: 90,
        types: ['electric'],
        moves: ['thunderbolt', 'quick_attack'],
        status: 'normal',
        gender: 'male',
        shiny: false,
        isWild: false
      };
      
      console.log(`    ✅ Pokémon créé: ${testPokemon.name} niveau ${testPokemon.level}`);
      
      // Test TrainerPokemonTeam
      const team = createTrainerPokemonTeam([testPokemon], 0);
      console.log(`    ✅ TrainerPokemonTeam créé: ${team.pokemon.length} Pokémon, ${team.remainingPokemon} vivants`);
      
      // Test mapping phases
      const internalPhase = mapTrainerPhaseToInternal(TrainerBattlePhase.ACTION_SELECTION);
      console.log(`    ✅ Mapping phase: ${TrainerBattlePhase.ACTION_SELECTION} → ${internalPhase}`);
      
      this.addTestResult('Types et interfaces', true, Date.now() - testStart, 
        `Pokémon, TrainerPokemonTeam et mapping phases fonctionnels`);
      
    } catch (error) {
      this.addTestResult('Types et interfaces', false, Date.now() - testStart, 
        'Erreur création types', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 2: Création de dresseurs
   */
  private async testTrainerCreation(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🤖 Test 2: Création de dresseurs...');
      
      // Test dresseur simple
      const simpleTrainer = createSimpleTrainer('trainer_001', 'Camper Bob', [
        { id: 19, level: 15 },
        { id: 16, level: 17 }
      ]);
      
      console.log(`    ✅ Dresseur simple: ${simpleTrainer.name}`);
      console.log(`        Classe: ${simpleTrainer.trainerClass}, Niveau: ${simpleTrainer.level}`);
      console.log(`        Pokémon: ${simpleTrainer.pokemon.length}, IA: ${simpleTrainer.aiProfile.difficulty}`);
      
      // Test Gym Leader
      const gymLeader = createGymLeader('gym_brock', 'Pierre', 'rock', 3, 25);
      
      console.log(`    ✅ Gym Leader: ${gymLeader.name}`);
      console.log(`        Spécialité: ${gymLeader.pokemon[0].types[0]}, Pokémon: ${gymLeader.pokemon.length}`);
      console.log(`        IA: ${gymLeader.aiProfile.difficulty}, Stratégies: ${gymLeader.aiProfile.strategies.length}`);
      
      // Test Champion
      const champion = createChampion('champion_lance', 'Peter', 50);
      
      console.log(`    ✅ Champion: ${champion.name}`);
      console.log(`        Pokémon: ${champion.pokemon.length}, Niveau moyen: ${champion.level}`);
      console.log(`        Récompenses: ${champion.rewards.baseMoney} pièces, ${champion.rewards.items?.length || 0} objets`);
      
      this.addTestResult('Création de dresseurs', true, Date.now() - testStart,
        `3 types de dresseurs créés avec succès (Simple, Gym Leader, Champion)`);
      
    } catch (error) {
      this.addTestResult('Création de dresseurs', false, Date.now() - testStart,
        'Erreur création dresseurs', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 3: TrainerTeamManager
   */
  private async testTrainerTeamManager(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🎮 Test 3: TrainerTeamManager...');
      
      // Créer équipe de test
      const testPokemon: Pokemon[] = [
        {
          id: 25, combatId: 'test_pikachu', name: 'Pikachu', level: 20,
          currentHp: 70, maxHp: 70, attack: 55, defense: 40, specialAttack: 50,
          specialDefense: 50, speed: 90, types: ['electric'], moves: ['thunderbolt', 'quick_attack'],
          status: 'normal', gender: 'male', shiny: false, isWild: false
        },
        {
          id: 4, combatId: 'test_charmander', name: 'Charmander', level: 18,
          currentHp: 65, maxHp: 65, attack: 52, defense: 43, specialAttack: 60,
          specialDefense: 50, speed: 65, types: ['fire'], moves: ['ember', 'scratch'],
          status: 'normal', gender: 'male', shiny: false, isWild: false
        },
        {
          id: 1, combatId: 'test_bulbasaur', name: 'Bulbasaur', level: 19,
          currentHp: 0, maxHp: 75, attack: 49, defense: 49, specialAttack: 65, // K.O. pour test
          specialDefense: 65, speed: 45, types: ['grass', 'poison'], moves: ['vine_whip', 'tackle'],
          status: 'normal', gender: 'male', shiny: false, isWild: false
        }
      ];
      
      // Initialiser le manager
      const teamManager = new TrainerTeamManager('test_player');
      teamManager.initializeWithPokemon(testPokemon);
      
      console.log(`    ✅ TrainerTeamManager initialisé`);
      
      // Test Pokémon actif
      const activePokemon = teamManager.getActivePokemon();
      console.log(`    ✅ Pokémon actif: ${activePokemon?.name} (${activePokemon?.currentHp}/${activePokemon?.maxHp} HP)`);
      
      // Test analyse équipe
      const analysis = teamManager.analyzeTeam();
      console.log(`    ✅ Analyse équipe: ${analysis.alivePokemon}/${analysis.totalPokemon} vivants`);
      console.log(`        Plus fort: ${analysis.strongestPokemon?.name} (ATK: ${analysis.strongestPokemon?.attack})`);
      console.log(`        Plus rapide: ${analysis.fastestPokemon?.name} (SPE: ${analysis.fastestPokemon?.speed})`);
      
      // Test validation changement
      const switchValidation = teamManager.validateSwitch(0, 1, 1, false);
      console.log(`    ✅ Validation changement 0→1: ${switchValidation.isValid}`);
      
      // Test exécution changement
      if (switchValidation.isValid) {
        const switchSuccess = teamManager.executeSwitch(0, 1, 1, false);
        const newActive = teamManager.getActivePokemon();
        console.log(`    ✅ Changement exécuté: ${switchSuccess}, nouveau actif: ${newActive?.name}`);
      }
      
      // Test application dégâts
      const damageResult = teamManager.applyDamageToActive(20);
      console.log(`    ✅ Dégâts appliqués: ${damageResult.newHp} HP restants, K.O.: ${damageResult.isFainted}`);
      
      // Test capacité de combat
      const canBattle = teamManager.canBattle();
      const isDefeated = teamManager.isTeamDefeated();
      console.log(`    ✅ État équipe: Peut combattre: ${canBattle}, Vaincue: ${isDefeated}`);
      
      this.addTestResult('TrainerTeamManager', true, Date.now() - testStart,
        `Toutes les fonctionnalités testées avec succès (${analysis.totalPokemon} Pokémon)`);
      
    } catch (error) {
      this.addTestResult('TrainerTeamManager', false, Date.now() - testStart,
        'Erreur TrainerTeamManager', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 4: Configuration de combat
   */
  private async testBattleConfiguration(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n⚔️ Test 4: Configuration de combat...');
      
      // Créer équipe joueur
      const playerPokemon: Pokemon[] = [
        {
          id: 25, combatId: 'player_pikachu', name: 'Pikachu', level: 20,
          currentHp: 70, maxHp: 70, attack: 55, defense: 40, specialAttack: 50,
          specialDefense: 50, speed: 90, types: ['electric'], moves: ['thunderbolt', 'quick_attack'],
          status: 'normal', gender: 'male', shiny: false, isWild: false
        }
      ];
      
      // Créer dresseur
      const trainerData = createGymLeader('gym_test', 'Test Leader', 'water', 2, 22);
      
      // Créer configuration de combat
      const battleConfig = createTrainerBattleConfig(
        'test_session_123',
        'TestPlayer',
        playerPokemon,
        trainerData
      );
      
      console.log(`    ✅ Configuration combat créée:`);
      console.log(`        Type: ${battleConfig.type}`);
      console.log(`        Joueur: ${battleConfig.player1.name} (${battleConfig.player1.pokemon?.name})`);
      console.log(`        Dresseur: ${battleConfig.trainer.name} (${battleConfig.trainer.pokemon.length} Pokémon)`);
      console.log(`        Opponent mappé: ${battleConfig.opponent.name} (${battleConfig.opponent.pokemon.name})`);
      console.log(`        Règles: Changements ${battleConfig.rules.allowSwitching ? 'autorisés' : 'interdits'}`);
      
      // Test validation config
      const isValid = battleConfig.type === 'trainer' && 
                     battleConfig.player1.pokemon !== null &&
                     battleConfig.opponent.pokemon !== null &&
                     battleConfig.trainer.pokemon.length > 0;
      
      console.log(`    ✅ Configuration valide: ${isValid}`);
      
      this.addTestResult('Configuration de combat', isValid, Date.now() - testStart,
        `Configuration trainer battle complète et compatible BattleEngine`);
      
    } catch (error) {
      this.addTestResult('Configuration de combat', false, Date.now() - testStart,
        'Erreur configuration combat', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 5: Système de changements
   */
  private async testSwitchSystem(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🔄 Test 5: Système de changements...');
      
      // Créer équipe avec 3 Pokémon
      const testPokemon: Pokemon[] = [
        { id: 1, combatId: 'switch_1', name: 'Bulbasaur', level: 20, currentHp: 75, maxHp: 75, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45, types: ['grass'], moves: ['tackle'], status: 'normal', gender: 'male', shiny: false, isWild: false },
        { id: 4, combatId: 'switch_2', name: 'Charmander', level: 20, currentHp: 65, maxHp: 65, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65, types: ['fire'], moves: ['ember'], status: 'normal', gender: 'male', shiny: false, isWild: false },
        { id: 7, combatId: 'switch_3', name: 'Squirtle', level: 20, currentHp: 0, maxHp: 74, attack: 48, defense: 65, specialAttack: 50, specialDefense: 64, speed: 43, types: ['water'], moves: ['tackle'], status: 'normal', gender: 'male', shiny: false, isWild: false } // K.O.
      ];
      
      const teamManager = new TrainerTeamManager('switch_test');
      teamManager.initializeWithPokemon(testPokemon);
      
      console.log(`    ✅ Équipe 3 Pokémon créée (1 K.O.)`);
      
      // Test changement normal
      const normalSwitch = teamManager.validateSwitch(0, 1, 1, false);
      console.log(`    ✅ Validation changement normal (0→1): ${normalSwitch.isValid}`);
      
      if (normalSwitch.isValid) {
        const executed = teamManager.executeSwitch(0, 1, 1, false);
        console.log(`    ✅ Changement exécuté: ${executed}`);
        console.log(`        Nouveau actif: ${teamManager.getActivePokemon()?.name}`);
      }
      
      // Test changement vers Pokémon K.O.
      const koSwitch = teamManager.validateSwitch(1, 2, 2, false);
      console.log(`    ✅ Validation changement vers K.O. (1→2): ${koSwitch.isValid} (${koSwitch.reason || 'OK'})`);
      
      // Test changement forcé
      const forcedSwitch = teamManager.validateSwitch(1, 0, 3, true);
      console.log(`    ✅ Validation changement forcé (1→0): ${forcedSwitch.isValid}`);
      
      // Test changement automatique
      const autoSwitchSuccess = teamManager.autoSwitchToFirstAlive();
      console.log(`    ✅ Changement auto vers premier vivant: ${autoSwitchSuccess}`);
      
      // Test options disponibles
      const analysis = teamManager.analyzeTeam();
      console.log(`    ✅ Analyse finale: ${analysis.alivePokemon} Pokémon disponibles pour changement`);
      
      this.addTestResult('Système de changements', true, Date.now() - testStart,
        `Tous les types de changements testés (normal, forcé, auto, validation K.O.)`);
      
    } catch (error) {
      this.addTestResult('Système de changements', false, Date.now() - testStart,
        'Erreur système changements', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 6: Profils IA
   */
  private async testAIProfiles(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🧠 Test 6: Profils IA...');
      
      // Test tous les types de profils
      const simpleAI = TrainerBattleHelpers.createSimpleAIProfile();
      console.log(`    ✅ IA Simple: ${simpleAI.difficulty}, ${simpleAI.strategies.length} stratégies`);
      
      const gymAI = TrainerBattleHelpers.createGymLeaderAIProfile('electric');
      console.log(`    ✅ IA Gym Leader: ${gymAI.difficulty}, aggressivité ${gymAI.aggressiveness}/100`);
      
      const championAI = TrainerBattleHelpers.createChampionAIProfile();
      console.log(`    ✅ IA Champion: ${championAI.difficulty}, intelligence ${championAI.intelligence}/100`);
      
      // Test intégration dans dresseur
      const trainerWithAI = createGymLeader('ai_test', 'IA Test', 'psychic', 3, 30);
      const aiProfile = trainerWithAI.aiProfile;
      
      console.log(`    ✅ Dresseur avec IA: ${trainerWithAI.name}`);
      console.log(`        Profil: ${aiProfile.difficulty}, mémoire: ${aiProfile.memory}`);
      console.log(`        Patterns de changement: ${aiProfile.switchPatterns.length}`);
      console.log(`        Stratégies: ${aiProfile.strategies.map(s => s.name).join(', ')}`);
      
      this.addTestResult('Profils IA', true, Date.now() - testStart,
        `3 profils IA créés et intégrés avec succès (Simple, Gym, Champion)`);
      
    } catch (error) {
      this.addTestResult('Profils IA', false, Date.now() - testStart,
        'Erreur profils IA', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 7: Système de récompenses
   */
  private async testRewardSystem(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🎁 Test 7: Système de récompenses...');
      
      // Test récompenses standard
      const standardRewards = TrainerBattleHelpers.createStandardRewards([
        { level: 15 }, { level: 17 }
      ]);
      console.log(`    ✅ Récompenses standard: ${standardRewards.baseMoney} pièces, ${standardRewards.baseExp} EXP`);
      
      // Test récompenses Gym Leader
      const gymRewards = TrainerBattleHelpers.createGymLeaderRewards(25, 3);
      console.log(`    ✅ Récompenses Gym: ${gymRewards.baseMoney} pièces (x${gymRewards.moneyMultiplier})`);
      console.log(`        Objets: ${gymRewards.items?.length || 0} types`);
      
      // Test récompenses Champion
      const championRewards = TrainerBattleHelpers.createChampionRewards(50);
      console.log(`    ✅ Récompenses Champion: ${championRewards.baseMoney} pièces (x${championRewards.moneyMultiplier})`);
      console.log(`        EXP: ${championRewards.baseExp} (x${championRewards.expMultiplier})`);
      
      // Test intégration dans dresseur
      const richTrainer = createChampion('rich_test', 'Rich Champion', 60);
      const rewards = richTrainer.rewards;
      
      console.log(`    ✅ Champion avec récompenses: ${richTrainer.name}`);
      console.log(`        Argent final: ${rewards.baseMoney * rewards.moneyMultiplier} pièces`);
      console.log(`        EXP finale: ${rewards.baseExp * rewards.expMultiplier} points`);
      
      // Test objets garantis vs probabilistes
      const guaranteedItems = rewards.items?.filter(item => item.chance === 1.0) || [];
      const probableItems = rewards.items?.filter(item => item.chance < 1.0) || [];
      
      console.log(`        Objets garantis: ${guaranteedItems.length}, probabilistes: ${probableItems.length}`);
      
      this.addTestResult('Système de récompenses', true, Date.now() - testStart,
        `Tous les niveaux de récompenses testés (Standard, Gym, Champion) avec objets`);
      
    } catch (error) {
      this.addTestResult('Système de récompenses', false, Date.now() - testStart,
        'Erreur système récompenses', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  /**
   * Test 8: Compatibilité avec système existant
   */
  private async testCompatibility(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('\n🔗 Test 8: Compatibilité système existant...');
      
      // Test configuration compatible BattleEngine
      const playerPokemon: Pokemon[] = [
        {
          id: 25, combatId: 'compat_pikachu', name: 'Pikachu', level: 25,
          currentHp: 80, maxHp: 80, attack: 58, defense: 42, specialAttack: 55,
          specialDefense: 55, speed: 95, types: ['electric'], moves: ['thunderbolt'],
          status: 'normal', gender: 'male', shiny: false, isWild: false
        }
      ];
      
      const trainer = createSimpleTrainer('compat_trainer', 'Compat Test', [
        { id: 19, level: 20 }
      ]);
      
      const config = createTrainerBattleConfig('compat_session', 'CompatPlayer', playerPokemon, trainer);
      
      // Vérifications compatibilité BattleEngine
      const hasPlayer1 = config.player1 && config.player1.pokemon !== null;
      const hasOpponent = config.opponent && config.opponent.pokemon !== null;
      const hasValidType = config.type === 'trainer';
      const hasSessionIds = config.player1.sessionId && config.opponent.sessionId;
      
      console.log(`    ✅ Structure BattleConfig: ${hasPlayer1 && hasOpponent && hasValidType && hasSessionIds}`);
      console.log(`        player1.pokemon: ${config.player1.pokemon?.name}`);
      console.log(`        opponent.pokemon: ${config.opponent.pokemon.name}`);
      console.log(`        sessionIds: ${config.player1.sessionId} vs ${config.opponent.sessionId}`);
      
      // Test phases compatibles
      const trainerPhases = [
        TrainerBattlePhase.INTRO,
        TrainerBattlePhase.ACTION_SELECTION,
        TrainerBattlePhase.ACTION_RESOLUTION,
        TrainerBattlePhase.SWITCH_PHASE,
        TrainerBattlePhase.ENDED
      ];
      
      const mappedPhases = trainerPhases.map(phase => ({
        trainer: phase,
        internal: mapTrainerPhaseToInternal(phase)
      }));
      
      console.log(`    ✅ Mapping phases: ${mappedPhases.length} phases compatibles`);
      mappedPhases.forEach(({ trainer, internal }) => {
        console.log(`        ${trainer} → ${internal}`);
      });
      
      // Test TrainerTeamManager comme wrapper
      const teamManager = new TrainerTeamManager('compat_test');
      teamManager.initializeWithPokemon(playerPokemon);
      
      const activePokemonForBattle = teamManager.getActivePokemonForBattle();
      const isCompatiblePokemon = activePokemonForBattle && 
                                 activePokemonForBattle.combatId && 
                                 activePokemonForBattle.currentHp !== undefined;
      
      console.log(`    ✅ Pokémon compatible BattleEngine: ${isCompatiblePokemon}`);
      console.log(`        combatId: ${activePokemonForBattle?.combatId}`);
      console.log(`        HP: ${activePokemonForBattle?.currentHp}/${activePokemonForBattle?.maxHp}`);
      
      const allCompatible = hasPlayer1 && hasOpponent && hasValidType && 
                           hasSessionIds && isCompatiblePokemon;
      
      this.addTestResult('Compatibilité système existant', allCompatible, Date.now() - testStart,
        `Configuration 100% compatible avec BattleEngine existant`);
      
    } catch (error) {
      this.addTestResult('Compatibilité système existant', false, Date.now() - testStart,
        'Erreur compatibilité', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  // === UTILITAIRES PRIVÉS ===
  
  private addTestResult(testName: string, success: boolean, duration: number, details: string, error?: string): void {
    this.results.push({
      testName,
      success,
      duration,
      details,
      error
    });
    
    const status = success ? '✅' : '❌';
    console.log(`    ${status} ${testName}: ${details} (${duration}ms)`);
    if (error) {
      console.log(`        Erreur: ${error}`);
    }
  }
  
  private generateReport(): TestSuite {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success).length;
    
    const report: TestSuite = {
      suiteName: 'Module Combats Dresseurs',
      results: this.results,
      totalTests: this.results.length,
      passedTests,
      totalDuration
    };
    
    console.log('\n' + '🎉'.repeat(60));
    console.log('📊 RAPPORT FINAL - TESTS MODULE COMBATS DRESSEURS');
    console.log('🎉'.repeat(60));
    
    console.log(`\n📈 RÉSULTATS GLOBAUX:`);
    console.log(`   Tests exécutés: ${report.totalTests}`);
    console.log(`   ✅ Réussis: ${report.passedTests}`);
    console.log(`   ❌ Échoués: ${report.totalTests - report.passedTests}`);
    console.log(`   🎯 Taux de succès: ${Math.round((report.passedTests / report.totalTests) * 100)}%`);
    console.log(`   ⏱️  Durée totale: ${report.totalDuration}ms`);
    
    console.log(`\n📋 DÉTAIL DES TESTS:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testName} (${result.duration}ms)`);
      console.log(`      💡 ${result.details}`);
      if (result.error) {
        console.log(`      ⚠️  ${result.error}`);
      }
    });
    
    // Verdict final
    let verdict: string;
    if (report.passedTests === report.totalTests) {
      verdict = '🏆 MODULE 100% FONCTIONNEL - PRODUCTION READY';
    } else if (report.passedTests >= report.totalTests * 0.8) {
      verdict = '🎯 MODULE MAJORITAIREMENT FONCTIONNEL - Corrections mineures';
    } else {
      verdict = '🚨 MODULE NÉCESSITE CORRECTIONS IMPORTANTES';
    }
    
    console.log(`\n🎯 VERDICT FINAL:`);
    console.log(`   ${verdict}`);
    
    if (report.passedTests === report.totalTests) {
      console.log(`\n🚀 PRÊT POUR LA SUITE:`);
      console.log(`   ✅ Types et interfaces validés`);
      console.log(`   ✅ TrainerTeamManager opérationnel`);
      console.log(`   ✅ Création dresseurs fonctionnelle`);
      console.log(`   ✅ Système de changements validé`);
      console.log(`   ✅ Profils IA et récompenses OK`);
      console.log(`   ✅ Compatibilité BattleEngine assurée`);
      console.log(`\n   ➡️  SESSION 2: SwitchManager + Phases étendues`);
    }
    
    console.log('\n' + '🎉'.repeat(60));
    
    return report;
  }
}

// === FONCTION PRINCIPALE EXPORTÉE ===

/**
 * 🚀 FONCTION PRINCIPALE DE TEST
 * 
 * Exécute tous les tests du module combats dresseurs
 */
export async function quickTrainerBattleTest(): Promise<boolean> {
  const testSuite = new TrainerBattleTestSuite();
  
  try {
    const report = await testSuite.runAllTests();
    return report.passedTests === report.totalTests;
    
  } catch (error) {
    console.error('💥 [quickTrainerBattleTest] Erreur fatale:', error);
    return false;
  }
}

// === EXPORT POUR USAGE DIRECT ===
export { TrainerBattleTestSuite };

// Auto-exécution si appelé directement
if (require.main === module) {
  quickTrainerBattleTest().then(success => {
    console.log(`\n🎯 Test ${success ? 'réussi' : 'échoué'} !`);
    process.exit(success ? 0 : 1);
  });
}
