// client/src/components/NotificationManager.js

export class NotificationManager {
  constructor() {
    this.notifications = new Map(); // Pour éviter les doublons
    this.notificationQueue = [];
    this.maxNotifications = 5; // Maximum de notifications simultanées
    this.defaultDuration = 4000; // 4 secondes
    this.positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
    };
    this.defaultPosition = 'top-right';
    
    this.init();
  }

  init() {
    this.addStyles();
    console.log('📢 NotificationManager initialisé');
  }

  addStyles() {
    if (document.querySelector('#notification-manager-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-manager-styles';
    style.textContent = `
      .notification-container {
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 400px;
      }

      .notification {
        pointer-events: auto;
        background: linear-gradient(135deg, rgba(100, 149, 237, 0.95), rgba(74, 144, 226, 0.95));
        border-radius: 12px;
        padding: 12px 16px;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        box-shadow: 
          0 4px 20px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        border-left: 4px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
        position: relative;
        overflow: hidden;
      }

      .notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .notification:hover {
        transform: translateX(-4px) scale(1.02);
        box-shadow: 
          0 6px 25px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.2);
      }

      .notification::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }

      .notification:hover::before {
        transform: translateX(100%);
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .notification-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .notification-text {
        flex: 1;
        line-height: 1.4;
      }

      .notification-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.4);
        transition: width linear;
        border-radius: 0 0 12px 0;
      }

      /* Types de notifications */
      .notification.success {
        background: linear-gradient(135deg, rgba(40, 167, 69, 0.95), rgba(34, 139, 34, 0.95));
        border-left-color: #28a745;
      }

      .notification.error {
        background: linear-gradient(135deg, rgba(220, 53, 69, 0.95), rgba(185, 28, 28, 0.95));
        border-left-color: #dc3545;
      }

      .notification.warning {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(255, 152, 0, 0.95));
        border-left-color: #ffc107;
        color: #000;
      }

      .notification.info {
        background: linear-gradient(135deg, rgba(100, 149, 237, 0.95), rgba(74, 144, 226, 0.95));
        border-left-color: #6495ed;
      }

      .notification.quest {
        background: linear-gradient(135deg, rgba(138, 43, 226, 0.95), rgba(75, 0, 130, 0.95));
        border-left-color: #8a2be2;
      }

      .notification.inventory {
        background: linear-gradient(135deg, rgba(255, 140, 0, 0.95), rgba(255, 69, 0, 0.95));
        border-left-color: #ff8c00;
      }

      .notification.achievement {
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(218, 165, 32, 0.95));
        border-left-color: #ffd700;
        color: #000;
      }

      /* Animations */
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }

      @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOutLeft {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0; }
      }

      @keyframes slideInDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes slideOutUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .notification.bounce {
        animation: bounce 0.6s ease;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .notification-container {
          left: 10px !important;
          right: 10px !important;
          max-width: none;
          transform: none !important;
        }

        .notification {
          font-size: 13px;
          padding: 10px 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  createContainer(position) {
    let container = document.querySelector(`#notification-container-${position}`);
    if (!container) {
      container = document.createElement('div');
      container.id = `notification-container-${position}`;
      container.className = 'notification-container';
      
      const positionStyles = this.positions[position];
      Object.assign(container.style, positionStyles);
      
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, options = {}) {
    const config = {
      type: 'info',
      duration: this.defaultDuration,
      position: this.defaultPosition,
      closable: true,
      persistent: false,
      bounce: false,
      sound: false,
      ...options
    };

    // Éviter les doublons récents
    const notificationId = `${config.type}-${message}-${config.position}`;
    const now = Date.now();
    
    if (this.notifications.has(notificationId)) {
      const lastTime = this.notifications.get(notificationId);
      if (now - lastTime < 2000) {
        console.log(`⚠️ Notification dupliquée ignorée: ${message}`);
        return null;
      }
    }
    
    this.notifications.set(notificationId, now);

    const container = this.createContainer(config.position);
    const notification = this.createNotification(message, config);
    
    // Gérer le nombre maximum de notifications
    this.manageNotificationLimit(container);
    
    container.appendChild(notification);
    this.animateIn(notification, config);
    
    // Auto-suppression
    if (!config.persistent && config.duration > 0) {
      this.scheduleRemoval(notification, config.duration);
    }

    // Son optionnel
    if (config.sound) {
      this.playNotificationSound(config.type);
    }

    console.log(`📢 Notification affichée: ${message} (${config.type})`);
    return notification;
  }

  createNotification(message, config) {
    const notification = document.createElement('div');
    notification.className = `notification ${config.type}`;
    
    const icon = this.getIcon(config.type);
    
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${message}</span>
        ${config.closable ? '<button class="notification-close">×</button>' : ''}
      </div>
      ${!config.persistent && config.duration > 0 ? '<div class="notification-progress"></div>' : ''}
    `;

    // Event listeners
    if (config.closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(notification);
      });
    }

    notification.addEventListener('click', () => {
      if (config.onClick) {
        config.onClick(notification);
      } else if (config.closable) {
        this.remove(notification);
      }
    });

    return notification;
  }

  getIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      quest: '📜',
      inventory: '🎒',
      achievement: '🏆',
      battle: '⚔️',
      trade: '🔄',
      system: '⚙️'
    };
    return icons[type] || icons.info;
  }

  animateIn(notification, config) {
    // Animation d'entrée
    setTimeout(() => {
      notification.classList.add('show');
      if (config.bounce) {
        notification.classList.add('bounce');
      }
    }, 10);

    // Barre de progression
    if (!config.persistent && config.duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressBar.style.width = '0%';
          progressBar.style.transitionDuration = `${config.duration}ms`;
        }, 100);
      }
    }
  }

  scheduleRemoval(notification, duration) {
    setTimeout(() => {
      this.remove(notification);
    }, duration);
  }

  remove(notification) {
    if (!notification || !notification.parentNode) return;

    notification.style.animation = 'slideOutRight 0.3s ease';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
        this.cleanupEmptyContainers();
      }
    }, 300);
  }

  manageNotificationLimit(container) {
    const notifications = container.querySelectorAll('.notification');
    if (notifications.length >= this.maxNotifications) {
      // Supprimer les plus anciennes
      const toRemove = Array.from(notifications).slice(0, notifications.length - this.maxNotifications + 1);
      toRemove.forEach(notification => this.remove(notification));
    }
  }

  cleanupEmptyContainers() {
    document.querySelectorAll('.notification-container').forEach(container => {
      if (container.children.length === 0) {
        container.remove();
      }
    });
  }

  playNotificationSound(type) {
    // Sons optionnels (si vous avez des fichiers audio)
    try {
      const audio = new Audio(`/assets/sounds/notification-${type}.mp3`);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignorer si le son ne peut pas être joué
      });
    } catch (error) {
      // Ignorer les erreurs de son
    }
  }

  // === MÉTHODES DE CONVENANCE ===

  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  quest(message, options = {}) {
    return this.show(message, { ...options, type: 'quest', bounce: true });
  }

  inventory(message, options = {}) {
    return this.show(message, { ...options, type: 'inventory' });
  }

  achievement(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'achievement', 
      duration: 6000, 
      bounce: true,
      sound: true 
    });
  }

  // Notification personnalisée pour les objets
  itemNotification(itemName, quantity, action = 'obtained', options = {}) {
    const actionText = {
      obtained: 'obtenu',
      lost: 'perdu',
      used: 'utilisé'
    };

    const prefix = action === 'lost' ? '-' : action === 'obtained' ? '+' : '';
    const message = `${prefix}${quantity} ${itemName} ${actionText[action]}`;
    
    return this.inventory(message, {
      ...options,
      type: action === 'lost' ? 'warning' : 'inventory'
    });
  }

  // Notification pour les quêtes
  questNotification(questName, action = 'started', options = {}) {
    const actionText = {
granted: 'Quest accepted',
started:   'Quest accepted',
completed: 'Quest completed',
failed:    'Quest failed',
updated:   'Quest progress'
    };

    const message = `${actionText[action]}: ${questName}`;
    const type = action === 'failed' ? 'error' : action === 'completed' ? 'success' : 'quest';
    
    return this.show(message, { ...options, type });
  }

  // Nettoyer toutes les notifications
  clear() {
    document.querySelectorAll('.notification').forEach(notification => {
      this.remove(notification);
    });
  }

  // Définir la position par défaut
  setDefaultPosition(position) {
    if (this.positions[position]) {
      this.defaultPosition = position;
    }
  }

  // Définir la durée par défaut
  setDefaultDuration(duration) {
    this.defaultDuration = duration;
  }
}

// Instance globale
window.NotificationManager = window.NotificationManager || new NotificationManager();
