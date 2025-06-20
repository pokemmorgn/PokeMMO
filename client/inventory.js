// client/src/components/InventoryUI.js - Updated for English language and better server connection

export class InventoryUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.currentPocket = 'items';
    this.selectedItem = null;
    this.inventoryData = {};
    this.itemLocalizations = {};
    this.currentLanguage = 'en'; // ✅ Changed to English by default
    
    this.init();
    this.loadLocalizations();
  }

  async loadLocalizations() {
    try {
      const response = await fetch('/localization/itemloca.json');
      this.itemLocalizations = await response.json();
      console.log('🌐 Item localizations loaded');
      this.refreshCurrentPocket(); // Refresh to apply new language
    } catch (error) {
      console.error('❌ Error loading localizations:', error);
      this.itemLocalizations = {};
    }
  }

  getItemName(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    // Fallback to formatted itemId
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    const loca = this.itemLocalizations[itemId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    return 'Description not available.';
  }

  init() {
    this.createInventoryInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🎒 Inventory UI initialized');
  }

  createInventoryInterface() {
    // Check if overlay already exists
    if (document.getElementById('inventory-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = 'inventory-overlay hidden';

    overlay.innerHTML = `
      <div class="inventory-container">
        <!-- Header -->
        <div class="inventory-header">
          <div class="inventory-title">
            <img src="/assets/ui/bag-icon.png" alt="Bag" class="bag-icon" onerror="this.style.display='none'">
            <span>🎒 Bag</span>
          </div>
          <div class="inventory-controls">
            <button class="inventory-close-btn">✕</button>
          </div>
        </div>

        <div class="inventory-content">
          <!-- Sidebar with pocket tabs -->
          <div class="inventory-sidebar">
            <div class="pocket-tabs">
              <div class="pocket-tab active" data-pocket="items">
                <div class="pocket-icon">📦</div>
                <span>Items</span>
              </div>
              <div class="pocket-tab" data-pocket="medicine">
                <div class="pocket-icon">💊</div>
                <span>Medicine</span>
              </div>
              <div class="pocket-tab" data-pocket="balls">
                <div class="pocket-icon">⚪</div>
                <span>Poké Balls</span>
              </div>
              <div class="pocket-tab" data-pocket="berries">
                <div class="pocket-icon">🍇</div>
                <span>Berries</span>
              </div>
              <div class="pocket-tab" data-pocket="key_items">
                <div class="pocket-icon">🗝️</div>
                <span>Key Items</span>
              </div>
              <div class="pocket-tab" data-pocket="tms">
                <div class="pocket-icon">💿</div>
                <span>TMs/HMs</span>
              </div>
            </div>
          </div>

          <!-- Main area -->
          <div class="inventory-main">
            <!-- Item grid -->
            <div class="items-grid" id="items-grid">
              <!-- Items will be generated here -->
            </div>

            <!-- Item details -->
            <div class="item-details" id="item-details">
              <div class="no-selection">
                <div class="no-selection-icon">📋</div>
                <p>Select an item to view details</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="inventory-footer">
          <div class="pocket-info">
            <span id="pocket-count">0 items</span>
            <span id="pocket-limit">/ 30 max</span>
          </div>
          <div class="inventory-actions">
            <button class="inventory-btn" id="use-item-btn" disabled>Use</button>
            <button class="inventory-btn" id="give-item-btn" disabled>Give</button>
            <button class="inventory-btn secondary" id="sort-items-btn">Sort</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.addStyles();
  }

  setupServerListeners() {
    if (!this.gameRoom) {
      console.warn('⚠️ No game room provided to InventoryUI');
      return;
    }

    console.log('🔗 Setting up inventory server listeners...');

    // Receive complete inventory data
    this.gameRoom.onMessage("inventoryData", (data) => {
      console.log('📦 Received inventory data:', data);
      this.updateInventoryData(data);
    });

    // Receive inventory updates
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      console.log('🔄 Inventory update:', data);
      this.handleInventoryUpdate(data);
    });

    // Item use results
    this.gameRoom.onMessage("itemUseResult", (data) => {
      console.log('🎯 Item use result:', data);
      this.handleItemUseResult(data);
    });

    // Item pickup notifications
    this.gameRoom.onMessage("itemPickup", (data) => {
      console.log('🎁 Item pickup:', data);
      const itemName = this.getItemName(data.itemId);
      this.showNotification(`Picked up: ${itemName} x${data.quantity}`, "success");
    });

    // Inventory errors
    this.gameRoom.onMessage("inventoryError", (data) => {
      console.log('❌ Inventory error:', data);
      this.showNotification(data.message, "error");
    });

    console.log('✅ Server listeners configured');
  }

  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    
    // Request inventory data from server
    this.requestInventoryData();
    
    console.log('🎒 Inventory opened');
  }

  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.selectedItem = null;
    this.updateItemDetails();
    
    console.log('🎒 Inventory closed');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  requestInventoryData() {
    if (this.gameRoom) {
      console.log('📤 Requesting inventory data from server...');
      this.gameRoom.send("getInventory");
    } else {
      console.warn('⚠️ Cannot request inventory: no game room connection');
      this.showDemoContent();
    }
  }

  showDemoContent() {
    console.log('🎭 Showing demo content (no server connection)');
    const demoData = {
      items: [],
      medicine: [
        { itemId: 'potion', quantity: 3, data: { type: 'medicine', heal_amount: 20 } }
      ],
      balls: [
        { itemId: 'poke_ball', quantity: 5, data: { type: 'ball' } }
      ],
      berries: [],
      key_items: [
        { itemId: 'town_map', quantity: 1, data: { type: 'key_item' } }
      ],
      tms: []
    };
    this.updateInventoryData(demoData);
  }

  updateInventoryData(data) {
    this.inventoryData = data;
    this.refreshCurrentPocket();
    console.log('🎒 Inventory data updated');
  }

  switchToPocket(pocketName) {
    // Update active tab
    this.overlay.querySelectorAll('.pocket-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.pocket === pocketName);
    });

    this.currentPocket = pocketName;
    this.selectedItem = null;
    this.refreshCurrentPocket();
    this.updateItemDetails();
  }

  refreshCurrentPocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    const pocketData = this.inventoryData[this.currentPocket] || [];
    
    // Transition animation
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    // Clear grid
    itemsGrid.innerHTML = '';

    if (pocketData.length === 0) {
      this.showEmptyPocket();
    } else {
      this.displayItems(pocketData);
    }

    this.updatePocketInfo();
  }

  showEmptyPocket() {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    const pocketNames = {
      items: 'items',
      medicine: 'medicine',
      balls: 'Poké Balls',
      berries: 'berries',
      key_items: 'key items',
      tms: 'TMs/HMs'
    };

    itemsGrid.innerHTML = `
      <div class="empty-pocket">
        <div class="empty-pocket-icon">📭</div>
        <p>No ${pocketNames[this.currentPocket] || this.currentPocket} in this pocket</p>
      </div>
    `;
  }

  displayItems(items) {
    const itemsGrid = this.overlay.querySelector('#items-grid');
    
    items.forEach((item, index) => {
      const itemElement = this.createItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  createItemElement(item, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-slot';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

    const itemIcon = this.getItemIcon(item.itemId, item.data);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="item-icon">${itemIcon}</div>
      <div class="item-name">${itemName}</div>
      ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    // Appearance animation
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getItemIcon(itemId, itemData) {
    // Icon mapping by item type
    const iconMap = {
      // Poké Balls
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'safari_ball': '🟢',
      
      // Medicine
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
      
      // Utility items
      'escape_rope': '🪢',
      'repel': '🚫',
      'super_repel': '⛔',
      'max_repel': '🔒',
      
      // Key items
      'bike_voucher': '🎫',
      'bicycle': '🚲',
      'town_map': '🗺️',
      'itemfinder': '📡',
      'old_rod': '🎣',
      'good_rod': '🎯',
      'super_rod': '⭐',
      'card_key': '💳',
      'lift_key': '🗝️',
      'ss_ticket': '🎫',
      'secret_key': '🔑',
      'poke_flute': '🎵',
      'silph_scope': '🔍',
      'exp_share': '📊',
      'coin_case': '💰',
      'dome_fossil': '🦕',
      'helix_fossil': '🐚',
      'old_amber': '🟨'
    };

    return iconMap[itemId] || '📦';
  }

  selectItem(item, element) {
    // Deselect old item
    this.overlay.querySelectorAll('.item-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Select new item
    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateItemDetails();
    this.updateActionButtons();
  }

  updateItemDetails() {
    const detailsContainer = this.overlay.querySelector('#item-details');
    
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">📋</div>
          <p>Select an item to view details</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId, item.data);

    detailsContainer.innerHTML = `
      <div class="item-detail-content">
        <div class="item-detail-icon">${itemIcon}</div>
        <div class="item-detail-info">
          <div class="item-detail-name">${itemName}</div>
          <div class="item-detail-type">${this.getItemTypeText(item.data)}</div>
          <div class="item-detail-description">${itemDescription}</div>
          <div class="item-detail-stats">
            ${this.getItemStats(item)}
          </div>
        </div>
      </div>
    `;
  }

  getItemTypeText(itemData) {
    if (!itemData) return 'Item';
    
    const typeMap = {
      'ball': 'Poké Ball',
      'medicine': 'Medicine',
      'item': 'Item',
      'key_item': 'Key Item',
      'tm': 'Technical Machine',
      'berry': 'Berry'
    };

    return typeMap[itemData.type] || itemData.type || 'Item';
  }

  getItemStats(item) {
    const stats = [];
    
    if (item.quantity > 1) {
      stats.push(`<div class="item-stat">Quantity: ${item.quantity}</div>`);
    }

    if (item.data && item.data.price) {
      stats.push(`<div class="item-stat">Price: ${item.data.price}₽</div>`);
    }

    if (item.data && item.data.heal_amount) {
      const healText = item.data.heal_amount === 'full' ? 'Full' : `${item.data.heal_amount} HP`;
      stats.push(`<div class="item-stat">Heal: ${healText}</div>`);
    }

    if (item.data && item.data.effect_steps) {
      stats.push(`<div class="item-stat">Duration: ${item.data.effect_steps} steps</div>`);
    }

    return stats.join('');
  }

  updateActionButtons() {
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const giveBtn = this.overlay.querySelector('#give-item-btn');

    const canUse = this.selectedItem && this.canUseItem(this.selectedItem);
    const canGive = this.selectedItem && this.selectedItem.data?.type !== 'key_item';

    useBtn.disabled = !canUse;
    giveBtn.disabled = !canGive;
  }

  canUseItem(item) {
    if (!item || !item.data) return false;
    
    // Key items generally cannot be "used" from inventory
    if (item.data.type === 'key_item') return false;
    
    // Check if item is usable outside of battle
    return item.data.usable_in_field === true;
  }

  updatePocketInfo() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    const countElement = this.overlay.querySelector('#pocket-count');
    const limitElement = this.overlay.querySelector('#pocket-limit');
    
    countElement.textContent = `${pocketData.length} items`;
    limitElement.textContent = '/ 30 max';
  }

  useSelectedItem() {
    if (!this.selectedItem || !this.canUseItem(this.selectedItem)) return;

    if (this.gameRoom) {
      console.log('🎯 Using item:', this.selectedItem.itemId);
      this.gameRoom.send("useItem", {
        itemId: this.selectedItem.itemId,
        context: "field"
      });
    } else {
      this.showNotification("Cannot use item: no server connection", "error");
    }
  }

  giveSelectedItem() {
    if (!this.selectedItem) return;

    // TODO: Implement interface for giving item to Pokémon
    this.showNotification("Give function not yet implemented", "info");
  }

  sortCurrentPocket() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    if (pocketData.length === 0) return;

    // Sort by item name
    pocketData.sort((a, b) => {
      const nameA = this.getItemName(a.itemId).toLowerCase();
      const nameB = this.getItemName(b.itemId).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.refreshCurrentPocket();
    this.showNotification("Items sorted alphabetically", "success");
  }

  handleInventoryUpdate(data) {
    // Update local data
    if (data.type === 'add') {
      this.addItemToLocal(data.itemId, data.quantity, data.pocket);
    } else if (data.type === 'remove') {
      this.removeItemFromLocal(data.itemId, data.quantity, data.pocket);
    }

    // Refresh display if viewing the updated pocket
    if (data.pocket === this.currentPocket) {
      this.refreshCurrentPocket();
    }

    // Show notification
    const itemName = this.getItemName(data.itemId);
    if (data.type === 'add') {
      this.showNotification(`+${data.quantity} ${itemName}`, "success");
    } else if (data.type === 'remove') {
      this.showNotification(`-${data.quantity} ${itemName}`, "info");
    }
  }

  addItemToLocal(itemId, quantity, pocket) {
    if (!this.inventoryData[pocket]) {
      this.inventoryData[pocket] = [];
    }

    const existingItem = this.inventoryData[pocket].find(item => item.itemId === itemId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.inventoryData[pocket].push({
        itemId: itemId,
        quantity: quantity,
        data: {} // Data will be updated on next refresh
      });
    }
  }

  removeItemFromLocal(itemId, quantity, pocket) {
    if (!this.inventoryData[pocket]) return;

    const itemIndex = this.inventoryData[pocket].findIndex(item => item.itemId === itemId);
    if (itemIndex >= 0) {
      const item = this.inventoryData[pocket][itemIndex];
      item.quantity -= quantity;
      
      if (item.quantity <= 0) {
        this.inventoryData[pocket].splice(itemIndex, 1);
        
        // If removed item was selected, deselect it
        if (this.selectedItem && this.selectedItem.itemId === itemId) {
          this.selectedItem = null;
          this.updateItemDetails();
          this.updateActionButtons();
        }
      }
    }
  }

  handleItemUseResult(data) {
    if (data.success) {
      this.showNotification(data.message || "Item used successfully", "success");
      
      // Refresh inventory after use
      this.requestInventoryData();
    } else {
      this.showNotification(data.message || "Cannot use this item", "error");
    }
  }

  showNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'inventory-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1002;
      animation: slideInRight 0.4s ease;
      max-width: 300px;
    `;

    // Colors by type
    switch (type) {
      case 'success':
        notification.style.background = 'rgba(40, 167, 69, 0.95)';
        break;
      case 'error':
        notification.style.background = 'rgba(220, 53, 69, 0.95)';
        break;
      default:
        notification.style.background = 'rgba(74, 144, 226, 0.95)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // Rest of the methods remain the same...
  setupEventListeners() {
    // Close button
    this.overlay.querySelector('.inventory-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Pocket tabs
    this.overlay.querySelectorAll('.pocket-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const pocket = tab.dataset.pocket;
        this.switchToPocket(pocket);
      });
    });

    // Action buttons
    this.overlay.querySelector('#use-item-btn').addEventListener('click', () => {
      this.useSelectedItem();
    });

    this.overlay.querySelector('#give-item-btn').addEventListener('click', () => {
      this.giveSelectedItem();
    });

    this.overlay.querySelector('#sort-items-btn').addEventListener('click', () => {
      this.sortCurrentPocket();
    });

    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  addStyles() {
    if (document.querySelector('#inventory-styles')) return;

    const style = document.createElement('style');
    style.id = 'inventory-styles';
    style.textContent = `
      /* Add your existing CSS here, or it will be loaded from inventory.css */
    `;

    document.head.appendChild(style);
  }

  // Public methods for external access
  openToPocket(pocketName) {
    this.show();
    if (pocketName && pocketName !== this.currentPocket) {
      this.switchToPocket(pocketName);
    }
  }

  isOpen() {
    return this.isVisible;
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !starterHudOpen;
  }

  // Export/import for save system
  exportData() {
    return {
      currentPocket: this.currentPocket,
      selectedItemId: this.selectedItem ? this.selectedItem.itemId : null
    };
  }

  importData(data) {
    if (data.currentPocket) {
      this.currentPocket = data.currentPocket;
    }
  }
}
