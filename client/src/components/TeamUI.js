// client/src/components/TeamUI.js - Adapté UIManager Professional
// ✅ Version optimisée compatible avec le nouveau UIManager

export class TeamUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.currentView = 'overview';
    this.pokemonLocalizations = {};
    this.language = 'en';
    
    // ✅ NOUVEAU: État UIManager Professional
    this.uiManagerState = {
      visible: false,
      enabled: true,
      initialized: false
    };
    
    // ✅ NOUVEAU: Optimisations performance
    this.performanceMode = false;
    this.renderQueue = [];
    this.updateDebounce = null;
    
    this._initAsync();
  }

  async _initAsync() {
    try {
      await this.loadPokemonLocalizations();
      await this.loadCSS();
      this.init();
      
      // ✅ Marquer comme initialisé pour UIManager
      this.uiManagerState.initialized = true;
      console.log('✅ TeamUI initialisé (UIManager compatible)');
    } catch (error) {
      console.error('❌ Erreur init TeamUI:', error);
    }
  }

  async loadCSS() {
    if (document.querySelector('#team-ui-styles')) return;

    try {
      const link = document.createElement('link');
      link.id = 'team-ui-styles';
      link.rel = 'stylesheet';
      link.href = '/css/team-ui.css';
      
      await new Promise((resolve, reject) => {
        link.onload = resolve;
        link.onerror = () => {
          this.addFallbackStyles();
          resolve();
        };
        document.head.appendChild(link);
      });
    } catch (err) {
      this.addFallbackStyles();
    }
  }

  addFallbackStyles() {
    if (document.querySelector('#team-ui-fallback')) return;
    
    const style = document.createElement('style');
    style.id = 'team-ui-fallback';
    style.textContent = `
      .team-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85); display: flex;
        justify-content: center; align-items: center; z-index: 1000;
        backdrop-filter: blur(3px); transition: all 0.3s ease;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .team-overlay.hidden { opacity: 0; pointer-events: none; transform: scale(0.95); }
      .team-container {
        width: min(95vw, 900px); height: min(90vh, 650px);
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2; border-radius: 16px;
        color: white; display: flex; flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      }
      .team-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 16px 24px; border-bottom: 3px solid #357abd;
        display: flex; justify-content: space-between; align-items: center;
      }
      .team-title { display: flex; align-items: center; gap: 16px; }
      .team-icon { font-size: 24px; }
      .team-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
      .team-close-btn {
        background: #4a90e2; border: none; color: white;
        width: 36px; height: 36px; border-radius: 50%;
        cursor: pointer; transition: all 0.2s ease;
      }
      .team-close-btn:hover { background: #87ceeb; transform: scale(1.1); }
      .team-content { flex: 1; padding: 20px; overflow-y: auto; }
      .team-slots-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr); gap: 16px;
        max-width: 600px; margin: 0 auto;
      }
      .team-slot {
        background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.2);
        border-radius: 12px; min-height: 120px; cursor: pointer;
        transition: all 0.3s ease; display: flex; align-items: center;
        justify-content: center; position: relative;
      }
      .team-slot:hover {
        background: rgba(74,144,226,0.15); border-color: #4a90e2;
        transform: translateY(-2px);
      }
      .team-slot.empty { border-style: dashed; opacity: 0.6; }
      .slot-number {
        position: absolute; top: 8px; left: 8px;
        background: rgba(0,0,0,0.6); color: #87ceeb;
        width: 20px; height: 20px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: bold;
      }
      .pokemon-card {
        width: 100%; height: 100%; padding: 8px;
        display: flex; flex-direction: column; text-align: center;
      }
      .pokemon-name { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
      .pokemon-level { font-size: 10px; color: #87ceeb; margin-bottom: 8px; }
      .pokemon-sprite { flex: 1; display: flex; align-items: center; justify-content: center; }
      .pokemon-portrait {
        width: 64px; height: 64px; background-size: cover;
        background-position: center; border-radius: 8px;
        border: 2px solid rgba(255,255,255,0.3);
      }
      .pokemon-health { margin-top: 8px; display: flex; align-items: center; gap: 4px; }
      .health-bar {
        flex: 1; height: 4px; background: rgba(0,0,0,0.4);
        border-radius: 2px; overflow: hidden;
      }
      .health-fill {
        height: 100%; transition: width 0.3s ease;
        background: #2ecc71;
      }
      .health-fill.medium { background: #f39c12; }
      .health-fill.low { background: #e74c3c; }
      .health-text { font-size: 9px; color: #bdc3c7; }
      .empty-slot { text-align: center; opacity: 0.5; }
      .empty-icon { font-size: 32px; margin-bottom: 8px; }
      .empty-text { font-size: 12px; color: #95a5a6; }
      
      /* Responsive */
      @media (max-width: 768px) {
        .team-container { width: 98vw; height: 95vh; }
        .team-slots-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); }
        .team-slot { min-height: 100px; }
        .pokemon-portrait { width: 48px; height: 48px; }
      }
    `;
    document.head.appendChild(style);
  }

  async loadPokemonLocalizations() {
    try {
      const response = await fetch('/localization/pokemon/gen1/en.json');
      this.pokemonLocalizations = await response.json();
    } catch (err) {
      console.error('❌ Erreur chargement localizations:', err);
      this.pokemonLocalizations = {};
    }
  }
  
  init() {
    this.createTeamInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    
    // ✅ Exposer globalement
    window.teamUI = this;
    
    console.log('⚔️ TeamUI initialisé');
  }

  createTeamInterface() {
    const existing = document.getElementById('team-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';

    overlay.innerHTML = `
      <div class="team-container">
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
        
        <div class="team-content">
          <div class="team-slots-grid">
            ${this.generateTeamSlots()}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  generateTeamSlots() {
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

  setupEventListeners() {
    // Fermeture
    this.overlay.querySelector('.team-close-btn').addEventListener('click', () => {
      this.hide();
    });

    // ESC pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Clic extérieur pour fermer
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Gestion des slots
    this.setupSlotSelection();
  }

  setupSlotSelection() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');
    
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
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    this.gameRoom.onMessage("teamData", (data) => {
      this.updateTeamData(data);
    });

    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.handleTeamActionResult(data);
    });
  }

  // ===== ✅ MÉTHODES REQUISES POUR UIMANAGER =====

  /**
   * ✅ MÉTHODE REQUISE: Afficher le module
   */
  show() {
    try {
      this.uiManagerState.visible = true;
      this.isVisible = true;
      
      this.overlay.classList.remove('hidden');
      this.overlay.style.display = 'flex';
      
      this.requestTeamData();
      
      // Animation d'entrée optimisée
      if (!this.performanceMode) {
        this.overlay.style.animation = 'fadeIn 0.3s ease-out';
      }
      
      console.log('⚔️ [UIManager] TeamUI affiché');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur show TeamUI:', error);
    }
  }

  /**
   * ✅ MÉTHODE REQUISE: Cacher le module
   */
  hide() {
    try {
      this.uiManagerState.visible = false;
      this.isVisible = false;
      
      if (!this.performanceMode) {
        this.overlay.style.animation = 'fadeOut 0.2s ease-in';
        setTimeout(() => {
          this.overlay.classList.add('hidden');
          this.overlay.style.display = 'none';
        }, 200);
      } else {
        this.overlay.classList.add('hidden');
        this.overlay.style.display = 'none';
      }
      
      this.deselectPokemon();
      
      console.log('⚔️ [UIManager] TeamUI masqué');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur hide TeamUI:', error);
    }
  }

  /**
   * ✅ MÉTHODE REQUISE: Activer/désactiver le module
   */
  setEnabled(enabled) {
    try {
      this.uiManagerState.enabled = enabled;
      
      if (this.overlay) {
        if (enabled) {
          this.overlay.classList.remove('ui-disabled');
          this.overlay.style.pointerEvents = '';
          this.overlay.style.opacity = '';
        } else {
          this.overlay.classList.add('ui-disabled');
          this.overlay.style.pointerEvents = 'none';
          this.overlay.style.opacity = '0.5';
        }
      }
      
      console.log(`⚔️ [UIManager] TeamUI ${enabled ? 'activé' : 'désactivé'}`);
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur setEnabled TeamUI:', error);
    }
  }

  /**
   * ✅ MÉTHODE OPTIONNELLE: Mise à jour du module
   */
  update(data) {
    try {
      if (!data) return;
      
      // ✅ Debouncer les mises à jour pour optimiser
      if (this.updateDebounce) {
        clearTimeout(this.updateDebounce);
      }
      
      this.updateDebounce = setTimeout(() => {
        this.processUpdate(data);
      }, 50);
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur update TeamUI:', error);
    }
  }

  processUpdate(data) {
    if (data.type === 'teamData') {
      this.updateTeamData(data.payload);
    } else if (data.type === 'state') {
      if (data.visible !== undefined) {
        data.visible ? this.show() : this.hide();
      }
      if (data.enabled !== undefined) {
        this.setEnabled(data.enabled);
      }
    }
  }

  /**
   * ✅ MÉTHODE OPTIONNELLE: Nettoyage
   */
  destroy() {
    try {
      if (this.updateDebounce) {
        clearTimeout(this.updateDebounce);
      }
      
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.remove();
      }
      
      // Nettoyer les références globales
      if (window.teamUI === this) {
        window.teamUI = null;
      }
      
      console.log('⚔️ [UIManager] TeamUI détruit');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destroy TeamUI:', error);
    }
  }

  /**
   * ✅ PROPRIÉTÉ REQUISE: État pour UIManager
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      teamCount: this.teamData.length,
      isOpen: this.isVisible,
      canOpen: this.canPlayerInteract(),
      hasOverlay: !!this.overlay
    };
  }

  // ===== MÉTHODES MÉTIER CORE =====

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
    
    // ✅ Optimisation: batcher les mises à jour
    if (this.performanceMode) {
      this.renderQueue.push(() => this.refreshTeamDisplay());
      this.flushRenderQueue();
    } else {
      this.refreshTeamDisplay();
    }
    
    this.updateTeamStats();
    console.log('⚔️ Données équipe mises à jour:', this.teamData.length, 'Pokémon');
  }

  flushRenderQueue() {
    if (this.renderQueue.length === 0) return;
    
    requestAnimationFrame(() => {
      while (this.renderQueue.length > 0) {
        const renderFn = this.renderQueue.shift();
        renderFn();
      }
    });
  }

  refreshTeamDisplay() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');
    if (!slotsContainer) return;

    // ✅ Mise à jour optimisée des slots
    for (let i = 0; i < 6; i++) {
      const slot = slotsContainer.querySelector(`[data-slot="${i}"]`);
      const pokemon = this.teamData[i];
      
      if (pokemon) {
        this.displayPokemonInSlot(slot, pokemon, i);
      } else {
        this.displayEmptySlot(slot, i);
      }
    }
  }

  displayPokemonInSlot(slot, pokemon, index) {
    slot.className = 'team-slot';
    
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    
    slot.innerHTML = `
      <div class="slot-number">${index + 1}</div>
      <div class="pokemon-card" data-pokemon-id="${pokemon._id}">
        <div class="pokemon-name">${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}</div>
        <div class="pokemon-level">Niv. ${pokemon.level}</div>
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitSpriteStyle(pokemon.pokemonId)}"></div>
        </div>
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${pokemon.currentHp}/${pokemon.maxHp}</div>
        </div>
      </div>
    `;
  }

  displayEmptySlot(slot, index) {
    slot.className = 'team-slot empty';
    slot.innerHTML = `
      <div class="slot-number">${index + 1}</div>
      <div class="empty-slot">
        <div class="empty-icon">➕</div>
        <div class="empty-text">Slot libre</div>
      </div>
    `;
  }

  selectPokemon(pokemon, slot, slotIndex) {
    // Désélectionner l'ancien
    this.overlay.querySelectorAll('.team-slot').forEach(s => s.classList.remove('selected'));
    
    // Sélectionner le nouveau
    slot.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    console.log('🎯 Pokémon sélectionné:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
  }

  deselectPokemon() {
    this.overlay.querySelectorAll('.team-slot').forEach(s => s.classList.remove('selected'));
    this.selectedPokemon = null;
    this.selectedSlot = null;
  }

  updateTeamStats() {
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p.currentHp > 0).length;
    const canBattle = aliveCount > 0;

    // Mettre à jour l'affichage
    const countElement = this.overlay.querySelector('.team-count');
    const statusElement = this.overlay.querySelector('.team-status');
    
    if (countElement) countElement.textContent = `${teamCount}/6`;
    if (statusElement) {
      statusElement.textContent = canBattle ? 'Prêt' : 'Non prêt';
      statusElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    }
  }

  handleTeamActionResult(data) {
    if (data.success) {
      this.showNotification(data.message || 'Action réussie', 'success');
      this.requestTeamData();
    } else {
      this.showNotification(data.message || 'Action échouée', 'error');
    }
  }

  // ===== UTILITAIRES =====

  getPokemonName(pokemonId) {
    const idStr = String(pokemonId).padStart(3, '0');
    return this.pokemonLocalizations[idStr]?.name || 
           this.pokemonLocalizations[pokemonId]?.name || 
           `#${pokemonId}`;
  }

  getPortraitSpriteStyle(pokemonId) {
    const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    return `background-image: url('${url}'); background-size: cover; background-position: center;`;
  }

  getHealthClass(healthPercent) {
    if (healthPercent > 50) return '';
    if (healthPercent > 25) return 'medium';
    return 'low';
  }

  canPlayerInteract() {
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    const questOpen = typeof window.isQuestJournalOpen === 'function' ? window.isQuestJournalOpen() : false;
    
    return !chatOpen && !inventoryOpen && !questOpen;
  }

  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 2000, position: 'bottom-right' });
    } else {
      console.log(`📢 [${type}]: ${message}`);
    }
  }

  // Méthodes publiques pour compatibilité
  isOpen() { return this.isVisible; }
  
  // Actions d'équipe
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

  exportData() {
    return {
      currentView: this.currentView,
      selectedPokemonId: this.selectedPokemon?._id || null
    };
  }

  importData(data) {
    if (data.currentView) {
      this.currentView = data.currentView;
    }
  }
}

// Rendre disponible globalement
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log('✅ TeamUI adapté UIManager Professional chargé');
console.log('🎮 Méthodes UIManager: show(), hide(), setEnabled(), update(), destroy()');
console.log('⚔️ Méthodes métier: toggle(), requestTeamData(), healTeam()');
