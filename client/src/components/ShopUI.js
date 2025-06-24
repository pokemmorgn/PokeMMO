// client/src/components/ShopUI.js - VERSION CORRIGÉE
// ✅ Fix: Connexion serveur, descriptions, inventaire et vente

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.selectedItem = null;
    this.playerGold = 0;
    this.currentTab = 'buy';
    this.itemLocalizations = {};
    this.currentLanguage = 'en';
    
    // ✅ FIX: Verrous simplifiés
    this.isProcessingCatalog = false;
    this.lastCatalogTime = 0;
    this.localizationsLoaded = false;
    
    this.init();
  }

  // ✅ FIX: Chargement async correct des localizations
  async init() {
    try {
      console.log('🏪 Initialisation ShopUI...');
      
      // ✅ Attendre le chargement des localizations
      await this.loadLocalizations();
      
      this.createShopInterface();
      this.setupEventListeners();
      this.setupServerListeners();
      
      console.log('✅ Shop interface initialisé avec localizations');
    } catch (error) {
      console.error('❌ Erreur initialisation ShopUI:', error);
      // Continuer sans localizations
      this.createShopInterface();
      this.setupEventListeners();
      this.setupServerListeners();
    }
  }

  // ✅ FIX: Chargement localizations avec gestion d'erreurs
  async loadLocalizations() {
    try {
      console.log('🌐 Chargement des localizations...');
      const response = await fetch('/localization/itemloca.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.itemLocalizations = await response.json();
      this.localizationsLoaded = true;
      
      console.log('✅ Localizations chargées:', Object.keys(this.itemLocalizations).length, 'objets');
    } catch (error) {
      console.error('❌ Erreur chargement localizations:', error);
      this.itemLocalizations = {};
      this.localizationsLoaded = false;
      
      // ✅ Créer des descriptions de fallback
      this.createFallbackLocalizations();
    }
  }

  // ✅ NOUVEAU: Descriptions de fallback
  createFallbackLocalizations() {
    const fallbackDescriptions = {
      'poke_ball': { name: 'Poké Ball', description: 'Un dispositif pour capturer les Pokémon sauvages.' },
      'great_ball': { name: 'Super Ball', description: 'Une Ball performante pour capturer les Pokémon.' },
      'ultra_ball': { name: 'Hyper Ball', description: 'Une Ball très performante.' },
      'master_ball': { name: 'Master Ball', description: 'La meilleure Ball. Ne rate jamais.' },
      'potion': { name: 'Potion', description: 'Restaure 20 PV.' },
      'super_potion': { name: 'Super Potion', description: 'Restaure 50 PV.' },
      'hyper_potion': { name: 'Hyper Potion', description: 'Restaure 200 PV.' },
      'max_potion': { name: 'Potion Max', description: 'Restaure tous les PV.' },
      'antidote': { name: 'Antidote', description: 'Soigne l\'empoisonnement.' },
      'parlyz_heal': { name: 'Anti-Para', description: 'Soigne la paralysie.' },
      'awakening': { name: 'Réveil', description: 'Réveille un Pokémon endormi.' },
      'burn_heal': { name: 'Anti-Brûle', description: 'Soigne les brûlures.' },
      'ice_heal': { name: 'Antigel', description: 'Soigne le gel.' },
      'full_restore': { name: 'Total Soin', description: 'Restaure PV et statut complètement.' }
    };

    // Créer la structure complète pour le fallback
    this.itemLocalizations = {};
    Object.keys(fallbackDescriptions).forEach(itemId => {
      this.itemLocalizations[itemId] = {
        en: fallbackDescriptions[itemId],
        fr: fallbackDescriptions[itemId] // Même chose pour toutes les langues
      };
    });

    console.log('🔧 Descriptions fallback créées pour', Object.keys(this.itemLocalizations).length, 'objets');
  }

  getItemName(itemId) {
    if (this.localizationsLoaded && this.itemLocalizations[itemId]?.en?.name) {
      return this.itemLocalizations[itemId].en.name;
    }
    
    // ✅ FIX: Meilleur fallback pour les noms
    const nameMap = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball', 
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'max_potion': 'Potion Max',
      'full_restore': 'Total Soin',
      'parlyz_heal': 'Anti-Para',
      'burn_heal': 'Anti-Brûle',
      'ice_heal': 'Antigel'
    };
    
    return nameMap[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    if (this.localizationsLoaded && this.itemLocalizations[itemId]?.en?.description) {
      return this.itemLocalizations[itemId].en.description;
    }
    
    // ✅ FIX: Descriptions de fallback détaillées
    const descMap = {
      'poke_ball': 'Un dispositif pour capturer les Pokémon sauvages.',
      'great_ball': 'Une Ball performante avec un meilleur taux de capture.',
      'ultra_ball': 'Une Ball très performante pour les Pokémon difficiles.',
      'master_ball': 'La meilleure Ball. Ne rate jamais sa cible.',
      'potion': 'Restaure 20 PV d\'un Pokémon.',
      'super_potion': 'Restaure 50 PV d\'un Pokémon.',
      'hyper_potion': 'Restaure 200 PV d\'un Pokémon.',
      'max_potion': 'Restaure tous les PV d\'un Pokémon.',
      'antidote': 'Soigne l\'empoisonnement d\'un Pokémon.',
      'parlyz_heal': 'Soigne la paralysie d\'un Pokémon.',
      'awakening': 'Réveille un Pokémon endormi.',
      'burn_heal': 'Soigne les brûlures d\'un Pokémon.',
      'ice_heal': 'Soigne le gel d\'un Pokémon.',
      'full_restore': 'Restaure complètement PV et statut d\'un Pokémon.'
    };
    
    return descMap[itemId] || 'Description non disponible.';
  }

  // ✅ FIX: Setup des listeners serveur avec debug
  setupServerListeners() {
    if (!this.gameRoom) {
      console.warn('❌ ShopUI: Pas de gameRoom pour setup listeners');
      return;
    }

    console.log('📡 ShopUI: Configuration des listeners serveur...');

    // ✅ FIX: Listeners avec debug détaillé
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      console.log('💰 ShopUI: Transaction result reçu:', data);
      this.handleTransactionResult(data);
    });

    this.gameRoom.onMessage("goldUpdate", (data) => {
      console.log('💰 ShopUI: Gold update reçu:', data);
      this.updatePlayerGold(data.newGold);
    });

    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      console.log('🔄 ShopUI: Refresh result reçu:', data);
      this.handleRefreshResult(data);
    });

    // ✅ NOUVEAU: Listener pour catalogue (au cas où)
    this.gameRoom.onMessage("shopCatalogResult", (data) => {
      console.log('📋 ShopUI: Catalogue reçu directement:', data);
      this.handleShopCatalog(data);
    });

    console.log('✅ ShopUI: Listeners serveur configurés');
  }

  // ✅ FIX: Gestion des résultats de transaction avec sync inventaire
  handleTransactionResult(data) {
    console.log('💰 ShopUI: Handling transaction result:', data);
    
    if (data.success) {
      this.showNotification(data.message || "Transaction réussie!", "success");
      
      // ✅ FIX: Mettre à jour l'or local
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      // ✅ FIX: Synchroniser avec l'inventaire
      this.syncWithInventory(data);
      
      // ✅ FIX: Rafraîchir le catalogue pour mettre à jour les stocks
      if (this.shopData?.shopInfo?.id) {
        console.log('🔄 Demande de rafraîchissement du catalogue...');
        this.gameRoom.send("getShopCatalog", { shopId: this.shopData.shopInfo.id });
      }
      
    } else {
      this.showNotification(data.message || "Transaction échouée", "error");
    }
  }

  // ✅ NOUVEAU: Synchronisation avec l'inventaire
  syncWithInventory(transactionData) {
    console.log('🔄 Synchronisation avec inventaire:', transactionData);
    
    // Notifier le système d'inventaire si disponible
    if (window.inventorySystem) {
      // Demander une mise à jour de l'inventaire
      window.inventorySystem.requestInventoryData();
      
      // Si des objets ont été achetés, déclencher l'événement de pickup
      if (transactionData.itemsChanged) {
        transactionData.itemsChanged.forEach(change => {
          if (change.quantityChanged > 0) { // Ajout d'objet
            window.inventorySystem.onItemPickup(change.itemId, change.quantityChanged);
          }
        });
      }
    }
    
    // ✅ Notifier aussi via le NotificationManager
    if (window.NotificationManager && transactionData.itemsChanged) {
      transactionData.itemsChanged.forEach(change => {
        const itemName = this.getItemName(change.itemId);
        if (change.quantityChanged > 0) {
          window.NotificationManager.itemNotification(
            itemName, 
            change.quantityChanged, 
            'obtained',
            { duration: 3000 }
          );
        }
      });
    }
  }

  // ✅ FIX: Gestion de catalogue avec structure normalisée
  handleShopCatalog(data) {
    console.log('📋 ShopUI: === HANDLE SHOP CATALOG FIX ===');
    console.log('📊 Data reçue:', data);

    // ✅ Protection contre appels multiples
    const now = Date.now();
    if (this.isProcessingCatalog && (now - this.lastCatalogTime) < 1000) {
      console.warn('⚠️ ShopUI: Catalogue déjà en traitement, ignoré');
      return;
    }
    
    this.isProcessingCatalog = true;
    this.lastCatalogTime = now;

    try {
      if (!data.success) {
        console.error('❌ ShopUI: Catalogue failed:', data.message);
        this.showNotification(data.message || "Impossible de charger le catalogue", "error");
        return;
      }

      // ✅ FIX: Normalisation robuste des données
      this.shopData = this.normalizeShopData(data);
      this.playerGold = data.playerGold || 0;

      console.log('✅ ShopData normalisée:', this.shopData);

      // ✅ Mise à jour de l'interface
      this.updatePlayerGoldDisplay();
      this.updateShopTitle(this.shopData.shopInfo || {});
      this.refreshCurrentTab();
      
      this.showNotification("Catalogue chargé!", 'success');
      
    } catch (error) {
      console.error('❌ ShopUI: Erreur handleShopCatalog:', error);
      this.showNotification(`Erreur technique: ${error.message}`, "error");
    } finally {
      setTimeout(() => {
        this.isProcessingCatalog = false;
      }, 500);
    }
  }

  // ✅ NOUVEAU: Normalisation robuste des données shop
  normalizeShopData(rawData) {
    console.log('🔧 Normalisation des données shop...');
    
    let shopData = rawData.catalog || rawData.shopData || rawData;
    
    // Assurer la structure de base
    if (!shopData.shopInfo) {
      shopData.shopInfo = {
        id: 'default_shop',
        name: 'PokéMart',
        description: 'Boutique d\'objets pour Dresseurs'
      };
    }

    // ✅ FIX: Normaliser les items disponibles
    let items = [];
    
    // Essayer différentes structures possibles
    if (shopData.availableItems && Array.isArray(shopData.availableItems)) {
      items = shopData.availableItems;
    } else if (shopData.items && Array.isArray(shopData.items)) {
      items = shopData.items;
    } else if (shopData.shopInfo?.items && Array.isArray(shopData.shopInfo.items)) {
      items = shopData.shopInfo.items;
    }

    // ✅ Normaliser chaque item
    shopData.availableItems = items.map(item => {
      // ✅ Structure d'item normalisée
      return {
        itemId: item.itemId || item.id,
        buyPrice: item.buyPrice || item.price || item.customPrice || 100,
        sellPrice: item.sellPrice || Math.floor((item.buyPrice || item.price || 100) * 0.5),
        stock: item.stock !== undefined ? item.stock : -1, // -1 = illimité
        canBuy: item.canBuy !== false,
        canSell: item.canSell !== false,
        unlocked: item.unlocked !== false,
        customPrice: item.customPrice,
        type: item.type || 'item',
        rarity: item.rarity || 'common',
        // ✅ FIX: Ajouter les données d'item pour la vente
        itemData: item.itemData || item.data || {}
      };
    });

    console.log(`✅ ${shopData.availableItems.length} items normalisés`);
    
    return shopData;
  }

  // ✅ FIX: Vente implémentée
  showSellModal() {
    if (!this.selectedItem) return;

    console.log('💰 Ouverture modal de vente pour:', this.selectedItem);

    // ✅ Vérifier que l'objet peut être vendu
    if (!this.selectedItem.canSell) {
      this.showNotification("Cet objet ne peut pas être vendu ici", "warning");
      return;
    }

    // ✅ Vérifier l'inventaire du joueur
    if (!this.playerHasItem(this.selectedItem.itemId)) {
      this.showNotification("Vous ne possédez pas cet objet", "warning");
      return;
    }

    const modal = this.overlay.querySelector('#shop-modal');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');
    const modalTitle = modal.querySelector('.modal-title');

    // ✅ Configurer pour la vente
    modalTitle.textContent = "Confirmation de Vente";
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `Prix de vente: ${this.selectedItem.sellPrice}₽`;

    // ✅ Configurer la quantité max basée sur l'inventaire
    const maxOwned = this.getPlayerItemCount(this.selectedItem.itemId);
    quantityInput.value = 1;
    quantityInput.setAttribute('max', Math.min(maxOwned, 99));

    this.updateModalTotal();
    modal.classList.remove('hidden');

    console.log(`💰 Modal vente configuré: max ${maxOwned} objets`);
  }

  // ✅ NOUVEAU: Vérifier si le joueur possède un objet
  playerHasItem(itemId) {
    if (!window.inventorySystem?.inventoryUI?.inventoryData) {
      console.warn('❌ Pas d\'accès aux données d\'inventaire');
      return false;
    }

    const inventoryData = window.inventorySystem.inventoryUI.inventoryData;
    
    // Parcourir toutes les poches
    for (const pocket of Object.values(inventoryData)) {
      if (Array.isArray(pocket)) {
        const item = pocket.find(item => item.itemId === itemId);
        if (item && item.quantity > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  // ✅ NOUVEAU: Obtenir la quantité d'un objet dans l'inventaire
  getPlayerItemCount(itemId) {
    if (!window.inventorySystem?.inventoryUI?.inventoryData) {
      return 0;
    }

    const inventoryData = window.inventorySystem.inventoryUI.inventoryData;
    
    for (const pocket of Object.values(inventoryData)) {
      if (Array.isArray(pocket)) {
        const item = pocket.find(item => item.itemId === itemId);
        if (item) {
          return item.quantity;
        }
      }
    }
    
    return 0;
  }

  // ✅ FIX: Affichage des objets de vente basé sur l'inventaire
  displaySellItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    console.log('💰 Affichage des objets vendables...');
    
    // ✅ Obtenir les objets de l'inventaire du joueur
    const playerItems = this.getPlayerSellableItems();
    
    if (playerItems.length === 0) {
      this.showEmpty("Aucun objet vendable dans votre inventaire");
      return;
    }

    console.log(`💰 ${playerItems.length} objets vendables trouvés`);

    playerItems.forEach((item, index) => {
      const itemElement = this.createSellItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  // ✅ NOUVEAU: Obtenir les objets vendables du joueur
  getPlayerSellableItems() {
    if (!window.inventorySystem?.inventoryUI?.inventoryData) {
      console.warn('❌ Pas d\'accès à l\'inventaire pour la vente');
      return [];
    }

    const inventoryData = window.inventorySystem.inventoryUI.inventoryData;
    const sellableItems = [];

    // Parcourir toutes les poches
    for (const [pocketName, pocket] of Object.entries(inventoryData)) {
      if (Array.isArray(pocket)) {
        pocket.forEach(inventoryItem => {
          if (inventoryItem.quantity > 0) {
            // Trouver l'info de vente dans le catalogue du shop
            const shopItem = this.shopData?.availableItems?.find(si => si.itemId === inventoryItem.itemId);
            
            if (shopItem && shopItem.canSell) {
              sellableItems.push({
                ...shopItem,
                playerQuantity: inventoryItem.quantity,
                pocketName: pocketName
              });
            } else {
              // ✅ Fallback: prix de vente par défaut
              sellableItems.push({
                itemId: inventoryItem.itemId,
                sellPrice: Math.floor(100 * 0.5), // Prix par défaut
                canSell: true,
                playerQuantity: inventoryItem.quantity,
                pocketName: pocketName
              });
            }
          }
        });
      }
    }

    console.log(`💰 Objets vendables trouvés:`, sellableItems.map(item => `${item.itemId} (x${item.playerQuantity})`));
    
    return sellableItems;
  }

  // ✅ FIX: Confirmation de transaction avec support vente
  confirmTransaction() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const quantityInput = modal.querySelector('#quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;

    console.log(`🛒 Confirmation transaction: ${this.currentTab} ${quantity}x ${this.selectedItem.itemId}`);

    // ✅ Validation supplémentaire pour la vente
    if (this.currentTab === 'sell') {
      const playerCount = this.getPlayerItemCount(this.selectedItem.itemId);
      if (quantity > playerCount) {
        this.showNotification(`Vous ne possédez que ${playerCount} ${this.getItemName(this.selectedItem.itemId)}`, "error");
        return;
      }
    }

    // ✅ Validation pour l'achat
    if (this.currentTab === 'buy') {
      const totalCost = quantity * this.selectedItem.buyPrice;
      if (totalCost > this.playerGold) {
        this.showNotification("Fonds insuffisants", "error");
        return;
      }
    }

    // ✅ Envoyer la transaction au serveur
    if (this.gameRoom) {
      const transactionData = {
        shopId: this.shopData?.shopInfo?.id || 'default_shop',
        action: this.currentTab,
        itemId: this.selectedItem.itemId,
        quantity: quantity
      };

      console.log('📤 Envoi transaction au serveur:', transactionData);
      
      this.gameRoom.send("shopTransaction", transactionData);
    } else {
      console.error('❌ Pas de gameRoom pour envoyer la transaction');
      this.showNotification("Erreur de connexion", "error");
    }

    this.hideModal();
  }

  // Le reste du code existant continue...
  // [Toutes les autres méthodes restent identiques]

  createShopInterface() {
    // ... code existant identique ...
  }

  addStyles() {
    // ... code existant identique ...
  }

  // ✅ MÉTHODE DE DEBUG AMÉLIORÉE
  debugShopState() {
    console.log('🔍 === DEBUG SHOP UI STATE ===');
    console.log('📊 Général:', {
      isVisible: this.isVisible,
      localizationsLoaded: this.localizationsLoaded,
      itemLocalizationsCount: Object.keys(this.itemLocalizations).length,
      hasGameRoom: !!this.gameRoom,
      playerGold: this.playerGold,
      currentTab: this.currentTab
    });

    console.log('📦 Shop Data:', {
      hasShopData: !!this.shopData,
      shopInfo: this.shopData?.shopInfo,
      itemsCount: this.shopData?.availableItems?.length || 0,
      selectedItem: this.selectedItem?.itemId
    });

    if (this.shopData?.availableItems) {
      console.log('🛍️ Objets disponibles:');
      this.shopData.availableItems.forEach(item => {
        console.log(`  - ${item.itemId}: ${item.buyPrice}₽ (vente: ${item.sellPrice}₽, stock: ${item.stock})`);
      });
    }

    console.log('🎒 Test inventaire:', {
      hasInventorySystem: !!window.inventorySystem,
      hasInventoryData: !!window.inventorySystem?.inventoryUI?.inventoryData,
      playerSellableItems: this.getPlayerSellableItems().length
    });

    return {
      isVisible: this.isVisible,
      hasData: !!this.shopData,
      localizationsLoaded: this.localizationsLoaded,
      canTrade: !!this.gameRoom
    };
  }
}

// ✅ Fonction de debug globale
window.debugShopUI = function() {
  if (window.shopSystem?.shopUI) {
    return window.shopSystem.shopUI.debugShopState();
  } else {
    console.error('❌ ShopUI non disponible');
    return { error: 'ShopUI manquant' };
  }
};

console.log('✅ ShopUI corrigé chargé!');
console.log('🔍 Utilisez window.debugShopUI() pour diagnostiquer');
