// client/src/components/InventoryUI.js

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
    console.log('🎒 Interface d\'inventaire initialisée');
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

  addStyles() {
    if (document.querySelector('#inventory-styles')) return;

    const style = document.createElement('style');
    style.id = 'inventory-styles';
    style.textContent = `
      .inventory-overlay {
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
        backdrop-filter: blur(5px);
        transition: opacity 0.3s ease;
      }

      .inventory-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .inventory-container {
        width: 90%;
        max-width: 900px;
        height: 85%;
        max-height: 700px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .inventory-overlay:not(.hidden) .inventory-container {
        transform: scale(1);
      }

      .inventory-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 15px 20px;
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #357abd;
      }

      .inventory-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .bag-icon {
        width: 28px;
        height: 28px;
      }

      .inventory-close-btn {
        background: rgba(220, 53, 69, 0.8);
        border: none;
        color: white;
        width: 35px;
        height: 35px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      .inventory-close-btn:hover {
        background: rgba(220, 53, 69, 1);
      }

      .inventory-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .inventory-sidebar {
        width: 200px;
        background: rgba(0, 0, 0, 0.3);
        border-right: 2px solid #357abd;
        padding: 10px 0;
      }

      .pocket-tabs {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .pocket-tab {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-left: 4px solid transparent;
        margin: 0 5px;
        border-radius: 0 8px 8px 0;
      }

      .pocket-tab:hover {
        background: rgba(74, 144, 226, 0.2);
        border-left-color: #4a90e2;
      }

      .pocket-tab.active {
        background: rgba(74, 144, 226, 0.4);
        border-left-color: #4a90e2;
        color: #87ceeb;
      }

      .pocket-icon {
        font-size: 20px;
        width: 24px;
        text-align: center;
      }

      .inventory-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .items-grid {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 15px;
        align-content: start;
      }

      .item-slot {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 12px 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
      }

      .item-slot:hover {
        background: rgba(74, 144, 226, 0.2);
        border-color: #4a90e2;
        transform: translateY(-2px);
      }

      .item-slot.selected {
        background: rgba(74, 144, 226, 0.4);
        border-color: #87ceeb;
        box-shadow: 0 0 15px rgba(74, 144, 226, 0.5);
      }

      .item-icon {
        font-size: 24px;
        margin-bottom: 5px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .item-name {
        font-size: 11px;
        font-weight: 500;
        margin-bottom: 3px;
        line-height: 1.2;
        max-height: 2.4em;
        overflow: hidden;
      }

      .item-quantity {
        position: absolute;
        bottom: 5px;
        right: 8px;
        background: rgba(255, 193, 7, 0.9);
        color: #000;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }

      .item-details {
        border-top: 2px solid #357abd;
        background: rgba(0, 0, 0, 0.2);
        padding: 20px;
        min-height: 150px;
        display: flex;
        flex-direction: column;
      }

      .no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #888;
        text-align: center;
      }

      .no-selection-icon {
        font-size: 36px;
        margin-bottom: 10px;
        opacity: 0.5;
      }

      .item-detail-content {
        display: flex;
        gap: 20px;
      }

      .item-detail-icon {
        font-size: 48px;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        flex-shrink: 0;
      }

      .item-detail-info {
        flex: 1;
      }

      .item-detail-name {
        font-size: 18px;
        font-weight: bold;
        color: #87ceeb;
        margin-bottom: 8px;
      }

      .item-detail-type {
        font-size: 12px;
        color: #ffc107;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 10px;
      }

      .item-detail-description {
        color: #ddd;
        line-height: 1.4;
        margin-bottom: 10px;
      }

      .item-detail-stats {
        display: flex;
        gap: 15px;
        margin-top: 10px;
      }

      .item-stat {
        background: rgba(255, 255, 255, 0.1);
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
      }

      .inventory-footer {
        background: rgba(0, 0, 0, 0.3);
        padding: 15px 20px;
        border-top: 2px solid #357abd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 17px 17px;
      }

      .pocket-info {
        color: #ccc;
        font-size: 14px;
      }

      .inventory-actions {
        display: flex;
        gap: 10px;
      }

      .inventory-btn {
        background: rgba(74, 144, 226, 0.8);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
      }

      .inventory-btn:hover:not(:disabled) {
        background: rgba(74, 144, 226, 1);
        transform: translateY(-1px);
      }

      .inventory-btn:disabled {
        background: rgba(108, 117, 125, 0.5);
        cursor: not-allowed;
      }

      .inventory-btn.secondary {
        background: rgba(108, 117, 125, 0.8);
      }

      .inventory-btn.secondary:hover {
        background: rgba(108, 117, 125, 1);
      }

      .empty-pocket {
        grid-column: 1 / -1;
        text-align: center;
        color: #888;
        padding: 40px 20px;
        font-style: italic;
      }

      .empty-pocket-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.3;
      }

      /* Scrollbar custom */
      .items-grid::-webkit-scrollbar {
        width: 8px;
      }

      .items-grid::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .items-grid::-webkit-scrollbar-thumb {
        background: rgba(74, 144, 226, 0.6);
        border-radius: 4px;
      }

      .items-grid::-webkit-scrollbar-thumb:hover {
        background: rgba(74, 144, 226, 0.8);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .inventory-container {
          width: 95%;
          height: 90%;
        }

        .inventory-sidebar {
          width: 160px;
        }

        .pocket-tab {
          padding: 10px 12px;
          gap: 8px;
        }

        .pocket-tab span {
          font-size: 12px;
        }

        .items-grid {
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          padding: 15px;
        }

        .item-slot {
          min-height: 80px;
          padding: 8px 6px;
        }

        .item-icon {
          font-size: 20px;
        }

        .item-name {
          font-size: 10px;
        }
      }

      /* Animations */
      @keyframes itemAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .item-slot.new {
        animation: itemAppear 0.4s ease;
      }

      @keyframes pocketSwitch {
        0% { opacity: 0; transform: translateX(20px); }
        100% { opacity: 1; transform: translateX(0); }
      }

      .items-grid.switching {
        animation: pocketSwitch 0.3s ease;
      }
    `;

    document.head.appendChild(style);
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

    // Couleurs selon le type
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

    // Auto-suppression
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // Méthodes publiques pour l'intégration
  openToPocket(pocketName) {
    this.show();
    if (pocketName && pocketName !== this.currentPocket) {
      this.switchToPocket(pocketName);
    }
  }

  isOpen() {
    return this.isVisible;
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
