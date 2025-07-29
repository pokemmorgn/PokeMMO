// Pokedex/index.js - PokedexModule avec BaseModule et traductions temps réel
// 🌐 SUPPORT COMPLET DES TRADUCTIONS + BaseModule + UIManager
// 📱 SYSTÈME POKÉDX MULTILINGUE

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { PokedexSystem } from './PokedexSystem.js';
import { PokedexIcon } from './PokedexIcon.js';
import { PokedexUI } from './PokedexUI.js';

/**
 * Module Pokédx utilisant BaseModule avec traductions temps réel
 * Hérite de toute la logique UIManager générique + support i18n
 */
export class PokedexModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Pokédx avec traductions
    const pokedexOptions = {
      singleton: true,           // Pokédx est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'p',     // Touche P pour ouvrir/fermer
      optionsManager: options.optionsManager || null,  // ← NOUVEAU
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 2,                // Troisième dans la liste (après inventory et quest)
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'pokedex', gameRoom, scene, pokedexOptions);
    
    // === RÉFÉRENCE AU SYSTÈME PRINCIPAL ===
    this.system = null;  // PokedexSystem (logique complète)
    
    // === DONNÉES POKÉDX ===
    this.pokedexData = {};
    this.playerStats = {};
    this.notifications = [];
    
    console.log('📱 [PokedexModule] Instance créée avec BaseModule et traductions');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Pokédx avec optionsManager
   */
  async init() {
    console.log('🚀 [PokedexModule] Initialisation métier Pokédx avec traductions...');
    
    // ✅ RÉCUPÉRER OPTIONSMANAGER DEPUIS LES OPTIONS
    const optionsManager = this.options.optionsManager || 
                          window.optionsSystem?.manager || 
                          window.optionsSystemGlobal?.manager ||
                          null;
    
    if (optionsManager) {
      console.log('🌐 [PokedexModule] OptionsManager trouvé pour traductions');
    } else {
      console.warn('⚠️ [PokedexModule] OptionsManager non disponible - traductions limitées');
    }
    
    // Créer le système principal avec optionsManager
    this.system = new PokedexSystem(this.scene, this.gameRoom, optionsManager);
    
    console.log('✅ [PokedexModule] Système Pokédx initialisé avec traductions');
  }
  
  /**
   * Création des composants Pokédx avec traductions
   */
  createComponents() {
    console.log('🔧 [PokedexModule] Création composants Pokédx avec traductions...');
    
    // Le système a déjà créé l'UI et l'icône avec optionsManager, on les récupère
    if (this.system) {
      this.ui = this.system.pokedexUI;
      this.icon = this.system.pokedexIcon;
      
      // 🆕 ASSURER QUE L'ICÔNE EST INITIALISÉE
      if (this.icon && !this.icon.iconElement) {
        console.log('🔧 [PokedexModule] Initialisation icône manquante...');
        this.icon.init();
      }
      
      // ✅ VÉRIFIER QUE LES TRADUCTIONS SONT CONFIGURÉES
      if (this.icon && this.icon.optionsManager) {
        console.log('🌐 [PokedexModule] Icône configurée avec traductions');
      } else {
        console.warn('⚠️ [PokedexModule] Icône sans traductions');
      }
      
      if (this.ui && this.ui.optionsManager) {
        console.log('🌐 [PokedexModule] UI configurée avec traductions');
      } else {
        console.warn('⚠️ [PokedexModule] UI sans traductions');
      }
      
      // Assurer que l'icône est dans le bon mode UIManager
      if (this.icon && this.icon.iconElement) {
        this.icon.positioningMode = 'uimanager';
        
        // Supprimer tout positionnement automatique de l'icône
        this.icon.iconElement.style.position = '';
        this.icon.iconElement.style.right = '';
        this.icon.iconElement.style.bottom = '';
        this.icon.iconElement.style.left = '';
        this.icon.iconElement.style.top = '';
        this.icon.iconElement.style.zIndex = '';
        
        console.log('✅ [PokedexModule] Icône préparée pour UIManager');
      } else {
        console.warn('❌ [PokedexModule] Impossible de préparer l\'icône');
      }
    }
    
    console.log('✅ [PokedexModule] Composants Pokédx récupérés du système avec traductions');
  }
  
  /**
   * Connexion des composants Pokédx avec support traductions
   */
  connectComponents() {
    console.log('🔗 [PokedexModule] Connexion composants Pokédx...');
    
    // Les composants sont déjà connectés par PokedexSystem
    // On ajoute juste la logique spécifique UIManager
    
    // Icône → Interface (via BaseModule)
    if (this.icon) {
      this.icon.onClick = () => {
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Assurer compatibilité UIManager
    this.ensureIconForUIManager();
    
    console.log('✅ [PokedexModule] Composants Pokédx connectés via BaseModule');
  }
  
  // === 🌐 MÉTHODES SPÉCIFIQUES TRADUCTIONS ===
  
  /**
   * Injection tardive d'optionsManager pour les traductions
   */
  setOptionsManager(optionsManager) {
    console.log('🌐 [PokedexModule] Injection tardive optionsManager...');
    
    // Mettre à jour les options du module
    this.options.optionsManager = optionsManager;
    
    // Passer au système si disponible
    if (this.system && this.system.setOptionsManager) {
      this.system.setOptionsManager(optionsManager);
    }
    
    // Passer directement aux composants si le système n'est pas encore prêt
    if (this.ui && this.ui.optionsManager !== optionsManager) {
      this.ui.optionsManager = optionsManager;
      if (this.ui.setupLanguageSupport) {
        this.ui.setupLanguageSupport();
      }
    }
    
    if (this.icon && this.icon.optionsManager !== optionsManager) {
      this.icon.optionsManager = optionsManager;
      if (this.icon.setupLanguageSupport) {
        this.icon.setupLanguageSupport();
      }
    }
    
    console.log('✅ [PokedexModule] OptionsManager injecté pour traductions');
  }
  
  /**
   * Forcer mise à jour des traductions
   */
  updateLanguage() {
    console.log('🌐 [PokedexModule] Force mise à jour langue...');
    
    if (this.ui && this.ui.updateLanguage) {
      this.ui.updateLanguage();
    }
    
    if (this.icon && this.icon.updateLanguage) {
      this.icon.updateLanguage();
    }
    
    console.log('✅ [PokedexModule] Langue mise à jour');
  }
  
  // === 📊 MÉTHODES SPÉCIFIQUES POKÉDX ===
  
  /**
   * Demander les données Pokédx (override de la méthode générique)
   */
  show() {
    const result = super.show();
    
    // Demander données Pokédx spécifiquement
    if (this.system) {
      setTimeout(() => {
        this.system.requestPokedexData();
      }, 200);
    }
    
    return result;
  }
  
  /**
   * Marquer un Pokémon comme vu
   */
  markPokemonSeen(pokemonId, level, location, options = {}) {
    if (this.system) {
      this.system.markPokemonSeen(pokemonId, level, location, options);
    }
  }
  
  /**
   * Marquer un Pokémon comme capturé
   */
  markPokemonCaught(pokemonId, level, location, ownedPokemonId, options = {}) {
    if (this.system) {
      this.system.markPokemonCaught(pokemonId, level, location, ownedPokemonId, options);
    }
  }
  
  /**
   * Vérifier si un Pokémon a été vu
   */
  isPokemonSeen(pokemonId) {
    return this.system ? this.system.isPokemonSeen(pokemonId) : false;
  }
  
  /**
   * Vérifier si un Pokémon a été capturé
   */
  isPokemonCaught(pokemonId) {
    return this.system ? this.system.isPokemonCaught(pokemonId) : false;
  }
  
  /**
   * Obtenir les statistiques du joueur
   */
  getPlayerStats() {
    return this.system ? this.system.getPlayerStats() : {};
  }
  
  /**
   * Rechercher des Pokémon
   */
  searchPokemon(filters = {}) {
    if (this.system) {
      return this.system.searchPokemon(filters);
    }
    return [];
  }
  
  /**
   * Toggle favori d'un Pokémon
   */
  togglePokemonFavorite(pokemonId) {
    if (this.system) {
      this.system.togglePokemonFavorite(pokemonId);
    }
  }
  
  /**
   * Obtenir les Pokémon favoris
   */
  getFavoritesPokemon() {
    return this.system ? this.system.getFavoritesPokemon() : [];
  }
  
  /**
   * Obtenir les notifications Pokédx
   */
  getNotifications() {
    return this.system ? this.system.getNotifications() : [];
  }
  
  /**
   * Marquer une notification comme lue
   */
  markNotificationRead(notificationId) {
    if (this.system) {
      this.system.markNotificationRead(notificationId);
    }
  }
  
  /**
   * Synchroniser le Pokédx
   */
  syncPokedex() {
    if (this.system) {
      this.system.syncPokedex();
    }
  }
  
  /**
   * Obtenir une entrée Pokédx spécifique
   */
  getPokemonEntry(pokemonId) {
    return this.system ? this.system.getPokemonEntry(pokemonId) : null;
  }
  
  /**
   * Obtenir le taux de complétion
   */
  getCompletionRate() {
    const stats = this.getPlayerStats();
    return stats.caughtPercentage || 0;
  }
  
  /**
   * Ouvrir le Pokédx à une vue spécifique
   */
  openToView(viewName) {
    if (this.ui) {
      this.ui.openToView(viewName);
    }
  }
  
  /**
   * API legacy pour compatibilité
   */
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
    
    // Ajouter infos spécifiques Pokédx
    return {
      ...baseState,
      hasData: this.ui ? Object.keys(this.ui.pokedexData || {}).length > 0 : false,
      completionRate: this.getCompletionRate(),
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      hasNotifications: this.notifications.length > 0,
      canOpen: this.canOpenUI(),
      moduleType: 'pokedex',
      hasOptionsManager: !!(this.options.optionsManager || this.system?.optionsManager),  // ← NOUVEAU
      i18nSupported: true                                                                  // ← NOUVEAU
    };
  }
  
  /**
   * Méthode pour vérifier si on peut ouvrir l'interface (override BaseModule)
   */
  canOpenUI() {
    console.log('🔍 [PokedexModule] Vérification canOpenUI...');
    
    // ✅ CORRECTION: Vérification dialogue-box plus robuste
    const dialogueBox = document.querySelector('#dialogue-box');
    const dialogueVisible = dialogueBox && 
      window.getComputedStyle(dialogueBox).display !== 'none' &&
      window.getComputedStyle(dialogueBox).visibility !== 'hidden' &&
      !dialogueBox.hidden;
    
    console.log('  💬 Dialogue visible (corrigé):', dialogueVisible);
    
    // ✅ Vérifications autres overlays (gardées identiques)
    const otherBlockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#team-overlay:not(.hidden)'),
      document.querySelector('#shop-overlay:not(.hidden)'),
      document.querySelector('#inventory-overlay:not(.hidden)')
    ].filter(el => el !== null);
    
    console.log('  🚫 Autres bloqueurs:', otherBlockers.length);
    
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    console.log('  💭 Chat focusé:', chatFocused);
    console.log('  🎮 Starter HUD:', starterHudOpen);
    
    // ✅ CORRECTION: Vérifier enabled de façon sécurisée
    let isEnabled = true; // Par défaut
    
    if (this.uiManagerState && typeof this.uiManagerState.enabled !== 'undefined') {
      isEnabled = this.uiManagerState.enabled;
      console.log('  🔧 Enabled (uiManagerState):', isEnabled);
    } else if (typeof this.isEnabled !== 'undefined') {
      isEnabled = this.isEnabled;
      console.log('  🔧 Enabled (isEnabled):', isEnabled);
    } else {
      console.log('  🔧 Enabled (défaut):', isEnabled);
    }
    
    const result = !dialogueVisible && 
                   otherBlockers.length === 0 && 
                   !chatFocused && 
                   !starterHudOpen && 
                   isEnabled;
    
    console.log('  📊 Résultat final:', result);
    return result;
  }
  
  /**
   * Exposer le système globalement pour compatibilité
   */
  exposeGlobally() {
    if (!window.pokedexSystem) {
      window.pokedexSystem = this.system;
      window.pokedexSystemGlobal = this;
      console.log('🌐 [PokedexModule] Système exposé globalement');
    }
  }
  
  /**
   * Override de la méthode initializeModule pour exposer globalement
   */
  async initializeModule() {
    const result = await super.initializeModule();
    
    // Exposer globalement après initialisation
    this.exposeGlobally();
    
    return result;
  }
  
  /**
   * Méthode pour assurer la compatibilité avec UIManager
   */
  ensureIconForUIManager() {
    console.log('🔧 [PokedexModule] Vérification icône pour UIManager...');
    
    if (this.icon && this.icon.iconElement) {
      // Reset du positionnement pour UIManager
      this.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
      
      // Supprimer tout positionnement automatique
      this.icon.iconElement.style.position = '';
      this.icon.iconElement.style.right = '';
      this.icon.iconElement.style.bottom = '';
      this.icon.iconElement.style.left = '';
      this.icon.iconElement.style.top = '';
      this.icon.iconElement.style.zIndex = '';
      
      console.log('✅ [PokedexModule] Icône prête pour UIManager');
      return true;
    }
    
    console.warn('❌ [PokedexModule] Icône non disponible');
    return false;
  }
  
  // === 🎮 MÉTHODES D'INTÉGRATION AVEC LE JEU ===
  
  /**
   * Gérer une rencontre Pokémon (appelé par le moteur de jeu)
   */
  onPokemonEncounter(pokemonData) {
    console.log('👁️ [PokedexModule] Rencontre Pokémon:', pokemonData);
    
    if (!pokemonData || !pokemonData.pokemonId) return;
    
    // Marquer comme vu automatiquement
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
    
    // Mettre à jour l'icône si pas encore vu
    if (!this.isPokemonSeen(pokemonData.pokemonId)) {
      this.icon?.animateNewDiscovery();
    }
  }
  
  /**
   * Gérer une capture Pokémon (appelé par le moteur de jeu)
   */
  onPokemonCapture(pokemonData) {
    console.log('🎯 [PokedexModule] Capture Pokémon:', pokemonData);
    
    if (!pokemonData || !pokemonData.pokemonId || !pokemonData.ownedPokemonId) return;
    
    // Marquer comme capturé
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
    
    // Animations et notifications
    this.icon?.animateCapture();
    
    if (pokemonData.isShiny) {
      this.icon?.showCaptureNotification(pokemonData);
    }
    
    // Vérifier les jalons
    const newCompletionRate = this.getCompletionRate();
    const milestones = [25, 50, 75, 100];
    
    for (const milestone of milestones) {
      if (newCompletionRate >= milestone && this.playerStats.caughtPercentage < milestone) {
        this.icon?.animateMilestone(milestone);
        break;
      }
    }
  }
  
  /**
   * Gérer une évolution Pokémon (appelé par le moteur de jeu)
   */
  onPokemonEvolution(evolutionData) {
    console.log('🔄 [PokedexModule] Évolution Pokémon:', evolutionData);
    
    if (!evolutionData || !evolutionData.newPokemonId) return;
    
    // Si le nouveau Pokémon n'était pas encore vu, le marquer comme vu
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
    
    // Si on possède le Pokémon évolué, le marquer comme capturé
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
    
    // Animation spéciale évolution
    this.icon?.animateNewDiscovery();
  }
  
  /**
   * Obtenir des recommandations pour le joueur
   */
  getRecommendations() {
    if (!this.system) return [];
    
    // TODO: Implémenter logique de recommandations
    // - Pokémon proches de l'évolution
    // - Pokémon jamais vus dans la zone actuelle
    // - Objectifs de complétion
    
    return [];
  }
}

// === 🏭 FACTORY POKÉDX AVEC TRADUCTIONS ===

/**
 * Factory function pour créer le module Pokédx avec traductions
 * Utilise la factory générique de BaseModule
 */
export async function createPokedexModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [PokedexFactory] Création module Pokédx avec BaseModule et traductions...');
    
    const pokedexOptions = {
      singleton: true,
      optionsManager: options.optionsManager || null,  // ← NOUVEAU
      ...options
    };
    
    const pokedexInstance = await createModule(PokedexModule, 'pokedex', gameRoom, scene, pokedexOptions);
    
    console.log('✅ [PokedexFactory] Module Pokédx créé avec traductions');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexFactory] Erreur création module Pokédx:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POKÉDX POUR UIMANAGER AVEC TRADUCTIONS ===

export const POKEDEX_MODULE_CONFIG = generateModuleConfig('pokedex', {
  moduleClass: PokedexModule,
  order: 2,  // Troisième = après inventory et quest
  
  options: {
    singleton: true,
    keyboardShortcut: 'p',
    optionsManager: null  // Sera injecté dynamiquement
  },
  
  groups: ['ui-icons', 'data-management'],
  
  metadata: {
    name: 'Pokédx National',
    description: 'Complete Pokédx system with discovery tracking and real-time translations',
    version: '1.1.0',
    category: 'Data Management',
    i18nSupported: true,  // ← NOUVEAU
    supportedLanguages: ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko']  // ← NOUVEAU
  },
  
  factory: (gameRoom, scene, options = {}) => createPokedexModule(gameRoom, scene, options)
});

// === 🔗 INTÉGRATION AVEC UIMANAGER AVEC TRADUCTIONS ===

/**
 * Enregistrer le module Pokédx dans UIManager avec support traductions
 */
export async function registerPokedexModule(uiManager) {
  try {
    console.log('📝 [PokedexIntegration] Enregistrement Pokédx avec traductions...');
    
    // Vérifier si déjà enregistré
    if (uiManager.modules && uiManager.modules.has('pokedex')) {
      console.log('ℹ️ [PokedexIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('pokedex', POKEDEX_MODULE_CONFIG);
    console.log('✅ [PokedexIntegration] Module Pokédx enregistré avec traductions');
    
    return true;
  } catch (error) {
    console.error('❌ [PokedexIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Pokédx avec traductions
 */
export async function initializePokedexModule(uiManager, optionsManager = null) {
  try {
    console.log('🚀 [PokedexIntegration] Initialisation Pokédx avec traductions...');
    
    // Enregistrer le module
    await registerPokedexModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let pokedexInstance = PokedexModule.getInstance('pokedex');
    
    if (!pokedexInstance || !pokedexInstance.uiManagerState.initialized) {
      // ✅ PASSER OPTIONSMANAGER À L'INITIALISATION
      const initOptions = optionsManager ? { optionsManager } : {};
      
      // Initialiser le module avec optionsManager
      pokedexInstance = await uiManager.initializeModule('pokedex', initOptions);
    } else {
      console.log('ℹ️ [PokedexIntegration] Instance déjà initialisée');
      
      // ✅ INJECTION TARDIVE D'OPTIONSMANAGER SI NÉCESSAIRE
      if (optionsManager && pokedexInstance.setOptionsManager) {
        pokedexInstance.setOptionsManager(optionsManager);
      }
      
      // Connecter à UIManager si pas encore fait
      pokedexInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Pokédx
    setupPokedexGlobalEvents(pokedexInstance);
    
    console.log('✅ [PokedexIntegration] Initialisation Pokédx avec traductions terminée');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX POKÉDX ===

function setupPokedexGlobalEvents(pokedexInstance) {
  // Éviter double setup
  if (window._pokedexEventsSetup) {
    console.log('ℹ️ [PokedexEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Pokémon rencontré
  window.addEventListener('pokemonEncountered', (event) => {
    if (pokedexInstance.onPokemonEncounter) {
      pokedexInstance.onPokemonEncounter(event.detail);
    }
  });
  
  // Événement: Pokémon capturé
  window.addEventListener('pokemonCaptured', (event) => {
    if (pokedexInstance.onPokemonCapture) {
      pokedexInstance.onPokemonCapture(event.detail);
    }
  });
  
  // Événement: Pokémon évolué
  window.addEventListener('pokemonEvolved', (event) => {
    if (pokedexInstance.onPokemonEvolution) {
      pokedexInstance.onPokemonEvolution(event.detail);
    }
  });
  
  // Événement: Combat commencé (fermer le Pokédx)
  window.addEventListener('battleStarted', () => {
    if (pokedexInstance.ui && pokedexInstance.ui.isVisible) {
      pokedexInstance.ui.hide();
    }
  });
  
  // Événement: Shop ouvert (fermer le Pokédx)
  window.addEventListener('shopOpened', () => {
    if (pokedexInstance.ui && pokedexInstance.ui.isVisible) {
      pokedexInstance.ui.hide();
    }
  });
  
  // ✅ NOUVEAU: Événements traductions
  window.addEventListener('languageChanged', (event) => {
    console.log('🌐 [PokedexEvents] Langue changée pour Pokédx:', event.detail);
    if (pokedexInstance.updateLanguage) {
      pokedexInstance.updateLanguage();
    }
  });
  
  window._pokedexEventsSetup = true;
  console.log('🌐 [PokedexEvents] Événements Pokédx configurés avec traductions');
}

// === 💡 UTILISATION SIMPLE AVEC TRADUCTIONS ===

/**
 * Fonction d'utilisation simple pour intégrer Pokédx dans un projet avec traductions
 */
export async function setupPokedexSystem(uiManager, optionsManager = null) {
  try {
    console.log('🔧 [PokedexSetup] Configuration système Pokédx avec BaseModule et traductions...');
    
    // Initialiser le module avec optionsManager
    const pokedexInstance = await initializePokedexModule(uiManager, optionsManager);
    
    // Exposer globalement pour compatibilité
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
      
      // ✅ NOUVELLES FONCTIONS TRADUCTIONS
      window.updatePokedexLanguage = () => {
        if (pokedexInstance.updateLanguage) {
          pokedexInstance.updateLanguage();
        }
      };
      
      window.setPokedexOptionsManager = (optionsManager) => {
        if (pokedexInstance.setOptionsManager) {
          pokedexInstance.setOptionsManager(optionsManager);
        }
      };
      
      console.log('🌐 [PokedexSetup] Fonctions globales Pokédx exposées avec traductions');
    }
    
    console.log('✅ [PokedexSetup] Système Pokédx configuré avec BaseModule et traductions');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG POKÉDX ===

export function debugPokedexModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('pokedex', PokedexModule);
}

export function fixPokedexModule() {
  console.log('🔧 [PokedexFix] Réparation module Pokédx...');
  
  try {
    const instance = PokedexModule.getInstance('pokedex');
    
    if (instance) {
      // Force fermeture UI via BaseModule
      instance.forceCloseUI();
      
      console.log('✅ [PokedexFix] Module Pokédx réparé');
      return true;
    } else {
      console.log('ℹ️ [PokedexFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [PokedexFix] Erreur réparation:', error);
    return false;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default PokedexModule;

console.log(`
📱 === POKÉDX MODULE AVEC TRADUCTIONS TEMPS RÉEL ===

🌐 NOUVELLES FONCTIONNALITÉS TRADUCTIONS:
• optionsManager en paramètre constructeur
• Passage automatique aux composants UI/Icon
• setOptionsManager() pour injection tardive
• updateLanguage() pour forcer mise à jour
• Support complet traductions temps réel

🎯 PATTERN RESPECTÉ:
• BaseModule - logique UIManager mutualisée
• Code simplifié - moins de duplication
• Patterns standards - consistent avec Team/Inventory
• Singleton intégré - via BaseModule
• Traductions intégrées - même pattern

📍 AVANTAGES BASEMODULE + I18N:
• connectUIManager() générique
• forceCloseUI() standardisé
• Gestion état UIManager uniforme
• Raccourcis clavier automatiques
• Traductions temps réel automatiques

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), setEnabled() - standards
• connectUIManager() - connexion sécurisée
• getUIManagerState() - état complet
• forceCloseUI() - fermeture forcée
• updateLanguage() - mise à jour i18n

🎯 SPÉCIFICITÉS POKÉDX:
• markPokemonSeen() - marquer comme vu
• markPokemonCaught() - marquer comme capturé
• isPokemonSeen() - vérifier statut
• getCompletionRate() - taux de complétion
• openToView() - ouvrir vue spécifique
• API legacy maintenue

🔗 INTÉGRATION SYSTÈME:
• PokedexSystem conservé intact
• PokedexUI et PokedexIcon réutilisés
• Compatibilité totale avec existant
• Fonctions globales exposées
• Support optionsManager complet

🎮 ÉVÉNEMENTS AUTOMATIQUES:
• pokemonEncountered - auto-marquer vu
• pokemonCaptured - auto-marquer capturé  
• pokemonEvolved - gérer évolutions
• battleStarted - fermer auto
• languageChanged - mise à jour i18n

🌐 TRADUCTIONS SUPPORTÉES:
• Interface traduite automatiquement
• Icône avec label multilingue
• Tooltip dans la bonne langue
• Messages d'erreur localisés
• Switching langue sans redémarrage

✅ POKÉDX REFACTORISÉ AVEC BASEMODULE + TRADUCTIONS !
`);
