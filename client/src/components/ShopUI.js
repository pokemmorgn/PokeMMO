// client/src/components/ShopUI.js - VERSION ADAPTÉE SERVEUR INTÉGRÉ
// ✅ Support complet des nouvelles données serveur : isUnifiedInterface, capabilities, contextualData
// ✅ Localisation avancée : dialogueKeys, messageKey
// ✅ Compatibilité totale legacy + interface unifiée
// ✅ Gestion robuste des noms NPCs

export class ShopUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.shopData = null;
    this.selectedItem = null;
    this.playerGold = 0;
    this.currentTab = 'buy';
    
    // ✅ LOCALISATIONS ÉTENDUES
    this.itemLocalizations = {};
    this.dialogueLocalizations = {};
    this.currentLanguage = 'fr'; // Français par défaut pour un jeu français
    
    // ✅ NOUVELLES DONNÉES NPC ET INTERFACE
    this.currentNpcData = null;
    this.isUnifiedInterface = false;
    this.npcCapabilities = [];
    this.contextualData = null;
    this.unifiedInterfaceData = null;
    
    // ✅ GESTION AMÉLIORÉE DES TEXTES
    this.currentWelcomeMessage = null;
    this.currentDialogueKeys = [];
    
    // ✅ LOCKS SIMPLIFIÉS
    this.isProcessingCatalog = false;
    this.lastCatalogTime = 0;
    
    // ✅ INITIALISATION ASYNCHRONE
    this.initializationPromise = this.init();
  }

  // ✅ CHARGEMENT DES LOCALISATIONS ÉTENDUES
  async loadLocalizations() {
    try {
      console.log('🌐 [ShopUI] Chargement des localisations étendues...');
      
      // 1. Localisation des items (existant)
      const itemResponse = await fetch('/localization/itemloca.json');
      if (itemResponse.ok) {
        this.itemLocalizations = await itemResponse.json();
        console.log('✅ [ShopUI] Items localisés:', Object.keys(this.itemLocalizations).length);
      }
      
      // 2. 🆕 NOUVEAU: Localisation des dialogues shop
      try {
        const dialogueResponse = await fetch('/localization/shop_dialogues.json');
        if (dialogueResponse.ok) {
          this.dialogueLocalizations = await dialogueResponse.json();
          console.log('✅ [ShopUI] Dialogues shop localisés:', Object.keys(this.dialogueLocalizations).length);
        } else {
          console.warn('⚠️ [ShopUI] Pas de localisations dialogues, utilisation des fallbacks');
        }
      } catch (error) {
        console.warn('⚠️ [ShopUI] Erreur chargement dialogues:', error);
        this.dialogueLocalizations = {};
      }
      
    } catch (error) {
      console.error('❌ [ShopUI] Erreur chargement localisations:', error);
      this.itemLocalizations = {};
      this.dialogueLocalizations = {};
    }
  }

  // ✅ NOUVELLE MÉTHODE: Obtenir texte localisé par clé
  getLocalizedText(key, fallback = null) {
    if (!key) return fallback || "Texte non disponible";
    
    // Essayer d'abord les dialogues shop
    if (this.dialogueLocalizations[key]) {
      const localized = this.dialogueLocalizations[key][this.currentLanguage];
      if (localized) return localized;
    }
    
    // Puis les items si ça ressemble à une clé d'item
    if (key.includes('item.') && this.itemLocalizations) {
      const itemKey = key.replace('item.', '').replace('.name', '');
      const itemLoca = this.itemLocalizations[itemKey];
      if (itemLoca && itemLoca[this.currentLanguage]) {
        return itemLoca[this.currentLanguage].name;
      }
    }
    
    console.warn(`⚠️ [ShopUI] Clé de localisation manquante: "${key}" (langue: ${this.currentLanguage})`);
    return fallback || key.split('.').pop().replace(/_/g, ' ');
  }

  // ✅ NOUVELLE MÉTHODE: Obtenir textes de dialogue localisés
  getLocalizedDialogueLines(dialogueKeys) {
    if (!dialogueKeys || !Array.isArray(dialogueKeys)) return [];
    
    return dialogueKeys.map(key => this.getLocalizedText(key, "Dialogue par défaut"));
  }

  getItemName(itemId) {
    // Essayer la localisation étendue d'abord
    const localizedKey = `item.${itemId}.name`;
    const localized = this.getLocalizedText(localizedKey);
    if (localized && localized !== localizedKey) {
      return localized;
    }
    
    // Fallback système existant
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      console.warn(`[ShopUI] getItemName: Localisations non chargées, retour brut pour ${itemId}`);
      return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].name;
    }
    
    console.warn(`⚠️ [ShopUI] Localisation manquante pour item "${normalizedId}" (langue: ${this.currentLanguage})`);
    return normalizedId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getItemDescription(itemId) {
    // Essayer la localisation étendue d'abord
    const localizedKey = `item.${itemId}.description`;
    const localized = this.getLocalizedText(localizedKey);
    if (localized && localized !== localizedKey) {
      return localized;
    }
    
    // Fallback système existant
    if (!this.itemLocalizations || Object.keys(this.itemLocalizations).length === 0) {
      return 'Description not available.';
    }
    
    const normalizedId = itemId.toLowerCase().replace(/ /g, '_');
    const loca = this.itemLocalizations[normalizedId];
    if (loca && loca[this.currentLanguage]) {
      return loca[this.currentLanguage].description;
    }
    
    return 'Description not available.';
  }

  async init() {
    // ✅ CHARGER LES LOCALISATIONS EN PREMIER
    await this.loadLocalizations();
    
    this.createShopInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('🏪 Shop interface initialized with extended localizations');
  }

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
              <span class="shop-name">PokéMart</span>
              <span class="shop-subtitle">Marchand Pokémon</span>
              <span class="shop-npc-info">Marchand</span>
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
            <span class="tab-text">Acheter</span>
          </button>
          <button class="shop-tab" data-tab="sell">
            <span class="tab-icon">💰</span>
            <span class="tab-text">Vendre</span>
          </button>
        </div>

        <div class="shop-content">
          <div class="shop-items-section">
            <div class="shop-items-header">
              <span class="section-title">Objets Disponibles</span>
              <span class="items-count" id="items-count">0 objets</span>
            </div>
            <div class="shop-items-grid" id="shop-items-grid">
              <!-- Items will be generated here -->
            </div>
          </div>

          <div class="shop-item-details" id="shop-item-details">
            <div class="details-header">
              <span class="details-title">Détails de l'Objet</span>
            </div>
            <div class="no-selection">
              <div class="no-selection-icon">🎁</div>
              <p>Sélectionnez un objet pour voir ses détails</p>
            </div>
          </div>
        </div>

        <div class="shop-footer">
          <div class="shop-info">
            <div class="shop-welcome">Bienvenue dans notre boutique !</div>
            <div class="shop-tip">💡 Conseil: Les objets rares apparaissent selon votre niveau</div>
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

      <!-- Confirmation modal -->
      <div class="shop-modal hidden" id="shop-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">Confirmation d'Achat</span>
          </div>
          <div class="modal-body">
            <div class="modal-item-preview">
              <span class="modal-item-icon">📦</span>
              <div class="modal-item-info">
                <span class="modal-item-name">Nom de l'Objet</span>
                <span class="modal-item-price">Prix: 100₽</span>
              </div>
            </div>
            <div class="modal-quantity">
              <label>Quantité:</label>
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
            <button class="modal-btn cancel" id="modal-cancel">Annuler</button>
            <button class="modal-btn confirm" id="modal-confirm">Confirmer</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    
    this.addStyles();
  }

  // ✅ CSS EXISTANT CONSERVÉ - Ajout de styles pour NPC info
  addStyles() {
    if (document.querySelector('#shop-styles')) return;

    const style = document.createElement('style');
    style.id = 'shop-styles';
    style.textContent = `
      /* ===== STYLES EXISTANTS CONSERVÉS + NOUVEAUX ===== */
      
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

      /* ===== HEADER AVEC INFO NPC ===== */
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

      /* 🆕 NOUVEAU: Info NPC */
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

      /* ===== RESTE DU CSS EXISTANT CONSERVÉ ===== */
      
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

      /* ===== REST OF EXISTING CSS ===== */
      /* ... (keeping all existing styles for loading, notifications, etc) ... */
    `;

    document.head.appendChild(style);
    console.log('✅ [ShopUI] CSS étendu avec support NPC ajouté');
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

  // ✅ SHOW - VERSION ADAPTÉE POUR INTERFACE UNIFIÉE + LEGACY
  async show(shopId, npcData = null, preloadedShopData = null) {
    console.log(`🏪 [ShopUI] === SHOW ADAPTÉE INTERFACE UNIFIÉE ===`);
    console.log(`📊 shopId: ${shopId}`);
    console.log(`🎭 npcData:`, npcData);
    console.log(`📦 preloadedShopData:`, !!preloadedShopData);

    // ✅ S'ASSURER QUE LES LOCALISATIONS SONT CHARGÉES
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // ✅ EXTRACTION ET STOCKAGE DES DONNÉES NPC ROBUSTES
    this.extractAndStoreNpcData(npcData);

    // ✅ GESTION DES DONNÉES PRE-CHARGÉES (INTERFACE UNIFIÉE)
    if (preloadedShopData) {
      this.processPreloadedShopData(preloadedShopData);
    }

    // ✅ AFFICHAGE IMMÉDIAT
    this.overlay.classList.remove('hidden');
    this.overlay.style.display = 'flex';
    this.isVisible = true;

    // ✅ MISE À JOUR IMMÉDIATE DE L'INTERFACE
    this.updateShopInterface();

    // ✅ DEMANDER LE CATALOGUE SI PAS DE DONNÉES PRE-CHARGÉES
    if (!preloadedShopData) {
      this.requestShopCatalog(shopId);
    }

    console.log(`✅ [ShopUI] Shop affiché pour ${this.currentNpcData?.name || 'Marchand'}`);
  }

  // ✅ NOUVELLE MÉTHODE: Extraction robuste des données NPC
  extractAndStoreNpcData(npcData) {
    // Initialiser avec des valeurs par défaut
    this.currentNpcData = {
      id: 'unknown',
      name: 'Marchand',
      isUnifiedInterface: false,
      capabilities: ['merchant'],
      contextualData: null
    };

    if (!npcData) {
      console.log('🎭 [ShopUI] Aucune donnée NPC fournie, utilisation des valeurs par défaut');
      return;
    }

    // Traitement selon le type de données reçues
    if (typeof npcData === 'string') {
      // Simple nom de NPC
      this.currentNpcData.name = npcData;
      console.log(`🎭 [ShopUI] NPC string: "${npcData}"`);
    } else if (typeof npcData === 'object') {
      // Objet NPC complet
      this.currentNpcData = {
        ...this.currentNpcData,
        id: npcData.id || npcData.npcId || 'unknown',
        name: npcData.name || npcData.npcName || 'Marchand',
        isUnifiedInterface: npcData.isUnifiedInterface || false,
        capabilities: npcData.capabilities || ['merchant'],
        contextualData: npcData.contextualData || null
      };
      
      console.log(`🎭 [ShopUI] NPC objet complet:`, this.currentNpcData);
    }

    // Stocker les données d'interface unifiée si présentes
    this.isUnifiedInterface = this.currentNpcData.isUnifiedInterface;
    this.npcCapabilities = this.currentNpcData.capabilities;
    this.contextualData = this.currentNpcData.contextualData;
  }

  // ✅ NOUVELLE MÉTHODE: Traitement des données shop pré-chargées
  processPreloadedShopData(preloadedData) {
    console.log('💉 [ShopUI] Traitement des données pré-chargées...');
    
    // Stocker les données d'interface unifiée
    this.unifiedInterfaceData = preloadedData.unifiedInterface || null;
    
    // Extraire les données merchant si présentes
    if (preloadedData.unifiedInterface && preloadedData.unifiedInterface.merchantData) {
      const merchantData = preloadedData.unifiedInterface.merchantData;
      
      // Construire la structure de catalogue attendue
      const catalogData = {
        success: true,
        catalog: {
          shopInfo: merchantData.shopInfo || { id: 'unified_shop', name: 'Boutique' },
          availableItems: merchantData.availableItems || [],
          npcName: this.currentNpcData.name
        },
        playerGold: merchantData.playerGold || 0,
        npcName: this.currentNpcData.name
      };
      
      // Traiter immédiatement
      setTimeout(() => {
        if (this.isVisible) {
          this.handleShopCatalog(catalogData);
        }
      }, 100);
      
      console.log('✅ [ShopUI] Données merchant extraites et traitées');
    }
    
    // Traiter les messages de bienvenue localisés
    if (preloadedData.dialogueKeys) {
      this.currentDialogueKeys = preloadedData.dialogueKeys;
      this.currentWelcomeMessage = this.getLocalizedDialogueLines(preloadedData.dialogueKeys)[0] || null;
    } else if (preloadedData.unifiedInterface?.merchantData?.welcomeDialogue) {
      this.currentWelcomeMessage = preloadedData.unifiedInterface.merchantData.welcomeDialogue[0] || null;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour de l'interface avec les nouvelles données
  updateShopInterface() {
    // Mettre à jour le header avec les infos NPC
    this.updateShopHeader();
    
    // Mettre à jour les messages de bienvenue
    this.updateWelcomeMessages();
    
    // Mettre à jour l'affichage de l'or
    this.updatePlayerGoldDisplay();
    
    // Mettre à jour les textes d'interface
    this.updateInterfaceTexts();
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour du header avec infos NPC
  updateShopHeader() {
    const shopNameElement = this.overlay.querySelector('.shop-name');
    const shopSubtitleElement = this.overlay.querySelector('.shop-subtitle');
    const shopNpcInfoElement = this.overlay.querySelector('.shop-npc-info');
    
    if (shopNameElement && this.currentNpcData) {
      // Nom principal du shop basé sur le NPC
      shopNameElement.textContent = `Boutique de ${this.currentNpcData.name}`;
      
      // Sous-titre basé sur le type de NPC
      if (shopSubtitleElement) {
        let subtitle = 'Marchand Pokémon';
        if (this.isUnifiedInterface && this.npcCapabilities.length > 1) {
          subtitle = 'Services Multiples';
        } else if (this.contextualData?.defaultAction) {
          const actionMap = {
            'merchant': 'Marchand Pokémon',
            'quest': 'Donneur de Quêtes',
            'dialogue': 'Informateur'
          };
          subtitle = actionMap[this.contextualData.defaultAction] || 'Marchand Pokémon';
        }
        shopSubtitleElement.textContent = subtitle;
      }
      
      // Info NPC détaillée
      if (shopNpcInfoElement) {
        let npcInfo = `NPC: ${this.currentNpcData.name}`;
        if (this.isUnifiedInterface) {
          npcInfo += ` (Interface Unifiée)`;
        }
        if (this.npcCapabilities && this.npcCapabilities.length > 1) {
          npcInfo += ` • ${this.npcCapabilities.length} capacités`;
        }
        shopNpcInfoElement.textContent = npcInfo;
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour des messages de bienvenue
  updateWelcomeMessages() {
    const welcomeElement = this.overlay.querySelector('.shop-welcome');
    const tipElement = this.overlay.querySelector('.shop-tip');
    
    if (welcomeElement) {
      let welcomeMessage = `Bienvenue chez ${this.currentNpcData?.name || 'notre marchand'} !`;
      
      // Utiliser le message personnalisé si disponible
      if (this.currentWelcomeMessage) {
        welcomeMessage = this.currentWelcomeMessage;
      } else if (this.unifiedInterfaceData?.merchantData?.welcomeDialogue) {
        welcomeMessage = this.unifiedInterfaceData.merchantData.welcomeDialogue[0] || welcomeMessage;
      }
      
      welcomeElement.textContent = welcomeMessage;
    }
    
    if (tipElement) {
      let tipMessage = '💡 Conseil: Les objets rares apparaissent selon votre niveau';
      
      // Conseil personnalisé pour interface unifiée
      if (this.isUnifiedInterface && this.npcCapabilities.length > 1) {
        tipMessage = '💡 Conseil: Ce NPC offre plusieurs services - utilisez les onglets pour naviguer';
      }
      
      tipElement.textContent = tipMessage;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour des textes d'interface
  updateInterfaceTexts() {
    // Mettre à jour les textes des onglets en français
    const buyTab = this.overlay.querySelector('[data-tab="buy"] .tab-text');
    const sellTab = this.overlay.querySelector('[data-tab="sell"] .tab-text');
    const sectionTitle = this.overlay.querySelector('.section-title');
    const detailsTitle = this.overlay.querySelector('.details-title');
    const actionBtn = this.overlay.querySelector('#shop-action-btn .btn-text');
    const refreshBtn = this.overlay.querySelector('#shop-refresh-btn .btn-text');
    
    if (buyTab) buyTab.textContent = 'Acheter';
    if (sellTab) sellTab.textContent = 'Vendre';
    if (sectionTitle) sectionTitle.textContent = 'Objets Disponibles';
    if (detailsTitle) detailsTitle.textContent = 'Détails de l\'Objet';
    if (actionBtn) actionBtn.textContent = this.currentTab === 'buy' ? 'Acheter' : 'Vendre';
    if (refreshBtn) refreshBtn.textContent = 'Actualiser';
  }

  // ✅ HANDLE SHOP CATALOG - VERSION ADAPTÉE
  handleShopCatalog(data) {
    console.log(`🏪 [ShopUI] === HANDLE SHOP CATALOG ADAPTÉ ===`);
    console.log(`📊 Data received:`, data);

    // ✅ LOCK CONTRE APPELS MULTIPLES
    const now = Date.now();
    if (this.isProcessingCatalog && (now - this.lastCatalogTime) < 1000) {
      console.warn(`⚠️ [ShopUI] Catalog en cours de traitement, ignoré`);
      return;
    }
    
    this.isProcessingCatalog = true;
    this.lastCatalogTime = now;

    try {
      if (!data.success) {
        console.error('❌ [ShopUI] Shop catalog failed:', data.message);
        this.showNotification(data.message || "Impossible de charger le catalogue", "error");
        return;
      }

      // ✅ STOCKAGE DES DONNÉES
      this.shopData = data.catalog;
      this.playerGold = data.playerGold || 0;

      // ✅ ENRICHISSEMENT DES DONNÉES NPC depuis le catalogue
      if (data.catalog?.npcName && (!this.currentNpcData?.name || this.currentNpcData.name === 'Marchand')) {
        this.currentNpcData.name = data.catalog.npcName;
        console.log(`🎭 [ShopUI] Nom NPC enrichi depuis catalogue: "${data.catalog.npcName}"`);
      }
      
      // Enrichir depuis la racine des données aussi
      if (data.npcName && (!this.currentNpcData?.name || this.currentNpcData.name === 'Marchand')) {
        this.currentNpcData.name = data.npcName;
        console.log(`🎭 [ShopUI] Nom NPC enrichi depuis racine: "${data.npcName}"`);
      }

      // ✅ NORMALISATION DE LA STRUCTURE DES DONNÉES
      if (!this.shopData.availableItems) {
        console.log('🔧 [ShopUI] Normalisation de la structure shop...');
        
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
        
        console.log(`✅ [ShopUI] Structure normalisée: ${this.shopData.availableItems.length} items`);
      }

      // ✅ TRAITEMENT DES DIALOGUES LOCALISÉS
      if (data.dialogueKeys && Array.isArray(data.dialogueKeys)) {
        this.currentDialogueKeys = data.dialogueKeys;
        const localizedDialogues = this.getLocalizedDialogueLines(data.dialogueKeys);
        if (localizedDialogues.length > 0) {
          this.currentWelcomeMessage = localizedDialogues[0];
          console.log(`🌐 [ShopUI] Message de bienvenue localisé: "${this.currentWelcomeMessage}"`);
        }
      }
      
      // ✅ TRAITEMENT DU MESSAGE KEY
      if (data.messageKey) {
        const localizedMessage = this.getLocalizedText(data.messageKey);
        if (localizedMessage && localizedMessage !== data.messageKey) {
          console.log(`🌐 [ShopUI] Message principal localisé: "${localizedMessage}"`);
          // Peut être utilisé pour des notifications spéciales
        }
      }

      // ✅ MISE À JOUR DE L'INTERFACE COMPLÈTE
      this.updateShopInterface();
      this.refreshCurrentTab();
      
      console.log(`✅ [ShopUI] Catalogue traité avec ${this.shopData.availableItems.length} objets pour ${this.currentNpcData?.name}`);
      
      // ✅ NOTIFICATION DE SUCCÈS
      this.showNotification(`Catalogue chargé !`, 'success');
      
    } catch (error) {
      console.error('❌ [ShopUI] Erreur handleShopCatalog:', error);
      this.showNotification(`Erreur technique: ${error.message}`, "error");
    } finally {
      // ✅ LIBÉRATION DU LOCK
      setTimeout(() => {
        this.isProcessingCatalog = false;
      }, 500);
    }
  }

  // ✅ MÉTHODES EXISTANTES CONSERVÉES AVEC AMÉLIORATIONS
  
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.hideModal();
    this.selectedItem = null;
    this.shopData = null;
    
    // ✅ NETTOYAGE DES DONNÉES TEMPORAIRES
    this.currentWelcomeMessage = null;
    this.currentDialogueKeys = [];
    this.unifiedInterfaceData = null;
    
    this.updateItemDetails();
    
    console.log('🏪 Shop fermé');
  }

  requestShopCatalog(shopId) {
    if (this.gameRoom) {
      this.showLoading();
      this.gameRoom.send("getShopCatalog", { shopId });
    }
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
    
    // ✅ MISE À JOUR DES TEXTES DE BOUTON
    this.updateActionButtonText();
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour du texte du bouton d'action
  updateActionButtonText() {
    const actionBtn = this.overlay.querySelector('#shop-action-btn .btn-text');
    const actionIcon = this.overlay.querySelector('#shop-action-btn .btn-icon');
    
    if (actionBtn) {
      actionBtn.textContent = this.currentTab === 'buy' ? 'Acheter' : 'Vendre';
    }
    
    if (actionIcon) {
      actionIcon.textContent = this.currentTab === 'buy' ? '🛒' : '💰';
    }
  }

  refreshCurrentTab() {
    const itemsGrid = this.overlay.querySelector('#shop-items-grid');
    
    if (!this.shopData) {
      this.showEmpty("Aucune donnée de boutique disponible");
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
    
    const items = Array.isArray(this.shopData?.availableItems) ? this.shopData.availableItems : [];
    
    console.log(`🔍 [ShopUI] === AFFICHAGE ONGLET ACHETER ===`);
    console.log(`📦 Total items reçus: ${items.length}`);
    
    const availableItems = items.filter(item => {
      if (item.isEmpty) return true;
      
      const playerLevel = this.playerLevel || 1;
      const levelOk = !item.unlockLevel || playerLevel >= item.unlockLevel;
      const hasStock = item.stock === undefined || item.stock === -1 || item.stock > 0;
      const isBuyable = item.canBuy !== false;
      
      return isBuyable && levelOk && hasStock;
    });

    console.log(`📊 [ShopUI] RÉSULTAT: ${availableItems.length}/${items.length} items affichés`);

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
      <div class="shop-item-price">${item.buyPrice}₽</div>
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
      <div class="shop-item-price">${item.sellPrice}₽</div>
    `;

    itemElement.addEventListener('click', () => {
      this.selectItem(item, itemElement);
    });

    setTimeout(() => {
      itemElement.classList.add('new');
    }, index * 50);

    return itemElement;
  }

  createEmptyShopItemElement() {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item shop-empty-item';
    itemElement.style.opacity = '0.6';
    itemElement.style.cursor = 'not-allowed';
    
    itemElement.innerHTML = `
      <div class="shop-item-icon">📭</div>
      <div class="shop-item-name">Aucun Objet</div>
      <div class="shop-item-price">-</div>
      <div class="shop-item-stock out">Vide</div>
    `;
    
    return itemElement;
  }

  getStockDisplay(stock) {
    if (stock === undefined || stock === -1) {
      return '';
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
            <span class="stat-label">Niveau Requis</span>
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
            <span class="stat-label">Disponibilité</span>
            <span class="stat-value">${canAfford ? 'Abordable' : 'Trop Cher'}</span>
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
          <span class="details-title">Détails de l'Objet</span>
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
    const priceLabel = this.currentTab === 'buy' ? 'Prix d\'Achat' : 'Prix de Vente';

    detailsContainer.innerHTML = `
      <div class="details-header">
        <span class="details-title">Détails de l'Objet</span>
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
              <span class="stat-value">${price}₽</span>
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
    return item.type || 'Objet';
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
      actionBtn.disabled = false;
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
    const itemCount = itemsGrid.querySelectorAll('.shop-item:not(.shop-empty-item)').length;
    
    itemsCountElement.textContent = `${itemCount} objets`;
  }

  showBuyModal() {
    if (!this.selectedItem) return;

    const modal = this.overlay.querySelector('#shop-modal');
    const itemIcon = modal.querySelector('.modal-item-icon');
    const itemName = modal.querySelector('.modal-item-name');
    const itemPrice = modal.querySelector('.modal-item-price');
    const quantityInput = modal.querySelector('#quantity-input');
    const modalTitle = modal.querySelector('.modal-title');

    // ✅ TEXTES EN FRANÇAIS
    modalTitle.textContent = 'Confirmation d\'Achat';
    
    itemIcon.textContent = this.getItemIcon(this.selectedItem.itemId);
    itemName.textContent = this.getItemName(this.selectedItem.itemId);
    itemPrice.textContent = `Prix unitaire: ${this.selectedItem.buyPrice}₽`;

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
      
      if (data.newGold !== undefined) {
        this.updatePlayerGold(data.newGold);
      }
      
      this.requestShopCatalog(this.shopData.shopInfo.id);
    } else {
      this.showNotification(data.message || "Transaction échouée", "error");
    }
  }

  handleRefreshResult(data) {
    if (data.success) {
      if (data.restocked) {
        this.showNotification("Boutique réapprovisionnée !", "success");
      } else {
        this.showNotification("Aucun réapprovisionnement nécessaire", "info");
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

  // ✅ MÉTHODES PUBLIQUES POUR INTÉGRATION

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

  // ✅ NOUVELLE MÉTHODE: Obtenir les données NPC actuelles
  getCurrentNpcData() {
    return this.currentNpcData;
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier si c'est une interface unifiée
  isUnifiedInterfaceActive() {
    return this.isUnifiedInterface;
  }

  // ✅ NOUVELLE MÉTHODE: Obtenir les capacités NPC
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
    
    console.log('🏪 ShopUI détruit');
  }
}
