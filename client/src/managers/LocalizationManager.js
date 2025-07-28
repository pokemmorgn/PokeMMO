// managers/LocalizationManager.js - Gestionnaire de traductions UI
// 🌐 Charge et gère les traductions depuis ui-translations.json
// 🎯 Simple, efficace, avec cache et fallbacks

export class LocalizationManager {
  constructor() {
    // === CACHE ===
    this.translations = null;           // Cache du fichier JSON complet
    this.isLoading = false;            // Éviter double chargement
    this.loadPromise = null;           // Promise de chargement en cours
    
    // === CONFIGURATION ===
    this.fallbackLanguage = 'en';     // Langue de secours
    this.translationsPath = '/localization/ui-translations.json';
    
    // === ÉTAT ===
    this.isReady = false;              // Traductions chargées
    this.lastError = null;             // Dernière erreur
    
    console.log('🌐 [LocalizationManager] Instance créée');
  }
  
  // === 🚀 CHARGEMENT ===
  
  /**
   * Charger le fichier de traductions
   * @returns {Promise<boolean>} Succès du chargement
   */
  async load() {
    // Si déjà chargé, retourner succès
    if (this.isReady && this.translations) {
      console.log('✅ [LocalizationManager] Traductions déjà chargées');
      return true;
    }
    
    // Si chargement en cours, attendre la promise existante
    if (this.isLoading && this.loadPromise) {
      console.log('⏳ [LocalizationManager] Chargement en cours, attente...');
      return await this.loadPromise;
    }
    
    // Commencer nouveau chargement
    this.isLoading = true;
    this.loadPromise = this._loadTranslations();
    
    const result = await this.loadPromise;
    this.isLoading = false;
    this.loadPromise = null;
    
    return result;
  }
  
  /**
   * Chargement interne des traductions
   */
  async _loadTranslations() {
    try {
      console.log('🔄 [LocalizationManager] Chargement traductions depuis:', this.translationsPath);
      
      const response = await fetch(this.translationsPath);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.translations = await response.json();
      
      // Validation basique
      if (!this.translations || typeof this.translations !== 'object') {
        throw new Error('Format de traductions invalide');
      }
      
      // Vérifier que la langue de fallback existe
      if (!this.translations[this.fallbackLanguage]) {
        console.warn(`⚠️ [LocalizationManager] Langue de fallback "${this.fallbackLanguage}" manquante`);
      }
      
      this.isReady = true;
      this.lastError = null;
      
      const languages = Object.keys(this.translations);
      console.log(`✅ [LocalizationManager] Traductions chargées: ${languages.length} langues`, languages);
      
      return true;
      
    } catch (error) {
      console.error('❌ [LocalizationManager] Erreur chargement traductions:', error);
      
      this.lastError = error;
      this.isReady = false;
      this.translations = null;
      
      return false;
    }
  }
  
  // === 🔍 TRADUCTION ===
  
  /**
   * Obtenir une traduction
   * @param {string} path - Chemin de la traduction (ex: "quest.label")
   * @param {string} lang - Code langue (optionnel, auto-détecté si absent)
   * @returns {string} Texte traduit ou path si non trouvé
   */
  t(path, lang = null) {
    // Si pas encore chargé, retourner le path
    if (!this.isReady || !this.translations) {
      console.warn(`⚠️ [LocalizationManager] Traductions pas chargées pour: ${path}`);
      return path;
    }
    
    const currentLang = lang || this.getCurrentLanguage();
    
    // Obtenir traduction dans la langue demandée
    let translation = this.getTranslationByPath(path, currentLang);
    
    // Fallback sur langue de secours si pas trouvé
    if (translation === null && currentLang !== this.fallbackLanguage) {
      translation = this.getTranslationByPath(path, this.fallbackLanguage);
      
      if (translation !== null) {
        console.warn(`⚠️ [LocalizationManager] Fallback ${this.fallbackLanguage} pour: ${path} (manquant en ${currentLang})`);
      }
    }
    
    // Fallback ultime: retourner le path
    if (translation === null) {
      console.warn(`⚠️ [LocalizationManager] Traduction manquante: ${path} (${currentLang})`);
      return path;
    }
    
    return translation;
  }
  
  /**
   * Obtenir traduction par chemin dans une langue spécifique
   * @param {string} path - Chemin (ex: "quest.label")
   * @param {string} lang - Code langue
   * @returns {string|null} Traduction ou null si non trouvée
   */
  getTranslationByPath(path, lang) {
    const langData = this.translations[lang];
    if (!langData) {
      return null;
    }
    
    const keys = path.split('.');
    let result = langData;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return null;
      }
    }
    
    return typeof result === 'string' ? result : null;
  }
  
  // === 🌐 LANGUE COURANTE ===
  
  /**
   * Obtenir la langue courante du joueur
   * @returns {string} Code langue (ex: 'fr', 'en')
   */
  getCurrentLanguage() {
    // Méthode 1: API globale (déjà définie par OptionsManager)
    if (typeof window.GetPlayerCurrentLanguage === 'function') {
      return window.GetPlayerCurrentLanguage();
    }
    
    // Méthode 2: OptionsManager global
    if (window.optionsSystem && typeof window.optionsSystem.getCurrentLanguage === 'function') {
      return window.optionsSystem.getCurrentLanguage();
    }
    
    // Méthode 3: Détection navigateur basique
    try {
      const browserLang = navigator.language.toLowerCase().split('-')[0];
      const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko'];
      
      if (supportedLanguages.includes(browserLang)) {
        return browserLang;
      }
    } catch (error) {
      console.warn('⚠️ [LocalizationManager] Erreur détection langue navigateur:', error);
    }
    
    // Fallback ultime
    return this.fallbackLanguage;
  }
  
  // === 📊 UTILITAIRES ===
  
  /**
   * Vérifier si une langue est supportée
   * @param {string} lang - Code langue
   * @returns {boolean}
   */
  isLanguageSupported(lang) {
    return this.isReady && this.translations && (lang in this.translations);
  }
  
  /**
   * Obtenir la liste des langues disponibles
   * @returns {string[]} Codes langues
   */
  getAvailableLanguages() {
    if (!this.isReady || !this.translations) {
      return [];
    }
    return Object.keys(this.translations);
  }
  
  /**
   * Obtenir toutes les traductions pour une langue
   * @param {string} lang - Code langue
   * @returns {object|null} Objet traductions ou null
   */
  getLanguageData(lang) {
    if (!this.isReady || !this.translations) {
      return null;
    }
    return this.translations[lang] || null;
  }
  
  /**
   * Vérifier si une traduction existe
   * @param {string} path - Chemin traduction
   * @param {string} lang - Code langue (optionnel)
   * @returns {boolean}
   */
  hasTranslation(path, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    const translation = this.getTranslationByPath(path, currentLang);
    return translation !== null;
  }
  
  // === 🔄 RECHARGEMENT ===
  
  /**
   * Force le rechargement des traductions
   * @returns {Promise<boolean>}
   */
  async reload() {
    console.log('🔄 [LocalizationManager] Rechargement forcé...');
    
    this.translations = null;
    this.isReady = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.lastError = null;
    
    return await this.load();
  }
  
  // === 🐛 DEBUG ===
  
  /**
   * Informations de debug
   * @returns {object}
   */
  getDebugInfo() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      hasTranslations: !!this.translations,
      currentLanguage: this.getCurrentLanguage(),
      availableLanguages: this.getAvailableLanguages(),
      fallbackLanguage: this.fallbackLanguage,
      translationsPath: this.translationsPath,
      lastError: this.lastError?.message || null,
      sampleTranslation: this.isReady ? this.t('quest.label') : null
    };
  }
  
  /**
   * Test de toutes les traductions d'une section
   * @param {string} section - Section à tester (ex: 'quest')
   * @param {string} lang - Langue à tester (optionnel)
   */
  testSection(section, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    if (!this.isReady) {
      console.warn('⚠️ [LocalizationManager] Traductions pas chargées pour test');
      return;
    }
    
    const sectionData = this.getTranslationByPath(section, currentLang);
    if (!sectionData || typeof sectionData !== 'object') {
      console.warn(`⚠️ [LocalizationManager] Section "${section}" non trouvée en ${currentLang}`);
      return;
    }
    
    console.log(`🧪 [LocalizationManager] Test section "${section}" en ${currentLang}:`);
    
    const testResults = {};
    for (const key in sectionData) {
      const path = `${section}.${key}`;
      const translation = this.t(path, currentLang);
      testResults[key] = translation;
      console.log(`  ${key}: "${translation}"`);
    }
    
    return testResults;
  }
}

// === 🌐 INSTANCE GLOBALE ===

/**
 * Instance globale du LocalizationManager
 * Permet un accès facile depuis n'importe où
 */
let globalLocalizationManager = null;

/**
 * Obtenir l'instance globale (singleton)
 * @returns {LocalizationManager}
 */
export function getLocalizationManager() {
  if (!globalLocalizationManager) {
    globalLocalizationManager = new LocalizationManager();
  }
  return globalLocalizationManager;
}

/**
 * Initialiser et charger les traductions
 * @returns {Promise<LocalizationManager>}
 */
export async function initLocalizationManager() {
  const manager = getLocalizationManager();
  
  const success = await manager.load();
  if (!success) {
    console.error('❌ [LocalizationManager] Échec initialisation traductions');
  }
  
  // Exposer globalement pour debug
  window.localizationManager = manager;
  
  return manager;
}

/**
 * Raccourci global pour traduction
 * @param {string} path - Chemin traduction
 * @param {string} lang - Langue (optionnel)
 * @returns {string}
 */
export function t(path, lang = null) {
  const manager = getLocalizationManager();
  return manager.t(path, lang);
}

// === 📋 EXPORT PAR DÉFAUT ===

export default LocalizationManager;

console.log(`
🌐 === LOCALIZATION MANAGER ===

✅ FONCTIONNALITÉS:
• Chargement traductions depuis JSON
• Cache intelligent avec promise
• Fallback anglais automatique
• Détection langue courante
• API simple: t('quest.label')

🔧 USAGE:
• import { t, initLocalizationManager } from './managers/LocalizationManager.js'
• await initLocalizationManager()
• const text = t('quest.label') // → "Quests" ou "Quêtes"

📊 DEBUG:
• window.localizationManager.getDebugInfo()
• window.localizationManager.testSection('quest')

🎯 PRÊT POUR INTÉGRATION DANS LES ICÔNES !
`);
