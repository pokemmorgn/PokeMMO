// Inventory/InventoryIcon.js - VERSION NETTOYÉE
// 🎯 RESPONSABILITÉ: Gestion de l'affichage de l'icône SEULEMENT
// 🔗 DÉLÉGATION: Directe vers BaseModule (window.inventorySystemGlobal)

export class InventoryIcon {
  constructor(inventoryUI) {
    this.inventoryUI = inventoryUI;
    
    // === ÉTAT ICÔNE SEULEMENT ===
    this.isVisible = true;
    this.isEnabled = true;
    this.iconElement = null;
    
    // === CALLBACKS ===
    this.onClick = null;
    
    // === DONNÉES AFFICHÉES ===
    this.displayData = {
      hasNotification: false,
      notificationCount: 0
    };
    
    // === UIManager contrôle le positionnement ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    console.log('🎒 [InventoryIcon] Instance créée - UIManager contrôle');
  }
  
  // === 🚀 INITIALISATION ===
  
  init() {
    try {
      console.log('🚀 [InventoryIcon] Initialisation...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      
      console.log('✅ [InventoryIcon] Initialisé - UIManager gérera la position');
      return this;
      
    } catch (error) {
      console.error('❌ [InventoryIcon] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CRÉATION INTERFACE ===
  
  createIcon() {
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
    
    // ✅ AUCUNE POSITION CSS - UIManager contrôle tout
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [InventoryIcon] Icône créée sans positionnement');
  }
  
  // === 🎨 STYLES (IDENTIQUES - déjà corrects) ===
  
  addStyles() {
    if (document.querySelector('#inventory-icon-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'inventory-icon-styles';
    style.textContent = `
      /* ===== INVENTORY ICON - AUCUNE POSITION FIXE ===== */
      .inventory-icon {
        width: 70px;
        height: 80px;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
        display: block;
        box-sizing: border-box;
      }

      .inventory-icon:hover {
        transform: scale(1.1);
      }

      .inventory-icon .icon-background {
        width: 100%;
        height: 70px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 2px solid #4a90e2;
        border-radius: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        position: relative;
        transition: all 0.3s ease;
      }

      .inventory-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }

      .inventory-icon .icon-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .inventory-icon .icon-emoji {
        font-size: 28px;
        transition: transform 0.3s ease;
      }

      .inventory-icon:hover .icon-emoji {
        transform: scale(1.2);
      }

      .inventory-icon .icon-label {
        font-size: 11px;
        color: #87ceeb;
        font-weight: 600;
        text-align: center;
        padding: 4px 0;
        background: rgba(74, 144, 226, 0.2);
        width: 100%;
        border-radius: 0 0 13px 13px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .inventory-icon .icon-notification {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        background: #ff4757;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        animation: pulse 2s infinite;
      }

      .inventory-icon .notification-count {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      /* États UIManager */
      .inventory-icon.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }

      .inventory-icon.ui-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(50%);
      }

      /* Animations */
      .inventory-icon.opening .icon-emoji {
        animation: bagOpen 0.6s ease;
      }

      @keyframes bagOpen {
        0% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.2) rotate(-5deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(1.15) rotate(-2deg); }
        100% { transform: scale(1) rotate(0deg); }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .inventory-icon {
          width: 60px;
          height: 70px;
        }
        
        .inventory-icon .icon-background {
          height: 60px;
        }
        
        .inventory-icon .icon-emoji {
          font-size: 24px;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [InventoryIcon] Styles appliqués');
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [InventoryIcon] Affichage');
    
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('ui-hidden', 'hidden');
      this.iconElement.classList.add('ui-fade-in');
      
      this.iconElement.style.display = 'block';
      this.iconElement.style.visibility = 'visible';
      this.iconElement.style.opacity = '1';
      
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
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('ui-disabled', 'disabled');
      } else {
        this.iconElement.classList.add('ui-disabled');
      }
    }
    
    return true;
  }
  
  // === 📍 MÉTHODES UIMANAGER ===
  
  onPositioned(position) {
    console.log('📍 [InventoryIcon] Position reçue de UIManager:', position);
    
    if (this.iconElement) {
      this.iconElement.setAttribute('data-positioned-by', 'uimanager');
      this.iconElement.setAttribute('data-position', JSON.stringify(position));
    }
  }
  
  isPositionedByUIManager() {
    return this.iconElement?.getAttribute('data-positioned-by') === 'uimanager';
  }
  
  getCurrentPosition() {
    if (!this.iconElement) return null;
    
    const positionData = this.iconElement.getAttribute('data-position');
    if (positionData) {
      try {
        return JSON.parse(positionData);
      } catch (error) {
        console.warn('⚠️ [InventoryIcon] Position data invalide');
      }
    }
    
    const computed = window.getComputedStyle(this.iconElement);
    return {
      left: computed.left,
      top: computed.top,
      source: 'computed'
    };
  }
  
  // === 📊 MISE À JOUR DONNÉES ===
  
  updateNotification(show = true, count = 0) {
    if (!this.iconElement) return;
    
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
  
  // === 🔍 VÉRIFICATION OUVERTURE UI - DÉLÉGATION SIMPLE ===
  
  canOpenUI() {
    // ✅ DÉLÉGATION DIRECTE vers BaseModule
    if (window.inventorySystemGlobal && window.inventorySystemGlobal.canOpenUI) {
      return window.inventorySystemGlobal.canOpenUI();
    }
    
    // ✅ FALLBACK SIMPLE (état local seulement)
    return this.isEnabled;
  }
  
  showCannotOpenMessage() {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Cannot open inventory right now', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isEnabled) {
        this.showDisabledMessage();
        return;
      }
      
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 600);
      
      // ✅ VÉRIFICATION via délégation simple
      if (this.canOpenUI()) {
        if (this.onClick) {
          this.onClick();
        } else if (this.inventoryUI) {
          this.inventoryUI.toggle();
        }
      } else {
        this.showCannotOpenMessage();
      }
      
      console.log('🎒 [InventoryIcon] Clic détecté');
    });
    
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
  
  // === 💬 TOOLTIP ===
  
  showTooltip() {
    if (!this.iconElement) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'inventory-tooltip';
    
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
    
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
    
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
  
  // === 🎭 ANIMATIONS ===
  
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
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [InventoryIcon] Destruction...');
    
    this.hideTooltip();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
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
      positioningMode: this.positioningMode,
      uiManagerControlled: this.uiManagerControlled,
      isPositionedByUIManager: this.isPositionedByUIManager(),
      currentPosition: this.getCurrentPosition(),
      canOpenUI: this.canOpenUI()
    };
  }
}

export default InventoryIcon;

console.log(`
🎒 === INVENTORY ICON NETTOYÉ ===

✅ RESPONSABILITÉ CLAIRE:
• Gestion affichage icône uniquement
• Délégation simple vers BaseModule
• Aucune vérification métier

🔗 DÉLÉGATION SIMPLIFIÉE:
• canOpenUI() → window.inventorySystemGlobal.canOpenUI()
• Fallback → this.isEnabled
• Plus de chaîne complexe

🎯 SUPPRIMÉ:
• Toutes les vérifications DOM
• Fallbacks vers UIManager
• Logique métier dans l'icône
`);
