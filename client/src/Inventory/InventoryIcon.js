// Inventory/InventoryIcon.js - Version avec traductions temps réel
// 🌐 Support complet des traductions selon le pattern TeamIcon
// 🔄 Mise à jour automatique lors changement de langue

import { t } from '../managers/LocalizationManager.js';

export class InventoryIcon {
  constructor(inventoryUI, optionsManager = null) {
    this.inventoryUI = inventoryUI;
    this.optionsManager = optionsManager;
    
    // === ÉTAT ===
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
    
    // === CONFIGURATION IDENTIQUE ===
    this.positioningMode = 'uimanager';
    this.uiManagerControlled = true;
    
    // === 🌐 LOCALIZATION ===
    this.cleanupLanguageListener = null;
    this.currentTooltip = null;
    
    console.log('🎒 [InventoryIcon] Instance créée avec support traductions');
  }
  
  // === 🚀 INITIALISATION AVEC LOCALIZATION ===
  
  init() {
    try {
      console.log('🚀 [InventoryIcon] Initialisation avec traductions...');
      
      this.createIcon();
      this.addStyles();
      this.setupEventListeners();
      this.setupLanguageSupport();
      
      console.log('✅ [InventoryIcon] Initialisé avec support multilingue');
      return this;
      
    } catch (error) {
      console.error('❌ [InventoryIcon] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🌐 CONFIGURATION SUPPORT LANGUE ===
  
  setupLanguageSupport() {
    // S'abonner aux changements de langue si optionsManager disponible
    if (this.optionsManager && typeof this.optionsManager.addLanguageListener === 'function') {
      console.log('🌐 [InventoryIcon] Configuration listener langue...');
      
      this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
        console.log('🔄 [InventoryIcon] Changement langue détecté');
        this.updateLanguage();
      });
      
      console.log('✅ [InventoryIcon] Listener langue configuré');
    } else {
      console.warn('⚠️ [InventoryIcon] OptionsManager non disponible - pas de mise à jour langue temps réel');
    }
    
    // Mise à jour initiale
    this.updateLanguage();
  }
  
  /**
   * Met à jour tous les textes selon la langue courante
   */
  updateLanguage() {
    if (!this.iconElement) return;
    
    console.log('🔄 [InventoryIcon] Mise à jour langue...');
    
    // Mettre à jour le label
    const labelElement = this.iconElement.querySelector('.icon-label');
    if (labelElement) {
      labelElement.textContent = t('inventory.label');
    }
    
    // Si tooltip visible, le recréer avec nouvelle langue
    if (this.currentTooltip) {
      this.hideTooltip();
      // Le tooltip sera recréé avec la bonne langue lors du prochain survol
    }
    
    console.log('✅ [InventoryIcon] Langue mise à jour');
  }
  
  // === 🎨 CRÉATION INTERFACE AVEC TEXTES TRADUITS ===
  
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
        <div class="icon-label">${t('inventory.label')}</div>
      </div>
      
      <div class="icon-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
    `;
    
    // ✅ AUCUNE POSITION CSS - UIManager contrôle tout
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    console.log('🎨 [InventoryIcon] Icône créée avec texte traduit');
  }
  
  // === 🎨 STYLES INCHANGÉS ===
  
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
  
  // === 🎛️ ÉVÉNEMENTS IDENTIQUES ===
  
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
  
  // === 📊 MISE À JOUR DONNÉES IDENTIQUE ===
  
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
  
  // === 🎛️ CONTRÔLE UI MANAGER IDENTIQUE ===
  
  show() {
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
  
  // === 📍 MÉTHODES UIMANAGER IDENTIQUES ===
  
  onPositioned(position) {
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
      window.showGameNotification(t('inventory.actions.cannot_open'), 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 💬 TOOLTIP AVEC TRADUCTIONS ===
  
  showTooltip() {
    if (this.currentTooltip) return; // Éviter doublons
    
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
    
    // === 🌐 TEXTES TRADUITS DANS TOOLTIP ===
    tooltip.innerHTML = `
      <div><strong>${t('inventory.tooltip_title')}</strong></div>
      <div>${t('inventory.tooltip_items')}</div>
      <div style="opacity: 0.7; margin-top: 4px;">${t('inventory.tooltip_action')}</div>
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
      window.showGameNotification(t('inventory.disabled_message'), 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 🎭 ANIMATIONS AVEC NOTIFICATIONS TRADUITES ===
  
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
  
  // === 🧹 NETTOYAGE AVEC CLEANUP LANGUE ===
  
  destroy() {
    console.log('🧹 [InventoryIcon] Destruction...');
    
    // Nettoyer le listener de langue
    if (this.cleanupLanguageListener && typeof this.cleanupLanguageListener === 'function') {
      console.log('🌐 [InventoryIcon] Nettoyage listener langue...');
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    this.hideTooltip();
    
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.parentNode.removeChild(this.iconElement);
    }
    
    this.iconElement = null;
    this.onClick = null;
    this.inventoryUI = null;
    this.isVisible = false;
    this.isEnabled = false;
    this.optionsManager = null;
    
    console.log('✅ [InventoryIcon] Détruit avec nettoyage langue');
  }
  
  // === 🐛 DEBUG AMÉLIORÉ ===
  
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
      canOpenUI: this.canOpenUI(),
      
      // === 🌐 DEBUG LOCALIZATION ===
      localization: {
        hasOptionsManager: !!this.optionsManager,
        hasLanguageListener: !!this.cleanupLanguageListener,
        currentLabel: this.iconElement?.querySelector('.icon-label')?.textContent,
        sampleTranslations: {
          inventoryLabel: t('inventory.label'),
          tooltipTitle: t('inventory.tooltip_title'),
          tooltipAction: t('inventory.tooltip_action'),
          disabledMessage: t('inventory.disabled_message')
        }
      }
    };
  }
}

export default InventoryIcon;
