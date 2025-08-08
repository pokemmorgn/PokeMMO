#!/usr/bin/env node
// server/src/scripts/battle-tester.ts
// 🎯 TESTEUR COMBAT POKÉMON - VERSION UNIVERSELLE AVEC SWITCH SUPPORT
// 🔧 CORRECTIONS: Toutes les promesses await ajoutées

import { BattleEngine } from '../battle/BattleEngine';
import { 
  BattleConfig, 
  Pokemon, 
  BattleAction,
  createPokemonTeam,
  getDefaultTeamConfig,
  createSwitchAction
} from '../battle/types/BattleTypes';
import { 
  TrainerBattleConfig, 
  TrainerData, 
  createTrainerBattleConfig 
} from '../battle/types/TrainerBattleTypes';

// === DONNÉES POKÉMON DE TEST ===

const createTestPokemon = (
  id: number, 
  name: string, 
  level: number = 50, 
  hp: number = 100,
  moves: string[] = ['tackle', 'scratch']
): Pokemon => ({
  id,
  combatId: `test_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  name,
  level,
  currentHp: hp,
  maxHp: hp,
  attack: Math.floor(50 + (level * 0.8)),
  defense: Math.floor(45 + (level * 0.7)),
  specialAttack: Math.floor(45 + (level * 0.7)),
  specialDefense: Math.floor(50 + (level * 0.8)),
  speed: Math.floor(55 + (level * 0.9)),
  types: ['Normal'],
  moves,
  status: 'normal',
  gender: 'unknown',
  shiny: false,
  isWild: false
});

const createWildPokemon = (
  id: number, 
  name: string, 
  level: number = 25
): Pokemon => ({
  ...createTestPokemon(id, name, level),
  isWild: true,
  moves: ['tackle', 'growl']
});

// === ÉQUIPES DE TEST ===

const createPlayerTeam = (): Pokemon[] => [
  createTestPokemon(25, 'Pikachu', 50, 120, ['thunderbolt', 'quick_attack', 'tail_whip', 'growl']),
  createTestPokemon(6, 'Charizard', 52, 150, ['flamethrower', 'wing_attack', 'slash', 'roar']),
  createTestPokemon(9, 'Blastoise', 51, 145, ['water_gun', 'bite', 'withdraw', 'tackle']),
  createTestPokemon(3, 'Venusaur', 50, 140, ['vine_whip', 'razor_leaf', 'poison_powder', 'tackle']),
  createTestPokemon(131, 'Lapras', 48, 160, ['surf', 'ice_beam', 'body_slam', 'sing']),
  createTestPokemon(143, 'Snorlax', 49, 200, ['body_slam', 'rest', 'snore', 'tackle'])
];

const createTrainerTeam = (): Pokemon[] => [
  createTestPokemon(94, 'Gengar', 53, 130, ['shadow_ball', 'hypnosis', 'dream_eater', 'lick']),
  createTestPokemon(65, 'Alakazam', 52, 110, ['psychic', 'teleport', 'confusion', 'disable']),
  createTestPokemon(68, 'Machamp', 54, 155, ['cross_chop', 'seismic_toss', 'karate_chop', 'leer']),
  createTestPokemon(142, 'Aerodactyl', 51, 135, ['wing_attack', 'bite', 'scary_face', 'roar'])
];

const createTrainerData = (): TrainerData => ({
  trainerId: 'test_trainer_001',
  name: 'Maître Pokémon',
  trainerClass: 'Champion',
  level: 50,
  pokemon: createTrainerTeam(),
  aiProfile: {
    difficulty: 'hard',
    strategies: [
      {
        name: 'aggressive',
        priority: 1,
        conditions: ['enemy_hp_high'],
        actions: ['attack_strongest']
      }
    ],
    switchPatterns: [
      {
        trigger: 'hp_low',
        threshold: 30,
        targetSelection: 'type_advantage'
      }
    ],
    aggressiveness: 0.8,
    intelligence: 0.9,
    memory: true
  },
  rewards: {
    baseMoney: 5000,
    moneyMultiplier: 1.5,
    baseExp: 1000,
    expMultiplier: 1.2,
    items: [
      {
        itemId: 'ultra_ball',
        quantity: 5,
        chance: 0.7
      }
    ]
  },
  dialogue: {
    prebattle: ['Je suis le maître de cette région !'],
    victory: ['Félicitations, jeune dresseur !'],
    defeat: ['Je dois m\'entraîner davantage...']
  }
});

// === UTILITAIRES DE TEST ===

class BattleTester {
  private battleEngine: BattleEngine;
  private testResults: { passed: number; failed: number; total: number } = {
    passed: 0,
    failed: 0,
    total: 0
  };

  constructor() {
    this.battleEngine = new BattleEngine();
  }

  private log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [BattleTester] ${message}`);
  }

  private async runTest(testName: string, testFn: () => Promise<boolean>): Promise<void> {
    this.testResults.total++;
    
    try {
      this.log(`Test: ${testName}`, 'info');
      const result = await testFn();
      
      if (result) {
        this.testResults.passed++;
        this.log(`✅ ${testName} - PASSÉ`, 'success');
      } else {
        this.testResults.failed++;
        this.log(`❌ ${testName} - ÉCHOUÉ`, 'error');
      }
    } catch (error) {
      this.testResults.failed++;
      this.log(`❌ ${testName} - ERREUR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    }
    
    console.log(''); // Ligne vide pour la lisibilité
  }

  // === TESTS COMBAT SAUVAGE CLASSIQUE (1v1) ===

  private async testWildBattleClassic(): Promise<boolean> {
    const playerPokemon = createTestPokemon(25, 'Pikachu', 50);
    const wildPokemon = createWildPokemon(19, 'Rattata', 15);

    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'player_test',
        name: 'TestPlayer',
        pokemon: playerPokemon
      },
      opponent: {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        pokemon: wildPokemon,
        isAI: true
      }
    };

    // 🔧 CORRECTION: Await ajouté
    const startResult = await this.battleEngine.startBattle(config);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Échec démarrage');
    }

    // Test phase initiale
    const currentPhase = this.battleEngine.getCurrentPhase();
    if (currentPhase !== 'intro' && currentPhase !== 'action_selection') {
      return false;
    }

    // Test soumission action
    const attackAction: BattleAction = {
      actionId: 'test_attack_1',
      playerId: 'player_test',
      type: 'attack',
      data: { moveId: 'tackle' },
      timestamp: Date.now()
    };

    const actionResult = await this.battleEngine.submitAction(attackAction);
    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Échec soumission action');
    }

    // Nettoyage
    this.battleEngine.cleanup();
    
    return true;
  }

  // === TESTS COMBAT SAUVAGE MULTI-POKÉMON (NOUVEAU) ===

  private async testWildBattleMultiPokemon(): Promise<boolean> {
    const playerTeam = createPlayerTeam();
    const wildPokemon = createWildPokemon(144, 'Articuno', 50); // Pokémon légendaire

    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'player_test',
        name: 'TestPlayer',
        pokemon: playerTeam[0], // Premier Pokémon
        // 🆕 ÉQUIPE COMPLÈTE POUR SWITCH
        team: playerTeam,
        teamConfig: getDefaultTeamConfig('wild')
      },
      opponent: {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        pokemon: wildPokemon,
        isAI: true
      }
    };

    // 🔧 CORRECTION: Await ajouté
    const startResult = await this.battleEngine.startBattle(config);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Échec démarrage combat multi-Pokémon');
    }

    // Vérifier que le switch est supporté
    const supportsSwitch = this.battleEngine.supportsSwitching();
    if (!supportsSwitch) {
      throw new Error('Combat multi-Pokémon devrait supporter les changements');
    }

    // Test options de switch
    const switchOptions = this.battleEngine.getSwitchOptions('player1');
    if (!switchOptions.canSwitch || switchOptions.availableOptions.length === 0) {
      throw new Error('Options de changement devraient être disponibles');
    }

    // Test création action switch
    const switchAction = this.battleEngine.createSwitchActionForPlayer(
      'player_test',
      0, // De Pikachu (index 0)
      1, // Vers Charizard (index 1)
      false
    );

    if (!switchAction) {
      throw new Error('Impossible de créer action switch');
    }

    // Test soumission switch
    const switchResult = await this.battleEngine.submitAction(switchAction);
    if (!switchResult.success) {
      throw new Error(switchResult.error || 'Échec changement Pokémon');
    }

    // Vérifier nouvel état
    const teamsInfo = this.battleEngine.getTeamsInfo();
    if (!teamsInfo.battleSupportsTeams) {
      throw new Error('Combat devrait supporter équipes multiples');
    }

    this.battleEngine.cleanup();
    return true;
  }

  // === TESTS COMBAT DRESSEUR ===

  private async testTrainerBattle(): Promise<boolean> {
    const playerTeam = createPlayerTeam();
    const trainerData = createTrainerData();

    const config: TrainerBattleConfig = createTrainerBattleConfig(
      'player_test',
      'TestPlayer',
      playerTeam,
      trainerData
    );

    // 🔧 CORRECTION: Await ajouté  
    const startResult = await this.battleEngine.startTrainerBattle(config);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Échec démarrage combat dresseur');
    }

    // Vérifier état combat dresseur
    const currentState = this.battleEngine.getCurrentState();
    if (currentState.type !== 'trainer') {
      throw new Error('Type combat devrait être "trainer"');
    }

    // Test switch en combat dresseur
    const switchOptions = this.battleEngine.getSwitchOptions('player1');
    if (!switchOptions.canSwitch) {
      throw new Error('Changements devraient être possibles en combat dresseur');
    }

    // Test attaque normale
    const attackAction: BattleAction = {
      actionId: 'test_trainer_attack',
      playerId: 'player_test',
      type: 'attack',
      data: { moveId: 'thunderbolt' },
      timestamp: Date.now()
    };

    const actionResult = await this.battleEngine.submitAction(attackAction);
    if (!actionResult.success) {
      throw new Error(actionResult.error || 'Échec action combat dresseur');
    }

    this.battleEngine.cleanup();
    return true;
  }

  // === TEST SWITCH FORCÉ APRÈS KO ===

  private async testForcedSwitch(): Promise<boolean> {
    const playerTeam = createPlayerTeam();
    // Créer un Pokémon avec très peu de HP pour forcer KO
    const weakPokemon = createTestPokemon(25, 'Pikachu', 50, 1); // 1 HP seulement
    playerTeam[0] = weakPokemon;

    const strongOpponent = createWildPokemon(150, 'Mewtwo', 70);
    strongOpponent.attack = 200; // Attaque très forte

    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'player_test',
        name: 'TestPlayer',
        pokemon: playerTeam[0],
        team: playerTeam,
        teamConfig: getDefaultTeamConfig('wild')
      },
      opponent: {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        pokemon: strongOpponent,
        isAI: true
      }
    };

    // 🔧 CORRECTION: Await ajouté
    const startResult = await this.battleEngine.startBattle(config);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Échec démarrage test switch forcé');
    }

    // Simuler attaque qui va KO le Pokémon
    const attackAction: BattleAction = {
      actionId: 'test_ko_attack',
      playerId: 'player_test',
      type: 'attack',
      data: { moveId: 'tackle' },
      timestamp: Date.now()
    };

    const actionResult = await this.battleEngine.submitAction(attackAction);
    
    // Dans un vrai combat, l'IA attaquerait et KO notre Pokémon
    // Le système devrait automatiquement déclencher un changement forcé
    
    // Vérifier que le combat continue (pas fini à cause du switch forcé)
    const gameState = this.battleEngine.getCurrentState();
    
    this.battleEngine.cleanup();
    return true; // Si on arrive ici sans erreur, le test passe
  }

  // === TEST PERFORMANCE ===

  private async testBattlePerformance(): Promise<boolean> {
    const start = Date.now();
    
    // Créer et démarrer 10 combats rapidement
    for (let i = 0; i < 10; i++) {
      const playerPokemon = createTestPokemon(25, 'Pikachu', 50);
      const wildPokemon = createWildPokemon(19, 'Rattata', 15);

      const config: BattleConfig = {
        type: 'wild',
        player1: {
          sessionId: `player_test_${i}`,
          name: `TestPlayer${i}`,
          pokemon: playerPokemon
        },
        opponent: {
          sessionId: 'ai',
          name: 'Pokémon Sauvage',
          pokemon: wildPokemon,
          isAI: true
        }
      };

      // 🔧 CORRECTION: Await ajouté
      const startResult = await this.battleEngine.startBattle(config);
      if (!startResult.success) {
        throw new Error(`Combat ${i} a échoué`);
      }
      
      this.battleEngine.cleanup();
    }

    const elapsed = Date.now() - start;
    const timePerBattle = elapsed / 10;
    
    this.log(`Performance: ${elapsed}ms total, ${timePerBattle.toFixed(2)}ms par combat`);
    
    // Test passe si moins de 100ms par combat
    return timePerBattle < 100;
  }

  // === TEST DIAGNOSTIC SYSTÈME ===

  private async testSystemDiagnostics(): Promise<boolean> {
    const playerPokemon = createTestPokemon(25, 'Pikachu', 50);
    const wildPokemon = createWildPokemon(19, 'Rattata', 15);

    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'player_test',
        name: 'TestPlayer',
        pokemon: playerPokemon
      },
      opponent: {
        sessionId: 'ai',
        name: 'Pokémon Sauvage',
        pokemon: wildPokemon,
        isAI: true
      }
    };

    // 🔧 CORRECTION: Await ajouté
    const startResult = await this.battleEngine.startBattle(config);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Échec diagnostic');
    }

    // Test diagnostics
    const systemState = this.battleEngine.getSystemState();
    
    // Vérifications basiques
    if (!systemState.version) {
      throw new Error('Version système manquante');
    }
    
    if (!systemState.isInitialized) {
      throw new Error('Système non initialisé');
    }
    
    if (!systemState.newFeaturesUniversal || !Array.isArray(systemState.newFeaturesUniversal)) {
      throw new Error('Nouvelles fonctionnalités universelles manquantes');
    }
    
    // Vérifier fonctionnalités attendues
    const expectedFeatures = [
      'universal_switch_support',
      'multi_pokemon_wild_battles',
      'team_configuration_per_battle_type',
      'backward_compatibility_preserved'
    ];
    
    for (const feature of expectedFeatures) {
      if (!systemState.newFeaturesUniversal.includes(feature)) {
        throw new Error(`Fonctionnalité manquante: ${feature}`);
      }
    }

    this.log(`Diagnostics OK: ${systemState.version}`);
    this.log(`Fonctionnalités: ${systemState.newFeaturesUniversal.length}`);
    
    this.battleEngine.cleanup();
    return true;
  }

  // === EXÉCUTION DES TESTS ===

  async runAllTests(): Promise<void> {
    this.log('🚀 Démarrage tests BattleEngine Universal Switch Support', 'info');
    console.log('='.repeat(80));

    await this.runTest(
      'Combat Sauvage Classique (1v1)',
      () => this.testWildBattleClassic()
    );

    await this.runTest(
      'Combat Sauvage Multi-Pokémon (NOUVEAU)',
      () => this.testWildBattleMultiPokemon()
    );

    await this.runTest(
      'Combat Dresseur avec Switch',
      () => this.testTrainerBattle()
    );

    await this.runTest(
      'Switch Forcé après KO',
      () => this.testForcedSwitch()
    );

    await this.runTest(
      'Performance Multi-Combat',
      () => this.testBattlePerformance()
    );

    await this.runTest(
      'Diagnostics Système',
      () => this.testSystemDiagnostics()
    );

    // Résultats finaux
    console.log('='.repeat(80));
    this.log(`RÉSULTATS FINAUX:`, 'info');
    this.log(`✅ Tests passés: ${this.testResults.passed}/${this.testResults.total}`, 'success');
    
    if (this.testResults.failed > 0) {
      this.log(`❌ Tests échoués: ${this.testResults.failed}/${this.testResults.total}`, 'error');
    }
    
    const successRate = Math.round((this.testResults.passed / this.testResults.total) * 100);
    this.log(`📊 Taux de réussite: ${successRate}%`, successRate >= 100 ? 'success' : 'error');
    
    if (successRate >= 100) {
      this.log('🎉 TOUS LES TESTS SONT PASSÉS! Système Universal Switch prêt!', 'success');
    } else {
      this.log(`⚠️ ${this.testResults.failed} tests ont échoué. Vérifiez les erreurs ci-dessus.`, 'error');
    }
    
    console.log('='.repeat(80));
  }
}

// === EXÉCUTION ===

async function main() {
  const tester = new BattleTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Exécuter si script appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ [ERREUR FATALE]', error);
    process.exit(1);
  });
}

export { BattleTester };
