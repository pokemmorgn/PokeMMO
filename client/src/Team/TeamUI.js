// Team/TeamUI.js - Interface Team COMPLÈTE - RÉÉCRITURE FONCTIONNELLE
// 🎯 Toutes les fonctionnalités conservées, bugs CSS corrigés
// ✅ Fonctionnement normal garanti sans commandes manuelles

import { SpriteUtils, getPokemonPortraitStyle } from '../utils/SpriteUtils.js';
import { t } from '../managers/LocalizationManager.js';

export class TeamUI {
  constructor(teamManager, gameRoom, optionsManager = null) {
    this.teamManager = teamManager;
    this.gameRoom = gameRoom;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    
    // === DONNÉES AFFICHÉES ===
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.currentView = 'overview';
    
    // === LOCALIZATION ===
    this.pokemonLocalization = null;
    
    // === CALLBACKS ===
    this.onAction = null;
    
    // === CONTRÔLE ÉVÉNEMENTS ===
    this.escapeListenerAdded = false;
    this.currentTooltip = null;

    // === 🌐 LOCALIZATION ===
    this.optionsManager = optionsManager;
    this.cleanupLanguageListener = null;
    
    console.log('🎯 [TeamUI] Instance créée avec support traductions');
    
    // Charger la localization
    this.loadPokemonLocalization();
  }
  
  // === 🌐 CHARGEMENT LOCALIZATION ===
  
  async loadPokemonLocalization() {
    try {
      const response = await fetch('/localization/pokemon/gen1/en.json');
      if (response.ok) {
        this.pokemonLocalization = await response.json();
        console.log('🌐 [TeamUI] Localization Pokémon chargée');
      } else {
        console.warn('⚠️ [TeamUI] Impossible de charger la localization Pokémon');
      }
    } catch (error) {
      console.error('❌ [TeamUI] Erreur chargement localization:', error);
    }
  }
  
  // === 🔤 MÉTHODES LOCALIZATION ===
  
  getPokemonName(pokemonId, fallbackName = null) {
    if (this.pokemonLocalization && this.pokemonLocalization[pokemonId]) {
      return this.pokemonLocalization[pokemonId].name;
    }
    
    if (fallbackName && fallbackName.trim()) {
      return fallbackName;
    }
    
    return `Pokemon #${pokemonId || '?'}`;
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation interface...');
      
      this.loadRobustCSS();
      this.createInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Interface initialisée avec succès');
      return this;

      this.setupLanguageSupport();
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }

  // === 🌐 CONFIGURATION SUPPORT LANGUE ===

setupLanguageSupport() {
  // S'abonner aux changements de langue si optionsManager disponible
  if (this.optionsManager && typeof this.optionsManager.addLanguageListener === 'function') {
    console.log('🌐 [TeamUI] Configuration listener langue...');
    
    this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
      console.log('🔄 [TeamUI] Changement langue détecté');
      this.updateLanguage();
    });
    
    console.log('✅ [TeamUI] Listener langue configuré');
  } else {
    console.warn('⚠️ [TeamUI] OptionsManager non disponible - pas de mise à jour langue temps réel');
  }
  
  // Mise à jour initiale
  this.updateLanguage();
}

/**
 * Met à jour tous les textes selon la langue courante
 */
updateLanguage() {
  if (!this.overlayElement) return;
  
  console.log('🔄 [TeamUI] Mise à jour langue interface...');
  
  // Header
  const titleElement = this.overlayElement.querySelector('.team-title-text h2');
  if (titleElement) titleElement.textContent = t('team.ui.title');
  
  const subtitleElement = this.overlayElement.querySelector('.team-subtitle');
  if (subtitleElement) subtitleElement.textContent = t('team.ui.subtitle');
  
  const closeBtn = this.overlayElement.querySelector('.team-close-btn');
  if (closeBtn) closeBtn.title = t('team.ui.close');
  
  // Tabs
  const overviewTab = this.overlayElement.querySelector('[data-view="overview"] .tab-text');
  if (overviewTab) overviewTab.textContent = t('team.ui.tabs.overview');
  
  const detailsTab = this.overlayElement.querySelector('[data-view="details"] .tab-text');
  if (detailsTab) detailsTab.textContent = t('team.ui.tabs.details');
  
  // Overview section
  const teamTitle = this.overlayElement.querySelector('.slots-title span:last-child');
  if (teamTitle) teamTitle.textContent = t('team.ui.overview.team_title');
  
  const healBtn = this.overlayElement.querySelector('#heal-team-btn');
  if (healBtn) healBtn.innerHTML = `💊 ${t('team.ui.overview.heal_team')}`;
  
  const organizeBtn = this.overlayElement.querySelector('#organize-team-btn');
  if (organizeBtn) organizeBtn.innerHTML = `🔄 ${t('team.ui.overview.organize')}`;
  
  // Stats labels
  const statLabels = [
    { selector: '#avg-level', parent: true, key: 'team.ui.stats.avg_level' },
    { selector: '#total-hp', parent: true, key: 'team.ui.stats.total_hp' },
    { selector: '#battle-ready', parent: true, key: 'team.ui.stats.battle_ready' },
    { selector: '#alive-count', parent: true, key: 'team.ui.stats.alive_count' },
    { selector: '#team-complete', parent: true, key: 'team.ui.stats.team_complete' }
  ];
  
  statLabels.forEach(({ selector, parent, key }) => {
    const element = this.overlayElement.querySelector(selector);
    if (element && parent) {
      const labelElement = element.parentElement.querySelector('.stat-label');
      if (labelElement) labelElement.textContent = t(key);
    }
  });
  
  // Section titles
  const statsTitle = this.overlayElement.querySelector('.stats-section .section-title');
  if (statsTitle) statsTitle.textContent = t('team.ui.stats.title');
  
  const typesTitle = this.overlayElement.querySelectorAll('.stats-section .section-title')[1];
  if (typesTitle) typesTitle.textContent = t('team.ui.types.title');
  
  const actionsTitle = this.overlayElement.querySelectorAll('.stats-section .section-title')[2];
  if (actionsTitle) actionsTitle.textContent = t('team.ui.actions.title');
  
  const refreshBtn = this.overlayElement.querySelector('#refresh-team-btn .stat-label');
  if (refreshBtn) refreshBtn.innerHTML = `🔄 ${t('team.ui.actions.refresh')}`;
  
  // Details section
  const detailsTitle = this.overlayElement.querySelector('#team-details h3');
  if (detailsTitle) detailsTitle.textContent = t('team.ui.details.title');
  
  const noSelectionText = this.overlayElement.querySelector('#team-details p');
  if (noSelectionText) noSelectionText.textContent = t('team.ui.details.no_selection');
  
  // Mettre à jour les slots vides
  this.overlayElement.querySelectorAll('.empty-text').forEach(emptyText => {
    emptyText.textContent = t('team.ui.overview.slot_free');
  });
  
  // Re-calculer les stats pour mettre à jour "Oui/Non"
  this.updateStats();
  
  console.log('✅ [TeamUI] Langue interface mise à jour');
}
  
  // === 🎨 CSS ROBUSTE ET SANS CONFLITS ===
  
  loadRobustCSS() {
    // Supprimer l'ancien style
    const existing = document.querySelector('#team-ui-robust-styles');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'team-ui-robust-styles';
    style.textContent = `
      /* ===== TEAM UI - CSS ROBUSTE SANS CONFLITS ===== */
      
      /* Base overlay - Spécificité maximale */
      div#team-overlay.team-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.85) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 9999 !important;
        backdrop-filter: blur(8px) !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        transition: opacity 0.3s ease !important;
        box-sizing: border-box !important;
      }
      
      /* État caché - Force total */
      div#team-overlay.team-overlay.hidden {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        z-index: -1000 !important;
      }
      
      /* Container principal */
      div#team-overlay .team-container {
        width: 950px !important;
        height: 780px !important;
        min-width: 950px !important;
        max-width: 950px !important;
        min-height: 780px !important;
        max-height: 780px !important;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42) !important;
        border: 3px solid #4a90e2 !important;
        border-radius: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        color: white !important;
        font-family: 'Segoe UI', Arial, sans-serif !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      /* Header */
      div#team-overlay .team-header {
        background: linear-gradient(90deg, #4a90e2, #357abd) !important;
        padding: 15px 25px !important;
        border-radius: 17px 17px 0 0 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 2px solid #357abd !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      div#team-overlay .team-title {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        font-size: 20px !important;
        font-weight: bold !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
        flex: 1 !important;
        min-width: 0 !important;
      }
      
      div#team-overlay .team-icon {
        font-size: 32px !important;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) !important;
      }
      
      div#team-overlay .team-title-text h2 {
        margin: 0 !important;
        color: #ffffff !important;
        font-size: 22px !important;
        font-weight: bold !important;
      }
      
      div#team-overlay .team-subtitle {
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 13px !important;
        margin: 2px 0 0 0 !important;
        font-weight: 400 !important;
      }
      
      div#team-overlay .team-controls {
        display: flex !important;
        align-items: center !important;
        gap: 20px !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .team-stats-header {
        text-align: right !important;
        background: rgba(255, 255, 255, 0.1) !important;
        padding: 10px 15px !important;
        border-radius: 10px !important;
        font-size: 14px !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      div#team-overlay .team-count {
        font-size: 20px !important;
        font-weight: bold !important;
        color: #87ceeb !important;
        display: block !important;
      }
      
      div#team-overlay .team-status {
        font-size: 12px !important;
        margin-top: 3px !important;
        font-weight: 600 !important;
      }
      
      div#team-overlay .team-close-btn {
        background: rgba(220, 53, 69, 0.9) !important;
        border: 2px solid rgba(220, 53, 69, 0.5) !important;
        color: white !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        font-size: 20px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      div#team-overlay .team-close-btn:hover {
        background: rgba(220, 53, 69, 1) !important;
        border-color: rgba(220, 53, 69, 0.8) !important;
        transform: scale(1.1) !important;
      }
      
      /* Tabs */
      div#team-overlay .team-tabs {
        display: flex !important;
        gap: 0 !important;
        padding: 0 !important;
        background: rgba(0, 0, 0, 0.3) !important;
        border-bottom: 2px solid #357abd !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .team-tab {
        flex: 1 !important;
        padding: 15px 20px !important;
        background: none !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        border-bottom: 4px solid transparent !important;
      }
      
      div#team-overlay .team-tab:hover {
        background: rgba(74, 144, 226, 0.15) !important;
        color: #87ceeb !important;
      }
      
      div#team-overlay .team-tab.active {
        background: rgba(74, 144, 226, 0.25) !important;
        color: #87ceeb !important;
        border-bottom-color: #4a90e2 !important;
      }
      
      div#team-overlay .tab-icon {
        font-size: 18px !important;
        width: 22px !important;
        text-align: center !important;
      }
      
      /* Contenu principal */
      div#team-overlay .team-content {
        flex: 1 !important;
        display: flex !important;
        overflow: hidden !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Vues - Spécificité maximale pour éviter conflits */
      div#team-overlay .team-content .team-view {
        display: none !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      
      div#team-overlay .team-content .team-view.active {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100% !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Vue Overview */
      div#team-overlay .team-content #team-overview.active {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      div#team-overlay .team-overview-content {
        display: flex !important;
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Section slots */
      div#team-overlay .team-slots-section {
        width: 680px !important;
        min-width: 680px !important;
        max-width: 680px !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .slots-header {
        padding: 20px 25px 15px 25px !important;
        background: rgba(0, 0, 0, 0.2) !important;
        border-bottom: 1px solid #357abd !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .slots-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: #87ceeb !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      
      div#team-overlay .team-actions {
        display: flex !important;
        gap: 10px !important;
        margin-top: 10px !important;
      }
      
      div#team-overlay .action-btn {
        padding: 8px 16px !important;
        background: rgba(74, 144, 226, 0.8) !important;
        border: 1px solid rgba(74, 144, 226, 0.5) !important;
        border-radius: 8px !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
      }
      
      div#team-overlay .action-btn:hover {
        background: rgba(74, 144, 226, 1) !important;
        border-color: rgba(74, 144, 226, 0.8) !important;
        transform: translateY(-2px) !important;
      }
      
      div#team-overlay .action-btn.heal {
        background: rgba(40, 167, 69, 0.8) !important;
        border-color: rgba(40, 167, 69, 0.5) !important;
      }
      
      div#team-overlay .action-btn.heal:hover {
        background: rgba(40, 167, 69, 1) !important;
        border-color: rgba(40, 167, 69, 0.8) !important;
      }
      
      /* Grille des slots */
      div#team-overlay .team-slots-grid {
        flex: 1 !important;
        padding: 20px !important;
        overflow-y: auto !important;
        display: grid !important;
        grid-template-columns: repeat(3, 199px) !important;
        gap: 15px !important;
        align-content: start !important;
        justify-content: center !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Slots Pokémon */
      div#team-overlay .team-slot {
        background: rgba(0, 0, 255, 0.2) !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 15px !important;
        padding: 15px 12px !important;
        text-align: center !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        width: 170px !important;
        height: 170px !important;
        min-width: 170px !important;
        max-width: 170px !important;
        min-height: 170px !important;
        max-height: 170px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        position: relative !important;
        backdrop-filter: blur(5px) !important;
        flex-shrink: 0 !important;
        margin: 0 auto !important;
      }
      
      div#team-overlay .team-slot:hover {
        background: rgba(74, 144, 226, 0.2) !important;
        border-color: #4a90e2 !important;
        transform: translateY(-5px) !important;
        box-shadow: 0 10px 30px rgba(74, 144, 226, 0.4) !important;
      }
      
      div#team-overlay .team-slot.selected {
        background: rgba(74, 144, 226, 0.35) !important;
        border-color: #87ceeb !important;
        box-shadow: 0 0 25px rgba(74, 144, 226, 0.7) !important;
        transform: translateY(-3px) !important;
      }
      
      div#team-overlay .team-slot.empty {
        border-style: dashed !important;
        background: rgba(255, 255, 255, 0.04) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Numéro slot */
      div#team-overlay .slot-number {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        background: rgba(74, 144, 226, 0.9) !important;
        color: white !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 11px !important;
        font-weight: bold !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
      }
      
      /* Slot vide */
      div#team-overlay .empty-slot {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        opacity: 0.6 !important;
        height: 100% !important;
      }
      
      div#team-overlay .empty-icon {
        font-size: 28px !important;
        color: #4a90e2 !important;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) !important;
      }
      
      div#team-overlay .empty-text {
        font-size: 12px !important;
        color: rgba(255, 255, 255, 0.6) !important;
        text-align: center !important;
        font-weight: 500 !important;
      }
      
      /* Carte Pokémon */
      div#team-overlay .pokemon-card {
        height: 153px !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        justify-content: space-between !important;
        padding: 8px !important;
        box-sizing: border-box !important;
        background: transparent !important;
      }
      
      div#team-overlay .pokemon-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        margin-top: 15px !important;
        gap: 5px !important;
      }
      
      div#team-overlay .pokemon-name {
        font-weight: 700 !important;
        color: #ffffff !important;
        font-size: 14px !important;
        text-overflow: ellipsis !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        max-width: 100px !important;
        text-shadow: 1px 1px 3px rgba(0,0,0,0.6) !important;
        flex: 1 !important;
      }
      
      div#team-overlay .pokemon-level {
        background: linear-gradient(135deg, #4a90e2, #357abd) !important;
        color: white !important;
        padding: 4px 10px !important;
        border-radius: 10px !important;
        font-size: 11px !important;
        font-weight: bold !important;
        box-shadow: 0 3px 10px rgba(74, 144, 226, 0.5) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .pokemon-sprite {
        text-align: center !important;
        flex: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 8px 0 !important;
      }
      
      div#team-overlay .pokemon-portrait {
        width: 80px !important;
        height: 80px !important;
        border-radius: 12px !important;
        border: none !important;
        image-rendering: pixelated !important;
        box-shadow: 0 6px 15px rgba(0,0,0,0.4) !important;
        transition: all 0.3s ease !important;
        position: relative !important;
      }
      
      div#team-overlay .team-slot:hover .pokemon-portrait {
        transform: scale(1.08) !important;
        border-color: rgba(74, 144, 226, 0.7) !important;
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.5) !important;
      }
      
      /* Status Pokémon */
      div#team-overlay .pokemon-status {
        position: absolute !important;
        top: -5px !important;
        right: -5px !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        border: 2px solid white !important;
        background: #28a745 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      }
      
      div#team-overlay .pokemon-status.fainted {
        background: #dc3545 !important;
      }
      
      div#team-overlay .pokemon-status.status {
        background: #ffc107 !important;
      }
      
      /* Santé Pokémon */
      div#team-overlay .pokemon-health {
        margin-top: auto !important;
      }
      
      div#team-overlay .health-bar {
        width: 100% !important;
        height: 6px !important;
        background: rgba(0, 0, 0, 0.4) !important;
        border-radius: 3px !important;
        overflow: hidden !important;
        margin-bottom: 5px !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      div#team-overlay .health-fill {
        height: 100% !important;
        transition: width 0.5s ease !important;
        border-radius: 3px !important;
        position: relative !important;
      }
      
      div#team-overlay .health-fill.high { 
        background: linear-gradient(90deg, #28a745, #20c997) !important;
      }
      div#team-overlay .health-fill.medium { 
        background: linear-gradient(90deg, #ffc107, #fd7e14) !important;
      }
      div#team-overlay .health-fill.low { 
        background: linear-gradient(90deg, #fd7e14, #dc3545) !important;
      }
      div#team-overlay .health-fill.critical { 
        background: linear-gradient(90deg, #dc3545, #6f42c1) !important;
        animation: healthCritical 0.5s infinite alternate !important;
      }
      
      @keyframes healthCritical {
        from { opacity: 0.7; }
        to { opacity: 1; }
      }
      
      div#team-overlay .health-text {
        font-size: 10px !important;
        text-align: center !important;
        color: rgba(255, 255, 255, 0.9) !important;
        font-weight: 600 !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
      }
      
      /* Types Pokémon */
      div#team-overlay .pokemon-types {
        display: flex !important;
        gap: 4px !important;
        justify-content: center !important;
        margin-top: 6px !important;
        flex-wrap: wrap !important;
      }
      
      div#team-overlay .type-badge {
        padding: 2px 6px !important;
        border-radius: 6px !important;
        font-size: 9px !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
      }
      
      /* Types avec couleurs */
      div#team-overlay .type-badge.type-fire { background: linear-gradient(135deg, #ff6347, #ff4500) !important; }
      div#team-overlay .type-badge.type-water { background: linear-gradient(135deg, #1e90ff, #0066cc) !important; }
      div#team-overlay .type-badge.type-grass { background: linear-gradient(135deg, #32cd32, #228b22) !important; }
      div#team-overlay .type-badge.type-electric { background: linear-gradient(135deg, #ffd700, #ffb347) !important; color: #333 !important; }
      div#team-overlay .type-badge.type-psychic { background: linear-gradient(135deg, #ff69b4, #da70d6) !important; }
      div#team-overlay .type-badge.type-ice { background: linear-gradient(135deg, #87ceeb, #4682b4) !important; }
      div#team-overlay .type-badge.type-dragon { background: linear-gradient(135deg, #9370db, #663399) !important; }
      div#team-overlay .type-badge.type-dark { background: linear-gradient(135deg, #2f4f4f, #1c1c1c) !important; }
      div#team-overlay .type-badge.type-fairy { background: linear-gradient(135deg, #ffb6c1, #ff69b4) !important; color: #333 !important; }
      div#team-overlay .type-badge.type-normal { background: linear-gradient(135deg, #d3d3d3, #a9a9a9) !important; color: #333 !important; }
      div#team-overlay .type-badge.type-fighting { background: linear-gradient(135deg, #cd853f, #8b4513) !important; }
      div#team-overlay .type-badge.type-poison { background: linear-gradient(135deg, #9932cc, #663399) !important; }
      div#team-overlay .type-badge.type-ground { background: linear-gradient(135deg, #daa520, #b8860b) !important; color: #333 !important; }
      div#team-overlay .type-badge.type-flying { background: linear-gradient(135deg, #87ceeb, #6495ed) !important; }
      div#team-overlay .type-badge.type-bug { background: linear-gradient(135deg, #9acd32, #6b8e23) !important; }
      div#team-overlay .type-badge.type-rock { background: linear-gradient(135deg, #a0522d, #8b4513) !important; }
      div#team-overlay .type-badge.type-ghost { background: linear-gradient(135deg, #9370db, #483d8b) !important; }
      div#team-overlay .type-badge.type-steel { background: linear-gradient(135deg, #b0c4de, #778899) !important; color: #333 !important; }
      
      /* Sidebar */
      div#team-overlay .team-sidebar {
        width: 250px !important;
        min-width: 250px !important;
        max-width: 250px !important;
        background: rgba(0, 0, 0, 0.3) !important;
        border-left: 2px solid #357abd !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      
      div#team-overlay .stats-section {
        background: rgba(0, 0, 0, 0.2) !important;
        margin: 15px !important;
        border-radius: 10px !important;
        padding: 18px !important;
        border: 1px solid rgba(74, 144, 226, 0.3) !important;
      }
      
      div#team-overlay .section-header {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        margin-bottom: 15px !important;
      }
      
      div#team-overlay .section-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #87ceeb !important;
        margin: 0 !important;
      }
      
      div#team-overlay .section-icon {
        font-size: 18px !important;
        color: #4a90e2 !important;
      }
      
      div#team-overlay .stat-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
      }
      
      div#team-overlay .stat-item {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 8px 12px !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-radius: 6px !important;
        border: 1px solid rgba(74, 144, 226, 0.2) !important;
        transition: all 0.3s ease !important;
      }
      
      div#team-overlay .stat-item:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        border-color: rgba(74, 144, 226, 0.4) !important;
      }
      
      div#team-overlay .stat-label {
        font-size: 13px !important;
        color: rgba(255, 255, 255, 0.8) !important;
        font-weight: 500 !important;
      }
      
      div#team-overlay .stat-value {
        font-size: 13px !important;
        font-weight: bold !important;
        color: #ffffff !important;
      }
      
      div#team-overlay .type-coverage {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-top: 10px !important;
      }
      
      div#team-overlay .coverage-type {
        padding: 3px 8px !important;
        border-radius: 6px !important;
        font-size: 10px !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
      }
      
      /* Vue Details */
      div#team-overlay .team-content #team-details.active {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      div#team-overlay .team-details-content {
        border-top: 2px solid #357abd !important;
        background: rgba(0, 0, 0, 0.2) !important;
        padding: 25px !important;
        min-height: 200px !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        width: 100% !important;
        box-sizing: border-box !important;
        flex: 1 !important;
      }
      
      div#team-overlay .no-selection {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        color: #888 !important;
        text-align: center !important;
        width: 100% !important;
        min-height: 400px !important;
      }
      
      div#team-overlay .no-selection-icon {
        font-size: 64px !important;
        margin-bottom: 20px !important;
        opacity: 0.5 !important;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) !important;
      }
      
      div#team-overlay .no-selection h3 {
        font-size: 24px !important;
        margin: 12px 0 !important;
        color: #ccc !important;
      }
      
      div#team-overlay .no-selection p {
        font-size: 16px !important;
        margin: 0 !important;
        opacity: 0.8 !important;
        max-width: 400px !important;
      }
      
      /* Détails Pokémon */
      div#team-overlay .pokemon-details {
        width: 100% !important;
        max-width: 800px !important;
        margin: 0 auto !important;
      }
      
      div#team-overlay .pokemon-details-header {
        text-align: center !important;
        margin-bottom: 30px !important;
        padding: 25px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 15px !important;
        border: 1px solid rgba(74, 144, 226, 0.3) !important;
      }
      
      div#team-overlay .pokemon-details-portrait {
        width: 140px !important;
        height: 140px !important;
        margin: 0 auto 25px !important;
        border: 4px solid #4a90e2 !important;
        border-radius: 15px !important;
        background-size: cover !important;
        background-position: center !important;
        image-rendering: pixelated !important;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4) !important;
      }
      
      div#team-overlay .pokemon-details-name {
        margin: 0 0 10px 0 !important;
        color: #87ceeb !important;
        font-size: 28px !important;
        font-weight: bold !important;
      }
      
      div#team-overlay .pokemon-details-info {
        color: rgba(255,255,255,0.9) !important;
        font-size: 16px !important;
        margin: 0 !important;
        font-weight: 500 !important;
      }
      
      div#team-overlay .pokemon-details-stats {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
        gap: 20px !important;
        margin-top: 25px !important;
      }
      
      div#team-overlay .pokemon-stat-group {
        background: rgba(255, 255, 255, 0.05) !important;
        padding: 20px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(74, 144, 226, 0.2) !important;
      }
      
      div#team-overlay .pokemon-stat-group h4 {
        margin: 0 0 15px 0 !important;
        color: #87ceeb !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        border-bottom: 2px solid rgba(74, 144, 226, 0.3) !important;
        padding-bottom: 8px !important;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        div#team-overlay .team-container {
          width: 95% !important;
          height: 90% !important;
        }
        
        div#team-overlay .team-overview-content {
          flex-direction: column !important;
        }
        
        div#team-overlay .team-sidebar {
          width: 100% !important;
          order: 2 !important;
          border-left: none !important;
          border-top: 2px solid #357abd !important;
          max-height: 200px !important;
        }
        
        div#team-overlay .team-slots-grid {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
          gap: 15px !important;
          padding: 20px !important;
        }
        
        div#team-overlay .team-slot {
          width: 140px !important;
          height: 140px !important;
          min-width: 140px !important;
          max-width: 140px !important;
          min-height: 140px !important;
          max-height: 140px !important;
          padding: 15px 10px !important;
        }
        
        div#team-overlay .pokemon-portrait {
          width: 48px !important;
          height: 48px !important;
        }
        
        div#team-overlay .pokemon-card {
          height: 110px !important;
        }
      }
      
      /* Animations */
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
      
      div#team-overlay .team-slot.new {
        animation: itemAppear 0.5s ease !important;
      }
      
      @keyframes teamFullGlow {
        0%, 100% { 
          box-shadow: 0 10px 30px rgba(74, 144, 226, 0.4) !important; 
        }
        50% { 
          box-shadow: 0 10px 40px rgba(74, 144, 226, 0.8) !important; 
        }
      }
      
      div#team-overlay .team-container.team-full {
        animation: teamFullGlow 1.5s ease !important;
      }
      
      @keyframes pokemonUpdate {
        0%, 100% { transform: scale(1) !important; }
        50% { transform: scale(1.05) !important; }
      }
      
      div#team-overlay .pokemon-card.updated {
        animation: pokemonUpdate 0.6s ease !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] CSS robuste chargé avec spécificité maximale');
  }
  
  // === 🏗️ CRÉATION INTERFACE ===
  
  createInterface() {
    // Supprimer l'ancienne interface
    const existing = document.querySelector('#team-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';
    
    overlay.innerHTML = `
      <div class="team-container">
        <!-- Header -->
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <h2>${t('team.ui.title')}</h2>
              <p class="team-subtitle">${t('team.ui.subtitle')}</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats-header">
              <div class="team-count">0/6</div>
              <div class="team-status">En attente</div>
            </div>
             <button class="team-close-btn" title="${t('team.ui.close')}">✕</button>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">${t('team.ui.tabs.overview')}</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">${t('team.ui.tabs.details')}</span>
          </button>
        </div>
        
        <!-- Contenu -->
        <div class="team-content">
          <!-- Vue d'ensemble -->
          <div class="team-view active" id="team-overview">
            <div class="team-overview-content">
              <!-- Section des slots Pokemon -->
              <div class="team-slots-section">
                <div class="slots-header">
                  <h3 class="slots-title">
                    <span>⚔️</span>
                    <span>${t('team.ui.overview.team_title')}</span>
                  </h3>
                  <div class="team-actions">
                    <button class="action-btn heal" id="heal-team-btn">
                      💊 ${t('team.ui.overview.heal_team')}
                    </button>
                    <button class="action-btn" id="organize-team-btn">
                      🔄 ${t('team.ui.overview.organize')}
                    </button>
                  </div>
                </div>
                <div class="team-slots-grid">
                  ${this.generateSlots()}
                </div>
              </div>
              
              <!-- Sidebar avec statistiques -->
              <div class="team-sidebar">
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">📊</span>
                    <h4 class="section-title">${t('team.ui.stats.title')}</h4>
                  </div>
                  <div class="stat-list">
                    <div class="stat-item">
                      <span class="stat-label">${t('team.ui.stats.avg_level')}</span>
                      <span class="stat-value" id="avg-level">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">${t('team.ui.stats.total_hp')}</span>
                      <span class="stat-value" id="total-hp">0/0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">${t('team.ui.stats.battle_ready')}</span>
                      <span class="stat-value" id="battle-ready">${t('team.ui.stats.no')}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">${t('team.ui.stats.alive_count')}</span>
                      <span class="stat-value" id="alive-count">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">${t('team.ui.stats.team_complete')}</span>
                      <span class="stat-value" id="team-complete">${t('team.ui.stats.no')}</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">🎯</span>
                    <h4 class="section-title">${t('team.ui.types.title')}</h4>
                  </div>
                  <div class="type-coverage" id="type-coverage">
                    <!-- Types générés dynamiquement -->
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">⚡</span>
                    <h4 class="section-title">${t('team.ui.actions.title')}</h4>
                  </div>
                  <div class="stat-list">
                    <button class="stat-item" style="cursor: pointer; border: none; background: inherit;" id="refresh-team-btn">
                      <span class="stat-label">🔄 ${t('team.ui.actions.refresh')}</span>
                      <span class="stat-value">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Vue Détails -->
          <div class="team-view" id="team-details">
            <div class="team-details-content">
              <div class="no-selection">
                <div class="no-selection-icon">📊</div>
                <h3>${t('team.ui.details.title')}</h3>
                <p>${t('team.ui.details.no_selection')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface créée avec HTML robuste');
  }
  
  generateSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty" data-slot="${i}">
          <div class="slot-number">${i + 1}</div>
          <div class="empty-slot">
            <div class="empty-icon">➕</div>
            <div class="empty-text">${t('team.ui.overview.slot_free')}</div>
          </div>
        </div>
      `;
    }
    return slotsHTML;
  }
  
  // === 🎛️ ÉVÉNEMENTS ROBUSTES ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Bouton fermeture
    const closeBtn = this.overlayElement.querySelector('.team-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      });
    }
    
    // Escape key - Une seule fois
    if (!this.escapeListenerAdded) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
        }
      });
      this.escapeListenerAdded = true;
    }
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });
    
    // Actions boutons
    this.setupActionButtons();
    this.setupSlotInteractions();
    
    console.log('🎛️ [TeamUI] Événements configurés de manière robuste');
  }
  
  setupActionButtons() {
    const buttons = {
      'heal-team-btn': () => this.handleAction('healTeam'),
      'organize-team-btn': () => this.handleAction('organizeTeam'),
      'refresh-team-btn': () => this.handleAction('requestData')
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
  
  setupSlotInteractions() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    // Clic simple
    slotsContainer.addEventListener('click', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.selectPokemon(pokemon, slot, slotIndex);
      } else {
        this.deselectPokemon();
      }
    });
    
    // Double-clic pour détails
    slotsContainer.addEventListener('dblclick', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.selectPokemon(pokemon, slot, slotIndex);
        this.switchToView('details');
      }
    });
  }
  
  // === 🎛️ CONTRÔLES PRINCIPAUX - ROBUSTES ===
  
  show() {
    console.log('👁️ [TeamUI] Affichage interface - Version robuste');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      // Forcer affichage avec spécificité maximale
      this.overlayElement.className = 'team-overlay';
      
      // Forcer vue overview
      setTimeout(() => {
        this.switchToView('overview');
      }, 10);
    }
    
    this.requestTeamData();
    
    console.log('✅ [TeamUI] Interface affichée avec succès');
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface - Version robuste');
    
    this.isVisible = false;
    
    if (this.overlayElement) {
      // Forcer masquage avec spécificité maximale
      this.overlayElement.className = 'team-overlay hidden';
    }
    
    this.deselectPokemon();
    
    console.log('✅ [TeamUI] Interface masquée avec succès');
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue: ${viewName} - Version robuste`);
    
    if (!this.overlayElement) return;
    
    // Mettre à jour tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      if (tab.dataset.view === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Mettre à jour vues - Forcer avec classes
    const views = {
      overview: this.overlayElement.querySelector('#team-overview'),
      details: this.overlayElement.querySelector('#team-details')
    };
    
    Object.entries(views).forEach(([name, element]) => {
      if (element) {
        if (name === viewName) {
          element.className = 'team-view active';
        } else {
          element.className = 'team-view';
        }
      }
    });
    
    this.currentView = viewName;
    
    // Actions spécifiques
    if (viewName === 'details' && this.selectedPokemon) {
      this.updateDetailView();
    }
    
    console.log(`✅ [TeamUI] Vue ${viewName} activée avec succès`);
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
    
    return true;
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateTeamData(data) {
    console.log('📊 [TeamUI] Mise à jour données équipe - Version robuste');
    
    // Parsing robuste des données
    if (data && Array.isArray(data.team)) {
      this.teamData = data.team;
    } else if (data && Array.isArray(data)) {
      this.teamData = data;
    } else if (data && data.pokemon && Array.isArray(data.pokemon)) {
      this.teamData = data.pokemon;
    } else {
      this.teamData = [];
    }
    
    console.log(`📊 [TeamUI] ${this.teamData.length} Pokémon chargés`);
    
    this.refreshDisplay();
    this.updateStats();
    
    // Mettre à jour le Pokémon sélectionné
    if (this.selectedPokemon) {
      const updated = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updated) {
        this.selectedPokemon = updated;
        this.updateDetailView();
      }
    }
  }
  
  refreshDisplay() {
    const slotsContainer = this.overlayElement?.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    console.log('🔄 [TeamUI] Rafraîchissement affichage...');
    
    // Vider et recréer les slots
    slotsContainer.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
      
      // Animation
      setTimeout(() => {
        slot.classList.add('new');
        setTimeout(() => slot.classList.remove('new'), 500);
      }, i * 50);
    }
    
    console.log('✅ [TeamUI] Affichage rafraîchi');
  }
  
  createSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        ${this.createPokemonCardHTML(pokemon)}
      `;
    } else {
      slot.classList.add('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        <div class="empty-slot">
          <div class="empty-icon">➕</div>
          <div class="empty-text">Slot libre</div>
        </div>
      `;
    }
    
    return slot;
  }
  
  createPokemonCardHTML(pokemon) {
    const currentHp = pokemon.currentHp || 0;
    const maxHp = pokemon.maxHp || 1;
    const healthPercent = (currentHp / maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    
    // Utilisation de la localization pour le nom
    let displayName;
    if (pokemon.nickname && pokemon.nickname.trim()) {
      // Priorité 1: Nickname personnalisé
      displayName = pokemon.nickname;
    } else {
      // Priorité 2: Nom depuis localization ou fallback
      displayName = this.getPokemonName(pokemon.pokemonId, pokemon.name);
    }
    
    const level = pokemon.level || 1;
    const isFainted = currentHp === 0;
    const hasStatus = pokemon.status && pokemon.status !== 'normal' && pokemon.status !== 'none';
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-name" title="${displayName}">
            ${displayName}
          </div>
          <div class="pokemon-level">Niv. ${level}</div>
        </div>
        
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}">
            <div class="pokemon-status ${isFainted ? 'fainted' : hasStatus ? 'status' : ''}"></div>
          </div>
        </div>
        
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${currentHp}/${maxHp} HP</div>
        </div>
        
        <div class="pokemon-types">
          ${this.getTypesHTML(pokemon.types)}
        </div>
      </div>
    `;
  }
  
  getPortraitStyle(pokemonId) {
    if (!pokemonId) {
      return `
        background: linear-gradient(45deg, #ccc, #999);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
      `;
    }
    
    const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    return `
      background-image: url('${url}');
      background-size: 900% 900%;
      background-position: 0px 0px;
      background-repeat: no-repeat;
      image-rendering: pixelated;
    `;
  }
  
  getHealthClass(healthPercent) {
    if (healthPercent > 75) return 'high';
    if (healthPercent > 50) return 'medium';
    if (healthPercent > 25) return 'low';
    return 'critical';
  }
  
  getTypesHTML(types) {
    if (!types || !Array.isArray(types)) return '';
    return types.map(type => 
      `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
  }
  
  updateStats() {
    if (!this.overlayElement) return;
    
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p && p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + (p?.currentHp || 0), 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + (p?.maxHp || 0), 0);
    const canBattle = aliveCount > 0;
    const isComplete = teamCount === 6;
    
    // Header stats
    const elements = {
      '.team-count': `${teamCount}/6`,
      '.team-status': canBattle ? 'Prêt au Combat' : 'Non Prêt',
      '#avg-level': avgLevel,
      '#total-hp': `${totalCurrentHp}/${totalMaxHp}`,
      '#alive-count': aliveCount,
      '#battle-ready': canBattle ? 'Oui' : 'Non',
      '#team-complete': isComplete ? 'Oui' : 'Non'
    };
    
    Object.entries(elements).forEach(([selector, value]) => {
      const element = this.overlayElement.querySelector(selector);
      if (element) {
        element.textContent = value;
        
        // Couleurs conditionnelles
        if (selector === '.team-status') {
          element.style.color = canBattle ? '#28a745' : '#dc3545';
        } else if (selector === '#battle-ready') {
          element.style.color = canBattle ? '#28a745' : '#dc3545';
        } else if (selector === '#team-complete') {
          element.style.color = isComplete ? '#28a745' : '#ffc107';
        }
         const battleReadyElement = this.overlayElement.querySelector('#battle-ready');
        if (battleReadyElement) {
          battleReadyElement.textContent = canBattle ? t('team.ui.stats.yes') : t('team.ui.stats.no');
        }
        
        const teamCompleteElement = this.overlayElement.querySelector('#team-complete');
        if (teamCompleteElement) {
          teamCompleteElement.textContent = isComplete ? t('team.ui.stats.yes') : t('team.ui.stats.no');
        }
      }
    });
    
    this.updateTypeCoverage();
  }
  
  updateTypeCoverage() {
    const container = this.overlayElement?.querySelector('#type-coverage');
    if (!container) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types && Array.isArray(pokemon.types)) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      container.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-style: italic;">Aucun type</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    container.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId, pokemon.name));
    
    // Désélectionner tous
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Sélectionner le nouveau
    slotElement.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    // Animation
    const card = slotElement.querySelector('.pokemon-card');
    if (card) {
      card.classList.add('updated');
      setTimeout(() => card.classList.remove('updated'), 600);
    }
    
    this.updateDetailView();
  }
  
  deselectPokemon() {
    this.overlayElement?.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    this.selectedPokemon = null;
    this.selectedSlot = null;
    
    this.updateDetailView();
  }
  
  updateDetailView() {
    const detailsContent = this.overlayElement?.querySelector('.team-details-content');
    if (!detailsContent) return;
    
    if (!this.selectedPokemon) {
      detailsContent.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">📊</div>
          <h3>${t('team.ui.details.title')}</h3>
          <p>${t('team.ui.details.no_selection')}</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    
    // Utilisation de la localization pour le nom dans les détails
    let displayName;
    if (pokemon.nickname && pokemon.nickname.trim()) {
      displayName = pokemon.nickname;
    } else {
      displayName = this.getPokemonName(pokemon.pokemonId, pokemon.name);
    }
    
    const typesText = pokemon.types ? pokemon.types.join(' / ') : 'Type Inconnu';
    
    detailsContent.innerHTML = `
      <div class="pokemon-details">
        <div class="pokemon-details-header">
          <div class="pokemon-details-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
          <h2 class="pokemon-details-name">${displayName}</h2>
          <p class="pokemon-details-info">Niveau ${pokemon.level} • ${typesText}</p>
        </div>
        
        <div class="pokemon-details-stats">
          <div class="pokemon-stat-group">
            <h4>Informations Générales</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">Points de Vie</span>
                <span class="stat-value">${pokemon.currentHp}/${pokemon.maxHp} (${Math.round(healthPercent)}%)</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Niveau</span>
                <span class="stat-value">${pokemon.level}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Expérience</span>
                <span class="stat-value">${pokemon.experience || 0} XP</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Nature</span>
                <span class="stat-value">${pokemon.nature || 'Inconnue'}</span>
              </div>
            </div>
          </div>
          
          <div class="pokemon-stat-group">
            <h4>État et Statut</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">Statut</span>
                <span class="stat-value">${pokemon.status || 'Normal'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Peut Combattre</span>
                <span class="stat-value" style="color: ${pokemon.currentHp > 0 ? '#28a745' : '#dc3545'}">${pokemon.currentHp > 0 ? 'Oui' : 'Non'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Position</span>
                <span class="stat-value">Slot ${(this.selectedSlot || 0) + 1}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0;">
            ${t('team.ui.details.no_selection_hint')}
          </p>
        </div>
      </div>
    `;
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [TeamUI] Action: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
    
    this.showActionFeedback(action);
  }
  
  showActionFeedback(action) {
    const messages = {
      healTeam: { text: 'Équipe en cours de soin...', type: 'success' },
      organizeTeam: { text: 'Organisation de l\'équipe...', type: 'info' },
      requestData: { text: 'Actualisation des données...', type: 'info' }
    };
    
    const message = messages[action] || { text: `Action ${action} en cours...`, type: 'info' };
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message.text, message.type, {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  requestTeamData() {
    this.handleAction('requestData');
  }
  
  // === 💬 FEEDBACK UTILISATEUR ===
  
  showTooltip() {
    if (this.currentTooltip) return; // Éviter doublons
    
    const { teamCount, aliveCount, canBattle } = this.getBasicStats();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'team-tooltip';
    
    const iconRect = this.overlayElement.getBoundingClientRect();
    
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - iconRect.top + 10}px;
      right: ${window.innerWidth - iconRect.right}px;
      background: rgba(42, 63, 95, 0.95);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10001;
      border: 1px solid #4a90e2;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      white-space: nowrap;
    `;
    
    let statusText = canBattle ? 'Ready for battle' : 'Cannot battle';
    if (aliveCount < teamCount && aliveCount > 0) {
      statusText = 'Some Pokémon fainted';
    }
    
    tooltip.innerHTML = `
      <div><strong>Team: ${teamCount}/6</strong></div>
      <div>Alive: ${aliveCount}</div>
      <div>${statusText}</div>
      <div style="opacity: 0.7; margin-top: 4px;">Click to manage</div>
    `;
    
    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
    
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
        this.currentTooltip = null;
      }
    }, 3000);
  }
  
  hideTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }
  
  // === 🎯 MÉTHODES UTILITAIRES ===
  
  getBasicStats() {
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p && p.currentHp > 0).length;
    const canBattle = aliveCount > 0;
    
    return { teamCount, aliveCount, canBattle };
  }
  
  getPokemonCount() {
    return this.teamData.length;
  }
  
  getAliveCount() {
    return this.teamData.filter(p => p && p.currentHp > 0).length;
  }
  
  getFaintedCount() {
    return this.teamData.filter(p => p && p.currentHp === 0).length;
  }
  
  getAverageLevel() {
    if (this.teamData.length === 0) return 0;
    return Math.round(this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0) / this.teamData.length);
  }
  
  getTotalHP() {
    return this.teamData.reduce((sum, p) => sum + (p?.currentHp || 0), 0);
  }
  
  getMaxHP() {
    return this.teamData.reduce((sum, p) => sum + (p?.maxHp || 0), 0);
  }
  
  getHealthPercentage() {
    const total = this.getTotalHP();
    const max = this.getMaxHP();
    return max > 0 ? Math.round((total / max) * 100) : 0;
  }
  
  canBattle() {
    return this.getAliveCount() > 0;
  }
  
  isTeamFull() {
    return this.teamData.length >= 6;
  }
  
  needsHealing() {
    return this.teamData.some(p => p && p.currentHp < p.maxHp);
  }
  
  hasStatusConditions() {
    return this.teamData.some(p => p && p.status && p.status !== 'normal' && p.status !== 'none');
  }
  
  getTypeCoverage() {
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types && Array.isArray(pokemon.types)) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }
  
  // === 🎮 MÉTHODES PUBLIQUES D'INTERACTION ===
  
  selectSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const slot = this.overlayElement?.querySelector(`[data-slot="${slotIndex}"]`);
    const pokemon = this.teamData[slotIndex];
    
    if (slot && pokemon) {
      this.selectPokemon(pokemon, slot, slotIndex);
      return true;
    }
    
    return false;
  }
  
  healPokemon(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const pokemon = this.teamData[slotIndex];
    if (!pokemon) return false;
    
    this.handleAction('healPokemon', { pokemonId: pokemon._id, slotIndex });
    return true;
  }
  
  swapPokemon(fromSlot, toSlot) {
    if (fromSlot < 0 || fromSlot >= 6 || toSlot < 0 || toSlot >= 6) return false;
    if (fromSlot === toSlot) return false;
    
    this.handleAction('swapPokemon', { fromSlot, toSlot });
    return true;
  }
  
  removePokemon(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const pokemon = this.teamData[slotIndex];
    if (!pokemon) return false;
    
    this.handleAction('removePokemon', { pokemonId: pokemon._id, slotIndex });
    return true;
  }
  
  // === 🔄 MÉTHODES DE SYNCHRONISATION ===
  
  syncWithTeamManager(teamManager) {
    if (!teamManager) return;
    
    try {
      const teamStats = teamManager.getTeamStats();
      const teamData = teamManager.getTeamData();
      
      console.log('🔄 [TeamUI] Synchronisation avec TeamManager');
      this.updateTeamData({ team: teamData });
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur synchronisation TeamManager:', error);
    }
  }
  
  forceRefresh() {
    console.log('🔄 [TeamUI] Force refresh...');
    
    this.refreshDisplay();
    this.updateStats();
    this.updateDetailView();
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Interface équipe actualisée', 'success', {
        duration: 1500,
        position: 'bottom-center'
      });
    }
  }
  
  // === 📊 MÉTHODES D'ANALYSE ===
  
  getTeamAnalysis() {
    return {
      basic: {
        count: this.getPokemonCount(),
        aliveCount: this.getAliveCount(),
        faintedCount: this.getFaintedCount(),
        averageLevel: this.getAverageLevel(),
        healthPercentage: this.getHealthPercentage()
      },
      battle: {
        canBattle: this.canBattle(),
        isComplete: this.isTeamFull(),
        needsHealing: this.needsHealing(),
        hasStatusConditions: this.hasStatusConditions()
      },
      types: {
        coverage: this.getTypeCoverage(),
        coverageCount: this.getTypeCoverage().length
      },
      recommendations: this.getRecommendations()
    };
  }
  
  getRecommendations() {
    const recommendations = [];
    
    if (this.getFaintedCount() > 0) {
      recommendations.push({
        type: 'healing',
        priority: 'high',
        message: `${this.getFaintedCount()} Pokémon K.O. - Utilisez un Centre Pokémon`
      });
    }
    
    if (this.needsHealing() && this.getFaintedCount() === 0) {
      recommendations.push({
        type: 'healing',
        priority: 'medium',
        message: 'Certains Pokémon sont blessés - Soignez votre équipe'
      });
    }
    
    if (!this.isTeamFull()) {
      recommendations.push({
        type: 'team',
        priority: 'medium',
        message: `Équipe incomplète (${this.getPokemonCount()}/6) - Capturez plus de Pokémon`
      });
    }
    
    const typeCoverage = this.getTypeCoverage();
    if (typeCoverage.length < 4) {
      recommendations.push({
        type: 'strategy',
        priority: 'low',
        message: 'Couverture de types limitée - Diversifiez votre équipe'
      });
    }
    
    if (this.hasStatusConditions()) {
      recommendations.push({
        type: 'status',
        priority: 'medium',
        message: 'Certains Pokémon ont des altérations de statut'
      });
    }
    
    return recommendations;
  }
  
  // === 🎯 MÉTHODES DE TESTS ===
  
  testInterface() {
    console.log('🧪 [TeamUI] Test interface...');
    
    const testData = {
      team: [
        {
          _id: 'test1',
          pokemonId: 1,
          name: 'Bulbasaur',
          nickname: 'Bulbi',
          level: 15,
          currentHp: 45,
          maxHp: 45,
          types: ['Grass', 'Poison'],
          status: 'normal'
        },
        {
          _id: 'test2',
          pokemonId: 4,
          name: 'Charmander',
          level: 12,
          currentHp: 20,
          maxHp: 39,
          types: ['Fire'],
          status: 'normal'
        },
        {
          _id: 'test3',
          pokemonId: 7,
          name: 'Squirtle',
          level: 14,
          currentHp: 0,
          maxHp: 44,
          types: ['Water'],
          status: 'fainted'
        }
      ]
    };
    
    this.updateTeamData(testData);
    
    console.log('✅ [TeamUI] Test data appliquée');
    
    return {
      testDataApplied: true,
      pokemonCount: this.teamData.length,
      interfaceReady: !!this.overlayElement,
      version: 'rewritten-robust'
    };
  }
  
  // === 🔍 MÉTHODES DE RECHERCHE ===
  
  findPokemonByName(name) {
    return this.teamData.find(p => 
      (p.nickname && p.nickname.toLowerCase().includes(name.toLowerCase())) ||
      (this.getPokemonName(p.pokemonId, p.name).toLowerCase().includes(name.toLowerCase()))
    );
  }
  
  findPokemonsByType(type) {
    return this.teamData.filter(p => 
      p.types && p.types.some(t => t.toLowerCase() === type.toLowerCase())
    );
  }
  
  findPokemonsByLevel(minLevel, maxLevel = Infinity) {
    return this.teamData.filter(p => 
      p.level >= minLevel && p.level <= maxLevel
    );
  }
  
  findFaintedPokemon() {
    return this.teamData.filter(p => p && p.currentHp === 0);
  }
  
  findHealthyPokemon() {
    return this.teamData.filter(p => p && p.currentHp === p.maxHp);
  }
  
  findInjuredPokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0 && p.currentHp < p.maxHp);
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamUI] Destruction interface...');
    
    // Nettoyer tooltip
    this.hideTooltip();

    // Nettoyer le listener de langue
    if (this.cleanupLanguageListener && typeof this.cleanupLanguageListener === 'function') {
      console.log('🌐 [TeamUI] Nettoyage listener langue...');
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    // Supprimer élément DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Supprimer styles
    const styles = document.querySelector('#team-ui-robust-styles');
    if (styles) styles.remove();
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.onAction = null;
    this.escapeListenerAdded = false;
    this.pokemonLocalization = null;
    
    console.log('✅ [TeamUI] Interface détruite proprement');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.overlayElement,
      elementInDOM: this.overlayElement ? document.contains(this.overlayElement) : false,
      currentView: this.currentView,
      teamCount: this.teamData.length,
      selectedPokemon: this.selectedPokemon ? this.selectedPokemon.nickname || this.getPokemonName(this.selectedPokemon.pokemonId, this.selectedPokemon.name) : null,
      selectedSlot: this.selectedSlot,
      hasOnAction: !!this.onAction,
      hasLocalization: !!this.pokemonLocalization,
      version: 'rewritten-robust-localized-2024',
      cssMethod: 'high-specificity-with-important',
      escapeListenerAdded: this.escapeListenerAdded,
      overlayClasses: this.overlayElement ? this.overlayElement.className : null,
      activeView: this.overlayElement ? this.overlayElement.querySelector('.team-view.active')?.id : null,
      teamData: this.teamData.map(p => ({
        name: p?.nickname || this.getPokemonName(p?.pokemonId, p?.name) || 'Unknown',
        level: p?.level || '?',
        hp: `${p?.currentHp || 0}/${p?.maxHp || 0}`,
        types: p?.types || []
      }))
    };
  }
  
  // === 📱 RESPONSIVE ===
  
  updateForScreenSize() {
    if (!this.overlayElement) return;
    
    const container = this.overlayElement.querySelector('.team-container');
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 768) {
      container?.classList.add('mobile-layout');
    } else {
      container?.classList.remove('mobile-layout');
    }
  }
}

export default TeamUI;

// Exposer globalement
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI RÉÉCRITURE COMPLÈTE AVEC LOCALIZATION ===

✅ CORRECTIONS APPLIQUÉES:
• CSS avec spécificité maximale (div#team-overlay)
• Tous les styles forcés avec !important
• Événements robustes avec preventDefault
• Navigation vues avec forçage classes
• Gestion erreurs complète

🌐 LOCALIZATION AJOUTÉE:
• Chargement automatique du fichier localization
• getPokemonName() utilise la localization en priorité
• Fallback sur nom original si localization indisponible
• Fallback sur Pokemon #ID si aucun nom disponible
• Utilisé dans les cards ET dans les détails

🎨 FONCTIONNALITÉS CONSERVÉES:
• Affichage complet Pokémon avec portraits
• Barres de vie animées
• Types colorés avec gradients
• Statistiques temps réel
• Vue détails complète
• Actions équipe (soigner, organiser)
• Sélection interactive
• Recherche et filtres

🔧 ARCHITECTURE ROBUSTE:
• CSS sans conflits possibles
• Événements sécurisés
• Méthodes show/hide garanties
• Navigation tabs fiable
• Gestion données robuste

⚡ UTILISATION NORMALE:
• window.teamSystemGlobal.openTeam() ✓
• Bouton fermeture X ✓
• Touche Escape ✓
• Navigation tabs ✓
• Interactions slots ✓

🎯 INTERFACE TEAM 100% FONCTIONNELLE AVEC NOMS LOCALISÉS !
`);
