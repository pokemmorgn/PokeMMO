// Team/TeamUI.js - Interface Team COMPLÈTEMENT REFAITE
// 🎯 Layout moderne clean sans superposition

export class TeamUI {
  constructor(teamManager, gameRoom) {
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
    
    // === CALLBACKS ===
    this.onAction = null;
    
    console.log('🎯 [TeamUI] Instance créée - Layout refait');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation layout refait...');
      
      await this.loadCleanCSS();
      this.createCleanInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Interface refaite initialisée');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS PROPRE SANS SUPERPOSITION ===
  
  async loadCleanCSS() {
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.querySelector('#modern-team-ui-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'modern-team-ui-styles';
    style.textContent = `
      /* ===== RESET ET BASE ===== */
      * {
        box-sizing: border-box;
      }
      
      /* ===== OVERLAY PROPRE ===== */
      .team-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(10, 25, 55, 0.95), rgba(25, 45, 85, 0.92));
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 1;
        transition: all 0.4s ease;
      }
      
      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.95);
      }
      
      /* ===== CONTAINER PRINCIPAL ÉLARGI ===== */
      .team-container {
        width: 95vw;
        max-width: 1400px;
        height: 85vh;
        max-height: 700px;
        background: linear-gradient(145deg, #1e3a5f 0%, #2a4a7a 50%, #1a2f4f 100%);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        position: relative;
      }
      
      /* ===== HEADER ===== */
      .team-header {
        background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
        padding: 20px 25px;
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        min-height: 80px;
      }
      
      .team-title {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .team-icon {
        font-size: 24px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
      }
      
      .team-title-text h2 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      }
      
      .team-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        margin: 2px 0 0 0;
        font-weight: 400;
      }
      
      .team-controls {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      
      .team-stats {
        text-align: right;
        background: rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .team-count {
        font-size: 18px;
        font-weight: bold;
        color: #87ceeb;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .team-status {
        font-size: 12px;
        margin-top: 2px;
        font-weight: 600;
      }
      
      .team-close-btn {
        background: linear-gradient(145deg, #e74c3c, #c0392b);
        border: 2px solid #fff;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .team-close-btn:hover {
        background: linear-gradient(145deg, #c0392b, #a93226);
        transform: scale(1.1);
      }
      
      /* ===== TABS ===== */
      .team-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(74, 144, 226, 0.3);
        flex-shrink: 0;
      }
      
      .team-tab {
        flex: 1;
        padding: 12px 20px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        position: relative;
      }
      
      .team-tab:hover {
        background: rgba(74, 144, 226, 0.1);
        color: #87ceeb;
      }
      
      .team-tab.active {
        background: rgba(74, 144, 226, 0.2);
        color: #87ceeb;
        border-bottom: 3px solid #4a90e2;
      }
      
      .tab-icon {
        font-size: 16px;
      }
      
      /* ===== CONTENU PRINCIPAL ÉLARGI ===== */
      .team-content {
        flex: 1;
        padding: 25px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      
      .team-view {
        display: none;
        height: 100%;
        overflow: hidden;
      }
      
      .team-view.active {
        display: block;
      }
      
      /* ===== OVERVIEW LAYOUT ÉLARGI ===== */
      .team-overview-content {
        display: flex;
        gap: 25px;
        height: 100%;
        width: 100%;
      }
      
      /* Section principale des slots - ÉLARGIE */
      .team-slots-section {
        flex: 2.5;
        display: flex;
        flex-direction: column;
        min-width: 0;
        width: 100%;
      }
      
      .slots-header {
        margin-bottom: 15px;
      }
      
      .slots-title {
        font-size: 18px;
        font-weight: 600;
        color: #87ceeb;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* Grille des slots Pokemon - PLUS ESPACÉE */
      .team-slots-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 25px;
        flex: 1;
        min-height: 0;
        width: 100%;
      }
      
      /* Slot Pokemon individuel - PLUS GRAND */
      .team-slot {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border: 2px solid rgba(74, 144, 226, 0.4);
        border-radius: 15px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 160px;
        width: 100%;
      }
      
      .team-slot:hover {
        transform: translateY(-2px);
        border-color: #87ceeb;
        box-shadow: 0 8px 20px rgba(74, 144, 226, 0.3);
      }
      
      .team-slot.selected {
        border-color: #87ceeb;
        background: linear-gradient(145deg, rgba(135, 206, 235, 0.2), rgba(74, 144, 226, 0.1));
        box-shadow: 0 0 15px rgba(135, 206, 235, 0.4);
      }
      
      .team-slot.empty {
        border-style: dashed;
        border-color: rgba(74, 144, 226, 0.3);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Numéro du slot */
      .slot-number {
        position: absolute;
        top: 8px;
        left: 10px;
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        z-index: 2;
      }
      
      /* Slot vide */
      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        opacity: 0.6;
        height: 100%;
      }
      
      .empty-icon {
        font-size: 24px;
        color: #4a90e2;
      }
      
      .empty-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
      }
      
      /* ===== POKEMON CARD ===== */
      .pokemon-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 15px;
      }
      
      .pokemon-name {
        font-weight: 600;
        color: #ffffff;
        font-size: 13px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 80px;
      }
      
      .pokemon-level {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        color: white;
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .pokemon-sprite {
        text-align: center;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 4px 0;
      }
      
      .pokemon-portrait {
        width: 72px;
        height: 72px;
        background-size: cover;
        background-position: center;
        border-radius: 12px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        image-rendering: pixelated;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .pokemon-health {
        margin-top: auto;
      }
      
      .health-bar {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 3px;
      }
      
      .health-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 3px;
      }
      
      .health-fill.high { background: #2ecc71; }
      .health-fill.medium { background: #f39c12; }
      .health-fill.low { background: #e74c3c; }
      .health-fill.critical { background: #9b59b6; }
      
      .health-text {
        font-size: 10px;
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .pokemon-types {
        display: flex;
        gap: 3px;
        justify-content: center;
        margin-top: 4px;
      }
      
      .type-badge {
        padding: 1px 4px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      /* Types */
      .type-badge.type-fire { background: #ff6347; }
      .type-badge.type-water { background: #1e90ff; }
      .type-badge.type-grass { background: #32cd32; }
      .type-badge.type-electric { background: #ffd700; color: #333; }
      .type-badge.type-psychic { background: #ff69b4; }
      .type-badge.type-ice { background: #87ceeb; }
      .type-badge.type-dragon { background: #9370db; }
      .type-badge.type-dark { background: #2f4f4f; }
      .type-badge.type-fairy { background: #ffb6c1; color: #333; }
      .type-badge.type-normal { background: #d3d3d3; color: #333; }
      
      /* ===== SIDEBAR STATISTIQUES ÉLARGIE ===== */
      .team-sidebar {
        flex: 1.5;
        min-width: 350px;
        max-width: 450px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
      }
      
      /* Section stats */
      .stats-section {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        padding: 15px;
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #87ceeb;
        margin: 0;
      }
      
      .section-icon {
        font-size: 16px;
      }
      
      /* Stats individuelles */
      .stat-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        border: 1px solid rgba(74, 144, 226, 0.2);
      }
      
      .stat-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .stat-value {
        font-size: 13px;
        font-weight: bold;
        color: #ffffff;
      }
      
      /* Couverture des types */
      .type-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
      }
      
      .coverage-type {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      /* ===== VUES DÉTAILS ET MOVES ===== */
      .team-details-content,
      .team-moves-content {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        padding: 40px;
        text-align: center;
      }
      
      .no-selection {
        color: rgba(255, 255, 255, 0.6);
      }
      
      .no-selection-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
      }
      
      /* ===== FOOTER ===== */
      .team-footer {
        padding: 15px 20px;
        border-top: 1px solid rgba(74, 144, 226, 0.3);
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 17px 17px;
        flex-shrink: 0;
      }
      
      .team-actions {
        display: flex;
        gap: 10px;
      }
      
      .team-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(145deg, #4a90e2, #357abd);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      
      .team-btn:hover {
        background: linear-gradient(145deg, #357abd, #2c5f99);
        transform: translateY(-1px);
      }
      
      .team-btn.secondary {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
      }
      
      .team-btn.secondary:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2));
      }
      
      .btn-icon {
        font-size: 14px;
      }
      
      .team-info {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-style: italic;
      }
      
      /* ===== RESPONSIVE OPTIMISÉ ===== */
      @media (max-width: 1000px) {
        .team-overview-content {
          flex-direction: column;
          gap: 15px;
        }
        
        .team-sidebar {
          min-width: auto;
          max-width: none;
        }
        
        .team-slots-grid {
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 1fr);
        }
      }
      
      @media (max-width: 600px) {
        .team-container {
          width: 95vw;
          height: 90vh;
        }
        
        .team-slots-grid {
          grid-template-columns: 1fr;
          grid-template-rows: repeat(6, auto);
        }
        
        .team-header {
          flex-direction: column;
          gap: 10px;
          padding: 15px;
        }
        
        .team-footer {
          flex-direction: column;
          gap: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] CSS propre chargé');
  }
  
  // === 🏗️ INTERFACE PROPRE ===
  
  createCleanInterface() {
    // Supprimer l'ancienne interface
    const existing = document.querySelector('#team-overlay');
    if (existing) {
      existing.remove();
    }
    
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
              <h2>Mon Équipe Pokémon</h2>
              <p class="team-subtitle">Gestion de votre équipe de combat</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <div class="team-count">0/6</div>
              <div class="team-status">En attente</div>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">Vue d'ensemble</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Détails</span>
          </button>
          <button class="team-tab" data-view="moves">
            <span class="tab-icon">⚡</span>
            <span class="tab-text">Attaques</span>
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
                    <span>Équipe de Combat</span>
                  </h3>
                </div>
                <div class="team-slots-grid">
                  ${this.generateCleanSlots()}
                </div>
              </div>
              
              <!-- Sidebar avec statistiques -->
              <div class="team-sidebar">
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">📊</span>
                    <h4 class="section-title">Statistiques</h4>
                  </div>
                  <div class="stat-list">
                    <div class="stat-item">
                      <span class="stat-label">Niveau Moyen</span>
                      <span class="stat-value" id="avg-level">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">HP Total</span>
                      <span class="stat-value" id="total-hp">0/0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Prêt au Combat</span>
                      <span class="stat-value" id="battle-ready">Non</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Pokémon Vivants</span>
                      <span class="stat-value" id="alive-count">0</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">🎯</span>
                    <h4 class="section-title">Couverture Types</h4>
                  </div>
                  <div class="type-coverage" id="type-coverage">
                    <!-- Types générés dynamiquement -->
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
                <h3>Détails Pokémon</h3>
                <p>Sélectionnez un Pokémon pour voir ses détails</p>
              </div>
            </div>
          </div>
          
          <!-- Vue Attaques -->
          <div class="team-view" id="team-moves">
            <div class="team-moves-content">
              <div class="no-selection">
                <div class="no-selection-icon">⚡</div>
                <h3>Gestion Attaques</h3>
                <p>Gérez les attaques de votre équipe</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="team-footer">
          <div class="team-actions">
            <button class="team-btn" id="heal-team-btn">
              <span class="btn-icon">💊</span>
              <span class="btn-text">Soigner Tout</span>
            </button>
            <button class="team-btn secondary" id="pc-access-btn">
              <span class="btn-icon">💻</span>
              <span class="btn-text">PC Pokémon</span>
            </button>
            <button class="team-btn secondary" id="auto-arrange-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Réorganiser</span>
            </button>
          </div>
          
          <div class="team-info">
            💡 Double-cliquez sur un Pokémon pour voir ses détails
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface propre créée');
  }
  
  generateCleanSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty" data-slot="${i}">
          <div class="slot-number">${i + 1}</div>
          <div class="empty-slot">
            <div class="empty-icon">➕</div>
            <div class="empty-text">Slot libre</div>
          </div>
        </div>
      `;
    }
    return slotsHTML;
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Fermeture
    this.overlayElement.querySelector('.team-close-btn').addEventListener('click', () => {
      this.hide();
    });
    
    // Fermeture par échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
    
    // Fermeture en cliquant à l'extérieur
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement) {
        this.hide();
      }
    });
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });
    
    // Actions footer
    this.overlayElement.querySelector('#heal-team-btn').addEventListener('click', () => {
      this.handleAction('healTeam');
    });
    
    this.overlayElement.querySelector('#pc-access-btn').addEventListener('click', () => {
      this.handleAction('openPC');
    });
    
    this.overlayElement.querySelector('#auto-arrange-btn').addEventListener('click', () => {
      this.handleAction('autoArrange');
    });
    
    // Sélection des slots
    this.setupSlotSelection();
    
    console.log('🎛️ [TeamUI] Événements configurés');
  }
  
  setupSlotSelection() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    
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
    
    // Double-clic pour voir les détails
    slotsContainer.addEventListener('dblclick', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.switchToView('details');
        this.selectPokemon(pokemon, slot, slotIndex);
      }
    });
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [TeamUI] Affichage interface propre');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    
    // Demander les données fraîches
    this.requestTeamData();
    
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface propre');
    
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.add('hidden');
    }
    
    // Désélectionner
    this.deselectPokemon();
    
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [TeamUI] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.pointerEvents = 'auto';
        this.overlayElement.style.opacity = '1';
      } else {
        this.overlayElement.style.pointerEvents = 'none';
        this.overlayElement.style.opacity = '0.5';
      }
    }
    
    return true;
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateTeamData(data) {
    console.log('📊 [TeamUI] Mise à jour données équipe propre:', data);
    
    this.teamData = Array.isArray(data.team) ? data.team : [];
    
    this.refreshCleanDisplay();
    this.updateCleanSummary();
    
    if (this.selectedPokemon) {
      // Mettre à jour le Pokémon sélectionné
      const updatedPokemon = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updatedPokemon) {
        this.selectedPokemon = updatedPokemon;
        this.updateDetailView();
      }
    }
  }
  
  refreshCleanDisplay() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    // Vider la grille
    slotsContainer.innerHTML = '';
    
    // Créer les 6 slots
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createCleanSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
    }
    
    console.log('🔄 [TeamUI] Affichage propre rafraîchi');
  }
  
  createCleanSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        ${this.createCleanPokemonCardHTML(pokemon)}
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
  
  createCleanPokemonCardHTML(pokemon) {
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const typesHTML = this.getTypesHTML(pokemon.types);
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-name" title="${pokemon.nickname || pokemon.name || 'Pokémon'}">
            ${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}
          </div>
          <div class="pokemon-level">Niv. ${pokemon.level}</div>
        </div>
        
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
        </div>
        
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${pokemon.currentHp}/${pokemon.maxHp}</div>
        </div>
        
        <div class="pokemon-types">
          ${typesHTML}
        </div>
      </div>
    `;
  }
  
  getPortraitStyle(pokemonId) {
    const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    return `background-image: url('${url}'); background-size: cover; background-position: center;`;
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
  
  // === 📊 RÉSUMÉ PROPRE ===
  
  updateCleanSummary() {
    if (!this.overlayElement) return;
    
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + p.level, 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + p.currentHp, 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + p.maxHp, 0);
    const canBattle = aliveCount > 0;
    
    // Header stats
    this.overlayElement.querySelector('.team-count').textContent = `${teamCount}/6`;
    const statusElement = this.overlayElement.querySelector('.team-status');
    statusElement.textContent = canBattle ? 'Prêt' : 'Non Prêt';
    statusElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Summary stats
    this.overlayElement.querySelector('#avg-level').textContent = avgLevel;
    this.overlayElement.querySelector('#total-hp').textContent = `${totalCurrentHp}/${totalMaxHp}`;
    this.overlayElement.querySelector('#alive-count').textContent = aliveCount;
    
    const battleReadyElement = this.overlayElement.querySelector('#battle-ready');
    battleReadyElement.textContent = canBattle ? 'Oui' : 'Non';
    battleReadyElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Type coverage
    this.updateCleanTypeCoverage();
    
    console.log('📊 [TeamUI] Résumé propre mis à jour');
  }
  
  updateCleanTypeCoverage() {
    const coverageContainer = this.overlayElement.querySelector('#type-coverage');
    if (!coverageContainer) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      coverageContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-style: italic;">Aucun type</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon propre:', pokemon.nickname || pokemon.name);
    
    // Désélectionner l'ancien
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Sélectionner le nouveau
    slotElement.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    // Mettre à jour la vue détaillée
    this.updateDetailView();
  }
  
  deselectPokemon() {
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    this.selectedPokemon = null;
    this.selectedSlot = null;
    
    this.updateDetailView();
  }
  
  updateDetailView() {
    const detailsContent = this.overlayElement.querySelector('.team-details-content');
    if (!detailsContent) return;
    
    if (!this.selectedPokemon) {
      detailsContent.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">📊</div>
          <h3>Détails Pokémon</h3>
          <p>Sélectionnez un Pokémon pour voir ses détails</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    
    detailsContent.innerHTML = `
      <div style="width: 100%; max-width: 500px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}; width: 100px; height: 100px; margin: 0 auto 15px; border: 3px solid #4a90e2;"></div>
          <h2 style="margin: 0; color: #87ceeb;">${pokemon.nickname || pokemon.name}</h2>
          <p style="margin: 5px 0; color: rgba(255,255,255,0.8);">Niveau ${pokemon.level} • ${pokemon.types?.join('/') || 'Type Inconnu'}</p>
        </div>
        
        <div class="stat-list">
          <div class="stat-item">
            <span class="stat-label">Points de Vie</span>
            <span class="stat-value">${pokemon.currentHp}/${pokemon.maxHp} (${Math.round(healthPercent)}%)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Nature</span>
            <span class="stat-value">${pokemon.nature || 'Inconnue'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Expérience</span>
            <span class="stat-value">${pokemon.experience || 0} XP</span>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <button class="team-btn" onclick="window.teamUI?.handlePokemonAction('heal', '${pokemon._id}')">
            <span class="btn-icon">💊</span>
            <span class="btn-text">Soigner</span>
          </button>
          <button class="team-btn secondary" onclick="window.teamUI?.handlePokemonAction('remove', '${pokemon._id}')" style="margin-left: 10px;">
            <span class="btn-icon">📦</span>
            <span class="btn-text">Vers PC</span>
          </button>
        </div>
      </div>
    `;
  }
  
  // === 🎮 NAVIGATION VUES ===
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue propre: ${viewName}`);
    
    // Mettre à jour les tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    
    // Mettre à jour les vues
    this.overlayElement.querySelectorAll('.team-view').forEach(view => {
      view.classList.toggle('active', view.id === `team-${viewName}`);
    });
    
    this.currentView = viewName;
    
    // Actions spécifiques selon la vue
    if (viewName === 'details' && this.selectedPokemon) {
      this.updateDetailView();
    }
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [TeamUI] Action propre: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
  }
  
  handlePokemonAction(action, pokemonId) {
    this.handleAction(action, { pokemonId });
  }
  
  requestTeamData() {
    this.handleAction('requestData');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamUI] Destruction interface propre...');
    
    // Supprimer l'élément DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.onAction = null;
    
    // Supprimer la référence globale
    if (window.teamUI === this) {
      window.teamUI = null;
    }
    
    console.log('✅ [TeamUI] Interface propre détruite');
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
      selectedPokemon: this.selectedPokemon ? this.selectedPokemon.nickname || this.selectedPokemon.name : null,
      selectedSlot: this.selectedSlot,
      hasOnAction: !!this.onAction,
      style: 'clean-layout'
    };
  }
}

export default TeamUI;

// Exposer globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI COMPLÈTEMENT REFAIT ===

✨ LAYOUT PROPRE:
• Flexbox clean sans superposition
• Section slots (flex: 2) + Sidebar stats (flex: 1)
• Hauteurs et largeurs fixes définies
• Pas de grid complexe qui bug

🏗️ STRUCTURE CLAIRE:
• team-overview-content: display flex
• team-slots-section: flex 2 (principale)
• team-sidebar: flex 1 min-width 250px
• Slots grid 3x2 dans la section principale

🎨 DESIGN SIMPLIFIÉ:
• Couleurs bleues harmonisées
• Bordures et ombres subtiles
• Pas d'effets complexes qui causent bugs
• CSS clean et lisible

📱 RESPONSIVE SIMPLE:
• < 1000px: layout en colonne
• < 600px: grille slots 1 colonne
• Breakpoints clairs

🔧 FONCTIONNALITÉS:
• Slots Pokemon avec portraits
• Stats en sidebar
• Navigation tabs
• Actions footer

✅ PLUS DE SUPERPOSITION !
`);
