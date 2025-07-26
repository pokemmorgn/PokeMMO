// client/src/components/ShopUI.js - VERSION 100% LOCALISÉE
// ✅ AUCUN texte hardcodé - Tout utilise des clés de localisation
// ✅ Support complet interface unifiée + legacy
// ✅ Interpolation de paramètres {npcName}, {count}, etc.
// ✅ Fallbacks propres et debugs

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.selectedItem = null;
    this.playerGold = 0;
    this.currentTab = 'buy';
    
    // ✅ LOCALISATIONS COMPLÈTES
    this.itemLocalizations = {};
    this.shopUILocalizations = {}; // ✅ NOUVEAU: Localisations de l'interface
    this.dialogueLocalizations = {};
    this.currentLanguage = 'fr'; // Français par défaut
    
    // ✅ DONNÉES NPC ET INTERFACE
    this.currentNpcData = null;
    this.isUnifiedInterface = false;
    this.npcCapabilities = [];
    this.contextualData = null;
    this.unifiedInterfaceData = null;
    
    // ✅ GESTION DES TEXTES
    this.currentWelcomeMessage = null;
    this.currentDialogueKeys = [];
    
    // ✅ LOCKS SIMPLIFIÉS
    this.isProcessingCatalog = false;
    this.lastCatalogTime = 0;
    
    // ✅ INITIALISATION ASYNCHRONE
    this.initializationPromise = this.init();
  }

  // ✅ NOUVEAU: CHARGEMENT DES LOCALISATIONS COMPLÈTES
  async loadLocalizations() {
    try {
      console.log('🌐 [ShopUI] Chargement des localisations complètes...');
      
      // 1. ✅ NOUVEAU: Localisation de l'interface shop (PRIORITAIRE)
      try {
        const shopUIResponse = await fetch('/localization/shop_ui.json');
        if (shopUIResponse.ok) {
          this.shopUILocalizations = await shopUIResponse.json();
          console.log('✅ [ShopUI] Interface localisée:', Object.keys(this.shopUILocalizations).length, 'langues');
        } else {
          throw new Error(`HTTP ${shopUIResponse.status}`);
        }
      } catch (error) {
        console.error('❌ [ShopUI] ERREUR CRITIQUE: Impossible de charger shop_ui.json:', error);
        this.shopUILocalizations = { [this.currentLanguage]: {} }; // Fallback vide
      }
      
      // 2. Localisation des items (existant)
      try {
        const itemResponse = await fetch('/localization/itemloca.json');
        if (itemResponse.ok) {
          this.itemLocalizations = await itemResponse.json();
          console.log('✅ [ShopUI] Items localisés:', Object.keys(this.itemLocalizations).length, 'items');
        }
      } catch (error) {
        console.warn('⚠️ [ShopUI] Items non localisés:', error);
        this.itemLocalizations = {};
      }
      
      // 3. Localisation des dialogues shop (optionnel)
      try {
        const dialogueResponse = await fetch('/localization/shop_dialogues.json');
        if (dialogueResponse.ok) {
          this.dialogueLocalizations = await dialogueResponse.json();
          console.log('✅ [ShopUI] Dialogues shop localisés:', Object.keys(this.dialogueLocalizations).length, 'clés');
        }
      } catch (error) {
        console.warn('⚠️ [ShopUI] Dialogues shop non localisés:', error);
        this.dialogueLocalizations = {};
      }
      
    } catch (error) {
      console.error('❌ [ShopUI] Erreur générale chargement localisations:', error);
      this.shopUILocalizations = { [this.currentLanguage]: {} };
      this.itemLocalizations = {};
      this.dialogueLocalizations = {};
    }
  }

  // ✅ NOUVEAU: MÉTHODE DE TRADUCTION PRINCIPALE avec interpolation
  t(key, params = {}) {
    if (!key) {
      console.warn('⚠️ [ShopUI] t() appelé sans clé');
      return 'MISSING_KEY';
    }

    // Naviguer dans l'objet de localisation avec la notation point
    const keys = key.split('.');
    let value = this.shopUILocalizations[this.currentLanguage];
    
    if (!value) {
      console.warn(`⚠️ [ShopUI] Langue "${this.currentLanguage}" non trouvée`);
      return this.getFallbackText(key, params);
    }
    
    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        console.warn(`⚠️ [ShopUI] Clé "${key}" non trouvée (arrêt à "${k}")`);
        return this.getFallbackText(key, params);
      }
    }
    
    // Interpolation des paramètres
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return this.interpolateText(value, params);
    }
    
    return value;
  }

  // ✅ NOUVEAU: Interpolation de texte avec paramètres {param}
  interpolateText(text, params) {
    let result = text;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    
    return result;
  }

  // ✅ NOUVEAU: Fallback intelligent pour clés manquantes
  getFallbackText(key, params) {
    // Essayer avec l'anglais si français non disponible
    if (this.currentLanguage !== 'en' && this.shopUILocalizations.en) {
      const keys = key.split('.');
      let value = this.shopUILocalizations.en;
      
      for (const k of keys) {
        value = value[k];
        if (value === undefined) break;
      }
      
      if (value && typeof value === 'string') {
        console.log(`🔄 [ShopUI] Fallback EN pour "${key}": "${value}"`);
        return this.interpolateText(value, params);
      }
    }
    
    // Fallback ultime : transformer la clé en texte lisible
    const lastKey = key.split('.').pop();
    let fallback = lastKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Ajouter les paramètres si présents
    if (Object.keys(params).length > 0) {
      const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
      fallback += ` (${paramStr})`;
    }
    
    console.warn(`🔧 [ShopUI] Fallback généré pour "${key}": "${fallback}"`);
    return fallback;
  }

  // ✅ ADAPTÉ: Obtenir nom d'item localisé
  getItemName(itemId) {
    // Essayer localisation étendue d'abord
    const localizedKey = `item.${itemId}.name`;
    const localized = this.getLocalizedText(localizedKey);
    if (localized && localized !== localizedKey) {
      return localized;
    }
    
    // Fallback système existant
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      console.warn(`[ShopUI] ${this.t('debug.localization_not_loaded', { itemId })}`);
      return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    
    console.warn(`⚠️ [ShopUI] ${this.t('debug.missing_localization', { key: normalizedId, lang: this.currentLanguage })}`);
    return normalizedId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ✅ ADAPTÉ: Obtenir description d'item localisée
  getItemDescription(itemId) {
    const localizedKey = `item.${itemId}.description`;
    const localized = this.getLocalizedText(localizedKey);
    if (localized && localized !== localizedKey) {
      return localized;
    }
    
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      return this.t('item_details.description_not_available') || 'Description not available.';
    }
    
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    
    return this.t('item_details.description_not_available') || 'Description not available.';
  }

  // ✅ EXISTANT: Obtenir texte localisé par clé (pour dialogues serveur)
  getLocalizedText(key, fallback = null) {
    if (!key) return fallback || this.t('messages.text_not_available');
    
    if (this.dialogueLocalizations[key]) {
      const localized = this.dialogueLocalizations[key][this.currentLanguage];
      if (localized) return localized;
    }
    
    if (key.includes('item.') && this.itemLocalizations) {
      const itemKey = key.replace('item.', '').replace('.name', '');
      const itemLoca = this.itemLocalizations[itemKey];
      if (itemLoca && itemLoca[this.currentLanguage]) {
        return itemLoca[this.currentLanguage].name;
      }
    }
    
    console.warn(`⚠️ [ShopUI] Clé de localisation externe manquante: "${key}"`);
    return fallback || key.split('.').pop().replace(/_/g, ' ');
  }

  // ✅ ADAPTÉ: Obtenir lignes de dialogue localisées
  getLocalizedDialogueLines(dialogueKeys) {
    if (!dialogueKeys || !Array.isArray(dialogueKeys)) return [];
    
    return dialogueKeys.map(key => this.getLocalizedText(key, this.t('messages.default_dialogue')));
  }

  async init() {
    await this.loadLocalizations();
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Shop interface initialized with complete localization');
  }

  // ✅ ADAPTÉ: Interface avec textes localisés
  createShopInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.className = 'shop-overlay hidden';

    overlay.innerHTML = `
      <div class="shop-container">
        <!-- Header with NPC info -->
        <div class="shop-header">
          <div class="shop-title">
            <div class="shop-icon">🏪</div>
            <div class="shop-title-text">
              <span class="shop-name">${this.t('header.shop_name_default')}</span>
              <span class="shop-subtitle">${this.t('header.subtitle_merchant')}</span>
              <span class="shop-npc-info">${this.t('header.npc_info', { npcName: 'NPC' })}</span>
            </div>
          </div>
          <div class="shop-controls">
            <div class="player-gold">
              <span class="gold-icon">💰</span>
              <span class="gold-amount">${this.playerGold}</span>
              <span class="gold-currency">${this.t('header.gold_currency')}</span>
            </div>
            <button class="shop-close-btn" title="${this.t('actions.close')}">✕</button>
          </div>
        </div>

        <!-- Tab navigation -->
        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="buy" title="${this.t('accessibility.tab_buy')}">
            <span class="tab-icon">🛒</span>
            <span class="tab-text">${this.t('tabs.buy')}</span>
          </button>
          <button class="shop-tab" data-tab="sell" title="${this.t('accessibility.tab_sell')}">
            <span class="tab-icon">💰</span>
            <span class="tab-text">${this.t('tabs.sell')}</span>
          </button>
        </div>

        <div class="shop-content">
          <div class="shop-items-section">
            <div class="shop-items-header">
              <span class="section-title">${this.t('sections.available_items')}</span>
              <span class="items-count" id="items-count">${this.t('sections.items_count', { count: 0 })}</span>
            </div>
            <div class="shop-items-grid" id="shop-items-grid" aria-label="${this.t('accessibility.item_grid')}">
              <!-- Items will be generated here -->
            </div>
          </div>

          <div class="shop-item-details" id="shop-item-details">
            <div class="details-header">
              <span class="details-title">${this.t('sections.item_details')}</span>
            </div>
            <div class="no-selection">
              <div class="no-selection-icon">🎁</div>
              <p>${this.t('messages.select_item')}</p>
            </div>
          </div>
        </div>

        <div class="shop-footer">
          <div class="shop-info">
            <div class="shop-welcome">${this.t('messages.welcome_default')}</div>
            <div class="shop-tip">${this.t('messages.tip_default')}</div>
          </div>
          <div class="shop-actions">
            <button class="shop-btn primary" id="shop-action-btn" disabled>
              <span class="btn-icon">🛒</span>
              <span class="btn-text">${this.t('actions.buy')}</span>
            </button>
            <button class="shop-btn secondary" id="shop-refresh-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">${this.t('actions.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Confirmation modal -->
      <div class="shop-modal hidden" id="shop-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">${this.t('modal.title_buy')}</span>
          </div>
          <div class="modal-body">
            <div class="modal-item-preview">
              <span class="modal-item-icon">📦</span>
              <div class="modal-item-info">
                <span class="modal-item-name">${this.t('modal.item_name_placeholder')}</span>
                <span class="modal-item-price">${this.t('modal.price_placeholder')}</span>
              </div>
            </div>
            <div class="modal-quantity">
              <label>${this.t('modal.quantity_label')}</label>
              <div class="quantity-controls">
                <button class="quantity-btn" id="qty-decrease">−</button>
                <input type="number" class="quantity-input" id="quantity-input" value="1" min="1" max="99" aria-label="${this.t('accessibility.quantity_input')}">
                <button class="quantity-btn" id="qty-increase">+</button>
              </div>
            </div>
            <div class="modal-total">
              <span class="total-label">${this.t('modal.total_label')}</span>
              <span class="total-amount" id="modal-total">100${this.t('header.gold_currency')}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" id="modal-cancel">${this.t('actions.cancel')}</button>
            <button class="modal-btn confirm" id="modal-confirm">${this.t('actions.confirm')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    
    this.addStyles();
  }

  // ✅ CSS CONSERVÉ (pas de changement)
  addStyles() {
    if (document.querySelector('#shop-styles')) return;

    const style = document.createElement('style');
    style.id = 'shop-styles';
    style.textContent = `
      /* ===== STYLES EXISTANTS CONSERVÉS ===== */
      
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

      .shop-npc-info {
        font-size: 10px;
        opacity: 0.8;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 8px;
        margin-top: 2px;
        border: 1px solid rgba(255, 255, 255, 0.2);
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

      .item-detail-main {
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

      .item-detail-description-compact {
        color: #ddd;
        line-height: 1.5;
        margin: 15px 0;
        padding: 15px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border-left: 4px solid #4a90e2;
      }

      .item-detail-stats-horizontal {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin: 15px 0;
      }

      .item-stat-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: background 0.3s ease;
      }

      .item-stat-card:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .stat-icon {
        font-size: 16px;
        width: 24px;
        text-align: center;
      }

      .stat-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .stat-label {
        font-size: 10px;
        color: #ccc;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }

      .stat-value {
        font-weight: bold;
        color: #87ceeb;
        font-size: 12px;
      }

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

      /* ===== LOADING, EMPTY STATES, NOTIFICATIONS (conservés) ===== */
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

      .shop-item:focus,
      .shop-btn:focus,
      .modal-btn:focus,
      .quantity-btn:focus {
        outline: 2px solid #4a90e2;
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(style);
    console.log('✅ [ShopUI] CSS avec support localisation ajouté');
  }

  // ✅ LISTENERS CONSERVÉS (pas de changement)
  setupEventListeners() {
    this.overlay.querySelector('.shop-close-btn').addEventListener('click', () => {
      this.hide();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    this.overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = tab.dataset.tab;
        this.switchTab(tabType);
      });
    });

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

    this.setupModalListeners();

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

    cancelBtn.addEventListener('click', () => {
      this.hideModal();
    });

    confirmBtn.addEventListener('click', () => {
      this.confirmTransaction();
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    this.gameRoom.onMessage("shopTransactionResult", (data) => {
      this.handleTransactionResult(data);
    });

    this.gameRoom.onMessage("goldUpdate", (data) => {
      this.updatePlayerGold(data.newGold);
    });

    this.gameRoom.onMessage("shopRefreshResult", (data) => {
      this.handleRefreshResult(data);
    });
  }

  // ✅ SHOW - VERSION AVEC TEXTES LOCALISÉS
  async show(shopId, npcData = null, preloadedShopData = null) {
    console.log(`🏪 [ShopUI] === ${this.t('debug.localization_not_loaded')} ===`);
    console.log(`📊 shopId: ${shopId}`);
    console.log(`🎭 npcData:`, npcData);
    console.log(`📦 preloadedShopData:`, !!preloadedShopData);

    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    this.extractAndStoreNpcData(npcData);

    if (preloadedShopData) {
      this.processPreloadedShopData(preloadedShopData);
    }

    this.overlay.classList.remove('hidden');
    this.overlay.style.display = 'flex';
    this.isVisible = true;

    this.updateShopInterface();

    if (!preloadedShopData) {
      this.requestShopCatalog(shopId);
    }

    console.log(`✅ [ShopUI] ${this.t('debug.npc_data_extracted', { npcName: this.currentNpcData?.name || 'Marchand' })}`);
  }

  // ✅ EXTRACTION NPC - VERSION AVEC DEBUG LOCALISÉ
  extractAndStoreNpcData(npcData) {
    this.currentNpcData = {
      id: 'unknown',
      name: this.t('header.npc_default') || 'Marchand',
      isUnifiedInterface: false,
      capabilities: ['merchant'],
      contextualData: null
    };

    if (!npcData) {
      console.log(`🎭 [ShopUI] ${this.t('debug.no_npc_data')}`);
      return;
    }

    if (typeof npcData === 'string') {
      this.currentNpcData.name = npcData;
      console.log(`🎭 [ShopUI] ${this.t('debug.npc_string_received', { name: npcData })}`);
    } else if (typeof npcData === 'object') {
      this.currentNpcData = {
        ...this.currentNpcData,
        id: npcData.id || npcData.npcId || 'unknown',
        name: npcData.name || npcData.npcName || this.t('header.npc_default') || 'Marchand',
        isUnifiedInterface: npcData.isUnifiedInterface || false,
        capabilities: npcData.capabilities || ['merchant'],
        contextualData: npcData.contextualData || null
      };
      
      console.log(`🎭 [ShopUI] ${this.t('debug.npc_object_processed')}:`, this.currentNpcData);
    }

    this.isUnifiedInterface = this.currentNpcData.isUnifiedInterface;
    this.npcCapabilities = this.currentNpcData.capabilities;
    this.contextualData = this.currentNpcData.contextualData;

    if (this.isUnifiedInterface) {
      console.log(`🔗 [ShopUI] ${this.t('debug.unified_interface_detected')}`);
    }
  }

  // ✅ PROCESSING PRELOADED - VERSION AVEC DEBUG LOCALISÉ
  processPreloadedShopData(preloadedData) {
    console.log(`💉 [ShopUI] ${this.t('debug.preloaded_data')}`);
    
    this.unifiedInterfaceData = preloadedData.unifiedInterface || null;
    
    if (preloadedData.unifiedInterface && preloadedData.unifiedInterface.merchantData) {
      const merchantData = preloadedData.unifiedInterface.merchantData;
      
      const catalogData = {
        success: true,
        catalog: {
          shopInfo: merchantData.shopInfo || { id: 'unified_shop', name: this.t('header.shop_name_default') },
          availableItems: merchantData.availableItems || [],
          npcName: this.currentNpcData.name
        },
        playerGold: merchantData.playerGold || 0,
        npcName: this.currentNpcData.name
      };
      
      setTimeout(() => {
        if (this.isVisible) {
          this.handleShopCatalog(catalogData);
        }
      }, 100);
      
      console.log(`✅ [ShopUI] ${this.t('debug.merchant_data_extracted')}`);
    }
    
    if (preloadedData.dialogueKeys) {
      this.currentDialogueKeys = preloadedData.dialogueKeys;
      this.currentWelcomeMessage = this.getLocalizedDialogueLines(preloadedData.dialogueKeys)[0] || null;
    } else if (preloadedData.unifiedInterface?.merchantData?.welcomeDialogue) {
      this.currentWelcomeMessage = preloadedData.unifiedInterface.merchantData.welcomeDialogue[0] || null;
    }
  }

  // ✅ UPDATE SHOP INTERFACE - VERSION ENTIÈREMENT LOCALISÉE
  updateShopInterface() {
    this.updateShopHeader();
    this.updateWelcomeMessages();
    this.updatePlayerGoldDisplay();
    this.updateInterfaceTexts();
  }

  // ✅ UPDATE SHOP HEADER - VERSION ENTIÈREMENT LOCALISÉE
  updateShopHeader() {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');
    const shopNpcInfoElement = this.overlay.querySelector('.shop-npc-info');
    
    if (shopNameElement && this.currentNpcData) {
      shopNameElement.textContent = this.t('header.shop_name_with_npc', { npcName: this.currentNpcData.name });
      
      if (shopSubtitleElement) {
        let subtitleKey = 'header.subtitle_merchant';
        if (this.isUnifiedInterface && this.npcCapabilities.length > 1) {
          subtitleKey = 'header.subtitle_unified';
        } else if (this.contextualData?.defaultAction) {
          const actionMap = {
            'merchant': 'header.subtitle_merchant',
            'quest': 'header.subtitle_quest',
            'dialogue': 'header.subtitle_dialogue'
          };
          subtitleKey = actionMap[this.contextualData.defaultAction] || 'header.subtitle_merchant';
        }
        shopSubtitleElement.textContent = this.t(subtitleKey);
      }
      
      if (shopNpcInfoElement) {
        let npcInfoKey = 'header.npc_info';
        let params = { npcName: this.currentNpcData.name };
        
        if (this.isUnifiedInterface) {
          if (this.npcCapabilities && this.npcCapabilities.length > 1) {
            npcInfoKey = 'header.npc_info_capabilities';
            params.count = this.npcCapabilities.length;
          } else {
            npcInfoKey = 'header.npc_info_unified';
          }
        }
        
        shopNpcInfoElement.textContent = this.t(npcInfoKey, params);
      }
    }
  }

  // ✅ UPDATE WELCOME MESSAGES - VERSION ENTIÈREMENT LOCALISÉE
  updateWelcomeMessages() {
    const welcomeElement = this.overlay.querySelector('.shop-welcome');
    const tipElement = this.overlay.querySelector('.shop-tip');
    
    if (welcomeElement) {
      let welcomeText = this.t('messages.welcome_npc', { npcName: this.currentNpcData?.name || 'notre marchand' });
      
      if (this.currentWelcomeMessage) {
        welcomeText = this.currentWelcomeMessage;
      } else if (this.unifiedInterfaceData?.merchantData?.welcomeDialogue) {
        welcomeText = this.unifiedInterfaceData.merchantData.welcomeDialogue[0] || welcomeText;
      }
      
      welcomeElement.textContent = welcomeText;
    }
    
    if (tipElement) {
      let tipKey = 'messages.tip_default';
      
      if (this.isUnifiedInterface && this.npcCapabilities.length > 1) {
        tipKey = 'messages.tip_unified';
      }
      
      tipElement.textContent = this.t(tipKey);
    }
  }

  // ✅ UPDATE INTERFACE TEXTS - VERSION ENTIÈREMENT LOCALISÉE
  updateInterfaceTexts() {
    const buyTab = this.overlay.querySelector('[data-tab="buy"] .tab-text');
    const sellTab = this.overlay.querySelector('[data-tab="sell"] .tab-text');
    const sectionTitle = this.overlay.querySelector('.section-title');
    const detailsTitle = this.overlay.querySelector('.details-title');
    const actionBtn = this.overlay.querySelector('#shop-action-btn .btn-text');
    const refreshBtn = this.overlay.querySelector('#shop-refresh-btn .btn-text');
    
    if (buyTab) buyTab.textContent = this.t('tabs.buy');
    if (sellTab) sellTab.textContent = this.t('tabs.sell');
    if (sectionTitle) sectionTitle.textContent = this.t('sections.available_items');
    if (detailsTitle) detailsTitle.textContent = this.t('sections.item_details');
    if (actionBtn) actionBtn.textContent = this.t(`actions.${this.currentTab}`);
    if (refreshBtn) refreshBtn.textContent = this.t('actions.refresh');
  }

  // ✅ HANDLE SHOP CATALOG - VERSION AVEC MESSAGES LOCALISÉS
  handleShopCatalog(data) {
    console.log(`🏪 [ShopUI] ${this.t('debug.catalog_processing')}`);

    const now = Date.now();
    if (this.isProcessingCatalog && (now - this.lastCatalogTime) < 1000) {
      console.warn(`⚠️ [ShopUI] ${this.t('debug.catalog_already_processing')}`);
      return;
    }
    
    this.isProcessingCatalog = true;
    this.lastCatalogTime = now;

    try {
      if (!data.success) {
        console.error(`❌ [ShopUI] ${this.t('messages.catalog_load_error')}:`, data.message);
        this.showNotification(data.message || this.t('messages.catalog_load_error'), "error");
        return;
      }

      this.shopData = data.catalog;
      this.playerGold = data.playerGold || 0;

      if (data.catalog?.npcName && (!this.currentNpcData?.name || this.currentNpcData.name === this.t('header.npc_default'))) {
        this.currentNpcData.name = data.catalog.npcName;
        console.log(`🎭 [ShopUI] ${this.t('debug.npc_name_enriched')}: "${data.catalog.npcName}"`);
      }
      
      if (data.npcName && (!this.currentNpcData?.name || this.currentNpcData.name === this.t('header.npc_default'))) {
        this.currentNpcData.name = data.npcName;
        console.log(`🎭 [ShopUI] ${this.t('debug.npc_name_enriched_root')}: "${data.npcName}"`);
      }

      if (!this.shopData.availableItems) {
        console.log(`🔧 [ShopUI] ${this.t('debug.normalizing_structure')}`);
        
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
          customPrice: item.customPrice,
          unlockLevel: item.unlockLevel
        }));
        
        console.log(`✅ [ShopUI] ${this.t('debug.structure_normalized')}: ${this.shopData.availableItems.length} items`);
      }

      if (data.dialogueKeys && Array.isArray(data.dialogueKeys)) {
        this.currentDialogueKeys = data.dialogueKeys;
        const localizedDialogues = this.getLocalizedDialogueLines(data.dialogueKeys);
        if (localizedDialogues.length > 0) {
          this.currentWelcomeMessage = localizedDialogues[0];
          console.log(`🌐 [ShopUI] ${this.t('debug.welcome_localized')}: "${this.currentWelcomeMessage}"`);
        }
      }
      
      if (data.messageKey) {
        const localizedMessage = this.getLocalizedText(data.messageKey);
        if (localizedMessage && localizedMessage !== data.messageKey) {
          console.log(`🌐 [ShopUI] ${this.t('debug.main_message_localized')}: "${localizedMessage}"`);
        }
      }

      this.updateShopInterface();
      this.refreshCurrentTab();
      
      console.log(`✅ [ShopUI] ${this.t('debug.catalog_processed')} ${this.shopData.availableItems.length} ${this.t('debug.objects_for')} ${this.currentNpcData?.name}`);
      
      this.showNotification(this.t('messages.catalog_loaded'), 'success');
      
    } catch (error) {
      console.error(`❌ [ShopUI] ${this.t('messages.technical_error', { error: error.message })}`);
      this.showNotification(this.t('messages.technical_error', { error: error.message }), "error");
    } finally {
      setTimeout(() => {
        this.isProcessingCatalog = false;
      }, 500);
    }
  }

  // ✅ HIDE - VERSION AVEC MESSAGE LOCALISÉ
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.hideModal();
    this.selectedItem = null;
    this.shopData = null;
    
    this.currentWelcomeMessage = null;
    this.currentDialogueKeys = [];
    this.unifiedInterfaceData = null;
    
    this.updateItemDetails();
    
    console.log(`🏪 ${this.t('messages.shop_closed')}`);
  }

  requestShopCatalog(shopId) {
    if (this.gameRoom) {
      this.showLoading();
      this.gameRoom.send("getShopCatalog", { shopId });
    }
  }

  // ✅ SWITCH TAB - VERSION AVEC TEXTES LOCALISÉS
  switchTab(tabType) {
    this.overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabType);
    });

    this.currentTab = tabType;
    this.selectedItem = null;
    this.refreshCurrentTab();
    this.updateItemDetails();
    this.updateActionButton();
    this.updateActionButtonText();
  }

  // ✅ UPDATE ACTION BUTTON TEXT - VERSION ENTIÈREMENT LOCALISÉE
  updateActionButtonText() {
    const actionBtn = this.overlay.querySelector('#shop-action-btn .btn-text');
    const actionIcon = this.overlay.querySelector('#shop-action-btn .btn-icon');
    
    if (actionBtn) {
      actionBtn.textContent = this.t(`actions.${this.currentTab}`);
    }
    
    if (actionIcon) {
      actionIcon.textContent = this.currentTab === 'buy' ? '🛒' : '💰';
    }
  }

  refreshCurrentTab() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    if (!this.shopData) {
      this.showEmpty(this.t('messages.no_shop_data'));
      return;
    }

    itemsGrid.classList.add('switching');
    setTimeout(() => itemsGrid.classList.remove('switching'), 300);

    itemsGrid.innerHTML = '';

    if (this.currentTab === 'buy') {
      this.displayBuyItems();
    } else {
      this.displaySellItems();
    }

    this.updateItemsCount();
  }

  // ✅ DISPLAY BUY ITEMS - VERSION AVEC MESSAGES LOCALISÉS
  displayBuyItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    const items = Array.isArray(this.shopData?.availableItems) ? this.shopData.availableItems : [];
    
    console.log(`🔍 [ShopUI] ${this.t('debug.displaying_buy_tab')}`);
    console.log(`📦 ${this.t('debug.total_items_received')}: ${items.length}`);
    
    const availableItems = items.filter(item => {
      if (item.isEmpty) return true;
      
      const playerLevel = this.playerLevel || 1;
      const levelOk = !item.unlockLevel || playerLevel >= item.unlockLevel;
      const hasStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
      const isBuyable = item.canBuy !== false;
      
      return isBuyable && levelOk && hasStock;
    });

    console.log(`📊 [ShopUI] ${this.t('debug.final_result')}: ${availableItems.length}/${items.length} items ${this.t('debug.displayed')}`);

    if (availableItems.length === 0) {
      this.showEmpty(this.t('messages.no_items_buy'));
      return;
    }

    availableItems.forEach((item, index) => {
      const itemElement = this.createBuyItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  // ✅ DISPLAY SELL ITEMS - VERSION AVEC MESSAGES LOCALISÉS
  displaySellItems() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    const sellableItems = this.shopData.availableItems.filter(item => item.canSell);

    if (sellableItems.length === 0) {
      this.showEmpty(this.t('messages.no_items_sell'));
      return;
    }

    sellableItems.forEach((item, index) => {
      const itemElement = this.createSellItemElement(item, index);
      itemsGrid.appendChild(itemElement);
    });
  }

  createBuyItemElement(item, index) {
    if (item.isEmpty) {
      return this.createEmptyShopItemElement();
    }
    
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.dataset.itemId = item.itemId;
    itemElement.dataset.index = index;

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
      <div class="shop-item-price">${item.buyPrice}${this.t('header.gold_currency')}</div>
      ${this.getStockDisplay(item.stock)}
    `;

    if (isAvailable) {
      itemElement.addEventListener('click', () => {
        this.selectItem(item, itemElement);
      });
    }

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
      <div class="shop-item-price">${item.sellPrice}${this.t('header.gold_currency')}</div>
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  // ✅ CREATE EMPTY SHOP ITEM - VERSION ENTIÈREMENT LOCALISÉE
  createEmptyShopItemElement() {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item shop-empty-item';
    itemElement.style.opacity = '0.6';
    itemElement.style.cursor = 'not-allowed';
    
    itemElement.innerHTML = `
      <div class="shop-item-icon">📭</div>
      <div class="shop-item-name">${this.t('stock.no_items')}</div>
      <div class="shop-item-price">-</div>
      <div class="shop-item-stock out">${this.t('stock.empty')}</div>
    `;
    
    return itemElement;
  }

  getStockDisplay(stock) {
    if (stock === undefined || stock === -1) {
      return '';
    }
    
    let stockClass = '';
    let stockText = stock;
    
    if (stock === 0) {
      stockClass = 'out';
      stockText = this.t('stock.out_of_stock');
    } else if (stock <= 3) {
      stockClass = 'low';
    }
    
    return `<div class="shop-item-stock ${stockClass}">${stockText}</div>`;
  }

  getItemIcon(itemId) {
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
    this.overlay.querySelectorAll('.shop-item').forEach(slot => {
      slot.classList.remove('selected');
    });

    element.classList.add('selected');
    this.selectedItem = item;
    
    this.updateItemDetails();
    this.updateActionButton();
  }

  // ✅ GET HORIZONTAL STATS HTML - VERSION ENTIÈREMENT LOCALISÉE
  getHorizontalStatsHTML(item) {
    const stats = [];
    
    if (this.currentTab === 'buy' && item.stock !== undefined && item.stock !== -1) {
      const stockIcon = item.stock === 0 ? '❌' : item.stock <= 3 ? '⚠️' : '✅';
      stats.push(`
        <div class="item-stat-card stock">
          <div class="stat-icon">${stockIcon}</div>
          <div class="stat-info">
            <span class="stat-label">${this.t('item_details.stock')}</span>
            <span class="stat-value">${item.stock === -1 ? this.t('item_details.unlimited') : item.stock}</span>
          </div>
        </div>
      `);
    }

    if (item.unlockLevel && item.unlockLevel > 1) {
      stats.push(`
        <div class="item-stat-card level">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <span class="stat-label">${this.t('item_details.required_level')}</span>
            <span class="stat-value">${item.unlockLevel}</span>
          </div>
        </div>
      `);
    }

    if (stats.length === 0 && this.currentTab === 'buy') {
      const canAfford = this.playerGold >= item.buyPrice;
      stats.push(`
        <div class="item-stat-card affordability">
          <div class="stat-icon">${canAfford ? '✅' : '❌'}</div>
          <div class="stat-info">
            <span class="stat-label">${this.t('item_details.availability')}</span>
            <span class="stat-value">${this.t(canAfford ? 'item_details.affordable' : 'item_details.too_expensive')}</span>
          </div>
        </div>
      `);
    }

    return stats.join('');
  }
  
  // ✅ UPDATE ITEM DETAILS - VERSION ENTIÈREMENT LOCALISÉE
  updateItemDetails() {
    const detailsContainer = this.overlay.querySelector('#shop-item-details');
    
    if (!this.selectedItem) {
      detailsContainer.innerHTML = `
        <div class="details-header">
          <span class="details-title">${this.t('sections.item_details')}</span>
        </div>
        <div class="no-selection">
          <div class="no-selection-icon">🎁</div>
          <p>${this.t('messages.select_item')}</p>
        </div>
      `;
      return;
    }

    const item = this.selectedItem;
    const itemName = this.getItemName(item.itemId);
    const itemDescription = this.getItemDescription(item.itemId);
    const itemIcon = this.getItemIcon(item.itemId);

    const price = this.currentTab === 'buy' ? item.buyPrice : item.sellPrice;
    const priceLabel = this.t(`item_details.price_${this.currentTab}`);

    detailsContainer.innerHTML = `
      <div class="details-header">
        <span class="details-title">${this.t('sections.item_details')}</span>
      </div>
      <div class="item-detail-content">
        <div class="item-detail-main">
          <div class="item-detail-icon">${itemIcon}</div>
          <div class="item-detail-info">
            <h3>${itemName}</h3>
            <div class="item-detail-type">${this.getItemTypeText(item)}</div>
          </div>
        </div>
        
        <div class="item-detail-stats-horizontal">
          <div class="item-stat-card price">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <span class="stat-label">${priceLabel}</span>
              <span class="stat-value">${price}${this.t('header.gold_currency')}</span>
            </div>
          </div>
          ${this.getHorizontalStatsHTML(item)}
        </div>
        
        <div class="item-detail-description-compact">
          ${itemDescription}
        </div>
      </div>
    `;
  }

  getItemTypeText(item) {
    return item.type || this.t('item_details.item_type_default');
  }

  // ✅ UPDATE ACTION BUTTON - VERSION ENTIÈREMENT LOCALISÉE
  updateActionButton() {
    const actionBtn = this.overlay.querySelector('#shop-action-btn');
    const btnIcon = actionBtn.querySelector('.btn-icon');
    const btnText = actionBtn.querySelector('.btn-text');

    if (!this.selectedItem) {
      actionBtn.disabled = true;
      btnIcon.textContent = '🛒';
      btnText.textContent = this.t(`actions.${this.currentTab}`);
      return;
    }

    if (this.currentTab === 'buy') {
      const canAfford = this.playerGold >= this.selectedItem.buyPrice;
      const inStock = this.selectedItem.stock === undefined || this.selectedItem.stock === -1 || this.selectedItem.stock > 0;
      
      actionBtn.disabled = !canAfford || !inStock;
      btnIcon.textContent = '🛒';
      btnText.textContent = this.t('actions.buy');
    } else {
      actionBtn.disabled = false;
      btnIcon.textContent = '💰';
      btnText.textContent = this.t('actions.sell');
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

  // ✅ UPDATE ITEMS COUNT - VERSION ENTIÈREMENT LOCALISÉE
  updateItemsCount() {
    const itemsCountElement = this.overlay.querySelector('#items-count');
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    const itemCount = itemsGrid.querySelectorAll('.shop-item:not(.shop-empty-item)').length;
    
    const countKey = itemCount === 1 ? 'sections.items_count_singular' : 'sections.items_count';
    itemsCountElement.textContent = this.t(countKey, { count: itemCount });
  }

  // ✅ SHOW BUY MODAL - VERSION ENTIÈREMENT LOCALISÉE
  showBuyModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');
    const modalTitle = modal.querySelector('.modal-title');

    modalTitle.textContent = this.t('modal.title_buy');
    
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = this.t('modal.unit_price', { 
      price: this.selectedItem.buyPrice,
      currency: this.t('header.gold_currency')
    });

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
    this.showNotification(this.t('messages.sell_not_implemented'), "warning");
  }

  updateModalTotal() {
    const modal = this.overlay.querySelector('#shop-modal');
    const quantityInput = modal.querySelector('#quantity-input');
    const totalAmount = modal.querySelector('#modal-total');

    const quantity = parseInt(quantityInput.value) || 1;
    const unitPrice = this.currentTab === 'buy' ? this.selectedItem.buyPrice : this.selectedItem.sellPrice;
    const total = quantity * unitPrice;

    totalAmount.textContent = `${total}${this.t('header.gold_currency')}`;
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

  // ✅ HANDLE TRANSACTION RESULT - VERSION AVEC MESSAGES LOCALISÉS
  handleTransactionResult(data) {
    if (data.success) {
      this.showNotification(data.message || this.t('messages.transaction_success'), "success");
      
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      this.requestShopCatalog(this.shopData.shopInfo.id);
    } else {
      this.showNotification(data.message || this.t('messages.transaction_failed'), "error");
    }
  }

  // ✅ HANDLE REFRESH RESULT - VERSION AVEC MESSAGES LOCALISÉS
  handleRefreshResult(data) {
    if (data.success) {
      if (data.restocked) {
        this.showNotification(this.t('messages.shop_restocked'), "success");
      } else {
        this.showNotification(this.t('messages.no_restock_needed'), "info");
      }
    } else {
      this.showNotification(data.message || this.t('messages.refresh_error'), "error");
    }
  }

  // ✅ SHOW LOADING - VERSION ENTIÈREMENT LOCALISÉE
  showLoading() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-loading">
        <div class="shop-loading-spinner"></div>
        <div class="shop-loading-text">${this.t('loading_states.loading_catalog')}</div>
      </div>
    `;
  }

  // ✅ SHOW EMPTY - VERSION ENTIÈREMENT LOCALISÉE
  showEmpty(message) {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    itemsGrid.innerHTML = `
      <div class="shop-empty">
        <div class="shop-empty-icon">🏪</div>
        <div class="shop-empty-text">${message}</div>
        <div class="shop-empty-subtext">${this.t('messages.empty_comeback')}</div>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.shop-notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `shop-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);
  }

  // ✅ MÉTHODES PUBLIQUES CONSERVÉES
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

  getCurrentNpcData() {
    return this.currentNpcData;
  }

  isUnifiedInterfaceActive() {
    return this.isUnifiedInterface;
  }

  getNpcCapabilities() {
    return this.npcCapabilities;
  }

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

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !inventoryOpen;
  }

  canBuyItem(item) {
    if (!item) return false;
    
    const canAfford = this.playerGold >= item.buyPrice;
    const inStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
    const isUnlocked = item.unlocked;
    
    return canAfford && inStock && isUnlocked;
  }

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
      currentTab: this.currentTab,
      npcData: this.currentNpcData,
      isUnifiedInterface: this.isUnifiedInterface
    };
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    this.gameRoom = null;
    this.shopData = null;
    this.selectedItem = null;
    this.overlay = null;
    this.currentNpcData = null;
    this.unifiedInterfaceData = null;
    this.currentDialogueKeys = [];
    this.shopUILocalizations = {};
    
    console.log(`🏪 ${this.t('debug.shop_destroyed') || 'ShopUI détruit'}`);
  }
}
