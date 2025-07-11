// client/src/managers/UIManager.js - VERSION AVEC POSITIONNEMENT AUTOMATIQUE
// 🎯 Gère automatiquement la position de toutes les icônes du jeu

export class UIManager {
  constructor(options = {}) {
    console.log('🎛️ UIManager avec positionnement automatique initialisé');
    
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
    
    // === SYSTÈME DE POSITIONNEMENT ===
    this.layoutManager = new LayoutManager(this);
    this.groups = new Map();
    this.registeredIcons = new Map();
    
    // === RÈGLES D'INTERACTION SIMPLES ===
    this.interactionRules = {
      inventory_open: ['team'],
      team_open: ['inventory'],
      dialogue_active: ['inventory', 'team', 'quest'],
      battle_active: ['inventory', 'team', 'quest', 'questTracker', 'chat']
    };
    
    this.openModules = new Set();
    
    // === SETUP RESIZE LISTENER ===
    this.setupResizeListener();
  }

  // ===== 📍 SYSTÈME DE POSITIONNEMENT =====
  
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.layoutManager.recalculateAllPositions();
      }, 200);
    });
  }

  registerIconPosition(moduleId, iconElement, layoutConfig = {}) {
    if (this.debug) {
      console.log(`📍 [UIManager] Enregistrement position icône: ${moduleId}`);
    }
    
    const iconInfo = {
      moduleId,
      element: iconElement,
      layout: {
        anchor: layoutConfig.anchor || 'bottom-right',
        order: layoutConfig.order || 0,
        spacing: layoutConfig.spacing || 10,
        offset: layoutConfig.offset || { x: 0, y: 0 },
        size: layoutConfig.size || { width: 70, height: 80 },
        group: layoutConfig.group || 'default'
      },
      visible: true,
      enabled: true,
      ...layoutConfig
    };
    
    this.registeredIcons.set(moduleId, iconInfo);
    
    // Ajouter au groupe
    this.addToGroup(iconInfo.layout.group, moduleId);
    
    // Calculer la position immédiatement
    this.layoutManager.calculatePosition(moduleId);
    
    if (this.debug) {
      console.log(`✅ [UIManager] Icône ${moduleId} enregistrée et positionnée`);
    }
    
    return iconInfo;
  }

  unregisterIconPosition(moduleId) {
    const iconInfo = this.registeredIcons.get(moduleId);
    if (iconInfo) {
      this.removeFromGroup(iconInfo.layout.group, moduleId);
      this.registeredIcons.delete(moduleId);
      
      // Recalculer les positions du groupe
      this.layoutManager.recalculateGroup(iconInfo.layout.group);
      
      if (this.debug) {
        console.log(`🗑️ [UIManager] Icône ${moduleId} désenregistrée`);
      }
    }
  }

  updateIconPosition(moduleId, newConfig) {
    const iconInfo = this.registeredIcons.get(moduleId);
    if (iconInfo) {
      const oldGroup = iconInfo.layout.group;
      
      // Mettre à jour la config
      Object.assign(iconInfo.layout, newConfig);
      
      // Si le groupe a changé, déplacer l'icône
      if (newConfig.group && newConfig.group !== oldGroup) {
        this.removeFromGroup(oldGroup, moduleId);
        this.addToGroup(newConfig.group, moduleId);
      }
      
      // Recalculer la position
      this.layoutManager.calculatePosition(moduleId);
      
      if (this.debug) {
        console.log(`🔄 [UIManager] Position ${moduleId} mise à jour`);
      }
    }
  }

  // ===== 📦 GESTION GROUPES =====
  
  createGroup(groupId, config = {}) {
    const groupConfig = {
      anchor: config.anchor || 'bottom-right',
      direction: config.direction || 'horizontal',
      spacing: config.spacing || 10,
      maxPerRow: config.maxPerRow || 6,
      padding: config.padding || { x: 20, y: 20 },
      members: [],
      ...config
    };
    
    this.groups.set(groupId, groupConfig);
    
    if (this.debug) {
      console.log(`📦 [UIManager] Groupe '${groupId}' créé`);
    }
    
    return this;
  }

  addToGroup(groupId, moduleId) {
    if (!this.groups.has(groupId)) {
      this.createGroup(groupId);
    }
    
    const group = this.groups.get(groupId);
    if (!group.members.includes(moduleId)) {
      group.members.push(moduleId);
      
      // Trier par ordre si spécifié
      group.members.sort((a, b) => {
        const iconA = this.registeredIcons.get(a);
        const iconB = this.registeredIcons.get(b);
        return (iconA?.layout.order || 0) - (iconB?.layout.order || 0);
      });
    }
  }

  removeFromGroup(groupId, moduleId) {
    const group = this.groups.get(groupId);
    if (group) {
      const index = group.members.indexOf(moduleId);
      if (index !== -1) {
        group.members.splice(index, 1);
      }
    }
  }

  // ===== 📝 ENREGISTREMENT MODULES (COMPATIBLE) =====
  
  async registerModule(moduleId, moduleConfig) {
    if (this.debug) {
      console.log(`📝 [UIManager] Enregistrement module: ${moduleId}`);
    }
    
    // Configuration simplifiée
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
    
    if (this.debug) {
      console.log(`✅ [UIManager] Module ${moduleId} enregistré`);
    }
    
    return this;
  }

  // ===== 🚀 INITIALISATION MODULES (COMPATIBLE) =====
  
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
      
      // === NOUVEAU: ENREGISTRER L'ICÔNE POUR POSITIONNEMENT ===
      this.registerModuleIcon(moduleId, instance, config);
      
      // Appliquer l'état initial
      this.applyModuleState(moduleId);
      
      if (this.debug) {
        console.log(`✅ [UIManager] Module ${moduleId} initialisé et positionné`);
      }
      
      return instance;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur initialisation ${moduleId}:`, error);
      throw error;
    }
  }

  // === NOUVEAU: ENREGISTREMENT AUTOMATIQUE DES ICÔNES ===
  registerModuleIcon(moduleId, instance, config) {
    // Trouver l'élément icône du module
    const iconElement = this.findIconElement(instance);
    
    if (iconElement && config.layout) {
      // Enregistrer pour positionnement automatique
      this.registerIconPosition(moduleId, iconElement, {
        ...config.layout,
        group: config.groups?.[0] || 'default'
      });
      
      if (this.debug) {
        console.log(`📍 [UIManager] Icône ${moduleId} enregistrée pour positionnement`);
      }
    } else if (this.debug) {
      console.log(`⚠️ [UIManager] Icône non trouvée pour ${moduleId}`);
    }
  }

  findIconElement(instance) {
    // Chercher l'élément icône dans différentes propriétés possibles
    const possibleElements = [
      instance.iconElement,
      instance.icon?.iconElement,
      instance.ui?.iconElement,
      instance.element,
      instance.container
    ];
    
    for (const element of possibleElements) {
      if (element && element.nodeType === Node.ELEMENT_NODE) {
        return element;
      }
    }
    
    return null;
  }

  async initializeAllModules(...args) {
    if (this.debug) {
      console.log('🚀 [UIManager] Initialisation de tous les modules...');
    }
    
    const results = {};
    const errors = [];
    
    // Trier par priorité (plus haute en premier)
    const sortedModules = Array.from(this.modules.entries())
      .sort((a, b) => (b[1].priority || 100) - (a[1].priority || 100));
    
    // Initialiser un par un
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
    
    // Après initialisation, recalculer toutes les positions
    this.layoutManager.recalculateAllPositions();
    
    if (this.debug) {
      console.log(`✅ [UIManager] Initialisation terminée. Succès: ${Object.keys(results).length}, Erreurs: ${errors.length}`);
    }
    
    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  // ===== 🎮 GESTION ÉTATS DE JEU (SIMPLIFIÉ) =====
  
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
    
    // Appliquer la configuration d'état
    this.applyGameState(stateConfig, options.animated !== false);
    
    return true;
  }

  applyGameState(stateConfig, animated = true) {
    const { visibleModules = [], hiddenModules = [], enabledModules = [], disabledModules = [] } = stateConfig;
    
    // Phase 1: Cacher les modules
    hiddenModules.forEach(moduleId => {
      this.hideModule(moduleId, { animated });
    });
    
    // Phase 2: Désactiver les modules  
    disabledModules.forEach(moduleId => {
      this.disableModule(moduleId);
    });
    
    // Phase 3: Afficher les modules (avec délai pour éviter conflits)
    setTimeout(() => {
      visibleModules.forEach(moduleId => {
        this.showModule(moduleId, { animated });
      });
      
      enabledModules.forEach(moduleId => {
        this.enableModule(moduleId);
      });
      
      // Recalculer les positions après changement d'état
      this.layoutManager.recalculateAllPositions();
    }, animated ? 100 : 0);
  }

  // ===== 👁️ CONTRÔLE MODULES (COMPATIBLE) =====
  
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
      
      // Mettre à jour la visibilité de l'icône
      const iconInfo = this.registeredIcons.get(moduleId);
      if (iconInfo) {
        iconInfo.visible = true;
        this.layoutManager.calculatePosition(moduleId);
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
      
      // Mettre à jour la visibilité de l'icône
      const iconInfo = this.registeredIcons.get(moduleId);
      if (iconInfo) {
        iconInfo.visible = false;
        iconInfo.element.style.display = 'none';
        
        // Recalculer les positions du groupe
        this.layoutManager.recalculateGroup(iconInfo.layout.group);
      }
      
      if (this.debug) {
        console.log(`👻 [UIManager] Module ${moduleId} caché`);
      }
    }
    
    return success;
  }
  
  enableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: true });
    
    if (success) {
      // Mettre à jour l'état de l'icône
      const iconInfo = this.registeredIcons.get(moduleId);
      if (iconInfo) {
        iconInfo.enabled = true;
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} activé`);
      }
    }
    
    return success;
  }
  
  disableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: false });
    
    if (success) {
      // Mettre à jour l'état de l'icône
      const iconInfo = this.registeredIcons.get(moduleId);
      if (iconInfo) {
        iconInfo.enabled = false;
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} désactivé`);
      }
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

  // ===== 🔧 GESTION ÉTAT MODULES =====
  
  setModuleState(moduleId, newState) {
    const currentState = this.moduleStates.get(moduleId);
    if (!currentState) {
      console.warn(`⚠️ [UIManager] Module ${moduleId} non trouvé`);
      return false;
    }
    
    // Mettre à jour l'état
    const updatedState = { ...currentState, ...newState };
    this.moduleStates.set(moduleId, updatedState);
    
    // Appliquer l'état au module
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
      // Appliquer visibilité
      if (typeof instance.show === 'function' && typeof instance.hide === 'function') {
        if (state.visible) {
          instance.show();
        } else {
          instance.hide();
        }
      }
      
      // Appliquer état enabled
      if (typeof instance.setEnabled === 'function') {
        instance.setEnabled(state.enabled);
      }
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur application état ${moduleId}:`, error);
    }
  }

  // ===== 🚫 RÈGLES D'INTERACTION =====
  
  canShowModule(moduleId) {
    // Vérifier les règles d'interaction
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

  // ===== 🔍 GETTERS (COMPATIBLE) =====
  
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
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized)
        .map(([id]) => id)
    };
  }

  // ===== 🎛️ MÉTHODES UTILITAIRES =====
  
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

  // ===== 📊 DEBUG ET INFO =====
  
  debugInfo() {
    const info = {
      mode: 'positioning-enabled',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      totalGroups: this.groups.size,
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
        Array.from(this.registeredIcons.entries()).map(([id, info]) => [
          id,
          { 
            anchor: info.layout.anchor,
            order: info.layout.order,
            group: info.layout.group,
            visible: info.visible,
            enabled: info.enabled
          }
        ])
      ),
      groups: Object.fromEntries(
        Array.from(this.groups.entries()).map(([id, group]) => [
          id,
          {
            anchor: group.anchor,
            direction: group.direction,
            members: group.members,
            memberCount: group.members.length
          }
        ])
      ),
      interactionRules: this.interactionRules
    };
    
    console.group('🎛️ UIManager Debug Info (avec positionnement)');
    console.table(info.moduleStates);
    console.log('📍 Icônes enregistrées:', info.registeredIcons);
    console.log('📦 Groupes:', info.groups);
    console.log('📊 Global State:', {
      currentGameState: info.currentGameState,
      openModules: info.openModules,
      rules: Object.keys(this.interactionRules).filter(rule => this.isRuleActive(rule))
    });
    console.groupEnd();
    
    return info;
  }

  // ===== 🔧 MÉTHODES DE COMPATIBILITÉ =====
  
  // Pour compatibilité avec l'ancien code
  on() { return this; }
  off() { return this; }
  emit() { return this; }

  // Gestion d'erreur simple
  handleError(error, context) {
    console.error(`❌ [UIManager:${context}]`, error);
  }

  // ===== 🧹 NETTOYAGE =====
  
  destroy() {
    console.log('🧹 [UIManager] Destruction...');
    
    try {
      // Détruire tous les modules
      this.modules.forEach((config, moduleId) => {
        if (config.instance && typeof config.instance.destroy === 'function') {
          config.instance.destroy();
        }
      });
      
      // Nettoyer les maps
      this.modules.clear();
      this.moduleStates.clear();
      this.moduleInstances.clear();
      this.openModules.clear();
      this.registeredIcons.clear();
      this.groups.clear();
      
      // Reset état
      this.globalState.initialized = false;
      
      console.log('✅ [UIManager] Destruction terminée');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destruction:', error);
    }
  }
}

// ===== 📍 LAYOUT MANAGER - CALCUL DES POSITIONS =====

class LayoutManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.viewport = { width: 0, height: 0 };
    this.updateViewport();
  }

  updateViewport() {
    this.viewport.width = window.innerWidth;
    this.viewport.height = window.innerHeight;
  }

  calculatePosition(moduleId) {
    const iconInfo = this.uiManager.registeredIcons.get(moduleId);
    if (!iconInfo || !iconInfo.element) {
      return;
    }

    const { element, layout, visible } = iconInfo;
    
    if (!visible) {
      element.style.display = 'none';
      return;
    }

    // Calculer la position selon l'ancrage
    const position = this.calculateAnchorPosition(iconInfo);
    
    // Appliquer la position
    element.style.position = 'fixed';
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.display = '';
    element.style.zIndex = layout.zIndex || 500;
    
    if (this.uiManager.debug) {
      console.log(`📍 [LayoutManager] ${moduleId} positionné à (${position.x}, ${position.y})`);
    }
  }

  calculateAnchorPosition(iconInfo) {
    const { layout } = iconInfo;
    const group = this.uiManager.groups.get(layout.group) || {};
    
    // Position de base selon l'ancrage
    let basePosition = this.getAnchorBasePosition(layout.anchor || group.anchor || 'bottom-right');
    
    // Ajuster selon la position dans le groupe
    const groupPosition = this.calculateGroupPosition(iconInfo);
    
    return {
      x: basePosition.x + groupPosition.x + (layout.offset?.x || 0),
      y: basePosition.y + groupPosition.y + (layout.offset?.y || 0)
    };
  }

  getAnchorBasePosition(anchor) {
    const padding = 20; // Padding par défaut du bord de l'écran
    
    switch (anchor) {
      case 'top-left':
        return { x: padding, y: padding };
      case 'top-right':
        return { x: this.viewport.width - padding, y: padding };
      case 'bottom-left':
        return { x: padding, y: this.viewport.height - padding };
      case 'bottom-right':
        return { x: this.viewport.width - padding, y: this.viewport.height - padding };
      case 'center':
        return { x: this.viewport.width / 2, y: this.viewport.height / 2 };
      case 'top-center':
        return { x: this.viewport.width / 2, y: padding };
      case 'bottom-center':
        return { x: this.viewport.width / 2, y: this.viewport.height - padding };
      default:
        return { x: this.viewport.width - padding, y: this.viewport.height - padding };
    }
  }

  calculateGroupPosition(iconInfo) {
    const { layout } = iconInfo;
    const group = this.uiManager.groups.get(layout.group);
    
    if (!group) {
      return { x: 0, y: 0 };
    }

    // Trouver la position de cette icône dans le groupe
    const visibleMembers = group.members.filter(moduleId => {
      const memberIcon = this.uiManager.registeredIcons.get(moduleId);
      return memberIcon && memberIcon.visible;
    });
    
    const memberIndex = visibleMembers.indexOf(iconInfo.moduleId);
    if (memberIndex === -1) {
      return { x: 0, y: 0 };
    }

    const spacing = layout.spacing || group.spacing || 10;
    const iconSize = layout.size || { width: 70, height: 80 };
    
    // Calculer la position selon la direction du groupe
    if (group.direction === 'horizontal') {
      return this.calculateHorizontalPosition(memberIndex, iconSize, spacing, group.anchor);
    } else {
      return this.calculateVerticalPosition(memberIndex, iconSize, spacing, group.anchor);
    }
  }

  calculateHorizontalPosition(index, iconSize, spacing, anchor) {
    const totalOffset = index * (iconSize.width + spacing);
    
    // Ajuster selon l'ancrage (pour bottom-right, on va vers la gauche)
    if (anchor && anchor.includes('right')) {
      return { x: -totalOffset - iconSize.width, y: 0 };
    } else {
      return { x: totalOffset, y: 0 };
    }
  }

  calculateVerticalPosition(index, iconSize, spacing, anchor) {
    const totalOffset = index * (iconSize.height + spacing);
    
    // Ajuster selon l'ancrage (pour bottom, on va vers le haut)
    if (anchor && anchor.includes('bottom')) {
      return { x: 0, y: -totalOffset - iconSize.height };
    } else {
      return { x: 0, y: totalOffset };
    }
  }

  recalculateGroup(groupId) {
    const group = this.uiManager.groups.get(groupId);
    if (!group) return;

    // Recalculer toutes les icônes du groupe
    group.members.forEach(moduleId => {
      this.calculatePosition(moduleId);
    });

    if (this.uiManager.debug) {
      console.log(`🔄 [LayoutManager] Groupe '${groupId}' recalculé`);
    }
  }

  recalculateAllPositions() {
    this.updateViewport();
    
    // Recalculer toutes les icônes enregistrées
    this.uiManager.registeredIcons.forEach((iconInfo, moduleId) => {
      this.calculatePosition(moduleId);
    });

    if (this.uiManager.debug) {
      console.log(`🔄 [LayoutManager] Toutes les positions recalculées`);
    }
  }
}

export default UIManager;

console.log(`
🎯 === UIMANAGER AVEC POSITIONNEMENT AUTOMATIQUE ===

🆕 NOUVELLES FONCTIONNALITÉS:
• LayoutManager intégré
• Positionnement automatique des icônes
• Système de groupes (ui-icons, panels, etc.)
• Gestion responsive automatique
• Recalcul automatique au resize

📍 API POSITIONNEMENT:
• registerIconPosition(moduleId, element, config)
• updateIconPosition(moduleId, newConfig)
• unregisterIconPosition(moduleId)
• createGroup(groupId, config)

🎮 EXEMPLE CONFIGURATION MODULE:
{
  id: 'team',
  layout: {
    anchor: 'bottom-right',
    order: 2,
    spacing: 10,
    group: 'ui-icons'
  }
}

⚡ CALCUL AUTOMATIQUE:
• Position selon ancrage (bottom-right, etc.)
• Ordre dans le groupe
• Espacement automatique
• Gestion responsive
• Recalcul au resize

🔗 COMPATIBILITÉ:
• 100% compatible avec l'ancien UIManager
• Méthodes show/hide/enable/disable inchangées
• Ajout transparent du positionnement

✅ PRÊT POUR TEAM ET FUTURS MODULES !
`);
