// Quest/QuestUI.js - RÉÉCRITURE COMPLÈTE AVEC PROGRESSION AUTOMATIQUE
// 🎯 Interface Quest avec gestion intelligente de la progression des objectifs
// ✅ FIX: Progression automatique + Nettoyage des objectifs complétés

export class QuestUI {
  constructor(questSystem, gameRoom) {
    this.questSystem = questSystem;
    this.gameRoom = gameRoom;
    
    // === ÉTAT SIMPLE ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    this.trackerElement = null;
    
    // === DONNÉES ===
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    this.selectedQuest = null;
    this.currentView = 'active';
    
    // === TRACKER ===
    this.isTrackerVisible = false;
    this.maxTrackedQuests = 5;
    
    // ✅ NOUVEAU : Gestion de la progression
    this.progressionState = {
      animatingObjectives: new Set(),
      pendingRefresh: false,
      lastRefreshTime: 0,
      refreshCooldown: 1000 // Éviter les refresh trop fréquents
    };
    
    // === CONTRÔLE ===
    this.currentTooltip = null;
    this.currentDialog = null;
    this.onAction = null;
    
    console.log('📖 [QuestUI] Instance créée - Version réécrite avec progression automatique');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestUI] Initialisation...');
      
      this.addStyles();
      this.createJournalInterface();
      this.createTrackerInterface();
      this.setupEventListeners();
      
      // ✅ État initial
      this.isVisible = false;
      this.hideTracker();
      
      console.log('✅ [QuestUI] Interface prête avec progression automatique');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 STYLES OPTIMISÉS ===
  
  addStyles() {
    if (document.querySelector('#quest-ui-styles-v2')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-ui-styles-v2';
    style.textContent = `
      /* ===== QUEST UI STYLES V2 - AVEC PROGRESSION AUTOMATIQUE ===== */
      
      /* Journal Overlay */
      div#quest-journal.quest-journal {
        position: fixed !important;
        top: 10% !important;
        right: -450px !important;
        width: 400px !important;
        height: 70% !important;
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
        transition: all 0.3s ease !important;
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
      
      /* ✅ NOUVEAU : Gestion avancée des objectifs complétés */
      div#quest-journal .quest-objective.just-completed {
        background: linear-gradient(90deg, #22c55e, #16a34a) !important;
        color: #ffffff !important;
        font-weight: bold !important;
        padding: 6px 12px !important;
        border-radius: 6px !important;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4) !important;
        animation: objectiveJustCompleted 1.2s ease !important;
        margin: 8px 0 !important;
      }
      
      div#quest-journal .quest-objective.just-completed:before {
        content: "⚡" !important;
        color: #ffffff !important;
      }
      
      div#quest-journal .quest-objective.fading-out {
        opacity: 0.3 !important;
        transform: scale(0.95) !important;
        transition: all 0.8s ease !important;
      }
      
      div#quest-journal .quest-objective.disappearing {
        opacity: 0 !important;
        transform: scale(0.8) translateY(-10px) !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        transition: all 0.5s ease !important;
      }
      
      @keyframes objectiveJustCompleted {
        0% { transform: scale(1); background: #4a90e2; }
        25% { transform: scale(1.05); background: #22c55e; }
        50% { transform: scale(1.02); background: #16a34a; }
        100% { transform: scale(1); background: #22c55e; }
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
      
      /* ===== QUEST TRACKER V2 ===== */
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
        transition: all 0.4s ease !important;
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
        transition: all 0.4s ease !important;
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
        opacity: 0.7 !important;
      }
      
      div#quest-tracker .quest-objective.completed:before {
        content: "✓" !important;
        color: #4caf50 !important;
      }
      
      /* ✅ NOUVEAU : Gestion avancée des objectifs dans le tracker */
      div#quest-tracker .quest-objective.just-completed {
        background: linear-gradient(90deg, #22c55e, #16a34a) !important;
        color: #ffffff !important;
        font-weight: bold !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4) !important;
        transform: scale(1.02) !important;
        animation: trackerObjectiveCompleted 1.2s ease !important;
        margin: 4px 0 !important;
      }
      
      div#quest-tracker .quest-objective.just-completed:before {
        content: "⚡" !important;
        color: #ffffff !important;
      }
      
      div#quest-tracker .quest-objective.fading-out {
        opacity: 0.3 !important;
        transform: scale(0.95) !important;
        transition: all 0.8s ease !important;
      }
      
      div#quest-tracker .quest-objective.disappearing {
        opacity: 0 !important;
        transform: scale(0.8) translateY(-10px) !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        transition: all 0.5s ease !important;
      }
      
      @keyframes trackerObjectiveCompleted {
        0% { 
          transform: scale(1); 
          background: linear-gradient(90deg, #4a90e2, #357abd); 
        }
        25% { 
          transform: scale(1.05); 
          background: linear-gradient(90deg, #22c55e, #16a34a); 
        }
        50% { 
          transform: scale(1.02); 
          background: linear-gradient(90deg, #16a34a, #15803d); 
        }
        100% { 
          transform: scale(1.02); 
          background: linear-gradient(90deg, #22c55e, #16a34a); 
        }
      }
      
      /* ✅ NOUVEAU : État de refresh du tracker */
      div#quest-tracker.refreshing {
        opacity: 0.7 !important;
        pointer-events: none !important;
      }
      
      div#quest-tracker.refreshing::after {
        content: "" !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 20px !important;
        height: 20px !important;
        border: 2px solid #4a90e2 !important;
        border-top: 2px solid transparent !important;
        border-radius: 50% !important;
        animation: refreshSpin 1s linear infinite !important;
        transform: translate(-50%, -50%) !important;
      }
      
      @keyframes refreshSpin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [QuestUI] Styles V2 ajoutés avec progression automatique');
  }
  
  // === 🏗️ CRÉATION INTERFACES ===
  
  createJournalInterface() {
    const existing = document.querySelector('#quest-journal');
    if (existing) existing.remove();
    
    const journal = document.createElement('div');
    journal.id = 'quest-journal';
    journal.className = 'quest-journal hidden';
    
    journal.innerHTML = `
      <div class="quest-journal-header">
        <h2>Journal des Quêtes</h2>
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
        <button id="refresh-quests" class="quest-btn">Actualiser</button>
        <button id="track-quest" class="quest-btn" disabled>Suivre</button>
      </div>
    `;
    
    document.body.appendChild(journal);
    this.overlayElement = journal;
    
    console.log('🎨 [QuestUI] Journal créé');
  }
  
  createTrackerInterface() {
    const existing = document.querySelector('#quest-tracker');
    if (existing) existing.remove();
    
    const tracker = document.createElement('div');
    tracker.id = 'quest-tracker';
    tracker.className = 'quest-tracker';
    
    tracker.innerHTML = `
      <div class="quest-tracker-header">
        <div class="tracker-title">
          <span class="tracker-icon">📖</span>
          <span class="tracker-text">Quêtes</span>
        </div>
        <div class="tracker-controls">
          <button class="tracker-btn minimize-btn" title="Minimiser">-</button>
          <button class="tracker-btn close-btn" title="Masquer">×</button>
        </div>
      </div>
      <div class="quest-tracker-content">
        <div class="tracked-quests" id="tracked-quests">
          <div class="quest-empty">Aucune quête active</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tracker);
    this.trackerElement = tracker;
    
    console.log('🎨 [QuestUI] Tracker créé');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement || !this.trackerElement) return;
    
    // === JOURNAL EVENTS ===
    const closeBtn = this.overlayElement.querySelector('#close-quest-journal');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hide();
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
    const minimizeBtn = this.trackerElement.querySelector('.minimize-btn');
    const trackerCloseBtn = this.trackerElement.querySelector('.close-btn');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTrackerMinimize();
      });
    }
    
    if (trackerCloseBtn) {
      trackerCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideTracker();
      });
    }
    
    // === KEYBOARD ===
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    });
    
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
          handler();
        });
      }
    });
  }
  
  // === 🎛️ CONTRÔLES PRINCIPAUX ===
  
  show() {
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'quest-journal visible';
      this.requestQuestData();
    }
    
    console.log('✅ [QuestUI] Journal affiché');
    return true;
  }
  
  hide() {
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.className = 'quest-journal hidden';
    }
    
    this.selectedQuest = null;
    console.log('✅ [QuestUI] Journal masqué');
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
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
        minimizeBtn.textContent = isMinimized ? '-' : '+';
        minimizeBtn.title = isMinimized ? 'Minimiser' : 'Maximiser';
      }
    }
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    const elements = [this.overlayElement, this.trackerElement];
    elements.forEach(element => {
      if (element) {
        if (enabled) {
          element.style.pointerEvents = 'auto';
          element.style.filter = 'none';
        } else {
          element.style.pointerEvents = 'none';
          element.style.filter = 'grayscale(50%) opacity(0.5)';
        }
      }
    });
    
    return true;
  }
  
  switchToView(viewName) {
    console.log(`🎮 [QuestUI] Vue: ${viewName}`);
    
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
    
    // Charger données
    switch (viewName) {
      case 'active':
        this.refreshQuestList();
        break;
      case 'completed':
        this.refreshQuestList();
        break;
      case 'available':
        this.handleAction('getAvailableQuests');
        break;
    }
    
    console.log(`✅ [QuestUI] Vue ${viewName} activée`);
  }
  
  // === 📊 GESTION DONNÉES AVEC PROGRESSION AUTOMATIQUE ===
  
  updateQuestData(quests, type = 'active') {
    console.log(`📊 [QuestUI] Données ${type}:`, quests);
    
    switch (type) {
      case 'active':
        this.activeQuests = Array.isArray(quests) ? quests : [];
        if (this.currentView === 'active') {
          this.refreshQuestList();
        }
        // ✅ TOUJOURS mettre à jour le tracker
        this.updateTrackerIntelligent();
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
  
  // ✅ MÉTHODE PRINCIPALE : Tracker intelligent avec progression automatique
  updateTrackerIntelligent() {
    console.log(`📊 [QuestUI] Update tracker intelligent - ${this.activeQuests.length} quêtes actives`);
    
    const container = this.trackerElement?.querySelector('#tracked-quests');
    if (!container) {
      console.warn('⚠️ [QuestUI] Container tracker non trouvé');
      return;
    }
    
    const questsToTrack = this.activeQuests.slice(0, this.maxTrackedQuests);
    
    // ✅ GESTION INTELLIGENTE DE L'AFFICHAGE/MASQUAGE
    if (questsToTrack.length === 0) {
      console.log('📊 [QuestUI] Aucune quête active - masquage tracker');
      container.innerHTML = '<div class="quest-empty">Aucune quête active</div>';
      this.hideTracker();
      return;
    }
    
    console.log(`📊 [QuestUI] ${questsToTrack.length} quêtes actives - affichage tracker`);
    this.showTracker();
    
    // ✅ NETTOYAGE DES ANIMATIONS EN COURS
    this.cleanupAnimatingObjectives();
    
    // ✅ GÉNÉRATION INTELLIGENTE DU HTML
    container.innerHTML = questsToTrack.map((quest, index) => {
      const isCompleted = quest.currentStepIndex >= (quest.steps?.length || 0);
      
      return `
        <div class="tracked-quest ${isCompleted ? 'completed' : ''}" data-quest-id="${quest.id}">
          <div class="quest-name">${quest.name}</div>
          <div class="quest-objectives">
            ${this.renderTrackerObjectivesIntelligent(quest)}
          </div>
        </div>
      `;
    }).join('');
    
    // ✅ EVENT LISTENERS pour cliquer sur tracker
    container.querySelectorAll('.tracked-quest').forEach(questElement => {
      questElement.addEventListener('click', () => {
        this.show();
        const questId = questElement.dataset.questId;
        const questIndex = this.activeQuests.findIndex(q => q.id === questId);
        if (questIndex !== -1) {
          this.switchToView('active');
          setTimeout(() => this.selectQuest(questIndex), 100);
        }
      });
    });
    
    console.log('✅ [QuestUI] Tracker intelligent mis à jour');
  }
  
  // ✅ MÉTHODE AMÉLIORÉE : Rendu intelligent des objectifs
  renderTrackerObjectivesIntelligent(quest) {
    const currentStep = quest.steps?.[quest.currentStepIndex];
    if (!currentStep || !currentStep.objectives) {
      if (currentStep && currentStep.description) {
        return `<div class="quest-objective">${currentStep.description}</div>`;
      }
      return '<div class="quest-objective">Aucun objectif disponible</div>';
    }
    
    return currentStep.objectives.map((objective, objIndex) => {
      const isCompleted = objective.completed;
      const current = objective.currentAmount || 0;
      const required = objective.requiredAmount || 1;
      const objId = `${quest.id}-${quest.currentStepIndex}-${objIndex}`;
      
      let objectiveClass = 'quest-objective';
      if (isCompleted) {
        objectiveClass += ' completed';
      }
      
      // ✅ VÉRIFIER SI CET OBJECTIF EST EN COURS D'ANIMATION
      if (this.progressionState.animatingObjectives.has(objId)) {
        objectiveClass += ' just-completed';
      }
      
      let objectiveText = objective.description || 'Objectif inconnu';
      if (required > 1) {
        objectiveText += ` (${current}/${required})`;
      }
      
      return `<div class="${objectiveClass}" 
                   data-quest-id="${quest.id}" 
                   data-step-index="${quest.currentStepIndex}" 
                   data-objective-index="${objIndex}"
                   data-objective-id="${objId}">${objectiveText}</div>`;
    }).join('');
  }
  
  // ✅ MÉTHODE PRINCIPALE : Animation d'objectif complété avec progression automatique
  highlightObjectiveAsCompleted(result) {
    console.log('🟢 [QuestUI] === DÉBUT ANIMATION OBJECTIF COMPLÉTÉ ===');
    console.log('📊 Données reçues:', result);
    
    try {
      // ✅ ÉTAPE 1: Identifier l'objectif à animer
      const objectiveInfo = this.identifyCompletedObjective(result);
      if (!objectiveInfo.found) {
        console.warn('⚠️ [QuestUI] Objectif non identifié, fallback refresh');
        this.scheduleIntelligentRefresh(1500, 'objectif_non_trouve');
        return false;
      }
      
      console.log('✅ [QuestUI] Objectif identifié:', objectiveInfo);
      
      // ✅ ÉTAPE 2: Marquer comme en cours d'animation
      const objId = objectiveInfo.objectiveId;
      this.progressionState.animatingObjectives.add(objId);
      
      // ✅ ÉTAPE 3: Appliquer l'animation sur tous les éléments trouvés
      objectiveInfo.elements.forEach(element => {
        console.log('🎨 [QuestUI] Application animation sur:', element);
        this.applyCompletedObjectiveAnimation(element);
      });
      
      // ✅ ÉTAPE 4: Programmer la progression automatique
      this.scheduleObjectiveProgression(objId, objectiveInfo, result);
      
      return true;
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur animation objectif:', error);
      // Fallback en cas d'erreur
      this.scheduleIntelligentRefresh(2000, 'erreur_animation');
      return false;
    }
  }
  
  // ✅ MÉTHODE HELPER : Identifier l'objectif complété
  identifyCompletedObjective(result) {
    const questId = result.questId;
    const objectiveName = result.objectiveName || result.title || result.message;
    
    console.log(`🔍 [QuestUI] Recherche objectif: "${objectiveName}" dans quête ${questId}`);
    
    const foundElements = [];
    let objectiveId = null;
    
    // Recherche dans le tracker
    if (this.trackerElement) {
      const trackerObjectives = this.trackerElement.querySelectorAll(
        `[data-quest-id="${questId}"] .quest-objective`
      );
      
      for (const element of trackerObjectives) {
        if (element.textContent && element.textContent.includes(objectiveName)) {
          console.log('✅ [QuestUI] Objectif trouvé dans tracker');
          foundElements.push(element);
          objectiveId = element.dataset.objectiveId || `${questId}-tracker-${Date.now()}`;
          break;
        }
      }
    }
    
    // Recherche dans le journal si ouvert
    if (this.isVisible && this.overlayElement) {
      const journalObjectives = this.overlayElement.querySelectorAll('.quest-objective');
      
      for (const element of journalObjectives) {
        if (element.textContent && element.textContent.includes(objectiveName)) {
          console.log('✅ [QuestUI] Objectif trouvé dans journal');
          foundElements.push(element);
          if (!objectiveId) {
            objectiveId = `${questId}-journal-${Date.now()}`;
          }
          break;
        }
      }
    }
    
    return {
      found: foundElements.length > 0,
      elements: foundElements,
      objectiveId: objectiveId,
      questId: questId,
      objectiveName: objectiveName
    };
  }
  
  // ✅ MÉTHODE HELPER : Application de l'animation
  applyCompletedObjectiveAnimation(element) {
    // Nettoyer les classes existantes
    element.classList.remove('completed', 'just-completed', 'fading-out', 'disappearing');
    
    // Appliquer la nouvelle animation
    element.classList.add('just-completed');
    
    console.log('🎨 [QuestUI] Animation "just-completed" appliquée');
  }
  
  // ✅ MÉTHODE PRINCIPALE : Programmer la progression automatique
  scheduleObjectiveProgression(objectiveId, objectiveInfo, result) {
    console.log(`⏰ [QuestUI] Programmation progression pour objectif ${objectiveId}`);
    
    // Phase 1: Animation verte (0-1200ms - gérée par CSS)
    
    // Phase 2: Début du fade à 1000ms
    setTimeout(() => {
      console.log('🎨 [QuestUI] Phase 2 - Début fade out');
      objectiveInfo.elements.forEach(element => {
        if (element.classList.contains('just-completed')) {
          element.classList.add('fading-out');
        }
      });
    }, 1000);
    
    // Phase 3: Progression automatique à 2000ms
    setTimeout(() => {
      console.log('🔄 [QuestUI] Phase 3 - Progression automatique');
      
      // Nettoyer l'animation
      this.cleanupObjectiveAnimation(objectiveId, objectiveInfo.elements);
      
      // Déclencher le refresh intelligent
      this.scheduleIntelligentRefresh(0, 'progression_automatique');
      
    }, 2000); // ✅ VOS 2 SECONDES DEMANDÉES
  }
  
  // ✅ MÉTHODE HELPER : Nettoyage de l'animation
  cleanupObjectiveAnimation(objectiveId, elements) {
    console.log(`🧹 [QuestUI] Nettoyage animation objectif ${objectiveId}`);
    
    // Supprimer de la liste des animations en cours
    this.progressionState.animatingObjectives.delete(objectiveId);
    
    // Nettoyer les éléments DOM
    elements.forEach(element => {
      element.classList.remove('just-completed', 'fading-out');
      element.classList.add('disappearing');
      
      // Supprimer complètement l'élément après l'animation de disparition
      setTimeout(() => {
        if (element.parentNode) {
          element.style.display = 'none';
        }
      }, 500);
    });
  }
  
  // ✅ MÉTHODE HELPER : Nettoyage global des animations
  cleanupAnimatingObjectives() {
    if (this.progressionState.animatingObjectives.size > 0) {
      console.log(`🧹 [QuestUI] Nettoyage ${this.progressionState.animatingObjectives.size} animations en cours`);
      this.progressionState.animatingObjectives.clear();
    }
  }
  
  // ✅ MÉTHODE PRINCIPALE : Refresh intelligent avec cooldown
  scheduleIntelligentRefresh(delay = 0, reason = 'manuel') {
    console.log(`🔄 [QuestUI] Refresh intelligent programmé - délai: ${delay}ms, raison: ${reason}`);
    
    // Vérifier le cooldown pour éviter les refresh trop fréquents
    const now = Date.now();
    if (now - this.progressionState.lastRefreshTime < this.progressionState.refreshCooldown) {
      console.log('⏸️ [QuestUI] Refresh ignoré (cooldown)');
      return;
    }
    
    // Marquer comme en cours de refresh
    this.progressionState.pendingRefresh = true;
    
    setTimeout(() => {
      this.executeIntelligentRefresh(reason);
    }, delay);
  }
  
  // ✅ MÉTHODE HELPER : Exécution du refresh intelligent
  executeIntelligentRefresh(reason) {
    console.log(`🔄 [QuestUI] Exécution refresh intelligent - raison: ${reason}`);
    
    try {
      // Marquer le tracker comme en cours de refresh
      if (this.trackerElement) {
        this.trackerElement.classList.add('refreshing');
      }
      
      // Méthode 1: Via le système d'actions (priorité)
      if (this.onAction) {
        this.onAction('refreshQuests', { 
          source: 'progression_automatique',
          reason: reason,
          timestamp: Date.now()
        });
      }
      
      // Méthode 2: Backup via QuestSystem global
      setTimeout(() => {
        if (this.progressionState.pendingRefresh && window.questSystem) {
          console.log('🔄 [QuestUI] Backup refresh via QuestSystem');
          window.questSystem.requestActiveQuests();
        }
      }, 500);
      
      // Méthode 3: Ultimate backup via réseau direct
      setTimeout(() => {
        if (this.progressionState.pendingRefresh && window.networkManager) {
          console.log('🔄 [QuestUI] Ultimate backup refresh via réseau');
          window.networkManager.sendMessage('getActiveQuests', {
            reason: 'ui_progression_automatique',
            timestamp: Date.now()
          });
        }
      }, 1000);
      
      // Cleanup après 2 secondes max
      setTimeout(() => {
        this.finishIntelligentRefresh();
      }, 2000);
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur refresh intelligent:', error);
      this.finishIntelligentRefresh();
    }
  }
  
  // ✅ MÉTHODE HELPER : Finalisation du refresh
  finishIntelligentRefresh() {
    console.log('✅ [QuestUI] Finalisation refresh intelligent');
    
    // Nettoyer l'état de refresh
    this.progressionState.pendingRefresh = false;
    this.progressionState.lastRefreshTime = Date.now();
    
    // Supprimer l'indicateur de refresh
    if (this.trackerElement) {
      this.trackerElement.classList.remove('refreshing');
    }
  }
  
  // === 📊 MÉTHODES EXISTANTES CONSERVÉES ===
  
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
      questList.innerHTML = `<div class="quest-empty">Aucune quête ${this.currentView}</div>`;
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
    
    // Event listeners
    questList.querySelectorAll('.quest-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectQuest(index);
      });
    });
    
    // Sélectionner première quête
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
              
              ${step.objectives ? step.objectives.map((obj, objIndex) => {
                const progress = Math.min(obj.currentAmount || 0, obj.requiredAmount || 1);
                const objId = `${quest.id}-${index}-${objIndex}`;
                
                return `
                  <div class="quest-objective ${obj.completed ? 'completed' : ''}" 
                       data-quest-id="${quest.id}" 
                       data-step-index="${index}" 
                       data-objective-index="${objIndex}"
                       data-objective-id="${objId}">
                    ${obj.description || 'Objectif'} (${progress}/${obj.requiredAmount || 1})
                  </div>
                `;
              }).join('') : ''}
            </div>
          `;
        }).join('') : ''}
        
        ${isCompleted ? '<div class="quest-step completed"><div class="quest-step-title">Quête terminée !</div></div>' : ''}
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
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [QuestUI] Action: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
  }
  
  requestQuestData() {
    this.handleAction('refreshQuests');
  }
  
  // === 🔧 MÉTHODES DEBUG ===
  
  debugProgressionState() {
    console.log('🔍 [QuestUI] === DEBUG ÉTAT PROGRESSION ===');
    console.log('Objectifs en animation:', Array.from(this.progressionState.animatingObjectives));
    console.log('Refresh en cours:', this.progressionState.pendingRefresh);
    console.log('Dernier refresh:', new Date(this.progressionState.lastRefreshTime));
    console.log('Quêtes actives:', this.activeQuests.length);
    console.log('Tracker visible:', this.isTrackerVisible);
    
    return {
      animatingObjectives: Array.from(this.progressionState.animatingObjectives),
      pendingRefresh: this.progressionState.pendingRefresh,
      lastRefreshTime: this.progressionState.lastRefreshTime,
      activeQuests: this.activeQuests.length,
      trackerVisible: this.isTrackerVisible
    };
  }
  
  forceRefreshNow() {
    console.log('🔄 [QuestUI] Force refresh immédiat');
    this.progressionState.lastRefreshTime = 0; // Reset cooldown
    this.scheduleIntelligentRefresh(0, 'force_manual');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestUI] Destruction...');
    
    // Nettoyer animations en cours
    this.cleanupAnimatingObjectives();
    
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
    const styles = document.querySelector('#quest-ui-styles-v2');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.trackerElement = null;
    this.currentDialog = null;
    this.isVisible = false;
    this.activeQuests = [];
    this.selectedQuest = null;
    this.onAction = null;
    this.progressionState = {
      animatingObjectives: new Set(),
      pendingRefresh: false,
      lastRefreshTime: 0,
      refreshCooldown: 1000
    };
    
    console.log('✅ [QuestUI] Détruit avec nettoyage complet');
  }
}

export default QuestUI;
