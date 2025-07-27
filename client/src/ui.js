// client/src/ui.js - Système UI Manager centralisé pour Pokémon MMO
// ✅ Version CONSERVATRICE - Fix MINIMAL seulement pour Quest

import { UIManager } from './managers/UIManager.js';

// === CONFIGURATION UI MANAGER POKÉMON MMO ===
const UI_CONFIG = {
  debug: false,
  
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
  visibleModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker', 'options'],
  enabledModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker', 'options'],
  hiddenModules: [],
  disabledModules: [],
  responsive: {
    mobile: { 
      hiddenModules: ['questTracker'], 
      visibleModules: ['inventory', 'quest', 'pokedex', 'team']
    },
    tablet: { 
      visibleModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker']
    }
  }
},
  
battle: {
  visibleModules: ['options'], // ✅ Options accessible même en bataille
  enabledModules: [],
  hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'pokedex'],
  disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'pokedex']
},
  
pokemonCenter: {
  visibleModules: ['team', 'inventory', 'pokedex', 'options'],
  enabledModules: ['team', 'inventory', 'pokedex', 'options'],
  hiddenModules: ['questTracker'],
  disabledModules: ['quest']
},
  
  dialogue: {
  visibleModules: ['inventory', 'team', 'quest', 'options'],
  enabledModules: ['options'], // ✅ Seul Options est cliquable pendant dialogue
    hiddenModules: ['questTracker'],
    disabledModules: ['inventory', 'team', 'quest']
  },
  
menu: {
  visibleModules: ['inventory', 'quest', 'pokedex', 'team', 'options'],
  enabledModules: ['inventory', 'quest', 'pokedex', 'team', 'options'],
  hiddenModules: ['questTracker'],
  disabledModules: []
}
};

// === GROUPES LOGIQUES POKÉMON ===
const POKEMON_UI_GROUPS = {
  'ui-icons': {
    modules: ['inventory', 'quest', 'pokedex', 'team'],
    layout: {
      type: 'horizontal',
      anchor: 'bottom-right',
      spacing: 10,
      order: ['inventory', 'quest', 'pokedex', 'team']
    },
    priority: 100
  },
  'panels': {
    modules: ['questTracker'],
    layout: {
      type: 'vertical',
      anchor: 'top-right',
      spacing: 15
    },
    priority: 90
  },
  'weather': {
    modules: ['timeWeather'],
    layout: {
      type: 'horizontal',
      anchor: 'top-right',
      spacing: 10,
      order: ['timeWeather']
    },
    priority: 99
  },
  'options': {
    modules: ['options'],
    layout: {
      type: 'icon',
      anchor: 'top-right',
      spacing: 10,
      order: ['options']
    },
    priority: 999
  }
};


// === CLASSE UI SYSTEM POKÉMON ===
export class PokemonUISystem {
  constructor() {
    this.uiManager = null;
    this.initialized = false;
    this.moduleInstances = new Map();
    this.currentGameState = 'exploration';
  }

  // === INITIALISATION ===
  async initialize() {
    try {
      const UIManagerClass = await this.loadUIManager();
      
      const config = {
        ...UI_CONFIG,
        gameStates: POKEMON_GAME_STATES
      };
      
      this.uiManager = new UIManagerClass(config);
      
      this.setupUIGroups();
      await this.registerAllModules();
      this.setupGlobalCallbacks();
      
      this.initialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur initialisation:', error);
      return this.initializeMinimalSystem();
    }
  }

  async loadUIManager() {
    try {
      const uiManagerModule = await import('./managers/UIManager.js');
      const UIManagerClass = uiManagerModule.UIManager;
      
      if (!UIManagerClass || typeof UIManagerClass.prototype.registerIconPosition !== 'function') {
        throw new Error('UIManager incomplet');
      }
      
      return UIManagerClass;
      
    } catch (importError) {
      const uiManagerModule = await import('./managers/UIManager.js?v=' + Date.now());
      return uiManagerModule.UIManager || uiManagerModule.default;
    }
  }

  async initializeMinimalSystem() {
    this.uiManager = {
      setGameState: (stateName) => {
        this.currentGameState = stateName;
        
        const iconsSelectors = [
          '#inventory-icon', '#team-icon', '#quest-icon', 
          '.ui-icon', '#questTracker'
        ];
        
        if (stateName === 'battle') {
          iconsSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.style.display = 'none';
            });
          });
        } else if (stateName === 'exploration') {
          iconsSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.style.display = '';
            });
          });
        }
        
        return true;
      },
      
      debugInfo: () => ({
        mode: 'minimal-ui',
        currentGameState: this.currentGameState,
        initialized: true
      }),
      
      showModule: () => true,
      hideModule: () => true,
      enableModule: () => true,
      disableModule: () => true,
      registerModule: () => Promise.resolve(this),
      initializeAllModules: () => Promise.resolve({ success: true, results: {}, errors: [] })
    };
    
    this.initialized = true;
    return true;
  }

  // === SETUP GROUPES ===
  setupUIGroups() {
    if (this.uiManager.createGroup) {
      Object.entries(POKEMON_UI_GROUPS).forEach(([groupId, config]) => {
        try {
          this.uiManager.createGroup(groupId, config.modules, {
            layout: config.layout,
            priority: config.priority
          });
        } catch (error) {
          console.warn(`⚠️ Erreur groupe '${groupId}':`, error);
        }
      });
    }
  }

  // === ENREGISTREMENT MODULES CORRIGÉ ===
  async registerAllModules() {
    const moduleConfigs = [
      {
        id: 'inventory',
        critical: true,
        factory: this.createInventoryModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 0, // ✅ Position 1 (à gauche)
          spacing: 10
        },
        priority: 100,
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Inventory System',
          description: 'Complete inventory management system',
          version: '1.0.0',
          category: 'Inventory Management'
        }
      },     
      {
        id: 'quest',
        critical: false,
        factory: this.createQuestModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 1, // ✅ Position 2
          spacing: 10
        },
        priority: 90,
        // ✅ FIX PRINCIPAL: Journal fermé par défaut !
        defaultState: {
          visible: false, // ✅ CORRECTION JOURNAL FERMÉ
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Quest System',
          description: 'Complete quest management system with progression tracking',
          version: '1.0.0',
          category: 'Quest Management'
        }
      },
      {
        id: 'pokedex',
        critical: false,
        factory: this.createPokedexModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 2, // ✅ Position 3
          spacing: 10
        },
        priority: 85,
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Pokédex National',
          description: 'Complete Pokédex system with discovery tracking',
          version: '1.0.0',
          category: 'Data Management'
        }
      },
      {
        id: 'team',
        critical: true,
        factory: this.createTeamModule.bind(this),
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        priority: 100,
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 3, // ✅ FIX ORDRE: Position 4 (à droite)
          spacing: 10
        },
        groups: ['ui-icons'],
        metadata: {
          name: 'Team Manager',
          description: 'Complete Pokemon team management system',
          version: '1.0.0',
          category: 'Pokemon Management'
        }
      },
      {
        id: 'timeWeather',
        critical: false,
        factory: async () => {
          const { createTimeWeatherModule } = await import('./Weather/TimeWeatherModule.js');
          return createTimeWeatherModule();
        },
        groups: ['weather'],
        layout: {
          type: 'icon',
          anchor: 'top-right',
          order: 50,
          spacing: 10
        },
        priority: 50,
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Time & Weather',
          description: 'Real-time weather and time tracking system',
          version: '1.0.0',
          category: 'Environment'
        }
      },
{
        id: 'options',
        critical: false,
        // ✅ FIX: Utiliser factory function bind comme Team
        factory: this.createOptionsModule.bind(this),
        groups: ['options'],
        layout: {
          type: 'icon',
          anchor: 'top-right',
          order: 100, // Position isolée comme Team ordre 3
          spacing: 10
        },
        priority: 999, // Priorité maximale
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Options System',
          description: 'Game settings and preferences management',
          version: '1.0.0',
          category: 'System',
          singleton: true
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
        priority: 80,
        defaultState: {
          visible: false, // ✅ Masqué par défaut, géré par QuestUI
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Quest Tracker',
          description: 'Floating quest objectives tracker',
          version: '1.0.0',
          category: 'Quest Management'
        }
      }
    ];

    for (const config of moduleConfigs) {
      try {
        if (this.uiManager.registerModule) {
          await this.uiManager.registerModule(config.id, config);
        } else {
          const instance = await config.factory();
          this.moduleInstances.set(config.id, instance);
        }
      } catch (error) {
        console.error(`❌ Erreur module '${config.id}':`, error);
      }
    }
  }

  // === FACTORIES DES MODULES (ORIGINALES - PAS MODIFIÉES) ===

  async createInventoryModule() {
    try {
      const { createInventoryModule } = await import('./Inventory/index.js');
      
      const inventoryModule = await createInventoryModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (!inventoryModule) {
        throw new Error('Échec création InventoryModule');
      }
      
      if (this.uiManager && this.uiManager.registerIconPosition) {
        if (!inventoryModule.connectUIManager) {
          inventoryModule.connectUIManager = (uiManager) => {
            if (inventoryModule.icon && inventoryModule.icon.iconElement) {
              uiManager.registerIconPosition('inventory', inventoryModule.icon.iconElement, {
                anchor: 'bottom-right',
                order: 0,
                spacing: 10,
                size: { width: 70, height: 80 }
              });
              return true;
            }
            return false;
          };
        }
        
        inventoryModule.connectUIManager(this.uiManager);
      }
      
      window.inventorySystem = inventoryModule.system;          
      window.inventorySystemGlobal = inventoryModule;           
      window.toggleInventory = () => inventoryModule.toggle();
      window.openInventory = () => inventoryModule.openInventory();
      window.closeInventory = () => inventoryModule.closeInventory();
      
      return inventoryModule;
      
    } catch (error) {
      console.error('❌ Erreur création inventaire:', error);
      return this.createEmptyWrapper('inventory');
    }
  }

  async createTeamModule() {
    try {
      const { createTeamModule } = await import('./Team/index.js');
      
      const teamModule = await createTeamModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (!teamModule) {
        throw new Error('Échec création TeamModule');
      }
      
      if (this.uiManager && this.uiManager.registerIconPosition) {
        if (teamModule.icon && teamModule.icon.iconElement) {
          teamModule.connectUIManager(this.uiManager);
        }
      }
      
      if (teamModule.forceCloseUI) {
        teamModule.forceCloseUI();
      }
      
      window.teamSystem = teamModule;
      window.teamSystemGlobal = teamModule;
      window.toggleTeam = () => teamModule.toggleTeamUI();
      window.openTeam = () => teamModule.openTeam();
      window.closeTeam = () => teamModule.closeTeam();
      window.forceCloseTeam = () => teamModule.forceCloseUI ? teamModule.forceCloseUI() : teamModule.closeTeam();
      
      return teamModule;
      
    } catch (error) {
      console.error('❌ Erreur création Team:', error);
      return this.createEmptyWrapper('team');
    }
  }

  async createPokedexModule() {
    try {
      console.log('🚀 [PokemonUI] Création module Pokédex...');
      
      // Importer et créer le module Pokédex
      const { createPokedexModule } = await import('./Pokedex/index.js');
      
      const pokedexModule = await createPokedexModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (!pokedexModule) {
        throw new Error('Échec création PokedexModule');
      }
      
      console.log('✅ [PokemonUI] PokedexModule créé avec succès');
      
      // S'assurer que le module a les méthodes nécessaires pour UIManager
      if (!pokedexModule.connectUIManager && pokedexModule.icon?.iconElement) {
        pokedexModule.connectUIManager = (uiManager) => {
          if (uiManager.registerIconPosition) {
            uiManager.registerIconPosition('pokedex', pokedexModule.icon.iconElement, {
              anchor: 'bottom-right',
              order: 2,
              spacing: 10,
              size: { width: 70, height: 80 }
            });
            return true;
          }
          return false;
        };
      }
      
      // Connecter à UIManager si disponible
      if (this.uiManager && pokedexModule.connectUIManager) {
        pokedexModule.connectUIManager(this.uiManager);
      }
      
      // Exposer globalement
      window.pokedexSystem = pokedexModule.system;
      window.pokedexSystemGlobal = pokedexModule;
      window.togglePokedex = () => pokedexModule.toggleUI?.() || pokedexModule.toggle?.();
      window.openPokedex = () => pokedexModule.open?.();
      window.closePokedex = () => pokedexModule.close?.();
      
      return pokedexModule;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur création Pokédx:', error);
      // Fallback: wrapper vide
      return this.createEmptyWrapper('pokedex');
    }
  }

  // ✅ QUEST MODULE - VERSION MINIMALE AVEC FIX POSITION SEULEMENT
async createQuestModule() {
  try {
    console.log('🚀 [PokemonUI] Création QuestSystem avec protection intégrée...');
    
    // ✅ Import et création normale
    const { createQuestSystem } = await import('./Quest/QuestSystem.js');
    
    const questSystem = await createQuestSystem(
      window.currentGameRoom,
      window.globalNetworkManager || window.networkManager
    );
    
    if (!questSystem) {
      throw new Error('Échec création QuestSystem');
    }
    
    console.log('✅ [PokemonUI] QuestSystem créé avec succès');
    
    // ✅ PROTECTION INTÉGRÉE: Patch forceDisplay() avec protection anti-chevauchement
    if (questSystem.icon && questSystem.icon.forceDisplay) {
      console.log('🛡️ [PokemonUI] Application protection anti-chevauchement...');
      
      // Sauvegarder la méthode originale
      if (!questSystem.icon._originalForceDisplay) {
        questSystem.icon._originalForceDisplay = questSystem.icon.forceDisplay.bind(questSystem.icon);
      }
      
      // Patch avec protection complète
      questSystem.icon.forceDisplay = function() {
        if (!this.iconElement) return;
        
        // Styles de visibilité seulement
        this.iconElement.style.display = 'block';
        this.iconElement.style.visibility = 'visible';
        this.iconElement.style.opacity = '1';
        this.iconElement.style.pointerEvents = 'auto';
        this.iconElement.style.zIndex = '1000';
        this.iconElement.classList.remove('hidden', 'ui-hidden');
        
        // Protection anti-chevauchement
        const positionedBy = this.iconElement.getAttribute('data-positioned-by');
        const currentLeft = this.iconElement.getBoundingClientRect().left;
        
        // Respecter position UIManager
        if (positionedBy && (
          positionedBy.includes('uimanager') || 
          positionedBy.includes('manual') || 
          positionedBy.includes('ultimate') ||
          positionedBy.includes('runtime')
        )) {
          console.log('🛡️ [QuestIcon-PROTECTED] Position UIManager respectée');
          return;
        }
        
        // Protéger position correcte (1603px)
        if (Math.abs(currentLeft - 1603) < 20) {
          console.log('✅ [QuestIcon-PROTECTED] Position correcte protégée');
          this.iconElement.setAttribute('data-positioned-by', 'protected-correct');
          return;
        }
        
        // Corriger position incorrecte (1683px = inventory)
        if (Math.abs(currentLeft - 1683) < 20) {
          console.warn('🚨 [QuestIcon-PROTECTED] Correction position inventory');
          this.iconElement.style.position = 'fixed';
          this.iconElement.style.left = '1603px';
          this.iconElement.style.top = '1021px';
          this.iconElement.style.right = '';
          this.iconElement.style.bottom = '';
          this.iconElement.setAttribute('data-positioned-by', 'protected-autocorrect');
          return;
        }
        
        // Position de secours avec position correcte
        if (!this.iconElement.style.left && !this.iconElement.style.right) {
          console.log('⚠️ [QuestIcon-PROTECTED] Position de secours (1603px)');
          this.iconElement.style.position = 'fixed';
          this.iconElement.style.left = '1603px';
          this.iconElement.style.top = '1021px';
          this.iconElement.setAttribute('data-positioned-by', 'protected-fallback');
        }
        
        console.log('✅ [QuestIcon-PROTECTED] Protection anti-chevauchement active');
      };
      
      console.log('✅ [PokemonUI] Protection anti-chevauchement appliquée');
    }
    
    // ✅ Attendre un peu pour que l'icône soit créée
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ✅ Connexion UIManager normale
    if (this.uiManager && questSystem.connectUIManager) {
      const connected = questSystem.connectUIManager(this.uiManager);
      console.log(`🔗 [PokemonUI] UIManager connexion: ${connected ? 'SUCCÈS' : 'ÉCHEC'}`);
      
      // Force repositioning après connexion
      if (connected) {
        setTimeout(() => {
          if (this.uiManager.positionIcon) {
            this.uiManager.positionIcon('quest');
            console.log('📍 [PokemonUI] Force repositioning Quest');
          }
        }, 200);
      }
    }
    
    // ✅ Surveillance de sécurité (plus légère que ultimate)
    let securityWatchCount = 0;
    const maxSecurityWatch = 20; // 20 vérifications = 1 minute
    
    const securityWatch = setInterval(() => {
      securityWatchCount++;
      
      if (securityWatchCount > maxSecurityWatch) {
        clearInterval(securityWatch);
        console.log('⏹️ [PokemonUI] Surveillance sécurité Quest terminée');
        return;
      }
      
      const questElement = document.querySelector('#quest-icon');
      if (questElement) {
        const rect = questElement.getBoundingClientRect();
        const currentLeft = Math.round(rect.left);
        
        // Correction si chevauchement détecté
        if (Math.abs(currentLeft - 1683) < 10) {
          console.warn(`🚨 [PokemonUI-SECURITY] Chevauchement détecté - correction ${securityWatchCount}`);
          questElement.style.left = '1603px';
          questElement.setAttribute('data-positioned-by', `security-${securityWatchCount}`);
        }
      }
    }, 3000); // Toutes les 3 secondes
    
    console.log('👁️ [PokemonUI] Surveillance sécurité démarrée (3s x 20 = 1 minute)');
    
    // ✅ Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    window.toggleQuest = () => questSystem.toggle();
    window.openQuest = () => questSystem.show();
    window.closeQuest = () => questSystem.hide();
    
    return questSystem;
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur création QuestSystem:', error);
    return this.createEmptyWrapper('quest');
  }
}

  async createQuestTrackerModule() {
    if (window.questSystemGlobal?.questTracker) {
      return this.wrapExistingModule(window.questSystemGlobal.questTracker, 'questTracker');
    }
    
    try {
      const { QuestTrackerUI } = await import('./components/QuestTrackerUI.js');
      const tracker = new QuestTrackerUI(window.questSystemGlobal);
      return this.wrapExistingModule(tracker, 'questTracker');
    } catch (error) {
      return this.createEmptyWrapper('questTracker');
    }
  }

async createOptionsModule() {
  try {
    console.log('🎛️ [PokemonUI] Création module Options...');
    
    // ✅ FIX: Import depuis index.js comme Team/Quest
    const { createOptionsModule } = await import('./Options/index.js');
    
    // ✅ FIX: Utiliser factory function comme Team/Quest
    const optionsModule = await createOptionsModule(
      window.currentGameRoom,
      window.game?.scene?.getScenes(true)[0]
    );
    
    if (!optionsModule) {
      throw new Error('Échec création OptionsModule');
    }
    
    console.log('✅ [PokemonUI] OptionsModule créé avec succès');
    
    // ✅ FIX: Connexion UIManager cohérente
    if (this.uiManager && optionsModule.connectUIManager) {
      const connected = optionsModule.connectUIManager(this.uiManager);
      console.log(`🔗 [PokemonUI] Options UIManager connexion: ${connected ? 'SUCCÈS' : 'ÉCHEC'}`);
    }
    
    // ✅ FIX: Exposer globalement comme Team
    window.optionsSystem = optionsModule;
    window.optionsSystemGlobal = optionsModule;
    window.toggleOptions = () => optionsModule.toggleUI?.() || optionsModule.toggle?.();
    window.openOptions = () => optionsModule.open?.();
    window.closeOptions = () => optionsModule.close?.();
    window.forceCloseOptions = () => optionsModule.forceCloseUI?.() || optionsModule.close?.();
    
    return optionsModule;
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur création Options:', error);
    return this.createEmptyWrapper('options');
  }
}
  
  // === WRAPPER POUR MODULES EXISTANTS ===
  wrapExistingModule(existingModule, moduleType) {
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
      
      getOriginal: () => existingModule
    };
    
    wrapper.iconElement = this.findIconElement(existingModule, moduleType);
    this.moduleInstances.set(moduleType, wrapper);
    
    return wrapper;
  }

  createEmptyWrapper(moduleType) {
    return {
      iconElement: null,
      originalModule: null,
      moduleType: moduleType,
      isEmpty: true,
      
      show: () => {},
      hide: () => {},
      setEnabled: () => {},
      destroy: () => {}
    };
  }

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
    if (!this.uiManager || !this.uiManager.on) {
      return;
    }
    
    this.uiManager.on('moduleInitialized', (event) => {
      const { moduleId, instance } = event.detail;
      
      window.dispatchEvent(new CustomEvent('pokemonUIModuleReady', {
        detail: { moduleId, instance }
      }));
    });
    
    this.uiManager.on('gameStateChanged', (event) => {
      const { previousState, newState } = event.detail;
      this.currentGameState = newState;
      
      window.dispatchEvent(new CustomEvent('pokemonUIStateChanged', {
        detail: { previousState, newState }
      }));
    });
  }

  // === API PUBLIQUE ===

  async initializeAllModules() {
    if (!this.uiManager) {
      throw new Error('UIManager non initialisé');
    }
    
    if (this.uiManager.initializeAllModules) {
      const result = await this.uiManager.initializeAllModules(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      return result;
    } else {
      return { 
        success: true, 
        results: Object.fromEntries(this.moduleInstances), 
        errors: [] 
      };
    }
  }

  setGameState(stateName, options = {}) {
    if (!this.uiManager) {
      return false;
    }
    
    if (this.uiManager.setGameState) {
      return this.uiManager.setGameState(stateName, options);
    } else {
      this.currentGameState = stateName;
      return true;
    }
  }

  getModule(moduleId) {
    if (this.moduleInstances.has(moduleId)) {
      return this.moduleInstances.get(moduleId);
    }
    
    if (this.uiManager && this.uiManager.modules && this.uiManager.modules.has(moduleId)) {
      const moduleConfig = this.uiManager.modules.get(moduleId);
      
      if (moduleConfig.instance) {
        this.moduleInstances.set(moduleId, moduleConfig.instance);
        return moduleConfig.instance;
      }
    }
    
    return null;
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

  debugInfo() {
    if (!this.uiManager) {
      return { error: 'UIManager non initialisé' };
    }
    
    const uiStats = this.uiManager.debugInfo ? this.uiManager.debugInfo() : { mode: 'unknown' };
    
    return {
      currentGameState: this.currentGameState,
      modulesCount: this.moduleInstances.size,
      uiManagerStats: uiStats,
      initialized: this.initialized
    };
  }
}

// === INSTANCE GLOBALE ===
export const pokemonUISystem = new PokemonUISystem();

// === FONCTIONS UTILITAIRES GLOBALES ===

export async function initializePokemonUI() {
  try {
    const success = await pokemonUISystem.initialize();
    
    if (!success) {
      throw new Error('Échec initialisation PokemonUISystem');
    }
    
    const result = await pokemonUISystem.initializeAllModules();
    
    window.pokemonUISystem = pokemonUISystem;
    window.uiManager = pokemonUISystem.uiManager;
    
    setupCompatibilityFunctions();
    
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
  try {
    const result = await initializePokemonUI();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || 'Initialisation normale échouée');
    }
    
  } catch (error) {
    console.warn('⚠️ [PokemonUI] Initialisation normale échouée, fallback minimal...');
    return await createMinimalPokemonUI();
  }
}

export async function createMinimalPokemonUI() {
  try {
    const minimalUISystem = {
      uiManager: {
        setGameState: (stateName, options = {}) => {
          const iconsSelectors = [
            '#inventory-icon', '#team-icon', '#quest-icon', 
            '.ui-icon', '.game-icon', '#questTracker'
          ];
          
          if (stateName === 'battle') {
            iconsSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
              });
            });
          } else if (stateName === 'exploration') {
            iconsSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => {
                el.style.display = '';
              });
            });
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
          currentGameState: this.currentGameState
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
          compatibility: 'Basic UI state management',
          uiManager: this.uiManager.debugInfo()
        };
      }
    };
    
    window.pokemonUISystem = minimalUISystem;
    window.uiManager = minimalUISystem.uiManager;
    
    setupCompatibilityFunctions();
    
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
  // Fonctions Team
  window.toggleTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.toggleTeamUI) {
      module.toggleTeamUI();
    } else if (module && module.toggle) {
      module.toggle();
    }
  };
  
  window.openTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.openTeam) {
      module.openTeam();
    }
  };
  
  window.closeTeam = () => {
    const module = pokemonUISystem.getModule?.('team');
    if (module && module.closeTeam) {
      module.closeTeam();
    }
  };
 // Fonctions Options
  window.toggleOptions = () => {
    const module = pokemonUISystem.getModule?.('options');
    if (module && module.toggleUI) {
      module.toggleUI();
    } else if (module && module.toggle) {
      module.toggle();
    } else if (window.optionsSystemGlobal) {
      if (window.optionsSystemGlobal.ui?.isVisible) {
        window.optionsSystemGlobal.ui.hide();
      } else {
        window.optionsSystemGlobal.ui?.show();
      }
    }
  };
  
  window.openOptions = () => {
    const module = pokemonUISystem.getModule?.('options');
    if (module && module.open) {
      module.open();
    } else if (window.optionsSystemGlobal?.ui) {
      window.optionsSystemGlobal.ui.show();
    }
  };
  
  window.closeOptions = () => {
    const module = pokemonUISystem.getModule?.('options');
    if (module && module.close) {
      module.close();
    } else if (window.optionsSystemGlobal?.ui) {
      window.optionsSystemGlobal.ui.hide();
    }
  };
  
  window.forceCloseOptions = () => {
    if (window.optionsSystemGlobal && window.optionsSystemGlobal.ui) {
      window.optionsSystemGlobal.ui.hide();
    }
    
    const optionsOverlay = document.querySelector('#options-overlay');
    if (optionsOverlay) {
      optionsOverlay.classList.remove('visible');
      optionsOverlay.style.display = 'none';
    }
    
    const optionsModals = document.querySelectorAll('.options-overlay, .options-modal, [id*="options-"]');
    optionsModals.forEach(modal => {
      if (modal.style) {
        modal.style.display = 'none';
      }
    });
  }; 
  window.forceCloseTeam = () => {
    if (window.teamSystemGlobal && window.teamSystemGlobal.ui) {
      window.teamSystemGlobal.ui.hide();
    }
    
    const teamOverlay = document.querySelector('#team-overlay');
    if (teamOverlay) {
      teamOverlay.style.display = 'none';
    }
    
    const teamModals = document.querySelectorAll('.team-overlay, .team-modal, [id*="team-"]');
    teamModals.forEach(modal => {
      if (modal.style) {
        modal.style.display = 'none';
      }
    });
  };
  
  // Fonctions inventaire
  window.toggleInventory = () => {
    const module = pokemonUISystem.getOriginalModule?.('inventory');
    if (module && module.toggle) {
      module.toggle();
    } else if (module && module.toggleInventory) {
      module.toggleInventory();
    }
  };
  
  // Fonctions quest
  window.toggleQuest = () => {
    const module = pokemonUISystem.getOriginalModule?.('quest');
    if (module && module.toggleQuestJournal) {
      module.toggleQuestJournal();
    } else if (module && module.toggle) {
      module.toggle();
    }
  };

  // Fonctions Pokédx
  window.togglePokedex = () => {
    const module = pokemonUISystem.getModule?.('pokedex');
    if (module && module.toggleUI) {
      module.toggleUI();
    } else if (module && module.toggle) {
      module.toggle();
    }
  };
  
  window.openPokedex = () => {
    const module = pokemonUISystem.getModule?.('pokedex');
    if (module && module.open) {
      module.open();
    }
  };
  
  window.closePokedex = () => {
    const module = pokemonUISystem.getModule?.('pokedex');
    if (module && module.close) {
      module.close();
    }
  };
  
  window.forceClosePokedx = () => {
    if (window.pokedexSystemGlobal && window.pokedexSystemGlobal.ui) {
      window.pokedexSystemGlobal.ui.hide();
    }
    
    const pokedexOverlay = document.querySelector('#pokedex-overlay');
    if (pokedexOverlay) {
      pokedexOverlay.style.display = 'none';
    }
    
    const pokedexModals = document.querySelectorAll('.pokedx-overlay, .pokedex-modal, [id*="pokedex-"]');
    pokedexModals.forEach(modal => {
      if (modal.style) {
        modal.style.display = 'none';
      }
    });
  };
  
  // Fonctions d'état de jeu
  window.setUIGameState = (stateName, options = {}) => {
    return pokemonUISystem.setGameState?.(stateName, options) || false;
  };
  
  // Fonctions de debug
  window.debugPokemonUI = () => {
    return pokemonUISystem.debugInfo?.() || { error: 'Debug non disponible' };
  };
}

// === ÉVÉNEMENTS GLOBAUX ===

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (!window.pokemonUISystem) {
      autoInitializePokemonUI().then(result => {
        if (!result.success) {
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

  // Écouter la touche Échap pour Options
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      // Vérifier si pas dans un dialogue ou autre UI critique
      const dialogueBox = document.querySelector('#dialogue-box');
      const dialogueVisible = dialogueBox && 
        dialogueBox.style.display !== 'none' && 
        !dialogueBox.hidden;
      
      if (!dialogueVisible) {
        e.preventDefault();
        window.toggleOptions();
      }
    }
  });
  
});

console.log('✅ [PokemonUI] Système UI Pokémon CONSERVATEUR avec fix minimal Quest chargé');
console.log('🎮 Utilisez initializePokemonUI() pour démarrer');
console.log('🔧 Utilisez autoInitializePokemonUI() pour auto-réparation');
console.log('🔍 Utilisez window.debugPokemonUI() pour diagnostiquer');
