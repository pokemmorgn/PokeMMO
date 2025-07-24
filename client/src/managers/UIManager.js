// managers/UIManager.js - FIXÉ avec protection anti-duplication STRICTE
// 🚨 PRÉVENTION COMPLÈTE de la double initialisation des modules

export class UIManager {
  constructor(options = {}) {
    console.log('🎛️ UIManager avec protection anti-duplication initialisé');
    
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
    
    // Configuration icônes (identique)
    this.iconConfig = {
      defaultSize: { width: 70, height: 80 },
      responsiveSizes: {
        mobile: { width: 60, height: 70 },
        tablet: { width: 65, height: 75 },
        desktop: { width: 70, height: 80 }
      },
      spacing: 10,
      padding: 20,
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
      dialogue_active: ['inventory', 'team', 'quest'],
      battle_active: ['inventory', 'team', 'quest', 'questTracker', 'chat']
    };
    
    this.openModules = new Set();
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
        instance.isEnabled = state.enabled !== false; // Utiliser l'état UIManager
        
        if (this.debug) {
          console.log(`🔄 [UIManager] États synchronisés pour ${moduleId}:`, {
            'UIManager.initialized': state.initialized,
            'Module.initialized': instance.initialized,
            'UIManager.enabled': state.enabled,
            'Module.isEnabled': instance.isEnabled
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
      const layoutConfig = config.layout;
      if (!layoutConfig || layoutConfig.type !== 'icon') {
        console.log(`ℹ️ [UIManager] Module ${moduleId} n'a pas d'icône`);
        return null;
      }
      
      // Vérifier si le module peut créer une icône
      if (typeof instance.createIcon !== 'function') {
        console.warn(`⚠️ [UIManager] Module ${moduleId} ne peut pas créer d'icône`);
        return null;
      }
      
      // ✅ MARQUER COMME EN COURS DE CRÉATION
      this.initializationTracker.iconCreated.add(moduleId);
      
      // Demander au module de créer son icône
      const iconElement = await instance.createIcon();
      
      if (!iconElement) {
        console.warn(`⚠️ [UIManager] Module ${moduleId} n'a pas créé d'icône`);
        this.initializationTracker.iconCreated.delete(moduleId);
        return null;
      }
      
      // Appliquer la taille centralisée
      this.applyStandardizedSize(iconElement);
      
      // Enregistrer et positionner l'icône
      this.registerIconPosition(moduleId, iconElement, layoutConfig);
      
      console.log(`✅ [UIManager] Icône créée PROTÉGÉE pour ${moduleId}`);
      return iconElement;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur création icône PROTÉGÉE ${moduleId}:`, error);
      this.initializationTracker.iconCreated.delete(moduleId);
      return null;
    }
  }

  // ✅ FIX 10: Workflow d'initialisation complète avec protection
  async initializeAllModules(...args) {
    if (this.debug) {
      console.log('🚀 [UIManager] Initialisation PROTÉGÉE de tous les modules...');
    }
    
    // ✅ Vérifier si déjà en cours
    if (this.globalState.initialized) {
      console.log('ℹ️ [UIManager] Tous les modules déjà initialisés - SKIP');
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
    
    // ✅ FIX 11: Initialisation séquentielle pour éviter les conflits
    for (const [moduleId, config] of sortedModules) {
      try {
        console.log(`🔄 [UIManager] Initialisation séquentielle: ${moduleId}`);
        const instance = await this.initializeModule(moduleId, ...args);
        results[moduleId] = instance;
        
        // Petit délai pour éviter les conflits
        await new Promise(resolve => setTimeout(resolve, 50));
        
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
      console.log(`📍 [UIManager] ${this.registeredIcons.size} icônes repositionnées PROTÉGÉES`);
    }, 100);
    
    if (this.debug) {
      console.log(`✅ [UIManager] Initialisation PROTÉGÉE terminée. Succès: ${Object.keys(results).length}, Erreurs: ${errors.length}`);
      console.log(`🛡️ Protection: ${this.initializationTracker.completed.size} modules protégés`);
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      iconsCreated: this.registeredIcons.size,
      iconSize: this.getCurrentIconSize(),
      protectedModules: this.initializationTracker.completed.size
    };
  }
  
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

  // === MÉTHODES IDENTIQUES (pas de changement) ===
  
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
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [UIManager] CSS global icônes injecté avec protection');
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

  setupDefaultGroups() {
    this.iconGroups.set('ui-icons', {
      anchor: 'bottom-right',
      spacing: this.iconConfig.spacing,
      padding: this.iconConfig.padding,
      members: [],
      expectedOrder: ['inventory', 'quest', 'pokedex', 'team']
    });
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

    console.log(`📍 [UIManager] Icône ${moduleId} enregistrée PROTÉGÉE (${currentSize.width}x${currentSize.height}, ordre: ${iconConfig.order})`);
  }

positionIcon(moduleId) {
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
  const padding = this.iconConfig.padding;
  
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
      baseY = padding + 60;
      break;
    case 'top-left':
      baseX = padding;
      baseY = padding;
      break;
    default:
      baseX = window.innerWidth - padding;
      baseY = window.innerHeight - padding;
  }

  const spacing = this.iconConfig.spacing;
  const iconWidth = iconConfig.size.width;
  
  // ✅ CORRECTION CRITIQUE: Utiliser ORDER au lieu de memberIndex
  const iconOrder = iconConfig.order !== undefined ? iconConfig.order : memberIndex;
  
  let offsetX = 0;
  if (iconConfig.anchor.includes('right')) {
    // Pour bottom-right: chaque icône d'ordre supérieur va plus à gauche
    offsetX = -iconOrder * (iconWidth + spacing) - iconWidth;
  } else {
    // Pour bottom-left: chaque icône d'ordre supérieur va plus à droite  
    offsetX = iconOrder * (iconWidth + spacing);
  }

  const element = iconConfig.element;
  const finalX = baseX + offsetX;
  const finalY = baseY - iconConfig.size.height;
  
  element.style.position = 'fixed';
  element.style.left = `${finalX}px`;
  element.style.top = `${finalY}px`;
  element.style.zIndex = this.iconConfig.zIndex;

  // ✅ Marquer comme positionné
  element.setAttribute('data-positioned-by', 'uimanager');
  
  if (this.debug) {
    console.log(`📍 [UIManager] ${moduleId} positionné CORRECTEMENT à (${finalX}, ${finalY}) - ordre: ${iconOrder} (était memberIndex: ${memberIndex})`);
  }
}

  repositionAllIcons() {
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      this.positionIcon(moduleId);
    });
    
    if (this.debug) {
      console.log('🔄 [UIManager] Toutes les icônes repositionnées PROTÉGÉES');
    }
  }

  // === MÉTHODES PUBLIQUES (identiques mais avec protection) ===

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
      layout: moduleConfig.layout || {},
      ...moduleConfig
    };
    
    this.modules.set(moduleId, config);
    this.moduleStates.set(moduleId, { ...config.defaultState });
    
    if (this.debug) {
      console.log(`✅ [UIManager] Module ${moduleId} enregistré PROTÉGÉ`);
    }
    
    return this;
  }

showModule(moduleId, options = {}) {
  console.log(`👁️ [UIManager] Affichage module ${moduleId}...`);
  
  if (!this.canShowModule(moduleId)) {
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
      element.style.transform = ''; // Reset transform
      element.style.transition = ''; // Reset transition
      
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

  // === DEBUG AMÉLIORÉ ===

  debugInfo() {
    const iconConfig = this.getIconConfiguration();
    const diagnosis = this.diagnoseInitializationIssues();
    
    const info = {
      mode: 'uimanager-with-anti-duplication-protection',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      iconConfiguration: iconConfig,
      initializedModules: Array.from(this.moduleStates.entries())
        .filter(([id, state]) => state.initialized).length,
      openModules: Array.from(this.openModules),
      
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
            positioned: config.element ? !!(config.element.style.left && config.element.style.top) : false
          }
        ])
      ),
      
      interactionRules: this.interactionRules
    };
    
    console.group('🎛️ UIManager Debug Info (avec protection anti-duplication)');
    console.table(info.moduleStates);
    console.log('🛡️ Protection anti-duplication:', info.protection);
    console.log('📏 Configuration icônes:', iconConfig);
    console.log('📍 Icônes créées:', info.registeredIcons);
    console.log('⚠️ Issues détectées:', diagnosis.issues);
    console.groupEnd();
    
    return info;
  }

  // === MÉTHODES RESTANTES (identiques) ===

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
    this.disableModule(moduleId);
    console.log(`🔒 [UIManager] Module ${moduleId} désactivé`);
  });
  
  // Puis cacher (plus restrictif que désactiver)
  hiddenModules.forEach(moduleId => {
    this.hideModule(moduleId, { animated });
    console.log(`👻 [UIManager] Module ${moduleId} caché`);
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
    
    console.log(`✅ [UIManager] État appliqué avec repositionnement`);
    
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
  
  getIconConfiguration() {
    return {
      ...this.iconConfig,
      currentSize: this.getCurrentIconSize(),
      currentBreakpoint: this.currentBreakpoint
    };
  }

  createGroup() { return this; }
  on() { return this; }
  off() { return this; }
  emit() { return this; }

  handleError(error, context) {
    console.error(`❌ [UIManager:${context}]`, error);
  }

  destroy() {
    console.log('🧹 [UIManager] Destruction PROTÉGÉE...');
    
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
      
      this.globalState.initialized = false;
      
      console.log('✅ [UIManager] Destruction PROTÉGÉE terminée');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destruction:', error);
    }
  }
}

export default UIManager;
