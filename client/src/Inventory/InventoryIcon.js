// client/src/components/InventoryIcon.js - Version compatible UIManager (v2.0)
// ✅ NOUVEAU: Compatible avec UIManager professionnel + fonctionnalité existante conservée

export class InventoryIcon {
  constructor(inventoryUI) {
    this.inventoryUI = inventoryUI;
    this.iconElement = null;
    
    // ✅ NOUVEAU: État UIManager
    this.uiManagerState = {
      visible: true,
      enabled: true,
      initialized: false
    };
    
    this.init();
  }

  init() {
    this.createIcon();
    this.setupEventListeners();
    
    // ✅ NOUVEAU: Marquer comme initialisé pour UIManager
    this.uiManagerState.initialized = true;
    
    console.log('🎒 Inventory icon created (UIManager compatible)');
  }

  createIcon() {
    // Create the icon
    const icon = document.createElement('div');
    icon.id = 'inventory-icon';
    icon.className = 'ui-icon inventory-icon';
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">🎒</span>
        </div>
        <div class="icon-label">Bag</div>
      </div>
      <div class="icon-notification" id="inventory-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
    `;

    // Add to UI
    document.body.appendChild(icon);
    this.iconElement = icon;

    this.addStyles();
  }

  addStyles() {
    if (document.querySelector('#inventory-icon-styles')) return;

    const style = document.createElement('style');
    style.id = 'inventory-icon-styles';
    style.textContent = `
      .inventory-icon {
        position: fixed;
        bottom: 20px;
        right: 20px; /* Position principale pour l'inventaire */
        width: 70px;
        height: 80px;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
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

      /* Open animation */
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

      /* ✅ NOUVEAU: États UIManager */
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

      .inventory-icon.ui-disabled:hover {
        transform: none !important;
      }

      /* ✅ NOUVEAU: Animations UIManager */
      .inventory-icon.ui-fade-in {
        animation: uiFadeIn 0.3s ease-out forwards;
      }

      .inventory-icon.ui-fade-out {
        animation: uiFadeOut 0.2s ease-in forwards;
      }

      .inventory-icon.ui-pulse {
        animation: uiPulse 0.15s ease-out;
      }

      @keyframes uiFadeIn {
        from { opacity: 0; transform: translateY(20px) scale(0.8); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes uiFadeOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(20px) scale(0.8); }
      }

      @keyframes uiPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      /* ✅ NOUVEAU: Responsive design optimisé pour UIManager */
      @media (max-width: 768px) {
        .inventory-icon {
          bottom: 15px;
          right: 15px;
          width: 60px;
          height: 70px;
        }

        .inventory-icon .icon-background {
          height: 60px;
        }

        .inventory-icon .icon-emoji {
          font-size: 24px;
        }

        .inventory-icon .icon-label {
          font-size: 10px;
        }
      }

      @media (max-width: 1024px) and (min-width: 769px) {
        .inventory-icon {
          width: 65px;
          height: 75px;
        }

        .inventory-icon .icon-background {
          height: 65px;
        }

        .inventory-icon .icon-emoji {
          font-size: 26px;
        }
      }

      /* Responsive position avec ajustement pour l'icône de quête */
      .inventory-icon.with-quest-icon {
        right: 20px; /* Garde la position principale */
      }

      /* Special states - compatibilité existante conservée */
      .inventory-icon.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .inventory-icon.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }

      /* Appear animation */
      .inventory-icon.appearing {
        animation: iconAppear 0.5s ease;
      }

      @keyframes iconAppear {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.5);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Style pour l'indicateur de groupe d'icônes */
      .ui-icons-group {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
        align-items: flex-end;
        z-index: 500;
      }

      /* Ajustements quand dans un groupe */
      .ui-icons-group .inventory-icon,
      .ui-icons-group .quest-icon {
        position: relative;
        bottom: auto;
        right: auto;
        margin: 0;
      }

      /* Animation de groupe lors de l'ajout/suppression d'icônes */
      .ui-icons-group.adding-icon {
        animation: groupExpand 0.3s ease;
      }

      .ui-icons-group.removing-icon {
        animation: groupContract 0.3s ease;
      }

      @keyframes groupExpand {
        0% { transform: scale(0.95); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }

      @keyframes groupContract {
        0% { transform: scale(1); }
        50% { transform: scale(0.98); }
        100% { transform: scale(1); }
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    this.iconElement.addEventListener('click', () => {
      this.handleClick();
    });

    // Open animation
    this.iconElement.addEventListener('click', () => {
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 600);
    });

    // Keyboard shortcut (I for Inventory)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i' && this.canOpenInventory()) {
        e.preventDefault();
        this.handleClick();
      }
    });
  }

  handleClick() {
    if (!this.canOpenInventory()) {
      this.showCannotOpenMessage();
      return;
    }

    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  }

  canOpenInventory() {
    // Check if player can open inventory
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !questDialogOpen && !chatOpen && !starterHudOpen && !dialogueOpen;
  }

  showCannotOpenMessage() {
    // Create a temporary message
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      bottom: 110px;
      right: 20px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      animation: fadeInOut 2s ease;
      pointer-events: none;
    `;
    message.textContent = 'Cannot open the bag right now';

    document.body.appendChild(message);

    // Add animation
    if (!document.querySelector('#icon-animations')) {
      const style = document.createElement('style');
      style.id = 'icon-animations';
      style.textContent = `
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateY(10px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 2000);
  }

  // ===== ✅ NOUVELLES MÉTHODES REQUISES POUR UIMANAGER =====

  /**
   * ✅ MÉTHODE REQUISE: Afficher le module
   * Compatible avec UIManager et système existant
   */
  show() {
    console.trace('🎒 [UIManager] Inventory icon shown');
    try {
      // Mise à jour état UIManager
      this.uiManagerState.visible = true;
      
      // Supprimer classes de masquage
      this.iconElement.classList.remove('ui-hidden', 'hidden');
      
      // Ajouter animation d'apparition
      this.iconElement.classList.add('ui-fade-in');
      setTimeout(() => {
        this.iconElement.classList.remove('ui-fade-in');
      }, 300);
      
      // Conserver compatibilité avec ancien système
      this.iconElement.classList.add('appearing');
      setTimeout(() => {
        this.iconElement.classList.remove('appearing');
      }, 500);
      
      // Vérifier et ajuster le positionnement
      setTimeout(() => {
        this.checkAndAdjustPosition();
      }, 100);
      
      console.log('🎒 [UIManager] Inventory icon shown');
      
    } catch (error) {
      console.error('❌ [UIManager] Error showing inventory icon:', error);
    }
  }

  /**
   * ✅ MÉTHODE REQUISE: Cacher le module
   * Compatible avec UIManager et système existant
   */
  hide() {
    try {
      // Mise à jour état UIManager
      this.uiManagerState.visible = false;
      
      // Ajouter animation de disparition
      this.iconElement.classList.add('ui-fade-out');
      
      setTimeout(() => {
        // Appliquer le masquage après animation
        this.iconElement.classList.add('ui-hidden');
        this.iconElement.classList.remove('ui-fade-out');
        
        // Conserver compatibilité avec ancien système
        this.iconElement.classList.add('hidden');
        
        // Réajuster le groupe après disparition
        setTimeout(() => {
          this.checkAndAdjustPosition();
        }, 300);
        
      }, 200);
      
      console.log('🎒 [UIManager] Inventory icon hidden');
      
    } catch (error) {
      console.error('❌ [UIManager] Error hiding inventory icon:', error);
    }
  }

  /**
   * ✅ MÉTHODE REQUISE: Activer/désactiver le module
   * Compatible avec UIManager et système existant
   */
  setEnabled(enabled) {
    console.trace(`🎒 [UIManager] Inventory icon ${enabled ? 'enabled' : 'disabled'}`);
    try {
      // Mise à jour état UIManager
      this.uiManagerState.enabled = enabled;
      
      if (enabled) {
        // Activer le module
        this.iconElement.classList.remove('ui-disabled', 'disabled');
        
        // Animation d'activation
        this.iconElement.classList.add('ui-pulse');
        setTimeout(() => {
          this.iconElement.classList.remove('ui-pulse');
        }, 150);
        
      } else {
        // Désactiver le module
        this.iconElement.classList.add('ui-disabled');
        
        // Conserver compatibilité avec ancien système
        this.iconElement.classList.add('disabled');
      }
      
      console.log(`🎒 [UIManager] Inventory icon ${enabled ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('❌ [UIManager] Error setting inventory icon enabled state:', error);
    }
  }

  /**
   * ✅ MÉTHODE OPTIONNELLE: Nettoyage du module
   * Compatible avec UIManager et système existant
   */
  destroy() {
    try {
      // Arrêter l'observer
      this.stopPositionObserver();
      
      // Nettoyer le groupe si nécessaire
      const iconsGroup = document.querySelector('.ui-icons-group');
      if (iconsGroup && this.iconElement.parentNode === iconsGroup) {
        // Remettre les autres icônes dans le body
        Array.from(iconsGroup.children).forEach(child => {
          if (child !== this.iconElement) {
            document.body.appendChild(child);
          }
        });
        iconsGroup.remove();
      }
      
      // Supprimer l'élément
      if (this.iconElement && this.iconElement.parentNode) {
        this.iconElement.remove();
      }
      
      // Nettoyer les références
      this.iconElement = null;
      this.inventoryUI = null;
      
      console.log('🎒 [UIManager] Inventory icon destroyed');
      
    } catch (error) {
      console.error('❌ [UIManager] Error destroying inventory icon:', error);
    }
  }

  /**
   * ✅ MÉTHODE OPTIONNELLE: Mise à jour du module
   * Compatible avec UIManager et système existant
   */
  update(data) {
    try {
      if (!data) return;
      
      // Mise à jour selon le type de données
      if (data.type === 'notification' && data.count !== undefined) {
        this.updateNotificationCount(data.count);
      }
      
      if (data.type === 'item' && data.itemId) {
        this.onInventoryUpdate({ type: 'add', itemId: data.itemId });
      }
      
      if (data.type === 'state') {
        if (data.visible !== undefined) {
          data.visible ? this.show() : this.hide();
        }
        if (data.enabled !== undefined) {
          this.setEnabled(data.enabled);
        }
      }
      
      console.log('🎒 [UIManager] Inventory icon updated:', data);
      
    } catch (error) {
      console.error('❌ [UIManager] Error updating inventory icon:', error);
    }
  }

  /**
   * ✅ PROPRIÉTÉ REQUISE: État pour UIManager
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      canOpen: this.canOpenInventory(),
      hasIconElement: !!this.iconElement,
      isVisible: this.uiManagerState.visible && !this.iconElement?.classList.contains('ui-hidden'),
      isEnabled: this.uiManagerState.enabled && !this.iconElement?.classList.contains('ui-disabled')
    };
  }

  /**
   * ✅ MÉTHODE UTILITAIRE: Compatibilité toggle
   */
  toggle() {
    if (this.inventoryUI && typeof this.inventoryUI.toggle === 'function') {
      this.inventoryUI.toggle();
    } else {
      this.handleClick();
    }
  }

  // ===== MÉTHODES EXISTANTES CONSERVÉES =====

  // Gérer le positionnement en groupe
  setupIconGroup() {
    // Chercher l'icône de quête
    const questIcon = document.querySelector('#quest-icon');
    
    if (questIcon) {
      // Créer un conteneur pour les icônes si il n'existe pas
      let iconsGroup = document.querySelector('.ui-icons-group');
      
      if (!iconsGroup) {
        iconsGroup = document.createElement('div');
        iconsGroup.className = 'ui-icons-group';
        document.body.appendChild(iconsGroup);
      }

      // Déplacer les icônes dans le groupe
      if (this.iconElement.parentNode !== iconsGroup) {
        iconsGroup.appendChild(this.iconElement);
        iconsGroup.classList.add('adding-icon');
        setTimeout(() => iconsGroup.classList.remove('adding-icon'), 300);
      }
      
      if (questIcon.parentNode !== iconsGroup) {
        iconsGroup.appendChild(questIcon);
      }

      console.log('🎒 Icônes groupées ensemble');
    } else {
      // Si pas d'icône de quête, remettre l'inventaire à sa position normale
      this.resetToDefaultPosition();
    }
  }

  // Remettre à la position par défaut
  resetToDefaultPosition() {
    const iconsGroup = document.querySelector('.ui-icons-group');
    
    if (iconsGroup && this.iconElement.parentNode === iconsGroup) {
      // Remettre l'icône dans le body à sa position normale
      document.body.appendChild(this.iconElement);
      
      // Supprimer le groupe s'il est vide
      if (iconsGroup.children.length === 0) {
        iconsGroup.remove();
      }
      
      console.log('🎒 Icône d\'inventaire remise à sa position par défaut');
    }
  }

  // Vérifier et ajuster le positionnement
  checkAndAdjustPosition() {
    // Vérifier périodiquement si l'icône de quête existe
    const questIcon = document.querySelector('#quest-icon');
    
    if (questIcon && !document.querySelector('.ui-icons-group')) {
      this.setupIconGroup();
    } else if (!questIcon && document.querySelector('.ui-icons-group')) {
      this.resetToDefaultPosition();
    }
  }

  // Public methods for icon state - CONSERVÉES

  showNotification(show = true) {
    const notification = this.iconElement.querySelector('#inventory-notification');
    notification.style.display = show ? 'flex' : 'none';
  }

  updateNotificationCount(count) {
    const notification = this.iconElement.querySelector('#inventory-notification');
    const countElement = notification.querySelector('.notification-count');
    
    if (count > 0) {
      countElement.textContent = count > 9 ? '!' : count.toString();
      notification.style.display = 'flex';
    } else {
      notification.style.display = 'none';
    }
  }

  // Visual effect when a new item is added
  showNewItemEffect() {
    this.iconElement.style.animation = 'none';
    setTimeout(() => {
      this.iconElement.style.animation = 'bagOpen 0.6s ease, pulse 1s ease 0.6s';
    }, 10);
    
    setTimeout(() => {
      this.iconElement.style.animation = '';
    }, 1600);
  }

  // Method to change position (if needed)
  setPosition(bottom, right) {
    // Si l'icône est dans un groupe, ajuster le groupe
    const iconsGroup = document.querySelector('.ui-icons-group');
    
    if (iconsGroup && this.iconElement.parentNode === iconsGroup) {
      iconsGroup.style.bottom = `${bottom}px`;
      iconsGroup.style.right = `${right}px`;
    } else {
      this.iconElement.style.bottom = `${bottom}px`;
      this.iconElement.style.right = `${right}px`;
    }
  }

  // Method to temporarily change the icon
  setTemporaryIcon(emoji, duration = 2000) {
    const iconEmoji = this.iconElement.querySelector('.icon-emoji');
    const originalEmoji = iconEmoji.textContent;
    
    iconEmoji.textContent = emoji;
    iconEmoji.style.animation = 'pulse 0.5s ease';
    
    setTimeout(() => {
      iconEmoji.textContent = originalEmoji;
      iconEmoji.style.animation = '';
    }, duration);
  }

  // Integration with inventory system
  onInventoryUpdate(updateData) {
    if (updateData.type === 'add') {
      this.showNewItemEffect();
      
      // Briefly show the icon of the added item
      const itemIcon = this.getItemIcon(updateData.itemId);
      if (itemIcon) {
        this.setTemporaryIcon(itemIcon, 1500);
      }
    }
  }

  getItemIcon(itemId) {
    // Same mapping as in InventoryUI
    const iconMap = {
      'poke_ball': '⚪',
      'great_ball': '🟡',
      'ultra_ball': '🟠',
      'master_ball': '🟣',
      'potion': '💊',
      'super_potion': '💉',
      'hyper_potion': '🧪',
      // ... etc
    };
    
    return iconMap[itemId] || '📦';
  }

  // Observer les changements d'icônes
  startPositionObserver() {
    // Observer pour détecter l'ajout/suppression de l'icône de quête
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.id === 'quest-icon') {
            console.log('🎒 Icône de quête détectée, ajustement du positionnement');
            setTimeout(() => this.setupIconGroup(), 100);
          }
        });
        
        mutation.removedNodes.forEach((node) => {
          if (node.id === 'quest-icon') {
            console.log('🎒 Icône de quête supprimée, repositionnement');
            setTimeout(() => this.resetToDefaultPosition(), 100);
          }
        });
      });
    });

    // Observer les changements dans le body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Stocker l'observer pour pouvoir l'arrêter
    this.positionObserver = observer;
  }

  // Arrêter l'observation
  stopPositionObserver() {
    if (this.positionObserver) {
      this.positionObserver.disconnect();
      this.positionObserver = null;
    }
  }

  // Initialiser avec observateur
  initWithPositionObserver() {
    this.init();
    this.startPositionObserver();
    
    // Vérifier immédiatement le positionnement
    setTimeout(() => {
      this.checkAndAdjustPosition();
    }, 100);
  }
}
