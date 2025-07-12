// client/src/components/QuestIcon.js - Version harmonisée avec les couleurs bleues

export class QuestIcon {
  constructor(questSystem) {
    this.questSystem = questSystem;
    this.iconElement = null;
    this.hasActiveQuests = false;
    
    this.init();
  }

  init() {
    this.createIcon();
    this.setupEventListeners();
    console.log('📖 Quest icon created');
  }

createIcon() {
  // Create the icon but don't add it to DOM
  const icon = document.createElement('div');
  icon.id = 'quest-icon-hidden';  // ✅ Changer l'ID pour éviter conflits
  icon.className = 'ui-icon quest-icon hidden-legacy';
  icon.innerHTML = `<!-- Ancienne icône désactivée -->`;

  // ✅ NE PAS L'AJOUTER AU DOM
  // document.body.appendChild(icon);  // ← Commenter cette ligne
  
  this.iconElement = icon;  // Garder la référence pour compatibilité
  this.addStyles();
  
  console.log('🚫 [QuestIcon] Ancienne icône désactivée (non ajoutée au DOM)');
}

  addStyles() {
    if (document.querySelector('#quest-icon-styles')) return;

    const style = document.createElement('style');
    style.id = 'quest-icon-styles';
    style.textContent = `
      .quest-icon {
        position: fixed;
        bottom: 20px;
        right: 100px; /* Position next to inventory icon */
        width: 70px;
        height: 80px;
        cursor: pointer;
        z-index: 500;
        transition: all 0.3s ease;
        user-select: none;
      }

      .quest-icon:hover {
        transform: scale(1.1);
      }

      /* ✅ COULEURS IDENTIQUES À L'INVENTAIRE - Thème bleu */
      .quest-icon .icon-background {
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

      .quest-icon:hover .icon-background {
        background: linear-gradient(145deg, #3a4f6f, #2e3d52);
        border-color: #5aa0f2;
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }

      .quest-icon .icon-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .quest-icon .icon-emoji {
        font-size: 28px;
        transition: transform 0.3s ease;
      }

      .quest-icon:hover .icon-emoji {
        transform: scale(1.2);
      }

      /* ✅ LABEL IDENTIQUE À L'INVENTAIRE */
      .quest-icon .icon-label {
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

      /* ✅ NOTIFICATION IDENTIQUE AUX AUTRES */
      .quest-icon .icon-notification {
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

      .quest-icon .notification-count {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      /* New quest animation */
      .quest-icon.new-quest .icon-emoji {
        animation: questBounce 0.8s ease;
      }

      @keyframes questBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.3) rotate(-5deg); }
        50% { transform: scale(1.1) rotate(5deg); }
        75% { transform: scale(1.2) rotate(-2deg); }
      }

      /* Quest completed animation */
      .quest-icon.quest-completed .icon-emoji {
        animation: questCompleted 1s ease;
      }

      @keyframes questCompleted {
        0% { transform: scale(1); }
        50% { transform: scale(1.4); color: #4caf50; }
        100% { transform: scale(1); }
      }

      /* Responsive position */
      @media (max-width: 768px) {
        .quest-icon {
          bottom: 15px;
          right: 85px;
          width: 60px;
          height: 70px;
        }

        .quest-icon .icon-background {
          height: 60px;
        }

        .quest-icon .icon-emoji {
          font-size: 24px;
        }

        .quest-icon .icon-label {
          font-size: 10px;
        }
      }

      /* Special states */
      .quest-icon.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .quest-icon.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }

      /* Appear animation */
      .quest-icon.appearing {
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

      /* Periodic glow effect for active quests - COULEURS BLEUES */
      .quest-icon.has-active-quests .icon-background::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, transparent, rgba(74, 144, 226, 0.3), transparent);
        border-radius: 17px;
        opacity: 0;
        animation: questGlow 4s infinite;
      }

      @keyframes questGlow {
        0%, 90% { opacity: 0; }
        45% { opacity: 1; }
      }
    `;

    document.head.appendChild(style);
  }

  setupEventListeners() {
    this.iconElement.addEventListener('click', () => {
      this.handleClick();
    });

    // ✅ FIX: Raccourci clavier Q corrigé pour éviter les conflits
document.addEventListener('keydown', (e) => {
  // ✅ Utilise la touche "L" (et pas Q !)
  if (e.key.toLowerCase() === 'l' && 
      !e.target.matches('input, textarea, [contenteditable]') &&
      this.canOpenQuestJournal()) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📖 Touche L pressée - ouverture journal des quêtes');
    this.handleClick();
  }
});

  }

  handleClick() {
    if (!this.canOpenQuestJournal()) {
      this.showCannotOpenMessage();
      return;
    }

    if (this.questSystem) {
      this.questSystem.toggleQuestJournal();
    }
  }

  canOpenQuestJournal() {
    // Check if player can open quest journal
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !questDialogOpen && !chatOpen && !starterHudOpen && !dialogueOpen && !inventoryOpen;
  }

  showCannotOpenMessage() {
    // Create a temporary message - COULEURS BLEUES
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      bottom: 110px;
      right: 100px;
      background: rgba(74, 144, 226, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 501;
      animation: fadeInOut 2s ease;
      pointer-events: none;
    `;
    message.textContent = 'Cannot open quest journal right now';

    document.body.appendChild(message);

    // Add animation if not exists
    if (!document.querySelector('#quest-icon-animations')) {
      const style = document.createElement('style');
      style.id = 'quest-icon-animations';
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

  // Public methods for icon state

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
    const notification = this.iconElement.querySelector('#quest-notification');
    notification.style.display = show ? 'flex' : 'none';
  }

  updateNotificationCount(count) {
    const notification = this.iconElement.querySelector('#quest-notification');
    const countElement = notification.querySelector('.notification-count');
    
    if (count > 0) {
      countElement.textContent = count > 9 ? '!' : count.toString();
      notification.style.display = 'flex';
    } else {
      notification.style.display = 'none';
    }
  }

  // Quest event animations
  onNewQuest() {
    this.iconElement.classList.add('new-quest');
    setTimeout(() => {
      this.iconElement.classList.remove('new-quest');
    }, 800);
  }

  onQuestCompleted() {
    this.iconElement.classList.add('quest-completed');
    setTimeout(() => {
      this.iconElement.classList.remove('quest-completed');
    }, 1000);
  }

  onQuestProgress() {
    // Small bounce effect for quest progress
    this.iconElement.style.animation = 'none';
    setTimeout(() => {
      this.iconElement.style.animation = 'questBounce 0.4s ease';
    }, 10);
    
    setTimeout(() => {
      this.iconElement.style.animation = '';
    }, 400);
  }

  updateActiveQuestState(hasActiveQuests) {
    this.hasActiveQuests = hasActiveQuests;
    this.iconElement.classList.toggle('has-active-quests', hasActiveQuests);
  }

  // Method to change position if needed
  setPosition(bottom, right) {
    this.iconElement.style.bottom = `${bottom}px`;
    this.iconElement.style.right = `${right}px`;
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

  // Integration with quest system
  onQuestUpdate(updateData) {
    switch (updateData.type) {
      case 'new':
        this.onNewQuest();
        this.updateActiveQuestState(true);
        break;
      case 'completed':
        this.onQuestCompleted();
        break;
      case 'progress':
        this.onQuestProgress();
        break;
    }
  }

  destroy() {
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.remove();
    }
    console.log('📖 Quest icon removed');
  }
}
