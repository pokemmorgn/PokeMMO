// core/BaseModule.js - Module de base générique pour système MMO
// 🎯 ÉVITE LA DUPLICATION DE CODE entre modules (Team, Inventory, Quest, etc.)
// 📍 INTÉGRÉ avec UIManager pour positionnement automatique
// 🆕 SUPPORT SINGLETON OPTIONNEL par module

/**
 * Classe de base abstraite pour tous les modules du jeu
 * Fournit la logique UIManager commune et les patterns standards
 */
export class BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // === CONFIGURATION DE BASE ===
    this.moduleId = moduleId;
    this.gameRoom = gameRoom;
    this.scene = scene;
    this.options = {
      singleton: false,           // Activer pattern Singleton
      autoCloseUI: true,          // Fermer UI par défaut
      keyboardShortcut: null,     // Raccourci clavier (ex: 't')
      responsive: true,           // Support responsive
      ...options
    };
    
    // === GESTION SINGLETON ===
    if (this.options.singleton) {
      const instanceKey = `${this.moduleId}Instance`;
      
      // Retourner instance existante si elle existe
      if (this.constructor[instanceKey]) {
        console.log(`♻️ [${this.moduleId}Module] Instance singleton existante détectée`);
        return this.constructor[instanceKey];
      }
      
      // Stocker nouvelle instance
      this.constructor[instanceKey] = this;
    }
    
    // === COMPOSANTS (À IMPLÉMENTER DANS CLASSES FILLES) ===
    this.manager = null;  // Business logic (ex: TeamManager)
    this.icon = null;     // Icône UI (ex: TeamIcon)
    this.ui = null;       // Interface (ex: TeamUI)
    
    // === ÉTAT UIMANAGER STANDARDISÉ ===
    this.uiManagerState = {
      visible: true,        // Icône visible par défaut
      enabled: true,        // Module activé
      initialized: false    // Non encore initialisé
    };
    
    // === CONFIGURATION UIMANAGER PAR DÉFAUT ===
    this.uiManagerConfig = {
      anchor: 'bottom-right',
      order: 0,
      group: 'ui-icons',
      spacing: 10,
      size: { width: 70, height: 80 },
      ...options.uiManagerConfig
    };
    
    console.log(`🆕 [${this.moduleId}Module] Nouvelle instance créée`);
  }
  
  // === 🎯 MÉTHODES ABSTRAITES (À IMPLÉMENTER) ===
  
  /**
   * Initialisation spécifique du module
   * DOIT être implémentée dans les classes filles
   */
  async init() {
    throw new Error(`${this.moduleId}Module: méthode init() doit être implémentée`);
  }
  
  /**
   * Création des composants (manager, icon, ui)
   * DOIT être implémentée dans les classes filles
   */
  createComponents() {
    throw new Error(`${this.moduleId}Module: méthode createComponents() doit être implémentée`);
  }
  
  /**
   * Connexion des composants entre eux
   * DOIT être implémentée dans les classes filles
   */
  connectComponents() {
    throw new Error(`${this.moduleId}Module: méthode connectComponents() doit être implémentée`);
  }
  
  /**
   * Création de l'icône pour UIManager
   * Peut être surchargée dans les classes filles
   */
  async createIcon() {
    console.log(`🎨 [${this.moduleId}Module] Création icône générique...`);
    
    // Si les composants ne sont pas encore créés, les créer
    if (!this.icon) {
      this.createComponents();
    }
    
    // Retourner l'élément icône si disponible
    if (this.icon && this.icon.iconElement) {
      console.log(`✅ [${this.moduleId}Module] Icône disponible pour UIManager`);
      return this.icon.iconElement;
    }
    
    console.warn(`❌ [${this.moduleId}Module] Impossible de créer l'icône`);
    return null;
  }
  
  // === 🚀 INITIALISATION PROTÉGÉE GÉNÉRIQUE ===
  
  async initializeModule() {
    try {
      // Éviter double initialisation
      if (this.uiManagerState.initialized) {
        console.log(`ℹ️ [${this.moduleId}Module] Déjà initialisé, retour instance existante`);
        return this;
      }
      
      console.log(`🚀 [${this.moduleId}Module] Initialisation...`);
      
      // 1. Appeler l'initialisation spécifique
      await this.init();
      
      // 2. Créer les composants
      this.createComponents();
      
      // 3. Connecter les composants
      this.connectComponents();
      
      // 4. Marquer comme initialisé
      this.uiManagerState.initialized = true;
      
      // 5. Fermer UI par défaut si activé
      if (this.options.autoCloseUI) {
        this.forceCloseUI();
      }
      
      // 6. Setup raccourci clavier si défini
      if (this.options.keyboardShortcut) {
        this.setupKeyboardShortcut();
      }
      
      console.log(`✅ [${this.moduleId}Module] Initialisé avec succès`);
      return this;
      
    } catch (error) {
      console.error(`❌ [${this.moduleId}Module] Erreur initialisation:`, error);
      throw error;
    }
  }
  
  // === 📍 CONNEXION UIMANAGER SÉCURISÉE ===
  
  connectUIManager(uiManager) {
    console.log(`📍 [${this.moduleId}Module] Connexion UIManager...`);
    
    if (!uiManager || !uiManager.registerIconPosition) {
      console.warn(`⚠️ [${this.moduleId}Module] UIManager incompatible`);
      return false;
    }
    
    if (!this.icon || !this.icon.iconElement) {
      console.warn(`⚠️ [${this.moduleId}Module] Icône non disponible pour UIManager`);
      return false;
    }
    
    // Vérifier si déjà connecté (éviter double connexion)
    if (this.icon.iconElement.hasAttribute('data-positioned-by-uimanager')) {
      console.log(`ℹ️ [${this.moduleId}Module] Déjà connecté à UIManager, skip`);
      return true;
    }
    
    try {
      // 🆕 AFFICHER L'ICÔNE AVANT CONNEXION UIManager
      if (this.uiManagerState.visible && this.icon.show) {
        this.icon.show();
        console.log(`👁️ [${this.moduleId}Module] Icône affichée avant connexion UIManager`);
      }
      
      // Enregistrer l'icône pour positionnement automatique
      uiManager.registerIconPosition(this.moduleId, this.icon.iconElement, this.uiManagerConfig);
      
      // Marquer comme connecté
      this.icon.iconElement.setAttribute('data-positioned-by-uimanager', 'true');
      
      console.log(`✅ [${this.moduleId}Module] Connecté à UIManager avec succès`);
      return true;
      
    } catch (error) {
      console.error(`❌ [${this.moduleId}Module] Erreur connexion UIManager:`, error);
      return false;
    }
  }
  
  // === 🔧 MÉTHODES UTILITAIRES GÉNÉRIQUES ===
  
  /**
   * Assurer la création d'icône pour UIManager
   */
  ensureIconForUIManager() {
    console.log(`🔧 [${this.moduleId}Module] Vérification icône pour UIManager...`);
    
    if (!this.icon) {
      console.log(`🆕 [${this.moduleId}Module] Création icône manquante...`);
      this.createComponents();
      this.connectComponents();
    }
    
    if (!this.icon.iconElement) {
      console.warn(`❌ [${this.moduleId}Module] Impossible de créer iconElement`);
      return false;
    }
    
    // Reset l'état de positionnement
    this.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
    
    console.log(`✅ [${this.moduleId}Module] Icône prête pour UIManager`);
    return true;
  }
  
  /**
   * Fermeture forcée de l'UI
   */
  forceCloseUI() {
    console.log(`🔒 [${this.moduleId}Module] Force fermeture UI...`);
    
    try {
      // Méthode 1: Via le module UI
      if (this.ui && this.ui.hide) {
        this.ui.hide();
        console.log('  ✅ UI fermée via module');
      }
      
      // Méthode 2: Fermeture brutale overlay
      const overlay = document.querySelector(`#${this.moduleId}-overlay`);
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        console.log('  ✅ Overlay fermé brutalement');
      }
      
      // Méthode 3: Tous les éléments du module
      const moduleElements = document.querySelectorAll(
        `.${this.moduleId}-overlay, .${this.moduleId}-modal, .${this.moduleId}-interface, [id*="${this.moduleId}-"]`
      );
      moduleElements.forEach(el => {
        if (el.style) {
          el.style.display = 'none';
        }
      });
      
      if (moduleElements.length > 0) {
        console.log(`  ✅ ${moduleElements.length} éléments ${this.moduleId} fermés`);
      }
      
      // Marquer UI comme fermée
      if (this.ui) {
        this.ui.isVisible = false;
      }
      
      console.log(`✅ [${this.moduleId}Module] UI fermée avec succès (force)`);
      
    } catch (error) {
      console.error(`❌ [${this.moduleId}Module] Erreur force fermeture:`, error);
    }
  }
  
  // === 🎛️ INTERFACE UIMANAGER STANDARDISÉE ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   */
  show() {
    this.uiManagerState.visible = true;
    
    // Afficher l'icône
    if (this.icon) {
      this.icon.show();
    }
    
    // Demander une mise à jour des données si manager présent
    if (this.manager && typeof this.manager.requestData === 'function') {
      setTimeout(() => {
        this.manager.requestData();
      }, 200);
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
    this.uiManagerState.visible = false;
    
    // Cacher l'icône
    if (this.icon) {
      this.icon.hide();
    }
    
    // Cacher l'interface si ouverte
    if (this.ui && this.ui.isVisible) {
      this.ui.hide();
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour activer/désactiver
   */
  setEnabled(enabled) {
    this.uiManagerState.enabled = enabled;
    
    // Appliquer aux composants
    if (this.icon) {
      this.icon.setEnabled(enabled);
    }
    
    if (this.ui) {
      this.ui.setEnabled(enabled);
    }
    
    return true;
  }
  
  /**
   * UIManager peut appeler cette méthode pour obtenir l'état
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      iconVisible: this.icon ? this.icon.isVisible : false,
      interfaceVisible: this.ui ? this.ui.isVisible : false,
      singleton: this.options.singleton,
      moduleId: this.moduleId,
      instanceId: this.constructor.name + '_' + (this.gameRoom?.id || 'unknown')
    };
  }
  
  // === 🔧 GESTION ÉTAT GÉNÉRIQUE ===
  
  applyUIManagerState() {
    if (!this.uiManagerState.initialized) return;
    
    // Appliquer visibilité
    if (this.uiManagerState.visible) {
      this.icon?.show();
    } else {
      this.icon?.hide();
      this.ui?.hide();
    }
    
    // Appliquer état enabled
    this.icon?.setEnabled(this.uiManagerState.enabled);
    this.ui?.setEnabled(this.uiManagerState.enabled);
  }
  
  /**
   * Vérifier si on peut ouvrir l'interface (à surcharger si nécessaire)
   */
  canOpenUI() {
    // Vérifications génériques
    const blockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#dialogue-box:not([style*="display: none"])'),
      document.querySelector('#shop-overlay:not(.hidden)')
    ];
    
    const hasBlocker = blockers.some(el => el !== null);
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !hasBlocker && !chatFocused && !inventoryOpen && this.uiManagerState.enabled;
  }
  
  /**
   * Afficher message d'impossibilité d'ouverture
   */
  showCannotOpenMessage() {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(`Cannot open ${this.moduleId} right now`, 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === ⌨️ RACCOURCI CLAVIER GÉNÉRIQUE ===
  
  setupKeyboardShortcut() {
    const shortcut = this.options.keyboardShortcut;
    if (!shortcut) return;
    
    // Éviter double setup
    const setupKey = `_${this.moduleId}KeyboardSetup`;
    if (window[setupKey]) {
      console.log(`ℹ️ [${this.moduleId}Keyboard] Raccourcis déjà configurés`);
      return;
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === shortcut.toLowerCase() && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          !e.ctrlKey && !e.altKey && !e.metaKey) {
        
        e.preventDefault();
        
        if (this.canOpenUI()) {
          this.toggleUI();
        }
      }
    });
    
    window[setupKey] = true;
    console.log(`⌨️ [${this.moduleId}Keyboard] Raccourci '${shortcut}' configuré`);
  }
  
  // === 📊 API PUBLIQUE GÉNÉRIQUE ===
  
  /**
   * Ouvrir/fermer l'interface
   */
  toggleUI() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  /**
   * Ouvrir l'interface
   */
  open() {
    if (this.ui && this.canOpenUI()) {
      this.ui.show();
    }
  }
  
  /**
   * Fermer l'interface
   */
  close() {
    if (this.ui) {
      this.ui.hide();
    }
  }
  
  // === 🆕 MÉTHODES STATIQUES SINGLETON ===
  
  /**
   * Obtenir l'instance singleton du module
   */
  static getInstance(moduleId) {
    const instanceKey = `${moduleId}Instance`;
    return this[instanceKey] || null;
  }
  
  /**
   * Reset l'instance singleton
   */
  static reset(moduleId) {
    const instanceKey = `${moduleId}Instance`;
    if (this[instanceKey]) {
      this[instanceKey].destroy();
      this[instanceKey] = null;
    }
  }
  
  /**
   * Vérifier si une instance singleton existe
   */
  static hasInstance(moduleId) {
    const instanceKey = `${moduleId}Instance`;
    return this[instanceKey] !== null;
  }
  
  // === 🧹 NETTOYAGE GÉNÉRIQUE ===
  
  destroy() {
    try {
      console.log(`🧹 [${this.moduleId}Module] Destruction...`);
      
      // Détruire les composants dans l'ordre inverse
      if (this.ui) {
        this.ui.destroy?.();
        this.ui = null;
      }
      
      if (this.icon) {
        this.icon.destroy?.();
        this.icon = null;
      }
      
      if (this.manager) {
        this.manager.destroy?.();
        this.manager = null;
      }
      
      // Reset état
      this.uiManagerState.initialized = false;
      
      // Reset singleton si applicable
      if (this.options.singleton) {
        const instanceKey = `${this.moduleId}Instance`;
        if (this.constructor[instanceKey] === this) {
          this.constructor[instanceKey] = null;
          console.log(`🧹 [${this.moduleId}Module] Singleton reseté`);
        }
      }
      
      console.log(`✅ [${this.moduleId}Module] Destruction terminée`);
      
    } catch (error) {
      console.error(`❌ [${this.moduleId}Module] Erreur destruction:`, error);
    }
  }
}

// === 🏭 FACTORY GÉNÉRIQUE ===

/**
 * Factory function générique pour créer des modules
 * @param {Class} ModuleClass - Classe du module (ex: TeamModule)
 * @param {string} moduleId - ID du module (ex: 'team')
 * @param {Object} gameRoom - Room de jeu
 * @param {Object} scene - Scène Phaser
 * @param {Object} options - Options du module
 */
export async function createModule(ModuleClass, moduleId, gameRoom, scene, options = {}) {
  try {
    console.log(`🏭 [${moduleId}Factory] Création/récupération module...`);
    
    // Vérifier si instance singleton existe si activé
    if (options.singleton) {
      const instanceKey = `${moduleId}Instance`;
      let existingInstance = ModuleClass[instanceKey];
      
      if (existingInstance && existingInstance.uiManagerState.initialized) {
        console.log(`♻️ [${moduleId}Factory] Instance singleton trouvée...`);
        
        // Fermer l'UI si elle est ouverte (éviter conflit)
        existingInstance.forceCloseUI();
        
        // Vérifier compatibilité gameRoom
        if (existingInstance.gameRoom !== gameRoom) {
          console.log(`🔄 [${moduleId}Factory] GameRoom différent, mise à jour...`);
          existingInstance.gameRoom = gameRoom;
          existingInstance.scene = scene;
          
          // Reconnecter le manager si nécessaire
          if (existingInstance.manager) {
            existingInstance.manager.gameRoom = gameRoom;
          }
        }
        
        return existingInstance;
      }
    }
    
    // Créer nouvelle instance
    console.log(`🆕 [${moduleId}Factory] Création nouvelle instance...`);
    const moduleInstance = new ModuleClass(moduleId, gameRoom, scene, options);
    await moduleInstance.initializeModule();
    
    console.log(`✅ [${moduleId}Factory] Module créé avec succès`);
    return moduleInstance;
    
  } catch (error) {
    console.error(`❌ [${moduleId}Factory] Erreur création module:`, error);
    throw error;
  }
}

// === 📋 GÉNÉRATEUR DE CONFIGURATION UIMANAGER ===

/**
 * Générer la configuration UIManager pour un module
 * @param {string} moduleId - ID du module
 * @param {Object} config - Configuration spécifique
 */
export function generateModuleConfig(moduleId, config = {}) {
  return {
    id: moduleId,
    factory: () => config.factory || (() => createModule(config.moduleClass, moduleId, window.currentGameRoom, window.game?.scene?.getScenes(true)[0], config.options)),
    
    defaultState: {
      visible: true,
      enabled: true,
      initialized: false,
      ...config.defaultState
    },
    
    priority: config.priority || 100,
    critical: config.critical || false,
    
    layout: {
      type: 'icon',
      anchor: 'bottom-right',
      order: config.order || 0,
      spacing: 10,
      ...config.layout
    },
    
    responsive: {
      mobile: { scale: 0.8, position: { right: '15px', bottom: '15px' } },
      tablet: { scale: 0.9 },
      desktop: { scale: 1.0 },
      ...config.responsive
    },
    
    groups: config.groups || ['ui-icons'],
    
    animations: {
      show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
      hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
      enable: { type: 'pulse', duration: 150 },
      disable: { type: 'grayscale', duration: 200 },
      ...config.animations
    },
    
    metadata: {
      name: config.name || `${moduleId} Module`,
      description: config.description || `${moduleId} management system`,
      version: config.version || '1.0.0',
      category: config.category || 'Game Management',
      singleton: config.options?.singleton || false,
      ...config.metadata
    }
  };
}

// === 🔧 UTILITAIRES DE DEBUG GÉNÉRIQUES ===

/**
 * Debug d'un module spécifique
 */
export function debugModule(moduleId, ModuleClass) {
  const instanceKey = `${moduleId}Instance`;
  const instance = ModuleClass[instanceKey];
  
  const info = {
    hasSingleton: !!instance,
    isInitialized: instance ? instance.uiManagerState.initialized : false,
    hasIcon: instance ? !!instance.icon : false,
    hasUI: instance ? !!instance.ui : false,
    uiVisible: instance ? instance.ui?.isVisible : false,
    iconVisible: instance ? instance.icon?.isVisible : false,
    gameRoom: instance ? !!instance.gameRoom : false,
    
    state: instance ? instance.getUIManagerState() : null,
    
    solutions: instance ? [
      '✅ Instance OK - utilisez forceCloseUI()',
      `🔒 window.${moduleId}System.forceCloseUI() pour fermer UI`,
      `🔄 window.${moduleId}SystemGlobal pour accès direct`
    ] : [
      `🚀 Créez avec createModule(${ModuleClass.name}, '${moduleId}', ...)`,
      `🔧 Utilisez la factory générique`
    ]
  };
  
  console.log(`🔍 === DEBUG ${moduleId.toUpperCase()} MODULE ===`);
  console.table(info);
  
  return info;
}

export default BaseModule;
