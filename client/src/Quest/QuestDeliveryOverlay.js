// client/src/Quest/QuestDeliveryOverlay.js
// 🎁 Interface de livraison d'objets de quête - Overlay sur dialogue
// ✅ Style unifié avec le reste du système Quest (couleurs bleues #4a90e2)
// 🔧 Intégration avec DialogueManager existant + NetworkManager
// 🛡️ CORRECTION: Protection contre double envoi questDelivery
// 🆕 NOUVEAU: Fermeture automatique du dialogue

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
    
    // 🛡️ NOUVEAU: Protection contre double envoi
    this.deliveryState = {
      isDelivering: false,
      lastDeliveryTime: 0,
      deliveryNonce: null,
      deliveryTimeoutId: null,
      deliveryDebounceTime: 2000 // 2 secondes entre livraisons
    };
    
    // 🆕 NOUVEAU: Gestion du dialogue associé
    this.dialogueState = {
      dialogueWasOpen: false,
      dialogueReference: null,
      shouldCloseDialogue: true, // Par défaut, fermer le dialogue
      dialogueCloseDelay: 300 // Délai avant fermeture du dialogue
    };
    
    // === CALLBACKS ===
    this.onDeliveryConfirm = null;
    this.onClose = null;
    
    console.log('🎁 [QuestDeliveryOverlay] Instance créée avec gestion dialogue automatique');
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
      
      console.log('✅ [QuestDeliveryOverlay] Initialisé avec gestion dialogue');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestDeliveryOverlay] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🆕 NOUVELLES MÉTHODES : GESTION DIALOGUE ===
  
  /**
   * Détecter et capturer la référence au dialogue ouvert
   */
  captureDialogueReference() {
    console.log('🔍 [QuestDeliveryOverlay] Capture référence dialogue...');
    
    // Reset état
    this.dialogueState.dialogueWasOpen = false;
    this.dialogueState.dialogueReference = null;
    
    // 🔍 Méthode 1: Vérifier window.dialogueManager
    if (window.dialogueManager && window.dialogueManager.isVisible) {
      console.log('✅ [QuestDeliveryOverlay] DialogueManager détecté comme ouvert');
      this.dialogueState.dialogueWasOpen = true;
      this.dialogueState.dialogueReference = window.dialogueManager;
      return true;
    }
    
    // 🔍 Méthode 2: Vérifier élément DOM dialogue visible
    const dialogueSelectors = [
      '#dialogue-box:not([style*="display: none"])',
      '.dialogue-box-unified:not(.hidden)',
      '.dialogue-container:not(.hidden)',
      '[id*="dialogue"]:not(.hidden)',
      '[class*="dialogue"]:not(.hidden)',
      '.npc-dialogue-overlay:not(.hidden)'
    ];
    
    for (const selector of dialogueSelectors) {
      const dialogueElement = document.querySelector(selector);
      if (dialogueElement && dialogueElement.offsetParent !== null) { // Visible
        console.log(`✅ [QuestDeliveryOverlay] Dialogue DOM détecté: ${selector}`);
        this.dialogueState.dialogueWasOpen = true;
        this.dialogueState.dialogueReference = dialogueElement;
        return true;
      }
    }
    
    // 🔍 Méthode 3: Vérifier autres gestionnaires globaux
    const dialogueManagers = [
      'window.npcDialogueManager',
      'window.dialogueSystem',
      'window.dialogue',
      'window.npcManager?.currentDialogue'
    ];
    
    for (const managerPath of dialogueManagers) {
      try {
        const manager = eval(managerPath);
        if (manager && (manager.isVisible || manager.visible || manager.isOpen)) {
          console.log(`✅ [QuestDeliveryOverlay] Manager dialogue détecté: ${managerPath}`);
          this.dialogueState.dialogueWasOpen = true;
          this.dialogueState.dialogueReference = manager;
          return true;
        }
      } catch (e) {
        // Manager n'existe pas, continuer
      }
    }
    
    console.log('ℹ️ [QuestDeliveryOverlay] Aucun dialogue ouvert détecté');
    return false;
  }
  
  /**
   * Fermer le dialogue capturé si nécessaire
   */
  closeAssociatedDialogue() {
    if (!this.dialogueState.shouldCloseDialogue || !this.dialogueState.dialogueWasOpen) {
      console.log('🚪 [QuestDeliveryOverlay] Pas de fermeture dialogue (désactivée ou pas de dialogue)');
      return;
    }
    
    console.log('🚪 [QuestDeliveryOverlay] Fermeture dialogue associé...');
    
    const reference = this.dialogueState.dialogueReference;
    if (!reference) {
      console.warn('⚠️ [QuestDeliveryOverlay] Pas de référence dialogue à fermer');
      return;
    }
    
    try {
      // 🔧 Méthode 1: Si c'est window.dialogueManager
      if (reference === window.dialogueManager) {
        if (typeof reference.hide === 'function') {
          reference.hide();
          console.log('✅ [QuestDeliveryOverlay] DialogueManager fermé via hide()');
        } else if (typeof reference.close === 'function') {
          reference.close();
          console.log('✅ [QuestDeliveryOverlay] DialogueManager fermé via close()');
        }
        return;
      }
      
      // 🔧 Méthode 2: Si c'est un élément DOM
      if (reference instanceof HTMLElement) {
        // Essayer de trouver et cliquer sur le bouton de fermeture
        const closeSelectors = [
          '.close', '.close-btn', '.dialogue-close', 
          '[data-action="close"]', '[onclick*="close"]',
          'button[title*="fermer"]', 'button[title*="close"]'
        ];
        
        let closed = false;
        for (const selector of closeSelectors) {
          const closeBtn = reference.querySelector(selector);
          if (closeBtn) {
            closeBtn.click();
            console.log(`✅ [QuestDeliveryOverlay] Dialogue fermé via bouton: ${selector}`);
            closed = true;
            break;
          }
        }
        
        // Si pas de bouton trouvé, masquer directement
        if (!closed) {
          reference.style.display = 'none';
          reference.classList.add('hidden');
          console.log('✅ [QuestDeliveryOverlay] Dialogue masqué directement');
        }
        return;
      }
      
      // 🔧 Méthode 3: Si c'est un objet avec méthodes
      if (typeof reference === 'object') {
        const closeMethods = ['hide', 'close', 'dismiss', 'destroy'];
        
        for (const method of closeMethods) {
          if (typeof reference[method] === 'function') {
            reference[method]();
            console.log(`✅ [QuestDeliveryOverlay] Dialogue fermé via ${method}()`);
            return;
          }
        }
        
        // Essayer de modifier des propriétés de visibilité
        if ('isVisible' in reference) reference.isVisible = false;
        if ('visible' in reference) reference.visible = false;
        if ('isOpen' in reference) reference.isOpen = false;
        console.log('✅ [QuestDeliveryOverlay] Dialogue fermé via propriétés');
        return;
      }
      
    } catch (error) {
      console.error('❌ [QuestDeliveryOverlay] Erreur fermeture dialogue:', error);
    }
    
    console.warn('⚠️ [QuestDeliveryOverlay] Impossible de fermer le dialogue');
  }
  
  /**
   * 🆕 NOUVELLE MÉTHODE: Configurer comportement fermeture dialogue
   */
  setDialogueCloseSettings(shouldClose = true, delay = 300) {
    this.dialogueState.shouldCloseDialogue = shouldClose;
    this.dialogueState.dialogueCloseDelay = delay;
    
    console.log(`🔧 [QuestDeliveryOverlay] Configuration dialogue: fermer=${shouldClose}, délai=${delay}ms`);
  }
  
  // === 🎨 STYLES UNIFIÉS AVEC QUEST UI ===
  
  addStyles() {
    if (document.querySelector('#quest-delivery-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-delivery-overlay-styles';
    style.textContent = `
      /* ===== QUEST DELIVERY OVERLAY - STYLE UNIFIÉ ===== */
      
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
      
      /* Overlay principal - Style unifié avec Quest UI */
      .quest-delivery-container {
        position: absolute !important;
        width: 320px !important;
        min-height: 180px !important;
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98)) !important;
        border: 2px solid rgba(100, 149, 237, 0.8) !important; /* Bleu Quest UI */
        border-radius: 15px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(10px) !important;
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
      
      /* Header avec style Quest UI */
      .quest-delivery-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important; /* Bleu Quest */
        padding: 12px 15px !important;
        border-bottom: 2px solid #357abd !important;
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
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent) !important;
        animation: deliveryShimmer 4s infinite !important;
      }
      
      @keyframes deliveryShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      .delivery-icon {
        font-size: 20px !important;
        color: #ffff80 !important; /* Jaune comme titre Quest */
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6) !important;
        z-index: 1 !important;
      }
      
      .delivery-title {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #ffff80 !important; /* Jaune comme titre Quest */
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6) !important;
        z-index: 1 !important;
        flex: 1 !important;
      }
      
      .delivery-close {
        background: rgba(220, 53, 69, 0.8) !important;
        border: none !important;
        color: white !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        font-size: 14px !important;
        z-index: 1 !important;
        transition: all 0.3s ease !important;
      }
      
      .delivery-close:hover {
        background: rgba(220, 53, 69, 1) !important;
        transform: scale(1.1) !important;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4) !important;
      }
      
      /* Content principal */
      .quest-delivery-content {
        padding: 15px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 15px !important;
        min-height: 120px !important;
        background: rgba(0, 0, 0, 0.1) !important;
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
        border: 3px solid rgba(74, 144, 226, 0.2) !important;
        border-top: 3px solid #4a90e2 !important;
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
      
      .delivery-item:hover {
        background: rgba(100, 149, 237, 0.15) !important;
        transform: translateX(3px) !important;
      }
      
      .delivery-item.has-item {
        border-left-color: #28a745 !important;
        background: rgba(40, 167, 69, 0.1) !important;
      }
      
      .delivery-item.missing-item {
        border-left-color: #dc3545 !important;
        background: rgba(220, 53, 69, 0.1) !important;
        opacity: 0.7 !important;
      }
      
      /* Carré avec icône - Style unifié */
      .delivery-item-icon {
        width: 48px !important;
        height: 48px !important;
        border-radius: 8px !important;
        background: rgba(74, 144, 226, 0.1) !important;
        border: 2px solid rgba(74, 144, 226, 0.3) !important;
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
      }
      
      .delivery-item-icon:hover:not(.missing-item .delivery-item-icon) {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4) !important;
      }
      
      /* Tooltip pour l'icône */
      .delivery-item-tooltip {
        position: absolute !important;
        bottom: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98)) !important;
        color: white !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        border: 1px solid rgba(74, 144, 226, 0.5) !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        z-index: 1000 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
        margin-bottom: 5px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
      }
      
      .delivery-item-tooltip::after {
        content: '' !important;
        position: absolute !important;
        top: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        border: 5px solid transparent !important;
        border-top-color: rgba(35, 45, 65, 0.98) !important;
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
      
      /* Compteur x/x */
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
        background: rgba(0, 0, 0, 0.3) !important;
        padding: 15px !important;
        border-top: 2px solid #357abd !important;
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
        font-weight: bold !important;
      }
      
      .delivery-summary.cannot-deliver {
        color: #dc3545 !important;
      }
      
      /* Bouton "Donner" - Style unifié Quest */
      .delivery-button {
        width: 100% !important;
        padding: 12px !important;
        border: 1px solid rgba(100, 149, 237, 0.5) !important;
        border-radius: 10px !important;
        font-size: 14px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .delivery-button.can-deliver {
        background: linear-gradient(135deg, #28a745, #20c997) !important;
        color: white !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4) !important;
        border-color: rgba(40, 167, 69, 0.5) !important;
      }
      
      .delivery-button.can-deliver:hover:not(:disabled) {
        background: linear-gradient(135deg, #32b855, #24d3a7) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(40, 167, 69, 0.5) !important;
      }
      
      .delivery-button.cannot-deliver {
        background: rgba(108, 117, 125, 0.5) !important;
        color: #888 !important;
        cursor: not-allowed !important;
        box-shadow: none !important;
        border-color: rgba(108, 117, 125, 0.3) !important;
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
        border-color: rgba(108, 117, 125, 0.2) !important;
      }
      
      /* 🛡️ NOUVEAU: États de livraison avec protection */
      .delivery-button.delivering {
        pointer-events: none !important;
        background: rgba(74, 144, 226, 0.5) !important;
        color: #fff !important;
        animation: deliveryPulse 1.5s ease-in-out infinite !important;
      }
      
      .delivery-button.delivering::after {
        content: "" !important;
        position: absolute !important;
        top: 50% !important;
        left: 20px !important;
        width: 16px !important;
        height: 16px !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        border-top: 2px solid #fff !important;
        border-radius: 50% !important;
        animation: deliverySpin 1s linear infinite !important;
        transform: translateY(-50%) !important;
      }
      
      @keyframes deliveryPulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      
      /* États d'animation */
      .quest-delivery-container.delivering {
        pointer-events: none !important;
        opacity: 0.8 !important;
      }
      
      .quest-delivery-container.error {
        animation: deliveryError 0.5s ease-in-out !important;
      }
      
      @keyframes deliveryError {
        0%, 100% { transform: scale(1) translateX(0); }
        25% { transform: scale(1) translateX(-5px); }
        75% { transform: scale(1) translateX(5px); }
      }
      
      /* Effet de succès */
      .quest-delivery-container.success {
        animation: deliverySuccess 0.8s ease !important;
      }
      
      @keyframes deliverySuccess {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 10px 50px rgba(40, 167, 69, 0.5) !important; }
        100% { transform: scale(1); }
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
    console.log('🎨 [QuestDeliveryOverlay] Styles unifiés avec Quest UI appliqués');
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
          <span class="delivery-icon">📦</span>
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
    
    console.log('🎨 [QuestDeliveryOverlay] Overlay créé avec style unifié');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // 🛡️ PROTECTION: Supprimer anciens event listeners avant d'ajouter nouveaux
    this.removeEventListeners();
    
    // Bouton fermer
    this.closeButtonHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    };
    
    const closeBtn = this.overlayElement.querySelector('#delivery-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.closeButtonHandler);
    }
    
    // 🛡️ Bouton confirmer livraison avec protection double clic
    this.confirmButtonHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 🛡️ Protection contre double clic
      if (this.deliveryState.isDelivering) {
        console.log('🛡️ [QuestDeliveryOverlay] Livraison déjà en cours, ignoré');
        return;
      }
      
      // 🛡️ Protection contre clics trop rapprochés
      const now = Date.now();
      if (now - this.deliveryState.lastDeliveryTime < this.deliveryState.deliveryDebounceTime) {
        const remainingTime = this.deliveryState.deliveryDebounceTime - (now - this.deliveryState.lastDeliveryTime);
        console.log(`🛡️ [QuestDeliveryOverlay] Cooldown actif (${Math.ceil(remainingTime/1000)}s restants)`);
        this.showError(`Veuillez attendre ${Math.ceil(remainingTime/1000)} secondes`);
        return;
      }
      
      this.handleDeliveryConfirm();
    };
    
    const confirmBtn = this.overlayElement.querySelector('#delivery-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', this.confirmButtonHandler);
    }
    
    // Fermer avec Escape
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
    
    // Clic en dehors pour fermer (optionnel)
    this.overlayClickHandler = (e) => {
      if (e.target === this.overlayElement) {
        // this.hide(); // Décommenté si on veut fermer en cliquant dehors
      }
    };
    this.overlayElement.addEventListener('click', this.overlayClickHandler);
    
    console.log('🎛️ [QuestDeliveryOverlay] Événements configurés avec protection');
  }
  
  // 🛡️ NOUVELLE MÉTHODE: Supprimer event listeners pour éviter les doublons
  removeEventListeners() {
    const closeBtn = this.overlayElement?.querySelector('#delivery-close');
    if (closeBtn && this.closeButtonHandler) {
      closeBtn.removeEventListener('click', this.closeButtonHandler);
    }
    
    const confirmBtn = this.overlayElement?.querySelector('#delivery-confirm');
    if (confirmBtn && this.confirmButtonHandler) {
      confirmBtn.removeEventListener('click', this.confirmButtonHandler);
    }
    
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    
    if (this.overlayElement && this.overlayClickHandler) {
      this.overlayElement.removeEventListener('click', this.overlayClickHandler);
    }
  }
  
  // === 📋 MÉTHODES PUBLIQUES MODIFIÉES ===
  
  /**
   * 🆕 MODIFIÉ: Afficher l'overlay de livraison avec capture dialogue
   * @param {Object} deliveryData - Données de livraison depuis le serveur
   */
  show(deliveryData) {
    console.log('🎁 [QuestDeliveryOverlay] Affichage overlay:', deliveryData);
    
    if (!deliveryData || !deliveryData.items || deliveryData.items.length === 0) {
      console.error('❌ [QuestDeliveryOverlay] Données de livraison invalides');
      return false;
    }
    
    // 🆕 NOUVEAU: Capturer référence dialogue AVANT d'afficher l'overlay
    this.captureDialogueReference();
    
    // 🛡️ Reset état de livraison lors de l'affichage
    this.resetDeliveryState();
    
    this.currentDeliveryData = deliveryData;
    this.currentNpcId = deliveryData.npcId;
    
    // Positionner l'overlay intelligemment
    this.positionOverlayIntelligently();
    
    // Afficher
    this.isVisible = true;
    this.overlayElement.classList.add('visible');
    
    // Générer le contenu
    this.renderDeliveryContent(deliveryData);
    
    console.log('✅ [QuestDeliveryOverlay] Overlay affiché avec capture dialogue');
    return true;
  }
  
  /**
   * 🆕 MODIFIÉ: Masquer l'overlay avec fermeture dialogue
   */
  hide() {
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
    }
    
    // 🆕 NOUVEAU: Fermer dialogue associé avec délai
    if (this.dialogueState.dialogueWasOpen) {
      setTimeout(() => {
        this.closeAssociatedDialogue();
      }, this.dialogueState.dialogueCloseDelay);
    }
    
    // Reset état
    this.currentDeliveryData = null;
    this.currentNpcId = null;
    this.isLoading = false;
    
    // 🛡️ Nettoyer timeout de livraison si actif
    if (this.deliveryState.deliveryTimeoutId) {
      clearTimeout(this.deliveryState.deliveryTimeoutId);
      this.deliveryState.deliveryTimeoutId = null;
    }
    
    // Callback fermeture
    if (this.onClose && typeof this.onClose === 'function') {
      this.onClose();
    }
    
    console.log('✅ [QuestDeliveryOverlay] Overlay masqué avec fermeture dialogue programmée');
  }
  
  // 🛡️ NOUVELLE MÉTHODE: Reset état de livraison
  resetDeliveryState() {
    console.log('🔄 [QuestDeliveryOverlay] Reset état de livraison');
    
    if (this.deliveryState.deliveryTimeoutId) {
      clearTimeout(this.deliveryState.deliveryTimeoutId);
      this.deliveryState.deliveryTimeoutId = null;
    }
    
    // Ne pas reset isDelivering et lastDeliveryTime pour garder la protection
    this.deliveryState.deliveryNonce = null;
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
    
    // 🛡️ Mettre à jour bouton avec protection
    this.updateDeliveryButton(canDeliverAll, confirmButton);
    
    console.log(`✅ [QuestDeliveryOverlay] Contenu rendu: ${items.length} objets, peut livrer: ${canDeliverAll}`);
  }
  
  // 🛡️ NOUVELLE MÉTHODE: Mise à jour sécurisée du bouton
  updateDeliveryButton(canDeliverAll, confirmButton) {
    if (!confirmButton) return;
    
    // Vérifier si une livraison est en cours
    const isCurrentlyDelivering = this.deliveryState.isDelivering;
    
    confirmButton.disabled = !canDeliverAll || isCurrentlyDelivering;
    confirmButton.className = 'delivery-button';
    
    if (isCurrentlyDelivering) {
      // État de livraison en cours
      confirmButton.classList.add('delivering');
      confirmButton.textContent = '🔄 Livraison...';
    } else if (canDeliverAll) {
      // Peut livrer
      confirmButton.classList.add('can-deliver');
      confirmButton.textContent = '🎁 Donner Tout';
    } else {
      // Ne peut pas livrer
      confirmButton.classList.add('cannot-deliver');
      confirmButton.textContent = 'Objets Manquants';
    }
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
   * 🛡️ MÉTHODE SÉCURISÉE : Gérer la confirmation de livraison avec protection
   */
  handleDeliveryConfirm() {
    console.log('🎯 [QuestDeliveryOverlay] === DÉBUT CONFIRMATION LIVRAISON SÉCURISÉE ===');
    
    // 🛡️ Vérifications préliminaires
    if (!this.currentDeliveryData || !this.currentNpcId) {
      console.error('❌ [QuestDeliveryOverlay] Pas de données de livraison');
      this.showError('Données de livraison manquantes');
      return;
    }
    
    if (!this.currentDeliveryData.canDeliverAll) {
      console.warn('⚠️ [QuestDeliveryOverlay] Ne peut pas livrer tous les objets');
      this.showError('Vous n\'avez pas tous les objets requis');
      return;
    }
    
    // 🛡️ Protection contre double envoi
    if (this.deliveryState.isDelivering) {
      console.warn('🛡️ [QuestDeliveryOverlay] Livraison déjà en cours');
      return;
    }
    
    // 🛡️ Vérifier cooldown
    const now = Date.now();
    if (now - this.deliveryState.lastDeliveryTime < this.deliveryState.deliveryDebounceTime) {
      const remainingTime = this.deliveryState.deliveryDebounceTime - (now - this.deliveryState.lastDeliveryTime);
      console.warn(`🛡️ [QuestDeliveryOverlay] Cooldown actif: ${remainingTime}ms restants`);
      this.showError(`Veuillez attendre ${Math.ceil(remainingTime/1000)} secondes`);
      return;
    }
    
    // 🛡️ Générer nonce unique pour cette livraison
    this.deliveryState.deliveryNonce = `delivery_${this.currentNpcId}_${this.currentDeliveryData.questId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔐 [QuestDeliveryOverlay] Nonce généré: ${this.deliveryState.deliveryNonce}`);
    
    // 🛡️ Marquer comme en cours de livraison
    this.setDelivering(true);
    
    try {
      // Callback de confirmation
      if (this.onDeliveryConfirm && typeof this.onDeliveryConfirm === 'function') {
        this.onDeliveryConfirm(this.currentDeliveryData, this.currentNpcId);
      }
      
      // Envoyer au serveur via NetworkManager avec nonce
      if (this.networkManager && this.networkManager.sendMessage) {
        const deliveryRequest = {
          npcId: this.currentNpcId,
          questId: this.currentDeliveryData.questId,
          items: this.currentDeliveryData.items.map(item => ({
            itemId: item.itemId,
            required: item.required
          })),
          nonce: this.deliveryState.deliveryNonce, // 🛡️ Nonce pour éviter doubles
          timestamp: Date.now()
        };
        
        console.log('📤 [QuestDeliveryOverlay] Envoi demande livraison:', deliveryRequest);
        this.networkManager.sendMessage('questDelivery', deliveryRequest);
        
        // 🛡️ Timeout de sécurité
        this.deliveryState.deliveryTimeoutId = setTimeout(() => {
          console.warn('⏰ [QuestDeliveryOverlay] Timeout livraison atteint');
          this.setDelivering(false);
          this.showError('Délai d\'attente dépassé');
        }, 10000); // 10 secondes timeout
        
      } else {
        throw new Error('NetworkManager non disponible');
      }
      
      console.log('✅ [QuestDeliveryOverlay] Demande de livraison envoyée avec protection');
      
    } catch (error) {
      console.error('❌ [QuestDeliveryOverlay] Erreur confirmation:', error);
      this.setDelivering(false);
      this.showError(`Erreur lors de la livraison: ${error.message}`);
    }
  }
  
  /**
   * 🛡️ MÉTHODE AMÉLIORÉE : Définir l'état de livraison en cours
   * @param {boolean} isDelivering - État de livraison
   */
  setDelivering(isDelivering) {
    console.log(`🔄 [QuestDeliveryOverlay] setDelivering(${isDelivering})`);
    
    // 🛡️ Mettre à jour état global
    this.deliveryState.isDelivering = isDelivering;
    this.isLoading = isDelivering;
    
    if (isDelivering) {
      // 🛡️ Marquer temps de dernière livraison
      this.deliveryState.lastDeliveryTime = Date.now();
    } else {
      // 🛡️ Nettoyer timeout si livraison terminée
      if (this.deliveryState.deliveryTimeoutId) {
        clearTimeout(this.deliveryState.deliveryTimeoutId);
        this.deliveryState.deliveryTimeoutId = null;
      }
    }
    
    // Interface visuelle
    const container = this.overlayElement.querySelector('.quest-delivery-container');
    const confirmButton = this.overlayElement.querySelector('#delivery-confirm');
    
    if (container) {
      container.classList.toggle('delivering', isDelivering);
    }
    
    if (confirmButton) {
      // 🛡️ Réutiliser la méthode sécurisée de mise à jour du bouton
      const canDeliverAll = this.currentDeliveryData?.canDeliverAll || false;
      this.updateDeliveryButton(canDeliverAll, confirmButton);
    }
  }
  
  /**
   * 🛡️ NOUVELLE MÉTHODE : Recevoir résultat de livraison avec vérification nonce
   * @param {Object} result - Résultat de livraison du serveur
   */
  handleDeliveryResult(result) {
    console.log('📨 [QuestDeliveryOverlay] Résultat de livraison reçu:', result);
    
    // 🛡️ Protection contre double traitement
    if (!this.deliveryState.isDelivering && !this.deliveryState.deliveryNonce) {
      console.warn('🛡️ [QuestDeliveryOverlay] Résultat déjà traité, ignoré');
      return;
    }
    
    // 🛡️ Vérifier nonce si fourni (protection contre réponses multiples)
    if (this.deliveryState.deliveryNonce && result.nonce && result.nonce !== this.deliveryState.deliveryNonce) {
      console.warn('🛡️ [QuestDeliveryOverlay] Nonce invalide, résultat ignoré');
      return;
    }
    
    // 🛡️ Marquer immédiatement comme traité pour éviter double traitement
    const wasDelivering = this.deliveryState.isDelivering;
    const currentNonce = this.deliveryState.deliveryNonce;
    
    // Reset immédiat pour éviter double traitement
    this.deliveryState.isDelivering = false;
    this.deliveryState.deliveryNonce = null;
    
    // Vérifier que c'était bien en cours de livraison
    if (!wasDelivering) {
      console.warn('🛡️ [QuestDeliveryOverlay] Résultat reçu mais pas de livraison en cours');
      return;
    }
    
    console.log('🔄 [QuestDeliveryOverlay] Traitement résultat unique validé');
    
    if (result.success) {
      this.handleDeliverySuccess(result);
    } else {
      this.handleDeliveryError(result);
    }
  }
  
  /**
   * 🆕 MODIFIÉ: Gérer succès de livraison avec fermeture dialogue
   */
  handleDeliverySuccess(result) {
    const message = result.message || 'Objets livrés avec succès !';
    console.log('✅ [QuestDeliveryOverlay] Livraison réussie');
    
    // 🎯 NOUVEAU : Cacher immédiatement l'overlay au lieu d'attendre
    console.log('🚪 [QuestDeliveryOverlay] Fermeture immédiate après succès avec dialogue');
    
    // Animation de succès rapide
    const container = this.overlayElement.querySelector('.quest-delivery-container');
    if (container) {
      container.classList.add('success');
      
      // Réduire l'animation à 300ms au lieu de 800ms
      setTimeout(() => {
        container.classList.remove('success');
      }, 300);
    }
    
    // Notification
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'success', { duration: 4000 });
    }
    
    // 🎯 CHANGEMENT PRINCIPAL : Fermer immédiatement avec dialogue
    setTimeout(() => {
      this.hide(); // 🆕 Cela va maintenant aussi fermer le dialogue
    }, 300); // 300ms au lieu de 2000ms
  }
  
  /**
   * Gérer erreur de livraison
   */
  handleDeliveryError(result) {
    const errorMsg = result.message || result.error || 'Impossible de livrer les objets';
    console.error('❌ [QuestDeliveryOverlay] Livraison échouée:', errorMsg);
    
    this.showError(errorMsg);
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
  
  /**
   * 🛡️ NOUVELLE MÉTHODE : Obtenir état de livraison
   */
  getDeliveryState() {
    return {
      isDelivering: this.deliveryState.isDelivering,
      lastDeliveryTime: this.deliveryState.lastDeliveryTime,
      hasNonce: !!this.deliveryState.deliveryNonce,
      cooldownRemaining: Math.max(0, this.deliveryState.deliveryDebounceTime - (Date.now() - this.deliveryState.lastDeliveryTime))
    };
  }
  
  /**
   * 🆕 NOUVELLE MÉTHODE : Obtenir état dialogue
   */
  getDialogueState() {
    return {
      dialogueWasOpen: this.dialogueState.dialogueWasOpen,
      hasDialogueReference: !!this.dialogueState.dialogueReference,
      shouldCloseDialogue: this.dialogueState.shouldCloseDialogue,
      dialogueCloseDelay: this.dialogueState.dialogueCloseDelay
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestDeliveryOverlay] Destruction...');
    
    // 🛡️ Nettoyer event listeners
    this.removeEventListeners();
    
    // 🛡️ Nettoyer timeout
    if (this.deliveryState.deliveryTimeoutId) {
      clearTimeout(this.deliveryState.deliveryTimeoutId);
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
    
    // 🛡️ Reset état de livraison
    this.deliveryState = {
      isDelivering: false,
      lastDeliveryTime: 0,
      deliveryNonce: null,
      deliveryTimeoutId: null,
      deliveryDebounceTime: 2000
    };
    
    // 🆕 Reset état dialogue
    this.dialogueState = {
      dialogueWasOpen: false,
      dialogueReference: null,
      shouldCloseDialogue: true,
      dialogueCloseDelay: 300
    };
    
    console.log('✅ [QuestDeliveryOverlay] Détruit avec nettoyage complet + dialogue');
  }
}

// === 🧪 NOUVELLES FONCTIONS DEBUG DIALOGUE ===

window.testDeliveryDialogueClose = function() {
  console.log('🧪 Test fermeture dialogue avec delivery...');
  
  // 1. Simuler ouverture dialogue
  console.log('💬 Simulation dialogue ouvert...');
  
  // Créer un faux DialogueManager pour le test
  window.testDialogueManager = {
    isVisible: true,
    visible: true,
    hide: function() {
      this.isVisible = false;
      this.visible = false;
      console.log('✅ [TestDialogue] Dialogue fermé via hide()');
    },
    close: function() {
      this.isVisible = false;
      this.visible = false;
      console.log('✅ [TestDialogue] Dialogue fermé via close()');
    }
  };
  
  // 2. Tester capture
  if (window.questSystem?.deliveryOverlay) {
    const overlay = window.questSystem.deliveryOverlay;
    
    // Temporairement pointer window.dialogueManager vers notre test
    const originalDialogueManager = window.dialogueManager;
    window.dialogueManager = window.testDialogueManager;
    
    // Tester capture
    const captured = overlay.captureDialogueReference();
    console.log('🔍 Capture dialogue:', captured);
    console.log('🔍 État dialogue:', overlay.getDialogueState());
    
    // Tester fermeture
    setTimeout(() => {
      overlay.closeAssociatedDialogue();
      
      // Restaurer
      window.dialogueManager = originalDialogueManager;
      delete window.testDialogueManager;
      
      console.log('✅ Test terminé');
    }, 1000);
    
  } else {
    console.error('❌ QuestDeliveryOverlay non disponible');
  }
};

window.testDeliveryWithDialogue = function() {
  console.log('🧪 Test livraison complète avec dialogue...');
  
  // 1. Simuler dialogue ouvert
  if (!window.testDialogueManager) {
    window.testDialogueManager = {
      isVisible: true,
      hide: () => {
        console.log('✅ [TestDialogue] Fermé automatiquement !');
        window.testDialogueManager.isVisible = false;
      }
    };
    window.dialogueManager = window.testDialogueManager;
  }
  
  // 2. Tester livraison
  if (window.testQuestDeliverySystem) {
    window.testQuestDeliverySystem();
    
    setTimeout(() => {
      console.log('🔍 État dialogue après ouverture overlay:', window.testDialogueManager.isVisible);
      
      // Restaurer après test
      setTimeout(() => {
        delete window.testDialogueManager;
        window.dialogueManager = null;
      }, 5000);
      
    }, 1000);
    
  } else {
    console.error('❌ testQuestDeliverySystem non disponible');
  }
};

window.configureDialogueClosing = function(shouldClose = true, delay = 300) {
  console.log(`🔧 Configuration fermeture dialogue: ${shouldClose}, délai: ${delay}ms`);
  
  if (window.questSystem?.deliveryOverlay) {
    window.questSystem.deliveryOverlay.setDialogueCloseSettings(shouldClose, delay);
    console.log('✅ Configuration appliquée');
  } else {
    console.error('❌ QuestDeliveryOverlay non disponible');
  }
};

console.log('🎁 [QuestDeliveryOverlay] Système avec fermeture dialogue automatique chargé');
console.log('🧪 Tests disponibles:');
console.log('   - window.testDeliveryDialogueClose() - Tester capture/fermeture dialogue');
console.log('   - window.testDeliveryWithDialogue() - Tester livraison complète avec dialogue');
console.log('   - window.configureDialogueClosing(shouldClose, delay) - Configurer fermeture');
console.log('⚙️  Fermeture dialogue par défaut: ACTIVÉE (300ms de délai)');

export default QuestDeliveryOverlay;
