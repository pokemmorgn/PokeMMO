// Inventory/index.js - Module Inventory Unifié pour UIManager
// 🎯 1 SEUL module qui gère TOUT : business logic + icône + interface
// ✅ MODIFIÉ: Auto-enregistrement UIManager pour positionnement intelligent

import { InventorySystem } from './InventorySystem.js';
import { InventoryIcon } from './InventoryIcon.js';
import { InventoryUI } from './InventoryUI.js';

/**
 * Module Inventory Unifié
 * Compatible avec UIManager
 * API simple: show(), hide(), setEnabled()
 */
export class InventoryModule {
  constructor(gameRoom, scene) {
    this.gameRoom = gameRoom;
    this.scene = scene;
    
    // === INSTANCES DES COMPOSANTS ===
    this.system = null;
    this.icon = null;
    this.ui = null;
    
    // === ÉTAT UIManager ===
    this.uiManagerState = {
      visible: true,        // Icône visible par défaut
      enabled: true,        // Module activé
      initialized: false    // Non encore initialisé
    };
    
    console.log('🎒 [InventoryModule] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [InventoryModule] Initialisation...');
      
      // 1. Créer l'UI d'inventaire
      this.ui = new InventoryUI(this.gameRoom);
      
      // 2. Créer l'icône d'inventaire  
      this.icon = new InventoryIcon(this.ui);
      await this.icon.init(); // S'assurer que l'icône est créée
      
      // 3. Créer le système principal (qui orchestre)
      this.system = new InventorySystem(this.scene, this.gameRoom);
      
      // 4. Connecter les composants
      this.connectComponents();
      
      // ✅ 5. AUTO-ENREGISTREMENT DANS UIMANAGER
      this.registerWithUIManager();
      
      // 6. Appliquer l'état initial
      this.applyUIManagerState();
      
      this.uiManagerState.initialized = true;
      
      console.log('✅ [InventoryModule] Initialisé avec UIManager');
      return this;
      
    } catch (error) {
      console.error('❌ [InventoryModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Auto-enregistrement UIManager
  registerWithUIManager() {
    console.log('📍 [InventoryModule] Enregistrement dans UIManager...');
    
    // Vérifier que UIManager existe
    if (!window.uiManager || !window.uiManager.registerIconPosition) {
      console.warn('⚠️ [InventoryModule] UIManager non disponible pour positionnement');
      return;
    }
    
    // Vérifier que l'icône existe
    if (!this.icon || !this.icon.iconElement) {
      console.warn('⚠️ [InventoryModule] IconElement non disponible pour enregistrement');
      return;
    }
    
    // Supprimer tout positionnement manuel existant
    const iconElement = this.icon.iconElement;
    iconElement.style.position = '';
    iconElement.style.right = '';
    iconElement.style.bottom = '';
    iconElement.style.left = '';
    iconElement.style.top = '';
    
    // Enregistrer dans UIManager
    window.uiManager.registerIconPosition('inventory', iconElement, {
      anchor: 'bottom-right',
      order: 0,               // Première position (plus à droite)
      group: 'ui-icons',
      spacing: 10,
      size: { width: 70, height: 80 }
    });
    
    console.log('✅ [InventoryModule] Icône enregistrée dans UIManager (ordre: 0)');
  }
  
  // === 🔗 CONNEXION DES COMPOSANTS ===
  
  connectComponents() {
    console.log('🔗 [InventoryModule] Connexion des composants...');
    
    // Le système InventorySystem gère déjà les connexions
    // entre InventoryIcon et InventoryUI, donc pas grand chose à faire
    
    // S'assurer que les références sont correctes
    if (this.system) {
      this.system.inventoryUI = this.ui;
      this.system.inventoryIcon = this.icon;
    }
    
    // Exposer globalement pour compatibilité
    window.inventorySystem = this.system;
    window.inventorySystemGlobal = this; // Pour UIManager
    
    console.log('✅ [InventoryModule] Composants connectés');
  }
  
  // === 🎛️ MÉTHODES UIMANAGER (INTERFACE PRINCIPALE) ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   */
  show() {
    console.log('👁️ [InventoryModule] Show appelé');
    
    this.uiManagerState.visible = true;
    
    // Afficher l'icône
    if (this.icon && this.icon.show) {
      this.icon.show();
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
    console.log('👻 [InventoryModule] Hide appelé');
    
    this.uiManagerState.visible = false;
    
    // Cacher l'icône
    if (this.icon && this.icon.hide) {
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
    console.log(`🔧 [InventoryModule] setEnabled(${enabled})`);
    
    this.uiManagerState.enabled = enabled;
    
    // Appliquer aux composants
    if (this.icon && this.icon.setEnabled) {
      this.icon.setEnabled(enabled);
    }
    
    if (this.ui && this.ui.setEnabled) {
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
      iconVisible: this.icon ? !this.icon.iconElement?.classList.contains('ui-hidden') : false,
      interfaceVisible: this.ui ? this.ui.isVisible : false,
      hasItems: this.ui ? Object.keys(this.ui.inventoryData).length > 0 : false,
      canOpen: this.canOpenInventory()
    };
  }
  
  // === 🔧 GESTION ÉTAT INTERNE ===
  
  applyUIManagerState() {
    if (!this.uiManagerState.initialized) return;
    
    // Appliquer visibilité
    if (this.uiManagerState.visible) {
      this.icon?.show?.();
    } else {
      this.icon?.hide?.();
      this.ui?.hide?.();
    }
    
    // Appliquer état enabled
    this.icon?.setEnabled?.(this.uiManagerState.enabled);
    this.ui?.setEnabled?.(this.uiManagerState.enabled);
  }
  
  canOpenInventory() {
    // Vérifier si on peut ouvrir l'interface
    const blockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#dialogue-box:not([style*="display: none"])'),
      document.querySelector('#team-overlay:not(.hidden)')
    ];
    
    const hasBlocker = blockers.some(el => el !== null);
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    
    return !hasBlocker && !chatFocused && this.uiManagerState.enabled;
  }
  
  // === 📊 API PUBLIQUE POUR COMPATIBILITÉ ===
  
  /**
   * Ouvrir/fermer l'interface Inventory
   */
  toggle() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  /**
   * Ouvrir l'interface Inventory
   */
  openInventory() {
    if (this.ui && this.canOpenInventory()) {
      this.ui.show();
    }
  }
  
  /**
   * Fermer l'interface Inventory
   */
  closeInventory() {
    if (this.ui) {
      this.ui.hide();
    }
  }
  
  /**
   * Ouvrir l'inventaire à une poche spécifique
   */
  openToPocket(pocketName) {
    if (this.ui) {
      this.ui.openToPocket(pocketName);
    }
  }
  
  /**
   * Vérifier si l'inventaire est ouvert
   */
  isInventoryOpen() {
    return this.ui ? this.ui.isVisible : false;
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
   * Vérifier si on a un objet
   */
  hasItem(itemId) {
    return this.system ? this.system.hasItem(itemId) : false;
  }
  
  /**
   * Obtenir la quantité d'un objet
   */
  getItemCount(itemId) {
    return this.system ? this.system.getItemCount(itemId) : 0;
  }
  
  /**
   * Demander les données d'inventaire au serveur
   */
  requestInventoryData() {
    if (this.system) {
      this.system.requestInventoryData();
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    try {
      console.log('🧹 [InventoryModule] Destruction...');
      
      // Détruire les composants dans l'ordre inverse
      if (this.system && this.system.destroy) {
        this.system.destroy();
        this.system = null;
      }
      
      if (this.icon && this.icon.destroy) {
        this.icon.destroy();
        this.icon = null;
      }
      
      if (this.ui && this.ui.destroy) {
        this.ui.destroy();
        this.ui = null;
      }
      
      // Reset état
      this.uiManagerState.initialized = false;
      
      console.log('✅ [InventoryModule] Détruit');
      
    } catch (error) {
      console.error('❌ [InventoryModule] Erreur destruction:', error);
    }
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.uiManagerState.initialized,
      visible: this.uiManagerState.visible,
      enabled: this.uiManagerState.enabled,
      hasSystem: !!this.system,
      hasIcon: !!this.icon,
      hasUI: !!this.ui,
      iconElement: this.icon ? !!this.icon.iconElement : false,
      uiVisible: this.ui ? this.ui.isVisible : false,
      canOpen: this.canOpenInventory(),
      registeredInUIManager: !!(window.uiManager?.registeredIcons?.has('inventory')),
      components: {
        system: this.system?.constructor?.name || 'none',
        icon: this.icon?.constructor?.name || 'none',
        ui: this.ui?.constructor?.name || 'none'
      }
    };
  }
}

// === 🏭 FACTORY POUR UIMANAGER ===

/**
 * Factory function pour créer le module Inventory
 * Compatible avec UIManager
 */
export async function createInventoryModule(gameRoom, scene) {
  try {
    console.log('🏭 [InventoryFactory] Création module Inventory...');
    
    const inventoryModule = new InventoryModule(gameRoom, scene);
    await inventoryModule.init();
    
    console.log('✅ [InventoryFactory] Module créé avec succès');
    return inventoryModule;
    
  } catch (error) {
    console.error('❌ [InventoryFactory] Erreur création module Inventory:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POUR UIMANAGER ===

export const INVENTORY_MODULE_CONFIG = {
  id: 'inventory',
  factory: () => createInventoryModule(window.currentGameRoom, window.game?.scene?.getScenes(true)[0]),
  
  defaultState: {
    visible: true,     // Icône visible par défaut
    enabled: true,     // Module activé
    initialized: false
  },
  
  priority: 100,
  critical: true,     // Module critique (inventaire est essentiel)
  
  layout: {
    type: 'icon',
    anchor: 'bottom-right',
    order: 0,           // Premier (position la plus à droite)
    spacing: 10
  },
  
  responsive: {
    mobile: { 
      scale: 0.8,
      position: { right: '15px', bottom: '15px' }
    },
    tablet: { 
      scale: 0.9 
    },
    desktop: { 
      scale: 1.0 
    }
  },
  
  groups: ['ui-icons', 'inventory-management'],
  
  animations: {
    show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
    hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
    enable: { type: 'pulse', duration: 150 },
    disable: { type: 'grayscale', duration: 200 }
  },
  
  metadata: {
    name: 'Inventory Manager',
    description: 'Complete inventory management system',
    version: '1.0.0',
    category: 'Inventory Management'
  }
};

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

/**
 * Enregistrer le module Inventory dans UIManager
 */
export async function registerInventoryModule(uiManager) {
  try {
    await uiManager.registerModule('inventory', INVENTORY_MODULE_CONFIG);
    console.log('✅ [InventoryIntegration] Module enregistré dans UIManager');
    return true;
  } catch (error) {
    console.error('❌ [InventoryIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Inventory
 */
export async function initializeInventoryModule(uiManager) {
  try {
    // Enregistrer le module
    await registerInventoryModule(uiManager);
    
    // Initialiser le module
    const inventoryInstance = await uiManager.initializeModule('inventory');
    
    // Setup des raccourcis clavier
    setupInventoryKeyboardShortcuts(inventoryInstance);
    
    // Setup des événements globaux
    setupInventoryGlobalEvents(inventoryInstance);
    
    console.log('✅ [InventoryIntegration] Module initialisé et connecté');
    return inventoryInstance;
    
  } catch (error) {
    console.error('❌ [InventoryIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === ⌨️ RACCOURCIS CLAVIER ===

function setupInventoryKeyboardShortcuts(inventoryInstance) {
  console.log('⌨️ [InventoryIntegration] Configuration raccourcis clavier...');
  
  document.addEventListener('keydown', (e) => {
    // Ne pas traiter si on ne peut pas interagir
    if (!inventoryInstance.canOpenInventory()) return;
    
    // Touche I pour ouvrir/fermer Inventory
    if (e.key.toLowerCase() === 'i' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      inventoryInstance.toggle();
    }
    
    // Touche B pour ouvrir directement les Poké Balls
    if (e.key.toLowerCase() === 'b' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      inventoryInstance.openToPocket('balls');
    }
    
    // Touche M pour ouvrir directement les soins
    if (e.key.toLowerCase() === 'm' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      inventoryInstance.openToPocket('medicine');
    }
  });
  
  console.log('✅ [InventoryIntegration] Raccourcis configurés (I, B, M)');
}

// === 🌐 ÉVÉNEMENTS GLOBAUX ===

function setupInventoryGlobalEvents(inventoryInstance) {
  console.log('🌐 [InventoryIntegration] Configuration événements globaux...');
  
  // Événement: Objet ramassé
  window.addEventListener('itemPickup', (event) => {
    if (inventoryInstance.system) {
      inventoryInstance.system.onItemPickup(event.detail.itemId, event.detail.quantity);
    }
  });
  
  // Événement: Combat commencé
  window.addEventListener('battleStarted', () => {
    if (inventoryInstance.ui && inventoryInstance.ui.isVisible) {
      inventoryInstance.ui.hide();
    }
  });
  
  // Événement: Entrée dans un Centre Pokémon
  window.addEventListener('pokemonCenterEntered', () => {
    if (inventoryInstance.system) {
      inventoryInstance.requestInventoryData(); // Refresh data
    }
  });
  
  // Événement: Inventaire plein
  window.addEventListener('inventoryFull', (event) => {
    if (inventoryInstance.system) {
      inventoryInstance.system.onInventoryFull(event.detail.pocketName);
    }
  });
  
  console.log('✅ [InventoryIntegration] Événements globaux configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Inventory dans un projet
 */
export async function setupInventorySystem(uiManager) {
  try {
    // Initialiser le module
    const inventoryInstance = await initializeInventoryModule(uiManager);
    
    // Exposer globalement pour compatibilité
    window.inventorySystem = inventoryInstance.system;
    window.inventorySystemGlobal = inventoryInstance;
    window.toggleInventory = () => inventoryInstance.toggle();
    window.openInventory = () => inventoryInstance.openInventory();
    window.closeInventory = () => inventoryInstance.closeInventory();
    
    console.log('✅ [InventorySetup] Système Inventory configuré et exposé globalement');
    return inventoryInstance;
    
  } catch (error) {
    console.error('❌ [InventorySetup] Erreur configuration:', error);
    throw error;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default InventoryModule;

console.log(`
🎒 === MODULE INVENTORY UNIFIÉ AVEC UIMANAGER ===

✅ ARCHITECTURE:
• InventoryModule → Orchestrateur UIManager
• InventorySystem → Business logic existante
• InventoryIcon → Icône UI existante
• InventoryUI → Interface existante

🎛️ API UIMANAGER:
• show() → Affiche l'icône
• hide() → Cache l'icône + interface
• setEnabled(bool) → Active/désactive
• getUIManagerState() → État complet

📍 POSITIONNEMENT AUTOMATIQUE:
• registerWithUIManager() → Auto-enregistrement
• Position bottom-right calculée automatiquement
• Ordre 0 = position la plus à droite
• Espacement 10px avec autres icônes

📦 API PUBLIQUE:
• toggle() → Ouvre/ferme l'interface
• openToPocket(name) → Ouvre poche spécifique
• hasItem(id) → Vérifie possession
• useItem(id) → Utilise un objet

⌨️ RACCOURCIS:
• I → Toggle inventaire
• B → Ouvre Poké Balls
• M → Ouvre soins

🔗 INTÉGRATION:
• Compatible avec TeamModule
• Position order: 0 (plus à droite)
• Responsive automatique
• Événements globaux

🎯 PRÊT POUR UIMANAGER AVEC POSITIONNEMENT !
`);
