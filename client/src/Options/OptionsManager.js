// Options/OptionsManager.js - Business Logic Options
// 🎯 Gère UNIQUEMENT la logique métier des options, pas l'UI
// 🌐 Détection langue + Volume + Sauvegarde localStorage

export class OptionsManager {
  constructor(gameRoom = null) {
    this.gameRoom = gameRoom;
    
    // === DONNÉES OPTIONS ===
    this.options = {
      volume: 50,              // Volume 1-100
      isMuted: false,          // Sourdine
      language: 'auto',        // Code langue ou 'auto'
      detectedLanguage: 'en'   // Langue détectée du navigateur
    };
    
    // === LANGUES SUPPORTÉES ===
    this.supportedLanguages = {
      'en': { name: 'English', flag: '🇺🇸' },
      'fr': { name: 'Français', flag: '🇫🇷' },
      'es': { name: 'Español', flag: '🇪🇸' },
      'de': { name: 'Deutsch', flag: '🇩🇪' },
      'it': { name: 'Italiano', flag: '🇮🇹' },
      'pt': { name: 'Português', flag: '🇵🇹' },
      'ja': { name: '日本語', flag: '🇯🇵' },
      'ko': { name: '한국어', flag: '🇰🇷' }
    };
    
    // === CALLBACKS ===
    this.onVolumeChange = null;      // Appelé quand volume change
    this.onLanguageChange = null;    // Appelé quand langue change
    this.onOptionsUpdate = null;     // Appelé quand options changent
    
    // === ÉTAT ===
    this.initialized = false;
    this.saveTimeout = null;
    
    console.log('⚙️ [OptionsManager] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [OptionsManager] Initialisation...');
      
      this.detectBrowserLanguage();
      this.loadSavedOptions();
      this.applyOptions();
      
      this.initialized = true;
      
      console.log('✅ [OptionsManager] Initialisé');
      console.log('📊 [OptionsManager] Options:', this.options);
      
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🌐 DÉTECTION LANGUE ===
  
  detectBrowserLanguage() {
    try {
      // Méthodes de détection par ordre de priorité
      const detectionMethods = [
        () => navigator.language,
        () => navigator.languages?.[0],
        () => navigator.userLanguage,
        () => navigator.browserLanguage,
        () => navigator.systemLanguage
      ];
      
      let detectedLang = 'en'; // Fallback par défaut
      
      for (const method of detectionMethods) {
        try {
          const lang = method();
          if (lang) {
            // Extraire le code langue (ex: 'fr-FR' -> 'fr')
            const langCode = lang.toLowerCase().split('-')[0];
            
            // Vérifier si supporté
            if (this.supportedLanguages[langCode]) {
              detectedLang = langCode;
              break;
            }
          }
        } catch (e) {
          continue; // Essayer la méthode suivante
        }
      }
      
      this.options.detectedLanguage = detectedLang;
      
      console.log('🌐 [OptionsManager] Langue détectée:', {
        detected: detectedLang,
        original: navigator.language,
        supported: !!this.supportedLanguages[detectedLang]
      });
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur détection langue:', error);
      this.options.detectedLanguage = 'en';
    }
  }
  
  // === 💾 SAUVEGARDE ET CHARGEMENT ===
  
  loadSavedOptions() {
    try {
      const saved = localStorage.getItem('pokemmo_options');
      
      if (saved) {
        const parsedOptions = JSON.parse(saved);
        
        // Validation et merge avec les options par défaut
        this.options = {
          ...this.options,
          volume: this.validateVolume(parsedOptions.volume),
          isMuted: !!parsedOptions.isMuted,
          language: this.validateLanguage(parsedOptions.language)
        };
        
        console.log('💾 [OptionsManager] Options chargées depuis localStorage');
      } else {
        console.log('💾 [OptionsManager] Aucune sauvegarde - options par défaut');
      }
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur chargement options:', error);
      console.log('🔄 [OptionsManager] Utilisation options par défaut');
    }
  }
  
  saveOptions() {
    try {
      // Debounce pour éviter trop de sauvegardes
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      
      this.saveTimeout = setTimeout(() => {
        const toSave = {
          volume: this.options.volume,
          isMuted: this.options.isMuted,
          language: this.options.language,
          savedAt: Date.now()
        };
        
        localStorage.setItem('pokemmo_options', JSON.stringify(toSave));
        console.log('💾 [OptionsManager] Options sauvegardées');
        
      }, 300); // Attendre 300ms avant de sauvegarder
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur sauvegarde:', error);
    }
  }
  
  // === ✅ VALIDATION ===
  
  validateVolume(volume) {
    const parsed = parseInt(volume);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return 50; // Valeur par défaut
    }
    return parsed;
  }
  
  validateLanguage(language) {
    if (language === 'auto') return 'auto';
    if (this.supportedLanguages[language]) return language;
    return 'auto'; // Fallback sur auto-détection
  }
  
  // === 🔊 GESTION VOLUME ===
  
  setVolume(volume) {
    const validVolume = this.validateVolume(volume);
    
    if (validVolume !== this.options.volume) {
      this.options.volume = validVolume;
      
      console.log(`🔊 [OptionsManager] Volume: ${validVolume}%`);
      
      // Appliquer le volume
      this.applyVolumeSettings();
      
      // Notifier changement
      this.notifyVolumeChange();
      
      // Sauvegarder
      this.saveOptions();
    }
    
    return validVolume;
  }
  
  getVolume() {
    return this.options.volume;
  }
  
  setMuted(muted) {
    const isMuted = !!muted;
    
    if (isMuted !== this.options.isMuted) {
      this.options.isMuted = isMuted;
      
      console.log(`🔇 [OptionsManager] Mute: ${isMuted}`);
      
      // Appliquer les paramètres audio
      this.applyVolumeSettings();
      
      // Notifier changement
      this.notifyVolumeChange();
      
      // Sauvegarder
      this.saveOptions();
    }
    
    return isMuted;
  }
  
  isMuted() {
    return this.options.isMuted;
  }
  
  toggleMute() {
    return this.setMuted(!this.options.isMuted);
  }
  
  getEffectiveVolume() {
    return this.options.isMuted ? 0 : this.options.volume;
  }
  
  // === 🌐 GESTION LANGUE ===
  
  setLanguage(languageCode) {
    let validLanguage = languageCode;
    
    // Validation
    if (languageCode !== 'auto' && !this.supportedLanguages[languageCode]) {
      console.warn(`⚠️ [OptionsManager] Langue non supportée: ${languageCode}`);
      validLanguage = 'auto';
    }
    
    if (validLanguage !== this.options.language) {
      this.options.language = validLanguage;
      
      console.log(`🌐 [OptionsManager] Langue: ${validLanguage}`);
      
      // Notifier changement
      this.notifyLanguageChange();
      
      // Sauvegarder
      this.saveOptions();
    }
    
    return validLanguage;
  }
  
  getLanguage() {
    return this.options.language;
  }
  
  getCurrentLanguage() {
    // Méthode principale pour obtenir la langue courante
    if (this.options.language === 'auto') {
      return this.options.detectedLanguage;
    }
    return this.options.language;
  }
  
  getLanguageInfo(languageCode = null) {
    const code = languageCode || this.getCurrentLanguage();
    return this.supportedLanguages[code] || this.supportedLanguages['en'];
  }
  
  getSupportedLanguages() {
    return { ...this.supportedLanguages };
  }
  
  isLanguageSupported(languageCode) {
    return !!this.supportedLanguages[languageCode];
  }
  
  // === ⚡ APPLICATION DES PARAMÈTRES ===
  
  applyOptions() {
    console.log('⚡ [OptionsManager] Application des paramètres...');
    
    this.applyVolumeSettings();
    this.applyLanguageSettings();
    
    console.log('✅ [OptionsManager] Paramètres appliqués');
  }
  
  applyVolumeSettings() {
    try {
      const effectiveVolume = this.getEffectiveVolume() / 100; // 0-1
      
      // Appliquer aux éléments audio HTML
      document.querySelectorAll('audio, video').forEach(element => {
        element.volume = effectiveVolume;
      });
      
      // Intégration Phaser (si disponible)
      if (window.game && window.game.sound) {
        window.game.sound.volume = effectiveVolume;
      }
      
      // Howler.js (si utilisé)
      if (window.Howler) {
        window.Howler.volume(effectiveVolume);
      }
      
      console.log(`🔊 [OptionsManager] Volume appliqué: ${effectiveVolume * 100}%`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application volume:', error);
    }
  }
  
  applyLanguageSettings() {
    try {
      const currentLang = this.getCurrentLanguage();
      
      // Mettre à jour l'attribut lang du document
      document.documentElement.lang = currentLang;
      
      // Stocker globalement pour accès facile
      window.currentLanguage = currentLang;
      
      console.log(`🌐 [OptionsManager] Langue appliquée: ${currentLang}`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application langue:', error);
    }
  }
  
  // === 📢 NOTIFICATIONS ===
  
  notifyVolumeChange() {
    const data = {
      volume: this.options.volume,
      isMuted: this.options.isMuted,
      effectiveVolume: this.getEffectiveVolume()
    };
    
    this.triggerCallback('onVolumeChange', data);
    this.triggerCallback('onOptionsUpdate', { type: 'volume', data });
  }
  
  notifyLanguageChange() {
    const data = {
      language: this.options.language,
      currentLanguage: this.getCurrentLanguage(),
      languageInfo: this.getLanguageInfo()
    };
    
    this.triggerCallback('onLanguageChange', data);
    this.triggerCallback('onOptionsUpdate', { type: 'language', data });
  }
  
  triggerCallback(callbackName, data) {
    const callback = this[callbackName];
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [OptionsManager] Erreur callback ${callbackName}:`, error);
      }
    }
  }
  
  // === 📊 API PUBLIQUE ===
  
  getAllOptions() {
    return {
      ...this.options,
      currentLanguage: this.getCurrentLanguage(),
      effectiveVolume: this.getEffectiveVolume(),
      languageInfo: this.getLanguageInfo(),
      supportedLanguages: this.getSupportedLanguages()
    };
  }
  
  resetToDefaults() {
    console.log('🔄 [OptionsManager] Reset vers défauts...');
    
    this.options = {
      volume: 50,
      isMuted: false,
      language: 'auto',
      detectedLanguage: this.options.detectedLanguage // Garder la détection
    };
    
    this.applyOptions();
    this.saveOptions();
    
    // Notifier tous les changements
    this.notifyVolumeChange();
    this.notifyLanguageChange();
    
    console.log('✅ [OptionsManager] Reset terminé');
  }
  
  exportOptions() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      options: this.getAllOptions()
    };
  }
  
  importOptions(exportedData) {
    try {
      if (!exportedData || !exportedData.options) {
        throw new Error('Données d\'importation invalides');
      }
      
      const imported = exportedData.options;
      
      // Importer avec validation
      this.setVolume(imported.volume);
      this.setMuted(imported.isMuted);
      this.setLanguage(imported.language);
      
      console.log('📥 [OptionsManager] Options importées avec succès');
      return true;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur importation:', error);
      return false;
    }
  }
  
  // === 🔧 UTILITAIRES ===
  
  getVolumeIcon() {
    if (this.options.isMuted) return '🔇';
    
    const vol = this.options.volume;
    if (vol === 0) return '🔇';
    if (vol < 30) return '🔈';
    if (vol < 70) return '🔉';
    return '🔊';
  }
  
  getLanguageDisplayName(languageCode = null) {
    const info = this.getLanguageInfo(languageCode);
    return `${info.flag} ${info.name}`;
  }
  
  isUsingAutoLanguage() {
    return this.options.language === 'auto';
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsManager] Destruction...');
    
    // Sauvegarder avant destruction
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveOptions();
    }
    
    // Reset callbacks
    this.onVolumeChange = null;
    this.onLanguageChange = null;
    this.onOptionsUpdate = null;
    
    // Reset état
    this.initialized = false;
    this.gameRoom = null;
    
    console.log('✅ [OptionsManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.initialized,
      options: this.options,
      currentLanguage: this.getCurrentLanguage(),
      effectiveVolume: this.getEffectiveVolume(),
      supportedLanguages: Object.keys(this.supportedLanguages),
      browserInfo: {
        language: navigator.language,
        languages: navigator.languages,
        userLanguage: navigator.userLanguage
      },
      callbacks: {
        onVolumeChange: !!this.onVolumeChange,
        onLanguageChange: !!this.onLanguageChange,
        onOptionsUpdate: !!this.onOptionsUpdate
      }
    };
  }
}

// === 🌐 API GLOBALE SIMPLE ===

// Variables globales pour accès rapide
let globalOptionsManager = null;

/**
 * Fonction principale pour obtenir la langue courante
 * @returns {string} Code langue (ex: 'fr', 'en')
 */
export function GetPlayerCurrentLanguage() {
  if (globalOptionsManager) {
    return globalOptionsManager.getCurrentLanguage();
  }
  
  // Fallback si pas encore initialisé
  try {
    const lang = navigator.language.toLowerCase().split('-')[0];
    return ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko'].includes(lang) ? lang : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Fonction pour obtenir le volume courant
 * @returns {number} Volume effectif (0-100)
 */
export function GetPlayerCurrentVolume() {
  if (globalOptionsManager) {
    return globalOptionsManager.getEffectiveVolume();
  }
  return 50; // Fallback
}

/**
 * Fonction pour vérifier si audio muté
 * @returns {boolean}
 */
export function IsPlayerAudioMuted() {
  if (globalOptionsManager) {
    return globalOptionsManager.isMuted();
  }
  return false; // Fallback
}

/**
 * Initialiser l'accès global (appelé par le module)
 */
export function initializeGlobalOptionsAPI(optionsManager) {
  globalOptionsManager = optionsManager;
  
  // Exposer globalement pour compatibilité
  window.GetPlayerCurrentLanguage = GetPlayerCurrentLanguage;
  window.GetPlayerCurrentVolume = GetPlayerCurrentVolume;
  window.IsPlayerAudioMuted = IsPlayerAudioMuted;
  
  console.log('🌐 [OptionsAPI] API globale initialisée');
}

export default OptionsManager;

console.log(`
⚙️ === OPTIONS MANAGER ===

✅ FONCTIONNALITÉS:
• Volume 1-100 + mute avec validation
• Détection langue navigateur automatique
• Sauvegarde localStorage avec debounce
• Support 8 langues avec drapeaux
• Application temps réel (Phaser, HTML audio)

🌐 API SIMPLE:
• GetPlayerCurrentLanguage() → 'fr', 'en', etc.
• GetPlayerCurrentVolume() → 0-100
• IsPlayerAudioMuted() → true/false

📊 MÉTHODES PRINCIPALES:
• setVolume(50) / getVolume()
• setMuted(true) / toggleMute()
• setLanguage('fr') / getCurrentLanguage()
• resetToDefaults() / exportOptions()

🔊 INTÉGRATIONS:
• Phaser: game.sound.volume
• HTML: audio/video elements
• Howler.js si disponible

💾 PERSISTANCE:
• localStorage 'pokemmo_options'
• Validation + fallbacks
• Debounce 300ms

🎯 PRÊT POUR LES AUTRES COMPOSANTS !
`);
