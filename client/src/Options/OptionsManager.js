// Options/OptionsManager.js - Business Logic Options avec Event Dispatcher

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
    
    // === 🔥 EVENT DISPATCHER POUR LANGUE ===
    this.languageListeners = [];     // Listeners pour changements langue
    this.volumeListeners = [];       // Listeners pour changements volume
    
    // === ÉTAT ===
    this.initialized = false;
    this.saveTimeout = null;
    
    console.log('⚙️ [OptionsManager] Instance créée avec Event Dispatcher');
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
  
  // === 🎯 EVENT DISPATCHER - LANGUE ===
  
  /**
   * Ajouter un listener pour les changements de langue
   * @param {function} callback - Fonction appelée avec (newLang, oldLang)
   * @returns {function} Fonction de cleanup pour supprimer le listener
   */
  addLanguageListener(callback) {
    if (typeof callback !== 'function') {
      console.warn('⚠️ [OptionsManager] Language listener doit être une fonction');
      return () => {};
    }
    
    this.languageListeners.push(callback);
    console.log(`📡 [OptionsManager] Language listener ajouté (total: ${this.languageListeners.length})`);
    
    // Retourner fonction cleanup (pattern React useEffect)
    return () => {
      const index = this.languageListeners.indexOf(callback);
      if (index > -1) {
        this.languageListeners.splice(index, 1);
        console.log(`🧹 [OptionsManager] Language listener supprimé (restant: ${this.languageListeners.length})`);
      }
    };
  }
  
  /**
   * Supprimer un listener de langue spécifique
   */
  removeLanguageListener(callback) {
    const index = this.languageListeners.indexOf(callback);
    if (index > -1) {
      this.languageListeners.splice(index, 1);
      console.log(`🧹 [OptionsManager] Language listener supprimé`);
      return true;
    }
    return false;
  }
  
  /**
   * Notifier tous les listeners de changement de langue
   */
  notifyLanguageListeners(newLang, oldLang) {
    if (this.languageListeners.length === 0) return;
    
    console.log(`📢 [OptionsManager] Notification changement langue: ${oldLang} → ${newLang} (${this.languageListeners.length} listeners)`);
    
    this.languageListeners.forEach((listener, index) => {
      try {
        listener(newLang, oldLang);
      } catch (error) {
        console.error(`❌ [OptionsManager] Erreur listener langue #${index}:`, error);
      }
    });
  }
  
  // === 🔊 EVENT DISPATCHER - VOLUME ===
  
  /**
   * Ajouter un listener pour les changements de volume
   * @param {function} callback - Fonction appelée avec (volume, isMuted)
   * @returns {function} Fonction de cleanup
   */
  addVolumeListener(callback) {
    if (typeof callback !== 'function') {
      console.warn('⚠️ [OptionsManager] Volume listener doit être une fonction');
      return () => {};
    }
    
    this.volumeListeners.push(callback);
    console.log(`📡 [OptionsManager] Volume listener ajouté (total: ${this.volumeListeners.length})`);
    
    return () => {
      const index = this.volumeListeners.indexOf(callback);
      if (index > -1) {
        this.volumeListeners.splice(index, 1);
        console.log(`🧹 [OptionsManager] Volume listener supprimé (restant: ${this.volumeListeners.length})`);
      }
    };
  }
  
  /**
   * Notifier tous les listeners de changement de volume
   */
  notifyVolumeListeners(volume, isMuted) {
    if (this.volumeListeners.length === 0) return;
    
    console.log(`📢 [OptionsManager] Notification changement volume: ${volume}% (muted: ${isMuted}) (${this.volumeListeners.length} listeners)`);
    
    this.volumeListeners.forEach((listener, index) => {
      try {
        listener(volume, isMuted);
      } catch (error) {
        console.error(`❌ [OptionsManager] Erreur listener volume #${index}:`, error);
      }
    });
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
    const oldVolume = this.options.volume;
    
    if (validVolume !== oldVolume) {
      this.options.volume = validVolume;
      
      console.log(`🔊 [OptionsManager] Volume: ${validVolume}%`);
      
      // Appliquer le volume
      this.applyVolumeSettings();
      
      // 🔥 Notifier listeners AVANT callbacks legacy
      this.notifyVolumeListeners(validVolume, this.options.isMuted);
      
      // Notifier changement (legacy)
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
    const wasMuted = this.options.isMuted;
    
    if (isMuted !== wasMuted) {
      this.options.isMuted = isMuted;
      
      console.log(`🔇 [OptionsManager] Mute: ${isMuted}`);
      
      // Appliquer les paramètres audio
      this.applyVolumeSettings();
      
      // 🔥 Notifier listeners AVANT callbacks legacy
      this.notifyVolumeListeners(this.options.volume, isMuted);
      
      // Notifier changement (legacy)
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
    
    const oldLanguage = this.options.language;
    const oldCurrentLanguage = this.getCurrentLanguage();
    
    if (validLanguage !== oldLanguage) {
      this.options.language = validLanguage;
      
      const newCurrentLanguage = this.getCurrentLanguage();
      
      console.log(`🌐 [OptionsManager] Langue: ${validLanguage} (effective: ${oldCurrentLanguage} → ${newCurrentLanguage})`);
      
      // 🔥 Notifier listeners AVANT callbacks legacy
      this.notifyLanguageListeners(newCurrentLanguage, oldCurrentLanguage);
      
      // Notifier changement (legacy)
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
  
  // === 📢 NOTIFICATIONS (Legacy callbacks) ===
  
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
    
    const oldLanguage = this.getCurrentLanguage();
    const oldVolume = this.options.volume;
    const oldMuted = this.options.isMuted;
    
    this.options = {
      volume: 50,
      isMuted: false,
      language: 'auto',
      detectedLanguage: this.options.detectedLanguage // Garder la détection
    };
    
    const newLanguage = this.getCurrentLanguage();
    
    this.applyOptions();
    this.saveOptions();
    
    // 🔥 Notifier les listeners des changements
    if (newLanguage !== oldLanguage) {
      this.notifyLanguageListeners(newLanguage, oldLanguage);
    }
    
    if (this.options.volume !== oldVolume || this.options.isMuted !== oldMuted) {
      this.notifyVolumeListeners(this.options.volume, this.options.isMuted);
    }
    
    // Notifier tous les changements (legacy)
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
  
  // === 📊 INFO DEBUG EVENT DISPATCHER ===
  
  getListenersInfo() {
    return {
      languageListeners: this.languageListeners.length,
      volumeListeners: this.volumeListeners.length,
      totalListeners: this.languageListeners.length + this.volumeListeners.length
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsManager] Destruction...');
    
    // Sauvegarder avant destruction
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveOptions();
    }
    
    // 🔥 Nettoyer tous les listeners
    console.log(`🧹 [OptionsManager] Nettoyage ${this.languageListeners.length} language listeners`);
    console.log(`🧹 [OptionsManager] Nettoyage ${this.volumeListeners.length} volume listeners`);
    
    this.languageListeners = [];
    this.volumeListeners = [];
    
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
      },
      // 🔥 Info Event Dispatcher
      eventDispatcher: this.getListenersInfo()
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
