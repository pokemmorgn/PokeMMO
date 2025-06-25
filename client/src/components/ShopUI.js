// client/src/components/ShopUI.js - VERSION COMPLÈTE AVEC ONGLET VENDRE CORRIGÉ

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.overlay = null;
    this.isVisible = false;
    this.currentTab = 'buy';
    this.selectedItem = null;
    this.shopData = null;
    this.playerInventory = null; // ✅ NOUVEAU: Inventaire du joueur pour l'onglet vendre
    this.currentShopId = null;
    this.currentNpcName = null;
    this.isProcessingCatalog = false;
    this.playerGold = 0;

    // Configuration
    this.config = {
      maxQuantity: 99,
      confirmThreshold: 1000, // Confirmation pour les achats/ventes > 1000₽
      enableSounds: true,
      enableAnimations: true
    };

    this.setupEventHandlers();
    this.setupInventoryHandlers(); // ✅ NOUVEAU
    this.createShopInterface();
    
    console.log("🏪 [ShopUI] Initialisé avec support vente inventaire");
  }

  // ✅ NOUVEAU : Handler pour récupérer l'inventaire du joueur
  setupInventoryHandlers() {
    if (!this.gameRoom) return;
    
    // Écouter les données d'inventaire du serveur
    this.gameRoom.onMessage("playerInventoryForShop", (data) => {
      console.log("🎒 [ShopUI] Inventaire reçu pour vente:", data);
      
      if (data.success) {
        this.playerInventory = data.inventory || {};
        this.currentShopId = data.shopId;
        this.displaySellTab();
      } else {
        console.error("❌ [ShopUI] Erreur récupération inventaire:", data.message);
        this.showInventoryError(data.message);
      }
    });
  }

  setupEventHandlers() {
    if (!this.gameRoom) return;

    // Handler pour recevoir le catalogue
    this.gameRoom.onMessage("shopCatalogResult", (data) => {
      this.handleShopCatalog(data);
    });

    // Handler pour les résultats de transaction
    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      this.handleTransactionResult(data);
    });

    // Handler pour les mises à jour d'or
    this.gameRoom.onMessage("goldUpdate", (data) => {
      this.updatePlayerGold(data.newGold, data.oldGold);
    });

    // Handler pour les mises à jour d'inventaire
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.handleInventoryUpdate(data);
    });

    console.log("✅ [ShopUI] Event handlers configurés");
  }

  createShopInterface() {
    // Supprimer l'interface existante si elle existe
    if (this.overlay) {
      this.overlay.remove();
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'shopOverlay';
    this.overlay.className = 'shop-overlay';
    this.overlay.style.display = 'none';

    this.overlay.innerHTML = `
      <div class="shop-container">
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
          <button class="shop-close-btn" id="shopCloseBtn">×</button>
        </div>

        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="buy">
            <span class="tab-icon">🛒</span>
            Acheter
          </button>
          <button class="shop-tab" data-tab="sell">
            <span class="tab-icon">💰</span>
            Vendre
          </button>
        </div>

        <div class="shop-content">
          <!-- Onglet Acheter -->
          <div id="buyTab" class="tab-content active">
            <div class="shop-section-header">
              <h3>Objets en vente</h3>
              <div class="shop-filters">
                <button class="filter-btn active" data-filter="all">Tout</button>
                <button class="filter-btn" data-filter="balls">Poké Balls</button>
                <button class="filter-btn" data-filter="medicine">Médicaments</button>
                <button class="filter-btn" data-filter="items">Objets</button>
              </div>
            </div>
            <div class="items-container" id="buyItems">
              <div class="loading-message">
                <p>Chargement des objets...</p>
              </div>
            </div>
          </div>

          <!-- Onglet Vendre -->
          <div id="sellTab" class="tab-content">
            <div class="shop-section-header">
              <h3>Votre inventaire</h3>
              <p class="section-subtitle">Sélectionnez les objets à vendre</p>
            </div>
            <div class="items-container" id="sellItems">
              <div class="loading-message">
                <p>Chargement de votre inventaire...</p>
              </div>
            </div>
          </div>
        </div>

        <div class="shop-footer">
          <div class="transaction-summary" id="transactionSummary" style="display: none;">
            <span id="summaryText"></span>
            <button id="confirmTransactionBtn" class="confirm-btn">Confirmer</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.setupUIEventListeners();
    
    console.log("✅ [ShopUI] Interface créée");
  }

  setupUIEventListeners() {
    // Fermeture du shop
    const closeBtn = document.getElementById('shopCloseBtn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Fermeture en cliquant sur l'overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Gestion des onglets
    const tabButtons = this.overlay.querySelectorAll('.shop-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Gestion des filtres (onglet acheter)
    const filterButtons = this.overlay.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setActiveFilter(e.currentTarget);
        this.filterBuyItems(e.currentTarget.dataset.filter);
      });
    });

    // Touche ESC pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    console.log("✅ [ShopUI] Event listeners UI configurés");
  }

  // ===== MÉTHODES D'AFFICHAGE =====

  show(shopId, npc) {
    console.log(`🏪 [ShopUI] === SHOW CALLED ===`);
    console.log(`📊 shopId: ${shopId}, npcName:`, npc);
    console.log(`📊 current isVisible: ${this.isVisible}`);

    if (!this.overlay) {
      console.error("❌ [ShopUI] Pas d'overlay pour afficher le shop");
      return;
    }

    // Stocker les informations
    this.currentShopId = shopId;
    this.currentNpcName = npc?.name || npc || "Marchand";

    // Mettre à jour le titre
    const shopTitle = document.getElementById('shopTitle');
    const shopDescription = document.getElementById('shopDescription');
    
    if (shopTitle) {
      shopTitle.textContent = `Boutique de ${this.currentNpcName}`;
    }
    if (shopDescription) {
      shopDescription.textContent = "Que souhaitez-vous faire ?";
    }

    // Afficher l'overlay
    this.overlay.style.display = 'flex';
    this.isVisible = true;

    // Animation d'ouverture
    if (this.config.enableAnimations) {
      this.overlay.style.opacity = '0';
      requestAnimationFrame(() => {
        this.overlay.style.transition = 'opacity 0.3s ease-in-out';
        this.overlay.style.opacity = '1';
      });
    }

    // Démarrer sur l'onglet acheter
    this.switchTab('buy');

    // Marquer comme global
    document.body.classList.add('shop-open');

    console.log(`✅ [ShopUI] Shop displayed for ${this.currentNpcName}`);
  }

  hide() {
    if (!this.isVisible || !this.overlay) return;

    console.log("🏪 [ShopUI] Fermeture du shop");

    if (this.config.enableAnimations) {
      this.overlay.style.transition = 'opacity 0.3s ease-in-out';
      this.overlay.style.opacity = '0';
      
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.overlay.style.transition = '';
        this.overlay.style.opacity = '1';
      }, 300);
    } else {
      this.overlay.style.display = 'none';
    }

    this.isVisible = false;
    this.resetShopState();

    // Nettoyer les classes globales
    document.body.classList.remove('shop-open');

    console.log("✅ [ShopUI] Shop fermé");
  }

  resetShopState() {
    this.selectedItem = null;
    this.shopData = null;
    this.playerInventory = null; // ✅ NOUVEAU
    this.isProcessingCatalog = false;
    this.hideSummary();
  }

  // ===== GESTION DES ONGLETS =====

  switchTab(tabName) {
    console.log(`🏪 [ShopUI] Switch vers onglet: ${tabName}`);

    // Mettre à jour les boutons d'onglet
    const tabButtons = this.overlay.querySelectorAll('.shop-tab');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Mettre à jour le contenu
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');

    if (tabName === 'buy') {
      this.showBuyTab();
    } else if (tabName === 'sell') {
      this.showSellTab(); // ✅ NOUVEAU: Méthode corrigée
    }

    this.currentTab = tabName;
  }

  showBuyTab() {
    console.log("🛒 [ShopUI] Passage à l'onglet BUY");
    
    // Affichage/masquage des onglets
    document.getElementById('buyTab').style.display = 'block';
    document.getElementById('sellTab').style.display = 'none';
    
    // Si on a déjà des données, les afficher
    if (this.shopData) {
      this.displayBuyTab();
    } else {
      console.log("📊 [ShopUI] Pas de données shop, demande au serveur...");
      this.requestShopCatalog();
    }
  }

  // ✅ NOUVEAU : Afficher l'onglet vendre (inventaire du joueur)
  showSellTab() {
    console.log("💰 [ShopUI] Passage à l'onglet SELL");
    
    // Affichage/masquage des onglets
    document.getElementById('buyTab').style.display = 'none';
    document.getElementById('sellTab').style.display = 'block';
    
    this.currentTab = 'sell';
    
    // ✅ NOUVEAU : Demander l'inventaire au serveur
    if (this.gameRoom && this.currentShopId) {
      console.log("📤 [ShopUI] Demande inventaire pour vente...");
      
      // Afficher un message de chargement
      const sellItems = document.getElementById('sellItems');
      if (sellItems) {
        sellItems.innerHTML = `
          <div class="sell-tab-loading">
            <span>Chargement de votre inventaire...</span>
          </div>
        `;
      }
      
      this.gameRoom.send("getPlayerInventoryForShop", {
        shopId: this.currentShopId
      });
    } else {
      console.error("❌ [ShopUI] Impossible de demander l'inventaire: pas de connexion ou shopId");
    }
  }

  // ===== GESTION DU CATALOGUE SHOP =====

  handleShopCatalog(data) {
    console.log(`🏪 [ShopUI] === HANDLE SHOP CATALOG ===`);
    console.log(`📊 Data received:`, data);

    if (!data.success) {
      console.error("❌ [ShopUI] Erreur catalogue:", data.message);
      this.showError("Impossible de charger le catalogue");
      return;
    }

    if (this.isProcessingCatalog) {
      console.log("⏳ [ShopUI] Déjà en train de traiter un catalogue, ignoré");
      return;
    }

    this.isProcessingCatalog = true;

    try {
      // Extraire les données du catalogue
      this.shopData = {
        shopInfo: data.catalog?.shopInfo || {},
        availableItems: data.catalog?.availableItems || [],
        npcName: data.catalog?.npcName || this.currentNpcName
      };

      console.log(`[DEBUG SHOP TITLE]`, {
        shopInfo: this.shopData.shopInfo,
        npcName: this.shopData.npcName
      });

      // Mettre à jour l'or du joueur
      if (data.playerGold !== undefined) {
        this.updatePlayerGold(data.playerGold);
      }

      // Mettre à jour le titre du shop
      this.updateShopTitle();

      // Afficher le catalogue si on est sur l'onglet acheter
      if (this.currentTab === 'buy') {
        this.displayBuyTab();
      }

      console.log(`✅ [ShopUI] Shop catalog processed with ${this.shopData.availableItems.length} objects`);

    } catch (error) {
      console.error("❌ [ShopUI] Erreur traitement catalogue:", error);
      this.showError("Erreur lors du traitement du catalogue");
    } finally {
      this.isProcessingCatalog = false;
    }
  }

  updateShopTitle() {
    const shopTitle = document.getElementById('shopTitle');
    const shopDescription = document.getElementById('shopDescription');

    if (shopTitle && this.shopData?.shopInfo?.name) {
      shopTitle.textContent = this.shopData.shopInfo.name;
    }

    if (shopDescription && this.shopData?.shopInfo?.description) {
      shopDescription.textContent = this.shopData.shopInfo.description;
    }
  }

  // ===== AFFICHAGE ONGLET ACHETER =====

  displayBuyTab() {
    console.log(`🔍 [ShopUI] === AFFICHAGE ONGLET BUY ===`);
    
    const buyItemsContainer = document.getElementById('buyItems');
    if (!buyItemsContainer) {
      console.error("❌ [ShopUI] Container buyItems non trouvé");
      return;
    }

    if (!this.shopData?.availableItems) {
      console.error("❌ [ShopUI] Pas de données d'objets");
      buyItemsContainer.innerHTML = '<div class="error-message">Aucun objet disponible</div>';
      return;
    }

    console.log(`📦 Total items reçus: ${this.shopData.availableItems.length}`);
    console.log(`👤 Niveau joueur: ${this.playerLevel || 'non défini'}`);

    buyItemsContainer.innerHTML = '';

    let displayedItems = 0;

    this.shopData.availableItems.forEach((item, index) => {
      console.log(`📦 Item ${index + 1}: ${item.itemId}`);
      console.log(`  - buyPrice: ${item.buyPrice}₽`);
      console.log(`  - canBuy: ${item.canBuy}`);
      console.log(`  - unlocked: ${item.unlocked}`);
      console.log(`  - unlockLevel: ${item.unlockLevel || 'aucun'}`);
      console.log(`  - stock: ${item.stock}`);
      console.log(`  - isEmpty: ${item.stock === 0}`);

      // ✅ AFFICHER TOUS LES ITEMS (débloqués ET bloqués)
      const itemElement = this.createBuyItemElement(item);
      buyItemsContainer.appendChild(itemElement);
      
      if (item.unlocked && item.canBuy) {
        console.log(`✅ [ShopUI] ${item.itemId}: AFFICHÉ`);
        displayedItems++;
      } else {
        console.log(`❌ [ShopUI] ${item.itemId}: MASQUÉ`);
        if (!item.canBuy) {
          console.log(`  ❌ Raison: canBuy = false`);
        }
        if (!item.unlocked) {
          console.log(`  ❌ Raison: niveau requis ${item.unlockLevel}, joueur niveau ${this.playerLevel || 1}`);
        }
      }
    });

    console.log(`📊 [ShopUI] RÉSULTAT FINAL: ${displayedItems}/${this.shopData.availableItems.length} items affichés dans l'onglet BUY`);
  }

  createBuyItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = `shop-item ${!item.unlocked ? 'locked' : ''} ${!item.canBuy ? 'unavailable' : ''}`;
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.category = this.getItemCategory(item.itemId);

    const stockText = item.stock === -1 ? 'Illimité' : 
                     item.stock === 0 ? 'Rupture' : 
                     `Stock: ${item.stock}`;

    const statusText = !item.unlocked ? `Niveau ${item.unlockLevel} requis` :
                      !item.canBuy ? 'Indisponible' : '';

    itemElement.innerHTML = `
      <div class="item-icon">
        <img src="/assets/items/${item.itemId}.png" 
             alt="${item.itemId}" 
             onerror="this.src='/assets/items/placeholder.png'">
      </div>
      <div class="item-info">
        <div class="item-name">${this.getItemName(item.itemId)}</div>
        <div class="item-description">${this.getItemDescription(item.itemId)}</div>
        <div class="item-meta">
          <span class="item-price">${item.buyPrice}₽</span>
          <span class="item-stock">${stockText}</span>
        </div>
        ${statusText ? `<div class="item-status">${statusText}</div>` : ''}
      </div>
      ${item.unlocked && item.canBuy ? `
        <div class="item-actions">
          <div class="quantity-controls">
            <button class="quantity-btn" data-action="decrease">-</button>
            <input type="number" class="quantity-input" value="1" min="1" max="${item.stock === -1 ? this.config.maxQuantity : item.stock}">
            <button class="quantity-btn" data-action="increase">+</button>
          </div>
          <button class="buy-btn" data-item-id="${item.itemId}">Acheter</button>
        </div>
      ` : ''}
    `;

    // Event listeners pour l'item
    if (item.unlocked && item.canBuy) {
      this.setupBuyItemControls(itemElement, item);
    }

    return itemElement;
  }

  setupBuyItemControls(itemElement, item) {
    const quantityInput = itemElement.querySelector('.quantity-input');
    const decreaseBtn = itemElement.querySelector('[data-action="decrease"]');
    const increaseBtn = itemElement.querySelector('[data-action="increase"]');
    const buyBtn = itemElement.querySelector('.buy-btn');

    // Contrôles de quantité
    decreaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        this.updateBuyTotal(itemElement, item);
      }
    });

    increaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      const maxValue = item.stock === -1 ? this.config.maxQuantity : item.stock;
      if (currentValue < maxValue) {
        quantityInput.value = currentValue + 1;
        this.updateBuyTotal(itemElement, item);
      }
    });

    quantityInput?.addEventListener('input', () => {
      let value = parseInt(quantityInput.value) || 1;
      const maxValue = item.stock === -1 ? this.config.maxQuantity : item.stock;
      value = Math.max(1, Math.min(value, maxValue));
      quantityInput.value = value;
      this.updateBuyTotal(itemElement, item);
    });

    // Bouton d'achat
    buyBtn?.addEventListener('click', () => {
      const quantity = parseInt(quantityInput.value);
      this.buyItem(item.itemId, quantity, item.buyPrice);
    });
  }

  updateBuyTotal(itemElement, item) {
    const quantityInput = itemElement.querySelector('.quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;
    const total = item.buyPrice * quantity;
    
    // Mettre à jour le résumé si visible
    this.showSummary(`${quantity}x ${this.getItemName(item.itemId)} = ${total}₽`, () => {
      this.buyItem(item.itemId, quantity, item.buyPrice);
    });
  }

  // ===== AFFICHAGE ONGLET VENDRE (NOUVEAU) =====

  // ✅ NOUVEAU : Afficher l'onglet vendre avec l'inventaire
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
    const pocketOrder = ['items', 'medicine', 'balls', 'berries', 'valuables', 'tms', 'key_items'];
    
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
        if (item.quantity > 0 && item.canSell) {
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
    const sellPrice = item.sellPrice || 0;
    const canSell = item.canSell && sellPrice > 0;
    
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
    decreaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        this.updateSellTotal(itemElement, item);
      }
    });
    
    increaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value);
      if (currentValue < item.quantity) {
        quantityInput.value = currentValue + 1;
        this.updateSellTotal(itemElement, item);
      }
    });
    
    quantityInput?.addEventListener('input', () => {
      let value = parseInt(quantityInput.value) || 1;
      value = Math.max(1, Math.min(value, item.quantity));
      quantityInput.value = value;
      this.updateSellTotal(itemElement, item);
    });
    
    // Bouton de vente
    sellBtn?.addEventListener('click', () => {
      const quantity = parseInt(quantityInput.value);
      this.sellItem(item.itemId, quantity);
    });
  }

  updateSellTotal(itemElement, item) {
    const quantityInput = itemElement.querySelector('.sell-quantity');
    const quantity = parseInt(quantityInput.value) || 1;
    const total = (item.sellPrice || 0) * quantity;
    
    // Mettre à jour le résumé si visible
    this.showSummary(`Vendre ${quantity}x ${this.getItemName(item.itemId)} = ${total}₽`, () => {
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

  // ===== MÉTHODES DE TRANSACTION =====

  buyItem(itemId, quantity, unitPrice) {
    if (!this.gameRoom || !this.currentShopId) {
      console.error("❌ [ShopUI] Impossible d'acheter: pas de connexion");
      this.showError("Erreur de connexion");
      return;
    }

    const totalCost = unitPrice * quantity;

    console.log(`🛒 [ShopUI] Achat: ${quantity}x ${itemId} pour ${totalCost}₽`);

    // Vérification basique de l'or
    if (totalCost > this.playerGold) {
      this.showError("Pas assez d'argent !");
      return;
    }

    // Confirmation pour les gros achats
    if (totalCost > this.config.confirmThreshold) {
      const confirm = window.confirm(`Acheter ${quantity}x ${this.getItemName(itemId)} pour ${totalCost}₽ ?`);
      if (!confirm) return;
    }

    // Envoyer la transaction au serveur
    this.gameRoom.send("shopTransaction", {
      shopId: this.currentShopId,
      action: 'buy',
      itemId: itemId,
      quantity: quantity
    });

    this.hideSummary();
  }

  // ✅ NOUVEAU : Méthode de vente
  sellItem(itemId, quantity) {
    if (!this.gameRoom || !this.currentShopId) {
      console.error("❌ [ShopUI] Impossible de vendre: pas de connexion");
      this.showError("Erreur de connexion");
      return;
    }
    
    // Trouver l'objet dans l'inventaire pour obtenir le prix
    let sellPrice = 0;
    let foundItem = null;
    
    for (const pocketName in this.playerInventory) {
      const pocketItems = this.playerInventory[pocketName];
      foundItem = pocketItems.find(item => item.itemId === itemId);
      if (foundItem) {
        sellPrice = foundItem.sellPrice || 0;
        break;
      }
    }
    
    if (!foundItem || sellPrice <= 0) {
      this.showError("Impossible de vendre cet objet");
      return;
    }
    
    const totalValue = sellPrice * quantity;
    
    console.log(`💰 [ShopUI] Vente: ${quantity}x ${itemId} pour ${totalValue}₽`);
    
    // Confirmation pour les grosses ventes
    if (totalValue > this.config.confirmThreshold) {
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

    this.hideSummary();
  }

  handleTransactionResult(data) {
    console.log("💰 [ShopUI] Résultat transaction:", data);

    if (data.success) {
      this.showSuccess(data.message || "Transaction réussie !");
      
      // Rafraîchir l'affichage selon l'onglet actuel
      if (this.currentTab === 'buy') {
        // Pour l'achat, demander le catalogue mis à jour
        this.requestShopCatalog();
      } else if (this.currentTab === 'sell') {
        // Pour la vente, demander l'inventaire mis à jour
        this.refreshSellTab();
      }
      
      // Jouer un son de succès
      this.playSound('success');
      
    } else {
      this.showError(data.message || "Transaction échouée");
      this.playSound('error');
    }
  }

  // ✅ NOUVEAU : Rafraîchir l'onglet vendre
  refreshSellTab() {
    if (this.currentTab === 'sell' && this.gameRoom && this.currentShopId) {
      console.log("🔄 [ShopUI] Rafraîchissement onglet vendre...");
      this.gameRoom.send("getPlayerInventoryForShop", {
        shopId: this.currentShopId
      });
    }
  }

  // ===== UTILITAIRES =====

  requestShopCatalog() {
    if (!this.gameRoom || !this.currentShopId) {
      console.error("❌ [ShopUI] Impossible de demander le catalogue");
      return;
    }

    console.log(`📤 [ShopUI] Demande catalogue pour shop: ${this.currentShopId}`);
    this.gameRoom.send("getShopCatalog", {
      shopId: this.currentShopId
    });
  }

  filterBuyItems(filter) {
    const items = document.querySelectorAll('#buyItems .shop-item');
    
    items.forEach(item => {
      const category = item.dataset.category;
      const shouldShow = filter === 'all' || category === filter;
      item.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  setActiveFilter(activeButton) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
  }

  updatePlayerGold(newGold, oldGold = null) {
    this.playerGold = newGold;
    
    const goldElement = document.getElementById('playerGold');
    if (goldElement) {
      goldElement.textContent = newGold.toLocaleString();
      
      // Animation de changement d'or
      if (oldGold !== null && this.config.enableAnimations) {
        const change = newGold - oldGold;
        if (change !== 0) {
          goldElement.classList.add(change > 0 ? 'gold-increase' : 'gold-decrease');
          setTimeout(() => {
            goldElement.classList.remove('gold-increase', 'gold-decrease');
          }, 1000);
        }
      }
    }
  }

  handleInventoryUpdate(data) {
    console.log("🎒 [ShopUI] Mise à jour inventaire:", data);
    
    // Si on est sur l'onglet vendre, rafraîchir l'affichage
    if (this.currentTab === 'sell') {
      // Petit délai pour que la mise à jour serveur soit effective
      setTimeout(() => {
        this.refreshSellTab();
      }, 500);
    }
  }

  // ===== GESTION DES MESSAGES =====

  showSummary(text, confirmCallback) {
    const summary = document.getElementById('transactionSummary');
    const summaryText = document.getElementById('summaryText');
    const confirmBtn = document.getElementById('confirmTransactionBtn');

    if (summary && summaryText && confirmBtn) {
      summaryText.textContent = text;
      summary.style.display = 'flex';

      // Nettoyer les anciens listeners
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      const newConfirmBtn = document.getElementById('confirmTransactionBtn');
      
      newConfirmBtn.addEventListener('click', () => {
        confirmCallback();
        this.hideSummary();
      });
    }
  }

  hideSummary() {
    const summary = document.getElementById('transactionSummary');
    if (summary) {
      summary.style.display = 'none';
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showInventoryError(message) {
    const sellItems = document.getElementById('sellItems');
    if (sellItems) {
      sellItems.innerHTML = `
        <div class="error-message">
          <p>Erreur de chargement</p>
          <p>${message}</p>
          <button onclick="this.refreshSellTab()" class="retry-btn">Réessayer</button>
        </div>
      `;
    }
  }

  showNotification(message, type = 'info') {
    // Système de notification simple
    const notification = document.createElement('div');
    notification.className = `shop-notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '10px 20px',
      borderRadius: '4px',
      color: 'white',
      fontWeight: 'bold',
      zIndex: '10001',
      backgroundColor: type === 'error' ? '#f44336' : 
                      type === 'success' ? '#4CAF50' : '#2196F3'
    });

    document.body.appendChild(notification);

    // Animation d'apparition
    if (this.config.enableAnimations) {
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'transform 0.3s ease-out';
      
      requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
      });
    }

    // Suppression automatique
    setTimeout(() => {
      if (this.config.enableAnimations) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      } else {
        notification.remove();
      }
    }, 3000);
  }

  playSound(type) {
    if (!this.config.enableSounds) return;
    
    // Système de sons simple
    const sounds = {
      success: () => {
        const audio = new Audio('/assets/sounds/success.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      },
      error: () => {
        const audio = new Audio('/assets/sounds/error.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    };
    
    if (sounds[type]) {
      sounds[type]();
    }
  }

  // ===== MÉTHODES D'INFORMATION SUR LES OBJETS =====

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
      'poke_ball': 'Une Ball ordinaire pour capturer des Pokémon sauvages.',
      'great_ball': 'Ball de qualité supérieure avec un meilleur taux de capture.',
      'ultra_ball': 'Ball de très haute qualité avec un excellent taux de capture.',
      'master_ball': 'La Ball ultime qui capture à coup sûr.',
      'potion': 'Restaure 20 PV à un Pokémon.',
      'super_potion': 'Restaure 50 PV à un Pokémon.',
      'hyper_potion': 'Restaure 200 PV à un Pokémon.',
      'max_potion': 'Restaure tous les PV d\'un Pokémon.',
      'revive': 'Réanime un Pokémon KO et restaure la moitié de ses PV.',
      'max_revive': 'Réanime un Pokémon KO et restaure tous ses PV.',
      'antidote': 'Guérit un Pokémon empoisonné.',
      'escape_rope': 'Permet de sortir instantanément d\'un lieu.',
      'repel': 'Repousse les Pokémon sauvages faibles pendant 100 pas.'
    };

    return descriptions[itemId] || 'Objet utile pour les dresseurs.';
  }

  getItemCategory(itemId) {
    if (itemId.includes('ball')) return 'balls';
    if (itemId.includes('potion') || itemId.includes('heal') || itemId === 'antidote' || itemId.includes('revive')) return 'medicine';
    return 'items';
  }

  // ===== GESTION CLAVIER =====

  handleKeyPress(key) {
    if (!this.isVisible) return false;

    switch (key.toLowerCase()) {
      case 'escape':
        this.hide();
        return true;

      case 'tab':
        // Changer d'onglet
        this.switchTab(this.currentTab === 'buy' ? 'sell' : 'buy');
        return true;

      case '1':
      case '2':
      case '3':
      case '4':
        // Filtres rapides (onglet acheter)
        if (this.currentTab === 'buy') {
          const filters = ['all', 'balls', 'medicine', 'items'];
          const filterIndex = parseInt(key) - 1;
          if (filters[filterIndex]) {
            this.filterBuyItems(filters[filterIndex]);
            // Mettre à jour le bouton actif
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach((btn, idx) => {
              btn.classList.toggle('active', idx === filterIndex);
            });
          }
          return true;
        }
        break;

      default:
        return false;
    }

    return false;
  }

  // ===== MÉTHODES DE DEBUG =====

  debugShopState() {
    console.log('🔍 [ShopUI] === DEBUG ÉTAT COMPLET ===');
    console.log('📊 GÉNÉRAL:');
    console.log('  - Visible:', this.isVisible);
    console.log('  - Onglet actuel:', this.currentTab);
    console.log('  - Shop ID:', this.currentShopId);
    console.log('  - NPC:', this.currentNpcName);
    console.log('  - Or joueur:', this.playerGold);
    console.log('  - Processing catalog:', this.isProcessingCatalog);
    
    console.log('🛒 SHOP DATA:');
    if (this.shopData) {
      console.log('  - Shop info:', this.shopData.shopInfo);
      console.log('  - Items disponibles:', this.shopData.availableItems?.length || 0);
      console.log('  - NPC name:', this.shopData.npcName);
    } else {
      console.log('  - Aucune donnée shop');
    }
    
    console.log('🎒 INVENTAIRE:');
    if (this.playerInventory) {
      console.log('  - Poches:', Object.keys(this.playerInventory));
      let totalItems = 0;
      Object.values(this.playerInventory).forEach(pocket => {
        if (Array.isArray(pocket)) {
          totalItems += pocket.reduce((sum, item) => sum + item.quantity, 0);
        }
      });
      console.log('  - Total objets:', totalItems);
    } else {
      console.log('  - Aucun inventaire chargé');
    }
    
    console.log('🔧 CONFIGURATION:');
    console.log('  - Seuil confirmation:', this.config.confirmThreshold);
    console.log('  - Sons activés:', this.config.enableSounds);
    console.log('  - Animations activées:', this.config.enableAnimations);
    
    return {
      isVisible: this.isVisible,
      currentTab: this.currentTab,
      hasShopData: !!this.shopData,
      hasInventory: !!this.playerInventory,
      playerGold: this.playerGold
    };
  }

  // ===== NETTOYAGE =====

  destroy() {
    console.log('💀 [ShopUI] Destruction...');
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    this.isVisible = false;
    this.shopData = null;
    this.playerInventory = null;
    this.gameRoom = null;
    
    // Nettoyer les classes globales
    document.body.classList.remove('shop-open');
    
    console.log('✅ [ShopUI] Détruit');
  }
}

console.log("✅ ShopUI complet avec onglet vendre corrigé chargé !");
