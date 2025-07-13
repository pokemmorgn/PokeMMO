// managers/UIManager.js - CORRIGÉ avec tailles d'icônes centralisées
// 🎯 UNE SEULE CONFIGURATION pour toutes les tailles d'icônes

export class UIManager {
  constructor(options = {}) {
    console.log('🎛️ UIManager avec tailles centralisées initialisé');
    
    this.debug = options.debug || false;
    this.gameStates = options.gameStates || {};
    
    this.modules = new Map();
    this.moduleStates = new Map();
    this.moduleInstances = new Map();
    
    this.globalState = {
      visible: true,
      enabled: true,
      initialized: false,
      currentGameState: 'exploration'
    };
    
    // === 📏 CONFIGURATION CENTRALISÉE DES TAILLES ===
    this.iconConfig = {
      // Taille standard pour TOUTES les icônes
      defaultSize: {
        width: 70,
        height: 80
      },
      
      // Tailles par breakpoint responsive
      responsiveSizes: {
        mobile: {    // <= 768px
          width: 60,
          height: 70
        },
        tablet: {    // 769px - 1024px
          width: 65,
          height: 75
        },
        desktop: {   // > 1024px
          width: 70,
          height: 80
        }
      },
      
      // Espacement entre icônes
      spacing: 10,
      
      // Padding depuis les bords
      padding: 20,
      
      // Z-index pour toutes les icônes
      zIndex: 500
    };
    
    // === SYSTÈME DE POSITIONNEMENT ===
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

  // === 📏 GESTION CENTRALISÉE DES TAILLES ===
  
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
    
    // Merger la nouvelle config
    this.iconConfig = {
      ...this.iconConfig,
      ...newConfig,
      responsiveSizes: {
        ...this.iconConfig.responsiveSizes,
        ...(newConfig.responsiveSizes || {})
      }
    };
    
    // Réinjecter le CSS
    this.injectGlobalIconCSS();
    
    // Repositionner toutes les icônes
    setTimeout(() => {
      this.repositionAllIcons();
    }, 100);
    
    console.log('✅ [UIManager] Configuration icônes mise à jour');
  }
  
  // === 🎨 CSS GLOBAL POUR TOUTES LES ICÔNES ===
  
  injectGlobalIconCSS() {
    // Supprimer l'ancien style
    const existingStyle = document.querySelector('#uimanager-global-icons');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const { defaultSize, responsiveSizes, zIndex } = this.iconConfig;
    
    const style = document.createElement('style');
    style.id = 'uimanager-global-icons';
    style.textContent = `
      /* ===== UIMANAGER - TAILLES GLOBALES ICÔNES ===== */
      
      /* Taille desktop par défaut */
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
      
      /* Force pour tous les modules */
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
      
      /* Responsive tablet */
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
      
      /* Responsive mobile */
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
      
      /* États UIManager */
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
      
      .ui-icon.ui-disabled:hover {
        transform: none !important;
      }
      
      /* Animations standardisées */
      .ui-icon.ui-fade-in {
        animation: uiIconFadeIn 0.3s ease !important;
      }
      
      .ui-icon.ui-fade-out {
        animation: uiIconFadeOut 0.2s ease !important;
      }
      
      @keyframes uiIconFadeIn {
        from { opacity: 0; transform: translateY(20px) scale(0.8); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      
      @keyframes uiIconFadeOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(20px) scale(0.8); }
      }
      
      /* Hover standardisé */
      .ui-icon:hover:not(.ui-disabled) {
        transform: scale(1.1) !important;
      }
      
      /* Indicateur UIManager */
      .ui-icon[data-positioned-by="uimanager"]::before {
        content: "📍";
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
    console.log('🎨 [UIManager] CSS global icônes injecté');
  }

  // === 🎛️ INITIALISATION MODULE CORRIGÉE ===
  
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
      // 1. Créer l'instance du module
      const instance = await config.factory(...args);
      
      if (!instance) {
        throw new Error(`Factory du module ${moduleId} a retourné null`);
      }
      
      // 2. Stocker l'instance
      config.instance = instance;
      this.moduleInstances.set(moduleId, instance);
      state.initialized = true;
      
      // ✅ 3. CRÉER L'ICÔNE AVEC TAILLE CENTRALISÉE
      await this.createModuleIcon(moduleId, instance, config);
      
      // 4. Appliquer l'état initial
      this.applyModuleState(moduleId);
      
      if (this.debug) {
        console.log(`✅ [UIManager] Module ${moduleId} initialisé avec taille centralisée`);
      }
      
      return instance;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur initialisation ${moduleId}:`, error);
      throw error;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Création d'icône avec taille centralisée
  async createModuleIcon(moduleId, instance, config) {
    console.log(`🎨 [UIManager] Création icône pour ${moduleId} avec taille centralisée...`);
    
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
      
      // Demander au module de créer son icône
      const iconElement = await instance.createIcon();
      
      if (!iconElement) {
        console.warn(`⚠️ [UIManager] Module ${moduleId} n'a pas créé d'icône`);
        return null;
      }
      
      // ✅ APPLIQUER LA TAILLE CENTRALISÉE IMMÉDIATEMENT
      this.applyStandardizedSize(iconElement);
      
      // ✅ ENREGISTRER ET POSITIONNER L'ICÔNE
      this.registerIconPosition(moduleId, iconElement, layoutConfig);
      
      console.log(`✅ [UIManager] Icône créée avec taille centralisée pour ${moduleId}`);
      return iconElement;
      
    } catch (error) {
      console.error(`❌ [UIManager] Erreur création icône ${moduleId}:`, error);
      return null;
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Appliquer taille standardisée
  applyStandardizedSize(iconElement) {
    const currentSize = this.getCurrentIconSize();
    
    // Forcer la taille via CSS
    iconElement.style.width = `${currentSize.width}px`;
    iconElement.style.height = `${currentSize.height}px`;
    iconElement.style.minWidth = `${currentSize.width}px`;
    iconElement.style.maxWidth = `${currentSize.width}px`;
    iconElement.style.minHeight = `${currentSize.height}px`;
    iconElement.style.maxHeight = `${currentSize.height}px`;
    iconElement.style.zIndex = this.iconConfig.zIndex;
    
    // Ajouter la classe ui-icon pour le CSS global
    iconElement.classList.add('ui-icon');
    
    console.log(`📏 [UIManager] Taille appliquée: ${currentSize.width}x${currentSize.height}`);
  }

  // === 🎨 POSITIONNEMENT (AMÉLIORÉ AVEC TAILLES CENTRALISÉES) ===
  
setupDefaultGroups() {
  this.iconGroups.set('ui-icons', {
    anchor: 'bottom-right',
    spacing: this.iconConfig.spacing,
    padding: this.iconConfig.padding,
    members: [],
    expectedOrder: ['inventory', 'quest', 'pokedex', 'team'] // Ordre attendu
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
          
          // Réappliquer les tailles à toutes les icônes
          this.applyNewSizesToAllIcons();
        }
        
        this.repositionAllIcons();
      }, 200);
    });
  }
  
  applyNewSizesToAllIcons() {
    const currentSize = this.getCurrentIconSize();
    console.log(`📏 [UIManager] Application nouvelle taille à toutes les icônes: ${currentSize.width}x${currentSize.height}`);
    
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      if (iconConfig.element) {
        this.applyStandardizedSize(iconConfig.element);
        // Mettre à jour la config
        iconConfig.size = currentSize;
      }
    });
  }

  registerIconPosition(moduleId, iconElement, config = {}) {
    if (!iconElement) {
      console.warn(`⚠️ [UIManager] Pas d'élément pour ${moduleId}`);
      return;
    }

    // Utiliser la taille centralisée
    const currentSize = this.getCurrentIconSize();
    
    const iconConfig = {
      element: iconElement,
      moduleId: moduleId,
      anchor: config.anchor || 'bottom-right',
      order: config.order || 0,
      group: config.group || 'ui-icons',
      spacing: this.iconConfig.spacing, // Utiliser spacing centralisé
      size: currentSize // Utiliser taille centralisée
    };

    this.registeredIcons.set(moduleId, iconConfig);

    // Ajouter au groupe
const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
if (!group.members.includes(moduleId)) {
  group.members.push(moduleId);
  // Trier par ordre défini
  group.members.sort((a, b) => {
    const iconA = this.registeredIcons.get(a);
    const iconB = this.registeredIcons.get(b);
    const orderA = iconA?.order !== undefined ? iconA.order : 999;
    const orderB = iconB?.order !== undefined ? iconB.order : 999;
    return orderA - orderB;
  });
}

    // Positionner immédiatement
    this.positionIcon(moduleId);

    console.log(`📍 [UIManager] Icône ${moduleId} enregistrée avec taille centralisée (${currentSize.width}x${currentSize.height}, ordre: ${iconConfig.order})`);
  }

  positionIcon(moduleId) {
    const iconConfig = this.registeredIcons.get(moduleId);
    if (!iconConfig || !iconConfig.element) return;

    const group = this.iconGroups.get(iconConfig.group) || this.iconGroups.get('ui-icons');
    const memberIndex = group.members.indexOf(moduleId);
    
    if (memberIndex === -1) return;

    // Position de base selon anchor
    let baseX, baseY;
    const padding = this.iconConfig.padding; // Utiliser padding centralisé
    
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
    const spacing = this.iconConfig.spacing; // Utiliser spacing centralisé
    const iconWidth = iconConfig.size.width; // Taille centralisée
    
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
    element.style.zIndex = this.iconConfig.zIndex;

    if (this.debug) {
      console.log(`📍 [UIManager] ${moduleId} positionné à (${baseX + offsetX}, ${baseY - iconConfig.size.height}) avec taille ${iconConfig.size.width}x${iconConfig.size.height}`);
    }
  }

  repositionAllIcons() {
    this.registeredIcons.forEach((iconConfig, moduleId) => {
      this.positionIcon(moduleId);
    });
    
    if (this.debug) {
      console.log('🔄 [UIManager] Toutes les icônes repositionnées avec tailles centralisées');
    }
  }

  // === 🎛️ CONTRÔLE DES MODULES (INCHANGÉ) ===

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
      
      // ✅ AFFICHER L'ICÔNE VIA UIManager
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.display = 'block';
        iconConfig.element.style.visibility = 'visible';
        iconConfig.element.style.opacity = '1';
        iconConfig.element.style.pointerEvents = 'auto';
        iconConfig.element.classList.remove('ui-hidden', 'hidden');
        this.positionIcon(moduleId);
      }
      
      if (this.debug) {
        console.log(`👁️ [UIManager] Module ${moduleId} affiché avec icône`);
      }
    }
    
    return success;
  }
  
  hideModule(moduleId, options = {}) {
    const success = this.setModuleState(moduleId, { visible: false });
    
    if (success) {
      this.openModules.delete(moduleId);
      
      // ✅ CACHER L'ICÔNE VIA UIManager
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
        
        // Repositionner les autres après un délai
        setTimeout(() => {
          this.repositionAllIcons();
        }, options.animated !== false ? 350 : 50);
      }
      
      if (this.debug) {
        console.log(`👻 [UIManager] Module ${moduleId} caché avec icône`);
      }
    }
    
    return success;
  }
  
  enableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: true });
    
    if (success) {
      // ✅ ACTIVER L'ICÔNE VIA UIManager
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.opacity = '1';
        iconConfig.element.style.pointerEvents = 'auto';
        iconConfig.element.style.filter = '';
        iconConfig.element.classList.remove('ui-disabled');
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} activé avec icône`);
      }
    }
    
    return success;
  }
  
  disableModule(moduleId) {
    const success = this.setModuleState(moduleId, { enabled: false });
    
    if (success) {
      // ✅ DÉSACTIVER L'ICÔNE VIA UIManager
      const iconConfig = this.registeredIcons.get(moduleId);
      if (iconConfig && iconConfig.element) {
        iconConfig.element.style.opacity = '0.5';
        iconConfig.element.style.pointerEvents = 'none';
        iconConfig.element.style.filter = 'grayscale(50%)';
        iconConfig.element.classList.add('ui-disabled');
      }
      
      if (this.debug) {
        console.log(`🔧 [UIManager] Module ${moduleId} désactivé avec icône`);
      }
    }
    
    return success;
  }

  // === 🔄 WORKFLOW COMPLET ===

  async initializeAllModules(...args) {
    if (this.debug) {
      console.log('🚀 [UIManager] Initialisation de tous les modules avec tailles centralisées...');
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
    
    // ✅ REPOSITIONNER TOUTES LES ICÔNES CRÉÉES
    setTimeout(() => {
      this.repositionAllIcons();
      console.log(`📍 [UIManager] ${this.registeredIcons.size} icônes repositionnées avec tailles centralisées`);
    }, 100);
    
    if (this.debug) {
      console.log(`✅ [UIManager] Initialisation terminée. Succès: ${Object.keys(results).length}, Erreurs: ${errors.length}`);
      console.log(`📏 Taille icônes: ${this.getCurrentIconSize().width}x${this.getCurrentIconSize().height}`);
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      iconsCreated: this.registeredIcons.size,
      iconSize: this.getCurrentIconSize()
    };
  }

  // === 📏 API PUBLIQUE POUR MODIFIER LES TAILLES ===
  
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

  // === RESTE IDENTIQUE (méthodes existantes) ===
  
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
      
      this.repositionAllIcons();
    }, animated ? 100 : 0);
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
      totalIcons: this.registeredIcons.size,
      iconConfiguration: this.getIconConfiguration(),
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

  debugInfo() {
    const iconConfig = this.getIconConfiguration();
    
    const info = {
      mode: 'uimanager-with-centralized-sizes',
      currentGameState: this.globalState.currentGameState,
      totalModules: this.modules.size,
      totalIcons: this.registeredIcons.size,
      iconConfiguration: iconConfig,
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
            size: config.size,
            hasElement: !!config.element,
            visible: config.element ? config.element.style.display !== 'none' : false,
            positioned: config.element ? !!(config.element.style.left && config.element.style.top) : false
          }
        ])
      ),
      interactionRules: this.interactionRules
    };
    
    console.group('🎛️ UIManager Debug Info (tailles centralisées)');
    console.table(info.moduleStates);
    console.log('📏 Configuration icônes:', iconConfig);
    console.log('📍 Icônes créées et positionnées:', info.registeredIcons);
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
      // Supprimer le CSS global
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
      
      this.globalState.initialized = false;
      
      console.log('✅ [UIManager] Destruction terminée');
      
    } catch (error) {
      console.error('❌ [UIManager] Erreur destruction:', error);
    }
  }
}

export default UIManager;
