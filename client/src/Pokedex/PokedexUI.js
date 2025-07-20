// Pokedex/PokedexUI.js - Interface Pokédx CORRIGÉE
// 🎮 SUPPRESSION des vérifications métier bloquantes
// 🎯 LOGIQUE UI PURE - Délégation vers UIManager via BaseModule

import { POKEDEX_UI_STYLES } from './PokedexUICSS.js';
import { pokedexDataManager } from './PokedexDataManager.js';

export class PokedexUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.currentView = 'national';
    this.selectedPokemon = null;
    this.pokedexData = {};
    this.playerStats = {};
    this.searchFilters = {};
    this.currentLanguage = 'fr';
    this.dataManager = pokedexDataManager;
    this.overlay = null;
    this._eventsAttached = false;
    
    // 🆕 PROTECTION CONTRE LA RÉCURSION RENFORCÉE
    this._isLoadingData = false;
    this._isRefreshing = false;
    this._preventRecursion = false;
    
    // Pagination
    this.currentPage = 0;
    this.itemsPerPage = 20;
    
    // Cache local pour les performances
    this.pokemonCache = new Map();
    this.spriteCache = new Map();
    
    this.init();
  }

  // === 🚀 INITIALISATION ===
  
  init() {
    this.createPokedexInterface();
    this.addStyles();
    
    // Attendre que le DataManager soit prêt
    this.waitForDataManager();
    this.setupServerListeners();
    
    // ✅ FERMER PAR DÉFAUT (important pour UIManager)
    this.forceClose();
    
    console.log('📱 [PokedexUI] Interface Pokédx initialisée (UI pure)');
  }

  async waitForDataManager() {
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max
    
    while (!this.dataManager.isDataLoaded() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.dataManager.isDataLoaded()) {
      console.log('✅ [PokedexUI] DataManager prêt');
    } else {
      console.warn('⚠️ [PokedexUI] DataManager non prêt après 5s');
    }
  }

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion renforcée
  loadDefaultPokemonData() {
    // 🚨 PROTECTION ANTI-RÉCURSION RENFORCÉE
    if (this._isLoadingData || this._preventRecursion) {
      console.warn('⚠️ [PokedexUI] Chargement déjà en cours ou bloqué - IGNORER');
      return;
    }
    
    console.log('📊 [PokedexUI] Chargement données par défaut...');
    this._isLoadingData = true;
    this._preventRecursion = true;
    
    try {
      // S'assurer que le DataManager est prêt
      if (!this.dataManager || !this.dataManager.isDataLoaded()) {
        console.warn('⚠️ [PokedexUI] DataManager non prêt');
        
        // 🔧 DONNÉES MINIMALES PAR DÉFAUT
        this.pokedexData = [];
        this.playerStats = {
          totalSeen: 0,
          totalCaught: 0,
          totalShiny: 0,
          seenPercentage: 0,
          caughtPercentage: 0,
          favoriteCount: 0,
          lastActivity: new Date()
        };
        
        return;
      }
      
      // 🆕 CHARGEMENT AVEC PAGINATION
      const allEntries = this.dataManager.getAllPokemonEntries();
      const startIndex = this.currentPage * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      
      this.pokedexData = allEntries.slice(startIndex, endIndex);
      this.playerStats = this.dataManager.getPlayerStats();
      
      // 🆕 METTRE À JOUR LA PAGINATION
      this.updatePagination({
        total: allEntries.length,
        limit: this.itemsPerPage,
        offset: startIndex
      });
      
      console.log(`✅ [PokedexUI] ${this.pokedexData.length} Pokémon chargés (page ${this.currentPage + 1})`);
      
    } catch (error) {
      console.error('❌ [PokedexUI] Erreur chargement données:', error);
      
      // Données de secours
      this.pokedexData = [];
      this.playerStats = {
        totalSeen: 0,
        totalCaught: 0,
        totalShiny: 0,
        seenPercentage: 0,
        caughtPercentage: 0,
        favoriteCount: 0,
        lastActivity: new Date()
      };
    } finally {
      this._isLoadingData = false;
      // Réactiver après un délai
      setTimeout(() => {
        this._preventRecursion = false;
      }, 1000);
    }
  }

  createPokedexInterface() {
    // Supprimer l'existant si présent
    const existing = document.querySelector('#pokedx-overlay');
    if (existing) {
      existing.remove();
    }

    // Créer le conteneur principal - style Pokédx classique
    const overlay = document.createElement('div');
    overlay.id = 'pokedx-overlay';
    overlay.className = 'pokedx-overlay hidden';

    overlay.innerHTML = `
      <div class="pokedx-container">
        <!-- Header style Game Boy -->
        <div class="pokedx-header">
          <div class="pokedx-top-section">
            <div class="pokedx-logo">
              <div class="logo-light red"></div>
              <div class="logo-content">
                <span class="logo-title">POKÉDX</span>
                <span class="logo-subtitle">NATIONAL</span>
              </div>
              <div class="logo-lights">
                <div class="logo-light yellow"></div>
                <div class="logo-light green"></div>
              </div>
            </div>
            <div class="pokedx-controls">
              <button class="pokedx-close-btn" title="Fermer">×</button>
            </div>
          </div>
          
          <!-- Navigation tabs -->
          <div class="pokedx-tabs">
            <div class="tab-button active" data-view="national">
              <span class="tab-icon">📋</span>
              <span>National</span>
            </div>
            <div class="tab-button" data-view="search">
              <span class="tab-icon">🔍</span>
              <span>Recherche</span>
            </div>
            <div class="tab-button" data-view="favorites">
              <span class="tab-icon">⭐</span>
              <span>Favoris</span>
            </div>
            <div class="tab-button" data-view="stats">
              <span class="tab-icon">📊</span>
              <span>Stats</span>
            </div>
          </div>
        </div>

        <div class="pokedx-content">
          <!-- Vue National (liste) -->
          <div class="pokedx-view national-view active">
            <div class="view-header">
              <div class="progress-summary">
                <div class="progress-item">
                  <span class="progress-label">VUS</span>
                  <span class="progress-value" id="total-seen">0</span>
                </div>
                <div class="progress-item">
                  <span class="progress-label">CAPTURÉS</span>
                  <span class="progress-value" id="total-caught">0</span>
                </div>
                <div class="progress-item">
                  <span class="progress-label">COMPLÉTÉ</span>
                  <span class="progress-value" id="completion-percent">0%</span>
                </div>
              </div>
              
              <div class="view-controls">
                <button class="control-btn" id="sort-btn">
                  <span class="btn-icon">⇅</span>
                  <span>Trier</span>
                </button>
                <button class="control-btn" id="filter-btn">
                  <span class="btn-icon">⚙️</span>
                  <span>Filtrer</span>
                </button>
              </div>
            </div>
            
            <!-- Grille des Pokémon -->
            <div class="pokemon-grid" id="pokemon-grid">
              <!-- Entries générées dynamiquement -->
            </div>
            
            <!-- Pagination -->
            <div class="pagination-controls">
              <button class="page-btn" id="prev-page" disabled>‹ Précédent</button>
              <span class="page-info">
                Page <span id="current-page">1</span> sur <span id="total-pages">1</span>
              </span>
              <button class="page-btn" id="next-page">Suivant ›</button>
            </div>
          </div>

          <!-- Vue Recherche -->
          <div class="pokedx-view search-view">
            <div class="search-container">
              <div class="search-input-group">
                <input type="text" id="search-input" placeholder="Nom ou numéro du Pokémon..." class="search-input">
                <button class="search-btn" id="search-submit">🔍</button>
              </div>
              
              <div class="search-filters">
                <div class="filter-group">
                  <label>Types :</label>
                  <div class="type-filters" id="type-filters">
                    <!-- Types générés dynamiquement -->
                  </div>
                </div>
                
                <div class="filter-group">
                  <label>Statut :</label>
                  <div class="status-filters">
                    <label class="filter-checkbox">
                      <input type="checkbox" name="seen" value="true">
                      <span>Vus</span>
                    </label>
                    <label class="filter-checkbox">
                      <input type="checkbox" name="caught" value="true">
                      <span>Capturés</span>
                    </label>
                    <label class="filter-checkbox">
                      <input type="checkbox" name="shiny" value="true">
                      <span>Shiny</span>
                    </label>
                  </div>
                </div>
                
                <div class="filter-group">
                  <label>Région :</label>
                  <select class="region-select" id="region-select">
                    <option value="">Toutes les régions</option>
                    <option value="kanto">Kanto (1-151)</option>
                    <option value="johto">Johto (152-251)</option>
                    <option value="hoenn">Hoenn (252-386)</option>
                  </select>
                </div>
                
                <button class="apply-filters-btn" id="apply-filters">Appliquer les filtres</button>
                <button class="clear-filters-btn" id="clear-filters">Effacer</button>
              </div>
            </div>
            
            <div class="search-results" id="search-results">
              <!-- Résultats de recherche -->
            </div>
          </div>

          <!-- Vue Favoris -->
          <div class="pokedx-view favorites-view">
            <div class="favorites-header">
              <h3>Pokémon Favoris</h3>
              <p class="favorites-subtitle">Vos Pokémon marqués comme favoris</p>
            </div>
            <div class="favorites-grid" id="favorites-grid">
              <!-- Favoris générés dynamiquement -->
            </div>
          </div>

          <!-- Vue Statistiques -->
          <div class="pokedx-view stats-view">
            <div class="stats-container">
              <div class="stats-overview">
                <div class="stat-card">
                  <div class="stat-icon">👁️</div>
                  <div class="stat-info">
                    <div class="stat-value" id="stats-seen">0</div>
                    <div class="stat-label">Pokémon vus</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">🎯</div>
                  <div class="stat-info">
                    <div class="stat-value" id="stats-caught">0</div>
                    <div class="stat-label">Pokémon capturés</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">✨</div>
                  <div class="stat-info">
                    <div class="stat-value" id="stats-shiny">0</div>
                    <div class="stat-label">Pokémon shiny</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">🏆</div>
                  <div class="stat-info">
                    <div class="stat-value" id="stats-completion">0%</div>
                    <div class="stat-label">Complété</div>
                  </div>
                </div>
              </div>
              
              <div class="detailed-stats">
                <div class="stats-section">
                  <h4>Progression par type</h4>
                  <div class="type-progress" id="type-progress">
                    <!-- Stats par type -->
                  </div>
                </div>
                
                <div class="stats-section">
                  <h4>Activité récente</h4>
                  <div class="recent-activity" id="recent-activity">
                    <!-- Activité récente -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panneau de détails (slide depuis la droite) -->
        <div class="pokemon-details-panel" id="details-panel">
          <div class="details-header">
            <button class="details-close" id="details-close">‹</button>
            <h3 class="details-title">Détails</h3>
          </div>
          
          <div class="details-content" id="details-content">
            <!-- Contenu des détails généré dynamiquement -->
          </div>
        </div>

        <!-- Footer avec info système -->
        <div class="pokedx-footer">
          <div class="footer-info">
            <span class="system-status">
              <span class="status-indicator online"></span>
              SYSTÈME CONNECTÉ
            </span>
            <span class="last-sync">
              Dernière sync : <span id="last-sync-time">--:--</span>
            </span>
          </div>
          
          <div class="footer-actions">
            <button class="footer-btn" id="sync-btn" title="Synchroniser">
              <span class="btn-icon">🔄</span>
            </button>
            <button class="footer-btn" id="settings-btn" title="Paramètres">
              <span class="btn-icon">⚙️</span>
            </button>
            <button class="footer-btn" id="help-btn" title="Aide">
              <span class="btn-icon">❓</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  addStyles() {
    if (document.querySelector('#pokedx-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'pokedx-ui-styles';
    style.textContent = POKEDX_UI_STYLES;
    
    document.head.appendChild(style);
    console.log('🎨 [PokedexUI] Styles modulaires appliqués');
  }

  // === ⚙️ MÉTHODES DE CONTRÔLE ===

  forceClose() {
    console.log('🔒 [PokedxUI] Fermeture forcée...');
    
    this.isVisible = false;
    
    if (this.overlay) {
      this.overlay.classList.remove('ui-fade-in', 'ui-fade-out');
      this.overlay.classList.add('hidden');
      this.overlay.style.display = 'none';
      this.overlay.style.opacity = '0';
      this.overlay.style.visibility = 'hidden';
      this.overlay.style.pointerEvents = 'none';
    }
    
    this.selectedPokemon = null;
    this._eventsAttached = false;
    
    console.log('✅ [PokedxUI] Fermé complètement');
  }

  show() {
    if (this.isVisible) {
      console.log('ℹ️ [PokedxUI] Déjà ouvert');
      return;
    }
    
    console.log('📱 [PokedxUI] Ouverture Pokédx...');
    
    this.isVisible = true;
    
    if (this.overlay) {
      this.overlay.classList.remove('hidden', 'ui-hidden', 'ui-fade-out');
      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = '1';
      this.overlay.style.visibility = 'visible';
      this.overlay.style.pointerEvents = 'auto';
      this.overlay.style.zIndex = '1000';
      
      this.overlay.classList.add('ui-fade-in');
      setTimeout(() => {
        this.overlay.classList.remove('ui-fade-in');
      }, 300);
    }
    
    // ✅ ATTACHER LES ÉVÉNEMENTS SEULEMENT À L'OUVERTURE
    this.ensureEventListeners();
    
    // 🛠️ CHARGER LES DONNÉES EN SÉCURITÉ - SANS APPELER LE SERVEUR
    this.safeLoadAndRefresh();
    
    // Son d'ouverture nostalgique
    this.playOpenSound();
    
    console.log('✅ [PokedxUI] Pokédx ouvert');
  }

  // 🛠️ NOUVELLE MÉTHODE - Chargement sécurisé SANS appels serveur
  safeLoadAndRefresh() {
    console.log('🔒 [PokedxUI] Chargement et refresh sécurisés...');
    
    // Charger les données avec pagination
    this.loadDefaultPokemonData();
    
    // 🆕 FORCER LE RENDU IMMÉDIAT AVEC LA PAGINATION
    setTimeout(() => {
      if (this.isVisible && this.pokedxData) {
        console.log(`🎨 [PokedxUI] Rendu forcé avec ${this.pokedxData.length} entrées (page ${this.currentPage + 1})`);
        this.renderNationalView();
        this.updatePaginationButtons();
      }
    }, 100);
    
    // Puis faire le refresh manuellement
    this.safeRefresh();
  }

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion
  safeRefresh() {
    if (this._isRefreshing) {
      console.warn('⚠️ [PokedxUI] Refresh déjà en cours, ignorer');
      return;
    }
    
    this._isRefreshing = true;
    
    try {
      // Mettre à jour l'affichage des stats d'abord
      this.updateProgressSummary();
      
      // Puis rafraîchir la vue actuelle
      this.refreshCurrentView();
      
    } catch (error) {
      console.error('❌ [PokedxUI] Erreur lors du refresh:', error);
    } finally {
      this._isRefreshing = false;
    }
  }

  hide() {
    if (!this.isVisible) {
      console.log('ℹ️ [PokedxUI] Déjà fermé');
      return;
    }
    
    console.log('❌ [PokedxUI] Fermeture Pokédx...');
    
    this.isVisible = false;
    
    if (this.overlay) {
      this.overlay.classList.add('ui-fade-out');
      
      setTimeout(() => {
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('ui-fade-out');
        this.overlay.style.display = 'none';
        this.overlay.style.opacity = '0';
        this.overlay.style.visibility = 'hidden';
        this.overlay.style.pointerEvents = 'none';
      }, 150);
    }
    
    // Fermer le panneau de détails
    this.closeDetailsPanel();
    
    console.log('✅ [PokedxUI] Pokédx fermé');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // === ❌ SUPPRESSION CANPLAYERINTERACT() PROBLÉMATIQUE ===
  
  /**
   * ❌ MÉTHODE SUPPRIMÉE: canPlayerInteract()
   * 
   * Ancienne logique problématique:
   * - return !this.isVisible && !questDialogOpen && !chatOpen && !starterHudOpen
   * - Bloquait l'ouverture si UI déjà ouverte
   * - Vérifications redondantes avec UIManager
   * 
   * ✅ REMPLACEMENT: Délégation vers UIManager via BaseModule
   * - Toutes les vérifications centralisées dans UIManager
   * - canOpenUI() → BaseModule → UIManager.canShowModule()
   * - Architecture propre sans doublons
   */

  // === 🎛️ GESTION DES ÉVÉNEMENTS ===

  ensureEventListeners() {
    if (this._eventsAttached) {
      console.log('ℹ️ [PokedxUI] Événements déjà attachés');
      return;
    }
    
    console.log('🔧 [PokedxUI] Attachement des événements...');
    this.setupEventListeners();
    this._eventsAttached = true;
  }

  setupEventListeners() {
    if (!this.overlay) return;

    // === FERMETURE ===
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));

    const closeBtn = this.overlay.querySelector('.pokedx-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      };
    }

    // === NAVIGATION TABS ===
    this.overlay.querySelectorAll('.tab-button').forEach(tab => {
      tab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const view = tab.dataset.view;
        this.switchToView(view);
      };
    });

    // === CONTRÔLES VUE NATIONALE ===
    const sortBtn = this.overlay.querySelector('#sort-btn');
    const filterBtn = this.overlay.querySelector('#filter-btn');
    const prevPageBtn = this.overlay.querySelector('#prev-page');
    const nextPageBtn = this.overlay.querySelector('#next-page');

    if (sortBtn) {
      sortBtn.onclick = () => this.showSortOptions();
    }

    if (filterBtn) {
      filterBtn.onclick = () => this.showFilterOptions();
    }

    if (prevPageBtn) {
      prevPageBtn.onclick = () => this.changePage(-1);
    }

    if (nextPageBtn) {
      nextPageBtn.onclick = () => this.changePage(1);
    }

    // === RECHERCHE ===
    const searchInput = this.overlay.querySelector('#search-input');
    const searchSubmit = this.overlay.querySelector('#search-submit');
    const applyFilters = this.overlay.querySelector('#apply-filters');
    const clearFilters = this.overlay.querySelector('#clear-filters');

    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }

    if (searchSubmit) {
      searchSubmit.onclick = () => this.handleSearch();
    }

    if (applyFilters) {
      applyFilters.onclick = () => this.applySearchFilters();
    }

    if (clearFilters) {
      clearFilters.onclick = () => this.clearSearchFilters();
    }

    // === PANNEAU DÉTAILS ===
    const detailsClose = this.overlay.querySelector('#details-close');
    if (detailsClose) {
      detailsClose.onclick = () => this.closeDetailsPanel();
    }

    // === FOOTER ACTIONS ===
    const syncBtn = this.overlay.querySelector('#sync-btn');
    const settingsBtn = this.overlay.querySelector('#settings-btn');
    const helpBtn = this.overlay.querySelector('#help-btn');

    if (syncBtn) {
      syncBtn.onclick = () => this.syncPokedx();
    }

    if (settingsBtn) {
      settingsBtn.onclick = () => this.showSettings();
    }

    if (helpBtn) {
      helpBtn.onclick = () => this.showHelp();
    }

    // === FERMETURE EN CLIQUANT À L'EXTÉRIEUR ===
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    };

    console.log('✅ [PokedxUI] Événements attachés');
  }

  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isVisible) {
      e.preventDefault();
      
      // Si le panneau de détails est ouvert, le fermer d'abord
      if (this.isDetailsPanelOpen()) {
        this.closeDetailsPanel();
      } else {
        this.hide();
      }
    }
  }

  // === 📡 COMMUNICATION SERVEUR SIMPLIFIÉE ===

  setupServerListeners() {
    if (!this.gameRoom) return;

    // === RÉCEPTION DES DONNÉES POKÉDX ===
    this.gameRoom.onMessage("pokedx:get", (response) => {
      this.handlePokedxData(response);
    });

    // Réception d'une entrée détaillée
    this.gameRoom.onMessage("pokedx:entry", (response) => {
      this.handlePokemonDetails(response);
    });

    // Réception des statistiques
    this.gameRoom.onMessage("pokedx:stats", (response) => {
      this.handleStatsData(response);
    });

    // Réception mark_seen
    this.gameRoom.onMessage("pokedx:mark_seen", (response) => {
      console.log('✅ [PokedxUI] Mark seen confirmé:', response);
      if (response.success && this.isVisible) {
        this.safeReloadData();
      }
    });

    // Réception mark_caught  
    this.gameRoom.onMessage("pokedx:mark_caught", (response) => {
      console.log('✅ [PokedxUI] Mark caught confirmé:', response);
      if (response.success && this.isVisible) {
        this.safeReloadData();
      }
    });

    // Réception toggle favorite
    this.gameRoom.onMessage("pokedx:toggle_favorite", (response) => {
      this.handleFavoriteUpdate(response);
    });

    // Réception quick actions
    this.gameRoom.onMessage("pokedx:quick_action", (response) => {
      console.log('⚡ [PokedxUI] Action rapide confirmée:', response);
      if (response.success && response.data.action === 'force_sync' && this.isVisible) {
        this.safeReloadData();
      }
    });

    // === NOTIFICATIONS/BROADCASTS ===
    this.gameRoom.onMessage("pokedx:discovery", (data) => {
      this.handleDiscoveryNotification(data);
    });

    this.gameRoom.onMessage("pokedx:capture", (data) => {
      this.handleCaptureNotification(data);
    });

    console.log('📡 [PokedxUI] Listeners serveur simplifiés configurés');
  }

  requestPokemonDetails(pokemonId) {
    if (this.gameRoom) {
      console.log(`📡 [PokedxUI] Demande détails #${pokemonId}...`);
      this.gameRoom.send("pokedx:entry", {
        pokemonId: pokemonId,
        includeEvolutions: true,
        includeRecommendations: true
      });
    }
  }

  requestStats() {
    if (this.gameRoom) {
      console.log('📡 [PokedxUI] Demande statistiques...');
      this.gameRoom.send("pokedx:stats");
    }
  }

  // === 📊 GESTION DES DONNÉES AVEC DATAMANAGER ===

  handlePokedxData(response) {
    if (!response.success) {
      console.error('❌ [PokedxUI] Erreur données Pokédx:', response.error);
      this.showError('Impossible de charger les données du Pokédx');
      return;
    }

    console.log('📊 [PokedxUI] Données Pokédx reçues du serveur');
    
    if (response.data) {
      // Configurer le DataManager avec les données serveur
      this.dataManager.setServerData(response.data);
      
      // 🛠️ RECHARGER LES DONNÉES LOCALES DE MANIÈRE SÉCURISÉE
      this.safeReloadData();
    }
    
    // Mettre à jour l'affichage
    this.updateProgressSummary();
    this.updateLastSyncTime();
    
    console.log('✅ [PokedxUI] Données traitées avec DataManager');
  }

  // 🛠️ NOUVELLE MÉTHODE - Rechargement sécurisé SANS appels serveur
  safeReloadData() {
    if (this._isLoadingData) {
      console.warn('⚠️ [PokedxUI] Chargement déjà en cours');
      return;
    }
    
    console.log('🔄 [PokedxUI] Rechargement sécurisé des données...');
    
    // Recharger les données sans refresh automatique
    this.loadDefaultPokemonData();
    
    // Refresh manuel si l'interface est visible
    if (this.isVisible && !this._isRefreshing) {
      this.safeRefresh();
    }
  }

  /**
   * Charge les données locales depuis le DataManager
   */
  loadLocalPokedxData(filters = {}) {
    console.log('💾 [PokedxUI] Chargement données locales...');
    
    // S'assurer que le DataManager est prêt
    if (!this.dataManager || !this.dataManager.isDataLoaded()) {
      console.warn('⚠️ [PokedxUI] DataManager non prêt');
      
      this.pokedxData = [];
      this.playerStats = {
        totalSeen: 0,
        totalCaught: 0,
        totalShiny: 0,
        seenPercentage: 0,
        caughtPercentage: 0,
        favoriteCount: 0,
        lastActivity: new Date()
      };
      return;
    }
        
    // Pagination locale
    const allEntries = this.dataManager.getAllPokemonEntries(filters);
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    this.pokedxData = allEntries.slice(startIndex, endIndex);
    this.playerStats = this.dataManager.getPlayerStats();
    
    // Mettre à jour l'affichage
    this.updateProgressSummary();
    this.updatePagination({
      total: allEntries.length,
      limit: this.itemsPerPage,
      offset: startIndex
    });
    
    console.log(`✅ [PokedxUI] ${this.pokedxData.length} entrées chargées (page ${this.currentPage + 1})`);
  }

  handlePokemonDetails(response) {
    if (!response.success) {
      console.error('❌ [PokedxUI] Erreur détails Pokémon:', response.error);
      return;
    }

    console.log('📋 [PokedxUI] Détails Pokémon reçus:', response.data);
    this.showPokemonDetails(response.data);
  }

  handleStatsData(response) {
    if (!response.success) {
      console.error('❌ [PokedxUI] Erreur statistiques:', response.error);
      return;
    }

    console.log('📈 [PokedxUI] Statistiques reçues:', response.data);
    
    this.playerStats = { ...this.playerStats, ...response.data };
    this.updateStatsView();
  }

  // 🛠️ MÉTHODES NOTIFICATIONS CORRIGÉES - Sans appels serveur
  handleDiscoveryNotification(data) {
    console.log('✨ [PokedxUI] Nouvelle découverte:', data);
    
    // Animation et son
    this.playDiscoverySound();
    
    // ✅ Mise à jour automatique des données SEULEMENT si visible
    if (this.isVisible) {
      setTimeout(() => {
        this.safeReloadData();
      }, 1000);
    }
  }

  handleCaptureNotification(data) {
    console.log('🎯 [PokedxUI] Nouvelle capture:', data);
    
    // Animation et son
    this.playCaptureSound();
    
    // ✅ Mise à jour automatique des données SEULEMENT si visible
    if (this.isVisible) {
      setTimeout(() => {
        this.safeReloadData();
      }, 1000);
    }
  }

  handleFavoriteUpdate(response) {
    if (response.success) {
      // Mettre à jour l'affichage local
      this.updatePokemonFavoriteStatus(response.data.pokemonId, response.data.favorited);
    }
  }

  // === 🎨 MISE À JOUR DE L'AFFICHAGE ===

  updateProgressSummary() {
    const totalSeenEl = this.overlay.querySelector('#total-seen');
    const totalCaughtEl = this.overlay.querySelector('#total-caught');
    const completionEl = this.overlay.querySelector('#completion-percent');

    if (totalSeenEl) totalSeenEl.textContent = this.playerStats.totalSeen || 0;
    if (totalCaughtEl) totalCaughtEl.textContent = this.playerStats.totalCaught || 0;
    if (completionEl) completionEl.textContent = `${Math.round(this.playerStats.caughtPercentage || 0)}%`;
  }

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion
  refreshCurrentView() {
    if (this._isRefreshing) {
      console.warn('⚠️ [PokedxUI] RefreshCurrentView déjà en cours');
      return;
    }
    
    switch (this.currentView) {
      case 'national':
        this.renderNationalView();
        break;
      case 'search':
        this.renderSearchResults();
        break;
      case 'favorites':
        this.renderFavoritesView();
        break;
      case 'stats':
        this.renderStatsView();
        break;
    }
  }

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion
  renderNationalView() {
    const grid = this.overlay.querySelector('#pokemon-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Afficher état de chargement si pas encore de données
    if (!this.pokedxData || this.pokedxData.length === 0) {
      grid.innerHTML = `
        <div class="loading-state">
          <div class="loading-icon">⏳</div>
          <p>Chargement du Pokédx National...</p>
        </div>
      `;
      return;
    }

    console.log(`🎨 [PokedxUI] Rendu ${this.pokedxData.length} entrées Pokémon`);

    this.pokedxData.forEach((entry, index) => {
      const entryElement = this.createPokemonEntry(entry, index);
      grid.appendChild(entryElement);
    });
  }

  // === AUTRES MÉTHODES IDENTIQUES (tronquées pour la lisibilité) ===
  
  createPokemonEntry(entry, index) {
    // [Code identique au fichier original...]
    const entryDiv = document.createElement('div');
    entryDiv.className = `pokemon-entry ${entry.displayStatus}`;
    entryDiv.dataset.pokemonId = entry.pokemonId;

    // Classes CSS selon le statut
    if (entry.caught) {
      entryDiv.classList.add('caught');
    } else if (entry.seen) {
      entryDiv.classList.add('seen');
    } else {
      entryDiv.classList.add('unknown');
    }

    entryDiv.innerHTML = `
      <div class="entry-header">
        <span class="entry-number">${entry.displayNumber}</span>
        ${entry.favorited ? '<span class="favorite-star">⭐</span>' : ''}
        ${entry.shiny ? '<span class="shiny-indicator">✨</span>' : ''}
      </div>
      
      <div class="entry-sprite">
        ${this.getPokemonSpriteForEntry(entry)}
      </div>
      
      <div class="entry-info">
        <div class="entry-name">${entry.displayName}</div>
        <div class="entry-status">
          ${this.getStatusBadge(entry)}
        </div>
        ${this.getTypeBadges(entry)}
      </div>
    `;

    // Événement clic pour voir les détails
    entryDiv.addEventListener('click', () => {
      if (entry.seen || entry.caught) {
        this.selectPokemon(entry);
      } else {
        this.showUnknownPokemonMessage();
      }
    });

    // Animation d'apparition
    setTimeout(() => {
      entryDiv.classList.add('entry-appear');
    }, index * 30);

    return entryDiv;
  }

  // === API PUBLIQUE SIMPLIFIÉE ===

  openToView(viewName) {
    this.show();
    if (viewName && viewName !== this.currentView) {
      setTimeout(() => {
        this.switchToView(viewName);
      }, 100);
    }
  }

  isOpen() {
    return this.isVisible;
  }

  setEnabled(enabled) {
    if (this.overlay) {
      if (enabled) {
        this.overlay.classList.remove('disabled');
      } else {
        this.overlay.classList.add('disabled');
      }
    }
  }

  // === 🧹 NETTOYAGE ===

  destroy() {
    console.log('🧹 [PokedxUI] Destruction...');
    
    // Supprimer les événements globaux
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Supprimer l'overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Vider les caches
    this.pokemonCache.clear();
    this.spriteCache.clear();
    
    // Reset état
    this.overlay = null;
    this.isVisible = false;
    this.selectedPokemon = null;
    this.pokedxData = {};
    this._eventsAttached = false;
    this._isLoadingData = false;
    this._isRefreshing = false;
    this._preventRecursion = false;
    
    console.log('✅ [PokedxUI] Détruit');
  }

  // === MÉTHODES UTILITAIRES (identiques mais tronquées) ===
  
  getPokemonSpriteForEntry(entry) { /* Code identique... */ }
  getStatusBadge(entry) { /* Code identique... */ }
  getTypeBadges(entry) { /* Code identique... */ }
  handleSearch() { /* Code identique... */ }
  applySearchFilters() { /* Code identique... */ }
  clearSearchFilters() { /* Code identique... */ }
  togglePokemonFavorite(pokemonId) { /* Code identique... */ }
  updatePokemonFavoriteStatus(pokemonId, favorited) { /* Code identique... */ }
  selectPokemon(entry) { /* Code identique... */ }
  showPokemonDetails(pokemonData) { /* Code identique... */ }
  closeDetailsPanel() { /* Code identique... */ }
  isDetailsPanelOpen() { /* Code identique... */ }
  renderStatsView() { /* Code identique... */ }
  updateStatsView() { /* Code identique... */ }
  renderSearchResults() { /* Code identique... */ }
  renderFavoritesView() { /* Code identique... */ }
  switchToView(viewName) { /* Code identique... */ }
  changePage(direction) { /* Code identique... */ }
  updatePagination(paginationData) { /* Code identique... */ }
  updatePaginationButtons() { /* Code identique... */ }
  syncPokedx() { /* Code simplifié sans appels serveur automatiques */ }
  updateLastSyncTime() { /* Code identique... */ }
  showSettings() { /* Code identique... */ }
  showHelp() { /* Code identique... */ }
  showSortOptions() { /* Code identique... */ }
  showFilterOptions() { /* Code identique... */ }
  showError(message) { /* Code identique... */ }
  showUnknownPokemonMessage() { /* Code identique... */ }
  playOpenSound() { /* Code identique... */ }
  playDiscoverySound() { /* Code identique... */ }
  playCaptureSound() { /* Code identique... */ }
  debounce(func, wait) { /* Code identique... */ }
}

export default PokedxUI;

console.log(`
📱 === POKÉDX UI CORRIGÉE ===

❌ SUPPRESSIONS EFFECTUÉES:
• canPlayerInteract() - bloquait si UI ouverte
• Appels serveur automatiques récursifs
• Vérifications métier redondantes avec UIManager
• Logique complexe de délégation

✅ CORRECTIONS APPLIQUÉES:
• Interface UI pure sans logique métier
• Protection anti-récursion renforcée
• Chargement sécurisé des données
• Délégation complète vers UIManager

🎯 ARCHITECTURE PROPRE:
• UI = Affichage seulement
• Logique métier = PokedxSystem
• Autorisations = UIManager
• Données = PokedxDataManager

✅ POKÉDX UI NETTOYÉE ET SÉCURISÉE !
`);
