// client/src/ui/PokemonSelectionUI.js - Interface de sélection d'équipe

export class PokemonSelectionUI {
  constructor(gameManager, onPokemonSelected) {
    this.gameManager = gameManager;
    this.onPokemonSelected = onPokemonSelected; // Callback quand un Pokémon est choisi
    
    // État
    this.isVisible = false;
    this.selectedPokemon = null;
    this.playerTeam = [];
    
    // DOM
    this.overlay = null;
    
    console.log('🔄 [PokemonSelectionUI] Constructeur initialisé');
  }

  // === INITIALISATION ===

  /**
   * Initialise l'interface de sélection
   */
  initialize() {
    console.log('🔧 [PokemonSelectionUI] Initialisation...');
    
    this.createSelectionOverlay();
    this.loadPlayerTeam();
    
    console.log('✅ [PokemonSelectionUI] Initialisé');
  }

  // === CRÉATION DE L'INTERFACE ===

  createSelectionOverlay() {
    console.log('🎨 [PokemonSelectionUI] Création de l\'overlay de sélection...');
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'pokemon-selection-overlay';
    this.overlay.id = 'pokemonSelectionOverlay';
    
    // Style de l'overlay
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
      z-index: 8000;
      display: none;
      flex-direction: column;
      font-family: 'Arial', sans-serif;
      color: white;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    // Contenu HTML
    this.overlay.innerHTML = `
      <div class="selection-header">
        <h1 class="selection-title">🎯 Choisissez votre Pokémon</h1>
        <p class="selection-subtitle">Sélectionnez le Pokémon qui participera au combat</p>
      </div>
      
      <div class="team-container">
        <div class="team-grid" id="teamGrid">
          <!-- Pokémon de l'équipe seront injectés ici -->
        </div>
      </div>
      
      <div class="selection-footer">
        <div class="pokemon-details" id="pokemonDetails" style="display: none;">
          <div class="pokemon-info">
            <h3 id="selectedName">Nom du Pokémon</h3>
            <div class="pokemon-stats">
              <div class="stat-item">
                <span class="stat-label">Niveau:</span>
                <span class="stat-value" id="selectedLevel">1</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">PV:</span>
                <span class="stat-value" id="selectedHP">0/0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Type:</span>
                <span class="stat-value" id="selectedType">Normal</span>
              </div>
            </div>
            <div class="pokemon-moves">
              <h4>Attaques connues:</h4>
              <div class="moves-list" id="selectedMoves">
                <!-- Attaques seront listées ici -->
              </div>
            </div>
          </div>
        </div>
        
        <div class="selection-actions">
          <button class="selection-btn confirm" id="confirmBtn" disabled>
            ✅ Confirmer le choix
          </button>
          <button class="selection-btn cancel" id="cancelBtn">
            ❌ Annuler
          </button>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(this.overlay);
    
    // Setup des événements
    this.setupEvents();
    
    console.log('✅ [PokemonSelectionUI] Overlay créé');
  }

  // === GESTION DES ÉVÉNEMENTS ===

  setupEvents() {
    const confirmBtn = this.overlay.querySelector('#confirmBtn');
    const cancelBtn = this.overlay.querySelector('#cancelBtn');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.confirmSelection();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelSelection();
      });
    }
  }

  // === CHARGEMENT DE L'ÉQUIPE ===

  loadPlayerTeam() {
    console.log('📋 [PokemonSelectionUI] Chargement de l\'équipe...');
    
    // TODO: Récupérer l'équipe réelle du joueur depuis le GameManager
    // Pour l'instant, équipe de test
    this.playerTeam = [
      {
        id: 'pokemon_1',
        pokemonId: 1,
        name: 'Bulbasaur',
        level: 5,
        currentHp: 20,
        maxHp: 20,
        types: ['grass', 'poison'],
        moves: ['tackle', 'growl', 'vine_whip'],
        statusCondition: 'normal',
        sprite: 'bulbasaur_front',
        available: true
      },
      {
        id: 'pokemon_2',
        pokemonId: 4,
        name: 'Charmander',
        level: 6,
        currentHp: 21,
        maxHp: 21,
        types: ['fire'],
        moves: ['scratch', 'growl', 'ember'],
        statusCondition: 'normal',
        sprite: 'charmander_front',
        available: true
      },
      {
        id: 'pokemon_3',
        pokemonId: 7,
        name: 'Squirtle',
        level: 5,
        currentHp: 0,
        maxHp: 19,
        types: ['water'],
        moves: ['tackle', 'tail_whip', 'bubble'],
        statusCondition: 'ko',
        sprite: 'squirtle_front',
        available: false
      },
      {
        id: 'pokemon_4',
        pokemonId: 25,
        name: 'Pikachu',
        level: 8,
        currentHp: 25,
        maxHp: 25,
        types: ['electric'],
        moves: ['thunder_shock', 'growl', 'tail_whip', 'thunder_wave'],
        statusCondition: 'normal',
        sprite: 'pikachu_front',
        available: true
      }
    ];
    
    this.displayTeam();
  }

  // === AFFICHAGE DE L'ÉQUIPE ===

  displayTeam() {
    console.log('🐾 [PokemonSelectionUI] Affichage de l\'équipe...');
    
    const teamGrid = this.overlay.querySelector('#teamGrid');
    if (!teamGrid) return;
    
    // Générer les cartes Pokémon
    const teamHTML = this.playerTeam.map(pokemon => {
      const isAvailable = pokemon.available && pokemon.currentHp > 0;
      const hpPercent = pokemon.maxHp > 0 ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0;
      
      return `
        <div class="pokemon-card ${!isAvailable ? 'unavailable' : ''}" 
             data-pokemon-id="${pokemon.id}"
             ${!isAvailable ? 'data-disabled="true"' : ''}>
          
          <div class="pokemon-sprite-container">
            <div class="pokemon-sprite-placeholder" data-pokemon="${pokemon.pokemonId}">
              ${this.getPokemonEmoji(pokemon.pokemonId)}
            </div>
            ${pokemon.statusCondition !== 'normal' && pokemon.statusCondition !== 'ko' ? 
              `<div class="status-overlay">${this.getStatusEmoji(pokemon.statusCondition)}</div>` : ''}
          </div>
          
          <div class="pokemon-info">
            <h3 class="pokemon-name">${pokemon.name}</h3>
            <div class="pokemon-level">Niv. ${pokemon.level}</div>
            
            <div class="pokemon-hp-bar">
              <div class="hp-bar-bg">
                <div class="hp-bar-fill ${this.getHPColorClass(hpPercent)}" 
                     style="width: ${hpPercent}%"></div>
              </div>
              <div class="hp-text">${pokemon.currentHp}/${pokemon.maxHp} PV</div>
            </div>
            
            <div class="pokemon-types">
              ${pokemon.types.map(type => 
                `<span class="type-badge type-${type}">${this.getTypeText(type)}</span>`
              ).join('')}
            </div>
          </div>
          
          <div class="pokemon-status">
            ${pokemon.currentHp <= 0 ? '<span class="ko-indicator">KO</span>' : 
              isAvailable ? '<span class="ready-indicator">Prêt</span>' : 
              '<span class="unavailable-indicator">Indisponible</span>'}
          </div>
        </div>
      `;
    }).join('');
    
    teamGrid.innerHTML = teamHTML;
    
    // Ajouter les événements de clic
    this.setupPokemonCardEvents();
  }

  setupPokemonCardEvents() {
    const pokemonCards = this.overlay.querySelectorAll('.pokemon-card:not([data-disabled])');
    
    pokemonCards.forEach(card => {
      card.addEventListener('click', () => {
        const pokemonId = card.dataset.pokemonId;
        this.selectPokemon(pokemonId);
      });
      
      // Effet hover
      card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('unavailable')) {
          card.style.transform = 'scale(1.05)';
          card.style.boxShadow = '0 8px 25px rgba(255, 203, 5, 0.4)';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('selected')) {
          card.style.transform = 'scale(1)';
          card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        }
      });
    });
  }

  // === SÉLECTION D'UN POKÉMON ===

  selectPokemon(pokemonId) {
    console.log(`🎯 [PokemonSelectionUI] Sélection du Pokémon: ${pokemonId}`);
    
    // Trouver le Pokémon dans l'équipe
    const pokemon = this.playerTeam.find(p => p.id === pokemonId);
    if (!pokemon || !pokemon.available || pokemon.currentHp <= 0) {
      console.warn('⚠️ [PokemonSelectionUI] Pokémon non disponible');
      return;
    }
    
    // Désélectionner l'ancien
    this.overlay.querySelectorAll('.pokemon-card').forEach(card => {
      card.classList.remove('selected');
      card.style.transform = 'scale(1)';
      card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    });
    
    // Sélectionner le nouveau
    const selectedCard = this.overlay.querySelector(`[data-pokemon-id="${pokemonId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
      selectedCard.style.transform = 'scale(1.08)';
      selectedCard.style.boxShadow = '0 8px 30px rgba(255, 203, 5, 0.6)';
    }
    
    this.selectedPokemon = pokemon;
    this.updatePokemonDetails(pokemon);
    this.enableConfirmButton();
  }

  updatePokemonDetails(pokemon) {
    const detailsContainer = this.overlay.querySelector('#pokemonDetails');
    const nameElement = this.overlay.querySelector('#selectedName');
    const levelElement = this.overlay.querySelector('#selectedLevel');
    const hpElement = this.overlay.querySelector('#selectedHP');
    const typeElement = this.overlay.querySelector('#selectedType');
    const movesElement = this.overlay.querySelector('#selectedMoves');
    
    if (detailsContainer) detailsContainer.style.display = 'block';
    if (nameElement) nameElement.textContent = pokemon.name;
    if (levelElement) levelElement.textContent = pokemon.level;
    if (hpElement) hpElement.textContent = `${pokemon.currentHp}/${pokemon.maxHp}`;
    if (typeElement) typeElement.textContent = pokemon.types.map(t => this.getTypeText(t)).join(', ');
    
    if (movesElement) {
      const movesHTML = pokemon.moves.map(moveId => `
        <span class="move-chip">${this.getMoveName(moveId)}</span>
      `).join('');
      movesElement.innerHTML = movesHTML;
    }
  }

  enableConfirmButton() {
    const confirmBtn = this.overlay.querySelector('#confirmBtn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.classList.add('enabled');
    }
  }

  // === ACTIONS ===

  confirmSelection() {
    if (!this.selectedPokemon) {
      console.warn('⚠️ [PokemonSelectionUI] Aucun Pokémon sélectionné');
      return;
    }
    
    console.log('✅ [PokemonSelectionUI] Confirmation du choix:', this.selectedPokemon.name);
    
    // Masquer l'interface
    this.hide();
    
    // Appeler le callback avec le Pokémon choisi
    if (this.onPokemonSelected) {
      this.onPokemonSelected(this.selectedPokemon);
    }
  }

  cancelSelection() {
    console.log('❌ [PokemonSelectionUI] Annulation de la sélection');
    
    this.hide();
    
    // Callback d'annulation
    if (this.onPokemonSelected) {
      this.onPokemonSelected(null);
    }
  }

  // === AFFICHAGE/MASQUAGE ===

  show() {
    console.log('👁️ [PokemonSelectionUI] Affichage de l\'interface');
    
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.isVisible = true;
      
      // Animation d'entrée
      setTimeout(() => {
        this.overlay.style.opacity = '1';
        this.overlay.style.transform = 'scale(1)';
      }, 50);
    }
    
    // Recharger l'équipe à chaque affichage
    this.loadPlayerTeam();
  }

  hide() {
    console.log('👁️ [PokemonSelectionUI] Masquage de l\'interface');
    
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.isVisible = false;
      }, 300);
    }
    
    // Réinitialiser la sélection
    this.selectedPokemon = null;
    
    const confirmBtn = this.overlay?.querySelector('#confirmBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.classList.remove('enabled');
    }
    
    const detailsContainer = this.overlay?.querySelector('#pokemonDetails');
    if (detailsContainer) {
      detailsContainer.style.display = 'none';
    }
  }

  // === MÉTHODES UTILITAIRES ===

  getPokemonEmoji(pokemonId) {
    const pokemonEmojis = {
      1: '🌱', // Bulbasaur
      4: '🔥', // Charmander
      7: '💧', // Squirtle
      25: '⚡', // Pikachu
      // Ajouter d'autres selon les besoins
    };
    
    return pokemonEmojis[pokemonId] || '❓';
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'normal': '',
      'poison': '☠️',
      'burn': '🔥',
      'paralysis': '⚡',
      'sleep': '💤',
      'freeze': '❄️',
      'confusion': '😵'
    };
    
    return statusEmojis[status] || '';
  }

  getHPColorClass(hpPercent) {
    if (hpPercent > 50) return 'hp-high';
    if (hpPercent > 20) return 'hp-medium';
    return 'hp-low';
  }

  getTypeText(type) {
    const typeTexts = {
      'normal': 'Normal',
      'fire': 'Feu',
      'water': 'Eau',
      'electric': 'Électrik',
      'grass': 'Plante',
      'ice': 'Glace',
      'fighting': 'Combat',
      'poison': 'Poison',
      'ground': 'Sol',
      'flying': 'Vol',
      'psychic': 'Psy',
      'bug': 'Insecte',
      'rock': 'Roche',
      'ghost': 'Spectre',
      'dragon': 'Dragon',
      'dark': 'Ténèbres',
      'steel': 'Acier',
      'fairy': 'Fée'
    };
    
    return typeTexts[type] || type;
  }

  getMoveName(moveId) {
    const moveNames = {
      'tackle': 'Charge',
      'growl': 'Grondement',
      'vine_whip': 'Fouet Lianes',
      'scratch': 'Griffe',
      'ember': 'Flammèche',
      'tail_whip': 'Mimi-Queue',
      'bubble': 'Écume',
      'thunder_shock': 'Éclair',
      'thunder_wave': 'Cage Éclair'
    };
    
    return moveNames[moveId] || moveId.replace('_', ' ');
  }

  // === INTÉGRATION AVEC LE SYSTÈME ===

  /**
   * Met à jour l'équipe depuis le GameManager
   */
  updateTeamFromGameManager() {
    if (this.gameManager && this.gameManager.playerTeam) {
      console.log('🔄 [PokemonSelectionUI] Mise à jour depuis GameManager');
      
      // TODO: Adapter selon l'API réelle du GameManager
      // this.playerTeam = this.gameManager.playerTeam.getPokemonList();
      
      if (this.isVisible) {
        this.displayTeam();
      }
    }
  }

  /**
   * Vérifie si l'équipe a des Pokémon disponibles
   */
  hasAvailablePokemon() {
    return this.playerTeam.some(pokemon => 
      pokemon.available && pokemon.currentHp > 0
    );
  }

  /**
   * Obtient le premier Pokémon disponible (pour sélection automatique)
   */
  getFirstAvailablePokemon() {
    return this.playerTeam.find(pokemon => 
      pokemon.available && pokemon.currentHp > 0
    );
  }

  // === MÉTHODES PUBLIQUES ===

  /**
   * Affiche l'interface et retourne une Promise avec le Pokémon choisi
   */
  selectPokemonAsync() {
    return new Promise((resolve) => {
      this.onPokemonSelected = (selectedPokemon) => {
        resolve(selectedPokemon);
      };
      
      this.show();
    });
  }

  /**
   * Sélection automatique du premier Pokémon disponible
   */
  autoSelectFirstAvailable() {
    const firstAvailable = this.getFirstAvailablePokemon();
    if (firstAvailable) {
      console.log('🤖 [PokemonSelectionUI] Sélection automatique:', firstAvailable.name);
      
      if (this.onPokemonSelected) {
        this.onPokemonSelected(firstAvailable);
      }
      
      return firstAvailable;
    }
    
    return null;
  }

  // === NETTOYAGE ===

  destroy() {
    console.log('💀 [PokemonSelectionUI] Destruction...');
    
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
    
    this.selectedPokemon = null;
    this.playerTeam = [];
    this.onPokemonSelected = null;
    
    console.log('✅ [PokemonSelectionUI] Détruit');
  }
}
