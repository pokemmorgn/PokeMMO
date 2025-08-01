// scripts/battle-tester.ts
// BATTLE SYSTEM TESTER - Test du système de combat côté serveur
// Lancement: cd server && npx ts-node scripts/battle-tester.ts

import { BattleEngine } from '../battle/BattleEngine';
import { BattleConfig, BattleAction } from '../battle/types/BattleTypes';
import { connectDB } from '../db';

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
  analyzeTimings(): { issues: string[], avgInterval: number, totalDuration?: number } {
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
  private verbose: boolean = false;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }
  
  // Test de base : un combat simple
  async testBasicBattle(): Promise<TestResult> {
    this.log("🔥 TEST: Combat Standard (Pikachu vs Rattata)");
    
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
    engine.on('battleEvent', (event: any) => {
      mockClient.onBattleEvent(event.type || 'unknown', event);
    });

    engine.on('battleStart', (data: any) => {
      mockClient.onBattleEvent('battleStart', data);
    });

    engine.on('actionProcessed', (data: any) => {
      mockClient.onBattleEvent('actionProcessed', data);
    });

    engine.on('battleEnd', (data: any) => {
      mockClient.onBattleEvent('battleEnd', data);
    });

    mockClient.startCapture();
    
    try {
      // Démarrer le combat
      const startResult = engine.startBattle(config);
      
      if (!startResult.success) {
        return {
          testName: 'Basic Battle',
          success: false,
          error: `Échec démarrage: ${startResult.error}`,
          duration: 0,
          events: 0
        };
      }

      this.log("  ✅ Combat démarré");

      // Simuler le combat jusqu'à la fin
      const battleResult = await this.simulateBattleToEnd(engine);
      
      const timingAnalysis = mockClient.analyzeTimings();
      
      return {
        testName: 'Basic Battle',
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
        testName: 'Basic Battle',
        success: false,
        error: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: 0,
        events: mockClient.getEventCount()
      };
    }
  }

  // Test des K.O. simultanés
  async testSimultaneousKO(): Promise<TestResult> {
    this.log("💀 TEST: K.O. Simultané (1 HP chacun)");
    
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
    engine.on('battleEvent', (event: any) => mockClient.onBattleEvent('battleEvent', event));
    engine.on('battleEnd', (data: any) => mockClient.onBattleEvent('battleEnd', data));

    mockClient.startCapture();
    
    try {
      const startResult = engine.startBattle(config);
      
      if (!startResult.success) {
        return { 
          testName: 'Simultaneous KO',
          success: false, 
          error: startResult.error || 'Échec démarrage', 
          duration: 0, 
          events: 0 
        };
      }

      const battleResult = await this.simulateBattleToEnd(engine, 3);
      const timingAnalysis = mockClient.analyzeTimings();
      
      return {
        testName: 'Simultaneous KO',
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
        testName: 'Simultaneous KO',
        success: false,
        error: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: 0,
        events: mockClient.getEventCount()
      };
    }
  }

  // Test de stress : plusieurs combats rapides
  async testStress(): Promise<TestResult> {
    this.log("⚡ TEST: Stress (5 combats rapides)");
    
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
        testName: 'Stress Test',
        success: successCount === 5,
        error: successCount < 5 ? `Seulement ${successCount}/5 combats réussis` : undefined,
        duration,
        events: 0,
        analysis: {
          successRate: (successCount / 5) * 100,
          avgTimePerBattle: duration / 5,
          battlesCompleted: successCount
        }
      };

    } catch (error) {
      return {
        testName: 'Stress Test',
        success: false,
        error: `Exception stress test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        duration: Date.now() - startTime,
        events: 0
      };
    }
  }

  // Test de connexion DB
  async testDatabaseConnection(): Promise<TestResult> {
    this.log("🗄️ TEST: Connexion Base de Données");
    
    const startTime = Date.now();
    
    try {
      await connectDB();
      const duration = Date.now() - startTime;
      
      return {
        testName: 'Database Connection',
        success: true,
        duration,
        events: 0,
        analysis: {
          connectionTime: duration
        }
      };
    } catch (error) {
      return {
        testName: 'Database Connection',
        success: false,
        error: `DB Error: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
  testName: string;
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

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  avgDuration: number;
  criticalIssues: string[];
  recommendations: string[];
}

// === GENERATEUR DE RAPPORT FINAL ===
class TestReporter {
  static generateSummary(results: TestResult[]): TestSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = Math.round(totalDuration / totalTests);
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyser les échecs
    results.forEach(result => {
      if (!result.success && result.error) {
        criticalIssues.push(`${result.testName}: ${result.error}`);
      }
      
      // Recommandations basées sur l'analyse
      if (result.analysis?.timingIssues?.length > 0) {
        recommendations.push(`${result.testName}: Optimiser les timings (${result.analysis.timingIssues.length} issues)`);
      }
      
      if (result.analysis?.successRate && result.analysis.successRate < 100) {
        recommendations.push(`${result.testName}: Améliorer la stabilité (${result.analysis.successRate}% succès)`);
      }
    });
    
    // Recommandations générales
    if (successRate < 100) {
      recommendations.push("Corriger les échecs avant déploiement");
    }
    
    if (avgDuration > 5000) {
      recommendations.push("Optimiser les performances (durée moyenne élevée)");
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      totalDuration,
      avgDuration,
      criticalIssues,
      recommendations
    };
  }

  static printSummary(summary: TestSummary) {
    console.log("\n" + "=".repeat(50));
    console.log("🧪 RAPPORT FINAL - BATTLE SYSTEM TESTS");
    console.log("=".repeat(50));
    
    // Vue d'ensemble
    console.log(`\n📊 RÉSULTATS GLOBAUX:`);
    console.log(`   Tests exécutés: ${summary.totalTests}`);
    console.log(`   ✅ Réussis: ${summary.passedTests}`);
    console.log(`   ❌ Échoués: ${summary.failedTests}`);
    console.log(`   📈 Taux de succès: ${summary.successRate}%`);
    console.log(`   ⏱️  Durée totale: ${summary.totalDuration}ms`);
    console.log(`   ⏱️  Durée moyenne: ${summary.avgDuration}ms`);
    
    // Issues critiques
    if (summary.criticalIssues.length > 0) {
      console.log(`\n🚨 ISSUES CRITIQUES (${summary.criticalIssues.length}):`);
      summary.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // Recommandations
    if (summary.recommendations.length > 0) {
      console.log(`\n💡 RECOMMANDATIONS (${summary.recommendations.length}):`);
      summary.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    // Verdict final
    console.log(`\n🎯 VERDICT:`);
    if (summary.successRate === 100) {
      console.log(`   ✅ SYSTÈME STABLE - Prêt pour la production`);
    } else if (summary.successRate >= 80) {
      console.log(`   ⚠️  SYSTÈME PARTIELLEMENT STABLE - Corrections mineures recommandées`);
    } else {
      console.log(`   ❌ SYSTÈME INSTABLE - Corrections majeures requises`);
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

// === MAIN EXECUTION ===
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  console.log("🧪 BATTLE SYSTEM TESTER v2.0");
  console.log("================================");
  if (!verbose) {
    console.log("(Utilise --verbose pour plus de détails)\n");
  }

  const tester = new BattleSystemTester(verbose);
  const results: TestResult[] = [];

  // Liste des tests à exécuter
  const tests = [
    { name: 'Database Connection', fn: () => tester.testDatabaseConnection() },
    { name: 'Basic Battle', fn: () => tester.testBasicBattle() },
    { name: 'Simultaneous KO', fn: () => tester.testSimultaneousKO() },
    { name: 'Stress Test', fn: () => tester.testStress() }
  ];

  // Exécuter tous les tests
  for (const test of tests) {
    try {
      if (verbose) console.log(`\n🔄 Exécution: ${test.name}`);
      
      const result = await test.fn();
      results.push(result);
      
      // Affichage minimal en mode non-verbose
      if (!verbose) {
        if (result.success) {
          console.log(`✅ ${result.testName} - ${result.duration}ms`);
        } else {
          console.log(`❌ ${result.testName} - ${result.error}`);
        }
      } else {
        // Affichage détaillé en mode verbose
        if (result.success) {
          console.log(`  ✅ SUCCÈS - ${result.duration}ms - ${result.events} events`);
          if (result.analysis?.timingIssues?.length > 0) {
            console.log(`  ⚠️  Issues: ${result.analysis.timingIssues.length}`);
            result.analysis.timingIssues.forEach((issue: string) => console.log(`    - ${issue}`));
          }
        } else {
          console.log(`  ❌ ÉCHEC - ${result.error}`);
        }
      }
    } catch (error) {
      console.log(`💥 CRASH - ${test.name}: ${error}`);
      results.push({ 
        testName: test.name,
        success: false, 
        error: `Crash: ${error}`, 
        duration: 0, 
        events: 0 
      });
    }
  }

  // Générer et afficher le rapport final
  const summary = TestReporter.generateSummary(results);
  TestReporter.printSummary(summary);

  // Code de sortie
  process.exit(summary.successRate === 100 ? 0 : 1);
}

// Lancer les tests
if (require.main === module) {
  main().catch(error => {
    console.error("💥 ERREUR CRITIQUE:", error);
    process.exit(1);
  });
}
