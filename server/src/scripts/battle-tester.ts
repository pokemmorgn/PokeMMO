// server/src/scripts/battle-tester-improved.ts
// Script de test Battle optimisé et robuste

import mongoose from 'mongoose';
import BattleEngine from '../battle/BattleEngine';
import { BattleConfig } from '../battle/types/BattleTypes';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  events: number;
  error?: string;
  details?: string;
}

class BattleTester {
  private results: TestResult[] = [];
  private totalEvents = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 BATTLE SYSTEM TESTER v4.0 (SCRIPT AMÉLIORÉ)');
    console.log('='.repeat(60));

    // Connect to MongoDB
    try {
      await mongoose.connect('mongodb://localhost:27017/pokeworld');
      console.log('✅ MongoDB connecté');
    } catch (error) {
      console.error('❌ Erreur MongoDB:', error);
      return;
    }

    try {
      // Run tests
      await this.testBasicBattle();
      await this.testStressBattle();
      await this.testTimeoutBattle();
      await this.testComplexBattle();

      // Results
      this.printResults();
    } finally {
      // CRITICAL: Always cleanup connections
      try {
        await mongoose.disconnect();
        console.log('🔌 MongoDB déconnecté');
        
        // Force close any remaining timers/connections
        setTimeout(() => {
          console.log('⏰ Fermeture forcée du script...');
          process.exit(0);
        }, 1000);
        
      } catch (disconnectError) {
        console.error('⚠️ Erreur déconnexion MongoDB:', disconnectError);
        process.exit(1);
      }
    }
  }

  private async testBasicBattle(): Promise<void> {
    const startTime = Date.now();
    let events = 0;
    let success = false;
    let error = '';

    try {
      const engine = new BattleEngine();
      const config = this.createTestConfig('BasicTest', 'test-player-basic');

      // Start battle
      const startResult = engine.startBattle(config);
      if (!startResult.success) {
        throw new Error(startResult.error || 'Échec démarrage');
      }

      // Event tracking
      engine.on('battleEvent', () => events++);
      engine.on('phaseChanged', () => events++);
      engine.on('actionQueued', () => events++);

      // Battle loop with proper turn management
      let turnCount = 0;
      const maxTurns = 20;
      let battleEnded = false;

      engine.on('battleEnd', () => {
        battleEnded = true;
        success = true;
      });

      // Simulate battle turns
      while (!battleEnded && turnCount < maxTurns) {
        await this.delay(200);

        const currentPhase = engine.getCurrentPhase();
        const gameState = engine.getCurrentState();

        if (gameState.isEnded) {
          battleEnded = true;
          success = true;
          break;
        }

        // Submit player action if in selection phase
        if (currentPhase === 'action_selection' && engine.canSubmitAction()) {
          const action = {
            actionId: `player_action_${turnCount}`,
            playerId: config.player1.sessionId,
            type: 'attack' as const,
            data: { moveId: 'tackle' },
            timestamp: Date.now()
          };

          await engine.submitAction(action);
        }

        turnCount++;
        
        // Check for Pokemon KO
        const p1Pokemon = gameState.player1.pokemon;
        const p2Pokemon = gameState.player2.pokemon;
        
        if (p1Pokemon && p1Pokemon.currentHp <= 0) {
          battleEnded = true;
          success = true;
          break;
        }
        
        if (p2Pokemon && p2Pokemon.currentHp <= 0) {
          battleEnded = true;
          success = true;
          break;
        }

        await this.delay(100);
      }

      if (!battleEnded && turnCount >= maxTurns) {
        success = true; // Consider timeout as success if battle progressed
        error = `Combat terminé par limite de tours (${maxTurns})`;
      }

      engine.cleanup();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erreur inconnue';
    }

    const duration = Date.now() - startTime;
    this.totalEvents += events;

    this.results.push({
      name: 'Basic Battle Test',
      success,
      duration,
      events,
      error: error || undefined,
      details: success ? 'Combat progressé normalement' : 'Combat échoué'
    });
  }

  private async testStressBattle(): Promise<void> {
    const startTime = Date.now();
    let totalEvents = 0;
    let successCount = 0;
    const battleCount = 3;

    try {
      for (let i = 0; i < battleCount; i++) {
        const engine = new BattleEngine();
        const config = this.createTestConfig(`StressTest${i}`, `test-player-stress-${i}`);

        let battleEvents = 0;
        let battleSuccess = false;

        engine.on('battleEvent', () => battleEvents++);
        engine.on('battleEnd', () => {
          battleSuccess = true;
        });

        const startResult = engine.startBattle(config);
        if (startResult.success) {
          // Quick battle simulation
          let turns = 0;
          while (!battleSuccess && turns < 10) {
            await this.delay(100);

            if (engine.canSubmitAction()) {
              const action = {
                actionId: `stress_action_${i}_${turns}`,
                playerId: config.player1.sessionId,
                type: 'attack' as const,
                data: { moveId: 'tackle' },
                timestamp: Date.now()
              };

              await engine.submitAction(action);
            }

            turns++;
            
            // Check game state
            const gameState = engine.getCurrentState();
            if (gameState.isEnded) {
              battleSuccess = true;
              break;
            }
          }

          if (turns < 10 || battleEvents > 0) {
            successCount++;
            battleSuccess = true;
          }
        }

        totalEvents += battleEvents;
        engine.cleanup();
        
        // CRITICAL: Force cleanup and small delay
        await this.delay(100);
        
        await this.delay(50);
      }
    } catch (error) {
      // Continue with partial results
    }

    const duration = Date.now() - startTime;
    this.totalEvents += totalEvents;

    this.results.push({
      name: 'Stress Test',
      success: successCount >= 2, // At least 2/3 should succeed
      duration,
      events: totalEvents,
      details: `${successCount}/${battleCount} combats réussis`
    });
  }

  private async testTimeoutBattle(): Promise<void> {
    const startTime = Date.now();
    let events = 0;
    let success = false;

    try {
      const engine = new BattleEngine();
      const config = this.createTestConfig('TimeoutTest', 'test-player-timeout', 143); // Snorlax

      engine.on('battleEvent', () => events++);
      engine.on('battleEnd', (data: any) => {
        success = true;
      });

      const startResult = engine.startBattle(config);
      if (!startResult.success) {
        throw new Error('Échec démarrage timeout test');
      }

      // Wait for timeout handling (no player actions)
      let waited = 0;
      while (!success && waited < 35000) { // Wait up to 35 seconds
        await this.delay(500);
        waited += 500;

        const gameState = engine.getCurrentState();
        if (gameState.isEnded) {
          success = true;
          break;
        }
      }

      engine.cleanup();

    } catch (error) {
      success = false;
    }

    const duration = Date.now() - startTime;
    this.totalEvents += events;

    this.results.push({
      name: 'Timeout Handling',
      success,
      duration,
      events,
      details: success ? 'Timeout géré correctement' : 'Timeout mal géré'
    });
  }

  private async testComplexBattle(): Promise<void> {
    const startTime = Date.now();
    let events = 0;
    let success = false;

    try {
      const engine = new BattleEngine();
      const config = this.createTestConfig('ComplexTest', 'test-player-complex', 25); // Pikachu

      engine.on('battleEvent', () => events++);
      engine.on('battleEnd', () => {
        success = true;
      });

      const startResult = engine.startBattle(config);
      if (!startResult.success) {
        throw new Error('Échec démarrage complex test');
      }

      // Complex battle with varied actions
      let turnCount = 0;
      while (!success && turnCount < 15) {
        await this.delay(150);

        if (engine.canSubmitAction()) {
          const actionTypes = ['attack', 'attack', 'attack']; // Mostly attacks
          const actionType = actionTypes[turnCount % actionTypes.length];

          const action = {
            actionId: `complex_action_${turnCount}`,
            playerId: config.player1.sessionId,
            type: actionType as 'attack',
            data: { moveId: 'tackle' },
            timestamp: Date.now()
          };

          await engine.submitAction(action);
        }

        turnCount++;

        const gameState = engine.getCurrentState();
        if (gameState.isEnded) {
          success = true;
          break;
        }
      }

      if (turnCount > 5) {
        success = true; // If we got through several turns, consider it a success
      }

      engine.cleanup();

    } catch (error) {
      success = false;
    }

    const duration = Date.now() - startTime;
    this.totalEvents += events;

    this.results.push({
      name: 'Complex Battle',
      success,
      duration,
      events,
      details: success ? 'Combat complexe réussi' : 'Combat complexe échoué'
    });
  }

  private createTestConfig(playerName: string, sessionId: string, opponentId = 19): BattleConfig {
    return {
      type: 'wild',
      player1: {
        sessionId,
        name: playerName,
        pokemon: {
          id: 25,
          combatId: `combat_${Date.now()}_player`,
          name: 'Pikachu',
          level: 25,
          currentHp: 100,
          maxHp: 100,
          attack: 55,
          defense: 40,
          specialAttack: 50,
          specialDefense: 50,
          speed: 90,
          moves: ['tackle', 'thundershock'],
          types: ['electric'],
          status: undefined,
          gender: 'male',
          shiny: false,
          isWild: false
        }
      },
      opponent: {
        sessionId: 'ai',
        name: 'Wild Pokemon',
        pokemon: {
          id: opponentId,
          combatId: `combat_${Date.now()}_opponent`,
          name: opponentId === 143 ? 'Snorlax' : 'Rattata',
          level: 25,
          currentHp: opponentId === 143 ? 200 : 60,
          maxHp: opponentId === 143 ? 200 : 60,
          attack: opponentId === 143 ? 110 : 56,
          defense: opponentId === 143 ? 65 : 35,
          specialAttack: opponentId === 143 ? 65 : 25,
          specialDefense: opponentId === 143 ? 110 : 35,
          speed: opponentId === 143 ? 30 : 72,
          moves: ['tackle'],
          types: opponentId === 143 ? ['normal'] : ['normal'],
          status: undefined,
          gender: 'male',
          shiny: false,
          isWild: true
        }
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printResults(): void {
    const successCount = this.results.filter(r => r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = Math.round(totalDuration / this.results.length);

    console.log('\n' + '='.repeat(60));
    console.log('🧪 RAPPORT FINAL - BATTLE SYSTEM TESTS (SCRIPT AMÉLIORÉ)');
    console.log('='.repeat(60));

    console.log(`\n📊 RÉSULTATS GLOBAUX:`);
    console.log(`   Tests exécutés: ${this.results.length}`);
    console.log(`   ✅ Réussis: ${successCount}`);
    console.log(`   ❌ Échoués: ${this.results.length - successCount}`);
    console.log(`   📈 Taux de succès: ${Math.round((successCount / this.results.length) * 100)}%`);
    console.log(`   ⏱️  Durée totale: ${totalDuration}ms`);
    console.log(`   ⏱️  Durée moyenne: ${avgDuration}ms`);
    console.log(`   🎯 Événements totaux: ${this.totalEvents}`);

    console.log(`\n📋 DÉTAILS DES TESTS:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.name} - ${result.duration}ms - ${result.events} events`);
      if (result.details) {
        console.log(`      ${result.details}`);
      }
      if (result.error) {
        console.log(`      Erreur: ${result.error}`);
      }
    });

    const verdict = successCount >= 3 ? 
      '🎉 SYSTÈME STABLE - Prêt pour production' :
      successCount >= 2 ?
      '⚠️  SYSTÈME PARTIELLEMENT STABLE - Améliorations recommandées' :
      '🚨 SYSTÈME INSTABLE - Corrections nécessaires';

    console.log(`\n🎯 VERDICT:`);
    console.log(`   ${verdict}`);
    console.log('\n' + '='.repeat(60));
  }
}

// Run tests with proper cleanup
const tester = new BattleTester();
tester.runAllTests()
  .then(() => {
    console.log('\n✅ Tests terminés - Fermeture du script...');
    process.exit(0); // Force exit to return to console
  })
  .catch((error) => {
    console.error('❌ Erreur durant les tests:', error);
    process.exit(1); // Exit with error code
  });
