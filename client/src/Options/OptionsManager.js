// Options/OptionsManager.js - Logique métier du système d'options
// 🧠 Gestion paramètres audio + langue + thème
// 💾 Sauvegarde localStorage + API globale

export class OptionsManager {
  constructor(gameRoom, options = {}) {
    this.gameRoom = gameRoom;
    this.options = {
      storageKey: 'game_settings',
      autoSave: true,
      autoApply: true,
      ...options
    };
    
    // === ÉTAT ===
    this.isInitialized = false;
    this.isDirty = false;
    
    // === PARAMÈTRES PAR DÉFAUT ===
    this.defaultSettings = {
      audio: {
        musicVolume: 0.8,
        soundVolume: 0.8,
        muted: false
      },
      language: {
        mode: 'auto',        // 'auto' ou 'manual'
        selected: 'auto',    // Code langue ou 'auto'
        detected: 'en',      // Langue détectée automatiquement
        available: ['en', 'fr', 'es', 'de', 'it', 'pt']
      },
      display: {
        theme: 'dark'        // 'dark', 'light', 'auto'
      }
    };
    
    // === PARAMÈTRES ACTUELS ===
    this.currentSettings = { ...this.defaultSettings };
    
    // === RÉFÉRENCES ===
    this.module = null;
    this.ui = null;
    
    // === CALLBACKS ===
    this.onSettingsChange = options.onSettingsChange || (() => {});
    this.onLanguageChange = options.onLanguageChange || (() => {});
    this.onAudioChange = options.onAudioChange || (() => {});
    
    console.log('🧠 [OptionsManager] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [OptionsManager] Initialisation...');
      
      // 1. Détecter langue navigateur
      this.detectBrowserLanguage();
      
      // 2. Charger paramètres sauvegardés
      this.loadSettings();
      
      // 3. Appliquer paramètres initiaux
      this.applyAllSettings();
      
      // 4. Setup API globale
      this.setupGlobalAPI();
      
      this.isInitialized = true;
      console.log('✅ [OptionsManager] Initialisé avec paramètres:', this.currentSettings);
      
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🌍 DÉTECTION LANGUE ===
  
  detectBrowserLanguage() {
    try {
      console.log('🌍 [OptionsManager] Détection langue navigateur...');
      
      // Récupérer langues du navigateur par priorité
      const languages = navigator.languages || [navigator.language || navigator.userLanguage || 'en'];
      
      console.log('🔍 [OptionsManager] Langues navigateur:', languages);
      
      // Trouver la première langue supportée
      for (const lang of languages) {
        const langCode = lang.toLowerCase().split('-')[0]; // 'fr-FR' → 'fr'
        
        if (this.currentSettings.language.available.includes(langCode)) {
          this.currentSettings.language.detected = langCode;
          console.log(`✅ [OptionsManager] Langue détectée: ${langCode}`);
          return langCode;
        }
      }
      
      // Fallback vers anglais
      this.currentSettings.language.detected = 'en';
      console.log('🔄 [OptionsManager] Fallback vers anglais');
      return 'en';
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur détection langue:', error);
      this.currentSettings.language.detected = 'en';
      return 'en';
    }
  }
  
  // === 💾 GESTION LOCALSTORAGE ===
  
  loadSettings() {
    try {
      console.log('💾 [OptionsManager] Chargement paramètres...');
      
      const saved = localStorage.getItem(this.options.storageKey);
      
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        
        // Merge sécurisé avec paramètres par défaut
        this.currentSettings = this.mergeSettings(this.defaultSettings, parsedSettings);
        
        console.log('✅ [OptionsManager] Paramètres chargés:', this.currentSettings);
      } else {
        console.log('🆕 [OptionsManager] Premiers paramètres, utilisation par défaut');
      }
      
      // Marquer comme propre après chargement
      this.isDirty = false;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur chargement paramètres:', error);
      this.currentSettings = { ...this.defaultSettings };
    }
  }
  
  saveSettings() {
    try {
      console.log('💾 [OptionsManager] Sauvegarde paramètres...');
      
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.currentSettings));
      this.isDirty = false;
      
      console.log('✅ [OptionsManager] Paramètres sauvegardés');
      return true;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur sauvegarde:', error);
      return false;
    }
  }
  
  mergeSettings(defaults, saved) {
    const merged = JSON.parse(JSON.stringify(defaults)); // Deep clone
    
    // Merge audio
    if (saved.audio) {
      merged.audio = { ...merged.audio, ...saved.audio };
    }
    
    // Merge language (garder détection actuelle)
    if (saved.language) {
      merged.language = { 
        ...merged.language, 
        ...saved.language,
        detected: merged.language.detected, // Garder détection fraîche
        available: merged.language.available // Garder liste à jour
      };
    }
    
    // Merge display
    if (saved.display) {
      merged.display = { ...merged.display, ...saved.display };
    }
    
    return merged;
  }
  
  // === 🎵 GESTION AUDIO ===
  
  applyAudioSettings() {
    try {
      console.log('🎵 [OptionsManager] Application paramètres audio...');
      
      const { musicVolume, soundVolume, muted } = this.currentSettings.audio;
      
      // 1. Appliquer à Phaser si disponible
      if (this.gameRoom?.scene?.sound) {
        this.gameRoom.scene.sound.volume = muted ? 0 : musicVolume;
        console.log(`🎮 [OptionsManager] Volume Phaser: ${muted ? 0 : musicVolume}`);
      }
      
      // 2. Appliquer aux éléments HTML5 audio
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        const volume = audio.classList.contains('music') ? musicVolume : soundVolume;
        audio.volume = muted ? 0 : volume;
      });
      
      if (audioElements.length > 0) {
        console.log(`🔊 [OptionsManager] ${audioElements.length} éléments audio mis à jour`);
      }
      
      // 3. API globale pour autres systèmes
      if (typeof window.setGameVolume === 'function') {
        window.setGameVolume({
          music: muted ? 0 : musicVolume,
          sound: muted ? 0 : soundVolume,
          muted: muted
        });
        console.log('🌐 [OptionsManager] API globale volume notifiée');
      }
      
      // 4. Callback spécifique
      this.onAudioChange(this.currentSettings.audio);
      
      console.log('✅ [OptionsManager] Paramètres audio appliqués');
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application audio:', error);
    }
  }
  
  // === 🌍 GESTION LANGUE ===
  
  getCurrentLanguage() {
    if (this.currentSettings.language.mode === 'auto') {
      return this.currentSettings.language.detected;
    } else {
      return this.currentSettings.language.selected;
    }
  }
  
  setLanguage(langCode, manual = false) {
    console.log(`🌍 [OptionsManager] Changement langue: ${langCode} (manuel: ${manual})`);
    
    if (manual) {
      this.currentSettings.language.mode = 'manual';
      this.currentSettings.language.selected = langCode;
    } else {
      this.currentSettings.language.mode = 'auto';
      this.currentSettings.language.detected = langCode;
    }
    
    this.markDirty();
    this.notifyLanguageChange();
    
    if (this.options.autoSave) {
      this.saveSettings();
    }
    
    console.log(`✅ [OptionsManager] Langue changée: ${this.getCurrentLanguage()}`);
    return true;
  }
  
  notifyLanguageChange() {
    const currentLang = this.getCurrentLanguage();
    
    console.log(`📡 [OptionsManager] Notification changement langue: ${currentLang}`);
    
    // 1. Événement global DOM
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: currentLang,
        mode: this.currentSettings.language.mode,
        detected: this.currentSettings.language.detected
      }
    }));
    
    // 2. Callback spécifique
    this.onLanguageChange({
      language: currentLang,
      mode: this.currentSettings.language.mode,
      detected: this.currentSettings.language.detected
    });
    
    // 3. Mettre à jour API globale
    this.updateGlobalLanguageAPI();
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
  
  testLanguage(langCode) {
    console.log('🧪 [OptionsManager] Test langue:', langCode);
    
    const testTexts = {
      'en': 'Hello! This is how English looks.',
      'fr': 'Bonjour ! Voici comment apparaît le français.',
      'es': '¡Hola! Así es como se ve el español.',
      'de': 'Hallo! So sieht Deutsch aus.',
      'it': 'Ciao! Ecco come appare l\'italiano.',
      'pt': 'Olá! É assim que o português aparece.'
    };
    
    const text = testTexts[langCode] || `Test language: ${langCode}`;
    
    // Afficher notification test
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(text, 'info', {
        duration: 3000,
        position: 'center'
      });
    } else {
      alert(text); // Fallback
    }
  }
  
  // === 🎨 GESTION THÈME ===
  
  applyTheme() {
    try {
      console.log('🎨 [OptionsManager] Application thème...');
      
      const theme = this.currentSettings.display.theme;
      
      // Appliquer classe CSS au body
      document.body.classList.remove('theme-dark', 'theme-light', 'theme-auto');
      document.body.classList.add(`theme-${theme}`);
      
      // API globale si disponible
      if (typeof window.setGameTheme === 'function') {
        window.setGameTheme(theme);
      }
      
      console.log(`✅ [OptionsManager] Thème appliqué: ${theme}`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application thème:', error);
    }
  }
  
  // === 🔧 GESTION PARAMÈTRES GÉNÉRAUX ===
  
  updateSettings(newSettings) {
    console.log('🔧 [OptionsManager] Mise à jour paramètres:', newSettings);
    
    // Merge profond
    this.currentSettings = this.mergeSettings(this.currentSettings, newSettings);
    this.markDirty();
    
    // Appliquer si auto-apply activé
    if (this.options.autoApply) {
      this.applyAllSettings();
    }
    
    // Callback général
    this.onSettingsChange(this.currentSettings);
    
    // Sauvegarder si auto-save activé
    if (this.options.autoSave) {
      this.saveSettings();
    }
    
    console.log('✅ [OptionsManager] Paramètres mis à jour');
  }
  
  applyAllSettings() {
    console.log('🔄 [OptionsManager] Application tous paramètres...');
    
    this.applyAudioSettings();
    this.applyTheme();
    this.notifyLanguageChange();
    
    console.log('✅ [OptionsManager] Tous paramètres appliqués');
  }
  
  resetToDefaults() {
    console.log('🔄 [OptionsManager] Reset paramètres par défaut...');
    
    // Garder la détection de langue actuelle
    const currentDetected = this.currentSettings.language.detected;
    
    this.currentSettings = {
      ...this.defaultSettings,
      language: {
        ...this.defaultSettings.language,
        detected: currentDetected
      }
    };
    
    this.markDirty();
    this.applyAllSettings();
    
    if (this.options.autoSave) {
      this.saveSettings();
    }
    
    // Mettre à jour UI si connectée
    if (this.ui && this.ui.setCurrentSettings) {
      this.ui.setCurrentSettings(this.currentSettings);
    }
    
    console.log('✅ [OptionsManager] Reset terminé');
    return this.currentSettings;
  }
  
  // === 📊 API PUBLIQUE ===
  
  getSettings() {
    return JSON.parse(JSON.stringify(this.currentSettings)); // Deep clone
  }
  
  getSetting(path) {
    const keys = path.split('.');
    let current = this.currentSettings;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }
  
  setSetting(path, value) {
    console.log(`🔧 [OptionsManager] Définir ${path} = ${value}`);
    
    const keys = path.split('.');
    let current = this.currentSettings;
    
    // Naviguer jusqu'au parent
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Définir la valeur
    current[keys[keys.length - 1]] = value;
    this.markDirty();
    
    // Appliquer selon le type
    if (path.startsWith('audio.')) {
      this.applyAudioSettings();
    } else if (path.startsWith('language.')) {
      this.notifyLanguageChange();
    } else if (path.startsWith('display.')) {
      this.applyTheme();
    }
    
    if (this.options.autoSave) {
      this.saveSettings();
    }
    
    return true;
  }
  
  isDirtySettings() {
    return this.isDirty;
  }
  
  markDirty() {
    this.isDirty = true;
    
    // Notifier l'icône qu'il y a des changements
    if (this.module && this.module.icon && this.module.icon.setHasChanges) {
      this.module.icon.setHasChanges(true);
    }
  }
  
  markClean() {
    this.isDirty = false;
    
    // Notifier l'icône que c'est propre
    if (this.module && this.module.icon && this.module.icon.setHasChanges) {
      this.module.icon.setHasChanges(false);
    }
  }
  
  // === 🌐 API GLOBALE ===
  
  setupGlobalAPI() {
    console.log('🌐 [OptionsManager] Setup API globale...');
    
    // API principale pour récupérer la langue
    window.getPlayerLanguage = () => {
      return this.getCurrentLanguage();
    };
    
    // API pour changer la langue
    window.setPlayerLanguage = (langCode, manual = true) => {
      return this.setLanguage(langCode, manual);
    };
    
    // API pour vérifier si options disponibles
    window.isOptionsModuleAvailable = () => {
      return this.isInitialized;
    };
    
    // API pour accéder aux paramètres
    window.getGameSettings = () => {
      return this.getSettings();
    };
    
    // API pour paramètres spécifiques
    window.getGameSetting = (path) => {
      return this.getSetting(path);
    };
    
    console.log('✅ [OptionsManager] API globale configurée');
  }
  
  updateGlobalLanguageAPI() {
    // S'assurer que l'API globale retourne la langue actuelle
    if (typeof window.getPlayerLanguage === 'function') {
      // Déjà configuré dans setupGlobalAPI
    }
  }
  
  // === 🔗 CONNEXIONS ===
  
  setModule(optionsModule) {
    this.module = optionsModule;
  }
  
  setUI(optionsUI) {
    this.ui = optionsUI;
    
    // Synchroniser paramètres actuels vers UI
    if (this.ui.setCurrentSettings) {
      this.ui.setCurrentSettings(this.currentSettings);
    }
  }
  
  // === 📡 COMMUNICATION SERVEUR ===
  
  async requestData() {
    // Pour l'instant les options sont purement locales
    // Cette méthode peut être étendue pour synchroniser avec le serveur
    console.log('📡 [OptionsManager] requestData - options locales seulement');
    return this.currentSettings;
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsManager] Destruction...');
    
    // Sauvegarder avant destruction
    if (this.isDirty && this.options.autoSave) {
      this.saveSettings();
    }
    
    // Nettoyer API globale
    if (typeof window.getPlayerLanguage !== 'undefined') {
      delete window.getPlayerLanguage;
    }
    if (typeof window.setPlayerLanguage !== 'undefined') {
      delete window.setPlayerLanguage;
    }
    if (typeof window.isOptionsModuleAvailable !== 'undefined') {
      delete window.isOptionsModuleAvailable;
    }
    if (typeof window.getGameSettings !== 'undefined') {
      delete window.getGameSettings;
    }
    if (typeof window.getGameSetting !== 'undefined') {
      delete window.getGameSetting;
    }
    
    // Reset état
    this.module = null;
    this.ui = null;
    this.isInitialized = false;
    this.isDirty = false;
    
    console.log('✅ [OptionsManager] Détruit');
  }
}

export default OptionsManager;
