// client/src/components/TeamUI.js - Avec TemplateManager

import { TemplateManager } from '../utils/TemplateManager.js';

export class TeamUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.draggedPokemon = null;
    this.currentView = 'overview';
    this.pokemonLocalizations = {};
    this.language = 'en';
    
    // ✅ Utilise le TemplateManager
    this.templateManager = new TemplateManager();
    
    this._initAsync();
  }

  async _initAsync() {
    await Promise.all([
      this.loadPokemonLocalizations(),
      this.loadCSS(),
      this.loadTemplates()
    ]);
    this.init();
  }

  // ✅ Charge tous les templates nécessaires
  async loadTemplates() {
    try {
      console.log('📄 Chargement des templates...');
      
      const templates = await this.templateManager.loadTemplates([
        'team-ui',           // Template principal
        'team-slot',         // Template de slot
        'pokemon-card',      // Template de carte Pokémon
        'pokemon-detail'     // Template de détails
      ]);
      
      // Vérifie que les templates critiques sont chargés
      if (!templates['team-ui']) {
        throw new Error('Template principal manquant');
      }
      
      console.log('✅ Templates chargés !');
      
      // Définit des templates de fallback si certains échouent
      this.setupFallbackTemplates();
      
    } catch (err) {
      console.error('❌ Erreur chargement templates:', err);
      this.setupFallbackTemplates();
    }
  }

  setupFallbackTemplates() {
    // Templates de secours
    this.templateManager.setTemplate('team-ui-fallback', `
      <div class="team-container">
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <span class="team-name">{{TEAM_NAME}}</span>
              <span class="team-subtitle">{{TEAM_SUBTITLE}}</span>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <span class="team-count">{{TEAM_COUNT}}</span>
              <span class="team-status">{{TEAM_STATUS}}</span>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        <div class="team-content">
          <div class="team-view team-overview active">
            <div class="team-slots-grid" id="team-slots-grid"></div>
          </div>
        </div>
      </div>
    `);

    this.templateManager.setTemplate('team-slot-fallback', `
      <div class="team-slot" data-slot="{{SLOT_INDEX}}">
        <div class="slot-background">
          <div class="slot-number">{{SLOT_NUMBER}}</div>
          <div class="empty-slot">
            <div class="empty-icon">➕</div>
            <div class="empty-text">Empty</div>
          </div>
        </div>
      </div>
    `);

    this.templateManager.setTemplate('pokemon-card-fallback', `
      <div class="pokemon-header">
        <div class="pokemon-name" title="{{POKEMON_FULL_NAME}}">{{POKEMON_NAME}}</div>
        <div class="pokemon-level">Lv.{{POKEMON_LEVEL}}</div>
      </div>
      <div class="pokemon-sprite">
        <div class="pokemon-portrait" style="{{PORTRAIT_STYLE}}"></div>
      </div>
      <div class="pokemon-health">
        <div class="health-bar">
          <div class="health-fill {{HEALTH_CLASS}}" style="width: {{HEALTH_PERCENT}}%"></div>
        </div>
        <div class="health-text">{{CURRENT_HP}}/{{MAX_HP}}</div>
      </div>
      <div class="pokemon-status">{{STATUS_DISPLAY}}</div>
      <div class="pokemon-types">{{TYPES_DISPLAY}}</div>
    `);
  }

  async loadCSS() {
    if (document.querySelector('#team-ui-styles')) {
      console.log('🎨 CSS Team UI déjà chargé');
      return;
    }

    try {
      const link = document.createElement('link');
      link.id = 'team-ui-styles';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '/css/team-ui.css';
      
      return new Promise((resolve) => {
        link.onload = () => {
          console.log('✅ CSS Team UI chargé !');
          resolve();
        };
        link.onerror = () => {
          console.error('❌ Erreur chargement CSS Team UI');
          this.addFallbackStyles();
          resolve();
        };
        
        document.head.appendChild(link);
      });
    } catch (err) {
      console.error('❌ Erreur lors du chargement du CSS:', err);
      this.addFallbackStyles();
    }
  }

  addFallbackStyles() {
    if (document.querySelector('#team-ui-fallback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'team-ui-fallback-styles';
    style.textContent = `
      .team-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 1000; transition: opacity 0.3s ease; }
      .team-overlay.hidden { opacity: 0; pointer-events: none; }
      .team-container { width: 90%; height: 80%; max-width: 1100px; max-height: 800px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42); border: 3px solid #e74c3c; 
        border-radius: 20px; color: white; font-family: Arial, sans-serif; 
        display: flex; flex-direction: column; }
      .team-header { background: #e74c3c; padding: 15px; border-radius: 17px 17px 0 0; 
        display: flex; justify-content: space-between; align-items: center; }
      .team-content { flex: 1; padding: 20px; }
      .team-close-btn { background: #dc3545; border: none; color: white; 
        width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
      .team-slots-grid { display: grid; grid-template-columns: repeat(2, 1fr); 
        grid-template-rows: repeat(3, 1fr); gap: 15px; height: 300px; }
      .team-slot { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
        border-radius: 15px; min-height: 80px; position: relative; }
      .slot-background { width: 100%; height: 100%; display: flex; 
        align-items: center; justify-content: center; }
      .empty-slot { text-align: center; opacity: 0.5; }
      .pokemon-card { position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; 
        display: flex; flex-direction: column; }
    `;
    document.head.appendChild(style);
    console.log('🔄 Styles fallback chargés');
  }

  async loadPokemonLocalizations() {
    try {
      const response = await fetch('/localization/pokemon/gen1/en.json');
      this.pokemonLocalizations = await response.json();
      console.log('✅ Pokémon loca chargée !');
    } catch (err) {
      console.error('❌ Erreur chargement loca Pokémon', err);
      this.pokemonLocalizations = {};
    }
  }

  init() {
    this.createTeamInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    console.log('⚔️ Interface d\'équipe initialisée');
  }

  // ✅ Utilise le TemplateManager pour créer l'interface
  createTeamInterface() {
    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';

    // Utilise le template principal ou le fallback
    const template = this.templateManager.getTemplate('team-ui') || 
                    this.templateManager.getTemplate('team-ui-fallback');

    const templateData = {
      TEAM_NAME: 'Mon Équipe',
      TEAM_SUBTITLE: 'Pokémon de Combat',
      TEAM_COUNT: '0/6',
      TEAM_STATUS: 'Ready'
    };

    overlay.innerHTML = this.templateManager.render(template, templateData);

    document.body.appendChild(overlay);
    this.overlay = overlay;
    
    // Génère les slots après que le DOM soit créé
    this.generateTeamSlots();
  }

  // ✅ Génère les slots avec le TemplateManager
  generateTeamSlots() {
    const slotsContainer = this.overlay.querySelector('#team-slots-grid');
    if (!slotsContainer) {
      console.error('❌ Container des slots non trouvé');
      return;
    }

    const slotTemplate = this.templateManager.getTemplate('team-slot') || 
                        this.templateManager.getTemplate('team-slot-fallback');

    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      const slotData = {
        SLOT_INDEX: i,
        SLOT_NUMBER: i + 1
      };
      
      slotsHTML += this.templateManager.render(slotTemplate, slotData);
    }
    
    slotsContainer.innerHTML = slotsHTML;
  }

  // ✅ Utilise le TemplateManager pour les cartes Pokémon
  async displayPokemonInSlot(slot, pokemon, index) {
    console.log('[DEBUG NOMS]', pokemon.pokemonId, this.getPokemonName(pokemon.pokemonId));
    
    const slotBackground = slot.querySelector('.slot-background');
    if (!slotBackground) return;
    
    const emptySlot = slot.querySelector('.empty-slot');
    if (emptySlot) emptySlot.style.display = 'none';
    
    slotBackground.classList.add('has-pokemon');

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
    const pokemonName = this.getPokemonName(pokemon.pokemonId);

    // ✅ Utilise le template de carte Pokémon
    const cardTemplate = this.templateManager.getTemplate('pokemon-card') || 
                        this.templateManager.getTemplate('pokemon-card-fallback');

    const cardData = {
      POKEMON_NAME: pokemon.nickname || pokemonName,
      POKEMON_FULL_NAME: pokemon.nickname || pokemonName,
      POKEMON_LEVEL: pokemon.level,
      PORTRAIT_STYLE: this.getPortraitSpriteStyle(pokemon.pokemonId, { shiny: pokemon.shiny }),
      HEALTH_CLASS: healthClass,
      HEALTH_PERCENT: healthPercent,
      CURRENT_HP: pokemon.currentHp,
      MAX_HP: pokemon.maxHp,
      STATUS_DISPLAY: statusDisplay,
      TYPES_DISPLAY: typesDisplay
    };

    pokemonCard.innerHTML = this.templateManager.render(cardTemplate, cardData);

    // Event listeners
    pokemonCard.addEventListener('click', () => {
      this.selectPokemon(pokemon, pokemonCard);
    });

    pokemonCard.addEventListener('dblclick', () => {
      this.showPokemonDetails(pokemon);
    });

    slotBackground.appendChild(pokemonCard);

    // Animation
    setTimeout(() => {
      pokemonCard.classList.add('new');
    }, index * 100);
  }

  getPokemonName(pokemonId) {
    const idStr = String(pokemonId).padStart(3, '0');
    return (
      (this.pokemonLocalizations[idStr] && this.pokemonLocalizations[idStr].name) ||
      (this.pokemonLocalizations[pokemonId] && this.pokemonLocalizations[pokemonId].name) ||
      `#${pokemonId}`
    );
  }

  getPortraitSpriteStyle(pokemonId, options = {}) {
    const frameWidth = 80;
    const frameHeight = 80;
    const numCols = 10;
    const numRows = 10;
    const col = 0;
    const row = 0;

    let id = Number(pokemonId);
    let variant = options.shiny ? '_shiny' : '';
    const url = `/assets/pokemon/portraitanime/${id}${variant}.png`;

    const sheetWidth = frameWidth * numCols;
    const sheetHeight = frameHeight * numRows;

    return `
      width: ${frameWidth}px;
      height: ${frameHeight}px;
      background-image: url('${url}');
      background-size: ${sheetWidth}px ${sheetHeight}px;
      background-position: ${-col * frameWidth}px ${-row * frameHeight}px;
      background-repeat: no-repeat;
      image-rendering: pixelated;
      display: inline-block;
    `;
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
    const healBtn = this.overlay.querySelector('#heal-team-btn');
    if (healBtn) {
      healBtn.addEventListener('click', () => this.healTeam());
    }

    const pcBtn = this.overlay.querySelector('#pc-access-btn');
    if (pcBtn) {
      pcBtn.addEventListener('click', () => this.openPCStorage());
    }

    const arrangeBtn = this.overlay.querySelector('#auto-arrange-btn');
    if (arrangeBtn) {
      arrangeBtn.addEventListener('click', () => this.autoArrangeTeam());
    }

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

    this.gameRoom.onMessage("teamData", (data) => {
      this.updateTeamData(data);
    });

    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.handleTeamActionResult(data);
    });

    this.gameRoom.onMessage("pokemonUpdate", (data) => {
      this.handlePokemonUpdate(data);
    });
  }

  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.overlay.classList.remove('hidden');
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
    const slotsContainer = this.overlay.querySelector('#team-slots-grid');
    if (!slotsContainer) return;
    
    // Clear existing pokemon cards ET les classes
    slotsContainer.querySelectorAll('.pokemon-card').forEach(card => card.remove());
    slotsContainer.querySelectorAll('.slot-background').forEach(bg => {
      bg.classList.remove('has-pokemon');
      const emptySlot = bg.querySelector('.empty-slot');
      if (emptySlot) emptySlot.style.display = 'flex';
    });
    
    // Display each pokemon
    this.teamData.forEach((pokemon, index) => {
      if (pokemon && index < 6) {
        const slot = slotsContainer.querySelector(`[data-slot="${index}"]`);
        if (slot) {
          this.displayPokemonInSlot(slot, pokemon, index);
        }
      }
    });
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
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.parentElement.classList.remove('selected');
    });

    cardElement.parentElement.classList.add('selected');
    this.selectedPokemon = pokemon;
    this.updateDetailView();
  }

  showPokemonDetails(pokemon) {
    this.selectedPokemon = pokemon;
    this.switchToView('details');
    this.updateDetailView();
  }

  updateDetailView() {
    const detailPanel = this.overlay.querySelector('.pokemon-detail-panel');
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

    // ✅ Utilise le template de détails ou un template simple
    const detailTemplate = this.templateManager.getTemplate('pokemon-detail') || `
      <div class="pokemon-detail-content">
        <div class="pokemon-detail-header">
          <div class="pokemon-detail-icon">
            <div class="pokemon-portrait" style="{{PORTRAIT_STYLE}}" title="{{POKEMON_NAME}}"></div>
          </div>
          <div class="pokemon-detail-info">
           <h3>{{POKEMON_NAME}}</h3>
            <div class="pokemon-detail-subtitle">Level {{POKEMON_LEVEL}} • {{POKEMON_TYPES}}</div>
            <div class="pokemon-detail-nature">Nature: {{POKEMON_NATURE}}</div>
          </div>
        </div>
        <div class="pokemon-stats-section">
          <h4>📊 Battle Stats</h4>
          <div class="stats-grid">
            <div class="stat-row">
              <span class="stat-name">HP</span>
              <div class="stat-bar-container">
                <div class="stat-bar"><div class="stat-fill {{HEALTH_CLASS}}" style="width: {{HEALTH_PERCENT}}%"></div></div>
                <span class="stat-value">{{CURRENT_HP}}/{{MAX_HP}}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="pokemon-actions">
          <button class="detail-btn" onclick="teamUI.healPokemon('{{POKEMON_ID}}')">
            <span class="btn-icon">💊</span><span class="btn-text">Heal</span>
          </button>
          <button class="detail-btn secondary" onclick="teamUI.removePokemon('{{POKEMON_ID}}')">
            <span class="btn-icon">📦</span><span class="btn-text">To PC</span>
          </button>
        </div>
      </div>
    `;

    const detailData = {
      POKEMON_NAME: pokemon.nickname || this.getPokemonName(pokemon.pokemonId),
      POKEMON_LEVEL: pokemon.level,
      POKEMON_TYPES: pokemon.types?.join('/') || 'Unknown Type',
      POKEMON_NATURE: pokemon.nature || 'Unknown',
      POKEMON_ID: pokemon._id,
      PORTRAIT_STYLE: this.getPortraitSpriteStyle(pokemon.pokemonId, { shiny: pokemon.shiny }),
      HEALTH_CLASS: healthClass,
      HEALTH_PERCENT: healthPercent,
      CURRENT_HP: pokemon.currentHp,
      MAX_HP: pokemon.maxHp
    };

    detailPanel.innerHTML = this.templateManager.render(detailTemplate, detailData);
  }

  switchToView(viewName) {
    this.overlay.querySelectorAll('.team-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    this.overlay.querySelectorAll('.team-view').forEach(view => {
      view.classList.toggle('active', view.id === `team-${viewName}`);
    });

    this.currentView = viewName;

    if (viewName === 'moves') {
      this.updateMovesView();
    }
  }

  updateMovesView() {
    const movesGrid = this.overlay.querySelector('#moves-grid');
    if (!movesGrid) return;
    
    if (this.teamData.length === 0) {
      movesGrid.innerHTML = `
        <div class="no-team">
          <div class="no-team-icon">⚔️</div>
          <p>No Pokémon in team</p>
        </div>
      `;
      return;
    }

    // Vue des attaques simplifiée
    movesGrid.innerHTML = '<p>Moves view - TODO</p>';
  }

  updateTeamStats() {
    const teamCount = this.teamData.length;
    const canBattle = this.teamData.some(p => p.currentHp > 0);

    const teamCountEl = this.overlay.querySelector('.team-count');
    if (teamCountEl) teamCountEl.textContent = `${teamCount}/6`;

    const teamStatusEl = this.overlay.querySelector('.team-status');
    if (teamStatusEl) {
      teamStatusEl.textContent = canBattle ? 'Ready' : 'Not Ready';
      teamStatusEl.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    }
  }

  setupDragAndDrop() {
    const slotsContainer = this.overlay.querySelector('#team-slots-grid');
    if (!slotsContainer) return;

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
      this.requestTeamData();
    } else {
      this.showNotification(data.message || "Action failed", "error");
    }
  }

  handlePokemonUpdate(data) {
    const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
    if (pokemonIndex !== -1) {
      this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
      this.refreshTeamDisplay();
      this.updateTeamStats();
      
      if (this.selectedPokemon && this.selectedPokemon._id === data.pokemonId) {
        this.selectedPokemon = this.teamData[pokemonIndex];
        this.updateDetailView();
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'team-notification';
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px;
      color: white; font-family: Arial, sans-serif; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); z-index: 1002;
      animation: slideInRight 0.4s ease; max-width: 300px; border-left: 4px solid;
    `;

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

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  isOpen() {
    return this.isVisible;
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !inventoryOpen;
  }

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

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    const cssLink = document.querySelector('#team-ui-styles');
    if (cssLink) cssLink.remove();
    
    const fallbackCSS = document.querySelector('#team-ui-fallback-styles');
    if (fallbackCSS) fallbackCSS.remove();
    
    // Nettoie le TemplateManager
    if (this.templateManager) {
      this.templateManager.clearCache();
    }
    
    this.gameRoom = null;
    this.teamData = [];
    this.selectedPokemon = null;
    this.overlay = null;
    this.templateManager = null;
    
    console.log('⚔️ TeamUI détruit');
  }

  onPokemonCaught(pokemon) {
    this.showNotification(`${pokemon.name} added to team!`, 'success');
    this.requestTeamData();
  }

  onBattleStart() {
    if (this.isVisible) {
      this.hide();
    }
  }

  exportData() {
    return {
      currentView: this.currentView,
      selectedPokemonId: this.selectedPokemon ? this.selectedPokemon._id : null
    };
  }

  importData(data) {
    if (data.currentView) {
      this.currentView = data.currentView;
    }
  }
}
