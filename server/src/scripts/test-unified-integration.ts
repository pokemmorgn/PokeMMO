// test-unified-integration.ts
// Test d'intégration complet UnifiedInterface + MerchantHandler + MongoDB Shops

import mongoose from 'mongoose';
import path from 'path';

// ===== DÉTECTION AUTOMATIQUE DES CHEMINS =====
async function loadModules() {
  try {
    console.log('🔍 [Integration] Chargement des modules...');
    
    // Chemins relatifs depuis server/src/scripts/
    const { ShopManager, ShopDataSource } = await import('../managers/ShopManager');
    const { ShopData } = await import('../models/ShopData');
    const { MerchantNpcHandler } = await import('../interactions/modules/npc/handlers/MerchantNpcHandler');
    const { UnifiedInterfaceHandler } = await import('../interactions/modules/npc/handlers/UnifiedInterfaceHandler');
    const { QuestManager } = await import('../managers/QuestManager');
    
    console.log('✅ [Integration] Tous les modules chargés !');
    return { ShopManager, ShopDataSource, ShopData, MerchantNpcHandler, UnifiedInterfaceHandler, QuestManager };
    
  } catch (error) {
    console.error('❌ [Integration] Erreur chargement modules:', error);
    throw error;
  }
}

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld';

// Données de test
const TEST_PLAYER = {
  name: 'IntegrationTestPlayer',
  gold: 10000,
  level: 25,
  x: 100,
  y: 100,
  currentZone: 'celadon_city'
};

// NPC marchand de test (simulant un NPC MongoDB avec interface unifiée)
const TEST_MERCHANT_NPC = {
  id: 2001,
  name: "Marchand Celadon",
  sprite: "merchant_celadon.png",
  x: 150,
  y: 200,
  type: "merchant",
  shopId: "pokemart_celadon_city", // Shop créé par la migration
  properties: {
    shopId: "pokemart_celadon_city",
    dialogue: ["Bienvenue au Poké Mart de Celadon !"]
  },
  sourceType: "mongodb" as const
};

// NPC multi-capacités (marchand + dialogue + quêtes potentielles)
const TEST_MULTI_NPC = {
  id: 2002,
  name: "Marchand Expert",
  sprite: "expert_merchant.png",
  x: 200,
  y: 250,
  type: "merchant",
  shopId: "department_celadon_city", // Grand magasin créé par la migration
  dialogueIds: [
    "Bonjour ! Je suis un marchand expert.",
    "Je peux vous aider avec mes articles premium.",
    "N'hésitez pas à revenir !"
  ],
  properties: {
    shopId: "department_celadon_city",
    dialogue: ["Interface multi-capacités activée !"]
  },
  sourceType: "mongodb" as const
};

// ===== CLASSE DE TEST D'INTÉGRATION =====
class IntegrationTester {
  private modules: any;
  private shopManager!: any;
  private questManager!: any;
  private merchantHandler!: any;
  private unifiedHandler!: any;
  private testResults: { [key: string]: boolean } = {};
  private errors: string[] = [];

  constructor(modules: any) {
    this.modules = modules;
    console.log('🧪 [IntegrationTester] Initialisation...');
  }

  async runIntegrationTests(): Promise<void> {
    console.log('\n🚀 === TESTS D\'INTÉGRATION INTERFACE UNIFIÉE ===\n');
    
    try {
      await this.setupEnvironment();
      await this.initializeComponents();
      
      // Tests d'intégration séquentiels
      await this.testUnifiedInterfaceBasic();
      await this.testMerchantDelegation();
      await this.testMongoDBShopIntegration();
      await this.testMultiCapabilityNPC();
      await this.testTransactionViaDelegation();
      await this.testClientDataFormat();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Erreur critique dans les tests d\'intégration:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  // === SETUP ===

  private async setupEnvironment(): Promise<void> {
    console.log('📀 [Setup] Connexion à MongoDB...');
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ [Setup] MongoDB connecté');
      
      // Vérifier qu'il y a des shops migrés
      const shopCount = await this.modules.ShopData.countDocuments();
      console.log(`📊 [Setup] Shops disponibles en base: ${shopCount}`);
      
      if (shopCount === 0) {
        throw new Error('Aucun shop en base ! Lancez d\'abord la migration.');
      }
      
    } catch (error) {
      throw new Error(`Échec setup environnement: ${error}`);
    }
  }

  private async initializeComponents(): Promise<void> {
    console.log('⚙️ [Setup] Initialisation des composants...');
    
    // Mock de l'InventoryManager
    this.setupInventoryMock();
    
    // 1. ShopManager (mode MongoDB prioritaire)
    this.shopManager = new this.modules.ShopManager(
      "../data/shops.json",
      "../data/items.json",
      {
        primaryDataSource: this.modules.ShopDataSource.MONGODB,
        enableFallback: true,
        debugMode: true,
        enableLocalization: true
      }
    );
    
    await this.shopManager.initialize();
    const loaded = await this.shopManager.waitForLoad(5000);
    if (!loaded) {
      throw new Error('ShopManager non chargé');
    }
    console.log('✅ [Setup] ShopManager initialisé');
    
    // 2. QuestManager (mock simplifié)
    this.questManager = {
      getAvailableQuests: async (): Promise<any[]> => [],
      getActiveQuests: async (): Promise<any[]> => [],
      getQuestsForNpc: (): any[] => [],
      getQuestDefinition: (): any => null
    };
    console.log('✅ [Setup] QuestManager (mock) initialisé');
    
    // 3. MerchantHandler
    this.merchantHandler = new this.modules.MerchantNpcHandler(this.shopManager, {
      debugMode: true,
      enableLocalization: true,
      waitForShopManager: false
    });
    
    const handlerReady = await this.merchantHandler.waitForReady(3000);
    console.log(`✅ [Setup] MerchantHandler initialisé (ready: ${handlerReady})`);
    
    // 4. UnifiedInterfaceHandler (avec délégation activée)
    this.unifiedHandler = new this.modules.UnifiedInterfaceHandler(
      this.questManager,
      this.shopManager,
      this.merchantHandler,
      {
        debugMode: true,
        useMerchantHandlerForShops: true, // ✅ Délégation activée
        maxCapabilitiesPerNpc: 4
      }
    );
    console.log('✅ [Setup] UnifiedInterfaceHandler initialisé avec délégation');
  }

  private setupInventoryMock(): void {
    const mockInventory: { [username: string]: { [itemId: string]: number } } = {};
    
    (global as any).InventoryManager = {
      async addItem(username: string, itemId: string, quantity: number): Promise<boolean> {
        if (!mockInventory[username]) mockInventory[username] = {};
        mockInventory[username][itemId] = (mockInventory[username][itemId] || 0) + quantity;
        console.log(`📦 [MockInventory] ${username} +${quantity}x ${itemId} = ${mockInventory[username][itemId]}`);
        return true;
      },
      
      async removeItem(username: string, itemId: string, quantity: number): Promise<boolean> {
        if (!mockInventory[username]) mockInventory[username] = {};
        const current = mockInventory[username][itemId] || 0;
        if (current >= quantity) {
          mockInventory[username][itemId] = current - quantity;
          console.log(`📦 [MockInventory] ${username} -${quantity}x ${itemId} = ${mockInventory[username][itemId]}`);
          return true;
        }
        return false;
      },
      
      async getItemCount(username: string, itemId: string): Promise<number> {
        const count = mockInventory[username]?.[itemId] || 0;
        return count;
      }
    };
  }

  // === TESTS D'INTÉGRATION ===

  private async testUnifiedInterfaceBasic(): Promise<void> {
    console.log('\n🔗 [Test 1] Interface Unifiée Basique...');
    
    try {
      // Test avec NPC marchand simple
      const result = await this.unifiedHandler.build(
        TEST_PLAYER,
        TEST_MERCHANT_NPC,
        ['merchant', 'dialogue']
      );
      
      if (!result.success) {
        throw new Error(`Interface unifiée échouée: ${result.message || 'Erreur inconnue'}`);
      }
      
      console.log(`✅ Interface construite pour ${result.npcName}`);
      console.log(`📋 Capacités: ${result.capabilities.join(', ')}`);
      console.log(`🎯 Action par défaut: ${result.defaultAction}`);
      console.log(`🔗 Interface unifiée: ${result.type}`);
      
      if (result.capabilities.includes('merchant') && !result.merchantData) {
        throw new Error('Capacité merchant détectée mais pas de merchantData');
      }
      
      if (result.merchantData) {
        console.log(`🏪 Shop ID: ${result.merchantData.shopId}`);
        console.log(`📦 Items disponibles: ${result.merchantData.availableItems.length}`);
        console.log(`💰 Or joueur: ${result.merchantData.playerGold}₽`);
      }
      
      this.testResults['unified_interface_basic'] = true;
      
    } catch (error) {
      this.errors.push(`Test interface unifiée: ${error}`);
      this.testResults['unified_interface_basic'] = false;
    }
  }

  private async testMerchantDelegation(): Promise<void> {
    console.log('\n🤝 [Test 2] Délégation MerchantHandler...');
    
    try {
      // Vérifier que UnifiedHandler délègue bien au MerchantHandler
      const isMerchantDetected = this.merchantHandler.isMerchantNpc(TEST_MERCHANT_NPC);
      
      if (!isMerchantDetected) {
        throw new Error('MerchantHandler ne détecte pas le NPC comme marchand');
      }
      console.log('✅ NPC marchand détecté par MerchantHandler');
      
      // Test de l'interface unifiée avec délégation
      const unifiedResult = await this.unifiedHandler.build(
        TEST_PLAYER,
        TEST_MERCHANT_NPC,
        ['merchant']
      );
      
      if (!unifiedResult.merchantData) {
        throw new Error('Données marchand manquantes malgré la délégation');
      }
      
      // Vérifier que les données viennent bien du MerchantHandler
      const directMerchantResult = await this.merchantHandler.handle(
        TEST_PLAYER,
        TEST_MERCHANT_NPC,
        TEST_MERCHANT_NPC.id
      );
      
      if (unifiedResult.merchantData.shopId !== directMerchantResult.shopId) {
        throw new Error('Incohérence entre délégation et appel direct MerchantHandler');
      }
      
      console.log(`✅ Délégation fonctionnelle: ${unifiedResult.merchantData.shopId}`);
      console.log(`📊 Cohérence données: ${unifiedResult.merchantData.availableItems.length} items via délégation`);
      
      this.testResults['merchant_delegation'] = true;
      
    } catch (error) {
      this.errors.push(`Test délégation: ${error}`);
      this.testResults['merchant_delegation'] = false;
    }
  }

  private async testMongoDBShopIntegration(): Promise<void> {
    console.log('\n🗄️ [Test 3] Intégration Shops MongoDB...');
    
    try {
      // Vérifier que le shop MongoDB est bien accessible
      const shopFromMongoDB = await this.modules.ShopData.findOne({ 
        shopId: 'pokemart_celadon_city' 
      });
      
      if (!shopFromMongoDB) {
        throw new Error('Shop MongoDB non trouvé (migration pas complète ?)');
      }
      console.log(`✅ Shop MongoDB trouvé: ${shopFromMongoDB.nameKey}`);
      
      // Via ShopManager
      const shopCatalog = this.shopManager.getShopCatalog('pokemart_celadon_city', TEST_PLAYER.level);
      if (!shopCatalog) {
        throw new Error('Shop non accessible via ShopManager');
      }
      console.log(`✅ Shop accessible via ShopManager: ${shopCatalog.availableItems.length} items`);
      
      // Via Interface Unifiée
      const unifiedResult = await this.unifiedHandler.build(
        TEST_PLAYER,
        TEST_MERCHANT_NPC,
        ['merchant']
      );
      
      if (!unifiedResult.merchantData || unifiedResult.merchantData.shopId !== 'pokemart_celadon_city') {
        throw new Error('Shop MongoDB non accessible via Interface Unifiée');
      }
      
      console.log(`✅ Shop MongoDB accessible via Interface Unifiée`);
      console.log(`📊 Items MongoDB → Interface: ${unifiedResult.merchantData.availableItems.length}`);
      
      // Vérifier qu'on a des items réalistes (de la migration)
      const pokeBallItem = unifiedResult.merchantData.availableItems.find((item: any) => 
        item.id === 'poke_ball' || item.id.includes('poke_ball')
      );
      
      if (!pokeBallItem) {
        throw new Error('Items attendus (poke_ball) non trouvés');
      }
      
      console.log(`✅ Items réalistes: Poké Ball à ${pokeBallItem.price}₽`);
      
      this.testResults['mongodb_shop_integration'] = true;
      
    } catch (error) {
      this.errors.push(`Test MongoDB shops: ${error}`);
      this.testResults['mongodb_shop_integration'] = false;
    }
  }

  private async testMultiCapabilityNPC(): Promise<void> {
    console.log('\n🎭 [Test 4] NPC Multi-Capacités...');
    
    try {
      // Tester avec un NPC qui a plusieurs capacités
      const result = await this.unifiedHandler.build(
        TEST_PLAYER,
        TEST_MULTI_NPC,
        ['merchant', 'dialogue']
      );
      
      if (result.capabilities.length < 2) {
        throw new Error(`Pas assez de capacités détectées: ${result.capabilities.length}`);
      }
      
      console.log(`✅ Multi-capacités détectées: ${result.capabilities.join(', ')}`);
      
      // Vérifier que les données sont présentes pour chaque capacité
      const hasMerchantData = result.capabilities.includes('merchant') && !!result.merchantData;
      const hasDialogueData = result.capabilities.includes('dialogue') && !!result.dialogueData;
      
      if (result.capabilities.includes('merchant') && !hasMerchantData) {
        throw new Error('Capacité merchant sans merchantData');
      }
      
      if (result.capabilities.includes('dialogue') && !hasDialogueData) {
        throw new Error('Capacité dialogue sans dialogueData');
      }
      
      console.log(`✅ Données cohérentes: merchant=${hasMerchantData}, dialogue=${hasDialogueData}`);
      console.log(`🎯 Action par défaut: ${result.defaultAction}`);
      console.log(`⚡ Actions rapides: ${result.quickActions?.length || 0}`);
      
      this.testResults['multi_capability_npc'] = true;
      
    } catch (error) {
      this.errors.push(`Test multi-capacités: ${error}`);
      this.testResults['multi_capability_npc'] = false;
    }
  }

  private async testTransactionViaDelegation(): Promise<void> {
    console.log('\n💰 [Test 5] Transaction via Délégation...');
    
    try {
      // Transaction via UnifiedHandler (qui délègue au MerchantHandler)
      const transactionResult = await this.unifiedHandler.handleShopTransaction(
        TEST_PLAYER,
        TEST_MERCHANT_NPC,
        'buy',
        'poke_ball',
        3
      );
      
      if (!transactionResult.success) {
        throw new Error(`Transaction échouée: ${transactionResult.message}`);
      }
      
      console.log(`✅ Transaction réussie: ${transactionResult.message}`);
      console.log(`💰 Nouvel or: ${transactionResult.newGold}₽`);
      
      if (transactionResult.dialogues && transactionResult.dialogues.length > 0) {
        console.log(`💬 Dialogue: "${transactionResult.dialogues[0]}"`);
      }
      
      if (transactionResult.dialogueKeys && transactionResult.dialogueKeys.length > 0) {
        console.log(`🌍 Localisation: ${transactionResult.dialogueKeys[0]}`);
      }
      
      // Test transaction échec (or insuffisant)
      const failedTransaction = await this.unifiedHandler.handleShopTransaction(
        { ...TEST_PLAYER, gold: 10 }, // Or insuffisant
        TEST_MERCHANT_NPC,
        'buy',
        'ultra_ball',
        10
      );
      
      if (failedTransaction.success) {
        throw new Error('Transaction devrait échouer avec or insuffisant');
      }
      
      console.log(`✅ Validation or insuffisant: ${failedTransaction.message}`);
      
      this.testResults['transaction_via_delegation'] = true;
      
    } catch (error) {
      this.errors.push(`Test transaction: ${error}`);
      this.testResults['transaction_via_delegation'] = false;
    }
  }

  private async testClientDataFormat(): Promise<void> {
    console.log('\n📱 [Test 6] Format Données Client...');
    
    try {
      const result = await this.unifiedHandler.build(
        TEST_PLAYER,
        TEST_MULTI_NPC,
        ['merchant', 'dialogue']
      );
      
      // Vérifier que le format est compatible client
      const requiredFields = ['success', 'type', 'npcId', 'npcName', 'capabilities', 'defaultAction'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Champ requis manquant: ${field}`);
        }
      }
      
      console.log('✅ Champs requis présents');
      
      // Vérifier la structure des données merchant
      if (result.merchantData) {
        const merchantRequiredFields = ['shopId', 'shopInfo', 'availableItems', 'playerGold'];
        for (const field of merchantRequiredFields) {
          if (!(field in result.merchantData)) {
            throw new Error(`Champ merchant manquant: ${field}`);
          }
        }
        console.log('✅ Structure merchantData valide');
        
        // Vérifier qu'on a des items avec les bons champs
        if (result.merchantData.availableItems.length > 0) {
          const item = result.merchantData.availableItems[0];
          const itemFields = ['id', 'name', 'price', 'stock'];
          for (const field of itemFields) {
            if (!(field in item)) {
              throw new Error(`Champ item manquant: ${field}`);
            }
          }
          console.log('✅ Structure items valide');
        }
      }
      
      // Simuler sérialisation JSON (comme envoi client)
      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);
      
      if (deserialized.npcId !== result.npcId) {
        throw new Error('Erreur sérialisation JSON');
      }
      
      console.log('✅ Sérialisation JSON fonctionnelle');
      console.log(`📊 Taille données: ${Math.round(serialized.length / 1024 * 100) / 100} KB`);
      
      this.testResults['client_data_format'] = true;
      
    } catch (error) {
      this.errors.push(`Test format client: ${error}`);
      this.testResults['client_data_format'] = false;
    }
  }

  // === RÉSULTATS ===

  private displayResults(): void {
    console.log('\n📊 === RÉSULTATS TESTS D\'INTÉGRATION ===\n');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const failedTests = totalTests - passedTests;
    
    // Afficher résultat par test
    Object.entries(this.testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const displayName = testName.replace(/_/g, ' ').toUpperCase();
      console.log(`${status} - ${displayName}`);
    });
    
    console.log(`\n📈 SCORE INTÉGRATION: ${passedTests}/${totalTests} tests passés`);
    
    if (this.errors.length > 0) {
      console.log('\n🚨 ERREURS DÉTECTÉES:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Résumé des composants testés
    console.log('\n🔗 COMPOSANTS INTÉGRÉS:');
    console.log('✅ ShopManager (MongoDB)');
    console.log('✅ MerchantNpcHandler v2.0');
    console.log('✅ UnifiedInterfaceHandler v2.0');
    console.log('✅ Délégation intelligente');
    console.log('✅ Shops MongoDB migrés');
    
    if (passedTests === totalTests) {
      console.log('\n🎉 INTÉGRATION COMPLÈTE RÉUSSIE ! 🎉');
      console.log('✅ Votre système est prêt pour les joueurs');
      console.log('🚀 Prochaine étape: Connecter au client et tester en WorldRoom');
    } else {
      console.log(`\n⚠️ ${failedTests} test(s) d\'intégration ont échoué`);
      console.log('🔧 Corrigez ces problèmes avant de passer en production');
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 [Cleanup] Fermeture des connexions...');
    
    try {
      if (this.shopManager) {
        this.shopManager.cleanup();
      }
      await mongoose.disconnect();
      console.log('✅ [Cleanup] Terminé');
    } catch (error) {
      console.error('❌ [Cleanup] Erreur:', error);
    }
  }
}

// ===== EXÉCUTION =====

async function main() {
  console.log('🚀 === TEST D\'INTÉGRATION INTERFACE UNIFIÉE ===');
  console.log('🔗 Validation de l\'intégration complète du système de shops\n');
  
  try {
    // Charger les modules
    const modules = await loadModules();
    
    // Créer et lancer les tests
    const tester = new IntegrationTester(modules);
    await tester.runIntegrationTests();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
  });
}

export { IntegrationTester };
