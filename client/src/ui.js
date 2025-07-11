// client/src/ui.js - Système UI Manager avec positionnement automatique Team
// 🎯 Configuration pour que UIManager gère automatiquement la position de Team

import { UIManager } from './managers/UIManager.js';

// === CONFIGURATION UI MANAGER AVEC POSITIONNEMENT ===
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
  }
};

// === ÉTATS DE JEU POKÉMON (TEAM UNIFIÉ) ===
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
    visibleModules: ['battleInterface'],
    enabledModules: ['battleInterface'],
    hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
    disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
    responsive: {
      mobile: { 
        visibleModules: ['battleInterface'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']
      },
      tablet: {
        visibleModules: ['battleInterface'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat']
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

// === CONFIGURATION GROUPES AVEC POSITIONNEMENT ===
const POKEMON_UI_GROUPS = {
  'ui-icons': {
    anchor: 'bottom-right',
    direction: 'horizontal',
    spacing: 10,
    padding: { x: 20, y: 20 },
    maxPerRow: 6,
    members: [], // Sera rempli automatiquement
    priority: 100,
    responsive: {
      mobile: { 
        spacing: 8,
        padding: { x: 15, y: 15 }
      },
      tablet: { 
        spacing: 9,
        padding: { x: 18, y: 18 }
      }
    }
  },
  
  'panels': {
    anchor: 'top-right',
    direction: 'vertical',
    spacing: 15,
    padding: { x: 20, y: 20 },
    maxPerRow: 1,
    members: [],
    priority: 90,
    responsive: {
      mobile: { 
        anchor: 'top-left',
        spacing: 10,
        padding: { x: 10, y: 60 }
      }
    }
  },
  
  'overlays': {
    anchor: 'center',
    direction: 'vertical',
    spacing: 0,
    padding: { x: 0, y: 0 },
    members: [],
    priority: 85
  },
  
  'social': {
    anchor: 'bottom-left',
    direction: 'vertical',
    spacing: 10,
    padding: { x: 20, y: 20 },
    members: [],
    priority: 80,
    responsive: {
      mobile: { 
        anchor: 'bottom-center',
        padding: { x: 10, y: 100 }
      }
    }
  },
  
  'battle-ui': {
    anchor: 'center',
    direction: 'overlay',
    spacing: 20,
    padding: { x: 0, y: 0 },
    members: [],
    priority: 110
  }
};

// === CLASSE UI SYSTEM AVEC POSITIONNEMENT TEAM ===
export class PokemonUISystem {
  constructor() {
    this.uiManager = null;
    this.initialized = false;
    this.moduleFactories = new Map();
    this.moduleInstances = new Map();
    this.currentGameState = 'exploration';
    
    console.log('🎮 PokemonUISystem avec positionnement automatique créé');
  }

  // === INITIALISATION ===
  async initialize() {
    try {
      console.log('🚀 [PokemonUI] === INITIALISATION UI MANAGER AVEC POSITIONNEMENT ===');
      
      // Créer le UIManager avec positionnement
      const config = {
        ...UI_CONFIG,
        gameStates: POKEMON_GAME_STATES
      };
      
      this.uiManager = new UIManager(config);
      
      // Créer les groupes de positionnement
      this.setupPositioningGroups();
      
      // Enregistrer les modules avec configuration de positionnement
      await this.registerAllModulesWithPositioning();
      
      // Setup des callbacks globaux
      this.setupGlobalCallbacks();
      
      console.log('✅ [PokemonUI] UIManager avec positionnement initialisé');
      this.initialized = true;
      
      return true;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur initialisation:', error);
      return false;
    }
  }

  // === SETUP GROUPES DE POSITIONNEMENT ===
  setupPositioningGroups() {
    console.log('📦 [PokemonUI] Configuration des groupes de positionnement...');
    
    Object.entries(POKEMON_UI_GROUPS).forEach(([groupId, config]) => {
      try {
        this.uiManager.createGroup(groupId, config);
        console.log(`  ✅ Groupe '${groupId}' créé (${config.anchor}, ${config.direction})`);
      } catch (error) {
        console.warn(`  ⚠️ Erreur groupe '${groupId}':`, error);
      }
    });
    
    console.log('✅ [PokemonUI] Groupes de positionnement configurés');
  }

  // === ENREGISTREMENT MODULES AVEC POSITIONNEMENT ===
  async registerAllModulesWithPositioning() {
    console.log('📝 [PokemonUI] Enregistrement modules avec positionnement...');
    
    const moduleConfigs = [
      // === MODULE INVENTORY ===
      {
        id: 'inventory',
        critical: true,
        factory: this.createInventoryModule.bind(this),
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        priority: 100,
        
        // === CONFIGURATION POSITIONNEMENT ===
        layout: {
          anchor: 'bottom-right',
          order: 0,           // Premier dans le groupe (plus à droite)
          spacing: 10,
          group: 'ui-icons',
          size: { width: 70, height: 80 },
          offset: { x: 0, y: 0 },
          zIndex: 500
        },
        
        groups: ['ui-icons'],
        
        responsive: {
          mobile: { 
            layout: {
              size: { width: 60, height: 70 },
              spacing: 8
            }
          },
          tablet: { 
            layout: {
              size: { width: 65, height: 75 },
              spacing: 9
            }
          },
          desktop: { 
            layout: {
              size: { width: 70, height: 80 },
              spacing: 10
            }
          }
        }
      },
      
      // === MODULE QUEST ===
      {
        id: 'quest',
        critical: false,
        factory: this.createQuestModule.bind(this),
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        priority: 90,
        
        // === CONFIGURATION POSITIONNEMENT ===
        layout: {
          anchor: 'bottom-right',
          order: 1,           // Deuxième dans le groupe (milieu)
          spacing: 10,
          group: 'ui-icons',
          size: { width: 70, height: 80 },
          offset: { x: 0, y: 0 },
          zIndex: 500
        },
        
        groups: ['ui-icons'],
        
        responsive: {
          mobile: { 
            layout: {
              size: { width: 60, height: 70 },
              spacing: 8
            }
          },
          tablet: { 
            layout: {
              size: { width: 65, height: 75 },
              spacing: 9
            }
          }
        }
      },
      
      // === MODULE TEAM (POSITIONNÉ AUTOMATIQUEMENT) ===
      {
        id: 'team',
        critical: true,
        factory: this.createTeamModuleUnified.bind(this),
        defaultState: {
          visible: true,      // Icône visible par défaut
          enabled: true,      // Module activé
          initialized: false
        },
        priority: 100,
        
        // === CONFIGURATION POSITIONNEMENT AUTOMATIQUE ===
        layout: {
          anchor: 'bottom-right',
          order: 2,           // Troisième dans le groupe (plus à gauche)
          spacing: 10,
          group: 'ui-icons',  // Groupe pour positionnement automatique
          size: { width: 70, height: 80 },
          offset: { x: 0, y: 0 },
          zIndex: 500
        },
        
        groups: ['ui-icons'],
        
        responsive: {
          mobile: { 
            layout: {
              size: { width: 60, height: 70 },
              spacing: 8,
              order: 2
            }
          },
          tablet: { 
            layout: {
              size: { width: 65, height: 75 },
              spacing: 9,
              order: 2
            }
          },
          desktop: { 
            layout: {
              size: { width: 70, height: 80 },
              spacing: 10,
              order: 2
            }
          }
        },
        
        animations: {
          show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
          hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
          enable: { type: 'pulse', duration: 150 },
          disable: { type: 'grayscale', duration: 200 }
        },
        
        metadata: {
          name: 'Team Manager',
          description: 'Complete Pokemon team management system with auto-positioning',
          version: '1.0.0',
          category: 'Pokemon Management'
        }
      },
      
      // === MODULE QUEST TRACKER ===
      {
        id: 'questTracker',
        critical: false,
        factory: this.createQuestTrackerModule.bind(this),
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        priority: 80,
        
        // === CONFIGURATION POSITIONNEMENT ===
        layout: {
          anchor: 'top-right',
          order: 0,
          spacing: 15,
          group: 'panels',
          size: { width: 300, height: 200 },
          offset: { x: 0, y: 0 },
          zIndex: 400
        },
        
        groups: ['panels'],
        
        responsive: {
          mobile: { 
            layout: {
              anchor: 'top-left',
              size: { width: 250, height: 150 },
              spacing: 10
            }
          }
        }
      },
      
      // === MODULE CHAT ===
      {
        id: 'chat',
        critical: false,
        factory: this.createChatModule.bind(this),
        defaultState: {
          visible: true,
          enabled: true,
          initialized: false
        },
        priority: 70,
        
        // === CONFIGURATION POSITIONNEMENT ===
        layout: {
          anchor: 'bottom-left',
          order: 0,
          spacing: 10,
          group: 'social',
          size: { width: 400, height: 300 },
          offset: { x: 0, y: 0 },
          zIndex: 450
        },
        
        groups: ['social'],
        
        responsive: {
          mobile: { 
            layout: {
              anchor: 'bottom-center',
              size: { width: 300, height: 200 }
            }
          }
        }
      },
      
      // === MODULE BATTLEINTERFACE ===
      {
        id: 'battleInterface',
        critical: true,
        factory: this.createBattleInterfaceModule.bind(this),
        defaultState: {
          visible: false,
          enabled: true,
          initialized: false
        },
        priority: 150,
        
        // === CONFIGURATION POSITIONNEMENT ===
        layout: {
          anchor: 'center',
          order: 0,
          spacing: 0,
          group: 'battle-ui',
          size: { width: 800, height: 600 },
          offset: { x: 0, y: 0 },
          zIndex: 9999
        },
        
        groups: ['battle-ui'],
        
        responsive: {
          mobile: { 
            layout: {
              size: { width: '90vw', height: '70vh' },
              offset: { x: 0, y: 0 }
            }
          },
          tablet: { 
            layout: {
              size: { width: '80vw', height: '75vh' }
            }
          }
        }
      }
    ];

    // Enregistrer chaque module avec sa configuration de positionnement
    for (const config of moduleConfigs) {
      try {
        await this.uiManager.registerModule(config.id, config);
        console.log(`  📝 Module '${config.id}' enregistré avec positionnement ${config.layout.anchor} (order: ${config.layout.order})`);
      } catch (error) {
        console.error(`  ❌ Erreur module '${config.id}':`, error);
      }
    }
    
    console.log('✅ [PokemonUI] Tous les modules enregistrés avec positionnement');
  }

  // === FACTORIES DES MODULES ===

  async createInventoryModule() {
    console.log('🎒 [PokemonUI] Création module inventaire...');
    
    if (window.inventorySystemGlobal) {
      console.log('🔄 [PokemonUI] Réutilisation inventaire existant');
      return this.wrapExistingModule(window.inventorySystemGlobal, 'inventory');
    }
    
    if (typeof window.initInventorySystem === 'function') {
      const inventorySystem = window.initInventorySystem(window.currentGameRoom);
      return this.wrapExistingModule(inventorySystem, 'inventory');
    }
    
    console.warn('⚠️ [PokemonUI] Inventaire non disponible, création module vide');
    return this.createEmptyWrapper('inventory');
  }

  // === FACTORY TEAM AVEC POSITIONNEMENT AUTOMATIQUE ===
  async createTeamModuleUnified() {
    console.log('⚔️ [PokemonUI] Création module Team avec positionnement automatique...');
    
    try {
      // Import dynamique du système Team unifié
      const { createTeamModule } = await import('./Team/index.js');
      
      // Créer le module avec les paramètres du jeu
      const teamModule = await createTeamModule(
        window.currentGameRoom,
        window.game?.scene?.getScenes(true)[0]
      );
      
      // === IMPORTANT: Signaler que le positionnement est géré par UIManager ===
      if (teamModule.icon && teamModule.icon.iconElement) {
        // Supprimer tout positionnement manuel de TeamIcon
        const iconElement = teamModule.icon.iconElement;
        iconElement.style.position = '';
        iconElement.style.right = '';
        iconElement.style.bottom = '';
        iconElement.style.left = '';
        iconElement.style.top = '';
        
        console.log('📍 [PokemonUI] Positionnement manuel TeamIcon supprimé - UIManager prendra le relais');
      }
      
      // Exposer globalement pour compatibilité
      window.teamSystem = teamModule;
      window.toggleTeam = () => teamModule.toggleTeamUI();
      window.openTeam = () => teamModule.openTeam();
      window.closeTeam = () => teamModule.closeTeam();
      
      console.log('✅ [PokemonUI] Module Team unifié créé avec positionnement automatique');
      
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
      
      // === WRAPPER POUR BATTLEINTERFACE ===
      const battleInterfaceWrapper = {
        moduleType: 'battleInterface',
        originalModule: null,
        iconElement: null,
        isInitialized: false,
        
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
      module.icon?.iconElement,
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
      console.log('ℹ️ [PokemonUI] Callbacks non supportés en mode simplifié');
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
    
    console.log('🚀 [PokemonUI] Initialisation de tous les modules avec positionnement...');
    
    const result = await this.uiManager.initializeAllModules(
      window.currentGameRoom,
      window.game?.scene?.getScenes(true)[0]
    );
    
    if (result.success) {
      console.log('✅ [PokemonUI] Tous les modules initialisés et positionnés !');
      
      // Démonstration du positionnement automatique
      setTimeout(() => {
        this.demonstratePositioning();
      }, 1000);
    } else {
      console.warn('⚠️ [PokemonUI] Initialisation avec erreurs:', result.errors);
    }
    
    return result;
  }

  // === DÉMONSTRATION POSITIONNEMENT ===
  demonstratePositioning() {
    console.log('🎯 [PokemonUI] Démonstration du positionnement automatique Team...');
    
    const teamIconInfo = this.uiManager.registeredIcons.get('team');
    if (teamIconInfo) {
      console.log('📍 [Team] Position calculée automatiquement:', {
        anchor: teamIconInfo.layout.anchor,
        order: teamIconInfo.layout.order,
        group: teamIconInfo.layout.group,
        element: teamIconInfo.element ? 'OK' : 'Missing',
        position: teamIconInfo.element ? {
          left: teamIconInfo.element.style.left,
          top: teamIconInfo.element.style.top
        } : 'N/A'
      });
      
      // Test animation de positionnement
      if (teamIconInfo.element) {
        const originalTransform = teamIconInfo.element.style.transform;
        teamIconInfo.element.style.transform = 'scale(1.2)';
        teamIconInfo.element.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
          teamIconInfo.element.style.transform = originalTransform;
        }, 500);
        
        console.log('✨ [Team] Animation de démonstration positionnement');
      }
    } else {
      console.warn('⚠️ [Team] Icône non trouvée dans le système de positionnement');
    }
  }

  setGameState(stateName, options = {}) {
    if (!this.uiManager) {
      console.warn('⚠️ [PokemonUI] UIManager non initialisé');
      return false;
    }
    
    console.log(`🎮 [PokemonUI] Changement état avec repositionnement: ${stateName}`);
    
    return this.uiManager.setGameState(stateName, options);
  }

  // === MÉTHODES DE COMPATIBILITÉ ===
  
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
    
    console.warn(`⚠️ [PokemonUI] Module ${moduleId} non trouvé`);
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

  // === MÉTHODES DE TEST POSITIONNEMENT ===

  testPositioning() {
    console.log('🧪 [PokemonUI] Test du système de positionnement...');
    
    if (!this.uiManager || !this.uiManager.registeredIcons) {
      console.error('❌ Système de positionnement non disponible');
      return false;
    }
    
    console.log(`📊 Icônes enregistrées: ${this.uiManager.registeredIcons.size}`);
    console.log(`📦 Groupes créés: ${this.uiManager.groups.size}`);
    
    // Afficher les détails de chaque icône
    this.uiManager.registeredIcons.forEach((iconInfo, moduleId) => {
      console.log(`📍 ${moduleId}:`, {
        anchor: iconInfo.layout.anchor,
        order: iconInfo.layout.order,
        group: iconInfo.layout.group,
        size: iconInfo.layout.size,
        visible: iconInfo.visible,
        hasElement: !!iconInfo.element,
        position: iconInfo.element ? {
          left: iconInfo.element.style.left,
          top: iconInfo.element.style.top,
          display: iconInfo.element.style.display
        } : 'No element'
      });
    });
    
    // Afficher les groupes
    this.uiManager.groups.forEach((groupConfig, groupId) => {
      console.log(`📦 Groupe ${groupId}:`, {
        anchor: groupConfig.anchor,
        direction: groupConfig.direction,
        members: groupConfig.members,
        spacing: groupConfig.spacing
      });
    });
    
    return true;
  }

  testTeamPositioning() {
    console.log('🧪 [PokemonUI] Test spécifique positionnement Team...');
    
    const teamModule = this.getModule('team');
    if (!teamModule) {
      console.error('❌ Module Team non trouvé');
      return false;
    }
    
    const teamIconInfo = this.uiManager.registeredIcons.get('team');
    if (!teamIconInfo) {
      console.error('❌ Icône Team non enregistrée dans le système de positionnement');
      return false;
    }
    
    console.log('📍 [Team] Information positionnement:', {
      moduleId: 'team',
      anchor: teamIconInfo.layout.anchor,
      order: teamIconInfo.layout.order,
      group: teamIconInfo.layout.group,
      spacing: teamIconInfo.layout.spacing,
      size: teamIconInfo.layout.size,
      visible: teamIconInfo.visible,
      enabled: teamIconInfo.enabled,
      elementExists: !!teamIconInfo.element,
      elementPosition: teamIconInfo.element ? {
        position: teamIconInfo.element.style.position,
        left: teamIconInfo.element.style.left,
        top: teamIconInfo.element.style.top,
        right: teamIconInfo.element.style.right,
        bottom: teamIconInfo.element.style.bottom,
        zIndex: teamIconInfo.element.style.zIndex
      } : 'No element'
    });
    
    // Test repositionnement
    console.log('🔄 [Team] Test repositionnement...');
    this.uiManager.layoutManager.calculatePosition('team');
    
    // Test animation
    if (teamIconInfo.element) {
      console.log('✨ [Team] Test animation...');
      teamIconInfo.element.style.transition = 'all 0.3s ease';
      teamIconInfo.element.style.transform = 'scale(1.1) rotate(5deg)';
      
      setTimeout(() => {
        teamIconInfo.element.style.transform = '';
      }, 300);
    }
    
    return true;
  }

  repositionAllIcons() {
    console.log('🔄 [PokemonUI] Repositionnement de toutes les icônes...');
    
    if (this.uiManager && this.uiManager.layoutManager) {
      this.uiManager.layoutManager.recalculateAllPositions();
      console.log('✅ [PokemonUI] Repositionnement terminé');
      return true;
    }
    
    console.error('❌ [PokemonUI] LayoutManager non disponible');
    return false;
  }

  // === DEBUGGING ===
  
  debugInfo() {
    if (!this.uiManager) {
      console.log('❌ [PokemonUI] UIManager non initialisé');
      return { error: 'UIManager non initialisé' };
    }
    
    console.group('🎮 === POKEMON UI SYSTEM DEBUG (AVEC POSITIONNEMENT) ===');
    console.log('🎯 État actuel:', this.currentGameState);
    console.log('📊 Modules enregistrés:', this.moduleInstances.size);
    console.log('📍 Icônes positionnées:', this.uiManager.registeredIcons?.size || 0);
    console.log('📦 Groupes créés:', this.uiManager.groups?.size || 0);
    
    this.moduleInstances.forEach((wrapper, moduleId) => {
      const iconInfo = this.uiManager.registeredIcons?.get(moduleId);
      console.log(`  📦 ${moduleId}:`, {
        hasIconElement: !!wrapper.iconElement,
        isEmpty: wrapper.isEmpty,
        originalModule: !!wrapper.originalModule,
        positioned: !!iconInfo,
        anchor: iconInfo?.layout?.anchor,
        order: iconInfo?.layout?.order,
        group: iconInfo?.layout?.group
      });
    });
    
    const uiStats = this.uiManager.debugInfo ? this.uiManager.debugInfo() : { mode: 'unknown' };
    console.groupEnd();
    
    return {
      currentGameState: this.currentGameState,
      modulesCount: this.moduleInstances.size,
      iconsCount: this.uiManager.registeredIcons?.size || 0,
      groupsCount: this.uiManager.groups?.size || 0,
      uiManagerStats: uiStats,
      initialized: this.initialized,
      positioning: {
        enabled: true,
        layoutManager: !!this.uiManager.layoutManager,
        registeredIcons: this.uiManager.registeredIcons ? 
          Object.fromEntries(this.uiManager.registeredIcons) : {},
        groups: this.uiManager.groups ? 
          Object.fromEntries(this.uiManager.groups) : {}
      }
    };
  }

  testAllModules() {
    console.log('🧪 [PokemonUI] Test de tous les modules avec positionnement...');
    
    const results = {};
    
    this.moduleInstances.forEach((wrapper, moduleId) => {
      try {
        console.log(`🧪 Test module: ${moduleId}`);
        
        wrapper.show();
        setTimeout(() => wrapper.hide(), 500);
        setTimeout(() => wrapper.show(), 1000);
        
        wrapper.setEnabled(false);
        setTimeout(() => wrapper.setEnabled(true), 1500);
        
        // Test repositionnement si icône enregistrée
        const iconInfo = this.uiManager.registeredIcons?.get(moduleId);
        if (iconInfo) {
          setTimeout(() => {
            this.uiManager.layoutManager.calculatePosition(moduleId);
          }, 2000);
        }
        
        results[moduleId] = { 
          success: true, 
          positioned: !!iconInfo,
          anchor: iconInfo?.layout?.anchor,
          order: iconInfo?.layout?.order
        };
        console.log(`  ✅ ${moduleId}: OK (positionné: ${!!iconInfo})`);
        
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

export async function initializePokemonUIWithPositioning() {
  console.log('🎮 [PokemonUI] === INITIALISATION SYSTÈME UI POKÉMON AVEC POSITIONNEMENT ===');
  
  try {
    const success = await pokemonUISystem.initialize();
    
    if (!success) {
      throw new Error('Échec initialisation PokemonUISystem');
    }
    
    const result = await pokemonUISystem.initializeAllModules();
    
    window.pokemonUISystem = pokemonUISystem;
    window.uiManager = pokemonUISystem.uiManager;
    
    setupCompatibilityFunctions();
    setupPositioningFunctions();
    
    console.log('✅ [PokemonUI] Système UI Pokémon avec positionnement initialisé !');
    
    return {
      success: result.success,
      uiSystem: pokemonUISystem,
      uiManager: pokemonUISystem.uiManager,
      errors: result.errors || [],
      positioning: true
    };
    
  } catch (error) {
    console.error('❌ [PokemonUI] Erreur initialisation:', error);
    
    return {
      success: false,
      error: error.message,
      uiSystem: null,
      uiManager: null,
      positioning: false
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
  
  console.log('✅ [PokemonUI] Fonctions de compatibilité configurées');
}

// === NOUVELLES FONCTIONS DE POSITIONNEMENT ===
function setupPositioningFunctions() {
  console.log('📍 [PokemonUI] Configuration fonctions de positionnement...');
  
  // Test positionnement général
  window.testPositioning = () => {
    if (pokemonUISystem.testPositioning) {
      return pokemonUISystem.testPositioning();
    }
    return false;
  };

  // Test positionnement Team spécifique
  window.testTeamPositioning = () => {
    if (pokemonUISystem.testTeamPositioning) {
      return pokemonUISystem.testTeamPositioning();
    }
    return false;
  };

  // Repositionnement manuel
  window.repositionAllIcons = () => {
    if (pokemonUISystem.repositionAllIcons) {
      return pokemonUISystem.repositionAllIcons();
    }
    return false;
  };

  // Debug positionnement
  window.debugPositioning = () => {
    if (!window.pokemonUISystem?.uiManager) {
      return { error: 'UIManager non disponible' };
    }
    
    const uiManager = window.pokemonUISystem.uiManager;
    
    return {
      registeredIcons: uiManager.registeredIcons ? 
        Object.fromEntries(uiManager.registeredIcons) : {},
      groups: uiManager.groups ? 
        Object.fromEntries(uiManager.groups) : {},
      layoutManager: !!uiManager.layoutManager,
      viewport: uiManager.layoutManager ? 
        uiManager.layoutManager.viewport : {},
      totalIcons: uiManager.registeredIcons?.size || 0,
      totalGroups: uiManager.groups?.size || 0
    };
  };

  // Repositionner un module spécifique
  window.repositionModule = (moduleId) => {
    const uiManager = window.pokemonUISystem?.uiManager;
    if (uiManager && uiManager.layoutManager) {
      uiManager.layoutManager.calculatePosition(moduleId);
      console.log(`📍 Module ${moduleId} repositionné`);
      return true;
    }
    return false;
  };

  // Changer la position d'un module
  window.changeModulePosition = (moduleId, newConfig) => {
    const uiManager = window.pokemonUISystem?.uiManager;
    if (uiManager && uiManager.updateIconPosition) {
      uiManager.updateIconPosition(moduleId, newConfig);
      console.log(`📍 Position ${moduleId} mise à jour:`, newConfig);
      return true;
    }
    return false;
  };

  // Test de démonstration
  window.demonstrateTeamPositioning = () => {
    if (pokemonUISystem.demonstratePositioning) {
      return pokemonUISystem.demonstratePositioning();
    }
    return false;
  };
  
  console.log('✅ [PokemonUI] Fonctions de positionnement configurées');
  console.log('📍 Utilisez window.testPositioning() pour tester');
  console.log('⚔️ Utilisez window.testTeamPositioning() pour Team');
  console.log('🔄 Utilisez window.repositionAllIcons() pour repositionner');
  console.log('🔍 Utilisez window.debugPositioning() pour debug');
  console.log('📍 Utilisez window.repositionModule(moduleId) pour un module');
  console.log('🎯 Utilisez window.changeModulePosition(moduleId, config) pour changer position');
}

// === EXPORT PAR DÉFAUT ===
export default pokemonUISystem;

console.log(`
🎯 === UI MANAGER AVEC POSITIONNEMENT AUTOMATIQUE TEAM ===

🆕 NOUVELLES FONCTIONNALITÉS:
• Positionnement automatique de toutes les icônes
• UIManager calcule les positions (pas TeamIcon)
• Système de groupes (ui-icons: inventory, quest, team)
• Recalcul automatique au resize
• Configuration responsive

📍 CONFIGURATION TEAM:
• anchor: 'bottom-right'
• order: 2 (après inventory et quest)
• group: 'ui-icons'
• spacing: 10px automatique
• Position calculée par UIManager

🎮 UTILISATION:
await initializePokemonUIWithPositioning()

🧪 TESTS:
• window.testPositioning() → test général
• window.testTeamPositioning() → test Team
• window.debugPositioning() → debug
• window.repositionAllIcons() → repositionner

✅ TEAM POSITIONNÉ AUTOMATIQUEMENT !
`);
