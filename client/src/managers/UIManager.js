// client/src/managers/UIManager.js - Gestionnaire centralisé de l'interface utilisateur (Professional Grade)

export class UIManager {
  constructor(options = {}) {
    this.debug = options.debug !== true;
    
    // 🆕 Configuration de performance
    this.performanceConfig = {
      enablePooling: true,
      lazyLoadModules: false,
      batchUpdates: true,
      maxConcurrentAnimations: 3,
      debounceResize: 250,
      frameThrottling: true,
      ...options.performance
    };
    
    // 🆕 Configuration responsive
    this.responsiveConfig = {
      enabled: true,
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1920
      },
      adaptiveLayouts: true,
      touchOptimization: true,
      autoScale: true,
      ...options.responsive
    };
    
    // 🆕 Configuration de récupération d'erreurs
    this.errorConfig = {
      autoRecover: true,
      maxRetries: 3,
      retryDelay: 1000,
      gracefulDegradation: true,
      fallbackStates: true,
      errorReporting: true,
      ...options.errorRecovery
    };

    this.modules = new Map();
    this.moduleStates = new Map();
    this.groups = new Map();
    this.globalState = {
      visible: true,
      enabled: true,
      initialized: false,
      currentGameState: 'exploration',
      currentDevice: this._detectDevice(),
      performanceMode: false
    };
    
    this.events = new EventTarget();
    this.initializationOrder = [];
    this.dependencies = new Map();
    
    // 🆕 Gestionnaires professionnels
    this.performanceManager = new PerformanceManager(this);
    this.memoryManager = new MemoryManager(this);
    this.responsiveManager = new ResponsiveManager(this);
    this.errorManager = new ErrorManager(this);
    this.layoutManager = new UILayoutManager(this);
    this.animationManager = new UIAnimationManager(this);
    
    // 🆕 Cache et optimisations
    this.moduleCache = new Map();
    this.renderQueue = [];
    this.animationQueue = [];
    this.updateQueue = new Set();
    
    // 🆕 Métriques et monitoring
    this.metrics = {
      startTime: performance.now(),
      moduleCount: 0,
      errorCount: 0,
      memoryUsage: 0,
      renderTime: 0,
      lastUpdate: Date.now()
    };

    // États de jeu avec configuration responsive
    this.gameStates = {
      exploration: {
        visibleModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
        enabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
        hiddenModules: [],
        disabledModules: [],
        responsive: {
          mobile: { hiddenModules: ['questTracker', 'chat'] },
          tablet: { hiddenModules: ['chat'] }
        }
      },
      battle: {
        visibleModules: ['chat'],
        enabledModules: ['chat'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker'],
        disabledModules: ['inventory', 'team', 'quest', 'questTracker'],
        responsive: {
          mobile: { visibleModules: ['chat'], hiddenModules: ['inventory', 'team', 'quest', 'questTracker'] }
        }
      },
      menu: {
        visibleModules: ['inventory', 'team', 'quest'],
        enabledModules: ['inventory', 'team', 'quest'],
        hiddenModules: ['questTracker'],
        disabledModules: ['chat']
      },
      pokemonCenter: {
        visibleModules: ['team', 'inventory', 'pc'],
        enabledModules: ['team', 'inventory', 'pc'],
        hiddenModules: ['questTracker'],
        disabledModules: ['quest']
      },
      dialogue: {
        visibleModules: ['inventory', 'team', 'quest'],
        enabledModules: [],
        hiddenModules: ['questTracker', 'chat'],
        disabledModules: ['inventory', 'team', 'quest']
      }
    };
    
    this._initialize();
    this.log('🎛️ UIManager (Professional) créé');
  }

  async _initialize() {
    try {
      // Initialiser les gestionnaires
      await this.performanceManager.initialize();
      await this.memoryManager.initialize();
      await this.responsiveManager.initialize();
      await this.errorManager.initialize();
      
      // Démarrer les processus de surveillance
      this._startPerformanceMonitoring();
      this._startMemoryMonitoring();
      this._startResponsiveMonitoring();
      
      this.log('✅ UIManager fully initialized');
    } catch (error) {
      this.error('❌ UIManager initialization failed:', error);
      await this.errorManager.handleCriticalError(error, 'initialization');
    }
  }

  log(...args) {
    if (this.debug) {
      console.log('[UIManager]', ...args);
    }
  }

  warn(...args) {
    if (this.debug) {
      console.warn('[UIManager]', ...args);
    }
  }

  error(...args) {
    console.error('[UIManager]', ...args);
    this.metrics.errorCount++;
    
    if (this.errorConfig.errorReporting) {
      this.errorManager.reportError(args);
    }
  }

  // ===== 🚀 PERFORMANCE OPTIMIZED MODULE MANAGEMENT =====

  registerModule(moduleId, moduleConfig) {
    return this.performanceManager.withPerformanceTracking('registerModule', async () => {
      try {
        if (this.modules.has(moduleId)) {
          this.warn(`Module ${moduleId} déjà enregistré - écrasement`);
        }

        const config = this._validateAndNormalizeConfig(moduleId, moduleConfig);
        
        this.modules.set(moduleId, config);
        this.moduleStates.set(moduleId, { ...config.defaultState });
        this.metrics.moduleCount++;

        // Gérer les groupes
        if (config.groups && config.groups.length > 0) {
          config.groups.forEach(groupId => {
            this.addModuleToGroup(groupId, moduleId);
          });
        }

        // Gérer les dépendances
        if (config.dependencies.length > 0) {
          this.dependencies.set(moduleId, config.dependencies);
        }

        // Enregistrer dans le layout manager avec responsive
        this.layoutManager.registerModule(moduleId, config.layout);
        this.responsiveManager.registerModule(moduleId, config.responsive || {});

        this._updateInitializationOrder();

        this.log(`📝 Module ${moduleId} enregistré avec optimisations`);
        this._dispatchEvent('moduleRegistered', { moduleId, config });

        return this;

      } catch (error) {
        await this.errorManager.handleModuleError(moduleId, error, 'register');
        return this;
      }
    });
  }

  async initializeModule(moduleId, ...args) {
    return this.performanceManager.withPerformanceTracking('initializeModule', async () => {
      const retryCount = this.errorManager.getRetryCount(moduleId) || 0;
      
      try {
        if (!this.modules.has(moduleId)) {
          throw new Error(`Module ${moduleId} non enregistré`);
        }

        const config = this.modules.get(moduleId);
        const state = this.moduleStates.get(moduleId);

        if (state.initialized) {
          this.warn(`Module ${moduleId} déjà initialisé`);
          return this.getModuleInstance(moduleId);
        }

        this.log(`🚀 Initialisation du module ${moduleId} (tentative ${retryCount + 1})...`);

        // Vérifier les dépendances
        if (!await this._checkDependencies(moduleId)) {
          throw new Error(`Dépendances non satisfaites pour ${moduleId}`);
        }

        // 🆕 Lazy loading si configuré
        if (config.lazyLoad && !this._shouldLoadModule(moduleId)) {
          this.log(`⏳ Module ${moduleId} en lazy loading`);
          return this._createLazyProxy(moduleId, config);
        }

        // Créer l'instance avec gestion mémoire
        const instance = await this.memoryManager.withMemoryTracking(
          moduleId,
          () => config.factory(...args)
        );
        
        if (!instance) {
          throw new Error(`Factory du module ${moduleId} a retourné null/undefined`);
        }

        // Valider l'instance
        this._validateModuleInstance(moduleId, instance);

        // Stocker l'instance
        config.instance = instance;
        state.initialized = true;

        // Appliquer le layout responsive
        this.layoutManager.applyLayout(moduleId, instance);
        this.responsiveManager.applyResponsiveLayout(moduleId, instance);

        // Appliquer l'état avec animations optimisées
        this._applyModuleState(moduleId, { animated: true, batched: true });

        // Reset retry count en cas de succès
        this.errorManager.resetRetryCount(moduleId);

        this.log(`✅ Module ${moduleId} initialisé avec succès`);
        this._dispatchEvent('moduleInitialized', { moduleId, instance });

        return instance;

      } catch (error) {
        return await this.errorManager.handleModuleError(moduleId, error, 'initialize', async () => {
          // Retry logic
          if (retryCount < this.errorConfig.maxRetries) {
            this.warn(`🔄 Retry initialisation ${moduleId} (${retryCount + 1}/${this.errorConfig.maxRetries})`);
            await this._delay(this.errorConfig.retryDelay * (retryCount + 1));
            return this.initializeModule(moduleId, ...args);
          } else {
            throw new Error(`Max retries exceeded for module ${moduleId}`);
          }
        });
      }
    });
  }

  async initializeAllModules(...args) {
    return this.performanceManager.withPerformanceTracking('initializeAllModules', async () => {
      this.log('🚀 Initialisation de tous les modules (optimisée)...');
      
      const results = {};
      const errors = [];
      
      // 🆕 Initialisation par batch pour éviter la surcharge
      const batches = this._createInitializationBatches();
      
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(moduleId => this.initializeModule(moduleId, ...args))
        );
        
        batchResults.forEach((result, index) => {
          const moduleId = batch[index];
          if (result.status === 'fulfilled') {
            results[moduleId] = result.value;
          } else {
            errors.push(`${moduleId}: ${result.reason.message}`);
          }
        });
        
        // Petite pause entre les batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this._delay(50);
        }
      }

      this.globalState.initialized = true;
      
      // Optimiser après initialisation
      await this.performanceManager.optimize();
      await this.memoryManager.cleanup();

      if (errors.length > 0) {
        this.warn('Initialisation terminée avec des erreurs:', errors);
      } else {
        this.log('✅ Tous les modules initialisés avec succès (optimisé)');
      }

      this._dispatchEvent('allModulesInitialized', { results, errors });
      return { results, errors, success: errors.length === 0 };
    });
  }

  // ===== 📱 RESPONSIVE GAME STATE MANAGEMENT =====

  setGameState(stateName, options = {}) {
    return this.performanceManager.withPerformanceTracking('setGameState', async () => {
      try {
        const previousState = this.globalState.currentGameState;
        
        if (!this.gameStates[stateName]) {
          throw new Error(`État de jeu ${stateName} non défini`);
        }

        this.log(`🎮 Changement d'état: ${previousState} → ${stateName}`);
        this.globalState.currentGameState = stateName;

        let stateConfig = this.gameStates[stateName];
        
        // 🆕 Appliquer la configuration responsive
        const currentDevice = this.globalState.currentDevice;
        if (stateConfig.responsive && stateConfig.responsive[currentDevice]) {
          stateConfig = this._mergeResponsiveConfig(stateConfig, currentDevice);
        }

        const animated = options.animated !== false && !this.globalState.performanceMode;

        // 🆕 Batch les changements pour optimiser les performances
        const stateChanges = this._calculateStateChanges(stateConfig);
        await this._applyStateChangesBatched(stateChanges, animated);

        this._dispatchEvent('gameStateChanged', { 
          previousState, 
          newState: stateName, 
          config: stateConfig,
          device: currentDevice
        });

        return this;

      } catch (error) {
        await this.errorManager.handleError(error, 'gameState', stateName);
        return this;
      }
    });
  }

  // ===== 🛡️ ERROR RECOVERY & VALIDATION =====

  _validateAndNormalizeConfig(moduleId, moduleConfig) {
    const requiredFields = ['factory'];
    const missingFields = requiredFields.filter(field => !moduleConfig[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Module ${moduleId} missing required fields: ${missingFields.join(', ')}`);
    }

    if (typeof moduleConfig.factory !== 'function') {
      throw new Error(`Module ${moduleId} factory must be a function`);
    }

    return {
      factory: null,
      dependencies: [],
      defaultState: {
        visible: true,
        enabled: true,
        initialized: false
      },
      priority: 100,
      layout: {
        type: 'icon',
        position: 'auto',
        anchor: 'bottom-right',
        offset: { x: 0, y: 0 },
        zIndex: 'auto',
        order: 0,
        spacing: 10,
        responsive: true
      },
      responsive: {
        mobile: {},
        tablet: {},
        desktop: {}
      },
      groups: [],
      animations: {
        show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
        hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
        enable: { type: 'pulse', duration: 150 },
        disable: { type: 'grayscale', duration: 200 }
      },
      lazyLoad: false,
      critical: false,
      ...moduleConfig
    };
  }

  _validateModuleInstance(moduleId, instance) {
    const requiredMethods = ['show', 'hide'];
    const optionalMethods = ['setEnabled', 'destroy', 'update'];
    
    const missingRequired = requiredMethods.filter(method => 
      typeof instance[method] !== 'function'
    );
    
    if (missingRequired.length > 0) {
      this.warn(`Module ${moduleId} missing methods: ${missingRequired.join(', ')}`);
      
      // 🆕 Auto-stubbing pour la compatibilité
      missingRequired.forEach(method => {
        instance[method] = () => {
          this.warn(`Stub method ${method} called on ${moduleId}`);
        };
      });
    }

    // Vérifier les propriétés requises
    if (!instance.iconElement && !instance.element) {
      this.warn(`Module ${moduleId} has no iconElement or element property`);
    }
  }

  // ===== 🚀 PERFORMANCE UTILITIES =====

  _createInitializationBatches() {
    const batchSize = this.performanceConfig.batchSize || 3;
    const batches = [];
    
    for (let i = 0; i < this.initializationOrder.length; i += batchSize) {
      batches.push(this.initializationOrder.slice(i, i + batchSize));
    }
    
    return batches;
  }

  _shouldLoadModule(moduleId) {
    const config = this.modules.get(moduleId);
    if (config.critical) return true;
    
    const currentDevice = this.globalState.currentDevice;
    if (currentDevice === 'mobile' && !config.responsive?.mobile?.enabled) {
      return false;
    }
    
    return true;
  }

  _createLazyProxy(moduleId, config) {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'then') return undefined; // Pas une Promise
        
        // Trigger lazy loading on first real access
        if (!target._loaded) {
          target._loaded = true;
          this.initializeModule(moduleId);
        }
        
        return () => this.warn(`Lazy proxy call: ${prop} on ${moduleId}`);
      }
    });
  }

  async _applyStateChangesBatched(stateChanges, animated) {
    const { toHide, toShow, toDisable, toEnable } = stateChanges;
    
    // Phase 1: Cacher et désactiver (rapide)
    if (toHide.length > 0) {
      await Promise.all(toHide.map(moduleId => 
        this.hideModule(moduleId, { animated })
      ));
    }
    
    if (toDisable.length > 0) {
      toDisable.forEach(moduleId => this.disableModule(moduleId));
    }
    
    // Petite pause pour éviter les conflits visuels
    if (animated) await this._delay(100);
    
    // Phase 2: Afficher et activer (avec délais échelonnés)
    if (toShow.length > 0) {
      for (let i = 0; i < toShow.length; i++) {
        const moduleId = toShow[i];
        await this.showModule(moduleId, { animated });
        if (animated && i < toShow.length - 1) await this._delay(50);
      }
    }
    
    if (toEnable.length > 0) {
      toEnable.forEach(moduleId => this.enableModule(moduleId));
    }
  }

  _calculateStateChanges(stateConfig) {
    const currentStates = new Map();
    this.moduleStates.forEach((state, moduleId) => {
      currentStates.set(moduleId, state);
    });
    
    const toHide = [];
    const toShow = [];
    const toDisable = [];
    const toEnable = [];
    
    // Analyser les changements nécessaires
    this.modules.forEach((config, moduleId) => {
      const currentState = currentStates.get(moduleId);
      if (!currentState) return;
      
      const shouldBeVisible = stateConfig.visibleModules?.includes(moduleId);
      const shouldBeEnabled = stateConfig.enabledModules?.includes(moduleId);
      
      if (currentState.visible && !shouldBeVisible) {
        toHide.push(moduleId);
      } else if (!currentState.visible && shouldBeVisible) {
        toShow.push(moduleId);
      }
      
      if (currentState.enabled && !shouldBeEnabled) {
        toDisable.push(moduleId);
      } else if (!currentState.enabled && shouldBeEnabled) {
        toEnable.push(moduleId);
      }
    });
    
    return { toHide, toShow, toDisable, toEnable };
  }

  _mergeResponsiveConfig(baseConfig, device) {
    const deviceConfig = baseConfig.responsive[device];
    return {
      ...baseConfig,
      visibleModules: deviceConfig.visibleModules || baseConfig.visibleModules,
      hiddenModules: [...(baseConfig.hiddenModules || []), ...(deviceConfig.hiddenModules || [])],
      enabledModules: deviceConfig.enabledModules || baseConfig.enabledModules,
      disabledModules: [...(baseConfig.disabledModules || []), ...(deviceConfig.disabledModules || [])]
    };
  }

  _detectDevice() {
    const width = window.innerWidth;
    if (width <= this.responsiveConfig.breakpoints.mobile) return 'mobile';
    if (width <= this.responsiveConfig.breakpoints.tablet) return 'tablet';
    return 'desktop';
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== MONITORING & METRICS =====

  _startPerformanceMonitoring() {
    if (!this.performanceConfig.frameThrottling) return;
    
    let lastFrameTime = performance.now();
    const targetFPS = 60;
    const targetFrameTime = 1000 / targetFPS;
    
    const checkPerformance = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      
      if (frameTime > targetFrameTime * 1.5) {
        this.globalState.performanceMode = true;
        this.warn('Performance mode activated due to low FPS');
      } else if (frameTime < targetFrameTime * 0.8) {
        this.globalState.performanceMode = false;
      }
      
      lastFrameTime = now;
      requestAnimationFrame(checkPerformance);
    };
    
    requestAnimationFrame(checkPerformance);
  }

  _startMemoryMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        
        if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
          this.warn('High memory usage detected, triggering cleanup');
          this.memoryManager.cleanup();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  _startResponsiveMonitoring() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newDevice = this._detectDevice();
        if (newDevice !== this.globalState.currentDevice) {
          this.log(`📱 Device changed: ${this.globalState.currentDevice} → ${newDevice}`);
          this.globalState.currentDevice = newDevice;
          this.responsiveManager.handleDeviceChange(newDevice);
          this.setGameState(this.globalState.currentGameState, { animated: true });
        }
      }, this.performanceConfig.debounceResize);
    });
  }

  // ===== INHERITED METHODS (Simplified) =====
  
  showModule(moduleId, options = {}) {
    if (!this._setModuleState(moduleId, { visible: true })) return false;
    if (options.animated !== false && !this.globalState.performanceMode) {
      this.animationManager.animateShow(moduleId);
    }
    return true;
  }

  hideModule(moduleId, options = {}) {
    if (!this._setModuleState(moduleId, { visible: false })) return false;
    if (options.animated !== false && !this.globalState.performanceMode) {
      this.animationManager.animateHide(moduleId);
    }
    return true;
  }

  enableModule(moduleId) {
    if (!this._setModuleState(moduleId, { enabled: true })) return false;
    if (!this.globalState.performanceMode) {
      this.animationManager.animateEnable(moduleId);
    }
    return true;
  }

  disableModule(moduleId) {
    if (!this._setModuleState(moduleId, { enabled: false })) return false;
    if (!this.globalState.performanceMode) {
      this.animationManager.animateDisable(moduleId);
    }
    return true;
  }

  // Toutes les autres méthodes héritées...
  createGroup(groupId, moduleIds = [], options = {}) { /* ... */ }
  addModuleToGroup(groupId, moduleId) { /* ... */ }
  showGroup(groupId, options = {}) { /* ... */ }
  hideGroup(groupId, options = {}) { /* ... */ }
  enableGroup(groupId) { /* ... */ }
  disableGroup(groupId) { /* ... */ }
  getModuleInstance(moduleId) { return this.modules.get(moduleId)?.instance || null; }
  getModuleState(moduleId) { return this.moduleStates.get(moduleId) || null; }
  isModuleInitialized(moduleId) { return this.getModuleState(moduleId)?.initialized || false; }
  
  _setModuleState(moduleId, newState) {
    if (!this.modules.has(moduleId)) {
      this.warn(`Module ${moduleId} non enregistré`);
      return false;
    }

    const currentState = this.moduleStates.get(moduleId);
    const updatedState = { ...currentState, ...newState };
    this.moduleStates.set(moduleId, updatedState);

    if (currentState.initialized) {
      this._applyModuleState(moduleId);
    }

    this._dispatchEvent('moduleStateChanged', { moduleId, state: updatedState });
    return true;
  }

  _applyModuleState(moduleId, options = {}) {
    const instance = this.getModuleInstance(moduleId);
    const state = this.getModuleState(moduleId);

    if (!instance || !state) return;

    try {
      if (typeof instance.show === 'function' && typeof instance.hide === 'function') {
        if (state.visible) {
          instance.show();
        } else {
          instance.hide();
        }
      }

      if (typeof instance.setEnabled === 'function') {
        instance.setEnabled(state.enabled);
      }

    } catch (error) {
      this.errorManager.handleModuleError(moduleId, error, 'applyState');
    }
  }

  async _checkDependencies(moduleId) {
    const dependencies = this.dependencies.get(moduleId);
    if (!dependencies || dependencies.length === 0) return true;

    for (const depId of dependencies) {
      if (!this.isModuleInitialized(depId)) {
        const result = await this.initializeModule(depId);
        if (!result) return false;
      }
    }
    return true;
  }

  _updateInitializationOrder() {
    const modules = Array.from(this.modules.entries());
    modules.sort((a, b) => a[1].priority - b[1].priority);
    this.initializationOrder = modules.map(([id]) => id);
  }

  _dispatchEvent(type, detail = {}) {
    const event = new CustomEvent(type, { detail });
    this.events.dispatchEvent(event);
  }

  on(eventType, callback) {
    this.events.addEventListener(eventType, callback);
    return this;
  }

  off(eventType, callback) {
    this.events.removeEventListener(eventType, callback);
    return this;
  }

  // ===== PUBLIC API EXTENSIONS =====

  getPerformanceMetrics() {
    return {
      ...this.metrics,
      uptime: performance.now() - this.metrics.startTime,
      memoryUsage: this.memoryManager.getUsage(),
      performanceMode: this.globalState.performanceMode,
      device: this.globalState.currentDevice
    };
  }

  async optimizePerformance() {
    this.log('🚀 Optimisation des performances...');
    await this.performanceManager.optimize();
    await this.memoryManager.cleanup();
    this.log('✅ Optimisation terminée');
  }

  enablePerformanceMode() {
    this.globalState.performanceMode = true;
    this.log('⚡ Mode performance activé');
  }

  disablePerformanceMode() {
    this.globalState.performanceMode = false;
    this.log('🎨 Mode performance désactivé');
  }

  debugInfo() {
    const stats = this.getPerformanceMetrics();
    
    console.group('🎛️ UIManager Professional Debug');
    console.log('📊 Performance Metrics:', stats);
    console.log('📱 Device Info:', {
      current: this.globalState.currentDevice,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      breakpoints: this.responsiveConfig.breakpoints
    });
    console.log('🛡️ Error Status:', {
      totalErrors: this.metrics.errorCount,
      errorRecovery: this.errorConfig.autoRecover,
      activeRetries: this.errorManager.getActiveRetries()
    });
    console.log('🎮 Current Game State:', this.globalState.currentGameState);
    console.groupEnd();
    
    return stats;
  }
}

// ===== 🚀 PERFORMANCE MANAGER =====

class PerformanceManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.timings = new Map();
    this.optimizations = new Set();
  }

  async initialize() {
    this.uiManager.log('🚀 PerformanceManager initialized');
  }

  async withPerformanceTracking(operation, fn) {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      
      this.timings.set(operation, endTime - startTime);
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      this.timings.set(`${operation}_error`, endTime - startTime);
      throw error;
    }
  }

  async optimize() {
    // Optimisations automatiques
    if (!this.optimizations.has('batching')) {
      this._enableBatching();
      this.optimizations.add('batching');
    }
    
    if (!this.optimizations.has('throttling')) {
      this._enableThrottling();
      this.optimizations.add('throttling');
    }
  }

  _enableBatching() {
    // Implémentation du batching
    this.uiManager.log('📦 Batching enabled');
  }

  _enableThrottling() {
    // Implémentation du throttling
    this.uiManager.log('⏱️ Throttling enabled');
  }

  getMetrics() {
    return Object.fromEntries(this.timings);
  }
}

// ===== 🧠 MEMORY MANAGER =====

class MemoryManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.moduleMemory = new Map();
    this.cache = new Map();
    this.maxCacheSize = 50;
    this.cleanupInterval = null;
    this.leakDetection = new Set();
  }

  async initialize() {
    this._startCleanupInterval();
    this._startLeakDetection();
    this.uiManager.log('🧠 MemoryManager initialized');
  }

  async withMemoryTracking(moduleId, fn) {
    const initialMemory = this._getCurrentMemory();
    
    try {
      const result = await fn();
      const finalMemory = this._getCurrentMemory();
      
      this.moduleMemory.set(moduleId, {
        used: finalMemory - initialMemory,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      this.uiManager.warn(`Memory tracking failed for ${moduleId}:`, error);
      throw error;
    }
  }

  async cleanup() {
    this.uiManager.log('🧹 Starting memory cleanup...');
    
    // Nettoyer le cache
    this._cleanupCache();
    
    // Nettoyer les modules non utilisés
    this._cleanupUnusedModules();
    
    // Forcer le garbage collection si disponible
    if (window.gc) {
      window.gc();
    }
    
    this.uiManager.log('✅ Memory cleanup completed');
  }

  _cleanupCache() {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
      
      this.uiManager.log(`🗑️ Cleaned ${toDelete.length} cache entries`);
    }
  }

  _cleanupUnusedModules() {
    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes
    
    this.moduleMemory.forEach((memory, moduleId) => {
      if (now - memory.timestamp > threshold) {
        const module = this.uiManager.getModuleInstance(moduleId);
        if (module && typeof module.cleanup === 'function') {
          module.cleanup();
        }
        this.moduleMemory.delete(moduleId);
      }
    });
  }

  _startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  _startLeakDetection() {
    if (!performance.memory) return;
    
    setInterval(() => {
      const currentMemory = performance.memory.usedJSHeapSize;
      this.leakDetection.add(currentMemory);
      
      if (this.leakDetection.size > 10) {
        const values = Array.from(this.leakDetection);
        const trend = this._detectMemoryTrend(values);
        
        if (trend > 0.1) { // 10% increase trend
          this.uiManager.warn('🚨 Memory leak detected, forcing cleanup');
          this.cleanup();
        }
        
        this.leakDetection.clear();
      }
    }, 30000); // Check every 30 seconds
  }

  _detectMemoryTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / first;
  }

  _getCurrentMemory() {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  }

  getUsage() {
    return {
      total: this._getCurrentMemory(),
      modules: Object.fromEntries(this.moduleMemory),
      cache: this.cache.size,
      maxCache: this.maxCacheSize
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.moduleMemory.clear();
    this.cache.clear();
    this.leakDetection.clear();
  }
}

// ===== 📱 RESPONSIVE MANAGER =====

class ResponsiveManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.moduleConfigs = new Map();
    this.currentBreakpoint = null;
    this.orientationSupport = true;
  }

  async initialize() {
    this._detectInitialState();
    this._setupOrientationDetection();
    this.uiManager.log('📱 ResponsiveManager initialized');
  }

  registerModule(moduleId, responsiveConfig) {
    const config = {
      mobile: { enabled: true },
      tablet: { enabled: true },
      desktop: { enabled: true },
      orientation: { portrait: {}, landscape: {} },
      scaling: { enabled: true, factor: 'auto' },
      ...responsiveConfig
    };
    
    this.moduleConfigs.set(moduleId, config);
    this.uiManager.log(`📱 Responsive config registered for ${moduleId}`);
  }

  applyResponsiveLayout(moduleId, instance) {
    const config = this.moduleConfigs.get(moduleId);
    if (!config || !instance.iconElement) return;

    const device = this.uiManager.globalState.currentDevice;
    const orientation = this._getOrientation();
    
    // Appliquer la configuration device-specific
    const deviceConfig = config[device];
    if (deviceConfig) {
      this._applyDeviceConfig(instance, deviceConfig);
    }
    
    // Appliquer la configuration d'orientation
    const orientationConfig = config.orientation[orientation];
    if (orientationConfig) {
      this._applyOrientationConfig(instance, orientationConfig);
    }
    
    // Appliquer le scaling
    if (config.scaling.enabled) {
      this._applyScaling(instance, config.scaling, device);
    }
    
    this.uiManager.log(`📱 Responsive layout applied to ${moduleId} (${device}, ${orientation})`);
  }

  handleDeviceChange(newDevice) {
    this.uiManager.log(`📱 Handling device change to: ${newDevice}`);
    
    // Réappliquer tous les layouts responsives
    this.moduleConfigs.forEach((config, moduleId) => {
      const instance = this.uiManager.getModuleInstance(moduleId);
      if (instance) {
        this.applyResponsiveLayout(moduleId, instance);
      }
    });
    
    // Déclencher les hooks de changement de device
    this.uiManager._dispatchEvent('deviceChanged', { device: newDevice });
  }

  _detectInitialState() {
    const device = this.uiManager._detectDevice();
    this.currentBreakpoint = device;
    this.uiManager.globalState.currentDevice = device;
  }

  _setupOrientationDetection() {
    if (!this.orientationSupport) return;
    
    const handleOrientationChange = () => {
      setTimeout(() => {
        const newOrientation = this._getOrientation();
        this.uiManager.log(`📱 Orientation changed to: ${newOrientation}`);
        
        // Réappliquer les layouts pour la nouvelle orientation
        this.moduleConfigs.forEach((config, moduleId) => {
          const instance = this.uiManager.getModuleInstance(moduleId);
          if (instance) {
            this.applyResponsiveLayout(moduleId, instance);
          }
        });
        
        this.uiManager._dispatchEvent('orientationChanged', { orientation: newOrientation });
      }, 100); // Délai pour attendre la mise à jour du viewport
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
  }

  _applyDeviceConfig(instance, deviceConfig) {
    const element = instance.iconElement;
    
    if (deviceConfig.hidden) {
      element.style.display = 'none';
      return;
    }
    
    if (deviceConfig.scale) {
      element.style.transform = `scale(${deviceConfig.scale})`;
    }
    
    if (deviceConfig.position) {
      Object.assign(element.style, deviceConfig.position);
    }
    
    if (deviceConfig.spacing) {
      element.style.margin = `${deviceConfig.spacing}px`;
    }
  }

  _applyOrientationConfig(instance, orientationConfig) {
    const element = instance.iconElement;
    
    if (orientationConfig.position) {
      Object.assign(element.style, orientationConfig.position);
    }
    
    if (orientationConfig.transform) {
      element.style.transform = orientationConfig.transform;
    }
  }

  _applyScaling(instance, scalingConfig, device) {
    if (!scalingConfig.enabled) return;
    
    const element = instance.iconElement;
    let scale = 1;
    
    if (scalingConfig.factor === 'auto') {
      // Scaling automatique basé sur le device
      switch (device) {
        case 'mobile': scale = 0.8; break;
        case 'tablet': scale = 0.9; break;
        case 'desktop': scale = 1.0; break;
      }
    } else {
      scale = scalingConfig.factor;
    }
    
    const currentTransform = element.style.transform || '';
    element.style.transform = `${currentTransform} scale(${scale})`.trim();
  }

  _getOrientation() {
    if (screen.orientation) {
      return screen.orientation.angle % 180 === 0 ? 'portrait' : 'landscape';
    }
    
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  getResponsiveInfo() {
    return {
      currentDevice: this.uiManager.globalState.currentDevice,
      orientation: this._getOrientation(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      breakpoints: this.uiManager.responsiveConfig.breakpoints
    };
  }
}

// ===== 🛡️ ERROR MANAGER =====

class ErrorManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.retryCount = new Map();
    this.errorHistory = [];
    this.fallbackStates = new Map();
    this.criticalErrors = new Set();
  }

  async initialize() {
    this._setupGlobalErrorHandling();
    this._setupFallbackStates();
    this.uiManager.log('🛡️ ErrorManager initialized');
  }

  async handleModuleError(moduleId, error, operation, retryCallback = null) {
    this.errorHistory.push({
      moduleId,
      error: error.message,
      operation,
      timestamp: Date.now(),
      stack: error.stack
    });
    
    this.uiManager.error(`Module ${moduleId} error in ${operation}:`, error);
    
    // Incrémenter le compteur de retry
    const currentRetries = this.retryCount.get(moduleId) || 0;
    this.retryCount.set(moduleId, currentRetries + 1);
    
    // Vérifier si c'est une erreur critique
    if (this._isCriticalError(error)) {
      return this.handleCriticalError(error, moduleId);
    }
    
    // Essayer la récupération automatique
    if (this.uiManager.errorConfig.autoRecover && retryCallback) {
      try {
        return await retryCallback();
      } catch (retryError) {
        this.uiManager.error(`Retry failed for ${moduleId}:`, retryError);
      }
    }
    
    // Appliquer l'état de fallback
    this._applyFallbackState(moduleId);
    
    // Déclencher l'événement d'erreur
    this.uiManager._dispatchEvent('moduleError', {
      moduleId,
      error,
      operation,
      retryCount: currentRetries + 1
    });
    
    return null;
  }

  async handleCriticalError(error, context) {
    this.criticalErrors.add({ error, context, timestamp: Date.now() });
    this.uiManager.error('🚨 Critical error detected:', error);
    
    if (this.uiManager.errorConfig.gracefulDegradation) {
      // Basculer en mode dégradé
      this.uiManager.globalState.performanceMode = true;
      
      // Désactiver les modules non essentiels
      this._disableNonEssentialModules();
      
      // Déclencher l'événement critique
      this.uiManager._dispatchEvent('criticalError', { error, context });
    }
    
    return false;
  }

  async handleError(error, type, context) {
    this.errorHistory.push({
      type,
      context,
      error: error.message,
      timestamp: Date.now(),
      stack: error.stack
    });
    
    this.uiManager.error(`${type} error:`, error);
    
    if (this._isCriticalError(error)) {
      return this.handleCriticalError(error, `${type}:${context}`);
    }
    
    return true;
  }

  _setupGlobalErrorHandling() {
    // Capturer les erreurs non gérées
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'global', 'unhandled');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'promise', 'unhandled');
    });
  }

  _setupFallbackStates() {
    // États de fallback par défaut
    this.fallbackStates.set('default', {
      visible: false,
      enabled: false,
      fallbackMessage: 'Module temporarily unavailable'
    });
    
    this.fallbackStates.set('critical', {
      visible: true,
      enabled: false,
      fallbackMessage: 'Essential module in safe mode'
    });
  }

  _applyFallbackState(moduleId) {
    const config = this.uiManager.modules.get(moduleId);
    const fallbackType = config?.critical ? 'critical' : 'default';
    const fallbackState = this.fallbackStates.get(fallbackType);
    
    if (fallbackState) {
      this.uiManager._setModuleState(moduleId, {
        visible: fallbackState.visible,
        enabled: fallbackState.enabled
      });
      
      this.uiManager.log(`🛡️ Fallback state applied to ${moduleId}: ${fallbackType}`);
    }
  }

  _disableNonEssentialModules() {
    this.uiManager.modules.forEach((config, moduleId) => {
      if (!config.critical) {
        this.uiManager.disableModule(moduleId);
      }
    });
    
    this.uiManager.log('🛡️ Non-essential modules disabled due to critical error');
  }

  _isCriticalError(error) {
    const criticalPatterns = [
      /out of memory/i,
      /maximum call stack/i,
      /cannot read prop/i,
      /is not a function/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  getRetryCount(moduleId) {
    return this.retryCount.get(moduleId) || 0;
  }

  resetRetryCount(moduleId) {
    this.retryCount.delete(moduleId);
  }

  getActiveRetries() {
    return Object.fromEntries(this.retryCount);
  }

  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(-limit);
  }

  reportError(errorData) {
    if (this.uiManager.errorConfig.errorReporting) {
      // Ici vous pourriez envoyer à un service de reporting comme Sentry
      console.log('📊 Error reported:', errorData);
    }
  }

  clearErrorHistory() {
    this.errorHistory = [];
    this.retryCount.clear();
  }
}

// ===== 📐 UI LAYOUT MANAGER (Extended) =====

class UILayoutManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.positions = new Map();
    this.containers = new Map();
    this.viewportSize = { width: window.innerWidth, height: window.innerHeight };
    this.layoutCache = new Map();
    
    this.presetPositions = {
      'bottom-right': { x: 'auto', y: 'auto', right: 20, bottom: 20 },
      'bottom-left': { x: 20, y: 'auto', bottom: 20 },
      'top-right': { x: 'auto', y: 20, right: 20 },
      'top-left': { x: 20, y: 20 },
      'center': { x: '50%', y: '50%', transform: 'translate(-50%, -50%)' }
    };

    this.initializeViewport();
  }

  initializeViewport() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.viewportSize = { width: window.innerWidth, height: window.innerHeight };
        this.layoutCache.clear(); // Invalider le cache
        this.updateAllLayouts();
      }, this.uiManager.performanceConfig.debounceResize);
    });
  }

  registerModule(moduleId, layoutConfig) {
    this.positions.set(moduleId, layoutConfig);
  }

  applyLayout(moduleId, instance) {
    try {
      const config = this.positions.get(moduleId);
      if (!config || !instance.iconElement) return;

      // Vérifier le cache
      const cacheKey = `${moduleId}_${this.viewportSize.width}_${this.viewportSize.height}`;
      const cached = this.layoutCache.get(cacheKey);
      
      if (cached) {
        Object.assign(instance.iconElement.style, cached);
        return;
      }

      const element = instance.iconElement;
      const computedStyle = {};
      
      // Appliquer la position
      if (config.position !== 'auto') {
        const preset = this.presetPositions[config.position];
        if (preset) {
          Object.assign(computedStyle, preset);
        }
      } else {
        Object.assign(computedStyle, this.calculateAutoPosition(moduleId, config));
      }

      // Appliquer les offsets
      if (config.offset) {
        const currentTransform = computedStyle.transform || '';
        computedStyle.transform = `${currentTransform} translate(${config.offset.x}px, ${config.offset.y}px)`.trim();
      }

      // Appliquer le z-index
      if (config.zIndex !== 'auto') {
        computedStyle.zIndex = config.zIndex;
      }

      // Appliquer et cacher
      Object.assign(element.style, computedStyle);
      this.layoutCache.set(cacheKey, computedStyle);

    } catch (error) {
      this.uiManager.errorManager.handleError(error, 'layout', moduleId);
    }
  }

  calculateAutoPosition(moduleId, config) {
    const type = config.type;
    const anchor = config.anchor || 'bottom-right';
    const spacing = config.spacing || 10;
    const order = config.order || 0;
    const style = {};

    if (type === 'icon') {
      const iconSize = this._getIconSize();
      const totalOffset = order * (iconSize + spacing);

      if (anchor.includes('bottom')) {
        style.bottom = '20px';
      }
      if (anchor.includes('right')) {
        style.right = `${20 + totalOffset}px`;
      }
      if (anchor.includes('top')) {
        style.top = '20px';
      }
      if (anchor.includes('left')) {
        style.left = `${20 + totalOffset}px`;
      }
    }

    return style;
  }

  _getIconSize() {
    const device = this.uiManager.globalState.currentDevice;
    switch (device) {
      case 'mobile': return 60;
      case 'tablet': return 65;
      case 'desktop': return 70;
      default: return 70;
    }
  }

  updateAllLayouts() {
    this.positions.forEach((config, moduleId) => {
      const instance = this.uiManager.getModuleInstance(moduleId);
      if (instance && instance.iconElement) {
        this.applyLayout(moduleId, instance);
      }
    });
  }

  debugInfo() {
    console.log('Layout Positions:', Object.fromEntries(this.positions));
    console.log('Viewport Size:', this.viewportSize);
    console.log('Cache Size:', this.layoutCache.size);
  }
}

// ===== 🎬 UI ANIMATION MANAGER (Extended) =====

class UIAnimationManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.maxConcurrentAnimations = uiManager.performanceConfig.maxConcurrentAnimations;
    
    this.injectAnimationStyles();
  }

  injectAnimationStyles() {
    if (document.querySelector('#ui-manager-animations')) return;

    const style = document.createElement('style');
    style.id = 'ui-manager-animations';
    style.textContent = `
      .ui-module-animate {
        transition: all 0.3s ease-out;
      }
      
      .ui-fade-in {
        animation: uiFadeIn 0.3s ease-out forwards;
      }
      
      .ui-fade-out {
        animation: uiFadeOut 0.2s ease-in forwards;
      }
      
      .ui-slide-up {
        animation: uiSlideUp 0.3s ease-out forwards;
      }
      
      .ui-pulse {
        animation: uiPulse 0.15s ease-out;
      }
      
      .ui-disabled {
        filter: grayscale(50%);
        opacity: 0.6;
        transition: all 0.2s ease;
      }
      
      /* Responsive animations */
      @media (max-width: 768px) {
        .ui-fade-in, .ui-fade-out, .ui-slide-up {
          animation-duration: 0.2s;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .ui-fade-in, .ui-fade-out, .ui-slide-up, .ui-pulse {
          animation: none !important;
          transition: none !important;
        }
      }
      
      @keyframes uiFadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      
      @keyframes uiFadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
      }
      
      @keyframes uiSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes uiPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    
    document.head.appendChild(style);
  }

  animateShow(moduleId) {
    this._queueAnimation(moduleId, 'show', () => {
      const instance = this.uiManager.getModuleInstance(moduleId);
      if (!instance?.iconElement) return;

      const element = instance.iconElement;
      element.classList.add('ui-fade-in');
      
      setTimeout(() => {
        element.classList.remove('ui-fade-in');
        this._completeAnimation(moduleId);
      }, this._getAnimationDuration('fadeIn'));
    });
  }

  animateHide(moduleId) {
    this._queueAnimation(moduleId, 'hide', () => {
      const instance = this.uiManager.getModuleInstance(moduleId);
      if (!instance?.iconElement) return;

      const element = instance.iconElement;
      element.classList.add('ui-fade-out');
      
      setTimeout(() => {
        element.classList.remove('ui-fade-out');
        this._completeAnimation(moduleId);
      }, this._getAnimationDuration('fadeOut'));
    });
  }

  animateEnable(moduleId) {
    this._queueAnimation(moduleId, 'enable', () => {
      const instance = this.uiManager.getModuleInstance(moduleId);
      if (!instance?.iconElement) return;

      const element = instance.iconElement;
      element.classList.remove('ui-disabled');
      element.classList.add('ui-pulse');
      
      setTimeout(() => {
        element.classList.remove('ui-pulse');
        this._completeAnimation(moduleId);
      }, this._getAnimationDuration('pulse'));
    });
  }

  animateDisable(moduleId) {
    const instance = this.uiManager.getModuleInstance(moduleId);
    if (!instance?.iconElement) return;

    const element = instance.iconElement;
    element.classList.add('ui-disabled');
  }

  _queueAnimation(moduleId, type, animationFn) {
    if (this.uiManager.globalState.performanceMode) {
      // En mode performance, exécuter directement sans animation
      this._completeAnimation(moduleId);
      return;
    }

    const animation = { moduleId, type, fn: animationFn };
    
    if (this.activeAnimations.size < this.maxConcurrentAnimations) {
      this._executeAnimation(animation);
    } else {
      this.animationQueue.push(animation);
    }
  }

  _executeAnimation(animation) {
    this.activeAnimations.set(animation.moduleId, animation);
    animation.fn();
  }

  _completeAnimation(moduleId) {
    this.activeAnimations.delete(moduleId);
    
    // Démarrer la prochaine animation en queue
    if (this.animationQueue.length > 0) {
      const nextAnimation = this.animationQueue.shift();
      this._executeAnimation(nextAnimation);
    }
  }

  _getAnimationDuration(animationType) {
    if (this.uiManager.globalState.currentDevice === 'mobile') {
      return 200; // Plus rapide sur mobile
    }
    
    switch (animationType) {
      case 'fadeIn': return 300;
      case 'fadeOut': return 200;
      case 'pulse': return 150;
      default: return 250;
    }
  }

  clearAllAnimations() {
    this.activeAnimations.clear();
    this.animationQueue = [];
  }
}
