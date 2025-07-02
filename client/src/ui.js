// client/src/ui.js - Système UI Manager centralisé pour Pokémon MMO
// ✅ Version Professional avec gestion performance, responsive et error recovery

import { UIManager } from './managers/UIManager.js';

// === CONFIGURATION UI MANAGER POKÉMON MMO ===
const UI_CONFIG = {
  debug: true, // Mode debug activé pour développement
  
  performance: {
    enablePooling: true,
    lazyLoadModules: false, // Pas de lazy load pour un MMO
    batchUpdates: true,
    maxConcurrentAnimations: 5, // Plus d'animations pour MMO
    debounceResize: 200,
    frameThrottling: true
  },
  
  responsive: {
    enabled: true,
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1920
    },
    adaptiveLayouts: true,
    touchOptimization: true,
    autoScale: true
  },
  
  errorRecovery: {
    autoRecover: true,
    maxRetries: 3,
    retryDelay: 1000,
    gracefulDegradation: true,
    fallbackStates: true,
    errorReporting: true
  }
};

// === ÉTATS DE JEU POKÉMON ===
const POKEMON_GAME_STATES = {
  exploration: {
    visibleModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
    enabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
    hiddenModules: [],
    disabledModules: [],
    responsive: {
      mobile: { 
        hiddenModules: ['questTracker'], 
        visibleModules: ['inventory', 'team', 'quest']
      },
      tablet: { 
        hiddenModules: ['chat'],
        visibleModules: ['inventory', 'team', 'quest', 'questTracker']
      }
    }
  },
  
  battle: {
    visibleModules: ['team', 'inventory'],
    enabledModules: ['team'],
    hiddenModules: ['questTracker', 'chat', 'quest'],
    disabledModules: ['inventory', 'quest'],
    responsive: {
      mobile: { 
        visibleModules: ['team'], 
        hiddenModules: ['inventory', 'questTracker', 'chat', 'quest'] 
      },
      tablet: {
        visibleModules: ['team', 'inventory'],
        hiddenModules: ['questTracker', 'chat', 'quest']
      }
    }
  },
  
  pokemonCenter: {
    visibleModules: ['team', 'inventory', 'pc'],
    enabledModules: ['team', 'inventory', 'pc'],
    hiddenModules: ['questTracker', 'chat'],
    disabledModules: ['quest'],
    responsive: {
      mobile: {
        visibleModules: ['team', 'pc'],
        hiddenModules: ['inventory', 'questTracker', 'chat', 'quest']
      }
    }
  },
  
  dialogue: {
    visibleModules: ['inventory', 'team', 'quest'],
    enabledModules: [],
    hiddenModules: ['questTracker', 'chat'],
    disabledModules: ['inventory', 'team', 'quest']
  },
  
  menu: {
    visibleModules: ['inventory', 'team', 'quest'],
    enabledModules: ['inventory', 'team', 'quest'],
    hiddenModules: ['questTracker', 'chat'],
    disabledModules: []
  },
  
  starterSelection: {
    visibleModules: [],
    enabledModules: [],
    hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
    disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']
  }
};

// === GROUPES LOGIQUES POKÉMON ===
const POKEMON_UI_GROUPS = {
  'ui-icons': {
    modules: ['inventory', 'team', 'quest'],
    layout: {
      type: 'horizontal',
      anchor: 'bottom-right',
      spacing: 10,
      order: ['inventory', 'quest', 'team'] // Ordre d'affichage
    },
    priority: 100
  },
  
  'panels': {
    modules: ['questTracker', 'minimap'],
    layout: {
      type: 'vertical',
      anchor: 'top-right',
      spacing: 15
    },
    priority: 90
  },
  
  'social': {
    modules: ['chat'],
    layout: {
      type: 'overlay',
      anchor: 'bottom-left',
      spacing: 0
    },
    priority: 80
  },
  
  'battle-ui': {
    modules: ['team', 'battleMenu'],
    layout: {
      type: 'battle-specific',
      anchor: 'bottom-center',
      spacing: 20
    },
    priority: 110
  }
};

// === CLASSE UI SYSTEM POKÉMON ===
export class PokemonUISystem {
  constructor() {
    this.uiManager = null;
    this.initialized = false;
    this.moduleFactories = new Map();
    this.moduleInstances = new Map();
    this.currentGameState = 'exploration';
    
    console.log('🎮 PokemonUISystem créé');
  }

  // === INITIALISATION ===
  async initialize() {
    try {
      console.log('🚀 [PokemonUI] === INITIALISATION UI MANAGER ===');
      
      // Créer le UIManager avec configuration Pokémon
      const config = {
        ...UI_CONFIG,
        gameStates: POKEMON_GAME_STATES
      };
      
      this.uiManager = new UIManager(config);
      
      // Créer les groupes
      this.setupUIGroups();
      
      // Enregistrer les modules
      await this.registerAllModules();
      
      // Setup des callbacks globaux
      this.setupGlobalCallbacks();
      
      console.log('✅ [PokemonUI] UIManager initialisé avec succès');
      this.initialized = true;
      
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur initialisation:', error);
      return false;
    }
  }

  // === SETUP GROUPES ===
  setupUIGroups() {
    console.log('📦 [PokemonUI] Configuration des groupes...');
    
    Object.entries(POKEMON_UI_GROUPS).forEach(([groupId, config]) => {
      this.uiManager.createGroup(groupId, config.modules, {
        layout: config.layout,
        priority: config.priority
      });
      console.log(`  ✅ Groupe '${groupId}' créé avec ${config.modules.length} modules`);
    });
  }

  // === ENREGISTREMENT MODULES ===
  async registerAllModules() {
    console.log('📝 [PokemonUI] Enregistrement des modules...');
    
    // Configuration des modules avec leurs factories
    const moduleConfigs = [
      {
        id: 'inventory',
        critical: true,
        factory: this.createInventoryModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 0,
          spacing: 10
        },
        responsive: {
          mobile: { scale: 0.8 },
          tablet: { scale: 0.9 },
          desktop: { scale: 1.0 }
        },
        priority: 100
      },
      
      {
        id: 'team',
        critical: true,
        factory: this.createTeamModule.bind(this),
        groups: ['ui-icons', 'battle-ui'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 2,
          spacing: 10
        },
        responsive: {
          mobile: { scale: 0.8, position: { right: '15px' } },
          tablet: { scale: 0.9 },
          desktop: { scale: 1.0 }
        },
        priority: 110
      },
      
      {
        id: 'quest',
        critical: false,
        factory: this.createQuestModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 1,
          spacing: 10
        },
        responsive: {
          mobile: { scale: 0.8 },
          tablet: { scale: 0.9 },
          desktop: { scale: 1.0 }
        },
        priority: 90
      },
      
      {
        id: 'questTracker',
        critical: false,
        factory: this.createQuestTrackerModule.bind(this),
        groups: ['panels'],
        layout: {
          type: 'panel',
          anchor: 'top-right',
          order: 0
        },
        responsive: {
          mobile: { hidden: true },
          tablet: { scale: 0.9 },
          desktop: { scale: 1.0 }
        },
        priority: 80
      },
      
      {
        id: 'chat',
        critical: false,
        factory: this.createChatModule.bind(this),
        groups: ['social'],
        layout: {
          type: 'overlay',
          anchor: 'bottom-left',
          order: 0
        },
        responsive: {
          mobile: { hidden: true },
          tablet: { hidden: true },
          desktop: { scale: 1.0 }
        },
        priority: 70
      }
    ];

    // Enregistrer chaque module
    for (const config of moduleConfigs) {
      try {
        await this.uiManager.registerModule(config.id, config);
        console.log(`  ✅ Module '${config.id}' enregistré`);
      } catch (error) {
        console.error(`  ❌ Erreur module '${config.id}':`, error);
      }
    }
  }

  // === FACTORIES DES MODULES ===

  async createInventoryModule() {
    console.log('🎒 [PokemonUI] Création module inventaire...');
    
    // Utiliser le système existant ou créer nouveau
    if (window.inventorySystemGlobal) {
      console.log('🔄 [PokemonUI] Réutilisation inventaire existant');
      return this.wrapExistingModule(window.inventorySystemGlobal, 'inventory');
    }
    
    // Créer nouveau si nécessaire
    if (typeof window.initInventorySystem === 'function') {
      const inventorySystem = window.initInventorySystem(window.currentGameRoom);
      return this.wrapExistingModule(inventorySystem, 'inventory');
    }
    
    throw new Error('Impossible de créer le module inventaire');
  }

  async createTeamModule() {
    console.log('⚔️ [PokemonUI] Création module équipe...');
    
    if (window.teamManagerGlobal) {
      console.log('🔄 [PokemonUI] Réutilisation équipe existante');
      return this.wrapExistingModule(window.teamManagerGlobal, 'team');
    }
    
    if (typeof window.initTeamSystem === 'function') {
      const teamSystem = window.initTeamSystem(window.currentGameRoom);
      return this.wrapExistingModule(teamSystem, 'team');
    }
    
    throw new Error('Impossible de créer le module équipe');
  }

  async createQuestModule() {
    console.log('📋 [PokemonUI] Création module quêtes...');
    
    if (window.questSystemGlobal) {
      console.log('🔄 [PokemonUI] Réutilisation quêtes existantes');
      return this.wrapExistingModule(window.questSystemGlobal, 'quest');
    }
    
    if (typeof window.initQuestSystem === 'function') {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      const questSystem = window.initQuestSystem(activeScene, window.currentGameRoom);
      return this.wrapExistingModule(questSystem, 'quest');
    }
    
    throw new Error('Impossible de créer le module quêtes');
  }

  async createQuestTrackerModule() {
    console.log('📊 [PokemonUI] Création tracker de quêtes...');
    
    // Le tracker est généralement lié au système de quêtes
    if (window.questSystemGlobal?.questTracker) {
      return this.wrapExistingModule(window.questSystemGlobal.questTracker, 'questTracker');
    }
    
    // Créer un tracker autonome si nécessaire
    const { QuestTrackerUI } = await import('./components/QuestTrackerUI.js');
    const tracker = new QuestTrackerUI(window.questSystemGlobal);
    return this.wrapExistingModule(tracker, 'questTracker');
  }

  async createChatModule() {
    console.log('💬 [PokemonUI] Création module chat...');
    
    // Le chat est généralement déjà initialisé globalement
    if (window.pokeChat) {
      return this.wrapExistingModule(window.pokeChat, 'chat');
    }
    
    // Le chat devrait être initialisé dans main.js, pas ici
    console.warn('⚠️ [PokemonUI] Chat non trouvé - sera initialisé plus tard');
    
    // Retourner un wrapper vide qui sera mise à jour plus tard
    return this.createEmptyWrapper('chat');
  }

  // === WRAPPER POUR MODULES EXISTANTS ===
  wrapExistingModule(existingModule, moduleType) {
    console.log(`🔧 [PokemonUI] Wrapping module existant: ${moduleType}`);
    
    const wrapper = {
      // Propriétés requises
      iconElement: null,
      originalModule: existingModule,
      moduleType: moduleType,
      
      // Méthodes requises par UIManager
      show: () => {
        try {
          if (existingModule.show) {
            existingModule.show();
          } else if (existingModule.iconElement) {
            existingModule.iconElement.style.display = '';
          }
        } catch (error) {
          console.error(`❌ Erreur show ${moduleType}:`, error);
        }
      },
      
      hide: () => {
        try {
          if (existingModule.hide) {
            existingModule.hide();
          } else if (existingModule.iconElement) {
            existingModule.iconElement.style.display = 'none';
          }
        } catch (error) {
          console.error(`❌ Erreur hide ${moduleType}:`, error);
        }
      },
      
      setEnabled: (enabled) => {
        try {
          if (existingModule.setEnabled) {
            existingModule.setEnabled(enabled);
          } else if (existingModule.iconElement) {
            existingModule.iconElement.style.opacity = enabled ? '1' : '0.5';
            existingModule.iconElement.style.pointerEvents = enabled ? 'auto' : 'none';
          }
        } catch (error) {
          console.error(`❌ Erreur setEnabled ${moduleType}:`, error);
        }
      },
      
      // Méthodes optionnelles
      destroy: () => {
        if (existingModule.destroy) {
          existingModule.destroy();
        }
      },
      
      update: (data) => {
        if (existingModule.update) {
          existingModule.update(data);
        }
      },
      
      // Proxy pour accès aux propriétés originales
      getOriginal: () => existingModule
    };
    
    // Trouver l'iconElement
    wrapper.iconElement = this.findIconElement(existingModule, moduleType);
    
    if (!wrapper.iconElement) {
      console.warn(`⚠️ [PokemonUI] IconElement non trouvé pour ${moduleType}`);
    }
    
    // Stocker l'instance
    this.moduleInstances.set(moduleType, wrapper);
    
    return wrapper;
  }

  createEmptyWrapper(moduleType) {
    console.log(`📦 [PokemonUI] Création wrapper vide: ${moduleType}`);
    
    return {
      iconElement: null,
      originalModule: null,
      moduleType: moduleType,
      isEmpty: true,
      
      show: () => console.log(`🔍 Empty wrapper show: ${moduleType}`),
      hide: () => console.log(`🔍 Empty wrapper hide: ${moduleType}`),
      setEnabled: (enabled) => console.log(`🔍 Empty wrapper setEnabled: ${moduleType}`, enabled),
      destroy: () => console.log(`🔍 Empty wrapper destroy: ${moduleType}`),
      update: (data) => console.log(`🔍 Empty wrapper update: ${moduleType}`, data)
    };
  }

  // === UTILITAIRES ===
  findIconElement(module, moduleType) {
    // Essayer plusieurs propriétés communes
    const possibleElements = [
      module.iconElement,
      module.element,
      module.container,
      module.ui?.iconElement,
      module.icon,
      document.querySelector(`#${moduleType}-icon`),
      document.querySelector(`.${moduleType}-icon`)
    ];
    
    return possibleElements.find(el => el && el.nodeType === Node.ELEMENT_NODE) || null;
  }

  // === SETUP CALLBACKS GLOBAUX ===
  setupGlobalCallbacks() {
    console.log('🔗 [PokemonUI] Configuration callbacks globaux...');
    
    if (!this.uiManager) return;
    
    // Callbacks d'événements
    this.uiManager.on('moduleInitialized', (event) => {
      const { moduleId, instance } = event.detail;
      console.log(`✅ [PokemonUI] Module initialisé: ${moduleId}`);
      
      // Trigger custom event
      window.dispatchEvent(new CustomEvent('pokemonUIModuleReady', {
        detail: { moduleId, instance }
      }));
    });
    
    this.uiManager.on('gameStateChanged', (event) => {
      const { previousState, newState } = event.detail;
      console.log(`🎮 [PokemonUI] État changé: ${previousState} → ${newState}`);
      this.currentGameState = newState;
      
      // Trigger custom event
      window.dispatchEvent(new CustomEvent('pokemonUIStateChanged', {
        detail: { previousState, newState }
      }));
    });
    
    this.uiManager.on('moduleError', (event) => {
      const { moduleId, error } = event.detail;
      console.error(`❌ [PokemonUI] Erreur module ${moduleId}:`, error);
      
      // Notifier l'utilisateur si c'est un module critique
      const config = this.uiManager.modules.get(moduleId);
      if (config?.critical) {
        window.showGameNotification?.(`Erreur module ${moduleId}`, 'error', {
          duration: 5000,
          position: 'top-center'
        });
      }
    });
  }

  // === API PUBLIQUE ===

  async initializeAllModules() {
    if (!this.uiManager) {
      throw new Error('UIManager non initialisé');
    }
    
    console.log('🚀 [PokemonUI] Initialisation de tous les modules...');
    
    const result = await this.uiManager.initializeAllModules(
      window.currentGameRoom, // gameRoom pour modules qui en ont besoin
      window.game?.scene?.getScenes(true)[0] // scene active pour modules qui en ont besoin
    );
    
    if (result.success) {
      console.log('✅ [PokemonUI] Tous les modules initialisés !');
    } else {
      console.warn('⚠️ [PokemonUI] Initialisation avec erreurs:', result.errors);
    }
    
    return result;
  }

  setGameState(stateName, options = {}) {
    if (!this.uiManager) {
      console.warn('⚠️ [PokemonUI] UIManager non initialisé');
      return false;
    }
    
    console.log(`🎮 [PokemonUI] Changement état: ${stateName}`);
    return this.uiManager.setGameState(stateName, options);
  }

  // === MÉTHODES DE COMPATIBILITÉ ===
  
  // Pour garder la compatibilité avec l'ancien système
  getModule(moduleId) {
    return this.moduleInstances.get(moduleId);
  }
  
  getOriginalModule(moduleId) {
    const wrapper = this.moduleInstances.get(moduleId);
    return wrapper?.getOriginal?.() || wrapper?.originalModule;
  }
  
  showModule(moduleId, options = {}) {
    return this.uiManager?.showModule(moduleId, options);
  }
  
  hideModule(moduleId, options = {}) {
    return this.uiManager?.hideModule(moduleId, options);
  }
  
  enableModule(moduleId) {
    return this.uiManager?.enableModule(moduleId);
  }
  
  disableModule(moduleId) {
    return this.uiManager?.disableModule(moduleId);
  }

  // === DEBUGGING ===
  
  debugInfo() {
    if (!this.uiManager) {
      console.log('❌ [PokemonUI] UIManager non initialisé');
      return { error: 'UIManager non initialisé' };
    }
    
    console.group('🎮 === POKEMON UI SYSTEM DEBUG ===');
    console.log('🎯 État actuel:', this.currentGameState);
    console.log('📊 Modules enregistrés:', this.moduleInstances.size);
    
    // Debug des modules
    this.moduleInstances.forEach((wrapper, moduleId) => {
      console.log(`  📦 ${moduleId}:`, {
        hasIconElement: !!wrapper.iconElement,
        isEmpty: wrapper.isEmpty,
        originalModule: !!wrapper.originalModule
      });
    });
    
    // Debug UIManager
    const uiStats = this.uiManager.debugInfo();
    console.groupEnd();
    
    return {
      currentGameState: this.currentGameState,
      modulesCount: this.moduleInstances.size,
      uiManagerStats: uiStats,
      initialized: this.initialized
    };
  }

  testAllModules() {
    console.log('🧪 [PokemonUI] Test de tous les modules...');
    
    const results = {};
    
    this.moduleInstances.forEach((wrapper, moduleId) => {
      try {
        console.log(`🧪 Test module: ${moduleId}`);
        
        // Test show/hide
        wrapper.show();
        setTimeout(() => wrapper.hide(), 500);
        setTimeout(() => wrapper.show(), 1000);
        
        // Test enable/disable
        wrapper.setEnabled(false);
        setTimeout(() => wrapper.setEnabled(true), 1500);
        
        results[moduleId] = { success: true };
        console.log(`  ✅ ${moduleId}: OK`);
        
      } catch (error) {
        results[moduleId] = { success: false, error: error.message };
        console.error(`  ❌ ${moduleId}: ${error.message}`);
      }
    });
    
    console.log('🧪 Test terminé:', results);
    return results;
  }
}

// === INSTANCE GLOBALE ===
export const pokemonUISystem = new PokemonUISystem();

// === FONCTIONS UTILITAIRES GLOBALES ===

export async function initializePokemonUI() {
  console.log('🎮 [PokemonUI] === INITIALISATION SYSTÈME UI POKÉMON ===');
  
  try {
    // Initialiser le système
    const success = await pokemonUISystem.initialize();
    
    if (!success) {
      throw new Error('Échec initialisation PokemonUISystem');
    }
    
    // Initialiser tous les modules
    const result = await pokemonUISystem.initializeAllModules();
    
    // Exposer globalement
    window.pokemonUISystem = pokemonUISystem;
    window.uiManager = pokemonUISystem.uiManager;
    
    // Fonctions de compatibilité globales
    setupCompatibilityFunctions();
    
    console.log('✅ [PokemonUI] Système UI Pokémon initialisé !');
    
    return {
      success: result.success,
      uiSystem: pokemonUISystem,
      uiManager: pokemonUISystem.uiManager,
      errors: result.errors || []
    };
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur initialisation:', error);
    
    return {
      success: false,
      error: error.message,
      uiSystem: null,
      uiManager: null
    };
  }
}

// === FONCTIONS DE COMPATIBILITÉ ===
function setupCompatibilityFunctions() {
  console.log('🔗 [PokemonUI] Configuration fonctions de compatibilité...');
  
  // Fonctions toggle pour compatibilité
  window.toggleInventory = () => {
    const module = pokemonUISystem.getOriginalModule('inventory');
    if (module && module.toggle) {
      module.toggle();
    } else if (module && module.toggleInventory) {
      module.toggleInventory();
    } else {
      console.warn('⚠️ Module inventaire non disponible pour toggle');
    }
  };
  
  window.toggleTeam = () => {
    const module = pokemonUISystem.getOriginalModule('team');
    if (module && module.toggleTeamUI) {
      module.toggleTeamUI();
    } else if (module && module.toggle) {
      module.toggle();
    } else {
      console.warn('⚠️ Module équipe non disponible pour toggle');
    }
  };
  
  window.toggleQuest = () => {
    const module = pokemonUISystem.getOriginalModule('quest');
    if (module && module.toggleQuestJournal) {
      module.toggleQuestJournal();
    } else if (module && module.toggle) {
      module.toggle();
    } else {
      console.warn('⚠️ Module quêtes non disponible pour toggle');
    }
  };
  
  // Fonctions d'état de jeu
  window.setUIGameState = (stateName, options = {}) => {
    return pokemonUISystem.setGameState(stateName, options);
  };
  
  // Fonctions de debug
  window.debugPokemonUI = () => {
    return pokemonUISystem.debugInfo();
  };
  
  window.testPokemonUI = () => {
    return pokemonUISystem.testAllModules();
  };
  
  console.log('✅ [PokemonUI] Fonctions de compatibilité configurées');
}

// === ÉVÉNEMENTS GLOBAUX ===

// Gestion automatique des états selon les événements du jeu
document.addEventListener('DOMContentLoaded', () => {
  // Écouter les événements de battle
  window.addEventListener('battleStarted', () => {
    pokemonUISystem.setGameState('battle', { animated: true });
  });
  
  window.addEventListener('battleEnded', () => {
    pokemonUISystem.setGameState('exploration', { animated: true });
  });
  
  // Écouter les événements de dialogue
  window.addEventListener('dialogueStarted', () => {
    pokemonUISystem.setGameState('dialogue', { animated: true });
  });
  
  window.addEventListener('dialogueEnded', () => {
    pokemonUISystem.setGameState('exploration', { animated: true });
  });
  
  // Écouter les événements de starter selection
  window.addEventListener('starterSelectionStarted', () => {
    pokemonUISystem.setGameState('starterSelection', { animated: true });
  });
  
  window.addEventListener('starterSelectionEnded', () => {
    pokemonUISystem.setGameState('exploration', { animated: true });
  });
});

console.log('✅ [PokemonUI] Système UI Pokémon chargé !');
console.log('🎮 Utilisez initializePokemonUI() pour démarrer');
console.log('🔍 Utilisez window.debugPokemonUI() pour diagnostiquer');
console.log('🧪 Utilisez window.testPokemonUI() pour tester');
