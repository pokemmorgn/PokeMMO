// Team/TeamUI.js - Interface Team Overlay Simplifiée
// 🎯 Interface complète de gestion d'équipe

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
    this.currentView = 'overview'; // overview, details, moves
    
    // === CALLBACKS ===
    this.onAction = null; // Appelé pour les actions (défini par TeamModule)
    
    console.log('🎯 [TeamUI] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation...');
      
      await this.loadCSS();
      this.createInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Initialisé');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  async loadCSS() {
    // CSS intégré pour éviter les dépendances externes
    if (document.querySelector('#team-ui-styles')) {
      return; // Déjà chargé
    }
    
    const style = document.createElement('style');
    style.id = 'team-ui-styles';
    style.textContent = `
      /* ===== TEAM UI OVERLAY STYLES ===== */
      .team-overlay {
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
        opacity: 1;
        transition: opacity 0.3s ease;
      }
      
      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      .team-container {
        width: 90%;
        max-width: 1000px;
        height: 85%;
        max-height: 700px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        color: white;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }
      
      /* ===== HEADER ===== */
      .team-header {
        padding: 20px;
        border-bottom: 2px solid #4a90e2;
        background: rgba(74, 144, 226, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .team-title {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .team-icon {
        font-size: 32px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }
      
      .team-title-text h2 {
        margin: 0;
        color: #87ceeb;
        font-size: 24px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .team-subtitle {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        margin: 0;
      }
      
      .team-controls {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      
      .team-stats {
        text-align: right;
      }
      
      .team-count {
        font-size: 18px;
        font-weight: bold;
        color: #87ceeb;
      }
      
      .team-status {
        font-size: 14px;
        margin-top: 5px;
      }
      
      .team-close-btn {
        background: rgba(231, 76, 60, 0.8);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.3s ease;
      }
      
      .team-close-btn:hover {
        background: #e74c3c;
        transform: scale(1.1);
      }
      
      /* ===== TABS ===== */
      .team-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid #4a90e2;
      }
      
      .team-tab {
        flex: 1;
        padding: 15px;
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
      }
      
      .team-tab:hover {
        background: rgba(74, 144, 226, 0.2);
        color: white;
      }
      
      .team-tab.active {
        background: rgba(74, 144, 226, 0.3);
        color: #87ceeb;
        border-bottom: 3px solid #4a90e2;
      }
      
      .tab-icon {
        font-size: 16px;
      }
      
      /* ===== CONTENT ===== */
      .team-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .team-view {
        display: none;
      }
      
      .team-view.active {
        display: block;
      }
      
      /* ===== OVERVIEW - GRID POKEMON ===== */
      .team-slots-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 30px;
      }
      
      .team-slot {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid transparent;
        border-radius: 12px;
        padding: 15px;
        min-height: 120px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .team-slot:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: #4a90e2;
      }
      
      .team-slot.selected {
        border-color: #87ceeb;
        background: rgba(135, 206, 235, 0.2);
        box-shadow: 0 0 15px rgba(135, 206, 235, 0.3);
      }
      
      .team-slot.empty {
        border: 2px dashed rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .empty-icon {
        font-size: 24px;
        margin-bottom: 8px;
        opacity: 0.5;
      }
      
      .empty-text {
        font-size: 12px;
      }
      
      /* ===== POKEMON CARD ===== */
      .pokemon-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .pokemon-name {
        font-weight: bold;
        color: #87ceeb;
        font-size: 14px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .pokemon-level {
        background: rgba(74, 144, 226, 0.3);
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
      }
      
      .pokemon-sprite {
        text-align: center;
        margin: 5px 0;
      }
      
      .pokemon-portrait {
        width: 64px;
        height: 64px;
        margin: 0 auto;
        background-size: cover;
        background-position: center;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .pokemon-health {
        margin-top: 8px;
      }
      
      .health-bar {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 4px;
      }
      
      .health-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 3px;
      }
      
      .health-fill.high { background: #4caf50; }
      .health-fill.medium { background: #ff9800; }
      .health-fill.low { background: #f44336; }
      .health-fill.critical { background: #9c27b0; }
      
      .health-text {
        font-size: 11px;
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .pokemon-types {
        display: flex;
        gap: 4px;
        justify-content: center;
        margin-top: 8px;
      }
      
      .type-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      /* Types colors */
      .type-badge.type-fire { background: #f44336; }
      .type-badge.type-water { background: #2196f3; }
      .type-badge.type-grass { background: #4caf50; }
      .type-badge.type-electric { background: #ffeb3b; color: #000; }
      .type-badge.type-psychic { background: #e91e63; }
      .type-badge.type-normal { background: #9e9e9e; }
      .type-badge.type-fighting { background: #ff5722; }
      .type-badge.type-poison { background: #9c27b0; }
      .type-badge.type-ground { background: #795548; }
      .type-badge.type-flying { background: #03a9f4; }
      .type-badge.type-bug { background: #8bc34a; }
      .type-badge.type-rock { background: #607d8b; }
      .type-badge.type-ghost { background: #673ab7; }
      .type-badge.type-dragon { background: #3f51b5; }
      .type-badge.type-dark { background: #424242; }
      .type-badge.type-steel { background: #90a4ae; }
      .type-badge.type-fairy { background: #e1bee7; color: #000; }
      .type-badge.type-ice { background: #00bcd4; }
      
      /* ===== TEAM SUMMARY ===== */
      .team-summary {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        padding: 20px;
      }
      
      .summary-section {
        margin-bottom: 25px;
      }
      
      .summary-section h4 {
        margin: 0 0 15px 0;
        color: #87ceeb;
        font-size: 16px;
      }
      
      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }
      
      .stat-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 12px;
        border-radius: 8px;
        text-align: center;
      }
      
      .stat-label {
        display: block;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 5px;
      }
      
      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #87ceeb;
      }
      
      .type-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .coverage-type {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
      }
      
      /* ===== DETAIL VIEW ===== */
      .pokemon-detail-panel {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        padding: 20px;
        min-height: 400px;
      }
      
      .no-selection {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.6);
      }
      
      .no-selection-icon {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
      }
      
      .pokemon-detail-content {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }
      
      .pokemon-detail-header {
        display: flex;
        gap: 20px;
        align-items: center;
      }
      
      .pokemon-detail-icon .pokemon-portrait {
        width: 80px;
        height: 80px;
      }
      
      .pokemon-detail-info h3 {
        margin: 0 0 10px 0;
        color: #87ceeb;
        font-size: 20px;
      }
      
      .pokemon-detail-subtitle {
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 5px;
      }
      
      .pokemon-detail-nature {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
      }
      
      /* ===== FOOTER ===== */
      .team-footer {
        padding: 20px;
        border-top: 2px solid #4a90e2;
        background: rgba(74, 144, 226, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .team-actions {
        display: flex;
        gap: 15px;
      }
      
      .team-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        background: rgba(74, 144, 226, 0.8);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      
      .team-btn:hover {
        background: #4a90e2;
        transform: translateY(-2px);
      }
      
      .team-btn.secondary {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .team-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .btn-icon {
        font-size: 16px;
      }
      
      .team-info {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
      }
      
      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .team-container {
          width: 95%;
          height: 90%;
        }
        
        .team-slots-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .team-header {
          padding: 15px;
        }
        
        .team-title-text h2 {
          font-size: 20px;
        }
        
        .team-content {
          padding: 15px;
        }
        
        .team-footer {
          padding: 15px;
          flex-direction: column;
          gap: 15px;
        }
        
        .team-actions {
          justify-content: center;
        }
      }
      
      @media (max-width: 480px) {
        .team-slots-grid {
          grid-template-columns: 1fr;
        }
        
        .team-tabs {
          flex-direction: column;
        }
        
        .team-btn {
          padding: 8px 12px;
          font-size: 12px;
        }
      }
      
      /* ===== ANIMATIONS ===== */
      .team-container {
        animation: teamUIAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      @keyframes teamUIAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(50px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .team-slot {
        animation: slotAppear 0.3s ease;
        animation-fill-mode: both;
      }
      
      @keyframes slotAppear {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Stagger animation for slots */
      .team-slot:nth-child(1) { animation-delay: 0.1s; }
      .team-slot:nth-child(2) { animation-delay: 0.2s; }
      .team-slot:nth-child(3) { animation-delay: 0.3s; }
      .team-slot:nth-child(4) { animation-delay: 0.4s; }
      .team-slot:nth-child(5) { animation-delay: 0.5s; }
      .team-slot:nth-child(6) { animation-delay: 0.6s; }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] Styles chargés');
  }
  
  createInterface() {
    // Supprimer l'ancienne interface si elle existe
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
              <h2>Mon Équipe</h2>
              <p class="team-subtitle">Gestion des Pokémon de combat</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <div class="team-count">0/6</div>
              <div class="team-status">Ready</div>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">Overview</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Details</span>
          </button>
          <button class="team-tab" data-view="moves">
            <span class="tab-icon">⚡</span>
            <span class="tab-text">Moves</span>
          </button>
        </div>
        
        <!-- Content -->
        <div class="team-content">
          <!-- Overview View -->
          <div class="team-view team-overview active" id="team-overview">
            <div class="team-slots-grid">
              ${this.generateTeamSlots()}
            </div>
            
            <div class="team-summary">
              <div class="summary-section">
                <h4>🏆 Team Summary</h4>
                <div class="summary-stats">
                  <div class="stat-item">
                    <span class="stat-label">Average Level</span>
                    <span class="stat-value" id="avg-level">0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Total HP</span>
                    <span class="stat-value" id="total-hp">0/0</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Battle Ready</span>
                    <span class="stat-value" id="battle-ready">No</span>
                  </div>
                </div>
              </div>
              
              <div class="summary-section">
                <h4>🎯 Type Coverage</h4>
                <div class="type-coverage" id="type-coverage">
                  <!-- Types seront générés dynamiquement -->
                </div>
              </div>
            </div>
          </div>
          
          <!-- Details View -->
          <div class="team-view team-details" id="team-details">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚔️</div>
                <p>Sélectionnez un Pokémon pour voir ses détails</p>
              </div>
            </div>
          </div>
          
          <!-- Moves View -->
          <div class="team-view team-moves" id="team-moves">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚡</div>
                <p>Gestion des attaques de l'équipe</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="team-footer">
          <div class="team-actions">
            <button class="team-btn" id="heal-team-btn">
              <span class="btn-icon">💊</span>
              <span class="btn-text">Heal All</span>
            </button>
            <button class="team-btn" id="pc-access-btn">
              <span class="btn-icon">💻</span>
              <span class="btn-text">PC Storage</span>
            </button>
            <button class="team-btn secondary" id="auto-arrange-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Auto Arrange</span>
            </button>
          </div>
          
          <div class="team-info">
            💡 Cliquez sur un Pokémon pour voir ses détails
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface créée');
  }
  
  generateTeamSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty" data-slot="${i}">
          <div class="empty-icon">➕</div>
          <div class="empty-text">Slot ${i + 1}</div>
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
    console.log('👁️ [TeamUI] Affichage interface');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    
    // Demander les données fraîches
    this.requestTeamData();
    
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface');
    
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
    console.log('📊 [TeamUI] Mise à jour données équipe:', data);
    
    this.teamData = Array.isArray(data.team) ? data.team : [];
    
    this.refreshDisplay();
    this.updateSummary();
    
    if (this.selectedPokemon) {
      // Mettre à jour le Pokémon sélectionné
      const updatedPokemon = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updatedPokemon) {
        this.selectedPokemon = updatedPokemon;
        this.updateDetailView();
      }
    }
  }
  
  refreshDisplay() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    // Vider la grille
    slotsContainer.innerHTML = '';
    
    // Créer les 6 slots
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
    }
    
    console.log('🔄 [TeamUI] Affichage rafraîchi');
  }
  
  createSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = this.createPokemonCardHTML(pokemon);
    } else {
      slot.classList.add('empty');
      slot.innerHTML = `
        <div class="empty-icon">➕</div>
        <div class="empty-text">Slot ${index + 1}</div>
      `;
    }
    
    return slot;
  }
  
  createPokemonCardHTML(pokemon) {
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const typesHTML = this.getTypesHTML(pokemon.types);
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-name" title="${pokemon.nickname || pokemon.name || 'Pokémon'}">
            ${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}
          </div>
          <div class="pokemon-level">Lv.${pokemon.level}</div>
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
    // Style pour l'image portrait du Pokémon
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
  
  // === 📊 RÉSUMÉ ET STATISTIQUES ===
  
  updateSummary() {
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
    this.overlayElement.querySelector('.team-status').textContent = canBattle ? 'Ready' : 'Not Ready';
    this.overlayElement.querySelector('.team-status').style.color = canBattle ? '#4caf50' : '#f44336';
    
    // Summary stats
    this.overlayElement.querySelector('#avg-level').textContent = avgLevel;
    this.overlayElement.querySelector('#total-hp').textContent = `${totalCurrentHp}/${totalMaxHp}`;
    this.overlayElement.querySelector('#battle-ready').textContent = canBattle ? 'Yes' : 'No';
    this.overlayElement.querySelector('#battle-ready').style.color = canBattle ? '#4caf50' : '#f44336';
    
    // Type coverage
    this.updateTypeCoverage();
    
    console.log('📊 [TeamUI] Résumé mis à jour');
  }
  
  updateTypeCoverage() {
    const coverageContainer = this.overlayElement.querySelector('#type-coverage');
    if (!coverageContainer) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      coverageContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5);">No type coverage</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon:', pokemon.nickname || pokemon.name);
    
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
    const detailPanel = this.overlayElement.querySelector('.pokemon-detail-panel');
    if (!detailPanel) return;
    
    if (!this.selectedPokemon) {
      detailPanel.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">⚔️</div>
          <p>Sélectionnez un Pokémon pour voir ses détails</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    
    detailPanel.innerHTML = `
      <div class="pokemon-detail-content">
        <div class="pokemon-detail-header">
          <div class="pokemon-detail-icon">
            <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
          </div>
          <div class="pokemon-detail-info">
            <h3>${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}</h3>
            <div class="pokemon-detail-subtitle">
              Level ${pokemon.level} • ${pokemon.types?.join('/') || 'Unknown Type'}
            </div>
            <div class="pokemon-detail-nature">Nature: ${pokemon.nature || 'Unknown'}</div>
          </div>
        </div>
        
        <div class="summary-section">
          <h4>💖 Health Status</h4>
          <div class="health-bar" style="height: 12px; margin-bottom: 10px;">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div style="text-align: center; font-size: 16px; color: #87ceeb;">
            ${pokemon.currentHp} / ${pokemon.maxHp} HP (${Math.round(healthPercent)}%)
          </div>
        </div>
        
        <div class="summary-section">
          <h4>⚡ Known Moves</h4>
          <div class="summary-stats">
            ${this.getMovesHTML(pokemon.moves)}
          </div>
        </div>
        
        <div class="summary-section">
          <h4>🎯 Actions</h4>
          <div class="team-actions">
            <button class="team-btn" onclick="window.teamUI?.handlePokemonAction('heal', '${pokemon._id}')">
              <span class="btn-icon">💊</span>
              <span class="btn-text">Heal</span>
            </button>
            <button class="team-btn secondary" onclick="window.teamUI?.handlePokemonAction('remove', '${pokemon._id}')">
              <span class="btn-icon">📦</span>
              <span class="btn-text">To PC</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  getMovesHTML(moves) {
    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return '<div style="color: rgba(255,255,255,0.5); text-align: center;">No moves learned</div>';
    }
    
    return moves.slice(0, 4).map(move => {
      const ppPercent = (move.currentPp / move.maxPp) * 100;
      const ppClass = ppPercent > 50 ? 'high' : ppPercent > 25 ? 'medium' : 'low';
      
      return `
        <div class="stat-item">
          <span class="stat-label">${this.formatMoveName(move.moveId || move.name)}</span>
          <span class="stat-value">${move.currentPp}/${move.maxPp}</span>
          <div class="health-bar" style="height: 4px; margin-top: 5px;">
            <div class="health-fill ${ppClass}" style="width: ${ppPercent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  formatMoveName(moveId) {
    return moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // === 🎮 NAVIGATION VUES ===
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue: ${viewName}`);
    
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
    console.log(`🎬 [TeamUI] Action: ${action}`, data);
    
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
    console.log('🧹 [TeamUI] Destruction...');
    
    // Supprimer les événements globaux
    document.removeEventListener('keydown', this.keydownHandler);
    
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
    
    console.log('✅ [TeamUI] Détruit');
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
      hasOnAction: !!this.onAction
    };
  }
}

export default TeamUI;

// Exposer globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI SIMPLIFIÉ ===

✅ RESPONSABILITÉS:
- Interface overlay complète
- 3 vues: Overview, Details, Moves
- Gestion sélection Pokémon
- Actions utilisateur

🎨 DESIGN:
- Overlay fullscreen avec container
- Grid 3x2 pour les 6 slots Pokémon
- Tabs navigation intuitive
- Design harmonisé (bleu theme)

🎛️ API UIMANAGER:
- show() → affiche overlay
- hide() → cache overlay
- setEnabled(bool) → active/désactive
- toggle() → ouvre/ferme

📊 DONNÉES:
- updateTeamData(data) → rafraîchit tout
- Cartes Pokémon avec HP, types, level
- Résumé équipe avec stats
- Vue détaillée sélection

🎮 NAVIGATION:
- Tab Overview → grille + résumé
- Tab Details → détails Pokémon sélectionné  
- Tab Moves → gestion attaques

🎬 ACTIONS:
- Heal All → soigne équipe
- PC Storage → accès PC
- Auto Arrange → réorganise
- Heal/Remove par Pokémon

🔗 CALLBACK:
- onAction(action, data) → vers TeamManager
- requestData, healTeam, healPokemon, etc.

⌨️ CONTRÔLES:
- ESC → ferme interface
- Clic outside → ferme interface
- Double-clic Pokémon → vue détails

📱 RESPONSIVE:
- Mobile: grid 2x3, tabs verticaux
- Tablet: optimisé touch
- Desktop: expérience complète

🎯 INTERFACE COMPLÈTE ET INTUITIVE !
`);
