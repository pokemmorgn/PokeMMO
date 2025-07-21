// Pokedex/index.js - PokedexModule avec BaseModule et UIManager
// 🎯 UTILISE BaseModule pour éviter duplication de code
// 📍 INTÉGRÉ avec UIManager via BaseModule
// 📱 SYSTÈME POKÉDX COMPLET

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { PokedexSystem } from './PokedexSystem.js';
import { PokedexIcon } from './PokedexIcon.js';
import { PokedexUI } from './PokedexUI.js';

/**
 * Module Pokédx utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 */
export class PokedexModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Pokédx
    const pokedexOptions = {
      singleton: true,           // Pokédx est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'p',     // Touche P pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 1,                // Deuxième dans la liste (entre inventory et team)
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
    
    console.log('📱 [PokedexModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Pokédx
   */
  async init() {
    console.log('🚀 [PokedexModule] Initialisation métier Pokédx...');
    
    // Créer le système principal (qui inclut la logique métier)
    this.system = new PokedexSystem(this.scene, this.gameRoom);
    
    console.log('✅ [PokedexModule] Système Pokédx initialisé');
  }
  
  /**
   * Création des composants Pokédx
   */
  createComponents() {
    console.log('🔧 [PokedexModule] Création composants Pokédx...');
    
    // Le système a déjà créé l'UI et l'icône, on les récupère
    if (this.system) {
      this.ui = this.system.pokedexUI;
      this.icon = this.system.pokedexIcon;
      
      // 🆕 ASSURER QUE L'ICÔNE EST INITIALISÉE
      if (this.icon && !this.icon.iconElement) {
        console.log('🔧 [PokedexModule] Initialisation icône manquante...');
        this.icon.init();
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
    
    console.log('✅ [PokedexModule] Composants Pokédx récupérés du système');
  }
  
  /**
   * Connexion des composants Pokédx
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
      moduleType: 'pokedex'
    };
  }
  
  /**
   * Méthode pour vérifier si on peut ouvrir l'interface (override BaseModule)
   */
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

// === 🏭 FACTORY POKÉDX SIMPLIFIÉE ===

/**
 * Factory function pour créer le module Pokédx
 * Utilise la factory générique de BaseModule
 */
export async function createPokedexModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [PokedexFactory] Création module Pokédx avec BaseModule...');
    
    const pokedexOptions = {
      singleton: true,
      ...options
    };
    
    const pokedexInstance = await createModule(PokedexModule, 'pokedex', gameRoom, scene, pokedexOptions);
    
    console.log('✅ [PokedexFactory] Module Pokédx créé avec succès');
    return pokedexInstance;
    
  } catch (error) {
    console.error('❌ [PokedexFactory] Erreur création module Pokédx:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POKÉDX POUR UIMANAGER ===

export const POKEDEX_MODULE_CONFIG = generateModuleConfig('pokedex', {
  moduleClass: PokedexModule,
  order: 1,  // Deuxième = entre inventory et team
  
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

// === 🔗 INTÉGRATION AVEC UIMANAGER SIMPLIFIÉE ===

/**
 * Enregistrer le module Pokédx dans UIManager
 */
export async function registerPokedexModule(uiManager) {
  try {
    console.log('📝 [PokedexIntegration] Enregistrement Pokédx...');
    
    // Vérifier si déjà enregistré
    if (uiManager.modules && uiManager.modules.has('pokedex')) {
      console.log('ℹ️ [PokedexIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('pokedex', POKEDX_MODULE_CONFIG);
    console.log('✅ [PokedexIntegration] Module Pokédx enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [PokedexIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Pokédx
 */
export async function initializePokedexModule(uiManager) {
  try {
    console.log('🚀 [PokedexIntegration] Initialisation Pokédx...');
    
    // Enregistrer le module
    await registerPokedexModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let pokedexInstance = PokedexModule.getInstance('pokedex');
    
    if (!pokedexInstance || !pokedexInstance.uiManagerState.initialized) {
      // Initialiser le module
      pokedexInstance = await uiManager.initializeModule('pokedex');
    } else {
      console.log('ℹ️ [PokedexIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      pokedexInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Pokédx
    setupPokedexGlobalEvents(pokedexInstance);
    
    console.log('✅ [PokedexIntegration] Initialisation Pokédx terminée');
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
  
  window._pokedexEventsSetup = true;
  console.log('🌐 [PokedexEvents] Événements Pokédx configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Pokédx dans un projet
 */
export async function setupPokedexSystem(uiManager) {
  try {
    console.log('🔧 [PokedexSetup] Configuration système Pokédx avec BaseModule...');
    
    // Initialiser le module
    const pokedexInstance = await initializePokedexModule(uiManager);
    
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
      
      console.log('🌐 [PokedexSetup] Fonctions globales Pokédx exposées');
    }
    
    console.log('✅ [PokedexSetup] Système Pokédx configuré avec BaseModule');
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
📱 === POKÉDX MODULE AVEC BASEMODULE ===

🎯 NOUVELLES FONCTIONNALITÉS:
• BaseModule - logique UIManager mutualisée
• Code simplifié - moins de duplication
• Patterns standards - consistent avec Team/Inventory
• Singleton intégré - via BaseModule

📍 AVANTAGES BASEMODULE:
• connectUIManager() générique
• forceCloseUI() standardisé
• Gestion état UIManager uniforme
• Raccourcis clavier automatiques

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), setEnabled() - standards
• connectUIManager() - connexion sécurisée
• getUIManagerState() - état complet
• forceCloseUI() - fermeture forcée

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

🎮 ÉVÉNEMENTS AUTOMATIQUES:
• pokemonEncountered - auto-marquer vu
• pokemonCaptured - auto-marquer capturé  
• pokemonEvolved - gérer évolutions
• battleStarted - fermer auto

✅ POKÉDX REFACTORISÉ AVEC BASEMODULE !
`);
