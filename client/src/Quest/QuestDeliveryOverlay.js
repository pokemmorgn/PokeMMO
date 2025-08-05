// client/src/Quest/QuestDeliveryOverlay.js
// 🎁 Interface de livraison d'objets de quête - Overlay sur dialogue
// ✅ Positionnement 20% sur dialogue, 80% débordant - Tout/Rien style
// 🔧 Intégration avec DialogueManager existant + NetworkManager

export class QuestDeliveryOverlay {
  constructor(questSystem, networkManager) {
    this.questSystem = questSystem;
    this.networkManager = networkManager;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isLoading = false;
    this.overlayElement = null;
    this.currentDeliveryData = null;
    this.currentNpcId = null;
    
    // === CALLBACKS ===
    this.onDeliveryConfirm = null;
    this.onClose = null;
    
    console.log('🎁 [QuestDeliveryOverlay] Instance créée - Style overlay sur dialogue');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestDeliveryOverlay] Initialisation...');
      
      this.addStyles();
      this.createOverlay();
      this.setupEventListeners();
      
      // Masquer par défaut
      this.hide();
      
      console.log('✅ [QuestDeliveryOverlay] Initialisé avec positionnement intelligent');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestDeliveryOverlay] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 STYLES OPTIMISÉS ===
  
  addStyles() {
    if (document.querySelector('#quest-delivery-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-delivery-overlay-styles';
    style.textContent = `
      /* ===== QUEST DELIVERY OVERLAY STYLES ===== */
      
      /* Container principal - Positionnement intelligent */
      .quest-delivery-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 1050 !important; /* Entre dialogue (1000) et detailsUI (1100) */
        pointer-events: none !important; /* Permet le clic sur dialogue */
        transition: opacity 0.3s ease !important;
        opacity: 0 !important;
      }
      
      .quest-delivery-overlay.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Overlay principal - Détection automatique position dialogue */
      .quest-delivery-container {
        position: absolute !important;
        width: 320px !important;
        min-height: 180px !important;
        background: linear-gradient(145deg, rgba(35, 45, 65, 0.98), rgba(25, 35, 55, 0.98)) !important;
        border: 2px solid rgba(255, 193, 7, 0.8) !important; /* Couleur dorée pour livraison */
        border-radius: 15px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(8px) !important;
        font-family: 'Arial', sans-serif !important;
        color: white !important;
        overflow: hidden !important;
        transform: scale(0.9) !important;
        transition: all 0.3s ease !important;
        pointer-events: auto !important;
      }
      
      .quest-delivery-overlay.visible .quest-delivery-container {
        transform: scale(1) !important;
      }
      
      /* Positionnement par défaut - sera ajusté dynamiquement */
      .quest-delivery-container.default-position {
        bottom: 180px !important;
        right: 20px !important;
      }
      
      /* Positionnement intelligent basé sur dialogue détecté */
      .quest-delivery-container.dialogue-aligned {
        /* Position calculée dynamiquement par JavaScript */
      }
      
      /* Header avec icône de livraison */
      .quest-delivery-header {
        background: linear-gradient(90deg, #ffc107, #ff9800) !important;
        padding: 12px 15px !important;
        border-bottom: 2px solid #e0a800 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .quest-delivery-header::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
        animation: deliveryShimmer 3s infinite !important;
      }
      
      @keyframes deliveryShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      .delivery-icon {
        font-size: 20px !important;
        color: #333 !important;
        z-index: 1 !important;
      }
      
      .delivery-title {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #333 !important;
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3) !important;
        z-index: 1 !important;
        flex: 1 !important;
      }
      
      .delivery-close {
        background: rgba(0, 0, 0, 0.2) !important;
        border: none !important;
        color: #333 !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        font-size: 14px !important;
        z-index: 1 !important;
        transition: all 0.3s ease !important;
      }
      
      .delivery-close:hover {
        background: rgba(0, 0, 0, 0.4) !important;
        transform: scale(1.1) !important;
      }
      
      /* Content principal */
      .quest-delivery-content {
        padding: 15px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 15px !important;
        min-height: 120px !important;
      }
      
      /* Loading state */
      .delivery-loading {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        text-align: center !important;
      }
      
      .delivery-loading-spinner {
        width: 30px !important;
        height: 30px !important;
        border: 3px solid rgba(255, 193, 7, 0.3) !important;
        border-top: 3px solid #ffc107 !important;
        border-radius: 50% !important;
        animation: deliverySpin 1s linear infinite !important;
        margin-bottom: 10px !important;
      }
      
      @keyframes deliverySpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .delivery-loading-text {
        font-size: 14px !important;
        color: #87ceeb !important;
      }
      
      /* Liste des objets à livrer */
      .delivery-items {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      
      .delivery-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 10px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
        border-left: 4px solid #4a90e2 !important;
        transition: all 0.3s ease !important;
      }
      
      .delivery-item.has-item {
        border-left-color: #28a745 !important;
        background: rgba(40, 167, 69, 0.1) !important;
      }
      
      .delivery-item.missing-item {
        border-left-color: #dc3545 !important;
        background: rgba(220, 53, 69, 0.1) !important;
        opacity: 0.7 !important;
        filter: grayscale(50%) !important;
      }
      
      /* Carré avec icône - Style demandé */
      .delivery-item-icon {
        width: 48px !important;
        height: 48px !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 24px !important;
        position: relative !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }
      
      .delivery-item.has-item .delivery-item-icon {
        background: rgba(40, 167, 69, 0.2) !important;
        border-color: #28a745 !important;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3) !important;
      }
      
      .delivery-item.missing-item .delivery-item-icon {
        background: rgba(220, 53, 69, 0.2) !important;
        border-color: #dc3545 !important;
        opacity: 0.5 !important;
        filter: grayscale(100%) !important;
      }
      
      .delivery-item-icon:hover:not(.missing-item) {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4) !important;
      }
      
      /* Tooltip pour l'icône - Style demandé */
      .delivery-item-tooltip {
        position: absolute !important;
        bottom: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: rgba(0, 0, 0, 0.9) !important;
        color: white !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        z-index: 1000 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
        margin-bottom: 5px !important;
      }
      
      .delivery-item-tooltip::after {
        content: '' !important;
        position: absolute !important;
        top: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        border: 5px solid transparent !important;
        border-top-color: rgba(0, 0, 0, 0.9) !important;
      }
      
      .delivery-item-icon:hover .delivery-item-tooltip {
        opacity: 1 !important;
      }
      
      /* Informations item */
      .delivery-item-info {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }
      
      .delivery-item-name {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: white !important;
      }
      
      /* Compteur x/x - Style demandé */
      .delivery-item-count {
        font-size: 13px !important;
        color: #87ceeb !important;
        font-weight: bold !important;
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
      }
      
      .delivery-item.has-item .delivery-item-count {
        color: #28a745 !important;
      }
      
      .delivery-item.missing-item .delivery-item-count {
        color: #dc3545 !important;
      }
      
      .count-current {
        color: inherit !important;
      }
      
      .count-separator {
        color: #666 !important;
      }
      
      .count-required {
        color: inherit !important;
      }
      
      /* Footer avec bouton */
      .quest-delivery-footer {
        background: rgba(0, 0, 0, 0.2) !important;
        padding: 15px !important;
        border-top: 1px solid rgba(255, 193, 7, 0.3) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
      }
      
      /* Résumé de livraison */
      .delivery-summary {
        font-size: 12px !important;
        color: #ccc !important;
        text-align: center !important;
        font-style: italic !important;
      }
      
      .delivery-summary.can-deliver {
        color: #28a745 !important;
      }
      
      .delivery-summary.cannot-deliver {
        color: #dc3545 !important;
      }
      
      /* Bouton "Donner" - Style demandé */
      .delivery-button {
        width: 100% !important;
        padding: 12px !important;
        border: none !important;
        border-radius: 10px !important;
        font-size: 14px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
      }
      
      .delivery-button.can-deliver {
        background: linear-gradient(135deg, #28a745, #20c997) !important;
        color: white !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3) !important;
      }
      
      .delivery-button.can-deliver:hover {
        background: linear-gradient(135deg, #32b855, #24d3a7) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4) !important;
      }
      
      .delivery-button.cannot-deliver {
        background: rgba(108, 117, 125, 0.5) !important;
        color: #888 !important;
        cursor: not-allowed !important;
        box-shadow: none !important;
      }
      
      .delivery-button.cannot-deliver:hover {
        transform: none !important;
      }
      
      .delivery-button:disabled {
        background: rgba(108, 117, 125, 0.3) !important;
        color: #666 !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }
      
      /* États d'animation */
      .quest-delivery-container.delivering {
        pointer-events: none !important;
        opacity: 0.7 !important;
      }
      
      .quest-delivery-container.error {
        animation: deliveryError 0.5s ease-in-out !important;
      }
      
      @keyframes deliveryError {
        0%, 100% { transform: scale(1) translateX(0); }
        25% { transform: scale(1) translateX(-5px); }
        75% { transform: scale(1) translateX(5px); }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .quest-delivery-container {
          width: 90% !important;
          max-width: 300px !important;
        }
        
        .delivery-item-icon {
          width: 40px !important;
          height: 40px !important;
          font-size: 20px !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [QuestDeliveryOverlay] Styles ajoutés avec positionnement intelligent');
  }
  
  // === 🏗️ CRÉATION OVERLAY ===
  
  createOverlay() {
    const existing = document.querySelector('.quest-delivery-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'quest-delivery-overlay';
    
    overlay.innerHTML = `
      <div class="quest-delivery-container default-position">
        <!-- Header -->
        <div class="quest-delivery-header">
          <span class="delivery-icon">🎁</span>
          <span class="delivery-title">Livraison d'Objets</span>
          <button class="delivery-close" id="delivery-close">✕</button>
        </div>
        
        <!-- Content -->
        <div class="quest-delivery-content" id="delivery-content">
          <!-- Contenu généré dynamiquement -->
        </div>
        
        <!-- Footer -->
        <div class="quest-delivery-footer">
          <div class="delivery-summary" id="delivery-summary">
            Vérifiez vos objets...
          </div>
          <button class="delivery-button cannot-deliver" id="delivery-confirm" disabled>
            Donner
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [QuestDeliveryOverlay] Overlay créé');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Bouton fermer
    const closeBtn = this.overlayElement.querySelector('#delivery-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hide();
      });
    }
    
    // Bouton confirmer livraison
    const confirmBtn = this.overlayElement.querySelector('#delivery-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleDeliveryConfirm();
      });
    }
    
    // Fermer avec Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    this.escapeHandler = escapeHandler;
    
    // Clic en dehors pour fermer (optionnel)
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement) {
        // this.hide(); // Décommenté si on veut fermer en cliquant dehors
      }
    });
    
    console.log('🎛️ [QuestDeliveryOverlay] Événements configurés');
  }
  
  // === 📋 MÉTHODES PUBLIQUES ===
  
  /**
   * Afficher l'overlay de livraison
   * @param {Object} deliveryData - Données de livraison depuis le serveur
   */
  show(deliveryData) {
    console.log('🎁 [QuestDeliveryOverlay] Affichage overlay:', deliveryData);
    
    if (!deliveryData || !deliveryData.items || deliveryData.items.length === 0) {
      console.error('❌ [QuestDeliveryOverlay] Données de livraison invalides');
      return false;
    }
    
    this.currentDeliveryData = deliveryData;
    this.currentNpcId = deliveryData.npcId;
    
    // Positionner l'overlay intelligemment
    this.positionOverlayIntelligently();
    
    // Afficher
    this.isVisible = true;
    this.overlayElement.classList.add('visible');
    
    // Générer le contenu
    this.renderDeliveryContent(deliveryData);
    
    console.log('✅ [QuestDeliveryOverlay] Overlay affiché');
    return true;
  }
  
  /**
   * Masquer l'overlay
   */
  hide() {
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
    }
    
    // Reset état
    this.currentDeliveryData = null;
    this.currentNpcId = null;
    this.isLoading = false;
    
    // Callback fermeture
    if (this.onClose && typeof this.onClose === 'function') {
      this.onClose();
    }
    
    console.log('✅ [QuestDeliveryOverlay] Overlay masqué');
  }
  
  // === 🎯 POSITIONNEMENT INTELLIGENT ===
  
  /**
   * Positionner l'overlay de manière intelligente par rapport au dialogue
   */
  positionOverlayIntelligently() {
    const container = this.overlayElement.querySelector('.quest-delivery-container');
    if (!container) return;
    
    // Chercher le dialogue actif
    const dialogueBox = document.querySelector('#dialogue-box:not([style*="display: none"])') ||
                       document.querySelector('.dialogue-box-unified:not(.hidden)') ||
                       document.querySelector('.dialogue-container:not(.hidden) .dialogue-box-unified');
    
    if (dialogueBox) {
      console.log('🎯 [QuestDeliveryOverlay] Dialogue détecté - positionnement intelligent');
      
      const dialogueRect = dialogueBox.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculer position optimale
      let targetLeft, targetTop;
      
      // Position horizontale : 20% sur dialogue, 80% débordant
      const overlapWidth = container.offsetWidth * 0.2;
      targetLeft = dialogueRect.right - overlapWidth;
      
      // Position verticale : aligné avec le dialogue
      targetTop = dialogueRect.top;
      
      // Vérifications limites écran
      if (targetLeft + container.offsetWidth > viewportWidth) {
        targetLeft = viewportWidth - container.offsetWidth - 20;
      }
      
      if (targetTop + container.offsetHeight > viewportHeight) {
        targetTop = viewportHeight - container.offsetHeight - 20;
      }
      
      if (targetTop < 20) {
        targetTop = 20;
      }
      
      // Appliquer position
      container.style.position = 'fixed';
      container.style.left = `${targetLeft}px`;
      container.style.top = `${targetTop}px`;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      
      container.classList.remove('default-position');
      container.classList.add('dialogue-aligned');
      
      console.log(`✅ [QuestDeliveryOverlay] Position calculée: x=${targetLeft}, y=${targetTop}`);
      
    } else {
      console.log('⚠️ [QuestDeliveryOverlay] Dialogue non détecté - position par défaut');
      
      // Position par défaut
      container.classList.remove('dialogue-aligned');
      container.classList.add('default-position');
      container.style.position = '';
      container.style.left = '';
      container.style.top = '';
      container.style.right = '';
      container.style.bottom = '';
    }
  }
  
  // === 🎨 RENDU CONTENU ===
  
  /**
   * Rendre le contenu de livraison
   * @param {Object} deliveryData - Données de livraison
   */
  renderDeliveryContent(deliveryData) {
    const contentContainer = this.overlayElement.querySelector('#delivery-content');
    const summaryElement = this.overlayElement.querySelector('#delivery-summary');
    const confirmButton = this.overlayElement.querySelector('#delivery-confirm');
    
    if (!contentContainer) return;
    
    const items = deliveryData.items || [];
    const canDeliverAll = deliveryData.canDeliverAll || false;
    
    // Générer HTML des items
    const itemsHTML = items.map((item, index) => {
      const hasItem = item.playerHas >= item.required;
      const itemClass = hasItem ? 'has-item' : 'missing-item';
      
      // Icône basée sur le type d'item ou icône générique
      const itemIcon = this.getItemIcon(item.itemId) || '📦';
      
      return `
        <div class="delivery-item ${itemClass}">
          <div class="delivery-item-icon">
            ${itemIcon}
            <div class="delivery-item-tooltip">${item.itemName}</div>
          </div>
          <div class="delivery-item-info">
            <div class="delivery-item-name">${item.itemName}</div>
            <div class="delivery-item-count">
              <span class="count-current">${item.playerHas}</span>
              <span class="count-separator">/</span>
              <span class="count-required">${item.required}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    contentContainer.innerHTML = `
      <div class="delivery-items">
        ${itemsHTML}
      </div>
    `;
    
    // Mettre à jour résumé
    const readyCount = items.filter(item => item.playerHas >= item.required).length;
    const totalCount = items.length;
    
    if (summaryElement) {
      summaryElement.className = 'delivery-summary';
      
      if (canDeliverAll) {
        summaryElement.textContent = `✅ Tous les objets sont prêts (${readyCount}/${totalCount})`;
        summaryElement.classList.add('can-deliver');
      } else {
        summaryElement.textContent = `❌ Objets manquants (${readyCount}/${totalCount})`;
        summaryElement.classList.add('cannot-deliver');
      }
    }
    
    // Mettre à jour bouton
    if (confirmButton) {
      confirmButton.disabled = !canDeliverAll;
      confirmButton.className = 'delivery-button';
      
      if (canDeliverAll) {
        confirmButton.classList.add('can-deliver');
        confirmButton.textContent = '🎁 Donner Tout';
      } else {
        confirmButton.classList.add('cannot-deliver');
        confirmButton.textContent = 'Objets Manquants';
      }
    }
    
    console.log(`✅ [QuestDeliveryOverlay] Contenu rendu: ${items.length} objets, peut livrer: ${canDeliverAll}`);
  }
  
  /**
   * Obtenir l'icône pour un type d'objet
   * @param {string} itemId - ID de l'objet
   * @returns {string} Icône emoji
   */
  getItemIcon(itemId) {
    const iconMap = {
      // Objets communs
      'gardening_gloves': '🧤',
      'gloves': '🧤',
      'potion': '🧪',
      'berry': '🫐',
      'herb': '🌿',
      'flower': '🌸',
      'gem': '💎',
      'coin': '🪙',
      'key': '🗝️',
      'letter': '📝',
      'book': '📖',
      'scroll': '📜',
      'sword': '⚔️',
      'shield': '🛡️',
      'bow': '🏹',
      'staff': '🪄',
      'ring': '💍',
      'necklace': '📿',
      'crystal': '💎',
      'mushroom': '🍄',
      'apple': '🍎',
      'bread': '🍞',
      'cheese': '🧀',
      'fish': '🐟',
      'meat': '🥩'
    };
    
    // Recherche exacte
    if (iconMap[itemId]) {
      return iconMap[itemId];
    }
    
    // Recherche partielle
    const lowerItemId = itemId.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerItemId.includes(key)) {
        return icon;
      }
    }
    
    // Icône par défaut
    return '📦';
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  /**
   * Gérer la confirmation de livraison
   */
  handleDeliveryConfirm() {
    if (!this.currentDeliveryData || !this.currentNpcId) {
      console.error('❌ [QuestDeliveryOverlay] Pas de données de livraison');
      return;
    }
    
    if (!this.currentDeliveryData.canDeliverAll) {
      console.warn('⚠️ [QuestDeliveryOverlay] Ne peut pas livrer tous les objets');
      this.showError('Vous n\'avez pas tous les objets requis');
      return;
    }
    
    console.log('🎯 [QuestDeliveryOverlay] Confirmation de livraison...');
    
    // Feedback immédiat
    this.setDelivering(true);
    
    try {
      // Callback de confirmation
      if (this.onDeliveryConfirm && typeof this.onDeliveryConfirm === 'function') {
        this.onDeliveryConfirm(this.currentDeliveryData, this.currentNpcId);
      }
      
      // Envoyer au serveur via NetworkManager
      if (this.networkManager && this.networkManager.sendMessage) {
        const deliveryRequest = {
          npcId: this.currentNpcId,
          questId: this.currentDeliveryData.questId,
          items: this.currentDeliveryData.items.map(item => ({
            itemId: item.itemId,
            required: item.required
          })),
          timestamp: Date.now()
        };
        
        this.networkManager.sendMessage('questDelivery', deliveryRequest);
        console.log('📤 [QuestDeliveryOverlay] Demande de livraison envoyée');
      }
      
      // Fermer après délai
      setTimeout(() => {
        this.hide();
      }, 1500);
      
    } catch (error) {
      console.error('❌ [QuestDeliveryOverlay] Erreur confirmation:', error);
      this.setDelivering(false);
      this.showError('Erreur lors de la livraison');
    }
  }
  
  /**
   * Définir l'état de livraison en cours
   * @param {boolean} isDelivering - État de livraison
   */
  setDelivering(isDelivering) {
    this.isLoading = isDelivering;
    
    const container = this.overlayElement.querySelector('.quest-delivery-container');
    const confirmButton = this.overlayElement.querySelector('#delivery-confirm');
    
    if (container) {
      container.classList.toggle('delivering', isDelivering);
    }
    
    if (confirmButton) {
      confirmButton.disabled = isDelivering;
      if (isDelivering) {
        confirmButton.textContent = '🔄 Livraison...';
      }
    }
  }
  
  /**
   * Afficher une erreur
   * @param {string} message - Message d'erreur
   */
  showError(message) {
    const container = this.overlayElement.querySelector('.quest-delivery-container');
    if (container) {
      container.classList.add('error');
      setTimeout(() => {
        container.classList.remove('error');
      }, 500);
    }
    
    // Notification
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'error', { duration: 3000 });
    } else {
      console.error('[QuestDeliveryOverlay]', message);
    }
  }
  
  // === 🔧 UTILITAIRES ===
  
  /**
   * Vérifier si l'overlay est visible
   */
  isOpen() {
    return this.isVisible;
  }
  
  /**
   * Obtenir les données de livraison actuelles
   */
  getCurrentDeliveryData() {
    return this.currentDeliveryData;
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestDeliveryOverlay] Destruction...');
    
    // Supprimer event listener escape
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    
    // Supprimer DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Supprimer styles
    const styles = document.querySelector('#quest-delivery-overlay-styles');
    if (styles) styles.remove();
    
    // Reset références
    this.overlayElement = null;
    this.currentDeliveryData = null;
    this.currentNpcId = null;
    this.questSystem = null;
    this.networkManager = null;
    
    // Reset callbacks
    this.onDeliveryConfirm = null;
    this.onClose = null;
    
    console.log('✅ [QuestDeliveryOverlay] Détruit');
  }
}

export default QuestDeliveryOverlay;
