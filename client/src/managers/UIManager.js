// managers/UIManager.js - Version finale propre avec gameStates complets
export class UIManager {
  constructor(options = {}) {
    this.debug = options.debug || false;
    
    // ✅ Configuration gameStates par défaut avec bataille
    this.gameStates = options.gameStates || {
      exploration: {
        visibleModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather'],
        hiddenModules: [],
        enabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather'],
        disabledModules: []
      },
      
      dialogue: {
        visibleModules: ['options'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'timeWeather'],
        enabledModules: ['options'],
        disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'timeWeather']
      },
      
      battle: {
        visibleModules: [],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather'],
        enabledModules: [],
        disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather']
      },
      
      menu: {
        visibleModules: ['options'],
        hiddenModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'timeWeather'],
        enabledModules: ['options'],
        disabledModules: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'timeWeather']
      }
    };
    
    this.modules = new Map();
    this.moduleStates = new Map();
    this.moduleInstances = new Map();
    
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
      zIndex: 500
    };
    
    this.registeredIcons = new Map();
    this.iconGroups = new Map();
    this.currentBreakpoint = this.getCurrentBreakpoint();
    
    this.setupDefaultGroups();
    this.setupResizeListener();
    this.injectGlobalIconCSS();
    
    this.interactionRules = {
      inventory_open: ['team'],
      team_open: ['inventory'],
      options_open: [],
      dialogue_active: ['inventory', 'team', 'quest'],
      battle_active: ['inventory', 'team', 'quest', 'questTracker', 'chat', 'options', 'timeWeather']
    };
    
    this.openModules = new Set();
    this.setupGlobalKeyboardHandlers();
  }

  // === INITIALISATION MODULE AVEC PROTECTION ===
  
  async initializeModule(moduleId, ...args) {
    if (this.initializationTracker.inProgress.has(moduleId)) {
      return await this.waitForInitialization(moduleId);
    }
    
    if (this.initializationTracker.completed.has(moduleId)) {
      const config = this.modules.get(moduleId);
      if (config?.instance) {
        return config.instance;
      }
    }
    
    this.initializationTracker.inProgress.add(moduleId);
    this.trackInitializationAttempt(moduleId);
    
    const config = this.modules.get(moduleId);
    if (!config) {
      this.initializationTracker.inProgress.delete(moduleId);
      throw new Error(`Module ${moduleId} non enregistré`);
    }
    
    const state = this.moduleStates.get(moduleId);
    
    try {
      if (state.initialized && config.instance) {
        this.initializationTracker.inProgress.delete(moduleId);
        this.initializationTracker.completed.add(moduleId);
        return config.instance;
      }
      
      const instance = await config.factory(...args);
      
      if (!instance) {
        throw new Error(`Factory du module ${moduleId} a retourné null`);
      }
      
      config.instance = instance;
      this.moduleInstances.set(moduleId, instance);
      state.initialized = true;
      
      if (instance) {
        instance.initialized = true;
        instance.isEnabled = state.enabled !== false;
        
        if (moduleId === 'options') {
          this.setupOptionsModule(instance);
        }
      }
      
      this.initializationTracker.completed.add(moduleId);
      this.initializationTracker.inProgress.delete(moduleId);
      
      await this.createModuleIconProtected(moduleId, instance, config);
      this.applyModuleState(moduleId);
      
      return instance;
      
    } catch (error) {
      this.initializationTracker.inProgress.delete(moduleId);
      this.initializationTracker.completed.delete(moduleId);
      throw error;
    }
  }
  
  trackInitializationAttempt(moduleId) {
    const attempts = this.initializationTracker.attempts.get(moduleId) || 0;
    this.initializationTracker.attempts.set(moduleId, attempts + 1);
  }
  
  async waitForInitialization(moduleId, maxWait = 5000) {
    const startTime = Date.now();
    
    while (this.initializationTracker.inProgress.has(moduleId)) {
      if (Date.now() - startTime > maxWait) {
        this.initializationTracker.inProgress.delete(moduleId);
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const config = this.modules.get(moduleId);
    return config?.instance || null;
  }

  async createModuleIconProtected(moduleId, instance, config) {
    if (this.initializationTracker.iconCreated.has(moduleId)) {
      return this.registeredIcons.get(moduleId)?.element || null;
    }
    
    try {
      const layoutConfig = config.layout;
      if (!layoutConfig || layoutConfig.type !== 'icon') {
        return null;
      }
      
      if (typeof instance.createIcon !== 'function') {
        return null;
      }
      
      this.initializationTracker.iconCreated.add(moduleId);
      
      const iconElement = await instance.createIcon();
      
      if (!iconElement) {
        this.initializationTracker.iconCreated.delete(moduleId);
        return null;
      }
      
      this.applyStandardizedSize(iconElement);
      this.registerIconPosition(moduleId, iconElement, layoutConfig);
      
      return iconElement;
      
    } catch (error) {
      this.initializationTracker.iconCreated.delete(moduleId);
      return null;
    }
  }

  async initializeAllModules(...args) {
    if (this.globalState.initialized) {
      return {
        success: true,
        results: Object.fromEntries(this.moduleInstances),
        errors: [],
        iconsCreated: this.registeredIcons.size,
        iconSize: this.getCurrentIconSize()
      };
    }
    
    const results = {};
    const errors = [];
    
    const sortedModules = Array.from(this.modules.entries())
      .sort((a, b) => (b[1].priority || 100) - (a[1].priority || 100));
    
    for (const [moduleId, config] of sortedModules) {
      try {
        const instance = await this.initializeModule(moduleId, ...args);
        results[moduleId] = instance;
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        errors.push(`${moduleId}: ${error.message}`);
      }
    }
    
    this.globalState.initialized = true;
    
    setTimeout(() => {
      this.repositionAllIcons();
    }, 100);
    
    return {
      success: errors.length === 0,
      results,
      errors,
      iconsCreated: this.registeredIcons.size,
      iconSize: this.getCurrentIconSize(),
      protectedModules: this.initializationTracker.completed.size
    };
  }
  
  setupOptionsModule(optionsInstance) {
    this.setupOptionsEvents(optionsInstance);
  }
  
  setupOptionsEvents(optionsInstance) {
    window.addEventListener('languageChanged', (event) => {
      if (typeof window.updateGameTexts === 'function') {
        window.updateGameTexts(event.detail.language);
      }
    });
    
    window.addEventListener('volumeChanged', (event) => {
      // Volume changé
    });
  }
  
  setupGlobalKeyboardHandlers() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey(event);
      }
    });
  }
  
  handleEscapeKey(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const openUIModules = this.getOpenUIModules();
    
    if (openUIModules.length > 0) {
      const priorityModule = this.getHighestPriorityOpenModule(openUIModules);
      this.closeModuleUI(priorityModule);
    } else {
      const optionsInstance = this.getModuleInstance('options');
      if (optionsInstance) {
        this.toggleModule('options');
      }
    }
  }
  
  getOpenUIModules() {
    const openModules = [];
    
    const uiChecks = [
      { id: 'inventory', selector: '#inventory-overlay', prop: 'isVisible' },
      { id: 'team', selector: '#team-overlay', prop: 'isVisible' },
      { id: 'quest', selector: '#quest-journal', prop: 'isVisible' },
      { id: 'options', selector: '#options-overlay', prop: 'isVisible' }
    ];
    
    uiChecks.forEach(({ id, selector, prop }) => {
      const element = document.querySelector(selector);
      const instance = this.getModuleInstance(id);
      
      const isOpen = (element && 
        element.style.display !== 'none' && 
        !element.classList.contains('hidden') &&
        window.getComputedStyle(element).opacity > 0.1) ||
        (instance && instance[prop]);
      
      if (isOpen) {
        openModules.push(id);
      }
    });
    
    return openModules;
  }
  
  getHighestPriorityOpenModule(openModules) {
    const priorities = {
      options: 1000,
      inventory: 100,
      team: 90,
      quest: 80
    };
    
    return openModules.reduce((highest, current) => {
      const currentPriority = priorities[current] || 0;
      const highestPriority = priorities[highest] || 0;
      return currentPriority > highestPriority ? current : highest;
    });
  }
  
  closeModuleUI(moduleId) {
    const instance = this.getModuleInstance(moduleId);
    if (instance) {
      if (typeof instance.close === 'function') {
        instance.close();
      } else if (typeof instance.hide === 'function') {
        instance.hide();
      } else if (typeof instance.toggleUI === 'function') {
        instance.toggleUI();
      }
    }
  }
  
  resetInitializationTracker() {
    this.initializationTracker.inProgress.clear();
    this.initializationTracker.completed.clear();
    this.initializationTracker.iconCreated.clear();
    this.initializationTracker.attempts.clear();
  }
  
  synchronizeElementReferences() {
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      const realElement = document.querySelector(`#${moduleId}-icon`);
      
      if (realElement && iconConfig.element !== realElement) {
        const allElements = document.querySelectorAll(`[id="${moduleId}-icon"]`);
        if (allElements.length > 1) {
          allElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0 || rect.left === 0) {
              element.remove();
            }
          });
        }
        
        iconConfig.element = realElement;
        realElement.classList.remove('hidden', 'ui-hidden');
        if (realElement.style.right || realElement.style.bottom) {
          realElement.style.right = '';
          realElement.style.bottom = '';
          realElement.style.inset = '';
        }
      }
    });
  }

  // === CONFIGURATION GROUPES ===
  
  setupDefaultGroups() {
    this.iconGroups.set('ui-icons', {
      anchor: 'bottom-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding,
      members: [],
      expectedOrder: ['inventory', 'quest', 'pokedex', 'team']
    });
    
    this.iconGroups.set('ui-options', {
      anchor: 'top-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding,
      members: [],
      expectedOrder: ['options']
    });
    
    this.iconGroups.set('weather', {
      anchor: 'top-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding,
      members: [],
      expectedOrder: ['timeWeather', 'weather']
    });
  }

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
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .ui-icon {
          width: ${responsiveSizes.tablet.width}px !important;
          height: ${responsiveSizes.tablet.height}px !important;
        }
      }
      
      @media (max-width: 768px) {
        .ui-icon {
          width: ${responsiveSizes.mobile.width}px !important;
          height: ${responsiveSizes.mobile.height}px !important;
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
      
      #options-icon.ui-icon[data-positioned-by="uimanager"]::before {
        content: "⚙️";
        background: rgba(74, 144, 226, 0.8);
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 8px;
      }
    `;
    
    document.head.appendChild(style);
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
  }
  
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();
        
        if (newBreakpoint !== this.currentBreakpoint) {
          this.currentBreakpoint = newBreakpoint;
          this.applyNewSizesToAllIcons();
        }
        
        this.repositionAllIcons();
      }, 200);
    });
  }
  
  applyNewSizesToAllIcons() {
    const currentSize = this.getCurrentIconSize();
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      if (iconConfig.element) {
        this.applyStandardizedSize(iconConfig.element);
        iconConfig.size = currentSize;
      }
    });
  }

  registerIconPosition(moduleId, iconElement, config = {}) {
    if (!iconElement) {
      return;
    }

    const currentSize = this.getCurrentIconSize();
    
    const iconConfig = {
      element: iconElement,
      moduleId: moduleId,
      anchor: config.anchor || 'bottom-right',
      order: config.order || 0,
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
  }

  positionIcon(moduleId) {
    // Condition spéciale weather
    if (moduleId.includes('timeWeather') || moduleId.includes('Weather')) {
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.position = 'fixed';
        iconConfig.element.style.left = '10px';
        iconConfig.element.style.top = '5px';
        iconConfig.element.style.zIndex = this.iconConfig.zIndex;
        iconConfig.element.setAttribute('data-positioned-by', 'uimanager-outside-left');
        return;
      }
    }

    // Condition spéciale options
    if (moduleId === 'options') {
      this.synchronizeElementReferences();
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        const padding = this.iconConfig.padding;
        const globalOffset = this.iconConfig.globalOffset || 0;
        
        const baseX = window.innerWidth - padding - globalOffset;
        const reducedTopPadding = 5;
        const baseY = reducedTopPadding;
        
        const group = this.iconGroups.get('ui-options') || this.iconGroups.get('ui-icons');
        const calculatedOrder = iconConfig.order !== undefined ? iconConfig.order : 0;
        const spacing = this.iconConfig.spacing;
        const iconWidth = iconConfig.size.width;
        
        const offsetX = -calculatedOrder * (iconWidth + spacing) - iconWidth;
        const finalX = baseX + offsetX;
        const finalY = baseY;
        
        iconConfig.element.style.position = 'fixed';
        iconConfig.element.style.left = `${finalX}px`;
        iconConfig.element.style.top = `${finalY}px`;
        iconConfig.element.style.zIndex = this.iconConfig.zIndex;
        iconConfig.element.setAttribute('data-positioned-by', 'uimanager-options-top-reduced');
        
        return;
      }
    }

    this.synchronizeElementReferences();
    
    const iconConfig = this.registeredIcons.get(moduleId);
    if (!iconConfig || !iconConfig.element) {
      return;
    }

    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    const memberIndex = group.members.indexOf(moduleId);
    
    if (memberIndex === -1) {
      return;
    }

    const isIsolatedModule = this.isIsolatedModule(moduleId, iconConfig);
    
    if (isIsolatedModule) {
      const intelligentPosition = this.calculateIntelligentPosition(moduleId, iconConfig);
      
      iconConfig.element.style.position = 'fixed';
      iconConfig.element.style.left = `${intelligentPosition.x}px`;
      iconConfig.element.style.top = `${intelligentPosition.y}px`;
      iconConfig.element.style.right = '';
      iconConfig.element.style.bottom = '';
      iconConfig.element.style.zIndex = this.iconConfig.zIndex;
      iconConfig.element.setAttribute('data-positioned-by', 'uimanager-intelligent');
      
      return;
    }
    
    let baseX, baseY;
    const padding = this.iconConfig.padding;
    const globalOffset = this.iconConfig.globalOffset || 0;
    
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
        baseX = window.innerWidth - padding - globalOffset;
        baseY = padding + 60;
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
    
    const calculatedOrder = iconConfig.order !== undefined ? iconConfig.order : memberIndex;
    
    let offsetX = 0;
    if (iconConfig.anchor.includes('right')) {
      offsetX = -calculatedOrder * (iconWidth + spacing) - iconWidth;
    } else {
      offsetX = calculatedOrder * (iconWidth + spacing);
    }

    const element = iconConfig.element;
    const finalX = baseX + offsetX;
    let finalY = baseY;
    
    if (iconConfig.anchor.startsWith('bottom')) {
      finalY = baseY - iconConfig.size.height;
    } else if (iconConfig.anchor.startsWith('top')) {
      finalY = baseY;
    }
    
    element.style.position = 'fixed';
    element.style.left = `${finalX}px`;
    element.style.top = `${finalY}px`;
    element.style.zIndex = this.iconConfig.zIndex;
    element.setAttribute('data-positioned-by', 'uimanager');
  }
  
  isIsolatedModule(moduleId, iconConfig) {
    const highOrderThreshold = 10;
    const specialGroups = ['weather', 'standalone', 'overlay'];
    
    return (
      iconConfig.order >= highOrderThreshold ||
      specialGroups.includes(iconConfig.group) ||
      moduleId.includes('Weather') ||
      moduleId.includes('Time')
    );
  }
  
  calculateIntelligentPosition(moduleId, iconConfig) {
    const padding = this.iconConfig.padding;
    const globalOffset = this.iconConfig.globalOffset || 0;
    
    const element = iconConfig.element;
    const rect = element.getBoundingClientRect();
    let elementWidth = rect.width || iconConfig.size.width || 70;
    let elementHeight = rect.height || iconConfig.size.height || 80;
    
    if (elementWidth < 50) {
      if (moduleId.includes('timeWeather') || moduleId.includes('Weather')) {
        elementWidth = 350;
        elementHeight = 120;
      } else {
        elementWidth = 200;
        elementHeight = 100;
      }
    }
    
    const safetyMargin = 50;
    const comfortableSpacing = 30;
    const calculatedOffset = elementWidth + comfortableSpacing + safetyMargin;
    
    let x, y;
    
    switch (iconConfig.anchor) {
      case 'top-right':
        x = window.innerWidth - padding - globalOffset - calculatedOffset;
        y = padding;
        break;
        
      case 'top-left':
        x = padding + globalOffset + calculatedOffset;
        y = padding;
        break;
        
      case 'bottom-right':
        x = window.innerWidth - padding - globalOffset - calculatedOffset;
        y = window.innerHeight - padding - elementHeight;
        break;
        
      case 'bottom-left':
        x = padding + globalOffset + calculatedOffset;
        y = window.innerHeight - padding - elementHeight;
        break;
        
      default:
        x = window.innerWidth - padding - globalOffset - calculatedOffset;
        y = padding;
    }
    
    const minMargin = 20;
    x = Math.max(minMargin, Math.min(x, window.innerWidth - elementWidth - minMargin));
    y = Math.max(minMargin, Math.min(y, window.innerHeight - elementHeight - minMargin));
    
    return {
      x: Math.round(x),
      y: Math.round(y),
      offset: calculatedOffset
    };
  }

  repositionAllIcons() {
    this.synchronizeElementReferences();
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      this.positionIcon(moduleId);
    });
  }

  // === MÉTHODES PUBLIQUES ===

  async registerModule(moduleId, moduleConfig) {
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
      layout: moduleConfig.layout || {},
      ...moduleConfig
    };
    
    this.modules.set(moduleId, config);
    this.moduleStates.set(moduleId, { ...config.defaultState });
    
    return this;
  }

showModule(moduleId, options = {}) {
  const config = this.modules.get(moduleId);
  const state = this.moduleStates.get(moduleId);
  const iconConfig = this.registeredIcons.get(moduleId);
  
  if (!config || !state) {
    return false;
  }
  
  // Afficher l'icône
  if (iconConfig && iconConfig.element) {
    // ✅ RESTAURATION COMPLÈTE
    iconConfig.element.style.display = 'block';
    iconConfig.element.style.visibility = 'visible';
    iconConfig.element.style.opacity = '1';
    iconConfig.element.style.pointerEvents = 'auto';
    iconConfig.element.style.filter = '';
    iconConfig.element.classList.remove('ui-disabled', 'battle-hidden');
    
    console.log(`✅ [UIManager] Module ${moduleId} restauré`);
  }
  
  // Afficher l'interface du module si demandé
  if (options.openInterface && config.instance && typeof config.instance.show === 'function') {
    try {
      config.instance.show();
    } catch (error) {
      console.warn(`⚠️ Erreur affichage module ${moduleId}:`, error);
    }
  }
  
  // Mettre à jour l'état
  state.visible = true;
  this.moduleStates.set(moduleId, state);
  
  return true;
}

  
hideModule(moduleId, options = {}) {
  const config = this.modules.get(moduleId);
  const state = this.moduleStates.get(moduleId);
  const iconConfig = this.registeredIcons.get(moduleId);
  
  if (!config || !state) {
    return false;
  }
  
  // ✅ NOUVEAU : Vérifier si on est en mode battle
  const isBattleMode = this.globalState.currentGameState === 'battle';
  
  // Masquer complètement l'icône
if (iconConfig && iconConfig.element) {
  if (this.globalState.currentGameState === 'battle') {
    // ✅ EN BATTLE : MASQUAGE COMPLET
    iconConfig.element.style.display = 'none';
    iconConfig.element.style.visibility = 'hidden';
    iconConfig.element.style.opacity = '0';
    iconConfig.element.classList.add('battle-hidden');
  } else {
    // ✅ HORS BATTLE : DÉSACTIVATION NORMALE
    iconConfig.element.style.opacity = '0.5';
    iconConfig.element.style.pointerEvents = 'none';
    iconConfig.element.style.filter = 'grayscale(70%)';
    iconConfig.element.classList.add('ui-disabled');
  }
}
  
  // Cacher l'interface du module
  if (config.instance && typeof config.instance.hide === 'function') {
    try {
      config.instance.hide();
    } catch (error) {
      console.warn(`⚠️ Erreur masquage module ${moduleId}:`, error);
    }
  }
  
  // Mettre à jour l'état
  state.visible = false;
  this.moduleStates.set(moduleId, state);
  
  return true;
}
  
  enableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: true });
    
    if (success) {
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
    }
    
    return success;
  }
  
  disableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: false });
    
    if (success) {
      const instance = this.getModuleInstance(moduleId);
      if (instance) {
        instance.isEnabled = false;
      }
      
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.opacity = '0.5';
        iconConfig.element.style.pointerEvents = 'none';
        iconConfig.element.style.filter = 'grayscale(50%)';
        iconConfig.element.classList.add('ui-disabled');
      }
    }
    
    return success;
  }

  // === GESTION DES ÉTATS DE JEU ===

  setGameState(stateName, options = {}) {
    const previousState = this.globalState.currentGameState;
    
    const stateConfig = this.gameStates[stateName];
    if (!stateConfig) {
      return false;
    }
    
    this.globalState.currentGameState = stateName;
    this.applyGameState(stateConfig, options.animated !== false);
    
    return true;
  }

  applyGameState(stateConfig, animated = true) {
    const { visibleModules = [], hiddenModules = [], enabledModules = [], disabledModules = [] } = stateConfig;
    
    // Reset tous les modules à l'état visible et activé
    const allModuleIds = Array.from(this.modules.keys());
    
    allModuleIds.forEach(moduleId => {
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.display = 'block';
        iconConfig.element.style.visibility = 'visible';
        iconConfig.element.style.opacity = '1';
        iconConfig.element.style.pointerEvents = 'auto';
        iconConfig.element.style.filter = '';
        iconConfig.element.classList.remove('ui-hidden', 'ui-disabled', 'hidden');
      }
    });
    
    // Appliquer les restrictions
    disabledModules.forEach(moduleId => {
      this.disableModule(moduleId);
    });
    
    hiddenModules.forEach(moduleId => {
      this.hideModule(moduleId, { animated });
    });
    
    // Appliquer les permissions avec délai
    setTimeout(() => {
      visibleModules.forEach(moduleId => {
        this.showModule(moduleId, { animated });
      });
      
      enabledModules.forEach(moduleId => {
        this.enableModule(moduleId);
      });
      
      this.repositionAllIcons();
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
      // Erreur appliquation état
    }
  }

  canShowModule(moduleId) {
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
        const inventoryOverlay = document.querySelector('#inventory-overlay');
        const inventoryVisible = inventoryOverlay && 
          inventoryOverlay.style.display !== 'none' && 
          !inventoryOverlay.classList.contains('hidden') &&
          window.getComputedStyle(inventoryOverlay).opacity > 0.1;
        return inventoryVisible;
        
      case 'team_open':
        const teamOverlay = document.querySelector('#team-overlay');
        const teamVisible = teamOverlay && 
          teamOverlay.style.display !== 'none' && 
          !teamOverlay.classList.contains('hidden') &&
          window.getComputedStyle(teamOverlay).opacity > 0.1;
        return teamVisible;
        
      case 'options_open':
        const optionsOverlay = document.querySelector('#options-overlay');
        const optionsVisible = optionsOverlay && 
          optionsOverlay.style.display !== 'none' && 
          !optionsOverlay.classList.contains('hidden') &&
          window.getComputedStyle(optionsOverlay).opacity > 0.1;
        return optionsVisible;
        
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
      }
    };
  }

  hideAllModules(except = []) {
    this.modules.forEach((config, moduleId) => {
      if (!except.includes(moduleId)) {
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
    this.modules.forEach((config, moduleId) => {
      if (!except.includes(moduleId)) {
        this.disableModule(moduleId);
      }
    });
  }

  setIconSize(width, height) {
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
    this.updateIconConfig({ spacing });
  }
  
  setIconPadding(padding) {
    this.updateIconConfig({ padding });
  }
  
  setGlobalOffset(offset) {
    this.updateIconConfig({ globalOffset: offset });
  }
  
  getIconConfiguration() {
    return {
      ...this.iconConfig,
      currentSize: this.getCurrentIconSize(),
      currentBreakpoint: this.currentBreakpoint,
      globalOffset: this.iconConfig.globalOffset || 0
    };
  }

  createGroup() { return this; }
  on() { return this; }
  off() { return this; }
  emit() { return this; }

  handleError(error, context) {
    // Gestion erreur
  }

  debugInfo() {
    const iconConfig = this.getIconConfiguration();
    
    const info = {
      mode: 'uimanager-complete-with-battle-states',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      iconConfiguration: iconConfig,
      globalOffset: this.iconConfig.globalOffset || 0,
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized).length,
      openModules: Array.from(this.openModules),
      
      gameStates: Object.keys(this.gameStates),
      currentGameState: this.globalState.currentGameState,
      battleStateConfig: this.gameStates.battle,
      
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
    
    return info;
  }

  destroy() {
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
      
      this.resetInitializationTracker();
      
      this.globalState.initialized = false;
      
    } catch (error) {
      // Erreur destruction
    }
  }
}

export default UIManager;
