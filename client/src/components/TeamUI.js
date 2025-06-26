// client/src/components/TeamUI.js - Interface d'équipe Pokémon

export class TeamUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.draggedPokemon = null;
    this.currentView = 'overview'; // overview, details, moves
    this.pokemonLocalizations = {};
    this.language = 'en'; // ou "fr" 
    this._initAsync(); // Voir ci-dessous
  }

  async _initAsync() {
  await this.loadPokemonLocalizations();
  this.init(); // maintenant tu appelles l’init "UI" normale
}
  
  init() {
    this.createTeamInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('⚔️ Interface d\'équipe initialisée');
  }

  async loadPokemonLocalizations() {
  try {
    const response = await fetch('/localization/pokemon/gen1/en.json');
    this.pokemonLocalizations = await response.json();
    console.log('✅ Pokémon loca chargée !', this.pokemonLocalizations);
  } catch (err) {
    console.error('❌ Erreur chargement loca Pokémon', err);
    this.pokemonLocalizations = {};
  }
}
getPokemonName(pokemonId) {
  const idStr = String(pokemonId).padStart(3, '0'); // "001"
  // Tente "001" puis "1"
  return (
    (this.pokemonLocalizations[idStr] && this.pokemonLocalizations[idStr].name) ||
    (this.pokemonLocalizations[pokemonId] && this.pokemonLocalizations[pokemonId].name) ||
    `#${pokemonId}`
  );
}

getPokemonPortrait(pokemonId, options = {}) {
  let id = Number(pokemonId);
  let variant = options.shiny ? '_shiny' : '';
  return `/assets/pokemon/portraitanime/${id}${variant}.png`;
}

  
  createTeamInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';

    overlay.innerHTML = `
      <div class="team-container">
        <!-- Header avec titre et contrôles -->
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <span class="team-name">Mon Équipe</span>
              <span class="team-subtitle">Pokémon de Combat</span>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <span class="team-count">0/6</span>
              <span class="team-status">Ready</span>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>

        <!-- Navigation des vues -->
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

        <div class="team-content">
          <!-- Vue Overview: Équipe complète -->
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
                  <!-- Types seront générés ici -->
                </div>
              </div>
            </div>
          </div>

          <!-- Vue Details: Pokémon sélectionné -->
          <div class="team-view team-details" id="team-details">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚔️</div>
                <p>Sélectionnez un Pokémon pour voir ses détails</p>
              </div>
            </div>
          </div>

          <!-- Vue Moves: Attaques de l'équipe -->
          <div class="team-view team-moves" id="team-moves">
            <div class="moves-grid" id="moves-grid">
              <!-- Attaques seront générées ici -->
            </div>
          </div>
        </div>

        <!-- Footer avec actions -->
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
            <div class="info-tip">💡 Drag & drop to reorder Pokémon</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.addStyles();
  }

  generateTeamSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot" data-slot="${i}">
          <div class="slot-background">
            <div class="slot-number">${i + 1}</div>
            <div class="empty-slot">
              <div class="empty-icon">➕</div>
              <div class="empty-text">Empty</div>
            </div>
          </div>
        </div>
      `;
    }
    return slotsHTML;
  }

  addStyles() {
    if (document.querySelector('#team-styles')) return;

    const style = document.createElement('style');
    style.id = 'team-styles';
    style.textContent = `
      /* ===== TEAM UI STYLES - Consistent with Inventory/Shop ===== */
      
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
        backdrop-filter: blur(5px);
        transition: opacity 0.3s ease;
      }

      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .team-container {
        width: 95%;
        max-width: 1100px;
        height: 90%;
        max-height: 800px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #e74c3c;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .team-overlay:not(.hidden) .team-container {
        transform: scale(1);
      }

      /* ===== HEADER ===== */
      .team-header {
        background: linear-gradient(90deg, #e74c3c, #c0392b);
        padding: 15px 25px;
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #c0392b;
        position: relative;
        overflow: hidden;
      }

      .team-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: shimmer 3s infinite;
      }

      .team-title {
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1;
      }

      .team-icon {
        font-size: 32px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        animation: teamPulse 2s infinite;
      }

      @keyframes teamPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .team-title-text {
        display: flex;
        flex-direction: column;
      }

      .team-name {
        font-size: 22px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      }

      .team-subtitle {
        font-size: 12px;
        opacity: 0.9;
        font-style: italic;
      }

      .team-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1;
      }

      .team-stats {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 25px;
        padding: 8px 15px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: bold;
      }

      .team-count {
        color: #f39c12;
        font-size: 16px;
      }

      .team-status {
        color: #2ecc71;
        font-size: 12px;
      }

      .team-close-btn {
        background: rgba(220, 53, 69, 0.8);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .team-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
      }

      /* ===== TABS ===== */
      .team-tabs {
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        border-bottom: 2px solid #c0392b;
      }

      .team-tab {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 15px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        position: relative;
      }

      .team-tab:hover {
        background: rgba(231, 76, 60, 0.2);
        color: rgba(255, 255, 255, 0.9);
      }

      .team-tab.active {
        background: linear-gradient(180deg, rgba(231, 76, 60, 0.4), rgba(231, 76, 60, 0.2));
        color: #ffcccb;
        border-bottom: 3px solid #e74c3c;
      }

      .tab-icon {
        font-size: 18px;
      }

      /* ===== CONTENT ===== */
      .team-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .team-view {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        overflow-y: auto;
        padding: 20px;
      }

      .team-view.active {
        opacity: 1;
        transform: translateX(0);
      }

      /* ===== OVERVIEW VIEW ===== */
      .team-overview {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 25px;
        height: 100%;
      }

      .team-slots-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 15px;
        height: 100%;
      }

      .team-slot {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .team-slot:hover {
        background: rgba(231, 76, 60, 0.1);
        border-color: rgba(231, 76, 60, 0.3);
        transform: translateY(-2px);
      }

      .team-slot.selected {
        background: rgba(231, 76, 60, 0.2);
        border-color: #e74c3c;
        box-shadow: 0 0 20px rgba(231, 76, 60, 0.4);
      }

      .team-slot.drag-over {
        background: rgba(46, 204, 113, 0.2);
        border-color: #2ecc71;
        border-style: dashed;
      }

      .slot-background {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px;
      }

      .slot-number {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.5);
        color: #ccc;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }

      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        transition: opacity 0.3s ease;
      }

      .team-slot:hover .empty-slot {
        opacity: 0.8;
      }

      .empty-icon {
        font-size: 32px;
        margin-bottom: 5px;
        color: #95a5a6;
      }

      .empty-text {
        font-size: 12px;
        color: #95a5a6;
        font-style: italic;
      }

      /* ===== POKEMON CARD IN SLOT ===== */
      .pokemon-card {
        width: 100%;
        height: 100%;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        position: relative;
        cursor: grab;
        transition: all 0.3s ease;
      }

      .pokemon-card:active {
        cursor: grabbing;
      }

      .pokemon-card.dragging {
        opacity: 0.7;
        transform: rotate(5deg);
      }

      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .pokemon-name {
        font-size: 14px;
        font-weight: bold;
        color: #ecf0f1;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pokemon-level {
        background: #f39c12;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
      }

      .pokemon-sprite {
        text-align: center;
        margin: 5px 0;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pokemon-icon {
        font-size: 24px;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
      }

      .pokemon-health {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 5px;
      }

      .health-bar {
        flex: 1;
        height: 6px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }

      .health-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .health-fill.high { background: #2ecc71; }
      .health-fill.medium { background: #f39c12; }
      .health-fill.low { background: #e74c3c; }
      .health-fill.critical { background: #8e44ad; }

      .health-text {
        font-size: 10px;
        color: #bdc3c7;
        min-width: 30px;
        text-align: right;
      }

      .pokemon-status {
        display: flex;
        gap: 3px;
        flex-wrap: wrap;
        min-height: 16px;
      }

      .status-indicator {
        padding: 2px 4px;
        border-radius: 8px;
        font-size: 8px;
        font-weight: bold;
        text-transform: uppercase;
      }

      .status-normal { background: #95a5a6; color: white; }
      .status-poison { background: #9b59b6; color: white; }
      .status-burn { background: #e67e22; color: white; }
      .status-sleep { background: #34495e; color: white; }
      .status-paralysis { background: #f1c40f; color: black; }
      .status-freeze { background: #3498db; color: white; }

      .pokemon-types {
        display: flex;
        gap: 3px;
        margin-top: 5px;
      }

      .type-badge {
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 8px;
        font-weight: bold;
        text-transform: uppercase;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      }

      /* Type colors */
      .type-normal { background: #A8A878; }
      .type-fire { background: #F08030; }
      .type-water { background: #6890F0; }
      .type-electric { background: #F8D030; }
      .type-grass { background: #78C850; }
      .type-ice { background: #98D8D8; }
      .type-fighting { background: #C03028; }
      .type-poison { background: #A040A0; }
      .type-ground { background: #E0C068; }
      .type-flying { background: #A890F0; }
      .type-psychic { background: #F85888; }
      .type-bug { background: #A8B820; }
      .type-rock { background: #B8A038; }
      .type-ghost { background: #705898; }
      .type-dragon { background: #7038F8; }
      .type-dark { background: #705848; }
      .type-steel { background: #B8B8D0; }
      .type-fairy { background: #EE99AC; }

      /* ===== TEAM SUMMARY ===== */
      .team-summary {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .summary-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .summary-section h4 {
        margin: 0 0 12px 0;
        color: #e74c3c;
        font-size: 14px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .summary-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .stat-item:last-child {
        border-bottom: none;
      }

      .stat-label {
        font-size: 12px;
        color: #bdc3c7;
      }

      .stat-value {
        font-size: 12px;
        font-weight: bold;
        color: #ecf0f1;
      }

      .type-coverage {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 5px;
      }

      .coverage-type {
        text-align: center;
        padding: 4px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* ===== FOOTER ===== */
      .team-footer {
        background: rgba(0, 0, 0, 0.3);
        padding: 20px 25px;
        border-top: 2px solid #c0392b;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 17px 17px;
      }

      .team-actions {
        display: flex;
        gap: 12px;
      }

      .team-btn {
        background: rgba(231, 76, 60, 0.8);
        border: none;
        color: white;
        padding: 10px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .team-btn:hover:not(:disabled) {
        background: rgba(231, 76, 60, 1);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(231, 76, 60, 0.4);
      }

      .team-btn:disabled {
        background: rgba(108, 117, 125, 0.5);
        cursor: not-allowed;
      }

      .team-btn.secondary {
        background: rgba(108, 117, 125, 0.8);
      }

      .team-btn.secondary:hover {
        background: rgba(108, 117, 125, 1);
      }

      .team-info {
        color: #95a5a6;
        font-size: 12px;
      }

      .info-tip {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .team-container {
          width: 98%;
          height: 95%;
        }

        .team-overview {
          grid-template-columns: 1fr;
          grid-template-rows: 2fr 1fr;
        }

        .team-slots-grid {
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
        }

        .team-footer {
          flex-direction: column;
          gap: 15px;
        }

        .team-actions {
          flex-wrap: wrap;
          justify-content: center;
        }
      }

      /* ===== ANIMATIONS ===== */
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      @keyframes pokemonAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .pokemon-card.new {
        animation: pokemonAppear 0.5s ease;
      }

      /* ===== SCROLLBAR ===== */
      .team-view::-webkit-scrollbar {
        width: 8px;
      }

      .team-view::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .team-view::-webkit-scrollbar-thumb {
        background: rgba(231, 76, 60, 0.6);
        border-radius: 4px;
      }

.pokemon-portrait {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
}

      .team-view::-webkit-scrollbar-thumb:hover {
        background: rgba(231, 76, 60, 0.8);
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Fermeture
    this.overlay.querySelector('.team-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // Fermeture avec ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Navigation entre les vues
    this.overlay.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });

    // Actions du footer
    this.overlay.querySelector('#heal-team-btn').addEventListener('click', () => {
      this.healTeam();
    });

    this.overlay.querySelector('#pc-access-btn').addEventListener('click', () => {
      this.openPCStorage();
    });

    this.overlay.querySelector('#auto-arrange-btn').addEventListener('click', () => {
      this.autoArrangeTeam();
    });

    // Drag & Drop
    this.setupDragAndDrop();

    // Fermeture en cliquant à l'extérieur
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Réception des données d'équipe
    this.gameRoom.onMessage("teamData", (data) => {
      this.updateTeamData(data);
    });

    // Résultat des actions d'équipe
    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.handleTeamActionResult(data);
    });

    // Mise à jour d'un Pokémon
    this.gameRoom.onMessage("pokemonUpdate", (data) => {
      this.handlePokemonUpdate(data);
    });
  }

  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
    
    // Requête des données d'équipe
    this.requestTeamData();
    
    console.log('⚔️ Interface d\'équipe ouverte');
  }

  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.overlay.classList.add('hidden');
    this.selectedPokemon = null;
    
    console.log('⚔️ Interface d\'équipe fermée');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  requestTeamData() {
    if (this.gameRoom) {
      this.gameRoom.send("getTeam");
    }
  }

  updateTeamData(data) {
    this.teamData = data.team || [];
    this.refreshTeamDisplay();
    this.updateTeamStats();
    console.log('⚔️ Données d\'équipe mises à jour');
  }

  refreshTeamDisplay() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');
    
    // Clear existing pokemon cards
    slotsContainer.querySelectorAll('.pokemon-card').forEach(card => card.remove());
    
    // Display each pokemon
    this.teamData.forEach((pokemon, index) => {
      if (pokemon && index < 6) {
        const slot = slotsContainer.querySelector(`[data-slot="${index}"]`);
        this.displayPokemonInSlot(slot, pokemon, index);
      }
    });
  }

  displayPokemonInSlot(slot, pokemon, index) {
    console.log('[DEBUG NOMS]', pokemon.pokemonId, this.getPokemonName(pokemon.pokemonId));
    // Hide empty slot
    const emptySlot = slot.querySelector('.empty-slot');
    if (emptySlot) emptySlot.style.display = 'none';

    // Create pokemon card
    const pokemonCard = document.createElement('div');
    pokemonCard.className = 'pokemon-card';
    pokemonCard.dataset.pokemonId = pokemon._id;
    pokemonCard.dataset.slot = index;
    pokemonCard.draggable = true;

    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const statusDisplay = this.getStatusDisplay(pokemon.status);
    const typesDisplay = this.getTypesDisplay(pokemon.types);

    pokemonCard.innerHTML = `
  <div class="pokemon-header">
    <div class="pokemon-name" title="${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}">
      ${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}
    </div>
    <div class="pokemon-level">Lv.${pokemon.level}</div>
  </div>
      
<div class="pokemon-sprite">
  <img 
    src="${this.getPokemonPortrait(pokemon.pokemonId, { shiny: pokemon.shiny })}"
    class="pokemon-portrait"
    alt="${this.getPokemonName(pokemon.pokemonId)}"
    loading="lazy"
    onerror="this.src='/assets/pokemon/portraitanime/unknown.png';"
  >
</div>

      
      <div class="pokemon-health">
        <div class="health-bar">
          <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
        </div>
        <div class="health-text">${pokemon.currentHp}/${pokemon.maxHp}</div>
      </div>
      
      <div class="pokemon-status">
        ${statusDisplay}
      </div>
      
      <div class="pokemon-types">
        ${typesDisplay}
      </div>
    `;

    // Event listeners
    pokemonCard.addEventListener('click', () => {
      this.selectPokemon(pokemon, pokemonCard);
    });

    pokemonCard.addEventListener('dblclick', () => {
      this.showPokemonDetails(pokemon);
    });

    slot.appendChild(pokemonCard);

    // Animation
    setTimeout(() => {
      pokemonCard.classList.add('new');
    }, index * 100);
  }

  getPokemonIcon(pokemonId) {
    // Mapping des icônes par ID de Pokémon
    const iconMap = {
      1: '🌱', 2: '🌿', 3: '🌺', // Bulbasaur line
      4: '🦎', 5: '🔥', 6: '🐉', // Charmander line
      7: '🐢', 8: '💧', 9: '🌊', // Squirtle line
      10: '🐛', 11: '🛡️', 12: '🦋', // Caterpie line
      25: '⚡', 26: '⚡', // Pikachu line
      // ... etc
    };
    return iconMap[pokemonId] || '❓';
  }

  getHealthClass(healthPercent) {
    if (healthPercent > 75) return 'high';
    if (healthPercent > 50) return 'medium';
    if (healthPercent > 25) return 'low';
    return 'critical';
  }

  getStatusDisplay(status) {
    if (!status || status === 'normal') return '';
    
    const statusMap = {
      poison: '<span class="status-indicator status-poison">PSN</span>',
      burn: '<span class="status-indicator status-burn">BRN</span>',
      sleep: '<span class="status-indicator status-sleep">SLP</span>',
      paralysis: '<span class="status-indicator status-paralysis">PAR</span>',
      freeze: '<span class="status-indicator status-freeze">FRZ</span>'
    };
    
    return statusMap[status] || '';
  }

  getTypesDisplay(types) {
    if (!types || !Array.isArray(types)) return '';
    
    return types.map(type => 
      `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
  }

  selectPokemon(pokemon, cardElement) {
    // Désélectionner l'ancien
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.parentElement.classList.remove('selected');
    });

    // Sélectionner le nouveau
    cardElement.parentElement.classList.add('selected');
    this.selectedPokemon = pokemon;

    // Mettre à jour les vues
    this.updateDetailView();
  }

  showPokemonDetails(pokemon) {
    this.selectedPokemon = pokemon;
    this.switchToView('details');
    this.updateDetailView();
  }

  updateDetailView() {
    const detailPanel = this.overlay.querySelector('.pokemon-detail-panel');
    
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
  <img 
    src="${this.getPokemonPortrait(pokemon.pokemonId, { shiny: pokemon.shiny })}"
    class="pokemon-portrait"
    alt="${this.getPokemonName(pokemon.pokemonId)}"
    loading="lazy"
    onerror="this.src='/assets/pokemon/portraitanime/unknown.png';"
  >
</div>

          <div class="pokemon-detail-info">
           <h3>${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}</h3>
            <div class="pokemon-detail-subtitle">
              Level ${pokemon.level} • ${pokemon.types?.join('/') || 'Unknown Type'}
            </div>
            <div class="pokemon-detail-nature">Nature: ${pokemon.nature || 'Unknown'}</div>
          </div>
        </div>

        <div class="pokemon-stats-section">
          <h4>📊 Battle Stats</h4>
          <div class="stats-grid">
            <div class="stat-row">
              <span class="stat-name">HP</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill ${healthClass}" style="width: ${healthPercent}%"></div>
                </div>
                <span class="stat-value">${pokemon.currentHp}/${pokemon.maxHp}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Attack</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width: ${Math.min((pokemon.calculatedStats?.attack || 0) / 200 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemon.calculatedStats?.attack || 0}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Defense</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width: ${Math.min((pokemon.calculatedStats?.defense || 0) / 200 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemon.calculatedStats?.defense || 0}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Sp. Atk</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width: ${Math.min((pokemon.calculatedStats?.spAttack || 0) / 200 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemon.calculatedStats?.spAttack || 0}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Sp. Def</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width: ${Math.min((pokemon.calculatedStats?.spDefense || 0) / 200 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemon.calculatedStats?.spDefense || 0}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Speed</span>
              <div class="stat-bar-container">
                <div class="stat-bar">
                  <div class="stat-fill" style="width: ${Math.min((pokemon.calculatedStats?.speed || 0) / 200 * 100, 100)}%"></div>
                </div>
                <span class="stat-value">${pokemon.calculatedStats?.speed || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pokemon-moves-section">
          <h4>⚡ Known Moves</h4>
          <div class="moves-list">
            ${this.getMovesDisplay(pokemon.moves)}
          </div>
        </div>

        <div class="pokemon-actions">
          <button class="detail-btn" onclick="teamUI.healPokemon('${pokemon._id}')">
            <span class="btn-icon">💊</span>
            <span class="btn-text">Heal</span>
          </button>
          <button class="detail-btn secondary" onclick="teamUI.removePokemon('${pokemon._id}')">
            <span class="btn-icon">📦</span>
            <span class="btn-text">To PC</span>
          </button>
        </div>
      </div>
    `;
  }

  getMovesDisplay(moves) {
    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return '<div class="no-moves">No moves learned</div>';
    }

    return moves.map(move => {
      const ppPercent = (move.currentPp / move.maxPp) * 100;
      const ppClass = ppPercent > 50 ? 'high' : ppPercent > 25 ? 'medium' : 'low';
      
      return `
        <div class="move-item">
          <div class="move-header">
            <span class="move-name">${this.formatMoveName(move.moveId)}</span>
            <span class="move-pp ${ppClass}">${move.currentPp}/${move.maxPp}</span>
          </div>
          <div class="move-pp-bar">
            <div class="move-pp-fill ${ppClass}" style="width: ${ppPercent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  formatMoveName(moveId) {
    return moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  switchToView(viewName) {
    // Update tabs
    this.overlay.querySelectorAll('.team-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    // Update views
    this.overlay.querySelectorAll('.team-view').forEach(view => {
      view.classList.toggle('active', view.id === `team-${viewName}`);
    });

    this.currentView = viewName;

    // Update view-specific content
    if (viewName === 'moves') {
      this.updateMovesView();
    }
  }

  updateMovesView() {
    const movesGrid = this.overlay.querySelector('#moves-grid');
    
    if (this.teamData.length === 0) {
      movesGrid.innerHTML = `
        <div class="no-team">
          <div class="no-team-icon">⚔️</div>
          <p>No Pokémon in team</p>
        </div>
      `;
      return;
    }

    const allMoves = new Map();
    
    // Collecter toutes les attaques de l'équipe
    this.teamData.forEach(pokemon => {
      if (pokemon.moves) {
        pokemon.moves.forEach(move => {
          if (!allMoves.has(move.moveId)) {
            allMoves.set(move.moveId, {
              moveId: move.moveId,
              users: [],
              maxPp: move.maxPp
            });
          }
          allMoves.get(move.moveId).users.push({
            pokemon: pokemon.nickname || pokemon.name,
            currentPp: move.currentPp,
            maxPp: move.maxPp
          });
        });
      }
    });

    if (allMoves.size === 0) {
      movesGrid.innerHTML = `
        <div class="no-moves">
          <div class="no-moves-icon">⚡</div>
          <p>No moves learned by team</p>
        </div>
      `;
      return;
    }

    const movesHTML = Array.from(allMoves.values()).map(moveData => {
      const usersHTML = moveData.users.map(user => {
        const ppPercent = (user.currentPp / user.maxPp) * 100;
        const ppClass = ppPercent > 50 ? 'high' : ppPercent > 25 ? 'medium' : 'low';
        
        return `
          <div class="move-user">
            <span class="user-name">${user.pokemon}</span>
            <span class="user-pp ${ppClass}">${user.currentPp}/${user.maxPp}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="team-move-card">
          <div class="team-move-header">
            <span class="team-move-name">${this.formatMoveName(moveData.moveId)}</span>
            <span class="team-move-count">${moveData.users.length} user(s)</span>
          </div>
          <div class="team-move-users">
            ${usersHTML}
          </div>
        </div>
      `;
    }).join('');

    movesGrid.innerHTML = movesHTML;
  }

  updateTeamStats() {
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + p.level, 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + p.currentHp, 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + p.maxHp, 0);
    const canBattle = aliveCount > 0;

    // Update header stats
    this.overlay.querySelector('.team-count').textContent = `${teamCount}/6`;
    this.overlay.querySelector('.team-status').textContent = canBattle ? 'Ready' : 'Not Ready';
    this.overlay.querySelector('.team-status').style.color = canBattle ? '#2ecc71' : '#e74c3c';

    // Update summary stats
    this.overlay.querySelector('#avg-level').textContent = avgLevel;
    this.overlay.querySelector('#total-hp').textContent = `${totalCurrentHp}/${totalMaxHp}`;
    this.overlay.querySelector('#battle-ready').textContent = canBattle ? 'Yes' : 'No';
    this.overlay.querySelector('#battle-ready').style.color = canBattle ? '#2ecc71' : '#e74c3c';

    // Update type coverage
    this.updateTypeCoverage();
  }

  updateTypeCoverage() {
    const coverageContainer = this.overlay.querySelector('#type-coverage');
    const types = new Set();
    
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });

    if (types.size === 0) {
      coverageContainer.innerHTML = '<div class="no-coverage">No type coverage</div>';
      return;
    }

    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }

  setupDragAndDrop() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');

    slotsContainer.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('pokemon-card')) {
        this.draggedPokemon = {
          element: e.target,
          originalSlot: parseInt(e.target.dataset.slot),
          pokemonId: e.target.dataset.pokemonId
        };
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    slotsContainer.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('pokemon-card')) {
        e.target.classList.remove('dragging');
        this.draggedPokemon = null;
      }
    });

    slotsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    slotsContainer.addEventListener('dragenter', (e) => {
      if (e.target.closest('.team-slot')) {
        e.target.closest('.team-slot').classList.add('drag-over');
      }
    });

    slotsContainer.addEventListener('dragleave', (e) => {
      if (e.target.closest('.team-slot') && !e.target.closest('.team-slot').contains(e.relatedTarget)) {
        e.target.closest('.team-slot').classList.remove('drag-over');
      }
    });

    slotsContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetSlot = e.target.closest('.team-slot');
      
      if (targetSlot && this.draggedPokemon) {
        targetSlot.classList.remove('drag-over');
        const targetSlotIndex = parseInt(targetSlot.dataset.slot);
        
        if (targetSlotIndex !== this.draggedPokemon.originalSlot) {
          this.swapPokemon(this.draggedPokemon.originalSlot, targetSlotIndex);
        }
      }
    });
  }

  swapPokemon(fromSlot, toSlot) {
    if (this.gameRoom) {
      this.gameRoom.send("swapTeamSlots", {
        slotA: fromSlot,
        slotB: toSlot
      });
    }
  }

  healTeam() {
    if (this.gameRoom) {
      this.gameRoom.send("healTeam");
    }
  }

  healPokemon(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("healPokemon", { pokemonId });
    }
  }

  removePokemon(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    }
  }

  openPCStorage() {
    // TODO: Implémenter l'interface PC
    this.showNotification("PC Storage not yet implemented", "info");
  }

  autoArrangeTeam() {
    if (this.gameRoom) {
      this.gameRoom.send("autoArrangeTeam");
    }
  }

  handleTeamActionResult(data) {
    if (data.success) {
      this.showNotification(data.message || "Action completed successfully", "success");
      // Rafraîchir les données
      this.requestTeamData();
    } else {
      this.showNotification(data.message || "Action failed", "error");
    }
  }

  handlePokemonUpdate(data) {
    // Mettre à jour un Pokémon spécifique dans l'équipe
    const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
    if (pokemonIndex !== -1) {
      this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
      this.refreshTeamDisplay();
      this.updateTeamStats();
      
      // Mettre à jour la vue détails si c'est le Pokémon sélectionné
      if (this.selectedPokemon && this.selectedPokemon._id === data.pokemonId) {
        this.selectedPokemon = this.teamData[pokemonIndex];
        this.updateDetailView();
      }
    }
  }

  showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = 'team-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1002;
      animation: slideInRight 0.4s ease;
      max-width: 300px;
      border-left: 4px solid;
    `;

    // Couleurs selon le type
    switch (type) {
      case 'success':
        notification.style.background = 'rgba(46, 204, 113, 0.95)';
        notification.style.borderLeftColor = '#2ecc71';
        break;
      case 'error':
        notification.style.background = 'rgba(231, 76, 60, 0.95)';
        notification.style.borderLeftColor = '#e74c3c';
        break;
      default:
        notification.style.background = 'rgba(52, 152, 219, 0.95)';
        notification.style.borderLeftColor = '#3498db';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-suppression
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // Méthodes publiques pour l'intégration
  isOpen() {
    return this.isVisible;
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !inventoryOpen;
  }

  // Gestion des raccourcis clavier
  handleKeyPress(key) {
    if (!this.isVisible) return false;

    switch (key) {
      case 'Escape':
        this.hide();
        return true;
      case 'Tab':
        this.switchToNextView();
        return true;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        const slotIndex = parseInt(key) - 1;
        this.selectPokemonBySlot(slotIndex);
        return true;
      case 'h':
      case 'H':
        this.healTeam();
        return true;
    }

    return false;
  }

  switchToNextView() {
    const views = ['overview', 'details', 'moves'];
    const currentIndex = views.indexOf(this.currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    this.switchToView(views[nextIndex]);
  }

  selectPokemonBySlot(slotIndex) {
    if (slotIndex < this.teamData.length) {
      const pokemon = this.teamData[slotIndex];
      const pokemonCard = this.overlay.querySelector(`[data-slot="${slotIndex}"] .pokemon-card`);
      if (pokemon && pokemonCard) {
        this.selectPokemon(pokemon, pokemonCard);
      }
    }
  }

  // Méthode de nettoyage
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    this.gameRoom = null;
    this.teamData = [];
    this.selectedPokemon = null;
    this.overlay = null;
    
    console.log('⚔️ TeamUI détruit');
  }

  // Méthodes d'intégration avec d'autres systèmes
  onPokemonCaught(pokemon) {
    // Animation lors de la capture d'un nouveau Pokémon
    this.showNotification(`${pokemon.name} added to team!`, 'success');
    this.requestTeamData();
  }

  onBattleStart() {
    // Masquer l'interface pendant les combats
    if (this.isVisible) {
      this.hide();
    }
  }

  // Exportation des données pour la sauvegarde
  exportData() {
    return {
      currentView: this.currentView,
      selectedPokemonId: this.selectedPokemon ? this.selectedPokemon._id : null
    };
  }

  // Importation des données lors du chargement
  importData(data) {
    if (data.currentView) {
      this.currentView = data.currentView;
    }
    // selectedPokemonId sera restauré lors du refresh des données
  }
}
