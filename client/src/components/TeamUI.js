selectPokemon(pokemon, cardElement, slotIndex) {
    console.log('🎯 Sélection Pokémon:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
    
    // Désélectionner l'ancien
    this.overlay.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.classList.remove('active');
    });

    // Sélectionner le nouveau
    const slot = cardElement.closest('.team-slot');
    if (slot) {
      slot.classList.add('selected');
    }
    cardElement// client/src/components/TeamUI.js - Interface d'équipe Pokémon

export class TeamUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.draggedPokemon = null;
    this.currentView = 'overview';
    this.pokemonLocalizations = {};
    this.language = 'en';
    this._initAsync();
  }

  async _initAsync() {
    await this.loadPokemonLocalizations();
    await this.loadCSS();
    this.init();
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
      
      return new Promise((resolve, reject) => {
        link.onload = () => {
          console.log('✅ CSS Team UI chargé !');
          resolve();
        };
        link.onerror = () => {
          console.error('❌ Erreur chargement CSS Team UI');
          this.addInlineStyles();
          resolve();
        };
        
        document.head.appendChild(link);
      });
    } catch (err) {
      console.error('❌ Erreur lors du chargement du CSS:', err);
      this.addInlineStyles();
    }
  }

  addInlineStyles() {
    if (document.querySelector('#team-ui-fallback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'team-ui-fallback-styles';
    style.textContent = `
      .team-overlay { 
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.8); display: flex; 
        justify-content: center; align-items: center; z-index: 1000; 
      }
      .team-overlay.hidden { opacity: 0; pointer-events: none; }
      .team-container { 
        width: 90%; height: 80%; background: #2a3f5f; 
        border-radius: 20px; color: white; display: flex; flex-direction: column;
      }
      .team-slot { 
        background: rgba(255,255,255,0.1); border-radius: 10px; 
        padding: 10px; min-height: 100px; cursor: pointer;
      }
      .pokemon-card { 
        background: rgba(255,255,255,0.1); border-radius: 8px; 
        padding: 8px; height: 100%;
      }
    `;
    document.head.appendChild(style);
    console.log('🔄 Styles fallback chargés');
  }
  
  init() {
    this.createTeamInterface();
    this.setupEventListeners();
    this.setupServerListeners();
    
    // ✅ RENDRE ACCESSIBLE GLOBALEMENT DÈS L'INIT
    window.teamUI = this;
    
    console.log('⚔️ Interface d\'équipe initialisée');
    console.log('⚔️ TeamUI accessible globalement:', window.teamUI ? 'OUI' : 'NON');
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

  createTeamInterface() {
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

          <div class="team-view team-details" id="team-details">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚔️</div>
                <p>Sélectionnez un Pokémon pour voir ses détails</p>
              </div>
            </div>
          </div>

          <div class="team-view team-moves" id="team-moves">
            <div class="moves-grid" id="moves-grid">
              <!-- Attaques seront générées ici -->
            </div>
          </div>
        </div>

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
  }

  generateTeamSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty-enhanced" data-slot="${i}">
          <div class="slot-background">
            <div class="slot-number">${i + 1}</div>
            <div class="empty-slot">
              <div class="empty-icon">➕</div>
              <div class="empty-text">Add Pokémon</div>
            </div>
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

    // Sélection des slots
    this.setupSlotSelection();

    // Fermeture en cliquant à l'extérieur
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  setupSlotSelection() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');
    
    // Utiliser la délégation d'événements plus précise
    slotsContainer.addEventListener('click', (e) => {
      // Ignorer les clics sur le menu contextuel
      if (e.target.closest('.pokemon-context-menu')) {
        return;
      }

      const slot = e.target.closest('.team-slot');
      if (!slot) return;

      const slotIndex = parseInt(slot.dataset.slot);
      const pokemonCard = slot.querySelector('.pokemon-card');
      
      console.log('🎯 Clic sur slot:', slotIndex, pokemonCard ? 'avec Pokémon' : 'vide');
      
      if (pokemonCard) {
        // Sélectionner le Pokémon
        const pokemon = this.teamData[slotIndex];
        if (pokemon) {
          console.log('🎯 Sélection de:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
          this.selectPokemon(pokemon, pokemonCard, slotIndex);
        }
      } else {
        // Slot vide - désélectionner
        console.log('🎯 Désélection (slot vide)');
        this.deselectPokemon();
      }
    });

    // Double-clic pour voir les détails
    slotsContainer.addEventListener('dblclick', (e) => {
      // Ignorer les clics sur le menu contextuel
      if (e.target.closest('.pokemon-context-menu')) {
        return;
      }

      const slot = e.target.closest('.team-slot');
      if (!slot) return;

      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        console.log('🎯 Double-clic pour détails:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
        this.showPokemonDetails(pokemon);
      }
    });

    // Event listeners spécifiques pour les cartes Pokémon
    this.setupPokemonCardListeners();
  }

  setupPokemonCardListeners() {
    // Cette fonction sera appelée après chaque refresh pour ajouter les listeners aux nouvelles cartes
    const pokemonCards = this.overlay.querySelectorAll('.pokemon-card');
    
    pokemonCards.forEach((card, index) => {
      // Supprimer les anciens listeners pour éviter les doublons
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      
      const slotIndex = parseInt(newCard.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (!pokemon) return;

      // Clic simple pour sélection
      newCard.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🎯 Clic direct sur carte Pokémon:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
        this.selectPokemon(pokemon, newCard, slotIndex);
      });

      // Double-clic pour détails
      newCard.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        console.log('🎯 Double-clic direct sur carte pour détails:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
        this.showPokemonDetails(pokemon);
      });

      // Context menu
      const contextMenu = newCard.querySelector('.pokemon-context-menu');
      if (contextMenu) {
        contextMenu.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('🎯 Menu contextuel:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
          this.showPokemonContextMenu(pokemon, e);
        });
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
    this.deselectPokemon();
    
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
    console.log('⚔️ Données d\'équipe mises à jour:', this.teamData);
  }

  refreshTeamDisplay() {
    const slotsContainer = this.overlay.querySelector('.team-slots-grid');
    
    // Clear existing pokemon cards
    slotsContainer.querySelectorAll('.pokemon-card').forEach(card => card.remove());
    
    // Reset all slots to empty state
    slotsContainer.querySelectorAll('.slot-background').forEach((bg, index) => {
      const slot = bg.parentElement;
      bg.classList.remove('has-pokemon');
      slot.classList.remove('selected');
      slot.classList.add('empty-enhanced');
      
      const emptySlot = bg.querySelector('.empty-slot');
      if (emptySlot) emptySlot.style.display = 'flex';
    });
    
    // Display each pokemon
    this.teamData.forEach((pokemon, index) => {
      if (pokemon && index < 6) {
        const slot = slotsContainer.querySelector(`[data-slot="${index}"]`);
        this.displayPokemonInSlot(slot, pokemon, index);
      }
    });
  }

  displayPokemonInSlot(slot, pokemon, index) {
    console.log('[DEBUG] Affichage Pokémon:', pokemon.pokemonId, this.getPokemonName(pokemon.pokemonId));
    
    const slotBackground = slot.querySelector('.slot-background');
    
    // Hide empty slot and update classes
    const emptySlot = slot.querySelector('.empty-slot');
    if (emptySlot) emptySlot.style.display = 'none';
    
    slotBackground.classList.add('has-pokemon');
    slot.classList.remove('empty-enhanced');

    // Create pokemon card
    const pokemonCard = document.createElement('div');
    pokemonCard.className = 'pokemon-card';
    pokemonCard.dataset.pokemonId = pokemon._id;
    pokemonCard.dataset.slot = index;
    pokemonCard.draggable = true; // Réactivé maintenant que ça fonctionne

    // Add type-based border class
    if (pokemon.types && pokemon.types.length > 0) {
      pokemonCard.classList.add(`type-${pokemon.types[0].toLowerCase()}`);
    }

    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const statusDisplay = this.getStatusDisplay(pokemon.status);
    const typesDisplay = this.getTypesDisplay(pokemon.types);
    const genderDisplay = this.getGenderDisplay(pokemon.gender);

    pokemonCard.innerHTML = `
      <div class="pokemon-header">
        <div class="pokemon-name" title="${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}">
          ${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}
        </div>
        <div class="pokemon-level">Lv.${pokemon.level}</div>
      </div>
      
      ${genderDisplay}
          
      <div class="pokemon-sprite">
        <div 
          class="pokemon-portrait"
          style="${this.getPortraitSpriteStyle(pokemon.pokemonId, { shiny: pokemon.shiny })}"
          title="${this.getPokemonName(pokemon.pokemonId)}"
        ></div>
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

    slotBackground.appendChild(pokemonCard);

    // ✅ Event listeners optimisés
    const self = this;

    // Clic gauche pour sélection
    pokemonCard.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Clic gauche - Sélection Pokémon');
      self.selectPokemon(pokemon, pokemonCard, index);
    });

    // Double-clic pour détails
    pokemonCard.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Double-clic - Ouverture détails');
      self.showPokemonDetails(pokemon);
    });

    // ✅ CLIC DROIT pour menu contextuel
    pokemonCard.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 Clic droit - Menu contextuel');
      self.showContextMenu(e, pokemon, index);
    });

    // ✅ RENDRE TEAMUI ACCESSIBLE GLOBALEMENT
    window.teamUI = this;

    // Animation
    setTimeout(() => {
      pokemonCard.classList.add('new');
    }, index * 100);
  }

  getGenderDisplay(gender) {
    if (!gender) return '';
    
    const genderSymbol = gender === 'male' ? '♂' : gender === 'female' ? '♀' : '';
    const genderClass = gender === 'male' ? 'male' : gender === 'female' ? 'female' : '';
    
    return genderSymbol ? `<div class="pokemon-gender ${genderClass}">${genderSymbol}</div>` : '';
  }

  // ✅ MENU CONTEXTUEL COMPLET
  showContextMenu(event, pokemon, slotIndex) {
    // Fermer le menu existant s'il y en a un
    this.hideContextMenu();

    const menu = this.createContextMenu(pokemon, slotIndex);
    document.body.appendChild(menu);

    // Positionner le menu près du curseur
    this.positionContextMenu(menu, event.clientX, event.clientY);

    // Ajouter les event listeners pour fermer le menu
    this.setupContextMenuListeners(menu);
  }

  createContextMenu(pokemon, slotIndex) {
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const canHeal = pokemon.currentHp < pokemon.maxHp;
    const canBattle = pokemon.currentHp > 0;

    const overlay = document.createElement('div');
    overlay.className = 'pokemon-context-menu-overlay';
    overlay.style.display = 'block';

    const menu = document.createElement('div');
    menu.className = 'pokemon-context-menu-panel';

    menu.innerHTML = `
      <div class="context-menu-header">
        <div 
          class="context-menu-pokemon-icon"
          style="${this.getPortraitSpriteStyle(pokemon.pokemonId, { shiny: pokemon.shiny }).replace('80px', '24px').replace('80px', '24px')}"
        ></div>
        <div class="context-menu-pokemon-name">
          ${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}
        </div>
        <div class="context-menu-pokemon-level">Lv.${pokemon.level}</div>
      </div>

      <div class="context-menu-items">
        <button class="context-menu-item" data-action="details">
          <span class="context-menu-item-icon">📊</span>
          <span class="context-menu-item-text">View Details</span>
          <span class="context-menu-item-shortcut">Double-click</span>
        </button>

        <button class="context-menu-item" data-action="select">
          <span class="context-menu-item-icon">🎯</span>
          <span class="context-menu-item-text">Select</span>
          <span class="context-menu-item-shortcut">Click</span>
        </button>

        <div class="context-menu-separator"></div>

        <button class="context-menu-item ${canHeal ? '' : 'disabled'}" data-action="heal" ${canHeal ? '' : 'disabled'}>
          <span class="context-menu-item-icon">💊</span>
          <span class="context-menu-item-text">Heal</span>
          <div class="context-menu-health">
            <div class="context-menu-health-bar">
              <div class="context-menu-health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
            </div>
            <span>${pokemon.currentHp}/${pokemon.maxHp}</span>
          </div>
        </button>

        <button class="context-menu-item ${canBattle ? '' : 'disabled'}" data-action="battle" ${canBattle ? '' : 'disabled'}>
          <span class="context-menu-item-icon">⚔️</span>
          <span class="context-menu-item-text">Send to Battle</span>
        </button>

        <div class="context-menu-separator"></div>

        <button class="context-menu-item" data-action="rename">
          <span class="context-menu-item-icon">✏️</span>
          <span class="context-menu-item-text">Rename</span>
        </button>

        <button class="context-menu-item" data-action="moves">
          <span class="context-menu-item-icon">⚡</span>
          <span class="context-menu-item-text">Manage Moves</span>
        </button>

        <div class="context-menu-separator"></div>

        <button class="context-menu-item" data-action="pc">
          <span class="context-menu-item-icon">💻</span>
          <span class="context-menu-item-text">Move to PC</span>
        </button>

        <button class="context-menu-item" data-action="release" style="color: #e74c3c;">
          <span class="context-menu-item-icon">🗑️</span>
          <span class="context-menu-item-text">Release</span>
        </button>
      </div>
    `;

    overlay.appendChild(menu);

    // Ajouter les event listeners pour les actions
    menu.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
      if (!item.disabled) {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          this.handleContextMenuAction(action, pokemon, slotIndex);
          this.hideContextMenu();
        });
      }
    });

    return overlay;
  }

  positionContextMenu(menuOverlay, x, y) {
    const menu = menuOverlay.querySelector('.pokemon-context-menu-panel');
    const rect = menu.getBoundingClientRect();
    
    // Ajuster la position pour rester dans l'écran
    let menuX = x;
    let menuY = y;

    if (menuX + rect.width > window.innerWidth) {
      menuX = window.innerWidth - rect.width - 10;
    }
    if (menuY + rect.height > window.innerHeight) {
      menuY = window.innerHeight - rect.height - 10;
    }

    menu.style.left = `${menuX}px`;
    menu.style.top = `${menuY}px`;
  }

  setupContextMenuListeners(menuOverlay) {
    // Fermer en cliquant à l'extérieur
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) {
        this.hideContextMenu();
      }
    });

    // Fermer avec Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Fermer en cliquant n'importe où dans le document
    const clickHandler = (e) => {
      if (!menuOverlay.contains(e.target)) {
        this.hideContextMenu();
        document.removeEventListener('click', clickHandler, true);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', clickHandler, true);
    }, 100);
  }

  hideContextMenu() {
    const existingMenu = document.querySelector('.pokemon-context-menu-overlay');
    if (existingMenu) {
      existingMenu.style.animation = 'contextMenuDisappear 0.2s ease forwards';
      setTimeout(() => {
        if (existingMenu.parentNode) {
          existingMenu.remove();
        }
      }, 200);
    }
  }

  handleContextMenuAction(action, pokemon, slotIndex) {
    console.log('🎯 Action menu contextuel:', action, pokemon.nickname || this.getPokemonName(pokemon.pokemonId));

    switch (action) {
      case 'details':
        this.showPokemonDetails(pokemon);
        break;

      case 'select':
        const card = this.overlay.querySelector(`[data-slot="${slotIndex}"] .pokemon-card`);
        if (card) {
          this.selectPokemon(pokemon, card, slotIndex);
        }
        break;

      case 'heal':
        this.healPokemon(pokemon._id);
        break;

      case 'battle':
        this.showNotification(`${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)} ready for battle!`, 'info');
        break;

      case 'rename':
        this.renamePokemon(pokemon, slotIndex);
        break;

      case 'moves':
        this.manageMoves(pokemon);
        break;

      case 'pc':
        this.removePokemon(pokemon._id);
        break;

      case 'release':
        this.releasePokemon(pokemon, slotIndex);
        break;

      default:
        console.log('Action non implémentée:', action);
    }
  }

  // ✅ NOUVELLES MÉTHODES POUR LE MENU CONTEXTUEL
  renamePokemon(pokemon, slotIndex) {
    const currentName = pokemon.nickname || this.getPokemonName(pokemon.pokemonId);
    const newName = prompt(`Rename ${currentName}:`, currentName);
    
    if (newName && newName.trim() && newName.trim() !== currentName) {
      if (this.gameRoom) {
        this.gameRoom.send("renamePokemon", { 
          pokemonId: pokemon._id, 
          newName: newName.trim() 
        });
        this.showNotification(`${currentName} renamed to ${newName.trim()}!`, 'success');
      }
    }
  }

  manageMoves(pokemon) {
    this.showNotification("Move management not yet implemented", "info");
    // TODO: Ouvrir interface de gestion des attaques
  }

  releasePokemon(pokemon, slotIndex) {
    const pokemonName = pokemon.nickname || this.getPokemonName(pokemon.pokemonId);
    const confirmation = confirm(
      `Are you sure you want to release ${pokemonName}?\n\nThis action cannot be undone!`
    );
    
    if (confirmation) {
      if (this.gameRoom) {
        this.gameRoom.send("releasePokemon", { pokemonId: pokemon._id });
        this.showNotification(`${pokemonName} has been released.`, 'info');
      }
    }
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

  selectPokemon(pokemon, cardElement, slotIndex) {
    console.log('🎯 Sélection Pokémon:', pokemon.nickname || this.getPokemonName(pokemon.pokemonId));
    
    // Désélectionner l'ancien
    this.overlay.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.classList.remove('active');
    });

    // Sélectionner le nouveau
    const slot = cardElement.closest('.team-slot');
    if (slot) {
      slot.classList.add('selected');
    }
    cardElement.classList.add('active');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;

    // Mettre à jour les vues
    this.updateDetailView();
  }

  deselectPokemon() {
    this.overlay.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.classList.remove('active');
    });
    
    this.selectedPokemon = null;
    this.selectedSlot = null;
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
            <div
              class="pokemon-portrait"
              style="${this.getPortraitSpriteStyle(pokemon.pokemonId, { shiny: pokemon.shiny })}"
              title="${this.getPokemonName(pokemon.pokemonId)}"
            ></div>
          </div>

          <div class="pokemon-detail-info">
            <h3>${pokemon.nickname || this.getPokemonName(pokemon.pokemonId)}</h3>
            <div class="pokemon-detail-subtitle">
              Level ${pokemon.level} • ${pokemon.types?.join('/') || 'Unknown Type'}
            </div>
            <div class="pokemon-detail-nature">Nature: ${pokemon.nature || 'Unknown'}</div>
            ${this.getGenderDisplay(pokemon.gender)}
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
          <button class="detail-btn" onclick="window.teamUI?.healPokemon('${pokemon._id}')">
            <span class="btn-icon">💊</span>
            <span class="btn-text">Heal</span>
          </button>
          <button class="detail-btn secondary" onclick="window.teamUI?.removePokemon('${pokemon._id}')">
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
            pokemon: pokemon.nickname || this.getPokemonName(pokemon.pokemonId),
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
    const teamReady = teamCount === 6;

    // Update header stats
    const teamStatsElement = this.overlay.querySelector('.team-stats');
    this.overlay.querySelector('.team-count').textContent = `${teamCount}/6`;
    this.overlay.querySelector('.team-status').textContent = canBattle ? 'Ready' : 'Not Ready';
    this.overlay.querySelector('.team-status').style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Add team ready class for special animation
    if (teamReady) {
      teamStatsElement.classList.add('team-ready');
    } else {
      teamStatsElement.classList.remove('team-ready');
    }

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
        // Remove drag-over class from all slots
        this.overlay.querySelectorAll('.team-slot').forEach(slot => {
          slot.classList.remove('drag-over');
        });
        this.draggedPokemon = null;
      }
    });

    slotsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    slotsContainer.addEventListener('dragenter', (e) => {
      const targetSlot = e.target.closest('.team-slot');
      if (targetSlot && this.draggedPokemon) {
        targetSlot.classList.add('drag-over');
      }
    });

    slotsContainer.addEventListener('dragleave', (e) => {
      const targetSlot = e.target.closest('.team-slot');
      if (targetSlot && !targetSlot.contains(e.relatedTarget)) {
        targetSlot.classList.remove('drag-over');
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
        this.selectPokemon(pokemon, pokemonCard, slotIndex);
      }
    }
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    const cssLink = document.querySelector('#team-ui-styles');
    if (cssLink) {
      cssLink.remove();
    }
    
    this.gameRoom = null;
    this.teamData = [];
    this.selectedPokemon = null;
    this.overlay = null;
    
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

// Rendre disponible globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}
