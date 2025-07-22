// client/src/components/ShopUI.js - VERSION CORRIGÉE NOM NPC
// ✅ Consistent style with inventory - Blue gradients, modern animations
// ✅ CORRECTION: Nom du NPC affiché correctement

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
    
    // ✅ NOUVEAU: Stockage du nom du NPC
    this.currentNpcName = 'Marchand';
    this.currentNpcData = null;
    
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
    
    // ✅ NO LONGER NEED loadShopStyles() - CSS integrated
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Shop interface initialized with integrated CSS');
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
    
    // ✅ ADD STYLES DIRECTLY
    this.addStyles();
  }

  // ✅ INTEGRATED CSS - Same approach as InventoryUI.js
  addStyles() {
    if (document.querySelector('#shop-styles')) return;

    const style = document.createElement('style');
    style.id = 'shop-styles';
    style.textContent = `
      /* ===== MODERN SHOP UI STYLES - CONSISTENT WITH INVENTORY ===== */
      
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
        backdrop-filter: blur(5px);
        transition: opacity 0.3s ease;
      }

      .shop-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .shop-container {
        width: 95%;
        max-width: 1000px;
        height: 90%;
        max-height: 750px;
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

      .shop-overlay:not(.hidden) .shop-container {
        transform: scale(1);
      }

      /* ===== HEADER STYLE ===== */
      .shop-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 15px 25px;
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #357abd;
        position: relative;
        overflow: hidden;
      }

      .shop-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: shimmer 3s infinite;
      }

      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .shop-title {
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1;
      }

      .shop-icon {
        font-size: 32px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        animation: bounce 2s infinite;
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      .shop-title-text {
        display: flex;
        flex-direction: column;
      }

      .shop-name {
        font-size: 22px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        margin: 0;
      }

      .shop-subtitle {
        font-size: 12px;
        opacity: 0.9;
        font-style: italic;
        margin: 0;
      }

      .shop-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1;
      }

      .player-gold {
        background: rgba(255, 193, 7, 0.2);
        border: 2px solid rgba(255, 193, 7, 0.5);
        border-radius: 25px;
        padding: 8px 15px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        transition: all 0.3s ease;
      }

      .player-gold.updated {
        animation: goldUpdate 0.6s ease;
      }

      @keyframes goldUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(255, 193, 7, 0.6); }
        100% { transform: scale(1); }
      }

      .gold-icon {
        font-size: 18px;
        animation: spin 4s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .gold-amount {
        font-size: 16px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }

      .gold-currency {
        color: #ffc107;
        font-weight: bold;
      }

      .shop-close-btn {
        background: rgba(220, 53, 69, 0.8);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .shop-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
      }

      .shop-close-btn:active {
        transform: scale(0.95);
      }

      /* ===== TAB STYLE ===== */
      .shop-tabs {
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        border-bottom: 2px solid #357abd;
      }

      .shop-tab {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 15px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        position: relative;
        overflow: hidden;
      }

      .shop-tab:hover {
        background: rgba(74, 144, 226, 0.2);
        color: rgba(255, 255, 255, 0.9);
      }

      .shop-tab.active {
        background: linear-gradient(180deg, rgba(74, 144, 226, 0.4), rgba(74, 144, 226, 0.2));
        color: #87ceeb;
        border-bottom: 3px solid #4a90e2;
      }

      .shop-tab.active::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #4a90e2, #87ceeb, #4a90e2);
        animation: tabGlow 2s ease-in-out infinite alternate;
      }

      @keyframes tabGlow {
        from { opacity: 0.6; }
        to { opacity: 1; }
      }

      .tab-icon {
        font-size: 18px;
        transition: transform 0.3s ease;
      }

      .shop-tab.active .tab-icon {
        animation: tabIconPulse 1.5s ease-in-out infinite;
      }

      @keyframes tabIconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .tab-text {
        font-weight: bold;
      }

      /* ===== MAIN CONTENT ===== */
      .shop-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .shop-items-section {
        flex: 2;
        display: flex;
        flex-direction: column;
        border-right: 2px solid #357abd;
      }

      .shop-items-header {
        background: rgba(0, 0, 0, 0.3);
        padding: 15px 20px;
        border-bottom: 1px solid rgba(74, 144, 226, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .section-title {
        font-size: 16px;
        font-weight: bold;
        color: #87ceeb;
      }

      .items-count {
        font-size: 12px;
        color: #ccc;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 8px;
        border-radius: 10px;
      }

      .shop-items-grid {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 15px;
        align-content: start;
      }

      .shop-item {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 15px 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }

      .shop-item:hover {
        background: rgba(74, 144, 226, 0.2);
        border-color: #4a90e2;
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
      }

      .shop-item.selected {
        background: rgba(74, 144, 226, 0.4);
        border-color: #87ceeb;
        box-shadow: 0 0 20px rgba(74, 144, 226, 0.6);
        transform: translateY(-2px);
      }

      .shop-item.unavailable {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.6);
      }

      .shop-item.unavailable:hover {
        transform: none;
        box-shadow: none;
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .shop-item.out-of-stock {
        border-color: rgba(220, 53, 69, 0.5);
        background: rgba(220, 53, 69, 0.1);
      }

      .shop-empty-item {
        background: rgba(100, 100, 100, 0.2) !important;
        border: 2px dashed rgba(255, 255, 255, 0.3) !important;
        opacity: 0.5;
      }

      .shop-empty-item .shop-item-icon {
        opacity: 0.5;
      }

      .shop-empty-item .shop-item-name {
        font-style: italic;
        color: #999 !important;
      }

      .shop-item-icon {
        font-size: 28px;
        margin-bottom: 8px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }

      .shop-item-name {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        line-height: 1.3;
        max-height: 2.6em;
        overflow: hidden;
        color: #e0e0e0;
      }

      .shop-item-price {
        font-size: 14px;
        font-weight: bold;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.2);
        border-radius: 10px;
        padding: 4px 8px;
        margin: 5px 0;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }

      .shop-item-stock {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(40, 167, 69, 0.9);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }

      .shop-item-stock.low {
        background: rgba(255, 193, 7, 0.9);
        color: #000;
        animation: stockWarning 1.5s ease-in-out infinite;
      }

      .shop-item-stock.out {
        background: rgba(220, 53, 69, 0.9);
        color: white;
        animation: stockDanger 1s ease-in-out infinite;
      }

      @keyframes stockWarning {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes stockDanger {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }

      /* ===== DETAILS ZONE ===== */
      .shop-item-details {
        flex: 1;
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        min-width: 300px;
      }

      .details-header {
        background: rgba(0, 0, 0, 0.3);
        padding: 15px 20px;
        border-bottom: 1px solid rgba(74, 144, 226, 0.3);
      }

      .details-title {
        font-size: 16px;
        font-weight: bold;
        color: #87ceeb;
      }

      .no-selection {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #888;
        text-align: center;
        padding: 40px 20px;
      }

      .no-selection-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .item-detail-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }

      .item-detail-header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .item-detail-icon {
        font-size: 52px;
        width: 70px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border-radius: 15px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        flex-shrink: 0;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }

      .item-detail-info h3 {
        font-size: 20px;
        color: #87ceeb;
        margin: 0 0 5px 0;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }

      .item-detail-type {
        font-size: 12px;
        color: #ffc107;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: rgba(255, 193, 7, 0.2);
        padding: 3px 8px;
        border-radius: 10px;
        display: inline-block;
      }

      .item-detail-description {
        color: #ddd;
        line-height: 1.5;
        margin: 15px 0;
        padding: 15px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border-left: 4px solid #4a90e2;
      }

      .item-detail-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        margin-top: 15px;
      }

      .item-stat {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.3s ease;
      }

      .item-stat:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .item-stat-label {
        font-size: 12px;
        color: #ccc;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .item-stat-value {
        font-weight: bold;
        color: #87ceeb;
      }

      /* ===== FOOTER ===== */
      .shop-footer {
        background: rgba(0, 0, 0, 0.3);
        padding: 20px 25px;
        border-top: 2px solid #357abd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 17px 17px;
      }

      .shop-info {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .shop-welcome {
        font-size: 14px;
        color: #87ceeb;
        font-weight: 500;
      }

      .shop-tip {
        font-size: 11px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .shop-actions {
        display: flex;
        gap: 12px;
      }

      .shop-btn {
        background: rgba(74, 144, 226, 0.8);
        border: none;
        color: white;
        padding: 10px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
        overflow: hidden;
      }

      .shop-btn:hover:not(:disabled) {
        background: rgba(74, 144, 226, 1);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(74, 144, 226, 0.4);
      }

      .shop-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .shop-btn:disabled {
        background: rgba(108, 117, 125, 0.5);
        cursor: not-allowed;
        filter: grayscale(0.7);
      }

      .shop-btn.primary {
        background: linear-gradient(135deg, #28a745, #20c997);
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
      }

      .shop-btn.primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #218838, #1ea080);
        box-shadow: 0 6px 20px rgba(40, 167, 69, 0.5);
      }

      .shop-btn.secondary {
        background: rgba(108, 117, 125, 0.8);
      }

      .shop-btn.secondary:hover:not(:disabled) {
        background: rgba(108, 117, 125, 1);
      }

      .btn-icon {
        font-size: 16px;
      }

      .btn-text {
        font-weight: bold;
      }

      /* ===== MODAL STYLES ===== */
      .shop-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1100;
        backdrop-filter: blur(8px);
      }

      .shop-modal.hidden {
        display: none;
      }

      .modal-content {
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        max-width: 450px;
        width: 90%;
        color: white;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        animation: modalAppear 0.3s ease;
      }

      @keyframes modalAppear {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }

      .modal-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 15px 20px;
        border-radius: 17px 17px 0 0;
        border-bottom: 2px solid #357abd;
      }

      .modal-title {
        font-size: 18px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }

      .modal-body {
        padding: 25px;
      }

      .modal-item-preview {
        display: flex;
        align-items: center;
        gap: 15px;
        background: rgba(255, 255, 255, 0.1);
        padding: 15px;
        border-radius: 12px;
        margin-bottom: 20px;
      }

      .modal-item-icon {
        font-size: 32px;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        flex-shrink: 0;
      }

      .modal-item-info {
        flex: 1;
      }

      .modal-item-name {
        font-size: 16px;
        font-weight: bold;
        color: #87ceeb;
        margin-bottom: 5px;
      }

      .modal-item-price {
        font-size: 14px;
        color: #ffc107;
      }

      .modal-quantity {
        margin-bottom: 20px;
      }

      .modal-quantity label {
        display: block;
        margin-bottom: 10px;
        font-weight: 500;
        color: #ccc;
      }

      .quantity-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
      }

      .quantity-btn {
        background: rgba(74, 144, 226, 0.8);
        border: none;
        color: white;
        width: 35px;
        height: 35px;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .quantity-btn:hover {
        background: rgba(74, 144, 226, 1);
        transform: scale(1.1);
      }

      .quantity-input {
        width: 80px;
        height: 35px;
        text-align: center;
        border: 2px solid rgba(74, 144, 226, 0.5);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 16px;
        font-weight: bold;
      }

      .quantity-input:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 10px rgba(74, 144, 226, 0.3);
      }

      .modal-total {
        text-align: center;
        font-size: 18px;
        font-weight: bold;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.2);
        padding: 10px;
        border-radius: 10px;
      }

      .total-label {
        color: #ccc;
      }

      .total-amount {
        color: #ffc107;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }

      .modal-actions {
        padding: 20px 25px;
        border-top: 1px solid rgba(74, 144, 226, 0.3);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .modal-btn.cancel {
        background: rgba(108, 117, 125, 0.8);
        color: #ccc;
      }

      .modal-btn.cancel:hover {
        background: rgba(108, 117, 125, 1);
      }

      .modal-btn.confirm {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
      }

      .modal-btn.confirm:hover {
        background: linear-gradient(135deg, #218838, #1ea080);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
      }

      /* ===== EMPTY STATES ===== */
      .shop-loading {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #888;
      }

      .shop-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(74, 144, 226, 0.3);
        border-top: 3px solid #4a90e2;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }

      .shop-loading-text {
        font-size: 14px;
        color: #ccc;
      }

      .shop-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #888;
      }

      .shop-empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
        opacity: 0.3;
        animation: float 3s ease-in-out infinite;
      }

      .shop-empty-text {
        font-size: 16px;
        color: #ccc;
        margin-bottom: 5px;
      }

      .shop-empty-subtext {
        font-size: 12px;
        color: #888;
        font-style: italic;
      }

      /* ===== NOTIFICATIONS ===== */
      .shop-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 1200;
        animation: slideInRight 0.4s ease;
        max-width: 350px;
        border-left: 4px solid;
      }

      .shop-notification.success {
        background: linear-gradient(135deg, rgba(40, 167, 69, 0.95), rgba(32, 201, 151, 0.95));
        border-left-color: #28a745;
      }

      .shop-notification.error {
        background: linear-gradient(135deg, rgba(220, 53, 69, 0.95), rgba(231, 76, 60, 0.95));
        border-left-color: #dc3545;
      }

      .shop-notification.warning {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(255, 152, 0, 0.95));
        border-left-color: #ffc107;
        color: #000;
      }

      .shop-notification.info {
        background: linear-gradient(135deg, rgba(74, 144, 226, 0.95), rgba(52, 152, 219, 0.95));
        border-left-color: #4a90e2;
      }

      @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }

      /* ===== ITEM ANIMATIONS ===== */
      .shop-item.new {
        animation: itemAppear 0.5s ease;
      }

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

      .shop-items-grid.switching {
        animation: gridSwitch 0.3s ease;
      }

      @keyframes gridSwitch {
        0% { opacity: 0; transform: translateX(20px); }
        100% { opacity: 1; transform: translateX(0); }
      }

      /* ===== CUSTOM SCROLLBAR ===== */
      .shop-items-grid::-webkit-scrollbar,
      .item-detail-content::-webkit-scrollbar {
        width: 8px;
      }

      .shop-items-grid::-webkit-scrollbar-track,
      .item-detail-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .shop-items-grid::-webkit-scrollbar-thumb,
      .item-detail-content::-webkit-scrollbar-thumb {
        background: rgba(74, 144, 226, 0.6);
        border-radius: 4px;
      }

      .shop-items-grid::-webkit-scrollbar-thumb:hover,
      .item-detail-content::-webkit-scrollbar-thumb:hover {
        background: rgba(74, 144, 226, 0.8);
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .shop-container {
          width: 98%;
          height: 95%;
          border-radius: 15px;
        }

        .shop-header {
          padding: 12px 20px;
          border-radius: 12px 12px 0 0;
        }

        .shop-name {
          font-size: 18px;
        }

        .shop-icon {
          font-size: 24px;
        }

        .player-gold {
          padding: 6px 12px;
        }

        .shop-content {
          flex-direction: column;
        }

        .shop-items-section {
          border-right: none;
          border-bottom: 2px solid #357abd;
        }

        .shop-item-details {
          min-width: auto;
          max-height: 200px;
        }

        .shop-items-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          padding: 15px;
        }

        .shop-item {
          min-height: 100px;
          padding: 12px 8px;
        }

        .shop-item-icon {
          font-size: 24px;
        }

        .shop-item-name {
          font-size: 11px;
        }

        .shop-footer {
          padding: 15px 20px;
          border-radius: 0 0 12px 12px;
        }

        .shop-info {
          font-size: 12px;
        }

        .shop-btn {
          padding: 8px 14px;
          font-size: 12px;
        }
      }

      /* ===== FOCUS STATES FOR ACCESSIBILITY ===== */
      .shop-item:focus,
      .shop-btn:focus,
      .modal-btn:focus,
      .quantity-btn:focus {
        outline: 2px solid #4a90e2;
        outline-offset: 2px;
      }

      /* ===== SPECIAL EFFECTS ===== */
      .shop-header.celebration::after {
        content: '🎉';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 100px;
        opacity: 0;
        animation: celebrate 2s ease-out;
        pointer-events: none;
      }

      @keyframes celebrate {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
      }

      /* ===== STYLES FOR SPECIAL ITEMS ===== */
      .shop-item.rare {
        border-color: #e74c3c;
        background: linear-gradient(145deg, rgba(231, 76, 60, 0.2), rgba(231, 76, 60, 0.1));
      }

      .shop-item.legendary {
        border-color: #f39c12;
        background: linear-gradient(145deg, rgba(243, 156, 18, 0.2), rgba(243, 156, 18, 0.1));
        animation: legendaryGlow 2s ease-in-out infinite alternate;
      }

      @keyframes legendaryGlow {
        from { box-shadow: 0 0 15px rgba(243, 156, 18, 0.3); }
        to { box-shadow: 0 0 25px rgba(243, 156, 18, 0.6); }
      }

      .shop-item.premium {
        border-color: #9b59b6;
        background: linear-gradient(145deg, rgba(155, 89, 182, 0.2), rgba(155, 89, 182, 0.1));
      }
    `;

    document.head.appendChild(style);
    console.log('✅ [ShopUI] CSS integrated directly added');
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
  }

  // ✅ SHOW - VERSION CORRIGÉE POUR LE NOM
  async show(shopId, npcName = "Merchant") {
    console.log(`🏪 [ShopUI] === SHOW CALLED ===`);
    console.log(`📊 shopId: ${shopId}, npcName:`, npcName);

    // ✅ S'ASSURER QUE LES LOCALISATIONS SONT CHARGÉES
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // 🔧 EXTRACTION ET STOCKAGE DU NOM NPC
    let displayName = "Merchant";
    let npcData = {};
    
    if (typeof npcName === 'object' && npcName !== null) {
      // npcName est un objet NPC complet
      npcData = npcName;
      displayName = npcName.name || npcName.npcName || "Merchant";
    } else if (typeof npcName === 'string') {
      // npcName est juste un string
      displayName = npcName;
      npcData = { name: npcName };
    }

    // 🆕 STOCKAGE GLOBAL du nom pour utilisation ultérieure
    this.currentNpcName = displayName;
    this.currentNpcData = npcData;
    
    console.log(`🎭 [ShopUI] Nom NPC stocké: "${this.currentNpcName}"`);

    // ✅ IMMEDIATE DISPLAY
    this.overlay.classList.remove('hidden');
    this.overlay.style.display = 'flex';
    this.isVisible = true;

    // 🔧 MISE À JOUR IMMÉDIATE ET FORCÉE DU NOM
    this.forceUpdateShopName(this.currentNpcName);

    // ✅ REQUEST CATALOG
    this.requestShopCatalog(shopId);

    console.log(`✅ [ShopUI] Shop displayed for ${this.currentNpcName}`);
  }

  // 🆕 NOUVELLE MÉTHODE: Forcer la mise à jour du nom
  forceUpdateShopName(npcName) {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');
    
    if (shopNameElement) {
      shopNameElement.textContent = npcName || this.currentNpcName || 'Marchand';
      console.log(`🏷️ [ShopUI] Nom forcé dans header: "${shopNameElement.textContent}"`);
    }
    
    if (shopSubtitleElement) {
      shopSubtitleElement.textContent = "Marchand temporaire avec des objets de base";
    }
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

  // ✅ HANDLE SHOP CATALOG - VERSION CORRIGÉE POUR LE NOM
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
      
      // 🔧 CORRECTION CRITIQUE: Mise à jour du titre avec priorités correctes
      this.updateShopTitleWithPriorities(data);
      
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

  // 🆕 NOUVELLE MÉTHODE: Mise à jour avec priorités correctes
  updateShopTitleWithPriorities(data) {
    console.log('🏷️ [ShopUI] === UPDATE SHOP TITLE WITH PRIORITIES ===');
    
    let finalName = 'Marchand';
    const sources = [];

    // PRIORITÉ 1 : Nom NPC stocké lors de l'ouverture (le plus fiable)
    if (this.currentNpcName && this.currentNpcName !== 'Merchant' && this.currentNpcName !== 'Marchand') {
      finalName = this.currentNpcName;
      sources.push(`stored: "${this.currentNpcName}"`);
    }
    
    // PRIORITÉ 2 : Nom depuis les données du catalogue (peut avoir été injecté)
    else if (data.catalog?.npcName) {
      finalName = data.catalog.npcName;
      sources.push(`catalog.npcName: "${data.catalog.npcName}"`);
    }
    
    // PRIORITÉ 3 : Nom depuis la racine des données
    else if (data.npcName) {
      finalName = data.npcName;
      sources.push(`data.npcName: "${data.npcName}"`);
    }
    
    // PRIORITÉ 4 : Nom depuis shopInfo
    else if (this.shopData?.shopInfo?.npcName) {
      finalName = this.shopData.shopInfo.npcName;
      sources.push(`shopInfo.npcName: "${this.shopData.shopInfo.npcName}"`);
    }
    
    // PRIORITÉ 5 : Nom depuis shopInfo.name
    else if (this.shopData?.shopInfo?.name) {
      finalName = this.shopData.shopInfo.name;
      sources.push(`shopInfo.name: "${this.shopData.shopInfo.name}"`);
    }

    console.log(`🏷️ [ShopUI] Sources détectées:`, sources);
    console.log(`🏷️ [ShopUI] Nom final choisi: "${finalName}"`);

    // Mettre à jour l'interface
    this.forceUpdateShopName(finalName);
    
    // Mettre à jour aussi le message de bienvenue
    const welcomeElement = this.overlay.querySelector('.shop-welcome');
    if (welcomeElement) {
      welcomeElement.textContent = `Bienvenue chez ${finalName} !`;
    }
  }

  // ✅ ANCIENNE MÉTHODE GARDÉE POUR COMPATIBILITÉ mais corrigée
  updateShopTitle(shopInfo) {
    console.log('[DEBUG SHOP TITLE] updateShopTitle appelé avec:', {
      shopInfo,
      currentNpcName: this.currentNpcName,
      npcName: this.shopData?.npcName
    });

    // 🔧 PRIORITÉ AU NOM STOCKÉ
    let displayName = this.currentNpcName || 'Marchand';
    
    // Puis essayer les autres sources seulement si pas de nom stocké
    if (!this.currentNpcName || this.currentNpcName === 'Merchant') {
      displayName = shopInfo.npcName
        || this.shopData?.npcName
        || shopInfo.name
        || "PokéMart";
    }

    this.forceUpdateShopName(displayName);
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
    
    if (!this.shopData) {
      this.showEmpty("No shop data available");
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
    
    // TODO: Get player inventory for sellable items
    // For now, display shop items with sell prices
    const sellableItems = this.shopData.availableItems.filter(item => item.canSell);

    if (sellableItems.length === 0) {
      this.showEmpty("No items can be sold here");
      return;
    }

    sellableItems.forEach((item, index) => {
      const itemElement = this.createSellItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
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

    // Appearance animation
    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
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
    return item.type || 'Item';
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
          <span class="item-stat-label">Required Level</span>
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
      actionBtn.disabled = false; // TODO: Check player inventory
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
    const itemCount = itemsGrid.querySelectorAll('.shop-item').length;
    
    itemsCountElement.textContent = `${itemCount} items`;
  }

  showBuyModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');

    // Configure modal
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
    this.showNotification("Sell function not yet implemented", "warning");
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
      
      // Refresh catalog to update stock
      this.requestShopCatalog(this.shopData.shopInfo.id);
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

  // Method to get shop statistics
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

  // Cleanup method
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Clean up references
    this.gameRoom = null;
    this.shopData = null;
    this.selectedItem = null;
    this.overlay = null;
    this.currentNpcName = null;
    this.currentNpcData = null;
    
    console.log('🏪 ShopUI destroyed');
  }
}
