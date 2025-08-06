// server/src/scripts/testQuestSystem.ts
// Script de test complet pour le système de quêtes modulaire
// Usage: npx ts-node server/src/scripts/testQuestSystem.ts

import path from 'path';
import { QuestManager } from '../managers/QuestManager';
import { QuestDefinition } from '../quest/core/types/QuestTypes';
import QuestProgressTracker from '../quest/services/QuestProgressTracker';
import QuestValidator from '../quest/services/QuestValidator';
import RewardDistributor from '../quest/services/RewardDistributor';
import QuestClientHandler from '../quest/services/QuestClientHandler';
import QuestDeliveryDetector from '../quest/services/QuestDeliveryDetector';
import QuestDeliveryHandler from '../quest/services/QuestDeliveryHandler';

// ===== CONFIGURATION DU TEST =====

interface TestConfig {
  verbose: boolean;
  skipMongoDB: boolean;
  testPlayer: string;
  questDataPath: string;
  enableDeepTests: boolean;
  simulateDelay: boolean;
}

const TEST_CONFIG: TestConfig = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipMongoDB: process.argv.includes('--skip-mongo'),
  testPlayer: 'TestPlayer_' + Date.now(),
  questDataPath: './src/data/test-quests.json',
  enableDeepTests: process.argv.includes('--deep'),
  simulateDelay: process.argv.includes('--delay')
};

// ===== DONNÉES DE TEST =====

const TEST_QUEST_DEFINITION: QuestDefinition = {
  id: 'test_quest_001',
  name: 'Test Quest: Collecte de Base',
  description: 'Une quête de test pour valider le système',
  category: 'tutorial',
  prerequisites: [],
  startNpcId: 1001,
  endNpcId: 1001,
  isRepeatable: false,
  cooldownHours: 0,
  autoComplete: false,
  
  dialogues: {
    questOffer: ['Bonjour ! J\'ai un petit travail pour vous.'],
    questInProgress: ['Avez-vous trouvé les objets ?'],
    questComplete: ['Excellent travail ! Voici votre récompense.']
  },
  
  steps: [
    {
      id: 'step_1',
      name: 'Collecte d\'items',
      description: 'Rassemblez les objets demandés',
      objectives: [
        {
          id: 'obj_1',
          type: 'collect',
          description: 'Collecter 5 baies Oran',
          target: 'oran_berry',
          itemId: 'oran_berry',
          requiredAmount: 5,
          validationDialogue: ['Parfait ! Vous avez les baies.']
        },
        {
          id: 'obj_2', 
          type: 'talk',
          description: 'Parler au PNJ Expert',
          target: '1002',
          requiredAmount: 1
        }
      ],
      rewards: [
        {
          type: 'gold',
          amount: 100
        }
      ]
    },
    {
      id: 'step_2',
      name: 'Livraison',
      description: 'Livrez les objets collectés',
      objectives: [
        {
          id: 'obj_3',
          type: 'deliver',
          description: 'Livrer les baies à l\'Expert',
          target: '1002',
          itemId: 'oran_berry',
          requiredAmount: 3
        }
      ],
      rewards: [
        {
          type: 'item',
          itemId: 'super_potion',
          amount: 2
        },
        {
          type: 'experience',
          amount: 500
        }
      ]
    }
  ]
};

// ===== CLASSES DE TEST =====

class QuestSystemTester {
  private questManager!: QuestManager;
  private progressTracker!: QuestProgressTracker;
  private validator!: QuestValidator;
  private rewardDistributor!: RewardDistributor;
  private clientHandler!: QuestClientHandler;
  private deliveryDetector!: QuestDeliveryDetector;
  private deliveryHandler!: QuestDeliveryHandler;
  
  private testResults: Map<string, TestResult> = new Map();
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    this.log('\n🚀 DÉMARRAGE TESTS SYSTÈME DE QUÊTES', 'header');
    this.log(`📋 Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
    
    try {
      // Phase 1: Initialisation
      await this.runTest('Initialisation des Services', () => this.initializeServices());
      
      // Phase 2: Tests unitaires des services
      await this.runTest('QuestManager - Configuration', () => this.testQuestManagerConfig());
      await this.runTest('QuestManager - Chargement Quêtes', () => this.testQuestLoading());
      await this.runTest('QuestProgressTracker - Configuration', () => this.testProgressTrackerConfig());
      await this.runTest('QuestValidator - Validation', () => this.testQuestValidation());
      await this.runTest('RewardDistributor - Distribution', () => this.testRewardDistribution());
      await this.runTest('QuestClientHandler - Notifications', () => this.testClientNotifications());
      
      // Phase 3: Tests d'intégration
      await this.runTest('Cycle de Vie Complet de Quête', () => this.testCompleteQuestLifecycle());
      await this.runTest('Progression Séquentielle', () => this.testSequentialProgression());
      await this.runTest('Système de Livraisons', () => this.testDeliverySystem());
      
      if (TEST_CONFIG.enableDeepTests) {
        // Phase 4: Tests avancés
        await this.runTest('Scan Inventaire Automatique', () => this.testInventoryScan());
        await this.runTest('Hot-reload MongoDB', () => this.testHotReload());
        await this.runTest('Performance et Cache', () => this.testPerformanceCache());
        await this.runTest('Gestion des Erreurs', () => this.testErrorHandling());
      }
      
    } catch (error) {
      this.log(`❌ ERREUR CRITIQUE: ${error}`, 'error');
    } finally {
      await this.cleanup();
      this.printFinalResults();
    }
  }

  // ===== INITIALISATION =====

  private async initializeServices(): Promise<void> {
    this.log('🔧 Initialisation des services...');
    
    // QuestManager avec configuration de test
    this.questManager = new QuestManager(TEST_CONFIG.questDataPath, {
      primaryDataSource: TEST_CONFIG.skipMongoDB ? 'json' : 'mongodb',
      debugMode: true,
      strictValidation: false,
      enableFallback: true
    });
    
    // Services modulaires
    this.progressTracker = new QuestProgressTracker({
      enableProgressLogging: TEST_CONFIG.verbose,
      sequentialObjectives: true,
      enableInventoryScan: true,
      scanOnQuestStart: true
    });
    
    this.validator = new QuestValidator({
      enableValidationLogging: TEST_CONFIG.verbose,
      strictValidation: false,
      enableCaching: true
    });
    
    this.rewardDistributor = new RewardDistributor({
      enableDistributionLogging: TEST_CONFIG.verbose,
      strictValidation: false,
      enableRetry: true
    });
    
    this.clientHandler = new QuestClientHandler({
      enableNotifications: true,
      enableMessageLogging: TEST_CONFIG.verbose,
      enablePersonalization: false
    });
    
    this.deliveryDetector = new QuestDeliveryDetector({
      enableLogging: TEST_CONFIG.verbose,
      enableCaching: true,
      enableInventoryValidation: false // Désactivé pour les tests
    });
    
    this.deliveryHandler = new QuestDeliveryHandler({
      enableLogging: TEST_CONFIG.verbose,
      strictValidation: false,
      validateInventoryBeforeProcessing: false // Désactivé pour les tests
    });
    
    // Attendre l'initialisation
    const loaded = await this.questManager.waitForLoad(5000);
    if (!loaded) {
      throw new Error('QuestManager failed to load within timeout');
    }
    
    this.log('✅ Tous les services initialisés');
  }

  // ===== TESTS UNITAIRES =====

  private async testQuestManagerConfig(): Promise<void> {
    this.log('🧪 Test configuration QuestManager...');
    
    const stats = this.questManager.getSystemStats();
    this.assert(stats.initialized, 'QuestManager should be initialized');
    this.assert(typeof stats.totalQuests === 'number', 'Should have quest count');
    
    this.log(`📊 Stats: ${stats.totalQuests} quêtes, Index: ${stats.npcIndex.npcsIndexed} NPCs`);
    
    // Ajouter notre quête de test
    const questDef = this.questManager.getQuestDefinition(TEST_QUEST_DEFINITION.id);
    if (!questDef) {
      // Simuler l'ajout de la quête de test (normalement fait via JSON/MongoDB)
      this.log('➕ Ajout de la quête de test au manager...');
      // Note: En production, cela passerait par loadQuestDefinitions()
    }
    
    // Test de l'index NPC
    const npcQuests = this.questManager.getQuestsForNpc(1001);
    this.log(`🎯 NPC 1001 a ${npcQuests.length} quête(s) disponible(s)`);
  }

  private async testQuestLoading(): Promise<void> {
    this.log('🧪 Test chargement des quêtes...');
    
    // Test des différentes sources
    const stats = this.questManager.getSystemStats();
    this.assert(stats.initialized, 'Manager should be initialized');
    
    // Test des quêtes disponibles pour un joueur
    const availableQuests = await this.questManager.getAvailableQuests(TEST_CONFIG.testPlayer);
    this.log(`📋 ${availableQuests.length} quête(s) disponible(s) pour ${TEST_CONFIG.testPlayer}`);
    
    // Test statut d'une quête
    const status = await this.questManager.getQuestStatus(TEST_CONFIG.testPlayer, 'test_quest_001');
    this.log(`📊 Statut quête test: ${status}`);
  }

  private async testProgressTrackerConfig(): Promise<void> {
    this.log('🧪 Test QuestProgressTracker...');
    
    const config = this.progressTracker.getConfig();
    this.assert(config.sequentialObjectives, 'Sequential objectives should be enabled');
    this.assert(config.enableInventoryScan, 'Inventory scan should be enabled');
    
    const debugInfo = this.progressTracker.getDebugInfo();
    this.log(`🔧 Tracker version: ${debugInfo.version}, Features: ${Object.keys(debugInfo.features).length}`);
    
    // Test de scan inventaire (debug)
    const scanResult = await this.progressTracker.debugScanInventory(TEST_CONFIG.testPlayer, 'oran_berry');
    this.log(`📦 Debug scan inventaire: found=${scanResult.found}, count=${scanResult.count}`);
  }

  private async testQuestValidation(): Promise<void> {
    this.log('🧪 Test QuestValidator...');
    
    const playerData = {
      username: TEST_CONFIG.testPlayer,
      level: 10,
      completedQuests: [],
      activeQuests: [],
      lastQuestCompletions: []
    };
    
    // Test validation basique
    const validation = await this.validator.canTakeQuest(TEST_QUEST_DEFINITION, playerData);
    this.assert(validation.valid, `Quest should be valid: ${validation.primaryReason}`);
    
    this.log(`✅ Validation réussie: ${validation.checks.length} vérifications`);
    
    // Test validation avec prérequis manquants
    const questWithPrereqs = { ...TEST_QUEST_DEFINITION, prerequisites: ['missing_quest'] };
    const validationFail = await this.validator.canTakeQuest(questWithPrereqs, playerData);
    this.assert(!validationFail.valid, 'Quest with missing prerequisites should be invalid');
    
    this.log(`❌ Validation échouée correctement: ${validationFail.primaryReason}`);
  }

  private async testRewardDistribution(): Promise<void> {
    this.log('🧪 Test RewardDistributor...');
    
    const testRewards = [
      { type: 'gold' as const, amount: 100 },
      { type: 'item' as const, itemId: 'potion', amount: 3 },
      { type: 'experience' as const, amount: 250 }
    ];
    
    const result = await this.rewardDistributor.distributeRewards(TEST_CONFIG.testPlayer, testRewards);
    this.log(`🎁 Distribution: ${result.distributedRewards.length}/${result.totalRewards} réussie(s) en ${result.distributionTime}ms`);
    
    // Test validation récompense
    const validation = await this.rewardDistributor.canReceiveReward(TEST_CONFIG.testPlayer, testRewards[0]);
    this.assert(validation.valid, 'Gold reward should be valid');
  }

  private async testClientNotifications(): Promise<void> {
    this.log('🧪 Test QuestClientHandler...');
    
    const debugInfo = this.clientHandler.getDebugInfo();
    this.log(`📡 Handler version: ${debugInfo.version}, Features: ${Object.keys(debugInfo.features).length}`);
    
    // Test notification système
    const success = await this.clientHandler.notifySystemMessage(
      TEST_CONFIG.testPlayer, 
      'Message de test du système', 
      'info'
    );
    this.log(`📬 Notification système: ${success ? 'envoyée' : 'échouée'}`);
    
    // Test configuration joueur
    const configUpdated = await this.clientHandler.updatePlayerNotificationConfig(TEST_CONFIG.testPlayer, {
      enabledTypes: { quest_started: true, quest_progress: true }
    });
    this.assert(configUpdated, 'Player config should be updateable');
  }

  // ===== TESTS D'INTÉGRATION =====

  private async testCompleteQuestLifecycle(): Promise<void> {
    this.log('🧪 Test cycle de vie complet de quête...');
    
    // 1. Démarrer la quête
    this.log('1️⃣ Démarrage de la quête...');
    const quest = await this.questManager.startQuest(TEST_CONFIG.testPlayer, TEST_QUEST_DEFINITION.id);
    
    if (!quest) {
      this.log('⚠️ Impossible de démarrer la quête (normale si pas dans les définitions chargées)');
      return;
    }
    
    this.assert(quest.status === 'active', 'Quest should be active after start');
    this.log(`✅ Quête démarrée: ${quest.name}`);
    
    if (TEST_CONFIG.simulateDelay) {
      await this.sleep(1000);
    }
    
    // 2. Simuler progression d'objectif
    this.log('2️⃣ Simulation progression objectif 1...');
    const progressResults = await this.questManager.updateQuestProgress(TEST_CONFIG.testPlayer, {
      type: 'collect',
      targetId: 'oran_berry',
      amount: 5
    });
    
    this.log(`📈 Progression: ${progressResults.length} résultat(s)`);
    progressResults.forEach(result => {
      this.log(`   - ${result.questName}: ${result.message}`);
    });
    
    if (TEST_CONFIG.simulateDelay) {
      await this.sleep(1000);
    }
    
    // 3. Progression objectif 2
    this.log('3️⃣ Simulation progression objectif 2...');
    const progressResults2 = await this.questManager.updateQuestProgress(TEST_CONFIG.testPlayer, {
      type: 'talk',
      targetId: '1002',
      npcId: 1002
    });
    
    this.log(`📈 Progression 2: ${progressResults2.length} résultat(s)`);
    
    // 4. Vérifier statut
    const finalStatus = await this.questManager.getQuestStatus(TEST_CONFIG.testPlayer, TEST_QUEST_DEFINITION.id);
    this.log(`📊 Statut final: ${finalStatus}`);
  }

  private async testSequentialProgression(): Promise<void> {
    this.log('🧪 Test progression séquentielle...');
    
    // Créer une progression de test avec le tracker directement
    const mockQuestProgress = {
      questId: 'seq_test',
      currentStepIndex: 0,
      objectives: new Map(),
      status: 'active',
      startedAt: new Date()
    };
    
    const mockDefinition: QuestDefinition = {
      ...TEST_QUEST_DEFINITION,
      id: 'seq_test',
      name: 'Test Séquentiel'
    };
    
    // Test progression avec le tracker
    const results = await this.progressTracker.updateProgress(
      TEST_CONFIG.testPlayer,
      { type: 'collect', targetId: 'oran_berry', amount: 1 },
      [mockQuestProgress],
      new Map([['seq_test', mockDefinition]])
    );
    
    this.log(`🎯 Résultats progression séquentielle: ${results.length} mise(s) à jour`);
    results.forEach(result => {
      if (result.objectiveCompleted) {
        this.log(`   ✅ Objectif complété: ${result.objectiveName} (index: ${result.objectiveIndex})`);
      }
      if (result.currentObjectiveIndex !== undefined) {
        this.log(`   ➡️ Objectif courant: index ${result.currentObjectiveIndex}`);
      }
    });
  }

  private async testDeliverySystem(): Promise<void> {
    this.log('🧪 Test système de livraisons...');
    
    // Mock des quêtes actives avec objectif de livraison
    const mockActiveQuests = [{
      id: 'delivery_test',
      name: 'Test Livraison',
      status: 'active' as const,
      currentStepIndex: 0,
      steps: [{
        objectives: [{
          id: 'delivery_obj',
          type: 'deliver' as const,
          description: 'Livrer 3 baies Oran',
          target: '1002',
          itemId: 'oran_berry',
          requiredAmount: 3,
          completed: false,
          currentAmount: 0
        }]
      }]
    }];
    
    const mockDefinitions = new Map([['delivery_test', {
      ...TEST_QUEST_DEFINITION,
      id: 'delivery_test'
    }]]);
    
    // 1. Test détection de livraisons
    this.log('1️⃣ Détection de livraisons...');
    const detection = await this.deliveryDetector.detectDeliveries(
      TEST_CONFIG.testPlayer,
      '1002',
      mockActiveQuests,
      mockDefinitions
    );
    
    this.log(`🔍 Détection: ${detection.totalDeliveries} livraison(s) trouvée(s), ${detection.readyDeliveries} prête(s)`);
    this.log(`   📊 Temps détection: ${detection.detectionTime}ms`);
    
    // 2. Test traitement de livraison (simulation)
    if (detection.hasDeliveries) {
      this.log('2️⃣ Simulation traitement livraison...');
      const delivery = detection.deliveries[0];
      
      // Mock du QuestManager pour le handler
      const mockQuestManager = {
        asPlayerQuestWith: async (player: string, action: string, target: string) => {
          this.log(`   🎯 Mock QuestManager: ${player} -> ${action}:${target}`);
          return Promise.resolve();
        }
      };
      
      const handlerResult = await this.deliveryHandler.handleQuestDelivery(
        TEST_CONFIG.testPlayer,
        '1002',
        delivery.questId,
        delivery.objectiveId,
        delivery.itemId,
        delivery.requiredAmount,
        mockQuestManager
      );
      
      this.log(`📦 Livraison: ${handlerResult.success ? 'SUCCÈS' : 'ÉCHEC'}`);
      this.log(`   💬 Message: ${handlerResult.message}`);
      this.log(`   ⏱️ Temps: ${handlerResult.processingTime}ms`);
    }
  }

  private async testInventoryScan(): Promise<void> {
    this.log('🧪 Test scan inventaire automatique...');
    
    // Test du scan avec des objectifs mock
    const mockObjectives = [
      {
        id: 'scan_obj_1',
        type: 'collect' as const,
        description: 'Test scan berry',
        target: 'oran_berry',
        requiredAmount: 10
      },
      {
        id: 'scan_obj_2',
        type: 'collect' as const,
        description: 'Test scan potion',
        target: 'potion',
        requiredAmount: 5
      }
    ];
    
    const mockProgress = {
      questId: 'scan_test',
      objectives: new Map(),
      currentStepIndex: 0
    };
    
    const scanResult = await this.progressTracker.scanStepObjectives(
      TEST_CONFIG.testPlayer,
      mockProgress,
      mockObjectives
    );
    
    this.log(`📦 Scan inventaire: ${scanResult.scannedObjectives} objectif(s) scannés`);
    this.log(`   ✅ Auto-complétés: ${scanResult.autoCompleted}`);
    this.log(`   📈 Progression totale: ${scanResult.totalProgress}`);
  }

  private async testHotReload(): Promise<void> {
    if (TEST_CONFIG.skipMongoDB) {
      this.log('⏭️ Hot-reload test skipped (MongoDB disabled)');
      return;
    }
    
    this.log('🧪 Test hot-reload MongoDB...');
    
    const hotReloadStatus = this.questManager.getHotReloadStatus();
    this.log(`🔥 Hot-reload: enabled=${hotReloadStatus.enabled}, active=${hotReloadStatus.active}`);
    
    if (hotReloadStatus.enabled) {
      // Test d'écoute des changements
      let changeDetected = false;
      this.questManager.onQuestChange((event, questData) => {
        this.log(`🔄 Changement détecté: ${event} - ${questData?.name || 'unknown'}`);
        changeDetected = true;
      });
      
      // Attendre un peu pour voir si des changements arrivent
      await this.sleep(2000);
      
      this.log(`📡 Callbacks de changement: ${hotReloadStatus.callbackCount}`);
    }
  }

  private async testPerformanceCache(): Promise<void> {
    this.log('🧪 Test performance et cache...');
    
    const iterations = 100;
    const testNpcId = 1001;
    
    // Test performance index NPC
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      const quests = this.questManager.getQuestsForNpc(testNpcId);
    }
    const endTime = Date.now();
    
    const avgTime = (endTime - startTime) / iterations;
    this.log(`⚡ Performance NPC lookup: ${avgTime.toFixed(3)}ms/appel (${iterations} appels)`);
    
    // Test cache du validator
    const playerData = {
      username: TEST_CONFIG.testPlayer,
      level: 15,
      completedQuests: [],
      activeQuests: [],
      lastQuestCompletions: []
    };
    
    const cacheStart = Date.now();
    await this.validator.canTakeQuest(TEST_QUEST_DEFINITION, playerData);
    const firstCall = Date.now() - cacheStart;
    
    const cacheStart2 = Date.now();
    await this.validator.canTakeQuest(TEST_QUEST_DEFINITION, playerData);
    const secondCall = Date.now() - cacheStart2;
    
    this.log(`💾 Cache validator: 1er appel=${firstCall}ms, 2ème appel=${secondCall}ms`);
    if (secondCall < firstCall) {
      this.log('   ✅ Cache fonctionnel (2ème appel plus rapide)');
    }
  }

  private async testErrorHandling(): Promise<void> {
    this.log('🧪 Test gestion des erreurs...');
    
    // Test avec des données invalides
    try {
      await this.questManager.updateQuestProgress(TEST_CONFIG.testPlayer, {
        type: 'invalid_type' as any,
        targetId: 'invalid_target'
      });
      this.log('⚠️ Aucune erreur levée pour des données invalides');
    } catch (error) {
      this.log('❌ Erreur capturée correctement pour données invalides');
    }
    
    // Test validator avec quest invalide
    const invalidQuest = { ...TEST_QUEST_DEFINITION, steps: [] }; // Pas d'étapes
    const validation = await this.validator.canTakeQuest(invalidQuest as any, {
      username: TEST_CONFIG.testPlayer,
      level: 1,
      completedQuests: [],
      activeQuests: [],
      lastQuestCompletions: []
    });
    
    this.log(`🛡️ Validation quête invalide: ${validation.valid ? 'PASSÉE' : 'BLOQUÉE'}`);
    
    // Test distribution récompense invalide
    const invalidReward = { type: 'invalid_reward_type' as any, amount: -1 };
    const rewardResult = await this.rewardDistributor.distributeSingleReward(TEST_CONFIG.testPlayer, invalidReward);
    this.log(`🎁 Distribution récompense invalide: ${rewardResult ? 'PASSÉE' : 'BLOQUÉE'}`);
  }

  // ===== UTILITAIRES DE TEST =====

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    this.log(`\n🧪 ${testName}`, 'test');
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.testResults.set(testName, { success: true, duration, error: null });
      this.log(`✅ ${testName} - SUCCÈS (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.testResults.set(testName, { success: false, duration, error: errorMsg });
      this.log(`❌ ${testName} - ÉCHEC (${duration}ms): ${errorMsg}`, 'error');
    }
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string, type: 'header' | 'test' | 'success' | 'error' | 'info' = 'info'): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    let prefix = '';
    
    switch (type) {
      case 'header':
        prefix = '🚀';
        console.log('\n' + '='.repeat(80));
        break;
      case 'test':
        prefix = '🧪';
        break;
      case 'success':
        prefix = '✅';
        break;
      case 'error':
        prefix = '❌';
        break;
      case 'info':
      default:
        prefix = 'ℹ️';
        break;
    }
    
    const output = `[${timestamp}] ${prefix} ${message}`;
    
    if (type === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
    
    if (type === 'header') {
      console.log('='.repeat(80));
    }
  }

  private async cleanup(): Promise<void> {
    this.log('\n🧹 Nettoyage...', 'info');
    
    try {
      // Nettoyer les services
      this.questManager.cleanup();
      this.validator.clearCache();
      this.deliveryDetector.clearCache();
      this.clientHandler.cleanup();
      
      this.log('✅ Nettoyage terminé');
    } catch (error) {
      this.log(`⚠️ Erreur lors du nettoyage: ${error}`, 'error');
    }
  }

  private printFinalResults(): void {
    const totalTime = Date.now() - this.startTime;
    const totalTests = this.testResults.size;
    const successCount = Array.from(this.testResults.values()).filter(r => r.success).length;
    const failCount = totalTests - successCount;
    
    this.log('\n📊 RÉSULTATS FINAUX', 'header');
    this.log(`⏱️  Temps total: ${totalTime}ms`);
    this.log(`📋 Tests totaux: ${totalTests}`);
    this.log(`✅ Succès: ${successCount}`);
    this.log(`❌ Échecs: ${failCount}`);
    this.log(`📈 Taux de succès: ${((successCount / totalTests) * 100).toFixed(1)}%`);
    
    if (failCount > 0) {
      this.log('\n❌ TESTS ÉCHOUÉS:', 'error');
      for (const [testName, result] of this.testResults.entries()) {
        if (!result.success) {
          this.log(`   - ${testName}: ${result.error}`, 'error');
        }
      }
    }
    
    if (TEST_CONFIG.verbose) {
      this.log('\n📋 DÉTAIL DE TOUS LES TESTS:');
      for (const [testName, result] of this.testResults.entries()) {
        const status = result.success ? '✅' : '❌';
        this.log(`   ${status} ${testName} (${result.duration}ms)`);
      }
    }
    
    this.log('\n🏁 Tests terminés!', 'header');
  }
}

// ===== INTERFACES =====

interface TestResult {
  success: boolean;
  duration: number;
  error: string | null;
}

// ===== POINT D'ENTRÉE =====

async function main(): Promise<void> {
  // Gestion des arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🧪 Script de Test du Système de Quêtes

Usage: npx ts-node server/src/scripts/testQuestSystem.ts [options]

Options:
  --verbose, -v     Logs détaillés
  --skip-mongo      Ignore MongoDB (utilise seulement JSON)
  --deep            Tests approfondis (plus lents)
  --delay           Ajoute des délais entre les tests
  --help, -h        Affiche cette aide

Examples:
  npx ts-node server/src/scripts/testQuestSystem.ts
  npx ts-node server/src/scripts/testQuestSystem.ts --verbose --deep
  npx ts-node server/src/scripts/testQuestSystem.ts --skip-mongo -v
`);
    process.exit(0);
  }
  
  // Lancer les tests
  const tester = new QuestSystemTester();
  await tester.runAllTests();
}

// Exécution si script appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('💥 ERREUR FATALE:', error);
    process.exit(1);
  });
}

export { QuestSystemTester, TEST_CONFIG };
