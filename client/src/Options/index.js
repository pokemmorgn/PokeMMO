// Options/index.js - Point d'entrée Options standardisé
// 🎛️ ALIGNÉ sur la structure Team/index.js pour cohérence
// 📍 Point d'entrée unique pour toutes les importations Options

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { OptionsManager } from './OptionsManager.js';
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
      keyboardShortcut: 'Escape', // Touche Échap pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'top-right',
        order: 100,              // Position isolée (très élevée)
        group: 'options-group'   // Groupe séparé
      },
      ...options
    };
    
    super(moduleId || 'options', gameRoom, scene, optionsOptions);
    
    console.log('🎛️ [OptionsModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Options
   */
  async init() {
    console.log('🚀 [OptionsModule] Initialisation métier Options...');
    
    // Créer le manager (business logic)
    this.manager = new OptionsManager(this.gameRoom, {
      storageKey: 'game_settings',
      autoSave: true,
      autoApply: true,
      onSettingsChange: (settings) => this.handleSettingsChange(settings),
      onLanguageChange: (language) => this.handleLanguageChange(language),
      onAudioChange: (audio) => this.handleAudioChange(audio)
    });
    
    await this.manager.init();
    
    console.log('✅ [OptionsModule] Manager Options initialisé');
  }
  
  /**
   * Création des composants Options
   */
  createComponents() {
    console.log('🔧 [OptionsModule] Création composants Options...');
    
    // Créer l'icône si pas encore fait
    if (!this.icon) {
      this.icon = new OptionsIcon(this.manager, {
        onClick: () => this.handleIconClick(),
        onHover: (hovered) => this.handleIconHover(hovered)
      });
      this.icon.init();
    }
    
    // Créer l'interface si pas encore fait
    if (!this.ui) {
      this.ui = new OptionsUI(this.manager, {
        closeOnEscape: true,
        saveOnClose: true,
        onClose: () => this.handleUIClose(),
        onSettingsApply: (settings) => this.handleSettingsApply(settings),
        onLanguageTest: (language) => this.handleLanguageTest(language)
      });
      // Note: L'init de OptionsUI est async, on le fait dans connectComponents si nécessaire
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
    
    // Manager → Icône (mise à jour des changements)
    if (this.manager) {
      this.manager.onSettingsChange = (settings) => {
        if (this.icon) {
          this.icon.setHasChanges(this.manager.isDirtySettings());
        }
        
        // Propager le changement
        this.handleSettingsChange(settings);
      };
    }
    
    // Interface → Manager (actions utilisateur)
    if (this.ui) {
      this.ui.onSettingsApply = (settings) => {
        if (this.manager) {
          this.manager.updateSettings(settings);
        }
        this.handleSettingsApply(settings);
      };
    }
    
    console.log('✅ [OptionsModule] Composants Options connectés');
  }
  
  // === 📊 MÉTHODES SPÉCIFIQUES OPTIONS ===
  
  /**
   * Obtenir la langue courante
   */
  getCurrentLanguage() {
    return this.manager ? this.manager.getCurrentLanguage() : 'en';
  }
  
  /**
   * Changer la langue
   */
  setLanguage(langCode, manual = true) {
    if (this.manager) {
      return this.manager.setLanguage(langCode, manual);
    }
    return false;
  }
  
  /**
   * Obtenir tous les paramètres
   */
  getAllSettings() {
    return this.manager ? this.manager.getSettings() : {};
  }
  
  /**
   * Reset aux paramètres par défaut
   */
  resetToDefaults() {
    if (this.manager) {
      return this.manager.resetToDefaults();
    }
    return false;
  }
  
  // === 🎬 GESTION ÉVÉNEMENTS ===
  
  handleIconClick() {
    console.log('🖱️ [OptionsModule] Clic icône Options');
    
    if (this.canOpenUI()) {
      this.ui.toggle();
    } else {
      this.showCannotOpenMessage('Options temporairement inaccessibles');
    }
  }
  
  handleIconHover(hovered) {
    // Tooltip géré par l'icône elle-même
  }
  
  handleUIClose() {
    console.log('🚪 [OptionsModule] Fermeture UI Options');
    
    // Auto-save géré par OptionsUI
    if (this.icon) {
      this.icon.setHasChanges(false); // Plus de changements non sauvegardés
    }
  }
  
  handleSettingsChange(settings) {
    console.log('🔧 [OptionsModule] Changement paramètres:', settings);
    
    // Propager aux autres systèmes si nécessaire
    if (settings.language) {
      // Notifier changement de langue globalement
      document.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { 
          language: this.getCurrentLanguage(),
          settings: settings.language
        }
      }));
    }
  }
  
  handleSettingsApply(settings) {
    console.log('✅ [OptionsModule] Application paramètres:', settings);
    
    // Feedback utilisateur
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Paramètres sauvegardés !', 'success', {
        duration: 2000
      });
    }
  }
  
  handleLanguageChange(languageData) {
    console.log('🌍 [OptionsModule] Changement langue:', languageData);
    
    // Mettre à jour API globale
    this.updateGlobalLanguageAPI();
  }
  
  handleLanguageTest(language) {
    console.log('🧪 [OptionsModule] Test langue:', language);
    
    // Test géré par OptionsUI
  }
  
  handleAudioChange(audioData) {
    console.log('🔊 [OptionsModule] Changement audio:', audioData);
    
    // Audio géré par OptionsManager automatiquement
  }
  
  // === 🌐 API GLOBALE ===
  
  updateGlobalLanguageAPI() {
    // S'assurer que l'API globale retourne la langue actuelle
    const currentLang = this.getCurrentLanguage();
    
    // Mettre à jour les fonctions globales
    window.getPlayerLanguage = () => currentLang;
    
    console.log(`🌐 [OptionsModule] API globale mise à jour: ${currentLang}`);
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS OPTIONS ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Options
    return {
      ...baseState,
      currentLanguage: this.getCurrentLanguage(),
      hasUnsavedChanges: this.manager ? this.manager.isDirtySettings() : false,
      moduleType: 'options'
    };
  }
  
  // === ⌨️ OVERRIDE RACCOURCI CLAVIER ===
  
  canOpenUI() {
    // Options peut TOUJOURS s'ouvrir (contrairement aux autres modules)
    return this.isEnabled;
  }
  
  showCannotOpenMessage(message = 'Options inaccessibles') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'warning', {
        duration: 2000
      });
    }
  }
}

// === 🏭 FACTORY OPTIONS SIMPLIFIÉE ===

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
  order: 100, // Position isolée
  
  options: {
    singleton: true,
    keyboardShortcut: 'Escape',
    autoCloseUI: true
  },
  
  groups: ['options-group'],
  
  metadata: {
    name: 'Options System',
    description: 'Game settings and preferences management',
    version: '1.0.0',
    category: 'System',
    singleton: true,
    alwaysAccessible: true
  },
  
  factory: () => createOptionsModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER SIMPLIFIÉE ===

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
    const { language } = event.detail;
    console.log(`🌍 [OptionsEvents] Langue changée globalement: ${language}`);
    
    // Propager aux autres systèmes
    document.dispatchEvent(new CustomEvent('gameLanguageChanged', {
      detail: { language, source: 'options' }
    }));
  });
  
  // Événement: Touche Échap globale
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      // Vérifier si pas dans un dialogue critique
      const dialogueBox = document.querySelector('#dialogue-box');
      const dialogueVisible = dialogueBox && 
        dialogueBox.style.display !== 'none' && 
        !dialogueBox.hidden;
      
      if (!dialogueVisible && optionsInstance.canOpenUI()) {
        e.preventDefault();
        
        if (optionsInstance.ui && optionsInstance.ui.isVisible) {
          optionsInstance.ui.hide();
        } else {
          optionsInstance.ui.show();
        }
      }
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
      
      // API spécifique Options
      window.getPlayerLanguage = () => optionsInstance.getCurrentLanguage();
      window.setPlayerLanguage = (lang, manual = true) => optionsInstance.setLanguage(lang, manual);
      window.getGameSettings = () => optionsInstance.getAllSettings();
      window.resetGameSettings = () => optionsInstance.resetToDefaults();
      
      console.log('🌐 [OptionsSetup] Fonctions globales Options exposées');
    }
    
    console.log('✅ [OptionsSetup] Système Options configuré avec BaseModule');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsSetup] Erreur configuration:', error);
    throw error;
  }
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

// === 🎯 FONCTIONS D'INITIALISATION RAPIDE ===

/**
 * Fonction d'initialisation rapide pour tests
 */
export async function quickInitializeOptions() {
  try {
    console.log('⚡ [OptionsQuick] Initialisation rapide...');
    
    const optionsModule = await createOptionsModule(
      window.currentGameRoom,
      window.game?.scene?.getScenes(true)[0]
    );
    
    // Setup API globale immédiatement
    window.optionsSystemGlobal = optionsModule;
    window.getPlayerLanguage = () => optionsModule.getCurrentLanguage();
    window.setPlayerLanguage = (lang, manual = true) => optionsModule.setLanguage(lang, manual);
    
    console.log('✅ [OptionsQuick] Options initialisé rapidement');
    return optionsModule;
    
  } catch (error) {
    console.error('❌ [OptionsQuick] Erreur initialisation rapide:', error);
    throw error;
  }
}

console.log(`
🎛️ === OPTIONS MODULE AVEC BASEMODULE ===

🎯 NOUVELLES FONCTIONNALITÉS:
• BaseModule - logique UIManager mutualisée  
• Code standardisé - consistent avec Team/Quest
• Patterns uniformes - architecture cohérente
• Singleton intégré - via BaseModule

📍 AVANTAGES BASEMODULE:
• connectUIManager() générique
• forceCloseUI() standardisé
• Gestion état UIManager uniforme
• Raccourcis clavier automatiques (Échap)

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), setEnabled() - standards
• connectUIManager() - connexion sécurisée
• getUIManagerState() - état complet
• forceCloseUI() - fermeture forcée

🎯 SPÉCIFICITÉS OPTIONS:
• getCurrentLanguage() - langue active
• setLanguage() - changement langue
• getAllSettings() - tous paramètres
• API globale window.getPlayerLanguage()

⌨️ RACCOURCI CLAVIER:
• Échap ouvre/ferme Options PARTOUT
• Accessible même en bataille/dialogue
• canOpenUI() toujours true

✅ OPTIONS STANDARDISÉ AVEC BASEMODULE !
`);
