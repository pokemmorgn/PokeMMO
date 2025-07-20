// Pokedx/index.js - PokedxModule CORRIGÉ avec BaseModule pur
// 🎯 UTILISE BaseModule.canOpenUI() sans surcharge problématique
// 📍 DÉLÉGATION PROPRE vers UIManager
// 📱 SYSTÈME POKÉDX SANS BLOCAGES

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { PokedxSystem } from './PokedexSystem.js';
import { PokedxIcon } from './PokedexIcon.js';
import { PokedxUI } from './PokedexUI.js';

/**
 * ✅ Module Pokédx avec BaseModule PUR - SANS surcharge canOpenUI()
 * Délégation complète vers UIManager pour les autorisations
 */
export class PokedxModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Pokédx
    const pokedxOptions = {
      singleton: true,           // Pokédx est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'p',     // Touche P pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 2,                // Troisième dans la liste (après inventory et quest)
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'pokedx', gameRoom, scene, pokedxOptions);
    
    // === RÉFÉRENCE AU SYSTÈME PRINCIPAL ===
    this.system = null;  // PokedxSystem (logique complète)
    
    // === DONNÉES POKÉDX ===
    this.pokedxData = {};
    this.playerStats = {};
    this.notifications = [];
    
    console.log('📱 [PokedxModule] Instance créée avec BaseModule pur');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Pokédx
   */
  async init() {
    console.log('🚀 [PokedxModule] Initialisation métier Pokédx...');
    
    // Créer le système principal (qui inclut la logique métier)
    this.system = new PokedxSystem(this.scene, this.gameRoom);
    
    console.log('✅ [PokedxModule] Système Pokédx initialisé');
  }
  
  /**
   * Création des composants Pokédx
   */
  createComponents() {
    console.log('🔧 [PokedxModule] Création composants Pokédx...');
    
    // Le système a déjà créé l'UI et l'icône, on les récupère
    if (this.system) {
      this.ui = this.system.pokedxUI;
      this.icon = this.system.pokedxIcon;
      
      // 🆕 ASSURER QUE L'ICÔNE EST INITIALISÉE
      if (this.icon && !this.icon.iconElement) {
        console.log('🔧 [PokedxModule] Initialisation icône manquante...');
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
        
        console.log('✅ [PokedxModule] Icône préparée pour UIManager');
      } else {
        console.warn('❌ [PokedxModule] Impossible de préparer l\'icône');
      }
    }
    
    console.log('✅ [PokedxModule] Composants Pokédx récupérés du système');
  }
  
  /**
   * Connexion des composants Pokédx
   */
  connectComponents() {
    console.log('🔗 [PokedxModule] Connexion composants Pokédx...');
    
    // Les composants sont déjà connectés par PokedxSystem
    // On ajoute juste la logique spécifique UIManager
    
    // ✅ DÉLÉGATION PROPRE: Icône → BaseModule → UIManager
    if (this.icon) {
      this.icon.onClick = () => {
        // 🎯 VÉRIFICATION VIA BASEMODULE (qui délègue vers UIManager)
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Assurer compatibilité UIManager
    this.ensureIconForUIManager();
    
    console.log('✅ [PokedxModule] Composants Pokédx connectés via BaseModule');
  }
  
  // === ❌ SUPPRESSION canOpenUI() PROBLÉMATIQUE ===
  
  /**
   * ❌ MÉTHODE SUPPRIMÉE: canOpenUI() avec vérifications DOM
   * 
   * Ancienne logique problématique:
   * ```javascript
   * canOpenUI() {
   *   // Vérifications spécifiques au Pokédx
   *   const blockers = [
   *     document.querySelector('.quest-dialog-overlay'),
   *     document.querySelector('#dialogue-box:not([style*="display: none"])'),
   *     // ... autres blockers DOM
   *   ];
   *   // ← Encore une autre logique redondante !
   * }
   * ```
   * 
   * ✅ REMPLACEMENT: BaseModule.canOpenUI() par défaut
   * - Délégation directe vers UIManager.canShowModule()
   * - Plus de vérifications DOM redondantes
   * - Architecture propre en couches
   * 
   * Le BaseModule se charge automatiquement de:
   * 1. this.canOpenUI() → BaseModule.canOpenUI()
   * 2. BaseModule.canOpenUI() → UIManager.canShowModule('pokedx')
   * 3. UIManager décide selon ses règles globales
   */
  
  // === 📊 MÉTHODES SPÉCIFIQUES POKÉDX ===
  
  /**
   * Demander les données Pokédx (override de la méthode générique)
   */
  show() {
    const result = super.show();
    
    // Demander données Pokédx spécifiquement
    if (this.system) {
      setTimeout(() => {
        this.system.requestPokedxData();
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
  syncPokedx() {
    if (this.system) {
      this.system.syncPokedx();
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
  togglePokedxUI() {
    this.toggleUI();
  }
  
  openPokedx() {
    this.open();
  }
  
  closePokedx() {
    this.close();
  }
  
  isPokedxOpen() {
    return this.ui ? this.ui.isVisible : false;
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS POKÉDX ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Pokédx
    return {
      ...baseState,
      hasData: this.ui ? Object.keys(this.ui.pokedxData || {}).length > 0 : false,
      completionRate: this.getCompletionRate(),
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      hasNotifications: this.notifications.length > 0,
      canOpen: this.canOpenUI(), // ← Utilise BaseModule.canOpenUI() automatiquement
      moduleType: 'pokedx',
      delegationMode: 'pure-basemodule'
    };
  }
  
  /**
   * ✅ MÉTHODE HÉRITÉE DE BASEMODULE - DÉLÉGATION AUTOMATIQUE
   * 
   * Plus besoin de surcharger canOpenUI() !
   * BaseModule.canOpenUI() se charge de:
   * 1. Déléguer vers UIManager.canShowModule('pokedx')
   * 2. Fallback sur vérifications de base si UIManager indisponible
   * 3. Architecture propre en couches
   */
  // canOpenUI() → Héritée de BaseModule, délégation automatique !
  
  /**
   * Exposer le système globalement pour compatibilité
   */
  exposeGlobally() {
    if (!window.pokedxSystem) {
      window.pokedxSystem = this.system;
      window.pokedxSystemGlobal = this;
      console.log('🌐 [PokedxModule] Système exposé globalement');
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
    console.log('🔧 [PokedxModule] Vérification icône pour UIManager...');
    
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
      
      console.log('✅ [PokedxModule] Icône prête pour UIManager');
      return true;
    }
    
    console.warn('❌ [PokedxModule] Icône non disponible');
    return false;
  }
  
  // === 🎮 MÉTHODES D'INTÉGRATION AVEC LE JEU ===
  
  /**
   * Gérer une rencontre Pokémon (appelé par le moteur de jeu)
   */
  onPokemonEncounter(pokemonData) {
    console.log('👁️ [PokedxModule] Rencontre Pokémon:', pokemonData);
    
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
    console.log('🎯 [PokedxModule] Capture Pokémon:', pokemonData);
    
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
    console.log('🔄 [PokedxModule] Évolution Pokémon:', evolutionData);
    
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
export async function createPokedxModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [PokedxFactory] Création module Pokédx avec BaseModule...');
    
    const pokedxOptions = {
      singleton: true,
      ...options
    };
    
    const pokedxInstance = await createModule(PokedxModule, 'pokedx', gameRoom, scene, pokedxOptions);
    
    console.log('✅ [PokedxFactory] Module Pokédx créé avec succès');
    return pokedxInstance;
    
  } catch (error) {
    console.error('❌ [PokedxFactory] Erreur création module Pokédx:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POKÉDX POUR UIMANAGER ===

export const POKEDX_MODULE_CONFIG = generateModuleConfig('pokedx', {
  moduleClass: PokedxModule,
  order: 2,  // Troisième = après inventory et quest
  
  options: {
    singleton: true,
    keyboardShortcut: 'p'
  },
  
  groups: ['ui-icons', 'data-management'],
  
  metadata: {
    name: 'Pokédx National',
    description: 'Complete Pokédx system with discovery tracking',
    version: '2.0.0',
    category: 'Data Management',
    architecture: 'Pure BaseModule with UIManager delegation'
  },
  
  factory: () => createPokedxModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER SIMPLIFIÉE ===

/**
 * Enregistrer le module Pokédx dans UIManager
 */
export async function registerPokedxModule(uiManager) {
  try {
    console.log('📝 [PokedxIntegration] Enregistrement Pokédx...');
    
    // Vérifier si déjà enregistré
    if (uiManager.modules && uiManager.modules.has('pokedx')) {
      console.log('ℹ️ [PokedxIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('pokedx', POKEDX_MODULE_CONFIG);
    console.log('✅ [PokedxIntegration] Module Pokédx enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [PokedxIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Pokédx
 */
export async function initializePokedxModule(uiManager) {
  try {
    console.log('🚀 [PokedxIntegration] Initialisation Pokédx...');
    
    // Enregistrer le module
    await registerPokedxModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let pokedxInstance = PokedxModule.getInstance('pokedx');
    
    if (!pokedxInstance || !pokedxInstance.uiManagerState.initialized) {
      // Initialiser le module
      pokedxInstance = await uiManager.initializeModule('pokedx');
    } else {
      console.log('ℹ️ [PokedxIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      pokedxInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Pokédx
    setupPokedxGlobalEvents(pokedxInstance);
    
    console.log('✅ [PokedxIntegration] Initialisation Pokédx terminée');
    return pokedxInstance;
    
  } catch (error) {
    console.error('❌ [PokedxIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX POKÉDX ===

function setupPokedxGlobalEvents(pokedxInstance) {
  // Éviter double setup
  if (window._pokedxEventsSetup) {
    console.log('ℹ️ [PokedxEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Pokémon rencontré
  window.addEventListener('pokemonEncountered', (event) => {
    if (pokedxInstance.onPokemonEncounter) {
      pokedxInstance.onPokemonEncounter(event.detail);
    }
  });
  
  // Événement: Pokémon capturé
  window.addEventListener('pokemonCaptured', (event) => {
    if (pokedxInstance.onPokemonCapture) {
      pokedxInstance.onPokemonCapture(event.detail);
    }
  });
  
  // Événement: Pokémon évolué
  window.addEventListener('pokemonEvolved', (event) => {
    if (pokedxInstance.onPokemonEvolution) {
      pokedxInstance.onPokemonEvolution(event.detail);
    }
  });
  
  // Événement: Combat commencé (fermer le Pokédx)
  window.addEventListener('battleStarted', () => {
    if (pokedxInstance.ui && pokedxInstance.ui.isVisible) {
      pokedxInstance.ui.hide();
    }
  });
  
  // Événement: Shop ouvert (fermer le Pokédx)
  window.addEventListener('shopOpened', () => {
    if (pokedxInstance.ui && pokedxInstance.ui.isVisible) {
      pokedxInstance.ui.hide();
    }
  });
  
  window._pokedxEventsSetup = true;
  console.log('🌐 [PokedxEvents] Événements Pokédx configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Pokédx dans un projet
 */
export async function setupPokedxSystem(uiManager) {
  try {
    console.log('🔧 [PokedxSetup] Configuration système Pokédx avec BaseModule pur...');
    
    // Initialiser le module
    const pokedxInstance = await initializePokedxModule(uiManager);
    
    // Exposer globalement pour compatibilité
    if (!window.pokedxSystem) {
      window.pokedxSystem = pokedxInstance.system;
      window.pokedxSystemGlobal = pokedxInstance;
      window.togglePokedx = () => pokedxInstance.toggleUI();
      window.openPokedx = () => pokedxInstance.open();
      window.closePokedx = () => pokedxInstance.close();
      window.isPokedxOpen = () => pokedxInstance.ui?.isVisible || false;
      
      // Fonctions spécifiques Pokédx
      window.markPokemonSeen = (pokemonId, level, location, options) => 
        pokedxInstance.markPokemonSeen(pokemonId, level, location, options);
      window.markPokemonCaught = (pokemonId, level, location, ownedPokemonId, options) => 
        pokedxInstance.markPokemonCaught(pokemonId, level, location, ownedPokemonId, options);
      window.isPokemonSeen = (pokemonId) => 
        pokedxInstance.isPokemonSeen(pokemonId);
      window.isPokemonCaught = (pokemonId) => 
        pokedxInstance.isPokemonCaught(pokemonId);
      window.getPokedxCompletionRate = () => 
        pokedxInstance.getCompletionRate();
      
      console.log('🌐 [PokedxSetup] Fonctions globales Pokédx exposées');
    }
    
    console.log('✅ [PokedxSetup] Système Pokédx configuré avec BaseModule pur');
    return pokedxInstance;
    
  } catch (error) {
    console.error('❌ [PokedxSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG POKÉDX ===

export function debugPokedxModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('pokedx', PokedxModule);
}

export function fixPokedxModule() {
  console.log('🔧 [PokedxFix] Réparation module Pokédx...');
  
  try {
    const instance = PokedxModule.getInstance('pokedx');
    
    if (instance) {
      // Force fermeture UI via BaseModule
      instance.forceCloseUI();
      
      console.log('✅ [PokedxFix] Module Pokédx réparé');
      return true;
    } else {
      console.log('ℹ️ [PokedxFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [PokedxFix] Erreur réparation:', error);
    return false;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default PokedxModule;

console.log(`
📱 === POKÉDX MODULE AVEC BASEMODULE PUR ===

❌ SUPPRESSION CANOPEN() PROBLÉMATIQUE:
• Plus de vérifications DOM redondantes
• Plus de blockers spécifiques au module
• Plus de logique dupliquée avec UIManager

✅ DÉLÉGATION PURE VERS UIMANAGER:
• BaseModule.canOpenUI() utilisé tel quel
• Délégation automatique vers UIManager.canShowModule()
• Architecture propre en couches respectée

🎯 FLUX SIMPLIFIÉ:
1. Icon.onClick() → Module.canOpenUI()
2. Module.canOpenUI() → BaseModule.canOpenUI() (hérité)
3. BaseModule.canOpenUI() → UIManager.canShowModule('pokedx')
4. UIManager décide selon ses règles globales

🛡️ PLUS DE CONFLITS:
• Fini les 4 couches de vérifications
• Fini les conditions contradictoires
• UIManager seule source de vérité
• canOpenUI() héritée = délégation automatique

✅ POKÉDX MODULE REFACTORISÉ AVEC BASEMODULE PUR !
`);
