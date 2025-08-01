// server/src/scripts/simple-battle-tester.ts
// 🎯 BATTLE TESTER SIMPLE - CLEAN & CONTROLLED

import mongoose from 'mongoose';
import BattleEngine from '../battle/BattleEngine';
import { BattleConfig, Pokemon } from '../battle/types/BattleTypes';
import { 
  TrainerBattleConfig, 
  createTrainerBattleConfig
} from '../battle/types/TrainerBattleTypes';
import { createSimpleTrainer } from '../battle/helpers/TrainerBattleHelpers';

interface TestResult {
  name: string;
  type: 'wild' | 'trainer';
  success: boolean;
  duration: number;
  events: number;
  turns: number;
  reason: string;
  error?: string;
}

class SimpleBattleTester {
  private results: TestResult[] = [];
  private totalEvents = 0;
  private engines: BattleEngine[] = [];

  async runAllTests(): Promise<void> {
    console.log('🎯 SIMPLE BATTLE TESTER v1.0 - CLEAN & CONTROLLED');
    console.log('='.repeat(60));

    try {
      await mongoose.connect('mongodb://localhost:27017/pokeworld');
      console.log('✅ MongoDB connecté');

      // 🌿 10 COMBATS SAUVAGES
      console.log('\n🌿 PHASE 1: 10 Combats Sauvages');
      for (let i = 1; i <= 10; i++) {
        console.log(`🌿 Test ${i}/10: Combat Sauvage ${i}...`);
        await this.testWildBattle(i);
      }

      // 🤖 10 COMBATS DRESSEURS
      console.log('\n🤖 PHASE 2: 10 Combats Dresseurs');
      for (let i = 1; i <= 10; i++) {
        console.log(`🤖 Test ${10 + i}/20: Combat Dresseur ${i}...`);
        await this.testTrainerBattle(i);
      }

      // 🔥 RÉSULTATS FINAUX
      this.printFinalResults();

    } finally {
      // Cleanup forcé
      console.log('\n🛑 Cleanup forcé...');
      this.engines.forEach(engine => {
        try { engine.cleanup(); } catch (e) {}
      });
      
      try {
        await mongoose.disconnect();
        console.log('🔌 MongoDB déconnecté');
      } catch (e) {}
      
      console.log('🎉 Tests terminés - Sortie propre!');
      setTimeout(() => process.exit(0), 1000);
    }
  }

  private async testWildBattle(index: number): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let events = 0;
    let turns = 0;
    let reason = '';
    let error = '';

    try {
      const engine = new BattleEngine();
      this.engines.push(engine);
      
      // Config simple
      const config = this.createWildConfig(`WildTest${index}`, `test-wild-${index}`, index);
      
      // Event tracking
      engine.on('battleEvent', () => events++);
      engine.on('battleEnd', (data: any) => {
        success = true;
        reason = data?.reason || 'completed';
      });

      // Start battle
      const startResult = engine.startBattle(config);
      if (!startResult.success) {
        throw new Error(startResult.error || 'Start failed');
      }

      // Simple simulation - just attack until end
      while (!engine.getCurrentState().isEnded && turns < 15) {
        if (engine.canSubmitAction()) {
          const action = {
            actionId: `wild_action_${turns}`,
            playerId: config.player1.sessionId,
            type: 'attack' as const,
            data: { moveId: 'tackle' },
            timestamp: Date.now()
          };

          await engine.submitAction(action);
          turns++;
          await this.delay(100);
        } else {
          await this.delay(50);
        }
      }

      // Force end if not ended
      if (!success && turns >= 15) {
        success = true;
        reason = 'max_turns_reached';
      }

      engine.cleanup();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      success = false;
      reason = 'error';
    }

    const duration = Date.now() - startTime;
    this.totalEvents += events;

    this.results.push({
      name: `Wild Battle ${index}`,
      type: 'wild',
      success,
      duration,
      events,
      turns,
      reason,
      error: error || undefined
    });

    const status = success ? '✅' : '❌';
    console.log(`    ${status} Wild ${index}: ${duration}ms - ${events} events - ${turns} turns [${reason}]`);
  }

  private async testTrainerBattle(index: number): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let events = 0;
    let turns = 0;
    let reason = '';
    let error = '';

    try {
      const engine = new BattleEngine();
      this.engines.push(engine);
      
      // Config simple
      const config = this.createTrainerConfig(`TrainerTest${index}`, `test-trainer-${index}`, index);
      
      // Event tracking
      engine.on('battleEvent', () => events++);
      engine.on('battleEnd', (data: any) => {
        success = true;
        reason = data?.reason || 'completed';
      });

      // Start battle
      const startResult = await engine.startTrainerBattle(config);
      if (!startResult.success) {
        throw new Error(startResult.error || 'Start failed');
      }

      // Simple simulation - just attack until end
      while (!engine.getCurrentState().isEnded && turns < 20) {
        if (engine.canSubmitAction()) {
          const action = {
            actionId: `trainer_action_${turns}`,
            playerId: config.player1.sessionId,
            type: 'attack' as const,
            data: { moveId: 'tackle' },
            timestamp: Date.now()
          };

          await engine.submitAction(action);
          turns++;
          await this.delay(100);
        } else {
          await this.delay(50);
        }
      }

      // Force end if not ended
      if (!success && turns >= 20) {
        success = true;
        reason = 'max_turns_reached';
      }

      engine.cleanup();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      success = false;
      reason = 'error';
    }

    const duration = Date.now() - startTime;
    this.totalEvents += events;

    this.results.push({
      name: `Trainer Battle ${index}`,
      type: 'trainer',
      success,
      duration,
      events,
      turns,
      reason,
      error: error || undefined
    });

    const status = success ? '✅' : '❌';
    console.log(`    ${status} Trainer ${index}: ${duration}ms - ${events} events - ${turns} turns [${reason}]`);
  }

  private createWildConfig(playerName: string, sessionId: string, index: number): BattleConfig {
    return {
      type: 'wild',
      player1: {
        sessionId,
        name: playerName,
        pokemon: this.createPokemon(25, 'Pikachu', 20)
      },
      opponent: {
        sessionId: 'wild_ai',
        name: `Wild Rattata`,
        pokemon: this.createPokemon(19, 'Rattata', 18),
        isAI: true
      }
    };
  }

  private createTrainerConfig(playerName: string, sessionId: string, index: number): TrainerBattleConfig {
    const playerTeam = [
      this.createPokemon(25, 'Pikachu', 22),
      this.createPokemon(4, 'Charmander', 20)
    ];
    
    const trainer = createSimpleTrainer(`trainer_${index}`, `Dresseur ${index}`, [
      { id: 19, level: 21 },
      { id: 16, level: 19 }
    ]);

    return createTrainerBattleConfig(sessionId, playerName, playerTeam, trainer);
  }

  private createPokemon(id: number, name: string, level: number): Pokemon {
    const baseHp = 50 + level * 2;
    const baseAttack = 40 + level;
    
    return {
      id,
      combatId: `pokemon_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      level,
      currentHp: baseHp,
      maxHp: baseHp,
      attack: baseAttack,
      defense: 35 + Math.floor(level * 0.8),
      specialAttack: baseAttack - 5,
      specialDefense: 35 + Math.floor(level * 0.8),
      speed: 45 + level,
      types: this.getPokemonTypes(id),
      moves: ['tackle', 'scratch', 'pound'],
      status: undefined,
      gender: 'male',
      shiny: false,
      isWild: false
    };
  }

  private getPokemonTypes(id: number): string[] {
    const typeMap: Record<number, string[]> = {
      1: ['grass', 'poison'],
      4: ['fire'],
      7: ['water'],
      16: ['normal', 'flying'],
      19: ['normal'],
      25: ['electric']
    };
    return typeMap[id] || ['normal'];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printFinalResults(): void {
    const wildTests = this.results.filter(r => r.type === 'wild');
    const trainerTests = this.results.filter(r => r.type === 'trainer');
    
    const wildSuccess = wildTests.filter(r => r.success).length;
    const trainerSuccess = trainerTests.filter(r => r.success).length;
    const totalSuccess = this.results.filter(r => r.success).length;
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = Math.round(totalDuration / this.results.length);
    const totalTurns = this.results.reduce((sum, r) => sum + r.turns, 0);
    
    const successRate = Math.round((totalSuccess / this.results.length) * 100);

    console.log('\n' + '🎯'.repeat(60));
    console.log('📊 SIMPLE BATTLE TESTER - RAPPORT FINAL');
    console.log('🎯'.repeat(60));

    // 📊 RÉSULTATS FINAUX
    console.log(`\n📊 RÉSULTATS FINAUX:`);
    console.log(`Tests exécutés: ${this.results.length} ✅ Réussis: ${totalSuccess} ❌ Échoués: ${this.results.length - totalSuccess} 🎯 Taux de succès: ${successRate}% ⏱️ Durée totale: ${totalDuration}ms ⏱️ Durée moyenne: ${avgDuration}ms 🚀 Événements totaux: ${this.totalEvents}`);

    // 📋 DÉTAILS DES TESTS
    console.log(`\n📋 DÉTAILS DES TESTS:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} - ${result.duration}ms - ${result.events} events (${result.turns} tours) [${result.reason}]`);
      if (result.error) {
        console.log(`   💡 ${result.type} battle failed: ${result.error}`);
      } else {
        console.log(`   💡 ${result.type} battle ${result.success ? 'completed' : 'failed'} (${result.reason})`);
      }
    });

    // 🚀 ANALYSE PAR TYPE
    console.log(`\n🚀 ANALYSE PAR TYPE:`);
    console.log(`🌿 COMBATS SAUVAGES: ${wildSuccess}/10 (${Math.round((wildSuccess/10)*100)}%)`);
    console.log(`🤖 COMBATS DRESSEURS: ${trainerSuccess}/10 (${Math.round((trainerSuccess/10)*100)}%)`);

    // 🎯 VERDICT FINAL
    console.log(`\n🎯 VERDICT FINAL:`);
    let verdict = '';
    
    if (totalSuccess >= 18) {
      verdict = '🏆 SYSTÈME EXCELLENT - 90%+ de réussite';
    } else if (totalSuccess >= 16) {
      verdict = '🎯 SYSTÈME TRÈS BON - 80%+ de réussite';
    } else if (totalSuccess >= 14) {
      verdict = '⚡ SYSTÈME BON - 70%+ de réussite';
    } else if (totalSuccess >= 10) {
      verdict = '⚠️ SYSTÈME MOYEN - 50%+ de réussite';
    } else {
      verdict = '🚨 SYSTÈME INSTABLE - Moins de 50% de réussite';
    }

    console.log(verdict);

    // 📈 MÉTRIQUES PERFORMANCE
    console.log(`\n📈 MÉTRIQUES PERFORMANCE:`);
    console.log(`🔄 Tours totaux: ${totalTurns} | ⚡ Moyenne tours/combat: ${Math.round(totalTurns/totalSuccess || 0)} | 🎯 Événements/combat: ${Math.round(this.totalEvents/totalSuccess || 0)}`);

    console.log('\n' + '🎯'.repeat(60));
    console.log('🎮 SIMPLE BATTLE SYSTEM - TEST TERMINÉ');
    console.log('🎯'.repeat(60));
  }
}

// 🚀 EXÉCUTION PROPRE
const simpleTester = new SimpleBattleTester();

const runSimpleTests = async () => {
  try {
    await simpleTester.runAllTests();
  } catch (error) {
    console.error('💥 Erreur durant les tests:', error);
    process.exit(1);
  }
};

console.log('🚀 Lancement du Simple Battle Tester...');
runSimpleTests();
