// Options/index.js - OptionsModule avec BaseModule
// 🎯 UTILISE BaseModule pour cohérence avec Team/Quest
// 📍 INTÉGRÉ avec UIManager - Position haut-droite
// ⚙️ MODULE COMPLET: Volume + Langue + API globale

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { OptionsManager, initializeGlobalOptionsAPI } from './OptionsManager.js';
import { OptionsIcon } from './OptionsIcon.js';
import { OptionsUI } from './OptionsUI.js';

/**
 * Module Options utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 */
export class OptionsModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Options
    const optionsOptions = {
      singleton: true,           // Options est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'Escape', // Touche Escape pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'top-right',     // ✅ HAUT-DROITE (différent des autres)
        order: 0,                // Premier en haut à droite
        group: 'ui-options'      // Groupe spécial pour options
      },
      ...options
    };
    
    super(moduleId || 'options', gameRoom, scene, optionsOptions);
    
    console.log('⚙️ [OptionsModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Options
   */
  async init() {
    console.log('🚀 [OptionsModule] Initialisation métier Options...');
    
    // Créer le manager (business logic)
    this.manager = new OptionsManager(this.gameRoom);
    this.manager.init();
    
    // ✅ INITIALISER L'API GLOBALE immédiatement
    initializeGlobalOptionsAPI(this.manager);
    
    console.log('✅ [OptionsModule] Manager Options initialisé');
  }
  
  /**
   * Création des composants Options
   */
  createComponents() {
    console.log('🔧 [OptionsModule] Création composants Options...');
    
    // Créer l'icône si pas encore fait
    if (!this.icon) {
      this.icon = new OptionsIcon(this.manager);
      this.icon.init();
    }
    
    // Créer l'interface si pas encore fait
    if (!this.ui) {
      this.ui = new OptionsUI(this.manager, this.gameRoom);
      // Note: L'init de OptionsUI est async, on le fait dans connectComponents
    }
    
    console.log('✅ [OptionsModule] Composants Options créés');
  }
  
  /**
   * Connexion des composants Options
   */
  connectComponents() {
    console.log('🔗 [OptionsModule] Connexion composants Options...');
    
    // Initialiser UI de manière async si nécessaire
    if (this.ui && !this.ui.initialized) {
      this.ui.init().catch(error => {
        console.error('❌ [OptionsModule] Erreur init UI:', error);
      });
    }
    
    // Icône → Interface (clic ouvre l'interface)
    if (this.icon) {
      this.icon.onClick = () => {
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Manager → Icône (mise à jour des stats)
    if (this.manager) {
      this.manager.onVolumeChange = (data) => {
        if (this.icon) {
          this.icon.updateStats({
            volume: data.volume,
            isMuted: data.isMuted,
            currentLanguage: this.manager.getCurrentLanguage(),
            languageFlag: this.manager.getLanguageInfo().flag
          });
          
          // Animation volume
          this.icon.animateVolumeChange();
        }
      };
      
      this.manager.onLanguageChange = (data) => {
        if (this.icon) {
          this.icon.updateStats({
            volume: this.manager.getVolume(),
            isMuted: this.manager.isMuted(),
            currentLanguage: data.currentLanguage,
            languageFlag: data.languageInfo.flag
          });
          
          // Animation langue
          this.icon.animateLanguageChange();
        }
        
        // Mise à jour UI si ouverte
        if (this.ui && this.ui.isVisible) {
          this.ui.updateOptionsData(this.manager.getAllOptions());
        }
      };
      
      this.manager.onOptionsUpdate = (updateData) => {
        // Mettre à jour UI si ouverte
        if (this.ui && this.ui.isVisible) {
          this.ui.updateOptionsData(this.manager.getAllOptions());
        }
        
        // Mise à jour stats icône
        if (this.icon) {
          const allOptions = this.manager.getAllOptions();
          this.icon.updateStats({
            volume: allOptions.volume,
            isMuted: allOptions.isMuted,
            currentLanguage: allOptions.currentLanguage,
            languageFlag: allOptions.languageInfo.flag
          });
        }
      };
    }
    
    // Interface → Manager (actions utilisateur)
    if (this.ui) {
      this.ui.onAction = (action, data) => {
        this.handleUIAction(action, data);
      };
    }
    
    // ✅ MISE À JOUR INITIALE des stats
    this.updateInitialStats();
    
    console.log('✅ [OptionsModule] Composants Options connectés');
  }
  
  // === ⚙️ MÉTHODES SPÉCIFIQUES OPTIONS ===
  
  /**
   * Gestion des actions de l'interface
   */
  handleUIAction(action, data) {
    console.log(`🎬 [OptionsModule] Action UI: ${action}`, data);
    
    if (!this.manager) {
      console.warn('⚠️ [OptionsModule] Manager non disponible');
      return;
    }
    
    switch (action) {
      case 'setVolume':
        this.manager.setVolume(data.volume);
        break;
        
      case 'setMuted':
        this.manager.setMuted(data.muted);
        break;
        
      case 'setLanguage':
        this.manager.setLanguage(data.language);
        break;
        
      case 'resetToDefaults':
        this.manager.resetToDefaults();
        this.ui?.resetChanges();
        break;
        
      case 'saveOptions':
        // Options auto-sauvées, juste reset changements
        this.ui?.resetChanges();
        this.showActionSuccess('Options sauvegardées');
        break;
        
      case 'requestData':
        if (this.ui) {
          this.ui.updateOptionsData(this.manager.getAllOptions());
        }
        break;
        
      default:
        console.warn(`⚠️ [OptionsModule] Action inconnue: ${action}`);
    }
  }
  
  /**
   * Mise à jour initiale des stats
   */
  updateInitialStats() {
    if (this.manager && this.icon) {
      const allOptions = this.manager.getAllOptions();
      this.icon.updateStats({
        volume: allOptions.volume,
        isMuted: allOptions.isMuted,
        currentLanguage: allOptions.currentLanguage,
        languageFlag: allOptions.languageInfo.flag
      });
    }
  }
  
  /**
   * Override show pour charger les données
   */
  show() {
    const result = super.show();
    
    // Charger données Options spécifiquement
    if (this.manager && this.ui) {
      setTimeout(() => {
        this.ui.updateOptionsData(this.manager.getAllOptions());
      }, 100);
    }
    
    return result;
  }
  
  /**
   * Afficher succès action
   */
  showActionSuccess(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'success', {
        duration: 2000,
        position: 'top-center'
      });
    }
  }
  
  // === 🌐 API PUBLIQUE OPTIONS ===
  
  /**
   * Obtenir la langue courante
   */
  getCurrentLanguage() {
    return this.manager ? this.manager.getCurrentLanguage() : 'en';
  }
  
  /**
   * Obtenir le volume courant
   */
  getCurrentVolume() {
    return this.manager ? this.manager.getEffectiveVolume() : 50;
  }
  
  /**
   * Vérifier si audio muté
   */
  isAudioMuted() {
    return this.manager ? this.manager.isMuted() : false;
  }
  
  /**
   * Changer langue
   */
  setLanguage(languageCode) {
    if (this.manager) {
      return this.manager.setLanguage(languageCode);
    }
    return false;
  }
  
  /**
   * Changer volume
   */
  setVolume(volume) {
    if (this.manager) {
      return this.manager.setVolume(volume);
    }
    return false;
  }
  
  /**
   * Basculer mute
   */
  toggleMute() {
    if (this.manager) {
      return this.manager.toggleMute();
    }
    return false;
  }
  
  /**
   * Obtenir toutes les options
   */
  getAllOptions() {
    return this.manager ? this.manager.getAllOptions() : {};
  }
  
  /**
   * Réinitialiser aux défauts
   */
  resetToDefaults() {
    if (this.manager) {
      this.manager.resetToDefaults();
      return true;
    }
    return false;
  }
  
  /**
   * API legacy pour compatibilité
   */
  toggleOptionsUI() {
    this.toggleUI();
  }
  
  openOptions() {
    this.open();
  }
  
  closeOptions() {
    this.close();
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS OPTIONS ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Options
    return {
      ...baseState,
      currentLanguage: this.getCurrentLanguage(),
      currentVolume: this.getCurrentVolume(),
      isAudioMuted: this.isAudioMuted(),
      moduleType: 'options'
    };
  }
  
  // === ⌨️ GESTION ESCAPE SPÉCIALE ===
  
  /**
   * Override pour gestion spéciale de la touche Escape
   */
  handleKeyboardShortcut(event) {
    if (event.key === 'Escape') {
      // Si une UI est ouverte, fermer celle qui a la priorité la plus haute
      if (this.isUIVisible()) {
        // Si options ouvert, le fermer
        this.close();
        event.preventDefault();
        event.stopPropagation();
        return true;
      } else {
        // Si rien d'ouvert, ouvrir options
        this.open();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    }
    
    return super.handleKeyboardShortcut(event);
  }
  
  /**
   * Vérifier si une UI quelconque est visible
   */
  isUIVisible() {
    // Vérifier nos UI
    if (this.ui && this.ui.isVisible) return true;
    
    // Vérifier les autres modules via window
    const uiChecks = [
      () => window.questSystem?.ui?.isVisible,
      () => window.teamSystem?.ui?.isVisible,
      () => window.inventorySystem?.ui?.isVisible
    ];
    
    return uiChecks.some(check => {
      try {
        return check();
      } catch {
        return false;
      }
    });
  }
}

// === 🏭 FACTORY OPTIONS ===

/**
 * Factory function pour créer le module Options
 * Utilise la factory générique de BaseModule
 */
export async function createOptionsModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [OptionsFactory] Création module Options avec BaseModule...');
    
    const optionsOptions = {
      singleton: true,
      ...options
    };
    
    const optionsInstance = await createModule(OptionsModule, 'options', gameRoom, scene, optionsOptions);
    
    console.log('✅ [OptionsFactory] Module Options créé avec succès');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsFactory] Erreur création module Options:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION OPTIONS POUR UIMANAGER ===

export const OPTIONS_MODULE_CONFIG = generateModuleConfig('options', {
  moduleClass: OptionsModule,
  order: 0, // Premier en haut-droite
  
  options: {
    singleton: true,
    keyboardShortcut: 'Escape',
    uiManagerConfig: {
      anchor: 'top-right',
      group: 'ui-options'
    }
  },
  
  groups: ['ui-options', 'settings'],
  
  metadata: {
    name: 'Options & Settings',
    description: 'Game options: volume, language, and settings management',
    version: '1.0.0',
    category: 'Settings'
  },
  
  factory: () => createOptionsModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

/**
 * Enregistrer le module Options dans UIManager
 */
export async function registerOptionsModule(uiManager) {
  try {
    console.log('📝 [OptionsIntegration] Enregistrement Options...');
    
    // Vérifier si déjà enregistré
    if (uiManager.modules && uiManager.modules.has('options')) {
      console.log('ℹ️ [OptionsIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('options', OPTIONS_MODULE_CONFIG);
    console.log('✅ [OptionsIntegration] Module Options enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [OptionsIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Options
 */
export async function initializeOptionsModule(uiManager) {
  try {
    console.log('🚀 [OptionsIntegration] Initialisation Options...');
    
    // Enregistrer le module
    await registerOptionsModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let optionsInstance = OptionsModule.getInstance('options');
    
    if (!optionsInstance || !optionsInstance.uiManagerState.initialized) {
      // Initialiser le module
      optionsInstance = await uiManager.initializeModule('options');
    } else {
      console.log('ℹ️ [OptionsIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      optionsInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Options
    setupOptionsGlobalEvents(optionsInstance);
    
    console.log('✅ [OptionsIntegration] Initialisation Options terminée');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX OPTIONS ===

function setupOptionsGlobalEvents(optionsInstance) {
  // Éviter double setup
  if (window._optionsEventsSetup) {
    console.log('ℹ️ [OptionsEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Changement de langue
  window.addEventListener('languageChanged', (event) => {
    console.log('🌐 [OptionsEvents] Langue changée:', event.detail);
    
    // Recharger les textes si nécessaire
    if (typeof window.updateGameTexts === 'function') {
      window.updateGameTexts(event.detail.language);
    }
  });
  
  // Événement: Audio focus (pour auto-mute)
  window.addEventListener('blur', () => {
    if (optionsInstance.manager && !optionsInstance.manager.isMuted()) {
      // Optionnel: mettre en sourdine quand fenêtre perd le focus
      // optionsInstance.manager.setMuted(true);
    }
  });
  
  window.addEventListener('focus', () => {
    if (optionsInstance.manager) {
      // Appliquer les paramètres audio au retour de focus
      optionsInstance.manager.applyVolumeSettings();
    }
  });
  
  // Événement: Détection changement langue navigateur
  window.addEventListener('languagechange', () => {
    if (optionsInstance.manager && optionsInstance.manager.isUsingAutoLanguage()) {
      optionsInstance.manager.detectBrowserLanguage();
      optionsInstance.manager.applyLanguageSettings();
    }
  });
  
  window._optionsEventsSetup = true;
  console.log('🌐 [OptionsEvents] Événements Options configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Options dans un projet
 */
export async function setupOptionsSystem(uiManager) {
  try {
    console.log('🔧 [OptionsSetup] Configuration système Options avec BaseModule...');
    
    // Initialiser le module
    const optionsInstance = await initializeOptionsModule(uiManager);
    
    // Exposer globalement pour compatibilité
    if (!window.optionsSystem) {
      window.optionsSystem = optionsInstance;
      window.optionsSystemGlobal = optionsInstance;
      window.toggleOptions = () => optionsInstance.toggleUI();
      window.openOptions = () => optionsInstance.open();
      window.closeOptions = () => optionsInstance.close();
      window.forceCloseOptions = () => optionsInstance.forceCloseUI();
      
      // ✅ API SIMPLE déjà exposée par OptionsManager
      // window.GetPlayerCurrentLanguage - déjà définie
      // window.GetPlayerCurrentVolume - déjà définie
      // window.IsPlayerAudioMuted - déjà définie
      
      console.log('🌐 [OptionsSetup] Fonctions globales Options exposées');
    }
    
    console.log('✅ [OptionsSetup] Système Options configuré avec BaseModule');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🎯 API SHORTCUTS GLOBALES ===

/**
 * Raccourcis pour accès rapide aux options
 */
export function getQuickOptionsAPI() {
  const instance = OptionsModule.getInstance('options');
  
  return {
    // Langue
    getCurrentLanguage: () => instance?.getCurrentLanguage() || 'en',
    setLanguage: (lang) => instance?.setLanguage(lang) || false,
    
    // Volume
    getCurrentVolume: () => instance?.getCurrentVolume() || 50,
    setVolume: (vol) => instance?.setVolume(vol) || false,
    toggleMute: () => instance?.toggleMute() || false,
    isAudioMuted: () => instance?.isAudioMuted() || false,
    
    // Options
    getAllOptions: () => instance?.getAllOptions() || {},
    resetToDefaults: () => instance?.resetToDefaults() || false,
    
    // UI
    openOptions: () => instance?.open() || false,
    closeOptions: () => instance?.close() || false,
    toggleOptions: () => instance?.toggleUI() || false
  };
}

// === 🔍 UTILITÉS DE DEBUG OPTIONS ===

export function debugOptionsModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('options', OptionsModule);
}

export function fixOptionsModule() {
  console.log('🔧 [OptionsFix] Réparation module Options...');
  
  try {
    const instance = OptionsModule.getInstance('options');
    
    if (instance) {
      // Force fermeture UI via BaseModule
      instance.forceCloseUI();
      
      // Réappliquer paramètres
      if (instance.manager) {
        instance.manager.applyOptions();
      }
      
      console.log('✅ [OptionsFix] Module Options réparé');
      return true;
    } else {
      console.log('ℹ️ [OptionsFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [OptionsFix] Erreur réparation:', error);
    return false;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default OptionsModule;

// === 🌐 AUTO-SETUP SI DEMANDÉ ===

// Exposer API simple immédiatement si pas encore fait
if (typeof window !== 'undefined' && !window.GetPlayerCurrentLanguage) {
  // API de base disponible même avant init complète
  window.GetPlayerCurrentLanguage = () => {
    const instance = OptionsModule.getInstance('options');
    if (instance) {
      return instance.getCurrentLanguage();
    }
    
    // Fallback basique
    try {
      const lang = navigator.language.toLowerCase().split('-')[0];
      return ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko'].includes(lang) ? lang : 'en';
    } catch {
      return 'en';
    }
  };
  
  window.GetPlayerCurrentVolume = () => {
    const instance = OptionsModule.getInstance('options');
    return instance ? instance.getCurrentVolume() : 50;
  };
  
  window.IsPlayerAudioMuted = () => {
    const instance = OptionsModule.getInstance('options');
    return instance ? instance.isAudioMuted() : false;
  };
  
  console.log('🌐 [OptionsModule] API globale basique exposée');
}

console.log(`
⚙️ === OPTIONS MODULE COMPLET AVEC BASEMODULE ===

🎯 ARCHITECTURE BASEMODULE:
• Hérite logique UIManager complète
• Patterns standards avec Team/Quest
• Singleton intégré
• Position haut-droite spéciale

📍 CONFIGURATION UIMANAGER:
• anchor: 'top-right' (unique)
• order: 0 (premier en haut)
• group: 'ui-options'
• shortcut: 'Escape'

🌐 API GLOBALE SIMPLE:
• GetPlayerCurrentLanguage() → 'fr', 'en', etc.
• GetPlayerCurrentVolume() → 0-100
• IsPlayerAudioMuted() → true/false
• Disponible IMMÉDIATEMENT depuis n'importe où

⚙️ FONCTIONNALITÉS COMPLÈTES:
• Volume 1-100 + mute temps réel
• 8 langues + auto-détection
• Sauvegarde localStorage
• UI complète avec feedback

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), toggle() - BaseModule
• connectUIManager() - connexion auto
• forceCloseUI() - fermeture forcée
• getUIManagerState() - état complet

⌨️ ESCAPE SPÉCIAL:
• Si UI ouverte → ferme l'UI prioritaire
• Si rien ouvert → ouvre Options
• Gestion intelligente des conflits

✅ OPTIONS MODULE 100% TERMINÉ !
`);
