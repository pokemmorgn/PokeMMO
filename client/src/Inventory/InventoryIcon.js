// Inventory/InventoryIcon.js - Icône Inventory Compatible UIManager
// 🎯 Crée juste l'élément DOM, UIManager calcule la position
// 📦 Basé sur TeamIcon.js pour cohérence

import { INVENTORY_ICON_STYLES } from './InventoryIconCSS.js';

export class InventoryIcon {
  constructor(inventoryUI) {
    this.inventoryUI = inventoryUI;
    
    // === ÉTAT ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    // === CALLBACKS ===
    this.onClick = null; // Appelé au clic (défini par InventoryModule)
    
    // === DONNÉES AFFICHÉES ===
    this.displayData = {
      hasNotification: false,
      notificationCount: 0,
      canOpen: true
    };
    
    // === IMPORTANT: POSITIONNEMENT GÉRÉ PAR UIMANAGER ===
    this.positioningMode = 'uimanager'; // Signale que UIManager gère la position
    
    console.log('🎒 [InventoryIcon] Instance créée (positionnement géré par UIManager)');
  }
  
  // === 🚀 INITIALISATION ===
  
init() {
  try {
    console.log('🚀 [InventoryIcon] Initialisation sans positionnement manuel...');
    
    this.createIcon();
    this.addStyles();
    this.setupEventListeners();
    
    // 🆕 AFFICHER L'ICÔNE PAR DÉFAUT
    this.show();
    
    console.log('✅ [InventoryIcon] Initialisé ET affiché (position sera gérée par UIManager)');
    return this;
    
  } catch (error) {
    console.error('❌ [InventoryIcon] Erreur initialisation:', error);
    throw error;
  }
}
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
    // Supprimer l'ancien s'il existe
    const existing = document.querySelector('#inventory-icon');
    if (existing) {
      existing.remove();
    }
    
    const icon = document.createElement('div');
    icon.id = 'inventory-icon';
    icon.className = 'inventory-icon ui-icon';
    
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">🎒</span>
        </div>
        <div class="icon-label">Bag</div>
      </div>
      
      <div class="icon-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
    `;
    
    // === IMPORTANT: PAS DE POSITIONNEMENT INITIAL ===
    // On ne définit PAS position, right, bottom, etc.
    // UIManager s'en chargera
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [InventoryIcon] Icône créée SANS positionnement (UIManager prendra le relais)');
  }
  
  addStyles() {
    if (document.querySelector('#inventory-icon-styles')) {
      return; // Styles déjà chargés
    }
    
    const style = document.createElement('style');
    style.id = 'inventory-icon-styles';
    style.textContent = INVENTORY_ICON_STYLES;
    
    document.head.appendChild(style);
    console.log('🎨 [InventoryIcon] Styles modulaires appliqués');
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    // Clic principal
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isEnabled) {
        this.showDisabledMessage();
        return;
      }
      
      // Animation de clic
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 600);
      
      // Appeler le callback
      if (this.onClick) {
        this.onClick();
      } else if (this.inventoryUI) {
        // Fallback vers inventoryUI directement
        this.inventoryUI.toggle();
      }
      
      console.log('🎒 [InventoryIcon] Clic détecté');
    });
    
    // Survol pour feedback
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.showTooltip();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
    console.log('🎛️ [InventoryIcon] Événements configurés');
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateNotification(show = true, count = 0) {
    if (!this.iconElement) return;
    
    console.log(`📊 [InventoryIcon] Mise à jour notification: ${show}, count: ${count}`);
    
    this.displayData.hasNotification = show;
    this.displayData.notificationCount = count;
    
    const notification = this.iconElement.querySelector('.icon-notification');
    const countElement = this.iconElement.querySelector('.notification-count');
    
    if (show && count > 0) {
      notification.style.display = 'flex';
      countElement.textContent = count > 9 ? '!' : count.toString();
    } else if (show) {
      notification.style.display = 'flex';
      countElement.textContent = '!';
    } else {
      notification.style.display = 'none';
    }
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [InventoryIcon] Affichage (position gérée par UIManager)');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('ui-hidden', 'hidden');
      this.iconElement.classList.add('ui-fade-in');
      
      setTimeout(() => {
        this.iconElement.classList.remove('ui-fade-in');
      }, 300);
    }
    
    return true;
  }
  
  hide() {
    console.log('👻 [InventoryIcon] Masquage');
    
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('ui-fade-out');
      
      setTimeout(() => {
        this.iconElement.classList.add('ui-hidden');
        this.iconElement.classList.remove('ui-fade-out');
      }, 200);
    }
    
    return true;
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [InventoryIcon] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    this.displayData.canOpen = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('ui-disabled', 'disabled');
        this.iconElement.classList.add('ui-pulse');
        setTimeout(() => {
          this.iconElement.classList.remove('ui-pulse');
        }, 150);
      } else {
        this.iconElement.classList.add('ui-disabled');
      }
    }
    
    return true;
  }
  
  // === 💬 FEEDBACK UTILISATEUR ===
  
  showTooltip() {
    if (!this.iconElement) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'inventory-tooltip';
    
    // === POSITION TOOLTIP RELATIVE À L'ICÔNE ===
    const iconRect = this.iconElement.getBoundingClientRect();
    
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - iconRect.top + 10}px;
      right: ${window.innerWidth - iconRect.right}px;
      background: rgba(42, 63, 95, 0.95);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      border: 1px solid #4a90e2;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      white-space: nowrap;
    `;
    
    tooltip.innerHTML = `
      <div><strong>Inventory</strong></div>
      <div>Items and tools</div>
      <div style="opacity: 0.7; margin-top: 4px;">Press I or click</div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
    
    // Stocker pour pouvoir la supprimer au mouseleave
    this.currentTooltip = tooltip;
  }
  
  hideTooltip() {
    if (this.currentTooltip && this.currentTooltip.parentNode) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }
  
  showDisabledMessage() {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Inventory disabled', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎭 ANIMATIONS SPÉCIALES ===
  
  animateNewItem() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('opening');
    setTimeout(() => {
      this.iconElement.classList.remove('opening');
    }, 600);
    
    this.updateNotification(true, '+');
    setTimeout(() => {
      this.updateNotification(false);
    }, 2000);
  }
  
  animateItemUsed() {
    if (!this.iconElement) return;
    
    this.iconElement.classList.add('ui-pulse');
    setTimeout(() => {
      this.iconElement.classList.remove('ui-pulse');
    }, 150);
  }
  
  animateInventoryFull() {
    if (!this.iconElement) return;
    
    // Clignotement rouge pour indiquer l'inventaire plein
    this.iconElement.style.filter = 'hue-rotate(120deg)';
    setTimeout(() => {
      this.iconElement.style.filter = '';
    }, 1000);
    
    this.updateNotification(true, '⚠️');
    setTimeout(() => {
      this.updateNotification(false);
    }, 3000);
  }
  
  // === 🎮 MÉTHODES PUBLIQUES POUR INTÉGRATION ===
  
  // Gérer les notifications d'objets
  showNotification(show = true, text = '!') {
    this.updateNotification(show, text);
  }
  
  // Effet visuel quand un nouvel objet est ajouté
  showNewItemEffect() {
    this.animateNewItem();
  }
  
  // Méthode pour changer temporairement l'icône
  setTemporaryIcon(emoji, duration = 2000) {
    if (!this.iconElement) return;
    
    const iconEmoji = this.iconElement.querySelector('.icon-emoji');
    const originalEmoji = iconEmoji.textContent;
    
    iconEmoji.textContent = emoji;
    iconEmoji.style.animation = 'pulse 0.5s ease';
    
    setTimeout(() => {
      iconEmoji.textContent = originalEmoji;
      iconEmoji.style.animation = '';
    }, duration);
  }
  
  // Intégration avec le système d'inventaire
  onInventoryUpdate(updateData) {
    if (updateData.type === 'add') {
      this.showNewItemEffect();
      
      // Brièvement montrer l'icône de l'objet ajouté
      const itemIcon = this.getItemIcon(updateData.itemId);
      if (itemIcon) {
        this.setTemporaryIcon(itemIcon, 1500);
      }
    } else if (updateData.type === 'remove') {
      this.animateItemUsed();
    }
  }
  
  getItemIcon(itemId) {
    // Mapping simple des icônes d'objets
    const iconMap = {
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'potion': '💊',
      'super_potion': '💉',
      'hyper_potion': '🧪'
    };
    
    return iconMap[itemId] || '📦';
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [InventoryIcon] Destruction...');
    
    // Supprimer tooltip si présent
    this.hideTooltip();
    
    // Supprimer l'élément DOM
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    // Reset état
    this.iconElement = null;
    this.onClick = null;
    this.inventoryUI = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [InventoryIcon] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.iconElement,
      elementInDOM: this.iconElement ? document.contains(this.iconElement) : false,
      displayData: this.displayData,
      hasOnClick: !!this.onClick,
      hasInventoryUI: !!this.inventoryUI,
      positioningMode: this.positioningMode, // 'uimanager'
      elementPosition: this.iconElement ? {
        position: this.iconElement.style.position,
        left: this.iconElement.style.left,
        top: this.iconElement.style.top,
        right: this.iconElement.style.right,
        bottom: this.iconElement.style.bottom,
        transform: this.iconElement.style.transform
      } : null
    };
  }
}

export default InventoryIcon;

console.log(`
🎒 === INVENTORY ICON SANS POSITIONNEMENT MANUEL ===

❌ SUPPRIMÉ (comme TeamIcon):
- positionIcon() méthode
- Positionnement fixe en CSS
- right/bottom en style
- Calculs de position

✅ RESPONSABILITÉS ACTUELLES:
- Crée l'élément DOM seulement
- Gère le contenu et styles modulaires
- Animations et interactions
- Événements clic/hover

📍 POSITIONNEMENT:
- UIManager.registerIconPosition() gère la position
- LayoutManager calcule automatiquement
- InventoryIcon n'a plus à se soucier de sa position
- Responsive géré par UIManager

🎨 STYLES:
- Importés depuis InventoryIconCSS.js
- Pas de position: fixed
- Pas de right/bottom
- UIManager appliquera position/left/top

🔗 INTÉGRATION:
- positioningMode: 'uimanager'
- iconElement exposé pour UIManager
- Compatible avec système de positionnement
- API identique à TeamIcon

🎯 PARFAIT POUR UIMANAGER !
`);
