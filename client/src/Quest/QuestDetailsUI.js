// client/src/Quest/QuestDetailsUI.js
// 🎯 Interface spécialisée pour afficher les détails d'une quête avant acceptation
// ✅ Support quête unique ou sélection multiple + intégration LocalizationManager
// ✅ NOUVEAU : Récupération données depuis DialogueManager

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
      
      /* Badges d'informations */
      .quest-info-badge {
        display: inline-block !important;
        padding: 4px 8px !important;
        border-radius: 12px !important;
        font-size: 11px !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
      }
      
      .quest-info-badge.category-main {
        background: rgba(255, 193, 7, 0.3) !important;
        color: #ffc107 !important;
      }
      
      .quest-info-badge.category-side {
        background: rgba(40, 167, 69, 0.3) !important;
        color: #28a745 !important;
      }
      
      .quest-info-badge.level {
        background: rgba(74, 144, 226, 0.3) !important;
        color: #4a90e2 !important;
      }
      
      .quest-info-badge.time {
        background: rgba(108, 117, 125, 0.3) !important;
        color: #6c757d !important;
      }
      
      /* Objectifs */
      .quest-objectives {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      
      .quest-objective {
        padding: 8px 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 6px !important;
        border-left: 3px solid #4a90e2 !important;
        font-size: 13px !important;
        position: relative !important;
        padding-left: 30px !important;
      }
      
      .quest-objective:before {
        content: "◦" !important;
        position: absolute !important;
        left: 12px !important;
        color: #4a90e2 !important;
        font-weight: bold !important;
      }
      
      .quest-objective.completed {
        border-left-color: #28a745 !important;
        background: rgba(40, 167, 69, 0.1) !important;
        text-decoration: line-through !important;
        opacity: 0.7 !important;
      }
      
      .quest-objective.completed:before {
        content: "✓" !important;
        color: #28a745 !important;
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
      
      /* Animation d'erreur */
      .quest-details-container.error {
        animation: questErrorShake 0.5s ease-in-out !important;
      }
      
      @keyframes questErrorShake {
        0%, 100% { transform: scale(1) translateX(0); }
        25% { transform: scale(1) translateX(-5px); }
        75% { transform: scale(1) translateX(5px); }
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
      console.log('✅ [QuestDetailsUI] Utilisation données fournies');
      this.displayQuestDetails(questData);
    } else {
      // 🔧 NOUVEAU : Essayer de récupérer depuis DialogueManager d'abord
      console.log('🔍 [QuestDetailsUI] Recherche données quête...');
      const dialogueQuestData = this.getQuestDataFromDialogue(questId);
      
      if (dialogueQuestData) {
        console.log('✅ [QuestDetailsUI] Données trouvées dans DialogueManager');
        this.displayQuestDetails(dialogueQuestData);
      } else {
        // 🔧 NOUVEAU : Générer données par défaut immédiatement
        console.log('⚠️ [QuestDetailsUI] Génération données par défaut');
        const defaultData = this.generateDefaultQuestData(questId);
        this.displayQuestDetails(defaultData);
        
        // Essayer de charger les vraies données en arrière-plan
        this.loadQuestDetailsInBackground(questId);
      }
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
  
  // === 🔄 NOUVELLES MÉTHODES : RÉCUPÉRATION DONNÉES ===
  
  /**
   * 🔧 NOUVELLE MÉTHODE : Récupérer données quête depuis DialogueManager
   */
  getQuestDataFromDialogue(questId) {
    console.log(`🔍 [QuestDetailsUI] Recherche données pour quête: ${questId}`);
    
    // 🔧 DEBUG COMPLET pour voir ce qui est disponible
    console.log('🔍 [QuestDetailsUI] === DEBUG SOURCES DONNÉES ===');
    console.log('window.dialogueManager exists:', !!window.dialogueManager);
    console.log('window.dialogueManager.currentDialogueData:', window.dialogueManager?.currentDialogueData);
    console.log('window._lastNpcInteractionData:', window._lastNpcInteractionData);
    
    // 1. Priorité 1 : Vérifier dans window.dialogueManager
    if (window.dialogueManager && window.dialogueManager.currentDialogueData) {
      const dialogueData = window.dialogueManager.currentDialogueData;
      console.log('🔍 [QuestDetailsUI] DialogueManager data found:', dialogueData);
      
      // Chercher dans availableQuests à la racine
      if (dialogueData.availableQuests && Array.isArray(dialogueData.availableQuests)) {
        console.log('🔍 [QuestDetailsUI] Recherche dans dialogueData.availableQuests:', dialogueData.availableQuests);
        const questData = dialogueData.availableQuests.find(q => q.id === questId);
        if (questData) {
          console.log('✅ [QuestDetailsUI] Quête trouvée dans dialogueManager.availableQuests');
          return this.enrichQuestData(questData);
        }
      }
      
      // Chercher dans questData
      if (dialogueData.questData && dialogueData.questData.availableQuests) {
        console.log('🔍 [QuestDetailsUI] Recherche dans dialogueData.questData.availableQuests');
        const questData = dialogueData.questData.availableQuests.find(q => q.id === questId);
        if (questData) {
          console.log('✅ [QuestDetailsUI] Quête trouvée dans dialogueManager.questData');
          return this.enrichQuestData(questData);
        }
      }
      
      // Chercher dans unifiedInterface
      if (dialogueData.unifiedInterface && dialogueData.unifiedInterface.questData) {
        console.log('🔍 [QuestDetailsUI] Recherche dans unifiedInterface.questData');
        const questData = dialogueData.unifiedInterface.questData.availableQuests?.find(q => q.id === questId);
        if (questData) {
          console.log('✅ [QuestDetailsUI] Quête trouvée dans unifiedInterface');
          return this.enrichQuestData(questData);
        }
      }
    }
    
    // 2. Priorité 2 : Vérifier dans window._lastNpcInteractionData
    if (window._lastNpcInteractionData) {
      console.log('🔍 [QuestDetailsUI] Recherche dans _lastNpcInteractionData:', window._lastNpcInteractionData);
      const data = window._lastNpcInteractionData;
      
      if (data.availableQuests && Array.isArray(data.availableQuests)) {
        console.log('🔍 [QuestDetailsUI] _lastNpcInteractionData.availableQuests:', data.availableQuests);
        const questData = data.availableQuests.find(q => q.id === questId);
        if (questData) {
          console.log('✅ [QuestDetailsUI] Quête trouvée dans _lastNpcInteractionData');
          return this.enrichQuestData(questData);
        }
      }
    }
    
    // 🔧 3. NOUVEAU : Vérifier dans les actions du DialogueManager
    if (window.dialogueManager && window.dialogueManager.classicState && window.dialogueManager.classicState.actions) {
      console.log('🔍 [QuestDetailsUI] Recherche dans classicState.actions');
      const questAction = window.dialogueManager.classicState.actions.find(action => 
        action.type === 'quest' && action.questId === questId
      );
      
      if (questAction && questAction.data) {
        console.log('✅ [QuestDetailsUI] Données trouvées dans action quête');
        return this.enrichQuestData(questAction.data);
      }
    }
    
    console.log('❌ [QuestDetailsUI] Aucune donnée trouvée pour la quête');
    return null;
  }
  
  /**
   * 🔧 NOUVELLE MÉTHODE : Enrichir les données de quête
   */
  enrichQuestData(baseQuestData) {
    console.log('🔧 [QuestDetailsUI] Enrichissement données:', baseQuestData);
    
    // 🔧 EXTRACTION ROBUSTE du nom
    let questName = baseQuestData.name || baseQuestData.title || baseQuestData.questName || baseQuestData.questTitle;
    
    // Si pas de nom, essayer d'extraire depuis l'ID
    if (!questName && baseQuestData.id) {
      questName = baseQuestData.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Nom par défaut
    if (!questName) {
      questName = `Quête ${baseQuestData.id || 'Inconnue'}`;
    }
    
    const enrichedData = {
      id: baseQuestData.id || 'unknown_quest',
      name: questName,
      description: baseQuestData.description || baseQuestData.questDescription || 'Découvrez les détails de cette quête en l\'acceptant !',
      
      // Status et availabilité
      canAccept: baseQuestData.canAccept !== false,
      status: baseQuestData.status || 'available',
      
      // Récompenses (améliorer selon les données disponibles)
      rewards: baseQuestData.rewards || [
        { type: 'xp', name: 'Expérience', amount: 100 },
        { type: 'gold', name: 'Or', amount: 50 },
        { type: 'item', name: 'Objet Mystère', amount: 1 }
      ],
      
      // Métadonnées
      category: baseQuestData.category || 'side',
      level: baseQuestData.level || 1,
      estimatedTime: baseQuestData.estimatedTime || '15 minutes',
      
      // Objectifs (améliorer)
      objectives: baseQuestData.objectives || [
        { description: 'Accepter la quête pour découvrir les objectifs', completed: false },
        { description: 'Suivre les instructions du PNJ', completed: false }
      ]
    };
    
    console.log('✅ [QuestDetailsUI] Données enrichies:', enrichedData);
    return enrichedData;
  }
  
  /**
   * 🔧 NOUVELLE MÉTHODE : Générer données par défaut
   */
  generateDefaultQuestData(questId) {
    console.log(`🔧 [QuestDetailsUI] Génération données par défaut pour: ${questId}`);
    
    // Extraire le nom depuis l'ID si possible
    let questName = questId;
    if (typeof questId === 'string') {
      questName = questId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Descriptions spéciales selon l'ID
    let description = 'Découvrez les détails de cette quête passionnante !';
    let objectives = [
      { description: 'Parler au PNJ pour obtenir plus d\'informations', completed: false },
      { description: 'Accepter la quête pour révéler les objectifs', completed: false }
    ];
    
    // 🔧 PERSONNALISATION selon l'ID de quête
    if (questId && questId.toLowerCase().includes('gardening')) {
      description = 'Annie a perdu ses gants de jardinage près de la rivière. Aidez-la à les retrouver !';
      objectives = [
        { description: 'Chercher les gants près de la rivière sud-ouest', completed: false },
        { description: 'Rapporter les gants à Annie', completed: false }
      ];
    } else if (questId && questId.toLowerCase().includes('lost')) {
      description = 'Un objet important a été perdu. Votre aide est requise pour le retrouver.';
      objectives = [
        { description: 'Enquêter sur la disparition', completed: false },
        { description: 'Retrouver l\'objet perdu', completed: false }
      ];
    }
    
    const defaultData = {
      id: questId,
      name: questName,
      description: description,
      canAccept: true,
      status: 'available',
      rewards: [
        { type: 'xp', name: 'Points d\'expérience', amount: 150 },
        { type: 'gold', name: 'Pièces d\'or', amount: 75 },
        { type: 'item', name: 'Objet de quête', amount: 1 }
      ],
      category: 'side',
      level: 1,
      estimatedTime: '10-20 minutes',
      objectives: objectives
    };
    
    console.log('✅ [QuestDetailsUI] Données par défaut générées:', defaultData);
    return defaultData;
  }
  
  /**
   * 🔧 NOUVELLE MÉTHODE : Chargement en arrière-plan (optionnel)
   */
  loadQuestDetailsInBackground(questId) {
    console.log(`🔄 [QuestDetailsUI] Chargement arrière-plan pour: ${questId}`);
    
    // Essayer de charger via le NetworkManager après un délai
    setTimeout(() => {
      if (this.questSystem && this.questSystem.networkManager) {
        console.log('🔄 [QuestDetailsUI] Tentative chargement réseau différé...');
        try {
          this.loadQuestDetails(questId);
        } catch (error) {
          console.log('⚠️ [QuestDetailsUI] Chargement différé échoué (normal):', error.message);
        }
      }
    }, 1000);
  }
  
  // === 🔄 GESTION DONNÉES (méthodes existantes modifiées) ===
  
  async loadQuestDetails(questId) {
    if (!this.questSystem || !this.questSystem.networkManager) {
      console.error('❌ [QuestDetailsUI] NetworkManager non disponible');
      this.showError('Erreur réseau - NetworkManager non disponible');
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
          this.showError('Timeout - Pas de réponse du serveur');
          // Restaurer callback
          this.questSystem.networkManager.onNpcInteraction(originalCallback);
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur chargement:', error);
      this.showError('Erreur lors du chargement');
    }
  }
  
  async generateQuestSelectionList(questIds) {
    const listContainer = this.overlayElement.querySelector('#quest-selection-list');
    if (!listContainer) return;
    
    // Afficher état de chargement
    listContainer.innerHTML = `
      <div class="quest-loading">
        <div class="quest-loading-spinner"></div>
        <div class="quest-loading-text">Chargement des quêtes...</div>
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
            <div class="quest-selection-preview">${quest.shortDescription || quest.description || 'Pas de description'}</div>
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
          <div class="quest-loading-text">Erreur chargement liste</div>
        </div>
      `;
    }
  }
  
  async loadQuestBasicInfo(questId) {
    // Pour l'instant, retourner info basique
    // TODO: Implémenter API pour récupérer info basique sans détails complets
    return {
      name: questId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      shortDescription: 'Chargement description...'
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
          <div class="quest-loading-text">Chargement de la quête...</div>
          <div class="quest-loading-subtext">Patientez quelques instants...</div>
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
          <div class="quest-loading-text" style="color: #dc3545;">Erreur</div>
          <div class="quest-loading-subtext">${message}</div>
          <button onclick="this.closest('.quest-details-overlay').querySelector('#quest-details-close').click()" 
                  style="margin-top: 15px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Fermer
          </button>
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
    console.log('📋 [QuestDetailsUI] Affichage détails:', questData);
    
    // 🔧 PROTECTION contre les données invalides
    if (!questData || typeof questData !== 'object') {
      console.error('❌ [QuestDetailsUI] Données quête invalides:', questData);
      this.showError('Données de quête invalides');
      return;
    }
    
    this.isLoading = false;
    this.currentQuest = questData;
    
    const contentContainer = this.overlayElement.querySelector('#quest-details-content');
    if (!contentContainer) {
      console.error('❌ [QuestDetailsUI] Container de contenu non trouvé');
      return;
    }
    
    try {
      const canAccept = questData.canAccept !== false;
      const statusClass = canAccept ? 'available' : 'unavailable';
      const statusIcon = canAccept ? '✅' : '❌';
      const statusText = canAccept ? 'Disponible' : 'Non disponible';
      
      contentContainer.innerHTML = `
        <!-- Nom de la quête -->
        <div class="quest-name">${questData.name || 'Quête sans nom'}</div>
        
        <!-- Statut -->
        <div class="quest-status ${statusClass}">
          <span class="quest-status-icon">${statusIcon}</span>
          <span class="quest-status-text">${statusText}</span>
        </div>
        
        <!-- Informations générales -->
        <div class="quest-section">
          <div class="quest-section-label">Informations</div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
            <span class="quest-info-badge category-${questData.category || 'side'}">${(questData.category || 'SIDE').toUpperCase()}</span>
            <span class="quest-info-badge level">Niveau ${questData.level || 1}</span>
            <span class="quest-info-badge time">⏱️ ${questData.estimatedTime || '15 min'}</span>
          </div>
        </div>
        
        <!-- Description -->
        <div class="quest-section">
          <div class="quest-section-label">Description</div>
          <div class="quest-description">
            ${questData.description || 'Description non disponible'}
          </div>
        </div>
        
        <!-- Objectifs -->
        ${questData.objectives && questData.objectives.length > 0 ? `
          <div class="quest-section">
            <div class="quest-section-label">Objectifs</div>
            <div class="quest-objectives">
              ${questData.objectives.map(objective => `
                <div class="quest-objective ${objective.completed ? 'completed' : ''}">
                  ${objective.description || 'Objectif non défini'}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Récompenses -->
        ${questData.rewards && questData.rewards.length > 0 ? `
          <div class="quest-section">
            <div class="quest-section-label">Récompenses</div>
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
      
      console.log('✅ [QuestDetailsUI] Détails affichés avec succès');
      
    } catch (error) {
      console.error('❌ [QuestDetailsUI] Erreur affichage détails:', error);
      this.showError('Erreur lors de l\'affichage des détails');
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

// === 🧪 FONCTIONS DEBUG ===

// 🧪 FONCTION DEBUG : Vérifier les données disponibles
window.debugQuestData = function(questId = 'lost_gardening_gloves') {
  console.log('🔍 === DEBUG QUEST DATA ===');
  console.log('Quest ID recherché:', questId);
  
  console.log('=== SOURCES DISPONIBLES ===');
  console.log('1. window.dialogueManager:', !!window.dialogueManager);
  if (window.dialogueManager) {
    console.log('   - currentDialogueData:', window.dialogueManager.currentDialogueData);
    console.log('   - classicState.actions:', window.dialogueManager.classicState?.actions);
  }
  
  console.log('2. window._lastNpcInteractionData:', window._lastNpcInteractionData);
  
  console.log('3. window.questSystem:', !!window.questSystem);
  if (window.questSystem) {
    console.log('   - detailsUI:', !!window.questSystem.detailsUI);
  }
  
  // Tester la récupération
  if (window.questSystem && window.questSystem.detailsUI) {
    console.log('=== TEST RÉCUPÉRATION ===');
    const questData = window.questSystem.detailsUI.getQuestDataFromDialogue(questId);
    console.log('Données récupérées:', questData);
  }
  
  return {
    hasDialogueManager: !!window.dialogueManager,
    hasLastNpcData: !!window._lastNpcInteractionData,
    hasQuestSystem: !!window.questSystem,
    questId: questId
  };
};

// 🧪 FONCTION TEST : Forcer l'ouverture avec données de test
window.forceTestQuestDetails = function() {
  console.log('🧪 Test forcé QuestDetailsUI...');
  
  // Créer des données de test
  const testQuestData = {
    id: 'lost_gardening_gloves',
    name: 'The Lost Gardening Gloves',
    description: 'Annie, une résidente âgée de la Route 1, a égaré ses gants de jardinage en cueillant des baies près de la rivière sud-ouest. Sans eux, elle ne peut pas s\'occuper de ses plantes et craint que les Pokémon sauvages locaux ne les prennent.',
    canAccept: true,
    status: 'available',
    category: 'side',
    level: 1,
    estimatedTime: '15-20 minutes',
    rewards: [
      { type: 'xp', name: 'Points d\'expérience', amount: 200 },
      { type: 'gold', name: 'Pièces d\'or', amount: 100 },
      { type: 'item', name: 'Potion', amount: 2 }
    ],
    objectives: [
      { description: 'Chercher les gants près de la rivière sud-ouest', completed: false },
      { description: 'Éviter les Pokémon sauvages dans la zone', completed: false },
      { description: 'Rapporter les gants à Annie', completed: false }
    ]
  };
  
  // Stocker dans les sources de données
  window._lastNpcInteractionData = {
    npcId: 'annie_npc',
    npcName: 'Annie',
    availableQuests: [testQuestData]
  };
  
  if (window.dialogueManager) {
    window.dialogueManager.currentDialogueData = {
      npcId: 'annie_npc',
      name: 'Annie',
      availableQuests: [testQuestData]
    };
  }
  
  // Ouvrir le QuestDetailsUI
  if (window.questSystem && window.questSystem.detailsUI) {
    window.questSystem.detailsUI.showSingleQuest('annie_npc', 'lost_gardening_gloves', testQuestData);
    console.log('✅ QuestDetailsUI ouvert avec données de test');
  } else {
    console.error('❌ QuestDetailsUI non disponible');
  }
};

// 🧪 FONCTION TEST : Simuler dialogue complet avec quête
window.testFullQuestFlow = function() {
  console.log('🧪 Test flux complet dialogue → quête...');
  
  // Étape 1 : Simuler dialogue avec quête
  if (window.dialogueManager) {
    const dialogueData = {
      npcId: 'annie_test',
      name: 'Annie',
      lines: ['J\'ai une tâche pour vous, dresseur !', 'Souhaitez-vous m\'aider ?'],
      capabilities: ['questGiver'],
      availableQuests: [
        {
          id: 'lost_gardening_gloves',
          name: 'The Lost Gardening Gloves',
          description: 'Retrouvez mes gants de jardinage perdus près de la rivière.',
          canAccept: true,
          rewards: [
            { type: 'xp', name: 'Expérience', amount: 200 },
            { type: 'gold', name: 'Or', amount: 100 }
          ]
        }
      ]
    };
    
    console.log('🎭 Ouverture dialogue avec quête...');
    window.dialogueManager.show(dialogueData);
    
    setTimeout(() => {
      console.log('💡 Cliquez sur le bouton "! The Lost Gardening Gloves" pour tester !');
    }, 1000);
    
  } else {
    console.error('❌ DialogueManager non disponible');
  }
};

console.log('🧪 === FONCTIONS DEBUG QUEST AJOUTÉES ===');
console.log('📋 window.debugQuestData() - Debug sources de données');
console.log('🎯 window.forceTestQuestDetails() - Test forcé avec données');
console.log('🎭 window.testFullQuestFlow() - Test flux complet dialogue→quête');

export default QuestDetailsUI;
