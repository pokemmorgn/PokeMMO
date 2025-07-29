// Inventory/index.js - InventoryModule avec support traductions
// 🌐 MODIFICATION: Passe optionsManager aux composants
// 📍 Changement minimal sur createComponents() selon pattern TeamModule

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { InventorySystem } from './InventorySystem.js';
import { InventoryIcon } from './InventoryIcon.js';
import { InventoryUI } from './InventoryUI.js';

/**
 * Module Inventory utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 */
export class InventoryModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Inventory
    const inventoryOptions = {
      singleton: true,           // Inventory est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'i',     // Touche I pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 0,                // Premier dans la liste (plus à droite)
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'inventory', gameRoom, scene, inventoryOptions);
    
    // === 🌐 NOUVEAU: Support optionsManager ===
    this.optionsManager = options.optionsManager || null;
    
    // === RÉFÉRENCE AU SYSTÈME PRINCIPAL ===
    this.system = null;  // InventorySystem (logique complète)
    
    console.log('🎒 [InventoryModule] Instance créée avec BaseModule et optionsManager:', !!this.optionsManager);
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Inventory
   */
  async init() {
    console.log('🚀 [InventoryModule] Initialisation métier Inventory...');
    
    // Créer le système principal (qui inclut la logique métier)
   this.system = new InventorySystem(this.scene, this.gameRoom, this.optionsManager);
    
    console.log('✅ [InventoryModule] Système Inventory initialisé');
  }
  
  /**
   * Création des composants Inventory
   * 🌐 MODIFIÉ: Passe optionsManager aux composants
   */
  createComponents() {
    console.log('🔧 [InventoryModule] Création composants Inventory avec optionsManager...');
    
    // Le système a déjà créé l'UI et l'icône, on les récupère ET on les modifie
    if (this.system) {
      this.ui = this.system.inventoryUI;
      
      // 🌐 MODIFICATION: Recréer l'icône avec optionsManager
      if (this.system.inventoryIcon) {
        // Détruire l'ancienne icône
        this.system.inventoryIcon.destroy();
      }
      
      // Créer nouvelle icône avec optionsManager
      this.icon = new InventoryIcon(this.ui, this.optionsManager);
      this.icon.init();
      
      // Remplacer dans le système
      this.system.inventoryIcon = this.icon;
      
      console.log('🎨 [InventoryModule] InventoryIcon recréé avec optionsManager:', !!this.optionsManager);
      
      // 🌐 MODIFICATION: Ajouter optionsManager à InventoryUI si possible
      if (this.ui && !this.ui.optionsManager) {
        this.ui.optionsManager = this.optionsManager;
        
        // Appeler setupLanguageSupport si la méthode existe
        if (typeof this.ui.setupLanguageSupport === 'function') {
          this.ui.setupLanguageSupport();
          console.log('🌐 [InventoryModule] InventoryUI configuré avec optionsManager');
        }
      }
      
      // 🆕 ASSURER QUE L'ICÔNE EST INITIALISÉE
      if (this.icon && !this.icon.iconElement) {
        console.log('🔧 [InventoryModule] Initialisation icône manquante...');
        this.icon.init();
      }
      
      // Assurer que l'icône est dans le bon mode UIManager
      if (this.icon && this.icon.iconElement) {
        this.icon.positioningMode = 'uimanager';
        
        // Supprimer tout positionnement automatique de l'icône
        this.icon.iconElement.style.position = '';
        this.icon.iconElement.style.right = '';
        this.icon.iconElement.style.bottom = '';
        this.icon.iconElement.style.left = '';
        this.icon.iconElement.style.top = '';
        this.icon.iconElement.style.zIndex = '';
        
        console.log('✅ [InventoryModule] Icône préparée pour UIManager');
      } else {
        console.warn('❌ [InventoryModule] Impossible de préparer l\'icône');
      }
    }
    
    console.log('✅ [InventoryModule] Composants Inventory créés avec support traductions');
  }
  
  /**
   * Connexion des composants Inventory
   */
  connectComponents() {
    console.log('🔗 [InventoryModule] Connexion composants Inventory...');
    
    // Les composants sont déjà connectés par InventorySystem
    // On ajoute juste la logique spécifique UIManager
    
    // Icône → Interface (via BaseModule)
    if (this.icon) {
      this.icon.onClick = () => {
        // ✅ UTILISER BaseModule.canOpenUI() (qui délègue vers UIManager)
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Assurer compatibilité UIManager
    this.ensureIconForUIManager();
    
    console.log('✅ [InventoryModule] Composants Inventory connectés via BaseModule');
  }
  
  // === 📊 MÉTHODES SPÉCIFIQUES INVENTORY (INCHANGÉES) ===
  
  /**
   * Demander les données Inventory (override de la méthode générique)
   */
  show() {
    const result = super.show();
    
    // Demander données Inventory spécifiquement
    if (this.system) {
      setTimeout(() => {
        this.system.requestInventoryData();
      }, 200);
    }
    
    return result;
  }
  
  /**
   * Obtenir les objets de l'inventaire
   */
  getItems() {
    return this.system ? this.system.getItemCount() : [];
  }
  
  /**
   * Utiliser un objet
   */
  useItem(itemId, context = "field") {
    if (this.system) {
      this.system.useItem(itemId, context);
    }
  }
  
  /**
   * Vérifier si l'inventaire a un objet
   */
  hasItem(itemId) {
    return this.system ? this.system.hasItem(itemId) : false;
  }
  
  /**
   * Obtenir le nombre d'un objet
   */
  getItemCount(itemId) {
    return this.system ? this.system.getItemCount(itemId) : 0;
  }
  
  /**
   * Vérifier si l'inventaire est plein
   */
  isFull() {
    return this.system ? this.system.isFull() : false;
  }
  
  /**
   * Ouvrir une poche spécifique
   */
  openToPocket(pocketName) {
    if (this.ui) {
      this.ui.openToPocket(pocketName);
    }
  }
  
  /**
   * API legacy pour compatibilité
   */
  toggleInventoryUI() {
    this.toggleUI();
  }
  
  openInventory() {
    this.open();
  }
  
  closeInventory() {
    this.close();
  }
  
  isInventoryOpen() {
    return this.ui ? this.ui.isVisible : false;
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS INVENTORY ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Inventory
    return {
      ...baseState,
      hasItems: this.ui ? Object.keys(this.ui.inventoryData || {}).length > 0 : false,
      canOpen: this.canOpenUI(),
      moduleType: 'inventory',
      hasOptionsManager: !!this.optionsManager // 🌐 NOUVEAU: Info debug
    };
  }
  
  /**
   * Exposer le système globalement pour compatibilité
   */
  exposeGlobally() {
    if (!window.inventorySystem) {
      window.inventorySystem = this.system;
      window.inventorySystemGlobal = this;
      console.log('🌐 [InventoryModule] Système exposé globalement');
    }
  }
  
  /**
   * Override de la méthode initializeModule pour exposer globalement
   */
  async initializeModule() {
    const result = await super.initializeModule();
    
    // Exposer globalement après initialisation
    this.exposeGlobally();
    
    return result;
  }
  
  /**
   * Méthode pour assurer la compatibilité avec UIManager
   */
  ensureIconForUIManager() {
    console.log('🔧 [InventoryModule] Vérification icône pour UIManager...');
    
    if (this.icon && this.icon.iconElement) {
      // Reset du positionnement pour UIManager
      this.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
      
      // Supprimer tout positionnement automatique
      this.icon.iconElement.style.position = '';
      this.icon.iconElement.style.right = '';
      this.icon.iconElement.style.bottom = '';
      this.icon.iconElement.style.left = '';
      this.icon.iconElement.style.top = '';
      this.icon.iconElement.style.zIndex = '';
      
      console.log('✅ [InventoryModule] Icône prête pour UIManager');
      return true;
    }
    
    console.warn('❌ [InventoryModule] Icône non disponible');
    return false;
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [InventoryModule] Destruction...');
    
    if (this.system) {
      this.system.destroy();
      this.system = null;
    }
    
    // Appeler destruction BaseModule
    super.destroy();
    
    console.log('✅ [InventoryModule] Détruit');
  }
}

// === 🏭 FACTORY INVENTORY AVEC SUPPORT OPTIONSMANAGER ===

/**
 * Factory function pour créer le module Inventory
 * 🌐 MODIFIÉ: Accepte optionsManager en paramètre
 */
export async function createInventoryModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [InventoryFactory] Création module Inventory avec optionsManager...');
    
    const inventoryOptions = {
      singleton: true,
      ...options
    };
    
    const inventoryInstance = await createModule(InventoryModule, 'inventory', gameRoom, scene, inventoryOptions);
    
    console.log('✅ [InventoryFactory] Module Inventory créé avec support traductions');
    return inventoryInstance;
    
  } catch (error) {
    console.error('❌ [InventoryFactory] Erreur création module Inventory:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION INVENTORY POUR UIMANAGER (INCHANGÉE) ===

export const INVENTORY_MODULE_CONFIG = generateModuleConfig('inventory', {
  moduleClass: InventoryModule,
  order: 0,  // Premier = plus à droite
  
  options: {
    singleton: true,
    keyboardShortcut: 'i'
  },
  
  groups: ['ui-icons', 'item-management'],
  
  metadata: {
    name: 'Inventory Manager',
    description: 'Complete item inventory management system',
    version: '2.0.0',
    category: 'Item Management'
  },
  
  factory: () => createInventoryModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

/**
 * Enregistrer le module Inventory dans UIManager
 */
export async function registerInventoryModule(uiManager) {
  try {
    console.log('📝 [InventoryIntegration] Enregistrement Inventory...');
    
    // Vérifier si déjà enregistré
    if (uiManager.modules && uiManager.modules.has('inventory')) {
      console.log('ℹ️ [InventoryIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('inventory', INVENTORY_MODULE_CONFIG);
    console.log('✅ [InventoryIntegration] Module Inventory enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [InventoryIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Inventory
 * 🌐 MODIFIÉ: Peut recevoir optionsManager
 */
export async function initializeInventoryModule(uiManager, optionsManager = null) {
  try {
    console.log('🚀 [InventoryIntegration] Initialisation Inventory avec optionsManager...');
    
    // Enregistrer le module
    await registerInventoryModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let inventoryInstance = InventoryModule.getInstance('inventory');
    
    if (!inventoryInstance || !inventoryInstance.uiManagerState.initialized) {
      // 🌐 MODIFICATION: Passer optionsManager dans les options
      const initOptions = optionsManager ? { optionsManager } : {};
      inventoryInstance = await uiManager.initializeModule('inventory', initOptions);
      
      console.log('🌐 [InventoryIntegration] Inventory initialisé avec optionsManager:', !!optionsManager);
    } else {
      console.log('ℹ️ [InventoryIntegration] Instance déjà initialisée');
      
      // 🌐 NOUVEAU: Injecter optionsManager si pas encore fait
      if (optionsManager && !inventoryInstance.optionsManager) {
        inventoryInstance.optionsManager = optionsManager;
        console.log('🌐 [InventoryIntegration] OptionsManager injecté dans instance existante');
        
        // Recréer composants avec optionsManager si nécessaire
        if (inventoryInstance.icon && !inventoryInstance.icon.optionsManager) {
          console.log('🔄 [InventoryIntegration] Mise à jour InventoryIcon avec optionsManager...');
          inventoryInstance.icon.optionsManager = optionsManager;
          inventoryInstance.icon.setupLanguageSupport?.();
        }
        
        if (inventoryInstance.ui && !inventoryInstance.ui.optionsManager) {
          console.log('🔄 [InventoryIntegration] Mise à jour InventoryUI avec optionsManager...');
          inventoryInstance.ui.optionsManager = optionsManager;
          inventoryInstance.ui.setupLanguageSupport?.();
        }
      }
      
      // Connecter à UIManager si pas encore fait
      inventoryInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Inventory
    setupInventoryGlobalEvents(inventoryInstance);
    
    console.log('✅ [InventoryIntegration] Initialisation Inventory terminée avec traductions');
    return inventoryInstance;
    
  } catch (error) {
    console.error('❌ [InventoryIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX INVENTORY (INCHANGÉS) ===

function setupInventoryGlobalEvents(inventoryInstance) {
  // Éviter double setup
  if (window._inventoryEventsSetup) {
    console.log('ℹ️ [InventoryEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Objet ramassé
  window.addEventListener('itemPickup', (event) => {
    if (inventoryInstance.system) {
      inventoryInstance.system.onItemPickup(event.detail.itemId, event.detail.quantity);
    }
  });
  
  // Événement: Combat commencé (fermer l'inventaire)
  window.addEventListener('battleStarted', () => {
    if (inventoryInstance.ui && inventoryInstance.ui.isVisible) {
      inventoryInstance.ui.hide();
    }
  });
  
  // Événement: Shop ouvert (fermer l'inventaire)
  window.addEventListener('shopOpened', () => {
    if (inventoryInstance.ui && inventoryInstance.ui.isVisible) {
      inventoryInstance.ui.hide();
    }
  });
  
  window._inventoryEventsSetup = true;
  console.log('🌐 [InventoryEvents] Événements Inventory configurés');
}

// === 💡 UTILISATION SIMPLE AVEC OPTIONSMANAGER ===

/**
 * Fonction d'utilisation simple pour intégrer Inventory dans un projet
 * 🌐 MODIFIÉ: Accepte optionsManager
 */
export async function setupInventorySystem(uiManager, optionsManager = null) {
  try {
    console.log('🔧 [InventorySetup] Configuration système Inventory avec traductions...');
    
    // Initialiser le module avec optionsManager
    const inventoryInstance = await initializeInventoryModule(uiManager, optionsManager);
    
    // Exposer globalement pour compatibilité
    if (!window.inventorySystem) {
      window.inventorySystem = inventoryInstance.system;
      window.inventorySystemGlobal = inventoryInstance;
      window.toggleInventory = () => inventoryInstance.toggleUI();
      window.openInventory = () => inventoryInstance.open();
      window.closeInventory = () => inventoryInstance.close();
      window.isInventoryOpen = () => inventoryInstance.ui?.isVisible || false;
      
      console.log('🌐 [InventorySetup] Fonctions globales Inventory exposées');
    }
    
    console.log('✅ [InventorySetup] Système Inventory configuré avec traductions');
    return inventoryInstance;
    
  } catch (error) {
    console.error('❌ [InventorySetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG INVENTORY (INCHANGÉES) ===

export function debugInventoryModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('inventory', InventoryModule);
}

export function fixInventoryModule() {
  console.log('🔧 [InventoryFix] Réparation module Inventory...');
  
  try {
    const instance = InventoryModule.getInstance('inventory');
    
    if (instance) {
      // Force fermeture UI via BaseModule
      instance.forceCloseUI();
      
      console.log('✅ [InventoryFix] Module Inventory réparé');
      return true;
    } else {
      console.log('ℹ️ [InventoryFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [InventoryFix] Erreur réparation:', error);
    return false;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default InventoryModule;
