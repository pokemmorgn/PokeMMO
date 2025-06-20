// client/inventory.js - Système d'inventaire Pokémon

class InventoryUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.currentPocket = 'items';
    this.selectedItem = null;
    this.inventoryData = {};
    this.itemLocalizations = {};
    this.currentLanguage = 'fr';
    
    this.init();
  }

  async init() {
    await this.loadLocalizations();
    this.createInventoryInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🎒 Interface d\'inventaire initialisée');
  }

  async loadLocalizations() {
    try {
      const response = await fetch('/localization/itemloca.json');
      this.itemLocalizations = await response.json();
      console.log('🌐 Localisations d\'objets chargées');
    } catch (error) {
      console.error('❌ Erreur chargement localizations:', error);
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

  createInventoryInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = 'inventory-overlay hidden';

    overlay.innerHTML = `
      <div class="inventory-container">
        <div class="inventory-header">
          <div class="inventory-title">
            <span>🎒 Sac</span>
          </div>
          <div class="inventory-controls">
            <button class="inventory-close-btn">✕</button>
          </div>
        </div>

        <div class="inventory-content">
          <div class="inventory-sidebar">
            <div class="pocket-tabs">
              <div class="pocket-tab active" data-pocket="items">
                <div class="pocket-icon">📦</div>
                <span>Objets</span>
              </div>
              <div class="pocket-tab" data-pocket="medicine">
                <div class="pocket-icon">💊</div>
                <span>Soins</span>
              </div>
              <div class="pocket-tab" data-pocket="balls">
                <div class="pocket-icon">⚪</div>
                <span>Poké Balls</span>
              </div>
              <div class="pocket-tab" data-pocket="berries">
                <div class="pocket-icon">🍇</div>
                <span>Baies</span>
              </div>
              <div class="pocket-tab" data-pocket="key_items">
                <div class="pocket-icon">🗝️</div>
                <span>Objets Clés</span>
              </div>
              <div class="pocket-tab" data-pocket="tms">
                <div class="pocket-icon">💿</div>
                <span>CTs/CSs</span>
              </div>
            </div>
          </div>

          <div class="inventory-main">
            <div class="items-grid" id="items-grid"></div>
            <div class="item-details" id="item-details">
              <div class="no-selection">
                <div class="no-selection-icon">📋</div>
                <p>Sélectionnez un objet pour voir ses détails</p>
              </div>
            </div>
          </div>
        </div>

        <div class="inventory-footer">
          <div class="pocket-info">
            <span id="pocket-count">0 objets</span>
            <span id="pocket-limit">/ 30 max</span>
          </div>
          <div class="inventory-actions">
            <button class="inventory-btn" id="use-item-btn" disabled>Utiliser</button>
            <button class="inventory-btn" id="give-item-btn" disabled>Donner</button>
            <button class="inventory-btn secondary" id="sort-items-btn">Trier</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  setupEventListeners() {
    // Fermeture
    this.overlay.querySelector('.inventory-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Changement de poche
    this.overlay.querySelectorAll('.pocket-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const pocket = tab.dataset.pocket;
        this.switchToPocket(pocket);
      });
    });

    // Boutons d'action
    this.overlay.querySelector('#use-item-btn').addEventListener('click', () => {
      this.useSelectedItem();
    });

    this.overlay.querySelector('#sort-items-btn').addEventListener('click', () => {
      this.sortCurrentPocket();
    });

    // Fermeture avec ESC et clic extérieur
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    this.gameRoom.onMessage("inventoryData", (data) => {
      this.updateInventoryData(data);
    });

    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.handleInventoryUpdate(data);
    });

    this.gameRoom.onMessage("itemUseResult", (data) => {
      this.handleItemUseResult(data);
    });
  }

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    this.requestInventoryData();
    console.log('🎒 Inventaire ouvert');
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.selectedItem = null;
    this.updateItemDetails();
    console.log('🎒 Inventaire fermé');
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
      this.gameRoom.send("getInventory");
    }
  }

  updateInventoryData(data) {
    this.inventoryData = data;
    this.refreshCurrentPocket();
    console.log('🎒 Données d\'inventaire mises à jour');
  }

  switchToPocket(pocketName) {
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
    
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

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
      items: 'objets',
      medicine: 'soins',
      balls: 'Poké Balls',
      berries: 'baies',
      key_items: 'objets clés',
      tms: 'CTs/CSs'
    };

    itemsGrid.innerHTML = `
      <div class="empty-pocket">
        <div class="empty-pocket-icon">📭</div>
        <p>Aucun objet dans la poche ${pocketNames[this.currentPocket] || this.currentPocket}</p>
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

    const itemIcon = this.getItemIcon(item.itemId);
    const itemName = this.getItemName(item.itemId);

    itemElement.innerHTML = `
      <div class="item-icon">${itemIcon}</div>
      <div class="item-name">${itemName}</div>
      ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getItemIcon(itemId) {
    const iconMap = {
      'poke_ball': '⚪', 'great_ball': '🟡', 'ultra_ball': '🟠', 'master_ball': '🟣',
      'potion': '💊', 'super_potion': '💉', 'hyper_potion': '🧪', 'max_potion': '🍼',
      'antidote': '🟢', 'parlyz_heal': '🟡', 'awakening': '🔵', 'burn_heal': '🔴',
      'bicycle': '🚲', 'town_map': '🗺️', 'old_rod': '🎣'
    };
    return iconMap[itemId] || '📦';
  }

  selectItem(item, element) {
    this.overlay.querySelectorAll('.item-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

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
          <p>Sélectionnez un objet pour voir ses détails</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId);

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
    if (!itemData) return 'Objet';
    const typeMap = {
      'ball': 'Poké Ball',
      'medicine': 'Soin',
      'item': 'Objet',
      'key_item': 'Objet Clé'
    };
    return typeMap[itemData.type] || itemData.type || 'Objet';
  }

  getItemStats(item) {
    const stats = [];
    if (item.quantity > 1) {
      stats.push(`<div class="item-stat">Quantité: ${item.quantity}</div>`);
    }
    if (item.data && item.data.price) {
      stats.push(`<div class="item-stat">Prix: ${item.data.price}₽</div>`);
    }
    if (item.data && item.data.heal_amount) {
      const healText = item.data.heal_amount === 'full' ? 'Complet' : `${item.data.heal_amount} PV`;
      stats.push(`<div class="item-stat">Soin: ${healText}</div>`);
    }
    return stats.join('');
  }

  updateActionButtons() {
    const useBtn = this.overlay.querySelector('#use-item-btn');
    const canUse = this.selectedItem && this.canUseItem(this.selectedItem);
    useBtn.disabled = !canUse;
  }

  canUseItem(item) {
    if (!item || !item.data) return false;
    if (item.data.type === 'key_item') return false;
    return item.data.usable_in_field === true;
  }

  updatePocketInfo() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    const countElement = this.overlay.querySelector('#pocket-count');
    countElement.textContent = `${pocketData.length} objets`;
  }

  useSelectedItem() {
    if (!this.selectedItem || !this.canUseItem(this.selectedItem)) return;
    if (this.gameRoom) {
      this.gameRoom.send("useItem", {
        itemId: this.selectedItem.itemId,
        context: "field"
      });
    }
  }

  sortCurrentPocket() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    if (pocketData.length === 0) return;

    pocketData.sort((a, b) => {
      const nameA = this.getItemName(a.itemId).toLowerCase();
      const nameB = this.getItemName(b.itemId).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.refreshCurrentPocket();
    this.showNotification("Objets triés par ordre alphabétique", "success");
  }

  handleInventoryUpdate(data) {
    if (data.type === 'add') {
      this.addItemToLocal(data.itemId, data.quantity, data.pocket);
    } else if (data.type === 'remove') {
      this.removeItemFromLocal(data.itemId, data.quantity, data.pocket);
    }

    if (data.pocket === this.currentPocket) {
      this.refreshCurrentPocket();
    }

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
        data: {}
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
      this.showNotification(data.message || "Objet utilisé avec succès", "success");
      this.requestInventoryData();
    } else {
      this.showNotification(data.message || "Impossible d'utiliser cet objet", "error");
    }
  }

  showNotification(message, type = 'info') {
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

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  openToPocket(pocketName) {
    this.show();
    if (pocketName && pocketName !== this.currentPocket) {
      this.switchToPocket(pocketName);
    }
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !dialogueOpen;
  }
}

class InventoryIcon {
  constructor(inventoryUI) {
    this.inventoryUI = inventoryUI;
    this.iconElement = null;
    this.init();
  }

  init() {
    this.createIcon();
    this.setupEventListeners();
    console.log('🎒 Icône d\'inventaire créée');
  }

  createIcon() {
    const icon = document.createElement('div');
    icon.id = 'inventory-icon';
    icon.className = 'inventory-icon';
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">🎒</span>
        </div>
        <div class="icon-label">Sac</div>
      </div>
      <div class="icon-notification" id="inventory-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
    `;

    document.body.appendChild(icon);
    this.iconElement = icon;
  }

  setupEventListeners() {
    this.iconElement.addEventListener('click', () => {
      this.handleClick();
    });

    this.iconElement.addEventListener('click', () => {
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 600);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i' && this.canOpenInventory()) {
        e.preventDefault();
        this.handleClick();
      }
    });
  }

  handleClick() {
    if (!this.canOpenInventory()) {
      this.showCannotOpenMessage();
      return;
    }

    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  }

  canOpenInventory() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !questDialogOpen && !chatOpen && !dialogueOpen;
  }

  showCannotOpenMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      bottom: 110px;
      right: 20px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      animation: fadeInOut 2s ease;
      pointer-events: none;
    `;
    message.textContent = 'Impossible d\'ouvrir le sac maintenant';

    document.body.appendChild(message);

    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 2000);
  }

  showNewItemEffect() {
    this.iconElement.style.animation = 'none';
    setTimeout(() => {
      this.iconElement.style.animation = 'bagOpen 0.6s ease, pulse 1s ease 0.6s';
    }, 10);
    
    setTimeout(() => {
      this.iconElement.style.animation = '';
    }, 1600);
  }

  onInventoryUpdate(data) {
    if (data.type === 'add') {
      this.showNewItemEffect();
    }
  }

  destroy() {
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.remove();
    }
  }
}

class InventorySystem {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.inventoryUI = null;
    this.inventoryIcon = null;
    this.init();
  }

  init() {
    this.inventoryUI = new InventoryUI(this.gameRoom);
    this.inventoryIcon = new InventoryIcon(this.inventoryUI);
    this.setupServerListeners();
    window.inventorySystem = this;
    console.log("🎒 Système d'inventaire initialisé");
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.inventoryIcon.onInventoryUpdate(data);
    });
  }

  toggle() {
    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  }

  show() {
    if (this.inventoryUI) {
      this.inventoryUI.show();
    }
  }

  hide() {
    if (this.inventoryUI) {
      this.inventoryUI.hide();
    }
  }

  openToPocket(pocketName) {
    if (this.inventoryUI) {
      this.inventoryUI.openToPocket(pocketName);
    }
  }

  isOpen() {
    return this.inventoryUI ? this.inventoryUI.isVisible : false;
  }

  canPlayerInteract() {
    return this.inventoryUI ? this.inventoryUI.canPlayerInteract() : true;
  }

  destroy() {
    if (this.inventoryUI) {
      // L'UI se nettoie automatiquement
    }
    
    if (this.inventoryIcon) {
      this.inventoryIcon.destroy();
    }

    if (window.inventorySystem === this) {
      window.inventorySystem = null;
    }

    console.log("🎒 Système d'inventaire détruit");
  }
}

// Fonction d'initialisation globale
function initializeInventory(gameRoom) {
  if (window.inventorySystem) {
    window.inventorySystem.destroy();
  }
  
  window.inventorySystem = new InventorySystem(gameRoom);
  console.log('🎒 Système d\'inventaire initialisé globalement');
}

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InventorySystem, InventoryUI, InventoryIcon, initializeInventory };
}
