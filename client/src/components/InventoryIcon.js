// client/src/components/InventoryIcon.js

export class InventoryIcon {
  constructor(inventoryUI) {
    this.inventoryUI = inventoryUI;
    this.iconElement = null;
    
    this.init();
  }

  init() {
    this.createIcon();
    this.setupEventListeners();
    console.log('🎒 Icône d\'inventaire créée');
  }

  createIcon() {
    // Créer l'icône
    const icon = document.createElement('div');
    icon.id = 'inventory-icon';
    icon.className = 'ui-icon inventory-icon';
    icon.innerHTML = `
      <div class="icon-background">
        <div class="icon-content">
          <span class="icon-emoji">🎒</span>
        </div>
        <div class="icon-label">Sac</div>
      </div>
      <div class="icon-notification" id="inventory-notification" style="display: none;">
        <span class="notification-count">!</span>
      </div>
    `;

    // Ajouter à l'interface
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
        right: 20px;
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

      /* Animation d'ouverture */
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

      /* Position responsive */
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

      /* États spéciaux */
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

      /* Animation d'apparition */
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

      /* Effet de brillance périodique */
      .inventory-icon .icon-background::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        border-radius: 17px;
        opacity: 0;
        animation: shine 3s infinite;
      }

      @keyframes shine {
        0%, 90% { opacity: 0; transform: translateX(-100%); }
        50% { opacity: 1; transform: translateX(100%); }
        100% { opacity: 0; transform: translateX(100%); }
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    this.iconElement.addEventListener('click', () => {
      this.handleClick();
    });

    // Animation d'ouverture
    this.iconElement.addEventListener('click', () => {
      this.iconElement.classList.add('opening');
      setTimeout(() => {
        this.iconElement.classList.remove('opening');
      }, 600);
    });

    // Raccourci clavier (I pour Inventory)
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
    // Vérifier si le joueur peut ouvrir l'inventaire
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !questDialogOpen && !chatOpen && !starterHudOpen && !dialogueOpen;
  }

  showCannotOpenMessage() {
    // Créer un message temporaire
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
    message.textContent = 'Impossible d\'ouvrir le sac maintenant';

    document.body.appendChild(message);

    // Ajouter l'animation
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

  // Méthodes publiques pour gérer l'état de l'icône

  show() {
    this.iconElement.classList.remove('hidden');
    this.iconElement.classList.add('appearing');
    setTimeout(() => {
      this.iconElement.classList.remove('appearing');
    }, 500);
  }

  hide() {
    this.iconElement.classList.add('hidden');
  }

  setEnabled(enabled) {
    this.iconElement.classList.toggle('disabled', !enabled);
  }

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

  // Effet visuel quand un nouvel objet est ajouté
  showNewItemEffect() {
    this.iconElement.style.animation = 'none';
    setTimeout(() => {
      this.iconElement.style.animation = 'bagOpen 0.6s ease, pulse 1s ease 0.6s';
    }, 10);
    
    setTimeout(() => {
      this.iconElement.style.animation = '';
    }, 1600);
  }

  // Méthode pour changer la position (si nécessaire)
  setPosition(bottom, right) {
    this.iconElement.style.bottom = `${bottom}px`;
    this.iconElement.style.right = `${right}px`;
  }

  // Méthode pour changer l'icône temporairement
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

  // Intégration avec le système d'inventaire
  onInventoryUpdate(updateData) {
    if (updateData.type === 'add') {
      this.showNewItemEffect();
      
      // Afficher brièvement l'icône de l'objet ajouté
      const itemIcon = this.getItemIcon(updateData.itemId);
      if (itemIcon) {
        this.setTemporaryIcon(itemIcon, 1500);
      }
    }
  }

  getItemIcon(itemId) {
    // Même mapping que dans InventoryUI
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

  destroy() {
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.remove();
    }
    console.log('🎒 Icône d\'inventaire supprimée');
  }
}
