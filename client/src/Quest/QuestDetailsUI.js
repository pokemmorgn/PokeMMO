// client/src/Quest/QuestDetailsUI.js
// 🎯 Interface spécialisée pour afficher les détails d'une quête avant acceptation
// ✅ Support quête unique ou sélection multiple + intégration LocalizationManager

import { t } from '../managers/LocalizationManager.js';

export class QuestDetailsUI {
  constructor(questSystem, optionsManager = null) {
    this.questSystem = questSystem;
    this.optionsManager = optionsManager;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isLoading = false;
    this.overlayElement = null;
    this.currentQuest = null;
    this.currentNpcId = null;
    this.availableQuests = [];
    this.isMultiQuestMode = false;
    
    // === CALLBACKS ===
    this.onQuestAccept = null;
    this.onClose = null;
    this.onQuestSelect = null;
    
    // === LANGUE ===
    this.cleanupLanguageListener = null;
    
    console.log('📋 [QuestDetailsUI] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestDetailsUI] Initialisation...');
      
      this.addStyles();
      this.createInterface();
      this.setupEventListeners();
      this.setupLanguageListener();
      
      console.log('✅ [QuestDetailsUI] Initialisé avec support multilingue');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🌐 GESTION LANGUE ===
  
  setupLanguageListener() {
    if (!this.optionsManager || typeof this.optionsManager.addLanguageListener !== 'function') {
      console.warn('⚠️ [QuestDetailsUI] OptionsManager non disponible pour traductions');
      return;
    }
    
    this.cleanupLanguageListener = this.optionsManager.addLanguageListener((newLang, oldLang) => {
      console.log(`🌐 [QuestDetailsUI] Changement langue: ${oldLang} → ${newLang}`);
      this.updateLanguageTexts();
    });
    
    console.log('📡 [QuestDetailsUI] Listener langue configuré');
  }
  
  updateLanguageTexts() {
    if (!this.overlayElement) return;
    
    console.log('🔄 [QuestDetailsUI] Mise à jour textes');
    
    try {
      // Titre principal
      const title = this.overlayElement.querySelector('.quest-details-title');
      if (title) {
        title.textContent = this.isMultiQuestMode ? 
          t('quest.details.select_title') : 
          t('quest.details.single_title');
      }
      
      // Labels des boutons
      const acceptBtn = this.overlayElement.querySelector('#quest-accept-btn');
      if (acceptBtn) {
        acceptBtn.textContent = t('quest.details.accept_button');
      }
      
      const cancelBtn = this.overlayElement.querySelector('#quest-cancel-btn');
      if (cancelBtn) {
        cancelBtn.textContent = t('quest.details.cancel_button');
      }
      
      // Labels des sections
      const descriptionLabel = this.overlayElement.querySelector('.description-label');
      if (descriptionLabel) {
        descriptionLabel.textContent = t('quest.details.description_label');
      }
      
      const rewardsLabel = this.overlayElement.querySelector('.rewards-label');
      if (rewardsLabel) {
        rewardsLabel.textContent = t('quest.details.rewards_label');
      }
      
      console.log('✅ [QuestDetailsUI] Textes mis à jour');
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur mise à jour langue:', error);
    }
  }
  
  // === 🎨 STYLES ===
  
  addStyles() {
    if (document.querySelector('#quest-details-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-details-ui-styles';
    style.textContent = `
      /* ===== QUEST DETAILS UI STYLES ===== */
      
      /* Overlay principal */
      .quest-details-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.8) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 1100 !important;
        backdrop-filter: blur(5px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
      }
      
      .quest-details-overlay.visible {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Container principal */
      .quest-details-container {
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98)) !important;
        border: 3px solid rgba(100, 149, 237, 0.8) !important;
        border-radius: 20px !important;
        max-width: 600px !important;
        width: 90% !important;
        max-height: 80vh !important;
        color: white !important;
        font-family: 'Arial', sans-serif !important;
        overflow: hidden !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        display: flex !important;
        flex-direction: column !important;
        transform: scale(0.9) !important;
        transition: transform 0.3s ease !important;
      }
      
      .quest-details-overlay.visible .quest-details-container {
        transform: scale(1) !important;
      }
      
      /* Header */
      .quest-details-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important;
        padding: 20px 25px !important;
        border-bottom: 2px solid #357abd !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .quest-details-header::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent) !important;
        animation: headerShimmer 4s infinite !important;
      }
      
      @keyframes headerShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      .quest-details-title {
        font-size: 24px !important;
        font-weight: bold !important;
        margin: 0 !important;
        color: #ffff80 !important;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6) !important;
        z-index: 1 !important;
      }
      
      .quest-details-close {
        background: rgba(220, 53, 69, 0.8) !important;
        border: none !important;
        color: white !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        font-size: 18px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        z-index: 1 !important;
      }
      
      .quest-details-close:hover {
        background: rgba(220, 53, 69, 1) !important;
        transform: scale(1.1) !important;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4) !important;
      }
      
      /* Mode sélection multiple */
      .quest-selection-mode {
        padding: 20px !important;
      }
      
      .quest-selection-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 15px !important;
        max-height: 400px !important;
        overflow-y: auto !important;
      }
      
      .quest-selection-item {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 2px solid transparent !important;
        border-radius: 12px !important;
        padding: 15px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        position: relative !important;
      }
      
      .quest-selection-item:hover {
        background: rgba(100, 149, 237, 0.1) !important;
        border-color: rgba(100, 149, 237, 0.3) !important;
        transform: translateX(5px) !important;
      }
      
      .quest-selection-item.selected {
        border-color: #64b5f6 !important;
        background: rgba(100, 149, 237, 0.2) !important;
      }
      
      .quest-selection-item::before {
        content: '' !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 4px !important;
        background: #4a90e2 !important;
        border-radius: 0 4px 4px 0 !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      
      .quest-selection-item:hover::before,
      .quest-selection-item.selected::before {
        opacity: 1 !important;
      }
      
      .quest-selection-name {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #87ceeb !important;
        margin-bottom: 5px !important;
      }
      
      .quest-selection-preview {
        font-size: 13px !important;
        color: #ccc !important;
        line-height: 1.4 !important;
      }
      
      /* Mode détails unique */
      .quest-details-mode {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        overflow: hidden !important;
      }
      
      .quest-details-content {
        flex: 1 !important;
        padding: 25px !important;
        overflow-y: auto !important;
        background: rgba(0, 0, 0, 0.1) !important;
      }
      
      .quest-loading {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 40px !important;
        text-align: center !important;
      }
      
      .quest-loading-spinner {
        width: 40px !important;
        height: 40px !important;
        border: 4px solid rgba(74, 144, 226, 0.2) !important;
        border-top: 4px solid #4a90e2 !important;
        border-radius: 50% !important;
        animation: questSpin 1s linear infinite !important;
        margin-bottom: 15px !important;
      }
      
      @keyframes questSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .quest-loading-text {
        font-size: 16px !important;
        color: #87ceeb !important;
        margin-bottom: 5px !important;
      }
      
      .quest-loading-subtext {
        font-size: 12px !important;
        color: #ccc !important;
        font-style: italic !important;
      }
      
      /* Contenu de la quête */
      .quest-name {
        font-size: 22px !important;
        font-weight: bold !important;
        color: #ffc107 !important;
        margin-bottom: 20px !important;
        text-align: center !important;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5) !important;
      }
      
      .quest-section {
        margin-bottom: 25px !important;
      }
      
      .quest-section-label {
        font-size: 14px !important;
        font-weight: bold !important;
        color: #4a90e2 !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        margin-bottom: 10px !important;
        border-bottom: 2px solid rgba(74, 144, 226, 0.3) !important;
        padding-bottom: 5px !important;
      }
      
      .quest-description {
        font-size: 15px !important;
        color: #e0e0e0 !important;
        line-height: 1.6 !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 10px !important;
        padding: 15px !important;
        border-left: 4px solid #4a90e2 !important;
      }
      
      .quest-rewards {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
      }
      
      .quest-reward-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        background: rgba(40, 167, 69, 0.1) !important;
        border: 1px solid rgba(40, 167, 69, 0.3) !important;
        border-radius: 8px !important;
        padding: 10px !important;
        transition: all 0.3s ease !important;
      }
      
      .quest-reward-item:hover {
        background: rgba(40, 167, 69, 0.2) !important;
        transform: translateX(3px) !important;
      }
      
      .quest-reward-icon {
        font-size: 20px !important;
        width: 24px !important;
        text-align: center !important;
      }
      
      .quest-reward-text {
        flex: 1 !important;
        font-size: 14px !important;
        color: #28a745 !important;
        font-weight: 500 !important;
      }
      
      .quest-reward-amount {
        font-size: 13px !important;
        color: #87ceeb !important;
        background: rgba(135, 206, 235, 0.2) !important;
        padding: 2px 8px !important;
        border-radius: 10px !important;
        font-weight: bold !important;
      }
      
      /* Status de la quête */
      .quest-status {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 10px !important;
        padding: 15px !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        margin-bottom: 20px !important;
      }
      
      .quest-status.available {
        border-left: 4px solid #28a745 !important;
        background: rgba(40, 167, 69, 0.1) !important;
      }
      
      .quest-status.unavailable {
        border-left: 4px solid #dc3545 !important;
        background: rgba(220, 53, 69, 0.1) !important;
      }
      
      .quest-status-icon {
        font-size: 20px !important;
      }
      
      .quest-status-text {
        font-size: 14px !important;
        font-weight: 500 !important;
      }
      
      .quest-status.available .quest-status-text {
        color: #28a745 !important;
      }
      
      .quest-status.unavailable .quest-status-text {
        color: #dc3545 !important;
      }
      
      /* Footer avec boutons */
      .quest-details-footer {
        background: rgba(0, 0, 0, 0.3) !important;
        padding: 20px 25px !important;
        border-top: 2px solid #357abd !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 15px !important;
      }
      
      .quest-footer-info {
        font-size: 11px !important;
        color: #888 !important;
        font-style: italic !important;
      }
      
      .quest-footer-buttons {
        display: flex !important;
        gap: 15px !important;
      }
      
      .quest-btn {
        padding: 12px 24px !important;
        border: none !important;
        border-radius: 10px !important;
        font-size: 14px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        min-width: 100px !important;
      }
      
      .quest-btn-accept {
        background: linear-gradient(135deg, #28a745, #20c997) !important;
        color: white !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
      }
      
      .quest-btn-accept:hover:not(:disabled) {
        background: linear-gradient(135deg, #32b855, #24d3a7) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4) !important;
      }
      
      .quest-btn-accept:disabled {
        background: rgba(108, 117, 125, 0.5) !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }
      
      .quest-btn-cancel {
        background: rgba(108, 117, 125, 0.8) !important;
        color: #ccc !important;
      }
      
      .quest-btn-cancel:hover {
        background: rgba(108, 117, 125, 1) !important;
        color: white !important;
        transform: translateY(-1px) !important;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .quest-details-container {
          width: 95% !important;
          max-height: 90vh !important;
          border-radius: 15px !important;
        }
        
        .quest-details-header {
          padding: 15px 20px !important;
        }
        
        .quest-details-title {
          font-size: 20px !important;
        }
        
        .quest-details-content {
          padding: 20px !important;
        }
        
        .quest-footer-buttons {
          flex-direction: column !important;
          gap: 10px !important;
        }
        
        .quest-btn {
          width: 100% !important;
        }
      }
      
      /* Scrollbar personnalisée */
      .quest-details-content::-webkit-scrollbar,
      .quest-selection-list::-webkit-scrollbar {
        width: 8px !important;
      }
      
      .quest-details-content::-webkit-scrollbar-track,
      .quest-selection-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 4px !important;
      }
      
      .quest-details-content::-webkit-scrollbar-thumb,
      .quest-selection-list::-webkit-scrollbar-thumb {
        background: rgba(74, 144, 226, 0.6) !important;
        border-radius: 4px !important;
      }
      
      .quest-details-content::-webkit-scrollbar-thumb:hover,
      .quest-selection-list::-webkit-scrollbar-thumb:hover {
        background: rgba(74, 144, 226, 0.8) !important;
      }
      
      /* Animation d'erreur */
      .quest-details-container.error {
        animation: questErrorShake 0.5s ease-in-out !important;
      }
      
      @keyframes questErrorShake {
        0%, 100% { transform: scale(1) translateX(0); }
        25% { transform: scale(1) translateX(-5px); }
        75% { transform: scale(1) translateX(5px); }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [QuestDetailsUI] Styles ajoutés');
  }
  
  // === 🏗️ CRÉATION INTERFACE ===
  
  createInterface() {
    // Supprimer ancien
    const existing = document.querySelector('.quest-details-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'quest-details-overlay';
    
    overlay.innerHTML = `
      <div class="quest-details-container">
        <!-- Header -->
        <div class="quest-details-header">
          <h2 class="quest-details-title">${t('quest.details.single_title')}</h2>
          <button class="quest-details-close" id="quest-details-close">✕</button>
        </div>
        
        <!-- Mode sélection multiple -->
        <div class="quest-selection-mode" id="quest-selection-mode" style="display: none;">
          <div class="quest-selection-list" id="quest-selection-list">
            <!-- Quêtes disponibles générées dynamiquement -->
          </div>
        </div>
        
        <!-- Mode détails unique -->
        <div class="quest-details-mode" id="quest-details-mode">
          <div class="quest-details-content" id="quest-details-content">
            <!-- Contenu généré dynamiquement -->
          </div>
          
          <!-- Footer avec boutons -->
          <div class="quest-details-footer">
            <div class="quest-footer-info">
              💡 ${t('quest.details.footer_tip')}
            </div>
            <div class="quest-footer-buttons">
              <button class="quest-btn quest-btn-cancel" id="quest-cancel-btn">
                ${t('quest.details.cancel_button')}
              </button>
              <button class="quest-btn quest-btn-accept" id="quest-accept-btn" disabled>
                ${t('quest.details.accept_button')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [QuestDetailsUI] Interface créée');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Bouton fermer
    const closeBtn = this.overlayElement.querySelector('#quest-details-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hide();
      });
    }
    
    // Bouton annuler
    const cancelBtn = this.overlayElement.querySelector('#quest-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hide();
      });
    }
    
    // Bouton accepter
    const acceptBtn = this.overlayElement.querySelector('#quest-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleQuestAccept();
      });
    }
    
    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    });
    
    // Clic en dehors pour fermer
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement) {
        this.hide();
      }
    });
    
    console.log('🎛️ [QuestDetailsUI] Événements configurés');
  }
  
  // === 📋 MÉTHODES PUBLIQUES ===
  
  /**
   * Afficher l'interface pour une seule quête
   * @param {string} npcId - ID du NPC
   * @param {string} questId - ID de la quête
   * @param {Object} questData - Données de la quête (optionnel, si déjà récupérées)
   */
  showSingleQuest(npcId, questId, questData = null) {
    console.log(`📋 [QuestDetailsUI] Affichage quête unique: ${questId} pour NPC ${npcId}`);
    
    this.currentNpcId = npcId;
    this.isMultiQuestMode = false;
    this.availableQuests = [];
    
    // Mettre à jour le titre
    const title = this.overlayElement.querySelector('.quest-details-title');
    if (title) {
      title.textContent = t('quest.details.single_title');
    }
    
    // Masquer mode sélection, afficher mode détails
    const selectionMode = this.overlayElement.querySelector('#quest-selection-mode');
    const detailsMode = this.overlayElement.querySelector('#quest-details-mode');
    
    if (selectionMode) selectionMode.style.display = 'none';
    if (detailsMode) detailsMode.style.display = 'flex';
    
    // Afficher
    this.show();
    
    if (questData) {
      // Données déjà disponibles
      this.displayQuestDetails(questData);
    } else {
      // Charger les données
      this.loadQuestDetails(questId);
    }
  }
  
  /**
   * Afficher l'interface pour sélectionner parmi plusieurs quêtes
   * @param {string} npcId - ID du NPC
   * @param {Array} questIds - Liste des IDs de quêtes disponibles
   */
  showMultipleQuests(npcId, questIds) {
    console.log(`📋 [QuestDetailsUI] Affichage sélection multiple: ${questIds.length} quêtes pour NPC ${npcId}`);
    
    this.currentNpcId = npcId;
    this.isMultiQuestMode = true;
    this.availableQuests = questIds;
    this.currentQuest = null;
    
    // Mettre à jour le titre
    const title = this.overlayElement.querySelector('.quest-details-title');
    if (title) {
      title.textContent = t('quest.details.select_title');
    }
    
    // Afficher mode sélection, masquer mode détails
    const selectionMode = this.overlayElement.querySelector('#quest-selection-mode');
    const detailsMode = this.overlayElement.querySelector('#quest-details-mode');
    
    if (selectionMode) selectionMode.style.display = 'block';
    if (detailsMode) detailsMode.style.display = 'none';
    
    // Afficher
    this.show();
    
    // Générer la liste de sélection
    this.generateQuestSelectionList(questIds);
  }
  
  // === 🔄 GESTION DONNÉES ===
  
  async loadQuestDetails(questId) {
    if (!this.questSystem || !this.questSystem.networkManager) {
      console.error('❌ [QuestDetailsUI] NetworkManager non disponible');
      this.showError(t('quest.details.error_network'));
      return;
    }
    
    console.log(`🔄 [QuestDetailsUI] Chargement détails quête: ${questId}`);
    
    this.showLoading();
    
    try {
      // Setup callback temporaire pour recevoir la réponse
      const originalCallback = this.questSystem.networkManager.callbacks.onNpcInteraction;
      
      this.questSystem.networkManager.onNpcInteraction((result) => {
        if (result.type === 'questDetails' && result.questData?.id === questId) {
          // C'est notre réponse
          this.displayQuestDetails(result.questData);
          
          // Restaurer callback original
          this.questSystem.networkManager.onNpcInteraction(originalCallback);
        } else if (originalCallback) {
          // Passer à l'ancien callback
          originalCallback(result);
        }
      });
      
      // Demander les détails
      const success = this.questSystem.networkManager.requestQuestDetails(this.currentNpcId, questId);
      
      if (!success) {
        throw new Error('Échec envoi demande');
      }
      
      // Timeout si pas de réponse
      setTimeout(() => {
        if (this.isLoading) {
          this.showError(t('quest.details.error_timeout'));
          // Restaurer callback
          this.questSystem.networkManager.onNpcInteraction(originalCallback);
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur chargement:', error);
      this.showError(t('quest.details.error_loading'));
    }
  }
  
  async generateQuestSelectionList(questIds) {
    const listContainer = this.overlayElement.querySelector('#quest-selection-list');
    if (!listContainer) return;
    
    // Afficher état de chargement
    listContainer.innerHTML = `
      <div class="quest-loading">
        <div class="quest-loading-spinner"></div>
        <div class="quest-loading-text">${t('quest.details.loading_list')}</div>
      </div>
    `;
    
    try {
      // Charger les détails de toutes les quêtes
      const questDetailsPromises = questIds.map(questId => 
        this.loadQuestBasicInfo(questId)
      );
      
      const questDetails = await Promise.all(questDetailsPromises);
      
      // Générer la liste
      listContainer.innerHTML = questDetails.map((quest, index) => {
        const questId = questIds[index];
        return `
          <div class="quest-selection-item" data-quest-id="${questId}">
            <div class="quest-selection-name">${quest.name || questId}</div>
            <div class="quest-selection-preview">${quest.shortDescription || quest.description || t('quest.details.no_description')}</div>
          </div>
        `;
      }).join('');
      
      // Ajouter les event listeners
      listContainer.querySelectorAll('.quest-selection-item').forEach(item => {
        item.addEventListener('click', () => {
          this.selectQuestFromList(item.dataset.questId);
        });
      });
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur génération liste:', error);
      listContainer.innerHTML = `
        <div class="quest-loading">
          <div style="color: #dc3545; font-size: 16px;">❌</div>
          <div class="quest-loading-text">${t('quest.details.error_loading_list')}</div>
        </div>
      `;
    }
  }
  
  async loadQuestBasicInfo(questId) {
    // Pour l'instant, retourner info basique
    // TODO: Implémenter API pour récupérer info basique sans détails complets
    return {
      name: questId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      shortDescription: t('quest.details.loading_description')
    };
  }
  
  selectQuestFromList(questId) {
    console.log(`📋 [QuestDetailsUI] Sélection quête: ${questId}`);
    
    // Mettre à jour sélection visuelle
    this.overlayElement.querySelectorAll('.quest-selection-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.questId === questId);
    });
    
    // Passer en mode détails
    this.switchToDetailsMode(questId);
  }
  
  switchToDetailsMode(questId) {
    this.isMultiQuestMode = false;
    this.currentQuest = null;
    
    // Mettre à jour titre
    const title = this.overlayElement.querySelector('.quest-details-title');
    if (title) {
      title.textContent = t('quest.details.single_title');
    }
    
    // Changer de mode
    const selectionMode = this.overlayElement.querySelector('#quest-selection-mode');
    const detailsMode = this.overlayElement.querySelector('#quest-details-mode');
    
    if (selectionMode) selectionMode.style.display = 'none';
    if (detailsMode) detailsMode.style.display = 'flex';
    
    // Charger détails
    this.loadQuestDetails(questId);
  }
  
  // === 🎨 AFFICHAGE ===
  
  show() {
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.add('visible');
    }
    
    console.log('✅ [QuestDetailsUI] Interface affichée');
  }
  
  hide() {
    this.isVisible = false;
    this.isLoading = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
    }
    
    // Reset état
    this.currentQuest = null;
    this.currentNpcId = null;
    this.availableQuests = [];
    this.isMultiQuestMode = false;
    
    // Callback fermeture
    if (this.onClose && typeof this.onClose === 'function') {
      this.onClose();
    }
    
    console.log('✅ [QuestDetailsUI] Interface masquée');
  }
  
  showLoading() {
    this.isLoading = true;
    
    const contentContainer = this.overlayElement.querySelector('#quest-details-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="quest-loading">
          <div class="quest-loading-spinner"></div>
          <div class="quest-loading-text">${t('quest.details.loading_quest')}</div>
          <div class="quest-loading-subtext">${t('quest.details.loading_wait')}</div>
        </div>
      `;
    }
    
    // Désactiver bouton accepter
    const acceptBtn = this.overlayElement.querySelector('#quest-accept-btn');
    if (acceptBtn) {
      acceptBtn.disabled = true;
    }
  }
  
  showError(message) {
    this.isLoading = false;
    
    const contentContainer = this.overlayElement.querySelector('#quest-details-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="quest-loading">
          <div style="color: #dc3545; font-size: 32px; margin-bottom: 15px;">❌</div>
          <div class="quest-loading-text" style="color: #dc3545;">${t('quest.details.error_title')}</div>
          <div class="quest-loading-subtext">${message}</div>
        </div>
      `;
    }
    
    // Animation d'erreur
    const container = this.overlayElement.querySelector('.quest-details-container');
    if (container) {
      container.classList.add('error');
      setTimeout(() => {
        container.classList.remove('error');
      }, 500);
    }
    
    // Désactiver bouton accepter
    const acceptBtn = this.overlayElement.querySelector('#quest-accept-btn');
    if (acceptBtn) {
      acceptBtn.disabled = true;
    }
  }
  
  displayQuestDetails(questData) {
    this.isLoading = false;
    this.currentQuest = questData;
    
    console.log('📋 [QuestDetailsUI] Affichage détails:', questData);
    
    const contentContainer = this.overlayElement.querySelector('#quest-details-content');
    if (!contentContainer) return;
    
    const canAccept = questData.canAccept !== false;
    const statusClass = canAccept ? 'available' : 'unavailable';
    const statusIcon = canAccept ? '✅' : '❌';
    const statusText = canAccept ? 
      t('quest.details.status_available') : 
      t('quest.details.status_unavailable');
    
    contentContainer.innerHTML = `
      <!-- Nom de la quête -->
      <div class="quest-name">${questData.name || questData.id}</div>
      
      <!-- Statut -->
      <div class="quest-status ${statusClass}">
        <span class="quest-status-icon">${statusIcon}</span>
        <span class="quest-status-text">${statusText}</span>
      </div>
      
      <!-- Description -->
      <div class="quest-section">
        <div class="quest-section-label description-label">${t('quest.details.description_label')}</div>
        <div class="quest-description">
          ${questData.description || t('quest.details.no_description')}
        </div>
      </div>
      
      <!-- Récompenses -->
      ${questData.rewards && questData.rewards.length > 0 ? `
        <div class="quest-section">
          <div class="quest-section-label rewards-label">${t('quest.details.rewards_label')}</div>
          <div class="quest-rewards">
            ${questData.rewards.map(reward => `
              <div class="quest-reward-item">
                <span class="quest-reward-icon">${this.getRewardIcon(reward.type)}</span>
                <span class="quest-reward-text">${reward.name || reward.type}</span>
                <span class="quest-reward-amount">${reward.amount || 1}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // Activer/désactiver bouton accepter
    const acceptBtn = this.overlayElement.querySelector('#quest-accept-btn');
    if (acceptBtn) {
      acceptBtn.disabled = !canAccept;
    }
  }
  
  getRewardIcon(rewardType) {
    const icons = {
      'gold': '🪙',
      'xp': '⭐',
      'item': '📦',
      'experience': '⭐',
      'money': '🪙',
      'pokemon': '🔴',
      'badge': '🏆'
    };
    
    return icons[rewardType?.toLowerCase()] || '🎁';
  }
  
  // === 🎬 ACTIONS ===
  
  handleQuestAccept() {
    if (!this.currentQuest || !this.currentNpcId) {
      console.error('❌ [QuestDetailsUI] Pas de quête sélectionnée');
      return;
    }
    
    console.log(`🎯 [QuestDetailsUI] Acceptation quête: ${this.currentQuest.id}`);
    
    // Callback d'acceptation
    if (this.onQuestAccept && typeof this.onQuestAccept === 'function') {
      this.onQuestAccept(this.currentQuest.id, this.currentNpcId, this.currentQuest);
    }
    
    // Fermer interface
    this.hide();
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestDetailsUI] Destruction...');
    
    // Cleanup langue
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    // Supprimer DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Supprimer styles
    const styles = document.querySelector('#quest-details-ui-styles');
    if (styles) styles.remove();
    
    // Reset références
    this.overlayElement = null;
    this.currentQuest = null;
    this.currentNpcId = null;
    this.availableQuests = [];
    this.questSystem = null;
    this.optionsManager = null;
    
    // Reset callbacks
    this.onQuestAccept = null;
    this.onClose = null;
    this.onQuestSelect = null;
    
    console.log('✅ [QuestDetailsUI] Détruit');
  }
}

export default QuestDetailsUI;
