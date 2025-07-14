// client/src/ui.js - UI System avec mode intro et spawn intelligent
// ✅ NOUVEAUTÉS:
// 1. Mode 'intro' qui masque TOUTE l'interface
// 2. Mode 'hidden' par défaut à la connexion
// 3. Mode 'exploration' activé automatiquement après spawn
// 4. Intégration avec PsyduckIntroManager

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

// === ÉTATS DE JEU POKÉMON (AVEC NOUVEAUX MODES) ===
const POKEMON_GAME_STATES = {
  // ✅ NOUVEAU: Mode caché par défaut à la connexion
  hidden: {
    visibleModules: [],
    enabledModules: [],
    hiddenModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    disabledModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    description: 'Interface complètement cachée (connexion/chargement)'
  },

  // ✅ NOUVEAU: Mode intro - TOUT masqué
  intro: {
    visibleModules: [],
    enabledModules: [],
    hiddenModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    disabledModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    description: 'Interface masquée pendant les intros/prologues'
  },

  // Mode exploration normal
  exploration: {
    visibleModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    enabledModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
    hiddenModules: [],
    disabledModules: [],
    description: 'Interface complète active',
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
    visibleModules: [],
    enabledModules: [],
    hiddenModules: ['inventory', 'team', 'quest', 'questTracker'],
    disabledModules: ['inventory', 'team', 'quest', 'questTracker'],
    description: 'Interface cachée pendant les combats'
  },
  
  pokemonCenter: {
    visibleModules: ['team', 'inventory', 'pokedex'],
    enabledModules: ['team', 'inventory', 'pokedex'],
    hiddenModules: ['questTracker'],
    disabledModules: ['quest'],
    description: 'Interface Centre Pokémon'
  },
  
  dialogue: {
    visibleModules: ['inventory', 'team', 'quest'],
    enabledModules: [],
    hiddenModules: ['questTracker'],
    disabledModules: ['inventory', 'team', 'quest'],
    description: 'Interface réduite pendant dialogues'
  },
  
  menu: {
    visibleModules: ['inventory', 'quest', 'pokedex', 'team'],
    enabledModules: ['inventory', 'quest', 'pokedex', 'team'],
    hiddenModules: ['questTracker'],
    disabledModules: [],
    description: 'Interface menu complète'
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
  }
};

// === CLASSE UI SYSTEM POKÉMON AMÉLIORÉE ===
export class PokemonUISystem {
  constructor() {
    this.uiManager = null;
    this.initialized = false;
    this.moduleInstances = new Map();
    
    // ✅ NOUVEAU: État par défaut caché
    this.currentGameState = 'hidden';
    this.playerSpawned = false;
    this.introActive = false;
    
    // ✅ NOUVEAU: Système de surveillance spawn
    this.spawnWatcher = null;
    this.setupSpawnWatcher();
  }

  // === ✅ NOUVEAU: SURVEILLANCE DU SPAWN JOUEUR ===
  
  setupSpawnWatcher() {
    // Surveiller le flag global playerReady
    this.spawnWatcher = setInterval(() => {
      this.checkPlayerSpawnStatus();
    }, 1000);
    
    // Écouter les événements de spawn
    window.addEventListener('playerSpawned', () => {
      console.log('🎮 [PokemonUI] Événement playerSpawned détecté');
      this.handlePlayerSpawned();
    });
    
    window.addEventListener('playerReady', () => {
      console.log('🎮 [PokemonUI] Événement playerReady détecté');
      this.handlePlayerSpawned();
    });
    
    // Écouter les événements d'intro
    window.addEventListener('introStarted', () => {
      console.log('🎬 [PokemonUI] Intro démarrée - masquage interface');
      this.handleIntroStarted();
    });
    
    window.addEventListener('introEnded', () => {
      console.log('🎬 [PokemonUI] Intro terminée - restauration interface');
      this.handleIntroEnded();
    });
  }
  
  checkPlayerSpawnStatus() {
    // Vérifier les flags globaux
    if (typeof window !== 'undefined' && 
        window.playerReady === true && 
        window.playerSpawned === true && 
        window.loadingScreenClosed === true) {
      
      if (!this.playerSpawned) {
        console.log('🎮 [PokemonUI] Joueur spawné détecté via flags globaux');
        this.handlePlayerSpawned();
      }
    }
    
    // Vérifier l'objet joueur
    if (window.game?.scene?.getScenes?.(true)?.[0]?.playerManager?.getMyPlayer?.()) {
      const player = window.game.scene.getScenes(true)[0].playerManager.getMyPlayer();
      
      if (player && player.x !== undefined && player.y !== undefined && !this.playerSpawned) {
        console.log('🎮 [PokemonUI] Joueur spawné détecté via objet player');
        this.handlePlayerSpawned();
      }
    }
  }
  
  handlePlayerSpawned() {
    if (this.playerSpawned) return; // Déjà traité
    
    this.playerSpawned = true;
    
    // Arrêter la surveillance
    if (this.spawnWatcher) {
      clearInterval(this.spawnWatcher);
      this.spawnWatcher = null;
    }
    
    console.log('✅ [PokemonUI] Joueur spawné - activation interface si pas d\'intro active');
    
    // ✅ Afficher l'interface UNIQUEMENT si pas d'intro en cours
    if (!this.introActive) {
      this.activateUIAfterSpawn();
    } else {
      console.log('🎬 [PokemonUI] Intro active, interface reste masquée');
    }
  }
  
  activateUIAfterSpawn() {
    console.log('🎮 [PokemonUI] Activation interface après spawn');
    
    // Délai pour laisser le temps au jeu de se stabiliser
    setTimeout(() => {
      if (!this.introActive) {
        this.setGameState('exploration', { 
          animated: true,
          reason: 'player-spawned'
        });
        console.log('✅ [PokemonUI] Interface activée en mode exploration');
      }
    }, 1500);
  }
  
  // === ✅ NOUVEAU: GESTION DES INTROS ===
  
  handleIntroStarted() {
    this.introActive = true;
    this.setGameState('intro', { 
      animated: false,
      reason: 'intro-started'
    });
  }
  
  handleIntroEnded() {
    this.introActive = false;
    
    // Si le joueur est déjà spawné, activer l'interface
    if (this.playerSpawned) {
      this.activateUIAfterSpawn();
    } else {
      // Sinon, rester en mode hidden en attendant le spawn
      this.setGameState('hidden', {
        animated: true,
        reason: 'intro-ended-waiting-spawn'
      });
    }
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
      
      // ✅ NOUVEAU: Démarrer en mode hidden par défaut
      this.setGameState('hidden', { 
        animated: false,
        reason: 'initialization'
      });
      
      this.initialized = true;
      console.log('✅ [PokemonUI] Système initialisé en mode hidden');
      
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
        
        // ✅ NOUVEAU: Gestion des nouveaux modes
        if (stateName === 'battle' || stateName === 'intro' || stateName === 'hidden') {
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

  // === ENREGISTREMENT MODULES ===
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
          order: 0,
          spacing: 10
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
        priority: 90
      },
      {
        id: 'pokedex',
        critical: false,
        factory: this.createPokedexModule.bind(this),
        groups: ['ui-icons'],
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 2,
          spacing: 10
        },
        priority: 85,
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        metadata: {
          name: 'Pokédx National',
          description: 'Complete Pokédx system with discovery tracking',
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
          order: 3,
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

  // === FACTORIES DES MODULES ===

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
      
      const { createPokedexModule } = await import('./Pokedex/index.js');
      
      const pokedexModule = await createPokedexModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (!pokedexModule) {
        throw new Error('Échec création PokedexModule');
      }
      
      console.log('✅ [PokemonUI] PokedexModule créé avec succès');
      
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
      
      if (this.uiManager && pokedexModule.connectUIManager) {
        pokedexModule.connectUIManager(this.uiManager);
      }
      
      window.pokedexSystem = pokedexModule.system;
      window.pokedexSystemGlobal = pokedexModule;
      window.togglePokedex = () => pokedexModule.toggleUI?.() || pokedexModule.toggle?.();
      window.openPokedex = () => pokedexModule.open?.();
      window.closePokedex = () => pokedexModule.close?.();
      
      return pokedexModule;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur création Pokédx:', error);
      return this.createEmptyWrapper('pokedex');
    }
  }

  async createQuestModule() {
    try {
      console.log('🚀 [PokemonUI] Création module Quest...');
      
      const { createQuestModule } = await import('./Quest/index.js');
      
      const questModule = await createQuestModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      if (questModule) {
        console.log('✅ [PokemonUI] QuestModule créé avec succès');
        
        if (!questModule.connectUIManager && questModule.icon?.iconElement) {
          questModule.connectUIManager = (uiManager) => {
            if (uiManager.registerIconPosition) {
              uiManager.registerIconPosition('quest', questModule.icon.iconElement, {
                anchor: 'bottom-right',
                order: 1,
                spacing: 10,
                size: { width: 65, height: 75 }
              });
              return true;
            }
            return false;
          };
        }
        
        if (this.uiManager && questModule.connectUIManager) {
          questModule.connectUIManager(this.uiManager);
        }
        
        window.questSystem = questModule;
        window.questSystemGlobal = questModule;
        window.toggleQuest = () => questModule.toggleUI?.() || questModule.toggle?.();
        window.openQuest = () => questModule.open?.();
        window.closeQuest = () => questModule.close?.();
        
        return questModule;
      }
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur création Quest:', error);
    }
    
    return this.createEmptyWrapper('quest');
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

  // ✅ AMÉLIORÉ: setGameState avec logging et raisons
  setGameState(stateName, options = {}) {
    if (!this.uiManager) {
      return false;
    }
    
    const previousState = this.currentGameState;
    const reason = options.reason || 'manual';
    
    console.log(`🎮 [PokemonUI] Changement état: ${previousState} → ${stateName} (${reason})`);
    
    if (this.uiManager.setGameState) {
      const success = this.uiManager.setGameState(stateName, options);
      if (success) {
        this.currentGameState = stateName;
      }
      return success;
    } else {
      this.currentGameState = stateName;
      return true;
    }
  }

  // ✅ NOUVELLES MÉTHODES PUBLIQUES
  
  isIntroActive() {
    return this.introActive;
  }
  
  isPlayerSpawned() {
    return this.playerSpawned;
  }
  
  getCurrentState() {
    return this.currentGameState;
  }
  
  // Force l'activation de l'interface (pour debug)
  forceActivateUI() {
    console.log('🔧 [PokemonUI] Activation forcée de l\'interface');
    this.playerSpawned = true;
    this.introActive = false;
    this.setGameState('exploration', { 
      animated: true, 
      reason: 'force-activation' 
    });
  }
  
  // Force le masquage de l'interface
  forceHideUI() {
    console.log('🔧 [PokemonUI] Masquage forcé de l\'interface');
    this.setGameState('hidden', { 
      animated: true, 
      reason: 'force-hide' 
    });
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
      playerSpawned: this.playerSpawned,
      introActive: this.introActive,
      modulesCount: this.moduleInstances.size,
      uiManagerStats: uiStats,
      initialized: this.initialized,
      
      // ✅ NOUVEAU: Infos de debugging spécifiques
      spawnWatcher: !!this.spawnWatcher,
      globalFlags: {
        playerReady: window?.playerReady,
        playerSpawned: window?.playerSpawned,
        loadingScreenClosed: window?.loadingScreenClosed
      },
      availableStates: Object.keys(POKEMON_GAME_STATES)
    };
  }
  
  // ✅ Cleanup pour destruction
  destroy() {
    console.log('🧹 [PokemonUI] Destruction du système...');
    
    if (this.spawnWatcher) {
      clearInterval(this.spawnWatcher);
      this.spawnWatcher = null;
    }
    
    if (this.uiManager && this.uiManager.destroy) {
      this.uiManager.destroy();
    }
    
    this.moduleInstances.clear();
    this.initialized = false;
    this.playerSpawned = false;
    this.introActive = false;
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
    setupIntroIntegration(); // ✅ NOUVEAU
    
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

// ✅ NOUVELLE FONCTION: Intégration avec les systèmes d'intro
function setupIntroIntegration() {
  // Intégration avec PsyduckIntroManager
  window.addEventListener('psyduckIntroStarted', () => {
    console.log('🦆 [PokemonUI] Intro Psyduck démarrée');
    window.dispatchEvent(new CustomEvent('introStarted'));
  });
  
  window.addEventListener('psyduckIntroEnded', () => {
    console.log('🦆 [PokemonUI] Intro Psyduck terminée');
    window.dispatchEvent(new CustomEvent('introEnded'));
  });
  
  // Exposer des fonctions globales pour les intros
  window.startUIIntroMode = () => {
    pokemonUISystem.handleIntroStarted();
  };
  
  window.endUIIntroMode = () => {
    pokemonUISystem.handleIntroEnded();
  };
  
  window.forceActivateUI = () => {
    pokemonUISystem.forceActivateUI();
  };
  
  window.forceHideUI = () => {
    pokemonUISystem.forceHideUI();
  };
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
          
          // ✅ NOUVEAU: Gestion des nouveaux modes
          if (stateName === 'battle' || stateName === 'intro' || stateName === 'hidden') {
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
              previousState: this.currentGameState || 'hidden', 
              newState: stateName 
            }
          }));
          
          this.currentGameState = stateName;
          return true;
        },
        
        currentGameState: 'hidden', // ✅ NOUVEAU: par défaut hidden
        
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
      currentGameState: 'hidden', // ✅ NOUVEAU
      playerSpawned: false,
      introActive: false,
      
      setGameState: function(stateName, options = {}) {
        return this.uiManager.setGameState(stateName, options);
      },
      
      isIntroActive: function() { return this.introActive; },
      isPlayerSpawned: function() { return this.playerSpawned; },
      getCurrentState: function() { return this.currentGameState; },
      
      forceActivateUI: function() {
        this.playerSpawned = true;
        this.introActive = false;
        this.setGameState('exploration', { reason: 'force-minimal' });
      },
      
      forceHideUI: function() {
        this.setGameState('hidden', { reason: 'force-hide-minimal' });
      },
      
      handleIntroStarted: function() {
        this.introActive = true;
        this.setGameState('intro', { reason: 'intro-started-minimal' });
      },
      
      handleIntroEnded: function() {
        this.introActive = false;
        if (this.playerSpawned) {
          this.setGameState('exploration', { reason: 'intro-ended-minimal' });
        } else {
          this.setGameState('hidden', { reason: 'intro-ended-waiting-spawn-minimal' });
        }
      },
      
      getModule: () => null,
      getOriginalModule: () => null,
      
      debugInfo: function() {
        return {
          initialized: true,
          mode: 'minimal-pokemon-ui',
          currentGameState: this.currentGameState,
          playerSpawned: this.playerSpawned,
          introActive: this.introActive,
          compatibility: 'Basic UI state management with intro support',
          uiManager: this.uiManager.debugInfo()
        };
      }
    };
    
    window.pokemonUISystem = minimalUISystem;
    window.uiManager = minimalUISystem.uiManager;
    
    setupCompatibilityFunctions();
    setupIntroIntegration();
    
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

// === FONCTIONS DE COMPATIBILITÉ (identiques mais avec nouvelles fonctions) ===
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
  
  window.forceClosePokedex = () => {
    if (window.pokedexSystemGlobal && window.pokedexSystemGlobal.ui) {
      window.pokedexSystemGlobal.ui.hide();
    }
    
    const pokedexOverlay = document.querySelector('#pokedex-overlay');
    if (pokedexOverlay) {
      pokedexOverlay.style.display = 'none';
    }
    
    const pokedexModals = document.querySelectorAll('.pokedex-overlay, .pokedex-modal, [id*="pokedex-"]');
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
    pokemonUISystem?.setGameState?.('battle', { animated: true, reason: 'battle-started' });
  });
  
  window.addEventListener('battleEnded', () => {
    pokemonUISystem?.setGameState?.('exploration', { animated: true, reason: 'battle-ended' });
  });
  
  // Écouter les événements de dialogue
  window.addEventListener('dialogueStarted', () => {
    pokemonUISystem?.setGameState?.('dialogue', { animated: true, reason: 'dialogue-started' });
  });
  
  window.addEventListener('dialogueEnded', () => {
    pokemonUISystem?.setGameState?.('exploration', { animated: true, reason: 'dialogue-ended' });
  });
});

console.log('✅ [PokemonUI] Système UI Pokémon avec mode intro chargé');
console.log('🎮 États disponibles: hidden, intro, exploration, battle, dialogue, pokemonCenter, menu');
console.log('🎬 Fonctions intro: window.startUIIntroMode(), window.endUIIntroMode()');
console.log('🔧 Debug: window.forceActivateUI(), window.forceHideUI()');
console.log('🔍 Utilisez window.debugPokemonUI() pour diagnostiquer');
