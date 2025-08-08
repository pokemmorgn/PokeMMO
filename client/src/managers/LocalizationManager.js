// managers/LocalizationManager.js - VERSION MODULAIRE AVEC DÉTECTION PÉRIODIQUE + BATTLE
// 🌐 Gestionnaire de traductions modulaire avec fichiers séparés
// 🔄 Détection automatique périodique des nouveaux modules
// ⚔️ Support intégré pour le système de combat

export class LocalizationManager {
  constructor() {
    // === CACHE MODULAIRE ===
    this.translations = null;           // Cache fusionné final (comme avant)
    this.moduleTranslations = new Map(); // Cache par module
    this.isLoading = false;
    this.loadPromise = null;
    
    // === CONFIGURATION MODULAIRE ===
    this.fallbackLanguage = 'en';
    
    // 🔥 NOUVEAU : Configuration des modules avec BATTLE
    this.moduleConfig = {
      // Modules obligatoires (toujours chargés)
      required: ['common'],
      
      // ⚔️ NOUVEAU: Modules optionnels avec battle
      optional: ['quest', 'team', 'inventory', 'options', 'pokedex', 'battle'],
      
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
    
    // === 🔄 NOUVEAU : DÉTECTION PÉRIODIQUE ===
    this.periodicDetection = {
      enabled: true,
      interval: 3000,        // Vérifier toutes les 3 secondes
      maxAttempts: 20,       // Maximum 20 tentatives = 1 minute
      currentAttempts: 0,
      timerId: null,
      lastDetectedModules: new Set()
    };
    
    // === ÉTAT ===
    this.isReady = false;
    this.lastError = null;
    this.loadedModules = new Set();
    this.failedModules = new Set();
    
    console.log('🌐 [LocalizationManager] Instance modulaire créée avec support Battle');
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
      
      // 🔄 NOUVEAU : Démarrer détection périodique même si déjà chargé
      this.startPeriodicDetection();
      
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
    
    // 🔄 NOUVEAU : Démarrer détection périodique après chargement initial
    if (result) {
      this.startPeriodicDetection();
    }
    
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
  
  // === 🔄 NOUVEAU : DÉTECTION PÉRIODIQUE ===
  
  /**
   * Démarrer la détection périodique des nouveaux modules
   */
  startPeriodicDetection() {
    if (!this.periodicDetection.enabled) {
      console.log('ℹ️ [LocalizationManager] Détection périodique désactivée');
      return;
    }
    
    // Éviter double démarrage
    if (this.periodicDetection.timerId) {
      console.log('ℹ️ [LocalizationManager] Détection périodique déjà active');
      return;
    }
    
    console.log(`🔄 [LocalizationManager] Démarrage détection périodique (${this.periodicDetection.interval}ms)`);
    
    this.periodicDetection.timerId = setInterval(() => {
      this.checkForNewModules();
    }, this.periodicDetection.interval);
    
    // Première vérification immédiate
    setTimeout(() => {
      this.checkForNewModules();
    }, 1000);
  }
  
  /**
   * Arrêter la détection périodique
   */
  stopPeriodicDetection() {
    if (this.periodicDetection.timerId) {
      clearInterval(this.periodicDetection.timerId);
      this.periodicDetection.timerId = null;
      console.log('⏹️ [LocalizationManager] Détection périodique arrêtée');
    }
  }
  
  /**
   * Vérifier s'il y a de nouveaux modules à charger
   */
  async checkForNewModules() {
    this.periodicDetection.currentAttempts++;
    
    // Arrêter après maxAttempts
    if (this.periodicDetection.currentAttempts >= this.periodicDetection.maxAttempts) {
      console.log(`⏹️ [LocalizationManager] Détection périodique terminée (${this.periodicDetection.maxAttempts} tentatives)`);
      this.stopPeriodicDetection();
      return;
    }
    
    // Détecter modules actuels
    const currentModules = new Set(this._detectUsedModules());
    
    // Comparer avec la dernière détection
    const newModules = [...currentModules].filter(module => 
      !this.periodicDetection.lastDetectedModules.has(module) && 
      !this.loadedModules.has(module) &&
      !this.failedModules.has(module)
    );
    
    if (newModules.length > 0) {
      console.log(`🆕 [LocalizationManager] Nouveaux modules détectés (tentative ${this.periodicDetection.currentAttempts}):`, newModules);
      
      // Charger les nouveaux modules
      const results = await this._loadModules(newModules);
      
      if (results.some(r => r.success)) {
        // Re-fusionner si au moins un module a été chargé
        this._mergeAllTranslations();
        
        console.log(`✅ [LocalizationManager] Modules chargés dynamiquement: ${results.filter(r => r.success).map(r => r.module).join(', ')}`);
        
        // 🔄 NOUVEAU : Notifier tous les composants du changement
        this.notifyModulesUpdated(newModules.filter(module => this.loadedModules.has(module)));
      }
    }
    
    // Mettre à jour la dernière détection
    this.periodicDetection.lastDetectedModules = currentModules;
    
    // Arrêter si tous les modules optionnels sont chargés ou ont échoué
    const allOptionalProcessed = this.moduleConfig.optional.every(module => 
      this.loadedModules.has(module) || this.failedModules.has(module)
    );
    
    if (allOptionalProcessed) {
      console.log(`✅ [LocalizationManager] Tous les modules optionnels traités - arrêt détection périodique`);
      this.stopPeriodicDetection();
    }
  }
  
  /**
   * Notifier les composants qu'il y a de nouveaux modules
   */
  notifyModulesUpdated(newModules) {
    console.log(`📢 [LocalizationManager] Notification nouveaux modules:`, newModules);
    
    // Déclencher événement global
    window.dispatchEvent(new CustomEvent('localizationModulesUpdated', {
      detail: { 
        newModules, 
        loadedModules: Array.from(this.loadedModules),
        totalModules: this.moduleTranslations.size
      }
    }));
    
    // 🔄 NOUVEAU : Force mise à jour des composants existants
    this.updateExistingComponents();
  }
  
  /**
   * Mettre à jour les composants existants avec nouvelles traductions
   */
  updateExistingComponents() {
    const componentUpdaters = [
      // Inventory
      () => {
        if (window.inventorySystemGlobal?.icon?.updateLanguage) {
          window.inventorySystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] InventoryIcon mis à jour');
        }
      },
      
      // Team  
      () => {
        if (window.teamSystemGlobal?.icon?.updateLanguage) {
          window.teamSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] TeamIcon mis à jour');
        }
      },
      
      // Quest
      () => {
        if (window.questSystemGlobal?.icon?.updateLanguage) {
          window.questSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] QuestIcon mis à jour');
        }
      },
      
      // Options
      () => {
        if (window.optionsSystemGlobal?.icon?.updateLanguage) {
          window.optionsSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] OptionsIcon mis à jour');
        }
      },
      
      // ⚔️ NOUVEAU: Battle Systems
      () => {
        if (window.game?.scene?.getScene('BattleScene')) {
          const battleScene = window.game.scene.getScene('BattleScene');
          if (battleScene.battleTranslator?.setLanguage) {
            const currentLang = this.getCurrentLanguage();
            battleScene.battleTranslator.setLanguage(currentLang);
            console.log('🔄 [LocalizationManager] BattleTranslator mis à jour');
          }
        }
      },
      
      // ⚔️ Battle Action UI
      () => {
        if (window.battleActionUI?.updateLanguage) {
          window.battleActionUI.updateLanguage();
          console.log('🔄 [LocalizationManager] BattleActionUI mis à jour');
        }
      }
    ];
    
    componentUpdaters.forEach(updater => {
      try {
        updater();
      } catch (error) {
        console.warn('⚠️ [LocalizationManager] Erreur mise à jour composant:', error);
      }
    });
  }
  
  // === 📁 STRATÉGIES DE CHARGEMENT ===
  
  /**
   * Stratégie SMART : Charger required + modules détectés
   */
  async _loadSmartModules() {
    console.log('🧠 [LocalizationManager] Stratégie SMART avec Battle');
    
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
    console.log('🎯 [LocalizationManager] Stratégie ALL avec Battle');
    
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
  
  // === 🔍 DÉTECTION AUTOMATIQUE (AMÉLIORÉE AVEC BATTLE) ===
  
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
      pokedex: ['#pokedex-icon', '.pokedex-overlay', '[data-pokedex]'],
      
      // ⚔️ NOUVEAU: Détection Battle
      battle: [
        '#battleScene', '.battle-scene', 
        '.battle-action-ui', '.battle-ui',
        '.battle-health-bar', '.battle-interface',
        '.pokemon-moves-ui', '.battle-inventory',
        '[data-battle]', '.battle-transition'
      ]
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
      quest: ['questSystem', 'questSystemGlobal'],
      team: ['teamSystem', 'teamSystemGlobal'],
      inventory: ['inventorySystem', 'inventorySystemGlobal'],
      options: ['optionsSystem', 'optionsSystemGlobal'],
      pokedex: ['pokedexSystem', 'pokedexSystemGlobal'],
      
      // ⚔️ NOUVEAU: Variables globales Battle
      battle: [
        'battleSystem', 'battleManager', 'battleNetworkHandler',
        'battleActionUI', 'pokemonMovesUI', 'koManager',
        'battleTranslator', 'battleScene'
      ]
    };
    
    Object.entries(globalIndicators).forEach(([module, globals]) => {
      const found = globals.some(globalVar => {
        return window[globalVar] !== undefined;
      });
      
      if (found && !detectedModules.includes(module)) {
        detectedModules.push(module);
        console.log(`🌐 [LocalizationManager] Module détecté (global): ${module}`);
      }
    });
    
    // ⚔️ NOUVEAU: Détection spéciale Phaser Battle Scene
    if (window.game?.scene?.getScene) {
      try {
        const battleScene = window.game.scene.getScene('BattleScene');
        if (battleScene && !detectedModules.includes('battle')) {
          detectedModules.push('battle');
          console.log(`🎮 [LocalizationManager] Module détecté (Phaser): battle`);
        }
      } catch (error) {
        // Pas grave si la scène n'existe pas encore
      }
    }
    
    // ⚔️ NOUVEAU: Détection par état du jeu
    if (window.pokemonUISystem?.getCurrentGameState) {
      try {
        const gameState = window.pokemonUISystem.getCurrentGameState();
        if (gameState === 'battle' && !detectedModules.includes('battle')) {
          detectedModules.push('battle');
          console.log(`🎯 [LocalizationManager] Module détecté (state): battle`);
        }
      } catch (error) {
        // Pas grave
      }
    }
    
    return detectedModules;
  }
  
  // === 📦 CHARGEMENT MODULES (INCHANGÉ) ===
  
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
    // ⚔️ NOUVEAU: Mapping avec battle
    const fileMapping = {
      common: 'modules/common-ui.json',
      quest: 'modules/quest-ui.json',
      team: 'modules/team-ui.json',
      inventory: 'modules/inventory-ui.json',
      options: 'modules/options-ui.json',
      pokedex: 'modules/pokedex-ui.json',
      battle: 'modules/battle-ui.json'  // ⚔️ NOUVEAU
    };
    
    return fileMapping[moduleName] || `modules/${moduleName}-ui.json`;
  }
  
  // === 🔀 FUSION DES TRADUCTIONS (INCHANGÉE) ===
  
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
  
  // === 🔄 FALLBACK HÉRITÉ (INCHANGÉ) ===
  
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
  
  // === 🎯 API PUBLIQUE (COMPATIBLE + NOUVELLES MÉTHODES BATTLE) ===
  
  /**
   * Obtenir une traduction (API inchangée)
   * @param {string} path - Chemin (ex: "battle.ui.actions.attack")
   * @param {string} lang - Langue (optionnel)
   * @param {object} variables - Variables pour remplacement (optionnel)
   * @returns {string}
   */
  t(path, lang = null, variables = {}) {
    // ✅ API IDENTIQUE à l'ancienne version + support variables
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
    
    // ⚔️ NOUVEAU: Support des variables pour les traductions Battle
    if (variables && Object.keys(variables).length > 0) {
      translation = this.replaceVariables(translation, variables);
    }
    
    return translation;
  }
  
  /**
   * ⚔️ NOUVEAU: Remplacer les variables dans une traduction
   * @param {string} text - Texte avec variables {nom}
   * @param {object} variables - Variables à remplacer
   * @returns {string}
   */
  replaceVariables(text, variables) {
    let result = text;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }
  
  /**
   * ⚔️ NOUVEAU: API spécialisée pour les traductions de combat
   * @param {string} key - Clé battle (ex: "actions.attack")
   * @param {object} variables - Variables pour remplacement
   * @param {string} lang - Langue (optionnel)
   * @returns {string}
   */
  battleT(key, variables = {}, lang = null) {
    const fullPath = `battle.ui.${key}`;
    return this.t(fullPath, lang, variables);
  }
  
  /**
   * ⚔️ NOUVEAU: API pour les noms d'attaques
   * @param {string} moveId - ID de l'attaque (ex: "tackle")
   * @param {string} lang - Langue (optionnel)
   * @returns {string}
   */
  getMoveNameT(moveId, lang = null) {
    const movePath = `battle.ui.moves_names.${moveId}`;
    const translation = this.t(movePath, lang);
    
    // Si pas trouvé, formatter le moveId
    if (translation === movePath) {
      return moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return translation;
  }
  
  /**
   * ⚔️ NOUVEAU: API pour les types Pokémon
   * @param {string} type - Type Pokémon (ex: "fire")
   * @param {string} lang - Langue (optionnel)
   * @returns {string}
   */
  getTypeNameT(type, lang = null) {
    const typePath = `battle.ui.types.${type}`;
    const translation = this.t(typePath, lang);
    
    // Si pas trouvé, capitaliser le type
    if (translation === typePath) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    return translation;
  }
  
  /**
   * ⚔️ NOUVEAU: API pour les messages de combat avec variables
   * @param {string} messageKey - Clé du message (ex: "pokemon_uses_move")
   * @param {object} variables - Variables (ex: {pokemon: "Pikachu", move: "Éclair"})
   * @param {string} lang - Langue (optionnel)
   * @returns {string}
   */
  getBattleMessageT(messageKey, variables = {}, lang = null) {
    const messagePath = `battle.ui.messages.${messageKey}`;
    return this.t(messagePath, lang, variables);
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
        
        // 🔄 NOUVEAU : Notifier mise à jour
        this.notifyModulesUpdated([moduleName]);
        
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
   * ⚔️ NOUVEAU: Charger spécifiquement le module battle
   */
  async loadBattleModule(force = false) {
    console.log('⚔️ [LocalizationManager] Chargement spécifique module battle...');
    
    const success = await this.loadModule('battle', force);
    
    if (success) {
      console.log('✅ [LocalizationManager] Module battle chargé avec succès');
      
      // Notifier les systèmes de combat
      if (window.battleSystem) {
        window.battleSystem.onLanguageUpdated?.();
      }
      
      if (window.game?.scene?.getScene('BattleScene')) {
        const battleScene = window.game.scene.getScene('BattleScene');
        battleScene.onLanguageUpdated?.();
      }
    }
    
    return success;
  }
  
  /**
   * Vérifier si un module est chargé
   */
  isModuleLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }
  
  /**
   * ⚔️ NOUVEAU: Vérifier si le module battle est chargé
   */
  isBattleModuleLoaded() {
    return this.isModuleLoaded('battle');
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
  
  /**
   * ⚔️ NOUVEAU: Vérifier si une traduction battle existe
   */
  hasBattleTranslation(key, lang = null) {
    const fullPath = `battle.ui.${key}`;
    return this.hasTranslation(fullPath, lang);
  }
  
  async reload() {
    console.log('🔄 [LocalizationManager] Rechargement complet...');
    
    // 🔄 NOUVEAU : Arrêter détection périodique
    this.stopPeriodicDetection();
    
    this.translations = null;
    this.moduleTranslations.clear();
    this.loadedModules.clear();
    this.failedModules.clear();
    this.isReady = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.lastError = null;
    
    // Reset détection périodique
    this.periodicDetection.currentAttempts = 0;
    this.periodicDetection.lastDetectedModules.clear();
    
    return await this.load();
  }
  
  // === 🔧 NOUVEAU : CONTRÔLE DÉTECTION PÉRIODIQUE ===
  
  /**
   * Configurer la détection périodique
   */
  configurePeriodicDetection(options = {}) {
    this.periodicDetection = {
      ...this.periodicDetection,
      ...options
    };
    
    console.log('🔧 [LocalizationManager] Détection périodique configurée:', this.periodicDetection);
  }
  
  /**
   * Désactiver complètement la détection périodique
   */
  disablePeriodicDetection() {
    this.stopPeriodicDetection();
    this.periodicDetection.enabled = false;
    console.log('⏹️ [LocalizationManager] Détection périodique désactivée');
  }
  
  /**
   * Réactiver la détection périodique
   */
  enablePeriodicDetection() {
    this.periodicDetection.enabled = true;
    this.periodicDetection.currentAttempts = 0;
    this.startPeriodicDetection();
    console.log('🔄 [LocalizationManager] Détection périodique réactivée');
  }
  
  // === 🐛 DEBUG AMÉLIORÉ ===
  
  getDebugInfo() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      mode: 'modular-with-periodic-detection-and-battle',
      strategy: this.moduleConfig.loadingStrategy.mode,
      loadedModules: Array.from(this.loadedModules),
      failedModules: Array.from(this.failedModules),
      totalModules: this.moduleTranslations.size,
      currentLanguage: this.getCurrentLanguage(),
      availableLanguages: this.getAvailableLanguages(),
      fallbackLanguage: this.fallbackLanguage,
      lastError: this.lastError?.message || null,
      sampleTranslation: this.isReady ? this.t('quest.label') : null,
      
      // ⚔️ NOUVEAU: Stats Battle
      battleModule: {
        loaded: this.isBattleModuleLoaded(),
        sampleBattleTranslation: this.isReady ? this.battleT('actions.attack') : null,
        movesCount: this.isReady ? Object.keys(this.getTranslationByPath('battle.ui.moves_names', this.getCurrentLanguage()) || {}).length : 0,
        messagesCount: this.isReady ? Object.keys(this.getTranslationByPath('battle.ui.messages', this.getCurrentLanguage()) || {}).length : 0
      },
      
      // 🔄 Stats détection périodique
      periodicDetection: {
        enabled: this.periodicDetection.enabled,
        active: !!this.periodicDetection.timerId,
        attempts: this.periodicDetection.currentAttempts,
        maxAttempts: this.periodicDetection.maxAttempts,
        interval: this.periodicDetection.interval,
        lastDetected: Array.from(this.periodicDetection.lastDetectedModules)
      },
      
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
  
  /**
   * ⚔️ NOUVEAU: Test spécifique des traductions battle
   */
  testBattleTranslations(lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    if (!this.isReady) {
      console.warn('⚠️ [LocalizationManager] Pas prêt pour test battle');
      return;
    }
    
    if (!this.isBattleModuleLoaded()) {
      console.warn('⚠️ [LocalizationManager] Module battle non chargé');
      return;
    }
    
    console.log(`🧪 [LocalizationManager] Test traductions battle en ${currentLang}:`);
    
    // Test actions
    console.log('🎮 Actions:');
    ['attack', 'bag', 'pokemon', 'run'].forEach(action => {
      const translation = this.battleT(`actions.${action}`, {}, currentLang);
      console.log(`  ${action}: "${translation}"`);
    });
    
    // Test messages avec variables
    console.log('💬 Messages:');
    const testMessage = this.getBattleMessageT('pokemon_uses_move', {
      pokemon: 'Pikachu',
      move: 'Éclair'
    }, currentLang);
    console.log(`  Avec variables: "${testMessage}"`);
    
    // Test noms d'attaques
    console.log('⚔️ Attaques:');
    ['tackle', 'ember', 'water_gun', 'thunder_shock'].forEach(move => {
      const translation = this.getMoveNameT(move, currentLang);
      console.log(`  ${move}: "${translation}"`);
    });
    
    // Test types
    console.log('🏷️ Types:');
    ['fire', 'water', 'electric', 'grass'].forEach(type => {
      const translation = this.getTypeNameT(type, currentLang);
      console.log(`  ${type}: "${translation}"`);
    });
    
    return {
      actions: ['attack', 'bag', 'pokemon', 'run'].map(action => ({
        key: action,
        translation: this.battleT(`actions.${action}`, {}, currentLang)
      })),
      moves: ['tackle', 'ember', 'water_gun', 'thunder_shock'].map(move => ({
        key: move,
        translation: this.getMoveNameT(move, currentLang)
      })),
      types: ['fire', 'water', 'electric', 'grass'].map(type => ({
        key: type,
        translation: this.getTypeNameT(type, currentLang)
      }))
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
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [LocalizationManager] Destruction...');
    
    this.stopPeriodicDetection();
    
    this.translations = null;
    this.moduleTranslations.clear();
    this.loadedModules.clear();
    this.failedModules.clear();
    this.isReady = false;
    
    console.log('✅ [LocalizationManager] Détruit');
  }
}

// === 🌐 INSTANCE GLOBALE (ÉTENDUE POUR BATTLE) ===

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

// === ⚔️ NOUVELLES FONCTIONS GLOBALES BATTLE ===

/**
 * API globale classique (inchangée)
 */
export function t(path, lang = null) {
  const manager = getLocalizationManager();
  return manager.t(path, lang);
}

/**
 * ⚔️ NOUVEAU: API globale pour traductions battle
 * @param {string} key - Clé battle (ex: "actions.attack")
 * @param {object} variables - Variables pour remplacement
 * @param {string} lang - Langue (optionnel)
 * @returns {string}
 */
export function battleT(key, variables = {}, lang = null) {
  const manager = getLocalizationManager();
  return manager.battleT(key, variables, lang);
}

/**
 * ⚔️ NOUVEAU: API globale pour noms d'attaques
 */
export function getMoveNameT(moveId, lang = null) {
  const manager = getLocalizationManager();
  return manager.getMoveNameT(moveId, lang);
}

/**
 * ⚔️ NOUVEAU: API globale pour noms de types
 */
export function getTypeNameT(type, lang = null) {
  const manager = getLocalizationManager();
  return manager.getTypeNameT(type, lang);
}

/**
 * ⚔️ NOUVEAU: API globale pour messages de combat
 */
export function getBattleMessageT(messageKey, variables = {}, lang = null) {
  const manager = getLocalizationManager();
  return manager.getBattleMessageT(messageKey, variables, lang);
}

/**
 * ⚔️ NOUVEAU: Forcer le chargement du module battle
 */
export async function loadBattleTranslations() {
  const manager = getLocalizationManager();
  return await manager.loadBattleModule();
}

/**
 * ⚔️ NOUVEAU: Vérifier si les traductions battle sont prêtes
 */
export function isBattleTranslationsReady() {
  const manager = getLocalizationManager();
  return manager.isReady && manager.isBattleModuleLoaded();
}

export default LocalizationManager;

// === 🚀 INITIALISATION AUTOMATIQUE BATTLE ===

// ⚔️ NOUVEAU: Auto-détection et chargement battle
window.addEventListener('DOMContentLoaded', () => {
  // Attendre un peu que les systèmes se chargent
  setTimeout(() => {
    const manager = getLocalizationManager();
    
    // Si pas encore initialisé, l'initialiser
    if (!manager.isReady) {
      initLocalizationManager().then(() => {
        console.log('🌐 [LocalizationManager] Auto-initialisé au chargement DOM');
      });
    }
  }, 1000);
});

// ⚔️ NOUVEAU: Écouter les changements d'état du jeu pour battle
window.addEventListener('gameStateChanged', (event) => {
  if (event.detail?.newState === 'battle') {
    const manager = getLocalizationManager();
    if (!manager.isBattleModuleLoaded()) {
      console.log('⚔️ [LocalizationManager] État battle détecté - chargement module...');
      manager.loadBattleModule();
    }
  }
});

console.log(`
🌐 === LOCALIZATION MANAGER AVEC SUPPORT BATTLE COMPLET ===

⚔️ NOUVELLES FONCTIONNALITÉS BATTLE:
• Module battle-ui.json avec traductions complètes FR/EN/ES
• API spécialisées: battleT(), getMoveNameT(), getTypeNameT()
• Messages avec variables: getBattleMessageT('pokemon_uses_move', {pokemon: 'Pikachu', move: 'Éclair'})
• Détection automatique des systèmes de combat
• Chargement dynamique quand BattleScene détectée

🔄 DÉTECTION PÉRIODIQUE ÉTENDUE:
• Détecte BattleScene Phaser automatiquement
• Détecte variables globales battle (battleSystem, koManager, etc.)
• Détecte état jeu 'battle' via pokemonUISystem
• Notification automatique des composants battle

⚡ APIS GLOBALES BATTLE:
• battleT('actions.attack') → "ATTAQUER"
• getMoveNameT('tackle') → "Charge"  
• getTypeNameT('fire') → "Feu"
• getBattleMessageT('pokemon_uses_move', {pokemon: 'Pikachu', move: 'Éclair'}) → "Pikachu utilise Éclair !"

🧪 DEBUG BATTLE:
• window.localizationManager.testBattleTranslations()
• window.localizationManager.loadBattleModule()
• window.localizationManager.isBattleModuleLoaded()

📁 STRUCTURE FICHIER:
/localization/modules/battle-ui.json avec:
- Actions: attack, bag, pokemon, run
- Messages: pokemon_uses_move, victory, defeat, etc.
- Moves: tackle, ember, water_gun, etc.
- Types: fire, water, electric, etc.
- Status: paralyzed, poisoned, etc.

✅ PLUS BESOIN DE RELOAD MANUEL - TOUT AUTOMATIQUE !
`);
