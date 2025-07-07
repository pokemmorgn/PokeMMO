// client/src/components/TeamUIIntegration.js - Intégration TeamUI avec UIManager
// Configuration et enregistrement du module TeamUI dans le système UIManager

import { TeamUI } from './TeamUI.js';
import { TeamIcon } from './TeamIcon.js';

export class TeamUIIntegration {
  constructor(uiManager, gameRoom) {
    this.uiManager = uiManager;
    this.gameRoom = gameRoom;
    this.teamUI = null;
    this.teamIcon = null;
    this.initialized = false;
    
    console.log('🔧 TeamUI Integration initialized');
  }

  /**
   * Enregistrer le module TeamUI dans l'UIManager
   */
  async register() {
    try {
      // ===== 🎯 ENREGISTREMENT DU MODULE TEAM UI =====
      // ===== CORRECTION SYNTAXE TeamUIIntegration.js =====

// ✅ ÉTAPE 1 : Corriger la méthode waitForInitialization (ligne ~69)
// REMPLACER :
// async waitForInitialization(teamUIInstance = null) {

// PAR :
async waitForInitialization(teamUIInstance) {
  const instance = teamUIInstance || this.teamUI;
  
  if (instance && typeof instance.show === 'function' && typeof instance.hide === 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TeamUI initialization timeout'));
    }, 10000);

    let checkCount = 0;
    const maxChecks = 100;
    
    const checkInitialization = () => {
      checkCount++;
      
      if (instance && typeof instance.show === 'function' && typeof instance.hide === 'function') {
        clearTimeout(timeout);
        console.log(`✅ [UIManager] TeamUI initialisé après ${checkCount} vérifications`);
        resolve();
      } else if (checkCount >= maxChecks) {
        clearTimeout(timeout);
        reject(new Error(`TeamUI initialization failed after ${maxChecks} checks`));
      } else {
        setTimeout(checkInitialization, 100);
      }
    };

    checkInitialization();
  });
}

// ✅ ÉTAPE 2 : Corriger la factory function dans registerModule (ligne ~77)
// DANS LA MÉTHODE register(), REMPLACER le bloc teamUI par :

await this.uiManager.registerModule('teamUI', {
  factory: async () => {
    console.log('🏭 [UIManager] Creating TeamUI instance via factory...');
    
    const teamUIInstance = new TeamUI(this.gameRoom);
    
    await this.waitForInitialization(teamUIInstance);
    
    this.teamUI = teamUIInstance;
    
    console.log('✅ [UIManager] TeamUI instance created and initialized');
    return teamUIInstance;
  },

  dependencies: [],

  defaultState: {
    visible: false,
    enabled: true,
    initialized: false
  },

  priority: 50,

  layout: {
    type: 'overlay',
    position: 'center',
    anchor: 'center',
    offset: { x: 0, y: 0 },
    zIndex: 1000,
    order: 0,
    spacing: 0,
    responsive: true
  },

  responsive: {
    mobile: {
      enabled: true,
      layout: {
        type: 'overlay',
        position: 'fullscreen'
      },
      optimizations: {
        compactView: true,
        touchOptimized: true,
        reducedAnimations: true
      }
    },
    tablet: {
      enabled: true,
      layout: {
        type: 'overlay',
        position: 'center'
      },
      optimizations: {
        compactView: false,
        touchOptimized: true,
        reducedAnimations: false
      }
    },
    desktop: {
      enabled: true,
      layout: {
        type: 'overlay',
        position: 'center'
      },
      optimizations: {
        compactView: false,
        touchOptimized: false,
        reducedAnimations: false
      }
    }
  },

  groups: ['pokemon', 'management', 'overlay'],

  animations: {
    show: { 
      type: 'custom', 
      duration: 500, 
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      customFunction: (element) => this.animateShow(element)
    },
    hide: { 
      type: 'custom', 
      duration: 300, 
      easing: 'ease-in',
      customFunction: (element) => this.animateHide(element)
    },
    enable: { 
      type: 'pulse', 
      duration: 200 
    },
    disable: { 
      type: 'fade', 
      duration: 200 
    }
  },

  performance: {
    lazyLoad: false,
    preload: true,
    cache: true,
    debounce: 100,
    maxUpdatesPerSecond: 30
  },

  metadata: {
    name: 'Team Manager',
    description: 'Advanced Pokemon team management interface',
    version: '2.0.0',
    author: 'Pokemon Game Dev Team',
    category: 'Pokemon Management',
    tags: ['pokemon', 'team', 'management', 'battle']
  },

  accessibility: {
    keyboardNavigation: true,
    screenReader: true,
    highContrast: true,
    reducedMotion: true,
    ariaLabels: true
  },

  hooks: {
    beforeShow: () => this.beforeShow(),
    afterShow: () => this.afterShow(),
    beforeHide: () => this.beforeHide(),
    afterHide: () => this.afterHide(),
    onError: (error) => this.onError(error),
    onUpdate: (data) => this.onUpdate(data)
  },

  persistence: {
    enabled: true,
    key: 'teamUI_state',
    storage: 'sessionStorage', // Corrigé pour Claude.ai
    fields: ['currentView', 'selectedPokemon', 'preferences']
  },

  critical: false,

  debug: process.env.NODE_ENV === 'development'
});


      // ===== 🎯 ENREGISTREMENT DU MODULE TEAM ICON =====
      await this.uiManager.registerModule('teamIcon', {
  factory: async () => {
    console.log('🏭 [UIManager] Creating TeamIcon instance...');
    
    const teamIconInstance = new TeamIcon(this.teamUI);
    
    console.log('✅ [UIManager] TeamIcon instance created');
    return teamIconInstance;
  },

  dependencies: ['teamUI'],

  defaultState: {
    visible: true,
    enabled: true,
    initialized: false
  },

  priority: 60,

  layout: {
    type: 'icon',
    position: 'auto',
    anchor: 'bottom-right',
    offset: { x: -20, y: -20 },
    zIndex: 500,
    order: 2,
    spacing: 10,
    responsive: true
  },

  responsive: {
    mobile: {
      enabled: true,
      layout: {
        anchor: 'bottom-right',
        offset: { x: -15, y: -15 },
        order: 2,
        spacing: 8
      },
      optimizations: {
        smallerIcon: true,
        simplifiedTooltips: true
      }
    },
    tablet: {
      enabled: true,
      layout: {
        anchor: 'bottom-right',
        offset: { x: -18, y: -18 },
        order: 2,
        spacing: 9
      }
    },
    desktop: {
      enabled: true,
      layout: {
        anchor: 'bottom-right',
        offset: { x: -20, y: -20 },
        order: 2,
        spacing: 10
      }
    }
  },

  groups: ['pokemon', 'icons', 'ui'],

  animations: {
    show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
    hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
    enable: { type: 'pulse', duration: 150 },
    disable: { type: 'grayscale', duration: 200 }
  },

  metadata: {
    name: 'Team Icon',
    description: 'Quick access icon for team management',
    version: '2.0.0',
    category: 'UI Icons'
  },

  critical: false
});

  /**
   * Initialiser les modules TeamUI
   */
  async initialize() {
    if (!this.initialized) {
      throw new Error('TeamUI modules not registered. Call register() first.');
    }

    try {
      console.log('🚀 Initializing TeamUI modules...');

      // Initialiser les modules dans l'ordre des dépendances
      const teamUIInstance = await this.uiManager.initializeModule('teamUI');
      const teamIconInstance = await this.uiManager.initializeModule('teamIcon');

      // Vérifier que les instances sont correctes
      if (!teamUIInstance || !teamIconInstance) {
        throw new Error('Failed to initialize TeamUI instances');
      }

      // Configuration post-initialisation
      await this.setupPostInitialization();

      console.log('✅ TeamUI modules initialized successfully');
      return { teamUI: teamUIInstance, teamIcon: teamIconInstance };

    } catch (error) {
      console.error('❌ Failed to initialize TeamUI modules:', error);
      throw error;
    }
  }

  /**
   * Configuration post-initialisation
   */
  async setupPostInitialization() {
    // Connecter les événements entre TeamUI et TeamIcon
    this.connectUIEvents();

    // Configurer les raccourcis clavier
    this.setupGlobalKeyboards();

    // Configurer la synchronisation d'état
    this.setupStateSynchronization();

    // Configurer les notifications croisées
    this.setupCrossNotifications();
  }

  /**
   * Connecter les événements entre TeamUI et TeamIcon
   */
  connectUIEvents() {
    if (!this.teamUI || !this.teamIcon) return;

    // Événement: TeamIcon cliqué -> Ouvrir TeamUI
    this.teamIcon.onClick = () => {
      if (this.teamUI.canPlayerInteract()) {
        this.uiManager.showModule('teamUI');
      }
    };

    // Événement: TeamUI fermé -> Mettre à jour TeamIcon
    this.teamUI.onHide = () => {
      this.teamIcon.onTeamUIHidden();
    };

    // Événement: Données d'équipe mises à jour -> Synchroniser
    this.teamUI.onTeamDataUpdate = (data) => {
      this.teamIcon.updateTeamStats(data);
    };

    // Événement: Pokémon ajouté -> Animation sur l'icône
    this.teamUI.onPokemonAdded = (pokemon) => {
      this.teamIcon.onPokemonAdded(pokemon);
    };
  }

  /**
   * Configurer les raccourcis clavier globaux
   */
  setupGlobalKeyboards() {
    // Raccourci T pour ouvrir/fermer TeamUI
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          !e.ctrlKey && !e.altKey && !e.metaKey) {
        
        e.preventDefault();
        
        if (this.teamUI && this.teamUI.canPlayerInteract()) {
          this.uiManager.toggleModule('teamUI');
        }
      }
    });
  }

  /**
   * Configurer la synchronisation d'état
   */
  setupStateSynchronization() {
    // Synchroniser l'état TeamUI <-> UIManager
    if (this.teamUI) {
      // Écouter les changements d'état du TeamUI
      this.teamUI.addEventListener?.('stateChange', (event) => {
        this.uiManager.updateModuleState('teamUI', event.detail);
      });
    }

    // Écouter les changements d'état global de l'UIManager
    this.uiManager.on('gameStateChanged', (event) => {
      this.handleGameStateChange(event.detail);
    });
  }

  /**
   * Gérer les changements d'état du jeu
   */
  handleGameStateChange(stateData) {
    const { newState, previousState } = stateData;

    switch (newState) {
      case 'battle':
        // En combat, cacher TeamUI et désactiver TeamIcon
        this.uiManager.hideModule('teamUI');
        this.uiManager.disableModule('teamIcon');
        break;

      case 'exploration':
        // En exploration, réactiver les modules
        this.uiManager.enableModule('teamIcon');
        // TeamUI reste caché mais peut être ouvert
        break;

      case 'pokemonCenter':
        // Au centre Pokémon, activer spécialement
        this.uiManager.enableModule('teamUI');
        this.uiManager.enableModule('teamIcon');
        break;

      case 'dialogue':
        // En dialogue, désactiver temporairement
        this.uiManager.disableModule('teamUI');
        this.uiManager.disableModule('teamIcon');
        break;
    }
  }

  /**
   * Configurer les notifications croisées
   */
  setupCrossNotifications() {
    // Notifications du système vers TeamUI
    this.uiManager.on('notification', (event) => {
      const { type, message, data } = event.detail;
      
      if (type === 'pokemon' && this.teamUI) {
        this.teamUI.handleExternalNotification(message, data);
      }
    });
  }

  /**
   * Attendre l'initialisation complète du TeamUI
   */
  async waitForInitialization(teamUIInstance) {
  const instance = teamUIInstance || this.teamUI;
  
  if (instance && typeof instance.show === 'function' && typeof instance.hide === 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TeamUI initialization timeout'));
    }, 10000);

    let checkCount = 0;
    const maxChecks = 100;
    
    const checkInitialization = () => {
      checkCount++;
      
      if (instance && typeof instance.show === 'function' && typeof instance.hide === 'function') {
        clearTimeout(timeout);
        console.log(`✅ [UIManager] TeamUI initialisé après ${checkCount} vérifications`);
        resolve();
      } else if (checkCount >= maxChecks) {
        clearTimeout(timeout);
        reject(new Error(`TeamUI initialization failed after ${maxChecks} checks`));
      } else {
        setTimeout(checkInitialization, 100);
      }
    };

    checkInitialization();
  });
}

  // ===== HOOKS D'ÉVÉNEMENTS UIMANAGER =====

  async beforeShow() {
    console.log('🔄 TeamUI about to show');
    
    // Vérifications avant affichage
    if (!this.teamUI.canPlayerInteract()) {
      console.warn('⚠️ Cannot show TeamUI: Player interaction blocked');
      return false;
    }

    // Préparations avant affichage
    await this.teamUI.prepareForShow?.();
    return true;
  }

  afterShow() {
    console.log('✅ TeamUI shown successfully');
    
    // Actions post-affichage
    this.teamUI.requestTeamData();
    this.teamUI.setupPostShowOptimizations?.();
    
    // Notifier les autres modules
    this.uiManager.emit('teamUIShown');
  }

  async beforeHide() {
    console.log('🔄 TeamUI about to hide');
    
    // Sauvegarder l'état avant fermeture
    const state = this.teamUI.exportData();
    this.saveState(state);
    
    return true;
  }

  afterHide() {
    console.log('✅ TeamUI hidden successfully');
    
    // Nettoyage post-fermeture
    this.teamUI.cleanup?.();
    
    // Notifier les autres modules
    this.uiManager.emit('teamUIHidden');
  }

  onError(error) {
    console.error('❌ TeamUI Error:', error);
    
    // Gestion d'erreur avancée
    this.handleTeamUIError(error);
  }

  onUpdate(data) {
    console.log('🔄 TeamUI Update:', data);
    
    // Traitement des mises à jour
    this.processTeamUIUpdate(data);
  }

  // ===== ANIMATIONS PERSONNALISÉES =====

  async animateShow(element) {
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.transform = 'scale(0.8) translateY(50px)';
      element.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1) translateY(0)';
        
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, 500);
      });
    });
  }

  async animateHide(element) {
    return new Promise((resolve) => {
      element.style.transition = 'all 0.3s ease-in';
      element.style.opacity = '0';
      element.style.transform = 'scale(0.9) translateY(-30px)';
      
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, 300);
    });
  }

  // ===== GESTION D'ERREUR AVANCÉE =====

  handleTeamUIError(error) {
    console.error('❌ TeamUI Error Handler:', error);
    
    // Classer le type d'erreur
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'initialization':
        this.handleInitializationError(error);
        break;
      case 'rendering':
        this.handleRenderingError(error);
        break;
      case 'network':
        this.handleNetworkError(error);
        break;
      case 'data':
        this.handleDataError(error);
        break;
      default:
        this.handleGenericError(error);
    }
  }

  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('initialization') || message.includes('factory')) {
      return 'initialization';
    }
    if (message.includes('render') || message.includes('display')) {
      return 'rendering';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('data') || message.includes('team')) {
      return 'data';
    }
    
    return 'generic';
  }

  handleInitializationError(error) {
    console.error('🚨 TeamUI Initialization Error:', error);
    
    // Tentative de récupération
    this.attemptRecovery('initialization');
  }

  handleRenderingError(error) {
    console.error('🚨 TeamUI Rendering Error:', error);
    
    // Forcer un nouveau rendu
    setTimeout(() => {
      this.teamUI?.refreshTeamDisplay?.();
    }, 1000);
  }

  handleNetworkError(error) {
    console.error('🚨 TeamUI Network Error:', error);
    
    // Notifier l'utilisateur
    this.teamUI?.showNotification?.('Network error. Retrying...', 'warning');
    
    // Réessayer après délai
    setTimeout(() => {
      this.teamUI?.requestTeamData?.();
    }, 3000);
  }

  handleDataError(error) {
    console.error('🚨 TeamUI Data Error:', error);
    
    // Réinitialiser les données
    this.teamUI?.resetTeamData?.();
  }

  handleGenericError(error) {
    console.error('🚨 TeamUI Generic Error:', error);
    
    // Tentative de récupération générique
    this.attemptRecovery('generic');
  }

  attemptRecovery(errorType) {
    console.log(`🔄 Attempting recovery for ${errorType} error...`);
    
    // Stratégies de récupération selon le type
    switch (errorType) {
      case 'initialization':
        // Réinitialiser complètement
        setTimeout(() => {
          this.reinitializeTeamUI();
        }, 2000);
        break;
      case 'generic':
        // Récupération légère
        this.softRecovery();
        break;
    }
  }

  async reinitializeTeamUI() {
    try {
      console.log('🔄 Reinitializing TeamUI...');
      
      // Détruire l'instance actuelle
      if (this.teamUI) {
        this.teamUI.destroy?.();
        this.teamUI = null;
      }
      
      // Réinitialiser le module
      await this.uiManager.initializeModule('teamUI');
      
      console.log('✅ TeamUI reinitialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to reinitialize TeamUI:', error);
      this.createFallbackInterface();
    }
  }

  softRecovery() {
    console.log('🔄 Performing soft recovery...');
    
    // Réinitialiser l'état
    if (this.teamUI) {
      this.teamUI.isVisible = false;
      this.teamUI.overlay?.classList.add('hidden');
    }
  }

  createFallbackInterface() {
    console.log('🆘 Creating fallback TeamUI interface...');
    
    // Interface de secours simplifiée
    const fallbackHTML = `
      <div id="team-ui-fallback" style="
        position: fixed; top: 50%; left: 50%; 
        transform: translate(-50%, -50%);
        background: #2a3f5f; border: 2px solid #4a90e2;
        border-radius: 10px; padding: 20px; color: white;
        z-index: 1000; text-align: center; max-width: 300px;
      ">
        <h3>⚔️ Team Manager</h3>
        <p>Running in fallback mode</p>
        <p style="font-size: 12px; opacity: 0.7;">
          Some features may be limited
        </p>
        <button onclick="this.parentElement.remove()" style="
          background: #4a90e2; border: none; color: white;
          padding: 10px 20px; border-radius: 5px; cursor: pointer;
          margin-top: 10px;
        ">Close</button>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', fallbackHTML);
  }

  // ===== TRAITEMENT DES MISES À JOUR =====

  processTeamUIUpdate(data) {
    if (!this.teamUI) return;
    
    // Router les mises à jour selon le type
    switch (data.type) {
      case 'teamData':
        this.teamUI.updateTeamData(data.payload);
        break;
      case 'pokemonUpdate':
        this.teamUI.handlePokemonUpdate(data.payload);
        break;
      case 'stateChange':
        this.handleStateChange(data.payload);
        break;
      case 'configuration':
        this.handleConfigurationUpdate(data.payload);
        break;
    }
  }

  handleStateChange(stateData) {
    const { visible, enabled } = stateData;
    
    if (visible !== undefined) {
      if (visible) {
        this.teamUI.show();
      } else {
        this.teamUI.hide();
      }
    }
    
    if (enabled !== undefined) {
      this.teamUI.setEnabled(enabled);
    }
  }

  handleConfigurationUpdate(config) {
    // Mettre à jour la configuration du TeamUI
    if (config.theme) {
      this.applyTheme(config.theme);
    }
    
    if (config.responsive) {
      this.updateResponsiveConfig(config.responsive);
    }
    
    if (config.performance) {
      this.updatePerformanceConfig(config.performance);
    }
  }

  applyTheme(theme) {
    console.log('🎨 Applying theme to TeamUI:', theme);
    
    const overlay = this.teamUI?.overlay;
    if (!overlay) return;
    
    // Supprimer les anciens thèmes
    overlay.classList.remove('theme-dark', 'theme-light', 'theme-blue', 'theme-custom');
    
    // Appliquer le nouveau thème
    overlay.classList.add(`theme-${theme}`);
    
    // Mettre à jour les variables CSS si nécessaire
    if (theme === 'custom') {
      this.applyCustomTheme();
    }
  }

  applyCustomTheme() {
    // Thème personnalisé avec les couleurs actuelles
    const style = document.createElement('style');
    style.id = 'team-ui-custom-theme';
    style.textContent = `
      .theme-custom {
        --team-primary: #4a90e2;
        --team-primary-dark: #357abd;
        --team-secondary: #87ceeb;
        --team-bg-dark: #1e2d42;
        --team-bg-medium: #2a3f5f;
      }
    `;
    
    // Remplacer l'ancien style si existe
    const oldStyle = document.querySelector('#team-ui-custom-theme');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    document.head.appendChild(style);
  }

  updateResponsiveConfig(config) {
    console.log('📱 Updating responsive config:', config);
    
    if (this.teamUI) {
      this.teamUI.responsiveConfig = {
        ...this.teamUI.responsiveConfig,
        ...config
      };
      
      // Réappliquer la configuration responsive
      this.teamUI.handleResponsiveChanges?.();
    }
  }

  updatePerformanceConfig(config) {
    console.log('⚡ Updating performance config:', config);
    
    if (this.teamUI) {
      this.teamUI.performanceConfig = {
        ...this.teamUI.performanceConfig,
        ...config
      };
      
      // Réappliquer les optimisations de performance
      this.teamUI.setupPerformanceOptimizations?.();
    }
  }

  // ===== SAUVEGARDE ET RESTAURATION D'ÉTAT =====

  saveState(state) {
    try {
      const stateToSave = {
        timestamp: Date.now(),
        version: '2.0.0',
        state: state
      };
      
      // Utiliser sessionStorage car localStorage n'est pas supporté dans Claude.ai
      sessionStorage.setItem('teamUI_state', JSON.stringify(stateToSave));
      console.log('💾 TeamUI state saved');
      
    } catch (error) {
      console.warn('⚠️ Failed to save TeamUI state:', error);
    }
  }

  loadState() {
    try {
      const savedState = sessionStorage.getItem('teamUI_state');
      if (!savedState) return null;
      
      const parsedState = JSON.parse(savedState);
      
      // Vérifier la version et la validité
      if (parsedState.version !== '2.0.0') {
        console.warn('⚠️ TeamUI state version mismatch, ignoring');
        return null;
      }
      
      // Vérifier l'âge (pas plus de 24h)
      const age = Date.now() - parsedState.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.warn('⚠️ TeamUI state too old, ignoring');
        return null;
      }
      
      console.log('📂 TeamUI state loaded');
      return parsedState.state;
      
    } catch (error) {
      console.warn('⚠️ Failed to load TeamUI state:', error);
      return null;
    }
  }

  restoreState() {
    const state = this.loadState();
    if (state && this.teamUI) {
      this.teamUI.importData(state);
    }
  }

  // ===== MÉTHODES PUBLIQUES POUR L'INTÉGRATION =====

  /**
   * Obtenir l'instance TeamUI
   */
  getTeamUI() {
    return this.teamUI;
  }

  /**
   * Obtenir l'instance TeamIcon
   */
  getTeamIcon() {
    return this.teamIcon;
  }

  /**
   * Vérifier si TeamUI est initialisé
   */
  isInitialized() {
    return this.initialized && this.teamUI && this.teamIcon;
  }

  /**
   * Obtenir l'état complet
   */
  getState() {
    return {
      initialized: this.initialized,
      teamUI: this.teamUI ? this.teamUI.getUIManagerState() : null,
      teamIcon: this.teamIcon ? this.teamIcon.getUIManagerState() : null,
      integration: {
        eventsConnected: !!this.teamUI?.onClick,
        keyboardSetup: true,
        stateSync: true
      }
    };
  }

  /**
   * Forcer une mise à jour complète
   */
  async forceUpdate() {
    console.log('🔄 Forcing TeamUI complete update...');
    
    try {
      // Rafraîchir les données
      this.teamUI?.requestTeamData();
      
      // Rafraîchir l'affichage
      this.teamUI?.refreshTeamDisplay();
      
      // Mettre à jour les statistiques
      this.teamUI?.updateTeamStats();
      
      // Synchroniser l'icône
      if (this.teamIcon && this.teamUI) {
        const teamData = this.teamUI.teamData || [];
        this.teamIcon.updateTeamStats({
          totalPokemon: teamData.length,
          alivePokemon: teamData.filter(p => p.currentHp > 0).length,
          canBattle: teamData.some(p => p.currentHp > 0)
        });
      }
      
      console.log('✅ TeamUI force update completed');
      
    } catch (error) {
      console.error('❌ TeamUI force update failed:', error);
      this.handleTeamUIError(error);
    }
  }

  /**
   * Diagnostiquer l'état du système
   */
  diagnose() {
    const diagnosis = {
      timestamp: Date.now(),
      integration: {
        registered: this.initialized,
        teamUIInstance: !!this.teamUI,
        teamIconInstance: !!this.teamIcon,
        uiManagerConnected: !!this.uiManager
      },
      teamUI: this.teamUI ? {
        initialized: this.teamUI.uiManagerState?.initialized,
        visible: this.teamUI.isVisible,
        enabled: this.teamUI.uiManagerState?.enabled,
        teamData: this.teamUI.teamData?.length || 0,
        currentView: this.teamUI.currentView,
        hasOverlay: !!this.teamUI.overlay,
        overlayInDOM: this.teamUI.overlay ? document.contains(this.teamUI.overlay) : false
      } : null,
      teamIcon: this.teamIcon ? {
        initialized: this.teamIcon.uiManagerState?.initialized,
        visible: this.teamIcon.uiManagerState?.visible,
        enabled: this.teamIcon.uiManagerState?.enabled,
        hasElement: !!this.teamIcon.iconElement,
        elementInDOM: this.teamIcon.iconElement ? document.contains(this.teamIcon.iconElement) : false
      } : null,
      dom: {
        teamOverlay: !!document.querySelector('#team-overlay'),
        teamIcon: !!document.querySelector('#team-icon'),
        styles: !!document.querySelector('#team-ui-styles')
      },
      errors: {
        hasConsoleErrors: this.hasRecentConsoleErrors(),
        lastError: this.getLastError()
      }
    };
    
    console.group('🔍 TeamUI Integration Diagnosis');
    console.table(diagnosis.integration);
    console.table(diagnosis.teamUI);
    console.table(diagnosis.teamIcon);
    console.table(diagnosis.dom);
    console.groupEnd();
    
    return diagnosis;
  }

  hasRecentConsoleErrors() {
    // Simple heuristique pour détecter des erreurs récentes
    return this.teamUI?.performanceMetrics?.errorCount > 0;
  }

  getLastError() {
    // Retourner la dernière erreur enregistrée
    return this.teamUI?.lastError || null;
  }

  /**
   * Nettoyer l'intégration
   */
  cleanup() {
    console.log('🧹 Cleaning up TeamUI integration...');
    
    try {
      // Nettoyer les événements globaux
      document.removeEventListener('keydown', this.globalKeyHandler);
      
      // Nettoyer les instances
      if (this.teamUI) {
        this.teamUI.destroy();
        this.teamUI = null;
      }
      
      if (this.teamIcon) {
        this.teamIcon.destroy();
        this.teamIcon = null;
      }
      
      // Nettoyer l'état
      this.initialized = false;
      
      console.log('✅ TeamUI integration cleaned up');
      
    } catch (error) {
      console.error('❌ Error during TeamUI cleanup:', error);
    }
  }

  /**
   * Redémarrer l'intégration complète
   */
  async restart() {
    console.log('🔄 Restarting TeamUI integration...');
    
    try {
      // Nettoyer
      this.cleanup();
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Réenregistrer
      await this.register();
      
      // Réinitialiser
      await this.initialize();
      
      console.log('✅ TeamUI integration restarted successfully');
      
    } catch (error) {
      console.error('❌ Failed to restart TeamUI integration:', error);
      throw error;
    }
  }
}

// ===== FONCTIONS UTILITAIRES D'INTÉGRATION =====

/**
 * Créer et configurer une intégration TeamUI
 */
export async function createTeamUIIntegration(uiManager, gameRoom) {
  const integration = new TeamUIIntegration(uiManager, gameRoom);
  
  try {
    await integration.register();
    await integration.initialize();
    
    console.log('✅ TeamUI integration ready');
    return integration;
    
  } catch (error) {
    console.error('❌ Failed to create TeamUI integration:', error);
    throw error;
  }
}

/**
 * Vérifier la compatibilité UIManager
 */
export function checkUIManagerCompatibility(uiManager) {
  const requiredMethods = [
    'registerModule',
    'initializeModule', 
    'showModule',
    'hideModule',
    'enableModule',
    'disableModule'
  ];
  
  const missingMethods = requiredMethods.filter(method => 
    typeof uiManager[method] !== 'function'
  );
  
  if (missingMethods.length > 0) {
    throw new Error(`UIManager incompatible. Missing methods: ${missingMethods.join(', ')}`);
  }
  
  console.log('✅ UIManager compatibility check passed');
  return true;
}

/**
 * Configuration par défaut pour TeamUI
 */
export const DEFAULT_TEAM_UI_CONFIG = {
  modules: {
    teamUI: {
      autoShow: false,
      defaultView: 'overview',
      enableAnimations: true,
      enableDragDrop: true,
      enableKeyboardShortcuts: true
    },
    teamIcon: {
      autoPosition: true,
      showNotifications: true,
      enableTooltips: true,
      quickActions: ['heal', 'pc']
    }
  },
  performance: {
    enableCaching: true,
    lazyLoading: false,
    maxFPS: 60,
    debounceUpdates: 100
  },
  accessibility: {
    keyboardNavigation: true,
    screenReader: true,
    highContrast: true,
    reducedMotion: false
  }
};

console.log('✅ TeamUI Integration module loaded');
console.log('🎯 Use createTeamUIIntegration(uiManager, gameRoom) to setup');
console.log('📚 Available: TeamUIIntegration, createTeamUIIntegration, checkUIManagerCompatibility');
