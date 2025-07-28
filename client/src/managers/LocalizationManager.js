// managers/LocalizationManager.js - VERSION MODULAIRE
// 🌐 Gestionnaire de traductions modulaire avec fichiers séparés
// 🎯 Compatibilité totale avec l'API existante + chargement intelligent

export class LocalizationManager {
  constructor() {
    // === CACHE MODULAIRE ===
    this.translations = null;           // Cache fusionné final (comme avant)
    this.moduleTranslations = new Map(); // Cache par module
    this.isLoading = false;
    this.loadPromise = null;
    
    // === CONFIGURATION MODULAIRE ===
    this.fallbackLanguage = 'en';
    
    // 🔥 NOUVEAU : Configuration des modules
    this.moduleConfig = {
      // Modules obligatoires (toujours chargés)
      required: ['common'],
      
      // Modules optionnels (chargés si demandés ou auto-détectés)
      optional: ['quest', 'team', 'inventory', 'options', 'pokedex'],
      
      // Chemins des fichiers
      basePath: '/localization',
      
      // Stratégies de chargement
      loadingStrategy: {
        mode: 'smart', // 'all', 'smart', 'ondemand'
        detectModules: true, // Auto-détecter modules utilisés
        cacheModules: true,
        mergeStrategy: 'deep' // 'shallow', 'deep'
      }
    };
    
    // === ÉTAT ===
    this.isReady = false;
    this.lastError = null;
    this.loadedModules = new Set();
    this.failedModules = new Set();
    
    console.log('🌐 [LocalizationManager] Instance modulaire créée');
  }
  
  // === 🚀 CHARGEMENT INTELLIGENT ===
  
  /**
   * Charger les traductions (stratégie intelligente)
   * @param {object} options - Options de chargement
   * @returns {Promise<boolean>}
   */
  async load(options = {}) {
    // Si déjà chargé, retourner succès
    if (this.isReady && this.translations) {
      console.log('✅ [LocalizationManager] Traductions déjà chargées');
      return true;
    }
    
    // Si chargement en cours, attendre
    if (this.isLoading && this.loadPromise) {
      console.log('⏳ [LocalizationManager] Chargement en cours...');
      return await this.loadPromise;
    }
    
    // Démarrer nouveau chargement
    this.isLoading = true;
    this.loadPromise = this._loadTranslationsModular(options);
    
    const result = await this.loadPromise;
    this.isLoading = false;
    this.loadPromise = null;
    
    return result;
  }
  
  /**
   * Chargement modulaire intelligent
   */
  async _loadTranslationsModular(options = {}) {
    try {
      console.log('🔄 [LocalizationManager] Chargement modulaire...');
      
      const strategy = options.strategy || this.moduleConfig.loadingStrategy.mode;
      
      switch (strategy) {
        case 'all':
          return await this._loadAllModules();
          
        case 'smart':
          return await this._loadSmartModules();
          
        case 'ondemand':
          return await this._loadRequiredOnly();
          
        default:
          return await this._loadSmartModules();
      }
      
    } catch (error) {
      console.error('❌ [LocalizationManager] Erreur chargement modulaire:', error);
      return await this._fallbackToLegacy();
    }
  }
  
  // === 📁 STRATÉGIES DE CHARGEMENT ===
  
  /**
   * Stratégie SMART : Charger required + modules détectés
   */
  async _loadSmartModules() {
    console.log('🧠 [LocalizationManager] Stratégie SMART');
    
    // 1. Charger modules obligatoires
    const requiredModules = this.moduleConfig.required;
    
    // 2. Détecter modules utilisés automatiquement
    const detectedModules = this.moduleConfig.loadingStrategy.detectModules 
      ? this._detectUsedModules() 
      : [];
    
    // 3. Combiner et dédupliquer
    const modulesToLoad = [...new Set([...requiredModules, ...detectedModules])];
    
    console.log(`📦 [LocalizationManager] Modules à charger:`, modulesToLoad);
    
    // 4. Charger en parallèle
    const results = await this._loadModules(modulesToLoad);
    
    // 5. Fusionner les traductions
    this._mergeAllTranslations();
    
    // 6. Vérifier succès
    const success = this.loadedModules.size > 0;
    this.isReady = success;
    
    if (success) {
      console.log(`✅ [LocalizationManager] SMART chargé: ${this.loadedModules.size} modules`);
    }
    
    return success;
  }
  
  /**
   * Stratégie ALL : Charger tous les modules
   */
  async _loadAllModules() {
    console.log('🎯 [LocalizationManager] Stratégie ALL');
    
    const allModules = [...this.moduleConfig.required, ...this.moduleConfig.optional];
    
    const results = await this._loadModules(allModules);
    this._mergeAllTranslations();
    
    const success = this.loadedModules.size > 0;
    this.isReady = success;
    
    console.log(`✅ [LocalizationManager] ALL chargé: ${this.loadedModules.size}/${allModules.length} modules`);
    return success;
  }
  
  /**
   * Stratégie REQUIRED : Charger seulement les modules obligatoires
   */
  async _loadRequiredOnly() {
    console.log('⚡ [LocalizationManager] Stratégie REQUIRED ONLY');
    
    const results = await this._loadModules(this.moduleConfig.required);
    this._mergeAllTranslations();
    
    const success = this.loadedModules.size > 0;
    this.isReady = success;
    
    console.log(`✅ [LocalizationManager] REQUIRED chargé: ${this.loadedModules.size} modules`);
    return success;
  }
  
  // === 🔍 DÉTECTION AUTOMATIQUE ===
  
  /**
   * Détecter automatiquement les modules utilisés sur la page
   */
  _detectUsedModules() {
    const detectedModules = [];
    
    // Détecter par éléments DOM
    const domIndicators = {
      quest: ['#quest-icon', '.quest-journal', '[data-quest]', '#quest-tracker'],
      team: ['#team-icon', '.team-overlay', '[data-team]', '#team-manager'],
      inventory: ['#inventory-icon', '.inventory-overlay', '[data-inventory]'],
      options: ['#options-icon', '.options-overlay', '[data-options]'],
      pokedex: ['#pokedex-icon', '.pokedex-overlay', '[data-pokedex]']
    };
    
    Object.entries(domIndicators).forEach(([module, selectors]) => {
      const found = selectors.some(selector => document.querySelector(selector));
      if (found) {
        detectedModules.push(module);
        console.log(`🔍 [LocalizationManager] Module détecté: ${module}`);
      }
    });
    
    // Détecter par variables globales
    const globalIndicators = {
      quest: ['questSystem', 'questSystemGlobal', 'window.toggleQuest'],
      team: ['teamSystem', 'teamSystemGlobal', 'window.toggleTeam'],
      inventory: ['inventorySystem', 'inventorySystemGlobal'],
      options: ['optionsSystem', 'optionsSystemGlobal'],
      pokedex: ['pokedexSystem', 'pokedexSystemGlobal']
    };
    
    Object.entries(globalIndicators).forEach(([module, globals]) => {
      const found = globals.some(globalVar => {
        const parts = globalVar.split('.');
        let obj = window;
        for (const part of parts) {
          obj = obj?.[part];
          if (!obj) return false;
        }
        return true;
      });
      
      if (found && !detectedModules.includes(module)) {
        detectedModules.push(module);
        console.log(`🌐 [LocalizationManager] Module détecté (global): ${module}`);
      }
    });
    
    return detectedModules;
  }
  
  // === 📦 CHARGEMENT MODULES ===
  
  /**
   * Charger plusieurs modules en parallèle
   */
  async _loadModules(moduleNames) {
    const loadPromises = moduleNames.map(async (moduleName) => {
      try {
        const moduleData = await this._loadSingleModule(moduleName);
        if (moduleData) {
          this.moduleTranslations.set(moduleName, moduleData);
          this.loadedModules.add(moduleName);
          return { module: moduleName, success: true, data: moduleData };
        } else {
          throw new Error(`Données vides pour module ${moduleName}`);
        }
      } catch (error) {
        console.warn(`⚠️ [LocalizationManager] Échec module "${moduleName}":`, error.message);
        this.failedModules.add(moduleName);
        return { module: moduleName, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(loadPromises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`📊 [LocalizationManager] Résultats: ${successful.length} succès, ${failed.length} échecs`);
    
    return results;
  }
  
  /**
   * Charger un module individuel
   */
  async _loadSingleModule(moduleName) {
    const moduleFile = this._getModuleFilename(moduleName);
    const moduleUrl = `${this.moduleConfig.basePath}/${moduleFile}`;
    
    console.log(`📥 [LocalizationManager] Chargement: ${moduleUrl}`);
    
    const response = await fetch(moduleUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const moduleData = await response.json();
    
    if (!moduleData || typeof moduleData !== 'object') {
      throw new Error('Format invalide');
    }
    
    console.log(`✅ [LocalizationManager] Module "${moduleName}" chargé`);
    return moduleData;
  }
  
  /**
   * Obtenir le nom de fichier pour un module
   */
  _getModuleFilename(moduleName) {
    // Mapping personnalisé ou format standard
    const fileMapping = {
      common: 'modules/common-ui.json',
      quest: 'modules/quest-ui.json',
      team: 'modules/team-ui.json',
      inventory: 'modules/inventory-ui.json',
      options: 'modules/options-ui.json',
      pokedex: 'modules/pokedex-ui.json'
    };
    
    return fileMapping[moduleName] || `modules/${moduleName}-ui.json`;
  }
  
  // === 🔀 FUSION DES TRADUCTIONS ===
  
  /**
   * Fusionner toutes les traductions chargées
   */
  _mergeAllTranslations() {
    console.log('🔀 [LocalizationManager] Fusion des traductions...');
    
    this.translations = {};
    
    // Obtenir toutes les langues disponibles
    const allLanguages = new Set();
    this.moduleTranslations.forEach(moduleData => {
      Object.keys(moduleData).forEach(lang => allLanguages.add(lang));
    });
    
    // Fusionner pour chaque langue
    allLanguages.forEach(lang => {
      this.translations[lang] = {};
      
      // Fusionner chaque module pour cette langue
      this.moduleTranslations.forEach((moduleData, moduleName) => {
        if (moduleData[lang]) {
          this.translations[lang] = this._deepMerge(
            this.translations[lang], 
            moduleData[lang]
          );
        }
      });
    });
    
    const languages = Object.keys(this.translations);
    const totalKeys = Object.keys(this.translations[this.fallbackLanguage] || {}).length;
    
    console.log(`✅ [LocalizationManager] Fusion terminée: ${languages.length} langues, ~${totalKeys} clés`);
  }
  
  /**
   * Fusion profonde de deux objets
   */
  _deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }
  
  // === 🔄 FALLBACK HÉRITÉ ===
  
  /**
   * Fallback vers l'ancien système (ui-translations.json)
   */
  async _fallbackToLegacy() {
    console.log('🔄 [LocalizationManager] Fallback vers système hérité...');
    
    try {
      const response = await fetch('/localization/ui-translations.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.translations = await response.json();
      
      if (!this.translations || typeof this.translations !== 'object') {
        throw new Error('Format invalide');
      }
      
      this.isReady = true;
      this.lastError = null;
      
      console.log('✅ [LocalizationManager] Fallback hérité réussi');
      return true;
      
    } catch (error) {
      console.error('❌ [LocalizationManager] Fallback hérité échoué:', error);
      this.lastError = error;
      return false;
    }
  }
  
  // === 🎯 API PUBLIQUE (COMPATIBLE) ===
  
  /**
   * Obtenir une traduction (API inchangée)
   * @param {string} path - Chemin (ex: "quest.label")
   * @param {string} lang - Langue (optionnel)
   * @returns {string}
   */
  t(path, lang = null) {
    // ✅ API IDENTIQUE à l'ancienne version
    if (!this.isReady || !this.translations) {
      console.warn(`⚠️ [LocalizationManager] Pas prêt pour: ${path}`);
      return path;
    }
    
    const currentLang = lang || this.getCurrentLanguage();
    
    let translation = this.getTranslationByPath(path, currentLang);
    
    if (translation === null && currentLang !== this.fallbackLanguage) {
      translation = this.getTranslationByPath(path, this.fallbackLanguage);
      
      if (translation !== null) {
        console.warn(`⚠️ [LocalizationManager] Fallback ${this.fallbackLanguage} pour: ${path}`);
      }
    }
    
    if (translation === null) {
      console.warn(`⚠️ [LocalizationManager] Manquant: ${path} (${currentLang})`);
      return path;
    }
    
    return translation;
  }
  
  /**
   * Obtenir traduction par chemin (méthode inchangée)
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
  
  /**
   * Obtenir langue courante (méthode inchangée)
   */
  getCurrentLanguage() {
    // Méthode 1: API globale
    if (typeof window.GetPlayerCurrentLanguage === 'function') {
      return window.GetPlayerCurrentLanguage();
    }
    
    // Méthode 2: OptionsManager
    if (window.optionsSystem && typeof window.optionsSystem.getCurrentLanguage === 'function') {
      return window.optionsSystem.getCurrentLanguage();
    }
    
    // Méthode 3: Détection navigateur
    try {
      const browserLang = navigator.language.toLowerCase().split('-')[0];
      const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko'];
      
      if (supportedLanguages.includes(browserLang)) {
        return browserLang;
      }
    } catch (error) {
      console.warn('⚠️ [LocalizationManager] Erreur détection langue:', error);
    }
    
    return this.fallbackLanguage;
  }
  
  // === 📦 NOUVELLES FONCTIONNALITÉS MODULAIRES ===
  
  /**
   * Charger un module spécifique à la demande
   */
  async loadModule(moduleName, force = false) {
    if (!force && this.loadedModules.has(moduleName)) {
      console.log(`✅ [LocalizationManager] Module "${moduleName}" déjà chargé`);
      return true;
    }
    
    try {
      console.log(`📥 [LocalizationManager] Chargement module "${moduleName}"...`);
      
      const moduleData = await this._loadSingleModule(moduleName);
      
      if (moduleData) {
        this.moduleTranslations.set(moduleName, moduleData);
        this.loadedModules.add(moduleName);
        this.failedModules.delete(moduleName);
        
        // Re-fusionner toutes les traductions
        this._mergeAllTranslations();
        
        console.log(`✅ [LocalizationManager] Module "${moduleName}" chargé et fusionné`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ [LocalizationManager] Erreur module "${moduleName}":`, error);
      this.failedModules.add(moduleName);
      return false;
    }
  }
  
  /**
   * Vérifier si un module est chargé
   */
  isModuleLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }
  
  /**
   * Obtenir les modules chargés
   */
  getLoadedModules() {
    return Array.from(this.loadedModules);
  }
  
  /**
   * Obtenir les modules échoués
   */
  getFailedModules() {
    return Array.from(this.failedModules);
  }
  
  // === 🔧 MÉTHODES HÉRITÉES (COMPATIBILITÉ) ===
  
  isLanguageSupported(lang) {
    return this.isReady && this.translations && (lang in this.translations);
  }
  
  getAvailableLanguages() {
    if (!this.isReady || !this.translations) {
      return [];
    }
    return Object.keys(this.translations);
  }
  
  getLanguageData(lang) {
    if (!this.isReady || !this.translations) {
      return null;
    }
    return this.translations[lang] || null;
  }
  
  hasTranslation(path, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    const translation = this.getTranslationByPath(path, currentLang);
    return translation !== null;
  }
  
  async reload() {
    console.log('🔄 [LocalizationManager] Rechargement complet...');
    
    this.translations = null;
    this.moduleTranslations.clear();
    this.loadedModules.clear();
    this.failedModules.clear();
    this.isReady = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.lastError = null;
    
    return await this.load();
  }
  
  // === 🐛 DEBUG AMÉLIORÉ ===
  
  getDebugInfo() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      mode: 'modular',
      strategy: this.moduleConfig.loadingStrategy.mode,
      loadedModules: Array.from(this.loadedModules),
      failedModules: Array.from(this.failedModules),
      totalModules: this.moduleTranslations.size,
      currentLanguage: this.getCurrentLanguage(),
      availableLanguages: this.getAvailableLanguages(),
      fallbackLanguage: this.fallbackLanguage,
      lastError: this.lastError?.message || null,
      sampleTranslation: this.isReady ? this.t('quest.label') : null,
      
      // Stats détaillées
      detailedStats: {
        requiredModules: this.moduleConfig.required,
        optionalModules: this.moduleConfig.optional,
        detectedModules: this._detectUsedModules(),
        cacheSize: this.moduleTranslations.size,
        translationKeys: this.isReady ? Object.keys(this.translations[this.fallbackLanguage] || {}).length : 0
      }
    };
  }
  
  testSection(section, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    if (!this.isReady) {
      console.warn('⚠️ [LocalizationManager] Pas prêt pour test');
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

// === 🌐 INSTANCE GLOBALE (INCHANGÉE) ===

let globalLocalizationManager = null;

export function getLocalizationManager() {
  if (!globalLocalizationManager) {
    globalLocalizationManager = new LocalizationManager();
  }
  return globalLocalizationManager;
}

export async function initLocalizationManager(options = {}) {
  const manager = getLocalizationManager();
  
  const success = await manager.load(options);
  if (!success) {
    console.error('❌ [LocalizationManager] Échec initialisation modulaire');
  }
  
  window.localizationManager = manager;
  
  return manager;
}

export function t(path, lang = null) {
  const manager = getLocalizationManager();
  return manager.t(path, lang);
}

export default LocalizationManager;

console.log(`
🌐 === LOCALIZATION MANAGER MODULAIRE ===

✅ NOUVELLES FONCTIONNALITÉS:
• Fichiers séparés par module
• Chargement intelligent (détection auto)
• Cache modulaire avancé
• Fallback système hérité
• API 100% compatible

🔧 STRATÉGIES DE CHARGEMENT:
• SMART: Required + modules détectés (défaut)
• ALL: Tous les modules disponibles
• REQUIRED: Seulement common + obligatoires

📦 MODULES SUPPORTÉS:
• common-ui.json (obligatoire)
• quest-ui.json (optionnel)
• team-ui.json (optionnel)
• inventory-ui.json (optionnel)
• options-ui.json (optionnel)
• pokedex-ui.json (optionnel)

🎯 UTILISATION (IDENTIQUE):
• import { t, initLocalizationManager } from './managers/LocalizationManager.js'
• await initLocalizationManager()
• const text = t('quest.label') // Fonctionne comme avant !

📊 DEBUG AMÉLIORÉ:
• window.localizationManager.getDebugInfo()
• window.localizationManager.loadModule('quest')
• window.localizationManager.getLoadedModules()

🔄 MIGRATION ZÉRO:
• Modules existants fonctionnent sans modification
• Fallback automatique vers ui-translations.json
• API t() identique
`);
