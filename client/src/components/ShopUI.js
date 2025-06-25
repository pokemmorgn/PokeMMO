// client/src/components/ShopUI.js - COMPLETE with external CSS and sell system
// ✅ Consistent style with inventory - Blue gradients, modern animations
// ✅ CORRECTION: Localisation des descriptions d'objets
// ✅ NEW: Complete sell system integrated

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.selectedItem = null;
    this.playerGold = 0;
    this.playerInventory = [];
    this.currentTab = 'buy';
    this.itemLocalizations = {};
    this.currentLanguage = 'en';
    
    // ✅ SIMPLIFIED LOCKS
    this.isProcessingCatalog = false;
    this.lastCatalogTime = 0;
    
    // ✅ INITIALISATION ASYNCHRONE
    this.initializationPromise = this.init();
  }

  async loadLocalizations() {
    try {
      console.log('🌐 [ShopUI] Chargement des localisations...');
      const response = await fetch('/localization/itemloca.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.itemLocalizations = await response.json();
      console.log('✅ [ShopUI] Clés chargées:', Object.keys(this.itemLocalizations));
    } catch (error) {
      console.error('❌ [ShopUI] Erreur chargement localisations:', error);
      this.itemLocalizations = {};
      console.warn('⚠️ [ShopUI] Utilisation des noms/descriptions par défaut');
    }
  }

  getItemName(itemId) {
    // Sécurité : si les localisations ne sont pas encore chargées, retour fallback lisible
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      console.warn(`[ShopUI] getItemName: Localisations non chargées, retour brut pour ${itemId}`);
      return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    // Normalise l'id
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    console.warn(`⚠️ [ShopUI] Localisation manquante pour item "${normalizedId}" (langue: ${this.currentLanguage})`);
    return normalizedId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      console.warn(`[ShopUI] getItemDescription: Localisations non chargées, retour brut pour ${itemId}`);
      return 'Description not available.';
    }
    // Normalise l'id
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    console.warn(`⚠️ [ShopUI] Description manquante pour item "${normalizedId}" (langue: ${this.currentLanguage})`);
    return 'Description not available.';
  }

  async init() {
    // ✅ CHARGER LES LOCALISATIONS EN PREMIER
    await this.loadLocalizations();
    
    // ✅ Load external CSS
    this.loadShopStyles();
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Shop interface initialized with external CSS');
  }

  loadShopStyles() {
    // Check if shop styles are already loaded
    if (document.querySelector('#shop-styles') || document.querySelector('link[href*="shop.css"]')) {
      console.log('✅ [ShopUI] CSS already loaded');
      return;
    }

    // Load shop.css from public directory
    const link = document.createElement('link');
    link.id = 'shop-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/shop.css'; // Path to client/public/shop.css
    
    link.onload = () => {
      console.log('✅ [ShopUI] External shop.css loaded successfully');
    };
    
    link.onerror = () => {
      console.warn('⚠️ [ShopUI] Could not load shop.css, falling back to inline styles');
      this.addInlineStyles();
    };
    
    document.head.appendChild(link);
    console.log('🎨 [ShopUI] Loading external shop.css from /shop.css');
  }

  addInlineStyles() {
    // Fallback: add minimal inline styles if external CSS fails
    if (document.querySelector('#shop-styles-fallback')) return;

    const style = document.createElement('style');
    style.id = 'shop-styles-fallback';
    style.textContent = `
      .shop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .shop-overlay.hidden {
        display: none;
      }
      .shop-container {
        width: 90%;
        max-width: 800px;
        height: 80%;
        background: #2a3f5f;
        border: 2px solid #4a90e2;
        border-radius: 15px;
        color: white;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);
    console.log('🎨 [ShopUI] Fallback styles added');
  }

  createShopInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.className = 'shop-overlay hidden';

    overlay.innerHTML = `
      <div class="shop-container">
        <!-- Header with modern style -->
        <div class="shop-header">
          <div class="shop-title">
            <div class="shop-icon">🏪</div>
            <div class="shop-title-text">
              <span class="shop-name">PokéMart</span>
              <span class="shop-subtitle">Trainer Items</span>
            </div>
          </div>
          <div class="shop-controls">
            <div class="player-gold">
              <span class="gold-icon">💰</span>
              <span class="gold-amount">${this.playerGold}</span>
              <span class="gold-currency">₽</span>
            </div>
            <button class="shop-close-btn">✕</button>
          </div>
        </div>

        <!-- Tab navigation -->
        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="buy">
            <span class="tab-icon">🛒</span>
            <span class="tab-text">Buy</span>
          </button>
          <button class="shop-tab" data-tab="sell">
            <span class="tab-icon">💰</span>
            <span class="tab-text">Sell</span>
          </button>
        </div>

        <div class="shop-content">
          <div class="shop-items-section">
            <div class="shop-items-header">
              <span class="section-title">Available Items</span>
              <span class="items-count" id="items-count">0 items</span>
            </div>
            <div class="shop-items-grid" id="shop-items-grid">
              <!-- Items will be generated here -->
            </div>
          </div>

          <div class="shop-item-details" id="shop-item-details">
            <div class="details-header">
              <span class="details-title">Item Details</span>
            </div>
            <div class="no-selection">
              <div class="no-selection-icon">🎁</div>
              <p>Select an item to see its details</p>
            </div>
          </div>
        </div>

        <div class="shop-footer">
          <div class="shop-info">
            <div class="shop-welcome">Welcome to our shop!</div>
            <div class="shop-tip">💡 Tip: Rare items appear based on your level</div>
          </div>
          <div class="shop-actions">
            <button class="shop-btn primary" id="shop-action-btn" disabled>
              <span class="btn-icon">🛒</span>
              <span class="btn-text">Buy</span>
            </button>
            <button class="shop-btn secondary" id="shop-refresh-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Confirmation modal -->
      <div class="shop-modal hidden" id="shop-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">Purchase Confirmation</span>
          </div>
          <div class="modal-body">
            <div class="modal-item-preview">
              <span class="modal-item-icon">📦</span>
              <div class="modal-item-info">
                <span class="modal-item-name">Item Name</span>
                <span class="modal-item-price">Price: 100₽</span>
              </div>
            </div>
            <div class="modal-quantity">
              <label>Quantity:</label>
              <div class="quantity-controls">
                <button class="quantity-btn" id="qty-decrease">−</button>
                <input type="number" class="quantity-input" id="quantity-input" value="1" min="1" max="99">
                <button class="quantity-btn" id="qty-increase">+</button>
              </div>
            </div>
            <div class="modal-total">
              <span class="total-label">Total: </span>
              <span class="total-amount" id="modal-total">100₽</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" id="modal-cancel">Cancel</button>
            <button class="modal-btn confirm" id="modal-confirm">Confirm</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  setupEventListeners() {
    // Close shop
    this.overlay.querySelector('.shop-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Close with ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Tab switching
    this.overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = tab.dataset.tab;
        this.switchTab(tabType);
      });
    });

    // Action buttons
    this.overlay.querySelector('#shop-action-btn').addEventListener('click', () => {
      if (this.currentTab === 'buy') {
        this.showBuyModal();
      } else {
        this.showSellModal();
      }
    });

    this.overlay.querySelector('#shop-refresh-btn').addEventListener('click', () => {
      this.refreshShop();
    });

    // Confirmation modal
    this.setupModalListeners();

    // Close by clicking outside
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  setupModalListeners() {
    const modal = this.overlay.querySelector('#shop-modal');
    const quantityInput = modal.querySelector('#quantity-input');
    const decreaseBtn = modal.querySelector('#qty-decrease');
    const increaseBtn = modal.querySelector('#qty-increase');
    const cancelBtn = modal.querySelector('#modal-cancel');
    const confirmBtn = modal.querySelector('#modal-confirm');

    // Quantity controls
    decreaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        this.updateModalTotal();
      }
    });

    increaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      const maxValue = parseInt(quantityInput.getAttribute('max')) || 99;
      if (currentValue < maxValue) {
        quantityInput.value = currentValue + 1;
        this.updateModalTotal();
      }
    });

    quantityInput.addEventListener('input', () => {
      this.updateModalTotal();
    });

    // Modal buttons
    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    confirmBtn.addEventListener('click', () => {
      this.confirmTransaction();
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Transaction result
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      this.handleTransactionResult(data);
    });

    // Player gold update
    this.gameRoom.onMessage("goldUpdate", (data) => {
      this.updatePlayerGold(data.newGold);
    });

    // Shop refresh
    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      this.handleRefreshResult(data);
    });

    // Player inventory update for sell tab
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.updatePlayerInventory(data.inventory);
    });
  }

  // ✅ SHOW - SIMPLIFIED VERSION
  async show(shopId, npcName = "Merchant") {
    console.log(`🏪 [ShopUI] === SHOW CALLED ===`);
    console.log(`📊 shopId: ${shopId}, npcName:`, npcName);
    console.log(`📊 current isVisible: ${this.isVisible}`);

    // ✅ S'ASSURER QUE LES LOCALISATIONS SONT CHARGÉES
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // ✅ IMMEDIATE DISPLAY
    this.overlay.classList.remove('hidden');
    this.overlay.style.display = 'flex';
    this.isVisible = true;

    // ✅ SIMPLE NPC NAME HANDLING
    let displayName = "Merchant";
    if (typeof npcName === 'object' && npcName?.name) {
      displayName = npcName.name;
    } else if (typeof npcName === 'string') {
      displayName = npcName;
    }

    // ✅ IMMEDIATE TITLE UPDATE
    const shopNameElement = this.overlay.querySelector('.shop-name');
    if (shopNameElement) {
      shopNameElement.textContent = displayName;
    }

    // ✅ REQUEST CATALOG AND INVENTORY
    this.requestShopCatalog(shopId);
    this.requestPlayerInventory();

    console.log(`✅ [ShopUI] Shop displayed for ${displayName}`);
  }

  createEmptyShopItemElement() {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item shop-empty-item';
    itemElement.style.opacity = '0.6';
    itemElement.style.cursor = 'not-allowed';
    
    itemElement.innerHTML = `
      <div class="shop-item-icon">📭</div>
      <div class="shop-item-name">No Items</div>
      <div class="shop-item-price">-</div>
      <div class="shop-item-stock out">Empty</div>
    `;
    
    return itemElement;
  }
  
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.hideModal();
    this.selectedItem = null;
    this.shopData = null;
    this.updateItemDetails();
    
    console.log('🏪 Shop closed');
  }

  requestShopCatalog(shopId) {
    if (this.gameRoom) {
      this.showLoading();
      this.gameRoom.send("getShopCatalog", { shopId });
    }
  }

  requestPlayerInventory() {
    if (this.gameRoom) {
      this.gameRoom.send("getInventory");
    }
  }

  updatePlayerInventory(inventory) {
    this.playerInventory = inventory || [];
    console.log(`🎒 [ShopUI] Player inventory updated: ${this.playerInventory.length} items`);
    
    // Refresh sell tab if it's currently active
    if (this.currentTab === 'sell' && this.isVisible) {
      this.refreshCurrentTab();
    }
  }

  // ✅ HANDLE SHOP CATALOG - SIMPLIFIED AND ROBUST VERSION
  handleShopCatalog(data) {
    console.log(`🏪 [ShopUI] === HANDLE SHOP CATALOG ===`);
    console.log(`📊 Data received:`, data);

    // ✅ SIMPLE LOCK AGAINST MULTIPLE CALLS
    const now = Date.now();
    if (this.isProcessingCatalog && (now - this.lastCatalogTime) < 1000) {
      console.warn(`⚠️ [ShopUI] Catalog already being processed, ignored`);
      return;
    }
    
    this.isProcessingCatalog = true;
    this.lastCatalogTime = now;

    try {
      if (!data.success) {
        console.error('❌ [ShopUI] Shop catalog failed:', data.message);
        this.showNotification(data.message || "Unable to load shop", "error");
        return;
      }

      // ✅ DATA STORAGE
      this.shopData = data.catalog;
      this.playerGold = data.playerGold || 0;

      // ✅ IMMEDIATE STRUCTURE NORMALIZATION
      if (!this.shopData.availableItems) {
        console.log('🔧 [ShopUI] Normalizing shop structure...');
        
        let items = [];
        if (this.shopData.items && Array.isArray(this.shopData.items)) {
          items = this.shopData.items;
        } else if (this.shopData.shopInfo?.items && Array.isArray(this.shopData.shopInfo.items)) {
          items = this.shopData.shopInfo.items;
        }
        
        this.shopData.availableItems = items.map(item => ({
          itemId: item.itemId,
          buyPrice: item.customPrice || item.buyPrice || 0,
          sellPrice: item.sellPrice || Math.floor((item.customPrice || item.buyPrice || 0) * 0.5),
          stock: item.stock !== undefined ? item.stock : -1,
          canBuy: item.canBuy !== false,
          canSell: item.canSell !== false,
          unlocked: item.unlocked !== false,
          customPrice: item.customPrice
        }));
        
        console.log(`✅ [ShopUI] Structure normalized: ${this.shopData.availableItems.length} items`);
      }

      // ✅ INTERFACE UPDATE
      this.updatePlayerGoldDisplay();
      this.updateShopTitle(this.shopData.shopInfo || {});
      this.refreshCurrentTab();
      
      console.log(`✅ [ShopUI] Shop catalog processed with ${this.shopData.availableItems.length} objects`);
      
      // ✅ SUCCESS NOTIFICATION
      this.showNotification(`Catalog loaded!`, 'success');
      
    } catch (error) {
      console.error('❌ [ShopUI] Error handleShopCatalog:', error);
      this.showNotification(`Technical error: ${error.message}`, "error");
    } finally {
      // ✅ LOCK RELEASE
      setTimeout(() => {
        this.isProcessingCatalog = false;
      }, 500);
    }
  }

  updateShopTitle(shopInfo) {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');

    console.log('[DEBUG SHOP TITLE]', {
      shopInfo,
      npcName: this.shopData?.npcName
    });

    shopNameElement.textContent =
      this.shopData?.npcName
      || shopInfo.npcName
      || shopInfo.name
      || "PokéMart";

    shopSubtitleElement.textContent = shopInfo.description || "Trainer Items";
  }

  switchTab(tabType) {
    // Update visual tabs
    this.overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabType);
    });

    this.currentTab = tabType;
    this.selectedItem = null;
    this.refreshCurrentTab();
    this.updateItemDetails();
    this.updateActionButton();
  }

  refreshCurrentTab() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    if (!this.shopData && this.currentTab === 'buy') {
      this.showEmpty("No shop data available");
      return;
    }

    if (this.currentTab === 'sell' && (!this.playerInventory || this.playerInventory.length === 0)) {
      this.showEmpty("No items in your inventory to sell");
      return;
    }

    // Transition animation
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    // Clear grid
    itemsGrid.innerHTML = '';

    if (this.currentTab === 'buy') {
      this.displayBuyItems();
    } else {
      this.displaySellItems();
    }

    this.updateItemsCount();
  }

  displayBuyItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    // ✅ CORRECTION: Always use availableItems (now normalized)
    const items = Array.isArray(this.shopData?.availableItems) ? this.shopData.availableItems : [];
    
    console.log(`🔍 [ShopUI] === AFFICHAGE ONGLET BUY ===`);
    console.log(`📦 Total items reçus: ${items.length}`);
    console.log(`👤 Niveau joueur: ${this.playerLevel || 'non défini'}`);
    
    // ✅ DEBUG DÉTAILLÉ: Analyser chaque item
    items.forEach((item, index) => {
      console.log(`📦 Item ${index + 1}: ${item.itemId}`);
      console.log(`  - buyPrice: ${item.buyPrice}₽`);
      console.log(`  - canBuy: ${item.canBuy}`);
      console.log(`  - unlocked: ${item.unlocked}`);
      console.log(`  - unlockLevel: ${item.unlockLevel || 'aucun'}`);
      console.log(`  - stock: ${item.stock}`);
      console.log(`  - isEmpty: ${item.isEmpty || false}`);
    });
    
    // ✅ CORRECTION: Filtrage moins restrictif
    const availableItems = items.filter(item => {
      // 1. Toujours afficher les items vides
      if (item.isEmpty) {
        console.log(`✅ [ShopUI] ${item.itemId}: affiché (isEmpty)`);
        return true;
      }
      
      // 2. ✅ NOUVEAU: Vérifier le niveau du joueur
      const playerLevel = this.playerLevel || 1;
      const levelOk = !item.unlockLevel || playerLevel >= item.unlockLevel;
      
      // 3. ✅ NOUVEAU: Conditions plus détaillées
      const hasStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
      const isBuyable = item.canBuy !== false; // true par défaut
      
      // 4. ✅ DÉCISION FINALE
      const shouldShow = isBuyable && levelOk && hasStock;
      
      console.log(`${shouldShow ? '✅' : '❌'} [ShopUI] ${item.itemId}: ${shouldShow ? 'AFFICHÉ' : 'MASQUÉ'}`);
      if (!shouldShow) {
        if (!isBuyable) console.log(`  ❌ Raison: canBuy = ${item.canBuy}`);
        if (!levelOk) console.log(`  ❌ Raison: niveau requis ${item.unlockLevel}, joueur niveau ${playerLevel}`);
        if (!hasStock) console.log(`  ❌ Raison: stock = ${item.stock}`);
      }
      
      return shouldShow;
    });

    console.log(`📊 [ShopUI] RÉSULTAT FINAL: ${availableItems.length}/${items.length} items affichés dans l'onglet BUY`);

    if (availableItems.length === 0) {
      this.showEmpty("No items available for purchase");
      return;
    }

    availableItems.forEach((item, index) => {
      const itemElement = this.createBuyItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  displaySellItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    console.log(`💰 [ShopUI] === AFFICHAGE ONGLET SELL ===`);
    console.log(`🎒 Player inventory:`, this.playerInventory);

    if (!this.playerInventory || this.playerInventory.length === 0) {
      this.showEmpty("No items in your inventory to sell");
      return;
    }

    // Group inventory items by type and count quantities
    const groupedItems = this.groupInventoryItems(this.playerInventory);
    console.log(`📦 Grouped items:`, groupedItems);

    // Filter items that can be sold to this shop
    const sellableItems = Object.entries(groupedItems).filter(([itemId, itemData]) => {
      // Check if this shop accepts this item
      const shopItem = this.shopData?.availableItems?.find(shopItem => 
        shopItem.itemId === itemId && shopItem.canSell !== false
      );
      
      if (shopItem) {
        console.log(`✅ [ShopUI] ${itemId}: vendable (${itemData.quantity}x)`);
        return true;
      } else {
        console.log(`❌ [ShopUI] ${itemId}: non vendable dans ce shop`);
        return false;
      }
    });

    console.log(`📊 [ShopUI] RÉSULTAT FINAL: ${sellableItems.length} types d'items vendables`);

    if (sellableItems.length === 0) {
      this.showEmpty("No items can be sold at this shop");
      return;
    }

    sellableItems.forEach(([itemId, itemData], index) => {
      const shopItem = this.shopData.availableItems.find(shopItem => shopItem.itemId === itemId);
      const itemElement = this.createSellItemElement(itemId, itemData, shopItem, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  groupInventoryItems(inventory) {
    const grouped = {};
    
    inventory.forEach(item => {
      const itemId = item.itemId || item.id;
      const quantity = item.quantity || 1;
      
      if (grouped[itemId]) {
        grouped[itemId].quantity += quantity;
      } else {
        grouped[itemId] = {
          itemId: itemId,
          quantity: quantity,
          item: item
        };
      }
    });
    
    return grouped;
  }

  createBuyItemElement(item, index) {
    // ✅ CORRECTION: Handle empty items
    if (item.isEmpty) {
      return this.createEmptyShopItemElement();
    }
    
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

    // Check availability
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isAvailable = canAfford && inStock;

    if (!isAvailable) {
      itemElement.classList.add('unavailable');
    }

    if (item.stock === 0) {
      itemElement.classList.add('out-of-stock');
    }

    const itemIcon = this.getItemIcon(item.itemId);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="shop-item-icon">${itemIcon}</div>
      <div class="shop-item-name">${itemName}</div>
      <div class="shop-item-price">${item.buyPrice}₽</div>
      ${this.getStockDisplay(item.stock)}
    `;

    if (isAvailable) {
      itemElement.addEventListener('click', () => {
        this.selectItem(item, itemElement);
      });
    }

    // Appearance animation
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  createSellItemElement(itemId, itemData, shopItem, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.dataset.itemId = itemId;
    itemElement.dataset.index = index;

    const itemIcon = this.getItemIcon(itemId);
    const itemName = this.getItemName(itemId);
    const sellPrice = shopItem ? shopItem.sellPrice : Math.floor(this.getDefaultItemPrice(itemId) * 0.5);

    // Create sell item data
    const sellItemData = {
      itemId: itemId,
      sellPrice: sellPrice,
      quantity: itemData.quantity,
      canSell: true
    };

    itemElement.innerHTML = `
      <div class="shop-item-icon">${itemIcon}</div>
      <div class="shop-item-name">${itemName}</div>
      <div class="shop-item-price">${sellPrice}₽</div>
      <div class="shop-item-stock">${itemData.quantity}</div>
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(sellItemData, itemElement);
    });

    // Appearance animation
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getDefaultItemPrice(itemId) {
    // Default prices for items when shop doesn't specify
    const defaultPrices = {
      'poke_ball': 200,
      'great_ball': 600,
      'ultra_ball': 1200,
      'master_ball': 0, // Can't be sold
      'potion': 300,
      'super_potion': 700,
      'hyper_potion': 1200,
      'max_potion': 2500,
      'revive': 1500,
      'max_revive': 4000,
      'antidote': 100,
      'parlyz_heal': 200,
      'awakening': 250,
      'burn_heal': 250,
      'ice_heal': 250,
      'full_heal': 600,
      'escape_rope': 550,
      'repel': 350,
      'super_repel': 500,
      'max_repel': 700
    };

    return defaultPrices[itemId] || 100; // Default to 100 if not found
  }

  getStockDisplay(stock) {
    if (stock === undefined || stock === -1) {
      return ''; // Unlimited stock
    }
    
    let stockClass = '';
    if (stock === 0) {
      stockClass = 'out';
    } else if (stock <= 3) {
      stockClass = 'low';
    }
    
    return `<div class="shop-item-stock ${stockClass}">${stock}</div>`;
  }

  getItemIcon(itemId) {
    // Same mapping as in InventoryUI
    const iconMap = {
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'safari_ball': '🟢',
      'potion': '💊',
      'super_potion': '💉',
      'hyper_potion': '🧪',
      'max_potion': '🍼',
      'full_restore': '✨',
      'revive': '💎',
      'max_revive': '💠',
      'antidote': '🟢',
      'parlyz_heal': '🟡',
      'awakening': '🔵',
      'burn_heal': '🔴',
      'ice_heal': '❄️',
      'full_heal': '⭐',
      'escape_rope': '🪢',
      'repel': '🚫',
      'super_repel': '⛔',
      'max_repel': '🔒'
    };

    return iconMap[itemId] || '📦';
  }

  selectItem(item, element) {
    // Deselect old item
    this.overlay.querySelectorAll('.shop-item').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Select the new one
    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateItemDetails();
    this.updateActionButton();
  }

  getHorizontalStatsHTML(item) {
    const stats = [];
    
    if (this.currentTab === 'buy' && item.stock !== undefined && item.stock !== -1) {
      const stockIcon = item.stock === 0 ? '❌' : item.stock <= 3 ? '⚠️' : '✅';
      stats.push(`
        <div class="item-stat-card stock">
          <div class="stat-icon">${stockIcon}</div>
          <div class="stat-info">
            <span class="stat-label">Stock</span>
            <span class="stat-value">${item.stock === -1 ? '∞' : item.stock}</span>
          </div>
        </div>
      `);
    }

    if (this.currentTab === 'sell' && item.quantity) {
      stats.push(`
        <div class="item-stat-card stock">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-label">You Have</span>
            <span class="stat-value">${item.quantity}</span>
          </div>
        </div>
      `);
    }

    if (item.unlockLevel && item.unlockLevel > 1) {
      stats.push(`
        <div class="item-stat-card level">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <span class="stat-label">Required Level</span>
            <span class="stat-value">${item.unlockLevel}</span>
          </div>
        </div>
      `);
    }

    // If no additional stats, add affordability info
    if (stats.length === 0 && this.currentTab === 'buy') {
      const canAfford = this.playerGold >= item.buyPrice;
      stats.push(`
        <div class="item-stat-card affordability">
          <div class="stat-icon">${canAfford ? '✅' : '❌'}</div>
          <div class="stat-info">
            <span class="stat-label">Availability</span>
            <span class="stat-value">${canAfford ? 'Affordable' : 'Too Expensive'}</span>
          </div>
        </div>
      `);
    }

    return stats.join('');
  }
  
  updateItemDetails() {
    const detailsContainer = this.overlay.querySelector('#shop-item-details');
    
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="details-header">
          <span class="details-title">Item Details</span>
        </div>
        <div class="no-selection">
          <div class="no-selection-icon">🎁</div>
          <p>Select an item to see its details</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId);

    const price = this.currentTab === 'buy' ? item.buyPrice : item.sellPrice;
    const priceLabel = this.currentTab === 'buy' ? 'Purchase Price' : 'Sell Price';

    // ✅ NEW COMPACT HORIZONTAL LAYOUT
    detailsContainer.innerHTML = `
      <div class="details-header">
        <span class="details-title">Item Details</span>
      </div>
      <div class="item-detail-content">
        <!-- Compact header with icon and name -->
        <div class="item-detail-main">
          <div class="item-detail-icon">${itemIcon}</div>
          <div class="item-detail-info">
            <h3>${itemName}</h3>
            <div class="item-detail-type">${this.getItemTypeText(item)}</div>
          </div>
        </div>
        
        <!-- Horizontal stats -->
        <div class="item-detail-stats-horizontal">
          <div class="item-stat-card price">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <span class="stat-label">${priceLabel}</span>
              <span class="stat-value">${price}₽</span>
            </div>
          </div>
          ${this.getHorizontalStatsHTML(item)}
        </div>
        
        <!-- Compact description -->
        <div class="item-detail-description-compact">
          ${itemDescription}
        </div>
      </div>
    `;
  }

  getItemTypeText(item) {
    if (this.currentTab === 'sell') {
      return 'Your Item';
    }
    return item.type || 'Item';
  }

  updateActionButton() {
    const actionBtn = this.overlay.querySelector('#shop-action-btn');
    const btnIcon = actionBtn.querySelector('.btn-icon');
    const btnText = actionBtn.querySelector('.btn-text');

    if (!this.selectedItem) {
      actionBtn.disabled = true;
      btnIcon.textContent = this.currentTab === 'buy' ? '🛒' : '💰';
      btnText.textContent = this.currentTab === 'buy' ? 'Buy' : 'Sell';
      return;
    }

    if (this.currentTab === 'buy') {
      const canAfford = this.playerGold >= this.selectedItem.buyPrice;
      const inStock = this.selectedItem.stock === undefined || this.selectedItem.stock === -1 || this.selectedItem.stock > 0;
      
      actionBtn.disabled = !canAfford || !inStock;
      btnIcon.textContent = '🛒';
      btnText.textContent = 'Buy';
    } else {
      // Sell tab
      actionBtn.disabled = false;
      btnIcon.textContent = '💰';
      btnText.textContent = 'Sell';
    }
  }

  updatePlayerGoldDisplay() {
    const goldAmount = this.overlay.querySelector('.gold-amount');
    goldAmount.textContent = this.playerGold.toLocaleString();
    goldAmount.classList.add('updated');
    setTimeout(() => goldAmount.classList.remove('updated'), 600);
  }

  updatePlayerGold(newGold) {
    this.playerGold = newGold;
    this.updatePlayerGoldDisplay();
    this.updateActionButton();
  }

  updateItemsCount() {
    const itemsCountElement = this.overlay.querySelector('#items-count');
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    const itemCount = itemsGrid.querySelectorAll('.shop-item:not(.shop-empty-item)').length;
    
    const tabText = this.currentTab === 'buy' ? 'items' : 'sellable items';
    itemsCountElement.textContent = `${itemCount} ${tabText}`;
  }

  showBuyModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');

    // Configure modal for buying
    modalTitle.textContent = 'Purchase Confirmation';
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `Unit price: ${this.selectedItem.buyPrice}₽`;

    // Configure maximum quantity
    const maxAffordable = Math.floor(this.playerGold / this.selectedItem.buyPrice);
    const maxStock = this.selectedItem.stock === undefined || this.selectedItem.stock === -1 ? 99 : this.selectedItem.stock;
    const maxQuantity = Math.min(maxAffordable, maxStock, 99);

    quantityInput.value = 1;
    quantityInput.setAttribute('max', maxQuantity);

    this.updateModalTotal();
    modal.classList.remove('hidden');
  }

  showSellModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');

    // Configure modal for selling
    modalTitle.textContent = 'Sell Confirmation';
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `Unit price: ${this.selectedItem.sellPrice}₽`;

    // Configure maximum quantity (how many the player has)
    const maxQuantity = this.selectedItem.quantity || 1;

    quantityInput.value = 1;
    quantityInput.setAttribute('max', maxQuantity);

    this.updateModalTotal();
    modal.classList.remove('hidden');
  }

  updateModalTotal() {
    const modal = this.overlay.querySelector('#shop-modal');
    const quantityInput = modal.querySelector('#quantity-input');
    const totalAmount = modal.querySelector('#modal-total');

    const quantity = parseInt(quantityInput.value) || 1;
    const unitPrice = this.currentTab === 'buy' ? this.selectedItem.buyPrice : this.selectedItem.sellPrice;
    const total = quantity * unitPrice;

    totalAmount.textContent = `${total}₽`;
  }

  confirmTransaction() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const quantityInput = modal.querySelector('#quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;

    if (this.gameRoom) {
      this.gameRoom.send("shopTransaction", {
        shopId: this.shopData.shopInfo.id,
        action: this.currentTab,
        itemId: this.selectedItem.itemId,
        quantity: quantity
      });
    }

    this.hideModal();
  }

  hideModal() {
    const modal = this.overlay.querySelector('#shop-modal');
    modal.classList.add('hidden');
  }

  refreshShop() {
    if (!this.shopData) return;

    if (this.gameRoom) {
      this.gameRoom.send("refreshShop", {
        shopId: this.shopData.shopInfo.id
      });
    }
  }

  handleTransactionResult(data) {
    if (data.success) {
      this.showNotification(data.message || "Transaction successful!", "success");
      
      // Update player gold
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      // Update inventory if provided
      if (data.newInventory) {
        this.updatePlayerInventory(data.newInventory);
      }
      
      // Refresh catalog to update stock
      if (this.currentTab === 'buy') {
        this.requestShopCatalog(this.shopData.shopInfo.id);
      } else {
        // For sell tab, just refresh the display
        this.refreshCurrentTab();
      }
    } else {
      this.showNotification(data.message || "Transaction failed", "error");
    }
  }

  handleRefreshResult(data) {
    if (data.success) {
      if (data.restocked) {
        this.showNotification("Shop restocked!", "success");
      } else {
        this.showNotification("No restock needed", "info");
      }
    } else {
      this.showNotification(data.message || "Error during refresh", "error");
    }
  }

  showLoading() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-loading">
        <div class="shop-loading-spinner"></div>
        <div class="shop-loading-text">Loading catalog...</div>
      </div>
    `;
  }

  showEmpty(message) {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-empty">
        <div class="shop-empty-icon">🏪</div>
        <div class="shop-empty-text">${message}</div>
        <div class="shop-empty-subtext">Come back later!</div>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    // Remove old notifications
    const existingNotifications = document.querySelectorAll('.shop-notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `shop-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);
  }

  // Public methods for integration
  isOpen() {
    return this.isVisible;
  }

  getCurrentShopId() {
    return this.shopData ? this.shopData.shopInfo.id : null;
  }

  getSelectedItem() {
    return this.selectedItem;
  }

  getCurrentTab() {
    return this.currentTab;
  }

  // Method to handle keyboard shortcuts
  handleKeyPress(key) {
    if (!this.isVisible) return false;

    switch (key) {
      case 'Escape':
        this.hide();
        return true;
      case 'Tab':
        const newTab = this.currentTab === 'buy' ? 'sell' : 'buy';
        this.switchTab(newTab);
        return true;
      case 'Enter':
        if (this.selectedItem) {
          if (this.currentTab === 'buy') {
            this.showBuyModal();
          } else {
            this.showSellModal();
          }
          return true;
        }
        break;
      case 'r':
      case 'R':
        this.refreshShop();
        return true;
    }

    return false;
  }

  // Method to navigate between items with arrows
  navigateItems(direction) {
    const items = this.overlay.querySelectorAll('.shop-item:not(.unavailable):not(.shop-empty-item)');
    if (items.length === 0) return;

    let currentIndex = -1;
    if (this.selectedItem) {
      items.forEach((item, index) => {
        if (item.dataset.itemId === this.selectedItem.itemId) {
          currentIndex = index;
        }
      });
    }

    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    }

    const newItem = items[newIndex];
    if (newItem) {
      newItem.click();
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Method for integration with other systems
  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !inventoryOpen;
  }

  // Utility method to check if an item can be bought
  canBuyItem(item) {
    if (!item) return false;
    
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isUnlocked = item.unlocked;
    
    return canAfford && inStock && isUnlocked;
  }

  // Utility method to check if an item can be sold
  canSellItem(item) {
    if (!item) return false;
    
    return item.quantity > 0 && item.canSell !== false;
  }

  // Method to get shop statistics
  getShopStats() {
    if (!this.shopData) return null;

    const items = this.shopData.availableItems;
    const buyableItems = items.filter(item => item.canBuy && item.unlocked);
    const affordableItems = buyableItems.filter(item => this.canBuyItem(item));
    
    const sellableItemsCount = this.currentTab === 'sell' ? 
      Object.keys(this.groupInventoryItems(this.playerInventory || [])).length : 0;
    
    return {
      totalItems: items.length,
      buyableItems: buyableItems.length,
      affordableItems: affordableItems.length,
      sellableItems: sellableItemsCount,
      playerGold: this.playerGold,
      currentTab: this.currentTab
    };
  }

  // Method to set player level (for unlock calculations)
  setPlayerLevel(level) {
    this.playerLevel = level;
    console.log(`🎯 [ShopUI] Player level set to: ${level}`);
    
    // Refresh display if shop is open
    if (this.isVisible && this.currentTab === 'buy') {
      this.refreshCurrentTab();
    }
  }

  // Cleanup method
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Clean up style elements
    const styleElement = document.querySelector('#shop-styles-fallback');
    if (styleElement) {
      styleElement.remove();
    }
    
    // Clean up references
    this.gameRoom = null;
    this.shopData = null;
    this.selectedItem = null;
    this.overlay = null;
    this.playerInventory = [];
    
    console.log('🏪 ShopUI destroyed');
  }
}
