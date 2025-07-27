// Options/OptionsManager.js - Business Logic Options
// 🎯 Gère UNIQUEMENT la logique métier des options, pas l'UI
// 🔊 Volume, langue, préférences utilisateur

export class OptionsManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === ÉTAT OPTIONS ===
    this.options = {
      // Audio
      masterVolume: 50,        // 0-100
      musicVolume: 50,         // 0-100
      sfxVolume: 50,           // 0-100
      isMuted: false,
      
      // Langue
      language: 'auto',        // 'auto' ou code langue (fr, en, es, etc.)
      detectedLanguage: 'en',  // Langue détectée du navigateur
      availableLanguages: ['en', 'fr', 'es', 'de', 'it'],
      
      // Interface
      uiScale: 100,           // 50-150%
      showFPS: false,
      autoCloseMenus: true,
      
      // Gameplay  
      autoRun: false,
      battleAnimations: true,
      fastText: false,
      
      // Accessibility
      highContrast: false,
      screenReader: false
    };
    
    // === CALLBACKS ===
    this.onOptionsUpdate = null;      // Appelé quand options changent
    this.onVolumeChange = null;       // Appelé quand volume change
    this.onLanguageChange = null;     // Appelé quand langue change
    
    // === ÉTAT ===
    this.initialized = false;
    this.lastSaveTime = 0;
    this.autoSaveInterval = null;
    
    console.log('⚙️ [OptionsManager] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [OptionsManager] Initialisation...');
      
      // Détecter langue navigateur
      this.detectBrowserLanguage();
      
      // Charger options sauvegardées
      this.loadOptions();
      
      // Appliquer options
      this.applyAllOptions();
      
      // Démarrer sauvegarde automatique
      this.startAutoSave();
      
      this.initialized = true;
      
      console.log('✅ [OptionsManager] Initialisé');
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🌐 GESTION LANGUE ===
  
  detectBrowserLanguage() {
    try {
      // Récupérer langue navigateur
      const browserLang = navigator.language || navigator.userLanguage || 'en';
      const langCode = browserLang.split('-')[0].toLowerCase();
      
      // Vérifier si supportée
      if (this.options.availableLanguages.includes(langCode)) {
        this.options.detectedLanguage = langCode;
        console.log(`🌐 [OptionsManager] Langue détectée: ${langCode}`);
      } else {
        this.options.detectedLanguage = 'en';
        console.log(`🌐 [OptionsManager] Langue non supportée (${langCode}), fallback EN`);
      }
      
      // Si auto, utiliser langue détectée
      if (this.options.language === 'auto') {
        this.setLanguage('auto');
      }
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur détection langue:', error);
      this.options.detectedLanguage = 'en';
    }
  }
  
  setLanguage(langCode) {
    const oldLanguage = this.getCurrentLanguage();
    
    this.options.language = langCode;
    const newLanguage = this.getCurrentLanguage();
    
    console.log(`🌐 [OptionsManager] Changement langue: ${oldLanguage} → ${newLanguage}`);
    
    // Appliquer changement
    this.applyLanguageChange(newLanguage);
    
    // Notifier changement
    if (this.onLanguageChange) {
      this.onLanguageChange(newLanguage, oldLanguage);
    }
    
    // Déclencher sauvegarde
    this.saveOptions();
    
    return true;
  }
  
  getCurrentLanguage() {
    return this.options.language === 'auto' ? 
           this.options.detectedLanguage : 
           this.options.language;
  }
  
  getLanguageName(langCode) {
    const names = {
      'auto': `Auto (${this.getLanguageName(this.options.detectedLanguage)})`,
      'en': 'English',
      'fr': 'Français', 
      'es': 'Español',
      'de': 'Deutsch',
      'it': 'Italiano'
    };
    
    return names[langCode] || langCode.toUpperCase();
  }
  
  // === 🔊 GESTION AUDIO ===
  
  setMasterVolume(volume) {
    volume = Math.max(0, Math.min(100, parseInt(volume)));
    const oldVolume = this.options.masterVolume;
    
    this.options.masterVolume = volume;
    this.options.isMuted = false; // Unmute si changement volume
    
    console.log(`🔊 [OptionsManager] Volume principal: ${oldVolume} → ${volume}`);
    
    this.applyVolumeChanges();
    this.notifyVolumeChange();
    this.saveOptions();
    
    return true;
  }
  
  setMusicVolume(volume) {
    volume = Math.max(0, Math.min(100, parseInt(volume)));
    this.options.musicVolume = volume;
    
    console.log(`🎵 [OptionsManager] Volume musique: ${volume}`);
    
    this.applyVolumeChanges();
    this.notifyVolumeChange();
    this.saveOptions();
    
    return true;
  }
  
  setSfxVolume(volume) {
    volume = Math.max(0, Math.min(100, parseInt(volume)));
    this.options.sfxVolume = volume;
    
    console.log(`🔊 [OptionsManager] Volume SFX: ${volume}`);
    
    this.applyVolumeChanges();
    this.notifyVolumeChange();
    this.saveOptions();
    
    return true;
  }
  
  toggleMute() {
    this.options.isMuted = !this.options.isMuted;
    
    console.log(`🔇 [OptionsManager] Mute: ${this.options.isMuted ? 'ON' : 'OFF'}`);
    
    this.applyVolumeChanges();
    this.notifyVolumeChange();
    this.saveOptions();
    
    return this.options.isMuted;
  }
  
  setMute(muted) {
    this.options.isMuted = Boolean(muted);
    
    this.applyVolumeChanges();
    this.notifyVolumeChange();
    this.saveOptions();
    
    return this.options.isMuted;
  }
  
  // === 🎮 AUTRES OPTIONS ===
  
  setUIScale(scale) {
    scale = Math.max(50, Math.min(150, parseInt(scale)));
    this.options.uiScale = scale;
    
    console.log(`📏 [OptionsManager] Échelle UI: ${scale}%`);
    
    this.applyUIScale();
    this.notifyOptionsUpdate();
    this.saveOptions();
    
    return true;
  }
  
  toggleOption(optionKey) {
    if (this.options.hasOwnProperty(optionKey) && typeof this.options[optionKey] === 'boolean') {
      this.options[optionKey] = !this.options[optionKey];
      
      console.log(`🔄 [OptionsManager] ${optionKey}: ${this.options[optionKey] ? 'ON' : 'OFF'}`);
      
      this.applySpecificOption(optionKey);
      this.notifyOptionsUpdate();
      this.saveOptions();
      
      return this.options[optionKey];
    }
    
    console.warn(`⚠️ [OptionsManager] Option invalide: ${optionKey}`);
    return false;
  }
  
  setOption(optionKey, value) {
    if (this.options.hasOwnProperty(optionKey)) {
      const oldValue = this.options[optionKey];
      this.options[optionKey] = value;
      
      console.log(`⚙️ [OptionsManager] ${optionKey}: ${oldValue} → ${value}`);
      
      this.applySpecificOption(optionKey);
      this.notifyOptionsUpdate();
      this.saveOptions();
      
      return true;
    }
    
    console.warn(`⚠️ [OptionsManager] Option inconnue: ${optionKey}`);
    return false;
  }
  
  // === 📤 APPLICATION DES OPTIONS ===
  
  applyAllOptions() {
    console.log('📤 [OptionsManager] Application de toutes les options...');
    
    this.applyVolumeChanges();
    this.applyLanguageChange(this.getCurrentLanguage());
    this.applyUIScale();
    this.applyGameplayOptions();
    this.applyAccessibilityOptions();
    
    console.log('✅ [OptionsManager] Options appliquées');
  }
  
  applyVolumeChanges() {
    try {
      const effectiveVolume = this.options.isMuted ? 0 : this.options.masterVolume / 100;
      const musicVolume = (this.options.musicVolume / 100) * effectiveVolume;
      const sfxVolume = (this.options.sfxVolume / 100) * effectiveVolume;
      
      // Appliquer aux systèmes audio du jeu
      if (window.game?.sound) {
        window.game.sound.volume = effectiveVolume;
      }
      
      // Audio HTML5
      document.querySelectorAll('audio').forEach(audio => {
        if (audio.classList.contains('music')) {
          audio.volume = musicVolume;
        } else {
          audio.volume = sfxVolume;
        }
      });
      
      console.log(`🔊 [OptionsManager] Volumes appliqués - Master: ${Math.round(effectiveVolume * 100)}%`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application volume:', error);
    }
  }
  
  applyLanguageChange(newLanguage) {
    try {
      // Déclencher rechargement des textes
      if (typeof window.loadLanguage === 'function') {
        window.loadLanguage(newLanguage);
      }
      
      // Événement global pour les autres systèmes
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: newLanguage }
      }));
      
      console.log(`🌐 [OptionsManager] Langue ${newLanguage} appliquée`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application langue:', error);
    }
  }
  
  applyUIScale() {
    try {
      const scale = this.options.uiScale / 100;
      document.documentElement.style.setProperty('--ui-scale', scale);
      
      console.log(`📏 [OptionsManager] Échelle UI ${this.options.uiScale}% appliquée`);
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application échelle UI:', error);
    }
  }
  
  applyGameplayOptions() {
    // Appliquer options gameplay
    Object.entries(this.options).forEach(([key, value]) => {
      if (['autoRun', 'battleAnimations', 'fastText'].includes(key)) {
        this.applySpecificOption(key);
      }
    });
  }
  
  applyAccessibilityOptions() {
    try {
      if (this.options.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
      
      if (this.options.screenReader) {
        document.body.setAttribute('aria-live', 'polite');
      } else {
        document.body.removeAttribute('aria-live');
      }
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur application accessibilité:', error);
    }
  }
  
  applySpecificOption(optionKey) {
    const value = this.options[optionKey];
    
    try {
      switch (optionKey) {
        case 'showFPS':
          this.toggleFPSDisplay(value);
          break;
          
        case 'autoRun':
          window.dispatchEvent(new CustomEvent('autoRunChanged', { detail: value }));
          break;
          
        case 'battleAnimations':
          window.dispatchEvent(new CustomEvent('battleAnimationsChanged', { detail: value }));
          break;
          
        case 'fastText':
          window.dispatchEvent(new CustomEvent('fastTextChanged', { detail: value }));
          break;
          
        default:
          console.log(`⚙️ [OptionsManager] Option ${optionKey} = ${value} (pas d'action spécifique)`);
      }
      
    } catch (error) {
      console.error(`❌ [OptionsManager] Erreur application option ${optionKey}:`, error);
    }
  }
  
  toggleFPSDisplay(show) {
    try {
      if (show && window.game?.debug) {
        // Activer affichage FPS si disponible
        if (window.game.debug.showFPS) {
          window.game.debug.showFPS();
        }
      } else if (window.game?.debug?.hideFPS) {
        window.game.debug.hideFPS();
      }
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur affichage FPS:', error);
    }
  }
  
  // === 💾 SAUVEGARDE/CHARGEMENT ===
  
  saveOptions() {
    try {
      const dataToSave = {
        ...this.options,
        lastSaved: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem('pokemmo_options', JSON.stringify(dataToSave));
      this.lastSaveTime = Date.now();
      
      console.log('💾 [OptionsManager] Options sauvegardées');
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur sauvegarde:', error);
    }
  }
  
  loadOptions() {
    try {
      const saved = localStorage.getItem('pokemmo_options');
      
      if (saved) {
        const data = JSON.parse(saved);
        
        // Merge avec options par défaut (pour nouvelles options)
        this.options = {
          ...this.options,
          ...data
        };
        
        console.log('📂 [OptionsManager] Options chargées');
      } else {
        console.log('📂 [OptionsManager] Aucune sauvegarde trouvée, options par défaut');
      }
      
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur chargement, reset options:', error);
      this.resetToDefaults();
    }
  }
  
  resetToDefaults() {
    console.log('🔄 [OptionsManager] Reset options par défaut...');
    
    const language = this.options.language;
    const detectedLanguage = this.options.detectedLanguage;
    
    this.options = {
      masterVolume: 50,
      musicVolume: 50,
      sfxVolume: 50,
      isMuted: false,
      language: language,
      detectedLanguage: detectedLanguage,
      availableLanguages: ['en', 'fr', 'es', 'de', 'it'],
      uiScale: 100,
      showFPS: false,
      autoCloseMenus: true,
      autoRun: false,
      battleAnimations: true,
      fastText: false,
      highContrast: false,
      screenReader: false
    };
    
    this.applyAllOptions();
    this.saveOptions();
    this.notifyOptionsUpdate();
    
    console.log('✅ [OptionsManager] Reset terminé');
  }
  
  startAutoSave() {
    // Sauvegarde automatique toutes les 30 secondes
    this.autoSaveInterval = setInterval(() => {
      if (Date.now() - this.lastSaveTime > 30000) { // Si pas sauvé depuis 30s
        this.saveOptions();
      }
    }, 30000);
    
    console.log('⏰ [OptionsManager] Auto-save démarré');
  }
  
  // === 📞 NOTIFICATIONS ===
  
  notifyVolumeChange() {
    if (this.onVolumeChange) {
      this.onVolumeChange({
        masterVolume: this.options.masterVolume,
        musicVolume: this.options.musicVolume,
        sfxVolume: this.options.sfxVolume,
        isMuted: this.options.isMuted
      });
    }
  }
  
  notifyOptionsUpdate() {
    if (this.onOptionsUpdate) {
      this.onOptionsUpdate({ ...this.options });
    }
  }
  
  // === 📖 GETTERS (LECTURE SEULE) ===
  
  getAllOptions() {
    return { ...this.options }; // Copie pour éviter mutations
  }
  
  getOption(key) {
    return this.options[key];
  }
  
  getVolumeSettings() {
    return {
      masterVolume: this.options.masterVolume,
      musicVolume: this.options.musicVolume,
      sfxVolume: this.options.sfxVolume,
      isMuted: this.options.isMuted
    };
  }
  
  getLanguageSettings() {
    return {
      current: this.getCurrentLanguage(),
      selected: this.options.language,
      detected: this.options.detectedLanguage,
      available: [...this.options.availableLanguages]
    };
  }
  
  getUISettings() {
    return {
      scale: this.options.uiScale,
      showFPS: this.options.showFPS,
      autoCloseMenus: this.options.autoCloseMenus,
      highContrast: this.options.highContrast
    };
  }
  
  getGameplaySettings() {
    return {
      autoRun: this.options.autoRun,
      battleAnimations: this.options.battleAnimations,
      fastText: this.options.fastText
    };
  }
  
  // === 🎯 MÉTHODES UTILITAIRES ===
  
  exportOptions() {
    return {
      ...this.options,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }
  
  importOptions(optionsData) {
    try {
      if (optionsData && typeof optionsData === 'object') {
        this.options = {
          ...this.options,
          ...optionsData
        };
        
        this.applyAllOptions();
        this.saveOptions();
        this.notifyOptionsUpdate();
        
        console.log('📥 [OptionsManager] Options importées');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [OptionsManager] Erreur import:', error);
      return false;
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsManager] Destruction...');
    
    // Arrêter auto-save
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Sauvegarder une dernière fois
    this.saveOptions();
    
    // Reset callbacks
    this.onOptionsUpdate = null;
    this.onVolumeChange = null;
    this.onLanguageChange = null;
    
    // Reset état
    this.initialized = false;
    this.gameRoom = null;
    
    console.log('✅ [OptionsManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.initialized,
      currentLanguage: this.getCurrentLanguage(),
      detectedLanguage: this.options.detectedLanguage,
      volumeSettings: this.getVolumeSettings(),
      hasCallbacks: {
        onOptionsUpdate: !!this.onOptionsUpdate,
        onVolumeChange: !!this.onVolumeChange,
        onLanguageChange: !!this.onLanguageChange
      },
      lastSaveTime: this.lastSaveTime,
      autoSaveActive: !!this.autoSaveInterval,
      optionsSummary: {
        masterVolume: this.options.masterVolume,
        language: this.options.language,
        uiScale: this.options.uiScale,
        totalOptions: Object.keys(this.options).length
      }
    };
  }
}

export default OptionsManager;

console.log(`
⚙️ === OPTIONS MANAGER ===

✅ FONCTIONNALITÉS:
• Volume Master/Music/SFX (0-100)
• Mute/Unmute avec sauvegarde
• Détection automatique langue navigateur
• Choix manuel de langue
• Échelle UI (50-150%)
• Options gameplay (autoRun, animations, etc.)
• Options accessibilité (contraste, lecteur d'écran)

🔊 GESTION AUDIO:
• setMasterVolume(volume) → 0-100
• setMusicVolume(volume) → 0-100  
• setSfxVolume(volume) → 0-100
• toggleMute() → true/false
• Application automatique aux éléments audio

🌐 GESTION LANGUE:
• Détection navigateur automatique
• Mode 'auto' ou choix manuel
• Support EN/FR/ES/DE/IT
• Événements changement langue

💾 PERSISTANCE:
• Sauvegarde localStorage automatique
• Chargement au démarrage
• Auto-save toutes les 30s
• Export/Import options

🔗 CALLBACKS:
• onOptionsUpdate(options) → toutes options
• onVolumeChange(volumes) → changements audio
• onLanguageChange(new, old) → changements langue

🎯 PRÊT POUR OPTIONSICON !
`);
