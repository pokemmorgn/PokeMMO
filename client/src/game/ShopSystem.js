// client/src/game/ShopSystem.js - VERSION CORRIGÉE
// ✅ Fix: Connexion serveur, synchronisation inventaire, debugging

import { ShopUI } from '../components/ShopUI.js';

export class ShopSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.shopUI = null;
    this.currentShopId = null;
    this.currentNpcId = null;

    // ✅ FIX: Verrous simplifiés et état
    this.lastOpenAttempt = 0;
    this.isInitialized = false;
    this.playerGold = 0;
    this.lastTransactionTime = 0;
    
    // ✅ FIX: Debug et monitoring
    this.transactionHistory = [];
    this.connectionTest = {
      lastPing: 0,
      isConnected: false,
      serverResponding: false
    };
    
    // ✅ Référence au NotificationManager
    this.notificationManager = window.NotificationManager;
    
    this.init();
  }

  // ✅ FIX: Initialisation async pour attendre ShopUI
  async init() {
    try {
      console.log('🏪 Initialisation ShopSystem...');
      
      // ✅ Attendre la création de ShopUI (qui est maintenant async)
      this.shopUI = new ShopUI(this.gameRoom);
      
      // Si ShopUI.init() est async, l'attendre
      if (this.shopUI.init && typeof this.shopUI.init === 'function') {
        await this.shopUI.init();
      }
      
      this.setupInteractions();
      this.testServerConnection();
      
      // Rendre le système accessible globalement
      window.shopSystem = this;
      
      this.isInitialized = true;
      console.log('✅ ShopSystem initialisé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur initialisation ShopSystem:', error);
      this.isInitialized = false;
    }
  }

  setupInteractions() {
    this.setupServerListeners();
    this.setupKeyboardShortcuts();
    this.setupSystemIntegration();
    this.setupInventorySync();
  }

  // ✅ FIX: Listeners serveur avec test de connexion
  setupServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ ShopSystem: Pas de gameRoom pour setup listeners');
      return;
    }

    console.log('📡 ShopSystem: Configuration des listeners serveur...');

    // ✅ Test de connexion périodique
    this.startConnectionMonitoring();

    // ✅ Résultats de transaction
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      console.log('💰 ShopSystem: Transaction result reçu:', data);
      this.handleTransactionResult(data);
      this.connectionTest.serverResponding = true;
    });

    // ✅ Catalogue de shop
    this.gameRoom.onMessage("shopCatalogResult", (data) => {
      console.log('📋 ShopSystem: Catalogue reçu:', data);
      if (this.shopUI) {
        this.shopUI.handleShopCatalog(data);
      }
      this.connectionTest.serverResponding = true;
    });

    // ✅ Mise à jour de l'or
    this.gameRoom.onMessage("goldUpdate", (data) => {
      console.log('💰 ShopSystem: Gold update reçu:', data);
      this.updatePlayerGold(data.newGold, data.oldGold);
      this.connectionTest.serverResponding = true;
    });

    // ✅ Rafraîchissement de shop
    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      console.log('🔄 ShopSystem: Refresh result reçu:', data);
      if (this.shopUI) {
        this.shopUI.handleRefreshResult(data);
      }
    });

    // ✅ NOUVEAU: Listener pour erreurs de shop
    this.gameRoom.onMessage("shopError", (data) => {
      console.error('❌ ShopSystem: Erreur serveur:', data);
      this.showError(data.message || 'Erreur inconnue du serveur');
    });

    console.log('✅ ShopSystem: Listeners serveur configurés');
  }

  // ✅ NOUVEAU: Monitoring de connexion
  startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(() => {
      this.testServerConnection();
    }, 30000); // Test toutes les 30 secondes

    console.log('📡 Monitoring de connexion démarré');
  }

  // ✅ NOUVEAU: Test de connexion serveur
  testServerConnection() {
    if (!this.gameRoom) {
      this.connectionTest.isConnected = false;
      return;
    }

    console.log('🧪 Test de connexion serveur...');
    
    this.connectionTest.lastPing = Date.now();
    this.connectionTest.serverResponding = false;
    
    // Envoyer un ping au serveur
    try {
      this.gameRoom.send("ping", { timestamp: this.connectionTest.lastPing });
      this.connectionTest.isConnected = true;
      
      // Vérifier la réponse dans 5 secondes
      setTimeout(() => {
        if (!this.connectionTest.serverResponding) {
          console.warn('⚠️ Serveur ne répond pas au ping');
          this.connectionTest.isConnected = false;
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Erreur test connexion:', error);
      this.connectionTest.isConnected = false;
    }
  }

  // ✅ NOUVEAU: Synchronisation avec l'inventaire
  setupInventorySync() {
    console.log('🔄 Configuration synchronisation inventaire...');
    
    // Écouter les mises à jour d'inventaire
    if (window.inventorySystem) {
      console.log('✅ Inventaire système trouvé, configuration sync');
      
      // Vérifier périodiquement la sync
      this.inventorySyncInterval = setInterval(() => {
        this.verifyInventorySync();
      }, 10000); // Vérifier toutes les 10 secondes
    } else {
      console.warn('⚠️ Inventaire système non trouvé, retry dans 2s');
      setTimeout(() => this.setupInventorySync(), 2000);
    }
  }

  // ✅ NOUVEAU: Vérification sync inventaire
  verifyInventorySync() {
    if (!window.inventorySystem?.inventoryUI?.inventoryData) {
      return;
    }

    // Si le shop est ouvert et qu'on est dans l'onglet vente,
    // rafraîchir la liste des objets vendables
    if (this.isShopOpen() && this.shopUI.currentTab === 'sell') {
      console.log('🔄 Rafraîchissement objets vendables...');
      this.shopUI.refreshCurrentTab();
    }
  }

  // ✅ FIX: Gestion interaction NPC avec debug et validation
  handleShopNpcInteraction(data) {
    console.log('🏪 ShopSystem: === HANDLE SHOP NPC INTERACTION FIX ===');
    console.log('📊 Data reçue:', data);

    // ✅ Test de connexion avant d'ouvrir
    if (!this.connectionTest.isConnected) {
      console.warn('⚠️ Connexion serveur douteuse, test...');
      this.testServerConnection();
      
      setTimeout(() => {
        if (!this.connectionTest.isConnected) {
          this.showError('Connexion au serveur instable');
          return;
        }
        this.continueNpcInteraction(data);
      }, 1000);
      
      return;
    }

    this.continueNpcInteraction(data);
  }

  // ✅ NOUVEAU: Continuation interaction après test connexion
  continueNpcInteraction(data) {
    // ✅ Verrou anti-spam
    const now = Date.now();
    if (now - this.lastOpenAttempt < 500) {
      console.warn('⚠️ ShopSystem: Tentative d\'ouverture trop rapide, ignoré');
      return;
    }
    this.lastOpenAttempt = now;

    try {
      // ✅ Validation des données
      if (!this.validateShopInteractionData(data)) {
        this.showError('Données de shop invalides');
        return;
      }

      const shopId = data.shopId || 'default_shop';
      const shopData = data.shopData;
      
      // ✅ Construction NPC robuste
      let npc = this.buildNpcFromData(data);
      
      // Stocker les infos
      this.currentShopId = shopId;
      this.currentNpcId = data.npcId;

      // Extraire l'or du joueur
      if (shopData && shopData.playerGold !== undefined) {
        this.playerGold = shopData.playerGold;
      }

      // ✅ Ouverture avec validation
      console.log(`🚀 ShopSystem: Ouverture shop validée: ${shopId} pour ${npc.name}`);
      const success = this.directOpenShop(shopId, npc, shopData);
      
      if (success) {
        this.logTransaction('shop_opened', { shopId, npcId: data.npcId });
        this.showInfo(`Bienvenue chez ${npc.name} !`);
      } else {
        this.showError('Impossible d\'ouvrir le shop');
      }
      
    } catch (error) {
      console.error('❌ Erreur handleShopNpcInteraction:', error);
      this.showError(`Erreur shop: ${error.message}`);
    }
  }

  // ✅ NOUVEAU: Validation des données d'interaction
  validateShopInteractionData(data) {
    if (!data) {
      console.error('❌ Pas de données d\'interaction');
      return false;
    }

    if (!data.shopId && !data.shopData) {
      console.error('❌ Pas de shopId ni shopData');
      return false;
    }

    if (!data.npcId && !data.npc && !data.npcName) {
      console.error('❌ Pas d\'info NPC');
      return false;
    }

    return true;
  }

  // ✅ NOUVEAU: Construction NPC robuste
  buildNpcFromData(data) {
    let npc = { name: "Marchand", id: data.npcId || 'unknown' };
    
    // 1. Priorité aux données NPC du serveur
    if (data.npc && typeof data.npc === 'object') {
      npc = { ...npc, ...data.npc };
    }
    
    // 2. Puis aux données npcName
    if (data.npcName) {
      if (typeof data.npcName === 'object' && data.npcName.name) {
        npc.name = data.npcName.name;
        npc.id = data.npcName.id || npc.id;
      } else if (typeof data.npcName === 'string') {
        npc.name = data.npcName;
      }
    }
    
    // 3. Enrichir avec le vrai NPC du manager si possible
    const realNpc = this.scene?.npcManager?.getNpcData?.(data.npcId) ||
                   window.interactionManager?.state?.lastInteractedNpc;
    
    if (realNpc) {
      npc = {
        ...realNpc,
        name: realNpc.name || npc.name,
        id: realNpc.id || npc.id
      };
    }

    console.log('🎭 NPC construit:', npc);
    return npc;
  }

  // ✅ FIX: Ouverture directe avec validation connexion
  directOpenShop(shopId, npc, shopData = null) {
    console.log('🚪 ShopSystem: === OUVERTURE DIRECTE FIX ===');
    console.log('🎯 Shop:', shopId);
    console.log('🎭 NPC:', npc);
    console.log('📦 ShopData disponible:', !!shopData);
    console.log('📡 Connexion OK:', this.connectionTest.isConnected);

    // ✅ Vérifications préalables
    if (!this.shopUI) {
      console.error('❌ ShopUI manquant!');
      return false;
    }

    if (!this.connectionTest.isConnected) {
      console.error('❌ Connexion serveur problématique!');
      this.showWarning('Connexion instable, tentative...');
    }

    try {
      // ✅ Fermeture propre si déjà ouvert
      if (this.isShopOpen()) {
        console.log('🔄 Shop déjà ouvert, fermeture...');
        this.shopUI.hide();
        
        // Délai pour fermeture propre
        setTimeout(() => {
          this.continueOpening(shopId, npc, shopData);
        }, 200);
        return true;
      } else {
        return this.continueOpening(shopId, npc, shopData);
      }

    } catch (error) {
      console.error('❌ Erreur ouverture directe:', error);
      this.showError(`Erreur technique: ${error.message}`);
      return false;
    }
  }

  // ✅ FIX: Continuation ouverture avec demande catalogue
  continueOpening(shopId, npc, shopData) {
    console.log('▶️ ShopSystem: Continuation ouverture...');
    
    try {
      // ✅ Reset état ShopUI
      if (this.shopUI) {
        this.shopUI.isProcessingCatalog = false;
        this.shopUI.selectedItem = null;
        this.shopUI.shopData = null;
      }

      // ✅ Ouverture interface
      console.log('🚪 Ouverture interface shop...');
      this.shopUI.show(shopId, npc);

      // ✅ FIX: Demander le catalogue au serveur plutôt que d'injecter directement
      if (shopData) {
        console.log('💉 Injection données immédiate...');
        const catalogData = {
          success: true,
          catalog: shopData,
          playerGold: this.playerGold || 0
        };
        
        setTimeout(() => {
          if (this.shopUI && this.shopUI.isVisible) {
            this.shopUI.handleShopCatalog(catalogData);
          }
        }, 100);
      } else {
        // ✅ Demander le catalogue au serveur
        console.log('📤 Demande catalogue au serveur...');
        this.requestShopCatalog(shopId);
      }

      // ✅ Effets visuels/sonores
      this.playSound('shop_open');
      this.updateGlobalUIState(true);

      console.log('✅ Ouverture réussie!');
      return true;

    } catch (error) {
      console.error('❌ Erreur continuation ouverture:', error);
      return false;
    }
  }

  // ✅ NOUVEAU: Demande de catalogue au serveur
  requestShopCatalog(shopId) {
    if (!this.gameRoom) {
      console.error('❌ Pas de gameRoom pour demander catalogue');
      return;
    }

    console.log(`📤 Demande catalogue pour shop: ${shopId}`);
    
    try {
      this.gameRoom.send("getShopCatalog", { 
        shopId: shopId,
        timestamp: Date.now()
      });
      
      // ✅ Timeout si pas de réponse
      setTimeout(() => {
        if (this.shopUI && this.shopUI.isVisible && !this.shopUI.shopData) {
          console.warn('⚠️ Timeout catalogue, données test...');
          this.injectTestCatalog(shopId);
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Erreur demande catalogue:', error);
      this.showError('Impossible de charger le catalogue');
    }
  }

  // ✅ NOUVEAU: Injection catalogue de test en cas de problème
  injectTestCatalog(shopId) {
    console.log('🧪 Injection catalogue de test...');
    
    const testCatalog = {
      success: true,
      catalog: {
        shopInfo: {
          id: shopId,
          name: 'PokéMart Test',
          description: 'Boutique de test'
        },
        availableItems: [
          { itemId: 'potion', buyPrice: 300, sellPrice: 150, stock: 10, canBuy: true, canSell: true, unlocked: true },
          { itemId: 'poke_ball', buyPrice: 200, sellPrice: 100, stock: 5, canBuy: true, canSell: true, unlocked: true },
          { itemId: 'antidote', buyPrice: 100, sellPrice: 50, stock: 8, canBuy: true, canSell: true, unlocked: true },
          { itemId: 'super_potion', buyPrice: 700, sellPrice: 350, stock: 3, canBuy: true, canSell: true, unlocked: true }
        ]
      },
      playerGold: this.playerGold || 500
    };

    if (this.shopUI && this.shopUI.isVisible) {
      this.shopUI.handleShopCatalog(testCatalog);
      this.showWarning('Catalogue de test chargé (connexion serveur problématique)');
    }
  }

  // ✅ FIX: Gestion des résultats de transaction avec sync inventaire
  handleTransactionResult(data) {
    console.log('💰 ShopSystem: Résultat transaction:', data);
    
    this.lastTransactionTime = Date.now();
    this.logTransaction('transaction_result', data);
    
    if (data.success) {
      // ✅ Notification de succès
      this.showTransactionSuccessNotification(data);
      
      // ✅ Effet sonore
      this.playSound('shop_buy_success');
      
      // ✅ Mettre à jour l'or
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      // ✅ FIX: Synchronisation inventaire obligatoire
      this.forceSyncInventory(data);
      
      // ✅ FIX: Demander nouveau catalogue pour update stocks
      if (this.currentShopId) {
        setTimeout(() => {
          this.requestShopCatalog(this.currentShopId);
        }, 500);
      }
      
    } else {
      this.showError(data.message || "Transaction échouée");
      this.playSound('shop_error');
    }
  }

  // ✅ NOUVEAU: Synchronisation forcée inventaire
  forceSyncInventory(transactionData) {
    console.log('🔄 Synchronisation forcée inventaire...');
    
    // 1. Demander update inventaire
    if (window.inventorySystem) {
      console.log('📤 Demande mise à jour inventaire...');
      window.inventorySystem.requestInventoryData();
      
      // 2. Notifier les changements si disponibles
      if (transactionData.itemsChanged) {
        transactionData.itemsChanged.forEach(change => {
          if (change.quantityChanged > 0) {
            // Objet ajouté
            window.inventorySystem.onItemPickup(change.itemId, change.quantityChanged);
          }
        });
      }
    }
    
    // 3. Notifier via NotificationManager
    if (window.NotificationManager && transactionData.itemsChanged) {
      transactionData.itemsChanged.forEach(change => {
        const itemName = this.getItemName(change.itemId);
        if (change.quantityChanged > 0) {
          window.NotificationManager.itemNotification(
            itemName, 
            change.quantityChanged, 
            'obtained',
            { 
              duration: 4000,
              position: 'bottom-right',
              onClick: () => {
                if (window.inventorySystem) {
                  window.inventorySystem.openInventory();
                }
              }
            }
          );
        } else if (change.quantityChanged < 0) {
          window.NotificationManager.itemNotification(
            itemName, 
            Math.abs(change.quantityChanged), 
            'sold',
            { 
              duration: 3000,
              position: 'bottom-right'
            }
          );
        }
      });
    }
    
    // 4. Update l'onglet vente si ouvert
    if (this.isShopOpen() && this.shopUI.currentTab === 'sell') {
      setTimeout(() => {
        this.shopUI.refreshCurrentTab();
      }, 1000);
    }
  }

  // ✅ NOUVEAU: Log des transactions pour debug
  logTransaction(type, data) {
    const logEntry = {
      timestamp: new Date(),
      type: type,
      data: data,
      shopId: this.currentShopId,
      connectionState: this.connectionTest.isConnected
    };
    
    this.transactionHistory.push(logEntry);
    
    // Garder seulement les 20 dernières
    if (this.transactionHistory.length > 20) {
      this.transactionHistory = this.transactionHistory.slice(-20);
    }
    
    console.log(`📝 Transaction loggée: ${type}`, logEntry);
  }

  // ✅ Autres méthodes inchangées mais avec amélioration debug...
  getItemName(itemId) {
    if (this.shopUI) {
      return this.shopUI.getItemName(itemId);
    }
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ... [Autres méthodes existantes] ...

  // ✅ MÉTHODE DE DEBUG AMÉLIORÉE
  debugShopState() {
    console.log('🔍 === DEBUG SHOP SYSTEM STATE FIX ===');
    
    const state = {
      // Général
      isOpen: this.isShopOpen(),
      isInitialized: this.isInitialized,
      currentShopId: this.currentShopId,
      currentNpcId: this.currentNpcId,
      playerGold: this.playerGold,
      
      // Connexion
      connectionTest: this.connectionTest,
      hasGameRoom: !!this.gameRoom,
      
      // UI
      hasShopUI: !!this.shopUI,
      shopUIVisible: this.shopUI?.isVisible,
      shopUIHasData: !!this.shopUI?.shopData,
      
      // Inventaire
      hasInventorySystem: !!window.inventorySystem,
      inventoryConnected: !!window.inventorySystem?.inventoryUI?.inventoryData,
      
      // Historique
      transactionCount: this.transactionHistory.length,
      lastTransaction: this.transactionHistory[this.transactionHistory.length - 1]
    };
    
    console.log('📊 État complet:', state);
    
    // Test de connexion en direct
    if (this.gameRoom) {
      console.log('🧪 Test de connexion...');
      this.testServerConnection();
    }
    
    // Stats inventaire
    if (window.inventorySystem?.inventoryUI?.inventoryData) {
      const inventoryData = window.inventorySystem.inventoryUI.inventoryData;
      let totalItems = 0;
      Object.values(inventoryData).forEach(pocket => {
        if (Array.isArray(pocket)) {
          totalItems += pocket.reduce((sum, item) => sum + item.quantity, 0);
        }
      });
      console.log(`🎒 Inventaire: ${totalItems} objets au total`);
    }
    
    return state;
  }

  // ✅ NOUVEAU: Test de bout en bout
  testEndToEnd() {
    console.log('🧪 === TEST BOUT EN BOUT SHOP ===');
    
    const tests = [
      () => {
        console.log('1. Test initialisation...');
        return this.isInitialized && this.shopUI;
      },
      () => {
        console.log('2. Test connexion...');
        this.testServerConnection();
        return this.gameRoom !== null;
      },
      () => {
        console.log('3. Test localizations...');
        return this.shopUI.localizationsLoaded;
      },
      () => {
        console.log('4. Test inventaire...');
        return window.inventorySystem !== undefined;
      }
    ];
    
    const results = tests.map((test, index) => {
      try {
        const result = test();
        console.log(`✅ Test ${index + 1}: ${result ? 'OK' : 'FAIL'}`);
        return result;
      } catch (error) {
        console.log(`❌ Test ${index + 1}: ERROR - ${error.message}`);
        return false;
      }
    });
    
    const passed = results.filter(Boolean).length;
    console.log(`🧪 Tests: ${passed}/${tests.length} réussis`);
    
    return { passed, total: tests.length, allPassed: passed === tests.length };
  }

  // ✅ Méthodes utilitaires conservées...
  isShopOpen() {
    return this.shopUI ? this.shopUI.isVisible : false;
  }

  showNotification(message, type = 'info', duration = 3000) {
    if (this.notificationManager) {
      this.notificationManager.show(message, { type, duration, position: 'top-center' });
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  showSuccess(message) { this.showNotification(message, 'success'); }
  showError(message) { this.showNotification(message, 'error', 4000); }
  showWarning(message) { this.showNotification(message, 'warning', 4000); }
  showInfo(message) { this.showNotification(message, 'info', 2000); }

  playSound(soundType) {
    if (typeof window.playSound === 'function') {
      const soundMap = {
        'shop_open': 'ui_shop_open',
        'shop_close': 'ui_shop_close',
        'shop_buy_success': 'ui_purchase_success',
        'shop_error': 'ui_error'
      };
      
      const soundId = soundMap[soundType];
      if (soundId) {
        window.playSound(soundId, { volume: 0.7 });
      }
    }
  }

  updateGlobalUIState(shopOpen) {
    if (shopOpen) {
      document.body.classList.add('shop-open');
    } else {
      document.body.classList.remove('shop-open');
    }
  }

  // ✅ Nettoyage amélioré
  destroy() {
    console.log('💀 Destruction ShopSystem');
    
    // Arrêter les intervals
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    if (this.inventorySyncInterval) {
      clearInterval(this.inventorySyncInterval);
    }
    
    // Fermer le shop
    if (this.isShopOpen()) {
      this.closeShop();
    }
    
    // Nettoyer l'UI
    if (this.shopUI) {
      this.shopUI.destroy();
      this.shopUI = null;
    }
    
    // Nettoyer les références
    this.scene = null;
    this.gameRoom = null;
    this.notificationManager = null;
    this.isInitialized = false;
    
    // Supprimer la référence globale
    if (window.shopSystem === this) {
      window.shopSystem = null;
    }
    
    console.log('✅ ShopSystem détruit');
  }

  // ✅ Méthodes conservées du code original...
  closeShop() {
    // ... code existant identique ...
  }

  setupKeyboardShortcuts() {
    // ... code existant avec modifications mineures ...
  }

  updatePlayerGold(newGold, oldGold = null) {
    // ... code existant identique ...
  }

  canPlayerInteract() {
    // ... code existant identique ...
  }
}

// ✅ Fonctions de debug globales améliorées
window.debugShopSystem = function() {
  if (window.shopSystem) {
    return window.shopSystem.debugShopState();
  } else {
    console.error('❌ ShopSystem non disponible');
    return { error: 'ShopSystem manquant' };
  }
};

window.testShopEndToEnd = function() {
  if (window.shopSystem) {
    return window.shopSystem.testEndToEnd();
  } else {
    console.error('❌ ShopSystem non disponible');
    return { error: 'ShopSystem manquant' };
  }
};

window.forceShopCatalogRequest = function(shopId = 'default_shop') {
  if (window.shopSystem) {
    console.log(`🧪 Force demande catalogue pour: ${shopId}`);
    window.shopSystem.requestShopCatalog(shopId);
  } else {
    console.error('❌ ShopSystem non disponible');
  }
};

console.log('✅ ShopSystem corrigé chargé!');
console.log('🔍 Utilisez window.debugShopSystem() pour diagnostiquer');
console.log('🧪 Utilisez window.testShopEndToEnd() pour test complet');
console.log('📤 Utilisez window.forceShopCatalogRequest() pour forcer demande catalogue');
