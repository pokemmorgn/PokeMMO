// client/src/components/ShopUI.js - VERSION COMPLÈTE AVEC ONGLET VENDRE CORRIGÉ

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.currentShopId = null;
    this.selectedItem = null;
    this.currentTab = 'buy';
    this.isProcessingCatalog = false;
    this.playerInventory = {}; // ✅ NOUVEAU: Inventaire pour l'onglet vendre
    
    this.overlay = null;
    this.container = null;
    
    console.log("🏪 [ShopUI] Initialisé");
    this.init();
  }

  init() {
    this.createShopInterface();
    this.setupEventListeners();
    this.setupInventoryHandlers(); // ✅ NOUVEAU: Handlers pour inventaire
    this.injectCSS();
    console.log("✅ [ShopUI] Interface créée");
  }

  // ✅ NOUVEAU: Setup des handlers pour l'inventaire
  setupInventoryHandlers() {
    if (!this.gameRoom) return;
    
    // Écouter les données d'inventaire du serveur
    this.gameRoom.onMessage("playerInventoryForShop", (data) => {
      console.log("🎒 [ShopUI] Inventaire reçu pour vente:", data);
      this.playerInventory = data.inventory || {};
      this.displaySellTab();
    });
  }

  createShopInterface() {
    // Overlay principal
    this.overlay = document.createElement('div');
    this.overlay.id = 'shopOverlay';
    this.overlay.className = 'shop-overlay';
    this.overlay.style.display = 'none';

    // Container principal du shop
    this.container = document.createElement('div');
    this.container.id = 'shopContainer';
    this.container.className = 'shop-container';

    this.container.innerHTML = `
      <!-- Header du shop -->
      <div class="shop-header">
        <div class="shop-title">
          <h2 id="shopTitle">Boutique</h2>
          <p id="shopDescription">Bienvenue dans notre boutique !</p>
        </div>
        <div class="shop-player-info">
          <div class="player-gold">
            <span class="gold-icon">💰</span>
            <span id="playerGold">0</span>₽
          </div>
        </div>
        <button id="closeShop" class="close-btn">×</button>
      </div>

      <!-- Navigation des onglets -->
      <div class="shop-tabs">
        <button class="tab-btn active" data-tab="buy">
          <span class="tab-icon">🛒</span>
          Acheter
        </button>
        <button class="tab-btn" data-tab="sell">
          <span class="tab-icon">💰</span>
          Vendre
        </button>
      </div>

      <!-- Contenu principal -->
      <div class="shop-content">
        <!-- Onglet Acheter -->
        <div id="buyTab" class="tab-content active">
          <div class="items-grid" id="buyItems">
            <div class="loading-message">
              <p>Chargement des objets...</p>
            </div>
          </div>
        </div>

        <!-- Onglet Vendre -->
        <div id="sellTab" class="tab-content">
          <div class="sell-items-container" id="sellItems">
            <div class="loading-message">
              <p>Chargement de l'inventaire...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer avec actions -->
      <div class="shop-footer">
        <div class="selected-item-info" id="selectedItemInfo" style="display: none;">
          <div class="item-details">
            <span id="selectedItemName">Aucun objet sélectionné</span>
            <span id="selectedItemPrice">0₽</span>
          </div>
          <div class="quantity-controls">
            <button id="decreaseQty">-</button>
            <input type="number" id="itemQuantity" value="1" min="1" max="1">
            <button id="increaseQty">+</button>
          </div>
          <button id="actionBtn" class="action-btn">Acheter</button>
        </div>
        <div class="shop-footer-info">
          <small>Appuyez sur Échap pour fermer</small>
        </div>
      </div>
    `;

    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);

    console.log("🏪 [ShopUI] Interface DOM créée");
  }

  setupEventListeners() {
    // Fermeture du shop
    document.getElementById('closeShop').addEventListener('click', () => {
      this.hide();
    });

    // Fermeture avec Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Fermeture en cliquant sur l'overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Navigation des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Contrôles de quantité
    document.getElementById('decreaseQty').addEventListener('click', () => {
      this.adjustQuantity(-1);
    });

    document.getElementById('increaseQty').addEventListener('click', () => {
      this.adjustQuantity(1);
    });

    document.getElementById('itemQuantity').addEventListener('input', (e) => {
      this.validateQuantity();
    });

    // Bouton d'action (Acheter)
    document.getElementById('actionBtn').addEventListener('click', () => {
      this.performAction();
    });

    console.log("✅ [ShopUI] Event listeners configurés");
  }

  show(shopId, npc) {
    console.log(`🏪 [ShopUI] === SHOW CALLED ===`);
    console.log(`📊 shopId: ${shopId}, npcName:`, npc);
    console.log(`📊 current isVisible: ${this.isVisible}`);

    this.currentShopId = shopId;
    this.isVisible = true;
    this.overlay.style.display = 'flex';

    // Mettre à jour les informations du shop
    const shopTitle = document.getElementById('shopTitle');
    const shopDescription = document.getElementById('shopDescription');

    if (npc && npc.name) {
      shopTitle.textContent = `Boutique de ${npc.name}`;
      shopDescription.textContent = `Bienvenue chez ${npc.name} !`;
    } else {
      shopTitle.textContent = 'Boutique';
      shopDescription.textContent = 'Bienvenue dans notre boutique !';
    }

    // Reset à l'onglet buy
    this.switchTab('buy');

    console.log(`✅ [ShopUI] Shop displayed for ${npc?.name || 'Unknown'}`);
  }

  hide() {
    console.log("🏪 [ShopUI] Fermeture du shop");
    
    this.isVisible = false;
    this.overlay.style.display = 'none';
    this.shopData = null;
    this.currentShopId = null;
    this.selectedItem = null;
    this.playerInventory = {}; // ✅ Reset inventaire
    this.isProcessingCatalog = false;

    // Reset l'interface
    this.resetInterface();
    
    console.log("✅ [ShopUI] Shop fermé");
  }

  switchTab(tab) {
    console.log(`🔄 [ShopUI] Switch vers onglet: ${tab}`);

    // Mettre à jour les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Mettre à jour le contenu
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    this.currentTab = tab;

    if (tab === 'buy') {
      this.showBuyTab();
    } else if (tab === 'sell') {
      this.showSellTab();
    }
  }

  showBuyTab() {
    console.log("🛒 [ShopUI] Passage à l'onglet BUY");
    
    document.getElementById('buyTab').style.display = 'block';
    document.getElementById('sellTab').style.display = 'none';
    document.getElementById('buyTab').classList.add('active');
    document.getElementById('sellTab').classList.remove('active');
    
    // Réafficher les objets du shop si on a déjà les données
    if (this.shopData) {
      this.displayBuyTab();
    }
  }

  // ✅ MODIFIÉ: Onglet sell demande l'inventaire
  showSellTab() {
    console.log("💰 [ShopUI] Passage à l'onglet SELL");
    
    document.getElementById('buyTab').style.display = 'none';
    document.getElementById('sellTab').style.display = 'block';
    document.getElementById('buyTab').classList.remove('active');
    document.getElementById('sellTab').classList.add('active');
    
    this.currentTab = 'sell';
    
    // ✅ NOUVEAU : Demander l'inventaire au serveur
    const sellContainer = document.getElementById('sellItems');
    sellContainer.innerHTML = '<div class="sell-tab-loading">Chargement de l\'inventaire...</div>';
    
    if (this.gameRoom) {
      console.log("📤 [ShopUI] Demande inventaire pour vente...");
      this.gameRoom.send("getPlayerInventoryForShop", {
        shopId: this.currentShopId
      });
    }
  }

  handleShopCatalog(data) {
    console.log(`🏪 [ShopUI] === HANDLE SHOP CATALOG ===`);
    console.log(`📊 Data received:`, data);

    if (this.isProcessingCatalog) {
      console.log(`⏳ [ShopUI] Déjà en traitement, ignoré`);
      return;
    }

    this.isProcessingCatalog = true;

    try {
      if (!data.success) {
        console.error(`❌ [ShopUI] Erreur catalogue:`, data.message);
        return;
      }

      // Stocker les données
      this.shopData = data.catalog;
      
      // Mettre à jour l'or du joueur
      if (data.playerGold !== undefined) {
        this.updatePlayerGold(data.playerGold);
      }

      // Afficher l'onglet actuel
      if (this.currentTab === 'buy') {
        this.displayBuyTab();
      }

      console.log(`✅ [ShopUI] Shop catalog processed with ${data.catalog.availableItems?.length || 0} objects`);

    } catch (error) {
      console.error(`❌ [ShopUI] Erreur traitement catalogue:`, error);
    } finally {
      this.isProcessingCatalog = false;
    }
  }

  displayBuyTab() {
    console.log(`🔍 [ShopUI] === AFFICHAGE ONGLET BUY ===`);
    
    const buyItemsContainer = document.getElementById('buyItems');
    buyItemsContainer.innerHTML = '';

    if (!this.shopData || !this.shopData.availableItems) {
      buyItemsContainer.innerHTML = '<div class="no-items">Aucun objet disponible</div>';
      return;
    }

    const items = this.shopData.availableItems;
    console.log(`📦 Total items reçus: ${items.length}`);

    items.forEach((item, index) => {
      console.log(`📦 Item ${index + 1}: ${item.itemId}`);
      console.log(`   - buyPrice: ${item.buyPrice}₽`);
      console.log(`   - canBuy: ${item.canBuy}`);
      console.log(`   - unlocked: ${item.unlocked}`);
      console.log(`   - unlockLevel: ${item.unlockLevel || 'aucun'}`);
      console.log(`   - stock: ${item.stock}`);
      console.log(`   - isEmpty: ${item.stock === 0}`);

      // ✅ AFFICHER SEULEMENT LES OBJETS DÉBLOQUÉS
      if (item.unlocked) {
        const itemElement = this.createBuyItemElement(item);
        buyItemsContainer.appendChild(itemElement);
        console.log(`✅ [ShopUI] ${item.itemId}: AFFICHÉ`);
      } else {
        console.log(`❌ [ShopUI] ${item.itemId}: MASQUÉ`);
        console.log(`   ❌ Raison: canBuy = ${item.canBuy}`);
        console.log(`   ❌ Raison: niveau requis ${item.unlockLevel}, joueur niveau 1`);
      }
    });

    const displayedItems = buyItemsContainer.children.length;
    console.log(`📊 [ShopUI] RÉSULTAT FINAL: ${displayedItems}/${items.length} items affichés dans l'onglet BUY`);

    if (displayedItems === 0) {
      buyItemsContainer.innerHTML = '<div class="no-items">Aucun objet disponible à votre niveau</div>';
    }
  }

  // ✅ NOUVEAU: Afficher l'onglet vendre avec l'inventaire
  displaySellTab() {
    console.log("💰 [ShopUI] === AFFICHAGE ONGLET SELL (INVENTAIRE) ===");
    
    const sellItemsContainer = document.getElementById('sellItems');
    if (!sellItemsContainer) return;
    
    sellItemsContainer.innerHTML = '';
    
    if (!this.playerInventory || Object.keys(this.playerInventory).length === 0) {
      sellItemsContainer.innerHTML = `
        <div class="no-items-message">
          <p>Inventaire vide</p>
          <p>Vous n'avez aucun objet à vendre</p>
        </div>
      `;
      return;
    }
    
    // ✅ NOUVEAU : Créer les filtres de catégorie
    this.createSellFilters(sellItemsContainer);
    
    // ✅ NOUVEAU : Afficher par catégorie
    this.displayInventoryByPockets(sellItemsContainer);
  }

  // ✅ NOUVEAU : Créer les filtres pour l'onglet vendre
  createSellFilters(container) {
    const filtersDiv = document.createElement('div');
    filtersDiv.className = 'sell-filters';
    filtersDiv.innerHTML = `
      <div class="filter-buttons">
        <button class="filter-btn active" data-pocket="all">Tout</button>
        <button class="filter-btn" data-pocket="items">Objets</button>
        <button class="filter-btn" data-pocket="medicine">Médicaments</button>
        <button class="filter-btn" data-pocket="balls">Poké Balls</button>
        <button class="filter-btn" data-pocket="berries">Baies</button>
        <button class="filter-btn" data-pocket="valuables">Objets de valeur</button>
      </div>
    `;
    
    container.appendChild(filtersDiv);
    
    // Event listeners pour les filtres
    filtersDiv.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Mettre à jour l'état actif
        filtersDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Filtrer l'affichage
        const pocket = e.target.dataset.pocket;
        this.filterSellItems(pocket);
      });
    });
  }

  // ✅ NOUVEAU : Afficher l'inventaire par poches
  displayInventoryByPockets(container) {
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'sell-items-grid';
    itemsGrid.id = 'sellItemsGrid';
    
    // Ordre des poches pour l'affichage
    const pocketOrder = ['items', 'medicine', 'balls', 'berries', 'valuables', 'tms'];
    
    pocketOrder.forEach(pocketName => {
      const pocketItems = this.playerInventory[pocketName];
      if (!pocketItems || pocketItems.length === 0) return;
      
      // Section de poche
      const pocketSection = document.createElement('div');
      pocketSection.className = 'pocket-section';
      pocketSection.dataset.pocket = pocketName;
      
      // Titre de la poche
      const pocketTitle = document.createElement('h3');
      pocketTitle.className = 'pocket-title';
      pocketTitle.textContent = this.getPocketDisplayName(pocketName);
      pocketSection.appendChild(pocketTitle);
      
      // Items de la poche
      const pocketGrid = document.createElement('div');
      pocketGrid.className = 'pocket-items-grid';
      
      pocketItems.forEach(item => {
        if (item.quantity > 0 && this.canSellItem(item.itemId, pocketName)) {
          const itemElement = this.createSellItemElement(item, pocketName);
          pocketGrid.appendChild(itemElement);
        }
      });
      
      if (pocketGrid.children.length > 0) {
        pocketSection.appendChild(pocketGrid);
        itemsGrid.appendChild(pocketSection);
      }
    });
    
    container.appendChild(itemsGrid);
    
    // Message si aucun objet vendable
    if (itemsGrid.children.length === 0) {
      container.innerHTML += `
        <div class="no-sellable-items">
          <p>Aucun objet vendable</p>
          <p>Les objets clés et certains objets spéciaux ne peuvent pas être vendus</p>
        </div>
      `;
    }
  }

  // ✅ NOUVEAU : Créer un élément d'objet vendable
  createSellItemElement(item, pocket) {
    const sellPrice = item.sellPrice || this.getSellPrice(item.itemId);
    const canSell = sellPrice > 0;
    
    const itemElement = document.createElement('div');
    itemElement.className = `sell-item ${!canSell ? 'non-sellable' : ''}`;
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.pocket = pocket;
    
    itemElement.innerHTML = `
      <div class="item-icon">
        <img src="/assets/items/${item.itemId}.png" 
             alt="${item.itemId}" 
             onerror="this.src='/assets/items/placeholder.png'">
        <span class="item-quantity">${item.quantity}</span>
      </div>
      <div class="item-info">
        <div class="item-name">${this.getItemName(item.itemId)}</div>
        <div class="item-sell-price">${canSell ? sellPrice + '₽' : 'Non vendable'}</div>
        <div class="item-description">${this.getItemDescription(item.itemId)}</div>
      </div>
      ${canSell ? `
        <div class="sell-controls">
          <button class="quantity-btn" data-action="decrease">-</button>
          <input type="number" class="sell-quantity" value="1" min="1" max="${item.quantity}">
          <button class="quantity-btn" data-action="increase">+</button>
          <button class="sell-btn" data-item-id="${item.itemId}">Vendre</button>
        </div>
      ` : ''}
    `;
    
    // Event listeners pour les contrôles
    if (canSell) {
      this.setupSellItemControls(itemElement, item);
    }
    
    return itemElement;
  }

  // ✅ NOUVEAU : Setup des contrôles de vente
  setupSellItemControls(itemElement, item) {
    const quantityInput = itemElement.querySelector('.sell-quantity');
    const decreaseBtn = itemElement.querySelector('[data-action="decrease"]');
    const increaseBtn = itemElement.querySelector('[data-action="increase"]');
    const sellBtn = itemElement.querySelector('.sell-btn');
    
    // Contrôles de quantité
    decreaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        this.updateSellTotal(itemElement);
      }
    });
    
    increaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue < item.quantity) {
        quantityInput.value = currentValue + 1;
        this.updateSellTotal(itemElement);
      }
    });
    
    quantityInput.addEventListener('input', () => {
      let value = parseInt(quantityInput.value) || 1;
      value = Math.max(1, Math.min(value, item.quantity));
      quantityInput.value = value;
      this.updateSellTotal(itemElement);
    });
    
    // Bouton de vente
    sellBtn.addEventListener('click', () => {
      const quantity = parseInt(quantityInput.value);
      this.sellItem(item.itemId, quantity);
    });
  }

  // ✅ NOUVEAU : Filtrer les objets par poche
  filterSellItems(pocket) {
    const sections = document.querySelectorAll('.pocket-section');
    
    sections.forEach(section => {
      if (pocket === 'all' || section.dataset.pocket === pocket) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  }

  // ✅ NOUVEAU : Vérifier si un objet peut être vendu
  canSellItem(itemId, pocket) {
    // Les objets clés ne peuvent pas être vendus
    if (pocket === 'key_items') {
      return false;
    }
    
    // Objets spéciaux non vendables
    const nonSellableItems = [
      'town_map', 'bicycle', 'itemfinder', 'coin_case',
      'old_rod', 'good_rod', 'super_rod',
      'exp_share', 'poke_flute', 'silph_scope'
    ];
    
    return !nonSellableItems.includes(itemId);
  }

  // ✅ NOUVEAU : Obtenir le prix de vente
  getSellPrice(itemId) {
    if (!this.canSellItem(itemId)) return 0;
    
    // Utiliser le prix de vente du shop ou calculer à partir du prix d'achat
    const shopInfo = this.shopData?.shopInfo;
    const sellMultiplier = shopInfo?.sellMultiplier || 0.5;
    
    // Prix de base de l'objet (depuis les données)
    const basePrice = this.getBasePrice(itemId);
    return Math.floor(basePrice * sellMultiplier);
  }

  // ✅ NOUVEAU : Obtenir le nom d'affichage des poches
  getPocketDisplayName(pocketName) {
    const pocketNames = {
      'items': 'Objets',
      'medicine': 'Médicaments',
      'balls': 'Poké Balls',
      'berries': 'Baies',
      'valuables': 'Objets de valeur',
      'tms': 'Capsules Techniques',
      'key_items': 'Objets clés'
    };
    
    return pocketNames[pocketName] || pocketName;
  }

  // ✅ NOUVEAU : Méthode de vente
  sellItem(itemId, quantity) {
    if (!this.gameRoom || !this.currentShopId) {
      console.error("❌ [ShopUI] Impossible de vendre: pas de connexion");
      return;
    }
    
    const sellPrice = this.getSellPrice(itemId);
    const totalValue = sellPrice * quantity;
    
    console.log(`💰 [ShopUI] Vente: ${quantity}x ${itemId} pour ${totalValue}₽`);
    
    // Confirmation pour les grosses ventes
    if (totalValue > 1000) {
      const confirm = window.confirm(`Vendre ${quantity}x ${this.getItemName(itemId)} pour ${totalValue}₽ ?`);
      if (!confirm) return;
    }
    
    // Envoyer la transaction au serveur
    this.gameRoom.send("shopTransaction", {
      shopId: this.currentShopId,
      action: 'sell',
      itemId: itemId,
      quantity: quantity
    });
  }

  createBuyItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = `shop-item ${!item.canBuy ? 'unavailable' : ''}`;
    itemElement.dataset.itemId = item.itemId;

    // Stock display
    let stockDisplay = '';
    if (item.stock !== undefined && item.stock !== -1) {
      stockDisplay = `<span class="stock-info">Stock: ${item.stock}</span>`;
    }

    // Prix d'achat
    const buyPrice = item.buyPrice || 0;

    itemElement.innerHTML = `
      <div class="item-icon">
        <img src="/assets/items/${item.itemId}.png" 
             alt="${item.itemId}" 
             onerror="this.src='/assets/items/placeholder.png'">
      </div>
      <div class="item-info">
        <div class="item-name">${this.getItemName(item.itemId)}</div>
        <div class="item-price">${buyPrice}₽</div>
        <div class="item-description">${this.getItemDescription(item.itemId)}</div>
        ${stockDisplay}
        ${!item.canBuy ? '<div class="unavailable-reason">Non disponible</div>' : ''}
      </div>
    `;

    // Event listener pour sélection
    itemElement.addEventListener('click', () => {
      if (item.canBuy) {
        this.selectItem(item);
      }
    });

    return itemElement;
  }

  selectItem(item) {
    console.log(`🎯 [ShopUI] Sélection item: ${item.itemId}`);

    // Enlever la sélection précédente
    document.querySelectorAll('.shop-item.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Sélectionner le nouvel item
    const itemElement = document.querySelector(`[data-item-id="${item.itemId}"]`);
    if (itemElement) {
      itemElement.classList.add('selected');
    }

    this.selectedItem = item;

    // Mettre à jour l'interface de sélection
    this.updateSelectedItemInfo();
  }

  updateSelectedItemInfo() {
    const selectedInfo = document.getElementById('selectedItemInfo');
    const itemName = document.getElementById('selectedItemName');
    const itemPrice = document.getElementById('selectedItemPrice');
    const quantityInput = document.getElementById('itemQuantity');
    const actionBtn = document.getElementById('actionBtn');

    if (!this.selectedItem) {
      selectedInfo.style.display = 'none';
      return;
    }

    selectedInfo.style.display = 'flex';
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `${this.selectedItem.buyPrice}₽`;

    // Configuration pour l'onglet buy
    if (this.currentTab === 'buy') {
      quantityInput.max = this.selectedItem.stock || 99;
      quantityInput.value = 1;
      actionBtn.textContent = 'Acheter';
      actionBtn.className = 'action-btn buy-btn';
    }

    this.updateTotalPrice();
  }

  updateTotalPrice() {
    const quantityInput = document.getElementById('itemQuantity');
    const itemPrice = document.getElementById('selectedItemPrice');
    
    if (!this.selectedItem) return;

    const quantity = parseInt(quantityInput.value) || 1;
    const totalPrice = this.selectedItem.buyPrice * quantity;
    
    itemPrice.textContent = `${totalPrice}₽ (${quantity}x)`;
  }

  adjustQuantity(delta) {
    const quantityInput = document.getElementById('itemQuantity');
    const currentValue = parseInt(quantityInput.value) || 1;
    const newValue = Math.max(1, currentValue + delta);
    
    if (this.selectedItem && this.selectedItem.stock) {
      quantityInput.value = Math.min(newValue, this.selectedItem.stock);
    } else {
      quantityInput.value = Math.min(newValue, 99);
    }
    
    this.updateTotalPrice();
  }

  validateQuantity() {
    const quantityInput = document.getElementById('itemQuantity');
    let value = parseInt(quantityInput.value);
    
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    
    if (this.selectedItem && this.selectedItem.stock) {
      value = Math.min(value, this.selectedItem.stock);
    } else {
      value = Math.min(value, 99);
    }
    
    quantityInput.value = value;
    this.updateTotalPrice();
  }

  performAction() {
    if (!this.selectedItem) {
      console.warn("❌ [ShopUI] Aucun objet sélectionné");
      return;
    }

    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;

    if (this.currentTab === 'buy') {
      this.buyItem(this.selectedItem.itemId, quantity);
    }
  }

  buyItem(itemId, quantity) {
    if (!this.gameRoom || !this.currentShopId) {
      console.error("❌ [ShopUI] Impossible d'acheter: pas de connexion");
      return;
    }

    console.log(`🛒 [ShopUI] Achat: ${quantity}x ${itemId}`);

    this.gameRoom.send("shopTransaction", {
      shopId: this.currentShopId,
      action: 'buy',
      itemId: itemId,
      quantity: quantity
    });
  }

  updatePlayerGold(newGold) {
    const goldElement = document.getElementById('playerGold');
    if (goldElement) {
      goldElement.textContent = newGold;
    }
    console.log(`💰 [ShopUI] Or mis à jour: ${newGold}`);
  }

  resetInterface() {
    // Reset des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('[data-tab="buy"]').classList.add('active');

    // Reset du contenu
    const buyItems = document.getElementById('buyItems');
    const sellItems = document.getElementById('sellItems');
    
    if (buyItems) {
      buyItems.innerHTML = '<div class="loading-message"><p>Chargement des objets...</p></div>';
    }
    
    if (sellItems) {
      sellItems.innerHTML = '<div class="loading-message"><p>Chargement de l'inventaire...</p></div>';
    }

    // Reset des infos sélection
    const selectedInfo = document.getElementById('selectedItemInfo');
    if (selectedInfo) {
      selectedInfo.style.display = 'none';
    }

    this.currentTab = 'buy';
  }

  // ✅ NOUVEAU : Mettre à jour le total de vente
  updateSellTotal(itemElement) {
    // Cette méthode peut être utilisée pour afficher le total en temps réel
    // Pour l'instant, elle est vide mais peut être étendue
  }

  // Méthodes utilitaires pour les noms et descriptions d'objets
  getItemName(itemId) {
    const itemNames = {
      'poke_ball': 'Poké Ball',
      'great_ball': 'Super Ball',
      'ultra_ball': 'Hyper Ball',
      'master_ball': 'Master Ball',
      'potion': 'Potion',
      'super_potion': 'Super Potion',
      'hyper_potion': 'Hyper Potion',
      'max_potion': 'Potion Max',
      'full_restore': 'Guérison',
      'revive': 'Rappel',
      'max_revive': 'Rappel Max',
      'antidote': 'Antidote',
      'parlyz_heal': 'Anti-Para',
      'awakening': 'Réveil',
      'burn_heal': 'Anti-Brûle',
      'ice_heal': 'Antigel',
      'full_heal': 'Guérison Totale',
      'escape_rope': 'Corde Sortie',
      'repel': 'Repousse',
      'super_repel': 'Super Repousse',
      'max_repel': 'Max Repousse'
    };
    
    return itemNames[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    const descriptions = {
      'poke_ball': 'Une Ball normale pour capturer les Pokémon.',
      'great_ball': 'Une Ball plus efficace que la Poké Ball.',
      'ultra_ball': 'Une Ball très efficace pour capturer les Pokémon.',
      'master_ball': 'La Ball ultime qui capture à coup sûr.',
      'potion': 'Restaure 20 PV d\'un Pokémon.',
      'super_potion': 'Restaure 50 PV d\'un Pokémon.',
      'hyper_potion': 'Restaure 200 PV d\'un Pokémon.',
      'max_potion': 'Restaure tous les PV d\'un Pokémon.',
      'full_restore': 'Restaure tous les PV et soigne les statuts.',
      'revive': 'Ranime un Pokémon K.O. avec la moitié de ses PV.',
      'max_revive': 'Ranime un Pokémon K.O. avec tous ses PV.',
      'antidote': 'Soigne l\'empoisonnement.',
      'parlyz_heal': 'Soigne la paralysie.',
      'awakening': 'Réveille un Pokémon endormi.',
      'burn_heal': 'Soigne les brûlures.',
      'ice_heal': 'Soigne le gel.',
      'full_heal': 'Soigne tous les problèmes de statut.',
      'escape_rope': 'Permet de sortir d\'un donjon.',
      'repel': 'Repousse les Pokémon sauvages faibles pendant 100 pas.',
      'super_repel': 'Repousse les Pokémon sauvages faibles pendant 200 pas.',
      'max_repel': 'Repousse les Pokémon sauvages faibles pendant 250 pas.'
    };
    
    return descriptions[itemId] || 'Description non disponible.';
  }

  getBasePrice(itemId) {
    const basePrices = {
      'poke_ball': 200,
      'great_ball': 600,
      'ultra_ball': 1200,
      'potion': 300,
      'super_potion': 700,
      'hyper_potion': 1200,
      'max_potion': 2500,
      'full_restore': 3000,
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
    
    return basePrices[itemId] || 100;
  }

  // Méthode pour gérer les touches clavier dans le shop
  handleKeyPress(key) {
    switch (key.toLowerCase()) {
      case 'escape':
        this.hide();
        return true;
      
      case 'tab':
        const currentTabBtn = document.querySelector('.tab-btn.active');
        const nextTab = currentTabBtn.dataset.tab === 'buy' ? 'sell' : 'buy';
        this.switchTab(nextTab);
        return true;
      
      case 'enter':
        if (this.selectedItem) {
          this.performAction();
        }
        return true;
      
      default:
        return false;
    }
  }

  // ✅ CSS INTÉGRÉ DANS LA CLASSE
  injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
/* === CSS COMPLET POUR SHOPUI === */

.shop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.shop-container {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border: 2px solid #3498db;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Header */
.shop-header {
  background: linear-gradient(90deg, #3498db, #2980b9);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #2980b9;
}

.shop-title h2 {
  margin: 0;
  color: white;
  font-size: 20px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.shop-title p {
  margin: 2px 0 0 0;
  color: #ecf0f1;
  font-size: 12px;
  opacity: 0.9;
}

.shop-player-info {
  display: flex;
  align-items: center;
}

.player-gold {
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.gold-icon {
  font-size: 14px;
}

.close-btn {
  background: #e74c3c;
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 15px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #c0392b;
  transform: scale(1.1);
}

/* Onglets */
.shop-tabs {
  display: flex;
  background: #34495e;
  border-bottom: 2px solid #2c3e50;
}

.tab-btn {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: #bdc3c7;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  position: relative;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.tab-btn.active {
  background: #3498db;
  color: white;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #2980b9;
}

.tab-icon {
  font-size: 16px;
}

/* Contenu principal */
.shop-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: none;
}

.tab-content.active {
  display: block;
}

/* Grille des objets (onglet buy) */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.shop-item {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.shop-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.shop-item.selected {
  background: rgba(52, 152, 219, 0.3);
  border-color: #3498db;
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.5);
}

.shop-item.unavailable {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.5);
}

.shop-item .item-icon img {
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
}

.shop-item .item-info {
  flex: 1;
}

.shop-item .item-name {
  font-weight: bold;
  color: white;
  font-size: 14px;
  margin-bottom: 4px;
}

.shop-item .item-price {
  color: #2ecc71;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 4px;
}

.shop-item .item-description {
  color: #bdc3c7;
  font-size: 11px;
  line-height: 1.4;
}

.shop-item .stock-info {
  color: #f39c12;
  font-size: 10px;
  font-weight: bold;
  margin-top: 4px;
  display: block;
}

.shop-item .unavailable-reason {
  color: #e74c3c;
  font-size: 10px;
  font-weight: bold;
  margin-top: 4px;
}

/* Messages d'état */
.loading-message,
.no-items {
  text-align: center;
  padding: 40px 20px;
  color: #bdc3c7;
  font-size: 16px;
}

.loading-message p,
.no-items {
  margin: 0;
}

/* === CSS POUR L'ONGLET VENDRE === */

/* Filtres de l'onglet vendre */
.sell-filters {
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.filter-btn.active {
  background: #4CAF50;
  border-color: #45a049;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

/* Grille des objets à vendre */
.sell-items-grid {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

/* Sections par poche */
.pocket-section {
  margin-bottom: 20px;
}

.pocket-title {
  font-size: 14px;
  font-weight: bold;
  color: #ffd700;
  margin: 0 0 10px 0;
  padding: 5px 10px;
  background: rgba(255, 215, 0, 0.2);
  border-radius: 4px;
  border-left: 3px solid #ffd700;
}

.pocket-items-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

/* Objets vendables */
.sell-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.sell-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.sell-item.non-sellable {
  opacity: 0.6;
  background: rgba(255, 0, 0, 0.1);
  border-color: rgba(255, 0, 0, 0.3);
}

/* Icône de l'objet */
.sell-item .item-icon {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.sell-item .item-icon img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.sell-item .item-quantity {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #333;
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 12px;
  text-align: center;
  border: 1px solid #555;
}

/* Informations de l'objet */
.sell-item .item-info {
  flex-grow: 1;
  margin-right: 12px;
}

.sell-item .item-name {
  font-weight: bold;
  color: white;
  font-size: 13px;
  margin-bottom: 2px;
}

.sell-item .item-sell-price {
  color: #90EE90;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 2px;
}

.sell-item .item-description {
  color: #ccc;
  font-size: 11px;
  line-height: 1.3;
}

/* Contrôles de vente */
.sell-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.quantity-btn {
  width: 24px;
  height: 24px;
  background: #555;
  border: 1px solid #777;
  border-radius: 3px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.quantity-btn:hover {
  background: #666;
  transform: scale(1.1);
}

.sell-quantity {
  width: 40px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  color: white;
  text-align: center;
  font-size: 12px;
}

.sell-quantity:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}

.sell-btn {
  padding: 4px 8px;
  background: #FF6B35;
  border: 1px solid #E55A2B;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.sell-btn:hover {
  background: #E55A2B;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
}

/* Messages d'état */
.no-items-message,
.no-sellable-items {
  text-align: center;
  padding: 40px 20px;
  color: #ccc;
}

.no-items-message p,
.no-sellable-items p {
  margin: 5px 0;
}

.no-items-message p:first-child,
.no-sellable-items p:first-child {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

/* Animation de chargement pour l'onglet vendre */
.sell-tab-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #ccc;
}

.sell-tab-loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top: 2px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Highlight pour les objets de valeur */
.sell-item[data-pocket="valuables"] {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.sell-item[data-pocket="valuables"] .item-sell-price {
  color: #ffd700;
  font-weight: bold;
}

/* Footer */
.shop-footer {
  background: #2c3e50;
  border-top: 2px solid #34495e;
  padding: 15px 20px;
}

.selected-item-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.item-details {
  display: flex;
  flex-direction: column;
}

.item-details #selectedItemName {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.item-details #selectedItemPrice {
  color: #2ecc71;
  font-weight: bold;
  font-size: 13px;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-controls button {
  width: 30px;
  height: 30px;
  background: #34495e;
  border: 1px solid #4a6741;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.quantity-controls button:hover {
  background: #4a6741;
  transform: scale(1.1);
}

.quantity-controls input {
  width: 60px;
  height: 30px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  text-align: center;
  font-size: 14px;
}

.quantity-controls input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
}

.action-btn {
  padding: 8px 20px;
  background: #2ecc71;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.action-btn:hover {
  background: #27ae60;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(46, 204, 113, 0.3);
}

.action-btn.buy-btn {
  background: #3498db;
}

.action-btn.buy-btn:hover {
  background: #2980b9;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.shop-footer-info {
  text-align: center;
  margin-top: 5px;
}

.shop-footer-info small {
  color: #7f8c8d;
  font-size: 11px;
}

/* Scrollbar styling */
.items-grid::-webkit-scrollbar,
.sell-items-grid::-webkit-scrollbar {
  width: 8px;
}

.items-grid::-webkit-scrollbar-track,
.sell-items-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.items-grid::-webkit-scrollbar-thumb,
.sell-items-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.items-grid::-webkit-scrollbar-thumb:hover,
.sell-items-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 600px) {
  .shop-container {
    width: 95%;
    max-height: 95vh;
  }
  
  .shop-header {
    padding: 10px 15px;
  }
  
  .shop-title h2 {
    font-size: 18px;
  }
  
  .items-grid {
    grid-template-columns: 1fr;
  }
  
  .sell-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .sell-controls {
    align-self: stretch;
    justify-content: center;
  }
  
  .filter-buttons {
    justify-content: center;
  }
  
  .selected-item-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .tab-btn {
    font-size: 12px;
    padding: 10px;
  }
}
`;

    document.head.appendChild(style);
    console.log("✅ [ShopUI] CSS injecté");
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
    }
    console.log("🏪 [ShopUI] Détruit");
  }
}

console.log("✅ ShopUI version complète avec onglet vendre corrigé chargé !");
