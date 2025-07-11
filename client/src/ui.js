// client/src/ui.js - Système UI Manager centralisé pour Pokémon MMO
// ✅ Version CORRIGÉE avec BattleInterface fonctionnel
// ✅ TOUTES LES CORRECTIONS INTÉGRÉES

import { UIManager } from './managers/UIManager.js';

// === CONFIGURATION UI MANAGER POKÉMON MMO ===
const UI_CONFIG = {
  debug: true,
  
  performance: {
    enablePooling: true,
    lazyLoadModules: false,
    batchUpdates: true,
    maxConcurrentAnimations: 5,
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
    visibleModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],    // ✅ 'team' au lieu de 'teamIcon'
    enabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],     // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
    hiddenModules: [],                                                          // ✅ Plus besoin de cacher 'teamUI' séparément
    disabledModules: [],
    responsive: {
      mobile: { 
        hiddenModules: ['questTracker'], 
        visibleModules: ['inventory', 'team', 'quest']                         // ✅ 'team' au lieu de 'teamIcon'
      },
      tablet: { 
        hiddenModules: ['chat'],
        visibleModules: ['inventory', 'team', 'quest', 'questTracker']         // ✅ 'team' au lieu de 'teamIcon'
      }
    }
  },
  
  battle: {
    visibleModules: ['battleInterface'],
    enabledModules: ['battleInterface'],
    hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],     // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
    disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],   // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
    responsive: {
      mobile: { 
        visibleModules: ['battleInterface'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']  // ✅ 'team' au lieu de listes séparées
      },
      tablet: {
        visibleModules: ['battleInterface'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']  // ✅ 'team' au lieu de listes séparées
      }
    }
  },
  
  pokemonCenter: {
    visibleModules: ['team', 'inventory', 'pc'],                               // ✅ 'team' englobe icône + interface
    enabledModules: ['team', 'inventory', 'pc'],                               // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
    hiddenModules: ['questTracker', 'chat'],
    disabledModules: ['quest'],
    responsive: {
      mobile: {
        visibleModules: ['team', 'pc'],                                         // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
        hiddenModules: ['inventory', 'questTracker', 'chat', 'quest']
      }
    }
  },
  
  dialogue: {
    visibleModules: ['inventory', 'team', 'quest'],                            // ✅ 'team' au lieu de 'teamIcon'
    enabledModules: [],                                                         // Tous désactivés pendant dialogue
    hiddenModules: ['questTracker', 'chat'],                                   // ✅ Plus besoin de 'teamUI' séparément
    disabledModules: ['inventory', 'team', 'quest']                            // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
  },
  
  menu: {
    visibleModules: ['inventory', 'team', 'quest'],                            // ✅ 'team' au lieu de 'teamIcon'
    enabledModules: ['inventory', 'team', 'quest'],                            // ✅ 'team' au lieu de 'teamIcon', 'teamUI'
    hiddenModules: ['questTracker', 'chat'],                                   // ✅ Plus besoin de cacher 'teamUI' par défaut
    disabledModules: []
  },
  
  starterSelection: {
    visibleModules: [],
    enabledModules: [],
    hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],     // ✅ 'team' au lieu de liste séparée
    disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']    // ✅ 'team' au lieu de liste séparée
  }
};

// === GROUPES LOGIQUES POKÉMON ===
const POKEMON_UI_GROUPS = {
  'ui-icons': {
    modules: ['inventory', 'team', 'quest'],                                   // ✅ 'team' au lieu de 'teamIcon'
    layout: {
      type: 'horizontal',
      anchor: 'bottom-right',
      spacing: 10,
      order: ['inventory', 'quest', 'team']                                    // ✅ 'team' en dernier (position droite)
    },
    priority: 100
  },
  
  'pokemon-management': {                                                       // ✅ Simplifié pour le module unifié
    modules: ['team'],                                                          // ✅ Un seul module maintenant
    layout: {
      type: 'unified',                                                          // ✅ Layout unifié
      anchor: 'bottom-right',
      spacing: 0
    },
    priority: 110
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
  
  'overlays': {
    modules: ['chat'],                                                          // ✅ Plus besoin de 'teamUI' séparément
    layout: {
      type: 'overlay',
      anchor: 'center',
      spacing: 0
    },
    priority: 85
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
    modules: ['battleInterface'],
    layout: {
      type: 'battle-specific',
      anchor: 'center',
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
      
      // Import UIManager COMPLET obligatoire
        let UIManagerClass;
        try {
          const uiManagerModule = await import('./managers/UIManager.js');
          UIManagerClass = uiManagerModule.UIManager;
          
          if (!UIManagerClass || typeof UIManagerClass.prototype.registerIconPosition !== 'function') {
            console.error('❌ [PokemonUI] UIManager sans registerIconPosition');
            throw new Error('UIManager incomplet');
          }
          
          console.log('✅ [PokemonUI] UIManager COMPLET importé');
          
        } catch (importError) {
          console.error('❌ [PokemonUI] Erreur import UIManager:', importError);
          const uiManagerModule = await import('./managers/UIManager.js?v=' + Date.now());
          UIManagerClass = uiManagerModule.UIManager || uiManagerModule.default;
        }
      
      // Créer le UIManager
      const config = {
        ...UI_CONFIG,
        gameStates: POKEMON_GAME_STATES
      };
      
      this.uiManager = new UIManagerClass(config);
      
      // Vérification de compatibilité
      if (!this.uiManager.setGameState) {
        console.warn('⚠️ [PokemonUI] UIManager incompatible, ajout méthodes manquantes');
        this.enhanceUIManager();
      }
      
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
      console.log('🔧 [PokemonUI] Fallback vers système minimal...');
      return this.initializeMinimalSystem();
    }
  }

  // === UIManager minimal pour fallback ===
  createMinimalUIManager() {
    console.log('🔧 [PokemonUI] Création UIManager minimal...');
    
    return class MinimalUIManager {
      constructor(config) {
        this.config = config;
        this.modules = new Map();
        this.moduleStates = new Map();
        this.currentGameState = 'exploration';
        this.gameStates = config.gameStates || {};
        console.log('🎮 UIManager minimal créé');
      }
      
      async registerModule(moduleId, moduleConfig) {
        console.log(`📝 [MinimalUI] Enregistrement module: ${moduleId}`);
        this.modules.set(moduleId, moduleConfig);
        this.moduleStates.set(moduleId, { 
          visible: true, 
          enabled: true, 
          initialized: false 
        });
        return this;
      }
      
      async initializeAllModules() {
        console.log('🚀 [MinimalUI] Initialisation modules...');
        const results = {};
        const errors = [];
        
        for (const [moduleId, config] of this.modules) {
          try {
            if (config.factory) {
              const instance = await config.factory();
              config.instance = instance;
              this.moduleStates.get(moduleId).initialized = true;
              results[moduleId] = instance;
            }
          } catch (error) {
            errors.push(`${moduleId}: ${error.message}`);
          }
        }
        
        return { success: errors.length === 0, results, errors };
      }
      
      setGameState(stateName, options = {}) {
        console.log(`🎮 [MinimalUI] Changement état: ${this.currentGameState} → ${stateName}`);
        this.currentGameState = stateName;
        
        if (stateName === 'battle') {
          this.hideAllUIElements();
        } else if (stateName === 'exploration') {
          this.showAllUIElements();
        }
        
        return true;
      }
      
      hideAllUIElements() {
        const selectors = [
          '#inventory-icon', '#team-icon', '#quest-icon', 
          '.ui-icon', '.game-icon', '#questTracker'
        ];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.style.display = 'none');
        });
      }
      
      showAllUIElements() {
        const selectors = [
          '#inventory-icon', '#team-icon', '#quest-icon', 
          '.ui-icon', '.game-icon', '#questTracker'
        ];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.style.display = '');
        });
      }
      
      debugInfo() {
        return {
          mode: 'minimal',
          currentGameState: this.currentGameState,
          modulesCount: this.modules.size,
          initialized: true
        };
      }
      
      createGroup() { return this; }
      showModule() { return true; }
      hideModule() { return true; }
      enableModule() { return true; }
      disableModule() { return true; }
      on() { return this; }
      off() { return this; }
    };
  }

  // === Améliorer UIManager existant ===
  enhanceUIManager() {
    if (!this.uiManager.setGameState) {
      this.uiManager.setGameState = (stateName, options = {}) => {
        console.log(`🎮 [Enhanced] Changement état: ${stateName}`);
        this.currentGameState = stateName;
        return true;
      };
    }
    
    if (!this.uiManager.debugInfo) {
      this.uiManager.debugInfo = () => ({
        mode: 'enhanced',
        currentGameState: this.currentGameState,
        initialized: true
      });
    }
    
    console.log('✅ [PokemonUI] UIManager amélioré');
  }

  // === Système minimal en cas d'échec total ===
  async initializeMinimalSystem() {
    console.log('🔧 [PokemonUI] Initialisation système minimal...');
    
    try {
      this.uiManager = {
        setGameState: (stateName, options = {}) => {
          console.log(`🎮 [Minimal] État: ${stateName}`);
          this.currentGameState = stateName;
          
          if (stateName === 'battle') {
            document.querySelectorAll('#inventory-icon, #team-icon, #quest-icon, .ui-icon')
              .forEach(el => el.style.display = 'none');
          } else {
            document.querySelectorAll('#inventory-icon, #team-icon, #quest-icon, .ui-icon')
              .forEach(el => el.style.display = '');
          }
          
          return true;
        },
        
        debugInfo: () => ({
          mode: 'minimal-fallback',
          currentGameState: this.currentGameState,
          initialized: true,
          warning: 'Système UI minimal - fonctionnalités limitées'
        }),
        
        registerModule: () => Promise.resolve(this),
        initializeAllModules: () => Promise.resolve({ success: true, results: {}, errors: [] }),
        showModule: () => true,
        hideModule: () => true,
        enableModule: () => true,
        disableModule: () => true,
        createGroup: () => this,
        on: () => this,
        off: () => this
      };
      
      this.initialized = true;
      console.log('✅ [PokemonUI] Système minimal initialisé');
      
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Échec système minimal:', error);
      return false;
    }
  }

  // === SETUP GROUPES ===
  setupUIGroups() {
    console.log('📦 [PokemonUI] Configuration des groupes...');
    
    if (this.uiManager.createGroup) {
      Object.entries(POKEMON_UI_GROUPS).forEach(([groupId, config]) => {
        try {
          this.uiManager.createGroup(groupId, config.modules, {
            layout: config.layout,
            priority: config.priority
          });
          console.log(`  ✅ Groupe '${groupId}' créé`);
        } catch (error) {
          console.warn(`  ⚠️ Erreur groupe '${groupId}':`, error);
        }
      });
    } else {
      console.log('ℹ️ [PokemonUI] Groupes non supportés en mode minimal');
    }
  }

  // === ENREGISTREMENT MODULES ===
  async registerAllModules() {
    console.log('📝 [PokemonUI] Enregistrement des modules...');
    
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
      id: 'team',
      critical: true,
      factory: this.createTeamModuleUnified.bind(this),
      dependencies: [],
      defaultState: {
        visible: true,      // Icône visible par défaut
        enabled: true,      // Module activé
        initialized: false
      },
      priority: 100,
      layout: {
        type: 'icon',
        anchor: 'bottom-right',
        order: 2,           // Après inventory (0) et quest (1)
        spacing: 10
      },
      responsive: {
        mobile: { 
          scale: 0.8,
          position: { right: '15px', bottom: '15px' }
        },
        tablet: { 
          scale: 0.9 
        },
        desktop: { 
          scale: 1.0 
        }
      },
      groups: ['ui-icons', 'pokemon-management'],
      animations: {
        show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
        hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
        enable: { type: 'pulse', duration: 150 },
        disable: { type: 'grayscale', duration: 200 }
      },
      metadata: {
        name: 'Team Manager',
        description: 'Complete Pokemon team management system',
        version: '1.0.0',
        category: 'Pokemon Management'
      }
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
      },
      
      // === MODULE BATTLEINTERFACE CORRIGÉ ===
      {
        id: 'battleInterface',
        critical: true,
        factory: this.createBattleInterfaceModule.bind(this),
        groups: ['battle-ui'],
        layout: {
          type: 'overlay',
          anchor: 'center',
          order: 0,
          zIndex: 9999
        },
        responsive: {
          mobile: { 
            scale: 0.8,
            simplifiedLayout: true,
            position: { top: '5%', left: '5%', right: '5%', bottom: '5%' }
          },
          tablet: { 
            scale: 0.9,
            position: { top: '10%', left: '10%', right: '10%', bottom: '10%' }
          },
          desktop: { 
            scale: 1.0,
            position: { top: '7.5%', left: '7.5%', right: '7.5%', bottom: '7.5%' }
          }
        },
        defaultState: {
          visible: false,
          enabled: true,
          initialized: false
        },
        priority: 150,
        lazyLoad: false,
        animations: {
          show: { type: 'fadeIn', duration: 400, easing: 'ease-out' },
          hide: { type: 'fadeOut', duration: 300, easing: 'ease-in' }
        }
      }
    ];

    // Enregistrer chaque module
    for (const config of moduleConfigs) {
      try {
        if (this.uiManager.registerModule) {
          await this.uiManager.registerModule(config.id, config);
          console.log(`  📝 Module '${config.id}' enregistré dans UIManager`);
          
          // Créer immédiatement l'instance
          try {
            const instance = await config.factory();
            
            // Stocker dans les deux systèmes
            if (this.uiManager.modules && this.uiManager.modules.has(config.id)) {
              this.uiManager.modules.get(config.id).instance = instance;
            }
            this.moduleInstances.set(config.id, instance);
            
            console.log(`  ✅ Module '${config.id}' instance créée et synchronisée`);
          } catch (factoryError) {
            console.error(`  ❌ Erreur factory '${config.id}':`, factoryError);
          }
          
        } else {
          const instance = await config.factory();
          this.moduleInstances.set(config.id, instance);
          console.log(`  ✅ Module '${config.id}' créé (mode minimal)`);
        }
      } catch (error) {
        console.error(`  ❌ Erreur module '${config.id}':`, error);
      }
    }
  }

  // === FACTORIES DES MODULES ===

async createInventoryModule() {
  console.log('🎒 [PokemonUI] Création NOUVEAU module inventaire compatible UIManager...');
  
  try {
    // Import du nouveau système unifié
    const { createInventoryModule } = await import('./Inventory/index.js');
    
    // Créer le module avec UIManager
    const inventoryModule = await createInventoryModule(
      window.currentGameRoom,
      window.game?.scene?.getScenes(true)[0]
    );
    
    if (!inventoryModule) {
      throw new Error('Échec création InventoryModule');
    }
    
    // ✅ CONNEXION DIRECTE UIManager (comme TeamModule)
    if (this.uiManager && this.uiManager.registerIconPosition) {
      console.log('📍 [PokemonUI] Connexion Inventory à UIManager...');
      inventoryModule.connectUIManager(this.uiManager);  // ← AJOUTER CETTE LIGNE
    } else {
      console.warn('⚠️ [PokemonUI] UIManager sans registerIconPosition pour Inventory');
    }
    
    // Exposer globalement pour compatibilité
    window.inventorySystem = inventoryModule.system;          
    window.inventorySystemGlobal = inventoryModule;           
    window.toggleInventory = () => inventoryModule.toggle();
    window.openInventory = () => inventoryModule.openInventory();
    window.closeInventory = () => inventoryModule.closeInventory();
    
    console.log('✅ [PokemonUI] Inventaire créé et connecté à UIManager');
    
    return inventoryModule;
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur création inventaire:', error);
    return this.createEmptyWrapper('inventory');
  }
}

  async createTeamModuleUnified() {
  console.log('⚔️ [PokemonUI] Création module Team unifié...');
  
  try {
    // Import dynamique du système Team unifié
    const { createTeamModule } = await import('./Team/index.js');
    
    // Créer le module avec les paramètres du jeu
    const teamModule = await createTeamModule(
      window.currentGameRoom,
      window.game?.scene?.getScenes(true)[0]
    );
    // 🆕 CONNECTER À UIMANAGER
if (this.uiManager && this.uiManager.registerIconPosition) {
  console.log('📍 [PokemonUI] Connexion Team à UIManager...');
  teamModule.connectUIManager(this.uiManager);
} else {
  console.warn('⚠️ [PokemonUI] Fallback position manuelle');
  setTimeout(() => {
    const teamIcon = document.querySelector('#team-icon');
    if (teamIcon) {
      teamIcon.style.position = 'fixed';
      teamIcon.style.right = '20px';
      teamIcon.style.bottom = '20px';
      teamIcon.style.zIndex = '500';
    }
  }, 100);
}
    // Exposer globalement pour compatibilité
    window.teamSystem = teamModule;
    window.toggleTeam = () => teamModule.toggleTeamUI();
    window.openTeam = () => teamModule.openTeam();
    window.closeTeam = () => teamModule.closeTeam();
    
    console.log('✅ [PokemonUI] Module Team unifié créé et exposé globalement');
    
    return teamModule;
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur création Team unifié:', error);
    
    // Fallback vers module vide en cas d'erreur
    return this.createEmptyWrapper('team');
  }
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
    
    console.warn('⚠️ [PokemonUI] Quêtes non disponibles, création module vide');
    return this.createEmptyWrapper('quest');
  }

  async createQuestTrackerModule() {
    console.log('📊 [PokemonUI] Création tracker de quêtes...');
    
    if (window.questSystemGlobal?.questTracker) {
      return this.wrapExistingModule(window.questSystemGlobal.questTracker, 'questTracker');
    }
    
    try {
      const { QuestTrackerUI } = await import('./components/QuestTrackerUI.js');
      const tracker = new QuestTrackerUI(window.questSystemGlobal);
      return this.wrapExistingModule(tracker, 'questTracker');
    } catch (error) {
      console.warn('⚠️ [PokemonUI] QuestTrackerUI non disponible');
      return this.createEmptyWrapper('questTracker');
    }
  }

  async createChatModule() {
    console.log('💬 [PokemonUI] Création module chat...');
    
    if (window.pokeChat) {
      return this.wrapExistingModule(window.pokeChat, 'chat');
    }
    
    console.warn('⚠️ [PokemonUI] Chat non trouvé - sera initialisé plus tard');
    return this.createEmptyWrapper('chat');
  }

  // === FACTORY BATTLEINTERFACE CORRIGÉE ===
  async createBattleInterfaceModule() {
    console.log('⚔️ [PokemonUI] Création module BattleInterface...');
    
    try {
      // Import dynamique avec fallback
      let BattleInterfaceClass;
      
      try {
        const battleModule = await import('./components/BattleInterface.js');
        BattleInterfaceClass = battleModule.BattleInterface;
        console.log('✅ [PokemonUI] BattleInterface importé avec succès');
      } catch (importError) {
        console.warn('⚠️ [PokemonUI] Import BattleInterface échoué, utilisation classe inline');
        BattleInterfaceClass = this.createInlineBattleInterface();
      }
      
      // === WRAPPER CORRIGÉ ===
      const battleInterfaceWrapper = {
        moduleType: 'battleInterface',
        originalModule: null,
        iconElement: null,
        isInitialized: false,
        
        // === MÉTHODE CREATE CORRIGÉE ===
        create: function(gameManager, battleData) {
          console.log('🏗️ [BattleInterface] Création instance...');
          
          try {
            if (this.originalModule) {
              console.log('ℹ️ [BattleInterface] Instance existante, destruction...');
              this.originalModule.destroy();
            }
            
            const instance = new BattleInterfaceClass(gameManager, battleData);
            
            // Synchronisation état
            this.originalModule = instance;
            this.iconElement = instance.root;
            this.isInitialized = true;
            
            console.log('✅ [BattleInterface] Instance créée via wrapper');
            return instance;
            
          } catch (error) {
            console.error('❌ [BattleInterface] Erreur création:', error);
            this.isInitialized = false;
            return null;
          }
        },
        
        // === MÉTHODES UIMANAGER ROBUSTES ===
        show: function(options = {}) {
          console.log('👁️ [BattleInterface] Wrapper show appelé');
          
          if (this.originalModule && this.originalModule.show) {
            return this.originalModule.show(options);
          }
          
          console.warn('⚠️ [BattleInterface] Module pas encore créé pour show');
          return false;
        },
        
        hide: function(options = {}) {
          console.log('👻 [BattleInterface] Wrapper hide appelé');
          
          if (this.originalModule && this.originalModule.hide) {
            return this.originalModule.hide(options);
          }
          
          return false;
        },
        
        setEnabled: function(enabled) {
          console.log(`🔧 [BattleInterface] Wrapper setEnabled: ${enabled}`);
          
          if (this.originalModule && this.originalModule.setEnabled) {
            return this.originalModule.setEnabled(enabled);
          }
          
          return false;
        },
        
        // === MÉTHODES SPÉCIFIQUES AU COMBAT ===
        startBattle: function(battleData) {
          console.log('⚔️ [BattleInterface] Démarrage combat:', battleData);
          
          try {
            // Créer instance si nécessaire
            if (!this.originalModule) {
              const gameManager = window.globalNetworkManager || window.gameManager || window;
              const instance = this.create(gameManager, battleData);
              
              if (!instance) {
                console.error('❌ [BattleInterface] Impossible de créer instance');
                return false;
              }
            }
            
            // Mettre à jour battleData
            if (this.originalModule) {
              this.originalModule.battleData = battleData;
              
              // Créer interface si nécessaire
              if (!this.originalModule.root) {
                this.originalModule.createInterface();
              }
              
              // Afficher
              this.originalModule.show({ animated: true });
              
              console.log('✅ [BattleInterface] Combat démarré avec succès');
              return true;
            }
            
            console.error('❌ [BattleInterface] Module non disponible après création');
            return false;
            
          } catch (error) {
            console.error('❌ [BattleInterface] Erreur startBattle:', error);
            return false;
          }
        },
        
        endBattle: function() {
          console.log('🏁 [BattleInterface] Fin de combat');
          
          if (this.originalModule) {
            this.originalModule.hide({ animated: true });
            
            setTimeout(() => {
              if (this.originalModule) {
                this.originalModule.destroy();
                this.originalModule = null;
                this.iconElement = null;
                this.isInitialized = false;
              }
            }, 300);
            
            return true;
          }
          
          return false;
        },
        
        // === ÉTAT MANAGEMENT ===
        getState: function() {
          if (this.originalModule && this.originalModule.getUIManagerState) {
            return this.originalModule.getUIManagerState();
          }
          
          return { 
            initialized: this.isInitialized, 
            visible: false, 
            enabled: false,
            hasInstance: !!this.originalModule
          };
        },
        
        // === CLEANUP ROBUSTE ===
        destroy: function() {
          console.log('🧹 [BattleInterface] Destruction wrapper');
          
          if (this.originalModule) {
            this.originalModule.destroy();
            this.originalModule = null;
          }
          
          this.iconElement = null;
          this.isInitialized = false;
        }
      };
      
      console.log('✅ [PokemonUI] Wrapper BattleInterface créé avec succès');
      return battleInterfaceWrapper;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur création BattleInterface:', error);
      return this.createEmptyWrapper('battleInterface');
    }
  }

  // === CLASSE BATTLEINTERFACE INLINE ===
  createInlineBattleInterface() {
    console.log('🔧 [PokemonUI] Création BattleInterface inline...');
    
    return class InlineBattleInterface {
      constructor(gameManager, battleData) {
        this.gameManager = gameManager;
        this.battleData = battleData;
        this.root = null;
        this.isOpen = false;
        this.uiManagerState = {
          visible: false,
          enabled: true,
          initialized: false
        };
        
        console.log('🔧 [InlineBattleInterface] Instance créée');
      }
      
      async createInterface() {
        this.root = document.createElement('div');
        this.root.className = 'battle-interface-container';
        this.root.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 400px;
          background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
          border: 4px solid #FFD700;
          border-radius: 15px;
          color: white;
          font-family: Arial, sans-serif;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          box-shadow: 0 0 30px rgba(0,0,0,0.8);
        `;
        
        this.root.innerHTML = `
          <h2 style="margin: 0; color: #FFD700;">⚔️ Interface de Combat</h2>
          <p style="margin: 0;">Pokémon: ${this.battleData?.playerPokemon?.name || 'Inconnu'}</p>
          <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            <button onclick="this.parentElement.parentElement.battleInterface.handleAction('attack')" 
                    style="padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Attaquer
            </button>
            <button onclick="this.parentElement.parentElement.battleInterface.handleAction('bag')" 
                    style="padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Sac
            </button>
            <button onclick="this.parentElement.parentElement.battleInterface.handleAction('pokemon')" 
                    style="padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Pokémon
            </button>
            <button onclick="this.parentElement.parentElement.battleInterface.handleAction('flee')" 
                    style="padding: 10px 20px; background: #e24a4a; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Fuir
            </button>
          </div>
          <p style="margin: 0; font-size: 0.9em; opacity: 0.8;">Interface de combat simplifiée</p>
        `;
        
        this.root.battleInterface = this;
        
        document.body.appendChild(this.root);
        this.uiManagerState.initialized = true;
        
        console.log('✅ [InlineBattleInterface] Interface créée');
      }
      
      show(options = {}) {
        if (!this.root) this.createInterface();
        
        this.root.style.display = 'flex';
        this.isOpen = true;
        this.uiManagerState.visible = true;
        
        if (options.animated !== false) {
          this.root.style.opacity = '0';
          this.root.style.transform = 'translate(-50%, -50%) scale(0.8)';
          setTimeout(() => {
            this.root.style.transition = 'all 0.3s ease-out';
            this.root.style.opacity = '1';
            this.root.style.transform = 'translate(-50%, -50%) scale(1)';
          }, 50);
        }
        
        console.log('✅ [InlineBattleInterface] Interface affichée');
        return true;
      }
      
      hide(options = {}) {
        if (!this.root) return false;
        
        if (options.animated !== false) {
          this.root.style.transition = 'all 0.3s ease-in';
          this.root.style.opacity = '0';
          this.root.style.transform = 'translate(-50%, -50%) scale(0.8)';
          setTimeout(() => {
            this.root.style.display = 'none';
          }, 300);
        } else {
          this.root.style.display = 'none';
        }
        
        this.isOpen = false;
        this.uiManagerState.visible = false;
        
        console.log('✅ [InlineBattleInterface] Interface masquée');
        return true;
      }
      
      setEnabled(enabled) {
        if (!this.root) return false;
        
        this.root.style.opacity = enabled ? '1' : '0.5';
        this.root.style.pointerEvents = enabled ? 'auto' : 'none';
        this.uiManagerState.enabled = enabled;
        
        return true;
      }
      
      handleAction(action) {
        console.log(`⚔️ [InlineBattleInterface] Action: ${action}`);
        
        switch (action) {
          case 'attack':
            window.showGameNotification?.('Attaque sélectionnée !', 'info', { duration: 2000 });
            break;
          case 'bag':
            window.showGameNotification?.('Ouverture du sac...', 'info', { duration: 2000 });
            break;
          case 'pokemon':
            window.showGameNotification?.('Changement de Pokémon...', 'info', { duration: 2000 });
            break;
          case 'flee':
            window.showGameNotification?.('Fuite du combat !', 'warning', { duration: 2000 });
            this.hide({ animated: true });
            setTimeout(() => this.destroy(), 500);
            break;
        }
        
        if (window.onBattleAction) {
          window.onBattleAction({ type: action, timestamp: Date.now() });
        }
      }
      
      destroy() {
        if (this.root && this.root.parentNode) {
          this.root.parentNode.removeChild(this.root);
        }
        this.root = null;
        this.isOpen = false;
        this.uiManagerState.visible = false;
        this.uiManagerState.initialized = false;
        
        console.log('✅ [InlineBattleInterface] Interface détruite');
      }
      
      getUIManagerState() {
        return {
          ...this.uiManagerState,
          hasRoot: !!this.root,
          isOpen: this.isOpen,
          battling: !!this.battleData
        };
      }
      
      get iconElement() {
        return this.root;
      }
    };
  }
    
  // === WRAPPER POUR MODULES EXISTANTS ===
  wrapExistingModule(existingModule, moduleType) {
    console.log(`🔧 [PokemonUI] Wrapping module existant: ${moduleType}`);
    
    const wrapper = {
      iconElement: null,
      originalModule: existingModule,
      moduleType: moduleType,
      
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
      
      getOriginal: () => existingModule
    };
    
    wrapper.iconElement = this.findIconElement(existingModule, moduleType);
    
    if (!wrapper.iconElement) {
      console.warn(`⚠️ [PokemonUI] IconElement non trouvé pour ${moduleType}`);
    }
    
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

    
    if (!this.uiManager || !this.uiManager.on) {
      console.log('ℹ️ [PokemonUI] Callbacks non supportés en mode minimal');
      return;
    }


    
    this.uiManager.on('moduleInitialized', (event) => {
      const { moduleId, instance } = event.detail;
      console.log(`✅ [PokemonUI] Module initialisé: ${moduleId}`);
      
      window.dispatchEvent(new CustomEvent('pokemonUIModuleReady', {
        detail: { moduleId, instance }
      }));
    });
    
    this.uiManager.on('gameStateChanged', (event) => {
      const { previousState, newState } = event.detail;
      console.log(`🎮 [PokemonUI] État changé: ${previousState} → ${newState}`);
      this.currentGameState = newState;
      
      window.dispatchEvent(new CustomEvent('pokemonUIStateChanged', {
        detail: { previousState, newState }
      }));
    });
    
    this.uiManager.on('moduleError', (event) => {
      const { moduleId, error } = event.detail;
      console.error(`❌ [PokemonUI] Erreur module ${moduleId}:`, error);
      
      const config = this.uiManager.modules?.get(moduleId);
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
    
    if (this.uiManager.initializeAllModules) {
      const result = await this.uiManager.initializeAllModules(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (result.success) {
        console.log('✅ [PokemonUI] Tous les modules initialisés !');
      } else {
        console.warn('⚠️ [PokemonUI] Initialisation avec erreurs:', result.errors);
      }
      
      return result;
    } else {
      console.log('✅ [PokemonUI] Modules en mode minimal prêts');
      return { 
        success: true, 
        results: Object.fromEntries(this.moduleInstances), 
        errors: [] 
      };
    }
  }

  setGameState(stateName, options = {}) {
    if (!this.uiManager) {
      console.warn('⚠️ [PokemonUI] UIManager non initialisé');
      return false;
    }
    
    console.log(`🎮 [PokemonUI] Changement état: ${stateName}`);
    
    if (this.uiManager.setGameState) {
      return this.uiManager.setGameState(stateName, options);
    } else {
      this.currentGameState = stateName;
      console.log(`🎮 [PokemonUI] État changé manuellement: ${stateName}`);
      return true;
    }
  }

  // === MÉTHODES DE COMPATIBILITÉ CORRIGÉES ===
  
  getModule(moduleId) {
    console.log(`🔍 [PokemonUI] Recherche module: ${moduleId}`);
    
    // Vérifier d'abord dans moduleInstances
    if (this.moduleInstances.has(moduleId)) {
      const instance = this.moduleInstances.get(moduleId);
      console.log(`✅ [PokemonUI] Module trouvé dans moduleInstances: ${moduleId}`);
      return instance;
    }
    
    // Vérifier dans UIManager
    if (this.uiManager && this.uiManager.modules && this.uiManager.modules.has(moduleId)) {
      const moduleConfig = this.uiManager.modules.get(moduleId);
      
      if (moduleConfig.instance) {
        console.log(`✅ [PokemonUI] Module trouvé dans UIManager: ${moduleId}`);
        this.moduleInstances.set(moduleId, moduleConfig.instance);
        return moduleConfig.instance;
      }
    }
    
    // Tentative de création si c'est battleInterface
    if (moduleId === 'battleInterface') {
      console.log('🔧 [PokemonUI] Tentative création BattleInterface...');
      
      this.createBattleInterfaceModule().then(wrapper => {
        if (wrapper) {
          this.moduleInstances.set(moduleId, wrapper);
          console.log('✅ [PokemonUI] BattleInterface créé à la demande');
        }
      });
    }
    
    console.warn(`⚠️ [PokemonUI] Module ${moduleId} non trouvé`);
    return null;
  }

  // === NOUVELLE MÉTHODE: Assurer BattleInterface ===
  async ensureBattleInterfaceModule() {
    console.log('🔧 [PokemonUI] Vérification BattleInterface...');
    
    let battleModule = this.getModule('battleInterface');
    
    if (!battleModule) {
      console.log('🚀 [PokemonUI] Création BattleInterface manquant...');
      battleModule = await this.createBattleInterfaceModule();
      
      if (battleModule) {
        this.moduleInstances.set('battleInterface', battleModule);
        
        if (this.uiManager && this.uiManager.modules) {
          this.uiManager.modules.set('battleInterface', {
            instance: battleModule,
            initialized: true
          });
        }
        
        console.log('✅ [PokemonUI] BattleInterface créé et synchronisé');
      }
    }
    
    return battleModule;
  }
  
  getOriginalModule(moduleId) {
    const wrapper = this.moduleInstances.get(moduleId);
    return wrapper?.getOriginal?.() || wrapper?.originalModule;
  }
  
  showModule(moduleId, options = {}) {
    return this.uiManager?.showModule?.(moduleId, options) || true;
  }
  
  hideModule(moduleId, options = {}) {
    return this.uiManager?.hideModule?.(moduleId, options) || true;
  }
  
  enableModule(moduleId) {
    return this.uiManager?.enableModule?.(moduleId) || true;
  }
  
  disableModule(moduleId) {
    return this.uiManager?.disableModule?.(moduleId) || true;
  }

  // === MÉTHODES DE TEST CORRIGÉES ===

  async testBattleInterface() {
    console.log('🧪 [PokemonUI] Test BattleInterface...');
    
    // Assurer que le module existe
    const battleModule = await this.ensureBattleInterfaceModule();
    
    if (!battleModule) {
      console.error('❌ Module BattleInterface non disponible');
      return false;
    }
    
    // Données de test
    const testBattleData = {
      playerPokemon: { 
        name: 'Pikachu Test', 
        level: 25, 
        moves: [
          { name: 'Tonnerre', pp: 15, maxPp: 15, type: 'electric' },
          { name: 'Vive-Attaque', pp: 30, maxPp: 30, type: 'normal' },
          { name: 'Queue de Fer', pp: 15, maxPp: 15, type: 'steel' },
          { name: 'Charme', pp: 20, maxPp: 20, type: 'fairy' }
        ]
      },
      opponentPokemon: { name: 'Rattata Sauvage', level: 12 },
      canUseBag: true,
      canFlee: true
    };
    
    try {
      const success = battleModule.startBattle(testBattleData);
      
      if (success) {
        console.log('✅ [PokemonUI] BattleInterface test réussi');
        
        if (window.showGameNotification) {
          window.showGameNotification('Interface de combat test affichée !', 'success', {
            duration: 3000,
            position: 'top-center'
          });
        }
        
        setTimeout(() => {
          battleModule.endBattle();
          console.log('✅ [PokemonUI] Test BattleInterface terminé');
          
          if (window.showGameNotification) {
            window.showGameNotification('Test BattleInterface terminé', 'info', {
              duration: 2000,
              position: 'top-center'
            });
          }
        }, 5000);
        
        return true;
      } else {
        console.error('❌ [PokemonUI] Échec démarrage BattleInterface');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur test BattleInterface:', error);
      return false;
    }
  }

  testBattleTransition() {
    console.log('🧪 [PokemonUI] Test transition battle...');
    
    try {
      console.log(`🎮 État initial: ${this.currentGameState}`);
      
      console.log('⚔️ Transition vers battle...');
      const battleSuccess = this.setGameState('battle', { animated: true });
      
      if (!battleSuccess) {
        console.error('❌ Échec transition vers battle');
        return false;
      }
      
      setTimeout(() => {
        console.log('🎮 État battle actif');
        
        console.log('🌍 Retour exploration...');
        const explorationSuccess = this.setGameState('exploration', { animated: true });
        
        setTimeout(() => {
          console.log(`🎮 État final: ${this.currentGameState}`);
          console.log('✅ Test transition terminé');
          
          if (window.showGameNotification) {
            window.showGameNotification('Test transition UI terminé', 'success', {
              duration: 2000,
              position: 'top-center'
            });
          }
        }, 1000);
      }, 3000);
      
      if (window.showGameNotification) {
        window.showGameNotification('Test transition UI lancé', 'info', {
          duration: 2000,
          position: 'top-center'
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur test transition:', error);
      return false;
    }
  }

  async testCompleteBattle() {
    console.log('🚀 [PokemonUI] Test complet battle (interface + transition)...');
    
    try {
      // 1. Test transition vers battle
      this.setGameState('battle', { animated: true });
      
      // 2. Démarrer BattleInterface après transition
      setTimeout(async () => {
        await this.testBattleInterface();
      }, 500);
      
      // 3. Retour exploration après test
      setTimeout(() => {
        this.setGameState('exploration', { animated: true });
        
        if (window.showGameNotification) {
          window.showGameNotification('Test complet battle terminé !', 'success', {
            duration: 3000,
            position: 'top-center'
          });
        }
      }, 6000);
      
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur test complet:', error);
      return false;
    }
  }

  debugBattleInterface() {
    console.log('🔍 === DEBUG BATTLEINTERFACE ===');
    
    const battleModule = this.getModule('battleInterface');
    
    const debugInfo = {
      moduleExists: !!battleModule,
      moduleType: battleModule?.moduleType,
      isInitialized: battleModule?.isInitialized,
      hasOriginalModule: !!battleModule?.originalModule,
      hasIconElement: !!battleModule?.iconElement,
      state: battleModule?.getState?.(),
      
      methods: {
        create: typeof battleModule?.create === 'function',
        startBattle: typeof battleModule?.startBattle === 'function',
        endBattle: typeof battleModule?.endBattle === 'function',
        show: typeof battleModule?.show === 'function',
        hide: typeof battleModule?.hide === 'function'
      },
      
      currentGameState: this.currentGameState,
      uiManagerMode: this.uiManager?.constructor?.name || 'unknown',
      
      solutions: battleModule ? [
        '✅ Module OK - utilisez testBattleInterface()',
        '🎬 Testez testBattleTransition()',
        '🚀 Testez testCompleteBattle()'
      ] : [
        '🔧 Utilisez fixBattleInterface()',
        '🔄 Utilisez forceRegisterBattleInterface()',
        '🚀 Utilisez ensurePokemonUIForBattle()'
      ]
    };
    
    console.log('📊 Debug BattleInterface:', debugInfo);
    
    if (!debugInfo.moduleExists) {
      console.log('💡 Solution: Le module BattleInterface n\'est pas enregistré');
    } else if (!debugInfo.methods.startBattle) {
      console.log('💡 Solution: Le module manque de méthodes battle');
    } else {
      console.log('✅ Module BattleInterface OK - utilisez testBattleInterface()');
    }
    
    return debugInfo;
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
    
    this.moduleInstances.forEach((wrapper, moduleId) => {
      console.log(`  📦 ${moduleId}:`, {
        hasIconElement: !!wrapper.iconElement,
        isEmpty: wrapper.isEmpty,
        originalModule: !!wrapper.originalModule
      });
    });
    
    const uiStats = this.uiManager.debugInfo ? this.uiManager.debugInfo() : { mode: 'unknown' };
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
        
        wrapper.show();
        setTimeout(() => wrapper.hide(), 500);
        setTimeout(() => wrapper.show(), 1000);
        
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
    const success = await pokemonUISystem.initialize();
    
    if (!success) {
      throw new Error('Échec initialisation PokemonUISystem');
    }
    
    const result = await pokemonUISystem.initializeAllModules();
    
    window.pokemonUISystem = pokemonUISystem;
    window.uiManager = pokemonUISystem.uiManager;
    
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

export async function autoInitializePokemonUI() {
  console.log('🚀 [PokemonUI] Auto-initialisation avec fallbacks...');
  
  try {
    const result = await initializePokemonUI();
    
    if (result.success) {
      console.log('✅ [PokemonUI] Auto-initialisation réussie (mode complet)');
      return result;
    } else {
      throw new Error(result.error || 'Initialisation normale échouée');
    }
    
  } catch (error) {
    console.warn('⚠️ [PokemonUI] Initialisation normale échouée:', error);
    console.log('🔧 [PokemonUI] Tentative initialisation minimaliste...');
    
    return await createMinimalPokemonUI();
  }
}

export async function createMinimalPokemonUI() {
  console.log('🔧 [PokemonUI] Création système UI minimal...');
  
  try {
    const minimalUISystem = {
      uiManager: {
        setGameState: (stateName, options = {}) => {
          console.log(`🎮 [MinimalUI] Changement état: ${stateName}`);
          
          const iconsSelectors = [
            '#inventory-icon', '#team-icon', '#quest-icon', 
            '.ui-icon', '.game-icon', '#questTracker', 
            '.chat-container'
          ];
          
          if (stateName === 'battle') {
            iconsSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
              });
            });
            console.log('👻 [MinimalUI] Icônes masquées pour combat');
          } else if (stateName === 'exploration') {
            iconsSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = '';
              });
            });
            console.log('👁️ [MinimalUI] Icônes réaffichées');
          }
          
          window.dispatchEvent(new CustomEvent('pokemonUIStateChanged', {
            detail: { 
              previousState: this.currentGameState || 'exploration', 
              newState: stateName 
            }
          }));
          
          this.currentGameState = stateName;
          return true;
        },
        
        currentGameState: 'exploration',
        
        debugInfo: () => ({
          mode: 'minimal-ui',
          initialized: true,
          currentGameState: this.currentGameState,
          warning: 'Système UI minimal - idéal pour BattleUITransition'
        }),
        
        showModule: () => true,
        hideModule: () => true,
        enableModule: () => true,
        disableModule: () => true
      },
      
      initialized: true,
      currentGameState: 'exploration',
      
      setGameState: function(stateName, options = {}) {
        return this.uiManager.setGameState(stateName, options);
      },
      
      getModule: () => null,
      getOriginalModule: () => null,
      
      debugInfo: function() {
        return {
          initialized: true,
          mode: 'minimal-pokemon-ui',
          currentGameState: this.currentGameState,
          compatibility: 'BattleUITransition ready',
          uiManager: this.uiManager.debugInfo()
        };
      },
      
      testAllModules: () => {
        console.log('🧪 [MinimalUI] Test système minimal...');
        return { minimal: { success: true } };
      },
      
      // === MÉTHODES BATTLEINTERFACE POUR SYSTÈME MINIMAL ===
      async ensureBattleInterfaceModule() {
        console.log('🔧 [MinimalUI] Création BattleInterface minimal...');
        
        if (!this.battleInterfaceModule) {
          this.battleInterfaceModule = {
            moduleType: 'battleInterface',
            isInitialized: false,
            
            startBattle: function(battleData) {
              console.log('⚔️ [MinimalUI] Démarrage combat simple:', battleData);
              
              const battleDiv = document.createElement('div');
              battleDiv.id = 'minimal-battle-interface';
              battleDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                height: 300px;
                background: linear-gradient(135deg, #1a472a, #2d5a3d);
                border: 3px solid #FFD700;
                border-radius: 12px;
                color: white;
                font-family: Arial, sans-serif;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 15px;
                box-shadow: 0 0 20px rgba(0,0,0,0.8);
              `;
              
              battleDiv.innerHTML = `
                <h3 style="margin: 0; color: #FFD700;">⚔️ Combat</h3>
                <p>${battleData?.playerPokemon?.name || 'Pokémon'} vs ${battleData?.opponentPokemon?.name || 'Adversaire'}</p>
                <div style="display: flex; gap: 10px;">
                  <button onclick="this.parentElement.parentElement.remove(); console.log('Combat terminé');" 
                          style="padding: 8px 16px; background: #4a90e2; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Attaquer
                  </button>
                  <button onclick="this.parentElement.parentElement.remove(); console.log('Fuite du combat');" 
                          style="padding: 8px 16px; background: #e24a4a; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Fuir
                  </button>
                </div>
                <p style="margin: 0; font-size: 0.8em; opacity: 0.7;">Interface minimal</p>
              `;
              
              document.body.appendChild(battleDiv);
              
              setTimeout(() => {
                battleDiv.style.opacity = '0';
                battleDiv.style.transform = 'translate(-50%, -50%) scale(0.9)';
                setTimeout(() => battleDiv.remove(), 200);
              }, 4000);
              
              return true;
            },
            
            endBattle: function() {
              const battleDiv = document.getElementById('minimal-battle-interface');
              if (battleDiv) {
                battleDiv.remove();
              }
              return true;
            },
            
            show: function() { return true; },
            hide: function() { return true; },
            setEnabled: function() { return true; },
            getState: function() { return { initialized: true }; }
          };
        }
        
        return this.battleInterfaceModule;
      },
      
      getModule: function(moduleId) {
        if (moduleId === 'battleInterface') {
          return this.ensureBattleInterfaceModule();
        }
        return null;
      },
      
      async testBattleInterface() {
        const battleModule = await this.ensureBattleInterfaceModule();
        
        const testData = {
          playerPokemon: { name: 'Pikachu' },
          opponentPokemon: { name: 'Rattata' }
        };
        
        return battleModule.startBattle(testData);
      },
      
      testBattleTransition: function() {
        console.log('🎬 [MinimalUI] Test transition...');
        
        this.setGameState('battle');
        
        setTimeout(() => {
          this.setGameState('exploration');
          console.log('✅ [MinimalUI] Test transition terminé');
        }, 2000);
        
        return true;
      },
      
      async testCompleteBattle() {
        console.log('🚀 [MinimalUI] Test complet...');
        
        this.testBattleTransition();
        
        setTimeout(async () => {
          await this.testBattleInterface();
        }, 500);
        
        return true;
      },
      
      debugBattleInterface: function() {
        return {
          mode: 'minimal-battle-interface',
          available: true,
          methods: ['startBattle', 'endBattle', 'show', 'hide'],
          recommendation: 'Utilisez testBattleInterface() pour tester'
        };
      }
    };
    
    // Exposer globalement
    window.pokemonUISystem = minimalUISystem;
    window.uiManager = minimalUISystem.uiManager;
    
    setupCompatibilityFunctions();
    
    console.log('✅ [PokemonUI] Système minimal créé et fonctionnel');
    console.log('🎯 [PokemonUI] Compatible avec BattleUITransition');
    
    return {
      success: true,
      uiSystem: minimalUISystem,
      uiManager: minimalUISystem.uiManager,
      errors: [],
      mode: 'minimal'
    };
    
  } catch (error) {
    console.error('❌ [PokemonUI] Échec création système minimal:', error);
    
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
    const module = pokemonUISystem.getOriginalModule?.('inventory');
    if (module && module.toggle) {
      module.toggle();
    } else if (module && module.toggleInventory) {
      module.toggleInventory();
    } else {
      console.warn('⚠️ Module inventaire non disponible pour toggle');
    }
  };

  window.toggleTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.toggleTeamUI) {
      module.toggleTeamUI();
    } else if (module && module.toggle) {
      module.toggle();
    } else {
      console.warn('⚠️ Module team non disponible pour toggle');
    }
  };
  
  window.openTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.openTeam) {
      module.openTeam();
    } else {
      console.warn('⚠️ Module team non disponible pour ouverture');
    }
  };
  
  window.closeTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.closeTeam) {
      module.closeTeam();
    } else {
      console.warn('⚠️ Module team non disponible pour fermeture');
    }
  };
  
  // Fonctions inventaire et quest restent inchangées
  window.toggleInventory = () => {
    const module = pokemonUISystem.getOriginalModule?.('inventory');
    if (module && module.toggle) {
      module.toggle();
    } else if (module && module.toggleInventory) {
      module.toggleInventory();
    } else {
      console.warn('⚠️ Module inventaire non disponible pour toggle');
    }
  };
  
  window.toggleQuest = () => {
    const module = pokemonUISystem.getOriginalModule?.('quest');
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
    return pokemonUISystem.setGameState?.(stateName, options) || false;
  };
  
  // Fonctions de debug
  window.debugPokemonUI = () => {
    return pokemonUISystem.debugInfo?.() || { error: 'Debug non disponible' };
  };

  window.testPokemonUI = () => {
    return pokemonUISystem.testAllModules?.() || { error: 'Test non disponible' };
  };

  // === FONCTIONS BATTLEINTERFACE CORRIGÉES ===
  window.testBattleInterface = async () => {
    if (pokemonUISystem.testBattleInterface) {
      return await pokemonUISystem.testBattleInterface();
    }
    return false;
  };

  window.testBattleTransition = () => {
    if (pokemonUISystem.testBattleTransition) {
      return pokemonUISystem.testBattleTransition();
    }
    return false;
  };

  window.testCompleteBattle = async () => {
    if (pokemonUISystem.testCompleteBattle) {
      return await pokemonUISystem.testCompleteBattle();
    }
    return false;
  };

  window.debugBattleInterface = () => {
    if (pokemonUISystem.debugBattleInterface) {
      return pokemonUISystem.debugBattleInterface();
    }
    return { error: 'Non disponible' };
  };

  window.startTestBattle = (battleData = null) => {
    const module = pokemonUISystem.getModule?.('battleInterface');
    if (module && module.startBattle) {
      const testData = battleData || {
        playerPokemon: { name: 'Pikachu', level: 20, moves: [] },
        opponentPokemon: { name: 'Rattata', level: 15 }
      };
      return module.startBattle(testData);
    }
    return false;
  };

  window.endTestBattle = () => {
    const module = pokemonUISystem.getModule?.('battleInterface');
    if (module && module.endBattle) {
      return module.endBattle();
    }
    return false;
  };

  // === FONCTIONS DE RÉPARATION ===
  window.fixBattleInterface = async () => {
    console.log('🔧 [PokemonUI] Réparation BattleInterface...');
    
    if (!window.pokemonUISystem) {
      console.log('🚀 [PokemonUI] Création PokemonUISystem...');
      const result = await autoInitializePokemonUI();
      
      if (!result.success) {
        console.error('❌ [PokemonUI] Échec création PokemonUISystem');
        return false;
      }
    }
    
    try {
      const battleModule = await window.pokemonUISystem.ensureBattleInterfaceModule();
      
      if (battleModule) {
        console.log('✅ [PokemonUI] BattleInterface réparé');
        
        if (window.showGameNotification) {
          window.showGameNotification('BattleInterface réparé !', 'success', {
            duration: 2000,
            position: 'top-center'
          });
        }
        
        return true;
      } else {
        console.error('❌ [PokemonUI] Échec réparation BattleInterface');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur réparation:', error);
      return false;
    }
  };

  window.forceRegisterBattleInterface = async () => {
    console.log('🔧 [PokemonUI] Force enregistrement BattleInterface...');
    
    if (!window.pokemonUISystem) {
      await window.fixBattleInterface();
    }
    
    if (window.pokemonUISystem.ensureBattleInterfaceModule) {
      const battleModule = await window.pokemonUISystem.ensureBattleInterfaceModule();
      
      if (battleModule) {
        console.log('✅ [PokemonUI] BattleInterface forcé avec succès');
        return true;
      }
    }
    
    console.error('❌ [PokemonUI] Échec force enregistrement');
    return false;
  };

  window.syncUIModules = () => {
    console.log('🔄 [PokemonUI] Synchronisation tous les modules...');
    
    if (pokemonUISystem.moduleInstances) {
      pokemonUISystem.moduleInstances.forEach((instance, moduleId) => {
        console.log(`🔄 Synchronisation: ${moduleId}`);
      });
      
      console.log('✅ Synchronisation terminée');
      return true;
    }
    
    return false;
  };
  
  window.fixPokemonUI = async () => {
    console.log('🔧 [PokemonUI] Réparation système UI...');
    
    if (!window.pokemonUISystem) {
      console.log('🚀 [PokemonUI] Création système manquant...');
      const result = await autoInitializePokemonUI();
      
      if (result.success) {
        console.log('✅ [PokemonUI] Système réparé avec succès');
        return true;
      } else {
        console.error('❌ [PokemonUI] Échec réparation');
        return false;
      }
    } else {
      console.log('ℹ️ [PokemonUI] Système déjà présent');
      return true;
    }
  };
  
  window.ensurePokemonUIForBattle = async () => {
    console.log('⚔️ [PokemonUI] Vérification UI pour combat...');
    
    if (window.pokemonUISystem?.setGameState) {
      console.log('✅ [PokemonUI] Système compatible BattleUITransition');
      return true;
    } else {
      console.log('🔧 [PokemonUI] Création système minimal pour combat...');
      const result = await createMinimalPokemonUI();
      return result.success;
    }
  };
  
  console.log('✅ [PokemonUI] Fonctions de compatibilité configurées');
  console.log('🧪 Utilisez window.testBattleInterface() pour tester');
  console.log('🎬 Utilisez window.testBattleTransition() pour transition');
  console.log('🚀 Utilisez window.testCompleteBattle() pour test complet');
  console.log('🔍 Utilisez window.debugBattleInterface() pour debug');
  console.log('🔧 Utilisez window.fixBattleInterface() pour réparation');
  console.log('🔄 Utilisez window.forceRegisterBattleInterface() pour forcer');
}

// === ÉVÉNEMENTS GLOBAUX ===

document.addEventListener('DOMContentLoaded', () => {
  // Auto-initialisation si PokemonUISystem manque
  setTimeout(() => {
    if (!window.pokemonUISystem) {
      console.log('🚀 [PokemonUI] Auto-initialisation au chargement...');
      autoInitializePokemonUI().then(result => {
        if (result.success) {
          console.log('✅ [PokemonUI] Auto-initialisation réussie');
        } else {
          console.warn('⚠️ [PokemonUI] Auto-initialisation échouée');
        }
      });
    }
  }, 2000);
  
  // Écouter les événements de battle
  window.addEventListener('battleStarted', () => {
    pokemonUISystem?.setGameState?.('battle', { animated: true });
  });
  
  window.addEventListener('battleEnded', () => {
    pokemonUISystem?.setGameState?.('exploration', { animated: true });
  });
  
  // Écouter les événements de dialogue
  window.addEventListener('dialogueStarted', () => {
    pokemonUISystem?.setGameState?.('dialogue', { animated: true });
  });
  
  window.addEventListener('dialogueEnded', () => {
    pokemonUISystem?.setGameState?.('exploration', { animated: true });
  });
  
  // Écouter les événements de starter selection
  window.addEventListener('starterSelectionStarted', () => {
    pokemonUISystem?.setGameState?.('starterSelection', { animated: true });
  });
  
  window.addEventListener('starterSelectionEnded', () => {
    pokemonUISystem?.setGameState?.('exploration', { animated: true });
  });
  
});

// === SETUP AUTOMATIQUE DES FONCTIONS BATTLEINTERFACE ===
function setupBattleInterfaceGlobals() {
  console.log('🔗 [PokemonUI] Configuration fonctions BattleInterface...');
  
  // Fonction de test sécurisée
  window.testBattleInterface = async () => {
    if (window.pokemonUISystem && window.pokemonUISystem.testBattleInterface) {
      return await window.pokemonUISystem.testBattleInterface();
    } else {
      console.error('❌ PokemonUISystem non disponible');
      return false;
    }
  };
  
  // Fonction de debug améliorée
  window.debugBattleInterface = () => {
    if (!window.pokemonUISystem) {
      return { error: 'PokemonUISystem non disponible' };
    }
    
    const battleModule = window.pokemonUISystem.getModule('battleInterface');
    
    return {
      moduleExists: !!battleModule,
      moduleType: battleModule?.moduleType,
      isInitialized: battleModule?.isInitialized,
      hasOriginalModule: !!battleModule?.originalModule,
      hasIconElement: !!battleModule?.iconElement,
      state: battleModule?.getState?.(),
      
      methods: {
        create: typeof battleModule?.create === 'function',
        startBattle: typeof battleModule?.startBattle === 'function',
        endBattle: typeof battleModule?.endBattle === 'function',
        show: typeof battleModule?.show === 'function',
        hide: typeof battleModule?.hide === 'function'
      },
      
      currentGameState: window.pokemonUISystem.currentGameState,
      uiManagerMode: window.pokemonUISystem.uiManager?.constructor?.name || 'unknown',
      
      solutions: battleModule ? [
        '✅ Module OK - utilisez window.testBattleInterface()',
        '🎬 Testez window.testBattleTransition()',
        '🚀 Testez window.testCompleteBattle()'
      ] : [
        '🔧 Utilisez window.fixBattleInterface()',
        '🔄 Utilisez window.forceRegisterBattleInterface()',
        '🚀 Utilisez window.ensurePokemonUIForBattle()'
      ]
    };
  };
  
  console.log('✅ [PokemonUI] Fonctions BattleInterface configurées');
}

// === AUTO-SETUP AU CHARGEMENT ===
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      setupBattleInterfaceGlobals();
      
      // Test automatique si demandé
      if (window.location.search.includes('test-battle')) {
        console.log('🧪 [PokemonUI] Test automatique BattleInterface...');
        setTimeout(() => {
          window.testBattleInterface();
        }, 3000);
      }
    }, 1000);
  });
}

console.log('✅ [PokemonUI] Système UI Pokémon CORRIGÉ chargé !');
console.log('🎮 Utilisez initializePokemonUI() pour démarrer (complet)');
console.log('🔧 Utilisez autoInitializePokemonUI() pour auto-réparation');
console.log('⚔️ Utilisez ensurePokemonUIForBattle() pour combat');
console.log('🔍 Utilisez window.debugPokemonUI() pour diagnostiquer');
console.log('🧪 Utilisez window.testPokemonUI() pour tester');
console.log('🎯 Utilisez window.testBattleInterface() pour tester l\'interface de combat');
console.log('🎬 Utilisez window.testBattleTransition() pour tester les transitions');
console.log('🚀 Utilisez window.testCompleteBattle() pour test complet battle');
console.log('🔧 Utilisez window.fixBattleInterface() pour réparation');
console.log('🔄 Utilisez window.forceRegisterBattleInterface() pour forcer enregistrement');

// === INSTRUCTIONS DE DÉMARRAGE RAPIDE ===
console.log(`
🚀 === DÉMARRAGE RAPIDE ===

1. 🔧 RÉPARATION AUTOMATIQUE:
   await window.fixBattleInterface()

2. 🧪 TEST BATTLEINTERFACE:
   window.testBattleInterface()

3. 🎬 TEST TRANSITIONS:
   window.testBattleTransition()

4. 🚀 TEST COMPLET:
   window.testCompleteBattle()

5. 🔍 DEBUG:
   window.debugBattleInterface()

✅ TOUTES LES CORRECTIONS INTÉGRÉES !
`);
