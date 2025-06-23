// client/src/game/ShopIntegration.js - AMÉLIORATIONS POUR INTÉGRATION

// ✅ AMÉLIORER handleShopNpcInteraction
handleShopNpcInteraction(data) {
  console.log(`🏪 [ShopIntegration] === GESTION INTERACTION SHOP ===`);
  console.log(`📊 Data reçue:`, data);
  console.log(`🎯 Scene: ${this.scene.scene.key}`);
  console.log(`🛠️ ShopSystem existe: ${!!this.shopSystem}`);
  
  if (!this.shopSystem) {
    console.error(`❌ [${this.scene.scene.key}] Pas de ShopSystem pour gérer l'interaction shop`);
    this.showMessage("Système de shop non disponible", 'error');
    return;
  }

  try {
    // ✅ Validation et enrichissement des données
    const enrichedData = this.enrichShopData(data);
    console.log(`📦 [ShopIntegration] Données enrichies:`, enrichedData);
    
    // ✅ Déléguer au ShopSystem
    this.shopSystem.handleShopNpcInteraction(enrichedData);
    
    console.log(`✅ [ShopIntegration] Shop delegué avec succès`);
    
  } catch (error) {
    console.error(`❌ [${this.scene.scene.key}] Erreur gestion interaction shop:`, error);
    this.showMessage(`Erreur shop: ${error.message}`, 'error');
  }
}

// ✅ NOUVELLE MÉTHODE: Enrichir les données de shop
enrichShopData(data) {
  console.log(`🔧 [ShopIntegration] Enrichissement des données shop...`);
  
  // ✅ Données de base garanties
  const enriched = {
    type: "shop",
    npcId: data.npcId || data.id,
    npcName: data.npcName || data.name || "Marchand",
    shopId: data.shopId || data.npcId || data.id || 'general_shop',
    ...data // Préserver toutes les données originales
  };
  
  // ✅ Enrichir shopData si manquant
  if (!enriched.shopData) {
    enriched.shopData = {
      shopInfo: {
        id: enriched.shopId,
        name: enriched.npcName,
        description: "Articles pour dresseurs"
      },
      availableItems: data.availableItems || data.items || [],
      playerGold: data.playerGold || 0
    };
  }
  
  // ✅ S'assurer que shopInfo existe
  if (enriched.shopData && !enriched.shopData.shopInfo) {
    enriched.shopData.shopInfo = {
      id: enriched.shopId,
      name: enriched.npcName,
      description: "Articles pour dresseurs"
    };
  }
  
  console.log(`✅ [ShopIntegration] Données enrichies:`, {
    shopId: enriched.shopId,
    npcName: enriched.npcName,
    hasShopData: !!enriched.shopData,
    itemsCount: enriched.shopData?.availableItems?.length || 0
  });
  
  return enriched;
}

// ✅ NOUVELLE MÉTHODE: Vérifier l'état de l'intégration shop
validateShopIntegration() {
  console.log(`🔍 [ShopIntegration] === VALIDATION INTÉGRATION ===`);
  
  const checks = {
    hasShopSystem: !!this.shopSystem,
    shopSystemInitialized: this.shopSystem?.isInitialized || false,
    hasShopUI: !!this.shopSystem?.shopUI,
    hasGameRoom: !!this.shopSystem?.gameRoom,
    isInitialized: this.isInitialized,
    sceneKey: this.scene.scene.key
  };
  
  console.log(`📊 [ShopIntegration] État de l'intégration:`, checks);
  
  const isValid = checks.hasShopSystem && 
                 checks.shopSystemInitialized && 
                 checks.hasShopUI && 
                 checks.hasGameRoom && 
                 checks.isInitialized;
  
  if (!isValid) {
    console.error(`❌ [ShopIntegration] Intégration invalide:`, checks);
    return false;
  }
  
  console.log(`✅ [ShopIntegration] Intégration valide`);
  return true;
}

// ✅ AMÉLIORER initialize pour plus de robustesse
initialize(networkManager) {
  if (this.isInitialized || !networkManager) {
    console.log(`🏪 [${this.scene.scene.key}] Shop déjà initialisé ou pas de NetworkManager`);
    return;
  }

  try {
    console.log(`🏪 [${this.scene.scene.key}] === INITIALISATION SHOP SYSTEM ===`);

    // 1. ✅ Vérifier et réutiliser l'instance globale
    if (window.shopSystem && this.validateExistingShopSystem(window.shopSystem)) {
      console.log(`🔄 [${this.scene.scene.key}] Réutilisation du ShopSystem global existant`);
      this.shopSystem = window.shopSystem;
      this.updateShopSystemScene(networkManager);
    } else {
      // 2. ✅ Créer une nouvelle instance
      console.log(`🆕 [${this.scene.scene.key}] Création d'un nouveau ShopSystem`);
      this.shopSystem = new ShopSystem(this.scene, networkManager.room);
      window.shopSystem = this.shopSystem;
    }

    // 3. ✅ Setup des événements et raccourcis
    this.setupShopEventHandlers();
    this.setupShopNetworkHandlers(networkManager);

    // 4. ✅ Marquer comme initialisé
    this.isInitialized = true;
    
    // 5. ✅ Validation finale
    if (this.validateShopIntegration()) {
      console.log(`✅ [${this.scene.scene.key}] ShopIntegration initialisé avec succès`);
    } else {
      throw new Error("Validation de l'intégration échouée");
    }

    // 6. ✅ Test optionnel après initialisation
    this.testShopIntegration();

  } catch (error) {
    console.error(`❌ [${this.scene.scene.key}] Erreur initialisation ShopIntegration:`, error);
    this.isInitialized = false;
  }
}

// ✅ AMÉLIORER setupShopNetworkHandlers avec plus de handlers
setupShopNetworkHandlers(networkManager) {
  if (!networkManager || !networkManager.room) return;

  try {
    const room = networkManager.room;

    // ✅ Handler principal pour les interactions NPC de type shop
    room.onMessage("npcInteractionResult", (data) => {
      if (data.type === "shop" || data.shopId || (data.npcType && data.npcType === "merchant")) {
        console.log(`🏪 [${this.scene.scene.key}] Interaction shop reçue:`, data);
        this.handleShopNpcInteraction(data);
      }
    });

    // ✅ Handler pour les résultats de transaction shop
    room.onMessage("shopTransactionResult", (data) => {
      console.log(`💰 [${this.scene.scene.key}] Résultat transaction shop:`, data);
      if (this.shopSystem && this.shopSystem.handleTransactionResult) {
        this.shopSystem.handleTransactionResult(data);
      }
    });

    // ✅ Handler pour le catalogue shop
    room.onMessage("shopCatalogResult", (data) => {
      console.log(`📋 [${this.scene.scene.key}] Catalogue shop reçu:`, data);
      if (this.shopSystem && this.shopSystem.shopUI && this.shopSystem.shopUI.handleShopCatalog) {
        this.shopSystem.shopUI.handleShopCatalog(data);
      }
    });

    // ✅ Handler pour les mises à jour d'or
    room.onMessage("goldUpdate", (data) => {
      console.log(`💰 [${this.scene.scene.key}] Mise à jour or:`, data);
      if (this.shopSystem && this.shopSystem.updatePlayerGold) {
        this.shopSystem.updatePlayerGold(data.newGold, data.oldGold);
      }
    });

    // ✅ Handler pour le refresh de shop
    room.onMessage("shopRefreshResult", (data) => {
      console.log(`🔄 [${this.scene.scene.key}] Refresh shop:`, data);
      if (this.shopSystem && this.shopSystem.shopUI && this.shopSystem.shopUI.handleRefreshResult) {
        this.shopSystem.shopUI.handleRefreshResult(data);
      }
    });

    console.log(`📡 [${this.scene.scene.key}] Handlers réseau shop configurés`);
    
  } catch (error) {
    console.error(`❌ [${this.scene.scene.key}] Erreur setup handlers shop:`, error);
  }
}

// ✅ AMÉLIORER testShopIntegration pour plus de tests
testShopIntegration() {
  if (!this.shopSystem) return;

  this.scene.time.delayedCall(1000, () => {
    try {
      console.log(`🧪 [${this.scene.scene.key}] === TEST INTÉGRATION SHOP ===`);
      
      const tests = [
        {
          name: "ShopSystem exists",
          test: () => !!this.shopSystem
        },
        {
          name: "ShopSystem initialized", 
          test: () => this.shopSystem.isInitialized
        },
        {
          name: "ShopUI exists",
          test: () => !!this.shopSystem.shopUI
        },
        {
          name: "GameRoom connection",
          test: () => !!this.shopSystem.gameRoom
        },
        {
          name: "Integration initialized",
          test: () => this.isInitialized
        },
        {
          name: "CanPlayerInteract works",
          test: () => typeof this.shopSystem.canPlayerInteract === 'function'
        },
        {
          name: "HandleShopNpcInteraction works",
          test: () => typeof this.shopSystem.handleShopNpcInteraction === 'function'
        }
      ];

      const results = tests.map(test => {
        try {
          const result = test.test();
          console.log(`  ✅ ${test.name}: ${result ? 'PASS' : 'FAIL'}`);
          return result;
        } catch (error) {
          console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
          return false;
        }
      });

      const passedTests = results.filter(Boolean).length;
      const totalTests = tests.length;

      console.log(`🧪 [${this.scene.scene.key}] Tests shop: ${passedTests}/${totalTests} réussis`);

      if (passedTests === totalTests) {
        console.log(`✅ [${this.scene.scene.key}] Intégration shop complètement validée`);
        
        // ✅ Test bonus: essayer une interaction factice
        this.testMockShopInteraction();
      } else {
        console.warn(`⚠️ [${this.scene.scene.key}] Intégration shop partiellement fonctionnelle (${passedTests}/${totalTests})`);
      }

    } catch (error) {
      console.error(`❌ [${this.scene.scene.key}] Erreur test intégration shop:`, error);
    }
  });
}

// ✅ NOUVELLE MÉTHODE: Test d'interaction factice
testMockShopInteraction() {
  if (!this.shopSystem || !this.validateShopIntegration()) {
    console.log(`⚠️ [${this.scene.scene.key}] Skip test mock - intégration non valide`);
    return;
  }
  
  console.log(`🧪 [${this.scene.scene.key}] Test interaction shop factice...`);
  
  // ✅ Créer des données d'interaction factices
  const mockData = {
    type: "shop",
    npcId: "test_merchant",
    npcName: "Marchand Test",
    shopId: "test_shop",
    shopData: {
      shopInfo: {
        id: "test_shop",
        name: "Marchand Test",
        description: "Shop de test"
      },
      availableItems: [],
      playerGold: 1000
    }
  };
  
  try {
    // ✅ Tester l'enrichissement des données
    const enriched = this.enrichShopData(mockData);
    console.log(`  ✅ Enrichissement: OK`);
    
    // ✅ Tester canPlayerInteract
    const canInteract = this.shopSystem.canPlayerInteract();
    console.log(`  ✅ CanPlayerInteract: ${canInteract}`);
    
    console.log(`✅ [${this.scene.scene.key}] Test mock shop réussi`);
    
  } catch (error) {
    console.error(`❌ [${this.scene.scene.key}] Test mock shop échoué:`, error);
  }
}

// ✅ NOUVELLE MÉTHODE: Debug complet de l'état
debugShopState() {
  console.log(`🔍 [${this.scene.scene.key}] === DEBUG SHOP INTEGRATION ===`);
  console.log(`- Scene Key: ${this.scene.scene.key}`);
  console.log(`- Initialisé: ${this.isInitialized}`);
  console.log(`- ShopSystem: ${!!this.shopSystem}`);
  console.log(`- Shop ouvert: ${this.shopSystem?.isShopOpen()}`);
  console.log(`- ShopUI: ${!!this.shopSystem?.shopUI}`);
  console.log(`- GameRoom: ${!!this.shopSystem?.gameRoom}`);
  console.log(`- CanInteract: ${this.shopSystem?.canPlayerInteract()}`);
  
  if (this.shopSystem && typeof this.shopSystem.debugShopState === 'function') {
    this.shopSystem.debugShopState();
  }
  
  console.log(`=== FIN DEBUG SHOP INTEGRATION ===`);
}
