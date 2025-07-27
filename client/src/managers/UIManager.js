// managers/UIManager.js - VERSION FINALE avec Module Options intégré
// 🚨 Support complet Options : top-right + Escape + API globale + groupe ui-options
// ⚙️ NOUVEAU : Gestion intelligente Escape + positions multiples + API Options

export class UIManager {
  constructor(options = {}) {
    console.log('🎛️ UIManager avec support Module Options complet initialisé');
    
    this.debug = options.debug || false;
    this.gameStates = options.gameStates || {};
    
    this.modules = new Map();
    this.moduleStates = new Map();
    this.moduleInstances = new Map();
    
    // ✅ FIX 1: Tracking strict des initialisations
    this.initializationTracker = {
      inProgress: new Set(),
      completed: new Set(),
      iconCreated: new Set(),
      attempts: new Map()
    };
    
    this.globalState = {
      visible: true,
      enabled: true,
      initialized: false,
      currentGameState: 'exploration'
    };
    
    // ⚙️ NOUVEAU : Configuration étendue pour Options
    this.iconConfig = {
      defaultSize: { width: 70, height: 80 },
      responsiveSizes: {
        mobile: { width: 60, height: 70 },
        tablet: { width: 65, height: 75 },
        desktop: { width: 70, height: 80 }
      },
      spacing: 10,
      padding: 20,
      globalOffset: 15,
      zIndex: 500,
      // ⚙️ NOUVEAU : Offset spécial pour Options en top-right
      optionsOffset: 20 // Décalage supplémentaire pour Options
    };
    
    this.registeredIcons = new Map();
    this.iconGroups = new Map();
    this.currentBreakpoint = this.getCurrentBreakpoint();
    
    // ⚙️ NOUVEAU : Setup groupes avec support Options
    this.setupDefaultGroupsWithOptions();
    this.setupResizeListener();
    this.injectGlobalIconCSS();
    
    // ⚙️ NOUVEAU : Règles d'interaction étendues pour Options
    this.interactionRules = {
      inventory_open: ['team'],
      team_open: ['inventory'], 
      dialogue_active: ['inventory', 'team', 'quest'],
      battle_active: ['inventory', 'team', 'quest', 'questTracker', 'chat'],
      // ⚙️ Options peut toujours être ouvert (pas de restrictions)
      options_priority: [] // Options a priorité sur tout
    };
    
    this.openModules = new Set();
    
    // ⚙️ NOUVEAU : Tracking Escape key pour Options
    this.escapeHandling = {
      optionsModuleId: null,
      setupComplete: false
    };
  }

  // === 🛡️ INITIALISATION MODULE AVEC PROTECTION ANTI-DUPLICATION ===
  
  async initializeModule(moduleId, ...args) {
    // ✅ FIX 2: Vérification stricte avant toute action
    if (this.initializationTracker.inProgress.has(moduleId)) {
      console.log(`⏳ [UIManager] Module ${moduleId} déjà en cours d'initialisation - BLOQUÉ`);
      return await this.waitForInitialization(moduleId);
    }
    
    if (this.initializationTracker.completed.has(moduleId)) {
      const config = this.modules.get(moduleId);
      if (config?.instance) {
        console.log(`✅ [UIManager] Module ${moduleId} déjà initialisé - RÉUTILISATION`);
        return config.instance;
      }
    }
    
    // ✅ FIX 3: Marquer comme en cours IMMÉDIATEMENT
    this.initializationTracker.inProgress.add(moduleId);
    this.trackInitializationAttempt(moduleId);
    
    if (this.debug) {
      console.log(`🚀 [UIManager] Initialisation PROTÉGÉE module: ${moduleId}`);
    }
    
    const config = this.modules.get(moduleId);
    if (!config) {
      this.initializationTracker.inProgress.delete(moduleId);
      throw new Error(`Module ${moduleId} non enregistré`);
    }
    
    const state = this.moduleStates.get(moduleId);
    
    try {
      // ✅ FIX 4: Double vérification avec état interne
      if (state.initialized && config.instance) {
        console.log(`ℹ️ [UIManager] Module ${moduleId} déjà initialisé (état + instance)`);
        this.initializationTracker.inProgress.delete(moduleId);
        this.initializationTracker.completed.add(moduleId);
        return config.instance;
      }
      
      // 1. Créer l'instance du module
      console.log(`🔧 [UIManager] Création instance ${moduleId}...`);
      const instance = await config.factory(...args);
      
      if (!instance) {
        throw new Error(`Factory du module ${moduleId} a retourné null`);
      }
      
      // 2. Stocker l'instance IMMÉDIATEMENT
      config.instance = instance;
      this.moduleInstances.set(moduleId, instance);
      state.initialized = true;
      
      // ✅ FIX: Synchroniser les états UIManager → Module
      if (instance) {
        instance.initialized = true;
        instance.isEnabled = state.enabled !== false;
        
        // ⚙️ NOUVEAU : Setup spécial pour Options
        if (moduleId === 'options' || config.isOptionsModule) {
          this.setupOptionsSpecialHandling(moduleId, instance);
        }
        
        if (this.debug) {
          console.log(`🔄 [UIManager] États synchronisés pour ${moduleId}:`, {
            'UIManager.initialized': state.initialized,
            'Module.initialized': instance.initialized,
            'UIManager.enabled': state.enabled,
            'Module.isEnabled': instance.isEnabled,
            'isOptions': moduleId === 'options'
          });
        }
      }
      
      // ✅ FIX 5: Marquer comme terminé AVANT création icône
      this.initializationTracker.completed.add(moduleId);
      this.initializationTracker.inProgress.delete(moduleId);
      
      // 3. Créer l'icône avec protection
      await this.createModuleIconProtected(moduleId, instance, config);
      
      // 4. Appliquer l'état initial
      this.applyModuleState(moduleId);
      
      // ⚙️ NOUVEAU : Setup Escape key si c'est Options
      if (moduleId === 'options') {
        this.setupOptionsEscapeHandling(instance);
      }
      
      if (this.debug) {
        console.log(`✅ [UIManager] Module ${moduleId} initialisé avec protection anti-duplication`);
      }
      
      return instance;
      
    } catch (error) {
      // ✅ FIX 6: Nettoyage en cas d'erreur
      this.initializationTracker.inProgress.delete(moduleId);
      this.initializationTracker.completed.delete(moduleId);
      
      console.error(`❌ [UIManager] Erreur initialisation PROTÉGÉE ${moduleId}:`, error);
      throw error;
    }
  }
  
  // ⚙️ NOUVEAU : Setup spécial pour le module Options
  setupOptionsSpecialHandling(moduleId, instance) {
    console.log('⚙️ [UIManager] Configuration spéciale module Options...');
    
    // Marquer le module Options pour référence
    this.escapeHandling.optionsModuleId = moduleId;
    
    // Exposer l'API globale Options immédiatement
    if (instance.manager) {
      this.exposeOptionsGlobalAPI(instance.manager);
    }
    
    // Marquer la configuration comme spéciale
    const config = this.modules.get(moduleId);
    if (config) {
      config.isOptionsModule = true;
      config.specialHandling = {
        escapeKey: true,
        globalAPI: true,
        topRightPosition: true
      };
    }
    
    console.log('✅ [UIManager] Configuration spéciale Options terminée');
  }
  
  // ⚙️ NOUVEAU : Exposer l'API globale Options
  exposeOptionsGlobalAPI(optionsManager) {
    if (!optionsManager) return;
    
    console.log('🌐 [UIManager] Exposition API globale Options...');
    
    // API simple directement disponible
    window.GetPlayerCurrentLanguage = () => {
      try {
        return optionsManager.getCurrentLanguage();
      } catch (error) {
        console.warn('⚠️ GetPlayerCurrentLanguage fallback:', error);
        return 'en';
      }
    };
    
    window.GetPlayerCurrentVolume = () => {
      try {
        return optionsManager.getEffectiveVolume();
      } catch (error) {
        console.warn('⚠️ GetPlayerCurrentVolume fallback:', error);
        return 50;
      }
    };
    
    window.IsPlayerAudioMuted = () => {
      try {
        return optionsManager.isMuted();
      } catch (error) {
        console.warn('⚠️ IsPlayerAudioMuted fallback:', error);
        return false;
      }
    };
    
    // API de contrôle Options
    window.openOptions = () => this.showModule('options');
    window.closeOptions = () => this.hideModule('options');
    window.toggleOptions = () => this.toggleModule('options');
    
    console.log('✅ [UIManager] API globale Options exposée');
  }
  
  // ⚙️ NOUVEAU : Setup du handling intelligent Escape
  setupOptionsEscapeHandling(optionsInstance) {
    if (this.escapeHandling.setupComplete) {
      console.log('ℹ️ [UIManager] Escape key déjà configuré pour Options');
      return;
    }
    
    console.log('⌨️ [UIManager] Configuration Escape key intelligent pour Options...');
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleIntelligentEscape(event, optionsInstance);
      }
    });
    
    this.escapeHandling.setupComplete = true;
    console.log('✅ [UIManager] Escape key intelligent configuré');
  }
  
  // ⚙️ NOUVEAU : Gestion intelligente de la touche Escape
  handleIntelligentEscape(event, optionsInstance) {
    console.log('⌨️ [UIManager] Escape pressé - gestion intelligente...');
    
    // 1. Vérifier si une UI est ouverte (priorité haute)
    const openUI = this.findOpenUI();
    
    if (openUI) {
      console.log(`⌨️ [UIManager] Fermeture UI ouverte: ${openUI}`);
      event.preventDefault();
      event.stopPropagation();
      this.closeSpecificUI(openUI);
      return;
    }
    
    // 2. Si aucune UI ouverte, toggle Options
    console.log('⌨️ [UIManager] Aucune UI ouverte - toggle Options');
    event.preventDefault();
    event.stopPropagation();
    
    if (optionsInstance && optionsInstance.toggleUI) {
      optionsInstance.toggleUI();
    } else {
      this.toggleModule('options');
    }
  }
  
  // ⚙️ NOUVEAU : Trouver l'UI ouverte avec priorité
  findOpenUI() {
    // Ordre de priorité pour fermeture (du plus spécifique au plus général)
    const uiChecks = [
      { id: 'options', selector: '#options-overlay:not(.hidden)', priority: 1 },
      { id: 'inventory', selector: '#inventory-overlay:not(.hidden)', priority: 2 },
      { id: 'team', selector: '#team-overlay:not(.hidden)', priority: 3 },
      { id: 'quest', selector: '#quest-journal.visible', priority: 4 }
    ];
    
    // Trier par priorité et trouver la première UI visible
    uiChecks.sort((a, b) => a.priority - b.priority);
    
    for (const check of uiChecks) {
      const element = document.querySelector(check.selector);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const isVisible = computedStyle.opacity > 0.1 && 
                         computedStyle.visibility !== 'hidden' &&
                         computedStyle.display !== 'none';
        
        if (isVisible) {
          console.log(`🔍 [UIManager] UI ouverte détectée: ${check.id}`);
          return check.id;
        }
      }
    }
    
    return null;
  }
  
  // ⚙️ NOUVEAU : Fermer une UI spécifique
  closeSpecificUI(uiId) {
    console.log(`🚪 [UIManager] Fermeture UI spécifique: ${uiId}`);
    
    const instance = this.getModuleInstance(uiId);
    
    if (instance) {
      // Méthodes préférées
      if (typeof instance.hide === 'function') {
        instance.hide();
      } else if (typeof instance.close === 'function') {
        instance.close();
      } else if (typeof instance.toggleUI === 'function') {
        instance.toggleUI();
      }
    } else {
      // Fallback via état UIManager
      this.hideModule(uiId);
    }
  }
  
  // ✅ FIX 7: Tracking des tentatives d'initialisation
  trackInitializationAttempt(moduleId) {
    const attempts = this.initializationTracker.attempts.get(moduleId) || 0;
    this.initializationTracker.attempts.set(moduleId, attempts + 1);
    
    if (attempts > 0) {
      console.warn(`⚠️ [UIManager] Module ${moduleId} - tentative d'initialisation #${attempts + 1}`);
    }
  }
  
  // ✅ FIX 8: Attente pour initialisation en cours
  async waitForInitialization(moduleId, maxWait = 5000) {
    const startTime = Date.now();
    
    while (this.initializationTracker.inProgress.has(moduleId)) {
      if (Date.now() - startTime > maxWait) {
        console.error(`❌ [UIManager] Timeout attente initialisation ${moduleId}`);
        this.initializationTracker.inProgress.delete(moduleId);
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Retourner l'instance si elle existe
    const config = this.modules.get(moduleId);
    return config?.instance || null;
  }

  // ✅ FIX 9: Création d'icône avec protection stricte
  async createModuleIconProtected(moduleId, instance, config) {
    // Vérifier si icône déjà créée
    if (this.initializationTracker.iconCreated.has(moduleId)) {
      console.log(`🎨 [UIManager] Icône ${moduleId} déjà créée - SKIP`);
      return this.registeredIcons.get(moduleId)?.element || null;
    }
    
    console.log(`🎨 [UIManager] Création icône PROTÉGÉE pour ${moduleId}...`);
    
    try {
      // Vérifier si le module a besoin d'une icône
      const layoutConfig = config.layout || config.uiManagerConfig;
      if (!layoutConfig) {
        console.log(`ℹ️ [UIManager] Module ${moduleId} n'a pas de configuration layout`);
        return null;
      }
      
      // ⚙️ NOUVEAU : Support direct pour modules avec icône
      let iconElement = null;
      
      if (instance.icon && instance.icon.iconElement) {
        // Le module a déjà créé son icône (pattern BaseModule)
        iconElement = instance.icon.iconElement;
        console.log(`🎨 [UIManager] Utilisation icône existante pour ${moduleId}`);
      } else if (typeof instance.createIcon === 'function') {
        // Le module peut créer une icône
        iconElement = await instance.createIcon();
        console.log(`🎨 [UIManager] Icône créée par ${moduleId}`);
      } else {
        console.log(`ℹ️ [UIManager] Module ${moduleId} n'a pas d'icône`);
        return null;
      }
      
      if (!iconElement) {
        console.warn(`⚠️ [UIManager] Module ${moduleId} n'a pas créé d'icône`);
        this.initializationTracker.iconCreated.delete(moduleId);
        return null;
      }
      
      // ✅ MARQUER COMME EN COURS DE CRÉATION
      this.initializationTracker.iconCreated.add(moduleId);
      
      // Appliquer la taille centralisée
      this.applyStandardizedSize(iconElement);
      
      // ⚙️ NOUVEAU : Configuration spéciale pour Options
      const finalLayoutConfig = this.adjustLayoutConfigForModule(moduleId, layoutConfig, config);
      
      // Enregistrer et positionner l'icône
      this.registerIconPosition(moduleId, iconElement, finalLayoutConfig);
      
      console.log(`✅ [UIManager] Icône créée PROTÉGÉE pour ${moduleId}`);
      return iconElement;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur création icône PROTÉGÉE ${moduleId}:`, error);
      this.initializationTracker.iconCreated.delete(moduleId);
      return null;
    }
  }
  
  // ⚙️ NOUVEAU : Ajuster la configuration layout selon le module
  adjustLayoutConfigForModule(moduleId, layoutConfig, moduleConfig) {
    // Configuration par défaut
    let finalConfig = { ...layoutConfig };
    
    // ⚙️ Spécial Options: force top-right
    if (moduleId === 'options' || moduleConfig.isOptionsModule) {
      finalConfig = {
        ...finalConfig,
        anchor: 'top-right',
        order: 0, // Premier en top-right
        group: 'ui-options',
        type: 'icon'
      };
      console.log(`⚙️ [UIManager] Configuration Options appliquée pour ${moduleId}:`, finalConfig);
    }
    
    return finalConfig;
  }

  // === ⚙️ NOUVEAU : SETUP GROUPES AVEC SUPPORT OPTIONS ===
  
  setupDefaultGroupsWithOptions() {
    // Groupe principal bottom-right (Quest, Team, Inventory, etc.)
    this.iconGroups.set('ui-icons', {
      anchor: 'bottom-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding,
      members: [],
      expectedOrder: ['inventory', 'quest', 'pokedex', 'team']
    });
    
    // ⚙️ NOUVEAU : Groupe spécial top-right pour Options
    this.iconGroups.set('ui-options', {
      anchor: 'top-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding + (this.iconConfig.optionsOffset || 0),
      members: [],
      expectedOrder: ['options'] // Options sera le seul pour l'instant
    });
    
    console.log('✅ [UIManager] Groupes configurés avec support Options (ui-options)');
  }

  // === 🔄 FIX FINAL : SYNCHRONISATION RÉFÉRENCES ÉLÉMENTS ===
  
  synchronizeElementReferences() {
    if (this.debug) {
      console.log('🔄 [UIManager] Synchronisation références éléments...');
    }
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      // Patterns de recherche pour Options vs autres modules
      const searchPatterns = [];
      
      if (moduleId === 'options') {
        searchPatterns.push('#options-icon', '.options-icon');
      } else {
        searchPatterns.push(`#${moduleId}-icon`, `.${moduleId}-icon`);
      }
      
      let realElement = null;
      
      // Chercher l'élément réel avec les patterns
      for (const pattern of searchPatterns) {
        realElement = document.querySelector(pattern);
        if (realElement) break;
      }
      
      if (realElement && iconConfig.element !== realElement) {
        if (this.debug) {
          console.log(`🔄 [UIManager] Synchronisation ${moduleId}: référence obsolète détectée`);
        }
        
        // Supprimer les éléments fantômes s'ils existent
        searchPatterns.forEach(pattern => {
          const allElements = document.querySelectorAll(pattern);
          if (allElements.length > 1) {
            console.log(`🧹 [UIManager] ${allElements.length} éléments ${pattern} trouvés, nettoyage...`);
            
            allElements.forEach((element, index) => {
              const rect = element.getBoundingClientRect();
              
              // Supprimer les éléments invisibles (fantômes)
              if (rect.width === 0 || rect.height === 0 || rect.left === 0) {
                console.log(`🗑️ [UIManager] Suppression élément fantôme ${pattern}[${index}]`);
                element.remove();
              }
            });
          }
        });
        
        // Mettre à jour la référence UIManager
        iconConfig.element = realElement;
        
        // Nettoyer l'élément réel
        realElement.classList.remove('hidden', 'ui-hidden');
        if (realElement.style.right || realElement.style.bottom) {
          realElement.style.right = '';
          realElement.style.bottom = '';
          realElement.style.inset = '';
        }
        
        if (this.debug) {
          console.log(`✅ [UIManager] ${moduleId} référence synchronisée`);
        }
      }
    });
  }

  // === ⚙️ POSITIONNEMENT AMÉLIORÉ AVEC SUPPORT OPTIONS ===
  
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }
  
  getCurrentIconSize() {
    const breakpoint = this.getCurrentBreakpoint();
    return this.iconConfig.responsiveSizes[breakpoint] || this.iconConfig.defaultSize;
  }
  
  updateIconConfig(newConfig) {
    console.log('🔧 [UIManager] Mise à jour configuration icônes:', newConfig);
    
    this.iconConfig = {
      ...this.iconConfig,
      ...newConfig,
      responsiveSizes: {
        ...this.iconConfig.responsiveSizes,
        ...(newConfig.responsiveSizes || {})
      }
    };
    
    this.injectGlobalIconCSS();
    setTimeout(() => this.repositionAllIcons(), 100);
    
    console.log('✅ [UIManager] Configuration icônes mise à jour');
  }
  
  injectGlobalIconCSS() {
    const existingStyle = document.querySelector('#uimanager-global-icons');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const { defaultSize, responsiveSizes, zIndex } = this.iconConfig;
    
    const style = document.createElement('style');
    style.id = 'uimanager-global-icons';
    style.textContent = `
      .ui-icon {
        width: ${defaultSize.width}px !important;
        height: ${defaultSize.height}px !important;
        z-index: ${zIndex} !important;
        position: fixed !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        user-select: none !important;
        display: block !important;
        box-sizing: border-box !important;
      }
      
      /* ⚙️ NOUVEAU : Styles spécifiques Options */
      #options-icon.ui-icon,
      .options-icon.ui-icon {
        width: ${defaultSize.width}px !important;
        height: ${defaultSize.height}px !important;
        min-width: ${defaultSize.width}px !important;
        max-width: ${defaultSize.width}px !important;
        min-height: ${defaultSize.height}px !important;
        max-height: ${defaultSize.height}px !important;
        z-index: ${zIndex + 10} !important; /* Un peu plus haut que les autres */
      }
      
      #inventory-icon.ui-icon,
      #team-icon.ui-icon,
      #quest-icon.ui-icon,
      .inventory-icon.ui-icon,
      .team-icon.ui-icon,
      .quest-icon.ui-icon {
        width: ${defaultSize.width}px !important;
        height: ${defaultSize.height}px !important;
        min-width: ${defaultSize.width}px !important;
        max-width: ${defaultSize.width}px !important;
        min-height: ${defaultSize.height}px !important;
        max-height: ${defaultSize.height}px !important;
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .ui-icon {
          width: ${responsiveSizes.tablet.width}px !important;
          height: ${responsiveSizes.tablet.height}px !important;
        }
        
        #options-icon.ui-icon,
        .options-icon.ui-icon,
        #inventory-icon.ui-icon,
        #team-icon.ui-icon,
        #quest-icon.ui-icon,
        .inventory-icon.ui-icon,
        .team-icon.ui-icon,
        .quest-icon.ui-icon {
          width: ${responsiveSizes.tablet.width}px !important;
          height: ${responsiveSizes.tablet.height}px !important;
          min-width: ${responsiveSizes.tablet.width}px !important;
          max-width: ${responsiveSizes.tablet.width}px !important;
          min-height: ${responsiveSizes.tablet.height}px !important;
          max-height: ${responsiveSizes.tablet.height}px !important;
        }
      }
      
      @media (max-width: 768px) {
        .ui-icon {
          width: ${responsiveSizes.mobile.width}px !important;
          height: ${responsiveSizes.mobile.height}px !important;
        }
        
        #options-icon.ui-icon,
        .options-icon.ui-icon,
        #inventory-icon.ui-icon,
        #team-icon.ui-icon,
        #quest-icon.ui-icon,
        .inventory-icon.ui-icon,
        .team-icon.ui-icon,
        .quest-icon.ui-icon {
          width: ${responsiveSizes.mobile.width}px !important;
          height: ${responsiveSizes.mobile.height}px !important;
          min-width: ${responsiveSizes.mobile.width}px !important;
          max-width: ${responsiveSizes.mobile.width}px !important;
          min-height: ${responsiveSizes.mobile.height}px !important;
          max-height: ${responsiveSizes.mobile.height}px !important;
        }
      }
      
      .ui-icon.ui-hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateY(20px) !important;
      }
      
      .ui-icon.ui-disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
        filter: grayscale(50%) !important;
      }
      
      .ui-icon:hover:not(.ui-disabled) {
        transform: scale(1.1) !important;
      }
      
      .ui-icon[data-positioned-by="uimanager"]::before {
        content: "🛡️";
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 10px;
        opacity: 0.6;
        z-index: 1000;
        pointer-events: none;
      }
      
      /* ⚙️ NOUVEAU : Indicateur spécial Options */
      #options-icon[data-positioned-by="uimanager"]::before {
        content: "⚙️";
        color: #4a90e2;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [UIManager] CSS global icônes injecté avec support Options');
  }

  applyStandardizedSize(iconElement) {
    const currentSize = this.getCurrentIconSize();
    
    iconElement.style.width = `${currentSize.width}px`;
    iconElement.style.height = `${currentSize.height}px`;
    iconElement.style.minWidth = `${currentSize.width}px`;
    iconElement.style.maxWidth = `${currentSize.width}px`;
    iconElement.style.minHeight = `${currentSize.height}px`;
    iconElement.style.maxHeight = `${currentSize.height}px`;
    iconElement.style.zIndex = this.iconConfig.zIndex;
    
    iconElement.classList.add('ui-icon');
    iconElement.setAttribute('data-positioned-by', 'uimanager');
    
    console.log(`📏 [UIManager] Taille appliquée PROTÉGÉE: ${currentSize.width}x${currentSize.height}`);
  }
  
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();
        
        if (newBreakpoint !== this.currentBreakpoint) {
          console.log(`📱 [UIManager] Breakpoint changé: ${this.currentBreakpoint} → ${newBreakpoint}`);
          this.currentBreakpoint = newBreakpoint;
          this.applyNewSizesToAllIcons();
        }
        
        this.repositionAllIcons();
      }, 200);
    });
  }
  
  applyNewSizesToAllIcons() {
    const currentSize = this.getCurrentIconSize();
    console.log(`📏 [UIManager] Application nouvelle taille PROTÉGÉE: ${currentSize.width}x${currentSize.height}`);
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      if (iconConfig.element) {
        this.applyStandardizedSize(iconConfig.element);
        iconConfig.size = currentSize;
      }
    });
  }

  registerIconPosition(moduleId, iconElement, config = {}) {
    if (!iconElement) {
      console.warn(`⚠️ [UIManager] Pas d'élément pour ${moduleId}`);
      return;
    }

    const currentSize = this.getCurrentIconSize();
    
    const iconConfig = {
      element: iconElement,
      moduleId: moduleId,
      anchor: config.anchor || 'bottom-right',
      order: config.order !== undefined ? config.order : 999,
      group: config.group || 'ui-icons',
      spacing: this.iconConfig.spacing,
      size: currentSize
    };

    this.registeredIcons.set(moduleId, iconConfig);

    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    if (!group.members.includes(moduleId)) {
      group.members.push(moduleId);
      group.members.sort((a, b) => {
        const iconA = this.registeredIcons.get(a);
        const iconB = this.registeredIcons.get(b);
        const orderA = iconA?.order !== undefined ? iconA.order : 999;
        const orderB = iconB?.order !== undefined ? iconB.order : 999;
        return orderA - orderB;
      });
    }

    this.positionIcon(moduleId);

    console.log(`📍 [UIManager] Icône ${moduleId} enregistrée PROTÉGÉE (${currentSize.width}x${currentSize.height}, ordre: ${iconConfig.order}, groupe: ${iconConfig.group})`);
  }

  // ⚙️ NOUVEAU : Position avec support complet Options top-right
  positionIcon(moduleId) {
    // ✅ AJOUT : Synchroniser avant positionnement
    this.synchronizeElementReferences();
    
    const iconConfig = this.registeredIcons.get(moduleId);
    if (!iconConfig || !iconConfig.element) {
      console.warn(`⚠️ [UIManager] Pas de config pour ${moduleId}`);
      return;
    }

    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    const memberIndex = group.members.indexOf(moduleId);
    
    if (memberIndex === -1) {
      console.warn(`⚠️ [UIManager] ${moduleId} pas dans le groupe ${iconConfig.group}`);
      return;
    }

    let baseX, baseY;
    const padding = group.padding || this.iconConfig.padding;
    const globalOffset = this.iconConfig.globalOffset || 0;
    
    // ⚙️ NOUVEAU : Support complet des anchors y compris top-right pour Options
    switch (iconConfig.anchor) {
      case 'bottom-right':
        baseX = window.innerWidth - padding - globalOffset;
        baseY = window.innerHeight - padding;
        break;
        
      case 'bottom-left':
        baseX = padding + globalOffset;
        baseY = window.innerHeight - padding;
        break;
        
      case 'top-right':
        // ⚙️ SPÉCIAL OPTIONS : Position top-right avec offset spécial
        const optionsOffset = this.iconConfig.optionsOffset || 0;
        baseX = window.innerWidth - padding - globalOffset - optionsOffset;
        baseY = padding + 60; // Éviter la barre du navigateur
        console.log(`⚙️ [UIManager] Position top-right pour ${moduleId} avec offset: ${optionsOffset}px`);
        break;
        
      case 'top-left':
        baseX = padding + globalOffset;
        baseY = padding;
        break;
        
      default:
        baseX = window.innerWidth - padding - globalOffset;
        baseY = window.innerHeight - padding;
    }

    const spacing = this.iconConfig.spacing;
    const iconWidth = iconConfig.size.width;
    
    // ✅ FIX CRITIQUE: Utiliser ORDER au lieu de memberIndex
    const calculatedOrder = iconConfig.order !== undefined ? iconConfig.order : memberIndex;
    
    let offsetX = 0;
    
    // ⚙️ NOUVEAU : Calcul offset selon anchor
    if (iconConfig.anchor.includes('right')) {
      // Pour bottom-right et top-right: chaque icône d'ordre supérieur va plus à gauche
      offsetX = -calculatedOrder * (iconWidth + spacing) - iconWidth;
    } else {
      // Pour bottom-left et top-left: chaque icône d'ordre supérieur va plus à droite  
      offsetX = calculatedOrder * (iconWidth + spacing);
    }

    const element = iconConfig.element;
    const finalX = baseX + offsetX;
    
    // ⚙️ NOUVEAU : Calcul Y selon anchor
    let finalY;
    if (iconConfig.anchor.includes('bottom')) {
      finalY = baseY - iconConfig.size.height;
    } else {
      // top-right, top-left
      finalY = baseY;
    }
    
    element.style.position = 'fixed';
    element.style.left = `${finalX}px`;
    element.style.top = `${finalY}px`;
    element.style.zIndex = this.iconConfig.zIndex;

    // ✅ Marquer comme positionné
    element.setAttribute('data-positioned-by', 'uimanager');
    
    if (this.debug) {
      console.log(`📍 [UIManager] ${moduleId} positionné CORRECTEMENT à (${finalX}, ${finalY}) - ordre: ${calculatedOrder}, anchor: ${iconConfig.anchor}, groupe: ${iconConfig.group}`);
    }
  }

  // ✅ FIX : Repositionner avec synchronisation
  repositionAllIcons() {
    // ✅ AJOUT : Synchroniser toutes les références avant repositionnement
    this.synchronizeElementReferences();
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      this.positionIcon(moduleId);
    });
    
    if (this.debug) {
      console.log('🔄 [UIManager] Toutes les icônes repositionnées avec synchronisation et support Options');
    }
  }

  // === ⚙️ MÉTHODES PUBLIQUES AMÉLIORÉES POUR OPTIONS ===

  async registerModule(moduleId, moduleConfig) {
    if (this.debug) {
      console.log(`📝 [UIManager] Enregistrement module PROTÉGÉ: ${moduleId}`);
    }
    
    const config = {
      factory: moduleConfig.factory,
      instance: null,
      defaultState: moduleConfig.defaultState || {
        visible: true,
        enabled: true,
        initialized: false
      },
      priority: moduleConfig.priority || 100,
      critical: moduleConfig.critical || false,
      groups: moduleConfig.groups || [],
      layout: moduleConfig.layout || moduleConfig.uiManagerConfig || {},
      // ⚙️ NOUVEAU : Détecter si c'est le module Options
      isOptionsModule: moduleId === 'options' || moduleConfig.name === 'Options & Settings',
      ...moduleConfig
    };
    
    this.modules.set(moduleId, config);
    this.moduleStates.set(moduleId, { ...config.defaultState });
    
    if (this.debug) {
      console.log(`✅ [UIManager] Module ${moduleId} enregistré PROTÉGÉ${config.isOptionsModule ? ' (OPTIONS)' : ''}`);
    }
    
    return this;
  }

  showModule(moduleId, options = {}) {
    console.log(`👁️ [UIManager] Affichage module ${moduleId}...`);
    
    // ⚙️ NOUVEAU : Options peut toujours être affiché (pas de restrictions)
    if (moduleId !== 'options' && !this.canShowModule(moduleId)) {
      console.log(`🚫 [UIManager] Impossible d'afficher ${moduleId} (règles d'interaction)`);
      return false;
    }
    
    const success = this.setModuleState(moduleId, { visible: true });
    
    if (success) {
      this.openModules.add(moduleId);
      
      // ✅ Synchroniser l'état avec l'instance
      const instance = this.getModuleInstance(moduleId);
      if (instance) {
        instance.isEnabled = true;
        instance.initialized = true;
      }
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        const element = iconConfig.element;
        
        // ✅ CORRECTION SPÉCIFIQUE : Nettoyer tous les états de masquage
        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
        element.style.transform = '';
        element.style.transition = '';
        
        // ✅ CORRECTION CRITIQUE : Supprimer toutes les classes de masquage
        element.classList.remove('ui-hidden', 'ui-disabled', 'hidden');
        
        console.log(`🧹 [UIManager] ${moduleId} - classes supprimées:`, element.classList.contains('ui-hidden') ? 'ÉCHEC' : 'OK');
        
        // Repositionner
        this.positionIcon(moduleId);
      }
      
      console.log(`✅ [UIManager] Module ${moduleId} affiché avec nettoyage complet`);
    }
    
    return success;
  }
  
  hideModule(moduleId, options = {}) {
    const success = this.setModuleState(moduleId, { visible: false });
    
    if (success) {
      this.openModules.delete(moduleId);
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        if (options.animated !== false) {
          iconConfig.element.style.transition = 'opacity 0.3s ease';
          iconConfig.element.style.opacity = '0';
          setTimeout(() => {
            iconConfig.element.style.display = 'none';
          }, 300);
        } else {
          iconConfig.element.style.display = 'none';
        }
        
        setTimeout(() => {
          this.repositionAllIcons();
        }, options.animated !== false ? 350 : 50);
      }
      
      if (this.debug) {
        console.log(`👻 [UIManager] Module ${moduleId} caché PROTÉGÉ`);
      }
    }
    
    return success;
  }
  
  enableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: true });
    
    if (success) {
      // ✅ FIX: Synchroniser l'état avec l'instance
      const instance = this.getModuleInstance(moduleId);
      if (instance) {
        instance.isEnabled = true;
        instance.initialized = true;
      }
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.opacity = '1';
        iconConfig.element.style.pointerEvents = 'auto';
        iconConfig.element.style.filter = '';
        iconConfig.element.classList.remove('ui-disabled');
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} activé PROTÉGÉ avec états synchronisés`);
      }
    }
    
    return success;
  }
  
  disableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: false });
    
    if (success) {
      // ✅ FIX: Synchroniser l'état avec l'instance
      const instance = this.getModuleInstance(moduleId);
      if (instance) {
        instance.isEnabled = false;
        // Garder initialized = true même si désactivé
      }
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.opacity = '0.5';
        iconConfig.element.style.pointerEvents = 'none';
        iconConfig.element.style.filter = 'grayscale(50%)';
        iconConfig.element.classList.add('ui-disabled');
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} désactivé PROTÉGÉ avec états synchronisés`);
      }
    }
    
    return success;
  }

  // === ⚙️ FIX WORKFLOW D'INITIALISATION AVEC OPTIONS ===
  
  async initializeAllModules(...args) {
    if (this.debug) {
      console.log('🚀 [UIManager] Initialisation PROTÉGÉE de tous les modules avec Options...');
    }
    
    // ✅ Vérifier si déjà en cours
    if (this.globalState.initialized) {
      console.log('ℹ️ [UIManager] Tous les modules déjà initialisés - SKIP');
      return {
        success: true,
        results: Object.fromEntries(this.moduleInstances),
        errors: [],
        iconsCreated: this.registeredIcons.size,
        iconSize: this.getCurrentIconSize(),
        optionsAPI: this.checkOptionsAPI()
      };
    }
    
    const results = {};
    const errors = [];
    
    const sortedModules = Array.from(this.modules.entries())
      .sort((a, b) => {
        // ⚙️ NOUVEAU : Options en premier (priorité maximale)
        if (a[0] === 'options') return -1;
        if (b[0] === 'options') return 1;
        return (b[1].priority || 100) - (a[1].priority || 100);
      });
    
    // ✅ FIX 11: Initialisation séquentielle pour éviter les conflits
    for (const [moduleId, config] of sortedModules) {
      try {
        console.log(`🔄 [UIManager] Initialisation séquentielle: ${moduleId}${moduleId === 'options' ? ' ⚙️' : ''}`);
        const instance = await this.initializeModule(moduleId, ...args);
        results[moduleId] = instance;
        
        // ⚙️ NOUVEAU : Délai plus long après Options pour s'assurer que l'API est prête
        const delay = moduleId === 'options' ? 200 : 50;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        errors.push(`${moduleId}: ${error.message}`);
        if (config.critical) {
          console.error(`💥 [UIManager] Module critique ${moduleId} a échoué !`);
        }
      }
    }
    
    // ✅ Marquer comme initialisé seulement à la fin
    this.globalState.initialized = true;
    
    // Repositionner toutes les icônes créées
    setTimeout(() => {
      this.repositionAllIcons();
      console.log(`📍 [UIManager] ${this.registeredIcons.size} icônes repositionnées PROTÉGÉES avec Options`);
    }, 100);
    
    // ⚙️ NOUVEAU : Vérifier que l'API Options est disponible
    const optionsAPIStatus = this.checkOptionsAPI();
    
    if (this.debug) {
      console.log(`✅ [UIManager] Initialisation PROTÉGÉE terminée. Succès: ${Object.keys(results).length}, Erreurs: ${errors.length}`);
      console.log(`🛡️ Protection: ${this.initializationTracker.completed.size} modules protégés`);
      console.log(`⚙️ API Options:`, optionsAPIStatus);
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      iconsCreated: this.registeredIcons.size,
      iconSize: this.getCurrentIconSize(),
      protectedModules: this.initializationTracker.completed.size,
      optionsAPI: optionsAPIStatus
    };
  }
  
  // ⚙️ NOUVEAU : Vérifier le statut de l'API Options
  checkOptionsAPI() {
    return {
      GetPlayerCurrentLanguage: typeof window.GetPlayerCurrentLanguage === 'function',
      GetPlayerCurrentVolume: typeof window.GetPlayerCurrentVolume === 'function',
      IsPlayerAudioMuted: typeof window.IsPlayerAudioMuted === 'function',
      openOptions: typeof window.openOptions === 'function',
      closeOptions: typeof window.closeOptions === 'function',
      toggleOptions: typeof window.toggleOptions === 'function',
      escapeHandling: this.escapeHandling.setupComplete,
      currentLanguage: typeof window.GetPlayerCurrentLanguage === 'function' ? 
        window.GetPlayerCurrentLanguage() : 'unknown',
      currentVolume: typeof window.GetPlayerCurrentVolume === 'function' ? 
        window.GetPlayerCurrentVolume() : 'unknown'
    };
  }

  // === ⚙️ MÉTHODES SPÉCIFIQUES OPTIONS ===
  
  // Méthodes de compatibilité Options
  openOptions() {
    return this.showModule('options');
  }
  
  closeOptions() {
    return this.hideModule('options');
  }
  
  toggleOptions() {
    return this.toggleModule('options');
  }
  
  getOptionsInstance() {
    return this.getModuleInstance('options');
  }
  
  isOptionsOpen() {
    const state = this.getModuleState('options');
    return state ? state.visible : false;
  }
  
  // Forcer le repositionnement des Options
  repositionOptions() {
    this.positionIcon('options');
  }

  // === MÉTHODES RESTANTES (identiques) ===

  // ✅ FIX 12: Méthode pour forcer reset si nécessaire
  resetInitializationTracker() {
    console.log('🔄 [UIManager] Reset tracker initialisation...');
    
    this.initializationTracker.inProgress.clear();
    this.initializationTracker.completed.clear();
    this.initializationTracker.iconCreated.clear();
    this.initializationTracker.attempts.clear();
    
    console.log('✅ [UIManager] Tracker reset');
  }
  
  // ✅ FIX 13: Méthode pour diagnostiquer les doublons
  diagnoseInitializationIssues() {
    const issues = [];
    
    // Vérifier les modules avec tentatives multiples
    this.initializationTracker.attempts.forEach((attempts, moduleId) => {
      if (attempts > 1) {
        issues.push(`Module ${moduleId}: ${attempts} tentatives d'initialisation`);
      }
    });
    
    // Vérifier les modules en cours depuis trop longtemps
    this.initializationTracker.inProgress.forEach(moduleId => {
      issues.push(`Module ${moduleId}: initialisation bloquée en cours`);
    });
    
    // Vérifier les icônes multiples pour même module
    const iconCounts = new Map();
    this.registeredIcons.forEach((config, moduleId) => {
      iconCounts.set(moduleId, (iconCounts.get(moduleId) || 0) + 1);
    });
    
    iconCounts.forEach((count, moduleId) => {
      if (count > 1) {
        issues.push(`Module ${moduleId}: ${count} icônes enregistrées`);
      }
    });
    
    return {
      issues,
      tracker: {
        inProgress: Array.from(this.initializationTracker.inProgress),
        completed: Array.from(this.initializationTracker.completed),
        iconCreated: Array.from(this.initializationTracker.iconCreated),
        attempts: Object.fromEntries(this.initializationTracker.attempts)
      }
    };
  }

  setGameState(stateName, options = {}) {
    const previousState = this.globalState.currentGameState;
    
    if (this.debug) {
      console.log(`🎮 [UIManager] Changement état: ${previousState} → ${stateName}`);
    }
    
    const stateConfig = this.gameStates[stateName];
    if (!stateConfig) {
      console.warn(`⚠️ [UIManager] État ${stateName} non défini`);
      return false;
    }
    
    this.globalState.currentGameState = stateName;
    this.applyGameState(stateConfig, options.animated !== false);
    
    return true;
  }

  applyGameState(stateConfig, animated = true) {
    console.log(`🎮 [UIManager] Application état avec reset complet:`, stateConfig);
    
    const { visibleModules = [], hiddenModules = [], enabledModules = [], disabledModules = [] } = stateConfig;
    
    // ✅ ÉTAPE 1: RESET COMPLET - tous les modules dans un état neutre
    const allModuleIds = Array.from(this.modules.keys());
    
    // D'abord, remettre tous les modules visibles et activés
    allModuleIds.forEach(moduleId => {
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        // Reset styles
        iconConfig.element.style.display = 'block';
        iconConfig.element.style.visibility = 'visible';
        iconConfig.element.style.opacity = '1';
        iconConfig.element.style.pointerEvents = 'auto';
        iconConfig.element.style.filter = '';
        iconConfig.element.classList.remove('ui-hidden', 'ui-disabled', 'hidden');
      }
    });
    
    console.log(`🔄 [UIManager] Reset ${allModuleIds.length} modules en état neutre`);
    
    // ✅ ÉTAPE 2: Appliquer les restrictions (hide/disable)
    
    // D'abord désactiver
    disabledModules.forEach(moduleId => {
      // ⚙️ NOUVEAU : Ne jamais désactiver Options automatiquement
      if (moduleId !== 'options') {
        this.disableModule(moduleId);
        console.log(`🔒 [UIManager] Module ${moduleId} désactivé`);
      }
    });
    
    // Puis cacher (plus restrictif que désactiver)
    hiddenModules.forEach(moduleId => {
      // ⚙️ NOUVEAU : Ne jamais cacher Options automatiquement
      if (moduleId !== 'options') {
        this.hideModule(moduleId, { animated });
        console.log(`👻 [UIManager] Module ${moduleId} caché`);
      }
    });
    
    // ✅ ÉTAPE 3: Appliquer les permissions (show/enable) avec délai
    setTimeout(() => {
      // D'abord montrer
      visibleModules.forEach(moduleId => {
        this.showModule(moduleId, { animated });
        console.log(`👁️ [UIManager] Module ${moduleId} affiché`);
      });
      
      // Puis activer
      enabledModules.forEach(moduleId => {
        this.enableModule(moduleId);
        console.log(`🔧 [UIManager] Module ${moduleId} activé`);
      });
      
      // ✅ ÉTAPE 4: Repositionner toutes les icônes
      this.repositionAllIcons();
      
      console.log(`✅ [UIManager] État appliqué avec repositionnement et protection Options`);
      
    }, animated ? 150 : 0);
  }
  
  toggleModule(moduleId, options = {}) {
    const state = this.moduleStates.get(moduleId);
    if (!state) return false;
    
    if (state.visible) {
      return this.hideModule(moduleId, options);
    } else {
      return this.showModule(moduleId, options);
    }
  }

  setModuleState(moduleId, newState) {
    const currentState = this.moduleStates.get(moduleId);
    if (!currentState) {
      console.warn(`⚠️ [UIManager] Module ${moduleId} non trouvé`);
      return false;
    }
    
    const updatedState = { ...currentState, ...newState };
    this.moduleStates.set(moduleId, updatedState);
    this.applyModuleState(moduleId);
    
    return true;
  }

  applyModuleState(moduleId) {
    const config = this.modules.get(moduleId);
    const state = this.moduleStates.get(moduleId);
    
    if (!config || !config.instance || !state.initialized) {
      return;
    }
    
    const instance = config.instance;
    
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
      console.error(`❌ [UIManager] Erreur application état ${moduleId}:`, error);
    }
  }

  canShowModule(moduleId) {
    // ⚙️ NOUVEAU : Options peut toujours être affiché
    if (moduleId === 'options') {
      return true;
    }
    
    for (const [rule, blockedModules] of Object.entries(this.interactionRules)) {
      if (this.isRuleActive(rule) && blockedModules.includes(moduleId)) {
        return false;
      }
    }
    
    return true;
  }

  isRuleActive(rule) {
    switch (rule) {
      case 'inventory_open':
        // ✅ CORRECTION: Vérifier si l'interface inventaire est vraiment ouverte
        const inventoryOverlay = document.querySelector('#inventory-overlay');
        const inventoryVisible = inventoryOverlay && 
          inventoryOverlay.style.display !== 'none' && 
          !inventoryOverlay.classList.contains('hidden') &&
          window.getComputedStyle(inventoryOverlay).opacity > 0.1;
        return inventoryVisible;
        
      case 'team_open':
        // ✅ CORRECTION: Vérifier si l'interface team est vraiment ouverte
        const teamOverlay = document.querySelector('#team-overlay');
        const teamVisible = teamOverlay && 
          teamOverlay.style.display !== 'none' && 
          !teamOverlay.classList.contains('hidden') &&
          window.getComputedStyle(teamOverlay).opacity > 0.1;
        return teamVisible;
        
      case 'dialogue_active':
        return this.globalState.currentGameState === 'dialogue';
        
      case 'battle_active':
        return this.globalState.currentGameState === 'battle';
        
      default:
        return false;
    }
  }

  getModule(moduleId) {
    return this.modules.get(moduleId) || null;
  }

  getModuleInstance(moduleId) {
    const config = this.modules.get(moduleId);
    return config?.instance || null;
  }

  getModuleState(moduleId) {
    return this.moduleStates.get(moduleId) || null;
  }

  isModuleInitialized(moduleId) {
    const state = this.moduleStates.get(moduleId);
    return state?.initialized || false;
  }

  getGlobalState() {
    return {
      ...this.globalState,
      openModules: Array.from(this.openModules),
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      iconConfiguration: this.getIconConfiguration(),
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized)
        .map(([id]) => id),
      protection: {
        inProgress: Array.from(this.initializationTracker.inProgress),
        completed: Array.from(this.initializationTracker.completed),
        iconCreated: Array.from(this.initializationTracker.iconCreated)
      },
      optionsAPI: this.checkOptionsAPI()
    };
  }

  hideAllModules(except = []) {
    // ⚙️ NOUVEAU : Toujours exclure Options par défaut
    const finalExcept = [...except];
    if (!finalExcept.includes('options')) {
      finalExcept.push('options');
    }
    
    this.modules.forEach((config, moduleId) => {
      if (!finalExcept.includes(moduleId)) {
        this.hideModule(moduleId);
      }
    });
  }

  showAllModules(except = []) {
    this.modules.forEach((config, moduleId) => {
      if (!except.includes(moduleId)) {
        this.showModule(moduleId);
      }
    });
  }

  enableAllModules(except = []) {
    this.modules.forEach((config, moduleId) => {
      if (!except.includes(moduleId)) {
        this.enableModule(moduleId);
      }
    });
  }

  disableAllModules(except = []) {
    // ⚙️ NOUVEAU : Toujours exclure Options par défaut
    const finalExcept = [...except];
    if (!finalExcept.includes('options')) {
      finalExcept.push('options');
    }
    
    this.modules.forEach((config, moduleId) => {
      if (!finalExcept.includes(moduleId)) {
        this.disableModule(moduleId);
      }
    });
  }

  setIconSize(width, height) {
    console.log(`📏 [UIManager] Changement taille icônes: ${width}x${height}`);
    
    this.updateIconConfig({
      defaultSize: { width, height },
      responsiveSizes: {
        mobile: { width: Math.round(width * 0.85), height: Math.round(height * 0.85) },
        tablet: { width: Math.round(width * 0.92), height: Math.round(height * 0.92) },
        desktop: { width, height }
      }
    });
  }
  
  setIconSpacing(spacing) {
    console.log(`📏 [UIManager] Changement espacement icônes: ${spacing}px`);
    this.updateIconConfig({ spacing });
  }
  
  setIconPadding(padding) {
    console.log(`📏 [UIManager] Changement padding icônes: ${padding}px`);
    this.updateIconConfig({ padding });
  }
  
  setGlobalOffset(offset) {
    console.log(`📏 [UIManager] Changement décalage global icônes: ${offset}px vers la gauche`);
    this.updateIconConfig({ globalOffset: offset });
  }
  
  // ⚙️ NOUVEAU : Configuration spécifique Options
  setOptionsOffset(offset) {
    console.log(`⚙️ [UIManager] Changement décalage Options: ${offset}px`);
    this.updateIconConfig({ optionsOffset: offset });
  }
  
  getIconConfiguration() {
    return {
      ...this.iconConfig,
      currentSize: this.getCurrentIconSize(),
      currentBreakpoint: this.currentBreakpoint,
      globalOffset: this.iconConfig.globalOffset || 0,
      optionsOffset: this.iconConfig.optionsOffset || 0
    };
  }

  createGroup() { return this; }
  on() { return this; }
  off() { return this; }
  emit() { return this; }

  handleError(error, context) {
    console.error(`❌ [UIManager:${context}]`, error);
  }

  // === ⚙️ DEBUG AMÉLIORÉ AVEC OPTIONS ===

  debugInfo() {
    const iconConfig = this.getIconConfiguration();
    const diagnosis = this.diagnoseInitializationIssues();
    const optionsAPI = this.checkOptionsAPI();
    
    const info = {
      mode: 'uimanager-with-options-support-top-right-escape-api',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      iconConfiguration: iconConfig,
      globalOffset: this.iconConfig.globalOffset || 0,
      optionsOffset: this.iconConfig.optionsOffset || 0,
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized).length,
      openModules: Array.from(this.openModules),
      
      // ⚙️ NOUVEAU : Info Options spécifique
      optionsInfo: {
        registered: this.modules.has('options'),
        initialized: this.isModuleInitialized('options'),
        visible: this.isOptionsOpen(),
        instance: !!this.getOptionsInstance(),
        apiStatus: optionsAPI,
        escapeHandling: this.escapeHandling,
        group: this.registeredIcons.get('options')?.group,
        anchor: this.registeredIcons.get('options')?.anchor,
        order: this.registeredIcons.get('options')?.order
      },
      
      // ✅ Info protection anti-duplication
      protection: {
        inProgress: Array.from(this.initializationTracker.inProgress),
        completed: Array.from(this.initializationTracker.completed),
        iconCreated: Array.from(this.initializationTracker.iconCreated),
        attempts: Object.fromEntries(this.initializationTracker.attempts),
        issues: diagnosis.issues
      },
      
      moduleStates: Object.fromEntries(
        Array.from(this.moduleStates.entries()).map(([id, state]) => [
          id, 
          { visible: state.visible, enabled: state.enabled, initialized: state.initialized }
        ])
      ),
      
      registeredIcons: Object.fromEntries(
        Array.from(this.registeredIcons.entries()).map(([id, config]) => [
          id,
          { 
            anchor: config.anchor,
            order: config.order,
            group: config.group,
            size: config.size,
            hasElement: !!config.element,
            visible: config.element ? config.element.style.display !== 'none' : false,
            positioned: config.element ? !!(config.element.style.left && config.element.style.top) : false,
            positionedBy: config.element ? config.element.getAttribute('data-positioned-by') : null
          }
        ])
      ),
      
      interactionRules: this.interactionRules
    };
    
    console.group('🎛️ UIManager Debug Info (avec Module Options complet)');
    console.table(info.moduleStates);
    console.log('⚙️ Info Options:', info.optionsInfo);
    console.log('🛡️ Protection anti-duplication:', info.protection);
    console.log('📏 Configuration icônes:', iconConfig);
    console.log('📍 Décalages:', `global: ${info.globalOffset}px, options: ${info.optionsOffset}px`);
    console.log('📍 Icônes créées:', info.registeredIcons);
    console.log('⚠️ Issues détectées:', diagnosis.issues);
    console.groupEnd();
    
    return info;
  }

  destroy() {
    console.log('🧹 [UIManager] Destruction PROTÉGÉE avec Options...');
    
    try {
      const style = document.querySelector('#uimanager-global-icons');
      if (style) style.remove();
      
      this.modules.forEach((config, moduleId) => {
        if (config.instance && typeof config.instance.destroy === 'function') {
          config.instance.destroy();
        }
      });
      
      this.modules.clear();
      this.moduleStates.clear();
      this.moduleInstances.clear();
      this.openModules.clear();
      this.registeredIcons.clear();
      this.iconGroups.clear();
      
      // Reset tracker
      this.resetInitializationTracker();
      
      // ⚙️ NOUVEAU : Nettoyer API Options
      if (typeof window.GetPlayerCurrentLanguage !== 'undefined') {
        delete window.GetPlayerCurrentLanguage;
        delete window.GetPlayerCurrentVolume;
        delete window.IsPlayerAudioMuted;
        delete window.openOptions;
        delete window.closeOptions;
        delete window.toggleOptions;
      }
      
      this.globalState.initialized = false;
      
      console.log('✅ [UIManager] Destruction PROTÉGÉE terminée avec nettoyage API Options');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destruction:', error);
    }
  }
}

export default UIManager;
