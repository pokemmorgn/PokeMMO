// Quest/QuestUI.js - VERSION OPTIMISÉE ANTI-DÉCONNEXION COLYSEUS
// 🎯 Interface Quest avec gestion intelligente de la progression des objectifs
// ✅ FIX: Protection contre les appels réseau excessifs + Debouncing intelligent
// 🛡️ CORRECTION: Éviter les boucles infinies qui causent les déconnexions Colyseus
// 🌐 Support LocalizationManager pour les textes traduits

import { t } from '../managers/LocalizationManager.js';

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
    
    // 🛡️ NOUVEAU : Protection contre les appels réseau excessifs
    this.networkProtection = {
      lastRefreshTime: 0,
      refreshCooldown: 2000, // 2 secondes minimum entre refreshes
      maxRefreshPerMinute: 10, // Max 10 refresh par minute
      refreshHistory: [], // Historique des derniers refresh
      isRefreshing: false,
      pendingRefresh: false,
      debounceTimeouts: new Map() // Timeouts de debounce par type
    };
    
    // ✅ Gestion de la progression (optimisée)
    this.progressionState = {
      animatingObjectives: new Set(),
      lastProgressionTime: 0,
      progressionCooldown: 500, // 500ms entre animations d'objectifs
      pendingAnimations: new Map()
    };
    
    // === CONTRÔLE ===
    this.currentTooltip = null;
    this.currentDialog = null;
    this.onAction = null;
    
    // 🌐 Gestion traductions
    this.optionsManager = window.optionsSystem?.manager || 
                         window.optionsSystemGlobal?.manager ||
                         window.optionsSystem;
    this.cleanupLanguageListener = null;
    
    console.log('📖 [QuestUI] Instance créée - Version anti-déconnexion Colyseus');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestUI] Initialisation...');
      
      this.setupLanguageListener();
      this.addStyles();
      this.createJournalInterface();
      this.createTrackerInterface();
      this.setupEventListeners();
      
      // État initial
      this.isVisible = false;
      this.hideTracker();
      
      console.log('✅ [QuestUI] Interface prête avec protection réseau Colyseus');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🛡️ PROTECTION RÉSEAU COLYSEUS ===
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Vérifier si on peut faire un appel réseau
   */
  canMakeNetworkCall(type = 'refresh') {
    const now = Date.now();
    
    // 1. Vérifier cooldown global
    if (now - this.networkProtection.lastRefreshTime < this.networkProtection.refreshCooldown) {
      const remaining = this.networkProtection.refreshCooldown - (now - this.networkProtection.lastRefreshTime);
      console.log(`🛡️ [QuestUI] Cooldown actif: ${Math.ceil(remaining/1000)}s restants`);
      return false;
    }
    
    // 2. Vérifier si déjà en cours de refresh
    if (this.networkProtection.isRefreshing) {
      console.log('🛡️ [QuestUI] Refresh déjà en cours');
      return false;
    }
    
    // 3. Nettoyer l'historique (garder seulement la dernière minute)
    const oneMinuteAgo = now - 60000;
    this.networkProtection.refreshHistory = this.networkProtection.refreshHistory.filter(time => time > oneMinuteAgo);
    
    // 4. Vérifier le quota par minute
    if (this.networkProtection.refreshHistory.length >= this.networkProtection.maxRefreshPerMinute) {
      console.warn('🛡️ [QuestUI] Quota de refresh par minute atteint');
      return false;
    }
    
    return true;
  }
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Enregistrer un appel réseau
   */
  recordNetworkCall(type = 'refresh') {
    const now = Date.now();
    this.networkProtection.lastRefreshTime = now;
    this.networkProtection.refreshHistory.push(now);
    this.networkProtection.isRefreshing = true;
    
    // Auto-cleanup après 5 secondes max
    setTimeout(() => {
      this.networkProtection.isRefreshing = false;
    }, 5000);
    
    console.log(`🛡️ [QuestUI] Appel réseau enregistré: ${type}`);
  }
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Debounce intelligent pour éviter les appels multiples
   */
  debouncedNetworkCall(type, callback, delay = 1000) {
    // Annuler le timeout précédent pour ce type
    if (this.networkProtection.debounceTimeouts.has(type)) {
      clearTimeout(this.networkProtection.debounceTimeouts.get(type));
    }
    
    // Programmer le nouvel appel
    const timeoutId = setTimeout(() => {
      if (this.canMakeNetworkCall(type)) {
        this.recordNetworkCall(type);
        callback();
      } else {
        console.log(`🛡️ [QuestUI] Appel ${type} bloqué par protection réseau`);
      }
      
      // Nettoyer le timeout
      this.networkProtection.debounceTimeouts.delete(type);
    }, delay);
    
    this.networkProtection.debounceTimeouts.set(type, timeoutId);
    console.log(`🛡️ [QuestUI] Appel ${type} programmé dans ${delay}ms`);
  }
  
  // === 🌐 GESTION LANGUE (inchangée) ===
  
  setupLanguageListener() {
    if (!this.optionsManager || typeof this.optionsManager.addLanguageListener !== 'function') {
      console.warn('⚠️ [QuestUI] OptionsManager non disponible pour traductions');
      return;
    }
    
    this.cleanupLanguageListener = this.optionsManager.addLanguageListener((newLang, oldLang) => {
      console.log(`🌐 [QuestUI] Changement langue: ${oldLang} → ${newLang}`);
      this.updateLanguageTexts();
      
      if (this.isVisible) {
        this.refreshQuestList();
      }
      if (this.isTrackerVisible) {
        this.updateTrackerIntelligent();
      }
    });
    
    console.log('📡 [QuestUI] Listener langue configuré');
  }
  
  updateLanguageTexts() {
    if (!this.overlayElement) return;
    
    try {
      const journalTitle = this.overlayElement.querySelector('.quest-journal-header h2');
      if (journalTitle) {
        journalTitle.textContent = t('quest.ui.journal_title');
      }
      
      const tabs = {
        'active': this.overlayElement.querySelector('[data-tab="active"]'),
        'completed': this.overlayElement.querySelector('[data-tab="completed"]'),
        'available': this.overlayElement.querySelector('[data-tab="available"]')
      };
      
      Object.entries(tabs).forEach(([tabName, tabElement]) => {
        if (tabElement) {
          tabElement.textContent = t(`quest.ui.tab_${tabName}`);
        }
      });
      
      const refreshBtn = this.overlayElement.querySelector('#refresh-quests');
      if (refreshBtn) {
        refreshBtn.textContent = t('quest.ui.refresh_button');
      }
      
      const trackBtn = this.overlayElement.querySelector('#track-quest');
      if (trackBtn) {
        trackBtn.textContent = t('quest.ui.track_button');
      }
      
      console.log('✅ [QuestUI] Textes traduits mis à jour');
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur mise à jour langue:', error);
    }
  }
  
  getSafeTranslation(key, fallback) {
    try {
      const translation = t(key);
      return translation !== key ? translation : fallback;
    } catch (error) {
      return fallback;
    }
  }
  
  // === 🎨 STYLES (optimisés pour éviter les erreurs DOM) ===
  
  addStyles() {
    if (document.querySelector('#quest-ui-styles-v3')) return;
    
    const style = document.createElement('style');
    style.id = 'quest-ui-styles-v3';
    style.textContent = `
      /* ===== QUEST UI STYLES V3 - OPTIMISÉ ANTI-DÉCONNEXION ===== */
      
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
      
      /* 🛡️ NOUVEAU : Indicateur de protection réseau */
      div#quest-journal .network-protection-indicator {
        position: absolute !important;
        top: 5px !important;
        right: 50px !important;
        width: 10px !important;
        height: 10px !important;
        border-radius: 50% !important;
        background: #28a745 !important;
        transition: all 0.3s ease !important;
        z-index: 1001 !important;
      }
      
      div#quest-journal .network-protection-indicator.cooldown {
        background: #ffc107 !important;
        animation: networkCooldown 1s ease-in-out infinite !important;
      }
      
      div#quest-journal .network-protection-indicator.blocked {
        background: #dc3545 !important;
        animation: networkBlocked 0.5s ease-in-out infinite !important;
      }
      
      @keyframes networkCooldown {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes networkBlocked {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
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
        position: relative !important;
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
      
      div#quest-journal .quest-item.completed {
        background: rgba(34, 197, 94, 0.15) !important;
        border-left-color: #22c55e !important;
      }
      
      div#quest-journal .quest-item.completed:hover {
        background: rgba(34, 197, 94, 0.25) !important;
      }
      
      div#quest-journal .quest-item-title {
        font-weight: bold !important;
        font-size: 14px !important;
        margin-bottom: 4px !important;
        color: #fff !important;
      }
      
      div#quest-journal .quest-item.completed .quest-item-title {
        color: #22c55e !important;
      }
      
      div#quest-journal .quest-item-progress {
        font-size: 12px !important;
        color: #ccc !important;
      }
      
      div#quest-journal .quest-item.completed .quest-item-progress {
        color: #22c55e !important;
        font-weight: bold !important;
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
      
      div#quest-journal .quest-title.completed {
        color: #22c55e !important;
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
      
      /* Section finale pour quête terminée */
      div#quest-journal .quest-completed-section {
        background: linear-gradient(145deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1)) !important;
        border: 2px solid rgba(34, 197, 94, 0.3) !important;
        border-radius: 12px !important;
        padding: 20px !important;
        margin: 15px 0 !important;
        text-align: center !important;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.15) !important;
      }
      
      div#quest-journal .quest-completed-icon {
        font-size: 24px !important;
        margin-bottom: 8px !important;
        display: block !important;
        opacity: 0.9 !important;
      }
      
      div#quest-journal .quest-completed-title {
        font-size: 16px !important;
        font-weight: bold !important;
        color: #22c55e !important;
        margin-bottom: 6px !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
      }
      
      div#quest-journal .quest-completed-message {
        font-size: 13px !important;
        color: #86efac !important;
        line-height: 1.4 !important;
        margin-bottom: 12px !important;
      }
      
      div#quest-journal .quest-completion-rewards {
        background: rgba(0, 0, 0, 0.2) !important;
        border-radius: 8px !important;
        padding: 12px !important;
        margin-top: 10px !important;
      }
      
      div#quest-journal .quest-rewards-title {
        font-size: 12px !important;
        color: #fbbf24 !important;
        font-weight: bold !important;
        margin-bottom: 8px !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
      }
      
      div#quest-journal .quest-rewards-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        justify-content: center !important;
      }
      
      div#quest-journal .quest-reward-item {
        background: rgba(59, 130, 246, 0.2) !important;
        border: 1px solid rgba(59, 130, 246, 0.4) !important;
        border-radius: 6px !important;
        padding: 6px 10px !important;
        font-size: 12px !important;
        color: #93c5fd !important;
        font-weight: 500 !important;
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
      
      /* Gestion avancée des objectifs complétés (optimisée) */
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
        position: relative !important;
      }
      
      div#quest-journal .quest-btn:hover:not(:disabled) {
        background: rgba(100, 149, 237, 0.5) !important;
        transform: translateY(-1px) !important;
      }
      
      div#quest-journal .quest-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      
      /* 🛡️ NOUVEAU : Indicateur de cooldown sur boutons */
      div#quest-journal .quest-btn.on-cooldown {
        pointer-events: none !important;
        opacity: 0.6 !important;
        position: relative !important;
      }
      
      div#quest-journal .quest-btn.on-cooldown::after {
        content: "" !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) var(--progress, 0%), transparent var(--progress, 0%)) !important;
        border-radius: 8px !important;
        animation: cooldownProgress 2s linear !important;
      }
      
      @keyframes cooldownProgress {
        0% { --progress: 0%; }
        100% { --progress: 100%; }
      }
      
      /* ===== QUEST TRACKER V3 - OPTIMISÉ ===== */
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
      
      div#quest-tracker .tracked-quest.completed {
        background: rgba(34, 197, 94, 0.1) !important;
        border-left-color: #22c55e !important;
      }
      
      div#quest-tracker .tracked-quest.completed:hover {
        background: rgba(34, 197, 94, 0.15) !important;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important;
      }
      
      div#quest-tracker .quest-name {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #fff !important;
        margin-bottom: 4px !important;
        line-height: 1.2 !important;
      }
      
      div#quest-tracker .tracked-quest.completed .quest-name {
        color: #22c55e !important;
      }
      
      div#quest-tracker .quest-objectives {
        margin-top: 6px !important;
      }
      
      /* Message spécial pour quête terminée dans tracker */
      div#quest-tracker .quest-completed-message {
        font-size: 12px !important;
        color: #22c55e !important;
        font-weight: bold !important;
        text-align: center !important;
        padding: 8px !important;
        background: rgba(34, 197, 94, 0.1) !important;
        border-radius: 6px !important;
        margin-top: 6px !important;
        animation: completedGlow 2s ease-in-out infinite !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
      }
      
      div#quest-tracker .quest-completed-message:hover {
        background: rgba(34, 197, 94, 0.2) !important;
        transform: scale(1.02) !important;
      }
      
      div#quest-tracker .quest-completed-message:before {
        content: "💬 " !important;
      }
      
      @keyframes completedGlow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.02); }
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
      
      /* Gestion avancée des objectifs dans le tracker (optimisée) */
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
      
      /* 🛡️ NOUVEAU : État de refresh du tracker (optimisé) */
      div#quest-tracker.refreshing {
        opacity: 0.8 !important;
      }
      
      div#quest-tracker.refreshing::after {
        content: "" !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 16px !important;
        height: 16px !important;
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
    console.log('🎨 [QuestUI] Styles V3 optimisés anti-déconnexion appliqués');
  }
  
  // === 🏗️ CRÉATION INTERFACES (avec indicateurs de protection) ===
  
  createJournalInterface() {
    const existing = document.querySelector('#quest-journal');
    if (existing) existing.remove();
    
    const journal = document.createElement('div');
    journal.id = 'quest-journal';
    journal.className = 'quest-journal hidden';
    
    journal.innerHTML = `
      <div class="quest-journal-header">
        <h2>${this.getSafeTranslation('quest.ui.journal_title', 'Journal des Quêtes')}</h2>
        <div class="network-protection-indicator" id="network-indicator" title="Protection réseau"></div>
        <button class="quest-close-btn" id="close-quest-journal">✕</button>
      </div>
      
      <div class="quest-tabs">
        <button class="quest-tab active" data-tab="active">${this.getSafeTranslation('quest.ui.tab_active', 'Actives')}</button>
        <button class="quest-tab" data-tab="completed">${this.getSafeTranslation('quest.ui.tab_completed', 'Terminées')}</button>
        <button class="quest-tab" data-tab="available">${this.getSafeTranslation('quest.ui.tab_available', 'Disponibles')}</button>
      </div>
      
      <div class="quest-content">
        <div class="quest-list" id="quest-list">
          <div class="quest-empty">${this.getSafeTranslation('quest.ui.no_active_quests', 'Aucune quête active')}</div>
        </div>
        
        <div class="quest-details" id="quest-details">
          <div class="quest-empty">${this.getSafeTranslation('quest.ui.select_quest', 'Sélectionnez une quête pour voir les détails')}</div>
        </div>
      </div>
      
      <div class="quest-actions">
        <button id="refresh-quests" class="quest-btn">${this.getSafeTranslation('quest.ui.refresh_button', 'Actualiser')}</button>
        <button id="track-quest" class="quest-btn" disabled>${this.getSafeTranslation('quest.ui.track_button', 'Suivre')}</button>
      </div>
    `;
    
    document.body.appendChild(journal);
    this.overlayElement = journal;
    
    console.log('🎨 [QuestUI] Journal créé avec protection réseau');
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
          <span class="tracker-text">${this.getSafeTranslation('quest.ui.tracker_title', 'Quêtes')}</span>
        </div>
        <div class="tracker-controls">
          <button class="tracker-btn minimize-btn" title="${this.getSafeTranslation('quest.ui.minimize', 'Minimiser')}">-</button>
          <button class="tracker-btn close-btn" title="${this.getSafeTranslation('quest.ui.hide', 'Masquer')}">×</button>
        </div>
      </div>
      <div class="quest-tracker-content">
        <div class="tracked-quests" id="tracked-quests">
          <div class="quest-empty">${this.getSafeTranslation('quest.ui.no_active_quests', 'Aucune quête active')}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tracker);
    this.trackerElement = tracker;
    
    console.log('🎨 [QuestUI] Tracker créé avec protection réseau');
  }
  
  // === 🛡️ MÉTHODES VISUELLES DE PROTECTION ===
  
  /**
   * 🛡️ Mettre à jour l'indicateur visuel de protection réseau
   */
  updateNetworkProtectionIndicator(state = 'ok') {
    const indicator = this.overlayElement?.querySelector('#network-indicator');
    if (!indicator) return;
    
    // Nettoyer les classes précédentes
    indicator.classList.remove('cooldown', 'blocked');
    
    switch (state) {
      case 'cooldown':
        indicator.classList.add('cooldown');
        indicator.title = 'Cooldown réseau actif';
        break;
      case 'blocked':
        indicator.classList.add('blocked');
        indicator.title = 'Trop de requêtes - Bloqué';
        break;
      case 'ok':
      default:
        indicator.title = 'Protection réseau - OK';
        break;
    }
  }
  
  /**
   * 🛡️ Appliquer un cooldown visuel sur un bouton
   */
  applyCooldownToButton(buttonId, duration = 2000) {
    const button = this.overlayElement?.querySelector(`#${buttonId}`);
    if (!button) return;
    
    button.classList.add('on-cooldown');
    button.disabled = true;
    
    setTimeout(() => {
      button.classList.remove('on-cooldown');
      button.disabled = false;
    }, duration);
  }
  
  // === 🎛️ ÉVÉNEMENTS (avec protection réseau) ===
  
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
    
    // Actions boutons avec protection
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
    
    console.log('🎛️ [QuestUI] Événements configurés avec protection réseau');
  }
  
  setupActionButtons() {
    const buttons = {
      'refresh-quests': () => this.handleProtectedAction('refreshQuests'),
      'track-quest': () => this.handleProtectedAction('trackQuest', { questId: this.selectedQuest?.id })
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
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Gérer les actions avec protection réseau
   */
  handleProtectedAction(action, data = null) {
    console.log(`🛡️ [QuestUI] Action protégée: ${action}`);
    
    // Vérifier si on peut faire l'action
    if (!this.canMakeNetworkCall(action)) {
      this.updateNetworkProtectionIndicator('blocked');
      this.showProtectionMessage('Veuillez attendre avant de refaire cette action');
      return false;
    }
    
    // Appliquer cooldown visuel
    if (action === 'refreshQuests') {
      this.applyCooldownToButton('refresh-quests', this.networkProtection.refreshCooldown);
      this.updateNetworkProtectionIndicator('cooldown');
    }
    
    // Utiliser le debouncing pour éviter les appels multiples
    this.debouncedNetworkCall(action, () => {
      this.updateNetworkProtectionIndicator('ok');
      this.handleAction(action, data);
    }, action === 'refreshQuests' ? 500 : 100);
    
    return true;
  }
  
  /**
   * 🛡️ Afficher un message de protection
   */
  showProtectionMessage(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'warning', { duration: 2000 });
    } else {
      console.warn(`🛡️ [QuestUI] ${message}`);
    }
  }
  
  // === 🎛️ CONTRÔLES PRINCIPAUX (inchangés) ===
  
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
        minimizeBtn.title = isMinimized ? 
          this.getSafeTranslation('quest.ui.minimize', 'Minimiser') : 
          this.getSafeTranslation('quest.ui.maximize', 'Maximiser');
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
    
    // Charger données avec protection
    switch (viewName) {
      case 'active':
        this.refreshQuestList();
        break;
      case 'completed':
        this.refreshQuestList();
        break;
      case 'available':
        this.handleProtectedAction('getAvailableQuests');
        break;
    }
    
    console.log(`✅ [QuestUI] Vue ${viewName} activée`);
  }
  
  // === 📊 GESTION DONNÉES AVEC PROGRESSION AUTOMATIQUE (optimisée) ===
  
  updateQuestData(quests, type = 'active') {
    console.log(`📊 [QuestUI] Données ${type}:`, quests);
    
    // 🛡️ Marquer la fin du refresh en cours
    this.networkProtection.isRefreshing = false;
    
    switch (type) {
      case 'active':
        this.activeQuests = Array.isArray(quests) ? quests : [];
        if (this.currentView === 'active') {
          this.refreshQuestList();
        }
        // Toujours mettre à jour le tracker, mais avec protection
        this.updateTrackerIntelligentProtected();
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
  
  // 🛡️ MÉTHODE CRITIQUE : Vérifier si quête terminée (optimisée)
  isQuestCompleted(quest) {
    if (!quest) return false;
    
    // Méthode 1: Vérifier le status
    if (quest.status === 'completed' || quest.status === 'finished') {
      return true;
    }
    
    // Méthode 2: Vérifier l'étape actuelle vs total
    if (quest.steps && Array.isArray(quest.steps)) {
      const totalSteps = quest.steps.length;
      const currentStepIndex = quest.currentStepIndex ?? 0;
      
      return currentStepIndex >= totalSteps;
    }
    
    // Méthode 3: Vérifier si tous les objectifs de l'étape actuelle sont complétés
    const currentStep = quest.steps?.[quest.currentStepIndex];
    if (currentStep && currentStep.objectives) {
      const allCompleted = currentStep.objectives.every(obj => obj.completed);
      const isLastStep = (quest.currentStepIndex ?? 0) >= (quest.steps?.length - 1 ?? 0);
      
      if (allCompleted && isLastStep) {
        console.log(`🎉 [QuestUI] Quête ${quest.id} terminée (tous objectifs dernière étape complétés)`);
        return true;
      }
    }
    
    return false;
  }
  
  // 🛡️ MÉTHODE CRITIQUE : Tracker intelligent avec protection réseau
  updateTrackerIntelligentProtected() {
    // Éviter les mises à jour trop fréquentes
    const now = Date.now();
    if (now - this.progressionState.lastProgressionTime < this.progressionState.progressionCooldown) {
      console.log('🛡️ [QuestUI] Tracker update ignoré (cooldown progression)');
      return;
    }
    
    this.progressionState.lastProgressionTime = now;
    this.updateTrackerIntelligent();
  }
  
  updateTrackerIntelligent() {
    console.log(`📊 [QuestUI] Update tracker intelligent - ${this.activeQuests.length} quêtes actives`);
    
    const container = this.trackerElement?.querySelector('#tracked-quests');
    if (!container) {
      console.warn('⚠️ [QuestUI] Container tracker non trouvé');
      return;
    }
    
    const questsToTrack = this.activeQuests.slice(0, this.maxTrackedQuests);
    
    // Gestion intelligente de l'affichage/masquage
    if (questsToTrack.length === 0) {
      console.log('📊 [QuestUI] Aucune quête active - masquage tracker');
      container.innerHTML = `<div class="quest-empty">${this.getSafeTranslation('quest.ui.no_active_quests', 'Aucune quête active')}</div>`;
      this.hideTracker();
      return;
    }
    
    console.log(`📊 [QuestUI] ${questsToTrack.length} quêtes actives - affichage tracker`);
    this.showTracker();
    
    // Nettoyage des animations en cours
    this.cleanupAnimatingObjectives();
    
    // Génération intelligente du HTML
    container.innerHTML = questsToTrack.map((quest, index) => {
      const isCompleted = this.isQuestCompleted(quest);
      
      return `
        <div class="tracked-quest ${isCompleted ? 'completed' : ''}" data-quest-id="${quest.id}">
          <div class="quest-name">${quest.name}</div>
          <div class="quest-objectives">
            ${this.renderTrackerObjectivesIntelligent(quest)}
          </div>
        </div>
      `;
    }).join('');
    
    // Event listeners pour cliquer sur tracker
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
  
  // Rendu intelligent des objectifs avec gestion quête terminée
  renderTrackerObjectivesIntelligent(quest) {
    const isCompleted = this.isQuestCompleted(quest);
    
    // Si quête terminée, afficher message "Parler à [NPC]"
    if (isCompleted) {
      const turnInMessage = this.generateTurnInMessage(quest);
      return `<div class="quest-completed-message">${turnInMessage}</div>`;
    }
    
    const currentStep = quest.steps?.[quest.currentStepIndex];
    if (!currentStep || !currentStep.objectives) {
      if (currentStep && currentStep.description) {
        return `<div class="quest-objective">${currentStep.description}</div>`;
      }
      return `<div class="quest-objective">${this.getSafeTranslation('quest.ui.no_objectives', 'Aucun objectif disponible')}</div>`;
    }
    
    return currentStep.objectives.map((objective, objIndex) => {
      const isObjCompleted = objective.completed;
      const current = objective.currentAmount || 0;
      const required = objective.requiredAmount || 1;
      const objId = `${quest.id}-${quest.currentStepIndex}-${objIndex}`;
      
      let objectiveClass = 'quest-objective';
      if (isObjCompleted) {
        objectiveClass += ' completed';
      }
      
      // Vérifier si cet objectif est en cours d'animation
      if (this.progressionState.animatingObjectives.has(objId)) {
        objectiveClass += ' just-completed';
      }
      
      let objectiveText = objective.description || this.getSafeTranslation('quest.ui.unknown_objective', 'Objectif inconnu');
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
  
  // === 🎯 MÉTHODE PRINCIPALE : Animation d'objectif complété avec protection ===
  
  highlightObjectiveAsCompleted(result) {
    console.log('🟢 [QuestUI] === DÉBUT ANIMATION OBJECTIF COMPLÉTÉ (PROTÉGÉE) ===');
    console.log('📊 Données reçues:', result);
    
    try {
      // 🛡️ Vérifier cooldown d'animation
      const now = Date.now();
      if (now - this.progressionState.lastProgressionTime < this.progressionState.progressionCooldown) {
        console.log('🛡️ [QuestUI] Animation ignorée (cooldown progression)');
        // Au lieu d'ignorer, programmer pour plus tard
        this.scheduleDelayedObjectiveAnimation(result, this.progressionState.progressionCooldown - (now - this.progressionState.lastProgressionTime));
        return false;
      }
      
      this.progressionState.lastProgressionTime = now;
      
      // Identifier l'objectif à animer
      const objectiveInfo = this.identifyCompletedObjective(result);
      if (!objectiveInfo.found) {
        console.warn('⚠️ [QuestUI] Objectif non identifié, refresh protégé programmé');
        this.scheduleProtectedRefresh(1500, 'objectif_non_trouve');
        return false;
      }
      
      console.log('✅ [QuestUI] Objectif identifié:', objectiveInfo);
      
      // Marquer comme en cours d'animation
      const objId = objectiveInfo.objectiveId;
      this.progressionState.animatingObjectives.add(objId);
      
      // Appliquer l'animation sur tous les éléments trouvés
      objectiveInfo.elements.forEach(element => {
        console.log('🎨 [QuestUI] Application animation sur:', element);
        this.applyCompletedObjectiveAnimation(element);
      });
      
      // Programmer la progression automatique PROTÉGÉE
      this.scheduleProtectedObjectiveProgression(objId, objectiveInfo, result);
      
      return true;
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur animation objectif:', error);
      this.scheduleProtectedRefresh(2000, 'erreur_animation');
      return false;
    }
  }
  
  /**
   * 🛡️ NOUVELLE MÉTHODE : Programmer une animation retardée
   */
  scheduleDelayedObjectiveAnimation(result, delay) {
    console.log(`⏰ [QuestUI] Animation programmée dans ${delay}ms`);
    
    setTimeout(() => {
      this.highlightObjectiveAsCompleted(result);
    }, delay);
  }
  
  // Helper : Identifier l'objectif complété
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
  
  // Helper : Application de l'animation
  applyCompletedObjectiveAnimation(element) {
    element.classList.remove('completed', 'just-completed', 'fading-out', 'disappearing');
    element.classList.add('just-completed');
    console.log('🎨 [QuestUI] Animation "just-completed" appliquée');
  }
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Programmer la progression automatique PROTÉGÉE
   */
  scheduleProtectedObjectiveProgression(objectiveId, objectiveInfo, result) {
    console.log(`⏰ [QuestUI] Programmation progression PROTÉGÉE pour objectif ${objectiveId}`);
    
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
    
    // Phase 3: Progression automatique PROTÉGÉE à 2000ms
    setTimeout(() => {
      console.log('🔄 [QuestUI] Phase 3 - Progression automatique PROTÉGÉE');
      
      // Nettoyer l'animation
      this.cleanupObjectiveAnimation(objectiveId, objectiveInfo.elements);
      
      // Déclencher le refresh PROTÉGÉ
      this.scheduleProtectedRefresh(0, 'progression_automatique');
      
    }, 2000);
  }
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Refresh protégé avec debouncing intelligent
   */
  scheduleProtectedRefresh(delay = 0, reason = 'manuel') {
    console.log(`🛡️ [QuestUI] Refresh PROTÉGÉ programmé - délai: ${delay}ms, raison: ${reason}`);
    
    // Utiliser le système de debouncing pour éviter les appels multiples
    this.debouncedNetworkCall('autoRefresh', () => {
      this.executeProtectedRefresh(reason);
    }, Math.max(delay, 1000)); // Minimum 1 seconde de délai
  }
  
  /**
   * 🛡️ MÉTHODE CRITIQUE : Exécution du refresh protégé
   */
  executeProtectedRefresh(reason) {
    console.log(`🛡️ [QuestUI] Exécution refresh PROTÉGÉ - raison: ${reason}`);
    
    try {
      // Marquer le tracker comme en cours de refresh (visuel seulement)
      if (this.trackerElement) {
        this.trackerElement.classList.add('refreshing');
      }
      
      // 🛡️ MÉTHODE 1 UNIQUE : Via le système d'actions (sans spam)
      if (this.onAction) {
        this.onAction('refreshQuests', { 
          source: 'progression_automatique_protegee',
          reason: reason,
          timestamp: Date.now()
        });
      }
      
      // 🛡️ FALLBACK UNIQUE avec délai plus long pour éviter le spam
      setTimeout(() => {
        if (this.networkProtection.pendingRefresh && window.questSystem) {
          console.log('🔄 [QuestUI] Fallback unique via QuestSystem');
          window.questSystem.requestActiveQuests();
        }
      }, 2000); // 2 secondes au lieu de 500ms
      
      // Cleanup après 5 secondes max
      setTimeout(() => {
        this.finishProtectedRefresh();
      }, 5000);
      
    } catch (error) {
      console.error('❌ [QuestUI] Erreur refresh protégé:', error);
      this.finishProtectedRefresh();
    }
  }
  
  /**
   * 🛡️ Finalisation du refresh protégé
   */
  finishProtectedRefresh() {
    console.log('✅ [QuestUI] Finalisation refresh protégé');
    
    this.networkProtection.pendingRefresh = false;
    
    if (this.trackerElement) {
      this.trackerElement.classList.remove('refreshing');
    }
  }
  
  // Helper : Nettoyage de l'animation
  cleanupObjectiveAnimation(objectiveId, elements) {
    console.log(`🧹 [QuestUI] Nettoyage animation objectif ${objectiveId}`);
    
    this.progressionState.animatingObjectives.delete(objectiveId);
    
    elements.forEach(element => {
      element.classList.remove('just-completed', 'fading-out');
      element.classList.add('disappearing');
      
      setTimeout(() => {
        if (element.parentNode) {
          element.style.display = 'none';
        }
      }, 500);
    });
  }
  
  // Helper : Nettoyage global des animations
  cleanupAnimatingObjectives() {
    if (this.progressionState.animatingObjectives.size > 0) {
      console.log(`🧹 [QuestUI] Nettoyage ${this.progressionState.animatingObjectives.size} animations en cours`);
      this.progressionState.animatingObjectives.clear();
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
      const emptyMessage = this.getEmptyMessage(this.currentView);
      questList.innerHTML = `<div class="quest-empty">${emptyMessage}</div>`;
      this.updateQuestDetails(null);
      return;
    }
    
    questList.innerHTML = quests.map((quest, index) => {
      const progress = this.calculateQuestProgress(quest);
      const categoryClass = quest.category || 'side';
      const isCompleted = this.isQuestCompleted(quest);
      
      let progressText;
      if (isCompleted) {
        progressText = this.generateTurnInMessage(quest);
      } else {
        progressText = `${progress.completed}/${progress.total} ${this.getSafeTranslation('quest.ui.objectives_label', 'objectifs')}`;
      }
      
      return `
        <div class="quest-item ${isCompleted ? 'completed' : ''}" data-quest-index="${index}">
          <div class="quest-item-title">${quest.name || this.getSafeTranslation('quest.ui.unnamed_quest', 'Quête sans nom')}</div>
          <div class="quest-item-progress">${progressText}</div>
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
  
  getEmptyMessage(view) {
    const messages = {
      'active': this.getSafeTranslation('quest.ui.no_active_quests', 'Aucune quête active'),
      'completed': this.getSafeTranslation('quest.ui.no_completed_quests', 'Aucune quête terminée'),
      'available': this.getSafeTranslation('quest.ui.no_available_quests', 'Aucune quête disponible')
    };
    
    return messages[view] || messages['active'];
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
      detailsContainer.innerHTML = `<div class="quest-empty">${this.getSafeTranslation('quest.ui.select_quest', 'Sélectionnez une quête pour voir les détails')}</div>`;
      return;
    }
    
    const isCompleted = this.isQuestCompleted(quest);
    
    detailsContainer.innerHTML = `
      <div class="quest-details-content">
        <div class="quest-title ${isCompleted ? 'completed' : ''}">${quest.name || this.getSafeTranslation('quest.ui.unnamed_quest', 'Quête sans nom')}</div>
        <div class="quest-description">${quest.description || this.getSafeTranslation('quest.ui.no_description', 'Pas de description')}</div>
        
        ${isCompleted ? this.renderCompletedQuestSection(quest) : ''}
        
        ${quest.steps ? quest.steps.map((step, index) => {
          const isCurrent = index === quest.currentStepIndex;
          const isStepCompleted = index < quest.currentStepIndex;
          const stepClass = isStepCompleted ? 'completed' : (isCurrent ? 'current' : '');
          
          if (isCompleted && !isStepCompleted && !isCurrent) {
            return '';
          }
          
          return `
            <div class="quest-step ${stepClass}">
              <div class="quest-step-title">${step.name || `${this.getSafeTranslation('quest.ui.step_label', 'Étape')} ${index + 1}`}</div>
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
                    ${obj.description || this.getSafeTranslation('quest.ui.unknown_objective', 'Objectif')} (${progress}/${obj.requiredAmount || 1})
                  </div>
                `;
              }).join('') : ''}
            </div>
          `;
        }).join('') : ''}
      </div>
    `;
  }
  
  generateTurnInMessage(quest) {
    let npcName = null;
    
    if (quest.turnInNpc) {
      npcName = quest.turnInNpc.name || quest.turnInNpc;
    } else if (quest.endNpc) {
      npcName = quest.endNpc.name || quest.endNpc;
    } else if (quest.npc) {
      npcName = quest.npc.name || quest.npc;
    } else if (quest.giver) {
      npcName = quest.giver.name || quest.giver;
    } else if (quest.metadata) {
      npcName = quest.metadata.turnInNpc || quest.metadata.questGiver || quest.metadata.npcName;
    }
    
    if (!npcName && quest.id) {
      const questIdParts = quest.id.split('_');
      if (questIdParts.length > 0) {
        const possibleNpcName = questIdParts[0];
        npcName = possibleNpcName.charAt(0).toUpperCase() + possibleNpcName.slice(1);
      }
    }
    
    if (!npcName) {
      npcName = this.getSafeTranslation('quest.ui.quest_giver', 'Donneur de quête');
    }
    
    const talkToText = this.getSafeTranslation('quest.ui.talk_to', 'Parler à');
    return `${talkToText} ${npcName}`;
  }
  
  renderCompletedQuestSection(quest) {
    const rewards = this.extractQuestRewards(quest);
    const turnInMessage = this.generateTurnInMessage(quest);
    
    return `
      <div class="quest-completed-section">
        <span class="quest-completed-icon">💬</span>
        <div class="quest-completed-title">${turnInMessage}</div>
        <div class="quest-completed-message">${this.getSafeTranslation('quest.ui.ready_to_turn_in', 'Quête prête à être rendue.')}</div>
        
        ${rewards.length > 0 ? `
          <div class="quest-completion-rewards">
            <div class="quest-rewards-title">${this.getSafeTranslation('quest.ui.rewards_preview', 'Récompenses à Obtenir')}</div>
            <div class="quest-rewards-list">
              ${rewards.map(reward => `
                <div class="quest-reward-item">
                  ${this.getRewardIcon(reward.type)} ${reward.amount || 1} ${reward.name || reward.type}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  extractQuestRewards(quest) {
    if (quest.rewards && Array.isArray(quest.rewards)) {
      return quest.rewards;
    }
    
    if (quest.completionRewards && Array.isArray(quest.completionRewards)) {
      return quest.completionRewards;
    }
    
    return [
      { type: 'experience', name: this.getSafeTranslation('quest.ui.experience_points', 'Points d\'expérience'), amount: 100 },
      { type: 'gold', name: this.getSafeTranslation('quest.ui.gold_coins', 'Pièces d\'or'), amount: 50 }
    ];
  }
  
  getRewardIcon(rewardType) {
    const icons = {
      'gold': '🪙',
      'experience': '⭐',
      'xp': '⭐',
      'item': '📦',
      'money': '🪙',
      'pokemon': '🔴',
      'badge': '🏆',
      'potion': '🧪',
      'berry': '🫐'
    };
    
    return icons[rewardType?.toLowerCase()] || '🎁';
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
    this.handleProtectedAction('refreshQuests');
  }
  
  // === 🔧 MÉTHODES DEBUG AVEC PROTECTION ===
  
  debugProgressionState() {
    console.log('🔍 [QuestUI] === DEBUG ÉTAT PROGRESSION PROTÉGÉ ===');
    console.log('Protection réseau:', this.networkProtection);
    console.log('Objectifs en animation:', Array.from(this.progressionState.animatingObjectives));
    console.log('Dernière progression:', new Date(this.progressionState.lastProgressionTime));
    console.log('Quêtes actives:', this.activeQuests.length);
    console.log('Tracker visible:', this.isTrackerVisible);
    
    return {
      networkProtection: this.networkProtection,
      animatingObjectives: Array.from(this.progressionState.animatingObjectives),
      lastProgressionTime: this.progressionState.lastProgressionTime,
      activeQuests: this.activeQuests.length,
      trackerVisible: this.isTrackerVisible
    };
  }
  
  forceRefreshNow() {
    console.log('🛡️ [QuestUI] Force refresh PROTÉGÉ');
    // Reset les protections pour permettre un refresh immédiat
    this.networkProtection.lastRefreshTime = 0;
    this.networkProtection.refreshHistory = [];
    this.progressionState.lastProgressionTime = 0;
    this.handleProtectedAction('refreshQuests');
  }
  
  // Test quête terminée avec protection
  debugCompletedQuest() {
    console.log('🧪 [QuestUI] Test quête terminée PROTÉGÉ...');
    
    const completedQuest = {
      id: 'annie_gardening_gloves',
      name: 'Les Gants de Jardinage Perdus',
      description: 'Annie a perdu ses gants de jardinage près de la rivière. Rapportez-les lui.',
      status: 'completed',
      category: 'side',
      currentStepIndex: 2,
      turnInNpc: {
        id: 'annie_npc',
        name: 'Annie'
      },
      giver: 'Annie',
      steps: [
        {
          name: 'Chercher les gants',
          description: 'Trouvez les gants perdus près de la rivière',
          objectives: [
            { description: 'Fouiller près de la rivière sud-ouest', completed: true, currentAmount: 1, requiredAmount: 1 },
            { description: 'Ramasser les gants de jardinage', completed: true, currentAmount: 1, requiredAmount: 1 }
          ]
        },
        {
          name: 'Retourner voir Annie',
          description: 'Rapportez les gants à Annie',
          objectives: [
            { description: 'Parler à Annie', completed: true, currentAmount: 1, requiredAmount: 1 }
          ]
        }
      ],
      rewards: [
        { type: 'experience', name: 'Points d\'expérience', amount: 150 },
        { type: 'gold', name: 'Pièces d\'or', amount: 75 },
        { type: 'item', name: 'Potion de soin', amount: 2 }
      ]
    };
    
    this.activeQuests.push(completedQuest);
    
    if (this.isVisible) {
      this.refreshQuestList();
    }
    this.updateTrackerIntelligentProtected();
    
    console.log('✅ [QuestUI] Quête terminée avec NPC "Annie" ajoutée (protégée)');
    console.log('💬 Message turn-in:', this.generateTurnInMessage(completedQuest));
    
    return completedQuest;
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestUI] Destruction avec nettoyage protection réseau...');
    
    // Nettoyer listener langue
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    // Nettoyer animations en cours
    this.cleanupAnimatingObjectives();
    
    // 🛡️ Nettoyer timeouts de protection réseau
    this.networkProtection.debounceTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.networkProtection.debounceTimeouts.clear();
    
    // Nettoyer dialogue
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
    const styles = document.querySelector('#quest-ui-styles-v3');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.trackerElement = null;
    this.currentDialog = null;
    this.isVisible = false;
    this.activeQuests = [];
    this.selectedQuest = null;
    this.onAction = null;
    this.optionsManager = null;
    
    // 🛡️ Reset protection réseau
    this.networkProtection = {
      lastRefreshTime: 0,
      refreshCooldown: 2000,
      maxRefreshPerMinute: 10,
      refreshHistory: [],
      isRefreshing: false,
      pendingRefresh: false,
      debounceTimeouts: new Map()
    };
    
    this.progressionState = {
      animatingObjectives: new Set(),
      lastProgressionTime: 0,
      progressionCooldown: 500,
      pendingAnimations: new Map()
    };
    
    console.log('✅ [QuestUI] Détruit avec nettoyage complet protection réseau');
  }
}

// === 🧪 FONCTIONS DEBUG GLOBALES PROTÉGÉES ===

window.testCompletedQuestProtected = function() {
  console.log('🧪 Test quête terminée PROTÉGÉ...');
  
  if (window.questSystem && window.questSystem.ui) {
    return window.questSystem.ui.debugCompletedQuest();
  } else {
    console.error('❌ QuestUI non disponible');
    return null;
  }
};

window.simulateQuestCompletionProtected = function(questId = 'lost_gardening_gloves') {
  console.log(`🧪 Simulation fin de quête PROTÉGÉE: ${questId}...`);
  
  if (window.questSystem && window.questSystem.ui) {
    const ui = window.questSystem.ui;
    
    const quest = ui.activeQuests.find(q => q.id === questId);
    if (!quest) {
      console.error(`❌ Quête ${questId} non trouvée`);
      return false;
    }
    
    quest.status = 'completed';
    if (quest.steps) {
      quest.currentStepIndex = quest.steps.length;
    }
    
    if (!quest.rewards) {
      quest.rewards = [
        { type: 'experience', name: 'Points d\'expérience', amount: 200 },
        { type: 'gold', name: 'Pièces d\'or', amount: 100 }
      ];
    }
    
    // Mise à jour PROTÉGÉE
    ui.updateTrackerIntelligentProtected();
    if (ui.isVisible) {
      ui.refreshQuestList();
      if (ui.selectedQuest && ui.selectedQuest.id === questId) {
        ui.updateQuestDetails(quest);
      }
    }
    
    console.log(`✅ Quête ${questId} marquée comme terminée (PROTÉGÉ)`);
    return quest;
    
  } else {
    console.error('❌ QuestUI non disponible');
    return false;
  }
};

window.debugQuestUIProtected = function() {
  console.log('🔍 === DEBUG QUEST UI PROTÉGÉ ===');
  
  if (window.questSystem && window.questSystem.ui) {
    const ui = window.questSystem.ui;
    
    console.log('📊 État général:', ui.debugProgressionState());
    console.log('📋 Quêtes actives:', ui.activeQuests.length);
    
    ui.activeQuests.forEach((quest, index) => {
      const isCompleted = ui.isQuestCompleted(quest);
      console.log(`   ${index + 1}. ${quest.name} - ${isCompleted ? '✅ TERMINÉE' : '🔄 EN COURS'}`);
    });
    
    console.log('🛡️ Protection réseau:', {
      cooldown: ui.networkProtection.refreshCooldown,
      dernierRefresh: new Date(ui.networkProtection.lastRefreshTime),
      quotaUtilise: ui.networkProtection.refreshHistory.length,
      quotaMax: ui.networkProtection.maxRefreshPerMinute,
      isRefreshing: ui.networkProtection.isRefreshing
    });
    
    console.log('🎮 Méthodes de test disponibles:');
    console.log('   - window.testCompletedQuestProtected() - Ajouter quête terminée test');
    console.log('   - window.simulateQuestCompletionProtected(questId) - Marquer quête comme terminée');
    
    return {
      state: ui.debugProgressionState(),
      activeQuests: ui.activeQuests.length,
      completedQuests: ui.activeQuests.filter(q => ui.isQuestCompleted(q)).length,
      networkProtection: ui.networkProtection
    };
    
  } else {
    console.error('❌ QuestUI non disponible');
    return null;
  }
};

console.log('✅ [QuestUI] Système OPTIMISÉ anti-déconnexion Colyseus chargé');
console.log('🛡️ Protection réseau: Debouncing + Cooldown + Quota par minute');
console.log('🧪 Tests protégés disponibles:');
console.log('   - window.testCompletedQuestProtected() - Test protégé quête terminée');
console.log('   - window.simulateQuestCompletionProtected(questId) - Simulation protégée');
console.log('   - window.debugQuestUIProtected() - Debug complet avec protection');

export default QuestUI;
