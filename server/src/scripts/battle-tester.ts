// scripts/battle-tester.ts
// BATTLE SYSTEM TESTER - Test du système de combat côté serveur
// Lancement: npx ts-node scripts/battle-tester.ts

import { BattleEngine } from '../src/battle/BattleEngine';
import { BattleConfig, BattleAction } from '../src/battle/types/BattleTypes';

// === MOCK CLIENT POUR CAPTURER LES EVENTS ===
class MockBattleClient {
  private events: Array<{
    timestamp: number;
    event: string;
    data: any;
    timeSinceStart: number;
  }> = [];
  private startTime: number = 0;

  startCapture() {
    this.startTime = Date.now();
    this.events = [];
  }

  onBattleEvent(eventType: string, data: any) {
    const now = Date.now();
    this.events.push({
      timestamp: now,
      event: eventType,
      data: data,
      timeSinceStart: now - this.startTime
    });
  }

  getEvents() { return this.events; }
  getEventCount() { return this.events.length; }
  
  // Analyse simple des timings
  analyzeTimings() {
    if (this.events.length < 2) return { issues: [], avgInterval: 0 };
    
    const issues: string[] = [];
    let totalInterval = 0;
    
    for (let i = 1; i < this.events.length; i++) {
      const prev = this.events[i - 1];
      const curr = this.events[i];
      const interval = curr.timestamp - prev.timestamp;
      
      totalInterval += interval;
      
      // Détection des problèmes de timing
      if (interval < 0) {
        issues.push(`TIME_TRAVEL: ${prev.event} → ${curr.event}`);
      } else if (interval > 10000) {
        issues.push(`LONG_DELAY: ${interval}ms between ${prev.event} → ${curr.event}`);
      } else if (interval < 50 && prev.event !== curr.event) {
        issues.push(`TOO_FAST: ${interval}ms between ${prev.event} → ${curr.event}`);
      }
    }
    
    return {
      issues,
      avgInterval: totalInterval / (this.events.length - 1),
      totalDuration: this.events[this.events.length - 1].timestamp - this.events[0].timestamp
    };
  }
}

// === TESTEUR PRINCIPAL ===
class BattleSystemTester {
  
  // Test de base : un combat simple
  async testBasicBattle(): Promise<TestResult> {
    console.log("🔥 TEST: Combat Standard (Pikachu vs Rattata)");
    
    const mockClient = new MockBattleClient();
    const engine = new BattleEngine();
    
    // Configuration bataille
    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'test-player-1',
        name: 'TestTrainer',
        pokemon: this.createTestPokemon('Pikachu', 100, 25, ['tackle', 'thunder_shock'])
      },
      opponent: {
        sessionId: 'ai',
        name: 'Wild Pokemon',
        pokemon: this.createTestPokemon('Rattata', 60, 19, ['tackle', 'tail_whip'])
      }
    };

    // Connecter le mock client aux events
    engine.on('battleEvent', (event) => {
      mockClient.onBattleEvent(event.type || 'unknown', event);
    });

    engine.on('battleStart', (data) => {
      mockClient.onBattleEvent('battleStart', data);
    });

    engine.on('actionProcessed', (data) => {
      mockClient.onBattleEvent('actionProcessed', data);
    });

    engine.on('battleEnd', (data) => {
      mockClient.onBattleEvent('battleEnd', data);
    });

    mockClient.startCapture();
    
    try {
      // Démarrer le combat
      const startResult = engine.startBattle(config);
      
      if (!startResult.success) {
        return {
          success: false,
          error: `Échec démarrage: ${startResult.error}`,
          duration: 0,
          events: 0
        };
      }

      console.log("  ✅ Combat démarré");

      // Simuler le combat jusqu'à la fin
      const battleResult = await this.simulateBattleToEnd(engine);
      
      const timingAnalysis = mockClient.analyzeTimings();
      
      return {
        success: battleResult.completed,
        error: battleResult.error,
        duration: timingAnalysis.totalDuration || 0,
        events: mockClient.getEventCount(),
        analysis: {
          timingIssues: timingAnalysis.issues,
          avgEventInterval: timingAnalysis.avgInterval,
          finalWinner: battleResult.winner,
          turns: battleResult.turns
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: 0,
        events: mockClient.getEventCount()
      };
    }
  }

  // Test des K.O. simultanés
  async testSimultaneousKO(): Promise<TestResult> {
    console.log("💀 TEST: K.O. Simultané (1 HP chacun)");
    
    const mockClient = new MockBattleClient();
    const engine = new BattleEngine();
    
    const config: BattleConfig = {
      type: 'wild',
      player1: {
        sessionId: 'test-player-1',
        name: 'TestTrainer',
        pokemon: this.createTestPokemon('Pikachu', 1, 25, ['tackle'])
      },
      opponent: {
        sessionId: 'ai',
        name: 'Wild Pokemon',
        pokemon: this.createTestPokemon('Rattata', 1, 19, ['tackle'])
      }
    };

    // Connecter events
    engine.on('battleEvent', (event) => mockClient.onBattleEvent('battleEvent', event));
    engine.on('battleEnd', (data) => mockClient.onBattleEvent('battleEnd', data));

    mockClient.startCapture();
    
    try {
      const startResult = engine.startBattle(config);
      
      if (!startResult.success) {
        return { success: false, error: startResult.error || 'Échec démarrage', duration: 0, events: 0 };
      }

      const battleResult = await this.simulateBattleToEnd(engine, 3);
      const timingAnalysis = mockClient.analyzeTimings();
      
      return {
        success: battleResult.completed,
        error: battleResult.error,
        duration: timingAnalysis.totalDuration || 0,
        events: mockClient.getEventCount(),
        analysis: {
          timingIssues: timingAnalysis.issues,
          avgEventInterval: timingAnalysis.avgInterval,
          finalWinner: battleResult.winner,
          turns: battleResult.turns
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: 0,
        events: mockClient.getEventCount()
      };
    }
  }

  // Test de stress : plusieurs combats rapides
  async testStress(): Promise<TestResult> {
    console.log("⚡ TEST: Stress (5 combats rapides)");
    
    const results: boolean[] = [];
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < 5; i++) {
        const engine = new BattleEngine();
        
        const config: BattleConfig = {
          type: 'wild',
          player1: {
            sessionId: `test-player-${i}`,
            name: `TestTrainer${i}`,
            pokemon: this.createTestPokemon('Pikachu', 50, 25, ['tackle'])
          },
          opponent: {
            sessionId: 'ai',
            name: 'Wild Pokemon',
            pokemon: this.createTestPokemon('Rattata', 30, 19, ['tackle'])
          }
        };

        const startResult = engine.startBattle(config);
        if (!startResult.success) {
          results.push(false);
          continue;
        }

        const battleResult = await this.simulateBattleToEnd(engine, 10);
        results.push(battleResult.completed);
      }

      const successCount = results.filter(r => r).length;
      const duration = Date.now() - startTime;
      
      return {
        success: successCount === 5,
        error: successCount < 5 ? `Seulement ${successCount}/5 combats réussis` : undefined,
        duration,
        events: 0,
        analysis: {
          successRate: (successCount / 5) * 100,
          avgTimePerBattle: duration / 5
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Exception stress test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: Date.now() - startTime,
        events: 0
      };
    }
  }

  // Simulation d'un combat jusqu'à la fin
  private async simulateBattleToEnd(engine: BattleEngine, maxTurns: number = 20): Promise<BattleSimulationResult> {
    let turns = 0;
    let lastState = engine.getCurrentState();
    
    while (!lastState.isEnded && turns < maxTurns) {
      try {
        // Action joueur 1
        if (lastState.currentTurn === 'player1' || engine.canSubmitAction()) {
          const action: BattleAction = {
            actionId: `action_${turns}_p1`,
            playerId: 'test-player-1',
            type: 'attack',
            data: { moveId: 'tackle' },
            timestamp: Date.now()
          };
          
          await engine.submitAction(action);
        }

        // Petite attente pour laisser le système processer
        await this.delay(200);
        
        // Vérifier nouvel état
        const newState = engine.getCurrentState();
        if (newState.isEnded) {
          return {
            completed: true,
            winner: newState.winner,
            turns: turns + 1
          };
        }
        
        lastState = newState;
        turns++;
        
      } catch (error) {
        return {
          completed: false,
          error: `Erreur tour ${turns}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          turns
        };
      }
    }
    
    // Timeout
    return {
      completed: false,
      error: `Timeout après ${maxTurns} tours`,
      turns
    };
  }

  // Utilitaire pour créer un Pokémon de test
  private createTestPokemon(name: string, hp: number, pokemonId: number, moves: string[]) {
    return {
      id: pokemonId,
      combatId: `test-${name.toLowerCase()}-${Date.now()}`,
      name,
      level: 25,
      currentHp: hp,
      maxHp: hp,
      attack: 50,
      defense: 40,
      specialAttack: 45,
      specialDefense: 45,
      speed: 60,
      types: ['normal'],
      moves,
      status: 'normal' as const,
      isWild: name !== 'TestTrainer'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// === TYPES ===
interface TestResult {
  success: boolean;
  error?: string;
  duration: number;
  events: number;
  analysis?: any;
}

interface BattleSimulationResult {
  completed: boolean;
  error?: string;
  winner?: string | null;
  turns: number;
}

// === MAIN EXECUTION ===
async function main() {
  console.log("🧪 BATTLE SYSTEM TESTER v1.0");
  console.log("================================");
  console.log();

  const tester = new BattleSystemTester();
  const results: TestResult[] = [];

  // Test 1: Combat standard
  try {
    const result1 = await tester.testBasicBattle();
    results.push(result1);
    
    if (result1.success) {
      console.log(`  ✅ SUCCÈS - ${result1.duration}ms - ${result1.events} events`);
      if (result1.analysis?.timingIssues?.length > 0) {
        console.log(`  ⚠️  Issues: ${result1.analysis.timingIssues.length}`);
        result1.analysis.timingIssues.forEach((issue: string) => console.log(`    - ${issue}`));
      }
    } else {
      console.log(`  ❌ ÉCHEC - ${result1.error}`);
    }
  } catch (error) {
    console.log(`  💥 CRASH - ${error}`);
    results.push({ success: false, error: `Crash: ${error}`, duration: 0, events: 0 });
  }

  console.log();

  // Test 2: K.O. simultané
  try {
    const result2 = await tester.testSimultaneousKO();
    results.push(result2);
    
    if (result2.success) {
      console.log(`  ✅ SUCCÈS - ${result2.duration}ms - Winner: ${result2.analysis?.finalWinner || 'N/A'}`);
    } else {
      console.log(`  ❌ ÉCHEC - ${result2.error}`);
    }
  } catch (error) {
    console.log(`  💥 CRASH - ${error}`);
    results.push({ success: false, error: `Crash: ${error}`, duration: 0, events: 0 });
  }

  console.log();

  // Test 3: Stress test
  try {
    const result3 = await tester.testStress();
    results.push(result3);
    
    if (result3.success) {
      console.log(`  ✅ SUCCÈS - ${result3.duration}ms total`);
    } else {
      console.log(`  ❌ ÉCHEC - ${result3.error}`);
    }
  } catch (error) {
    console.log(`  💥 CRASH - ${error}`);
    results.push({ success: false, error: `Crash: ${error}`, duration: 0, events: 0 });
  }

  // === RAPPORT FINAL ===
  console.log();
  console.log("📊 RAPPORT FINAL");
  console.log("================");
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`Tests réussis: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
  
  if (successCount < totalTests) {
    console.log();
    console.log("❌ ÉCHECS DÉTECTÉS:");
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`  Test ${index + 1}: ${result.error}`);
      }
    });
  }

  // Résumé pour analyse Claude
  console.log();
  console.log("=== ANALYSE POUR CLAUDE ===");
  console.log(`Success Rate: ${Math.round(successCount/totalTests*100)}%`);
  console.log(`Critical Issues: ${totalTests - successCount}`);
  
  if (successCount > 0) {
    const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successCount;
    console.log(`Avg Battle Duration: ${Math.round(avgDuration)}ms`);
  }
  
  results.forEach((result, index) => {
    if (result.analysis?.timingIssues?.length > 0) {
      console.log(`Test ${index + 1} Timing Issues: ${result.analysis.timingIssues.join(', ')}`);
    }
  });

  console.log();
  console.log("🎯 CONCLUSION:");
  if (successCount === totalTests) {
    console.log("Système de combat STABLE - Prêt pour intégration client");
  } else {
    console.log("Système de combat INSTABLE - Corrections nécessaires côté serveur");
  }
}

// Lancer les tests
if (require.main === module) {
  main().catch(error => {
    console.error("💥 ERREUR CRITIQUE:", error);
    process.exit(1);
  });
}
