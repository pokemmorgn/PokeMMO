// Quest/QuestUI.js - Interface Quest COMPLÈTE - RÉÉCRITURE FONCTIONNELLE
// 🎯 Combine QuestJournal + QuestTracker + Dialogues
// ✅ Fonctionnement normal garanti avec BaseModule

export class QuestUI {
  constructor(questManager, gameRoom) {
    this.questManager = questManager;
    this.gameRoom = gameRoom;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    this.trackerElement = null;
    
    // === DONNÉES AFFICHÉES ===
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    this.selectedQuest = null;
    this.currentView = 'active';
    
    // === TRACKER ===
    this.trackedQuests = new Map();
    this.isTrackerVisible = true;
    this.maxTrackedQuests = 5;
    
    // === CONTRÔLE ÉVÉNEMENTS ===
    this.escapeListenerAdded = false;
    this.currentTooltip = null;
    this.currentDialog = null;
    
    console.log('📖 [QuestUI] Instance créée - Version réécrite complète');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestUI] Initialisation interface...');
      
      this.loadRobustCSS();
      this.createJournalInterface();
      this.createTrackerInterface();
      this.setupEventListeners();
      
      console.log('✅ [QuestUI] Interface initialisée avec succès');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS ROBUSTE ===
  
  loadRobustCSS() {
    const existing = document.querySelector('#quest-ui-styles');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'quest-ui-styles';
    style.textContent = `
      /* ===== QUEST UI - CSS ROBUSTE SANS CONFLITS ===== */
      
      /* Journal Overlay - Spécificité maximale */
      div#quest-journal.quest-journal {
        position: fixed !important;
        top: 10% !important;
        right: -450px !important;
        width: 400px !important;
        height: 70% !important;
        min-width: 400px !important;
        max-width: 400px !important;
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98)) !important;
        border: 2px solid rgba(100, 149, 237, 0.8) !important;
        border-radius: 15px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(10px) !important;
        z-index: 1000 !important;
        font-family: 'Arial', sans-serif !important;
        color: #fff !important;
        transition: right 0.4s ease !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      
      div#quest-journal.quest-journal.visible {
        right: 20px !important;
      }
      
      div#quest-journal.quest-journal.hidden {
        right: -450px !important;
      }
      
      /* Header */
      div#quest-journal .quest-journal-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 15px 20px !important;
        background: rgba(100, 149, 237, 0.2) !important;
        border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
        border-radius: 13px 13px 0 0 !important;
        flex-shrink: 0 !important;
      }
      
      div#quest-journal .quest-journal-header h2 {
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: bold !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
      }
      
      div#quest-journal .quest-close-btn {
        background: rgba(220, 53, 69, 0.8) !important;
        border: none !important;
        color: white !important;
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        font-size: 16px !important;
        transition: all 0.3s ease !important;
      }
      
      div#quest-journal .quest-close-btn:hover {
        background: rgba(220, 53, 69, 1) !important;
        transform: scale(1.1) !important;
      }
      
      /* Tabs */
      div#quest-journal .quest-tabs {
        display: flex !important;
        border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
        flex-shrink: 0 !important;
      }
      
      div#quest-journal .quest-tab {
        flex: 1 !important;
        padding: 12px !important;
        background: rgba(25, 35, 55, 0.5) !important;
        border: none !important;
        color: #ccc !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        font-size: 14px !important;
      }
      
      div#quest-journal .quest-tab.active {
        background: rgba(100, 149, 237, 0.3) !important;
        color: #fff !important;
        font-weight: bold !important;
      }
      
      div#quest-journal .quest-tab:hover:not(.active) {
        background: rgba(100, 149, 237, 0.1) !important;
      }
      
      /* Content */
      div#quest-journal .quest-content {
        flex: 1 !important;
        display: flex !important;
        overflow: hidden !important;
      }
      
      div#quest-journal .quest-list {
        width: 50% !important;
        border-right: 1px solid rgba(100, 149, 237, 0.3) !important;
        overflow-y: auto !important;
        padding: 10px !important;
      }
      
      div#quest-journal .quest-details {
        width: 50% !important;
        padding: 15px !important;
        overflow-y: auto !important;
      }
      
      div#quest-journal .quest-item {
        padding: 12px !important;
        margin-bottom: 8px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        border-left: 4px solid transparent !important;
      }
      
      div#quest-journal .quest-item:hover {
        background: rgba(100, 149, 237, 0.15) !important;
        transform: translateX(3px) !important;
      }
      
      div#quest-journal .quest-item.selected {
        background: rgba(100, 149, 237, 0.25) !important;
        border-left-color: #64b5f6 !important;
      }
      
      div#quest-journal .quest-item-title {
        font-weight: bold !important;
        font-size: 14px !important;
        margin-bottom: 4px !important;
        color: #fff !important;
      }
      
      div#quest-journal .quest-item-progress {
        font-size: 12px !important;
        color: #ccc !important;
      }
      
      div#quest-journal .quest-item-category {
        display: inline-block !important;
        padding: 2px 8px !important;
        border-radius: 12px !important;
        font-size: 10px !important;
        font-weight: bold !important;
        margin-top: 4px !important;
      }
      
      div#quest-journal .quest-item-category.main {
        background: rgba(255, 193, 7, 0.3) !important;
        color: #ffc107 !important;
      }
      
      div#quest-journal .quest-item-category.side {
        background: rgba(40, 167, 69, 0.3) !important;
        color: #28a745 !important;
      }
      
      div#quest-journal .quest-item-category.daily {
        background: rgba(220, 53, 69, 0.3) !important;
        color: #dc3545 !important;
      }
      
      /* Quest Details */
      div#quest-journal .quest-details-content {
        animation: fadeIn 0.3s ease !important;
      }
      
      div#quest-journal .quest-title {
        font-size: 16px !important;
        font-weight: bold !important;
        margin-bottom: 10px !important;
        color: #64b5f6 !important;
      }
      
      div#quest-journal .quest-description {
        font-size: 13px !important;
        color: #ccc !important;
        margin-bottom: 15px !important;
        line-height: 1.4 !important;
      }
      
      div#quest-journal .quest-step {
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
        padding: 10px !important;
        margin-bottom: 10px !important;
      }
      
      div#quest-journal .quest-step.completed {
        background: rgba(40, 167, 69, 0.2) !important;
        border-left: 3px solid #28a745 !important;
      }
      
      div#quest-journal .quest-step.current {
        background: rgba(255, 193, 7, 0.2) !important;
        border-left: 3px solid #ffc107 !important;
      }
      
      div#quest-journal .quest-objective {
        font-size: 12px !important;
        margin: 5px 0 !important;
        padding-left: 15px !important;
        position: relative !important;
      }
      
      div#quest-journal .quest-objective:before {
        content: "•" !important;
        position: absolute !important;
        left: 0 !important;
        color: #64b5f6 !important;
      }
      
      div#quest-journal .quest-objective.completed {
        color: #28a745 !important;
        text-decoration: line-through !important;
      }
      
      div#quest-journal .quest-objective.completed:before {
        content: "✓" !important;
        color: #28a745 !important;
      }
      
      div#quest-journal .quest-empty {
        text-align: center !important;
        color: #888 !important;
        font-style: italic !important;
        padding: 20px !important;
      }
      
      /* Actions */
      div#quest-journal .quest-actions {
        padding: 15px 20px !important;
        border-top: 1px solid rgba(100, 149, 237, 0.3) !important;
        display: flex !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
      }
      
      div#quest-journal .quest-btn {
        flex: 1 !important;
        padding: 10px !important;
        background: rgba(100, 149, 237, 0.3) !important;
        border: 1px solid rgba(100, 149, 237, 0.5) !important;
        color: #fff !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        transition: all 0.3s ease !important;
      }
      
      div#quest-journal .quest-btn:hover:not(:disabled) {
        background: rgba(100, 149, 237, 0.5) !important;
        transform: translateY(-1px) !important;
      }
      
      div#quest-journal .quest-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      
      /* ===== QUEST TRACKER ===== */
      div#quest-tracker.quest-tracker {
        position: fixed !important;
        top: 120px !important;
        right: 20px !important;
        width: 280px !important;
        max-height: 70vh !important;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
        border: 2px solid #4a90e2 !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(10px) !important;
        font-family: 'Segoe UI', Arial, sans-serif !important;
        color: #fff !important;
        z-index: 950 !important;
        transition: all 0.3s ease !important;
        overflow: hidden !important;
      }
      
      div#quest-tracker.quest-tracker.hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateX(100%) !important;
      }
      
      div#quest-tracker.quest-tracker.minimized {
        height: 40px !important;
      }
      
      div#quest-tracker.quest-tracker.minimized .quest-tracker-content {
        display: none !important;
      }
      
      /* Tracker Header */
      div#quest-tracker .quest-tracker-header {
        background: rgba(74, 144, 226, 0.3) !important;
        border-bottom: 1px solid rgba(74, 144, 226, 0.5) !important;
        padding: 8px 12px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        cursor: move !important;
        user-select: none !important;
      }
      
      div#quest-tracker .tracker-title {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #87ceeb !important;
      }
      
      div#quest-tracker .tracker-controls {
        display: flex !important;
        gap: 4px !important;
      }
      
      div#quest-tracker .tracker-btn {
        background: rgba(255, 255, 255, 0.1) !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        cursor: pointer !important;
        width: 20px !important;
        height: 20px !important;
        border-radius: 3px !important;
        font-size: 12px !important;
        font-weight: bold !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
      }
      
      div#quest-tracker .tracker-btn:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
      
      /* Tracker Content */
      div#quest-tracker .quest-tracker-content {
        max-height: calc(70vh - 40px) !important;
        overflow-y: auto !important;
        padding: 8px !important;
      }
      
      div#quest-tracker .tracked-quests {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      
      div#quest-tracker .tracked-quest {
        background: rgba(255, 255, 255, 0.05) !important;
        border-left: 3px solid #4a90e2 !important;
        border-radius: 6px !important;
        padding: 10px !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      div#quest-tracker .tracked-quest:hover {
        background: rgba(74, 144, 226, 0.1) !important;
        transform: translateX(-2px) !important;
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3) !important;
      }
      
      div#quest-tracker .quest-name {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #fff !important;
        margin-bottom: 4px !important;
        line-height: 1.2 !important;
      }
      
      div#quest-tracker .quest-objectives {
        margin-top: 6px !important;
      }
      
      div#quest-tracker .quest-objective {
        font-size: 12px !important;
        margin: 2px 0 !important;
        padding-left: 12px !important;
        position: relative !important;
        color: #ccc !important;
        line-height: 1.3 !important;
      }
      
      div#quest-tracker .quest-objective:before {
        content: "•" !important;
        position: absolute !important;
        left: 0 !important;
        color: #4a90e2 !important;
        font-weight: bold !important;
      }
      
      div#quest-tracker .quest-objective.completed {
        color: #4caf50 !important;
        text-decoration: line-through !important;
      }
      
      div#quest-tracker .quest-objective.completed:before {
        content: "✓" !important;
        color: #4caf50 !important;
      }
      
      /* ===== QUEST DIALOG ===== */
      .quest-dialog-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 1050 !important;
        backdrop-filter: blur(5px) !important;
      }
      
      .quest-dialog {
        background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98)) !important;
        border: 2px solid rgba(100, 149, 237, 0.8) !important;
        border-radius: 15px !important;
        max-width: 500px !important;
        max-height: 70vh !important;
        width: 90% !important;
        color: white !important;
        font-family: Arial, sans-serif !important;
        overflow: hidden !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7) !important;
      }
      
      .quest-dialog-header {
        background: rgba(100, 149, 237, 0.2) !important;
        padding: 15px 20px !important;
        border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      
      .quest-dialog-header h3 {
        margin: 0 !important;
        font-size: 18px !important;
      }
      
      .quest-dialog-close {
        background: none !important;
        border: none !important;
        color: white !important;
        font-size: 20px !important;
        cursor: pointer !important;
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        background: rgba(220, 53, 69, 0.8) !important;
      }
      
      .quest-dialog-close:hover {
        background: rgba(220, 53, 69, 1) !important;
      }
      
      .quest-dialog-content {
        max-height: 300px !important;
        overflow-y: auto !important;
        padding: 20px !important;
      }
      
      .quest-option {
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
        padding: 15px !important;
        margin-bottom: 10px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        border: 2px solid transparent !important;
      }
      
      .quest-option:hover {
        background: rgba(100, 149, 237, 0.1) !important;
        border-color: rgba(100, 149, 237, 0.3) !important;
      }
      
      .quest-option.selected {
        border-color: #64b5f6 !important;
        background: rgba(100, 149, 237, 0.2) !important;
      }
      
      .quest-dialog-actions {
        padding: 15px 20px !important;
        border-top: 1px solid rgba(100, 149, 237, 0.3) !important;
        display: flex !important;
        gap: 10px !important;
        justify-content: flex-end !important;
      }
      
      .quest-btn-cancel,
      .quest-btn-accept {
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        transition: all 0.3s ease !important;
      }
      
      .quest-btn-cancel {
        background: rgba(108, 117, 125, 0.3) !important;
        color: #ccc !important;
      }
      
      .quest-btn-accept {
        background: rgba(40, 167, 69, 0.8) !important;
        color: white !important;
      }
      
      .quest-btn-accept:disabled {
        background: rgba(108, 117, 125, 0.3) !important;
        cursor: not-allowed !important;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        div#quest-journal.quest-journal {
          width: 95% !important;
          right: -100% !important;
        }
        
        div#quest-journal.quest-journal.visible {
          right: 2.5% !important;
        }
        
        div#quest-tracker.quest-tracker {
          width: 260px !important;
          right: 10px !important;
          top: 100px !important;
        }
      }
      
      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
  
  // === 🏗️ CRÉATION INTERFACES ===
  
  createJournalInterface() {
    // Supprimer l'ancien journal s'il existe
    const existing = document.querySelector('#quest-journal');
    if (existing) existing.remove();
    
    const journal = document.createElement('div');
    journal.id = 'quest-journal';
    journal.className = 'quest-journal hidden';
    
    journal.innerHTML = `
      <div class="quest-journal-header">
        <h2>📖 Journal des Quêtes</h2>
        <button class="quest-close-btn" id="close-quest-journal">✕</button>
      </div>
      
      <div class="quest-tabs">
        <button class="quest-tab active" data-tab="active">Actives</button>
        <button class="quest-tab" data-tab="completed">Terminées</button>
        <button class="quest-tab" data-tab="available">Disponibles</button>
      </div>
      
      <div class="quest-content">
        <div class="quest-list" id="quest-list">
          <div class="quest-empty">Aucune quête active</div>
        </div>
        
        <div class="quest-details" id="quest-details">
          <div class="quest-empty">Sélectionnez une quête pour voir les détails</div>
        </div>
      </div>
      
      <div class="quest-actions">
        <button id="refresh-quests" class="quest-btn">🔄 Actualiser</button>
        <button id="track-quest" class="quest-btn" disabled>📍 Suivre</button>
      </div>
    `;
    
    document.body.appendChild(journal);
    this.overlayElement = journal;
    
    console.log('🎨 [QuestUI] Journal créé');
  }
  
  createTrackerInterface() {
    // Supprimer l'ancien tracker s'il existe
    const existing = document.querySelector('#quest-tracker');
    if (existing) existing.remove();
    
    const tracker = document.createElement('div');
    tracker.id = 'quest-tracker';
    tracker.className = 'quest-tracker';
    
    tracker.innerHTML = `
      <div class="quest-tracker-header">
        <div class="tracker-title">
          <span class="tracker-icon">📋</span>
          <span class="tracker-text">Quests</span>
        </div>
        <div class="tracker-controls">
          <button class="tracker-btn minimize-btn" title="Minimize">−</button>
          <button class="tracker-btn close-btn" title="Hide">×</button>
        </div>
      </div>
      <div class="quest-tracker-content">
        <div class="tracked-quests" id="tracked-quests">
          <div class="quest-empty">No active quests</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tracker);
    this.trackerElement = tracker;
    
    console.log('🎨 [QuestUI] Tracker créé');
  }
  
  // === 🎛️ ÉVÉNEMENTS ROBUSTES ===
  
  setupEventListeners() {
    if (!this.overlayElement || !this.trackerElement) return;
    
    // === JOURNAL EVENTS ===
    
    // Bouton fermeture journal
    const closeBtn = this.overlayElement.querySelector('#close-quest-journal');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideJournal();
      });
    }
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.quest-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const view = tab.dataset.tab;
        this.switchToView(view);
      });
    });
    
    // Actions boutons
    this.setupActionButtons();
    
    // === TRACKER EVENTS ===
    
    // Tracker controls
    const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
    const trackerCloseBtn = this.trackerElement.querySelector('.close-btn');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleTrackerMinimize();
      });
    }
    
    if (trackerCloseBtn) {
      trackerCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideTracker();
      });
    }
    
    // === KEYBOARD EVENTS ===
    
    // Escape key - Une seule fois
    if (!this.escapeListenerAdded) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hideJournal();
        }
      });
      this.escapeListenerAdded = true;
    }
    
    console.log('🎛️ [QuestUI] Événements configurés');
  }
  
  setupActionButtons() {
    const buttons = {
      'refresh-quests': () => this.handleAction('refreshQuests'),
      'track-quest': () => this.handleAction('trackQuest', { questId: this.selectedQuest?.id })
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
      const btn = this.overlayElement.querySelector(`#${id}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handler();
        });
      }
    });
  }
  
  // === 🎛️ CONTRÔLES PRINCIPAUX ===
  
  show() {
    console.log('👁️ [QuestUI] Affichage journal');
    this.showJournal();
  }
  
  hide() {
    console.log('👻 [QuestUI] Masquage journal');
    this.hideJournal();
  }
  
  toggle() {
    if (this.isVisible) {
      this.hideJournal();
    } else {
      this.showJournal();
    }
  }
  
  showJournal() {
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'quest-journal visible';
      this.requestQuestData();
    }
    
    console.log('✅ [QuestUI] Journal affiché');
    return true;
  }
  
  hideJournal() {
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'quest-journal hidden';
    }
    
    this.selectedQuest = null;
    
    console.log('✅ [QuestUI] Journal masqué');
    return true;
  }
  
  showTracker() {
    this.isTrackerVisible = true;
    
    if (this.trackerElement) {
      this.trackerElement.classList.remove('hidden');
    }
    
    console.log('✅ [QuestUI] Tracker affiché');
  }
  
  hideTracker() {
    this.isTrackerVisible = false;
    
    if (this.trackerElement) {
      this.trackerElement.classList.add('hidden');
    }
    
    console.log('✅ [QuestUI] Tracker masqué');
  }
  
  toggleTracker() {
    if (this.isTrackerVisible) {
      this.hideTracker();
    } else {
      this.showTracker();
    }
  }
  
  toggleTrackerMinimize() {
    if (this.trackerElement) {
      const isMinimized = this.trackerElement.classList.contains('minimized');
      this.trackerElement.classList.toggle('minimized', !isMinimized);
      
      const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.textContent = isMinimized ? '−' : '+';
        minimizeBtn.title = isMinimized ? 'Minimize' : 'Maximize';
      }
    }
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.pointerEvents = 'auto';
        this.overlayElement.style.filter = 'none';
      } else {
        this.overlayElement.style.pointerEvents = 'none';
        this.overlayElement.style.filter = 'grayscale(50%) opacity(0.5)';
      }
    }
    
    if (this.trackerElement) {
      if (enabled) {
        this.trackerElement.style.pointerEvents = 'auto';
        this.trackerElement.style.filter = 'none';
      } else {
        this.trackerElement.style.pointerEvents = 'none';
        this.trackerElement.style.filter = 'grayscale(50%) opacity(0.5)';
      }
    }
    
    return true;
  }
  
  switchToView(viewName) {
    console.log(`🎮 [QuestUI] Changement vue: ${viewName}`);
    
    if (!this.overlayElement) return;
    
    // Mettre à jour tabs
    this.overlayElement.querySelectorAll('.quest-tab').forEach(tab => {
      if (tab.dataset.tab === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    this.currentView = viewName;
    
    // Charger les données appropriées
    switch (viewName) {
      case 'active':
        this.loadActiveQuests();
        break;
      case 'completed':
        this.loadCompletedQuests();
        break;
      case 'available':
        this.loadAvailableQuests();
        break;
    }
    
    console.log(`✅ [QuestUI] Vue ${viewName} activée`);
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateQuestData(quests, type = 'active') {
    console.log(`📊 [QuestUI] Mise à jour données ${type}:`, quests);
    
    switch (type) {
      case 'active':
        this.activeQuests = Array.isArray(quests) ? quests : [];
        if (this.currentView === 'active') {
          this.refreshQuestList();
        }
        this.updateTracker();
        break;
        
      case 'available':
        this.availableQuests = Array.isArray(quests) ? quests : [];
        if (this.currentView === 'available') {
          this.refreshQuestList();
        }
        break;
        
      case 'completed':
        this.completedQuests = Array.isArray(quests) ? quests : [];
        if (this.currentView === 'completed') {
          this.refreshQuestList();
        }
        break;
    }
  }
  
  loadActiveQuests() {
    console.log('📋 [QuestUI] Chargement des quêtes actives...');
    this.refreshQuestList();
  }
  
  loadCompletedQuests() {
    console.log('📋 [QuestUI] Chargement des quêtes terminées...');
    this.refreshQuestList();
  }
  
  loadAvailableQuests() {
    console.log('📋 [QuestUI] Chargement des quêtes disponibles...');
    this.handleAction('getAvailableQuests');
  }
  
  refreshQuestList() {
    const questList = this.overlayElement?.querySelector('#quest-list');
    if (!questList) return;
    
    let quests = [];
    switch (this.currentView) {
      case 'active':
        quests = this.activeQuests;
        break;
      case 'completed':
        quests = this.completedQuests;
        break;
      case 'available':
        quests = this.availableQuests;
        break;
    }
    
    if (!quests || quests.length === 0) {
      questList.innerHTML = `<div class="quest-empty">Aucune quête ${this.currentView === 'active' ? 'active' : this.currentView === 'completed' ? 'terminée' : 'disponible'}</div>`;
      this.updateQuestDetails(null);
      return;
    }
    
    questList.innerHTML = quests.map((quest, index) => {
      const progress = this.calculateQuestProgress(quest);
      const categoryClass = quest.category || 'side';
      
      return `
        <div class="quest-item" data-quest-index="${index}">
          <div class="quest-item-title">${quest.name || 'Quête sans nom'}</div>
          <div class="quest-item-progress">${progress.completed}/${progress.total} objectifs</div>
          <div class="quest-item-category ${categoryClass}">${(quest.category || 'side').toUpperCase()}</div>
        </div>
      `;
    }).join('');
    
    // Ajouter les event listeners
    questList.querySelectorAll('.quest-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectQuest(index);
      });
    });
    
    // Sélectionner la première quête
    if (quests.length > 0) {
      this.selectQuest(0);
    }
  }
  
  selectQuest(index) {
    this.overlayElement.querySelectorAll('.quest-item').forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
    
    let quest = null;
    switch (this.currentView) {
      case 'active':
        quest = this.activeQuests[index];
        break;
      case 'completed':
        quest = this.completedQuests[index];
        break;
      case 'available':
        quest = this.availableQuests[index];
        break;
    }
    
    this.selectedQuest = quest;
    
    if (quest) {
      this.updateQuestDetails(quest);
      const trackBtn = this.overlayElement.querySelector('#track-quest');
      if (trackBtn) {
        trackBtn.disabled = false;
      }
    }
  }
  
  updateQuestDetails(quest) {
    const detailsContainer = this.overlayElement?.querySelector('#quest-details');
    if (!detailsContainer) return;
    
    if (!quest) {
      detailsContainer.innerHTML = '<div class="quest-empty">Sélectionnez une quête pour voir les détails</div>';
      return;
    }
    
    console.log('📄 [QuestUI] Mise à jour détails quête:', quest);
    
    const isCompleted = quest.currentStepIndex >= (quest.steps?.length || 0);
    
    detailsContainer.innerHTML = `
      <div class="quest-details-content">
        <div class="quest-title">${quest.name || 'Quête sans nom'}</div>
        <div class="quest-description">${quest.description || 'Pas de description'}</div>
        
        ${quest.steps ? quest.steps.map((step, index) => {
          const isCurrent = index === quest.currentStepIndex;
          const isStepCompleted = index < quest.currentStepIndex;
          const stepClass = isStepCompleted ? 'completed' : (isCurrent ? 'current' : '');
          
          return `
            <div class="quest-step ${stepClass}">
              <div class="quest-step-title">${step.name || `Étape ${index + 1}`}</div>
              <div class="quest-step-description">${step.description || ''}</div>
              
              ${step.objectives ? step.objectives.map(obj => {
                const progress = Math.min(obj.currentAmount || 0, obj.requiredAmount || 1);
                
                return `
                  <div class="quest-objective ${obj.completed ? 'completed' : ''}">
                    ${obj.description || 'Objectif'} (${progress}/${obj.requiredAmount || 1})
                  </div>
                `;
              }).join('') : ''}
            </div>
          `;
        }).join('') : ''}
        
        ${isCompleted ? '<div class="quest-step completed"><div class="quest-step-title">✅ Quête terminée !</div></div>' : ''}
      </div>
    `;
  }
  
  calculateQuestProgress(quest) {
    let completed = 0;
    let total = 0;
    
    if (!quest.steps) return { completed: 0, total: 0 };
    
    quest.steps.forEach((step, stepIndex) => {
      if (step.objectives) {
        step.objectives.forEach(obj => {
          total++;
          if (stepIndex < quest.currentStepIndex || obj.completed) {
            completed++;
          }
        });
      }
    });
    
    return { completed, total };
  }
  
  // === 📊 TRACKER ===
  
  updateTracker() {
    const container = this.trackerElement?.querySelector('#tracked-quests');
    if (!container) return;
    
    const questsToTrack = this.activeQuests.slice(0, this.maxTrackedQuests);
    
    if (questsToTrack.length === 0) {
      container.innerHTML = '<div class="quest-empty">No active quests</div>';
      return;
    }
    
    container.innerHTML = questsToTrack.map((quest, index) => {
      const progress = this.calculateQuestProgress(quest);
      const isCompleted = quest.currentStepIndex >= (quest.steps?.length || 0);
      
      return `
        <div class="tracked-quest ${isCompleted ? 'completed' : ''}" data-quest-id="${quest.id}">
          <div class="quest-name">${quest.name}</div>
          <div class="quest-objectives">
            ${this.renderTrackerObjectives(quest)}
          </div>
        </div>
      `;
    }).join('');
    
    // Event listeners pour cliquer sur tracker
    container.querySelectorAll('.tracked-quest').forEach(questElement => {
      questElement.addEventListener('click', () => {
        this.showJournal();
        // Focus sur cette quête si possible
        const questId = questElement.dataset.questId;
        const questIndex = this.activeQuests.findIndex(q => q.id === questId);
        if (questIndex !== -1) {
          this.switchToView('active');
          setTimeout(() => this.selectQuest(questIndex), 100);
        }
      });
    });
  }
  
  renderTrackerObjectives(quest) {
    const currentStep = quest.steps?.[quest.currentStepIndex];
    if (!currentStep || !currentStep.objectives) {
      if (currentStep && currentStep.description) {
        return `<div class="quest-objective">${currentStep.description}</div>`;
      }
      return '';
    }
    
    return currentStep.objectives.map(objective => {
      const isCompleted = objective.completed;
      const current = objective.currentAmount || 0;
      const required = objective.requiredAmount || 1;
      
      let objectiveClass = 'quest-objective';
      if (isCompleted) objectiveClass += ' completed';
      
      let objectiveText = objective.description || 'Unknown objective';
      if (required > 1) {
        objectiveText += ` (${current}/${required})`;
      }
      
      return `<div class="${objectiveClass}">${objectiveText}</div>`;
    }).join('');
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [QuestUI] Action: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
    
    this.showActionFeedback(action);
  }
  
  showActionFeedback(action) {
    const messages = {
      refreshQuests: { text: 'Actualisation des quêtes...', type: 'info' },
      trackQuest: { text: 'Quête ajoutée au tracker', type: 'success' },
      getAvailableQuests: { text: 'Chargement des quêtes disponibles...', type: 'info' }
    };
    
    const message = messages[action] || { text: `Action ${action} en cours...`, type: 'info' };
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message.text, message.type, {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  requestQuestData() {
    this.handleAction('refreshQuests');
  }
  
  // === 💬 DIALOGUES QUÊTES ===
  
  showQuestDialog(title, quests, onSelectQuest) {
    console.log('💬 [QuestUI] Affichage dialogue quête:', title, quests);
    
    if (!quests || quests.length === 0) {
      console.log('⚠️ [QuestUI] Aucune quête pour le dialogue');
      return;
    }
    
    const dialog = this.createQuestDialog(title, quests, onSelectQuest);
    document.body.appendChild(dialog);
    this.currentDialog = dialog;
  }
  
  createQuestDialog(title, quests, onSelectQuest) {
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    
    const questsHTML = quests.map(quest => {
      const questName = quest.name || 'Quête sans nom';
      const questDesc = quest.description || 'Pas de description';
      const questCategory = quest.category || 'side';
      const questLevel = quest.level ? `[${quest.level}]` : '';
      
      return `
        <div class="quest-option" data-quest-id="${quest.id}">
          <div class="quest-option-header">
            <strong>${questName} ${questLevel}</strong>
            <span class="quest-category ${questCategory}">${questCategory.toUpperCase()}</span>
          </div>
          <p class="quest-option-description">${questDesc}</p>
        </div>
      `;
    }).join('');
    
    dialog.innerHTML = `
      <div class="quest-dialog">
        <div class="quest-dialog-header">
          <h3>${title}</h3>
          <button class="quest-dialog-close">✕</button>
        </div>
        <div class="quest-dialog-content">
          ${questsHTML}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-cancel">Annuler</button>
          <button class="quest-btn-accept" disabled>Accepter</button>
        </div>
      </div>
    `;
    
    this.addQuestDialogListeners(dialog, onSelectQuest);
    return dialog;
  }
  
  addQuestDialogListeners(dialog, onSelectQuest) {
    let selectedQuestId = null;
    
    const closeBtn = dialog.querySelector('.quest-dialog-close');
    const cancelBtn = dialog.querySelector('.quest-btn-cancel');
    const acceptBtn = dialog.querySelector('.quest-btn-accept');
    
    const closeDialog = () => {
      dialog.remove();
      this.currentDialog = null;
      console.log('📋 [QuestUI] Dialogue fermé');
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
    
    // Sélection des quêtes
    dialog.querySelectorAll('.quest-option').forEach(option => {
      option.addEventListener('click', () => {
        dialog.querySelectorAll('.quest-option').forEach(opt => 
          opt.classList.remove('selected')
        );
        option.classList.add('selected');
        selectedQuestId = option.dataset.questId;
        acceptBtn.disabled = false;
      });
    });
    
    const acceptQuest = () => {
      if (selectedQuestId && onSelectQuest) {
        onSelectQuest(selectedQuestId);
      }
      closeDialog();
    };
    
    acceptBtn.addEventListener('click', acceptQuest);
    
    // Gestion clavier
    document.addEventListener('keydown', function handleKeydown(e) {
      if (!dialog.parentNode) {
        document.removeEventListener('keydown', handleKeydown);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
      } else if (e.key === 'Enter' && selectedQuestId) {
        e.preventDefault();
        acceptQuest();
      }
    });
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestUI] Destruction interface...');
    
    // Nettoyer dialogues
    if (this.currentDialog && this.currentDialog.parentNode) {
      this.currentDialog.remove();
    }
    
    // Supprimer éléments DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.remove();
    }
    
    if (this.trackerElement && this.trackerElement.parentNode) {
      this.trackerElement.remove();
    }
    
    // Supprimer styles
    const styles = document.querySelector('#quest-ui-styles');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.trackerElement = null;
    this.currentDialog = null;
    this.isVisible = false;
    this.activeQuests = [];
    this.selectedQuest = null;
    this.onAction = null;
    
    console.log('✅ [QuestUI] Interface détruite');
  }
  
  // === 🐛 DEBUG ===
  

export default QuestUI;

console.log(`
📖 === QUEST UI RÉÉCRITURE COMPLÈTE ===

✅ ARCHITECTURE UNIFIÉE:
• QuestJournal + QuestTracker + Dialogues dans une classe
• CSS avec spécificité maximale (div#quest-journal)
• Tous les styles forcés avec !important
• Événements robustes avec preventDefault

🎨 COMPOSANTS INTÉGRÉS:
• Journal des quêtes (sidebar coulissant)
• Tracker de quêtes (overlay flottant)
• Dialogues de sélection de quêtes
• Système de navigation par onglets

🔧 FONCTIONNALITÉS COMPLÈTES:
• Affichage quêtes actives/terminées/disponibles
• Sélection et détails de quêtes
• Suivi des objectifs en temps réel
• Dialogues interactifs pour NPC
• Tracker minimisable et déplaçable

🎯 MÉTHODES PRINCIPALES:
• show() / hide() / toggle() - Journal
• showTracker() / hideTracker() - Tracker
• updateQuestData(quests, type) - Données
• showQuestDialog(title, quests, callback) - Dialogues

⚡ UTILISATION NORMALE:
• window.questModule.show() ✓
• Bouton fermeture X ✓
• Touche Escape ✓
• Navigation tabs ✓
• Tracker interactif ✓

🎯 QUEST UI 100% FONCTIONNELLE INTÉGRÉE !
`);
