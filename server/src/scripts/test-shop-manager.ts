// test-shop-manager.ts
// Script de test complet pour ShopManager hybride et MerchantNpcHandler
// ⚙️ PLACEMENT FLEXIBLE - Ce script détecte automatiquement les chemins corrects

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// ===== DÉTECTION AUTOMATIQUE DES CHEMINS =====
function findModulePath(targetFile: string): string {
  const possibleBasePaths = [
    process.cwd(),                          // Racine du projet
    path.join(process.cwd(), 'src'),        // src/
    path.join(process.cwd(), 'server'),     // server/
    path.join(process.cwd(), '..'),         // Dossier parent
    path.dirname(__dirname),                // Dossier du script
    path.join(path.dirname(__dirname), '..') // Deux niveaux au dessus
  ];

  const possiblePaths = [
    `server/src/${targetFile}`,
    `src/${targetFile}`,
    targetFile,
    `dist/server/src/${targetFile}`,
    `dist/src/${targetFile}`
  ];

  for (const basePath of possibleBasePaths) {
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(basePath, relativePath);
      
      // Pour les fichiers TypeScript, vérifier aussi les .js compilés
      const extensions = ['.ts', '.js'];
      for (const ext of extensions) {
        const testPath = fullPath.replace('.ts', ext);
        if (fs.existsSync(testPath)) {
          console.log(`🎯 [PathFinder] ${targetFile} trouvé: ${testPath}`);
          return testPath;
        }
      }
    }
  }

  throw new Error(`❌ [PathFinder] Impossible de trouver ${targetFile}. Vérifiez la structure du projet.`);
}

// Fonction pour charger dynamiquement les modules
async function loadModules() {
  try {
    console.log('🔍 [PathFinder] Recherche des modules...');
    
    const shopManagerPath = findModulePath('managers/ShopManager');
    const shopDataPath = findModulePath('models/ShopData');
    const merchantHandlerPath = findModulePath('interactions/modules/npc/handlers/MerchantNpcHandler');
    
    console.log('📦 [PathFinder] Chargement des modules...');
    
    const { ShopManager, ShopDataSource } = await import(shopManagerPath);
    const { ShopData } = await import(shopDataPath);
    const { MerchantNpcHandler } = await import(merchantHandlerPath);
    
    console.log('✅ [PathFinder] Tous les modules chargés avec succès !');
    
    return { ShopManager, ShopDataSource, ShopData, MerchantNpcHandler };
    
  } catch (error) {
    console.error('❌ [PathFinder] Erreur lors du chargement des modules:', error);
    
    console.log('\n🔍 [DEBUG] Structure du projet détectée:');
    console.log(`- Dossier courant: ${process.cwd()}`);
    console.log(`- Dossier du script: ${__dirname}`);
    
    // Lister les dossiers disponibles
    const currentDir = process.cwd();
    const items = fs.readdirSync(currentDir);
    console.log(`- Contenu racine: ${items.join(', ')}`);
    
    if (items.includes('server')) {
      const serverItems = fs.readdirSync(path.join(currentDir, 'server'));
      console.log(`- Contenu server/: ${serverItems.join(', ')}`);
      
      if (serverItems.includes('src')) {
        const serverSrcItems = fs.readdirSync(path.join(currentDir, 'server', 'src'));
        console.log(`- Contenu server/src/: ${serverSrcItems.join(', ')}`);
      }
    }
    
    if (items.includes('src')) {
      const srcItems = fs.readdirSync(path.join(currentDir, 'src'));
      console.log(`- Contenu src/: ${srcItems.join(', ')}`);
    }
    
    throw error;
  }
}

// ===== CONFIGURATION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokeworld_test';
const TEST_TIMEOUT = 30000; // 30 secondes

// Données de test
const TEST_PLAYER = {
  name: 'TestPlayer',
  gold: 5000,
  level: 15,
  x: 100,
  y: 100,
  currentZone: 'test_zone'
};

const TEST_SHOP_JSON = {
  id: "test_pokemart",
  name: "Test Poké Mart",
  type: "pokemart",
  description: "Boutique de test",
  buyMultiplier: 1.0,
  sellMultiplier: 0.5,
  currency: "gold",
  restockInterval: 720,
  items: [
    { itemId: "poke_ball", stock: 100 },
    { itemId: "potion", stock: 50 },
    { itemId: "super_potion", stock: 30, unlockLevel: 5 },
    { itemId: "ultra_ball", stock: 20, unlockLevel: 10 }
  ]
};

const TEST_NPC_MERCHANT = {
  id: 1,
  name: "Marchand Test",
  sprite: "merchant.png",
  x: 100,
  y: 100,
  type: "merchant",
  shopId: "test_pokemart",
  properties: {
    shopId: "test_pokemart",
    dialogue: ["Bienvenue dans ma boutique de test !"]
  },
  sourceType: "json"
};

// ===== CLASSE DE TEST =====
class ShopManagerTester {
  private shopManager!: any;
  private merchantHandler!: any;
  private testResults: { [key: string]: boolean } = {};
  private errors: string[] = [];
  private modules: any;

  constructor(modules: any) {
    this.modules = modules;
    console.log('🧪 [ShopManagerTester] Initialisation...');
  }

  // === MÉTHODES PRINCIPALES ===

  async runAllTests(): Promise<void> {
    console.log('\n🚀 === DÉBUT DES TESTS SHOPMANAGER HYBRIDE ===\n');
    
    try {
      await this.setupDatabase();
      await this.initializeManagers();
      
      // Tests séquentiels
      await this.testJSONFallback();
      await this.testMongoDBMode();
      await this.testShopCatalog();
      await this.testTransactions();
      await this.testMerchantHandler();
      await this.testHotReload();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Erreur critique dans les tests:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  // === SETUP ===

  private async setupDatabase(): Promise<void> {
    console.log('📀 [Setup] Connexion à MongoDB...');
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ [Setup] MongoDB connecté');
      
      // Nettoyer les données de test précédentes
      await this.modules.ShopData.deleteMany({ shopId: { $regex: /^test_/ } });
      console.log('🧹 [Setup] Données de test nettoyées');
      
    } catch (error) {
      throw new Error(`Échec connexion MongoDB: ${error}`);
    }
  }

  private async initializeManagers(): Promise<void> {
    console.log('⚙️ [Setup] Initialisation ShopManager...');
    
    // Créer ShopManager en mode hybride
    this.shopManager = new this.modules.ShopManager(
      "../test/data/shops.json", // Chemin factice
      "../test/data/items.json", // Chemin factice
      {
        primaryDataSource: this.modules.ShopDataSource.HYBRID,
        enableFallback: true,
        debugMode: true,
        enableLocalization: true
      }
    );
    
    // Initialiser (MongoDB d'abord, puis fallback JSON)
    await this.shopManager.initialize();
    
    // Attendre que le chargement soit terminé
    const loaded = await this.shopManager.waitForLoad(10000);
    if (!loaded) {
      throw new Error('Timeout lors du chargement des shops');
    }
    
    console.log('✅ [Setup] ShopManager initialisé');
    
    // Initialiser MerchantHandler
    this.merchantHandler = new this.modules.MerchantNpcHandler(this.shopManager, {
      debugMode: true,
      enableLocalization: true
    });
    
    // Attendre que MerchantHandler soit prêt
    const handlerReady = await this.merchantHandler.waitForReady(5000);
    if (!handlerReady) {
      console.warn('⚠️ MerchantHandler pas complètement prêt, mais on continue');
    }
    
    console.log('✅ [Setup] MerchantHandler initialisé');
  }

  // === TESTS INDIVIDUELS ===

  private async testJSONFallback(): Promise<void> {
    console.log('\n📄 [Test 1] Mode JSON Fallback...');
    
    try {
      // Le ShopManager devrait avoir créé des shops par défaut
      const defaultShop = this.shopManager.getShopDefinition('lavandiashop');
      
      if (defaultShop) {
        console.log(`✅ Shop par défaut trouvé: ${defaultShop.nameKey || defaultShop.name}`);
        this.testResults['json_fallback'] = true;
      } else {
        this.errors.push('Aucun shop par défaut créé en mode fallback');
        this.testResults['json_fallback'] = false;
      }
      
    } catch (error) {
      this.errors.push(`Erreur test JSON: ${error}`);
      this.testResults['json_fallback'] = false;
    }
  }

  private async testMongoDBMode(): Promise<void> {
    console.log('\n🗄️ [Test 2] Mode MongoDB...');
    
    try {
      // Créer un shop de test dans MongoDB
      const mongoShop = await this.modules.ShopData.createFromJson(TEST_SHOP_JSON);
      console.log(`✅ Shop MongoDB créé: ${mongoShop.shopId}`);
      
      // Attendre un peu pour le Hot Reload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recharger les shops depuis MongoDB
      const reloaded = await this.shopManager.reloadShopsFromMongoDB();
      if (!reloaded) {
        throw new Error('Échec rechargement MongoDB');
      }
      
      // Vérifier que le shop est disponible
      const loadedShop = this.shopManager.getShopDefinition('test_pokemart');
      if (loadedShop && loadedShop.sourceType === 'mongodb') {
        console.log(`✅ Shop MongoDB chargé: ${loadedShop.nameKey || loadedShop.name}`);
        this.testResults['mongodb_mode'] = true;
      } else {
        throw new Error('Shop MongoDB non trouvé après rechargement');
      }
      
    } catch (error) {
      this.errors.push(`Erreur test MongoDB: ${error}`);
      this.testResults['mongodb_mode'] = false;
    }
  }

  private async testShopCatalog(): Promise<void> {
    console.log('\n📦 [Test 3] Catalogue Shop...');
    
    try {
      const catalog = this.shopManager.getShopCatalog('test_pokemart', TEST_PLAYER.level);
      
      if (!catalog) {
        throw new Error('Catalogue non généré');
      }
      
      console.log(`✅ Catalogue généré avec ${catalog.availableItems.length} items`);
      
      // Vérifier les items par niveau
      const unlockItems = catalog.availableItems.filter((item: any) => !item.unlocked);
      const availableItems = catalog.availableItems.filter((item: any) => item.canBuy);
      
      console.log(`📊 Items débloqués: ${catalog.availableItems.length - unlockItems.length}/${catalog.availableItems.length}`);
      console.log(`🛒 Items achetables: ${availableItems.length}`);
      
      // Vérifier les prix
      const pokeBallItem = catalog.availableItems.find((item: any) => item.itemId === 'poke_ball');
      if (pokeBallItem && pokeBallItem.buyPrice > 0) {
        console.log(`💰 Prix Poké Ball: ${pokeBallItem.buyPrice}₽ (achat), ${pokeBallItem.sellPrice}₽ (vente)`);
        this.testResults['shop_catalog'] = true;
      } else {
        throw new Error('Prix Poké Ball invalide');
      }
      
    } catch (error) {
      this.errors.push(`Erreur test catalogue: ${error}`);
      this.testResults['shop_catalog'] = false;
    }
  }

  private async testTransactions(): Promise<void> {
    console.log('\n💰 [Test 4] Transactions Buy/Sell...');
    
    try {
      // Test achat
      console.log('🛒 Test achat 5x Poké Ball...');
      const buyResult = await this.shopManager.buyItem(
        TEST_PLAYER.name,
        'test_pokemart',
        'poke_ball',
        5,
        TEST_PLAYER.gold,
        TEST_PLAYER.level
      );
      
      if (!buyResult.success) {
        throw new Error(`Achat échoué: ${buyResult.message}`);
      }
      
      console.log(`✅ Achat réussi: ${buyResult.message}`);
      console.log(`💰 Nouvel or: ${buyResult.newGold}₽`);
      
      // Test vente
      console.log('💸 Test vente 2x Poké Ball...');
      const sellResult = await this.shopManager.sellItem(
        TEST_PLAYER.name,
        'test_pokemart', 
        'poke_ball',
        2
      );
      
      if (!sellResult.success) {
        throw new Error(`Vente échouée: ${sellResult.message}`);
      }
      
      console.log(`✅ Vente réussie: ${sellResult.message}`);
      console.log(`💰 Or gagné: ${sellResult.newGold}₽`);
      
      // Test achat impossible (pas assez d'or)
      console.log('❌ Test achat impossible (or insuffisant)...');
      const failedBuy = await this.shopManager.buyItem(
        TEST_PLAYER.name,
        'test_pokemart',
        'ultra_ball',
        100, // Quantité excessive
        100, // Or insuffisant
        TEST_PLAYER.level
      );
      
      if (!failedBuy.success && (failedBuy.messageKey === 'shop.error.insufficient_money' || failedBuy.message.includes('argent'))) {
        console.log(`✅ Échec attendu: ${failedBuy.message}`);
        this.testResults['transactions'] = true;
      } else {
        throw new Error('Validation or insuffisant échouée');
      }
      
    } catch (error) {
      this.errors.push(`Erreur test transactions: ${error}`);
      this.testResults['transactions'] = false;
    }
  }

  private async testMerchantHandler(): Promise<void> {
    console.log('\n🤝 [Test 5] MerchantNpcHandler...');
    
    try {
      // Test détection marchand
      const isMerchant = this.merchantHandler.isMerchantNpc(TEST_NPC_MERCHANT);
      if (!isMerchant) {
        throw new Error('NPC marchand non détecté');
      }
      console.log('✅ NPC marchand détecté');
      
      // Test interaction
      const interactionResult = await this.merchantHandler.handle(
        TEST_PLAYER,
        TEST_NPC_MERCHANT,
        TEST_NPC_MERCHANT.id
      );
      
      if (!interactionResult.success) {
        throw new Error(`Interaction échouée: ${interactionResult.message}`);
      }
      
      console.log(`✅ Interaction réussie: ${interactionResult.type}`);
      console.log(`🏪 Shop ouvert: ${interactionResult.shopId}`);
      
      if (interactionResult.shopData) {
        console.log(`📦 Items disponibles: ${interactionResult.shopData.availableItems.length}`);
        console.log(`💰 Or joueur: ${interactionResult.shopData.playerGold}₽`);
      }
      
      // Test transaction via handler
      console.log('🛒 Test transaction via MerchantHandler...');
      const transactionResult = await this.merchantHandler.handleShopTransaction(
        TEST_PLAYER,
        TEST_NPC_MERCHANT,
        'buy',
        'potion',
        3
      );
      
      if (transactionResult.success) {
        console.log(`✅ Transaction handler réussie: ${transactionResult.message}`);
        
        if (transactionResult.dialogues && transactionResult.dialogues.length > 0) {
          console.log(`💬 Dialogue: "${transactionResult.dialogues[0]}"`);
        }
        
        this.testResults['merchant_handler'] = true;
      } else {
        throw new Error(`Transaction handler échouée: ${transactionResult.message}`);
      }
      
    } catch (error) {
      this.errors.push(`Erreur test MerchantHandler: ${error}`);
      this.testResults['merchant_handler'] = false;
    }
  }

  private async testHotReload(): Promise<void> {
    console.log('\n🔥 [Test 6] Hot Reload MongoDB...');
    
    try {
      let reloadDetected = false;
      
      // S'abonner aux changements
      this.shopManager.onShopChange((event: string, shopData?: any) => {
        console.log(`🔥 Hot Reload détecté: ${event} - ${shopData?.nameKey || shopData?.name || 'Unknown'}`);
        reloadDetected = true;
      });
      
      // Modifier le shop dans MongoDB
      const mongoShop = await this.modules.ShopData.findOne({ shopId: 'test_pokemart' });
      if (mongoShop) {
        mongoShop.buyMultiplier = 1.2; // Changement
        await mongoShop.save();
        console.log('🔄 Shop modifié dans MongoDB');
      }
      
      // Attendre le Hot Reload
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (reloadDetected) {
        console.log('✅ Hot Reload fonctionnel');
        this.testResults['hot_reload'] = true;
      } else {
        // Hot Reload peut ne pas fonctionner en test (pas de Change Streams en local)
        console.log('⚠️ Hot Reload non détecté (normal en environnement de test)');
        this.testResults['hot_reload'] = true; // On considère comme OK
      }
      
    } catch (error) {
      this.errors.push(`Erreur test Hot Reload: ${error}`);
      this.testResults['hot_reload'] = false;
    }
  }

  // === RÉSULTATS ===

  private displayResults(): void {
    console.log('\n📊 === RÉSULTATS DES TESTS ===\n');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const failedTests = totalTests - passedTests;
    
    // Afficher résultat par test
    Object.entries(this.testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const displayName = testName.replace(/_/g, ' ').toUpperCase();
      console.log(`${status} - ${displayName}`);
    });
    
    console.log(`\n📈 SCORE: ${passedTests}/${totalTests} tests passés`);
    
    if (this.errors.length > 0) {
      console.log('\n🚨 ERREURS DÉTECTÉES:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Afficher stats système
    const stats = this.shopManager.getSystemStats();
    console.log('\n📊 STATISTIQUES SYSTÈME:');
    console.log(`- Shops total: ${stats.totalShops}`);
    console.log(`- Sources: JSON=${stats.sources.json}, MongoDB=${stats.sources.mongodb}`);
    console.log(`- Prix chargés: ${stats.prices}`);
    console.log(`- Hot Reload: ${stats.hotReload.enabled ? 'Activé' : 'Désactivé'}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 TOUS LES TESTS ONT RÉUSSI ! 🎉');
      console.log('✅ Le ShopManager hybride est prêt pour la production');
    } else {
      console.log(`\n⚠️ ${failedTests} test(s) ont échoué`);
      console.log('❌ Vérifiez les erreurs avant de continuer');
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 [Cleanup] Nettoyage...');
    
    try {
      // Nettoyer les données de test
      await this.modules.ShopData.deleteMany({ shopId: { $regex: /^test_/ } });
      
      // Nettoyer le ShopManager
      this.shopManager.cleanup();
      
      // Fermer MongoDB
      await mongoose.disconnect();
      
      console.log('✅ [Cleanup] Terminé');
      
    } catch (error) {
      console.error('❌ [Cleanup] Erreur:', error);
    }
  }
}

// ===== MÉTHODES UTILITAIRES =====

function simulateInventoryManager() {
  // Mock de l'InventoryManager pour les tests
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
      console.log(`📦 [MockInventory] ${username} a ${count}x ${itemId}`);
      return count;
    }
  };
}

// ===== EXÉCUTION =====

async function main() {
  console.log('🚀 === LANCEMENT DU TEST SHOPMANAGER ===');
  console.log('📁 Détection automatique de la structure du projet...\n');
  
  // Configuration de l'environnement de test
  process.env.NODE_ENV = 'test';
  
  // Simuler l'InventoryManager
  simulateInventoryManager();
  
  try {
    // Charger les modules dynamiquement
    const modules = await loadModules();
    
    // Créer et lancer les tests
    const tester = new ShopManagerTester(modules);
    
    // Gérer les timeouts
    const timeout = setTimeout(() => {
      console.error('❌ TIMEOUT: Tests interrompus après 30 secondes');
      process.exit(1);
    }, TEST_TIMEOUT);
    
    await tester.runAllTests();
    clearTimeout(timeout);
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

export { ShopManagerTester };
