// Pokedex/index.js - Module Pokédx avec traductions temps réel
// 🌐 Support complet des traductions à chaud selon le pattern établi

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { PokedexSystem } from './PokedexSystem.js';
import { PokedexIcon } from './PokedexIcon.js';
import { PokedexUI } from './PokedexUI.js';
import { t } from '../managers/LocalizationManager.js';

export class PokedexModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    const pokedexOptions = {
      singleton: true,
      autoCloseUI: true,
      keyboardShortcut: 'p',
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 1,
        group: 'ui-icons'
      },
      optionsManager: options.optionsManager || null,
      ...options
    };
    
    super(moduleId || 'pokedex', gameRoom, scene, pokedexOptions);
    
    this.system = null;
    this.pokedexData = {};
    this.playerStats = {};
    this.notifications = [];
    
    console.log('📱 [PokedexModule] Instance créée');
  }
  
  // === 🎯 IMPLÉMENTATION MÉTHODES ABSTRAITES ===
  
  async init() {
    console.log('🚀 [PokedexModule] Initialisation...');
    
    this.system = new PokedexSystem(
      this.scene, 
      this.gameRoom, 
      this.options.optionsManager
    );
    
    console.log('✅ [PokedexModule] Système initialisé');
  }
  
  createComponents() {
    if (this.system) {
      this.ui = this.system.pokedexUI;
      this.icon = this.system.pokedexIcon;
      
      if (this.icon && !this.icon.iconElement) {
        this.icon.init();
      }
      
      if (this.icon && this.icon.iconElement) {
        this.icon.positioningMode = 'uimanager';
        
        // Supprimer positionnement automatique
        const styles = ['position', 'right', 'bottom', 'left', 'top', 'zIndex'];
        styles.forEach(style => {
          this.icon.iconElement.style[style] = '';
        });
      }
    }
  }
  
  connectComponents() {
    if (this.icon) {
      this.icon.onClick = () => {
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    this.ensureIconForUIManager();
  }
  
  // === 🌐 SUPPORT LANGUE ===
  
  setupLanguageSupport() {
    if (this.options.optionsManager?.addLanguageListener) {
      this.cleanupLanguageListener = this.options.optionsManager.addLanguageListener(() => {
        this.updateLanguage();
      });
    }
    
    this.updateLanguage();
  }
  
  updateLanguage() {
    // Les composants gèrent leurs propres traductions
    // Le module peut gérer des messages spécifiques ici
  }
  
  // === 🔧 MÉTHODE D'INJECTION TARDIVE ===
  
  setOptionsManager(optionsManager) {
    this.options.optionsManager = optionsManager;
    
    if (this.system) {
      this.system.setOptionsManager(optionsManager);
    }
    
    this.setupLanguageSupport();
  }
  
  // === 📊 MÉTHODES POKÉDX ===
  
  show() {
    const result = super.show();
    
    if (this.system) {
      setTimeout(() => {
        this.system.requestPokedexData();
      }, 200);
    }
    
    return result;
  }
  
  markPokemonSeen(pokemonId, level, location, options = {}) {
    if (this.system) {
      this.system.markPokemonSeen(pokemonId, level, location, options);
    }
  }
  
  markPokemonCaught(pokemonId, level, location, ownedPokemonId, options = {}) {
    if (this.system) {
      this.system.markPokemonCaught(pokemonId, level, location, ownedPokemonId, options);
    }
  }
  
  isPokemonSeen(pokemonId) {
    return this.system ? this.system.isPokemonSeen(pokemonId) : false;
  }
  
  isPokemonCaught(pokemonId) {
    return this.system ? this.system.isPokemonCaught(pokemonId) : false;
  }
  
  getPlayerStats() {
    return this.system ? this.system.getPlayerStats() : {};
  }
  
  searchPokemon(filters = {}) {
    if (this.system) {
      return this.system.searchPokemon(filters);
    }
    return [];
  }
  
  togglePokemonFavorite(pokemonId) {
    if (this.system) {
      this.system.togglePokemonFavorite(pokemonId);
    }
  }
  
  getFavoritesPokemon() {
    return this.system ? this.system.getFavoritesPokemon() : [];
  }
  
  getNotifications() {
    return this.system ? this.system.getNotifications() : [];
  }
  
  markNotificationRead(notificationId) {
    if (this.system) {
      this.system.markNotificationRead(notificationId);
    }
  }
  
  syncPokedex() {
    if (this.system) {
      this.system.syncPokedex();
    }
  }
  
  getPokemonEntry(pokemonId) {
    return this.system ? this.system.getPokemonEntry(pokemonId) : null;
  }
  
  getCompletionRate() {
    const stats = this.getPlayerStats();
    return stats.caughtPercentage || 0;
  }
  
  openToView(viewName) {
    if (this.ui) {
      this.ui.openToView(viewName);
    }
  }
  
  // API legacy pour compatibilité
  togglePokedexUI() {
    this.toggleUI();
  }
  
  openPokedex() {
    this.open();
  }
  
  closePokedex() {
    this.close();
  }
  
  isPokedexOpen() {
    return this.ui ? this.ui.isVisible : false;
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS POKÉDX ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    return {
      ...baseState,
      hasData: this.ui ? Object.keys(this.ui.pokedexData || {}).length > 0 : false,
      completionRate: this.getCompletionRate(),
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      hasNotifications: this.notifications.length > 0,
      canOpen: this.canOpenUI(),
      moduleType: 'pokedex',
      hasLanguageSupport: !!this.options.optionsManager
    };
  }
  
  canOpenUI() {
    const dialogueBox = document.querySelector('#dialogue-box');
    const dialogueVisible = dialogueBox && 
      window.getComputedStyle(dialogueBox).display !== 'none' &&
      window.getComputedStyle(dialogueBox).visibility !== 'hidden' &&
      !dialogueBox.hidden;
    
    const otherBlockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#team-overlay:not(.hidden)'),
      document.querySelector('#shop-overlay:not(.hidden)'),
      document.querySelector('#inventory-overlay:not(.hidden)')
    ].filter(el => el !== null);
    
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    let isEnabled = true;
    
    if (this.uiManagerState && typeof this.uiManagerState.enabled !== 'undefined') {
      isEnabled = this.uiManagerState.enabled;
    } else if (typeof this.isEnabled !== 'undefined') {
      isEnabled = this.isEnabled;
    }
    
    return !dialogueVisible && 
           otherBlockers.length === 0 && 
           !chatFocused && 
           !starterHudOpen && 
           isEnabled;
  }
  
  exposeGlobally() {
    if (!window.pokedexSystem) {
      window.pokedexSystem = this.system;
      window.pokedexSystemGlobal = this;
    }
  }
  
  async initializeModule() {
    const result = await super.initializeModule();
    this.exposeGlobally();
    return result;
  }
  
  ensureIconForUIManager() {
    if (this.icon && this.icon.iconElement) {
      this.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
      
      const styles = ['position', 'right', 'bottom', 'left', 'top', 'zIndex'];
      styles.forEach(style => {
        this.icon.iconElement.style[style] = '';
      });
      
      return true;
    }
    
    return false;
  }
  
  // === 🎮 INTÉGRATION AVEC LE JEU ===
  
  onPokemonEncounter(pokemonData) {
    if (!pokemonData || !pokemonData.pokemonId) return;
    
    this.markPokemonSeen(
      pokemonData.pokemonId,
      pokemonData.level || 1,
      pokemonData.location || 'Inconnu',
      {
        method: pokemonData.encounterType || 'wild',
        weather: pokemonData.weather,
        timeOfDay: pokemonData.timeOfDay,
        biome: pokemonData.biome
      }
    );
    
    if (!this.isPokemonSeen(pokemonData.pokemonId)) {
      this.icon?.animateNewDiscovery();
    }
  }
  
  onPokemonCapture(pokemonData) {
    if (!pokemonData || !pokemonData.pokemonId || !pokemonData.ownedPokemonId) return;
    
    this.markPokemonCaught(
      pokemonData.pokemonId,
      pokemonData.level || 1,
      pokemonData.location || 'Inconnu',
      pokemonData.ownedPokemonId,
      {
        method: pokemonData.captureMethod || 'wild',
        ballType: pokemonData.ballType || 'poke_ball',
        isShiny: pokemonData.isShiny || false,
        isFirstAttempt: pokemonData.isFirstAttempt,
        criticalCapture: pokemonData.criticalCapture,
        weather: pokemonData.weather,
        timeOfDay: pokemonData.timeOfDay
      }
    );
    
    this.icon?.animateCapture();
    
    if (pokemonData.isShiny) {
      this.icon?.showCaptureNotification(pokemonData);
    }
    
    const newCompletionRate = this.getCompletionRate();
    const milestones = [25, 50, 75, 100];
    
    for (const milestone of milestones) {
      if (newCompletionRate >= milestone && this.playerStats.caughtPercentage < milestone) {
        this.icon?.animateMilestone(milestone);
        break;
      }
    }
  }
  
  onPokemonEvolution(evolutionData) {
    if (!evolutionData || !evolutionData.newPokemonId) return;
    
    if (!this.isPokemonSeen(evolutionData.newPokemonId)) {
      this.markPokemonSeen(
        evolutionData.newPokemonId,
        evolutionData.level || 1,
        evolutionData.location || 'Évolution',
        {
          method: 'evolution',
          fromPokemon: evolutionData.fromPokemonId
        }
      );
    }
    
    if (evolutionData.ownedPokemonId) {
      this.markPokemonCaught(
        evolutionData.newPokemonId,
        evolutionData.level || 1,
        evolutionData.location || 'Évolution',
        evolutionData.ownedPokemonId,
        {
          method: 'evolution',
          fromPokemon: evolutionData.fromPokemonId
        }
      );
    }
    
    this.icon?.animateNewDiscovery();
  }
  
  getRecommendations() {
    if (!this.system) return [];
    return [];
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    super.destroy();
  }
}

// === 🏭 FACTORY POKÉDX ===

export async function createPokedexModule(gameRoom, scene, options = {}) {
  try {
    const pokedexOptions = {
      singleton: true,
      ...options
    };
    
    const pokedexInstance = await createModule(PokedexModule, 'pokedex', gameRoom, scene, pokedexOptions);
    
    console.log('✅ [PokedexFactory] Module créé');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexFactory] Erreur création:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POKÉDX ===

export const POKEDEX_MODULE_CONFIG = generateModuleConfig('pokedex', {
  moduleClass: PokedexModule,
  order: 1,
  
  options: {
    singleton: true,
    keyboardShortcut: 'p'
  },
  
  groups: ['ui-icons', 'data-management'],
  
  metadata: {
    name: 'Pokédx National',
    description: 'Complete Pokédx system with discovery tracking',
    version: '1.0.0',
    category: 'Data Management'
  },
  
  factory: () => createPokedexModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

export async function registerPokedexModule(uiManager) {
  try {
    if (uiManager.modules && uiManager.modules.has('pokedex')) {
      return true;
    }
    
    await uiManager.registerModule('pokedex', POKEDEX_MODULE_CONFIG);
    console.log('✅ [PokedexIntegration] Module enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [PokedexIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

export async function initializePokedexModule(uiManager) {
  try {
    await registerPokedexModule(uiManager);
    
    let pokedexInstance = PokedexModule.getInstance('pokedex');
    
    if (!pokedexInstance || !pokedexInstance.uiManagerState.initialized) {
      pokedexInstance = await uiManager.initializeModule('pokedex');
    } else {
      pokedexInstance.connectUIManager(uiManager);
    }
    
    setupPokedexGlobalEvents(pokedexInstance);
    
    console.log('✅ [PokedexIntegration] Initialisation terminée');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX ===

function setupPokedexGlobalEvents(pokedexInstance) {
  if (window._pokedexEventsSetup) {
    return;
  }
  
  window.addEventListener('pokemonEncountered', (event) => {
    if (pokedexInstance.onPokemonEncounter) {
      pokedexInstance.onPokemonEncounter(event.detail);
    }
  });
  
  window.addEventListener('pokemonCaptured', (event) => {
    if (pokedxInstance.onPokemonCapture) {
      pokedexInstance.onPokemonCapture(event.detail);
    }
  });
  
  window.addEventListener('pokemonEvolved', (event) => {
    if (pokedexInstance.onPokemonEvolution) {
      pokedexInstance.onPokemonEvolution(event.detail);
    }
  });
  
  window.addEventListener('battleStarted', () => {
    if (pokedexInstance.ui && pokedexInstance.ui.isVisible) {
      pokedexInstance.ui.hide();
    }
  });
  
  window.addEventListener('shopOpened', () => {
    if (pokedexInstance.ui && pokedexInstance.ui.isVisible) {
      pokedexInstance.ui.hide();
    }
  });
  
  window._pokedexEventsSetup = true;
}

// === 💡 UTILISATION SIMPLE ===

export async function setupPokedexSystem(uiManager) {
  try {
    const pokedexInstance = await initializePokedexModule(uiManager);
    
    if (!window.pokedexSystem) {
      window.pokedexSystem = pokedexInstance.system;
      window.pokedexSystemGlobal = pokedexInstance;
      window.togglePokedex = () => pokedexInstance.toggleUI();
      window.openPokedex = () => pokedexInstance.open();
      window.closePokedex = () => pokedexInstance.close();
      window.isPokedexOpen = () => pokedexInstance.ui?.isVisible || false;
      
      // Fonctions spécifiques Pokédx
      window.markPokemonSeen = (pokemonId, level, location, options) => 
        pokedexInstance.markPokemonSeen(pokemonId, level, location, options);
      window.markPokemonCaught = (pokemonId, level, location, ownedPokemonId, options) => 
        pokedexInstance.markPokemonCaught(pokemonId, level, location, ownedPokemonId, options);
      window.isPokemonSeen = (pokemonId) => 
        pokedexInstance.isPokemonSeen(pokemonId);
      window.isPokemonCaught = (pokemonId) => 
        pokedexInstance.isPokemonCaught(pokemonId);
      window.getPokedexCompletionRate = () => 
        pokedexInstance.getCompletionRate();
    }
    
    console.log('✅ [PokedexSetup] Système configuré');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG ===

export function debugPokedexModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('pokedex', PokedexModule);
}

export function fixPokedexModule() {
  try {
    const instance = PokedexModule.getInstance('pokedex');
    
    if (instance) {
      instance.forceCloseUI();
      return true;
    } else {
      return false;
    }
    
  } catch (error) {
    console.error('❌ [PokedexFix] Erreur réparation:', error);
    return false;
  }
}

export default PokedexModule;
