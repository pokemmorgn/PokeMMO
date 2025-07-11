// Inventory/index.js - VERSION PURE UIMANAGER
// 🎯 UIManager contrôle TOUT - le module ne crée rien automatiquement

import { InventorySystem } from './InventorySystem.js';
import { InventoryIcon } from './InventoryIcon.js';
import { InventoryUI } from './InventoryUI.js';

/**
 * Module Inventory PURE UIManager
 * - Ne crée PAS d'icône automatiquement
 * - UIManager appelle createIcon() quand il veut
 * - UIManager gère position, show/hide, enable/disable
 */
export class InventoryModule {
  constructor(gameRoom, scene) {
    this.gameRoom = gameRoom;
    this.scene = scene;
    
    // === COMPOSANTS (créés à la demande) ===
    this.system = null;
    this.icon = null;
    this.ui = null;
    this.iconElement = null; // Référence directe pour UIManager
    
    // === ÉTAT UIMANAGER ===
    this.uiManagerState = {
      visible: true,
      enabled: true,
      initialized: false,
      iconCreated: false
    };
    
    console.log('🎒 [InventoryModule] Instance créée (mode PURE UIManager)');
  }
  
  // === 🚀 INITIALISATION MINIMALE ===
  
  async init() {
    try {
      console.log('🚀 [InventoryModule] Initialisation sans création d\'icône...');
      
      // 1. Créer SEULEMENT l'UI (pas d'icône)
      this.ui = new InventoryUI(this.gameRoom);
      
      // 2. Créer le système principal
      this.system = new InventorySystem(this.scene, this.gameRoom);
      
      // 3. Exposer globalement
      this.exposeGlobally();
      
      this.uiManagerState.initialized = true;
      
      console.log('✅ [InventoryModule] Initialisé SANS icône (UIManager la créera)');
      return this;
      
    } catch (error) {
      console.error('❌ [InventoryModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION ICÔNE (APPELÉE PAR UIMANAGER) ===
  
  async createIcon() {
    if (this.uiManagerState.iconCreated) {
      console.log('ℹ️ [InventoryModule] Icône déjà créée');
      return this.iconElement;
    }
    
    console.log('🎨 [InventoryModule] Création icône à la demande UIManager...');
    
    try {
      // Créer l'icône d'inventaire  
      this.icon = new InventoryIcon(this.ui);
      await this.icon.init();
      
      // ✅ IMPORTANT: L'icône ne doit PAS se positionner elle-même
      if (this.icon.iconElement) {
        this.iconElement = this.icon.iconElement;
        
        // Supprimer TOUT positionnement automatique
        this.iconElement.style.position = '';
        this.iconElement.style.right = '';
        this.iconElement.style.bottom = '';
        this.iconElement.style.left = '';
        this.iconElement.style.top = '';
        this.iconElement.style.zIndex = '';
        
        this.uiManagerState.iconCreated = true;
        
        console.log('✅ [InventoryModule] Icône créée SANS positionnement');
        return this.iconElement;
      } else {
        throw new Error('IconElement non créé par InventoryIcon');
      }
      
    } catch (error) {
      console.error('❌ [InventoryModule] Erreur création icône:', error);
      throw error;
    }
  }
  
  // === 🎛️ MÉTHODES UIMANAGER (INTERFACE OBLIGATOIRE) ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   */
  show() {
    console.log('👁️ [InventoryModule] Show appelé par UIManager');
    
    this.uiManagerState.visible = true;
    
    // L'icône sera affichée par UIManager, pas par nous
    // On ne fait rien ici - UIManager gère
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
    console.log('👻 [InventoryModule] Hide appelé par UIManager');
    
    this.uiManagerState.visible = false;
    
    // Cacher l'interface si ouverte
    if (this.ui && this.ui.isVisible) {
      this.ui.hide();
    }
    
    // L'icône sera cachée par UIManager, pas par nous
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour activer/désactiver
   */
  setEnabled(enabled) {
    console.log(`🔧 [InventoryModule] setEnabled(${enabled}) appelé par UIManager`);
    
    this.uiManagerState.enabled = enabled;
    
    // Appliquer seulement aux composants internes
    if (this.ui && this.ui.setEnabled) {
      this.ui.setEnabled(enabled);
    }
    
    // L'icône sera activée/désactivée par UIManager via CSS
    
    return true;
  }
  
  /**
   * UIManager peut appeler cette méthode pour obtenir l'état
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      interfaceVisible: this.ui ? this.ui.isVisible : false,
      hasItems: this.ui ? Object.keys(this.ui.inventoryData).length > 0 : false,
      canOpen: this.canOpenInventory(),
      iconExists: !!this.iconElement
    };
  }
  
  /**
   * UIManager appelle pour obtenir l'élément icône
   */
  getIconElement() {
    return this.iconElement;
  }
  
  // === 🔧 MÉTHODES INTERNES ===
  
  exposeGlobally() {
    // Exposer pour compatibilité
    window.inventorySystem = this.system;
    window.inventorySystemGlobal = this;
    
    console.log('🌐 [InventoryModule] Exposé globalement');
  }
  
  canOpenInventory() {
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
  
  toggle() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  openInventory() {
    if (this.ui && this.canOpenInventory()) {
      this.ui.show();
    }
  }
  
  closeInventory() {
    if (this.ui) {
      this.ui.hide();
    }
  }
  
  openToPocket(pocketName) {
    if (this.ui) {
      this.ui.openToPocket(pocketName);
    }
  }
  
  isInventoryOpen() {
    return this.ui ? this.ui.isVisible : false;
  }
  
  useItem(itemId, context = "field") {
    if (this.system) {
      this.system.useItem(itemId, context);
    }
  }
  
  hasItem(itemId) {
    return this.system ? this.system.hasItem(itemId) : false;
  }
  
  getItemCount(itemId) {
    return this.system ? this.system.getItemCount(itemId) : 0;
  }
  
  requestInventoryData() {
    if (this.system) {
      this.system.requestInventoryData();
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    try {
      console.log('🧹 [InventoryModule] Destruction...');
      
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
      
      // UIManager supprimera l'iconElement lui-même
      this.iconElement = null;
      
      this.uiManagerState.initialized = false;
      this.uiManagerState.iconCreated = false;
      
      console.log('✅ [InventoryModule] Détruit');
      
    } catch (error) {
      console.error('❌ [InventoryModule] Erreur destruction:', error);
    }
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.uiManagerState.initialized,
      iconCreated: this.uiManagerState.iconCreated,
      visible: this.uiManagerState.visible,
      enabled: this.uiManagerState.enabled,
      hasSystem: !!this.system,
      hasIcon: !!this.icon,
      hasUI: !!this.ui,
      iconElement: !!this.iconElement,
      iconInDOM: this.iconElement ? document.contains(this.iconElement) : false,
      uiVisible: this.ui ? this.ui.isVisible : false,
      canOpen: this.canOpenInventory(),
      mode: 'pure-uimanager',
      controlledBy: 'UIManager'
    };
  }
}

// === 🏭 FACTORY PURE UIMANAGER ===

/**
 * Factory function pour créer le module Inventory
 * Compatible PURE UIManager
 */
export async function createInventoryModule(gameRoom, scene) {
  try {
    console.log('🏭 [InventoryFactory] Création module PURE UIManager...');
    
    const inventoryModule = new InventoryModule(gameRoom, scene);
    await inventoryModule.init(); // Init sans icône
    
    console.log('✅ [InventoryFactory] Module créé (UIManager créera l\'icône)');
    return inventoryModule;
    
  } catch (error) {
    console.error('❌ [InventoryFactory] Erreur création module Inventory:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION PURE UIMANAGER ===

export const INVENTORY_MODULE_CONFIG = {
  id: 'inventory',
  factory: () => createInventoryModule(window.currentGameRoom, window.game?.scene?.getScenes(true)[0]),
  
  defaultState: {
    visible: true,
    enabled: true,
    initialized: false
  },
  
  priority: 100,
  critical: true,
  
  // ✅ LAYOUT pour UIManager
  layout: {
    type: 'icon',
    anchor: 'bottom-right',
    order: 0,           // Premier = plus à droite
    spacing: 10,
    size: { width: 70, height: 80 }
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
  
  groups: ['ui-icons'],
  
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

export default InventoryModule;

console.log(`
🎒 === INVENTORY MODULE PURE UIMANAGER ===

✅ PRINCIPES RESPECTÉS:
• Module ne crée PAS d'icône automatiquement
• UIManager appelle createIcon() quand il veut
• UIManager gère position, show/hide, enable/disable
• Module répond seulement aux commandes UIManager

🎛️ INTERFACE UIMANAGER:
• show() → Appelé par UIManager pour afficher
• hide() → Appelé par UIManager pour cacher  
• setEnabled() → Appelé par UIManager pour activer/désactiver
• createIcon() → Appelé par UIManager pour créer l'icône
• getIconElement() → Retourne l'élément pour UIManager

📍 POSITIONNEMENT:
• Aucun positionnement manuel
• UIManager a le contrôle total
• Layout config dans INVENTORY_MODULE_CONFIG

🔄 WORKFLOW:
1. UIManager crée le module via factory
2. UIManager appelle createIcon() 
3. UIManager récupère l'iconElement
4. UIManager positionne avec registerIconPosition()
5. UIManager contrôle show/hide/enabled

🎯 100% CONTRÔLÉ PAR UIMANAGER !
`);
