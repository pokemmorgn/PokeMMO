// client/src/ui.js - Système UI Manager centralisé pour Pokémon MMO
// ✅ Version COMPLÈTE CORRIGÉE avec positions d'icônes fixes et protection anti-chevauchement

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
  visibleModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
  enabledModules: ['inventory', 'quest', 'pokedex', 'team', 'questTracker'],
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
  visibleModules: [],
  enabledModules: [],
  hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'pokedex'],
  disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'pokedex']
},
  
pokemonCenter: {
  visibleModules: ['team', 'inventory', 'pokedex'],
  enabledModules: ['team', 'inventory', 'pokedex'],
  hiddenModules: ['questTracker'],
  disabledModules: ['quest']
},
  
  dialogue: {
    visibleModules: ['inventory', 'team', 'quest'],
    enabledModules: [],
    hiddenModules: ['questTracker'],
    disabledModules: ['inventory', 'team', 'quest']
  },
  
menu: {
  visibleModules: ['inventory', 'quest', 'pokedex', 'team'],
  enabledModules: ['inventory', 'quest', 'pokedex', 'team'],
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

  // ✅ FIX: Forcer le reload du UIManager pour éviter le cache
  async loadUIManager() {
    try {
      // ✅ FIX: Forcer le reload avec timestamp pour éviter le cache
      const timestamp = Date.now();
      const uiManagerModule = await import(`./managers/UIManager.js?v=${timestamp}`);
      const UIManagerClass = uiManagerModule.UIManager;
      
      if (!UIManagerClass || typeof UIManagerClass.prototype.registerIconPosition !== 'function') {
        throw new Error('UIManager incomplet');
      }
      
      console.log(`🔄 [PokemonUI] UIManager rechargé avec timestamp: ${timestamp}`);
      return UIManagerClass;
      
    } catch (importError) {
      console.warn('⚠️ [PokemonUI] Fallback import UIManager:', importError);
      const fallbackTimestamp = Date.now() + 1000;
      const uiManagerModule = await import(`./managers/UIManager.js?v=${fallbackTimestamp}`);
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

  // ✅ QUEST MODULE COMPLET AVEC PROTECTION ANTI-CHEVAUCHEMENT
  async createQuestModule() {
    try {
      console.log('🚀 [PokemonUI] Création QuestSystem avec protection position complète...');
      
      // ✅ ÉTAPE 1: Import et création du QuestSystem
      const { createQuestSystem } = await import('./Quest/QuestSystem.js');
      
      const questSystem = await createQuestSystem(
        window.currentGameRoom,
        window.globalNetworkManager || window.networkManager
      );
      
      if (!questSystem) {
        throw new Error('Échec création QuestSystem');
      }
      
      console.log('✅ [PokemonUI] QuestSystem créé avec succès');
      
      // ✅ ÉTAPE 2: Attendre que l'icône soit créée ET que UIManager soit prêt
      let attempts = 0;
      const maxAttempts = 30; // Augmenté à 30 pour plus de sécurité
      
      while (attempts < maxAttempts) {
        if (questSystem.icon && questSystem.icon.iconElement && this.uiManager) {
          console.log(`✅ [PokemonUI] Icône Quest et UIManager prêts (tentative ${attempts + 1})`);
          break;
        }
        
        if (attempts % 5 === 0) {
          console.log(`⏳ [PokemonUI] Attente icône Quest et UIManager (${attempts + 1}/${maxAttempts})...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('⚠️ [PokemonUI] Timeout attente icône Quest - continuons quand même');
      }
      
      // ✅ ÉTAPE 3: PATCH CRITIQUE QuestIcon.forceDisplay() pour respecter UIManager
      if (questSystem.icon && questSystem.icon.forceDisplay) {
        console.log('🔧 [PokemonUI] Application patch QuestIcon.forceDisplay()...');
        
        // Sauvegarder la méthode originale
        if (!questSystem.icon._originalForceDisplay) {
          questSystem.icon._originalForceDisplay = questSystem.icon.forceDisplay.bind(questSystem.icon);
        }
        
        // Patch de sécurité anti-écrasement position
        questSystem.icon.forceDisplay = function() {
          if (!this.iconElement) return;
          
          // ✅ Appliquer SEULEMENT les styles de visibilité
          this.iconElement.style.display = 'block';
          this.iconElement.style.visibility = 'visible';
          this.iconElement.style.opacity = '1';
          this.iconElement.style.pointerEvents = 'auto';
          this.iconElement.style.zIndex = '1000';
          
          // ✅ Supprimer classes cachées
          this.iconElement.classList.remove('hidden', 'ui-hidden');
          
          // 🔥 PROTECTION PRINCIPALE: Respecter position UIManager
          const positionedBy = this.iconElement.getAttribute('data-positioned-by');
          
          if (positionedBy && (
            positionedBy.includes('uimanager') || 
            positionedBy.includes('manual-fix') || 
            positionedBy.includes('emergency') ||
            positionedBy.includes('auto-correction')
          )) {
            console.log('🛡️ [QuestIcon-PATCH] Position UIManager respectée - PAS d\'écrasement');
            return; // ✅ SORTIR SANS TOUCHER À LA POSITION
          }
          
          // ✅ Position de secours UNIQUEMENT si vraiment aucune position
          const hasPosition = !!(
            this.iconElement.style.left || 
            this.iconElement.style.right || 
            this.iconElement.style.top || 
            this.iconElement.style.bottom
          );
          
          if (!hasPosition) {
            console.log('⚠️ [QuestIcon-PATCH] Position de secours appliquée (aucune position détectée)');
            this.iconElement.style.position = 'fixed';
            this.iconElement.style.right = '20px';
            this.iconElement.style.bottom = '20px';
          } else {
            console.log('ℹ️ [QuestIcon-PATCH] Position existante conservée');
          }
          
          console.log('✅ [QuestIcon-PATCH] forceDisplay() sans écrasement position');
        };
        
        console.log('✅ [PokemonUI] QuestIcon.forceDisplay() patchée avec succès');
      }
      
      // ✅ ÉTAPE 4: Nettoyage préventif avant connexion UIManager
      if (questSystem.icon && questSystem.icon.iconElement) {
        const element = questSystem.icon.iconElement;
        
        console.log('🧹 [PokemonUI] Nettoyage préventif position Quest...');
        
        // Supprimer toutes les positions inline de secours
        element.style.right = '';
        element.style.bottom = '';
        element.style.left = '';
        element.style.top = '';
        
        // S'assurer que l'élément est visible
        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        
        console.log('✅ [PokemonUI] Nettoyage préventif terminé');
      }
      
      // ✅ ÉTAPE 5: Connexion UIManager avec vérification robuste
      if (this.uiManager && questSystem.connectUIManager) {
        console.log('🔗 [PokemonUI] Connexion UIManager...');
        
        const connected = questSystem.connectUIManager(this.uiManager);
        console.log(`🔗 [PokemonUI] UIManager connexion: ${connected ? 'SUCCÈS' : 'ÉCHEC'}`);
        
        // ✅ Force repositioning après connexion avec délai
        if (connected) {
          setTimeout(() => {
            if (this.uiManager.positionIcon) {
              console.log('🔧 [PokemonUI] Force repositioning Quest après connexion...');
              this.uiManager.positionIcon('quest');
              
              // Vérifier que la position a été appliquée
              setTimeout(() => {
                const element = document.querySelector('#quest-icon');
                if (element) {
                  const rect = element.getBoundingClientRect();
                  console.log(`📐 [PokemonUI] Position Quest après UIManager: ${Math.round(rect.left)}px`);
                }
              }, 100);
            }
          }, 200);
        } else {
          // ✅ Fallback si connexion UIManager échoue
          console.warn('⚠️ [PokemonUI] Connexion UIManager échouée, fallback manuel...');
          setTimeout(() => {
            this.applyManualQuestPosition();
          }, 500);
        }
      }
      
      // ✅ ÉTAPE 6: AUTO-CORRECTION avec surveillance continue
      if (questSystem.icon && questSystem.icon.iconElement) {
        console.log('👁️ [PokemonUI] Mise en place surveillance anti-écrasement...');
        
        const questElement = questSystem.icon.iconElement;
        let lastKnownGoodPosition = null;
        let correctionCount = 0;
        const maxCorrections = 5;
        
        const positionWatcher = () => {
          if (correctionCount >= maxCorrections) {
            console.log('⏹️ [PokemonUI] Limite corrections atteinte, arrêt surveillance');
            return;
          }
          
          const rect = questElement.getBoundingClientRect();
          const currentLeft = Math.round(rect.left);
          
          // Position attendue pour quest (order=1)
          const iconWidth = 70;
          const spacing = 10;
          const padding = 20;
          const baseX = window.innerWidth - padding;
          const expectedX = baseX + (-1 * (iconWidth + spacing) - iconWidth); // order=1
          
          // Vérifier si position incorrecte (tolérance 10px)
          const isIncorrectPosition = Math.abs(currentLeft - expectedX) > 10;
          
          // Vérifier chevauchement avec inventory (position 1683)
          const isOverlapping = Math.abs(currentLeft - 1683) < 10;
          
          if (isIncorrectPosition || isOverlapping) {
            correctionCount++;
            console.warn(`🚨 [PokemonUI] Position Quest incorrecte détectée (${correctionCount}/${maxCorrections}):`, {
              current: currentLeft,
              expected: expectedX,
              overlapping: isOverlapping
            });
            
            // Auto-correction
            const baseY = window.innerHeight - padding - 80;
            
            questElement.style.position = 'fixed';
            questElement.style.left = `${expectedX}px`;
            questElement.style.top = `${baseY}px`;
            questElement.style.right = '';
            questElement.style.bottom = '';
            questElement.setAttribute('data-positioned-by', `auto-correction-${correctionCount}`);
            
            console.log(`🔧 [PokemonUI] Auto-correction ${correctionCount} appliquée: ${currentLeft} → ${expectedX}`);
            
            // Sauvegarder la bonne position
            lastKnownGoodPosition = expectedX;
          } else if (Math.abs(currentLeft - expectedX) <= 10) {
            // Position correcte détectée
            lastKnownGoodPosition = currentLeft;
          }
        };
        
        // Surveillance initiale après 2 secondes
        setTimeout(() => {
          console.log('🔍 [PokemonUI] Première vérification position Quest...');
          positionWatcher();
        }, 2000);
        
        // Surveillance continue toutes les 5 secondes pendant 1 minute
        let watchCount = 0;
        const maxWatches = 12; // 12 * 5s = 1 minute
        
        const watchInterval = setInterval(() => {
          watchCount++;
          if (watchCount > maxWatches || correctionCount >= maxCorrections) {
            clearInterval(watchInterval);
            console.log('⏹️ [PokemonUI] Surveillance Quest terminée');
            return;
          }
          
          positionWatcher();
        }, 5000);
        
        console.log('✅ [PokemonUI] Surveillance anti-écrasement activée (1 minute)');
      }
      
      // ✅ ÉTAPE 7: Vérification finale différée
      setTimeout(() => {
        this.verifyQuestIconPosition();
      }, 3000);
      
      // ✅ ÉTAPE 8: Exposer globalement avec API complète
      window.questSystem = questSystem;
      window.questSystemGlobal = questSystem;
      
      // Fonctions globales de compatibilité
      window.toggleQuest = () => {
        try {
          questSystem.toggle();
        } catch (error) {
          console.error('❌ Erreur toggleQuest:', error);
        }
      };
      
      window.openQuest = () => {
        try {
          questSystem.show();
        } catch (error) {
          console.error('❌ Erreur openQuest:', error);
        }
      };
      
      window.closeQuest = () => {
        try {
          questSystem.hide();
        } catch (error) {
          console.error('❌ Erreur closeQuest:', error);
        }
      };
      
      // ✅ Fonction de debug spécifique Quest
      window.debugQuestPosition = () => {
        const element = document.querySelector('#quest-icon');
        if (element) {
          const rect = element.getBoundingClientRect();
          const positionedBy = element.getAttribute('data-positioned-by');
          
          const info = {
            position: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            positionedBy: positionedBy,
            hasInlineStyles: {
              left: !!element.style.left,
              right: !!element.style.right,
              top: !!element.style.top,
              bottom: !!element.style.bottom
            },
            computed: {
              position: window.getComputedStyle(element).position,
              zIndex: window.getComputedStyle(element).zIndex
            }
          };
          
          console.log('🔍 [DEBUG] Quest Icon Position:', info);
          return info;
        }
        return null;
      };
      
      console.log('✅ [PokemonUI] QuestSystem exposé globalement avec API complète');
      
      // ✅ RETOUR DU MODULE
      return questSystem;
      
    } catch (error) {
      console.error('❌ [PokemonUI] Erreur création QuestSystem:', error);
      
      // ✅ Fallback gracieux
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

  // ✅ MÉTHODES AUXILIAIRES POUR QUEST
  applyManualQuestPosition() {
    console.log('🛠️ [PokemonUI] Application position Quest manuelle...');
    
    const questElement = document.querySelector('#quest-icon');
    if (!questElement) {
      console.warn('⚠️ [PokemonUI] Element #quest-icon non trouvé pour position manuelle');
      return false;
    }
    
    const iconWidth = 70;
    const spacing = 10;
    const padding = 20;
    const baseX = window.innerWidth - padding;
    const baseY = window.innerHeight - padding - 80;
    
    // Position pour order=1
    const offsetX = -1 * (iconWidth + spacing) - iconWidth;
    const finalX = baseX + offsetX;
    
    questElement.style.position = 'fixed';
    questElement.style.left = `${finalX}px`;
    questElement.style.top = `${baseY}px`;
    questElement.style.right = '';
    questElement.style.bottom = '';
    questElement.setAttribute('data-positioned-by', 'manual-fallback');
    
    console.log(`✅ [PokemonUI] Position Quest manuelle appliquée: (${finalX}, ${baseY})`);
    return true;
  }

  verifyQuestIconPosition() {
    console.log('🔍 [PokemonUI] Vérification finale position Quest...');
    
    const questIcon = document.querySelector('#quest-icon');
    const inventoryIcon = document.querySelector('#inventory-icon');
    
    if (!questIcon || !inventoryIcon) {
      console.warn('⚠️ [PokemonUI] Icônes Quest ou Inventory non trouvées pour vérification');
      return false;
    }
    
    const questRect = questIcon.getBoundingClientRect();
    const inventoryRect = inventoryIcon.getBoundingClientRect();
    
    const questLeft = Math.round(questRect.left);
    const inventoryLeft = Math.round(inventoryRect.left);
    const overlap = Math.abs(questLeft - inventoryLeft) < 10;
    
    if (overlap) {
      console.error('💥 [PokemonUI] CHEVAUCHEMENT DÉTECTÉ après initialisation !');
      console.log('📐 Quest:', { left: questLeft, positionedBy: questIcon.getAttribute('data-positioned-by') });
      console.log('📐 Inventory:', { left: inventoryLeft, positionedBy: inventoryIcon.getAttribute('data-positioned-by') });
      
      // ✅ Auto-correction d'urgence
      console.log('🚨 [PokemonUI] Application correction d\'urgence...');
      const corrected = this.applyManualQuestPosition();
      
      if (corrected) {
        // Re-vérifier après correction
        setTimeout(() => {
          const newQuestRect = questIcon.getBoundingClientRect();
          const newOverlap = Math.abs(newQuestRect.left - inventoryRect.left) < 10;
          
          if (newOverlap) {
            console.error('💥 [PokemonUI] Correction d\'urgence ÉCHOUÉE !');
          } else {
            console.log('✅ [PokemonUI] Correction d\'urgence RÉUSSIE !');
          }
        }, 500);
      }
      
      return false;
    } else {
      console.log('✅ [PokemonUI] Position Quest validée - pas de chevauchement');
      console.log(`📐 Positions finales: Quest=${questLeft}px, Inventory=${inventoryLeft}px (écart: ${Math.abs(questLeft - inventoryLeft)}px)`);
      return true;
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
});

console.log('✅ [PokemonUI] Système UI Pokémon CORRIGÉ avec protection anti-chevauchement chargé');
console.log('🎮 Utilisez initializePokemonUI() pour démarrer');
console.log('🔧 Utilisez autoInitializePokemonUI() pour auto-réparation');
console.log('🔍 Utilisez window.debugPokemonUI() pour diagnostiquer');
console.log('🛡️ Protection Quest: window.debugQuestPosition(), window.pokemonUISystem.verifyQuestIconPosition()');
