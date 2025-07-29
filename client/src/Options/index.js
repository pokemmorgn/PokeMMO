// Options/index.js - OptionsModule avec BaseModule + TRADUCTIONS INTÉGRÉES
// 🎯 UTILISE BaseModule pour cohérence avec Team/Quest
// 📍 INTÉGRÉ avec UIManager - Position haut-droite
// ⚙️ MODULE COMPLET: Volume + Langue + API globale
// 🌐 TRADUCTIONS TEMPS RÉEL pour l'interface Options elle-même

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { OptionsManager, initializeGlobalOptionsAPI } from './OptionsManager.js';
import { OptionsIcon } from './OptionsIcon.js';
import { OptionsUI } from './OptionsUI.js';

/**
 * Module Options utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 * 🌐 SUPPORTE TRADUCTIONS TEMPS RÉEL
 */
export class OptionsModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // ✅ EXTRAIRE optionsManager des options (pour éviter récursion)
    const { optionsManager, ...baseOptions } = options;
    
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
      ...baseOptions
    };
    
    super(moduleId || 'options', gameRoom, scene, optionsOptions);
    
    // ✅ STOCKER optionsManager externe (pour éviter récursion avec soi-même)
    this.externalOptionsManager = optionsManager;
    
    console.log('⚙️ [OptionsModule] Instance créée avec BaseModule + traductions');
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
    
    // ✅ CRÉER L'INTERFACE AVEC TRADUCTIONS
    if (!this.ui) {
      // Passer le manager principal ET l'external pour traductions
      this.ui = new OptionsUI(this.manager, this.gameRoom, this.externalOptionsManager);
      // Note: L'init de OptionsUI est async, on le fait dans connectComponents
    }
    
    console.log('✅ [OptionsModule] Composants Options créés avec traductions');
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
        
        // ✅ NOUVEAU : Mettre à jour traductions de l'UI Options
        if (this.ui && this.ui.isVisible) {
          this.ui.updateLanguage();
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
    
    // ✅ SETUP TRADUCTIONS pour l'UI Options
    this.setupTranslationsSupport();
    
    // ✅ MISE À JOUR INITIALE des stats
    this.updateInitialStats();
    
    console.log('✅ [OptionsModule] Composants Options connectés avec traductions');
  }
  
  // === 🌐 SETUP TRADUCTIONS POUR L'UI OPTIONS ===
  
  setupTranslationsSupport() {
    console.log('🌐 [OptionsModule] Setup traductions pour UI Options...');
    
    // Si on a un optionsManager externe, écouter ses changements
    if (this.externalOptionsManager && this.ui) {
      // ✅ ÉCOUTER LES CHANGEMENTS DE LANGUE EXTERNE
      const cleanup = this.externalOptionsManager.addLanguageListener((newLang, oldLang) => {
        console.log('🌐 [OptionsModule] Langue externe changée:', oldLang, '→', newLang);
        
        if (this.ui && this.ui.updateLanguage) {
          this.ui.updateLanguage();
        }
      });
      
      // Stocker cleanup pour destruction
      this.cleanupExternalLanguageListener = cleanup;
      
      console.log('✅ [OptionsModule] Listener traductions externe configuré');
    }
    
    // ✅ ÉCOUTER NOS PROPRES CHANGEMENTS de langue
    if (this.manager && this.ui) {
      const cleanup = this.manager.addLanguageListener((newLang, oldLang) => {
        console.log('🌐 [OptionsModule] Langue interne changée:', oldLang, '→', newLang);
        
        if (this.ui && this.ui.updateLanguage) {
          this.ui.updateLanguage();
        }
      });
      
      // Stocker cleanup pour destruction
      this.cleanupInternalLanguageListener = cleanup;
      
      console.log('✅ [OptionsModule] Listener traductions interne configuré');
    }
  }
  
  // === ⚙️ MÉTHODES SPÉCIFIQUES OPTIONS (IDENTIQUES) ===
  
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
   * Override show pour charger les données + traductions
   */
  show() {
    const result = super.show();
    
    // Charger données Options spécifiquement
    if (this.manager && this.ui) {
      setTimeout(() => {
        this.ui.updateOptionsData(this.manager.getAllOptions());
        // ✅ FORCER MISE À JOUR TRADUCTIONS à l'ouverture
        this.ui.updateLanguage();
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
  
  // === 🌐 API PUBLIQUE OPTIONS (IDENTIQUES) ===
  
  getCurrentLanguage() {
    return this.manager ? this.manager.getCurrentLanguage() : 'en';
  }
  
  getCurrentVolume() {
    return this.manager ? this.manager.getEffectiveVolume() : 50;
  }
  
  isAudioMuted() {
    return this.manager ? this.manager.isMuted() : false;
  }
  
  setLanguage(languageCode) {
    if (this.manager) {
      return this.manager.setLanguage(languageCode);
    }
    return false;
  }
  
  setVolume(volume) {
    if (this.manager) {
      return this.manager.setVolume(volume);
    }
    return false;
  }
  
  toggleMute() {
    if (this.manager) {
      return this.manager.toggleMute();
    }
    return false;
  }
  
  getAllOptions() {
    return this.manager ? this.manager.getAllOptions() : {};
  }
  
  resetToDefaults() {
    if (this.manager) {
      this.manager.resetToDefaults();
      return true;
    }
    return false;
  }
  
  // API legacy pour compatibilité
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
      moduleType: 'options',
      hasTranslationsSupport: true, // ✅ NOUVEAU
      hasExternalOptionsManager: !!this.externalOptionsManager // ✅ NOUVEAU
    };
  }
  
  // === ⌨️ GESTION ESCAPE SPÉCIALE (IDENTIQUE) ===
  
  handleKeyboardShortcut(event) {
    if (event.key === 'Escape') {
      if (this.isUIVisible()) {
        this.close();
        event.preventDefault();
        event.stopPropagation();
        return true;
      } else {
        this.open();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    }
    
    return super.handleKeyboardShortcut(event);
  }
  
  isUIVisible() {
    if (this.ui && this.ui.isVisible) return true;
    
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
  
  // === 🧹 NETTOYAGE AVEC TRADUCTIONS ===
  
  destroy() {
    console.log('🧹 [OptionsModule] Destruction avec nettoyage traductions...');
    
    // ✅ NETTOYER LISTENERS TRADUCTIONS
    if (this.cleanupExternalLanguageListener) {
      this.cleanupExternalLanguageListener();
      this.cleanupExternalLanguageListener = null;
      console.log('🌐 [OptionsModule] Listener externe nettoyé');
    }
    
    if (this.cleanupInternalLanguageListener) {
      this.cleanupInternalLanguageListener();
      this.cleanupInternalLanguageListener = null;
      console.log('🌐 [OptionsModule] Listener interne nettoyé');
    }
    
    // Nettoyage BaseModule standard
    super.destroy();
    
    // Nettoyage spécifique Options
    this.externalOptionsManager = null;
    
    console.log('✅ [OptionsModule] Détruit avec traductions');
  }
}

// === 🏭 FACTORY OPTIONS AVEC TRADUCTIONS ===

/**
 * Factory function pour créer le module Options
 * ✅ SUPPORTE TRADUCTIONS via optionsManager externe
 */
export async function createOptionsModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [OptionsFactory] Création module Options avec BaseModule + traductions...');
    console.log('🌐 [OptionsFactory] Options reçues:', Object.keys(options));
    
    const optionsOptions = {
      singleton: true,
      ...options // ✅ INCLUT optionsManager si présent
    };
    
    const optionsInstance = await createModule(OptionsModule, 'options', gameRoom, scene, optionsOptions);
    
    console.log('✅ [OptionsFactory] Module Options créé avec traductions');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsFactory] Erreur création module Options:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION OPTIONS POUR UIMANAGER (IDENTIQUE) ===

export const OPTIONS_MODULE_CONFIG = generateModuleConfig('options', {
  moduleClass: OptionsModule,
  order: 0,
  
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
    description: 'Game options: volume, language, and settings management with translations',
    version: '1.0.0',
    category: 'Settings',
    features: ['translations', 'real-time-language-switching'] // ✅ NOUVEAU
  },
  
  factory: () => createOptionsModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 RESTE DU CODE IDENTIQUE ===
// (registerOptionsModule, initializeOptionsModule, setupOptionsGlobalEvents, etc.)

export async function registerOptionsModule(uiManager) {
  try {
    console.log('📝 [OptionsIntegration] Enregistrement Options...');
    
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

export async function initializeOptionsModule(uiManager) {
  try {
    console.log('🚀 [OptionsIntegration] Initialisation Options...');
    
    await registerOptionsModule(uiManager);
    
    let optionsInstance = OptionsModule.getInstance('options');
    
    if (!optionsInstance || !optionsInstance.uiManagerState.initialized) {
      optionsInstance = await uiManager.initializeModule('options');
    } else {
      console.log('ℹ️ [OptionsIntegration] Instance déjà initialisée');
      optionsInstance.connectUIManager(uiManager);
    }
    
    setupOptionsGlobalEvents(optionsInstance);
    
    console.log('✅ [OptionsIntegration] Initialisation Options terminée avec traductions');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsIntegration] Erreur initialisation:', error);
    throw error;
  }
}

function setupOptionsGlobalEvents(optionsInstance) {
  if (window._optionsEventsSetup) {
    console.log('ℹ️ [OptionsEvents] Événements déjà configurés');
    return;
  }
  
  window.addEventListener('languageChanged', (event) => {
    console.log('🌐 [OptionsEvents] Langue changée:', event.detail);
    
    if (typeof window.updateGameTexts === 'function') {
      window.updateGameTexts(event.detail.language);
    }
  });
  
  window.addEventListener('blur', () => {
    if (optionsInstance.manager && !optionsInstance.manager.isMuted()) {
      // Optionnel: auto-mute
    }
  });
  
  window.addEventListener('focus', () => {
    if (optionsInstance.manager) {
      optionsInstance.manager.applyVolumeSettings();
    }
  });
  
  window.addEventListener('languagechange', () => {
    if (optionsInstance.manager && optionsInstance.manager.isUsingAutoLanguage()) {
      optionsInstance.manager.detectBrowserLanguage();
      optionsInstance.manager.applyLanguageSettings();
    }
  });
  
  window._optionsEventsSetup = true;
  console.log('🌐 [OptionsEvents] Événements Options configurés avec traductions');
}

export async function setupOptionsSystem(uiManager) {
  try {
    console.log('🔧 [OptionsSetup] Configuration système Options avec BaseModule + traductions...');
    
    const optionsInstance = await initializeOptionsModule(uiManager);
    
    if (!window.optionsSystem) {
      window.optionsSystem = optionsInstance;
      window.optionsSystemGlobal = optionsInstance;
      window.toggleOptions = () => optionsInstance.toggleUI();
      window.openOptions = () => optionsInstance.open();
      window.closeOptions = () => optionsInstance.close();
      window.forceCloseOptions = () => optionsInstance.forceCloseUI();
      
      console.log('🌐 [OptionsSetup] Fonctions globales Options exposées avec traductions');
    }
    
    console.log('✅ [OptionsSetup] Système Options configuré avec BaseModule + traductions');
    return optionsInstance;
    
  } catch (error) {
    console.error('❌ [OptionsSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🎯 API SHORTCUTS GLOBALES (IDENTIQUES) ===

export function getQuickOptionsAPI() {
  const instance = OptionsModule.getInstance('options');
  
  return {
    getCurrentLanguage: () => instance?.getCurrentLanguage() || 'en',
    setLanguage: (lang) => instance?.setLanguage(lang) || false,
    getCurrentVolume: () => instance?.getCurrentVolume() || 50,
    setVolume: (vol) => instance?.setVolume(vol) || false,
    toggleMute: () => instance?.toggleMute() || false,
    isAudioMuted: () => instance?.isAudioMuted() || false,
    getAllOptions: () => instance?.getAllOptions() || {},
    resetToDefaults: () => instance?.resetToDefaults() || false,
    openOptions: () => instance?.open() || false,
    closeOptions: () => instance?.close() || false,
    toggleOptions: () => instance?.toggleUI() || false
  };
}

export function debugOptionsModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('options', OptionsModule);
}

export function fixOptionsModule() {
  console.log('🔧 [OptionsFix] Réparation module Options...');
  
  try {
    const instance = OptionsModule.getInstance('options');
    
    if (instance) {
      instance.forceCloseUI();
      
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

export default OptionsModule;

// === 🌐 AUTO-SETUP API GLOBALE (IDENTIQUE) ===

if (typeof window !== 'undefined' && !window.GetPlayerCurrentLanguage) {
  window.GetPlayerCurrentLanguage = () => {
    const instance = OptionsModule.getInstance('options');
    if (instance) {
      return instance.getCurrentLanguage();
    }
    
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
⚙️ === OPTIONS MODULE AVEC TRADUCTIONS INTÉGRÉES ===

🌐 NOUVELLES FONCTIONNALITÉS TRADUCTIONS:
• externalOptionsManager dans constructeur
• setupTranslationsSupport() pour UI Options
• Listeners double: externe + interne
• updateLanguage() automatique sur changement
• Nettoyage listeners dans destroy()

🔄 FLUX TRADUCTIONS:
1. UI.js passe optionsManager → OptionsModule
2. OptionsModule stocke comme externalOptionsManager
3. OptionsModule crée son propre manager interne
4. OptionsUI reçoit les DEUX managers
5. Listeners sur les deux pour mise à jour UI

✅ RÉSULTAT:
• L'interface Options se traduit elle-même
• Changement langue externe → UI Options traduite
• Changement langue dans Options → tout se traduit
• Pas de récursion infinie
• Nettoyage automatique des listeners

🎯 UTILISATION DANS UI.JS:
• Passer { optionsManager } à createOptionsModule()
• L'OptionsUI se traduira automatiquement
• API globale toujours disponible

✅ OPTIONS MODULE AVEC TRADUCTIONS COMPLÈTES !
`);
