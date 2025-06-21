// client/src/components/ShopUI.js - Interface de shop rétro Pokémon

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.selectedItem = null;
    this.playerGold = 0;
    this.currentTab = 'buy'; // 'buy' ou 'sell'
    this.itemLocalizations = {};
    this.currentLanguage = 'fr';
    
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
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Interface de shop initialisée');
  }

  createShopInterface() {
    // Créer le conteneur principal avec style rétro Pokémon
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
    this.addShopStyles();
  }

  addShopStyles() {
    if (document.querySelector('#shop-styles')) return;

    const style = document.createElement('style');
    style.id = 'shop-styles';
    style.textContent = `
      /* Style général inspiré des jeux Pokémon classiques */
      .shop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1200;
        backdrop-filter: blur(8px);
        transition: opacity 0.4s ease;
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
        background: linear-gradient(145deg, #f5f2e8, #e8e2d4);
        border: 4px solid #8b4513;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        color: #2d2d2d;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.8),
          inset 0 4px 0 rgba(255, 255, 255, 0.6),
          inset 0 -4px 0 rgba(0, 0, 0, 0.2);
        transform: scale(0.9);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }

      .shop-overlay:not(.hidden) .shop-container {
        transform: scale(1);
      }

      /* Header style rétro avec dégradé */
      .shop-header {
        background: linear-gradient(90deg, #ff6b6b, #ffa726, #66bb6a);
        padding: 16px 24px;
        border-radius: 20px 20px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid #8b4513;
        position: relative;
      }

      .shop-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 2px,
          rgba(255, 255, 255, 0.1) 2px,
          rgba(255, 255, 255, 0.1) 4px
        );
        border-radius: 20px 20px 0 0;
      }

      .shop-title {
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;
        z-index: 2;
      }

      .shop-icon {
        font-size: 32px;
        background: rgba(255, 255, 255, 0.9);
        padding: 8px;
        border-radius: 12px;
        border: 2px solid #8b4513;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .shop-title-text {
        display: flex;
        flex-direction: column;
      }

      .shop-name {
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 2px 2px 0 #000;
        font-family: 'Arial Black', Arial, sans-serif;
      }

      .shop-subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 1px 1px 0 #000;
        font-style: italic;
      }

      .shop-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;
        z-index: 2;
      }

      .player-gold {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.95);
        padding: 8px 16px;
        border-radius: 20px;
        border: 2px solid #8b4513;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        font-weight: bold;
      }

      .gold-icon {
        font-size: 18px;
      }

      .gold-amount {
        font-size: 16px;
        color: #d4af37;
        text-shadow: 1px 1px 0 #000;
      }

      .gold-currency {
        font-size: 14px;
        color: #8b4513;
      }

      .shop-close-btn {
        background: rgba(220, 53, 69, 0.9);
        border: 2px solid #8b4513;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .shop-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
      }

      /* Onglets style Game Boy */
      .shop-tabs {
        display: flex;
        background: #d4c5a1;
        border-bottom: 3px solid #8b4513;
        position: relative;
      }

      .shop-tab {
        flex: 1;
        background: linear-gradient(145deg, #e6d7b8, #d4c5a1);
        border: none;
        border-right: 2px solid #8b4513;
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
        font-weight: bold;
        color: #5d4e37;
      }

      .shop-tab:last-child {
        border-right: none;
      }

      .shop-tab:hover {
        background: linear-gradient(145deg, #f0e1c2, #e6d7b8);
        transform: translateY(-2px);
      }

      .shop-tab.active {
        background: linear-gradient(145deg, #fff, #f5f2e8);
        box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.2);
        color: #8b4513;
        transform: translateY(2px);
      }

      .tab-icon {
        font-size: 18px;
      }

      .tab-text {
        font-size: 14px;
      }

      /* Contenu principal */
      .shop-content {
        flex: 1;
        display: flex;
        background: #f8f4e8;
        overflow: hidden;
      }

      .shop-items-section {
        flex: 2;
        padding: 20px;
        overflow-y: auto;
        border-right: 3px solid #8b4513;
      }

      .shop-items-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px 16px;
        background: linear-gradient(145deg, #e6d7b8, #d4c5a1);
        border: 2px solid #8b4513;
        border-radius: 12px;
      }

      .section-title {
        font-size: 16px;
        font-weight: bold;
        color: #5d4e37;
      }

      .items-count {
        font-size: 12px;
        color: #8b4513;
        background: rgba(255, 255, 255, 0.7);
        padding: 4px 8px;
        border-radius: 8px;
        border: 1px solid #8b4513;
      }

      .shop-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 16px;
        align-content: start;
      }

      /* Style des objets inspiré des menus Pokémon */
      .shop-item {
        background: linear-gradient(145deg, #fff, #f5f2e8);
        border: 3px solid #d4c5a1;
        border-radius: 16px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .shop-item:hover {
        background: linear-gradient(145deg, #e3f2fd, #bbdefb);
        border-color: #42a5f5;
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      }

      .shop-item.selected {
        background: linear-gradient(145deg, #c8e6c9, #a5d6a7);
        border-color: #4caf50;
        box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
      }

      .shop-item.unavailable {
        background: linear-gradient(145deg, #f5f5f5, #e0e0e0);
        border-color: #bdbdbd;
        opacity: 0.6;
        cursor: not-allowed;
      }

      .shop-item-icon {
        font-size: 28px;
        margin-bottom: 8px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        border: 1px solid #d4c5a1;
      }

      .shop-item-name {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
        line-height: 1.2;
        color: #5d4e37;
      }

      .shop-item-price {
        font-size: 14px;
        font-weight: bold;
        color: #d4af37;
        background: rgba(212, 175, 55, 0.2);
        padding: 4px 8px;
        border-radius: 8px;
        border: 1px solid #d4af37;
      }

      .shop-item-stock {
        position: absolute;
        top: 6px;
        right: 6px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 8px;
        border: 1px solid #4caf50;
      }

      .shop-item-stock.low {
        background: rgba(255, 152, 0, 0.9);
        border-color: #ff9800;
      }

      .shop-item-stock.out {
        background: rgba(244, 67, 54, 0.9);
        border-color: #f44336;
      }

      /* Zone de détails */
      .shop-item-details {
        flex: 1;
        padding: 20px;
        background: #fff;
        border-left: 3px solid #8b4513;
        overflow-y: auto;
      }

      .details-header {
        background: linear-gradient(145deg, #e6d7b8, #d4c5a1);
        border: 2px solid #8b4513;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 20px;
      }

      .details-title {
        font-size: 16px;
        font-weight: bold;
        color: #5d4e37;
      }

      .no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60%;
        color: #8b4513;
        text-align: center;
      }

      .no-selection-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .item-detail-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .item-detail-header {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 16px;
        background: linear-gradient(145deg, #f5f2e8, #e8e2d4);
        border: 2px solid #d4c5a1;
        border-radius: 12px;
      }

      .item-detail-icon {
        font-size: 40px;
        background: rgba(255, 255, 255, 0.9);
        padding: 12px;
        border-radius: 12px;
        border: 2px solid #d4c5a1;
      }

      .item-detail-info h3 {
        font-size: 20px;
        color: #5d4e37;
        margin: 0 0 8px 0;
      }

      .item-detail-type {
        font-size: 12px;
        color: #8b4513;
        background: rgba(139, 69, 19, 0.1);
        padding: 4px 8px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .item-detail-description {
        padding: 16px;
        background: rgba(255, 255, 255, 0.8);
        border: 2px solid #d4c5a1;
        border-radius: 12px;
        line-height: 1.5;
        color: #5d4e37;
      }

      .item-detail-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }

      .item-stat {
        background: linear-gradient(145deg, #e3f2fd, #bbdefb);
        border: 2px solid #42a5f5;
        padding: 8px 12px;
        border-radius: 12px;
        text-align: center;
        font-size: 12px;
      }

      .item-stat-label {
        display: block;
        font-weight: bold;
        color: #1565c0;
        margin-bottom: 4px;
      }

      .item-stat-value {
        font-size: 14px;
        color: #0d47a1;
      }

      /* Footer */
      .shop-footer {
        background: linear-gradient(145deg, #e6d7b8, #d4c5a1);
        padding: 16px 24px;
        border-top: 3px solid #8b4513;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 20px 20px;
      }

      .shop-info {
        flex: 1;
      }

      .shop-welcome {
        font-size: 14px;
        font-weight: bold;
        color: #5d4e37;
        margin-bottom: 4px;
      }

      .shop-tip {
        font-size: 12px;
        color: #8b4513;
        font-style: italic;
      }

      .shop-actions {
        display: flex;
        gap: 12px;
      }

      .shop-btn {
        background: linear-gradient(145deg, #4caf50, #45a049);
        border: 2px solid #2e7d32;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .shop-btn:hover:not(:disabled) {
        background: linear-gradient(145deg, #66bb6a, #4caf50);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }

      .shop-btn:active {
        transform: translateY(0);
      }

      .shop-btn:disabled {
        background: linear-gradient(145deg, #bdbdbd, #9e9e9e);
        border-color: #757575;
        cursor: not-allowed;
        transform: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .shop-btn.secondary {
        background: linear-gradient(145deg, #2196f3, #1976d2);
        border-color: #1565c0;
      }

      .shop-btn.secondary:hover:not(:disabled) {
        background: linear-gradient(145deg, #42a5f5, #2196f3);
      }

      .btn-icon {
        font-size: 16px;
      }

      /* Modal de confirmation */
      .shop-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1300;
        transition: opacity 0.3s ease;
      }

      .shop-modal.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .modal-content {
        background: linear-gradient(145deg, #fff, #f5f2e8);
        border: 4px solid #8b4513;
        border-radius: 20px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      }

      .modal-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #d4c5a1;
      }

      .modal-title {
        font-size: 18px;
        font-weight: bold;
        color: #5d4e37;
      }

      .modal-item-preview {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        padding: 16px;
        background: linear-gradient(145deg, #f5f2e8, #e8e2d4);
        border: 2px solid #d4c5a1;
        border-radius: 12px;
      }

      .modal-item-icon {
        font-size: 32px;
        background: rgba(255, 255, 255, 0.9);
        padding: 8px;
        border-radius: 8px;
        border: 1px solid #d4c5a1;
      }

      .modal-item-info {
        flex: 1;
      }

      .modal-item-name {
        display: block;
        font-size: 16px;
        font-weight: bold;
        color: #5d4e37;
        margin-bottom: 4px;
      }

      .modal-item-price {
        display: block;
        font-size: 14px;
        color: #d4af37;
        font-weight: bold;
      }

      .modal-quantity {
        margin-bottom: 20px;
      }

      .modal-quantity label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
        color: #5d4e37;
      }

      .quantity-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
      }

      .quantity-btn {
        background: linear-gradient(145deg, #e6d7b8, #d4c5a1);
        border: 2px solid #8b4513;
        color: #5d4e37;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.3s ease;
      }

      .quantity-btn:hover {
        background: linear-gradient(145deg, #f0e1c2, #e6d7b8);
        transform: scale(1.1);
      }

      .quantity-input {
        width: 60px;
        height: 36px;
        text-align: center;
        border: 2px solid #8b4513;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        background: #fff;
        color: #5d4e37;
      }

      .modal-total {
        text-align: center;
        margin-bottom: 20px;
        padding: 12px;
        background: linear-gradient(145deg, #fff3e0, #ffe0b2);
        border: 2px solid #ff9800;
        border-radius: 12px;
      }

      .total-label {
        font-size: 14px;
        color: #e65100;
      }

      .total-amount {
        font-size: 18px;
        font-weight: bold;
        color: #d4af37;
        margin-left: 8px;
      }

      .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .modal-btn {
        padding: 12px 24px;
        border: 2px solid;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
        min-width: 100px;
      }

      .modal-btn.cancel {
        background: linear-gradient(145deg, #f44336, #d32f2f);
        border-color: #b71c1c;
        color: white;
      }

      .modal-btn.cancel:hover {
        background: linear-gradient(145deg, #ef5350, #f44336);
        transform: translateY(-2px);
      }

      .modal-btn.confirm {
        background: linear-gradient(145deg, #4caf50, #45a049);
        border-color: #2e7d32;
        color: white;
      }

      .modal-btn.confirm:hover {
        background: linear-gradient(145deg, #66bb6a, #4caf50);
        transform: translateY(-2px);
      }

      /* Scrollbar personnalisé */
      .shop-items-section::-webkit-scrollbar,
      .shop-item-details::-webkit-scrollbar {
        width: 8px;
      }

      .shop-items-section::-webkit-scrollbar-track,
      .shop-item-details::-webkit-scrollbar-track {
        background: rgba(139, 69, 19, 0.1);
        border-radius: 4px;
      }

      .shop-items-section::-webkit-scrollbar-thumb,
      .shop-item-details::-webkit-scrollbar-thumb {
        background: rgba(139, 69, 19, 0.5);
        border-radius: 4px;
      }

      .shop-items-section::-webkit-scrollbar-thumb:hover,
      .shop-item-details::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 69, 19, 0.7);
      }

      /* Animations */
      @keyframes shopItemAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .shop-item.new {
        animation: shopItemAppear 0.4s ease;
      }

      @keyframes tabSwitch {
        0% { opacity: 0; transform: translateX(20px); }
        100% { opacity: 1; transform: translateX(0); }
      }

      .shop-items-grid.switching {
        animation: tabSwitch 0.3s ease;
      }

      @keyframes goldUpdate {
        0% { transform: scale(1); color: #d4af37; }
        50% { transform: scale(1.2); color: #ffd700; }
        100% { transform: scale(1); color: #d4af37; }
      }

      .gold-amount.updated {
        animation: goldUpdate 0.6s ease;
      }

      /* Style responsive */
      @media (max-width: 768px) {
        .shop-container {
          width: 98%;
          height: 95%;
        }

        .shop-header {
          padding: 12px 16px;
        }

        .shop-name {
          font-size: 20px;
        }

        .shop-subtitle {
          font-size: 12px;
        }

        .shop-content {
          flex-direction: column;
        }

        .shop-items-section {
          border-right: none;
          border-bottom: 3px solid #8b4513;
          max-height: 60%;
        }

        .shop-item-details {
          border-left: none;
          border-top: 3px solid #8b4513;
          max-height: 40%;
        }

        .shop-items-grid {
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }

        .shop-item {
          min-height: 100px;
          padding: 8px;
        }

        .shop-item-icon {
          font-size: 24px;
        }

        .shop-item-name {
          font-size: 11px;
        }

        .shop-footer {
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }

        .shop-actions {
          justify-content: center;
        }
      }

      /* Style pour objets épuisés */
      .shop-item.out-of-stock {
        position: relative;
        overflow: hidden;
      }

      .shop-item.out-of-stock::before {
        content: 'ÉPUISÉ';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        background: rgba(244, 67, 54, 0.9);
        color: white;
        padding: 4px 20px;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid #d32f2f;
        z-index: 10;
      }

      /* Animation de chargement */
      .shop-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        flex-direction: column;
        gap: 16px;
      }

      .shop-loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(139, 69, 19, 0.3);
        border-left: 4px solid #8b4513;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .shop-loading-text {
        color: #8b4513;
        font-weight: bold;
      }

      /* Style pour les notifications de shop */
      .shop-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(145deg, #4caf50, #45a049);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        border: 2px solid #2e7d32;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        z-index: 1400;
        font-weight: bold;
        animation: slideInRight 0.4s ease;
        max-width: 300px;
      }

      .shop-notification.error {
        background: linear-gradient(145deg, #f44336, #d32f2f);
        border-color: #b71c1c;
      }

      .shop-notification.warning {
        background: linear-gradient(145deg, #ff9800, #f57c00);
        border-color: #e65100;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Style pour la zone vide */
      .shop-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #8b4513;
        text-align: center;
      }

      .shop-empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.3;
      }

      .shop-empty-text {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .shop-empty-subtext {
        font-size: 12px;
        opacity: 0.7;
      }
    `;

    document.head.appendChild(style);
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
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    
    // Mettre à jour le titre du shop
    const shopNameElement = this.overlay.querySelector('.shop-name');
    shopNameElement.textContent = npcName;
    
    // Requête du catalogue du shop
    this.requestShopCatalog(shopId);
    
    console.log(`🏪 Shop ${shopId} ouvert`);
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
    this.hideLoading();
    
    if (data.success) {
      this.shopData = data.catalog;
      this.playerGold = data.playerGold || 0;
      this.updatePlayerGoldDisplay();
      this.updateShopTitle(data.catalog.shopInfo);
      this.refreshCurrentTab();
      console.log(`✅ Catalogue shop reçu: ${this.shopData.availableItems.length} objets`);
    } else {
      this.showNotification(data.message || "Impossible de charger le shop", "error");
    }
  }

  updateShopTitle(shopInfo) {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');
    
    shopNameElement.textContent = shopInfo.name || "PokéMart";
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
    const availableItems = this.shopData.availableItems.filter(item => item.canBuy && item.unlocked);

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

    itemElement.addEventListener('click', () => {
      if (isAvailable) {
        this.selectItem(item, itemElement);
      }
    });

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
    // Utiliser le type de l'objet depuis les données du serveur
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

    // TODO: Implémenter le modal de vente avec quantité possédée
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

  hideLoading() {
    // Le contenu sera remplacé par les objets
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
        // Changer d'onglet
        const newTab = this.currentTab === 'buy' ? 'sell' : 'buy';
        this.switchTab(newTab);
        return true;
      case 'Enter':
        // Confirmer l'action principale
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
        // Rafraîchir le shop
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

  // Méthode pour sauvegarder l'état du shop
  exportData() {
    return {
      currentTab: this.currentTab,
      selectedItemId: this.selectedItem ? this.selectedItem.itemId : null,
      shopId: this.getCurrentShopId()
    };
  }

  // Méthode pour restaurer l'état du shop
  importData(data) {
    if (data.currentTab) {
      this.currentTab = data.currentTab;
    }
    // selectedItemId sera restauré lors du refresh des données
  }

  // Méthode utilitaire pour vérifier si un objet peut être acheté
  canBuyItem(item) {
    if (!item) return false;
    
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isUnlocked = item.unlocked;
    
    return canAfford && inStock && isUnlocked;
  }

  // Méthode utilitaire pour calculer le coût total
  calculateTotalCost(item, quantity) {
    if (!item) return 0;
    
    const unitPrice = this.currentTab === 'buy' ? item.buyPrice : item.sellPrice;
    return unitPrice * quantity;
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

  // Méthode pour gérer les promotions/offres spéciales
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

  // Méthode pour gérer l'historique des achats
  addToHistory(item, quantity, action, cost) {
    if (!window.shopHistory) {
      window.shopHistory = [];
    }

    window.shopHistory.push({
      timestamp: new Date(),
      shopId: this.getCurrentShopId(),
      itemId: item.itemId,
      itemName: this.getItemName(item.itemId),
      quantity: quantity,
      action: action, // 'buy' ou 'sell'
      cost: cost,
      playerGoldAfter: this.playerGold
    });

    // Garder seulement les 50 dernières transactions
    if (window.shopHistory.length > 50) {
      window.shopHistory = window.shopHistory.slice(-50);
    }
  }

  // Méthode pour afficher l'historique des achats
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

  // Méthode pour les effets sonores (si implémentés)
  playSound(soundType) {
    // Exemple d'intégration avec un système de sons
    if (typeof window.playSound === 'function') {
      const soundMap = {
        'buy': 'shop_buy',
        'sell': 'shop_sell',
        'error': 'shop_error',
        'success': 'shop_success',
        'select': 'shop_select'
      };
      
      const soundId = soundMap[soundType];
      if (soundId) {
        window.playSound(soundId);
      }
    }
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
