// client/src/components/ShopUI.js - Interface de shop rétro Pokémon (JS seulement)

export class ShopUI {  // 
  
constructor(gameRoom) {
  this.gameRoom = gameRoom;
  this.isVisible = false;
  this.shopData = null;
  this.selectedItem = null;
  this.playerGold = 0;
  this.currentTab = 'buy';
  this.itemLocalizations = {};
  this.currentLanguage = 'fr';
  
  // ✅ NOUVEAUX VERROUS
  this.isProcessingCatalog = false;
  
  this.init();
}

  async loadLocalizations() {
    try {
      const response = await fetch('/localization/itemloca.json');
      this.itemLocalizations = await response.json();
      console.log('🌐 Localisations d\'objets shop chargées');
    } catch (error) {
      console.error('❌ Erreur chargement localizations shop:', error);
      this.itemLocalizations = {};
    }
  }

  getItemName(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    return 'Description non disponible.';
  }

  init() {
    this.loadShopStyles();
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Interface de shop initialisée');
  }

  loadShopStyles() {
    // Charger le fichier CSS du shop si pas déjà fait
    if (!document.querySelector('#shop-styles')) {
      const link = document.createElement('link');
      link.id = 'shop-styles';
      link.rel = 'stylesheet';
      link.href = '/shop.css';
      document.head.appendChild(link);
    }
  }

  createShopInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.className = 'shop-overlay hidden';

    overlay.innerHTML = `
      <div class="shop-container">
        <!-- Header avec style Pokémon classique -->
        <div class="shop-header">
          <div class="shop-title">
            <div class="shop-icon">🏪</div>
            <div class="shop-title-text">
              <span class="shop-name">PokéMart</span>
              <span class="shop-subtitle">Articles pour dresseurs</span>
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

        <!-- Navigation en onglets style Game Boy -->
        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="buy">
            <span class="tab-icon">🛒</span>
            <span class="tab-text">Acheter</span>
          </button>
          <button class="shop-tab" data-tab="sell">
            <span class="tab-icon">💰</span>
            <span class="tab-text">Vendre</span>
          </button>
        </div>

        <div class="shop-content">
          <!-- Liste des objets avec style rétro -->
          <div class="shop-items-section">
            <div class="shop-items-header">
              <span class="section-title">Articles disponibles</span>
              <span class="items-count" id="items-count">0 objets</span>
            </div>
            <div class="shop-items-grid" id="shop-items-grid">
              <!-- Les objets seront générés ici -->
            </div>
          </div>

          <!-- Zone de détails avec style fenêtre Pokémon -->
          <div class="shop-item-details" id="shop-item-details">
            <div class="details-header">
              <span class="details-title">Détails de l'objet</span>
            </div>
            <div class="no-selection">
              <div class="no-selection-icon">🎁</div>
              <p>Sélectionnez un objet pour voir ses détails</p>
            </div>
          </div>
        </div>

        <!-- Footer avec actions style Pokémon -->
        <div class="shop-footer">
          <div class="shop-info">
            <div class="shop-welcome">Bienvenue dans notre boutique !</div>
            <div class="shop-tip">💡 Conseil : Les objets rares apparaissent selon votre niveau</div>
          </div>
          <div class="shop-actions">
            <button class="shop-btn primary" id="shop-action-btn" disabled>
              <span class="btn-icon">🛒</span>
              <span class="btn-text">Acheter</span>
            </button>
            <button class="shop-btn secondary" id="shop-refresh-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de confirmation style Pokémon -->
      <div class="shop-modal hidden" id="shop-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">Confirmation d'achat</span>
          </div>
          <div class="modal-body">
            <div class="modal-item-preview">
              <span class="modal-item-icon">📦</span>
              <div class="modal-item-info">
                <span class="modal-item-name">Nom de l'objet</span>
                <span class="modal-item-price">Prix: 100₽</span>
              </div>
            </div>
            <div class="modal-quantity">
              <label>Quantité :</label>
              <div class="quantity-controls">
                <button class="quantity-btn" id="qty-decrease">−</button>
                <input type="number" class="quantity-input" id="quantity-input" value="1" min="1" max="99">
                <button class="quantity-btn" id="qty-increase">+</button>
              </div>
            </div>
            <div class="modal-total">
              <span class="total-label">Total : </span>
              <span class="total-amount" id="modal-total">100₽</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" id="modal-cancel">Annuler</button>
            <button class="modal-btn confirm" id="modal-confirm">Confirmer</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  setupEventListeners() {
    // Fermeture du shop
    this.overlay.querySelector('.shop-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Fermeture avec ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Changement d'onglets
    this.overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = tab.dataset.tab;
        this.switchTab(tabType);
      });
    });

    // Boutons d'action
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

    // Modal de confirmation
    this.setupModalListeners();

    // Fermeture en cliquant à l'extérieur
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

    // Contrôles de quantité
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

    // Boutons du modal
    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    confirmBtn.addEventListener('click', () => {
      this.confirmTransaction();
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Réception du catalogue de shop
    this.gameRoom.onMessage("shopCatalogResult", (data) => {
      this.handleShopCatalog(data);
    });

    // Résultat de transaction
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      this.handleTransactionResult(data);
    });

    // Mise à jour de l'or du joueur
    this.gameRoom.onMessage("goldUpdate", (data) => {
      this.updatePlayerGold(data.newGold);
    });

    // Rafraîchissement du shop
    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      this.handleRefreshResult(data);
    });
  }

show(shopId, npcName = "Marchand") {
  console.log('[SHOW] shopId:', shopId, 'npcName:', npcName, 'typeof:', typeof npcName, 'value:', npcName);
  
  this.shopOpenUID = (this.shopOpenUID || 0) + 1;
  const debugUID = this.shopOpenUID;
  console.log(`[DEBUG SHOW SHOP] uid=${debugUID}, shopId=${shopId}, npcName=${npcName}, isVisible=${this.isVisible}`);
  
  if (this.isVisible) return;
  
  this.isVisible = true;
  this.overlay.classList.remove('hidden');
  
  // ✅ CORRECTION: Mieux gérer le nom du NPC
  let displayName = "Marchand";
  let npcObject = null;
  
  if (typeof npcName === 'object' && npcName !== null) {
    displayName = npcName.name || "Marchand";
    npcObject = npcName;
  } else if (typeof npcName === 'string') {
    displayName = npcName;
    npcObject = { name: npcName };
  }
  
  // Stocker l'objet NPC complet
  this.pendingNpcName = npcObject;
  
  // Mettre à jour le titre du shop immédiatement
  const shopNameElement = this.overlay.querySelector('.shop-name');
  if (shopNameElement) {
    shopNameElement.textContent = displayName;
  }
  
  // Requête du catalogue du shop
  this.requestShopCatalog(shopId);
  
  console.log(`🏪 Shop ${shopId} ouvert pour ${displayName}`);
}

  createEmptyShopItemElement() {
  const itemElement = document.createElement('div');
  itemElement.className = 'shop-item shop-empty-item';
  itemElement.style.opacity = '0.6';
  itemElement.style.cursor = 'not-allowed';
  
  itemElement.innerHTML = `
    <div class="shop-item-icon">📭</div>
    <div class="shop-item-name">Pas d'articles</div>
    <div class="shop-item-price">-</div>
    <div class="shop-item-stock out">Vide</div>
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
    
    console.log('🏪 Shop fermé');
  }

  requestShopCatalog(shopId) {
    if (this.gameRoom) {
      this.showLoading();
      this.gameRoom.send("getShopCatalog", { shopId });
    }
  }

handleShopCatalog(data) {
  console.log('[HANDLE CATALOG] data:', JSON.stringify(data, null, 2));

  // ✅ CORRECTION: Éviter les appels multiples
  if (this.isProcessingCatalog) {
    console.log('⚠️ [ShopUI] Catalogue déjà en cours de traitement, ignoré');
    return;
  }
  this.isProcessingCatalog = true;

  if (data.success) {
    this.shopData = data.catalog;
    
    // ✅ CORRECTION: Gérer le nom du NPC de manière robuste
    if (this.pendingNpcName) {
      if (typeof this.pendingNpcName === 'object' && this.pendingNpcName.name) {
        this.shopData.npcName = this.pendingNpcName.name;
        this.shopData.npcId = this.pendingNpcName.id;
      } else if (typeof this.pendingNpcName === 'string') {
        this.shopData.npcName = this.pendingNpcName;
      }
    }
    
    // Backup depuis les données du catalogue
    if (!this.shopData.npcName && data.catalog?.npcName) {
      if (typeof data.catalog.npcName === 'object' && data.catalog.npcName.name) {
        this.shopData.npcName = data.catalog.npcName.name;
        this.shopData.npcId = data.catalog.npcName.id;
      } else if (typeof data.catalog.npcName === 'string') {
        this.shopData.npcName = data.catalog.npcName;
      }
    }
    
    this.playerGold = data.playerGold || 0;

    // ✅ CORRECTION MAJEURE: Gérer les deux structures possibles
    let items = [];
    
    // 1. Essayer d'abord "availableItems" (structure préférée)
    if (Array.isArray(this.shopData?.availableItems)) {
      items = this.shopData.availableItems;
      console.log(`🏪 [ShopUI] Items trouvés dans availableItems: ${items.length}`);
    }
    // 2. Sinon essayer "items" (structure alternative)
    else if (Array.isArray(this.shopData?.items)) {
      items = this.shopData.items;
      console.log(`🏪 [ShopUI] Items trouvés dans items: ${items.length}`);
      
      // ✅ Normaliser la structure: déplacer items vers availableItems
      this.shopData.availableItems = items.map(item => ({
        ...item,
        buyPrice: item.customPrice || item.buyPrice || 0,
        sellPrice: item.sellPrice || Math.floor((item.customPrice || item.buyPrice || 0) * 0.5),
        canBuy: item.canBuy !== false,
        canSell: item.canSell !== false,
        unlocked: item.unlocked !== false
      }));
      
      console.log(`🔄 [ShopUI] Structure normalisée: ${this.shopData.availableItems.length} items`);
      items = this.shopData.availableItems;
    }
    // 3. Aucune structure trouvée
    else {
      console.warn(`⚠️ [ShopUI] Aucun item trouvé dans availableItems ou items`);
      console.log(`📊 [ShopUI] Structure reçue:`, Object.keys(this.shopData || {}));
    }
    
    // ✅ CORRECTION: Gestion plus souple des shops vides
    if (items.length === 0) {
      console.warn(`⚠️ [ShopUI] Aucun item disponible, affichage shop vide`);
      
      // Créer un item factice pour indiquer que le shop est vide
      this.shopData.availableItems = [{
        itemId: 'empty_shop',
        buyPrice: 0,
        sellPrice: 0,
        canBuy: false,
        canSell: false,
        unlocked: true,
        stock: 0,
        isEmpty: true // Flag spécial
      }];
      
      // Afficher une notification
      this.showNotification("Ce marchand n'a pas d'articles en stock actuellement", "warning");
    }
    
    this.updatePlayerGoldDisplay();
    this.updateShopTitle(data.catalog.shopInfo);
    this.refreshCurrentTab();
    console.log(`✅ Catalogue shop reçu: ${items.length} objets`);
  } else {
    this.showNotification(data.message || "Impossible de charger le shop", "error");
  }
  
  // ✅ Libérer le verrou après un délai
  setTimeout(() => {
    this.isProcessingCatalog = false;
  }, 500);
}



  updateShopTitle(shopInfo) {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');

     // Ajoute le log ici :
  console.log('[DEBUG SHOP TITLE]', {
    shopInfo,
    npcName: this.shopData?.npcName
  });

    
    shopNameElement.textContent =
  this.shopData?.npcName
  || shopInfo.npcName
  || shopInfo.name
  || "PokéMart";

    shopSubtitleElement.textContent = shopInfo.description || "Articles pour dresseurs";
  }

  switchTab(tabType) {
    // Mettre à jour les onglets visuels
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
    
    if (!this.shopData) {
      this.showEmpty("Aucune donnée de shop disponible");
      return;
    }

    // Animation de transition
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    // Vider la grille
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
  
  // ✅ CORRECTION: Utiliser toujours availableItems (maintenant normalisé)
  const items = Array.isArray(this.shopData?.availableItems) ? this.shopData.availableItems : [];
  const availableItems = items.filter(item => {
    // Les items vides sont toujours affichés
    if (item.isEmpty) return true;
    // Les autres items doivent être achetables et débloqués
    return item.canBuy && item.unlocked;
  });

  if (availableItems.length === 0) {
    this.showEmpty("Aucun objet disponible à l'achat");
    return;
  }

  availableItems.forEach((item, index) => {
    const itemElement = this.createBuyItemElement(item, index);
    itemsGrid.appendChild(itemElement);
  });
}



  displaySellItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    // TODO: Récupérer l'inventaire du joueur pour les objets vendables
    // Pour l'instant, affichage des objets du shop avec prix de vente
    const sellableItems = this.shopData.availableItems.filter(item => item.canSell);

    if (sellableItems.length === 0) {
      this.showEmpty("Aucun objet ne peut être vendu ici");
      return;
    }

    sellableItems.forEach((item, index) => {
      const itemElement = this.createSellItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

createBuyItemElement(item, index) {
  // ✅ CORRECTION: Gérer les items vides
  if (item.isEmpty) {
    return this.createEmptyShopItemElement();
  }
  
  const itemElement = document.createElement('div');
  itemElement.className = 'shop-item';
  itemElement.dataset.itemId = item.itemId;
  itemElement.dataset.index = index;

  // Vérifier la disponibilité
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

  // Animation d'apparition
  setTimeout(() => {
    itemElement.classList.add('new');
  }, index * 50);

  return itemElement;
}

  createSellItemElement(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

    const itemIcon = this.getItemIcon(item.itemId);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="shop-item-icon">${itemIcon}</div>
      <div class="shop-item-name">${itemName}</div>
      <div class="shop-item-price">${item.sellPrice}₽</div>
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    // Animation d'apparition
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getStockDisplay(stock) {
    if (stock === undefined || stock === -1) {
      return ''; // Stock illimité
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
    // Même mapping que dans InventoryUI
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
    // Désélectionner l'ancien item
    this.overlay.querySelectorAll('.shop-item').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Sélectionner le nouveau
    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateItemDetails();
    this.updateActionButton();
  }

  updateItemDetails() {
    const detailsContainer = this.overlay.querySelector('#shop-item-details');
    
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="details-header">
          <span class="details-title">Détails de l'objet</span>
        </div>
        <div class="no-selection">
          <div class="no-selection-icon">🎁</div>
          <p>Sélectionnez un objet pour voir ses détails</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId);

    const price = this.currentTab === 'buy' ? item.buyPrice : item.sellPrice;
    const priceLabel = this.currentTab === 'buy' ? 'Prix d\'achat' : 'Prix de vente';

    detailsContainer.innerHTML = `
      <div class="details-header">
        <span class="details-title">Détails de l'objet</span>
      </div>
      <div class="item-detail-content">
        <div class="item-detail-header">
          <div class="item-detail-icon">${itemIcon}</div>
          <div class="item-detail-info">
            <h3>${itemName}</h3>
            <div class="item-detail-type">${this.getItemTypeText(item)}</div>
          </div>
        </div>
        <div class="item-detail-description">
          ${itemDescription}
        </div>
        <div class="item-detail-stats">
          <div class="item-stat">
            <span class="item-stat-label">${priceLabel}</span>
            <span class="item-stat-value">${price}₽</span>
          </div>
          ${this.getItemStatsHTML(item)}
        </div>
      </div>
    `;
  }

  getItemTypeText(item) {
    return item.type || 'Objet';
  }

  getItemStatsHTML(item) {
    const stats = [];
    
    if (this.currentTab === 'buy' && item.stock !== undefined && item.stock !== -1) {
      stats.push(`
        <div class="item-stat">
          <span class="item-stat-label">Stock</span>
          <span class="item-stat-value">${item.stock}</span>
        </div>
      `);
    }

    if (item.unlockLevel && item.unlockLevel > 1) {
      stats.push(`
        <div class="item-stat">
          <span class="item-stat-label">Niveau requis</span>
          <span class="item-stat-value">${item.unlockLevel}</span>
        </div>
      `);
    }

    return stats.join('');
  }

  updateActionButton() {
    const actionBtn = this.overlay.querySelector('#shop-action-btn');
    const btnIcon = actionBtn.querySelector('.btn-icon');
    const btnText = actionBtn.querySelector('.btn-text');

    if (!this.selectedItem) {
      actionBtn.disabled = true;
      btnIcon.textContent = '🛒';
      btnText.textContent = this.currentTab === 'buy' ? 'Acheter' : 'Vendre';
      return;
    }

    if (this.currentTab === 'buy') {
      const canAfford = this.playerGold >= this.selectedItem.buyPrice;
      const inStock = this.selectedItem.stock === undefined || this.selectedItem.stock === -1 || this.selectedItem.stock > 0;
      
      actionBtn.disabled = !canAfford || !inStock;
      btnIcon.textContent = '🛒';
      btnText.textContent = 'Acheter';
    } else {
      actionBtn.disabled = false; // TODO: Vérifier l'inventaire du joueur
      btnIcon.textContent = '💰';
      btnText.textContent = 'Vendre';
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
    const itemCount = itemsGrid.querySelectorAll('.shop-item').length;
    
    itemsCountElement.textContent = `${itemCount} objets`;
  }

  showBuyModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');

    // Configurer le modal
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `Prix unitaire: ${this.selectedItem.buyPrice}₽`;

    // Configurer la quantité maximum
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
    this.showNotification("Fonction de vente pas encore implémentée", "warning");
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
      this.showNotification(data.message || "Transaction réussie !", "success");
      
      // Mettre à jour l'or du joueur
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      // Rafraîchir le catalogue pour mettre à jour le stock
      this.requestShopCatalog(this.shopData.shopInfo.id);
    } else {
      this.showNotification(data.message || "Transaction échouée", "error");
    }
  }

  handleRefreshResult(data) {
    if (data.success) {
      if (data.restocked) {
        this.showNotification("Magasin restocké !", "success");
      } else {
        this.showNotification("Pas de restock nécessaire", "info");
      }
    } else {
      this.showNotification(data.message || "Erreur lors du rafraîchissement", "error");
    }
  }

  showLoading() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-loading">
        <div class="shop-loading-spinner"></div>
        <div class="shop-loading-text">Chargement du catalogue...</div>
      </div>
    `;
  }

  showEmpty(message) {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-empty">
        <div class="shop-empty-icon">🏪</div>
        <div class="shop-empty-text">${message}</div>
        <div class="shop-empty-subtext">Revenez plus tard !</div>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    // Supprimer les anciennes notifications
    const existingNotifications = document.querySelectorAll('.shop-notification');
    existingNotifications.forEach(notif => notif.remove());

    // Créer la nouvelle notification
    const notification = document.createElement('div');
    notification.className = `shop-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-suppression après 4 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);
  }

  // Méthodes publiques pour l'intégration
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

  // Méthode pour gérer les raccourcis clavier
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

  // Méthode pour naviguer entre les objets avec les flèches
  navigateItems(direction) {
    const items = this.overlay.querySelectorAll('.shop-item:not(.unavailable)');
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

  // Méthode pour l'intégration avec d'autres systèmes
  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !inventoryOpen;
  }

  // Méthode utilitaire pour vérifier si un objet peut être acheté
  canBuyItem(item) {
    if (!item) return false;
    
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isUnlocked = item.unlocked;
    
    return canAfford && inStock && isUnlocked;
  }

  // Méthode pour obtenir des statistiques du shop
  getShopStats() {
    if (!this.shopData) return null;

    const items = this.shopData.availableItems;
    const buyableItems = items.filter(item => item.canBuy && item.unlocked);
    const affordableItems = buyableItems.filter(item => this.canBuyItem(item));
    
    return {
      totalItems: items.length,
      buyableItems: buyableItems.length,
      affordableItems: affordableItems.length,
      playerGold: this.playerGold,
      currentTab: this.currentTab
    };
  }

  // Méthode pour obtenir les objets recommandés
  getRecommendedItems() {
    if (!this.shopData) return [];

    const items = this.shopData.availableItems;
    return items
      .filter(item => this.canBuyItem(item))
      .filter(item => {
        // Recommander les objets de soin si le joueur a peu d'or
        if (this.playerGold < 1000) {
          return item.itemId.includes('potion') || item.itemId.includes('ball');
        }
        return true;
      })
      .sort((a, b) => a.buyPrice - b.buyPrice) // Trier par prix croissant
      .slice(0, 3); // Top 3
  }

  // Méthode pour afficher les objets recommandés
  showRecommendations() {
    const recommended = this.getRecommendedItems();
    if (recommended.length === 0) return;

    const message = `Objets recommandés: ${recommended.map(item => this.getItemName(item.itemId)).join(', ')}`;
    this.showNotification(message, 'info');
  }

  // Méthode pour vérifier les alertes de stock faible
  showLowStockAlert() {
    if (!this.shopData) return;
    
    const lowStockItems = this.shopData.availableItems.filter(item => 
      item.stock !== undefined && item.stock !== -1 && item.stock <= 3
    );
    
    if (lowStockItems.length > 0) {
      const itemNames = lowStockItems.map(item => this.getItemName(item.itemId));
      this.showNotification(
        `⚠️ Stock faible: ${itemNames.slice(0, 3).join(', ')}${itemNames.length > 3 ? '...' : ''}`,
        'warning'
      );
    }
  }

  // Méthode pour vérifier les promotions
  checkForPromotions() {
    if (!this.shopData) return;

    // Exemple de logique de promotion
    const promoItems = this.shopData.availableItems.filter(item => {
      // Promotion sur les objets chers si le joueur a beaucoup d'or
      return this.playerGold > 5000 && item.buyPrice > 1000;
    });

    if (promoItems.length > 0) {
      this.showNotification("🎉 Offres spéciales disponibles sur les objets premium !", 'success');
    }
  }

  // Méthode pour afficher l'historique des achats (placeholder)
  showHistory() {
    if (!window.shopHistory || window.shopHistory.length === 0) {
      this.showNotification("Aucun historique d'achat", 'info');
      return;
    }

    const recent = window.shopHistory.slice(-5).reverse();
    const historyText = recent.map(h => 
      `${h.action === 'buy' ? '🛒' : '💰'} ${h.quantity}x ${h.itemName} (${h.cost}₽)`
    ).join('\n');
    
    console.log('📜 Historique des achats récents:\n' + historyText);
    this.showNotification("Historique affiché dans la console", 'info');
  }

  // Méthode de nettoyage
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Nettoyer les références
    this.gameRoom = null;
    this.shopData = null;
    this.selectedItem = null;
    this.overlay = null;
    
    console.log('🏪 ShopUI détruit');
  }
   }
