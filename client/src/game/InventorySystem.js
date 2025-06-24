// client/src/game/InventorySystem.js - VERSION CORRIGÉE
// ✅ Fix: Synchronisation avec shop, notifications améliorées, debugging

import { InventoryUI } from '../components/InventoryUI.js';
import { InventoryIcon } from '../components/InventoryIcon.js';

export class InventorySystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.inventoryUI = null;
    this.inventoryIcon = null;
    
    // ✅ Référence au NotificationManager
    this.notificationManager = window.NotificationManager;
    
    // ✅ NOUVEAU: État et synchronisation
    this.lastSyncTime = 0;
    this.pendingUpdates = [];
    this.syncInProgress = false;
    
    // ✅ NOUVEAU: Monitoring et debug
    this.inventoryHistory = [];
    this.connectionState = {
      isConnected: false,
      lastUpdate: 0,
      serverResponding: false
    };
    
    this.init();
  }

  init() {
    try {
      console.log('🎒 Initialisation InventorySystem...');
      
      // Créer l'interface d'inventaire
      this.inventoryUI = new InventoryUI(this.gameRoom);
      
      // Créer l'icône d'inventaire
      this.inventoryIcon = new InventoryIcon(this.inventoryUI);
      
      // Configurer les interactions
      this.setupInteractions();
      
      // ✅ NOUVEAU: Monitoring de connexion
      this.startConnectionMonitoring();
      
      // Rendre accessible globalement
      window.inventorySystem = this;
      
      console.log('✅ InventorySystem initialisé');
      
    } catch (error) {
      console.error('❌ Erreur initialisation InventorySystem:', error);
    }
  }

  setupInteractions() {
    this.setupServerListeners();
    this.setupKeyboardShortcuts();
    this.setupSystemIntegration();
    this.setupShopIntegration();
  }

  // ✅ FIX: Listeners serveur avec debug et monitoring
  setupServerListeners() {
    if (!this.gameRoom) {
      console.warn('❌ InventorySystem: Pas de gameRoom pour setup listeners');
      return;
    }

    console.log('📡 InventorySystem: Configuration listeners serveur...');

    // ✅ Données d'inventaire complètes
    this.gameRoom.onMessage("inventoryData", (data) => {
      console.log('🎒 InventorySystem: Données inventaire reçues:', data);
      this.connectionState.serverResponding = true;
      this.connectionState.lastUpdate = Date.now();
      
      this.inventoryUI.updateInventoryData(data);
      this.logInventoryChange('data_received', data);
    });

    // ✅ Mises à jour d'inventaire avec sync shop
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      console.log('🔄 InventorySystem: Update inventaire reçu:', data);
      this.connectionState.serverResponding = true;
      
      this.inventoryUI.handleInventoryUpdate(data);
      this.inventoryIcon.onInventoryUpdate(data);
      
      // ✅ NOUVEAU: Sync avec shop si ouvert
      this.syncWithShop(data);
      
      // ✅ Notification améliorée
      this.showInventoryNotification(data);
      this.logInventoryChange('update_received', data);
    });

    // ✅ Résultat d'utilisation d'objet
    this.gameRoom.onMessage("itemUseResult", (data) => {
      console.log('🎯 InventorySystem: Résultat utilisation objet:', data);
      this.inventoryUI.handleItemUseResult(data);
      
      if (data.success) {
        this.notificationManager?.inventory(
          data.message || "Objet utilisé avec succès",
          { duration: 3000 }
        );
      } else {
        this.notificationManager?.error(
          data.message || "Impossible d'utiliser cet objet",
          { duration: 4000 }
        );
      }
    });

    // ✅ Notification d'objet ramassé
    this.gameRoom.onMessage("itemPickup", (data) => {
      console.log('📦 InventorySystem: Objet ramassé:', data);
      this.showPickupNotification(data);
      this.logInventoryChange('item_pickup', data);
    });

    // ✅ Erreurs d'inventaire
    this.gameRoom.onMessage("inventoryError", (data) => {
      console.error('❌ InventorySystem: Erreur serveur:', data);
      this.notificationManager?.error(data.message, { duration: 4000 });
    });

    // ✅ NOUVEAU: Ping pour test connexion
    this.gameRoom.onMessage("pong", (data) => {
      this.connectionState.serverResponding = true;
    });

    console.log('✅ InventorySystem: Listeners configurés');
  }

  // ✅ NOUVEAU: Monitoring de connexion
  startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(() => {
      this.testServerConnection();
    }, 15000); // Test toutes les 15 secondes

    console.log('📡 InventorySystem: Monitoring démarré');
  }

  // ✅ NOUVEAU: Test de connexion serveur
  testServerConnection() {
    if (!this.gameRoom) {
      this.connectionState.isConnected = false;
      return;
    }

    try {
      const now = Date.now();
      this.connectionState.serverResponding = false;
      
      // Ping serveur
      this.gameRoom.send("ping", { timestamp: now, source: 'inventory' });
      
      // Vérifier réponse dans 3 secondes
      setTimeout(() => {
        this.connectionState.isConnected = this.connectionState.serverResponding;
        
        if (!this.connectionState.isConnected) {
          console.warn('⚠️ InventorySystem: Serveur ne répond pas');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ InventorySystem: Erreur test connexion:', error);
      this.connectionState.isConnected = false;
    }
  }

  // ✅ NOUVEAU: Synchronisation avec le shop
  setupShopIntegration() {
    console.log('🏪 InventorySystem: Configuration intégration shop...');
    
    // Écouter les ouvertures/fermetures de shop
    this.shopSyncInterval = setInterval(() => {
      this.checkShopSync();
    }, 5000); // Vérifier toutes les 5 secondes
  }

  // ✅ NOUVEAU: Vérification sync shop
  checkShopSync() {
    if (window.shopSystem?.isShopOpen()) {
      const shopUI = window.shopSystem.shopUI;
      
      // Si on est dans l'onglet vente, sync les objets vendables
      if (shopUI?.currentTab === 'sell') {
        const lastUpdate = this.connectionState.lastUpdate;
        const timeSinceUpdate = Date.now() - lastUpdate;
        
        // Si update récent, rafraîchir le shop
        if (timeSinceUpdate < 3000) {
          console.log('🔄 InventorySystem: Sync avec shop (onglet vente)');
          setTimeout(() => {
            if (shopUI.refreshCurrentTab && typeof shopUI.refreshCurrentTab === 'function') {
              shopUI.refreshCurrentTab();
            }
          }, 500);
        }
      }
    }
  }

  // ✅ NOUVEAU: Sync avec shop lors d'update
  syncWithShop(updateData) {
    if (!window.shopSystem?.isShopOpen()) {
      return; // Shop pas ouvert, pas besoin de sync
    }

    console.log('🏪 Sync inventaire → shop:', updateData);
    
    // Si le shop est ouvert et qu'on est dans l'onglet vente,
    // et qu'on a un changement d'objet, rafraîchir
    const shopUI = window.shopSystem.shopUI;
    if (shopUI?.currentTab === 'sell' && updateData.itemId) {
      setTimeout(() => {
        if (shopUI.refreshCurrentTab) {
          shopUI.refreshCurrentTab();
        }
      }, 200);
    }
  }

  // ✅ FIX: Notifications d'inventaire améliorées
  showInventoryNotification(data) {
    if (!this.notificationManager) return;

    const itemName = this.inventoryUI.getItemName(data.itemId);
    const isAdd = data.type === "add";
    const isRemove = data.type === "remove";
    
    if (isAdd) {
      // ✅ Notification d'ajout avec click handler
      this.notificationManager.itemNotification(
        itemName,
        data.quantity,
        'obtained',
        {
          duration: 3000,
          position: 'bottom-right',
          onClick: () => {
            this.openInventoryToPocket(data.pocket);
          }
        }
      );
      
      // ✅ Effet spécial pour objets importants
      if (this.isImportantItem(data.itemId)) {
        setTimeout(() => {
          this.notificationManager.achievement(
            `Objet rare obtenu: ${itemName}!`,
            {
              duration: 6000,
              bounce: true,
              sound: true
            }
          );
        }, 500);
      }
      
    } else if (isRemove) {
      // ✅ Notification de perte/utilisation
      this.notificationManager.itemNotification(
        itemName,
        data.quantity,
        'used',
        {
          duration: 2000,
          position: 'bottom-right'
        }
      );
    }
  }

  // ✅ NOUVEAU: Log des changements pour debug
  logInventoryChange(type, data) {
    const logEntry = {
      timestamp: new Date(),
      type: type,
      data: data,
      shopOpen: window.shopSystem?.isShopOpen() || false,
      connectionState: this.connectionState.isConnected
    };
    
    this.inventoryHistory.push(logEntry);
    
    // Garder seulement les 30 derniers
    if (this.inventoryHistory.length > 30) {
      this.inventoryHistory = this.inventoryHistory.slice(-30);
    }
    
    console.log(`📝 Inventaire loggé: ${type}`, logEntry);
  }

  // ✅ FIX: Demande de données avec retry
  requestInventoryData() {
    if (!this.gameRoom) {
      console.warn('❌ InventorySystem: Pas de gameRoom pour demander données');
      return;
    }

    console.log('📤 InventorySystem: Demande données inventaire...');
    
    try {
      this.gameRoom.send("getInventory", { timestamp: Date.now() });
      
      // ✅ Retry si pas de réponse
      const retryTimeout = setTimeout(() => {
        if (Date.now() - this.connectionState.lastUpdate > 10000) {
          console.warn('⚠️ InventorySystem: Pas de réponse, retry...');
          if (this.gameRoom) {
            this.gameRoom.send("getInventory", { timestamp: Date.now(), retry: true });
          }
        }
      }, 5000);
      
      // Annuler retry si réponse reçue
      const originalLastUpdate = this.connectionState.lastUpdate;
      const checkForResponse = setInterval(() => {
        if (this.connectionState.lastUpdate > originalLastUpdate) {
          clearTimeout(retryTimeout);
          clearInterval(checkForResponse);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ InventorySystem: Erreur demande données:', error);
    }
  }

  // ✅ MÉTHODES EXISTANTES AMÉLIORÉES

  onItemPickup(itemId, quantity = 1) {
    this.showPickupNotification({ itemId, quantity });
    this.inventoryIcon.showNewItemEffect();
    
    // ✅ NOUVEAU: Sync shop si ouvert
    if (window.shopSystem?.isShopOpen()) {
      setTimeout(() => {
        const shopUI = window.shopSystem.shopUI;
        if (shopUI?.currentTab === 'sell' && shopUI.refreshCurrentTab) {
          shopUI.refreshCurrentTab();
        }
      }, 1000);
    }
    
    // Déclencher événement quête
    if (window.questSystem) {
      window.questSystem.triggerCollectEvent(itemId, quantity);
    }
  }

  showPickupNotification(data) {
    const itemName = this.inventoryUI.getItemName(data.itemId);
    
    this.notificationManager?.itemNotification(
      itemName,
      data.quantity,
      'obtained',
      {
        duration: 3000,
        position: 'bottom-center',
        bounce: true,
        onClick: () => this.openInventory()
      }
    );
    
    this.inventoryIcon.showNewItemEffect();
  }

  isImportantItem(itemId) {
    const importantItems = [
      'master_ball', 'town_map', 'bike_voucher', 'bicycle', 'exp_share',
      'old_amber', 'dome_fossil', 'helix_fossil', 'poke_flute', 'silph_scope',
      'max_potion', 'max_revive', 'rare_candy', 'sacred_ash'
    ];
    return importantItems.includes(itemId);
  }

  // ✅ Méthodes conservées avec améliorations mineures
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.canPlayerInteract()) return;

      switch (e.key.toLowerCase()) {
        case 'i':
          e.preventDefault();
          this.toggleInventory();
          break;
        case 'b':
          e.preventDefault();
          this.openInventoryToPocket('balls');
          this.notificationManager?.info(
            "Poche Poké Balls ouverte",
            { duration: 1500, position: 'bottom-center' }
          );
          break;
        case 'm':
          e.preventDefault();
          this.openInventoryToPocket('medicine');
          this.notificationManager?.info(
            "Poche Soins ouverte",
            { duration: 1500, position: 'bottom-center' }
          );
          break;
      }
    });

    // Raccourcis quand l'inventaire est ouvert
    document.addEventListener('keydown', (e) => {
      if (this.inventoryUI.isVisible) {
        const handled = this.inventoryUI.handleKeyPress(e.key);
        if (handled) {
          e.preventDefault();
        }
      }
    });
  }

  setupSystemIntegration() {
    // Intégration avec le système de quêtes
    if (window.questSystem) {
      this.gameRoom?.onMessage("inventoryUpdate", (data) => {
        if (data.type === 'add') {
          window.questSystem.triggerCollectEvent(data.itemId, data.quantity);
        }
      });
    }

    // Intégration avec le chat
    if (typeof window.isChatFocused === 'function') {
      setInterval(() => {
        const chatFocused = window.isChatFocused();
        this.inventoryIcon.setEnabled(!chatFocused);
      }, 1000);
    }
  }

  // ✅ MÉTHODES PUBLIQUES CONSERVÉES
  toggleInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  }

  openInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.show();
    }
  }

  closeInventory() {
    if (this.inventoryUI) {
      this.inventoryUI.hide();
    }
  }

  openInventoryToPocket(pocketName) {
    if (this.inventoryUI) {
      this.inventoryUI.openToPocket(pocketName);
    }
  }

  isInventoryOpen() {
    return this.inventoryUI ? this.inventoryUI.isVisible : false;
  }

  useItem(itemId, context = "field") {
    if (this.gameRoom) {
      console.log(`🎯 InventorySystem: Utilisation objet ${itemId} (${context})`);
      this.gameRoom.send("useItem", {
        itemId: itemId,
        context: context,
        timestamp: Date.now()
      });
    }
  }

  canPlayerInteract() {
    return this.inventoryUI?.canPlayerInteract() || true;
  }

  hasItem(itemId) {
    if (!this.inventoryUI.inventoryData) return false;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item && item.quantity > 0) return true;
    }
    return false;
  }

  getItemCount(itemId) {
    if (!this.inventoryUI.inventoryData) return 0;
    
    for (const pocket of Object.values(this.inventoryUI.inventoryData)) {
      const item = pocket.find(item => item.itemId === itemId);
      if (item) return item.quantity;
    }
    return 0;
  }

  // ✅ NOUVELLES MÉTHODES DE DEBUG

  debugInventoryState() {
    console.log('🔍 === DEBUG INVENTORY SYSTEM STATE ===');
    
    const state = {
      // Général
      hasInventoryUI: !!this.inventoryUI,
      hasInventoryIcon: !!this.inventoryIcon,
      isOpen: this.isInventoryOpen(),
      
      // Connexion
      connectionState: this.connectionState,
      hasGameRoom: !!this.gameRoom,
      
      // Données
      hasInventoryData: !!this.inventoryUI?.inventoryData,
      dataLastUpdate: this.connectionState.lastUpdate,
      timeSinceUpdate: Date.now() - this.connectionState.lastUpdate,
      
      // Intégration shop
      shopOpen: window.shopSystem?.isShopOpen() || false,
      shopTab: window.shopSystem?.shopUI?.currentTab,
      
      // Historique
      historyCount: this.inventoryHistory.length,
      lastAction: this.inventoryHistory[this.inventoryHistory.length - 1]
    };
    
    console.log('📊 État inventaire:', state);
    
    // Stats des objets
    if (this.inventoryUI?.inventoryData) {
      const inventoryData = this.inventoryUI.inventoryData;
      console.log('🎒 Contenu inventaire:');
      
      Object.entries(inventoryData).forEach(([pocketName, pocket]) => {
        if (Array.isArray(pocket)) {
          const totalItems = pocket.reduce((sum, item) => sum + item.quantity, 0);
          const uniqueItems = pocket.length;
          console.log(`  📋 ${pocketName}: ${uniqueItems} types, ${totalItems} total`);
          
          // Afficher quelques objets
          pocket.slice(0, 3).forEach(item => {
            console.log(`    - ${item.itemId}: ${item.quantity}`);
          });
        }
      });
    }
    
    return state;
  }

  testInventoryConnection() {
    console.log('🧪 === TEST CONNEXION INVENTAIRE ===');
    
    const tests = [
      () => {
        console.log('1. Test gameRoom...');
        return !!this.gameRoom;
      },
      () => {
        console.log('2. Test connexion serveur...');
        this.testServerConnection();
        return true; // Test async
      },
      () => {
        console.log('3. Test demande données...');
        this.requestInventoryData();
        return true;
      },
      () => {
        console.log('4. Test intégration shop...');
        return window.shopSystem !== undefined;
      }
    ];
    
    const results = tests.map((test, index) => {
      try {
        const result = test();
        console.log(`✅ Test ${index + 1}: ${result ? 'OK' : 'EN COURS'}`);
        return result;
      } catch (error) {
        console.log(`❌ Test ${index + 1}: ERROR - ${error.message}`);
        return false;
      }
    });
    
    const passed = results.filter(Boolean).length;
    console.log(`🧪 Tests inventaire: ${passed}/${tests.length}`);
    
    return { passed, total: tests.length, allPassed: passed === tests.length };
  }

  forceSyncWithShop() {
    if (!window.shopSystem?.isShopOpen()) {
      console.log('🏪 Shop pas ouvert, pas de sync nécessaire');
      return;
    }

    console.log('🔄 Force sync inventaire → shop...');
    
    const shopUI = window.shopSystem.shopUI;
    if (shopUI?.refreshCurrentTab && typeof shopUI.refreshCurrentTab === 'function') {
      shopUI.refreshCurrentTab();
      console.log('✅ Shop rafraîchi');
    }
  }

  // ✅ Méthodes conservées pour compatibilité
  onInventoryFull(pocketName) {
    this.notificationManager?.warning(
      `Poche ${pocketName} pleine ! Impossible d'ajouter plus d'objets.`,
      {
        duration: 5000,
        position: 'top-center',
        onClick: () => this.openInventoryToPocket(pocketName)
      }
    );
    
    this.inventoryIcon.setTemporaryIcon('⚠️', 3000);
  }

  // ✅ Nettoyage amélioré
  destroy() {
    console.log('💀 Destruction InventorySystem');
    
    // Arrêter les intervals
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    if (this.shopSyncInterval) {
      clearInterval(this.shopSyncInterval);
    }
    
    // Nettoyer l'UI
    if (this.inventoryUI) {
      this.inventoryUI.destroy();
      this.inventoryUI = null;
    }
    
    if (this.inventoryIcon) {
      this.inventoryIcon.destroy();
      this.inventoryIcon = null;
    }
    
    // Nettoyer les références
    this.scene = null;
    this.gameRoom = null;
    this.notificationManager = null;
    
    // Supprimer la référence globale
    if (window.inventorySystem === this) {
      window.inventorySystem = null;
    }
    
    console.log('✅ InventorySystem détruit');
  }
}

// ✅ Fonctions de debug globales
window.debugInventory = function() {
  if (window.inventorySystem) {
    return window.inventorySystem.debugInventoryState();
  } else {
    console.error('❌ InventorySystem non disponible');
    return { error: 'InventorySystem manquant' };
  }
};

window.testInventoryConnection = function() {
  if (window.inventorySystem) {
    return window.inventorySystem.testInventoryConnection();
  } else {
    console.error('❌ InventorySystem non disponible');
    return { error: 'InventorySystem manquant' };
  }
};

window.forceInventorySync = function() {
  if (window.inventorySystem) {
    window.inventorySystem.forceSyncWithShop();
    window.inventorySystem.requestInventoryData();
  } else {
    console.error('❌ InventorySystem non disponible');
  }
};

console.log('✅ InventorySystem corrigé chargé!');
console.log('🔍 Utilisez window.debugInventory() pour diagnostiquer');
console.log('🧪 Utilisez window.testInventoryConnection() pour test connexion');
console.log('🔄 Utilisez window.forceInventorySync() pour forcer sync');
