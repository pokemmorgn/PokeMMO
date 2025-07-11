// client/src/managers/UIManager.js - AJOUT POSITIONNEMENT MINIMAL
// 🎯 Garde tout l'existant, ajoute juste le positionnement automatique

export class UIManager {
  constructor(options = {}) {
    console.log('🎛️ UIManager simplifié initialisé');
    
    // === CONFIGURATION SIMPLE ===
    this.debug = options.debug || false;
    this.gameStates = options.gameStates || {};
    
    // === STOCKAGE DES MODULES ===
    this.modules = new Map();
    this.moduleStates = new Map();
    this.moduleInstances = new Map();
    
    // === ÉTAT GLOBAL ===
    this.globalState = {
      visible: true,
      enabled: true,
      initialized: false,
      currentGameState: 'exploration'
    };
    
    // === 🆕 SYSTÈME DE POSITIONNEMENT MINIMAL ===
    this.registeredIcons = new Map();
    this.iconGroups = new Map();
    this.setupDefaultGroups();
    this.setupResizeListener();
    
    // === RÈGLES D'INTERACTION SIMPLES ===
    this.interactionRules = {
      inventory_open: ['team'],
      team_open: ['inventory'],
      dialogue_active: ['inventory', 'team', 'quest'],
      battle_active: ['inventory', 'team', 'quest', 'questTracker', 'chat']
    };
    
    this.openModules = new Set();
  }

  // === 🆕 POSITIONNEMENT MINIMAL ===
  
  setupDefaultGroups() {
    // Groupe par défaut pour les icônes UI
    this.iconGroups.set('ui-icons', {
      anchor: 'bottom-right',
      spacing: 10,
      padding: 20,
      members: []
    });
  }

  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.repositionAllIcons();
      }, 200);
    });
  }

  // 🆕 Enregistrer une icône pour positionnement automatique
  registerIconPosition(moduleId, iconElement, config = {}) {
    if (!iconElement) {
      console.warn(`⚠️ [UIManager] Pas d'élément pour ${moduleId}`);
      return;
    }

    const iconConfig = {
      element: iconElement,
      moduleId: moduleId,
      anchor: config.anchor || 'bottom-right',
      order: config.order || 0,
      group: config.group || 'ui-icons',
      spacing: config.spacing || 10,
      size: config.size || { width: 70, height: 80 }
    };

    this.registeredIcons.set(moduleId, iconConfig);

    // Ajouter au groupe
    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    if (!group.members.includes(moduleId)) {
      group.members.push(moduleId);
      // Trier par ordre
      group.members.sort((a, b) => {
        const iconA = this.registeredIcons.get(a);
        const iconB = this.registeredIcons.get(b);
        return (iconA?.order || 0) - (iconB?.order || 0);
      });
    }

    // Positionner immédiatement
    this.positionIcon(moduleId);

    console.log(`📍 [UIManager] Icône ${moduleId} enregistrée et positionnée`);
  }

  // 🆕 Calculer et appliquer la position d'une icône
  positionIcon(moduleId) {
    const iconConfig = this.registeredIcons.get(moduleId);
    if (!iconConfig || !iconConfig.element) return;

    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    const memberIndex = group.members.indexOf(moduleId);
    
    if (memberIndex === -1) return;

    // Position de base selon anchor
    let baseX, baseY;
    const padding = group.padding || 20;
    
    switch (iconConfig.anchor) {
      case 'bottom-right':
        baseX = window.innerWidth - padding;
        baseY = window.innerHeight - padding;
        break;
      case 'bottom-left':
        baseX = padding;
        baseY = window.innerHeight - padding;
        break;
      case 'top-right':
        baseX = window.innerWidth - padding;
        baseY = padding;
        break;
      case 'top-left':
        baseX = padding;
        baseY = padding;
        break;
      default:
        baseX = window.innerWidth - padding;
        baseY = window.innerHeight - padding;
    }

    // Calculer offset selon la position dans le groupe
    const spacing = iconConfig.spacing;
    const iconWidth = iconConfig.size.width;
    
    let offsetX = 0;
    if (iconConfig.anchor.includes('right')) {
      // Pour bottom-right, on va vers la gauche
      offsetX = -memberIndex * (iconWidth + spacing) - iconWidth;
    } else {
      // Pour les autres, on va vers la droite
      offsetX = memberIndex * (iconWidth + spacing);
    }

    // Appliquer la position
    const element = iconConfig.element;
    element.style.position = 'fixed';
    element.style.left = `${baseX + offsetX}px`;
    element.style.top = `${baseY - iconConfig.size.height}px`;
    element.style.zIndex = '500';

    if (this.debug) {
      console.log(`📍 [UIManager] ${moduleId} positionné à (${baseX + offsetX}, ${baseY - iconConfig.size.height})`);
    }
  }

  // 🆕 Repositionner toutes les icônes
  repositionAllIcons() {
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      this.positionIcon(moduleId);
    });
    
    if (this.debug) {
      console.log('🔄 [UIManager] Toutes les icônes repositionnées');
    }
  }

  // === 📝 ENREGISTREMENT MODULES (IDENTIQUE À AVANT) ===
  
  async registerModule(moduleId, moduleConfig) {
    if (this.debug) {
      console.log(`📝 [UIManager] Enregistrement module: ${moduleId}`);
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
      layout: moduleConfig.layout || {}, // 🆕 Config layout
      ...moduleConfig
    };
    
    this.modules.set(moduleId, config);
    this.moduleStates.set(moduleId, { ...config.defaultState });
    
    if (this.debug) {
      console.log(`✅ [UIManager] Module ${moduleId} enregistré`);
    }
    
    return this;
  }

  // === 🚀 INITIALISATION MODULES (AJOUT AUTO-POSITIONNEMENT) ===
  
  async initializeModule(moduleId, ...args) {
    if (this.debug) {
      console.log(`🚀 [UIManager] Initialisation module: ${moduleId}`);
    }
    
    const config = this.modules.get(moduleId);
    if (!config) {
      throw new Error(`Module ${moduleId} non enregistré`);
    }
    
    const state = this.moduleStates.get(moduleId);
    if (state.initialized) {
      if (this.debug) {
        console.log(`ℹ️ [UIManager] Module ${moduleId} déjà initialisé`);
      }
      return config.instance;
    }
    
    try {
      // Créer l'instance
      const instance = await config.factory(...args);
      
      if (!instance) {
        throw new Error(`Factory du module ${moduleId} a retourné null`);
      }
      
      // Stocker l'instance
      config.instance = instance;
      this.moduleInstances.set(moduleId, instance);
      state.initialized = true;
      
      // 🆕 AUTO-ENREGISTREMENT POUR POSITIONNEMENT
      this.autoRegisterIcon(moduleId, instance, config);
      
      // Appliquer l'état initial
      this.applyModuleState(moduleId);
      
      if (this.debug) {
        console.log(`✅ [UIManager] Module ${moduleId} initialisé`);
      }
      
      return instance;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur initialisation ${moduleId}:`, error);
      throw error;
    }
  }

  // 🆕 Enregistrement automatique des icônes
  autoRegisterIcon(moduleId, instance, config) {
    // Chercher l'élément icône
    const iconElement = this.findIconElement(instance);
    
    if (iconElement && config.layout) {
      // Supprimer tout positionnement manuel existant
      iconElement.style.position = '';
      iconElement.style.right = '';
      iconElement.style.bottom = '';
      iconElement.style.left = '';
      iconElement.style.top = '';
      
      // Enregistrer pour positionnement automatique
      this.registerIconPosition(moduleId, iconElement, config.layout);
      
      if (this.debug) {
        console.log(`📍 [UIManager] Icône ${moduleId} auto-enregistrée`);
      }
    }
  }

  findIconElement(instance) {
    const possibleElements = [
      instance.iconElement,
      instance.icon?.iconElement,
      instance.element,
      instance.container
    ];
    
    return possibleElements.find(el => el && el.nodeType === Node.ELEMENT_NODE) || null;
  }

  // === RESTE IDENTIQUE À L'ANCIEN UIMANAGER ===

  async initializeAllModules(...args) {
    if (this.debug) {
      console.log('🚀 [UIManager] Initialisation de tous les modules...');
    }
    
    const results = {};
    const errors = [];
    
    const sortedModules = Array.from(this.modules.entries())
      .sort((a, b) => (b[1].priority || 100) - (a[1].priority || 100));
    
    for (const [moduleId, config] of sortedModules) {
      try {
        const instance = await this.initializeModule(moduleId, ...args);
        results[moduleId] = instance;
      } catch (error) {
        errors.push(`${moduleId}: ${error.message}`);
        if (config.critical) {
          console.error(`💥 [UIManager] Module critique ${moduleId} a échoué !`);
        }
      }
    }
    
    this.globalState.initialized = true;
    
    // 🆕 Repositionner après initialisation
    setTimeout(() => {
      this.repositionAllIcons();
    }, 100);
    
    if (this.debug) {
      console.log(`✅ [UIManager] Initialisation terminée. Succès: ${Object.keys(results).length}, Erreurs: ${errors.length}`);
    }
    
    return {
      success: errors.length === 0,
      results,
      errors
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
    const { visibleModules = [], hiddenModules = [], enabledModules = [], disabledModules = [] } = stateConfig;
    
    hiddenModules.forEach(moduleId => {
      this.hideModule(moduleId, { animated });
    });
    
    disabledModules.forEach(moduleId => {
      this.disableModule(moduleId);
    });
    
    setTimeout(() => {
      visibleModules.forEach(moduleId => {
        this.showModule(moduleId, { animated });
      });
      
      enabledModules.forEach(moduleId => {
        this.enableModule(moduleId);
      });
      
      // 🆕 Repositionner après changement d'état
      this.repositionAllIcons();
    }, animated ? 100 : 0);
  }

  showModule(moduleId, options = {}) {
    if (!this.canShowModule(moduleId)) {
      if (this.debug) {
        console.log(`🚫 [UIManager] Impossible d'afficher ${moduleId} (règles d'interaction)`);
      }
      return false;
    }
    
    const success = this.setModuleState(moduleId, { visible: true });
    
    if (success) {
      this.openModules.add(moduleId);
      
      // 🆕 Réafficher l'icône si enregistrée
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.display = '';
        this.positionIcon(moduleId);
      }
      
      if (this.debug) {
        console.log(`👁️ [UIManager] Module ${moduleId} affiché`);
      }
    }
    
    return success;
  }
  
  hideModule(moduleId, options = {}) {
    const success = this.setModuleState(moduleId, { visible: false });
    
    if (success) {
      this.openModules.delete(moduleId);
      
      // 🆕 Cacher l'icône si enregistrée
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.display = 'none';
        // Repositionner les autres icônes
        this.repositionAllIcons();
      }
      
      if (this.debug) {
        console.log(`👻 [UIManager] Module ${moduleId} caché`);
      }
    }
    
    return success;
  }
  
  enableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: true });
    
    if (success && this.debug) {
      console.log(`🔧 [UIManager] Module ${moduleId} activé`);
    }
    
    return success;
  }
  
  disableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: false });
    
    if (success && this.debug) {
      console.log(`🔧 [UIManager] Module ${moduleId} désactivé`);
    }
    
    return success;
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
        return this.openModules.has('inventory');
      case 'team_open':
        return this.openModules.has('team') || this.openModules.has('teamUI');
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
      totalIcons: this.registeredIcons.size, // 🆕
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized)
        .map(([id]) => id)
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

  // 🆕 Debug avec positionnement
  debugInfo() {
    const info = {
      mode: 'simplified-with-positioning',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized).length,
      openModules: Array.from(this.openModules),
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
            hasElement: !!config.element
          }
        ])
      ),
      interactionRules: this.interactionRules
    };
    
    console.group('🎛️ UIManager Debug Info (avec positionnement minimal)');
    console.table(info.moduleStates);
    console.log('📍 Icônes positionnées:', info.registeredIcons);
    console.log('📊 Global State:', {
      currentGameState: info.currentGameState,
      openModules: info.openModules,
      rules: Object.keys(this.interactionRules).filter(rule => this.isRuleActive(rule))
    });
    console.groupEnd();
    
    return info;
  }

  createGroup() { return this; }
  on() { return this; }
  off() { return this; }
  emit() { return this; }

  handleError(error, context) {
    console.error(`❌ [UIManager:${context}]`, error);
  }

  destroy() {
    console.log('🧹 [UIManager] Destruction...');
    
    try {
      this.modules.forEach((config, moduleId) => {
        if (config.instance && typeof config.instance.destroy === 'function') {
          config.instance.destroy();
        }
      });
      
      this.modules.clear();
      this.moduleStates.clear();
      this.moduleInstances.clear();
      this.openModules.clear();
      this.registeredIcons.clear(); // 🆕
      this.iconGroups.clear(); // 🆕
      
      this.globalState.initialized = false;
      
      console.log('✅ [UIManager] Destruction terminée');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destruction:', error);
    }
  }
}

export default UIManager;

console.log(`
🎯 === UIMANAGER AVEC POSITIONNEMENT MINIMAL ===

🆕 AJOUTS UNIQUEMENT:
• registeredIcons Map pour suivre les icônes
• iconGroups Map pour grouper (ui-icons par défaut)
• registerIconPosition() pour enregistrer
• positionIcon() pour calculer positions
• repositionAllIcons() pour tout recalculer
• autoRegisterIcon() appelé automatiquement

📍 FONCTIONNEMENT:
• Garde 100% de l'ancien UIManager
• Ajoute le positionnement en bonus
• Auto-détecte les icônes des modules
• Position bottom-right avec espacement auto

⚔️ POUR TEAM:
• Enregistrement automatique
• Position calculée selon order
• Pas de modification TeamIcon requise
• Fonctionne avec l'ui.js existant

✅ COMPATIBLE À 100% !
`);
