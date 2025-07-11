// Inventory/InventoryUI.js - Interface Inventory COMPLÈTE avec CSS modulaire

import { INVENTORY_UI_STYLES } from './InventoryUICSS.js';

export class InventoryUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.currentPocket = 'items';
    this.selectedItem = null;
    this.inventoryData = {};
    this.itemLocalizations = {};
    this.currentLanguage = 'fr'; // Par défaut français
    
    this.init();
   // this.loadLocalizations();
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

  init() {
    this.createInventoryInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🎒 Interface d\'inventaire initialisée avec CSS modulaire');
  }

  createInventoryInterface() {
    // Créer le conteneur principal
    const overlay = document.createElement('div');
    overlay.id = 'inventory-overlay';
    overlay.className = 'inventory-overlay hidden';

    overlay.innerHTML = `
      <div class="inventory-container">
        <!-- Header avec titre et bouton fermeture -->
        <div class="inventory-header">
          <div class="inventory-title">
            <img src="/assets/ui/bag-icon.png" alt="Sac" class="bag-icon" onerror="this.style.display='none'">
            <span>🎒 Sac</span>
          </div>
          <div class="inventory-controls">
            <button class="inventory-close-btn">✕</button>
          </div>
        </div>

        <div class="inventory-content">
          <!-- Sidebar avec les poches -->
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

          <!-- Zone principale d'affichage -->
          <div class="inventory-main">
            <!-- Liste des objets -->
            <div class="items-grid" id="items-grid">
              <!-- Les objets seront générés ici -->
            </div>

            <!-- Zone de détails -->
            <div class="item-details" id="item-details">
              <div class="no-selection">
                <div class="no-selection-icon">📋</div>
                <p>Sélectionnez un objet pour voir ses détails</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer avec infos -->
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
    this.addStyles();
  }

  // ✅ MODIFIÉ: Utilise maintenant le CSS modulaire
  addStyles() {
    if (document.querySelector('#inventory-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'inventory-ui-styles';
    style.textContent = INVENTORY_UI_STYLES; // ✅ Import du CSS modulaire
    
    document.head.appendChild(style);
    console.log('🎨 [InventoryUI] Styles modulaires appliqués');
  }

  setupEventListeners() {
    // Fermeture
    this.overlay.querySelector('.inventory-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Fermeture avec ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
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

    this.overlay.querySelector('#give-item-btn').addEventListener('click', () => {
      this.giveSelectedItem();
    });

    this.overlay.querySelector('#sort-items-btn').addEventListener('click', () => {
      this.sortCurrentPocket();
    });

    // Fermeture en cliquant à l'extérieur
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Réception de l'inventaire
    this.gameRoom.onMessage("inventoryData", (data) => {
      this.updateInventoryData(data);
    });

    // Réception des changements d'inventaire
    this.gameRoom.onMessage("inventoryUpdate", (data) => {
      this.handleInventoryUpdate(data);
    });

    // Résultat d'utilisation d'objet
    this.gameRoom.onMessage("itemUseResult", (data) => {
      this.handleItemUseResult(data);
    });
  }

  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    
    // Requête des données d'inventaire
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
    // Mettre à jour l'onglet actif
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
    
    // Animation de transition
    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    // Vider la grille
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

    // Animation d'apparition
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  getItemIcon(itemId, itemData) {
    // Mapping des icônes selon le type d'objet
    const iconMap = {
      // Poké Balls
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'safari_ball': '🟢',
      
      // Soins
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
      
      // Objets divers
      'escape_rope': '🪢',
      'repel': '🚫',
      'super_repel': '⛔',
      'max_repel': '🔒',
      
      // Objets clés
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
    // Désélectionner l'ancien item
    this.overlay.querySelectorAll('.item-slot').forEach(slot => {
      slot.classList.remove('selected');
    });

    // Sélectionner le nouveau
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
    if (!itemData) return 'Objet';
    
    const typeMap = {
      'ball': 'Poké Ball',
      'medicine': 'Soin',
      'item': 'Objet',
      'key_item': 'Objet Clé',
      'tm': 'Capsule Technique',
      'berry': 'Baie'
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

    if (item.data && item.data.effect_steps) {
      stats.push(`<div class="item-stat">Durée: ${item.data.effect_steps} pas</div>`);
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
    
    // Les objets clés ne peuvent généralement pas être "utilisés" depuis l'inventaire
    if (item.data.type === 'key_item') return false;
    
    // Vérifier si l'objet est utilisable hors combat
    return item.data.usable_in_field === true;
  }

  updatePocketInfo() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    const countElement = this.overlay.querySelector('#pocket-count');
    const limitElement = this.overlay.querySelector('#pocket-limit');
    
    countElement.textContent = `${pocketData.length} objets`;
    limitElement.textContent = '/ 30 max';
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

  giveSelectedItem() {
    if (!this.selectedItem) return;

    // TODO: Implémenter l'interface pour donner un objet à un Pokémon
    this.showNotification("Fonction 'Donner' pas encore implémentée", "info");
  }

  sortCurrentPocket() {
    const pocketData = this.inventoryData[this.currentPocket] || [];
    if (pocketData.length === 0) return;

    // Trier par nom d'objet
    pocketData.sort((a, b) => {
      const nameA = this.getItemName(a.itemId).toLowerCase();
      const nameB = this.getItemName(b.itemId).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    this.refreshCurrentPocket();
    this.showNotification("Objets triés par ordre alphabétique", "success");
  }

  handleInventoryUpdate(data) {
    // Mettre à jour les données locales
    if (data.type === 'add') {
      this.addItemToLocal(data.itemId, data.quantity, data.pocket);
    } else if (data.type === 'remove') {
      this.removeItemFromLocal(data.itemId, data.quantity, data.pocket);
    }

    // Rafraîchir l'affichage si on regarde la bonne poche
    if (data.pocket === this.currentPocket) {
      this.refreshCurrentPocket();
    }

    // Notification
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
        data: {} // Les données seront mises à jour lors du prochain refresh
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
        
        // Si l'objet supprimé était sélectionné, désélectionner
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
      
      // Rafraîchir l'inventaire après utilisation
      this.requestInventoryData();
    } else {
      this.showNotification(data.message || "Impossible d'utiliser cet objet", "error");
    }
  }

  showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `inventory-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-suppression
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // === MÉTHODES PUBLIQUES POUR L'INTÉGRATION ===

  openToPocket(pocketName) {
    this.show();
    if (pocketName && pocketName !== this.currentPocket) {
      this.switchToPocket(pocketName);
    }
  }

  isOpen() {
    return this.isVisible;
  }

  // ✅ NOUVELLES MÉTHODES UIMANAGER
  setEnabled(enabled) {
    if (this.overlay) {
      if (enabled) {
        this.overlay.classList.remove('disabled');
      } else {
        this.overlay.classList.add('disabled');
      }
    }
  }

  // Méthode pour vérifier si le joueur peut interagir avec le jeu
  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !starterHudOpen;
  }

  // Méthode pour intégration avec les raccourcis clavier
  handleKeyPress(key) {
    if (!this.isVisible) return false;

    switch (key) {
      case 'Escape':
        this.hide();
        return true;
      case 'Enter':
        if (this.selectedItem && this.canUseItem(this.selectedItem)) {
          this.useSelectedItem();
          return true;
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        this.navigatePockets(key === 'ArrowRight' ? 1 : -1);
        return true;
      case 'ArrowUp':
      case 'ArrowDown':
        this.navigateItems(key === 'ArrowDown' ? 1 : -1);
        return true;
    }

    return false;
  }

  navigatePockets(direction) {
    const pockets = ['items', 'medicine', 'balls', 'berries', 'key_items', 'tms'];
    const currentIndex = pockets.indexOf(this.currentPocket);
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = pockets.length - 1;
    if (newIndex >= pockets.length) newIndex = 0;
    
    this.switchToPocket(pockets[newIndex]);
  }

  navigateItems(direction) {
    const items = this.overlay.querySelectorAll('.item-slot');
    if (items.length === 0) return;

    let currentIndex = -1;
    if (this.selectedItem) {
      items.forEach((item, index) => {
        if (item.dataset.itemId === this.selectedItem.itemId) {
          currentIndex = index;
        }
      });
    }

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    const newItem = items[newIndex];
    if (newItem) {
      newItem.click();
    }
  }

  // Méthode pour exporter les données pour la sauvegarde
  exportData() {
    return {
      currentPocket: this.currentPocket,
      selectedItemId: this.selectedItem ? this.selectedItem.itemId : null
    };
  }

  // Méthode pour importer les données lors du chargement
  importData(data) {
    if (data.currentPocket) {
      this.currentPocket = data.currentPocket;
    }
    // Note: selectedItemId sera restauré lors du refresh des données
  }
}
