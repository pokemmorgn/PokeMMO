// managers/LocalizationManager.js - VERSION BATTLE COMPLÈTE AVEC MOVES/POKÉMON
// 🌐 Gestionnaire de traductions modulaire avec fichiers séparés
// 🔄 Détection automatique périodique des nouveaux modules
// ⚔️ Support intégré pour le système de combat avec moves et pokémon
// 🎯 Optimisé pour battle UI avec traductions dynamiques

export class LocalizationManager {
  constructor() {
    // === CACHE MODULAIRE ÉTENDU ===
    this.translations = null;           // Cache fusionné final
    this.moduleTranslations = new Map(); // Cache par module UI
    this.moveTranslations = new Map();   // ⚔️ NOUVEAU: Cache moves par langue
    this.pokemonTranslations = new Map(); // ⚔️ NOUVEAU: Cache pokémon par langue
    this.isLoading = false;
    this.loadPromise = null;
    
    // === CONFIGURATION MODULAIRE ÉTENDUE ===
    this.fallbackLanguage = 'en';
    
    // 🔥 Configuration des modules avec BATTLE + MOVES + POKEMON
    this.moduleConfig = {
      // Modules UI obligatoires
      required: ['common'],
      
      // Modules UI optionnels
      optional: ['quest', 'team', 'inventory', 'options', 'pokedex', 'battle'],
      
      // ⚔️ NOUVEAU: Sources de données battle
      battleData: {
        moves: true,      // Charger moves par langue
        pokemon: true     // Charger pokémon par langue
      },
      
      // Chemins des fichiers
      basePath: '/localization',
      moveBasePath: '/localization/moves',     // ⚔️ NOUVEAU
      pokemonBasePath: '/localization/pokemon', // ⚔️ NOUVEAU
      
      // Langues supportées avec codes
      supportedLanguages: {
        'en': { code: 'en', name: 'English' },
        'fr': { code: 'fr', name: 'Français' },
        'es': { code: 'es', name: 'Español' },
        'de': { code: 'de', name: 'Deutsch' },
        'it': { code: 'it', name: 'Italiano' },
        'pt': { code: 'pt', name: 'Português' },
        'ja': { code: 'ja', name: '日本語' },
        'ko': { code: 'ko', name: '한국어' }
      },
      
      // Stratégies de chargement
      loadingStrategy: {
        mode: 'smart',
        detectModules: true,
        cacheModules: true,
        mergeStrategy: 'deep',
        preloadBattle: true  // ⚔️ NOUVEAU: Pré-charger battle data
      }
    };
    
    // === 🔄 DÉTECTION PÉRIODIQUE ÉTENDUE ===
    this.periodicDetection = {
      enabled: true,
      interval: 3000,
      maxAttempts: 20,
      currentAttempts: 0,
      timerId: null,
      lastDetectedModules: new Set(),
      // ⚔️ NOUVEAU: Détecter aussi les besoins battle data
      detectBattleData: true
    };
    
    // === ÉTAT ÉTENDU ===
    this.isReady = false;
    this.lastError = null;
    this.loadedModules = new Set();
    this.failedModules = new Set();
    
    // ⚔️ NOUVEAU: État battle data
    this.battleDataState = {
      movesLoaded: new Set(),    // Langues avec moves chargées
      pokemonLoaded: new Set(),  // Langues avec pokémon chargés
      loadingMoves: new Set(),   // Langues en cours de chargement moves
      loadingPokemon: new Set()  // Langues en cours de chargement pokémon
    };
    
    console.log('🌐 [LocalizationManager] Instance complète créée avec support Battle+Moves+Pokémon');
  }
  
  // === 🚀 CHARGEMENT INTELLIGENT ÉTENDU ===
  
  async load(options = {}) {
    if (this.isReady && this.translations) {
      console.log('✅ [LocalizationManager] Traductions déjà chargées');
      this.startPeriodicDetection();
      return true;
    }
    
    if (this.isLoading && this.loadPromise) {
      console.log('⏳ [LocalizationManager] Chargement en cours...');
      return await this.loadPromise;
    }
    
    this.isLoading = true;
    this.loadPromise = this._loadTranslationsComplete(options);
    
    const result = await this.loadPromise;
    this.isLoading = false;
    this.loadPromise = null;
    
    if (result) {
      this.startPeriodicDetection();
    }
    
    return result;
  }
  
  /**
   * ⚔️ NOUVEAU: Chargement complet avec battle data
   */
  async _loadTranslationsComplete(options = {}) {
    try {
      console.log('🔄 [LocalizationManager] Chargement complet avec battle data...');
      
      // 1. Charger modules UI standard
      const uiSuccess = await this._loadTranslationsModular(options);
      
      if (!uiSuccess) {
        console.warn('⚠️ [LocalizationManager] Échec chargement UI, tentative fallback...');
        return await this._fallbackToLegacy();
      }
      
      // 2. ⚔️ NOUVEAU: Charger battle data si activé
      if (this.moduleConfig.loadingStrategy.preloadBattle) {
        const currentLang = this.getCurrentLanguage();
        await this._preloadBattleData(currentLang);
      }
      
      this.isReady = true;
      console.log('✅ [LocalizationManager] Chargement complet terminé');
      return true;
      
    } catch (error) {
      console.error('❌ [LocalizationManager] Erreur chargement complet:', error);
      return await this._fallbackToLegacy();
    }
  }
  
  /**
   * ⚔️ NOUVEAU: Pré-charger battle data pour une langue
   */
  async _preloadBattleData(lang) {
    console.log(`⚔️ [LocalizationManager] Pré-chargement battle data pour ${lang}...`);
    
    const loadPromises = [];
    
    // Charger moves si activé
    if (this.moduleConfig.battleData.moves) {
      loadPromises.push(this.loadMovesForLanguage(lang));
    }
    
    // Charger pokémon si activé
    if (this.moduleConfig.battleData.pokemon) {
      loadPromises.push(this.loadPokemonForLanguage(lang));
    }
    
    const results = await Promise.allSettled(loadPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`⚔️ [LocalizationManager] Battle data ${lang}: ${successful}/${results.length} réussi`);
    
    return successful > 0;
  }
  
  // === ⚔️ NOUVEAU: GESTION MOVES ===
  
  /**
   * Charger les traductions des moves pour une langue
   * @param {string} lang - Code langue
   * @returns {Promise<boolean>}
   */
  async loadMovesForLanguage(lang) {
    if (this.battleDataState.movesLoaded.has(lang)) {
      console.log(`✅ [LocalizationManager] Moves ${lang} déjà chargées`);
      return true;
    }
    
    if (this.battleDataState.loadingMoves.has(lang)) {
      console.log(`⏳ [LocalizationManager] Moves ${lang} en cours de chargement...`);
      return false;
    }
    
    this.battleDataState.loadingMoves.add(lang);
    
    try {
      console.log(`📥 [LocalizationManager] Chargement moves ${lang}...`);
      
      const moveUrl = `${this.moduleConfig.moveBasePath}/moves_${lang}.json`;
      const response = await fetch(moveUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const movesData = await response.json();
      
      if (!movesData || !movesData.moves) {
        throw new Error('Format moves invalide');
      }
      
      // Stocker dans le cache
      this.moveTranslations.set(lang, movesData.moves);
      this.battleDataState.movesLoaded.add(lang);
      
      console.log(`✅ [LocalizationManager] Moves ${lang} chargées: ${Object.keys(movesData.moves).length} moves`);
      return true;
      
    } catch (error) {
      console.warn(`⚠️ [LocalizationManager] Échec moves ${lang}:`, error.message);
      return false;
      
    } finally {
      this.battleDataState.loadingMoves.delete(lang);
    }
  }
  
  /**
   * Obtenir le nom d'une move dans une langue
   * @param {string} moveId - ID de la move (ex: "tackle")
   * @param {string} lang - Code langue (optionnel)
   * @returns {string}
   */
  getMoveNameT(moveId, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    // Vérifier cache moves
    const moves = this.moveTranslations.get(currentLang);
    if (moves && moves[moveId]) {
      return moves[moveId];
    }
    
    // Fallback vers langue par défaut
    if (currentLang !== this.fallbackLanguage) {
      const fallbackMoves = this.moveTranslations.get(this.fallbackLanguage);
      if (fallbackMoves && fallbackMoves[moveId]) {
        console.warn(`⚠️ [LocalizationManager] Fallback move ${moveId}: ${this.fallbackLanguage}`);
        return fallbackMoves[moveId];
      }
    }
    
    // Fallback vers battle UI si disponible
    const battleUIMove = this.t(`battle.ui.moves_names.${moveId}`, currentLang);
    if (battleUIMove !== `battle.ui.moves_names.${moveId}`) {
      return battleUIMove;
    }
    
    // Format le moveId en dernier recours
    console.warn(`⚠️ [LocalizationManager] Move non trouvée: ${moveId} (${currentLang})`);
    return this._formatMoveId(moveId);
  }
  
  /**
   * Formater un ID de move en nom lisible
   */
  _formatMoveId(moveId) {
    return moveId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // === ⚔️ NOUVEAU: GESTION POKÉMON ===
  
  /**
   * Charger les traductions des pokémon pour une langue
   * @param {string} lang - Code langue
   * @returns {Promise<boolean>}
   */
  async loadPokemonForLanguage(lang) {
    if (this.battleDataState.pokemonLoaded.has(lang)) {
      console.log(`✅ [LocalizationManager] Pokémon ${lang} déjà chargés`);
      return true;
    }
    
    if (this.battleDataState.loadingPokemon.has(lang)) {
      console.log(`⏳ [LocalizationManager] Pokémon ${lang} en cours de chargement...`);
      return false;
    }
    
    this.battleDataState.loadingPokemon.add(lang);
    
    try {
      console.log(`📥 [LocalizationManager] Chargement pokémon ${lang}...`);
      
      // Charger Gen1 pour commencer
      const pokemonUrl = `${this.moduleConfig.pokemonBasePath}/gen1/${lang}.json`;
      const response = await fetch(pokemonUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const pokemonData = await response.json();
      
      if (!pokemonData || typeof pokemonData !== 'object') {
        throw new Error('Format pokémon invalide');
      }
      
      // Stocker dans le cache
      this.pokemonTranslations.set(lang, pokemonData);
      this.battleDataState.pokemonLoaded.add(lang);
      
      console.log(`✅ [LocalizationManager] Pokémon ${lang} chargés: ${Object.keys(pokemonData).length} pokémon`);
      return true;
      
    } catch (error) {
      console.warn(`⚠️ [LocalizationManager] Échec pokémon ${lang}:`, error.message);
      return false;
      
    } finally {
      this.battleDataState.loadingPokemon.delete(lang);
    }
  }
  
  /**
   * Obtenir le nom et description d'un pokémon dans une langue
   * @param {number|string} pokemonId - ID du pokémon (ex: 1 ou "1")
   * @param {string} lang - Code langue (optionnel)
   * @param {boolean} withDescription - Inclure la description
   * @returns {string|object}
   */
  getPokemonNameT(pokemonId, lang = null, withDescription = false) {
    const currentLang = lang || this.getCurrentLanguage();
    const id = pokemonId.toString();
    
    // Vérifier cache pokémon
    const pokemon = this.pokemonTranslations.get(currentLang);
    if (pokemon && pokemon[id]) {
      const pokemonData = pokemon[id];
      
      if (withDescription) {
        return {
          name: pokemonData.name,
          description: pokemonData.description
        };
      }
      
      return pokemonData.name;
    }
    
    // Fallback vers langue par défaut
    if (currentLang !== this.fallbackLanguage) {
      const fallbackPokemon = this.pokemonTranslations.get(this.fallbackLanguage);
      if (fallbackPokemon && fallbackPokemon[id]) {
        console.warn(`⚠️ [LocalizationManager] Fallback pokémon ${id}: ${this.fallbackLanguage}`);
        
        const pokemonData = fallbackPokemon[id];
        if (withDescription) {
          return {
            name: pokemonData.name,
            description: pokemonData.description
          };
        }
        
        return pokemonData.name;
      }
    }
    
    // Fallback générique
    console.warn(`⚠️ [LocalizationManager] Pokémon non trouvé: ${id} (${currentLang})`);
    return withDescription 
      ? { name: `Pokémon #${id}`, description: '' }
      : `Pokémon #${id}`;
  }
  
  /**
   * Obtenir seulement la description d'un pokémon
   * @param {number|string} pokemonId - ID du pokémon
   * @param {string} lang - Code langue (optionnel)
   * @returns {string}
   */
  getPokemonDescriptionT(pokemonId, lang = null) {
    const result = this.getPokemonNameT(pokemonId, lang, true);
    return result.description || '';
  }
  
  // === 🔄 DÉTECTION PÉRIODIQUE ÉTENDUE ===
  
  /**
   * Vérifier s'il y a de nouveaux modules ou battle data à charger
   */
  async checkForNewModules() {
    this.periodicDetection.currentAttempts++;
    
    if (this.periodicDetection.currentAttempts >= this.periodicDetection.maxAttempts) {
      console.log(`⏹️ [LocalizationManager] Détection périodique terminée`);
      this.stopPeriodicDetection();
      return;
    }
    
    // Détecter modules UI
    const currentModules = new Set(this._detectUsedModules());
    const newModules = [...currentModules].filter(module => 
      !this.periodicDetection.lastDetectedModules.has(module) && 
      !this.loadedModules.has(module) &&
      !this.failedModules.has(module)
    );
    
    // ⚔️ NOUVEAU: Détecter besoins battle data
    const currentLang = this.getCurrentLanguage();
    const needsBattleData = this._detectBattleDataNeeds();
    
    let hasUpdates = false;
    
    // Charger nouveaux modules UI
    if (newModules.length > 0) {
      console.log(`🆕 [LocalizationManager] Nouveaux modules UI:`, newModules);
      
      const results = await this._loadModules(newModules);
      if (results.some(r => r.success)) {
        this._mergeAllTranslations();
        hasUpdates = true;
        console.log(`✅ [LocalizationManager] Modules UI chargés`);
      }
    }
    
    // ⚔️ NOUVEAU: Charger battle data si nécessaire
    if (needsBattleData.moves && !this.battleDataState.movesLoaded.has(currentLang)) {
      console.log(`⚔️ [LocalizationManager] Chargement moves ${currentLang}...`);
      const success = await this.loadMovesForLanguage(currentLang);
      if (success) hasUpdates = true;
    }
    
    if (needsBattleData.pokemon && !this.battleDataState.pokemonLoaded.has(currentLang)) {
      console.log(`⚔️ [LocalizationManager] Chargement pokémon ${currentLang}...`);
      const success = await this.loadPokemonForLanguage(currentLang);
      if (success) hasUpdates = true;
    }
    
    if (hasUpdates) {
      this.notifyModulesUpdated([...newModules, ...(needsBattleData.moves ? ['moves'] : []), ...(needsBattleData.pokemon ? ['pokemon'] : [])]);
    }
    
    this.periodicDetection.lastDetectedModules = currentModules;
    
    // Vérifier si tout est chargé
    const allOptionalProcessed = this.moduleConfig.optional.every(module => 
      this.loadedModules.has(module) || this.failedModules.has(module)
    );
    
    const battleDataComplete = 
      (!needsBattleData.moves || this.battleDataState.movesLoaded.has(currentLang)) &&
      (!needsBattleData.pokemon || this.battleDataState.pokemonLoaded.has(currentLang));
    
    if (allOptionalProcessed && battleDataComplete) {
      console.log(`✅ [LocalizationManager] Chargement complet - arrêt détection`);
      this.stopPeriodicDetection();
    }
  }
  
  /**
   * ⚔️ NOUVEAU: Détecter les besoins en battle data
   */
  _detectBattleDataNeeds() {
    const needs = { moves: false, pokemon: false };
    
    if (!this.periodicDetection.detectBattleData) {
      return needs;
    }
    
    // Vérifier éléments DOM battle
    const battleElements = [
      '.battle-scene', '.battle-ui', '.pokemon-moves-ui', 
      '.battle-action-ui', '#battleScene'
    ];
    
    const hasBattleUI = battleElements.some(selector => 
      document.querySelector(selector)
    );
    
    if (hasBattleUI) {
      needs.moves = true;
      needs.pokemon = true;
      console.log('⚔️ [LocalizationManager] Battle UI détecté - needs battle data');
      return needs;
    }
    
    // Vérifier variables globales
    const battleGlobals = [
      'battleSystem', 'battleManager', 'pokemonMovesUI', 
      'battleActionUI', 'koManager'
    ];
    
    const hasBattleGlobals = battleGlobals.some(globalVar => 
      window[globalVar] !== undefined
    );
    
    if (hasBattleGlobals) {
      needs.moves = true;
      needs.pokemon = true;
      console.log('⚔️ [LocalizationManager] Battle globals détecté - needs battle data');
      return needs;
    }
    
    // Vérifier Phaser Battle Scene
    if (window.game?.scene?.getScene) {
      try {
        const battleScene = window.game.scene.getScene('BattleScene');
        if (battleScene && battleScene.scene.isActive()) {
          needs.moves = true;
          needs.pokemon = true;
          console.log('⚔️ [LocalizationManager] Battle Scene active - needs battle data');
        }
      } catch (error) {
        // Pas grave
      }
    }
    
    return needs;
  }
  
  // === 🔄 DÉTECTION AUTOMATIQUE ÉTENDUE ===
  
  _detectUsedModules() {
    const detectedModules = [];
    
    // Détection DOM standard
    const domIndicators = {
      quest: ['#quest-icon', '.quest-journal', '[data-quest]', '#quest-tracker'],
      team: ['#team-icon', '.team-overlay', '[data-team]', '#team-manager'],
      inventory: ['#inventory-icon', '.inventory-overlay', '[data-inventory]'],
      options: ['#options-icon', '.options-overlay', '[data-options]'],
      pokedex: ['#pokedex-icon', '.pokedex-overlay', '[data-pokedex]'],
      battle: [
        '#battleScene', '.battle-scene', '.battle-action-ui', '.battle-ui',
        '.battle-health-bar', '.battle-interface', '.pokemon-moves-ui', 
        '.battle-inventory', '[data-battle]', '.battle-transition'
      ]
    };
    
    Object.entries(domIndicators).forEach(([module, selectors]) => {
      const found = selectors.some(selector => document.querySelector(selector));
      if (found) {
        detectedModules.push(module);
        console.log(`🔍 [LocalizationManager] Module détecté: ${module}`);
      }
    });
    
    // Détection variables globales
    const globalIndicators = {
      quest: ['questSystem', 'questSystemGlobal'],
      team: ['teamSystem', 'teamSystemGlobal'],
      inventory: ['inventorySystem', 'inventorySystemGlobal'],
      options: ['optionsSystem', 'optionsSystemGlobal'],
      pokedex: ['pokedexSystem', 'pokedexSystemGlobal'],
      battle: [
        'battleSystem', 'battleManager', 'battleNetworkHandler',
        'battleActionUI', 'pokemonMovesUI', 'koManager',
        'battleTranslator', 'battleScene'
      ]
    };
    
    Object.entries(globalIndicators).forEach(([module, globals]) => {
      const found = globals.some(globalVar => window[globalVar] !== undefined);
      
      if (found && !detectedModules.includes(module)) {
        detectedModules.push(module);
        console.log(`🌐 [LocalizationManager] Module détecté (global): ${module}`);
      }
    });
    
    // Détection Phaser Battle Scene
    if (window.game?.scene?.getScene) {
      try {
        const battleScene = window.game.scene.getScene('BattleScene');
        if (battleScene && !detectedModules.includes('battle')) {
          detectedModules.push('battle');
          console.log(`🎮 [LocalizationManager] Module détecté (Phaser): battle`);
        }
      } catch (error) {
        // Pas grave
      }
    }
    
    return detectedModules;
  }
  
  // === 🎯 API PUBLIQUE ÉTENDUE ===
  
  /**
   * Obtenir une traduction avec support variables étendu
   */
  t(path, lang = null, variables = {}) {
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
    
    // Support variables étendu
    if (variables && Object.keys(variables).length > 0) {
      translation = this.replaceVariables(translation, variables);
    }
    
    return translation;
  }
  
  /**
   * ⚔️ AMÉLIORÉ: Remplacer variables avec support formatage
   */
  replaceVariables(text, variables) {
    let result = text;
    
    Object.entries(variables).forEach(([key, value]) => {
      // Support formatage simple
      let formattedValue = value;
      
      if (key.includes('_formatted') || key.includes('Format')) {
        // Valeurs déjà formatées
        formattedValue = value;
      } else if (typeof value === 'number') {
        // Formater nombres si nécessaire
        if (key.includes('damage') || key.includes('hp')) {
          formattedValue = Math.floor(value);
        } else if (key.includes('level')) {
          formattedValue = `L.${value}`;
        }
      }
      
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), formattedValue);
    });
    
    return result;
  }
  
  /**
   * ⚔️ AMÉLIORÉ: API battle avec chargement automatique
   */
  battleT(key, variables = {}, lang = null) {
    const fullPath = `battle.ui.${key}`;
    const translation = this.t(fullPath, lang, variables);
    
    // Si pas trouvé, tenter chargement battle module
    if (translation === fullPath && !this.isModuleLoaded('battle')) {
      console.log(`⚔️ [LocalizationManager] Chargement battle module pour: ${key}`);
      this.loadModule('battle');
    }
    
    return translation;
  }
  
  /**
   * ⚔️ AMÉLIORÉ: getMoveNameT avec chargement automatique
   */
  async getMoveNameTAsync(moveId, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    // Vérifier si moves chargées
    if (!this.battleDataState.movesLoaded.has(currentLang)) {
      console.log(`⚔️ [LocalizationManager] Chargement moves ${currentLang} pour: ${moveId}`);
      await this.loadMovesForLanguage(currentLang);
    }
    
    return this.getMoveNameT(moveId, currentLang);
  }
  
  /**
   * ⚔️ AMÉLIORÉ: getPokemonNameT avec chargement automatique
   */
  async getPokemonNameTAsync(pokemonId, lang = null, withDescription = false) {
    const currentLang = lang || this.getCurrentLanguage();
    
    // Vérifier si pokémon chargés
    if (!this.battleDataState.pokemonLoaded.has(currentLang)) {
      console.log(`⚔️ [LocalizationManager] Chargement pokémon ${currentLang} pour: ${pokemonId}`);
      await this.loadPokemonForLanguage(currentLang);
    }
    
    return this.getPokemonNameT(pokemonId, currentLang, withDescription);
  }
  
  /**
   * ⚔️ NOUVEAU: API complète pour battle UI
   * @param {object} battleData - Données battle complètes
   * @param {string} lang - Langue (optionnel)
   * @returns {object} Toutes les traductions battle nécessaires
   */
  async getBattleTranslationsComplete(battleData = {}, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    // Assurer que battle data est chargée
    const loadPromises = [];
    
    if (!this.battleDataState.movesLoaded.has(currentLang)) {
      loadPromises.push(this.loadMovesForLanguage(currentLang));
    }
    
    if (!this.battleDataState.pokemonLoaded.has(currentLang)) {
      loadPromises.push(this.loadPokemonForLanguage(currentLang));
    }
    
    await Promise.all(loadPromises);
    
    // Construire traductions complètes
    const translations = {
      // Actions de base
      actions: {
        attack: this.battleT('actions.attack', {}, currentLang),
        bag: this.battleT('actions.bag', {}, currentLang),
        pokemon: this.battleT('actions.pokemon', {}, currentLang),
        run: this.battleT('actions.run', {}, currentLang)
      },
      
      // Labels
      labels: {
        yourPokemon: this.battleT('your_pokemon', {}, currentLang),
        wildPokemon: this.battleT('wild_pokemon', {}, currentLang),
        selectMove: this.battleT('moves.select_move', {}, currentLang),
        loading: this.battleT('messages.loading', {}, currentLang)
      },
      
      // Boutons
      buttons: {
        continue: this.battleT('buttons.continue', {}, currentLang),
        back: this.battleT('buttons.back', {}, currentLang),
        close: this.battleT('buttons.close', {}, currentLang),
        yes: this.battleT('buttons.yes', {}, currentLang),
        no: this.battleT('buttons.no', {}, currentLang)
      },
      
      // Status
      status: {},
      
      // Types
      types: {},
      
      // Messages dynamiques
      messages: {},
      
      // Pokémon (si données fournies)
      pokemon: {},
      
      // Moves (si données fournies)
      moves: {}
    };
    
    // Charger status
    const statusList = ['normal', 'paralyzed', 'poisoned', 'burned', 'asleep', 'frozen', 'confused', 'ko'];
    statusList.forEach(status => {
      translations.status[status] = this.battleT(`status.${status}`, {}, currentLang);
    });
    
    // Charger types
    const typeList = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    typeList.forEach(type => {
      translations.types[type] = this.getTypeNameT(type, currentLang);
    });
    
    // Messages de bataille communs
    const messageKeys = [
      'what_will_you_do', 'battle_start', 'victory', 'defeat',
      'super_effective', 'not_very_effective', 'critical_hit', 'no_effect'
    ];
    
    messageKeys.forEach(key => {
      translations.messages[key] = this.getBattleMessageT(key, {}, currentLang);
    });
    
    // Charger pokémon spécifiques si fournis
    if (battleData.pokemon && Array.isArray(battleData.pokemon)) {
      for (const pkm of battleData.pokemon) {
        if (pkm.id) {
          translations.pokemon[pkm.id] = this.getPokemonNameT(pkm.id, currentLang, true);
        }
      }
    }
    
    // Charger moves spécifiques si fournies
    if (battleData.moves && Array.isArray(battleData.moves)) {
      for (const move of battleData.moves) {
        if (move.id) {
          translations.moves[move.id] = this.getMoveNameT(move.id, currentLang);
        }
      }
    }
    
    return translations;
  }
  
  // === 🔧 MÉTHODES HÉRITÉES ÉTENDUES ===
  
  async _loadSmartModules() {
    console.log('🧠 [LocalizationManager] Stratégie SMART étendue avec Battle');
    
    const requiredModules = this.moduleConfig.required;
    const detectedModules = this.moduleConfig.loadingStrategy.detectModules 
      ? this._detectUsedModules() 
      : [];
    
    const modulesToLoad = [...new Set([...requiredModules, ...detectedModules])];
    
    console.log(`📦 [LocalizationManager] Modules à charger:`, modulesToLoad);
    
    const results = await this._loadModules(modulesToLoad);
    this._mergeAllTranslations();
    
    const success = this.loadedModules.size > 0;
    this.isReady = success;
    
    if (success) {
      console.log(`✅ [LocalizationManager] SMART chargé: ${this.loadedModules.size} modules`);
    }
    
    return success;
  }
  
  /**
   * Mise à jour composants étendue
   */
  updateExistingComponents() {
    const componentUpdaters = [
      // Composants UI standard
      () => {
        if (window.inventorySystemGlobal?.icon?.updateLanguage) {
          window.inventorySystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] InventoryIcon mis à jour');
        }
      },
      
      () => {
        if (window.teamSystemGlobal?.icon?.updateLanguage) {
          window.teamSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] TeamIcon mis à jour');
        }
      },
      
      () => {
        if (window.questSystemGlobal?.icon?.updateLanguage) {
          window.questSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] QuestIcon mis à jour');
        }
      },
      
      () => {
        if (window.optionsSystemGlobal?.icon?.updateLanguage) {
          window.optionsSystemGlobal.icon.updateLanguage();
          console.log('🔄 [LocalizationManager] OptionsIcon mis à jour');
        }
      },
      
      // ⚔️ Battle Systems étendus
      () => {
        if (window.game?.scene?.getScene('BattleScene')) {
          const battleScene = window.game.scene.getScene('BattleScene');
          if (battleScene.battleTranslator?.setLanguage) {
            const currentLang = this.getCurrentLanguage();
            battleScene.battleTranslator.setLanguage(currentLang);
            console.log('🔄 [LocalizationManager] BattleTranslator mis à jour');
          }
          
          // ⚔️ NOUVEAU: Notifier changement battle data
          if (battleScene.onBattleDataUpdated) {
            battleScene.onBattleDataUpdated();
            console.log('🔄 [LocalizationManager] BattleScene battle data mis à jour');
          }
        }
      },
      
      () => {
        if (window.battleActionUI?.updateLanguage) {
          window.battleActionUI.updateLanguage();
          console.log('🔄 [LocalizationManager] BattleActionUI mis à jour');
        }
      },
      
      // ⚔️ NOUVEAU: Pokemon Moves UI
      () => {
        if (window.pokemonMovesUI?.updateLanguage) {
          window.pokemonMovesUI.updateLanguage();
          console.log('🔄 [LocalizationManager] PokemonMovesUI mis à jour');
        }
      },
      
      // ⚔️ NOUVEAU: KO Manager
      () => {
        if (window.koManager?.updateLanguage) {
          window.koManager.updateLanguage();
          console.log('🔄 [LocalizationManager] KOManager mis à jour');
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
  
  // === 🎯 NOUVELLES APIs DE COMMODITÉ ===
  
  /**
   * ⚔️ NOUVEAU: Changer de langue et recharger battle data
   * @param {string} newLang - Nouvelle langue
   * @returns {Promise<boolean>}
   */
  async switchLanguage(newLang) {
    if (!this.moduleConfig.supportedLanguages[newLang]) {
      console.error(`❌ [LocalizationManager] Langue non supportée: ${newLang}`);
      return false;
    }
    
    console.log(`🔄 [LocalizationManager] Changement de langue vers ${newLang}...`);
    
    // Charger battle data pour nouvelle langue si battle détecté
    const needsBattleData = this._detectBattleDataNeeds();
    
    const loadPromises = [];
    
    if (needsBattleData.moves && !this.battleDataState.movesLoaded.has(newLang)) {
      loadPromises.push(this.loadMovesForLanguage(newLang));
    }
    
    if (needsBattleData.pokemon && !this.battleDataState.pokemonLoaded.has(newLang)) {
      loadPromises.push(this.loadPokemonForLanguage(newLang));
    }
    
    const results = await Promise.allSettled(loadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    // Mettre à jour tous les composants
    this.updateExistingComponents();
    
    console.log(`✅ [LocalizationManager] Langue changée vers ${newLang}, battle data: ${successful}/${results.length}`);
    return true;
  }
  
  /**
   * ⚔️ NOUVEAU: Vérifier disponibilité complète battle
   * @param {string} lang - Langue à vérifier
   * @returns {object} État de disponibilité
   */
  getBattleAvailability(lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    return {
      language: currentLang,
      uiModule: this.isModuleLoaded('battle'),
      moves: this.battleDataState.movesLoaded.has(currentLang),
      pokemon: this.battleDataState.pokemonLoaded.has(currentLang),
      isComplete: this.isModuleLoaded('battle') && 
                  this.battleDataState.movesLoaded.has(currentLang) && 
                  this.battleDataState.pokemonLoaded.has(currentLang)
    };
  }
  
  /**
   * ⚔️ NOUVEAU: Forcer rechargement complet battle
   * @param {string} lang - Langue (optionnel)
   * @returns {Promise<boolean>}
   */
  async reloadBattleData(lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    console.log(`🔄 [LocalizationManager] Rechargement battle data ${currentLang}...`);
    
    // Réinitialiser état
    this.battleDataState.movesLoaded.delete(currentLang);
    this.battleDataState.pokemonLoaded.delete(currentLang);
    this.moveTranslations.delete(currentLang);
    this.pokemonTranslations.delete(currentLang);
    
    // Recharger module UI battle
    const uiSuccess = await this.loadModule('battle', true);
    
    // Recharger battle data
    const movesSuccess = await this.loadMovesForLanguage(currentLang);
    const pokemonSuccess = await this.loadPokemonForLanguage(currentLang);
    
    if (uiSuccess || movesSuccess || pokemonSuccess) {
      this.updateExistingComponents();
    }
    
    const success = uiSuccess && movesSuccess && pokemonSuccess;
    console.log(`${success ? '✅' : '⚠️'} [LocalizationManager] Rechargement battle: UI:${uiSuccess}, Moves:${movesSuccess}, Pokémon:${pokemonSuccess}`);
    
    return success;
  }
  
  // === 🐛 DEBUG ÉTENDU ===
  
  getDebugInfo() {
    const currentLang = this.getCurrentLanguage();
    
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      mode: 'complete-battle-with-moves-and-pokemon',
      strategy: this.moduleConfig.loadingStrategy.mode,
      
      // Modules UI
      modules: {
        loaded: Array.from(this.loadedModules),
        failed: Array.from(this.failedModules),
        total: this.moduleTranslations.size
      },
      
      // ⚔️ Battle Data
      battleData: {
        currentLanguage: currentLang,
        moves: {
          loadedLanguages: Array.from(this.battleDataState.movesLoaded),
          currentLoaded: this.battleDataState.movesLoaded.has(currentLang),
          totalMoves: this.moveTranslations.get(currentLang) ? Object.keys(this.moveTranslations.get(currentLang)).length : 0
        },
        pokemon: {
          loadedLanguages: Array.from(this.battleDataState.pokemonLoaded),
          currentLoaded: this.battleDataState.pokemonLoaded.has(currentLang),
          totalPokemon: this.pokemonTranslations.get(currentLang) ? Object.keys(this.pokemonTranslations.get(currentLang)).length : 0
        },
        availability: this.getBattleAvailability(currentLang)
      },
      
      // Langues
      languages: {
        current: currentLang,
        available: this.getAvailableLanguages(),
        supported: Object.keys(this.moduleConfig.supportedLanguages),
        fallback: this.fallbackLanguage
      },
      
      // Détection périodique
      periodicDetection: {
        enabled: this.periodicDetection.enabled,
        active: !!this.periodicDetection.timerId,
        attempts: this.periodicDetection.currentAttempts,
        maxAttempts: this.periodicDetection.maxAttempts,
        detectedModules: this._detectUsedModules(),
        battleNeeds: this._detectBattleDataNeeds()
      },
      
      // Tests
      samples: {
        uiTranslation: this.isReady ? this.t('quest.label') : null,
        battleAction: this.isReady ? this.battleT('actions.attack') : null,
        moveTranslation: this.battleDataState.movesLoaded.has(currentLang) ? this.getMoveNameT('tackle') : null,
        pokemonTranslation: this.battleDataState.pokemonLoaded.has(currentLang) ? this.getPokemonNameT(1) : null
      },
      
      lastError: this.lastError?.message || null
    };
  }
  
  /**
   * ⚔️ NOUVEAU: Test complet battle avec toutes les sources
   */
  async testBattleComplete(lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    console.log(`🧪 [LocalizationManager] Test battle complet en ${currentLang}:`);
    
    if (!this.isReady) {
      console.warn('⚠️ [LocalizationManager] Manager pas prêt');
      return null;
    }
    
    // Assurer chargement complet
    await this.getBattleTranslationsComplete({}, currentLang);
    
    const results = {
      language: currentLang,
      availability: this.getBattleAvailability(currentLang),
      
      // Test UI
      ui: {
        actions: ['attack', 'bag', 'pokemon', 'run'].map(action => ({
          key: action,
          translation: this.battleT(`actions.${action}`, {}, currentLang)
        })),
        messages: ['victory', 'defeat', 'super_effective'].map(msg => ({
          key: msg,
          translation: this.getBattleMessageT(msg, {}, currentLang)
        }))
      },
      
      // Test moves
      moves: ['tackle', 'ember', 'water_gun', 'thunder_shock', 'vine_whip'].map(move => ({
        key: move,
        translation: this.getMoveNameT(move, currentLang)
      })),
      
      // Test pokémon
      pokemon: [1, 4, 7, 25, 150].map(id => ({
        id: id,
        data: this.getPokemonNameT(id, currentLang, true)
      })),
      
      // Test types
      types: ['fire', 'water', 'electric', 'grass', 'psychic'].map(type => ({
        key: type,
        translation: this.getTypeNameT(type, currentLang)
      }))
    };
    
    // Afficher résultats
    console.log('🎮 Actions UI:', results.ui.actions);
    console.log('💬 Messages:', results.ui.messages);
    console.log('⚔️ Moves:', results.moves);
    console.log('👾 Pokémon:', results.pokemon);
    console.log('🏷️ Types:', results.types);
    
    return results;
  }
  
  // === 🧹 NETTOYAGE ÉTENDU ===
  
  destroy() {
    console.log('🧹 [LocalizationManager] Destruction complète...');
    
    this.stopPeriodicDetection();
    
    // Nettoyage standard
    this.translations = null;
    this.moduleTranslations.clear();
    this.loadedModules.clear();
    this.failedModules.clear();
    
    // ⚔️ Nettoyage battle data
    this.moveTranslations.clear();
    this.pokemonTranslations.clear();
    this.battleDataState.movesLoaded.clear();
    this.battleDataState.pokemonLoaded.clear();
    this.battleDataState.loadingMoves.clear();
    this.battleDataState.loadingPokemon.clear();
    
    this.isReady = false;
    
    console.log('✅ [LocalizationManager] Destruction complète terminée');
  }
  
  // === MÉTHODES HÉRITÉES (compatibilité) ===
  
  startPeriodicDetection() {
    if (!this.periodicDetection.enabled) {
      return;
    }
    
    if (this.periodicDetection.timerId) {
      return;
    }
    
    console.log(`🔄 [LocalizationManager] Démarrage détection périodique étendue`);
    
    this.periodicDetection.timerId = setInterval(() => {
      this.checkForNewModules();
    }, this.periodicDetection.interval);
    
    setTimeout(() => {
      this.checkForNewModules();
    }, 1000);
  }
  
  stopPeriodicDetection() {
    if (this.periodicDetection.timerId) {
      clearInterval(this.periodicDetection.timerId);
      this.periodicDetection.timerId = null;
      console.log('⏹️ [LocalizationManager] Détection périodique arrêtée');
    }
  }
  
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
  
  async _loadRequiredOnly() {
    console.log('⚡ [LocalizationManager] Stratégie REQUIRED ONLY');
    
    const results = await this._loadModules(this.moduleConfig.required);
    this._mergeAllTranslations();
    
    const success = this.loadedModules.size > 0;
    this.isReady = success;
    
    console.log(`✅ [LocalizationManager] REQUIRED chargé: ${this.loadedModules.size} modules`);
    return success;
  }
  
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
  
  _getModuleFilename(moduleName) {
    const fileMapping = {
      common: 'modules/common-ui.json',
      quest: 'modules/quest-ui.json',
      team: 'modules/team-ui.json',
      inventory: 'modules/inventory-ui.json',
      options: 'modules/options-ui.json',
      pokedex: 'modules/pokedex-ui.json',
      battle: 'modules/battle-ui.json'
    };
    
    return fileMapping[moduleName] || `modules/${moduleName}-ui.json`;
  }
  
  _mergeAllTranslations() {
    console.log('🔀 [LocalizationManager] Fusion des traductions...');
    
    this.translations = {};
    
    const allLanguages = new Set();
    this.moduleTranslations.forEach(moduleData => {
      Object.keys(moduleData).forEach(lang => allLanguages.add(lang));
    });
    
    allLanguages.forEach(lang => {
      this.translations[lang] = {};
      
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
  
  getCurrentLanguage() {
    if (typeof window.GetPlayerCurrentLanguage === 'function') {
      return window.GetPlayerCurrentLanguage();
    }
    
    if (window.optionsSystem && typeof window.optionsSystem.getCurrentLanguage === 'function') {
      return window.optionsSystem.getCurrentLanguage();
    }
    
    try {
      const browserLang = navigator.language.toLowerCase().split('-')[0];
      const supportedLanguages = Object.keys(this.moduleConfig.supportedLanguages);
      
      if (supportedLanguages.includes(browserLang)) {
        return browserLang;
      }
    } catch (error) {
      console.warn('⚠️ [LocalizationManager] Erreur détection langue:', error);
    }
    
    return this.fallbackLanguage;
  }
  
  notifyModulesUpdated(newModules) {
    console.log(`📢 [LocalizationManager] Notification nouveaux modules:`, newModules);
    
    window.dispatchEvent(new CustomEvent('localizationModulesUpdated', {
      detail: { 
        newModules, 
        loadedModules: Array.from(this.loadedModules),
        totalModules: this.moduleTranslations.size,
        battleData: {
          movesLoaded: Array.from(this.battleDataState.movesLoaded),
          pokemonLoaded: Array.from(this.battleDataState.pokemonLoaded)
        }
      }
    }));
    
    this.updateExistingComponents();
  }
  
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
        
        this._mergeAllTranslations();
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
  
  async loadBattleModule(force = false) {
    console.log('⚔️ [LocalizationManager] Chargement spécifique module battle...');
    
    const success = await this.loadModule('battle', force);
    
    if (success) {
      console.log('✅ [LocalizationManager] Module battle chargé avec succès');
      
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
  
  isModuleLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }
  
  isBattleModuleLoaded() {
    return this.isModuleLoaded('battle');
  }
  
  getLoadedModules() {
    return Array.from(this.loadedModules);
  }
  
  getFailedModules() {
    return Array.from(this.failedModules);
  }
  
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
  
  hasBattleTranslation(key, lang = null) {
    const fullPath = `battle.ui.${key}`;
    return this.hasTranslation(fullPath, lang);
  }
  
  async reload() {
    console.log('🔄 [LocalizationManager] Rechargement complet...');
    
    this.stopPeriodicDetection();
    
    this.translations = null;
    this.moduleTranslations.clear();
    this.loadedModules.clear();
    this.failedModules.clear();
    
    // ⚔️ NOUVEAU: Reset battle data
    this.moveTranslations.clear();
    this.pokemonTranslations.clear();
    this.battleDataState.movesLoaded.clear();
    this.battleDataState.pokemonLoaded.clear();
    this.battleDataState.loadingMoves.clear();
    this.battleDataState.loadingPokemon.clear();
    
    this.isReady = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.lastError = null;
    
    // Reset détection périodique
    this.periodicDetection.currentAttempts = 0;
    this.periodicDetection.lastDetectedModules.clear();
    
    return await this.load();
  }
  
  // === 🔧 CONTRÔLE DÉTECTION PÉRIODIQUE ===
  
  configurePeriodicDetection(options = {}) {
    this.periodicDetection = {
      ...this.periodicDetection,
      ...options
    };
    
    console.log('🔧 [LocalizationManager] Détection périodique configurée:', this.periodicDetection);
  }
  
  disablePeriodicDetection() {
    this.stopPeriodicDetection();
    this.periodicDetection.enabled = false;
    console.log('⏹️ [LocalizationManager] Détection périodique désactivée');
  }
  
  enablePeriodicDetection() {
    this.periodicDetection.enabled = true;
    this.periodicDetection.currentAttempts = 0;
    this.startPeriodicDetection();
    console.log('🔄 [LocalizationManager] Détection périodique réactivée');
  }
  
  // === ⚔️ NOUVELLES APIs DE COMMODITÉ BATTLE ===
  
  /**
   * API pour les types Pokémon
   */
  getTypeNameT(type, lang = null) {
    const typePath = `battle.ui.types.${type}`;
    const translation = this.t(typePath, lang);
    
    if (translation === typePath) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    return translation;
  }
  
  /**
   * API pour les messages de combat avec variables
   */
  getBattleMessageT(messageKey, variables = {}, lang = null) {
    const messagePath = `battle.ui.messages.${messageKey}`;
    return this.t(messagePath, lang, variables);
  }
}

// === 🌐 INSTANCE GLOBALE ===

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
    console.error('❌ [LocalizationManager] Échec initialisation complète');
  }
  
  window.localizationManager = manager;
  
  return manager;
}

// === ⚔️ FONCTIONS GLOBALES ÉTENDUES ===

/**
 * API globale classique
 */
export function t(path, lang = null, variables = {}) {
  const manager = getLocalizationManager();
  return manager.t(path, lang, variables);
}

/**
 * ⚔️ API globale pour traductions battle
 */
export function battleT(key, variables = {}, lang = null) {
  const manager = getLocalizationManager();
  return manager.battleT(key, variables, lang);
}

/**
 * ⚔️ API globale pour noms d'attaques
 */
export function getMoveNameT(moveId, lang = null) {
  const manager = getLocalizationManager();
  return manager.getMoveNameT(moveId, lang);
}

/**
 * ⚔️ NOUVEAU: API globale async pour noms d'attaques avec auto-chargement
 */
export async function getMoveNameTAsync(moveId, lang = null) {
  const manager = getLocalizationManager();
  return await manager.getMoveNameTAsync(moveId, lang);
}

/**
 * ⚔️ API globale pour noms de types
 */
export function getTypeNameT(type, lang = null) {
  const manager = getLocalizationManager();
  return manager.getTypeNameT(type, lang);
}

/**
 * ⚔️ API globale pour messages de combat
 */
export function getBattleMessageT(messageKey, variables = {}, lang = null) {
  const manager = getLocalizationManager();
  return manager.getBattleMessageT(messageKey, variables, lang);
}

/**
 * ⚔️ NOUVEAU: API globale pour noms pokémon
 */
export function getPokemonNameT(pokemonId, lang = null, withDescription = false) {
  const manager = getLocalizationManager();
  return manager.getPokemonNameT(pokemonId, lang, withDescription);
}

/**
 * ⚔️ NOUVEAU: API globale async pour noms pokémon avec auto-chargement
 */
export async function getPokemonNameTAsync(pokemonId, lang = null, withDescription = false) {
  const manager = getLocalizationManager();
  return await manager.getPokemonNameTAsync(pokemonId, lang, withDescription);
}

/**
 * ⚔️ NOUVEAU: API globale pour descriptions pokémon
 */
export function getPokemonDescriptionT(pokemonId, lang = null) {
  const manager = getLocalizationManager();
  return manager.getPokemonDescriptionT(pokemonId, lang);
}

/**
 * ⚔️ Forcer le chargement du module battle
 */
export async function loadBattleTranslations() {
  const manager = getLocalizationManager();
  return await manager.loadBattleModule();
}

/**
 * ⚔️ NOUVEAU: Charger moves pour une langue
 */
export async function loadMovesTranslations(lang = null) {
  const manager = getLocalizationManager();
  const currentLang = lang || manager.getCurrentLanguage();
  return await manager.loadMovesForLanguage(currentLang);
}

/**
 * ⚔️ NOUVEAU: Charger pokémon pour une langue
 */
export async function loadPokemonTranslations(lang = null) {
  const manager = getLocalizationManager();
  const currentLang = lang || manager.getCurrentLanguage();
  return await manager.loadPokemonForLanguage(currentLang);
}

/**
 * ⚔️ NOUVEAU: Obtenir toutes les traductions battle nécessaires
 */
export async function getBattleTranslationsComplete(battleData = {}, lang = null) {
  const manager = getLocalizationManager();
  return await manager.getBattleTranslationsComplete(battleData, lang);
}

/**
 * ⚔️ Vérifier si les traductions battle sont prêtes
 */
export function isBattleTranslationsReady() {
  const manager = getLocalizationManager();
  return manager.isReady && manager.isBattleModuleLoaded();
}

/**
 * ⚔️ NOUVEAU: Vérifier disponibilité complète battle
 */
export function getBattleAvailability(lang = null) {
  const manager = getLocalizationManager();
  return manager.getBattleAvailability(lang);
}

/**
 * ⚔️ NOUVEAU: Changer de langue avec rechargement battle
 */
export async function switchLanguage(newLang) {
  const manager = getLocalizationManager();
  return await manager.switchLanguage(newLang);
}

/**
 * ⚔️ NOUVEAU: Recharger complètement battle data
 */
export async function reloadBattleData(lang = null) {
  const manager = getLocalizationManager();
  return await manager.reloadBattleData(lang);
}

export default LocalizationManager;

// === 🚀 INITIALISATION AUTOMATIQUE ÉTENDUE ===

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const manager = getLocalizationManager();
    
    if (!manager.isReady) {
      initLocalizationManager().then(() => {
        console.log('🌐 [LocalizationManager] Auto-initialisé au chargement DOM');
      });
    }
  }, 1000);
});

// ⚔️ Écouter les changements d'état du jeu pour battle
window.addEventListener('gameStateChanged', (event) => {
  if (event.detail?.newState === 'battle') {
    const manager = getLocalizationManager();
    
    // Charger battle UI si pas fait
    if (!manager.isBattleModuleLoaded()) {
      console.log('⚔️ [LocalizationManager] État battle - chargement UI...');
      manager.loadBattleModule();
    }
    
    // Charger battle data si pas fait
    const currentLang = manager.getCurrentLanguage();
    const availability = manager.getBattleAvailability(currentLang);
    
    if (!availability.moves) {
      console.log('⚔️ [LocalizationManager] État battle - chargement moves...');
      manager.loadMovesForLanguage(currentLang);
    }
    
    if (!availability.pokemon) {
      console.log('⚔️ [LocalizationManager] État battle - chargement pokémon...');
      manager.loadPokemonForLanguage(currentLang);
    }
  }
});

// ⚔️ NOUVEAU: Écouter les changements de langue
window.addEventListener('languageChanged', async (event) => {
  const newLang = event.detail?.newLanguage;
  if (newLang) {
    console.log(`🌐 [LocalizationManager] Changement langue détecté: ${newLang}`);
    await switchLanguage(newLang);
  }
});

// ⚔️ NOUVEAU: Écouter demandes spécifiques battle
window.addEventListener('battleTranslationsRequest', async (event) => {
  const { type, data } = event.detail || {};
  const manager = getLocalizationManager();
  
  console.log(`⚔️ [LocalizationManager] Requête battle: ${type}`, data);
  
  switch (type) {
    case 'loadComplete':
      await manager.getBattleTranslationsComplete(data);
      break;
      
    case 'loadMoves':
      await manager.loadMovesForLanguage(data.language);
      break;
      
    case 'loadPokemon':
      await manager.loadPokemonForLanguage(data.language);
      break;
      
    case 'switchLanguage':
      await manager.switchLanguage(data.language);
      break;
      
    default:
      console.warn('⚠️ [LocalizationManager] Type requête battle inconnu:', type);
  }
});

// === 🎯 HELPERS POUR BATTLE UI ===

/**
 * ⚔️ NOUVEAU: Helper pour composants battle - obtenir traductions avec fallback
 */
window.getBattleText = function(key, variables = {}, fallback = null) {
  try {
    const result = battleT(key, variables);
    return result !== `battle.ui.${key}` ? result : (fallback || key);
  } catch (error) {
    console.warn('⚠️ [LocalizationManager] Erreur getBattleText:', error);
    return fallback || key;
  }
};

/**
 * ⚔️ NOUVEAU: Helper pour noms moves avec fallback
 */
window.getMoveText = function(moveId, fallback = null) {
  try {
    return getMoveNameT(moveId) || fallback || moveId;
  } catch (error) {
    console.warn('⚠️ [LocalizationManager] Erreur getMoveText:', error);
    return fallback || moveId;
  }
};

/**
 * ⚔️ NOUVEAU: Helper pour noms pokémon avec fallback
 */
window.getPokemonText = function(pokemonId, fallback = null) {
  try {
    const result = getPokemonNameT(pokemonId);
    return (typeof result === 'string' && result !== `Pokémon #${pokemonId}`) 
      ? result 
      : (fallback || `Pokémon #${pokemonId}`);
  } catch (error) {
    console.warn('⚠️ [LocalizationManager] Erreur getPokemonText:', error);
    return fallback || `Pokémon #${pokemonId}`;
  }
};

/**
 * ⚔️ NOUVEAU: Helper pour types avec fallback
 */
window.getTypeText = function(type, fallback = null) {
  try {
    const result = getTypeNameT(type);
    return result !== type.charAt(0).toUpperCase() + type.slice(1) 
      ? result 
      : (fallback || type);
  } catch (error) {
    console.warn('⚠️ [LocalizationManager] Erreur getTypeText:', error);
    return fallback || type;
  }
};

/**
 * ⚔️ NOUVEAU: Helper async pour pré-chargement battle complet
 */
window.preloadBattleTranslations = async function(battleData = {}) {
  try {
    const manager = getLocalizationManager();
    const currentLang = manager.getCurrentLanguage();
    
    console.log('⚔️ [LocalizationManager] Pré-chargement battle complet...');
    
    // Charger en parallèle
    const promises = [
      manager.loadBattleModule(),
      manager.loadMovesForLanguage(currentLang),
      manager.loadPokemonForLanguage(currentLang)
    ];
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`⚔️ [LocalizationManager] Pré-chargement: ${successful}/3 réussi`);
    
    // Obtenir traductions complètes si data fournie
    if (battleData && Object.keys(battleData).length > 0) {
      return await manager.getBattleTranslationsComplete(battleData, currentLang);
    }
    
    return successful === 3;
    
  } catch (error) {
    console.error('❌ [LocalizationManager] Erreur pré-chargement battle:', error);
    return false;
  }
};

console.log(`
🌐 === LOCALIZATION MANAGER BATTLE COMPLET AVEC MOVES/POKÉMON ===

⚔️ NOUVELLES FONCTIONNALITÉS COMPLÈTES:
• Module battle-ui.json avec traductions FR/EN/ES/DE/IT/PT/JA/KO
• Fichiers moves séparés: /localization/moves/moves_XX.json
• Fichiers pokémon séparés: /localization/pokemon/gen1/XX.json
• Chargement automatique et intelligent par langue
• Cache optimisé avec état détaillé battle data

🔧 APIs BATTLE ÉTENDUES:
• battleT('actions.attack') → traduction UI
• getMoveNameT('tackle') → "Charge" depuis moves_fr.json
• getPokemonNameT(1) → "Bulbizarre" depuis fr.json 
• getPokemonNameT(1, 'en', true) → {name: "Bulbasaur", description: "..."}
• getBattleTranslationsComplete() → toutes traductions battle

🚀 APIs ASYNC AVEC AUTO-CHARGEMENT:
• getMoveNameTAsync('tackle') → charge moves si nécessaire
• getPokemonNameTAsync(25, 'fr', true) → charge pokémon si nécessaire
• preloadBattleTranslations() → pré-charge tout

🎯 HELPERS WINDOW GLOBAUX:
• window.getBattleText('actions.attack', {}, 'FIGHT')
• window.getMoveText('tackle', 'Tackle')
• window.getPokemonText(1, 'Pokémon #1')
• window.getTypeText('fire', 'Fire')
• window.preloadBattleTranslations(battleData)

🔄 DÉTECTION ÉTENDUE:
• Détecte besoins moves/pokémon automatiquement
• Charge par langue selon contexte
• Notification composants battle extended

📊 DEBUG COMPLET:
• window.localizationManager.testBattleComplete()
• window.localizationManager.getBattleAvailability()
• window.localizationManager.getDebugInfo()

📁 STRUCTURE FICHIERS:
/localization/
├── modules/battle-ui.json (UI battle)
├── moves/moves_XX.json (noms moves)
└── pokemon/gen1/XX.json (noms + descriptions)

🎮 ÉVÉNEMENTS ÉTENDUS:
• 'gameStateChanged' → charge battle auto
• 'languageChanged' → reload battle data
• 'battleTranslationsRequest' → requêtes spécifiques

✅ TOTALEMENT OPTIMISÉ POUR BATTLE UI !
`);
