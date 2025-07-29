// Pokedex/PokedexUI.js - Interface Pokédx COMPLÈTE AVEC TRADUCTIONS
// 🎮 Correction de la boucle infinie + suppression des appels serveur inutiles + TRADUCTIONS TEMPS RÉEL
// 🌐 Support complet des traductions depuis LocalizationManager

import { POKEDEX_UI_STYLES } from './PokedexUICSS.js';
import { pokedexDataManager } from './PokedexDataManager.js';
import { t } from '../managers/LocalizationManager.js';

export class PokedexUI {
  constructor(gameRoom, optionsManager = null) {
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;  // ← NOUVEAU
    this.cleanupLanguageListener = null;   // ← NOUVEAU
    
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
    
    // 🆕 PROTECTION CONTRE LA RÉCURSION
    this._isLoadingData = false;
    this._isRefreshing = false;
    
    // ⏰ NOUVEAU: Gestion timing traductions
    this.translationsReady = false;
    this.pendingLanguageUpdate = false;
    
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
    
    // ⏰ NOUVEAU: Setup langue avec vérification timing
    this.setupLanguageSupportWithTiming();
    
    // Attendre que le DataManager soit prêt
    this.waitForDataManager();
    this.setupServerListeners();
    
    // ✅ FERMER PAR DÉFAUT (important pour UIManager)
    this.forceClose();
    
    console.log('📱 [PokedexUI] Interface Pokédx initialisée avec traductions temps réel');
  }

  // === 🌐 SUPPORT LANGUE AVEC FIX TIMING ===
  
  setupLanguageSupportWithTiming() {
    console.log('🌐 [PokedexUI] Setup langue avec timing fix...');
    
    // ⏰ VÉRIFIER SI LES TRADUCTIONS SONT PRÊTES
    this.checkTranslationsReady();
    
    // Setup listener pour changements de langue
    if (this.optionsManager?.addLanguageListener) {
      this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
        console.log('🌐 [PokedexUI] Changement de langue détecté');
        this.updateLanguage();
      });
      console.log('🔗 [PokedexUI] Listener langue configuré');
    } else {
      console.warn('⚠️ [PokedexUI] OptionsManager non disponible pour les traductions');
      
      // ⏰ FALLBACK: Essayer de reconnecter plus tard
      setTimeout(() => {
        this.retryLanguageSetup();
      }, 2000);
    }
  }
  
  checkTranslationsReady() {
    try {
      // ⏰ TESTER SI LES TRADUCTIONS FONCTIONNENT
      const testTranslation = t('pokedex.label');
      
      if (testTranslation && testTranslation !== 'pokedex.label' && !testTranslation.includes('Manquant:')) {
        console.log('✅ [PokedexUI] Traductions prêtes:', testTranslation);
        this.translationsReady = true;
        this.updateLanguage();
      } else {
        console.warn('⚠️ [PokedexUI] Traductions pas encore prêtes, fallback...');
        this.translationsReady = false;
        
        // ⏰ RETRY DANS 1 SECONDE
        setTimeout(() => {
          this.checkTranslationsReady();
        }, 1000);
      }
    } catch (error) {
      console.warn('⚠️ [PokedexUI] Erreur test traductions:', error);
      this.translationsReady = false;
      
      // ⏰ RETRY DANS 2 SECONDES
      setTimeout(() => {
        this.checkTranslationsReady();
      }, 2000);
    }
  }
  
  retryLanguageSetup() {
    console.log('🔄 [PokedexUI] Retry setup langue...');
    
    // Vérifier si optionsManager est maintenant disponible
    this.optionsManager = this.optionsManager || 
                          window.optionsSystem?.manager || 
                          window.optionsSystemGlobal?.manager;
    
    if (this.optionsManager && !this.cleanupLanguageListener) {
      console.log('✅ [PokedexUI] OptionsManager maintenant disponible');
      this.setupLanguageSupportWithTiming();
    } else {
      console.log('⏰ [PokedexUI] OptionsManager toujours indisponible, retry dans 3s...');
      setTimeout(() => {
        this.retryLanguageSetup();
      }, 3000);
    }
  }
  
  updateLanguage() {
    if (!this.overlay) {
      console.log('⏰ [PokedexUI] Overlay pas encore créé, reporter mise à jour');
      this.pendingLanguageUpdate = true;
      return;
    }
    
    try {
      console.log('🔄 [PokedexUI] Mise à jour langue...');
      
      // Mettre à jour tous les textes statiques
      this.updateStaticTexts();
      
      // Mettre à jour la vue actuelle
      if (this.isVisible && !this._isRefreshing) {
        this.safeRefresh();
      }
      
      this.pendingLanguageUpdate = false;
      console.log('✅ [PokedexUI] Langue mise à jour');
      
    } catch (error) {
      console.error('❌ [PokedexUI] Erreur mise à jour langue:', error);
    }
  }
  
  updateStaticTexts() {
    if (!this.overlay || !this.translationsReady) return;
    
    try {
      // Header
      const logoTitle = this.overlay.querySelector('.logo-title');
      if (logoTitle) {
        logoTitle.textContent = this.getTranslation('pokedex.ui.header.title', 'POKÉDEX');
      }
      
      const logoSubtitle = this.overlay.querySelector('.logo-subtitle');
      if (logoSubtitle) {
        logoSubtitle.textContent = this.getTranslation('pokedex.ui.header.subtitle', 'NATIONAL');
      }
      
      // Tabs
      this.updateTabTexts();
      
      // Progress labels
      this.updateProgressLabels();
      
      // Controls
      this.updateControlTexts();
      
      // Search texts
      this.updateSearchTexts();
      
      // Stats texts
      this.updateStatsTexts();
      
      // Footer
      this.updateFooterTexts();
      
      console.log('🔄 [PokedexUI] Textes statiques mis à jour');
      
    } catch (error) {
      console.warn('⚠️ [PokedexUI] Erreur mise à jour textes:', error);
    }
  }
  
  updateTabTexts() {
    const tabs = [
      { selector: '[data-view="national"] span:last-child', key: 'pokedex.ui.tabs.national', fallback: 'National' },
      { selector: '[data-view="search"] span:last-child', key: 'pokedex.ui.tabs.search', fallback: 'Recherche' },
      { selector: '[data-view="favorites"] span:last-child', key: 'pokedex.ui.tabs.favorites', fallback: 'Favoris' },
      { selector: '[data-view="stats"] span:last-child', key: 'pokedex.ui.tabs.stats', fallback: 'Stats' }
    ];
    
    tabs.forEach(({ selector, key, fallback }) => {
      const element = this.overlay.querySelector(selector);
      if (element) {
        element.textContent = this.getTranslation(key, fallback);
      }
    });
  }
  
  updateProgressLabels() {
    const progressLabels = [
      { id: 'total-seen', key: 'pokedex.ui.progress.seen', fallback: 'VUS' },
      { id: 'total-caught', key: 'pokedex.ui.progress.caught', fallback: 'CAPTURÉS' },
      { id: 'completion-percent', key: 'pokedex.ui.progress.completed', fallback: 'COMPLÉTÉ' }
    ];
    
    progressLabels.forEach(({ id, key, fallback }) => {
      const valueElement = this.overlay.querySelector(`#${id}`);
      if (valueElement) {
        const labelElement = valueElement.previousElementSibling;
        if (labelElement && labelElement.classList.contains('progress-label')) {
          labelElement.textContent = this.getTranslation(key, fallback);
        }
      }
    });
  }
  
  updateControlTexts() {
    const controls = [
      { id: 'sort-btn', text: this.getTranslation('pokedex.ui.actions.sort', 'Trier') },
      { id: 'filter-btn', text: this.getTranslation('pokedex.ui.actions.filter', 'Filtrer') },
      { id: 'sync-btn', title: this.getTranslation('pokedex.ui.actions.sync', 'Synchroniser') },
      { id: 'settings-btn', title: this.getTranslation('pokedex.ui.actions.settings', 'Paramètres') },
      { id: 'help-btn', title: this.getTranslation('pokedex.ui.actions.help', 'Aide') }
    ];
    
    controls.forEach(({ id, text, title }) => {
      const element = this.overlay.querySelector(`#${id}`);
      if (element) {
        if (text) {
          const textSpan = element.querySelector('span:last-child');
          if (textSpan) textSpan.textContent = text;
        }
        if (title) {
          element.title = title;
        }
      }
    });
  }
  
  updateSearchTexts() {
    const searchInput = this.overlay.querySelector('#search-input');
    if (searchInput) {
      searchInput.placeholder = this.getTranslation('pokedex.ui.search.placeholder', 'Nom ou numéro du Pokémon...');
    }
    
    const applyFiltersBtn = this.overlay.querySelector('#apply-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.textContent = this.getTranslation('pokedex.ui.search.apply_filters', 'Appliquer les filtres');
    }
    
    const clearFiltersBtn = this.overlay.querySelector('#clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.textContent = this.getTranslation('pokedex.ui.search.clear_filters', 'Effacer');
    }
  }
  
  updateStatsTexts() {
    const statsLabels = [
      { id: 'stats-seen', key: 'pokedex.ui.stats.pokemon_seen', fallback: 'Pokémon vus' },
      { id: 'stats-caught', key: 'pokedex.ui.stats.pokemon_caught', fallback: 'Pokémon capturés' },
      { id: 'stats-shiny', key: 'pokedex.ui.stats.shiny_count', fallback: 'Pokémon shiny' },
      { id: 'stats-completion', key: 'pokedex.ui.stats.completion_rate', fallback: 'Complété' }
    ];
    
    statsLabels.forEach(({ id, key, fallback }) => {
      const element = this.overlay.querySelector(`#${id}`);
      if (element) {
        const labelElement = element.nextElementSibling;
        if (labelElement && labelElement.classList.contains('stat-label')) {
          labelElement.textContent = this.getTranslation(key, fallback);
        }
      }
    });
  }
  
  updateFooterTexts() {
    const statusElement = this.overlay.querySelector('.system-status');
    if (statusElement) {
      const textNode = statusElement.lastChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = this.getTranslation('pokedex.ui.footer.system_connected', 'SYSTÈME CONNECTÉ');
      }
    }
  }
  
  getTranslation(key, fallback) {
    if (!this.translationsReady) {
      return fallback;
    }
    
    try {
      const translation = t(key);
      return (translation && !translation.includes('Manquant:') && translation !== key) ? translation : fallback;
    } catch (error) {
      console.warn(`⚠️ [PokedexUI] Erreur traduction ${key}:`, error);
      return fallback;
    }
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
      // ⚠️ NE PAS charger les données ici pour éviter la récursion
      // Elles seront chargées à l'ouverture via show()
    } else {
      console.warn('⚠️ [PokedexUI] DataManager non prêt après 5s');
    }
  }

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion
loadDefaultPokemonData() {
  // 🚨 PROTECTION ANTI-RÉCURSION
  if (this._isLoadingData) {
    console.warn('⚠️ [PokedexUI] Chargement déjà en cours, ignorer');
    return;
  }
  
  console.log('📊 [PokedexUI] Chargement données par défaut...');
  this._isLoadingData = true;
  
  try {
    // S'assurer que le DataManager est prêt
    if (!this.dataManager || !this.dataManager.isDataLoaded()) {
      console.warn('⚠️ [PokedexUI] DataManager non prêt pour loadDefaultPokemonData');
      
      // 🔧 DONNÉES MINIMALES PAR DÉFAUT SANS RÉCURSION
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
      
      this._isLoadingData = false;
      return;
    }
    
    // 🆕 APPLIQUER LA PAGINATION DÈS LE CHARGEMENT INITIAL
    const allEntries = this.dataManager.getAllPokemonEntries();
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    // ✅ PAGINER LES DONNÉES
    this.pokedexData = allEntries.slice(startIndex, endIndex);
    this.playerStats = this.dataManager.getPlayerStats();
    
    // 🆕 METTRE À JOUR LA PAGINATION IMMÉDIATEMENT
    this.updatePagination({
      total: allEntries.length,
      limit: this.itemsPerPage,
      offset: startIndex
    });
    
    console.log(`✅ [PokedexUI] ${this.pokedexData.length} Pokémon chargés (page ${this.currentPage + 1}/${Math.ceil(allEntries.length / this.itemsPerPage)})`);
    
    // ⚠️ NE PAS APPELER refreshCurrentView() ici
    // Le refresh sera fait par la méthode appelante si nécessaire
    
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
  }
}

  createPokedexInterface() {
    // Supprimer l'existant si présent
    const existing = document.querySelector('#pokedex-overlay');
    if (existing) {
      existing.remove();
    }

    // Créer le conteneur principal - style Pokédx classique
    const overlay = document.createElement('div');
    overlay.id = 'pokedex-overlay';
    overlay.className = 'pokedex-overlay hidden';

    overlay.innerHTML = `
      <div class="pokedex-container">
        <!-- Header style Game Boy -->
        <div class="pokedex-header">
          <div class="pokedx-top-section">
            <div class="pokedex-logo">
              <div class="logo-light red"></div>
              <div class="logo-content">
                <span class="logo-title">POKÉDEX</span>
                <span class="logo-subtitle">NATIONAL</span>
              </div>
              <div class="logo-lights">
                <div class="logo-light yellow"></div>
                <div class="logo-light green"></div>
              </div>
            </div>
            <div class="pokedex-controls">
              <button class="pokedex-close-btn" title="Fermer">×</button>
            </div>
          </div>
          
          <!-- Navigation tabs -->
          <div class="pokedex-tabs">
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

        <div class="pokedex-content">
          <!-- Vue National (liste) -->
          <div class="pokedex-view national-view active">
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
          <div class="pokedex-view search-view">
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
          <div class="pokedex-view favorites-view">
            <div class="favorites-header">
              <h3>Pokémon Favoris</h3>
              <p class="favorites-subtitle">Vos Pokémon marqués comme favoris</p>
            </div>
            <div class="favorites-grid" id="favorites-grid">
              <!-- Favoris générés dynamiquement -->
            </div>
          </div>

          <!-- Vue Statistiques -->
          <div class="pokedex-view stats-view">
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
        <div class="pokedex-footer">
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
    
    // ⏰ SI MISE À JOUR EN ATTENTE, L'APPLIQUER MAINTENANT
    if (this.pendingLanguageUpdate) {
      setTimeout(() => {
        this.updateLanguage();
      }, 100);
    }
  }

  addStyles() {
    if (document.querySelector('#pokedex-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'pokedex-ui-styles';
    style.textContent = POKEDEX_UI_STYLES;
    
    document.head.appendChild(style);
    console.log('🎨 [PokedexUI] Styles modulaires appliqués');
  }

  // === ⚙️ MÉTHODES DE CONTRÔLE ===

  forceClose() {
    console.log('🔒 [PokedexUI] Fermeture forcée...');
    
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
    
    console.log('✅ [PokedexUI] Fermé complètement');
  }

  show() {
    if (this.isVisible) {
      console.log('ℹ️ [PokedexUI] Déjà ouvert');
      return;
    }
    
    console.log('📱 [PokedexUI] Ouverture Pokédx...');
    
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
    
    console.log('✅ [PokedexUI] Pokédx ouvert');
  }

  // 🛠️ NOUVELLE MÉTHODE - Chargement sécurisé SANS appels serveur
safeLoadAndRefresh() {
  console.log('🔒 [PokedexUI] Chargement et refresh sécurisés...');
  
  // Charger les données avec pagination
  this.loadDefaultPokemonData();
  
  // 🆕 FORCER LE RENDU IMMÉDIAT AVEC LA PAGINATION
  setTimeout(() => {
    if (this.isVisible && this.pokedexData) {
      console.log(`🎨 [PokedexUI] Rendu forcé avec ${this.pokedexData.length} entrées (page ${this.currentPage + 1})`);
      this.renderNationalView();
      this.updatePaginationButtons(); // 🆕 S'assurer que les boutons sont à jour
    }
  }, 100);
  
  // Puis faire le refresh manuellement
  this.safeRefresh();
}

  // 🛠️ MÉTHODE CORRIGÉE - Protection contre la récursion
  safeRefresh() {
    if (this._isRefreshing) {
      console.warn('⚠️ [PokedexUI] Refresh déjà en cours, ignorer');
      return;
    }
    
    this._isRefreshing = true;
    
    try {
      // Mettre à jour l'affichage des stats d'abord
      this.updateProgressSummary();
      
      // Puis rafraîchir la vue actuelle
      this.refreshCurrentView();
      
    } catch (error) {
      console.error('❌ [PokedexUI] Erreur lors du refresh:', error);
    } finally {
      this._isRefreshing = false;
    }
  }

  hide() {
    if (!this.isVisible) {
      console.log('ℹ️ [PokedexUI] Déjà fermé');
      return;
    }
    
    console.log('❌ [PokedexUI] Fermeture Pokédx...');
    
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
    
    console.log('✅ [PokedexUI] Pokédx fermé');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // === 🎛️ GESTION DES ÉVÉNEMENTS ===

  ensureEventListeners() {
    if (this._eventsAttached) {
      console.log('ℹ️ [PokedexUI] Événements déjà attachés');
      return;
    }
    
    console.log('🔧 [PokedexUI] Attachement des événements...');
    this.setupEventListeners();
    this._eventsAttached = true;
  }

  setupEventListeners() {
    if (!this.overlay) return;

    // === FERMETURE ===
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));

    const closeBtn = this.overlay.querySelector('.pokedex-close-btn');
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
      syncBtn.onclick = () => this.syncPokedex();
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

    console.log('✅ [PokedexUI] Événements attachés');
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

  // === 📡 COMMUNICATION SERVEUR ===

setupServerListeners() {
  if (!this.gameRoom) return;

  // === RÉCEPTION DES DONNÉES POKÉDX ===
  // ✅ CORRIGÉ: Enlever ":response" car le serveur envoie juste "pokedex:get"
  this.gameRoom.onMessage("pokedex:get", (response) => {
    this.handlePokedexData(response);
  });

  // Réception d'une entrée détaillée
  this.gameRoom.onMessage("pokedex:entry", (response) => {
    this.handlePokemonDetails(response);
  });

  // Réception des statistiques
  this.gameRoom.onMessage("pokedex:stats", (response) => {
    this.handleStatsData(response);
  });

  // Réception mark_seen
  this.gameRoom.onMessage("pokedx:mark_seen", (response) => {
    console.log('✅ [PokedexUI] Mark seen confirmé:', response);
    if (response.success && this.isVisible) {
      this.safeReloadData();
    }
  });

  // Réception mark_caught  
  this.gameRoom.onMessage("pokedex:mark_caught", (response) => {
    console.log('✅ [PokedexUI] Mark caught confirmé:', response);
    if (response.success && this.isVisible) {
      this.safeReloadData();
    }
  });

  // Réception toggle favorite
  this.gameRoom.onMessage("pokedex:toggle_favorite", (response) => {
    this.handleFavoriteUpdate(response);
  });

  // Réception quick actions
  this.gameRoom.onMessage("pokedex:quick_action", (response) => {
    console.log('⚡ [PokedexUI] Action rapide confirmée:', response);
    if (response.success && response.data.action === 'force_sync' && this.isVisible) {
      this.safeReloadData();
    }
  });

  // === NOTIFICATIONS/BROADCASTS (restent identiques) ===
  this.gameRoom.onMessage("pokedex:discovery", (data) => {
    this.handleDiscoveryNotification(data);
  });

  this.gameRoom.onMessage("pokedex:capture", (data) => {
    this.handleCaptureNotification(data);
  });

  this.gameRoom.onMessage("pokedex:streak_record", (data) => {
    console.log('🔥 [PokedexUI] Nouveau record streak:', data);
  });

  console.log('📡 [PokedexUI] Listeners serveur FINAL corrigés');
}

  // 🚫 MÉTHODE SUPPRIMÉE - Plus d'appels serveur inutiles
  // requestPokedexData() est maintenant supprimée complètement

  requestPokemonDetails(pokemonId) {
    if (this.gameRoom) {
      console.log(`📡 [PokedexUI] Demande détails #${pokemonId}...`);
      this.gameRoom.send("pokedex:entry", {
        pokemonId: pokemonId,
        includeEvolutions: true,
        includeRecommendations: true
      });
    }
  }

  requestStats() {
    if (this.gameRoom) {
      console.log('📡 [PokedexUI] Demande statistiques...');
      this.gameRoom.send("pokedex:stats");
    }
  }

  // === 📊 GESTION DES DONNÉES AVEC DATAMANAGER ===

  handlePokedexData(response) {
    if (!response.success) {
      console.error('❌ [PokedexUI] Erreur données Pokédx:', response.error);
      this.showError(this.getTranslation('pokedex.errors.load_failed', 'Impossible de charger les données du Pokédx'));
      return;
    }

    console.log('📊 [PokedexUI] Données Pokédx reçues du serveur');
    console.log('📊 [DEBUG] availablePokemon:', response.data?.availablePokemon?.length);
    console.log('📊 [DEBUG] entries type:', Array.isArray(response.data?.entries) ? 'ARRAY' : 'OBJECT');
    console.log('📊 [DEBUG] entries count:', Array.isArray(response.data?.entries) ? response.data.entries.length : Object.keys(response.data?.entries || {}).length);
    console.log('📊 [DEBUG] summary:', response.data?.summary);
    
    // Utiliser SEULEMENT setServerData (pas de double import)
    if (response.data) {
      // Configurer le DataManager avec les données serveur
      this.dataManager.setServerData(response.data);
      
      // 🛠️ RECHARGER LES DONNÉES LOCALES DE MANIÈRE SÉCURISÉE
      this.safeReloadData();
    }
    
    // Mettre à jour l'affichage
    this.updateProgressSummary();
    this.updateLastSyncTime();
    
    console.log('✅ [PokedexUI] Données traitées avec DataManager');
  }

  // 🛠️ NOUVELLE MÉTHODE - Rechargement sécurisé SANS appels serveur
  safeReloadData() {
    if (this._isLoadingData) {
      console.warn('⚠️ [PokedexUI] Chargement déjà en cours');
      return;
    }
    
    console.log('🔄 [PokedexUI] Rechargement sécurisé des données...');
    
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
  loadLocalPokedexData(filters = {}) {
    console.log('💾 [PokedexUI] Chargement données locales...');
    
    // S'assurer que le DataManager est prêt
    if (!this.dataManager || !this.dataManager.isDataLoaded()) {
      console.warn('⚠️ [PokedexUI] DataManager non prêt pour loadLocalPokedexData');
      
      // 🛠️ RETOURNER DES DONNÉES VIDES AU LIEU D'APPELER loadDefaultPokemonData()
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
        
    // Pagination locale
    const allEntries = this.dataManager.getAllPokemonEntries(filters);
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    this.pokedexData = allEntries.slice(startIndex, endIndex);
    this.playerStats = this.dataManager.getPlayerStats();
    
    // Mettre à jour l'affichage
    this.updateProgressSummary();
    this.updatePagination({
      total: allEntries.length,
      limit: this.itemsPerPage,
      offset: startIndex
    });
    
    console.log(`✅ [PokedexUI] ${this.pokedexData.length} entrées chargées (page ${this.currentPage + 1})`);
    
    // 🛠️ NE PAS APPELER refreshCurrentView() ici automatiquement
  }

  handlePokemonDetails(response) {
    if (!response.success) {
      console.error('❌ [PokedexUI] Erreur détails Pokémon:', response.error);
      return;
    }

    console.log('📋 [PokedexUI] Détails Pokémon reçus:', response.data);
    
    this.showPokemonDetails(response.data);
  }

  handleStatsData(response) {
    if (!response.success) {
      console.error('❌ [PokedexUI] Erreur statistiques:', response.error);
      return;
    }

    console.log('📈 [PokedexUI] Statistiques reçues:', response.data);
    
    this.playerStats = { ...this.playerStats, ...response.data };
    this.updateStatsView();
  }

  // 🛠️ MÉTHODES NOTIFICATIONS CORRIGÉES - Sans appels serveur
  handleDiscoveryNotification(data) {
    console.log('✨ [PokedexUI] Nouvelle découverte:', data);
    
    // Animation et son
    this.playDiscoverySound();
    
    // 🚫 SUPPRIMÉ: this.requestPokedexData(); 
    // ✅ Les données seront mises à jour automatiquement par le système
    if (this.isVisible) {
      setTimeout(() => {
        this.safeReloadData();
      }, 1000);
    }
  }

  handleCaptureNotification(data) {
    console.log('🎯 [PokedexUI] Nouvelle capture:', data);
    
    // Animation et son
    this.playCaptureSound();
    
    // 🚫 SUPPRIMÉ: this.requestPokedexData(); 
    // ✅ Les données seront mises à jour automatiquement par le système
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
      console.warn('⚠️ [PokedexUI] RefreshCurrentView déjà en cours');
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

    // 🛠️ NE PAS recharger les données ici
    // Utiliser seulement ce qui est déjà dans this.pokedexData

    // Afficher état de chargement si pas encore de données
    if (!this.pokedexData || this.pokedexData.length === 0) {
      grid.innerHTML = `
        <div class="loading-state">
          <div class="loading-icon">⏳</div>
          <p>${this.getTranslation('pokedex.ui.loading.message', 'Chargement du Pokédx National...')}</p>
        </div>
      `;
      return;
    }

    console.log(`🎨 [PokedexUI] Rendu ${this.pokedexData.length} entrées Pokémon`);

    this.pokedexData.forEach((entry, index) => {
      const entryElement = this.createPokemonEntry(entry, index);
      grid.appendChild(entryElement);
    });
  }

  createPokemonEntry(entry, index) {
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

  getPokemonSpriteForEntry(entry) {
    const paddedId = entry.pokemonId.toString().padStart(3, '0');
    
    if (entry.caught) {
      // Pokémon capturé : sprite complet en couleur
      return `<img src="/assets/pokemon/${paddedId}/icons.png"
                    alt="${entry.displayName}" 
                    onerror="this.outerHTML='🎮'" 
                    class="pokemon-sprite captured ${entry.shiny ? 'shiny' : ''}"
                    style="width: 64px; height: 64px; object-fit: none; object-position: 0 0;">`;
    } else if (entry.seen) {
      // Pokémon vu : silhouette noire
      return `<img src="/assets/pokemon/${paddedId}/icons.png"
                    alt="${this.getTranslation('pokedex.ui.status.seen', 'Pokémon vu')}" 
                    onerror="this.outerHTML='👤'" 
                    class="pokemon-sprite silhouette"
                    style="width: 64px; height: 64px; object-fit: none; object-position: 0 0;">`;
    } else {
      // Pokémon inconnu : point d'interrogation
      return `<div class="pokemon-sprite unknown">❓</div>`;
    }
  }
  
  getStatusBadge(entry) {
    switch (entry.displayStatus) {
      case 'caught':
        return `<span class="status-badge caught">${this.getTranslation('pokedex.ui.status.caught', 'Capturé')}</span>`;
      case 'seen':
        return `<span class="status-badge seen">${this.getTranslation('pokedex.ui.status.seen', 'Vu')}</span>`;
      default:
        return `<span class="status-badge unknown">${this.getTranslation('pokedex.ui.status.unknown', '???')}</span>`;
    }
  }

  getTypeBadges(entry) {
    // Toujours afficher les types pour les Pokémon vus ou capturés
    if (!entry.seen && !entry.caught) return '';
    
    if (!entry.pokemonData || !entry.pokemonData.types) return '';
    
    const typeBadges = entry.pokemonData.types.map(type => 
      `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    return `<div class="entry-types">${typeBadges}</div>`;
  }

  /**
   * Génère le sprite pour les détails (utilise les bons chemins)
   */
  getPokemonSpriteForDetails(pokemonId, caught, isShiny = false) {
    const paddedId = pokemonId.toString().padStart(3, '0');
    
    if (caught) {
      return `<img src="/assets/pokemon/${paddedId}/icons.png"
                    alt="Pokémon #${paddedId}" 
                    onerror="this.outerHTML='🎮'" 
                    class="pokemon-sprite captured ${isShiny ? 'shiny' : ''}"
                    style="width: 128px; height: 128px; object-fit: none; object-position: 0 0;">`;
    } else {
      return `<img src="/assets/pokemon/${paddedId}/icons.png"
                    alt="${this.getTranslation('pokedex.ui.status.seen', 'Pokémon vu')}" 
                    onerror="this.outerHTML='👤'" 
                    class="pokemon-sprite silhouette"
                    style="width: 128px; height: 128px; object-fit: none; object-position: 0 0;">`;
    }
  }

  // === 🔍 RECHERCHE ET FILTRES AVEC DATAMANAGER ===

  handleSearch() {
    const searchInput = this.overlay.querySelector('#search-input');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    console.log('🔍 [PokedexUI] Recherche:', query);

    // Utiliser le DataManager pour la recherche
    const filters = {
      nameQuery: query,
      ...this.searchFilters,
      limit: this.itemsPerPage,
      offset: 0
    };

    this.currentPage = 0;
    this.loadLocalPokedexData(filters);
    
    // 🛠️ APPEL MANUEL DU REFRESH
    if (this.currentView === 'search') {
      this.renderSearchResults();
    }
  }

  applySearchFilters() {
    const filters = this.collectSearchFilters();
    console.log('⚙️ [PokedexUI] Application filtres:', filters);

    this.searchFilters = filters;
    this.currentPage = 0;
    this.loadLocalPokedexData(filters);
    
    // 🛠️ APPEL MANUEL DU REFRESH
    if (this.currentView === 'search') {
      this.renderSearchResults();
    }
  }

  collectSearchFilters() {
    const filters = {};

    // Types sélectionnés
    const selectedTypes = Array.from(this.overlay.querySelectorAll('.type-filter.selected'))
      .map(el => el.dataset.type);
    if (selectedTypes.length > 0) {
      filters.types = selectedTypes;
    }

    // Statuts
    const seenCheckbox = this.overlay.querySelector('input[name="seen"]');
    const caughtCheckbox = this.overlay.querySelector('input[name="caught"]');
    const shinyCheckbox = this.overlay.querySelector('input[name="shiny"]');

    if (seenCheckbox?.checked) filters.seen = true;
    if (caughtCheckbox?.checked) filters.caught = true;
    if (shinyCheckbox?.checked) filters.shiny = true;

    // Région (pour l'instant juste Kanto)
    const regionSelect = this.overlay.querySelector('#region-select');
    if (regionSelect?.value) {
      filters.regions = [regionSelect.value];
    }

    return filters;
  }

  clearSearchFilters() {
    console.log('🧹 [PokedexUI] Effacement filtres');

    // Reset UI
    this.overlay.querySelectorAll('.type-filter.selected').forEach(el => {
      el.classList.remove('selected');
    });

    this.overlay.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });

    const regionSelect = this.overlay.querySelector('#region-select');
    if (regionSelect) regionSelect.value = '';

    const searchInput = this.overlay.querySelector('#search-input');
    if (searchInput) searchInput.value = '';

    // Reset données
    this.searchFilters = {};
    this.currentPage = 0;
    this.loadLocalPokedexData();
    
    // 🛠️ APPEL MANUEL DU REFRESH
    if (this.currentView === 'search') {
      this.renderSearchResults();
    }
  }

  // === ⭐ GESTION DES FAVORIS AVEC DATAMANAGER ===

  togglePokemonFavorite(pokemonId) {
    console.log(`⭐ [PokedexUI] Toggle favori #${pokemonId}`);
    
    // Utiliser le DataManager pour toggle localement
    const newStatus = this.dataManager.toggleFavorite(pokemonId);
    
    // Envoyer au serveur si connecté
    if (this.gameRoom) {
      this.gameRoom.send("pokedex:toggle_favorite", { pokemonId });
    }
    
    // Mettre à jour l'affichage local immédiatement
    this.updatePokemonFavoriteStatus(pokemonId, newStatus);
    
    return newStatus;
  }

  updatePokemonFavoriteStatus(pokemonId, favorited) {
    // Mettre à jour dans la liste
    const entryElements = this.overlay.querySelectorAll(`[data-pokemon-id="${pokemonId}"]`);
    entryElements.forEach(el => {
      const star = el.querySelector('.favorite-star');
      if (favorited && !star) {
        const header = el.querySelector('.entry-header');
        if (header) {
          header.insertAdjacentHTML('beforeend', '<span class="favorite-star">⭐</span>');
        }
      } else if (!favorited && star) {
        star.remove();
      }
    });

    // Mettre à jour dans le panneau de détails
    const favoriteBtn = this.overlay.querySelector('#toggle-favorite');
    if (favoriteBtn) {
      favoriteBtn.textContent = favorited ? '⭐' : '☆';
      favoriteBtn.classList.toggle('favorited', favorited);
      favoriteBtn.title = favorited ? 
        this.getTranslation('pokedex.ui.details.remove_favorite', 'Retirer des favoris') : 
        this.getTranslation('pokedex.ui.details.add_favorite', 'Ajouter aux favoris');
    }

    console.log(`⭐ [PokedexUI] Favori #${pokemonId} mis à jour: ${favorited}`);
  }

  // === 📋 DÉTAILS POKÉMON ===

  selectPokemon(entry) {
    console.log('📋 [PokedexUI] Sélection Pokémon:', entry);
    
    this.selectedPokemon = entry;
    this.requestPokemonDetails(entry.pokemonId);
  }

  showPokemonDetails(pokemonData) {
    const detailsPanel = this.overlay.querySelector('#details-panel');
    const detailsContent = this.overlay.querySelector('#details-content');
    
    if (!detailsPanel || !detailsContent) return;

    const { entry, pokemonData: baseData, evolutionChain, relatedEntries } = pokemonData;

    detailsContent.innerHTML = `
      <div class="pokemon-header">
        <div class="pokemon-main-info">
          <div class="pokemon-sprite-large">
            ${this.getPokemonSpriteForDetails(entry.pokemonId, entry.caught, entry.shiny)}
          </div>
          <div class="pokemon-identity">
            <h2 class="pokemon-name">${baseData?.name || this.getTranslation('pokedex.ui.unknown_pokemon', 'Pokémon Inconnu')}</h2>
            <p class="pokemon-number">#${entry.pokemonId.toString().padStart(3, '0')}</p>
            <div class="pokemon-types">
              ${(baseData?.types || []).map(type => 
                `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
              ).join('')}
            </div>
          </div>
        </div>
        
        <div class="pokemon-actions">
          <button class="detail-action-btn ${entry.favorited ? 'favorited' : ''}" 
                  id="toggle-favorite" 
                  title="${entry.favorited ? 
                    this.getTranslation('pokedex.ui.details.remove_favorite', 'Retirer des favoris') : 
                    this.getTranslation('pokedex.ui.details.add_favorite', 'Ajouter aux favoris')}">
            ${entry.favorited ? '⭐' : '☆'}
          </button>
        </div>
      </div>
      
      <div class="pokemon-stats-summary">
        <div class="stat-item">
          <span class="stat-label">${this.getTranslation('pokedex.ui.details.first_seen', 'Première vue')}</span>
          <span class="stat-value">${entry.firstSeen ? new Date(entry.firstSeen).toLocaleDateString() : '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${this.getTranslation('pokedex.ui.details.first_caught', 'Première capture')}</span>
          <span class="stat-value">${entry.firstCaught ? new Date(entry.firstCaught).toLocaleDateString() : '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${this.getTranslation('pokedex.ui.details.encounters', 'Rencontres')}</span>
          <span class="stat-value">${entry.timesEncountered || 0}</span>
        </div>
      </div>
      
      ${baseData?.description ? `
        <div class="pokemon-description">
          <h4>${this.getTranslation('pokedex.ui.details.description', 'Description')}</h4>
          <p>${baseData.description}</p>
        </div>
      ` : ''}
      
      ${evolutionChain && evolutionChain.length > 0 ? `
        <div class="evolution-chain">
          <h4>${this.getTranslation('pokedex.ui.details.evolution', 'Évolution')}</h4>
          <div class="evolution-list">
            ${evolutionChain.map(evo => `
              <div class="evolution-item">
                <div class="evo-sprite">${this.getPokemonSpriteForDetails(evo.pokemonId, true, evo.shiny || false)}</div>
                <div class="evo-name">${evo.name}</div>
                ${evo.level ? `<div class="evo-condition">Niv. ${evo.level}</div>` : ''}
              </div>
            `).join('<div class="evolution-arrow">→</div>')}
          </div>
        </div>
      ` : ''}
    `;

    // Événement pour le toggle favori
    const favoriteBtn = detailsContent.querySelector('#toggle-favorite');
    if (favoriteBtn) {
      favoriteBtn.onclick = () => this.togglePokemonFavorite(entry.pokemonId);
    }

    // Afficher le panneau
    detailsPanel.classList.add('open');
  }

  closeDetailsPanel() {
    const detailsPanel = this.overlay.querySelector('#details-panel');
    if (detailsPanel) {
      detailsPanel.classList.remove('open');
    }
    this.selectedPokemon = null;
  }

  isDetailsPanelOpen() {
    const detailsPanel = this.overlay.querySelector('#details-panel');
    return detailsPanel?.classList.contains('open') || false;
  }

  // === 📊 VUE STATISTIQUES ===

  renderStatsView() {
    this.requestStats();
  }

  updateStatsView() {
    // Mettre à jour les cartes de stats principales
    const statsSeenEl = this.overlay.querySelector('#stats-seen');
    const statsCaughtEl = this.overlay.querySelector('#stats-caught');
    const statsShinyEl = this.overlay.querySelector('#stats-shiny');
    const statsCompletionEl = this.overlay.querySelector('#stats-completion');

    if (statsSeenEl) statsSeenEl.textContent = this.playerStats.totalSeen || 0;
    if (statsCaughtEl) statsCaughtEl.textContent = this.playerStats.totalCaught || 0;
    if (statsShinyEl) statsShinyEl.textContent = this.playerStats.totalShiny || 0;
    if (statsCompletionEl) statsCompletionEl.textContent = `${Math.round(this.playerStats.caughtPercentage || 0)}%`;
  }

  renderSearchResults() {
    const searchResults = this.overlay.querySelector('#search-results');
    if (!searchResults) return;

    // Utiliser la même logique que la vue nationale mais dans la zone de résultats
    searchResults.innerHTML = '';

    if (!this.pokedexData || this.pokedexData.length === 0) {
      searchResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>${this.getTranslation('pokedex.ui.search.no_results', 'Aucun résultat trouvé')}</p>
          <p class="empty-subtitle">${this.getTranslation('pokedex.ui.search.try_other_filters', 'Essayez d\'autres filtres ou termes de recherche')}</p>
        </div>
      `;
      return;
    }

    // Créer une grille comme pour la vue nationale
    const grid = document.createElement('div');
    grid.className = 'pokemon-grid';

    this.pokedexData.forEach((entry, index) => {
      const entryElement = this.createPokemonEntry(entry, index);
      grid.appendChild(entryElement);
    });

    searchResults.appendChild(grid);
  }

  renderFavoritesView() {
    const favoritesGrid = this.overlay.querySelector('#favorites-grid');
    if (!favoritesGrid) return;

    favoritesGrid.innerHTML = '';

    // Récupérer les favoris du DataManager
    const favoriteEntries = this.dataManager.getFavoritesPokemon();

    if (favoriteEntries.length === 0) {
      favoritesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⭐</div>
          <p>${this.getTranslation('pokedex.ui.favorites.no_favorites', 'Aucun Pokémon favori')}</p>
          <p class="empty-subtitle">${this.getTranslation('pokedex.ui.favorites.add_hint', 'Cliquez sur l\'étoile des Pokémon pour les marquer comme favoris')}</p>
        </div>
      `;
      return;
    }

    favoriteEntries.forEach((entry, index) => {
      const entryElement = this.createPokemonEntry(entry, index);
      favoritesGrid.appendChild(entryElement);
    });
  }

  // === 📄 NAVIGATION ENTRE VUES ===

  switchToView(viewName) {
    console.log(`🔄 [PokedexUI] Changement de vue: ${viewName}`);

    // Mettre à jour les tabs
    this.overlay.querySelectorAll('.tab-button').forEach(tab => {
      tab.classList.remove('active');
    });

    const activeTab = this.overlay.querySelector(`[data-view="${viewName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // Mettre à jour les vues
    this.overlay.querySelectorAll('.pokedex-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = this.overlay.querySelector(`.${viewName}-view`);
    if (activeView) {
      activeView.classList.add('active');
    }

    this.currentView = viewName;
    
    // 🛠️ APPEL MANUEL ET SÉCURISÉ DU REFRESH
    if (!this._isRefreshing) {
      this.refreshCurrentView();
    }
  }

  // === 📄 PAGINATION ===

  changePage(direction) {
    const newPage = this.currentPage + direction;
    
    if (newPage < 0) return;
    
    // Calculer le nombre total de pages
    const totalEntries = this.dataManager ? this.dataManager.getAllPokemonEntries().length : 151;
    const totalPages = Math.ceil(totalEntries / this.itemsPerPage);
    
    if (newPage >= totalPages) return;
    
    this.currentPage = newPage;
    this.loadLocalPokedexData(this.searchFilters);
    
    // 🛠️ APPEL MANUEL DU REFRESH
    if (this.currentView === 'national') {
      this.renderNationalView();
    }
    
    // Mettre à jour les boutons de pagination
    this.updatePaginationButtons();
  }

  updatePagination(paginationData) {
    const { total, limit, offset } = paginationData;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const currentPageEl = this.overlay.querySelector('#current-page');
    const totalPagesEl = this.overlay.querySelector('#total-pages');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;

    this.updatePaginationButtons();
  }

  updatePaginationButtons() {
    const prevBtn = this.overlay.querySelector('#prev-page');
    const nextBtn = this.overlay.querySelector('#next-page');
    
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 0;
      prevBtn.textContent = this.getTranslation('pokedex.ui.pagination.previous', '‹ Précédent');
    }
    
    if (nextBtn) {
      const totalEntries = this.dataManager ? this.dataManager.getAllPokemonEntries().length : 151;
      const totalPages = Math.ceil(totalEntries / this.itemsPerPage);
      nextBtn.disabled = this.currentPage >= totalPages - 1;
      nextBtn.textContent = this.getTranslation('pokedex.ui.pagination.next', 'Suivant ›');
    }
  }

  // === 🔄 ACTIONS SYSTÈME ===

  debugCurrentData() {
    console.log('🐛 [PokedexUI] Debug données actuelles:');
    console.log('- DataManager loaded:', this.dataManager?.isDataLoaded());
    console.log('- Available Pokemon:', this.dataManager?.availablePokemonIds?.length);
    console.log('- Player entries:', this.dataManager?.playerEntries?.size);
    console.log('- Current view data:', this.pokedexData?.length);
    console.log('- Is loading data:', this._isLoadingData);
    console.log('- Is refreshing:', this._isRefreshing);
    console.log('- Translations ready:', this.translationsReady);
    
    if (this.dataManager) {
      this.dataManager.debugPlayerEntries();
    }
  }
  
  // 🛠️ MÉTHODE SYNC CORRIGÉE - Sans appel serveur automatique
  syncPokedex() {
    console.log('🔄 [PokedexUI] Synchronisation Pokédx...');
    
    if (this.gameRoom) {
      this.gameRoom.send("pokedex:quick_action", { action: "force_sync" });
    }
    
    // Animation de sync
    const syncBtn = this.overlay.querySelector('#sync-btn');
    if (syncBtn) {
      syncBtn.classList.add('syncing');
      setTimeout(() => {
        syncBtn.classList.remove('syncing');
        this.updateLastSyncTime();
      }, 2000);
    }
    
    // 🚫 SUPPRIMÉ: this.requestPokedexData(); 
    // ✅ Les données viendront automatiquement via le système
  }

  updateLastSyncTime() {
    const lastSyncEl = this.overlay.querySelector('#last-sync-time');
    if (lastSyncEl) {
      const now = new Date();
      lastSyncEl.textContent = now.toLocaleTimeString();
    }
  }

  showSettings() {
    console.log('⚙️ [PokedexUI] Ouverture paramètres...');
    // TODO: Implémenter interface des paramètres
  }

  showHelp() {
    console.log('❓ [PokedexUI] Ouverture aide...');
    // TODO: Implémenter interface d'aide
  }

  showSortOptions() {
    console.log('⇅ [PokedexUI] Options de tri...');
    // TODO: Implémenter interface de tri
  }

  showFilterOptions() {
    console.log('⚙️ [PokedexUI] Filtres avancés...');
    // TODO: Implémenter interface de filtres avancés
  }

  // === 💬 MESSAGES ET SONS ===

  showError(message) {
    console.error('❌ [PokedexUI] Erreur:', message);
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'error', { duration: 4000 });
    }
  }

  showUnknownPokemonMessage() {
    const message = this.getTranslation('pokedex.ui.messages.unknown_pokemon', 'Ce Pokémon n\'a pas encore été découvert');
    console.log('❓ [PokedexUI] Pokémon inconnu sélectionné');
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'info', { duration: 2000 });
    }
  }

  playOpenSound() {
    try {
      if (window.audioManager?.playSound) {
        window.audioManager.playSound('pokedx_open', { volume: 0.3 });
      }
    } catch (error) {
      // Pas grave si le son ne fonctionne pas
    }
  }

  playDiscoverySound() {
    try {
      if (window.audioManager?.playSound) {
        window.audioManager.playSound('pokedx_discovery', { volume: 0.5 });
      }
    } catch (error) {
      // Pas grave
    }
  }

  playCaptureSound() {
    try {
      if (window.audioManager?.playSound) {
        window.audioManager.playSound('pokedx_capture', { volume: 0.4 });
      }
    } catch (error) {
      // Pas grave
    }
  }

  // === 🛠️ UTILITAIRES ===

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // === 🎯 API PUBLIQUE ===

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

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !this.isVisible && !questDialogOpen && !chatOpen && !starterHudOpen;
  }

  // === 🌐 MÉTHODES POUR TRADUCTIONS ===
  
  /**
   * Méthode pour injection tardive de l'optionsManager
   */
  setOptionsManager(optionsManager) {
    console.log('🌐 [PokedexUI] Injection tardive optionsManager');
    
    this.optionsManager = optionsManager;
    
    // Nettoyer ancien listener si existe
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    // Setup nouveau listener
    this.setupLanguageSupportWithTiming();
  }
  
  /**
   * Forcer mise à jour langue (API publique)
   */
  forceLanguageUpdate() {
    console.log('🔄 [PokedexUI] Force mise à jour langue...');
    this.translationsReady = true; // Forcer le statut
    this.updateLanguage();
  }
  
  /**
   * Réinitialiser état traductions
   */
  resetTranslationsState() {
    console.log('🔄 [PokedexUI] Reset état traductions...');
    this.translationsReady = false;
    this.pendingLanguageUpdate = false;
    this.checkTranslationsReady();
  }

  // === 🧹 NETTOYAGE ===

  destroy() {
    console.log('🧹 [PokedexUI] Destruction...');
    
    // ✅ NETTOYER LISTENER LANGUE
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
      console.log('🌐 [PokedexUI] Listener langue nettoyé');
    }
    
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
    this.pokedexData = {};
    this._eventsAttached = false;
    this._isLoadingData = false;
    this._isRefreshing = false;
    this.optionsManager = null;
    this.translationsReady = false;
    this.pendingLanguageUpdate = false;
    
    console.log('✅ [PokedexUI] Détruit avec nettoyage traductions complet');
  }
}
