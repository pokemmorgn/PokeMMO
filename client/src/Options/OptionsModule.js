// Options/OptionsModule.js - Module Options avec Localisation
// 🎛️ Module focalisé : Audio + Langue (sans intégrations externes)
// 🌍 API globale simple : window.getPlayerLanguage()

import { BaseModule } from '../core/BaseModule.js';
import { OptionsManager } from './OptionsManager.js';
import { OptionsIcon } from './OptionsIcon.js';
import { OptionsUI } from './OptionsUI.js';

export class OptionsModule extends BaseModule {
  constructor(gameRoom, scene, options = {}) {
    const moduleOptions = {
      singleton: true,
      autoCloseUI: true,
      keyboardShortcut: 'Escape', // Touche Échap
      ...options,
      uiManagerConfig: {
        anchor: 'top-right',
        order: 100, // Priorité haute
        group: 'ui-icons',
        ...options.uiManagerConfig
      }
    };

    super('options', gameRoom, scene, moduleOptions);
    
    // État spécifique au module
    this.settings = {
      audio: {
        musicVolume: 0.8,
        soundVolume: 0.8,
        muted: false
      },
      language: {
        mode: 'auto', // 'auto' ou 'manual'
        selected: 'auto', // Code langue ou 'auto'
        detected: 'en', // Langue détectée
        available: ['en', 'fr', 'es', 'de', 'it', 'pt']
      },
      display: {
        theme: 'dark'
      }
    };
    
    console.log('🎛️ [OptionsModule] Module Options créé avec localisation');
  }

  // === 🚀 INITIALISATION SPÉCIFIQUE ===
  
  async init() {
    console.log('🚀 [OptionsModule] Initialisation...');
    
    // Détecter la langue du navigateur
    this.detectBrowserLanguage();
    
    // Charger les paramètres sauvegardés
    this.loadSettings();
    
    // Appliquer les paramètres audio
    this.applyAudioSettings();
    
    console.log('✅ [OptionsModule] Initialisé avec paramètres:', this.settings);
  }

  // === 🏗️ CRÉATION COMPOSANTS ===
  
  createComponents() {
    console.log('🏗️ [OptionsModule] Création composants...');
    
    // Manager (logique métier)
    this.manager = new OptionsManager(this.gameRoom, {
      onSettingsChange: (settings) => this.handleSettingsChange(settings),
      onLanguageChange: (language) => this.handleLanguageChange(language),
      onAudioChange: (audio) => this.handleAudioChange(audio)
    });
    
    // Icône UI
    this.icon = new OptionsIcon('options', {
      onClick: () => this.handleIconClick(),
      onHover: (hovered) => this.handleIconHover(hovered)
    });
    
    // Interface utilisateur
    this.ui = new OptionsUI(this.manager, {
      onClose: () => this.handleUIClose(),
      onSettingsApply: (settings) => this.handleSettingsApply(settings),
      onLanguageTest: (language) => this.handleLanguageTest(language)
    });
    
    console.log('✅ [OptionsModule] Composants créés');
  }

  // === 🔗 CONNEXION COMPOSANTS ===
  
  connectComponents() {
    console.log('🔗 [OptionsModule] Connexion composants...');
    
    // Manager ↔ Module
    this.manager.setModule(this);
    this.manager.setSettings(this.settings);
    
    // Icon ↔ Module
    this.icon.setModule(this);
    
    // UI ↔ Manager
    this.ui.setManager(this.manager);
    this.ui.setCurrentSettings(this.settings);
    
    // Manager ↔ UI (bidirectionnel)
    this.manager.setUI(this.ui);
    
    console.log('✅ [OptionsModule] Composants connectés');
  }

  // === 🌍 DÉTECTION LANGUE AUTOMATIQUE ===
  
  detectBrowserLanguage() {
    try {
      // Récupérer les langues du navigateur par priorité
      const languages = navigator.languages || [navigator.language || navigator.userLanguage || 'en'];
      
      console.log('🌍 [OptionsModule] Langues navigateur détectées:', languages);
      
      // Trouver la première langue supportée
      for (const lang of languages) {
        const langCode = lang.toLowerCase().split('-')[0]; // 'fr-FR' → 'fr'
        
        if (this.settings.language.available.includes(langCode)) {
          this.settings.language.detected = langCode;
          console.log(`✅ [OptionsModule] Langue détectée et supportée: ${langCode}`);
          return langCode;
        }
      }
      
      // Fallback vers anglais
      this.settings.language.detected = 'en';
      console.log('🔄 [OptionsModule] Fallback vers anglais');
      return 'en';
      
    } catch (error) {
      console.error('❌ [OptionsModule] Erreur détection langue:', error);
      this.settings.language.detected = 'en';
      return 'en';
    }
  }

  // === 💾 GESTION PARAMÈTRES ===
  
  loadSettings() {
    try {
      const saved = localStorage.getItem('game_settings');
      
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        
        // Merge avec paramètres par défaut (sécurité)
        this.settings = {
          audio: { ...this.settings.audio, ...parsedSettings.audio },
          language: { ...this.settings.language, ...parsedSettings.language },
          display: { ...this.settings.display, ...parsedSettings.display }
        };
        
        console.log('💾 [OptionsModule] Paramètres chargés:', this.settings);
      } else {
        console.log('🆕 [OptionsModule] Premiers paramètres, utilisation par défaut');
      }
      
    } catch (error) {
      console.error('❌ [OptionsModule] Erreur chargement paramètres:', error);
    }
  }
  
  saveSettings() {
    try {
      localStorage.setItem('game_settings', JSON.stringify(this.settings));
      console.log('💾 [OptionsModule] Paramètres sauvegardés');
      return true;
      
    } catch (error) {
      console.error('❌ [OptionsModule] Erreur sauvegarde paramètres:', error);
      return false;
    }
  }

  // === 🔊 GESTION AUDIO ===
  
  applyAudioSettings() {
    try {
      const { musicVolume, soundVolume, muted } = this.settings.audio;
      
      // Appliquer à Phaser si disponible
      if (this.scene && this.scene.sound) {
        this.scene.sound.volume = muted ? 0 : musicVolume;
        console.log(`🔊 [OptionsModule] Volume Phaser appliqué: ${muted ? 0 : musicVolume}`);
      }
      
      // Appliquer aux éléments HTML5 audio
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.volume = muted ? 0 : (audio.classList.contains('music') ? musicVolume : soundVolume);
      });
      
      // Notifier le système global
      if (typeof window.setGameVolume === 'function') {
        window.setGameVolume({
          music: muted ? 0 : musicVolume,
          sound: muted ? 0 : soundVolume,
          muted: muted
        });
      }
      
      console.log('🔊 [OptionsModule] Paramètres audio appliqués');
      
    } catch (error) {
      console.error('❌ [OptionsModule] Erreur application audio:', error);
    }
  }

  // === 🌍 LANGUE COURANTE ===
  
  getCurrentLanguage() {
    if (this.settings.language.mode === 'auto') {
      return this.settings.language.detected;
    } else {
      return this.settings.language.selected;
    }
  }
  
  getLanguageDisplayName(langCode) {
    const names = {
      'auto': '🌍 Automatique',
      'en': '🇺🇸 English',
      'fr': '🇫🇷 Français', 
      'es': '🇪🇸 Español',
      'de': '🇩🇪 Deutsch',
      'it': '🇮🇹 Italiano',
      'pt': '🇵🇹 Português'
    };
    
    return names[langCode] || langCode.toUpperCase();
  }

  // === 🎬 GESTION ÉVÉNEMENTS ===
  
  handleIconClick() {
    console.log('🖱️ [OptionsModule] Clic icône');
    
    if (this.canOpenUI()) {
      this.ui.toggle();
    } else {
      this.showCannotOpenMessage();
    }
  }
  
  handleIconHover(hovered) {
    if (hovered && typeof window.showGameTooltip === 'function') {
      window.showGameTooltip('Options (Échap)', {
        position: 'bottom',
        delay: 500
      });
    } else if (typeof window.hideGameTooltip === 'function') {
      window.hideGameTooltip();
    }
  }
  
  handleUIClose() {
    console.log('🚪 [OptionsModule] Fermeture UI');
    // Auto-save à la fermeture
    this.saveSettings();
  }
  
  handleSettingsChange(newSettings) {
    console.log('🔧 [OptionsModule] Changement paramètres:', newSettings);
    
    // Merge les nouveaux paramètres
    this.settings = { ...this.settings, ...newSettings };
    
    // Appliquer immédiatement
    this.applyAudioSettings();
    
    // Sauvegarder
    this.saveSettings();
    
    // Notifier le changement de langue si applicable
    if (newSettings.language) {
      this.notifyLanguageChange();
    }
  }
  
  handleSettingsApply(settings) {
    console.log('✅ [OptionsModule] Application paramètres:', settings);
    this.handleSettingsChange(settings);
    
    // Afficher confirmation
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Paramètres sauvegardés !', 'success', {
        duration: 2000
      });
    }
  }
  
  handleLanguageChange(languageData) {
    console.log('🌍 [OptionsModule] Changement langue:', languageData);
    
    this.settings.language = { ...this.settings.language, ...languageData };
    this.saveSettings();
    this.notifyLanguageChange();
  }
  
  handleLanguageTest(language) {
    console.log('🧪 [OptionsModule] Test langue:', language);
    
    // Afficher un exemple de texte dans la langue
    const testTexts = {
      'en': 'Hello! This is how English looks.',
      'fr': 'Bonjour ! Voici comment apparaît le français.',
      'es': '¡Hola! Así es como se ve el español.',
      'de': 'Hallo! So sieht Deutsch aus.',
      'it': 'Ciao! Ecco come appare l\'italiano.',
      'pt': 'Olá! É assim que o português aparece.'
    };
    
    const text = testTexts[language] || `Test language: ${language}`;
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(text, 'info', {
        duration: 3000,
        position: 'center'
      });
    }
  }
  
  handleAudioChange(audioData) {
    console.log('🔊 [OptionsModule] Changement audio:', audioData);
    
    this.settings.audio = { ...this.settings.audio, ...audioData };
    this.applyAudioSettings();
    this.saveSettings();
  }

  // === 📡 NOTIFICATION CHANGEMENT LANGUE ===
  
  notifyLanguageChange() {
    const currentLang = this.getCurrentLanguage();
    
    console.log(`📡 [OptionsModule] Notification changement langue: ${currentLang}`);
    
    // Émettre événement global pour autres modules
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: currentLang,
        mode: this.settings.language.mode,
        detected: this.settings.language.detected
      }
    }));
  }

  // === 📊 API PUBLIQUE ===
  
  /**
   * Obtenir la langue courante pour les interactions
   */
  getPlayerLanguage() {
    return this.getCurrentLanguage();
  }
  
  /**
   * Changer la langue programmatiquement
   */
  setLanguage(langCode, manual = false) {
    if (manual) {
      this.settings.language.mode = 'manual';
      this.settings.language.selected = langCode;
    } else {
      this.settings.language.mode = 'auto';
    }
    
    this.saveSettings();
    this.notifyLanguageChange();
    
    // Mettre à jour l'UI si ouverte
    if (this.ui && this.ui.isVisible) {
      this.ui.updateLanguageDisplay();
    }
    
    return true;
  }
  
  /**
   * Obtenir tous les paramètres
   */
  getAllSettings() {
    return {
      ...this.settings,
      currentLanguage: this.getCurrentLanguage()
    };
  }
  
  /**
   * Reset aux paramètres par défaut
   */
  resetToDefaults() {
    console.log('🔄 [OptionsModule] Reset paramètres par défaut...');
    
    this.settings = {
      audio: {
        musicVolume: 0.8,
        soundVolume: 0.8,
        muted: false
      },
      language: {
        mode: 'auto',
        selected: 'auto',
        detected: this.settings.language.detected, // Garder la détection
        available: this.settings.language.available
      },
      display: {
        theme: 'dark'
      }
    };
    
    this.applyAudioSettings();
    this.saveSettings();
    this.notifyLanguageChange();
    
    // Mettre à jour l'UI
    if (this.ui) {
      this.ui.updateAllDisplays();
    }
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Paramètres remis par défaut', 'info', {
        duration: 2000
      });
    }
    
    return true;
  }

  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsModule] Destruction...');
    
    // Sauvegarder avant destruction
    this.saveSettings();
    
    // Détruire composants
    super.destroy();
    
    console.log('✅ [OptionsModule] Détruit');
  }
}

// === 🌍 API GLOBALE SIMPLE ===

/**
 * 🔧 FONCTION GLOBALE PRINCIPALE - Récupération langue du joueur
 * Utilisable depuis N'IMPORTE OÙ dans l'application
 */
window.getPlayerLanguage = function() {
  try {
    // 1. Essayer via le module Options (si initialisé)
    const optionsModule = OptionsModule.getInstance('options');
    if (optionsModule) {
      const language = optionsModule.getPlayerLanguage();
      console.log('🌍 [Global] Langue via module Options:', language);
      return language;
    }
    
    // 2. Fallback via localStorage (paramètres sauvegardés)
    const savedSettings = JSON.parse(localStorage.getItem('game_settings') || '{}');
    if (savedSettings.language) {
      if (savedSettings.language.mode === 'manual' && savedSettings.language.selected) {
        console.log('🌍 [Global] Langue via localStorage (manuel):', savedSettings.language.selected);
        return savedSettings.language.selected;
      }
      
      if (savedSettings.language.detected) {
        console.log('🌍 [Global] Langue via localStorage (auto):', savedSettings.language.detected);
        return savedSettings.language.detected;
      }
    }
    
    // 3. Fallback final : détection navigateur directe
    const languages = navigator.languages || [navigator.language || 'en'];
    const supportedLangs = ['en', 'fr', 'es', 'de', 'it', 'pt'];
    
    for (const lang of languages) {
      const langCode = lang.toLowerCase().split('-')[0];
      if (supportedLangs.includes(langCode)) {
        console.log('🌍 [Global] Langue via détection navigateur:', langCode);
        return langCode;
      }
    }
    
    console.log('🌍 [Global] Fallback anglais');
    return 'en';
    
  } catch (error) {
    console.error('❌ [Global] Erreur récupération langue:', error);
    return 'en'; // Dernier fallback sécurisé
  }
};

/**
 * 🔧 FONCTION GLOBALE - Changer langue programmatiquement
 */
window.setPlayerLanguage = function(langCode, manual = true) {
  try {
    console.log(`🌍 [Global] Changement langue: ${langCode} (manuel: ${manual})`);
    
    // Essayer via le module Options d'abord
    const optionsModule = OptionsModule.getInstance('options');
    if (optionsModule) {
      const success = optionsModule.setLanguage(langCode, manual);
      if (success) {
        console.log('✅ [Global] Langue changée via module Options');
        return true;
      }
    }
    
    // Fallback: mise à jour directe localStorage
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
    } catch (e) {
      console.warn('⚠️ [Global] Erreur parsing localStorage, création nouveau');
    }
    
    if (!settings.language) {
      settings.language = {
        available: ['en', 'fr', 'es', 'de', 'it', 'pt'],
        detected: 'en'
      };
    }
    
    if (manual) {
      settings.language.mode = 'manual';
      settings.language.selected = langCode;
    } else {
      settings.language.mode = 'auto';
      settings.language.detected = langCode;
    }
    
    localStorage.setItem('game_settings', JSON.stringify(settings));
    
    // Émettre événement global
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: langCode,
        mode: manual ? 'manual' : 'auto',
        source: 'global_fallback'
      }
    }));
    
    console.log('✅ [Global] Langue changée via fallback localStorage');
    return true;
    
  } catch (error) {
    console.error('❌ [Global] Erreur changement langue:', error);
    return false;
  }
};

/**
 * 🔧 FONCTION GLOBALE - Vérifier si module disponible
 */
window.isOptionsModuleAvailable = function() {
  const optionsModule = OptionsModule.getInstance('options');
  return !!(optionsModule && optionsModule.uiManagerState?.initialized);
};

export default OptionsModule;

console.log(`
🎛️ === OPTIONS MODULE CLEAN ===

✅ FONCTIONNALITÉS:
• Détection automatique langue navigateur
• Paramètres audio (musique + sons)
• Interface Options avec Échap
• Intégration UIManager

🌍 API GLOBALE SIMPLE:
• window.getPlayerLanguage() → "fr"/"en"/etc.
• window.setPlayerLanguage(lang, manual)
• window.isOptionsModuleAvailable()

🎵 GESTION AUDIO:
• Volume musique/sons séparés
• Mode muet global
• Application Phaser + HTML5

📏 TAILLE: ~400 lignes (vs 600+ avant)
🎯 FOCALISÉ: Options seulement, pas d'intégrations
`);
